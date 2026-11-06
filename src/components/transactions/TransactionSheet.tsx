import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, Image, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { categoriesByType } from "@/lib/categories";
import { activeBudgets, budgetProgress } from "@/lib/finance";
import { formatVndInput, monthKey, parseVndInput } from "@/lib/format";
import { useFiGo } from "@/lib/store";
import type { TransactionType } from "@/lib/types";
import { useUI } from "@/lib/ui-store";

const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

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
  const categories = useMemo(() => categoriesByType(type), [type]);

  useEffect(() => {
    if (!open) return;
    const nextType = editing?.type ?? preset;
    setType(nextType);
    setAmount(editing ? formatVndInput(editing.amount) : "");
    setCategoryId(editing?.categoryId ?? categoriesByType(nextType)[0]?.id ?? "an_uong");
    setAccountId(editing?.accountId ?? accounts[0]?.id ?? "");
    setToAccountId(editing?.toAccountId ?? accounts[1]?.id ?? accounts[0]?.id ?? "");
    setDate(editing ? new Date(editing.date).toISOString().slice(0, 16) : nowLocal());
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

  return (
    <Dialog open={open} onOpenChange={(value) => !value && close()}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader><DialogTitle>{editing ? "Sửa giao dịch" : "Ghi thu chi"}</DialogTitle><DialogDescription>Ghi sổ tài chính cá nhân · Không chuyển tiền qua ngân hàng.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted p-1">
            {([ ["expense", "Chi"], ["income", "Thu"], ["transfer", "Chuyển quỹ"] ] as const).map(([value, label]) => <Button key={value} type="button" variant={type === value ? "default" : "ghost"} onClick={() => changeType(value)}>{label}</Button>)}
          </div>
          <div><Label htmlFor="tx-amount">Số tiền</Label><Input id="tx-amount" inputMode="numeric" autoFocus value={amount} onChange={(e) => setAmount(formatVndInput(parseVndInput(e.target.value)))} placeholder="0" className="mt-1 h-12 text-xl font-bold" /><p className="mt-1 text-xs text-muted-foreground">Có thể nhập 1,5tr hoặc 500k</p></div>
          {type !== "transfer" && <div><Label>Danh mục</Label><Select value={categoryId} onValueChange={setCategoryId}><SelectTrigger className="mt-1 h-11"><SelectValue /></SelectTrigger><SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>{type === "transfer" ? "Tài khoản nguồn" : type === "income" ? "Nguồn nhận tiền" : "Tài khoản"}</Label><Select value={accountId} onValueChange={setAccountId}><SelectTrigger className="mt-1 h-11"><SelectValue placeholder="Chọn tài khoản" /></SelectTrigger><SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div>
            {type === "transfer" && <div><Label>Tài khoản nhận</Label><Select value={toAccountId} onValueChange={setToAccountId}><SelectTrigger className="mt-1 h-11"><SelectValue placeholder="Chọn tài khoản" /></SelectTrigger><SelectContent>{accounts.filter((a) => a.id !== accountId).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div>}
          </div>
          <div><Label htmlFor="tx-date">Ngày giờ</Label><Input id="tx-date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-11" /></div>
          <div><Label htmlFor="tx-note">Ghi chú</Label><Textarea id="tx-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: Ăn trưa cùng đồng nghiệp" className="mt-1" /></div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={upload} className="hidden" />
          {receipt ? <div className="relative overflow-hidden rounded-xl border"><img src={receipt} alt="Ảnh hoá đơn" className="max-h-48 w-full object-cover" /><Button type="button" size="icon" variant="destructive" onClick={() => setReceipt(undefined)} className="absolute right-2 top-2" aria-label="Xoá ảnh"><Trash2 /></Button></div> : <Button type="button" variant="outline" className="h-11 w-full" onClick={() => fileRef.current?.click()}><Camera /> Chụp hoặc tải ảnh hoá đơn</Button>}
          <Button type="submit" className="h-11 w-full">{editing ? "Lưu thay đổi" : "Thêm giao dịch"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}