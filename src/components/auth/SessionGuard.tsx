import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useFiGo } from "@/lib/store";

const IDLE_MS = 8 * 60_000; // đứng yên 8 phút -> đăng xuất
const AWAY_MS = 3 * 60_000; // rời tab / khoá màn hình / ngủ máy quá 3 phút -> đăng xuất
const WARN_MS = 30_000; // báo trước 30 giây
const KEY = "figo_last_active";

export function clearActivityMark() {
  try { sessionStorage.removeItem(KEY); } catch { /* bỏ qua */ }
}

/**
 * Tự đăng xuất để bảo vệ dữ liệu, giống app ngân hàng.
 * Dùng mốc giờ (không chỉ đồng hồ đếm) vì trình duyệt đóng băng bộ đếm khi máy ngủ hoặc tab bị ẩn.
 */
export function SessionGuard() {
  const navigate = useNavigate();
  const navRef = useRef(navigate);
  navRef.current = navigate;
  const [warnLeft, setWarnLeft] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const last = useRef(Date.now()); // lần cuối người dùng thao tác
  const lastWrite = useRef(0);
  const awaySince = useRef<number | null>(null);
  const lastTick = useRef(Date.now());
  const done = useRef(false);

  const mark = (t: number) => {
    last.current = t;
    if (t - lastWrite.current > 2000) {
      lastWrite.current = t;
      try { sessionStorage.setItem(KEY, String(t)); } catch { /* bỏ qua */ }
    }
  };

  const logout = async (reason: "idle" | "away" | "manual") => {
    if (done.current) return;
    done.current = true;
    setLocked(true); // che toàn bộ dữ liệu ngay lập tức
    try { await supabase.auth.signOut({ scope: "local" }); } catch { /* bỏ qua */ }
    useFiGo.setState({ hydrated: false });
    useFiGo.getState().resetAll();
    try { sessionStorage.clear(); } catch { /* bỏ qua */ }
    toast(reason === "manual" ? "Đã đăng xuất" : reason === "idle" ? "Đã tự đăng xuất vì bạn không thao tác trong 8 phút" : "Đã tự đăng xuất để bảo vệ dữ liệu của bạn");
    navRef.current({ to: "/auth", replace: true });
  };

  useEffect(() => {
    // Mở lại tab được khôi phục / tải lại trang sau thời gian dài
    let stored = 0;
    try { stored = Number(sessionStorage.getItem(KEY)) || 0; } catch { /* bỏ qua */ }
    if (stored && Date.now() - stored > AWAY_MS) { void logout("away"); return; }
    mark(Date.now());

    const onActivity = () => { if (!done.current) { mark(Date.now()); setWarnLeft((v) => (v === null ? v : null)); } };
    const events = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true, capture: true }));

    const checkAway = () => {
      const t = awaySince.current;
      awaySince.current = null;
      if (t && Date.now() - t > AWAY_MS) void logout("away");
      lastTick.current = Date.now();
    };
    const onVis = () => { if (document.visibilityState === "hidden") awaySince.current = Date.now(); else checkAway(); };
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      let s = 0;
      try { s = Number(sessionStorage.getItem(KEY)) || 0; } catch { /* bỏ qua */ }
      if (s && Date.now() - s > AWAY_MS) { setLocked(true); void logout("away"); }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onPageShow);

    const timer = window.setInterval(() => {
      if (done.current) return;
      const now = Date.now();
      const gap = now - lastTick.current;
      lastTick.current = now;
      if (gap > 10_000 && gap > AWAY_MS) { setLocked(true); void logout("away"); return; } // máy vừa ngủ lâu
      const idle = now - last.current;
      if (idle >= IDLE_MS) void logout("idle");
      else if (idle >= IDLE_MS - WARN_MS) setWarnLeft(Math.max(1, Math.ceil((IDLE_MS - idle) / 1000)));
    }, 1000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity, { capture: true }));
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onPageShow);
      window.clearInterval(timer);
    };
  }, []);

  if (locked) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <p className="text-sm">Đang bảo vệ dữ liệu của bạn…</p>
      </div>
    );
  }
  if (warnLeft === null) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4" role="alertdialog" aria-modal="true" aria-labelledby="idle-title">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-neutral-900">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck className="size-6" /></span>
        <h2 id="idle-title" className="mt-3 text-lg font-bold">Bạn vẫn đang ở đó chứ?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Để bảo vệ dữ liệu, FiGo sẽ tự đăng xuất sau <strong className="text-foreground">{warnLeft}</strong> giây.</p>
        <Button className="mt-5 h-11 w-full" onClick={() => { mark(Date.now()); setWarnLeft(null); }}>Tiếp tục sử dụng</Button>
        <button type="button" onClick={() => void logout("manual")} className="mt-2 h-10 w-full text-sm font-medium text-muted-foreground">Đăng xuất ngay</button>
      </div>
    </div>
  );
}
