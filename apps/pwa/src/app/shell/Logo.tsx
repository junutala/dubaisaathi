import { useId } from 'react';

/**
 * The mark, on screen rather than only on the home-screen icon.
 *
 * `design/icons/Logo.svg` has existed since the start and was referenced by nothing: it shipped
 * as the installed app's icon and appeared nowhere inside the app. So a traveller who opened
 * Saathi saw a name once, on the landing page, and never again — four screens of an unnamed
 * product, with no way to tell what it was or who made it. An app that cannot introduce itself
 * cannot be recommended to anyone either.
 *
 * Drawn inline rather than loaded from a file, like every other icon here, because identity has
 * to survive the thing this product is for: a phone with no network. A logo fetched over HTTP is
 * a logo that is missing exactly when the app is proving its point.
 *
 * The squircle and the drop shadow belong to the icon file and are dropped here — at 26px they
 * are a cream box with a smudge under it. What is left is the mark itself: the pin, the two
 * crescents of the saathi, and the voice dot.
 */
export function Logo({ size = 26 }: { readonly size?: number }) {
  // Gradient ids are global to the document, so two marks on one screen would fight over them.
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
export function Wordmark({
  name,
  trail = false,
}: {
  readonly name: string;
  readonly trail?: boolean;
}) {
  return (
    <span className={trail ? 'wordmark wordmark-full' : 'wordmark'}>
      {name}
      {trail && (
        <svg className="wordmark-trail" viewBox="0 0 260 62" aria-hidden="true" focusable="false">
          {/* A filled crescent, not a stroke: a vapour trail is widest behind the aircraft and
              dissipates to nothing, and a constant-width line reads as a wire instead. The two
              curves meet at a point on the left, which is the whole effect. */}
          <path
            className="wordmark-trail-line"
            d="M232 9C186 14 112 27 14 47C118 37 190 21 232 14Z"
          />
          {/* A paper plane rather than the aeroplane-mode glyph, which at this size is a speck.
              Two triangles: the body, and the darker fold under the near wing. */}
          <g className="wordmark-plane" transform="translate(222 0) rotate(-12) scale(0.78)">
            <path d="M1 12.4 34 1 23.6 24.6 15.6 15.7Z" />
            <path className="wordmark-plane-fold" d="M15.6 15.7 23.6 24.6 14.7 23.1Z" />
          </g>
        </svg>
      )}
    </span>
  );
}
