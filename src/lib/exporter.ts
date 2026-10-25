import type { Frame } from "../data/archive";
import { fetchOk } from "../data/fetch";
import type { DataSource } from "../data/types";
import { t } from "./i18n";
import { utcDate, utcTime } from "./time";

/**
 * Export of a run of frames, entirely in the browser: an MP4 (WebM as a
 * fallback) encoded with WebCodecs, or a ZIP of the original previews. Both
 * libraries are loaded only when an export starts.
 */

export interface ExportProgress {
  done: number;
  total: number;
}

interface Common {
  frames: Frame[];
  source: DataSource;
  onProgress: (p: ExportProgress) => void;
  signal: AbortSignal;
}

export interface VideoOptions extends Common {
  fps: number;
  /** Longer side of the video in pixels; 0 keeps the original size. */
  maxSize: number;
  /** Camera name and capture time burnt into the picture, like the overlay. */
  stamp?: string;
}

export interface ZipOptions extends Common {
  withJson: boolean;
}

export interface ExportResult {
  blob: Blob;
  ext: string;
  /** Frames that failed to download and were left out. */
  skipped: number;
}

const LOOK_AHEAD = 6;

export function canEncodeVideo(): boolean {
  return typeof VideoEncoder !== "undefined";
}

/** `{base}_{date}_{from}-{to}` from the first and last frame. */
export function exportName(cameraName: string, frames: Frame[]): string {
  const slug = cameraName.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "-").replace(/^-|-$/g, "") || "camera";
  const hms = (t: number) => utcTime(t).replaceAll(":", "");
  const first = frames[0].t;
  return `${slug}_${utcDate(first)}_${hms(first)}-${hms(frames[frames.length - 1].t)}`;
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Downloads `items` in order with a few requests ahead, so encoding (which
 * needs the frames in order) overlaps with the network. A failed item yields
 * its error instead of a value.
 */
async function* inOrder<T, R>(
  items: T[],
  load: (item: T) => Promise<R>,
  signal: AbortSignal,
): AsyncGenerator<[T, R | Error]> {
  const settle = (item: T) => load(item).then((v) => v, (e: Error) => e);
  const queue = items.slice(0, LOOK_AHEAD).map(settle);
  for (let i = 0; i < items.length; i++) {
    signal.throwIfAborted();
    const result = await queue[i];
    if (i + LOOK_AHEAD < items.length) queue.push(settle(items[i + LOOK_AHEAD]));
    yield [items[i], result];
  }
}

async function fetchBytes(url: string, signal: AbortSignal): Promise<Blob> {
  return (await fetchOk(url, { signal })).blob();
}

function even(n: number): number {
  return Math.max(2, Math.round(n / 2) * 2);
}

