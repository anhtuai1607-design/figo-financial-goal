import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { format, getDaysInMonth } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Bell,
  BellOff,
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { CategoryPicker } from "@/components/finance/CategoryPicker";
import { PageHeader, Panel, metaFor } from "@/components/finance/Common";
import { getCategory } from "@/lib/categories";
import { accountBalance, billStatus } from "@/lib/finance";
import { formatVnd, formatVndInput, parseVndInput } from "@/lib/format";
import { useFiGo } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import type { Bill } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/bills")({
  head: () => ({
    meta: metaFor(
      "Hoá đơn định kỳ",
      "Theo dõi ngày đến hạn và đánh dấu các khoản thanh toán hàng tháng.",
    ),
  }),
  component: BillsPage,
});

const WEEK = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const mkOf = (d: Date) => format(d, "yyyy-MM");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function BillsPage() {
  const bills = useFiGo((s) => s.bills);
  const accounts = useFiGo((s) => s.accounts);
  const txs = useFiGo((s) => s.transactions);
  const add = useFiGo((s) => s.addBill);
  const update = useFiGo((s) => s.updateBill);
  const remove = useFiGo((s) => s.removeBill);
  const toggle = useFiGo((s) => s.toggleBillPaid);
  const triggerMascot = useUI((s) => s.triggerMascot);

  const today = new Date();
  const nowKey = mkOf(today);
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);
  const [picker, setPicker] = useState(false);
  const [pickYear, setPickYear] = useState(today.getFullYear());

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("dien_nuoc");
  const [account, setAccount] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [reminder, setReminder] = useState(true);

  const mk = mkOf(cursor);
  const dim = getDaysInMonth(cursor);
  const lead = (cursor.getDay() + 6) % 7;
  const visible = (b: Bill) => !b.startMonth || mk >= b.startMonth;
  const onDay = (day: number) => bills.filter((b) => visible(b) && Math.min(b.dueDay, dim) === day);
  const selDay =
    selected.getFullYear() === cursor.getFullYear() && selected.getMonth() === cursor.getMonth()
      ? selected.getDate()
      : null;
  const dayBills = selDay ? onDay(selDay) : [];

  const goTo = (d: Date) => {
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    setCursor(first);
    setSelected(mkOf(first) === nowKey ? today : first);
  };
  const shift = (n: number) => goTo(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));

  const show = (bill?: Bill) => {
    setEditing(bill ?? null);
    setName(bill?.name ?? "");
    setAmount(bill ? formatVndInput(bill.amount) : "");
    setCategory(bill?.categoryId ?? "dien_nuoc");
    setAccount(bill?.accountId ?? accounts[0]?.id ?? "");
    setDueDay(String(bill?.dueDay ?? selected.getDate()));
    setReminder(bill?.reminder ?? true);
    setOpen(true);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = parseVndInput(amount);
    if (!name.trim() || !value || !account) {
      toast.error("Vui lòng điền đủ thông tin.");
      return;
    }
    const data = {
      name: name.trim(),
      amount: value,
      categoryId: category,
      accountId: account,
      dueDay: Math.min(31, Math.max(1, Number(dueDay))),
      reminder,
    };
    if (editing) update(editing.id, data);
    else add({ ...data, startMonth: mkOf(selected) });
    toast.success(editing ? "Đã cập nhật hoá đơn." : "Đã thêm hoá đơn.");
    triggerMascot({
      mood: "happy",
      message: editing
        ? `Đã cập nhật lịch hoá đơn "${data.name}".`
        : `Đã thêm lịch "${data.name}" vào ngày ${data.dueDay} hàng tháng.`,
    });
    setOpen(false);
  };
  const pay = (bill: Bill, key: string, paid: boolean) => {
    if (!paid) {
      if (key > nowKey) {
        toast.error("Chưa đến kỳ thanh toán này.");
        return;
      }
      const acc = accounts.find((a) => a.id === bill.accountId);
      if (acc) {
        const bal = accountBalance(acc, txs);
        if (bill.amount > bal) {
          toast.error(`Số dư ${acc.name} không đủ (còn ${formatVnd(bal)}).`);
          return;
        }
      }
    }
    const nowPaid = toggle(bill.id, key, !paid);
    toast.success(
      nowPaid
        ? "Đã thanh toán và ghi nhận khoản chi."
        : "Đã bỏ đánh dấu và hoàn lại số tiền đã trừ.",
    );
    if (nowPaid)
      triggerMascot({
        mood: "celebrate",
        message: `Đã thanh toán "${bill.name}" (${formatVnd(bill.amount)}).`,
      });
  };
  const del = (bill: Bill) => {
    if (!window.confirm(`Xoá hoá đơn "${bill.name}"? Lịch nhắc của khoản này sẽ không còn.`))
      return;
    remove(bill.id);
    toast.success("Đã xoá hoá đơn.");
  };

  const row = (bill: Bill) => {
    const st = billStatus(bill, mk);
    const Icon = getCategory(bill.categoryId).icon;
    return (
      <div key={bill.id} className="py-3.5 first:pt-0 last:pb-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => pay(bill, mk, st.paid)}
            aria-label={st.paid ? "Bỏ đánh dấu đã trả" : "Ghi đã trả"}
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md border transition active:scale-95",
              st.paid
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/50",
            )}
          >
            {st.paid && <Check className="size-3.5" strokeWidth={2.5} />}
          </button>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate text-sm font-semibold",
                st.paid && "text-muted-foreground line-through",
              )}
            >
              {bill.name}
            </p>
            <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground tabular-nums">
              <Icon className="size-3.5 shrink-0" strokeWidth={1.5} />
              Ngày {bill.dueDay} hàng tháng · {accounts.find((a) => a.id === bill.accountId)?.name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums">{formatVnd(bill.amount)}</p>
            <p
              className={cn(
                "text-xs font-medium tabular-nums",
                st.paid
                  ? "text-income"
                  : st.overdue
                    ? "text-destructive"
                    : st.daysLeft <= 3
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-muted-foreground",
              )}
            >
              {st.paid
                ? "Đã thanh toán"
                : st.overdue
                  ? `Quá hạn ${-st.daysLeft} ngày`
                  : st.daysLeft === 0
                    ? "Đến hạn hôm nay"
                    : `Còn ${st.daysLeft} ngày`}
            </p>
          </div>
        </div>
        <div className="mt-1.5 flex justify-end gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={() => update(bill.id, { reminder: !bill.reminder })}
            aria-label="Bật tắt nhắc nhở"
          >
            {bill.reminder ? <Bell className="size-4" /> : <BellOff className="size-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={() => show(bill)}
            aria-label="Sửa hoá đơn"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 hover:text-destructive"
            onClick={() => del(bill)}
            aria-label="Xoá hoá đơn"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="Hóa đơn định kỳ"
        subtitle="Chọn một ngày trên lịch để thêm hoặc đối chiếu khoản thanh toán"
        action={
          <Button onClick={() => show()}>
            <Plus /> Thêm hóa đơn
          </Button>
        }
      />

      <Panel className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setPicker(!picker);
              setPickYear(cursor.getFullYear());
            }}
            className="flex items-center gap-1.5 text-base font-semibold"
          >
            {cap(format(cursor, "MMMM, yyyy", { locale: vi }))}
            <ChevronRight
              className={cn("size-4 text-muted-foreground transition", picker && "rotate-90")}
              strokeWidth={1.5}
            />
          </button>
          <div className="flex items-center gap-1">
            {mk !== nowKey && (
              <button
                type="button"
                onClick={() => goTo(today)}
                className="tactile mr-1 rounded-lg border border-primary/25 bg-accent px-2.5 py-1 text-xs font-medium text-primary"
              >
                Hôm nay
              </button>
            )}
            <Button
              size="icon"
              variant="outline"
              className="size-8 rounded-lg"
              onClick={() => shift(-1)}
              aria-label="Tháng trước"
            >
              <ChevronLeft />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="size-8 rounded-lg"
              onClick={() => shift(1)}
              aria-label="Tháng sau"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>

        {picker ? (
          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <Button
                size="icon"
                variant="outline"
                className="size-8 rounded-lg"
                onClick={() => setPickYear(pickYear - 1)}
                aria-label="Năm trước"
              >
                <ChevronLeft />
              </Button>
              <span className="font-semibold tabular-nums">{pickYear}</span>
              <Button
                size="icon"
                variant="outline"
                className="size-8 rounded-lg"
                onClick={() => setPickYear(pickYear + 1)}
                aria-label="Năm sau"
              >
                <ChevronRight />
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 12 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    goTo(new Date(pickYear, i, 1));
                    setPicker(false);
                  }}
                  className={cn(
                    "tactile rounded-lg border py-2 text-sm font-medium transition-colors",
                    pickYear === cursor.getFullYear() && i === cursor.getMonth()
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary/35 hover:bg-accent/50",
                  )}
                >
                  Th{i + 1}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 text-center text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
              {WEEK.map((d) => (
                <span key={d} className="py-1.5">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {Array.from({ length: lead }, (_, i) => (
                <div key={`b${i}`} />
              ))}
              {Array.from({ length: dim }, (_, i) => i + 1).map((day) => {
                const list = onDay(day);
                const isToday = mk === nowKey && day === today.getDate();
                const isSel = day === selDay;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      setSelected(new Date(cursor.getFullYear(), cursor.getMonth(), day))
                    }
                    className="tactile relative mx-auto flex h-11 w-11 flex-col items-center justify-center"
                  >
                    <span
                      className={cn(
                        "flex size-9 items-center justify-center rounded-lg text-sm tabular-nums transition-colors",
                        isToday
                          ? "bg-primary font-semibold text-primary-foreground shadow-xs"
                          : isSel
                            ? "border border-primary/40 bg-accent font-semibold text-primary"
                            : "hover:bg-accent/55",
                      )}
                    >
                      {day}
                    </span>
                    {list.length > 0 && (
                      <span className="absolute bottom-0.5 flex gap-0.5">
                        {list.slice(0, 3).map((b) => (
                          <span
                            key={b.id}
                            className={cn(
                              "size-1 rounded-full",
                              b.paidMonths.includes(mk) ? "bg-income" : "bg-amber-600",
                            )}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </Panel>

      <Panel className="mb-4">
        <div className="mb-3 flex items-center justify-between border-b border-border/70 pb-3">
          <div>
            <p className="text-base font-semibold">
              {cap(format(selected, "EEEE, d 'tháng' M", { locale: vi }))}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {dayBills.length ? `${dayBills.length} khoản đến hạn` : "Chưa có hóa đơn"}
            </p>
          </div>
          <Button size="sm" onClick={() => show()}>
            <Plus /> Thêm
          </Button>
        </div>
        {dayBills.length ? (
          <div className="divide-y divide-border/70">{dayBills.map(row)}</div>
        ) : (
          <p className="rounded-xl border border-dashed border-border bg-muted/30 py-6 text-center text-xs text-muted-foreground">
            Ngày này chưa có khoản nào. Bấm Thêm để thiết lập cho ngày {selected.getDate()}.
          </p>
        )}
      </Panel>

      {bills.length > 0 && (
        <Panel>
          <p className="mb-3 border-b border-border/70 pb-3 text-base font-semibold">
            Tất cả hóa đơn định kỳ
          </p>
          <div className="divide-y divide-border/70">
            {[...bills].sort((a, b) => a.dueDay - b.dueDay).map(row)}
          </div>
        </Panel>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa hoá đơn" : "Thêm hoá đơn"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Lịch thanh toán lặp lại hàng tháng."
                : `Lặp lại hàng tháng, bắt đầu từ ${format(selected, "d/M/yyyy")}.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Tên khoản thanh toán</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Internet FPT"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Số tiền</Label>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(formatVndInput(parseVndInput(e.target.value)))}
                  inputMode="numeric"
                  className="mt-1 tabular-nums"
                />
              </div>
              <div>
                <Label>Ngày đến hạn</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  className="mt-1 tabular-nums"
                />
              </div>
            </div>
            <CategoryPicker type="expense" value={category} onChange={setCategory} />
            <div>
              <Label>Tài khoản thanh toán</Label>
              <Select value={account} onValueChange={setAccount}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3">
              <div>
                <p className="text-sm font-medium">Nhắc khi gần đến hạn</p>
                <p className="text-xs text-muted-foreground">Hiển thị cảnh báo trước 3 ngày</p>
              </div>
              <Switch checked={reminder} onCheckedChange={setReminder} />
            </div>
            <Button className="w-full" type="submit">
              Lưu hoá đơn
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
