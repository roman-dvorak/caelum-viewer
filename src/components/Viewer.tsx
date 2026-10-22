import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CameraArchive, type Frame } from "../data/archive";
import { createDataSource } from "../data/factory";
import type { CameraConfig } from "../data/types";
import { VIEWER_DOCS_URL } from "../lib/brand";
import { applyFilters, needsMetadata, NO_FILTERS, type Filters } from "../lib/filters";
import { useMetadata, usePreload } from "../lib/hooks";
import { DEFAULT_CHART_FIELDS, KNOWN_FIELDS, numericFields } from "../lib/metadata";
import { rememberCamera } from "../lib/recent";
import { nearestIndex, parseTimeOnDate, todayUtc, utcTime } from "../lib/time";
import { updateParams, type ViewParams } from "../lib/urlState";
import { Charts } from "./Charts";
import { FilterPanel } from "./FilterPanel";
import { Gallery } from "./Gallery";
import { Icon } from "./Icon";
import { ImageViewer } from "./ImageViewer";
import { MetadataPanel } from "./MetadataPanel";
import { LangSwitch } from "./LangSwitch";
import { Timeline } from "./Timeline";
import { t, tn } from "../lib/i18n";

interface Props {
  cameras: CameraConfig[];
  title?: string;
  fromCatalog: boolean;
  initial: ViewParams;
}

const LIVE_POLL_MS = 30_000;
const SPEEDS = [2, 5, 10, 20, 30];
const CHART_FIELDS_KEY = "caelum-viewer.chartFields";

function loadChartFields(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CHART_FIELDS_KEY) ?? "null");
    if (Array.isArray(v)) return v;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_CHART_FIELDS;
}

