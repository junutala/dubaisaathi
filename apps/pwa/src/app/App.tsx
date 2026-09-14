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
import {
  DocumentAddScreen,
  DocumentScreen,
  HotelAddScreen,
  InfoHomeScreen,
} from '../features/info/index.js';
import { ListenScreen } from '../features/voice/ListenScreen.js';
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
    case 'info':
    case 'hotelAdd':
    case 'docAdd':
    case 'docView':
      return 'info';
    case 'soon':
      return route.tile;
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
      {route.screen === 'info' && <InfoHomeScreen onMic={onMic} heard={banner} />}
      {route.screen === 'hotelAdd' && <HotelAddScreen onMic={onMic} />}
      {route.screen === 'docAdd' && <DocumentAddScreen onMic={onMic} />}
      {route.screen === 'docView' && <DocumentScreen docId={route.docId} />}
      {route.screen === 'soon' && <SoonScreen tile={route.tile} onMic={onMic} heard={banner} />}
    </div>
  );
}
