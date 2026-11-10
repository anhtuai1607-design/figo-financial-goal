import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, type PointerEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { AlertCircle, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/AppShell";
import { useFiGo } from "@/lib/store";
import { SquirrelScene, type SquirrelMood } from "@/components/auth/SquirrelScene";

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

const EMAIL_RE = /^[^\s@.][^\s@]*@[^\s@]+\.[^\s@.]{2,}$/;
const TYPOS: Record<string, string> = { "gmail.con": "gmail.com", "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gamil.com": "gmail.com", "gmail.co": "gmail.com", "gmail.cm": "gmail.com", "gmail.comm": "gmail.com", "hotmai.com": "hotmail.com", "hotmial.com": "hotmail.com", "hotmail.con": "hotmail.com", "yahoo.con": "yahoo.com", "yaho.com": "yahoo.com", "outlok.com": "outlook.com", "outlook.con": "outlook.com", "icloud.con": "icloud.com" };

function emailError(v: string) {
  const e = v.trim();
  if (!e) return "Vui lòng nhập email";
  if (!EMAIL_RE.test(e) || e.includes("..") || e.length > 255) return "Email chưa đúng định dạng (ví dụ: ban@gmail.com)";
  return null;
}
function emailHint(v: string) {
  const [u, d] = v.trim().toLowerCase().split("@");
  const fix = d ? TYPOS[d] : undefined;
  return fix && u ? `${u}@${fix}` : null;
}
const pwRules = (p: string) => [
  { ok: p.length >= 8, label: "Ít nhất 8 ký tự" },
  { ok: /[A-Za-z]/.test(p), label: "Có chữ cái" },
  { ok: /\d/.test(p), label: "Có chữ số" },
];

function viError(msg: string) {
  if (/invalid login/i.test(msg)) return "Email hoặc mật khẩu không đúng";
  if (/already registered|already exists/i.test(msg)) return "Email này đã được đăng ký";
  if (/pwned|weak|compromised/i.test(msg)) return "Mật khẩu quá dễ đoán, hãy chọn mật khẩu khác";
  if (/rate|too many/i.test(msg)) return "Bạn thao tác quá nhanh, thử lại sau ít phút";
  if (/network|fetch/i.test(msg)) return "Không kết nối được mạng, hãy thử lại";
  return msg;
}

const inputCls = (bad: boolean) => `h-11 rounded-2xl bg-muted ${bad ? "border-destructive bg-destructive/5 focus-visible:ring-destructive/30" : ""}`;

function Field({ id, label, error, children }: { id: string; label: string; error?: string | null; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p role="alert" className="flex items-center gap-1 text-xs font-medium text-destructive"><AlertCircle className="size-3.5 shrink-0" />{error}</p>}
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
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverErr, setServerErr] = useState<{ field: "email" | "password" | "both" | "form"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [focusPw, setFocusPw] = useState(false);
  const [flash, setFlash] = useState<"happy" | "sad" | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  const mood: SquirrelMood = flash ?? (focusPw ? "shy" : "idle");
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const clear = () => setServerErr(null);

  const errors = {
    name: mode === "up" && name.trim().length < 2 ? "Hãy nhập họ và tên (ít nhất 2 ký tự)" : null,
    email: emailError(email) ?? (serverErr && (serverErr.field === "email" || serverErr.field === "both") ? serverErr.message : null),
    password: !password ? "Vui lòng nhập mật khẩu" : mode === "up" && !pwRules(password).every((r) => r.ok) ? "Mật khẩu chưa đủ mạnh" : serverErr && (serverErr.field === "password" || serverErr.field === "both") ? (serverErr.field === "both" ? " " : serverErr.message) : null,
    confirm: mode === "up" && confirm !== password ? "Mật khẩu nhập lại chưa khớp" : null,
  };
  const show = (k: keyof typeof errors) => (touched[k] || (serverErr && (k === "email" || k === "password"))) && errors[k];
  const hint = mode === "up" || touched.email ? emailHint(email) : null;

  function flashMood(m: "happy" | "sad", ms = 1100) { setFlash(m); window.setTimeout(() => setFlash(null), ms); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirm: true });
    const order: (keyof typeof errors)[] = ["name", "email", "password", "confirm"];
    const firstBad = order.find((k) => errors[k] && !(k === "password" && serverErr));
    if (firstBad) { flashMood("sad"); document.getElementById(firstBad)?.focus(); return; }
    setLoading(true);
    clear();
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim() } } });
        if (error) throw error;
        if (data.session) {
          setUserName(name.trim());
          await supabase.from("profiles").update({ display_name: name.trim() }).eq("id", data.session.user.id);
          flashMood("happy");
          toast.success(`Chào mừng ${name.trim()} đến với FiGo!`);
          window.setTimeout(() => navigate({ to: "/", replace: true }), 650);
          return;
        }
        toast.success("Đăng ký thành công, hãy đăng nhập");
        setMode("in");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      flashMood("happy");
      toast.success("Đăng nhập thành công");
      window.setTimeout(() => navigate({ to: "/", replace: true }), 650);
    } catch (err) {
      const message = viError((err as Error).message);
      setServerErr({ field: /đã được đăng ký/.test(message) ? "email" : /không đúng/.test(message) ? "both" : /dễ đoán/.test(message) ? "password" : "form", message });
      flashMood("sad");
    } finally {
      setLoading(false);
    }
  }

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPointer({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 });
  };

  const pwField = (id: "password" | "confirm", label: string, value: string, set: (v: string) => void, visible: boolean, toggle: () => void, auto: string) => (
    <Field id={id} label={label} error={show(id) ? (errors[id] === " " ? null : errors[id]) : null}>
      <div className="relative">
        <Input id={id} type={visible ? "text" : "password"} autoComplete={auto} value={value} onChange={(e) => { set(e.target.value); clear(); }} onFocus={() => id === "password" && setFocusPw(true)} onBlur={() => { touch(id); if (id === "password") setFocusPw(false); }} aria-invalid={!!show(id)} placeholder={mode === "up" && id === "password" ? "Tối thiểu 8 ký tự, gồm chữ và số" : "••••••••"} className={`${inputCls(!!show(id))} pr-11`} />
        <button type="button" onClick={toggle} aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background">{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
      </div>
    </Field>
  );

  return (
    <div className="grid min-h-dvh gap-4 p-3 lg:grid-cols-[1.1fr_1fr] lg:gap-8 lg:p-4">
      <div onPointerMove={onMove} onPointerLeave={() => setPointer({ x: 0, y: 0 })} className="relative min-h-[18rem] overflow-hidden rounded-[2rem] bg-[#0a3326] shadow-2xl lg:min-h-[calc(100dvh-2rem)]">
        <SquirrelScene mood={mood} px={pointer.x} py={pointer.y} />
        <span className="absolute left-0 top-0 rounded-br-3xl bg-black/35 px-5 py-2.5 text-xs font-bold tracking-widest text-white backdrop-blur">TIẾT KIỆM ĐƠN GIẢN</span>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#06261c] via-[#06261c]/85 to-transparent px-6 pb-5 pt-16 text-white lg:px-8 lg:pb-7">
          <p className="text-xs font-bold tracking-widest text-emerald-300">BẮT ĐẦU MIỄN PHÍ</p>
          <h2 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight lg:text-4xl">Gom từng hạt vàng,<br />thành mục tiêu lớn</h2>
          <p className="mt-2 hidden max-w-md text-sm text-white/75 lg:block">Ghi chi tiêu, đặt mục tiêu tiết kiệm và theo dõi mọi thứ trên một ứng dụng gọn gàng.</p>
          <div className="mt-4 hidden items-center gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur lg:flex">
            <Logo size={44} />
            <div className="min-w-0 flex-1"><p className="truncate font-bold">FiGo: Finance & Goal</p><p className="truncate text-xs text-white/70">Quản lý thu chi, ngân sách, mục tiêu</p></div>
            <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold">Miễn phí</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-1 py-4 lg:px-6">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="lg:hidden"><Logo size={48} /></div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight lg:mt-0 lg:text-3xl">{mode === "in" ? "Chào mừng trở lại" : "Tạo tài khoản"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{mode === "in" ? "Đăng nhập để tiếp tục quản lý tài chính" : "Chỉ mất chưa đến một phút"}</p>
          </div>
          <div className="mt-5 grid grid-cols-2 rounded-2xl bg-muted p-1 text-sm font-medium">
            {(["in", "up"] as const).map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); setTouched({}); clear(); }} className={`rounded-xl py-2 transition-colors ${mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>{m === "in" ? "Đăng nhập" : "Đăng ký"}</button>
            ))}
          </div>
          <form onSubmit={submit} noValidate className="mt-5 space-y-3.5">
            {mode === "up" && (
              <Field id="name" label="Họ và tên" error={show("name")}>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => touch("name")} aria-invalid={!!show("name")} placeholder="Nguyễn Văn A" maxLength={60} className={inputCls(!!show("name"))} />
              </Field>
            )}
            <Field id="email" label="Email" error={show("email")}>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); clear(); }} onBlur={() => touch("email")} aria-invalid={!!show("email")} placeholder="ban@gmail.com" className={inputCls(!!show("email"))} />
              {hint && <button type="button" onClick={() => setEmail(hint)} className="text-xs font-medium text-amber-600 underline">Ý bạn là {hint}?</button>}
            </Field>
            {pwField("password", "Mật khẩu", password, setPassword, showPw, () => setShowPw((v) => !v), mode === "in" ? "current-password" : "new-password")}
            {mode === "up" && password && (
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {pwRules(password).map((r) => <li key={r.label} className={`flex items-center gap-1 ${r.ok ? "text-primary" : "text-destructive"}`}>{r.ok ? <Check className="size-3.5" /> : <AlertCircle className="size-3.5" />}{r.label}</li>)}
              </ul>
            )}
            {mode === "up" && pwField("confirm", "Nhập lại mật khẩu", confirm, setConfirm, showPw2, () => setShowPw2((v) => !v), "new-password")}
            {serverErr && serverErr.field !== "email" && (
              <div role="alert" className="flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" />{serverErr.message}</div>
            )}
            <Button type="submit" disabled={loading} className="h-12 w-full rounded-2xl gradient-primary text-base text-primary-foreground">
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === "in" ? "Đăng nhập" : "Tạo tài khoản & vào ngay"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
