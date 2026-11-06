import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Bell, CalendarClock, KeyRound, LogOut, Moon, PiggyBank, Settings, Sun, Target, UserRound, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { activeBudgets, billStatus, budgetProgress, goalStats } from "@/lib/finance";
import { formatVnd, monthKey } from "@/lib/format";
import { getCategory } from "@/lib/categories";
import { useFiGo } from "@/lib/store";
import { useTheme } from "@/lib/theme";

function useNotifications() {
  const bills = useFiGo((s) => s.bills);
  const budgets = useFiGo((s) => s.budgets);
  const goals = useFiGo((s) => s.goals);
  const txs = useFiGo((s) => s.transactions);
  const items: { id: string; kind: "bill" | "budget" | "goal"; title: string; detail: string; billId?: string; danger?: boolean }[] = [];
  for (const b of bills) {
    if (!b.reminder) continue;
    const st = billStatus(b);
    if (st.overdue || (!st.paid && st.daysLeft <= 5)) items.push({ id: "b" + b.id, kind: "bill", billId: b.id, danger: st.overdue, title: b.name, detail: `${formatVnd(b.amount)} · ${st.overdue ? `quá hạn ${-st.daysLeft} ngày` : st.daysLeft === 0 ? "đến hạn hôm nay" : `còn ${st.daysLeft} ngày`}` });
  }
  for (const b of activeBudgets(budgets)) {
    const p = budgetProgress(b, txs);
    if (p.status === "safe") continue;
    const name = b.categoryId === "all" ? "Toàn bộ chi tiêu" : getCategory(b.categoryId).name;
    items.push({ id: "g" + b.id, kind: "budget", danger: p.status === "over", title: `Ngân sách ${name}`, detail: p.status === "over" ? `Đã vượt hạn mức (${Math.round(p.pct)}%)` : `Đã dùng ${Math.round(p.pct)}% hạn mức` });
  }
  for (const g of goals) {
    const s = goalStats(g);
    if (!s.done && s.daysLeft <= 30) items.push({ id: "o" + g.id, kind: "goal", danger: s.daysLeft < 0, title: `${g.emoji} ${g.name}`, detail: s.daysLeft < 0 ? "Đã quá hạn mục tiêu" : `Còn ${s.daysLeft} ngày, thiếu ${formatVnd(s.remaining)}` });
  }
  return items;
}

