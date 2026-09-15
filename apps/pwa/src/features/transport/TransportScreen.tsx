import { useEffect, useState } from 'react';
import type { DubaiPlace, ParsedIntent } from '@saathi/shared';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { QuickBar } from '../../app/shell/QuickBar.js';
import { Icon, type IconName } from '../../app/shell/icons.js';
import { AskBar } from '../ask/AskBar.js';
import { composedPhraseId } from '../phrases/composeArabic.js';
import { HeardBanner } from '../voice/HeardBanner.js';
import { typedDestinationPhraseId } from '../phrases/destinationPhrase.js';
import {
  askForLocation,
  currentLocation,
  hasBeenAsked,
  type Location,
} from '../../lib/location.js';
import { carriesMoreThanThePlace, localName, placeById, placeFromText } from './destinations.js';
import { quickPicks, rememberPlace } from './recentPlaces.js';
import { readHotel } from '../info/index.js';

/**
 * 1.1 — रास्ता › कहाँ जाना है?
 *
 * A box, a small mic at the end of it, and two things to do with what was typed. That shape is
 * the owner's decision and it is the answer to the question decision 014 left open.
 *
 * "Discovery Gardens jaana hai" means *show me the transport* in a hotel room and *tell the
 * driver* at a taxi door. The difference is where the traveller is standing, which is not in
 * the words, so no parser recovers it and the app must never guess — and it must never require
 * a particular form of words either, because _"I cannot teach Hindi to my user."_ So the screen
 * serves both readings and the traveller picks: कैसे जाएँ opens the options, ड्राइवर को दिखाएँ
 * opens the Arabic for "take me to «place»".
 *
 * The mic is small, plain and ink-coloured at the end of the box (decision 014). It fills the
 * box; it is not the offer.
 */

/** What went wrong with what was typed. Never a dead end, never a blank — always a way on. */
type Trouble =
  | { readonly kind: 'empty' }
  | { readonly kind: 'unknown'; readonly text: string }
  | { readonly kind: 'no-arabic' }
  | null;

