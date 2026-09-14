import { useCallback, useEffect, useState } from 'react';
import type { ParsedIntent } from '@saathi/shared';
import { href, navigate, parseRoute, type Route } from './routes.js';
import { StatusStrip, type Validity } from './shell/StatusStrip.js';
import type { Tile } from './shell/ScreenHeader.js';
import { HomeScreen } from '../features/home/HomeScreen.js';
import { SoonScreen } from '../features/home/SoonScreen.js';
import { SayEntryScreen } from '../features/phrases/SayEntryScreen.js';
import { ArabicScreen } from '../features/phrases/ArabicScreen.js';
import { ShowDriverScreen } from '../features/phrases/ShowDriverScreen.js';
import { ListenScreen } from '../features/voice/ListenScreen.js';
import {
  LocationDeniedScreen,
  RouteOptionsScreen,
  RouteStepsScreen,
  TransportScreen,
} from '../features/transport/index.js';
import { landingHref } from '../features/voice/micRouting.js';

/**
 * Until the spike lands, the counter is a placeholder: the trial state a tourist sees on their
 * free day. The real value comes from the Counter Off Time on the device.
 */
const PLACEHOLDER_VALIDITY: Validity = { state: 'trial', percent: 76, hours: 18 };

/** Which tile's mic was tapped, so 1.2 shows the crumb of where the traveller came from. */
function tileOf(route: Route): Tile {
  switch (route.screen) {
    case 'say':
    case 'arabic':
    case 'driver':
      return 'talk';
    case 'soon':
      return route.tile;
    case 'transport':
    case 'nolocation':
    case 'options':
    case 'steps':
      return 'transport';
    case 'listen':
      return route.from;
    case 'home':
      return 'home';
  }
}

export function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  /**
   * What the mic understood, and which screen it sent them to. Kept together so "आपने कहा: …"
   * shows on that screen and nowhere else — navigating anywhere else hides it without anyone
   * having to remember to clear it.
   */
  const [heard, setHeard] = useState<{ intent: ParsedIntent; at: string } | null>(null);

  useEffect(() => {
    const update = () => {
      setRoute(parseRoute(window.location.hash));
    };
    window.addEventListener('hashchange', update);
    return () => {
      window.removeEventListener('hashchange', update);
    };
  }, []);

  const onHeard = useCallback((intent: ParsedIntent) => {
    const at = landingHref(intent);
    setHeard(at === null ? null : { intent, at });
  }, []);

  // The mic is the same thing everywhere: it opens 1.2, carrying the tile it was tapped from.
  const onMic = useCallback(() => {
    navigate({ screen: 'listen', from: tileOf(parseRoute(window.location.hash)) });
  }, []);

  const banner = heard?.at === href(route) ? heard.intent : undefined;
  /**
   * The mic lands on 1.1, because a destination is two questions and the traveller answers one
   * of them by tapping (decision 014). The words follow them one screen further on, so 1.3 can
   * still show "आपने कहा: …" — that is the field the ledger asks for on 1.3, and it is the one
   * check worth making before committing to a route.
   */
  const carried =
    route.screen === 'options' && heard?.intent.destination?.placeId === route.placeId
      ? heard.intent
      : undefined;

  return (
    <div className="screen">
      <StatusStrip validity={PLACEHOLDER_VALIDITY} />
      {route.screen === 'home' && <HomeScreen onMic={onMic} onHeard={onHeard} />}
      {route.screen === 'listen' && (
        <ListenScreen from={route.from} onHeard={onHeard} onMic={onMic} />
      )}
      {route.screen === 'say' && <SayEntryScreen onMic={onMic} heard={banner} />}
      {route.screen === 'arabic' && (
        <ArabicScreen phraseId={route.phraseId} onMic={onMic} heard={banner} />
      )}
      {route.screen === 'driver' && <ShowDriverScreen phraseId={route.phraseId} />}
      {route.screen === 'transport' && (
        <TransportScreen placeId={route.placeId} onMic={onMic} heard={banner} />
      )}
      {route.screen === 'nolocation' && <LocationDeniedScreen onMic={onMic} />}
      {route.screen === 'options' && (
        <RouteOptionsScreen placeId={route.placeId} onMic={onMic} heard={carried} />
      )}
      {route.screen === 'steps' && (
        <RouteStepsScreen placeId={route.placeId} optionId={route.optionId} onMic={onMic} />
      )}
      {route.screen === 'soon' && <SoonScreen tile={route.tile} onMic={onMic} heard={banner} />}
    </div>
  );
}
