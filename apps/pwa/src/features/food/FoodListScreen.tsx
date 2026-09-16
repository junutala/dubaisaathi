import { useEffect, useMemo, useState } from 'react';
import type { Restaurant } from '@saathi/shared';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import { AskBar, recordVoiceEvent } from '../ask/index.js';
import type { SavedHotel } from '../info/index.js';
import { distanceLabel } from '../../lib/distance.js';
import { useHere } from '../../lib/here.js';
import { popularDishes } from './dishes.js';
import { openState } from './openNow.js';
import { OUTLETS_ARE_FIXTURE } from './outlets.js';
import { searchOutlets, type Constraint, type OutletHit } from './search.js';

/**
 * 1.1 / 1.2 — खाना. The dish is the search, the place is the answer.
 *
 * A box, the constraints a traveller can state, the dishes people are looking for, and
 * everything near them underneath — nearest first, with the kitchen kind and the dishes a
 * person confirmed on every row. Typing a dish turns it into 1.2: the kitchens that make it.
 *
 * No opinions about dinner. The owner's rule: _"He should decide whether he wants idli or roti.
 * I cannot choose for him. I can only be a SAATHI, not his digestive system."_
 */

const CHIPS: readonly { readonly id: Constraint; readonly key: StringKey }[] = [
  { id: 'veg', key: 'food.chip.veg' },
  { id: 'jain', key: 'food.chip.jain' },
  { id: 'noOnionGarlic', key: 'food.chip.noOnionGarlic' },
  { id: 'vrat', key: 'food.chip.vrat' },
  { id: 'openNow', key: 'food.chip.openNow' },
];

export function FoodListScreen({
  dish,
  hotel,
}: {
  /** A dish handed in by the address bar, so a search survives a refresh. */
  readonly dish?: string | undefined;
  readonly hotel: SavedHotel | undefined;
}) {
  const { t, locale } = useSettings();
  const [typed, setTyped] = useState(dish ?? '');
  const [query, setQuery] = useState(dish ?? '');
  const [constraints, setConstraints] = useState<readonly Constraint[]>([]);
  const here = useHere(hotel);

  useEffect(() => {
    setTyped(dish ?? '');
    setQuery(dish ?? '');
  }, [dish]);

  const result = useMemo(
    () => searchOutlets(query, constraints, here.at),
    [query, constraints, here.at],
  );

  const send = (words: string) => {
    const trimmed = words.trim();
    setQuery(trimmed);
    if (trimmed === '') return;
    const found = searchOutlets(trimmed, constraints, here.at);
    // Every search, serviced or not. The rows that matter most are the empty ones: they are
    // what tells us where to send a collector.
    void recordVoiceEvent({
      transcript: trimmed,
      intent: 'food',
      confidence: found.dish === undefined ? 0.5 : 1,
      landedOn: 'food',
      failure: found.hits.length === 0 ? 'nothing-in-pack' : null,
      resultCount: found.hits.length,
      sttEngine: 'typed',
    });
  };

  const searched = query !== '';
  const showing =
    result.hits.length > 0 || !searched ? result : searchOutlets('', constraints, here.at);

  return (
    <>
      <ScreenHeader
        pillar="food"
        {...(searched && result.dish
          ? { trail: locale === 'hi' ? result.dish.name.hi : result.dish.name.en }
          : {})}
      />
      <div className="flow">
        <AskBar
          value={typed}
          onChange={(value) => {
            setTyped(value);
            if (value.trim() === '') setQuery('');
          }}
          onSend={() => {
            send(typed);
          }}
          placeholder="food.placeholder"
          label="food.label"
          accent="var(--foodText)"
        />

        <div className="chips-row">
          {CHIPS.map((chip) => {
            const on = constraints.includes(chip.id);
            return (
              <button
                key={chip.id}
                type="button"
                className={on ? 'chip chip-on' : 'chip'}
                style={on ? { background: 'var(--foodText)', color: 'var(--onFood)' } : undefined}
                onClick={() => {
                  setConstraints(
                    on ? constraints.filter((c) => c !== chip.id) : [...constraints, chip.id],
                  );
                }}
              >
                {t(chip.key)}
              </button>
            );
          })}
        </div>

        {!searched && (
          <>
            <p className="lbl">{t('food.popular')}</p>
            <div className="chips">
              {popularDishes.map((popular) => (
                <button
                  key={popular.id}
                  type="button"
                  className="chip"
                  onClick={() => {
                    const words = locale === 'hi' ? popular.name.hi : popular.name.en;
                    setTyped(words);
                    send(words);
                  }}
                >
                  {locale === 'hi' ? popular.name.hi : popular.name.en}
                </button>
              ))}
            </div>
          </>
        )}

        {searched && result.unmatchedWords && (
          <p className="trouble">{t('food.notFood', { text: query })}</p>
        )}
        {searched && !result.unmatchedWords && result.hits.length === 0 && (
          <div className="stack-sm">
            <p className="trouble">{t('food.none')}</p>
            <p className="muted small">{t('food.noneWhy')}</p>
          </div>
        )}

        <p className="lbl">
          {searched && result.hits.length > 0
            ? t('food.found', { count: result.hits.length })
            : here.from === 'hotel'
              ? t('food.nearHotel')
              : t('food.nearby')}
        </p>
        {here.denied && here.from === 'none' && (
          <p className="muted small">{t('food.noLocation')}</p>
        )}

        <div className="rows">
          {showing.hits.map((hit) => (
            <OutletRow key={hit.outlet.id} hit={hit} from={here.from} />
          ))}
        </div>

        {searched && result.hits.length > 0 && (
          <p className="muted small center">{t('food.honest')}</p>
        )}
        {OUTLETS_ARE_FIXTURE && <p className="muted small center">{t('food.fixture')}</p>}
      </div>
    </>
  );
}

