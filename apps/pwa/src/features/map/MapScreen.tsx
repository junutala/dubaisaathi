import { useEffect, useMemo, useRef, useState } from 'react';
import type { LatLng } from '@saathi/shared';
import { useSettings } from '../../app/settings.js';
import { navigate } from '../../app/routes.js';
import { ScreenHeader } from '../../app/shell/ScreenHeader.js';
import { Icon } from '../../app/shell/icons.js';
import type { SavedHotel } from '../info/index.js';
import {
  DESTINATION_NODE_ID,
  ORIGIN_NODE_ID,
  currentFares,
  fareText,
  localName,
  minutes,
  modeIcon,
  modeLabel,
  placeById,
  planRoutes,
  useOrigin,
  useTransportNetwork,
  type RouteOptionId,
  type Words,
} from '../transport/index.js';
import { distanceLabel } from '../../lib/distance.js';
import { VIRTUAL_HERE_NAME } from '../../lib/dubai.js';
import { ensureMap, useMapStatus, type MapStatus } from './keepMap.js';
import { routeShape, type RouteShape } from './routeShape.js';
import type { Basemap, MapView } from './mapView.js';

/**
 * 2.6 — नक्शा (decision 035). The way to a place drawn on our own map: the streets from the
 * OpenStreetMap archive kept on the phone, the journey on top of them from the same planner जाना
 * uses — the walk to the station dashed, the ride through every stop it passes, the change marked
 * — and how far, how long and what it costs above it. With the radio off, because a traveller at
 * a kerb in Karama may have no data at all; a hand-off to another map app failed exactly there.
 *
 * Every option जाना offers can be drawn: the chips swap the line. The taxi is the straight line
 * between the pins, dashed, because its road is the driver's and not ours to predict.
 */
