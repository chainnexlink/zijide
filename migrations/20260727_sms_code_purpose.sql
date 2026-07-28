-- Bind every OTP to the operation for which it was issued. Without this,
-- a code issued for login/change-phone could be replayed in another flow.
ALTER TABLE public.sms_codes
  ADD COLUMN IF NOT EXISTS purpose text;

CREATE INDEX IF NOT EXISTS idx_sms_codes_phone_purpose
  ON public.sms_codes(phone, purpose, created_at DESC);
