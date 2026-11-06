import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/AppShell";
import { useFiGo } from "@/lib/store";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Đăng nhập — FiGo" },
      { name: "description", content: "Đăng nhập hoặc tạo tài khoản FiGo để quản lý tài chính cá nhân trên mọi thiết bị." },
      { property: "og:title", content: "Đăng nhập — FiGo" },
      { property: "og:description", content: "Đăng nhập hoặc tạo tài khoản FiGo để quản lý tài chính cá nhân." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const CURRENT_YEAR = new Date().getFullYear();

const schema = z.object({
  email: z.string().trim().email("Email không hợp lệ").max(255),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").max(72),
  confirm: z.string().max(72),
  name: z.string().trim().min(1, "Hãy nhập họ và tên").max(60),
  phone: z.string().trim().regex(/^0\d{9}$/, "Số điện thoại gồm 10 số, bắt đầu bằng 0 (VD: 0901234567)"),
  birthYear: z.number().int().min(1940, "Năm sinh không hợp lệ").max(CURRENT_YEAR - 5, "Năm sinh không hợp lệ"),
});

function viError(msg: string) {
  if (/invalid login/i.test(msg)) return "Email hoặc mật khẩu không đúng";
  if (/already registered|already exists/i.test(msg)) return "Email này đã được đăng ký";
  if (/pwned|weak|compromised/i.test(msg)) return "Mật khẩu quá dễ đoán, hãy chọn mật khẩu khác";
  if (/rate|too many/i.test(msg)) return "Bạn thao tác quá nhanh, thử lại sau ít phút";
  return msg;
}

function PasswordField({ id, label, value, onChange, autoComplete, show, toggleShow }: {
  id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string; show: boolean; toggleShow: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type={show ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Tối thiểu 6 ký tự" className="h-11 rounded-2xl bg-muted pr-11" required />
        <button type="button" onClick={toggleShow} aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"} className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground">
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const setUserName = useFiGo((s) => s.setUserName);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({
      email,
      password,
      confirm: mode === "up" ? confirm : password,
      name: mode === "up" ? name : "bạn",
      phone: mode === "up" ? phone : "0900000000",
      birthYear: mode === "up" ? Number(birthYear) : 1990,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ"); return; }
    if (mode === "up" && confirm !== password) { toast.error("Mật khẩu nhập lại không khớp"); return; }
    setLoading(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: parsed.data.name, phone: parsed.data.phone, birth_year: String(parsed.data.birthYear) },
          },
        });
        if (error) throw error;
        // Đăng ký thành công là vào thẳng ứng dụng
        if (data.session) {
          setUserName(parsed.data.name);
          const { error: pErr } = await supabase.from("profiles").update({
            display_name: parsed.data.name, phone: parsed.data.phone, birth_year: parsed.data.birthYear,
          }).eq("id", data.session.user.id);
          if (pErr) console.error("profile update failed", pErr.message);
          toast.success(`Chào mừng ${parsed.data.name} đến với FiGo!`);
          navigate({ to: "/", replace: true });
          return;
        }
        toast.success("Đăng ký thành công, hãy đăng nhập");
        setMode("in");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
      if (error) throw error;
      toast.success("Đăng nhập thành công");
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(viError((err as Error).message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="glass w-full max-w-sm rounded-[1.75rem] p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <Logo size={52} />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{mode === "in" ? "Đăng nhập FiGo" : "Tạo tài khoản"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Quản lý tài chính & mục tiêu của bạn</p>
        </div>
        <div className="mt-6 grid grid-cols-2 rounded-2xl bg-muted p-1 text-sm font-medium">
          {(["in", "up"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-xl py-2 transition-colors ${mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
              {m === "in" ? "Đăng nhập" : "Đăng ký"}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="mt-5 space-y-3.5">
          {mode === "up" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="name">Họ và tên</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" maxLength={60} className="h-11 rounded-2xl bg-muted" />
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input id="phone" type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="0901234567" className="h-11 rounded-2xl bg-muted" />
                </div>
                <div className="w-28 space-y-1.5">
                  <Label htmlFor="birthYear">Năm sinh</Label>
                  <Input id="birthYear" inputMode="numeric" value={birthYear} onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1998" className="h-11 rounded-2xl bg-muted" />
                </div>
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@email.com" className="h-11 rounded-2xl bg-muted" required />
          </div>
          <PasswordField id="password" label="Mật khẩu" value={password} onChange={setPassword} autoComplete={mode === "in" ? "current-password" : "new-password"} show={showPw} toggleShow={() => setShowPw((v) => !v)} />
          {mode === "up" && <PasswordField id="confirm" label="Nhập lại mật khẩu" value={confirm} onChange={setConfirm} autoComplete="new-password" show={showPw2} toggleShow={() => setShowPw2((v) => !v)} />}
          <Button type="submit" disabled={loading} className="h-12 w-full rounded-2xl gradient-primary text-base text-primary-foreground">
            {loading && <Loader2 className="size-4 animate-spin" />}
            {mode === "in" ? "Đăng nhập" : "Tạo tài khoản & vào ngay"}
          </Button>
        </form>
      </div>
    </div>
  );
}
