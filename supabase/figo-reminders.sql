-- FiGo: nhắc hoá đơn qua email. Dán vào Supabase → SQL Editor → Run (chạy MỘT lần).

-- 1) Công tắc bật/tắt email nhắc của từng người dùng (mặc định: bật)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_reminders boolean NOT NULL DEFAULT true;

-- 2) Nhật ký đã gửi, để mỗi hoá đơn chỉ nhắc một lần cho mỗi kỳ
CREATE TABLE IF NOT EXISTS public.reminder_log (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id text NOT NULL,
  period text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bill_id, period)
);
ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;  -- không có chính sách nào: chỉ máy chủ (khoá bí mật) đọc ghi được
REVOKE ALL ON public.reminder_log FROM anon, authenticated;
GRANT ALL ON public.reminder_log TO service_role;
