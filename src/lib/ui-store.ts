import { create } from "zustand";
import type { Transaction, TransactionType } from "./types";

export type MascotMood = "idle" | "happy" | "celebrate" | "warn" | "thinking" | "encourage" | "shy";

export interface MascotEvent {
  id: number;
  mood: MascotMood;
  message: string;
  subtext?: string;
  expiresAt: number;
}

interface UIState {
  txSheetOpen: boolean;
  editingTx: Transaction | null;
  presetType: TransactionType;
  openTxSheet: (opts?: { tx?: Transaction; type?: TransactionType }) => void;
  closeTxSheet: () => void;

  mascotEvent: MascotEvent | null;
  mascotCollapsed: boolean;
  triggerMascot: (opts: {
    mood: MascotMood;
    message: string;
    subtext?: string;
    durationMs?: number;
  }) => void;
  clearMascotEvent: () => void;
  setMascotCollapsed: (collapsed: boolean) => void;
}

let eventSeq = 1;

export const useUI = create<UIState>((set) => ({
  txSheetOpen: false,
  editingTx: null,
  presetType: "expense",
  openTxSheet: (opts) =>
    set({
      txSheetOpen: true,
      editingTx: opts?.tx ?? null,
      presetType: opts?.tx?.type ?? opts?.type ?? "expense",
    }),
  closeTxSheet: () => set({ txSheetOpen: false, editingTx: null }),

  mascotEvent: null,
  mascotCollapsed: true,
  triggerMascot: ({ mood, message, subtext, durationMs = 4500 }) => {
    const id = eventSeq++;
    const expiresAt = Date.now() + durationMs;
    set({
      mascotEvent: { id, mood, message, ...(subtext !== undefined ? { subtext } : {}), expiresAt },
    });
  },
  clearMascotEvent: () => set({ mascotEvent: null }),
  setMascotCollapsed: (mascotCollapsed) => set({ mascotCollapsed }),
}));
