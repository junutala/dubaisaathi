import { useEffect, useState } from 'react';
import type { ParsedIntent, Phrase, PhraseSituation } from '@saathi/shared';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { QuickBar } from '../../app/shell/QuickBar.js';
import { Icon } from '../../app/shell/icons.js';
import { phrasesFor } from '../../db/content.js';
import { HeardBanner } from '../voice/HeardBanner.js';
import type { StringKey } from '../../i18n/index.js';

const SITUATIONS: readonly { readonly id: PhraseSituation; readonly key: StringKey }[] = [
  { id: 'taxi', key: 'say.situation.taxi' },
  { id: 'hotel', key: 'say.situation.hotel' },
  { id: 'shopping', key: 'say.situation.shop' },
  { id: 'restaurant', key: 'say.situation.food' },
];

/**
 * 3.1 — say it, or pick a ready sentence when the taxi is too loud to be heard. One screen,
 * because they are the same job: get Arabic out of your mouth or your phone.
 */
export function SayEntryScreen({
  onMic,
  heard,
}: {
  readonly onMic: () => void;
  /** Set when the mic understood "बोलो" but not which sentence — so they pick one from here. */
  readonly heard?: ParsedIntent | undefined;
}) {
  const { t } = useSettings();
  const [situation, setSituation] = useState<PhraseSituation>('taxi');
  const [phrases, setPhrases] = useState<readonly Phrase[]>([]);

  useEffect(() => {
    let live = true;
    void phrasesFor(situation).then((rows) => {
      if (live) setPhrases(rows);
    });
    return () => {
      live = false;
    };
  }, [situation]);

  return (
    <>
      <ScreenHeader title={t('say.title')} tile="talk" />
      <div className="flow">
        {heard && <HeardBanner intent={heard} />}
        <div className="say-mic">
          <button type="button" className="mic-xl" onClick={onMic} aria-label={t('nav.mic')}>
            <Icon name="mic" size={44} strokeWidth={1.5} color="var(--onMarigold)" />
          </button>
          <span className="say-mic-label">{t('say.speak')}</span>
          <span className="muted">{t('say.example')}</span>
        </div>

        <p className="lbl">{t('say.orPick')}</p>
        <div className="chips">
          {SITUATIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={s.id === situation ? 'chip chip-on' : 'chip'}
              onClick={() => {
                setSituation(s.id);
              }}
            >
              {t(s.key)}
            </button>
          ))}
        </div>

        <div className="rows">
          {phrases.map((phrase) => (
            <button
              key={phrase.id}
              type="button"
              className="phrase-row"
              onClick={() => {
                navigate({ screen: 'arabic', phraseId: phrase.id });
              }}
            >
              <span className="phrase-text">
                <span className="phrase-hi">{phrase.hi}</span>
                <span className="phrase-ar" dir="rtl">
                  {phrase.ar}
                </span>
              </span>
              <Icon name="right" size={20} strokeWidth={1.8} color="var(--chev)" />
            </button>
          ))}
        </div>
      </div>
      <QuickBar current="talk" onMic={onMic} />
    </>
  );
}
