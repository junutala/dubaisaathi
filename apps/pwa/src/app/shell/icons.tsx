import type { ReactNode } from 'react';

/** The icon set from the screens, as components. Stroke-based, 24px grid, one style. */
export type IconName =
  // The three pillars and the documents, on the tiles, in the header and in the bar.
  | 'thali'
  | 'metro'
  | 'lantern'
  | 'docs'
  // Chrome
  | 'left'
  | 'right'
  | 'moon'
  | 'sun'
  | 'wifi'
  | 'wifioff'
  | 'language'
  | 'search'
  | 'plus'
  | 'check'
  | 'pin'
  | 'home'
  // जाना: the modes a journey is made of, and the taxi hand-off
  | 'bus'
  | 'tram'
  | 'taxi'
  | 'walk'
  | 'copy'
  | 'external'
  // खाना and जानना
  | 'phone'
  | 'camera'
  | 'clock'
  | 'ticket'
  // घर: documents and the pass
  | 'doc'
  | 'trash'
  | 'share'
  | 'qr';

/**
 * The shapes themselves, not path strings, because some are drawn with rects and filled dots as
 * well as paths. The artwork is the same as the Sprint 1 artboards so the boards and the app
 * agree. Everything inherits `currentColor`, which is what lets one icon be cream on a pillar,
 * muted in the bar, and the pillar's own hue in a header — in either theme.
 */
const SHAPES: Record<IconName, ReactNode> = {
  thali: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="8.6" cy="9.2" r="2.1" />
      <circle cx="15.4" cy="9.2" r="2.1" />
      <circle cx="12" cy="15.3" r="2.1" />
      <path d="M12 2.5v1.6" />
    </>
  ),
  metro: (
    <>
      <rect x="5" y="3" width="14" height="15.5" rx="3.2" />
      <path d="M7.6 6.6h8.8v4.6H7.6z" />
      <circle cx="8.6" cy="14.6" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15.4" cy="14.6" r="0.9" fill="currentColor" stroke="none" />
      <path d="M8.2 18.5 6.8 21.5" />
      <path d="M15.8 18.5l1.4 3" />
      <path d="M4.5 21.5h15" />
    </>
  ),
  lantern: (
    <>
      <path d="M12 2v1.8" />
      <path d="M8.6 3.8h6.8" />
      <path d="M8.8 6.2h6.4l1.6 10.6a1.4 1.4 0 0 1-1.4 1.6H8.6a1.4 1.4 0 0 1-1.4-1.6z" />
      <path d="M12 6.2v12.2" />
      <path d="M9.7 6.2l-1 12.2" />
      <path d="M14.3 6.2l1 12.2" />
      <path d="M10.4 21.5h3.2" />
      <path d="M12 18.4v3.1" />
    </>
  ),
  docs: (
    <>
      <path d="M6 3.5h7.5L18.5 8.5V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5z" />
      <path d="M13.5 3.5v5h5" />
      <path d="M8 12.5h8" />
      <path d="M8 16h5" />
    </>
  ),
  left: <path d="M15 5l-7 7 7 7" />,
  right: <path d="M9 5l7 7-7 7" />,
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
    </>
  ),
  wifi: (
    <>
      <path d="M5 10.5a11.5 11.5 0 0 1 14 0" />
      <path d="M8.5 14a6.5 6.5 0 0 1 7 0" />
      <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  wifioff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M5 10.5a11.5 11.5 0 0 1 4.6-2.7" />
      <path d="M12.8 5.2A11.5 11.5 0 0 1 19 10.5" />
      <path d="M8.5 14a6.5 6.5 0 0 1 2.4-1.5" />
      <path d="M13.6 12.6a6.5 6.5 0 0 1 1.9 1.4" />
      <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
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
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  pin: (
    <>
      <path d="M12 21.5s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" />
      <circle cx="12" cy="10.5" r="2.4" />
    </>
  ),
  home: (
    <>
      <path d="M4 10.6 12 4.2l8 6.4" />
      <path d="M6 9.5V20h12V9.5" />
    </>
  ),
  bus: (
    <>
      <rect x="4" y="4" width="16" height="14" rx="3" />
      <path d="M4 11h16" />
      <circle cx="8" cy="14.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="14.5" r="1" fill="currentColor" stroke="none" />
      <path d="M7 18v2.5M17 18v2.5" />
    </>
  ),
  tram: (
    <>
      <rect x="5" y="6" width="14" height="12" rx="3" />
      <path d="M5 12h14" />
      <path d="M9 3l3 3 3-3" />
      <path d="M8 18l-1.5 3M16 18l1.5 3" />
    </>
  ),
  taxi: (
    <>
      <path d="M5 12l1.6-4.2A2 2 0 0 1 8.5 6.5h7a2 2 0 0 1 1.9 1.3L19 12" />
      <path d="M3.5 12h17v5.5h-2.5a1.5 1.5 0 0 1-3 0h-6a1.5 1.5 0 0 1-3 0H3.5z" />
      <path d="M10 6.5V4.5h4v2" />
    </>
  ),
  walk: (
    <>
      <circle cx="13" cy="4" r="1.8" />
      <path d="M10 21l2.2-6.2 2.8 2.7V21" />
      <path d="M8 13.5l2.5-4.5 3 1 2.5 3.5 2.5 1" />
      <path d="M10.5 9l-3 4L5 12" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
      <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
    </>
  ),
  phone: (
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  ),
  camera: (
    <>
      <path d="M4 8.5h3l1.5-2.5h7L17 8.5h3v10H4z" />
      <circle cx="12" cy="13.5" r="3.2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  ticket: (
    <>
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" />
      <path d="M14 6v12" />
    </>
  ),
  doc: (
    <>
      <path d="M6 3.5h7.5L18.5 8.5V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5z" />
      <path d="M13.5 3.5v5h5" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15" />
      <path d="M9 7V4.5h6V7" />
      <path d="M6.5 7l1 13h9l1-13" />
    </>
  ),
  share: (
    <>
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
    </>
  ),
  qr: (
    <>
      <rect x="4" y="4" width="6" height="6" />
      <rect x="14" y="4" width="6" height="6" />
      <rect x="4" y="14" width="6" height="6" />
      <path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2" />
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
