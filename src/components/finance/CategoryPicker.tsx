import { useMemo, useState } from "react";
import { Check, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORIES, categoriesByType, getCategory, HUE_OPTIONS, ICON_OPTIONS, PICKER_ICONS } from "@/lib/categories";
import { uid } from "@/lib/format";
import { useFiGo } from "@/lib/store";
import type { TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";

type Editor = { id?: string; name: string; icon: string; hue: number };

/** Chọn danh mục: dùng chung cho Thu/Chi, Hoá đơn, Ngân sách. Thêm, sửa, xoá ở đâu cũng đồng bộ. */
export function CategoryPicker({ type, value, onChange, allOption }: { type: TransactionType; value: string; onChange: (id: string) => void; allOption?: { id: string; label: string } }) {
  const custom = useFiGo((s) => s.customCategories);
  const setCustom = useFiGo((s) => s.setCustomCats);
  const hidden = useFiGo((s) => s.hiddenCategories);
  const setHidden = useFiGo((s) => s.setHiddenCats);
  const [manage, setManage] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const categories = useMemo(() => categoriesByType(type), [type, custom, hidden]);

  const save = () => {
    if (!editor) return;
    const name = editor.name.trim();
    if (!name) { toast.error("Vui lòng nhập tên danh mục."); return; }
    if (categoriesByType(type).some((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== editor.id)) { toast.error("Tên danh mục này đã có."); return; }
    const id = editor.id ?? `cat_${uid()}`;
    const item = { id, name, type: editor.id ? getCategory(id).type : type, icon: editor.icon, hue: editor.hue };
    setCustom(custom.some((c) => c.id === id) ? custom.map((c) => (c.id === id ? item : c)) : [...custom, item]);
    onChange(id);
    setEditor(null);
    toast.success(editor.id ? "Đã cập nhật danh mục." : "Đã thêm danh mục mới.");
  };
  const del = () => {
    if (!editor?.id) return;
    const builtin = CATEGORIES.some((x) => x.id === editor.id);
    if (!window.confirm(builtin ? `Xoá danh mục "${editor.name}" khỏi danh sách? Các giao dịch cũ đã ghi với danh mục này vẫn được giữ nguyên.` : `Xoá danh mục "${editor.name}"? Các giao dịch cũ với danh mục này sẽ chuyển thành "Chi khác".`)) return;
    if (builtin) setHidden([...hidden, editor.id]);
    setCustom(custom.filter((c) => c.id !== editor.id));
    if (value === editor.id) onChange(allOption?.id ?? categoriesByType(type).find((c) => c.id !== editor.id)?.id ?? "khac_chi");
    setEditor(null);
  };

  const tile = (id: string, label: string, Icon: (typeof CATEGORIES)[number]["icon"], onClick: () => void, selected: boolean, hue: number, badge?: boolean) => (
    <button key={id} type="button" onClick={onClick} className={cn("relative flex flex-col items-center gap-1.5 rounded-2xl border p-2 text-center transition active:scale-95", selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card/70 hover:bg-card")}>
      <span className="flex size-10 items-center justify-center rounded-xl" style={{ background: `oklch(0.68 0.16 ${hue} / 0.16)`, color: `oklch(0.6 0.17 ${hue})` }}><Icon className="size-5" strokeWidth={1.8} /></span>
      <span className="line-clamp-2 min-h-[1.6em] text-[11px] font-medium leading-tight">{label}</span>
      {selected && <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="size-3" strokeWidth={3} /></span>}
      {badge && <Pencil className="absolute right-1.5 top-1.5 size-3 text-muted-foreground" />}
    </button>
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>Danh mục</Label>
        <button type="button" onClick={() => { setManage(!manage); setEditor(null); }} className="rounded-full px-2 py-0.5 text-xs font-semibold text-primary hover:bg-primary/10">{manage ? "Xong" : "Chỉnh sửa"}</button>
      </div>
      {editor ? (
        <div className="mt-2 space-y-3 rounded-2xl border bg-muted/40 p-3">
          <Input value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} placeholder="Tên danh mục" maxLength={30} className="h-11 bg-card" autoFocus />
          <div className="grid grid-cols-5 gap-2">
            {PICKER_ICONS.map((key) => { const Icon = ICON_OPTIONS[key]; const on = editor.icon === key; return <button key={key} type="button" onClick={() => setEditor({ ...editor, icon: key })} aria-label={key} className={cn("flex h-11 items-center justify-center rounded-xl border bg-card", on && "border-primary ring-1 ring-primary")} style={{ color: `oklch(0.6 0.17 ${editor.hue})` }}><Icon className="size-5" /></button>; })}
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={save} className="h-10 flex-1">{editor.id ? "Lưu" : "Thêm danh mục"}</Button>
            {editor.id && <Button type="button" variant="outline" onClick={del} className="h-10 text-destructive"><Trash2 className="size-4" /> Xoá</Button>}
            <Button type="button" variant="ghost" onClick={() => setEditor(null)} className="h-10">Huỷ</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-2 grid max-h-56 grid-cols-4 gap-2 overflow-y-auto pr-1">
            {allOption && tile(allOption.id, allOption.label, Wallet, () => onChange(allOption.id), !manage && value === allOption.id, 160)}
            {categories.map((c) => tile(c.id, c.name, c.icon, () => (manage ? setEditor({ id: c.id, name: c.name, icon: "", hue: c.hue }) : onChange(c.id)), !manage && value === c.id, c.hue, manage))}
            <button type="button" onClick={() => setEditor({ name: "", icon: "bag", hue: HUE_OPTIONS[custom.length % HUE_OPTIONS.length] ?? 160 })} className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed p-2 text-primary hover:bg-primary/5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10"><Plus className="size-5" /></span>
              <span className="text-[11px] font-medium">Thêm mới</span>
            </button>
          </div>
          {manage && hidden.length > 0 && <button type="button" onClick={() => setHidden([])} className="mt-2 text-xs text-muted-foreground underline">Khôi phục {hidden.length} danh mục đã xoá</button>}
        </>
      )}
    </div>
  );
}
