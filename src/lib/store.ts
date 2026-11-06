import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Account, Bill, Budget, Goal, Transaction } from "./types";
import { uid, toVnd } from "./format";

interface FiGoState {
  hydrated: boolean;
  userName: string;
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  bills: Bill[];
  goals: Goal[];
  pinHash: string | null;

  setPin: (hash: string | null) => void;
  ensureWallet: () => string;
  payBill: (id: string, month: string, accountId: string) => void;
  setHydrated: () => void;
  setUserName: (n: string) => void;

  addAccount: (a: Omit<Account, "id">) => void;
  updateAccount: (id: string, a: Partial<Account>) => void;
  removeAccount: (id: string) => void;

  addTransaction: (t: Omit<Transaction, "id" | "createdAt">) => Transaction;
  updateTransaction: (id: string, t: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;

  upsertBudget: (b: Omit<Budget, "id"> & { id?: string }) => void;
  removeBudget: (id: string) => void;

  addBill: (b: Omit<Bill, "id" | "paidMonths">) => void;
  updateBill: (id: string, b: Partial<Bill>) => void;
  removeBill: (id: string) => void;
  toggleBillPaid: (id: string, month: string, createTx: boolean) => boolean;

  addGoal: (g: Omit<Goal, "id" | "createdAt" | "saved">) => void;
  updateGoal: (id: string, g: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  depositGoal: (id: string, amount: number, accountId?: string) => void;

  resetAll: () => void;
}

export const WALLET_ID = "figo_wallet";

const empty = { accounts: [], transactions: [], budgets: [], bills: [], goals: [] };

export const useFiGo = create<FiGoState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      userName: "bạn",
      // Start empty: random IDs at module load crash the server. Data loads after sign-in.
      accounts: [],
      transactions: [],
      budgets: [],
      bills: [],
      goals: [],
      pinHash: null,

      setPin: (pinHash) => set({ pinHash }),
      ensureWallet: () => {
        if (!get().accounts.some((a) => a.id === WALLET_ID))
          set((s) => ({ accounts: [{ id: WALLET_ID, name: "Ví FiGo", type: "ewallet", initialBalance: 0, color: "2" }, ...s.accounts] }));
        return WALLET_ID;
      },
      payBill: (id, month, accountId) => {
        const bill = get().bills.find((b) => b.id === id);
        if (!bill || bill.paidMonths.includes(month)) return;
        set((s) => ({ bills: s.bills.map((x) => (x.id === id ? { ...x, paidMonths: [...x.paidMonths, month] } : x)) }));
        get().addTransaction({ type: "expense", amount: bill.amount, categoryId: bill.categoryId, accountId, date: new Date().toISOString(), note: `Thanh toán hoá đơn: ${bill.name}` });
      },
      setHydrated: () => set({ hydrated: true }),
      setUserName: (userName) => set({ userName }),

      addAccount: (a) => set((s) => ({ accounts: [...s.accounts, { ...a, id: uid() }] })),
      updateAccount: (id, a) =>
        set((s) => ({ accounts: s.accounts.map((x) => (x.id === id ? { ...x, ...a } : x)) })),
      removeAccount: (id) =>
        set((s) => ({
          accounts: s.accounts.filter((x) => x.id !== id),
          transactions: s.transactions.filter((t) => t.accountId !== id && t.toAccountId !== id),
        })),

      addTransaction: (t) => {
        const tx: Transaction = { ...t, amount: toVnd(t.amount), id: uid(), createdAt: new Date().toISOString() };
        set((s) => ({ transactions: [tx, ...s.transactions].sort((a, b) => b.date.localeCompare(a.date)) }));
        return tx;
      },
      updateTransaction: (id, t) =>
        set((s) => ({
          transactions: s.transactions
            .map((x) => (x.id === id ? { ...x, ...t, amount: toVnd(t.amount ?? x.amount) } : x))
            .sort((a, b) => b.date.localeCompare(a.date)),
        })),
      removeTransaction: (id) => set((s) => ({ transactions: s.transactions.filter((x) => x.id !== id) })),

      upsertBudget: (b) =>
        set((s) => {
          const existing = s.budgets.find((x) => x.id === b.id || (x.categoryId === b.categoryId && x.month === b.month));
          if (existing) return { budgets: s.budgets.map((x) => (x.id === existing.id ? { ...x, ...b, id: existing.id } : x)) };
          return { budgets: [...s.budgets, { ...b, id: uid() }] };
        }),
      removeBudget: (id) => set((s) => ({ budgets: s.budgets.filter((x) => x.id !== id) })),

      addBill: (b) => set((s) => ({ bills: [...s.bills, { ...b, id: uid(), paidMonths: [] }] })),
      updateBill: (id, b) => set((s) => ({ bills: s.bills.map((x) => (x.id === id ? { ...x, ...b } : x)) })),
      removeBill: (id) => set((s) => ({ bills: s.bills.filter((x) => x.id !== id) })),
      toggleBillPaid: (id, month, createTx) => {
        const bill = get().bills.find((b) => b.id === id);
        if (!bill) return false;
        const paid = bill.paidMonths.includes(month);
        if (paid) {
          set((s) => ({ bills: s.bills.map((x) => (x.id === id ? { ...x, paidMonths: x.paidMonths.filter((m) => m !== month) } : x)) }));
          return false;
        }
        set((s) => ({ bills: s.bills.map((x) => (x.id === id ? { ...x, paidMonths: [...x.paidMonths, month] } : x)) }));
        if (createTx) {
          get().addTransaction({
            type: "expense",
            amount: bill.amount,
            categoryId: bill.categoryId,
            accountId: bill.accountId,
            date: new Date().toISOString(),
            note: `Thanh toán hoá đơn: ${bill.name}`,
          });
        }
        return true;
      },

      addGoal: (g) => set((s) => ({ goals: [...s.goals, { ...g, saved: 0, id: uid(), createdAt: new Date().toISOString() }] })),
      updateGoal: (id, g) => set((s) => ({ goals: s.goals.map((x) => (x.id === id ? { ...x, ...g } : x)) })),
      removeGoal: (id) => set((s) => ({ goals: s.goals.filter((x) => x.id !== id) })),
      depositGoal: (id, amount, accountId) => {
        const goal = get().goals.find((g) => g.id === id);
        if (!goal) return;
        set((s) => ({ goals: s.goals.map((x) => (x.id === id ? { ...x, saved: toVnd(x.saved + amount) } : x)) }));
        if (accountId) {
          get().addTransaction({
            type: "expense",
            amount,
            categoryId: "tiet_kiem",
            accountId,
            date: new Date().toISOString(),
            note: `Nạp quỹ: ${goal.emoji} ${goal.name}`,
          });
        }
      },

      resetAll: () => set({ ...empty, pinHash: null }),
    }),
    {
      name: "figo-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        userName: s.userName,
        accounts: s.accounts,
        transactions: s.transactions,
        budgets: s.budgets,
        bills: s.bills,
        goals: s.goals,
        pinHash: s.pinHash,
      }),
    },
  ),
);
