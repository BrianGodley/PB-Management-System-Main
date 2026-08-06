-- ─────────────────────────────────────────────────────────────────────────────
-- Single Resolution Path — PHASE 1: product_type + classification
--
-- Foundation for the target model in docs/target-data-model.md. This is ADDITIVE
-- and non-breaking: it introduces the product_type contract and tags existing
-- material_rates rows with it. No estimator behavior changes yet — later phases
-- (vendor_product_price primary, estimate_line by id) build on this.
--
-- product_type answers "how is this class of product calculated, and what
-- attributes must its rows carry" — i.e. it formalizes what sub_category + the
-- (untyped) calc_meta blob imply today.
--
-- Run on STAGING first, confirm counts, then PROD. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) product_type — global reference table (calc contract, not tenant data).
CREATE TABLE IF NOT EXISTS product_type (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key              text UNIQUE NOT NULL,          -- stable code the app keys on
  label            text NOT NULL,
  calc_kind        text NOT NULL,                 -- which estimator routine applies
  unit_basis       text,                          -- 'area' | 'linear' | 'each' | 'count'
  attribute_schema jsonb NOT NULL DEFAULT '{}',   -- required attribute contract
  notes            text
);

ALTER TABLE product_type ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_type' AND policyname = 'product_type_read') THEN
    CREATE POLICY product_type_read ON product_type FOR SELECT USING (true);
  END IF;
END $$;

-- 2) Seed the product types (one per estimator picker class).
--    attribute_schema documents the calc_meta contract each row of this type
--    should satisfy; unit_basis tells the calc how quantity is measured.
INSERT INTO product_type (key, label, calc_kind, unit_basis, attribute_schema) VALUES
  ('cmu_block',        'CMU Block',            'cmu_count',      'count',  '{"block_w_in":"number","block_h_in":"number","block_l_in":"number"}'),
  ('modular_wall',     'Modular Wall Unit',    'cmu_count',      'count',  '{"block_w_in":"number","block_h_in":"number","block_l_in":"number"}'),
  ('drain_pipe',       'Drain Pipe',           'linear_labored','linear', '{"laborPerLF":"number"}'),
  ('drain_fixture',    'Drain Fixture',        'each_labored',  'each',   '{"laborHrs":"number"}'),
  ('utility_line',     'Utility Line',         'linear_labored','linear', '{}'),
  ('gas_fixture',      'Gas Fixture',          'each_labored',  'each',   '{}'),
  ('electrical_fixture','Electrical Fixture',  'each_labored',  'each',   '{}'),
  ('wall_finish',      'Wall Finish',          'area_finish',   'area',   '{"unit":"SF|ton","labMode":"perDay|perSF","laborCoeff":"number","waste":"number?","tonPerSF":"number?","adhesivePerSF":"number?","screwPer5":"number?","delivPerTon":"number?","misc":"number?","addPerSF":"number?"}'),
  ('wall_cap',         'Wall Cap',             'linear_finish', 'linear', '{"laborCoeff":"number"}'),
  ('turf_brand',       'Turf Brand',           'area_material', 'area',   '{}'),
  ('turf_base',        'Turf Base',            'turf_base',     'area',   '{"qtyUnit":"ton|roll","laborCoeff":"number?","coverage":"number?"}'),
  ('paver_material',   'Paver Material',       'area_material', 'area',   '{"sf_per_pallet":"number?","price_per_lf_vert":"number?"}'),
  ('base_material',    'Base Material',        'area_material', 'area',   '{}'),
  ('light_fixture',    'Light Fixture',        'each_material', 'each',   '{"watts":"number?","va":"number?","labor_hrs_ea":"number?"}'),
  ('transformer',      'Transformer',          'each_material', 'each',   '{}'),
  ('wire',             'Wire',                 'linear_material','linear','{}'),
  ('sod',              'Sod',                  'area_material', 'area',   '{}'),
  ('soil_prep',        'Soil Prep',            'area_material', 'area',   '{}'),
  ('soil',             'Soil',                 'volume_material','count', '{}'),
  ('fertilizer',       'Fertilizer',           'coverage_material','count','{}'),
  ('mulch',            'Mulch',                'volume_material','count', '{}'),
  ('dg',               'Decomposed Granite',   'weight_material','count', '{}'),
  ('gravel',           'Gravel',               'volume_material','count', '{}'),
  ('pebble',           'Pebble',               'volume_material','count', '{}'),
  ('cobble',           'Cobble',               'volume_material','count', '{}'),
  ('stepper',          'Stepper',              'weight_material','count', '{}'),
  ('edging',           'Edging',               'linear_material','linear','{}'),
  ('concrete_mix',     'Concrete Mix',         'volume_material','count', '{}'),
  ('concrete_base',    'Concrete Base',        'volume_material','count', '{}')
ON CONFLICT (key) DO NOTHING;

-- 3) material_rates gains the type reference (nullable; rows classify by marker).
ALTER TABLE material_rates ADD COLUMN IF NOT EXISTS product_type_id uuid REFERENCES product_type(id);

-- 4) Backfill: map each sub_category marker to its product_type.
WITH marker_map(marker, type_key) AS (VALUES
  ('Modular Wall','modular_wall'),
  ('Drain Pipe','drain_pipe'),
  ('Drain Fixtures','drain_fixture'),
  ('Utility Lines','utility_line'),
  ('Gas Fixtures','gas_fixture'),
  ('Electrical Fixtures','electrical_fixture'),
  ('Wall Finish','wall_finish'),
  ('Wall Cap','wall_cap'),
  ('Turf Material','turf_brand'),
  ('Turf Base','turf_base'),
  ('Paver Material','paver_material'),
  ('Base Material','base_material'),
  ('Light Fixture','light_fixture'),
  ('Transformer','transformer'),
  ('Wire','wire'),
  ('Sod','sod'),
  ('Soil Prep','soil_prep'),
  ('Soils','soil'),
  ('Fertilizer','fertilizer'),
  ('Mulch','mulch'),
  ('DG','dg'),
  ('Gravel','gravel'),
  ('Pebble','pebble'),
  ('Cobbles','cobble'),
  ('Steppers','stepper'),
  ('Edging','edging'),
  ('Concrete Mix','concrete_mix'),
  ('Concrete Base','concrete_base')
)
UPDATE material_rates m
   SET product_type_id = pt.id
  FROM marker_map mm
  JOIN product_type pt ON pt.key = mm.type_key
 WHERE m.sub_category = mm.marker
   AND m.product_type_id IS NULL;

-- 5) CMU blocks are code-defined today (no marker) — classify by name/category.
UPDATE material_rates m
   SET product_type_id = pt.id
  FROM product_type pt
 WHERE pt.key = 'cmu_block'
   AND m.category = 'Walls'
   AND m.name LIKE 'Wall Block %'
   AND m.product_type_id IS NULL;

-- 6) Sanity check — classified vs unclassified counts (review before PROD).
--    Unclassified rows are fine (basic materials, one-offs); this just reports.
-- SELECT COALESCE(pt.key,'(unclassified)') AS type, count(*)
--   FROM material_rates m LEFT JOIN product_type pt ON pt.id = m.product_type_id
--  GROUP BY 1 ORDER BY 2 DESC;
