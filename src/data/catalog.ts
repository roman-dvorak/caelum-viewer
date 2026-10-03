import { fetchJson } from "./fetch";
import type { CameraConfig, SourceConfig } from "./types";

export interface Catalog {
  title?: string;
  cameras: CameraConfig[];
}

/**
 * Accepts the viewer's own catalog format ({cameras:[{id,name,source}]}) as
 * well as the `cameras.json` the caelum uploader writes
 * ({cameras:[{slug,name,manifest}]}). Relative URLs resolve against the
 * catalog's own URL so a catalog can sit next to the data.
 */
export async function loadCatalog(catalogUrl: string): Promise<Catalog> {
  const abs = new URL(catalogUrl, location.href).toString();
  const data = await fetchJson<Record<string, unknown>>(abs);
  return normalizeCatalog(data, abs);
}

export function normalizeCatalog(data: Record<string, unknown>, baseUrl: string): Catalog {
  const list = Array.isArray(data.cameras) ? (data.cameras as Record<string, unknown>[]) : [];
  const cameras = list.map((c, i): CameraConfig => {
    const id = String(c.id ?? c.slug ?? `camera${i + 1}`);
    const name = String(c.name ?? id);
    let source: SourceConfig;
    if (c.source && typeof c.source === "object") {
      source = resolveSource(c.source as SourceConfig, baseUrl);
    } else if (typeof c.manifest === "string") {
      source = { type: "caelum-manifest", url: new URL(c.manifest, baseUrl).toString() };
    } else {
      throw new Error(`Kamera „${id}“ v katalogu nemá definovaný zdroj (source).`);
    }
    const link = typeof c.link === "string" ? new URL(c.link, baseUrl).toString() : undefined;
    return { ...c, id, name, source, link } as CameraConfig;
  });
  if (!cameras.length) throw new Error("Katalog neobsahuje žádné kamery.");
  return { title: typeof data.title === "string" ? data.title : undefined, cameras };
}

function resolveSource(source: SourceConfig, baseUrl: string): SourceConfig {
  if (source.type === "s3") {
    if (source.endpoint) source = { ...source, endpoint: new URL(source.endpoint, baseUrl).toString() };
    if (source.url) source = { ...source, url: new URL(source.url, baseUrl).toString() };
    return source;
  }
  return { ...source, url: new URL(source.url, baseUrl).toString() };
}
