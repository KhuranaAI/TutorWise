// Timezone helpers. All stored instants are ISO-8601 UTC; local reasoning uses the profile's IANA zone.
const MIN = 60_000;

function offsetMinutes(date, tz) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(date).map((p) => [p.type, p.value]),
  );
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUTC - date.getTime()) / MIN);
}

/** Local wall-clock time on a local date ("2026-11-14", "09:30") in tz -> Date. DST-safe. */
export function zoned(dateStr, hhmm, tz) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let t = guess - offsetMinutes(new Date(guess), tz) * MIN;
  t = guess - offsetMinutes(new Date(t), tz) * MIN; // second pass settles DST edges
  return new Date(t);
}

/** Local calendar date (YYYY-MM-DD) of an instant in tz. */
export function localDate(date, tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function localHHMM(date, tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Whole local days from a to b (b - a). */
export function daysBetween(a, b) {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000);
}

export const minutes = (a, b) => Math.round((b - a) / MIN);
export const plusMinutes = (date, n) => new Date(date.getTime() + n * MIN);