export function NotificationBell() {
  const items = useNotifications();
  const toggleBillPaid = useFiGo((s) => s.toggleBillPaid);
  const icons = { bill: CalendarClock, budget: PiggyBank, goal: Target };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Thông báo" className="glass relative rounded-full">
          <Bell className="size-[18px]" />
          {items.length > 0 && <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full gradient-coral px-1 text-[10px] font-bold text-coral-foreground">{items.length}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="border-b p-3 font-bold">Thông báo</div>
        <div className="max-h-96 overflow-y-auto p-2">
          {items.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Không có thông báo mới 🎉</p>}
          {items.map((n) => {
            const Icon = icons[n.kind];
            return (
              <div key={n.id} className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-muted/60">
                <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${n.danger ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}><Icon className="size-4" /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{n.title}</p><p className="text-xs text-muted-foreground">{n.detail}</p></div>
                 {n.billId && <Button size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={() => { if (!n.billId) return; toggleBillPaid(n.billId, monthKey(), true); toast.success("Đã ghi nhận khoản đã trả"); }}>Ghi đã trả</Button>}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AccountMenu() {
  const navigate = useNavigate();
  const userName = useFiGo((s) => s.userName);
  const setUserName = useFiGo((s) => s.setUserName);
  const { theme, toggle } = useTheme();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [dlg, setDlg] = useState<null | "info" | "name" | "password">(null);
  const [name, setName] = useState("");
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
      if (data.user) supabase.from("profiles").select("phone, birth_year").eq("id", data.user.id).maybeSingle().then(({ data: p }) => {
        setPhone(p?.phone ?? "");
        setBirthYear(p?.birth_year ? String(p.birth_year) : "");
      });
    });
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    useFiGo.setState({ hydrated: false });
    useFiGo.getState().resetAll();
    toast.success("Đã đăng xuất");
    navigate({ to: "/auth", replace: true });
  }

  function saveName(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 1 || n.length > 60) { toast.error("Tên dài 1–60 ký tự"); return; }
    setUserName(n); setDlg(null); toast.success("Đã đổi tên hiển thị");
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 6) { toast.error("Mật khẩu mới tối thiểu 6 ký tự"); return; }
    if (pw !== pw2) { toast.error("Mật khẩu nhập lại không khớp"); return; }
    setBusy(true);
    const { error: e1 } = await supabase.auth.signInWithPassword({ email, password: cur });
    if (e1) { setBusy(false); { toast.error("Mật khẩu hiện tại không đúng"); return; } }
    const { error } = await supabase.auth.updateUser({ password: pw, current_password: cur } as never);
    setBusy(false);
    if (error) { toast.error(/pwned|weak/i.test(error.message) ? "Mật khẩu quá dễ đoán" : error.message); return; }
    setDlg(null); setCur(""); setPw(""); setPw2(""); toast.success("Đã đổi mật khẩu");
  }

  const initial = (userName || email || "?").trim().charAt(0).toUpperCase();
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Tài khoản" className="size-10 rounded-full bg-accent font-bold text-accent-foreground">{initial}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel><p className="truncate">{userName || "Bạn"}</p><p className="truncate text-xs font-normal text-muted-foreground">{email}</p></DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDlg("info")}><UserRound /> Thông tin tài khoản</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => { setName(userName); setDlg("name"); }}><UserRound /> Đổi tên hiển thị</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDlg("password")}><KeyRound /> Đổi mật khẩu</DropdownMenuItem>
          <DropdownMenuItem onSelect={toggle}>{theme === "dark" ? <Sun /> : <Moon />} {theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}</DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/budgets"><PiggyBank /> Ngân sách</Link></DropdownMenuItem>
           <DropdownMenuItem asChild><Link to="/goals"><Target /> Mục tiêu tiết kiệm</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/settings"><Settings /> Cài đặt</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={signOut} className="text-destructive focus:text-destructive"><LogOut /> Đăng xuất</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dlg !== null} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent className="max-w-sm">
          {dlg === "info" && <><DialogHeader><DialogTitle>Thông tin tài khoản</DialogTitle></DialogHeader>
            <div className="space-y-2 text-sm"><p><span className="text-muted-foreground">Tên hiển thị:</span> <strong>{userName}</strong></p><p><span className="text-muted-foreground">Email:</span> <strong>{email}</strong></p>{phone && <p><span className="text-muted-foreground">Số điện thoại:</span> <strong>{phone}</strong></p>}{birthYear && <p><span className="text-muted-foreground">Năm sinh:</span> <strong>{birthYear}</strong></p>}</div></>}
          {dlg === "name" && <form onSubmit={saveName} className="space-y-4"><DialogHeader><DialogTitle>Đổi tên hiển thị</DialogTitle></DialogHeader>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus /><Button type="submit" className="w-full">Lưu</Button></form>}
          {dlg === "password" && <form onSubmit={savePassword} className="space-y-3"><DialogHeader><DialogTitle>Đổi mật khẩu</DialogTitle></DialogHeader>
            <div><Label htmlFor="cpw">Mật khẩu hiện tại</Label><Input id="cpw" type="password" className="mt-1" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></div>
            <div><Label htmlFor="npw">Mật khẩu mới</Label><Input id="npw" type="password" className="mt-1" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></div>
            <div><Label htmlFor="npw2">Nhập lại mật khẩu mới</Label><Input id="npw2" type="password" className="mt-1" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></div>
            <Button type="submit" className="w-full" disabled={busy}>Đổi mật khẩu</Button></form>}
        </DialogContent>
      </Dialog>
    </>
  );
}
