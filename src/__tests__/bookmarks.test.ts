import { beforeEach, describe, expect, it } from "vitest";
import {
  addBookmark,
  bookmarkHref,
  bookmarkNear,
  bookmarksOn,
  loadBookmarks,
  removeBookmark,
  setBookmarkNote,
  subscribeBookmarks,
} from "../lib/bookmarks";

const at = (iso: string) => Date.parse(iso);

describe("bookmarks", () => {
  beforeEach(() => {
    for (const b of loadBookmarks()) removeBookmark(b.id);
    localStorage.clear();
  });

  it("keeps the moment and the view it was marked in, without the view position", () => {
    const b = addBookmark(at("2026-10-03T19:30:12Z"), "Ondřejov", "Síť", {
      catalog: "https://x.org/c.json",
      camera: "a",
      date: "2026-10-03",
      time: "19:30:12",
      live: "1",
    });
    expect(b).toMatchObject({ label: "Ondřejov", catalog: "Síť", kind: "catalog", search: "?catalog=https://x.org/c.json&camera=a" });
    expect(JSON.parse(localStorage.getItem("caelum-viewer:bookmarks")!)).toHaveLength(1);
    expect(bookmarkHref(b)).toBe("?catalog=https://x.org/c.json&camera=a&date=2026-10-03&time=19:30:12");
  });

  it("sorts by time, finds them by day and by nearness", () => {
    const late = addBookmark(at("2026-10-03T23:59:00Z"), "A", undefined, { type: "caelum", source: "a" });
    const early = addBookmark(at("2026-10-03T01:00:00Z"), "B", undefined, { catalog: "https://x.org/c.json" });
    addBookmark(at("2026-10-04T00:00:00Z"), "A", undefined, { type: "caelum", source: "a" });
    expect(loadBookmarks().map((b) => b.id).slice(0, 2)).toEqual([early.id, late.id]);
    // A bookmark shows on its day whichever camera or catalog is open.
    expect(bookmarksOn(loadBookmarks(), "2026-10-03").map((b) => b.id)).toEqual([early.id, late.id]);
    expect(bookmarkNear(loadBookmarks(), at("2026-10-03T01:00:20Z"))?.id).toBe(early.id);
    expect(bookmarkNear(loadBookmarks(), at("2026-10-03T01:01:00Z"))).toBeUndefined();
    expect(bookmarkNear(loadBookmarks(), undefined)).toBeUndefined();
    expect(early.kind).toBe("group");
  });

  it("edits the note, removes and notifies", () => {
    let calls = 0;
    const off = subscribeBookmarks(() => calls++);
    const b = addBookmark(at("2026-10-03T19:30:00Z"), "A", undefined, { type: "caelum", source: "a" });
    expect(setBookmarkNote(b.id, "  bolide  ")[0].note).toBe("bolide");
    expect(setBookmarkNote(b.id, " ")[0].note).toBeUndefined();
    expect(removeBookmark(b.id)).toEqual([]);
    expect(calls).toBe(4);
    off();
  });
});