export function TransportScreen({
  placeId,
  onMic,
  heard,
}: {
  /** Carried in by the mic, by the clarifier, and one day by a restaurant's "go there". */
  readonly placeId?: string | undefined;
  readonly onMic: () => void;
  readonly heard?: ParsedIntent | undefined;
}) {
  const { t, locale } = useSettings();
  const [typed, setTyped] = useState('');
  const [destination, setDestination] = useState<DubaiPlace | null>(null);
  const [trouble, setTrouble] = useState<Trouble>(null);
  const [location, setLocation] = useState<Location>(currentLocation);
  /** The reason goes on the screen before the phone's prompt, and only the first time (rule 9). */
  const [explaining] = useState(() => !hasBeenAsked());
  /** Read once on arrival, so the shortcuts reflect what this phone has actually done. */
  const [hotelPlaceId, setHotelPlaceId] = useState<string | undefined>(undefined);
  /**
   * They have typed the name of a whole neighbourhood and nothing else. Satwa is eighty thousand
   * people; a driver shown "take me to Satwa" concludes that somebody is wasting his time. So
   * the screen asks for the building or the landmark — advice, never a gate: both buttons stay
   * live, because a traveller who only knows the area still has to be able to go there.
   */
  const areaOnly = (() => {
    const words = typed.trim();
    if (words === '') return null;
    const place = placeFromText(words);
    if (place?.kind !== 'neighbourhood') return null;
    return carriesMoreThanThePlace(words, place.name.en) ? null : localName(place.name, locale);
  })();
  useEffect(() => {
    let live = true;
    void readHotel().then((row) => {
      if (live) setHotelPlaceId(row?.area?.placeId);
    });
    return () => {
      live = false;
    };
  }, []);

  // Recomputed when the hotel arrives, so it leads the row rather than appearing at the end.
  const picks = quickPicks(hotelPlaceId);

  // A destination handed in arrives already filled: the traveller sees the place in the box and
  // can correct it, rather than being sent onward by a screen they never touched.
  useEffect(() => {
    if (placeId === undefined) return;
    const place = placeById(placeId);
    if (!place) return;
    setDestination(place);
    setTyped(localName(place.name, locale));
  }, [placeId, locale]);

  /**
   * A sentence the mic brought that resolved to no place goes in the box, not above it.
   *
   * It was appearing in a read-only card with an empty box underneath asking for a place name —
   * two boxes where the design has one, and the traveller's own words in the one they cannot
   * edit. Speech fills the box (decision 014); it does not open a screen and then describe
   * itself from the sidelines. With the words in the box, a mangled place name is two taps from
   * being fixed instead of being retyped from nothing.
   */
  useEffect(() => {
    if (placeId !== undefined || heard === undefined) return;
    setTyped(heard.transcript);
  }, [placeId, heard]);

  useEffect(() => {
    // Rule 30: asked at first need, with the reason already painted. The delay is the point —
    // the phone's own prompt covers this screen, and a prompt with no reason gets refused.
    // After the first time the phone answers from its stored decision without prompting, so
    // asking again is not nagging; it is how we know whether we can plan a route at all.
    const wait = explaining ? 700 : 0;
    const timer = setTimeout(() => {
      void askForLocation().then(setLocation);
    }, wait);
    return () => {
      clearTimeout(timer);
    };
  }, [explaining]);

  /** What is in the box, as a place — or the honest answer that we do not know it. */
  const resolve = (): DubaiPlace | null => {
    const text = typed.trim();
    if (text === '') {
      setTrouble({ kind: 'empty' });
      return null;
    }
    // Handed in, and untouched since: trust what arrived rather than re-reading our own label
    // back through the parser, which is the one string it was never asked to understand.
    if (destination && text === localName(destination.name, locale)) {
      setTrouble(null);
      return destination;
    }
    const place = placeFromText(text);
    if (!place) {
      setTrouble({ kind: 'unknown', text });
      return null;
    }
    setTrouble(null);
    setDestination(place);
    return place;
  };

  const showOptions = () => {
    const place = resolve();
    if (!place) return;
    // The phone has already refused: 1.1b says what that costs and how to undo it, rather than
    // sending them to a screen that can only shrug.
    if (location.kind === 'denied') {
      navigate({ screen: 'nolocation' });
      return;
    }
    rememberPlace(place.id);
    navigate({ screen: 'options', placeId: place.id });
  };

  /**
   * Showing a driver never needed the pack, so it no longer consults it.
   *
   * The curated place list exists to bound the **recogniser's** vocabulary — a grammar has to
   * know which words it may hear (decision 013). Voice went to the second bench (decision 014)
   * and the list stayed on as a gatekeeper for a path that never needed one, which is how
   * "Satwa, Al Hudaiba Building" became "take me to Satwa": a neighbourhood of eighty thousand
   * people, handed to a driver as if it were an address.
   *
   * The driver knows the city. Our one job is to put the traveller's own words in front of him
   * under a sentence he can read, changed in no way at all. What is left for the pack is
   * coordinates for route planning, which genuinely need one.
   */
  /**
   * The same words, but not as a destination.
   *
   * ड्राइवर को दिखाएँ wraps whatever is in the box in "take me to", which is exactly right for
   * the address this screen exists to carry — "Satwa, Al Hudaiba Building" reaches a driver
   * unchanged and complete. It is nonsense for a sentence that was never a journey: "AC kharab
   * hai theek kar do" came out as خذني إلى AC kharab hai, *take me to my AC is broken*.
   *
   * Which of the two it is cannot be read off the words — an unrecognised string is an address
   * far more often than not — so this is not a guess the app makes. It is offered beside the
   * other reading, in the one place we already admit we did not recognise the place, and the
   * traveller settles it in a tap (decision 014).
   */
  const sayItPlainly = () => {
    const words = typed.trim();
    if (words === '') {
      setTrouble({ kind: 'empty' });
      return;
    }
    navigate({ screen: 'arabic', phraseId: composedPhraseId(words) });
  };

  const showDriver = () => {
    const words = typed.trim();
    if (words === '') {
      setTrouble({ kind: 'empty' });
      return;
    }
    setTrouble(null);
    const place = placeFromText(words);
    if (place) rememberPlace(place.id);
    navigate({ screen: 'arabic', phraseId: typedDestinationPhraseId(words) });
  };

  return (
    <>
      <ScreenHeader title={t('transport.title')} tile="transport" />
      <div className="flow">
        {/* Only when the box holds something else — a place we resolved, or a correction they
            have started typing. Showing it above their own unedited words was saying the same
            thing twice, in two different boxes (design rule 10 is about reassurance, not echo). */}
        {heard && typed !== heard.transcript && <HeardBanner intent={heard} />}

        {explaining && (
          <div className="note">
            <Icon name="pin" size={19} strokeWidth={1.9} color="var(--teal)" />
            <span>{t('transport.locationWhy')}</span>
          </div>
        )}

        <AskBar
          value={typed}
          onChange={(value) => {
            setTyped(value);
            setTrouble(null);
          }}
          onSend={() => {
            resolve();
          }}
          onMic={onMic}
          placeholder="transport.placeholder"
          label="transport.label"
        />

        {areaOnly !== null && (
          <p className="muted small">{t('transport.areaIsBig', { area: areaOnly })}</p>
        )}

        {trouble !== null && (
          <div className="stack-sm">
            {trouble.kind === 'unknown' && (
              <>
                <p className="trouble">{t('transport.unknownPlace', { text: trouble.text })}</p>
                {/* Never a dead end. The words are still a sentence a driver can read, and the
                    button that does it is already on this screen — so this points at it. "Try
                    another name" pointed away from the one thing that was going to work, to a
                    traveller who had typed a perfectly good sentence that simply was not a
                    place: "AC kharab hai theek kar do" is not a mistyped Karama. */}
                <p className="muted small">{t('transport.unknownButShow')}</p>
                <button type="button" className="linkish" data-tap onClick={sayItPlainly}>
                  {t('transport.notAPlace')}
                </button>
              </>
            )}
            {trouble.kind === 'no-arabic' && <p className="trouble">{t('transport.noArabic')}</p>}
            {trouble.kind === 'empty' && (
              <p className="muted small">{t('transport.unknownPlaceWhy')}</p>
            )}
          </div>
        )}

        {/* Both readings of the same sentence, side by side. Neither is the default, because
            which one is right depends on a hotel room or a taxi door and the app cannot see
            which of the two the traveller is standing in. */}
        <div className="rows">
          <button type="button" className="btn btn-primary" data-tap onClick={showOptions}>
            <Icon name="route" size={21} strokeWidth={1.8} />
            {t('transport.options')}
          </button>
          <button type="button" className="btn btn-ghost" data-tap onClick={showDriver}>
            <Icon name="talk" size={21} strokeWidth={1.8} />
            {t('transport.translate')}
          </button>
        </div>

        {/* A tourist's week is four or five places over and over, so the screen offers the ones
            this phone has actually used rather than half a screen of nothing. These FILL THE BOX
            and do not navigate: which of the two buttons is right still depends on whether the
            traveller is in a hotel room or at a taxi door, and that is not ours to decide.
            Nothing here is ranked by what we imagine they would like — it is their own history
            and their own hotel. */}
        {picks.length > 0 && (
          <div className="stack-sm">
            <p className="lbl">{t('transport.quick')}</p>
            <div className="chips">
              {picks.map((place) => (
                <QuickPick
                  key={place.id}
                  label={localName(place.name, locale)}
                  icon={place.id === hotelPlaceId ? 'pin' : undefined}
                  onPick={() => {
                    setTyped(localName(place.name, locale));
                    setTrouble(null);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <QuickBar current="transport" onMic={onMic} />
    </>
  );
}

/**
 * One shortcut. It is a control, so it is 48px like every other (design rule 20), and it fills
 * the box rather than acting — a shortcut that decided for the traveller would be the same
 * mistake as a mall alias that decided which mall.
 */
function QuickPick({
  label,
  icon,
  onPick,
}: {
  readonly label: string;
  readonly icon?: IconName | undefined;
  readonly onPick: () => void;
}) {
  return (
    <button type="button" className="chip" data-tap onClick={onPick}>
      {icon && <Icon name={icon} size={17} strokeWidth={1.9} />}
      {label}
    </button>
  );
}
