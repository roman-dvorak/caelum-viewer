import { encodePath, fetchOk, withTrailingSlash } from "./fetch";
import type { DataSource, Entry, SourceConfig } from "./types";

type S3Config = Extract<SourceConfig, { type: "s3" }>;

/**
 * Anonymous (public-read) S3 / S3-compatible storage via ListObjectsV2 with
 * a "/" delimiter, so a prefix behaves like a directory. No index files are
 * needed; credentials are deliberately not supported here.
 */
export class S3DataSource implements DataSource {
  readonly kind = "s3";
  readonly label: string;
  private readonly bucketUrl: string;
  private readonly prefix: string;

  constructor(config: S3Config) {
    this.bucketUrl = withTrailingSlash(s3BucketUrl(config));
    const prefix = (config.prefix ?? "").replace(/^\/+/, "");
    this.prefix = prefix && !prefix.endsWith("/") ? `${prefix}/` : prefix;
    this.label = `s3: ${this.bucketUrl}${this.prefix}`;
  }

  url(path: string): string {
    return this.bucketUrl + encodePath(this.prefix + path);
  }

  async list(path: string, signal?: AbortSignal): Promise<Entry[]> {
    const fullPrefix = this.prefix + path;
    const entries: Entry[] = [];
    let token: string | undefined;
    do {
      const q = new URLSearchParams({ "list-type": "2", delimiter: "/", prefix: fullPrefix });
      if (token) q.set("continuation-token", token);
      const res = await fetchOk(`${this.bucketUrl}?${q}`, { signal });
      const page = parseListObjectsV2(await res.text());
      for (const p of page.prefixes) {
        const rel = p.slice(this.prefix.length);
        const name = rel.slice(path.length).replace(/\/$/, "");
        if (name) entries.push({ name, path: rel, isDir: true });
      }
      for (const o of page.objects) {
        const rel = o.key.slice(this.prefix.length);
        const name = rel.slice(path.length);
        // Zero-byte "folder marker" objects some tools create.
        if (!name || name.endsWith("/")) continue;
        entries.push({ name, path: rel, isDir: false, size: o.size, modified: o.lastModified });
      }
      token = page.nextToken;
    } while (token);
    return entries;
  }
}

export function s3BucketUrl(config: S3Config): string {
  if (config.url) return config.url;
  if (!config.endpoint || !config.bucket) {
    throw new Error("S3 zdroj potřebuje buď `url`, nebo `endpoint` + `bucket`.");
  }
  const endpoint = config.endpoint.replace(/\/+$/, "");
  if (config.style === "virtual") {
    const u = new URL(endpoint);
    u.hostname = `${config.bucket}.${u.hostname}`;
    return u.toString();
  }
  return `${endpoint}/${encodeURIComponent(config.bucket)}/`;
}

export interface ListPage {
  prefixes: string[];
  objects: { key: string; size?: number; lastModified?: string }[];
  nextToken?: string;
}

export function parseListObjectsV2(xml: string): ListPage {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const err = doc.getElementsByTagName("Error")[0];
  if (err) {
    const code = childText(err, "Code") ?? "Error";
    throw new Error(`S3: ${code} — ${childText(err, "Message") ?? ""}`);
  }
  if (doc.getElementsByTagName("parsererror").length) {
    throw new Error("S3: odpověď není platné XML ListObjectsV2.");
  }
  const prefixes = Array.from(doc.getElementsByTagName("CommonPrefixes"))
    .map((el) => childText(el, "Prefix"))
    .filter((p): p is string => !!p);
  const objects = Array.from(doc.getElementsByTagName("Contents")).map((el) => {
    const size = childText(el, "Size");
    return {
      key: childText(el, "Key") ?? "",
      size: size ? Number(size) : undefined,
      lastModified: childText(el, "LastModified"),
    };
  });
  const truncated = childText(doc.documentElement, "IsTruncated") === "true";
  const nextToken = truncated ? childText(doc.documentElement, "NextContinuationToken") : undefined;
  return { prefixes, objects, nextToken };
}

function childText(el: Element, tag: string): string | undefined {
  for (const c of Array.from(el.children)) {
    if (c.localName === tag) return c.textContent ?? undefined;
  }
  return undefined;
}
