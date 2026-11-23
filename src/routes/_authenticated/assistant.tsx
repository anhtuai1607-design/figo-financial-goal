import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { ArrowUp, History, MessageSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader, metaFor } from "@/components/finance/Common";
import { SquirrelMascot } from "@/components/mascot/SquirrelMascot";
import { askAssistant } from "@/lib/assistant.functions";
import { getCategory } from "@/lib/categories";
import {
  activeBudgets,
  budgetProgress,
  categoryBreakdown,
  monthTotals,
  totalBalance,
} from "@/lib/finance";
import { formatDate, formatVnd, monthKey, uid } from "@/lib/format";
import { useFiGo } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: metaFor(
      "Trợ lý AI tài chính",
      "Hỏi FiGo về chi tiêu, ngân sách và mục tiêu tiết kiệm của bạn.",
    ),
  }),
  component: AssistantPage,
});

const SUGGEST = [
  "Tháng này tôi chi nhiều nhất vào đâu?",
  "Ngân sách nào sắp vượt?",
  "Làm sao tiết kiệm thêm 2 triệu tháng này?",
  "So sánh chi tiêu tháng này với tháng trước",
];

type Msg = { role: "user" | "assistant"; content: string };

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Msg[];
}

const STORAGE_KEY = "figo_assistant_sessions_v1";

function loadSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function useFinanceContext() {
  const s = useFiGo();
  return () => {
    const now = monthKey();
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const prev = monthKey(d);
    const lines = [
      `Hôm nay: ${formatDate(new Date().toISOString())}. Tổng số dư: ${formatVnd(totalBalance(s.accounts, s.transactions))}.`,
      `Tài khoản: ${s.accounts.map((a) => a.name).join(", ")}.`,
      ...[now, prev].map((k) => {
        const t = monthTotals(s.transactions, k);
        return `Tháng ${k}: thu ${formatVnd(t.income)}, chi ${formatVnd(t.expense)}, ${t.count} giao dịch. Chi theo danh mục: ${
          categoryBreakdown(s.transactions, k)
            .map((c) => `${c.name} ${formatVnd(c.amount)}`)
            .join("; ") || "chưa có"
        }.`;
      }),
      `Ngân sách tháng này: ${
        activeBudgets(s.budgets)
          .map((b) => {
            const p = budgetProgress(b, s.transactions);
            return `${b.categoryId === "all" ? "Toàn bộ" : getCategory(b.categoryId).name} đã dùng ${formatVnd(p.spent)}/${formatVnd(b.limit)}`;
          })
          .join("; ") || "chưa đặt"
      }.`,
      `Hoá đơn định kỳ: ${s.bills.map((b) => `${b.name} ${formatVnd(b.amount)} ngày ${b.dueDay}${b.paidMonths.includes(now) ? " (đã trả)" : ""}`).join("; ") || "không có"}.`,
      `Mục tiêu: ${s.goals.map((g) => `${g.name} ${formatVnd(g.saved)}/${formatVnd(g.target)} hạn ${formatDate(g.deadline)}`).join("; ") || "không có"}.`,
      "60 giao dịch gần nhất:",
      ...s.transactions
        .slice(0, 60)
        .map(
          (t) =>
            `${formatDate(t.date)} ${t.type === "income" ? "+" : t.type === "expense" ? "-" : "~"}${formatVnd(t.amount)} ${getCategory(t.categoryId).name}${t.note ? ` (${t.note})` : ""}`,
        ),
    ];
    return lines.join("\n").slice(0, 19000);
  };
}

