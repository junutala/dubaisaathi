import { useState } from 'react';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import { AskBar, recordVoiceEvent } from '../ask/index.js';
import { localName, placeById } from '../transport/index.js';
import { CATEGORIES, searchAttractions, type Attraction, type Category } from './attractions.js';
import { liveTabs, TIPS, type KnowTab } from './tips.js';

/**
 * जानना, on tabs (decision 037): 3.1 जगहें, below, and 3.3 सफ़र — the topics a traveller should
 * know about getting around, the Nol card first. The tab is in the address, so the back arrow on a
 * topic returns to the tab it was opened from.
 */
export function KnowScreen({ tab = 'places' }: { readonly tab?: KnowTab }) {
  const { t } = useSettings();
  const tabs = liveTabs();
  const current = tabs.includes(tab) ? tab : 'places';
  return (
    <>
      <ScreenHeader pillar="know" />
      <div className="flow">
        {tabs.length > 1 && (
          <div className="know-tabs" role="tablist">
            {tabs.map((one) => (
              <button
                key={one}
                type="button"
                role="tab"
                aria-selected={one === current}
                className={one === current ? 'know-tab know-tab-on' : 'know-tab'}
                onClick={() => {
                  navigate({ screen: 'know', tab: one });
                }}
              >
                {t(`know.tab.${one}` as StringKey)}
              </button>
            ))}
          </div>
        )}
        {current === 'places' ? <PlacesTab /> : <TopicsTab tab={current} />}
      </div>
    </>
  );
}

/** 3.3 — a tab of topics: one card each, opening its own page. */
function TopicsTab({ tab }: { readonly tab: Exclude<KnowTab, 'places'> }) {
  const { t } = useSettings();
  return (
    <div className="rows">
      {TIPS.filter((tip) => tip.tab === tab).map((tip) => (
        <button
          key={tip.id}
          type="button"
          className="tip-card"
          onClick={() => {
            navigate({ screen: 'tip', tipId: tip.id });
          }}
        >
          <span className="tip-icon">
            <Icon name={tip.icon} size={26} strokeWidth={1.7} color="var(--knowText)" />
          </span>
          <span className="row-card-text">
            <span className="row-card-title">{t(tip.title)}</span>
            <span className="row-card-sub">{t(tip.sub)}</span>
          </span>
          <Icon name="right" size={18} strokeWidth={2} color="var(--chev)" />
        </button>
      ))}
    </div>
  );
}

/**
 * 3.1 — जानना › जगहें. The places of Dubai with their hours and ticket on the card, a box to find one,
 * the kinds as chips, and at the bottom a line for a place we missed: the traveller writes its
 * name and it goes to the same queue the server already takes, so the next pack can carry it.
 */
function PlacesTab() {
  const { t } = useSettings();
  const [typed, setTyped] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [suggested, setSuggested] = useState('');
  const [thanked, setThanked] = useState(false);

  const rows = searchAttractions(typed, category);

  const suggest = () => {
    const words = suggested.trim();
    if (words === '') return;
    void recordVoiceEvent({
      transcript: words,
      intent: 'suggest-place',
      confidence: 1,
      landedOn: 'know',
      failure: 'nothing-in-pack',
      sttEngine: 'typed',
    });
    setSuggested('');
    setThanked(true);
  };

  return (
    <>
      <AskBar
        value={typed}
        onChange={setTyped}
        onSend={() => undefined}
        placeholder="know.placeholder"
        label="know.label"
        accent="var(--knowText)"
      />
      <div className="chips-row">
        {(['all', ...CATEGORIES] as const).map((kind) => {
          const on = kind === category;
          return (
            <button
              key={kind}
              type="button"
              className={on ? 'chip chip-on' : 'chip'}
              style={on ? { background: 'var(--knowText)', color: 'var(--onKnow)' } : undefined}
              onClick={() => {
                setCategory(kind);
              }}
            >
              {t(`know.chip.${kind}` as StringKey)}
            </button>
          );
        })}
      </div>

      {rows.length === 0 && <p className="trouble">{t('know.none')}</p>}
      <div className="rows">
        {rows.map((row) => (
          <AttractionCard key={row.placeId} row={row} />
        ))}
      </div>

      <div className="suggest-box">
        <span style={{ fontSize: 14.5, fontWeight: 700 }}>{t('know.suggest')}</span>
        <span className="muted small">
          {thanked ? t('know.suggestThanks') : t('know.suggestWhy')}
        </span>
        <div className="suggest-box-row">
          <input
            className="typed"
            type="text"
            value={suggested}
            placeholder={t('know.suggestPlaceholder')}
            aria-label={t('know.suggest')}
            onChange={(event) => {
              setSuggested(event.target.value);
              setThanked(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') suggest();
            }}
          />
          <button type="button" className="btn btn-ghost" onClick={suggest}>
            {t('know.suggestSend')}
          </button>
        </div>
      </div>
    </>
  );
}

function AttractionCard({ row }: { readonly row: Attraction }) {
  const { t, locale } = useSettings();
  const place = placeById(row.placeId);
  if (!place) return null;
  return (
    <button
      type="button"
      className="know-card"
      onClick={() => {
        navigate({ screen: 'place', placeId: row.placeId });
      }}
    >
      <span className="know-thumb">
        <Icon name="lantern" size={30} strokeWidth={1.4} color="var(--chev)" />
      </span>
      <span className="row-card-text">
        <span className="row-card-title">{localName(place.name, locale)}</span>
        <span className="row-card-sub">
          {locale === 'hi' ? place.name.en : place.name.hi} ·{' '}
          {t(`know.chip.${row.category}` as StringKey)}
        </span>
        <span className="know-facts">
          <span className="know-fact">
            <Icon name="clock" size={14} strokeWidth={2} color="var(--muted)" />
            {row.hoursText[locale]}
          </span>
          <span className="know-fact">
            <Icon name="ticket" size={14} strokeWidth={2} color="var(--muted)" />
            {row.ticketAed === 0 ? t('know.free') : t('know.from', { aed: row.ticketAed })}
          </span>
        </span>
      </span>
    </button>
  );
}
