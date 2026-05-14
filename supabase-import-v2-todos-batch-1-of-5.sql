-- ============================================================
-- v2 BT todos → PBS job_tasks — Batch 1 of 5
-- 1,707 todos (rows 1-1707 of 8,535)
-- Idempotent via bt_todo_id (unique partial index).
-- For each todo: look up the job by bt_job_id, try to match the BT
-- assignee_name to an active employee (case-insensitive, strips BT
-- prefixes like '(.PM) ' and '(HR) '), insert one job_tasks row.
-- ============================================================

BEGIN;

CREATE TEMP TABLE _todo_staging (
  bt_todo_id     BIGINT PRIMARY KEY,
  bt_job_id      BIGINT NOT NULL,
  title          TEXT NOT NULL,
  priority       TEXT,
  notes          TEXT,
  due_date       DATE,
  completed_at   TIMESTAMPTZ,
  completed_by   TEXT,
  assignee_name  TEXT
) ON COMMIT DROP;

INSERT INTO _todo_staging (bt_todo_id, bt_job_id, title, priority, notes, due_date, completed_at, completed_by, assignee_name) VALUES
  (91659, 38912565, 'Plants that died need to be replaced', NULL, 'Plants that died need to be replaced', NULL, NULL, NULL, 'Bryan Vielman'),
  (91660, 38912565, 'Brian said he would bring soil.', NULL, 'Brian said he would bring soil.', NULL, NULL, NULL, 'Bryan Vielman'),
  (96791, 40118858, 'move benches, add light', NULL, 'move benches, add light', NULL, NULL, NULL, NULL),
  (96792, 40118858, 'daniel to resolve bench issue with client', NULL, 'daniel to resolve bench issue with client', NULL, NULL, NULL, NULL),
  (96992, 42843186, '1. Door Hangers Out', NULL, '1. Door Hangers Out', '2026-01-28', NULL, NULL, 'Oscar Valdez'),
  (96993, 42843186, '6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (96994, 42843186, 'Production Manager Assign Project Supervisor', NULL, 'Production Manager Assign Project Supervisor', NULL, NULL, NULL, NULL),
  (96995, 42843186, 'Upload Contract', NULL, 'Upload Contract', NULL, NULL, NULL, NULL),
  (96996, 42843186, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (96997, 42843186, '1. Yard Sign', NULL, '1. Yard Sign', '2026-01-28', NULL, NULL, 'Oscar Valdez'),
  (97026, 42843186, '2. Demo: Remove existing pathway in front yard', NULL, 'approx. 110 square feet

2. Demo: Remove existing pathway in front yard', NULL, NULL, NULL, NULL),
  (97036, 42843186, '2. Demo: Excavate/Grade pathway areas', NULL, '2. Demo: Excavate/Grade pathway areas', NULL, NULL, NULL, NULL),
  (97043, 42843186, '3. Install: Base for pavers', NULL, '3. Install: Base for pavers', NULL, NULL, NULL, NULL),
  (97046, 42843186, '3. Install: Lay common brick as pavers', NULL, '3. Install: Lay common brick as pavers', NULL, NULL, NULL, NULL),
  (102295, 42843186, '3. Install: Bluestone flagstone pathway,', NULL, 'approx. 45 square feet

3. Install: Bluestone flagstone pathway,', NULL, NULL, NULL, NULL),
  (102366, 42843186, '3. Install: Sod between joints flagstone', NULL, '3. Install: Sod between joints flagstone', NULL, NULL, NULL, NULL),
  (102382, 42843186, '3. Install: Irrigation', NULL, '(2 qty.) new anti-siphon valves for drip irrigation

3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (102395, 42843186, '3. Install: Connect existing irrigation timer', NULL, '3. Install: Connect existing irrigation timer', NULL, NULL, NULL, NULL),
  (102450, 42843186, '3. Install: Plants', NULL, '3. Install: Plants', NULL, NULL, NULL, NULL),
  (102589, 42843186, '3. Install: Lighting', NULL, '3. Install: Lighting', NULL, NULL, NULL, NULL),
  (102595, 42843186, '3. Install: (Additional Options) approx. 165 linear feet of black metal edging', NULL, '3. Install: (Additional Options) approx. 165 linear feet of black metal edging', NULL, NULL, NULL, NULL),
  (129641, 43318414, '2. Demo:  lawn/weedy growth', NULL, '2. Demo:  lawn/weedy growth', NULL, NULL, NULL, NULL),
  (129643, 43318414, '2. Demo: Remove of soil in planter areas', NULL, 'approx 20 cubic yards

2. Demo: Remove of soil in planter areas', NULL, NULL, NULL, NULL),
  (129651, 43318414, '2. Demo: Remove existing concrete driveway, pool equip pad', NULL, '2. Demo: Remove existing concrete driveway, pool equip pad', NULL, NULL, NULL, NULL),
  (129653, 43318414, '2. Demo: Grade for Concrete Driveway, Pool Equip & Trash Pad', NULL, '2. Demo: Grade for Concrete Driveway, Pool Equip & Trash Pad', NULL, NULL, NULL, NULL),
  (129662, 43318414, '3. Install: Road base for concrete', NULL, '3. Install: Road base for concrete', NULL, NULL, NULL, NULL),
  (129668, 43318414, '3. Install: Rebar #3', NULL, '3. Install: Rebar #3', NULL, NULL, NULL, NULL),
  (129687, 43318414, '3. Install: Forms for Concrete Driveway, Pool Equip & Trash Pad', NULL, '3. Install: Forms for Concrete Driveway, Pool Equip & Trash Pad', NULL, NULL, NULL, NULL),
  (129693, 43318414, '3. Install: Pour concrete for Concrete Driveway, Pool Equip & Trash Pad', NULL, '2500 psi concrete with a broom finish, approx. 649 SF for all areas

3. Install: Pour concrete for Concrete Driveway, Pool Equip & Trash Pad', NULL, NULL, NULL, NULL),
  (129694, 43318414, '3. Install: Move existing pump, filter and extend plumbing to new concrete pad', NULL, '3. Install: Move existing pump, filter and extend plumbing to new concrete pad', NULL, NULL, NULL, NULL),
  (129696, 43318414, '3. Install: Connect electrical from house corner to equipment', NULL, 'bury conduit 18” deep NOTE: Heater is not to be connected

3. Install: Connect electrical from house corner to equipment', NULL, NULL, NULL, NULL),
  (129711, 43318414, '2. Demo: Remove existing lawn and Grade for artificial turf', NULL, '2. Demo: Remove existing lawn and Grade for artificial turf', NULL, NULL, NULL, NULL),
  (129715, 43318414, '3. Install: Road base for Artificial turf', NULL, '3. Install: Road base for Artificial turf', NULL, NULL, NULL, NULL),
  (129718, 43318414, '3. Install: DG for Artificial turf', NULL, '3. Install: DG for Artificial turf', NULL, NULL, NULL, NULL),
  (129720, 43318414, '3. Install: Artificial turf', NULL, '‘Simple turf’ ‘So Cal Blend 93 SH

3. Install: Artificial turf', NULL, NULL, NULL, NULL),
  (129721, 43318414, '3. Install: Infill sand and rake turf upright', NULL, '3. Install: Infill sand and rake turf upright', NULL, NULL, NULL, NULL),
  (129725, 43318414, '2. Demo: Prep soil for planter area Softscape', NULL, '2. Demo: Prep soil for planter area Softscape', NULL, NULL, NULL, NULL),
  (129727, 43318414, '3. Install: Add Starter Fertilizer', NULL, '15-15-15 starter fertilizer

3. Install: Add Starter Fertilizer', NULL, NULL, NULL, NULL),
  (129731, 43318414, '3. Install: Black metal edging', NULL, 'approx. 84 LF

3. Install: Black metal edging', NULL, NULL, NULL, NULL),
  (129733, 43318414, '3. Install: Irrigation for Softscape', NULL, '(2) zones drip line or drip emitter zones & connect to existing system

3. Install: Irrigation for Softscape', NULL, NULL, NULL, NULL),
  (129738, 43318414, 'All plants to have ‘Agri-form’ planting tabs', NULL, 'All plants to have ‘Agri-form’ planting tabs', NULL, NULL, NULL, NULL),
  (129743, 43318414, '3. Install:  wood shaving mulch approx. 2" thick', NULL, '385 Sf

3. Install:  wood shaving mulch approx. 2" thick', NULL, NULL, NULL, NULL),
  (129869, 43318414, '3. Install: Irrigation for LAWN', NULL, '3. Install: Irrigation for LAWN', NULL, NULL, NULL, NULL),
  (129870, 43318414, '2. Demo: Rototill lawn area', NULL, '6\

2. Demo: Rototill lawn area', NULL, NULL, NULL, NULL),
  (129872, 43318414, '3. Install: Sod', NULL, 'approx. 270 SF of ''Marathon I''

3. Install: Sod', NULL, NULL, NULL, NULL),
  (129904, 43318414, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (129905, 43318414, '6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (129906, 43318414, 'Production Manager Familiarize with  Job Scope, Plan and Tasks', NULL, 'Production Manager Familiarize with  Job Scope, Plan and Tasks', NULL, NULL, NULL, NULL),
  (129907, 43318414, 'Upload Any Needed Info on Materials Selections', NULL, 'Upload Any Needed Info on Materials Selections', NULL, NULL, NULL, NULL),
  (129908, 43318414, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (129909, 43318414, '1. Yard Sign', NULL, '1. Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (154139, 33691503, 'Firepit stucco removal', NULL, 'Firepit stucco removal', NULL, NULL, NULL, NULL),
  (186132, 42580132, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (186133, 42580132, '3. Pick up Job Box.', NULL, '3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (186134, 42580132, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, NULL, NULL, NULL),
  (186135, 42580132, 'Upload Bid', NULL, 'Upload Bid', NULL, NULL, NULL, NULL),
  (186136, 42580132, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (186137, 42580132, '1. Yard Sign', NULL, '1. Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (186166, 42580132, '2. Demo: Remove existing plants in planter beds', NULL, '2. Demo: Remove existing plants in planter beds', NULL, NULL, NULL, NULL),
  (186168, 42580132, '2. Demo: Remove banana plant', NULL, '2. Demo: Remove banana plant', NULL, NULL, NULL, NULL),
  (186169, 42580132, '2. Demo: Remove garden bed structure and soil', NULL, '2. Demo: Remove garden bed structure and soil', NULL, NULL, NULL, NULL),
  (186170, 42580132, '3. Install: Weed barrier Softscape', NULL, '3. Install: Weed barrier Softscape', NULL, NULL, NULL, NULL),
  (186171, 42580132, '3. Install: Plants', NULL, '3. Install: Plants', NULL, NULL, NULL, NULL),
  (186172, 42580132, '3. Install: Del Rio gravel in planters', NULL, '980 square feet

3. Install: Del Rio gravel in planters', NULL, NULL, NULL, NULL),
  (186174, 42580132, '3. Install: up to 1 ton of boulders', NULL, '3. Install: up to 1 ton of boulders', NULL, NULL, NULL, NULL),
  (186175, 42580132, '3. Install: Lighting', NULL, '3. Install: Lighting', NULL, NULL, NULL, NULL),
  (186180, 42580132, '2. Demo: Remove existing gardenia hedge (Side Yard)', NULL, '2. Demo: Remove existing gardenia hedge (Side Yard)', NULL, NULL, NULL, NULL),
  (186181, 42580132, '3. Install: Owner-provided pots (Side Yard)', NULL, '3. Install: Owner-provided pots (Side Yard)', NULL, NULL, NULL, NULL),
  (186214, 42580132, '3. Install: (5 qty.) 1 gal regular shrubs (Side Yard)', NULL, '3. Install: (5 qty.) 1 gal regular shrubs (Side Yard)', NULL, NULL, NULL, NULL),
  (186234, 42580132, '3. Install: Weed barrier (Side Yard)', NULL, '3. Install: Weed barrier (Side Yard)', NULL, NULL, NULL, NULL),
  (186239, 42580132, '3. Install: Del Rio gravel (Side Yard)', NULL, 'approx. 160 square feet

3. Install: Del Rio gravel (Side Yard)', NULL, NULL, NULL, NULL),
  (186261, 42580132, '2. Demo: Remove existing artificial turf (Kids Area)', NULL, 'approx. 90 square feet

2. Demo: Remove existing artificial turf (Kids Area)', NULL, NULL, NULL, NULL),
  (186263, 42580132, '3. Install: Weed Barrier (Kids Area)', NULL, '3. Install: Weed Barrier (Kids Area)', NULL, NULL, NULL, NULL),
  (186285, 42580132, '3. Install: Del Rio gravel in planters (Kids Area)', NULL, '3. Install: Del Rio gravel in planters (Kids Area)', NULL, NULL, NULL, NULL),
  (186287, 42580132, '3. Install: Flagstone Steppers (Kids Area)', NULL, '3. Install: Flagstone Steppers (Kids Area)', NULL, NULL, NULL, NULL),
  (186288, 42580132, '3. Install: Fill up (7 qty.) pots with succulent mix soil', NULL, '3. Install: Fill up (7 qty.) pots with succulent mix soil', NULL, NULL, NULL, NULL),
  (186290, 42580132, '3. Install: Succulents', NULL, '3. Install: Succulents', NULL, NULL, NULL, NULL),
  (203267, 43299976, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (203268, 43299976, '4. Pick up yard sign unless ok by client to leave longer.', NULL, '4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (203269, 43299976, 'Project Supervisor to have Pre Job Walk meeting with Client and Designer/Consultant', NULL, 'Project Supervisor to have Pre Job Walk meeting with Client and Designer/Consultant', NULL, NULL, NULL, NULL),
  (203270, 43299976, 'Route Project For Prep Review', NULL, 'Route Project For Prep Review', NULL, NULL, NULL, NULL),
  (203271, 43299976, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (203272, 43299976, '1. Yard Sign', NULL, '1. Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (203306, 43299976, '2. Demo: Excavate and Grade Paver Extension', NULL, '2. Demo: Excavate and Grade Paver Extension', NULL, NULL, NULL, NULL),
  (203310, 43299976, '2. Demo: Excavate for gravel', NULL, '2. Demo: Excavate for gravel', NULL, NULL, NULL, NULL),
  (203319, 43299976, '3. Install: Road Base for Paver Extension', NULL, '3. Install: Road Base for Paver Extension', NULL, NULL, NULL, NULL),
  (203323, 43299976, '3. Install: Pavers', NULL, 'Belgard brand Catalina Grana (3 piece, small), approx. 415 square feet

3. Install: Pavers', NULL, NULL, NULL, NULL),
  (203330, 43299976, '3. Install: Weed Fabric for Pavers', NULL, '3. Install: Weed Fabric for Pavers', NULL, NULL, NULL, NULL),
  (203345, 43299976, '3. Install: pea gravel', NULL, '403 square feet

3. Install: pea gravel', NULL, NULL, NULL, NULL),
  (203346, 43299976, '2. Demo: Till and Amend planting area', NULL, '2. Demo: Till and Amend planting area', NULL, NULL, NULL, NULL),
  (203348, 43299976, '3. Install; Irrigation', NULL, '3. Install; Irrigation', NULL, NULL, NULL, NULL),
  (203349, 43299976, '3. Install: Plants', NULL, '3. Install: Plants', NULL, NULL, NULL, NULL),
  (203350, 43299976, '3. Install: Mulch', NULL, '3. Install: Mulch', NULL, NULL, NULL, NULL),
  (203353, 43299976, '3. Install: Up to 1 ton of 6”-8” river rock', NULL, '3. Install: Up to 1 ton of 6”-8” river rock', NULL, NULL, NULL, NULL),
  (203358, 43299976, '3. Install: 1.5 tons of 1’-2’ granite boulders', NULL, '3. Install: 1.5 tons of 1’-2’ granite boulders', NULL, NULL, NULL, NULL),
  (203553, 42783418, '1. Door Hangers Out', NULL, '1. Door Hangers Out', '2026-02-01', NULL, NULL, 'Oscar Valdez'),
  (203554, 42783418, '3. Pick up Job Box.', NULL, '3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (203555, 42783418, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, NULL, NULL, NULL),
  (203556, 42783418, 'Upload Any HOA Info', NULL, 'Upload Any HOA Info', NULL, NULL, NULL, NULL),
  (203557, 42783418, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (203558, 42783418, '1.Yard Sign', NULL, '1.Yard Sign', '2026-02-01', NULL, NULL, 'Oscar Valdez'),
  (204848, 42783418, '2. Demo: Till & Amend Large Sod area', NULL, 'approx. 5600 square feet

2. Demo: Till & Amend Large Sod area', NULL, NULL, NULL, NULL),
  (204852, 42783418, '3. Install: Irrigation (Sod, Hedges, Front Landscaping)', NULL, '3. Install: Irrigation (Sod, Hedges, Front Landscaping)', NULL, NULL, NULL, NULL),
  (204976, 42783418, '3. Install: Sod', NULL, '‘Marathon I’ sod or equivalent, approx. 5600 square feet

3. Install: Sod', NULL, NULL, NULL, NULL),
  (204987, 42783418, '3. Install: Metal edging for Sod', NULL, '320 linear feet

3. Install: Metal edging for Sod', NULL, NULL, NULL, NULL),
  (204994, 42783418, '3. Install:  Shredded bark mulch', NULL, '4480 square feet

3. Install:  Shredded bark mulch', NULL, NULL, NULL, NULL),
  (205066, 42783418, '2. Demo: Till and Amend planting area', NULL, '2. Demo: Till and Amend planting area', NULL, NULL, NULL, NULL),
  (205068, 42783418, '3. Install: Hedges', NULL, '(208 qty.) 5 gal shrubs

3. Install: Hedges', NULL, NULL, NULL, NULL),
  (205241, 42783418, '3. Install: Lighting', NULL, '3. Install: Lighting', NULL, NULL, NULL, NULL),
  (205298, 42783418, '2. Demo: Till & Amend Front Sod & Planting area', NULL, 'approx. 910 square feet

2. Demo: Till & Amend Front Sod & Planting area', NULL, NULL, NULL, NULL),
  (205302, 42783418, '2. Demo: Till & Amend Front Planting area', NULL, 'approx. 230 square feet

2. Demo: Till & Amend Front Planting area', NULL, NULL, NULL, NULL),
  (205309, 42783418, '3. Install: Shrubs Front Landscaping', NULL, '(20 qty.) 5 gal shrubs

3. Install: Shrubs Front Landscaping', NULL, NULL, NULL, NULL),
  (205378, 42783418, '3. Install: Mulch front Landscaping', NULL, '230 square feet

3. Install: Mulch front Landscaping', NULL, NULL, NULL, NULL),
  (205595, 43205218, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (205596, 43205218, '4. Pick up yard sign unless ok by client to leave longer.', NULL, '4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (205597, 43205218, 'Production Manager Review Prep Work for Completeness', NULL, 'Production Manager Review Prep Work for Completeness', NULL, NULL, NULL, NULL),
  (205598, 43205218, 'Upload Bid', NULL, 'Upload Bid', NULL, NULL, NULL, NULL),
  (205599, 43205218, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (205600, 43205218, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (205632, 43205218, '2. Demo: Demolish and remove concrete apron, gutter and curbing', NULL, '2. Demo: Demolish and remove concrete apron, gutter and curbing', NULL, NULL, NULL, NULL),
  (205639, 43205218, '3. Install: Base and Compact', NULL, '3. Install: Base and Compact', NULL, NULL, NULL, NULL),
  (205642, 43205218, '3. Install: Forms', NULL, '3. Install: Forms', NULL, NULL, NULL, NULL),
  (205645, 43205218, '3. Install: Pour CLASS 520-C-2500 PCC 6” thick to city standard.', NULL, '3. Install: Pour CLASS 520-C-2500 PCC 6” thick to city standard.', NULL, NULL, NULL, NULL),
  (205726, 43205218, '3. Install: sidewalk work approx 15''', NULL, '3. Install: sidewalk work approx 15''', NULL, NULL, NULL, NULL),
  (205730, 43205218, '3. Install: New gutter and curb wings', NULL, '3. Install: New gutter and curb wings', NULL, NULL, NULL, NULL),
  (205732, 43205218, '3. Install: 30st of asphalt', NULL, '3. Install: 30st of asphalt', NULL, NULL, NULL, NULL),
  (205982, 43205218, '4. Option: 260 sq ft of new concrete sidewalk', NULL, '4. Option: 260 sq ft of new concrete sidewalk', NULL, NULL, NULL, NULL),
  (206008, 43205218, '2. Demo: Saw cut asphalt and concrete to trench 30’x6’x2’ conduit run for utilities', NULL, '2. Demo: Saw cut asphalt and concrete to trench 30’x6’x2’ conduit run for utilities', NULL, NULL, NULL, NULL),
  (206123, 43205218, '2. Demo: Install 4" conduit with necessary Sweeps and stub up', NULL, '2. Demo: Install 4" conduit with necessary Sweeps and stub up', NULL, NULL, NULL, NULL),
  (222025, 43112929, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (222026, 43112929, '3. Pick up Job Box.', NULL, '3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (222027, 43112929, 'Project Supervisor to have Pre Job Walk meeting with Client and Designer/Consultant', NULL, 'Project Supervisor to have Pre Job Walk meeting with Client and Designer/Consultant', NULL, NULL, NULL, NULL),
  (222028, 43112929, 'Upload Any Needed Info on Materials Selections', NULL, 'Upload Any Needed Info on Materials Selections', NULL, NULL, NULL, NULL),
  (222029, 43112929, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (222030, 43112929, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (222088, 43112929, '2. Demo: Remove 6" existing driveway apron concrete', NULL, '2. Demo: Remove 6" existing driveway apron concrete', NULL, NULL, NULL, NULL),
  (222089, 43112929, '2. Demo: asphalt and gutter as necessary', NULL, '2. Demo: asphalt and gutter as necessary', NULL, NULL, NULL, NULL),
  (222092, 43112929, '3. Install: Form & pour Apron', NULL, 'apron per city specifications, approx. 300 square feet

3. Install: Form & pour Apron', NULL, NULL, NULL, NULL),
  (222094, 43112929, '3. Install: Patch and repair asphalt', NULL, '3. Install: Patch and repair asphalt', NULL, NULL, NULL, NULL),
  (256041, 42660242, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (256042, 42660242, '3. Pick up Job Box.', NULL, '3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (256043, 42660242, 'Production Manager Assign Project Supervisor', NULL, 'Production Manager Assign Project Supervisor', NULL, NULL, NULL, NULL),
  (256044, 42660242, 'Double Check Client Contact Info and Job Info for Completeness and Correct Naming', NULL, 'Double Check Client Contact Info and Job Info for Completeness and Correct Naming', NULL, NULL, NULL, NULL),
  (256045, 42660242, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (256046, 42660242, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (256490, 42660242, '2. Demo: Excavate/ Grade for new pool', NULL, '2. Demo: Excavate/ Grade for new pool', NULL, NULL, NULL, NULL),
  (256491, 42660242, '2. Demo: Lay out new Pool', NULL, '2. Demo: Lay out new Pool', NULL, NULL, NULL, NULL),
  (256492, 42660242, '2. Demo: Trench for Gas/Electrical for Pool Equipment', NULL, '2. Demo: Trench for Gas/Electrical for Pool Equipment', NULL, NULL, NULL, NULL),
  (256493, 42660242, '3. Install: Concrete Pad for Pool equipment', NULL, '4x8 concrete pad

3. Install: Concrete Pad for Pool equipment', NULL, NULL, NULL, NULL),
  (256494, 42660242, '3. Install: Coping for New Pool', NULL, 'Poured in place concrete coping

3. Install: Coping for New Pool', NULL, NULL, NULL, NULL),
  (256495, 42660242, '1. Inspection: Bottom', NULL, '1. Inspection: Bottom', NULL, NULL, NULL, NULL),
  (256496, 42660242, '1. Inspection: Rebar & Plumbing', NULL, '1. Inspection: Rebar & Plumbing', NULL, NULL, NULL, NULL),
  (256497, 42660242, '1. Inspection: Deputy for shotcrete (report)', NULL, '1. Inspection: Deputy for shotcrete (report)', NULL, NULL, NULL, NULL),
  (256498, 42660242, '1. Inspection: Enclosure/ Pre-plaster', NULL, '1. Inspection: Enclosure/ Pre-plaster', NULL, NULL, NULL, NULL),
  (256499, 42660242, '1. Inspection: Final', NULL, '1. Inspection: Final', NULL, NULL, NULL, NULL),
  (256500, 42660242, '3. Install: Gas/Electrical for Pool Equipment', NULL, '120 Linear feet

3. Install: Gas/Electrical for Pool Equipment', NULL, NULL, NULL, NULL),
  (256501, 42660242, '3. Install: Plaster New Pool', NULL, 'French gray stonescapes plaster with mini pebble

3. Install: Plaster New Pool', NULL, NULL, NULL, NULL),
  (256502, 42660242, '3. Install: Plumbing for new Pool', NULL, '3. Install: Plumbing for new Pool', NULL, NULL, NULL, NULL),
  (256503, 42660242, '3. Install: Pool equipment', NULL, '3. Install: Pool equipment', NULL, NULL, NULL, NULL),
  (256504, 42660242, '3. Install: Pour Shotcrete for new pool', NULL, '3. Install: Pour Shotcrete for new pool', NULL, NULL, NULL, NULL),
  (256505, 42660242, '3. Install: Rebar for New Pool', NULL, '3. Install: Rebar for New Pool', NULL, NULL, NULL, NULL),
  (256506, 42660242, '3. Install: Set Forms for New Pool', NULL, '3. Install: Set Forms for New Pool', NULL, NULL, NULL, NULL),
  (256507, 42660242, '3. Install: Waterline Tile for New Pool', NULL, 'Material provided by owner

3. Install: Waterline Tile for New Pool', NULL, NULL, NULL, NULL),
  (257279, 42660242, '2. Demo: Grade for rear yard concrete areas', NULL, '2. Demo: Grade for rear yard concrete areas', NULL, NULL, NULL, NULL),
  (257282, 42660242, '3. Install: 2” of Class II road base for Rear Yard Concrete', NULL, '3. Install: 2” of Class II road base for Rear Yard Concrete', NULL, NULL, NULL, NULL),
  (257290, 42660242, '3. Install: Forms for Rear Yard Concrete', NULL, '3. Install: Forms for Rear Yard Concrete', NULL, NULL, NULL, NULL),
  (257296, 42660242, '3. Install: Rebar for Rear Yard Concrete', NULL, '3. Install: Rebar for Rear Yard Concrete', NULL, NULL, NULL, NULL),
  (257302, 42660242, '3. Install: Pour Rear Yard Concrete', NULL, '3. Install: Pour Rear Yard Concrete', NULL, NULL, NULL, NULL),
  (257307, 42660242, '3. Install concrete curbing', NULL, '52 linear feet, to secure planter beds from concrete

3. Install concrete curbing', NULL, NULL, NULL, NULL),
  (257341, 42660242, '2. Demo: Layout new cook center', NULL, '8’ x 3’ x 3’

2. Demo: Layout new cook center', NULL, NULL, NULL, NULL),
  (257355, 42660242, '2. Demo: Excavate footings for Cook Center', NULL, '2. Demo: Excavate footings for Cook Center', NULL, NULL, NULL, NULL),
  (257387, 42660242, '3. Install: Pour 12” x 12” concrete footings for Cook Center', NULL, '3. Install: Pour 12” x 12” concrete footings for Cook Center', NULL, NULL, NULL, NULL),
  (257389, 42660242, '3. Install: Rebar for Cook Center', NULL, '3. Install: Rebar for Cook Center', NULL, NULL, NULL, NULL),
  (257393, 42660242, '3. Install: CMU block for Cook Center', NULL, '3. Install: CMU block for Cook Center', NULL, NULL, NULL, NULL),
  (257637, 42660242, '3. Install: Concrete Countertop', NULL, 'approx. 26 square feet

3. Install: Concrete Countertop', NULL, NULL, NULL, NULL),
  (258049, 42660242, '3. Demo: Trench and run 20 linear feet of gas line from pool line to Cook Center', NULL, '3. Demo: Trench and run 20 linear feet of gas line from pool line to Cook Center', NULL, NULL, NULL, NULL),
  (258820, 42660242, '3. Install: (2qty) GFCI outlets Cook Center', NULL, '3. Install: (2qty) GFCI outlets Cook Center', NULL, NULL, NULL, NULL),
  (258823, 42660242, '3. Install: smooth stucco finish to cook center', NULL, '3. Install: smooth stucco finish to cook center', NULL, NULL, NULL, NULL),
  (258828, 42660242, '3. Install: Plants', NULL, '3. Install: Plants', NULL, NULL, NULL, NULL),
  (258829, 42660242, '2. Demo: Till 700 sq ft of planter beds with new soil 6” deep', NULL, '2. Demo: Till 700 sq ft of planter beds with new soil 6” deep', NULL, NULL, NULL, NULL),
  (258833, 42660242, '3. Install: Irrigation', NULL, '3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (258834, 42660242, '3. Install : Rock with Weed Barrier', NULL, '3. Install : Rock with Weed Barrier', NULL, NULL, NULL, NULL),
  (258835, 42660242, '3. Install: Lighting', NULL, 'owner provided lights allowance of 4 step lights and 10 path/uplights Will provide wire and low voltage transformer lighting wire to be buried

3. Install: Lighting', NULL, NULL, NULL, NULL),
  (314888, 43504880, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (314889, 43504880, '5. If the client is happy with the work ask for a review.', NULL, '5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (314890, 43504880, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, NULL, NULL, NULL),
  (314891, 43504880, 'Upload Any Needed Info on Materials Selections', NULL, 'Upload Any Needed Info on Materials Selections', NULL, NULL, NULL, NULL),
  (314892, 43504880, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (314893, 43504880, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (314931, 43504880, '2. Demo: Kill and remove weeds in planter', NULL, '2. Demo: Kill and remove weeds in planter', NULL, NULL, NULL, NULL),
  (314936, 43504880, '2. Demo: Remove 1qty 5'' shrub', NULL, '2. Demo: Remove 1qty 5'' shrub', NULL, NULL, NULL, NULL),
  (314941, 43504880, '3. Install:  weed barrier in planter', NULL, 'approx. 210 square feet

3. Install:  weed barrier in planter', NULL, NULL, NULL, NULL),
  (314951, 43504880, '3. Install: (7qty) 1 gallon shrubs', NULL, 'approx. 210 square feet

3. Install: (7qty) 1 gallon shrubs', NULL, NULL, NULL, NULL),
  (314964, 43504880, '3. Install: Large bark nugget mulch', NULL, '3. Install: Large bark nugget mulch', NULL, NULL, NULL, NULL),
  (314974, 43504880, '3. Install: Rachio brand irrigation timer', NULL, '3. Install: Rachio brand irrigation timer', NULL, NULL, NULL, NULL),
  (314998, 43504880, 'Install option- Beach Pebble as Mulch TBD', NULL, 'Install option- Beach Pebble as Mulch TBD', NULL, NULL, NULL, NULL),
  (368822, 39894589, 'Install Firebowls', NULL, 'Install Firebowls', NULL, NULL, NULL, NULL),
  (368837, 39894589, 'Stucco Patch', NULL, 'Stucco Patch', NULL, NULL, NULL, NULL),
  (368838, 39894589, 'Inspections', NULL, 'Inspections', NULL, NULL, NULL, NULL),
  (368905, 37604325, 'Final City Sign Off', NULL, 'Final City Sign Off', NULL, NULL, NULL, NULL),
  (401491, 43638594, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (401492, 43638594, '1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (401493, 43638594, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, NULL, NULL, NULL),
  (401494, 43638594, 'Upload Pricing File', NULL, 'Upload Pricing File', NULL, NULL, NULL, NULL),
  (401495, 43638594, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (401496, 43638594, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (401526, 43638594, '2. Demo: Remove existing concrete/paver', NULL, '4” depth,200 sq ft

2. Demo: Remove existing concrete/paver', NULL, NULL, NULL, NULL),
  (401532, 43638594, '2. Demo: Removal of misc plantings', NULL, '2. Demo: Removal of misc plantings', NULL, NULL, NULL, NULL),
  (401539, 43638594, '2. Demo: Import 100% topsoil and compact in 6” lifts', NULL, '2. Demo: Import 100% topsoil and compact in 6” lifts', NULL, NULL, NULL, NULL),
  (401546, 43638594, '3. Install: Layout new deck per plan', NULL, '3. Install: Layout new deck per plan', NULL, NULL, NULL, NULL),
  (401549, 43638594, '3. Install: ‘Trex’ brand ‘Enhance’ composite decking', NULL, 'Color: ‘Toasted Sand’

3. Install: ‘Trex’ brand ‘Enhance’ composite decking', NULL, NULL, NULL, NULL),
  (401551, 43638594, '3. Install:  9 linear feet of step', NULL, 'Color: ‘Toasted Sand’

3. Install:  9 linear feet of step', NULL, NULL, NULL, NULL),
  (401558, 43638594, '3. Install: new footings, pressure treated post with post anchors.', NULL, '4x beam and 2x floor joist with hangers

3. Install: new footings, pressure treated post with post anchors.', NULL, NULL, NULL, NULL),
  (401678, 43638594, '3. Install: 12inch Footings for CMU wall', NULL, '3. Install: 12inch Footings for CMU wall', NULL, NULL, NULL, NULL),
  (401680, 43638594, '3. Install 2 horizontal bars in footing', NULL, '3. Install 2 horizontal bars in footing', NULL, NULL, NULL, NULL),
  (401735, 43638594, '3. Install: 50 linear feet of wall', NULL, 'Approx. 32 Lf against the structure and 18 linear feet going into planters

3. Install: 50 linear feet of wall', NULL, NULL, NULL, NULL),
  (402579, 43363329, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (402580, 43363329, '1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (402581, 43363329, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, NULL, NULL, NULL),
  (402582, 43363329, 'Upload Bid', NULL, 'Upload Bid', NULL, NULL, NULL, NULL),
  (402583, 43363329, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (402584, 43363329, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (402681, 43363329, '2. Demo: Remove existing driveway', NULL, 'approx. 1035 square feet to 4” depth

2. Demo: Remove existing driveway', NULL, NULL, NULL, NULL),
  (402683, 43363329, '2. Demo: Remove existing walkway steppers', NULL, '2. Demo: Remove existing walkway steppers', NULL, NULL, NULL, NULL),
  (402901, 43363329, '2. Demo: Grade for Paver Driveway', NULL, 'grade to 7”

2. Demo: Grade for Paver Driveway', NULL, NULL, NULL, NULL),
  (402910, 43363329, '3. Install: Road Base & Washed leveling sand', NULL, '3. Install: Road Base & Washed leveling sand', NULL, NULL, NULL, NULL),
  (402912, 43363329, '3. Install: Pavers', NULL, 'Angelus brand Holland pavers, approx. 1420 square feet Paver color: Grey-Moss-Charcoal

3. Install: Pavers', NULL, NULL, NULL, NULL),
  (402917, 43363329, '3. Install: concrete restraints where pavers meets softscape area', NULL, '3. Install: concrete restraints where pavers meets softscape area', NULL, NULL, NULL, NULL),
  (402919, 43363329, '2. Demo: Demolish and remove existing steps and landing in rear yard', NULL, '2. Demo: Demolish and remove existing steps and landing in rear yard', NULL, NULL, NULL, NULL),
  (402926, 43363329, '3. Install: Steps from CMU Block', NULL, 'approx. 20 linear feet x 12” height

3. Install: Steps from CMU Block', NULL, NULL, NULL, NULL),
  (402930, 43363329, '3. Install: Angelus Bullnose step treads and risers', NULL, '3. Install: Angelus Bullnose step treads and risers', NULL, NULL, NULL, NULL),
  (402932, 43363329, '3. Install: 15 square feet of step landing using Angelus brand Holland Stone', NULL, 'Bullnose step color: Grey-Moss-Charcoal

3. Install: 15 square feet of step landing using Angelus brand Holland Stone', NULL, NULL, NULL, NULL),
  (402942, 43363329, '2. Demo: Trench for drainage lines', NULL, 'approx. 152 linear feet of trenching

2. Demo: Trench for drainage lines', NULL, NULL, NULL, NULL),
  (402945, 43363329, '3. Install: Run new 4” SDR35 drainage line', NULL, '3. Install: Run new 4” SDR35 drainage line', NULL, NULL, NULL, NULL),
  (402949, 43363329, '3. Install: 12” x 12” catch basin with concrete box & metal grate', NULL, '1

3. Install: 12” x 12” catch basin with concrete box & metal grate', NULL, NULL, NULL, NULL),
  (402952, 43363329, '3. Install: (2 qty.) area drains', NULL, '3. Install: (2 qty.) area drains', NULL, NULL, NULL, NULL),
  (402955, 43363329, '3. Install concrete sewer cleanout box', NULL, '3. Install concrete sewer cleanout box', NULL, NULL, NULL, NULL),
  (402960, 43363329, '3. Install: Curb core', NULL, '3. Install: Curb core', NULL, NULL, NULL, NULL),
  (402970, 43363329, '2. Demo: Excavate/grade for Beach Pebble', NULL, '2. Demo: Excavate/grade for Beach Pebble', NULL, NULL, NULL, NULL),
  (402974, 43363329, '3. Install: Weed Barrier for Beach Pebble', NULL, '3. Install: Weed Barrier for Beach Pebble', NULL, NULL, NULL, NULL),
  (402976, 43363329, '3. Install: Mexican beach pebble', NULL, 'approx. 40 square feet

3. Install: Mexican beach pebble', NULL, NULL, NULL, NULL),
  (425262, 43464899, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (425263, 43464899, '4. Pick up yard sign unless ok by client to leave longer.', NULL, '4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (425264, 43464899, 'Production Manager Assign Project Supervisor', NULL, 'Production Manager Assign Project Supervisor', NULL, NULL, NULL, NULL),
  (425265, 43464899, 'Enter Daily Log with Job Specifics not covered in the Scope of Work.  Important!!!!', NULL, 'Enter Daily Log with Job Specifics not covered in the Scope of Work.  Important!!!!', NULL, NULL, NULL, NULL),
  (425266, 43464899, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (425267, 43464899, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (433609, 43464899, '2. Demo: Remove 1” of existing lawn/dirt in rear yard', NULL, 'approx. 2400 square feet

2. Demo: Remove 1” of existing lawn/dirt in rear yard', NULL, NULL, NULL, NULL),
  (433744, 43464899, '3. Install: Spray irrigation valves for sod', NULL, '3. Install: Spray irrigation valves for sod', NULL, NULL, NULL, NULL),
  (433748, 43464899, '2. Demo: Till and amend sod area soil', NULL, 'approx. 1350 square fee

2. Demo: Till and amend sod area soil', NULL, NULL, NULL, NULL),
  (433754, 43464899, '3. Install:  St. Augustine sod or equivalen', NULL, 'approx. 1350 square feet

3. Install:  St. Augustine sod or equivalen', NULL, NULL, NULL, NULL),
  (433776, 43464899, '3. Install: 190 linear feet of composite benderboard edging', NULL, '3. Install: 190 linear feet of composite benderboard edging', NULL, NULL, NULL, NULL),
  (433793, 43464899, '3. Install: Playground mulch', NULL, 'approx. 430 square feet

3. Install: Playground mulch', NULL, NULL, NULL, NULL),
  (433863, 43464899, '2. Demo: Excavate/ Grade  gravel areas', NULL, '2. Demo: Excavate/ Grade  gravel areas', NULL, NULL, NULL, NULL),
  (433870, 43464899, '3. Install: (1 qty.) anti-siphon drip irrigation valve for planter irrigation', NULL, '3. Install: (1 qty.) anti-siphon drip irrigation valve for planter irrigation', NULL, NULL, NULL, NULL),
  (433873, 43464899, '3. Install: Weed barrier fabric', NULL, '3. Install: Weed barrier fabric', NULL, NULL, NULL, NULL),
  (433884, 43464899, '3. Install: Black mulch or a premium mulch in planters', NULL, 'approx. 560 square feet

3. Install: Black mulch or a premium mulch in planters', NULL, NULL, NULL, NULL),
  (433917, 43464899, '3. Install: Plants/Shrubs per plan', NULL, '3. Install: Plants/Shrubs per plan', NULL, NULL, NULL, NULL),
  (433919, 43464899, '2. Demo: Excavate/ Grade for Concrete Pad', NULL, '2. Demo: Excavate/ Grade for Concrete Pad', NULL, NULL, NULL, NULL),
  (433920, 43464899, '3. Install: Road Base for concrete Pad', NULL, '3. Install: Road Base for concrete Pad', NULL, NULL, NULL, NULL),
  (433921, 43464899, '3. Install: Rebar for Concrete Pad', NULL, '3. Install: Rebar for Concrete Pad', NULL, NULL, NULL, NULL),
  (433927, 43464899, '3. Install: Pour Concrete pad', NULL, '3000 PSI natural gray concrete 9’ x 9’ pad

3. Install: Pour Concrete pad', NULL, NULL, NULL, NULL),
  (433932, 43464899, '3. Install: Flagstone steppers', NULL, 'approx. 40 square feet sand-set

3. Install: Flagstone steppers', NULL, NULL, NULL, NULL),
  (433971, 43464899, '3. Install: Lighting', NULL, '3. Install: Lighting', NULL, NULL, NULL, NULL),
  (434109, 43464899, '3. Install: 1qty 40amp Breaker', NULL, '3. Install: 1qty 40amp Breaker', NULL, NULL, NULL, NULL),
  (434111, 43464899, '3. Install: Run 15 LF of Conduit for new Jbox for Furture spa', NULL, '3. Install: Run 15 LF of Conduit for new Jbox for Furture spa', NULL, NULL, NULL, NULL),
  (434116, 43464899, '3. Install: Jbox by spa', NULL, '3. Install: Jbox by spa', NULL, NULL, NULL, NULL),
  (434128, 43464899, '3. Install: Run 6 gauge wire from panel to Jbox for future 240v adapter.', NULL, '3. Install: Run 6 gauge wire from panel to Jbox for future 240v adapter.', NULL, NULL, NULL, NULL),
  (436143, 42809081, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (436144, 42809081, '3. Pick up Job Box.', NULL, '3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (436145, 42809081, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, NULL, NULL, NULL),
  (436146, 42809081, 'Upload Any Needed Info on Materials Selections', NULL, 'Upload Any Needed Info on Materials Selections', NULL, NULL, NULL, NULL),
  (436147, 42809081, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (436148, 42809081, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (436329, 42134207, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (436330, 42134207, '2. Pick up final payment unless there are outstanding items for completion.', NULL, '2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (436331, 42134207, 'Production Manager Review Prep Work for Completeness', NULL, 'Production Manager Review Prep Work for Completeness', NULL, NULL, NULL, NULL),
  (436332, 42134207, 'Enter Daily Log with Job Specifics not covered in the Scope of Work.  Important!!!!', NULL, 'Enter Daily Log with Job Specifics not covered in the Scope of Work.  Important!!!!', NULL, NULL, NULL, NULL),
  (436333, 42134207, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (436334, 42134207, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (436364, 42134207, '2. Demo: Excavate/ Grade for new pool', NULL, '2. Demo: Excavate/ Grade for new pool', NULL, NULL, NULL, NULL),
  (436365, 42134207, '2. Demo: Lay out new Pool', NULL, '2. Demo: Lay out new Pool', NULL, NULL, NULL, NULL),
  (436366, 42134207, '2. Demo: Trench for Gas/Electrical for Pool Equipment', NULL, '2. Demo: Trench for Gas/Electrical for Pool Equipment', NULL, NULL, NULL, NULL),
  (436367, 42134207, '3. Install: Concrete Pad for Pool equipment', NULL, '3. Install: Concrete Pad for Pool equipment', NULL, NULL, NULL, NULL),
  (436368, 42134207, '3. Install: Coping for New Pool', NULL, '3. Install: Coping for New Pool', NULL, NULL, NULL, NULL),
  (436369, 42134207, '1. Inspection: Bottom', NULL, '1. Inspection: Bottom', NULL, NULL, NULL, NULL),
  (436370, 42134207, '1. Inspection: Rebar & Plumbing', NULL, '1. Inspection: Rebar & Plumbing', NULL, NULL, NULL, NULL),
  (436371, 42134207, '1. Inspection: Deputy for shotcrete (report)', NULL, '1. Inspection: Deputy for shotcrete (report)', NULL, NULL, NULL, NULL),
  (436372, 42134207, '1. Inspection: Enclosure/ Pre-plaster', NULL, '1. Inspection: Enclosure/ Pre-plaster', NULL, NULL, NULL, NULL),
  (436373, 42134207, '1. Inspection: Final', NULL, '1. Inspection: Final', NULL, NULL, NULL, NULL),
  (436374, 42134207, '3. Install: Gas/Electrical for Pool Equipment', NULL, '3. Install: Gas/Electrical for Pool Equipment', NULL, NULL, NULL, NULL),
  (436375, 42134207, '3. Install: Plaster New Pool', NULL, 'standard white interior plaster

3. Install: Plaster New Pool', NULL, NULL, NULL, NULL),
  (436376, 42134207, '3. Install: Plumbing for new Pool', NULL, '3. Install: Plumbing for new Pool', NULL, NULL, NULL, NULL),
  (436377, 42134207, '3. Install: Pool equipment', NULL, '3. Install: Pool equipment', NULL, NULL, NULL, NULL),
  (436378, 42134207, '3. Install: Pour Shotcrete for new pool', NULL, '3. Install: Pour Shotcrete for new pool', NULL, NULL, NULL, NULL),
  (436379, 42134207, '3. Install: Rebar for New Pool', NULL, '3. Install: Rebar for New Pool', NULL, NULL, NULL, NULL),
  (436380, 42134207, '3. Install: Set Forms for New Pool', NULL, '3. Install: Set Forms for New Pool', NULL, NULL, NULL, NULL),
  (436381, 42134207, '3. Install: Waterline Tile for New Pool', NULL, '3. Install: Waterline Tile for New Pool', NULL, NULL, NULL, NULL),
  (436405, 42134207, '3. Install: Smooth Stucco Finish on raised spa exterior', NULL, '3. Install: Smooth Stucco Finish on raised spa exterior', NULL, NULL, NULL, NULL),
  (436409, 42134207, '3. Install: Spa spillway', NULL, '3. Install: Spa spillway', NULL, NULL, NULL, NULL),
  (436430, 42134207, '2. Demo: Sawcut concrete driveway to run gas line', NULL, '2. Demo: Sawcut concrete driveway to run gas line', NULL, NULL, NULL, NULL),
  (436441, 42134207, '2. Demo: Excavate/Grade concrete & Steps', NULL, '2. Demo: Excavate/Grade concrete & Steps', NULL, NULL, NULL, NULL),
  (436449, 42134207, '3. Install: Road Base for Concrete & Steps', NULL, '3. Install: Road Base for Concrete & Steps', NULL, NULL, NULL, NULL),
  (436460, 42134207, '3. Install: Rebar for Concrete & Steps', NULL, '3. Install: Rebar for Concrete & Steps', NULL, NULL, NULL, NULL),
  (436523, 42134207, '3. Install: Forms for Concrete & Steps', NULL, '3. Install: Forms for Concrete & Steps', NULL, NULL, NULL, NULL),
  (436528, 42134207, '3. Install: Pour Concrete & Steps', NULL, '3. Install: Pour Concrete & Steps', NULL, NULL, NULL, NULL),
  (436542, 42134207, '3. Install: 5LF of CMU Step Build', NULL, '3. Install: 5LF of CMU Step Build', NULL, NULL, NULL, NULL),
  (436678, 42134207, '3. Install: curbing', NULL, '3. Install: curbing', NULL, NULL, NULL, NULL),
  (436686, 42134207, '3. Install: Bellecrete brand step tread/riser', NULL, '3. Install: Bellecrete brand step tread/riser', NULL, NULL, NULL, NULL),
  (436690, 42134207, '3. Install: Patch Sawcut driveway', NULL, '3. Install: Patch Sawcut driveway', NULL, NULL, NULL, NULL),
  (436696, 42134207, '2. Demo: Remove Portion of existing Wall', NULL, 'approx. 12 linear feet x 36” height  footings to remain

2. Demo: Remove Portion of existing Wall', NULL, NULL, NULL, NULL),
  (436718, 42134207, '2. Demo: Remove Shrubs as needed', NULL, '2. Demo: Remove Shrubs as needed', NULL, NULL, NULL, NULL),
  (436806, 42134207, '2. Demo: Trim avocado branch and duranta tree', NULL, '2. Demo: Trim avocado branch and duranta tree', NULL, NULL, NULL, NULL),
  (436823, 42134207, '2. Demo: Trim pineapple guava trees', NULL, '2. Demo: Trim pineapple guava trees', NULL, NULL, NULL, NULL),
  (436871, 42134207, '3. Install: Irrigation', NULL, '3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (436879, 42134207, '2. Demo: Till and amend planting areas', NULL, '2. Demo: Till and amend planting areas', NULL, NULL, NULL, NULL),
  (436885, 42134207, '3. Install: Plants', NULL, '3. Install: Plants', NULL, NULL, NULL, NULL),
  (436886, 42134207, '3. Install: Mulch', NULL, '3. Install: Mulch', NULL, NULL, NULL, NULL),
  (436901, 42134207, '3. Install: Lighting', NULL, '3. Install: Lighting', NULL, NULL, NULL, NULL),
  (436908, 42134207, '2. Demo: Trench for ADU utilities from Main Panel', NULL, 'Trench and run 110 linear feet by 12” wide x 24” depth

2. Demo: Trench for ADU utilities from Main Panel', NULL, NULL, NULL, NULL),
  (436931, 42134207, '3. Install: Run Schedule type db-120 electrical conduit', NULL, '3. Install: Run Schedule type db-120 electrical conduit', NULL, NULL, NULL, NULL),
  (436935, 42134207, '3. Install: Backfill and compact trench', NULL, '3. Install: Backfill and compact trench', NULL, NULL, NULL, NULL),
  (449561, 43164712, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (449562, 43164712, '6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (449563, 43164712, 'Job Walk Completed', NULL, 'Job Walk Completed', NULL, NULL, NULL, NULL),
  (449564, 43164712, 'Upload Any Needed Info on Materials Selections', NULL, 'Upload Any Needed Info on Materials Selections', NULL, NULL, NULL, NULL),
  (449565, 43164712, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (449566, 43164712, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (449613, 43164712, '2. Demo: Remove/grade soil', NULL, 'average of 7” of soil over 2000 square feet

2. Demo: Remove/grade soil', NULL, NULL, NULL, NULL),
  (450215, 43164712, '2. Demo: Remove shrubs as needed', NULL, '2. Demo: Remove shrubs as needed', NULL, NULL, NULL, NULL),
  (450220, 43164712, '2. Demo: Till and amend sod area soil', NULL, 'approx. 1860 square feet

2. Demo: Till and amend sod area soil', NULL, NULL, NULL, NULL),
  (450231, 43164712, '3. Install: Valley sod RTF or equivalent', NULL, 'approx. 1860 square feet

3. Install: Valley sod RTF or equivalent', NULL, NULL, NULL, NULL),
  (450266, 43164712, '3. Install: Metal Edging', NULL, 'approx. 140 linear feet

3. Install: Metal Edging', NULL, NULL, NULL, NULL),
  (450273, 43164712, '2. Demo: Excavate Footings for wall', NULL, '2. Demo: Excavate Footings for wall', NULL, NULL, NULL, NULL),
  (450277, 43164712, '3. Install: Concrete footings for wall', NULL, 'approx. 22 linear feet  finish height of 18”

3. Install: Concrete footings for wall', NULL, NULL, NULL, NULL),
  (450288, 43164712, '3. Install: CMU block wall', NULL, '3. Install: CMU block wall', NULL, NULL, NULL, NULL),
  (450295, 43164712, '3. Install: Sand Stucco Finish to Wall', NULL, 'approx. 33 square feet

3. Install: Sand Stucco Finish to Wall', NULL, NULL, NULL, NULL),
  (450336, 43164712, '3. Install: Bellecrete precast caps to Wall', NULL, '3. Install: Bellecrete precast caps to Wall', NULL, NULL, NULL, NULL),
  (450344, 43164712, '2. Demo: Remove existing Concrete & Excavate 6” below finished grade', NULL, 'approx. 180 square feet

2. Demo: Remove existing Concrete & Excavate 6” below finished grade', NULL, NULL, NULL, NULL),
  (450419, 43164712, '3. Install: Road base for Concrete', NULL, '3. Install: Road base for Concrete', NULL, NULL, NULL, NULL),
  (450420, 43164712, '3. Install: Rebar for Concrete', NULL, '3. Install: Rebar for Concrete', NULL, NULL, NULL, NULL),
  (450424, 43164712, '3. Install: Pour Concrete', NULL, '3. Install: Pour Concrete', NULL, NULL, NULL, NULL),
  (450429, 43164712, '3. Install: Weed barrier', NULL, 'Gravel D.G.

3. Install: Weed barrier', NULL, NULL, NULL, NULL),
  (450435, 43164712, '3. Install: D.G.', NULL, 'tan stabilized D.G., approx. 240 square feet 2 sacks of cement per cubic yard of D.G. for enhanced stabilization

3. Install: D.G.', NULL, NULL, NULL, NULL),
  (450452, 43164712, '2. Demo: Till and amend planting area soil', NULL, '2. Demo: Till and amend planting area soil', NULL, NULL, NULL, NULL),
  (450458, 43164712, '3. Install: Plants', NULL, '(27 qty.) 5 gal shrubs per plan

3. Install: Plants', NULL, NULL, NULL, NULL),
  (450462, 43164712, '3. Install: Irrigation', NULL, '(3 qty.) spray irrigation valves for sod  Rachio brand smart irrigation timer

3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (450466, 43164712, '3. Install: Gravel', NULL, 'pea gravel per plan, approx. 65 square fee

3. Install: Gravel', NULL, NULL, NULL, NULL),
  (450500, 43164712, '3. Install: Lighting', NULL, '(1 qty.) 100-watt transformer (5 qty.) Lightcraft or equivalent LED lights per plan

3. Install: Lighting', NULL, NULL, NULL, NULL),
  (450589, 43164712, '3. Install: Mulch', NULL, '3. Install: Mulch', NULL, NULL, NULL, NULL),
  (464831, 43329191, 'Send to CAD', NULL, 'Send to CAD', '2026-02-24', NULL, NULL, 'John Durso'),
  (492047, 35259913, 'Roof repair', NULL, 'From Mike: \

Roof repair', '2026-02-25', NULL, NULL, '(.PM) Jorge Flores,John Durso'),
  (492150, 39894589, 'Pool automation', NULL, 'Pool automation', NULL, NULL, NULL, NULL),
  (492152, 39894589, 'perimeter lighting', NULL, 'perimeter lighting', NULL, NULL, NULL, NULL),
  (492153, 39894589, 'gas + burner', NULL, 'gas + burner', NULL, NULL, NULL, NULL),
  (519796, 41963005, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (519797, 41963005, '4. Pick up yard sign unless ok by client to leave longer.', NULL, '4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (519798, 41963005, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, NULL, NULL, NULL),
  (519799, 41963005, 'Route Project For Prep Review', NULL, 'Route Project For Prep Review', NULL, NULL, NULL, NULL),
  (519800, 41963005, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (519801, 41963005, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (519830, 41963005, '2. Demo: Remove up to 2” of existing sod in rear yard', NULL, 'approx. 2035 square feet

2. Demo: Remove up to 2” of existing sod in rear yard', NULL, NULL, NULL, NULL),
  (519853, 41963005, '3. Install: Lay weed barrier fabric for DG', NULL, '2 sacks of cement per yard of D.G. for enhanced stabilization,

3. Install: Lay weed barrier fabric for DG', NULL, NULL, NULL, NULL),
  (519856, 41963005, '3. Install: D.G', NULL, '3. Install: D.G', NULL, NULL, NULL, NULL),
  (519857, 41963005, '3. Install: Black steel edging', NULL, 'approx. 38 linear fee

3. Install: Black steel edging', NULL, NULL, NULL, NULL),
  (519860, 41963005, '3. Install: 2 x 2 precast concrete steppers', NULL, '3. Install: 2 x 2 precast concrete steppers', NULL, NULL, NULL, NULL),
  (519864, 41963005, '2. Demo: Till and amend sod area soil/ planting area', NULL, '2. Demo: Till and amend sod area soil/ planting area', NULL, NULL, NULL, NULL),
  (519865, 41963005, '3. Install: Irrigation', NULL, '(1 qty.) anti-siphon valve for spray irrigation new Rachio brand smart irrigation controller

3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (519869, 41963005, '3. Install: Sod', NULL, 'Valley RTF’ sod  approx. 580 square feet

3. Install: Sod', NULL, NULL, NULL, NULL),
  (519872, 41963005, '3. Install: Plants', NULL, '(2 qty.) 15 gal fruit trees (6 qty.) 5 gal standard shrubs (88 qty.) 1 gal standard shrubs (8) Flats Groundcover

3. Install: Plants', NULL, NULL, NULL, NULL),
  (519874, 41963005, '3. Install: Mulch', NULL, '1280 square feet of shredded bark mulch

3. Install: Mulch', NULL, NULL, NULL, NULL),
  (519879, 41963005, '3. Install: Lighting', NULL, '3. Install: Lighting', NULL, NULL, NULL, NULL),
  (519883, 41963005, '2. Demo: Excavate for Rain Swale', NULL, '2. Demo: Excavate for Rain Swale', NULL, NULL, NULL, NULL),
  (519887, 41963005, '3. Install:  65 square feet of beach pebble (Rain Swale)', NULL, '3. Install:  65 square feet of beach pebble (Rain Swale)', NULL, NULL, NULL, NULL),
  (519903, 41963005, '3. Install: Granite Boulders', NULL, '(3 qty)  total 24” wide

3. Install: Granite Boulders', NULL, NULL, NULL, NULL),
  (519906, 41963005, '3. Install: (1 qty.) metal post for bistro lighting', NULL, '3. Install: (1 qty.) metal post for bistro lighting', NULL, NULL, NULL, NULL),
  (519912, 41963005, '3. Install: Afix owner provided string lights to metal post and house', NULL, '3. Install: Afix owner provided string lights to metal post and house', NULL, NULL, NULL, NULL),
  (520090, 41963005, 'Change Lemon to EUREKA LEMON', NULL, 'Change Lemon to EUREKA LEMON', NULL, NULL, NULL, 'Carlos Sosa,Jesus Panuco'),
  (524641, 37443736, '2. Demo: Remove all grass in front of house.', NULL, 'over 1280 sf for lower grass area

2. Demo: Remove all grass in front of house.', NULL, NULL, NULL, NULL),
  (524645, 37443736, '2. Demo: Till & Amend Sod area in front of house', NULL, '2. Demo: Till & Amend Sod area in front of house', NULL, NULL, NULL, NULL),
  (524658, 37443736, '3. Install: Irrigation', NULL, '3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (524673, 37443736, '3. Install: Sod in front of House', NULL, '3. Install: Sod in front of House', NULL, NULL, NULL, NULL),
  (524744, 37443736, '2. Demo: Remove soil/ grade area outside of Fence', NULL, '2. Demo: Remove soil/ grade area outside of Fence', NULL, NULL, NULL, NULL),
  (524757, 37443736, '2. Demo: Till & Amend Sod area outside of Fence', NULL, '2. Demo: Till & Amend Sod area outside of Fence', NULL, NULL, NULL, NULL),
  (524764, 37443736, '3. Install: Sod outside of fence', NULL, '3. Install: Sod outside of fence', NULL, NULL, NULL, NULL),
  (524904, 37443736, '3. Install: 50LF of edging', NULL, '3. Install: 50LF of edging', NULL, NULL, NULL, NULL),
  (524907, 37443736, '3. Install: Electrical', NULL, '(1 qty.) 95 linear feet of conduit down 12” (2 gfci outlets)

3. Install: Electrical', NULL, NULL, NULL, NULL),
  (527706, 43318414, 'Handle stains in concrete. Customer texted me as to what we''ve done so far. I called/texted Juan. no response. Need to get this handled and not let it linger.', NULL, 'Handle stains in concrete. Customer texted me as to what we''ve done so far. I called/texted Juan. no response. Need to get this handled and not let it linger.', '2026-03-05', NULL, NULL, '(.PM) Carter Godley,(.PM) Paul DeAngelis,JuanCarlos Vallejo'),
  (527745, 41411781, 'Install landscape lights', NULL, 'Install landscape lights', NULL, NULL, NULL, NULL),
  (527748, 41411781, 'Check irrigation', NULL, 'Check irrigation', NULL, NULL, NULL, NULL),
  (527797, 36551611, 'Check concrete with Paul', NULL, 'Check concrete with Paul', NULL, NULL, NULL, NULL),
  (527945, 40118858, 'Final inspection', NULL, 'Final inspection', NULL, NULL, NULL, NULL),
  (528021, 42580132, 'Adding more plants', NULL, '8 x Pink Kalanchoe, 6\ 6 x Groundcover sedum (see photo below), 1 gal

Adding more plants', NULL, NULL, NULL, NULL),
  (528033, 42580132, 'Install 18 more lights', NULL, 'Install 18 more lights', NULL, NULL, NULL, NULL),
  (544555, 41180214, 'Clarify Planting Plan with Owner', NULL, 'Clarify Planting Plan with Owner', NULL, NULL, NULL, 'Daniel Aguilar'),
  (544558, 41180214, 'Install 15 Gal Cocktail Tree', NULL, 'Install 15 Gal Cocktail Tree', NULL, NULL, NULL, NULL),
  (544861, 41180214, 'Send Plan for front walkway', NULL, 'Send Plan for front walkway', NULL, NULL, NULL, 'Daniel Aguilar'),
  (544862, 41180214, 'Install new concrete path', NULL, 'Install new concrete path', NULL, NULL, NULL, NULL),
  (544864, 38774894, 'Raise Pilasters', NULL, 'Raise Pilasters', NULL, NULL, NULL, NULL),
  (544866, 38774894, 'Plaster Pool', NULL, 'Plaster Pool', NULL, NULL, NULL, NULL),
  (544868, 38774894, 'Stretch Turf', NULL, 'Stretch Turf', NULL, NULL, NULL, NULL),
  (544873, 38774894, 'Get CO Created and Approved for Concrete', NULL, 'Get CO Created and Approved for Concrete', NULL, NULL, NULL, 'Daniel Aguilar'),
  (544880, 38774894, 'CO 13 Planting Approvals and List', NULL, 'CO 13 Planting Approvals and List', NULL, NULL, NULL, 'Daniel Aguilar'),
  (544885, 37890729, 'Meeting for Change Order', NULL, 'Meeting for Change Order', NULL, NULL, NULL, NULL),
  (548140, 41180158, 'Pool Finish', NULL, 'Pool Finish', NULL, NULL, NULL, NULL),
  (548142, 41180158, 'Backflow for auto fill', NULL, 'Backflow for auto fill', NULL, NULL, NULL, NULL),
  (548150, 41180158, 'Final Inspection', NULL, 'Final Inspection', NULL, NULL, NULL, NULL),
  (548713, 43162412, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (548714, 43162412, '6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (548715, 43162412, 'Project Supervisor to Familiarize with Job Scope, Plan, To Dos and Hours Assigned.', NULL, 'Project Supervisor to Familiarize with Job Scope, Plan, To Dos and Hours Assigned.', NULL, NULL, NULL, NULL),
  (548716, 43162412, 'Upload latest Design and Ensure it is Current', NULL, 'Upload latest Design and Ensure it is Current', NULL, NULL, NULL, NULL),
  (548717, 43162412, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (548718, 43162412, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (548796, 43162412, '2. Demo: Remove existing concrete in rear/side yard', NULL, 'up to 4”  aside from paver area approx. 1150 square feet

2. Demo: Remove existing concrete in rear/side yard', NULL, NULL, NULL, NULL),
  (548812, 43162412, '2. Demo: Remove excess soil in planter beds', NULL, '2. Demo: Remove excess soil in planter beds', NULL, NULL, NULL, NULL),
  (548816, 43162412, '2. Demo: Remove existing concrete patio', NULL, 'approx. 200 square feet

2. Demo: Remove existing concrete patio', NULL, NULL, NULL, NULL),
  (548830, 43162412, '2. Demo: Remove patio structure with roof and post footings.', NULL, '2. Demo: Remove patio structure with roof and post footings.', NULL, NULL, NULL, NULL),
  (548831, 43162412, '2. Demo: Remove existing water feature', NULL, '2. Demo: Remove existing water feature', NULL, NULL, NULL, NULL),
  (548834, 43162412, '2. Demo: Remove existing rear fencing', NULL, 'approx. 70 linear feet

2. Demo: Remove existing rear fencing', NULL, NULL, NULL, NULL),
  (548840, 43162412, '2. Demo: Remove existing chain link fencing in side yard', NULL, 'approx. 20 linear feet

2. Demo: Remove existing chain link fencing in side yard', NULL, NULL, NULL, NULL),
  (548864, 43162412, '2. Demo: Remove soil in rear planter beds', NULL, 'average of 4”

2. Demo: Remove soil in rear planter beds', NULL, NULL, NULL, NULL),
  (548874, 43162412, '2. Demo: Remove Aluminum shed', NULL, '2. Demo: Remove Aluminum shed', NULL, NULL, NULL, NULL),
  (548893, 43162412, '2. Demo: Move existing shed into new position', NULL, '2. Demo: Move existing shed into new position', NULL, NULL, NULL, NULL),
  (548895, 43162412, '2. Demo: Remove existing plantings as needed', NULL, '2. Demo: Remove existing plantings as needed', NULL, NULL, NULL, NULL),
  (548897, 43162412, '2. Demo: Bury existing pool pipe in deck area', NULL, '2. Demo: Bury existing pool pipe in deck area', NULL, NULL, NULL, NULL),
  (548917, 43162412, '2. Demo: Grade for pavers', NULL, '1550 sq ft

2. Demo: Grade for pavers', NULL, NULL, NULL, NULL),
  (548926, 43162412, '3. Install: Base and washed leveling sand in paver areas', NULL, '3. Install: Base and washed leveling sand in paver areas', NULL, NULL, NULL, NULL),
  (548940, 43162412, '3. Install: Pavers', NULL, 'Angelus brand Courtyard Stone 4-piece, approx. 1550 square feet

3. Install: Pavers', NULL, NULL, NULL, NULL),
  (548957, 43162412, '3. Install: Concrete edge restraints where pavers meet softscape areas', NULL, '3. Install: Concrete edge restraints where pavers meet softscape areas', NULL, NULL, NULL, NULL),
  (548968, 43162412, '3. Install: 15LF Angelus brand Courtyard Stone paver step build', NULL, '3. Install: 15LF Angelus brand Courtyard Stone paver step build', NULL, NULL, NULL, NULL),
  (548978, 43162412, '3. Install: Attached patio cover', NULL, '9’ x 20

3. Install: Attached patio cover', NULL, NULL, NULL, NULL),
  (549007, 43162412, '3. Install:  6 x 6 posts with skirts for Patio Cover', NULL, '3. Install:  6 x 6 posts with skirts for Patio Cover', NULL, NULL, NULL, NULL),
  (549034, 43162412, '3. Install: 6 x 8 beam for Patio Cover', NULL, '3. Install: 6 x 8 beam for Patio Cover', NULL, NULL, NULL, NULL),
  (549039, 43162412, '3. Install: 4 x 8 rafters for Patio Cover', NULL, '3. Install: 4 x 8 rafters for Patio Cover', NULL, NULL, NULL, NULL),
  (549048, 43162412, '3. Install: 3x3 shade bars 6”oc for Patio Cover', NULL, '3. Install: 3x3 shade bars 6”oc for Patio Cover', NULL, NULL, NULL, NULL),
  (549058, 43162412, '3. Install: Prime & Paint Patio Cover', NULL, '3. Install: Prime & Paint Patio Cover', NULL, NULL, NULL, NULL),
  (549066, 43162412, '2. Demo: Till and amend planting area soil', NULL, '2. Demo: Till and amend planting area soil', NULL, NULL, NULL, NULL),
  (549068, 43162412, '3. Install: Plants', NULL, '(2 qty) 24” box trees tbd (161 qty.) 5 gal standard shrubs (1 qty.) 15g premium shrub (jasmine trellis) (5 qty.) 1 gallon regal mist

3. Install: Plants', NULL, NULL, NULL, NULL),
  (549076, 43162412, '3. Install: Irrigation for planting', NULL, '(3 qty.) anti-siphon drip irrigation valves

3. Install: Irrigation for planting', NULL, NULL, NULL, NULL),
  (549085, 43162412, '3. Install: Mulch in Planting areas', NULL, '800 square feet

3. Install: Mulch in Planting areas', NULL, NULL, NULL, NULL),
  (549092, 43162412, '3. Install: Up to 1 yard of veggie soil for future veggie boxes', NULL, '3. Install: Up to 1 yard of veggie soil for future veggie boxes', NULL, NULL, NULL, NULL),
  (549112, 43162412, '2. Demo: Excavate/Grade DG and Gravel Areas', NULL, '2. Demo: Excavate/Grade DG and Gravel Areas', NULL, NULL, NULL, NULL),
  (549113, 43162412, '3. Install: Weed fabric for DG and Gravel Area', NULL, '3. Install: Weed fabric for DG and Gravel Area', NULL, NULL, NULL, NULL),
  (549118, 43162412, '3. Install: Tan Stabilized DG', NULL, 'approx. 465 square feet  includes 2 sacks of cement per cubic yard of D.G. for enhanced stabilization

3. Install: Tan Stabilized DG', NULL, NULL, NULL, NULL),
  (549127, 43162412, '3. Install: Pea Gravel', NULL, '330 square feet

3. Install: Pea Gravel', NULL, NULL, NULL, NULL),
  (549129, 43162412, '3. Install: Black metal edging for DG', NULL, '35 linear feet

3. Install: Black metal edging for DG', NULL, NULL, NULL, NULL),
  (549135, 43162412, '2. Demo: Till and amend sod area soil', NULL, 'approx. 480 square feet

2. Demo: Till and amend sod area soil', NULL, NULL, NULL, NULL),
  (549142, 43162412, '3. Install: Sod', NULL, '480 square feet of ‘Valley RTF’ sod or equivalent

3. Install: Sod', NULL, NULL, NULL, NULL),
  (549211, 43162412, '3. Install: Irrigation for Sod', NULL, '(1 qty.) anti-siphon spray irrigation valve

3. Install: Irrigation for Sod', NULL, NULL, NULL, NULL),
  (549218, 43162412, '3. Install: Vinyl gates', NULL, '(3 Qty)

3. Install: Vinyl gates', NULL, NULL, NULL, NULL),
  (549225, 43162412, '3. Install: Vinyl Fencing', NULL, '76 linear feet

3. Install: Vinyl Fencing', NULL, NULL, NULL, NULL),
  (549230, 43162412, '3. Install: Lighting', NULL, '(8 qty.) flood lights (2 qty.) path lights (1 qty.) step lights (6 qty.) in-ground lights F/X timer

3. Install: Lighting', NULL, NULL, NULL, NULL),
  (549235, 43162412, '3. Install: 300W transformer for Lighting', NULL, '3. Install: 300W transformer for Lighting', NULL, NULL, NULL, NULL),
  (549240, 43162412, '3. Install: Drainage', NULL, '260 linear feet of sdr 35 drains  8 paver inlets  8 atrium grates

3. Install: Drainage', NULL, NULL, NULL, NULL),
  (549305, 43162412, '3. Install: Curb core to Street', NULL, '3. Install: Curb core to Street', NULL, NULL, NULL, NULL),
  (549353, 43430595, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (549354, 43430595, '2. Pick up final payment unless there are outstanding items for completion.', NULL, '2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (549355, 43430595, 'Production Manager Review Prep Work for Completeness', NULL, 'Production Manager Review Prep Work for Completeness', NULL, NULL, NULL, NULL),
  (549356, 43430595, 'Upload latest Design and Ensure it is Current', NULL, 'Upload latest Design and Ensure it is Current', NULL, NULL, NULL, NULL),
  (549357, 43430595, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (549358, 43430595, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (549393, 43430595, '2. Demo: Remove Soil in front/rear yard', NULL, '2300 square feet 2” of soil

2. Demo: Remove Soil in front/rear yard', NULL, NULL, NULL, NULL),
  (549963, 43430595, '2. Demo: 2" of Grass', NULL, 'approx. 700 square feet

2. Demo: 2" of Grass', NULL, NULL, NULL, NULL),
  (550146, 43430595, '3. Install: Road Base', NULL, '3. Install: Road Base', NULL, NULL, NULL, NULL),
  (551271, 43430595, '2. Demo: 2” of soil in rear yard', NULL, 'approx. 2800

2. Demo: 2” of soil in rear yard', NULL, NULL, NULL, NULL),
  (551281, 43430595, '3. Install: Forms for pads/patio', NULL, '3. Install: Forms for pads/patio', NULL, NULL, NULL, NULL),
  (551284, 43430595, '3. Install: Rebar grid', NULL, '3. Install: Rebar grid', NULL, NULL, NULL, NULL),
  (551290, 43430595, '3. Install: Pour concrete pads/patio to 4” thickness', NULL, 'approx. 3455 square feet

3. Install: Pour concrete pads/patio to 4” thickness', NULL, NULL, NULL, NULL),
  (551291, 43430595, '3. Install: Forms for steps/landing in rear yard.', NULL, 'approx. 100 square feet with 75 linear feet of forming for steps

3. Install: Forms for steps/landing in rear yard.', NULL, NULL, NULL, NULL),
  (551301, 43430595, '3. Install: 4'' tall granite pondless waterfall with 3’ water run', NULL, '3. Install: 4'' tall granite pondless waterfall with 3’ water run', NULL, NULL, NULL, NULL),
  (551305, 43430595, '3. Install:  4’ x 8’ basin for water feature', NULL, '3. Install:  4’ x 8’ basin for water feature', NULL, NULL, NULL, NULL),
  (551311, 43430595, '3. Install: Boulders as needed for water feature', NULL, '3. Install: Boulders as needed for water feature', NULL, NULL, NULL, NULL),
  (551316, 43430595, '3. Install: Run 80 LF of electrical for water feature Pump', NULL, '3. Install: Run 80 LF of electrical for water feature Pump', NULL, NULL, NULL, NULL),
  (551354, 43430595, '2. Demo: Trench for drainage', NULL, '2. Demo: Trench for drainage', NULL, NULL, NULL, NULL),
  (551363, 43430595, '(6 qty.) masonry lid drain fixtures', NULL, '(6 qty.) masonry lid drain fixtures', NULL, NULL, NULL, NULL),
  (551377, 43430595, '3. Install: Irrigation', NULL, '(8 qty.) zones of drip irrigation  (2 qty.) zones of spray irrigation 16 station Rachio brand irrigation controller Note- Existing irrigation on hillside to be preserved

3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (551387, 43430595, '3. Install: Weed Barrier fabric for Gravel', NULL, '3. Install: Weed Barrier fabric for Gravel', NULL, NULL, NULL, NULL),
  (551391, 43430595, '3. Install: Pea gravel (3/8")', NULL, 'in planters as mulch and between front yard concrete pads, approx. 1380 square feet

3. Install: Pea gravel (3/8")', NULL, NULL, NULL, NULL),
  (551396, 43430595, '2. Demo: Till and amend planting area soil', NULL, 'approx. 1500 square feet

2. Demo: Till and amend planting area soil', NULL, NULL, NULL, NULL),
  (551449, 43430595, '3. Install: Trees and shrubs', NULL, '(18 qty.) 24” box trees (15 qty.) 15 gal trees (100 qty.) 5 gal standard shrubs

3. Install: Trees and shrubs', NULL, NULL, NULL, NULL),
  (551585, 43430595, '2. Demo: Trench for gas and electrical for Cook Center', NULL, 'approx. 90  LF for Electric line  approx. 40 LF for Gas

2. Demo: Trench for gas and electrical for Cook Center', NULL, NULL, NULL, NULL),
  (551605, 43430595, '2. Demo: Excavate for Cook Center Footings', NULL, '2. Demo: Excavate for Cook Center Footings', NULL, NULL, NULL, NULL),
  (551607, 43430595, '3. Install: Cook Center Footings', NULL, '3. Install: Cook Center Footings', NULL, NULL, NULL, NULL),
  (551609, 43430595, '3. Install: Cook Center CMU Block', NULL, '3. Install: Cook Center CMU Block', NULL, NULL, NULL, NULL),
  (551613, 43430595, '3. Install: Form and pour Cook Center concrete countertop', NULL, 'approx. 27 square feet

3. Install: Form and pour Cook Center concrete countertop', NULL, NULL, NULL, NULL),
  (551614, 43430595, '3. Install: GFCI receptacle for Cook Center', NULL, '3. Install: GFCI receptacle for Cook Center', NULL, NULL, NULL, NULL),
  (551619, 43430595, '3. Install: Smooth Stucco finish to Cook Center', NULL, '70 square feet

3. Install: Smooth Stucco finish to Cook Center', NULL, NULL, NULL, NULL),
  (551623, 43430595, 'Tee off gas line for Fire pit', NULL, 'Tee off gas line for Fire pit', NULL, NULL, NULL, NULL),
  (551648, 43430595, '2. Demo: Excavate footings for Fire pit', NULL, '2. Demo: Excavate footings for Fire pit', NULL, NULL, NULL, NULL),
  (551656, 43430595, '3. Install: Pour Footings for Fire pit', NULL, '3. Install: Pour Footings for Fire pit', NULL, NULL, NULL, NULL),
  (551662, 43430595, '3. Install: Form 23LF of 12" firepit walls', NULL, '3. Install: Form 23LF of 12" firepit walls', NULL, NULL, NULL, NULL),
  (551664, 43430595, '3. Install: Set steel for Fire pit', NULL, '3. Install: Set steel for Fire pit', NULL, NULL, NULL, NULL),
  (551665, 43430595, '3. Install: Pour Fire pit', NULL, '3. Install: Pour Fire pit', NULL, NULL, NULL, NULL),
  (551783, 43430595, '3. Install: Gas Bar for Fire pit', NULL, '3. Install: Gas Bar for Fire pit', NULL, NULL, NULL, NULL),
  (551788, 43430595, '3. Install: Fireglass for Fire Pit', NULL, '10sqft

3. Install: Fireglass for Fire Pit', NULL, NULL, NULL, NULL),
  (551792, 43430595, '3. Install: Lighting', NULL, '(1 qty.) 200-watt transformer (6 qty.) Lightcraft or equal LED spot lights (12 qty.) Lightcraft or equal LED path lights (11 qty.) Lightcraft or equal LED step lights F/X timer

3. Install: Lighting', NULL, NULL, NULL, NULL),
  (551803, 43430595, '2. Demo: Till and amend sod area', NULL, 'approx. 1355 square feet

2. Demo: Till and amend sod area', NULL, NULL, NULL, NULL),
  (551821, 43430595, '3. Install: Sod', NULL, 'Valley RTF’ sod, approx. 1355 square feet

3. Install: Sod', NULL, NULL, NULL, NULL),
  (551832, 43430595, '3. Install: 35 linear feet of cmu wall in front yard', NULL, 'up to 18” high

3. Install: 35 linear feet of cmu wall in front yard', NULL, NULL, NULL, NULL),
  (551838, 43430595, '3. Install: Waterproofing behind retaining wall', NULL, '3. Install: Waterproofing behind retaining wall', NULL, NULL, NULL, NULL),
  (551845, 43430595, '3. Install: Smooth Stucco to small front wall', NULL, '3. Install: Smooth Stucco to small front wall', NULL, NULL, NULL, NULL),
  (558051, 43447324, 'Add irrigation timer when electrical is installed', NULL, 'Add irrigation timer when electrical is installed', NULL, NULL, NULL, NULL),
  (558056, 43447324, 'Irrigation timer', NULL, 'Irrigation timer', NULL, NULL, NULL, NULL),
  (562421, 40998162, 'Made', NULL, 'Made', NULL, NULL, NULL, NULL),
  (562422, 40998162, '4. Pick up yard sign unless ok by client to leave longer.', NULL, '4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (562423, 40998162, 'Production Manager Familiarize with  Job Scope, Plan and Tasks', NULL, 'Production Manager Familiarize with  Job Scope, Plan and Tasks', NULL, NULL, NULL, NULL),
  (562424, 40998162, 'Upload Contract', NULL, 'Upload Contract', NULL, NULL, NULL, NULL),
  (562425, 40998162, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (562426, 40998162, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (573370, 43455241, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (573371, 43455241, '6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (573372, 43455241, 'Production Manager Familiarize with  Job Scope, Plan and Tasks', NULL, 'Production Manager Familiarize with  Job Scope, Plan and Tasks', NULL, NULL, NULL, NULL),
  (573373, 43455241, 'Upload Any Permit Info', NULL, 'Upload Any Permit Info', NULL, NULL, NULL, NULL),
  (573374, 43455241, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (573375, 43455241, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (580392, 40998162, '2. Demo: Excavate for cook center footings', NULL, '2. Demo: Excavate for cook center footings', NULL, NULL, NULL, NULL),
  (580515, 40998162, '2. Demo: Excavate/ Grade for new Pool & Spa', NULL, '2. Demo: Excavate/ Grade for new Pool & Spa', NULL, NULL, NULL, NULL),
  (580539, 40998162, '2. Demo: Excavate/Grade area for Pavers', NULL, '2. Demo: Excavate/Grade area for Pavers', NULL, NULL, NULL, NULL),
  (580567, 40998162, '2. Demo: Excavate/Grade Turf Area', NULL, '2. Demo: Excavate/Grade Turf Area', NULL, NULL, NULL, NULL),
  (580607, 40998162, '2. Demo: Remove existing rear lawn at pool area', NULL, '2. Demo: Remove existing rear lawn at pool area', NULL, NULL, NULL, NULL),
  (580637, 40998162, '2. Demo: Remove remaining existing grass in rear yard', NULL, '2. Demo: Remove remaining existing grass in rear yard', NULL, NULL, NULL, NULL),
  (580642, 40998162, '2. Demo: Till and Amend Planting area', NULL, '400 square feet (hillside not included)

2. Demo: Till and Amend Planting area', NULL, NULL, NULL, NULL),
  (580654, 40998162, '2. Demo: Trench for drainage', NULL, '2. Demo: Trench for drainage', NULL, NULL, NULL, NULL),
  (580657, 40998162, '2. Demo: Trench for gas/electrical for  pool equipment', NULL, '2. Demo: Trench for gas/electrical for  pool equipment', NULL, NULL, NULL, NULL),
  (580660, 40998162, '2. Demo: Trim plants as needed above swale (Hillside Slope)', NULL, '2. Demo: Trim plants as needed above swale (Hillside Slope)', NULL, NULL, NULL, NULL),
  (580665, 40998162, '3. Install: (5qty) GFCI receptacles for Cook Center', NULL, '3. Install: (5qty) GFCI receptacles for Cook Center', NULL, NULL, NULL, NULL),
  (580669, 40998162, '3. Install: 80LF of black metal edging', NULL, '3. Install: 80LF of black metal edging', NULL, NULL, NULL, NULL),
  (580689, 40998162, '3. Install: 82LF of paver steps', NULL, 'Bellecrete ‘Modern’ precast treads & risers

3. Install: 82LF of paver steps', NULL, NULL, NULL, NULL),
  (580691, 40998162, '3. Install: Apply sand stucco finish to remaining sides of Cook Center', NULL, '3. Install: Apply sand stucco finish to remaining sides of Cook Center', NULL, NULL, NULL, NULL),
  (580697, 40998162, '3. Install: Artificial turf', NULL, '‘Simple Turf’ brand ‘Socal Blend Supreme’ turf, approx. 900 square feet

3. Install: Artificial turf', NULL, NULL, NULL, NULL),
  (580701, 40998162, '3. Install: Bellecrete coping', NULL, '3. Install: Bellecrete coping', NULL, NULL, NULL, NULL),
  (580704, 40998162, '3. Install: Concrete edge restraints on pavers', NULL, '3. Install: Concrete edge restraints on pavers', NULL, NULL, NULL, NULL),
  (580706, 40998162, '3. Install: Concrete pad for pool equipment', NULL, '3. Install: Concrete pad for pool equipment', NULL, NULL, NULL, NULL),
  (580713, 40998162, '3. Install: Cook Center Footings', NULL, '3. Install: Cook Center Footings', NULL, NULL, NULL, NULL),
  (580717, 40998162, '3. Install: Drainage', NULL, '3. Install: Drainage', NULL, NULL, NULL, NULL),
  (580719, 40998162, '3. Install: Electrical subpanel for pool equipment', NULL, '3. Install: Electrical subpanel for pool equipment', NULL, NULL, NULL, NULL),
  (580723, 40998162, '3. Install: Gas shut-off valve for cook center', NULL, '3. Install: Gas shut-off valve for cook center', NULL, NULL, NULL, NULL),
  (580726, 40998162, '3. Install: Gas/Electrical for pool equipment', NULL, '3. Install: Gas/Electrical for pool equipment', NULL, NULL, NULL, NULL),
  (580728, 40998162, '3. Install: Gravel for turf area', NULL, '3. Install: Gravel for turf area', NULL, NULL, NULL, NULL),
  (580733, 40998162, '3. Install: Irrigation', NULL, '3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (580737, 40998162, '3. Install: Joint sand', NULL, '3. Install: Joint sand', NULL, NULL, NULL, NULL),
  (580738, 40998162, '3. Install: Lay CMU block for Cook Center', NULL, '3. Install: Lay CMU block for Cook Center', NULL, NULL, NULL, NULL),
  (580739, 40998162, '3. Install: Lighting', NULL, '3. Install: Lighting', NULL, NULL, NULL, NULL),
  (580740, 40998162, '3. Install: Mulch in planting area', NULL, '3. Install: Mulch in planting area', NULL, NULL, NULL, NULL),
  (580745, 40998162, '3. Install: Owner provided equipment for Cook Center', NULL, 'G rill Sink Fridge  Access Doors

3. Install: Owner provided equipment for Cook Center', NULL, NULL, NULL, NULL),
  (580749, 40998162, '3. Install: Pavers', NULL, 'Angelus brand Paseo I & II pavers, approx. 1650 square feet

3. Install: Pavers', NULL, NULL, NULL, NULL),
  (580753, 40998162, '3. Install: Plants', NULL, '3. Install: Plants', NULL, NULL, NULL, NULL),
  (580754, 40998162, '3. Install: Rebar for New Pool/Spa', NULL, '3. Install: Rebar for New Pool/Spa', NULL, NULL, NULL, NULL),
  (580755, 40998162, '3. Install: Plaster', NULL, '3. Install: Plaster', NULL, NULL, NULL, NULL),
  (580757, 40998162, '3. Install: Pool Equipment', NULL, '3. Install: Pool Equipment', NULL, NULL, NULL, NULL),
  (580758, 40998162, '3. Install: Pool Plumbing', NULL, '3. Install: Pool Plumbing', NULL, NULL, NULL, NULL),
  (580778, 40998162, '3. Install: Porcelain tile to exterior or raised spa', NULL, '3. Install: Porcelain tile to exterior or raised spa', NULL, NULL, NULL, NULL),
  (580780, 40998162, '3. Install: Road Base for pavers', NULL, '3. Install: Road Base for pavers', NULL, NULL, NULL, NULL),
  (580785, 40998162, '3. Install: Pour Concrete countertop for Cook Center', NULL, '3. Install: Pour Concrete countertop for Cook Center', NULL, NULL, NULL, NULL),
  (580806, 40998162, '3. Install: Run electrical and gas line to pool equipment', NULL, 'approx. 80 linear feet

3. Install: Run electrical and gas line to pool equipment', NULL, NULL, NULL, NULL),
  (580811, 40998162, '3. Install: Run water to cook center', NULL, '3. Install: Run water to cook center', NULL, NULL, NULL, NULL),
  (580812, 40998162, '3. Install: Sealer for Countertop', NULL, 'approx. 70 square feet

3. Install: Sealer for Countertop', NULL, NULL, NULL, NULL),
  (580818, 40998162, '3. Install: Set Forms for Pool/ Spa', NULL, '3. Install: Set Forms for Pool/ Spa', NULL, NULL, NULL, NULL),
  (580824, 40998162, '3. Install: Set Steel for Cook Center', NULL, '3. Install: Set Steel for Cook Center', NULL, NULL, NULL, NULL),
  (580827, 40998162, '3. Install: Veneer to rear side of Cook Center', NULL, '3. Install: Veneer to rear side of Cook Center', NULL, NULL, NULL, NULL),
  (580832, 40998162, '3. Install: Waterline Tile for New Pool', NULL, '3. Install: Waterline Tile for New Pool', NULL, NULL, NULL, NULL),
  (580870, 41764903, '4. Pick up yard sign unless ok by client to leave longer.', NULL, '4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (580920, 41764903, '1a. Choices: Bellecrete Color', NULL, '1a. Choices: Bellecrete Color', NULL, NULL, NULL, NULL),
  (580922, 41764903, '1a. Choices: Color for pool cover vault', NULL, '1a. Choices: Color for pool cover vault', NULL, NULL, NULL, NULL),
  (580925, 41764903, '2. Demo: Form for new handhold (pool cover track)', NULL, 'Demo into raised bond beam

2. Demo: Form for new handhold (pool cover track)', NULL, NULL, NULL, NULL),
  (580931, 41764903, '2. Demo: Remove existing tile/steps', NULL, 'up to 4” depth, approx. 500 square feet Fill voids

2. Demo: Remove existing tile/steps', NULL, NULL, NULL, NULL),
  (580932, 41764903, '3. Install: 12"H raised bond beam ~20LF', NULL, '3. Install: 12"H raised bond beam ~20LF', NULL, NULL, NULL, NULL),
  (580933, 41764903, '3. Install: Coping', NULL, '3. Install: Coping', NULL, NULL, NULL, NULL),
  (581027, 41764903, '3. Install: Cover Pro Pool cover Vault', NULL, '3. Install: Cover Pro Pool cover Vault', NULL, NULL, NULL, NULL),
  (581028, 41764903, '3. Install: Plaster in Pool and Spa', NULL, '‘NPT’ ‘Quartzscapes’ ~140 LF

3. Install: Plaster in Pool and Spa', NULL, NULL, NULL, NULL),
  (581030, 41764903, '3. Install: Pool Cover Vault Housing', NULL, '3. Install: Pool Cover Vault Housing', NULL, NULL, NULL, NULL),
  (581033, 41764903, '3. Install: Pool Equipment', NULL, '3. Install: Pool Equipment', NULL, NULL, NULL, NULL),
  (581036, 41764903, '3. Install: Pool Plumbing', NULL, '3. Install: Pool Plumbing', NULL, NULL, NULL, NULL),
  (581039, 41764903, '3. Install: Tile dam wall in Spa', NULL, '3. Install: Tile dam wall in Spa', NULL, NULL, NULL, NULL),
  (581042, 41764903, '3. Install: Waterline Tile', NULL, '3. Install: Waterline Tile', NULL, NULL, NULL, NULL),
  (581061, 41764903, '2. Demo: Excavate concrete Footings for Additional Wall', NULL, '2. Demo: Excavate concrete Footings for Additional Wall', NULL, NULL, NULL, NULL),
  (581069, 41764903, '3. Install: 15 LF of 12” height wall to support soil by swim vault', NULL, '3. Install: 15 LF of 12” height wall to support soil by swim vault', NULL, NULL, NULL, NULL),
  (581075, 41764903, '3. Install: Smooth Stucco Finish to Additional Walls', NULL, 'By Vault Left side wall supporting soil Equipment Wall

3. Install: Smooth Stucco Finish to Additional Walls', NULL, NULL, NULL, NULL),
  (581084, 41764903, '3. Install: 12 LF of 18” height wall to support soil on left side', NULL, '3. Install: 12 LF of 18” height wall to support soil on left side', NULL, NULL, NULL, NULL),
  (581093, 41764903, '2. Demo: Remove and average 6" Soil in Sod Area', NULL, 'over 1100 square feet

2. Demo: Remove and average 6" Soil in Sod Area', NULL, NULL, NULL, NULL),
  (581095, 41764903, '3. Install: Trench and run 4” SDR35 drain pipe', NULL, 'approx. 100 linear feet

3. Install: Trench and run 4” SDR35 drain pipe', NULL, NULL, NULL, NULL),
  (581118, 41764903, '3. Install: Paver inlet and Atrium drains', NULL, '(4 qty.) paver inlet drains (4 qty.) 4” atrium drains

3. Install: Paver inlet and Atrium drains', NULL, NULL, NULL, NULL),
  (581122, 41764903, '2. Demo: Remove existing rear pool equipment wall', NULL, 'approx. 6 linear feet x 72” height

2. Demo: Remove existing rear pool equipment wall', NULL, NULL, NULL, NULL),
  (581125, 41764903, '2. Demo: Remove 4” existing concrete', NULL, 'approx. 40 square feet

2. Demo: Remove 4” existing concrete', NULL, NULL, NULL, NULL),
  (581129, 41764903, '3. Install: Footings for Pool Equipment Wall', NULL, '3. Install: Footings for Pool Equipment Wall', NULL, NULL, NULL, NULL),
  (581131, 41764903, '3. Install: 72” height pool equipment wall', NULL, 'approx. 10 LF

3. Install: 72” height pool equipment wall', NULL, NULL, NULL, NULL),
  (581297, 41764903, '3. Install: Wall cap to Pool Equipment wall', NULL, '12” wide precast

3. Install: Wall cap to Pool Equipment wall', NULL, NULL, NULL, NULL),
  (581300, 41764903, '3. Install: Concrete Pad for pool equipment', NULL, '3. Install: Concrete Pad for pool equipment', NULL, NULL, NULL, NULL),
  (581321, 41180158, '3. Install: Pool Plaster', NULL, '3. Install: Pool Plaster', NULL, NULL, NULL, NULL),
  (581439, 41954408, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (581440, 41954408, '2. Pick up final payment unless there are outstanding items for completion.', NULL, '2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (581441, 41954408, 'Project Supervisor to Familiarize with Job Scope, Plan, To Dos and Hours Assigned.', NULL, 'Project Supervisor to Familiarize with Job Scope, Plan, To Dos and Hours Assigned.', NULL, NULL, NULL, NULL),
  (581442, 41954408, 'Double Check Client Contact Info and Job Info for Completeness and Correct Naming', NULL, 'Double Check Client Contact Info and Job Info for Completeness and Correct Naming', NULL, NULL, NULL, NULL),
  (581443, 41954408, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (581444, 41954408, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (581474, 41954408, '2. Demo: Remove 6" Soil for Future sand Bed', NULL, 'House Grading, Foundation & Slab

2. Demo: Remove 6" Soil for Future sand Bed', NULL, NULL, NULL, NULL),
  (581477, 41954408, '2. Demo: Remove 7" Soil (Driveway)', NULL, 'Concrete Driveway

2. Demo: Remove 7" Soil (Driveway)', NULL, NULL, NULL, NULL),
  (581495, 41954408, '2. Demo: Trench for 24" embedment', NULL, 'House Grading, Foundation & Slab

2. Demo: Trench for 24" embedment', NULL, NULL, NULL, NULL),
  (581498, 41954408, '2. Demo: Trench For Drainage ~250LF', NULL, '2. Demo: Trench For Drainage ~250LF', NULL, NULL, NULL, NULL),
  (581514, 41954408, '3. Install: Survey and stake Foundation placement', NULL, '3. Install: Survey and stake Foundation placement', NULL, NULL, NULL, NULL),
  (581566, 41954408, '3. Install: Drainage', NULL, '3. Install: Drainage', NULL, NULL, NULL, NULL),
  (581568, 41954408, '3. Install: 6" Sand bed for Slab', NULL, '3. Install: 6" Sand bed for Slab', NULL, NULL, NULL, NULL),
  (581571, 41954408, '3. Install: Apply TopCast #5 Sand Finish (Concrete Driveway)', NULL, '3. Install: Apply TopCast #5 Sand Finish (Concrete Driveway)', NULL, NULL, NULL, NULL),
  (581573, 41954408, '3. Install: Form & Pour Driveway', NULL, '3. Install: Form & Pour Driveway', NULL, NULL, NULL, NULL),
  (581574, 41954408, '3. Install: Hold-Downs & hardware per plan', NULL, 'House Grading, Foundation & Slab

3. Install: Hold-Downs & hardware per plan', NULL, NULL, NULL, NULL),
  (581576, 41954408, '3. Install: Lay 15mil Vapor Barrier', NULL, 'House Grading, Foundation & Slab

3. Install: Lay 15mil Vapor Barrier', NULL, NULL, NULL, NULL),
  (581624, 41954408, '3. Install: Pour ~3400sqft of 6" Concrete Slab', NULL, '3. Install: Pour ~3400sqft of 6" Concrete Slab', NULL, NULL, NULL, NULL),
  (581625, 41954408, '3. Install: Road Base (Driveway)', NULL, '3. Install: Road Base (Driveway)', NULL, NULL, NULL, NULL),
  (581627, 41954408, '3. Install: Set (2) 6x6 Steel Posts', NULL, 'House Grading, Foundation & Slab

3. Install: Set (2) 6x6 Steel Posts', NULL, NULL, NULL, NULL),
  (581634, 41954408, '3. Install: Set Steel for Grade Beam & Pour Concrete', NULL, 'House Grading, Foundation & Slab

3. Install: Set Steel for Grade Beam & Pour Concrete', NULL, NULL, NULL, NULL),
  (581637, 41954408, '3. Install: Set #4 Rebar for Foundation Slab', NULL, '3. Install: Set #4 Rebar for Foundation Slab', NULL, NULL, NULL, NULL),
  (581640, 41954408, 'Install: Set #5 Rebar for Foundation Walls', NULL, 'House Grading, Foundation & Slab

Install: Set #5 Rebar for Foundation Walls', NULL, NULL, NULL, NULL),
  (581656, 43022000, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (581657, 43022000, '6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (581658, 43022000, 'Production Manager Assign Project Supervisor', NULL, 'Production Manager Assign Project Supervisor', NULL, NULL, NULL, NULL),
  (581659, 43022000, 'Upload Any Permit Info', NULL, 'Upload Any Permit Info', NULL, NULL, NULL, NULL),
  (581660, 43022000, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (581661, 43022000, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (581694, 43022000, '2. Demo: Excavate Concrete decking area', NULL, '2. Demo: Excavate Concrete decking area', NULL, NULL, NULL, NULL),
  (581697, 43022000, '2. Demo: Excavate for beach pebble area outside of pool', NULL, '2. Demo: Excavate for beach pebble area outside of pool', NULL, NULL, NULL, NULL),
  (581763, 43022000, '2. Demo: Excavate/ Grade for new pool', NULL, '2. Demo: Excavate/ Grade for new pool', NULL, NULL, NULL, NULL),
  (581764, 43022000, '2. Demo: Lay out new Pool', NULL, '2. Demo: Lay out new Pool', NULL, NULL, NULL, NULL),
  (581765, 43022000, '2. Demo: Trench for Gas/Electrical for Pool Equipment', NULL, '2. Demo: Trench for Gas/Electrical for Pool Equipment', NULL, NULL, NULL, NULL),
  (581766, 43022000, '3. Install: Concrete Pad for Pool equipment', NULL, '3. Install: Concrete Pad for Pool equipment', NULL, NULL, NULL, NULL),
  (581767, 43022000, '3. Install: Coping for New Pool', NULL, '3. Install: Coping for New Pool', NULL, NULL, NULL, NULL),
  (581768, 43022000, '1. Inspection: Bottom', NULL, '1. Inspection: Bottom', NULL, NULL, NULL, NULL),
  (581769, 43022000, '1. Inspection: Rebar & Plumbing', NULL, '1. Inspection: Rebar & Plumbing', NULL, NULL, NULL, NULL),
  (581770, 43022000, '1. Inspection: Deputy for shotcrete (report)', NULL, '1. Inspection: Deputy for shotcrete (report)', NULL, NULL, NULL, NULL),
  (581771, 43022000, '1. Inspection: Enclosure/ Pre-plaster', NULL, '1. Inspection: Enclosure/ Pre-plaster', NULL, NULL, NULL, NULL),
  (581772, 43022000, '1. Inspection: Final', NULL, '1. Inspection: Final', NULL, NULL, NULL, NULL),
  (581773, 43022000, '3. Install: Gas/Electrical for Pool Equipment', NULL, '3. Install: Gas/Electrical for Pool Equipment', NULL, NULL, NULL, NULL),
  (581774, 43022000, '3. Install: Plaster New Pool', NULL, '3. Install: Plaster New Pool', NULL, NULL, NULL, NULL),
  (581775, 43022000, '3. Install: Plumbing for new Pool', NULL, '3. Install: Plumbing for new Pool', NULL, NULL, NULL, NULL),
  (581776, 43022000, '3. Install: Pool equipment', NULL, '3. Install: Pool equipment', NULL, NULL, NULL, NULL),
  (581777, 43022000, '3. Install: Pour Shotcrete for new pool', NULL, '3. Install: Pour Shotcrete for new pool', NULL, NULL, NULL, NULL),
  (581778, 43022000, '3. Install: Rebar for New Pool', NULL, '3. Install: Rebar for New Pool', NULL, NULL, NULL, NULL),
  (581779, 43022000, '3. Install: Set Forms for New Pool', NULL, '3. Install: Set Forms for New Pool', NULL, NULL, NULL, NULL),
  (581780, 43022000, '3. Install: Waterline Tile for New Pool', NULL, '3. Install: Waterline Tile for New Pool', NULL, NULL, NULL, NULL),
  (581832, 43022000, '2. Demo: Remove 4x8 section of interior floor, replace channel drain', NULL, '2. Demo: Remove 4x8 section of interior floor, replace channel drain', NULL, NULL, NULL, NULL),
  (581835, 43022000, '2. Demo: Remove Portion of existing concrete decking', NULL, 'approx. 200 square feet

2. Demo: Remove Portion of existing concrete decking', NULL, NULL, NULL, NULL),
  (581846, 43022000, '2. Demo: Sawcut into existing wall for new steps', NULL, '2. Demo: Sawcut into existing wall for new steps', NULL, NULL, NULL, NULL),
  (581848, 43022000, '3. Install: Vent to outside for pool equipment enclosure', NULL, '3. Install: Vent to outside for pool equipment enclosure', NULL, NULL, NULL, NULL),
  (581852, 43022000, '3. Install: (2 qty) step lights', NULL, '3. Install: (2 qty) step lights', NULL, NULL, NULL, NULL),
  (581854, 43022000, '3. Install: (3qty) masonry Pour-a-Lid drain outlets', NULL, '3. Install: (3qty) masonry Pour-a-Lid drain outlets', NULL, NULL, NULL, NULL),
  (581925, 43022000, '3. Install: 24” CMU block walls for firepit', NULL, '3. Install: 24” CMU block walls for firepit', NULL, NULL, NULL, NULL),
  (581946, 43022000, '3. Install: Beach pebble', NULL, 'approx. 30 sqft

3. Install: Beach pebble', NULL, NULL, NULL, NULL),
  (582019, 43022000, '3. Install: Bellecrete caps for firepit', NULL, 'approx. 20 linear feet

3. Install: Bellecrete caps for firepit', NULL, NULL, NULL, NULL),
  (582157, 43022000, '3. Install: Fill firepit with gravel, top with fireglass', NULL, 'approx. 20 square feet

3. Install: Fill firepit with gravel, top with fireglass', NULL, NULL, NULL, NULL),
  (582180, 43022000, '3. Install: Pour  concrete pad for pool equipment', NULL, '3. Install: Pour  concrete pad for pool equipment', NULL, NULL, NULL, NULL),
  (582183, 43022000, '3. Install: Pour Decking and steps', NULL, '3. Install: Pour Decking and steps', NULL, NULL, NULL, NULL),
  (582186, 43022000, '3. Install: Rebar for Concrete decking & steps', NULL, '3. Install: Rebar for Concrete decking & steps', NULL, NULL, NULL, NULL),
  (582188, 43022000, '3. Install: Refinish all existing concrete in rear yard', NULL, 'approx. 1800 square feet

3. Install: Refinish all existing concrete in rear yard', NULL, NULL, NULL, NULL),
  (582190, 43022000, '3. Install: Road Base for Concrete decking', NULL, '3. Install: Road Base for Concrete decking', NULL, NULL, NULL, NULL),
  (582191, 43022000, '3. Install: Set forms for Steps and Decking', NULL, '3. Install: Set forms for Steps and Decking', NULL, NULL, NULL, NULL),
  (582205, 43022000, '3. Install: Sheer descent water feature', NULL, '3. Install: Sheer descent water feature', NULL, NULL, NULL, NULL),
  (582223, 43022000, '3. Install: Stacked stone Veneer on exposed sides of Fire pit', NULL, 'approx. 36 square feet

3. Install: Stacked stone Veneer on exposed sides of Fire pit', NULL, NULL, NULL, NULL),
  (582228, 43022000, '3. Install: Weed barrier (Beach pebble area)', NULL, '3. Install: Weed barrier (Beach pebble area)', NULL, NULL, NULL, NULL),
  (582229, 43022000, '3. Install: (3 )up lights inside channels and connect to existing transformer', NULL, '3. Install: (3 )up lights inside channels and connect to existing transformer', NULL, NULL, NULL, NULL),
  (582232, 41796887, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (582233, 41796887, '7. Take final photos for our website and upload to Builder Trend', NULL, '7. Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (582234, 41796887, 'Project Supervisor to have Pre Job Walk meeting with Client and Designer/Consultant', NULL, 'Project Supervisor to have Pre Job Walk meeting with Client and Designer/Consultant', NULL, NULL, NULL, NULL),
  (582235, 41796887, 'Enter Daily Log with Job Specifics not covered in the Scope of Work.  Important!!!!', NULL, 'Enter Daily Log with Job Specifics not covered in the Scope of Work.  Important!!!!', NULL, NULL, NULL, NULL),
  (582236, 41796887, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (582237, 41796887, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (582277, 41796887, '2. Demo: Excavate for Concrete Footings (Front Wall)', NULL, '2. Demo: Excavate for Concrete Footings (Front Wall)', NULL, NULL, NULL, NULL),
  (582470, 41796887, '2. Demo: Excavate for Cook Center Footings', NULL, '2. Demo: Excavate for Cook Center Footings', NULL, NULL, NULL, NULL),
  (582474, 41796887, '2. Demo: Excavate/ Grade for New Pool', NULL, '2. Demo: Excavate/ Grade for New Pool', NULL, NULL, NULL, NULL),
  (582475, 41796887, '2. Demo: Lay out New Pool', NULL, '2. Demo: Lay out New Pool', NULL, NULL, NULL, NULL),
  (582476, 41796887, '2. Demo: Trench for Gas/Electrical for Pool Equipment', NULL, '2. Demo: Trench for Gas/Electrical for Pool Equipment', NULL, NULL, NULL, NULL),
  (582477, 41796887, '3. Install: Concrete Pad for Pool equipment', NULL, '3. Install: Concrete Pad for Pool equipment', NULL, NULL, NULL, NULL),
  (582478, 41796887, '3. Install: Coping for New Pool', NULL, '3. Install: Coping for New Pool', NULL, NULL, NULL, NULL),
  (582479, 41796887, '1. Inspection: Bottom', NULL, '1. Inspection: Bottom', NULL, NULL, NULL, NULL),
  (582480, 41796887, '1. Inspection: Rebar & Plumbing', NULL, '1. Inspection: Rebar & Plumbing', NULL, NULL, NULL, NULL),
  (582481, 41796887, '1. Inspection: Deputy for shotcrete (report)', NULL, '1. Inspection: Deputy for shotcrete (report)', NULL, NULL, NULL, NULL),
  (582482, 41796887, '1. Inspection: Enclosure/ Pre-plaster', NULL, '1. Inspection: Enclosure/ Pre-plaster', NULL, NULL, NULL, NULL),
  (582483, 41796887, '1. Inspection: Final', NULL, '1. Inspection: Final', NULL, NULL, NULL, NULL),
  (582484, 41796887, '3. Install: Gas/Electrical for Pool Equipment', NULL, '3. Install: Gas/Electrical for Pool Equipment', NULL, NULL, NULL, NULL),
  (582485, 41796887, '3. Install: Plaster New Pool', NULL, '3. Install: Plaster New Pool', NULL, NULL, NULL, NULL),
  (582486, 41796887, '3. Install: Plumbing for new Pool', NULL, '3. Install: Plumbing for new Pool', NULL, NULL, NULL, NULL),
  (582487, 41796887, '3. Install: Pool equipment', NULL, '3. Install: Pool equipment', NULL, NULL, NULL, NULL),
  (582488, 41796887, '3. Install: Pour Shotcrete for new pool', NULL, '3. Install: Pour Shotcrete for new pool', NULL, NULL, NULL, NULL),
  (582489, 41796887, '3. Install: Rebar for New Pool', NULL, '3. Install: Rebar for New Pool', NULL, NULL, NULL, NULL),
  (582490, 41796887, '3. Install: Set Forms for New Pool', NULL, '3. Install: Set Forms for New Pool', NULL, NULL, NULL, NULL),
  (582491, 41796887, '3. Install: Waterline Tile for New Pool', NULL, '3. Install: Waterline Tile for New Pool', NULL, NULL, NULL, NULL),
  (582723, 41796887, '2. Demo: Excavate for rear yard wall Footings', NULL, 'remove 300 square feet of soil

2. Demo: Excavate for rear yard wall Footings', NULL, NULL, NULL, NULL),
  (582750, 41796887, '2. Demo: Grade wall Area', NULL, 'approx. 84 tons of soil

2. Demo: Grade wall Area', NULL, NULL, NULL, NULL),
  (582764, 41796887, '2. Demo: Remove Existing concrete', NULL, '~ 600 square feet

2. Demo: Remove Existing concrete', NULL, NULL, NULL, NULL),
  (582775, 41796887, '2. Demo: Remove existing concrete (Rear Yard)', NULL, '2. Demo: Remove existing concrete (Rear Yard)', NULL, NULL, NULL, NULL),
  (582777, 41796887, '2. Demo: Remove existing lawn (Rear Yard)', NULL, 'up to 7”  ~860 sqft

2. Demo: Remove existing lawn (Rear Yard)', NULL, NULL, NULL, NULL),
  (582781, 41796887, '2. Demo: Remove existing walls', NULL, '2. Demo: Remove existing walls', NULL, NULL, NULL, NULL),
  (582785, 41796887, '2. Demo: Remove seating area and fire pit', NULL, '2. Demo: Remove seating area and fire pit', NULL, NULL, NULL, NULL),
  (582790, 41796887, '2. Demo: Trench for gas line (Cook Center)', NULL, '2. Demo: Trench for gas line (Cook Center)', NULL, NULL, NULL, NULL),
  (582792, 41796887, '3. Install: (2 qty) GFCI outlets (Cook Center)', NULL, '3. Install: (2 qty) GFCI outlets (Cook Center)', NULL, NULL, NULL, NULL),
  (582801, 41796887, '3. Install: CMU block  Rear Yard Wall', NULL, '~ 60 linear feet, reach finish height of 36”

3. Install: CMU block  Rear Yard Wall', NULL, NULL, NULL, NULL),
  (582804, 41796887, '3. Install: CMU Block Cook Center', NULL, '3. Install: CMU Block Cook Center', NULL, NULL, NULL, NULL),
  (582805, 41796887, '3. Install: CMU block Front Wall', NULL, '~ 67 linear feet, reach finish height of 36”

3. Install: CMU block Front Wall', NULL, NULL, NULL, NULL),
  (586846, 41796887, '3. Install: Irrigation', NULL, 'drip irrigation to front planters

3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (586848, 41796887, '3. Install: Plants', NULL, '3. Install: Plants', NULL, NULL, NULL, NULL),
  (586854, 41796887, '3. Install: Pour 4" Concrete', NULL, '3. Install: Pour 4" Concrete', NULL, NULL, NULL, NULL),
  (586856, 41796887, '3. Install: Pour 4" Concrete (Rear Yard)', NULL, '~ 1300 square feet

3. Install: Pour 4" Concrete (Rear Yard)', NULL, NULL, NULL, NULL),
  (586859, 41796887, '3. Install: Pour Concrete Countertop (Cook Center)', NULL, '3. Install: Pour Concrete Countertop (Cook Center)', NULL, NULL, NULL, NULL),
  (586862, 41796887, '3. Install: Pour Concrete footings (Front Wall)', NULL, '3. Install: Pour Concrete footings (Front Wall)', NULL, NULL, NULL, NULL),
  (586863, 41796887, '3. Install: Pour Cook Center footings', NULL, '3. Install: Pour Cook Center footings', NULL, NULL, NULL, NULL),
  (586864, 41796887, '3. Install: Pour rear wall Footings', NULL, '3. Install: Pour rear wall Footings', NULL, NULL, NULL, NULL),
  (586866, 41796887, '3. Install: Rebar & Forms (Rear Yard Concrete)', NULL, '3. Install: Rebar & Forms (Rear Yard Concrete)', NULL, NULL, NULL, NULL),
  (586869, 41796887, '3. Install: Road Base (Rear Yard Concrete)', NULL, '3. Install: Road Base (Rear Yard Concrete)', NULL, NULL, NULL, NULL),
  (586873, 41796887, '3. Install: Road Base for Concrete', NULL, '3. Install: Road Base for Concrete', NULL, NULL, NULL, NULL),
  (586877, 41796887, '3. Install: Run gas line to Cook Center', NULL, '3. Install: Run gas line to Cook Center', NULL, NULL, NULL, NULL),
  (586896, 41796887, '3. Install: Set steel (Front Wall)', NULL, '3. Install: Set steel (Front Wall)', NULL, NULL, NULL, NULL),
  (586899, 41796887, '3. Install: Set steel Rear Yard Wall', NULL, '3. Install: Set steel Rear Yard Wall', NULL, NULL, NULL, NULL),
  (586903, 41796887, '3. Install: Smooth Stucco (Cook Center)', NULL, '3. Install: Smooth Stucco (Cook Center)', NULL, NULL, NULL, NULL),
  (586909, 41245251, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (586910, 41245251, '4. Pick up yard sign unless ok by client to leave longer.', NULL, '4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (586911, 41245251, 'Job Walk Completed', NULL, 'Job Walk Completed', NULL, NULL, NULL, NULL),
  (586912, 41245251, 'Upload latest Design and Ensure it is Current', NULL, 'Upload latest Design and Ensure it is Current', NULL, NULL, NULL, NULL),
  (586913, 41245251, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (586914, 41245251, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (586955, 41245251, '1.Choices: Pavers', NULL, '1.Choices: Pavers', NULL, NULL, NULL, NULL),
  (586958, 41245251, '1. Choices: Tile Veneer', NULL, '1. Choices: Tile Veneer', NULL, NULL, NULL, NULL),
  (586960, 41245251, 'Side Yard Walls', NULL, 'Side Yard Walls', NULL, NULL, NULL, NULL),
  (586976, 41245251, 'Rear/Side Yard Concrete', NULL, 'Rear/Side Yard Concrete', NULL, NULL, NULL, NULL),
  (586986, 41245251, '2. Demo: Sawcut for Paver Ribbons', NULL, '2. Demo: Sawcut for Paver Ribbons', NULL, NULL, NULL, NULL),
  (586987, 41245251, '2. Demo: Till and Amend Soil (Plants)', NULL, '2. Demo: Till and Amend Soil (Plants)', NULL, NULL, NULL, NULL),
  (586989, 41245251, '2. Demo: Trench Electrical for New Fountain', NULL, '2. Demo: Trench Electrical for New Fountain', NULL, NULL, NULL, NULL),
  (586990, 41245251, '2. Demo: Trench for Gas Line (Fire Pit)', NULL, '2. Demo: Trench for Gas Line (Fire Pit)', NULL, NULL, NULL, NULL),
  (586996, 41245251, '2. Demo: Trench for Gas Stub-Ups (3qty)', NULL, '2. Demo: Trench for Gas Stub-Ups (3qty)', NULL, NULL, NULL, NULL),
  (586997, 41245251, '2. Demo: Trench for GFIC Receptacles (3qty)', NULL, '2. Demo: Trench for GFIC Receptacles (3qty)', NULL, NULL, NULL, NULL),
  (586998, 41245251, '2. Demo: Trench for Hose Bib', NULL, '2. Demo: Trench for Hose Bib', NULL, NULL, NULL, NULL),
  (586999, 41245251, 'Planters Behind Side Yard Walls', NULL, 'Planters Behind Side Yard Walls', NULL, NULL, NULL, NULL),
  (587019, 41245251, 'Seat wall & Seat bench', NULL, 'Seat wall & Seat bench', NULL, NULL, NULL, NULL),
  (595332, 41411781, 'Install outlet for lights.', NULL, 'Install outlet for lights.', NULL, NULL, NULL, NULL),
  (595338, 41411781, 'Put transformer in', NULL, 'Put transformer in', NULL, NULL, NULL, NULL),
  (595340, 41411781, 'Clean Up', NULL, 'Clean Up', NULL, NULL, NULL, NULL),
  (595861, 42580132, '3. Install: 14 plants from Foothill nuersery', NULL, '3. Install: 14 plants from Foothill nuersery', NULL, NULL, NULL, NULL),
  (596545, 41411781, '3. Install: 300sqft mexican Beach  in Buff 1-2"', NULL, '3. Install: 300sqft mexican Beach  in Buff 1-2"', NULL, NULL, NULL, NULL),
  (596559, 41411781, '3. Install: 20 LF of 6" meatal edging', NULL, '3. Install: 20 LF of 6" meatal edging', NULL, NULL, NULL, NULL),
  (604025, 39951145, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (604026, 39951145, '6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (604027, 39951145, 'Production Manager Assign Project Supervisor', NULL, 'Production Manager Assign Project Supervisor', NULL, NULL, NULL, NULL),
  (604028, 39951145, 'Upload Bid', NULL, 'Upload Bid', NULL, NULL, NULL, NULL),
  (604029, 39951145, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (604030, 39951145, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (604058, 39951145, '2. Demo: Remove existing concrete border on slope', NULL, 'approx. 6 LF

2. Demo: Remove existing concrete border on slope', NULL, NULL, NULL, NULL),
  (604081, 39951145, '2. Demo: Excavate/Grade for Tile Patio', NULL, '2. Demo: Excavate/Grade for Tile Patio', NULL, NULL, NULL, NULL),
  (604089, 39951145, '3. Install: Road base for Tile Patio', NULL, '3. Install: Road base for Tile Patio', NULL, NULL, NULL, NULL),
  (604092, 39951145, '3. Install: Rebar for Tile Patio', NULL, '3. Install: Rebar for Tile Patio', NULL, NULL, NULL, NULL),
  (604104, 39951145, '3. Install: Concrete slab', NULL, '4” thick slab approx. 252 square feet

3. Install: Concrete slab', NULL, NULL, NULL, NULL),
  (604105, 39951145, '3. Install: Owner-provided tile over new concrete slab', NULL, '3. Install: Owner-provided tile over new concrete slab', NULL, NULL, NULL, NULL),
  (604107, 39951145, '3. Install: Seal Tile', NULL, '3. Install: Seal Tile', NULL, NULL, NULL, NULL),
  (605797, 41411781, 'Install gate', NULL, 'Install gate', NULL, NULL, NULL, NULL),
  (609368, 43853281, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (609369, 43853281, '3. Pick up Job Box.', NULL, '3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (609370, 43853281, 'Production Manager Review Prep Work for Completeness', NULL, 'Production Manager Review Prep Work for Completeness', NULL, NULL, NULL, NULL),
  (609371, 43853281, 'Enter in Any To Dos for Outstanding Issues (need selections, potential plan changes etc.)', NULL, 'Enter in Any To Dos for Outstanding Issues (need selections, potential plan changes etc.)', NULL, NULL, NULL, NULL),
  (609372, 43853281, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (609373, 43853281, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (609411, 43853281, '2. Demo: sawcut 4” of existing concrete to create new planter', NULL, 'approx. 40 square feet

2. Demo: sawcut 4” of existing concrete to create new planter', NULL, NULL, NULL, NULL),
  (609427, 43853281, '3. Install: root barrier', NULL, 'approx. 42 linear feet

3. Install: root barrier', NULL, NULL, NULL, NULL),
  (609432, 43853281, '3. Install: Shredded bark mulch', NULL, 'Install 40 square feet

3. Install: Shredded bark mulch', NULL, NULL, NULL, NULL),
  (609450, 43853281, '3.  Install: Extend irrigation from existing planters', NULL, '3.  Install: Extend irrigation from existing planters', NULL, NULL, NULL, NULL),
  (609457, 43853281, '3. Install: Plants (provided by owner)', NULL, '(8 qty.) 25 gal trees

3. Install: Plants (provided by owner)', NULL, NULL, NULL, NULL),
  (630910, 40118858, '3. Install: concrete stain', NULL, '3. Install: concrete stain', NULL, NULL, NULL, NULL),
  (630989, 40118858, '4. Repair: Fix chipped concrete next to cover vault', NULL, '4. Repair: Fix chipped concrete next to cover vault', NULL, NULL, NULL, NULL),
  (630992, 40118858, 'Ask about tile sealant', NULL, 'Ask about tile sealant', '2026-03-10', NULL, NULL, 'Daniel Aguilar'),
  (646654, 41760041, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (646655, 41760041, '1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (646656, 41760041, 'Production Manager Review Prep Work for Completeness', NULL, 'Production Manager Review Prep Work for Completeness', NULL, NULL, NULL, NULL),
  (646657, 41760041, 'Upload Before Photos and Videos', NULL, 'Upload Before Photos and Videos', NULL, NULL, NULL, NULL),
  (646658, 41760041, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (646659, 41760041, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (646690, 41760041, '2. Demo: Dig for Pool and Spa', NULL, '2. Demo: Dig for Pool and Spa', NULL, NULL, NULL, NULL),
  (646692, 41760041, '2. Demo: Excavate for 8” concrete curbing', NULL, '2. Demo: Excavate for 8” concrete curbing', NULL, NULL, NULL, NULL),
  (646699, 41760041, '2. Demo: Excavate/Grade paver area', NULL, '~ 2500 sqft

2. Demo: Excavate/Grade paver area', NULL, NULL, NULL, NULL),
  (646702, 41760041, '2. Demo: Remove existing concrete/Flagstone in rear yard', NULL, '~ 1540 sqft

2. Demo: Remove existing concrete/Flagstone in rear yard', NULL, NULL, NULL, NULL),
  (646704, 41760041, '2. Demo: Remove existing planting in rear yard', NULL, '~1000+ sqft

2. Demo: Remove existing planting in rear yard', NULL, NULL, NULL, NULL),
  (646706, 41760041, '2. Demo: Remove existing wall in paver area', NULL, '~ 45LF

2. Demo: Remove existing wall in paver area', NULL, NULL, NULL, NULL),
  (646707, 41760041, '2. Demo: Till and Amend sod area', NULL, '~300 sqft

2. Demo: Till and Amend sod area', NULL, NULL, NULL, NULL),
  (646708, 41760041, '2. Demo: Trench and Run drain line', NULL, '200LF

2. Demo: Trench and Run drain line', NULL, NULL, NULL, NULL),
  (646711, 41760041, '2. Demo: Trench and Run electrical/gas from meters to pool equipment', NULL, '2. Demo: Trench and Run electrical/gas from meters to pool equipment', NULL, NULL, NULL, NULL),
  (646712, 41760041, '3. Install: Concrete pad for pool equipment', NULL, '3. Install: Concrete pad for pool equipment', NULL, NULL, NULL, NULL),
  (646713, 41760041, '3. Install:  stucco finish on rear side of raised bond beam', NULL, '3. Install:  stucco finish on rear side of raised bond beam', NULL, NULL, NULL, NULL),
  (646714, 41760041, '3. Install: (3 qty.) 3’ wide sheer descents', NULL, '3. Install: (3 qty.) 3’ wide sheer descents', NULL, NULL, NULL, NULL),
  (646781, 41760041, '3. Install: 1 new zone of irrigation for future planting', NULL, '3. Install: 1 new zone of irrigation for future planting', NULL, NULL, NULL, NULL),
  (646784, 41760041, '3. Install: 180LF of forms for Curbing', NULL, '3. Install: 180LF of forms for Curbing', NULL, NULL, NULL, NULL),
  (646787, 41760041, '3. Install: Base & leveling sand for pavers', NULL, '3. Install: Base & leveling sand for pavers', NULL, NULL, NULL, NULL),
  (646789, 41760041, '3. Install: Concrete edge restraints Paver/softscape', NULL, '3. Install: Concrete edge restraints Paver/softscape', NULL, NULL, NULL, NULL),
  (646791, 41760041, '3. Install: curb core', NULL, '3. Install: curb core', NULL, NULL, NULL, NULL),
  (646793, 41760041, '3. Install: Inlet drains', NULL, '(9 qty)

3. Install: Inlet drains', NULL, NULL, NULL, NULL),
  (646799, 41760041, '3. Install: Plaster', NULL, '3. Install: Plaster', NULL, NULL, NULL, NULL),
  (646802, 41760041, '3. Install: Layout travertine paver in pergola area', NULL, 'Pergola area 460 sqft

3. Install: Layout travertine paver in pergola area', NULL, NULL, NULL, NULL),
  (646808, 41760041, '3. Install: Ledger stone', NULL, '3. Install: Ledger stone', NULL, NULL, NULL, NULL),
  (646810, 41760041, '3. Install: Lighting', NULL, '3. Install: Lighting', NULL, NULL, NULL, NULL),
  (646812, 41760041, '3. Install: Pavers', NULL, '3. Install: Pavers', NULL, NULL, NULL, NULL),
  (646819, 41760041, '3. Install: Plumbing for New pool', NULL, '3. Install: Plumbing for New pool', NULL, NULL, NULL, NULL),
  (646823, 41760041, '3. Install: Pool Coping', NULL, '‘Bellecrete’ brand ‘Modern Edge’ precast coping or travertine

3. Install: Pool Coping', NULL, NULL, NULL, NULL),
  (646828, 41760041, '3. Install: Pool Equipment', NULL, '3. Install: Pool Equipment', NULL, NULL, NULL, NULL),
  (646830, 41760041, '3. Install: Pour Concrete curb 6', NULL, '3. Install: Pour Concrete curb 6', NULL, NULL, NULL, NULL),
  (646832, 41760041, '3. Install: Pour Shotcrete for Pool and Spa', NULL, '3. Install: Pour Shotcrete for Pool and Spa', NULL, NULL, NULL, NULL),
  (646833, 41760041, '3. Install: Rebar for New Pool', NULL, '3. Install: Rebar for New Pool', NULL, NULL, NULL, NULL),
  (646837, 41760041, '3. Install: Set Forms for new Pool & Spa', NULL, '3. Install: Set Forms for new Pool & Spa', NULL, NULL, NULL, NULL),
  (646838, 41760041, '3. Install: Sod', NULL, '3. Install: Sod', NULL, NULL, NULL, NULL),
  (646839, 41760041, '3. Install: Tile wrapped around spillway', NULL, '3. Install: Tile wrapped around spillway', NULL, NULL, NULL, NULL),
  (646854, 41760041, '3. Install: Waterline Tile', NULL, '3. Install: Waterline Tile', NULL, NULL, NULL, NULL),
  (646966, 39951145, '2. Demo: Trench gas line from pool equipment to firepit', NULL, 'approx. 35 linear fee

2. Demo: Trench gas line from pool equipment to firepit', NULL, NULL, NULL, NULL),
  (646968, 39951145, '3. Install: Run gas line from pool equipment to firepit', NULL, 'approx. 35 linear fee

3. Install: Run gas line from pool equipment to firepit', NULL, NULL, NULL, NULL),
  (646971, 39951145, '3. Install: gas shut-off valve', NULL, '3. Install: gas shut-off valve', NULL, NULL, NULL, NULL),
  (646995, 39951145, '2. Demo: Remove existing shrubs in rear yard planters as needed', NULL, '2. Demo: Remove existing shrubs in rear yard planters as needed', NULL, NULL, NULL, NULL),
  (646998, 39951145, '3. Demo: Till and amend planting area soil', NULL, '3. Demo: Till and amend planting area soil', NULL, NULL, NULL, NULL),
  (647001, 39951145, '3. Install: Lay weed barrier fabric', NULL, '3. Install: Lay weed barrier fabric', NULL, NULL, NULL, NULL),
  (647004, 39951145, '3. Install: Standard brown shredded bark mulch', NULL, '3. Install: Standard brown shredded bark mulch', NULL, NULL, NULL, NULL),
  (647010, 39951145, '3. Install: Plants', NULL, '(1 qty.) 15 gal fruit tree (28 qty.) 5 gal shrubs (6 qty.) 5 gal succulents (10 qty.) 1 gal shrubs 21 qty.) 1 gal premium shrubs

3. Install: Plants', NULL, NULL, NULL, NULL),
  (647022, 39951145, '3. Install: Irrigation', NULL, 'Install (2 qty.) anti-siphon valve for drip irrigation Install (1 qty.) 4-station ‘Rachio’ brand ‘Smart’ irrigation timer

3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (647025, 39951145, '3. Install: Lighting', NULL, '3. Install: Lighting', NULL, NULL, NULL, NULL),
  (647034, 39951145, '3. Install: Point-Source drip irrigation for veggie planter', NULL, '3. Install: Point-Source drip irrigation for veggie planter', NULL, NULL, NULL, NULL),
  (647037, 39951145, '3. Install: Point-source drip for owner-provided potted plants', NULL, '3. Install: Point-source drip for owner-provided potted plants', NULL, NULL, NULL, NULL),
  (647044, 39951145, '3. Install: (1 qty.) new GFIC receptacle at pool equipment', NULL, '3. Install: (1 qty.) new GFIC receptacle at pool equipment', NULL, NULL, NULL, NULL),
  (647127, 39951145, '3. Instlal: 7LF of Handrail', NULL, '3. Instlal: 7LF of Handrail', NULL, NULL, NULL, NULL),
  (647412, 39951145, '3. Install: Metal Pole with a wood top cap for handrail', NULL, '3. Install: Metal Pole with a wood top cap for handrail', NULL, NULL, NULL, NULL),
  (647564, 41245251, '(Rear Yard Planter & Fountain)', NULL, '(Rear Yard Planter & Fountain)', NULL, NULL, NULL, NULL),
  (647658, 41245251, '(Side Yard)', NULL, '(Side Yard)', NULL, NULL, NULL, NULL),
  (647734, 41245251, '3. Install: Drainage', NULL, '3. Install: Drainage', NULL, NULL, NULL, NULL),
  (647739, 41245251, '3. Install: Electrical for Fountain', NULL, '3. Install: Electrical for Fountain', NULL, NULL, NULL, NULL),
  (647742, 41245251, '3. Install: Fire Glass (Fire Pit)', NULL, '3. Install: Fire Glass (Fire Pit)', NULL, NULL, NULL, NULL),
  (647744, 41245251, '(Fire Pit)', NULL, '(Fire Pit)', NULL, NULL, NULL, NULL),
  (647800, 41245251, '3. Install: Gas Bar (Fire Pit)', NULL, '3. Install: Gas Bar (Fire Pit)', NULL, NULL, NULL, NULL),
  (647817, 41245251, '3. Install: Gas Line (Fire Pit)', NULL, '3. Install: Gas Line (Fire Pit)', NULL, NULL, NULL, NULL),
  (647947, 41245251, '3. Install: Gas line for Gas Stub-Ups (3qty)', NULL, '3. Install: Gas line for Gas Stub-Ups (3qty)', NULL, NULL, NULL, NULL),
  (647949, 41245251, '3. Install: Gas Shut off Valve (Fire Pit)', NULL, '3. Install: Gas Shut off Valve (Fire Pit)', NULL, NULL, NULL, NULL),
  (647950, 41245251, '3. Install: GFIC receptacle for New Fountain', NULL, '3. Install: GFIC receptacle for New Fountain', NULL, NULL, NULL, NULL),
  (647953, 41245251, '3. Install: GFIC Receptacles (3qty)', NULL, '3. Install: GFIC Receptacles (3qty)', NULL, NULL, NULL, NULL),
  (647955, 41245251, '3. Install: Hose bib', NULL, '3. Install: Hose bib', NULL, NULL, NULL, NULL),
  (647977, 41245251, '3. Install: Irrigation', NULL, '3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (647978, 41245251, 'Under Wall Cap (Garden Wall)', NULL, 'Under Wall Cap (Garden Wall)', NULL, NULL, NULL, NULL),
  (648043, 41245251, '3. Install: Light Conduit for Pilasters', NULL, '3. Install: Light Conduit for Pilasters', NULL, NULL, NULL, NULL),
  (648049, 41245251, '3. Install: Lighting', NULL, '(1 qty.) 300-watt transformer Lightcraft’ or equal LED lights: (10 qty.) spot lights (10 qty.) path lights (4 qty.) wall lights (19 qty.) step lights Stub up additional 150 lf of wire for future lighting

3. Install: Lighting', NULL, NULL, NULL, NULL),
  (648192, 41245251, '3. Install: Owner Supplied Fountain', NULL, '3. Install: Owner Supplied Fountain', NULL, NULL, NULL, NULL),
  (648195, 41245251, '3. Install: Pilasters (CMU Block)', NULL, '3. Install: Pilasters (CMU Block)', NULL, NULL, NULL, NULL),
  (648199, 41245251, '3. Install: Plants', NULL, '3. Install: Plants', NULL, NULL, NULL, NULL),
  (648202, 41245251, '(Driveway Extension)', NULL, '(Driveway Extension)', NULL, NULL, NULL, NULL),
  (648290, 41245251, '(Rear Yard Planter & Fountain)', NULL, '(Rear Yard Planter & Fountain)', NULL, NULL, NULL, NULL),
  (648311, 41245251, '(Concrete Paving & Steps)', NULL, '(Concrete Paving & Steps)', NULL, NULL, NULL, NULL),
  (648322, 41245251, '(2qty) (Side Yard Walls)', NULL, '(2qty) (Side Yard Walls)', NULL, NULL, NULL, NULL),
  (648331, 41245251, '3. Install: Step Lights ( Side Yard)', NULL, '3. Install: Step Lights ( Side Yard)', NULL, NULL, NULL, NULL),
  (648333, 41245251, '3. Install: Strip light (Seat wall & Seat bench)', NULL, '3. Install: Strip light (Seat wall & Seat bench)', NULL, NULL, NULL, NULL),
  (648336, 41245251, '3. Install: Tile Finish (Rear Yard Planter & Fountain)', NULL, '3. Install: Tile Finish (Rear Yard Planter & Fountain)', NULL, NULL, NULL, NULL),
  (648340, 41245251, '(Front Yard Planter Walls)', NULL, '(Front Yard Planter Walls)', NULL, NULL, NULL, NULL),
  (648352, 41245251, '1. Order: Lights', NULL, '1. Order: Lights', NULL, NULL, NULL, NULL),
  (648354, 41245251, '1. Order: Plants', NULL, '1. Order: Plants', NULL, NULL, NULL, NULL),
  (653350, 42783418, 'Change Order: hedge and lights (see pdf)', NULL, 'Change Order: hedge and lights (see pdf)', NULL, NULL, NULL, '(.PM) Carter Godley'),
  (659666, 43541680, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (659667, 43541680, '5. If the client is happy with the work ask for a review.', NULL, '5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (659668, 43541680, 'Production Manager Assign Project Supervisor', NULL, 'Production Manager Assign Project Supervisor', NULL, NULL, NULL, NULL),
  (659669, 43541680, 'Upload latest Design and Ensure it is Current', NULL, 'Upload latest Design and Ensure it is Current', NULL, NULL, NULL, NULL),
  (659670, 43541680, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (659671, 43541680, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (659700, 43541680, '2. Demo: Remove rock edging', NULL, '2. Demo: Remove rock edging', NULL, NULL, NULL, NULL),
  (659701, 43541680, '2. Demo: Remove flagstones', NULL, '2. Demo: Remove flagstones', NULL, NULL, NULL, NULL),
  (659704, 43541680, '2. Demo: Remove an average of 6” of soil in front yard', NULL, 'approx. 180 square feet

2. Demo: Remove an average of 6” of soil in front yard', NULL, NULL, NULL, NULL),
  (659708, 43541680, '3. Install: Weed barrier fabric', NULL, '3. Install: Weed barrier fabric', NULL, NULL, NULL, NULL),
  (660655, 42580132, 'Add change order for lights and sprinklers', NULL, 'Add change order for lights and sprinklers', '2026-03-11', NULL, NULL, 'Anna Kurihara'),
  (671605, 43455241, 'Job walk schedule for Saturday', NULL, 'Job walk schedule for Saturday', NULL, NULL, NULL, '(.PM) Carter Godley'),
  (678454, 41411781, 'Missing plants', NULL, 'Missing plants', NULL, NULL, NULL, NULL),
  (678455, 41411781, 'Air construction needs to be secured', NULL, 'Air construction needs to be secured', NULL, NULL, NULL, NULL),
  (678456, 41411781, 'scheduled', NULL, 'scheduled', NULL, NULL, NULL, NULL),
  (678458, 41411781, 'Lower drains', NULL, 'Lower drains', NULL, NULL, NULL, NULL),
  (678460, 41411781, 'Grout around rock', NULL, 'Grout around rock', NULL, NULL, NULL, NULL),
  (678463, 41411781, 'Add infied on turf', NULL, 'Add infied on turf', NULL, NULL, NULL, NULL),
  (678893, 41411781, 'Cap gas line', NULL, 'Cap gas line', NULL, NULL, NULL, NULL),
  (678953, 43541680, '3. Install:  Del Rio 3/8 minus gravel per plan', NULL, 'approx. 185 sqft

3. Install:  Del Rio 3/8 minus gravel per plan', NULL, NULL, NULL, NULL),
  (678959, 43541680, '3. Install: Arizona Flagstone steppers', NULL, '3. Install: Arizona Flagstone steppers', NULL, NULL, NULL, NULL),
  (678961, 43541680, '2. Demo: Till & Amend Soil for planting', NULL, '2. Demo: Till & Amend Soil for planting', NULL, NULL, NULL, NULL),
  (678962, 43541680, '(1 qty.) flat of groundcover', NULL, '(1 qty.) flat of groundcover', NULL, NULL, NULL, NULL),
  (679042, 43541680, '3. Install: Irrigation', NULL, '(1 qty.) new drip irrigation zone for planting

3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (679045, 43541680, '2. Demo: Remove existing tile front entry', NULL, 'approx. 80 square feet

2. Demo: Remove existing tile front entry', NULL, NULL, NULL, NULL),
  (679051, 43541680, '2. Demo: Excavate/grade entry area', NULL, '7” below finish grade

2. Demo: Excavate/grade entry area', NULL, NULL, NULL, NULL),
  (679055, 43541680, '3. Install: Base and leveling sand for pavers', NULL, '3. Install: Base and leveling sand for pavers', NULL, NULL, NULL, NULL),
  (679074, 43541680, '3. Install: Pavers Cobble II', NULL, 'Angelus brand Antique Cobble II, approx. 80 square feet

3. Install: Pavers Cobble II', NULL, NULL, NULL, NULL),
  (679098, 43541680, '3. Install: 5LF Step Build Cobble I Pavers', NULL, '3. Install: 5LF Step Build Cobble I Pavers', NULL, NULL, NULL, NULL),
  (679113, 43541680, '3. Install: Joint sand on pavers', NULL, '3. Install: Joint sand on pavers', NULL, NULL, NULL, NULL),
  (679178, 43541680, '3. Install: Concrete edge restraints pavers/softscape area', NULL, '3. Install: Concrete edge restraints pavers/softscape area', NULL, NULL, NULL, NULL),
  (679181, 43541680, '3. Install: Shredded bark mulch', NULL, '80 square feet

3. Install: Shredded bark mulch', NULL, NULL, NULL, NULL),
  (679195, 43541680, 'Additional Options Pending', NULL, 'Driveway Apron Driveway Apron - Gutter

Additional Options Pending', NULL, NULL, NULL, NULL),
  (679835, 41411781, 'Seal Travertine', NULL, 'Seal Travertine', NULL, NULL, NULL, NULL),
  (691324, 43455241, '2. Demo: Remove 4” of existing concrete paving and steppers in rear yard', NULL, 'approx. 140 sqft

2. Demo: Remove 4” of existing concrete paving and steppers in rear yard', NULL, NULL, NULL, NULL),
  (691583, 43455241, '2. Demo: Excavate/Grade for Pavers', NULL, 'over 420 square feet

2. Demo: Excavate/Grade for Pavers', NULL, NULL, NULL, NULL),
  (691592, 43455241, '3. Install: Base and leveling sand', NULL, '3. Install: Base and leveling sand', NULL, NULL, NULL, NULL),
  (691594, 43455241, 'Paver Walkway (115 square feet)', NULL, '115 square feet

Paver Walkway (115 square feet)', NULL, NULL, NULL, NULL),
  (691620, 43455241, '3. Install: Concrete edge restraints (pavers/softscape)', NULL, '3. Install: Concrete edge restraints (pavers/softscape)', NULL, NULL, NULL, NULL),
  (691627, 43455241, '2. Demo: Rear Yard excavate 3" Below grade', NULL, 'Owner to install gravel/dg

2. Demo: Rear Yard excavate 3" Below grade', NULL, NULL, NULL, NULL),
  (691685, 43455241, '3. Install: Irrigation ( Re-Install lines in existing planter)', NULL, '3. Install: Irrigation ( Re-Install lines in existing planter)', NULL, NULL, NULL, NULL),
  (691704, 43455241, '2. Demo: Excavate Front Yard for DG Area', NULL, '2. Demo: Excavate Front Yard for DG Area', NULL, NULL, NULL, NULL),
  (691706, 43455241, '3. Install: Weed Barrier Fabric', NULL, '3. Install: Weed Barrier Fabric', NULL, NULL, NULL, NULL),
  (691735, 43455241, '3. Install: Tan Stabilized DG', NULL, 'approx. 230 square feet Includes 2 sacks of cement per cubic yard of D.G. for enhanced stabilization

3. Install: Tan Stabilized DG', NULL, NULL, NULL, NULL),
  (691742, 43455241, '3. Install: Drainage', NULL, '(5 qty.) drain fixtures

3. Install: Drainage', NULL, NULL, NULL, NULL),
  (691777, 43455241, '2. Demo: Trench for Drainage', NULL, '2. Demo: Trench for Drainage', NULL, NULL, NULL, NULL),
  (691778, 43455241, '3. Install: Connect drainage to existing Sump Pump', NULL, '3. Install: Connect drainage to existing Sump Pump', NULL, NULL, NULL, NULL),
  (692237, 43455241, '2. Demo: Chip and remove existing tile at rear patio steps/landing', NULL, '2. Demo: Chip and remove existing tile at rear patio steps/landing', NULL, NULL, NULL, NULL),
  (692247, 43455241, '3. Install: New Tile', NULL, '$6 a SF, approx. 70 square feet

3. Install: New Tile', NULL, NULL, NULL, NULL),
  (692329, 43455241, '2. Demo: Excavate/Grade for gravel behind ADU', NULL, '2. Demo: Excavate/Grade for gravel behind ADU', NULL, NULL, NULL, NULL),
  (692351, 43455241, '3. Install: Weed Barrier for Gravel', NULL, '3. Install: Weed Barrier for Gravel', NULL, NULL, NULL, NULL),
  (692366, 43455241, '3. Install: 3/8" pea Gravel', NULL, 'approx. 240 square feet

3. Install: 3/8" pea Gravel', NULL, NULL, NULL, NULL),
  (692458, 43455241, '3. Install: Reuse existing steppers from site', NULL, '3. Install: Reuse existing steppers from site', NULL, NULL, NULL, NULL),
  (692475, 43835162, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (692476, 43835162, '2. Pick up final payment unless there are outstanding items for completion.', NULL, '2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (692477, 43835162, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, NULL, NULL, NULL),
  (692478, 43835162, 'Upload Contract', NULL, 'Upload Contract', NULL, NULL, NULL, NULL),
  (692479, 43835162, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (692480, 43835162, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (692559, 43835162, '2. Demo: Excavate/ Grade for New pool', NULL, '2. Demo: Excavate/ Grade for New pool', NULL, NULL, NULL, NULL),
  (692560, 43835162, '2. Demo: Lay Out New Pool', NULL, '2. Demo: Lay Out New Pool', NULL, NULL, NULL, NULL),
  (692561, 43835162, '2. Demo: Trench for Gas/Electrical for Pool Equipment', NULL, '2. Demo: Trench for Gas/Electrical for Pool Equipment', NULL, NULL, NULL, NULL),
  (692562, 43835162, '3. Install: Concrete Pad for Pool equipment', NULL, '4’ x 8’

3. Install: Concrete Pad for Pool equipment', NULL, NULL, NULL, NULL),
  (692563, 43835162, '3. Install: Coping for New Pool', NULL, '70 linear feet of ‘Bellecrete’ brand ‘Modern Edge’ single-sided precast coping

3. Install: Coping for New Pool', NULL, NULL, NULL, NULL),
  (692564, 43835162, '1. Inspection: Bottom', NULL, '1. Inspection: Bottom', NULL, NULL, NULL, NULL),
  (692565, 43835162, '1. Inspection: Rebar & Plumbing', NULL, '1. Inspection: Rebar & Plumbing', NULL, NULL, NULL, NULL),
  (692566, 43835162, '1. Inspection: Deputy for shotcrete (report)', NULL, '1. Inspection: Deputy for shotcrete (report)', NULL, NULL, NULL, NULL),
  (692567, 43835162, '1. Inspection: Enclosure/ Pre-plaster', NULL, '1. Inspection: Enclosure/ Pre-plaster', NULL, NULL, NULL, NULL),
  (692568, 43835162, '1. Inspection: Final', NULL, '1. Inspection: Final', NULL, NULL, NULL, NULL),
  (692569, 43835162, '3. Install: Gas/Electrical for Pool Equipment', NULL, '3. Install: Gas/Electrical for Pool Equipment', NULL, NULL, NULL, NULL),
  (692570, 43835162, 'Infinity Edge', NULL, 'Infinity Edge', NULL, NULL, NULL, NULL),
  (692571, 43835162, 'additional plumbing for Infinity Edge', NULL, 'additional plumbing for Infinity Edge', NULL, NULL, NULL, NULL),
  (692572, 43835162, '3. Install: Pool equipment', NULL, '(1 qty.) ‘Jandy’ brand 2.7 HP variable speed pump (1 qty.) ‘Jandy’ brand CV340 cartridge filter (1 qty.) ‘Jandy’ brand ‘JXI400N’ 400K BTU natural gas heater  (3 qty.) ‘Jandy’ brand nicheless RGBW color pool lights

3. Install: Pool equipment', NULL, NULL, NULL, NULL),
  (692573, 43835162, 'Pour Infinity Edge', NULL, 'Pour Infinity Edge', NULL, NULL, NULL, NULL),
  (692574, 43835162, '3. Install: Rebar for New Pool', NULL, '3. Install: Rebar for New Pool', NULL, NULL, NULL, NULL),
  (692575, 43835162, '3. Install: Set Forms for New Pool', NULL, '3. Install: Set Forms for New Pool', NULL, NULL, NULL, NULL),
  (692576, 43835162, '7 linear feet of 6” waterline tile for vaul', NULL, '7 linear feet of 6” waterline tile for vaul', NULL, NULL, NULL, NULL),
  (693969, 42386935, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (693970, 42386935, '1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (693971, 42386935, 'Production Manager Review Prep Work for Completeness', NULL, 'Production Manager Review Prep Work for Completeness', NULL, NULL, NULL, NULL),
  (693972, 42386935, 'Upload Any Engineering Info', NULL, 'Upload Any Engineering Info', NULL, NULL, NULL, NULL),
  (693973, 42386935, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (693974, 42386935, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (694003, 42386935, '2. Demo: Excavate Wall footings', NULL, '2. Demo: Excavate Wall footings', NULL, NULL, NULL, NULL),
  (694004, 42386935, '2. Demo: Excavate/Grade for D.G. Areas', NULL, '2. Demo: Excavate/Grade for D.G. Areas', NULL, NULL, NULL, NULL),
  (694017, 42386935, '2. Demo: Grade step Area', NULL, '2. Demo: Grade step Area', NULL, NULL, NULL, NULL),
  (694019, 42386935, '2. Demo: Till and Amend Planting Area', NULL, '2. Demo: Till and Amend Planting Area', NULL, NULL, NULL, NULL),
  (694021, 42386935, '3. Install: 11LF of 24" high wall', NULL, '3. Install: 11LF of 24" high wall', NULL, NULL, NULL, NULL),
  (694034, 42386935, '3. Install: 38LF of 12" high wall', NULL, '3. Install: 38LF of 12" high wall', NULL, NULL, NULL, NULL),
  (694035, 42386935, '3. Install: 5LF of 36" high wall', NULL, '3. Install: 5LF of 36" high wall', NULL, NULL, NULL, NULL),
  (694036, 42386935, '3. Install: Form 200sqft of total steps (200LF)', NULL, '3. Install: Form 200sqft of total steps (200LF)', NULL, NULL, NULL, NULL),
  (694038, 42386935, '3. Install: Irrigation', NULL, '3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (694042, 42386935, '3. Install: Lay Weed Barrier (D.G. Areas)', NULL, '3. Install: Lay Weed Barrier (D.G. Areas)', NULL, NULL, NULL, NULL),
  (694043, 42386935, '3. Install: Layout steps per plan', NULL, '3. Install: Layout steps per plan', NULL, NULL, NULL, NULL),
  (694045, 42386935, '3. Install: Plants', NULL, '3. Install: Plants', NULL, NULL, NULL, NULL),
  (694046, 42386935, '3. Install: Pour colored concrete (steps)', NULL, '3. Install: Pour colored concrete (steps)', NULL, NULL, NULL, NULL),
  (694047, 42386935, '3. Install: Pour footings for south side of steps', NULL, '3. Install: Pour footings for south side of steps', NULL, NULL, NULL, NULL),
  (694048, 42386935, '3. Install: Smooth Stucco to all exposed portions of wall', NULL, '3. Install: Smooth Stucco to all exposed portions of wall', NULL, NULL, NULL, NULL),
  (694050, 42386935, '3. Install: Tan/stabilized D.G', NULL, '451 square feet  ~ 100 square feet upper Patio

3. Install: Tan/stabilized D.G', NULL, NULL, NULL, NULL),
  (694053, 42386935, '3. Install: Waterproof back of walls where needed', NULL, '3. Install: Waterproof back of walls where needed', NULL, NULL, NULL, NULL),
  (694056, 39127583, '7. Take final photos for our website and upload to Builder Trend', NULL, '7. Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (694089, 39127583, '3. Install: Artificial Turf', NULL, '3. Install: Artificial Turf', NULL, NULL, NULL, NULL),
  (694090, 39127583, '3. Install: DG Base', NULL, '3. Install: DG Base', NULL, NULL, NULL, NULL),
  (694091, 39127583, '3. Install: Gravel Base (For Turf)', NULL, '3. Install: Gravel Base (For Turf)', NULL, NULL, NULL, NULL),
  (694094, 37690129, '1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (694126, 37690129, '3. Install: Gravel', NULL, '3. Install: Gravel', NULL, NULL, NULL, NULL),
  (694127, 37690129, '3. Install: Irrigation', NULL, '3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (694128, 37690129, '3. Install: Lamp Post Concrete', NULL, '3. Install: Lamp Post Concrete', NULL, NULL, NULL, NULL),
  (694129, 37690129, '3. Install: Planting', NULL, '3. Install: Planting', NULL, NULL, NULL, NULL),
  (694130, 37690129, 'Estimate Transformer Pad', NULL, 'Estimate Transformer Pad', NULL, NULL, NULL, NULL),
  (694131, 37690129, '1. Inspections: Permit on Rebar on Tubes', NULL, '1. Inspections: Permit on Rebar on Tubes', NULL, NULL, NULL, NULL),
  (707883, 41411781, 'Final inspection', NULL, 'Final inspection', NULL, NULL, NULL, NULL),
  (710834, 42725146, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (710835, 42725146, '3. Pick up Job Box.', NULL, '3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (710836, 42725146, 'Project Supervisor to have Pre Job Walk meeting with Client and Designer/Consultant', NULL, 'Project Supervisor to have Pre Job Walk meeting with Client and Designer/Consultant', NULL, NULL, NULL, NULL),
  (710837, 42725146, 'Route Project For Prep Review', NULL, 'Route Project For Prep Review', NULL, NULL, NULL, NULL),
  (710838, 42725146, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (710839, 42725146, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (710871, 42725146, '2. Demo: Excavate/ Grade for New Pool', NULL, '2. Demo: Excavate/ Grade for New Pool', NULL, NULL, NULL, NULL),
  (710872, 42725146, '2. Demo: Lay out new Pool', NULL, '2. Demo: Lay out new Pool', NULL, NULL, NULL, NULL),
  (710873, 42725146, '2. Demo: Trench for Gas/Electrical for Pool Equipment', NULL, '2. Demo: Trench for Gas/Electrical for Pool Equipment', NULL, NULL, NULL, NULL),
  (710874, 42725146, '3. Install: Concrete Pad for Pool equipment', NULL, '3. Install: Concrete Pad for Pool equipment', NULL, NULL, NULL, NULL),
  (710875, 42725146, '3. Install: Coping for New Pool', NULL, '3. Install: Coping for New Pool', NULL, NULL, NULL, NULL),
  (710876, 42725146, '1. Inspection: Bottom', NULL, '1. Inspection: Bottom', NULL, NULL, NULL, NULL),
  (710877, 42725146, '1. Inspection: Rebar & Plumbing', NULL, '1. Inspection: Rebar & Plumbing', NULL, NULL, NULL, NULL),
  (710878, 42725146, '1. Inspection: Deputy for shotcrete (report)', NULL, '1. Inspection: Deputy for shotcrete (report)', NULL, NULL, NULL, NULL),
  (710879, 42725146, '1. Inspection: Enclosure/ Pre-plaster', NULL, '1. Inspection: Enclosure/ Pre-plaster', NULL, NULL, NULL, NULL),
  (710880, 42725146, '1. Inspection: Final', NULL, '1. Inspection: Final', NULL, NULL, NULL, NULL),
  (710881, 42725146, '3. Install: Gas/Electrical for Pool Equipment', NULL, '3. Install: Gas/Electrical for Pool Equipment', NULL, NULL, NULL, NULL),
  (710882, 42725146, '3. Install: Plaster New Pool', NULL, '‘NPT’ ‘Quartzscapes

3. Install: Plaster New Pool', NULL, NULL, NULL, NULL),
  (710883, 42725146, '3. Install: Plumbing for new Pool', NULL, '3. Install: Plumbing for new Pool', NULL, NULL, NULL, NULL),
  (710884, 42725146, '3. Install: Pool equipment', NULL, 'Install (1 qty.) ‘Jandy’ brand 2.7 HP variable speed pump Install (1 qty.) ‘Jandy’ brand CV340 cartridge filter Install (1 qty.) ‘Jandy’ brand JXI400N 400K BTU pool heater Install (3 qty.) ‘Jandy’ brand nicheless RGBW color pool lights

3. Install: Pool equipment', NULL, NULL, NULL, NULL),
  (710885, 42725146, '3. Install: Pour Shotcrete for new pool', NULL, '3. Install: Pour Shotcrete for new pool', NULL, NULL, NULL, NULL),
  (710886, 42725146, '3. Install: Rebar for New Pool', NULL, '3. Install: Rebar for New Pool', NULL, NULL, NULL, NULL),
  (710887, 42725146, '3. Install: Set Forms for New Pool', NULL, '3. Install: Set Forms for New Pool', NULL, NULL, NULL, NULL),
  (710888, 42725146, '3. Install: Waterline Tile for New Pool', NULL, '3. Install: Waterline Tile for New Pool', NULL, NULL, NULL, NULL),
  (711084, 42725146, '2. Demo: Demo: Excavate for concrete footings for cook center', NULL, '2. Demo: Demo: Excavate for concrete footings for cook center', NULL, NULL, NULL, NULL),
  (711086, 42725146, '2. Demo: Excavate 7" below grade for pavers', NULL, '2. Demo: Excavate 7" below grade for pavers', NULL, NULL, NULL, NULL),
  (711091, 42725146, '2. Demo: Protect existing concrete/ doors/windows', NULL, 'Plant material to remain in place

2. Demo: Protect existing concrete/ doors/windows', NULL, NULL, NULL, NULL),
  (711099, 42725146, '2. Demo: Remove 10'' strip of gravel and replace when completed', NULL, '2. Demo: Remove 10'' strip of gravel and replace when completed', NULL, NULL, NULL, NULL),
  (711104, 42725146, '2. Demo: Remove existing fence panel for machine access', NULL, '2. Demo: Remove existing fence panel for machine access', NULL, NULL, NULL, NULL),
  (711107, 42725146, '2. Demo: Remove existing patio in year yard', NULL, '4” depth approx. 680 square feet

2. Demo: Remove existing patio in year yard', NULL, NULL, NULL, NULL),
  (711111, 42725146, '2. Demo: Remove existing pond and backfill', NULL, '2. Demo: Remove existing pond and backfill', NULL, NULL, NULL, NULL),
  (711113, 42725146, '3. Demo: Remove existing raised patio area and raised patio walls', NULL, '~330 square feet  up to 36” depth

3. Demo: Remove existing raised patio area and raised patio walls', NULL, NULL, NULL, NULL),
  (711119, 42725146, '3. Demo: Remove existing turf in rear yard', NULL, '3. Demo: Remove existing turf in rear yard', NULL, NULL, NULL, NULL),
  (711125, 42725146, '2. Demo: Remove roses in front of back wall', NULL, '2. Demo: Remove roses in front of back wall', NULL, NULL, NULL, NULL),
  (711129, 42725146, '2. Demo: Till and Amend planting area', NULL, '2. Demo: Till and Amend planting area', NULL, NULL, NULL, NULL),
  (711133, 42725146, '2. Demo: Trench for drainage', NULL, '2. Demo: Trench for drainage', NULL, NULL, NULL, NULL),
  (711193, 42725146, '3. Install: 3qty GFIC outlets and receptacles for Cook Center', NULL, '3. Install: 3qty GFIC outlets and receptacles for Cook Center', NULL, NULL, NULL, NULL),
  (711196, 42725146, '3. Install: Artificial turf', NULL, '3. Install: Artificial turf', NULL, NULL, NULL, NULL),
  (711199, 42725146, '3. Install: CMU Block for Cook Center', NULL, '3. Install: CMU Block for Cook Center', NULL, NULL, NULL, NULL),
  (711202, 42725146, '3. Install: Concrete countertop for cook center', NULL, '3. Install: Concrete countertop for cook center', NULL, NULL, NULL, NULL),
  (711205, 42725146, '3. Install: Concrete edge restraints', NULL, '3. Install: Concrete edge restraints', NULL, NULL, NULL, NULL),
  (711207, 42725146, '3. Install: Gas line and Electric from pool equipment to cook center', NULL, '3. Install: Gas line and Electric from pool equipment to cook center', NULL, NULL, NULL, NULL),
  (711208, 42725146, '3. Install: Gravel base for turf area', NULL, '3. Install: Gravel base for turf area', NULL, NULL, NULL, NULL),
  (711210, 42725146, '3. Install: Joint sand', NULL, '3. Install: Joint sand', NULL, NULL, NULL, NULL),
  (711212, 42725146, '3. Install: Lighting', NULL, '3. Install: Lighting', NULL, NULL, NULL, NULL),
  (711587, 42725146, '3. Install: Metal Benderboard edging', NULL, '3. Install: Metal Benderboard edging', NULL, NULL, NULL, NULL),
  (711591, 42725146, '3. Install: Mulch all planting w/ shredded bark', NULL, '3. Install: Mulch all planting w/ shredded bark', NULL, NULL, NULL, NULL),
  (711593, 42725146, '3. Install: Owner supplied appliances', NULL, '3. Install: Owner supplied appliances', NULL, NULL, NULL, NULL),
  (711595, 42725146, '3. Install: Pavers (MSI)', NULL, '3. Install: Pavers (MSI)', NULL, NULL, NULL, NULL),
  (711596, 42725146, '3. Install: Plants', NULL, '(1 qty.) 36” box premium tree  (11 qty.) 15 gal fruit trees  (11 qty.) 5 gal succulents  (11 qty.) 5 gal standard shrubs  (63 qty.) 1 gal standard shrubs

3. Install: Plants', NULL, NULL, NULL, NULL),
  (711616, 42725146, '3. Install: Pour Concrete footings for cook center', NULL, '3. Install: Pour Concrete footings for cook center', NULL, NULL, NULL, NULL),
  (711621, 42725146, '3. Install: Precast steppers', NULL, '3. Install: Precast steppers', NULL, NULL, NULL, NULL),
  (711623, 42725146, '3. Install: Road Base and leveling sand for pavers', NULL, '3. Install: Road Base and leveling sand for pavers', NULL, NULL, NULL, NULL),
  (711694, 42725146, '3. Install: Run Drainage', NULL, '3. Install: Run Drainage', NULL, NULL, NULL, NULL),
  (711697, 42725146, '3. Install: Shut-off valve Cook center', NULL, '3. Install: Shut-off valve Cook center', NULL, NULL, NULL, NULL),
  (711700, 42725146, '3. Install: Stucco finish to Cook Center', NULL, '3. Install: Stucco finish to Cook Center', NULL, NULL, NULL, NULL),
  (711879, 42754683, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (711880, 42754683, '6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (711881, 42754683, 'Production Manager Review Prep Work for Completeness', NULL, 'Production Manager Review Prep Work for Completeness', NULL, NULL, NULL, NULL),
  (711882, 42754683, 'Upload Contract', NULL, 'Upload Contract', NULL, NULL, NULL, NULL),
  (711883, 42754683, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (711884, 42754683, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (712899, 43699270, '2. Demo: Remove (9) Grevillea shrubs around front/side perimeter of front yard', NULL, '2. Demo: Remove (9) Grevillea shrubs around front/side perimeter of front yard', NULL, NULL, NULL, NULL),
  (712914, 43699270, '2. Demo: Repurpose (3-4) Grenvillea into front Yard', NULL, '2. Demo: Repurpose (3-4) Grenvillea into front Yard', NULL, NULL, NULL, NULL),
  (712962, 43699270, '2. Demo: Remove  destroyed succulent groundcover on the Southwest side of the front yard', NULL, '2. Demo: Remove  destroyed succulent groundcover on the Southwest side of the front yard', NULL, NULL, NULL, NULL),
  (712967, 43699270, '2. Demo: Remove dead plants in front yard', NULL, 'approx (8-10)

2. Demo: Remove dead plants in front yard', NULL, NULL, NULL, NULL),
  (712972, 43699270, '3. Install: Replant (1) Sago Palm in front yard (currently in pot)', NULL, '3. Install: Replant (1) Sago Palm in front yard (currently in pot)', NULL, NULL, NULL, NULL),
  (713037, 43699270, '3. Install: Replant (1) small Lemon tree in raised planter (backyard)', NULL, '3. Install: Replant (1) small Lemon tree in raised planter (backyard)', NULL, NULL, NULL, NULL),
  (713045, 43699270, '2. Demo: Trim Trees in raised planter (backyard)', NULL, 'Orange Tree Avocado Tree Lemon Tree

2. Demo: Trim Trees in raised planter (backyard)', NULL, NULL, NULL, NULL),
  (713089, 43699270, '2. Demo: Remove (1) large Honeysuckle shrub in backyard', NULL, '2. Demo: Remove (1) large Honeysuckle shrub in backyard', NULL, NULL, NULL, NULL),
  (713094, 43699270, '3. Install: Reposition existing irrigation drip hose in backyard planter around sod,', NULL, '3. Install: Reposition existing irrigation drip hose in backyard planter around sod,', NULL, NULL, NULL, NULL),
  (713097, 43699270, '3. Install: Add Drip emitters for existing shrubs ( approx 10)', NULL, '3. Install: Add Drip emitters for existing shrubs ( approx 10)', NULL, NULL, NULL, NULL),
  (713121, 43699270, '3. Install: Add irrigation emitters into raised planter for new Rosemary and vines', NULL, '3. Install: Add irrigation emitters into raised planter for new Rosemary and vines', NULL, NULL, NULL, NULL),
  (713380, 43699270, '(2) flats of creeping rosemary into raised planter in backyard', NULL, '(2) flats of creeping rosemary into raised planter in backyard', NULL, NULL, NULL, NULL),
  (727432, 43455241, 'Need sump pump replacement MD & materials cost for Change Order', NULL, 'Need sump pump replacement MD & materials cost for Change Order', NULL, NULL, NULL, '(.PM) Paul DeAngelis'),
  (727732, 43455241, 'Confirm they want to go with existing curved front walkway shape, adding addt''l pavers (gave them price. need HO confirmation)', NULL, 'Confirm they want to go with existing curved front walkway shape, adding addt''l pavers (gave them price. need HO confirmation)', NULL, NULL, NULL, '(.PM) Paul DeAngelis'),
  (754774, 43164712, 'Back yard steppers/edger/gravel', NULL, 'Back yard steppers/edger/gravel', NULL, NULL, NULL, NULL),
  (754776, 43164712, 'Stack wall front yard', NULL, 'Stack wall front yard', NULL, NULL, NULL, NULL),
  (754787, 43541680, 'CMU Wall', NULL, 'CMU Wall', NULL, NULL, NULL, NULL),
  (754802, 43541680, 'Conduit', NULL, 'Conduit', NULL, NULL, NULL, NULL),
  (754811, 43162412, 'Missing 3- 5 gal. Plants and 26- 1 Gal.', NULL, 'Missing 3- 5 gal. Plants and 26- 1 Gal.', NULL, NULL, NULL, NULL),
  (754819, 41180158, 'Pour concrete side yard', NULL, 'Pour concrete side yard', NULL, NULL, NULL, NULL),
  (767601, 43227529, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (767602, 43227529, '1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (767603, 43227529, 'Production Manager Assign Project Supervisor', NULL, 'Production Manager Assign Project Supervisor', NULL, NULL, NULL, NULL),
  (767604, 43227529, 'Enter Daily Log with Job Specifics not covered in the Scope of Work.  Important!!!!', NULL, 'Enter Daily Log with Job Specifics not covered in the Scope of Work.  Important!!!!', NULL, NULL, NULL, NULL),
  (767605, 43227529, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (767606, 43227529, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (767742, 43227529, '2. Demo: Remove existing Asphalt driveway', NULL, 'remove 4”  approx. 2530 square feet

2. Demo: Remove existing Asphalt driveway', NULL, NULL, NULL, NULL),
  (767778, 43227529, '2. Demo: Remove existing grass in Rear & Front yard', NULL, '600 square feet 410 square feet

2. Demo: Remove existing grass in Rear & Front yard', NULL, NULL, NULL, NULL),
  (767839, 43227529, '2. Demo: Remove brick edging in rear yard', NULL, 'approx. 75 linear feet

2. Demo: Remove brick edging in rear yard', NULL, NULL, NULL, NULL),
  (768011, 43227529, '2. Demo: Remove (1qty) Lemon tree & shrubs as needed', NULL, '2. Demo: Remove (1qty) Lemon tree & shrubs as needed', NULL, NULL, NULL, NULL),
  (768139, 43227529, '2. Demo: Remove bricks around fruit trees in backyard', NULL, 'approx 40’

2. Demo: Remove bricks around fruit trees in backyard', NULL, NULL, NULL, NULL),
  (768162, 43227529, '2. Demo: Excavate/Grade for pavers', NULL, 'approx. 3400 square feet

2. Demo: Excavate/Grade for pavers', NULL, NULL, NULL, NULL),
  (768366, 43227529, '3. Install: Pavers', NULL, 'Angelus brand Holland pavers or equivalent approx. 3400 square feet

3. Install: Pavers', NULL, NULL, NULL, NULL),
  (770056, 43227529, '3. Install: Extend border for (1) side of DG parking area', NULL, '3. Install: Extend border for (1) side of DG parking area', NULL, NULL, NULL, NULL),
  (770132, 43227529, '3. Install: Concrete edging restraints where pavers meet softscape areas', NULL, '3. Install: Concrete edging restraints where pavers meet softscape areas', NULL, NULL, NULL, NULL),
  (770594, 43227529, '2. Demo: Remove grass in front and rear yard for D.G./sod/gravel', NULL, 'approx. 4190 sqft

2. Demo: Remove grass in front and rear yard for D.G./sod/gravel', NULL, NULL, NULL, NULL),
  (770762, 43227529, '2. Demo: Remove steppers in side yard', NULL, '2. Demo: Remove steppers in side yard', NULL, NULL, NULL, NULL),
  (770770, 43227529, '2. Demo: Remove concrete swale in side yard', NULL, '2. Demo: Remove concrete swale in side yard', NULL, NULL, NULL, NULL),
  (770808, 43227529, '2. Demo: Thrench for Drainage', NULL, 'approx. 430 linear feet

2. Demo: Thrench for Drainage', NULL, NULL, NULL, NULL),
  (770828, 43227529, '3. Install: Run 4” SDR35 drainpipe', NULL, '430 linear feet

3. Install: Run 4” SDR35 drainpipe', NULL, NULL, NULL, NULL),
  (770867, 43227529, '3. Install:  (1 qty.) downspout connector', NULL, 'Note: current downspout is bronze and round, connector to match as closely as possible

3. Install:  (1 qty.) downspout connector', NULL, NULL, NULL, NULL),
  (770900, 43227529, '(11 qty.) area drains', NULL, '(11 qty.) area drains', NULL, NULL, NULL, NULL),
  (771083, 43227529, '3. Install: Core Curb', NULL, '3. Install: Core Curb', NULL, NULL, NULL, NULL),
  (771101, 43227529, '2. Demo: Grade Front yard and Backfill in front of new wall', NULL, 'approx. 600 square feet

2. Demo: Grade Front yard and Backfill in front of new wall', NULL, NULL, NULL, NULL),
  (771253, 43227529, '2. Demo: Excavate footing for new wall in rear yard', NULL, '2. Demo: Excavate footing for new wall in rear yard', NULL, NULL, NULL, NULL),
  (771364, 43227529, '3. Install: Pour 12” x 12” concrete footings for Front Yard wall', NULL, '3. Install: Pour 12” x 12” concrete footings for Front Yard wall', NULL, NULL, NULL, NULL),
  (771441, 43227529, '3. Install: CMU Block wall (Front Yard)', NULL, '3. Install: CMU Block wall (Front Yard)', NULL, NULL, NULL, NULL),
  (771464, 43227529, '3. Install: Apply sand finish Stucco to both sides of wall and cap', NULL, 'approx. 140 square feet

3. Install: Apply sand finish Stucco to both sides of wall and cap', NULL, NULL, NULL, NULL),
  (771567, 43227529, '2. Demo: Remove cobbles in parkway (to be kept on site for reuse)', NULL, 'approx. 640 square feet

2. Demo: Remove cobbles in parkway (to be kept on site for reuse)', NULL, NULL, NULL, NULL),
  (771737, 43227529, '2. Demo: Excavate/Grade for D.G.', NULL, '2. Demo: Excavate/Grade for D.G.', NULL, NULL, NULL, NULL),
  (771758, 43227529, '3. Install: Weed Barrier fabric for DG', NULL, '3. Install: Weed Barrier fabric for DG', NULL, NULL, NULL, NULL),
  (771891, 43227529, '3. Install: D.G', NULL, 'approx. 2738 square feet Includes 2 sacks of cement per cubic yard of D.G. for enhanced stabilization

3. Install: D.G', NULL, NULL, NULL, NULL),
  (772019, 43227529, '2. Demo: Till and amend sod area soil', NULL, 'approx. 830 square feet

2. Demo: Till and amend sod area soil', NULL, NULL, NULL, NULL),
  (772587, 43227529, '3. Install: St. Augustine sod or equivalent', NULL, 'approx. 830 square feet

3. Install: St. Augustine sod or equivalent', NULL, NULL, NULL, NULL),
  (773032, 43227529, '3. Install: Mulch in all planters', NULL, 'approx. 3000 square feet Standard shredded bark mulch

3. Install: Mulch in all planters', NULL, NULL, NULL, NULL),
  (773048, 43227529, '2. Demo: Excavate/Grade for Gravel', NULL, '2. Demo: Excavate/Grade for Gravel', NULL, NULL, NULL, NULL),
  (773351, 43227529, '3. Install: Weed barrier fabric for Gravel', NULL, '3. Install: Weed barrier fabric for Gravel', NULL, NULL, NULL, NULL),
  (773353, 43227529, '3. Install: Del Rio Gravel', NULL, 'approx. 900 square feet

3. Install: Del Rio Gravel', NULL, NULL, NULL, NULL),
  (774445, 43227529, '3. Install: Irrigation', NULL, '(2 qty.) total spray irrigation valves for sod  (4 qty.) total drip irrigation valves for planters in front + back yards Will connect to existing timer

3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (774801, 43227529, '3. Install: Redwood Tree Mulch', NULL, '160 square feet  small

3. Install: Redwood Tree Mulch', NULL, NULL, NULL, NULL),
  (774806, 43227529, '3. Install: Existing cobbles around tree as edging', NULL, '3. Install: Existing cobbles around tree as edging', NULL, NULL, NULL, NULL),
  (774810, 43227529, '3. Install: Plants', NULL, '(2 qty.) 36” Multi branch Fruitless Olive Trees (1 qty.) 36” boxed Pittosporum tobira (1 qty.) 15 gal Meyer Lemon (1 qty.) 15 gal Magnolia  (6 qty.) 15 gal standard shrubs (8 qty.) 5 gal premium shrubs (45 qty.) 5 gal standard shrubs (157 qty.) 1 gal standard shrubs (14 qty.) flats of groundcover Transplant (1) potted Crepe Myrtle Tree

3. Install: Plants', NULL, NULL, NULL, NULL),
  (774897, 43227529, '3. Install: Lighting', NULL, 'Install (1 qty.) 200-watt transformers Install (1 qty.) Lightcraft or equivalent LED spot light Install (16 qty.) Lightcraft or equivalent LED path lights

3. Install: Lighting', NULL, NULL, NULL, NULL),
  (774918, 43227529, 'Install (3 qty.) GFCI receptacles', NULL, 'Install (3 qty.) GFCI receptacles', NULL, NULL, NULL, NULL),
  (774960, 43227529, '3. Install:  (2 qty.) hose bib', NULL, '3. Install:  (2 qty.) hose bib', NULL, NULL, NULL, NULL),
  (775116, 43227529, '3. Install:  Run Water Lines to front and backyard', NULL, 'approx. 55 linear feet to front yard approx. 55 linear feet to Back yard

3. Install:  Run Water Lines to front and backyard', NULL, NULL, NULL, NULL),
  (775200, 43227529, '3. Install: Use existing stacked wall block to create barrier between planter and sod', NULL, 'approx 42’ @ 1 course

3. Install: Use existing stacked wall block to create barrier between planter and sod', NULL, NULL, NULL, NULL),
  (796282, 42754683, '2. Demo: Layout Raised Spa', NULL, '2. Demo: Layout Raised Spa', NULL, NULL, NULL, NULL),
  (799038, 42754683, '3. Install: 13 LF of raised Raised Bond', NULL, '3. Install: 13 LF of raised Raised Bond', NULL, NULL, NULL, NULL),
  (808339, 43162412, '3. Install: Trellis', NULL, '3. Install: Trellis', NULL, NULL, NULL, NULL),
  (808470, 43162412, '3. Install: around the pool equipment', NULL, '3. Install: around the pool equipment', NULL, NULL, NULL, NULL),
  (808477, 43162412, '4 Fix: Loose pool railing', NULL, '4 Fix: Loose pool railing', NULL, NULL, NULL, NULL),
  (808495, 43162412, 'Panels inside the garage', NULL, 'Panels inside the garage', NULL, NULL, NULL, NULL),
  (808956, 43162412, '4. Fix: Water pipe next to the house needs to be shortened and cleaned up', NULL, '4. Fix: Water pipe next to the house needs to be shortened and cleaned up', NULL, NULL, NULL, NULL),
  (808963, 43162412, '4.  faucet in the back? client wanted to keep close to the shed', NULL, '4.  faucet in the back? client wanted to keep close to the shed', NULL, NULL, NULL, NULL),
  (808965, 43162412, '4. Address; "Coping needs patching"', NULL, '4. Address; "Coping needs patching"', NULL, NULL, NULL, NULL),
  (808967, 43162412, '4. Cardboard between the skimmer and coping needs to be removed', NULL, '4. Cardboard between the skimmer and coping needs to be removed', NULL, NULL, NULL, NULL),
  (808969, 43162412, '3. Install: Veggie bed', NULL, '3. Install: Veggie bed', NULL, NULL, NULL, NULL),
  (808971, 43162412, '4. Drain cap is missing in the back', NULL, '4. Drain cap is missing in the back', NULL, NULL, NULL, NULL),
  (808974, 43162412, '3. Install: Pool fence', NULL, '3. Install: Pool fence', NULL, NULL, NULL, NULL),
  (808978, 43162412, '4. Close open trench in driveway', NULL, '4. Close open trench in driveway', NULL, NULL, NULL, NULL),
  (808982, 43162412, '4. Fix: Sprinkler next to the steps is not working', NULL, '4. Fix: Sprinkler next to the steps is not working', NULL, NULL, NULL, NULL),
  (808986, 43162412, '4. Fix: Gate to the driveway is not closing', NULL, '4. Fix: Gate to the driveway is not closing', NULL, NULL, NULL, NULL),
  (808988, 43162412, 'A black bin was trashed', NULL, 'A black bin was trashed', NULL, NULL, NULL, NULL),
  (809033, 43162412, '4. Clean up/ junk removal', NULL, 'behind the garage and some next to the house where the AC unit is  personal junk??

4. Clean up/ junk removal', NULL, NULL, NULL, NULL),
  (817862, 42754683, '3. Install: 6” Tile Waterline', NULL, '30 Linear Feet

3. Install: 6” Tile Waterline', NULL, NULL, NULL, NULL),
  (817867, 42754683, '1. Choices: Stone Veneer for bond beam', NULL, '1. Choices: Stone Veneer for bond beam', NULL, NULL, NULL, NULL),
  (817875, 42754683, '3. Install: 30 Sqft of Stone veneer in bond beam', NULL, '3. Install: 30 Sqft of Stone veneer in bond beam', NULL, NULL, NULL, NULL),
  (817903, 42754683, '3. Install: Smooth Stucco on spa', NULL, 'lower and rear exterior of spa, approx. 36 square feet

3. Install: Smooth Stucco on spa', NULL, NULL, NULL, NULL),
  (823221, 42754683, '3. Install: Stone veneer to upper and side wall', NULL, '3. Install: Stone veneer to upper and side wall', NULL, NULL, NULL, NULL),
  (823236, 42754683, '3. Install: Modern edge precast coping', NULL, '40 linear feet

3. Install: Modern edge precast coping', NULL, NULL, NULL, NULL),
  (823248, 42754683, '3. Install: Plaster', NULL, 'NPT’ brand ‘Quartzscapes’ premium interior pool finish approx. 30 linear feet

3. Install: Plaster', NULL, NULL, NULL, NULL),
  (823255, 42754683, '3. Install: New Plumbing', NULL, '3. Install: New Plumbing', NULL, NULL, NULL, NULL),
  (823262, 42754683, '3. Install: Pool Equipment', NULL, '(1 qty.) ‘Jandy’ brand 2.7 HP variable speed pump (1 qty.) ‘Jandy’ brand CV340 cartridge filter (1 qty.) pool heater (1 qty.) ‘Jandy’ brand nicheless RGBW color pool light

3. Install: Pool Equipment', NULL, NULL, NULL, NULL),
  (823268, 42754683, '3. Install: 4x8 concrete pad for pool equipment', NULL, '3. Install: 4x8 concrete pad for pool equipment', NULL, NULL, NULL, NULL),
  (823280, 42754683, '3. Install: Owner-provided electrical subpanel', NULL, '3. Install: Owner-provided electrical subpanel', NULL, NULL, NULL, NULL),
  (823284, 42754683, '2. Demo: Run  Gas/Electrical for pool Equipment', NULL, '2. Demo: Run  Gas/Electrical for pool Equipment', NULL, NULL, NULL, NULL),
  (823288, 42754683, '3. Install: Gas/Electrical to pool equipment', NULL, '3. Install: Gas/Electrical to pool equipment', NULL, NULL, NULL, NULL),
  (823941, 42754683, '2. Demo: Excavate for Seatwalls and columns Footings', NULL, '2. Demo: Excavate for Seatwalls and columns Footings', NULL, NULL, NULL, NULL),
  (823953, 42754683, '3. Install: Pour concrete footings for Seatwalls and columns', NULL, '3. Install: Pour concrete footings for Seatwalls and columns', NULL, NULL, NULL, NULL),
  (823961, 42754683, '3. Install: Set steel Seatwalls & Columns', NULL, '3. Install: Set steel Seatwalls & Columns', NULL, NULL, NULL, NULL),
  (823963, 42754683, '(2 qty.) 24” x 24” x 30” columns', NULL, '(2 qty.) 24” x 24” x 30” columns', NULL, NULL, NULL, NULL),
  (823999, 42754683, '3. Install: Apply smooth stucco to front sides of walls, Seatwalls & Columns', NULL, 'approx. 90 square feet

3. Install: Apply smooth stucco to front sides of walls, Seatwalls & Columns', NULL, NULL, NULL, NULL),
  (824024, 42754683, '3. Install: Wall Caps Seatwalls & Columns', NULL, '3. Install: Wall Caps Seatwalls & Columns', NULL, NULL, NULL, NULL),
  (824031, 42754683, '3. Install: Owner-provided lights', NULL, '3. Install: Owner-provided lights', NULL, NULL, NULL, NULL),
  (824034, 42754683, '3. Install: Tile trim under front of walls', NULL, '3. Install: Tile trim under front of walls', NULL, NULL, NULL, NULL),
  (824040, 42754683, '3. Install: Tile veneer on exterior of columns,', NULL, '3. Install: Tile veneer on exterior of columns,', NULL, NULL, NULL, NULL),
  (824050, 42754683, '3. Install: Gas Line from pool to fire pit', NULL, '3. Install: Gas Line from pool to fire pit', NULL, NULL, NULL, NULL),
  (824058, 42754683, '3. Install: Shut-off valve (Fire Pit)', NULL, '3. Install: Shut-off valve (Fire Pit)', NULL, NULL, NULL, NULL),
  (824077, 42754683, '3. Install: Gas bar', NULL, '3. Install: Gas bar', NULL, NULL, NULL, NULL),
  (824202, 42754683, '3. Install: Pour concrete footings for Fire Pit', NULL, '3. Install: Pour concrete footings for Fire Pit', NULL, NULL, NULL, NULL),
  (824281, 42754683, '2.Demo: Excavate for Fire pit Footings', NULL, '2.Demo: Excavate for Fire pit Footings', NULL, NULL, NULL, NULL),
  (824291, 42754683, '3. Install: CMU Block for Firepit', NULL, 'approx. 22 linear feet finish height of 12”

3. Install: CMU Block for Firepit', NULL, NULL, NULL, NULL),
  (824305, 42754683, '3. Install: Gas line from pool equipment to Cook Center', NULL, 'approx. 15 linear feet

3. Install: Gas line from pool equipment to Cook Center', NULL, NULL, NULL, NULL),
  (824308, 42754683, '3. Install: Set steel for Fire Pit', NULL, '3. Install: Set steel for Fire Pit', NULL, NULL, NULL, NULL),
  (824320, 42754683, '3. Install: Wall Caps for Fire pit', NULL, 'approx. 22 linear feet

3. Install: Wall Caps for Fire pit', NULL, NULL, NULL, NULL),
  (824347, 42754683, '3. Install: Tile Trim Fire Pit Front Walls', NULL, '3. Install: Tile Trim Fire Pit Front Walls', NULL, NULL, NULL, NULL),
  (824349, 42754683, '3. Install: Apply smooth stucco finish to exterior Fire pit', NULL, 'approx. 22 square feet

3. Install: Apply smooth stucco finish to exterior Fire pit', NULL, NULL, NULL, NULL),
  (824556, 42754683, '3. Install: Run Electrical from pool equipment to cook center', NULL, 'approx. 15 linear feet

3. Install: Run Electrical from pool equipment to cook center', NULL, NULL, NULL, NULL),
  (824563, 42754683, '3. Install: Gas shut-off valve for Cook Center', NULL, '3. Install: Gas shut-off valve for Cook Center', NULL, NULL, NULL, NULL),
  (824567, 42754683, '3. Install: (3 qty.) GFIC receptacles (Cook Center)', NULL, '3. Install: (3 qty.) GFIC receptacles (Cook Center)', NULL, NULL, NULL, NULL),
  (824568, 42754683, '2. Demo: Excavate for concrete footings for Cook Center', NULL, '2. Demo: Excavate for concrete footings for Cook Center', NULL, NULL, NULL, NULL),
  (824577, 42754683, '3. Install: Pour concrete footings for Cook Center', NULL, '3. Install: Pour concrete footings for Cook Center', NULL, NULL, NULL, NULL),
  (824579, 42754683, '3. Install Set Steel for Cook Center', NULL, '3. Install Set Steel for Cook Center', NULL, NULL, NULL, NULL),
  (824604, 42754683, '3. Install: CMU Block for Cook Center', NULL, 'Approx. 20 linear feet Finish height of 36”

3. Install: CMU Block for Cook Center', NULL, NULL, NULL, NULL),
  (824650, 42754683, '3. Install: Pour polished concrete countertop', NULL, 'approx. 23 square feet

3. Install: Pour polished concrete countertop', NULL, NULL, NULL, NULL),
  (824673, 42754683, '3. Install: Apply smooth stucco finish to exterior Cook Center', NULL, '3. Install: Apply smooth stucco finish to exterior Cook Center', NULL, NULL, NULL, NULL),
  (843168, 43987099, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (843169, 43987099, '6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (843170, 43987099, 'Production Manager Assign Project Supervisor', NULL, 'Production Manager Assign Project Supervisor', NULL, NULL, NULL, NULL),
  (843171, 43987099, 'Enter Daily Log with Job Specifics not covered in the Scope of Work.  Important!!!!', NULL, 'Enter Daily Log with Job Specifics not covered in the Scope of Work.  Important!!!!', NULL, NULL, NULL, NULL),
  (843172, 43987099, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (843173, 43987099, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (843208, 43987099, '2. Demo: Chip and remove existing plaster/tile', NULL, 'approx. 77 linear feet

2. Demo: Chip and remove existing plaster/tile', NULL, NULL, NULL, NULL),
  (843212, 43987099, '2. Demo: Remove existing pool steps', NULL, '2. Demo: Remove existing pool steps', NULL, NULL, NULL, NULL),
  (843215, 43987099, '3. Install:  (3) new pool steps', NULL, 'approx 39 linear feet (step treads @ 12”d)

3. Install:  (3) new pool steps', NULL, NULL, NULL, NULL),
  (843225, 43987099, '3. Install: Pour 3500 PSI Shotcrete', NULL, 'approx. 5 cubic yards

3. Install: Pour 3500 PSI Shotcrete', NULL, NULL, NULL, NULL),
  (843232, 43987099, '3. Install: 6” waterline tile', NULL, 'approx. 77 linear fee

3. Install: 6” waterline tile', NULL, NULL, NULL, NULL),
  (843258, 43987099, '3. Install:  new ‘NPT’ brand ‘Stonescapes Mini Pebble’, Plaster', NULL, '3. Install:  new ‘NPT’ brand ‘Stonescapes Mini Pebble’, Plaster', NULL, NULL, NULL, NULL),
  (843338, 43987099, '3. Install: new Jandy aquapure salt chlorinator system', NULL, '3. Install: new Jandy aquapure salt chlorinator system', NULL, NULL, NULL, NULL),
  (847410, 43835162, '3. Install: Tile spillway for spa', NULL, 'Includes relevant waterproofing

3. Install: Tile spillway for spa', NULL, NULL, NULL, NULL),
  (847568, 43162412, '4. FIX: Broken Path light, replace the glass', NULL, '4. FIX: Broken Path light, replace the glass', NULL, NULL, NULL, NULL),
  (851769, 38774894, 'Install Lighting from CO 12', NULL, 'Install Lighting from CO 12', NULL, NULL, NULL, NULL),
  (851781, 38774894, 'Complete Planting from CO 13', NULL, 'Complete Planting from CO 13', NULL, NULL, NULL, NULL),
  (851793, 38774894, 'Fix Asphalt', NULL, 'Fix Asphalt', NULL, NULL, NULL, NULL),
  (852068, 38774894, 'CO 12 Lighting Approvals', NULL, 'CO 12 Lighting Approvals', NULL, NULL, NULL, 'Daniel Aguilar'),
  (852841, 39894589, 'Install footings', NULL, 'Install footings', NULL, NULL, NULL, NULL),
  (852945, 39894589, 'Create CO for additional planting', NULL, 'Create CO for additional planting', NULL, NULL, NULL, 'Daniel Aguilar'),
  (864588, 43835162, '3. Install: New electrical subpanel at pool equipment', NULL, '3. Install: New electrical subpanel at pool equipment', NULL, NULL, NULL, NULL),
  (864682, 43835162, '3. Install: Set additional forms for infinity edge', NULL, '3. Install: Set additional forms for infinity edge', NULL, NULL, NULL, NULL),
  (864686, 43835162, '3. Install: Set additional rebar for infinity edge', NULL, '3. Install: Set additional rebar for infinity edge', NULL, NULL, NULL, NULL),
  (864744, 43835162, '3. Install: Tile spillway/damwall for infinity edge', NULL, '3. Install: Tile spillway/damwall for infinity edge', NULL, NULL, NULL, NULL),
  (864855, 43835162, '3. Install: Pool equipment (Additional)', NULL, 'Automation (‘Jandy’ brand ‘iAqualink’ 4-station ) Salt System ( ‘Jandy’ brand ‘Apurem’ Aquapure chlorination ) Swim Jet (‘Badu’ brand Stream II SwimJet Turbo system with square cover) Spa Booster (1 qty.) .75 HP pump dedicated to spa jets

3. Install: Pool equipment (Additional)', NULL, NULL, NULL, NULL),
  (865083, 43835162, '2. Demo: Excavate Footings for Retaining wall', NULL, '2. Demo: Excavate Footings for Retaining wall', NULL, NULL, NULL, NULL),
  (865115, 43835162, '3. Install: Pour concrete footings for Retaining Walls', NULL, '3. Install: Pour concrete footings for Retaining Walls', NULL, NULL, NULL, NULL),
  (865124, 43835162, 'reach finish height of 48 ”', NULL, 'reach finish height of 48 ”', NULL, NULL, NULL, NULL),
  (865144, 43835162, '3. Install: Set rebar for Retaining wall', NULL, '3. Install: Set rebar for Retaining wall', NULL, NULL, NULL, NULL),
  (865150, 43835162, '3. Install: Smooth stucco finish to New Retaining Walls', NULL, 'approx. 176 square feet

3. Install: Smooth stucco finish to New Retaining Walls', NULL, NULL, NULL, NULL),
  (865158, 43835162, '2. Demo: Excavate for concrete steps', NULL, '2. Demo: Excavate for concrete steps', NULL, NULL, NULL, NULL),
  (865165, 43835162, '3. Install: Road Base for Concrete steps', NULL, '3. Install: Road Base for Concrete steps', NULL, NULL, NULL, NULL),
  (865177, 43835162, '3. Install: Form for and pour 50 linear feet of straight edge concrete step', NULL, '3. Install: Form for and pour 50 linear feet of straight edge concrete step', NULL, NULL, NULL, NULL),
  (865225, 43835162, '3. Install: Apply Topcast sand finish to Concrete Step', NULL, '3. Install: Apply Topcast sand finish to Concrete Step', NULL, NULL, NULL, NULL),
  (865242, 43835162, '3. Install: Transformer for for Concrete step lights', NULL, '(1 qty.) 100-watt transformer

3. Install: Transformer for for Concrete step lights', NULL, NULL, NULL, NULL),
  (865255, 43835162, '3. Install: (7 qty.) Lightcraft or equal LED steplights', NULL, '3. Install: (7 qty.) Lightcraft or equal LED steplights', NULL, NULL, NULL, NULL),
  (865265, 43835162, '2. Demo: Till and Amend Sod Area', NULL, 'approx. 255 square feet

2. Demo: Till and Amend Sod Area', NULL, NULL, NULL, NULL),
  (865267, 43835162, '3. Install: ‘St. Augustine’ sod', NULL, 'approx. 255 square feet

3. Install: ‘St. Augustine’ sod', NULL, NULL, NULL, NULL),
  (865272, 43835162, '2. Demo: Excavate/Grade Gravel Areas', NULL, '2. Demo: Excavate/Grade Gravel Areas', NULL, NULL, NULL, NULL),
  (865275, 43835162, '3. Install: Weed Barrier fabric for Gravel Area', NULL, '3. Install: Weed Barrier fabric for Gravel Area', NULL, NULL, NULL, NULL),
  (865281, 43835162, '3. Install: ¾” Mexican Beach pebble in all planters', NULL, '3. Install: ¾” Mexican Beach pebble in all planters', NULL, NULL, NULL, NULL),
  (865286, 43835162, '2. Demo: Till and Amend Planting Area', NULL, 'approx. 180 square feet

2. Demo: Till and Amend Planting Area', NULL, NULL, NULL, NULL),
  (865306, 43835162, '3. Install: Plants', NULL, '(25 qty.) 15 gallon standard shrubs (5 qty.) 5 gallon premium shrubs (6 qty.) 5 gallon standard shrubs (27 qty.) 1 gallon shrubs

3. Install: Plants', NULL, NULL, NULL, NULL),
  (865310, 43835162, '3. Install: Irrigation', NULL, '(2 qty.) anti-siphon valves for drip irrigation (1 qty.) anti-siphon valves for spray irrigation New 4-station ‘Rachio’ brand ‘Smart’ irrigation controller

3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (865418, 43835162, '3. Install: (2) 3x3x1 footings with 12" stem wall', NULL, '3. Install: (2) 3x3x1 footings with 12" stem wall', NULL, NULL, NULL, NULL),
  (865510, 43835162, '3. Install:  (2) 18"x18"x18" footings', NULL, '3. Install:  (2) 18"x18"x18" footings', NULL, NULL, NULL, NULL),
  (865519, 43835162, '3. Install: (2) 18"x18"x18" footings ith 12" stem wall', NULL, '3. Install: (2) 18"x18"x18" footings ith 12" stem wall', NULL, NULL, NULL, NULL),
  (865542, 43835162, '3. Install: Stair pad/footing 5x2 with 30"x8" PIP wall', NULL, 'Includes 2500psi concrete, #4 & #5 rebar

3. Install: Stair pad/footing 5x2 with 30"x8" PIP wall', NULL, NULL, NULL, NULL),
  (918022, 44015329, 'Install Main Timer After Electrical is Installed', NULL, 'Install Main Timer After Electrical is Installed', NULL, NULL, NULL, NULL),
  (918371, 43699270, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (918372, 43699270, '1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (918373, 43699270, 'Project Supervisor to Familiarize with Job Scope, Plan, To Dos and Hours Assigned.', NULL, 'Project Supervisor to Familiarize with Job Scope, Plan, To Dos and Hours Assigned.', NULL, NULL, NULL, NULL),
  (918374, 43699270, 'Upload Bid', NULL, 'Upload Bid', NULL, NULL, NULL, NULL),
  (918375, 43699270, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (918376, 43699270, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (930727, 41180335, 'Finalize open COs', NULL, 'Finalize open COs', NULL, NULL, NULL, NULL),
  (930731, 41180158, 'Permit Finals', NULL, 'Permit Finals', NULL, NULL, NULL, NULL),
  (930740, 41180214, 'Resolve plant confusion - installed vs expectations', NULL, 'Resolve plant confusion - installed vs expectations', NULL, NULL, NULL, NULL),
  (930822, 35259913, 'CO plants', NULL, 'CO plants', NULL, NULL, NULL, NULL),
  (930827, 41859021, 'Lalo Fix Light', NULL, 'Lalo Fix Light', NULL, NULL, NULL, NULL),
  (930898, 43464899, 'Connect electrical after spa delivery', NULL, 'Connect electrical after spa delivery', NULL, NULL, NULL, NULL),
  (930901, 37890729, 'Carter to visit on saturday', NULL, 'Carter to visit on saturday', NULL, NULL, NULL, NULL),
  (931096, 37542899, 'provide parts for quick connect assembly. Use teflon on connection points for waterproofing connections', NULL, 'provide parts for quick connect assembly. Use teflon on connection points for waterproofing connections', NULL, NULL, NULL, NULL),
  (931099, 37542899, '2 additional podacarpis 10ft tall', NULL, '2 additional podacarpis 10ft tall', NULL, NULL, NULL, NULL),
  (931410, 41411781, 'Electrical wiring for Spa Hookup', NULL, 'Electrical wiring for Spa Hookup', NULL, NULL, NULL, NULL),
  (931412, 41411781, 'Upgrading wire to run spa to sub panel', NULL, 'Upgrading wire to run spa to sub panel', NULL, NULL, NULL, NULL),
  (957552, 43634549, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (957553, 43634549, '2. Pick up final payment unless there are outstanding items for completion.', NULL, '2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (957554, 43634549, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, NULL, NULL, NULL),
  (957555, 43634549, 'Upload Any Needed Info on Materials Selections', NULL, 'Upload Any Needed Info on Materials Selections', NULL, NULL, NULL, NULL),
  (957556, 43634549, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (957557, 43634549, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (957946, 43634549, '2. Demo: Chip and remove  existing waterline tile/plaster', NULL, 'approx. 80 linear feet

2. Demo: Chip and remove  existing waterline tile/plaster', NULL, NULL, NULL, NULL),
  (958193, 37542899, 'quick connect coupler with key and hose bib', NULL, 'quick connect coupler with key and hose bib', NULL, NULL, NULL, NULL),
  (958195, 37542899, 'do NOT order and install the two podocarpus', NULL, 'do NOT order and install the two podocarpus', NULL, NULL, NULL, NULL),
  (959902, 43541680, '1. Choices: Wall caps', NULL, 'Victorian , Coffee. need measurements

1. Choices: Wall caps', NULL, NULL, NULL, NULL),
  (960255, 43634549, '2. Demo: Split existing drains', NULL, '2. Demo: Split existing drains', NULL, NULL, NULL, NULL),
  (960260, 43634549, '3. Install: New Pool plumbing for Pool Remodel', NULL, '3. Install: New Pool plumbing for Pool Remodel', NULL, NULL, NULL, NULL),
  (960354, 43634549, '3. Install: 6” waterline tile in Pool/ Spa/ Cover Vault', NULL, '92 linear feet (owner provided)+

3. Install: 6” waterline tile in Pool/ Spa/ Cover Vault', NULL, NULL, NULL, NULL),
  (960365, 43634549, '3. Install: 96 linear feet of Bellecrete brand precast coping', NULL, '3. Install: 96 linear feet of Bellecrete brand precast coping', NULL, NULL, NULL, NULL),
  (960373, 43634549, '3. Install: Standard white plaster interior finish Pool & Spa', NULL, 'approx. 92 linear feet  approx. 28 linear feet of total perimeter (Spa)

3. Install: Standard white plaster interior finish Pool & Spa', NULL, NULL, NULL, NULL),
  (960387, 43634549, '2. Demo: Up to 125 linear feet of trenching for utility runs', NULL, '2. Demo: Up to 125 linear feet of trenching for utility runs', NULL, NULL, NULL, NULL),
  (960389, 43634549, '3. Install: Run 155 LF of electric from meter. under house, to new pool equipment', NULL, '3. Install: Run 155 LF of electric from meter. under house, to new pool equipment', NULL, NULL, NULL, NULL),
  (960391, 43634549, '3. Install: Pool Equipment', NULL, '(1 qty.) Jandy brand 2.7 HP variable speed pump (1 qty.) Jandy brand CV460 cartridge filter (2 qty.) Jandy RGB color changing lights in pool  (1 qty.) Jandy RGB color changing light in spa (1 qty.) Jandy brand Apurem Aquapure salt chlorination kit  (1 qty.) Jandy brand Aqualink 4-station pool & spa automation control system (1 qty.) Hayward brand C-Spa 5.5kw electric heater (1 qty.) Jandy brand 400K BTU natural gas heater

3. Install: Pool Equipment', NULL, NULL, NULL, NULL),
  (960395, 43634549, '3. Install: Concrete Slab for pool Equipment', NULL, '3. Install: Concrete Slab for pool Equipment', NULL, NULL, NULL, NULL),
  (960453, 43634549, '2. Demo: Remove up to 4” existing concrete decking', NULL, 'approx. 800 square feet

2. Demo: Remove up to 4” existing concrete decking', NULL, NULL, NULL, NULL),
  (961225, 43541680, '1. Change Order: Submit change order for plants', NULL, '1. Change Order: Submit change order for plants', '2026-03-30', NULL, NULL, 'Anna Kurihara'),
  (965912, 43164712, 'boxwoods  being different sizes needs to be addressed, either shrink 10 or get the other ones larger', NULL, 'boxwoods  being different sizes needs to be addressed, either shrink 10 or get the other ones larger', NULL, NULL, NULL, NULL),
  (977734, 43541680, '1. Choices: Uplights', NULL, '1. Choices: Uplights', '2026-03-29', NULL, NULL, 'Anna Kurihara'),
  (990538, 43541680, '3. Install: Apply Smooth stucco to Wall', NULL, 'TBD

3. Install: Apply Smooth stucco to Wall', NULL, NULL, NULL, NULL),
  (991526, 43784629, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (991527, 43784629, '1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (991528, 43784629, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, NULL, NULL, NULL),
  (991529, 43784629, 'Upload Any Permit Info', NULL, 'Upload Any Permit Info', NULL, NULL, NULL, NULL),
  (991530, 43784629, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (991531, 43784629, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (991563, 43784629, '2. Demo: Remove existing fence panel for mini Bobcat access', NULL, '2. Demo: Remove existing fence panel for mini Bobcat access', NULL, NULL, NULL, NULL),
  (991570, 43784629, '2. Demo: Remove existing CMU walls and footings', NULL, 'approx. 40 linear feet

2. Demo: Remove existing CMU walls and footings', NULL, NULL, NULL, NULL),
  (992712, 43784629, '2. Demo: Remove existing Concrete', NULL, 'approx. 60 square feet

2. Demo: Remove existing Concrete', NULL, NULL, NULL, NULL),
  (992791, 43784629, '3. Install: Pour new concrete footings for 72" wall', NULL, '3. Install: Pour new concrete footings for 72" wall', NULL, NULL, NULL, NULL),
  (992991, 43784629, '3. Install: CMU block for 72" wall', NULL, 'reach finish height of 72”

3. Install: CMU block for 72" wall', NULL, NULL, NULL, NULL),
  (993004, 43784629, '3. Install: Apply Stucco Finish to cap and side of 72" wall', NULL, 'approx. 520 square feet

3. Install: Apply Stucco Finish to cap and side of 72" wall', NULL, NULL, NULL, NULL),
  (993012, 43784629, '2. Demo: Excavate footings for Seatwall', NULL, '2. Demo: Excavate footings for Seatwall', NULL, NULL, NULL, NULL),
  (993017, 43784629, '3. Install: Pour Footings for Seatwall', NULL, '3. Install: Pour Footings for Seatwall', NULL, NULL, NULL, NULL),
  (993499, 43784629, '3. Install: CMU block for Seatwall', NULL, '10 linear feet  reach finish height of 18”

3. Install: CMU block for Seatwall', NULL, NULL, NULL, NULL),
  (993532, 43784629, '3. Install: Apply Smooth Stucco Finish to Seatwall', NULL, '3. Install: Apply Smooth Stucco Finish to Seatwall', NULL, NULL, NULL, NULL),
  (993541, 43784629, '3. Install: Bellecrete brand precast cap', NULL, 'approx. 5 linear feet

3. Install: Bellecrete brand precast cap', NULL, NULL, NULL, NULL),
  (993622, 43784629, '2. Demo: Trench gas line for Firepit', NULL, 'approx. 15 linear feet

2. Demo: Trench gas line for Firepit', NULL, NULL, NULL, NULL),
  (993628, 43784629, '3. Install: Gas shut-off valve', NULL, '3. Install: Gas shut-off valve', NULL, NULL, NULL, NULL),
  (993632, 43784629, '3. Install: Gas ring for Firepit', NULL, '3. Install: Gas ring for Firepit', NULL, NULL, NULL, NULL),
  (993655, 43784629, '2. Demo: Excavate footings for Firepit', NULL, '2. Demo: Excavate footings for Firepit', NULL, NULL, NULL, NULL),
  (993665, 43784629, '3. Install: Pour Footings for Firepit', NULL, '3. Install: Pour Footings for Firepit', NULL, NULL, NULL, NULL),
  (996074, 43784629, '3. Install: CMU Block for for Firepit', NULL, 'approx. 10 linear feet finish height of 18”

3. Install: CMU Block for for Firepit', NULL, NULL, NULL, NULL),
  (996179, 43784629, '3. Install: Apply stucco Smooth finish to both sides of wall Firepit', NULL, '3. Install: Apply stucco Smooth finish to both sides of wall Firepit', NULL, NULL, NULL, NULL),
  (996189, 43784629, '3. Install: Bellecrete brand precast cap to Firepit', NULL, '3. Install: Bellecrete brand precast cap to Firepit', NULL, NULL, NULL, NULL),
  (996192, 43784629, '3. Install:  3 square feet of lava rock for Firepit', NULL, '3. Install:  3 square feet of lava rock for Firepit', NULL, NULL, NULL, NULL),
  (996211, 43784629, '1. Choices: stucco  (72" Wall, Seatwall, Firepit)', NULL, '1. Choices: stucco  (72" Wall, Seatwall, Firepit)', NULL, NULL, NULL, 'Anna Kurihara'),
  (996424, 43784629, '2. Demo: Excavate for pavers', NULL, '2. Demo: Excavate for pavers', NULL, NULL, NULL, NULL),
  (996714, 43784629, '3. Install: Road base and Sand baser for pavers', NULL, '3. Install: Road base and Sand baser for pavers', NULL, NULL, NULL, NULL),
  (996717, 43784629, '3. Install: Pavers', NULL, '3. Install: Pavers', NULL, NULL, NULL, NULL),
  (996720, 43784629, '3. Install: Concrete edge restraints where pavers meet softscape areas', NULL, '3. Install: Concrete edge restraints where pavers meet softscape areas', NULL, NULL, NULL, NULL),
  (996725, 43784629, '2. Demo: Excavate for Artificial Turf', NULL, '2. Demo: Excavate for Artificial Turf', NULL, NULL, NULL, NULL),
  (996726, 43784629, '3. Install: Gravel and Weed barrier for artificial turf', NULL, '3. Install: Gravel and Weed barrier for artificial turf', NULL, NULL, NULL, NULL),
  (996781, 43784629, '3. Install: Sun Turf brand Marathon Lite or equivalent Artificial Turf', NULL, '3. Install: Sun Turf brand Marathon Lite or equivalent Artificial Turf', NULL, NULL, NULL, NULL),
  (997205, 43784629, '3. Install: Mulch in Planter', NULL, '3. Install: Mulch in Planter', NULL, NULL, NULL, NULL),
  (997333, 43784629, '3. Install: 83 linear feet of plastic benderboard edging', NULL, '3. Install: 83 linear feet of plastic benderboard edging', NULL, NULL, NULL, NULL),
  (997731, 43784629, '3. Install: Plants', NULL, '(3 qty.) 15 gal standard shrubs  (4 qty.) 5 gal standard shrubs  (4 qty.) 1 gal standard shrubs

3. Install: Plants', NULL, NULL, NULL, NULL),
  (997853, 43784629, '3. Install: Lighting', NULL, '(1 qty.) 100-watt transformer (4 qty.) Lightcraft or equal LED pathlights (1 qty.) Lightcraft or equal LED seatwall light

3. Install: Lighting', NULL, NULL, NULL, NULL),
  (998206, 43252956, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (998207, 43252956, '4. Pick up yard sign unless ok by client to leave longer.', NULL, '4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (998208, 43252956, 'Project Supervisor to Familiarize with Job Scope, Plan, To Dos and Hours Assigned.', NULL, 'Project Supervisor to Familiarize with Job Scope, Plan, To Dos and Hours Assigned.', NULL, NULL, NULL, NULL),
  (998209, 43252956, 'Upload Any HOA Info', NULL, 'Upload Any HOA Info', NULL, NULL, NULL, NULL),
  (998210, 43252956, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (998211, 43252956, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (998241, 43252956, '2. Demo: Remove up to 2” of existing lawn in front yard', NULL, 'approx. 720 square feet

2. Demo: Remove up to 2” of existing lawn in front yard', NULL, NULL, NULL, NULL),
  (998243, 43252956, '2. Demo: Remove weedy grass in rear yard', NULL, '1250 square feet

2. Demo: Remove weedy grass in rear yard', NULL, NULL, NULL, NULL),
  (998283, 43252956, '3. Install: Connect downspout into drain', NULL, 'add approx 15-20’ of drain pipe

3. Install: Connect downspout into drain', NULL, NULL, NULL, NULL),
  (998286, 43252956, '2. Demo: Remove Ikea pavers, bricks around planter next to house', NULL, '2. Demo: Remove Ikea pavers, bricks around planter next to house', NULL, NULL, NULL, NULL),
  (998295, 43252956, '2. Demo: Excavate/Grade DG area', NULL, '2. Demo: Excavate/Grade DG area', NULL, NULL, NULL, NULL),
  (998300, 43252956, '3. Install: Weed Barrier fabric for DG', NULL, '3. Install: Weed Barrier fabric for DG', NULL, NULL, NULL, NULL),
  (998302, 43252956, '3. Install: Tan stabilized D.G. w/ Cement', NULL, '3. Install: Tan stabilized D.G. w/ Cement', NULL, NULL, NULL, NULL),
  (998345, 43252956, '3. Install: Metal edging for front yard D.G. only', NULL, '3. Install: Metal edging for front yard D.G. only', NULL, NULL, NULL, NULL),
  (998346, 43252956, 'Front Yard : 240 square feet of standard shredded bark mulch', NULL, 'Front Yard : 240 square feet of standard shredded bark mulch', NULL, NULL, NULL, NULL),
  (998628, 43252956, '2. Demo:  Till and Amend for planting area', NULL, 'approx. 1100 square feet

2. Demo:  Till and Amend for planting area', NULL, NULL, NULL, NULL),
  (998703, 43252956, '3. Install: Plants', NULL, '(25 qty.) 15 gal shrubs (Option X2 Peppermint Trees to 24” @$600) (19 qty.) 5 gal shrubs (94 qty.) 1 gal shrubs (3 qty.) flats of groundcover

3. Install: Plants', NULL, NULL, NULL, NULL),
  (998712, 43252956, '2. Demo: Excavate Dry Creek Bed', NULL, '6” below grade over approx. 140 square feet

2. Demo: Excavate Dry Creek Bed', NULL, NULL, NULL, NULL),
  (998715, 43252956, '3. Install: ½” - 1” Del Rio gravel in creek bed', NULL, '3. Install: ½” - 1” Del Rio gravel in creek bed', NULL, NULL, NULL, NULL),
  (998722, 43252956, '3. Install: 12”-24” ‘Granite’ type boulders (Dry creek bed)', NULL, '3. Install: 12”-24” ‘Granite’ type boulders (Dry creek bed)', NULL, NULL, NULL, NULL),
  (998725, 43252956, '3. Install: Irrigation', NULL, '(3 qty.) drip irrigation valves for rear and yard plantings  connect to existing smart Timer

3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (998958, 43252956, '3. Install: Steppers', NULL, '(15 qty.) 24” x 24” precast concrete steppers in rear yard  Sand Set

3. Install: Steppers', NULL, NULL, NULL, NULL),
  (999179, 43252956, '2. Demo: Excavate/ Grade for Gravel in rear yard', NULL, '2. Demo: Excavate/ Grade for Gravel in rear yard', NULL, NULL, NULL, NULL),
  (999180, 43252956, '3. Install: Weed Barrier fabric for Gravel', NULL, '3. Install: Weed Barrier fabric for Gravel', NULL, NULL, NULL, NULL),
  (999456, 43252956, '3. Install: Del Rio gravel', NULL, 'approx. 90 square feet size?

3. Install: Del Rio gravel', NULL, NULL, NULL, NULL),
  (999598, 43252956, '3. Install: Metal edging bender board to contain gravel', NULL, 'approx. 32 linear feet

3. Install: Metal edging bender board to contain gravel', NULL, NULL, NULL, NULL),
  (999709, 43252956, '3. Install: Lighting', NULL, '(8) up lights (8) path lights (1) transformer

3. Install: Lighting', NULL, NULL, NULL, NULL),
  (999712, 42165692, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (999713, 42165692, '2. Pick up final payment unless there are outstanding items for completion.', NULL, '2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (999714, 42165692, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, NULL, NULL, NULL),
  (999715, 42165692, 'Enter Daily Log with Job Specifics not covered in the Scope of Work.  Important!!!!', NULL, 'Enter Daily Log with Job Specifics not covered in the Scope of Work.  Important!!!!', NULL, NULL, NULL, NULL),
  (999716, 42165692, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (999717, 42165692, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (1002212, 40427946, 'Check the rear sprinkler lines and touch up two spots of white stucco. Get with Paul about spots.', NULL, 'Check the rear sprinkler lines and touch up two spots of white stucco. Get with Paul about spots.', '2026-04-02', NULL, NULL, '(.PM) Carter Godley,(.PM) Paul DeAngelis,Bryan Vielman'),
  (1017905, 43634549, '2. Demo: Trench for Utility lines', NULL, '2. Demo: Trench for Utility lines', NULL, NULL, NULL, NULL),
  (1017952, 43634549, '2. Demo: Excavate/ Grade for concrete decking', NULL, '2. Demo: Excavate/ Grade for concrete decking', NULL, NULL, NULL, NULL),
  (1017955, 43634549, '3. Install: Road base for Decking', NULL, '3. Install: Road base for Decking', NULL, NULL, NULL, NULL),
  (1017957, 43634549, '3. Install: Rebar for Decking', NULL, '3. Install: Rebar for Decking', NULL, NULL, NULL, NULL),
  (1017963, 43634549, '3. Install: Pour Concrete for Decking', NULL, '3. Install: Pour Concrete for Decking', NULL, NULL, NULL, NULL),
  (1018021, 43634549, '2. Demo: Trench for Drainage', NULL, '2. Demo: Trench for Drainage', NULL, NULL, NULL, NULL),
  (1018057, 43634549, '3. Install: Drain pipe', NULL, '115 linear feet of 4” SDR35 drainpipe

3. Install: Drain pipe', NULL, NULL, NULL, NULL),
  (1018090, 43634549, '3. Install: (10 qty.) masonry lid drains', NULL, '3. Install: (10 qty.) masonry lid drains', NULL, NULL, NULL, NULL),
  (1018101, 43634549, '3. Install: Core outlet', NULL, '3. Install: Core outlet', NULL, NULL, NULL, NULL),
  (1018121, 43634549, 'Dowel into existing pool and epoxy rebar', NULL, 'Dowel into existing pool and epoxy rebar', NULL, NULL, NULL, NULL),
  (1018138, 43634549, '3. Install: Create tile dam wall spillway', NULL, 'approx. 16 linear feet

3. Install: Create tile dam wall spillway', NULL, NULL, NULL, NULL),
  (1018202, 43634549, '3. Install: Add Plumbing for New Spa', NULL, '3. Install: Add Plumbing for New Spa', NULL, NULL, NULL, NULL),
  (1018979, 43634549, '3. Install: Pour Shotcrete for Bench', NULL, '3. Install: Pour Shotcrete for Bench', NULL, NULL, NULL, NULL),
  (1019024, 43634549, '3. Install: Square corners of pool for Cover Vault', NULL, '3. Install: Square corners of pool for Cover Vault', NULL, NULL, NULL, NULL),
  (1019057, 43634549, '3. Install: Cover Vault Housing', NULL, '3. Install: Cover Vault Housing', NULL, NULL, NULL, NULL),
  (1019144, 43634549, '3. Install: Cover Vault', NULL, 'Cover Pro brand

3. Install: Cover Vault', NULL, NULL, NULL, NULL),
  (1019145, 43634549, '3. Install: Cover Vault Rebar and Shotcrete', NULL, '3. Install: Cover Vault Rebar and Shotcrete', NULL, NULL, NULL, NULL),
  (1019415, 43634549, '3. Install: Additional Bellecrete coping for cover vault', NULL, 'approx. 15 linear feet

3. Install: Additional Bellecrete coping for cover vault', NULL, NULL, NULL, NULL),
  (1020897, 43634549, '3. Install: Dedicated breaker for Electric Heater', NULL, '3. Install: Dedicated breaker for Electric Heater', NULL, NULL, NULL, NULL),
  (1049208, 42165692, '2. Demo: Dig Pool area', NULL, '2. Demo: Dig Pool area', NULL, NULL, NULL, NULL),
  (1049212, 42165692, '2. Demo: Remove (2qty) Trees and grind/Remove stumps', NULL, '2. Demo: Remove (2qty) Trees and grind/Remove stumps', NULL, NULL, NULL, NULL),
  (1049825, 42165692, '2. Demo: Remove Existing Grass in Rear Yard', NULL, '2. Demo: Remove Existing Grass in Rear Yard', NULL, NULL, NULL, NULL),
  (1049987, 42165692, '2. Demo: Remove existing shrubs as needed', NULL, '2. Demo: Remove existing shrubs as needed', NULL, NULL, NULL, NULL),
  (1049992, 42165692, '2. Demo: Remove Larger Hedges and shrubs in work area', NULL, '2. Demo: Remove Larger Hedges and shrubs in work area', NULL, NULL, NULL, NULL),
  (1050000, 42165692, '2. Demo: Remove/Grade area for Concrete', NULL, '2. Demo: Remove/Grade area for Concrete', NULL, NULL, NULL, NULL),
  (1050005, 42165692, '2. Demo: Till & Amend Sod Area', NULL, '2. Demo: Till & Amend Sod Area', NULL, NULL, NULL, NULL),
  (1050007, 42165692, '2. Demo: Trench for Pool electrical and Gas', NULL, '2. Demo: Trench for Pool electrical and Gas', NULL, NULL, NULL, NULL),
  (1050016, 42165692, '3. Install: 8 new uplights', NULL, '3. Install: 8 new uplights', NULL, NULL, NULL, NULL),
  (1050019, 42165692, '3. Install: Saw Cut/Concrete Pad for Pool Equipment', NULL, '3. Install: Saw Cut/Concrete Pad for Pool Equipment', NULL, NULL, NULL, NULL),
  (1050032, 42165692, '3. Install: Connect Lighting to existing transformer', NULL, '3. Install: Connect Lighting to existing transformer', NULL, NULL, NULL, NULL),
  (1050035, 42165692, '3. Install: Set Forms for pool', NULL, '3. Install: Set Forms for pool', NULL, NULL, NULL, NULL),
  (1050039, 42165692, '3. Install: Import new soil into grass and seeded area', NULL, '3. Install: Import new soil into grass and seeded area', NULL, NULL, NULL, NULL),
  (1050043, 42165692, '3. Install: Install Sod', NULL, '3. Install: Install Sod', NULL, NULL, NULL, NULL),
  (1050149, 42165692, '3. Install: Pool Equipment', NULL, '3. Install: Pool Equipment', NULL, NULL, NULL, NULL),
  (1050166, 42165692, '3. Install: Pool plumbing', NULL, '3. Install: Pool plumbing', NULL, NULL, NULL, NULL),
  (1050170, 42165692, '3. Install: Pool Plaster', NULL, '3. Install: Pool Plaster', NULL, NULL, NULL, NULL),
  (1050177, 42165692, '3. Install: Reinstall existing owner lights', NULL, '3. Install: Reinstall existing owner lights', NULL, NULL, NULL, NULL),
  (1050181, 42165692, '3. Install: Run 250 LF of low voltage wire for Lighting', NULL, '3. Install: Run 250 LF of low voltage wire for Lighting', NULL, NULL, NULL, NULL),
  (1050184, 42165692, '3. Install: Run Electrical and Gas for Pool equipment', NULL, '3. Install: Run Electrical and Gas for Pool equipment', NULL, NULL, NULL, NULL),
  (1050268, 42165692, '3. Install: Set Rebar for Pool', NULL, '3. Install: Set Rebar for Pool', NULL, NULL, NULL, NULL),
  (1050274, 42165692, '3. Install: Seed topper over owner provided Seed', NULL, '3. Install: Seed topper over owner provided Seed', NULL, NULL, NULL, NULL),
  (1050280, 42165692, '3. Install: Shotcrete', NULL, '3. Install: Shotcrete', NULL, NULL, NULL, NULL),
  (1050285, 42165692, '3. Install: Spa Bench and Pool steps', NULL, '3. Install: Spa Bench and Pool steps', NULL, NULL, NULL, NULL),
  (1050362, 42165692, '3. Install: Coping for Pool', NULL, '3. Install: Coping for Pool', NULL, NULL, NULL, NULL),
  (1050365, 42165692, '3. Install: Waterline Tile', NULL, '3. Install: Waterline Tile', NULL, NULL, NULL, NULL),
  (1051179, 42165692, '2. Demo: Remove Metal railing for machine access', NULL, '2. Demo: Remove Metal railing for machine access', NULL, NULL, NULL, NULL),
  (1051198, 43348423, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (1051199, 43348423, '3. Pick up Job Box.', NULL, '3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (1051200, 43348423, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, NULL, NULL, NULL),
  (1051201, 43348423, 'Enter Daily Log with Job Specifics not covered in the Scope of Work.  Important!!!!', NULL, 'Enter Daily Log with Job Specifics not covered in the Scope of Work.  Important!!!!', NULL, NULL, NULL, NULL),
  (1051202, 43348423, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (1051203, 43348423, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (1055230, 37542899, 'quick connect coupler with key and hose bib', NULL, 'quick connect coupler with key and hose bib', NULL, NULL, NULL, '(HR) Mo Solomon'),
  (1056826, 39951145, 'Electrical and bistro light poles to be reset.', NULL, 'Electrical and bistro light poles to be reset.', NULL, NULL, NULL, '(HR) Mo Solomon'),
  (1056828, 39951145, 'Painting?', NULL, 'Painting?', NULL, NULL, NULL, '(HR) Mo Solomon'),
  (1057144, 43348423, '2. Demo: Remove 4” of existing driveway', NULL, 'approx. 950 square feet

2. Demo: Remove 4” of existing driveway', NULL, NULL, NULL, NULL),
  (1057158, 43348423, '2. Demo: Excavate/Grade for Paver Driveway', NULL, '2. Demo: Excavate/Grade for Paver Driveway', NULL, NULL, NULL, NULL),
  (1057166, 43348423, '3. Install: Road Base and leveling sand for Paver Driveway', NULL, '3. Install: Road Base and leveling sand for Paver Driveway', NULL, NULL, NULL, NULL),
  (1057172, 43348423, '3. Install: Pavers', NULL, 'Angelus brand Antique Cobble I & II pavers approx. 1015 square feet

3. Install: Pavers', NULL, NULL, NULL, NULL),
  (1057262, 43348423, '3. Install:  Concrete edge restraints where pavers meet Softscape areas', NULL, '3. Install:  Concrete edge restraints where pavers meet Softscape areas', NULL, NULL, NULL, NULL),
  (1061093, 43348423, '2. Demo: Remove existing 4” concrete curb', NULL, 'approx. 60 linear feet

2. Demo: Remove existing 4” concrete curb', NULL, NULL, NULL, NULL),
  (1061112, 43348423, '2. Demo: Remove 4” of soil in planter', NULL, 'approx. 105 square feet

2. Demo: Remove 4” of soil in planter', NULL, NULL, NULL, NULL),
  (1065798, 43348423, '2. Demo: Excavate/Grade for Gravel Channel', NULL, '2. Demo: Excavate/Grade for Gravel Channel', NULL, NULL, NULL, NULL),
  (1065821, 43348423, '3. Install: Weed barrier fabric for Gravel Channel', NULL, '3. Install: Weed barrier fabric for Gravel Channel', NULL, NULL, NULL, NULL),
  (1065824, 43348423, '3. Install: Crushed pea gravel in Channel', NULL, 'approx. 95 square feet

3. Install: Crushed pea gravel in Channel', NULL, NULL, NULL, NULL),
  (1065942, 43348423, '2. Demo: Trench for drainage', NULL, '2. Demo: Trench for drainage', NULL, NULL, NULL, NULL),
  (1065953, 43348423, '3. Install: Run 140 linear feet of 4” SDR35 drainpipe', NULL, '3. Install: Run 140 linear feet of 4” SDR35 drainpipe', NULL, NULL, NULL, NULL),
  (1068475, 43348423, '3. Install: (2 qty.) 12” x 12” concrete catch basins', NULL, '3. Install: (2 qty.) 12” x 12” concrete catch basins', NULL, NULL, NULL, NULL),
  (1068480, 43348423, '3. Install: Pour 18” x 18” x 6” thick concrete slabs underneath catch basins', NULL, '3. Install: Pour 18” x 18” x 6” thick concrete slabs underneath catch basins', NULL, NULL, NULL, NULL),
  (1069738, 43348423, '3. Install: (2 qty.) area drains', NULL, '3. Install: (2 qty.) area drains', NULL, NULL, NULL, NULL),
  (1069757, 43348423, '2. Demo: Excavate 6” riprap for gravel drainage', NULL, '2. Demo: Excavate 6” riprap for gravel drainage', NULL, NULL, NULL, NULL),
  (1069865, 43348423, '3. Install: 6” of crushed pea gravel', NULL, '3. Install: 6” of crushed pea gravel', NULL, NULL, NULL, NULL),
  (1070454, 43348423, '2. Demo: Prep existing 2’ height planter wall for new veneer', NULL, '2. Demo: Prep existing 2’ height planter wall for new veneer', NULL, NULL, NULL, NULL),
  (1070926, 43348423, '3. Install: MSI RockMount stacked stone panel veneer', NULL, 'Color: Golden Honey

3. Install: MSI RockMount stacked stone panel veneer', NULL, NULL, NULL, NULL),
  (1072137, 43348423, '2. Demo: Remove existing caps on walls for Stucco', NULL, '2. Demo: Remove existing caps on walls for Stucco', NULL, NULL, NULL, NULL),
  (1072182, 43348423, '3. Install: Stucco Sand finish to side of existing perimeter wall', NULL, 'approx. 160 square feet

3. Install: Stucco Sand finish to side of existing perimeter wall', NULL, NULL, NULL, NULL),
  (1072732, 43348423, '2. Demo: Remove 2” of existing lawn in front yard', NULL, 'approx. 840 square feet

2. Demo: Remove 2” of existing lawn in front yard', NULL, NULL, NULL, NULL),
  (1072869, 43348423, '2. Demo: Remove existing turf in parkway', NULL, 'approx. 150 square feet

2. Demo: Remove existing turf in parkway', NULL, NULL, NULL, NULL),
  (1072874, 43455241, '12 x 12 Cotto gold Arto tile from Mission Tile West', NULL, '12 x 12 Cotto gold Arto tile from Mission Tile West', NULL, NULL, NULL, '(.PM) Carter Godley,(.PM) Paul DeAngelis,Javier Andrade'),
  (1072920, 43348423, '2. Demo: Excavate/ Grade for DG And mulch', NULL, '2. Demo: Excavate/ Grade for DG And mulch', NULL, NULL, NULL, NULL),
  (1072924, 43348423, '2. Demo: Grind stump', NULL, '2. Demo: Grind stump', NULL, NULL, NULL, NULL),
  (1073055, 43348423, '3. Install: Weed barrier fabric for D.G and Mulch', NULL, '3. Install: Weed barrier fabric for D.G and Mulch', NULL, NULL, NULL, NULL),
  (1073060, 43348423, '3. Install: Stabilized D.G', NULL, 'approx. 500 square feet

3. Install: Stabilized D.G', NULL, NULL, NULL, NULL),
  (1073125, 43348423, '3. Install 2” of brown shredded mulch for planted areas', NULL, '3. Install 2” of brown shredded mulch for planted areas', NULL, NULL, NULL, NULL),
  (1073303, 43348423, '3. Install: (3 qty.) 24” x 12” precast concrete steppers', NULL, '3. Install: (3 qty.) 24” x 12” precast concrete steppers', NULL, NULL, NULL, NULL),
  (1074066, 43348423, '3. Install: Plants', NULL, '(12 qty.) 5 gal premium shrubs (72 qty.) 1 gal standard shrubs (6 qty.) 18”-24” Granite boulders

3. Install: Plants', NULL, NULL, NULL, NULL),
  (1074082, 43348423, '3. Install: Irrigation', NULL, '(1 qty.) new anti-siphon valve for drip irrigation Connect to existing timer

3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (1074095, 43348423, '3. Install: Run irrigation line to parkway', NULL, '3. Install: Run irrigation line to parkway', NULL, NULL, NULL, NULL),
  (1112244, 39951145, 'Repair Lighting that is not working (2 Lights', NULL, 'Repair Lighting that is not working (2 Lights', NULL, NULL, NULL, NULL),
  (1112246, 39951145, 'Install 2 zone transformer', NULL, 'Install 2 zone transformer', NULL, NULL, NULL, NULL),
  (1112285, 39951145, 'Owner wants Screws in hand rail to be covered', NULL, 'Owner wants Screws in hand rail to be covered', NULL, NULL, NULL, NULL),
  (1135734, 43784629, 'See new wall instructions: entire length = 42" height, stucco both sides for sidewalk and house side, neighboring wall = one-side stucco. See plan.', NULL, 'See new wall instructions: entire length = 42" height, stucco both sides for sidewalk and house side, neighboring wall = one-side stucco. See plan.', NULL, NULL, NULL, '(.PM) Paul DeAngelis'),
  (1137849, 44284160, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (1137850, 44284160, '2. Pick up final payment unless there are outstanding items for completion.', NULL, '2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (1137851, 44284160, 'Project Supervisor to have Pre Job Walk meeting with Client and Designer/Consultant', NULL, 'Project Supervisor to have Pre Job Walk meeting with Client and Designer/Consultant', NULL, NULL, NULL, NULL),
  (1137852, 44284160, 'Upload Any Permit Info', NULL, 'Upload Any Permit Info', NULL, NULL, NULL, NULL),
  (1137853, 44284160, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (1137854, 44284160, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (1144394, 44052940, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (1144395, 44052940, '1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (1144396, 44052940, 'Project Supervisor to have Pre Job Walk meeting with Client and Designer/Consultant', NULL, 'Project Supervisor to have Pre Job Walk meeting with Client and Designer/Consultant', NULL, NULL, NULL, NULL),
  (1144397, 44052940, 'Upload Any Engineering Info', NULL, 'Upload Any Engineering Info', NULL, NULL, NULL, NULL),
  (1144398, 44052940, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (1144399, 44052940, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (1144468, 44052940, '2. Demo: Excavate rear yard concrete pad and turf strips area', NULL, '2. Demo: Excavate rear yard concrete pad and turf strips area', NULL, NULL, NULL, NULL),
  (1144529, 44052940, '2. Demo: 8 square feet of existing concrete in rear yard', NULL, '2. Demo: 8 square feet of existing concrete in rear yard', NULL, NULL, NULL, NULL),
  (1147149, 44052940, '3. Install: Road Base for Rear Yard concrete', NULL, '3. Install: Road Base for Rear Yard concrete', NULL, NULL, NULL, NULL),
  (1147737, 44052940, '3. Install: Rebar for Read Yard Concrete', NULL, '3. Install: Rebar for Read Yard Concrete', NULL, NULL, NULL, NULL),
  (1147838, 44052940, '3. Install: Form Concrete Pads with gaps In Rear Yard', NULL, 'includes steppers in front of ADU

3. Install: Form Concrete Pads with gaps In Rear Yard', NULL, NULL, NULL, NULL),
  (1147921, 44052940, '3. Install: Pour Concrete In Rear Yard', NULL, 'approx. 745 square feet

3. Install: Pour Concrete In Rear Yard', NULL, NULL, NULL, NULL),
  (1147930, 44052940, '3. Install: 258 linear feet of total turf strips between concrete joints', NULL, '3. Install: 258 linear feet of total turf strips between concrete joints', NULL, NULL, NULL, NULL),
  (1148096, 44052940, '3. Install: 30LF of metal Benderboard edging to contain turf joints', NULL, '3. Install: 30LF of metal Benderboard edging to contain turf joints', NULL, NULL, NULL, NULL),
  (1148189, 44052940, '2. Demo: Excavate concrete walkway and A/C unit areas', NULL, '2. Demo: Excavate concrete walkway and A/C unit areas', NULL, NULL, NULL, NULL),
  (1148195, 44052940, '3. Install: Road Base for Concrete Walkway', NULL, '3. Install: Road Base for Concrete Walkway', NULL, NULL, NULL, NULL),
  (1148288, 44052940, '3. Install: Rebar for Concrete Walkway', NULL, '3. Install: Rebar for Concrete Walkway', NULL, NULL, NULL, NULL),
  (1148301, 44052940, '3. Install: Pour Concrete walkway', NULL, 'approx. 350 square feet

3. Install: Pour Concrete walkway', NULL, NULL, NULL, NULL),
  (1148334, 44052940, '3. Install: Form Concrete Walkway', NULL, '3. Install: Form Concrete Walkway', NULL, NULL, NULL, NULL),
  (1148371, 44052940, '3. Install: (19 qty.) 2’ x 2’ precast concrete steppers (front yard walkway)', NULL, '3. Install: (19 qty.) 2’ x 2’ precast concrete steppers (front yard walkway)', NULL, NULL, NULL, NULL),
  (1148495, 44052940, '3. Demo: Remove existing Iron fence in front and south side yard', NULL, 'approx. 116 linear feet

3. Demo: Remove existing Iron fence in front and south side yard', NULL, NULL, NULL, NULL),
  (1148882, 44052940, '3. Install: Layout new perimeter wall south side of property', NULL, 'approx. 55 LF (includes wall that will  connect to the side yard entry)

3. Install: Layout new perimeter wall south side of property', NULL, NULL, NULL, NULL),
  (1149474, 44052940, '2. Demo: Excavate for Wall Footings', NULL, '2. Demo: Excavate for Wall Footings', NULL, NULL, NULL, NULL),
  (1149551, 44052940, '3. Install: Rebar for Wall', NULL, '3. Install: Rebar for Wall', NULL, NULL, NULL, NULL),
  (1149554, 44052940, '3. Install: Pour Concrete Footings for Wall', NULL, '3. Install: Pour Concrete Footings for Wall', NULL, NULL, NULL, NULL),
  (1149557, 44052940, '3. Install: CMU Block for Wall', NULL, 'finish height of 72” approx. 55 LF

3. Install: CMU Block for Wall', NULL, NULL, NULL, NULL),
  (1149568, 44052940, '3. Install: Apply sand stucco finish to both sides of 72” wall', NULL, 'approx. 660 square feet

3. Install: Apply sand stucco finish to both sides of 72” wall', NULL, NULL, NULL, NULL),
  (1149572, 44052940, '3. Install: Apply sand stucco finish to interior side of eastern/southern rear yard wall (Existing Wall)', NULL, '3. Install: Apply sand stucco finish to interior side of eastern/southern rear yard wall (Existing Wall)', NULL, NULL, NULL, NULL),
  (1149579, 44052940, '2. Demo: Till and amend planting area', NULL, '2. Demo: Till and amend planting area', NULL, NULL, NULL, NULL),
  (1149582, 44052940, '3. Install: Plants', NULL, '(3 qty.) 15 gal trees (2 Olive Trees, 1 Citrus) (27 qty.) 15 gal standard shrubs (4 qty.) 5 gal succulents (79 qty.) 1 gal standard shrubs (3 qty.) 1 gal succulent

3. Install: Plants', NULL, NULL, NULL, NULL),
  (1150281, 44052940, '2. Demo: Trench for electrical from existing meter to new cook center', NULL, '2. Demo: Trench for electrical from existing meter to new cook center', NULL, NULL, NULL, NULL),
  (1150293, 44052940, '3. Install: Electrical for cook center', NULL, 'approx. 40 linear feet

3. Install: Electrical for cook center', NULL, NULL, NULL, NULL),
  (1150299, 44052940, '3. Install: Tee off gas line from existing pool run to cook center', NULL, 'approx. 30 linear feet

3. Install: Tee off gas line from existing pool run to cook center', NULL, NULL, NULL, NULL),
  (1150307, 44052940, '2. Demo: Excavate footings for cook center', NULL, '2. Demo: Excavate footings for cook center', NULL, NULL, NULL, NULL),
  (1150310, 44052940, '3. Install: Pour Footings for Cook Center', NULL, '3. Install: Pour Footings for Cook Center', NULL, NULL, NULL, NULL),
  (1150322, 44052940, '3. Install: CMU Block For Cook Center', NULL, 'approx. 17 linear feet  reach finish height of 36”

3. Install: CMU Block For Cook Center', NULL, NULL, NULL, NULL),
  (1150369, 44052940, '3. Install: Pour concrete countertop', NULL, 'approx. 18 square feet

3. Install: Pour concrete countertop', NULL, NULL, NULL, NULL),
  (1150379, 44052940, '3. Install: Apply sand stucco finish to exterior of cook center', NULL, 'Color?

3. Install: Apply sand stucco finish to exterior of cook center', NULL, NULL, NULL, NULL),
  (1150384, 44052940, '3. Install: (2 qty.) GFIC outlets on Cook Center', NULL, '3. Install: (2 qty.) GFIC outlets on Cook Center', NULL, NULL, NULL, NULL),
  (1150387, 44052940, '3. Install: (1 qty.) gas shut-off valve for Cook Center', NULL, '3. Install: (1 qty.) gas shut-off valve for Cook Center', NULL, NULL, NULL, NULL),
  (1150397, 44052940, '2. Demo: Excavate/Grade for Gravel', NULL, 'approx. 750 square feet

2. Demo: Excavate/Grade for Gravel', NULL, NULL, NULL, NULL),
  (1150404, 44052940, '3. Install: Weed Barrier for Gravel', NULL, '3. Install: Weed Barrier for Gravel', NULL, NULL, NULL, NULL),
  (1150418, 44052940, '3. Install: Del Rio Gravel', NULL, 'approx. 750 square feet

3. Install: Del Rio Gravel', NULL, NULL, NULL, NULL),
  (1150422, 44052940, '3. Install: 200 LF of metal benderboard edging to contain gravel areas', NULL, '3. Install: 200 LF of metal benderboard edging to contain gravel areas', NULL, NULL, NULL, NULL),
  (1150442, 44052940, '2. Demo: Remove existing sod in front yard', NULL, 'approx. 830 square feet

2. Demo: Remove existing sod in front yard', NULL, NULL, NULL, NULL),
  (1150674, 44052940, '2. Demo: Till and amend sod area', NULL, 'approx. 1010 square feet

2. Demo: Till and amend sod area', NULL, NULL, NULL, NULL),
  (1150711, 44052940, '3. Install: ‘Marathon I’ Sod', NULL, 'approx. 1010 square ft

3. Install: ‘Marathon I’ Sod', NULL, NULL, NULL, NULL),
  (1150722, 44052940, '3. Install: Lighting', NULL, '(1 qty.) new 200-watt transformer (18 qty.) ‘Lightcraft’ or equal LED light fixtures Install F/X timer Wire up all fixtures

3. Install: Lighting', NULL, NULL, NULL, NULL),
  (1150728, 44052940, '3. Install: Irrigation', NULL, '(3 qty.) anti-siphon valves for drip irrigation (3 qty.) anti-siphon valves for spray irrigation  Rachio brand smart irrigation controller

3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (1150759, 44052940, '2. Demo: Trench for Drainpipe', NULL, '2. Demo: Trench for Drainpipe', NULL, NULL, NULL, NULL),
  (1150764, 44052940, '3. Install: Drainage', NULL, 'approx. 100 linear feet  (9 qty.) area drains Connect new drainage to existing points of connection

3. Install: Drainage', NULL, NULL, NULL, NULL),
  (1151194, 44052940, '3. Install: Additional Items PENDING', NULL, 'Wall for front yard perimeter (West Side) Decomposed Granite for Parkways Irrigation/Plants for Parkways

3. Install: Additional Items PENDING', NULL, NULL, NULL, NULL),
  (1151384, 44284160, '2. Demo: Excavate for Stepped Footings', NULL, '2. Demo: Excavate for Stepped Footings', NULL, NULL, NULL, NULL),
  (1151401, 44284160, '3. Install: Back fill and compact soils in 12-inch lifts', NULL, 'Possible soils inspections required for back fill

3. Install: Back fill and compact soils in 12-inch lifts', NULL, NULL, NULL, NULL),
  (1151415, 44284160, '3. Install: Form for subgrade mini pile and stepped footings', NULL, '3. Install: Form for subgrade mini pile and stepped footings', NULL, NULL, NULL, NULL),
  (1151420, 44284160, '3. Install: Form for side wall curbing', NULL, 'likely at 24 inches tall

3. Install: Form for side wall curbing', NULL, NULL, NULL, NULL),
  (1151465, 44284160, '3. Install: rebar for foundation.', NULL, '3. Install: rebar for foundation.', NULL, NULL, NULL, NULL),
  (1151484, 44284160, '3. Install: 1st Pour with 3000 psi standard concrete.', NULL, '3. Install: 1st Pour with 3000 psi standard concrete.', NULL, NULL, NULL, NULL),
  (1151959, 44284160, '3. Install: Form for finish steps and 24 inches to 8-inch soils retainment', NULL, '3. Install: Form for finish steps and 24 inches to 8-inch soils retainment', NULL, NULL, NULL, NULL),
  (1152743, 44284160, '3. Install: Pour (14) 3 ft steps and 83 square feet of flat area', NULL, '3. Install: Pour (14) 3 ft steps and 83 square feet of flat area', NULL, NULL, NULL, NULL),
  (1152753, 44284160, '3. Install: 2nd Pour with 3000 psi colored concrete with sand finish', NULL, '3. Install: 2nd Pour with 3000 psi colored concrete with sand finish', NULL, NULL, NULL, NULL),
  (1153017, 44284160, '3. Install: waterproofing on hillside step retainment wall.', NULL, '3. Install: waterproofing on hillside step retainment wall.', NULL, NULL, NULL, NULL),
  (1153020, 44284160, '3. Install: Back fill retainment wall on step side and compact in lifts.', NULL, '3. Install: Back fill retainment wall on step side and compact in lifts.', NULL, NULL, NULL, NULL),
  (1153154, 44284160, '2. Demo: Remove existing pavers to established sub grade clean edge', NULL, '2. Demo: Remove existing pavers to established sub grade clean edge', NULL, NULL, NULL, NULL),
  (1153158, 44284160, '2. Demo: Excavate/Grade for Pavers', NULL, '2. Demo: Excavate/Grade for Pavers', NULL, NULL, NULL, NULL),
  (1153159, 44284160, '3. Install: Road Base and Leveling sand for Pavers', NULL, '3. Install: Road Base and Leveling sand for Pavers', NULL, NULL, NULL, NULL),
  (1153208, 44284160, '3. Install: Reinstall existing provided pavers', NULL, '3. Install: Reinstall existing provided pavers', NULL, NULL, NULL, NULL),
  (1153280, 44284160, '3. Install: standard joint sand for pavers', NULL, '3. Install: standard joint sand for pavers', NULL, NULL, NULL, NULL),
  (1188865, 44064446, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (1188866, 44064446, '1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (1188867, 44064446, 'Project Supervisor to have Pre Job Walk meeting with Client and Designer/Consultant', NULL, 'Project Supervisor to have Pre Job Walk meeting with Client and Designer/Consultant', NULL, NULL, NULL, NULL),
  (1188868, 44064446, 'Route Project For Prep Review', NULL, 'Route Project For Prep Review', NULL, NULL, NULL, NULL),
  (1188869, 44064446, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (1188870, 44064446, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (1204619, 39951145, 'Check w/ h.o. before work. Remove irrigation from madagascar palms in pots, clamp off irrigation for those 2 pots.', NULL, 'Check w/ h.o. before work. Remove irrigation from madagascar palms in pots, clamp off irrigation for those 2 pots.', NULL, NULL, NULL, 'Bryan Vielman'),
  (1243204, 44142804, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (1243205, 44142804, '4. Pick up yard sign unless ok by client to leave longer.', NULL, '4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (1243206, 44142804, 'Job Walk Completed', NULL, 'Job Walk Completed', NULL, NULL, NULL, NULL),
  (1243207, 44142804, 'Upload Before Photos and Videos', NULL, 'Upload Before Photos and Videos', NULL, NULL, NULL, NULL),
  (1243208, 44142804, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (1243209, 44142804, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (1244651, 44142804, '2. Demo: Remove existing Driveway', NULL, 'approx. 750 sqft

2. Demo: Remove existing Driveway', NULL, NULL, NULL, NULL),
  (1244671, 44142804, '2. Demo: Excavate/Grade Driveway for Pavers', NULL, '2. Demo: Excavate/Grade Driveway for Pavers', NULL, NULL, NULL, NULL),
  (1244673, 44142804, '3. Install: Base and Leveling Sand for Pavers', NULL, '3. Install: Base and Leveling Sand for Pavers', NULL, NULL, NULL, NULL),
  (1244678, 44142804, 'Includes concrete edge restraints where pavers meet softscape areas', NULL, 'Includes concrete edge restraints where pavers meet softscape areas', NULL, NULL, NULL, NULL),
  (1244790, 44142804, '2. Demo: Trench for Drainage', NULL, '70LF

2. Demo: Trench for Drainage', NULL, NULL, NULL, NULL),
  (1245314, 44142804, '3. Install: Area drains (4 qty.)', NULL, '3. Install: Area drains (4 qty.)', NULL, NULL, NULL, NULL),
  (1245319, 44142804, '3. Install: (2 qty.) downspout connectors', NULL, '3. Install: (2 qty.) downspout connectors', NULL, NULL, NULL, NULL),
  (1245750, 44142804, '2. Demo: Hydrocut under sidewalk and core curb', NULL, '2. Demo: Hydrocut under sidewalk and core curb', NULL, NULL, NULL, NULL),
  (1245760, 44142804, '3. Install: 15 linear feet of channel drain at garage entry', NULL, 'Connect to new drainage

3. Install: 15 linear feet of channel drain at garage entry', NULL, NULL, NULL, NULL),
  (1245800, 44142804, '2. Demo: Excavate/Grade for gravel', NULL, '2. Demo: Excavate/Grade for gravel', NULL, NULL, NULL, NULL),
  (1245820, 44142804, '3. Install: Weed barrier fabric for gravel', NULL, 'approx. 170 sqft

3. Install: Weed barrier fabric for gravel', NULL, NULL, NULL, NULL),
  (1245826, 44142804, '3. Install: Del Rio 1” minus gravel along driveway channel and next to garage', NULL, '3. Install: Del Rio 1” minus gravel along driveway channel and next to garage', NULL, NULL, NULL, NULL),
  (1245835, 44142804, '3. Install: Relocate Irrigation', NULL, 'Move irrigation manifold and main line pipes from corner of planter next to garage to inside of raised brick planter

3. Install: Relocate Irrigation', NULL, NULL, NULL, NULL),
  (1255013, 43455241, 'Schedule paver cleaning - stain from roof/rain', NULL, 'Can we do anything about this?

Schedule paver cleaning - stain from roof/rain', NULL, NULL, NULL, '(.PM) Carter Godley'),
  (1336301, 42040087, 'Adjust yard sprinklers in back yard', NULL, 'Adjust yard sprinklers in back yard', '2026-04-16', NULL, NULL, 'Bryan Vielman'),
  (1368152, 43671517, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (1368153, 43671517, '5. If the client is happy with the work ask for a review.', NULL, '5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (1368154, 43671517, 'Production Manager Familiarize with  Job Scope, Plan and Tasks', NULL, 'Production Manager Familiarize with  Job Scope, Plan and Tasks', NULL, NULL, NULL, NULL),
  (1368155, 43671517, 'Upload Bid', NULL, 'Upload Bid', NULL, NULL, NULL, NULL),
  (1368156, 43671517, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (1368157, 43671517, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (1368260, 43671517, '2. Demo: Remove existing putting green', NULL, 'approx. 400 square feet

2. Demo: Remove existing putting green', NULL, NULL, NULL, NULL),
  (1368268, 43671517, '2. Demo: Remove 6” of existing concrete underneath putting green', NULL, 'approx. 400 square feet

2. Demo: Remove 6” of existing concrete underneath putting green', NULL, NULL, NULL, NULL),
  (1368301, 43671517, '2. Demo: Excavate flagstone area as needed', NULL, '2. Demo: Excavate flagstone area as needed', NULL, NULL, NULL, NULL),
  (1368302, 43671517, '3. Install: Stand up Sydney Peak flagstone or equal', NULL, 'dry set, approx. 975 square feet

3. Install: Stand up Sydney Peak flagstone or equal', NULL, NULL, NULL, NULL),
  (1368481, 43671517, '3. Install: Stabilized D.G. between flagstone joints', NULL, '3. Install: Stabilized D.G. between flagstone joints', NULL, NULL, NULL, NULL),
  (1368486, 43671517, '3. Install: Overlay new tile over existing concrete countertop', NULL, 'approx. 32 square feet Tile allowance: $10/sqft

3. Install: Overlay new tile over existing concrete countertop', NULL, NULL, NULL, NULL),
  (1368489, 43671517, '2. Demo: Remove 3" of soil for Artificial Turf', NULL, '2. Demo: Remove 3" of soil for Artificial Turf', NULL, NULL, NULL, NULL),
  (1368504, 43671517, '3. Install: Gravel base for Artificial Turf', NULL, '3. Install: Gravel base for Artificial Turf', NULL, NULL, NULL, NULL),
  (1368508, 43671517, '3. Install: Weed barrier fabric for Artificial Turf', NULL, '3. Install: Weed barrier fabric for Artificial Turf', NULL, NULL, NULL, NULL),
  (1368520, 43671517, '3. Install: 140 square feet of Simple Turf brand Bel Air Supreme artificial turf', NULL, '3. Install: 140 square feet of Simple Turf brand Bel Air Supreme artificial turf', NULL, NULL, NULL, NULL),
  (1368541, 43671517, '3. Install: Plants', NULL, '(1 qty.) 24” box tree (5 qty.) standard 15 gal shrubs (37 qty.) standard 5 gal shrubs

3. Install: Plants', NULL, NULL, NULL, NULL),
  (1369059, 43671517, '2. Demo: Spot prep soil as needed', NULL, '2. Demo: Spot prep soil as needed', NULL, NULL, NULL, NULL),
  (1406472, 43671517, '3. Install: Irrigation', NULL, '(1 qty.) new drip irrigation zone Connect to existing timer

3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (1406493, 43671517, '3. Install: Lighting', NULL, '(1 qty.) 200-watt transformer (8 qty.) Lightcraft or equal LED spotlights (9 qty.) Lightcraft or equal LED path lights (6 qty.) Lightcraft or equal LED globe lights

3. Install: Lighting', NULL, NULL, NULL, NULL),
  (1406591, 43671517, '3. Install: Benderboard', NULL, '36 linear feet of composite benderboard edging

3. Install: Benderboard', NULL, NULL, NULL, NULL),
  (1407092, 43541680, 'Semi-gloss Paver Sealer', NULL, 'Semi-gloss Paver Sealer', NULL, NULL, NULL, '(.PM) Jorge Flores'),
  (1538693, 43671517, '2. Demo: Trench for Gas Line', NULL, '2. Demo: Trench for Gas Line', NULL, NULL, NULL, NULL),
  (1538697, 43671517, '3. Install: Gas Line', NULL, '26 linear feet of 1” gas line stubbed up for firepit

3. Install: Gas Line', NULL, NULL, NULL, NULL),
  (1571174, 1727167, 'Set up Design In Builder Trend', NULL, NULL, '2016-07-21', '2016-07-28 06:57:53', 'Brian Godley', 'Brian Godley'),
  (1571276, 1721669, 'Check on Progress', NULL, NULL, '2016-07-22', '2016-07-28 06:57:54', 'Brian Godley', 'Brian Godley'),
  (1679287, 43939058, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (1679288, 43939058, '7. Take final photos for our website and upload to Builder Trend', NULL, '7. Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (1679289, 43939058, 'Project Supervisor to have Pre Job Walk meeting with Client and Designer/Consultant', NULL, 'Project Supervisor to have Pre Job Walk meeting with Client and Designer/Consultant', NULL, NULL, NULL, NULL),
  (1679290, 43939058, 'Upload Contract', NULL, 'Upload Contract', NULL, NULL, NULL, NULL),
  (1679291, 43939058, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (1679292, 43939058, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (1685594, 43939058, '2. Demo: Remove 2" of existing gravel in side yard', NULL, 'approx. 300 square feet

2. Demo: Remove 2" of existing gravel in side yard', NULL, NULL, NULL, NULL),
  (1685684, 43939058, '2. Demo: Remove 2" of existing soil in side yard', NULL, 'approx. 300 square feet

2. Demo: Remove 2" of existing soil in side yard', NULL, NULL, NULL, NULL),
  (1686089, 43939058, '3. Install: Flagstone Steppers', NULL, 'Sydney Peak type flagstone slabs cut flagstone and install in mortar beds

3. Install: Flagstone Steppers', NULL, NULL, NULL, NULL),
  (1687187, 43939058, '2. Demo: Excavate Crawlspace area to 12" ~6sqft', NULL, '2. Demo: Excavate Crawlspace area to 12" ~6sqft', NULL, NULL, NULL, NULL),
  (1687196, 43939058, '3. Install: Fill crawlspace with ¾” crushed pea gravel', NULL, '3. Install: Fill crawlspace with ¾” crushed pea gravel', NULL, NULL, NULL, NULL),
  (1688745, 43939058, '2. Demo: Excavate for footings Crawlspace Entry', NULL, '2. Demo: Excavate for footings Crawlspace Entry', NULL, NULL, NULL, NULL),
  (1695509, 43939058, '3. Install: Pour concrete footings Crawlspace Entry', NULL, 'finish height of 12”

3. Install: Pour concrete footings Crawlspace Entry', NULL, NULL, NULL, NULL),
  (1699699, 43939058, '3. Install: CMU block Crawlspace Entry', NULL, '3. Install: CMU block Crawlspace Entry', NULL, NULL, NULL, NULL),
  (1699707, 43939058, '3. Install: Sydney Peak flagstone cap', NULL, '3. Install: Sydney Peak flagstone cap', NULL, NULL, NULL, NULL),
  (1699714, 43939058, '3. Install: stucco finish to exterior CMU block', NULL, '3. Install: stucco finish to exterior CMU block', NULL, NULL, NULL, NULL),
  (1699753, 43939058, '3. Install: 24 linear feet x 8’ height bamboo panel mounted to existing fence', NULL, 'Bamboo will be 1 inch in diameter at the thicker end

3. Install: 24 linear feet x 8’ height bamboo panel mounted to existing fence', NULL, NULL, NULL, NULL),
  (1700712, 43939058, '3. Install: 4 linear feet x 5’ height panel with two posts set in ground', NULL, 'Bamboo will be 1 inch in diameter at the thicker end

3. Install: 4 linear feet x 5’ height panel with two posts set in ground', NULL, NULL, NULL, NULL),
  (1724669, 43939058, '2. Demo: Spot prep soil for planting,', NULL, 'approx. 200 square feet

2. Demo: Spot prep soil for planting,', NULL, NULL, NULL, NULL),
  (1724676, 43939058, '3. Install: Plants', NULL, '(1 qty.) 24” box maple tree (1 qty.) 15 gal premium shrub (2 qty.) 15 gal standard shrubs (10 qty.) 5 gal standard shrubs (12 qty.) 1 gal premium shrubs (9 qty.) 1 gal standard shrubs (16 qty.) flats of groundcover

3. Install: Plants', NULL, NULL, NULL, NULL),
  (1724681, 43939058, '3. Install: (6 qty.) granite 24” x 24” boulders', NULL, '3. Install: (6 qty.) granite 24” x 24” boulders', NULL, NULL, NULL, NULL),
  (1724682, 43939058, '3. Install: 100 square feet of mulch', NULL, '3. Install: 100 square feet of mulch', NULL, NULL, NULL, NULL),
  (1724689, 43939058, '3. Install: 150 sqft of Mexican beach pebble', NULL, '3. Install: 150 sqft of Mexican beach pebble', NULL, NULL, NULL, NULL),
  (1724692, 43939058, '3. Install: Irrigation', NULL, 'Install (1 qty.) anti-siphon drip irrigation valve

3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (1724695, 43939058, '3. Install: Lighting', NULL, '(1 qty.) 100-watt transformers (2 qty.) Lightcraft or equivalent LED spot lights (6 qty.) Lightcraft or equivalent LED path lights (2 qty.) Lightcraft or equivalent LED flood lights Owner to provide wire at house eave

3. Install: Lighting', NULL, NULL, NULL, NULL),
  (1728812, 43230226, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (1728813, 43230226, '4. Pick up yard sign unless ok by client to leave longer.', NULL, '4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (1728814, 43230226, 'Project Supervisor to have Pre Job Walk meeting with Client and Designer/Consultant', NULL, 'Project Supervisor to have Pre Job Walk meeting with Client and Designer/Consultant', NULL, NULL, NULL, NULL),
  (1728815, 43230226, 'Upload Contract', NULL, 'Upload Contract', NULL, NULL, NULL, NULL),
  (1728816, 43230226, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (1728817, 43230226, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (1752405, 1773939, 'Fix sprinkler and sod.', 'high', 'Customer still having problems with sprinkler leak.

Need sod replaced two patches.', '2016-08-31', '2016-08-29 15:36:28', 'Brandon Disney', 'Brian Godley'),
  (1752667, 1722523, 'Matt Sedigh', 'high', 'Install gas line stub out for BBQ', '2016-09-06', '2016-11-03 10:40:19', 'Brian Godley', 'Brian Godley'),
  (1825691, 1727167, 'Janice Segall', NULL, 'Foward contract please', '2016-09-14', '2016-09-14 18:04:48', 'Brian Godley', 'Brian Godley'),
  (1831305, 1731901, 'Water leak', 'high', 'Client texted. Said had plumber out because it looks like there is a water issue. Maybe broken pipe. Plumber said meter not moving signifying that it is not a plumbing issue. Maybe line for irrigation leaking under concrete. 

We have to isolate that pipe from the rest and see if water issue goes away then we will know.', '2016-09-19', '2016-09-15 13:55:18', 'Brandon Disney', 'Brian Godley'),
  (1867147, 1850217, 'Get Measurements for job', 'high', NULL, '2016-09-24', '2016-10-03 15:03:12', 'Brian Godley', 'Brian Godley'),
  (1903593, 1731771, 'Weeds', 'high', 'Check irrigation and possible leak', '2016-09-29', '2016-09-28 16:30:11', 'Brandon Disney', 'Brian Godley'),
  (1903603, 1829214, 'Dead plants and leak', 'high', NULL, '2016-09-29', '2016-11-03 10:40:02', 'Brian Godley', 'Brian Godley'),
  (1904158, 1727167, 'Citrus trees', 'highest', 'Dwarf varieties of Calamondin (Calamansi lime), Gold Nugget Mandarin, Cocktail Grapefruit, Valencia Orange', '2016-09-28', '2016-09-29 14:18:08', 'Brian Godley', 'Brian Godley'),
  (1926785, 1727167, 'More plants/ missing plants', 'high', 'Need --1) 15gal red crape myrtle.  55) mixed succulents.
18) variegataed mock orange pittosporum.  2) 3" tree stakes', '2016-10-03', '2016-11-03 10:39:43', 'Brian Godley', 'Brian Godley'),
  (1990741, 1723469, '10 am appointment Monday', 'high', NULL, '2016-10-16', '2016-11-03 14:36:44', 'Brandon Disney', NULL),
  (2012643, 43230226, '2. Demo: Remove plants in work area', NULL, '2. Demo: Remove plants in work area', NULL, NULL, NULL, NULL),
  (2012729, 43230226, '2. Demo: Remove concrete in rear yard', NULL, 'approx. 220 square feet

2. Demo: Remove concrete in rear yard', NULL, NULL, NULL, NULL),
  (2015730, 43230226, '2. Demo: Remove two ficus benjamina trees in the front yard and stump grind roots out if needed.', NULL, '2. Demo: Remove two ficus benjamina trees in the front yard and stump grind roots out if needed.', NULL, NULL, NULL, NULL),
  (2015733, 43230226, '2. Demo: Move aside gravel to prep for planting', NULL, '2. Demo: Move aside gravel to prep for planting', NULL, NULL, NULL, NULL),
  (2015813, 43230226, '3. Install: Irrigation', NULL, '1qty.) zones of drip irrigation (1 qty.) zones of spray irrigation 4 station irrigation controller

3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (2015822, 43230226, '2. Demo: Till and amend planting area soil and grass area where concrete was broken', NULL, '2. Demo: Till and amend planting area soil and grass area where concrete was broken', NULL, NULL, NULL, NULL),
  (2015825, 43230226, '3. Install: Sod', NULL, 'approx 220 sq ft

3. Install: Sod', NULL, NULL, NULL, NULL),
  (2015830, 43230226, '3. Install: Plants', NULL, '(2 qty.) 15 gallon trellis bougainvillea (5 qty.) 5 gal premium plants tbd (15 qty.) 5 gal standard plants tbd (20 qty.) 1 gal standard shrubs (3 flats of plants tbd (48 small plants)

3. Install: Plants', NULL, NULL, NULL, NULL),
  (2089292, 1907063, 'Meet with Jan and get all data worked out on jobsite', NULL, NULL, '2016-11-05', '2016-12-06 19:00:05', 'Brian Godley', 'Brian Godley'),
  (2224215, 1731426, '(untitled)', NULL, 'Add irrigation into patio with 1/4 inch drip tube to pots.  Need to be layed out per Robert direction and before laying down patio stone.', NULL, '2016-12-30 11:01:21', 'Brandon Disney', 'Brian Godley'),
  (2238601, 1819483, 'Todo', NULL, NULL, NULL, '2019-08-05 11:09:30', 'Mohammed Rahman', NULL),
  (2311622, 1731426, 'Low voltage wire for lights', NULL, '14 gage landscape wire 1,000LF', '2016-01-02', '2017-01-12 15:51:30', 'Brandon Disney', 'Carter Godley'),
  (2355244, 1854669, 'Meet with Owners to discuss bid.', NULL, NULL, '2017-01-16', '2017-01-17 08:04:38', 'Brian Godley', 'Brian Godley'),
  (2360075, 1731426, 'Overlay pickup in Orange Already Ordered', 'highest', 'Need to pick up 7am tomorrow', '2017-01-13', '2017-01-16 16:01:25', 'Carter Godley', 'Carter Godley'),
  (2891028, 1850217, 'Plants replace patio tree in front with rose tree', NULL, NULL, NULL, '2019-08-05 11:09:30', 'Mohammed Rahman', NULL),
  (2891232, 1819483, '8'' benderboard in front & 6 succulent', NULL, NULL, NULL, '2019-08-05 11:09:30', 'Mohammed Rahman', NULL),
  (2891234, 1731427, 'Trash bags, 10 little John', NULL, NULL, NULL, '2019-08-05 11:09:30', 'Mohammed Rahman', NULL),
  (3177362, 43541680, 'Cancel the 2 missing heuchera/ fill in the holes with soil. Get 1 staked jasmine and plant by fence/light post.', NULL, 'Cancel the 2 missing heuchera/ fill in the holes with soil. Get 1 staked jasmine and plant by fence/light post.', NULL, NULL, NULL, '(.PM) Jorge Flores'),
  (3433122, 2469972, 'Pergola Measurements', NULL, 'Measure existing pergola to match; create scale drawing', '2017-07-26', '2017-07-26 16:32:07', 'Paul Young', 'Paul Young'),
  (3895471, 2248927, 'Andy Shipsides-', 'high', 'Need to send over bid.', '2017-10-13', '2019-05-13 09:39:39', 'Sean Martinez', NULL),
  (3895476, 2984120, 'August Lopez', NULL, 'Follow up with Ryan he finished the design and was working on bidding. Get update.', NULL, '2019-08-05 11:06:07', 'Mohammed Rahman', NULL),
  (4259834, 3269626, '(untitled)', NULL, 'Need to take paver samples over Thursday or Sat.', NULL, '2019-08-05 11:09:30', 'Mohammed Rahman', NULL),
  (4462995, 44493788, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (4462996, 44493788, '5. If the client is happy with the work ask for a review.', NULL, '5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (4462997, 44493788, 'Production Manager Review Prep Work for Completeness', NULL, 'Production Manager Review Prep Work for Completeness', NULL, NULL, NULL, NULL),
  (4462998, 44493788, 'Upload Before Photos and Videos', NULL, 'Upload Before Photos and Videos', NULL, NULL, NULL, NULL),
  (4462999, 44493788, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (4463000, 44493788, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (4464645, 44493788, '2. Demo: Remove 4” of existing concrete along two sides of property', NULL, 'approx. 461 square feet

2. Demo: Remove 4” of existing concrete along two sides of property', NULL, NULL, NULL, NULL),
  (4472890, 44493788, '2. Demo: Excavate for Pavers', NULL, '2. Demo: Excavate for Pavers', NULL, NULL, NULL, NULL),
  (4480160, 44493788, '3. Install: Base and leveling sand for pavers', NULL, '3. Install: Base and leveling sand for pavers', NULL, NULL, NULL, NULL),
  (4480329, 44493788, '3. Install: Pavers', NULL, 'approx. 461 square feet Pavers to be installed sloping away from house

3. Install: Pavers', NULL, NULL, NULL, NULL),
  (4480400, 44493788, '3. Install: Concrete restraints where pavers meets softscape area', NULL, '3. Install: Concrete restraints where pavers meets softscape area', NULL, NULL, NULL, NULL),
  (4480476, 44493788, '2. Demo: Remove pavers near front door', NULL, 'approx. 50 square feet

2. Demo: Remove pavers near front door', NULL, NULL, NULL, NULL),
  (4485331, 44493788, '2. Demo: Remove moldy pavers at side of front door.', NULL, '2. Demo: Remove moldy pavers at side of front door.', NULL, NULL, NULL, NULL),
  (4486306, 44493788, '3. Install: Replace moldy pavers with existing', NULL, '3. Install: Replace moldy pavers with existing', NULL, NULL, NULL, NULL),
  (4486616, 44560989, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (4486617, 44560989, '5. If the client is happy with the work ask for a review.', NULL, '5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (4486618, 44560989, 'Production Manager Review Prep Work for Completeness', NULL, 'Production Manager Review Prep Work for Completeness', NULL, NULL, NULL, NULL),
  (4486619, 44560989, 'Upload Before Photos and Videos', NULL, 'Upload Before Photos and Videos', NULL, NULL, NULL, NULL),
  (4486620, 44560989, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (4486621, 44560989, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (4486687, 44560989, '2. Demo: Remove blue fescue', NULL, '360 sf

2. Demo: Remove blue fescue', NULL, NULL, NULL, NULL),
  (4486716, 44560989, '3. Install: Import 1 yard of 50/50 soil for new grass', NULL, '3. Install: Import 1 yard of 50/50 soil for new grass', NULL, NULL, NULL, NULL),
  (4486722, 44560989, '3. Install: Sod', NULL, '360 square feet of St Augustine

3. Install: Sod', NULL, NULL, NULL, NULL),
  (4486745, 44560989, '3. Install: Adjust existing copperline irrigation and add misc coverage for sod if applicable', NULL, '3. Install: Adjust existing copperline irrigation and add misc coverage for sod if applicable', NULL, NULL, NULL, NULL),
  (5526630, 3345218, 'Ipe wood decks', NULL, 'Both ipe wood decks just got done ,finish today ..
-PENDING MASONRY ITEMS STILL TO FINISH 
-wrap post on center of big ipe deck with stone approx 2 days including  filling in a gap where ipe wood meets the stone by the bbq island area
-installation of appliances on outdoor kitchen  approx 5 hours 
-finish electricity aprox 4 hours
-small quarter round moulding on edge of both rear doors approx 1 hour  (pending on aproval from brian or george if to be a extra charge
-install coctail rail ipe wood 2" thick on small deck
-install aluminum post and tension railing wire by small deck', NULL, '2018-05-18 18:03:25', 'Salvador Villegas', 'Salvador Villegas'),
  (6576706, 3863384, 'Punch List', NULL, 'Hi Verva -
Here''s a summary of what we talked about for your records:
-  added walls are crooked along the property (back wall getting fixed already)
-  Retaining wall is crooked causing issues squaring off the deck.  How do we fix this without having to redo the wall?
-  2X2 concrete pads are not along a straight line and need to be reformed.  The gaps between some are 5 inches and others are 6 inches.  Need to be uniform all around.
-  footings of 1st level wall are above the grade line.  They need to be hidden below.
-  need credit amount for staining.  (Now only staining inside of the fence, plus deck plus steps and bench)
-  replacement of 2 panels on neighbors front fence
-  I thought over the fence situation and I''m 99% sure I''m not going to demo the old fence.  I am going to call the city on Monday and see if they can tell me straight out if I am ok.  If they are unsure then I will contact an attorney and find out what is legal or illegal.  If I am in the right for sure then I''m leaving that fence.

Thanks!', NULL, '2019-08-05 11:06:07', 'Mohammed Rahman', NULL),
  (6824279, 3964499, 'Electrical Ground', 'highest', 'This needs to be checked out by an electrician', '2018-08-22', '2018-08-29 17:15:04', 'Brian Godley', '(.PM) Jorge Flores,Brian Godley'),
  (6849966, 4077921, 'Testing', NULL, 'Testing', '2018-08-31', '2018-09-13 18:25:18', 'Maximino Sanchez', 'Maximino Sanchez'),
  (6880654, 4128999, '(untitled)', NULL, 'Fix fence', '2018-09-05', '2019-07-09 11:25:16', 'Sean Martinez', NULL),
  (6880897, 3165059, '(untitled)', NULL, 'Fix the chemical burnt patch.

Need 20 pieces. Need to check the type', '2018-09-06', '2019-07-09 11:25:09', 'Sean Martinez', NULL),
  (6881174, 3068163, '(untitled)', 'highest', 'Items to finish

Low Voltage wiring', '2018-09-10', '2018-10-30 11:42:12', 'Brian Godley', 'Luis Mendez,Maximino Sanchez'),
  (6881351, 3863384, '(untitled)', NULL, 'Items to finsish

Do decking', NULL, '2019-08-05 11:06:07', 'Mohammed Rahman', NULL),
  (6907275, 4400695, '(untitled)', NULL, 'Mohammed
Please upload the contract addendum in the red file.  It is the one with prices.  I uploaded a CREW addendum that doesn''t have pricing under measurements Folder.', NULL, '2018-09-06 13:29:43', 'Mohammed Rahman', NULL),
  (6973830, 3964499, 'Closing out Katie Miles', NULL, 'JORGE
This job needs an update on payments made. Last I heard, there was a bounce on the final payment. need to collect on stucco CO

BRIAN
Change order for wall that was stucco - this was not in contract. need to bill this.

verify payments and collect any balance (Jorge)', NULL, '2019-08-05 11:06:07', 'Mohammed Rahman', '(.PM) Jorge Flores,(HR) Mo Solomon,Brian Godley'),
  (6976912, 2984120, 'Closing out August Lopez', NULL, 'reconcile pending balance to match invoices (Mo)', NULL, '2019-08-05 11:06:07', 'Mohammed Rahman', '(.PM) Jorge Flores,(HR) Mo Solomon,Sean Martinez'),
  (6977163, 2152123, 'Closing out Courtney Franz', NULL, 'schedule repair on electrical', NULL, '2019-08-05 11:06:07', 'Mohammed Rahman', 'Brian Godley'),
  (6977175, 2469972, 'Closing out David Garcia', NULL, 'COLLECT : $16,372.00

collect final payment', NULL, '2019-08-05 11:06:07', 'Mohammed Rahman', 'Brian Godley'),
  (6977241, 4238438, 'Closing out Heidi Ethridge', NULL, 'COLLECT : $5,840.00

collect final pay on heidi', NULL, '2019-08-05 11:06:07', 'Mohammed Rahman', '(.PM) Jorge Flores,(HR) Mo Solomon'),
  (6977407, 3676700, 'Closing Jacki Santana', NULL, 'Schedule sprinkler repair', NULL, '2019-02-28 06:51:07', 'Sean Martinez', 'Sean Martinez'),
  (6979564, 4383200, '(untitled)', NULL, 'need a letter of authorization to get permits in glendale for the demerjian job

need signed letter from brian

also need (2) checks  so i can pay for permits

Ryan Kleefisch', '2018-09-13', '2018-09-14 10:40:48', 'Sean Martinez', '(HR) Mo Solomon,Brian Godley,Sean Martinez'),
  (6979707, 3165059, 'Closing out Rick Harrison', NULL, 'Collect final check', NULL, '2018-11-21 10:25:01', 'Mohammed Rahman', '(.PM) Jorge Flores'),
  (6979820, 4264636, 'Closing out Seta Chutjian', NULL, 'Collect 2,300', NULL, '2019-08-05 11:06:07', 'Mohammed Rahman', '(.PM) Jorge Flores'),
  (6979839, 4097170, 'check with edmilson to review total laid square feet', NULL, NULL, NULL, '2019-08-05 11:06:07', 'Mohammed Rahman', 'Brian Godley,Verva Gerse'),
  (6979847, 4288757, 'Closing out Sue Copp', NULL, 'collect final payment', NULL, '2019-08-05 11:06:07', 'Mohammed Rahman', '(.PM) Jorge Flores'),
  (6984717, 3863384, 'max to do list', 'highest', '1)	Job Cleanup, temp fence work		(This week)
2)	Stucco Work on walls 				(This week)
3)	Fabric 						(This week)
4)	Gravel 						(This week)
5)	DG 						(This week)
6)	Electrical 					(This week)
7)	Backfill trench (providing inspection in time) (This week)

8)	Low Voltage lighting 				(next week)
9)	Decking 					(next week, providing material is ready)
10)	Fencing  					(next week, providing material is ready)
11)	Irrigation 					(next week)
12)	Planting. 					(next week)

13)	Turf at top					( two days after all else done)', NULL, '2019-08-05 11:06:07', 'Mohammed Rahman', 'Luis Mendez,Maximino Sanchez'),
  (6986629, 4327080, 'Closing out Katherine Karapetian', NULL, 'Please collect 375.00

Invoice in your comm box', NULL, '2019-08-05 11:06:07', 'Mohammed Rahman', '(.PM) Jorge Flores'),
  (6993790, 3950271, 'be aware', NULL, 'scuppers being delivered to gus bridis address between 19th-24th', NULL, '2019-08-05 11:06:07', 'Mohammed Rahman', 'Salvador Villegas,Verva Gerse'),
  (6994158, 3950271, 'gus bridi wants a phone call regarding', 'highest', 'call gus to speak about this issue in contract please thanks', NULL, '2019-08-05 11:06:07', 'Mohammed Rahman', '(.PM) Jorge Flores,Verva Gerse'),
  (6996286, 4077921, 'max', 'highest', 'can you take care of this today if not early am ? let me know', NULL, '2018-09-13 07:29:38', 'Maximino Sanchez', 'Luis Mendez,Maximino Sanchez'),
  (7002595, 3863384, 'wood 4 jennifer', 'highest', 'grab samples or not???', NULL, '2018-10-04 14:52:50', 'Brian Godley', 'Brian Godley'),
  (7004052, 4077921, '(untitled)', NULL, 'let me know so can let customer know', NULL, '2019-08-05 11:06:07', 'Mohammed Rahman', 'Maximino Sanchez'),
  (7011603, 4312960, '(untitled)', 'high', 'Need Credit Card Authorization completed and sent over to POOL ENGINEERING  , they are working on the engineering and should be done next week ..or getting to it..  from what i understand its on brians desk', '2018-09-14', '2018-09-15 08:38:45', 'Brian Godley', 'Brian Godley'),
  (7560781, 3950271, 'nacho,Oscar', 'high', '-- install fountain light 
-install irrigation timer inside garage
-install low voltage lighting timer inside garage
--spread gravel on sides proportionally and hide all weed stop cloth
--fill in around A/C area with gravel equal on both units 
--install 4 green atrium  drain caps and 2 flat green drain caps
Also pointed out switching path lights but thats already taking care by miguel', '2018-10-26', '2019-08-05 11:06:07', 'Mohammed Rahman', 'Ignacio “Nacho” Iniguez,Oscar Martinez'),
  (7748772, 2018851, 'Please follow up on this', NULL, NULL, NULL, '2018-11-21 17:05:11', 'Mohammed Rahman', '(.PM) Jorge Flores'),
  (7910411, 4706995, 'collect payment $5,412.00', 'highest', '$5,412.00', '2018-11-20', '2018-11-21 10:24:42', 'Mohammed Rahman', '(.PM) Jorge Flores'),
  (9648627, 5125010, '(untitled)', NULL, 'If you call a gate company they can handle this as well.  They deal with safety loops all the time.', NULL, '2019-08-05 11:06:07', 'Mohammed Rahman', NULL),
  (10427959, 5100240, 'Adjust water', NULL, 'Adjust water', NULL, '2019-05-16 11:56:36', 'Sean Martinez', '(.PM) Jorge Flores,Sean Martinez,Verva Gerse'),
  (10442202, 5324369, 'Warranty to do', 'highest', 'watering issues 
plants wilting

Fix irrigation', NULL, NULL, NULL, '(.PM) Jorge Flores'),
  (10488813, 4722142, 'Completed to do list', 'high', 'Bullnose issues 
Watter hammer issue
Cap stub ups on side 
pergola build

Build pergola homeowner provided', '2019-05-18', '2019-05-16 11:56:31', 'Sean Martinez', '(.PM) Jorge Flores,Shane Sand'),
  (10490536, 5454106, 'Warranty to do list', 'high', 'Stabilize piece of concrete near garage

Stabilize piece of concrete near garage', '2019-05-18', '2019-05-16 13:37:18', 'Sean Martinez', '(.PM) Jorge Flores'),
  (10491504, 5425099, 'Completed to do list', 'high', 'one paver has cracked needs replacing 
One plant needs to be moved to another location

Move plant to other end of planter', '2019-05-18', '2019-05-20 13:00:24', 'Patricia Zdanowski', '(.PM) Jorge Flores,Patricia Zdanowski'),
  (10511668, 5523763, 'Completed to do list', 'high', 'plants wrong color

Plant 10 1 gallon coreopsis red pink or white', '2019-05-18', '2019-05-16 11:55:45', 'Sean Martinez', '(.PM) Jorge Flores,Dave Cunningham'),
  (10542897, 5408930, 'Completed to do list', 'highest', '3 1 gallon plants @ office
remove forms 
install grass around concrete 
check timer

install grass around concrete', '2019-05-16', '2019-05-16 11:55:26', 'Sean Martinez', '(.PM) Jorge Flores,Ignacio “Nacho” Iniguez,Kyle Ellis,Oscar Martinez'),
  (10543053, 4602365, 'Completed to do list', 'highest', 'fireplace curtains

Install new fire place curtains', '2019-05-15', '2019-05-16 11:55:13', 'Sean Martinez', '(.PM) Jorge Flores,Fidel (Shaka) Calixto,Tamara Paterson'),
  (10605983, 5308874, '(untitled)', NULL, 'Material Selection

Per contract addendum - 10 lights - a combination of uplights and path lights, client has Vista brochure', NULL, '2019-07-09 19:09:37', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (10605989, 5472321, '(untitled)', 'high', 'Material Selection

Stucco color for Fire Pit', '2019-05-20', '2019-05-26 13:53:23', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (10645093, 2248927, 'Material Selection', 'high', '5/21 Brian and Ryan currently handling material selections on this job.

Pergola - Due to specific High Fire Zoning regulations Brian will handle', NULL, '2019-08-05 11:09:30', 'Mohammed Rahman', 'Brian Godley,Marybeth Jacobsen'),
  (10648813, 5555986, 'Material Selection', NULL, 'Concrete Stain Color', NULL, '2019-06-17 13:26:24', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (10649931, 5493354, 'Material Selection', NULL, 'Plant Selection - MB sent minor changes to Ryan', NULL, '2019-08-15 13:14:39', 'Marybeth Jacobsen', 'Marybeth Jacobsen,Sean Martinez'),
  (10650803, 5285676, 'Material Selection', NULL, 'Tree Selection - Ryan informed me he will handle.', NULL, '2019-06-11 15:17:57', 'Ryan Kleefisch', 'Marybeth Jacobsen,Ryan Kleefisch'),
  (10651427, 5093944, 'Material Selection', NULL, 'Addendum is missing a page

Plant Selection', NULL, '2019-08-05 11:06:07', 'Mohammed Rahman', 'Marybeth Jacobsen'),
  (10651445, 5512086, 'Material Selection', NULL, 'Pea Gravel of Sand in between', NULL, '2019-08-22 22:35:31', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (10653040, 5468767, 'Material Selection', NULL, 'Plant selection', NULL, '2019-08-07 11:44:30', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (10664205, 5408930, 'Warranty to do list', 'highest', '2 1 gallon replacement

Replace 2 1 gallon plants', '2019-05-24', '2021-08-19 14:02:16', 'Jorge Flores', '(.PM) Jorge Flores,Kyle Ellis'),
  (10708202, 5570702, 'Material Selection', NULL, 'Sales Rep: Verva

Bring 3 Samples- 3-4 stones each Angelus Holland: Solid Charcoal,Solid Grey, Grey Charcoal Blend for Client Decision', NULL, '2019-05-31 13:13:41', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (10712055, 5049684, 'Material Selection', 'highest', 'Light Selections: Path, Uplight, Step', NULL, '2019-07-09 11:25:48', 'Sean Martinez', 'Brian Godley,Marybeth Jacobsen'),
  (10829725, 4722142, 'warranty to do list', 'highest', 'check plants 
check irrigation

check irrigation', NULL, '2019-08-05 11:06:07', 'Mohammed Rahman', '(.PM) Jorge Flores,Shane Sand'),
  (10830311, 5148642, 'Completed to do list', 'highest', 'theres a punch list in  daily logs

install pacific sod medallion plus 150 sq ft', NULL, '2019-08-05 11:06:07', 'Mohammed Rahman', '(.PM) Jorge Flores,Marius & Indra Anelauskas'),
  (10834246, 5100240, 'To do list', 'highest', 'plant count 
benderboard footage

install 120 emmitters', '2019-06-01', '2019-08-05 11:09:30', 'Mohammed Rahman', '(.PM) Jorge Flores,Maximino Sanchez,Verva Gerse'),
  (10940512, 5633891, 'Material Selection', NULL, 'Paver Selection', NULL, '2019-06-12 13:14:41', 'Marybeth Jacobsen', 'Marybeth Jacobsen,Verva Gerse'),
  (10983005, 5687197, '(untitled)', NULL, 'Hi Ritch,
 
I will see what we can do to reduce the cost.  Possibly get some good trees etc on a little better deal.
 
Ok I have a new person who handles all our plant and material choice selections.  Here name is Marybeth and I will put her in touch with you.
 
The job should take about 2-3 days.
 
Best.
Brian
 
 
 
From: Ritch Wells 
Date: Friday, June 7, 2019 at 1:36 PM
To: ''Brian Godley'' 
Subject: Estimate
 
Hi Brian:  Sorry it took so long to get back to you.  We’re ready to move forward with the backyard project.  Estimate was a little high so if you can cut any corners would be appreciated.  Also, I will leave it up to you and your guys on the tree in the front yard.  I said Japanese maple but if you think something else works there please let me know.  Please bring by the turf examples when time permits.  How long do you estimate it will take to complete the entire project? 
 
Thanks.
Ritch

Tangerine tree for back. Recommeded Ojai Pixie', NULL, '2019-07-09 19:06:44', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (10985927, 5642283, 'Material Selection', NULL, 'Check on Electrical Switch', NULL, '2019-07-09 19:04:22', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (11062882, 4381266, 'Material Selection', NULL, 'Plants for raised beds

Material Selection Plants for raises beds', NULL, '2019-07-09 19:09:20', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (11105853, 5632929, '(untitled)', NULL, 'Material Selection

Pavers - Angelus - Courtyard - Tuscan', NULL, '2019-06-17 13:32:54', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (11106096, 5686190, '(untitled)', NULL, 'Material Selections

Pavers - Bring samples to Client week of 6/17', NULL, '2019-07-09 19:04:42', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (11106503, 5704019, 'Material Selection', NULL, 'Stucco color for wall', NULL, '2019-07-09 19:05:01', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (11297590, 5642283, 'Concrete delivery', NULL, '64 bags of concrete mix.', NULL, '2019-06-27 14:32:34', 'Rick Hames', 'Rick Hames'),
  (11351099, 5642283, 'Need to order gas ring 32in round', NULL, NULL, NULL, '2019-07-08 09:49:21', 'Rick Hames', 'Rick Hames'),
  (11377072, 5642283, '(untitled)', NULL, 'Gas ring and 110 wires for lighting and remote. Pipe has been installed', NULL, '2019-08-31 18:13:29', 'Marybeth Jacobsen', 'Rick Hames'),
  (11377122, 5642283, '(untitled)', NULL, 'There is still one more load of concrete in the street', NULL, '2019-07-08 09:49:26', 'Rick Hames', 'Rick Hames'),
  (11382002, 5642283, '(untitled)', NULL, 'Would like to use the truck and trailer tomorrow to pick up the last of the concrete debris', NULL, '2019-08-05 11:10:05', 'Mohammed Rahman', 'Rick Hames'),
  (11423611, 5642283, 'Installing steel rebar on Saturday', NULL, NULL, NULL, '2019-07-08 07:01:26', 'Rick Hames', 'Rick Hames'),
  (11435256, 44645809, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (11435257, 44645809, '1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (11435258, 44645809, 'Project Supervisor to Familiarize with Job Scope, Plan, To Dos and Hours Assigned.', NULL, 'Project Supervisor to Familiarize with Job Scope, Plan, To Dos and Hours Assigned.', NULL, NULL, NULL, NULL),
  (11435259, 44645809, 'Upload Contract', NULL, 'Upload Contract', NULL, NULL, NULL, NULL),
  (11435260, 44645809, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (11435261, 44645809, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (11435304, 44645809, '2. Demo: Drain pool and protect plaster', NULL, '2. Demo: Drain pool and protect plaster', NULL, NULL, NULL, NULL),
  (11435532, 44645809, '2. Demo: Saw Cut under Coping', NULL, '2. Demo: Saw Cut under Coping', NULL, NULL, NULL, NULL),
  (11435535, 44645809, '2. Demo: Remove pool & fountain coping', NULL, '2. Demo: Remove pool & fountain coping', NULL, NULL, NULL, NULL),
  (11435561, 44645809, '3. Install: Form for new coping', NULL, '3. Install: Form for new coping', NULL, NULL, NULL, NULL),
  (11435563, 44645809, '3.  Install: Fiberglass rebar to prevent corrosion.', NULL, '3.  Install: Fiberglass rebar to prevent corrosion.', NULL, NULL, NULL, NULL),
  (11437185, 44645809, '3. Install: Poured in place pool coping', NULL, 'sand finish to approximate color/texture of existing  concrete bands

3. Install: Poured in place pool coping', NULL, NULL, NULL, NULL),
  (11438171, 44645809, '3. Install: Seal all new coping', NULL, '3. Install: Seal all new coping', NULL, NULL, NULL, NULL),
  (11442828, 44571866, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (11442829, 44571866, '7. Take final photos for our website and upload to Builder Trend', NULL, '7. Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (11442830, 44571866, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, 'Production Manager to Review Hours Assigned to the Job and Compare to Scope', NULL, NULL, NULL, NULL),
  (11442831, 44571866, 'Enter in Any To Dos for Outstanding Issues (need selections, potential plan changes etc.)', NULL, 'Enter in Any To Dos for Outstanding Issues (need selections, potential plan changes etc.)', NULL, NULL, NULL, NULL),
  (11442832, 44571866, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (11442833, 44571866, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez');

DO $$
DECLARE
  rec          RECORD;
  v_job_id     UUID;
  v_emp_id     UUID;
  v_clean_name TEXT;
  v_imported   INT := 0;
  v_dup        INT := 0;
  v_no_job     INT := 0;
BEGIN
  FOR rec IN SELECT * FROM _todo_staging LOOP
    -- Idempotency check
    IF EXISTS (SELECT 1 FROM job_tasks WHERE bt_todo_id = rec.bt_todo_id) THEN
      v_dup := v_dup + 1; CONTINUE;
    END IF;

    -- Resolve job by bt_job_id
    SELECT id INTO v_job_id FROM jobs WHERE bt_job_id = rec.bt_job_id LIMIT 1;
    IF v_job_id IS NULL THEN v_no_job := v_no_job + 1; CONTINUE; END IF;

    -- Best-effort assignee match: strip "(.PM) " / "(HR) " / etc. prefixes,
    -- then case-insensitive lookup on first_name + last_name.
    v_emp_id := NULL;
    IF rec.assignee_name IS NOT NULL AND rec.assignee_name <> '' THEN
      v_clean_name := TRIM(REGEXP_REPLACE(rec.assignee_name, '^\([^)]*\)\s*', ''));
      SELECT id INTO v_emp_id FROM employees
       WHERE status = 'active'
         AND LOWER(TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,''))) = LOWER(v_clean_name)
       LIMIT 1;
    END IF;

    INSERT INTO job_tasks (
      job_id, task_name, status, sort_order,
      bt_todo_id, priority, notes, due_date,
      completed_at, completed_by_name,
      assignee_id, assignee_name
    ) VALUES (
      v_job_id,
      rec.title,
      CASE WHEN rec.completed_at IS NOT NULL THEN 'completed' ELSE 'pending' END,
      0,
      rec.bt_todo_id,
      rec.priority,
      rec.notes,
      rec.due_date,
      rec.completed_at,
      NULLIF(rec.completed_by, ''),
      v_emp_id,
      NULLIF(rec.assignee_name, '')
    );

    v_imported := v_imported + 1;
  END LOOP;

  RAISE NOTICE 'Batch 1 of 5 — Imported: %, Already imported (skipped): %, No matching job (skipped): %',
    v_imported, v_dup, v_no_job;
END $$;

COMMIT;
