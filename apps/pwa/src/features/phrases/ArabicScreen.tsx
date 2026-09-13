import { useEffect, useState } from 'react';
import type { ParsedIntent, Phrase } from '@saathi/shared';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { QuickBar } from '../../app/shell/QuickBar.js';
import { Icon } from '../../app/shell/icons.js';
import { phraseById } from '../../db/content.js';
import { findArabicVoice, speakArabic, stopSpeaking, type SpeechSupport } from './speak.js';

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
  const [phrase, setPhrase] = useState<Phrase | null>(null);
  const [support, setSupport] = useState<SpeechSupport | null>(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    void phraseById(phraseId).then((row) => {
      setPhrase(row ?? null);
    });
  }, [phraseId]);

  useEffect(() => {
    void findArabicVoice().then(setSupport);
    return stopSpeaking;
  }, []);

  if (!phrase) return null;

  const canSpeak = support?.kind === 'ready';

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
            void speakArabic(phrase.ar).finally(() => {
              setSpeaking(false);
            });
          }}
        >
          <Icon name="speak" size={21} strokeWidth={1.9} />
          {speaking ? t('arabic.speaking') : t('arabic.listen')}
        </button>

        {support !== null && !canSpeak && <p className="muted small">{t('arabic.noVoice')}</p>}

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