export function MapScreen({
  placeId,
  hotel,
}: {
  readonly placeId: string;
  readonly hotel: SavedHotel | undefined;
}) {
  const { t, locale, theme, online } = useSettings();
  const network = useTransportNetwork();
  const origin = useOrigin(hotel);
  const destination = placeById(placeId);
  const status = useMapStatus();
  const [chosen, setChosen] = useState<RouteOptionId | undefined>(undefined);
  const holder = useRef<HTMLDivElement>(null);
  const view = useRef<MapView | null>(null);

  useEffect(() => {
    if (!destination) navigate({ screen: 'go' });
  }, [destination]);
  useEffect(() => {
    if (origin.kind === 'none')
      navigate(origin.denied ? { screen: 'nolocation' } : { screen: 'options', placeId });
  }, [origin, placeId]);
  useEffect(() => {
    void ensureMap();
  }, [online]);

  const from: LatLng | undefined =
    origin.kind === 'asking' || origin.kind === 'none' ? undefined : origin.at;
  const options = useMemo(() => {
    if (!network || !destination || from === undefined) return [];
    return planRoutes(network, from, destination, currentFares());
  }, [network, destination, from]);
  const option =
    options.find((candidate) => candidate.id === chosen) ??
    options.find((candidate) => candidate.id !== 'taxi') ??
    options[0];

  // Where the streets come from: the phone's copy, our server while it downloads, or none at all
  // offline before it has arrived — then the journey is drawn on a plain ground, still to scale.
  const streets: Basemap['kind'] | null =
    status.kind === 'checking'
      ? null
      : status.kind === 'kept'
        ? 'phone'
        : online
          ? 'server'
          : 'none';
  const archive = status.kind === 'kept' ? status.archive : null;
  const shape = useMemo(() => {
    if (!option || !network || !destination || from === undefined) return null;
    const byId = new Map(network.nodes.map((node) => [node.id, node.location]));
    return routeShape(option.route.legs, from, destination.location, (id) =>
      id === ORIGIN_NODE_ID
        ? from
        : id === DESTINATION_NODE_ID
          ? destination.location
          : byId.get(id),
    );
  }, [option, network, destination, from]);
  const latestShape = useRef<RouteShape | null>(null);
  latestShape.current = shape;

  useEffect(() => {
    const element = holder.current;
    if (!element || streets === null) return;
    const basemap: Basemap =
      streets === 'phone' && archive !== null
        ? { kind: 'phone', archive }
        : { kind: streets === 'phone' ? 'none' : streets };
    let live = true;
    void import('./mapView.js').then(({ createMapView }) => {
      if (!live) return;
      view.current = createMapView(element, basemap, theme === 'dark');
      if (latestShape.current) view.current.showRoute(latestShape.current);
    });
    return () => {
      live = false;
      view.current?.destroy();
      view.current = null;
    };
  }, [streets, archive, theme]);

  useEffect(() => {
    if (shape) view.current?.showRoute(shape);
  }, [shape]);

  if (!destination) return null;
  const place = localName(destination.name, locale);
  const originName =
    origin.kind === 'hotel'
      ? (hotel?.name ?? t('options.from'))
      : origin.kind === 'virtual'
        ? VIRTUAL_HERE_NAME[locale]
        : t('steps.here');
  const words: Words | null = network ? { t, locale, network, destination } : null;

  return (
    <>
      <ScreenHeader
        pillar={placeId.startsWith('outlet:') ? 'food' : 'go'}
        trail={`${place} › ${t('map.title')}`}
      />
      <div className="flow map-flow">
        {words && option ? (
          <>
            <div className="map-modes" role="group" aria-label={t('map.ways')}>
              {options.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  className={candidate.id === option.id ? 'map-mode map-mode-on' : 'map-mode'}
                  aria-pressed={candidate.id === option.id}
                  onClick={() => {
                    setChosen(candidate.id);
                  }}
                >
                  <Icon name={modeIcon(candidate.mode)} size={18} strokeWidth={1.9} />
                  {modeLabel(words, candidate.mode)}
                </button>
              ))}
            </div>
            <p className="map-summary">
              <strong>{distanceLabel(t, option.distanceM / 1000)}</strong>
              <span>{minutes(words, option.route.totalDurationSeconds)}</span>
              <span>{fareText(words, option)}</span>
            </p>
            <p className="map-ends">
              <span className="map-dot map-dot-start" aria-hidden="true" />
              {originName}
              <span className="map-dot map-dot-end" aria-hidden="true" />
              {place}
            </p>
          </>
        ) : (
          <p className="muted center">{t('options.planning')}</p>
        )}

        <div ref={holder} className="map-view" />
        <MapNote status={status} online={online} />

        <button
          type="button"
          className="btn btn-go"
          disabled={!option}
          onClick={() => {
            if (!option) return;
            navigate(
              option.id === 'taxi'
                ? { screen: 'taxi', placeId }
                : { screen: 'steps', placeId, optionId: option.id },
            );
          }}
        >
          <Icon name="signpost" size={20} strokeWidth={1.9} />
          {t('map.steps')}
        </button>
      </div>
    </>
  );
}

/** One line under the map saying where its streets stand — never silent, never a spinner. */
function MapNote({ status, online }: { readonly status: MapStatus; readonly online: boolean }) {
  const { t } = useSettings();
  if (status.kind === 'downloading') {
    const mb = (bytes: number): string => (bytes / 1_000_000).toFixed(0);
    return (
      <p className="muted small">
        {t('map.downloading', { done: mb(status.done), total: mb(status.total) })}
      </p>
    );
  }
  if (status.kind === 'failed') {
    return (
      <p className="trouble">
        {t('map.failed', { why: status.why })}{' '}
        <button
          type="button"
          className="linkish"
          onClick={() => {
            void ensureMap();
          }}
        >
          {t('map.retry')}
        </button>
      </p>
    );
  }
  if (status.kind === 'absent' && !online) {
    return <p className="muted small">{t('map.notYet')}</p>;
  }
  return null;
}
