import { useEffect } from "react";
import { toast } from "sonner";
import { billAlerts } from "@/lib/reminders";
import { monthKey } from "@/lib/format";
import { useFiGo } from "@/lib/store";

export function BillReminderWatcher() {
  const bills = useFiGo((s) => s.bills);
  useEffect(() => {
    if (bills.length === 0) return;
    const key = monthKey();
    const marker = `figo-reminders-${key}`;
    if (sessionStorage.getItem(marker)) return;
    const due = billAlerts(bills);
    if (due.length) {
      toast.warning(`${due.length} hoá đơn đang đến hạn hoặc quá hạn.`, {
        description: "Mở mục Hoá đơn để kiểm tra.",
      });
    }
    sessionStorage.setItem(marker, "shown");
  }, [bills]);
  return null;
}
