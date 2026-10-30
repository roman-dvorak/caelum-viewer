import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CameraArchive, type Frame, type FrameMeta } from "../data/archive";
import { createDataSource } from "../data/factory";
import type { CameraConfig } from "../data/types";
import { VIEWER_DOCS_URL } from "../lib/brand";
import { useLoadedImage, usePreload } from "../lib/hooks";
import { ago, t, tn } from "../lib/i18n";
import { timeSlots } from "../lib/overview";
import { rememberCamera } from "../lib/recent";
import { liveStaleness, nearestIndex, parseTimeOnDate, todayUtc, utcDate, utcTime } from "../lib/time";
import { updateParams, type ViewParams } from "../lib/urlState";
import { AboutDialog } from "./AboutDialog";
import { CameraInfo } from "./CameraInfo";
import { Icon } from "./Icon";
import { LangSwitch } from "./LangSwitch";
import { TopMenu } from "./TopMenu";
import { Timeline } from "./Timeline";

interface Props {
  cameras: CameraConfig[];
  title?: string;
  description?: string;
  initial: ViewParams;
  /** Opens one camera, at `time` (HH:MM:SS UTC) of the shown day. */
  onOpen: (cameraId: string, time?: string) => void;
}

const LIVE_POLL_MS = 30_000;
const SPEEDS = [1, 2, 5, 10];
/** A tile whose nearest frame is further than this from the shared time is dimmed… */
const FAR_MS = 15 * 60_000;
/** …and further than this, not shown at all: the camera has nothing for that time. */
const HIDE_MS = 60 * 60_000;
/** Offsets below this aren't worth showing next to the frame time. */
const NEAR_MS = 90_000;
const NO_META = new Map<string, FrameMeta>();
const NO_FRAMES: Frame[] = [];
const NO_IDS = new Set<string>();

/**
 * All cameras of a catalog side by side, each showing its frame nearest to
 * one shared time; a single timeline at the bottom moves them all, and each
 * tile opens its camera in the full viewer.
 */
