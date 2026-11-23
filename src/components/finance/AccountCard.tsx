import { useId, useState, type PointerEvent } from "react";
import { Smartphone } from "lucide-react";
import { formatVnd } from "@/lib/format";
import type { Account } from "@/lib/types";

type Kind = "bank" | "cash" | "wallet" | "savings";
const BRANDS: [RegExp, [string, string]][] = [
  [/vietcombank|vcb/, ["#0b8f55", "#055a37"]],
  [/techcombank|tcb/, ["#ee2b33", "#8a1015"]],
  [/bidv/, ["#1f6fb5", "#0b3d75"]],
  [/vietinbank|viettinbank|ctg/, ["#1565c0", "#0a2a6e"]],
  [/mbbank|mb bank|^mb$|quan doi/, ["#2745c8", "#1b1f6b"]],
  [/acb/, ["#1c7ed6", "#0a3a78"]],
  [/agribank/, ["#b3203f", "#6a0f27"]],
  [/tpbank|tp bank/, ["#7a2a91", "#3d1052"]],
  [/vpbank|vp bank/, ["#12a05a", "#0a5a35"]],
  [/sacombank|stb/, ["#1b5cb0", "#0a2a5f"]],
  [/hdbank/, ["#e0262c", "#7d0d10"]],
  [/shb/, ["#f0702a", "#a23c08"]],
  [/ocb/, ["#0a9b5f", "#075c3a"]],
  [/vib/, ["#0a76c2", "#094070"]],
  [/momo/, ["#d11f8f", "#7e0e57"]],
  [/zalopay|zalo/, ["#1a7cff", "#0a3fa8"]],
  [/viettel/, ["#ec2230", "#8c0d17"]],
  [/shopeepay|shopee/, ["#f0502d", "#a02a0e"]],
  [/vnpay/, ["#1c5ab5", "#c4161c"]],
];
const FALLBACK: Record<Kind, [string, string]> = {
  bank: ["#334155", "#0f172a"],
  cash: ["#9a6a43", "#4e3220"],
  wallet: ["#7c3aed", "#4c1d95"],
  savings: ["#d4a017", "#8a5a00"],
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
  return { kind, bg: `linear-gradient(135deg, ${a}, ${b})` };
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
    <svg viewBox="0 0 44 34" className="h-8 w-10 drop-shadow-sm" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7e6a8" />
          <stop offset="0.5" stopColor="#d8b25a" />
          <stop offset="1" stopColor="#f3dc90" />
        </linearGradient>
      </defs>
      <rect
        x="1"
        y="1"
        width="42"
        height="32"
        rx="6"
        fill={`url(#${id})`}
        stroke="#a67f2d"
        strokeWidth="1"
      />
      <g stroke="#9b7425" strokeWidth="0.9" fill="none" opacity="0.7">
        <path d="M1 12h12c3 0 4 2 4 5s-1 5-4 5H1" />
        <path d="M43 12H31c-3 0-4 2-4 5s1 5 4 5h12" />
        <path d="M16 1v8M28 1v8M16 33v-8M28 33v-8" />
        <rect x="16" y="10" width="12" height="14" rx="3" />
      </g>
    </svg>
  );
}

function Contactless() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6 opacity-90"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / Math.max(1, r.width);
    const py = (e.clientY - r.top) / Math.max(1, r.height);
    setTilt({
      rx: (0.5 - py) * 7,
      ry: (px - 0.5) * 9,
      gx: px * 100,
      gy: py * 100,
      active: true,
    });
  };
  const onLeave = () => setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, active: false });

  const cardStyle = {
    background: bg,
    transform: `perspective(820px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(0)`,
    transition: tilt.active
      ? "transform 80ms linear"
      : "transform 260ms cubic-bezier(0.16, 1, 0.3, 1)",
  };
  const glareStyle = {
    opacity: tilt.active ? 1 : 0,
    background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.28), transparent 62%)`,
    transition: "opacity 200ms ease",
  };

  const shell =
    "relative h-44 w-72 shrink-0 overflow-hidden rounded-[1.15rem] text-white shadow-[0_14px_30px_-12px_rgba(0,0,0,0.48)] ring-1 ring-white/15 select-none will-change-transform";

  if (kind === "cash") {
    return (
      <div className={shell} style={cardStyle} onPointerMove={onMove} onPointerLeave={onLeave}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(45deg, rgba(0,0,0,0.06) 0 2px, transparent 2px 5px)",
          }}
        />
        <div className="pointer-events-none absolute inset-0" style={glareStyle} />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[5.5rem] rounded-b-[2.4rem] shadow-[0_6px_10px_-4px_rgba(0,0,0,0.45)]"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.26), rgba(0,0,0,0.14))" }}
        >
          <div className="absolute inset-x-3 bottom-2 top-2 rounded-b-[2rem] border-2 border-dashed border-amber-100/35" />
        </div>
        <div
          className="pointer-events-none absolute left-1/2 top-[4.4rem] size-7 -translate-x-1/2 rounded-full ring-2 ring-black/20"
          style={{
            background: "radial-gradient(circle at 35% 30%, #fde8a0, #c99a35 70%, #8a6416)",
          }}
        />
        <p className="absolute inset-x-0 top-4 truncate px-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-amber-50/90">
          {account.name}
        </p>
        <div className="absolute inset-x-5 bottom-4">
          <p className="text-[10px] uppercase tracking-wider text-white/70">Số dư</p>
          <p className="truncate text-2xl font-bold tabular-nums">{formatVnd(balance)}</p>
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
            "linear-gradient(115deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0) 38%, rgba(255,255,255,0.08) 64%, rgba(255,255,255,0) 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0" style={glareStyle} />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-3/5"
        style={{
          background: "linear-gradient(120deg, rgba(255,255,255,0), rgba(255,255,255,0.13))",
          clipPath: "polygon(38% 0, 100% 0, 100% 100%, 0 100%)",
        }}
      />
      <div className="pointer-events-none absolute -bottom-24 -left-12 size-56 rounded-full bg-black/10" />
      <div className="relative flex items-start justify-between">
        <p
          className={`max-w-[75%] truncate font-bold uppercase tracking-[0.14em] ${kind === "wallet" ? "text-lg" : "text-sm"}`}
        >
          {account.name}
        </p>
        {kind === "wallet" ? (
          <span className="flex size-7 items-center justify-center rounded-lg bg-white/20">
            <Smartphone className="size-4" />
          </span>
        ) : (
          <Contactless />
        )}
      </div>
      {hasChip ? (
        <div className="relative">
          <Chip />
        </div>
      ) : (
        <div />
      )}
      {hasChip ? (
        <p className="relative font-mono text-[15px] tracking-[0.2em] [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
          •••• •••• •••• {last4 || "••••"}
        </p>
      ) : (
        <div />
      )}
      <div className="relative flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-white/70">Số dư</p>
          <p className="truncate text-xl font-bold tabular-nums">{formatVnd(balance)}</p>
        </div>
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-white/80">
          {TAG[kind]}
        </span>
      </div>
    </div>
  );
}
