import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Download, FileSpreadsheet, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { TransactionDetail } from "@/components/transactions/TransactionDetail";
import type { Transaction } from "@/lib/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EmptyState,
  PageHeader,
  Panel,
  TransactionRow,
  metaFor,
} from "@/components/finance/Common";
import { categoriesByType, getCategory } from "@/lib/categories";
import { exportCsv, exportXlsx } from "@/lib/export";
import { monthKey } from "@/lib/format";
import { useFiGo } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({
    meta: metaFor(
      "Sổ giao dịch",
      "Tìm kiếm, lọc, thêm và xuất toàn bộ giao dịch tài chính của bạn.",
    ),
  }),
  component: TransactionsPage,
});

const TYPE_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "expense", label: "Chi" },
  { value: "income", label: "Thu" },
  { value: "transfer", label: "Chuyển quỹ" },
] as const;

function TransactionsPage() {
  const txs = useFiGo((s) => s.transactions);
  const accounts = useFiGo((s) => s.accounts);
  const remove = useFiGo((s) => s.removeTransaction);
  const openTx = useUI((s) => s.openTxSheet);

  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [month, setMonth] = useState(monthKey());

  const customCats = useFiGo((s) => s.customCategories);
  const allCategories = useMemo(
    () => [
      ...categoriesByType("expense"),
      ...categoriesByType("income"),
      ...categoriesByType("transfer"),
    ],
    [customCats],
  );

  const filtered = useMemo(
    () =>
      txs.filter((tx) => {
        const q = search.toLocaleLowerCase("vi");
        let txMonth = "";
        try {
          txMonth = monthKey(tx.date);
        } catch {
          txMonth = tx.date.slice(0, 7);
        }
        return (
          (!q ||
            tx.note?.toLocaleLowerCase("vi").includes(q) ||
            getCategory(tx.categoryId).name.toLocaleLowerCase("vi").includes(q)) &&
          (type === "all" || tx.type === type) &&
          (category === "all" || tx.categoryId === category) &&
          (!month || txMonth === month)
        );
      }),
    [txs, search, type, category, month, customCats],
  );

  const [detail, setDetail] = useState<Transaction | null>(null);
  const deleteTx = (id: string) => {
    if (!window.confirm("Xoá giao dịch này?")) return false;
    remove(id);
    toast.success("Đã xoá giao dịch.");
    return true;
  };

  return (
    <div>
      <PageHeader
        title="Sổ thu chi"
        subtitle={`${filtered.length} giao dịch phù hợp`}
        action={
          <Button onClick={() => openTx()}>
            <Plus /> Ghi giao dịch
          </Button>
        }
      />

      <Panel className="mb-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="grid w-full grid-cols-4 rounded-lg border border-border bg-muted p-0.5 text-xs font-medium sm:w-auto">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setType(tab.value)}
                className={cn(
                  "tactile rounded-md px-3 py-1.5 transition-colors",
                  type === tab.value
                    ? "bg-card font-semibold text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exportXlsx(filtered, accounts);
                toast.success("Đang tải báo cáo Excel.");
              }}
              title="Xuất Excel"
            >
              <FileSpreadsheet /> Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exportCsv(filtered, accounts);
                toast.success("Đang tải báo cáo CSV.");
              }}
              title="Xuất CSV"
            >
              <Download /> CSV
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative min-w-0">
            <Search
              className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground"
              strokeWidth={1.5}
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm ghi chú, danh mục..."
              className="pl-9 pr-8"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Xoá từ khoá tìm kiếm"
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" strokeWidth={1.5} />
              </button>
            )}
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả danh mục</SelectItem>
              {allCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            aria-label="Chọn tháng"
            className="tabular-nums"
          />
        </div>
      </Panel>

      <Panel className="p-2 sm:p-3">
        {filtered.length ? (
          <div className="divide-y divide-border/60">
            {filtered.map((tx, idx) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.015, 0.2), duration: 0.18 }}
                className="group flex items-center"
              >
                <div className="min-w-0 flex-1">
                  <TransactionRow
                    tx={tx}
                    account={accounts.find((a) => a.id === tx.accountId)?.name}
                    onClick={() => setDetail(tx)}
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => openTx({ tx })}
                  className="shrink-0 text-muted-foreground hover:text-primary"
                  aria-label="Sửa giao dịch"
                >
                  <Pencil />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteTx(tx.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Xoá giao dịch"
                >
                  <Trash2 />
                </Button>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Không tìm thấy giao dịch"
            text="Thử thay đổi bộ lọc hoặc ghi nhận một giao dịch mới."
            action={
              <Button onClick={() => openTx()}>
                <Plus /> Ghi giao dịch
              </Button>
            }
          />
        )}
      </Panel>

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