export function Viewer({ cameras, title, fromCatalog, initial }: Props) {
  const [cameraId, setCameraId] = useState(
    cameras.some((c) => c.id === initial.camera) ? initial.camera! : cameras[0].id,
  );
  const camera = cameras.find((c) => c.id === cameraId)!;
  const archive = useMemo(() => new CameraArchive(createDataSource(camera.source), camera.layout), [camera]);

  const [live, setLive] = useState(initial.live === "1");
  const [dates, setDates] = useState<string[] | null>(null);
  const [date, setDate] = useState<string | undefined>(live ? todayUtc() : initial.date);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [loadingFrames, setLoadingFrames] = useState(false);
  const [error, setError] = useState<string>();
  const [currentId, setCurrentId] = useState<string>();
  const [playing, setPlaying] = useState(false);
  const [fps, setFps] = useState(10);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  /** Bottom panel; closed by default so no previews or metadata are fetched until asked for. */
  const [tab, setTab] = useState<"charts" | "gallery" | null>(null);
  const toggleTab = (next: "charts" | "gallery") => setTab((cur) => (cur === next ? null : next));
  /** Metadata of the whole day is fetched only on request (charts, filters, the load button). */
  const [metaRequested, setMetaRequested] = useState(false);
  const [overlay, setOverlay] = useState(true);
  const [chartFields, setChartFields] = useState(loadChartFields);
  /** Time of day (HH:MM:SS) to jump to once the next frame list arrives. */
  const pendingTime = useRef<string | undefined>(initial.time);

  const loadAllMeta = metaRequested || tab === "charts" || needsMetadata(filters);
  const wantedMeta = useMemo(() => {
    if (loadAllMeta) return frames;
    // Just the frame on screen and the next ones, for the overlay and the metadata table.
    const i = frames.findIndex((f) => f.id === currentId);
    return i < 0 ? [] : frames.slice(Math.max(0, i - 1), i + 3);
  }, [loadAllMeta, frames, currentId]);
  const { metaMap, pending } = useMetadata(archive, wantedMeta);
  const metaStatus = !loadAllMeta ? "off" : pending > 0 ? "loading" : "done";
  const visible = useMemo(() => applyFilters(frames, metaMap, filters), [frames, metaMap, filters]);
  const visibleIds = useMemo(() => new Set(visible.map((f) => f.id)), [visible]);
  const currentIndex = visible.findIndex((f) => f.id === currentId);
  const current = currentIndex >= 0 ? visible[currentIndex] : frames.find((f) => f.id === currentId);

  // --- dates of the selected camera -----------------------------------------
  useEffect(() => {
    const ctl = new AbortController();
    setDates(null);
    setError(undefined);
    archive
      .listDates(ctl.signal)
      .then((d) => {
        setDates(d);
        setDate((cur) => cur ?? d[d.length - 1] ?? todayUtc());
      })
      .catch((e: Error) => e.name !== "AbortError" && setError(e.message));
    return () => ctl.abort();
  }, [archive]);

  // --- frames of the selected date -----------------------------------------
  useEffect(() => {
    if (!date) return;
    const ctl = new AbortController();
    setLoadingFrames(true);
    setFrames([]);
    archive
      .listFrames(date, ctl.signal)
      .then((list) => {
        setFrames(list);
        setLoadingFrames(false);
        const time = pendingTime.current;
        pendingTime.current = undefined;
        const t = time ? parseTimeOnDate(date, time) : undefined;
        const idx = t !== undefined ? nearestIndex(list, t) : list.length - 1;
        setCurrentId(list[idx]?.id);
      })
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setError(e.message);
        setLoadingFrames(false);
      });
    return () => ctl.abort();
  }, [archive, date]);

  // --- live: follow today's newest frame --------------------------------------
  useEffect(() => {
    if (!live) return;
    setPlaying(false);
    const tick = () => {
      const today = todayUtc();
      if (date !== today) {
        setDate(today);
        return;
      }
      archive
        .listFrames(today)
        .then((list) => {
          setFrames((old) => (old.length === list.length && old.at(-1)?.id === list.at(-1)?.id ? old : list));
          if (list.length) setCurrentId(list[list.length - 1].id);
          setDates((d) => (d && !d.includes(today) ? [...d, today] : d));
        })
        .catch(() => {});
    };
    tick();
    const id = setInterval(tick, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [live, archive, date]);

  // Current frame filtered out → move to the nearest one that's still shown.
  useEffect(() => {
    if (!visible.length || !current || visibleIds.has(current.id)) return;
    setCurrentId(visible[nearestIndex(visible, current.t)].id);
  }, [visible, visibleIds, current]);

  // --- URL ------------------------------------------------------------------
  useEffect(() => {
    rememberCamera(camera.name, fromCatalog ? (title ?? t("data.catalog")) : undefined, {
      ...initial,
      camera: fromCatalog ? cameraId : undefined,
    });
  }, [camera, cameraId, fromCatalog, title, initial]);

  useEffect(() => {
    updateParams({
      camera: fromCatalog ? cameraId : undefined,
      date,
      time: current && !live ? utcTime(current.t) : undefined,
      live: live ? "1" : undefined,
    });
  }, [fromCatalog, cameraId, date, current, live]);

  useEffect(() => {
    try {
      localStorage.setItem(CHART_FIELDS_KEY, JSON.stringify(chartFields));
    } catch {
      /* storage unavailable */
    }
  }, [chartFields]);

  // --- navigation -----------------------------------------------------------
  const select = useCallback((id: string | undefined) => {
    setLive(false);
    setCurrentId(id);
  }, []);

  const step = useCallback(
    (delta: number) => {
      if (!visible.length) return;
      const i = currentIndex < 0 ? 0 : currentIndex;
      select(visible[Math.min(visible.length - 1, Math.max(0, i + delta))].id);
    },
    [visible, currentIndex, select],
  );

  const seek = useCallback(
    (t: number) => {
      const idx = nearestIndex(visible, t);
      if (idx >= 0) select(visible[idx].id);
    },
    [visible, select],
  );

  const changeDate = (next: string | undefined) => {
    if (!next || next === date) return;
    setLive(false);
    setPlaying(false);
    if (current) pendingTime.current = utcTime(current.t);
    setDate(next);
  };

  const changeCamera = (id: string) => {
    if (current) pendingTime.current = utcTime(current.t);
    setPlaying(false);
    setCameraId(id);
  };

  const toggleLive = () => {
    if (live) setLive(false);
    else {
      setLive(true);
      setFilters(NO_FILTERS);
    }
  };

  const togglePlay = () => {
    setLive(false);
    setPlaying((p) => !p);
  };

  const prevDate = dates && date ? [...dates].reverse().find((d) => d < date) : undefined;
  const nextDate = dates && date ? dates.find((d) => d > date) : undefined;

  // Playback: loops over the visible (filtered) frames.
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setCurrentId((cur) => {
        const list = visibleRef.current;
        if (!list.length) return cur;
        const i = list.findIndex((f) => f.id === cur);
        return list[(i + 1) % list.length].id;
      });
    }, 1000 / fps);
    return () => clearInterval(id);
  }, [playing, fps]);

  usePreload(
    useMemo(
      () =>
        currentIndex < 0
          ? []
          : visible
              .slice(currentIndex + 1, currentIndex + (playing ? 1 + Math.ceil(fps / 2) : 3))
              .filter((f) => f.thumb)
              .map((f) => archive.source.url(f.thumb!)),
      [visible, currentIndex, playing, fps, archive],
    ),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, select, textarea")) return;
      const n = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowRight") step(n);
      else if (e.key === "ArrowLeft") step(-n);
      else if (e.key === "Home") step(-Infinity);
      else if (e.key === "End") step(Infinity);
      else if (e.key === " ") togglePlay();
      else if (e.key === "l") toggleLive();
      else if (e.key === "o") setOverlay((o) => !o);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const availableFields = useMemo(() => {
    const keys = new Set<string>();
    let n = 0;
    for (const m of metaMap.values()) {
      for (const k of Object.keys(numericFields(m))) keys.add(k);
      if (++n > 50) break;
    }
    const known = Object.keys(KNOWN_FIELDS).filter((k) => keys.has(k));
    return [...known, ...[...keys].filter((k) => !KNOWN_FIELDS[k]).sort()];
  }, [metaMap]);
  const chartFieldsShown = chartFields.filter((k) => !availableFields.length || availableFields.includes(k));

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="./" title={t("viewer.home")}>
          <img src="./favicon.svg" alt="" />
          <span>{title ?? "Caelum Viewer"}</span>
        </a>
        {cameras.length > 1 ? (
          <select value={cameraId} onChange={(e) => changeCamera(e.target.value)}>
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="camera-name">{camera.name}</span>
        )}
        {camera.link && (
          <a className="btn" href={camera.link} target="_blank" rel="noreferrer" title={camera.link}>
            {t("viewer.cameraLink")}
          </a>
        )}
        <div className="date-nav">
          <button disabled={!prevDate} onClick={() => changeDate(prevDate)} title={t("viewer.prevDay")}>
            <Icon name="prev" />
          </button>
          <input
            type="date"
            value={date ?? ""}
            min={dates?.[0]}
            max={todayUtc()}
            onChange={(e) => changeDate(e.target.value)}
          />
          <button disabled={!nextDate} onClick={() => changeDate(nextDate)} title={t("viewer.nextDay")}>
            <Icon name="next" />
          </button>
          <button onClick={() => changeDate(todayUtc())} title={t("viewer.todayTitle")}>
            {t("viewer.today")}
          </button>
        </div>
        <button className={`live${live ? " on" : ""}`} onClick={toggleLive} title={t("viewer.liveTitle")}>
          ● Live
        </button>
        <span className="muted small status">
          {loadingFrames
            ? t("viewer.loadingList")
            : metaStatus === "loading"
              ? t("viewer.metadataProgress", { done: wantedMeta.length - pending, total: wantedMeta.length })
              : tn("frames", frames.length)}
          {dates && date && !dates.includes(date) && !loadingFrames && t("viewer.noDataForDay")}
        </span>
        <a className="topbar-link" href={VIEWER_DOCS_URL} target="_blank" rel="noreferrer">
          {t("viewer.docs")}
        </a>
        <LangSwitch />
      </header>

      {error && (
        <div className="error">
          {error}
          <button className="link" onClick={() => setError(undefined)}>
            ×
          </button>
        </div>
      )}

      <main className="layout">
        <div className="stage">
          <ImageViewer
            frame={current}
            src={current?.thumb ? archive.source.url(current.thumb) : undefined}
            meta={current ? metaMap.get(current.id) : undefined}
            cameraName={camera.name}
            showOverlay={overlay}
            live={live}
          />
          <div className="transport">
            <button onClick={() => step(-Infinity)} title={t("viewer.first")}><Icon name="first" /></button>
            <button onClick={() => step(-1)} title={t("viewer.prev")}><Icon name="prev" /></button>
            <button className="play" onClick={togglePlay} title={t("viewer.play")} disabled={!visible.length}>
              <Icon name={playing ? "pause" : "play"} />
            </button>
            <button onClick={() => step(1)} title={t("viewer.next")}><Icon name="next" /></button>
            <button onClick={() => step(Infinity)} title={t("viewer.last")}><Icon name="last" /></button>
            <select value={fps} onChange={(e) => setFps(Number(e.target.value))} title={t("viewer.speed")}>
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {t("viewer.fps", { n: s })}
                </option>
              ))}
            </select>
            <span className="pos">
              {current ? `${utcTime(current.t)} UTC` : "—"}
              <span className="muted"> · {currentIndex + 1}/{visible.length}</span>
            </span>
            <label className="small">
              <input type="checkbox" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} /> {t("viewer.overlay")}
            </label>
          </div>
          {date && (
            <Timeline
              date={date}
              frames={frames}
              visible={visibleIds}
              metaMap={metaMap}
              currentT={current?.t}
              onSeek={seek}
            />
          )}
        </div>

        <aside className="side">
          <MetadataPanel frame={current} meta={current ? metaMap.get(current.id) : undefined} source={archive.source} />
          <FilterPanel
            filters={filters}
            available={availableFields}
            total={frames.length}
            shown={visible.length}
            metaStatus={metaStatus}
            onLoadMetadata={() => setMetaRequested(true)}
            onChange={(f) => {
              setLive(false);
              setFilters(f);
            }}
          />
        </aside>

        <section className="bottom">
          <div className="tabs">
            <button className={tab === "gallery" ? "on" : ""} aria-expanded={tab === "gallery"} onClick={() => toggleTab("gallery")}>
              {t("viewer.gallery", { n: visible.length })}
            </button>
            <button className={tab === "charts" ? "on" : ""} aria-expanded={tab === "charts"} onClick={() => toggleTab("charts")} title={t("viewer.chartsTitle")}>
              {t("viewer.charts")}
            </button>
          </div>
          {tab === "charts" && (
            <Charts
              frames={visible}
              metaMap={metaMap}
              fields={chartFieldsShown}
              available={availableFields}
              currentId={current?.id}
              onSelect={select}
              onFieldsChange={setChartFields}
            />
          )}
          {tab === "gallery" && (
            <Gallery frames={visible} metaMap={metaMap} source={archive.source} currentId={current?.id} onSelect={select} />
          )}
        </section>
      </main>
    </div>
  );
}
