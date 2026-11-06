/**
 * Inline SVG icon set (no icon-font or extra dependency). Icons are
 * decorative by default (aria-hidden); pass `title` to make one meaningful.
 */
const PATHS = {
  search: 'M21 21l-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z',
  bag: 'M6 7h12l1 13H5L6 7zm3 0V6a3 3 0 1 1 6 0v1',
  user: 'M20 21a8 8 0 1 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
  heart:
    'M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  chevronLeft: 'M15 6l-6 6 6 6',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  lock: 'M6 11h12v10H6V11zm2 0V7a4 4 0 1 1 8 0v4',
  truck: 'M3 6h11v10H3V6zm11 4h4l3 3v3h-7v-6zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  return: 'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  support:
    'M4 13v-1a8 8 0 1 1 16 0v1M4 13h3v6H5a1 1 0 0 1-1-1v-5zm16 0h-3v6h2a1 1 0 0 0 1-1v-5z',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z',
  share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13',
  check: 'M5 12l5 5L20 7',
  filter: 'M4 6h16M7 12h10M10 18h4',
  zoom: 'M21 21l-4.35-4.35M11 8v6M8 11h6M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z',
  play: 'M8 5v14l11-7L8 5z',
  cube: 'M12 2l9 5v10l-9 5-9-5V7l9-5zm0 0v20M3 7l9 5 9-5',
  mail: 'M3 6h18v12H3V6zm0 0l9 7 9-7',
  phone:
    'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z',
  package: 'M3 7l9-4 9 4v10l-9 4-9-4V7zm0 0l9 4 9-4M12 11v10',
  gift: 'M3 10h18v4H3v-4zm2 4h14v7H5v-7zm7-4v11M12 10S10.5 4 8 5s0 5 4 5zm0 0s1.5-6 4-5-0 5-4 5z',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-5M12 8h.01',
  alert: 'M12 3l10 18H2L12 3zM12 10v4M12 18h.01',
  copy: 'M9 9h11v11H9V9zM5 15H4V4h11v1',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  instagram:
    'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17.5 6.5h.01',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
  map: 'M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  className = 'size-5',
  title,
  filled = false,
  strokeWidth = 1.6,
}: {
  name: IconName;
  className?: string;
  title?: string;
  filled?: boolean;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d={PATHS[name]} />
    </svg>
  );
}
