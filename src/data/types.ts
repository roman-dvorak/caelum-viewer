/** One item of a directory-like listing, independent of where it came from. */
export interface Entry {
  /** Base name without a trailing slash. */
  name: string;
  /** Path relative to the data source root; directories end with "/". */
  path: string;
  isDir: boolean;
  size?: number;
  modified?: string;
}

/**
 * The only thing the rest of the viewer knows about storage. Every adapter
 * (S3, HTTP directory index, ...) maps its own listing format onto `Entry`.
 * Paths are relative to the source root; "" is the root, directories end
 * with "/".
 */
export interface DataSource {
  readonly kind: string;
  /** Human-readable description of where the data lives. */
  readonly label: string;
  list(path: string, signal?: AbortSignal): Promise<Entry[]>;
  url(path: string): string;
}

export type SourceConfig =
  | {
      type: "s3";
      /** e.g. https://s3.example.org — combined with `bucket`. */
      endpoint?: string;
      bucket?: string;
      /** Alternative to endpoint+bucket: the bucket's own base URL. */
      url?: string;
      prefix?: string;
      /** "path" (default): endpoint/bucket/key, "virtual": bucket.endpoint/key */
      style?: "path" | "virtual";
    }
  | { type: "http-index"; url: string }
  | { type: "caelum-manifest"; url: string }
  /** A caelum camera's own API; `url` may be a bare IP / host[:port]. */
  | { type: "caelum"; url: string };

/** Where the date-organized files live, relative to the source root. */
export interface ArchiveLayout {
  /** Directory template for previews (+ metadata sidecars). */
  thumbnails: string;
  /** Directory template for RAW files (+ their sidecars). */
  raw: string;
}

export const DEFAULT_LAYOUT: ArchiveLayout = {
  thumbnails: "thumbnails/{YYYY}/{MM}/{DD}/",
  raw: "raw/{YYYY}/{MM}/{DD}/",
};

export interface CameraConfig {
  id: string;
  name: string;
  source: SourceConfig;
  layout?: Partial<ArchiveLayout>;
  /** The camera's own web interface (live view, settings), shown as a link. */
  link?: string;
  /** Free-form station metadata (location, description, ...). */
  [extra: string]: unknown;
}

export class HttpError extends Error {
  constructor(
    public readonly url: string,
    public readonly status: number,
  ) {
    super(`HTTP ${status} při načítání ${url}`);
  }
}
