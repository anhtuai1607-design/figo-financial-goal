import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import {
  CalendarDays,
  CheckCircle2,
  Coins,
  ImagePlus,
  Pencil,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, PageHeader, Panel, metaFor } from "@/components/finance/Common";
import { goalStats, accountBalance } from "@/lib/finance";
import { formatDate, formatVnd, formatVndInput, parseVndInput } from "@/lib/format";
import { useFiGo } from "@/lib/store";
import { useUI } from "@/lib/ui-store";
import { compressImage } from "@/lib/image";
import type { Goal } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({
    meta: metaFor(
      "Mục tiêu tiết kiệm",
      "Lập quỹ, theo dõi tiến độ và biết số tiền cần góp mỗi tháng.",
    ),
  }),
  component: GoalsPage,
});

const DEPOSIT_CHIPS = [
  { label: "+100k", value: 100_000 },
  { label: "+500k", value: 500_000 },
  { label: "+1tr", value: 1_000_000 },
];

function GoalsPage() {
  const goals = useFiGo((s) => s.goals);
  const accounts = useFiGo((s) => s.accounts);
  const add = useFiGo((s) => s.addGoal);
  const update = useFiGo((s) => s.updateGoal);
  const remove = useFiGo((s) => s.removeGoal);
  const deposit = useFiGo((s) => s.depositGoal);
  const txs = useFiGo((s) => s.transactions);
  const triggerMascot = useUI((s) => s.triggerMascot);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  const [depositing, setDepositing] = useState<Goal | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [accountId, setAccountId] = useState("");

  const show = (goal?: Goal) => {
    setEditing(goal ?? null);
    setName(goal?.name ?? "");
    setTarget(goal ? formatVndInput(goal.target) : "");
    setDeadline(
      goal?.deadline.slice(0, 10) ??
        new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    );
    setImage(goal?.image);
    setOpen(true);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = parseVndInput(target);
    if (!name.trim() || !value || !deadline) {
      toast.error("Vui lòng điền đủ thông tin.");
      return;
    }
    if (editing) {
      update(editing.id, {
        name: name.trim(),
        target: value,
        deadline: new Date(`${deadline}T23:59:59`).toISOString(),
        image,
      });
    } else {
      add({
        name: name.trim(),
        target: value,
        deadline: new Date(`${deadline}T23:59:59`).toISOString(),
        emoji: "",
        image,
      });
    }
    toast.success(editing ? "Đã cập nhật mục tiêu." : "Đã tạo mục tiêu mới.");
    triggerMascot({
      mood: editing ? "happy" : "celebrate",
      message: editing
        ? `Đã cập nhật mục tiêu "${name.trim()}".`
        : `Đã khởi tạo quỹ mục tiêu "${name.trim()}".`,
    });
    setOpen(false);
  };

  const submitDeposit = (e: FormEvent) => {
    e.preventDefault();
    if (!depositing) return;
    const value = parseVndInput(depositAmount);
    if (!value) {
      toast.error("Số tiền phải lớn hơn 0 đ.");
      return;
    }
    const err = deposit(depositing.id, value, accountId);
    if (err) {
      toast.error(err);
      return;
    }
    const finished = depositing.saved + value >= depositing.target;
    toast.success("Đã nạp tiền vào mục tiêu.");
    triggerMascot({
      mood: "celebrate",
      message: finished
        ? `Hoàn thành 100% mục tiêu "${depositing.name}".`
        : `Đã góp +${formatVnd(value)} vào quỹ "${depositing.name}".`,
    });
    setDepositing(null);
  };

  return (
    <div>
      <PageHeader
        title="Mục tiêu tiết kiệm"
        subtitle="Phân bổ kế hoạch tích luỹ theo lộ trình định kỳ"
        action={
          <Button onClick={() => show()}>
            <Plus /> Tạo mục tiêu
          </Button>
        }
      />

      {goals.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal, idx) => {
            const st = goalStats(goal);
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <Panel className="relative h-full overflow-hidden">
                  <div className="relative h-36 overflow-hidden rounded-xl border border-border bg-muted/50">
                    {goal.image ? (
                      <img src={goal.image} alt={goal.name} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <Target className="size-8 opacity-45" strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="absolute right-1.5 top-1.5 flex rounded-lg border border-white/15 bg-black/55 backdrop-blur-sm [&_button]:text-white">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => show(goal)}
                        aria-label="Sửa mục tiêu"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 hover:text-red-300"
                        onClick={() => {
                          if (
                            !window.confirm(
                              `Xoá mục tiêu "${goal.name}"? Số tiền đã tích luỹ trong mục tiêu này sẽ không còn được theo dõi.`,
                            )
                          )
                            return;
                          remove(goal.id);
                          toast.success("Đã xoá mục tiêu.");
                        }}
                        aria-label="Xoá mục tiêu"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                  <h2 className="mt-4 text-base font-semibold">{goal.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                    {formatVnd(goal.saved)} / {formatVnd(goal.target)}
                  </p>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: st.pct / 100 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      style={{ transformOrigin: "left" }}
                      className="h-full w-full rounded-full bg-primary"
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs tabular-nums">
                    <strong className="font-semibold text-primary">{st.pct}%</strong>
                    <span className="text-muted-foreground">Còn {formatVnd(st.remaining)}</span>
                  </div>
                  <div className="mt-4 rounded-xl border border-border bg-muted/35 p-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2 tabular-nums">
                      <CalendarDays className="size-3.5 shrink-0" strokeWidth={1.5} /> Hạn{" "}
                      {formatDate(goal.deadline)} ·{" "}
                      {st.daysLeft >= 0 ? `${st.daysLeft} ngày nữa` : `quá ${-st.daysLeft} ngày`}
                    </div>
                    {!st.done && (
                      <div className="mt-2 flex items-center gap-2 tabular-nums">
                        <Coins className="size-3.5 shrink-0" strokeWidth={1.5} /> Gợi ý góp{" "}
                        {formatVnd(st.perMonth)}/tháng
                      </div>
                    )}
                  </div>
                  <Button
                    className="mt-4 w-full"
                    variant={st.done ? "outline" : "default"}
                    disabled={st.done}
                    onClick={() => {
                      setDepositing(goal);
                      setDepositAmount("");
                      setAccountId(accounts[0]?.id ?? "");
                    }}
                  >
                    {st.done ? (
                      <>
                        <CheckCircle2 /> Đã hoàn thành
                      </>
                    ) : (
                      <>
                        <Plus /> Nạp tiền vào quỹ
                      </>
                    )}
                  </Button>
                </Panel>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Panel>
          <EmptyState
            title="Chưa có mục tiêu"
            text="Khởi tạo quỹ dự phòng hoặc mục tiêu tài sản đầu tiên."
            action={
              <Button onClick={() => show()}>
                <Plus /> Tạo mục tiêu
              </Button>
            }
          />
        </Panel>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] rounded-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa mục tiêu" : "Tạo mục tiêu"}</DialogTitle>
            <DialogDescription>FiGo sẽ tính mức tích lũy khuyến nghị mỗi tháng.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Tên mục tiêu</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Quỹ dự phòng 6 tháng"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Số tiền cần đạt</Label>
              <Input
                value={target}
                onChange={(e) => setTarget(formatVndInput(parseVndInput(e.target.value)))}
                inputMode="numeric"
                className="mt-1 tabular-nums"
              />
            </div>
            <div>
              <Label>Ngày hoàn thành dự kiến</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1 tabular-nums"
              />
            </div>
            <div>
              <Label>Ảnh minh hoạ (tuỳ chọn)</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  if (!f.type.startsWith("image/")) {
                    toast.error("Vui lòng chọn tệp ảnh.");
                    return;
                  }
                  try {
                    setImage(await compressImage(f));
                  } catch {
                    toast.error("Không thể xử lý ảnh này.");
                  }
                }}
              />
              {image ? (
                <div className="relative mt-2 overflow-hidden rounded-xl border border-border">
                  <img src={image} alt="Ảnh mục tiêu" className="h-40 w-full object-cover" />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute right-2 top-2"
                    onClick={() => setImage(undefined)}
                    aria-label="Xoá ảnh"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-2 flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:border-primary/40"
                >
                  <ImagePlus className="size-5" strokeWidth={1.5} />
                  Tải ảnh mục tiêu
                </button>
              )}
            </div>
            <Button type="submit" className="w-full">
              Lưu mục tiêu
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(depositing)} onOpenChange={(v) => !v && setDepositing(null)}>
        <DialogContent className="w-[calc(100%-1.5rem)] rounded-xl">
          <DialogHeader>
            <DialogTitle>Nạp quỹ</DialogTitle>
            <DialogDescription>{depositing?.name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitDeposit} className="space-y-4">
            <div>
              <Label>Số tiền nạp</Label>
              <Input
                value={depositAmount}
                onChange={(e) => setDepositAmount(formatVndInput(parseVndInput(e.target.value)))}
                inputMode="numeric"
                className="mt-1 h-10 tabular-nums"
              />
              {depositing && (
                <>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {DEPOSIT_CHIPS.map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() =>
                          setDepositAmount(formatVndInput(parseVndInput(depositAmount) + c.value))
                        }
                        className="tactile rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium tabular-nums hover:border-primary/40 hover:bg-accent/60"
                      >
                        {c.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setDepositAmount(
                          formatVndInput(Math.max(0, depositing.target - depositing.saved)),
                        )
                      }
                      className="tactile rounded-lg border border-primary/25 bg-accent px-2.5 py-1 text-xs font-medium text-primary hover:bg-accent/80"
                    >
                      Đủ mục tiêu
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
                    Mục tiêu còn cần {formatVnd(Math.max(0, depositing.target - depositing.saved))}
                  </p>
                </>
              )}
            </div>
            <div>
              <Label>Trừ từ tài khoản</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} · {formatVnd(accountBalance(a, txs))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">
              Xác nhận nạp tiền
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
