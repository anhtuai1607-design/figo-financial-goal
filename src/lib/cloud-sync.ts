import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFiGo } from "./store";
import type { ChatSession } from "./types";

type Snapshot = Pick<ReturnType<typeof useFiGo.getState>, "userName" | "accounts" | "transactions" | "budgets" | "bills" | "goals" | "pinHash" | "assistantSessions" | "customCategories">;

function snapshot(): Snapshot {
  const s = useFiGo.getState();
  return { userName: s.userName, accounts: s.accounts, transactions: s.transactions, budgets: s.budgets, bills: s.bills, goals: s.goals, pinHash: s.pinHash, assistantSessions: s.assistantSessions, customCategories: s.customCategories };
}

const time = (s: string) => new Date(s).getTime();

/** Gộp 2 danh sách theo id: giữ dữ liệu trên máy chủ + thêm các mục mới chỉ có trên máy này. */
function mergeById<T extends { id: string }>(remote: T[] = [], local: T[] = []): T[] {
  const ids = new Set(remote.map((x) => x.id));
  return [...remote, ...local.filter((x) => !ids.has(x.id))];
}

// Cứ mỗi vài giây, web hỏi cloud một câu rất nhẹ ("có bản mới không?").
// Chỉ khi có bản mới mới tải đầy đủ về.
/** Gộp lịch sử chat: cuộc trò chuyện trùng id thì giữ bản mới hơn. */
function mergeSessions(remote: ChatSession[] = [], local: ChatSession[] = []): ChatSession[] {
  const map = new Map<string, ChatSession>();
  for (const s of [...remote, ...local]) {
    const cur = map.get(s.id);
    if (!cur || s.updatedAt > cur.updatedAt) map.set(s.id, s);
  }
  return [...map.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

const CHECK_EVERY_MS = 3000;

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
    let dirty = false; // có thay đổi trên máy chưa lưu thành công
    let timerPending = false; // đã hẹn lưu nhưng chưa đến giờ
    let saving = false; // đang lưu
    let ticking = false; // đang kiểm tra bản mới

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
        assistantSessions: saved.assistantSessions ?? [],
        customCategories: saved.customCategories ?? [],
      });
      applying = false;
    };

    /** Tải bản đầy đủ từ cloud và áp vào màn hình. */
    const pull = async () => {
      const { data: row, error: e } = await supabase.from("user_data").select("data, updated_at").eq("user_id", userId).maybeSingle();
      if (cancelled || e || !row) return;
      if (timerPending || saving || dirty) return; // người dùng vừa sửa trong lúc tải -> bỏ qua, để lưu trước
      const saved = row.data as Partial<Snapshot> | undefined;
      if (!saved || !Array.isArray(saved.accounts)) return;
      applyToStore(saved, useFiGo.getState().userName);
      remoteStamp = row.updated_at;
      lastName = useFiGo.getState().userName;
    };

    const save = async () => {
      if (saving) return;
      saving = true;
      try {
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
              assistantSessions: mergeSessions(remote.assistantSessions, local.assistantSessions),
              customCategories: mergeById(remote.customCategories, local.customCategories),
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
          return; // dirty vẫn = true -> lần kiểm tra sau sẽ thử lưu lại
        }
        remoteStamp = stamp;
        dirty = false;
        if (snap.userName !== lastName) {
          lastName = snap.userName;
          await supabase.from("profiles").update({ display_name: snap.userName }).eq("id", userId);
        }
      } finally {
        saving = false;
      }
    };

    /** Chạy mỗi vài giây: lưu nếu còn thay đổi chưa lưu, ngược lại hỏi cloud có bản mới không. */
    const tick = async () => {
      if (cancelled || ticking || document.visibilityState !== "visible") return;
      if (timerPending || saving) return;
      ticking = true;
      try {
        if (dirty) { await save(); return; }
        const { data, error: e } = await supabase.from("user_data").select("updated_at").eq("user_id", userId).maybeSingle();
        if (cancelled || e || !data) return;
        if (remoteStamp && time(data.updated_at) === time(remoteStamp)) return;
        await pull();
      } finally {
        ticking = false;
      }
    };
    const kick = () => { void tick(); };

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
        timerPending = true;
        clearTimeout(timer);
        timer = setTimeout(() => {
          timerPending = false;
          void save();
        }, 700);
      });

      document.addEventListener("visibilitychange", kick);
      window.addEventListener("focus", kick);
      window.addEventListener("online", kick);
      poll = setInterval(kick, CHECK_EVERY_MS);
    })();

    return () => {
      cancelled = true;
      unsub?.();
      clearTimeout(timer);
      if (poll) clearInterval(poll);
      document.removeEventListener("visibilitychange", kick);
      window.removeEventListener("focus", kick);
      window.removeEventListener("online", kick);
    };
  }, [userId]);

  return { ready, error };
}
