import { useEffect, useRef, useState } from "react";
import type { CameraArchive, Frame, FrameMeta } from "../data/archive";

const METADATA_CONCURRENCY = 8;
const FLUSH_MS = 250;

/**
 * Loads sidecar metadata for `wanted` frames in the background with bounded
 * concurrency, publishing results in batches so charts fill in
 * progressively without a re-render per file. Already-loaded entries are
 * kept, so widening `wanted` (e.g. from the frames around the current one to
 * the whole day) or live polling only fetches what is new.
 */
export function useMetadata(archive: CameraArchive, wanted: Frame[]) {
  const store = useRef(new Map<string, FrameMeta>());
  const [metaMap, setMetaMap] = useState<Map<string, FrameMeta>>(() => new Map());
  const [pending, setPending] = useState(0);

  useEffect(() => {
    store.current = new Map();
    setMetaMap(new Map());
  }, [archive]);

  useEffect(() => {
    let cancelled = false;
    // Results land in this archive's map even after a restart, so an
    // in-flight request is never wasted; a new archive gets a new map.
    const target = store.current;
    const queue = wanted.filter((f) => (f.meta || f.rawMeta) && !target.has(f.id));
    let remaining = queue.length;
    setPending(remaining);
    if (!remaining) return;
    let dirty = false;
    const publish = () => {
      if (store.current === target) setMetaMap(new Map(target));
    };
    const timer = setInterval(() => {
      if (dirty && !cancelled) {
        dirty = false;
        publish();
        setPending(remaining);
      }
    }, FLUSH_MS);
    const worker = async () => {
      while (!cancelled && queue.length) {
        const frame = queue.shift()!;
        try {
          const meta = await archive.metadata(frame);
          if (meta) target.set(frame.id, meta);
        } catch {
          // A single broken sidecar shouldn't stop the rest.
        }
        remaining--;
        dirty = true;
      }
    };
    Promise.all(Array.from({ length: Math.min(METADATA_CONCURRENCY, queue.length) }, worker)).then(() => {
      clearInterval(timer);
      publish();
      if (!cancelled) setPending(0);
    });
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [archive, wanted]);

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
