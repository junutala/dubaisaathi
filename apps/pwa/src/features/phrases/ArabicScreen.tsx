import { useEffect, useState } from 'react';
import type { ParsedIntent, Phrase } from '@saathi/shared';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { QuickBar } from '../../app/shell/QuickBar.js';
import { Icon } from '../../app/shell/icons.js';
import { resolvePhrase } from './resolvePhrase.js';
import { composedTextInPhrase } from './composeArabic.js';
import { savePhrase, savedArabicFor } from './savedPhrases.js';
import { translateToArabic } from './translate.js';
import {
  findArabicVoice,
  meansNoVoice,
  speakArabic,
  stopSpeaking,
  watchArabicVoices,
  type SpeechSupport,
} from './speak.js';

/**
 * 3.2 — the Arabic, big, on a dark card so it reads across a taxi. Check what it heard, hear
 * it aloud, then hand the phone over.
 */
export function ArabicScreen({
  phraseId,
  onMic,
  heard,
}: {
  readonly phraseId: string;
  readonly onMic: () => void;
  /** Set when the mic chose this sentence, so they can see it chose the right one (rule 10). */
  readonly heard?: ParsedIntent | undefined;
}) {
  const { t } = useSettings();
  // `undefined` while the lookup is in flight, `null` once it has come back empty. The two were
  // one value and both rendered a blank screen, so a sentence we have no Arabic for looked
  // exactly like a bug — a way out that is not a way through.
  const [phrase, setPhrase] = useState<Phrase | null | undefined>(undefined);
  const [support, setSupport] = useState<SpeechSupport | null>(null);
  const [speaking, setSpeaking] = useState(false);
  /**
   * Set only once the phone has refused **for a reason that means the voice is not there**. A
   * voice list is not proof, and neither is any old error: an interrupted utterance or a busy
   * audio device is a moment, not a verdict, and latching on one is how a phone with a perfectly
   * good Arabic voice got told it had none.
   */
  const [refused, setRefused] = useState(false);
  /** What the phone said the last time it would not speak, shown so it can be acted on. */
  const [trouble, setTrouble] = useState<string | null>(null);

  useEffect(() => {
    setPhrase(undefined);
    // AbortController rather than a boolean: inside an async closure TypeScript follows the
    // control flow and decides a flag is always true, because the only assignment is in a cleanup
    // it cannot see running. `signal.aborted` is opaque to that, and it is what this means anyway
    // — the traveller left the screen and the answer is no longer wanted.
    const gone = new AbortController();
    // Read through a call, not directly: after the first check TypeScript narrows the flag to
    // false and keeps it narrowed across every await, so the later checks read as dead code. A
    // call is re-evaluated, which is what "has the traveller left yet" actually means.
    const left = (): boolean => gone.signal.aborted;
    void (async () => {
      // 1. A stored phrase, or one composed from intent and slots. Free, instant, offline.
      const built = await resolvePhrase(phraseId);
      if (left()) return;
      if (built !== undefined) {
        setPhrase(built);
        return;
      }

      const said = composedTextInPhrase(phraseId);
      if (said === null || said === '') {
        setPhrase(null);
        return;
      }

      // 2. Kept from an earlier time. This is what makes a translator useful to an offline
      //    product: the second time is free, and it works with the radio off.
      const kept = await savedArabicFor(said);
      if (left()) return;
      if (kept !== undefined) {
        setPhrase({
          id: phraseId,
          situation: 'taxi',
          hi: said,
          hinglish: said,
          en: said,
          ar: kept.ar,
        });
        return;
      }

      // 3. Never seen before, so it needs a translator — which needs signal. Whatever comes back
      //    is kept immediately, so this sentence never needs the network again.
      const fresh = await translateToArabic(said);
      if (left()) return;
      if (fresh === null) {
        setPhrase(null);
        return;
      }
      void savePhrase(said, fresh.ar, fresh.engine);
      setPhrase({
        id: phraseId,
        situation: 'taxi',
        hi: said,
        hinglish: said,
        en: said,
        ar: fresh.ar,
      });
    })();
    return () => {
      gone.abort();
    };
  }, [phraseId]);

  useEffect(() => {
    void findArabicVoice().then(setSupport);
    // Android hands its voices over in pieces, so the answer can change after this screen has
    // already asked. Without this, a voice that loads a second late is never noticed.
    const unwatch = watchArabicVoices(setSupport);
    return () => {
      unwatch();
      stopSpeaking();
    };
  }, []);

  if (phrase === undefined) return null;

  /*
    We have no Arabic for this one. Say so, show them their own words so the screen makes sense
    on its own, and point at what does work — never a blank screen and never a guess. This is
    where the on-device model goes when it arrives: the branch already exists, with an honest
    answer in it until then.
  */
  if (phrase === null) {
    const said = composedTextInPhrase(phraseId);
    return (
      <>
        <ScreenHeader title={t('arabic.title')} tile="talk" />
        <div className="flow">
          {/* Same shape as the success path below, so the screen reads as one screen. */}
          {said !== null && said !== '' && (
            <div className="stack-sm">
              <p className="lbl">{t('arabic.youSaid')}</p>
              <div className="card pad">{said}</div>
            </div>
          )}
          <p className="lbl">{t('arabic.cannotSay')}</p>
          <p className="muted small">{t('arabic.cannotSayWhy')}</p>
          <button
            type="button"
            className="btn btn-primary"
            data-tap
            onClick={() => {
              navigate({ screen: 'say' });
            }}
          >
            {t('arabic.pickReady')}
          </button>
        </div>
        <QuickBar current="home" onMic={onMic} />
      </>
    );
  }

  // Offered from the moment the screen paints. Waiting on the voice probe was the bug: Android
  // does not populate its voice list until the user has touched the page, so the probe sits
  // unresolved and the button sits disabled — until some unrelated tap wakes it. The tap on this
  // button is that gesture, so it must be pressable before the probe has said anything.
  const canSpeak = support?.kind !== 'unsupported' && !refused;

  return (
    <>
      <ScreenHeader title={t('arabic.title')} tile="talk" trail={t('say.title')} />
      <div className="flow">
        {/* One block, whichever way they arrived. Tapping a sentence shows that sentence; the
            mic shows their own words and which sentence it picked, because that is the thing
            worth checking before handing the phone to a driver. */}
        <div className="stack-sm">
          <p className="lbl">{t('arabic.youSaid')}</p>
          <div className="card pad">{heard ? heard.transcript : phrase.hi}</div>
          {heard && <p className="muted">→ {phrase.hi}</p>}
        </div>

        <div className="stack-sm">
          <p className="lbl">{t('arabic.showThis')}</p>
          <div className="arabic-card">
            <p className="arabic-lg" dir="rtl">
              {phrase.ar}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          disabled={!canSpeak}
          onClick={() => {
            setSpeaking(true);
            setTrouble(null);
            void speakArabic(phrase.ar)
              .then((result) => {
                if (result.spoken) return;
                // Only a reason that actually means "no such voice" closes the door. Anything
                // else leaves the button live, because the next tap very often works.
                if (meansNoVoice(result.reason)) setRefused(true);
                setTrouble(result.reason ?? 'unknown');
              })
              .finally(() => {
                setSpeaking(false);
              });
          }}
        >
          <Icon name="speak" size={21} strokeWidth={1.9} />
          {speaking ? t('arabic.speaking') : t('arabic.listen')}
        </button>

        {/* Said only after the phone has been asked and declined for a reason that means it —
            never on a guess, and never on an interruption we caused ourselves. */}
        {(refused || support?.kind === 'unsupported') && (
          <p className="muted small">{t('arabic.noVoice')}</p>
        )}
        {/* It would not speak, but it did not say the voice is missing. Say so plainly and let
            them tap again, rather than deciding the phone is incapable on one bad moment. The
            reason is on the screen because a bug report that carries it is worth ten that do not. */}
        {!refused && trouble !== null && (
          <p className="muted small">{t('arabic.tryAgain', { reason: trouble })}</p>
        )}

        <div className="grow" />
        <button
          type="button"
          className="btn btn-primary bottom"
          onClick={() => {
            navigate({ screen: 'driver', phraseId });
          }}
        >
          {t('arabic.show')}
        </button>
      </div>
      <QuickBar current="talk" onMic={onMic} />
    </>
  );
}
