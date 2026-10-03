import { useEffect, useMemo, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import type { Frame, FrameMeta } from "../data/archive";
import { fieldInfo, formatValue, numericFields } from "../lib/metadata";

interface Props {
  frames: Frame[];
  metaMap: Map<string, FrameMeta>;
  fields: string[];
  available: string[];
  currentId?: string;
  onSelect: (id: string) => void;
  onFieldsChange: (fields: string[]) => void;
}

const SYNC_KEY = "caelum-charts";
const COLORS = ["#5b8cff", "#f5a742", "#4cc38a", "#e5534b", "#b083f0", "#3fc1c9"];
const utc = (ts: number) => uPlot.tzDate(new Date(ts * 1e3), "Etc/UTC");
const hhmm = (ts: number) => new Date(ts * 1000).toISOString().slice(11, 16);

/** 10× the median capture interval (at least 10 min) counts as a pause. */
function gapThreshold(xs: number[]): number {
  if (xs.length < 3) return Infinity;
  const d = xs.slice(1).map((x, i) => x - xs[i]).sort((a, b) => a - b);
  return Math.max(600, d[d.length >> 1] * 10);
}

/**
 * One small chart per metadata field, all sharing a synchronized cursor.
 * The vertical marker follows the frame shown in the viewer; clicking a
 * point opens that frame.
 */
export function Charts({ frames, metaMap, fields, available, currentId, onSelect, onFieldsChange }: Props) {
  // x = capture time (s), one y array per field; frames without metadata are
  // skipped. Where capture paused for a while, a null point breaks the line
  // instead of drawing a straight segment across the gap.
  const { xs, ids, ys } = useMemo(() => {
    const withMeta = frames.filter((f) => metaMap.has(f.id));
    const gap = gapThreshold(withMeta.map((f) => f.t / 1000));
    const xs: number[] = [];
    const ids: (string | null)[] = [];
    const ys: Record<string, (number | null)[]> = Object.fromEntries(fields.map((k) => [k, []]));
    withMeta.forEach((f, i) => {
      const x = f.t / 1000;
      if (i > 0 && x - xs[xs.length - 1] > gap) {
        xs.push((x + xs[xs.length - 1]) / 2);
        ids.push(null);
        for (const k of fields) ys[k].push(null);
      }
      const n = numericFields(metaMap.get(f.id)!);
      xs.push(x);
      ids.push(f.id);
      for (const k of fields) ys[k].push(n[k] ?? null);
    });
    return { xs, ids, ys };
  }, [frames, metaMap, fields]);

  const currentIdx = currentId ? ids.indexOf(currentId) : -1;

  return (
    <div className="charts">
      <div className="charts-toolbar">
        <span className="muted">Grafy:</span>
        {fields.map((k) => (
          <span key={k} className="chip">
            {fieldInfo(k).label}
            <button title="Odebrat" onClick={() => onFieldsChange(fields.filter((f) => f !== k))}>×</button>
          </span>
        ))}
        <select
          value=""
          onChange={(e) => e.target.value && onFieldsChange([...fields, e.target.value])}
        >
          <option value="">+ přidat veličinu…</option>
          {available
            .filter((k) => !fields.includes(k))
            .map((k) => (
              <option key={k} value={k}>
                {fieldInfo(k).label === k ? k : `${fieldInfo(k).label} (${k})`}
              </option>
            ))}
        </select>
      </div>
      {!xs.length && <div className="muted pad">Načítám metadata…</div>}
      {xs.length > 0 &&
        fields.map((k, i) => (
          <Chart
            key={k}
            field={k}
            color={COLORS[i % COLORS.length]}
            xs={xs}
            ys={ys[k]}
            currentIdx={currentIdx}
            onPick={(idx) => ids[idx] && onSelect(ids[idx]!)}
          />
        ))}
    </div>
  );
}

interface ChartProps {
  field: string;
  color: string;
  xs: number[];
  ys: (number | null)[];
  currentIdx: number;
  onPick: (idx: number) => void;
}

function Chart({ field, color, xs, ys, currentIdx, onPick }: ChartProps) {
  const host = useRef<HTMLDivElement>(null);
  const plot = useRef<uPlot | null>(null);
  const current = useRef(currentIdx);
  const pick = useRef(onPick);
  current.current = currentIdx;
  pick.current = onPick;

  const logScale = useMemo(
    () => (field === "exposure_s" || field === "exposure_us") && ys.every((v) => v === null || v > 0),
    [field, ys],
  );

  useEffect(() => {
    const el = host.current!;
    const info = fieldInfo(field);
    const opts: uPlot.Options = {
      width: el.clientWidth,
      height: 150,
      tzDate: utc,
      cursor: {
        sync: { key: SYNC_KEY },
        drag: { x: false, y: false },
        points: { size: 7 },
      },
      legend: { show: true, live: true },
      scales: { x: { time: true }, y: { distr: logScale ? 3 : 1 } },
      axes: [
        {
          stroke: "#8a94ad",
          grid: { stroke: "#ffffff12" },
          ticks: { stroke: "#ffffff20" },
          values: (_u, splits) => splits.map(hhmm),
        },
        { stroke: "#8a94ad", grid: { stroke: "#ffffff12" }, ticks: { stroke: "#ffffff20" }, size: 60 },
      ],
      series: [
        { value: (_u, v) => (v == null ? "—" : `${new Date(v * 1000).toISOString().slice(11, 19)} UTC`) },
        {
          label: info.label,
          stroke: color,
          width: 1.5,
          spanGaps: false,
          points: { show: xs.length < 300, size: 3 },
          value: (_u, v) => formatValue(field, v ?? undefined),
        },
      ],
      hooks: {
        draw: [
          (u) => {
            const idx = current.current;
            if (idx < 0) return;
            const x = Math.round(u.valToPos(u.data[0][idx], "x", true));
            const { top, height } = u.bbox;
            const g = u.ctx;
            g.save();
            g.strokeStyle = "#ffffffcc";
            g.lineWidth = Math.max(1, devicePixelRatio);
            g.setLineDash([4 * devicePixelRatio, 3 * devicePixelRatio]);
            g.beginPath();
            g.moveTo(x, top);
            g.lineTo(x, top + height);
            g.stroke();
            g.restore();
          },
        ],
      },
    };
    const u = new uPlot(opts, [xs, ys], el);
    plot.current = u;
    const onClick = () => {
      if (u.cursor.idx != null) pick.current(u.cursor.idx);
    };
    u.over.addEventListener("click", onClick);
    const ro = new ResizeObserver(() => u.setSize({ width: el.clientWidth, height: 150 }));
    ro.observe(el);
    return () => {
      ro.disconnect();
      u.destroy();
      plot.current = null;
    };
    // Rebuilt only when the series definition changes; data updates go through setData.
  }, [field, color, logScale]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    plot.current?.setData([xs, ys]);
  }, [xs, ys]);

  useEffect(() => {
    plot.current?.redraw(false);
  }, [currentIdx]);

  return <div ref={host} className="chart" />;
}
