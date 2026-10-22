import { useEffect, useRef, useState } from "react";
import { SOURCE_TYPES } from "../data/factory";
import { DEVELOPER_NAME, DEVELOPER_URL, DOCS_URL, REPO_URL, VIEWER_DOCS_URL } from "../lib/brand";
import { ago, clearRecent, forgetSource, loadRecent, type RecentSource } from "../lib/recent";
import { buildSearch, type ViewParams } from "../lib/urlState";

const SOURCE_TEXT: Record<string, [string, string]> = {
  "http-index": ["HTTP index", "Adresář na webovém serveru s výpisem souborů (Apache / nginx / Caddy)."],
  s3: ["S3", "Veřejně čitelný bucket, výpis přes ListObjectsV2."],
  caelum: ["Kamera caelum", "Čtení přímo z kamery v lokální síti podle IP adresy."],
  "caelum-manifest": ["Caelum manifest", "manifest.json z uploaderu caelum, bez výpisu adresářů."],
};

const KIND_LABELS: Record<string, string> = {
  catalog: "katalog",
  "http-index": "http",
  s3: "s3",
  caelum: "kamera",
  "caelum-manifest": "manifest",
};

const FEATURES: [string, string][] = [
  ["Časová osa 24 h UTC", "obarvená podle fáze dne — den, soumraky, noc"],
  ["Time-lapse", "přehrávání 2–30 snímků/s s předběžným načítáním"],
  ["Live", "každých 30 s nejnovější snímek z kamery"],
  ["Grafy metadat", "expozice, gain, Slunce, Měsíc — se synchronizovaným kurzorem"],
  ["Filtry", "fáze dne, rozsahy hodnot, dostupnost RAW"],
  ["RAW", "stažení původního DNG a JSON metadat"],
];

const KEYS: [string, string][] = [
  ["← →", "snímek (Shift po 10)"],
  ["Mezerník", "přehrávání"],
  ["L", "live"],
  ["F", "fullscreen"],
  ["+ − 0", "zoom"],
  ["O", "overlay"],
];

