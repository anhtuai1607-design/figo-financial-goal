import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFiGo } from "./store";

type Snapshot = Pick<ReturnType<typeof useFiGo.getState>, "userName" | "accounts" | "transactions" | "budgets" | "bills" | "goals" | "pinHash">;

function snapshot(): Snapshot {
  const s = useFiGo.getState();
  return { userName: s.userName, accounts: s.accounts, transactions: s.transactions, budgets: s.budgets, bills: s.bills, goals: s.goals, pinHash: s.pinHash };
}

/** Loads the signed-in user's data from the cloud and keeps it saved on every change. */
export function useCloudSync(userId: string) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastName = "";

    (async () => {
      const [{ data: row, error: e1 }, { data: profile }] = await Promise.all([
        supabase.from("user_data").select("data").eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
      ]);
      if (cancelled) return;
      if (e1) { setError("Không tải được dữ liệu. Vui lòng thử lại."); return; }

      const displayName = profile?.display_name ?? "";
      const saved = row?.data as Partial<Snapshot> | undefined;
      if (saved && Array.isArray(saved.accounts)) {
        useFiGo.setState({
          userName: saved.userName || displayName,
          accounts: saved.accounts ?? [],
          transactions: saved.transactions ?? [],
          budgets: saved.budgets ?? [],
          bills: saved.bills ?? [],
          goals: saved.goals ?? [],
          pinHash: saved.pinHash ?? null,
        });
      } else {
        // New account: start clean at 0 đ — the user enters their own real data.
        useFiGo.setState({ userName: displayName });
        await supabase.from("user_data").upsert({ user_id: userId, data: snapshot() as never });
      }
      lastName = useFiGo.getState().userName;
      useFiGo.getState().setHydrated();
      setReady(true);

      unsub = useFiGo.subscribe(() => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          const snap = snapshot();
          const { error } = await supabase.from("user_data").upsert({ user_id: userId, data: snap as never, updated_at: new Date().toISOString() });
          if (error) console.error("Sync failed", error.message);
          if (snap.userName !== lastName) {
            lastName = snap.userName;
            await supabase.from("profiles").update({ display_name: snap.userName }).eq("id", userId);
          }
        }, 700);
      });
    })();

    return () => { cancelled = true; unsub?.(); clearTimeout(timer); };
  }, [userId]);

  return { ready, error };
}
