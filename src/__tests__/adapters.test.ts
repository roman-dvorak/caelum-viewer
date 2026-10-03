import { describe, expect, it, vi, afterEach } from "vitest";
import { parseListObjectsV2, S3DataSource, s3BucketUrl } from "../data/s3";
import { parseHtmlListing, parseJsonListing, HttpIndexDataSource } from "../data/httpIndex";
import { normalizeCatalog } from "../data/catalog";

afterEach(() => vi.unstubAllGlobals());

const S3_PAGE = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>allsky</Name><Prefix>camera01/thumbnails/2026/10/03/</Prefix>
  <IsTruncated>true</IsTruncated><NextContinuationToken>tok1</NextContinuationToken>
  <Contents><Key>camera01/thumbnails/2026/10/03/20261003-000047.webp</Key><Size>1234</Size><LastModified>2026-10-03T00:00:50.000Z</LastModified></Contents>
  <Contents><Key>camera01/thumbnails/2026/10/03/</Key><Size>0</Size></Contents>
  <CommonPrefixes><Prefix>camera01/thumbnails/2026/10/03/sub/</Prefix></CommonPrefixes>
</ListBucketResult>`;

describe("S3", () => {
  it("parses ListObjectsV2", () => {
    const page = parseListObjectsV2(S3_PAGE);
    expect(page.nextToken).toBe("tok1");
    expect(page.prefixes).toEqual(["camera01/thumbnails/2026/10/03/sub/"]);
    expect(page.objects[0]).toMatchObject({ key: "camera01/thumbnails/2026/10/03/20261003-000047.webp", size: 1234 });
  });

  it("reports S3 errors", () => {
    expect(() => parseListObjectsV2("<Error><Code>AccessDenied</Code><Message>nope</Message></Error>")).toThrow(/AccessDenied/);
  });

  it("builds bucket URLs", () => {
    expect(s3BucketUrl({ type: "s3", endpoint: "https://s3.example.org/", bucket: "allsky" })).toBe("https://s3.example.org/allsky/");
    expect(s3BucketUrl({ type: "s3", endpoint: "https://s3.example.org", bucket: "allsky", style: "virtual" })).toBe("https://allsky.s3.example.org/");
  });

  it("lists with pagination and relative paths", async () => {
    const last = S3_PAGE.replace("<IsTruncated>true", "<IsTruncated>false").replace(/<Contents>.*?<\/Contents>/s, "<Contents><Key>camera01/thumbnails/2026/10/03/20261003-000047.json</Key><Size>9</Size></Contents>");
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(S3_PAGE)).mockResolvedValueOnce(new Response(last));
    vi.stubGlobal("fetch", fetchMock);
    const s3 = new S3DataSource({ type: "s3", endpoint: "https://s3.example.org", bucket: "allsky", prefix: "camera01" });
    const entries = await s3.list("thumbnails/2026/10/03/");
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://s3.example.org/allsky/?list-type=2&delimiter=%2F&prefix=camera01%2Fthumbnails%2F2026%2F10%2F03%2F",
    );
    expect(fetchMock.mock.calls[1][0]).toContain("continuation-token=tok1");
    expect(entries.map((e) => e.path)).toEqual([
      "thumbnails/2026/10/03/sub/",
      "thumbnails/2026/10/03/20261003-000047.webp",
      "thumbnails/2026/10/03/sub/",
      "thumbnails/2026/10/03/20261003-000047.json",
    ]);
    expect(s3.url("thumbnails/a b.webp")).toBe("https://s3.example.org/allsky/camera01/thumbnails/a%20b.webp");
  });
});

describe("HTTP index", () => {
  it("parses an Apache listing", () => {
    const html = `<html><body><h1>Index of /cam/thumbnails/</h1><table>
      <tr><th><a href="?C=N;O=D">Name</a></th></tr>
      <tr><td><a href="/cam/">Parent Directory</a></td></tr>
      <tr><td><a href="2026/">2026/</a></td></tr>
      <tr><td><a href="20261003-000047.webp">20261003-000047.webp</a></td></tr>
      <tr><td><a href="https://elsewhere.org/x">x</a></td></tr>
    </table></body></html>`;
    expect(parseHtmlListing(html, "https://data.example.org/cam/thumbnails/")).toEqual([
      { name: "2026", isDir: true },
      { name: "20261003-000047.webp", isDir: false },
    ]);
  });

  it("parses nginx and Caddy JSON listings", () => {
    expect(parseJsonListing('[{"name":"2026","type":"directory","mtime":"x"},{"name":"a.webp","type":"file","size":5}]')).toEqual([
      { name: "2026", isDir: true, size: undefined, modified: "x" },
      { name: "a.webp", isDir: false, size: 5, modified: undefined },
    ]);
    expect(parseJsonListing('[{"name":"2026/","is_dir":true}]')[0]).toMatchObject({ name: "2026", isDir: true });
  });

  it("maps listing entries to source-relative paths", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('[{"name":"10","type":"directory"}]', { headers: { "content-type": "application/json" } })));
    const src = new HttpIndexDataSource("https://data.example.org/cam");
    expect(await src.list("thumbnails/2026/")).toEqual([{ name: "10", isDir: true, path: "thumbnails/2026/10/", size: undefined, modified: undefined }]);
    expect(src.url("thumbnails/x.webp")).toBe("https://data.example.org/cam/thumbnails/x.webp");
  });
});

describe("catalog", () => {
  it("normalizes the viewer format and resolves relative URLs", () => {
    const c = normalizeCatalog(
      { cameras: [{ id: "c2", name: "Camera 02", source: { type: "http-index", url: "camera02/" }, location: { lat: 1 } }] },
      "https://example.org/cams/cameras.json",
    );
    expect(c.cameras[0]).toMatchObject({ id: "c2", source: { url: "https://example.org/cams/camera02/" }, location: { lat: 1 } });
  });

  it("accepts caelum's uploader cameras.json", () => {
    const c = normalizeCatalog({ cameras: [{ slug: "amasc01", name: "AMASC 01", manifest: "amasc01/manifest.json" }] }, "https://h.org/allsky/cameras.json");
    expect(c.cameras[0]).toMatchObject({ id: "amasc01", source: { type: "caelum-manifest", url: "https://h.org/allsky/amasc01/manifest.json" } });
  });
});
