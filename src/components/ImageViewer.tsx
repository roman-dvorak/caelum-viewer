import { useCallback, useEffect, useRef, useState } from "react";
import type { Frame, FrameMeta } from "../data/archive";
import { Icon } from "./Icon";
import { useLoadedImage } from "../lib/hooks";
import { formatValue, numericFields, PERIODS, skyPeriod } from "../lib/metadata";
import { utcDate, utcTime } from "../lib/time";

interface Props {
  frame?: Frame;
  src?: string;
  meta?: FrameMeta;
  cameraName: string;
  showOverlay: boolean;
}

interface View {
  scale: number;
  x: number;
  y: number;
}
const RESET: View = { scale: 1, x: 0, y: 0 };

/** Preview with wheel/pinch-free zoom, drag to pan, double-click to reset and
 *  fullscreen. Zoom is kept across frames so a region can be followed
 *  through a time-lapse. */
export function ImageViewer({ frame, src, meta, cameraName, showOverlay }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(RESET);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const { shown, error, loading } = useLoadedImage(src);

  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    setView((v) => {
      const scale = Math.min(40, Math.max(1, v.scale * factor));
      if (scale === 1) return RESET;
      const k = scale / v.scale;
      return { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
    });
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else box.current?.requestFullscreen();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, select, textarea")) return;
      if (e.key === "f") toggleFullscreen();
      else if (e.key === "+" || e.key === "=") zoomAt(1.5, 0, 0);
      else if (e.key === "-") zoomAt(1 / 1.5, 0, 0);
      else if (e.key === "0") setView(RESET);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomAt]);

  const values = meta ? numericFields(meta) : {};
  const period = skyPeriod(meta);

  return (
    <div
      ref={box}
      className="viewer"
      onPointerDown={(e) => {
        if (view.scale === 1 || e.button !== 0) return;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (d) setView((v) => ({ ...v, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y }));
      }}
      onPointerUp={() => (drag.current = null)}
      onDoubleClick={() => setView(RESET)}
      style={{ cursor: view.scale > 1 ? "grab" : "zoom-in" }}
    >
      {shown ? (
        <img
          className="viewer-img"
          src={shown}
          alt={frame ? `${utcDate(frame.t)} ${utcTime(frame.t)} UTC` : ""}
          draggable={false}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        />
      ) : (
        <div className="viewer-empty">{frame ? (frame.thumb ? "" : "Snímek nemá náhled (jen RAW)") : "Žádný snímek"}</div>
      )}
      {error && <div className="viewer-msg">Náhled se nepodařilo načíst</div>}
      {loading && <div className="viewer-spinner" />}

      {showOverlay && frame && (
        <>
          <div className="overlay overlay-tl">
            <div className="overlay-title">{cameraName}</div>
            <div>
              {utcDate(frame.t)} <b>{utcTime(frame.t)}</b> UTC
            </div>
          </div>
          {meta && (
            <div className="overlay overlay-bl">
              <div>
                {formatValue("exposure_s", values.exposure_s)} · gain {formatValue("analogue_gain", values.analogue_gain)}
              </div>
              {period && <div>{PERIODS[period]?.label ?? period}</div>}
              {values["sky_state.sun_altitude_deg"] !== undefined && (
                <div>
                  ☉ {formatValue("sky_state.sun_altitude_deg", values["sky_state.sun_altitude_deg"])} · ☾{" "}
                  {formatValue("sky_state.moon_altitude_deg", values["sky_state.moon_altitude_deg"])} (
                  {Math.round((values["sky_state.moon_illumination"] ?? 0) * 100)} %)
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="viewer-tools" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
        <button title="Přiblížit (+)" onClick={() => zoomAt(1.5, 0, 0)}><Icon name="plus" /></button>
        <button title="Oddálit (−)" onClick={() => zoomAt(1 / 1.5, 0, 0)}><Icon name="minus" /></button>
        <button title="Původní velikost (0)" onClick={() => setView(RESET)} disabled={view.scale === 1}>
          {Math.round(view.scale * 100)} %
        </button>
        <button title="Celá obrazovka (F)" onClick={toggleFullscreen}><Icon name="fullscreen" /></button>
      </div>
    </div>
  );
}
