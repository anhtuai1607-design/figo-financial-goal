import { addMonths, differenceInCalendarDays, format, getDaysInMonth, startOfDay } from "date-fns";
import type { Bill } from "./types";

/** Báo trước bao nhiêu ngày khi hoá đơn sắp đến hạn. */
export const REMIND_DAYS = 3;

export type BillAlert = { bill: Bill; due: Date; daysLeft: number; overdue: boolean; key: string };

/**
 * Các hoá đơn cần nhắc: quá hạn trong tháng này, hoặc còn tối đa REMIND_DAYS ngày.
 * Có xét cả kỳ của THÁNG SAU (ví dụ hôm nay 29/11, hoá đơn đến hạn 1/12 vẫn được nhắc) và chỉ nhắc các kỳ chưa thanh toán.
 */
export function billAlerts(bills: Bill[], now = new Date(), remindDays = REMIND_DAYS): BillAlert[] {
  const today = startOfDay(now);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const out: BillAlert[] = [];
  for (const bill of bills) {
    if (!bill.reminder) continue;
    let best: BillAlert | null = null;
    for (const off of [0, 1]) {
      const m = addMonths(thisMonth, off);
      const key = format(m, "yyyy-MM");
      if (bill.startMonth && key < bill.startMonth) continue;
      if (bill.paidMonths.includes(key)) continue;
      const due = new Date(m.getFullYear(), m.getMonth(), Math.min(bill.dueDay, getDaysInMonth(m)));
      const daysLeft = differenceInCalendarDays(due, today);
      if (daysLeft > remindDays) continue;
      const a: BillAlert = { bill, due, daysLeft, overdue: daysLeft < 0, key };
      if (!best || a.daysLeft < best.daysLeft) best = a;
    }
    if (best) out.push(best);
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}
