import { useEffect, useState } from 'react';
import type { FoodTag, ParsedIntent, Restaurant } from '@saathi/shared';
import { useSettings } from '../../app/settings.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { QuickBar } from '../../app/shell/QuickBar.js';
import { Icon } from '../../app/shell/icons.js';
import type { StringKey } from '../../i18n/index.js';
import { AskBar } from '../ask/AskBar.js';
import { HeardBanner } from '../voice/HeardBanner.js';
import { intentCorpus } from '../voice/intentPacks.js';
import { parseIntent } from '../voice/parseIntent.js';
import { recordVoiceEvent } from '../voice/voiceEvent.js';
import { typedStt } from '../voice/stt.js';
import { askForLocation, currentLocation, type Location } from '../../lib/location.js';
import { nearbyOutlets, searchOutlets, type OutletSearch } from './search.js';
import { OUTLETS_ARE_FIXTURE, isDietTag } from './outlets.js';
import { isOpenNow } from './openNow.js';

/**
 * 2.1 — खाना › सूची.
 *
 * A box, everything nearby underneath it, and no opinions about dinner. The owner's rule, and
 * the reason there is no learning and no reweighting here: _"He should decide whether he wants
 * idli or roti. I cannot choose for him. I can only be a SAATHI, not his digestive system."_
 *
 * So a constraint the traveller stated is honoured — asking for वेज does not show a kitchen
 * with no vegetarian food in it — and a taste is never predicted. What orders the list is
 * distance, which is a fact about the world rather than an opinion about them.
 *
 * It never opens empty. A traveller who does not yet know what they want sees what is around
 * them; typing narrows it. And a search we could not answer is recorded rather than shrugged
 * off: `nothing-in-pack` is a work order for collection, not a parser fault.
 */
export function FoodListScreen({
  onMic,
  heard,
}: {
  readonly onMic: () => void;
  readonly heard?: ParsedIntent | undefined;
}) {
  const { t, locale } = useSettings();
  const [typed, setTyped] = useState('');
  const [location, setLocation] = useState<Location>(currentLocation);
  const [result, setResult] = useState<OutletSearch>(() => nearbyOutlets(undefined));

  // खाना needs to know what is near, so it asks at its own first need (design rule 9). The
  // phone's answer is the answer: nothing here decides the traveller has no location.
  useEffect(() => {
    let live = true;
    void askForLocation().then((answer) => {
      if (!live) return;
      setLocation(answer);
      setResult(nearbyOutlets(answer.kind === 'here' ? answer.at : undefined));
    });
    return () => {
      live = false;
    };
  }, []);

  const here = location.kind === 'here' ? location.at : undefined;

  const send = () => {
    const words = typed.trim();
    if (words === '') {
      setResult(nearbyOutlets(here));
      return;
    }
    const intent = parseIntent(words, intentCorpus);
    const found = searchOutlets(words, intent.foodTags ?? [], here);
    setResult(found);

    // Every interaction, serviced or not. The rows that matter most are the empty ones: they
    // are what tells us where to send a collector, and what to build for version 2.
    void recordVoiceEvent({
      transcript: words,
      intent: 'food',
      confidence: intent.confidence,
      landedOn: 'food',
      failure: found.hits.length === 0 ? 'nothing-in-pack' : null,
      resultCount: found.hits.length,
      sttEngine: typedStt.id,
    });
  };

  const searched = typed.trim() !== '';
  const showing = result.hits.length > 0 ? result : nearbyOutlets(here);

  return (
    <>
      <ScreenHeader title={t('food.title')} tile="food" />
      <div className="flow">
        {heard && <HeardBanner intent={heard} />}

        <AskBar
          value={typed}
          onChange={setTyped}
          onSend={send}
          onMic={onMic}
          placeholder="food.placeholder"
          label="food.label"
        />

        {/* Said before the list, so a traveller reads the answer knowing what it answered. */}
        {searched && result.hits.length === 0 && (
          <div className="stack-sm">
            <p className="lbl">
              {result.unmatchedWords ? t('food.notFood', { text: typed }) : t('food.none')}
            </p>
            <p className="muted small">{t('food.noneWhy')}</p>
          </div>
        )}

        <p className="muted small">
          {searched && result.hits.length > 0
            ? t('food.found', { count: String(result.hits.length) })
            : t('food.nearby', { count: String(showing.hits.length) })}
        </p>

        {location.kind === 'denied' && <p className="muted small">{t('food.noLocation')}</p>}

        <div className="food-list">
          {showing.hits.map((hit) => (
            <OutletCard key={hit.outlet.id} outlet={hit.outlet} km={hit.km} locale={locale} />
          ))}
        </div>

        {/* Said plainly rather than implied: nobody has been to these places yet. */}
        {OUTLETS_ARE_FIXTURE && <p className="muted small center">{t('food.fixture')}</p>}
      </div>
      <QuickBar current="food" onMic={onMic} />
    </>
  );
}