export async function exportVideo(opts: VideoOptions): Promise<ExportResult> {
  const { frames, source, fps, maxSize, stamp, onProgress, signal } = opts;
  const withPreview = frames.filter((f) => f.thumb);
  if (!withPreview.length) throw new Error(t("export.nothing"));
  const mb = await import("mediabunny");

  let skipped = 0;
  let firstError: Error | undefined;
  let canvas: HTMLCanvasElement | undefined;
  let g: CanvasRenderingContext2D | undefined;
  let output: InstanceType<typeof mb.Output> | undefined;
  let videoSource: InstanceType<typeof mb.CanvasSource> | undefined;
  let ext = "mp4";
  let n = 0;
  onProgress({ done: 0, total: withPreview.length });

  try {
    const load = async (f: Frame) => createImageBitmap(await fetchBytes(source.url(f.thumb!), signal));
    for await (const [frame, bmp] of inOrder(withPreview, load, signal)) {
      if (bmp instanceof Error) {
        if (bmp.name === "AbortError") throw bmp;
        skipped++;
        firstError ??= bmp;
      } else {
        if (!canvas) {
          // The first frame sets the size; later ones are fitted into it.
          const scale = maxSize ? Math.min(1, maxSize / Math.max(bmp.width, bmp.height)) : 1;
          canvas = document.createElement("canvas");
          canvas.width = even(bmp.width * scale);
          canvas.height = even(bmp.height * scale);
          g = canvas.getContext("2d")!;
          const size = { width: canvas.width, height: canvas.height, quality: mb.QUALITY_HIGH };
          const codec = await mb.getFirstEncodableVideoCodec(["avc", "vp9", "av1", "vp8"], size);
          if (!codec) throw new Error(t("export.noCodec", { w: canvas.width, h: canvas.height }));
          ext = codec === "vp8" ? "webm" : "mp4";
          output = new mb.Output({
            format: ext === "mp4" ? new mb.Mp4OutputFormat({ fastStart: "in-memory" }) : new mb.WebMOutputFormat(),
            target: new mb.BufferTarget(),
          });
          videoSource = new mb.CanvasSource(canvas, { codec, quality: mb.QUALITY_HIGH, keyFrameInterval: 2 });
          output.addVideoTrack(videoSource, { frameRate: fps });
          await output.start();
        }
        draw(g!, bmp, stamp ? [stamp, `${utcDate(frame.t)} ${utcTime(frame.t)} UTC`] : undefined);
        bmp.close();
        await videoSource!.add(n / fps, 1 / fps);
        n++;
      }
      onProgress({ done: n + skipped, total: withPreview.length });
    }
    if (!output) throw firstError ?? new Error(t("export.nothing"));
    await output.finalize();
  } catch (e) {
    if (output && output.state !== "finalized") await output.cancel().catch(() => {});
    throw e;
  }
  const buffer = (output.target as InstanceType<typeof mb.BufferTarget>).buffer!;
  return { blob: new Blob([buffer], { type: ext === "mp4" ? "video/mp4" : "video/webm" }), ext, skipped };
}

function draw(g: CanvasRenderingContext2D, bmp: ImageBitmap, lines?: string[]) {
  const { width: w, height: h } = g.canvas;
  g.fillStyle = "#000";
  g.fillRect(0, 0, w, h);
  const k = Math.min(w / bmp.width, h / bmp.height);
  const dw = bmp.width * k;
  const dh = bmp.height * k;
  g.drawImage(bmp, (w - dw) / 2, (h - dh) / 2, dw, dh);
  if (!lines) return;
  const size = Math.max(12, Math.round(Math.min(w, h) / 40));
  g.font = `600 ${size}px "JetBrains Mono", ui-monospace, monospace`;
  g.textBaseline = "top";
  g.fillStyle = "#fff";
  g.shadowColor = "#000";
  g.shadowBlur = size / 3;
  lines.forEach((line, i) => g.fillText(line, size * 0.6, size * 0.5 + i * size * 1.3));
  g.shadowBlur = 0;
}

export async function exportZip(opts: ZipOptions): Promise<ExportResult> {
  const { frames, source, withJson, onProgress, signal } = opts;
  const files = frames.flatMap((f) => [f.thumb, withJson ? (f.meta ?? f.rawMeta) : undefined].filter((p): p is string => !!p));
  if (!files.length) throw new Error(t("export.nothing"));
  const { Zip, ZipPassThrough } = await import("fflate");

  const parts: Uint8Array[] = [];
  let zipError: Error | null = null;
  // Previews are already compressed, so the files are only stored.
  const zip = new Zip((err, chunk) => {
    if (err) zipError = err;
    else parts.push(chunk);
  });
  const names = new Set<string>();
  let skipped = 0;
  let firstError: Error | undefined;
  let done = 0;
  onProgress({ done: 0, total: files.length });

  const load = async (path: string) => new Uint8Array(await (await fetchBytes(source.url(path), signal)).arrayBuffer());
  for await (const [path, data] of inOrder(files, load, signal)) {
    if (data instanceof Error) {
      if (data.name === "AbortError") throw data;
      skipped++;
      firstError ??= data;
    } else {
      let name = path.split("/").pop() || path;
      while (names.has(name)) name = `_${name}`;
      names.add(name);
      const entry = new ZipPassThrough(name);
      zip.add(entry);
      entry.push(data, true);
    }
    onProgress({ done: ++done, total: files.length });
  }
  if (skipped === files.length) throw firstError!;
  zip.end();
  if (zipError) throw zipError;
  return { blob: new Blob(parts as BlobPart[], { type: "application/zip" }), ext: "zip", skipped };
}
