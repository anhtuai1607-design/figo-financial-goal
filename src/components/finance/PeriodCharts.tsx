import { useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel } from "@/components/finance/Common";
import { Button } from "@/components/ui/button";
import { formatVnd } from "@/lib/format";
import {
  type PeriodMode,
  boundsOf,
  breakdownFor,
  isCurrentPeriod,
  isFuturePeriod,
  periodLabel,
  shiftPeriod,
  sumPeriod,
  trendGrouped,
} from "@/lib/period";
import type { Bill, Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

const MODES: { key: PeriodMode; label: string }[] = [
  { key: "day", label: "Ngày" },
  { key: "week", label: "Tuần" },
  { key: "month", label: "Tháng" },
  { key: "year", label: "Năm" },
];
const sliceColor = (hue: number | null) =>
  hue === null ? "oklch(0.65 0.01 260)" : `oklch(0.58 0.13 ${hue})`;
const tickMoney = (v: number) =>
  v >= 1_000_000
    ? `${Math.round((v / 1_000_000) * 10) / 10}tr`
    : v >= 1_000
      ? `${Math.round(v / 1_000)}k`
      : String(v);
const tip = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 12,
};
function TrendTip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: {
    name?: string;
    value?: number | null;
    color?: string;
    dataKey?: string;
    payload?: { range?: string; label?: string; future?: boolean };
  }[];
}) {
  const rows = (payload ?? []).filter((p) => Number(p.value) > 0);
  if (!active || rows.length === 0) return null;
  const meta = rows[0]!.payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-foreground">{meta?.range ?? meta?.label}</p>
      {rows.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">
            {p.dataKey === "expense" && meta?.future ? "Chi dự kiến" : p.name}
          </span>
          <span className="ml-auto pl-3 font-semibold tabular-nums">
            {formatVnd(Number(p.value))}
          </span>
        </p>
      ))}
    </div>
  );
}

const prevWord: Record<PeriodMode, string> = {
  day: "hôm trước",
  week: "tuần trước",
  month: "tháng trước",
  year: "năm trước",
};

