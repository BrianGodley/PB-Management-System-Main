-- Adjusted total price for an estimate. When set, the bid created from the
-- estimate uses this number instead of the natural sum of module prices, and
-- the EstimateDetail page shows a second "Adjusted" GPMD bar alongside the
-- natural one. Null = no adjustment, behave as before.
ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS adjusted_price numeric;
