const pad = (n: number) => String(n).padStart(2, "0");

export function utcDate(t: number): string {
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function utcTime(t: number): string {
  const d = new Date(t);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

export function todayUtc(): string {
  return utcDate(Date.now());
}

export function dayStart(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

/** "19:30" or "19:30:12" on `date` → ms; undefined when malformed. */
export function parseTimeOnDate(date: string, time: string): number | undefined {
  if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(time)) return undefined;
  const [h, m, s = "0"] = time.split(":");
  return dayStart(date) + ((Number(h) * 60 + Number(m)) * 60 + Number(s)) * 1000;
}

export function shiftDate(date: string, days: number): string {
  return utcDate(dayStart(date) + days * 86_400_000);
}

/** Index of the item whose `t` is closest to `t` (items sorted by t). */
export function nearestIndex(items: { t: number }[], t: number): number {
  if (!items.length) return -1;
  let lo = 0;
  let hi = items.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (items[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && t - items[lo - 1].t <= items[lo].t - t) return lo - 1;
  return lo;
}
