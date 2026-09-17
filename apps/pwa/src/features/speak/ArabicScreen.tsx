import { useEffect, useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import { toArabic } from './arabic.js';
import { speakArabic } from './speak.js';

/**
 * घर.6 · बोलना › अरबी में — the English sentence, the same sentence in Arabic, and a button
 * that says it out loud.
 *
 * The Arabic is what a shopkeeper or a driver reads off the screen, so it is set large, right to
 * left, in the app's own Arabic face. Grammar is not the point and never was: conveying the
 * meaning beats chaste Arabic, which is the same call the phrase translator was built on.
 *
 * Offline, the Arabic cannot be fetched and the screen says exactly that. An Arabic sentence
 * already on the screen still reads aloud, because the voice is the phone's own and owes nothing
 * to the network.
 */

const TROUBLE: Record<string, StringKey> = {
  'not-configured': 'arabic.notConfigured',
  'too-long': 'arabic.tooLong',
  nothing: 'arabic.nothing',
};

const VOICE_TROUBLE: Record<string, StringKey> = {
  'no-engine': 'arabic.noEngine',
  'no-voice': 'arabic.noVoice',
  error: 'arabic.readFailed',
};

export function ArabicScreen({ text }: { readonly text: string }) {
  const { t } = useSettings();
  const [arabic, setArabic] = useState<string | null>(null);
  const [working, setWorking] = useState(true);
  const [trouble, setTrouble] = useState<StringKey | null>(null);
  const [reading, setReading] = useState(false);
  const [voiceTrouble, setVoiceTrouble] = useState<StringKey | null>(null);
  /** Bumped by the retry button; asking again is the same fetch, run again. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setWorking(true);
    setTrouble(null);
    void toArabic(text).then((outcome) => {
      if (!live) return;
      setWorking(false);
      if (outcome.kind === 'arabic') setArabic(outcome.ar);
      else if (outcome.kind === 'offline') setTrouble('arabic.offline');
      else if (outcome.kind === 'refused') setTrouble(TROUBLE[outcome.reason] ?? 'arabic.failed');
      else setTrouble('arabic.failed');
    });
    return () => {
      live = false;
    };
  }, [text, attempt]);

  const read = () => {
    if (arabic === null) return;
    setVoiceTrouble(null);
    void speakArabic(arabic, () => {
      // Shown when the device says it started speaking, not when it was asked to.
      setReading(true);
    }).then((outcome) => {
      setReading(false);
      if (outcome.kind === 'refused') {
        setVoiceTrouble(VOICE_TROUBLE[outcome.reason] ?? 'arabic.readFailed');
      }
    });
  };

  return (
    <>
      <ScreenHeader pillar="home" icon="sound" title={t('arabic.title')} trail={t('bolna.title')} />
      <div className="flow">
        <div className="card pad">
          <span className="lbl" style={{ paddingTop: 0 }}>
            {t('arabic.english')}
          </span>
          <p className="bolna-en">{text}</p>
        </div>

        <span className="lbl">{t('arabic.label')}</span>
        {arabic !== null && (
          <p className="bolna-ar" dir="rtl" lang="ar">
            {arabic}
          </p>
        )}
        {working && <p className="muted small bolna-wait">{t('arabic.working')}</p>}
        {trouble !== null && <p className="trouble">{t(trouble)}</p>}
        {trouble !== null && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setAttempt((count) => count + 1);
            }}
          >
            {t('arabic.retry')}
          </button>
        )}

        {arabic !== null && (
          <>
            <button type="button" className="btn btn-primary" onClick={read} disabled={reading}>
              <Icon name="sound" size={20} strokeWidth={2} />
              {reading ? t('arabic.reading') : t('arabic.read')}
            </button>
            {voiceTrouble !== null && <p className="trouble">{t(voiceTrouble)}</p>}
            <p className="muted small center">{t('arabic.show')}</p>
          </>
        )}
      </div>
    </>
  );
}
