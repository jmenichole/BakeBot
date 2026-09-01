-- Migration: 013_guest_requests
-- Description: Table to store incoming guest requests from embedded widget

CREATE TABLE IF NOT EXISTS public.guest_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  carrier_gateway text,
  event_date timestamptz,
  pickup_or_delivery text,
  servings integer,
  flavor text,
  design_notes text,
  design_reference_url text,
  status text DEFAULT 'pending', -- pending | approved | rejected | needs_info
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_requests_created_at ON public.guest_requests(created_at DESC);

-- Ensure a generic update_updated_at function exists (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for guest_requests if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_guest_requests') THEN
    CREATE TRIGGER set_updated_at_guest_requests
      BEFORE UPDATE ON public.guest_requests
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
