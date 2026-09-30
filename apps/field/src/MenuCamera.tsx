import { useEffect, useRef, useState } from 'react';
import { fitWithin, MENU, shrink } from './shrink.js';
import { useStrings } from './strings.js';

/**
 * The menu camera (the owner, 30 September): a card of forty pages used to be forty trips — open
 * the phone's camera, shoot, come back to the form, press again. Now the camera stays open inside
 * the app. अगला takes the page and stays for the next; जमा करें takes the last page and closes;
 * हो गया closes without taking another, for when the last page is already in.
 *
 * The phone is asked for its camera and answers for itself (CLAUDE.md: never decide a phone cannot
 * until it has refused). When it refuses — no permission, an insecure origin, a browser without the
 * API — the screen says what it said and offers the phone's own camera one page at a time, the way
 * every page was taken before, so a refusal never ends the visit.
 */
export function MenuCamera({
  taken,
  max,
  onShot,
  onClose,
}: {
  /** Pages already on this menu, so the count on the screen carries on from them. */
  readonly taken: number;
  readonly max: number;
  /** A page, or one still being shrunk: the caller waits for it before it saves anything. */
  readonly onShot: (page: Blob | Promise<Blob>) => void;
  readonly onClose: () => void;
}) {
  const { t } = useStrings();
  const video = useRef<HTMLVideoElement>(null);
  const [live, setLive] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const full = taken >= max;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    // Asked, not checked: `mediaDevices` is missing on an insecure origin, and that is the answer.
    const ask =
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- lib.dom overstates support: absent on an insecure origin
      typeof navigator.mediaDevices?.getUserMedia === 'function'
        ? navigator.mediaDevices.getUserMedia({
            audio: false,
            // The biggest picture the back camera gives; a menu's small print needs every pixel.
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 4096 },
              height: { ideal: 3072 },
            },
          })
        : Promise.reject(new Error('this browser gives no camera to a page'));
    ask.then(
      (got) => {
        if (stopped) {
          got.getTracks().forEach((track) => {
            track.stop();
          });
          return;
        }
        stream = got;
        const element = video.current;
        if (element === null) return;
        element.srcObject = got;
        void element.play().then(
          () => {
            setLive(true);
          },
          () => {
            setLive(true);
          },
        );
      },
      (error: unknown) => {
        if (!stopped) setRefused(error instanceof Error ? error.message : String(error));
      },
    );
    return () => {
      stopped = true;
      stream?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, []);

  /** The frame on the screen now, as a menu page: the same size and quality as every other page. */
  function capture(): Promise<Blob | null> {
    const element = video.current;
    if (element === null || element.videoWidth === 0) return Promise.resolve(null);
    const size = fitWithin(element.videoWidth, element.videoHeight, MENU.edge);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    canvas.getContext('2d')?.drawImage(element, 0, 0, size.width, size.height);
    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', MENU.quality);
    });
  }

  async function shoot(thenClose: boolean) {
    if (!full) {
      const page = await capture();
      if (page !== null) {
        onShot(page);
        setFlash(true);
        window.setTimeout(() => {
          setFlash(false);
        }, 180);
      }
    }
    if (thenClose) onClose();
  }

  return (
    <div className="cam">
      <div className="cam-top">
        <b className="cam-count">{t('camCount', { n: taken, max })}</b>
        <button type="button" className="cam-done" onClick={onClose}>
          {t('camDone')}
        </button>
      </div>

      {refused === null ? (
        <video
          ref={video}
          className={flash ? 'cam-view cam-flash' : 'cam-view'}
          playsInline
          muted
          autoPlay
        />
      ) : (
        <div className="cam-refused">
          <p>{t('camRefused', { why: refused })}</p>
          <label className="cam-fallback">
            {t('camFallback')}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={full}
              onChange={(e) => {
                const file = e.target.files?.[0];
                // Cleared so the phone's camera opens again at once for the next page.
                e.target.value = '';
                if (file === undefined) return;
                onShot(shrink(file, MENU));
              }}
            />
          </label>
        </div>
      )}

      {refused === null && (
        <div className="cam-bar">
          <button
            type="button"
            className="cam-next"
            disabled={!live || full}
            onClick={() => void shoot(false)}
          >
            {t('camNext')}
          </button>
          <button
            type="button"
            className="cam-submit"
            disabled={!live}
            onClick={() => void shoot(true)}
          >
            {t('camSubmit')}
          </button>
        </div>
      )}
    </div>
  );
}
