import type { CameraConfig, SourceConfig } from "../data/types";

/** Everything the viewer keeps in the query string, so a view can be bookmarked. */
export interface ViewParams {
  catalog?: string;
  camera?: string;
  type?: string;
  source?: string;
  endpoint?: string;
  bucket?: string;
  prefix?: string;
  style?: string;
  name?: string;
  /** Link to the camera's own web interface. */
  link?: string;
  thumbnails?: string;
  raw?: string;
  date?: string;
  time?: string;
  live?: string;
}

const KEYS: (keyof ViewParams)[] = [
  "catalog", "type", "source", "endpoint", "bucket", "prefix", "style", "name",
  "link", "thumbnails", "raw", "camera", "date", "time", "live",
];

export function readParams(search = location.search): ViewParams {
  const q = new URLSearchParams(search);
  const out: ViewParams = {};
  for (const k of KEYS) {
    const v = q.get(k);
    if (v) out[k] = v;
  }
  return out;
}

export function buildSearch(params: ViewParams): string {
  // Keep `:` and `/` readable — the URL is meant to be copied and shared.
  const parts = KEYS.filter((k) => params[k]).map(
    (k) => `${k}=${encodeURIComponent(params[k]!).replace(/%3A/gi, ":").replace(/%2F/gi, "/")}`,
  );
  return parts.length ? `?${parts.join("&")}` : "";
}

/** Merges `patch` into the current query string without adding history entries. */
export function updateParams(patch: Partial<ViewParams>): void {
  const next = { ...readParams(), ...patch };
  for (const k of KEYS) if (!next[k]) delete next[k];
  const search = buildSearch(next);
  if (search !== location.search) history.replaceState(null, "", `${location.pathname}${search}${location.hash}`);
}

/** A single camera described directly by URL parameters (no catalog). */
export function cameraFromParams(p: ViewParams): CameraConfig | undefined {
  let source: SourceConfig;
  switch (p.type) {
    case "s3":
      source = { type: "s3", endpoint: p.endpoint, bucket: p.bucket, url: p.source, prefix: p.prefix, style: p.style === "virtual" ? "virtual" : "path" };
      break;
    case "http-index":
    case "caelum-manifest":
      if (!p.source) return undefined;
      source = { type: p.type, url: p.source };
      break;
    default:
      return undefined;
  }
  const layout: CameraConfig["layout"] = {};
  if (p.thumbnails) layout.thumbnails = p.thumbnails;
  if (p.raw) layout.raw = p.raw;
  return { id: "camera", name: p.name ?? "Kamera", link: p.link, source, layout };
}
