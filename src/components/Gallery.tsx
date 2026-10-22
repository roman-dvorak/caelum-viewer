import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { Frame, FrameMeta } from "../data/archive";
import type { DataSource } from "../data/types";
import { periodColor, skyPeriod } from "../lib/metadata";
import { utcTime } from "../lib/time";
import { t, tn } from "../lib/i18n";
import { Icon } from "./Icon";

interface Props {
  frames: Frame[];
  metaMap: Map<string, FrameMeta>;
  source: DataSource;
  currentId?: string;
  onSelect: (id: string) => void;
}

const HOUR = 3_600_000;

/** One page per UTC hour; the page follows the current frame unless the user picks another hour. */
export function Gallery({ frames, metaMap, source, currentId, onSelect }: Props) {
  const grid = useRef<HTMLDivElement>(null);
  const counts = useMemo(() => {
    const c = new Array<number>(24).fill(0);
    for (const f of frames) c[new Date(f.t).getUTCHours()]++;
    return c;
  }, [frames]);
  const current = frames.find((f) => f.id === currentId);
  const currentHour = current ? new Date(current.t).getUTCHours() : undefined;
  const firstHour = counts.findIndex((n) => n > 0);
  const [picked, setPicked] = useState<number>();
  useEffect(() => setPicked(undefined), [currentHour]);
  const hour = picked ?? currentHour ?? firstHour;
  const page = useMemo(() => frames.filter((f) => Math.floor(f.t / HOUR) % 24 === hour), [frames, hour]);

  useEffect(() => {
    // Scroll only the gallery itself — scrollIntoView would also move the page during playback.
    const box = grid.current;
    const tile = box?.querySelector<HTMLElement>(".tile.current");
    if (!box || !tile) return;
    const top = tile.offsetTop; // .gallery is the offset parent
    if (top < box.scrollTop) box.scrollTop = top;
    else if (top + tile.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = top + tile.offsetHeight - box.clientHeight;
  }, [currentId, hour]);

  if (!frames.length) return <div className="muted pad">{t("gallery.empty")}</div>;
  let prev = hour - 1;
  while (prev >= 0 && !counts[prev]) prev--;
  const next = counts.findIndex((n, h) => h > hour && n > 0);
  return (
    <div className="gallery-wrap">
      <div className="gallery-pager">
        <button disabled={prev < 0} onClick={() => setPicked(prev)} title={t("gallery.prevHour")}>
          <Icon name="prev" />
        </button>
        <div className="hours" role="tablist">
          {counts.map((n, h) => (
            <button
              key={h}
              role="tab"
              aria-selected={h === hour}
              className={`hour${h === hour ? " on" : ""}${h === currentHour ? " has-current" : ""}`}
              disabled={!n}
              onClick={() => setPicked(h)}
              title={t("gallery.hourTitle", { h: String(h).padStart(2, "0"), n })}
            >
              {String(h).padStart(2, "0")}
            </button>
          ))}
        </div>
        <button disabled={next < 0} onClick={() => setPicked(next)} title={t("gallery.nextHour")}>
          <Icon name="next" />
        </button>
        <span className="muted small gallery-count">
          {String(hour).padStart(2, "0")}:00–{String(hour).padStart(2, "0")}:59 UTC · {tn("frames", page.length)}
        </span>
      </div>
      <div className="gallery" ref={grid}>
        {page.map((f) => (
          <Tile
            key={f.id}
            frame={f}
            src={f.thumb ? source.url(f.thumb) : undefined}
            color={periodColor(skyPeriod(metaMap.get(f.id)))}
            current={f.id === currentId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

const Tile = memo(function Tile({
  frame,
  src,
  color,
  current,
  onSelect,
}: {
  frame: Frame;
  src?: string;
  color: string;
  current: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button className={`tile${current ? " current" : ""}`} onClick={() => onSelect(frame.id)}>
      {src ? <img src={src} loading="lazy" decoding="async" alt="" /> : <span className="tile-raw">RAW</span>}
      <span className="tile-time" style={{ borderColor: color }}>
        {utcTime(frame.t).slice(0, 5)}
      </span>
    </button>
  );
});
