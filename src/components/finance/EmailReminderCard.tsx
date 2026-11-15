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
      const { data: row } = await (supabase as any).from("profiles").select("email_reminders").eq("id", id).maybeSingle();
      if (alive) setOn(row?.email_reminders ?? true);
    })();
    return () => { alive = false; };
  }, []);

  const change = async (value: boolean) => {
    setOn(value);
    const { data } = await supabase.auth.getUser();
    const id = data.user?.id;
    if (!id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("profiles").update({ email_reminders: value }).eq("id", id);
    if (error) { setOn(!value); toast.error("Không lưu được, thử lại sau."); return; }
    toast.success(value ? "Đã bật nhắc hoá đơn qua email" : "Đã tắt nhắc hoá đơn qua email");
  };

  return (
    <Panel>
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Mail className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">Nhắc hoá đơn qua email</h2>
          <p className="text-sm text-muted-foreground">Mỗi sáng, gửi email khi có hoá đơn còn tối đa 3 ngày nữa đến hạn.</p>
        </div>
        <Switch checked={on ?? true} disabled={on === null} onCheckedChange={(v) => void change(v)} aria-label="Bật tắt nhắc hoá đơn qua email" />
      </div>
    </Panel>
  );
}
