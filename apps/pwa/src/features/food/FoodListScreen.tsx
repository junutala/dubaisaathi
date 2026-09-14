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
import { OUTLETS_ARE_FIXTURE } from './outlets.js';

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
        {outlet.tags.map((tag: FoodTag) => (
          <span key={tag} className="food-tag">
            {t(`food.tag.${tag}` as StringKey)}
          </span>
        ))}
      </div>

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