/** One kitchen on the list: the name, where and how far, its kind, and what it makes. */
function OutletRow({
  hit,
  from,
}: {
  readonly hit: OutletHit;
  readonly from: 'phone' | 'hotel' | 'none';
}) {
  const { t, locale } = useSettings();
  const outlet = hit.outlet;
  const state = openState(outlet.hours);
  const dishes = (outlet.confirmedDishes ?? [])
    .slice(0, 2)
    .map((d) => (locale === 'hi' ? d.name.hi : d.name.en));
  return (
    <button
      type="button"
      className="row-card"
      onClick={() => {
        navigate({ screen: 'outlet', outletId: outlet.id });
      }}
    >
      <span className="row-card-thumb">
        <Icon name="thali" size={26} strokeWidth={1.5} color="var(--chev)" />
      </span>
      <span className="row-card-text">
        <span className="row-card-title">{locale === 'hi' ? outlet.name.hi : outlet.name.en}</span>
        <span className="row-card-sub">
          {[
            areaName(outlet, locale),
            hit.km === undefined
              ? undefined
              : from === 'hotel'
                ? t('food.fromHotel', { distance: distanceLabel(t, hit.km) })
                : distanceLabel(t, hit.km),
            hoursLine(t, state),
          ]
            .filter((part): part is string => part !== undefined)
            .join(' · ')}
        </span>
        <span className="row-card-line">
          <span className={`pill food-kitchen-${outlet.kitchen}`}>
            {t(`food.kitchen.${outlet.kitchen}` as StringKey)}
          </span>
          {dishes.length > 0 && (
            <span style={{ color: 'var(--foodText)', fontWeight: 600 }}>{dishes.join(', ')}</span>
          )}
        </span>
      </span>
      <Icon name="right" size={18} strokeWidth={2} color="var(--chev)" />
    </button>
  );
}

export function areaName(outlet: Restaurant, locale: 'hi' | 'en'): string | undefined {
  if (outlet.areaId === undefined) return undefined;
  return AREA_NAMES[outlet.areaId]?.[locale];
}

/** The neighbourhoods outlets sit in, by the ids the pack uses. */
const AREA_NAMES: Readonly<Record<string, { readonly hi: string; readonly en: string }>> = {
  karama: { hi: 'करामा', en: 'Karama' },
  'bur-dubai': { hi: 'बुर दुबई', en: 'Bur Dubai' },
  deira: { hi: 'देरा', en: 'Deira' },
  satwa: { hi: 'सतवा', en: 'Satwa' },
  'discovery-gardens': { hi: 'डिस्कवरी गार्डन्स', en: 'Discovery Gardens' },
  'international-city': { hi: 'इंटरनेशनल सिटी', en: 'International City' },
  'al-qusais': { hi: 'अल क़ुसैस', en: 'Al Qusais' },
  'al-barsha': { hi: 'अल बरशा', en: 'Al Barsha' },
  'dubai-marina': { hi: 'दुबई मरीना', en: 'Dubai Marina' },
  jumeirah: { hi: 'जुमेरा', en: 'Jumeirah' },
};

/** "खुला · 22:00 तक" while open, "बंद · 09:00 से खुलेगा" while closed — Dubai time, always. */
export function hoursLine(
  t: (key: StringKey, vars?: Record<string, string | number>) => string,
  state: ReturnType<typeof openState>,
): string | undefined {
  if (state === undefined) return undefined;
  if (state.next === undefined) return t('food.open24');
  return state.open
    ? t('food.closesAt', { time: state.next })
    : t('food.opensAt', { time: state.next });
}
