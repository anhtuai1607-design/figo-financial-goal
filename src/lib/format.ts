import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { vi } from "date-fns/locale";

/** VND is integer-only; every money op rounds to avoid float drift. */
export const toVnd = (n: number) => Math.round(Number.isFinite(n) ? n : 0);
export const sum = (arr: number[]) => arr.reduce((a, b) => a + toVnd(b), 0);

const vndFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

export function formatVnd(amount: number, opts?: { sign?: boolean; compact?: boolean }) {
  const n = toVnd(amount);
  if (opts?.compact && Math.abs(n) >= 1_000_000) {
    const m = n / 1_000_000;
    const s = m >= 100 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, "");
    return `${opts.sign && n > 0 ? "+" : ""}${s.replace(".", ",")} tr`;
  }
  const s = vndFormatter.format(Math.abs(n)) + " đ";
  if (n < 0) return "-" + s;
  return (opts?.sign && n > 0 ? "+" : "") + s;
}

export function formatDate(iso: string, pattern = "dd/MM/yyyy") {
  return format(parseISO(iso), pattern, { locale: vi });
}

export function formatDateTime(iso: string) {
  return format(parseISO(iso), "dd/MM/yyyy HH:mm", { locale: vi });
}

export function relativeDay(iso: string) {
  const d = differenceInCalendarDays(parseISO(iso), new Date());
  if (d === 0) return "Hôm nay";
  if (d === -1) return "Hôm qua";
  if (d === 1) return "Ngày mai";
  return formatDate(iso, "EEEE, dd/MM");
}

export function monthKey(date: Date | string = new Date()) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "yyyy-MM");
}

export function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return `Tháng ${Number(m)}/${y}`;
}

/** Parse "1.500.000" / "1500000" / "1,5tr" into integer VND */
export function parseVndInput(raw: string): number {
  const s = raw.trim().toLowerCase().replace(/\s/g, "");
  if (!s) return 0;
  const tr = s.match(/^([\d.,]+)(tr|m)$/);
  if (tr?.[1]) return toVnd(parseFloat(tr[1].replace(/\./g, "").replace(",", ".")) * 1_000_000);
  const k = s.match(/^([\d.,]+)k$/);
  if (k?.[1]) return toVnd(parseFloat(k[1].replace(/\./g, "").replace(",", ".")) * 1_000);
  return toVnd(parseInt(s.replace(/[^\d]/g, ""), 10) || 0);
}

export function formatVndInput(n: number) {
  return n ? vndFormatter.format(n) : "";
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
