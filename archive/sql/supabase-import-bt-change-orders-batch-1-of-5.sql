-- ============================================================
-- BT Change Orders Import — Batch 1 of 5
-- COs in this batch: 1,337 (rows 1-1337 of 6,681)
-- v3 fix: omit estimates.notes (column gone); pass '{}' for bids.projects (array).
-- Idempotent: re-runnable. Already-imported COs skipped.
-- ============================================================

BEGIN;

ALTER TABLE bids ADD COLUMN IF NOT EXISTS bt_change_order_id BIGINT;
CREATE UNIQUE INDEX IF NOT EXISTS bids_bt_change_order_id_idx
  ON bids(bt_change_order_id) WHERE bt_change_order_id IS NOT NULL;

CREATE TEMP TABLE bt_co_staging (
  bt_co_id        BIGINT       PRIMARY KEY,
  bt_job_id       BIGINT       NOT NULL,
  custom_co_id    TEXT,
  title           TEXT         NOT NULL,
  description     TEXT,
  notes           TEXT,
  owner_price     NUMERIC(14,2) NOT NULL,
  status_target   TEXT         NOT NULL,
  date_submitted  DATE,
  created_at      TIMESTAMPTZ
) ON COMMIT DROP;

INSERT INTO bt_co_staging (bt_co_id, bt_job_id, custom_co_id, title, description, notes, owner_price, status_target, date_submitted, created_at) VALUES
  (932420, 1722523, '932420', 'PM', '$350 change order for upgraded White rock instead of DelRio in contract.', 'Called Matt and he is fine with the $350 change order for the rock he wants on the side of house.
300sqft.  3.5yards of material', 350.00, 'pending', '2016-08-17', '2016-08-17 17:18:10'),
  (950125, 1731426, '950125', 'Waterproofing around the house', 'Price for soil removal and replacement only for trenching around house. 4 foot depth only.

Includes drainage.', 'Payed $25,000 
 demo 11,000 and waterproofing trench 14,000', 14000.00, 'pending', '2016-09-02', '2016-09-02 14:34:10'),
  (964394, 1727167, '964394', 'Drain pipes', 'Additional 42'' of drain pipe', 'Total drain pipe is 177''
Contracted for 135''', 630.00, 'sold', '2016-09-16', '2016-09-16 19:43:41'),
  (964969, 1862519, '964969', 'Paver Sealer', 'Seal patio pavers and planter wall', NULL, 500.00, 'pending', '2016-09-18', '2016-09-18 22:39:22'),
  (970250, 1727167, '970250', 'Extension of backyard planter wall', 'Had to extend wall for water and dirt run off', NULL, 400.00, 'sold', '2016-09-22', '2016-09-22 03:11:14'),
  (971199, 1731426, '971199', 'Added Pool Work', 'Upgrade to PebbleFina smooth finish with warranty. (colors available)
Convert to salt water system
Use heavy equipment and remove Large boulders from pool to create cleaner look. Haul away all material.
Install new poly 2 inch gas line from new meter location to new pool equipment location.
Move pool equipment to new location. Replumb all subterranean lines. Rerun electrical circuits.
Cannot get access with truck per neighbor. Must bring in small trailer and multiple dump loads. Add 2 days to demo and double dump fee
Install New Jandy Filter System, New Jandy High Efficiency Pump, New High Efficiency Jandy Heater and new above ground plumbing and controls.
Install new skimmer system

 

Total

$27,455', NULL, 27455.00, 'pending', '2016-09-22', '2016-09-22 11:06:33'),
  (971828, 1862519, '971828', 'Irrigation timer', 'Rain bird 6 station indoor timer', 'Existing timer does not work correctly', 300.00, 'pending', '2016-09-22', '2016-09-22 23:30:28'),
  (972881, 1872497, '972881', 'Additional Blockwall and concrete', 'Replacing a additional 25'' of block wall. Replacing a additional 120sqft of concrete. Replacing steps with curved step and following the design', NULL, 6000.00, 'sold', '2016-09-23', '2016-09-23 19:40:57'),
  (976498, 1727167, '976498', 'Sealer for flagstone & pavers', '$1 per sqft  total 761sqft', NULL, 761.00, 'sold', '2016-09-27', '2016-09-27 21:49:24'),
  (976499, 1727167, '976499', 'Painting planter walls to match house', 'Labor only. Customer will provide paint', NULL, 360.00, 'sold', '2016-09-27', '2016-09-27 21:50:36'),
  (978266, 1872497, '978266', 'Wall cap', 'Custom made bullnose wall cap', NULL, 550.00, 'sold', '2016-09-28', '2016-09-28 22:26:24'),
  (978501, 1785345, '978501', 'Sealer for pavers', 'Seal pavers and sit walls with gloss sealer 2,100sqft', NULL, 1980.00, 'pending', '2016-09-29', '2016-09-29 03:59:18'),
  (986271, 1785345, '986271', 'BBQ pad', 'Add a 6''x 4'' paver BBQ pad per updated plans.', NULL, 300.00, 'sold', '2016-10-06', '2016-10-06 02:49:32'),
  (990071, 1727167, '990071', 'Palm tree, extra plants and irrigation', '1 New palm tree to match existing back left side of house with additional irrigation
Planting and irrigation for 6 extra rose bushes provided by customer', NULL, 250.00, 'sold', '2016-10-10', '2016-10-10 17:24:56'),
  (995277, 1938349, '995277', 'Relocating Irrigation & hedge removal', 'Remove hedge along the back side of the pool for pavers to be 1'' away allowing for a planter along the wall.
Relocate and install 1 new valve into planter around pool and put in a drip system', NULL, 1900.00, 'sold', '2016-10-14', '2016-10-14 00:07:49'),
  (997330, 1731426, '997330', 'Trenching for solar and battery backup', 'Trenching from the back house to the main house and along the garage', NULL, 1800.00, 'pending', '2016-10-17', '2016-10-17 15:29:20'),
  (1001602, 1909324, '1001602', 'Lighting', '22 lights total Includes transformer, lights, wire, timer and installation. 3 Left driveway lights will be connected by customers electrician due to that area will be under contraction and the wire will need to be ran under the brick and into the garage', 'Payment of $10,000 for second progress payment and part lighting payment.', 4350.00, 'pending', '2016-10-20', '2016-10-20 02:09:01'),
  (1001615, 1872497, '1001615', 'Gate', 'New Gate to patio', NULL, 325.00, 'sold', '2016-10-20', '2016-10-20 02:42:38'),
  (1002054, 1785345, '1002054', 'Electrical', 'Run electrical to pergola pad, electrical to future yard post, and future office', NULL, 2000.00, 'sold', '2016-10-20', '2016-10-20 15:42:45'),
  (1002057, 1785345, '1002057', 'Concrete work for waterfall', 'Due to gophers we had to poor a concrete lining to prevent any kind of sinking', NULL, 550.00, 'sold', '2016-10-20', '2016-10-20 15:44:38'),
  (1002061, 1785345, '1002061', 'Trash can pad', 'New trash can pad near the BBQ pad', NULL, 300.00, 'sold', '2016-10-20', '2016-10-20 15:46:09'),
  (1008249, 1785345, '1008249', 'Gopher baskets for plants', 'Gopher baskets for plants', NULL, 699.63, 'pending', '2016-10-26', '2016-10-26 14:16:48'),
  (1012503, 1819483, '1012503', 'Repair Front yard copper main leak', 'Replace leaking copper line and replace a new main shutoff valve in the front yard', NULL, 410.00, 'pending', '2016-10-28', '2016-10-28 22:00:19'),
  (1012505, 1819483, '1012505', 'Paver sealer', NULL, NULL, 2340.00, 'pending', '2016-10-28', '2016-10-28 22:01:06'),
  (1015575, 1819483, '1015575', 'Backyard fountain', 'Add on the fountain in the back', NULL, 1900.00, 'pending', '2016-11-01', '2016-11-01 19:41:14'),
  (1021139, 1731426, '1021139', 'Lines and Light', 'Pool had undersized suction line need to replace back to extension area.
Needed new code required floor drain. 
Need new pool light.', NULL, 2000.00, 'pending', '2016-11-04', '2016-11-04 15:46:40'),
  (1022989, 1907063, '1022989', 'Expand Project', '$1600 for added paver sq footage.
$300 additional demo
$350 added steps for transition

No Charge to remove existing wall and steps in back
No Charge to reinstall new wall in back
No Charge to reinstall steps
No Charge for fence post installation
No Charge for plumbing repair work', NULL, 2250.00, 'pending', '2016-11-07', '2016-11-07 17:15:58'),
  (1026827, 1950413, '1026827', 'Upgrade Lawn', 'Upgrade lawn to Buffalo grass. $1200   Install in 6-8 inch clusters vs 12 inch. $780', NULL, 1980.00, 'pending', '2016-11-10', '2016-11-10 10:02:09'),
  (1027626, 1909414, '1027626', 'Fountain Lighting', NULL, NULL, 400.00, 'pending', '2016-11-10', '2016-11-10 17:20:28'),
  (1029016, 1950413, '1029016', 'Added planting for yard', 'FInal plant cost $2345 minus credit of $800.', NULL, 1545.00, 'pending', '2016-11-13', '2016-11-13 17:33:37'),
  (1032375, 1731426, '1032375', 'Masonry/Trim/Planting/Conduit', 'Add longer step forming for new design on continuous patio section by house. $1500
Added drains for gargage exit doors and patio.  $800
Removal of Large Hedging on Northside South Side and South Wall.  Stump grinding . Trim additional trees. Have to hand haul to front due to neighbor.  $4200
Added conduit for Outdoor Refridgerator.  $500
Added pump fee due to neighbor not allowing concrete truck in alley.  $400.
Add (15) 15 gallon hedges. North Wall $2900
Add (12) 15 gallon hedges West Wall  $2300
Add (10) 15 gallon hedges  South Wall by Garage $1900', NULL, 14500.00, 'pending', '2016-11-15', '2016-11-15 17:27:07'),
  (1047582, 1731426, '1047582', 'Drainage Items', NULL, NULL, 6000.00, 'pending', '2016-11-30', '2016-11-30 18:20:32'),
  (1055081, 1850217, '1055081', 'Front yard lights', '3 uplights  
10 path lights', NULL, 3250.00, 'pending', '2016-12-08', '2016-12-08 00:54:23'),
  (1055083, 1850217, '1055083', 'Paver sealer', 'Seal backyard pavers before demo', NULL, 1550.00, 'pending', '2016-12-08', '2016-12-08 00:55:55'),
  (1065167, 1986800, '1065167', 'Plumbing', 'Replace and lower laundry drain from the garage to the clean out below the kitchen window with ABS', NULL, 1000.00, 'pending', '2016-12-18', '2016-12-18 19:24:05'),
  (1066633, 1986800, '1066633', 'Additional plumbing work', 'Replacing cleanout under kitchen window due to it not being installed correctly.', NULL, 100.00, 'pending', '2016-12-20', '2016-12-20 00:02:00'),
  (1068614, 2049072, '1068614', 'Planting', 'Added planting.  Deduct $200 from this CO for tree', NULL, 650.00, 'pending', '2016-12-21', '2016-12-21 08:18:27'),
  (1068662, 1731426, '1068662', 'Add Rear Wall', 'Install rear dual split face wall.', NULL, 5900.00, 'pending', '2016-12-21', '2016-12-21 08:36:22'),
  (1068684, 1907063, '1068684', 'Trimming/Removal', NULL, NULL, 375.00, 'pending', '2016-12-21', '2016-12-21 08:44:45'),
  (1071378, 1986800, '1071378', 'Add Paver Sq Footage', 'Add square footage to backayrd patio to bring it closer to house.', NULL, 820.00, 'pending', '2016-12-26', '2016-12-26 08:52:34'),
  (1071380, 2064724, '1071380', 'Mailbox Installation', NULL, NULL, 175.00, 'pending', '2016-12-26', '2016-12-26 08:58:13'),
  (1073350, 1731426, '1073350', 'Front Wall Cap/Side Yard', '1) Demo and install new wall cap front  yard.
2) Install overaly on side of north lawn walkway and change elevation down to steps.
3) Install new concrete pad on north side of house.', NULL, 26670.00, 'pending', '2016-12-28', '2016-12-28 17:55:58'),
  (1077076, 2127923, '1077076', 'Handrail, stucco 120sqft, brick wall cap', NULL, NULL, 3800.00, 'pending', '2017-01-04', '2017-01-04 04:17:44'),
  (1077518, 1731426, '1077518', 'New Downspout and Trash Permit', 'Add new drain line connection for new downspout.  $250
Trash permit fee required by city   $1850', NULL, 2050.00, 'pending', '2017-01-04', '2017-01-04 16:20:23'),
  (1080160, 1731426, '1080160', 'Permits for Wall, Overlay etc', NULL, NULL, 3529.00, 'pending', '2017-01-06', '2017-01-06 08:52:06'),
  (1080176, 1731426, '1080176', 'Tree Removal and Stump Grinding', NULL, NULL, 900.00, 'pending', '2017-01-06', '2017-01-06 08:58:29'),
  (1083364, 2064724, '1083364', 'Added Plants', 'Total plant costs were $2497.67', NULL, 300.00, 'pending', '2017-01-10', '2017-01-10 10:57:12'),
  (1083571, 2119275, '1083571', 'Electrical for sump pump', NULL, NULL, 750.00, 'pending', '2017-01-10', '2017-01-10 20:23:00'),
  (1085415, 1731426, '1085415', 'Utilities for BBQ & fountain', NULL, NULL, 900.00, 'pending', '2017-01-12', '2017-01-12 00:44:41'),
  (1085420, 1731426, '1085420', 'Upgraded special order lights', '-31 upgraded lights $3100 -10 additional lights $3500 -23 hanging lights around pergola and trees provided by Robert $3450', NULL, 10050.00, 'pending', '2017-01-12', '2017-01-12 00:47:58'),
  (1085437, 1986800, '1085437', 'Post Installation', NULL, NULL, 450.00, 'pending', '2017-01-11', '2017-01-11 17:22:54'),
  (1087871, 1986800, '1087871', 'Additional grass', 'Grass at cost', NULL, 300.00, 'pending', '2017-01-14', '2017-01-14 02:38:22'),
  (1088047, 2119275, '1088047', 'Landscape', '1 new valve and drip line
Demo
Planting 
Mulch', NULL, 4100.00, 'pending', '2017-01-15', '2017-01-15 10:23:02'),
  (1090378, 1731426, '1090378', 'Screening Wall for AC', NULL, NULL, 795.00, 'pending', '2017-01-17', '2017-01-17 10:47:12'),
  (1097170, 2049072, '1097170', 'New valves', 'Replace 3 valves with new brass valves', NULL, 500.00, 'pending', '2017-01-24', '2017-01-24 00:36:54'),
  (1099304, 2127923, '1099304', 'Lights', NULL, NULL, 250.00, 'pending', '2017-01-25', '2017-01-25 08:10:05'),
  (1100372, 2199819, '1100372', 'Sealer', 'Seal new paver', NULL, 545.00, 'pending', '2017-01-26', '2017-01-26 02:05:39'),
  (1100374, 2199819, '1100374', 'Stucco repair', 'Demo and replace bad & cracked stucco above sliding door on right side yard', NULL, 400.00, 'pending', '2017-01-26', '2017-01-26 02:08:45'),
  (1100376, 2199819, '1100376', 'Lighting', 'Install provided lights by homeowner. Told the owner these lights won''t last that long and due to them being given to her as a gift she wants them installed. Labor and wire provided by us.', NULL, 350.00, 'pending', '2017-01-26', '2017-01-26 02:10:20'),
  (1101615, 2119275, '1101615', 'Landscape lights in front', '5 path lights 2 uplights', NULL, 1750.00, 'pending', '2017-01-26', '2017-01-26 22:26:40'),
  (1101627, 2199819, '1101627', 'Electrical work', 'Replacing 2 exterior lights
Adding 4 new lights', NULL, 1175.00, 'pending', '2017-01-26', '2017-01-26 22:30:36'),
  (1103179, 2244412, '1103179', 'Polymeric Sand', NULL, NULL, 470.00, 'pending', '2017-01-28', '2017-01-28 08:22:05'),
  (1103274, 2199819, '1103274', 'Fountain', 'Install fountain between the front 2 windows', NULL, 2000.00, 'pending', '2017-01-29', '2017-01-29 04:56:05'),
  (1105844, 1731426, '1105844', 'Stucco wall, parkway, irrigation, planting', '300sqft dwarf mondo grass. Replace galvanized to pvc in parkway. Smooth coat Stucco front wall. Cut vine down to allow it to regrow on wall. Replace parkway dirt and put pre-emergence in soil.', NULL, 8500.00, 'pending', '2017-01-31', '2017-01-31 17:16:20'),
  (1106759, 2238044, '1106759', 'New brick', NULL, NULL, 600.00, 'pending', '2017-02-01', '2017-02-01 01:19:27'),
  (1115814, 2046360, '1115814', 'Irrigation', 'Per change order', NULL, 5600.00, 'pending', '2017-02-07', '2017-02-07 22:24:40'),
  (1115819, 2046360, '1115819', 'DG and River Bed', NULL, NULL, 4875.00, 'pending', '2017-02-07', '2017-02-07 22:42:23'),
  (1115821, 2046360, '1115821', 'Paver Added', 'Rework paver bond beam and tumbled upgrade', NULL, 2700.00, 'pending', '2017-02-07', '2017-02-07 22:44:00'),
  (1115822, 2046360, '1115822', 'Paver Sealer', NULL, NULL, 1800.00, 'pending', '2017-02-07', '2017-02-07 22:45:23'),
  (1117349, 2119275, '1117349', 'Arbor', NULL, NULL, 700.00, 'pending', '2017-02-09', '2017-02-09 03:09:00'),
  (1117400, 1816202, '1117400', 'Parkway / irrigation controller', 'Install 6 station controller for front yard.  Demo and install new irrigation to parkway. Install 250 sqft RTF sod.', NULL, 2050.00, 'pending', '2017-02-09', '2017-02-09 06:14:40'),
  (1120449, 1816202, '1120449', 'Lower main water supply', NULL, NULL, 750.00, 'pending', '2017-02-13', '2017-02-13 05:59:06'),
  (1139635, 1731426, '1139635', 'Wall around pool equipment & planter box', 'Add 22'' of splitfaced wall around pool equipment. Build 4x6 above ground planter box
Upgrade on pool plaser color', NULL, 6345.00, 'pending', '2017-03-01', '2017-03-01 15:54:45'),
  (1143240, 2046360, '1143240', 'Add Zones, Concrete Steps', 'Add controller.  Install setps in concrete.  Install two new zones of irrigation', NULL, 2175.00, 'pending', '2017-03-03', '2017-03-03 11:33:18'),
  (1143623, 2108676, '1143623', 'Custom wall cap upgrade', NULL, NULL, 1200.00, 'pending', '2017-03-04', '2017-03-04 01:26:45'),
  (1150252, 1908331, '1150252', 'Apron, curb, permits', NULL, NULL, 1200.00, 'pending', '2017-03-09', '2017-03-09 20:54:54'),
  (1156782, 1938349, '1156782', 'Front yard demo and pea gravel for pathway', 'Demo parkway, front yard, remove stump, 3 yards pea gravel for pathway', NULL, 2600.00, 'sold', '2017-03-15', '2017-03-15 19:28:14'),
  (1156796, 2064862, '1156796', 'Seal pavers', NULL, NULL, 1300.00, 'pending', '2017-03-15', '2017-03-15 19:35:40'),
  (1158661, 2249247, '1158661', 'Parkway irrigation and sod', NULL, NULL, 1100.00, 'pending', '2017-03-16', '2017-03-16 21:01:33'),
  (1158956, 2249247, '1158956', 'Add Driveway', NULL, NULL, 5720.00, 'pending', '2017-03-16', '2017-03-16 21:14:28'),
  (1160264, 1731426, '1160264', 'Upgrade Color Finish', 'Upgrade cost to pool finish color', NULL, 1000.00, 'pending', '2017-03-17', '2017-03-17 20:48:31'),
  (1162244, 1938349, '1162244', 'Artificial turf', 'Tiger turf 500 sqft', NULL, 4500.00, 'pending', '2017-03-20', '2017-03-20 22:58:23'),
  (1162249, 1938349, '1162249', 'Lights in front and back', '14 lights with transformer and timer
2 column lights', NULL, 4000.00, 'pending', '2017-03-20', '2017-03-20 22:59:58'),
  (1162250, 1938349, '1162250', 'Irrigation front yard and benderboard', 'Install drip system in front yard planters
140'' benderboard for planters and pathway', NULL, 1500.00, 'pending', '2017-03-20', '2017-03-20 23:01:14'),
  (1162264, 1938349, '1162264', 'Pavers and column caps and steps stone pathway', '-9 custom made column caps
-50 sqft pavers front porch landing
- bullnose steps
-custom step stones for pathway to match column caps
- 32sqft stackstone', '$100 payment August 25 2017', 2800.00, 'pending', '2017-03-20', '2017-03-20 23:11:38'),
  (1162265, 1938349, '1162265', 'Rustic wall planters', NULL, NULL, 1700.00, 'pending', '2017-03-20', '2017-03-20 23:12:40'),
  (1162271, 1938349, '1162271', 'Planting front and back and weed barrier', '800 sqft weed barrier 2) 24" box trees 70) 5 gal', '700 payment August 25 2017', 5700.00, 'pending', '2017-03-20', '2017-03-20 23:17:14'),
  (1163981, 1816202, '1163981', 'Additional planting', NULL, NULL, 500.00, 'pending', '2017-03-21', '2017-03-21 21:31:39'),
  (1169536, 2046360, '1169536', 'Gravel and Water Feature', NULL, NULL, 4000.00, 'pending', '2017-03-26', '2017-03-26 23:14:51'),
  (1169537, 2046360, '1169537', 'Brick Patio', NULL, NULL, 6850.00, 'pending', '2017-03-26', '2017-03-26 23:15:52'),
  (1169538, 2046360, '1169538', 'Lawn and Bender Board', NULL, NULL, 10650.00, 'pending', '2017-03-26', '2017-03-26 23:16:43'),
  (1170108, 2249247, '1170108', 'T vex', NULL, NULL, 1800.00, 'pending', '2017-03-27', '2017-03-27 16:26:46'),
  (1170216, 2130391, '1170216', 'Seal pavers, steps, sit wall', NULL, NULL, 2500.00, 'pending', '2017-03-27', '2017-03-27 17:15:53'),
  (1170409, 2421739, '1170409', 'Weatherproofing on planter near pavers', NULL, NULL, 1024.00, 'pending', '2017-03-27', '2017-03-27 18:33:24'),
  (1173497, 1731426, '1173497', 'Change Boston ivy to Jasmin', 'Plans called for Boston ivy, concerned about it growing on the wall it was switched to jasmine', NULL, 250.00, 'pending', '2017-03-29', '2017-03-29 15:10:19'),
  (1177982, 1850217, '1177982', 'Backyard utilities', '140'' gas line
50'' electrical pop out from wall outlet', NULL, 4500.00, 'pending', '2017-03-31', '2017-03-31 23:50:21'),
  (1177991, 1850217, '1177991', 'Backyard lights', '12 lights', NULL, 2700.00, 'pending', '2017-04-01', '2017-04-01 00:18:40'),
  (1178000, 1850217, '1178000', 'Jar fountian', 'Allotted fountain $350-$400', NULL, 1900.00, 'pending', '2017-04-01', '2017-04-01 01:03:21'),
  (1178076, 2130391, '1178076', 'Additional up lights and transform', '8 uplights
300-600w transformer 
Timer', NULL, 2875.00, 'pending', '2017-04-01', '2017-04-01 16:47:10'),
  (1178077, 2130391, '1178077', 'Gas line for BBQ and fire pit', NULL, NULL, 2300.00, 'pending', '2017-04-01', '2017-04-01 16:49:18'),
  (1178083, 2130391, '1178083', 'Electrical', 'Fire pit outlet
BBQ outlets', 'Homeowners electrician might run electrical 
200'' 
Conduit $2000
Wire, boxes, outletsGFI weatherproof boxes $2500', 4500.00, 'pending', '2017-04-01', '2017-04-01 17:09:18'),
  (1179235, 2046360, '1179235', 'Slate, DG, Plants', NULL, NULL, 3340.00, 'pending', '2017-04-03', '2017-04-03 11:17:00'),
  (1181319, 2469943, '1181319', 'Upgraded Belgard pavers', NULL, NULL, 3075.00, 'pending', '2017-04-04', '2017-04-04 20:11:28'),
  (1181324, 2469943, '1181324', 'Seal pavers', NULL, NULL, 1513.00, 'pending', '2017-04-04', '2017-04-04 20:12:43'),
  (1185111, 2130391, '1185111', 'Enlarge the BBQ counter and water for sink', 'Enlarge BBQ 4'' 
Add water and drain pipe to planter for sink', NULL, 1832.00, 'pending', '2017-04-06', '2017-04-06 21:08:30'),
  (1185166, 2130391, '1185166', 'Upgraded lava rock for fire pit', NULL, NULL, 200.00, 'pending', '2017-04-06', '2017-04-06 21:37:01'),
  (1185316, 2130391, '1185316', 'Paver boarder around concrete', '110'' of boarder for new concrete driveway/basketball court
Rebar boarder so concrete will be attached to paver boarder
$16 per foot
Rebar $440', NULL, 2200.00, 'pending', '2017-04-06', '2017-04-06 23:01:50'),
  (1185354, 2130391, '1185354', 'Concrete sand finish', '820 sqft 
sand finish
Trash pad', NULL, 7800.00, 'pending', '2017-04-06', '2017-04-06 23:42:52'),
  (1191987, 2469943, '1191987', 'Small pathway and irrigation', '2''x20'' paver pathway
Add water for the tree and add pop up behind wall', NULL, 1380.00, 'pending', '2017-04-13', '2017-04-13 00:19:30'),
  (1192088, 2130391, '1192088', 'Soil and delivery for tree', 'Emergency delivery of soil for soil delivery.
Moon valley nursery was supposed to bring soil.', NULL, 200.00, 'pending', '2017-04-13', '2017-04-13 04:54:48'),
  (1193045, 1938349, '1193045', 'Stackstone', '42 sqft', NULL, 600.00, 'pending', '2017-04-13', '2017-04-13 19:07:15'),
  (1196386, 1850217, '1196386', 'Add 1 more uplights', NULL, NULL, 225.00, 'pending', '2017-04-17', '2017-04-17 23:22:10'),
  (1198275, 2248928, '1198275', 'Copper Water supply line for irrigation', NULL, NULL, 900.00, 'pending', '2017-04-19', '2017-04-19 01:29:29'),
  (1200465, 2248928, '1200465', 'Seal pavers', NULL, NULL, 1325.00, 'pending', '2017-04-20', '2017-04-20 15:38:57'),
  (1201472, 2248928, '1201472', '$400 build fire pit upcharge custom stucco 2 tone', NULL, NULL, 400.00, 'pending', '2017-04-20', '2017-04-20 22:09:33'),
  (1201512, 2248928, '1201512', 'Stucco planter 2 tone to match fire pit and water', '37'' re stucco planter wall and waterproof the inside', NULL, 1000.00, 'pending', '2017-04-20', '2017-04-20 22:40:07'),
  (1203765, 1706545, '1203765', 'Turf', NULL, NULL, 4300.00, 'pending', '2017-04-24', '2017-04-24 08:11:37'),
  (1203767, 1706545, '1203767', 'Down Spout/ Ivy/ Killing Grass', NULL, NULL, 1200.00, 'pending', '2017-04-24', '2017-04-24 08:12:14'),
  (1203770, 1706545, '1203770', 'Grading', NULL, NULL, 1000.00, 'pending', '2017-04-24', '2017-04-24 08:12:57'),
  (1203774, 1706545, '1203774', 'Soils, Pot Soil', NULL, NULL, 650.00, 'pending', '2017-04-24', '2017-04-24 08:13:47'),
  (1203777, 1706545, '1203777', 'Relocating Valves/ Convert', NULL, NULL, 500.00, 'pending', '2017-04-24', '2017-04-24 08:14:15'),
  (1203778, 1706545, '1203778', 'River Bed/Bender Board', NULL, NULL, 1170.00, 'pending', '2017-04-24', '2017-04-24 08:14:45'),
  (1212921, 2248928, '1212921', 'Plants', NULL, NULL, 3420.00, 'pending', '2017-05-01', '2017-05-01 09:47:12'),
  (1212926, 2248928, '1212926', 'Mulch', NULL, NULL, 750.00, 'pending', '2017-05-01', '2017-05-01 09:48:36'),
  (1217208, 2404697, '1217208', 'Repair falling brick on planter near garage', NULL, NULL, 280.00, 'pending', '2017-05-03', '2017-05-03 19:17:52'),
  (1217648, 2409229, '1217648', 'Pavers on side of house', '500 sqft AC1', NULL, 6000.00, 'pending', '2017-05-03', '2017-05-03 23:48:47'),
  (1217652, 2409229, '1217652', 'French drain and drains in paver area', '115'' drains
4'' trench drain for backyard in beginning of pavers', NULL, 2300.00, 'pending', '2017-05-03', '2017-05-03 23:51:42'),
  (1217654, 2409229, '1217654', '9 station timer', NULL, NULL, 300.00, 'pending', '2017-05-03', '2017-05-03 23:53:05'),
  (1217655, 2409229, '1217655', 'Outlet for lighting and irrigation timer', NULL, NULL, 150.00, 'pending', '2017-05-03', '2017-05-03 23:54:50'),
  (1220551, 2404697, '1220551', 'Upgraded caps', NULL, NULL, 2000.00, 'pending', '2017-05-05', '2017-05-05 19:35:52'),
  (1220556, 2404697, '1220556', 'Pergola upgrade', NULL, NULL, 750.00, 'pending', '2017-05-05', '2017-05-05 19:36:33'),
  (1220667, 2404697, '1220667', 'Additional vertical edge on side of patio', NULL, NULL, 200.00, 'pending', '2017-05-05', '2017-05-05 20:29:32'),
  (1222774, 1706545, '1222774', 'Planting Add On', NULL, NULL, 1600.00, 'pending', '2017-05-08', '2017-05-08 15:00:06'),
  (1223690, 2404697, '1223690', 'Upgrade plants', NULL, NULL, 1250.00, 'pending', '2017-05-09', '2017-05-09 16:14:57'),
  (1225795, 2404697, '1225795', 'Adding 11 podocarpus', NULL, NULL, 1950.00, 'pending', '2017-05-10', '2017-05-10 17:32:38'),
  (1226202, 1938349, '1226202', 'Seal all pavers and acid wash stains', NULL, NULL, 2012.00, 'pending', '2017-05-10', '2017-05-10 19:55:23'),
  (1226401, 1706545, '1226401', 'Additional planting', NULL, NULL, 340.00, 'pending', '2017-05-10', '2017-05-10 21:08:26'),
  (1226722, 1938349, '1226722', 'Add 1 pathlight', NULL, NULL, 200.00, 'pending', '2017-05-11', '2017-05-11 00:51:04'),
  (1233700, 1879312, '1233700', 'Paver on back patio', '$15', NULL, 2730.00, 'pending', '2017-05-16', '2017-05-16 19:52:16'),
  (1233702, 1879312, '1233702', 'Paver on front porch', '$15', NULL, 1450.00, 'pending', '2017-05-16', '2017-05-16 19:52:36'),
  (1236075, 2409229, '1236075', 'Redwood fence', '8 foot fence with gate', NULL, 830.00, 'pending', '2017-05-17', '2017-05-17 23:06:19'),
  (1237648, 2600925, '1237648', 'Front porch pavers and bullnose step?', 'Front porch 44sqft
2 steps.   13LF steps', NULL, 1310.00, 'pending', '2017-05-18', '2017-05-18 20:51:14'),
  (1241699, 2608278, '1241699', 'Upgraded pavers', 'Orco pavers', NULL, 500.00, 'pending', '2017-05-23', '2017-05-23 04:29:46'),
  (1241702, 2608278, '1241702', 'Timber ties planters', NULL, NULL, 2910.00, 'pending', '2017-05-23', '2017-05-23 04:30:38'),
  (1241714, 2600925, '1241714', 'Planting', '15- 15gal portacarpus 
9 -5gal white roses
8 -1gal asparagus fern 
12- 5 gal kangaroo paw mix
1 - 15gal white peach tree
Budget total $4500', NULL, 4500.00, 'pending', '2017-05-23', '2017-05-23 05:27:27'),
  (1243313, 2600925, '1243313', '2 additional portacarpus', NULL, NULL, 200.00, 'pending', '2017-05-23', '2017-05-23 22:46:57'),
  (1246545, 2404694, '1246545', 'Brick planter beds', 'Replace brick on 2 planters
60''', NULL, 2100.00, 'pending', '2017-05-25', '2017-05-25 19:12:53'),
  (1246553, 2404694, '1246553', 'Install jar fountain, and pool', 'Install fountain equipment.', NULL, 1000.00, 'pending', '2017-05-25', '2017-05-25 19:16:14'),
  (1246583, 2404694, '1246583', '2 new irrigation zones', '1 zones lawn 1/2 zone - $700
1 zones planters - $700', NULL, 1400.00, 'pending', '2017-05-25', '2017-05-25 19:28:55'),
  (1246590, 2404694, '1246590', 'Raise AC wall', '$200', NULL, 200.00, 'pending', '2017-05-25', '2017-05-25 19:31:25'),
  (1246629, 2404694, '1246629', 'Seal pavers and travertine', 'Seal pavers and travertine.

square footage 600 square feet. 

travertine sealer.', NULL, 550.00, 'pending', '2017-05-25', '2017-05-25 19:45:49'),
  (1247057, 2404694, '1247057', 'Planting', '1 24" box crepe Myrtle Plant cost  - $500
(10) 5 gallons for front of wall - $600
(15) 5 gallons for small planters - $900
(25) 1 gallons for fill in  - $500', NULL, 3000.00, 'pending', '2017-05-25', '2017-05-25 22:26:12'),
  (1247060, 2404694, '1247060', 'Trim back hedge', NULL, NULL, 200.00, 'pending', '2017-05-25', '2017-05-25 22:27:19'),
  (1247085, 1879312, '1247085', 'Pergola on top deck', 'Redwood with redwood detail on post', NULL, 6000.00, 'pending', '2017-05-25', '2017-05-25 22:43:19'),
  (1253639, 2600925, '1253639', 'Additional turf in front', 'Reducing the planter adding more turf', NULL, 400.00, 'pending', '2017-06-01', '2017-06-01 16:37:06'),
  (1255177, 2404694, '1255177', 'Adding 2 courses to make AC wall 6''6"', NULL, NULL, 400.00, 'pending', '2017-06-02', '2017-06-02 15:20:14'),
  (1255180, 2404694, '1255180', 'Additional valve for trees', NULL, NULL, 900.00, 'pending', '2017-06-02', '2017-06-02 15:21:05'),
  (1255919, 2600925, '1255919', '1 more portacarpus', NULL, NULL, 100.00, 'pending', '2017-06-02', '2017-06-02 20:54:11'),
  (1261968, 2409229, '1261968', '500 lbs more flagstone', NULL, NULL, 500.00, 'pending', '2017-06-08', '2017-06-08 00:15:01'),
  (1265991, 2404694, '1265991', 'Replace 2 exciting valves $ mulch for planters', NULL, NULL, 1000.00, 'pending', '2017-06-12', '2017-06-12 16:04:03'),
  (1267272, 2404694, '1267272', 'Credit from planting', NULL, NULL, 0, 'pending', '2017-06-13', '2017-06-13 03:07:17'),
  (1268464, 2409229, '1268464', 'Additional flagstone', NULL, NULL, 380.00, 'pending', '2017-06-13', '2017-06-13 19:08:20'),
  (1274100, 2152123, '1274100', 'Custom cap for the fire pit', NULL, NULL, 450.00, 'pending', '2017-06-17', '2017-06-17 00:51:43'),
  (1274101, 2152123, '1274101', 'Gas line', 'Connect from a 1/2" gas line to a 2" gas line for more gas', NULL, 700.00, 'pending', '2017-06-17', '2017-06-17 00:53:32'),
  (1275998, 2152123, '1275998', 'Seal pavers', NULL, NULL, 1000.00, 'pending', '2017-06-19', '2017-06-19 21:26:15'),
  (1278940, 2409229, '1278940', 'Added Walkway Work/Sealer', NULL, NULL, 1200.00, 'pending', '2017-06-21', '2017-06-21 09:06:17'),
  (1281412, 2152123, '1281412', 'Extend wall behind planter, veneer and cap', NULL, NULL, 1170.00, 'pending', '2017-06-22', '2017-06-22 19:31:41'),
  (1288795, 1731897, '1288795', 'Additional steps, pavers, sleeves, drains', NULL, NULL, 4260.00, 'pending', '2017-06-28', '2017-06-28 21:19:05'),
  (1292679, 2725350, '1292679', 'Seal pavers', NULL, NULL, 625.00, 'pending', '2017-07-02', '2017-07-02 23:09:34'),
  (1295339, 2280897, '1295339', 'Trash pad add on', NULL, NULL, 500.00, 'pending', '2017-07-05', '2017-07-05 20:44:27'),
  (1298873, 2280897, '1298873', 'Upgrade to bark chips', NULL, NULL, 410.00, 'pending', '2017-07-07', '2017-07-07 20:11:06'),
  (1303878, 2280897, '1303878', 'Additional electrical work on back porch', NULL, NULL, 350.00, 'pending', '2017-07-12', '2017-07-12 15:01:50'),
  (1305864, 2745950, '1305864', 'Additional pavers', '300
504', NULL, 804.00, 'pending', '2017-07-13', '2017-07-13 15:44:54'),
  (1307673, 2280897, '1307673', 'Lights', '3 uplights
3 pathlights', NULL, 1650.00, 'pending', '2017-07-14', '2017-07-14 16:01:01'),
  (1308683, 2589425, '1308683', 'Waterproofing, drains, stucco', NULL, NULL, 3200.00, 'pending', '2017-07-15', '2017-07-15 21:30:31'),
  (1309752, 2713711, '1309752', 'Replace leaking valve', NULL, NULL, 300.00, 'pending', '2017-07-17', '2017-07-17 17:36:04'),
  (1311360, 2589425, '1311360', 'Electrical', NULL, NULL, 1200.00, 'pending', '2017-07-18', '2017-07-18 15:52:27'),
  (1311369, 2589425, '1311369', 'Upgraded paver', NULL, NULL, 1200.00, 'pending', '2017-07-18', '2017-07-18 15:53:50'),
  (1312308, 2713711, '1312308', 'Additional work', NULL, NULL, 670.00, 'pending', '2017-07-18', '2017-07-18 21:09:46'),
  (1322002, 2723505, '1322002', 'Post', NULL, NULL, 500.00, 'pending', '2017-07-26', '2017-07-26 15:13:26'),
  (1323260, 2198985, '1323260', 'Stucco wall', NULL, NULL, 2100.00, 'pending', '2017-07-26', '2017-07-26 23:24:38'),
  (1329215, 2280877, '1329215', 'New drain pipes', '125'' 3" drain pipe', NULL, 3125.00, 'pending', '2017-08-01', '2017-08-01 16:22:15'),
  (1330322, 2198985, '1330322', 'Wood on top of wall', NULL, NULL, 3000.00, 'pending', '2017-08-02', '2017-08-02 00:50:27'),
  (1330323, 2198985, '1330323', 'Fence and gates', NULL, NULL, 4125.00, 'pending', '2017-08-02', '2017-08-02 00:51:38'),
  (1333285, 2198985, '1333285', 'Right side fence', NULL, NULL, 1625.00, 'pending', '2017-08-03', '2017-08-03 18:48:37'),
  (1338134, 2848625, '1338134', 'Upgrade to Belguard Catalina mod', NULL, NULL, 1300.00, 'pending', '2017-08-08', '2017-08-08 15:13:36'),
  (1338466, 2848625, '1338466', '84 sqft additional Saltillo', '$20 sqft?', NULL, 1680.00, 'pending', '2017-08-08', '2017-08-08 17:19:05'),
  (1338470, 2848625, '1338470', '28'' electrical', NULL, NULL, 560.00, 'pending', '2017-08-08', '2017-08-08 17:21:07'),
  (1340205, 2723505, '1340205', 'Upgraded paver per bid', NULL, NULL, 2180.00, 'pending', '2017-08-09', '2017-08-09 16:51:31'),
  (1344639, 2820448, '1344639', 'Drip system and planting/mulch', NULL, NULL, 2400.00, 'pending', '2017-08-12', '2017-08-12 00:51:01'),
  (1346295, 1731897, '1346295', 'Driveway & pthway', NULL, NULL, 9000.00, 'pending', '2017-08-14', '2017-08-14 19:33:23'),
  (1349037, 2820448, '1349037', 'Seal pavers', NULL, NULL, 2000.00, 'pending', '2017-08-16', '2017-08-16 02:34:25'),
  (1353106, 2884895, '1353106', 'Upgrade', NULL, NULL, 1410.00, 'pending', '2017-08-18', '2017-08-18 04:40:24'),
  (1353107, 2884895, '1353107', 'Move additional sprinklers', NULL, NULL, 50.00, 'pending', '2017-08-18', '2017-08-18 04:41:38'),
  (1363803, 2881744, '1363803', 'Replace 1 valve', NULL, NULL, 250.00, 'pending', '2017-08-26', '2017-08-26 00:04:57'),
  (1364941, 2901832, '1364941', 'Extra valve for pots', NULL, NULL, 900.00, 'pending', '2017-08-28', '2017-08-28 16:32:23'),
  (1365961, 2917823, '1365961', 'Lighting Pool area', '300w transformer 5 up lights 3 path lights 2 step lights', NULL, 2900.00, 'pending', '2017-08-28', '2017-08-28 22:31:24'),
  (1365968, 2917823, '1365968', 'Boxwood in pool area', '50. 5 gal. Boxwood 8. 5 gal. Plants 3 Flats. Blue fescue', NULL, 2500.00, 'pending', '2017-08-28', '2017-08-28 22:35:09'),
  (1365974, 2917823, '1365974', 'Additional irrigation', '1 drip zone fruit trees
1 drip zone planters
1  spray zone for hillside by turf', NULL, 2700.00, 'pending', '2017-08-28', '2017-08-28 22:39:03'),
  (1365979, 2917823, '1365979', 'CMU Planter wall and smooth coat', NULL, NULL, 1900.00, 'pending', '2017-08-28', '2017-08-28 22:40:14'),
  (1365983, 2917823, '1365983', 'Additional turf and benderboard/ weed barrier', NULL, NULL, 1335.00, 'pending', '2017-08-28', '2017-08-28 22:42:34'),
  (1365987, 2917823, '1365987', 'Extra demo', NULL, NULL, 475.00, 'pending', '2017-08-28', '2017-08-28 22:43:58'),
  (1368620, 2918476, '1368620', 'Upgrade to St Augustine', NULL, NULL, 960.00, 'pending', '2017-08-30', '2017-08-30 14:29:07'),
  (1368635, 2917823, '1368635', 'Lower dirt/ grade/ level dirt/ mulch', 'Lower dirt near fruit trees and mulch planters', NULL, 1050.00, 'pending', '2017-08-30', '2017-08-30 14:33:35'),
  (1368642, 2917823, '1368642', 'Demo 3" only/ weatherproof 12" only behind poolhou', 'Weatherproof 12" below dirt
Remove 3" of dirt
Add 3" base to divert water deigns pool house', NULL, 750.00, 'pending', '2017-08-30', '2017-08-30 14:36:49'),
  (1368661, 2917823, '1368661', '16.  5gal plants on hillside by fruit trees', NULL, NULL, 600.00, 'pending', '2017-08-30', '2017-08-30 14:42:19'),
  (1368664, 2917823, '1368664', 'Simple step Stairs going up to fruit trees', '2x6 treated lumber steps and rock landing', NULL, 800.00, 'pending', '2017-08-30', '2017-08-30 14:44:02'),
  (1369868, 2884832, '1369868', 'Upgraded wall and paver', NULL, NULL, 1352.00, 'pending', '2017-08-30', '2017-08-30 21:56:05'),
  (1372590, 2901832, '1372590', 'Drain into lawn with small Rockwell', NULL, NULL, 100.00, 'pending', '2017-09-01', '2017-09-01 16:47:19'),
  (1378920, 2884832, '1378920', 'New timer', NULL, NULL, 300.00, 'pending', '2017-09-07', '2017-09-07 20:09:08'),
  (1379616, 2917823, '1379616', 'Additional turf across pool in planter area', NULL, NULL, 640.00, 'pending', '2017-09-08', '2017-09-08 05:05:53'),
  (1383656, 2901832, '1383656', 'Lighting wire', NULL, NULL, 80.00, 'pending', '2017-09-12', '2017-09-12 14:45:59'),
  (1387506, 2608279, '1387506', 'Additional concrete side of house', 'Approved by txt message 
164 sqft concrete going from driveway to the back yard', NULL, 1640.00, 'pending', '2017-09-14', '2017-09-14 16:34:33'),
  (1395101, 2917823, '1395101', 'Palm tree, 10 more plants', 'Approved by txt', NULL, 475.00, 'pending', '2017-09-20', '2017-09-20 02:29:58'),
  (1395102, 2917823, '1395102', 'Upgrade to St Augustine/ wire mesh', 'Wire mesh under grass
Upgrade to St Augustine', NULL, 910.00, 'pending', '2017-09-20', '2017-09-20 02:32:27'),
  (1395161, 2608279, '1395161', 'Planting for planters around walls', 'Approved by txt
60 1 gal succulents 
15.  5gal plants', NULL, 1000.00, 'pending', '2017-09-20', '2017-09-20 03:40:10'),
  (1395164, 2608279, '1395164', '6 additional stepstones', 'Approved by txt
Stepstones near gate entrance and near step on concrete', NULL, 480.00, 'pending', '2017-09-20', '2017-09-20 03:42:25'),
  (1400701, 2884870, '1400701', 'Electrical for Jacuzzi', 'Approved by txt', NULL, 1825.00, 'pending', '2017-09-23', '2017-09-23 01:22:52'),
  (1405077, 2953274, '1405077', '9 station timer', NULL, NULL, 300.00, 'pending', '2017-09-27', '2017-09-27 00:11:22'),
  (1406836, 2884870, '1406836', 'Outdoor lighting', '4 pathlights
4 up light
200w transformer', NULL, 2200.00, 'pending', '2017-09-27', '2017-09-27 21:23:26'),
  (1408984, 2589425, '1408984', 'Stairs Permit', NULL, NULL, 542.41, 'pending', '2017-09-28', '2017-09-28 19:20:49'),
  (1409040, 2917823, '1409040', 'Demo/grade stump removed', 'Approved by txt by John 
Grade backyard and remove stumps
Remove soil in front to the back for grading
Remove stumps in front', NULL, 5800.00, 'pending', '2017-09-29', '2017-09-29 04:01:31'),
  (1414731, 2884870, '1414731', 'Additional wood work', 'Clear redwood TG', NULL, 2100.00, 'pending', '2017-10-04', '2017-10-04 00:00:46'),
  (1417740, 3048897, '1417740', 'Planting/valve', 'Replace valve and T off front irrigation
Amendments for planting
Weed barrier
Drip line
10). 5 gal plants
20). 1 gal plants', NULL, 1350.00, 'pending', '2017-10-05', '2017-10-05 16:39:58'),
  (1419787, 2953274, '1419787', 'Extra plant', '(1) 5 gal plant
Approved by txt', NULL, 50.00, 'pending', '2017-10-06', '2017-10-06 18:28:19'),
  (1423252, 2951006, '1423252', 'Dirt under house and move pavers', 'Move pile of pavers under house
Put 7yds dirt under house with base and compact
Approved by txt', NULL, 1000.00, 'pending', '2017-10-10', '2017-10-10 15:36:55'),
  (1424322, 3048897, '1424322', 'Black mulch', NULL, NULL, 75.00, 'pending', '2017-10-10', '2017-10-10 22:01:03'),
  (1424681, 2951006, '1424681', 'Remove neighbors tree', 'Approved by txt', NULL, 2100.00, 'pending', '2017-10-11', '2017-10-11 05:41:54'),
  (1424682, 2951006, '1424682', 'Demo/removal/ replace redwood dog ear fence', 'Approved by txt', NULL, 7800.00, 'pending', '2017-10-11', '2017-10-11 05:42:39'),
  (1424683, 2951006, '1424683', 'Credit flagstone patio and seat wall', 'By txt Need to confirm prices and additional work for the area', NULL, 4620.00, 'pending', '2017-10-11', '2017-10-11 05:48:18'),
  (1426131, 2951006, '1426131', 'Wire mesh under artificial turf area', 'Non rubber coated wire mesh 
Approved by txt', NULL, 1000.00, 'pending', '2017-10-11', '2017-10-11 21:13:58'),
  (1426766, 2951006, '1426766', 'Upgrade to pvc coated wire mesh', 'Approved by txt', NULL, 472.00, 'pending', '2017-10-12', '2017-10-12 14:12:46'),
  (1429072, 3070409, '1429072', 'Additional work', 'Approved by txt
Additional 160 sqft grass. $480
Credit $200 for less rock area
Additional $500 to place flagstone in dirt for a patio seating area', NULL, 780.00, 'pending', '2017-10-13', '2017-10-13 17:47:49'),
  (1429691, 3048897, '1429691', 'Additional front plants', 'Approved by txt
7) 5gal
15) 1gal
Use left over mulch
Discount for a even final payment of $3,000', NULL, 507.00, 'pending', '2017-10-13', '2017-10-13 22:32:45'),
  (1433863, 2884870, '1433863', 'Fence by AC', NULL, NULL, 1350.00, 'pending', '2017-10-17', '2017-10-17 22:58:51'),
  (1433934, 3070409, '1433934', 'Wire mesh under additional grass', NULL, NULL, 180.00, 'pending', '2017-10-17', '2017-10-17 23:56:56'),
  (1434131, 2951006, '1434131', 'Additional gate under stairs', 'Approved by txt', NULL, 450.00, 'pending', '2017-10-18', '2017-10-18 05:40:53'),
  (1434132, 2951006, '1434132', 'Additional demo work', 'Approved by txt', NULL, 1150.00, 'pending', '2017-10-18', '2017-10-18 05:41:53'),
  (1434133, 2951006, '1434133', 'Additional tree removal', 'Approved by txt', NULL, 650.00, 'pending', '2017-10-18', '2017-10-18 05:42:29'),
  (1434134, 2951006, '1434134', 'Wire mesh under front grass', 'Approved by txt
1420 sqft wire mesh pvc coated', NULL, 2150.00, 'pending', '2017-10-18', '2017-10-18 05:43:32'),
  (1437852, 2917823, '1437852', 'Additional 8 lights and 8 plants in pool area', 'Approved by txt 4 path lights 4 uplights 8 5gal plants', NULL, 2350.00, 'pending', '2017-10-20', '2017-10-20 02:53:30'),
  (1441847, 2249247, '1441847', 'Front porch and steps', 'Approved by txt. Demo front tile. Install new paver university paver on front porch and back step. Install 2 lights on pergola. Replace front sprinkler in parkway', NULL, 5365.00, 'pending', '2017-10-24', '2017-10-24 03:52:23'),
  (1443851, 3113079, '1443851', 'Planting landscaping', NULL, NULL, 6126.00, 'pending', '2017-10-25', '2017-10-25 01:07:04'),
  (1443860, 3113079, '1443860', '3 pathlights', NULL, NULL, 900.00, 'pending', '2017-10-25', '2017-10-25 01:14:12'),
  (1447304, 2884870, '1447304', 'Replace broken valve in front by bamboo', NULL, NULL, 150.00, 'pending', '2017-10-26', '2017-10-26 20:15:23'),
  (1451269, 3113079, '1451269', 'Replace post on porch', 'Approved by txt', NULL, 200.00, 'pending', '2017-10-30', '2017-10-30 20:41:22'),
  (1452250, 1819483, '1452250', 'Trim hedge, plants, repair fountian', 'Approved by txt', NULL, 800.00, 'pending', '2017-10-31', '2017-10-31 15:03:18'),
  (1458820, 2951006, '1458820', 'Ziofill', NULL, NULL, 375.00, 'pending', '2017-11-03', '2017-11-03 17:53:11'),
  (1458822, 2951006, '1458822', 'Additional grass', 'Removed patio and replace with grass
90sqft', NULL, 270.00, 'pending', '2017-11-03', '2017-11-03 17:54:19'),
  (1458826, 2951006, '1458826', 'Relocate irrigation timer under the house', NULL, NULL, 100.00, 'pending', '2017-11-03', '2017-11-03 17:55:00'),
  (1460042, 3164800, '1460042', 'Upgrade to Weston Wall', 'Change block to weston', NULL, 600.00, 'pending', '2017-11-05', '2017-11-05 17:58:26'),
  (1462472, 2951006, '1462472', 'DG under stairs', NULL, NULL, 280.00, 'pending', '2017-11-07', '2017-11-07 15:26:00'),
  (1468018, 2951006, '1468018', 'Mulch left side of driveway', 'Approved by txt', NULL, 787.00, 'pending', '2017-11-10', '2017-11-10 01:10:00'),
  (1468030, 2951006, '1468030', 'Additional planting', '3. 15gal cypress
1.  1gal plant', NULL, 470.00, 'pending', '2017-11-10', '2017-11-10 01:32:28'),
  (1468080, 3113079, '1468080', 'Additional pathlight', NULL, NULL, 200.00, 'pending', '2017-11-10', '2017-11-10 03:03:27'),
  (1469323, 3032221, '1469323', 'Drain pipe', '80'' 4" pipe 2 9" catchbasin', NULL, 1680.00, 'pending', '2017-11-10', '2017-11-10 20:50:13'),
  (1469383, 3032221, '1469383', 'Extend lower retaining wall 25''', NULL, NULL, 4000.00, 'pending', '2017-11-10', '2017-11-10 21:16:06'),
  (1469764, 2951006, '1469764', 'Seal/clean pavers', 'Discount price.  $0.65 per sqft foot
1791 sqft total', NULL, 1164.00, 'pending', '2017-11-11', '2017-11-11 18:44:39'),
  (1477218, 3179295, '1477218', 'Updraded bellcrete wall call', NULL, NULL, 440.00, 'pending', '2017-11-16', '2017-11-16 19:15:10'),
  (1478721, 3032221, '1478721', 'French drains behind walls', NULL, NULL, 2025.00, 'pending', '2017-11-17', '2017-11-17 17:33:28'),
  (1485683, 1731425, '1485683', 'Additional wood trim on pergola', 'Approved by txt', NULL, 1138.83, 'pending', '2017-11-23', '2017-11-23 03:14:08'),
  (1485684, 1731425, '1485684', 'Root barrier by pool equipment', '24"x 20 feet root barrier to help keep ivy growing into the planter', NULL, 400.00, 'pending', '2017-11-23', '2017-11-23 03:15:37'),
  (1485686, 1731425, '1485686', 'Drain work by pool equipment', '20'' drain pipe with 9" catch basin', NULL, 550.00, 'pending', '2017-11-23', '2017-11-23 03:17:22'),
  (1485687, 1731425, '1485687', 'Brick repair by pergola', 'Repair boarder/bombeam on brick', NULL, 850.00, 'pending', '2017-11-23', '2017-11-23 03:18:58'),
  (1488376, 1731425, '1488376', 'Additional plants', 'Approved by txt', NULL, 971.44, 'pending', '2017-11-27', '2017-11-27 23:12:32'),
  (1489322, 3032221, '1489322', 'Core drill curb', NULL, NULL, 350.00, 'pending', '2017-11-28', '2017-11-28 16:25:00'),
  (1490960, 1731425, '1490960', 'Upgraded pavers', 'Upgrade to peseo', NULL, 340.00, 'pending', '2017-11-29', '2017-11-29 04:19:15'),
  (1493112, 2339620, '1493112', 'Wall cap', NULL, NULL, 1800.00, 'pending', '2017-11-30', '2017-11-30 04:03:54'),
  (1496703, 3032221, '1496703', 'Electrical work', 'Approved by txt Repair conduit Electrical for pylaster lights Outlet of transformer', NULL, 425.00, 'pending', '2017-12-02', '2017-12-02 04:27:25'),
  (1496704, 3032221, '1496704', 'Mulch, Lanscape netting, preamergance , pavers', 'Approved by txt Landscape netting $425 Mulch. $1650 Paver plus delivery. $175', NULL, 2575.00, 'pending', '2017-12-02', '2017-12-02 04:30:59'),
  (1504725, 3232551, '1504725', 'Additional brick cap', 'Approved by txt', NULL, 2000.00, 'pending', '2017-12-07', '2017-12-07 21:28:56'),
  (1504729, 3232551, '1504729', 'Jacuzzi pad', 'Approved by txt', NULL, 800.00, 'pending', '2017-12-07', '2017-12-07 21:29:47'),
  (1504731, 3232551, '1504731', 'Additional concrete side garage', 'Approved by txt
12/20/17.  Payment $200
1/3/18.   Payment $400', NULL, 600.00, 'pending', '2017-12-07', '2017-12-07 21:30:41'),
  (1505819, 3056465, '1505819', 'New timer', '9 station outdoor timer
Approved by txt', NULL, 300.00, 'pending', '2017-12-08', '2017-12-08 17:03:09'),
  (1505837, 3056465, '1505837', 'Electrical work', 'Approved by txt', NULL, 1350.00, 'pending', '2017-12-08', '2017-12-08 17:06:12'),
  (1505863, 3056465, '1505863', 'Post trim work', 'Approved by txt', NULL, 1750.00, 'pending', '2017-12-08', '2017-12-08 17:15:11'),
  (1506086, 3056465, '1506086', 'Additional irrigation zone for grass', NULL, NULL, 900.00, 'pending', '2017-12-08', '2017-12-08 18:44:05'),
  (1516075, 3213418, '1516075', 'Additional outlet in backyard', 'Klarise approved', NULL, 450.00, 'pending', '2017-12-15', '2017-12-15 22:46:40'),
  (1516148, 3213418, '1516148', 'Seal paver and cap', 'Approved klarise', NULL, 2000.00, 'pending', '2017-12-15', '2017-12-15 23:36:37'),
  (1516160, 3213418, '1516160', 'Add paver step to back sliding door', 'Approved by phone', NULL, 600.00, 'pending', '2017-12-15', '2017-12-15 23:43:55'),
  (1520092, 3032221, '1520092', 'Mainline regulators for valves', 'Approved by txt', NULL, 500.00, 'pending', '2017-12-19', '2017-12-19 22:38:33'),
  (1521766, 3056465, '1521766', '24" box carrot wood', NULL, NULL, 600.00, 'pending', '2017-12-20', '2017-12-20 21:07:02'),
  (1525464, 3056465, '1525464', 'Plants added- 2-15 gal wax leaf Privet(Ligustrum)', NULL, NULL, 300.00, 'pending', '2017-12-26', '2017-12-26 16:50:40'),
  (1525957, 2917823, '1525957', 'Phase 2 Front fountain', 'Electrical for pump $200
Electrical for transformer $200
Fountain $2,000 (allotted fountain price $400)', NULL, 2400.00, 'pending', '2017-12-27', '2017-12-27 01:59:01'),
  (1527058, 2917823, '1527058', 'Planting', 'Removed

(1) 24 inch box
(3) 15 gallon plants
(7) 15 vines
(52) 5 gallon plants

Added

(70) 15 gallon hedges

Difference in plant cost is additional $6,780', NULL, 6780.00, 'pending', '2017-12-27', '2017-12-27 15:49:16'),
  (1530911, 2339620, '1530911', 'Additional grass for Jacuzzi area', 'Jacuzzi pad was removed and patio pad in front of Jacuzzi  (100 sq.feet)', NULL, 300.00, 'pending', '2018-01-03', '2018-01-03 02:33:05'),
  (1530913, 2339620, '1530913', 'Additional electrical for BBQ', 'Electrical Added For BBQ and out door transformer and irritation timer.', NULL, 450.00, 'pending', '2018-01-03', '2018-01-03 02:39:28'),
  (1536518, 3232551, '1536518', 'Replace brick on steps', 'Remove brick veneer and replace with Half brick manufactured used Approved by txt', NULL, 2100.00, 'pending', '2018-01-08', '2018-01-08 15:35:36'),
  (1536529, 3232551, '1536529', 'Plants', 'Added plants', NULL, 1729.39, 'pending', '2018-01-08', '2018-01-08 15:37:28'),
  (1537398, 3213418, '1537398', 'Add on 2 courses to lower wall and add pony wall', 'Dog run wall 13'' x 3 courses to retain soil Add 2 courses to wall for fence', NULL, 3850.00, 'pending', '2018-01-08', '2018-01-08 20:07:42'),
  (1544400, 3345218, 'Irrigation ', 'Subterranean drip line in front lawns', NULL, NULL, 1200.00, 'pending', '2018-01-12', '2018-01-12 19:19:18'),
  (1546189, 3232551, '1546189', 'Cost for permits', NULL, NULL, 1012.00, 'pending', '2018-01-15', '2018-01-15 19:36:01'),
  (1547665, 3345218, 'Gas line', 'Gas line. 2" poly line for fire pit & BBQ', NULL, NULL, 2750.00, 'pending', '2018-01-16', '2018-01-16 17:44:54'),
  (1548214, 3345218, 'Drain work ', 'Additional 45 feet drain and catch basin', NULL, 'Connect down spout to 3" drain and catch basin out 44 feet to popup no core.', 1008.00, 'pending', '2018-01-16', '2018-01-16 20:13:08'),
  (1552285, 3345218, 'Upgrade drip line', 'Drip irrigation upgrade', NULL, 'Irrigation to be upgraded to subterranean copper liner drip', 600.00, 'pending', '2018-01-18', '2018-01-18 22:40:39'),
  (1552555, 3232551, '1552555', 'Premium walk on mulch', NULL, NULL, 850.00, 'pending', '2018-01-19', '2018-01-19 03:23:02'),
  (1554102, 3345218, 'Add 24" box birch ', 'Add 1 -24" box white birch', NULL, NULL, 200.00, 'pending', '2018-01-20', '2018-01-20 02:27:29'),
  (1554104, 3345218, 'Electrical', 'Electrical', 'Electrical for BBQ, Irrigation and transformer@ $500. Also will be installing a out door heater. power will be pulled direct for panel @$1,600.', NULL, 2100.00, 'pending', '2018-01-20', '2018-01-20 02:35:17'),
  (1555440, 3345218, 'Subterranean drip', 'Subterranean drip for planters', 'Additional subterranean drip for plantersChanging out nettafim drip to rainbird copper line', NULL, 600.00, 'pending', '2018-01-22', '2018-01-22 18:55:37'),
  (1566851, 3282768, '1566851', 'X demo & change from fence to gate', 'Additional Demo on side of house, weed clearing    $200.00Changing 6 linear feet of Fence to 6 LF Gate            $200.00Total                                                                            $400.00', NULL, 400.00, 'pending', '2018-01-29', '2018-01-29 17:53:18'),
  (1583694, 3345218, '1583694', 'Add 2 step lights', 'Adding 2 step lights Vista in the Light Bronze finish.  SL-4242–LZ-2.5-W-T3 TOTAL should be 6', NULL, 0, 'pending', '2018-02-09', '2018-02-09 03:59:49'),
  (1583705, 2917823, '(black dye)mulch', 'Add 9 yards of black dye mulch', NULL, NULL, 1800.00, 'pending', '2018-02-09', '2018-02-09 04:26:15'),
  (1583708, 2917823, 'Ground cover', 'Add 5 flats of blue star creeper', NULL, NULL, 400.00, 'pending', '2018-02-09', '2018-02-09 04:31:03'),
  (1583720, 2917823, 'Adding 1 tree', 'Add 1 24" box Olive tree', NULL, NULL, 400.00, 'pending', '2018-02-09', '2018-02-09 05:18:47'),
  (1584900, 2917823, 'Trans planting', 'Trans plant 2 -15 gal Mulberry trees to hillside', NULL, NULL, 300.00, 'pending', '2018-02-09', '2018-02-09 21:41:30'),
  (1589281, 2917823, 'Additional plants', '9 boxwood and 3 Carolina Cherry', NULL, NULL, 480.00, 'pending', '2018-02-13', '2018-02-13 20:22:02'),
  (1593981, 3406014, '1593981', 'Paver Turf Change Order', NULL, 'Turf TBD by Sat Feb 17th', 6896.00, 'pending', '2018-02-15', '2018-02-15 18:34:46'),
  (1598778, 3494237, '1598778', 'Relocation of 5 -3/4"valves 
1 additional 3/4"', '1 additional 3/4" superior valve
Relocation of 5-3/4" valves to be replaced with new brass valves', NULL, 2230.00, 'pending', '2018-02-20', '2018-02-20 17:08:36'),
  (1606982, 3164800, '1606982', 'Front Yard Work', NULL, NULL, 1215.00, 'pending', '2018-02-26', '2018-02-26 08:50:06'),
  (1606986, 3164800, '1606986', 'Demo Block and Herb Garden', NULL, NULL, 350.00, 'pending', '2018-02-26', '2018-02-26 08:50:44'),
  (1606990, 3164800, '1606990', 'Water Proof Garage', NULL, NULL, 1655.00, 'pending', '2018-02-26', '2018-02-26 08:51:15'),
  (1612383, 3572205, '1612383', 'Posts and planter', 'Replace patio cover structure with four posts $600. Use 4x4 redwoodMake a planter area where existing fornt wall is $200. This will reduce sod size by 40 sq feet. Put a sleeve in planter to planter next to house to make it ready for irrigation. We are not installing irrigation or plants.', NULL, 800.00, 'pending', '2018-02-28', '2018-02-28 13:33:05'),
  (1613729, 3406014, '1613729', 'Valve, Extra Turf, Tree', 'For signed change order for extra valve, turf and tree planted', NULL, 1124.00, 'pending', '2018-03-01', '2018-03-01 09:48:11'),
  (1614808, 3345218, '1614808', 'BBQ reinforcements', NULL, NULL, 408.00, 'pending', '2018-03-02', '2018-03-02 01:23:23'),
  (1620186, 3595002, '1620186', 'Paver Upgrade', 'Paver upgrade to Catalina Slate', NULL, 835.00, 'pending', '2018-03-06', '2018-03-06 10:25:45'),
  (1627630, 3553310, '1627630', 'Walkway Change', NULL, NULL, 200.00, 'pending', '2018-03-09', '2018-03-09 17:46:09'),
  (1632195, 3553310, '1632195', 'Additional step', NULL, NULL, 400.00, 'pending', '2018-03-13', '2018-03-13 22:24:27'),
  (1634088, 3345218, '1634088', 'Remove Plants add a few', 'Remove plants -
(3)  5 gallons
(16) 15 gallons
(74) 1 gallons

Credit $3660

Add plants 8 flats
$640', NULL, -3020.00, 'pending', '2018-03-14', '2018-03-14 13:22:21'),
  (1637285, 3213418, '1637285', 'Add extra gate.', NULL, NULL, 500.00, 'pending', '2018-03-16', '2018-03-16 09:10:00'),
  (1637616, 3345218, '1637616', '3 Additional bougainvillia San Diego red $450', '3 15 gal. Additional bougainvillia', NULL, 450.00, 'pending', '2018-03-16', '2018-03-16 18:05:16'),
  (1638186, 3213418, '1638186', 'Counter top concrete sealer', NULL, NULL, 620.00, 'pending', '2018-03-16', '2018-03-16 21:55:32'),
  (1638295, 3345218, '1638295', 'Ledger Stone BBQ', NULL, NULL, 700.00, 'pending', '2018-03-16', '2018-03-16 17:14:56'),
  (1638297, 3345218, '1638297', '36" Post veneer', 'Veneer - Patio post with pressure treated 2x8 wrap and stack stone veneer.', NULL, 575.00, 'pending', '2018-03-16', '2018-03-16 17:18:40'),
  (1642888, 3239903, '1642888', 'BBQ assembly', NULL, NULL, 250.00, 'pending', '2018-03-20', '2018-03-20 22:37:59'),
  (1643237, 3582472, '1643237', 'Paver Upgrade', 'Changing area on side of house from rock to pavers', NULL, 1254.00, 'pending', '2018-03-20', '2018-03-20 21:36:47'),
  (1646119, 3345218, '1646119', 'Sub-Grade Irrigation Lawn', NULL, NULL, 2900.00, 'pending', '2018-03-22', '2018-03-22 09:37:18'),
  (1646998, 3239903, '1646998', 'Additional step on side yard', NULL, NULL, 450.00, 'pending', '2018-03-22', '2018-03-22 20:59:09'),
  (1647007, 3239903, '1647007', 'Additional 30 sq.feet of paver', NULL, NULL, 450.00, 'pending', '2018-03-22', '2018-03-22 20:59:59'),
  (1648452, 3239903, '1648452', 'Parts on connecting BBQ.', NULL, NULL, 200.00, 'pending', '2018-03-23', '2018-03-23 17:27:07'),
  (1649305, 3572205, '1649305', 'New Main LIne', 'Install a new main water line from the meter to house.', NULL, 9300.00, 'pending', '2018-03-23', '2018-03-23 18:11:55'),
  (1654438, 3239903, '1654438', 'Moving plants and irrigation', NULL, NULL, 275.00, 'pending', '2018-03-28', '2018-03-28 14:03:53'),
  (1657906, 3537487, '1657906', 'Additional outlet', NULL, NULL, 150.00, 'pending', '2018-03-29', '2018-03-29 21:19:08'),
  (1659445, 3213418, '1659445', 'Additional drainside / front yard', NULL, NULL, 300.00, 'pending', '2018-03-30', '2018-03-30 22:44:20'),
  (1663596, 3640228, '1663596', 'Upgrade timer to 12 station', NULL, NULL, 100.00, 'pending', '2018-04-03', '2018-04-03 21:34:43'),
  (1664121, 3606840, '1664121', 'Add zone,  added demo, main', 'Extra demo on steps for backyard transition as area had 3 layers of concrete.  Take out rock border near concrete strips by garden beds.All brick work had extra layer of patio underneath it.  plus the retaining wall required extra demo Add $500 for demo. Client requested additional zone of irrigation for garden beds.Add $775Client requested main line for valves to be moved to side area.  LIne to be done in copper.Add $350.', NULL, 1625.00, 'pending', '2018-04-04', '2018-04-04 05:24:25'),
  (1664726, 3213418, '1664726', 'Add Fascia', NULL, NULL, 600.00, 'pending', '2018-04-04', '2018-04-04 09:14:02'),
  (1665982, 3068163, '1665982', 'Electrical 55''', NULL, NULL, 1100.00, 'pending', '2018-04-05', '2018-04-05 00:01:47'),
  (1665985, 3068163, '1665985', 'Main water line 1" (copper) 80''', NULL, NULL, 2900.00, 'pending', '2018-04-05', '2018-04-05 00:02:39'),
  (1665988, 3068163, '1665988', '50'' gas line 1/14" poly line', NULL, NULL, 1500.00, 'pending', '2018-04-05', '2018-04-05 00:04:14'),
  (1667348, 3606840, '1667348', 'Add 1 step light', NULL, NULL, 290.00, 'pending', '2018-04-05', '2018-04-05 19:16:37'),
  (1667413, 3606840, '1667413', 'Electrical', 'Add 3 GFI with weather proof boxes: 

Run 20 feet conduit to post for GFI outlet on switch 

10 feet conduit for GFI for irrigation time and Transformer

Replace existing outlets to GFI with weather proof box and extension box', NULL, 1350.00, 'pending', '2018-04-05', '2018-04-05 19:36:30'),
  (1667416, 3606840, '1667416', 'Add drain for rain gutter', NULL, NULL, 125.00, 'pending', '2018-04-05', '2018-04-05 19:37:18'),
  (1667419, 3606840, '1667419', 'Add shut off valve for main line', NULL, NULL, 75.00, 'pending', '2018-04-05', '2018-04-05 19:38:17'),
  (1667425, 3606840, '1667425', 'Add 3 path lights', NULL, NULL, 675.00, 'pending', '2018-04-05', '2018-04-05 19:39:37'),
  (1667544, 3606840, '1667544', 'Electrical', NULL, NULL, 975.00, 'pending', '2018-04-05', '2018-04-05 20:14:37'),
  (1679533, 2984120, '1679533', 'Fountain Wall', NULL, NULL, 350.00, 'pending', '2018-04-13', '2018-04-13 07:27:10'),
  (1680848, 3500360, '1680848', 'Extra drain work', NULL, NULL, 3800.00, 'pending', '2018-04-14', '2018-04-14 00:50:10'),
  (1684187, 3612306, '1684187', 'Upgrade Poly Sand', NULL, NULL, 400.00, 'pending', '2018-04-17', '2018-04-17 07:58:43'),
  (1684189, 3612306, '1684189', 'Cut Paver for spread', NULL, NULL, 475.00, 'pending', '2018-04-17', '2018-04-17 07:59:59'),
  (1684195, 3612306, '1684195', 'Add on Side Driveway', NULL, NULL, 750.00, 'pending', '2018-04-17', '2018-04-17 08:00:56'),
  (1684199, 3612306, '1684199', 'Widen Walkway', NULL, NULL, 290.00, 'pending', '2018-04-17', '2018-04-17 08:02:03'),
  (1685000, 2847019, '1685000', 'Weed fabric', NULL, NULL, 200.00, 'pending', '2018-04-17', '2018-04-17 19:10:37'),
  (1685077, 3640228, '1685077', 'Additional up light & well light', NULL, NULL, 475.00, 'pending', '2018-04-17', '2018-04-17 19:34:57'),
  (1685083, 3500360, '1685083', 'Irrigation timer', NULL, NULL, 400.00, 'pending', '2018-04-17', '2018-04-17 19:36:36'),
  (1685086, 3500360, '1685086', 'Additional valve', NULL, NULL, 800.00, 'pending', '2018-04-17', '2018-04-17 19:37:08'),
  (1686859, 3068163, '1686859', 'Additional hose bib by dock', NULL, NULL, 350.00, 'pending', '2018-04-18', '2018-04-18 17:39:20'),
  (1687577, 3572205, '1687577', 'Add lawn, irrig, tree', NULL, NULL, 1980.00, 'pending', '2018-04-18', '2018-04-18 14:34:26'),
  (1689938, 3500360, '1689938', 'Additional drain work', NULL, NULL, 800.00, 'pending', '2018-04-20', '2018-04-20 00:11:42'),
  (1694155, 3572205, '1694155', 'Add zone, plants driveway beds', NULL, NULL, 1410.00, 'pending', '2018-04-23', '2018-04-23 14:08:11'),
  (1694213, 2917823, '1694213', 'Hill drain work and hill clean up.', '$2100 for added work$1300 for floor issue repair.', NULL, 800.00, 'pending', '2018-04-23', '2018-04-23 21:24:56'),
  (1695608, 3799824, '1695608', 'Seal driveway', NULL, NULL, 580.00, 'pending', '2018-04-24', '2018-04-24 16:39:47'),
  (1696577, 3572205, '1696577', 'More Timber, Pipe run', '1) We are building two courses of landscape timber (level) for the section next to driveway. $6802) We are adding more plants in the planters for the two boxes in front and for the planter next to the lawn. $4003) We are will be finishing the sump pump line in the ditch next to the driveway and covering it.  Sump pump line has to have cleanouts every 50 feet.  $800', NULL, 1880.00, 'pending', '2018-04-24', '2018-04-24 14:38:17'),
  (1701307, 3036021, '1701307', 'Add 1-24"box Agonis', NULL, NULL, 350.00, 'pending', '2018-04-26', '2018-04-26 22:29:21'),
  (1701311, 3036021, '1701311', 'Add stone to match patio area', NULL, NULL, 3500.00, 'pending', '2018-04-26', '2018-04-26 22:30:34'),
  (1701313, 3036021, '1701313', 'Add fencing to pool equipment', NULL, NULL, 300.00, 'pending', '2018-04-26', '2018-04-26 22:31:11'),
  (1701314, 3036021, '1701314', 'Add 3 up lights to match existing lights', NULL, NULL, 625.00, 'pending', '2018-04-26', '2018-04-26 22:32:15'),
  (1701316, 3036021, '1701316', 'Additional Demo', NULL, NULL, 2000.00, 'pending', '2018-04-26', '2018-04-26 22:32:35'),
  (1701322, 3036021, '1701322', 'Plant wood planter boxes', NULL, NULL, 108.00, 'pending', '2018-04-26', '2018-04-26 22:34:39'),
  (1703143, 3582472, '1703143', '2nd change order', 'Taking off contract 89 LF of one course of block  12 X 89= $1,068Adding 108 SF per plan    108SF X $11.50= $1,242.00Adding drainage 104 LF with 5 caps and 1 gutter conection   $1,215.00Courtesy discount of $174.00Balance due after pavers and drainage $1,215.00', NULL, 1215.00, 'pending', '2018-04-27', '2018-04-27 13:01:01'),
  (1714851, 3068163, '1714851', 'Water proofing by pool equipment', NULL, NULL, 600.00, 'pending', '2018-05-04', '2018-05-04 19:57:27'),
  (1714856, 3657423, '1714856', 'Add  2 high range pressure regulater', NULL, NULL, 375.00, 'pending', '2018-05-04', '2018-05-04 19:59:06'),
  (1719680, 3788174, '1719680', 'Move main line 8 feet', NULL, NULL, 375.00, 'pending', '2018-05-08', '2018-05-08 20:10:52'),
  (1719711, 3068163, '1719711', 'Repairing Irrigation', NULL, '$600. Credit for broken line', 600.00, 'pending', '2018-05-08', '2018-05-08 13:22:02'),
  (1719942, 2847019, '1719942', 'Lights', 'Added 8 lights. $200/eachand 200 feet of wiring.  $100/each', NULL, 1291.00, 'pending', '2018-05-08', '2018-05-08 14:36:12'),
  (1722522, 3641315, '1722522', 'Add weed barrier', NULL, NULL, 300.00, 'pending', '2018-05-09', '2018-05-09 21:52:56'),
  (1722528, 3641315, '1722528', 'Add 4 station timer', NULL, NULL, 375.00, 'pending', '2018-05-09', '2018-05-09 21:54:27'),
  (1730207, 3776728, '1730207', 'Drainage', '1. 16 Linear Feet of Channel drain2. 44 Linear Feet of Drainage3. 1 pop up in planter4. Trench to proper depth and grade for the channel drain in front of the garage door5. Trench to proper depth and grade for the drainage pipe to be set under the pavers6. Compact the soils in the bottom of the trench 7. Set the pipe to proper grade and set channel drain8. Connect the drains10. Backfill and compact to proper 95% compaction in trench over the pipe to prepare for pavers11. Install pop up in planter12. Haul all extra soils and debris to proper dump sites13. Clean and prepare for pavers Cost:  $1,350.00Customer discount    $200.00Total $1,150.00', 'Has been approved via Email', 1150.00, 'pending', '2018-05-14', '2018-05-14 22:46:01'),
  (1730969, 3906412, '1730969', 'Add one valve for sod', NULL, NULL, 180.00, 'pending', '2018-05-15', '2018-05-15 16:34:13'),
  (1731398, 3776728, '1731398', 'Additional Pavers on side of sports court', 'Additional pavers on the property line side where a planter was', 'Has been approved via email', 1334.00, 'pending', '2018-05-15', '2018-05-15 11:28:18'),
  (1732333, 3850586, '1732333', 'Paver Layout Upgrade', '$1000  mixed blend of Stone and Modular Catalina $2587 Slate upgrade', NULL, 3587.00, 'pending', '2018-05-15', '2018-05-15 17:10:02'),
  (1733613, 3068163, '1733613', 'Move valves front yard', NULL, NULL, 300.00, 'pending', '2018-05-16', '2018-05-16 16:47:12'),
  (1741402, 3788174, '1741402', 'Add 6 station timer', NULL, NULL, 480.00, 'pending', '2018-05-22', '2018-05-22 00:16:35'),
  (1743519, 3068163, '1743519', 'Add Drain to BBQ', NULL, NULL, 1600.00, 'sold', '2018-05-22', '2018-05-22 15:19:47'),
  (1743524, 3068163, '1743524', 'After Paving CO - 3/19', NULL, NULL, 2750.00, 'pending', '2018-05-22', '2018-05-22 15:21:14'),
  (1743532, 3068163, '1743532', 'After Planting CO - 3/19', NULL, 'Need to give $620 Robert credit', 1820.00, 'pending', '2018-05-22', '2018-05-22 15:22:54'),
  (1743548, 3068163, '1743548', 'Anglia Edger', NULL, NULL, 3575.00, 'pending', '2018-05-22', '2018-05-22 15:27:22'),
  (1743552, 3068163, '1743552', 'Slate Upcharge', NULL, NULL, 850.00, 'pending', '2018-05-22', '2018-05-22 15:28:11'),
  (1745382, 2984120, '1745382', 'Plant Credit', NULL, NULL, -3465.00, 'pending', '2018-05-23', '2018-05-23 12:15:04'),
  (1754533, 3068163, '1754533', 'Privacy fencing', NULL, NULL, 570.00, 'pending', '2018-05-30', '2018-05-30 18:58:04'),
  (1755352, 3915823, '1755352', '46'' PVC Main line for house bib', NULL, NULL, 500.00, 'pending', '2018-05-30', '2018-05-30 23:41:55'),
  (1755355, 3915823, '1755355', '80'' bend a board', NULL, NULL, 398.00, 'pending', '2018-05-30', '2018-05-30 23:43:02'),
  (1755356, 3915823, '1755356', 'Additional drip line', NULL, NULL, 251.00, 'pending', '2018-05-30', '2018-05-30 23:43:56'),
  (1755360, 3915823, '1755360', 'Timber for raised garden', NULL, NULL, 4000.00, 'pending', '2018-05-30', '2018-05-30 23:45:19'),
  (1757645, 3951833, '1757645', 'Repair broken pipe & replace plastic valve', NULL, NULL, 798.00, 'pending', '2018-05-31', '2018-05-31 21:29:00'),
  (1761217, 2469972, '1761217', 'Gas Line', NULL, NULL, 1800.00, 'pending', '2018-06-04', '2018-06-04 10:20:40'),
  (1761222, 2469972, '1761222', 'Added concrete footings', 'We added concrete footings for extra engineering.', NULL, 2000.00, 'pending', '2018-06-04', '2018-06-04 10:21:31'),
  (1761231, 2469972, '1761231', 'Electrical', 'Added plugs plus footage', NULL, 2500.00, 'pending', '2018-06-04', '2018-06-04 10:24:59'),
  (1762724, 2984120, '1762724', 'Gravel', NULL, NULL, 450.00, 'pending', '2018-06-05', '2018-06-05 06:17:24'),
  (1763001, 3915825, '1763001', 'Added Paver', 'Paver count at 45SF more, not 100 SF', NULL, 698.00, 'pending', '2018-06-05', '2018-06-05 08:05:00'),
  (1763092, 3951833, '1763092', 'Added Irrigation', NULL, NULL, 150.00, 'pending', '2018-06-05', '2018-06-05 08:29:57'),
  (1763341, 3810107, '1763341', 'Gas Line', NULL, NULL, 1300.00, 'pending', '2018-06-05', '2018-06-05 09:32:57'),
  (1763345, 3810107, '1763345', 'Extra Demo', NULL, NULL, 1500.00, 'pending', '2018-06-05', '2018-06-05 09:33:39'),
  (1764075, 3923435, '1764075', 'Irrigation', NULL, NULL, 250.00, 'pending', '2018-06-05', '2018-06-05 13:00:53'),
  (1764536, 3850586, '1764536', 'Add 900 sq feet', 'This is change order price with mix.', NULL, 10350.00, 'pending', '2018-06-05', '2018-06-05 15:23:38'),
  (1768643, 3657423, '1768643', 'Replace hose bib', NULL, NULL, 45.00, 'pending', '2018-06-07', '2018-06-07 19:33:41'),
  (1768647, 3657423, '1768647', 'Additional plants', NULL, NULL, 460.00, 'pending', '2018-06-07', '2018-06-07 19:34:33'),
  (1768944, 3850586, '1768944', 'Drainage', 'Drainage costs320 x$25 per foot  $8125Minus courtesy discount $2000Subtotal $6125Take off another 25 feet for patio 1.  -$625', NULL, 5300.00, 'pending', '2018-06-07', '2018-06-07 14:14:26'),
  (1769396, 3699210, '1769396', 'Backyard addition', 'Adding Pavers, mow strip border and gas line.  Change order in documents', 'approved via email', 11746.00, 'pending', '2018-06-07', '2018-06-07 21:41:11'),
  (1772634, 3915823, '1772634', 'Taking off Eye drop area', 'Taking off Eye Drop Pool Lounge Pad', NULL, -2150.00, 'pending', '2018-06-11', '2018-06-11 11:11:31'),
  (1772658, 3915823, '1772658', 'Retaining wall change order', 'Hi Matt and Meredith,
The scope of work includes:
NEW WALL

	Trenching additional amount for footings
	18 Linear Feet of Footing
	18 Linear feet of Belgard Belair retaining decorative wall in Victorian
	There will be 6 Linear Feet at 3 courses high with cap, 6 Linear Feet of 2 courses high with cap, 6 Linear Feet at 1 course high with cap.

Cost:      $72.00 LF X 18 LF= $1,296.00
This was approved in EMAIL', NULL, 1296.00, 'pending', '2018-06-11', '2018-06-11 11:18:06'),
  (1776192, 3657423, '1776192', '1st Plant order', 'First plant order see list in daily logs attachment', NULL, 4133.00, 'pending', '2018-06-12', '2018-06-12 19:09:58'),
  (1779571, 3915823, '1779571', 'Add Lawn,Gopher Wire', NULL, NULL, 2500.00, 'pending', '2018-06-14', '2018-06-14 08:02:31'),
  (1780496, 3915825, '1780496', 'Electrical Change order', 'Change order, I will put in change orders,26 LF of not just conduit as in contract but pulling the wire and setting up GFITotal cost:  $750.00Credit of the conduit in contract  $260.00Change order is $490.00', NULL, 490.00, 'pending', '2018-06-14', '2018-06-14 12:16:35'),
  (1787745, 3952704, '1787745', 'Pool Lights', '500W  - “equivalent lumens”  LED White Pool light  - $843 installedapproved per email', 'Pentair 601301 IntelliBrite 5G White Underwater LED Pool Light, 120 Volt, 50 Foot Cord, 500 Watt Equivalent

order from superior /scp', 843.00, 'pending', '2018-06-19', '2018-06-19 17:45:24'),
  (1788501, 3699210, '1788501', 'Electrical conduit 1/2 and 2"', 'Run 16 feet conduit and rewire 2" conduit for pond  1/2 of the run was promised in original contract', NULL, 210.00, 'pending', '2018-06-20', '2018-06-20 15:10:51'),
  (1788571, 3915825, '1788571', 'Replace single outlet to 2 gang outlet', NULL, NULL, 260.00, 'pending', '2018-06-20', '2018-06-20 15:31:51'),
  (1789121, 3952704, '1789121', 'Pool Cleaner Port', NULL, NULL, 850.00, 'pending', '2018-06-20', '2018-06-20 18:17:58'),
  (1789642, 3165059, '1789642', 'Drain Pipe', '78 linear feet of drain pipe.', NULL, 1560.00, 'pending', '2018-06-20', '2018-06-20 14:00:12'),
  (1789672, 3165059, 'Curb', 'Belgard curb 68 lf', NULL, NULL, 1496.00, 'pending', '2018-06-20', '2018-06-20 21:07:31'),
  (1790000, 3915825, '1790000', 'Gravel', 'Using 1 yard of Palm Springs 3/4" in 75 SF upgradeapproved via email', NULL, 260.00, 'pending', '2018-06-20', '2018-06-20 17:18:40'),
  (1790045, 3915825, '1790045', 'Plant count reduction', 'Plant count went from:$3,775.00 in budget to $2,625.00 in final install count= $1,150.00', NULL, -1150.00, 'pending', '2018-06-20', '2018-06-20 18:14:21'),
  (1790046, 3915825, '1790046', 'Reducing 1 valve', 'Reduced valves by one valve$150.00', NULL, -150.00, 'pending', '2018-06-20', '2018-06-20 18:16:02'),
  (1790834, 3952908, '1790834', 'Landscape Change Order', 'Add 200Sqft Lawn $900Add 300Sqft DG under Shed $980Move shed $650Excavate for new location of shed and grade approx. 4 yards soil removed  $1028Additional lawn irrigation $850Additional benda-board 50ft $385Bender Board written per contract 85ft $650Deck install $4180Mulch credit -$572Total  $9051Payment Schedule (for the Above)50% Complete $500075% Complete $2000100% Complete $2051', NULL, 9051.00, 'pending', '2018-06-21', '2018-06-21 08:24:22'),
  (1791951, 3676700, '1791951', 'Additional work', 'Hi Verva, Change order approved. Thanks, Jacki On Tue, Jun 19, 2018 at 2:20 PM, Verva  wrote:   Hi Jacki, I we are coming along.  Demo is almost done.  Please approve these change orders:   Drainage, as per our discussion 26 additional linear feet at the SDR 35 rate $20.00 = $520.00 59 additional linear feet at the SDR 35 rate $20.00 = $1,180.00 Total for Drainage: $1,700.00   Pavers, on the side of house 27’ X 3’= 81 Square Feet X $11.50= $931.00   Moving a main water line $100.00   Bench Seat: Bench Seat 2 options: 14 LF long,  24” deep, with 2 LF (12”) into the fence, 18” high Cap will 12” deep @ $84.00 X 16= $1,344.00 + 12” SF pavers $161.00 = $1,505.00 We can fill in the 14 feet in the back of the wall with soil for a planter, or only 12 SF of pavers for a 24” deep seat. It would be enough room to put back cushions. The $1,505.00 minus the 15 cent credit ($303.00)= $1,202.00   Steps 22 Linear Feet in contract, need to add 4 more linear feet to make the steps 4’6” wide, and for step edge on porch 4 LF X $50.00= $200.00   TOTAL OF ALL CHANGES: $4,133.00', NULL, 4133.00, 'pending', '2018-06-21', '2018-06-21 21:22:28'),
  (1793807, 3699210, '1793807', 'Taking off polymeric sand in pavers', 'Not using polymeric sand in pavers, still need in steps', NULL, -420.00, 'pending', '2018-06-22', '2018-06-22 13:53:05'),
  (1794185, 3068163, '1794185', 'After Demo CO - 3/19', NULL, NULL, 3000.00, 'pending', '2018-06-23', '2018-06-23 08:40:01'),
  (1795539, 3676700, '1795539', 'New Post', 'Change out 8x8 post.', NULL, 500.00, 'pending', '2018-06-25', '2018-06-25 09:46:00'),
  (1800897, 3850586, '1800897', 'Add Seat Wall', NULL, NULL, 3400.00, 'pending', '2018-06-27', '2018-06-27 11:25:48'),
  (1805515, 3165059, '1805515', 'Did not do main line. Credit', 'Did not do main line. Irrigation included ball valve.', NULL, -4000.00, 'pending', '2018-06-29', '2018-06-29 18:26:26'),
  (1810523, 3952704, '1810523', 'Pool Resurface', NULL, NULL, 5500.00, 'pending', '2018-07-03', '2018-07-03 20:14:14'),
  (1811593, 4128999, '1811593', 'Additional 5 linear feet step build', NULL, NULL, 250.00, 'pending', '2018-07-05', '2018-07-05 16:09:56'),
  (1817595, 3952908, '1817595', 'Planting', '15-Gallon
			Red Bud Tree - Purple leaf (1)		Carolina cherry laurel (5)			5-Gallon
			Nandina - can we get the ''blush'' (5)		Pittosporum tobira varigata (5)			1-Gallon
			Daylilies - "stella de orro" (6)		Achillea  - yellow (6)		Salvia leucantha (6)', NULL, 1660.00, 'pending', '2018-07-10', '2018-07-10 08:34:24'),
  (1819106, 4129070, '1819106', 'Changes various', '1)    Reducing turf from 400 to 125 SF    Credit -$2,470.00    2)    Adding curves $200.003)   Wrapping a post in wall block 18" high at wall level  $350.004)    Adding pavers 13X4=52 X $12.00 =$624.005)     Adding one step 6 LF X $50,00    $300.006)    Adding 10 SF at driveway side for flair    $120.00Credit of $876.00APPROVED VIA SIGNATURE ON DRAWING', NULL, -876.00, 'pending', '2018-07-10', '2018-07-10 16:29:12'),
  (1819945, 3863384, '1819945', 'Planter with weed guard in concrete', 'Building a weed barrier in concrete for planter by second wall.  Jorge to place 3/4" pipe for drainage.  $1,600.00 and 20 Horse Tail plants @ 1 gallon  $400.00', NULL, 2000.00, 'pending', '2018-07-11', '2018-07-11 08:46:08'),
  (1821265, 3676700, '1821265', 'Additional paver', NULL, NULL, 500.00, 'pending', '2018-07-11', '2018-07-11 21:18:56'),
  (1826810, 3810107, '1826810', 'Additional plants', NULL, NULL, 310.00, 'pending', '2018-07-16', '2018-07-16 14:43:13'),
  (1826881, 3676700, 'Additional light', 'Additional light', 'Adding one more light. Approved by signature on drawing.', NULL, 225.00, 'pending', '2018-07-16', '2018-07-16 15:02:35'),
  (1830538, 4128999, '1830538', 'Wood upgraded to all clear heart red wood', NULL, NULL, 1500.00, 'pending', '2018-07-17', '2018-07-17 20:59:21'),
  (1832704, 2984120, '1832704', 'Drains etc', NULL, NULL, -3345.00, 'pending', '2018-07-18', '2018-07-18 12:56:13'),
  (1837653, 3952704, '1837653', 'Pool light ring and base replacement', NULL, NULL, 280.00, 'pending', '2018-07-21', '2018-07-21 20:12:37'),
  (1837654, 3952704, '1837654', 'Pool light feed line', NULL, NULL, 220.00, 'pending', '2018-07-21', '2018-07-21 20:14:23'),
  (1844184, 4069521, '1844184', 'Upgrade 3 valve''s to brass', NULL, NULL, 600.00, 'pending', '2018-07-25', '2018-07-25 18:12:23'),
  (1847565, 3676700, '1847565', 'Additional plants', NULL, NULL, 260.00, 'pending', '2018-07-27', '2018-07-27 00:44:37'),
  (1849536, 4165784, '1849536', 'Extra wall work', NULL, NULL, 300.00, 'pending', '2018-07-28', '2018-07-28 00:17:39'),
  (1852377, 3068163, '1852377', 'Front irrigation', 'Reroute irrigation systems and new brown drip line', 'Credit of $600.', 1200.00, 'pending', '2018-07-31', '2018-07-31 01:04:25'),
  (1852537, 4128999, '1852537', 'Additional wall. 3 courses', 'Additional 3 course belgard Weston in Bella.', NULL, 2376.00, 'pending', '2018-07-31', '2018-07-31 04:52:45'),
  (1853748, 3863384, '1853748', 'Additional retaining wall', NULL, NULL, 3300.00, 'pending', '2018-07-31', '2018-07-31 18:05:43'),
  (1858227, 3068163, '1858227', 'Permits for Wall & Patio Cover Extension', 'Ryan – Design, permit running, time at city hall etc                $1000Geo-Labs – Soils report for wall                                               $1041Geo –labs  - compaction testing                                               $1262.50Stromb Engineering for patio cover extension                         $1000Thousand Oaks Permit Fees                                                   $722.93 Total      $5026.43', NULL, 5026.00, 'pending', '2018-08-02', '2018-08-02 09:32:05'),
  (1868946, 3863384, '1868946', 'CREDIT Deck of 16 square feet', 'Taking out 16 linear feet of decking with redwood upgrade, and staining@  $60 a square foot', NULL, -960.00, 'pending', '2018-08-08', '2018-08-08 16:55:06'),
  (1881318, 4238438, '1881318', 'Additional pavers', '20sqft additional', NULL, 250.00, 'pending', '2018-08-16', '2018-08-16 04:28:04'),
  (1881320, 4177727, '1881320', 'Tree Added', '15 gallon Magnolia "Little Gem"', NULL, 150.00, 'pending', '2018-08-16', '2018-08-16 04:29:50'),
  (1884703, 4186919, '1884703', 'Wall choice approval', 'Using Angelus stone wall II Cream/terracotta/BROWN. Wall block and cap.', NULL, 0, 'pending', '2018-08-17', '2018-08-17 19:11:58'),
  (1884787, 3068163, '1884787', 'Lowering and painting fence', 'For lowering fence from 5 feet to 3 feet per homeowner request. painting fence', NULL, 2200.00, 'pending', '2018-08-17', '2018-08-17 19:45:28'),
  (1885079, 4246369, '1885079', 'Permits', 'This is for the permit fee for the job.', NULL, 336.00, 'pending', '2018-08-17', '2018-08-17 14:56:58'),
  (1885081, 2248927, '1885081', 'Engineering for Pool', NULL, NULL, 1450.00, 'pending', '2018-08-17', '2018-08-17 14:58:35'),
  (1893395, 3964499, '1893395', 'Sump Pump LIne', NULL, NULL, 2600.00, 'pending', '2018-08-23', '2018-08-23 06:47:53'),
  (1896234, 4288757, '1896234', 'Avignon Change order', 'Upgrade to Belgard Catalina Grana Avignon
778 SF X .60= $467.00', NULL, 467.00, 'pending', '2018-08-24', '2018-08-24 10:31:43'),
  (1897523, 2248927, '1897523', 'House Stucco', 'Full House Stucco 0 $11,500', NULL, 11500.00, 'pending', '2018-08-26', '2018-08-26 09:42:58'),
  (1900062, 3068163, '1900062', 'Additional planting front yard (westrangia)', NULL, NULL, 960.00, 'pending', '2018-08-27', '2018-08-27 23:06:36'),
  (1902077, 3068163, '1902077', 'Additional pavers 130 square feet', NULL, NULL, 1820.00, 'pending', '2018-08-28', '2018-08-28 20:32:20'),
  (1902656, 2248927, '1902656', 'Additional stucco for walls.', 'For planter walls', NULL, 2900.00, 'pending', '2018-08-29', '2018-08-29 00:18:24'),
  (1903533, 2248927, '1903533', 'First Permits, Planning', 'Initial city permit fees. Planning Checks etc.', NULL, 1100.00, 'pending', '2018-08-29', '2018-08-29 08:59:57'),
  (1903970, 2469972, '1903970', 'Tile work on outdoor island and BBQ', NULL, NULL, 450.00, 'pending', '2018-08-29', '2018-08-29 18:03:34'),
  (1905218, 4238438, '1905218', 'Planting / lawn change order', 'APPROVED BY EMAIL', 'Original contract for planting $4640
 
46-5Gal @ $40ea   - $2080
5-15Gal @ $150ea   - $750
3-24” @ $350ea  - $1050
Total planting $3880
 
Additional lawn (because you wanted the planters smaller-which made the lawn larger)
From 800 to $1080Sqft
@ $3sqft x220 $660 
 
There is a credit of $100', -100.00, 'pending', '2018-08-29', '2018-08-29 21:15:30'),
  (1905980, 3863384, '1905980', 'CREDIT for selecting reduced priced lights', NULL, NULL, -540.00, 'pending', '2018-08-30', '2018-08-30 09:25:27'),
  (1905985, 3863384, '1905985', 'CREDIT for Installation of Pergola', NULL, NULL, -1400.00, 'pending', '2018-08-30', '2018-08-30 09:26:10'),
  (1905987, 3863384, '1905987', 'CREDIT taking out Bench Seats', NULL, NULL, -2400.00, 'pending', '2018-08-30', '2018-08-30 09:26:32'),
  (1905991, 3863384, '1905991', 'Additional wall in back', NULL, NULL, 3625.00, 'pending', '2018-08-30', '2018-08-30 09:27:16'),
  (1905992, 3863384, '1905992', 'Additional demo for back wall', NULL, NULL, 1200.00, 'pending', '2018-08-30', '2018-08-30 09:27:27'),
  (1905993, 3863384, '1905993', 'Electrical and Plumbing Permits', 'This covers the permit fee for electrical and plumbing', NULL, 266.00, 'pending', '2018-08-30', '2018-08-30 09:27:36'),
  (1907928, 3964499, '1907928', 'Design Cost', NULL, NULL, 700.00, 'pending', '2018-08-31', '2018-08-31 08:26:55'),
  (1908097, 4264636, '1908097', 'Adding Irrigation', 'Customer wants to add irrigation. 

2 new zones of drip and a new 9 station timer.', NULL, 2300.00, 'pending', '2018-08-31', '2018-08-31 09:36:40'),
  (1910235, 3950271, '1910235', 'Change orders to date 18-9-1', 'Tile overlay Concrete
Additional SF 54 X $27.00
Cost:          $1,458.00




Belgard Noon Porcelain Paver
Upgrade

Cost:          $2,433.00

Additional Linear Feet of Kitchen Counter
The counter was expanded 3 Linear Feet, 2 LF + 1 LF
3 X $850.00
Cost:          $2,550.00

Additional Stack Stone in Black Quartz
From the contract we added additional lf of counter and expanded the stack stone to cover the 7 foot side facing the water feature. At 3 feet high.  Additional 27 SF X $25.00
Cost:          $675.00

Total of additional costs:   $7,116.00



Credits:

Planting
Reduction in bender board 45 LF- 19 LF=26 LF
Credit:      $152.00

Reduction in planting, because of expanded tile patio 4 @ 1 gallon and 4 @ 5 gallon
Credit:      $240.00

Reduction of Step Stones in backyard
Reduction of step stone in the backyard from 18 -7= 11 remaining
The steps stone are custom made
Credit:      $630.00
Total of credits:          $1,022.00


Difference of all change orders:
$6,094.00


Please respond to this with your approval, so that we may continue moving forward with your project.
Thank you for choosing Picture Build!!
GUS APPROVED THIS VIA EMAIL', NULL, 6094.00, 'pending', '2018-09-04', '2018-09-04 07:12:55'),
  (1910904, 4167766, '1910904', 'Gas line for fire pit', NULL, NULL, 1850.00, 'pending', '2018-09-04', '2018-09-04 17:16:14'),
  (1912950, 4288757, '1912950', 'Step build. 6 linear feet', 'Misunderstanding on steps. 2 steps 3lf wide each. I charged an extra 50 cents per SF. It is covered in contract price. 
Overage on pavers $389.  Overage on Paver upgrade $233.=$622 - steps $300. = $322 Overage on contract unit pricing.', NULL, 0, 'pending', '2018-09-05', '2018-09-05 15:08:15'),
  (1913414, 4300720, '1913414', 'Synthetic Grass', 'simple turf "Cali supreme"  105sqft
see design for location , measure from jobsite', NULL, 1600.00, 'pending', '2018-09-05', '2018-09-05 10:10:25'),
  (1913669, 4312960, '1913669', 'Design chk# 1448', NULL, '$1050 design fee,  $525 paid', 525.00, 'pending', '2018-09-05', '2018-09-05 11:27:09'),
  (1914030, 4312960, '1914030', 'Pressure Treated (revised)', 'install pressure treated ,screwed  to new fence as needed   
6" to 12" sizes', 'when ready please consult with Ryan', 1272.00, 'sold', '2018-09-05', '2018-09-05 13:02:52'),
  (1914158, 4312960, '1914158', 'Lion BBQ Equipment', '$3099 includes  (price matched)
1. 40" BBQ  #90823  
2. Single Side Burner # L5631
3. Door & Drawer Combo # L3320
4. Refrigerator #2002
5. Sink with Faucet # 54167
6. Charcoal Tray # L109673

Recommend you get a double door for under the BBQ
$294 (price matched)

Total $3393', 'Change out double door to Horizontal Door

note to self will find out if there is a credit or now', 3393.00, 'sold', '2018-09-05', '2018-09-05 13:36:21'),
  (1914980, 3068163, '1914980', 'Planting Per Design', 'Symbol
			Name
			Size
			Quantity
		
		
			ML
			Magnolia “Little Gem”
			15Gal
			3
		
		
			CM
			Crape Myrtle  “Multi”    pink or burgundy – no white
			15Gal
			1
		
		
			C24
			Crape Myrtle  “Standard” pink or burgundy – no white
			24”Box
			1
		
		
			JM
			Japanese Maple “Bloodgood”
			15Gal
			2
		
		
			CC
			Carolina Cherry
			5Gal
			5
		
		
			PS
			Pitosporum Silver Sheen
			15Gal
			6
		
		
			CJ
			Camelia Japonica - pink
			15Gal
			2
		
		
			IR
			Iceberg Rose  “White”
			5Gal
			7
		
		
			ND
			Nandina Domestica
			5Gal
			3
		
		
			LG
			Liriope Gigantea
			5Gal
			11
		
		
			AR
			Arbutilon (1-RED)(2-Peach), no white or varigated
			5Gal
			3
		
		
			DL
			Daylily “Stella De Oro”
			1Gal
			13
		
		
			DB
			Daylily “Burnt Orange”  the biggest tallest orange variety
			1Gal
			10
		
		
			CT
			Canna Lily “Tropicana”
			1Gal
			4
		
		
			JA
			Japanese Anemone “pink or peach” – not white
			1Gal
			7
		
		
			AD
			Asparagus densiflorus ''Meyers'' (A. meyeri)
			1Gal
			16
		
		
			GM
			Geranium macrorrhizum
			1Gal
			7
		
		
			Lantana
			Lantana “Groundcover” pink or red
			Flat
			4
		
		
			BI
			Parthenocissus tricuspidata
			1Gal
			8
		
		
			AC
			Achillea “Red or burgundy” dwarf variety
			1Gal
			4
		
	


Remove 1 large junipers and dispose,

Total Additional cost  - no change', NULL, 0, 'sold', '2018-09-05', '2018-09-05 23:22:46'),
  (1915397, 2248927, '1915397', 'Additional stucco work to guest house', NULL, NULL, 3500.00, 'pending', '2018-09-06', '2018-09-06 14:49:05'),
  (1916579, 4400695, '1916579', 'Shrub removal', '6 large shrubs to be removed please see photos.  Approved via email', NULL, 600.00, 'pending', '2018-09-06', '2018-09-06 13:45:13'),
  (1917698, 3165059, '1917698', 'Plant Credit', NULL, NULL, -151.66, 'pending', '2018-09-07', '2018-09-07 08:05:34'),
  (1918958, 4077921, '1918958', 'Replace 2 anchor', NULL, NULL, 150.00, 'pending', '2018-09-08', '2018-09-08 00:57:59'),
  (1918959, 4077921, '1918959', 'Additional valve for front yard', NULL, NULL, 850.00, 'pending', '2018-09-08', '2018-09-08 00:58:25'),
  (1923763, 2984120, '627363', 'BBQ equipment', NULL, NULL, 1643.30, 'pending', '2018-09-11', '2018-09-11 14:20:07'),
  (1923767, 2984120, '1923767', 'Design Credit', NULL, NULL, -550.00, 'pending', '2018-09-11', '2018-09-11 14:21:39'),
  (1928927, 4167766, '1928927', 'Added Paver Footage', 'Paver patio extended due to layout on walk through.   Then paver patio and walkways extended again due to reducing planter on side yard.  

Original Contract was for 622 sq feet.
Installed paver was 780 sq feet. 

Total added footage was 158 sq feet. 

Artificial Turf is 320 sq feet contract was 300.  - Courtesy no charge for addtional sq footage.', NULL, 1738.00, 'pending', '2018-09-13', '2018-09-13 18:49:22'),
  (1928938, 4167766, '1928938', 'Sealer', 'Sealer all paver', NULL, 875.00, 'pending', '2018-09-13', '2018-09-13 19:04:00'),
  (1929033, 4011993, '1929033', 'Wall Sealer', 'Thoroseal/surecoat "masonry sealer" behind all walls, 2 coats,', 'up to 8 hours labor should be spent on this, according to the crew..we shal see', 850.00, 'sold', '2018-09-13', '2018-09-13 21:03:57'),
  (1930470, 4077921, '1930470', 'Replace valve', NULL, NULL, 150.00, 'pending', '2018-09-14', '2018-09-14 19:49:20'),
  (1930757, 2248927, '1930757', 'Electrical work', 'originally 800 , credit of 300 given', NULL, 500.00, 'pending', '2018-09-14', '2018-09-14 21:40:31'),
  (1932517, 4097170, '1932517', 'Additional Wall Block', 'Added 8 LF of 4 Feet high Angelus Stone Wall II block and cap in grey moss charcoal', NULL, 1168.00, 'pending', '2018-09-17', '2018-09-17 10:05:30'),
  (1938086, 3863384, '1938086', 'Upgrade deck to IPE', NULL, NULL, 3100.00, 'pending', '2018-09-19', '2018-09-19 12:27:05'),
  (1945713, 3165059, '1945713', '24 inch box plant removal', 'credit', NULL, -406.80, 'pending', '2018-09-24', '2018-09-24 17:00:52'),
  (1945947, 4104447, '1945947', 'Concrete Demo 250 SF in back yard', 'Demolition of 250 SF in back yard', NULL, 1200.00, 'pending', '2018-09-24', '2018-09-24 21:53:33'),
  (1945948, 4104447, '1945948', '24 LF of 3'' High fence demolition', 'Demolition of 24 LF of 3'' high wood fence', NULL, 250.00, 'pending', '2018-09-24', '2018-09-24 21:54:56'),
  (1946009, 3357309, '1946009', 'Design payment', NULL, NULL, 750.00, 'pending', '2018-09-25', '2018-09-25 01:27:30'),
  (1946577, 3863384, '1946577', 'CREDIT Change orders 18-9-22', 'Reduced the oz of Turf from 90 oz in contract to 50 oz $1.00 a SF credit
Added 36 SF of Turf

Please see attached chenge order', NULL, -21.00, 'pending', '2018-09-25', '2018-09-25 08:14:18'),
  (1946587, 3863384, '1946587', 'CREDIT Electrical', 'Electrical Verified by Max,
Pulled 92 LF from the 100 LF inbudget
8 X $25.00
$200.00 credit', NULL, -200.00, 'pending', '2018-09-25', '2018-09-25 08:16:05'),
  (1946591, 3863384, '1946591', 'CREDIT Concrete pads', 'Please see attached changes in concrete', NULL, -87.00, 'pending', '2018-09-25', '2018-09-25 08:17:58'),
  (1946598, 3863384, '1946598', 'CREDIT Takingout Fence Shelving', 'Shelving on back wall taken out', NULL, -240.00, 'pending', '2018-09-25', '2018-09-25 08:19:35'),
  (1946603, 3863384, '1946603', 'CREDIT Taking out Douglas Fir wood', 'Credit of wood not being used, Jennifer is buying her own wood for fencing', NULL, -1512.00, 'pending', '2018-09-25', '2018-09-25 08:21:36'),
  (1946613, 3863384, '1946613', 'CREDIT Taking out Bender Board', 'Taking bender board out of contract', NULL, -440.00, 'pending', '2018-09-25', '2018-09-25 08:24:03'),
  (1946624, 3863384, '1946624', 'Rocks set in concrete', 'Rocks on side of property line put in trench and poured conrete in trench', NULL, 350.00, 'pending', '2018-09-25', '2018-09-25 08:28:46'),
  (1946628, 3863384, '1946628', 'Additional plants to be planted', 'Installation only $10 @ 1 gallon X 8= $80.00
Installation only $20 @ 5 Gallon X 3= $60.00
$140.00', NULL, 140.00, 'pending', '2018-09-25', '2018-09-25 08:30:54'),
  (1946641, 3863384, '1946641', 'Upgrade to Mexican Black with credits for damages', 'Added 71 sq feet of rock.  Original contract was 507sq feet. Installed 578.
$426

Upgrade to Mexican Beach Pebble.
$1976 total rock Material Cost
($224) credit for gravel included in contract

Please see attached notes:
Lemon tree was accidentally chopped off and the water was left on all night
($578) credit

Total Change Order
$1600', NULL, 1600.00, 'pending', '2018-09-25', '2018-09-25 08:34:42'),
  (1946719, 4389311, '1946719', 'Additional pavers on side of house', '198 Square Feet X $9.50  bobcat accessable
Approved with signature on contract

Additional 198 SF bobcat demo', NULL, 1881.00, 'pending', '2018-09-25', '2018-09-25 08:57:43'),
  (1950479, 4383200, '1950479', 'New irrigation clock & wire', 'Install new irrigation control wire from garage to rear valves.  Install new Rain Dial 9 station irrigation control clock in garage', NULL, 950.00, 'pending', '2018-09-26', '2018-09-26 23:08:34'),
  (1951931, 3950271, '1951931', 'Stainless steel step edging', 'Installing a stainless steel edging on the step overlay
Materials should be only $240.00
Should be same labor', NULL, 837.00, 'pending', '2018-09-27', '2018-09-27 11:37:16'),
  (1951943, 4389311, '1951943', 'Additional Drainage', 'Additional 34 Linear Feet of Drainage SDR 35  $25.00 X 34 LF', NULL, 850.00, 'pending', '2018-09-27', '2018-09-27 11:39:19'),
  (1951949, 4389311, '1951949', 'Anglia Curb Edging', 'Belgard Anglia Curb 
37 Linear Feet X $27.00
$999.00', NULL, 999.00, 'pending', '2018-09-27', '2018-09-27 11:41:57'),
  (1952198, 4104447, '1952198', 'Changing Wall', 'Demo 8 LF of Wall  8 X $20 $160.00
Install 3 course with cap 6 LF X $82.00= $492.00
$652.00', NULL, 652.00, 'pending', '2018-09-27', '2018-09-27 12:52:55'),
  (1952199, 4011993, '1952199', 'Grass & DG Extension', 'ADD
1. 100Sqft DG at upper hillside patio per design  $400
2. 100Sqft lawn at front yard lawn extension including 1 sprinkler $385', NULL, 785.00, 'sold', '2018-09-27', '2018-09-27 12:53:17'),
  (1952214, 4097170, '1952214', 'Rock taken out of contract', NULL, NULL, -3000.00, 'pending', '2018-09-27', '2018-09-27 12:58:30'),
  (1952216, 4097170, '1952216', 'Mulch taken out', NULL, NULL, -2100.00, 'pending', '2018-09-27', '2018-09-27 12:59:21'),
  (1952425, 4104447, '1952425', 'Additional 4 1/2 LF of Wall', NULL, NULL, 369.00, 'pending', '2018-09-27', '2018-09-27 13:53:36'),
  (1958471, 4104447, '1958471', 'Wall cap 21 lf', 'Wall cap on existing wall.', NULL, 525.00, 'pending', '2018-10-02', '2018-10-02 16:30:15'),
  (1963474, 4381266, '1963474', 'Arbutus marina', '(3) 15 gal arbutus marina', NULL, 450.00, 'pending', '2018-10-04', '2018-10-04 17:13:37'),
  (1964502, 3068163, '1964502', 'Pressure Regulator', 'Pressure Regulator Installation', NULL, 300.00, 'pending', '2018-10-04', '2018-10-04 15:19:02'),
  (1964532, 4389311, '1964532', 'Anglia edged 7 of more', '7 more of edger @27 = $189.00', NULL, 189.00, 'pending', '2018-10-04', '2018-10-04 22:33:48'),
  (1968116, 4496941, '1968116', 'Additional Demo Items & -600 credit', 'Demo/Cleanup - Additional
 


	Existing pavers 330Sqft  ($660)
	35ft x 16” brick wall - Dispose Only ($330)
	Addition Error on Contract ($370)', NULL, 760.00, 'pending', '2018-10-08', '2018-10-08 09:27:45'),
  (1968212, 4077921, '1968212', 'Fence Change Order', 'The stripping of the 4x4 down to about a 3x2 in order to be able to have gate latch and gate close.
The addtional pieces from arrow fencing to be applied to lower part of the decking fence panels to enclose.', NULL, 0, 'pending', '2018-10-08', '2018-10-08 09:56:41'),
  (1970578, 4011993, '1970578', 'Design fee - added as CO', 'was paid early on, never added as change order or addedum', NULL, 750.00, 'pending', '2018-10-09', '2018-10-09 09:55:59'),
  (1970581, 4011993, '1970581', 'HOA Fees - added as CO', 'was paid early on, never added as change order or addedum', NULL, 400.00, 'pending', '2018-10-09', '2018-10-09 09:56:26'),
  (1970590, 4011993, '1970590', 'general adjustment from 985421', NULL, NULL, 188.00, 'pending', '2018-10-09', '2018-10-09 09:59:05'),
  (1971047, 4011993, '1971047', 'Dirt moving and dump fees', 'Total labor : 29 hours

Dump Fee : $250.00', NULL, 2135.00, 'pending', '2018-10-09', '2018-10-09 11:59:31'),
  (1975492, 3068163, '1975492', 'Sealing pavers', NULL, NULL, 1745.00, 'pending', '2018-10-11', '2018-10-11 14:57:55'),
  (1976657, 4389311, '1976657', 'Lower Edging 2"', NULL, NULL, 296.00, 'pending', '2018-10-11', '2018-10-11 20:02:57'),
  (1977172, 3068163, '1977172', 'Railing and Side Gate', 'Add Railing below fencing.
Change front gate to open outwards', NULL, 1530.00, 'pending', '2018-10-11', '2018-10-11 16:41:09'),
  (1977808, 4496941, '1977808', 'Demo back fence', NULL, NULL, 350.00, 'pending', '2018-10-12', '2018-10-12 15:05:00'),
  (1977811, 4496941, '1977811', 'Remove stump', NULL, NULL, 300.00, 'pending', '2018-10-12', '2018-10-12 15:05:23'),
  (1977820, 4496941, '1977820', 'Cover crawl space access', NULL, NULL, 120.00, 'pending', '2018-10-12', '2018-10-12 15:07:11'),
  (1977823, 4496941, '1977823', 'Credit for on paver demo moved to 1968116', NULL, NULL, 0, 'pending', '2018-10-12', '2018-10-12 15:08:11'),
  (1982178, 4097170, '1982178', 'Mulch put back in contract  2,339 SF', 'Adding Mulch back into the contract:
2,339 Square Feet @ $1.00 a SF', NULL, 2339.00, 'pending', '2018-10-15', '2018-10-15 18:33:00'),
  (1982182, 4097170, '1982182', 'DG  520 SF', 'Adding DG with stabilizer and geotextile fabric to already demoed area 520 Square Feet  X $5.00:= $2,600.00', NULL, 2600.00, 'pending', '2018-10-15', '2018-10-15 18:38:52'),
  (1983616, 3863384, '1983616', 'DUPLICATE Added Planter and plants', '$1600 for concrete weed barrier
$400 for 20 1 gallon plants
Approve via email

was 2000', NULL, 0, 'pending', '2018-10-16', '2018-10-16 11:47:23'),
  (1983776, 3863384, '1983776', 'Step IPE upgrade', 'Ipe Upgrade for Steps

$1300 Wood
$1400 Labor

2700', NULL, 2700.00, 'pending', '2018-10-16', '2018-10-16 12:38:22'),
  (1984747, 4097170, '1984747', 'Fountain trench for electrical', 'Instllation of the fountain   and trench for the electrician  $650.00', NULL, 650.00, 'pending', '2018-10-16', '2018-10-16 21:21:02'),
  (1984760, 3950271, '1984760', 'Upgrade from gravel to DelRio', '610 Square Feet X 50 cents= $305.00', NULL, 305.00, 'pending', '2018-10-16', '2018-10-16 21:47:32'),
  (1985270, 4186919, '1985270', 'All Change Orders', '$600.00 extra Soil
$747.00 Avignon upgrade
$2,071.00 Additional Pavers  
$1,517.00  Additional block wall
$300.00 Additional steps
$1,541.00  Wall A  new retaining wall
$1,399.00  WAll   new retaining wall
$8,175.00', NULL, 8175.00, 'pending', '2018-10-17', '2018-10-17 07:50:01'),
  (1986077, 3068163, '721653', 'CO: Permits/Engineering', 'Added as a change order for accounting purposes. 

This was already billed and paid for. 

from original bill 
$3517.67 permits, engineering, soils
$900  Ryan, permit Running and permit design', NULL, 4417.67, 'pending', '2018-10-17', '2018-10-17 11:16:23'),
  (1986158, 3068163, '1986158', 'Lattice Awning Extension', 'Moved from owner payments to a CO for accounting purposes. 

This was already billed and paid for.', NULL, 1800.00, 'pending', '2018-10-17', '2018-10-17 11:37:23'),
  (1986165, 3068163, '1986165', '24 to 42" Wall Upgrade', 'plus permits, engineering, soils , design , permit running costs

Moved from owner payments to a CO for accounting purposes. 

This was already billed and paid for.', NULL, 3713.00, 'pending', '2018-10-17', '2018-10-17 11:39:36'),
  (1986175, 3068163, '1986175', 'Pool Tile Upgrades', 'pool tile upgrades', NULL, 856.00, 'pending', '2018-10-17', '2018-10-17 11:41:05'),
  (1988438, 4097170, '1988438', '6 moreBuffalo Grass plug flat and soil preparation', 'Soil preparation and 6 additional flats of Buffalo grass

635 Square Feet  15" on center  72 plugs per flat  X 6 flats  $900.00', NULL, 3251.00, 'pending', '2018-10-18', '2018-10-18 11:33:56'),
  (1990487, 3863384, '1990487', 'CREDIT for douglas fir steps', NULL, NULL, -54.00, 'pending', '2018-10-19', '2018-10-19 10:21:56'),
  (1990869, 4097170, '1990869', 'Paver Additional 77 sf', 'additional 77 SF of pavers in the back yard, bobcat demo', NULL, 731.00, 'pending', '2018-10-19', '2018-10-19 12:31:53'),
  (1990884, 4097170, '1990884', 'Controller credit $350', NULL, NULL, -350.00, 'pending', '2018-10-19', '2018-10-19 12:35:55'),
  (1991299, 3068163, '00', 'Design fee', NULL, NULL, 900.00, 'pending', '2018-10-19', '2018-10-19 16:32:21'),
  (1991367, 4601328, '1991367', 'Design Deposit(ck#942)', '1/2 of $750 Design fee deposit', NULL, 375.00, 'pending', '2018-10-19', '2018-10-19 22:17:45'),
  (1991442, 3863384, '1991442', 'Add brown shredded with weed barrier', NULL, NULL, 893.00, 'pending', '2018-10-20', '2018-10-20 15:01:51'),
  (2000290, 4611965, '2000290', 'Transformer and GFI', 'Adding one GFI $150.00
Adding one Vista 150 Watt  $350.00', 'By Verva', 500.00, 'pending', '2018-10-25', '2018-10-25 10:56:44'),
  (2000305, 4611965, '2000305', 'Moving 2 valves', 'Moving 2 valves to planter with existing valve, replacing valves with new brass valves', NULL, 400.00, 'pending', '2018-10-25', '2018-10-25 11:01:25'),
  (2003295, 4496941, '2003295', 'Brown coat inside wall', NULL, NULL, 180.00, 'pending', '2018-10-27', '2018-10-27 01:28:29'),
  (2008231, 4559517, '2008231', 'Additional jute and needle point ivy', 'Install 4 flats needle point ivy on west hillside,  and install jute mesh ,  install (7) 15gal Carolina cherry shrubs @ $175ea', NULL, 1875.00, 'sold', '2018-10-30', '2018-10-30 20:46:20'),
  (2008249, 4559517, '2008249', 'South hillsides irrigation', 'Remove existing and install new rotor sprinklers  along top of  hillside .3 zones @ $850ea  = $2550tie front drain inyo new drain system $247$631  Irrigation repair creditTotal $1919', NULL, 2166.00, 'sold', '2018-10-30', '2018-10-30 20:50:39'),
  (2008267, 4559517, '2008267', 'Additional shrub thinning and disposal', 'By owner request clean hillside additionally , trim figs down from 50% to 25% , removed shrubs as directed.  And expressed to workers', NULL, 850.00, 'sold', '2018-10-30', '2018-10-30 20:53:56'),
  (2008675, 4097170, '2008675', 'credit for fountain material', NULL, NULL, -750.00, 'pending', '2018-10-30', '2018-10-30 17:41:46'),
  (2011122, 4496941, '2011122', 'Additional wall and paver.', NULL, NULL, 380.00, 'pending', '2018-11-01', '2018-11-01 00:48:04'),
  (2014518, 4571207, '2014518', 'Design fee & Deposit (ck#1105)', 'Hoa design this is half of the fee', NULL, 375.00, 'pending', '2018-11-02', '2018-11-02 09:41:57'),
  (2014561, 4602365, '2014561', 'Design(ck#237)', 'This is half of deposit if sell job', NULL, 525.00, 'pending', '2018-11-02', '2018-11-02 09:50:44'),
  (2015438, 4608328, '#6590603742', 'Concrete Pump', 'after talking to our crew Anne elected to not cut the tree to bring in the concrete truck, we agree to split the cost of the concrete pumper costs 

Concrete Pumper $268 / 2 = $134 + admin fee $65   = $200
Splitting concrete into 2 trucks = $300 + environmental feel $35 = $335   + Additional yard of concrete $78 with tax comes out to $454.30

$454.30 + $200 =$654.30', NULL, 654.30, 'pending', '2018-11-02', '2018-11-02 16:04:30'),
  (2015458, 3357309, '2015458', 'Additional 43Sqft synthetic lawn', 'Add additional 43sqft synthetic lawn per owner request', NULL, 386.00, 'pending', '2018-11-02', '2018-11-02 16:23:45'),
  (2017022, 3676700, '2017022', 'Additional planting', 'change orders. 
14- 1gal. Succulents $280.
And 3 flats of chalk sticks $205.
Total $505.', NULL, 505.00, 'pending', '2018-11-05', '2018-11-05 17:44:34'),
  (2018271, 4588830, '2018271', 'Front fence & gate', '26 LF. Fencing and Gate.

2,530.00 and 200 credit', NULL, 2330.00, 'pending', '2018-11-05', '2018-11-05 23:57:24'),
  (2023704, 4657406, '2023704', 'Fuel Mod Deposit chk #1108', NULL, NULL, 400.00, 'pending', '2018-11-07', '2018-11-07 22:52:16'),
  (2023705, 4657406, '2023705', 'Additional Fuel Mod Allowance', 'additional Allowance $1200 
billed at the rate of $100hr
Approx 8-12 Additional hours to make Fuel mod for whole property
final bill will be charged against the allowance , not to exceed without approval', NULL, 750.00, 'pending', '2018-11-07', '2018-11-07 22:55:45'),
  (2028153, 4571207, '2028153', 'Additional Landscape Items', 'no soil included, installing synthetic lawn raises the rear yard so the new synthetic lawn is "level" with the new pavers, planter areas may be a little low and may require additional soil or additional mulch 

a discount of $425 is applied only if the above work is approved

• Synthetic Lawn  - Group 1
• Discount only applied if the above work is included
• 6- 15 Gallon Shrubs @$150EA
7-5 Gallon Shrubs @ $40EA
24-1 Gallon plants @ $20EA   = $1660
no palms included
• 1 drip valve in planters, does not require mainline and wire  to rear, valve will be installed in front near the other valves ..and run to the rear ,', NULL, 13788.00, 'pending', '2018-11-10', '2018-11-10 18:12:26'),
  (2028154, 4571207, '2028154', 'Irrigation Main line & Multi Conductor', NULL, NULL, 450.00, 'pending', '2018-11-10', '2018-11-10 18:14:32'),
  (2031509, 4601330, '2031509', 'Additional Drainage', '80ft 3" drain line and inlets along side, of house. minor irrigation repair included
see attached drawing', NULL, 2000.00, 'sold', '2018-11-13', '2018-11-13 09:10:16'),
  (2031752, 4571207, '2031752', 'Change to Original scope', 'This change order removes drainage , main line and wire from original contract, 
We are only doing paver install  as of 11/13/2018 10:30am

NEW PAYMENT SCHEDULE
Deposit                               $1520
Demo/Cleanup                   $2000
Delivery of Pavers              $1255
Balance upon completion  $1000

Reduces original contract from ($7470) $7020 + $450 main line
to ($6150) $5775 + $375 Hoa Design

Owner is having others do Drain and main line work, owner agrees to have all trenching compacted, 

our paver crew is installing (3)  drain grates provided at $65 ea  ($195 total)
, this includes cutting the pavers, cutting the pipe and setting them', NULL, 195.00, 'sold', '2018-11-13', '2018-11-13 10:27:38'),
  (2033292, 4312960, '2033292', 'Pool, Retaining Wall Engineering', 'invoice from "Pool Engineering"
see attached', NULL, 248.40, 'pending', '2018-11-14', '2018-11-14 02:13:32'),
  (2033762, 4601328, '2033762', 'Lower and replace main line', NULL, NULL, 365.00, 'pending', '2018-11-14', '2018-11-14 16:01:43'),
  (2034128, 4185312, '2034128', 'Drainage', NULL, NULL, 250.00, 'pending', '2018-11-14', '2018-11-14 09:40:17'),
  (2034155, 4185312, '2034155', 'Gas Line', 'Putting in new gas line 31 linear feet', NULL, 775.00, 'pending', '2018-11-14', '2018-11-14 09:47:14'),
  (2034530, 4706995, '2034530', 'Upgrade turf to 94 oz', 'Upgrade turf to 94 oz and green backfill', NULL, 630.00, 'pending', '2018-11-14', '2018-11-14 11:28:08'),
  (2035863, 4601328, '2035863', 'Weatherproof and Replace siding', 'remove existing small siding pieces on either side of window
vichithane seal up all exposed flashing, and studs, 
install 1x12x16  tongue and groove siding
painting not included', NULL, 1250.00, 'pending', '2018-11-15', '2018-11-15 03:32:23'),
  (2037976, 4722142, '2037976', 'Design Deposit chk #1145', 'half of design price', NULL, 375.00, 'pending', '2018-11-15', '2018-11-15 16:16:58'),
  (2037982, 4487762, '2037982', 'Design Deposit Chk#2617', NULL, NULL, 575.00, 'pending', '2018-11-15', '2018-11-15 16:18:58'),
  (2038397, 4601328, '2038397', 'Add weed barrier', NULL, NULL, 500.00, 'pending', '2018-11-16', '2018-11-16 14:41:24'),
  (2039250, 3357309, '2039250', 'Spa Concrete Pad', 'pull up new synthetic grass where spa is to be located, excavate 4" depth, form and install steel reinforced concrete set 1" above lawn. regrade as necessary and reinstall lawn around hot tub pad, cleanup', '7-1/2 x 7-1/2 concrete pad, verify with owner for spa
maybe only 3" depth for excavation, maybe 1/2 yard of soil
no base needed just pour pad', 2700.00, 'sold', '2018-11-16', '2018-11-16 11:54:41'),
  (2040889, 4565594, '2040889', 'Move pressure regulator to front yard', NULL, NULL, 100.00, 'pending', '2018-11-19', '2018-11-19 15:48:52'),
  (2040896, 4565594, '2040896', 'Run irrigation wire from 2 valves in vegi garden', NULL, NULL, 200.00, 'pending', '2018-11-19', '2018-11-19 15:51:10'),
  (2041701, 4565594, '2041701', 'Outlet install', NULL, NULL, 100.00, 'pending', '2018-11-19', '2018-11-19 19:41:00'),
  (2044001, 4565594, '2044001', 'Additional 4-15. Gal.', NULL, NULL, 600.00, 'pending', '2018-11-20', '2018-11-20 19:31:43'),
  (2045601, 4682535, '2045601', 'Additional 9 LF of 1" Copper', 'Putting in new copper main, 1" copper  additional 9 LF @ $56.00', NULL, 504.00, 'pending', '2018-11-21', '2018-11-21 07:23:24'),
  (2045614, 4682535, '2045614', 'Paver Upgrade', 'Upgrade from basic to Castle Cobble Distressed for 1,333 square feet X $1.80.', NULL, 2399.00, 'pending', '2018-11-21', '2018-11-21 07:27:51'),
  (2046086, 4588739, '2046086', 'Bounced Check Fee', NULL, NULL, 12.00, 'pending', '2018-11-21', '2018-11-21 10:29:18'),
  (2048899, 4296566, '2048899', 'Rough Electrical  and Gravel Upgrade', 'Upgrade gravel $950
Install electrical conduit rough in.  Includes trenching and recompaction.  204 linear feet  $3,468
Install Lamp Posts set in concrete bed  $360', NULL, 4778.00, 'pending', '2018-11-26', '2018-11-26 16:32:47'),
  (2049056, 4601328, '2049056', 'Replace Rear Post Anchors', 'Jack up  patio cover beam 1/4"-1/2" with car jack and secure with temporary 4x4 post to hold up cover-beam.while work is performed
saw cut concrete around post to install new approx 12wx24" depth footings, install simpson cbs4x4 anchors install brick around anchor to decorate and hide saw cuts, either flat or 1 brick in height as determined by installer, install post cap simposon EPC4Z "ON END" & PC44-16 on "CENTER" post.  Use high strength hight speed fast curing concrete available at home depot see picture attached. finish grout joint similar to existing work 
no panting', NULL, 1120.00, 'sold', '2018-11-26', '2018-11-26 09:17:06'),
  (2052209, 4754429, '2052209', 'Design fee + credit', 'design deposit 50%', 'paid with chk #124', 375.00, 'pending', '2018-11-27', '2018-11-27 12:34:15'),
  (2052289, 4737915, '2052289', 'City Consultation fee - hourly', '5-hours total rough drawings and consultation time with city $500', NULL, 200.00, 'pending', '2018-11-27', '2018-11-27 12:51:15'),
  (2052314, 4737915, '2052314', 'Permits/Engineering costs - approx', 'Not to exceed $4000 without further approval
$100hr design Fee for permit technician drawings and time approx $800-1500 -

approx $1000 for retaining wall engineering
does not include soils testing if required
approx $800-1500 in city permit fees
will include rough layout to be approved by owner before moving forward to permit ready drawings for retaining wall
will provide all receipts and final bill when complete', NULL, 4000.00, 'pending', '2018-11-27', '2018-11-27 12:57:46'),
  (2054502, 4185312, '2054502', 'Additional paver', NULL, NULL, 225.00, 'pending', '2018-11-28', '2018-11-28 19:37:31'),
  (2054747, 4381266, '2054747', 'CREDIT - Brian email chain', NULL, NULL, -145.00, 'pending', '2018-11-28', '2018-11-28 12:36:38'),
  (2054761, 4185312, '2054761', 'CREDIT - 21 sqft pavers', NULL, NULL, -244.66, 'pending', '2018-11-28', '2018-11-28 12:39:19'),
  (2055078, 4737915, '2055078', 'Option #2. Conceptual design w/consultation w/enhi', 'concept design and meet with a engineer to get sample engineering that way we are not purchasing engineering to get s idea what the wall would entail to build that way i can get you s estimate. .   Either way full permit or just a design its yours to get other bids on..  $750 plus 1-2hours consulting..we would credit back half of the design fee if we get the job..basically $375', 'check #1095 and 1093
$500 city Consultation @$100hr
$750 design fee', 750.00, 'sold', '2018-11-28', '2018-11-28 21:52:39'),
  (2055452, 4185312, '2055452', 'Timer Module', 'program with existing system', NULL, 50.00, 'pending', '2018-11-28', '2018-11-28 16:48:36'),
  (2057060, 3572205, '2057060', 'Pulling permits co', 'Create and submit designs that comply with code
Record covenant with City/County
City/County review and permit fees
City/County Road Plan check fees', NULL, 1850.00, 'pending', '2018-11-29', '2018-11-29 12:09:59'),
  (2057062, 3572205, '2057062', 'Installation of Dual Sump Pumps', NULL, NULL, 2800.00, 'pending', '2018-11-29', '2018-11-29 12:10:31'),
  (2059442, 4185312, '2059442', 'Additional  Additional bench on lawn area 6''', NULL, NULL, 570.00, 'pending', '2018-11-30', '2018-11-30 21:52:37'),
  (2064145, 4759055, '2064145', 'Copper Bib adjustment and Bender Board extension', NULL, '12 x 3
56 x 3', 204.00, 'pending', '2018-12-04', '2018-12-04 13:45:22'),
  (2064518, 4663653, '2064518', 'Design fee + credit', '750 
375 credit
375 due', NULL, 375.00, 'pending', '2018-12-04', '2018-12-04 15:56:24'),
  (2066895, 4682535, '2066895', 'Mailbox relocation', NULL, NULL, 150.00, 'pending', '2018-12-05', '2018-12-05 14:50:25'),
  (2072389, 4759055, '2072389', '100 linear feet of new drainage.', '100 additional in front yard', NULL, 2500.00, 'pending', '2018-12-10', '2018-12-10 17:26:08'),
  (2079502, 4759055, '2079502', 'Additional concrete step and pad', NULL, NULL, 200.00, 'pending', '2018-12-13', '2018-12-13 10:11:16'),
  (2084408, 4185312, '2084408', 'CREDIT - Timer Material', NULL, NULL, -120.00, 'pending', '2018-12-17', '2018-12-17 12:12:24'),
  (2086269, 4682535, '2086269', '4 step lights', 'Installation of 4 step lights at porch entry', NULL, 1100.00, 'pending', '2018-12-18', '2018-12-18 09:46:23'),
  (2089424, 4296566, '2089424', 'LIghting for front', '9 Vista Led Uplights Installed. $225/each (inc. wiring)

1 Vista 200 W Transformer Installed $375

Total  $2,400', NULL, 2400.00, 'pending', '2018-12-19', '2018-12-19 13:14:27'),
  (2092010, 4312960, '2092010', 'Permit Technician Costs', 'as of 12/20/18
All Permit Technician Related activity at the rate of $100hr per contract ,
drawings, meeting with engineers, permit running. meeting with city

Permit Plan Drawing                          12.5hrs     $1250
Meeting With engineers                    1.5hrs        $150
Meeting With city and plan submittal  10hrs        $1000

                                                                   Total  $2400

as of 12/20 city all documents were scanned, and emailed to supervisor for further review of corrections or additions plan checker is requiring

additional may be required', NULL, 2400.00, 'pending', '2018-12-20', '2018-12-20 17:58:24'),
  (2094469, 4754429, '2094469', 'Trim small fruit tree in back yard', NULL, NULL, 350.00, 'pending', '2018-12-26', '2018-12-26 18:06:05'),
  (2094738, 4550375, '2094738', 'Stone grinding for step', NULL, NULL, 450.00, 'pending', '2018-12-26', '2018-12-26 20:37:10'),
  (2096125, 4296566, '2096125', 'Mulching', '1600 sq feet of mulching installed @ 1.00 per sq foot', NULL, 1600.00, 'pending', '2018-12-27', '2018-12-27 15:04:39'),
  (2096759, 4759055, '2096759', 'Credit for 11 5gal plants', NULL, NULL, -440.00, 'pending', '2018-12-28', '2018-12-28 09:27:31'),
  (2097395, 4682535, '2097395', 'Tile Sealer', NULL, NULL, 420.00, 'pending', '2018-12-28', '2018-12-28 21:52:35'),
  (2097512, 4663653, '2097512', 'Ipe Upgrade on 152sqft deck', NULL, NULL, 1537.50, 'pending', '2018-12-28', '2018-12-28 15:33:45'),
  (2097515, 4663653, '2097515', 'Additional 48 sqft of IpeDeck', NULL, NULL, 1995.00, 'pending', '2018-12-28', '2018-12-28 15:35:57'),
  (2097517, 4663653, '2097517', 'Sides of Steps 60 sqft - no upcharge ipe', NULL, NULL, 2100.00, 'pending', '2018-12-28', '2018-12-28 15:36:21'),
  (2097665, 4565595, '2097665', 'Electrical work for fountain', NULL, NULL, 975.00, 'pending', '2018-12-29', '2018-12-29 17:14:53'),
  (2097694, 4663653, '2097694', 'Ipe upgrade of 5 steps + additional ipe step', NULL, NULL, 549.12, 'pending', '2018-12-29', '2018-12-29 11:23:18'),
  (2097716, 4663653, '2097716', 'Regular price of 48sqft deck minus 1995.00', NULL, NULL, 645.00, 'pending', '2018-12-29', '2018-12-29 13:01:36'),
  (2100822, 4663653, '2100822', 'Additional concrete', 'Additional concrete pour at $15.00 a Square foot', NULL, 375.00, 'pending', '2019-01-03', '2019-01-03 07:47:45'),
  (2100840, 4863478, '2100840', 'Additional soils', 'Additional soils removed average of 4"-8"
Total contracted in soils removal $3,334.00', NULL, 1584.00, 'pending', '2019-01-03', '2019-01-03 07:52:31'),
  (2101181, 4565595, '2101181', '56 sqft of paver', NULL, NULL, 728.00, 'pending', '2019-01-03', '2019-01-03 09:35:03'),
  (2101190, 4565595, '2101190', '8 lnft wallcap', NULL, NULL, 240.00, 'pending', '2019-01-03', '2019-01-03 09:37:34'),
  (2101209, 4565595, '2101209', 'Additional 27 lnft steps', NULL, NULL, 1450.00, 'pending', '2019-01-03', '2019-01-03 09:41:46'),
  (2101307, 2248927, '2101307', 'Fees and Costs of Pool Permit', 'Cost for 
Pool review fees (building and safety)
Soils review/stamp fees (engineering)
Labor/time', 'For Permits;
Mo - 12 Hours
Ryan - 4 Hours

2000.00

Fees;
SGI - 400.00
Pool Review - 1310.70


C/O 3310.70 + 291.65 (gas)


Costs of Planning was already C/O''d

PERMIT 3,602.35', 3602.35, 'pending', '2019-01-03', '2019-01-03 10:10:02'),
  (2102362, 4863478, '2102362', 'Additional del Rio 2-3" size', '94 sf', NULL, 639.00, 'pending', '2019-01-03', '2019-01-03 23:37:32'),
  (2102451, 3345218, '2102451', 'BBQ Repair', NULL, NULL, 200.00, 'pending', '2019-01-03', '2019-01-03 17:09:53'),
  (2102453, 3345218, '2102453', 'Added Bender Board for slope.', NULL, NULL, 250.00, 'pending', '2019-01-03', '2019-01-03 17:11:32'),
  (2103317, 4754429, '2103317', '3/4 Ball valve', NULL, NULL, 110.00, 'pending', '2019-01-04', '2019-01-04 10:21:58'),
  (2103443, 4565595, '2103443', '11 LF. Seat wall', NULL, NULL, 1540.00, 'pending', '2019-01-04', '2019-01-04 18:56:20'),
  (2106127, 4296566, '2106127', 'Bender Board', 'Put in roughly 1600 sq feet of bender board.  
Contract only called for 835.

Not charging for overage.

Additional 165 linear feet of bender board along front fencing.  Will charge for this. 8x $165 = $1320', NULL, 1320.00, 'pending', '2019-01-07', '2019-01-07 12:18:13'),
  (2107532, 4863456, '2107532', 'Additional wood and concrete', 'Had to remove and install new wood and pour a foundation for steps took an additional day', NULL, 450.00, 'pending', '2019-01-08', '2019-01-08 07:49:20'),
  (2108873, 4296566, '2108873', 'Other valve', NULL, NULL, 450.00, 'pending', '2019-01-08', '2019-01-08 14:00:42'),
  (2110364, 4754429, '2110364', 'Additional valve for lawn', NULL, NULL, 1080.00, 'pending', '2019-01-09', '2019-01-09 17:37:27'),
  (2110520, 4754429, '2110520', 'Plant credit 8 ivys', NULL, NULL, -160.00, 'pending', '2019-01-09', '2019-01-09 10:17:25'),
  (2112396, 4569721, '2112396', 'Added drainage and labor for irrigation controller', 'Adding 29 linear feet of drainage. $725.00adding labor for irrigation control. $100', NULL, 825.00, 'pending', '2019-01-10', '2019-01-10 16:47:04'),
  (2112750, 2248927, '2112750', 'Final Design Payment', NULL, NULL, 850.00, 'pending', '2019-01-10', '2019-01-10 10:37:27'),
  (2114597, 4312960, '2114597', 'Coping, swale, rock, sand Finish W/O', 'see attached copy of work order', 'see attached copy of work order', 11024.00, 'pending', '2019-01-11', '2019-01-11 09:11:44'),
  (2115516, 4565595, '2115516', 'Labor for 4 5gals', NULL, NULL, 80.00, 'pending', '2019-01-11', '2019-01-11 22:53:41'),
  (2121185, 4927330, '2121185', 'Design fee w/ discount', 'deposit of design fee', 'office, did i turn this check in?

..i think i did . i don''t appear to have it...let me know and i may ask client for another check if it was misplaced', 775.00, 'pending', '2019-01-16', '2019-01-16 01:29:06'),
  (2122711, 4915341, '2122711', 'Change of rock', NULL, NULL, 600.00, 'pending', '2019-01-16', '2019-01-16 20:41:14'),
  (2127057, 4565595, '2127057', '120 feet drain work on pavers', NULL, NULL, 1800.00, 'pending', '2019-01-18', '2019-01-18 20:13:10'),
  (2127176, 4186919, '2127176', 'Credit for 2 lights', NULL, NULL, -300.00, 'pending', '2019-01-18', '2019-01-18 12:46:12'),
  (2127661, 4487762, '2127661', 'Electrical', NULL, NULL, 1000.00, 'pending', '2019-01-19', '2019-01-19 17:41:42'),
  (2128673, 4312960, '2128673', 'Precast Planter Bowls', '(2) Phoenix Precast planters in smooth brown
Oblique style

Due Upon Order', '$1536', 2031.00, 'sold', '2019-01-21', '2019-01-21 08:02:20'),
  (2128772, 4487762, '2128772', 'Water main', NULL, NULL, 1800.00, 'pending', '2019-01-21', '2019-01-21 16:32:09'),
  (2130125, 4852401, '2130125', 'Design fee + credit', NULL, NULL, 575.00, 'pending', '2019-01-21', '2019-01-21 14:23:14'),
  (2130133, 4951414, '2130133', 'Design fee + credit', NULL, NULL, 375.00, 'pending', '2019-01-21', '2019-01-21 14:26:19'),
  (2130297, 4944166, '2130297', 'Design fee', NULL, NULL, 700.00, 'pending', '2019-01-21', '2019-01-21 15:40:14'),
  (2132453, 4963370, '0001', 'Design fee', NULL, NULL, 400.00, 'pending', '2019-01-22', '2019-01-22 14:17:38'),
  (2132591, 2248927, '2112751', 'Build Berm in back', NULL, NULL, 16750.00, 'pending', '2019-01-22', '2019-01-22 15:09:47'),
  (2133659, 4785565, '0001', 'Dad drains', NULL, NULL, 800.00, 'pending', '2019-01-23', '2019-01-23 17:13:17'),
  (2139360, 4944166, '2130298', 'Design fee due', NULL, NULL, 700.00, 'pending', '2019-01-25', '2019-01-25 14:27:45'),
  (2141156, 2248927, '2112752', 'Extra Berm/Retaining Wall', '1) Go down additional 24 inches on berm footing per city request.  $3000
2) Remove tile section in corner and add 8 linear feet of addtional berm.  $2000
3) Rebuild retaining walls in corner that were on tile pad.  $1500', NULL, 6500.00, 'pending', '2019-01-28', '2019-01-28 10:52:17'),
  (2143050, 4565595, '2127058', 'Upgrade from Stucco to Stack Stone', 'Client upgraded contract from stucco to stackstone.
The cost per sq foot of stucco work is $5 per sq foot.
The cost for stack stone work is $25 per sq foot flat plus $30 per linear edge including material.

The difference  is $20 per sq foot.  We had 70 sq feet. $1400 plus 12 linear feet of edge. $360.  Total difference $1760', NULL, 1760.00, 'sold', '2019-01-29', '2019-01-29 08:48:58'),
  (2143092, 4565595, '2127059', 'Remove and Rebuild Existing Pergola', 'Remove existing pergola due to wood rot.  Rebuild existing pergola.

Contract price for pergolas was $12,500 including installing shade bars and new posts for existing.  Now must remove entire thing and rebuild including main beam and rafter beams.  Includes all new hardware.

$2,450', NULL, 2450.00, 'pending', '2019-01-29', '2019-01-29 08:59:31'),
  (2143451, 4822355, '0001', 'Design Check', NULL, NULL, 750.00, 'pending', '2019-01-29', '2019-01-29 10:26:56'),
  (2144067, 4945355, '0001', 'Change Order #1 drainage/utilties', '1) Drain pipe 13 LF X $25.00= $325.00
2) Drain pipe from the center drain to the grass area 18LF X $25.00= $450.00
3) Gas Line 15 LF X $25.00= $375.00
4) Electrical 15 LF X $25.00= $375.00

Total:  $1,525.00', NULL, 1525.00, 'pending', '2019-01-29', '2019-01-29 13:06:50'),
  (2144355, 4951414, '2130134', 'Second Design Agreement fee', NULL, NULL, 375.00, 'pending', '2019-01-29', '2019-01-29 14:13:52'),
  (2144714, 4863478, '2102363', 'Credit', NULL, NULL, -625.00, 'pending', '2019-01-29', '2019-01-29 16:46:08'),
  (2150228, 4945355, '0002', 'Move drains', NULL, NULL, 650.00, 'pending', '2019-02-01', '2019-02-01 16:58:46'),
  (2152896, 4754429, '2110521', 'Install channel drain', NULL, NULL, 389.00, 'pending', '2019-02-04', '2019-02-04 17:35:57'),
  (2152904, 4759055, '2096760', 'Additional drain', NULL, NULL, 780.00, 'pending', '2019-02-04', '2019-02-04 17:39:17'),
  (2156492, 4569721, '2112397', 'Move Bend a board', NULL, NULL, 300.00, 'pending', '2019-02-05', '2019-02-05 23:30:24'),
  (2156572, 4565595, '2127060', 'Electrical inside bbq', NULL, NULL, 160.00, 'sold', '2019-02-06', '2019-02-06 00:26:24'),
  (2160103, 4565595, '2127061', '84 feet additional drain work side of house.', NULL, NULL, 2100.00, 'pending', '2019-02-07', '2019-02-07 17:11:11'),
  (2160509, 4296566, '2108874', 'Plant 3  15 gallon citrus', NULL, NULL, 1080.00, 'pending', '2019-02-07', '2019-02-07 11:09:54'),
  (2162382, 4963370, '0002', 'Design fee pt 2', NULL, NULL, 400.00, 'pending', '2019-02-08', '2019-02-08 09:59:44'),
  (2165959, 4565570, '0001', 'Design fee', NULL, NULL, 750.00, 'pending', '2019-02-11', '2019-02-11 14:47:14'),
  (2165963, 4809254, '0001', 'Design fee pt 2', NULL, NULL, 800.00, 'pending', '2019-02-11', '2019-02-11 14:48:07'),
  (2166460, 4602365, '2014562', 'Putting Green', '420Sqft (2) hole putting green, per design,

please approve asap so that we may credit 1-zone of irrigation and lawn  included in this change order, also excavation is not included, additional project soil to be filled in this area  and will become an additional cost to remove of putting green is not approved asap

Thank you', NULL, 6987.00, 'sold', '2019-02-12', '2019-02-12 00:56:07'),
  (2166463, 4602365, '2014563', 'BBQ Equipment', '32" Lion BBQ Grill, Double Equipment Door, see attached', NULL, 2096.00, 'sold', '2019-02-12', '2019-02-12 01:27:09'),
  (2166466, 4602365, '2014564', 'Driveway Extensions', 'Extend Driveway with Belgard group 1 paver, 24-30" as requested by owner up to 160sqft, set on concrete, must be approved asap to be included at this price with other paver install 
Owner Responsible for HOA approvals', NULL, 2670.00, 'sold', '2019-02-12', '2019-02-12 01:36:18'),
  (2167256, 4487762, '2128773', 'Pergola footings', NULL, NULL, 520.00, 'pending', '2019-02-12', '2019-02-12 17:15:40'),
  (2171492, 4602365, '2014565', 'Permit Technician', '8hrs  @ $100hr
Permit Technician: Includes all Permit Drawing, Permit submittal time, Time with engineers, all time included preparing permits and Submittal', NULL, 800.00, 'pending', '2019-02-13', '2019-02-13 21:48:52'),
  (2171497, 4602365, '2014566', 'Non-Tumbled Custom Order Wall Material', 'All Walls, BBQ, Bench, Step Face, Pilasters, shall be Angelus Brand "Rustic Wall" in " Sand Stone Mocha color" in Custom "Non-Tumbled"
This is a non-stock, non-returnable item
Additional Charge : $1267

Steps, Bench Top, bbq top, Wall Caps, Borders, Fireplace mante;l and chimney cap Shall Be Belgard Brand, Victorian Color
Wall cap is beveled/radius  on one side only
No Additional Charge

Paver interiors, including walkways, patio shall be Angelus Brand, "Courtyard Stone-4 stone package style" in sand stone mocha color
No Additional Charge', NULL, 1267.00, 'sold', '2019-02-13', '2019-02-13 22:22:00'),
  (2175378, 4915341, '2122712', '2x4 sq ft = 8 total in concrete', '2x4=8 square feet @$15 a sq ft', NULL, 120.00, 'pending', '2019-02-15', '2019-02-15 14:24:59'),
  (2175795, 5093944, '0001', 'Design Deposit', 'includes backyard design, 3D, HOA, and Fuel Mod
$700 of $1400 total', NULL, 700.00, 'pending', '2019-02-16', '2019-02-16 14:04:43'),
  (2177058, 4809254, '0002', 'Design fee pt 1', NULL, NULL, 800.00, 'pending', '2019-02-18', '2019-02-18 09:24:47'),
  (2177092, 4915341, '2122713', 'gravel preinstall', NULL, NULL, 2800.00, 'pending', '2019-02-18', '2019-02-18 09:36:04'),
  (2181295, 5108038, '0001', 'Design Deposit', NULL, NULL, 700.00, 'pending', '2019-02-20', '2019-02-20 07:04:25'),
  (2181436, 4618955, '0001', 'waterproofing foundation', '$20  linear Foot 41 LF
1/4" henry''s tar
and attach adhesive tar membrane waterproofing', NULL, 820.00, 'pending', '2019-02-20', '2019-02-20 08:03:41'),
  (2181448, 4618955, '0002', 'additional Pavers 117', '117 SF additional pavers X $11.50', NULL, 1345.00, 'pending', '2019-02-20', '2019-02-20 08:08:08'),
  (2184430, 5097577, '0001', 'Change Order- Block walls', 'I approve. Thank you. 
Sent from my iPhone

On Feb 20, 2019, at 10:14 AM, Verva verva@picturebuild.com> wrote:
 
Hi Mark, Karen and Sam,
Thank you for meeting with me yesterday.
Please let me know what you think of the blends.
The one closest to Sam’s door in the Sand Stone Mocha, and farther is the Tuscan
 
Lowering the 18 LF wall about 12”, saves 2 courses,
Taking off $540.00
 
Additional Planter at 16 linear feet straight, which is 18” beyond opening on both sides.
This allows a nice clean straight line and you still have 12” depth space for a planter.
I am calculating it at 15” high, which will double as a bench.
With footing
$1,280.00
 
Price Difference is an additional $740.00
THIS WAS APPROVED VIA EMAIL', NULL, 740.00, 'pending', '2019-02-21', '2019-02-21 11:52:08'),
  (2189899, 4602365, '2014567', 'Widen Putting Green Area, BBQ, and light', NULL, 'widen putting green area approx 1-1/2ft to 2ft         $1342
Raise wall approx 1ft and push back 1-1/2 to 2ft     $875
Extend BBQ x 1ft from 8ft-9ft                                   $460
Add light at step at entry to putting green                $220', 2897.00, 'sold', '2019-02-25', '2019-02-25 15:55:08'),
  (2190096, 4927312, '0001', '5 salvia and Irrigation', 'Install 9 salvia leucantha (1 Gallon)
out 26ft from existing drip
see design attached for location 

"This is our minimum cost to send a crew out to service your project"', NULL, 280.00, 'sold', '2019-02-25', '2019-02-25 18:15:16'),
  (2191255, 4312960, '2128674', 'Crawl Space Caps and other', '(2) caps to cover up crawls space openings on rear and north side 

No Charge - per verbal Agreement made with Brian we will install step tile no charge in trade for rock digging footings', NULL, 465.00, 'sold', '2019-02-26', '2019-02-26 10:26:48'),
  (2191840, 4618955, '0003', 'Install 2 4x4x10 post in concrete', NULL, NULL, 440.00, 'pending', '2019-02-26', '2019-02-26 21:14:02'),
  (2192063, 4487762, '2128774', 'Timer module', NULL, NULL, 150.00, 'pending', '2019-02-26', '2019-02-26 22:12:12'),
  (2192410, 5097577, '0002', 'Bulk Change order', NULL, NULL, 1378.00, 'pending', '2019-02-26', '2019-02-26 18:15:53'),
  (2194895, 4963370, '0003', 'addition 205 sq feet of pavers', 'Purdon Upgrade Scope Change

PAVERS: Cost: $9,240 new cost $12,684  (+$3,444)
Deliver and install new SUI Antique Yellow (Limestone) natural stone pavers in 4 piece pattern in rear yard with polymeric sand. (8x8, 8x16, 16x16, 16x24) 550 sqft.  755 sqft

HARDSCAPE: Cost: $6,850 new cost $4,800  (-$2,050)
Form and pour natural grey concrete with lite broom finish in pool equipment area, includes #3 rebar 24” o.c. 205 sqft.
Form and pour new wall cap (approx. 14” wide by 3” thick of concrete to match new coping color close possible.
40 linft. Includes approximately 2” cantilever past new Azek with slot for LED tape (see detail A), includes (2) #3 horizontal rebar length of cap.
Form and pour new countertop on existing stucco’d base 3” thick of concrete to match new coping color close
possible. Apprximately 21 sqft. Includes approximately 2” cantilever past new Azek with slot for LED tape (see detail A), includes #3 rebar 18”-24” o.c.
Form and pour small curb under RxR ties right side of yard. 5’ long.

+$1,394 = Total upgrade cost to upgrade pool equipment concrete to Sui Antique Yellow limestone pavers.


Also the extra cost to remove the extra concrete that we found in the equipment area is $300. Please reply back that this is approved.', NULL, 1394.00, 'pending', '2019-02-27', '2019-02-27 15:53:39'),
  (2194898, 4963370, '0004', 'additional removal of concrete', 'Also the extra cost to remove the extra concrete that we found in the equipment area is $300. Please reply back that this is approved.', NULL, 300.00, 'sold', '2019-02-27', '2019-02-27 15:55:05'),
  (2195854, 4487762, '2128775', 'Mulch/ Rock selection with additional sod', 'Verva-

Thanks so much for dropping off the samples.  Extremely helpful in making the decision.  We have decided to mulch the planting beds so we can go with the rock we really want (picture below)

Mulch 1137 x 1.50 = 1705
Mex Black Rock 180 x 15.00 = 2700
Total = 4405 ($1477 over contract budget)

Plus, the additional grass needed to fill out the lawn at $1500

I will send a separate email approving the final plants.', NULL, 2979.00, 'pending', '2019-02-28', '2019-02-28 08:10:56'),
  (2195864, 4963370, '0005', '44 linear feet of electrical/repair line', '44linear feet of new electrical $1,100.00 (electrical)
 repair and cancellation of 1 line $140.00', NULL, 1240.00, 'pending', '2019-02-28', '2019-02-28 08:13:07'),
  (2195866, 4963370, '0006', '31 linear feet of main line', 'water main line 31 linear feet  3/4inch copper line $1643', NULL, 1643.00, 'pending', '2019-02-28', '2019-02-28 08:13:34'),
  (2196221, 5148642, '0001', 'Design fee', NULL, NULL, 1000.00, 'pending', '2019-02-28', '2019-02-28 09:52:53'),
  (2196508, 4312960, '2128675', 'Bellecrete finish under all steps', 'ADD
Bellecrete  "Risers" to steps in sand finish 
also finish visible sides of raised patio ,

see attached plan for locations to be installed

All Bellecrete to be "Midnight" color', '23 pcs 16"x24 , 1" thick', 675.00, 'sold', '2019-02-28', '2019-02-28 11:06:02'),
  (2196518, 4312960, '2128676', 'Irrigation Main Line', 'Install 180ft  1-1/4 pvc main line from front to rear', NULL, 1600.00, 'sold', '2019-02-28', '2019-02-28 11:08:33'),
  (2196522, 4312960, '2128677', 'Conduit to Raised Patio', 'install 30ft  3/4" conduit from side to raised patio', NULL, 180.00, 'sold', '2019-02-28', '2019-02-28 11:10:06'),
  (2196737, 4128999, '1905557', 'Additional Pavers', '147 SF additional pavers', NULL, 1740.00, 'pending', '2019-02-28', '2019-02-28 12:12:03'),
  (2197546, 4602365, '2014568', 'Additional Lighting', '1, String Lights: Add (2) 2x2 black steel posts 8-10ft in height as shown in lighting plan, with eye hooks at top, install eye hook on house and patio cover , install electrical to top of patio cover posts for outlet controlled by switch at bbq. install owner provided string lights  $1687

2 Patio Cover Fan:  Add electrical from BBQ to top of posts so that patio cover company can complete connection and install owner provided outdoor rated fan and light. owner to pay patio cover company directly for fan install  $155

3. Additional Vista,  Low Voltage lighting "Architectural Bronze" @ $220ea  
    ADD (3) Cap lights    #4260
            (1) Step Lights  #4242
            (5) Path lights   #7210       total $1980

4. low voltage BBQ light on switch installed in patio cover   # DL2236 Black $350

this is additional to what has already been approved

See attached lighting plan
Total $4172', NULL, 4172.00, 'sold', '2019-02-28', '2019-02-28 17:45:54'),
  (2199431, 4602365, '2014569', 'Entry walk and Raise Side Gate', 'Demo entry and install 4ft wide walk, with pavers 

Raise gate as necessary', 'Demo entry and install 4ft wide walk, with pavers 

Raise gate as necessary', 500.00, 'sold', '2019-03-01', '2019-03-01 16:30:04'),
  (2201517, 4602365, '2014570', 'Additional pavers . Front side yard', NULL, 'Add approx 80ft pavers

Owner responsible for all Hoa approvals including driveway extension', 980.00, 'sold', '2019-03-04', '2019-03-04 19:22:35'),
  (2204141, 4487762, '2128776', 'Permits and Fees', NULL, 'permit fee 391.14
4 hours', 791.14, 'pending', '2019-03-05', '2019-03-05 11:25:18'),
  (2209728, 4487762, '2128777', 'Credit from Planting budget', 'including the 14 LF of binder board and 8@  5 gallon plants
difference $28.00
Ballance previously $460.00
-$320.00 and $112.00
$280.00', NULL, -28.00, 'pending', '2019-03-07', '2019-03-07 14:10:20'),
  (2210197, 5114731, '0001', 'Pilaster Credit', 'Owner has agreed to keep existing pilaster,', NULL, -850.00, 'sold', '2019-03-07', '2019-03-07 22:40:42'),
  (2210200, 5114731, '0002', 'Driveway Pavers and drain', 'Demo existing Driveway and remove soil as necessary 810Sqft      $2680

Repair or Replace existing drain under driveway that is connected to rear drain system   $1217

Install New pavers widening existing driveway by approx 3ft, install paver walkway to shed and to gate behind garage as shown on plan attached
$6570

See attached plan and also visit this link for the pavers proposed and colors available, 

https://www.belgard.com/products/pavers/catalina-grana

We  recommend a paver with some red in it to blend in with the brickwork around the home 

colors recommend if available 
Autumn, Baja, Bella, Toscana   
i can supply samples  just let me know

Total $10,467', NULL, 10467.00, 'pending', '2019-03-07', '2019-03-07 22:54:04'),
  (2210203, 5114731, '0003', 'Vinyl Fencing', 'Demo Existing Fence as shown in plan  80ft   $1820

Install new 5ft vinyl fence x80ft         $5270

see attached example of vinyl fence proposed

Total', NULL, 7090.00, 'pending', '2019-03-07', '2019-03-07 23:05:42'),
  (2212142, 4312960, '2128678', 'Post Hole Soil Disposal', 'Up to 18 yards soil  disposal $130 per yard, , 
calculated at 2.25 yards each post x 8 = 18 yards', NULL, 2340.00, 'pending', '2019-03-08', '2019-03-08 17:47:27'),
  (2214878, 4312960, '2128679', 'Norstone Charcoal Rockpanel', 'Upgrade all stone from MSI to Norstone Rockpanel "Charcoal"', 'our price is $9.75 6x24
corners $10.75 
Shipping $155  from southgate
norstone charcoal rockpanel
108pcs of corners
240sqft 6x24', 1312.00, 'sold', '2019-03-11', '2019-03-11 15:39:37'),
  (2217625, 1999595, '0001', 'Additional plants/removal of plants', 'Change order cost is Removal of 11 sumac 11x$20= $220.00
Change order cost for replacement of 12 red flower grass to westranga 12x$40=$480.00
dump fee $50.00
Total $750.00', NULL, 750.00, 'pending', '2019-03-12', '2019-03-12 16:20:52'),
  (2217650, 4312960, '2128680', 'Patio Cover Footings "excavation allowance"', '7 footings at approx $400 each @ $50hr allowance $3000
soil disposal allowance $130yard $2000

holes to be excavated at the rate of $50hr', NULL, 5000.00, 'pending', '2019-03-12', '2019-03-12 16:38:38'),
  (2217711, 5114731, '0004', 'Additional Credit', NULL, NULL, -250.00, 'pending', '2019-03-12', '2019-03-12 17:17:15'),
  (2220219, 4914151, '0001', 'Additional Paver Repair', NULL, NULL, 10798.00, 'pending', '2019-03-13', '2019-03-13 17:06:46'),
  (2223703, 5108066, '0001', '7 yards brown mulch', '7 yards redwood brown much in all lower planter areas . No weed barrier inc
2" thick', NULL, 1120.00, 'pending', '2019-03-15', '2019-03-15 16:37:21'),
  (2224216, 5099361, '0001', 'Install Skimmer', NULL, NULL, 900.00, 'pending', '2019-03-15', '2019-03-15 13:08:08'),
  (2224411, 5108038, '0002', 'Final Design Payment', 'this will be a credit if we are do the work', NULL, 700.00, 'sold', '2019-03-15', '2019-03-15 14:23:24'),
  (2224618, 4312960, '2128681', 'Low Voltage Light Upgrades', 'see attached breakdown and lighting plan', 'see attached prior to placing order to check quantity 

http://www.lightdisty.com/sollos-igt049-ss-in-ground-led-mr16-stainless-steel-trim-ring-well-light-996134.html  
order  MR16NFL7/830/LED MR16 7 Watt GU5.3 3000k Narrow Beam

Wac lighting order through electrical wholesale distributors sylmar 818-367-1115  sales order 1939', 8105.00, 'sold', '2019-03-15', '2019-03-15 18:52:31'),
  (2228692, 5108066, '0002', 'Additional Planting  Per Request', 'Total Budget/Allowance  $11750
(2) 24” Box @ $350ea                   $350
(35) 15Gal @ $150ea                     $5250
(62) 5Gal @ $40ea                         $2480
(63) 1Gal @ $20ea                         $1260
(22) Flats @ $75ea                         $1650
Total Budget used                         $10,990 (remaining allowance  $760) 

Plants Needed Additionally and order for Friday
(1) 24”Chamerops palm                                                                            $350
(2) 15Gal Prunus Laurocerasus @ $150ea                                            $300
(2) 1Gal Agapanthus Peter Pan   @ $20ea                                            $40
(10) Creeping Fig Vine @ $20ea                                                              $200
(5) Flats Vinca Major “Alba”  @$75ea                                                   $375
(1) phoenix roebellini                                                                                   $150   
(1) Phormium  “sunset” 5Gal                                                                      $40
(2) Kangaroo paw            RED        2ft variety   5Gal                                  $80
(6) Kangaroo Paw            Orange   3ft Variet     5Gal                                $240 
Move palm in pot to top hill per plan                                                         $65
(1) Agave Attenuata     5 gal (Damaged/warranty)                                   NC
 (1) piece Sod  warranty (warranty)                                                             NC
(2) Bougainvillea Trailing “Groundcover   -RED (included)   15Gal       NC
                                                                                                         Total     $1840

Additional planting requested cost above original allowance          $1080', NULL, 1080.00, 'sold', '2019-03-19', '2019-03-19 09:17:10'),
  (2228715, 5185591, '0001', 'Sprinkler Clock (module) to add additional station', 'new irrigation connected to existing clock, existing clock needs a module to expand to additional valves needed', NULL, 85.00, 'sold', '2019-03-19', '2019-03-19 09:23:09'),
  (2238333, 4602365, '2014571', 'Plant Change Order', 'Scope of Plant Change/Change Order
Replace (3) 24”Box   Chamerops palms  with phoenix reobelini palms 
Replace (2) King palms with (12ft Multi trunk 24” Box Palms 
Add (3) 1 gallon Boston ivy          
Upgrade (2) Citrus from 15Gallon to 24” Box size ($200)
ADD (8) 15 Gallon Pitosporum Silver Sheen ($100ea   - $800)
Add (23) 1 gallon lambs ear  ($95 Value – no charge)
Remove (3) 5 gallon Liriope Gigantea (-$120)
Replace (7) 5 gallon Roses with (5) Rhaphiolipsis Ballerina (-$40)
Additional planting        Price $840

plus (1)  Additional 15 Gallon  Citrus Lime $150

see attached plan, 
some plant locations of the plants will be adjusted by Ryan

Total $990', NULL, 990.00, 'sold', '2019-03-25', '2019-03-25 08:28:13'),
  (2238378, 5185591, '0002', 'Planting Upgrade per Fuel Mod  - Revised', 'Per plan
(4) 24"  Box  @ $350ea                  $1400
(2) 15 Gallon citrus @ $200ea       $400
(5) 15 Gallo shrub @ $150ea`       $750
(54) 5 Gallon @ $40ea                  $2160
(40)   1 Gallon @ $20ea                $800
Total $5510

original contract allowance $3552

Total Change order  upgrade $1902', NULL, 1902.00, 'sold', '2019-03-25', '2019-03-25 08:40:52'),
  (2238978, 4914151, '0002', 'Additional 25 sf @ $16. St. = $400.00', 'Additional 25 sf @ $16 = $400.00', NULL, 400.00, 'pending', '2019-03-25', '2019-03-25 18:20:13'),
  (2239224, 4963370, '0007', 'Add brick to cover holes on wall see images', NULL, NULL, 260.00, 'pending', '2019-03-25', '2019-03-25 19:21:06'),
  (2241208, 4602365, '2014572', '24" to 16" Fringe change order (no charge)', 'by owner request change from 24" proposed fringe to 16" reducing the design by by 8" closer to the walls and house, as its wavy next to the house

No charge', 'please see comments', 0, 'sold', '2019-03-26', '2019-03-26 09:36:32'),
  (2243901, 4602365, '2014573', 'Upgrade King Palms', 'upgrade from 6ft king palms to approx 12ft multi king palms', NULL, 300.00, 'sold', '2019-03-27', '2019-03-27 10:13:47'),
  (2245150, 2248927, '2112753', 'Stucco the berm', NULL, NULL, 1000.00, 'pending', '2019-03-27', '2019-03-27 15:56:42'),
  (2246664, 4602365, '2014574', 'Add additional 24" box lemon', NULL, NULL, 475.00, 'sold', '2019-03-28', '2019-03-28 18:00:40'),
  (2246809, 4602365, '2014575', 'Move light to middle of step', 'No charge', NULL, 0, 'sold', '2019-03-28', '2019-03-28 18:40:15'),
  (2246827, 4602365, '2014576', 'Paver step stones at faucet', 'Set 2 grana slab victorian stones over concrete to secure', NULL, 65.00, 'sold', '2019-03-28', '2019-03-28 18:46:06'),
  (2246855, 4602365, '2014577', 'Raise air conditioning units', 'Raise air conditioning units no charge

No warranty included 
Slight possibility of damage to plumbing may occur
Owner responsible for any damage

If not approved . Owner responsible to hire an AC expert at additional cost', NULL, 0, 'sold', '2019-03-28', '2019-03-28 18:51:28'),
  (2247271, 4602365, '2014578', 'Upgrade Irrigation clock', 'Original contract was to tie into existing clockExisting clock is not adequate and is only 6 stationWe need an additional 7th stationupgrade the clock to 8 station clock at cost$150', NULL, 150.00, 'sold', '2019-03-28', '2019-03-28 20:46:54'),
  (2249463, 5145518, '0001', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-03-29', '2019-03-29 15:12:49'),
  (2249467, 5185591, '0003', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-03-29', '2019-03-29 15:14:06'),
  (2249471, 4852401, '2130126', 'Design Fee 2', NULL, NULL, 475.00, 'pending', '2019-03-29', '2019-03-29 15:16:42'),
  (2249477, 4722142, '2037977', 'Deposit Remainder', NULL, NULL, 375.00, 'pending', '2019-03-29', '2019-03-29 15:20:50'),
  (2251151, 4602365, '2014579', '(4) Additional Lights - see attached', '(4) additional Vista LED gr2216 black up lights  $220 each
see attached plan', '(4) additionalVista LED gr2216 black up lights per
see attached plan', 880.00, 'sold', '2019-04-01', '2019-04-01 09:25:31'),
  (2260458, 4602365, '2014580', 'Extend Drain to Front (left of driveway)', 'Extend drain line to front sidewalk with pop-up at end
add 4 yards soil to level out area to le', NULL, 1800.00, 'sold', '2019-04-05', '2019-04-05 01:43:57'),
  (2260462, 4602365, '2014581', 'Additional planting (left of fireplace) + other', 'Left Of Fireplace
(2) 15 Gallon Pitosporum Silver sheen $200ea = $400
(3) 5 Gallon Rhaphiolipsis ballerina ($40ea  = $120
move 3 shrubs  $65
Delivery fee $125
$710

String lights with owner provided cable, using crimp tools to secure
includes additional time/labor 
$97', NULL, 807.00, 'pending', '2019-04-05', '2019-04-05 02:04:58'),
  (2261084, 5125010, '0001', 'Loops and Pavers Before', NULL, NULL, 3380.00, 'pending', '2019-04-05', '2019-04-05 08:50:12'),
  (2261088, 5125010, '0002', 'Loops and Pavers Complete with credit', NULL, NULL, 3180.00, 'pending', '2019-04-05', '2019-04-05 08:50:44'),
  (2261354, 4312960, '2128682', 'Cap Light (to be installed on right wall of patio)', 'Vista 4260M-SS  (brushed) 

owner to pickup light , unless we are already at warehouse
will notify when available for pickup', 'make sure they order BRUSHED STAINLESS STEEL', 236.00, 'sold', '2019-04-05', '2019-04-05 10:24:07'),
  (2261912, 4963370, '0008', 'MOVED: Credit for plants not planted and soil', NULL, NULL, -340.00, 'pending', '2019-04-05', '2019-04-05 13:32:59'),
  (2261915, 4963370, '0009', 'New plants and soil + credit', NULL, '556
-340', 216.00, 'pending', '2019-04-05', '2019-04-05 13:34:14'),
  (2264323, 4963370, '0010', 'Seal counter tops', NULL, NULL, 117.00, 'pending', '2019-04-08', '2019-04-08 18:48:30'),
  (2264363, 4963370, '0011', 'Replace 2 broken valves', NULL, NULL, 309.00, 'pending', '2019-04-08', '2019-04-08 18:58:50'),
  (2265310, 4927312, '0002', 'Rain Water Capture system', '1. saw cut drainage swale, 
2. install 10x10 drain box and grate
3. install plumbing to lower area to collect rain water into barrel
4. install hose bid to allow use of rain water captured from barrel

$1800 installation cost +
$300 allowance for barrel', NULL, 1800.00, 'pending', '2019-04-08', '2019-04-08 17:44:09'),
  (2266558, 5108066, '0003', 'Credit to mail (240)', NULL, NULL, 0, 'pending', '2019-04-09', '2019-04-09 09:30:19'),
  (2266772, 4727737, '0001', 'Demo and Reinstall 6 post wraps', 'Demo the existing 6 post wraps

reinstall with new design  (install them bigger with bullnose on cap)', NULL, 1950.00, 'pending', '2019-04-09', '2019-04-09 10:21:20'),
  (2266824, 1872497, '1001616', 'new concrete driveway', 'Change order for new concrete driveway is $6,986.25. This cost does not include any permits or city fees that may be required. This is a total 517.5 sqft. this includes the 3 different areas. 280.5 (driveway) 192 (approach) 45 (sidewalk)', NULL, 6986.25, 'pending', '2019-04-09', '2019-04-09 10:36:57'),
  (2266826, 1872497, '1001617', 'Concrete Repair', '1-saw cut damaged area.
2- grade area
3- add pins to driveway to reinforce concrete pad
4- Pour concrete to match (Cannot guarantee exact match) Exact match needs entire area demo and redone.', NULL, 468.00, 'pending', '2019-04-09', '2019-04-09 10:37:16'),
  (2267954, 4925382, '0001', 'additional Irrigation zone', NULL, NULL, 850.00, 'pending', '2019-04-09', '2019-04-09 15:45:07'),
  (2267957, 4925382, '0002', 'Additional Plants - credit 2 cherries', NULL, NULL, 419.00, 'pending', '2019-04-09', '2019-04-09 15:47:15'),
  (2268706, 4312960, '2128683', 'Patio step lights (2)', 'WAC 4011-30SS Step Light for Steps $220 x2', NULL, 440.00, 'sold', '2019-04-10', '2019-04-10 07:45:34'),
  (2270432, 4400695, '1916580', 'Removal and re installing of 12 sq ft of pavers', 'Removal and re installing of 12 sq ft of pavers', NULL, 450.00, 'pending', '2019-04-10', '2019-04-10 15:22:08'),
  (2270561, 4559517, '2008268', 'Replace broken valve', NULL, NULL, 280.00, 'pending', '2019-04-10', '2019-04-10 23:38:24'),
  (2270860, 4312960, '2128684', 'Oceanside Glass tile Upgrade, BBQ & Pool', 'This price is  additional costs above the original tile price associated with upgrading the standard 6x6 group 1 tile to oceanside glass tile

1. Includes the additional installation labor necessary to complete
2. installed to Oceanside Tile specifications and materials, 
3. includes the upgraded materials for installation
4. Muse Blend,Moroccan Desert,  size- 7/8x7/8 
5. epoxy gray grout - owner to select

Step tile  - no charge per Brian (trade for footing rock excavation)', 'order 60Sqft Oceanside Tile Muse Blend Moroccan Desert
contact Sarah to order
Sarah Eamigh
Architectural + Design Sales Executive
Western Region
C: 760.405.7650

visit these links to order the correct install materials  - carlos can advise on quantity of materials needed
http://www.glasstile.com/tile-installation-pdfs/
http://www.glasstile.com/tile-installation-videos/', 4320.00, 'sold', '2019-04-11', '2019-04-11 01:01:14'),
  (2274444, 5324369, '0001', 'Curve cut out', NULL, NULL, 300.00, 'pending', '2019-04-12', '2019-04-12 17:36:01'),
  (2276368, 4822355, '0002', 'Bener Board', 'Bender board amount 209 with discount becuase of Verva aclulation mistake', NULL, 1300.00, 'pending', '2019-04-15', '2019-04-15 06:54:00'),
  (2276379, 4822355, '0003', 'Additional Plants', 'additional planats', NULL, 165.00, 'pending', '2019-04-15', '2019-04-15 06:56:09'),
  (2283779, 5308874, '0002', 'Replace 140 L. feet of drain', NULL, NULL, 3220.00, 'pending', '2019-04-18', '2019-04-18 01:24:44'),
  (2283805, 5324369, '0002', 'Stump grinding', NULL, NULL, 345.00, 'pending', '2019-04-18', '2019-04-18 01:59:37'),
  (2284708, 4602365, '2014582', 'Glass Bifold door for Fireplace', 'the glass Bifold door is $715 plus installation/Delivery 2 hours time 
total door cost $845', '42LBFOD-BS Outdoor bi-fold door w/ frame & hoods, Brushed stainless 
order from fireside experts', 845.00, 'pending', '2019-04-18', '2019-04-18 09:02:42'),
  (2284909, 4602365, '2014583', 'Rabbit/Snake Fence', 'Rabbit Fencing

	Install ½”x2ft rabbit fencing 
	Wire to existing ornamental iron fence
	Approx. 75lf
	dig down approx 6" depth', NULL, 857.00, 'sold', '2019-04-18', '2019-04-18 10:03:22'),
  (2284966, 4602365, '2014584', 'Front Yard Cleanup & Mulch', 'Front Yard
clean up 1200sqft of weeds, trim and remove succulents as needed to improve curb appeal  -  2 men half day $650

install 1" of mulch  (4 yards)  $600', NULL, 1250.00, 'pending', '2019-04-18', '2019-04-18 10:16:29'),
  (2286128, 5380132, '0001', 'Full amount', 'This change order includes all change orders and contract amount. + processing fee.', NULL, 10011.60, 'pending', '2019-04-18', '2019-04-18 17:06:35'),
  (2286635, 4312960, '2128685', 'Pour a lid & grates - upgrade', 'upgrade the brass drain grates to "pour a Grate"  gray  (3) @ $25ea = $75

Upgrade standard white skimmer and auto fill lids to "pour a lids" Gray (2) @ $60ea = $120', 'Ryan will pick these up for the crew to install prior to pouring concrete', 195.00, 'sold', '2019-04-19', '2019-04-19 07:55:43'),
  (2291966, 5433874, '0001', 'Design Fee', NULL, NULL, 1400.00, 'pending', '2019-04-23', '2019-04-23 11:29:16'),
  (2292035, 4565595, '2127062', 'Permits and Fees', NULL, NULL, 1798.00, 'pending', '2019-04-23', '2019-04-23 11:44:17'),
  (2292083, 4565595, '2127063', 'Design Fee', NULL, NULL, 750.00, 'pending', '2019-04-23', '2019-04-23 11:54:40'),
  (2294775, 5325364, '0001', 'Recording fees for Apron permit', 'Recording fees for apron permit', NULL, 144.75, 'pending', '2019-04-24', '2019-04-24 12:04:15'),
  (2294952, 5433719, '0001', 'Design Fee 1', NULL, NULL, 700.00, 'pending', '2019-04-24', '2019-04-24 12:38:56'),
  (2295508, 5100240, '0001', 'Adding Putting green back in -deposit', 'Area measured with Victor
486 SF
X $10.75
$5,225.00
No demo, bobcat access for base, and easy access
Price approved by Brian', NULL, 4225.00, 'pending', '2019-04-24', '2019-04-24 15:21:57'),
  (2295580, 5433850, '0001', 'Design Fee 1', NULL, NULL, 1000.00, 'pending', '2019-04-24', '2019-04-24 16:06:52'),
  (2295584, 5433625, '0001', 'Design Fee 1', NULL, NULL, 750.00, 'pending', '2019-04-24', '2019-04-24 16:08:02'),
  (2296567, 5449169, '0001', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-04-25', '2019-04-25 09:04:18'),
  (2299843, 5325364, '0002', '17ln Sleeves', NULL, NULL, 255.00, 'pending', '2019-04-26', '2019-04-26 13:46:28'),
  (2302288, 4722142, '2037978', 'Patio Cover Footings', 'dig 16x16x1ft concrete pads 4-corners 
includes concrete', NULL, 250.00, 'sold', '2019-04-29', '2019-04-29 12:29:40'),
  (2302293, 4722142, '2037979', 'Additional Drainage for downspouts', 'additional 20ft trenching and drainage plumbing tieing in downspouts', NULL, 450.00, 'sold', '2019-04-29', '2019-04-29 12:31:01'),
  (2307199, 5468793, '0001', 'Split bottom drain per code (pool only) REQUIRED', NULL, NULL, 750.00, 'sold', '2019-05-01', '2019-05-01 17:21:52'),
  (2308016, 5308874, '0003', 'All changes from contract', '1) Reduce Demo by for not doing iron fencing demo                    - $250
2) Driveway paver reduction  by widening planter less paver.       - $264
3) Paver entry reduction                                                                 - $1,368
4) Paver parkway reduction                                                            - $288
5) Remove block wall                                                                      - $2,640
6) Decorative retaining wall reduction                                             - $4,560
7) Lighting Add on                                                                          + $500
8) Step reduction                                                                             - $200
9) Reduction of mailbox install to just footing                                  - $490
10) Drainage error on early change order                                       - $180

-9,740.00', NULL, 0, 'pending', '2019-05-01', '2019-05-01 13:36:41'),
  (2308243, 5308874, '0004', 'Design Fee', NULL, NULL, 375.00, 'pending', '2019-05-01', '2019-05-01 14:41:03'),
  (2309903, 4312960, '2128686', 'Additional 36" box Palo Verde', NULL, NULL, 1275.00, 'pending', '2019-05-02', '2019-05-02 17:36:19'),
  (2309952, 5049684, '0001', 'Design', NULL, NULL, 2400.00, 'pending', '2019-05-02', '2019-05-02 10:53:22'),
  (2310806, 5285676, '0001', 'Design Fee', NULL, NULL, 700.00, 'pending', '2019-05-02', '2019-05-02 14:22:09'),
  (2311502, 5468793, '0002', 'ADD Blue Glass to plaster 20%', NULL, NULL, 2600.00, 'sold', '2019-05-03', '2019-05-03 06:12:28'),
  (2311512, 5468793, '0003', 'Color Selections (no Additional Charge)', 'Please approve this to confirm your selections

Coping - Bellecrete ..Color-Kahlua

Stone - MSI...Color-Canyon Creek .. LPNLQCANCRE624

Plaster - StoneScapes ..Color-Aqua White (Mini)  

Tile - To Be Detrermined
Concrete Stain  - To Be Verified Tan', 'concrete stain is Arizona Tan FX nano available at prime building materials  B#180312  gallons needed tbd by crew and sqft', 0, 'sold', '2019-05-03', '2019-05-03 06:18:48'),
  (2311523, 5468793, '0004', 'CREDIT - Clean/Reseal Front Pavers', 'Remove from contract -  We will not do

We will still evaluate the front pavers and reset any pavers with settlement  under warranty conditions

since this was part of the Package Deal we made at the table  "package price"  full price credit cannot be given 

This is the maximum credit from the total contract price

Credit $1770', NULL, -2270.00, 'pending', '2019-05-03', '2019-05-03 06:23:03'),
  (2311595, 2248927, '2112754', 'Added Fencing', 'This is for added fencing for side gates and under house. Plus switching from wood to iron railing.', NULL, 3400.00, 'pending', '2019-05-03', '2019-05-03 06:53:25'),
  (2311611, 5493354, '0001', 'Design payment 1 of 2', NULL, NULL, 375.00, 'pending', '2019-05-03', '2019-05-03 06:57:03'),
  (2313004, 5100240, '0002', 'Extra SF 100 of lawn', NULL, NULL, 300.00, 'pending', '2019-05-03', '2019-05-03 14:00:17'),
  (2313035, 5100240, '0003', 'additional irrigation zone', NULL, '8 in revised contract, plus this one, 9 total', 850.00, 'pending', '2019-05-03', '2019-05-03 14:09:12'),
  (2313274, 5498674, '0001', 'Design Fee 1', NULL, NULL, 500.00, 'pending', '2019-05-03', '2019-05-03 19:57:35'),
  (2318049, 4312960, '2128687', 'Additional synthetic lawn 100sqft', '100sqft at $10sqft = $1000', NULL, 1000.00, 'sold', '2019-05-07', '2019-05-07 18:55:17'),
  (2320874, 4312960, '2128688', 'Chimney Stonework', 'using stone on hand, 
chip off hi spots from existing stonework.
brown coat/flatten with mortar to prepare for new stone overlay
overlay stone over existing, and over concrete cap sides, no stone on top of existing concrete cap
no cap to be installed or showing from sides

does not include any repair of the rood , flashing or sealing if and or necessary
we will notify you if we visually see a issue

thank you Rafi for being a great customer', 'please use caution and be tied to the roof  
Do not work on the roof without being tied down', 1800.00, 'sold', '2019-05-08', '2019-05-08 11:49:10'),
  (2322092, 4722142, '2037980', 'Build pergola', NULL, NULL, 840.00, 'sold', '2019-05-09', '2019-05-09 06:20:13'),
  (2323204, 5408930, '0001', 'Additional 130 LF. RTF. Sod', NULL, NULL, 390.00, 'pending', '2019-05-09', '2019-05-09 17:21:16'),
  (2325444, 5340777, '0001', 'Additional 50 LF. Drainage', NULL, NULL, 1150.00, 'pending', '2019-05-10', '2019-05-10 16:34:59'),
  (2326260, 5145518, '0002', 'Design Fee 2', NULL, NULL, 375.00, 'pending', '2019-05-10', '2019-05-10 13:41:00'),
  (2326387, 5494650, '0001', 'Design Fee 1', NULL, NULL, 550.00, 'pending', '2019-05-10', '2019-05-10 14:46:50'),
  (2326428, 5493354, '0002', 'Design payment 2 of 2', NULL, NULL, 375.00, 'pending', '2019-05-10', '2019-05-10 15:09:26'),
  (2326443, 5532938, '0001', 'Design Fee 1', NULL, NULL, 550.00, 'pending', '2019-05-10', '2019-05-10 15:19:45'),
  (2326477, 5533067, '0001', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-05-10', '2019-05-10 15:55:24'),
  (2326760, 5523763, '0001', 'Add (5) 1gallon plants next/side of garage', NULL, NULL, 100.00, 'sold', '2019-05-11', '2019-05-11 19:01:34'),
  (2329306, 5340777, '0002', 'Patio cover footing excavation', 'no longer being done by us', '30x30 X1FT DEEP', 400.00, 'pending', '2019-05-13', '2019-05-13 21:27:02'),
  (2329658, 4809254, '0003', 'lower wall repair', 'Demo and remove blocks in a V shape leaving the bottom block. Reconstruct blocks and dowel in rebar as needed. Reattach brick cap.', NULL, 1700.00, 'pending', '2019-05-13', '2019-05-13 17:45:05'),
  (2330921, 5049684, '0002', 'Adding 1- 24"box Eureka Lemon', NULL, NULL, 1900.00, 'pending', '2019-05-14', '2019-05-14 16:54:48'),
  (2334236, 5285676, '0003', '(3) 24" Box Trees', '(3) 24" Box Trees

(1) in front yard
(2) in rear yard

location and type to be determined', NULL, 1155.00, 'sold', '2019-05-15', '2019-05-15 12:25:38'),
  (2334411, 5100240, '0004', 'Additional Pavers in Front', NULL, NULL, 2695.50, 'pending', '2019-05-15', '2019-05-15 13:04:02'),
  (2337491, 5472327, '0001', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-05-16', '2019-05-16 15:04:56'),
  (2337754, 5049684, '0003', 'Replace Main Water Line', 'Replace main water line to meter.', NULL, 2900.00, 'pending', '2019-05-16', '2019-05-16 18:14:59'),
  (2338699, 5100240, '0005', 'Set (4) 4x4 post in concrete', '~10'' 4x4. wants at least 8'' exposed. 

edited from 2 psots to 4 by mo @ 275 ea', NULL, 1100.00, 'pending', '2019-05-17', '2019-05-17 16:40:19'),
  (2339570, 5049684, '0004', 'Grout left retaining wall', NULL, NULL, 3200.00, 'pending', '2019-05-17', '2019-05-17 21:27:24'),
  (2340153, 5285676, '0004', 'Shed Colors (selection)', 'See attached color swatches  for shef
White trim
Campagne base 
Roof shingle  color as shown', NULL, 0, 'sold', '2019-05-19', '2019-05-19 18:52:50'),
  (2341466, 5570530, '0001', 'Relocating irrigation manifolds and laterals', NULL, NULL, 1000.00, 'pending', '2019-05-20', '2019-05-20 17:19:58'),
  (2342925, 5093944, '0002', 'Front Yard Landscape and Entry', '1. Excavate front yard necessary to complete the following $2980
2. Irrigation, 1 Drip Zone , 1 Spray zone Lawn                $1700
3. Form and install concrete per plan in modern design $4200
               -Top Cast #3 “Acid finish”
               -Natural Gray concrete
               -Includes, 14” Driveway strips on side of driveway,
-side gate walk and front entry pads
4. Valley RTF Sod  300sqft            $1600
5. Planting
(1) 36” Box Palo Verde - tree       $1375
 (13) 5Gallon plants                        $520
(26) 1Gallon plants                         $520
6.  ¾” Crushed gravel  450sqft                    $1387
7. ¾” Mexican Pebble as shown in design $467
7. Lighting $1980
               (2) well lights
               (4) up lights
               (3) step lights – in steps
               Tie into rear yard transformer

Total $16,729', NULL, 16729.00, 'pending', '2019-05-20', '2019-05-20 22:09:40'),
  (2346702, 5148642, '0003', 'Additional demo $300', NULL, NULL, 300.00, 'pending', '2019-05-22', '2019-05-22 09:58:26'),
  (2346707, 5148642, '0004', 'Additional irrigation', NULL, NULL, 200.00, 'pending', '2019-05-22', '2019-05-22 09:59:21'),
  (2346721, 5148642, '0005', 'Adding 2-5 gal. Escalonias to be planted in pots', NULL, NULL, 180.00, 'pending', '2019-05-22', '2019-05-22 10:01:23'),
  (2347903, 2248927, '2112755', 'Drop Front Grade in Driveway Lower', 'This is to drop grade even lower for front grade by owner request.', NULL, 1200.00, 'pending', '2019-05-22', '2019-05-22 15:26:33'),
  (2347921, 2248927, '2112756', 'Added Drainage', 'Added drainage.

125 hillside drainage. SDR 35.
80 linear feet of backyard drainage. SDR 35
60 linear feet of sideyard drainage. SDR 35
40 linear feet of drainage in front SDR 35
Strip drains for front garage.  18 linear feet.

Catch basins in back yard.
Drains for side yard. 

Total $5900', NULL, 5900.00, 'pending', '2019-05-22', '2019-05-22 15:33:48'),
  (2351973, 5148642, '0006', 'Additional 65 sqft deck', NULL, NULL, 2537.60, 'pending', '2019-05-24', '2019-05-24 11:29:11'),
  (2352513, 3905763, '0001', 'Work done', NULL, NULL, 550.00, 'pending', '2019-05-24', '2019-05-24 15:14:44'),
  (2352531, 5344445, '0001', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-05-24', '2019-05-24 15:31:22'),
  (2352865, 5512086, '0002', 'Demo Change', 'Please contact me regarding the demo change email I received Sat. 6/25.

Marcia Mahony', 'Ryan, Saw your Mahony change order re rototilling, preemergent instead of Roundup. This decision came from Brian in order to plan calendar. Please take note of Sean''s Friday Daily Log.', 0, 'pending', '2019-05-26', '2019-05-26 11:47:45'),
  (2356406, 2248927, '2112757', 'Rough Electrical and low voltage lines.', NULL, NULL, 950.00, 'pending', '2019-05-28', '2019-05-28 18:20:20'),
  (2356422, 2248927, '2112758', 'Plumbing Change Order', '1) Install new main line 1" copper.  Buried 2 feet due to grade. back fill trenches and recompact.
2) Install separate 1" PVC main line to side planter and to backyard for bibs and irrigation.
3) Install new pressure regulator.
4) Install 2 new ball valves for water lines
5) Install new backflow sever prevention and clean out.
6) Install new earthquake gas valve.
7) Move all pool equipment lines.', NULL, 7600.00, 'pending', '2019-05-28', '2019-05-28 18:34:23'),
  (2358986, 5285676, '0005', 'Shed Foundation Per County Requirment', '16x30 Foundation per County Requirement for shed , see example attached

includes 10x14 concrete Pad for patio cover

includes 3% CC fee. 
 

	
		
			$12,784.00 
		
	



7100 on CC
5000 on CC

12100 x .03 = 363 CC fees



684 + 363 = 1047.00 by check', NULL, 1047.00, 'pending', '2019-05-29', '2019-05-29 14:39:31'),
  (2361398, 5049684, '0005', 'Electrical Run', 'Electrical run to feature. 

90 feet plus plug. $20 per foot.  

Total $1800', NULL, 1800.00, 'pending', '2019-05-30', '2019-05-30 12:24:17'),
  (2364061, 5285676, '0006', 'Corrected Change Order (-155,982.00)', 'This is the Corrected Change order
This Change order supersedes previous orders , this one has been corrected to make clear of all changes
See attached

Amount : $(155,982.00)', 'Change order amount : $155,982.00', 0, 'pending', '2019-05-31', '2019-05-31 13:30:37'),
  (2364270, 5633516, '0001', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-05-31', '2019-05-31 15:12:56'),
  (2364271, 5633500, '0001', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-05-31', '2019-05-31 15:13:37'),
  (2364272, 5622742, '0001', 'Design Fee 1', NULL, NULL, 750.00, 'pending', '2019-05-31', '2019-05-31 15:14:09'),
  (2364274, 5633481, '0001', 'Design Fee 1', NULL, NULL, 200.00, 'pending', '2019-05-31', '2019-05-31 15:14:51'),
  (2364969, 5555986, '0001', 'Additional Synthetic Lawn 200Sqft', 'Square foot calculation was incorrect of contract, contract  says 100Sqft, need 300Sqft total

Additional 200sqft   $1875', 'Ryan created this change order, i hope the owner approved it verbally? looks like george approved it manually??', 1875.00, 'pending', '2019-06-03', '2019-06-03 00:53:02'),
  (2365767, 5547166, '0001', 'Design Fee 1', NULL, NULL, 1200.00, 'pending', '2019-06-03', '2019-06-03 09:13:04'),
  (2367660, 5468793, '0005', 'Tile Upgrade', 'Upgrade tile to Universal Tile  CB661 Marine 6x6 and 1x1 for step tile', 'order from  universal tile  818-700-1666
18418 Bryant St, Northridge Ca', 455.00, 'pending', '2019-06-03', '2019-06-03 21:51:49'),
  (2370042, 5472321, '0001', 'Upgrade burner', NULL, NULL, 320.00, 'pending', '2019-06-04', '2019-06-04 14:33:01'),
  (2370049, 5049684, '0006', 'Anchors and footings for deck', NULL, NULL, 400.00, 'pending', '2019-06-04', '2019-06-04 14:35:09'),
  (2370283, 5472321, '0002', 'Gravel Credit', NULL, NULL, -390.00, 'pending', '2019-06-04', '2019-06-04 16:26:24'),
  (2370417, 5633890, '0001', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-06-04', '2019-06-04 17:40:35'),
  (2370419, 5630790, '0001', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-06-04', '2019-06-04 17:41:13'),
  (2371581, 5555986, '0002', 'Stump grinding', NULL, NULL, 800.00, 'pending', '2019-06-05', '2019-06-05 09:49:24'),
  (2371838, 2248927, '2112759', 'Seal driveway pavers', NULL, NULL, 2400.00, 'pending', '2019-06-05', '2019-06-05 11:04:22'),
  (2372361, 5555986, '0003', 'Siding Waterproof and woodwork', 'the following items are to be repaired or installed
1. at column against house , remove wood approx 16"height..same height as bottom of window, stone this column at house
2. install waterproofing where needed at wood exposed areas and fix lath and browncoat in order to be able to install new stone', NULL, 1200.00, 'sold', '2019-06-05', '2019-06-05 13:06:52'),
  (2372413, 4381266, '2054748', 'Planter Beds and new Sod', 'See Daily Log', NULL, 3870.00, 'pending', '2019-06-05', '2019-06-05 13:15:22'),
  (2375573, 5468793, '0006', 'Spa step repair', NULL, NULL, 300.00, 'pending', '2019-06-06', '2019-06-06 15:01:29'),
  (2375827, 5100240, '0006', '3 additional lights', NULL, NULL, 600.00, 'pending', '2019-06-06', '2019-06-06 17:25:38'),
  (2376040, 5093944, '0003', 'NEW Scope of Work -Reduces Orig Contract -$30,936', 'REMOVED ITEMS   - $68,973
These Items shall be removed from the Original contract
1. Raised Planter                                                           $9680
2. Fireplace & Bench                                                    $17,987
3. Precast Planter Bowls (from 4 to 2)                      $1660
4. Pool Auto cover                                                        $15,586
5. Synthetic Lawn                                                        $14,200
6., Raised Patio w Steps                                              $9680
                      

NEW ITEMS - $38,037
These items are additional to the contract
Sunken Fire Pit Area 16''x16''-16” Depth     Price $29,300
               1. Excavate 30 yards soil for sunken fire pit area               
               2. All poured in place acid finish #3                         
               3. 8” Deep Steps (2) sets as per plan
               4. 16ft bench with backrest                                       
               5. Concrete floor
               6. 110V Sump Pump connected into drain system
               7. 20ft 1” Poly Gas line  
               8. 48” Wok Style Fire Bowl W/Lave rock fill, with Mexican pebble around base,
               9. (14) low voltage step lights on separate switch

Lawn/Sod 1850Sqft    Price $8737
                1, (2) zones Irrigation pop-ups or Rotors  
                2. Amend soil and grade
                3. Install Valley RTF Sod 


Original Contract  $193.389
With items Removed -$68,973 = $124,416
New total Contract ADD $29,300 + $124,416 = $162,453 -      Reduces the original contract by $30,936

Total Contract $167,616 + Any Additional approved change orders and permit costs
NEW PAYMENT SCHEDULE
Deposit                                                            $1000 - Paid
Yard Grading & Demo                                   $10,000
Pool Excavation                                              $20,000
Rough Underground – Landscape              $10,000
Rough Plumbing – Pool                                $15,000
Pool & BBQ Equipment Delivered              $20,000
Pool Steel                                                        $20,000
Gunite                                                              $20,000
Concrete Work 50%                                      $10,000
Concrete Work 100%                                    $10,000
Planting Installed                                           $10,000
Pool Plaster ( pre-plaster walkthrough)     $5000
Low Voltage Lighting installed                     $5000
All work Complete                                         $6453
Upon Billing of all permit costs and fees

OWNER RESPONSIBILITIES 
1. Watering pool Gunite for 5 days after install
2. “Start up” operation using a pool care professional
3. Brushing pool 2-3x daily for 5 days to keep plaster dust suspended and to polish plaster surface', NULL, -30936.00, 'pending', '2019-06-06', '2019-06-06 23:29:19'),
  (2376049, 5285676, '0007', 'Fence layout plan  - No Charge', 'See attached and approve , this also shows the locations of the 24" box trees', NULL, 0, 'sold', '2019-06-07', '2019-06-07 01:44:23'),
  (2376204, 5570702, '0001', 'Additional wall and drainage.', 'Additional 29 LF of CMU retaining wall with 24" with cap exposed average. 29 of of additional drainage.', NULL, 5000.00, 'pending', '2019-06-07', '2019-06-07 06:12:02'),
  (2377347, 4296566, '2108875', 'Design Fee', NULL, NULL, 1000.00, 'pending', '2019-06-07', '2019-06-07 12:12:42'),
  (2377373, 2049072, '1097171', 'Rebrushing and infill 1400 sqft existing turf', NULL, NULL, 250.00, 'pending', '2019-06-07', '2019-06-07 12:19:08'),
  (2377908, 5523763, '0002', 'Replace 1 broken valve', NULL, NULL, 120.00, 'pending', '2019-06-07', '2019-06-07 15:52:24'),
  (2379319, 5555986, '0004', 'Additional stump grinding in front yard', NULL, NULL, 220.00, 'pending', '2019-06-10', '2019-06-10 08:10:03'),
  (2380127, 4381266, '2054749', 'Add more sod', 'Add 150 sq feet more.', NULL, 650.00, 'pending', '2019-06-10', '2019-06-10 11:37:08'),
  (2380352, 5687197, '0001', 'Add On Work', 'This is a previous client that we are adding work to for this job.', NULL, 0, 'pending', '2019-06-10', '2019-06-10 12:27:32'),
  (2381194, 5555986, '0005', 'Lighting (Credit)', 'from 34 total lights to 26 lights 
8 lights  @$220ea = $1760', NULL, -1760.00, 'sold', '2019-06-10', '2019-06-10 16:56:06'),
  (2381207, 5285676, '0008', 'MX Track  -Revised', 'Design and install Dirt Bike track for kids 6-12

INCLUDES:
Earthwork /Tractor work 
 Design Layout / Design work $500Value
120  1-1/2" main line to hose bib to water track
100ft-1" Quality rubber hose hose and large fire hose type nozzle

NOT INCLUDED:
Hay Bails, Barriers, fencing.
imported soil

Payment Schedule
$5000 upon completion of main line
$5587   When track complete

see attached location of track, size area and hose bib location', NULL, 10587.00, 'sold', '2019-06-10', '2019-06-10 17:13:35'),
  (2381245, 5285676, '0009', 'Dirt Track Watering System', '1. install owner provided 2500Gallon water tank with auto shut top off valve at left side of Shed
Available here https://www.ntotank.com/2500gallon-norwesco-green-vertical-water-tank-x2969324
2. install 1" pvc main line from home irrigation main line to Tank to top-off water tank feed 
3. install owner provided pump
available here   https://powerequipment.honda.com/pumps/models/wb20  
4. install 200ft of 2" pvc main line  to (2) fire hose bibs  
5. install (2) 1-1/2 x50ft fire hoses and (2) nozzles with shut off valves 
$6780+ tank and pump

See attached location of tankk, and hose water hoses

Upgrade to Electric pump see additional change order', NULL, 6780.00, 'pending', '2019-06-10', '2019-06-10 17:56:55'),
  (2381252, 5285676, '0010', 'Upgrade to Electric Water Pump  (option)', 'Electrical pump option so that you can just flip a switch to turn on pump to water track

1. Install electrical from right of shed to left of shed where pump and tank will be 
2. install Electrical disconnect.
3. install 4x4 concrete pad for pump
4. install 5hp 220V Waterpump 

$4532', NULL, 3570.00, 'pending', '2019-06-10', '2019-06-10 18:04:25'),
  (2381293, 5633516, '0002', 'Completion of Design layout', NULL, NULL, 375.00, 'pending', '2019-06-10', '2019-06-10 19:10:33'),
  (2381300, 5633516, '0003', 'Engineering, Permits , Permit Technician - Budget', 'Permit Technician at the rate of $120hr includes all further drawings necessary for site plan and requirements by city.  time permit running at city  or with engineers. 

+ Soils Reports costs/fees
+ Structural Engineering
+ City permit Costs, fees, permit application will go forward once job costs are approved by owner

Not to exceed $5000 without further approval, 
Additional approval will be estimated if required in an additional change order

Due upon invoiced for expenses  incurred 
  
Survey Costs $2800
Picture Build Technician costs 6hrs, @ $120hr = $720


Total to be deducted from Deposit $3520', NULL, 5000.00, 'sold', '2019-06-10', '2019-06-10 19:20:13'),
  (2382315, 5472321, '0003', 'Credit given', NULL, NULL, 70.00, 'pending', '2019-06-11', '2019-06-11 09:25:57'),
  (2383006, 2248927, '2112760', 'Paver and Brick Add ons', '1) Install brick capping for side wall for complete look. $875
2) Upgrade back paver to Paseo.  $4,325
3) Paver Install in back increased to 1882 sq feet. Larger than original layout and contract.  - $1,650
4) Polysand requirement for Paseo paver.  - $2445', NULL, 9295.00, 'pending', '2019-06-11', '2019-06-11 12:08:46'),
  (2388234, 4914151, '0003', 'Additional square feet 171 new and replaced sf', 'Please see under contracts for details  
This includes:
171 of pavers @ $16.25 SF
$185.00 delivery charge', NULL, 2964.00, 'pending', '2019-06-13', '2019-06-13 11:14:08'),
  (2389383, 5686048, '0001', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-06-13', '2019-06-13 17:34:11'),
  (2389389, 5707886, '0001', 'Design Fee 1', NULL, NULL, 750.00, 'pending', '2019-06-13', '2019-06-13 17:44:33'),
  (2390329, 2248927, '2112761', 'New electrical 6.14.2019', NULL, NULL, 1200.00, 'pending', '2019-06-14', '2019-06-14 08:53:22'),
  (2390365, 3165059, '1945714', 'Change order 6.14.2019 see notes', 'install of 4 5gal plants checking drip and irrigation spreading 4 wheels barrows of mulch', NULL, 0, 'pending', '2019-06-14', '2019-06-14 09:04:23'),
  (2390589, 5632929, '0001', 'Drainage Design', NULL, NULL, 750.00, 'pending', '2019-06-14', '2019-06-14 10:22:57'),
  (2391669, 5100240, '0007', 'Upgrade on uplights', '15 uplights × $25 = $375 for uplight upgrade', NULL, 375.00, 'pending', '2019-06-15', '2019-06-15 11:27:08'),
  (2393244, 5555986, '0006', 'Addi light and Transformer Change Vista to BSO', 'from Vista Brand Lights to BSO lighting brand 
Add 1-addtional Uplight
Add 1-Transformer

the following will be installed
10x         2216-BSO uplight
2x           5105- BSO Flood
15x         5014i – BSO Small uplight', NULL, 780.00, 'sold', '2019-06-17', '2019-06-17 10:55:35'),
  (2393938, 5049684, '0007', '6 additional wall lights', NULL, NULL, 1560.00, 'pending', '2019-06-17', '2019-06-17 13:38:31'),
  (2393944, 5049684, '0008', '203 LF. Of rustic wall cap', 'Wall cap is $18.75 per linear foot installed.  Total ln feet was 203. 

18.75 x 203 = $3,806', NULL, 3806.00, 'pending', '2019-06-17', '2019-06-17 13:39:31'),
  (2394185, 5285676, '0011', 'Upgrade Trees to taller trees', 'upgrade (3) 24" box trees (9-10ft)  
to 36" Box trees 11-12feet high', NULL, 2541.00, 'sold', '2019-06-17', '2019-06-17 14:42:14'),
  (2394369, 2248927, '2112762', 'Seal 1882 sq. Feet first back yard pavers', NULL, NULL, 1882.00, 'pending', '2019-06-17', '2019-06-17 16:23:56'),
  (2395233, 5633891, '0001', '65 LF. 3/4" gas line (green line)', NULL, NULL, 2795.00, 'pending', '2019-06-18', '2019-06-18 07:32:39'),
  (2397206, 2248927, '2112763', '92 lnft of pool coping', NULL, NULL, 5520.00, 'pending', '2019-06-18', '2019-06-18 16:47:16'),
  (2398358, 4602365, '2014585', 'Permits and Engineering', NULL, NULL, 2000.00, 'pending', '2019-06-19', '2019-06-19 09:17:16'),
  (2398389, 4602365, '2014586', 'Hauling and Disposal', NULL, NULL, 1647.00, 'pending', '2019-06-19', '2019-06-19 09:23:13'),
  (2399417, 5633891, '0002', '100 LF. of conduit', NULL, NULL, 475.00, 'pending', '2019-06-19', '2019-06-19 13:34:19'),
  (2399977, 5285676, '0012', 'Additional Lawn 1860sqft to complete', 'original contract 6640 square feet sod

Additional 1860sqft to complete  8500sqft total    (measured 3x onsite to confirm and by Ryan Personally-onsite)

Difference in cost $3575', NULL, 3575.00, 'sold', '2019-06-19', '2019-06-19 17:26:22'),
  (2404192, 2248927, '2112764', 'Additional stucco on brick on cottage', NULL, NULL, 475.00, 'pending', '2019-06-21', '2019-06-21 13:34:55'),
  (2404196, 2248927, '2112765', '2 extra pieces of corner Belecrete @ cost', NULL, NULL, 0, 'pending', '2019-06-21', '2019-06-21 13:36:23'),
  (2404501, 5555986, '0007', 'Install new bbq grill they''re buying it', NULL, NULL, 200.00, 'pending', '2019-06-21', '2019-06-21 16:05:50'),
  (2406865, 5468793, '0007', 'Seal Coping and Stone  at material cost only', 'Upon the request of the owner

Seal coping and stonework, 
using all purpose sealer, this will darken the stone and coping work,
a test sample will be provided upon written request

Material only, Picture Build will provide labor at no cost', 'this was not included verbally or included in the contract', 160.00, 'sold', '2019-06-24', '2019-06-24 12:17:28'),
  (2410224, 5100240, '0008', 'C/O for plants and BB', NULL, NULL, 1125.00, 'pending', '2019-06-25', '2019-06-25 13:55:20'),
  (2410321, 5468793, '0008', 'CREDIT - color change to pool finish (aqua white)', NULL, NULL, -1885.00, 'pending', '2019-06-25', '2019-06-25 14:25:44'),
  (2410664, 2248927, '2112766', 'Additional stucco', NULL, NULL, 700.00, 'pending', '2019-06-25', '2019-06-25 17:59:31'),
  (2410665, 2248927, '2112767', 'Additional water proofing', NULL, NULL, 2500.00, 'pending', '2019-06-25', '2019-06-25 18:00:15'),
  (2411520, 5555986, '0008', 'Dry Set pavers for small shed', NULL, NULL, 235.00, 'pending', '2019-06-26', '2019-06-26 08:13:00'),
  (2411815, 2020752, '0001', '24sqft of pavers', NULL, NULL, 500.00, 'pending', '2019-06-26', '2019-06-26 09:27:47'),
  (2415694, 2917771, '0001', 'pavers stump grind', NULL, NULL, 500.00, 'pending', '2019-06-27', '2019-06-27 14:53:54'),
  (2417985, 5285676, '0013', 'Hay Bales & Deco (See Attached) + 3% CC fee', '1. Install 96 Hay Bales
2. Hay Bale Covers
    (66) white
    (27) Colored W/Logo (see attached)
3. (600ft) Checker Flag flag tape as shown on plan
4. (56) Acerbis Track Markers


see attached design and proposal

Original amount $5,987.00 + 3% CC fee. 6166.61', 'Hay Bales (Hemme Hay feed, lancaster - Robert 661-942-7880 96pcs @ $6.95 plus 20 Delivery   - Deliver as close as possible or around the track)

Penants (order 6) https://www.doolins.com/product/black-white-checker-100ft-pennant-strings/?gclid=CjwKCAjw9dboBRBUEiwA7VrrzW6L5VjUm7Z4r5O28l6WyWoRZ2jknItYV5h-wiUTru6Ol89G4WbzohoCWagQAvD_BwE 

(1) acerbis  track markers - includes 56pcs
https://www.amazon.com', 6166.61, 'pending', '2019-06-28', '2019-06-28 17:52:23'),
  (2418126, 5049684, '0009', 'Additional 5 wall cap lights for small wall and ma', NULL, NULL, 1300.00, 'pending', '2019-06-29', '2019-06-29 09:40:51'),
  (2419480, 4312960, '2128689', 'Additional Vista Wall Lights', '(19) Vista 4260mm-ss led wall lights  (brushed finish)

installed all epe covered walls', NULL, 4484.00, 'sold', '2019-07-01', '2019-07-01 08:53:40'),
  (2419953, 5633891, '0003', 'Cover chimney', NULL, NULL, 480.00, 'pending', '2019-07-01', '2019-07-01 11:16:04'),
  (2419956, 5633891, '0004', 'Mainline tap in', NULL, NULL, 400.00, 'pending', '2019-07-01', '2019-07-01 11:17:07'),
  (2423413, 4312960, '2128690', 'Additional cap light', NULL, NULL, 236.00, 'sold', '2019-07-02', '2019-07-02 15:07:05'),
  (2424432, 5642283, '0001', 'C/O No charge electrical, charge light material', 'NO CHARGE
original measurement by Rick Hames, corrected by Jorge Flores

approx 20 lnft measured
20 lnft at 21.00 total of $420


CHARGE :
Material for lights allocation on contract ~500
Material costs $783.85

Difference : $283.85', NULL, 283.85, 'pending', '2019-07-03', '2019-07-03 08:29:22'),
  (2425358, 5049684, '0010', 'Material Order of Fencing', 'IPE along interior side and red wood on neighbor', NULL, 20000.00, 'pending', '2019-07-03', '2019-07-03 12:55:02'),
  (2425361, 5049684, '0011', '3 steel post for lights', NULL, NULL, 1200.00, 'pending', '2019-07-03', '2019-07-03 12:55:44'),
  (2426910, 5686190, '0001', 'Porch, paver upgrade, change in rock', NULL, NULL, 4062.00, 'pending', '2019-07-05', '2019-07-05 06:19:18'),
  (2429144, 5633891, '0005', 'New Sod', '801 Square Feet front and back', NULL, 2803.00, 'pending', '2019-07-08', '2019-07-08 08:19:28'),
  (2429160, 5633891, '0006', 'Mulch', '238 Square Feet', NULL, 357.00, 'pending', '2019-07-08', '2019-07-08 08:26:14'),
  (2429181, 5633891, '0007', 'Additional steps', '12 LF X $50.00', NULL, 600.00, 'pending', '2019-07-08', '2019-07-08 08:29:50'),
  (2429196, 5633891, '0008', 'Vertical Mo Strips with block caps 8.5 LF', 'Wall cap turned vertical for planter border', NULL, 212.00, 'pending', '2019-07-08', '2019-07-08 08:33:31'),
  (2429213, 5633891, '0009', 'Additional pavers 31 SF', 'In the email approved change order I listed the incinerator at $400.00, it was inputted at $480.00  so the balance is $372.00', NULL, 372.00, 'pending', '2019-07-08', '2019-07-08 08:37:20'),
  (2429224, 5633891, '0010', 'Plants', NULL, NULL, 1850.00, 'pending', '2019-07-08', '2019-07-08 08:39:16'),
  (2429346, 4809254, '0004', 'Pour-A-Lids', NULL, 'Email on 7/6/19 approving pour-a-lids

Hi David,

Yes, please proceed. 

Thanks,
Emily

On Sat, Jul 6, 2019 at 11:39 AM David Bender  wrote:
Hi Emily
The upgrade cost for pour-a-lids are $100 per lid.
6 lids will be $600.
Please reply back with an approval.', 200.00, 'pending', '2019-07-08', '2019-07-08 09:07:46'),
  (2429543, 5642283, '0002', 'Added to armrests', NULL, NULL, 0, 'pending', '2019-07-08', '2019-07-08 09:53:03'),
  (2429876, 5049684, '0012', '50% Fencing Complete', NULL, NULL, 11500.00, 'pending', '2019-07-08', '2019-07-08 11:14:29'),
  (2429878, 5049684, '0013', '100% Fencing Complete', NULL, NULL, 10000.00, 'pending', '2019-07-08', '2019-07-08 11:15:07'),
  (2429997, 5642283, '0003', 'Armrests lower them two inchs', NULL, NULL, 0, 'pending', '2019-07-08', '2019-07-08 11:40:43'),
  (2430502, 5633481, '0002', 'Design Fee', NULL, NULL, 200.00, 'pending', '2019-07-08', '2019-07-08 13:39:54'),
  (2430508, 5823320, '0001', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-07-08', '2019-07-08 13:41:14'),
  (2430526, 5532938, '0002', 'Design Fee 2', NULL, NULL, 550.00, 'pending', '2019-07-08', '2019-07-08 13:45:08'),
  (2430533, 5633500, '0002', 'Design Fee 2', NULL, NULL, 375.00, 'pending', '2019-07-08', '2019-07-08 13:46:11'),
  (2430538, 5472327, '0002', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-07-08', '2019-07-08 13:47:50'),
  (2430563, 5823298, '0001', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-07-08', '2019-07-08 13:51:33'),
  (2430565, 5823298, '0002', 'Design Fee 2', NULL, NULL, 375.00, 'pending', '2019-07-08', '2019-07-08 13:51:57'),
  (2430580, 5823310, '0001', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-07-08', '2019-07-08 13:54:26'),
  (2430583, 5823310, '0002', 'Design Fee 2', NULL, NULL, 375.00, 'pending', '2019-07-08', '2019-07-08 13:54:49'),
  (2430588, 5823327, '0001', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-07-08', '2019-07-08 13:55:44'),
  (2430591, 5823327, '0002', 'Design Fee 2', NULL, NULL, 375.00, 'pending', '2019-07-08', '2019-07-08 13:56:14'),
  (2430603, 5823763, '0001', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-07-08', '2019-07-08 14:00:19'),
  (2430607, 5823759, '0001', 'Design Fee 1', NULL, NULL, 550.00, 'pending', '2019-07-08', '2019-07-08 14:01:04'),
  (2430618, 5774125, '0001', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-07-08', '2019-07-08 14:02:59'),
  (2430634, 5798704, '0001', 'Design Fee 1', NULL, NULL, 575.00, 'pending', '2019-07-08', '2019-07-08 14:09:05'),
  (2430639, 5823148, '0001', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-07-08', '2019-07-08 14:09:54'),
  (2430711, 5793824, '0001', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-07-08', '2019-07-08 14:27:13'),
  (2432297, 5687197, '0002', 'Artificial Turf', 'Artificial Turf
 

	Sod cut existing grass.
	Cap all lawn irrigation
	Remove soils down to 3 inches below grade
	Install 2 inch base layer and compact
	Install 1 inch DG layer
	Install Turf.  Simple Turf - Pet Turf -Emerald Green 50 oz. Pile Height 1 1/8” According to previous Sod install = 460 sq. ft. 


COST $4900', NULL, 4900.00, 'pending', '2019-07-09', '2019-07-09 09:35:03'),
  (2432300, 5687197, '0003', 'Gravel Bed', 'Gravel Bed
 

	Install new weed barrier sections
	Install another yard of Del Rio gravel to increase gravel layer', NULL, 900.00, 'pending', '2019-07-09', '2019-07-09 09:35:50'),
  (2432303, 5687197, '0004', 'Planting Lawn', 'Planting/Lawn
 

	Install new Tree Selection: 24” box Ojai Tangerine. Client OK to Substitute Dwarf Myer Lemon. All citrus tree sales are final.
	Amend soil with Palm, Cacti, Citrus Soil before planting citrus.
	Install replacement podocarpus (no charge)
	Install one (1) Rhododendron Azalea Hybrid ‘George Tabor’ one (1) – 15 Gal
	Remove all current Ophiopogon ‘Nigrescens’ (black grass tufts) and replace with ten (10) additional Ophiopogon japonicus (dark green leaves) 
	Transplant one (1) Coprosma repens plant in front of pool equipment planting area (first one in front) to lower turf area in between other Coprosma where there is a gap.
	Install one (1) new Coprosma repens Dwarf in front of pool equipment planting area. Marybeth to match variegated dwarf plant.
	Adjust irrigation
	Add fertilizer for shrubs', NULL, 2050.00, 'pending', '2019-07-09', '2019-07-09 09:36:20'),
  (2432305, 5687197, '0005', 'Lighting', 'Lighting
 

	Install one (1) Vista 5006 Architectural Bronze to behind Wishing Well nearest to back gate.
	Install one (1) – Vista 6223 Black at corner of planting area nearest to Wishing Well.
	Client would like to by-pass current box and will explain further to crew at installation.', NULL, 445.00, 'pending', '2019-07-09', '2019-07-09 09:37:08'),
  (2438240, 2248927, '2112768', 'Gorilla Hair Mulch', 'Gorilla Hair Mulch with Weed Barrier for Front Hill - 2,000 sq. ft.', NULL, 3500.00, 'pending', '2019-07-11', '2019-07-11 10:18:48'),
  (2438369, 2248927, '2112769', 'Standard Mulch', 'Standard Mulch for level planting areas with Weed Barrier 2,520 sq. ft.', NULL, 3780.00, 'pending', '2019-07-11', '2019-07-11 10:54:13'),
  (2438551, 4925382, '0003', 'Additional Planting', 'Planting 
 

	Install 6 Flats of Gazania rigens ‘Kiss Orange Flame’ or other Orange/Yellow Trailing species, 12” spacing to the 54’ x 12’ (648 sq. ft.) area throughout trees but not within 2’ of tree trunk.                                                                                                                          $378

 


	Install 10 – 1 Gal Lavandula x heterophylla intermittent on hillside. As per 7/9 email.                                                                                                                                            $215
	Spread 2” of Mulch on top of existing mulch around Gazania and existing fruit trees. Client currently has fairly fresh, existing mulch so 3” is not necessary. Square footage is 648 sq. ft. however I am basing quantity on 2/3 of regular cost.                                                                                                                                                                                   $445', NULL, 1038.00, 'pending', '2019-07-11', '2019-07-11 11:34:08'),
  (2440549, 5704019, '0001', 'Drain and curb core and 2 small holes in wall', NULL, NULL, 625.00, 'pending', '2019-07-12', '2019-07-12 08:37:24'),
  (2440557, 5704019, '0002', '18 of planter', '18 linear feet 1 course 1 cap planter', NULL, 1525.00, 'pending', '2019-07-12', '2019-07-12 08:38:39'),
  (2440987, 5555986, '0009', 'Additional Stonework', NULL, NULL, 3000.00, 'pending', '2019-07-12', '2019-07-12 10:52:38'),
  (2441009, 5555986, '0010', 'credit for not staining backyard', 'removing staining', NULL, -800.00, 'pending', '2019-07-12', '2019-07-12 10:58:09'),
  (2441243, 2248927, '2112770', 'Planting 80% complete', '1 GAL
			5 GAL
			15 GAL
			24"
			36"
			24" cit
			 
			TOTALS
		
		
			count
			222
			160
			119
			5
			1
			3
			 
			502', NULL, 30000.00, 'pending', '2019-07-12', '2019-07-12 12:05:09'),
  (2441245, 2248927, '2112771', 'Planting 100% complete', NULL, NULL, 8333.00, 'pending', '2019-07-12', '2019-07-12 12:05:51'),
  (2444707, 5468793, '0009', 'Cover lids', 'install (2) pour a lids , includes stamped concrete, and removal of concrete installed', 'owner approved by text to george', 350.00, 'pending', '2019-07-15', '2019-07-15 16:05:40'),
  (2445921, 5308874, '0005', 'Credits for demo, fence, cables and lighting', '.  The $1,250 difference consists of demo adjustments (client completed demo items;  removed iron fence, $250, buried cables in yard, $100) and lighting adjustments of $900', NULL, -1250.00, 'pending', '2019-07-16', '2019-07-16 09:19:42'),
  (2446388, 4312960, '2128691', '(1) additional Cap lights', '(1) Vista 4260mm-ss led wall lights  (brushed finish)', 'when ordering per Vista lighting Tony
“-SP” for special. In the notes it will need to say something to the extent of “Stainless Steel Shiny Brush Finish” adding “see Tony C” would help as well.
Tony C', 236.00, 'sold', '2019-07-16', '2019-07-16 11:28:03'),
  (2448724, 4312960, '2128692', 'Replace Caps damaged by Other Contractors', 'Replace (2) Bellecrete caps damaged by other contractors working on project
includes
(2) caps
Demo
Installation and mortar
grouting', 'need to order (2)  - 12" caps
we have a 8" cap onsite', 400.00, 'sold', '2019-07-17', '2019-07-17 08:59:28'),
  (2448741, 4312960, '2128693', 'Gas Line for Patio Cover', 'install (2) gas lines for patio cover approx 30ft,
run to top and cap for future heaters
Exchange BBQ covers for more flat  "non BELL"  or branded covers available from home depot or other suppliers
Move or replace  (2) 15 gallon red trailing bougainvillea on hillside, install (1) additional

This is a trade/no charge
this is in exchange for not doing the 4 electrical runs and outlets done by Rafi''s patio cover contractor,.', NULL, 0, 'sold', '2019-07-17', '2019-07-17 09:05:17'),
  (2449282, 5119662, '0001', 'Design Fee', NULL, NULL, 1600.00, 'pending', '2019-07-17', '2019-07-17 11:28:02'),
  (2450376, 5049684, '0014', 'Upgrade to 16'' board''s', NULL, NULL, 5000.00, 'pending', '2019-07-17', '2019-07-17 16:19:15'),
  (2451861, 4809254, '0005', 'Wall stucco', 'Yes, please proceed.

 

On Tue, Jul 16, 2019 at 8:16 AM David Bender david@picturebuild.com> wrote:

Hi Emily

The guys measured the wall and says it is 33 sqft x $11.75 = $387

Includes scratch coat and stucco color coat. No painting included.

Please let us know with an approval to this email.', NULL, 387.00, 'pending', '2019-07-18', '2019-07-18 11:06:38'),
  (2452112, 5468793, '0010', '(CREDIT) staining', NULL, NULL, -3230.00, 'pending', '2019-07-18', '2019-07-18 12:06:28'),
  (2453188, 4312960, '2128694', 'Install (3) owner provided Trees', 'Install (3) 24" box trees on hillside @ $165ea

no  warranty on owner provided shrubs/trees', NULL, 495.00, 'sold', '2019-07-19', '2019-07-19 01:18:43'),
  (2453945, 5883827, '0001', 'Design Fee 1', NULL, NULL, 1000.00, 'pending', '2019-07-19', '2019-07-19 09:02:56'),
  (2454024, 5093944, '0004', 'Permits and Engineering', NULL, NULL, 1693.15, 'pending', '2019-07-19', '2019-07-19 09:28:01'),
  (2454042, 5093944, '0006', 'Permits Engineering Work', NULL, 'this includes 6 hours of time spent meeting with romb engineering, drawing, site plan, working with pool engineering, drawing hoa and fuel mod plans', 300.00, 'pending', '2019-07-19', '2019-07-19 09:32:34'),
  (2455297, 5512086, '0003', 'Roundup Alternative  Natria', 'Owner approves of the use of Natria Weed Killer applied 10 days prior to start of work. 
owner understands this is a pilot program to switching to a more organic solution to weeds and understands that if weeds/grass are not fully eradicated by Natria that  Roundup may still be used as a final spot alternative . there is no warranty to the effectiveness of weed killers 

https://www.natria.com/products/grass-weed-killer-products

No Additional Charge', NULL, 0, 'sold', '2019-07-20', '2019-07-20 11:10:19'),
  (2455300, 5512086, '0004', 'HOA Approval', 'Owner Declines HOA approval and that Picture Build will not be held responsible for any additional labor /material costs associated with Delay or changes that may occur

Customer agrees that HOA approval is responsibility of the Owner', NULL, 0, 'sold', '2019-07-20', '2019-07-20 11:14:33'),
  (2455354, 4312960, '2128695', 'Planting Plan', 'Please view the attached plan and approve
Substitutions may be made by Ryan', 'Sean
please order 1-additional bougainvillea red trailing 15 gallon to install on hillside ..see previous gas line work order as it was a trade for electrical work', 0, 'sold', '2019-07-20', '2019-07-20 18:10:32'),
  (2457474, 2248927, '2112772', 'Design Fee 1', NULL, NULL, 850.00, 'pending', '2019-07-22', '2019-07-22 12:41:24'),
  (2459894, 2248927, '2112773', 'Frontt Porch Tile Work', 'Front Landing Tile Work:

Demo existing.
Level pad
Install 80 sq feet of tile (customer provided)
Grout tile

Steps included in original contract

80 sq feet @$33 per sq foot.
Customer provided tile minus $5.00 per sq foot
Total 80 sq feet @$28 per sq foot

$2240', NULL, 1900.00, 'pending', '2019-07-23', '2019-07-23 10:35:09'),
  (2461135, 5555986, '0011', 'Additional Planting', 'Change Order for the Differential Total from original contract Planting Allowance for both Front and Rear property areas 

1 - 30” Box Australian Willow for Back @ $630
1- 24” Box Magnolia ‘Little Gem’ @$385
1 - 24” Box Swan Hill Olive - @$630
6 - 15 Gal - Pittosperum ‘Silver Sheen’@$150ea  = $900
53 - 5 Gal - Various -@$40ea (Front and Back) = $2120
189 - 1 Gal - Various - @$20ea (Front and Back) $3780', NULL, 1050.00, 'sold', '2019-07-23', '2019-07-23 16:24:31'),
  (2462846, 5793854, '0001', 'ADditional Pavers on side of house', '162 Square Feet', NULL, 1944.00, 'pending', '2019-07-24', '2019-07-24 11:29:20'),
  (2462852, 3165059, '1945715', 'C/O', NULL, NULL, 250.00, 'pending', '2019-07-24', '2019-07-24 11:31:02'),
  (2462854, 5793854, '0002', 'drainage 71 lf  and 6 caps', NULL, NULL, 1562.00, 'pending', '2019-07-24', '2019-07-24 11:31:35'),
  (2462861, 5793854, '0003', '5 LF of wall 18" high', '5 LF of 18" high wall', NULL, 480.00, 'pending', '2019-07-24', '2019-07-24 11:33:53'),
  (2462928, 5793854, '0004', 'Bender board', '31 Linear Feet of Bender Board', NULL, 248.00, 'pending', '2019-07-24', '2019-07-24 11:56:22'),
  (2464762, 5823759, '0002', 'Deck with Cover Engineering', 'Deck With patio cover Engineering

$2000 Engineering + design engineer technician time  at the rate of $120hr

not to exceed  without customer approval

$4000 allowance', NULL, 0, 'sold', '2019-07-25', '2019-07-25 07:56:37'),
  (2465183, 5704028, '0001', 'Relocating 1 beam and 2 post', NULL, NULL, 2720.00, 'pending', '2019-07-25', '2019-07-25 09:26:53'),
  (2466127, 5923078, '0001', 'Design Fee 1', NULL, NULL, 600.00, 'pending', '2019-07-25', '2019-07-25 13:14:20'),
  (2466149, 5823759, '0003', 'Design Fee 2', NULL, NULL, 550.00, 'pending', '2019-07-25', '2019-07-25 13:21:04'),
  (2466153, 5494650, '0002', 'Design Fee 2', NULL, NULL, 550.00, 'pending', '2019-07-25', '2019-07-25 13:21:35'),
  (2467339, 5468767, '0001', 'Replace broken valve', NULL, NULL, 120.00, 'pending', '2019-07-26', '2019-07-26 07:43:09'),
  (2467978, 5633890, '0002', '120 LF. Main line including reconnecting 2 new val', NULL, NULL, 4000.00, 'pending', '2019-07-26', '2019-07-26 11:03:47'),
  (2468278, 5823327, '0003', 'Remove tree stump $200', NULL, NULL, 0, 'pending', '2019-07-26', '2019-07-26 12:40:40'),
  (2468570, 5704028, '0002', 'Additional 160 LF. Drainage', NULL, NULL, 3200.00, 'pending', '2019-07-26', '2019-07-26 14:28:01'),
  (2470133, 4312960, '2128696', 'Additional Plants', 'Additional Plants Needed   / see attached plan , additional plants in RED

	
		
			symbol
			Name
			Size
			Count
		
		
			BG
			Agave “Blue Glow”
			15
			3
		
		
			AV
			Agave Americana varigata “butterfingers”
			15
			1
		
		
			AF
			Aloe Ferox “Cape Aloe”
			15
			6
		
		
			 
			 
			 
			 
		
		
			KP
			Anigozanthos “Big Red”  tallest variety red
			5
			2
		
		
			ND
			Nandina “Domestica”
			5
			2
		
		
			 
			 
			 
			 
		
		
			CB
			Dianella “Casa Blue”
			1
			3
		
		
			SM
			Senecio Mandraliscae
			1
			9
		
		
			BF
			Bulbine frutescens (caulescens)
			1
			4
		
	


Additional Planting cost $1980

Credit - for installing ''Tape lights" on BBQ, owner to install   -$490

Total Change Order $1490', 'see notes on plan in RED', 1490.00, 'sold', '2019-07-29', '2019-07-29 08:59:47'),
  (2470641, 5493354, '0003', 'Additional Planting', 'Per owner request to add planting per "Fuel mod'' with plant types changed 

(3) trees from 15Gal to 24" Box ADD/Upgrade $230ea   +$690
(40) 5Gal Shrubs         @     $40ea   +$1600
(67) 1Gal Plants           @    $20ea   +1340
(3) flats verbena 4"      @     $75ea   +$225

Total additional $3705

see attached planting plan

Step lights will be  "Weather iron" gray, see attached picture', NULL, 3705.00, 'sold', '2019-07-29', '2019-07-29 11:10:07'),
  (2473289, 4312960, '2128697', '(SEE 999) Pebble Upgrade', 'Upgrade stone around from Del Rio to "Jelly Bean" pebble 1"

Credit $2.52LF 116lf bend-a-board material = -$292
installed 150lf  owner provided aluminum board material an additional 34ft installed @ the rate of $5.48ftx34ft=+$186

Pebble Upgrade $1664
Bender Credit $106

Total cost $1558', 'need 3 yards', 0, 'pending', '2019-07-30', '2019-07-30 11:00:32'),
  (2473572, 5793854, '0005', 'Block and install for sink form', 'Block to build form for sink.', NULL, 1190.00, 'pending', '2019-07-30', '2019-07-30 12:03:04'),
  (2473925, 5687197, '0007', 'New Transformer', NULL, NULL, 450.00, 'pending', '2019-07-30', '2019-07-30 13:23:35'),
  (2476486, 5512086, '0005', 'Flagstone Path Spacing to 2"', 'by Owner Request
move Arizona Flagstone steping stones from 4-6" spacing to 2" spacing in between
Additional stone and installation required', NULL, 680.00, 'sold', '2019-07-31', '2019-07-31 12:34:56'),
  (2477206, 5823763, '0002', 'Design Fee 2', NULL, NULL, 375.00, 'pending', '2019-07-31', '2019-07-31 16:11:48'),
  (2479644, 5468767, '0002', '43 LF of soldier course', NULL, NULL, 645.00, 'pending', '2019-08-01', '2019-08-01 13:46:58'),
  (2480347, 5793854, '0006', 'Gopher mesh for under grass RTF', NULL, NULL, 824.00, 'pending', '2019-08-01', '2019-08-01 22:35:25'),
  (2482619, 5704028, '0003', 'Concrete pad for diving board with bonding wire', NULL, NULL, 700.00, 'pending', '2019-08-03', '2019-08-03 10:48:32'),
  (2484547, 5883827, '0002', 'Design Fee 2', NULL, NULL, 1000.00, 'pending', '2019-08-05', '2019-08-05 12:02:17'),
  (2485007, 5686048, '0002', 'Pea Gravel', 'Adding pea gravel area already demoed and fabric $535.00', NULL, 535.00, 'pending', '2019-08-05', '2019-08-05 14:05:50'),
  (2489876, 5547166, '0002', 'Initial Const Waste Clean Up', NULL, NULL, 600.00, 'pending', '2019-08-07', '2019-08-07 11:15:25'),
  (2492329, 4312960, '2128698', 'Additional:Mexican Pebble, Jellybean & Mulch', '(1) additional yard of Jellybean pebble
(1) additional yard of Mexican pebble
(1) additional yard of premium redwood much 3/4"', 'order (4) total yards jellybean 5/8-1"  when you order it', 0, 'pending', '2019-08-08', '2019-08-08 09:38:45'),
  (2492705, 5823327, '0004', 'New 4  station sprinkler timer installed', NULL, NULL, 458.00, 'sold', '2019-08-08', '2019-08-08 11:03:19'),
  (2493279, 5974513, '0001', 'Design Fee 1', NULL, NULL, 750.00, 'pending', '2019-08-08', '2019-08-08 13:02:31'),
  (2493647, 5793854, '0007', 'Sink drainage', NULL, NULL, 660.00, 'pending', '2019-08-08', '2019-08-08 14:26:44'),
  (2493699, 3124950, '0001', 'Initial Project Changes', '1.Remove Demo and Planting sections of plan that are not Client property: All of Lower Level and ½ of Slope. 
Add demo of trees and shrubs on backyard West wall. 

2. Install additional 160 sq. ft of Pavers, backyard ground level.
Remove existing concrete with embedded stone currently in this area.  

3. Additional Lights added:
Note: All Path and Uplights will be Architectural Bronze (no upcharge for color)
Add 8 Vista LED # 6540 Arch. Bronze Path Lights
Add 3 Vista LED # 4246 Black Step Lights 

4. Adjusted Plant totals as follows:
Install  (14) 15 Gallon Standard trees
Install (34) 5 Gallon Plants
Install (62) I gallon plants
Install (2) Flats

5. Remove Gravel component from Addendum.

Additional Job Start Notes:
Save Agaves in Backyard. Some will be repositioned and others remain per client request.
Revisit whether client wants the Ficus pumila -Fig Vine- removed from front wall.', NULL, 5205.00, 'sold', '2019-08-08', '2019-08-08 14:39:45'),
  (2494829, 5686048, '0003', 'Reroute Electrical', NULL, NULL, 200.00, 'pending', '2019-08-09', '2019-08-09 08:51:13'),
  (2494837, 5686048, '0004', 'Cover and waterproof hole under door see image', NULL, NULL, 350.00, 'pending', '2019-08-09', '2019-08-09 08:52:57'),
  (2495811, 2248927, '2112774', '80 LF. Adding drainage for guest house down hill', NULL, NULL, 2000.00, 'pending', '2019-08-09', '2019-08-09 14:54:22'),
  (2495904, 5512086, '0007', 'Add Del Rio Stones and garbage can area', '1/2-3/4  

1/2" yard Del rio stones near rear slider door

Add 3x3 garbage can area at side yard near rear garage door', NULL, 280.00, 'sold', '2019-08-09', '2019-08-09 15:52:22'),
  (2495973, 5512086, '0008', 'Planting Plan (credit)', 'Planting
1-24" Box  @360ea
8-15 Gal @150ea
13-5Gal @40ea
27-1Gal @20ea
1-flat Lantana @$75
Total $2620
Allowance $5360
Credit -$2740

Additional design or plant request at the rate of $120hr

Plant returns at the rate of 20% restocking fee after delivery if owner does not approve of variety + $120hr design and delivery fee', NULL, -2740.00, 'sold', '2019-08-09', '2019-08-09 17:11:37'),
  (2496019, 5793854, '0008', 'Gorilla Hair mulch 700 SF', 'Gorilla hair mulch on hill side', NULL, 1050.00, 'pending', '2019-08-09', '2019-08-09 19:57:35'),
  (2496174, 5985276, '0001', 'No mulch', NULL, NULL, 0, 'pending', '2019-08-10', '2019-08-10 10:38:33'),
  (2496226, 3124950, '0002', 'Design down and final', NULL, NULL, 700.00, 'pending', '2019-08-10', '2019-08-10 12:40:04'),
  (2499096, 5622742, '0002', 'Engineering', NULL, NULL, 800.00, 'pending', '2019-08-12', '2019-08-12 16:14:38'),
  (2499097, 5622742, '0003', 'City Engineering', NULL, NULL, 129.00, 'pending', '2019-08-12', '2019-08-12 16:14:59'),
  (2499099, 5622742, '0004', 'Submittal', NULL, NULL, 328.42, 'pending', '2019-08-12', '2019-08-12 16:15:29'),
  (2499104, 5622742, '0005', 'Grading Permit', NULL, NULL, 83.82, 'pending', '2019-08-12', '2019-08-12 16:16:31'),
  (2499107, 5622742, '0006', 'Permit', NULL, NULL, 462.02, 'pending', '2019-08-12', '2019-08-12 16:17:14'),
  (2499206, 5835014, '0001', '60 Lf.  Main line', NULL, NULL, 900.00, 'pending', '2019-08-12', '2019-08-12 17:30:55'),
  (2500738, 5686048, '0005', '77 more sf pavers', NULL, NULL, 924.00, 'pending', '2019-08-13', '2019-08-13 10:48:13'),
  (2501047, 5493354, '0005', 'Holland herringbone pattern  - selection', 'FILL - blended gray charcoal Holland pavers herringbone pattern 90 degree from house 

BORDER - Charcoal

see attached picture by owner for reference 

no additional charge', NULL, 0, 'sold', '2019-08-13', '2019-08-13 12:01:04'),
  (2501049, 5985276, '0002', 'Excavate and haul dirt', 'Haul away and or grade soil to have been removed by owner.  Dispose of two (2) concrete stoops $1200Remove mulch from contract -$700Total change  +$500', NULL, 500.00, 'sold', '2019-08-13', '2019-08-13 12:01:54'),
  (2501376, 5704028, '0004', 'Additional valve', NULL, NULL, 500.00, 'pending', '2019-08-13', '2019-08-13 13:19:58'),
  (2502193, 5704028, '0005', 'Design agreement for planting.', 'Plant design.', NULL, 350.00, 'pending', '2019-08-13', '2019-08-13 21:34:57'),
  (2503144, 5547166, '0003', 'Splice low voltage wire and wire to garage', NULL, NULL, 350.00, 'pending', '2019-08-14', '2019-08-14 09:08:31'),
  (2504056, 5793854, '0009', 'Credit for plants see images', NULL, NULL, -359.00, 'pending', '2019-08-14', '2019-08-14 12:57:16'),
  (2505345, 5835014, '0002', '84 less SF of pavers', NULL, NULL, -1008.00, 'pending', '2019-08-15', '2019-08-15 07:04:41'),
  (2505368, 5948253, '0001', 'Paver upgrade to burnish finish', 'Paver is Orco Holland in Manor, with a burnish finish 775 sf', NULL, 1464.00, 'pending', '2019-08-15', '2019-08-15 07:11:03'),
  (2505463, 5948253, '0002', 'Design fee for 2 planters', NULL, 'This is one (1) 350 sq ft. 45 degree angle hillside. MB', 200.00, 'pending', '2019-08-15', '2019-08-15 07:39:58'),
  (2509679, 5285676, '0014', 'Additional 3-rail fencing  +30t', 'Contracted 3-rail fencing 1105ft
After onsite measurements actual length is 1135ft

add 30ft 3-rail', NULL, 702.00, 'sold', '2019-08-17', '2019-08-17 15:02:15'),
  (2510095, 5498674, '0002', '7 Feet Concrete Block Wall for gate', 'The block wall is to install a 4'' gate in the middle.6'' high.
Priced at $235.00 a Linear Foot
Masonry crew to give Saen the order for block to match existing back wall', NULL, 1645.00, 'pending', '2019-08-18', '2019-08-18 21:22:38'),
  (2512513, 5835014, '0003', 'Mulch', NULL, NULL, 234.00, 'pending', '2019-08-19', '2019-08-19 16:50:00'),
  (2518006, 5049684, '0015', 'Fountain Change plus added plants', 'Fountain order $1085 with tax
Delivery $350

Material allowance in contract was $600

Difference of $735

Added planting for driveway. 

$250', NULL, 985.00, 'pending', '2019-08-21', '2019-08-21 14:31:09'),
  (2519515, 5493354, '0006', 'Side Yard Mulch', 'Add 500Sqft mulch to side yard, no weed barrier', NULL, 500.00, 'sold', '2019-08-22', '2019-08-22 08:47:12'),
  (2519896, 5547166, '0004', 'Material Upgrade', 'This is for the change order for the wall and step material upgrade.', NULL, 4600.00, 'pending', '2019-08-22', '2019-08-22 10:14:45'),
  (2520513, 5704019, '0003', 'Design planting plan', NULL, NULL, 300.00, 'pending', '2019-08-22', '2019-08-22 12:45:57'),
  (2520619, 5493354, '0007', 'Main line to Rear W/ Garden hose connection', 'up to 60ft 1" sch 40 pvc main line to rear
(1) 3/4" garden valve for your hose
install left of bbq pad

this is recommended by our irrigation crew , so that the lawn irrigation works and flows better', NULL, 700.00, 'pending', '2019-08-22', '2019-08-22 13:12:52'),
  (2520840, 5916807, '0001', 'One new irrigation zone and 1 valve', '$900.00 for drip with valve  and $200.00 for valve', NULL, 1100.00, 'pending', '2019-08-22', '2019-08-22 14:13:01'),
  (2520989, 5916807, '0002', 'Possible c/o cost', 'This covers everything that we have discussed so far in irrigation. 
The new zone:
It includes all of the emitters and placing them in your plant zone. 
Includes the needed main line
Includes a new plastic valve for your existing. 
 
If you need additional zones or work then that would be an added conversation. But from what I''m told this is all that has been planned. 
I do not have an estimate yet for the weep screed. 
I will follow up. 
Please confirm for the irrigation.', NULL, 1155.00, 'pending', '2019-08-22', '2019-08-22 15:14:23'),
  (2521913, 5884691, '0001', 'Seal pavers', NULL, NULL, 1950.00, 'pending', '2019-08-23', '2019-08-23 07:43:19'),
  (2522317, 5493354, '0008', 'Additional Pavers Per Design Layout change', 'additional 200sqft pavers

this additional pavers is required because the patio was extended out', NULL, 2000.00, 'pending', '2019-08-23', '2019-08-23 10:04:00'),
  (2522454, 3124950, '0003', 'Hardscape expansion', '1) Expand decking and add paver step landings. Increase over last chance order is 242 sq feet. Roughly 650 sq feet in total. Need to also bring in and compact 8 additional tons of base to take out hillside grade.   $3630 for added paver and $1200 for base and compaction

2) Add 35 linear feet of paver step $1750


3) Remove 62 linear feet of landscape tie step ($1950)

4) Remove 34 linear feet of landscape tie wall ($2800)

5) Expand wall add wall for step transition.
65 on feet add on.  $6450.

6) Remove roughly 20 5 gallons from contact ($800)

7) Change wood bench to paver seat wall. No charge.



For the Order.
The Rustic wall amount is 24 inches @140 linear feet. Top row figure as soldier course and not running bond for seating
Then Rustic all soldier course for all step treads this is 63 linear feet of step.

650 sq feet of paver.  Same paver for border

We will probably also have another change order with step lights.', NULL, 7400.00, 'sold', '2019-08-23', '2019-08-23 10:47:52'),
  (2524584, 4312960, '2128699', 'Irrigation Zone and move sprinklers', 'install (1) 3/4 drip valve @ existing valves on hillside. install drip tubing and (3) 2gph emitters each tree planted..(3) maples and (1) palo verde

move  existing sprinklers and add about (2)  rotor sprinklers due the fence installation so proper coverage of hillside is obtained', NULL, 0, 'pending', '2019-08-26', '2019-08-26 07:47:39'),
  (2524595, 4312960, '2128700', '(SEE 999) Patio Cover Base Stonework', 'on (2) columns base 
using onsite stone and wall cap , fabricate and install stone along base, install bellecrete cap cut and fit gap between post and step gap..grout all joints', NULL, 0, 'pending', '2019-08-26', '2019-08-26 07:50:20'),
  (2525525, 5835014, '0004', 'Additional Sod', '344 additional square feet of sod', NULL, 1204.00, 'pending', '2019-08-26', '2019-08-26 11:36:24'),
  (2526416, 5547166, '0005', 'Additional Lights', '7 Additional Vista Lights
(3 for backyard stairs, 4 for front porch steps, 1 for Utility stairs)', NULL, 1480.00, 'sold', '2019-08-26', '2019-08-26 15:00:24'),
  (2526455, 5498674, '0003', 'Additional Lights', '6 additional Vista Lights at $225 each', NULL, 1350.00, 'sold', '2019-08-26', '2019-08-26 15:13:09'),
  (2526604, 4487762, '2128778', 'Additional valve', NULL, NULL, 850.00, 'pending', '2019-08-26', '2019-08-26 16:23:31'),
  (2526607, 4487762, '2128779', 'Change out grasses', NULL, NULL, 1000.00, 'pending', '2019-08-26', '2019-08-26 16:24:25'),
  (2526693, 4312960, '2128701', 'Pool Plaster Upgrade', 'Upgrade current selection of pebble  plaster to pebble tec  pebble brilliance "vivid shores"', NULL, 4025.00, 'sold', '2019-08-26', '2019-08-26 17:26:36'),
  (2526700, 4312960, '2128702', 'Concrete Sealing', 'seal all new concrete with natural look sealer, includes all copings', 'approx 2400sqft', 2560.00, 'pending', '2019-08-26', '2019-08-26 17:33:08'),
  (2526717, 4312960, '2128703', 'Fireplace Upgrade', 'Fireplace W/Bench
1. Approx 6x9F
2. Smooth stucco finished
3. 14ft Wide bench  w/bellecrete cap. use stone onsite to finish bench and or buy additional as needed
4. 72" wide fireplace  insert included w/ fireglass (owner to select color)
5. owner declines permits and agrees to take all responsibility meeting city codes and restrictions. 
6. owner agrees picture build will not be responsible for any negative actions arising from any violation of city codes 
7. includes full masonry warranty of 3 years
 - lights additional

includes vichothan around (2) patio cover columns at hillside

Original Contract: Fire/Water Feature         $9467      (in original contract)
Fireplace W/Bench                                       $17,987  (replaces Fire feature)
Difference                                                     $8520', 'DO NOT START TILL WE GET FINAL (FINAL) INSPECTION ON THIS JOB
please build it like the  attached engineering
no inspections required, owner agrees they take full responsibility as we are building within the setback, 
this item will be installed after final inspections', 8520.00, 'sold', '2019-08-26', '2019-08-26 17:52:12'),
  (2527633, 5547166, '0006', 'Additional drive way demo', NULL, NULL, 1100.00, 'pending', '2019-08-27', '2019-08-27 07:59:24'),
  (2528073, 4312960, '2128704', 'Additional Lapaz pebble / No Mulch - no charge', 'use leftover jellybean  at back fence 
will not install 1 yard premium mulch
install 7 additional bags black la paz pebble under pots', NULL, 0, 'sold', '2019-08-27', '2019-08-27 09:39:34'),
  (2531503, 5547166, '0007', 'Porch, Utility Stairs Material', 'ALL MATERIALS APPROVED VERBALLY WITH CLIENT - Need to list Additional Charge of side Melville Stair Walls


Front Porch/Steps and Utility area Landing and Steps Selections: Front Porch: Belgard, Catalina Grana Rio Small Ashlar Pattern Front Steps - Melville Cap - Graphite Utility Steps: Belgard, Melville Wall stacked on either side of stairs. Landing: Belgard, Catalina Grana Rio Small Ashlar Pattern Steps: Melville Cap - Graphite', NULL, 1200.00, 'pending', '2019-08-28', '2019-08-28 12:30:55'),
  (2532177, 5774125, '0002', 'Additional Planting $260', 'plant (4) owner supplied Japanese Maples  @  $90ea  =$360

Plant 15 gallon trees @ $150ea
(1) 15Gal purple leaf plum
(2) Magnolia "little gem"
(2) Crape Myrtle "white multi
(1) Western Redbud "forest pansy" purple lead

6x$150=$900
total  $1260

Original Budget $1000

Additional cost $260

owner agrees to properly water all plants installed by hand
no warranty on plantings without automatic irrigation', NULL, 260.00, 'pending', '2019-08-28', '2019-08-28 15:23:16'),
  (2532179, 5512086, '0009', 'Flagstone Color Selection - No Charge', 'Change Arizona Flagstone color to "Classic Oak Select"', NULL, 0, 'pending', '2019-08-28', '2019-08-28 15:23:27'),
  (2532305, 4312960, '2128705', '(SEE 999) (4) additional Bougainvillea on hillside', '(4) 15 gallon red trailing bougainvillea on hillside @150ea', 'plant where white flags are on hillside', 0, 'pending', '2019-08-28', '2019-08-28 16:33:07'),
  (2534015, 5878403, '0001', 'Additional square feet.', '504 additional sf', NULL, 5267.00, 'pending', '2019-08-29', '2019-08-29 10:55:28'),
  (2534686, 5108066, '0004', 'Replant Plan', 'No charge for plants shown on plan

10 yards Gorilla hair $2500', NULL, 2500.00, 'pending', '2019-08-29', '2019-08-29 13:41:21'),
  (2535269, 5493354, '0009', 'Stake 3 trees', 'Trees to be staked with to loge poles, 2 loge poles per tree with staps', NULL, 260.00, 'pending', '2019-08-29', '2019-08-29 19:30:52'),
  (2536416, 5285676, '0015', '10x14 concrete Pad for patio cover', '10x14 pad for owner provided/installed patio cover

includes forming and steel
gray broom finish', NULL, 0, 'pending', '2019-08-30', '2019-08-30 10:45:45'),
  (2536520, 5145518, '0003', 'Payment Schedule for Original Contract (no charge)', 'Total job $111,375

1. Deposit                                                                 $1000 (paid)
2.Demo/Cleanup                                                      $20.000
3. Rough Underground                                            $10.000
4. Block Wall Excavations    50%                            $10.000
5. Block Wall Excavation    100%                            $5000
6. block Walls Material Delivery                               $5000
7. Block Walls Completed 50%                                $5000
8. Block Walls Completed 100%                               $10.000
9.Stucco work                                                           $4000
10. City Concrete Forming/entry and sidewalk         $5000
11. City Concrete work completed                            $10.000
12. Staircase forming                                                $5000    
13. Staircase completed                                            $5000
14. Planting                                                                $4750
15. Parkway lawn installed                                        $3000
16. Low Voltage Lighting Delivered                            $5000
17. Job completed                                                      $3625
18. permits/Engineering                                       due upon invoice
19. Deputy Inspection costs if required               due upon invoice
20 , all change orders                                         due upon invoice', NULL, 0, 'sold', '2019-08-30', '2019-08-30 11:19:37'),
  (2536698, 5285676, '0016', 'Permits for Shed', 'Fire Flow Test  Sundale                                           $100
County Building Plan Check Fee                             $500.60
Zoning/Planning fee                                                 $535.00

Permit Technician - Ryan                   
drawing, working with engineers,
drive time, multiple meeting with city officials 

16hrs @ $120hr = $1920

Total $3055.60


Los Angeles Fire Dept                            $440.64-Owner Paid
Building Permit Fee                                $743.30 -Owner Paid', NULL, 3055.60, 'pending', '2019-08-30', '2019-08-30 12:23:31'),
  (2537654, 5049684, '0016', 'Client Request', '5 - 1 gal Anigozanthos ''Harmony''
5 - 1 gal Verbena ''Homestead Purple'' or equivalent

Client would like to replace Agapanthus in planter next to front entrance. 
Suggest transplanting Agapanthus to semi-sunny location.', NULL, 200.00, 'pending', '2019-09-01', '2019-09-01 22:23:39'),
  (2537926, 3124950, '0004', 'Light Change Order Due to New Design', 'Adjust Current Light Order to the Following Styles and Quantities due to Design Changes:
*    Current Order Includes Vista – Qty.10 - Path Lights #6540 Architectural Bronze – Cancel three (3).
*    Current Order Includes Vista – Qty.4 - Small Spots #5014i Architectural Bronze – Cancel all four (4).  Change to Qty. 3 -Vista #5006 Architectural Bronze
 *    Current Order Includes Vista – Qty.3 - Step Lights #4246 Black – Cancel all three (3).  Change to Qty. 12 – Vista #4260 Architectural Bronze

Total Additional Lights: 5
Cost: $1,100

Note: Depending on final stair construction we may only need 11 Step Lights. If so, one will be credited back to client.', 'Depending on final stair construction we may only need 11 Step Lights. If so, one will be credited back to client.', 1100.00, 'pending', '2019-09-02', '2019-09-02 10:06:05'),
  (2538093, 5878403, '0002', 'Additional 190 SF Pavers', '190 SF X $10.45', NULL, 1985.00, 'pending', '2019-09-02', '2019-09-02 16:30:00'),
  (2539372, 5547166, '0008', 'Extend driveway 4 feet', NULL, NULL, 160.00, 'pending', '2019-09-03', '2019-09-03 10:20:24'),
  (2539991, 5512086, '0010', '100 feet of drainage', NULL, NULL, 2200.00, 'pending', '2019-09-03', '2019-09-03 12:52:42'),
  (2543371, 3905763, '0002', 'At Labor Cost  plus material change order.', 'Remove 20 linear feet of sand set brick.  Dig trench.  Electrician gotten by owner will be onsite,  lay conduit and then we relay brick paver style.

Said he wants the other paver that was done set in concrete.  Will need about 6 90lb bags of concrete. 

Cost will be determined after work.  Time and materials. 


Will need to add earlier change order cost to this one.', NULL, 0, 'pending', '2019-09-04', '2019-09-04 16:13:57'),
  (2543496, 5916807, '0003', 'Credit for demo $500 credit paid', NULL, NULL, 0, 'pending', '2019-09-04', '2019-09-04 17:27:35'),
  (2545402, 5916807, '0004', 'Timer installation client providing time', NULL, NULL, 165.00, 'pending', '2019-09-05', '2019-09-05 12:23:32'),
  (2546092, 4312960, '2128706', '999 Collective of Change orders', '2128697
			Pebble Upgrade
			$1,558.00
		
	

 


	
		
			2128698
			Additional:Mexican Pebble, Jellybean & Mulch
			$3,689.00
		
	



	
		
			2128699
			Irrigation Zone and move sprinklers
			$650.00
		
	

 


	
		
			2128700
			Patio Cover Base Stonework
			$650.00
		
	

 


	
		
			2128705
			(4) additional Bougainvillea on hillside
			$600.00', NULL, 7147.00, 'pending', '2019-09-05', '2019-09-05 15:32:38'),
  (2547643, 3124950, '0005', 'Planting Plan Update', 'Planting Plan Update', NULL, 0, 'pending', '2019-09-06', '2019-09-06 10:51:35'),
  (2548608, 5533067, '0002', 'Design Fee 2', NULL, NULL, 375.00, 'pending', '2019-09-06', '2019-09-06 18:31:25'),
  (2548612, 2248927, '2112775', 'Planting Credit', 'Planted
			 
			 
			 
			 
			Original C/O
			 
			 
		
		
			SIZE
			QTY
			COST PER
			TOTAL
			 
			SIZE
			QTY
			COST PER
			TOTAL
		
		
			1G
			206
			21.5
			$4,429.00
			 
			1G
			222
			21.5
			$4,773.00
		
		
			5G
			155
			43.5
			$6,742.50
			 
			5G
			160
			43.5
			$6,960.00
		
		
			15G
			114
			175
			$19,950.00
			 
			15G
			119
			175
			$20,825.00
		
		
			24"
			5
			385
			$1,925.00
			 
			24"
			5
			385
			$1,925.00
		
		
			36"
			1
			1375
			$1,375.00
			 
			36"
			1
			1375
			$1,375.00
		
		
			Flats
			4
			63
			$252.00
			 
			Flats
			0
			63
			$0.00
		
		
			24" cit
			2
			825
			$1,650.00
			 
			24" cit
			3
			825
			$2,475.00
		
		
			15" citrus
			1
			200
			$200.00
			 
			 
			 
			 
			 
		
		
			 
			 
			 
			 
			 
			 
			 
			 
			$38,333.00
		
		
			 
			 
			 
			$36,523.50
			 
			 
			 
			 
			 
		
		
			 
			 
			 
			 
			 
			 
			 
			 
			 
		
		
			 
			 
			 
			 
			 
			 
			 
			 
			 
		
		
			Difference
			$1,809.50', NULL, -1809.50, 'pending', '2019-09-06', '2019-09-06 18:55:57'),
  (2548613, 2248927, '2112776', 'Mulch Credit', 'flat
			816
		
		
			 
			270
		
		
			 
			42
		
		
			 
			18
		
		
			 
			18
		
		
			 
			79.6
		
		
			 
			116.6
		
		
			 
			31.5
		
		
			 
			60
		
		
			 
			60
		
		
			 
			38
		
		
			 
			14
		
		
			 
			 
		
		
			Total
			1563.7
		
	



2520sqft estimated - 1563.7sqft actual laid x 1.5 = 1,434.45 refund', NULL, -1434.45, 'pending', '2019-09-06', '2019-09-06 18:56:46'),
  (2550917, 6085856, '0001', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-09-09', '2019-09-09 11:48:03'),
  (2551193, 6016988, '0001', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-09-09', '2019-09-09 12:55:19'),
  (2551500, 3124950, '0006', 'Install metal post for string lights', NULL, NULL, 500.00, 'pending', '2019-09-09', '2019-09-09 14:21:42'),
  (2551503, 3124950, '0007', 'Electrical for post', NULL, NULL, 1340.00, 'pending', '2019-09-09', '2019-09-09 14:22:16'),
  (2551521, 3124950, '0008', 'Additional seat wall', NULL, NULL, 1800.00, 'pending', '2019-09-09', '2019-09-09 14:26:18'),
  (2551682, 3905763, '0003', 'Change order for 8/17/2019', '2 guys one day and material expense', NULL, 1050.00, 'pending', '2019-09-09', '2019-09-09 15:20:49'),
  (2551795, 4809254, '0006', 'Plant and sod replacement', NULL, NULL, 580.00, 'pending', '2019-09-09', '2019-09-09 16:19:01'),
  (2551801, 5512086, '0011', 'Credit for 2 plants 15g to 5g', NULL, NULL, -44.00, 'pending', '2019-09-09', '2019-09-09 16:24:31'),
  (2552091, 5633516, '0004', 'Survey Cost and Technician (3,520.00)', 'Survey Costs $2800
Picture Build Technician costs 6hrs, @ $120hr = $720


Total to be deducted from Deposit $3520', NULL, 0, 'pending', '2019-09-09', '2019-09-09 20:55:40'),
  (2552177, 6085856, '0002', 'New Scope of work 36198', 'this change order supersedes the original scope of work in the original contract. - see attached new scope of work
removes the following items from scope of work
Original contract $90,378
excavation $7280
block retaining walls $24,421
Stonework $6600
Pilasters $3217
Firepit $9611
Concrete Flatwork $7632
Lighting budget $2800
Irrigation work $1700
Planting Budget $3400
Demo/Cleanup $3600
Irrigation Drains $6400
Concrete at patio cover area  $6750
Slup stone block walls $2280
Lawn $7687
Permits and engineering Allowance $3500

New scope of work/change order $36,198 (see attached)
Reduces contract by $54,180

Owner Declines HOA/Permits , owner takes all responsibility for any and all cost associated with permits. owner elects to install block wall without permits

Total $36,198
Payment Schedule
Deposit                            $1000 - paid
Demo/Excavation            $10.000
Block Delivered                $5000
Block Installed                  $8000
Concrete Forming            $6000
Concrete 100%                $5000
All work Complete            $2198', 'this change order supersedes the original scope of work in the original contract.
see attached', 0, 'pending', '2019-09-09', '2019-09-09 22:52:55'),
  (2552196, 6012577, '0001', 'Low Voltage Lighting', 'see attached lighting plan
(5) path lights @ $220ea
(5) up-lights @ $220ea
(1) transformer @480
total $2680

original labor included $1280

Difference $1400', 'see attached lighting plan', 1400.00, 'pending', '2019-09-09', '2019-09-09 23:44:05'),
  (2552206, 6082786, '0001', 'Additional Driveway Pavers', 'install approx 120sqft Additional pavers

includes additional demo and minor irrigation repair

see attached plan', NULL, 1568.00, 'sold', '2019-09-10', '2019-09-10 00:34:10'),
  (2552218, 6150036, '0001', 'Landscape Design 3D  - payment #1 of 2', 'Design rear yard in 3d
Conceptual Design Includes the following features
pool remodel
patio cover
BBq
conceptual plant layout sizes
hardscape design and patio
includes as many edits as necessary  up to 15 hours

does not include hillside design worl

Total design fee is $1400 

1/2 down $700+3% credit card fee =$721
700 due upon completion', NULL, 721.00, 'sold', '2019-09-10', '2019-09-10 01:53:48'),
  (2554180, 6082786, '0002', 'Plan Approval and plant upgrade', 'please approve the attached plan

if you agree, please fill out the attached plan approval form as well and email me a copy asap

Upgrade 3-5gallon to 2-15gallon bougainvillea  $180

Thank you
Ryan', NULL, 180.00, 'sold', '2019-09-10', '2019-09-10 13:58:24'),
  (2556623, 5622742, '0007', 'C/o for pavilion, gas line and electrical', 'Pavilion - (2300) credit
Gas line - 5315
Electrical - 2520', NULL, 5535.00, 'pending', '2019-09-11', '2019-09-11 12:12:01'),
  (2556762, 5948253, '0003', 'Additional Landscaping', 'I zone of irrigation, plants, jute, demo', NULL, 2930.00, 'pending', '2019-09-11', '2019-09-11 12:50:43'),
  (2557308, 6082786, '0003', 'Material choices (no charge)', 'Please approve the following

Paver Choice: Belgard Catalina Grana –Toscana Large (Sizes: 6”x12”x2 3/8” / 9”x12”x2 3/8” / 12’x12’x2 3/8”) ·
Border: Belgard Catalina Grana –Toscana (Size: 6”x9”x2 3/8”) ·
Wall Cap: Belgard Marina Coping 6” – Toscana · Stucco Color: X-16 Silver Gray ·
Standard Crushed Gravel ·
Standard Shredded Brown Bark', NULL, 0, 'sold', '2019-09-11', '2019-09-11 15:26:05'),
  (2557444, 3124950, '0009', 'Revised Planting Plan - RUSH Change', 'Plant Count Differential from Last Design', NULL, 450.00, 'pending', '2019-09-11', '2019-09-11 16:34:23'),
  (2559454, 4809254, '0007', 'Core Curb Per Contract', 'Customer requesting curb core.   Per Contract $450 to do this', NULL, 450.00, 'pending', '2019-09-12', '2019-09-12 12:30:00'),
  (2559752, 6164830, '0001', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-09-12', '2019-09-12 13:49:54'),
  (2559753, 6164830, '0002', 'Design Fee 2', NULL, NULL, 375.00, 'pending', '2019-09-12', '2019-09-12 13:50:03'),
  (2559992, 5878403, '0003', 'Stucco chip credit', 'Chip on stucco stucco guy had to come back and match', NULL, -75.00, 'pending', '2019-09-12', '2019-09-12 15:10:25'),
  (2562309, 6108845, '0001', 'Bender Board/Side gate entry side', 'Install 35ft 1x6 bender board', NULL, 420.00, 'pending', '2019-09-13', '2019-09-13 14:12:58'),
  (2562664, 3124950, '0010', 'Design Update Veg Beds, Plants, Benderbrd Removal', 'Benderboard Removal - 80 Linear Ft. - Credit $640
1 - 15 Gal Ficus benjamina non-variegarted - $175
1 - 7 Gal Ficus benjamina Variegated ''Spearmint'' - Credit $50
2 - Vegetable Beds 6''x3'' Redwood (3 course 6" each) replacing  6x8 tan/green landscape ties - $0
1 - Attached Revised Plan needs Approval', NULL, -515.00, 'sold', '2019-09-14', '2019-09-14 08:00:04'),
  (2564422, 6012577, '0002', 'Irrigation main line', '55ft 1" main line and garden valve', NULL, 1000.00, 'pending', '2019-09-16', '2019-09-16 09:47:50'),
  (2564505, 6012577, '0003', '45 additional sqft pavers', NULL, NULL, 450.00, 'pending', '2019-09-16', '2019-09-16 10:07:22'),
  (2564508, 6012577, '0004', '55ft paver border for lawn', NULL, NULL, 1000.00, 'pending', '2019-09-16', '2019-09-16 10:08:22'),
  (2564579, 5948253, '0004', 'Main water line', NULL, NULL, 1094.00, 'pending', '2019-09-16', '2019-09-16 10:22:47'),
  (2564697, 5948253, '0005', 'Stucco patch (+1,125.00)', NULL, NULL, 0, 'pending', '2019-09-16', '2019-09-16 10:45:47'),
  (2564912, 6012577, '0005', 'Large small pattern for pavers (no charge)', NULL, NULL, 0, 'sold', '2019-09-16', '2019-09-16 11:38:33'),
  (2565873, 5948253, '0007', 'Sod and controller credit (-1,082.00)', '195 SF of sod
using their own controller', NULL, 0, 'pending', '2019-09-16', '2019-09-16 15:55:50'),
  (2567269, 3905763, '0004', 'Add plants, zone, bender board', 'Install (46) 15 gallon Podacarpus Gracilior (column type)              $8050
Install a little more paver and concrete border paver                         $500
Install (1) new zone of irrigation                                                         $850
Install 100 linear feet of bender board                                                $800
Bring out 120 bender board for order

Will need dump truck or trailer for hauling plant demo soils
Will need amendments
Crew to be onsite and verify irrigation order and bender board from Irrigation Express and order that morning. 

Did not need to haul some soils  and amendments                                                      $-400', NULL, 9950.00, 'pending', '2019-09-17', '2019-09-17 09:35:02'),
  (2568248, 6085856, '0003', 'Demo and Excavation', NULL, NULL, 10000.00, 'pending', '2019-09-17', '2019-09-17 13:22:37'),
  (2568251, 6085856, '0004', 'Block Delivery', NULL, NULL, 5000.00, 'pending', '2019-09-17', '2019-09-17 13:22:58'),
  (2568254, 6085856, '0005', 'Block Installed', NULL, NULL, 8000.00, 'pending', '2019-09-17', '2019-09-17 13:23:16'),
  (2568257, 6085856, '0006', 'Concrete Forming', NULL, NULL, 6000.00, 'pending', '2019-09-17', '2019-09-17 13:23:35'),
  (2568259, 6085856, '0007', 'Concrete 100%', NULL, NULL, 5000.00, 'pending', '2019-09-17', '2019-09-17 13:23:55'),
  (2568261, 6085856, '0008', 'All work complete', NULL, NULL, 1198.00, 'pending', '2019-09-17', '2019-09-17 13:24:43'),
  (2568844, 6108845, '0003', 'Lawn Bender Board 1', 'install 135ft 1x4 bender board', NULL, 1080.00, 'pending', '2019-09-17', '2019-09-17 16:24:45'),
  (2569173, 5622742, '0008', 'water line', 'water line 30 linear feet X $20.00= $600.00', NULL, 600.00, 'pending', '2019-09-17', '2019-09-17 22:39:56'),
  (2569197, 6012577, '0006', 'Planting Plan - no charge', 'See attached planting plan and approve', NULL, 0, 'sold', '2019-09-17', '2019-09-17 23:05:19'),
  (2569489, 5622742, '0009', 'Upcharge for 1x6 for top of rafters', 'Top of rafters using 1x6 instead of plywood', NULL, 300.00, 'pending', '2019-09-18', '2019-09-18 06:41:18'),
  (2569917, 3124950, '0011', 'Tree Exchange - Vinca Irrigation', 'Exchanging Umbellaria ca, for Laurus nobilis - $0

Installing 6- pop up heads around Ash tree for Vinca irrigation. - $0', NULL, 0, 'pending', '2019-09-18', '2019-09-18 08:28:37'),
  (2573573, 5704028, '0006', 'Credit for 3 coping and broken tile', NULL, NULL, -500.00, 'pending', '2019-09-19', '2019-09-19 11:54:35'),
  (2573829, 4809254, '0008', 'Credits Due', 'Credit for (4) 5 gal Rosa ''High Society" Climbing

Material only credit
Credit for (5) vista up lights
Credit for (2) vista path lights
Credit for (2) vista up/down lights', NULL, -1164.00, 'pending', '2019-09-19', '2019-09-19 12:51:18'),
  (2574137, 5344445, '0002', 'Drainage Credit (750) APPLIED', NULL, NULL, 0, 'pending', '2019-09-19', '2019-09-19 14:04:18'),
  (2575783, 5512086, '0012', 'Credit, Concrete Resurfacing', NULL, NULL, -467.00, 'pending', '2019-09-20', '2019-09-20 10:34:21'),
  (2576316, 5547166, '0009', 'Paver Sealer on pavers and walls', 'Nano-Seal ghost', NULL, 2000.00, 'pending', '2019-09-20', '2019-09-20 13:14:53'),
  (2576484, 6060085, '0001', 'Design Fee 1', NULL, NULL, 375.00, 'pending', '2019-09-20', '2019-09-20 14:12:39'),
  (2578229, 6190708, '0002', '100ft SDR 35 Pipe', '100ft SDR thick wall pipe to extend drain', NULL, 375.00, 'pending', '2019-09-23', '2019-09-23 09:40:42'),
  (2578808, 5344445, '0003', 'Brass drain grates', NULL, NULL, 598.40, 'pending', '2019-09-23', '2019-09-23 12:02:09'),
  (2579293, 5823148, '0002', 'Design Fee 2', NULL, NULL, 375.00, 'pending', '2019-09-23', '2019-09-23 14:05:46'),
  (2580573, 3124950, '0012', 'Front Yard Planting', 'Front yard Planting
Prep area, weed barrier, 5 -1 Gals, 3-5 Gals, Brown shredded bark mulch, 40 Sq ft.', NULL, 280.00, 'sold', '2019-09-24', '2019-09-24 08:05:28'),
  (2583372, 5285676, '0017', 'Front Driveway Road Base w/plants & Irrigation', 'install 40 yards Class A Base,
from front door to driveway entry , approx  20ft feet beyond front of house property line
grade and compact

$4556

3-24" Box Trees   $1270
12-5Gallon shrubs  $480
12-1 Gallon plants   $240

Mulch shreaded   $1300  

Irrigation/Drip  $1200

Total  $9046', 'see attached quote
includes 2 man days
1 mini excavator and flat pan compactor
truck will do most of spreading, finish grading with mini and compact...
should not take more than a day', 9046.00, 'pending', '2019-09-25', '2019-09-25 07:34:26'),
  (2585188, 5493354, '0010', 'Paver sealing', 'Clean Seal new pavers with water based Natural look sealer

fill joints that are missing sand', NULL, 1268.00, 'sold', '2019-09-25', '2019-09-25 16:18:27'),
  (2586301, 5285676, '0018', 'Front Driveway Road Base w/plants - No Irrigation', 'install 40 yards Class A Base,
from front door to driveway entry , approx  20ft feet beyond front of house property line
grade and compact

$4556

3-24" Box Trees   $1270
12-5Gallon shrubs  $480
12-1 Gallon plants   $240

Mulch shreaded   $1300  

No Irrigation / no warranty on plants

Total  $7846', NULL, 7846.00, 'pending', '2019-09-26', '2019-09-26 08:34:15'),
  (2587985, 6242930, '0001', 'Design Fee 1', NULL, NULL, 750.00, 'pending', '2019-09-26', '2019-09-26 15:40:52'),
  (2588845, 5622742, '0010', 'Pavillion Facade', NULL, NULL, 3556.00, 'pending', '2019-09-27', '2019-09-27 07:25:36'),
  (2589312, 6085856, '0009', 'Block wall and fire pit upgrade', 'Extend block wall 35ft up to 2ft tan slump stone  $4500

Upgrade firepit
Add 8" bellecrete cap
Face sides with high desert stone
$1745', 'Use 10" cap for firepit..not 8"', 6245.00, 'pending', '2019-09-27', '2019-09-27 09:44:54'),
  (2589779, 3124950, '0013', 'Install irrigation in the front', '1) Tap into main line and install new copper connection to ball valve.  Please confirm with Daniel the size of copper needed for main line. 
2) Install new ball valve and cover.
3) Install new superior brass valve.
4) Install battery operated actuator.
5) Install new laterals and drip lines to new plants. 

Note to crew to install plants while there.', NULL, 1150.00, 'pending', '2019-09-27', '2019-09-27 11:36:26'),
  (2591145, 5523763, '0003', 'Plant Replacements', '1 - 5 Gallon, multi Rossettes (if possible) for small direct poolside planting area
6 - 5 Gallon Pittosperum tobira Wheelers Dwarf
11- 1 Gallon Rhaphiolepis indica ''Ballerina''

Crew Notes:  
Backyard planting areas have been flagged with above plants accordingly.
Do NOT remove Rosemary. Only the one dead one. 
Do NOT remove pink Geraniums. Client''s gardener will trim.
DO remove all dead and living Yarrow, Penstemon, Phormium Flax. 
Follow instructions on flags with regard to Agapanthus.
Call MB with questions.
Readjust and check drip line placement accordingly as well as irrigation controller to accommodate change of weather.', 'Please see my Daily Log of 9/28.', 0, 'pending', '2019-09-29', '2019-09-29 20:26:57'),
  (2591692, 5948253, '0008', '1-5gal Abelia', NULL, NULL, 43.50, 'pending', '2019-09-30', '2019-09-30 07:42:31'),
  (2593791, 6012577, '0007', 'Weed fabric on gravel area', NULL, NULL, 160.00, 'pending', '2019-09-30', '2019-09-30 17:40:51'),
  (2596529, 5622742, '0011', 'Additional wall 2 courses', NULL, NULL, 900.00, 'pending', '2019-10-01', '2019-10-01 14:51:43'),
  (2596575, 5344445, '0004', 'Redwood Pergola Upgrade', 'Redwood smooth Pergola $2,140.00
Redwood smooth Trellis $1,051.00
$3,191.00', NULL, 3191.00, 'pending', '2019-10-01', '2019-10-01 15:08:15'),
  (2598875, 3915823, '1779572', '6 Additional Lights', 'Additional lights
 
 

2) LIGHTING

Up lights (in black):

https://www.vistapro.com/product.aspx?catid=3&typeid=1&prodid=5

 

Path Lights (in black):

https://www.vistapro.com/product.aspx?catid=3&typeid=3&prodid=56

 

2a) LOWER YARD LIGHTING ADDITIONS

We’d like to add some additional path/up lights to the lower yard

- 2 up lights: 1) under lemon tree and 2) in hill/shrubs pointing towards trees behind fire pit

- 4 path lights: 1) at beginning of new planting area at the bottom of steps, 2) on the alternate side along steps, 3) at the end of the current BBQ area,  and 4) one closer to the lemon tree (b/t fake grass and flagstone)', NULL, 1350.00, 'pending', '2019-10-02', '2019-10-02 12:35:11'),
  (2599604, 5285676, '0019', 'Shed foundation payment 1/2', NULL, NULL, 7100.00, 'pending', '2019-10-02', '2019-10-02 16:06:48'),
  (2599605, 5285676, '0020', 'Shed foundation payment 2/2', NULL, NULL, 5000.00, 'pending', '2019-10-02', '2019-10-02 16:07:12'),
  (2600743, 2248927, '2112777', 'Footing Credit + Material Coping', '1100 credit
980 material cost for coping', NULL, -120.00, 'pending', '2019-10-03', '2019-10-03 09:10:03'),
  (2600747, 2248927, '2112778', 'Credit for awning', NULL, NULL, -4062.92, 'pending', '2019-10-03', '2019-10-03 09:10:36'),
  (2601936, 3915823, '1779573', 'Meeting with client and engineer', NULL, NULL, 250.00, 'pending', '2019-10-03', '2019-10-03 13:46:36'),
  (2603209, 6178748, '0001', 'Design Fee 1', NULL, NULL, 400.00, 'pending', '2019-10-04', '2019-10-04 08:30:53'),
  (2603212, 6178748, '0002', 'Design Fee 2', NULL, NULL, 400.00, 'pending', '2019-10-04', '2019-10-04 08:31:44'),
  (2604803, 6075593, '0001', 'Design Fee 1', NULL, NULL, 500.00, 'pending', '2019-10-05', '2019-10-05 11:14:34'),
  (2609379, 6311769, '0001', 'Plant Substitution', 'Substituting 2 - Aeonium "Sunburst"  - removing 2 - 5 Gals  Agave attenuata from plant list', NULL, 0, 'pending', '2019-10-08', '2019-10-08 10:48:03'),
  (2609562, 3036021, '1701323', 'Purchase New Tree/Light Warranty', 'One - 15 Gal Meyer Lemon Tree semi-dwarf (special price approved) $150
$65 Light Warranty reinstall Fee', NULL, 215.00, 'pending', '2019-10-08', '2019-10-08 11:28:16'),
  (2610771, 2248927, '2112779', 'Additional Mulch Credit', NULL, NULL, -455.55, 'pending', '2019-10-08', '2019-10-08 18:27:05'),
  (2611808, 5108066, '0005', 'Plant Warranty Install', 'Plant selection approved by Client and Picture Build 10/7:
45 - 1 Gal Trachelospermum jasminoides - Star Jasmine
4 - 1 Gal    Pelargonium x hortorum Red - Common Red Geranium (not trailing)
3 - 5 Gal    Grevillea  fililoba   - Spider Net Grevillea (red)
4 - 5 Gal    Phormium Sundowner  - Sundowner New Zealand Flax
3 - 5 Gal    Leucodendron ''Safari Sunset'' - Safari Conebush
1  - 15 Gal    Prunus laurocerasus - English Laurel
1 -  15 Gal    Phoenix roebillini - Pygmy Date Palm

Repair Leaking Valve

Lift 1 yellowing Chamaerops humilis palm keeping root ball above service. Amend with Palm Soil and Fertilize with Grow More -Palm Food.

Client is requesting Daniel and Fidel''s Crew for install for October 16th.  If not available she is willing to wait for their availability.', NULL, 0, 'pending', '2019-10-09', '2019-10-09 09:11:27'),
  (2612470, 5344445, '0005', 'Top soil for grading', NULL, NULL, 750.00, 'pending', '2019-10-09', '2019-10-09 12:16:39'),
  (2613272, 3905763, '0005', 'Sealing pavers', '1667 sqft', NULL, 2500.50, 'pending', '2019-10-09', '2019-10-09 16:00:32'),
  (2613275, 5433625, '0002', 'Sealing of pavers', 'Approx 1011 sqft of pavers', NULL, 1516.50, 'pending', '2019-10-09', '2019-10-09 16:02:27'),
  (2618318, 6085856, '0010', 'Additional wall- 1 course 20 feet', NULL, NULL, 280.00, 'pending', '2019-10-11', '2019-10-11 15:22:13'),
  (2618319, 6085856, '0011', 'Electrical repair & additional outlet', NULL, NULL, 680.00, 'pending', '2019-10-11', '2019-10-11 15:23:31'),
  (2624046, 6288478, '0001', 'Lower main line 17 feet', NULL, NULL, 600.00, 'pending', '2019-10-15', '2019-10-15 14:05:09'),
  (2624051, 6288478, '0002', 'Stucco', NULL, NULL, 376.00, 'pending', '2019-10-15', '2019-10-15 14:06:08'),
  (2625943, 4296566, '2108876', 'Client Warranty/Plant Purchase Request', '1 - 15 Gal Blue Cedar - Warranty - Order from Green Thumb - Ask for 12'' Height - Send pic

Client will Purchase the following and install himself:
1 - 15 Gal Dodonaea viscosa  ''Purpurea''-  Hop Bush
2 - 5 Gal Texas Ranger - Leucophyllum
6 - 1 Gal Ceanothus Yankee Point

1 Gallons@ $21.50
5 Gallons@ $43.50
15 Gallons@ $175.00', 'Cedar under warranty due to broken valve issue. Clients purchasing all other plants from us and will install himself.', 0, 'pending', '2019-10-16', '2019-10-16 09:56:53'),
  (2627602, 6245051, '0001', 'Add 30sq feet demo & brick install.', NULL, NULL, 1270.00, 'pending', '2019-10-16', '2019-10-16 16:40:54'),
  (2627609, 6245051, '0002', 'Add 7 LF. Mow strip', NULL, NULL, 171.00, 'pending', '2019-10-16', '2019-10-16 16:42:39'),
  (2629129, 5633516, '0005', 'Credit issued to client', NULL, NULL, -1480.00, 'pending', '2019-10-17', '2019-10-17 10:41:50'),
  (2630071, 6304060, '0001', 'Design Fee 1', NULL, NULL, 700.00, 'pending', '2019-10-17', '2019-10-17 14:45:23'),
  (2630072, 6304060, '0002', 'Design Fee 2', NULL, NULL, 700.00, 'pending', '2019-10-17', '2019-10-17 14:45:41'),
  (2630171, 6311769, '0002', 'Additional 2 timers', NULL, NULL, 550.00, 'pending', '2019-10-17', '2019-10-17 15:30:33'),
  (2634156, 6082786, '0004', 'Move irrigation valves', 'Move existing valves on side of house 20ftto planter', NULL, 700.00, 'pending', '2019-10-21', '2019-10-21 09:45:35'),
  (2634283, 5344445, '0006', 'Import 4.5 CuYards of clean soil', NULL, NULL, 810.00, 'pending', '2019-10-21', '2019-10-21 10:21:03'),
  (2635564, 4011993, '1971048', 'Various Requested Items', 'Planting and Related Services
1. (9) 1 gal heuchera “plum pudding” or silver,  - not purple palace or green varietys
2. (2) 1 gal coreopsis grandiflora
3. (1) 5 gal  Arbutilon “Red”
4. (1) 15 gal pomegranate
5. (1) Flat Vinca Major at front hillside
6. Move rose – no warranty
7. Add Drippers to Bougavillea and impatients at front entry
8. Fertilize all plans with Turf Supreme (1 handful per plant and water in)
9. Check Flax for overwatering
10. Trim back plants along north planter
11. provide owner with 1 bad Turf Supreme
12. provide bag of 100 drippers, roll spaghetti tubing, 100 staples.
13. Show Sharon how to install additional dripper
Price $2242

Low Voltage lights
ADD (3) path lights along steps up the hill
Check lights and reposistion as necessary
Price $660

Café lights install
1. Install (2) owner provided poles,          
2. drill and install eye hooks on poles
3. install eye hooks on bldg. where shown
4. excavate approx. 2 feet and install poles with concrete
5. install owner provided café lights
Price $1465

Decomposed Granite
1. Add 1.5yards Decomposed granite
2. install approx. 1” over existing
3. grade and slope towards drains
4. move drain inlet near hillside
5. lower (2) drains in DG and slope for proper drainage
Price $787', NULL, 5154.00, 'pending', '2019-10-21', '2019-10-21 16:03:51'),
  (2636747, 6219569, '0001', 'Additional Pavers', 'NEW DESIGN

PAVERS ADD 265Sqft - New Total  ADD $2120

LAWN -Subtract 233Sqft New Total  -980Sqft
Credit $806

Total $1314', 'we charged $8 a sqft additional pavers here?', 1314.00, 'sold', '2019-10-22', '2019-10-22 08:37:30'),
  (2636839, 6082786, '0005', 'Extend Drain to street', 'extend Drain to sidewalk, 
Remove sidewalk if necessary
core hole  in curb
re-install existing lawn and or make repairs as necessary
install per city standards provided with permit
Does not include compaction testing, deputy inspector or permit cost
$2200 + Permit  Allowance', NULL, 2200.00, 'sold', '2019-10-22', '2019-10-22 09:01:36'),
  (2636845, 6082786, '0006', 'Permit Allowance', 'For curb Coring sidewalk and Rear electrical

Permit Allowance $1500 (up to-not to exceed without further approval)
permit cost include, drawings, permit running, including time at Building dept and permit fees', NULL, 0, 'sold', '2019-10-22', '2019-10-22 09:02:55'),
  (2636982, 6219569, '0002', 'Additional Gas line', 'Gas line ADD 45Ft to Fire-pit 
ADD $1575', NULL, 1574.00, 'pending', '2019-10-22', '2019-10-22 09:34:31'),
  (2637339, 6288478, '0003', 'Additional mulch', NULL, NULL, 340.00, 'pending', '2019-10-22', '2019-10-22 10:52:57'),
  (2637674, 5498674, '0004', 'Tile allowance difference', 'Tile overlay material allowance. 

$22.00 a square foot with a $5.00 budget for tile, over this amount Se Mi pays the difference

136sqft + 209sqft = 345 sqft total in contract 

345 X $5.00 = $1725.00 allowance for tile. 


Actual order total $1,951.22 - $60.55 (grout) = $1890.67 (see attached)

Difference in allowance vs actual = $165.67', NULL, 165.67, 'pending', '2019-10-22', '2019-10-22 12:08:02'),
  (2638576, 6108845, '0004', 'Collection Fees', NULL, NULL, 400.00, 'pending', '2019-10-22', '2019-10-22 15:55:35'),
  (2643577, 6245051, '0003', 'additional demo - changing walkway', NULL, NULL, 1040.00, 'pending', '2019-10-24', '2019-10-24 12:42:26'),
  (2643579, 6245051, '0004', 'additional mow strip 7lnft', NULL, NULL, 171.00, 'pending', '2019-10-24', '2019-10-24 12:43:12'),
  (2644202, 6288478, '0004', 'Planting difference actual', '1 gals - 29 @ 20 = 580
75 5 gals @ 40 = 3000
15 gals @ 175 = 1050
total 4630
benderboard  75ln@ 8 = 600

Total : $5230

Added into addendum : 3000

Difference;
Total : $2230', NULL, 2230.00, 'pending', '2019-10-24', '2019-10-24 17:20:25'),
  (2645941, 6245051, '0005', 'Credit for road base', NULL, NULL, -300.00, 'pending', '2019-10-25', '2019-10-25 13:19:17'),
  (2646069, 5512086, '0013', 'Fire Damages proposal', 'see attached proposal

please double check plants listed against previous installed planting plan

18,705.00', NULL, 0, 'pending', '2019-10-25', '2019-10-25 14:24:00'),
  (2646078, 5512086, '0014', 'New Drain line to Front', 'Trench and install 100ft drain line
replace sprinklers as needed and repair irrigation lines damaged during install

Price $4100', NULL, 4100.00, 'sold', '2019-10-25', '2019-10-25 14:28:40'),
  (2650751, 6288478, '0005', 'C/o Final Plant invoice', NULL, NULL, 675.00, 'pending', '2019-10-29', '2019-10-29 10:49:55'),
  (2651354, 3915823, '1779574', 'Billing of work for 10/23/2019-10/29/2019', 'This includings the following.

3 guys wednesday 
2 guys thursday
2 guys friday
3 guys monday (mason crew)

This does not include materials used on jobsite.', NULL, 5000.00, 'pending', '2019-10-29', '2019-10-29 13:03:10'),
  (2655067, 5622742, '0012', 'Credit for waterbill', NULL, NULL, -200.00, 'pending', '2019-10-30', '2019-10-30 16:51:22'),
  (2656933, 6417472, '0001', '59 Lf. Main line', NULL, NULL, 1298.00, 'pending', '2019-10-31', '2019-10-31 11:54:50'),
  (2657577, 6016988, '0002', '1 additional stepping stone', NULL, NULL, 100.00, 'pending', '2019-10-31', '2019-10-31 14:37:18'),
  (2658631, 5512086, '0015', 'Foundation waterproofing', '40 linear feet
excavate approx 1.5ft from foundation. 2ft deep
approx 5 yards soil removal
install 5 yard crushed gravel
40ft perforated drain line
clean foundation of soil
vertically waterproof foundation', NULL, 4980.00, 'sold', '2019-11-01', '2019-11-01 08:56:59'),
  (2659528, 5449169, '0002', '- Irrigation controller + 2 lights/transformer', 'Using owners irrigation controller  -$400.00
Adding 1 light transformer and 2 lights for the pilasters  + $850.00
Add $450.00', NULL, 450.00, 'pending', '2019-11-01', '2019-11-01 13:02:56'),
  (2659547, 5449169, '0003', 'VArious changes', NULL, NULL, 762.00, 'pending', '2019-11-01', '2019-11-01 13:07:58'),
  (2662939, 5948253, '0009', 'Credit stucco (-300.00)', NULL, NULL, 0, 'pending', '2019-11-04', '2019-11-04 13:31:52'),
  (2662942, 5948253, '0010', '2 drain mods, waterproof, 24lnft drainge (+858.00)', '2 drain modifications @ $65ea
waterproofing $200
24lnft drainage - $528', NULL, 0, 'pending', '2019-11-04', '2019-11-04 13:32:34'),
  (2663610, 5547166, '0010', 'Credit for paint', NULL, NULL, -375.00, 'pending', '2019-11-04', '2019-11-04 18:00:10'),
  (2666492, 3124950, '0014', 'check issued (credit due + car )', 'this is to balance out the account to 0', NULL, 350.00, 'pending', '2019-11-05', '2019-11-05 16:49:54'),
  (2666548, 5948253, '0011', 'TOTAL Change orders due', NULL, NULL, 601.00, 'pending', '2019-11-05', '2019-11-05 17:26:16'),
  (2670102, 6417472, '0002', 'Credit Bench Walls (given to invoice 0004 & 0005)', 'Credit of 2 bench seat walls

-1806', NULL, 0, 'pending', '2019-11-07', '2019-11-07 07:14:50'),
  (2670108, 6417472, '0003', 'Credit 2 pilasters (given on invoice 0014)', 'Taking out 2 pilasters', NULL, 0, 'pending', '2019-11-07', '2019-11-07 07:16:18'),
  (2670119, 6417472, '0004', 'Credit Grass/sod (given on invoice 0012)', '231 Square Feet.
-809.00', NULL, 0, 'pending', '2019-11-07', '2019-11-07 07:18:07'),
  (2670123, 6417472, '0005', 'Additional Pavers', '852 of Additional pavers', NULL, 10224.00, 'pending', '2019-11-07', '2019-11-07 07:19:31'),
  (2670127, 6417472, '0006', '15 linear feet of step build', NULL, NULL, 750.00, 'pending', '2019-11-07', '2019-11-07 07:20:28'),
  (2670242, 6517910, '0001', 'Addendum  - Approval (no charge)', 'see attached scope of work and approve', NULL, 0, 'pending', '2019-11-07', '2019-11-07 08:01:05'),
  (2674068, 5498674, '0005', '450 SF of Del Rio 3/8"', 'Area does not need to be excavated, this is for planters.  Using geotextile fabric  450 SF 2" down', NULL, 2250.00, 'pending', '2019-11-08', '2019-11-08 13:10:14'),
  (2674661, 6517910, '0002', 'Planting Plan approval - no charge', 'see attached plan , please approve/sign to approve', NULL, 0, 'sold', '2019-11-09', '2019-11-09 11:36:31'),
  (2674936, 6517910, '0003', 'Water "garden valve"', 'Add garden valve to bbq area', NULL, 65.00, 'sold', '2019-11-10', '2019-11-10 17:31:55'),
  (2676074, 6265820, '0001', 'Design Approval - no charge', 'please approve of the design attached', NULL, 0, 'sold', '2019-11-11', '2019-11-11 10:10:28'),
  (2676616, 5049684, '0017', 'Lodgepole Installation', 'Need about 18 lodgepole installed. $40 per stake installed.', NULL, 720.00, 'pending', '2019-11-11', '2019-11-11 12:25:41'),
  (2677133, 5498674, '0006', 'Credit for plants', NULL, NULL, -108.00, 'pending', '2019-11-11', '2019-11-11 14:54:25'),
  (2677236, 6119012, '0001', 'Credit for less demo', NULL, NULL, -500.00, 'pending', '2019-11-11', '2019-11-11 15:54:07'),
  (2677246, 6119012, '0002', 'Additional GAS Line 30 LF', 'Additional gas line to start from gas meter 30  LF', NULL, 1050.00, 'pending', '2019-11-11', '2019-11-11 16:01:54'),
  (2677254, 6119012, '0003', 'Electrical Line36 LF', '36 Linear Feet 3 GFIs', NULL, 720.00, 'pending', '2019-11-11', '2019-11-11 16:04:26'),
  (2677260, 6119012, '0004', 'Additional zone of drip line', NULL, NULL, 850.00, 'pending', '2019-11-11', '2019-11-11 16:06:10'),
  (2678668, 3915823, '1779575', 'Additional paver', NULL, NULL, 576.00, 'pending', '2019-11-12', '2019-11-12 09:38:55'),
  (2680415, 3915823, '1779576', 'Billing of work for 11/06-finish', NULL, '3750 - our crew
3600 - eh crew
1949.75 - material', 9299.75, 'pending', '2019-11-12', '2019-11-12 18:19:17'),
  (2680416, 3915823, '1779577', 'Billing of work for 10/30-11/5', NULL, NULL, 4750.00, 'pending', '2019-11-12', '2019-11-12 18:19:59'),
  (2682782, 6517910, '0004', 'bender board edging', 'Add 40ft New bender board edging', NULL, 320.00, 'pending', '2019-11-13', '2019-11-13 14:37:10'),
  (2682789, 6517910, '0005', 'BBQ Extension', 'Add additional 3ft to bbq
$800 per foot', NULL, 2400.00, 'sold', '2019-11-13', '2019-11-13 14:38:51'),
  (2682812, 6517910, '0006', 'Lighting Install', '1. Wire new owner provided lights (22)
2. use owner provided wire and include  up to 500 additional feet 12/2 wire
3. trench bury all wire 4-6'' Depth', NULL, 1564.00, 'sold', '2019-11-13', '2019-11-13 14:43:37'),
  (2682929, 6455206, '0001', 'Added Trees, Planter Boxes, Irrigation', '(1) Large 36" Fruiting Manzanillo  15-18'' tall  - add $2,400 with delivery and installation. 
(2) 24" fruitless olives - add $1,500 with delivery and installation
(2) Raised planters in 100% redwoos - 3''x10''  -add $2400 with veggie ready soils delivery and installation ($1800 without soils)
Change sod to Pacific Medallion plus - add $175

Lighting:

(7) Hinkley Lighting 1530BZ Uplighting Spotlight,

(12) Hinkley Lighting 1531BZ LED Path Light,

(8) 15232 Hinkley Lighting 15232BZ Round Deck Sconce

(1) New transformer

Lighting total, installed with wiring.  $3150', NULL, 9625.00, 'pending', '2019-11-13', '2019-11-13 15:28:00'),
  (2684354, 6119012, '0005', 'Upgrade Paver', 'Upgrade paver to Castle Cobble distressed.', NULL, 1000.00, 'pending', '2019-11-14', '2019-11-14 09:51:07'),
  (2687023, 5449169, '0004', 'PAID IGNORE', 'Irrigation controller + 2 lights/transformer - 450

Various change orders - 762', NULL, 1212.00, 'pending', '2019-11-15', '2019-11-15 09:51:19'),
  (2688387, 5049684, '0018', 'Lodgepole anhcor installation', 'Put in Lodgepoles.', NULL, 420.00, 'pending', '2019-11-17', '2019-11-17 08:29:01'),
  (2689635, 6265820, '0002', 'Irrigation', '(2) zones irrigation $1700
Owner procided sprinkler heads (7)  credit $100
Concrete demo credit $700

$1700
-$700

Total $1000', NULL, 1000.00, 'pending', '2019-11-18', '2019-11-18 09:03:00'),
  (2690083, 6570878, '0001', 'Taking out pavers from contract', 'Maggie found someone else to install the pavers at $8.00 a square foot.  all other work stays the same. I will let her know that the pavers need to go in first, with sleeves.', NULL, -7332.00, 'pending', '2019-11-18', '2019-11-18 11:10:06'),
  (2690410, 5793824, '0002', 'Design Fee 2', NULL, NULL, 375.00, 'pending', '2019-11-18', '2019-11-18 12:26:00'),
  (2690872, 6256219, '0001', 'Permits, Engineering, Plans,', 'Permits and Engineering  $4587

Designs - $800

60 hours Permit and Engineering admin, city counter work @$80/hr - $4800.  Discount given to client ($1800).  Subtotal $3000', NULL, 8387.00, 'pending', '2019-11-18', '2019-11-18 14:29:21'),
  (2692429, 6190708, '0003', '20 linear feet of new block wall.', NULL, NULL, 320.00, 'pending', '2019-11-19', '2019-11-19 09:26:54'),
  (2692510, 6455206, '0002', 'Add 8 more 15 gallon privets', 'Add 8 more privets.', NULL, 1200.00, 'pending', '2019-11-19', '2019-11-19 09:48:23'),
  (2692628, 6561183, '0001', 'Extra demo', NULL, NULL, 1200.00, 'pending', '2019-11-19', '2019-11-19 10:14:16'),
  (2692695, 5433719, '0002', 'Design Fee 2', NULL, NULL, 700.00, 'pending', '2019-11-19', '2019-11-19 10:31:04'),
  (2692704, 5974513, '0002', 'Design Fee 2', NULL, NULL, 750.00, 'pending', '2019-11-19', '2019-11-19 10:33:15'),
  (2693913, 6265820, '0003', 'Drainage to street', 'Trench and install up to 95ft 3" drain pipe to front sidewalk', NULL, 1985.00, 'pending', '2019-11-19', '2019-11-19 15:13:59'),
  (2695515, 6265820, '0005', 'Additional drainage', NULL, NULL, 1985.00, 'pending', '2019-11-20', '2019-11-20 09:49:39'),
  (2697956, 6265820, '0006', 'Irrigation valve', 'Install new 3/4 Irrigation valve', NULL, 85.00, 'pending', '2019-11-21', '2019-11-21 08:23:24'),
  (2700397, 6417472, '0007', 'Additional Pavers on sides of driveway 86 sf', '86 SF X $12.00= $1,032.00', NULL, 1032.00, 'pending', '2019-11-22', '2019-11-22 07:36:42'),
  (2701908, 6219569, '0003', '5ft Fire Pit', 'up to 5ft Square Fire pit, 14" Height
Angelus Rustic Wall and Cap 
Color Gray Charcoal
1" lava rock gravel and 6-8" lava rock', 'includes 10% fire dept discount
no cuts , thinset together

gravel fill, 1" lava rock gravel and 6-8" lava rock', 3060.00, 'sold', '2019-11-22', '2019-11-22 17:31:03'),
  (2703462, 6600883, '0001', '45 LF. Drainage', NULL, NULL, 1000.00, 'pending', '2019-11-25', '2019-11-25 09:15:43'),
  (2704383, 6517910, '0007', '(4) additional Bougainvillea on hillside', 'ADD (4) additional bougainvillea on hillside  $150ea x4 =$600', NULL, 600.00, 'sold', '2019-11-25', '2019-11-25 13:07:08'),
  (2706972, 6600883, '0002', 'Additional drainage', NULL, 'We will be adding drainage to the 45 LF on the first change order. Approved via text message see image', 1945.00, 'pending', '2019-11-26', '2019-11-26 12:47:14'),
  (2710897, 6517910, '0008', 'Rear Grass Repair', 'Install approx 20sqft sod near Bbq

Seed all rear lawns with winter  Rye grass
Finish with seed topper', 'Steer manure', 857.00, 'pending', '2019-11-29', '2019-11-29 07:45:47'),
  (2712809, 6582890, '0001', 'One zone irrigation.', NULL, NULL, 900.00, 'pending', '2019-12-02', '2019-12-02 09:11:53'),
  (2715386, 6417472, '0008', 'Not Adding a control module', 'Using controller in contract.', NULL, 0, 'pending', '2019-12-03', '2019-12-03 07:44:03'),
  (2716308, 6417472, '0009', '2 additional up.lights', NULL, NULL, 400.00, 'pending', '2019-12-03', '2019-12-03 11:15:41'),
  (2716922, 6417472, '0010', 'Grasss/Mulch/Bender board final count', 'Hi Marcie,
Thank you for meeting with me today.  To confirm our discussion on finishing:

Grass:
Amount in contract                                                         1,588 square feet
Credit for pavers taking out some grass                  -231 square feet
taken out in previous change order
Credit for final grass amount                                       -359 square feet
Final count for grass                                                        998 square feet
359 square feet X $3.50                                                 $1,256.00             CREDIT

Mulch:
Mulch in contract                                                             400 square feet
Extra mulch in all planters except the side
                                                                                         + 450 square feet
Total mulch                                                                        850 square feet of mulch
Change order add                                                            450 X $1.50         $675.00  ADD

Bender Board:
Bender Board not put in contract
103 Linear feet X $8.00                                                   $824.00  ADD

TOTAL OF THIS CHANGE ORDER:                                $243.00
Already Approved', NULL, 243.00, 'pending', '2019-12-03', '2019-12-03 13:09:02'),
  (2722557, 6455206, '0003', 'A/C Unit movement PAID ONLINE', NULL, NULL, 1050.00, 'pending', '2019-12-05', '2019-12-05 13:00:35'),
  (2723270, 6678959, '0001', 'Powder coated posts', 'Install 5 powder coated 8ft posts 
not painted', NULL, 875.00, 'pending', '2019-12-05', '2019-12-05 18:41:55'),
  (2723281, 6580546, '0001', 'Tree Upgrade to Citrus', 'Upgrade (1) 24" box tree to CitrusOwner to select type', NULL, 400.00, 'pending', '2019-12-05', '2019-12-05 18:58:30'),
  (2724345, 6219569, '0004', 'Anglia Edger  - Back wall', 'continue anglia edger along back planter  up to 36ft
add approx 8 anglia edgers atop already installed edgers in left corner to cover up exposed soil', NULL, 2160.00, 'pending', '2019-12-06', '2019-12-06 10:00:23'),
  (2724347, 6219569, '0005', 'Anglia Edger  - left side', 'along left fence ..connect with approx 20ft anglia edger', NULL, 1200.00, 'pending', '2019-12-06', '2019-12-06 10:01:09'),
  (2724588, 6219569, '0006', 'Set basketball post foundation', 'Excavate approx 3ft deep
Install concrete
And post anchors', NULL, 650.00, 'pending', '2019-12-06', '2019-12-06 11:11:16'),
  (2724615, 5630790, '0002', 'Design Fee 2', NULL, NULL, 375.00, 'pending', '2019-12-06', '2019-12-06 11:15:51'),
  (2725544, 6119012, '0006', 'Lighting', NULL, '8 lights Vista 5106 textured black
Transformer 150 watts', 1950.00, 'pending', '2019-12-06', '2019-12-06 21:48:23'),
  (2727881, 5622742, '0013', '1/2 intercom system install', NULL, NULL, 1247.50, 'pending', '2019-12-09', '2019-12-09 12:37:58'),
  (2728747, 6669334, '0001', 'Additional Hardscape/Landscape', NULL, NULL, 6059.00, 'pending', '2019-12-09', '2019-12-09 17:25:38'),
  (2728749, 6669334, '0002', 'Permiable Pavers and Drainage', NULL, NULL, 6585.00, 'pending', '2019-12-09', '2019-12-09 17:28:17'),
  (2728776, 6016988, '0004', 'Additional Lights 6', NULL, 'Discount because wiring is already there, and frustration with the steppers not coming
2 uplights  Vista 5006 Black Standard
4 path lights Vista 6216 Black Standard', 1140.00, 'pending', '2019-12-09', '2019-12-09 17:50:49'),
  (2730213, 5145518, '0004', 'Permits and Engineering (1st Allowance $3500)', 'Ladbs 10/1/19 check # 6740      $445.48
Ladbs 12/10/19 check # 6739    $1139.90
Romb Engineering                      $2000.00

Total                                             $3585.38

does not include Permit plan drawing, running, meetings at ladbs, will include on additional allowanced approved by email on 12/10/19', NULL, 3535.38, 'pending', '2019-12-10', '2019-12-10 10:53:50'),
  (2730258, 5145518, '0005', 'Additional Permit Allowance  #2', 'Additional Permit Allowance approved by email $3000 on 12/10/19

to date Permit Running , meeting with Romb Engineering, meeting with LADBS, drawing and plan corrections
at the rate of $120  16hrs x $120hr = $1920
Ladbs downtown parking Fees 3x$30ea  = $90

Allowance remaining  $990', NULL, 2010.00, 'pending', '2019-12-10', '2019-12-10 11:03:52'),
  (2731038, 6016988, '0005', 'Additional electrical', NULL, NULL, 500.00, 'pending', '2019-12-10', '2019-12-10 14:07:36'),
  (2732863, 6669334, '0003', 'Resetting 4 posts', 'Resetting posts. Tino agreed to $300.', NULL, 405.00, 'pending', '2019-12-11', '2019-12-11 11:00:42'),
  (2734166, 6561183, '0002', 'Move gas from pave area', NULL, NULL, 180.00, 'pending', '2019-12-11', '2019-12-11 17:49:45'),
  (2734169, 6561183, '0003', 'Install outlet for transformer and irrigationtimer', NULL, NULL, 200.00, 'pending', '2019-12-11', '2019-12-11 17:52:19'),
  (2734233, 6678959, '0002', 'Additional Pavers', '405sqft pavers included in original contract
650sqft pavers measured needed to complete

245sqft pavers additional $2891', NULL, 2891.00, 'pending', '2019-12-11', '2019-12-11 19:15:07'),
  (2737537, 6715565, '0001', 'Drain and additional Concrete', 'Add 10 feef of 3" drain 
Extend rear slider pad out additional 16" and add 45sqft near spa area', NULL, 1120.00, 'pending', '2019-12-13', '2019-12-13 09:17:36'),
  (2739013, 6731794, '0001', 'Additional planting', '8-5gal. French Lavender 

9-5gal. Rosemary (Tuscan)', NULL, 739.00, 'pending', '2019-12-14', '2019-12-14 11:44:22'),
  (2739014, 6731794, '0002', 'Additional electrical w/outlet', NULL, NULL, 680.00, 'pending', '2019-12-14', '2019-12-14 11:44:53'),
  (2739016, 6731794, '0003', 'Need to credit', 'Need to credit 1-5gal. Legustrum (only be need 4)

planted', NULL, 0, 'pending', '2019-12-14', '2019-12-14 11:46:52'),
  (2739058, 6719222, '0001', 'Home paintconcept', 'With a picture of the front yard
Use similar colors provided owner and apply them to the front of the house for the Hoa', NULL, 700.00, 'pending', '2019-12-14', '2019-12-14 13:22:48'),
  (2740135, 6718711, '0001', 'Add block to existing Wall 50ft', 'Re-using existing wall cap, add 1 row of 8" block to existing wall', NULL, 1560.00, 'pending', '2019-12-16', '2019-12-16 08:33:45'),
  (2740164, 6718711, '0002', 'Electrical Repair and install Sub panel', 'Install 45ft 1" conduit at 18" depth with 8awg Wire for future Charging station in garage, connect into junction box
run back an additional 3/4" conduit from garage for GFI protected electrical outlet
disconnect all romex around backyard prior to digging for safety prior to trenching for safety from potential shock
220v includes small sub panel in garage', '$700 for small sub panel in garage', 2590.00, 'sold', '2019-12-16', '2019-12-16 08:40:04'),
  (2740182, 6718711, '0003', 'Synthetic grass and gravel path', 'install 850sqft  SynLawn    St Augustine 547
excavate approx 3" depth
install 3" compacted base
up to 150ft  bender board
install 150Sqft gravel , re-use owners steppings stones, install bender board

see plan attached', NULL, 10000.00, 'sold', '2019-12-16', '2019-12-16 08:44:01'),
  (2743161, 6669334, '0004', 'Rock bender board rototil soils 6"', NULL, NULL, 398.00, 'pending', '2019-12-17', '2019-12-17 09:37:17'),
  (2746469, 6731794, '0004', 'Adding Palo Verde', NULL, NULL, 385.00, 'pending', '2019-12-18', '2019-12-18 12:17:56'),
  (2746484, 6731794, '0005', 'Additional 10x10 flag stone', 'Gaps to be filled with del rio 3/4"', NULL, 1600.00, 'pending', '2019-12-18', '2019-12-18 12:21:42'),
  (2746647, 6731794, '0006', 'Upgrade Arizona to Red mountain', NULL, NULL, 966.00, 'pending', '2019-12-18', '2019-12-18 12:56:27'),
  (2747363, 6517910, '0009', 'Bbq sealing', 'Mask and seal bbq countertop with water based wet look sealer', NULL, 265.00, 'sold', '2019-12-18', '2019-12-18 17:58:04'),
  (2748521, 6570878, '0002', 'Main line in 3/4"', NULL, NULL, 1760.00, 'pending', '2019-12-19', '2019-12-19 10:07:35'),
  (2748547, 6530692, '0001', 'Updated Scope of Work (changes) subract $294', 'Added 30Sqft Sod   ADD$140
Added Additional lawn
Planting (new plant count based on final design) see attached
(1) Citrus                           $825
(2) 24" Box @ $385ea      $710
(17) 15Gal @ $150ea       $2550
(19)  5Gal  @ $40ea         $760
(46) 1Gal  @ $$20ea        $920
Total $5765.   Original budget $4305.       ADD $1460

Pavers removed from contract -$4550



Old contract price $27,616
New contract price $27,322
Change in contract price -$294', NULL, -294.00, 'sold', '2019-12-19', '2019-12-19 10:12:44'),
  (2749305, 6715565, '0002', '8ft additional drainage', '8ft of 3" drainage', NULL, 176.00, 'pending', '2019-12-19', '2019-12-19 13:14:37'),
  (2749469, 6706322, '0001', '180sqft  pavers "material only"', NULL, NULL, 500.00, 'pending', '2019-12-19', '2019-12-19 13:52:45'),
  (2751123, 6706322, '0002', '15 ft paver step', 'Build paver step set in concrete and mortar', NULL, 850.00, 'pending', '2019-12-20', '2019-12-20 11:25:03'),
  (2751870, 5449169, '0005', 'Pergola Install', 'Install a kit', NULL, 950.00, 'pending', '2019-12-21', '2019-12-21 08:38:57'),
  (2754229, 6796088, '0001', 'Side yard decomposed granite', 'Excavate and install 280sqft decomposed granite 3"thick', NULL, 1800.00, 'pending', '2019-12-24', '2019-12-24 13:47:40'),
  (2754230, 6796088, '0002', '35sqft concrete', NULL, NULL, 480.00, 'pending', '2019-12-24', '2019-12-24 13:52:39'),
  (2754959, 6713355, '0001', 'Electrical for BBQ', NULL, NULL, 1740.00, 'sold', '2019-12-26', '2019-12-26 13:30:32'),
  (2754962, 6713355, '0002', 'Sewer line for BBQ', NULL, NULL, 5400.00, 'sold', '2019-12-26', '2019-12-26 13:31:51'),
  (2754969, 6713355, '0003', 'Water line for sink', NULL, NULL, 328.50, 'sold', '2019-12-26', '2019-12-26 13:35:31'),
  (2754971, 6713355, '0004', 'Gas line', NULL, NULL, 198.00, 'sold', '2019-12-26', '2019-12-26 13:36:17'),
  (2757181, 6219569, '0007', 'Step Pads - set in concrete', 'install (8) 24x24" step pads made from pavers', NULL, 1424.00, 'pending', '2019-12-30', '2019-12-30 10:18:40'),
  (2757269, 6731794, '0007', 'CREDIT Palo Verde', NULL, NULL, -385.00, 'pending', '2019-12-30', '2019-12-30 10:47:54'),
  (2757318, 6796088, '0003', '35sqft concrete -*', NULL, NULL, 480.00, 'pending', '2019-12-30', '2019-12-30 11:00:08'),
  (2757445, 6265820, '0007', 'Turf Upcharge', NULL, NULL, 759.00, 'pending', '2019-12-30', '2019-12-30 11:35:54'),
  (2757647, 6731794, '0008', 'CREDIT preemergent', NULL, NULL, -150.00, 'sold', '2019-12-30', '2019-12-30 12:47:27'),
  (2759130, 6713355, '0005', 'Wall in front.', 'Add wall cap in paver bullnose.', NULL, 2250.00, 'pending', '2019-12-31', '2019-12-31 12:48:56'),
  (2759322, 6669334, '0005', 'Landscaping- see attached doc', NULL, NULL, 2833.00, 'pending', '2019-12-31', '2019-12-31 20:21:53'),
  (2760137, 6678959, '0003', 'Electrical (outlet)', NULL, NULL, 250.00, 'pending', '2020-01-02', '2020-01-02 09:27:20'),
  (2760287, 6715565, '0003', 'Bend a board', NULL, NULL, 328.00, 'pending', '2020-01-02', '2020-01-02 10:05:13'),
  (2760431, 6713355, '0006', 'Waterproof planter wall', NULL, NULL, 300.00, 'pending', '2020-01-02', '2020-01-02 10:43:36'),
  (2760436, 6713355, '0007', 'Drain work', NULL, NULL, 1760.00, 'pending', '2020-01-02', '2020-01-02 10:44:38'),
  (2763064, 6796088, '0004', 'Drain work', NULL, NULL, 660.00, 'pending', '2020-01-03', '2020-01-03 14:27:55'),
  (2763067, 6796088, '0005', 'Added demo', NULL, NULL, 350.00, 'pending', '2020-01-03', '2020-01-03 14:29:43'),
  (2764319, 2248927, '2112780', 'Add Downspout inlet  drain access.', NULL, NULL, 950.00, 'pending', '2020-01-06', '2020-01-06 07:32:29'),
  (2765300, 6713355, '0008', 'Design Credit due', NULL, NULL, -900.00, 'pending', '2020-01-06', '2020-01-06 11:40:06'),
  (2767670, 6678959, '0004', 'Credit for 1 Irrigation Zone', NULL, NULL, -850.00, 'pending', '2020-01-07', '2020-01-07 10:34:55'),
  (2767736, 6706322, '0003', 'Credit for pavers', NULL, NULL, -350.00, 'pending', '2020-01-07', '2020-01-07 10:49:51'),
  (2769885, 6530692, '0002', '(1) Additional light pole with labor', NULL, NULL, 790.00, 'pending', '2020-01-08', '2020-01-08 08:31:54'),
  (2770332, 6669334, '0006', 'Credit - work not completed', NULL, NULL, -320.00, 'pending', '2020-01-08', '2020-01-08 10:27:34'),
  (2774188, 6719222, '0002', '3D Design (Front-Back-hillside)', '3D conceptual design  for the Front Rear and Hillside

- Plants rendered will be as similar as possible to what is available in the rendering program
- Finishes will be as close as possible to actual 
-
- These conceptual 3D renderings are not meant to be used as construction details but conceptually mimic spaces, textures and areas 
-Elevations will reflect similar elevations as onsite
-3D Video on youtube  and personal virtual walkthrough with laptop will be provided 
-not to exceed 20 hours drawing

1st Payment $1000
Remainder due upon completion $1000

Total $2000', 'Ryan will do the 3D design', 2000.00, 'sold', '2020-01-09', '2020-01-09 17:51:44'),
  (2776796, 6719222, '0003', 'owner', 'approve change order', NULL, 0, 'pending', '2020-01-12', '2020-01-12 01:11:55'),
  (2778018, 2248927, '2112781', 'Install new drain line', 'Pick up pavers,  Clean Poly Sand

Install new drain line tap in.   Reinstall pavers.', NULL, 925.00, 'pending', '2020-01-13', '2020-01-13 09:26:12'),
  (2778487, 2409229, '1278941', 'Drains and Water Main', '$400 for added drainage work.
$500 for main line work.', NULL, 900.00, 'pending', '2020-01-13', '2020-01-13 11:12:11'),
  (2778678, 6849642, '0001', 'NEW Vertical Rebar, for wall replacment', 'Drill and Epoxy new rebar at a 45Deg  angle  and epoxy into existing footing and bend so to improve connection
41 linear ft', NULL, 650.00, 'sold', '2020-01-13', '2020-01-13 11:45:25'),
  (2778737, 6849642, '0002', 'Grout Existing Wall -  50ft W/New Cap', 'Remove/Demo  existing block wall cap, $850
Grout  wall solid in all cells not filled $1400
install new 6" cap $1200


Total $3450', NULL, 3450.00, 'pending', '2020-01-13', '2020-01-13 11:58:06'),
  (2778956, 6570878, '0003', 'Additional two-1gal and one 5gal.', NULL, NULL, 86.50, 'pending', '2020-01-13', '2020-01-13 12:51:39'),
  (2782077, 6530692, '0003', '(5) 5-Gallon Ficus Repens Vines', NULL, 'Daniel to place vines', 200.00, 'sold', '2020-01-14', '2020-01-14 13:52:47'),
  (2784074, 6718711, '0004', '200Sqft Additional Synthetic grass', NULL, NULL, 2000.00, 'sold', '2020-01-15', '2020-01-15 10:26:33'),
  (2785577, 6717030, '0001', '150 add sqft pavers (-150 sqft turf)', NULL, NULL, 570.00, 'pending', '2020-01-15', '2020-01-15 17:33:04'),
  (2792569, 6940786, '0001', 'Additional 40 LF. 3" drainage', NULL, NULL, 880.00, 'pending', '2020-01-20', '2020-01-20 11:24:29'),
  (2793652, 6530692, '0004', 'Credit for 1 x 24" @$385', NULL, NULL, -385.00, 'pending', '2020-01-20', '2020-01-20 17:03:45'),
  (2795998, 6417472, '0011', 'Credit for plants (Invoice 0009 and Invoice 0018)', 'Plant allowance of 2000 was used to invoice deposit and final payment. 1000 on each. 

Final plant total was 2570.

Plants were invoiced in full. 1570 and 1000.

A credit of $2000 due. 

Given to invoice 0009 and 0018 for $1000 each', NULL, 0, 'pending', '2020-01-21', '2020-01-21 13:53:37'),
  (2796145, 6849642, '0003', 'Credit (1) 15gal plant', NULL, NULL, -150.00, 'pending', '2020-01-21', '2020-01-21 14:36:40'),
  (2796287, 6940786, '0002', 'Paver upgrade and color choice', 'Upgrade to Montecito color
Use small/large Pattern 
Catalina grana 6x9 border', NULL, 500.00, 'sold', '2020-01-21', '2020-01-21 15:33:35'),
  (2796613, 6962900, '0001', 'Article A "typed"  - no charge approval', 'see attached "Article A" typed
please approve
Thank you', NULL, 0, 'sold', '2020-01-21', '2020-01-21 20:31:43'),
  (2801876, 6785675, '0001', 'Various Change orders see description', 'Additional turf 24 SF X $11= $264.00
Drainage             8 additional LF $160.00
Waterproofing    wall 34 LF $400.00
Demo credit not removing 2 trees --$200.00
Additional flagstone cost    $1.25 SF X 333 SF= $416.00
???????Total $1,040.00', NULL, 1040.00, 'pending', '2020-01-23', '2020-01-23 17:31:08'),
  (2802707, 6713355, '0009', 'Pottery Pads', 'Install (8) new Pottery pads.   Pavers set in concrete.  $1200
Minua
Credit for plant size count and change $500', NULL, 700.00, 'sold', '2020-01-24', '2020-01-24 09:12:01'),
  (2802914, 6713355, '0010', 'Additional outlet', NULL, NULL, 350.00, 'pending', '2020-01-24', '2020-01-24 10:06:42'),
  (2806362, 5472327, '0003', 'Block Wall Footing Change', 'Per contract install 1x3ft footing for 70ft block wall , no keyway equals  (up to  8 yards concrete  and excavation  included)
Per contract install 30ft  garden wall included (2 yards)
10 yards concrete included in contract

Per Permits and Engineering install approx 2ftx7.5ft footing at 70ft  and keyway (approx yards required 38)
Approx 30 additional yards concrete  needed above contracted to be paid by owner at the rate of $124yard which includes pumper fee. 
Approx $3720 +-  paid by owner directly on pour day a the rate of $124yard
Additional  Excavation required for larger footing 30 yards at the rate of $907 paid directly to Excavator
Keyway excavation by hand by picture build at the rate of $250

Paid by Owner
Excavator $907       - paid to excavator
Concrete $3720 approx     - paid to concrete company
Keyway Trench labor $250    - paid to picture build
Total approx $4877', NULL, 250.00, 'sold', '2020-01-27', '2020-01-27 12:14:02'),
  (2810252, 5512086, '0016', 'Fertilize and re-seed trenched area', NULL, NULL, 0, 'pending', '2020-01-28', '2020-01-28 17:04:44'),
  (2810474, 5512086, '0017', 'Rear Yard Deck Drains', '- saw cut concrete 30ft 350
- install 11 feet of Channel drains  495
- 1 deck drain 45
- install 30ft brick  1200
- trench and install 60ft of drain pipe 1320', 'breakdown
saw cut concrete 30ft $350
install 11 feet of Channel drains  $495
1 deck drain $45
install 30ft brick  $1200
trench and install 60ft of drain pipe $1320', 3410.00, 'sold', '2020-01-28', '2020-01-28 23:28:54'),
  (2812603, 6713355, '0011', 'Subbing 6- 5 gal''s. To 15 gal''s.', NULL, NULL, 792.00, 'pending', '2020-01-29', '2020-01-29 13:42:35'),
  (2814237, 6940786, '0003', 'Outdoor irrigation timer', NULL, NULL, 350.00, 'pending', '2020-01-30', '2020-01-30 09:05:07'),
  (2814447, 7035723, '0001', 'Yard Cleanup', 'Remove all shrubs trees  necessary to complete proposed landscaping
 - includes removing rear yard bamboo, front tree, jacaranda tree, and shrubs front and back 
 - cleanup all areas from plant debris. blow rake and trim 
  - haul away all materials
  -  Does not include rock demo

includes up to 3-laborers (2-days, up to 48hrs labor)', NULL, 4320.00, 'sold', '2020-01-30', '2020-01-30 09:59:04'),
  (2814466, 7035723, '0002', 'Rock Excavation - Allowance', 'Jackhammer and remove approx 1 foot rock in rear yard
- Haul away all rock
- re-grade  soil back for lawn area


estimated up to 32hrs labor - (2 laborers for 2 days)  approx  $2080
 - lowboy at the rate of $650ea  - to haul away rock material

Billed at the rate 
Labor  $65hr + Lowboy at the rate of $650ea

Allowance $3000 not to exceed without further approval', NULL, 0, 'sold', '2020-01-30', '2020-01-30 10:05:25'),
  (2816088, 6713355, '0012', 'Mulching', 'Deliver 13 -15 yards of mulch. 
Install in Planter beds.', NULL, 2000.00, 'sold', '2020-01-30', '2020-01-30 22:21:42'),
  (2816596, 6713355, '0013', 'Seal Pavers and Outdoor Kitchen', 'Pressure wash pavers. 
Top off joint sand. 
Apply joint stabilizer and penetrating sealer to all pavers.
Prep outdoor kitchen concrete tops. 
Apply sealer to outdoor kitchen

$2300

Credit for Pottery Pads

-$300

Subtotal $2000', NULL, 2000.00, 'sold', '2020-01-31', '2020-01-31 07:49:54'),
  (2818183, 6940786, '0004', 'Additional paver,replace 3stained pavers and seal', NULL, NULL, 2500.00, 'sold', '2020-01-31', '2020-01-31 15:56:28'),
  (2821517, 6962273, '0001', 'Various changes, see attached doc', NULL, NULL, 0, 'pending', '2020-02-03', '2020-02-03 16:46:38'),
  (2831709, 5472327, '0004', 'Step Lights (9) Vista LED W/Transformer and instal', '$198 each light', NULL, 2232.00, 'sold', '2020-02-07', '2020-02-07 10:05:46'),
  (2832887, 7063556, '0001', 'Additional Pavers on side of house', 'Additional pavers on side of house  238 SF', NULL, 2854.00, 'pending', '2020-02-07', '2020-02-07 18:09:59'),
  (2832897, 6829895, '0001', 'Credit for less concrete', 'using less poured concrete and more pavers', NULL, -1280.00, 'pending', '2020-02-07', '2020-02-07 19:13:23'),
  (2832898, 6829895, '0002', 'Additional walls and pavers, water line', '1)  Garden Wall stucco 11 more additional LF X $175.00 = $1925.00
2)  Water main 12 LF X $20.00= $240.00
3) Side of house in pavers 230 SF X $12.00= $2,760.00
4) Additional courtyard pavers 88 SF X $12.00= $1,056.00
$5,981.00', NULL, 5981.00, 'pending', '2020-02-07', '2020-02-07 19:20:27');

DO $$
DECLARE
  rec RECORD; v_job_id UUID; v_job_client TEXT; v_est_id UUID;
  v_imported INT := 0; v_dup INT := 0; v_no_job INT := 0;
BEGIN
  FOR rec IN SELECT * FROM bt_co_staging LOOP
    IF EXISTS (SELECT 1 FROM bids WHERE bt_change_order_id = rec.bt_co_id) THEN
      v_dup := v_dup + 1; CONTINUE;
    END IF;
    SELECT id, COALESCE(client_name, '') INTO v_job_id, v_job_client
      FROM jobs WHERE bt_job_id = rec.bt_job_id LIMIT 1;
    IF v_job_id IS NULL THEN v_no_job := v_no_job + 1; CONTINUE; END IF;

    INSERT INTO estimates (estimate_name, client_name, status, created_at)
    VALUES (rec.title, v_job_client,
      CASE WHEN rec.status_target = 'sold' THEN 'approved' ELSE 'draft' END,
      COALESCE(rec.created_at, NOW()))
    RETURNING id INTO v_est_id;

    INSERT INTO bids (bt_change_order_id, record_type, linked_job_id, co_name, co_type,
      client_name, bid_amount, gross_profit, gpmd, date_submitted, status,
      estimate_id, notes, projects)
    VALUES (rec.bt_co_id, 'change_order', v_job_id, rec.title, NULL,
      v_job_client, rec.owner_price, 0, 0,
      COALESCE(rec.date_submitted, CURRENT_DATE), rec.status_target,
      v_est_id, COALESCE(NULLIF(rec.notes, ''), rec.description), '{}');

    v_imported := v_imported + 1;
  END LOOP;

  RAISE NOTICE 'Batch 1 of 5 complete — Imported: %, Already-imported: %, No matching job: %',
    v_imported, v_dup, v_no_job;
END $$;

COMMIT;