export function StartScreen({ error }: { error?: string }) {
  const [mode, setMode] = useState<"catalog" | "direct">("catalog");
  const [p, setP] = useState<ViewParams>({ type: "http-index" });
  const [recent, setRecent] = useState<RecentSource[]>(loadRecent);
  const set = (patch: Partial<ViewParams>) => setP((x) => ({ ...x, ...patch }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params: ViewParams =
      mode === "catalog"
        ? { catalog: p.catalog }
        : { type: p.type, source: p.source, endpoint: p.endpoint, bucket: p.bucket, prefix: p.prefix, name: p.name, link: p.link };
    location.search = buildSearch(params);
  };

  const base = `${location.origin}${location.pathname}`;

  return (
    <div className="start">
      <header className="hero">
        <Starfield />
        <nav className="hero-nav">
          <a href={DOCS_URL} target="_blank" rel="noreferrer">
            Dokumentace
          </a>
          <a href={DEVELOPER_URL} target="_blank" rel="noreferrer">
            {DEVELOPER_NAME}
          </a>
        </nav>
        <div className="hero-content">
          <a className="eyebrow" href={DEVELOPER_URL} target="_blank" rel="noreferrer">
            {DEVELOPER_NAME}
          </a>
          <h1 className="wordmark">
            caelum <span>viewer</span>
          </h1>
          <p className="tagline">Archiv all-sky kamer přímo v prohlížeči</p>
        </div>
        <div className="horizon" />
      </header>

      <div className="start-body">
        <div className="start-main">
          {error && <div className="error">{error}</div>}

          {recent.length > 0 && (
            <section className="panel">
              <div className="panel-head">
                <h2>Naposledy navštívené kamery</h2>
                <button type="button" className="link small" onClick={() => setRecent(clearRecent())}>
                  Vymazat
                </button>
              </div>
              <ul className="recent">
                {recent.map((r) => (
                  <li key={r.search}>
                    <a href={r.search}>
                      <span className="tag">{KIND_LABELS[r.kind] ?? r.kind}</span>
                      <span className="recent-label">
                        {r.label}
                        {r.catalog && <span className="recent-catalog"> · {r.catalog}</span>}
                      </span>
                      <span className="recent-src">{describe(r.search)}</span>
                      <span className="recent-ago">{ago(r.at)}</span>
                    </a>
                    <button type="button" className="link" title="Odebrat ze seznamu" onClick={() => setRecent(forgetSource(r.search))}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <form onSubmit={submit} className="panel open-form">
            <h2>{recent.length ? "Otevřít jiný zdroj" : "Otevřít zdroj dat"}</h2>
            <div className="segmented" role="tablist">
              <button type="button" role="tab" aria-selected={mode === "catalog"} className={mode === "catalog" ? "on" : ""} onClick={() => setMode("catalog")}>
                Katalog kamer
              </button>
              <button type="button" role="tab" aria-selected={mode === "direct"} className={mode === "direct" ? "on" : ""} onClick={() => setMode("direct")}>
                Přímý zdroj
              </button>
            </div>

            {mode === "catalog" ? (
              <label>
                URL katalogu (JSON)
                <input required type="url" placeholder="https://example.org/cameras.json" value={p.catalog ?? ""} onChange={(e) => set({ catalog: e.target.value })} />
                <span className="hint">
                  Seznam kamer se zdroji a metadaty stanic — viz <a href="./examples/cameras.json">příklad</a>.
                </span>
              </label>
            ) : (
              <>
                <fieldset className="source-types">
                  <legend>Typ zdroje</legend>
                  {SOURCE_TYPES.map((t) => (
                    <label key={t.value} className={`source-type${p.type === t.value ? " on" : ""}`}>
                      <input type="radio" name="type" value={t.value} checked={p.type === t.value} onChange={() => set({ type: t.value })} />
                      <span className="source-type-label">{SOURCE_TEXT[t.value]?.[0] ?? t.label}</span>
                      <span className="hint">{SOURCE_TEXT[t.value]?.[1]}</span>
                    </label>
                  ))}
                </fieldset>
                {p.type === "s3" ? (
                  <div className="field-grid">
                    <label className="span-2">
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
                  </div>
                ) : (
                  <label>
                    {p.type === "caelum" ? "IP adresa kamery (případně :port)" : "URL adresáře kamery"}
                    <input
                      required
                      type={p.type === "caelum" ? "text" : "url"}
                      placeholder={p.type === "caelum" ? "192.168.1.50" : "https://data.example.org/camera01/"}
                      value={p.source ?? ""}
                      onChange={(e) => set({ source: e.target.value })}
                    />
                  </label>
                )}
                <div className="field-grid">
                  <label>
                    <span>
                      Název <span className="optional">· nepovinné</span>
                    </span>
                    <input value={p.name ?? ""} onChange={(e) => set({ name: e.target.value })} />
                  </label>
                  <label>
                    <span>
                      Odkaz na kameru <span className="optional">· nepovinné</span>
                    </span>
                    <input type="url" placeholder="http://allsky.local:8000/" value={p.link ?? ""} onChange={(e) => set({ link: e.target.value })} />
                  </label>
                </div>
              </>
            )}
            <div className="form-foot">
              <span className="hint">Data se čtou přímo ze zdroje — server musí povolit CORS.</span>
              <button className="btn primary" type="submit">
                Otevřít
              </button>
            </div>
          </form>

          {recent.length === 0 && (
            <p className="hint recent-empty">Kamery, které otevřete, se tu příště objeví v seznamu naposledy navštívených.</p>
          )}

        </div>

        <aside className="start-side">
          <section>
            <h2>Dokumentace</h2>
            <ul className="doc-links">
              <li>
                <a href={VIEWER_DOCS_URL} target="_blank" rel="noreferrer">
                  Caelum Viewer <span>↗</span>
                </a>
                <span className="hint">zdroje dat, katalog, parametry URL</span>
              </li>
              <li>
                <a href={DOCS_URL} target="_blank" rel="noreferrer">
                  Caelum <span>↗</span>
                </a>
                <span className="hint">software all-sky kamery — instalace, nahrávání dat</span>
              </li>
              <li>
                <a href={DEVELOPER_URL} target="_blank" rel="noreferrer">
                  {DEVELOPER_NAME} <span>↗</span>
                </a>
                <span className="hint">kamery a příslušenství</span>
              </li>
            </ul>
          </section>
          <section>
            <h2>Co umí</h2>
            <ul className="features">
              {FEATURES.map(([title, text]) => (
                <li key={title}>
                  <strong>{title}</strong> <span>{text}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2>Klávesy</h2>
            <dl className="keys">
              {KEYS.map(([k, v]) => (
                <div key={k}>
                  <dt>
                    {k.split(" ").map((x) => (
                      <kbd key={x}>{x}</kbd>
                    ))}
                  </dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>

      <section className="start-links panel">
        <h2>Odkazy</h2>
        <p className="hint">
          Stav pohledu je v URL — odkaz lze uložit nebo sdílet. Volitelně <code>&amp;camera=…</code> <code>&amp;date=2026-10-03</code>{" "}
          <code>&amp;time=19:30</code> <code>&amp;live=1</code>.
        </p>
        <CopyLine text={`${base}?catalog=https://example.org/cameras.json`} />
        <CopyLine text={`${base}?type=http-index&source=https://data.example.org/camera01/`} />
        <CopyLine text={`${base}?type=caelum&source=192.168.1.50`} />
        <CopyLine text={`${base}?type=s3&endpoint=https://s3.example.org&bucket=allsky&prefix=camera01/`} />
      </section>

      <footer className="start-foot">
        <a href={DOCS_URL}>Dokumentace</a> · <a href={REPO_URL}>GitHub</a> · statická aplikace bez backendu ·{" "}
        <a href={DEVELOPER_URL}>{DEVELOPER_NAME}</a>
      </footer>
    </div>
  );
}

/** Short human description of a stored query string. */
function describe(search: string): string {
  const q = new URLSearchParams(search);
  const v = q.get("catalog") ?? q.get("source") ?? [q.get("endpoint"), q.get("bucket"), q.get("prefix")].filter(Boolean).join(" / ");
  return v.replace(/^https?:\/\//, "");
}

function CopyLine({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }, () => {});
  };
  return (
    <div className="copy-line">
      <code>{text}</code>
      <button type="button" onClick={copy} title="Zkopírovat">
        {copied ? "Zkopírováno" : "Kopírovat"}
      </button>
    </div>
  );
}

/** Deterministic star field behind the hero — same sky on every visit. */
function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const seed = (n: number) => {
      const x = Math.sin(n + 1) * 10000;
      return x - Math.floor(x);
    };
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth;
      const h = c.clientHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      const g = c.getContext("2d");
      if (!g) return;
      g.scale(dpr, dpr);
      const n = Math.round((w * h) / 2600);
      for (let i = 0; i < n; i++) {
        g.beginPath();
        g.arc(seed(i * 17.31) * w, seed(i * 11.73) * h, seed(i * 5.17) * 1.2 + 0.2, 0, Math.PI * 2);
        g.fillStyle = `rgba(226,232,245,${(0.2 + seed(i * 7.91) * 0.7).toFixed(2)})`;
        g.fill();
      }
      for (let j = 0; j < 10; j++) {
        g.beginPath();
        g.arc(seed(j * 43.7 + 1000) * w, seed(j * 29.3 + 2000) * h * 0.7, 1.4, 0, Math.PI * 2);
        g.fillStyle = `rgba(245,201,106,${(0.4 + seed(j * 13.1) * 0.4).toFixed(2)})`;
        g.fill();
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);
  return <canvas ref={ref} className="stars" aria-hidden="true" />;
}
