/**
 * UI translations. English is the default; Czech is picked when the browser
 * prefers it, and either can be forced with `?lang=en|cs` or the switcher
 * (remembered per browser). Add a language by adding a dictionary with the
 * same keys as `en` — TypeScript reports any missing one.
 */

export const LANGS = { en: "English", cs: "Čeština" } as const;
export type Lang = keyof typeof LANGS;

/** Plural forms by Intl.PluralRules category; `other` is the fallback. */
type Plural = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

const en = {
  // start screen
  "start.tagline": "All-sky camera archive, right in your browser",
  "start.docs": "Documentation",
  "start.recent": "Recently viewed cameras",
  "start.recentClear": "Clear",
  "start.recentRemove": "Remove from list",
  "start.recentEmpty": "Cameras you open will show up here next time.",
  "start.open": "Open a data source",
  "start.openOther": "Open another source",
  "start.modeCatalog": "Camera catalog",
  "start.modeDirect": "Direct source",
  "start.catalogUrl": "Catalog URL (JSON)",
  "start.catalogHint": "A list of cameras with their sources and station metadata — see the",
  "start.catalogExample": "example",
  "start.sourceType": "Source type",
  "start.endpoint": "Endpoint",
  "start.bucket": "Bucket",
  "start.prefix": "Prefix",
  "start.cameraIp": "Camera IP address (optionally :port)",
  "start.directoryUrl": "Camera directory URL",
  "start.name": "Name",
  "start.cameraLink": "Camera web interface",
  "start.optional": "optional",
  "start.cors": "Data is read straight from the source — the server must allow CORS.",
  "start.submit": "Open",
  "start.docsViewer": "sources, catalog, URL parameters",
  "start.docsCaelum": "all-sky camera software — installation, data upload",
  "start.docsDeveloper": "cameras and accessories",
  "start.features": "What it does",
  "start.keys": "Keyboard",
  "start.links": "Links",
  "start.linksHint": "The view is kept in the URL — bookmark or share it. Optional:",
  "start.copy": "Copy",
  "start.copied": "Copied",
  "start.footer": "static app, no backend",
  "start.language": "Language",

  "source.http-index": "HTTP index",
  "source.http-index.hint": "A directory on a web server with file listing (Apache / nginx / Caddy).",
  "source.s3": "S3",
  "source.s3.hint": "A publicly readable bucket, listed via ListObjectsV2.",
  "source.caelum": "caelum camera",
  "source.caelum.hint": "Read straight from a camera on your network by its IP address.",
  "source.caelum-manifest": "caelum manifest",
  "source.caelum-manifest.hint": "manifest.json from the caelum uploader, no directory listing needed.",
  "kind.catalog": "catalog",
  "kind.http-index": "http",
  "kind.s3": "s3",
  "kind.caelum": "camera",
  "kind.caelum-manifest": "manifest",

  "feature.timeline": "24 h UTC timeline",
  "feature.timeline.text": "coloured by sky period — day, twilights, night",
  "feature.timelapse": "Time-lapse",
  "feature.timelapse.text": "2–30 frames/s playback with preloading",
  "feature.live": "Live",
  "feature.live.text": "the newest frame from the camera every 30 s",
  "feature.charts": "Metadata charts",
  "feature.charts.text": "exposure, gain, Sun, Moon — with a synchronised cursor",
  "feature.filters": "Filters",
  "feature.filters.text": "sky period, value ranges, RAW availability",
  "feature.raw": "RAW",
  "feature.raw.text": "download the original DNG and JSON metadata",

  "key.frame": "frame (Shift: 10)",
  "key.space": "Space",
  "key.play": "playback",
  "key.live": "live",
  "key.fullscreen": "fullscreen",
  "key.zoom": "zoom",
  "key.overlay": "overlay",

  // viewer
  "app.loadingCatalog": "Loading catalog…",
  "app.catalogError": "Catalog: {msg}",
  "viewer.home": "Start page",
  "viewer.cameraLink": "Camera ↗",
  "viewer.prevDay": "Previous day with data",
  "viewer.nextDay": "Next day with data",
  "viewer.today": "Today",
  "viewer.todayTitle": "Today (UTC)",
  "viewer.liveTitle": "Live — newest frame (L)",
  "viewer.loadingList": "Loading list…",
  "viewer.metadataProgress": "metadata: {done}/{total}",
  "viewer.noDataForDay": " · no data for this day",
  "viewer.docs": "Documentation ↗",
  "viewer.first": "First (Home)",
  "viewer.prev": "Previous (←)",
  "viewer.play": "Play (Space)",
  "viewer.next": "Next (→)",
  "viewer.last": "Last (End)",
  "viewer.speed": "Playback speed",
  "viewer.fps": "{n} frames/s",
  "viewer.overlay": "overlay",
  "viewer.charts": "Charts",
  "viewer.chartsTitle": "Charts load the metadata of every frame of the day",
  "viewer.gallery": "Gallery ({n})",
  "viewer.noFrame": "No frame",
  "viewer.noPreview": "This frame has no preview (RAW only)",
  "viewer.previewFailed": "Preview failed to load",
  "viewer.zoomIn": "Zoom in (+)",
  "viewer.zoomOut": "Zoom out (−)",
  "viewer.zoomReset": "Original size (0)",
  "viewer.fullscreen": "Fullscreen (F)",
  "viewer.mode": "View mode",
  "viewer.modeSimple": "Simple",
  "viewer.modeSimpleTitle": "Image, overlay, playback and timeline only",
  "viewer.modeAdvanced": "Advanced",
  "viewer.modeAdvancedTitle": "All panels: metadata, filters, gallery and charts",
  "viewer.files": "Files of this frame",
  "viewer.fileThumb": "preview",
  "viewer.fileRaw": "raw",
  "viewer.fileOverlay": "overlay",
  "viewer.fileJson": "json",
  "viewer.fileYes": "{name}: available",
  "viewer.fileNo": "{name}: missing",
  "viewer.fileUnknown": "{name}: unknown until the metadata loads",
  "meta.preview": "Preview",
  "meta.loading": "Loading metadata…",
  "meta.none": "No metadata",
  "filter.title": "Filter",
  "range.start": "Section starts at this frame ([)",
  "range.end": "Section ends at this frame (])",
  "range.clear": "Cancel the section (Esc)",
  "range.label": "Playback and export only within this section",
  "export.title": "Export",
  "export.wholeDay": "whole day",
  "export.rangeHint": "Exports the whole day. Mark a section with [ and ] at the current frame, or Shift+drag on the timeline.",
  "export.rangeSet": "Playback loops within the section and only it is exported.",
  "export.filtered": "Only frames passing the filter are included.",
  "export.fps": "Video",
  "export.size": "Size",
  "export.sizeOriginal": "original",
  "export.stamp": "camera and time in the picture",
  "export.video": "Download video",
  "export.duration": "{s} s of video",
  "export.noVideo": "This browser cannot encode video (WebCodecs missing) — download the images instead.",
  "export.zip": "Download images (ZIP)",
  "export.json": "with JSON metadata",
  "export.encoding": "Encoding {done}/{total}",
  "export.packing": "Downloading {done}/{total}",
  "export.cancel": "Cancel",
  "export.failed": "Export failed: {msg}",
  "export.skipped": "{n} files could not be downloaded and were left out.",
  "export.nothing": "No frames with a preview in the selection.",
  "export.noCodec": "This browser has no video encoder for {w}×{h} px — try a smaller size.",
  "filter.reset": "reset",
  "filter.rawOnly": "RAW only",
  "filter.remove": "Remove",
  "filter.addRule": "+ value condition",
  "filter.metaHint": "Sky-period and value filters need the metadata of every frame.",
  "filter.metaLoad": "Load metadata ({n})",
  "charts.add": "+ add a quantity…",
  "charts.remove": "Remove",
  "gallery.empty": "No frames.",
  "gallery.prevHour": "Previous hour",
  "gallery.nextHour": "Next hour",
  "gallery.hourTitle": "{h}:00 UTC — {n} frames",

  "period.day": "Day",
  "period.civil_twilight": "Civil twilight",
  "period.nautical_twilight": "Nautical twilight",
  "period.astronomical_twilight": "Astronomical twilight",
  "period.night": "Night",

  "field.exposure_s": "Exposure",
  "field.exposure_us": "Exposure",
  "field.analogue_gain": "Gain",
  "field.focus_score": "Sharpness (focus score)",
  "field.sky_state.sun_altitude_deg": "Sun altitude",
  "field.sky_state.sun_azimuth_deg": "Sun azimuth",
  "field.sky_state.moon_altitude_deg": "Moon altitude",
  "field.sky_state.moon_azimuth_deg": "Moon azimuth",
  "field.sky_state.moon_illumination": "Moon illumination",
  "field.exposure_control.measured_ev": "Measured brightness",
  "field.exposure_control.target_ev": "Target brightness",
  "field.exposure_control.p99_ev": "Brightness p99",
  "field.exposure_control.error_ev": "Control error",
  "field.exposure_control.applied_ev": "Applied",
  "field.exposure_control.output_ev": "Controller output",

  // data layer
  "data.camera": "Camera",
  "data.catalog": "Catalog",
  "data.cameraLabel": "camera: {url}",
  "err.noSource": "Camera “{id}” in the catalog has no source defined.",
  "err.emptyCatalog": "The catalog contains no cameras.",
  "err.unknownType": "Unknown source type: {type}",
  "err.indexFormat": "Unknown JSON directory listing format.",
  "err.network": "Cannot load {url} — the server is unreachable or does not allow CORS for this domain.",
  "err.http": "HTTP {status} while loading {url}",
  "err.s3Config": "An S3 source needs either `url`, or `endpoint` + `bucket`.",
  "err.s3Xml": "S3: the response is not valid ListObjectsV2 XML.",
};

