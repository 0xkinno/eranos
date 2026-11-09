// Small timezone helpers with no dependencies (Intl only).
export function localParts(ms: number, tz: string) {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute };
}
/** Local wall time in tz to epoch ms (two-pass offset correction, fine away from DST gaps). */
export function zonedToMs(y: number, m: number, d: number, h: number, min: number, tz: string) {
  let guess = Date.UTC(y, m - 1, d, h, min);
  for (let i = 0; i < 2; i++) {
    const l = localParts(guess, tz);
    const diff = Date.UTC(y, m - 1, d, h, min) - Date.UTC(l.y, l.m - 1, l.d, l.h, l.min);
    guess += diff;
  }
  return guess;
}
export const HOUR = 3_600_000;
export const isQuiet = (ms: number, tz: string, quiet = { from: 21, to: 8 }) => {
  const h = localParts(ms, tz).h;
  return quiet.from > quiet.to ? h >= quiet.from || h < quiet.to : h >= quiet.from && h < quiet.to;
};
