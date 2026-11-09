import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFiGo } from "./store";

type Snapshot = Pick<ReturnType<typeof useFiGo.getState>, "userName" | "accounts" | "transactions" | "budgets" | "bills" | "goals" | "pinHash">;

function snapshot(): Snapshot {
  const s = useFiGo.getState();
  return { userName: s.userName, accounts: s.accounts, transactions: s.transactions, budgets: s.budgets, bills: s.bills, goals: s.goals, pinHash: s.pinHash };
}

const time = (s: string) => new Date(s).getTime();

/** Gộp 2 danh sách theo id: giữ dữ liệu trên máy chủ + thêm các mục mới chỉ có trên máy này. */
function mergeById<T extends { id: string }>(remote: T[] = [], local: T[] = []): T[] {
  const ids = new Set(remote.map((x) => x.id));
  return [...remote, ...local.filter((x) => !ids.has(x.id))];
}

/**
 * Tải dữ liệu của người dùng từ cloud và lưu lại mỗi khi có thay đổi.
 * Bản này còn:
 *  - tự tải lại dữ liệu mới khi mở lại tab/ứng dụng và mỗi 20 giây (để máy tính và điện thoại thấy nhau),
 *  - không ghi đè dữ liệu mới của thiết bị khác bằng dữ liệu cũ (gộp lại thay vì xoá).
 */
export function useCloudSync(userId: string) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    let lastName = "";
    let remoteStamp = ""; // updated_at của phiên bản cloud mà máy này đã tải/ghi gần nhất
    let applying = false; // đang áp dữ liệu từ cloud -> không ghi ngược lại
    let dirty = false; // có thay đổi trên máy chưa kịp lưu

    const applyToStore = (saved: Partial<Snapshot>, fallbackName: string) => {
      applying = true;
      useFiGo.setState({
        userName: saved.userName || fallbackName,
        accounts: saved.accounts ?? [],
        transactions: saved.transactions ?? [],
        budgets: saved.budgets ?? [],
        bills: saved.bills ?? [],
        goals: saved.goals ?? [],
        pinHash: saved.pinHash ?? null,
      });
      applying = false;
    };

    /** Lấy bản mới nhất từ cloud nếu khác bản máy này đang giữ. */
    const pull = async () => {
      const { data: row, error: e } = await supabase.from("user_data").select("data, updated_at").eq("user_id", userId).maybeSingle();
      if (cancelled || e || !row) return;
      if (remoteStamp && time(row.updated_at) === time(remoteStamp)) return;
      const saved = row.data as Partial<Snapshot> | undefined;
      if (!saved || !Array.isArray(saved.accounts)) return;
      applyToStore(saved, useFiGo.getState().userName);
      remoteStamp = row.updated_at;
      lastName = useFiGo.getState().userName;
    };

    const save = async () => {
      // Trước khi ghi, kiểm tra xem thiết bị khác đã lưu bản mới hơn chưa.
      const { data: cur } = await supabase.from("user_data").select("data, updated_at").eq("user_id", userId).maybeSingle();
      if (cancelled) return;
      if (cur && remoteStamp && time(cur.updated_at) !== time(remoteStamp)) {
        const remote = cur.data as Partial<Snapshot> | undefined;
        if (remote && Array.isArray(remote.accounts)) {
          const local = snapshot();
          applyToStore(
            {
              userName: remote.userName || local.userName,
              accounts: mergeById(remote.accounts, local.accounts),
              transactions: mergeById(remote.transactions, local.transactions).sort((a, b) => b.date.localeCompare(a.date)),
              budgets: mergeById(remote.budgets, local.budgets),
              bills: mergeById(remote.bills, local.bills),
              goals: mergeById(remote.goals, local.goals),
              pinHash: remote.pinHash ?? local.pinHash,
            },
            local.userName,
          );
        }
      }
      const snap = snapshot();
      const stamp = new Date().toISOString();
      const { error: e } = await supabase.from("user_data").upsert({ user_id: userId, data: snap as never, updated_at: stamp });
      if (e) {
        console.error("Sync failed", e.message);
        return;
      }
      remoteStamp = stamp;
      dirty = false;
      if (snap.userName !== lastName) {
        lastName = snap.userName;
        await supabase.from("profiles").update({ display_name: snap.userName }).eq("id", userId);
      }
    };

    const refreshIfIdle = () => {
      if (document.visibilityState === "visible" && !dirty) void pull();
    };

    (async () => {
      const [{ data: row, error: e1 }, { data: profile }] = await Promise.all([
        supabase.from("user_data").select("data, updated_at").eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
      ]);
      if (cancelled) return;
      if (e1) { setError("Không tải được dữ liệu. Vui lòng thử lại."); return; }

      const displayName = profile?.display_name ?? "";
      const saved = row?.data as Partial<Snapshot> | undefined;
      if (row && saved && Array.isArray(saved.accounts)) {
        applyToStore(saved, displayName);
        remoteStamp = row.updated_at;
      } else {
        // Tài khoản mới: bắt đầu từ 0 đ, người dùng tự nhập dữ liệu thật.
        useFiGo.setState({ userName: displayName });
        const stamp = new Date().toISOString();
        await supabase.from("user_data").upsert({ user_id: userId, data: snapshot() as never, updated_at: stamp });
        remoteStamp = stamp;
      }
      lastName = useFiGo.getState().userName;
      useFiGo.getState().setHydrated();
      setReady(true);

      unsub = useFiGo.subscribe(() => {
        if (applying) return;
        dirty = true;
        clearTimeout(timer);
        timer = setTimeout(() => { void save(); }, 700);
      });

      document.addEventListener("visibilitychange", refreshIfIdle);
      window.addEventListener("focus", refreshIfIdle);
      poll = setInterval(refreshIfIdle, 20000);
    })();

    return () => {
      cancelled = true;
      unsub?.();
      clearTimeout(timer);
      if (poll) clearInterval(poll);
      document.removeEventListener("visibilitychange", refreshIfIdle);
      window.removeEventListener("focus", refreshIfIdle);
    };
  }, [userId]);

  return { ready, error };
}
