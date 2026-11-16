import { useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Area, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel } from "@/components/finance/Common";
import { Button } from "@/components/ui/button";
import { formatVnd } from "@/lib/format";
import { type PeriodMode, boundsOf, breakdownFor, isCurrentPeriod, isFuturePeriod, periodLabel, shiftPeriod, sumPeriod, trendFor } from "@/lib/period";
import type { Bill, Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

const MODES: { key: PeriodMode; label: string }[] = [{ key: "day", label: "Ngày" }, { key: "week", label: "Tuần" }, { key: "month", label: "Tháng" }, { key: "year", label: "Năm" }];
const sliceColor = (hue: number | null) => (hue === null ? "oklch(0.7 0.02 260)" : `oklch(0.68 0.16 ${hue})`);
const tickMoney = (v: number) => (v >= 1_000_000 ? `${Math.round((v / 1_000_000) * 10) / 10}tr` : v >= 1_000 ? `${Math.round(v / 1_000)}k` : String(v));
const tip = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 };
function TrendTip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; color?: string; dataKey?: string }[]; label?: string }) {
  const rows = (payload ?? []).filter((p) => Number(p.value) > 0);
  if (!active || rows.length === 0) return null;
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold">{label}</p>
      {rows.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: p.color }} /><span className="text-muted-foreground">{p.name}</span><span className="ml-auto pl-3 font-semibold tabular-nums">{formatVnd(Number(p.value))}</span></p>
      ))}
    </div>
  );
}

const prevWord: Record<PeriodMode, string> = { day: "hôm trước", week: "tuần trước", month: "tháng trước", year: "năm trước" };

