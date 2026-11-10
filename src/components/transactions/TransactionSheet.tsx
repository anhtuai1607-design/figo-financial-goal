import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, Check, Image, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, categoriesByType, getCategory, ICON_OPTIONS, PICKER_ICONS } from "@/lib/categories";
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
  const hidden = useFiGo((s) => s.hiddenCategories);
  const setHidden = useFiGo((s) => s.setHiddenCats);
  const [manage, setManage] = useState(false);
  const [editor, setEditor] = useState<{ id?: string; name: string; icon: string; hue: number } | null>(null);
  const categories = useMemo(() => categoriesByType(type), [type, custom, hidden]);

  const saveCategory = () => {
    if (!editor) return;
    const name = editor.name.trim();
    if (!name) { toast.error("Vui lòng nhập tên danh mục."); return; }
    if (categoriesByType(type).some((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== editor.id)) { toast.error("Tên danh mục này đã có."); return; }
    const id = editor.id ?? `cat_${uid()}`;
    const item = { id, name, type: editor.id ? getCategory(id).type : type, icon: editor.icon, hue: editor.hue };
    setCustom(custom.some((c) => c.id === id) ? custom.map((c) => (c.id === id ? item : c)) : [...custom, item]);
    setCategoryId(id);
    setEditor(null);
    toast.success(editor.id ? "Đã cập nhật danh mục." : "Đã thêm danh mục mới.");
  };
  const deleteCategory = () => {
    if (!editor?.id) return;
    const builtin = CATEGORIES.some((x) => x.id === editor.id);
    if (!window.confirm(builtin ? `Xoá danh mục "${editor.name}" khỏi danh sách? Các giao dịch cũ đã ghi với danh mục này vẫn được giữ nguyên.` : `Xoá danh mục "${editor.name}"? Các giao dịch cũ với danh mục này sẽ chuyển thành "Chi khác".`)) return;
    if (builtin) setHidden([...hidden, editor.id]);
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
    setManage(false);
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
  const addQuick = (n: number) => setAmount(formatVndInput(parseVndInput(amount) + n));
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
      <DialogContent className="max-h-[92dvh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl sm:max-w-md">
        <DialogHeader><DialogTitle>{editing ? "Sửa giao dịch" : "Thêm giao dịch"}</DialogTitle><DialogDescription className="sr-only">Nhập thông tin giao dịch</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-3 rounded-xl bg-muted p-1">
            {([["expense", "Chi"], ["income", "Thu"], ["transfer", "Chuyển quỹ"]] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => changeType(value)} className={cn("rounded-lg py-2 text-sm font-semibold transition", type === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>{label}</button>
            ))}
          </div>

          <div className="rounded-2xl border bg-card px-4 py-3 text-center">
            <Label htmlFor="tx-amount" className="text-xs text-muted-foreground">Số tiền</Label>
            <div className="mt-1 flex items-center justify-center gap-1">
              <Input id="tx-amount" inputMode="numeric" autoFocus value={amount} onChange={(e) => setAmount(formatVndInput(parseVndInput(e.target.value)))} placeholder="0" className={cn("h-12 max-w-[70%] border-0 bg-transparent p-0 text-center text-3xl font-bold shadow-none focus-visible:ring-0", amountColor)} />
              <span className="text-xl font-semibold text-muted-foreground">đ</span>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {[50000, 100000, 500000, 1000000].map((n) => <button key={n} type="button" onClick={() => addQuick(n)} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground active:scale-95">+{n >= 1000000 ? `${n / 1000000}tr` : `${n / 1000}k`}</button>)}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Có thể nhập 1,5tr hoặc 500k</p>
          </div>

          {type !== "transfer" && (
            <div>
              <div className="flex items-center justify-between">
                <Label>Danh mục</Label>
                <button type="button" onClick={() => { setManage(!manage); setEditor(null); }} className="text-xs font-semibold text-primary">{manage ? "Xong" : "Chỉnh sửa"}</button>
              </div>
              {editor ? (
                <div className="mt-2 space-y-3 rounded-xl border bg-muted/40 p-3">
                  <Input value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} placeholder="Tên danh mục" maxLength={30} className="h-11 bg-card" />
                  <div className="grid grid-cols-5 gap-2">
                    {PICKER_ICONS.map((key) => { const Icon = ICON_OPTIONS[key]; return <button key={key} type="button" onClick={() => setEditor({ ...editor, icon: key })} aria-label={key} className={cn("flex h-11 items-center justify-center rounded-xl border bg-card text-muted-foreground", editor.icon === key && "border-primary bg-primary/10 text-primary")}><Icon className="size-5" /></button>; })}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={saveCategory} className="h-10 flex-1">{editor.id ? "Lưu" : "Thêm danh mục"}</Button>
                    {editor.id && <Button type="button" variant="outline" onClick={deleteCategory} className="h-10 text-destructive"><Trash2 className="size-4" /> Xoá</Button>}
                    <Button type="button" variant="ghost" onClick={() => setEditor(null)} className="h-10">Huỷ</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-2 grid max-h-52 grid-cols-4 gap-2 overflow-y-auto pr-1">
                    {categories.map((c) => {
                      const Icon = c.icon;
                      const on = !manage && c.id === categoryId;
                      return (
                        <button key={c.id} type="button" onClick={() => (manage ? setEditor({ id: c.id, name: c.name, icon: "", hue: c.hue }) : setCategoryId(c.id))} className={cn("relative flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 text-center transition", on ? "border-primary bg-primary/10 text-primary" : "bg-card text-muted-foreground")}>
                          <Icon className="size-5" strokeWidth={1.75} />
                          <span className="line-clamp-2 text-[11px] font-medium leading-tight text-foreground">{c.name}</span>
                          {manage && <Pencil className="absolute right-1.5 top-1.5 size-3" />}
                        </button>
                      );
                    })}
                    <button type="button" onClick={() => setEditor({ name: "", icon: "bag", hue: 160 })} className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-1 py-2.5 text-primary">
                      <Plus className="size-5" strokeWidth={1.75} />
                      <span className="text-[11px] font-medium leading-tight">Thêm mới</span>
                    </button>
                  </div>
                  {manage && hidden.length > 0 && <button type="button" onClick={() => setHidden([])} className="mt-2 text-xs text-muted-foreground underline">Khôi phục {hidden.length} danh mục đã xoá</button>}
                </>
              )}
            </div>
          )}

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
          <Button type="submit" className="h-12 w-full rounded-xl text-base">{editing ? "Lưu thay đổi" : "Lưu giao dịch"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
