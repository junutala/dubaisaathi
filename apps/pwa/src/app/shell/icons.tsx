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
  | 'language';

const PATHS: Record<IconName, string> = {
  mic: 'M12 4.5a2.8 2.8 0 0 1 2.8 2.8v4a2.8 2.8 0 0 1-5.6 0v-4A2.8 2.8 0 0 1 12 4.5Z M5.8 11.4a6.2 6.2 0 0 0 12.4 0 M12 17.8v2.7',
  home: 'M4 10.6 12 4.2l8 6.4 M6.2 9.8v9.9h11.6V9.8',
  route: 'M7 20v-7.8A4.2 4.2 0 0 1 11.2 8H17 M14 4.8 17.4 8 14 11.2',
  food: 'M4 11.2h16 M5.2 11.2a6.8 6.8 0 0 0 13.6 0 M12 4.2c1.5 1 1.5 2.5 0 3.5',
  talk: 'M20 12.2c0 3.4-3.6 6.2-8 6.2a9.9 9.9 0 0 1-2.5-.3L5.2 19.8l1-3A6 6 0 0 1 4 12.2C4 8.8 7.6 6 12 6s8 2.8 8 6.2Z',
  info: 'M3.5 5.5h17v13h-17z M5.8 15.6c.6-1.4 1.6-2.1 2.8-2.1s2.2.7 2.8 2.1 M13.6 9.6h4.2 M13.6 13.2h4.2',
  speak: 'M5 10v4h3l4 3.4V6.6L8 10H5Z M15.4 9.6a3.4 3.4 0 0 1 0 4.8 M17.9 7.2a6.8 6.8 0 0 1 0 9.6',
  left: 'M14.4 5.8 8.6 12l5.8 6.2',
  right: 'M9.6 5.8 15.4 12l-5.8 6.2',
  moon: 'M19.2 14.6A7.6 7.6 0 0 1 9.4 4.8a7.6 7.6 0 1 0 9.8 9.8Z',
  wifi: 'M4 8.8a12.6 12.6 0 0 1 16 0 M7.2 12.2a8.8 8.8 0 0 1 9.6 0 M10.2 15.4a4.4 4.4 0 0 1 3.6 0 M11.9 18h.2',
  wifioff:
    'M4 8.4a12.6 12.6 0 0 1 5.6-2.3 M14.8 6.3A12.6 12.6 0 0 1 20 8.4 M7.2 11.9a8.8 8.8 0 0 1 2.6-1.5 M16.8 11.9a8.8 8.8 0 0 0-1.8-1.1 M11.9 17.6h.1 M4.2 4.2l15.6 15.6',
  language:
    'M4.5 7h9 M9 5v2 M11 7c0 4-3 7-6.5 8 M7 11.5c1 1.8 3 3.2 5.5 3.8 M13 19.5l3.6-9 3.6 9 M14.4 16.6h4.4',
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
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name].split(' M').map((segment, i) => (
        <path key={segment} d={i === 0 ? segment : `M${segment}`} />
      ))}
    </svg>
  );
}
