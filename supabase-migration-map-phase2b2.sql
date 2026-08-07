-- ─────────────────────────────────────────────────────────────────────────────
-- Pricing rebuild — PHASE 2b (Layer 2): sub-category homing for MATERIAL rows
--
-- Fills material_migration_map.subcat_code (+ collection attribute + note flags)
-- for every kind='material' row. Staging only — NOTHING is moved. Re-runnable.
--
-- Requires Layer 1 (supabase-migration-map-phase2b1.sql) to have built the map.
-- Sub-category CODES target the taxonomy in supabase-taxonomy-phase1.sql
-- (+ PACC from supabase-misc-rates-and-pacc.sql).
-- ─────────────────────────────────────────────────────────────────────────────

update public.material_migration_map set subcat_code=null, collection=null, note=null where kind='material';

-- ARTIFICIAL TURF
update public.material_migration_map m set subcat_code = case
  when m.sub_category='Turf Material' then 'TMAT'
  when m.sub_category='Turf Base'     then 'TBASE'
  when m.name ilike '%infill%'        then 'TINF'
  else 'TACC' end
 where m.kind='material' and m.category='Artificial Turf';

-- BASIC MATERIALS
update public.material_migration_map m set subcat_code = case m.sub_category
  when 'Aggregate & Concrete' then 'AGG' when 'Grout' then 'GRT' when 'Reinforcement' then 'RBR' end
 where m.kind='material' and m.category='Basic Materials';

-- COLUMNS
update public.material_migration_map m set subcat_code =
  case when m.name ~* 'block|rebar|grout|cmu|fill' then 'CBLK' else 'CFIN' end
 where m.kind='material' and m.category='Columns';

-- CONCRETE
update public.material_migration_map m set subcat_code = case
  when m.name ilike '%import base%' then 'CBSE'
  when m.name ilike '%per cy%' and m.name not ilike '%color%' then 'CMIX'
  else 'CACC' end
 where m.kind='material' and m.category='Concrete';

-- DRAINAGE
update public.material_migration_map m set subcat_code = case
  when m.name ilike '%pipe%' then 'DPIPE'
  when m.name ~* 'drain|catch basin|inlet|downspout|atrium' then 'DFIX'
  else 'DADD' end
 where m.kind='material' and m.category='Drainage';

-- FINISHES
update public.material_migration_map m set subcat_code =
  case when m.name ilike '%cap%' then 'FCAP' else 'FMAT' end
 where m.kind='material' and m.category='Finishes';

-- FIRE PIT
update public.material_migration_map m set subcat_code = case
  when m.name ilike '%gas%' then 'UGAS'
  when m.name ~* 'block|concrete|rebar|grout' then 'FPBLK'
  else 'FPFIN' end
 where m.kind='material' and m.category='Fire Pit';

-- GROUND TREATMENTS (+ 'Ground Treaments' typo)
update public.material_migration_map m set subcat_code = case
  when m.sub_category='Cobbles' then 'COBL'   when m.sub_category='DG' then 'DG'
  when m.sub_category='Edging' then 'EDGE'     when m.sub_category='Fabrics' then 'FAB'
  when m.sub_category='Fertilizer' then 'FERT' when m.sub_category='Gravel' then 'GRVL'
  when m.sub_category='Mulch' then 'MULCH'     when m.sub_category='Pebble' then 'PEBL'
  when m.sub_category='Sod' then 'SOD'         when m.sub_category='Soils' then 'SOIL'
  when m.sub_category='Steppers' then 'STPR'
  when m.name ~* 'decomposed| dg|^dg' then 'DG'
  when m.name ilike '%fabric%' then 'FAB'
  when m.name ilike '%mulch%' then 'MULCH'
  when m.name ~* 'soil prep|prep' then 'SPREP'
  end
 where m.kind='material' and m.category in ('Ground Treatments','Ground Treaments');

-- IRRIGATION
update public.material_migration_map m set subcat_code = case
  when m.sub_category='Controllers' then 'ICTRL' when m.sub_category='Drip' then 'IDRIP'
  when m.sub_category='Glue and Solvents' then 'IGLUE' when m.sub_category='Pipe' then 'IPIPE'
  when m.sub_category='Sprinklers' then 'ISPR' when m.sub_category='Valves' then 'IVLV'
  when m.name ~* 'timer|controller' then 'ICTRL'
  else 'IFIT' end
 where m.kind='material' and m.category='Irrigation';

