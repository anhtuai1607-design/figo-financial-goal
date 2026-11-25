import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryPicker } from "@/components/finance/CategoryPicker";
import { EmptyState, PageHeader, Panel, metaFor } from "@/components/finance/Common";
import { getCategory } from "@/lib/categories";
import { activeBudgets, budgetProgress } from "@/lib/finance";
import { formatVnd, formatVndInput, monthKey, parseVndInput } from "@/lib/format";
import { useFiGo } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import type { Budget } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/budgets")({
  head: () => ({
    meta: metaFor("Ngân sách", "Đặt hạn mức chi tiêu theo tháng và nhận cảnh báo đúng lúc."),
  }),
  component: BudgetsPage,
});

function BudgetsPage() {
  const budgets = useFiGo((s) => s.budgets);
  const txs = useFiGo((s) => s.transactions);
  const upsert = useFiGo((s) => s.upsertBudget);
  const remove = useFiGo((s) => s.removeBudget);
  const triggerMascot = useUI((s) => s.triggerMascot);

  const [month, setMonth] = useState(monthKey());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [categoryId, setCategory] = useState("all");
  const [limit, setLimit] = useState("");
  const [recurring, setRecurring] = useState("yes");

  const rows = activeBudgets(budgets, month).map((b) => budgetProgress(b, txs, month));
  const showForm = (budget?: Budget) => {
    setEditing(budget ?? null);
    setCategory(budget?.categoryId ?? "all");
    setLimit(budget ? formatVndInput(budget.limit) : "");
    setRecurring(budget?.month === "*" ? "yes" : "no");
    setOpen(true);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = parseVndInput(limit);
    if (!value) {
      toast.error("Hạn mức phải lớn hơn 0 đ.");
      return;
    }
    upsert({
      ...(editing && { id: editing.id }),
      categoryId,
      limit: value,
      month: recurring === "yes" ? "*" : month,
    });
    toast.success(editing ? "Đã cập nhật hạn mức." : "Đã thêm hạn mức.");
    triggerMascot({
      mood: "happy",
      message: editing
        ? `Đã cập nhật hạn mức ${formatVnd(value)}.`
        : `Đã đặt hạn mức ${formatVnd(value)} cho tháng.`,
    });
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Ngân sách tháng"
        subtitle="Kiểm soát chi tiêu trước khi vượt kế hoạch"
        action={
          <div className="flex gap-2">
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-40 tabular-nums"
            />
            <Button onClick={() => showForm()}>
              <Plus /> Thêm hạn mức
            </Button>
          </div>
        }
      />

      {rows.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((row, idx) => {
            const category =
              row.budget.categoryId === "all" ? null : getCategory(row.budget.categoryId);
            const Icon = category?.icon;
            const statusText =
              row.status === "over"
                ? "Vượt hạn mức"
                : row.status === "warning"
                  ? "Sắp chạm ngưỡng"
                  : "An toàn";
            return (
              <motion.div
                key={row.budget.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <Panel>
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-lg border",
                        row.status === "over"
                          ? "border-destructive/25 bg-destructive/10 text-destructive"
                          : row.status === "warning"
                            ? "border-amber-600/25 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : "border-border bg-muted/60 text-primary",
                      )}
                    >
                      {row.status === "over" ? (
                        <AlertTriangle className="size-[18px]" strokeWidth={1.5} />
                      ) : Icon ? (
                        <Icon className="size-[18px]" strokeWidth={1.5} />
                      ) : (
                        <CheckCircle2 className="size-[18px]" strokeWidth={1.5} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h2 className="text-base font-semibold">
                            {category?.name ?? "Toàn bộ ví"}
                          </h2>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {row.budget.month === "*"
                              ? "Lặp lại hàng tháng"
                              : `Riêng tháng ${month.slice(5)}/${month.slice(0, 4)}`}{" "}
                            ·{" "}
                            <span
                              className={cn(
                                "font-medium",
                                row.status === "over"
                                  ? "text-destructive"
                                  : row.status === "warning"
                                    ? "text-amber-700 dark:text-amber-400"
                                    : "text-income",
                              )}
                            >
                              {statusText}
                            </span>
                          </p>
                        </div>
                        <div className="flex">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => showForm(row.budget)}
                            aria-label="Sửa hạn mức"
                          >
                            <Pencil />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              remove(row.budget.id);
                              toast.success("Đã xoá hạn mức.");
                            }}
                            aria-label="Xoá hạn mức"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-5 flex items-end justify-between border-t border-border/60 pt-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
                            Đã chi
                          </p>
                          <p className="mt-0.5 text-base font-bold tabular-nums">
                            {formatVnd(row.spent)}
                          </p>
                        </div>
                        <p
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            row.status === "over"
                              ? "text-destructive"
                              : row.status === "warning"
                                ? "text-amber-700 dark:text-amber-400"
                                : "text-primary",
                          )}
                        >
                          {row.pct}%
                        </p>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: Math.min(100, row.pct) / 100 }}
                          transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
                          style={{ transformOrigin: "left" }}
                          className={cn(
                            "h-full w-full rounded-full",
                            row.status === "over"
                              ? "bg-destructive"
                              : row.status === "warning"
                                ? "bg-amber-600 dark:bg-amber-500"
                                : "bg-primary",
                          )}
                        />
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-muted-foreground tabular-nums">
                        <span>
                          {row.remaining >= 0
                            ? `Còn ${formatVnd(row.remaining)}`
                            : `Vượt ${formatVnd(-row.remaining)}`}
                        </span>
                        <span>Hạn mức {formatVnd(row.budget.limit)}</span>
                      </div>
                    </div>
                  </div>
                </Panel>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Panel>
          <EmptyState
            title="Chưa có hạn mức"
            text="Thiết lập hạn mức chi tiêu đầu tiên để theo dõi và nhận cảnh báo sớm."
            action={
              <Button onClick={() => showForm()}>
                <Plus /> Thêm hạn mức
              </Button>
            }
          />
        </Panel>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa hạn mức" : "Thêm hạn mức"}</DialogTitle>
            <DialogDescription>Chọn danh mục và số tiền tối đa muốn chi.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <CategoryPicker
              type="expense"
              value={categoryId}
              onChange={setCategory}
              allOption={{ id: "all", label: "Toàn bộ ví" }}
            />
            <div>
              <Label>Hạn mức</Label>
              <Input
                value={limit}
                onChange={(e) => setLimit(formatVndInput(parseVndInput(e.target.value)))}
                inputMode="numeric"
                placeholder="3.000.000"
                className="mt-1 h-10 tabular-nums"
              />
            </div>
            <div>
              <Label>Áp dụng</Label>
              <Select value={recurring} onValueChange={setRecurring}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Lặp lại hàng tháng</SelectItem>
                  <SelectItem value="no">Chỉ tháng đang chọn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" type="submit">
              Lưu hạn mức
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
