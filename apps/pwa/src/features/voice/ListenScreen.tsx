import { useCallback, useEffect, useRef, useState } from 'react';
import type { ParsedIntent, VoiceFailure } from '@saathi/shared';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader, type Tile } from '../../app/shell/ScreenHeader.js';
import { QuickBar } from '../../app/shell/QuickBar.js';
import type { StringKey } from '../../i18n/index.js';
import { intentCorpus } from './intentPacks.js';
import { transportLanding } from './micRouting.js';
import { isConfident, parseIntent } from './parseIntent.js';
import {
  isSecureOrigin,
  resolveEngines,
  typedStt,
  worthAnotherEngine,
  type SttEngine,
  type SttFailure,
  type SttSession,
} from './stt.js';
import { recordVoiceEvent } from './voiceEvent.js';
import { Clarifier } from '../ask/Clarifier.js';
import { recordClarifierChoice, submitSentence } from '../ask/askSubmit.js';
import { downloadVoskModel, voskModelState, type ModelState } from './voskStt.js';

/**
 * 1.2 · सुन रहा हूँ — the mic, wherever it was tapped from.
 *
 * The design numbers this screen under रास्ता because that is where it was first drawn, but the
 * mic means the same thing on every screen (CLAUDE.md: "it is one thing everywhere"), so this is
 * one component and the crumb says which tile the traveller came from.
 *
 * Its one rule: never a dead end. Permission refused, no Hindi model on the phone, nothing
 * heard, nothing understood — every outcome ends on a screen with a way forward.
 */

type Phase =
  | { readonly at: 'listening' }
  // The engine is loading and is not yet hearing. Said plainly, because a waveform here would be
  // a lie: the traveller would speak into a mic that is not on.
  | { readonly at: 'preparing' }
  | { readonly at: 'thinking' }
  | { readonly at: 'failed'; readonly failure: SttFailure }
  // The one-time voice download: offered when the phone has no offline model but could fetch one.
  | { readonly at: 'offer-download' }
  | { readonly at: 'downloading'; readonly percent: number }
  // One word that could mean two things, or a sentence that meant nothing: ask, do not guess.
  | { readonly at: 'ask'; readonly intent: ParsedIntent }
  /**
   * What was heard, in a box, before anything acts on it — and the same box a traveller types in
   * from scratch, because they are the same step.
   *
   * `spoken` is what the engine produced, or null when nobody spoke. `other` is the reading offered
   * as a one-tap correction: whichever of the engine's readings is not in the box. `unconstrained`
   * is specifically the model's unbiased reading, which is what the learning loop keeps — it is
   * usually the same string as `other` and is not the same idea, because the box may already hold
   * the unbiased reading and offer the biased one back.
   */
  | {
      readonly at: 'compose';
      readonly spoken: string | null;
      readonly other: string | null;
      readonly unconstrained: string | null;
      readonly engineId: string;
    };

/** What the traveller is agreeing to download. Rounded, because 42.4 helps nobody. */
const VOICE_MB = 42;

const FAILURE_TITLE: Record<SttFailure, StringKey> = {
  'no-permission': 'listen.noPermission',
  'no-speech': 'listen.noSpeech',
  'no-engine': 'listen.noEngine',
  'insecure-context': 'listen.insecure',
  network: 'listen.network',
  failed: 'listen.failed',
};

const FAILURE_WHY: Record<SttFailure, StringKey> = {
  'no-permission': 'listen.noPermissionWhy',
  'no-speech': 'listen.hint',
  'no-engine': 'listen.noEngineWhy',
  'insecure-context': 'listen.insecureWhy',
  network: 'listen.networkWhy',
  failed: 'listen.noEngineWhy',
};

/** What the learning loop should call each outcome, so the failures are countable. */
const SPEECH_FAILURE: Record<SttFailure, VoiceFailure> = {
  'no-permission': 'no-permission',
  'no-speech': 'no-speech',
  'no-engine': 'no-engine',
  'insecure-context': 'insecure-context',
  network: 'no-engine',
  failed: 'stt-error',
};

