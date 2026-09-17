import { useId } from 'react';

/**
 * The same mark the traveller's app uses, drawn inline for the same reason: a collector works in
 * basements and back alleys where the signal goes, and a logo fetched over HTTP is a logo that is
 * missing exactly then.
 *
 * The squircle and drop shadow of `design/icons/Logo.svg` are left out — at this size they are a
 * cream box with a smudge under it.
 */
export function Logo({ size = 26 }: { readonly size?: number }) {
  const raw = useId();
  const pin = `pin${raw.replace(/:/g, '')}`;
  return (
    <svg
      width={(size * 320) / 388}
      height={size}
      viewBox="96 60 320 388"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={pin} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF9100" />
          <stop offset="60%" stopColor="#E65100" />
          <stop offset="100%" stopColor="#BF360C" />
        </linearGradient>
      </defs>
      <path
        d="M 256 60 C 160 60, 96 132, 96 226 C 96 324, 230 424, 256 448 C 282 424, 416 324, 416 226 C 416 132, 352 60, 256 60 Z"
        fill={`url(#${pin})`}
      />
      <path
        d="M 315 150 C 230 140, 180 180, 180 225 C 180 260, 215 275, 256 280 C 210 270, 210 215, 265 200 C 305 190, 325 170, 315 150 Z"
        fill="#FFFDF9"
      />
      <path
        d="M 197 342 C 282 352, 332 312, 332 267 C 332 232, 297 217, 256 212 C 302 222, 302 277, 247 292 C 207 302, 187 322, 197 342 Z"
        fill="#FFFDF9"
      />
      <circle cx="285" cy="175" r="9" fill="#FFFDF9" />
    </svg>
  );
}

/**
 * The other half of the lockup: the name, in the one typeface that is only ever the name, with
 * the flight trail arcing over its second half and the aeroplane at the end of it.
 *
 * "Dubaisaathi" is one word with one capital, and it is the same word in Hindi — a logo is not
 * translated (decision 021). The three pillar names stay in Devanagari; this is not one of them.
 *
 * The trail is drawn here for the same reason the pin is: a mark fetched over HTTP is a mark
 * that is missing exactly when the app is proving its point. The face is `Quicksand Wordmark`,
 * Quicksand Bold cut down to the eight letters this word needs and shipped with the app —
 * 1.2 kB, which is what makes real type affordable where a whole family would not be.
 *
 * The geometry is in ems, so one rule serves the 22px strip and the 40px landing page alike:
 * the word is 5.76em wide in this face, so a box 3.4em wide pinned to its right edge sits over
 * "aathi" and no further left.
 */
export function Wordmark({ name }: { readonly name: string }) {
  return (
    <span className="wordmark">
      {name}
      <svg className="wordmark-trail" viewBox="0 -4 340 76" aria-hidden="true" focusable="false">
        <path
          className="wordmark-trail-line"
          d="M4 66C92 63 172 55 268 28"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          className="wordmark-plane"
          transform="translate(300 18) rotate(72) scale(1.5) translate(-12 -12)"
          d="M12 1.4c1.06 0 1.92.94 1.92 2.1v5.62l8.08 4.98v2.1l-8.08-2.48v4.56l2.16 1.6v1.52L12 20.6l-4.08.8v-1.52l2.16-1.6v-4.56L2 16.2v-2.1l8.08-4.98V3.5c0-1.16.86-2.1 1.92-2.1z"
        />
      </svg>
    </span>
  );
}
