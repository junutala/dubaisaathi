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
