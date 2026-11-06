import * as XLSX from "xlsx";
import type { Account, Transaction } from "./types";
import { getCategory } from "./categories";
import { formatDateTime } from "./format";

const TYPE_LABEL: Record<Transaction["type"], string> = {
  income: "Thu",
  expense: "Chi",
  transfer: "Chuyển khoản",
};

function rows(txs: Transaction[], accounts: Account[]) {
  const acc = (id?: string) => accounts.find((a) => a.id === id)?.name ?? "";
  return txs.map((t) => ({
    "Ngày giờ": formatDateTime(t.date),
    Loại: TYPE_LABEL[t.type],
    "Danh mục": getCategory(t.categoryId).name,
    "Số tiền (VNĐ)": t.type === "expense" ? -t.amount : t.amount,
    "Tài khoản": acc(t.accountId),
    "Tài khoản nhận": t.type === "transfer" ? acc(t.toAccountId) : "",
    "Ghi chú": t.note ?? "",
    "Có hoá đơn": t.receipt ? "Có" : "",
  }));
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export function exportXlsx(txs: Transaction[], accounts: Account[]) {
  const data = rows(txs, accounts);
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 24 }, { wch: 16 }, { wch: 22 }, { wch: 22 }, { wch: 36 }, { wch: 10 }];
  // number format for amount column (D)
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let r = 1; r <= range.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 3 })];
    if (cell) cell.z = "#,##0";
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Giao dịch");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  download(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `FiGo_GiaoDich_${stamp()}.xlsx`);
}

export function exportCsv(txs: Transaction[], accounts: Account[]) {
  const data = rows(txs, accounts);
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws, { FS: ";" });
  download(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), `FiGo_GiaoDich_${stamp()}.csv`);
}
