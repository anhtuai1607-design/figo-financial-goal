import { useEffect, useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, RefreshCw, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SquirrelMascot } from "./SquirrelMascot";
import {
  activeBudgets,
  budgetProgress,
  computeLoggingStreak,
  goalStats,
  monthTotals,
} from "@/lib/finance";
import { formatVnd, monthKey } from "@/lib/format";
import { billAlerts } from "@/lib/reminders";
import { useFiGo } from "@/lib/store";
import { type MascotMood, useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

interface CompanionAdvice {
  mood: MascotMood;
  title: string;
  message: string;
  action?: {
    label: string;
    to?: "/" | "/transactions" | "/budgets" | "/bills" | "/goals" | "/assistant" | "/settings";
    onClick?: () => void;
  };
}

const GENERAL_TIPS: Omit<CompanionAdvice, "title">[] = [
  {
    mood: "encourage",
    message: "Ghi ngay khi vừa chi tiền giúp cuối tháng không bị 'bay màu' không rõ lý do.",
  },
  {
    mood: "happy",
    message: "Quy tắc 50/30/20: 50% nhu cầu thiết yếu, 30% linh hoạt, 20% tiết kiệm cho bản thân.",
  },
  {
    mood: "thinking",
    message: "Vào Trợ lý AI hỏi “Tháng này tôi tiêu gì nhiều nhất?” để nhận phân tích tức thì.",
  },
  {
    mood: "encourage",
    message: "Đặt ngân sách cho ăn uống & cà phê giúp bạn giữ nhịp chi tiêu cực nhẹ nhàng.",
  },
];

function useSquirrelState() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const userName = useFiGo((s) => s.userName);
  const accounts = useFiGo((s) => s.accounts);
  const txs = useFiGo((s) => s.transactions);
  const budgets = useFiGo((s) => s.budgets);
  const bills = useFiGo((s) => s.bills);
  const goals = useFiGo((s) => s.goals);

  const openTxSheet = useUI((s) => s.openTxSheet);
  const mascotEvent = useUI((s) => s.mascotEvent);
  const clearMascotEvent = useUI((s) => s.clearMascotEvent);

  const [tipIndex, setTipIndex] = useState(0);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [petBounce, setPetBounce] = useState(0);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      const ny = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
      setLook({ x: nx, y: ny });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    if (!mascotEvent) return;
    const ms = Math.max(800, mascotEvent.expiresAt - Date.now());
    const t = window.setTimeout(() => clearMascotEvent(), ms);
    return () => window.clearTimeout(t);
  }, [mascotEvent, clearMascotEvent]);

  useEffect(() => {
    setTipIndex(0);
  }, [pathname]);

  const contextual = useMemo((): CompanionAdvice => {
    const key = monthKey();
    const totals = monthTotals(txs, key);
    const alerts = billAlerts(bills);
    const activeB = activeBudgets(budgets, key).map((b) => budgetProgress(b, txs, key));
    const overB = activeB.find((b) => b.status === "over");
    const warnB = activeB.find((b) => b.status === "warning");
    const { streak, loggedToday } = computeLoggingStreak(txs);
    const activeGoals = goals.filter((g) => !goalStats(g).done);

    if (tipIndex > 0) {
      const tip = GENERAL_TIPS[(tipIndex - 1) % GENERAL_TIPS.length]!;
      return { title: "Mẹo từ Sóc FiGo", ...tip };
    }

    if (pathname === "/budgets") {
      if (overB) {
        return {
          mood: "warn",
          title: "Vượt hạn mức",
          message: `Có hạn mức đã chạm ${Math.round(overB.pct)}%. Cần rà soát lại các khoản chi trong tuần.`,
          action: { label: "Mở sổ thu chi", to: "/transactions" },
        };
      }
      if (warnB) {
        return {
          mood: "warn",
          title: "Sắp chạm ngưỡng",
          message: `Hạn mức đã dùng ${Math.round(warnB.pct)}%, còn lại ${formatVnd(warnB.remaining)}.`,
        };
      }
      if (activeB.length > 0) {
        return {
          mood: "happy",
          title: "Ngân sách ổn định",
          message: `Tất cả ${activeB.length} hạn mức tháng này đang nằm trong vùng an toàn.`,
        };
      }
      return {
        mood: "encourage",
        title: "Đặt hạn mức",
        message: "Đặt trần chi tiêu cho ăn uống, mua sắm để cuối tháng luôn dư dả.",
      };
    }

    if (pathname === "/bills") {
      const overdue = alerts.filter((a) => a.overdue);
      if (overdue.length > 0) {
        return {
          mood: "warn",
          title: "Hóa đơn quá hạn",
          message: `${overdue[0]!.bill.name} (${formatVnd(overdue[0]!.bill.amount)}) đã quá hạn thanh toán.`,
        };
      }
      if (alerts.length > 0) {
        const first = alerts[0]!;
        return {
          mood: "warn",
          title: "Sắp đến hạn",
          message: `${first.bill.name} ${first.daysLeft === 0 ? "đến hạn hôm nay" : `còn ${first.daysLeft} ngày`} · ${formatVnd(first.bill.amount)}.`,
        };
      }
      return {
        mood: "happy",
        title: "Lịch hóa đơn êm",
        message: bills.length
          ? "Không có hóa đơn gấp trong 3 ngày tới."
          : "Chọn một ngày trên lịch để thêm hóa đơn định kỳ.",
      };
    }

    if (pathname === "/goals") {
      if (activeGoals.length > 0) {
        const top = [...activeGoals].sort((a, b) => goalStats(b).pct - goalStats(a).pct)[0]!;
        const st = goalStats(top);
        return {
          mood: st.pct >= 70 ? "celebrate" : "encourage",
          title: "Tiến độ mục tiêu",
          message: `${top.name} đã đạt ${st.pct}%, còn thiếu ${formatVnd(st.remaining)}.`,
        };
      }
      return {
        mood: "encourage",
        title: "Quỹ mục tiêu",
        message: "Tạo mục tiêu với hạn rõ ràng để Sóc tính giúp số tiền cần góp mỗi tháng.",
      };
    }

    if (pathname === "/assistant") {
      return {
        mood: "thinking",
        title: "Sẵn sàng phân tích",
        message: "Hỏi bất cứ điều gì về thu chi, ngân sách hay mẹo tiết kiệm tháng này nhé.",
      };
    }

    if (pathname === "/transactions") {
      return {
        mood: txs.length > 0 ? "happy" : "encourage",
        title: "Sổ thu chi",
        message:
          txs.length > 0
            ? `Tháng này bạn đã ghi ${totals.count} giao dịch rồi đó.`
            : "Chưa có giao dịch. Nhấn “Ghi giao dịch” để thêm khoản đầu tiên.",
        action: { label: "Ghi giao dịch", onClick: () => openTxSheet() },
      };
    }

    if (pathname === "/settings") {
      return {
        mood: "idle",
        title: "Cài đặt ví",
        message:
          accounts.length === 0
            ? "Thêm nguồn tiền đầu tiên (ví tiền mặt, ngân hàng hoặc MoMo) để bắt đầu."
            : "Quản lý tài khoản tiền và cài đặt nhắc lịch qua email tại đây.",
      };
    }

    if (accounts.length === 0) {
      return {
        mood: "encourage",
        title: `Chào ${userName || "bạn"}`,
        message: "Thêm ví tiền mặt hoặc ngân hàng đầu tiên để FiGo theo dõi số dư giúp bạn.",
        action: { label: "Thêm nguồn tiền", to: "/settings" },
      };
    }
    if (overB) {
      return {
        mood: "warn",
        title: "Lưu ý ngân sách",
        message: `Hạn mức tháng đã vượt ${Math.round(overB.pct)}%. Kiểm tra chi tiết ngay nhé.`,
        action: { label: "Xem ngân sách", to: "/budgets" },
      };
    }
    if (alerts.length > 0) {
      const a = alerts[0]!;
      return {
        mood: "warn",
        title: "Hóa đơn sắp tới",
        message: `${a.bill.name} (${formatVnd(a.bill.amount)}) ${a.overdue ? "đang quá hạn" : a.daysLeft === 0 ? "đến hạn hôm nay" : `còn ${a.daysLeft} ngày`}.`,
        action: { label: "Xem hóa đơn", to: "/bills" },
      };
    }
    if (streak >= 2 && loggedToday) {
      return {
        mood: "celebrate",
        title: `Chuỗi ${streak} ngày`,
        message: `Tuyệt vời! Bạn đã ghi sổ đều đặn ${streak} ngày liên tiếp.`,
        action: { label: "Ghi thêm", onClick: () => openTxSheet() },
      };
    }
    if (!loggedToday) {
      return {
        mood: "encourage",
        title: `Chào ${userName || "bạn"}`,
        message:
          txs.length === 0
            ? "Ghi khoản thu hoặc chi đầu tiên để khởi động hành trình quản lý tiền."
            : "Hôm nay chưa có giao dịch nào. Vừa mua gì nhớ ghi lại nha!",
        action: { label: "Ghi ngay", onClick: () => openTxSheet() },
      };
    }
    return {
      mood: "happy",
      title: "Sổ hôm nay đã gọn",
      message: `Thu ${formatVnd(totals.income)} · Chi ${formatVnd(totals.expense)} trong tháng này.`,
      action: { label: "Hỏi Trợ lý AI", to: "/assistant" },
    };
  }, [pathname, userName, accounts.length, txs, budgets, bills, goals, tipIndex, openTxSheet]);

  const activeDisplay = mascotEvent
    ? {
        mood: mascotEvent.mood,
        title: "Sóc FiGo",
        message: mascotEvent.message,
        subtext: mascotEvent.subtext,
      }
    : { ...contextual, subtext: undefined };

  const cycleTip = () => {
    clearMascotEvent();
    setPetBounce((n) => n + 1);
    setTipIndex((i) => (i + 1) % (GENERAL_TIPS.length + 1));
  };

  return {
    activeDisplay,
    hasWarning: activeDisplay.mood === "warn",
    hasEvent: Boolean(mascotEvent),
    look,
    petBounce,
    cycleTip,
    clearMascotEvent,
  };
}

