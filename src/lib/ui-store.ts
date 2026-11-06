import { create } from "zustand";
import type { Transaction, TransactionType } from "./types";

interface UIState {
  txSheetOpen: boolean;
  editingTx: Transaction | null;
  presetType: TransactionType;
  openTxSheet: (opts?: { tx?: Transaction; type?: TransactionType }) => void;
  closeTxSheet: () => void;
}

export const useUI = create<UIState>((set) => ({
  txSheetOpen: false,
  editingTx: null,
  presetType: "expense",
  openTxSheet: (opts) =>
    set({ txSheetOpen: true, editingTx: opts?.tx ?? null, presetType: opts?.tx?.type ?? opts?.type ?? "expense" }),
  closeTxSheet: () => set({ txSheetOpen: false, editingTx: null }),
}));
