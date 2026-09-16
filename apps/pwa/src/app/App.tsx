import { useEffect, useState } from 'react';
import { parseRoute, pillarOf, type Route } from './routes.js';
import { applyUpdateIfIdle } from './updates.js';
import { TopStrip } from './shell/TopStrip.js';
import { TabBar } from './shell/TabBar.js';
import { HomeScreen } from '../features/home/HomeScreen.js';
import { FoodListScreen, MenuScreen, OutletScreen } from '../features/food/index.js';
import { PassScreen } from '../features/pass/PassScreen.js';
import { LandingScreen } from '../features/landing/LandingScreen.js';
import {
  canBuy,
  isGated,
  needsNudge,
  noteLocationReading,
  validity,
} from '../features/pass/entitlement.js';
import { currentLocation } from '../lib/location.js';
import {
  DocumentAddScreen,
  DocumentScreen,
  DocsScreen,
  HotelScreen,
  readHotel,
  watchHotel,
  type SavedHotel,
} from '../features/info/index.js';
import {
  GoScreen,
  LocationDeniedScreen,
  RouteOptionsScreen,
  RouteStepsScreen,
  TaxiScreen,
} from '../features/transport/index.js';
import { KnowScreen, PlaceScreen } from '../features/know/index.js';
import { navigate } from './routes.js';

/**
 * The landing page is shown once, on the first open, and never again. Recorded in localStorage
 * rather than in the database because it is read before the first paint.
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
  /** The hotel on the strip, read once and again whenever घर.1 saves. */
  const [hotel, setHotel] = useState<SavedHotel | undefined>(undefined);

  useEffect(() => {
    const update = () => {
      setRoute(parseRoute(window.location.hash));
    };
    window.addEventListener('hashchange', update);
    return () => {
      window.removeEventListener('hashchange', update);
    };
  }, []);

  useEffect(() => {
    let live = true;
    const refresh = () => {
      void readHotel().then((row) => {
        if (live) setHotel(row);
      });
    };
    refresh();
    const stop = watchHotel(refresh);
    return () => {
      live = false;
      stop();
    };
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
   * A build that arrived while the app was open is applied here, on घर, and nowhere else. घर
   * holds no typed sentence, no destination and no half-finished anything, so a reload costs the
   * traveller nothing; reading "never mid-trip" as "next launch only" is how a release that was
   * live on the server sat unseen on a phone for a day.
   */
  useEffect(() => {
    if (route.screen !== 'home') return;
    void applyUpdateIfIdle();
  }, [route.screen]);

  /**
   * Has this phone arrived? Asked on every boot and on every tick, from whatever fix the app
   * already holds — never by waking the GPS, and never concluded from a single reading.
   */
  useEffect(() => {
    const here = currentLocation();
    noteLocationReading(here.kind === 'here' ? here.at : undefined);
  }, [clock]);

  /**
   * The gate, checked only when a traveller enters a pillar — never on the tick, so a screen is
   * not taken away mid-task. The hotel and the documents are never behind it (rule 6), and
   * neither is anyone who has paid once (16 September).
   */
  useEffect(() => {
    const pillar = pillarOf(route);
    const behindTheGate = pillar === 'food' || pillar === 'go' || pillar === 'know';
    if (behindTheGate && isGated()) navigate({ screen: 'pass' });
  }, [route]);

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

  const now = new Date(clock);
  const state = validity(now);

  return (
    <div className="screen">
      <TopStrip validity={state} hotel={hotel} />
      <main className="body">
        {route.screen === 'home' && <HomeScreen validity={state} nudge={needsNudge(now)} />}
        {route.screen === 'hotel' && <HotelScreen hotel={hotel} />}
        {route.screen === 'docs' && <DocsScreen />}
        {route.screen === 'docAdd' && <DocumentAddScreen />}
        {route.screen === 'docView' && <DocumentScreen docId={route.docId} />}
        {route.screen === 'pass' && <PassScreen />}
        {route.screen === 'food' && <FoodListScreen dish={route.dish} hotel={hotel} />}
        {route.screen === 'outlet' && <OutletScreen outletId={route.outletId} hotel={hotel} />}
        {route.screen === 'menu' && <MenuScreen outletId={route.outletId} />}
        {route.screen === 'go' && <GoScreen placeId={route.placeId} />}
        {route.screen === 'options' && <RouteOptionsScreen placeId={route.placeId} hotel={hotel} />}
        {route.screen === 'steps' && (
          <RouteStepsScreen placeId={route.placeId} optionId={route.optionId} hotel={hotel} />
        )}
        {route.screen === 'taxi' && <TaxiScreen placeId={route.placeId} hotel={hotel} />}
        {route.screen === 'nolocation' && <LocationDeniedScreen hotel={hotel} />}
        {route.screen === 'know' && <KnowScreen />}
        {route.screen === 'place' && <PlaceScreen placeId={route.placeId} hotel={hotel} />}
      </main>
      <TabBar current={pillarOf(route)} canBuy={canBuy()} />
    </div>
  );
}
