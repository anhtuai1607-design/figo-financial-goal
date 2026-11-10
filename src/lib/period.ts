import { addDays, addMonths, addWeeks, addYears, eachDayOfInterval, endOfDay, endOfMonth, endOfWeek, endOfYear, format, getDay, getDaysInMonth, isWithinInterval, parseISO, startOfDay, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { vi } from "date-fns/locale";
import { getCategory } from "./categories";
import type { Bill, Transaction } from "./types";

export type PeriodMode = "day" | "week" | "month" | "year";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const WD = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function shiftPeriod(mode: PeriodMode, a: Date, n: number) {
  return mode === "day" ? addDays(a, n) : mode === "week" ? addWeeks(a, n) : mode === "month" ? addMonths(a, n) : addYears(a, n);
}
export function boundsOf(mode: PeriodMode, a: Date) {
  if (mode === "day") return { start: startOfDay(a), end: endOfDay(a) };
  if (mode === "week") return { start: startOfWeek(a, { weekStartsOn: 1 }), end: endOfWeek(a, { weekStartsOn: 1 }) };
  if (mode === "month") return { start: startOfMonth(a), end: endOfMonth(a) };
  return { start: startOfYear(a), end: endOfYear(a) };
}
export function periodLabel(mode: PeriodMode, a: Date) {
  const { start, end } = boundsOf(mode, a);
  if (mode === "day") return cap(format(a, "EEEE, d/M/yyyy", { locale: vi }));
  if (mode === "week") return `${format(start, "d/M")} – ${format(end, "d/M/yyyy")}`;
  if (mode === "month") return `Tháng ${format(a, "M/yyyy")}`;
  return `Năm ${format(a, "yyyy")}`;
}
export function isCurrentPeriod(mode: PeriodMode, a: Date) {
  const x = boundsOf(mode, a), y = boundsOf(mode, new Date());
  return x.start.getTime() === y.start.getTime();
}
export function isFuturePeriod(mode: PeriodMode, a: Date) {
  return boundsOf(mode, a).start.getTime() > new Date().getTime();
}

export function sumPeriod(txs: Transaction[], start: Date, end: Date) {
  let income = 0, expense = 0;
  for (const t of txs) {
    if (!isWithinInterval(parseISO(t.date), { start, end })) continue;
    if (t.type === "income") income += t.amount;
    else if (t.type === "expense") expense += t.amount;
  }
  return { income, expense };
}

/** Các khoản hoá đơn định kỳ sẽ đến hạn (sau hôm nay) trong khoảng [start, end]. */
function plannedIn(bills: Bill[], start: Date, end: Date, now: Date) {
  let sum = 0;
  for (let m = startOfMonth(start); m <= end; m = addMonths(m, 1)) {
    const dim = getDaysInMonth(m);
    const mk = format(m, "yyyy-MM");
    for (const b of bills) {
      if (b.startMonth && mk < b.startMonth) continue;
      const due = new Date(m.getFullYear(), m.getMonth(), Math.min(b.dueDay, dim), 12);
      if (due > now && due >= start && due <= end) sum += b.amount;
    }
  }
  return sum;
}

export function trendFor(txs: Transaction[], bills: Bill[], mode: PeriodMode, a: Date) {
  const { start, end } = boundsOf(mode, a);
  const now = new Date();
  let buckets: { label: string; start: Date; end: Date }[];
  if (mode === "day") buckets = Array.from({ length: 24 }, (_, h) => ({ label: `${h}h`, start: new Date(start.getFullYear(), start.getMonth(), start.getDate(), h), end: new Date(start.getFullYear(), start.getMonth(), start.getDate(), h, 59, 59, 999) }));
  else if (mode === "week") buckets = eachDayOfInterval({ start, end }).map((d) => ({ label: WD[getDay(d)] ?? "", start: startOfDay(d), end: endOfDay(d) }));
  else if (mode === "month") buckets = eachDayOfInterval({ start, end }).map((d) => ({ label: String(d.getDate()), start: startOfDay(d), end: endOfDay(d) }));
  else buckets = Array.from({ length: 12 }, (_, i) => ({ label: `T${i + 1}`, start: new Date(start.getFullYear(), i, 1), end: endOfMonth(new Date(start.getFullYear(), i, 1)) }));
  return buckets.map((b) => ({ label: b.label, ...sumPeriod(txs, b.start, b.end), planned: mode === "day" ? 0 : plannedIn(bills, b.start, b.end, now) }));
}

export function breakdownFor(txs: Transaction[], start: Date, end: Date, type: "expense" | "income") {
  const map = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== type || !isWithinInterval(parseISO(t.date), { start, end })) continue;
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  }
  const total = [...map.values()].reduce((x, y) => x + y, 0);
  const rows = [...map.entries()].map(([id, amount]) => ({ id, name: getCategory(id).name, amount })).sort((x, y) => y.amount - x.amount);
  const top = rows.slice(0, 5);
  const rest = rows.slice(5).reduce((x, r) => x + r.amount, 0);
  if (rest > 0) top.push({ id: "_other", name: "Khác", amount: rest });
  return { total, rows: top.map((r) => ({ ...r, pct: total ? Math.round((r.amount / total) * 1000) / 10 : 0 })) };
}
