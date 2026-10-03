# Caelum Viewer

Statická webová aplikace (React + TypeScript + Vite) pro prohlížení dat z all-sky kamer
[caelum](../caelum). Nemá žádný vlastní backend — běží na GitHub Pages a data čte přímo
z S3 nebo z HTTP výpisu adresářů (Apache / nginx / Caddy).

## Funkce

- výběr kamery (katalog), dne a času; stav pohledu je v URL (bookmark / sdílení odkazu)
- časová osa 24 h UTC obarvená podle fáze dne (den / soumraky / noc), klik a tažení = posun
- detail snímku se zoomem (kolečko, +/−), posunem tažením a fullscreenem
- overlay (čas, expozice, gain, fáze, Slunce, Měsíc), tabulka metadat
- stažení původního RAW (DNG), odkaz na náhled a JSON metadat
- přehrávání jako time-lapse (2–30 snímků/s), předběžné načítání dalších snímků
- live režim — každých 30 s načte seznam a zobrazí nejnovější snímek
- grafy libovolných číselných metadat se synchronizovaným kurzorem;
  svislá čára sleduje zobrazený snímek, klik do grafu otevře odpovídající snímek
- filtrování podle fáze dne, rozsahů hodnot metadat a dostupnosti RAW
  (filtr platí i pro přehrávání, galerii a grafy)
- galerie WebP náhledů

Klávesy: `←/→` (se Shiftem po 10), `Home/End`, mezerník = přehrávání, `F` = fullscreen,
`+/−/0` = zoom, `L` = live, `O` = overlay.

## Spuštění

Přímý zdroj:

```
https://roman-dvorak.github.io/caelum-viewer/?type=http-index&source=https://data.example.org/camera01/
https://roman-dvorak.github.io/caelum-viewer/?type=s3&endpoint=https://s3.example.org&bucket=allsky&prefix=camera01/
https://roman-dvorak.github.io/caelum-viewer/?type=caelum-manifest&source=https://data.example.org/camera01/
https://roman-dvorak.github.io/caelum-viewer/?type=caelum&source=192.168.1.50
```

Katalog kamer:

```
https://roman-dvorak.github.io/caelum-viewer/?catalog=https://example.org/cameras.json
```

Další parametry: `camera=<id>`, `date=YYYY-MM-DD`, `time=HH:MM[:SS]` (UTC), `live=1`,
`name=<název>` a `link=<URL webového rozhraní kamery>` (u přímého zdroje), `thumbnails=` / `raw=` (šablona rozložení, viz níže).

### Katalog

Viz [`public/examples/cameras.json`](public/examples/cameras.json). Každá kamera má `id`,
`name`, `source` a volitelně `link` (odkaz na webové rozhraní kamery, v liště jako „Kamera ↗“), `layout` a libovolná další metadata stanice. Relativní URL se
vyhodnocují vůči URL katalogu. Přijímá se i `cameras.json`, který generuje uploader caelum
(`{cameras:[{slug,name,manifest}]}`).

Do URL ani do katalogu nepatří žádné S3 klíče — viewer počítá s veřejně čitelnými daty.

## Zdroje dat

Zbytek aplikace pracuje jen s rozhraním `DataSource` ([src/data/types.ts](src/data/types.ts)):

```ts
interface DataSource {
  list(path: string): Promise<Entry[]>;
  url(path: string): string;
}
```

| typ | adaptér | poznámka |
| --- | --- | --- |
| `s3` | [`S3DataSource`](src/data/s3.ts) | `ListObjectsV2` s `delimiter=/`, stránkování, path-style nebo `style=virtual` |
| `http-index` | [`HttpIndexDataSource`](src/data/httpIndex.ts) | JSON výpis (nginx `autoindex_format json`, Caddy), jinak parsuje HTML výpis |
| `caelum` | [`CaelumApiDataSource`](src/data/caelumApi.ts) | přímo z kamery přes její API (`/api/files`); stačí IP, výchozí port 8000 — viz níže |
| `caelum-manifest` | [`CaelumManifestDataSource`](src/data/caelumManifest.ts) | pro hosting bez výpisu adresářů — čte `manifest.json` + `index.json` z uploaderu caelum (bez RAW) |

Nový zdroj = nová třída implementující `DataSource` + řádek v
[`src/data/factory.ts`](src/data/factory.ts).

### Rozložení souborů

Výchozí odpovídá caelum (`storage/paths.py`):

```
thumbnails/YYYY/MM/DD/YYYYMMDD-HHMMSS.webp   náhled
thumbnails/YYYY/MM/DD/YYYYMMDD-HHMMSS.json   metadata
raw/YYYY/MM/DD/YYYYMMDD-HHMMSS.dng           RAW (stahuje se až na požádání)
```

Jiná struktura se nastaví šablonou s `{YYYY}`, `{MM}`, `{DD}`, např.
`"layout": {"thumbnails": "{YYYY}/{YYYY}-{MM}-{DD}/webp/", "raw": "{YYYY}/{YYYY}-{MM}-{DD}/dng/"}`.
Soubory se párují podle společného názvu bez přípony; čas snímku se bere z `YYYYMMDD-HHMMSS`
v názvu. Viewer nejdřív načítá jen výpisy a malé JSONy (8 souběžně), RAW nikdy automaticky.

## CORS

Data jsou na jiné doméně než viewer, server proto musí posílat CORS hlavičky.

S3 (`aws s3api put-bucket-cors --bucket allsky --cors-configuration file://cors.json`):

```json
{ "CORSRules": [{ "AllowedOrigins": ["https://roman-dvorak.github.io"], "AllowedMethods": ["GET", "HEAD"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 3600 }] }
```

Bucket musí povolit anonymní `s3:ListBucket` i `s3:GetObject`.

nginx:

```nginx
location /allsky/ {
    autoindex on;
    autoindex_format json;          # strojově čitelný výpis (doporučeno)
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

## Přímo z kamery v lokální síti

`?type=caelum&source=192.168.1.50` (nebo `192.168.1.50:8000`, `allsky.local`, celé URL) čte
snímky přímo z API kamery. Podmínky:

- kamera povoluje CORS pro origin vieweru — caelum má proměnnou `CAELUM_CORS_ORIGINS`
  (výchozí `https://roman-dvorak.github.io`),
- v konfiguraci kamery je `auth.preview_access: "public"` — stránka z jiné domény nedostane
  přihlašovací cookie kamery,
- prohlížeč: viewer běží na https, kamera na http. Chrome/Edge to u adres z lokální sítě
  (10.x, 192.168.x, 172.16–31.x, `*.local`) povolí po jednorázovém potvrzení dotazu
  „přístup k zařízením v místní síti“. Firefox a Safari takové požadavky blokují (mixed
  content) — tam je potřeba kameru zpřístupnit přes https.

## Vývoj

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest
npm run build      # dist/
```

Lokální test nad daty kamery (Python server s CORS a HTML výpisem):

```bash
python3 -c 'import http.server as h,functools as f
class H(h.SimpleHTTPRequestHandler):
  def end_headers(s): s.send_header("Access-Control-Allow-Origin","*"); super().end_headers()
h.ThreadingHTTPServer(("",8765),f.partial(H,directory="../caelum/data")).serve_forever()'
```

a otevřít `http://localhost:5173/?type=http-index&source=http://localhost:8765/`.

## Nasazení

Workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) při každém push do
`main` spustí testy, sestaví aplikaci a nasadí ji na GitHub Pages. V repozitáři je potřeba
jednou nastavit **Settings → Pages → Source: GitHub Actions**.
