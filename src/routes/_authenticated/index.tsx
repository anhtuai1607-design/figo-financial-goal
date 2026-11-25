import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Lightbulb,
  Plus,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AnimatedVnd,
  CopyButton,
  PageHeader,
  Panel,
  TransactionRow,
  metaFor,
} from "@/components/finance/Common";
import { AccountCard } from "@/components/finance/AccountCard";
import { PeriodCharts } from "@/components/finance/PeriodCharts";
import { SquirrelMascot } from "@/components/mascot/SquirrelMascot";
import { TransactionDetail } from "@/components/transactions/TransactionDetail";
import { accountBalance, buildInsights, monthTotals, totalBalance } from "@/lib/finance";
import { formatVnd, monthKey, monthLabel } from "@/lib/format";
import { useFiGo } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import type { Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: metaFor(
      "Tổng quan tài chính",
      "Theo dõi số dư, thu chi và sức khoẻ tài chính cá nhân với FiGo.",
    ),
  }),
  component: Dashboard,
});

function QuickAction({
  icon,
  label,
  tone,
  onClick,
  to,
}: {
  icon: ReactNode;
  label: string;
  tone: "expense" | "income" | "bill" | "ai";
  onClick?: () => void;
  to?: "/assistant" | "/bills";
}) {
  const iconTone =
    tone === "expense"
      ? "border-rose-500/20 bg-rose-500/10 text-expense"
      : tone === "income"
        ? "border-income/25 bg-accent text-income"
        : tone === "bill"
          ? "border-amber-500/25 bg-amber-500/12 text-amber-600 dark:text-amber-400"
          : "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400";
  const inner = (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className="ios-card flex min-h-20 flex-col items-center justify-center gap-2 px-2 py-3 text-center hover:border-primary/35 hover:shadow-md"
    >
      <span className={cn("flex size-9 items-center justify-center rounded-xl border", iconTone)}>
        {icon}
      </span>
      <span className="text-xs font-semibold whitespace-nowrap text-foreground">{label}</span>
    </motion.div>
  );
  if (to)
    return (
      <Link to={to} className="block min-w-0">
        {inner}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className="block w-full min-w-0 text-left">
      {inner}
    </button>
  );
}