export function ListenScreen({
  from,
  onHeard,
  onMic,
}: {
  readonly from: Tile;
  readonly onHeard: (intent: ParsedIntent) => void;
  readonly onMic: () => void;
}) {
  const { t, online } = useSettings();
  const [phase, setPhase] = useState<Phase>({ at: 'listening' });
  const [partial, setPartial] = useState('');
  const [typed, setTyped] = useState('');
  const session = useRef<SttSession | null>(null);
  /** Engines still untried this attempt, best first. Walked down as each one fails. */
  const queue = useRef<readonly SttEngine[]>([]);
  /** The engine that produced whatever happened, for the learning loop. */
  const used = useRef<SttEngine>(typedStt);
  /** Aborts an in-flight model download when the traveller gives up on it. */
  const download = useRef<AbortController | null>(null);
  /** Set once a download has failed, so the offer is not shown again in a loop. */
  const [downloadFailed, setDownloadFailed] = useState(false);
  /**
   * Whether the offline voice is on this phone. Asked on arrival rather than only after every
   * engine has failed: online, the cloud recogniser succeeds, so a last-resort offer is an offer
   * nobody is ever shown — which is exactly what happened.
   */
  const [modelState, setModelState] = useState<ModelState | null>(null);

  /**
   * One path for every sentence, spoken or typed: parse, record, then go or ask.
   *
   * Nothing reaches this until the traveller has pressed आगे बढ़िए, which is the whole point of the
   * step before it. The recogniser is wrong often enough — "Mall of the Emirates" came back as
   * "माला एमरेट्स" on a real phone — that acting on a transcript nobody has looked at means sending
   * someone to the wrong end of Dubai with confidence. Confidence cannot catch it either: the
   * skeleton matcher is generous by design, so a mangled place name resolves rather than failing.
   * So the sentence is shown first, and this runs on what the traveller agreed to.
   *
   * `heard` is what the engine produced, recorded only when the traveller changed it. That pair —
   * what was heard, and what it should have been, from the one person who knows — is the strongest
   * thing the learning loop will ever get, and it costs nothing to collect.
   */
  const handle = useCallback(
    (
      submitted: Readonly<{ text: string; heard?: string; unconstrained?: string }>,
      engineId: string,
    ) => {
      const outcome = submitSentence(submitted, engineId);
      if (outcome === null) return;
      if (outcome.at === 'ask') {
        setPhase({ at: 'ask', intent: outcome.intent });
        return;
      }
      onHeard(outcome.intent);
      navigate(outcome.route);
    },
    [onHeard],
  );

  /**
   * Which of an engine's readings to put in the box.
   *
   * The offline engine hands over two readings of the same audio: one from a decoder biased toward
   * the words in `data/intents/`, one from the model's own vocabulary. They are competing readings,
   * never two halves of a sentence, so each is parsed on its own and the one that yields something
   * actionable is the one offered. The other is kept and offered as a one-tap correction, because
   * it is the likeliest correction there is and retyping a sentence on a phone is not.
   */
  const review = useCallback(
    (
      result: Readonly<{ transcript: string; alternatives?: readonly string[] }>,
      engineId: string,
    ) => {
      const readings = [result.transcript, ...(result.alternatives ?? [])]
        .map((text) => text.trim())
        .filter((text) => text !== '');
      const best = readings.find((text) => isConfident(parseIntent(text, intentCorpus)));
      const chosen = best ?? readings[0];
      if (chosen === undefined) return;
      setTyped(chosen);
      setPhase({
        at: 'compose',
        spoken: chosen,
        other: readings.find((text) => text !== chosen) ?? null,
        unconstrained: result.alternatives?.[0]?.trim() ?? null,
        engineId,
      });
    },
    [],
  );

  /**
   * Try the next engine in the queue. The first choice keeps the audio on the phone; if that
   * engine is not really there — a Hindi model that was never downloaded, say — the next one is
   * tried before anyone is told anything. Only when the queue runs out does the screen give up,
   * and then it says which reason it actually was.
   */
  const tryNext = useCallback(() => {
    const [engine, ...rest] = queue.current;
    if (!engine) {
      if (!isSecureOrigin()) {
        setPhase({ at: 'failed', failure: 'insecure-context' });
        return;
      }
      // Before telling anyone their phone cannot hear Hindi, check whether we can simply give it
      // the ability. This is the difference between a dead end and a one-time download.
      void voskModelState(online).then((state) => {
        setPhase(
          state === 'fetchable' && !downloadFailed
            ? { at: 'offer-download' }
            : { at: 'failed', failure: 'no-engine' },
        );
      });
      return;
    }
    queue.current = rest;
    used.current = engine;
    setPartial('');
    setPhase({ at: 'listening' });

    session.current = engine.listen({
      onPreparing: () => {
        setPhase({ at: 'preparing' });
      },
      onPartial: (text) => {
        // The first partial is proof the engine is actually hearing, so the screen stops
        // claiming to be getting ready and starts claiming to be listening.
        setPhase({ at: 'listening' });
        setPartial(text);
      },
      onFinal: (result) => {
        review(result, engine.id);
      },
      onFailure: (failure) => {
        void recordVoiceEvent({
          transcript: '',
          intent: 'unknown',
          confidence: 0,
          landedOn: 'listen',
          failure: SPEECH_FAILURE[failure],
          sttEngine: engine.id,
        });
        // A refused permission is the answer; anything else may just be this engine, so the next
        // one gets a turn before the traveller sees a failure at all.
        if (worthAnotherEngine(failure) && queue.current.length > 0) {
          tryNext();
          return;
        }
        // Nothing heard is not a fault and not a dead end. "Nothing was heard" as a headline gives
        // the traveller a problem; an empty box gives them the sentence they were about to say.
        if (failure === 'no-speech') {
          startTyping();
          return;
        }
        setPhase({ at: 'failed', failure });
      },
    });
  }, [review]);

  const listen = useCallback(() => {
    setPhase({ at: 'listening' });
    void resolveEngines(online).then((engines) => {
      queue.current = engines;
      tryNext();
    });
  }, [online, tryNext]);

  useEffect(() => {
    void voskModelState(online).then(setModelState);
  }, [online]);

  // The mic opens listening, because a traveller who tapped a microphone is already talking.
  useEffect(() => {
    listen();
    return () => {
      session.current?.cancel();
    };
  }, [listen]);

  const getVoice = () => {
    setDownloadFailed(false);
    setPhase({ at: 'downloading', percent: 0 });
    const controller = new AbortController();
    download.current = controller;
    void downloadVoskModel((fraction) => {
      setPhase({ at: 'downloading', percent: Math.round(fraction * 100) });
    }, controller.signal).then((ok) => {
      download.current = null;
      // Abandoning a download is a choice, not a failure: it goes back to the offer rather than
      // to an error screen, so the traveller can start it again when the wifi is better.
      if (controller.signal.aborted) {
        setPhase({ at: 'offer-download' });
        return;
      }
      if (!ok) {
        setDownloadFailed(true);
        setPhase({ at: 'failed', failure: 'failed' });
        return;
      }
      // The model is on the phone now, so the offer has to stop being offered. Without this it
      // sat there inviting a second 42 MB download of something already downloaded.
      setModelState('cached');
      // Straight back to listening: the traveller asked a question a minute ago.
      listen();
    });
  };

  const cancel = () => {
    session.current?.cancel();
    window.history.back();
  };

  /** Start again with an empty box: the traveller chose the keyboard over the microphone. */
  const startTyping = () => {
    session.current?.cancel();
    setTyped('');
    setPhase({
      at: 'compose',
      spoken: null,
      other: null,
      unconstrained: null,
      engineId: typedStt.id,
    });
  };

  /** आगे बढ़िए. The one place a sentence is acted on, whether it was spoken or typed. */
  const send = () => {
    if (phase.at !== 'compose' || typed.trim() === '') return;
    setPhase({ at: 'thinking' });
    handle(
      {
        text: typed,
        ...(phase.spoken === null ? {} : { heard: phase.spoken }),
        ...(phase.unconstrained === null ? {} : { unconstrained: phase.unconstrained }),
      },
      phase.engineId,
    );
  };

  return (
    <>
      <ScreenHeader
        title={t(composeTitle(phase))}
        tile={from}
        trail={t('listen.trail')}
        onBack={cancel}
      />
      <div className="flow">
        {phase.at === 'listening' && (
          <div className="listen">
            <Waveform />
            <span className="listen-state">{t('listen.title')}</span>
            <p className="listen-partial">{partial === '' ? '' : `“${partial}”`}</p>
            <p className="muted center">{t('listen.hint')}</p>
            {/* The way to FINISH, which for a long time did not exist. The engine also decides for
                itself when the speaker has stopped, but a traveller who is done should not have to
                wait to be believed — and without this the offline engine listened for ever, because
                its stop() was written and nothing called it. Primary, and first. */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setPhase({ at: 'thinking' });
                session.current?.stop();
              }}
            >
              {t('listen.done')}
            </button>
            {/* No "type it instead" here any more. It used to be the only way to reach a keyboard
                from this screen, which is why it was on it — but हो गया now always ends in the box,
                filled with what was heard or empty when nothing was, so the keyboard is one tap
                away by the ordinary route. The failure screens keep it, because there the
                microphone genuinely cannot work and the keyboard is not a second attempt. */}
            <button type="button" className="btn btn-ghost" onClick={cancel}>
              {t('listen.cancel')}
            </button>
          </div>
        )}

        {phase.at === 'preparing' && (
          <div className="listen">
            <Waveform />
            <span className="listen-state">{t('listen.preparing')}</span>
            <p className="muted center">{t('listen.preparingWhy')}</p>
            <button type="button" className="btn btn-ghost" onClick={cancel}>
              {t('listen.cancel')}
            </button>
          </div>
        )}

        {phase.at === 'thinking' && (
          <div className="listen">
            <Waveform />
            <span className="listen-state">{t('listen.thinking')}</span>
          </div>
        )}

        {phase.at === 'failed' && (
          <div className="listen">
            <p className="listen-state">{t(FAILURE_TITLE[phase.failure])}</p>
            <p className="muted center">{t(FAILURE_WHY[phase.failure])}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                startTyping();
              }}
            >
              {t('listen.type')}
            </button>
            {phase.failure !== 'no-engine' &&
              phase.failure !== 'network' &&
              phase.failure !== 'insecure-context' && (
                <button type="button" className="btn btn-ghost" onClick={listen}>
                  {t('listen.again')}
                </button>
              )}
          </div>
        )}

        {phase.at === 'offer-download' && (
          <div className="listen">
            <p className="listen-state">{t('listen.noEngine')}</p>
            <p className="muted center">{t('listen.getVoiceWhy', { size: VOICE_MB })}</p>
            <button type="button" className="btn btn-primary" onClick={getVoice}>
              {t('listen.getVoice')}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                startTyping();
              }}
            >
              {t('listen.type')}
            </button>
          </div>
        )}

        {phase.at === 'downloading' && (
          <div className="listen">
            <p className="listen-state">{t('listen.downloading', { percent: phase.percent })}</p>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${String(phase.percent)}%` }} />
            </div>
            <p className="muted center">{t('listen.getVoiceWhy', { size: VOICE_MB })}</p>
            {/* 42 MB on a hotel connection is the longest a traveller can be stuck on one
                screen. Without this they watched a bar with no way off it. */}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                download.current?.abort();
              }}
            >
              {t('listen.cancel')}
            </button>
          </div>
        )}

        {phase.at === 'ask' && (
          <Clarifier
            intent={phase.intent}
            onPick={(choice) => {
              recordClarifierChoice(phase.intent, choice, used.current.id);
              onHeard(phase.intent);
              navigate(
                choice === 'route'
                  ? transportLanding(phase.intent.destination?.placeId)
                  : { screen: 'soon', tile: 'food' },
              );
            }}
            actions={
              <>
                <button type="button" className="btn btn-primary" onClick={listen}>
                  {t('listen.again')}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    startTyping();
                  }}
                >
                  {t('listen.type')}
                </button>
              </>
            }
          />
        )}

        {/* Outside the phase switch on purpose. Nested inside "listening" it was invisible in the
            seven other states — including every state a traveller reaches when the microphone has
            just let them down, which is exactly when an offline voice is worth having. Three times
            today a way forward existed in the code and could not be reached from the screen. */}
        {modelState === 'fetchable' &&
          !downloadFailed &&
          phase.at !== 'downloading' &&
          phase.at !== 'offer-download' && (
            <button
              type="button"
              className="linkish offer"
              onClick={() => {
                session.current?.cancel();
                getVoice();
              }}
            >
              {t('listen.getVoice')} · {String(VOICE_MB)} MB
            </button>
          )}

        {phase.at === 'compose' && (
          <ComposeBox
            spoken={phase.spoken}
            other={phase.other}
            value={typed}
            onChange={setTyped}
            onSend={send}
            onAgain={listen}
          />
        )}
      </div>
      <QuickBar current={from} onMic={onMic} />
    </>
  );
}

/**
 * The sentence, in a box, before anything acts on it.
 *
 * One screen with two jobs: checking what the microphone heard, and typing when there was no
 * microphone. They are the same step, so they are the same component — the traveller presses
 * आगे बढ़िए either way, and only then does anything happen.
 *
 * Why this step exists at all: the offline recogniser is wrong often enough to matter, and wrong in
 * the worst possible way. "Mall of the Emirates" came back from a real phone as "माला एमरेट्स", and
 * a mangled place name does not fail — the skeleton matcher is generous by design, so it resolves,
 * confidently, to somewhere. A traveller cannot be protected from that by a confidence threshold.
 * They can be protected by being shown the sentence.
 */
function ComposeBox({
  spoken,
  other,
  value,
  onChange,
  onSend,
  onAgain,
}: {
  readonly spoken: string | null;
  readonly other: string | null;
  readonly value: string;
  readonly onChange: (text: string) => void;
  readonly onSend: () => void;
  readonly onAgain: () => void;
}) {
  const { t } = useSettings();
  const heard = spoken !== null;
  return (
    <div className="listen">
      {heard && <span className="listen-state">{t('listen.heard')}</span>}
      {/* An ordinary text box, so the phone's own keyboard does the work — and because the parser is
          script-agnostic, a traveller with no Hindi keyboard can correct "माला एमरेट्स" by typing
          "mall of emirates" and get the same answer. That is what makes this step usable rather
          than a demand that they own a Devanagari keyboard. */}
      <input
        className="typed"
        type="text"
        autoFocus
        lang="hi"
        value={value}
        placeholder={t('listen.typeHint')}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSend();
        }}
        aria-label={t(heard ? 'listen.check' : 'listen.type')}
      />
      <p className="muted center">{t(heard ? 'listen.checkWhy' : 'listen.typeWhy')}</p>
      <button
        type="button"
        className="btn btn-primary"
        disabled={value.trim() === ''}
        onClick={onSend}
      >
        {t('listen.send')}
      </button>
      {/* The two decoders disagreed. The other reading is the likeliest correction there is, so it
          is one tap rather than a sentence retyped on a phone keyboard in a language whose keyboard
          this traveller may not have installed. */}
      {other !== null && other !== value && (
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            onChange(other);
          }}
        >
          {t('listen.orThis', { text: other })}
        </button>
      )}
      {heard && (
        <button type="button" className="linkish" onClick={onAgain}>
          {t('listen.again')}
        </button>
      )}
    </div>
  );
}

/**
 * The header. The box is one screen with two jobs, and the crumb has to say which one it is doing:
 * a sentence to check, or a sentence to type.
 */
function composeTitle(phase: Phase): StringKey {
  if (phase.at !== 'compose') return 'listen.title';
  return phase.spoken === null ? 'listen.type' : 'listen.check';
}

/** Proof the mic is live. Five bars, no library, no audio analysis — it only has to say "on". */
function Waveform() {
  return (
    <div className="wave" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((bar) => (
        <span key={bar} className={`wave-bar wave-bar-${String(bar)}`} />
      ))}
    </div>
  );
}
