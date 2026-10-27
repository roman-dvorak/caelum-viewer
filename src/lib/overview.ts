/** Typical spacing of a camera's frames (median gap, ms); undefined with fewer than two frames. */
export function typicalInterval(items: { t: number }[]): number | undefined {
  if (items.length < 2) return undefined;
  const gaps = items.slice(1).map((f, i) => f.t - items[i].t).sort((a, b) => a - b);
  return gaps[gaps.length >> 1];
}

/**
 * Steps of the shared timeline of several cameras: all frame times merged,
 * with times closer together than half the typical interval collapsed into
 * one (cameras don't capture in sync), so one step moves every camera by
 * about one frame. Each list must be sorted by `t`.
 */
export function timeSlots(lists: { t: number }[][]): number[] {
  const times = lists.flatMap((l) => l.map((f) => f.t)).sort((a, b) => a - b);
  const intervals = lists.map(typicalInterval).filter((x): x is number => x !== undefined);
  const gap = intervals.length ? Math.min(...intervals) / 2 : 0;
  const out: number[] = [];
  for (const t of times) if (!out.length || t - out[out.length - 1] > gap) out.push(t);
  return out;
}
