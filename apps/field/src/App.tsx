import { useState } from 'react';
import { CaptureScreen, WhoAreYou } from './CaptureScreen.js';
import { PinScreen } from './PinScreen.js';
import { collectorName } from './collector.js';
import { useStrings } from './strings.js';

/**
 * Two screens in one app, and one flow through them (decision 029).
 *
 * Every capture starts at the door, on the pin: a number to copy onto the paper, a photograph if
 * the camera can be raised, a tick. What happens next is the only difference between the two
 * people who use this. A rider drops fifty forms and never sees the long form at all. The owner,
 * who carries blank forms and fills one the moment he sees an Indian kitchen, taps "fill this one
 * in now" and lands in the long form with that pin already chosen — same screens, same pin,
 * whether he finishes on the pavement or at a desk that night.
 *
 * The switch is deliberately small and unlabelled-by-words: it is set once, by whoever hands
 * the phone over, and after that it is furniture. A hand-off does not touch it — the phone still
 * opens tomorrow on whichever screen its owner works from.
 */

const MODE_KEY = 'saathi.fieldMode';
type Mode = 'full' | 'pin';

function storedMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === 'pin' ? 'pin' : 'full';
  } catch {
    return 'full';
  }
}

export function App() {
  const [who, setWho] = useState<string | null>(() => collectorName());
  const [mode, setMode] = useState<Mode>(storedMode);
  /** A pin just dropped, carried into the long form so nothing about the door is asked twice. */
  const [handoff, setHandoff] = useState<string | null>(null);
  const { t } = useStrings();

  if (who === null) return <WhoAreYou onName={setWho} />;

  const choose = (next: Mode) => {
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      /* the phone will open on the other one tomorrow, which is survivable */
    }
  };

  return (
    <>
      <div className="mode">
        <button
          type="button"
          className={mode === 'full' ? 'mode-btn mode-btn-on' : 'mode-btn'}
          onClick={() => {
            choose('full');
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 3.5h7.5L18.5 8.5V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5z" />
            <path d="M13.5 3.5v5h5" />
            <path d="M8 12.5h8" />
            <path d="M8 16h5" />
          </svg>
          <span>{t('modeForm')}</span>
        </button>
        <button
          type="button"
          className={mode === 'pin' ? 'mode-btn mode-btn-on' : 'mode-btn'}
          onClick={() => {
            choose('pin');
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 21.5s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" />
            <circle cx="12" cy="10.5" r="2.4" />
          </svg>
          <span>{t('modePin')}</span>
        </button>
      </div>
      {mode === 'pin' ? (
        <PinScreen
          onFillIn={(pinId) => {
            setHandoff(pinId);
            // Not `choose`: the hand-off moves this visit on, it does not change which screen
            // this phone belongs to.
            setMode('full');
          }}
        />
      ) : (
        <CaptureScreen
          startWith={handoff}
          onStarted={() => {
            setHandoff(null);
          }}
        />
      )}
    </>
  );
}