function Dashboard() {
  const accounts = useFiGo((s) => s.accounts);
  const txs = useFiGo((s) => s.transactions);
  const budgets = useFiGo((s) => s.budgets);
  const goals = useFiGo((s) => s.goals);
  const bills = useFiGo((s) => s.bills);
  const userName = useFiGo((s) => s.userName);
  const remove = useFiGo((s) => s.removeTransaction);
  const openTx = useUI((s) => s.openTxSheet);
  const [detail, setDetail] = useState<Transaction | null>(null);

  const totals = monthTotals(txs);
  const balanceTotal = totalBalance(accounts, txs);
  const insights = buildInsights(txs, budgets, goals);
  const recent = txs.slice(0, 6);
  const saveRate =
    totals.income > 0
      ? Math.max(0, Math.min(100, Math.round((totals.net / totals.income) * 100)))
      : null;

  const deleteTx = (id: string) => {
    if (!window.confirm("Xoá giao dịch này?")) return false;
    remove(id);
    toast.success("Đã xoá giao dịch.");
    return true;
  };

  return (
    <div>
      <PageHeader
        title="Tổng quan tài chính"
        subtitle={`${userName} · ${monthLabel(monthKey())}`}
      />

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className="hero-card relative mb-5 overflow-hidden rounded-2xl p-5 text-white sm:p-7"
      >
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-100">
              Tổng số dư ghi sổ
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <p className="break-words text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
                <AnimatedVnd value={balanceTotal} />
              </p>
              <CopyButton
                value={formatVnd(balanceTotal)}
                label="Đã sao chép tổng số dư"
                ariaLabel="Sao chép tổng số dư"
                className="border-white/25 bg-white/15 text-white hover:border-white/40 hover:bg-white/25 hover:text-white"
              >
                <span>Sao chép</span>
              </CopyButton>
            </div>
          </div>
          {saveRate !== null && (
            <div className="min-w-44 rounded-xl border border-white/20 bg-white/12 px-3.5 py-2.5 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-emerald-50">Tỷ lệ giữ lại</span>
                <strong className="font-bold tabular-nums text-white">{saveRate}%</strong>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: saveRate / 100 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: "left" }}
                  className="h-full w-full rounded-full bg-emerald-200"
                />
              </div>
            </div>
          )}
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-4 border-t border-white/20 pt-4 text-sm">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-emerald-100">
              Thu tháng này
            </p>
            <p className="mt-0.5 text-base font-bold tabular-nums">
              <AnimatedVnd value={totals.income} />
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-emerald-100">
              Chi tháng này
            </p>
            <p className="mt-0.5 text-base font-bold tabular-nums">
              <AnimatedVnd value={totals.expense} />
            </p>
          </div>
        </div>
      </motion.section>

      <div className="mb-6 grid grid-cols-4 gap-2.5">
        <QuickAction
          icon={<ArrowUpRight className="size-[18px]" strokeWidth={1.5} />}
          label="Thêm chi"
          tone="expense"
          onClick={() => openTx({ type: "expense" })}
        />
        <QuickAction
          icon={<ArrowDownLeft className="size-[18px]" strokeWidth={1.5} />}
          label="Thêm thu"
          tone="income"
          onClick={() => openTx({ type: "income" })}
        />
        <QuickAction
          icon={<CalendarClock className="size-[18px]" strokeWidth={1.5} />}
          label="Hóa đơn"
          tone="bill"
          to="/bills"
        />
        <QuickAction
          icon={<Sparkles className="size-[18px]" strokeWidth={1.5} />}
          label="Hỏi AI"
          tone="ai"
          to="/assistant"
        />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.05em] text-muted-foreground">
          Tài khoản của bạn
        </h2>
        <Button asChild variant="ghost" size="sm" className="text-xs">
          <Link to="/settings">
            Quản lý <ArrowRight />
          </Link>
        </Button>
      </div>
      {accounts.length === 0 ? (
        <Panel className="mb-5 text-center">
          <div className="mx-auto flex flex-col items-center">
            <div className="mb-3 flex size-14 items-center justify-center rounded-xl border border-border bg-muted/50">
              <SquirrelMascot mood="encourage" size={46} />
            </div>
            <p className="text-sm font-semibold">Bắt đầu với nguồn tiền đầu tiên</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
              Thêm ví tiền mặt, tài khoản ngân hàng hoặc ví điện tử và nhập số dư thực tế (hoặc để 0
              đ).
            </p>
            <Button asChild className="mt-4">
              <Link to="/settings">
                <Plus /> Thêm nguồn tiền
              </Link>
            </Button>
          </div>
        </Panel>
      ) : (
        <div className="-mx-4 mb-5 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0">
          {accounts.map((account, i) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="shrink-0 snap-start"
            >
              <AccountCard account={account} balance={accountBalance(account, txs)} />
            </motion.div>
          ))}
        </div>
      )}

      <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Summary
          icon={<ArrowDownLeft className="size-[18px]" strokeWidth={1.5} />}
          label="Tổng thu"
          value={totals.income}
          tone="income"
          delay={0}
        />
        <Summary
          icon={<ArrowUpRight className="size-[18px]" strokeWidth={1.5} />}
          label="Tổng chi"
          value={totals.expense}
          tone="expense"
          delay={0.04}
        />
        <Summary
          icon={<WalletCards className="size-[18px]" strokeWidth={1.5} />}
          label="Còn lại tháng này"
          value={totals.net}
          tone="primary"
          delay={0.08}
        />
      </section>

      <PeriodCharts txs={txs} bills={bills} />

      <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Panel>
          <div className="mb-3 flex items-center justify-between border-b border-border/70 pb-3">
            <div>
              <h2 className="text-base font-semibold">Giao dịch gần đây</h2>
              <p className="text-xs text-muted-foreground tabular-nums">
                {totals.count} giao dịch trong tháng
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to="/transactions">
                Xem tất cả <ArrowRight />
              </Link>
            </Button>
          </div>
          {recent.length > 0 ? (
            <div className="divide-y divide-border/60">
              {recent.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  account={accounts.find((a) => a.id === tx.accountId)?.name}
                  onClick={() => setDetail(tx)}
                />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Chưa có giao dịch nào. Chọn “Thêm chi” hoặc “Thêm thu” để bắt đầu.
            </p>
          )}
        </Panel>
        <Panel>
          <div className="mb-4 flex items-center gap-2.5 border-b border-border/70 pb-3">
            <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted/60 text-primary">
              <Lightbulb className="size-[18px]" strokeWidth={1.5} />
            </span>
            <div>
              <h2 className="text-base font-semibold">Góc nhìn tài chính</h2>
              <p className="text-xs text-muted-foreground">Tổng hợp tự động từ sổ ghi nhận</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {insights.map((item, index) => {
              const Icon =
                item.tone === "good"
                  ? CheckCircle2
                  : item.tone === "warn"
                    ? AlertTriangle
                    : Lightbulb;
              const iconCls =
                item.tone === "good"
                  ? "border-income/25 bg-accent text-income"
                  : item.tone === "warn"
                    ? "border-amber-600/25 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "border-border bg-muted text-primary";
              return (
                <div
                  key={`${item.text}-${index}`}
                  className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/35 p-3 text-sm leading-relaxed"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border",
                      iconCls,
                    )}
                  >
                    <Icon className="size-3.5" strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1 text-[13px]">{item.text}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      </section>

      <TransactionDetail
        tx={detail}
        accounts={accounts}
        onClose={() => setDetail(null)}
        onEdit={(t) => {
          setDetail(null);
          openTx({ tx: t });
        }}
        onDelete={(t) => {
          if (deleteTx(t.id)) setDetail(null);
        }}
      />
    </div>
  );
}

function Summary({
  icon,
  label,
  value,
  tone,
  delay = 0,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: "income" | "expense" | "primary";
  delay?: number;
}) {
  const toneClass =
    tone === "income"
      ? "border-income/25 bg-accent text-income"
      : tone === "expense"
        ? "border-rose-500/20 bg-rose-500/10 text-expense"
        : "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      <Panel className="flex items-center gap-3.5 p-4 sm:p-5">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg border",
            toneClass,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-0.5 truncate text-lg font-bold tabular-nums">
            <AnimatedVnd value={value} />
          </p>
        </div>
      </Panel>
    </motion.div>
  );
}