/** The kitchen kind is the first line, because it is the first thing worth knowing. */
function OutletCard({
  outlet,
  km,
  locale,
}: {
  readonly outlet: Restaurant;
  readonly km?: number | undefined;
  readonly locale: 'hi' | 'en';
}) {
  const { t } = useSettings();
  return (
    <div className="card food-card">
      <div className="food-card-head">
        <span className="food-name">{locale === 'hi' ? outlet.name.hi : outlet.name.en}</span>
        {km !== undefined && (
          <span className="muted small">{t('food.km', { km: km.toFixed(1) })}</span>
        )}
      </div>

      <div className="food-tags">
        <span className={`food-kitchen food-kitchen-${outlet.kitchen}`}>
          {t(`food.kitchen.${outlet.kitchen}` as StringKey)}
        </span>
        {/* Cuisine only, where a person answered the dietary questions. The diet tags are derived
            from those same answers, so showing both said everything twice — "Eggless" as a chip
            and "Eggless yes" underneath it — and the row below says it better, because it can
            also say "on request", which a chip cannot. The tags themselves are untouched: they
            are what search filters on, which is a different job from what a card shows. */}
        {outlet.tags
          .filter((tag: FoodTag) => outlet.dietary === undefined || !isDietTag(tag))
          .map((tag: FoodTag) => (
            <span key={tag} className="food-tag">
              {t(`food.tag.${tag}` as StringKey)}
            </span>
          ))}
      </div>

      {/*
        What a person was actually told, standing in the shop. This is the whole reason a
        collector walks in and asks rather than reading a signboard — and until now it was
        collected, stored, and then dropped at the last step, which is the worst of both.

        A question nobody asked is absent here, and absent shows as पूछिए below. "Nobody asked"
        and "they said no" must never look the same: claiming a kitchen cannot feed a Jain
        traveller on the strength of nobody having checked is the same defect as claiming it can.
      */}
      {outlet.dietary !== undefined && (
        <div className="food-diet">
          {Object.entries(outlet.dietary).map(([question, answer]) => (
            <span key={question} className={`food-diet-item food-diet-${answer}`}>
              {t(`food.diet.${question}` as StringKey)}
              <span className="food-diet-answer">{t(`food.answer.${answer}` as StringKey)}</span>
            </span>
          ))}
        </div>
      )}

      {/* A named dish is worth more than a tick box: "they will make you a Jain sambar" is
          specific, checkable, and the reason someone walks the extra street. */}
      {outlet.confirmedDishes !== undefined && outlet.confirmedDishes.length > 0 && (
        <p className="food-dishes">
          <Icon name="check" size={16} strokeWidth={2.1} />
          {outlet.confirmedDishes
            .map((dish) => (locale === 'hi' ? dish.name.hi : dish.name.en))
            .join(' · ')}
        </p>
      )}

      {/* Hours, and the 2am question answered rather than left to arithmetic. */}
      {outlet.hours !== undefined && <OutletHours hours={outlet.hours} />}

      <div className="food-card-foot">
        {outlet.approxCostAed !== undefined && (
          <span className="muted small">
            {t('food.price', { aed: String(outlet.approxCostAed) })}
          </span>
        )}
        {/* A call needs no data and no pack — the most offline thing this app can offer someone
            who would rather not walk. Shown only where a person actually asked and was told yes. */}
        {outlet.delivers === 'yes' && outlet.phone !== undefined && (
          <a className="btn btn-ghost food-call" href={`tel:${outlet.phone}`} data-tap>
            <Icon name="phone" size={19} strokeWidth={1.9} />
            {t('food.call')}
          </a>
        )}
        {outlet.delivers === 'yes' && outlet.phone === undefined && (
          <span className="muted small">{t('food.delivers')}</span>
        )}
      </div>
    </div>
  );
}

/**
 * When it opens, and whether it is open right now.
 *
 * The owner insisted structured hours be collected — _"even if it costs us 6 months down the
 * lane"_ — because Dubai does not sleep and the late places are the ones nobody else lists. This
 * is where that pays: a straight yes or no at the moment a traveller is standing outside at 1am,
 * computed on the device with the network off.
 */
function OutletHours({ hours }: { readonly hours: NonNullable<Restaurant['hours']> }) {
  const { t } = useSettings();
  const open = isOpenNow(hours);
  const times =
    hours.open24 === true
      ? t('food.open24')
      : hours.everyDay
        ? `${hours.everyDay.opens} – ${hours.everyDay.closes}`
        : null;

  return (
    <p className="food-hours">
      {open !== undefined && (
        <span className={open ? 'food-open' : 'food-shut'}>
          {t(open ? 'food.openNow' : 'food.shutNow')}
        </span>
      )}
      {times !== null && <span className="muted small">{times}</span>}
      {/* Said only where it is true, because it is the thing worth knowing at 2am. */}
      {hours.openLate === true && <span className="food-late">{t('food.openLate')}</span>}
    </p>
  );
}