type Key = keyof typeof en;

const cs: Record<Key, string> = {
  "start.tagline": "Archiv all-sky kamer přímo v prohlížeči",
  "start.docs": "Dokumentace",
  "start.recent": "Naposledy navštívené kamery",
  "start.recentClear": "Vymazat",
  "start.recentRemove": "Odebrat ze seznamu",
  "start.recentEmpty": "Kamery, které otevřete, se tu příště objeví v seznamu naposledy navštívených.",
  "start.open": "Otevřít zdroj dat",
  "start.openOther": "Otevřít jiný zdroj",
  "start.modeCatalog": "Katalog kamer",
  "start.modeDirect": "Přímý zdroj",
  "start.catalogUrl": "URL katalogu (JSON)",
  "start.catalogHint": "Seznam kamer se zdroji a metadaty stanic — viz",
  "start.catalogExample": "příklad",
  "start.sourceType": "Typ zdroje",
  "start.endpoint": "Endpoint",
  "start.bucket": "Bucket",
  "start.prefix": "Prefix",
  "start.cameraIp": "IP adresa kamery (případně :port)",
  "start.directoryUrl": "URL adresáře kamery",
  "start.name": "Název",
  "start.cameraLink": "Odkaz na kameru",
  "start.optional": "nepovinné",
  "start.cors": "Data se čtou přímo ze zdroje — server musí povolit CORS.",
  "start.submit": "Otevřít",
  "start.docsViewer": "zdroje dat, katalog, parametry URL",
  "start.docsCaelum": "software all-sky kamery — instalace, nahrávání dat",
  "start.docsDeveloper": "kamery a příslušenství",
  "start.features": "Co umí",
  "start.keys": "Klávesy",
  "start.links": "Odkazy",
  "start.linksHint": "Stav pohledu je v URL — odkaz lze uložit nebo sdílet. Volitelně",
  "start.copy": "Kopírovat",
  "start.copied": "Zkopírováno",
  "start.footer": "statická aplikace bez backendu",
  "start.language": "Jazyk",

  "source.http-index": "HTTP index",
  "source.http-index.hint": "Adresář na webovém serveru s výpisem souborů (Apache / nginx / Caddy).",
  "source.s3": "S3",
  "source.s3.hint": "Veřejně čitelný bucket, výpis přes ListObjectsV2.",
  "source.caelum": "Kamera caelum",
  "source.caelum.hint": "Čtení přímo z kamery v lokální síti podle IP adresy.",
  "source.caelum-manifest": "Caelum manifest",
  "source.caelum-manifest.hint": "manifest.json z uploaderu caelum, bez výpisu adresářů.",
  "kind.catalog": "katalog",
  "kind.http-index": "http",
  "kind.s3": "s3",
  "kind.caelum": "kamera",
  "kind.caelum-manifest": "manifest",

  "feature.timeline": "Časová osa 24 h UTC",
  "feature.timeline.text": "obarvená podle fáze dne — den, soumraky, noc",
  "feature.timelapse": "Time-lapse",
  "feature.timelapse.text": "přehrávání 2–30 snímků/s s předběžným načítáním",
  "feature.live": "Live",
  "feature.live.text": "každých 30 s nejnovější snímek z kamery",
  "feature.charts": "Grafy metadat",
  "feature.charts.text": "expozice, gain, Slunce, Měsíc — se synchronizovaným kurzorem",
  "feature.filters": "Filtry",
  "feature.filters.text": "fáze dne, rozsahy hodnot, dostupnost RAW",
  "feature.raw": "RAW",
  "feature.raw.text": "stažení původního DNG a JSON metadat",

  "key.frame": "snímek (Shift po 10)",
  "key.space": "Mezerník",
  "key.play": "přehrávání",
  "key.live": "live",
  "key.fullscreen": "celá obrazovka",
  "key.zoom": "zoom",
  "key.overlay": "overlay",

  "app.loadingCatalog": "Načítám katalog…",
  "app.catalogError": "Katalog: {msg}",
  "viewer.home": "Úvodní stránka",
  "viewer.cameraLink": "Kamera ↗",
  "viewer.prevDay": "Předchozí den s daty",
  "viewer.nextDay": "Další den s daty",
  "viewer.today": "Dnes",
  "viewer.todayTitle": "Dnes (UTC)",
  "viewer.liveTitle": "Živě — nejnovější snímek (L)",
  "viewer.loadingList": "Načítám seznam…",
  "viewer.metadataProgress": "metadata: {done}/{total}",
  "viewer.noDataForDay": " · pro tento den nejsou data",
  "viewer.docs": "Dokumentace ↗",
  "viewer.first": "První (Home)",
  "viewer.prev": "Předchozí (←)",
  "viewer.play": "Přehrát (mezerník)",
  "viewer.next": "Další (→)",
  "viewer.last": "Poslední (End)",
  "viewer.speed": "Rychlost přehrávání",
  "viewer.fps": "{n} snímků/s",
  "viewer.overlay": "overlay",
  "viewer.charts": "Grafy",
  "viewer.chartsTitle": "Grafy načtou metadata všech snímků dne",
  "viewer.gallery": "Galerie ({n})",
  "viewer.noFrame": "Žádný snímek",
  "viewer.noPreview": "Snímek nemá náhled (jen RAW)",
  "viewer.previewFailed": "Náhled se nepodařilo načíst",
  "viewer.zoomIn": "Přiblížit (+)",
  "viewer.zoomOut": "Oddálit (−)",
  "viewer.zoomReset": "Původní velikost (0)",
  "viewer.fullscreen": "Celá obrazovka (F)",
  "viewer.mode": "Režim zobrazení",
  "viewer.modeSimple": "Jednoduchý",
  "viewer.modeSimpleTitle": "Jen obrázek, overlay, přehrávání a časová osa",
  "viewer.modeAdvanced": "Pokročilý",
  "viewer.modeAdvancedTitle": "Všechny panely: metadata, filtry, galerie a grafy",
  "viewer.files": "Soubory tohoto snímku",
  "viewer.fileThumb": "náhled",
  "viewer.fileRaw": "raw",
  "viewer.fileOverlay": "overlay",
  "viewer.fileJson": "json",
  "viewer.fileYes": "{name}: k dispozici",
  "viewer.fileNo": "{name}: chybí",
  "viewer.fileUnknown": "{name}: neznámé, dokud se nenačtou metadata",
  "meta.preview": "Náhled",
  "meta.loading": "Načítám metadata…",
  "meta.none": "Bez metadat",
  "filter.title": "Filtr",
  "range.start": "Úsek začíná tímto snímkem ([)",
  "range.end": "Úsek končí tímto snímkem (])",
  "range.clear": "Zrušit úsek (Esc)",
  "range.label": "Přehrávání a export jen v tomto úseku",
  "export.title": "Export",
  "export.wholeDay": "celý den",
  "export.rangeHint": "Exportuje se celý den. Úsek vyznačíte klávesami [ a ] na aktuálním snímku nebo tažením se Shiftem na časové ose.",
  "export.rangeSet": "Přehrávání běží dokola v úseku a exportuje se jen on.",
  "export.filtered": "Zahrnuté jsou jen snímky, které projdou filtrem.",
  "export.fps": "Video",
  "export.size": "Velikost",
  "export.sizeOriginal": "původní",
  "export.stamp": "kamera a čas v obraze",
  "export.video": "Stáhnout video",
  "export.duration": "{s} s videa",
  "export.noVideo": "Tento prohlížeč neumí kódovat video (chybí WebCodecs) — stáhněte místo toho obrázky.",
  "export.zip": "Stáhnout obrázky (ZIP)",
  "export.json": "s JSON metadaty",
  "export.encoding": "Kóduji {done}/{total}",
  "export.packing": "Stahuji {done}/{total}",
  "export.cancel": "Zrušit",
  "export.failed": "Export selhal: {msg}",
  "export.skipped": "Souborů, které se nepodařilo stáhnout a chybí: {n}.",
  "export.nothing": "Ve výběru nejsou snímky s náhledem.",
  "export.noCodec": "Prohlížeč nemá kodér videa pro {w}×{h} px — zkuste menší velikost.",
  "filter.reset": "zrušit",
  "filter.rawOnly": "jen s RAW",
  "filter.remove": "Odebrat",
  "filter.addRule": "+ podmínka na hodnotu",
  "filter.metaHint": "Filtry podle fáze dne a hodnot potřebují metadata všech snímků.",
  "filter.metaLoad": "Načíst metadata ({n})",
  "charts.add": "+ přidat veličinu…",
  "charts.remove": "Odebrat",
  "gallery.empty": "Žádné snímky.",
  "gallery.prevHour": "Předchozí hodina",
  "gallery.nextHour": "Další hodina",
  "gallery.hourTitle": "{h}:00 UTC — snímků: {n}",

  "period.day": "Den",
  "period.civil_twilight": "Občanský soumrak",
  "period.nautical_twilight": "Nautický soumrak",
  "period.astronomical_twilight": "Astronomický soumrak",
  "period.night": "Noc",

  "field.exposure_s": "Expozice",
  "field.exposure_us": "Expozice",
  "field.analogue_gain": "Gain",
  "field.focus_score": "Ostrost (focus score)",
  "field.sky_state.sun_altitude_deg": "Výška Slunce",
  "field.sky_state.sun_azimuth_deg": "Azimut Slunce",
  "field.sky_state.moon_altitude_deg": "Výška Měsíce",
  "field.sky_state.moon_azimuth_deg": "Azimut Měsíce",
  "field.sky_state.moon_illumination": "Osvětlení Měsíce",
  "field.exposure_control.measured_ev": "Naměřený jas",
  "field.exposure_control.target_ev": "Cílový jas",
  "field.exposure_control.p99_ev": "Jas p99",
  "field.exposure_control.error_ev": "Chyba regulace",
  "field.exposure_control.applied_ev": "Aplikováno",
  "field.exposure_control.output_ev": "Výstup regulátoru",

  "data.camera": "Kamera",
  "data.catalog": "Katalog",
  "data.cameraLabel": "kamera: {url}",
  "err.noSource": "Kamera „{id}“ v katalogu nemá definovaný zdroj (source).",
  "err.emptyCatalog": "Katalog neobsahuje žádné kamery.",
  "err.unknownType": "Neznámý typ zdroje: {type}",
  "err.indexFormat": "Neznámý formát JSON výpisu adresáře.",
  "err.network": "Nelze načíst {url} — server je nedostupný nebo nepovoluje CORS pro tuto doménu.",
  "err.http": "HTTP {status} při načítání {url}",
  "err.s3Config": "S3 zdroj potřebuje buď `url`, nebo `endpoint` + `bucket`.",
  "err.s3Xml": "S3: odpověď není platné XML ListObjectsV2.",
};

