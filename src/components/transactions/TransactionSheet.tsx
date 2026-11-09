import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, Check, Image, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { categoriesByType, categoryColor, HUE_OPTIONS, ICON_OPTIONS } from "@/lib/categories";
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
  const custom = useFiGo((s) => s.customCategories);
  const setCustom = useFiGo((s) => s.setCustomCats);
  const [editor, setEditor] = useState<{ id?: string; name: string; icon: string; hue: number } | null>(null);
  const categories = useMemo(() => categoriesByType(type), [type, custom]);
  const selectedCustom = custom.find((c) => c.id === categoryId);

  const saveCategory = () => {
    if (!editor) return;
    const name = editor.name.trim();
    if (!name) { toast.error("Vui lòng nhập tên danh mục."); return; }
    if (categoriesByType(type).some((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== editor.id)) { toast.error("Tên danh mục này đã có."); return; }
    const id = editor.id ?? `cat_${uid()}`;
    const item = { id, name, type, icon: editor.icon, hue: editor.hue };
    setCustom(editor.id ? custom.map((c) => (c.id === id ? item : c)) : [...custom, item]);
    setCategoryId(id);
    setEditor(null);
    toast.success(editor.id ? "Đã cập nhật danh mục." : "Đã thêm danh mục mới.");
  };
  const deleteCategory = () => {
    if (!editor?.id) return;
    if (!window.confirm(`Xoá danh mục "${editor.name}"? Các giao dịch đã ghi với danh mục này sẽ chuyển thành "Chi khác".`)) return;
    setCustom(custom.filter((c) => c.id !== editor.id));
    setCategoryId(categoriesByType(type).find((c) => c.id !== editor.id)?.id ?? "khac_chi");
    setEditor(null);
  };

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
    setEditor(null);
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

  const theme = type === "expense" ? "gradient-coral" : type === "income" ? "gradient-primary" : "bg-sky-500";
  const addQuick = (n: number) => setAmount(formatVndInput(parseVndInput(amount) + n));
  const accountChips = (label: string, value: string, onChange: (id: string) => void, list: typeof accounts) => (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1">
        {list.map((a) => (
          <button key={a.id} type="button" onClick={() => onChange(a.id)} className={cn("shrink-0 rounded-2xl border px-3.5 py-2 text-left transition active:scale-[0.97]", a.id === value ? "border-primary bg-primary/10 ring-1 ring-primary" : "bg-card")}>
            <div className="text-sm font-semibold">{a.name}</div>
            <div className="text-xs text-muted-foreground">{formatVnd(accountBalance(a, editing ? txs.filter((t) => t.id !== editing.id) : txs))}</div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(value) => !value && close()}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-1.5rem)] gap-0 overflow-y-auto rounded-3xl p-0 sm:max-w-md">
        <div className={cn("px-5 pb-5 pt-6 text-white transition-colors", theme)}>
          <DialogHeader><DialogTitle className="text-lg text-white">{editing ? "Sửa giao dịch" : "Ghi giao dịch"}</DialogTitle><DialogDescription className="sr-only">Nhập thông tin giao dịch</DialogDescription></DialogHeader>
          <div className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-white/20 p-1">
            {([["expense", "Chi"], ["income", "Thu"], ["transfer", "Chuyển quỹ"]] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => changeType(value)} className={cn("rounded-xl py-2 text-sm font-semibold transition", type === value ? "bg-white text-foreground shadow" : "text-white/90")}>{label}</button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-1">
            <Input id="tx-amount" inputMode="numeric" autoFocus value={amount} onChange={(e) => setAmount(formatVndInput(parseVndInput(e.target.value)))} placeholder="0" className="h-14 max-w-[75%] border-0 bg-transparent text-center text-4xl font-bold text-white shadow-none placeholder:text-white/50 focus-visible:ring-0" />
            <span className="text-2xl font-bold text-white/90">đ</span>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {[50000, 100000, 500000, 1000000].map((n) => <button key={n} type="button" onClick={() => addQuick(n)} className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold active:scale-95">+{n >= 1000000 ? `${n / 1000000}tr` : `${n / 1000}k`}</button>)}
          </div>
          <p className="mt-2 text-center text-xs text-white/80">Có thể nhập 1,5tr hoặc 500k</p>
        </div>

        <form onSubmit={submit} className="space-y-5 p-5">
          {type !== "transfer" && (
            <div>
              <div className="flex items-center justify-between">
                <Label>Danh mục</Label>
                {selectedCustom && !editor && <button type="button" onClick={() => setEditor({ id: selectedCustom.id, name: selectedCustom.name, icon: selectedCustom.icon, hue: selectedCustom.hue })} className="flex items-center gap-1 text-xs font-semibold text-primary"><Pencil className="size-3" />Sửa danh mục này</button>}
              </div>
              {editor ? (
                <div className="mt-2 space-y-3 rounded-2xl border bg-muted/40 p-3">
                  <Input value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} placeholder="Tên danh mục, ví dụ: Cà phê sáng" maxLength={30} className="h-11 bg-card" />
                  <div className="grid grid-cols-6 gap-2">
                    {Object.entries(ICON_OPTIONS).map(([key, Icon]) => <button key={key} type="button" onClick={() => setEditor({ ...editor, icon: key })} aria-label={key} className={cn("flex size-10 items-center justify-center rounded-xl border bg-card", editor.icon === key && "ring-2 ring-primary")}><Icon className="size-4" /></button>)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {HUE_OPTIONS.map((h) => <button key={h} type="button" onClick={() => setEditor({ ...editor, hue: h })} aria-label={`Màu ${h}`} className={cn("flex size-8 items-center justify-center rounded-full text-white", editor.hue === h && "ring-2 ring-offset-2 ring-primary")} style={{ background: `oklch(0.68 0.16 ${h})` }}>{editor.hue === h && <Check className="size-4" />}</button>)}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={saveCategory} className="h-10 flex-1">{editor.id ? "Lưu danh mục" : "Thêm danh mục"}</Button>
                    {editor.id && <Button type="button" variant="outline" onClick={deleteCategory} className="h-10 text-destructive"><Trash2 className="size-4" /></Button>}
                    <Button type="button" variant="ghost" onClick={() => setEditor(null)} className="h-10">Huỷ</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 grid max-h-48 grid-cols-4 gap-2 overflow-y-auto pr-1">
                  {categories.map((c) => {
                    const Icon = c.icon;
                    const on = c.id === categoryId;
                    return (
                      <button key={c.id} type="button" onClick={() => setCategoryId(c.id)} className={cn("flex flex-col items-center gap-1 rounded-2xl border p-2 text-center transition active:scale-95", on ? "border-transparent" : "bg-card")} style={on ? { background: categoryColor(c.id, 0.14), boxShadow: `inset 0 0 0 1.5px ${categoryColor(c.id)}` } : undefined}>
                        <span className="flex size-9 items-center justify-center rounded-xl" style={{ background: categoryColor(c.id, 0.18), color: categoryColor(c.id) }}><Icon className="size-4" /></span>
                        <span className="line-clamp-2 text-[11px] font-medium leading-tight">{c.name}</span>
                      </button>
                    );
                  })}
                  <button type="button" onClick={() => setEditor({ name: "", icon: "star", hue: 150 })} className="flex flex-col items-center gap-1 rounded-2xl border border-dashed p-2 text-center text-primary active:scale-95">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10"><Plus className="size-4" /></span>
                    <span className="text-[11px] font-medium leading-tight">Thêm mới</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {accountChips(type === "transfer" ? "Từ tài khoản" : type === "income" ? "Nhận vào tài khoản" : "Trả từ tài khoản", accountId, setAccountId, accounts)}
          {type === "transfer" && accountChips("Đến tài khoản", toAccountId, setToAccountId, accounts.filter((a) => a.id !== accountId))}

          <div className="grid gap-3 rounded-2xl border bg-card p-3">
            <div><Label htmlFor="tx-date" className="text-xs text-muted-foreground">Ngày giờ</Label><Input id="tx-date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-11" /></div>
            <div><Label htmlFor="tx-note" className="text-xs text-muted-foreground">Ghi chú</Label><Textarea id="tx-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: Ăn trưa cùng đồng nghiệp" className="mt-1 min-h-16" /></div>
          </div>

          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={upload} className="hidden" />
          {receipt ? (
            <div className="relative overflow-hidden rounded-2xl border"><img src={receipt} alt="Ảnh hoá đơn" className="max-h-48 w-full object-cover" /><Button type="button" size="icon" variant="destructive" onClick={() => setReceipt(undefined)} className="absolute right-2 top-2" aria-label="Xoá ảnh hoá đơn"><Trash2 /></Button></div>
          ) : (
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="h-11 w-full rounded-2xl"><Camera className="mr-2 size-4" />Chụp hoặc tải ảnh hoá đơn</Button>
          )}
          <button type="submit" className={cn("h-12 w-full rounded-2xl text-base font-semibold text-white shadow-lg transition active:scale-[0.98]", theme)}>{editing ? "Lưu thay đổi" : type === "expense" ? "Ghi khoản chi" : type === "income" ? "Ghi khoản thu" : "Chuyển quỹ"}</button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
