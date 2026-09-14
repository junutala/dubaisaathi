import { useEffect, useState } from 'react';
import type { Phrase } from '@saathi/shared';
import { useSettings } from '../../app/settings.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import { resolvePhrase } from './resolvePhrase.js';
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
    void resolvePhrase(phraseId).then((row) => {
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
        {/* The Arabic is the whole point of this screen and the traveller cannot read a word of
            it, so the name they typed is repeated in Roman letters underneath. It is composed
            from the same place record as the Arabic, so if this says BurJuman the Arabic does
            too — which is the only check available to someone holding the phone out to a driver.
            Added after a real report: a mall we did not know resolved to Dubai Mall, and the
            first the owner knew of it was the Hindi line above. */}
        <span className="muted center small">{phrase.hinglish}</span>
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
