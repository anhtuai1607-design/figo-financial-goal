import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  CalendarClock,
  Target,
  Plus,
  Settings,
  Moon,
  Sun,
  LogOut,
  Sparkles,
  Flame,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { computeLoggingStreak } from "@/lib/finance";
import { useFiGo } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { TransactionSheet } from "@/components/transactions/TransactionSheet";
import { SessionGuard, clearActivityMark } from "@/components/auth/SessionGuard";
import { BillReminderWatcher } from "@/components/bills/BillReminderWatcher";
import {
  MobileSquirrelTrigger,
  SidebarSquirrelWidget,
  SquirrelCompanion,
} from "@/components/mascot/SquirrelCompanion";
import { Button } from "@/components/ui/button";
import { AccountMenu, NotificationBell } from "./TopBar";

const NAV = [
  { to: "/", label: "Tổng quan", icon: LayoutDashboard },
  { to: "/transactions", label: "Sổ thu chi", icon: ArrowLeftRight },
  { to: "/budgets", label: "Ngân sách", icon: PiggyBank },
  { to: "/bills", label: "Hóa đơn", icon: CalendarClock },
  { to: "/goals", label: "Mục tiêu", icon: Target },
  { to: "/assistant", label: "Trợ lý AI", icon: Sparkles },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useFiGo((s) => s.hydrated);
  const txs = useFiGo((s) => s.transactions);
  const openTxSheet = useUI((s) => s.openTxSheet);
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const { streak, loggedToday } = computeLoggingStreak(txs);

  async function signOut() {
    await supabase.auth.signOut({ scope: "local" });
    clearActivityMark();
    useFiGo.setState({ hydrated: false });
    useFiGo.getState().resetAll();
    toast.success("Đã đăng xuất");
    navigate({ to: "/auth", replace: true });
  }

  if (pathname.startsWith("/auth"))
    return <div className="min-h-dvh overflow-x-clip">{children}</div>;

  return (
    <div className="min-h-dvh overflow-x-clip lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar p-5 lg:flex">
        <Link to="/" className="tactile group flex items-center gap-3 px-1.5">
          <Logo />
          <div>
            <div className="text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
              FiGo
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-primary">
              Tài chính & Mục tiêu
            </div>
          </div>
        </Link>

        {/* Real daily logging streak readout */}
        <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-border bg-muted/50 px-3 py-2.5">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-xl border",
              streak > 0 && loggedToday
                ? "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            <Flame className="size-4" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tabular-nums text-foreground">
              {streak > 0 ? `Chuỗi ${streak} ngày` : "Nhịp ghi sổ"}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {loggedToday ? "Hôm nay đã ghi nhận" : "Chưa ghi giao dịch hôm nay"}
            </p>
          </div>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {NAV.map((n) => {
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "tactile relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl bg-primary"
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <n.icon className="relative z-10 size-[17px] shrink-0" strokeWidth={1.75} />
                <span className="relative z-10">{n.label}</span>
              </Link>
            );
          })}
          <Link
            to="/settings"
            className={cn(
              "tactile relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
              pathname === "/settings"
                ? "text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground",
            )}
          >
            {pathname === "/settings" && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-0 rounded-xl bg-primary"
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
            <Settings className="relative z-10 size-[17px] shrink-0" strokeWidth={1.75} />
            <span className="relative z-10">Tài khoản & Cài đặt</span>
          </Link>
        </nav>

        {/* Always-visible, non-obstructive Squirrel companion inside sidebar */}
        {hydrated && <SidebarSquirrelWidget />}

        <Button
          onClick={() => openTxSheet()}
          className="mt-3 h-10 rounded-xl text-sm font-semibold"
        >
          <Plus className="size-4" strokeWidth={2} /> Ghi giao dịch
        </Button>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggle}
            className="h-9 rounded-xl text-xs text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? (
              <Sun className="size-3.5" strokeWidth={1.75} />
            ) : (
              <Moon className="size-3.5" strokeWidth={1.75} />
            )}
            {theme === "dark" ? "Sáng" : "Tối"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            className="h-9 rounded-xl text-xs text-muted-foreground hover:border-destructive/35 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-3.5" strokeWidth={1.75} /> Thoát
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        {/* iPhone 15+: center column stays empty so the Dynamic Island never covers content */}
        <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_8.5rem_minmax(0,1fr)] items-center border-b border-border bg-background/90 px-4 pb-2.5 pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur-xl lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <Logo size={28} />
            <span className="truncate text-base font-bold tracking-tight">FiGo</span>
          </div>
          <div aria-hidden className="h-9" />
          <div className="flex items-center justify-end gap-1.5">
            {hydrated && <MobileSquirrelTrigger />}
            <NotificationBell />
            <AccountMenu />
          </div>
        </header>

        <div className="hidden items-center justify-end gap-2.5 px-8 pt-5 lg:flex">
          <NotificationBell />
          <AccountMenu />
        </div>
        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 pb-4 pt-3 safe-bottom lg:px-8 lg:pb-12 lg:pt-2">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] lg:hidden">
        <div className="relative mx-auto grid max-w-lg grid-cols-5 items-center rounded-2xl border border-border bg-card/95 px-1 py-1.5 shadow-[0_8px_28px_-12px_rgba(15,23,42,0.18)] backdrop-blur-xl">
          {NAV.slice(0, 2).map((n) => (
            <NavItem key={n.to} {...n} active={pathname === n.to} />
          ))}
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => openTxSheet()}
            aria-label="Thêm giao dịch"
            className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_4px_12px_-2px_rgba(5,150,105,0.45)]"
          >
            <Plus className="size-5" strokeWidth={2} />
          </motion.button>
          {[NAV[3], NAV[5]].map((n) => (
            <NavItem key={n.to} {...n} active={pathname === n.to} />
          ))}
        </div>
      </nav>

      <TransactionSheet />
      <SessionGuard />
      {hydrated && <BillReminderWatcher />}
      {hydrated && <SquirrelCompanion />}
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "tactile relative flex min-w-0 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      {active && (
        <motion.span
          layoutId="bottom-active"
          className="absolute inset-x-1 top-0 h-full rounded-xl bg-accent"
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
      <Icon className="relative z-10 size-[18px]" strokeWidth={1.75} />
      <span className="relative z-10">{label}</span>
    </Link>
  );
}

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <img
      src="/logo.png"
      alt="FiGo"
      width={size}
      height={size}
      decoding="async"
      className="shrink-0 rounded-xl border border-border/60 shadow-2xs"
      style={{ width: size, height: size }}
    />
  );
}

export function Splash() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
      <motion.div
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
      >
        <Logo size={56} />
      </motion.div>
      <div className="text-sm font-medium text-muted-foreground">Đang đồng bộ sổ dữ liệu…</div>
    </div>
  );
}
