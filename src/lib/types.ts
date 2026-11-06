export type TransactionType = "income" | "expense" | "transfer";
export type AccountType = "cash" | "bank" | "savings" | "ewallet";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number; // VND, integer
  color: string; // chart token key: 1..5
  bankBin?: string | undefined; // linked bank (VietQR BIN)
  accountNumber?: string | undefined;
  holder?: string | undefined;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // VND integer, always positive
  categoryId: string; // for transfer: "transfer"
  accountId: string; // source account
  toAccountId?: string; // for transfer
  date: string; // ISO string
  note?: string;
  receipt?: string; // data URL
  createdAt: string;
}

export interface Budget {
  id: string;
  categoryId: string | "all"; // "all" = whole wallet
  limit: number;
  month: string; // "YYYY-MM"; budgets are recurring: applies to every month unless overridden
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  accountId: string;
  dueDay: number; // 1..31
  reminder: boolean;
  paidMonths: string[]; // ["2026-09"]
  icon?: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string; // ISO date
  emoji: string;
  accountId?: string;
  createdAt: string;
}
