import { useEffect } from 'react';
import type { ConfirmedDish } from '@saathi/shared';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import type { SavedHotel } from '../info/index.js';
import { outletPlaceId, rupees } from '../transport/index.js';
import { distanceKm, distanceLabel } from '../../lib/distance.js';
import { VIRTUAL_HERE_NAME } from '../../lib/dubai.js';
import { useHere } from '../../lib/here.js';
import { areaName, hoursLine } from './FoodListScreen.js';
import { openState } from './openNow.js';
import { recordUsage } from '../ask/index.js';
import { outletById } from './outlets.js';

/**
 * 1.3 — the kitchen, which is its menu (owner, 24 September: the screen before this one "is a
 * liability and not appealing … navigate to the second screen directly").
 *
 * What a traveller does about a kitchen — see it on the map, get there, ring it — sits at the top
 * and stays there while the menu scrolls under it (owner, 24 September). Below: what a person was asked at the counter,
 * then the menu, grouped under the headings the restaurant printed, in the card's own order —
 * breakfast is not served at four in the afternoon, and a list that mixes the two makes the
 * traveller do the separating.
 *
 * A question nobody asked shows as पूछकर, never as a no: claiming a kitchen cannot feed a Jain
 * traveller because nobody checked is the same defect as claiming it can.
 */
const QUESTIONS: readonly { readonly id: string; readonly key: StringKey }[] = [
  { id: 'jain', key: 'food.diet.jain' },
  { id: 'vrat', key: 'food.diet.vrat' },
  { id: 'noOnionGarlic', key: 'food.diet.noOnionGarlic' },
  { id: 'eggless', key: 'food.diet.eggless' },
  { id: 'sattvik', key: 'food.diet.sattvik' },
];

/** The menu's own sections, in the order the card prints them; a heading printed twice is one. */
export function menuSections(
  dishes: readonly ConfirmedDish[],
): readonly { readonly section: string | undefined; readonly dishes: readonly ConfirmedDish[] }[] {
  const order: (string | undefined)[] = [];
  const bySection = new Map<string | undefined, ConfirmedDish[]>();
  for (const dish of dishes) {
    const key = dish.section;
    let group = bySection.get(key);
    if (group === undefined) {
      group = [];
      bySection.set(key, group);
      order.push(key);
    }
    group.push(dish);
  }
  return order.map((section) => ({ section, dishes: bySection.get(section) ?? [] }));
}

