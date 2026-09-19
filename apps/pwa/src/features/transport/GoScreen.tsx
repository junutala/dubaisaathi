import { useEffect, useState } from 'react';
import type { DubaiPlace } from '@saathi/shared';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import { AskBar, recordVoiceEvent } from '../ask/index.js';
import { attractions } from '../know/index.js';
import { hasBeenAsked } from '../../lib/location.js';
import { carriesMoreThanThePlace, localName, placeById, readPlace } from './destinations.js';
import { recentPlaces, rememberPlace } from './recentPlaces.js';

/**
 * 2.1 — जाना › कहाँ. A box, a suggestion when the spelling is near a place we know, and the
 * places of Dubai underneath so a traveller who has not typed anything has somewhere to tap.
 *
 * A place we know goes to 2.2 with the options. Words we do not know are not a dead end: they
 * are an address a taxi driver can read, so they go to 2.4 as they are.
 */
export function GoScreen({ placeId }: { readonly placeId?: string | undefined }) {
  const { t, locale } = useSettings();
  const [typed, setTyped] = useState('');
  const [unknown, setUnknown] = useState<string | null>(null);
  /** The reason goes on the screen before the phone's prompt, and only the first time (design rule 10). */
  const [explaining] = useState(() => !hasBeenAsked());

  // A destination handed in — from a kitchen's जाना, or a place on जानना — arrives already
  // filled, so the traveller sees it and can correct it rather than being sent on blind.
  useEffect(() => {
    if (placeId === undefined) return;
    const place = placeById(placeId);
    if (place) setTyped(localName(place.name, locale));
  }, [placeId, locale]);

  const reading = typed.trim() === '' ? null : readPlace(typed.trim());
  const areaOnly =
    reading?.sure === true &&
    reading.place.kind === 'neighbourhood' &&
    !carriesMoreThanThePlace(typed.trim(), reading.place.name.en)
      ? localName(reading.place.name, locale)
      : null;

  const go = (place: DubaiPlace) => {
    rememberPlace(place.id);
    void recordVoiceEvent({
      transcript: typed.trim() || localName(place.name, locale),
      intent: 'route',
      confidence: 1,
      landedOn: 'options',
      failure: null,
      resolvedPlaceId: place.id,
      sttEngine: 'typed',
    });
    navigate({ screen: 'options', placeId: place.id });
  };

  const send = () => {
    const words = typed.trim();
    if (words === '') return;
    if (reading?.sure) {
      go(reading.place);
      return;
    }
    if (reading) return; // the suggestion is on the screen; the traveller answers it
    setUnknown(words);
    void recordVoiceEvent({
      transcript: words,
      intent: 'route',
      confidence: 0,
      landedOn: 'go',
      failure: 'unresolved-place',
      sttEngine: 'typed',
    });
  };

  const recent = recentPlaces();

  return (
    <>
      <ScreenHeader pillar="go" />
      <div className="flow">
        {explaining && (
          <div className="note">
            <Icon name="pin" size={19} strokeWidth={1.9} color="var(--teal)" />
            <span>{t('go.locationWhy')}</span>
          </div>
        )}

        <AskBar
          value={typed}
          onChange={(value) => {
            setTyped(value);
            setUnknown(null);
          }}
          onSend={send}
          placeholder="go.placeholder"
          label="go.label"
          accent="var(--go)"
        />

        {reading !== null && (
          <div className="suggest" style={{ background: 'var(--goSoft)', color: 'var(--goText)' }}>
            <span className="suggest-text">
              {t('go.suggest', { place: localName(reading.place.name, locale) })}
              {locale === 'hi' && reading.place.name.en !== reading.place.name.hi
                ? ` ${reading.place.name.en}`
                : ''}
            </span>
            <button
              type="button"
              className="suggest-yes"
              style={{ background: 'var(--go)', color: 'var(--onGo)' }}
              onClick={() => {
                go(reading.place);
              }}
            >
              {t('go.yes')}
            </button>
          </div>
        )}

        {areaOnly !== null && (
          <p className="muted small">{t('go.areaIsBig', { area: areaOnly })}</p>
        )}

        {unknown !== null && (
          <div className="stack-sm">
            <p className="trouble">{t('go.unknown', { text: unknown })}</p>
            <p className="muted small">{t('go.unknownWhy')}</p>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                navigate({ screen: 'taxi', placeId: `text:${encodeURIComponent(unknown)}` });
              }}
            >
              <Icon name="taxi" size={20} strokeWidth={1.9} />
              {t('go.taxiAnyway')}
            </button>
          </div>
        )}

        {recent.length > 0 && typed === '' && (
          <>
            <p className="lbl">{t('go.recent')}</p>
            <div className="chips">
              {recent.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  className="chip"
                  onClick={() => {
                    setTyped(localName(place.name, locale));
                    go(place);
                  }}
                >
                  {localName(place.name, locale)}
                </button>
              ))}
            </div>
          </>
        )}

        <p className="lbl">{t('go.attractions')}</p>
        <div className="rows">
          {attractions()
            .map((attraction) => placeById(attraction.placeId))
            .filter((place): place is DubaiPlace => place !== undefined)
            .map((place) => (
              <button
                key={place.id}
                type="button"
                className="row-card"
                onClick={() => {
                  setTyped(localName(place.name, locale));
                  go(place);
                }}
              >
                <span className="row-card-text">
                  <span className="row-card-title">{localName(place.name, locale)}</span>
                  <span className="row-card-sub">
                    {locale === 'hi' ? place.name.en : place.name.hi}
                  </span>
                </span>
                <Icon name="right" size={18} strokeWidth={2} color="var(--chev)" />
              </button>
            ))}
        </div>
      </div>
    </>
  );
}
