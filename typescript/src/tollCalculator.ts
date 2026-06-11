import type { Vehicle } from "./vehicle.js";
import { isSwedishHoliday } from "./holidays.js";

function toMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function getMinuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

const FEE_SCHEDULE = [
  { from: toMinutes("06:00"), to: toMinutes("06:30"), fee: 8 },
  { from: toMinutes("06:30"), to: toMinutes("07:00"), fee: 13 },
  { from: toMinutes("07:00"), to: toMinutes("08:00"), fee: 18 },
  { from: toMinutes("08:00"), to: toMinutes("08:30"), fee: 13 },
  { from: toMinutes("08:30"), to: toMinutes("15:00"), fee: 8 },
  { from: toMinutes("15:00"), to: toMinutes("15:30"), fee: 13 },
  { from: toMinutes("15:30"), to: toMinutes("17:00"), fee: 18 },
  { from: toMinutes("17:00"), to: toMinutes("18:00"), fee: 13 },
  { from: toMinutes("18:00"), to: toMinutes("18:30"), fee: 8 },
];

const MAX_DAILY_FEE = 60;
const CHARGE_INTERVAL_MINUTES = 60;

//TODO: maybe add a case-insensitive comparison for extra safety?
// return vehicle.type.toLowerCase() !== "car"
function isTollFreeVehicle(vehicle: Vehicle): boolean {
  return vehicle.type !== "Car";
}

function isTollFreeDate(date: Date): boolean {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return true;
  return isSwedishHoliday(date);
}

/**
 * Returns the toll fee for a single pass at the given time, ignoring
 * the daily cap and hourly deduplication rules.
 */
export function getSinglePassFee(date: Date, vehicle: Vehicle): number {
  if (isTollFreeDate(date) || isTollFreeVehicle(vehicle)) return 0;
  const minuteOfDay = getMinuteOfDay(date);
  for (const { from, to, fee } of FEE_SCHEDULE) {
    if (minuteOfDay >= from && minuteOfDay < to) return fee;
  }
  return 0;
}

//Same function as toDateKey in holidays. Refactor to a shared utility function?
function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function calculateFeeForSingleDay(vehicle: Vehicle, dates: Date[]): number {
  // Free passes can never affect the total, so they must not
  // participate in the window grouping either.
  const passes = dates
    .map((date) => ({ date, fee: getSinglePassFee(date, vehicle) }))
    .filter((pass) => pass.fee > 0);

  if (passes.length === 0) return 0;

  let totalFee = 0;
  let intervalStart = passes[0].date;
  let intervalMaxFee = passes[0].fee;

  for (let i = 1; i < passes.length; i++) {
    const { date, fee } = passes[i];
    const minutesSinceIntervalStart =
      (date.getTime() - intervalStart.getTime()) / 60_000;

    if (minutesSinceIntervalStart < CHARGE_INTERVAL_MINUTES) {
      intervalMaxFee = Math.max(intervalMaxFee, fee);
    } else {
      totalFee += intervalMaxFee;
      intervalStart = date;
      intervalMaxFee = fee;
    }
  }

  totalFee += intervalMaxFee;
  return Math.min(totalFee, MAX_DAILY_FEE);
}

/**
 * Calculate the total toll fee across all provided passes.
 *
 * Rules:
 * - A vehicle is only charged once per 60-minute window; the highest fee in
 *   that window applies.
 * - The maximum charge per day is 60 SEK.
 * - Passes spanning multiple days are handled correctly — the daily cap applies
 *   per calendar day.
 */
export function getDailyTollFee(vehicle: Vehicle, dates: Date[]): number {
  if (dates.length === 0 || isTollFreeVehicle(vehicle)) return 0;

  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());

  const byDay = new Map<string, Date[]>();
  for (const date of sorted) {
    const key = dateKey(date);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(date);
  }

  let totalFee = 0;
  for (const dayDates of byDay.values()) {
    totalFee += calculateFeeForSingleDay(vehicle, dayDates);
  }
  return totalFee;
}
