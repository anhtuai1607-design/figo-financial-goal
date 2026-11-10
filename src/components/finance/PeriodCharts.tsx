import { useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Area, Cell, ComposedChart, CartesianGrid, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel } from "@/components/finance/Common";
import { Button } from "@/components/ui/button";
import { formatVnd } from "@/lib/format";
import { type PeriodMode, boundsOf, breakdownFor, isCurrentPeriod, isFuturePeriod, periodLabel, shiftPeriod, sumPeriod, trendFor } from "@/lib/period";
import type { Bill, Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

const MODES: { key: PeriodMode; label: string }[] = [{ key: "day", label: "Ngày" }, { key: "week", label: "Tuần" }, { key: "month", label: "Tháng" }, { key: "year", label: "Năm" }];
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--muted-foreground)"];
const tickMoney = (v: number) => (v >= 1_000_000 ? `${Math.round((v / 1_000_000) * 10) / 10}tr` : v >= 1_000 ? `${Math.round(v / 1_000)}k` : String(v));
const tip = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 };
const prevWord: Record<PeriodMode, string> = { day: "hôm trước", week: "tuần trước", month: "tháng trước", year: "năm trước" };

/** Biểu đồ xu hướng + cơ cấu: xem theo ngày, tuần, tháng, năm; lùi về quá khứ hoặc xem trước tương lai. */
export function PeriodCharts({ txs, bills }: { txs: Transaction[]; bills: Bill[] }) {
  const [mode, setMode] = useState<PeriodMode>("month");
  const [anchor, setAnchor] = useState(new Date());
  const [kind, setKind] = useState<"expense" | "income">("expense");

  const { start, end } = boundsOf(mode, anchor);
  const data = trendFor(txs, bills, mode, anchor);
  const cur = sumPeriod(txs, start, end);
  const prevB = boundsOf(mode, shiftPeriod(mode, anchor, -1));
  const prev = sumPeriod(txs, prevB.start, prevB.end);
  const planned = data.reduce((s, r) => s + r.planned, 0);
  const future = isFuturePeriod(mode, anchor);
  const empty = cur.income === 0 && cur.expense === 0 && planned === 0;
  const delta = prev.expense > 0 ? Math.round(((cur.expense - prev.expense) / prev.expense) * 100) : null;
  const bd = breakdownFor(txs, start, end, kind);

  return (
    <section className="mb-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="segmented relative grid w-full max-w-sm grid-cols-4 text-xs font-semibold">
          {MODES.map((m) => (
            <button key={m.key} type="button" onClick={() => { setMode(m.key); setAnchor(new Date()); }} className={cn("relative z-10 rounded-full py-2 transition-colors", mode === m.key ? "text-foreground" : "text-muted-foreground")}>
              {mode === m.key && <motion.span layoutId="period-mode" className="absolute inset-0 -z-10 rounded-full bg-background shadow-sm" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {!isCurrentPeriod(mode, anchor) && <button type="button" onClick={() => setAnchor(new Date())} className="mr-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Hôm nay</button>}
          <Button size="icon" variant="ghost" className="size-9 rounded-full" onClick={() => setAnchor(shiftPeriod(mode, anchor, -1))} aria-label="Kỳ trước"><ChevronLeft /></Button>
          <span className="min-w-36 text-center text-sm font-bold">{periodLabel(mode, anchor)}</span>
          <Button size="icon" variant="ghost" className="size-9 rounded-full" onClick={() => setAnchor(shiftPeriod(mode, anchor, 1))} aria-label="Kỳ sau"><ChevronRight /></Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Panel>
          <h2 className="font-bold">Xu hướng thu – chi</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-muted/50 p-2"><p className="text-[11px] text-muted-foreground">Thu</p><p className="text-sm font-bold text-income tabular-nums">{formatVnd(cur.income)}</p></div>
            <div className="rounded-xl bg-muted/50 p-2"><p className="text-[11px] text-muted-foreground">Chi</p><p className="text-sm font-bold text-expense tabular-nums">{formatVnd(cur.expense)}</p></div>
            <div className="rounded-xl bg-muted/50 p-2"><p className="text-[11px] text-muted-foreground">Còn lại</p><p className="text-sm font-bold tabular-nums">{formatVnd(cur.income - cur.expense)}</p></div>
          </div>
          <p className="mt-2 min-h-4 text-xs text-muted-foreground">
            {delta !== null && !future ? <>Chi tiêu <strong className={delta > 0 ? "text-expense" : "text-income"}>{delta > 0 ? "tăng" : delta < 0 ? "giảm" : "không đổi so với"} {delta !== 0 && `${Math.abs(delta)}%`}</strong>{delta !== 0 && " so với"} {prevWord[mode]}.</> : null}
            {planned > 0 && <> Hoá đơn dự kiến sắp tới: <strong>{formatVnd(planned)}</strong> (đường nét đứt).</>}
          </p>
          <div className="relative mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ left: -12, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="pcIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="pcExpense" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.28} /><stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={mode === "month" ? 14 : 4} interval="preserveStartEnd" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={tickMoney} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <Tooltip formatter={(v) => formatVnd(Number(v))} contentStyle={tip} />
                <Area type="monotone" dataKey="income" name="Thu" stroke="var(--chart-1)" fill="url(#pcIncome)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="expense" name="Chi" stroke="var(--chart-2)" fill="url(#pcExpense)" strokeWidth={2.5} />
                {planned > 0 && <Line type="monotone" dataKey="planned" name="Hoá đơn dự kiến" stroke="var(--chart-2)" strokeDasharray="5 4" strokeWidth={2} dot={false} />}
              </ComposedChart>
            </ResponsiveContainer>
            {empty && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><p className="rounded-xl bg-background/90 px-4 py-2 text-sm text-muted-foreground">{future ? "Kỳ này ở tương lai, chưa có dữ liệu." : "Chưa có giao dịch trong kỳ này."}</p></div>}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-start justify-between gap-2">
            <div><h2 className="font-bold">Cơ cấu {kind === "expense" ? "chi tiêu" : "thu nhập"}</h2><p className="text-xs text-muted-foreground">{periodLabel(mode, anchor)}</p></div>
            <div className="grid grid-cols-2 rounded-full bg-muted p-0.5 text-xs font-semibold">
              {(["expense", "income"] as const).map((k) => <button key={k} type="button" onClick={() => setKind(k)} className={cn("rounded-full px-3 py-1 transition", kind === k ? "bg-background shadow-sm" : "text-muted-foreground")}>{k === "expense" ? "Chi" : "Thu"}</button>)}
            </div>
          </div>
          {bd.rows.length ? (
            <>
              <div className="relative mt-2 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={bd.rows} dataKey="amount" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={3} stroke="none">
                      {bd.rows.map((r, i) => <Cell key={r.id} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatVnd(Number(v))} contentStyle={tip} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[11px] text-muted-foreground">Tổng</span><span className="text-sm font-bold tabular-nums">{formatVnd(bd.total)}</span></div>
              </div>
              <div className="mt-2 space-y-2">
                {bd.rows.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-2 text-xs">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="flex-1 truncate text-muted-foreground">{r.name}</span>
                    <span className="tabular-nums text-muted-foreground">{formatVnd(r.amount)}</span>
                    <strong className="w-12 text-right tabular-nums">{r.pct}%</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-6 rounded-xl bg-muted/50 py-10 text-center text-sm text-muted-foreground">{future ? "Kỳ này ở tương lai, chưa có dữ liệu." : `Chưa có khoản ${kind === "expense" ? "chi" : "thu"} nào trong kỳ này.`}</p>
          )}
        </Panel>
      </div>
    </section>
  );
}
