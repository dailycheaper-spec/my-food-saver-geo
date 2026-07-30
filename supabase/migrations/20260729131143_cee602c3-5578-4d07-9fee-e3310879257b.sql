ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_note text;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_customer_note_length_chk;
ALTER TABLE public.orders ADD CONSTRAINT orders_customer_note_length_chk CHECK (customer_note IS NULL OR char_length(customer_note) <= 300);