/** Biểu đồ xu hướng + cơ cấu: xem theo ngày, tuần, tháng, năm; lùi về quá khứ hoặc xem trước tương lai. */
export function PeriodCharts({ txs, bills }: { txs: Transaction[]; bills: Bill[] }) {
  const [mode, setMode] = useState<PeriodMode>("month");
  const [anchor, setAnchor] = useState(new Date());
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [view, setView] = useState<"cum" | "per">("cum");

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

  // Dữ liệu đường: "Luỹ kế" cộng dồn đến hôm nay (đường mượt, không gấp khúc), "Từng kỳ" là giá trị từng ngày/tháng.
  const nowD = new Date();
  const nowIdx = isCurrentPeriod(mode, anchor)
    ? mode === "day" ? nowD.getHours() : mode === "week" ? (nowD.getDay() + 6) % 7 : mode === "month" ? nowD.getDate() - 1 : nowD.getMonth()
    : future ? -1 : data.length - 1;
  let ci = 0, ce = 0, cp = 0, ceAtNow = 0;
  const lineData = data.map((r, i) => {
    ci += r.income; ce += r.expense;
    if (i === nowIdx) ceAtNow = ce;
    if (i > nowIdx) cp += r.planned;
    const actual = i <= nowIdx;
    if (view === "cum") return { label: r.label, income: actual ? ci : null, expense: actual ? ce : null, planned: planned > 0 && i >= nowIdx ? ceAtNow + cp : null };
    return { label: r.label, income: actual ? r.income : null, expense: actual ? r.expense : null, planned: planned > 0 && i > nowIdx && r.planned > 0 ? r.planned : null };
  });
  const dotOf = (color: string) => (props: { cx?: number; cy?: number; value?: number | null; index?: number; dataKey?: string }) =>
    props.value && props.value > 0 ? <circle key={`${props.dataKey}-${props.index}`} cx={props.cx} cy={props.cy} r={3.5} fill={color} stroke="var(--card)" strokeWidth={1.5} /> : <g key={`${props.dataKey}-${props.index}`} />;

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
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold">Xu hướng thu – chi</h2>
            <div className="grid grid-cols-2 rounded-full bg-muted p-0.5 text-xs font-semibold">
              {(["cum", "per"] as const).map((k) => <button key={k} type="button" onClick={() => setView(k)} className={cn("rounded-full px-3 py-1 transition", view === k ? "bg-background shadow-sm" : "text-muted-foreground")}>{k === "cum" ? "Luỹ kế" : "Từng kỳ"}</button>)}
            </div>
          </div>
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
              <ComposedChart data={lineData} margin={{ left: -10, right: 10, top: 10 }}>
                <defs>
                  <linearGradient id="plIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} /><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="plExpense" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.2} /><stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} interval={mode === "month" ? 4 : mode === "day" ? 2 : 0} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} width={46} tickCount={4} domain={[0, "auto"]} allowDecimals={false} tickFormatter={tickMoney} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <Tooltip cursor={{ stroke: "var(--border)", strokeWidth: 1.5 }} content={<TrendTip />} />
                {view === "cum" ? (
                  <>
                    <Area type="monotone" dataKey="income" name="Thu" stroke="var(--chart-1)" strokeWidth={2.75} fill="url(#plIncome)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                    <Area type="monotone" dataKey="expense" name="Chi" stroke="var(--chart-2)" strokeWidth={2.75} fill="url(#plExpense)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                  </>
                ) : (
                  <>
                    <Line type="linear" dataKey="income" name="Thu" stroke="var(--chart-1)" strokeWidth={2.5} strokeLinejoin="round" dot={dotOf("var(--chart-1)")} activeDot={{ r: 5, strokeWidth: 0 }} />
                    <Line type="linear" dataKey="expense" name="Chi" stroke="var(--chart-2)" strokeWidth={2.5} strokeLinejoin="round" dot={dotOf("var(--chart-2)")} activeDot={{ r: 5, strokeWidth: 0 }} />
                  </>
                )}
                {planned > 0 && <Line type="linear" dataKey="planned" name="Hoá đơn dự kiến" stroke="var(--chart-2)" strokeWidth={2} strokeDasharray="5 4" dot={view === "per" ? { r: 3.5, fill: "var(--card)", stroke: "var(--chart-2)", strokeWidth: 2 } : false} connectNulls />}
              </ComposedChart>
            </ResponsiveContainer>
            {empty && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><p className="rounded-xl bg-background/90 px-4 py-2 text-sm text-muted-foreground">{future ? "Kỳ này ở tương lai, chưa có dữ liệu." : "Chưa có giao dịch trong kỳ này."}</p></div>}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded-full" style={{ background: "var(--chart-1)" }} />Thu{view === "cum" ? " luỹ kế" : ""}</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded-full" style={{ background: "var(--chart-2)" }} />Chi{view === "cum" ? " luỹ kế" : ""}</span>
            {planned > 0 && <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed" style={{ borderColor: "var(--chart-2)" }} />Hoá đơn dự kiến</span>}
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
              <div className="relative mt-3 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={bd.rows} dataKey="amount" nameKey="name" innerRadius={60} outerRadius={84} paddingAngle={bd.rows.length > 1 ? 3 : 0} cornerRadius={8} startAngle={90} endAngle={-270} stroke="none">
                      {bd.rows.map((r) => <Cell key={r.id} fill={sliceColor(r.hue)} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatVnd(Number(v))} contentStyle={tip} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[11px] text-muted-foreground">Tổng {kind === "expense" ? "chi" : "thu"}</span><span className="text-base font-bold tabular-nums">{formatVnd(bd.total)}</span></div>
              </div>
              <div className="mt-3 space-y-3">
                {bd.rows.map((r) => (
                  <div key={r.id} className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: sliceColor(r.hue) }} />
                      <span className="flex-1 truncate font-medium">{r.name}</span>
                      <span className="tabular-nums text-muted-foreground">{formatVnd(r.amount)}</span>
                      <strong className="w-12 text-right tabular-nums">{r.pct}%</strong>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: sliceColor(r.hue) }} /></div>
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
