import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ReceiptText } from "lucide-react";
import type { Transaction } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { formatDateTime, formatVnd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SquirrelMascot } from "@/components/mascot/SquirrelMascot";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
    >
      <div className="min-w-0">
        <h1 className="break-words text-[1.75rem] font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl [text-wrap:balance]">
          {title}
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </motion.header>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-[1.5rem] border border-border/65 bg-card/95 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-20px_rgba(15,23,42,0.22)] transition-[border-color,box-shadow] duration-200 hover:border-border sm:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function AnimatedVnd({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    prevRef.current = value;
    if (start === end) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(end);
      return;
    }

    let raf = 0;
    const duration = 420;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className={cn("tabular-nums", className)}>{formatVnd(display)}</span>;
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="flex min-h-48 flex-col items-center justify-center px-4 py-6 text-center"
    >
      <SquirrelMascot mood="encourage" size={76} className="mb-2" />
      <p className="font-bold text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}

export function TransactionRow({
  tx,
  account,
  onClick,
}: {
  tx: Transaction;
  account?: string | undefined;
  onClick?: (() => void) | undefined;
}) {
  const category = getCategory(tx.categoryId);
  const Icon = category.icon;
  const TransferIcon =
    tx.type === "income" ? ArrowDownLeft : tx.type === "expense" ? ArrowUpRight : ArrowLeftRight;
  return (
    <motion.button
      type="button"
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.14 }}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-3 text-left transition-colors hover:bg-muted/70"
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-2xl transition-transform",
          tx.type === "income"
            ? "bg-accent text-income"
            : tx.type === "expense"
              ? "bg-secondary text-expense"
              : "bg-muted text-primary",
        )}
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="truncate">{tx.note || category.name}</span>
          {tx.receipt && <ReceiptText className="size-3.5 shrink-0 text-muted-foreground" />}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {category.name} · {account || "Tài khoản"} · {formatDateTime(tx.date)}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 text-right text-sm font-bold tabular-nums",
          tx.type === "income"
            ? "text-income"
            : tx.type === "expense"
              ? "text-expense"
              : "text-foreground",
        )}
      >
        <span className="flex items-center justify-end gap-1">
          <TransferIcon className="size-3.5" />
          {formatVnd(tx.type === "expense" ? -tx.amount : tx.amount, {
            sign: tx.type !== "transfer",
          })}
        </span>
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
