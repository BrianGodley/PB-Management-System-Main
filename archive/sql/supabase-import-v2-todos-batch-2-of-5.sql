-- ============================================================
-- v2 BT todos → PBS job_tasks — Batch 2 of 5
-- 1,707 todos (rows 1708-3414 of 8,535)
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
  (11443217, 44571866, '2. Demo: Clean stamped concrete surfaces', NULL, '2. Demo: Clean stamped concrete surfaces', NULL, NULL, NULL, NULL),
  (11443253, 44571866, '3. Install: Create sample color for Approval', NULL, '3. Install: Create sample color for Approval', NULL, NULL, NULL, NULL),
  (11443543, 44571866, '3. Install: Apply color coat to all concrete surfaces in rear yard', NULL, 'including steps, approx 983 SF

3. Install: Apply color coat to all concrete surfaces in rear yard', NULL, NULL, NULL, NULL),
  (11443545, 44571866, '3. Install: Apply color accents/shading', NULL, '3. Install: Apply color accents/shading', NULL, NULL, NULL, NULL),
  (11443725, 44571866, '3. Install: Seal concrete', NULL, 'Includes ‘Shark Grip’ non-stick additive

3. Install: Seal concrete', NULL, NULL, NULL, NULL),
  (11445937, 5642283, 'Inside of forms need sprayed with form oil.', NULL, NULL, NULL, '2019-08-07 08:16:13', 'Sean Martinez', 'Rick Hames'),
  (11466848, 5049684, '(untitled)', NULL, 'Job Completion

Polysand', NULL, NULL, NULL, '(.PM) Jorge Flores'),
  (11466878, 44571866, '2. Demo: Remove 3'' Block at end of wall', NULL, '2. Demo: Remove 3'' Block at end of wall', NULL, NULL, NULL, NULL),
  (11469200, 5308874, 'Completed to do list', 'highest', '4.) There are areas between pavers where the sand did not adhere, resulting in gaps. We were told these gaps would be filled in a subsequent application after the power wash.', NULL, '2019-08-05 11:06:07', 'Mohammed Rahman', '(.PM) Jorge Flores,Tonia and Scott Ray 2'),
  (11470599, 44571866, '3. Install: Rebuild section of block', NULL, '3. Install: Rebuild section of block', NULL, NULL, NULL, NULL),
  (11470605, 44571866, '3. Install: Apply stucco to repaired section of wall', NULL, '3. Install: Apply stucco to repaired section of wall', NULL, NULL, NULL, NULL),
  (11470613, 44571866, '3. Install: Prepare wall for Stucco', NULL, '3. Install: Prepare wall for Stucco', NULL, NULL, NULL, NULL),
  (11470617, 44571866, '3. Install: Skim entire wall with new stucco coat', NULL, '3. Install: Skim entire wall with new stucco coat', NULL, NULL, NULL, NULL),
  (11471241, 44571866, '3. Install: Level concrete at catch basin', NULL, '3. Install: Level concrete at catch basin', NULL, NULL, NULL, NULL),
  (11471270, 44571866, '2. Demo: Sand existing deck', NULL, 'approx 265sf

2. Demo: Sand existing deck', NULL, NULL, NULL, NULL),
  (11471281, 44571866, '3. Install: Ensure all decking is solidly attached', NULL, '3. Install: Ensure all decking is solidly attached', NULL, NULL, NULL, NULL),
  (11496122, 5049684, 'Meeting at office', NULL, 'Max George Shane and myself', NULL, '2019-07-22 13:39:23', 'Marybeth Jacobsen', 'Rick Hames'),
  (11586242, 5555986, 'Job Completion', 'highest', '•	Run additional drip lines to the pots sitting on fireplace on both sides. Not necessary to run drip lines to pots on ground in front of fireplace.', NULL, '2019-08-29 15:40:13', 'Sean Martinez', '(.PM) Jorge Flores,Stephanie Soto'),
  (11586276, 2248927, 'Job Completion', 'highest', '3- need to remove chains and ropes from trees', NULL, '2019-10-21 10:42:49', 'Brian Godley', '(.PM) Jorge Flores,Andy Shipsides'),
  (11606159, 5633890, 'Material Selection', NULL, 'Confirmed Remarkable Gardens Plant Selections - OK uploaded Excel Plant List', NULL, '2019-08-07 11:46:12', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (11642421, 5686048, 'Material Selection', NULL, 'Lighting - 5 up lights, 7 path lights  Vista Up lights – Qty 5 – Black 5006
Vista Path Lights – Qty 7 – Black 6509 (I confirmed they are the same price as 6507- no upcharge)', NULL, '2019-08-05 13:15:34', 'Marybeth Jacobsen', 'Marybeth Jacobsen,Verva Gerse'),
  (11664347, 5344445, 'Material Selection', NULL, 'Planting selections', NULL, '2019-10-08 13:08:18', 'Marybeth Jacobsen', 'Marybeth Jacobsen,SUB - Remarkable Gardens,Verva Gerse'),
  (11670204, 4312960, '(untitled)', NULL, 'Select stone/gravel  with Rafi monday', '2019-07-22', '2019-07-23 07:25:38', 'Rafi Demirjian', 'Rafi Emdemirjian,Ryan Kleefisch,Sean Martinez'),
  (11670206, 4312960, '(untitled)', NULL, 'complete pool equipment', NULL, '2019-08-07 08:13:46', 'Brian Godley', 'Ryan Kleefisch,Sean Martinez'),
  (11686441, 5285676, '(untitled)', NULL, 'find alternative slip on covers or solution for hay bales', '2019-07-24', '2019-07-23 16:28:12', 'Ryan Kleefisch', 'Ryan Kleefisch,Sean Martinez'),
  (11689034, 5884691, 'Material Selection', NULL, '1.	Samples to be dropped off are Angelus Courtyard Dark Grey-Copper-Charcoal, and Belgard Catalina Grana Victorian', NULL, '2019-08-13 18:09:05', 'Jorge Flores', NULL),
  (11690027, 5793854, 'Material Selection', NULL, 'Planting selection', NULL, '2019-08-07 11:47:26', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (11692480, 5049684, '(untitled)', NULL, 'To Do Items

Address Plaque -. Delivery - 8/1', NULL, '2019-08-07 11:41:27', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (11692613, 2248927, '(untitled)', NULL, 'Plants/Trellis

MB looking for Dwarf Banana plants - Musa ''Ice Cream'' or ''Kavendish''  Calling around nurseries who are looking. (Dave Sneider - Moon Valley)', NULL, '2019-08-07 11:40:24', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (11697323, 44571866, '3. Install: Apply 2 coats ‘Behr’ exterior fence & deck stain or equal', NULL, '3. Install: Apply 2 coats ‘Behr’ exterior fence & deck stain or equal', NULL, NULL, NULL, NULL),
  (11704148, 5704019, '(untitled)', NULL, 'Material Selection

Pavers - Grey-Moss-Charcoal', NULL, '2019-07-23 07:36:58', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (11717189, 5344445, '(untitled)', NULL, 'Verva or Marybeth to drop off paver samples:
Belgard Catalina Grana in BELLA and TOSCANA

small and large', NULL, '2019-08-07 11:43:46', 'Marybeth Jacobsen', 'Marybeth Jacobsen,Verva Gerse'),
  (11718649, 3124950, 'Material Selection', NULL, 'Show samples of lighting. Client approved Lighting Changes. 8/4 - Color confirmed Architectural Bronze   8/2 Color to be confirmed.         Vista - 8  - Path Lights #6540
Vista - 4 - Small Spots #5014i     Vista - 2 - Step Lights - 4246', NULL, '2019-08-31 18:19:40', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (11719058, 5704028, 'Material Selection', NULL, 'Final Paver order choices:
Belgard Catalina Grana large sizes Bella
Border 6x9 Catalina Grana Bella
Steps:
Belgard belaire wall cap Toscana 
Order extra might need more steps
40 caps and 
28 end caps.', NULL, '2019-08-31 18:21:10', 'Marybeth Jacobsen', 'Verva Gerse'),
  (11746747, 44571866, '3. Install: Prep and Prime railing', NULL, '3. Install: Prep and Prime railing', NULL, NULL, NULL, NULL),
  (11762661, 5835014, 'Material Selection', NULL, 'Material Selection

Pavers have been confirmed, good to go.  Paver order: Field: Angelus Courtyard in Sandstone Mocha 4 size palette.  For border: Angelus Courtyard in Sandstone Mocha 6x9 Soldier Course.', NULL, '2019-07-25 18:53:04', 'Verva Gerse', 'Verva Gerse'),
  (11762663, 5878403, 'Material Selection', NULL, 'Field:
2,400 Sf
Angelus Courtyard 
Cream Terracotta Brown
Border
500 SF
Angelua Courtyard 6X9
Cream Terracotta Brown', NULL, '2019-08-20 14:21:52', 'Marybeth Jacobsen', NULL),
  (11765877, 44571866, '3. Install: Paint Railing/ 4x4 attached to lower wall', NULL, '3. Install: Paint Railing/ 4x4 attached to lower wall', NULL, NULL, NULL, NULL),
  (11768106, 5835014, 'Material Selection', NULL, 'Pavers have been confirmed, good to go.  Paver order: Field: Angelus Courtyard in Sandstone Mocha 4 size palette.  For border: Angelus Courtyard in Sandstone Mocha 6x9 Soldier Course.', NULL, '2019-08-26 14:14:07', 'Verva Gerse', 'Verva Gerse'),
  (11768459, 5916807, 'Material Selection', NULL, 'Please see daily logs. 
Field:
Belgard Catalina Grana large sizes in Bella
Border:
Belgard Catalina Grana 6x9 soldiers course 
There will be curves.

:
Belgard Catalina Grana Bella both small 50% and large sizes 50%,
Border: Belgard Catalina Grana Bell 6X9', NULL, '2019-07-26 07:51:00', 'Verva Gerse', 'Verva Gerse'),
  (11768843, 5633890, 'Plant Selections', NULL, 'Plant Selections

Planting and Lighting Plan - Updated plan with client 7/25. Remarkable revised 7/28 per email.', NULL, '2019-08-21 22:11:39', 'Marybeth Jacobsen', NULL),
  (11770126, 44571866, '3. Install: Paint fascia boards to match existing color', NULL, '3. Install: Paint fascia boards to match existing color', NULL, NULL, NULL, NULL),
  (11786897, 44612532, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (11786898, 44612532, '4. Pick up yard sign unless ok by client to leave longer.', NULL, '4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (11786899, 44612532, 'Production Manager Familiarize with  Job Scope, Plan and Tasks', NULL, 'Production Manager Familiarize with  Job Scope, Plan and Tasks', NULL, NULL, NULL, NULL),
  (11786900, 44612532, 'Upload Any Needed Info on Materials Selections', NULL, 'Upload Any Needed Info on Materials Selections', NULL, NULL, NULL, NULL),
  (11786901, 44612532, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (11786902, 44612532, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (11786948, 44612532, '2. Demo: Remove existing driveway', NULL, 'approx. 670 square feet

2. Demo: Remove existing driveway', NULL, NULL, NULL, NULL),
  (11787651, 44612532, '2.  Demo: Remove 4” of soil/gravel in rear yard', NULL, 'over 900 square feet

2.  Demo: Remove 4” of soil/gravel in rear yard', NULL, NULL, NULL, NULL),
  (11792902, 44612532, '2. Demo: Trench for Drainage', NULL, '80 linear feet of 4” SDR35 drainpipe

2. Demo: Trench for Drainage', NULL, NULL, NULL, NULL),
  (11792906, 44612532, '3. Install: Run 80 linear feet of 4” SDR35 drainpipe', NULL, '3. Install: Run 80 linear feet of 4” SDR35 drainpipe', NULL, NULL, NULL, NULL),
  (11792923, 44612532, '3. Install: (8 qty.) area drain outlets', NULL, '3. Install: (8 qty.) area drain outlets', NULL, NULL, NULL, NULL),
  (11793960, 44612532, '3. Install: Road Base for Paving', NULL, '3. Install: Road Base for Paving', NULL, NULL, NULL, NULL),
  (11795888, 44612532, '3. Install: Rebar for Concrete slab', NULL, '3. Install: Rebar for Concrete slab', NULL, NULL, NULL, NULL),
  (11799367, 5916807, 'Material Selection', NULL, 'Belgard Catalina Grana Bella both small 50% and large sizes 50%,
Border: Belgard Catalina Grana Bell 6X9', NULL, '2019-07-29 12:34:53', 'Verva Gerse', 'Verva Gerse'),
  (11804716, 44612532, '3. Install: Concrete Slab', NULL, '3. Install: Concrete Slab', NULL, NULL, NULL, NULL),
  (11807739, 44612532, '3. Install: porcelain pavers', NULL, '3. Install: porcelain pavers', NULL, NULL, NULL, NULL),
  (11807745, 44612532, '3. Install: Flagstone steppers', NULL, '60 square feet of Pennsylvania Bluestone

3. Install: Flagstone steppers', NULL, NULL, NULL, NULL),
  (11808538, 44612532, '3. Install: Weed barrier', NULL, '3. Install: Weed barrier', NULL, NULL, NULL, NULL),
  (11808544, 44612532, '3. Install: Del Rio gravel as Mulch', NULL, '510 square feet

3. Install: Del Rio gravel as Mulch', NULL, NULL, NULL, NULL),
  (11808553, 44612532, '3. Install:  Standard bark mulch', NULL, '100 sqft

3. Install:  Standard bark mulch', NULL, NULL, NULL, NULL),
  (11808567, 44612532, '2. Demo: Till and Amend sod area', NULL, '2. Demo: Till and Amend sod area', NULL, NULL, NULL, NULL),
  (11809247, 44612532, '3. Install: Sod', NULL, '3. Install: Sod', NULL, NULL, NULL, NULL),
  (11809251, 44612532, '3. Install: metal edging', NULL, 'approx. 80 linear feet

3. Install: metal edging', NULL, NULL, NULL, NULL),
  (11809270, 44612532, '3. Install: Owner supplied plants', NULL, '(1) 48’ Box Tree (1) 36” Box Tree (8) 24” Box Trees (6) 15 Gal Shrubs (89) 5 Gal Shrubs

3. Install: Owner supplied plants', NULL, NULL, NULL, NULL),
  (11809300, 44612532, '3. Install: Irrigation', NULL, '(3 qty.) zones of drip irrigation  (1 qty.) zone of spray irrigation for sod  Rachio brand irrigation timer

3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (11813037, 44612532, '3. Install: Owner-supplied Lighting', NULL, '(1 qty.) 200-watt transformer (4 qty.) LED path lights (5 qty.) LED up lights (42 LF) LED bistro lighting

3. Install: Owner-supplied Lighting', NULL, NULL, NULL, NULL),
  (11813054, 44612532, '3. Install: Set Owner supplied post in concrete footing for bistro lighting', NULL, '3. Install: Set Owner supplied post in concrete footing for bistro lighting', NULL, NULL, NULL, NULL),
  (11813141, 44612532, '3. Install: Owner-provided steel cables for wall-mounted vines', NULL, 'Anchor into stucco walls

3. Install: Owner-provided steel cables for wall-mounted vines', NULL, NULL, NULL, NULL),
  (11813220, 43633156, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (11813221, 43633156, '2. Pick up final payment unless there are outstanding items for completion.', NULL, '2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (11813222, 43633156, 'Job Walk Completed', NULL, 'Job Walk Completed', NULL, NULL, NULL, NULL),
  (11813223, 43633156, 'Upload Any HOA Info', NULL, 'Upload Any HOA Info', NULL, NULL, NULL, NULL),
  (11813224, 43633156, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (11813225, 43633156, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (11813312, 43633156, '3. Install: (62 qty.) Bluestone flagstone steppers on grade', NULL, 'sand-set

3. Install: (62 qty.) Bluestone flagstone steppers on grade', NULL, NULL, NULL, NULL),
  (11813472, 43633156, '2. Demo: 4” of existing concrete', NULL, 'approx. 700 square feet

2. Demo: 4” of existing concrete', NULL, NULL, NULL, NULL),
  (11813501, 43633156, '2. Demo: Rremove existing brick pathway in front yard', NULL, 'approx. 65 square feet

2. Demo: Rremove existing brick pathway in front yard', NULL, NULL, NULL, NULL),
  (11813541, 43633156, '2. Demo: Remove pittosporum tree', NULL, '2. Demo: Remove pittosporum tree', NULL, NULL, NULL, NULL),
  (11813549, 43633156, '3. Demo: Remove 3 privets in front yard', NULL, '3. Demo: Remove 3 privets in front yard', NULL, NULL, NULL, NULL),
  (11817730, 43633156, '3. Install: Irrigation', NULL, '(6 qty.) anti-siphon drip irrigation valves  new Rachio brand irrigation controller

3. Install: Irrigation', NULL, NULL, NULL, NULL),
  (11817742, 43633156, '3. Install: Plants', NULL, '10 flats of dymondia between flagstone joints around firepit area 2 flats of plants tbd under front window (3 qty.) 15 gal fruit trees (5 qty.) 15 gal fruit trellis jasmine (10 qty.) 15 gal standard shrubs (101 qty.) 5 gal standard shrubs (16 qty.) 1 gal standard shrubs

3. Install: Plants', NULL, NULL, NULL, NULL),
  (11817752, 43633156, '2. Demo: Excavate gravel areas to 3” below finish grade', NULL, '2. Demo: Excavate gravel areas to 3” below finish grade', NULL, NULL, NULL, NULL),
  (11817757, 43633156, '3. Install: Lay weed barrier fabric', NULL, '3. Install: Lay weed barrier fabric', NULL, NULL, NULL, NULL),
  (11817785, 43633156, '3. Install: Del Rio gravel', NULL, 'approx. 1920 square feet

3. Install: Del Rio gravel', NULL, NULL, NULL, NULL),
  (11817852, 43633156, '3. Install: Import 10 yards of soil to level backyard planter areas', NULL, '3. Install: Import 10 yards of soil to level backyard planter areas', NULL, NULL, NULL, NULL),
  (11817864, 43633156, '3. Install: 1 yard of soil in front planter area', NULL, '3. Install: 1 yard of soil in front planter area', NULL, NULL, NULL, NULL),
  (11818034, 43633156, '3. Install: Convert 3 sprinkler zones to drip zones', NULL, '3. Install: Convert 3 sprinkler zones to drip zones', NULL, NULL, NULL, NULL),
  (11818095, 43633156, '3. Install: Repair 3 broken pipes.', NULL, '3. Install: Repair 3 broken pipes.', NULL, NULL, NULL, NULL),
  (11818104, 43633156, '3. Install: Cap old sprinkler heads from the conversion area.', NULL, '3. Install: Cap old sprinkler heads from the conversion area.', NULL, NULL, NULL, NULL),
  (11818126, 43633156, '3. Install: Split zones from grass to planter zones in front yard.', NULL, '3. Install: Split zones from grass to planter zones in front yard.', NULL, NULL, NULL, NULL),
  (11818135, 43633156, '3. Install: 1 new zone for the front hedge planter area.', NULL, '3. Install: 1 new zone for the front hedge planter area.', NULL, NULL, NULL, NULL),
  (11818141, 43633156, '3. Install: (2 qty.) anti-siphon spray irrigation valves', NULL, '3. Install: (2 qty.) anti-siphon spray irrigation valves', NULL, NULL, NULL, NULL),
  (11818143, 43633156, '3. Install: Sod', NULL, '1400 square feet of St. Augustine

3. Install: Sod', NULL, NULL, NULL, NULL),
  (11818365, 43633156, '2. Demo: Excavate concrete area to 6” below finish grade', NULL, '2. Demo: Excavate concrete area to 6” below finish grade', NULL, NULL, NULL, NULL),
  (11818673, 43633156, '3. Install: Road Base for Concrete', NULL, '3. Install: Road Base for Concrete', NULL, NULL, NULL, NULL),
  (11818681, 43633156, '3. Install: Rebar for Concrete', NULL, '3. Install: Rebar for Concrete', NULL, NULL, NULL, NULL),
  (11818687, 43633156, '3. Install: Pour Concrete slab', NULL, '3. Install: Pour Concrete slab', NULL, NULL, NULL, NULL),
  (11818916, 43633156, '3. Install: 9” of concrete to repair edge in front yard', NULL, '3. Install: 9” of concrete to repair edge in front yard', NULL, NULL, NULL, NULL),
  (11819124, 43633156, '3. Install: Used brick to match the flatwork', NULL, '3. Install: Used brick to match the flatwork', NULL, NULL, NULL, NULL),
  (11819235, 43633156, '3. Install: Lighting', NULL, '(1 qty.) 300-watt transformer (2 qty.) Lightcraft or equivalent LED spot lights (7 qty.) Lightcraft or equivalent LED path lights (4 qty.) Lightcraft or equivalent LED eyebrow lights (5 qty.) Lightcraft or equivalent LED grill top lights

3. Install: Lighting', NULL, NULL, NULL, NULL),
  (11822295, 43227529, 'solution to concrete?', NULL, 'solution to concrete?', NULL, NULL, NULL, '(HR) Mo Solomon'),
  (11824293, 43633156, '2. Demo: Excavate for Concrete Footings Outdoor Kitchen', NULL, '2. Demo: Excavate for Concrete Footings Outdoor Kitchen', NULL, NULL, NULL, NULL),
  (11824662, 43633156, '3. Install: Pour concrete footings for Outdoor Kitchen', NULL, '3. Install: Pour concrete footings for Outdoor Kitchen', NULL, NULL, NULL, NULL),
  (11824702, 43633156, '3. Install: CMU block for outdoor Kitchen', NULL, '3. Install: CMU block for outdoor Kitchen', NULL, NULL, NULL, NULL),
  (11834992, 5704019, 'Completed to do list', 'highest', '3- need to replace about 25 dry pieces of sod there''s an area that didn''t get sod see images', '2019-07-31', '2019-08-05 11:09:30', 'Mohammed Rahman', 'Andrea McMonigal,Salvador Calixto,Victor Rodriguez'),
  (11835749, 4128999, 'Punch list', NULL, '1- demo out concrete on strip, add paver

2- add sand to patio that was pressure washed last week

3- pressure wash driveway with concrete cleaner', NULL, '2019-08-07 08:11:32', 'Brian Godley', '(.PM) Jorge Flores,Maximino Sanchez'),
  (11839213, 43633156, '3. Install: Owner provided appliances', NULL, '3. Install: Owner provided appliances', NULL, NULL, NULL, NULL),
  (11839232, 43633156, '3. Install: Form/ pour Concrete countertop', NULL, '3. Install: Form/ pour Concrete countertop', NULL, NULL, NULL, NULL),
  (11839237, 43633156, '3. Install: Apply stucco finish to exterior of cook center', NULL, '3. Install: Apply stucco finish to exterior of cook center', NULL, NULL, NULL, NULL),
  (11839354, 43633156, '3. Install: 16LF firepit', NULL, '3. Install: 16LF firepit', NULL, NULL, NULL, NULL),
  (11839360, 43633156, '3. Install: CMU Block 18” above grade with a brick cap for firepit', NULL, '3. Install: CMU Block 18” above grade with a brick cap for firepit', NULL, NULL, NULL, NULL),
  (11850127, 43633156, '3. Install: Stucco finish on Firepit walls.', NULL, '3. Install: Stucco finish on Firepit walls.', NULL, NULL, NULL, NULL),
  (11850244, 43633156, '3. Install: Black Lava rock for firepit', NULL, '3. Install: Black Lava rock for firepit', NULL, NULL, NULL, NULL),
  (11850364, 43633156, '3. Install: double gas ring on firepit', NULL, '3. Install: double gas ring on firepit', NULL, NULL, NULL, NULL),
  (11850371, 43633156, '3. Install: gas shutoff valve for firepit', NULL, '3. Install: gas shutoff valve for firepit', NULL, NULL, NULL, NULL),
  (11851911, 43633156, '2. Demo: Trench for Cook Center/Firepit Utilities', NULL, '2. Demo: Trench for Cook Center/Firepit Utilities', NULL, NULL, NULL, NULL),
  (11852387, 43633156, 'Electrical', NULL, 'Electrical', NULL, NULL, NULL, NULL),
  (11852412, 43633156, '3. Install: Run electric from meter to Sauna', NULL, '3. Install: Run electric from meter to Sauna', NULL, NULL, NULL, NULL),
  (11852416, 43633156, '3. Install: Circuit Breaker', NULL, '3. Install: Circuit Breaker', NULL, NULL, NULL, NULL),
  (11852438, 43633156, '3. Install: 2 gfci by firepit area.', NULL, '3. Install: 2 gfci by firepit area.', NULL, NULL, NULL, NULL),
  (11856198, 4927312, 'warranty do to list', 'highest', '3. Phormium Jack Sprat farthest East and South of the path.', '2019-08-03', '2019-09-25 12:14:01', 'Jorge Flores', '(.PM) Jorge Flores,Stuart Spence'),
  (11856802, 5512086, '(untitled)', NULL, 'Chose Arizona Buckskin for color on flagstone', NULL, '2019-08-07 11:42:57', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (11856916, 5512086, '(untitled)', NULL, 'need plant selections and layout', NULL, '2019-08-07 11:43:15', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (11973605, 5985276, 'select paver color with owner, Catalina Grana', 'high', 'Paver Selection. Belgard Cat Grana Bella', NULL, '2019-08-13 18:43:33', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (11978811, 44681648, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (11978812, 44681648, '5. If the client is happy with the work ask for a review.', NULL, '5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (11978813, 44681648, 'Project Supervisor to have Pre Job Walk meeting with Client and Designer/Consultant', NULL, 'Project Supervisor to have Pre Job Walk meeting with Client and Designer/Consultant', NULL, NULL, NULL, NULL),
  (11978814, 44681648, 'Enter in Any To Dos for Outstanding Issues (need selections, potential plan changes etc.)', NULL, 'Enter in Any To Dos for Outstanding Issues (need selections, potential plan changes etc.)', NULL, NULL, NULL, NULL),
  (11978815, 44681648, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (11978816, 44681648, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (11979923, 44681648, '2. Demo: Till and Amend planting area', NULL, '2. Demo: Till and Amend planting area', NULL, NULL, NULL, NULL),
  (11980171, 44681648, '3. Install: Plants', NULL, '(38 qty.) 1 gal premium shrubs

3. Install: Plants', NULL, NULL, NULL, NULL),
  (11980173, 44681648, '3. Install: Rear Plants', NULL, 'Install (1 qty.) 24” box tree Install (3 qty.) 5 gal standard shrubs

3. Install: Rear Plants', NULL, NULL, NULL, NULL),
  (11987078, 5285676, 'pay for materials for fence guy', NULL, 'once i get material supplier phone number i will post in daily log

Ryan', NULL, '2019-09-25 10:42:04', 'Brian Godley', 'Sean Martinez'),
  (11987085, 5433625, 'Material Selection', NULL, 'Material Selection

Paver Choice: Belgard Catalina Grana in Toscana all small sizes for field and border.  Border to be laid on the 6" side.', NULL, '2019-09-17 11:03:14', 'Marybeth Jacobsen', 'Marybeth Jacobsen,Verva Gerse'),
  (11987088, 5285676, '(untitled)', NULL, 'Get fence guy Ronald Echkerson deposit of $2000 to start fencing', NULL, '2019-09-25 10:42:13', 'Brian Godley', '(HR) Mo Solomon'),
  (11987096, 5285676, '50% payment of remaining balance after material cost  upon 50% complete', NULL, NULL, NULL, '2019-09-25 10:42:20', 'Brian Godley', '(HR) Mo Solomon'),
  (11987098, 5704019, 'Yard Check', 'highest', 'check off everytime yard check will be done

#2 yard check 8/16/19', '2019-08-30', '2019-08-29 15:39:28', 'Sean Martinez', 'Andrea McMonigal,Daniel Aguilar'),
  (11987106, 5285676, '(untitled)', NULL, 'fence guy 100% complete payment  upon 100% complete, see sub folder', NULL, '2019-09-25 10:42:27', 'Brian Godley', '(HR) Mo Solomon'),
  (11987279, 5555986, 'Yard Check', 'highest', '4# yard check 8/29/19', '2019-08-30', '2019-08-29 15:40:12', 'Sean Martinez', 'Daniel Aguilar,Stephanie Soto'),
  (11987787, 5793856, 'Yard Check', 'highest', '#2 yard check 8/16/19', '2019-08-30', '2019-08-30 07:14:57', 'Sean Martinez', 'Daniel Aguilar,Mu Liu'),
  (11988181, 5633891, 'Yard Check', 'highest', '#4 yard check 8/30/19', '2019-08-30', '2019-09-02 09:48:02', 'Daniel Aguilar', 'Daniel Aguilar,Josh Golsen'),
  (11988212, 5686190, 'Yard Check', 'highest', '#2 yard check 8/16/19', '2019-08-30', '2019-08-22 15:52:35', 'Daniel Aguilar', 'Brenda Singh,Daniel Aguilar'),
  (12011900, 2248927, '(untitled)', NULL, 'Client Request

WARRANTY:  Install 3 - 5 gal Lavandula angustafolia English Lavender, 6 - 1 gal Echeveria subrigida ''Fire and Ice'' succulents
1 - 5 gal Agave attenuata , Install Already Purchased – At Site: 3 - 5 Gal Dwarf Musa Cavendish Banana tree', NULL, '2019-09-25 08:03:08', 'Brian Godley', NULL),
  (12014028, 5547166, '(untitled)', NULL, 'Material Selections

Blue Stone samples', NULL, '2019-08-14 09:57:05', 'Jorge Flores', 'Marybeth Jacobsen'),
  (12019313, 2248927, 'Client request', NULL, 'Kanye said this stuff

Move sprinkler', NULL, '2019-08-09 08:20:19', 'Mohammed Rahman', '(HR) Mo Solomon,Alonso Calixto'),
  (12034090, 5704028, 'Job completion', NULL, 'Sod', NULL, NULL, NULL, '(.PM) Jorge Flores,Fidel (Shaka) Calixto'),
  (12050533, 4312960, 'Job Completion', NULL, 'adjust legs on fridge and clean bbq equipment', NULL, '2019-12-24 10:00:43', 'Silvia Menchaca', '(.PM) Jorge Flores,Carlos Sosa,Fidel Corona,JuanCarlos Vallejo,Maximino Sanchez,Ryan Kleefisch,Sean Martinez'),
  (12055213, 5622742, '(untitled)', NULL, 'Material Selections

BBQ: Concrete Color Davis DUNE 6058', NULL, '2019-11-11 12:30:29', 'Brian Godley', 'Marybeth Jacobsen,Verva Gerse'),
  (12083509, 5884691, 'Job completion', NULL, 'Finish pavers', NULL, '2019-09-23 14:08:29', 'Sean Martinez', '(.PM) Jorge Flores,Edmilson Hernandez'),
  (12083521, 5468767, 'Job completion', NULL, 'Wire timer', NULL, '2019-12-06 15:31:45', 'Silvia Menchaca', '(.PM) Jorge Flores'),
  (12083528, 5642283, 'Job completion', NULL, 'Install turf', NULL, NULL, NULL, '(.PM) Jorge Flores'),
  (12083560, 5835014, 'Job completion', NULL, 'Wire timer', NULL, NULL, NULL, '(.PM) Jorge Flores'),
  (12083579, 5823327, 'Job completion', NULL, 'Planting', NULL, NULL, NULL, '(.PM) Jorge Flores'),
  (12083743, 5633890, 'Job completion', NULL, 'Lighting', NULL, '2019-12-06 15:35:11', 'Silvia Menchaca', '(.PM) Jorge Flores'),
  (12083917, 5686048, 'Job completion', NULL, 'Clean up all debris

Planting 2 - 15 gal. And 3 - 5gal', NULL, NULL, NULL, '(.PM) Jorge Flores'),
  (12085669, 6016988, '(untitled)', NULL, 'Paver samples to be dropped off by Marybeth or Richard:
Angelus Courtyard
1)  Grey moss charcoal
2)  Dark Grey Copper Char
3)  Cream Terracotta Brown
4)  Adobe Copper Mocha
5)  Tuscan
They will be installing a circle pattern and the 4 sizes courtyard

Measure Property', NULL, '2019-09-26 10:35:11', 'Marybeth Jacobsen', NULL),
  (12094690, 5547166, 'Before installation', NULL, 'Check and cancel lateral lines on hardscape areas', NULL, '2019-11-14 11:48:39', 'Brian Godley', '(.PM) Jorge Flores'),
  (12130245, 5948253, '(untitled)', NULL, 'Material Selection

Paver Choices: ORCO Holland Manor blend in specialty BURNISH FINISH
This will be for steps and porch and risers, 775 sf + 100 porch and steps, please order 925 square feet', NULL, '2019-08-15 17:34:11', 'Marybeth Jacobsen', 'Verva Gerse'),
  (12176202, 4312960, 'Job Completion (continued)', NULL, 'to do #2

move (2) boougavillea  where flagged
install (4) flats vinca on damaged areas on hillside , vinca must be 6" long', NULL, '2019-09-11 08:36:09', 'Brian Godley', '(.PM) Jorge Flores,JuanCarlos Vallejo,Maximino Sanchez,Rafi Emdemirjian,Ryan Kleefisch'),
  (12232080, 4296566, 'Yard Check', NULL, 'yard check #4 8/29/19', NULL, '2019-08-29 15:43:19', 'Sean Martinez', 'Daniel Aguilar'),
  (12232100, 5823327, 'Yard Check', NULL, 'yard check #4 9/19/19', NULL, '2019-09-20 15:04:59', 'Sean Martinez', 'Daniel Aguilar'),
  (12232123, 5633890, 'Yard Check', NULL, 'yard check #3 9/6/19', NULL, '2019-09-18 14:43:35', 'Sean Martinez', 'Daniel Aguilar'),
  (12232161, 5793854, 'Yard Check', NULL, 'yard check #3 9/6/19', NULL, '2019-09-18 14:48:15', 'Sean Martinez', 'Daniel Aguilar'),
  (12232174, 5686048, 'Yard Check', NULL, 'yard check #3 9/6/19', NULL, '2019-09-18 14:51:52', 'Sean Martinez', 'Daniel Aguilar'),
  (12235301, 6060085, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, '2019-10-01 14:26:17', 'Verva Gerse', NULL),
  (12286988, 6075753, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, 'David Bender'),
  (12287036, 6075757, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (12308576, 5498674, '(untitled)', NULL, 'Material Selection
Please see daily log 8/18  for material paver and tile choices

Paver Choices:From Arizona Tile 11308 Penrose St  Sun Valley, CA 91352 818-742-4750  See Daily Log', NULL, '2019-08-26 15:08:46', 'Verva Gerse', 'Marybeth Jacobsen,Verva Gerse'),
  (12323948, 4487762, 'Plant Selection', NULL, 'Change Order Material Choices

MB will work with client to select and purchase Fuel Mod appropriate plants for install. Changing out ornamental grasses.', NULL, '2019-10-01 20:15:12', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (12329513, 5948253, '(untitled)', NULL, 'Change Order Material Choices

Change Order Planting Plan', NULL, '2019-10-01 20:09:12', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (12329923, 5835014, 'Yard Check', NULL, 'Yard check #3 9/13/19', NULL, '2019-12-06 15:36:54', 'Daniel Aguilar', 'Daniel Aguilar'),
  (12330123, 5468767, 'Yard Check', NULL, 'Yard Check #4 9/20/19', NULL, '2019-09-20 15:16:35', 'Sean Martinez', 'Daniel Aguilar'),
  (12333083, 5049684, 'Job completion', NULL, 'Down spouts need to be reattached', NULL, '2019-08-27 12:53:59', 'Jorge Flores', '(.PM) Jorge Flores'),
  (12334843, 5633489, 'Material Selection', NULL, 'Block to be confirmed.  Client said it is grey slump stone from Angelus.  I''ll be taking a picture of it to confirm

Lighting - Client to provide Lights.  Picture Build charging for install only $90 per', NULL, '2019-08-27 13:47:02', 'Verva Gerse', 'Marybeth Jacobsen,Verva Gerse'),
  (12371268, 5512086, '(untitled)', NULL, 'Material Selections - This job was scheduled and items selected prior to new To-Do Policy.

Gravel removed from original plan. Only Del Rio 3/8 between Flagstone (80"x 36") in small planting bed next to back sliding door.', NULL, '2019-08-31 18:17:21', 'Marybeth Jacobsen', NULL),
  (12392500, 5493354, 'Order of to-dos.', NULL, 'Hide

Add flags to the lights on the plan, wire is already ran. Look for plan on the site.', NULL, '2019-08-30 17:08:01', 'Sean Martinez', 'Ignacio “Nacho” Iniguez'),
  (12396759, 5985276, 'Yard Check', NULL, 'yard check #4 9/19/19', NULL, '2019-09-20 11:16:25', 'Sean Martinez', 'Daniel Aguilar'),
  (12396768, 5493354, 'Yard Check', NULL, 'yard check #3 9/20/19', NULL, '2019-10-09 15:12:49', 'Sean Martinez', 'Daniel Aguilar'),
  (12396840, 5704028, 'Yard Check', NULL, 'Yard check #1 9/6/19', NULL, '2019-10-14 09:01:30', 'Sean Martinez', 'Daniel Aguilar'),
  (12396858, 2248927, 'Yard Check', NULL, 'yard check #1 8/9/19', NULL, '2019-09-03 14:17:32', 'Sean Martinez', 'Daniel Aguilar'),
  (12396911, 5049684, 'Yard Check', NULL, 'yard check #3 9/20/19', NULL, '2019-10-09 15:12:36', 'Sean Martinez', 'Daniel Aguilar'),
  (12430153, 5493354, 'Completed to do list', 'high', '3. We need some placement/drip system updates on few plants.', NULL, '2019-12-05 08:46:56', 'Brian Godley', '(.PM) Jorge Flores'),
  (12438211, 5433625, 'Hi Marybeth,', 'high', 'Please take paver samples to Myra,
Belgard Catalina Grana in large and small Bella
Belgard Catalina grana in sm or lrg in Toscana
Angelus Courtyard in Sand Stone Mocha 
Angelus Courtyard in Cream Brown Charcoal', '2019-09-04', '2019-09-07 20:37:14', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (12439214, 6082786, '(untitled)', NULL, 'Material Selections

Pavers, Border  - Belgard Cat Grana - Toscana Lrg', NULL, '2019-10-18 15:51:30', 'Marybeth Jacobsen', 'Marybeth Jacobsen,Ryan Kleefisch'),
  (12468860, 6066488, '(untitled)', NULL, 'Material Selection

No Planting', NULL, '2019-09-18 21:02:14', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (12511874, 4809254, 'Job completion', NULL, 'mo added 9/11/19

Lower pavers on gate for pool equipment area (gate gets caught on paver)', NULL, NULL, NULL, '(.PM) Jorge Flores'),
  (12555573, 6012577, '(untitled)', 'high', 'Material Selection

Pavers - Belgard Catalina Grana - Bella, Large', NULL, '2019-10-01 20:11:04', 'Marybeth Jacobsen', 'Marybeth Jacobsen,Ryan Kleefisch'),
  (12597865, 6164830, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (12647141, 6178748, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (12655253, 5948253, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2019-09-16 14:45:40', 'Jorge Flores', NULL),
  (12655330, 6012577, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2019-09-16 10:45:39', 'Brian Godley', NULL),
  (12660737, 6119012, '(untitled)', NULL, 'Backyard Design

Decorative Retaining Block Wall - 61 LF - 40" High, 8" Cap - TBD', NULL, '2019-12-05 08:25:53', 'Brian Godley', 'Marybeth Jacobsen'),
  (12687827, 6012577, '(untitled)', 'high', 'Client Request

Adjust Paver Border around Sod. See sketch. Client will approve Edmilson''s layout Thursday evening. 9/19  Will need additional Sod Pricing.', NULL, '2019-09-23 14:09:50', 'Sean Martinez', '(.PM) Jorge Flores'),
  (12691873, 6190708, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, '2019-11-11 12:41:54', 'Brian Godley', NULL),
  (12692125, 5512086, 'Job completion', NULL, 'Replace dead lavender

Replace dead lavender', NULL, '2020-07-08 08:20:46', 'Jorge Flores', '(.PM) Jorge Flores'),
  (12712834, 5916807, 'Yard Check', NULL, '10/10/19 #4', NULL, '2019-10-14 09:00:44', 'Sean Martinez', 'Daniel Aguilar'),
  (12713226, 6108845, 'Yard Check', NULL, '9/20/19 #1', NULL, '2019-10-14 09:01:04', 'Sean Martinez', 'Daniel Aguilar'),
  (12749625, 3124950, 'Job Completion', NULL, 'Final Coat on Stucco', NULL, '2019-12-03 21:05:08', 'Daniel Aguilar', '(.PM) Jorge Flores,Daniel Aguilar,Fidel (Shaka) Calixto,Maximino Sanchez'),
  (12757191, 5512086, 'Yard Check', NULL, '10/4/19 #2', NULL, '2019-10-21 08:49:16', 'Sean Martinez', 'Daniel Aguilar'),
  (12757340, 5285676, 'Yard Check', NULL, '9/28/19 #4', NULL, '2019-10-09 15:20:38', 'Sean Martinez', 'Daniel Aguilar'),
  (12757575, 4809254, 'Yard Check', NULL, '8/21/19 #1', NULL, '2019-09-20 11:12:44', 'Sean Martinez', 'Daniel Aguilar'),
  (12760815, 5948253, 'Job Completion', NULL, 'Repair one more cracked paver', NULL, '2020-01-13 09:36:37', 'Brian Godley', '(.PM) Jorge Flores'),
  (12760880, 5774125, 'Job Completion list', NULL, 'even out bumps in turf by adding infill and brooming turf', NULL, '2019-09-23 14:08:50', 'Sean Martinez', '(.PM) Jorge Flores,Maximino Sanchez'),
  (12797191, 5523763, 'Job Completion', 'highest', 'Need a change order for replacing plants(plant count is in daily log)', '2019-09-24', '2020-01-28 15:41:31', 'Jorge Flores', '(.PM) Jorge Flores'),
  (12798233, 6066488, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2019-09-24 09:25:31', 'Brian Godley', NULL),
  (12800905, 5774125, 'Yard Check', NULL, '10/3/19 #2', NULL, '2019-10-16 08:30:41', 'Sean Martinez', 'Daniel Aguilar'),
  (12801053, 3905763, 'Yard Check', NULL, '10/3/19 #2', NULL, '2019-10-21 08:46:32', 'Sean Martinez', 'Daniel Aguilar'),
  (12802649, 6219569, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2019-12-06 13:17:21', 'Silvia Menchaca', NULL),
  (12808236, 5547166, 'Job Completion list', NULL, 'restroom pick up', NULL, '2019-11-14 11:49:27', 'Brian Godley', '(.PM) Jorge Flores,Maximino Sanchez,Sean Martinez'),
  (12824153, 5433625, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2019-09-24 09:31:02', 'Brian Godley', NULL),
  (12845194, 6219569, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2019-11-13 15:01:24', 'Ryan Kleefisch', NULL),
  (12845199, 5449169, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2019-11-20 08:18:14', 'Brian Godley', NULL),
  (12845200, 5449169, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2019-10-21 10:30:02', 'Verva Gerse', NULL),
  (12845205, 6119012, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2019-12-05 08:25:33', 'Brian Godley', NULL),
  (12845206, 6119012, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2019-12-05 08:25:21', 'Brian Godley', NULL),
  (12845246, 6016988, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2019-11-11 12:29:25', 'Brian Godley', NULL),
  (12845247, 6016988, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2019-10-16 11:12:58', 'Brian Godley', NULL),
  (12845282, 5472327, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, NULL, NULL, NULL),
  (12845283, 5472327, '(untitled)', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, NULL, NULL, NULL),
  (12845323, 5145518, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (12845324, 5145518, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (12845338, 6082786, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2019-11-11 12:33:28', 'Brian Godley', NULL),
  (12845339, 6082786, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2019-10-20 18:47:28', 'Marybeth Jacobsen', NULL),
  (12845616, 5108066, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2019-09-25 08:14:47', 'Brian Godley', NULL),
  (12845618, 5108066, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, NULL, NULL, NULL),
  (12845696, 5523763, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2020-01-28 14:54:43', 'Silvia Menchaca', NULL),
  (12845721, 4312960, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2019-12-24 10:01:12', 'Silvia Menchaca', NULL),
  (12845730, 5570702, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2021-09-04 12:16:50', 'Melinda Babaian', NULL),
  (12845731, 5570702, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2020-07-03 15:08:54', 'Verva Gerse', NULL),
  (12845747, 6012577, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, '(.PM) Jorge Flores'),
  (12845762, 3124950, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, NULL, NULL, NULL),
  (12845785, 4011993, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (12845795, 6066488, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (12845983, 4809254, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (12845997, 6190708, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2019-11-11 12:42:55', 'Brian Godley', NULL),
  (12846016, 5622742, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (12846020, 5498674, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2019-12-13 08:37:33', 'Silvia Menchaca', NULL),
  (12846021, 5498674, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2019-12-13 08:36:55', 'Silvia Menchaca', NULL),
  (12846043, 5433625, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2019-11-11 12:41:09', 'Brian Godley', NULL),
  (12846047, 5344445, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, NULL, NULL, NULL),
  (12846118, 6085856, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2019-10-17 14:15:03', 'Marybeth Jacobsen', NULL),
  (12846119, 6085856, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, '2019-11-11 12:40:11', 'Brian Godley', NULL),
  (12846120, 6085856, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, NULL, NULL, NULL),
  (12846184, 4487762, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, NULL, NULL, NULL),
  (12846195, 5547166, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2019-11-14 11:49:40', 'Brian Godley', NULL),
  (12846236, 2248927, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2022-11-08 14:21:02', 'Nicole Antoine', NULL),
  (12846244, 5633489, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (12846251, 3036021, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2021-08-12 10:32:45', 'Melinda Babaian', NULL),
  (12846254, 6108845, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, NULL, NULL, NULL),
  (12846281, 5493354, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2021-01-06 16:05:10', 'Melinda Babaian', NULL),
  (12847218, 6119012, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2020-01-07 09:57:35', 'Silvia Menchaca', NULL),
  (12848439, 6075593, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (12848441, 5433874, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (12848729, 5823763, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (12848744, 6150036, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (12848965, 5633516, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (12848989, 4523019, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (12848990, 5793824, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (12849026, 5494650, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (12849033, 5533067, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (12849061, 5823298, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (12849065, 5798704, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (12849071, 5923078, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (12849078, 5633500, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (12849120, 5823759, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (12849156, 5630790, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (12849192, 5823320, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (12849196, 5532938, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (12849197, 5433719, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (12849200, 6060085, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (12849204, 5823310, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (12849206, 5823148, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (12849216, 5974513, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (12849218, 5707886, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (12849220, 4944166, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (12849254, 4077825, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (12849255, 2620664, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (12849257, 4852401, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (12849259, 4774051, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (12849262, 5433850, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (12849263, 4737915, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (12849266, 5883827, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (12849268, 5633481, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (12876644, 6242930, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (12888160, 6245051, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (12888161, 6245051, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2019-10-01 16:59:57', 'David Bender', NULL),
  (12896880, 6247567, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (12907116, 6012577, 'Yard Check', NULL, '10/25/19 #4', NULL, '2019-12-06 15:36:43', 'Daniel Aguilar', 'Daniel Aguilar'),
  (12907761, 6245051, 'Material Selection', NULL, 'Material Selections

New Common Red Brick', NULL, '2019-09-27 14:33:22', 'Marybeth Jacobsen', NULL),
  (12908143, 4487762, 'Yard Check', NULL, '10/25/19 #4', NULL, '2019-12-06 15:37:51', 'Daniel Aguilar', 'Daniel Aguilar'),
  (12931128, 6256219, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (12958019, 6012577, 'Completed to do list', NULL, '2- light switch is upside down needs to be corrected told the client we can handle this on yard check she''s fine with that.', NULL, '2019-12-03 21:05:04', 'Daniel Aguilar', 'Daniel Aguilar'),
  (12959773, 6265820, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2019-11-11 10:57:51', 'Ryan Kleefisch', NULL),
  (12959774, 6265820, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2020-01-07 10:35:03', 'Silvia Menchaca', NULL),
  (12959775, 6265820, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (12971377, 6060085, 'Material selection', NULL, 'RUSH job: Verva brought the following pavers: Belgard Cat Grana - Rio Large.  Angelus Crt Yd. DG/Pew/Ch and Gry/Char', NULL, NULL, NULL, 'Marybeth Jacobsen'),
  (12971395, 6060085, 'Lighting', NULL, 'LIghting Needds choices given and finish chips', NULL, NULL, NULL, 'Marybeth Jacobsen'),
  (12972137, 5344445, 'Flagstone 10 step stones', NULL, 'Flagstone  10 steps to match pavers toscana', NULL, '2019-10-08 13:07:45', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (12975076, 6269347, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (13003527, 6016988, '(untitled)', NULL, 'Pending To-Dos

Remarkable Gardens - Final Planting Plan', NULL, '2019-10-20 18:49:45', 'Marybeth Jacobsen', 'Marybeth Jacobsen'),
  (13018066, 6288478, '(untitled)', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, '2019-10-16 11:11:34', 'Brian Godley', NULL),
  (13018067, 6288478, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2019-11-11 12:31:00', 'Brian Godley', NULL),
  (13018068, 6288478, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (13034940, 6304060, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (13059867, 6288478, '(untitled)', NULL, 'Pending To-Do''s

Planting Design - Remarkable Gardens', NULL, '2019-10-09 07:35:27', 'Marybeth Jacobsen', NULL),
  (13064760, 6311769, '(untitled)', 'high', 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2019-11-11 12:28:16', 'Brian Godley', 'Marybeth Jacobsen'),
  (13064761, 6311769, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2019-11-11 12:27:53', 'Brian Godley', NULL),
  (13064762, 6311769, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2019-11-11 12:28:42', 'Brian Godley', NULL),
  (13112868, 44638777, '1. Door Hangers Out', NULL, '1. Door Hangers Out', NULL, NULL, NULL, 'Oscar Valdez'),
  (13112869, 44638777, '3. Pick up Job Box.', NULL, '3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (13112870, 44638777, 'Production Manager Familiarize with  Job Scope, Plan and Tasks', NULL, 'Production Manager Familiarize with  Job Scope, Plan and Tasks', NULL, NULL, NULL, NULL),
  (13112871, 44638777, 'Upload Bid', NULL, 'Upload Bid', NULL, NULL, NULL, NULL),
  (13112872, 44638777, '1. Starting Job Walk', NULL, '1. Starting Job Walk', NULL, NULL, NULL, NULL),
  (13112873, 44638777, '1.Yard Sign', NULL, '1.Yard Sign', NULL, NULL, NULL, 'Oscar Valdez'),
  (13119618, 5523763, 'Yard Check', NULL, '#3 10/24/19', NULL, '2019-10-31 08:42:33', 'Sean Martinez', 'Daniel Aguilar'),
  (13122633, 3124950, 'Yard Check', NULL, '#2 10/17/19', NULL, '2019-10-31 15:45:18', 'Sean Martinez', 'Daniel Aguilar'),
  (13122820, 5433625, 'Yard Check', NULL, '#2 10/18/19', NULL, '2019-10-31 15:45:54', 'Sean Martinez', 'Daniel Aguilar'),
  (13122828, 5948253, 'Yard Check', NULL, '#3 10/25/19', NULL, '2019-10-31 15:43:53', 'Sean Martinez', 'Daniel Aguilar'),
  (13142957, 44638777, '2. Demo:  remove existing pathway', NULL, 'approx. 135 square feet

2. Demo:  remove existing pathway', NULL, NULL, NULL, NULL),
  (13174550, 6344611, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (13300203, 6119012, '(untitled)', NULL, 'Material Selections

SOD - RTF- 500 /sq. Ft', NULL, '2019-12-19 11:19:18', 'Silvia Menchaca', NULL),
  (13318116, 5449169, '(untitled)', NULL, 'Material Selections

Pavers Front Yard -  Angeles Courtyard Drk Gry/ Pewter/Char,  Paver Border - Angeles Drk Gry/ Pewter/Char', NULL, '2019-11-20 08:18:42', 'Brian Godley', NULL),
  (13345270, 6219569, 'Material Selections', NULL, 'Gas Line Permit to Fire Pit', NULL, '2019-11-21 08:37:15', 'Brian Godley', 'Ryan Kleefisch'),
  (13349065, 6085856, '(untitled)', NULL, 'Material Selections

Cap for Fire Pit - Bellecrete CLASSIC style coping in Dark Grey, Sandfinish for firepit.', NULL, '2019-10-22 10:38:39', 'Marybeth Jacobsen', NULL),
  (13370987, 6311769, 'Yard Check', NULL, '#4 11/14/19', NULL, '2019-12-06 15:36:29', 'Daniel Aguilar', 'Daniel Aguilar'),
  (13371144, 6288478, 'Yard Check', NULL, '#1 10/25/19', NULL, '2019-11-16 11:38:30', 'Brian Godley', 'Daniel Aguilar'),
  (13437704, 6417472, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2019-11-05 16:37:15', 'Brian Godley', NULL),
  (13437705, 6417472, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2019-12-27 14:36:04', 'Silvia Menchaca', NULL),
  (13437706, 6417472, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2020-01-07 10:39:14', 'Silvia Menchaca', NULL),
  (13486019, 6455206, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2019-10-30 12:27:52', 'Brian Godley', NULL),
  (13486020, 6455206, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, '2019-11-27 08:05:56', 'Brian Godley', NULL),
  (13486021, 6455206, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2020-01-13 09:27:48', 'Silvia Menchaca', NULL),
  (13540912, 5622742, 'Yard Check', NULL, '#1 11/7/19', NULL, '2019-12-05 09:31:48', 'Silvia Menchaca', 'Daniel Aguilar'),
  (13540938, 6016988, 'Yard Check', NULL, '#4 11/28/19', NULL, '2019-11-27 12:59:22', 'Brian Godley', 'Daniel Aguilar'),
  (13540952, 6082786, 'Yard Check', NULL, '#2 11/14/19', NULL, '2019-12-05 09:26:40', 'Silvia Menchaca', 'Daniel Aguilar'),
  (13559067, 6478051, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (13580519, 5622742, 'Job Completion', NULL, 'Install sink after inspection', NULL, NULL, NULL, '(.PM) Jorge Flores'),
  (13614602, 2248927, 'Job Completion', NULL, '-Gates adjusted and touched up', NULL, '2022-11-08 14:21:02', 'Nicole Antoine', '(.PM) Jorge Flores'),
  (13657690, 6517910, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2019-11-11 10:56:52', 'Ryan Kleefisch', NULL),
  (13657691, 6517910, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2019-11-14 08:15:42', 'Brian Godley', NULL),
  (13657692, 6517910, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (13660866, 6075753, 'meeting', NULL, 'Meeting to go over concept on 11/7/19 @ noon', '2019-11-07', '2019-11-08 11:25:24', 'David Bender', 'David Bender'),
  (13696280, 6530692, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2020-01-28 14:43:10', 'Silvia Menchaca', NULL),
  (13696281, 6530692, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2020-01-28 14:43:08', 'Silvia Menchaca', NULL),
  (13696282, 6530692, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (13698335, 6517910, 'Changes to plot plan recommendation.', NULL, 'Please see attached document for requested changes to initial plot plan recommendation', '2019-11-04', NULL, NULL, 'Joseph Elhabr'),
  (13718657, 5285676, 'Job Completion', NULL, 'label gfci', NULL, '2020-02-17 08:37:42', 'Brian Godley', NULL),
  (13720136, 6535359, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (13724802, 5344445, 'Job Completion', NULL, 'Need jobsite clean up.', NULL, NULL, NULL, NULL),
  (13727130, 6417472, 'call prime building for status of paver delivery', 'high', NULL, '2019-11-12', '2019-11-14 14:06:08', 'Brian Godley', NULL),
  (13730689, 5707886, '(untitled)', NULL, 'Choices

All choices have been made except for lighting.', NULL, NULL, NULL, 'Verva Gerse'),
  (13747775, 6547779, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (13751057, 6082786, '(untitled)', NULL, 'call franky', '2019-11-12', '2019-11-14 14:06:18', 'Brian Godley', NULL),
  (13771463, 6517910, 'Material Selection', NULL, 'Plant choices and planting plan need to be finalized', NULL, '2019-11-19 13:37:11', 'Brian Godley', '(.PM) Jorge Flores'),
  (13777378, 6561183, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2019-11-14 16:49:23', 'Brian Godley', NULL),
  (13777379, 6561183, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, '2020-01-07 15:44:08', 'Silvia Menchaca', NULL),
  (13777380, 6561183, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2020-01-07 15:55:21', 'Silvia Menchaca', NULL),
  (13789032, 6564218, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (13797018, 6517910, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2019-11-14 08:19:43', 'Ryan Kleefisch', NULL),
  (13806508, 6570878, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2020-01-07 13:10:14', 'Silvia Menchaca', NULL),
  (13806509, 6570878, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2020-01-07 13:07:48', 'Silvia Menchaca', NULL),
  (13806510, 6570878, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (13829055, 6580546, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2019-12-01 23:27:18', 'Ryan Kleefisch', NULL),
  (13829056, 6580546, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2019-12-05 08:27:10', 'Brian Godley', NULL),
  (13829057, 6580546, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (13888782, 6600883, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2019-11-25 02:13:12', 'Ryan Kleefisch', NULL),
  (13888783, 6600883, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2019-12-17 15:24:05', 'Silvia Menchaca', NULL),
  (13888784, 6600883, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (13892102, 6603468, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (13905775, 5449169, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2019-12-05 09:49:11', 'Brian Godley', NULL),
  (13908536, 5285676, 'Electrical Permit', 'highest', 'Please pull for angelica asap', NULL, '2020-02-17 08:37:26', 'Brian Godley', 'Ryan Kleefisch'),
  (13953050, 6561183, 'planting change order $260 needed', 'highest', NULL, '2019-11-22', '2020-01-02 08:10:38', 'Verva Gerse', 'Verva Gerse'),
  (13953763, 5449169, 'Job completion', NULL, 'checklist

pickup broken pavers from planter area.', NULL, '2019-12-03 09:12:42', 'Jorge Flores', NULL),
  (14011973, 2248927, '(untitled)', 'low', 'Make sure to schedule this for the end of the week.', '2019-12-03', '2019-12-02 19:41:40', 'Silvia Menchaca', NULL),
  (14029054, 6517910, '(untitled)', NULL, 'Job completion

replace dead plants', NULL, '2020-01-13 09:24:29', 'Silvia Menchaca', '(.PM) Jorge Flores'),
  (14029159, 6455206, 'Job completion', NULL, 'replace 1 piece of sod', NULL, '2019-12-20 08:01:43', 'Silvia Menchaca', '(.PM) Jorge Flores'),
  (14035938, 6517910, '(untitled)', 'high', 'make sure to take the plants from the warehouse to Elhabr.', '2019-11-29', '2019-12-04 10:58:05', 'Silvia Menchaca', 'Ignacio “Nacho” Iniguez'),
  (14039986, 6582890, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2019-12-17 16:39:03', 'Silvia Menchaca', NULL),
  (14039987, 6582890, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2019-12-17 16:39:17', 'Silvia Menchaca', NULL),
  (14039988, 6582890, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (14056391, 6580546, 'jobstart notes', 'highest', 'jobstart notes', NULL, '2019-12-01 23:28:09', 'Ryan Kleefisch', 'Ryan Kleefisch'),
  (14065125, 6580546, '(untitled)', NULL, 'plant design and selections', NULL, '2020-01-31 15:45:56', 'Silvia Menchaca', 'Brian Godley'),
  (14080224, 6600883, 'Job completion', NULL, 'Remove forms', NULL, NULL, NULL, '(.PM) Jorge Flores'),
  (14096199, 6678959, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2019-12-05 00:14:45', 'Ryan Kleefisch', NULL),
  (14096201, 6678959, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (14098277, 6016988, '(untitled)', 'low', 'call Roy for Arroyo for update on step stones', '2019-12-11', '2019-12-13 18:34:51', 'Silvia Menchaca', NULL),
  (14110526, 6417472, '(untitled)', 'high', 'Call rosy regarding Farhood: Sod delivery needs to be made on Saturday', '2019-12-06', '2019-12-13 18:34:40', 'Silvia Menchaca', NULL),
  (14113675, 44638777, '2. Demo: Grade for Pavers', NULL, '2. Demo: Grade for Pavers', NULL, NULL, NULL, NULL),
  (14116620, 44638777, '3. Install: Base and leveling sand', NULL, '3. Install: Base and leveling sand', NULL, NULL, NULL, NULL),
  (14117480, 44638777, '3. Install: Pavers', NULL, 'Ackerstone brand Palermo approx. 180 square feet top of existing landing, approx. 44 square feet

3. Install: Pavers', NULL, NULL, NULL, NULL),
  (14117633, 44638777, '3. Install: step tread to existing landing', NULL, '11’ of Angelus brand Bastinone 8”

3. Install: step tread to existing landing', NULL, NULL, NULL, NULL),
  (14117640, 44638777, '3. Install: 4’ of new step beneath existing landing', NULL, '3. Install: 4’ of new step beneath existing landing', NULL, NULL, NULL, NULL),
  (14117768, 44638777, '2. Demo: 42” of existing wall in front yard', NULL, '2. Demo: 42” of existing wall in front yard', NULL, NULL, NULL, NULL),
  (14118118, 44638777, '3. Install: Poured in place concrete step', NULL, '3. Install: Poured in place concrete step', NULL, NULL, NULL, NULL),
  (14118131, 44638777, '2. Demo: Remove 3" of Sod over 132sqft', NULL, '2. Demo: Remove 3" of Sod over 132sqft', NULL, NULL, NULL, NULL),
  (14119239, 44638777, '3. Install: Weed barrier', NULL, '3. Install: Weed barrier', NULL, NULL, NULL, NULL),
  (14119246, 44638777, '3. Install: 12sqft of ⅜” Del Rio gravel (', NULL, '3. Install: 12sqft of ⅜” Del Rio gravel (', NULL, NULL, NULL, NULL),
  (14119260, 44638777, '3. Install: Metal Edging', NULL, '33 LF

3. Install: Metal Edging', NULL, NULL, NULL, NULL),
  (14119279, 44638777, '3. Install: (12 qty.) 2’ x 2’ precast concrete steppers', NULL, '3. Install: (12 qty.) 2’ x 2’ precast concrete steppers', NULL, NULL, NULL, NULL),
  (14146645, 5570702, '(untitled)', NULL, 'Job Completion

Finish Steps', NULL, '2021-09-04 12:16:50', 'Melinda Babaian', NULL),
  (14148832, 6417472, '(untitled)', 'low', 'Yard Check

12/20/19: Yard Check 2', '2020-01-06', '2020-01-06 15:31:33', 'Silvia Menchaca', NULL),
  (14157500, 6119012, '(untitled)', 'high', 'MAKE SURE TO CHANGE STATUS TO YARD CHECK AND SCHEDULE FOR 12/20 AND ON.', '2019-12-13', '2019-12-12 15:50:18', 'Silvia Menchaca', NULL),
  (14174960, 6703291, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (14178508, 6703861, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (14179610, 5498674, 'Yard Checks', 'low', 'Yard Check 2', '2019-12-16', '2019-12-16 09:40:20', 'Silvia Menchaca', NULL),
  (14179704, 6455206, 'Yard Check', 'low', '12/28 Yard Check 4', '2019-12-28', '2020-01-13 09:27:18', 'Silvia Menchaca', NULL),
  (14181410, 6219569, 'Yard Check', 'low', '1/3 Yard Check 4', '2020-01-06', '2020-01-07 13:32:08', 'Silvia Menchaca', NULL),
  (14193786, 6706322, '(untitled)', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, NULL, NULL, NULL),
  (14193787, 6706322, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, NULL, NULL, NULL),
  (14193788, 6706322, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (14223776, 6713355, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2020-01-15 21:49:35', 'Brian Godley', NULL),
  (14223777, 6713355, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2020-03-24 08:17:21', 'Brian Godley', NULL),
  (14223778, 6713355, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (14229233, 6714637, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (14233302, 6715565, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, NULL, NULL, NULL),
  (14236520, 6247567, 'documentation', NULL, 'need 
- design agreement
- design check', NULL, NULL, NULL, 'Verva Gerse'),
  (14240080, 6717030, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2019-12-12 15:51:35', 'Brian Godley', NULL),
  (14240081, 6717030, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (14240082, 6717030, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (14248049, 6718711, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2020-02-07 10:13:32', 'Silvia Menchaca', NULL),
  (14248050, 6718711, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2020-02-07 10:13:33', 'Silvia Menchaca', NULL),
  (14248051, 6718711, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (14249378, 6561183, 'Yard Check', 'low', 'Yard Check 1', '2020-01-13', '2020-01-07 15:43:36', 'Silvia Menchaca', NULL),
  (14250104, 6719222, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (14285709, 6119012, 'Yard Checks', 'low', 'Yard Check 2', '2020-01-06', '2020-01-07 09:53:37', 'Silvia Menchaca', NULL),
  (14285712, 6717030, '(untitled)', NULL, 'Material Selection

Need Turf Choice', NULL, '2019-12-13 15:25:13', 'Brian Godley', 'Brian Godley'),
  (14294802, 6731794, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2019-12-13 11:23:37', 'Brian Godley', NULL),
  (14294803, 6731794, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2019-12-26 11:46:31', 'Brian Godley', NULL),
  (14294804, 6731794, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2025-11-05 14:08:10', 'Brian Godley', NULL),
  (14302477, 6731794, 'Material Selection', NULL, 'Client needs to pick out ground cover', NULL, '2019-12-26 11:46:45', 'Brian Godley', NULL),
  (14302843, 6119012, 'Job completion', NULL, 'For Fidel

And move furniture back', NULL, '2019-12-19 15:03:02', 'Fidel Corona', NULL),
  (14324506, 6669334, 'Broken sprinkler head', NULL, 'House owner acknowledged that one of our workers broke one of the sprinkler heads on the front lawn and wants to know if it could be repaired.', NULL, '2020-01-07 15:56:24', 'Silvia Menchaca', NULL),
  (14397695, 6785675, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2020-01-14 12:10:11', 'Brian Godley', NULL),
  (14397696, 6785675, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2020-02-06 12:03:54', 'Silvia Menchaca', NULL),
  (14397697, 6785675, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2020-02-06 12:04:08', 'Silvia Menchaca', NULL),
  (14401461, 6517910, 'Yard Checks', 'low', 'Yard Check 2', '2020-01-13', '2020-01-13 09:22:32', 'Silvia Menchaca', NULL),
  (14427921, 6265820, 'read the passerelli log', 'highest', 'read the passerelli log', '2019-12-20', '2019-12-26 16:33:51', 'Silvia Menchaca', '(.PM) Jorge Flores'),
  (14453783, 6219569, 'QUALITY CONTROL ISSUES', NULL, 'Powerwash street of dirt clumps', NULL, NULL, NULL, NULL),
  (14466846, 6829895, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2020-03-03 08:00:19', 'Verva Gerse', NULL),
  (14466847, 6829895, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (14466848, 6829895, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (14466988, 6829924, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (14466989, 6829924, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, NULL, NULL, NULL),
  (14466990, 6829924, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (14478945, 6417472, 'TO DO LIST', NULL, 'Clean up the rocks on front yard side and grade clean', NULL, '2020-01-06 15:31:40', 'Silvia Menchaca', NULL),
  (14514711, 6845509, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (14514712, 6845509, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, NULL, NULL, NULL),
  (14514713, 6845509, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (14528610, 6847806, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (14536042, 6849642, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2020-01-21 18:32:34', 'Silvia Menchaca', NULL),
  (14536043, 6849642, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, '2020-01-21 18:32:12', 'Silvia Menchaca', NULL),
  (14536044, 6849642, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (14559676, 6863076, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2020-01-06 08:49:42', 'Brian Godley', NULL),
  (14559677, 6863076, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2020-01-06 08:53:09', 'Brian Godley', NULL),
  (14559678, 6863076, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (14583538, 6868237, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (14586489, 6869023, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (14604562, 6731794, '(untitled)', 'low', 'YARD CHECKS

1/10/20', '2020-02-03', '2025-11-05 14:08:08', 'Brian Godley', NULL),
  (14613939, 6570878, 'YARD CHECKS', 'low', '1/17/20', '2020-02-03', '2020-01-31 15:50:21', 'Silvia Menchaca', NULL),
  (14617915, 6883019, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (14617916, 6883019, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2020-03-18 09:23:58', 'Jorge Flores', NULL),
  (14617917, 6883019, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (14658345, 6897096, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (14696471, 6669334, 'Yard Checks', 'low', '1/10', '2020-02-03', '2020-03-30 19:59:31', 'Melinda Babaian', NULL),
  (14705478, 6849642, 'Read Daily Log', 'high', NULL, '2020-01-13', '2020-01-21 18:33:09', 'Silvia Menchaca', 'Antonio Nanez,Ignacio “Nacho” Iniguez'),
  (14731183, 6796088, 'Yard Checks', 'high', '1/17/20', '2020-02-07', '2020-02-26 11:27:49', 'Melinda Babaian', NULL),
  (14745236, 6927712, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (14748230, 6713355, 'Check in with Sand Builders 818-534-5400', 'highest', NULL, '2020-01-29', '2020-01-24 12:32:49', 'Silvia Menchaca', NULL),
  (14773305, 6935943, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (14785784, 6940786, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2020-02-05 12:55:11', 'Silvia Menchaca', NULL),
  (14785785, 6940786, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, '2020-02-05 12:55:15', 'Silvia Menchaca', NULL),
  (14785786, 6940786, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (14792620, 6931718, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2020-01-23 14:30:12', 'Brian Godley', NULL),
  (14792621, 6931718, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (14792622, 6931718, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (14819428, 6951782, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (14819429, 6951782, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, '2020-02-14 11:21:52', 'Brian Godley', NULL),
  (14819430, 6951782, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (14833960, 6796088, '(untitled)', NULL, 'Quality control to-do''s

Grout flag stone on step and spa see pictures', NULL, '2020-01-30 08:07:40', 'Brian Godley', NULL),
  (14838900, 6957272, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (14838901, 6957272, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (14838902, 6957272, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (14850532, 6962273, '(untitled)', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, NULL, NULL, NULL),
  (14850533, 6962273, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, '2020-02-10 09:56:43', 'Jorge Flores', NULL),
  (14850534, 6962273, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, NULL, NULL, NULL),
  (14850564, 6962287, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (14852959, 6849642, 'Yard Checks', 'low', '2/14/20', '2020-02-17', '2020-02-26 11:27:47', 'Melinda Babaian', NULL),
  (14853757, 6962900, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (14853758, 6962900, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, NULL, NULL, NULL),
  (14853759, 6962900, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (14911285, 5523763, 'Yard Checks', 'low', '1/31', '2020-02-17', '2020-02-26 11:27:47', 'Melinda Babaian', NULL),
  (14933899, 6580546, 'MAIL CHECK PAYMENT TO NUCCIO''S NURSERIES', 'high', NULL, '2020-01-28', '2020-02-10 07:49:27', 'Mohammed Rahman', '(HR) Mo Solomon'),
  (14940847, 6713355, 'MAIL CHECK TO ERIC BOHLEN', 'high', NULL, '2020-01-28', '2020-02-10 07:49:29', 'Mohammed Rahman', '(HR) Mo Solomon'),
  (14967949, 6530692, 'Yard Checks', 'low', '1/31', '2020-02-17', '2020-02-26 11:27:46', 'Melinda Babaian', NULL),
  (14987845, 7035723, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2020-03-02 14:31:20', 'Brian Godley', NULL),
  (14987846, 7035723, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, '2022-11-08 14:20:37', 'Nicole Antoine', NULL),
  (14987847, 7035723, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2022-11-08 14:20:37', 'Nicole Antoine', NULL),
  (14988207, 7035887, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (15027465, 4077921, 'CALL CUSTOMER AND SET UP FOR TREE REPLACEMENT', 'high', NULL, '2020-02-13', '2020-02-26 11:27:48', 'Melinda Babaian', NULL),
  (15028796, 7048394, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (15037564, 6580546, 'YARD CHECKS', 'high', '2/7', '2020-02-24', '2020-02-26 11:27:45', 'Melinda Babaian', NULL),
  (15059606, 7063445, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (15059607, 7063445, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (15059608, 7063445, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (15059862, 7063516, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2020-03-14 09:02:34', 'Verva Gerse', NULL),
  (15059863, 7063516, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (15059864, 7063516, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (15060028, 7063556, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2020-03-03 08:02:29', 'Verva Gerse', NULL),
  (15060029, 7063556, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (15060030, 7063556, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (15123028, 7083315, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (15123053, 7083320, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (15165401, 7083314, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (15197378, 7108235, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (15197379, 7108235, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2020-02-13 10:07:27', 'Jorge Flores', NULL),
  (15197380, 7108235, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (15302149, 7139337, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (15345748, 7150163, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (15412334, 7168264, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2020-04-09 20:32:18', 'Ryan Kleefisch', NULL),
  (15412335, 7168264, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2020-03-05 12:47:59', 'Jorge Flores', NULL),
  (15412336, 7168264, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2021-05-07 16:02:48', 'Melinda Babaian', 'Maximino Sanchez'),
  (15475274, 7185170, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (15475275, 7185170, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (15475276, 7185170, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (15480280, 7186909, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (15485726, 6951782, 'Paint gate black', 'high', 'Schedule with customer

Order paint', '2020-02-27', '2020-02-24 18:55:17', 'Melinda Babaian', 'Melinda Babaian'),
  (15502387, 6962273, 'schedule', NULL, 'schedule pick up pallets', NULL, '2020-02-25 16:02:35', 'Melinda Babaian', 'Melinda Babaian'),
  (15506767, 6962900, 'Order pavers', NULL, 'Order pavers once you know the color.', '2020-02-27', '2020-02-27 16:53:48', 'Melinda Babaian', 'Melinda Babaian'),
  (15508541, 6829895, 'Remind C&M', NULL, 'Remind C&M to pick up lowboy', '2020-02-26', '2020-02-26 11:23:13', 'Melinda Babaian', 'Melinda Babaian'),
  (15512676, 7185170, 'Order Pavers', NULL, 'Ask Ryan When to order pavers', '2020-02-26', '2020-02-27 10:19:02', 'Melinda Babaian', 'Melinda Babaian'),
  (15514414, 7185170, 'Job walk folder', NULL, 'Make a job walk folder for Jorge.', NULL, '2020-02-26 11:28:08', 'Melinda Babaian', NULL),
  (15517419, 6962273, 'Order Plants', NULL, 'order plants', '2020-02-27', '2020-02-28 10:25:23', 'Melinda Babaian', 'Melinda Babaian'),
  (15526093, 7208800, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (15530592, 6713355, 'order plants', NULL, 'order plants and green trellis', '2020-02-26', '2020-02-28 10:26:01', 'Melinda Babaian', 'Melinda Babaian'),
  (15561674, 7035723, 'Order Plants', 'highest', 'FOLLOW UP PLANT ORDER DELIVERY FOR MONDAY', '2020-03-02', '2020-03-02 16:54:07', 'Melinda Babaian', 'Melinda Babaian'),
  (15562090, 7185170, 'Order Pavers', 'high', 'Order Pavers for Patio, steps and border.
Confirm delivery with Frankie at Prime', '2020-02-27', '2020-02-27 15:03:29', 'Melinda Babaian', 'Melinda Babaian'),
  (15564367, 7063556, 'Order Plants', 'high', 'Follow up with quotes. Needed for Monday.', '2020-02-27', '2020-02-28 12:36:34', 'Melinda Babaian', 'Melinda Babaian'),
  (15566241, 6962273, 'lights delivery follow up', 'high', 'follow up with aquaflo. delivery for Thursday March 5th', '2020-03-03', '2020-03-02 08:24:35', 'Melinda Babaian', 'Melinda Babaian'),
  (15567210, 6829895, 'Order wood', 'high', 'Order wood for Pergola', '2020-03-02', '2020-03-02 10:47:05', 'Melinda Babaian', 'Melinda Babaian'),
  (15567730, 6962900, 'order drain', 'highest', 'order from irrigation express', '2020-02-28', '2020-02-28 10:35:18', 'Melinda Babaian', 'Melinda Babaian'),
  (15593642, 6829895, 'ORDER WOOD', 'highest', 'ORDER POSTS ASAP', '2020-03-02', '2020-03-02 10:26:09', 'Melinda Babaian', 'Melinda Babaian'),
  (15593697, 7063556, 'ORDER LIGHTS', 'highest', 'ORDER STEP LIGHTS ASAP', '2020-03-02', '2020-03-02 10:21:44', 'Melinda Babaian', 'Melinda Babaian'),
  (15593702, 7168264, 'UPLOAD 2D PLANS', 'high', 'PLEASE UPLOAD DRAWINGS', NULL, '2020-03-09 10:51:37', 'Melinda Babaian', 'Ryan Kleefisch'),
  (15593770, 5472327, 'STEPS MATERIAL', 'highest', 'Need all materials caps size in order to do the steps 
ASAP', '2020-03-02', '2020-03-03 13:52:48', 'Melinda Babaian', 'Melinda Babaian'),
  (15615221, 7237038, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2021-02-23 09:29:56', 'Melinda Babaian', NULL),
  (15615222, 7237038, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, '2021-01-06 16:05:53', 'Melinda Babaian', NULL),
  (15615223, 7237038, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (15618334, 7063556, 'Follow up irrigation express', 'high', 'Follow up irrigation express on delivery date - it will get there by Thursday.', '2020-03-04', '2020-03-05 08:44:03', 'Melinda Babaian', 'Melinda Babaian'),
  (15623126, 7185170, 'Order Pavers', 'highest', 'Order more pavers and sand', '2020-03-02', '2020-03-02 16:54:27', 'Melinda Babaian', 'Melinda Babaian'),
  (15625099, 5472327, 'Fanal to-do''s', NULL, 'Add a valve and lateral line to lawn area (if approved in change order)', NULL, NULL, NULL, NULL),
  (15629430, 7240573, '(untitled)', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, '2020-03-06 16:46:20', 'Brian Godley', NULL),
  (15629431, 7240573, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2020-03-13 12:27:21', 'Brian Godley', NULL),
  (15629432, 7240573, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (15629802, 6829895, '(untitled)', NULL, 'Material Selection

Need to finalize plants.', NULL, NULL, NULL, NULL),
  (15632348, 7035723, 'Order missing plants', 'highest', 'Order missing plants', '2020-03-03', '2020-03-02 16:56:22', 'Melinda Babaian', 'Melinda Babaian'),
  (15632631, 6962273, 'Order missing plant', 'highest', '1 5gal Wisteria ''Blue Moon''', '2020-03-03', '2020-03-02 16:56:25', 'Melinda Babaian', 'Melinda Babaian'),
  (15642413, 7063556, 'Order Material', 'high', 'order more plants. check change orders and order all material needed', '2020-03-03', '2020-03-03 13:53:15', 'Melinda Babaian', 'Melinda Babaian'),
  (15642608, 5472327, 'Order Material', 'highest', 'see daily logs', '2020-03-03', '2020-03-03 13:52:57', 'Melinda Babaian', 'Melinda Babaian'),
  (15685231, 6883019, 'Start job', 'high', 'Study project and start', '2020-03-06', '2020-03-06 13:55:14', 'Melinda Babaian', 'Melinda Babaian'),
  (15687429, 7063556, 'Schedule Mason work', NULL, 'schedule mason work and purchase material', '2020-03-16', '2020-03-16 09:20:59', 'Melinda Babaian', 'Melinda Babaian'),
  (15688827, 7267941, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, '2020-05-21 20:15:31', 'Verva Gerse', NULL),
  (15710437, 7063556, 'order missing plants', 'high', 'order missing plants', '2020-03-06', '2020-03-09 08:05:50', 'Melinda Babaian', 'Melinda Babaian'),
  (15711101, 7035723, 'follow up aquaflo for lights', 'high', NULL, '2020-03-06', '2020-03-06 09:46:14', 'Melinda Babaian', 'Melinda Babaian'),
  (15713266, 6288478, 'CALL CUSTOMER', 'high', 'CALL CUSTOMER TO SCHEDULE', '2020-03-06', '2020-03-09 10:49:15', 'Melinda Babaian', 'Melinda Babaian'),
  (15713391, 7063556, 'ORDER WALL CAP', 'high', 'Need to have juventino count stone wall ''ll and caps for the 13 linear feet needed to see how much we need', '2020-03-06', '2020-03-11 15:18:31', 'Melinda Babaian', 'Melinda Babaian'),
  (15713457, 7035723, 'ORDER PLANTS', 'highest', 'ORDER MISSING PLANTS', '2020-03-06', '2020-03-06 09:41:52', 'Melinda Babaian', 'Melinda Babaian'),
  (15713550, 4077921, 'ORDER TREE', 'highest', NULL, '2020-03-06', '2020-03-06 10:34:56', 'Melinda Babaian', 'Melinda Babaian'),
  (15716469, 5472327, 'Call vendor', 'high', 'Call vendor and ask if smooth finish is good for steps', '2020-03-06', '2020-03-06 09:32:06', 'Melinda Babaian', 'Melinda Babaian'),
  (15726038, 7035723, 'plant delivery date', NULL, 'follow up with bamboo', NULL, '2020-03-06 10:04:32', 'Melinda Babaian', NULL),
  (15734938, 6829895, 'waterproofing', 'high', 'buy bituthene waterproofing', '2020-03-09', '2020-03-09 11:04:42', 'Melinda Babaian', 'Melinda Babaian'),
  (15737550, 7063556, 'talk to Daniel', 'highest', 'pick up 4@ lantana confetti 5g', '2020-03-10', '2020-03-09 10:49:54', 'Melinda Babaian', 'Melinda Babaian'),
  (15737592, 6962900, 'follow up C&M', 'highest', 'delivery for same day', '2020-03-09', '2020-03-09 07:48:36', 'Melinda Babaian', 'Melinda Babaian'),
  (15782410, 6829895, 'ARRANGE PRIME DELIVERY', NULL, 'WHEN GUYS GO BACK ON SITE', '2020-03-16', '2020-03-16 07:52:30', 'Melinda Babaian', 'Melinda Babaian'),
  (15794535, 6883019, 'Pavers delivery date', 'highest', 'ask Frank to confirm delivery date', '2020-03-16', '2020-03-16 09:18:14', 'Melinda Babaian', 'Melinda Babaian'),
  (15794545, 7063556, 'Follow up with Prime', 'high', 'follow up with order', '2020-03-11', '2020-03-11 15:19:14', 'Melinda Babaian', 'Melinda Babaian'),
  (15794558, 5472327, 'talk to Brian', 'high', 'do wee need to order borders', '2020-03-10', '2020-03-12 10:32:06', 'Melinda Babaian', 'Melinda Babaian'),
  (15794747, 3357309, 'schedule warranty', 'high', NULL, '2020-03-11', '2020-03-11 15:19:07', 'Melinda Babaian', 'Melinda Babaian'),
  (15797045, 6219569, 'Schedule warranty', 'high', NULL, '2020-03-11', '2020-03-11 15:19:00', 'Melinda Babaian', 'Melinda Babaian'),
  (15797306, 6580546, 'SCHEDULE WARRANTY', 'high', NULL, '2020-03-11', '2020-03-11 15:19:04', 'Melinda Babaian', 'Melinda Babaian'),
  (15829441, 6829895, 'Follow up with Verva and crew', 'high', 'Check plant list and order in order to ensure we receive plants on time.', '2020-03-16', '2020-03-16 09:38:49', 'Melinda Babaian', 'Melinda Babaian'),
  (15837073, 7063516, 'Study and Schedule', NULL, NULL, '2020-03-13', '2020-03-15 10:50:54', 'Melinda Babaian', 'Melinda Babaian'),
  (15866399, 7063516, 'send plant list to nurseries', 'high', 'for price and availability', '2020-03-16', '2020-03-16 13:34:51', 'Melinda Babaian', NULL),
  (15866405, 7063556, 'lantana confetties', 'high', 'ask Daniel if he bought them and from where.', '2020-03-16', '2020-03-16 09:18:51', 'Melinda Babaian', 'Melinda Babaian'),
  (15866406, 6962273, 'find Coreopsis grandifloras', 'high', 'follow up with Verva if subs are approved.', '2020-03-16', '2020-03-16 11:15:33', 'Melinda Babaian', 'Melinda Babaian'),
  (15866409, 7168264, 'call prime for delivery', 'highest', 'call prime make sure they do not send delivery out on Monday.', '2020-03-16', '2020-03-16 09:20:42', 'Melinda Babaian', 'Melinda Babaian'),
  (15866416, 7185170, 'call greenthumb follow up order', 'highest', NULL, '2020-03-16', '2020-03-16 10:20:24', 'Melinda Babaian', 'Melinda Babaian'),
  (15866514, 6829895, 'call Prime for Delivery', 'highest', 'make sure Frank delivers on time', '2020-03-16', '2020-03-16 09:18:10', 'Melinda Babaian', 'Melinda Babaian'),
  (15866523, 6962273, 'follow up with Dan', 'low', 'did he pick up the extra pavers?', '2020-03-16', '2020-03-16 09:23:32', 'Melinda Babaian', 'Melinda Babaian'),
  (15866558, 6713355, 'schedule / timer and plants', 'high', NULL, '2020-03-16', '2020-03-17 13:59:54', 'Melinda Babaian', 'Melinda Babaian'),
  (15869152, 7185170, 'Talk to Jorge , Ryan', NULL, 'Kurapia to dymondia', '2020-03-16', '2020-03-16 10:20:30', 'Melinda Babaian', 'Melinda Babaian'),
  (15881012, 6829895, 'ORDER PLANTS', 'high', NULL, '2020-03-17', '2020-03-16 13:31:58', 'Melinda Babaian', 'Melinda Babaian'),
  (15881212, 6829895, 'ORDER ROAD BASE', 'highest', NULL, '2020-03-17', '2020-03-17 15:25:28', 'Melinda Babaian', NULL),
  (15883035, 7185170, 'ORDER MULCH,SOD', 'high', NULL, '2020-03-18', '2020-03-20 13:15:44', 'Melinda Babaian', 'Melinda Babaian'),
  (15903115, 7337311, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (15905033, 5985276, 'Follow up with Daniel. Equipment needed', 'high', NULL, '2020-03-18', '2020-03-19 08:10:09', 'Melinda Babaian', 'Melinda Babaian'),
  (15948339, 6957272, 'Order amendments', 'high', NULL, '2020-03-20', '2020-03-20 13:16:59', 'Melinda Babaian', 'Melinda Babaian'),
  (15957873, 6845509, 'Make job folders', 'low', 'Print plans - follow up with Ryan', '2020-03-23', '2020-03-24 09:42:02', 'Melinda Babaian', 'Melinda Babaian'),
  (15972971, 6713355, 'Ask Jorge for material list', 'high', NULL, '2020-03-23', '2020-03-23 11:17:19', 'Melinda Babaian', 'Melinda Babaian'),
  (15974278, 6713355, 'Order Tie wall', 'high', 'from Topanga Lumber', '2020-03-23', '2020-03-25 15:43:54', 'Melinda Babaian', 'Melinda Babaian'),
  (15977685, 7063445, 'Prepare / study', 'low', 'Make a job start folder / study / material list / project breakdown / shop around', '2020-03-24', '2020-03-24 09:42:12', 'Melinda Babaian', 'Melinda Babaian'),
  (15977740, 5145518, 'Prepare / Study', 'low', 'Make a job start folder / study / material list / project breakdown / shop around', '2020-03-24', '2020-03-24 09:42:06', 'Melinda Babaian', 'Melinda Babaian'),
  (15977742, 7237038, 'Prepare / Study', 'low', 'Make a job start folder / study / material list / project breakdown / shop around', '2020-03-24', '2020-03-24 09:42:09', 'Melinda Babaian', 'Melinda Babaian'),
  (15997814, 4312960, 'Prepare / Study', NULL, 'Make a job start folder / study / material list / project breakdown / shop around', '2020-03-25', '2020-03-24 09:42:15', 'Melinda Babaian', 'Melinda Babaian'),
  (16041915, 7396534, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2022-11-08 14:20:37', 'Nicole Antoine', NULL),
  (16041916, 7396534, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, '2022-11-08 14:20:37', 'Nicole Antoine', NULL),
  (16041917, 7396534, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2022-11-08 14:20:37', 'Nicole Antoine', NULL),
  (16055953, 7401426, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (16061428, 7402782, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (16061429, 7402782, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, NULL, NULL, NULL),
  (16061430, 7402782, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (16062030, 7402917, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2021-01-06 16:06:07', 'Melinda Babaian', NULL),
  (16062031, 7402917, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2021-01-06 16:06:03', 'Melinda Babaian', NULL),
  (16062032, 7402917, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2021-01-06 16:06:11', 'Melinda Babaian', NULL),
  (16062206, 7402945, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2020-04-30 02:11:52', 'Ryan Kleefisch', NULL),
  (16062207, 7402945, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (16062208, 7402945, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (16062233, 7396534, '(untitled)', NULL, 'Material Selection

Choose Turf', NULL, '2022-11-08 14:20:37', 'Nicole Antoine', NULL),
  (16062361, 7402917, '(untitled)', NULL, 'Material Selection

Choose Countertop color', NULL, '2021-01-06 16:06:15', 'Melinda Babaian', NULL),
  (16101967, 7396534, 'Order Artificial turf', 'highest', NULL, '2020-03-31', '2020-04-02 08:56:47', 'Melinda Babaian', 'Melinda Babaian'),
  (16104723, 7063445, 'Get quotes from subs', 'high', NULL, '2020-03-31', '2020-03-30 20:00:15', 'Melinda Babaian', 'Melinda Babaian'),
  (16108428, 7063556, 'Punch list / Front yard', NULL, 'Power wash front brick porch and remove orange paint dot', NULL, NULL, NULL, NULL),
  (16108432, 7063556, 'Punch list / Side Yard', NULL, 'Power wash and seal new pavers and curbs', NULL, NULL, NULL, NULL),
  (16108448, 7063556, 'Punch list / back yard', NULL, 'Adjust lights to shine on front of trees and water fountain', NULL, NULL, NULL, NULL),
  (16110358, 7414067, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (16110359, 7414067, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (16110360, 7414067, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (16111642, 6713355, 'Get 1 more course of tie wall', 'highest', NULL, '2020-03-31', '2020-03-31 10:07:22', 'Melinda Babaian', 'Melinda Babaian'),
  (16171616, 6678959, 'buy 8 light bulbs', NULL, NULL, NULL, '2020-04-02 15:39:12', 'Melinda Babaian', 'Melinda Babaian'),
  (16181404, 7063445, 'Order plants', NULL, 'To make sure they have in stock and deliver on time. Quotes on file.', '2020-04-13', '2020-04-15 13:35:56', 'Melinda Babaian', 'Melinda Babaian'),
  (16192612, 7478086, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (16218208, 7484154, '(untitled)', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, '2022-11-08 14:20:37', 'Nicole Antoine', NULL),
  (16218209, 7484154, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2022-11-08 14:20:37', 'Nicole Antoine', NULL),
  (16218210, 7484154, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2022-11-08 14:20:37', 'Nicole Antoine', NULL),
  (16226230, 35259913, 'Carter to meet Greg in person re: olive & column', NULL, 'Carter to meet Greg in person re: olive & column', '2026-05-05', NULL, NULL, '(.PM) Carter Godley,Brian Godley'),
  (16291578, 7168264, '(untitled)', NULL, 'plants selections', NULL, '2020-07-13 11:51:45', 'Brian Godley', 'Ryan Kleefisch'),
  (16311253, 6962273, 'Need polymeric sand', NULL, 'Sand for one paver!', NULL, NULL, NULL, NULL),
  (16334759, 7518117, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, '2020-05-21 20:16:25', 'Verva Gerse', NULL),
  (16371559, 7529832, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (16425808, 7546479, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, '2020-05-21 20:16:48', 'Verva Gerse', NULL),
  (16501276, 7567551, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (16501277, 7567551, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (16501278, 7567551, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, NULL, NULL, NULL),
  (16515412, 7571586, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2022-11-08 14:20:51', 'Nicole Antoine', NULL),
  (16515413, 7571586, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, '2022-11-08 14:20:51', 'Nicole Antoine', NULL),
  (16515414, 7571586, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2022-11-08 14:20:51', 'Nicole Antoine', NULL),
  (16531808, 7577238, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2020-04-24 14:31:19', 'Brian Godley', NULL),
  (16531809, 7577238, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2020-05-12 11:16:45', 'Brian Godley', NULL),
  (16531810, 7577238, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2020-07-03 17:10:40', 'Brian Godley', NULL),
  (16532691, 7577238, 'Material To Do', NULL, 'Client wants to add light to Pergola.  Need to pick out choice.', NULL, '2020-05-12 11:16:20', 'Brian Godley', NULL),
  (16532745, 7567551, 'Material Selection', NULL, 'Need Paver Choice', NULL, NULL, NULL, NULL),
  (16556356, 7582058, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (16618265, 7606106, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (16804721, 7666319, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2020-05-13 15:32:30', 'Brian Godley', NULL),
  (16804722, 7666319, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2021-01-06 16:06:23', 'Melinda Babaian', NULL),
  (16804723, 7666319, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (16863574, 7682815, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2020-05-20 11:22:05', 'Ryan Kleefisch', NULL),
  (16863575, 7682815, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2022-11-08 14:20:51', 'Nicole Antoine', NULL),
  (16863576, 7682815, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2022-11-08 14:20:51', 'Nicole Antoine', NULL),
  (16873129, 7685954, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2021-01-06 16:06:31', 'Melinda Babaian', NULL),
  (16873130, 7685954, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2021-01-06 16:06:35', 'Melinda Babaian', NULL),
  (16873131, 7685954, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2021-01-06 16:06:38', 'Melinda Babaian', NULL),
  (16873226, 7685978, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (16873227, 7685978, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, NULL, NULL, NULL),
  (16873228, 7685978, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (16874573, 7666319, 'Material Selection', NULL, 'Need paver choices for driveway.', NULL, '2021-01-06 16:06:28', 'Melinda Babaian', NULL),
  (16875823, 7687226, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (16875824, 7687226, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (16875825, 7687226, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (16876244, 7687226, 'Material Selection', NULL, 'Need stucco color', NULL, NULL, NULL, NULL),
  (16900067, 7694991, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2020-05-20 12:14:20', 'Ryan Kleefisch', NULL),
  (16900068, 7694991, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, NULL, NULL, NULL),
  (16900069, 7694991, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (16902616, 7695482, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2020-05-21 20:18:00', 'Verva Gerse', NULL),
  (16902617, 7695482, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, '2020-07-03 17:05:21', 'Brian Godley', NULL),
  (16902618, 7695482, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2020-07-03 17:05:52', 'Brian Godley', NULL),
  (16914950, 7267941, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2020-05-21 20:14:28', 'Verva Gerse', NULL),
  (16914951, 7267941, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (16914952, 7267941, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (16992920, 7718842, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2020-05-29 09:44:58', 'Brian Godley', NULL),
  (16992921, 7718842, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2021-05-08 12:59:19', 'Melinda Babaian', NULL),
  (16992922, 7718842, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2021-05-08 12:59:20', 'Melinda Babaian', NULL),
  (17023691, 7728345, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2022-11-08 14:20:51', 'Nicole Antoine', NULL),
  (17023692, 7728345, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2022-11-08 14:20:51', 'Nicole Antoine', NULL),
  (17023693, 7728345, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2022-11-08 14:20:51', 'Nicole Antoine', NULL),
  (17054250, 7740536, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (17066955, 7743794, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (17066956, 7743794, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (17066957, 7743794, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (17074284, 7748494, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (17074285, 7748494, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (17074286, 7748494, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (17078456, 7748778, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (17078457, 7748778, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (17078458, 7748778, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (17120701, 7760257, 'All choices Made', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (17120702, 7760257, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (17120703, 7760257, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (17134718, 7763254, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2020-06-09 19:47:28', 'Ryan Kleefisch', NULL),
  (17134719, 7763254, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (17134720, 7763254, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (17150416, 7767687, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (17290698, 7799379, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2020-06-08 15:08:56', 'Brian Godley', NULL),
  (17290699, 7799379, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, '2021-01-06 16:06:41', 'Melinda Babaian', NULL),
  (17290700, 7799379, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (17294445, 7799925, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2020-07-13 12:02:26', 'Ryan Kleefisch', NULL),
  (17294446, 7799925, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, NULL, NULL, NULL),
  (17294447, 7799925, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, NULL, NULL, NULL),
  (17321539, 7808502, 'Houli to do', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2020-06-15 09:39:35', 'Verva Gerse', NULL),
  (17321540, 7808502, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, '2020-08-19 12:02:06', 'Melinda Babaian', 'Melinda Babaian'),
  (17321541, 7808502, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2020-08-23 12:28:54', 'Melinda Babaian', NULL),
  (17453723, 7851158, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (17454183, 7851219, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (17454274, 7851256, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (17454484, 7851305, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (17459442, 7763254, 'grass selection', NULL, 'owner needs to select', NULL, NULL, NULL, 'Ryan Kleefisch'),
  (17459475, 7763254, 'rock selection', NULL, 'need to show samples', NULL, NULL, NULL, 'Ryan Kleefisch'),
  (17519701, 7870638, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (17552587, 7882418, '(untitled)', 'high', 'Design Steps

Create a Base Sheet', NULL, '2020-10-18 12:44:49', 'Nicole Antoine', NULL),
  (17607236, 7903624, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2020-06-16 15:54:38', 'Ryan Kleefisch', NULL),
  (17607237, 7903624, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (17607238, 7903624, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (17623523, 7908727, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (17627026, 7909383, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2020-07-13 12:02:01', 'Ryan Kleefisch', NULL),
  (17627027, 7909383, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, '2020-08-06 10:24:46', 'Melinda Babaian', NULL),
  (17627028, 7909383, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2020-09-25 08:49:37', 'Melinda Babaian', NULL),
  (17640813, 7913784, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (17650995, 7916075, 'All Choices Made', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2020-07-06 21:20:17', 'Verva Gerse', NULL),
  (17650996, 7916075, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2021-09-30 14:47:09', 'Melinda Babaian', NULL),
  (17650997, 7916075, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2021-09-30 14:47:10', 'Melinda Babaian', NULL),
  (17662350, 7919283, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (17662351, 7919283, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (17662352, 7919283, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (17678153, 7924028, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (17698774, 7928625, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (17698775, 7928625, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (17698776, 7928625, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (17706807, 7930414, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (17714354, 7931614, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (17714355, 7931614, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, NULL, NULL, NULL),
  (17714356, 7931614, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (17739093, 7937001, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (17773561, 7945965, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (17808616, 7958649, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (17880784, 7981668, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (17880785, 7981668, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, NULL, NULL, NULL),
  (17880786, 7981668, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (17919214, 7991905, 'Design Steps', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, '2020-09-28 15:39:34', 'Nicole Antoine', NULL),
  (17923663, 7992946, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, '2020-09-02 09:14:05', 'Nicole Antoine', NULL),
  (17966761, 8006445, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (17967348, 8006570, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2020-07-28 10:20:58', 'Ryan Kleefisch', NULL),
  (17967349, 8006570, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2020-08-26 12:36:07', 'Melinda Babaian', 'Melinda Babaian'),
  (17967350, 8006570, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2020-10-17 18:26:53', 'Melinda Babaian', NULL),
  (17969766, 8007645, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (17989049, 7168264, 'Final Punch list', NULL, 'Patch hole on wall by bench in play area (bring white stucco and appropriate stucco tools)', NULL, '2021-05-07 16:03:01', 'Melinda Babaian', NULL),
  (17990330, 7695482, 'Punchlist', NULL, 'add drip for two plants', NULL, NULL, NULL, '(.PM) Jorge Flores'),
  (18022610, 8048377, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (18022834, 8048448, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (18022891, 8048471, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, '2020-12-09 14:17:04', 'Melinda Babaian', NULL),
  (18022964, 8048485, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (18023072, 7760257, 'All to dos done', NULL, NULL, NULL, '2020-07-06 21:12:56', 'Verva Gerse', NULL),
  (18049213, 8055751, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, '2020-09-01 15:22:30', 'Nicole Antoine', NULL),
  (18072370, 7743794, 'Final punch list', NULL, '1- pressure wash drive way (pressure washer is at site)', NULL, NULL, NULL, NULL),
  (18080287, 7571586, 'Seal bench', NULL, 'Seal bench (semigloss sealer) need sealer, roller and pump see images', NULL, NULL, NULL, 'Maximino Sanchez'),
  (18088032, 8071515, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2020-08-18 14:30:30', 'Brian Godley', NULL),
  (18088033, 8071515, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, '2021-01-06 16:06:54', 'Melinda Babaian', NULL),
  (18088034, 8071515, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2021-01-06 16:06:57', 'Melinda Babaian', NULL),
  (18106826, 8077649, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, '2020-09-02 09:13:56', 'Nicole Antoine', NULL),
  (18127021, 8082324, '(untitled)', NULL, 'Job Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2020-07-23 11:25:59', 'Carter Godley', NULL),
  (18127022, 8082324, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (18127023, 8082324, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (18277401, 8124062, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, '2020-09-01 15:18:01', 'Nicole Antoine', NULL),
  (18323172, 8136753, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (18323242, 8136781, 'All Choices Made', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2020-07-21 15:59:37', 'Verva Gerse', NULL),
  (18323243, 8136781, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2020-08-19 09:22:45', 'Melinda Babaian', NULL),
  (18323244, 8136781, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2020-08-22 12:23:01', 'Melinda Babaian', NULL),
  (18346972, 8145255, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, '2020-09-09 20:13:31', 'Nicole Antoine', '(HR) Mo Solomon'),
  (18354002, 8147083, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (18365668, 8151227, 'All Docs uploaded', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2020-08-28 09:02:41', 'Verva Gerse', NULL),
  (18365669, 8151227, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2020-09-11 16:19:15', 'Melinda Babaian', NULL),
  (18365670, 8151227, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2020-12-09 11:29:36', 'Melinda Babaian', NULL),
  (18401631, 8160247, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2021-09-04 12:12:03', 'Melinda Babaian', NULL),
  (18401632, 8160247, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2021-09-04 12:12:05', 'Melinda Babaian', NULL),
  (18401633, 8160247, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (18401659, 8160256, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2020-07-28 23:31:46', 'Ryan Kleefisch', NULL),
  (18401660, 8160256, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, '2020-08-24 10:35:51', 'Melinda Babaian', NULL),
  (18401661, 8160256, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2020-09-16 18:30:58', 'Melinda Babaian', NULL),
  (18401672, 8160266, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (18421841, 8164913, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (18454764, 7748778, '(untitled)', NULL, 'I need 1 yard 3/4" crushed gravel 
1 5gal. Henrys water proof', NULL, NULL, NULL, NULL),
  (18492048, 8182294, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, '2020-09-03 15:44:59', 'Nicole Antoine', NULL),
  (18575999, 8203699, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (18678207, 8230539, '(untitled)', NULL, 'Job Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (18678208, 8230539, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2020-09-21 12:02:08', 'Melinda Babaian', NULL),
  (18678209, 8230539, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2020-10-02 13:23:46', 'Melinda Babaian', NULL),
  (18702406, 8236436, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (18703801, 8237000, 'All Choices Made', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2020-08-06 13:42:54', 'Verva Gerse', NULL),
  (18703802, 8237000, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2020-08-27 11:03:15', 'Jorge Flores', NULL),
  (18703803, 8237000, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (18706695, 8237712, 'All Docs uploaded', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2020-08-18 09:28:05', 'Verva Gerse', NULL),
  (18706696, 8237712, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, '2020-08-31 09:42:55', 'Melinda Babaian', NULL),
  (18706697, 8237712, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2020-09-10 15:12:31', 'Melinda Babaian', NULL),
  (18739516, 8245875, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (18777720, 8254081, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (18777951, 8254133, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (18836446, 8274743, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (18836475, 8274761, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (18841330, 8275694, 'All Docs uploaded', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2020-08-18 00:48:58', 'Verva Gerse', NULL),
  (18841331, 8275694, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (18841332, 8275694, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (18874582, 8283798, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2020-12-09 14:17:08', 'Melinda Babaian', NULL),
  (18874583, 8283798, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2020-10-08 16:13:00', 'Melinda Babaian', NULL),
  (18874584, 8283798, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2020-10-22 10:04:32', 'Melinda Babaian', NULL),
  (18923646, 8295596, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2020-08-17 09:50:08', 'Ryan Kleefisch', NULL),
  (18923647, 8295596, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, '2020-09-03 09:13:59', 'Melinda Babaian', NULL),
  (18923648, 8295596, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2020-09-14 15:22:05', 'Melinda Babaian', NULL),
  (18946863, 8300808, 'All Docs uploaded', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2020-11-14 14:52:16', 'Verva Gerse', NULL),
  (18946864, 8300808, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2021-08-12 10:31:54', 'Melinda Babaian', NULL),
  (18946865, 8300808, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2021-09-04 12:18:03', 'Melinda Babaian', NULL),
  (18947063, 8300857, 'All doc uploaded', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2020-08-17 23:39:58', 'Verva Gerse', NULL),
  (18947064, 8300857, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2020-10-26 12:36:39', 'Melinda Babaian', NULL),
  (18947065, 8300857, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2020-12-19 13:27:11', 'Melinda Babaian', NULL),
  (18947260, 8300912, '(untitled)', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, '2020-08-19 14:44:29', 'Ryan Kleefisch', NULL),
  (18947261, 8300912, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (18947262, 8300912, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (18971324, 8307830, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (18971325, 8307830, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, NULL, NULL, NULL),
  (18971326, 8307830, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, NULL, NULL, NULL),
  (18973229, 8309666, '(untitled)', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, '2020-12-09 14:17:13', 'Melinda Babaian', NULL),
  (18973230, 8309666, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, '2020-11-23 10:49:56', 'Melinda Babaian', NULL),
  (18973231, 8309666, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2020-12-31 12:32:18', 'Juan Rodriguez', NULL),
  (18977938, 8310771, 'All Docs uploaded', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2020-09-02 08:42:05', 'Verva Gerse', NULL),
  (18977939, 8310771, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2020-09-09 09:05:02', 'Melinda Babaian', NULL),
  (18977940, 8310771, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2020-10-02 08:40:37', 'Melinda Babaian', NULL),
  (18999393, 7808502, 'Punch list', NULL, 'Alejandro Replace broken paver', NULL, '2020-08-23 12:29:14', 'Melinda Babaian', NULL),
  (19006116, 8319489, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (19006281, 8319520, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (19006371, 8319546, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (19006431, 8319562, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (19042840, 8330556, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2021-06-08 09:24:33', 'Melinda Babaian', NULL),
  (19042841, 8330556, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, '2021-06-08 09:24:35', 'Melinda Babaian', NULL),
  (19042842, 8330556, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (19058579, 8336540, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (19070502, 8136781, 'Punch list', NULL, 'Give customer change order for adding drainage', NULL, NULL, NULL, NULL),
  (19131039, 8356030, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2020-08-25 15:02:50', 'Ryan Kleefisch', NULL),
  (19131040, 8356030, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (19131041, 8356030, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (19145192, 8359175, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (19154496, 8362337, 'Recievd HOA Approval', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2020-10-08 14:21:41', 'Verva Gerse', NULL),
  (19154497, 8362337, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2020-11-06 08:59:09', 'Fredy Lopez', NULL),
  (19154498, 8362337, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (19166560, 8365662, '(untitled)', 'low', 'Design Steps

Get Budget', NULL, '2022-11-08 14:18:42', 'Nicole Antoine', NULL),
  (19222676, 8379317, 'Recieved HOA Approval', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2020-10-06 12:09:26', 'Verva Gerse', NULL),
  (19222677, 8379317, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2020-11-09 11:34:14', 'Melinda Babaian', NULL),
  (19222678, 8379317, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2020-12-09 14:17:23', 'Melinda Babaian', NULL),
  (19255779, 8386992, 'All Docs uploaded', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2020-08-31 13:06:11', 'Verva Gerse', NULL),
  (19255780, 8386992, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (19255781, 8386992, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (19261298, 8048471, 'Sales To Do', NULL, NULL, NULL, '2020-08-31 14:42:09', 'Verva Gerse', NULL),
  (19287599, 8396282, 'All Docs uploaded', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2020-09-01 12:52:32', 'Verva Gerse', NULL),
  (19287600, 8396282, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2020-09-29 17:29:29', 'Melinda Babaian', NULL),
  (19287601, 8396282, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2020-10-12 14:47:59', 'Melinda Babaian', NULL),
  (19292248, 8399331, '(untitled)', NULL, 'Sales Prep

10. Notes on any permits, HOA and engineering need to be put in a Daily Log.', NULL, '2020-09-09 13:23:53', 'Nicole Antoine', '(HR) Mo Solomon'),
  (19292249, 8399331, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2020-09-28 10:45:05', 'Melinda Babaian', NULL),
  (19292250, 8399331, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2020-10-13 13:58:23', 'Melinda Babaian', NULL),
  (19299916, 8401360, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2020-10-31 01:45:40', 'Ryan Kleefisch', NULL),
  (19299917, 8401360, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (19299918, 8401360, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (19319466, 8406571, '(untitled)', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, '2020-09-14 18:06:27', 'Nicole Antoine', '(HR) Mo Solomon'),
  (19319467, 8406571, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, '2020-09-22 15:41:42', 'Melinda Babaian', NULL),
  (19319468, 8406571, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2020-10-23 11:45:40', 'Melinda Babaian', NULL),
  (19347640, 8414885, 'All Docs uploaded', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2020-09-03 13:30:33', 'Verva Gerse', NULL),
  (19347641, 8414885, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2020-10-16 13:03:28', 'Melinda Babaian', NULL),
  (19347642, 8414885, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2020-11-02 15:28:07', 'Melinda Babaian', NULL),
  (19356558, 8418323, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (19373850, 8424736, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2020-09-11 15:39:58', 'Nicole Antoine', '(HR) Mo Solomon'),
  (19373851, 8424736, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2020-10-15 08:29:57', 'Nicole Antoine', NULL),
  (19373852, 8424736, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2021-09-04 12:18:09', 'Melinda Babaian', NULL),
  (19455225, 8444451, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2020-09-15 12:21:14', 'Ryan Kleefisch', NULL),
  (19455226, 8444451, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, '2020-10-09 11:08:36', 'Melinda Babaian', NULL),
  (19455227, 8444451, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2020-10-16 13:03:11', 'Melinda Babaian', NULL),
  (19455338, 8444500, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (19455546, 8444537, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (19458170, 8445141, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2020-09-18 16:09:14', 'Nicole Antoine', '(HR) Mo Solomon,Nicole Antoine'),
  (19458171, 8445141, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2020-10-15 08:29:04', 'Nicole Antoine', NULL),
  (19458172, 8445141, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2022-11-08 14:20:51', 'Nicole Antoine', NULL),
  (19497695, 8455994, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2020-09-29 14:50:20', 'Ryan Kleefisch', NULL),
  (19497696, 8455994, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (19497697, 8455994, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, NULL, NULL, NULL),
  (19516911, 8424736, 'Materials List', NULL, 'Lights, color is black, style # unknown', NULL, '2020-09-11 15:53:15', 'Nicole Antoine', '(.PM) Carter Godley'),
  (19518582, 8406571, 'Materials To-Do List', NULL, 'Confirm Natural Grey for stepping pavers', NULL, '2020-09-22 15:42:21', 'Melinda Babaian', '(.PM) Carter Godley'),
  (19518852, 8424736, 'Materials To-Do List', NULL, 'Black up lights and black step lights, need style # from Vista. I sent her some options just need to firm up', NULL, '2020-09-14 18:05:32', 'Nicole Antoine', '(.PM) Carter Godley'),
  (19541804, 8160256, 'Job Completion', NULL, 'Add lava rocks to fire pit', NULL, '2020-09-21 18:44:45', 'Melinda Babaian', NULL),
  (19555877, 8470970, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2020-09-18 16:10:57', 'Nicole Antoine', '(HR) Mo Solomon'),
  (19555878, 8470970, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, '2020-10-15 08:30:11', 'Nicole Antoine', NULL),
  (19555879, 8470970, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2021-08-12 10:31:37', 'Melinda Babaian', NULL),
  (19578713, 4312960, 'Punchlist', NULL, 'Check irrigation.  Move head so not spraying on Ipe', NULL, NULL, NULL, NULL),
  (19594522, 8483081, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (19595694, 8483337, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2020-09-15 14:49:21', 'Ryan Kleefisch', NULL),
  (19595695, 8483337, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, NULL, NULL, NULL),
  (19595696, 8483337, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (19612306, 8489469, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2020-10-09 17:24:55', 'Dana Weinroth', NULL),
  (19612307, 8489469, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, '2020-11-05 12:08:53', 'Melinda Babaian', NULL),
  (19612308, 8489469, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2020-11-20 13:12:19', 'Melinda Babaian', NULL),
  (19627865, 8445141, 'Materials To-Do', NULL, 'Courtyard in Dark Grey/Pewter w/ soldier course border stone.6" rise up to the circle.', NULL, '2020-11-05 17:52:09', 'Nicole Antoine', '(.PM) Carter Godley'),
  (19677690, 8310771, 'Completion', NULL, 'Install missing plants', NULL, '2020-10-02 08:40:59', 'Melinda Babaian', NULL),
  (19679937, 8006570, 'Completion', NULL, 'Pick up bathroom', NULL, NULL, NULL, NULL),
  (19683305, 8511461, 'All Docs uploaded', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2020-09-18 17:21:04', 'Verva Gerse', NULL),
  (19683306, 8511461, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (19683307, 8511461, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (19701790, 7402917, 'Punchlist', NULL, 'Clean up Steps', NULL, '2021-01-06 16:06:19', 'Melinda Babaian', NULL),
  (19746868, 8237000, 'Punch List', NULL, 'Put Cap on ABS pipe', NULL, NULL, NULL, NULL),
  (19751376, 8458328, 'Garage repair', NULL, 'frame garage opening', NULL, '2020-12-01 14:00:04', 'Kevin Godley - Winthrop', 'Kevin Godley - Winthrop'),
  (19751819, 8458328, 'New front door', NULL, NULL, NULL, '2020-12-01 13:59:58', 'Kevin Godley - Winthrop', 'Kevin Godley - Winthrop'),
  (19751826, 8458328, 'repoint chimney', NULL, NULL, NULL, NULL, NULL, 'Kevin Godley - Winthrop'),
  (19751846, 8458328, '3 new mirrored sliders', NULL, '96 x 80 sliders will fit. Available at Lowe''s', NULL, '2020-12-06 07:49:02', 'Kevin Godley - Winthrop', 'Kevin Godley - Winthrop'),
  (19751858, 8458328, 'Add mushroom cap to sewer clean out', NULL, NULL, NULL, NULL, NULL, 'Kevin Godley - Winthrop'),
  (19751865, 8458328, 'New vinyl flooring throughout', NULL, NULL, NULL, '2020-12-01 13:59:55', 'Kevin Godley - Winthrop', 'Kevin Godley - Winthrop'),
  (19751871, 8458328, 'New door casings and base', NULL, NULL, NULL, '2020-12-06 07:48:23', 'Kevin Godley - Winthrop', 'Kevin Godley - Winthrop'),
  (19751881, 8458328, 'Repair one room entry door', NULL, NULL, NULL, '2020-12-01 13:59:33', 'Kevin Godley - Winthrop', 'Kevin Godley - Winthrop'),
  (19751916, 8458328, 'Need door knobs interior throughout', NULL, NULL, NULL, NULL, NULL, 'Kevin Godley - Winthrop'),
  (19751929, 8458328, 'Scrape ceilings and re-texture', NULL, NULL, NULL, '2020-12-01 13:59:29', 'Kevin Godley - Winthrop', 'Kevin Godley - Winthrop'),
  (19752287, 8458328, 'Replaster and retile pool', NULL, NULL, NULL, NULL, NULL, 'Kevin Godley - Winthrop'),
  (19752290, 8458328, 'Add new pool equipment rewire and replumb', NULL, NULL, NULL, '2020-12-01 14:00:15', 'Kevin Godley - Winthrop', 'Kevin Godley - Winthrop'),
  (19752384, 8458328, 'Add new skimmer box', NULL, NULL, NULL, '2020-12-01 14:00:13', 'Kevin Godley - Winthrop', 'Kevin Godley - Winthrop'),
  (19752389, 8458328, 'Add new Vortx drain', NULL, NULL, NULL, NULL, NULL, 'Kevin Godley - Winthrop'),
  (19752402, 8458328, 'Demo new decking Pergola and patio covering', NULL, NULL, NULL, '2020-09-27 18:59:12', 'Kevin Godley - Winthrop', 'Kevin Godley - Winthrop'),
  (19752413, 8458328, 'Cold  glazing for master bath and guest bath tub', NULL, NULL, NULL, '2020-12-10 20:52:41', 'Kevin Godley - Winthrop', 'Kevin Godley - Winthrop'),
  (19752490, 8458328, 'Remove and replace lighting with recessed throughout', NULL, NULL, NULL, '2020-12-06 07:48:30', 'Kevin Godley - Winthrop', 'Kevin Godley - Winthrop'),
  (19786224, 7240573, 'Jute Erosion Control Netting for front slope', NULL, 'Jorge, just a reminder..thanks', NULL, NULL, NULL, '(.PM) Jorge Flores'),
  (19839335, 8554151, '(untitled)', NULL, 'Job Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (19839336, 8554151, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (19839337, 8554151, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (19861194, 8458328, 'pool replastered', NULL, NULL, NULL, '2020-12-10 20:52:53', 'Kevin Godley - Winthrop', 'Kevin Godley - Winthrop'),
  (19861196, 8458328, 'Pour backyard cement pool decking', NULL, NULL, NULL, '2020-12-01 13:59:51', 'Kevin Godley - Winthrop', 'Kevin Godley - Winthrop'),
  (19861198, 8458328, 'Build pool equipment wall', NULL, NULL, NULL, '2020-12-01 14:00:09', 'Kevin Godley - Winthrop', 'Kevin Godley - Winthrop'),
  (19861201, 8458328, 'Backyard landscaping', NULL, NULL, NULL, NULL, NULL, 'Kevin Godley - Winthrop'),
  (19861202, 8458328, 'Backyard turf and gravel', NULL, NULL, NULL, NULL, NULL, 'Kevin Godley - Winthrop'),
  (19861208, 8458328, 'Remove all gutters and TV antenna', NULL, NULL, NULL, '2020-12-01 13:59:47', 'Kevin Godley - Winthrop', 'Kevin Godley - Winthrop'),
  (19861210, 8458328, 'Choose exterior colors for paint', NULL, NULL, NULL, '2020-12-10 20:52:38', 'Kevin Godley - Winthrop', 'Kevin Godley - Winthrop'),
  (19878623, 8563042, 'All Docs uploaded', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2020-09-28 12:03:09', 'Verva Gerse', NULL),
  (19878624, 8563042, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, NULL, NULL, NULL),
  (19878625, 8563042, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (19918246, 8576758, '(untitled)', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, '2020-09-29 17:59:25', 'Ryan Kleefisch', NULL),
  (19918247, 8576758, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2020-10-21 13:41:35', 'Melinda Babaian', NULL),
  (19918248, 8576758, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2020-11-20 11:25:21', 'Melinda Babaian', NULL),
  (19920411, 8577296, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (19953338, 8585241, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2020-10-08 16:55:48', 'Nicole Antoine', '(HR) Mo Solomon'),
  (19953339, 8585241, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2020-11-16 10:55:17', 'Melinda Babaian', NULL),
  (19953340, 8585241, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2020-12-14 14:49:30', 'Melinda Babaian', NULL),
  (19957308, 8585952, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (20011627, 8602934, 'All Docs uploaded', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2020-10-05 16:16:42', 'Verva Gerse', NULL),
  (20011628, 8602934, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (20011629, 8602934, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (20011758, 8602967, 'All Docs uploaded', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2020-10-05 16:18:46', 'Verva Gerse', NULL),
  (20011759, 8602967, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2020-12-21 12:45:43', 'Melinda Babaian', NULL),
  (20011760, 8602967, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2021-01-22 12:43:28', 'Melinda Babaian', NULL),
  (20055700, 8614611, '(3 Job Prep) Kaczenski, Chester', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2020-12-11 15:44:39', 'Melinda Babaian', NULL),
  (20055701, 8614611, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, '2020-12-11 15:44:34', 'Melinda Babaian', NULL),
  (20055702, 8614611, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2021-01-20 14:45:46', 'Melinda Babaian', NULL),
  (20057801, 8615207, '(untitled)', NULL, 'Project is ready for project planning

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2020-10-05 17:08:33', 'Dana Weinroth', NULL),
  (20057802, 8615207, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (20057803, 8615207, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (20114764, 8630793, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, '2020-12-09 14:17:38', 'Melinda Babaian', NULL),
  (20115479, 8630833, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2020-10-08 17:41:04', 'Ryan Kleefisch', NULL),
  (20115480, 8630833, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, '2021-08-12 10:29:30', 'Melinda Babaian', NULL),
  (20115481, 8630833, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2021-09-04 12:17:02', 'Melinda Babaian', NULL),
  (20115595, 8630879, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (20116033, 8631009, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (20179530, 8647469, 'All Docs uploaded', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, '2020-10-13 13:43:16', 'Verva Gerse', NULL),
  (20179531, 8647469, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2020-11-10 12:51:22', 'Melinda Babaian', NULL),
  (20179532, 8647469, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2020-11-19 14:00:52', 'Melinda Babaian', NULL),
  (20221856, 8082324, 'Final', NULL, '1- fire pit needs plumbing 
1 - 1/2"x14" niple 
1- 1/2" 90
1- 1/2" cupling
1- 1/2"x6" nope
1- 24x24 fire ring (in warehouse) 

2- back fill fire pit with gravel, and lava rock (will need about 6 10-12 inch see image 

3- finish electrical on BBQ 

4- install appliances on BBQ 

5- sod install', NULL, NULL, NULL, NULL),
  (20257935, 8668349, 'All Docs uploaded', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2020-11-14 14:57:57', 'Verva Gerse', NULL),
  (20257936, 8668349, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2021-03-19 13:58:00', 'Melinda Babaian', NULL),
  (20257937, 8668349, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2021-03-19 13:57:59', 'Melinda Babaian', NULL),
  (20261105, 8489469, 'Project is ready for planning', NULL, NULL, NULL, NULL, NULL, NULL),
  (20317616, 8690168, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (20345264, 8697687, 'All Docs uploaded', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2020-11-14 14:53:33', 'Verva Gerse', NULL),
  (20345265, 8697687, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2020-12-15 18:07:43', 'Melinda Babaian', NULL),
  (20345266, 8697687, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2021-02-08 15:50:16', 'Melinda Babaian', NULL),
  (20406749, 8713437, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2020-10-26 12:46:57', 'Dana Weinroth', NULL),
  (20406750, 8713437, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2020-12-09 14:17:46', 'Melinda Babaian', NULL),
  (20406751, 8713437, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2020-12-11 15:51:09', 'Melinda Babaian', NULL),
  (20478281, 8739112, '(untitled)', NULL, 'Job Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2021-09-04 12:16:08', 'Melinda Babaian', NULL),
  (20478282, 8739112, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2021-03-26 07:58:15', 'Melinda Babaian', NULL),
  (20478283, 8739112, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2021-09-04 12:16:09', 'Melinda Babaian', NULL),
  (20571839, 8769652, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2020-11-10 11:33:11', 'Ryan Kleefisch', NULL),
  (20571840, 8769652, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, '2021-02-22 16:13:11', 'Jorge Flores', NULL),
  (20571841, 8769652, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2021-02-22 16:13:05', 'Jorge Flores', NULL),
  (20602602, 8739112, 'Man Days', NULL, 'approx 27 Days', NULL, '2021-09-04 12:16:10', 'Melinda Babaian', NULL),
  (20603809, 8776955, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (20603810, 8776955, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (20603811, 8776955, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (20603874, 8776995, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (20733016, 8813960, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2020-11-12 15:47:35', 'Ryan Kleefisch', NULL),
  (20733017, 8813960, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, '2020-12-14 10:53:50', 'Melinda Babaian', NULL),
  (20733018, 8813960, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2021-01-19 18:16:41', 'Melinda Babaian', NULL),
  (20734187, 8814254, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (20737828, 8815412, 'All Docs uploaded', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2020-11-14 14:54:36', 'Verva Gerse', NULL),
  (20737829, 8815412, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2020-12-09 14:18:33', 'Melinda Babaian', NULL),
  (20737830, 8815412, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2020-12-09 14:18:29', 'Melinda Babaian', NULL),
  (20791542, 8833190, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (20794277, 8445141, 'Job Completion To-Do List', NULL, 'Please sync with Jorge for any additional outstanding items. See photos of drain and edging in daily logs.

Straighten brown edging and add stakes (if rock does not)', NULL, '2022-11-08 14:21:02', 'Nicole Antoine', NULL),
  (20813365, 8841662, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2020-11-06 15:07:52', 'Ryan Kleefisch', NULL),
  (20813366, 8841662, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2021-01-06 08:10:41', 'Melinda Babaian', NULL),
  (20813367, 8841662, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2021-01-18 16:49:34', 'Melinda Babaian', NULL),
  (20878316, 8866050, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (20975903, 8896008, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (20975936, 8896010, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (21015785, 8909247, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (21073750, 8926582, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2020-11-18 13:06:50', 'Ryan Kleefisch', NULL),
  (21073751, 8926582, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2020-12-15 10:37:06', 'Melinda Babaian', NULL),
  (21073752, 8926582, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2020-12-19 14:15:17', 'Melinda Babaian', NULL),
  (21078294, 8927845, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (21211728, 8961733, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, '2021-01-03 20:26:13', 'Nicole Antoine', NULL),
  (21214551, 8962358, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2020-12-03 13:07:08', 'Nicole Antoine', '(HR) Mo Solomon'),
  (21214552, 8962358, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2021-02-02 13:31:30', 'Nicole Antoine', NULL),
  (21214553, 8962358, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2021-02-02 13:46:35', 'Melinda Babaian', NULL),
  (21289890, 8554151, 'Contract Addendum for Grayson Project', 'high', 'I deleted the pergola from the project just before our start date.  This will affect her payments...we should discuss', NULL, NULL, NULL, '(HR) Mo Solomon'),
  (21300361, 8163146, 'Stucco repair', NULL, 'Some how stucco got damaged 
Needs to be repaired.', NULL, NULL, NULL, NULL),
  (21303076, 8962358, 'Material To-Do List', 'high', '(25) Stepstone 2'' x 2'' in French Grey (VERANOstone finish) has longer lead time, need to order asap', '2020-12-23', '2021-01-06 16:03:17', 'Melinda Babaian', '(.PM) Carter Godley,(HR) Mo Solomon'),
  (21315631, 8458328, 'Build side gates', NULL, 'Front gate is 44 inches wide 5 feet tall
Back side gate 47 1/2 inches wide
Front left hand side gate 44 1/2 My 5 feet tall', NULL, NULL, NULL, 'Kevin Godley - Winthrop'),
  (21316263, 8458328, 'Replace front windows', NULL, 'Interior measurements 35 1/2 x 59" master bedroom. 48 x 59" front bedroom
Exterior measurements 36 x 59 1/2 and 48 x 59 1/2', NULL, NULL, NULL, 'Kevin Godley - Winthrop'),
  (21316394, 8458328, 'And master shower slider', NULL, '47 1/2 x 63', NULL, NULL, NULL, 'Kevin Godley - Winthrop'),
  (21446223, 9021894, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (21475919, 8713437, '(untitled)', NULL, 'Pls leave a few extra pavers for the client', NULL, '2020-12-09 14:18:16', 'Melinda Babaian', NULL),
  (21521481, 8713437, 'Calla Lilies to be Picked up', NULL, 'I have (2) 5g white Calla Lilies on hold at Topanga Nursery /10538 CA-27, Chatsworth, CA 91311  and they will need to be picked up.
Carter, can you pls call them to make payment arrangements?
(818) 280-6500', NULL, '2020-12-11 15:51:13', 'Melinda Babaian', NULL),
  (21592590, 9067501, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2021-05-08 12:57:34', 'Melinda Babaian', NULL),
  (21592591, 9067501, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2021-05-08 12:57:32', 'Melinda Babaian', NULL),
  (21592592, 9067501, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2021-05-28 20:28:32', 'Melinda Babaian', NULL),
  (21593032, 9067548, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2021-09-04 12:12:09', 'Melinda Babaian', NULL),
  (21593033, 9067548, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2021-09-04 12:12:13', 'Melinda Babaian', NULL),
  (21593034, 9067548, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2023-01-17 12:57:50', 'Nicole Antoine', '(.PM) Jorge Flores'),
  (21664919, 9089392, 'All Docs uploaded', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2020-12-28 15:52:39', 'Verva Gerse', NULL),
  (21664920, 9089392, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (21664921, 9089392, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (21689547, 9096076, '(untitled)', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, '2021-01-06 16:03:47', 'Melinda Babaian', NULL),
  (21689548, 9096076, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2021-01-06 16:03:40', 'Melinda Babaian', NULL),
  (21689549, 9096076, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2021-01-06 16:03:53', 'Melinda Babaian', NULL),
  (21771472, 9118512, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2020-12-23 11:49:30', 'Dana Weinroth', NULL),
  (21771473, 9118512, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2021-01-06 16:03:57', 'Melinda Babaian', NULL),
  (21771474, 9118512, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (21771909, 9118685, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2021-02-08 15:50:32', 'Melinda Babaian', NULL),
  (21771910, 9118685, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, '2021-01-18 17:04:31', 'Melinda Babaian', NULL),
  (21771911, 9118685, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2021-02-09 15:46:50', 'Melinda Babaian', NULL),
  (21771967, 9118708, 'All Docs uploaded', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2020-12-28 16:48:12', 'Verva Gerse', NULL),
  (21771968, 9118708, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2021-02-03 15:23:07', 'Melinda Babaian', NULL),
  (21771969, 9118708, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2021-09-30 14:47:28', 'Melinda Babaian', NULL),
  (21771981, 9118718, 'All Docs uploaded', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2020-12-28 19:42:09', 'Verva Gerse', NULL),
  (21771982, 9118718, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2021-01-15 09:25:06', 'Melinda Babaian', NULL),
  (21771983, 9118718, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2021-01-25 11:13:17', 'Melinda Babaian', NULL),
  (21821899, 9135388, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, '2022-11-08 14:18:57', 'Nicole Antoine', NULL),
  (21857815, 9144542, 'All Docs uploaded', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2020-12-30 12:51:39', 'Verva Gerse', NULL),
  (21857816, 9144542, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2021-09-04 12:15:01', 'Melinda Babaian', NULL),
  (21857817, 9144542, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2021-09-04 12:15:02', 'Melinda Babaian', NULL),
  (21930140, 9160267, 'Sales Prep', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2021-01-04 13:42:26', 'Brian Godley', NULL),
  (21930141, 9160267, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2021-03-26 07:58:33', 'Melinda Babaian', NULL),
  (21930142, 9160267, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2021-09-04 12:18:06', 'Melinda Babaian', NULL),
  (21998086, 9180865, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, '2021-02-02 19:21:25', 'Nicole Antoine', NULL),
  (22061863, 9198585, 'All Docs uploaded', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2021-03-26 07:58:48', 'Melinda Babaian', NULL),
  (22061864, 9198585, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2021-04-07 10:27:16', 'Melinda Babaian', NULL),
  (22061865, 9198585, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (22105268, 9211513, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (22204230, 9233662, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, '2021-04-24 10:32:00', 'Nicole Antoine', NULL),
  (22294299, 9255525, 'All Docs uploaded', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2021-01-19 08:55:51', 'Verva Gerse', NULL),
  (22294300, 9255525, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2021-02-02 12:02:16', 'Melinda Babaian', NULL),
  (22294301, 9255525, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2021-09-04 12:17:46', 'Melinda Babaian', NULL),
  (22294649, 9255644, 'All Docs uploaded', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2021-01-19 08:57:01', 'Verva Gerse', NULL),
  (22294650, 9255644, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2021-01-26 08:24:03', 'Melinda Babaian', NULL),
  (22294651, 9255644, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (22314834, 9261130, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (22333493, 9265745, '(untitled)', NULL, 'Job Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2021-02-04 10:20:54', 'Melinda Babaian', NULL),
  (22333494, 9265745, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, '2021-02-04 10:20:28', 'Melinda Babaian', NULL),
  (22333495, 9265745, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2021-05-08 12:58:41', 'Melinda Babaian', NULL),
  (22385951, 9280823, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, '2021-02-11 16:55:32', 'Nicole Antoine', NULL),
  (22405475, 9285263, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (22437649, 9294501, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2021-03-01 16:51:25', 'Melinda Babaian', NULL),
  (22437650, 9294501, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2021-02-15 13:39:18', 'Melinda Babaian', NULL),
  (22437651, 9294501, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2021-03-29 16:09:21', 'Melinda Babaian', NULL),
  (22555379, 9325191, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2021-02-02 13:32:37', 'Nicole Antoine', '(HR) Mo Solomon'),
  (22555380, 9325191, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, '2021-02-02 13:32:38', 'Nicole Antoine', NULL),
  (22555381, 9325191, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2022-11-08 14:19:04', 'Nicole Antoine', NULL),
  (22663746, 9348018, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2021-02-04 11:52:33', 'Melinda Babaian', NULL),
  (22663747, 9348018, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2021-02-04 11:52:34', 'Melinda Babaian', NULL),
  (22663748, 9348018, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2021-05-08 12:59:04', 'Melinda Babaian', NULL),
  (22681313, 9352808, '(untitled)', NULL, 'Job Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2021-02-19 08:17:39', 'Melinda Babaian', NULL),
  (22681314, 9352808, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2021-02-19 08:17:42', 'Melinda Babaian', NULL),
  (22681315, 9352808, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2021-09-04 12:15:49', 'Melinda Babaian', NULL),
  (22700126, 9357394, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, '2022-11-08 14:19:05', 'Nicole Antoine', NULL),
  (22706255, 9359454, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2021-03-04 09:35:55', 'Melinda Babaian', NULL),
  (22706256, 9359454, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2021-03-04 09:35:52', 'Melinda Babaian', NULL),
  (22706257, 9359454, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2021-08-12 10:31:24', 'Melinda Babaian', NULL),
  (22712216, 9360765, '(untitled)', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, NULL, NULL, NULL),
  (22712217, 9360765, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2021-02-22 12:41:46', 'Jorge Flores', NULL),
  (22712218, 9360765, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (22745808, 9370871, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (22766644, 9375449, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2021-03-17 13:02:29', 'Melinda Babaian', NULL),
  (22766645, 9375449, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, '2021-03-17 13:02:22', 'Melinda Babaian', NULL),
  (22766646, 9375449, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2021-05-08 12:58:51', 'Melinda Babaian', NULL),
  (22778976, 9380894, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (22810665, 9390377, '(untitled)', NULL, 'Job Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2021-03-10 18:51:55', 'Adrian Lopez', NULL),
  (22810666, 9390377, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2021-03-10 18:52:07', 'Adrian Lopez', NULL),
  (22810667, 9390377, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2021-03-10 18:52:35', 'Adrian Lopez', NULL),
  (22863313, 9403908, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (22937145, 9423434, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, '2022-11-08 14:19:07', 'Nicole Antoine', NULL),
  (23064166, 9458121, '(untitled)', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, '2021-02-16 14:02:45', 'Brian Godley', NULL),
  (23064167, 9458121, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2021-03-01 16:51:00', 'Melinda Babaian', NULL),
  (23064168, 9458121, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, NULL, NULL, NULL),
  (23065458, 9458413, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2021-02-18 14:07:40', 'Nicole Antoine', NULL),
  (23065459, 9458413, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2021-03-24 12:48:28', 'Melinda Babaian', NULL),
  (23065460, 9458413, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2021-09-30 14:47:19', 'Melinda Babaian', NULL),
  (23108750, 9469248, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (23131587, 9476479, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (23132645, 9476818, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (23193164, 9491206, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2021-08-12 10:31:49', 'Melinda Babaian', '(HR) Mo Solomon'),
  (23193165, 9491206, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2021-08-12 10:31:50', 'Melinda Babaian', NULL),
  (23193166, 9491206, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (23199028, 7237038, '(untitled)', NULL, 'Final

2- extension box needs water proofing behind and needs knock out', NULL, NULL, NULL, NULL),
  (23201103, 9493386, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2021-03-04 08:58:17', 'Nicole Antoine', '(.PM) Carter Godley,(HR) Mo Solomon'),
  (23201104, 9493386, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2021-03-20 09:30:05', 'Melinda Babaian', NULL),
  (23201105, 9493386, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2021-09-04 12:16:15', 'Melinda Babaian', NULL),
  (23214105, 9493386, 'Materials To-D0', 'high', 'Lighting choices - Nicole will help on this, when she has time', NULL, '2021-03-25 17:44:10', 'Nicole Antoine', '(.PM) Carter Godley'),
  (23215021, 8769652, 'Final', NULL, 'Pressure wash driveway

Pressure wash driveway', NULL, '2021-09-04 12:15:34', 'Melinda Babaian', NULL),
  (23217161, 9497260, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, '2021-03-29 09:48:05', 'Nicole Antoine', NULL),
  (23220114, 9497797, 'All Docs uploaded', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2021-02-22 21:45:39', 'Verva Gerse', NULL),
  (23220115, 9497797, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2021-02-26 14:40:36', 'Melinda Babaian', NULL),
  (23220116, 9497797, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (23254026, 9508856, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (23255683, 9509174, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2021-04-01 10:03:53', 'Melinda Babaian', NULL),
  (23255684, 9509174, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2021-04-01 10:03:55', 'Melinda Babaian', NULL),
  (23255685, 9509174, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2021-09-04 12:17:43', 'Melinda Babaian', NULL),
  (23257262, 9509437, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2021-03-22 14:32:13', 'Melinda Babaian', NULL),
  (23257263, 9509437, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2021-03-22 14:32:15', 'Melinda Babaian', NULL),
  (23257264, 9509437, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2021-05-17 13:18:52', 'Melinda Babaian', NULL),
  (23257614, 9509510, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2021-04-01 10:05:02', 'Melinda Babaian', NULL),
  (23257615, 9509510, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2021-04-01 10:05:03', 'Melinda Babaian', NULL),
  (23257616, 9509510, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2021-09-04 12:18:20', 'Melinda Babaian', NULL),
  (23258119, 9509634, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (23258120, 9509634, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (23258121, 9509634, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (23293982, 9518834, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2021-03-01 16:51:20', 'Melinda Babaian', NULL),
  (23293983, 9518834, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2021-03-01 16:51:18', 'Melinda Babaian', NULL),
  (23293984, 9518834, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, NULL, NULL, NULL),
  (23363644, 9539959, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, '2022-11-08 14:21:43', 'Nicole Antoine', 'Dana Weinroth'),
  (23400414, 9552014, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, '2021-08-13 11:44:22', 'Nicole Antoine', NULL),
  (23440177, 9564524, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (23448818, 9566529, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2021-06-08 09:24:40', 'Melinda Babaian', NULL),
  (23448819, 9566529, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2021-06-08 09:24:42', 'Melinda Babaian', NULL),
  (23448820, 9566529, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2021-09-04 12:18:15', 'Melinda Babaian', NULL),
  (23448956, 9566687, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (23477413, 9576136, '(untitled)', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, '2021-03-12 17:35:53', 'Brian Godley', NULL),
  (23477414, 9576136, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (23477415, 9576136, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, NULL, NULL, NULL),
  (23499658, 9493386, 'Lights', 'high', 'Lights - she wants to use Vista and wants to use her own bulbs.  Can we find out if she can do this with Vista? If so I need to credit her if lights are less without the LED bulbs. Call me for any questions!', NULL, '2021-08-12 10:30:47', 'Melinda Babaian', '(.PM) Carter Godley'),
  (23502741, 9584599, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2021-03-14 17:28:57', 'Nicole Antoine', '(HR) Mo Solomon'),
  (23502742, 9584599, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2021-05-08 12:57:47', 'Melinda Babaian', NULL),
  (23502743, 9584599, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2021-05-13 20:42:56', 'Melinda Babaian', NULL),
  (23524377, 9589611, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, '2021-05-13 11:31:53', 'Dana Weinroth', NULL),
  (23536848, 9593020, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2021-08-12 10:32:32', 'Melinda Babaian', NULL),
  (23536849, 9593020, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2021-08-12 10:32:33', 'Melinda Babaian', NULL),
  (23536850, 9593020, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2021-09-04 12:18:12', 'Melinda Babaian', NULL),
  (23554996, 9597597, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (23555029, 9597616, 'All Docs uploaded', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2021-03-06 12:17:39', 'Verva Gerse', NULL),
  (23555030, 9597616, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2021-08-12 10:32:14', 'Melinda Babaian', NULL),
  (23555031, 9597616, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2021-09-04 12:18:17', 'Melinda Babaian', NULL),
  (23593188, 9607329, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, '2021-04-23 11:06:51', 'Nicole Antoine', NULL),
  (23632863, 9619053, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2021-03-18 18:16:40', 'Ryan Kleefisch', NULL),
  (23632864, 9619053, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (23632865, 9619053, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (23639929, 9584599, 'Bella Crete Wall cap - need a sample', NULL, 'Can you help me get a Bella Crete wall cap in two colors so I can present to them at job walk? BEIGE and LIGHT GREY.
I will pick up at the office.

Thanks LMK!', NULL, '2021-05-08 12:57:50', 'Melinda Babaian', '(.PM) Carter Godley'),
  (23700563, 9390377, '(untitled)', NULL, 'Remove the 40pz 20 feet ich one rebar because Freddy has 10 pieces with him', NULL, '2021-08-12 10:32:27', 'Melinda Babaian', NULL),
  (23706263, 9638887, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2021-03-12 14:58:02', 'Dana Weinroth', NULL),
  (23706264, 9638887, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2021-04-05 10:10:51', 'Melinda Babaian', NULL),
  (23706265, 9638887, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2021-05-19 18:15:55', 'Melinda Babaian', NULL),
  (23721969, 9643177, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (23721970, 9643177, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (23721971, 9643177, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (23721978, 9643179, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2021-03-12 16:36:04', 'Dana Weinroth', NULL),
  (23721979, 9643179, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (23721980, 9643179, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (23723659, 9643536, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2021-03-18 16:40:10', 'Ryan Kleefisch', NULL),
  (23723660, 9643536, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2021-04-09 10:37:41', 'Victor Rodriguez', NULL),
  (23723661, 9643536, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (23742223, 9648452, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (23749911, 9650717, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2021-03-19 19:17:17', 'Nicole Antoine', '(HR) Mo Solomon'),
  (23749912, 9650717, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2021-06-08 09:23:05', 'Melinda Babaian', NULL),
  (23749913, 9650717, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2021-08-26 08:51:29', 'Melinda Babaian', NULL),
  (23846427, 9674051, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2021-06-08 09:24:46', 'Melinda Babaian', NULL),
  (23846428, 9674051, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2021-06-08 09:24:48', 'Melinda Babaian', NULL),
  (23846429, 9674051, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2021-11-02 11:22:35', 'Melinda Babaian', NULL),
  (23846886, 9650717, 'Material To-Do List', 'low', 'pavers for driveway and border stone  - need choices and samples sent to home', NULL, '2021-08-12 10:29:11', 'Melinda Babaian', '(.PM) Carter Godley'),
  (23865332, 9677991, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2021-08-12 10:32:08', 'Melinda Babaian', NULL),
  (23865333, 9677991, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2021-03-26 07:59:26', 'Melinda Babaian', NULL),
  (23865334, 9677991, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2021-09-04 12:17:34', 'Melinda Babaian', NULL),
  (23876230, 9680412, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2021-03-19 14:42:48', 'Nicole Antoine', NULL),
  (23876231, 9680412, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2021-04-10 13:59:14', 'Victor Rodriguez', NULL),
  (23876232, 9680412, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2021-08-19 10:52:22', 'Melinda Babaian', NULL),
  (23886296, 9683416, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (23919645, 9693119, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (23923857, 7666319, 'Drainage & Compaction', NULL, NULL, NULL, '2021-08-12 10:29:42', 'Melinda Babaian', NULL),
  (23923964, 9694064, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (24078557, 9740093, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2021-08-12 10:30:30', 'Melinda Babaian', NULL),
  (24078558, 9740093, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2021-08-12 10:30:32', 'Melinda Babaian', NULL),
  (24078559, 9740093, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2021-09-04 12:17:31', 'Melinda Babaian', NULL),
  (24150991, 9760016, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2021-03-30 08:55:34', 'Nicole Antoine', '(HR) Mo Solomon'),
  (24150992, 9760016, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2021-05-10 14:08:10', 'Melinda Babaian', NULL),
  (24150993, 9760016, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2021-06-29 17:22:07', 'Melinda Babaian', NULL),
  (24152602, 9760370, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2021-04-26 16:55:11', 'Melinda Babaian', NULL),
  (24152603, 9760370, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2021-04-26 16:55:17', 'Melinda Babaian', NULL),
  (24152604, 9760370, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2021-05-14 17:57:05', 'Melinda Babaian', NULL),
  (24206730, 9774018, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, '2021-06-09 19:58:26', 'Nicole Antoine', NULL),
  (24206984, 9760016, 'Material to do', NULL, '1. Pick pavers - patio, border and fascia
2. Pick Stepstone pre-fab paver color (2’ x 3’ rectangle) Takes a while to order and come in!!!
3. Pick Stucco color for walls', NULL, '2021-05-10 14:08:31', 'Melinda Babaian', '(.PM) Carter Godley'),
  (24248901, 9785320, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (24248902, 9785320, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (24248903, 9785320, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, NULL, NULL, NULL),
  (24249854, 9785497, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2021-06-08 09:24:26', 'Melinda Babaian', NULL),
  (24249855, 9785497, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2021-05-19 11:24:11', 'Jorge Flores', NULL),
  (24249856, 9785497, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2021-09-04 12:17:59', 'Melinda Babaian', NULL),
  (24265497, 9789694, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (24265498, 9789694, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (24265499, 9789694, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, NULL, NULL, NULL),
  (24279281, 9674051, 'Finalize Materials w/owners', NULL, 'Dropping samples Thurs 4/1 to owners', NULL, '2021-03-31 14:31:22', 'Dana Weinroth', NULL),
  (24384688, 9821402, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2021-04-05 18:11:35', 'Ryan Kleefisch', NULL),
  (24384689, 9821402, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (24384690, 9821402, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2023-01-17 12:57:50', 'Nicole Antoine', 'Brian McBride'),
  (24384883, 9821462, '(untitled)', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, '2021-04-05 18:38:45', 'Ryan Kleefisch', NULL),
  (24384884, 9821462, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, NULL, NULL, NULL),
  (24384885, 9821462, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (24386045, 9821684, 'All Docs uploaded', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2021-04-14 22:18:02', 'Verva Gerse', NULL),
  (24386046, 9821684, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2021-06-08 09:24:30', 'Melinda Babaian', NULL),
  (24386047, 9821684, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2021-09-04 12:17:28', 'Melinda Babaian', NULL),
  (24419586, 9831009, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2021-06-08 09:24:16', 'Melinda Babaian', NULL),
  (24419587, 9831009, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2021-06-08 09:24:19', 'Melinda Babaian', NULL),
  (24419588, 9831009, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2021-09-04 12:15:12', 'Melinda Babaian', NULL),
  (24462463, 9841032, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2021-09-04 12:12:39', 'Melinda Babaian', NULL),
  (24462464, 9841032, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2021-09-04 12:12:40', 'Melinda Babaian', NULL),
  (24462465, 9841032, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2021-09-30 14:46:34', 'Melinda Babaian', NULL),
  (24493609, 9850257, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2021-06-18 13:56:41', 'Melinda Babaian', NULL),
  (24493610, 9850257, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2021-05-24 12:38:07', 'Melinda Babaian', NULL),
  (24493611, 9850257, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2021-06-18 13:56:43', 'Melinda Babaian', NULL),
  (24494437, 9850317, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (24529230, 9858125, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2021-04-15 10:38:25', 'Nicole Antoine', NULL),
  (24529231, 9858125, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, '2021-06-08 09:22:02', 'Melinda Babaian', NULL),
  (24529232, 9858125, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2021-09-04 12:17:40', 'Melinda Babaian', NULL),
  (24625072, 9890029, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, '2021-08-10 17:44:17', 'Nicole Antoine', NULL),
  (24660672, 9858125, 'Materials TO-DO (Carter)', NULL, 'We need to choose pavers for patio approx. 448 SF of flat patio area.
Additional 28 LF of fascia pavers for step down. (Needs to be 4-6” rise).

I like Catalina Grana for this space - need to choose color with client and send over samples.
I also like Courtyard - need to choose color with client and send over samples.', '2021-05-15', '2021-06-06 13:00:58', 'Nicole Antoine', '(.PM) Carter Godley'),
  (24679997, 9902306, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (24680008, 9902311, '(untitled)', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, '2021-06-04 15:37:21', 'Melinda Babaian', NULL),
  (24680009, 9902311, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2021-06-04 15:37:23', 'Melinda Babaian', NULL),
  (24680010, 9902311, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2021-09-04 12:17:51', 'Melinda Babaian', NULL),
  (24682403, 9902783, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2021-05-13 12:07:10', 'Nicole Antoine', '(HR) Mo Solomon'),
  (24682404, 9902783, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2021-08-12 10:28:52', 'Melinda Babaian', NULL),
  (24682405, 9902783, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2021-08-19 10:50:53', 'Melinda Babaian', NULL),
  (24699878, 9907774, 'All Docs uploaded', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2021-05-08 12:58:59', 'Melinda Babaian', NULL),
  (24699879, 9907774, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2021-05-08 12:58:56', 'Melinda Babaian', NULL),
  (24699880, 9907774, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2021-05-08 12:58:58', 'Melinda Babaian', NULL),
  (24707800, 9902783, 'Materials to-do’s', NULL, 'BRICK - please send client 3 brick samples.', NULL, '2021-08-12 10:28:51', 'Melinda Babaian', '(.PM) Carter Godley'),
  (24721110, 9912505, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2021-06-03 15:51:54', 'Nicole Antoine', '(HR) Mo Solomon'),
  (24721111, 9912505, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2021-09-04 12:14:45', 'Melinda Babaian', NULL),
  (24721112, 9912505, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2021-09-04 12:14:48', 'Melinda Babaian', NULL),
  (24849696, 9943923, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, '2021-08-03 14:53:41', 'Dana Weinroth', NULL),
  (24878090, 9951078, 'All Docs uploaded', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2021-04-22 12:59:00', 'Verva Gerse', NULL),
  (24878091, 9951078, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, '2021-05-26 11:12:03', 'Melinda Babaian', NULL),
  (24878092, 9951078, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2021-05-26 11:12:04', 'Melinda Babaian', NULL),
  (24878517, 9951173, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (24878518, 9951173, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (24878519, 9951173, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (24881642, 9951448, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2021-04-26 19:31:44', 'Brian Godley', NULL),
  (24881643, 9951448, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2021-05-08 12:57:17', 'Melinda Babaian', NULL),
  (24881644, 9951448, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2021-06-17 12:44:32', 'Melinda Babaian', NULL),
  (24930897, 9951448, 'Paver Selection', NULL, 'Pick out pavers.', NULL, '2021-04-26 19:24:02', 'Brian Godley', 'Brian Godley'),
  (24933765, 9963772, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (24934779, 9964015, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2021-06-14 14:19:52', 'Melinda Babaian', '(HR) Mo Solomon'),
  (24934780, 9964015, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2021-06-14 14:19:54', 'Melinda Babaian', NULL),
  (24934781, 9964015, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2021-09-04 12:15:17', 'Melinda Babaian', NULL),
  (24976850, 9975675, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2021-05-06 21:47:39', 'Ryan Kleefisch', NULL),
  (24976851, 9975675, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2021-06-08 09:24:08', 'Melinda Babaian', NULL),
  (24976852, 9975675, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2021-09-04 12:16:27', 'Melinda Babaian', NULL),
  (24980053, 9976260, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (24980363, 9976353, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2021-06-14 12:57:54', 'Melinda Babaian', NULL),
  (24980364, 9976353, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2021-06-14 12:57:57', 'Melinda Babaian', NULL),
  (24980365, 9976353, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2021-08-12 10:31:44', 'Melinda Babaian', NULL),
  (24982359, 9977032, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (24983046, 9977198, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (24983244, 9977229, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (24983894, 9977372, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (24987020, 9977850, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2021-07-12 16:53:44', 'Brian Godley', NULL),
  (24987021, 9977850, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2021-07-25 13:28:03', 'Melinda Babaian', NULL),
  (24987022, 9977850, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2021-08-12 19:57:15', 'Melinda Babaian', NULL),
  (24989906, 9978406, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2021-06-04 15:59:47', 'Brian Godley', NULL),
  (24989907, 9978406, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, '2021-06-28 16:01:46', 'Melinda Babaian', NULL),
  (24989908, 9978406, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2021-09-04 12:16:44', 'Melinda Babaian', NULL),
  (25019639, 9986107, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (25020604, 9912505, 'Materials TO DO - Carter', NULL, 'BRICK - brick needs to be matched to what she currently has, I did not take a brick with me. I was told this will be done onsite. LMK if we need to get a brick for matching.', NULL, '2021-04-27 13:37:15', 'Nicole Antoine', '(.PM) Carter Godley'),
  (25020655, 9912505, 'Materials To-Do List - CARTER', NULL, 'LIGHTING - Lighting - she has Vista catalog, just need to finalize selections and colors (likely black).  LOTS of lights so please follow up with her on this to-do.', NULL, '2021-09-30 14:46:52', 'Melinda Babaian', '(.PM) Carter Godley'),
  (25034642, 9990082, 'All Docs uploaded', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2021-04-28 08:53:03', 'Verva Gerse', NULL),
  (25034643, 9990082, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, '2021-05-20 18:57:36', 'Melinda Babaian', NULL),
  (25034644, 9990082, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2021-06-14 18:39:27', 'Melinda Babaian', NULL),
  (25081199, 10001394, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2021-05-05 09:19:00', 'Dana Weinroth', NULL),
  (25081200, 10001394, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, '2021-08-12 10:29:46', 'Melinda Babaian', NULL),
  (25081201, 10001394, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2021-09-04 12:16:24', 'Melinda Babaian', NULL),
  (25092224, 10003679, 'All Docs uploaded', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2021-04-29 20:25:58', 'Verva Gerse', NULL),
  (25092225, 10003679, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2021-08-12 10:30:04', 'Melinda Babaian', NULL),
  (25092226, 10003679, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2021-08-13 11:51:09', 'Melinda Babaian', NULL),
  (25111270, 10008135, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (25147615, 10016524, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2021-05-08 14:03:36', 'Nicole Antoine', NULL),
  (25147616, 10016524, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2021-07-20 11:21:28', 'Melinda Babaian', NULL),
  (25147617, 10016524, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2021-08-10 13:21:25', 'Melinda Babaian', NULL),
  (25203954, 7168264, 'Repair Issues', NULL, 'wants new irrigation control for some plants that died', NULL, NULL, NULL, NULL),
  (25204315, 10029171, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (25220599, 10032348, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (25262908, 10042815, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2021-05-12 10:00:52', 'Nicole Antoine', '(HR) Mo Solomon'),
  (25262909, 10042815, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, '2021-08-12 10:28:58', 'Melinda Babaian', NULL),
  (25262910, 10042815, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2021-08-19 10:51:59', 'Melinda Babaian', NULL),
  (25264669, 10043446, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2021-05-12 10:03:31', 'Nicole Antoine', NULL),
  (25264670, 10043446, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2021-07-08 15:44:04', 'Melinda Babaian', NULL),
  (25264671, 10043446, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review. Give the client the sheet on how to leave reviews for the company', NULL, '2021-09-04 12:17:14', 'Melinda Babaian', NULL),
  (25265156, 10043622, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (25304406, 10054765, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, '2021-05-21 17:04:28', 'Dana Weinroth', NULL),
  (25351568, 9458121, 'Fix Up Items', NULL, 'Ensure grade is correct in sod areas where animal pulled it up.', NULL, NULL, NULL, NULL),
  (25360758, 10043446, 'Material To-Do List', 'low', 'Turf - Nicole will show her selections', '2021-05-31', '2021-06-22 08:01:10', 'Nicole Antoine', '(.PM) Carter Godley,Nicole Antoine'),
  (25477558, 10096826, 'All Docs uploaded', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2021-05-11 16:45:02', 'Verva Gerse', NULL),
  (25477559, 10096826, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, '2021-06-29 17:23:10', 'Melinda Babaian', NULL),
  (25477560, 10096826, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2021-08-12 10:30:23', 'Melinda Babaian', NULL),
  (25479095, 10097123, 'All Docs uploaded', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2021-05-11 18:24:44', 'Verva Gerse', NULL),
  (25479096, 10097123, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2021-07-20 11:33:36', 'Melinda Babaian', NULL),
  (25479097, 10097123, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2021-07-20 11:33:37', 'Melinda Babaian', NULL),
  (25578091, 10127581, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2021-06-29 17:22:49', 'Melinda Babaian', NULL),
  (25578092, 10127581, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2021-06-29 17:22:48', 'Melinda Babaian', NULL),
  (25578093, 10127581, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2021-07-23 09:58:01', 'Melinda Babaian', NULL),
  (25594360, 10133006, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (25776873, 10182293, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (25812034, 10054765, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2021-05-21 17:08:56', 'Dana Weinroth', NULL),
  (25812035, 10054765, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2021-08-12 10:32:01', 'Melinda Babaian', NULL),
  (25812036, 10054765, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (25860827, 10202889, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, '2021-05-28 08:26:19', 'Dana Weinroth', NULL),
  (25863964, 10203460, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2021-06-07 16:10:52', 'Dana Weinroth', NULL),
  (25863965, 10203460, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (25863966, 10203460, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (25974108, 10233398, '(untitled)', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, '2021-06-09 19:57:10', 'Nicole Antoine', NULL),
  (25974109, 10233398, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, '2021-08-11 15:21:37', 'Victor Rodriguez', NULL),
  (25974110, 10233398, '(untitled)', NULL, 'Final Job Walk

7. Take final job photos for our website. Upload to Builder Trend.', NULL, '2021-09-01 10:16:56', 'Victor Rodriguez', NULL),
  (25977205, 10234332, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (26003645, 10202889, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2021-05-28 08:27:44', 'Dana Weinroth', NULL),
  (26003646, 10202889, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2021-07-08 11:23:06', 'Melinda Babaian', NULL),
  (26003647, 10202889, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2021-08-12 10:30:11', 'Melinda Babaian', NULL),
  (26003745, 10202889, 'Materials', NULL, 'All materials are listed on job start notes', NULL, '2021-05-28 08:28:20', 'Dana Weinroth', NULL),
  (26131254, 10271092, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (26206566, 10202889, 'Materials selection for mulch, sod', NULL, NULL, NULL, '2021-08-12 10:30:12', 'Melinda Babaian', NULL),
  (26251176, 10203460, 'Paver choice tbd', NULL, NULL, NULL, NULL, NULL, NULL),
  (26251194, 10307532, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2021-06-15 08:45:17', 'Dana Weinroth', NULL),
  (26251195, 10307532, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2021-09-04 12:12:29', 'Melinda Babaian', NULL),
  (26251196, 10307532, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2021-09-13 15:28:15', 'Jorge Flores', NULL),
  (26312287, 10322184, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2021-09-04 12:17:07', 'Melinda Babaian', NULL),
  (26312288, 10322184, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, '2021-09-04 12:17:08', 'Melinda Babaian', NULL),
  (26312289, 10322184, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2021-09-04 12:17:08', 'Melinda Babaian', NULL),
  (26314925, 10322924, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2021-07-28 14:31:20', 'Melinda Babaian', NULL),
  (26314926, 10322924, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2021-07-28 14:31:22', 'Melinda Babaian', NULL),
  (26314927, 10322924, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2021-09-01 10:16:33', 'Victor Rodriguez', NULL),
  (26392386, 10345652, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2021-09-30 14:46:12', 'Melinda Babaian', NULL),
  (26392387, 10345652, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2021-09-30 14:46:06', 'Melinda Babaian', NULL),
  (26392388, 10345652, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2021-10-18 06:29:32', 'Victor Rodriguez', NULL),
  (26497539, 10370156, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (26574485, 10391726, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2021-06-17 16:55:15', 'Brian Godley', NULL),
  (26574486, 10391726, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, '2021-09-04 12:12:34', 'Melinda Babaian', NULL),
  (26574487, 10391726, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (26654075, 10411825, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, '2021-08-11 09:19:25', 'Dana Weinroth', NULL),
  (26849331, 10470303, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, '2021-08-10 17:39:33', 'Nicole Antoine', NULL),
  (26892729, 10484259, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (26922332, 10491357, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (26922840, 10491463, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2021-07-27 10:21:43', 'Dana Weinroth', NULL),
  (26922841, 10491463, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2021-09-04 12:14:32', 'Melinda Babaian', NULL),
  (26922842, 10491463, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2021-10-04 22:28:49', 'Victor Rodriguez', NULL),
  (26924421, 10491463, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, '2021-09-30 14:45:34', 'Melinda Babaian', NULL),
  (26986123, 10509770, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (26986124, 10509770, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, NULL, NULL, NULL),
  (26986125, 10509770, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (26997782, 10513078, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2021-07-27 10:13:25', 'Dana Weinroth', NULL),
  (26997783, 10513078, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, '2021-09-04 12:14:37', 'Melinda Babaian', NULL),
  (26997784, 10513078, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2021-09-04 12:14:41', 'Melinda Babaian', NULL),
  (26999169, 10513559, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (26999223, 10513570, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (27011214, 10516171, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (27052125, 10529718, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (27052154, 10529728, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (27066325, 10533001, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (27142926, 10553589, '(untitled)', NULL, 'Sales Prep

10. Notes on any permits need to be put in a Daily Log.', NULL, '2021-09-04 12:13:22', 'Melinda Babaian', '(.PM) Carter Godley,(HR) Mo Solomon'),
  (27142927, 10553589, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, '2021-09-04 12:13:42', 'Melinda Babaian', NULL),
  (27142928, 10553589, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2021-10-26 14:59:07', 'Melinda Babaian', NULL),
  (27182802, 10563668, 'All Docs uploaded', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, '2021-09-30 14:48:53', 'Verva Gerse', NULL),
  (27182803, 10563668, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, '2021-10-26 15:06:38', 'Melinda Babaian', NULL),
  (27182804, 10563668, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (27183471, 10563792, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2021-09-01 10:17:15', 'Victor Rodriguez', NULL),
  (27183472, 10563792, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2021-08-12 20:36:48', 'Victor Rodriguez', NULL),
  (27183473, 10563792, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2021-09-01 10:17:21', 'Victor Rodriguez', NULL),
  (27206916, 10568813, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (27248402, 10578978, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (27337181, 10609753, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2021-08-04 15:57:38', 'Nicole Antoine', '(HR) Mo Solomon'),
  (27337182, 10609753, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, '2022-04-11 16:34:26', 'Nicole Antoine', NULL),
  (27337183, 10609753, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (27337445, 10609824, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (27344058, 10553589, 'Material To-Do *PLEASE USE THIS LIST', 'low', 'Reconfirm that we are using Graphite Grey Stabilized DG in between driveway pads.', NULL, '2021-09-30 14:45:26', 'Melinda Babaian', '(.PM) Carter Godley'),
  (27345847, 10612622, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (27506000, 10652219, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (27506330, 10652523, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (27525796, 10658820, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2021-09-04 12:15:56', 'Melinda Babaian', NULL),
  (27525797, 10658820, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2021-09-04 12:15:57', 'Melinda Babaian', NULL),
  (27525798, 10658820, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2021-09-04 12:15:58', 'Melinda Babaian', NULL),
  (27594757, 10679131, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2021-09-04 12:12:24', 'Melinda Babaian', NULL),
  (27594758, 10679131, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2021-09-09 08:25:51', 'Melinda Babaian', NULL),
  (27594759, 10679131, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2021-09-25 13:29:32', 'Melinda Babaian', NULL),
  (27646331, 10690372, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2021-08-12 10:29:24', 'Melinda Babaian', NULL),
  (27646332, 10690372, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, '2021-08-12 10:29:25', 'Melinda Babaian', NULL),
  (27646333, 10690372, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2021-09-04 12:17:17', 'Melinda Babaian', NULL),
  (27689146, 10700300, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2021-08-10 16:01:20', 'Nicole Antoine', NULL),
  (27689147, 10700300, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, '2021-09-13 07:02:18', 'Victor Rodriguez', NULL),
  (27689148, 10700300, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2021-11-08 12:13:43', 'Melinda Babaian', NULL),
  (27747761, 10713700, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2021-12-09 11:56:39', 'Melinda Babaian', NULL),
  (27747762, 10713700, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2021-10-11 15:13:16', 'Melinda Babaian', NULL),
  (27747763, 10713700, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (27761375, 10717130, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2021-10-26 15:05:06', 'Melinda Babaian', NULL),
  (27761376, 10717130, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2021-09-23 18:32:25', 'Victor Rodriguez', NULL),
  (27761377, 10717130, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (27761466, 10717157, '(untitled)', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, NULL, NULL, NULL),
  (27761467, 10717157, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2021-09-17 15:51:42', 'Victor Rodriguez', NULL),
  (27761468, 10717157, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2021-09-27 16:01:23', 'Victor Rodriguez', NULL),
  (27789767, 10725225, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (27790032, 10411825, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (27790033, 10411825, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (27790034, 10411825, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (27800061, 10728309, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2021-08-11 09:18:36', 'Dana Weinroth', NULL),
  (27800062, 10728309, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, '2021-09-20 12:19:19', 'Jorge Flores', NULL),
  (27800063, 10728309, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2021-10-13 12:05:09', 'Jorge Flores', NULL),
  (27833232, 10737221, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (27834675, 10737906, 'All Docs uploaded', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2021-08-12 18:55:25', 'Verva Gerse', NULL),
  (27834676, 10737906, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2021-09-04 12:14:53', 'Melinda Babaian', NULL),
  (27834677, 10737906, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2021-10-04 22:28:42', 'Victor Rodriguez', NULL),
  (27859692, 10747234, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2021-08-12 10:31:10', 'Melinda Babaian', NULL),
  (27859693, 10747234, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2021-08-12 10:31:11', 'Melinda Babaian', NULL),
  (27859694, 10747234, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2021-08-12 10:31:12', 'Melinda Babaian', NULL),
  (27877548, 10751504, 'All Docs uploaded', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2021-08-09 15:04:08', 'Verva Gerse', NULL),
  (27877549, 10751504, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, '2021-10-27 15:08:11', 'Victor Rodriguez', NULL),
  (27877550, 10751504, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (27979546, 10783240, 'All Docs uploaded', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2021-08-09 16:38:54', 'Verva Gerse', NULL),
  (27979547, 10783240, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, '2021-10-14 16:01:18', 'Victor Rodriguez', NULL),
  (27979548, 10783240, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2021-11-08 12:13:35', 'Melinda Babaian', NULL),
  (27982130, 10783978, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2021-09-04 12:16:32', 'Melinda Babaian', NULL),
  (27982131, 10783978, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2021-09-04 12:16:33', 'Melinda Babaian', NULL),
  (27982132, 10783978, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2021-09-04 12:16:34', 'Melinda Babaian', NULL),
  (28016317, 10700300, 'Material to-do (Just pavers)', 'low', 'make sure specs of tile are entered. (client is chosing on their own)', '2021-08-24', '2021-09-30 14:45:47', 'Melinda Babaian', '(.PM) Carter Godley'),
  (28073100, 10042815, 'Punch List', NULL, 'The brick strip that was in a change order.', '2021-08-14', '2021-08-19 10:51:50', 'Melinda Babaian', 'Adrian Lopez'),
  (28073173, 8283798, 'Punch List', NULL, 'Plant 6 one gallons that Simon is going to buy', NULL, '2021-09-04 12:16:19', 'Melinda Babaian', NULL),
  (28073183, 9680412, 'Punch List', NULL, 'Repair Stucco', NULL, '2021-08-19 10:52:16', 'Melinda Babaian', NULL),
  (28073225, 9902783, 'Punch List', NULL, 'Install additional lights.', NULL, '2021-08-19 10:51:09', 'Melinda Babaian', NULL),
  (28081323, 10811242, 'All Docs uploaded', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2021-08-12 18:56:42', 'Verva Gerse', NULL),
  (28081324, 10811242, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2021-09-30 14:46:44', 'Melinda Babaian', NULL),
  (28081325, 10811242, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2021-10-14 14:12:47', 'Melinda Babaian', NULL),
  (28111884, 10820925, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2021-09-04 12:17:23', 'Melinda Babaian', NULL),
  (28111885, 10820925, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2021-09-04 12:17:24', 'Melinda Babaian', NULL),
  (28111886, 10820925, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2021-09-04 12:17:25', 'Melinda Babaian', NULL),
  (28143054, 9067501, 'Repair', NULL, 'Need to stabilize all DG in back.', NULL, '2021-09-04 12:15:40', 'Melinda Babaian', NULL),
  (28226723, 10855922, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (28226817, 10856056, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (28287543, 10869771, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (28287544, 10869771, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (28287545, 10869771, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (28309350, 10874925, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (28351300, 9760016, 'To Do', NULL, 'Order 3 more steppers 18"', NULL, '2021-08-30 19:23:12', 'Nicole Antoine', NULL),
  (28351336, 9760016, 'Change order needed', NULL, 'Visit the site to give them new change order for adding the square steps in the front.', NULL, '2021-08-30 19:23:02', 'Nicole Antoine', 'Nicole Antoine'),
  (28360460, 9067548, 'Materials Selections', NULL, 'Need to choose Bellecrete precast for coping', NULL, '2021-11-02 11:24:25', 'Melinda Babaian', NULL),
  (28411505, 10909547, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (28424052, 10917305, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2021-08-31 18:47:07', 'Dana Weinroth', NULL),
  (28424053, 10917305, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2021-09-08 15:14:07', 'Victor Rodriguez', NULL),
  (28424054, 10917305, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2021-09-20 17:43:35', 'Victor Rodriguez', NULL),
  (28432256, 10919041, 'All doc uploaded', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2021-11-01 18:48:51', 'Verva Gerse', NULL),
  (28432257, 10919041, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, '2021-11-08 16:07:56', 'Victor Rodriguez', NULL),
  (28432258, 10919041, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (28467615, 10927951, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (28487862, 10932457, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2021-08-31 18:46:31', 'Dana Weinroth', NULL),
  (28487863, 10932457, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2021-09-29 19:52:54', 'Victor Rodriguez', NULL),
  (28487864, 10932457, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2021-10-04 22:28:12', 'Victor Rodriguez', NULL),
  (28523535, 10941497, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (28561717, 10951109, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2021-09-30 12:43:44', 'Melinda Babaian', NULL),
  (28561718, 10951109, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2021-09-30 12:43:46', 'Melinda Babaian', NULL),
  (28561719, 10951109, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2021-09-30 12:43:47', 'Melinda Babaian', NULL),
  (28679099, 10982964, 'All Docs uploaded', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2021-09-30 14:47:54', 'Verva Gerse', NULL),
  (28679100, 10982964, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, '2021-10-04 22:25:38', 'Victor Rodriguez', NULL),
  (28679101, 10982964, 'Complete', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2022-01-23 09:56:05', 'Verva Gerse', NULL),
  (28763488, 11000763, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (28770096, 10728309, 'Material Selections', NULL, 'Working with client to finalize paver selections,  will also help them select turf', NULL, '2021-09-13 16:24:10', 'Dana Weinroth', 'Dana Weinroth'),
  (28889281, 11037621, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (28892139, 11038201, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (28917671, 11043955, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (28930148, 11047318, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2021-12-09 11:58:05', 'Melinda Babaian', NULL),
  (28930149, 11047318, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (28930150, 11047318, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (29006308, 11066555, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2021-09-22 11:40:37', 'Nicole Antoine', NULL),
  (29006309, 11066555, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2021-10-27 15:08:31', 'Victor Rodriguez', NULL),
  (29006310, 11066555, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (29041468, 11075236, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (29041469, 11075236, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, NULL, NULL, NULL),
  (29041470, 11075236, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (29041772, 11075368, '(untitled)', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, NULL, NULL, NULL),
  (29041773, 11075368, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (29041774, 11075368, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (29080392, 11084305, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (29084289, 11084937, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2021-10-04 11:45:32', 'Dana Weinroth', NULL),
  (29084290, 11084937, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2021-10-12 10:44:37', 'Jorge Flores', NULL),
  (29084291, 11084937, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2021-10-29 14:28:58', 'Jorge Flores', NULL),
  (29153941, 11104749, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2021-09-30 15:12:55', 'Dana Weinroth', NULL),
  (29153942, 11104749, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, '2021-10-13 21:40:56', 'Victor Rodriguez', NULL),
  (29153943, 11104749, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2021-11-01 07:30:23', 'Victor Rodriguez', NULL),
  (29233150, 11128437, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2021-10-14 08:56:09', 'Brian Godley', NULL),
  (29233151, 11128437, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2021-10-26 06:56:38', 'Jorge Flores', NULL),
  (29233152, 11128437, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2021-11-09 11:28:54', 'Jorge Flores', NULL),
  (29241315, 10679131, 'Punch List', NULL, 'Clean the area near garage - take out all dirt that is left behind from our work.', NULL, '2021-09-30 12:14:29', 'Melinda Babaian', 'Victor Sanchez'),
  (29262700, 11136139, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2021-10-04 11:33:39', 'Dana Weinroth', NULL),
  (29262701, 11136139, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2021-10-18 20:34:06', 'Victor Rodriguez', NULL),
  (29262702, 11136139, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (29305653, 11149775, 'All Docs uploaded', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2021-09-28 13:13:38', 'Verva Gerse', NULL),
  (29305654, 11149775, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, '2021-10-21 16:16:46', 'Victor Rodriguez', NULL),
  (29305655, 11149775, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2021-11-01 07:30:11', 'Victor Rodriguez', NULL),
  (29420270, 11186379, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (29420324, 11186431, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (29512136, 11214146, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (29527096, 11217982, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (29574635, 11230974, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (29574743, 11230998, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (29726187, 11268828, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2021-10-26 15:06:44', 'Melinda Babaian', NULL),
  (29726188, 11268828, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2021-10-26 15:06:46', 'Melinda Babaian', NULL),
  (29726189, 11268828, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2021-11-02 11:21:23', 'Melinda Babaian', NULL),
  (29785465, 11287561, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2021-10-22 09:52:36', 'Dana Weinroth', NULL),
  (29785466, 11287561, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2021-11-02 06:49:16', 'Jorge Flores', NULL),
  (29785467, 11287561, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2021-11-18 09:37:48', 'Jorge Flores', NULL),
  (29795687, 11289954, 'All Docs Uploaded', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2021-10-18 18:23:31', 'Verva Gerse', NULL),
  (29795688, 11289954, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2021-12-09 11:58:42', 'Melinda Babaian', NULL),
  (29795689, 11289954, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (29802488, 11292533, 'All docs uploaded', 'highest', 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2021-10-18 18:22:15', 'Verva Gerse', NULL),
  (29802489, 11292533, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2021-11-03 07:29:55', 'Victor Rodriguez', NULL),
  (29802490, 11292533, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (29802612, 11292606, 'all docs uploaded', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2021-10-18 18:19:53', 'Verva Gerse', NULL),
  (29802613, 11292606, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2021-11-01 12:43:06', 'Victor Rodriguez', NULL),
  (29802614, 11292606, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2021-11-11 14:48:40', 'Victor Rodriguez', NULL),
  (29831525, 11299030, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2021-11-03 14:59:38', 'Sabrina  Thorp', NULL),
  (29831526, 11299030, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, '2021-11-15 13:44:20', 'Jorge Flores', NULL),
  (29831527, 11299030, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2022-01-28 09:33:44', 'Jorge Flores', NULL),
  (29840081, 11302625, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2022-02-01 08:12:32', 'Dana Weinroth', NULL),
  (29840082, 11302625, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, '2022-12-05 15:13:55', 'Kimberly Uriarte', NULL),
  (29840083, 11302625, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2022-12-05 15:13:54', 'Kimberly Uriarte', NULL),
  (29842137, 11303103, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2022-07-05 13:15:46', 'Nicole Antoine', NULL),
  (29842138, 11303103, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, '2025-07-03 09:03:33', 'Nicole Antoine', NULL),
  (29842139, 11303103, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2025-07-03 09:03:32', 'Nicole Antoine', NULL),
  (29852728, 11305160, 'All Docs Uploaded', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2021-10-18 20:22:05', 'Verva Gerse', NULL),
  (29852729, 11305160, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2022-02-07 15:56:05', 'Verva Gerse', NULL),
  (29852730, 11305160, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2022-02-07 15:56:28', 'Verva Gerse', NULL),
  (29913960, 11321876, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (29923456, 11324374, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (30024872, 11353990, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2021-10-25 17:30:36', 'Dana Weinroth', NULL),
  (30024873, 11353990, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, '2021-11-05 16:50:44', 'Victor Rodriguez', NULL),
  (30024874, 11353990, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (30220003, 11403264, '(untitled)', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, '2021-11-03 12:24:15', 'Brian Godley', NULL),
  (30220004, 11403264, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2021-11-10 12:43:25', 'Melinda Babaian', NULL),
  (30220005, 11403264, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (30228954, 11404738, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (30241488, 11407136, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (30244638, 11407673, 'All Docs uploaded', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2021-11-01 21:06:24', 'Verva Gerse', NULL),
  (30244639, 11407673, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, '2021-12-09 11:57:52', 'Melinda Babaian', NULL),
  (30244640, 11407673, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (30303288, 11418763, 'All doc uploaded', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2021-11-02 23:44:15', 'Verva Gerse', NULL),
  (30303289, 11418763, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, '2021-11-10 10:15:08', 'Jorge Flores', NULL),
  (30303290, 11418763, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2021-11-19 15:39:46', 'Jorge Flores', NULL),
  (30401323, 11442280, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2021-11-09 12:39:45', 'Dana Weinroth', NULL),
  (30401324, 11442280, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2021-11-23 12:42:54', 'Melinda Babaian', NULL),
  (30401325, 11442280, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2022-01-03 17:23:02', 'Melinda Babaian', NULL),
  (30449200, 11453358, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2021-11-15 10:32:18', 'Nicole Antoine', NULL),
  (30449201, 11453358, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2021-11-29 10:47:55', 'Jorge Flores', NULL),
  (30449202, 11453358, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2021-12-09 11:58:21', 'Melinda Babaian', NULL),
  (30601407, 11502137, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (30612036, 11505897, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2021-11-12 15:41:20', 'Dana Weinroth', NULL),
  (30612037, 11505897, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2021-11-23 11:16:58', 'Jorge Flores', NULL),
  (30612038, 11505897, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (30653619, 11515862, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, '2022-01-04 13:31:23', 'Nicole Antoine', NULL),
  (30654254, 11515957, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2021-12-09 11:56:57', 'Melinda Babaian', NULL),
  (30654255, 11515957, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2022-01-07 16:43:48', 'Melinda Babaian', NULL),
  (30654256, 11515957, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (30770597, 11551200, 'Sales Prep', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, '2021-12-01 14:33:17', 'Brian Godley', NULL),
  (30770598, 11551200, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, '2021-12-08 11:20:12', 'Jorge Flores', NULL),
  (30770599, 11551200, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2022-01-12 14:33:24', 'Jorge Flores', NULL),
  (30881174, 11582899, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2021-12-01 10:01:07', 'Nicole Antoine', NULL),
  (30881175, 11582899, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2022-05-18 16:15:46', 'Nicole Antoine', NULL),
  (30881176, 11582899, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (30894732, 11587275, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (30895755, 11587305, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (30907391, 11589457, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (30987289, 11610311, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (30987290, 11610311, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, NULL, NULL, NULL),
  (30987291, 11610311, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (30987598, 11610380, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (30987599, 11610380, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (30987600, 11610380, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (31117968, 11638133, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (31159711, 11650482, '(untitled)', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, '2021-12-06 08:24:50', 'Brian Godley', NULL),
  (31159712, 11650482, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2021-12-09 11:57:43', 'Melinda Babaian', NULL),
  (31159713, 11650482, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (31304507, 11686236, 'all doc uploaded', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2021-12-10 14:57:50', 'Verva Gerse', NULL),
  (31304508, 11686236, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2022-02-15 15:12:09', 'Verva Gerse', NULL),
  (31304509, 11686236, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2022-02-15 15:12:47', 'Verva Gerse', NULL),
  (31305116, 11686414, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (31305117, 11686414, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (31305118, 11686414, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (31355627, 11697068, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2021-12-10 13:07:45', 'Brian Godley', NULL),
  (31355628, 11697068, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, '2021-12-15 14:46:36', 'Jorge Flores', NULL),
  (31355629, 11697068, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (31377133, 11703145, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (31611368, 11759261, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (31636585, 11767224, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (31639508, 11768634, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (31639509, 11768634, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (31639510, 11768634, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (31860409, 11822158, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2022-01-04 16:36:51', 'Dana Weinroth', NULL),
  (31860410, 11822158, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (31860411, 11822158, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (31883236, 11828538, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (31967284, 11854423, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (32002002, 11863099, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (32053630, 11877212, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2022-03-16 18:55:18', 'Verva Gerse', NULL),
  (32053631, 11877212, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (32053632, 11877212, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (32125345, 11894433, '(untitled)', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, NULL, NULL, NULL),
  (32125346, 11894433, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (32125347, 11894433, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (32145856, 11897498, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2022-01-13 16:53:02', 'Verva Gerse', NULL),
  (32145857, 11897498, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, '2022-02-18 13:07:11', 'Verva Gerse', NULL),
  (32145858, 11897498, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (32202005, 11911958, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2022-01-18 22:40:29', 'Nicole Antoine', NULL),
  (32202006, 11911958, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (32202007, 11911958, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (32224734, 11917333, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2022-01-24 14:11:14', 'Dana Weinroth', NULL),
  (32224735, 11917333, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (32224736, 11917333, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (32228857, 11918167, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2022-01-18 22:41:45', 'Nicole Antoine', NULL),
  (32228858, 11918167, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2022-04-04 10:45:32', 'Nicole Antoine', NULL),
  (32228859, 11918167, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2022-04-04 10:45:39', 'Nicole Antoine', NULL),
  (32258328, 11925579, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2022-01-19 09:31:10', 'Dana Weinroth', NULL),
  (32258329, 11925579, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, NULL, NULL, NULL),
  (32258330, 11925579, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (32323103, 11939094, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2025-07-03 09:03:31', 'Nicole Antoine', NULL),
  (32323104, 11939094, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (32323105, 11939094, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (32419966, 11965484, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, '2022-02-17 15:11:24', 'Nicole Antoine', NULL),
  (32434571, 11969146, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, '2022-02-17 15:09:15', 'Nicole Antoine', NULL),
  (32553903, 12000727, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (32610219, 12016115, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, '2022-04-28 06:30:50', 'Dana Weinroth', NULL),
  (32613336, 12017047, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (32615117, 12017373, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (32617601, 12017844, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2022-02-03 11:17:44', 'Dana Weinroth', NULL),
  (32617602, 12017844, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2022-02-15 14:34:40', 'Jorge Flores', NULL),
  (32617603, 12017844, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2022-02-15 14:34:42', 'Jorge Flores', NULL),
  (32624609, 12019655, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (32751864, 12055921, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, '2022-04-28 06:30:34', 'Dana Weinroth', NULL),
  (32851791, 12080919, 'all docs in', NULL, 'Sales Prep

8. Man Day Estimates are put in a Daily Log.', NULL, '2022-02-06 17:14:19', 'Verva Gerse', NULL),
  (32851792, 12080919, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2022-02-28 13:31:31', 'Verva Gerse', NULL),
  (32851793, 12080919, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2022-02-28 13:31:34', 'Verva Gerse', NULL),
  (32851863, 12080928, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (32851864, 12080928, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, NULL, NULL, NULL),
  (32851865, 12080928, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (32853310, 12081294, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (32884588, 12087743, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, '2022-04-28 06:30:10', 'Dana Weinroth', NULL),
  (32901082, 12092100, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2022-02-08 14:05:38', 'Dana Weinroth', NULL),
  (32901083, 12092100, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (32901084, 12092100, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (32904578, 12092920, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, '2022-04-28 06:30:30', 'Dana Weinroth', NULL),
  (33041467, 12129329, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (33048932, 12131143, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2022-02-16 08:54:29', 'Dana Weinroth', NULL),
  (33048933, 12131143, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, NULL, NULL, NULL),
  (33048934, 12131143, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (33157403, 12151137, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2022-02-15 17:52:13', 'Nicole Antoine', NULL),
  (33157404, 12151137, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2022-04-04 10:45:41', 'Nicole Antoine', NULL),
  (33157405, 12151137, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2022-04-04 10:45:43', 'Nicole Antoine', NULL),
  (33182504, 12157841, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (33198787, 12162722, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2022-02-22 19:04:00', 'Dana Weinroth', NULL),
  (33198788, 12162722, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (33198789, 12162722, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (33231475, 12172849, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (33237183, 12174250, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2022-04-01 10:28:04', 'Verva Gerse', NULL),
  (33237184, 12174250, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (33237185, 12174250, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (33250570, 12176831, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (33300266, 12190934, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', 'SUB - Remarkable Gardens'),
  (33305072, 12192102, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (33305073, 12192102, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, NULL, NULL, NULL),
  (33305074, 12192102, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (33340734, 12203020, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (33414133, 12222959, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (33439442, 12230632, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (33455329, 12234940, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2022-02-23 17:38:35', 'Nicole Antoine', NULL),
  (33455330, 12234940, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2022-04-04 10:45:29', 'Nicole Antoine', NULL),
  (33455331, 12234940, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2022-04-04 10:45:28', 'Nicole Antoine', NULL),
  (33491409, 12244813, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2022-03-01 10:22:19', 'Nicole Antoine', NULL),
  (33491410, 12244813, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', '2022-03-05', '2022-05-18 16:15:12', 'Nicole Antoine', '(.PM) Jorge Flores,JuanCarlos Vallejo'),
  (33491411, 12244813, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (33601027, 12270303, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2022-07-05 13:15:22', 'Nicole Antoine', NULL),
  (33601028, 12270303, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2023-01-17 12:58:00', 'Nicole Antoine', NULL),
  (33601029, 12270303, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2023-01-17 12:58:00', 'Nicole Antoine', NULL);

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

  RAISE NOTICE 'Batch 2 of 5 — Imported: %, Already imported (skipped): %, No matching job (skipped): %',
    v_imported, v_dup, v_no_job;
END $$;

COMMIT;
