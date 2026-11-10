import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, Check, Image, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { categoriesByType } from "@/lib/categories";
import { CategoryPicker } from "@/components/finance/CategoryPicker";
import { cn } from "@/lib/utils";
import { accountBalance, activeBudgets, budgetProgress } from "@/lib/finance";
import { formatVnd, formatVndInput, monthKey, parseVndInput, uid } from "@/lib/format";
import { useFiGo } from "@/lib/store";
import type { TransactionType } from "@/lib/types";
import { useUI } from "@/lib/ui-store";

// Đổi một thời điểm sang chuỗi "YYYY-MM-DDTHH:mm" theo GIỜ ĐỊA PHƯƠNG của máy (ô chọn ngày giờ cần dạng này).
const toLocalInput = (value: Date | string) => {
  const d = new Date(value);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const nowLocal = () => toLocalInput(new Date());

async function compressImage(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = document.createElement("img");
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const max = 1280;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.78);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function TransactionSheet() {
  const open = useUI((s) => s.txSheetOpen);
  const editing = useUI((s) => s.editingTx);
  const preset = useUI((s) => s.presetType);
  const close = useUI((s) => s.closeTxSheet);
  const accounts = useFiGo((s) => s.accounts);
  const txs = useFiGo((s) => s.transactions);
  const budgets = useFiGo((s) => s.budgets);
  const add = useFiGo((s) => s.addTransaction);
  const update = useFiGo((s) => s.updateTransaction);
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("an_uong");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [date, setDate] = useState(nowLocal());
  const [note, setNote] = useState("");
  const [receipt, setReceipt] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (!open) return;
    const nextType = editing?.type ?? preset;
    setType(nextType);
    setAmount(editing ? formatVndInput(editing.amount) : "");
    setCategoryId(editing?.categoryId ?? categoriesByType(nextType)[0]?.id ?? "an_uong");
    setAccountId(editing?.accountId ?? accounts[0]?.id ?? "");
    setToAccountId(editing?.toAccountId ?? accounts[1]?.id ?? accounts[0]?.id ?? "");
    setDate(editing ? toLocalInput(editing.date) : nowLocal());
    setNote(editing?.note ?? "");
    setReceipt(editing?.receipt);
  }, [open, editing, preset, accounts]);

  const changeType = (next: string) => {
    const valid = next as TransactionType;
    setType(valid);
    setCategoryId(categoriesByType(valid)[0]?.id ?? "transfer");
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn tệp ảnh.");
      return;
    }
    try {
      setReceipt(await compressImage(file));
      toast.success("Đã thêm ảnh hoá đơn.");
    } catch {
      toast.error("Không thể xử lý ảnh này.");
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = parseVndInput(amount);
    if (value <= 0) {
      toast.error("Số tiền phải lớn hơn 0 đ.");
      return;
    }
    if (!accountId) {
      toast.error("Vui lòng chọn tài khoản.");
      return;
    }
    if (type === "transfer" && (!toAccountId || toAccountId === accountId)) {
      toast.error("Tài khoản nhận phải khác tài khoản nguồn.");
      return;
    }
    if (type === "expense" || type === "transfer") {
      const acc = accounts.find((a) => a.id === accountId);
      if (acc) {
        // Khi sửa giao dịch cũ, không tính giao dịch đó vào số dư hiện có.
        const others = editing ? txs.filter((t) => t.id !== editing.id) : txs;
        const balance = accountBalance(acc, others);
        if (value > balance) {
          toast.error(`Số dư ${acc.name} không đủ: còn ${formatVnd(balance)}, không thể ${type === "expense" ? "chi" : "chuyển"} ${formatVnd(value)}.`);
          return;
        }
      }
    }
    const cleanNote = note.trim();
    const data = { type, amount: value, categoryId: type === "transfer" ? "transfer" : categoryId, accountId, ...(type === "transfer" && { toAccountId }), date: new Date(date).toISOString(), ...(cleanNote && { note: cleanNote }), ...(receipt && { receipt }) };
    if (editing) {
      update(editing.id, data);
      toast.success("Đã cập nhật giao dịch.");
    } else {
      add(data);
      toast.success("Đã thêm giao dịch.");
      if (type === "expense") {
        const previewTxs = [{ ...data, id: "preview", createdAt: data.date }, ...txs];
        for (const budget of activeBudgets(budgets, monthKey(data.date))) {
          if (budget.categoryId !== "all" && budget.categoryId !== categoryId) continue;
          const status = budgetProgress(budget, previewTxs, monthKey(data.date));
          if (status.status === "over") toast.warning("Bạn đã vượt hạn mức tháng này.");
          else if (status.status === "warning") toast.warning(`Hạn mức đã dùng ${status.pct}%.`);
        }
      }
    }
    close();
  };

  const amountColor = type === "expense" ? "text-expense" : type === "income" ? "text-income" : "text-foreground";
  const balanceOf = (a: (typeof accounts)[number]) => accountBalance(a, editing ? txs.filter((t) => t.id !== editing.id) : txs);
  const accountChips = (label: string, value: string, onChange: (id: string) => void, list: typeof accounts) => (
    <div>
      <Label>{label}</Label>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {list.map((a) => (
          <button key={a.id} type="button" onClick={() => onChange(a.id)} className={cn("shrink-0 rounded-xl border px-3.5 py-2 text-left transition", a.id === value ? "border-primary bg-primary/10" : "bg-card")}>
            <div className="text-sm font-semibold">{a.name}</div>
            <div className="text-xs text-muted-foreground">{formatVnd(balanceOf(a))}</div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(value) => !value && close()}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-1.5rem)] grid-cols-[minmax(0,1fr)] overflow-x-hidden overflow-y-auto rounded-2xl bg-white backdrop-blur-none dark:bg-neutral-900 sm:max-w-md">
        <DialogHeader><DialogTitle>{editing ? "Sửa giao dịch" : "Thêm giao dịch"}</DialogTitle><DialogDescription className="sr-only">Nhập thông tin giao dịch</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="min-w-0 space-y-4">
          <div className="grid grid-cols-3 rounded-xl bg-muted/80 p-1">
            {([["expense", "Chi"], ["income", "Thu"], ["transfer", "Chuyển quỹ"]] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => changeType(value)} className={cn("rounded-lg py-2 text-sm font-semibold transition", type === value ? (value === "expense" ? "bg-expense text-white shadow-sm" : value === "income" ? "bg-income text-white shadow-sm" : "bg-sky-500 text-white shadow-sm") : "text-muted-foreground")}>{label}</button>
            ))}
          </div>

          <div className="rounded-2xl border bg-card px-4 py-3 text-center">
            <Label htmlFor="tx-amount">Số tiền</Label>
            <div className="mt-1 flex items-center justify-center gap-1">
              <Input id="tx-amount" inputMode="numeric" autoFocus value={amount} onChange={(e) => setAmount(formatVndInput(parseVndInput(e.target.value)))} placeholder="0" className="h-12 max-w-[70%] border-0 bg-transparent p-0 text-center text-3xl font-bold text-foreground shadow-none focus-visible:ring-0" />
              <span className="text-xl font-semibold text-foreground">đ</span>
            </div>
          </div>

          {type !== "transfer" && <CategoryPicker type={type} value={categoryId} onChange={setCategoryId} />}

          {accountChips(type === "transfer" ? "Từ tài khoản" : type === "income" ? "Nhận vào tài khoản" : "Trả từ tài khoản", accountId, setAccountId, accounts)}
          {type === "transfer" && accountChips("Đến tài khoản", toAccountId, setToAccountId, accounts.filter((a) => a.id !== accountId))}

          <div><Label htmlFor="tx-date">Ngày giờ</Label><Input id="tx-date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-11" /></div>
          <div><Label htmlFor="tx-note">Ghi chú</Label><Textarea id="tx-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: Ăn trưa cùng đồng nghiệp" className="mt-1 min-h-16" /></div>

          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={upload} className="hidden" />
          {receipt ? (
            <div className="relative overflow-hidden rounded-xl border"><img src={receipt} alt="Ảnh hoá đơn" className="max-h-48 w-full object-cover" /><Button type="button" size="icon" variant="destructive" onClick={() => setReceipt(undefined)} className="absolute right-2 top-2" aria-label="Xoá ảnh hoá đơn"><Trash2 /></Button></div>
          ) : (
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="h-11 w-full"><Camera className="mr-2 size-4" />Chụp hoặc tải ảnh hoá đơn</Button>
          )}
          <Button type="submit" className={cn("h-12 w-full rounded-xl border-0 text-base text-white", type === "expense" ? "gradient-coral" : type === "income" ? "gradient-primary" : "bg-sky-500 hover:bg-sky-500/90")}>{editing ? "Lưu thay đổi" : "Lưu giao dịch"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