-- LIGHTING (Path/Well collapse to LFIX, keep style as attribute)
update public.material_migration_map m
  set subcat_code = case when m.sub_category='Transformer' then 'LTRAN'
                         when m.sub_category='Wire' then 'LWIRE' else 'LFIX' end,
      collection  = case when m.sub_category in ('Path','Well') then m.sub_category end
 where m.kind='material' and m.category='Lighting';

-- OUTDOOR KITCHEN (Sink Plumbing flagged for decision)
update public.material_migration_map m
  set subcat_code = case
        when m.name ilike '%gas%' then 'UGAS'
        when m.name ~* 'gfic|outlet|electr' then 'UELEC'
        when m.name ~* 'sink|plumb' then null
        when m.name ~* 'block|concrete|rebar|fill|appliance|hardware' then 'OKBLK'
        else 'OKFIN' end,
      note = case when m.name ~* 'sink|plumb' then 'NEEDS HOME: Sink Plumbing - BBQ' end
 where m.kind='material' and m.category='Outdoor Kitchen';

-- PAVER (function from name; collection preserved as attribute)
update public.material_migration_map m
  set subcat_code = case
        when m.name ~* 'wall' then 'PWALL'
        when m.name ~* 'coping|bullnose' then 'PCOPE'
        when m.name ~* 'base rock|base material|roadbase|road base' then 'PBASE'
        when m.name ~* 'step' then 'PSTEP'
        when m.name ~* 'bedding|joint sand|poly sand|sealer|restraint|sleeve' then 'PACC'
        else 'PMAT' end,
      collection = case when m.sub_category is not null
                         and m.sub_category not in ('Paver Material','Base Material','Bullnose')
                        then m.sub_category end
 where m.kind='material' and m.category='Paver';

-- PLANTING
update public.material_migration_map m set subcat_code = case
  when m.sub_category='Tools' then 'PLTOOL'
  when m.name ~* 'basket|jute|mesh|root barrier|stake|barrier' then 'PLAMD'
  else 'PLPLANT' end
 where m.kind='material' and m.category='Planting';

-- POOL
update public.material_migration_map m set subcat_code = case
  when m.name ilike '%coping%' then 'POCOPE'
  when m.name ilike '%interior%' then 'POFIN'
  when m.name ~* 'tile|glass|segmental|multi-piece' then 'POTILE'
  when m.name ~* 'raised|lip|flagstone|ledgerstone|stucco|shotcrete' then 'POACC'
  else 'POEQP' end
 where m.kind='material' and m.category='Pool';

-- STEPS
update public.material_migration_map m set subcat_code='SMAT'
 where m.kind='material' and m.category='Steps';

-- UTILITIES (+ 'Utilites' typo)
update public.material_migration_map m set subcat_code = case
  when m.sub_category='Electrical' then 'UELEC'
  when m.name ~* 'gas ring|burner' then 'UGAS'
  when m.name ~* 'conduit' then 'ULINE'
  when m.name ~* 'gfic|outlet|electr' then 'UELEC'
  else 'ULINE' end
 where m.kind='material' and m.category in ('Utilities','Utilites');

-- WALLS
update public.material_migration_map m set subcat_code = case
  when m.sub_category in ('Modular','Modular Wall','Planter Wall') then 'WMOD'
  when m.name ilike '%cap%' then 'WCAP'
  when m.name ~* 'wp |waterproof|membrane|thoroseal|primer' then 'WWP'
  when m.name ~* 'block|concrete|rebar|grout|spec mix|bondbeam' then 'WBLK'
  else 'WFIN' end
 where m.kind='material' and m.category='Walls';

-- ── REVIEW ────────────────────────────────────────────────────────────────────
-- 1) unmapped materials (should be only the Sink Plumbing flag)
-- select category, sub_category, name, note from public.material_migration_map
--  where kind='material' and subcat_code is null order by category, name;
-- 2) homing summary (eyeball Paver PWALL/PMAT/PCOPE, Pool POEQP)
-- select category, subcat_code, count(*) from public.material_migration_map
--  where kind='material' group by category, subcat_code order by category, subcat_code;
