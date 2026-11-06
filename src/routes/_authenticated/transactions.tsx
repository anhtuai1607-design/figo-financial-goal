import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { TransactionDetail } from "@/components/transactions/TransactionDetail";
import type { Transaction } from "@/lib/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, Panel, TransactionRow, metaFor } from "@/components/finance/Common";
import { CATEGORIES } from "@/lib/categories";
import { exportCsv, exportXlsx } from "@/lib/export";
import { monthKey } from "@/lib/format";
import { useFiGo } from "@/lib/store";
import { useUI } from "@/lib/ui-store";

export const Route = createFileRoute("/_authenticated/transactions")({ head: () => ({ meta: metaFor("Sổ giao dịch", "Tìm kiếm, lọc, thêm và xuất toàn bộ giao dịch tài chính của bạn.") }), component: TransactionsPage });

function TransactionsPage() {
  const txs = useFiGo((s) => s.transactions);
  const accounts = useFiGo((s) => s.accounts);
  const remove = useFiGo((s) => s.removeTransaction);
  const openTx = useUI((s) => s.openTxSheet);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [month, setMonth] = useState(monthKey());
  const filtered = useMemo(() => txs.filter((tx) => {
    const q = search.toLocaleLowerCase("vi");
    return (!q || tx.note?.toLocaleLowerCase("vi").includes(q) || CATEGORIES.find((c) => c.id === tx.categoryId)?.name.toLocaleLowerCase("vi").includes(q)) && (type === "all" || tx.type === type) && (category === "all" || tx.categoryId === category) && (!month || tx.date.startsWith(month));
  }), [txs, search, type, category, month]);
  const [detail, setDetail] = useState<Transaction | null>(null);
  const deleteTx = (id: string) => { if (!window.confirm("Xoá giao dịch này?")) return false; remove(id); toast.success("Đã xoá giao dịch."); return true; };
  return <div><PageHeader title="Sổ thu chi" subtitle={`${filtered.length} kết quả phù hợp`} action={<Button onClick={() => openTx()} className="gradient-coral text-coral-foreground"><Plus /> Ghi thu chi</Button>} /><Panel className="mb-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1.5fr)_repeat(3,minmax(120px,1fr))]"><div className="relative min-w-0 sm:col-span-2 xl:col-span-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm ghi chú, danh mục..." className="pl-9" /></div><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả loại</SelectItem><SelectItem value="income">Thu</SelectItem><SelectItem value="expense">Chi</SelectItem><SelectItem value="transfer">Chuyển khoản</SelectItem></SelectContent></Select><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả danh mục</SelectItem>{CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Chọn tháng"/><div className="flex gap-2 sm:col-span-2 xl:col-span-4"><Button variant="outline" size="sm" onClick={() => { exportXlsx(filtered, accounts); toast.success("Đang tải báo cáo Excel."); }} title="Xuất Excel"><FileSpreadsheet /> Excel</Button><Button variant="outline" size="sm" onClick={() => { exportCsv(filtered, accounts); toast.success("Đang tải báo cáo CSV."); }} title="Xuất CSV"><Download /> CSV</Button></div></div></Panel><Panel className="p-2 sm:p-3">{filtered.length ? filtered.map((tx) => <div key={tx.id} className="group flex items-center"><div className="min-w-0 flex-1"><TransactionRow tx={tx} account={accounts.find((a) => a.id === tx.accountId)?.name} onClick={() => setDetail(tx)}/></div><Button size="icon" variant="ghost" onClick={() => openTx({ tx })} className="shrink-0 text-muted-foreground hover:text-primary" aria-label="Sửa giao dịch"><Pencil /></Button><Button size="icon" variant="ghost" onClick={() => deleteTx(tx.id)} className="shrink-0 text-muted-foreground hover:text-destructive" aria-label="Xoá giao dịch"><Trash2 /></Button></div>) : <EmptyState title="Không tìm thấy giao dịch" text="Hãy đổi bộ lọc hoặc thêm giao dịch mới."/>}</Panel><TransactionDetail tx={detail} accounts={accounts} onClose={() => setDetail(null)} onEdit={(t) => { setDetail(null); openTx({ tx: t }); }} onDelete={(t) => { if (deleteTx(t.id)) setDetail(null); }} /></div>;
}
