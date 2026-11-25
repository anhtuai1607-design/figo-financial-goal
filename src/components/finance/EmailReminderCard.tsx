import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/finance/Common";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

/** Công tắc bật/tắt email nhắc hoá đơn (lưu ở bảng profiles). */
export function EmailReminderCard() {
  const [on, setOn] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id;
      if (!id) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: row } = await (supabase as any)
        .from("profiles")
        .select("email_reminders")
        .eq("id", id)
        .maybeSingle();
      if (alive) setOn(row?.email_reminders ?? true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const change = async (value: boolean) => {
    setOn(value);
    const { data } = await supabase.auth.getUser();
    const id = data.user?.id;
    if (!id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ email_reminders: value })
      .eq("id", id);
    if (error) {
      setOn(!value);
      toast.error("Không lưu được, thử lại sau.");
      return;
    }
    toast.success(value ? "Đã bật nhắc hoá đơn qua email" : "Đã tắt nhắc hoá đơn qua email");
  };

  return (
    <Panel>
      <div className="flex items-center gap-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-primary">
          <Mail className="size-[18px]" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">Nhắc hóa đơn qua email</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Thông báo tự động trước 3 ngày, 1 ngày và đúng ngày đến hạn (tự dừng khi đã thanh toán).
          </p>
        </div>
        <Switch
          checked={on ?? true}
          disabled={on === null}
          onCheckedChange={(v) => void change(v)}
          aria-label="Bật tắt nhắc hoá đơn qua email"
        />
      </div>
    </Panel>
  );
}
