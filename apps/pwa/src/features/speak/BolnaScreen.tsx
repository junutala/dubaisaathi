import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import { recordVoiceEvent } from '../ask/index.js';
import { listen } from './listen.js';
import { MicError, startRecording, type Recorder } from './recordAudio.js';

/**
 * घर.5 · बोलना — the traveller speaks in their own language and reads it back in English.
 *
 * This is the only microphone in the product (decision 020). It is here because it is the one
 * job offline recognition could not do and online recognition can: a whole sentence, spoken the
 * way a person actually speaks it, meant for a Dubai local rather than for our matcher. The
 * three pillars' boxes are typed into and nothing about them changes.
 *
 * The state machine is the one from the owner's other product: idle → recording → transcribing,
 * a seconds counter while the microphone is open, and the microphone released if the screen
 * closes mid-recording — otherwise the phone keeps its recording indicator lit over a screen
 * that is gone.
 *
 * The box below is editable on purpose. The engine mishears a name now and then, and a traveller
 * about to show this to a shopkeeper would rather fix one word than say the whole thing again.
 * It is also what still works when the microphone does not: they can type the English themselves
 * and carry on to the Arabic.
 */

/** Half a minute. `listen` refuses more than this, so a forgotten recording stops itself first. */
const MAX_MS = 30_000;

/** A second recording this soon after a transcript is the traveller saying we got it wrong. */
const RETRY_WINDOW_MS = 20_000;

const MIC_TROUBLE: Record<string, StringKey> = {
  denied: 'bolna.micDenied',
  'no-mic': 'bolna.micNone',
  'in-use': 'bolna.micBusy',
  'no-recorder': 'bolna.micNoRecorder',
  failed: 'bolna.micFailed',
};

const REFUSED_TROUBLE: Record<string, StringKey> = {
  'not-configured': 'bolna.notConfigured',
  'too-long': 'bolna.tooLong',
  'no-audio': 'bolna.noAudio',
};

function mmss(seconds: number): string {
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, '0')}`;
}

export function BolnaScreen() {
  const { t, locale } = useSettings();
  const [state, setState] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [trouble, setTrouble] = useState<StringKey | null>(null);
  const [text, setText] = useState('');
  const recorder = useRef<Recorder | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  /** The last transcript and when it arrived, so an immediate retry can be recorded as one. */
  const lastHeard = useRef<{ text: string; at: number } | null>(null);

  useEffect(
    () => () => {
      if (ticker.current !== null) clearInterval(ticker.current);
      recorder.current?.cancel();
    },
    [],
  );

  const stopTicking = () => {
    if (ticker.current !== null) clearInterval(ticker.current);
    ticker.current = null;
  };

  const finish = async () => {
    const open = recorder.current;
    recorder.current = null;
    stopTicking();
    if (open === null) {
      setState('idle');
      return;
    }
    setState('transcribing');
    const recording = await open.stop();
    // The interface language is a hint to the recogniser and nothing more: it detects the
    // language itself, and a traveller speaking Tamil on a Hindi phone is the ordinary case.
    const heard = await listen(recording, seconds, locale);
    setState('idle');
    setSeconds(0);

    switch (heard.kind) {
      case 'heard':
        lastHeard.current = { text: heard.text, at: Date.now() };
        // Recording again adds to the sentence rather than wiping it: a second thought is
        // usually the rest of the sentence, not a correction of the first half.
        setText((current) =>
          current.trim() === '' ? heard.text : `${current.trim()} ${heard.text}`,
        );
        return;
      case 'nothing':
        setTrouble('bolna.nothing');
        void recordVoiceEvent({
          transcript: '',
          intent: 'bolna',
          confidence: 0,
          landedOn: 'bolna',
          failure: 'no-speech',
          sttEngine: 'sarvam',
          sttModel: 'saaras:v3',
        });
        return;
      case 'offline':
        setTrouble('bolna.offline');
        return;
      case 'refused':
        setTrouble(REFUSED_TROUBLE[heard.reason] ?? 'bolna.failed');
        return;
      case 'failed':
        setTrouble('bolna.failed');
    }
  };

  const begin = async () => {
    setTrouble(null);
    // A traveller recording again within moments of a transcript is telling us the transcript was
    // wrong. That is the row worth having in the question log; the audio never goes anywhere.
    const previous = lastHeard.current;
    if (previous !== null && Date.now() - previous.at < RETRY_WINDOW_MS) {
      void recordVoiceEvent({
        transcript: previous.text,
        intent: 'bolna',
        confidence: 0,
        landedOn: 'bolna',
        failure: 'retried',
        sttEngine: 'sarvam',
        sttModel: 'saaras:v3',
      });
      lastHeard.current = null;
    }
    try {
      recorder.current = await startRecording({
        maxMs: MAX_MS,
        onAutoStop: () => {
          // Half a minute is up. The recording is already closed, so it goes off to be turned
          // into English on its own: leaving a live button and a running counter over a
          // microphone that is already shut would be the screen lying about what it is doing.
          setTrouble('bolna.autoStopped');
          void finish();
        },
      });
    } catch (error) {
      // The phone has now actually refused — this is what it said, not what we guessed it would.
      setTrouble(
        MIC_TROUBLE[error instanceof MicError ? error.reason : 'failed'] ?? 'bolna.micFailed',
      );
      return;
    }
    setState('recording');
    setSeconds(0);
    ticker.current = setInterval(() => {
      setSeconds((count) => count + 1);
    }, 1000);
  };

  const tap = () => {
    if (state === 'recording') void finish();
    else if (state === 'idle') void begin();
  };

  const ready = text.trim() !== '';

  return (
    <>
      <ScreenHeader pillar="home" icon="mic" title={t('bolna.title')} />
      <div className="flow">
        <p className="muted small" style={{ margin: 0 }}>
          {t('bolna.why')}
        </p>

        <button
          type="button"
          className={state === 'recording' ? 'bolna-mic bolna-mic-on' : 'bolna-mic'}
          onClick={tap}
          disabled={state === 'transcribing'}
        >
          <Icon name="mic" size={30} strokeWidth={1.9} />
          <span className="bolna-mic-label">
            {state === 'recording'
              ? t('bolna.stop', { time: mmss(seconds) })
              : state === 'transcribing'
                ? t('bolna.working')
                : ready
                  ? t('bolna.again')
                  : t('bolna.speak')}
          </span>
        </button>

        {trouble !== null && <p className="trouble">{t(trouble)}</p>}

        <span className="lbl">{t('bolna.label')}</span>
        <textarea
          className="typed bolna-text"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
          placeholder={t('bolna.placeholder')}
          rows={4}
        />
        <p className="muted small" style={{ margin: 0 }}>
          {t('bolna.hint')}
        </p>

        <div className="grow" />
        <button
          type="button"
          className="btn btn-primary"
          disabled={!ready}
          onClick={() => {
            navigate({ screen: 'bolnaArabic', text: text.trim() });
          }}
        >
          {t('bolna.toArabic')}
          <Icon name="right" size={20} strokeWidth={2} />
        </button>
      </div>
    </>
  );
}
