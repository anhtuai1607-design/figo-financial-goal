import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Moon, Pencil, Plus, Sun, Trash2, Wallet } from "lucide-react";
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
import { CopyButton, PageHeader, Panel, metaFor } from "@/components/finance/Common";
import { EmailReminderCard } from "@/components/finance/EmailReminderCard";
import { AccountCard, brandOf } from "@/components/finance/AccountCard";
import { accountBalance } from "@/lib/finance";
import { formatVnd, formatVndInput, parseVndInput } from "@/lib/format";
import { useFiGo } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { useUI } from "@/lib/ui-store";
import type { Account, AccountType } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: metaFor(
      "Tài khoản & Cài đặt",
      "Quản lý tài khoản tiền, tên hiển thị, giao diện và dữ liệu FiGo.",
    ),
  }),
  component: SettingsPage,
});

const TYPES: { value: AccountType; label: string }[] = [
  { value: "cash", label: "Tiền mặt" },
  { value: "bank", label: "Ngân hàng" },
  { value: "savings", label: "Tiết kiệm" },
  { value: "ewallet", label: "Ví điện tử" },
];

function SettingsPage() {
  const name = useFiGo((s) => s.userName);
  const setName = useFiGo((s) => s.setUserName);
  const accounts = useFiGo((s) => s.accounts);
  const txs = useFiGo((s) => s.transactions);
  const add = useFiGo((s) => s.addAccount);
  const update = useFiGo((s) => s.updateAccount);
  const remove = useFiGo((s) => s.removeAccount);
  const { theme, setTheme } = useTheme();
  const triggerMascot = useUI((s) => s.triggerMascot);
  const [displayName, setDisplayName] = useState(name);
  useEffect(() => {
    setDisplayName(name);
  }, [name]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [accountName, setAccountName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [balance, setBalance] = useState("");
  const show = (a?: Account) => {
    setEditing(a ?? null);
    setAccountName(a?.name ?? "");
    setType(a?.type ?? "bank");
    setBalance(a ? formatVndInput(a.initialBalance) : "");
    setOpen(true);
  };
  const submitAccount = (e: FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) {
      toast.error("Vui lòng nhập tên tài khoản.");
      return;
    }
    const data = {
      name: accountName.trim(),
      type,
      initialBalance: parseVndInput(balance),
      color: editing?.color ?? String((accounts.length % 5) + 1),
    };
    if (editing) update(editing.id, data);
    else add(data);
    toast.success(editing ? "Đã cập nhật tài khoản." : "Đã thêm tài khoản.");
    triggerMascot({
      mood: editing ? "happy" : "celebrate",
      message: editing
        ? `Đã cập nhật nguồn tiền "${data.name}".`
        : `Nguồn tiền "${data.name}" đã sẵn sàng.`,
    });
    setOpen(false);
  };
  return (
    <div>
      <PageHeader title="Tài khoản & Cài đặt" subtitle="Quản lý nguồn tiền và tùy chỉnh hiển thị" />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <EmailReminderCard />
          <Panel>
            <div className="mb-4 flex items-center justify-between border-b border-border/70 pb-3">
              <div>
                <h2 className="text-base font-semibold">Tài khoản tiền</h2>
                <p className="text-xs text-muted-foreground">
                  Số dư được tính từ số dư đầu kỳ và các giao dịch
                </p>
              </div>
              <Button size="sm" onClick={() => show()}>
                <Plus /> Thêm
              </Button>
            </div>
            <div className="divide-y divide-border/70">
              {accounts.map((a) => {
                const bal = accountBalance(a, txs);
                return (
                  <div key={a.id} className="flex items-center gap-3 py-3 first:pt-1 last:pb-1">
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white"
                      style={{ background: brandOf(a.name, a.type).bg }}
                    >
                      <Wallet className="size-[18px]" strokeWidth={1.5} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{a.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {TYPES.find((t) => t.value === a.type)?.label}
                      </p>
                    </div>
                    <strong className="hidden text-sm font-semibold tabular-nums sm:block">
                      {formatVnd(bal)}
                    </strong>
                    <CopyButton
                      value={formatVnd(bal)}
                      label={`Đã sao chép số dư ${a.name}`}
                      ariaLabel={`Sao chép số dư ${a.name}`}
                      className="hidden sm:inline-flex"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => show(a)}
                      aria-label="Sửa tài khoản"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="hover:text-destructive"
                      onClick={() => {
                        if (!confirm("Xoá tài khoản sẽ xoá các giao dịch liên quan. Tiếp tục?"))
                          return;
                        remove(a.id);
                        toast.success("Đã xoá tài khoản.");
                      }}
                      aria-label="Xoá tài khoản"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                );
              })}
              {accounts.length === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center">
                  <p className="text-sm font-semibold">Chưa có nguồn tiền nào</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Thêm ví tiền mặt, tài khoản ngân hàng hoặc ví điện tử đầu tiên và nhập số dư
                    thực tế (hoặc để 0 đ).
                  </p>
                </div>
              )}
            </div>
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel>
            <h2 className="text-base font-semibold">Thông tin cá nhân</h2>
            <Label htmlFor="display-name" className="mt-4 block">
              Tên hiển thị
            </Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <Button
                onClick={() => {
                  setName(displayName.trim() || "bạn");
                  toast.success("Đã lưu tên hiển thị.");
                }}
              >
                Lưu
              </Button>
            </div>
          </Panel>
          <Panel>
            <h2 className="text-base font-semibold">Giao diện</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Chuyển đổi giữa Giao diện Sáng tươi mới và Giao diện Tối dịu mắt
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                onClick={() => setTheme("light")}
              >
                <Sun /> Sáng
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                onClick={() => setTheme("dark")}
              >
                <Moon /> Tối
              </Button>
            </div>
          </Panel>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] rounded-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa tài khoản" : "Thêm tài khoản"}</DialogTitle>
            <DialogDescription>
              Nhập số dư đầu kỳ trước khi bắt đầu ghi giao dịch.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitAccount} className="space-y-4">
            <div className="flex justify-center">
              <AccountCard
                account={{
                  id: "preview",
                  name: accountName.trim() || "Tên tài khoản",
                  type,
                  initialBalance: parseVndInput(balance),
                  color: "1",
                }}
                balance={parseVndInput(balance)}
              />
            </div>
            <div>
              <Label>Tên tài khoản</Label>
              <Input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Ví dụ: Vietcombank"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Loại tài khoản</Label>
              <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Số dư đầu kỳ</Label>
              <Input
                value={balance}
                onChange={(e) => setBalance(formatVndInput(parseVndInput(e.target.value)))}
                inputMode="numeric"
                className="mt-1 tabular-nums"
              />
            </div>
            <Button className="w-full" type="submit">
              Lưu tài khoản
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
