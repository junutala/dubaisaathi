import type { ReactNode } from 'react';

/** The icon set from the screens, as components. Stroke-based, 24px grid, one style. */
export type IconName =
  | 'mic'
  | 'home'
  | 'route'
  | 'food'
  | 'talk'
  | 'info'
  | 'speak'
  | 'left'
  | 'right'
  | 'moon'
  | 'wifi'
  | 'wifioff'
  | 'language'
  | 'camera'
  | 'pin'
  | 'plus'
  | 'phone'
  | 'doc'
  | 'check';

/**
 * The shapes themselves, not path strings: the four tile icons are drawn with rects, lines and
 * filled dots as well as paths, and the old ' M'-splitting trick could only express paths. The
 * artwork is the same as `design/generate-screens.py` so the artboards and the app agree.
 *
 * Everything inherits `currentColor`, which is what lets one icon be the marigold on a home tile,
 * the muted grey in the bar, and the accent in a crumb — in either theme.
 */
const SHAPES: Record<IconName, ReactNode> = {
  // रास्ता
  route: (
    <>
      <rect x="4" y="3" width="16" height="13" rx="3" />
      <line x1="4" y1="10" x2="20" y2="10" />
      <circle cx="8" cy="13" r="1" fill="currentColor" />
      <circle cx="16" cy="13" r="1" fill="currentColor" />
      <line x1="6" y1="20" x2="9" y2="16" />
      <line x1="18" y1="20" x2="15" y2="16" />
      <line x1="4" y1="20" x2="20" y2="20" />
    </>
  ),
  // खाना
  food: (
    <>
      <path d="M6 7h12l-1.8 13.2a2 2 0 0 1-2 1.8H9.8a2 2 0 0 1-2-1.8L6 7z" />
      <line x1="10" y1="10" x2="9.5" y2="19" />
      <line x1="14" y1="10" x2="14.5" y2="19" />
      <line x1="6.5" y1="10" x2="17.5" y2="10" />
      <path d="M9 4c0-1 1-1.5 1-2.5" />
      <path d="M14 4c0-1 1-1.5 1-2.5" />
    </>
  ),
  // बोलना
  talk: (
    <>
      <path d="M4 14v-7a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v1" />
      <path d="M4 10l-2 3v-3H4z" />
      <rect x="9" y="8" width="12" height="9" rx="2.5" />
      <path d="M19 17v3l-3-3" />
      <line x1="12" y1="12.5" x2="14" y2="12.5" />
      <line x1="16" y1="12.5" x2="18" y2="12.5" />
    </>
  ),
  // ज़रूरी जानकारी — a booklet with a shield, never a medical cross: this tile holds the
  // traveller's own papers, and a cross would promise a hospital the product does not have
  // (decision 002).
  info: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <line x1="8" y1="3" x2="8" y2="21" />
      <line x1="11" y1="7" x2="16" y2="7" />
      <line x1="11" y1="10" x2="14" y2="10" />
      <path d="M11 13.5v2.5c0 1.5 1.5 2.5 2.5 3 1-.5 2.5-1.5 2.5-3v-2.5l-2.5-1-2.5 1z" />
    </>
  ),
  mic: (
    <>
      <path d="M12 4.5a2.8 2.8 0 0 1 2.8 2.8v4a2.8 2.8 0 0 1-5.6 0v-4A2.8 2.8 0 0 1 12 4.5Z" />
      <path d="M5.8 11.4a6.2 6.2 0 0 0 12.4 0" />
      <path d="M12 17.8v2.7" />
    </>
  ),
  home: (
    <>
      <path d="M4 10.6 12 4.2l8 6.4" />
      <path d="M6.2 9.8v9.9h11.6V9.8" />
    </>
  ),
  speak: (
    <>
      <path d="M5 10v4h3l4 3.4V6.6L8 10H5Z" />
      <path d="M15.4 9.6a3.4 3.4 0 0 1 0 4.8" />
      <path d="M17.9 7.2a6.8 6.8 0 0 1 0 9.6" />
    </>
  ),
  left: (
    <>
      <path d="M14.4 5.8 8.6 12l5.8 6.2" />
    </>
  ),
  right: (
    <>
      <path d="M9.6 5.8 15.4 12l-5.8 6.2" />
    </>
  ),
  moon: (
    <>
      <path d="M19.2 14.6A7.6 7.6 0 0 1 9.4 4.8a7.6 7.6 0 1 0 9.8 9.8Z" />
    </>
  ),
  wifi: (
    <>
      <path d="M4 8.8a12.6 12.6 0 0 1 16 0" />
      <path d="M7.2 12.2a8.8 8.8 0 0 1 9.6 0" />
      <path d="M10.2 15.4a4.4 4.4 0 0 1 3.6 0" />
      <path d="M11.9 18h.2" />
    </>
  ),
  wifioff: (
    <>
      <path d="M4 8.4a12.6 12.6 0 0 1 5.6-2.3" />
      <path d="M14.8 6.3A12.6 12.6 0 0 1 20 8.4" />
      <path d="M7.2 11.9a8.8 8.8 0 0 1 2.6-1.5" />
      <path d="M16.8 11.9a8.8 8.8 0 0 0-1.8-1.1" />
      <path d="M11.9 17.6h.1" />
      <path d="M4.2 4.2l15.6 15.6" />
    </>
  ),
  // ज़रूरी जानकारी's own four, plus the tick that marks the on-this-phone promise. Nothing
  // here is a cross, and nothing here is red (design rule 16a).
  camera: (
    <>
      <path d="M4.2 8.6a1.8 1.8 0 0 1 1.8-1.8h2.2l1.3-2h5l1.3 2H18a1.8 1.8 0 0 1 1.8 1.8v8.2a1.8 1.8 0 0 1-1.8 1.8H6a1.8 1.8 0 0 1-1.8-1.8V8.6Z" />
      <circle cx="12" cy="12.6" r="3.2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 20.2s6.2-5.4 6.2-9.7a6.2 6.2 0 0 0-12.4 0c0 4.3 6.2 9.7 6.2 9.7Z" />
      <circle cx="12" cy="10.5" r="2.2" />
    </>
  ),
  plus: (
    <>
      <path d="M12 6.2v11.6" />
      <path d="M6.2 12h11.6" />
    </>
  ),
  phone: (
    <>
      <path d="M6.6 4.6h3.2l1.5 3.9-2.1 1.5a9.2 9.2 0 0 0 4.8 4.8l1.5-2.1 3.9 1.5v3.2c0 1-.9 1.8-1.9 1.7C11.2 18.9 5.1 12.8 4.9 6.5 4.8 5.5 5.6 4.6 6.6 4.6Z" />
    </>
  ),
  doc: (
    <>
      <path d="M7 3.8h6.6L18 8.2v10.4a1.6 1.6 0 0 1-1.6 1.6H7a1.6 1.6 0 0 1-1.6-1.6V5.4A1.6 1.6 0 0 1 7 3.8Z" />
      <path d="M13.4 3.8v4.6H18" />
      <path d="M8.6 12.4h6.8" />
      <path d="M8.6 15.6h6.8" />
    </>
  ),
  check: (
    <>
      <path d="M5.2 12.6 9.6 17 18.8 7.2" />
    </>
  ),
  language: (
    <>
      <path d="M4.5 7h9" />
      <path d="M9 5v2" />
      <path d="M11 7c0 4-3 7-6.5 8" />
      <path d="M7 11.5c1 1.8 3 3.2 5.5 3.8" />
      <path d="M13 19.5l3.6-9 3.6 9" />
      <path d="M14.4 16.6h4.4" />
    </>
  ),
};
interface IconProps {
  readonly name: IconName;
  readonly size?: number;
  readonly strokeWidth?: number;
  readonly color?: string;
}

export function Icon({ name, size = 24, strokeWidth = 1.7, color = 'currentColor' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      // The colour is set as the CSS `color` property, not the stroke attribute, because some
      // shapes are filled with `currentColor` — the train's headlights, for one. Setting only
      // `stroke` would leave those resolving to the surrounding text colour instead.
      style={{ color }}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {SHAPES[name]}
    </svg>
  );
}