function AssistantPage() {
  const ask = useServerFn(askAssistant);
  const buildContext = useFinanceContext();
  const sessions = useFiGo((s) => s.assistantSessions);
  const setSessions = useFiGo((s) => s.setAssistantSessions);
  const triggerMascot = useUI((s) => s.triggerMascot);
  const started = useRef(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  // Khởi tạo đọc lịch sử từ localStorage
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // Chuyển lịch sử cũ (lưu riêng trên máy này) lên cloud một lần.
    const old = loadSessions();
    let list = sessions;
    if (old.length > 0) {
      const ids = new Set(sessions.map((x) => x.id));
      list = [...sessions, ...old.filter((x) => !ids.has(x.id))].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      );
      setSessions(list);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* bỏ qua */
      }
    }
    const first = list[0];
    if (first) {
      setCurrentId(first.id);
      setMsgs(first.messages);
    }
  }, []);

  // Khi thiết bị khác thêm tin nhắn vào cuộc trò chuyện đang mở, cập nhật theo.
  useEffect(() => {
    if (busy || !currentId) return;
    const cur = sessions.find((x) => x.id === currentId);
    if (cur && cur.messages.length !== msgs.length) setMsgs(cur.messages);
  }, [sessions, busy, currentId]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  function startNewChat() {
    setCurrentId(null);
    setMsgs([]);
    setText("");
    setHistoryOpen(false);
  }

  function selectSession(session: ChatSession) {
    setCurrentId(session.id);
    setMsgs(session.messages);
    setHistoryOpen(false);
  }

  function deleteSession(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    toast.success("Đã xoá cuộc trò chuyện.");
    if (currentId === id) {
      const nextFirst = updated[0];
      if (nextFirst) {
        setCurrentId(nextFirst.id);
        setMsgs(nextFirst.messages);
      } else {
        startNewChat();
      }
    }
  }

  async function send(q: string) {
    if (!q.trim() || busy) return;
    const userMsg: Msg = { role: "user", content: q.trim() };
    const next = [...msgs, userMsg];
    setMsgs(next);
    setText("");
    setBusy(true);

    try {
      const r = await ask({ data: { context: buildContext(), messages: next.slice(-12) } });
      if (r.error) {
        toast.error(r.error);
        setMsgs(next.slice(0, -1));
        setText(q);
      } else {
        const fullMsgs: Msg[] = [...next, { role: "assistant", content: r.text }];
        setMsgs(fullMsgs);
        triggerMascot({
          mood: "happy",
          message: "Trợ lý AI vừa trả lời xong! Bạn muốn hỏi thêm gì không?",
        });

        // Lưu / cập nhật phiên trò chuyện
        const now = new Date().toISOString();
        let targetId = currentId;
        let updatedList: ChatSession[];

        if (!targetId) {
          targetId = uid();
          setCurrentId(targetId);
          const title = q.trim().slice(0, 38) + (q.trim().length > 38 ? "…" : "");
          const newSess: ChatSession = {
            id: targetId,
            title,
            createdAt: now,
            updatedAt: now,
            messages: fullMsgs,
          };
          updatedList = [newSess, ...sessions];
        } else {
          updatedList = sessions.map((s) =>
            s.id === targetId ? { ...s, messages: fullMsgs, updatedAt: now } : s,
          );
        }

        setSessions(updatedList);
      }
    } catch {
      toast.error("Không kết nối được trợ lý AI.");
      setMsgs(next.slice(0, -1));
      setText(q);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-12rem)] flex-col">
      <PageHeader
        title="Trợ lý AI"
        subtitle="Hỏi bất cứ điều gì về thu chi của bạn"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen(true)}
              className="rounded-xl"
            >
              <History className="size-4" />
              Lịch sử
              {sessions.length > 0 && (
                <span className="ml-1 rounded-full bg-accent px-1.5 py-0.2 text-[10px] font-bold text-accent-foreground">
                  {sessions.length}
                </span>
              )}
            </Button>
            <Button
              size="sm"
              onClick={startNewChat}
              className="rounded-xl gradient-primary text-primary-foreground"
            >
              <Plus className="size-4" />
              Đoạn chat mới
            </Button>
          </div>
        }
      />

      {/* Drawer Lịch sử trò chuyện */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader className="text-left">
            <SheetTitle>Lịch sử trò chuyện</SheetTitle>
            <SheetDescription>Các câu hỏi và phân tích tài chính trước đây</SheetDescription>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-2">
            <Button
              onClick={startNewChat}
              variant="outline"
              className="w-full justify-start gap-2 rounded-2xl"
            >
              <Plus className="size-4" />
              Cuộc trò chuyện mới
            </Button>
          </div>
          <ScrollArea className="mt-4 h-[calc(100dvh-12rem)] pr-2">
            <div className="space-y-2">
              {sessions.map((s) => {
                const isActive = s.id === currentId;
                return (
                  <div
                    key={s.id}
                    onClick={() => selectSession(s)}
                    className={cn(
                      "group flex cursor-pointer items-start justify-between gap-3 rounded-2xl p-3 text-left transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground shadow-xs"
                        : "bg-muted/50 hover:bg-muted text-foreground",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-semibold text-sm">
                        <MessageSquare className="size-3.5 shrink-0 opacity-70" />
                        <p className="truncate">{s.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(s.updatedAt, "HH:mm · dd/MM/yyyy")} · {s.messages.length} tin
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => deleteSession(e, s.id)}
                      className="size-8 shrink-0 text-muted-foreground opacity-70 hover:opacity-100 hover:text-destructive"
                      aria-label="Xoá cuộc trò chuyện"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })}
              {sessions.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  <p>Chưa có cuộc trò chuyện nào được lưu.</p>
                  <p className="mt-1 text-xs">Hãy đặt câu hỏi để bắt đầu!</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Vùng tin nhắn */}
      <div className="flex-1 space-y-3 pb-4">
        {!msgs.length && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="ios-card p-6 text-center"
          >
            <div className="mx-auto flex justify-center">
              <SquirrelMascot mood="thinking" size={84} />
            </div>
            <p className="mt-2 font-bold">Trợ lý đọc sổ thu chi của bạn để trả lời</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Đặt câu hỏi hoặc chọn một trong các gợi ý bên dưới:
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {SUGGEST.map((q) => (
                <motion.button
                  key={q}
                  type="button"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => send(q)}
                  className="rounded-xl border border-border/50 bg-muted/70 px-3.5 py-2.5 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent/50"
                >
                  {q}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
        {msgs.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm"
                  : "ios-card max-w-[90%] whitespace-pre-wrap rounded-3xl rounded-bl-md px-4 py-3 text-sm leading-relaxed"
              }
            >
              {m.content.replace(/\*\*/g, "")}
            </div>
          </motion.div>
        ))}
        {busy && (
          <div className="ios-card flex w-fit items-center gap-2 rounded-3xl px-4 py-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1" aria-hidden>
              <span
                className="size-1.5 rounded-full bg-primary"
                style={{ animation: "typing-dot 1.1s infinite ease-in-out" }}
              />
              <span
                className="size-1.5 rounded-full bg-primary"
                style={{ animation: "typing-dot 1.1s 0.18s infinite ease-in-out" }}
              />
              <span
                className="size-1.5 rounded-full bg-primary"
                style={{ animation: "typing-dot 1.1s 0.36s infinite ease-in-out" }}
              />
            </span>
            <span>Đang phân tích…</span>
          </div>
        )}
        <div ref={end} />
      </div>

      {/* Thanh nhập câu hỏi */}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          send(text);
        }}
        className="sticky bottom-24 flex gap-2 rounded-full border bg-card/90 p-1.5 shadow-glass backdrop-blur-xl lg:bottom-4"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Hỏi trợ lý…"
          className="h-11 rounded-full border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
          aria-label="Câu hỏi"
        />
        <Button
          type="submit"
          size="icon"
          disabled={busy || !text.trim()}
          className="size-11 rounded-full"
          aria-label="Gửi"
        >
          <ArrowUp />
        </Button>
      </form>
    </div>
  );
}
