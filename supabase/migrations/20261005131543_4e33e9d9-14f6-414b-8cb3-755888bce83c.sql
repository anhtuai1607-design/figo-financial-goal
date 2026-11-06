CREATE TABLE public.sepay_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  amount bigint NOT NULL CHECK (amount >= 10000),
  account_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','applied')),
  bank_ref text,
  paid_amount bigint,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sepay_deposits TO authenticated;
GRANT UPDATE (status) ON public.sepay_deposits TO authenticated;
GRANT ALL ON public.sepay_deposits TO service_role;
ALTER TABLE public.sepay_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own deposits read" ON public.sepay_deposits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own deposits create" ON public.sepay_deposits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "own deposits apply" ON public.sepay_deposits FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'paid') WITH CHECK (status = 'applied');