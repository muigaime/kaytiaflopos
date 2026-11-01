// Business dates. Reports work in the hotel's local days (BUSINESS_TZ, default Africa/Nairobi);
// the database stores UTC instants.

export const BUSINESS_TZ = process.env.BUSINESS_TZ ?? "Africa/Nairobi";

const fmt = (tz: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

/** Offset of `tz` from UTC at `instant`, in ms (Nairobi: +3 h). */
function offsetMs(instant: number, tz: string): number {
  const parts = fmt(tz).formatToParts(new Date(instant));
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - instant;
}

/** The UTC instant when local day `ymd` (YYYY-MM-DD) starts in `tz`. */
export function startOfLocalDay(ymd: string, tz = BUSINESS_TZ): Date {
  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  const guess = Date.UTC(y, m - 1, d);
  let t = guess - offsetMs(guess, tz);
  const again = guess - offsetMs(t, tz); // settles days when the offset changes (DST zones)
  if (again !== t) t = again;
  return new Date(t);
}

/** Local calendar date of an instant, YYYY-MM-DD. */
export const localYmd = (at = new Date(), tz = BUSINESS_TZ) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);

export function addDaysYmd(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86_400_000);

/** A YYYY-MM-DD as the value of a Postgres DATE column. */
export const dateOnly = (ymd: string) => new Date(ymd + "T00:00:00Z");
