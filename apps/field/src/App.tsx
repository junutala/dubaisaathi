import { useState } from 'react';
import { CaptureScreen, WhoAreYou } from './CaptureScreen.js';
import { PinScreen } from './PinScreen.js';
import { collectorName } from './collector.js';

/**
 * Two tools in one app, because they are two jobs done by two people (decision 029).
 *
 * The long form is a collector's: forty fields, asked standing in the kitchen. The pin is a
 * rider's: a number, a photograph, a tick, fifty times in an afternoon. The mode is remembered
 * on the phone, so the rider's phone opens where it left off and he never has to choose.
 *
 * The switch is deliberately small and unlabelled-by-words: it is set once, by whoever hands
 * the phone over, and after that it is furniture.
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
          aria-label="Full form"
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
        </button>
        <button
          type="button"
          className={mode === 'pin' ? 'mode-btn mode-btn-on' : 'mode-btn'}
          aria-label="Form pin"
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
        </button>
      </div>
      {mode === 'pin' ? <PinScreen /> : <CaptureScreen />}
    </>
  );
}
