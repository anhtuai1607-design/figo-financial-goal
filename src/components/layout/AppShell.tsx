import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { type ReactNode } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { LayoutDashboard, ArrowLeftRight, PiggyBank, CalendarClock, Target, Plus, Settings, Moon, Sun, Wallet, LogOut, Sparkles } from "lucide-react";
import { useFiGo } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { TransactionSheet } from "@/components/transactions/TransactionSheet";
import { SessionGuard, clearActivityMark } from "@/components/auth/SessionGuard";
import { BillReminderWatcher } from "@/components/bills/BillReminderWatcher";
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
  const openTxSheet = useUI((s) => s.openTxSheet);
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut({ scope: "local" });
    clearActivityMark();
    useFiGo.setState({ hydrated: false });
    useFiGo.getState().resetAll();
    toast.success("Đã đăng xuất");
    navigate({ to: "/auth", replace: true });
  }

  if (pathname.startsWith("/auth")) return <div className="min-h-dvh overflow-x-clip">{children}</div>;

  return (
    <div className="min-h-dvh overflow-x-clip lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/70 p-5 backdrop-blur-xl lg:flex">
        <Link to="/" className="flex items-center gap-3 px-2">
          <Logo />
          <div>
            <div className="text-lg font-extrabold tracking-tight">FiGo</div>
            <div className="-mt-1 text-[11px] font-medium text-muted-foreground">Finance & Goal</div>
          </div>
        </Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((n) => {
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "text-primary-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                {active && (
                  <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl gradient-primary shadow-glow" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
                )}
                <n.icon className="relative z-10 size-[18px]" />
                <span className="relative z-10">{n.label}</span>
              </Link>
            );
          })}
          <Link
            to="/settings"
            className={cn(
              "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === "/settings" ? "text-primary-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            {pathname === "/settings" && (
              <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl gradient-primary shadow-glow" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
            )}
            <Settings className="relative z-10 size-[18px]" />
            <span className="relative z-10">Tài khoản & Cài đặt</span>
          </Link>
        </nav>
        <Button
          onClick={() => openTxSheet()}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl gradient-coral px-4 py-3 text-sm font-semibold text-coral-foreground shadow-coral transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="size-4" /> Thêm giao dịch
        </Button>
        <Button
          variant="outline"
          onClick={toggle}
          className="mt-3 flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
        </Button>
        <Button variant="ghost" onClick={signOut} className="mt-2 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm text-muted-foreground hover:text-destructive">
          <LogOut className="size-4" /> Đăng xuất
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        {/* iPhone 15+: center column stays empty so the Dynamic Island never covers content */}
        <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_8.5rem_minmax(0,1fr)] items-center border-b border-border/50 bg-background/80 px-4 pb-2.5 pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur-2xl backdrop-saturate-150 lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <Logo size={30} />
            <span className="truncate text-[17px] font-bold tracking-tight">FiGo</span>
          </div>
          <div aria-hidden className="h-9" />
          <div className="flex items-center justify-end gap-2">
            <NotificationBell />
            <AccountMenu />
          </div>
        </header>

        <div className="hidden items-center justify-end gap-3 px-8 pt-6 lg:flex"><NotificationBell /><AccountMenu /></div>
        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 pb-4 pt-2 safe-bottom lg:px-8 lg:pb-10 lg:pt-2">
          {(
            <AnimatePresence initial={false}>
              <motion.div key={pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16, ease: "easeOut" }}>
                {children}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] lg:hidden">
        <div className="relative mx-auto grid max-w-lg grid-cols-5 items-center rounded-[1.75rem] border bg-card/80 px-1 py-2 shadow-glass backdrop-blur-2xl">
          {NAV.slice(0, 2).map((n) => (
            <NavItem key={n.to} {...n} active={pathname === n.to} />
          ))}
          <button onClick={() => openTxSheet()} aria-label="Thêm giao dịch" className="mx-auto flex size-12 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-glow active:scale-95"><Plus className="size-6" /></button>
          {[NAV[3], NAV[5]].map((n) => (
            <NavItem key={n.to} {...n} active={pathname === n.to} />
          ))}
        </div>
      </nav>

      <TransactionSheet />
      <SessionGuard />
      {hydrated && <BillReminderWatcher />}
    </div>
  );
}

function NavItem({ to, label, icon: Icon, active }: { to: string; label: string; icon: typeof LayoutDashboard; active: boolean }) {
  return (
    <Link to={to} aria-current={active ? "page" : undefined} className={cn("relative flex min-w-0 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-medium transition-colors", active ? "text-primary" : "text-muted-foreground")}>
      {active && <motion.span layoutId="bottom-active" className="absolute inset-x-1 top-0 h-full rounded-lg bg-accent" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
      <Icon className="relative z-10 size-5" />
      <span className="relative z-10">{label}</span>
    </Link>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return <img src="/logo.png" alt="FiGo" width={size} height={size} decoding="async" className="shrink-0 rounded-[22%] shadow-glow" style={{ width: size, height: size }} />;
}

export function Splash() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
      <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}>
        <Logo size={64} />
      </motion.div>
      <div className="text-sm text-muted-foreground">Đang tải dữ liệu của bạn...</div>
    </div>
  );
}
