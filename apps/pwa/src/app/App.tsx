import { useCallback, useEffect, useState } from 'react';
import type { ParsedIntent } from '@saathi/shared';
import { href, navigate, parseRoute, type Route } from './routes.js';
import { StatusStrip } from './shell/StatusStrip.js';
import type { Tile } from './shell/ScreenHeader.js';
import { HomeScreen } from '../features/home/HomeScreen.js';
import { FoodListScreen } from '../features/food/index.js';
import { PassScreen } from '../features/pass/PassScreen.js';
import { LandingScreen } from '../features/landing/LandingScreen.js';
import { noteLocationReading, validity } from '../features/pass/entitlement.js';
import { currentLocation } from '../lib/location.js';
import { SayEntryScreen } from '../features/phrases/SayEntryScreen.js';
import { ArabicScreen } from '../features/phrases/ArabicScreen.js';
import { ShowDriverScreen } from '../features/phrases/ShowDriverScreen.js';
import {
  DocumentAddScreen,
  DocumentScreen,
  HotelAddScreen,
  InfoHomeScreen,
} from '../features/info/index.js';
import { ListenScreen } from '../features/voice/ListenScreen.js';
import {
  LocationDeniedScreen,
  RouteOptionsScreen,
  RouteStepsScreen,
  TransportScreen,
} from '../features/transport/index.js';
import { landingHref } from '../features/voice/micRouting.js';

/** Which tile's mic was tapped, so 1.2 shows the crumb of where the traveller came from. */
function tileOf(route: Route): Tile {
  switch (route.screen) {
    case 'say':
    case 'arabic':
    case 'driver':
      return 'talk';
    case 'info':
    case 'hotelAdd':
    case 'docAdd':
    case 'docView':
      return 'info';
    case 'food':
      return 'food';
    case 'pass':
      return 'home';
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

/**
 * The landing page is shown once, on the first open, and never again — it is where the whole
 * offline pack comes down (owner's instruction, 14 September). Recorded in localStorage rather
 * than in the database because it is read before the first paint.
 */
const STARTED_KEY = 'saathi.started';

export function App() {
  const [started, setStarted] = useState(() => {
    try {
      return localStorage.getItem(STARTED_KEY) !== null;
    } catch {
      // Private mode: better to show the app than to trap someone on a landing page for ever.
      return true;
    }
  });
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

  /**
   * The counter, recomputed on a minute's tick. It is the money on every screen, so it may not
   * be a value captured once at boot that quietly goes stale over an afternoon.
   */
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => {
      setClock(Date.now());
    }, 60_000);
    return () => {
      clearInterval(tick);
    };
  }, []);

  /**
   * Has this phone arrived? Asked on every boot and on every tick, from whatever fix the app
   * already holds — never by waking the GPS, and never concluded from a single reading.
   */
  useEffect(() => {
    const here = currentLocation();
    noteLocationReading(here.kind === 'here' ? here.at : undefined);
  }, [clock]);

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

  if (!started) {
    return (
      <div className="screen">
        <LandingScreen
          onReady={() => {
            try {
              localStorage.setItem(STARTED_KEY, new Date().toISOString());
            } catch {
              /* it will simply be shown once more */
            }
            setStarted(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="screen">
      <StatusStrip validity={validity(new Date(clock))} />
      {route.screen === 'home' && <HomeScreen />}
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
      {route.screen === 'info' && <InfoHomeScreen onMic={onMic} heard={banner} />}
      {route.screen === 'hotelAdd' && <HotelAddScreen onMic={onMic} />}
      {route.screen === 'docAdd' && <DocumentAddScreen onMic={onMic} />}
      {route.screen === 'docView' && <DocumentScreen docId={route.docId} />}
      {route.screen === 'food' && <FoodListScreen onMic={onMic} heard={banner} />}
      {route.screen === 'pass' && <PassScreen onMic={onMic} />}
    </div>
  );
}
