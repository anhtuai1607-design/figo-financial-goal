import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Lightbulb, Plus, Sparkles, CalendarClock, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, TransactionRow, metaFor } from "@/components/finance/Common";
import { AccountCard } from "@/components/finance/AccountCard";
import { TransactionDetail } from "@/components/transactions/TransactionDetail";
import { type TrendRange, accountBalance, buildInsights, categoryBreakdown, monthTotals, totalBalance, trendSeries } from "@/lib/finance";
import { formatVnd, monthLabel, monthKey } from "@/lib/format";
import { useFiGo } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import type { Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: metaFor("Tổng quan tài chính", "Theo dõi số dư, thu chi và sức khoẻ tài chính cá nhân với FiGo.") }),
  component: Dashboard,
});

const ACC_LABEL = { cash: "Tiền mặt", bank: "Ngân hàng", savings: "Tiết kiệm", ewallet: "Ví điện tử" } as const;

function QuickAction({ icon, label, onClick, to }: { icon: ReactNode; label: string; onClick?: () => void; to?: "/assistant" | "/bills" }) {
  const cls = "ios-card h-auto min-h-16 min-w-0 flex-col gap-2 px-1 py-3 text-[11px] font-semibold [&_svg]:size-5";
  if (to) return <Button asChild variant="ghost" className={cls}><Link to={to}>{icon}{label}</Link></Button>;
  return <Button variant="outline" onClick={onClick} className={cls}>{icon}{label}</Button>;
}

const chartColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const RANGES: { key: TrendRange; label: string }[] = [
  { key: "week", label: "Tuần" },
  { key: "month", label: "Tháng" },
  { key: "year", label: "Năm" },
];