export function MenuScreen({
  outletId,
  hotel,
}: {
  readonly outletId: string;
  readonly hotel: SavedHotel | undefined;
}) {
  const { t, locale } = useSettings();
  // For the owner's count of what travellers open; nothing is shown (the owner, 25 September).
  useEffect(() => {
    recordUsage('menu', outletId);
  }, [outletId]);
  const outlet = outletById(outletId);
  const here = useHere(hotel);

  useEffect(() => {
    if (!outlet) navigate({ screen: 'food' });
  }, [outlet]);
  if (!outlet) return null;

  const name = locale === 'hi' ? outlet.name.hi : outlet.name.en;
  const state = openState(outlet.hours);
  const km = here.at === undefined ? undefined : distanceKm(here.at, outlet.location);
  const items = outlet.confirmedDishes ?? [];
  const sections = menuSections(items);
  const asked = new Date(outlet.hoursConfirmedAt ?? '');
  const askedOn = Number.isNaN(asked.getTime())
    ? undefined
    : new Intl.DateTimeFormat(locale === 'hi' ? 'hi-IN' : 'en-GB', {
        day: 'numeric',
        month: 'short',
      }).format(asked);

  return (
    <>
      <ScreenHeader pillar="food" trail={name} />
      <div className="flow">
        <div className="kitchen-head">
          <h1 className="outlet-title">{name}</h1>
          <p className="outlet-meta">
            {[
              areaName(outlet, locale),
              km === undefined
                ? undefined
                : here.from === 'hotel'
                  ? t('food.fromHotel', { distance: distanceLabel(t, km) })
                  : here.from === 'virtual'
                    ? t('food.fromVirtual', {
                        place: VIRTUAL_HERE_NAME[locale],
                        distance: distanceLabel(t, km),
                      })
                    : distanceLabel(t, km),
              hoursLine(t, state),
              t(`food.kitchen.${outlet.kitchen}` as StringKey),
              outlet.approxCostAed === undefined
                ? undefined
                : priceWithRupees(t, outlet.approxCostAed),
            ]
              .filter((part): part is string => part !== undefined)
              .map((part) => (
                <span key={part}>{part}</span>
              ))}
          </p>
        </div>
        {/* Stays at the top while the menu scrolls: the traveller's actions never scroll away. */}
        <div className="kitchen-actions">
          {/* Our own map, with the route and the distance to the collector's pin — offline, which
                a hand-off to another map app is not (owner, 25 September; decision 035). */}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              navigate({ screen: 'map', placeId: outletPlaceId(outlet.id) });
            }}
          >
            <Icon name="pin" size={20} strokeWidth={1.9} />
            {t('food.map')}
          </button>
          <button
            type="button"
            className="btn btn-go"
            onClick={() => {
              navigate({ screen: 'options', placeId: outletPlaceId(outlet.id) });
            }}
          >
            <Icon name="metro" size={20} strokeWidth={1.9} />
            {t('food.go')}
          </button>
          {outlet.phone === undefined ? (
            <span className="btn btn-ghost btn-off" aria-disabled="true">
              <Icon name="phone" size={20} strokeWidth={1.9} />
              {t('food.call')}
            </span>
          ) : (
            <a className="btn btn-ghost" href={`tel:${outlet.phone}`}>
              <Icon name="phone" size={20} strokeWidth={1.9} />
              {t('food.call')}
            </a>
          )}
        </div>

        <div className="answers-row">
          {QUESTIONS.map((question) => {
            const answer = outlet.dietary?.[question.id] ?? 'on-request';
            return (
              <span key={question.id} className="answer-pill">
                {t(question.key)}
                <span className={`answer-a answer-${answer}`}>
                  {t(`food.answer.${answer}` as StringKey)}
                </span>
              </span>
            );
          })}
        </div>
        {askedOn !== undefined && (
          <p className="muted small">
            {outlet.spokeTo === undefined
              ? t('food.askedOn', { date: askedOn })
              : t('food.askedBy', { who: outlet.spokeTo, date: askedOn })}
          </p>
        )}

        {items.length === 0 ? (
          <p className="trouble">{t('food.menuNone')}</p>
        ) : (
          <>
            {sections.map(({ section, dishes }) => (
              <section key={section ?? ''} className="menu-section">
                <p className="lbl">{section ?? t('food.menuTitle')}</p>
                <div className="menu-grid">
                  {dishes.map((item) => (
                    <div key={item.name.en} className="menu-item">
                      <span className="menu-item-name">
                        {locale === 'hi' ? item.name.hi : item.name.en}
                      </span>
                      {item.priceAed !== undefined && (
                        <span className="menu-item-price">
                          {t('unit.fare', { amount: item.priceAed })}
                          {rupees(item.priceAed) !== undefined && (
                            <span className="menu-item-inr">
                              {t('unit.inr', { inr: rupees(item.priceAed) ?? '' })}
                            </span>
                          )}
                        </span>
                      )}
                      {item.tags.length > 0 && (
                        <span className="menu-item-tags">
                          {item.tags.map((tag) => t(`food.tag.${tag}` as StringKey)).join(' · ')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
            <p className="muted small center">{t('food.menuNote')}</p>
          </>
        )}
      </div>
    </>
  );
}

/** "One person ≈ AED 25 · ≈ ₹650" — the rupees only when the pack carries a rate. */
function priceWithRupees(
  t: (key: StringKey, vars?: Record<string, string | number>) => string,
  aed: number,
): string {
  const inr = rupees(aed);
  const line = t('food.price', { aed });
  return inr === undefined ? line : `${line} · ${t('unit.inr', { inr })}`;
}
