import { useId, useState, type PointerEvent } from "react";
import { Check, Copy, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { formatVnd } from "@/lib/format";
import type { Account } from "@/lib/types";

type Kind = "bank" | "cash" | "wallet" | "savings";
const BRANDS: [RegExp, [string, string]][] = [
  [/vietcombank|vcb/, ["#064E3B", "#022C22"]],
  [/techcombank|tcb/, ["#7F1D1D", "#3F0D12"]],
  [/bidv/, ["#1E3A5F", "#0F1E33"]],
  [/vietinbank|viettinbank|ctg/, ["#1E3A8A", "#0F1D47"]],
  [/mbbank|mb bank|^mb$|quan doi/, ["#1E293B", "#0F172A"]],
  [/acb/, ["#164E63", "#082F49"]],
  [/agribank/, ["#701A2B", "#3B0D16"]],
  [/tpbank|tp bank/, ["#3B2654", "#1D112B"]],
  [/vpbank|vp bank/, ["#065F46", "#022C22"]],
  [/sacombank|stb/, ["#1E3A6E", "#0E1C36"]],
  [/hdbank/, ["#7C2D12", "#431407"]],
  [/shb/, ["#78350F", "#451A03"]],
  [/ocb/, ["#064E3B", "#042F2E"]],
  [/vib/, ["#1E3A5F", "#111827"]],
  [/momo/, ["#6B1D4A", "#380D26"]],
  [/zalopay|zalo/, ["#1D4ED8", "#172554"]],
  [/viettel/, ["#7F1D1D", "#450A0A"]],
  [/shopeepay|shopee/, ["#9A3412", "#431407"]],
  [/vnpay/, ["#1E3A8A", "#1E1B4B"]],
];
const FALLBACK: Record<Kind, [string, string]> = {
  bank: ["#0F766E", "#064E3B"],
  cash: ["#B45309", "#78350F"],
  wallet: ["#4338CA", "#312E81"],
  savings: ["#0284C7", "#0369A1"],
};

/** Nhận diện kiểu thẻ và màu từ tên tài khoản (ví dụ "Vietcombank", "MoMo", "Tiền mặt"). */
export function brandOf(name: string, type: Account["type"]) {
  const n = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .trim();
  const hit = BRANDS.find(([re]) => re.test(n));
  const kind: Kind = /tien mat|bop|vi tien|cash/.test(n)
    ? "cash"
    : type === "cash"
      ? "cash"
      : type === "ewallet"
        ? "wallet"
        : type === "savings"
          ? "savings"
          : "bank";
  const [a, b] = hit && kind !== "cash" ? hit[1] : FALLBACK[kind];
  return { kind, bg: `linear-gradient(145deg, ${a}, ${b})` };
}

const TAG: Record<Kind, string> = {
  bank: "Thẻ ghi nợ",
  savings: "Tiết kiệm",
  wallet: "Ví điện tử",
  cash: "Tiền mặt",
};

function Chip() {
  const id = useId();
  return (
    <svg viewBox="0 0 44 34" className="h-7 w-9 opacity-90" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F3E5AB" />
          <stop offset="0.5" stopColor="#C8A24A" />
          <stop offset="1" stopColor="#EBD68E" />
        </linearGradient>
      </defs>
      <rect
        x="1"
        y="1"
        width="42"
        height="32"
        rx="5"
        fill={`url(#${id})`}
        stroke="#9A7828"
        strokeWidth="1"
      />
      <g stroke="#8A691E" strokeWidth="0.9" fill="none" opacity="0.65">
        <path d="M1 12h12c3 0 4 2 4 5s-1 5-4 5H1" />
        <path d="M43 12H31c-3 0-4 2-4 5s1 5 4 5h12" />
        <path d="M16 1v8M28 1v8M16 33v-8M28 33v-8" />
        <rect x="16" y="10" width="12" height="14" rx="2.5" />
      </g>
    </svg>
  );
}

function Contactless() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5 opacity-75"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M7 8.5c1.8 2.2 1.8 4.8 0 7" />
      <path d="M11 6c3.2 3.4 3.2 8.6 0 12" />
      <path d="M15 3.5c4.6 4.6 4.6 12.4 0 17" />
    </svg>
  );
}

