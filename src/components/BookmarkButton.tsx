import { addBookmark, bookmarkNear, likeOf, placeOf, removeBookmark, useBookmarks, type Bookmark, type Like } from "../lib/bookmarks";
import { t } from "../lib/i18n";
import type { ViewParams } from "../lib/urlState";
import { Icon } from "./Icon";

interface Where {
  /** Moment on screen; undefined: nothing to mark. */
  at?: number;
  /** Camera name, or the catalog title on the overview. */
  label: string;
  catalog?: string;
  /** The view to reopen the bookmark in (read when marking). */
  params: () => ViewParams;
}

/** Bookmark at the moment on screen (if any) and a toggle that marks or unmarks it. */
export function useBookmarkToggle({ at, label, catalog, params }: Where): { marked?: Bookmark; toggle: () => void } {
  const marked = bookmarkNear(useBookmarks(), at);
  const toggle = () => {
    if (at === undefined) return;
    if (!marked) addBookmark(at, label, catalog, params());
    // A bookmark with a description is only removed on confirmation.
    else if (!marked.note || confirm(t("bookmark.confirmRemove", { note: marked.note }))) removeBookmark(marked.id);
  };
  return { marked, toggle };
}

export function BookmarkButton({ marked, toggle, disabled }: { marked?: Bookmark; toggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className={`bookmark-btn${marked ? " on" : ""}`}
      aria-pressed={!!marked}
      disabled={disabled}
      title={marked ? t("bookmark.remove") + (marked.note ? ` — ${marked.note}` : "") : t("bookmark.add")}
      onClick={toggle}
    >
      <Icon name="bookmark" />
    </button>
  );
}

interface Shot {
  /** Frame on screen: its id, time and preview URL; undefined: nothing to like. */
  frame?: { id: string; t: number; src?: string };
  /** Camera name. */
  label: string;
  catalog?: string;
  /** The camera's view: a catalog with `camera`, or a direct source. */
  params: ViewParams;
}

/** Like of the frame on screen (if any) and a toggle that likes or unlikes it. */
export function useLikeToggle({ frame, label, catalog, params }: Shot): { liked?: Like; toggle: () => void } {
  const liked = likeOf(useBookmarks(), placeOf(params).search, frame?.id);
  const toggle = () => {
    if (!frame) return;
    if (!liked) addBookmark(frame.t, label, catalog, params, { id: frame.id, src: frame.src });
    else if (!liked.note || confirm(t("like.confirmRemove", { note: liked.note }))) removeBookmark(liked.id);
  };
  return { liked, toggle };
}

export function LikeButton({ liked, toggle, disabled }: { liked?: Like; toggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className={`like-btn${liked ? " on" : ""}`}
      aria-pressed={!!liked}
      disabled={disabled}
      title={liked ? t("like.remove") + (liked.note ? ` — ${liked.note}` : "") : t("like.add")}
      onClick={toggle}
    >
      <Icon name="heart" />
    </button>
  );
}
