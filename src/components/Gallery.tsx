import { memo, useEffect, useRef } from "react";
import type { Frame, FrameMeta } from "../data/archive";
import type { DataSource } from "../data/types";
import { periodColor, skyPeriod } from "../lib/metadata";
import { utcTime } from "../lib/time";

interface Props {
  frames: Frame[];
  metaMap: Map<string, FrameMeta>;
  source: DataSource;
  currentId?: string;
  onSelect: (id: string) => void;
}

export function Gallery({ frames, metaMap, source, currentId, onSelect }: Props) {
  const grid = useRef<HTMLDivElement>(null);
  useEffect(() => {
    grid.current?.querySelector(".tile.current")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [currentId]);
  if (!frames.length) return <div className="muted pad">Žádné snímky.</div>;
  return (
    <div className="gallery" ref={grid}>
      {frames.map((f) => (
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
