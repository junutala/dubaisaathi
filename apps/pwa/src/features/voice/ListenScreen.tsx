import { useCallback, useEffect, useRef, useState } from 'react';
import type { ParsedIntent, VoiceFailure } from '@saathi/shared';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader, type Tile } from '../../app/shell/ScreenHeader.js';
import { QuickBar } from '../../app/shell/QuickBar.js';
import type { StringKey } from '../../i18n/index.js';
import { intentCorpus } from './intentPacks.js';
import { isConfident, parseIntent } from './parseIntent.js';
import { landingFor } from './micRouting.js';
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
import { downloadVoskModel, voskModelState } from './voskStt.js';

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
  | { readonly at: 'typing' };

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
  /** Set once a download has failed, so the offer is not shown again in a loop. */
  const [downloadFailed, setDownloadFailed] = useState(false);

  /** One path for every transcript, spoken or typed: parse, record, then go or ask. */
  const handle = useCallback(
    (transcript: string, engineId: string) => {
      const intent = parseIntent(transcript, intentCorpus);
      const route = landingFor(intent);
      void recordVoiceEvent({
        transcript,
        intent: intent.kind,
        confidence: intent.confidence,
        landedOn: route === 'ask' ? 'listen' : route.screen,
        failure: parseFailure(intent),
        sttEngine: engineId,
      });
      if (route === 'ask') {
        setPhase({ at: 'ask', intent });
        return;
      }
      onHeard(intent);
      navigate(route);
    },
    [onHeard],
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
        setPhase({ at: 'thinking' });
        handle(result.transcript, engine.id);
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
        // A refused permission or plain silence is the answer; anything else may just be this
        // engine, so the next one gets a turn before the traveller sees a failure at all.
        if (worthAnotherEngine(failure) && queue.current.length > 0) {
          tryNext();
          return;
        }
        setPhase({ at: 'failed', failure });
      },
    });
  }, [handle]);

  const listen = useCallback(() => {
    setPhase({ at: 'listening' });
    void resolveEngines(online).then((engines) => {
      queue.current = engines;
      tryNext();
    });
  }, [online, tryNext]);

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
    void downloadVoskModel((fraction) => {
      setPhase({ at: 'downloading', percent: Math.round(fraction * 100) });
    }).then((ok) => {
      if (!ok) {
        setDownloadFailed(true);
        setPhase({ at: 'failed', failure: 'failed' });
        return;
      }
      // Straight back to listening: the traveller asked a question a minute ago.
      listen();
    });
  };

  const cancel = () => {
    session.current?.cancel();
    window.history.back();
  };

  const submitTyped = () => {
    if (typed.trim() === '') return;
    setPhase({ at: 'thinking' });
    handle(typed.trim(), typedStt.id);
  };

  return (
    <>
      <ScreenHeader
        title={t(phase.at === 'typing' ? 'listen.type' : 'listen.title')}
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
            <button type="button" className="btn btn-ghost" onClick={cancel}>
              {t('listen.cancel')}
            </button>
            <button
              type="button"
              className="linkish"
              onClick={() => {
                session.current?.cancel();
                setPhase({ at: 'typing' });
              }}
            >
              {t('listen.type')}
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
                setPhase({ at: 'typing' });
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
                setPhase({ at: 'typing' });
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
          </div>
        )}

        {phase.at === 'ask' && (
          <Clarifier
            intent={phase.intent}
            onPick={(choice) => {
              void recordVoiceEvent({
                transcript: phase.intent.transcript,
                intent: choice,
                confidence: phase.intent.confidence,
                landedOn: choice === 'route' ? 'transport' : 'food',
                failure: null,
                clarifierChoice: choice,
                sttEngine: used.current.id,
              });
              onHeard(phase.intent);
              navigate({ screen: 'soon', tile: choice === 'route' ? 'transport' : 'food' });
            }}
            onAgain={listen}
            onType={() => {
              setPhase({ at: 'typing' });
            }}
          />
        )}

        {phase.at === 'typing' && (
          <div className="listen">
            {/* An ordinary text box, so the phone's own Hindi keyboard does the work. */}
            <input
              className="typed"
              type="text"
              autoFocus
              lang="hi"
              value={typed}
              placeholder={t('listen.typeHint')}
              onChange={(event) => {
                setTyped(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitTyped();
              }}
              aria-label={t('listen.type')}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={typed.trim() === ''}
              onClick={submitTyped}
            >
              {t('listen.send')}
            </button>
          </div>
        )}
      </div>
      <QuickBar current={from} onMic={onMic} />
    </>
  );
}

/**
 * What the learning loop should call a sentence the parser could not act on. A place with no
 * verb became a question; anything else was simply not understood, and the transcript is the
 * only thing that can teach the packs otherwise.
 */
function parseFailure(intent: ParsedIntent): VoiceFailure | null {
  if (intent.kind === 'unknown') return 'unknown-intent';
  if (intent.kind === 'place') return 'clarifier-shown';
  return isConfident(intent) ? null : 'low-confidence';
}

/**
 * The two-button question. A bare place name could be a route or a restaurant; a sentence that
 * parsed to nothing gets the same treatment. Either way the traveller taps once and moves on.
 */
function Clarifier({
  intent,
  onPick,
  onAgain,
  onType,
}: {
  readonly intent: ParsedIntent;
  readonly onPick: (choice: 'route' | 'food') => void;
  readonly onAgain: () => void;
  readonly onType: () => void;
}) {
  const { t } = useSettings();
  const known = intent.kind === 'place';

  return (
    <div className="listen">
      <p className="listen-state">
        {known
          ? t('listen.whichOne', { text: intent.destination?.spoken ?? intent.transcript })
          : t('listen.notUnderstood')}
      </p>
      {known ? (
        <>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onPick('route');
            }}
          >
            {t('listen.askRoute')}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              onPick('food');
            }}
          >
            {t('listen.askFood')}
          </button>
        </>
      ) : (
        <>
          <p className="muted center">{t('listen.notUnderstoodWhy')}</p>
          <button type="button" className="btn btn-primary" onClick={onAgain}>
            {t('listen.again')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onType}>
            {t('listen.type')}
          </button>
        </>
      )}
    </div>
  );
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
