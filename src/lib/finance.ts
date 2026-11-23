import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subWeeks,
  subMonths,
  subYears,
  startOfYear,
  endOfYear,
  isWithinInterval,
  format,
  parseISO,
  getDaysInMonth,
  differenceInCalendarDays,
} from "date-fns";
import type { Account, Bill, Budget, Goal, Transaction } from "./types";
import { toVnd, monthKey, formatVnd } from "./format";
import { getCategory } from "./categories";

export function accountBalance(acc: Account, txs: Transaction[]) {
  let bal = toVnd(acc.initialBalance);
  for (const t of txs) {
    if (t.type === "income" && t.accountId === acc.id) bal += t.amount;
    else if (t.type === "expense" && t.accountId === acc.id) bal -= t.amount;
    else if (t.type === "transfer") {
      if (t.accountId === acc.id) bal -= t.amount;
      if (t.toAccountId === acc.id) bal += t.amount;
    }
  }
  return toVnd(bal);
}

export function totalBalance(accounts: Account[], txs: Transaction[]) {
  return accounts.reduce((s, a) => s + accountBalance(a, txs), 0);
}

export function inMonth(txs: Transaction[], key = monthKey()) {
  return txs.filter((t) => t.date.startsWith(key));
}

export function monthTotals(txs: Transaction[], key = monthKey()) {
  const m = inMonth(txs, key);
  const income = m.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = m.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  return { income, expense, net: income - expense, count: m.length };
}

