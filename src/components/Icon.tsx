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
  chevron: "M9.4 5 8 6.4l5.6 5.6L8 17.6 9.4 19l7-7z",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  pin: "M14 3 21 10l-2 1-2-1-3.5 3.5L14 17l-1.5 1.5-3-3L5 20l-1-1 4.5-4.5-3-3L7 10l3.5.5L14 7l-1-2z",
  zoom: "M10 3a7 7 0 0 1 5.6 11.2l5.1 5.1-1.4 1.4-5.1-5.1A7 7 0 1 1 10 3zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm-1 2h2v2h2v2h-2v2H9v-2H7V9h2z",
  more: "M12 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z",
  info: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 5h2v2h-2zm0 4h2v6h-2z",
  close: "M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z",
  fullscreen: "M4 4h6v2H6v4H4zM14 4h6v6h-2V6h-4zM4 14h2v4h4v2H4zM18 14h2v6h-6v-2h4z",
};

export function Icon({ name }: { name: keyof typeof PATHS }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d={PATHS[name]} fill="currentColor" />
    </svg>
  );
}