/** Desktop: Sóc FiGo gắn cố định trong thanh bên trái — luôn hiện hữu, không bao giờ che nút thao tác. */
export function SidebarSquirrelWidget() {
  const { activeDisplay, hasWarning, hasEvent, look, petBounce, cycleTip } = useSquirrelState();

  return (
    <div
      className={cn(
        "mt-3 rounded-2xl border p-3 transition-colors duration-200",
        hasWarning
          ? "border-amber-500/40 bg-amber-50/80 dark:bg-amber-950/25"
          : hasEvent
            ? "border-primary/45 bg-accent/80"
            : "border-border bg-muted/45",
      )}
    >
      <div className="flex items-start gap-2.5">
        <motion.button
          key={petBounce}
          type="button"
          onClick={cycleTip}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.92 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          title="Chạm Sóc để đổi gợi ý"
          aria-label="Chạm Sóc FiGo để đổi gợi ý"
          className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-card shadow-xs transition-colors hover:border-primary/40"
        >
          <SquirrelMascot mood={activeDisplay.mood} size={42} lookX={look.x} lookY={look.y} />
        </motion.button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span
              className={cn(
                "truncate text-[11px] font-bold uppercase tracking-[0.05em]",
                hasWarning ? "text-amber-700 dark:text-amber-400" : "text-primary",
              )}
            >
              {activeDisplay.title}
            </span>
            <button
              type="button"
              onClick={cycleTip}
              className="tactile flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-card hover:text-foreground"
              aria-label="Đổi lời nhắc"
              title="Đổi gợi ý"
            >
              <RefreshCw className="size-3" strokeWidth={1.75} />
            </button>
          </div>
          <p className="mt-0.5 line-clamp-3 text-xs leading-relaxed text-foreground/90 tabular-nums">
            {activeDisplay.message}
          </p>
        </div>
      </div>
      {"action" in activeDisplay && activeDisplay.action && (
        <div className="mt-2 border-t border-border/60 pt-2">
          {activeDisplay.action.to ? (
            <Link
              to={activeDisplay.action.to}
              className="tactile inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              {activeDisplay.action.label} <ArrowRight className="size-3" strokeWidth={1.75} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={activeDisplay.action.onClick}
              className="tactile inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              {activeDisplay.action.label} <ArrowRight className="size-3" strokeWidth={1.75} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Mobile: Nút Sóc gọn ở thanh đầu trang (Popover mở phía trên, không đè nút dưới màn hình). */
export function MobileSquirrelTrigger() {
  const { activeDisplay, hasWarning, hasEvent, petBounce, cycleTip } = useSquirrelState();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Sóc FiGo trợ giúp"
          className={cn(
            "tactile relative flex size-9 items-center justify-center rounded-xl border bg-card transition-colors",
            hasWarning
              ? "border-amber-500/45 bg-amber-50/70 dark:bg-amber-950/30"
              : "border-border hover:border-primary/40",
          )}
        >
          <SquirrelMascot mood={activeDisplay.mood} size={28} />
          {(hasWarning || hasEvent) && (
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-background",
                hasWarning ? "bg-amber-500" : "bg-primary",
              )}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(20rem,calc(100vw-2rem))] rounded-2xl border-border p-3.5 shadow-lg"
      >
        <div className="flex items-start gap-3">
          <motion.button
            key={petBounce}
            type="button"
            onClick={cycleTip}
            whileTap={{ scale: 0.92 }}
            aria-label="Chạm Sóc để đổi gợi ý"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/50"
          >
            <SquirrelMascot mood={activeDisplay.mood} size={38} />
          </motion.button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "text-[11px] font-bold uppercase tracking-[0.06em]",
                  hasWarning ? "text-amber-700 dark:text-amber-400" : "text-primary",
                )}
              >
                {activeDisplay.title}
              </span>
              <button
                type="button"
                onClick={cycleTip}
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                aria-label="Đổi lời nhắc"
              >
                <RefreshCw className="size-3.5" strokeWidth={1.6} />
              </button>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-foreground tabular-nums">
              {activeDisplay.message}
            </p>
            {"action" in activeDisplay && activeDisplay.action && (
              <div className="mt-2.5 border-t border-border/60 pt-2">
                {activeDisplay.action.to ? (
                  <Link
                    to={activeDisplay.action.to}
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                  >
                    {activeDisplay.action.label}{" "}
                    <ArrowRight className="size-3" strokeWidth={1.75} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      activeDisplay.action?.onClick?.();
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                  >
                    {activeDisplay.action.label}{" "}
                    <ArrowRight className="size-3" strokeWidth={1.75} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Mobile: Thông báo phản hồi ngắn từ Sóc ở phía trên (tự tắt, không bao giờ che nút ở dưới). */
export function SquirrelCompanion() {
  const mascotEvent = useUI((s) => s.mascotEvent);
  const clearMascotEvent = useUI((s) => s.clearMascotEvent);

  useEffect(() => {
    if (!mascotEvent) return;
    const ms = Math.max(800, mascotEvent.expiresAt - Date.now());
    const t = window.setTimeout(() => clearMascotEvent(), ms);
    return () => window.clearTimeout(t);
  }, [mascotEvent, clearMascotEvent]);

  return (
    <div className="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4.1rem)] z-30 flex justify-center lg:hidden">
      <AnimatePresence>
        {mascotEvent && (
          <motion.div
            key={mascotEvent.id}
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-2xl border bg-card/95 px-3 py-2 shadow-lg backdrop-blur-md",
              mascotEvent.mood === "warn" ? "border-amber-500/45" : "border-primary/30",
            )}
          >
            <SquirrelMascot mood={mascotEvent.mood} size={32} className="shrink-0" />
            <p className="min-w-0 flex-1 text-xs font-medium leading-snug text-foreground tabular-nums">
              {mascotEvent.message}
            </p>
            <button
              type="button"
              onClick={clearMascotEvent}
              aria-label="Đóng"
              className="flex size-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <X className="size-3.5" strokeWidth={1.75} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
