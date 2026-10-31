import type { Frequency } from "@/lib/generated/prisma/enums";

/** ISO weekday of a YYYY-MM-DD calendar date (1 = Monday … 7 = Sunday). */
export function isoWeekday(day: string): number {
  const d = new Date(`${day}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

export function addDays(day: string, n: number): string {
  return new Date(new Date(`${day}T00:00:00Z`).getTime() + n * 86400_000).toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400_000);
}

/** Monday of the ISO week containing `day`. */
function weekStart(day: string) {
  return addDays(day, 1 - isoWeekday(day));
}

export type RecurringLine = {
  frequency: Frequency;
  weekdays: number[];
  contractStart: string;
  contractEnd: string | null;
};

/**
 * Service dates for a contract line within [from, to] (inclusive).
 * - DAILY: every working day (or the line's weekdays if set).
 * - WEEKLY: the line's weekdays, or the contract start weekday.
 * - BIWEEKLY: same weekdays, every second week counted from the contract start week.
 * - MONTHLY: the contract start day-of-month, clamped to the month's last day.
 * - ON_DEMAND: never generated.
 */
export function serviceDates(line: RecurringLine, from: string, to: string, workingWeekdays: number[]): string[] {
  if (line.frequency === "ON_DEMAND") return [];
  const start = line.contractStart > from ? line.contractStart : from;
  const end = line.contractEnd && line.contractEnd < to ? line.contractEnd : to;
  if (start > end) return [];
  const startDow = isoWeekday(line.contractStart);
  const days = line.weekdays.length ? line.weekdays : line.frequency === "DAILY" ? workingWeekdays : [startDow];
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const dow = isoWeekday(d);
    switch (line.frequency) {
      case "DAILY":
      case "WEEKLY":
        if (days.includes(dow)) out.push(d);
        break;
      case "BIWEEKLY": {
        const weeks = Math.floor(daysBetween(weekStart(line.contractStart), weekStart(d)) / 7);
        if (weeks % 2 === 0 && days.includes(dow)) out.push(d);
        break;
      }
      case "MONTHLY": {
        const target = Number(line.contractStart.slice(8, 10));
        const [y, m] = [Number(d.slice(0, 4)), Number(d.slice(5, 7))];
        const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
        if (Number(d.slice(8, 10)) === Math.min(target, lastDay)) out.push(d);
        break;
      }
    }
  }
  return out;
}
