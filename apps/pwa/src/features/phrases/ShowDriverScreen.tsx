import { useEffect, useState } from 'react';
import type { Phrase } from '@saathi/shared';
import { useSettings } from '../../app/settings.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import { phraseById } from '../../db/content.js';
import { findArabicVoice, speakArabic, stopSpeaking } from './speak.js';

/**
 * 3.3 — the driver reads this at arm's length, so the Arabic is the whole screen and the
 * chrome is quiet. The listen button is labelled in his language, not the traveller's.
 */
export function ShowDriverScreen({ phraseId }: { readonly phraseId: string }) {
  const { t } = useSettings();
  const [phrase, setPhrase] = useState<Phrase | null>(null);
  const [canSpeak, setCanSpeak] = useState(false);

  useEffect(() => {
    void phraseById(phraseId).then((row) => {
      setPhrase(row ?? null);
    });
  }, [phraseId]);

  useEffect(() => {
    void findArabicVoice().then((s) => {
      setCanSpeak(s.kind === 'ready');
    });
    return stopSpeaking;
  }, []);

  if (!phrase) return null;

  return (
    <>
      <ScreenHeader title={t('driver.title')} tile="talk" trail={t('arabic.title')} />
      <div className="flow driver">
        <p className="arabic-xl" dir="rtl">
          {phrase.ar}
        </p>
        <div className="grow" />
        <span className="muted center small">{t('driver.youSaid', { text: phrase.hi })}</span>
        {canSpeak && (
          <button
            type="button"
            className="btn btn-indigo bottom"
            onClick={() => void speakArabic(phrase.ar)}
          >
            <Icon name="speak" size={24} strokeWidth={1.8} color="var(--marigold)" />
            <span className="arabic-btn" dir="rtl">
              {t('driver.listenArabic')}
            </span>
          </button>
        )}
      </div>
    </>
  );
}
