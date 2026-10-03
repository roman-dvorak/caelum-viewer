import { encodePath, fetchOk, withTrailingSlash } from "./fetch";
import type { DataSource, Entry } from "./types";

/**
 * A plain web server directory listing (Apache mod_autoindex, nginx
 * autoindex, Caddy browse, ...). A machine-readable JSON listing is
 * preferred (nginx `autoindex_format json;`, Caddy with Accept: JSON);
 * HTML listings are parsed as a fallback by collecting links that point to
 * direct children of the directory.
 */
export class HttpIndexDataSource implements DataSource {
  readonly kind = "http-index";
  readonly label: string;
  private readonly base: string;

  constructor(url: string) {
    this.base = withTrailingSlash(new URL(url, location.href).toString());
    this.label = this.base;
  }

  url(path: string): string {
    return this.base + encodePath(path);
  }

  async list(path: string, signal?: AbortSignal): Promise<Entry[]> {
    const dirUrl = this.url(path);
    const res = await fetchOk(dirUrl, {
      signal,
      headers: { Accept: "application/json, text/html;q=0.9" },
    });
    const text = await res.text();
    const type = res.headers.get("content-type") ?? "";
    const trimmed = text.trimStart();
    const raw =
      type.includes("json") || trimmed.startsWith("[") || trimmed.startsWith("{")
        ? parseJsonListing(text)
        : parseHtmlListing(text, res.url || dirUrl);
    return raw.map((e) => ({ ...e, path: path + e.name + (e.isDir ? "/" : "") }));
  }
}

type RawEntry = Omit<Entry, "path">;

/** nginx: [{name,type:"directory"|"file",mtime,size}], Caddy: [{name,is_dir,size,mod_time}],
 *  or a generic {entries|files|items: [...]} wrapper around either. */
export function parseJsonListing(text: string): RawEntry[] {
  let data: unknown = JSON.parse(text);
  if (data && !Array.isArray(data) && typeof data === "object") {
    const o = data as Record<string, unknown>;
    data = o.entries ?? o.files ?? o.items ?? o.children ?? [];
  }
  if (!Array.isArray(data)) throw new Error("Neznámý formát JSON výpisu adresáře.");
  const out: RawEntry[] = [];
  for (const item of data as Record<string, unknown>[]) {
    let name = String(item.name ?? item.path ?? "");
    const isDir =
      item.type === "directory" ||
      item.type === "dir" ||
      item.is_dir === true ||
      item.isDir === true ||
      name.endsWith("/");
    name = name.replace(/\/+$/, "").split("/").pop() ?? "";
    if (!name || name === "." || name === "..") continue;
    out.push({
      name,
      isDir,
      size: typeof item.size === "number" ? item.size : undefined,
      modified: (item.mtime ?? item.mod_time ?? item.modified) as string | undefined,
    });
  }
  return out;
}

/** Keeps only links that resolve to a direct child of `dirUrl` — this drops
 *  parent links, Apache sort links (?C=N;O=D), absolute site links, etc. */
export function parseHtmlListing(html: string, dirUrl: string): RawEntry[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const dir = new URL(dirUrl);
  dir.search = "";
  dir.hash = "";
  const seen = new Set<string>();
  const out: RawEntry[] = [];
  for (const a of Array.from(doc.querySelectorAll("a[href]"))) {
    const href = a.getAttribute("href")!;
    if (href.startsWith("?") || href.startsWith("#")) continue;
    let target: URL;
    try {
      target = new URL(href, dir);
    } catch {
      continue;
    }
    if (target.origin !== dir.origin || target.search) continue;
    if (!target.pathname.startsWith(dir.pathname)) continue;
    const rest = target.pathname.slice(dir.pathname.length);
    const isDir = rest.endsWith("/");
    const segment = isDir ? rest.slice(0, -1) : rest;
    if (!segment || segment.includes("/")) continue;
    const name = decodeURIComponent(segment);
    if (seen.has(name)) continue;
    seen.add(name);
    out.push({ name, isDir });
  }
  return out;
}
