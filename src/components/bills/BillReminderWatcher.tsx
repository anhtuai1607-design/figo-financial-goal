import { useEffect } from "react";
import { toast } from "sonner";
import { billStatus } from "@/lib/finance";
import { monthKey } from "@/lib/format";
import { useFiGo } from "@/lib/store";

export function BillReminderWatcher() {
  const bills = useFiGo((s) => s.bills);
  useEffect(() => {
    const key = monthKey();
    const marker = `figo-reminders-${key}`;
    if (sessionStorage.getItem(marker)) return;
    const due = bills.filter((bill) => bill.reminder && (billStatus(bill, key).dueSoon || billStatus(bill, key).overdue));
    if (due.length) toast.warning(`${due.length} hoá đơn đang đến hạn hoặc quá hạn.`, { description: "Mở mục Hoá đơn để kiểm tra." });
    sessionStorage.setItem(marker, "shown");
  }, [bills]);
  return null;
}