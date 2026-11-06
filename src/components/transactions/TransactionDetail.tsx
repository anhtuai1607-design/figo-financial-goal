import { Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getCategory } from "@/lib/categories";
import { formatDate, formatVnd } from "@/lib/format";
import type { Account, Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_LABEL = { income: "Khoản thu", expense: "Khoản chi", transfer: "Chuyển quỹ" } as const;

export function TransactionDetail({ tx, accounts, onClose, onEdit, onDelete }: { tx: Transaction | null; accounts: Account[]; onClose: () => void; onEdit: (tx: Transaction) => void; onDelete: (tx: Transaction) => void }) {
  const acc = (id?: string) => accounts.find((a) => a.id === id)?.name ?? "—";
  return (
    <Dialog open={!!tx} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-3xl">
        {tx && (() => {
          const cat = getCategory(tx.categoryId);
          const Icon = cat.icon;
          const rows: [string, string][] = [
            ["Loại", TYPE_LABEL[tx.type]],
            ["Danh mục", cat.name],
            [tx.type === "transfer" ? "Từ tài khoản" : "Tài khoản", acc(tx.accountId)],
            ...(tx.type === "transfer" ? [["Đến tài khoản", acc(tx.toAccountId)] as [string, string]] : []),
            ["Giờ", formatDate(tx.date, "HH:mm")],
            ["Ngày", formatDate(tx.date, "EEEE, dd/MM/yyyy")],
            ["Ghi chú", tx.note || "—"],
          ];
          return (
            <>
              <DialogHeader className="items-center text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary"><Icon className="size-6" /></span>
                <DialogTitle className={cn("text-2xl tabular", tx.type === "income" ? "text-income" : tx.type === "expense" ? "text-expense" : "")}>
                  {formatVnd(tx.type === "expense" ? -tx.amount : tx.amount, { sign: tx.type !== "transfer" })}
                </DialogTitle>
                <DialogDescription>{tx.note || cat.name}</DialogDescription>
              </DialogHeader>
              <dl className="divide-y rounded-2xl bg-muted/60 px-4 text-sm">
                {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium capitalize-first">{v}</dd></div>)}
              </dl>
              {tx.receipt && <img src={tx.receipt} alt="Ảnh hoá đơn" className="max-h-48 w-full rounded-2xl object-cover" />}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => onEdit(tx)}><Pencil /> Chỉnh sửa</Button>
                <Button variant="destructive" onClick={() => onDelete(tx)}><Trash2 /> Xoá</Button>
              </div>
            </>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}
