import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  Copy,
  ReceiptText,
} from "lucide-react";
import { toast } from "sonner";
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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="mb-6 grid min-w-0 gap-3 border-b border-border/70 pb-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
    >
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-[1.85rem] [text-wrap:balance]">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </motion.header>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-2xl border border-border bg-card p-4 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow] duration-200 sm:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CopyButton({
  value,
  label = "Đã sao chép",
  className,
  ariaLabel = "Sao chép",
  children,
}: {
  value: string;
  label?: string;
  className?: string;
  ariaLabel?: string;
  children?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(label);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Không thể sao chép vào bộ nhớ tạm.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={ariaLabel}
      className={cn(
        "tactile inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/70 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:border-primary/35 hover:bg-accent hover:text-accent-foreground",
        className,
      )}
    >
      {copied ? (
        <Check className="size-3.5 text-income" strokeWidth={2} />
      ) : (
        <Copy className="size-3.5" strokeWidth={1.6} />
      )}
      {children}
    </button>
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
    const duration = 380;
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
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-48 flex-col items-center justify-center px-4 py-8 text-center"
    >
      <div className="mb-3 flex size-16 items-center justify-center rounded-2xl border border-primary/15 bg-accent/60">
        <SquirrelMascot mood="encourage" size={52} />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{text}</p>
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
    <button
      type="button"
      onClick={onClick}
      className="tactile group flex w-full items-center gap-3.5 rounded-xl px-2.5 py-3 text-left hover:bg-accent/45"
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl border transition-transform duration-150 group-hover:scale-105",
          tx.type === "income"
            ? "border-income/25 bg-accent text-income"
            : tx.type === "expense"
              ? "border-rose-500/20 bg-rose-500/10 text-expense"
              : "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
        )}
      >
        <Icon className="size-[18px]" strokeWidth={1.65} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <span className="truncate">{tx.note || category.name}</span>
          {tx.receipt && (
            <ReceiptText className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground tabular-nums">
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
          <TransferIcon className="size-3.5 opacity-80" strokeWidth={1.75} />
          {formatVnd(tx.type === "expense" ? -tx.amount : tx.amount, {
            sign: tx.type !== "transfer",
          })}
        </span>
      </span>
    </button>
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
