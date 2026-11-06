import type { ReactNode } from "react";
import { motion } from "motion/react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Inbox, ReceiptText } from "lucide-react";
import type { Transaction } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { formatDateTime, formatVnd } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <header className="mb-6 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-extrabold text-foreground sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </header>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("min-w-0 rounded-lg border bg-card p-4 shadow-sm sm:p-5", className)}>{children}</section>;
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center px-4 text-center">
      <span className="mb-3 flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Inbox className="size-5" /></span>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function TransactionRow({ tx, account, onClick }: { tx: Transaction; account?: string | undefined; onClick?: (() => void) | undefined }) {
  const category = getCategory(tx.categoryId);
  const Icon = category.icon;
  const TransferIcon = tx.type === "income" ? ArrowDownLeft : tx.type === "expense" ? ArrowUpRight : ArrowLeftRight;
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-muted/70"
    >
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tx.type === "income" ? "bg-accent text-income" : tx.type === "expense" ? "bg-secondary text-expense" : "bg-muted text-primary")}>
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-medium"><span className="truncate">{tx.note || category.name}</span>{tx.receipt && <ReceiptText className="size-3.5 shrink-0 text-muted-foreground" />}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{category.name} · {account || "Tài khoản"} · {formatDateTime(tx.date)}</span>
      </span>
      <span className={cn("shrink-0 text-right text-sm font-bold tabular", tx.type === "income" ? "text-income" : tx.type === "expense" ? "text-expense" : "text-foreground")}>
        <span className="flex items-center justify-end gap-1"><TransferIcon className="size-3.5" />{formatVnd(tx.type === "expense" ? -tx.amount : tx.amount, { sign: tx.type !== "transfer" })}</span>
      </span>
    </motion.button>
  );
}

export const metaFor = (title: string, description: string) => [
  { title: `${title} — FiGo` },
  { name: "description", content: description },
  { property: "og:title", content: `${title} — FiGo` },
  { property: "og:description", content: description },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary" },
];