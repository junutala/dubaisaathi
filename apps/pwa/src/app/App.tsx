import { useCallback, useEffect, useState } from 'react';
import { parseRoute, type Route } from './routes.js';
import { StatusStrip, type Validity } from './shell/StatusStrip.js';
import { HomeScreen } from '../features/home/HomeScreen.js';
import { SoonScreen } from '../features/home/SoonScreen.js';
import { SayEntryScreen } from '../features/phrases/SayEntryScreen.js';
import { ArabicScreen } from '../features/phrases/ArabicScreen.js';
import { ShowDriverScreen } from '../features/phrases/ShowDriverScreen.js';
import { recordVoiceEvent } from '../features/voice/voiceEvent.js';

/**
 * Until the speech spike lands, the counter is a placeholder: the trial state a tourist sees
 * on their free day. The real value comes from the Counter Off Time on the device.
 */
const PLACEHOLDER_VALIDITY: Validity = { state: 'trial', percent: 76, hours: 18 };

export function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const update = () => {
      setRoute(parseRoute(window.location.hash));
    };
    window.addEventListener('hashchange', update);
    return () => {
      window.removeEventListener('hashchange', update);
    };
  }, []);

  /**
   * The mic has no engine yet — the spike decides which one. Until then every tap is recorded
   * as an unmet request, which is exactly the data the learning loop wants: how often someone
   * reaches for voice, and from which screen.
   */
  const onMic = useCallback(() => {
    void recordVoiceEvent({
      transcript: '',
      intent: 'unknown',
      confidence: 0,
      landedOn: route.screen,
      failure: 'unknown-intent',
    });
  }, [route.screen]);

  return (
    <div className="screen">
      <StatusStrip validity={PLACEHOLDER_VALIDITY} />
      {route.screen === 'home' && <HomeScreen onMic={onMic} />}
      {route.screen === 'say' && <SayEntryScreen onMic={onMic} />}
      {route.screen === 'arabic' && <ArabicScreen phraseId={route.phraseId} onMic={onMic} />}
      {route.screen === 'driver' && <ShowDriverScreen phraseId={route.phraseId} />}
      {route.screen === 'soon' && <SoonScreen tile={route.tile} onMic={onMic} />}
    </div>
  );
}
