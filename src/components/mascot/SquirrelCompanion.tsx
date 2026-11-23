import { useEffect, useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, RefreshCw, X } from "lucide-react";
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
    message:
      "Ghi mỗi khoản chi ngay lúc thanh toán chỉ mất 5 giây nhưng giúp cuối tháng không bị bất ngờ!",
  },
  {
    mood: "happy",
    message: "Quy tắc 50/30/20: 50% nhu cầu thiết yếu, 30% mong muốn, 20% tiết kiệm cho tương lai.",
  },
  {
    mood: "thinking",
    message:
      "Bạn có thể hỏi Trợ lý AI: “Tháng này tôi tiêu nhiều nhất vào đâu?” để xem phân tích nhanh.",
  },
  {
    mood: "encourage",
    message: "Đặt hạn mức cho các nhóm hay chi lặt vặt như Cà phê hay Mua sắm để giữ ví luôn khoẻ.",
  },
];

export function SquirrelCompanion() {
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
  const collapsed = useUI((s) => s.mascotCollapsed);
  const setCollapsed = useUI((s) => s.setMascotCollapsed);

  const [tipIndex, setTipIndex] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [petBounce, setPetBounce] = useState(0);

  // Subtle pointer eye-tracking on desktop
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

  // Auto-expire temporary reaction events
  useEffect(() => {
    if (!mascotEvent) return;
    const ms = Math.max(800, mascotEvent.expiresAt - Date.now());
    const t = window.setTimeout(() => clearMascotEvent(), ms);
    return () => window.clearTimeout(t);
  }, [mascotEvent, clearMascotEvent]);

  // Open mobile bubble briefly when a reactive event arrives
  useEffect(() => {
    if (mascotEvent) setMobileOpen(true);
  }, [mascotEvent]);

  // Reset tip cycle when changing page
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
          title: "Cảnh báo ngân sách",
          message: `Có hạn mức đã vượt ${Math.round(overB.pct)}%. Tạm phanh lại vài ngày để cuối tháng vẫn dư dả nhé!`,
          action: { label: "Xem sổ chi", to: "/transactions" },
        };
      }
      if (warnB) {
        return {
          mood: "warn",
          title: "Sắp chạm ngưỡng",
          message: `Hạn mức đã dùng ${Math.round(warnB.pct)}%, còn ${formatVnd(warnB.remaining)}. Mình cùng giữ nhịp nhé!`,
        };
      }
      if (activeB.length > 0) {
        return {
          mood: "happy",
          title: "Kiểm soát rất tốt",
          message: `Tất cả ${activeB.length} hạn mức tháng này đều đang nằm trong vùng an toàn!`,
        };
      }
      return {
        mood: "encourage",
        title: "Đặt hạn mức đầu tiên",
        message: "Đặt trần chi tiêu cho ăn uống hoặc mua sắm giúp bạn tiết kiệm dễ hơn nhiều đấy.",
      };
    }

    if (pathname === "/bills") {
      const overdue = alerts.filter((a) => a.overdue);
      if (overdue.length > 0) {
        return {
          mood: "warn",
          title: "Hoá đơn quá hạn",
          message: `${overdue[0]!.bill.name} (${formatVnd(overdue[0]!.bill.amount)}) đã quá hạn. Nhớ thanh toán và đánh dấu nhé!`,
        };
      }
      if (alerts.length > 0) {
        const first = alerts[0]!;
        return {
          mood: "warn",
          title: "Hoá đơn sắp đến hạn",
          message: `${first.bill.name} ${first.daysLeft === 0 ? "đến hạn hôm nay" : `còn ${first.daysLeft} ngày`} · ${formatVnd(first.bill.amount)}.`,
        };
      }
      return {
        mood: "happy",
        title: "Lịch hoá đơn gọn gàng",
        message: bills.length
          ? "Không có hoá đơn nào gấp trong 3 ngày tới. Tuyệt vời!"
          : "Chạm vào một ngày trên lịch để thêm hoá đơn định kỳ.",
      };
    }

    if (pathname === "/goals") {
      if (activeGoals.length > 0) {
        const top = [...activeGoals].sort((a, b) => goalStats(b).pct - goalStats(a).pct)[0]!;
        const st = goalStats(top);
        return {
          mood: st.pct >= 70 ? "celebrate" : "encourage",
          title: "Tiến độ mục tiêu",
          message: `"${top.name}" đã đạt ${st.pct}%. Chỉ còn ${formatVnd(st.remaining)} nữa là chạm đích!`,
        };
      }
      return {
        mood: "encourage",
        title: "Ước mơ thành hiện thực",
        message:
          "Tạo một quỹ mục tiêu với ảnh truyền cảm hứng, mỗi tuần góp một ít là sẽ tới đích!",
      };
    }

    if (pathname === "/assistant") {
      return {
        mood: "thinking",
        title: "Trợ lý sẵn sàng",
        message:
          "Hãy hỏi mình về xu hướng chi tiêu, ngân sách còn lại hoặc cách tối ưu tiền tiết kiệm tháng này!",
      };
    }

    if (pathname === "/transactions") {
      return {
        mood: txs.length > 0 ? "happy" : "encourage",
        title: "Sổ thu chi",
        message:
          txs.length > 0
            ? `Tháng này bạn đã ghi ${totals.count} giao dịch. Chi tiết rõ ràng là chìa khoá quản lý ví!`
            : "Chưa có giao dịch nào. Bấm “Ghi thu chi” để mình cùng bắt đầu sổ mới nhé!",
        action: { label: "Ghi thu chi", onClick: () => openTxSheet() },
      };
    }

    if (pathname === "/settings") {
      return {
        mood: "idle",
        title: "Tuỳ chỉnh FiGo",
        message:
          accounts.length === 0
            ? "Thêm nguồn tiền đầu tiên (tiền mặt, ngân hàng hoặc ví điện tử) để bắt đầu ghi chép."
            : "Bạn có thể thêm nhiều ví/ngân hàng và bật nhắc hoá đơn qua email tại đây.",
      };
    }

    // Home dashboard contextual priority
    if (accounts.length === 0) {
      return {
        mood: "encourage",
        title: `Chào ${userName || "bạn"}!`,
        message:
          "Bước đầu tiên: thêm ví tiền mặt hoặc tài khoản ngân hàng để Sóc FiGo đồng hành cùng bạn.",
        action: { label: "Thêm nguồn tiền", to: "/settings" },
      };
    }
    if (overB) {
      return {
        mood: "warn",
        title: "Nhắc nhẹ từ Sóc FiGo",
        message: `Hạn mức tháng đã vượt ${Math.round(overB.pct)}%. Xem lại các khoản chi để cân đối nhé!`,
        action: { label: "Xem ngân sách", to: "/budgets" },
      };
    }
    if (alerts.length > 0) {
      const a = alerts[0]!;
      return {
        mood: "warn",
        title: "Hoá đơn cần chú ý",
        message: `${a.bill.name} (${formatVnd(a.bill.amount)}) ${a.overdue ? "đang quá hạn" : a.daysLeft === 0 ? "đến hạn hôm nay" : `còn ${a.daysLeft} ngày`}.`,
        action: { label: "Mở hoá đơn", to: "/bills" },
      };
    }
    if (streak >= 2 && loggedToday) {
      return {
        mood: "celebrate",
        title: `Chuỗi ${streak} ngày liên tiếp!`,
        message: `Tuyệt vời ${userName || "bạn"}! Bạn đã giữ thói quen ghi chép ${streak} ngày liền rồi.`,
        action: { label: "Ghi thêm", onClick: () => openTxSheet() },
      };
    }
    if (!loggedToday) {
      return {
        mood: "encourage",
        title: `Chào ${userName || "bạn"}`,
        message:
          txs.length === 0
            ? "Hãy ghi khoản thu hoặc chi đầu tiên hôm nay để khởi động chuỗi ngày ghi chép!"
            : "Hôm nay bạn đã chi hay thu khoản nào chưa? Ghi lại cùng mình nhé!",
        action: { label: "Ghi ngay", onClick: () => openTxSheet() },
      };
    }
    return {
      mood: "happy",
      title: "Hôm nay đã ghi sổ",
      message: `Thu ${formatVnd(totals.income)} · Chi ${formatVnd(totals.expense)} trong tháng này. Tiếp tục giữ nhịp nhé!`,
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

  const hasWarning = activeDisplay.mood === "warn";

  const handleMascotTap = () => {
    setPetBounce((n) => n + 1);
    if (collapsed) {
      setCollapsed(false);
      return;
    }
    setTipIndex((i) => (i + 1) % (GENERAL_TIPS.length + 1));
  };

  return (
    <>
      {/* Desktop persistent floating companion (Duolingo-style corner anchor) */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-40 hidden items-end gap-3 lg:flex">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key={`${activeDisplay.title}-${activeDisplay.message}`}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto relative w-72 rounded-2xl border border-border/80 bg-card/95 p-3.5 shadow-[0_14px_38px_-14px_rgba(15,23,42,0.28)] backdrop-blur-xl"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-xs font-bold tracking-tight",
                    hasWarning ? "text-destructive" : "text-primary",
                  )}
                >
                  {activeDisplay.title}
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      clearMascotEvent();
                      setTipIndex((i) => (i + 1) % (GENERAL_TIPS.length + 1));
                    }}
                    className="flex size-6 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Đổi lời nhắc"
                    title="Mẹo khác"
                  >
                    <RefreshCw className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollapsed(true)}
                    className="flex size-6 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Thu gọn Sóc FiGo"
                    title="Thu gọn"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-foreground tabular-nums">
                {activeDisplay.message}
              </p>
              {activeDisplay.subtext && (
                <p className="mt-1 text-xs text-muted-foreground">{activeDisplay.subtext}</p>
              )}
              {"action" in activeDisplay && activeDisplay.action && (
                <div className="mt-2.5">
                  {activeDisplay.action.to ? (
                    <Link
                      to={activeDisplay.action.to}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      {activeDisplay.action.label} <ArrowRight className="size-3" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={activeDisplay.action.onClick}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      {activeDisplay.action.label} <ArrowRight className="size-3" />
                    </button>
                  )}
                </div>
              )}
              {/* Speech bubble tail pointing right toward squirrel */}
              <span
                aria-hidden
                className="absolute -right-1.5 bottom-5 size-3 rotate-45 border-r border-t border-border/80 bg-card/95"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          key={petBounce}
          type="button"
          onClick={handleMascotTap}
          whileHover={{ y: -3, scale: 1.04 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
          aria-label={collapsed ? "Mở Sóc FiGo" : "Chạm Sóc FiGo để xem mẹo"}
          title={collapsed ? "Mở Sóc FiGo" : "Chạm để xem mẹo tài chính"}
          className={cn(
            "pointer-events-auto relative flex size-16 items-center justify-center rounded-full border bg-card/95 shadow-[0_12px_30px_-10px_rgba(8,160,107,0.4)] backdrop-blur-xl transition-colors",
            hasWarning
              ? "border-destructive/50 ring-2 ring-destructive/20"
              : "border-primary/30 hover:border-primary/60",
          )}
        >
          <SquirrelMascot mood={activeDisplay.mood} size={56} lookX={look.x} lookY={look.y} />
        </motion.button>
      </div>

      {/* Mobile compact floating squirrel perched neatly above bottom nav */}
      <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] right-3 z-30 flex flex-col items-end gap-2 lg:hidden">
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto w-[min(17.5rem,calc(100vw-1.5rem))] rounded-2xl border border-border/80 bg-card/95 p-3 shadow-xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-xs font-bold",
                    hasWarning ? "text-destructive" : "text-primary",
                  )}
                >
                  {activeDisplay.title}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                  aria-label="Đóng lời nhắc"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-foreground tabular-nums">
                {activeDisplay.message}
              </p>
              {"action" in activeDisplay && activeDisplay.action && (
                <div className="mt-2">
                  {activeDisplay.action.to ? (
                    <Link
                      to={activeDisplay.action.to}
                      onClick={() => setMobileOpen(false)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                    >
                      {activeDisplay.action.label} <ArrowRight className="size-3" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        activeDisplay.action?.onClick?.();
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                    >
                      {activeDisplay.action.label} <ArrowRight className="size-3" />
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          whileTap={{ scale: 0.9 }}
          aria-label="Sóc FiGo trợ giúp"
          className={cn(
            "pointer-events-auto flex size-12 items-center justify-center rounded-full border bg-card/95 shadow-lg backdrop-blur-xl",
            hasWarning ? "border-destructive/50 ring-2 ring-destructive/20" : "border-primary/30",
          )}
        >
          <SquirrelMascot mood={activeDisplay.mood} size={42} />
        </motion.button>
      </div>
    </>
  );
}