export function Overview({ cameras, title, description, initial, onOpen }: Props) {
  const archives = useMemo(() => cameras.map((c) => new CameraArchive(createDataSource(c.source), c.layout)), [cameras]);
  const empty = <T,>(v: T) => cameras.map(() => v);

  const [live, setLive] = useState(initial.live === "1");
  const [date, setDate] = useState<string | undefined>(live ? todayUtc() : initial.date);
  const [dates, setDates] = useState<(string[] | null)[]>(() => empty(null));
  const [frames, setFrames] = useState<(Frame[] | null)[]>(() => empty(null));
  const [errors, setErrors] = useState<(string | undefined)[]>(() => empty(undefined));
  /** Shared time all tiles follow; undefined: each camera's newest frame (live, or before the lists arrive). */
  const [at, setAt] = useState<number>();
  const [playing, setPlaying] = useState(false);
  const [fps, setFps] = useState(2);
  const [about, setAbout] = useState(false);
  /** Camera shown enlarged over the page, by index. */
  const [zoomed, setZoomed] = useState<number>();
  const bar = useRef<HTMLElement>(null);
  const [now, setNow] = useState(Date.now);
  /** Time of day (HH:MM:SS) to show once the next day is chosen. */
  const pendingTime = useRef<string | undefined>(initial.time);

  const setAtIndex = <T,>(set: React.Dispatch<React.SetStateAction<T[]>>, i: number, v: NoInfer<T>) =>
    set((old) => old.map((x, j) => (j === i ? v : x)));

  // --- dates of every camera ------------------------------------------------
  useEffect(() => {
    const ctl = new AbortController();
    Promise.allSettled(
      archives.map((a, i) =>
        a.listDates(ctl.signal).then(
          (d) => {
            setAtIndex(setDates, i, d);
            return d;
          },
          (e: Error) => {
            if (e.name !== "AbortError") setAtIndex(setErrors, i, e.message);
            throw e;
          },
        ),
      ),
    ).then((res) => {
      if (ctl.signal.aborted) return;
      const last = res.flatMap((r) => (r.status === "fulfilled" ? r.value.slice(-1) : [])).sort().at(-1);
      setDate((cur) => cur ?? last ?? todayUtc());
    });
    return () => ctl.abort();
  }, [archives]);

  // --- frames of the chosen day ------------------------------------------------
  useEffect(() => {
    if (!date) return;
    const ctl = new AbortController();
    const time = pendingTime.current;
    setFrames(empty(null));
    setAt(time ? parseTimeOnDate(date, time) : undefined);
    Promise.allSettled(
      archives.map((a, i) =>
        a.listFrames(date, ctl.signal).then(
          (list) => {
            setAtIndex(setFrames, i, list);
            setAtIndex(setErrors, i, undefined);
            return list;
          },
          (e: Error) => {
            if (e.name === "AbortError") throw e;
            setAtIndex(setFrames, i, []);
            setAtIndex(setErrors, i, e.message);
            throw e;
          },
        ),
      ),
    ).then((res) => {
      if (ctl.signal.aborted) return;
      // Cleared only now: an aborted run (a quick day change, StrictMode) must not lose it.
      pendingTime.current = undefined;
      if (live) return;
      // No time asked for: start at the newest frame of any camera.
      const newest = Math.max(...res.flatMap((r) => (r.status === "fulfilled" && r.value.length ? [r.value[r.value.length - 1].t] : [])));
      if (Number.isFinite(newest)) setAt((cur) => cur ?? newest);
    });
    return () => ctl.abort();
  }, [archives, date]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- live: every camera's newest frame ---------------------------------------
  useEffect(() => {
    if (!live) return;
    setPlaying(false);
    setAt(undefined);
    const tick = () => {
      setNow(Date.now());
      const today = todayUtc();
      if (date !== today) {
        setDate(today);
        return;
      }
      archives.forEach((a, i) =>
        a
          .listFrames(today)
          .then((list) =>
            setFrames((old) =>
              old.map((x, j) => (j !== i || (x?.length === list.length && x.at(-1)?.id === list.at(-1)?.id) ? x : list)),
            ),
          )
          .catch(() => {}),
      );
    };
    tick();
    const id = setInterval(tick, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [live, archives, date]);

  // --- URL and the recent list -----------------------------------------------------
  useEffect(() => {
    rememberCamera(title ?? t("data.catalog"), undefined, { ...initial, camera: undefined });
  }, [title, initial]);

  useEffect(() => {
    updateParams({
      camera: undefined,
      date: live ? undefined : date,
      time: !live && at !== undefined ? utcTime(at) : undefined,
      live: live ? "1" : undefined,
      from: undefined,
      to: undefined,
    });
  }, [date, at, live]);

  // --- the shared timeline -------------------------------------------------------
  const slots = useMemo(() => timeSlots(frames.map((f) => f ?? [])).map((x) => ({ t: x })), [frames]);
  const allFrames = useMemo(() => frames.flatMap((f) => f ?? []).sort((a, b) => a.t - b.t), [frames]);
  const nearest = frames.map((list) =>
    !list?.length ? undefined : at === undefined ? list[list.length - 1] : list[nearestIndex(list, at)],
  );
  /** Frame each tile shows: none when the camera has nothing within an hour of the shared time. */
  const shown = nearest.map((f) => (f && at !== undefined && Math.abs(f.t - at) > HIDE_MS ? undefined : f));
  const newestShown = Math.max(...shown.map((f) => f?.t ?? -Infinity));
  const cursor = at ?? (Number.isFinite(newestShown) ? newestShown : undefined);
  const loaded = frames.filter((f) => f !== null).length;

  const seek = useCallback((time: number) => {
    setLive(false);
    setAt(time);
  }, []);

  const step = (delta: number) => {
    if (!slots.length) return;
    const i = cursor === undefined ? slots.length - 1 : nearestIndex(slots, cursor);
    seek(slots[Math.min(slots.length - 1, Math.max(0, i + delta))].t);
  };

  const changeDate = (next: string | undefined) => {
    if (!next || next === date) return;
    setLive(false);
    setPlaying(false);
    if (cursor !== undefined) pendingTime.current = utcTime(cursor);
    setDate(next);
  };

  const toggleLive = () => setLive((l) => !l);
  const togglePlay = () => {
    setLive(false);
    setPlaying((p) => !p);
  };

  const allDates = useMemo(() => [...new Set(dates.flatMap((d) => d ?? []))].sort(), [dates]);
  const prevDate = date ? [...allDates].reverse().find((d) => d < date) : undefined;
  const nextDate = date ? allDates.find((d) => d > date) : undefined;

  // Playback: through the shared steps, looping over the day.
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setAt((cur) => {
        const list = slotsRef.current;
        if (!list.length) return cur;
        const next = list.find((s) => s.t > (cur ?? Infinity));
        return (next ?? list[0]).t;
      });
    }, 1000 / fps);
    return () => clearInterval(id);
  }, [playing, fps]);

  usePreload(
    useMemo(
      () =>
        frames.flatMap((list, i) => {
          const f = shown[i];
          if (!list || !f) return [];
          const k = list.indexOf(f);
          return list
            .slice(k + 1, k + (playing ? 2 + fps : 2))
            .filter((x) => x.thumb)
            .map((x) => archives[i].source.url(x.thumb!));
        }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [frames, shown.map((f) => f?.id).join("|"), playing, fps, archives],
    ),
  );

  const tiles: TileProps[] = cameras.map((camera, i) => {
    const f = shown[i];
    const list = frames[i];
    const offset = f && at !== undefined ? f.t - at : 0;
    const lastT = list?.at(-1)?.t;
    return {
      camera,
      frame: f,
      src: f?.thumb ? archives[i].source.url(f.thumb) : undefined,
      loading: list === null,
      error: errors[i],
      noneNear: !f && !!nearest[i],
      offset: Math.abs(offset) >= NEAR_MS ? offset : 0,
      far: Math.abs(offset) > FAR_MS,
      live,
      stale: live && list ? (lastT === undefined ? "none" : liveStaleness(lastT, now)) : null,
      lastT,
      now,
      onOpen: () => onOpen(camera.id, live ? undefined : f ? utcTime(f.t) : at !== undefined ? utcTime(at) : undefined),
    };
  });

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
      else if (e.key === "Escape" && zoomed !== undefined) setZoomed(undefined);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="app overview">
      <header className="topbar">
        <a className="brand" href="./" title={t("viewer.home")}>
          <img src="./favicon.svg" alt="" />
          <span>{title ?? "Caelum Viewer"}</span>
        </a>
        <span className="muted small">{tn("cameras", cameras.length)}</span>
        <div className="date-nav">
          <button disabled={!prevDate} onClick={() => changeDate(prevDate)} title={t("viewer.prevDay")}>
            <Icon name="prev" />
          </button>
          <input type="date" value={date ?? ""} min={allDates[0]} max={todayUtc()} onChange={(e) => changeDate(e.target.value)} />
          <button disabled={!nextDate} onClick={() => changeDate(nextDate)} title={t("viewer.nextDay")}>
            <Icon name="next" />
          </button>
          <button onClick={() => changeDate(todayUtc())} title={t("viewer.todayTitle")}>
            {t("viewer.today")}
          </button>
        </div>
        <button className={`live${live ? " on" : ""}`} onClick={toggleLive} title={t("overview.liveTitle")}>
          ● Live
        </button>
        <TopMenu>
          <span className="muted small status">
            {loaded < cameras.length ? t("overview.loading", { done: loaded, total: cameras.length }) : tn("frames", allFrames.length)}
          </span>
          <a className="topbar-link" href={VIEWER_DOCS_URL} target="_blank" rel="noreferrer">
            {t("viewer.docs")}
          </a>
          <button type="button" onClick={() => setAbout(true)} title={t("viewer.aboutTitle")}>
            {t("viewer.about")}
          </button>
          <LangSwitch />
        </TopMenu>
      </header>
      {about && <AboutDialog onClose={() => setAbout(false)} />}

      {description && <p className="overview-desc">{description}</p>}

      <main className="tiles">
        {tiles.map((p, i) => (
          <Tile key={p.camera.id} {...p} onZoom={() => setZoomed(i)} />
        ))}
      </main>
      {zoomed !== undefined && tiles[zoomed] && (
        <Lightbox {...tiles[zoomed]} bottom={bar.current?.offsetHeight ?? 0} onClose={() => setZoomed(undefined)} />
      )}

      <footer className="overview-bar" ref={bar}>
        <div className="transport">
          <button onClick={() => step(-Infinity)} title={t("viewer.first")}><Icon name="first" /></button>
          <button onClick={() => step(-1)} title={t("viewer.prev")}><Icon name="prev" /></button>
          <button className="play" onClick={togglePlay} title={t("viewer.play")} disabled={!slots.length}>
            <Icon name={playing ? "pause" : "play"} />
          </button>
          <button onClick={() => step(1)} title={t("viewer.next")}><Icon name="next" /></button>
          <button onClick={() => step(Infinity)} title={t("viewer.last")}><Icon name="last" /></button>
          <select value={fps} onChange={(e) => setFps(Number(e.target.value))} title={t("overview.speed")}>
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {t("overview.sps", { n: s })}
              </option>
            ))}
          </select>
          <span className="pos">
            {live ? t("overview.newest") : cursor !== undefined ? `${utcTime(cursor)} UTC` : "—"}
          </span>
        </div>
        {date && (
          // A plain time axis: frame ticks of several cameras would only be noise here.
          <Timeline date={date} frames={NO_FRAMES} visible={NO_IDS} metaMap={NO_META} currentT={cursor} onSeek={seek} />
        )}
      </footer>
    </div>
  );
}

