import { useEffect, useRef, useState } from "react";
import { SOURCE_TYPES } from "../data/factory";
import { DEVELOPER_NAME, DEVELOPER_URL, DOCS_URL, REPO_URL, VIEWER_DOCS_URL } from "../lib/brand";
import { ago, t, tMaybe } from "../lib/i18n";
import { clearRecent, forgetSource, loadRecent, type RecentSource } from "../lib/recent";
import { buildSearch, type ViewParams } from "../lib/urlState";
import { LangSwitch } from "./LangSwitch";

const FEATURES = ["timeline", "timelapse", "live", "charts", "filters", "raw"] as const;

const KEYS: [string, Parameters<typeof t>[0]][] = [
  ["← →", "key.frame"],
  ["Space", "key.play"],
  ["L", "key.live"],
  ["F", "key.fullscreen"],
  ["+ − 0", "key.zoom"],
  ["O", "key.overlay"],
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
            {t("start.docs")}
          </a>
          <a href={DEVELOPER_URL} target="_blank" rel="noreferrer">
            {DEVELOPER_NAME}
          </a>
          <LangSwitch />
        </nav>
        <div className="hero-content">
          <a className="eyebrow" href={DEVELOPER_URL} target="_blank" rel="noreferrer">
            {DEVELOPER_NAME}
          </a>
          <h1 className="wordmark">
            caelum <span>viewer</span>
          </h1>
          <p className="tagline">{t("start.tagline")}</p>
        </div>
        <div className="horizon" />
      </header>

      <div className="start-body">
        <div className="start-main">
          {error && <div className="error">{error}</div>}

          {recent.length > 0 && (
            <section className="panel">
              <div className="panel-head">
                <h2>{t("start.recent")}</h2>
                <button type="button" className="link small" onClick={() => setRecent(clearRecent())}>
                  {t("start.recentClear")}
                </button>
              </div>
              <ul className="recent">
                {recent.map((r) => (
                  <li key={r.search}>
                    <a href={r.search}>
                      <span className="tag">{kindLabel(r.kind)}</span>
                      <span className="recent-label">
                        {r.label}
                        {r.catalog && <span className="recent-catalog"> · {r.catalog}</span>}
                      </span>
                      <span className="recent-src">{describe(r.search)}</span>
                      <span className="recent-ago">{ago(r.at)}</span>
                    </a>
                    <button type="button" className="link" title={t("start.recentRemove")} onClick={() => setRecent(forgetSource(r.search))}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <form onSubmit={submit} className="panel open-form">
            <h2>{recent.length ? t("start.openOther") : t("start.open")}</h2>
            <div className="segmented" role="tablist">
              <button type="button" role="tab" aria-selected={mode === "catalog"} className={mode === "catalog" ? "on" : ""} onClick={() => setMode("catalog")}>
                {t("start.modeCatalog")}
              </button>
              <button type="button" role="tab" aria-selected={mode === "direct"} className={mode === "direct" ? "on" : ""} onClick={() => setMode("direct")}>
                {t("start.modeDirect")}
              </button>
            </div>

            {mode === "catalog" ? (
              <label>
                {t("start.catalogUrl")}
                <input required type="url" placeholder="https://example.org/cameras.json" value={p.catalog ?? ""} onChange={(e) => set({ catalog: e.target.value })} />
                <span className="hint">
                  {t("start.catalogHint")} <a href="./examples/cameras.json">{t("start.catalogExample")}</a>.
                </span>
              </label>
            ) : (
              <>
                <fieldset className="source-types">
                  <legend>{t("start.sourceType")}</legend>
                  {SOURCE_TYPES.map((st) => (
                    <label key={st.value} className={`source-type${p.type === st.value ? " on" : ""}`}>
                      <input type="radio" name="type" value={st.value} checked={p.type === st.value} onChange={() => set({ type: st.value })} />
                      <span className="source-type-label">{t(`source.${st.value}`)}</span>
                      <span className="hint">{t(`source.${st.value}.hint`)}</span>
                    </label>
                  ))}
                </fieldset>
                {p.type === "s3" ? (
                  <div className="field-grid">
                    <label className="span-2">
                      {t("start.endpoint")}
                      <input required type="url" placeholder="https://s3.example.org" value={p.endpoint ?? ""} onChange={(e) => set({ endpoint: e.target.value })} />
                    </label>
                    <label>
                      {t("start.bucket")}
                      <input required placeholder="allsky" value={p.bucket ?? ""} onChange={(e) => set({ bucket: e.target.value })} />
                    </label>
                    <label>
                      {t("start.prefix")}
                      <input placeholder="camera01/" value={p.prefix ?? ""} onChange={(e) => set({ prefix: e.target.value })} />
                    </label>
                  </div>
                ) : (
                  <label>
                    {p.type === "caelum" ? t("start.cameraIp") : t("start.directoryUrl")}
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
                      {t("start.name")} <span className="optional">· {t("start.optional")}</span>
                    </span>
                    <input value={p.name ?? ""} onChange={(e) => set({ name: e.target.value })} />
                  </label>
                  <label>
                    <span>
                      {t("start.cameraLink")} <span className="optional">· {t("start.optional")}</span>
                    </span>
                    <input type="url" placeholder="http://allsky.local:8000/" value={p.link ?? ""} onChange={(e) => set({ link: e.target.value })} />
                  </label>
                </div>
              </>
            )}
            <div className="form-foot">
              <span className="hint">{t("start.cors")}</span>
              <button className="btn primary" type="submit">
                {t("start.submit")}
              </button>
            </div>
          </form>

          {recent.length === 0 && (
            <p className="hint recent-empty">{t("start.recentEmpty")}</p>
          )}

        </div>

        <aside className="start-side">
          <section>
            <h2>{t("start.docs")}</h2>
            <ul className="doc-links">
              <li>
                <a href={VIEWER_DOCS_URL} target="_blank" rel="noreferrer">
                  Caelum Viewer <span>↗</span>
                </a>
                <span className="hint">{t("start.docsViewer")}</span>
              </li>
              <li>
                <a href={DOCS_URL} target="_blank" rel="noreferrer">
                  Caelum <span>↗</span>
                </a>
                <span className="hint">{t("start.docsCaelum")}</span>
              </li>
              <li>
                <a href={DEVELOPER_URL} target="_blank" rel="noreferrer">
                  {DEVELOPER_NAME} <span>↗</span>
                </a>
                <span className="hint">{t("start.docsDeveloper")}</span>
              </li>
            </ul>
          </section>
          <section>
            <h2>{t("start.features")}</h2>
            <ul className="features">
              {FEATURES.map((f) => (
                <li key={f}>
                  <strong>{t(`feature.${f}`)}</strong> <span>{t(`feature.${f}.text`)}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2>{t("start.keys")}</h2>
            <dl className="keys">
              {KEYS.map(([k, v]) => (
                <div key={k}>
                  <dt>
                    {k.split(" ").map((x) => (
                      <kbd key={x}>{x === "Space" ? t("key.space") : x}</kbd>
                    ))}
                  </dt>
                  <dd>{t(v)}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>

      <section className="start-links panel">
        <h2>{t("start.links")}</h2>
        <p className="hint">
          {t("start.linksHint")} <code>&amp;camera=…</code> <code>&amp;date=2026-10-03</code>{" "}
          <code>&amp;time=19:30</code> <code>&amp;live=1</code>.
        </p>
        <CopyLine text={`${base}?catalog=https://example.org/cameras.json`} />
        <CopyLine text={`${base}?type=http-index&source=https://data.example.org/camera01/`} />
        <CopyLine text={`${base}?type=caelum&source=192.168.1.50`} />
        <CopyLine text={`${base}?type=s3&endpoint=https://s3.example.org&bucket=allsky&prefix=camera01/`} />
      </section>

      <footer className="start-foot">
        <a href={DOCS_URL}>{t("start.docs")}</a> · <a href={REPO_URL}>GitHub</a> · {t("start.footer")} ·{" "}
        <a href={DEVELOPER_URL}>{DEVELOPER_NAME}</a>
      </footer>
    </div>
  );
}

function kindLabel(kind: string): string {
  const key = `kind.${kind}`;
  return tMaybe(key) ?? kind;
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
      <button type="button" onClick={copy} title={t("start.copy")}>
        {copied ? t("start.copied") : t("start.copy")}
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
