import { useEffect } from 'react';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import type { SavedHotel } from '../info/index.js';
import { distanceKm, distanceLabel } from '../../lib/distance.js';
import { useHere } from '../../lib/here.js';
import { areaName, hoursLine } from './FoodListScreen.js';
import { openState } from './openNow.js';
import { outletById } from './outlets.js';

/**
 * 1.3 — the kitchen. What a person was told standing in it, the dishes they confirmed, when it
 * opens, and the three things to do about it: call, see the menu, go.
 *
 * A question nobody asked is absent here and shows as पूछकर. "Nobody asked" and "they said no"
 * must never look the same: claiming a kitchen cannot feed a Jain traveller on the strength of
 * nobody having checked is the same defect as claiming it can.
 */
const QUESTIONS: readonly { readonly id: string; readonly key: StringKey }[] = [
  { id: 'jain', key: 'food.diet.jain' },
  { id: 'vrat', key: 'food.diet.vrat' },
  { id: 'noOnionGarlic', key: 'food.diet.noOnionGarlic' },
  { id: 'eggless', key: 'food.diet.eggless' },
  { id: 'sattvik', key: 'food.diet.sattvik' },
];

export function OutletScreen({
  outletId,
  hotel,
}: {
  readonly outletId: string;
  readonly hotel: SavedHotel | undefined;
}) {
  const { t, locale } = useSettings();
  const outlet = outletById(outletId);
  const here = useHere(hotel);

  useEffect(() => {
    if (!outlet) navigate({ screen: 'food' });
  }, [outlet]);
  if (!outlet) return null;

  const name = locale === 'hi' ? outlet.name.hi : outlet.name.en;
  const state = openState(outlet.hours);
  const km = here.at === undefined ? undefined : distanceKm(here.at, outlet.location);
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
        <div className="stack-sm">
          <h1 className="outlet-title">{name}</h1>
          <p className="outlet-meta">
            {[
              areaName(outlet, locale),
              km === undefined
                ? undefined
                : here.from === 'hotel'
                  ? t('food.fromHotel', { distance: distanceLabel(t, km) })
                  : distanceLabel(t, km),
              hoursLine(t, state),
            ]
              .filter((part): part is string => part !== undefined)
              .map((part) => (
                <span key={part}>{part}</span>
              ))}
          </p>
          <span className="row-card-line">
            <span className={`pill food-kitchen-${outlet.kitchen}`}>
              {t(`food.kitchen.${outlet.kitchen}` as StringKey)}
            </span>
            {outlet.approxCostAed !== undefined && (
              <span className="pill" style={{ background: 'var(--sand)' }}>
                {t('food.price', { aed: outlet.approxCostAed })}
              </span>
            )}
          </span>
        </div>

        <div className="answers">
          {QUESTIONS.map((question) => {
            const answer = outlet.dietary?.[question.id] ?? 'on-request';
            return (
              <span key={question.id} className="answer">
                <span>{t(question.key)}</span>
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

        {outlet.confirmedDishes !== undefined && outlet.confirmedDishes.length > 0 && (
          <>
            <p className="lbl">{t('food.dishes')}</p>
            <div className="chips">
              {outlet.confirmedDishes.map((dish) => (
                <span key={dish.name.en} className="chip">
                  {locale === 'hi' ? dish.name.hi : dish.name.en}
                  {dish.priceAed !== undefined && (
                    <span className="muted"> · AED {dish.priceAed}</span>
                  )}
                </span>
              ))}
            </div>
          </>
        )}

        <div className="grow" />
        <div className="grid3">
          {outlet.phone === undefined ? (
            <span className="btn btn-ghost" style={{ opacity: 0.45 }}>
              <Icon name="phone" size={20} strokeWidth={1.9} />
              {t('food.call')}
            </span>
          ) : (
            <a className="btn btn-ghost" href={`tel:${outlet.phone}`}>
              <Icon name="phone" size={20} strokeWidth={1.9} />
              {t('food.call')}
            </a>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              navigate({ screen: 'menu', outletId: outlet.id });
            }}
          >
            <Icon name="docs" size={20} strokeWidth={1.9} />
            {t('food.menu')}
          </button>
          <button
            type="button"
            className="btn btn-go"
            onClick={() => {
              navigate(
                outlet.areaId === undefined
                  ? { screen: 'go' }
                  : { screen: 'go', placeId: outlet.areaId },
              );
            }}
          >
            <Icon name="metro" size={20} strokeWidth={1.9} />
            {t('food.go')}
          </button>
        </div>
      </div>
    </>
  );
}
