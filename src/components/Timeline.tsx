import { useEffect, useRef, useState } from "react";
import type { Frame, FrameMeta } from "../data/archive";
import { periodColor, skyPeriod } from "../lib/metadata";
import { dayStart, utcTime } from "../lib/time";

interface Props {
  date: string;
  frames: Frame[];
  visible: Set<string>;
  metaMap: Map<string, FrameMeta>;
  currentT?: number;
  /** Section playback and export are limited to. */
  range?: { from: number; to: number } | null;
  onSeek: (t: number) => void;
  /** Shift+drag marks a section; without it the timeline only seeks. */
  onRange?: (from: number, to: number) => void;
}

const DAY = 86_400_000;
const HEIGHT = 56;

/** 24 h UTC strip: one tick per frame (colored by sky period, dimmed when
 *  filtered out), the current frame marker and the selected section; click
 *  or drag to seek, Shift+drag to select a section. */
export function Timeline({ date, frames, visible, metaMap, currentT, range, onSeek, onRange }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null);
  /** Seeking, or the anchor time of a section being drawn. */
  const dragging = useRef<false | "seek" | { anchor: number }>(false);
  const start = dayStart(date);

  useEffect(() => {
    const el = canvas.current!.parentElement!;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c || !width) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = width * dpr;
    c.height = HEIGHT * dpr;
    const g = c.getContext("2d")!;
    g.scale(dpr, dpr);
    const css = getComputedStyle(c);
    const muted = css.getPropertyValue("--muted").trim() || "#8a9db8";
    const line = css.getPropertyValue("--line").trim() || "#2a3a52";
    const accent = css.getPropertyValue("--accent").trim() || "#5a8ee8";
    const amber = css.getPropertyValue("--amber").trim() || "#e8a13a";
    g.clearRect(0, 0, width, HEIGHT);

    const barTop = 6;
    const barH = 30;
    g.fillStyle = line;
    g.globalAlpha = 0.35;
    g.fillRect(0, barTop, width, barH);
    g.globalAlpha = 1;

    for (const f of frames) {
      const x = ((f.t - start) / DAY) * width;
      const on = visible.has(f.id);
      g.globalAlpha = on ? 1 : 0.15;
      g.fillStyle = periodColor(skyPeriod(metaMap.get(f.id)));
      g.fillRect(Math.floor(x), barTop, Math.max(1, width / 1440), barH);
    }
    g.globalAlpha = 1;

    if (range) {
      const x0 = ((range.from - start) / DAY) * width;
      const x1 = ((range.to - start) / DAY) * width;
      g.fillStyle = amber;
      g.globalAlpha = 0.18;
      g.fillRect(x0, barTop - 4, Math.max(2, x1 - x0), barH + 8);
      g.globalAlpha = 1;
      g.fillRect(Math.round(x0) - 1, barTop - 4, 2, barH + 8);
      g.fillRect(Math.round(x1) - 1, barTop - 4, 2, barH + 8);
    }

    g.fillStyle = muted;
    g.strokeStyle = muted;
    g.font = '11px "JetBrains Mono", ui-monospace, monospace';
    g.textAlign = "center";
    const step = width < 500 ? 6 : width < 900 ? 3 : 1;
    for (let h = 0; h <= 24; h += step) {
      const x = (h / 24) * width;
      g.fillRect(Math.round(x), barTop + barH, 1, 4);
      if (h > 0 && h < 24) g.fillText(`${String(h).padStart(2, "0")}h`, x, HEIGHT - 4);
    }

    if (currentT !== undefined) {
      const x = ((currentT - start) / DAY) * width;
      g.fillStyle = accent;
      g.fillRect(Math.round(x) - 1, 0, 3, barTop + barH + 4);
      g.beginPath();
      g.moveTo(x - 6, 0);
      g.lineTo(x + 6, 0);
      g.lineTo(x, 7);
      g.fill();
    }
  }, [width, frames, visible, metaMap, currentT, range, start]);

  const timeAt = (clientX: number) => {
    const r = canvas.current!.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - r.left, 0), r.width);
    return { x, t: start + (x / r.width) * DAY };
  };

  return (
    <div className="timeline">
      <canvas
        ref={canvas}
        style={{ width: "100%", height: HEIGHT }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const at = timeAt(e.clientX).t;
          if (e.shiftKey && onRange) dragging.current = { anchor: at };
          else {
            dragging.current = "seek";
            onSeek(at);
          }
        }}
        onPointerMove={(e) => {
          const h = timeAt(e.clientX);
          setHover(h);
          const d = dragging.current;
          if (d === "seek") onSeek(h.t);
          else if (d && Math.abs(h.t - d.anchor) > 60_000) onRange?.(Math.min(d.anchor, h.t), Math.max(d.anchor, h.t));
        }}
        onPointerUp={() => (dragging.current = false)}
        onPointerLeave={() => setHover(null)}
      />
      {hover && (
        <div className="timeline-hover" style={{ left: hover.x }}>
          {utcTime(hover.t).slice(0, 5)}
        </div>
      )}
    </div>
  );
}
