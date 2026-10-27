# Caelum Viewer

A static web app (React + TypeScript + Vite) for browsing data from
[caelum](https://github.com/roman-dvorak/caelum) all-sky cameras. It has no backend of its
own — it runs on GitHub Pages and reads the data straight from S3, from an HTTP directory
listing (Apache / nginx / Caddy) or from the camera itself.

Documentation: [caelum.astrometers.eu](https://caelum.astrometers.eu/viewer.html) ·
developed by [AstroMeters](https://astrometers.eu/).

## Features

- pick a camera (catalog), a day and a time; the view is kept in the URL (bookmark / share a link)
- overview of a catalog with several cameras: every camera's preview side by side, all at
  one shared time set by a single plain timeline at the bottom (click / drag, ←/→, playback,
  live); a camera with no frame within an hour of that time shows none; the magnifier (or a
  click on the image) enlarges a camera over the whole page — Esc or a click closes it; each
  tile opens its camera in the full viewer at the frame it shows, and “All cameras” in the
  top bar goes back
- 24 h UTC timeline coloured by sky period (day / twilights / night); click and drag to seek
- frame detail with zoom (wheel, +/−), drag to pan and fullscreen
- overlay (time, exposure, gain, period, Sun, Moon) and a metadata table
- download of the original RAW (DNG), links to the preview and the JSON metadata
- time-lapse playback (2–30 frames/s) with preloading of the next frames
- simple mode (image, overlay, playback and timeline only; the default) and advanced mode
  with all panels; the choice is remembered in the browser
- tags in the image corner showing whether the frame has a preview, RAW, overlay elements and JSON
- a section of the day (`[` / `]` at the current frame, or Shift+drag on the timeline):
  playback loops within it and it can be exported in the browser as a video (MP4, encoded
  with WebCodecs, optionally with the camera name and time burnt in) or as a ZIP of the
  previews (optionally with the JSON metadata)
- live mode — reloads the list every 30 s and shows the newest frame; warns when the newest
  frame is older than an hour (camera may have stopped) and, more urgently, older than a day
- gallery of WebP previews, paginated by UTC hour
- charts of any numeric metadata with a synchronised cursor; a vertical line follows the
  frame on screen, a click in a chart opens the matching frame
- filters by sky period, metadata value ranges and RAW availability
  (they apply to playback, the gallery and the charts too)
- metadata on request: on open only the frame on screen and its neighbours are loaded; the
  whole day loads once the charts are opened, a period / value filter is used, or
  “Load metadata” is pressed
- recently viewed cameras and catalog overviews on the start screen (kept in the browser's
  localStorage); pinned entries stay at the top and are never pushed out or cleared
- English and Czech UI
- installable as an app (PWA): “Install” in Chrome / Edge, “Add to Home Screen” on iOS and
  Android; the app itself opens offline, camera data is always loaded live

Keys: `←/→` (with Shift by 10; in the overview by one shared step), `Home/End`, Space = playback, `F` = fullscreen,
`+/−/0` = zoom, `L` = live, `O` = overlay, `[` / `]` = section start / end at the current
frame, `Esc` = cancel the section.

## Usage

Direct source:

```
https://roman-dvorak.github.io/caelum-viewer/?type=http-index&source=https://data.example.org/camera01/
https://roman-dvorak.github.io/caelum-viewer/?type=s3&endpoint=https://s3.example.org&bucket=allsky&prefix=camera01/
https://roman-dvorak.github.io/caelum-viewer/?type=caelum-manifest&source=https://data.example.org/camera01/
https://roman-dvorak.github.io/caelum-viewer/?type=caelum&source=192.168.1.50
```

Camera catalog:

```
https://roman-dvorak.github.io/caelum-viewer/?catalog=https://example.org/cameras.json
```

Other parameters: `camera=<id>` (without it a catalog of several cameras shows the overview), `date=YYYY-MM-DD`, `time=HH:MM[:SS]` (UTC), `live=1`,
`from=` / `to=HH:MM[:SS]` (section of the day), `mode=simple|advanced`,
`name=<name>` and `link=<URL of the camera's web interface>` (direct source only),
`thumbnails=` / `raw=` (layout template, see below), `lang=en|cs` (UI language; by default
it follows the browser and the EN/CS switch remembers the choice).

### Catalog

See [`public/examples/cameras.json`](public/examples/cameras.json). The whole group of cameras
is named by `title` (`name` is accepted too) and optionally described by `description`; the
title heads the overview and the top bar and labels the group in the recent list.
A catalog with more than one camera opens on the overview; `camera=<id>` opens one camera.

Each camera has an `id`,
a `name`, a `source` and optionally a `link` (the camera's web interface, shown in the top
bar as “Camera ↗”), a `layout` and any other station metadata. Relative URLs resolve
against the catalog's URL. The `cameras.json` written by the caelum uploader
(`{cameras:[{slug,name,manifest}]}`) is accepted as well.

The catalog is meant to be a static file that doesn't change as the cameras record: it
describes the cameras and where their data lives, nothing more. The viewer finds dates and
the newest frames from the data sources themselves, so values that go stale (`latest_thumbnail`,
`updated_at`, …) don't belong in it and are ignored if present.

No S3 keys belong in the URL or the catalog — the viewer expects publicly readable data.

## Data sources

The rest of the app only talks to the `DataSource` interface ([src/data/types.ts](src/data/types.ts)):

```ts
interface DataSource {
  list(path: string): Promise<Entry[]>;
  url(path: string): string;
}
```

| type | adapter | notes |
| --- | --- | --- |
| `s3` | [`S3DataSource`](src/data/s3.ts) | `ListObjectsV2` with `delimiter=/`, pagination, path-style or `style=virtual` |
| `http-index` | [`HttpIndexDataSource`](src/data/httpIndex.ts) | JSON listing (nginx `autoindex_format json`, Caddy), otherwise parses the HTML listing |
| `caelum` | [`CaelumApiDataSource`](src/data/caelumApi.ts) | straight from the camera via its API (`/api/files`); an IP is enough, default port 8000 — see below |
| `caelum-manifest` | [`CaelumManifestDataSource`](src/data/caelumManifest.ts) | for hosting without directory listing — reads `manifest.json` + `index.json` from the caelum uploader (no RAW) |

A new source = a new class implementing `DataSource` + a line in
[`src/data/factory.ts`](src/data/factory.ts).

### File layout

The default matches caelum (`storage/paths.py`):

```
thumbnails/YYYY/MM/DD/YYYYMMDD-HHMMSS.webp   preview
thumbnails/YYYY/MM/DD/YYYYMMDD-HHMMSS.json   metadata
raw/YYYY/MM/DD/YYYYMMDD-HHMMSS.dng           RAW (downloaded only on request)
```

A different structure is set with a template using `{YYYY}`, `{MM}`, `{DD}`, e.g.
`"layout": {"thumbnails": "{YYYY}/{YYYY}-{MM}-{DD}/webp/", "raw": "{YYYY}/{YYYY}-{MM}-{DD}/dng/"}`.
Files are paired by their common name without the extension; the capture time comes from
`YYYYMMDD-HHMMSS` in the name. The viewer loads listings first, then the small JSON
sidecars (8 at a time, the whole day only on request), and never RAW files on its own.

## CORS

The data lives on a different domain than the viewer, so the server must send CORS headers.
They have to cover the image files too, not only the listings — the video and ZIP export
download the previews with `fetch`.

S3 (`aws s3api put-bucket-cors --bucket allsky --cors-configuration file://cors.json`):

```json
{ "CORSRules": [{ "AllowedOrigins": ["https://roman-dvorak.github.io"], "AllowedMethods": ["GET", "HEAD"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 3600 }] }
```

The bucket must allow anonymous `s3:ListBucket` and `s3:GetObject`.

nginx:

```nginx
location /allsky/ {
    autoindex on;
    autoindex_format json;          # machine-readable listing (recommended)
    add_header Access-Control-Allow-Origin "https://roman-dvorak.github.io" always;
}
```

Apache:

```apache
<Directory /var/www/allsky>
    Options +Indexes
    Header set Access-Control-Allow-Origin "https://roman-dvorak.github.io"
</Directory>
```

## Straight from a camera on the local network

`?type=caelum&source=192.168.1.50` (or `192.168.1.50:8000`, `allsky.local`, a full URL)
reads frames straight from the camera's API. Requirements:

- the camera allows CORS for the viewer's origin — caelum has the `CAELUM_CORS_ORIGINS`
  variable (default `https://roman-dvorak.github.io`),
- the camera config has `auth.preview_access: "public"` — a page from another domain does
  not get the camera's login cookie,
- the browser: the viewer runs on https, the camera on http. Chrome/Edge allow this for
  local-network addresses (10.x, 192.168.x, 172.16–31.x, `*.local`) after a one-time
  “access devices on your local network” prompt. Firefox and Safari block such requests
  (mixed content) — there the camera has to be served over https.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest
npm run build      # dist/
```

Local test against camera data (a Python server with CORS and an HTML listing):

```bash
python3 -c 'import http.server as h,functools as f
class H(h.SimpleHTTPRequestHandler):
  def end_headers(s): s.send_header("Access-Control-Allow-Origin","*"); super().end_headers()
h.ThreadingHTTPServer(("",8765),f.partial(H,directory="../caelum/data")).serve_forever()'
```

then open `http://localhost:5173/?type=http-index&source=http://localhost:8765/`.

UI texts live in [`src/lib/i18n.ts`](src/lib/i18n.ts) — one dictionary per language with
the same keys as `en` (TypeScript reports a missing one). The styling follows the Caelum
design system (tokens at the top of [`src/styles.css`](src/styles.css)).

## Deployment

The [`.github/workflows/pages.yml`](.github/workflows/pages.yml) workflow runs the tests,
builds the app and deploys it to GitHub Pages on every push to `main`. The repository needs
**Settings → Pages → Source: GitHub Actions** set once.

Usage analytics ([Microsoft Clarity](https://clarity.microsoft.com/)) are enabled only when
the build gets a project ID: set the repository secret `CLARITY_PROJECT_ID`
(**Settings → Secrets and variables → Actions**). Locally, `VITE_CLARITY_ID=<id> npm run build`;
without it no tracking script is loaded.
