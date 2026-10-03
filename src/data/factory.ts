import { CaelumManifestDataSource } from "./caelumManifest";
import { HttpIndexDataSource } from "./httpIndex";
import { S3DataSource } from "./s3";
import type { DataSource, SourceConfig } from "./types";

/** The single place that knows the concrete adapters; add new ones here. */
export function createDataSource(config: SourceConfig): DataSource {
  switch (config.type) {
    case "s3":
      return new S3DataSource(config);
    case "http-index":
      return new HttpIndexDataSource(config.url);
    case "caelum-manifest":
      return new CaelumManifestDataSource(config.url);
    default:
      throw new Error(`Neznámý typ zdroje: ${(config as { type: string }).type}`);
  }
}

export const SOURCE_TYPES: { value: SourceConfig["type"]; label: string }[] = [
  { value: "http-index", label: "HTTP index (Apache / nginx / Caddy)" },
  { value: "s3", label: "S3 (ListObjectsV2, veřejné čtení)" },
  { value: "caelum-manifest", label: "Caelum manifest.json (bez výpisu adresářů)" },
];