interface TileProps {
  camera: CameraConfig;
  frame?: Frame;
  src?: string;
  loading: boolean;
  error?: string;
  /** The camera has frames this day, but none within an hour of the shared time. */
  noneNear: boolean;
  /** Shown frame minus the shared time, ms (0 when close enough not to mention). */
  offset: number;
  far: boolean;
  live: boolean;
  stale: "day" | "hour" | "none" | null;
  lastT?: number;
  now: number;
  onOpen: () => void;
}

function Tile(p: TileProps & { onZoom: () => void }) {
  const { camera, src, error, far, live, stale, lastT, now, onOpen, onZoom } = p;
  const img = useLoadedImage(src);
  return (
    <article className={`cam-tile${far ? " far" : ""}${live ? " is-live" : ""}`}>
      <div className="cam-tile-img">
        <button type="button" className="cam-tile-hit" onClick={onZoom} title={t("overview.zoomTitle", { name: camera.name })}>
          {img.shown && <img src={img.shown} alt={camera.name} />}
          {!img.shown && <span className="cam-tile-msg">{message(p, img.error)}</span>}
          {img.loading && <span className="viewer-spinner" />}
        </button>
        {img.shown && (
          <button type="button" className="cam-tile-zoom" onClick={onZoom} title={t("overview.zoomTitle", { name: camera.name })}>
            <Icon name="zoom" />
          </button>
        )}
      </div>
      <div className="cam-tile-foot">
        <div className="cam-tile-text">
          <strong className="cam-tile-name">{camera.name}</strong>
          <FrameTime {...p} />
          {stale && (
            <span className={`cam-tile-stale ${stale}`}>
              {stale === "none" ? t("overview.staleNone") : t("overview.stale", { age: ago(lastT!, now) })}
            </span>
          )}
          {error && <span className="cam-tile-error" title={error}>{error}</span>}
        </div>
        <CameraInfo camera={camera} />
        <button type="button" className="btn" onClick={onOpen}>
          {t("overview.open")}
        </button>
      </div>
    </article>
  );
}