/** Biểu đồ xu hướng + cơ cấu: xem theo ngày, tuần, tháng, năm; lùi về quá khứ hoặc xem trước tương lai. */
export function PeriodCharts({ txs, bills }: { txs: Transaction[]; bills: Bill[] }) {
  const [mode, setMode] = useState<PeriodMode>("month");
  const [anchor, setAnchor] = useState(new Date());
  const [kind, setKind] = useState<"expense" | "income">("expense");

  const { start, end } = boundsOf(mode, anchor);
  const rows = trendGrouped(txs, bills, mode, anchor);
  const cur = sumPeriod(txs, start, end);
  const prevB = boundsOf(mode, shiftPeriod(mode, anchor, -1));
  const prev = sumPeriod(txs, prevB.start, prevB.end);
  const planned = rows.reduce((s, r) => s + r.planned, 0);
  const future = isFuturePeriod(mode, anchor);
  const empty = cur.income === 0 && cur.expense === 0 && planned === 0;
  const delta =
    prev.expense > 0 ? Math.round(((cur.expense - prev.expense) / prev.expense) * 100) : null;
  const bd = breakdownFor(txs, start, end, kind);

  const chartRows = rows.map((r) => ({
    label: r.label,
    range: r.range,
    future: r.future,
    income: r.future ? null : r.income,
    expense: r.future ? r.planned : r.expense,
  }));
  const hasFuture = chartRows.some((r) => r.future && (r.expense ?? 0) > 0);
  type DotProps = {
    cx?: number;
    cy?: number;
    value?: number | null;
    index?: number;
    dataKey?: string;
    payload?: { future?: boolean };
  };
  const dotOf = (color: string) => (p: DotProps) => {
    const k = `${p.dataKey}-${p.index}`;
    if (!p.value || p.value <= 0 || p.cx == null || p.cy == null) return <g key={k} />;
    const hollow = !!p.payload?.future;
    return (
      <circle
        key={k}
        cx={p.cx}
        cy={p.cy}
        r={5}
        fill={hollow ? "var(--card)" : color}
        stroke={hollow ? color : "var(--card)"}
        strokeWidth={2}
      />
    );
  };
  const labelOf =
    (key: "income" | "expense", color: string) =>
    (p: {
      x?: string | number | undefined;
      y?: string | number | undefined;
      value?: string | number | boolean | null | undefined;
      index?: number | undefined;
    }) => {
      const val = Number(p.value);
      const x = Number(p.x);
      const y = Number(p.y);
      const row = chartRows[p.index ?? 0];
      if (!row || !val || val <= 0 || Number.isNaN(x) || Number.isNaN(y)) return null;
      const other = key === "income" ? row.expense : row.income;
      let above = other == null || val >= other;
      if (!above && y > 200) above = true;
      return (
        <text
          x={x}
          y={above ? y - 12 : y + 22}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill={color}
          stroke="var(--card)"
          strokeWidth={3}
          paintOrder="stroke"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {tickMoney(val)}
        </text>
      );
    };

  return (
    <section className="mb-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="segmented relative grid w-full max-w-sm grid-cols-4 text-xs font-medium">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => {
                setMode(m.key);
                setAnchor(new Date());
              }}
              className={cn(
                "tactile relative z-10 rounded-lg py-1.5 transition-colors",
                mode === m.key ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {mode === m.key && (
                <motion.span
                  layoutId="period-mode"
                  className="absolute inset-0 -z-10 rounded-lg border border-border/60 bg-card shadow-xs"
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {!isCurrentPeriod(mode, anchor) && (
            <button
              type="button"
              onClick={() => setAnchor(new Date())}
              className="tactile mr-1 rounded-lg border border-primary/25 bg-accent px-2.5 py-1 text-xs font-medium text-primary"
            >
              Hôm nay
            </button>
          )}
          <Button
            size="icon"
            variant="outline"
            className="size-8 rounded-lg"
            onClick={() => setAnchor(shiftPeriod(mode, anchor, -1))}
            aria-label="Kỳ trước"
          >
            <ChevronLeft />
          </Button>
          <span className="min-w-36 text-center text-sm font-semibold tabular-nums">
            {periodLabel(mode, anchor)}
          </span>
          <Button
            size="icon"
            variant="outline"
            className="size-8 rounded-lg"
            onClick={() => setAnchor(shiftPeriod(mode, anchor, 1))}
            aria-label="Kỳ sau"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Panel>
          <h2 className="text-base font-semibold">Xu hướng thu – chi</h2>
          <div className="mt-3 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-muted/35 text-center">
            <div className="p-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
                Thu
              </p>
              <p className="mt-0.5 text-sm font-semibold text-income tabular-nums">
                {formatVnd(cur.income)}
              </p>
            </div>
            <div className="p-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
                Chi
              </p>
              <p className="mt-0.5 text-sm font-semibold text-expense tabular-nums">
                {formatVnd(cur.expense)}
              </p>
            </div>
            <div className="p-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
                Còn lại
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">
                {formatVnd(cur.income - cur.expense)}
              </p>
            </div>
          </div>
          <p className="mt-2.5 min-h-4 text-xs text-muted-foreground tabular-nums">
            {delta !== null && !future ? (
              <>
                Chi tiêu{" "}
                <strong className={delta > 0 ? "text-expense" : "text-income"}>
                  {delta > 0 ? "tăng" : delta < 0 ? "giảm" : "không đổi so với"}{" "}
                  {delta !== 0 && `${Math.abs(delta)}%`}
                </strong>
                {delta !== 0 && " so với"} {prevWord[mode]}.
              </>
            ) : null}
            {planned > 0 && (
              <>
                {" "}
                Chi dự kiến từ hóa đơn sắp tới: <strong>{formatVnd(planned)}</strong>.
              </>
            )}
          </p>
          <div className="relative mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartRows} margin={{ left: -4, right: 14, top: 18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.7} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  padding={{ left: 16, right: 16 }}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickCount={4}
                  allowDecimals={false}
                  domain={[0, (max: number) => Math.max(1000, Math.ceil(max * 1.22))]}
                  tickFormatter={tickMoney}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                  content={<TrendTip />}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Thu"
                  stroke="var(--chart-1)"
                  strokeWidth={2.25}
                  dot={dotOf("var(--chart-1)")}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                >
                  <LabelList dataKey="income" content={labelOf("income", "var(--chart-1)")} />
                </Line>
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="Chi"
                  stroke="var(--chart-2)"
                  strokeWidth={2.25}
                  dot={dotOf("var(--chart-2)")}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                >
                  <LabelList dataKey="expense" content={labelOf("expense", "var(--chart-2)")} />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
            {empty && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <p className="rounded-lg border border-border bg-background/95 px-4 py-2 text-xs text-muted-foreground">
                  {future
                    ? "Kỳ này ở tương lai, chưa có dữ liệu."
                    : "Chưa có giao dịch trong kỳ này."}
                </p>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: "var(--chart-1)" }} />
              Thu
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: "var(--chart-2)" }} />
              Chi
            </span>
            {hasFuture && (
              <span className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-full border-2 bg-card"
                  style={{ borderColor: "var(--chart-2)" }}
                />
                Chi dự kiến
              </span>
            )}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">
                Cơ cấu {kind === "expense" ? "chi tiêu" : "thu nhập"}
              </h2>
              <p className="text-xs text-muted-foreground tabular-nums">
                {periodLabel(mode, anchor)}
              </p>
            </div>
            <div className="grid grid-cols-2 rounded-lg border border-border bg-muted p-0.5 text-xs font-medium">
              {(["expense", "income"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    "tactile rounded-md px-2.5 py-1 transition",
                    kind === k
                      ? "bg-card font-semibold text-primary shadow-xs"
                      : "text-muted-foreground",
                  )}
                >
                  {k === "expense" ? "Chi" : "Thu"}
                </button>
              ))}
            </div>
          </div>
          {bd.rows.length ? (
            <>
              <div className="relative mt-3 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bd.rows}
                      dataKey="amount"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={82}
                      paddingAngle={bd.rows.length > 1 ? 2.5 : 0}
                      cornerRadius={4}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                    >
                      {bd.rows.map((r) => (
                        <Cell key={r.id} fill={sliceColor(r.hue)} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatVnd(Number(v))} contentStyle={tip} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
                    Tổng {kind === "expense" ? "chi" : "thu"}
                  </span>
                  <span className="text-base font-semibold tabular-nums">
                    {formatVnd(bd.total)}
                  </span>
                </div>
              </div>
              <div className="mt-3 space-y-2.5">
                {bd.rows.map((r) => (
                  <div key={r.id} className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: sliceColor(r.hue) }}
                      />
                      <span className="flex-1 truncate font-medium">{r.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatVnd(r.amount)}
                      </span>
                      <strong className="w-10 text-right font-semibold tabular-nums">
                        {r.pct}%
                      </strong>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${r.pct}%`, background: sliceColor(r.hue) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 py-10 text-center text-xs text-muted-foreground">
              {future
                ? "Kỳ này ở tương lai, chưa có dữ liệu."
                : `Chưa có khoản ${kind === "expense" ? "chi" : "thu"} nào trong kỳ này.`}
            </p>
          )}
        </Panel>
      </div>
    </section>
  );
}
