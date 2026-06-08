function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function midsommardag(year: number): Date {
  for (let day = 20; day <= 26; day++) {
    const d = new Date(year, 5, day);
    if (d.getDay() === 6) return d;
  }
  throw new Error("No Saturday found in June 20-26");
}

function allaHelgonsdag(year: number): Date {
  for (let offset = 0; offset <= 6; offset++) {
    const d = new Date(year, 9, 31 + offset);
    if (d.getDay() === 6) return d;
  }
  throw new Error("No Saturday found between Oct 31 and Nov 6");
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function buildHolidaysForYear(year: number): Set<string> {
  const easter = easterSunday(year);

  const dates = [
    new Date(year, 0, 1),    // Nyårsdagen
    new Date(year, 0, 6),    // Trettondedag jul
    addDays(easter, -2),     // Långfredagen
    easter,                  // Påskdagen
    addDays(easter, 1),      // Annandag påsk
    new Date(year, 4, 1),    // Första maj
    addDays(easter, 39),     // Kristi himmelsfärdsdag
    addDays(easter, 49),     // Pingstdagen
    new Date(year, 5, 6),    // Nationaldagen
    midsommardag(year),      // Midsommardagen
    allaHelgonsdag(year),    // Alla helgons dag
    new Date(year, 11, 25),  // Juldagen
    new Date(year, 11, 26),  // Annandag jul
  ];

  return new Set(dates.map(toDateKey));
}

const holidayCache = new Map<number, Set<string>>();

export function isSwedishHoliday(date: Date): boolean {
  const year = date.getFullYear();
  if (!holidayCache.has(year)) {
    holidayCache.set(year, buildHolidaysForYear(year));
  }
  return holidayCache.get(year)!.has(toDateKey(date));
}
