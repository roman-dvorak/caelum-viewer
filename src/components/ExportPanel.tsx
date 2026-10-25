import { useEffect, useRef, useState } from "react";
import type { Frame } from "../data/archive";
import type { DataSource } from "../data/types";
import { canEncodeVideo, exportName, exportVideo, exportZip, saveBlob, type ExportProgress } from "../lib/exporter";
import { t, tn } from "../lib/i18n";
import { utcTime } from "../lib/time";

interface Props {
  /** Frames to export: the section (or the whole day) after the filters. */
  frames: Frame[];
  range: { from: number; to: number } | null;
  filtered: boolean;
  source: DataSource;
  cameraName: string;
  fps: number;
  speeds: number[];
}

const SIZES = [720, 1080, 2160, 0];

export function ExportPanel({ frames, range, filtered, source, cameraName, fps: playbackFps, speeds }: Props) {
  const [fps, setFps] = useState(playbackFps);
  const [size, setSize] = useState(1080);
  const [stamp, setStamp] = useState(true);
  const [withJson, setWithJson] = useState(false);
  const [progress, setProgress] = useState<ExportProgress & { kind: "video" | "zip" }>();
  const [message, setMessage] = useState<{ error: boolean; text: string }>();
  const ctl = useRef<AbortController>(undefined);
  const videoOk = canEncodeVideo();

  useEffect(() => () => ctl.current?.abort(), []);

  const run = async (kind: "video" | "zip") => {
    const abort = new AbortController();
    ctl.current = abort;
    setMessage(undefined);
    setProgress({ kind, done: 0, total: frames.length });
    const list = frames;
    const onProgress = (p: ExportProgress) => setProgress({ kind, ...p });
    try {
      const res =
        kind === "video"
          ? await exportVideo({ frames: list, source, fps, maxSize: size, stamp: stamp ? cameraName : undefined, onProgress, signal: abort.signal })
          : await exportZip({ frames: list, source, withJson, onProgress, signal: abort.signal });
      saveBlob(res.blob, `${exportName(cameraName, list)}.${res.ext}`);
      setMessage(res.skipped ? { error: true, text: t("export.skipped", { n: res.skipped }) } : undefined);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setMessage({ error: true, text: t("export.failed", { msg: (e as Error).message }) });
    } finally {
      if (ctl.current === abort) ctl.current = undefined;
      setProgress(undefined);
    }
  };

  const busy = !!progress;
  const empty = !frames.length;

  return (
    <section className="panel export">
      <h3>
        {t("export.title")}
        <span className="muted small">
          {range ? `${utcTime(range.from)}–${utcTime(range.to)} UTC` : t("export.wholeDay")} · {tn("frames", frames.length)}
        </span>
      </h3>
      <p className="hint">
        {range ? t("export.rangeSet") : t("export.rangeHint")}
        {filtered && ` ${t("export.filtered")}`}
      </p>

      <div className="export-row">
        <label className="small">
          {t("export.fps")}{" "}
          <select value={fps} onChange={(e) => setFps(Number(e.target.value))} disabled={busy}>
            {speeds.map((s) => (
              <option key={s} value={s}>
                {t("viewer.fps", { n: s })}
              </option>
            ))}
          </select>
        </label>
        <label className="small">
          {t("export.size")}{" "}
          <select value={size} onChange={(e) => setSize(Number(e.target.value))} disabled={busy}>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s ? `${s} px` : t("export.sizeOriginal")}
              </option>
            ))}
          </select>
        </label>
        <label className="small">
          <input type="checkbox" checked={stamp} onChange={(e) => setStamp(e.target.checked)} disabled={busy} /> {t("export.stamp")}
        </label>
      </div>
      <div className="export-row">
        <button className="btn primary" onClick={() => run("video")} disabled={busy || empty || !videoOk}>
          {t("export.video")}
        </button>
        <span className="muted small">{t("export.duration", { s: (frames.length / fps).toFixed(1) })}</span>
      </div>
      {!videoOk && <p className="hint">{t("export.noVideo")}</p>}

      <div className="export-row">
        <button onClick={() => run("zip")} disabled={busy || empty}>
          {t("export.zip")}
        </button>
        <label className="small">
          <input type="checkbox" checked={withJson} onChange={(e) => setWithJson(e.target.checked)} disabled={busy} /> {t("export.json")}
        </label>
      </div>

      {progress && (
        <div className="export-progress">
          <progress value={progress.done} max={progress.total || 1} />
          <span className="small muted">
            {t(progress.kind === "video" ? "export.encoding" : "export.packing", { done: progress.done, total: progress.total })}
          </span>
          <button className="link" onClick={() => ctl.current?.abort()}>
            {t("export.cancel")}
          </button>
        </div>
      )}
      {message && <p className={message.error ? "hint export-error" : "hint"}>{message.text}</p>}
    </section>
  );
}