/** Full-page view of one camera; follows the shared time like its tile. */
function Lightbox(p: TileProps & { bottom: number; onClose: () => void }) {
  const { camera, src, onOpen, onClose, bottom } = p;
  const img = useLoadedImage(src);
  return (
    <div className="lightbox" style={{ bottom }} role="dialog" aria-modal="true" aria-label={camera.name} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lightbox-head">
        <strong className="cam-tile-name">{camera.name}</strong>
        <FrameTime {...p} />
        <span className="lightbox-tools">
          <button type="button" className="btn" onClick={onOpen}>
            {t("overview.open")}
          </button>
          <button type="button" onClick={onClose} title={t("overview.close")}>
            <Icon name="close" />
          </button>
        </span>
      </div>
      <div className="lightbox-img" onClick={(e) => e.target === e.currentTarget && onClose()}>
        {img.shown ? <img src={img.shown} alt={camera.name} /> : <span className="cam-tile-msg">{message(p, img.error)}</span>}
        {img.loading && <span className="viewer-spinner" />}
      </div>
    </div>
  );
}

function FrameTime({ frame, offset, live }: TileProps) {
  const minutes = Math.round(offset / 60_000);
  return (
    <span className="cam-tile-time">
      {frame ? `${live ? `${utcDate(frame.t)} ` : ""}${utcTime(frame.t)} UTC` : "—"}
      {minutes !== 0 && <span className="cam-tile-offset"> ({minutes > 0 ? "+" : "−"}{formatMinutes(Math.abs(minutes))})</span>}
    </span>
  );
}

/** Why there is no picture. */
function message({ loading, error, frame, noneNear, src }: TileProps, imgError: boolean): string {
  if (loading) return t("viewer.loadingList");
  if (error) return t("overview.error");
  if (noneNear) return t("overview.noneNear");
  if (!frame) return t("overview.noFrames");
  if (!src) return t("viewer.noPreview");
  return imgError ? t("viewer.previewFailed") : "";
}

/** "12 min", "3 h 05 min". */
function formatMinutes(n: number): string {
  return n < 60 ? t("overview.min", { n }) : t("overview.hmin", { h: Math.floor(n / 60), m: String(n % 60).padStart(2, "0") });
}