const DICTS: Record<Lang, Record<Key, string>> = { en, cs };

const PLURALS: Record<Lang, Record<"frames", Plural>> = {
  en: { frames: { one: "{n} frame", other: "{n} frames" } },
  cs: { frames: { one: "{n} snímek", few: "{n} snímky", many: "{n} snímku", other: "{n} snímků" } },
};

const STORAGE_KEY = "caelum-viewer:lang";

function isLang(v: unknown): v is Lang {
  return typeof v === "string" && v in LANGS;
}

export function detectLang(search = typeof location === "undefined" ? "" : location.search): Lang {
  const fromUrl = new URLSearchParams(search).get("lang");
  if (isLang(fromUrl)) return fromUrl;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLang(stored)) return stored;
  } catch {
    // storage unavailable
  }
  const prefs = typeof navigator === "undefined" ? [] : (navigator.languages ?? [navigator.language]);
  for (const p of prefs) {
    const base = p?.toLowerCase().split("-")[0];
    if (isLang(base)) return base;
  }
  return "en";
}

let current: Lang = detectLang();
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // not remembered, still switched
  }
  if (typeof document !== "undefined") document.documentElement.lang = lang;
  listeners.forEach((l) => l());
}

export function subscribeLang(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function fill(text: string, vars?: Record<string, string | number>): string {
  return vars ? text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : text;
}

export function t(key: Key, vars?: Record<string, string | number>): string {
  return fill(DICTS[current][key] ?? en[key], vars);
}

/** Like `t`, but returns undefined for keys that have no translation (e.g. unknown metadata fields). */
export function tMaybe(key: string): string | undefined {
  return (DICTS[current] as Record<string, string>)[key];
}

export function tn(key: "frames", n: number): string {
  const forms = PLURALS[current][key];
  const cat = new Intl.PluralRules(current).select(n);
  return fill(forms[cat] ?? forms.other, { n });
}

/** "5 minutes ago", "yesterday", … — coarse, for the recent list. */
export function ago(at: number, now = Date.now()): string {
  const rtf = new Intl.RelativeTimeFormat(current, { numeric: "auto" });
  const min = Math.round((at - now) / 60_000);
  if (Math.abs(min) < 60) return rtf.format(min, "minute");
  const h = Math.round(min / 60);
  if (Math.abs(h) < 24) return rtf.format(h, "hour");
  const d = Math.round(h / 24);
  if (Math.abs(d) < 30) return rtf.format(d, "day");
  return new Date(at).toLocaleDateString(current);
}