export function categoryBreakdown(txs: Transaction[], key = monthKey()) {
  const map = new Map<string, number>();
  for (const t of inMonth(txs, key)) {
    if (t.type !== "expense") continue;
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  }
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  return [...map.entries()]
    .map(([categoryId, amount]) => ({
      categoryId,
      name: getCategory(categoryId).name,
      amount,
      pct: total ? Math.round((amount / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export type TrendRange = "week" | "month" | "year";

export function trendSeries(txs: Transaction[], range: TrendRange) {
  const now = new Date();
  const buckets: { label: string; start: Date; end: Date }[] = [];
  if (range === "week") {
    for (let i = 7; i >= 0; i--) {
      const d = subWeeks(now, i);
      buckets.push({
        label: `T${format(startOfWeek(d, { weekStartsOn: 1 }), "dd/MM")}`,
        start: startOfWeek(d, { weekStartsOn: 1 }),
        end: endOfWeek(d, { weekStartsOn: 1 }),
      });
    }
  } else if (range === "month") {
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      buckets.push({ label: `T${format(d, "M")}`, start: startOfMonth(d), end: endOfMonth(d) });
    }
  } else {
    for (let i = 3; i >= 0; i--) {
      const d = subYears(now, i);
      buckets.push({ label: format(d, "yyyy"), start: startOfYear(d), end: endOfYear(d) });
    }
  }
  return buckets.map((b) => {
    let income = 0;
    let expense = 0;
    for (const t of txs) {
      const d = parseISO(t.date);
      if (!isWithinInterval(d, { start: b.start, end: b.end })) continue;
      if (t.type === "income") income += t.amount;
      else if (t.type === "expense") expense += t.amount;
    }
    return { label: b.label, income, expense };
  });
}

export interface BudgetProgress {
  budget: Budget;
  spent: number;
  pct: number; // 0..100+
  status: "safe" | "warning" | "over";
  remaining: number;
}

export function budgetProgress(
  budget: Budget,
  txs: Transaction[],
  key = monthKey(),
): BudgetProgress {
  const m = inMonth(txs, key).filter((t) => t.type === "expense");
  const spent = (
    budget.categoryId === "all" ? m : m.filter((t) => t.categoryId === budget.categoryId)
  ).reduce((s, t) => s + t.amount, 0);
  const pct = budget.limit ? Math.round((spent / budget.limit) * 1000) / 10 : 0;
  const status = pct >= 100 ? "over" : pct >= 80 ? "warning" : "safe";
  return { budget, spent, pct, status, remaining: budget.limit - spent };
}

export function activeBudgets(budgets: Budget[], key = monthKey()) {
  // month-specific overrides recurring ("*")
  const specific = budgets.filter((b) => b.month === key);
  const recurring = budgets.filter(
    (b) => b.month === "*" && !specific.some((s) => s.categoryId === b.categoryId),
  );
  return [...specific, ...recurring];
}

export function billStatus(bill: Bill, key = monthKey()) {
  const parts = key.split("-").map(Number);
  const y = parts[0] ?? new Date().getFullYear();
  const m = parts[1] ?? new Date().getMonth() + 1;
  const days = getDaysInMonth(new Date(y, m - 1));
  const due = new Date(y, m - 1, Math.min(bill.dueDay, days));
  const paid = bill.paidMonths.includes(key);
  const daysLeft = differenceInCalendarDays(due, new Date());
  return {
    due,
    paid,
    daysLeft,
    overdue: !paid && daysLeft < 0,
    dueSoon: !paid && daysLeft >= 0 && daysLeft <= 3,
  };
}

export function goalStats(goal: Goal) {
  const pct = goal.target ? Math.min(100, Math.round((goal.saved / goal.target) * 1000) / 10) : 0;
  const daysLeft = differenceInCalendarDays(parseISO(goal.deadline), new Date());
  const remaining = Math.max(0, goal.target - goal.saved);
  const monthsLeft = Math.max(1, Math.ceil(daysLeft / 30));
  const perMonth = toVnd(remaining / monthsLeft);
  return { pct, daysLeft, remaining, perMonth, done: goal.saved >= goal.target };
}

export interface Insight {
  tone: "good" | "warn" | "info";
  text: string;
}

export function buildInsights(txs: Transaction[], budgets: Budget[], goals: Goal[]): Insight[] {
  const out: Insight[] = [];
  const key = monthKey();
  const { income, expense, net } = monthTotals(txs, key);
  const prev = monthTotals(txs, monthKey(subMonths(new Date(), 1)));
  const breakdown = categoryBreakdown(txs, key);

  if (income > 0) {
    const top = breakdown[0];
    if (top) {
      const share = Math.round((top.amount / income) * 100);
      if (share >= 30)
        out.push({
          tone: "warn",
          text: `Tháng này bạn chi cho ${top.name} chiếm ${share}% tổng thu nhập (${formatVnd(top.amount)}). Hãy cân nhắc tiết kiệm hơn nhé!`,
        });
      else
        out.push({
          tone: "info",
          text: `Khoản chi lớn nhất tháng này là ${top.name} với ${formatVnd(top.amount)}, tương đương ${share}% thu nhập.`,
        });
    }
    const saveRate = Math.round((net / income) * 100);
    if (saveRate >= 20)
      out.push({
        tone: "good",
        text: `Tuyệt vời! Bạn đang giữ lại được ${saveRate}% thu nhập tháng này. Duy trì quy tắc 50/30/20 nhé.`,
      });
    else if (saveRate > 0)
      out.push({
        tone: "warn",
        text: `Tỷ lệ tiết kiệm tháng này chỉ ${saveRate}%. Mục tiêu lý tưởng là tối thiểu 20% thu nhập.`,
      });
    else
      out.push({
        tone: "warn",
        text: `Chi tiêu đã vượt thu nhập ${formatVnd(-net)} trong tháng này. Hãy rà soát lại các khoản không thiết yếu.`,
      });
  }

  if (prev.expense > 0) {
    const diff = Math.round(((expense - prev.expense) / prev.expense) * 100);
    if (diff <= -10)
      out.push({
        tone: "good",
        text: `Chi tiêu tháng này giảm ${-diff}% so với tháng trước. Bạn đang đi đúng hướng!`,
      });
    else if (diff >= 15)
      out.push({
        tone: "warn",
        text: `Chi tiêu tháng này tăng ${diff}% so với tháng trước (${formatVnd(expense - prev.expense, { sign: true })}).`,
      });
  }

  const coffee = breakdown.find((b) => b.categoryId === "ca_phe");
  if (coffee && coffee.amount >= 400_000)
    out.push({
      tone: "info",
      text: `Cà phê & gặp gỡ bạn bè đã tốn ${formatVnd(coffee.amount)}. Pha cà phê tại nhà 2 ngày/tuần có thể tiết kiệm ~${formatVnd(Math.round(coffee.amount * 0.3))}/tháng.`,
    });

  const over = activeBudgets(budgets, key)
    .map((b) => budgetProgress(b, txs, key))
    .filter((p) => p.status !== "safe");
  for (const p of over.slice(0, 2)) {
    const name =
      p.budget.categoryId === "all" ? "Toàn bộ ví" : getCategory(p.budget.categoryId).name;
    out.push({
      tone: p.status === "over" ? "warn" : "info",
      text:
        p.status === "over"
          ? `Hạn mức "${name}" đã vượt ${formatVnd(-p.remaining)}. Tạm dừng chi cho mục này đến hết tháng nhé.`
          : `Hạn mức "${name}" đã dùng ${p.pct}%. Chỉ còn ${formatVnd(p.remaining)} cho phần còn lại của tháng.`,
    });
  }

  const g = goals
    .filter((x) => !goalStats(x).done)
    .sort((a, b) => goalStats(a).daysLeft - goalStats(b).daysLeft)[0];
  if (g) {
    const st = goalStats(g);
    out.push({
      tone: "info",
      text: `Để đạt "${g.name}" đúng hạn, bạn cần gom thêm khoảng ${formatVnd(st.perMonth)}/tháng trong ${Math.max(1, Math.ceil(st.daysLeft / 30))} tháng tới.`,
    });
  }

  if (out.length === 0)
    out.push({
      tone: "info",
      text: "Hãy thêm vài giao dịch để FiGo phân tích thói quen chi tiêu của bạn.",
    });
  return out.slice(0, 4);
}

/** Tính chuỗi ngày ghi chép liên tiếp từ dữ liệu giao dịch thực tế. */
export function computeLoggingStreak(txs: Transaction[], now = new Date()) {
  if (txs.length === 0) return { streak: 0, loggedToday: false, monthDays: 0 };
  const days = new Set(txs.map((t) => format(parseISO(t.date), "yyyy-MM-dd")));
  const todayKey = format(now, "yyyy-MM-dd");
  const loggedToday = days.has(todayKey);
  const ym = format(now, "yyyy-MM");
  let monthDays = 0;
  for (const d of days) if (d.startsWith(ym)) monthDays++;

  let streak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!loggedToday) cursor.setDate(cursor.getDate() - 1);
  while (days.has(format(cursor, "yyyy-MM-dd"))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { streak, loggedToday, monthDays };
}
