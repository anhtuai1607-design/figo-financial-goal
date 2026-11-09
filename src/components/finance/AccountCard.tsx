import { Nfc, PiggyBank, Smartphone, Wallet } from "lucide-react";
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
  const n = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase().trim();
  const hit = BRANDS.find(([re]) => re.test(n));
  const kind: Kind = /tien mat|bop|vi tien|cash/.test(n) ? "cash" : type === "cash" ? "cash" : type === "ewallet" ? "wallet" : type === "savings" ? "savings" : "bank";
  const [a, b] = hit && kind !== "cash" ? hit[1] : FALLBACK[kind];
  return { kind, bg: `linear-gradient(135deg, ${a}, ${b})` };
}

export function AccountCard({ account, balance }: { account: Account; balance: number }) {
  const { kind, bg } = brandOf(account.name, account.type);
  const Icon = kind === "cash" ? Wallet : kind === "wallet" ? Smartphone : kind === "savings" ? PiggyBank : Nfc;
  return (
    <div className="relative h-40 w-64 shrink-0 overflow-hidden rounded-2xl p-4 text-white shadow-lg" style={{ background: bg }}>
      <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-12 -left-6 size-36 rounded-full bg-white/5" />
      {kind === "cash" && <div className="pointer-events-none absolute inset-2 rounded-xl border-2 border-dashed border-white/30" />}
      {kind === "cash" && <Wallet className="pointer-events-none absolute -right-2 bottom-3 size-20 text-white/10" />}
      <div className="relative flex items-start justify-between">
        <p className="max-w-[80%] truncate text-sm font-bold tracking-wide">{account.name}</p>
        <Icon className="size-5 opacity-90" />
      </div>
      {(kind === "bank" || kind === "savings") && <div className="relative mt-3 h-6 w-9 rounded-md bg-gradient-to-br from-amber-200 to-amber-400 shadow-inner" />}
      <div className="absolute inset-x-4 bottom-4">
        <p className="text-[10px] uppercase tracking-wider text-white/70">Số dư</p>
        <div className="flex items-end justify-between gap-2">
          <p className="truncate text-xl font-extrabold tabular-nums">{formatVnd(balance)}</p>
          {account.accountNumber && <span className="text-[11px] text-white/80">•••• {account.accountNumber.slice(-4)}</span>}
        </div>
      </div>
    </div>
  );
}
