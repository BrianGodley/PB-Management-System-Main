-- ============================================================
-- BT v2 schedule import fields on schedule_items
-- ============================================================
ALTER TABLE schedule_items
  ADD COLUMN IF NOT EXISTS bt_schedule_id      BIGINT,
  ADD COLUMN IF NOT EXISTS completed_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by_name   TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS schedule_items_bt_id_idx
  ON schedule_items(bt_schedule_id) WHERE bt_schedule_id IS NOT NULL;
