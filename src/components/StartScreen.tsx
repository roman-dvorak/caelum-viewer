import { useState } from "react";
import { SOURCE_TYPES } from "../data/factory";
import { buildSearch, type ViewParams } from "../lib/urlState";

export function StartScreen({ error }: { error?: string }) {
  const [mode, setMode] = useState<"catalog" | "direct">("catalog");
  const [p, setP] = useState<ViewParams>({ type: "http-index" });
  const set = (patch: Partial<ViewParams>) => setP((x) => ({ ...x, ...patch }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params: ViewParams =
      mode === "catalog"
        ? { catalog: p.catalog }
        : { type: p.type, source: p.source, endpoint: p.endpoint, bucket: p.bucket, prefix: p.prefix, name: p.name };
    location.search = buildSearch(params);
  };

  const example = `${location.origin}${location.pathname}`;

  return (
    <div className="start">
      <h1>
        <img src="./favicon.svg" alt="" /> Caelum Viewer
      </h1>
      <p className="muted">
        Prohlížeč dat z all-sky kamer. Běží celý v prohlížeči — data čte přímo z S3 nebo z HTTP výpisu adresářů,
        server musí povolit CORS.
      </p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit} className="panel">
        <div className="tabs">
          <button type="button" className={mode === "catalog" ? "on" : ""} onClick={() => setMode("catalog")}>
            Katalog kamer
          </button>
          <button type="button" className={mode === "direct" ? "on" : ""} onClick={() => setMode("direct")}>
            Přímý zdroj
          </button>
        </div>
        {mode === "catalog" ? (
          <label>
            URL katalogu (JSON)
            <input required type="url" placeholder="https://example.org/cameras.json" value={p.catalog ?? ""} onChange={(e) => set({ catalog: e.target.value })} />
          </label>
        ) : (
          <>
            <label>
              Typ zdroje
              <select value={p.type} onChange={(e) => set({ type: e.target.value })}>
                {SOURCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            {p.type === "s3" ? (
              <>
                <label>
                  Endpoint
                  <input required type="url" placeholder="https://s3.example.org" value={p.endpoint ?? ""} onChange={(e) => set({ endpoint: e.target.value })} />
                </label>
                <label>
                  Bucket
                  <input required placeholder="allsky" value={p.bucket ?? ""} onChange={(e) => set({ bucket: e.target.value })} />
                </label>
                <label>
                  Prefix
                  <input placeholder="camera01/" value={p.prefix ?? ""} onChange={(e) => set({ prefix: e.target.value })} />
                </label>
              </>
            ) : (
              <label>
                URL adresáře kamery
                <input required type="url" placeholder="https://data.example.org/camera01/" value={p.source ?? ""} onChange={(e) => set({ source: e.target.value })} />
              </label>
            )}
            <label>
              Název (nepovinné)
              <input value={p.name ?? ""} onChange={(e) => set({ name: e.target.value })} />
            </label>
          </>
        )}
        <button className="btn primary" type="submit">
          Otevřít
        </button>
      </form>
      <div className="panel small">
        <h3>Odkazy</h3>
        <code>{example}?catalog=https://example.org/cameras.json</code>
        <code>{example}?type=http-index&amp;source=https://data.example.org/camera01/</code>
        <code>{example}?type=s3&amp;endpoint=https://s3.example.org&amp;bucket=allsky&amp;prefix=camera01/</code>
        <p className="muted">
          Volitelně <code>&amp;camera=…&amp;date=2026-10-03&amp;time=19:30</code>, <code>&amp;live=1</code>.
        </p>
      </div>
    </div>
  );
}