function Dashboard() {
  const accounts = useFiGo((s) => s.accounts);
  const txs = useFiGo((s) => s.transactions);
  const budgets = useFiGo((s) => s.budgets);
  const goals = useFiGo((s) => s.goals);
  const userName = useFiGo((s) => s.userName);
  const remove = useFiGo((s) => s.removeTransaction);
  const openTx = useUI((s) => s.openTxSheet);
  const [range, setRange] = useState<TrendRange>("month");
  const [detail, setDetail] = useState<Transaction | null>(null);

  const totals = monthTotals(txs);
  const trend = trendSeries(txs, range);
  const rangeLabel = range === "week" ? "8 tuần gần nhất" : range === "year" ? "4 năm gần nhất" : "6 tháng gần nhất";
  const breakdown = categoryBreakdown(txs).slice(0, 6);
  const insights = buildInsights(txs, budgets, goals);
  const recent = txs.slice(0, 6);

  const deleteTx = (id: string) => {
    if (!window.confirm("Xoá giao dịch này?")) return false;
    remove(id);
    toast.success("Đã xoá giao dịch.");
    return true;
  };

  return (
    <div>
      <PageHeader title="Tổng quan tài chính" subtitle={`${userName} · ${monthLabel(monthKey())}`} />
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="hero-card relative mb-5 overflow-hidden rounded-3xl p-5 text-primary-foreground sm:p-7">
        <p className="text-sm font-medium text-primary-foreground/70">Tổng số dư ghi sổ</p>
        <p className="mt-2 break-words text-3xl font-extrabold tabular sm:text-4xl">{formatVnd(totalBalance(accounts, txs))}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm">
          <div><p className="text-xs text-primary-foreground/60">Thu tháng này</p><p className="font-bold tabular">{formatVnd(totals.income)}</p></div>
          <div><p className="text-xs text-primary-foreground/60">Chi tháng này</p><p className="font-bold tabular">{formatVnd(totals.expense)}</p></div>
        </div>
      </motion.section>
      <div className="mb-6 grid grid-cols-4 gap-2">
        <QuickAction icon={<ArrowUpRight />} label="Thêm chi" onClick={() => openTx({ type: "expense" })} />
        <QuickAction icon={<ArrowDownLeft />} label="Thêm thu" onClick={() => openTx({ type: "income" })} />
        <QuickAction icon={<CalendarClock />} label="Hoá đơn" to="/bills" />
        <QuickAction icon={<Sparkles />} label="Hỏi AI" to="/assistant" />
      </div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold">Tài khoản của bạn</h2>
        <Button asChild variant="ghost" size="sm"><Link to="/settings">Quản lý <ArrowRight /></Link></Button>
      </div>
      {accounts.length === 0 ? (
        <Panel className="mb-5 text-center">
          <p className="text-sm font-semibold">Bắt đầu với nguồn tiền đầu tiên</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">Thêm ví tiền mặt, tài khoản ngân hàng hoặc ví điện tử của bạn và nhập số dư thực tế (hoặc để 0 đ). FiGo không điền sẵn bất kỳ con số nào.</p>
          <Button asChild className="mt-3"><Link to="/settings"><Plus /> Thêm nguồn tiền</Link></Button>
        </Panel>
      ) : (
        <div className="-mx-4 mb-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0">
          {accounts.map((account, i) => (
            <motion.div key={account.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="shrink-0 snap-start"><AccountCard account={account} balance={accountBalance(account, txs)} /></motion.div>
          ))}
        </div>
      )}
      <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Summary icon={<ArrowDownLeft />} label="Tổng thu" value={totals.income} tone="income" />
        <Summary icon={<ArrowUpRight />} label="Tổng chi" value={totals.expense} tone="expense" />
        <Summary icon={<WalletCards />} label="Còn lại tháng này" value={totals.net} tone="primary" />
      </section>
      <section className="mb-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Panel>
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0"><h2 className="font-bold">Xu hướng thu – chi</h2><p className="text-xs text-muted-foreground">{rangeLabel}</p></div>
          </div>
          <div className="segmented relative mb-4 grid grid-cols-3 text-xs font-semibold">
            {RANGES.map((r) => (
              <button key={r.key} type="button" onClick={() => setRange(r.key)} className={cn("relative z-10 rounded-full py-2 transition-colors", range === r.key ? "text-foreground" : "text-muted-foreground")}>
                {range === r.key && <motion.span layoutId="trend-range" className="absolute inset-0 -z-10 rounded-full bg-background shadow-sm" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
                {r.label}
              </button>
            ))}
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: -18, right: 8 }}>
                <defs>
                  <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35}/><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0}/></linearGradient>
                  <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.28}/><stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)"/>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}/>
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1_000_000)}tr`} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}/>
                <Tooltip formatter={(v) => formatVnd(Number(v))} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }}/>
                <Area type="monotone" dataKey="income" name="Thu" stroke="var(--chart-1)" fill="url(#incomeFill)" strokeWidth={2.5}/>
                <Area type="monotone" dataKey="expense" name="Chi" stroke="var(--chart-2)" fill="url(#expenseFill)" strokeWidth={2.5}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel>
          <h2 className="font-bold">Cơ cấu chi tiêu</h2>
          <p className="text-xs text-muted-foreground">Theo danh mục trong tháng</p>
          {breakdown.length ? (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={breakdown} dataKey="amount" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={3}>
                      {breakdown.map((item, i) => <Cell key={item.categoryId} fill={chartColors[i % chartColors.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatVnd(Number(v))} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {breakdown.slice(0, 4).map((item, i) => (
                  <div key={item.categoryId} className="flex items-center gap-2 text-xs">
                    <span className="size-2 rounded-full" style={{ background: chartColors[i % chartColors.length] }} />
                    <span className="flex-1 truncate text-muted-foreground">{item.name}</span>
                    <strong>{item.pct}%</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="py-20 text-center text-sm text-muted-foreground">Chưa có khoản chi tháng này.</p>
          )}
        </Panel>
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Panel>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="font-bold">Giao dịch gần đây</h2>
              <p className="text-xs text-muted-foreground">{totals.count} giao dịch trong tháng</p>
            </div>
            <Button asChild variant="ghost" size="sm"><Link to="/transactions">Xem tất cả <ArrowRight /></Link></Button>
          </div>
          {recent.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} account={accounts.find((a) => a.id === tx.accountId)?.name} onClick={() => setDetail(tx)} />
          ))}
          {recent.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Chưa có giao dịch nào. Bấm “Thêm chi” hoặc “Thêm thu” để bắt đầu.</p>}
        </Panel>
        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-primary"><Lightbulb className="size-[18px]" /></span>
            <div><h2 className="font-bold">Góc nhìn tài chính</h2><p className="text-xs text-muted-foreground">Phân tích tự động từ dữ liệu của bạn</p></div>
          </div>
          <div className="space-y-3">
            {insights.map((item, index) => <div key={`${item.text}-${index}`} className="rounded-xl bg-muted/70 p-3 text-sm leading-relaxed">{item.text}</div>)}
          </div>
        </Panel>
      </section>

      {/* Cửa sổ chi tiết giao dịch */}
      <TransactionDetail
        tx={detail}
        accounts={accounts}
        onClose={() => setDetail(null)}
        onEdit={(t) => { setDetail(null); openTx({ tx: t }); }}
        onDelete={(t) => { if (deleteTx(t.id)) setDetail(null); }}
      />
    </div>
  );
}

function Summary({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: "income" | "expense" | "primary" }) {
  const toneClass = tone === "income" ? "text-income" : tone === "expense" ? "text-expense" : "text-primary";
  return (
    <Panel className="flex items-center gap-3">
      <span className={`flex size-11 items-center justify-center rounded-xl bg-muted ${toneClass}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-extrabold tabular">{formatVnd(value)}</p>
      </div>
    </Panel>
  );
}
