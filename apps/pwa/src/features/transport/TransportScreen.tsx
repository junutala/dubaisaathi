import { useEffect, useState } from 'react';
import type { DubaiPlace, ParsedIntent } from '@saathi/shared';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { QuickBar } from '../../app/shell/QuickBar.js';
import { Icon } from '../../app/shell/icons.js';
import { AskBar } from '../ask/AskBar.js';
import { HeardBanner } from '../voice/HeardBanner.js';
import { destinationPhrase, destinationPhraseId } from '../phrases/destinationPhrase.js';
import {
  askForLocation,
  currentLocation,
  hasBeenAsked,
  type Location,
} from '../../lib/location.js';
import { localName, placeById, placeFromText } from './destinations.js';

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

  // A destination handed in arrives already filled: the traveller sees the place in the box and
  // can correct it, rather than being sent onward by a screen they never touched.
  useEffect(() => {
    if (placeId === undefined) return;
    const place = placeById(placeId);
    if (!place) return;
    setDestination(place);
    setTyped(localName(place.name, locale));
  }, [placeId, locale]);

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
    navigate({ screen: 'options', placeId: place.id });
  };

  const showDriver = () => {
    const place = resolve();
    if (!place) return;
    if (destinationPhrase(place) === null) {
      setTrouble({ kind: 'no-arabic' });
      return;
    }
    navigate({ screen: 'arabic', phraseId: destinationPhraseId(place.id) });
  };

  return (
    <>
      <ScreenHeader title={t('transport.title')} tile="transport" />
      <div className="flow">
        {heard && <HeardBanner intent={heard} />}

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

        {trouble !== null && (
          <div className="stack-sm">
            {trouble.kind === 'unknown' && (
              <p className="trouble">{t('transport.unknownPlace', { text: trouble.text })}</p>
            )}
            {trouble.kind === 'no-arabic' && <p className="trouble">{t('transport.noArabic')}</p>}
            {trouble.kind !== 'no-arabic' && (
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

        <div className="grow" />
      </div>
      <QuickBar current="transport" onMic={onMic} />
    </>
  );
}