export function AccountCard({ account, balance }: { account: Account; balance: number }) {
  const { kind, bg } = brandOf(account.name, account.type);
  const last4 = account.accountNumber ? account.accountNumber.slice(-4) : "";
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, active: false });
  const [copied, setCopied] = useState(false);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / Math.max(1, r.width);
    const py = (e.clientY - r.top) / Math.max(1, r.height);
    setTilt({
      rx: (0.5 - py) * 5,
      ry: (px - 0.5) * 7,
      gx: px * 100,
      gy: py * 100,
      active: true,
    });
  };
  const onLeave = () => setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, active: false });

  const copyBalance = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(formatVnd(balance));
      setCopied(true);
      toast.success(`Đã sao chép số dư ${account.name}`);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Không thể sao chép.");
    }
  };

  const cardStyle = {
    background: bg,
    transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(0)`,
    transition: tilt.active
      ? "transform 80ms linear"
      : "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
  };
  const glareStyle = {
    opacity: tilt.active ? 1 : 0,
    background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.14), transparent 60%)`,
    transition: "opacity 220ms ease",
  };

  const shell =
    "relative h-44 w-72 shrink-0 overflow-hidden rounded-2xl border border-white/15 text-white shadow-[0_14px_32px_-18px_rgba(9,9,11,0.55)] select-none will-change-transform";

  const copyBtn = (
    <button
      type="button"
      onClick={copyBalance}
      aria-label={`Sao chép số dư ${account.name}`}
      title="Sao chép số dư"
      className="flex size-7 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-300" strokeWidth={1.5} />
      ) : (
        <Copy className="size-3.5" strokeWidth={1.5} />
      )}
    </button>
  );

  if (kind === "cash") {
    return (
      <div className={shell} style={cardStyle} onPointerMove={onMove} onPointerLeave={onLeave}>
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 6px)",
          }}
        />
        <div className="pointer-events-none absolute inset-0" style={glareStyle} />
        <div className="relative flex h-full flex-col justify-between p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/60">
                {TAG.cash}
              </p>
              <p className="mt-1 truncate text-sm font-semibold tracking-tight text-white">
                {account.name}
              </p>
            </div>
            {copyBtn}
          </div>
          <div className="border-t border-white/12 pt-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/60">Số dư hiện tại</p>
            <p className="mt-0.5 truncate text-2xl font-semibold tracking-tight tabular-nums">
              {formatVnd(balance)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hasChip = kind === "bank" || kind === "savings";
  return (
    <div
      className={`${shell} flex flex-col justify-between p-5`}
      style={cardStyle}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(125deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 42%, rgba(255,255,255,0.04) 70%, rgba(255,255,255,0) 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0" style={glareStyle} />
      <div className="relative flex items-start justify-between gap-2">
        <p className="max-w-[70%] truncate text-xs font-semibold uppercase tracking-[0.14em] text-white/95">
          {account.name}
        </p>
        <div className="flex items-center gap-1.5">
          {copyBtn}
          {kind === "wallet" ? (
            <span className="flex size-7 items-center justify-center rounded-lg border border-white/15 bg-white/10">
              <Smartphone className="size-3.5" strokeWidth={1.5} />
            </span>
          ) : (
            <Contactless />
          )}
        </div>
      </div>
      {hasChip ? (
        <div className="relative flex items-center justify-between">
          <Chip />
          <span className="font-mono text-xs tracking-[0.18em] text-white/70 tabular-nums">
            •••• {last4 || "••••"}
          </span>
        </div>
      ) : (
        <div />
      )}
      <div className="relative flex items-end justify-between gap-3 border-t border-white/10 pt-2.5">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/60">Số dư</p>
          <p className="truncate text-xl font-semibold tracking-tight tabular-nums">
            {formatVnd(balance)}
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.12em] text-white/65">
          {TAG[kind]}
        </span>
      </div>
    </div>
  );
}
