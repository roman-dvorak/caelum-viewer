/** Inline SVG icons — media-control glyphs (⏮ ⏸ ⛶ …) are missing from many system fonts. */
const PATHS = {
  first: "M6 5h2v14H6zM20 5v14L9 12z",
  last: "M16 5h2v14h-2zM4 5v14l11-7z",
  prev: "M17 5v14L6 12z",
  next: "M7 5v14l11-7z",
  play: "M7 4v16l13-8z",
  pause: "M6 4h4v16H6zM14 4h4v16h-4z",
  plus: "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z",
  minus: "M5 11h14v2H5z",
  fullscreen: "M4 4h6v2H6v4H4zM14 4h6v6h-2V6h-4zM4 14h2v4h4v2H4zM18 14h2v6h-6v-2h4z",
};

export function Icon({ name }: { name: keyof typeof PATHS }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d={PATHS[name]} fill="currentColor" />
    </svg>
  );
}
