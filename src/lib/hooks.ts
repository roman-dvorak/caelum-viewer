import { useEffect, useRef, useState } from "react";
import type { CameraArchive, Frame, FrameMeta } from "../data/archive";

const METADATA_CONCURRENCY = 8;
const FLUSH_MS = 250;

/**
 * Loads sidecar metadata for `frames` in the background with bounded
 * concurrency, publishing results in batches so charts fill in
 * progressively without a re-render per file. Already-loaded entries are
 * kept, so live polling only fetches the new frames.
 */
export function useMetadata(archive: CameraArchive, frames: Frame[]) {
  const store = useRef(new Map<string, FrameMeta>());
  const [metaMap, setMetaMap] = useState<Map<string, FrameMeta>>(() => new Map());
  const [pending, setPending] = useState(0);

  useEffect(() => {
    store.current = new Map();
    setMetaMap(new Map());
  }, [archive]);

  useEffect(() => {
    let cancelled = false;
    const queue = frames.filter((f) => (f.meta || f.rawMeta) && !store.current.has(f.id));
    let remaining = queue.length;
    setPending(remaining);
    if (!remaining) return;
    let dirty = false;
    const timer = setInterval(() => {
      if (dirty && !cancelled) {
        dirty = false;
        setMetaMap(new Map(store.current));
        setPending(remaining);
      }
    }, FLUSH_MS);
    const worker = async () => {
      while (!cancelled && queue.length) {
        const frame = queue.shift()!;
        try {
          const meta = await archive.metadata(frame);
          if (meta && !cancelled) store.current.set(frame.id, meta);
        } catch {
          // A single broken sidecar shouldn't stop the rest.
        }
        remaining--;
        dirty = true;
      }
    };
    Promise.all(Array.from({ length: METADATA_CONCURRENCY }, worker)).then(() => {
      if (cancelled) return;
      clearInterval(timer);
      setMetaMap(new Map(store.current));
      setPending(0);
    });
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [archive, frames]);

  return { metaMap, pending };
}

/** Image that only swaps once the next one is decoded — no flashing during playback. */
export function useLoadedImage(src: string | undefined) {
  const [shown, setShown] = useState<string | undefined>(src);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!src) {
      setShown(undefined);
      return;
    }
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (alive) {
        setShown(src);
        setError(false);
      }
    };
    img.onerror = () => alive && setError(true);
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src]);
  return { shown, error, loading: src !== shown && !error };
}

export function usePreload(urls: string[]) {
  useEffect(() => {
    // Not cancelled on cleanup: the frame preloaded now is usually the one
    // shown next, and aborting it would only force a second download.
    for (const u of urls) new Image().src = u;
  }, [urls.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
}
