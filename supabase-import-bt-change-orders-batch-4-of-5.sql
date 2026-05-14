-- ============================================================
-- BT Change Orders Import — Batch 4 of 5
-- COs in this batch: 1,337 (rows 4012-5348 of 6,681)
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
  (5396484, 14145921, '0009', 'Plants for Hillside', 'Add (12) 5 gallon plants Total
        (8) Ligustrum
        (4) Dwarf Bottlebrush

Add (4) 1 gallon plants Total
        (2) Tuscan Rosemary
        (2) Sage', NULL, 732.00, 'sold', '2022-10-11', '2022-10-11 12:44:52'),
  (5396493, 14145921, '0010', '3/4” Gravel Pathway', 'Add 3/4” gravel for upper pathway with Weed Fabric', NULL, 295.00, 'sold', '2022-10-11', '2022-10-11 12:46:25'),
  (5396503, 14145921, '0011', 'Property line Header board', 'Add a 2”x10” header board to delineate property line down upper area hillside', NULL, 155.00, 'sold', '2022-10-11', '2022-10-11 12:47:47'),
  (5397084, 13484698, '0007', '2 new valves, main line, ball valve', NULL, NULL, 681.00, 'pending', '2022-10-11', '2022-10-11 14:26:25'),
  (5397091, 13484698, '0008', 'Extra 83 SF of pre-stablized DG @ 3"depth', NULL, NULL, 560.00, 'pending', '2022-10-11', '2022-10-11 14:28:04'),
  (5397098, 13484698, '0009', '28 LF of 1'' x 6" Brown plastic Benderboard', NULL, NULL, 245.00, 'pending', '2022-10-11', '2022-10-11 14:29:36'),
  (5397799, 14175746, '0009', 'stucco for wall (cali room)', 'Doing 3 layers of stucco both back and front of wall, including paper layer (over wood frame)
Stucco will be sanded and match back to house', NULL, 1650.00, 'sold', '2022-10-11', '2022-10-11 18:08:19'),
  (5399316, 14190401, '0001', 'Gravel for the side of house w/demo', '3/4" Del rio gravel for 200sqft', NULL, 1300.00, 'pending', '2022-10-12', '2022-10-12 08:47:27'),
  (5400384, 14013643, '0002', 'Plant Credit', 'Did not need to plant (2) 5 gallon plants and owner supplied the mulch', NULL, -100.00, 'pending', '2022-10-12', '2022-10-12 11:24:16'),
  (5404394, 14251083, '0004', 'Additional demo cost for roots', 'Lots of roots underneath grass took 2 additional man days.', NULL, 870.00, 'pending', '2022-10-13', '2022-10-13 10:01:02'),
  (5407525, 8309666, '0011', 'Additional rock', 'Removal of mulch 1000
Decorative rock 2250', NULL, 3250.00, 'pending', '2022-10-13', '2022-10-13 16:15:42'),
  (5409995, 13484698, '0010', 'Remove 2 trees and 2 vines, plus stumpgrind', NULL, NULL, 850.00, 'pending', '2022-10-14', '2022-10-14 11:19:50'),
  (5410000, 13484698, '0011', '(4) 1 gallon of fig vine', NULL, NULL, 88.00, 'pending', '2022-10-14', '2022-10-14 11:20:41'),
  (5412935, 13484698, '0012', 'Trimming and tree /plant removal', NULL, NULL, 1400.00, 'sold', '2022-10-17', '2022-10-17 07:11:04'),
  (5413055, 14306877, '0004', 'Misc Credits', 'Credit for 20lf benderboard
Dg to mulch
Turf to concrete', NULL, -555.00, 'pending', '2022-10-17', '2022-10-17 07:32:09'),
  (5414553, 13939548, '0006', 'Additional Outlet for shed', NULL, NULL, 120.00, 'sold', '2022-10-17', '2022-10-17 11:19:36'),
  (5416081, 14214494, '0004', 'Plants', 'Price difference for 1 gallon to 5 gallon', NULL, 60.00, 'pending', '2022-10-17', '2022-10-17 15:40:43'),
  (5416191, 13484698, '0013', 'plant 3 (15g) from pots to inground', NULL, NULL, 60.00, 'sold', '2022-10-17', '2022-10-17 16:15:22'),
  (5416404, 13939548, '0007', 'Added turf', 'added turf 
159.5  @ 
$11. Per square feet 
 
Total $1754.50', NULL, 1754.50, 'sold', '2022-10-17', '2022-10-17 18:00:33'),
  (5418788, 13939548, '0008', 'Credit', NULL, NULL, -250.00, 'pending', '2022-10-18', '2022-10-18 10:48:38'),
  (5420165, 14190401, '0002', 'Adding linear feet to connect water main to bkyd', NULL, NULL, 500.00, 'pending', '2022-10-18', '2022-10-18 14:03:05'),
  (5420169, 14190401, '0003', 'Wire to connect timer', NULL, NULL, 0, 'pending', '2022-10-18', '2022-10-18 14:03:36'),
  (5420570, 14557511, '0001', 'Wall repair', '8lf three courses high with cap

850', NULL, 850.00, 'pending', '2022-10-18', '2022-10-18 15:27:17'),
  (5420689, 14069657, '0002', 'Gas Line', 'Replace 1 1/4" gas line from corner of the house to pool equipment  Existing gas line is leaking and is not holding pressure', NULL, 1350.00, 'sold', '2022-10-18', '2022-10-18 16:06:13'),
  (5420698, 14069657, '0003', 'Gas Line Size Reduction', 'Reduce cost of 1 1/2" gas line to 1" in the', NULL, -255.00, 'pending', '2022-10-18', '2022-10-18 16:08:13'),
  (5420704, 14069657, '0004', 'Electrical Conduit', 'Add 3/4" electrical conduit only to future BBQ area from pool equipment area', NULL, 465.00, 'pending', '2022-10-18', '2022-10-18 16:09:35'),
  (5423993, 13063363, '0005', '50 LF Trench for 220V', NULL, NULL, 2600.00, 'sold', '2022-10-19', '2022-10-19 12:17:16'),
  (5425321, 14412273, '0001', 'Credit for Planter Bed', 'Removal of planter bed', NULL, -550.00, 'pending', '2022-10-19', '2022-10-19 16:21:26'),
  (5425326, 14412273, '0002', 'Credit for Fence Post Arbor', 'Installation of only 1 set not 2 sets of arbor posts', NULL, -395.00, 'pending', '2022-10-19', '2022-10-19 16:22:48'),
  (5430521, 14359777, '0001', 'Mulch', 'Add mulch to existing planters in frontyard', NULL, 100.00, 'pending', '2022-10-21', '2022-10-21 07:29:02'),
  (5433003, 14364138, '0001', 'Add 16 LF of swale', NULL, NULL, 1186.00, 'sold', '2022-10-21', '2022-10-21 15:39:27'),
  (5433005, 14364138, '0002', '1 x 6" bender board extra 69 LF', NULL, NULL, 603.00, 'sold', '2022-10-21', '2022-10-21 15:40:11'),
  (5433020, 14364138, '0003', '4 new anti brass valves (just valves)', NULL, NULL, 800.00, 'sold', '2022-10-21', '2022-10-21 15:48:49'),
  (5433022, 14364138, '0004', 'One new brass valve for side ivy area', 'Not entire zone, just valve', NULL, 350.00, 'sold', '2022-10-21', '2022-10-21 15:50:50'),
  (5433026, 14364138, '0005', 'Drainage', '57 LF of 3" sdr
5 inlets
1 pop-up', NULL, 1700.00, 'sold', '2022-10-21', '2022-10-21 15:55:50'),
  (5436193, 14212852, '0001', 'Adding 1-15 palm tree', NULL, NULL, 360.00, 'pending', '2022-10-24', '2022-10-24 11:04:11'),
  (5436277, 14212852, '0002', 'Adding gravel to planter', NULL, NULL, 396.00, 'pending', '2022-10-24', '2022-10-24 11:15:50'),
  (5439213, 14212852, '0003', 'CREDIT seat bench', NULL, NULL, -602.00, 'pending', '2022-10-25', '2022-10-25 06:54:23'),
  (5439518, 14610279, '0001', 'Saw cut concrete for planter', 'Remove concrete along the fence : 22’L X 2’W', NULL, 345.00, 'sold', '2022-10-25', '2022-10-25 07:37:41'),
  (5439597, 14610279, '0002', 'Backyard ground grading', 'Grade backyard to match existing concrete level. 
Grading includes excavation and hauling of material. 
Approx. 7” difference from concrete and grass', NULL, 1221.00, 'pending', '2022-10-25', '2022-10-25 07:52:27'),
  (5440231, 14835589, '0001', 'Run new drain system along concrete.', 'Run 54 LF of 4inch SDR35
Install 6 Drain inlets.', NULL, 1800.00, 'pending', '2022-10-25', '2022-10-25 09:29:45'),
  (5440329, 14835589, '0002', 'Extension of planter bed', 'Extend new planter box bed additional 10LF', NULL, 315.00, 'pending', '2022-10-25', '2022-10-25 09:42:49'),
  (5440369, 14835589, '0003', 'Paver addition', 'Install 190 sqft of paver for patio extension.
Similar to plan layout.', NULL, 4133.00, 'pending', '2022-10-25', '2022-10-25 09:48:10'),
  (5440422, 14835589, '0004', 'Irrigation retrofit', 'Install new valve and connect to existing irrigation system for side planter. 

Fix and cap any broken pipe.', NULL, 720.00, 'pending', '2022-10-25', '2022-10-25 09:55:07'),
  (5440608, 14610279, '0003', 'Expansion Joint Felt', 'Install expansion joint felt around concrete for weep screed.', NULL, 238.00, 'sold', '2022-10-25', '2022-10-25 10:23:25'),
  (5441036, 14610279, '0004', 'Rebar + Rebar Dowels', 'Drill into concrete and add rebar dowels.
Rebar dowels will have anchoring epoxy to bond.', NULL, 815.00, 'sold', '2022-10-25', '2022-10-25 11:23:04'),
  (5442913, 14069657, '0005', 'Additional Concrete', 'Add approximately 120 sq ft of concrete to “firepit sitting area”', NULL, 1002.00, 'pending', '2022-10-25', '2022-10-25 17:17:53'),
  (5442917, 14069657, '0006', 'Column Credit', 'Remove 1 column at driveway', NULL, -1000.00, 'pending', '2022-10-25', '2022-10-25 17:18:33'),
  (5442921, 14069657, '0007', 'Turf Credit', 'Removal of approximately 120sq ft of turf in “firepit sitting area”', NULL, -1350.00, 'pending', '2022-10-25', '2022-10-25 17:19:52'),
  (5442927, 14069657, '0008', 'Drainage', 'Add 80 linear ft of drainage deck drains and French drains as a combination between the 2', NULL, 2000.00, 'pending', '2022-10-25', '2022-10-25 17:21:50'),
  (5442929, 14069657, '0009', 'Lighting', 'Additional 4 low voltage lights discounted', NULL, 615.00, 'pending', '2022-10-25', '2022-10-25 17:22:59'),
  (5442931, 14069657, '0010', 'Demo for  concrete “footings”', 'To remove rebar and forms to make way for retention footings and replace once complete', NULL, 775.00, 'pending', '2022-10-25', '2022-10-25 17:24:16'),
  (5442937, 14069657, '0011', 'Additional concrete for retention footings', 'Additional concrete to pour retention footings along various areas', NULL, 1300.00, 'pending', '2022-10-25', '2022-10-25 17:26:11'),
  (5445000, 14835589, '0005', 'Replace existing drain system', 'Install 35LF of 4inch SDR35 pipe.
Install 5 inlets', NULL, 1250.00, 'pending', '2022-10-26', '2022-10-26 09:31:30'),
  (5450653, 14835518, '0001', 'Additional Items', 'water permeable weed Fabric for 3200 sq ft 
anchored down with galvanized landscape staples', NULL, 1500.00, 'pending', '2022-10-27', '2022-10-27 12:05:44'),
  (5450665, 14835518, '0002', 'Upgrade in plant size', 'ten plants from 1 gallons to 5 gallons @ 22 each

$220', NULL, 220.00, 'pending', '2022-10-27', '2022-10-27 12:07:30'),
  (5451982, 13063363, '0006', 'Additional work', '(1) flat dymondia
Reconnecting all the irrigation', NULL, 700.00, 'sold', '2022-10-27', '2022-10-27 16:28:07'),
  (5452009, 14594286, '0001', 'Redwood Raised Planter', 'Paint ready redwood
8'' wide
2 1/2 feet deep
2'' tall', NULL, 1000.00, 'pending', '2022-10-27', '2022-10-27 16:38:32'),
  (5453908, 14610279, '0005', 'Tree stump removal/ stump grinder', 'Remove a 4’x4’ tree stump centered in the rain garden.', NULL, 450.00, 'sold', '2022-10-28', '2022-10-28 09:48:41'),
  (5454229, 14610279, '0006', '3% on CO''s', NULL, NULL, 55.44, 'pending', '2022-10-28', '2022-10-28 10:42:37'),
  (5456163, 14835589, '0006', 'Paver Installation', 'Demo 7-8 inches for paver installation.
Install Grey Charcoal Courtyard pavers. 
Polymeric sand included for joints.
Approx. 638 sqft', NULL, 12987.00, 'pending', '2022-10-30', '2022-10-30 14:03:17'),
  (5459301, 14903451, '0001', '20% Additional waste - material only', 'Cost of material only - not for installation.
314 SF @ $3.59 (contractor price for turf)

Client can keep extra pieces of turf waste.', 'We will need to charge for rectangle shapes in 15'' width x length for turf not by SF because with curves there''s too much waste.  This is not economical or sustainable, especially the plastic waste.', 1130.00, 'sold', '2022-10-31', '2022-10-31 12:34:12'),
  (5459847, 13001667, '0001', '2 additional hours to design', NULL, NULL, 180.00, 'pending', '2022-10-31', '2022-10-31 13:57:19'),
  (5468969, 13448673, '0013', 'Additional Fill in Rock', 'Fill in rock for pots and planters', NULL, 415.00, 'sold', '2022-11-02', '2022-11-02 14:54:16'),
  (5472027, 14364138, '0006', '3 5g yucca to match pattern', NULL, NULL, 150.00, 'sold', '2022-11-03', '2022-11-03 11:33:58'),
  (5472573, 14364138, '0007', '318 SF more of CA Gold Gravel', NULL, NULL, 858.00, 'sold', '2022-11-03', '2022-11-03 12:52:06'),
  (5472577, 14364138, '0008', '50 SF more of Black Mexican rock 2_3"', NULL, NULL, 478.00, 'sold', '2022-11-03', '2022-11-03 12:52:47'),
  (5472586, 14364138, '0009', 'Credit pin cushion', 'We cannot get pincushion. Here is the credit.', NULL, -740.00, 'sold', '2022-11-03', '2022-11-03 12:54:41'),
  (5473517, 15061122, '0001', 'Added turf', '60 sq ft at $11 a sq ft ($660)and a material change order for 70 sq ft at 3.90 a sq ft  for $273 for a total of $933', NULL, 933.00, 'pending', '2022-11-03', '2022-11-03 15:46:35'),
  (5473695, 14594286, '0002', 'Add’l cost for Persimmon', NULL, NULL, 100.00, 'sold', '2022-11-03', '2022-11-03 17:02:35'),
  (5473765, 14364138, '0010', 'Credit for one stumpgrind', NULL, NULL, -185.00, 'sold', '2022-11-03', '2022-11-03 17:44:50'),
  (5477053, 14175746, '0010', 'Rework Bender board/turf prep', 'Minimized planter and turned into turf', NULL, 375.00, 'sold', '2022-11-04', '2022-11-04 14:38:56'),
  (5477059, 14175746, '0011', 'Drilling holes  planter saucers incl irrigation', NULL, NULL, 200.00, 'sold', '2022-11-04', '2022-11-04 14:39:39'),
  (5477063, 14175746, '0012', 'Remove areas of pavers into the planters', 'Pull up pavers in 2 areas to convert to planters 
May need pavers

Add bend a board
Move irrigation 
Convert planter area into more turf', NULL, 3460.00, 'sold', '2022-11-04', '2022-11-04 14:40:18'),
  (5482429, 14828337, '0001', 'Credit for saw cuts and turf strips', 'We are CANCELLING the turf strips for the driveway. 

Line item under DEMO - #4. Saw cut at 4" pad only approx. 220 LF ($1,833) - **we are still doing saw cut around black tile patio. 20 LF**
Item labeled TURF all line items ($877)

Credit includes all labor and materials as cost in contract addendum for the line items listed above.', 'Concrete needs to be refurbished first and then maybe after our project she will think about doing it. It is a lot of saw cutting and measurements are off with the layout so it wouldn''t be equal distanced strips.', -2710.00, 'sold', '2022-11-07', '2022-11-07 16:24:48'),
  (5482439, 14828337, '0002', 'Add 36 LF to gas line', 'add 36 LF to gas line.

We cannot take the gas line from the box outside, Jorge said that you could get a drop in BTUs in your shower/hot water output so we have to get it nice and clean from the gas meter.

Cost includes trench and backfill as stated in contract addendum @ $33/LF', 'I was out there with Daniel and he said we would take it from that box so that''s where I measured it from, know I know better that we cannot take gas from the shower or other areas of the house, only from the meter.  I hope that is correct.', 1188.00, 'sold', '2022-11-07', '2022-11-07 16:28:40'),
  (5482503, 14828337, '0003', '45 SF extra of concrete and tile overlay', 'This is for the interior patio area with Wayfair hexagon tile only.  We made the patio 1'' wider and the side area 1'' wider.  21'' SF + 13''6" SF + little pathway inbetween blue fescue 10''4" SF = 45 total SF increase.

(does not include the area where the "steppers" and blue fescue are)', NULL, 1508.00, 'sold', '2022-11-07', '2022-11-07 17:03:50'),
  (5482535, 14828337, '0004', 'Dry well with gravel, PVC and inlets', 'In the "flood area" of the property along existing pathway near garage we are suggesting a drainage system that can allow water to penetrate deep down.

Gravel bed 2-3'' down
Soil on top, then DG and plants
2 inlets
PVC pipe from inlet to gravel well', NULL, 1600.00, 'sold', '2022-11-07', '2022-11-07 17:17:13'),
  (5482556, 14830732, '0001', 'Credit for (1) 18 linear foot wall', NULL, NULL, -2448.00, 'sold', '2022-11-07', '2022-11-07 17:27:45'),
  (5482557, 14830732, '0002', 'Add''l Irr zone plus 12" pop ups', NULL, NULL, 1225.00, 'sold', '2022-11-07', '2022-11-07 17:28:11'),
  (5482558, 14830732, '0003', '20'' Bender Board', NULL, NULL, 160.00, 'sold', '2022-11-07', '2022-11-07 17:28:31'),
  (5482560, 14830732, '0004', 'Add''l DG/Plants', NULL, NULL, 420.00, 'sold', '2022-11-07', '2022-11-07 17:29:14'),
  (5484564, 14828337, '0005', 'Credit for Porcelain Tile Steppers', NULL, NULL, -540.00, 'sold', '2022-11-08', '2022-11-08 09:55:05'),
  (5490837, 14116040, '0001', 'Electrical Conduit', '3/4" Electrical conduit and electrical for Fountain from Pine tree to fountain', NULL, 400.00, 'pending', '2022-11-09', '2022-11-09 15:06:16'),
  (5493067, 15062246, '0001', 'Credit on plant sizes', 'Reduction of plant sizes for 19 Tropicana plants
255', NULL, -255.00, 'pending', '2022-11-10', '2022-11-10 09:20:24'),
  (5496278, 14543494, '0001', 'Drains', 'Add 14'' of Drains of the corner of the house', NULL, 322.00, 'sold', '2022-11-11', '2022-11-11 07:20:33'),
  (5497213, 14830732, '0005', 'Credit for backyard sod/irrigation', NULL, NULL, -4710.00, 'sold', '2022-11-11', '2022-11-11 10:01:52'),
  (5501716, 14069928, '0001', 'Additional timber courses for wall', '27 LF. 3 courses $3,523.
24 LF. 1 course.  $1,400.
16 LF. 2 courses $1,050.

Back fill.                $1,100.', NULL, 6073.00, 'sold', '2022-11-14', '2022-11-14 10:49:12'),
  (5503541, 14828337, '0006', 'Credit for 100 SF DG', NULL, NULL, -400.00, 'sold', '2022-11-14', '2022-11-14 16:08:40'),
  (5503746, 14069928, '0002', 'Cost for difference in retaining walls', 'Details are listed on revised estimate', NULL, 6300.00, 'sold', '2022-11-14', '2022-11-14 18:08:04'),
  (5509927, 14830732, '0006', 'Credit for mulch and gravel', NULL, NULL, -440.00, 'sold', '2022-11-16', '2022-11-16 09:18:34'),
  (5512183, 14628167, '0001', '(8) steps with side support', 'Steps to be constructed with paver block for 48 linear feet', NULL, 3100.00, 'sold', '2022-11-16', '2022-11-16 14:55:09'),
  (5512190, 14628167, '0002', 'Extending Paver Walkway beyond house towards side', NULL, NULL, 700.00, 'sold', '2022-11-16', '2022-11-16 14:58:15'),
  (5512196, 14628167, '0003', 'Extra demo for pavers, additional step work', NULL, NULL, 1200.00, 'sold', '2022-11-16', '2022-11-16 14:59:45'),
  (5512257, 14628167, '0004', 'Credit for Retaining Wall', NULL, NULL, -1055.00, 'sold', '2022-11-16', '2022-11-16 15:23:40'),
  (5513505, 14830732, '0007', 'upgrade to 15 gallon Orange Jubilee', NULL, NULL, 105.00, 'sold', '2022-11-17', '2022-11-17 07:09:01'),
  (5516307, 14828337, '0007', 'upgrade to path light', '10 path lights are being upgraded to Vista 4203 @ $13/each extra costs.', NULL, 130.00, 'sold', '2022-11-17', '2022-11-17 15:00:33'),
  (5516624, 9902783, '0021', 'Refresher', 'Day 1: Trimming, clean up, lighting check and glue, Brick repair with saw cut, grading, root cutting (if tree is the issue) - 3 guys labor plus material $2,300

Day 2: Planting, compost, mulch, and irrigation including audit of irrigation. $3,496

Included in Day 2 costs:
- 957 SF of matching mulch at 2-3" depth (no weed barrier) $1,876
- Adding compost amendments to base of all plants $100
- (10) 1 gallons - $230
- (12) 5 gallons - $540
- Adding emitters to new plants and adding 2 emitters where necessary. $100
- Audit of all irrigation in frontyard $650 - one guy, all day.', NULL, 5796.00, 'sold', '2022-11-17', '2022-11-17 17:03:55'),
  (5516660, 14828337, '0008', 'Upsizing Lemon to 24" box', 'going from a 15 gallon to a 24" box.', NULL, 510.00, 'sold', '2022-11-17', '2022-11-17 17:26:33'),
  (5516664, 14828337, '0009', 'Credit for (5) 5 gallon Karl Foerster Grasses', 'We dont need that many!', NULL, -217.50, 'sold', '2022-11-17', '2022-11-17 17:28:43'),
  (5517810, 14828337, '0010', 'Credit for design', NULL, NULL, -300.00, 'sold', '2022-11-18', '2022-11-18 08:35:17'),
  (5519984, 17951818, '0001', 'Upgrading boulders to Malibu 4"-6"', NULL, NULL, 200.00, 'sold', '2022-11-18', '2022-11-18 18:37:30'),
  (5519985, 17951818, '0002', '150sqft of add''l Del Rio for existing bed', NULL, NULL, 375.00, 'pending', '2022-11-18', '2022-11-18 18:38:14'),
  (5522039, 14828337, '0011', 'Credit for one up light', NULL, NULL, -225.00, 'sold', '2022-11-21', '2022-11-21 08:41:13'),
  (5522061, 8309666, '0012', 'Light replacement', 'Total of 3 path lights need approval to order lights 
need to order 2 more lights.', NULL, 600.00, 'pending', '2022-11-21', '2022-11-21 08:43:22'),
  (5522694, 14069928, '0003', 'Add’l plants', '(5) 5 gallon shrubs (Grevillea and Salvia Clevelandii)
(18) 1 gallon plants (Rosemary, Ceanothus)
(1) 15 gallon Yuzu', NULL, 1200.00, 'sold', '2022-11-21', '2022-11-21 10:28:52'),
  (5530543, 15047880, '0001', 'Brass Valves', 'Install (2) Brass valves instead of standard installation valves.', NULL, 150.00, 'pending', '2022-11-23', '2022-11-23 09:51:49'),
  (5532209, 15047432, '0001', 'Plants and shredded mulch for border planter', NULL, NULL, 2485.00, 'pending', '2022-11-23', '2022-11-23 17:14:10'),
  (5532422, 18195455, '0001', 'Design Credit', NULL, NULL, -375.00, 'pending', '2022-11-23', '2022-11-23 21:46:53'),
  (5535194, 18160239, '0001', 'Credit for (1) smart timer', NULL, NULL, -425.00, 'sold', '2022-11-28', '2022-11-28 07:22:13'),
  (5535661, 12942466, '0007', 'Adding (3) Lights (see description)', 'Adding and checking lights that went out in front.

(3) Up - FL-105B in 2700K 5.5W
Cost includes wiring and all labor.', 'Make sure order matches what we purchased first time around.', 750.00, 'pending', '2022-11-28', '2022-11-28 08:47:28'),
  (5540368, 12852203, '0002', 'Demo', 'Remove 5 (1 gallon) plants along back fence.Remove 1 (15 gallon) Schefflera', NULL, 175.00, 'pending', '2022-11-29', '2022-11-29 09:36:18'),
  (5542655, 15047880, '0002', 'Bending board', 'Did not end up needing bending board for planters', NULL, -200.00, 'pending', '2022-11-29', '2022-11-29 15:46:00'),
  (5542687, 14628167, '0005', 'Add’l pavers replacing concrete curb', '10sqft paver install plus removal of curb', NULL, 250.00, 'sold', '2022-11-29', '2022-11-29 15:54:40'),
  (5542717, 14628167, '0006', 'Far right side of d/way', 'Remove 2” of soil and gently grade planter.
Install shredded mulch', NULL, 200.00, 'sold', '2022-11-29', '2022-11-29 16:03:55'),
  (5545084, 12852203, '0004', 'Credit 2 (1g) ficus benjamina plants', NULL, NULL, -44.00, 'pending', '2022-11-30', '2022-11-30 10:57:39'),
  (5545108, 12852203, '0005', 'Upgrade (1) ficus benjamina to 15 gallon', NULL, NULL, 153.00, 'pending', '2022-11-30', '2022-11-30 11:01:05'),
  (5545600, 14828337, '0012', 'Upgrade to larger posts for pergola', NULL, NULL, 950.00, 'sold', '2022-11-30', '2022-11-30 12:16:41'),
  (5549104, 18195455, '0002', 'Additional bend a board', '30 LF.', NULL, 210.00, 'pending', '2022-12-01', '2022-12-01 10:17:51'),
  (5549120, 18195455, '0003', 'Additional mulch (brown shredded', 'Brown shredded', NULL, 748.75, 'pending', '2022-12-01', '2022-12-01 10:20:31'),
  (5549733, 18160323, '0001', 'Added Concrete for Front', 'Adding approx 370sqft of concrete total 
Design was slightly off in terms of measurements plus added some additional concrete for ADU area', NULL, 2650.00, 'sold', '2022-12-01', '2022-12-01 12:03:13'),
  (5549736, 18160323, '0002', '53 linear feet Electrical Conduit', NULL, NULL, 1100.00, 'sold', '2022-12-01', '2022-12-01 12:03:34'),
  (5549981, 12852203, '0006', 'Remove hedge of neighboring property', 'Includes demo and hauling. Stump grind if necessary. Leave soil at grade, flat', NULL, 300.00, 'pending', '2022-12-01', '2022-12-01 12:42:16'),
  (5550111, 14828337, '0013', 'Credit for downsize Crassula Jade', NULL, '5 x $25 credit for downsizing from 5g to 1g for Crassula Rippe Jade.', -125.00, 'sold', '2022-12-01', '2022-12-01 13:02:14'),
  (5550164, 12852203, '0007', 'Two bags potting soil and planting labor', 'One bag for Ficus benjamina.

2nd bag for repotting existing overgrown plant into old pot that had dead ficus. Labor for replanting add $25.', NULL, 50.00, 'pending', '2022-12-01', '2022-12-01 13:07:57'),
  (5550384, 12852203, '0008', '20 SF extra gravel w/ weed barrier', '20 SF extra Montana gravel @ $12/SF. 
3" depth includes weed barrier.', NULL, 240.00, 'sold', '2022-12-01', '2022-12-01 13:44:17'),
  (5550392, 12852203, '0009', 'Credit for demo', 'We are not removing 2 potted Ficus trees (from pool decking area. They will stay in their pots.)', NULL, -80.00, 'sold', '2022-12-01', '2022-12-01 13:46:25'),
  (5550824, 12608924, '0040', 'Repair tubing in veggie bed', 'no cost', NULL, 0, 'sold', '2022-12-01', '2022-12-01 15:07:22'),
  (5550837, 12608924, '0041', 'Transplant (5) 5gallon mexican sage', 'Transplant 5 mexican sage to new area @ $15 each.
Labor and irrigation emitter to new plant location included in cost. 

**Does not guauntee that plant will live in it''s new spot. Voiding plant warranty.', NULL, 75.00, 'sold', '2022-12-01', '2022-12-01 15:10:28'),
  (5550838, 12608924, '0042', 'Replace (12) 5 gallon lavender', 'No charge, this is under our warranty (from final job walk!)', NULL, 0, 'sold', '2022-12-01', '2022-12-01 15:11:12'),
  (5550849, 12608924, '0043', 'Add (8) 5 gallon Lavandula angustifolia', '4 on each side of walkway to back fence/gate.', NULL, 352.00, 'sold', '2022-12-01', '2022-12-01 15:14:39'),
  (5550854, 12608924, '0044', 'Replace (1) 5g Tuscan Blue Rosemary', 'No charge this was under warranty (from final job walk!)', NULL, 0, 'sold', '2022-12-01', '2022-12-01 15:15:25'),
  (5550860, 12608924, '0045', 'Demo meadow and install new sod rolls', 'Meadow: Karelaine suggested Native preservation mix.  We discussed if you purchase the material we will remove the old sod and install with costs based on $650/per man day.  Jorge estimates that it will take 3 guys, 3 days to remove dead sod, check irrigation, prep soils and roll out sod. If they do it faster, then we will credit you.

Cost is for 3 guys, 3 days.
Included is: unloading sod (if needed to help speed up install, we should plan for the delivery while we are on site if possible, on our 2nd day), the dump fees for dead sod, amendments (if needed), testing and repairs to grid irrigation (if needed) and install of new sod.', NULL, 5725.00, 'sold', '2022-12-01', '2022-12-01 15:17:25'),
  (5551100, 17971252, '0002', 'Backyard retention wall', 'This is option 2: CMU block with stucco finish', 'This is option 2: CMU block with stucco finish', 2830.00, 'pending', '2022-12-01', '2022-12-01 17:00:56'),
  (5551150, 14835518, '0003', 'Rain Barrel Install', NULL, NULL, 280.00, 'pending', '2022-12-01', '2022-12-01 17:41:12'),
  (5555904, 14384853, '0001', 'Additional 70 Sq Ft Pavers', 'This is for the additional walkway in the front and to extend the paver walkway between garage and patio', NULL, 1260.00, 'sold', '2022-12-05', '2022-12-05 06:45:34'),
  (5555918, 14384853, '0002', 'Subtract 20 linear feet of soldier course', 'This is the removal of soldier course along the walkway between garage and patio', NULL, -390.00, 'sold', '2022-12-05', '2022-12-05 06:47:16'),
  (5559436, 14546089, '0001', '1 Zone of Irrigation Valve Deduction', 'Original scope of work was for 4 valves,  We are deducting 1 Valve and using that deduction towards additional necessary drainage for the paver area.', NULL, -915.00, 'sold', '2022-12-05', '2022-12-05 18:31:03'),
  (5566762, 14828337, '0014', '(1) weatherproof outlet', 'For string lights to plug in behind hedge', NULL, 150.00, 'sold', '2022-12-07', '2022-12-07 10:26:20'),
  (5566893, 14557511, '0002', 'Repair Valves', 'verb approval via arely with bryan', NULL, 800.00, 'pending', '2022-12-07', '2022-12-07 10:49:17'),
  (5566903, 14557511, '0003', 'Fence at cost', NULL, NULL, 1180.60, 'pending', '2022-12-07', '2022-12-07 10:51:13'),
  (5566949, 14013680, '0001', 'mexican black pebble', 'swapping from lava rock to black mexican beach pebble. this is the price with the credit applied.', 'swapping from lava rock to black mexican beach pebble', 925.00, 'pending', '2022-12-07', '2022-12-07 10:57:33'),
  (5567647, 17971252, '0004', 'Credit For Flagstone Steppers with Mortar', 'Removal of flagstone steppers along backyard turf', NULL, -702.00, 'sold', '2022-12-07', '2022-12-07 12:34:46'),
  (5567666, 17971252, '0005', 'Bendaboard Credit', 'Removal of bendaboard edging in backyard turf area', NULL, -400.00, 'sold', '2022-12-07', '2022-12-07 12:36:37'),
  (5567680, 17971252, '0006', 'Flagstone cap for backyard pony wall', 'Add flagstone cap to backyard pony wall', NULL, 1102.00, 'sold', '2022-12-07', '2022-12-07 12:39:08'),
  (5572062, 7799379, '0040', 'CREDIT HOLD', NULL, NULL, -128281.80, 'pending', '2022-12-08', '2022-12-08 12:53:58'),
  (5572237, 14116040, '0003', 'Add 40 LF Benda Board', 'Additional 40 LF of Benda Board along Gravel and Mulch', NULL, 300.00, 'pending', '2022-12-08', '2022-12-08 13:27:13'),
  (5572247, 14116040, '0004', '3 Additional steppers', 'Add 3 Concrete steppers along Garage wall', NULL, 100.00, 'pending', '2022-12-08', '2022-12-08 13:28:25'),
  (5572259, 14116040, '0005', 'Add (2) 5 Gallon Cassia by Garden Fence', 'Plant (2) 5 Gallon Cassia''s by wood garden fence', NULL, 90.00, 'pending', '2022-12-08', '2022-12-08 13:31:06'),
  (5572274, 14116040, '0006', 'Add (1) Hose Bib', 'Replace Leaking Hose Bib by Pool cost 65', NULL, 0, 'pending', '2022-12-08', '2022-12-08 13:33:18'),
  (5572291, 14116040, '0007', 'Del Rio Gravel Path', 'Replace Walk on Mulch for 3/8" Del Rio Gravel', NULL, 810.00, 'pending', '2022-12-08', '2022-12-08 13:37:35'),
  (5572310, 14116040, '0008', 'Replace Shut Off', 'Replace Leaking Main Line Shut Off Valve on Side of the House cost 165', NULL, 0, 'pending', '2022-12-08', '2022-12-08 13:40:21'),
  (5572354, 14116040, '0009', 'Flagstone Steppers', 'Add homeowner provided flagstone steppers to create a pathway from path to patio', NULL, 0, 'pending', '2022-12-08', '2022-12-08 13:49:04'),
  (5578509, 14013680, '0002', '3%', NULL, NULL, 27.75, 'pending', '2022-12-12', '2022-12-12 09:47:25'),
  (5582646, 18133765, '0001', 'Credit for demo', 'Not removing:

7- 1 gallon $70
3 - 5 gallons $120', NULL, -190.00, 'pending', '2022-12-13', '2022-12-13 09:01:13'),
  (5582658, 18133765, '0002', 'Credit for demo', 'Not tilling side yard see contract #3 in demo.', NULL, -261.00, 'pending', '2022-12-13', '2022-12-13 09:02:38'),
  (5584451, 12608924, '0046', 'Credit for three man days', 'Credit for three man days.', 'Thank you everyone that is a 100% WRAP!', -1950.00, 'sold', '2022-12-13', '2022-12-13 13:16:45'),
  (5588065, 18102006, '0001', '(8) 1 gallons', 'Left of driveway 
(4) Dianella
(4) Regal Mist Muhlenbergia', NULL, 200.00, 'pending', '2022-12-14', '2022-12-14 11:24:33'),
  (5590536, 18102006, '0002', 'Stump grinding 3 small stumps', NULL, NULL, 350.00, 'pending', '2022-12-15', '2022-12-15 07:17:09'),
  (5591184, 17970867, '0001', 'Demo brick wall no footings', NULL, NULL, 600.00, 'pending', '2022-12-15', '2022-12-15 09:24:49'),
  (5591318, 18102006, '0003', 'Additional Drip Zone for Back', NULL, NULL, 1500.00, 'pending', '2022-12-15', '2022-12-15 09:47:19'),
  (5591325, 18194555, '0001', 'Add’l Drip Zone to replace broken pipes', NULL, NULL, 1050.00, 'sold', '2022-12-15', '2022-12-15 09:48:57'),
  (5591331, 18194555, '0002', 'Irritrol Irrigation Timer', NULL, NULL, 435.00, 'sold', '2022-12-15', '2022-12-15 09:49:34'),
  (5591970, 18133765, '0003', 'Credit for (9) 1 gallons', 'We could not get (9) 1 gallons @ $22/each.

Bea might get the natives she wants and we will plant them.

We will need to charge for LABOR only @ $10 per 1 gallon.', NULL, -198.00, 'pending', '2022-12-15', '2022-12-15 11:26:07'),
  (5592976, 18226736, '0001', '5 gallon bougainvillea fushia', 'one more plant', NULL, 43.50, 'pending', '2022-12-15', '2022-12-15 13:53:13'),
  (5593535, 17970867, '0002', 'Non retaining wall 24Lf. no cap', NULL, NULL, 2571.00, 'pending', '2022-12-15', '2022-12-15 16:42:04'),
  (5594201, 17971252, '0007', 'Lighting', 'Add 3 additional low voltage lights to backyard', NULL, 675.00, 'sold', '2022-12-16', '2022-12-16 06:45:51'),
  (5595333, 18226736, '0002', 'Design Credit', 'design credit.', NULL, -375.00, 'pending', '2022-12-16', '2022-12-16 10:32:41'),
  (5595575, 18194555, '0004', 'Credit for (1) Little John', NULL, NULL, -45.00, 'pending', '2022-12-16', '2022-12-16 11:19:25'),
  (5595846, 18063939, '0001', 'Block Wall', 'Install 144LF of block wall,
Sand stucco finish,
Includes Hand trowel stucco cap.', NULL, 16649.00, 'pending', '2022-12-16', '2022-12-16 12:19:00'),
  (5596352, 15017926, '0001', 'Additional Drainage', 'Additional Drainage', NULL, 625.00, 'pending', '2022-12-16', '2022-12-16 14:21:17'),
  (5596657, 18160323, '0003', 'Upgrading to black steel edging', NULL, NULL, 300.00, 'sold', '2022-12-16', '2022-12-16 17:21:10'),
  (5600997, 13262395, '0004', 'Permit Fees', NULL, NULL, 2936.75, 'sold', '2022-12-19', '2022-12-19 17:37:46'),
  (5601961, 18133765, '0004', 'Credit for (1) 5g Ceanothus Ray Heartman', NULL, NULL, -50.00, 'pending', '2022-12-20', '2022-12-20 07:38:42'),
  (5602198, 18133765, '0005', 'Credit (1) 1gallon Iris Douglas', NULL, NULL, -22.00, 'pending', '2022-12-20', '2022-12-20 08:20:06'),
  (5602205, 18133765, '0006', 'Add one drip line', NULL, NULL, 950.00, 'pending', '2022-12-20', '2022-12-20 08:21:01'),
  (5603100, 18133765, '0007', 'Credit for cardboard install', 'We did not install cardboard under mulch.
Credit for labor.', NULL, -400.00, 'pending', '2022-12-20', '2022-12-20 10:43:37'),
  (5604306, 14013680, '0003', 'Drains', 'Connect downspouts to existing drains', NULL, 550.00, 'sold', '2022-12-20', '2022-12-20 13:46:16'),
  (5604962, 18040699, '0001', 'Additional Succulents', NULL, NULL, 100.00, 'sold', '2022-12-20', '2022-12-20 16:58:08'),
  (5604963, 18040699, '0002', 'Bender Board Edging', 'price to be added once linear feet is confirmed', NULL, 120.00, 'sold', '2022-12-20', '2022-12-20 16:58:31'),
  (5606348, 18133765, '0008', 'Credit for design', NULL, NULL, -200.00, 'pending', '2022-12-21', '2022-12-21 08:46:09'),
  (5606604, 18040699, '0003', 'Credit for 5 unused steppers', NULL, NULL, -150.00, 'sold', '2022-12-21', '2022-12-21 09:35:11'),
  (5607754, 14013680, '0004', '3%', NULL, NULL, 16.50, 'pending', '2022-12-21', '2022-12-21 12:27:24'),
  (5608164, 18189451, '0001', 'purple smoke tree upgrade in container size', NULL, 'upgrade in plant size for purple smoke trees (2)', 150.00, 'pending', '2022-12-21', '2022-12-21 13:37:23'),
  (5609422, 18160323, '0004', 'Additional Concrete', '+100sqft of concrete with top cast #25/#5
(Measurements on original plan incorrect)
Concrete was remeasured after job walk once grading was completed. Spoke with client about this before forming was installed.', NULL, 1200.00, 'pending', '2022-12-22', '2022-12-22 07:01:22'),
  (5609429, 18160323, '0005', 'Credit for 10 feet of conduit', NULL, NULL, -200.00, 'pending', '2022-12-22', '2022-12-22 07:02:53'),
  (5611235, 10713700, '0011', 'Additional work around pool at cost', 'Pool plumbing reroute ($10500),
New pool lights (3) ($3600),
Pool skimmer repair ($2000) ,
Backfill and compaction front and back (16HRS= 1600),
Spa plumbing valves relocation ($1750).
Waterline tile removal, plaster removal, replaster for waterline,waterproof waterline tile, reset waterline tile ($4000).', NULL, 23450.00, 'pending', '2022-12-22', '2022-12-22 12:54:39'),
  (5611718, 9359454, '0017', 'Garden Enhancement + Mulch', 'Poolside Planter clean out of mint and mix of plants.  Add (9) 1 gallon plants in the backyard + $75.00 for 1 yard of mulch, labor cost plus material', NULL, 525.00, 'pending', '2022-12-22', '2022-12-22 14:53:25'),
  (5611791, 18116724, '0001', 'Additional 25 sq ft Pavers', 'Based on the new layout, it looks as though there is an overage in sq footage.  If you can approve this, when We are finished with the installation We can credit any sq ft over or under accordingly.', NULL, 862.50, 'pending', '2022-12-22', '2022-12-22 15:44:05'),
  (5612864, 18160323, '0006', 'Credit for Gravel', NULL, NULL, -300.00, 'pending', '2022-12-23', '2022-12-23 11:02:44'),
  (5612929, 14835589, '0007', 'Timber wall', 'Install 32LF of ACQ Green timber', NULL, 1166.00, 'pending', '2022-12-23', '2022-12-23 11:42:45'),
  (5613617, 18160323, '0007', 'CREDIT plants', '1 1gal
4 5gal', NULL, -195.50, 'pending', '2022-12-26', '2022-12-26 10:31:56'),
  (5613738, 18139870, '0001', 'Boulder installation', 'Credit for (4) full size boulders.', NULL, -102.00, 'pending', '2022-12-26', '2022-12-26 14:19:08'),
  (5615020, 26864979, '0001', 'Credit for (1) 15 gallon Shrub', NULL, NULL, -150.00, 'sold', '2022-12-27', '2022-12-27 11:36:39'),
  (5618207, 18194555, '0005', 'Bark Nugget Mulch front yard', NULL, NULL, 250.00, 'sold', '2022-12-28', '2022-12-28 15:43:07'),
  (5618260, 18189451, '0002', 'CREDIT 7 5gals', NULL, NULL, -304.50, 'pending', '2022-12-28', '2022-12-28 16:13:29'),
  (5619385, 13262395, '0005', 'CREDIT - GOHARA MATERIAL', NULL, NULL, -96349.05, 'pending', '2022-12-29', '2022-12-29 09:21:23'),
  (5621745, 18226736, '0003', 'REFUNDED', NULL, NULL, 331.50, 'pending', '2022-12-30', '2022-12-30 11:06:35'),
  (5622379, 10713700, '0012', 'Adjustment for duplicate items', NULL, NULL, -3350.00, 'pending', '2022-12-30', '2022-12-30 16:44:44'),
  (5624295, 26864979, '0002', '3/4" gravel for 2 small areas near pavers', 'remove flagstone, add 2-3" of gravel in area between pavers and putting green for approx 60sqft and small bed against house to left of new pavers for roughly 24sqft', NULL, 350.00, 'sold', '2023-01-03', '2023-01-03 07:59:11'),
  (5625580, 18040699, '0004', 'Credit Cover', NULL, NULL, -65.00, 'pending', '2023-01-03', '2023-01-03 11:51:08'),
  (5625835, 18229619, '0001', '18 linear ft bbq with 1 ft cantilever', '18 linear feet of bbq L shape
smooth stucco finish color  tbd
concrete top color tbd
5 electrical outlets (one for the bbq area, fridge) 3 for the exterior', NULL, 11995.00, 'pending', '2023-01-03', '2023-01-03 12:31:12'),
  (5625903, 18229619, '0002', 'additional drainage 160 linear feet', '160 linear feet of drainage with 14 inlets/ connection points', '160 linear feet of drainage with 14 inlets/ connection points', 4730.00, 'sold', '2023-01-03', '2023-01-03 12:44:27'),
  (5625931, 18229619, '0003', 'rock drainage area', '5x5x3 drainage pit
5 feet down
5 feet wide
3 feet deep
backfilled with gravel

$560', '5x5', 560.00, 'sold', '2023-01-03', '2023-01-03 12:47:39'),
  (5625966, 18229619, '0004', '1 stump grind of large palm', NULL, 'stump grind of large palm
$250', 250.00, 'sold', '2023-01-03', '2023-01-03 12:52:04'),
  (5626699, 8458328, '0001', 'drainage work', NULL, NULL, 1098.00, 'pending', '2023-01-03', '2023-01-03 16:20:35'),
  (5632442, 14557511, '0004', 'Change Order 0006', NULL, NULL, 19730.00, 'pending', '2023-01-05', '2023-01-05 11:21:09'),
  (5637087, 14835589, '0008', 'Mulch Upgrade', 'Medium bark mulch with weed barrier in planters', NULL, 985.00, 'pending', '2023-01-06', '2023-01-06 15:30:29'),
  (5649532, 17970867, '0003', 'Credit for missing plants', '30 5 gallons in contract
28 installed 
43.50 x 2 = $87', NULL, -87.00, 'pending', '2023-01-11', '2023-01-11 16:16:09'),
  (5649538, 17970867, '0004', 'Credit for pilasters/increase in concrete amount', 'Removing pilasters from contract 
$3,198
additional concrete/demo work', NULL, -1462.00, 'pending', '2023-01-11', '2023-01-11 16:17:53'),
  (5649646, 27174801, '0001', 'Design Credit', 'Credit from the design contract', NULL, -500.00, 'pending', '2023-01-11', '2023-01-11 17:22:28'),
  (5649648, 27174801, '0002', 'Lighting Credit, Lighting taken out of contract', NULL, NULL, -3810.00, 'pending', '2023-01-11', '2023-01-11 17:24:04'),
  (5649652, 27174801, '0003', 'Wall 42 LF more at 18" average', '42 Linear feet additional wall averageing 18" high X $115.00 a linear foot= $4,830.00', NULL, 4830.00, 'pending', '2023-01-11', '2023-01-11 17:27:07'),
  (5649655, 27174801, '0004', 'Pavers additional 48 SF', '48 linear feet of additional pavers, X $15.25', NULL, 732.00, 'pending', '2023-01-11', '2023-01-11 17:29:58'),
  (5650656, 26913236, '0001', 'Additional lights', 'Approved via text', NULL, 1920.00, 'pending', '2023-01-12', '2023-01-12 07:59:22'),
  (5650667, 26913236, '0002', 'Gravel upgrade', NULL, NULL, 665.00, 'sold', '2023-01-12', '2023-01-12 08:01:13'),
  (5650670, 26913236, '0003', 'Additional 50 1-gal boxwoods', NULL, NULL, 1075.00, 'sold', '2023-01-12', '2023-01-12 08:01:39'),
  (5655055, 17948081, '0001', 'Added Demo', NULL, NULL, 3200.00, 'pending', '2023-01-13', '2023-01-13 09:15:21'),
  (5656182, 26864979, '0003', 'Additional plants/mulch', '(1) 5 gallon leucadendron for corner
(1) 5 gallon agave Americana for in front of window
(6) 1 gallon Sea Lavender 
(1) 5 gallon Yucca golden sword 
(1) 5 gallon Aloe

(1) yard shredded mulch', NULL, 500.00, 'sold', '2023-01-13', '2023-01-13 12:21:36'),
  (5656391, 26864979, '0004', 'Credit for irrigation valve', NULL, NULL, -900.00, 'sold', '2023-01-13', '2023-01-13 12:55:41'),
  (5656562, 18160239, '0002', '22 linear feet of bender board', 'To hold DG in along the side where the fence has gapping', NULL, 180.00, 'pending', '2023-01-13', '2023-01-13 13:33:36'),
  (5658837, 18116724, '0002', 'Plant Credit', 'Credit for a 5 Gallon Strawberry tree', NULL, -23.50, 'sold', '2023-01-16', '2023-01-16 08:30:51'),
  (5658843, 18116724, '0003', 'Plant Upgrade', 'Charge for 15 Gallon Strawberry tree', NULL, 150.00, 'sold', '2023-01-16', '2023-01-16 08:31:51'),
  (5659914, 18028569, '0001', 'Additional.pavers. walkway. 243 sf', NULL, NULL, 3754.35, 'pending', '2023-01-16', '2023-01-16 11:13:27'),
  (5664005, 26883189, '0001', 'Saw cut 62 LF', 'Saw cut 62 LF of 4" concrete on neighbors side.
Along house complementary per Jorge.', NULL, 465.00, 'sold', '2023-01-17', '2023-01-17 11:03:26'),
  (5664025, 26883189, '0002', 'Drainage', '(5) inlets @ $65/each= $325
(1) popup $50
65 LF 3" SDR pvc pipe $1,400', NULL, 1775.00, 'sold', '2023-01-17', '2023-01-17 11:05:48'),
  (5664029, 26883189, '0003', 'One tall lodge pole for hopseed tree', NULL, NULL, 100.00, 'sold', '2023-01-17', '2023-01-17 11:06:08'),
  (5665008, 12436689, '0001', 'Permitting allowance', 'Allowance for Permitting.
We will share permit cost with you and our billed hours (@$120/hr.) then we will credit back the difference.
Public Works permits are faster than going through planning so shouldn''t be that bad. Thank you!', NULL, 1500.00, 'sold', '2023-01-17', '2023-01-17 13:11:37'),
  (5666087, 18160239, '0003', 'Credit for 10 linear of bender board', NULL, NULL, -80.00, 'sold', '2023-01-17', '2023-01-17 17:46:40'),
  (5666108, 18160239, '0004', 'Credit for Plants', '15 gallon for 5 gallon
(2) 1 gallon plants 
(1) 5 gallon plant
(2) 4" plants', NULL, -200.00, 'sold', '2023-01-17', '2023-01-17 17:56:19'),
  (5668376, 27291924, '0001', 'Drainage (Back and Front)', 'Backyard adding a drainage run from corner of garden bed near pathway (with 1 inlet) to drain beneath small boulders (with 1 catch basin)
Frontyard we will be reshaping existing dry creek to create better drainage pathway using existing gravels/rocks', NULL, 1100.00, 'pending', '2023-01-18', '2023-01-18 10:23:32'),
  (5668381, 27291924, '0002', '(4) 1 gallon plants front garden bed', '(4) Dianella ''Lil Rev''', NULL, 88.00, 'pending', '2023-01-18', '2023-01-18 10:24:11'),
  (5669681, 26883189, '0004', 'Credit for fountain', 'We are not doing the fountain in this phase.  Maybe in Phase 3.', NULL, -2100.00, 'sold', '2023-01-18', '2023-01-18 13:30:42'),
  (5669726, 26883189, '0005', 'Japanese Maple 24" box - actual', 'Material costs in estimate - $150
Actual cost of Bloodgood Maple - $250', NULL, 100.00, 'sold', '2023-01-18', '2023-01-18 13:37:20'),
  (5678663, 26883189, '0006', 'Additional 12 LF of Drain pipe', NULL, NULL, 250.00, 'sold', '2023-01-21', '2023-01-21 12:05:49'),
  (5678667, 26883189, '0007', 'Credit for plants', 'Credit: $865

Maple original cost($385) + approved maple change order($100) = $485
4 (1 gallon) Sea Thrift = $100
4 (5 gallon) Kalanchoe bracteata (Silver teaspoons) = $180
3 (1 gallon) Echinacea angustifolia = $75
2 - 4" Large Italian Basil = $25', NULL, -865.00, 'sold', '2023-01-21', '2023-01-21 12:11:31'),
  (5681484, 27344499, '0001', 'Lighting', 'Add 2 additional ground lights', NULL, 500.00, 'sold', '2023-01-23', '2023-01-23 11:19:11'),
  (5681491, 27344499, '0002', 'Paver step', 'Build step along patio section- 18LF', NULL, 990.00, 'sold', '2023-01-23', '2023-01-23 11:20:08'),
  (5681509, 27344499, '0003', 'Bending Board', NULL, NULL, -448.00, 'sold', '2023-01-23', '2023-01-23 11:21:52'),
  (5682536, 12478911, '0005', 'Concrete/Turf steps + drainage', '224 sq ft of concrete $4592
135 additional linear feet of additional forming for turf strips $650
82 linear foot of turf strips at $23 per linear foot $1886
44 linear feet of drainage 5 inlets $1550
$8678', NULL, 8678.00, 'pending', '2023-01-23', '2023-01-23 13:47:03'),
  (5687054, 14175746, '0013', 'Concrete steps and landings', 'As per design plan', NULL, 4700.00, 'sold', '2023-01-24', '2023-01-24 14:03:27'),
  (5687056, 14175746, '0014', '(6) step lights', NULL, NULL, 1440.00, 'sold', '2023-01-24', '2023-01-24 14:03:54'),
  (5687066, 14175746, '0015', 'Irrigation drip line', '1 Zone', NULL, 1050.00, 'sold', '2023-01-24', '2023-01-24 14:05:44'),
  (5687847, 14584341, '0001', 'Credit for Removal of gate and track', 'Removal of gate/track/motor is not possible due to the severity of the system', NULL, -1245.00, 'pending', '2023-01-24', '2023-01-24 18:26:28'),
  (5687851, 14584341, '0002', 'Sewer Line', 'Lower the existing sewer line in the driveway.  The current condition it that is just under the surface of the concrete driveway.  Needs to be lowered by 12'' below grade', NULL, 1460.00, 'pending', '2023-01-24', '2023-01-24 18:29:28'),
  (5690917, 27174801, '0005', 'Additional 505sq. Gravel', NULL, NULL, 1439.00, 'sold', '2023-01-25', '2023-01-25 13:05:02'),
  (5690928, 27174801, '0006', 'Additional plants', '10- 1.gal.
2- 15.gal.
12- 5gal.', NULL, 1037.00, 'pending', '2023-01-25', '2023-01-25 13:06:11'),
  (5691802, 26913236, '0004', '400sq. Brown shredded mulch', NULL, NULL, 500.00, 'pending', '2023-01-25', '2023-01-25 16:33:15'),
  (5691804, 26913236, '0005', 'Price difference from Laurl Bay to Eugenia', NULL, NULL, 120.00, 'sold', '2023-01-25', '2023-01-25 16:34:29'),
  (5693607, 26913236, '0006', 'Credit on gravel upgrade', NULL, NULL, -665.00, 'pending', '2023-01-26', '2023-01-26 09:48:44'),
  (5694568, 26883189, '0008', '2 more path lights without bulbs', '2 matching path lights WITHOUT bulbs from Vista.', 'i already ordered with Jose Luis from Irrigation Express.', 440.00, 'sold', '2023-01-26', '2023-01-26 12:12:59'),
  (5695630, 14175746, '0016', 'Additional steps', NULL, NULL, 1071.00, 'sold', '2023-01-26', '2023-01-26 15:19:53'),
  (5695645, 14175746, '0017', 'Additional demo with sleeves', NULL, NULL, 878.00, 'sold', '2023-01-26', '2023-01-26 15:23:05'),
  (5695661, 14175746, '0018', 'Concrete sealer', NULL, NULL, 597.50, 'sold', '2023-01-26', '2023-01-26 15:27:22'),
  (5695672, 27174801, '0007', 'Credit for 3@ 15 gallon @$175.00. See contract.', 'See contract credit for 3 15gallon at $175.00 each', NULL, -525.00, 'pending', '2023-01-26', '2023-01-26 15:31:52'),
  (5695809, 18028569, '0002', 'Vertical border for some planters', '$12.00 @ LINEAR FOOT X 90 LINEAR FEET= $1,080.00', NULL, 1080.00, 'pending', '2023-01-26', '2023-01-26 16:30:00'),
  (5698569, 27174801, '0008', 'CREDIT half pallet pavers', NULL, NULL, -148.59, 'pending', '2023-01-27', '2023-01-27 12:34:40'),
  (5699752, 14175746, '0019', '660sqft Turf install', 'Turf prep 
	Install 2” of class II roadbase, compact
	Install 1” of DG subbase, compact
	Install roughly 660sqft of turf (turf to be ordered by client/price of the turf not included in total cost)
	Stake, staple and S seam all joints 
	Install bender board for approx 20 linear feet to separate tree in front yard from turf
	Install bender board for new shrub for top left slope  roughly 20 linear feet', NULL, 7000.00, 'sold', '2023-01-27', '2023-01-27 17:37:33'),
  (5699754, 14175746, '0020', '1 zone Irrigation for front yard', NULL, NULL, 1050.00, 'sold', '2023-01-27', '2023-01-27 17:39:42'),
  (5704732, 27317498, '0001', 'credit for removal of fountain credit', 'Removal of waterfall feature. 
Installing new prefab water feature.', 'Removal of waterfall feature. 
Installing new prefab water feature.', -5600.00, 'pending', '2023-01-30', '2023-01-30 16:34:57'),
  (5704736, 27716394, '0001', 'Design Credit', 'Prodigy Design credit for installation.', NULL, -750.00, 'pending', '2023-01-30', '2023-01-30 16:36:05'),
  (5704737, 27317498, '0002', 'New plumbing', '51 linear feet of copper plumbing at $55 per lnear foot', NULL, 2805.00, 'sold', '2023-01-30', '2023-01-30 16:36:05'),
  (5704748, 27317498, '0003', 'Additional turf changes', 'New estimated turf amount is 225 sq ft (60 sq ft more than contracted amount at 17 per sq ft', NULL, 1020.00, 'sold', '2023-01-30', '2023-01-30 16:40:03'),
  (5709445, 27799214, '0001', 'Downsizing agapanthus', 'Cost in contract is added incorrectly

Will credit $1165. 50

Brings contract for backyard to $21,551. 50', NULL, -1165.50, 'pending', '2023-01-31', '2023-01-31 22:33:28'),
  (5710020, 14584341, '0003', 'Paver Sealer', 'Apply sealer for the Driveway pavers.  This is only for the main driveway..for both driveways it will be an additional $450.00', NULL, 450.00, 'sold', '2023-02-01', '2023-02-01 07:06:29'),
  (5712975, 27369533, '0001', '(37) gopher baskets', NULL, NULL, 335.00, 'pending', '2023-02-01', '2023-02-01 16:15:06'),
  (5713005, 14175746, '0021', '3% cc', NULL, NULL, 190.00, 'pending', '2023-02-01', '2023-02-01 16:38:48'),
  (5716519, 27816112, '0001', 'Alumawood additions', 'Install (4) recessed lighting fixtures.

Install ceiling fan fixture.

Install one outlet.

Install 2 light switches.', NULL, 2122.00, 'sold', '2023-02-02', '2023-02-02 14:43:10'),
  (5716881, 14584341, '0004', 'Paver Sealer 2nd Driveway', NULL, NULL, 450.00, 'sold', '2023-02-02', '2023-02-02 16:37:02'),
  (5718645, 13262395, '0006', 'CREDIT - SHOWER WALL AND HOT SYSTEM', NULL, NULL, -7446.00, 'pending', '2023-02-03', '2023-02-03 10:17:25'),
  (5719929, 27315145, '0001', 'Credit for 1 Irrigation Valve', 'No need for the additional valve', NULL, -1050.00, 'sold', '2023-02-03', '2023-02-03 14:35:05'),
  (5719958, 27315145, '0002', 'Additional Irrigation Supplies', 'Additional 4 Stations for Rachio ($424.00)

Install new 1" main Pressure Regulator plus Pressure Relief Valve for Water main ($635.00)

Run new irrigation wire from front irrigation valves to the backyard ($225.00)', NULL, 1284.00, 'sold', '2023-02-03', '2023-02-03 14:43:21'),
  (5719986, 27315145, '0003', 'Additional Scope of work', 'Add (5) Flood Lights  ($1,125.00)
Add (2) 24" box trees ($770.00)
Add (17) 5 Gallon plants ($739.50)
Saw cut and demo concrete by corner of house ($725.00)', NULL, 3359.50, 'sold', '2023-02-03', '2023-02-03 14:51:48'),
  (5729188, 17948081, '0002', 'New Wall and compaction', NULL, '3150 for wall
300 for compaction', 3450.00, 'pending', '2023-02-07', '2023-02-07 16:08:02'),
  (5729195, 17948081, '0003', 'additional black rock added 673 sq ft', 'Additonal rock installed 
673 sq ft more than contracted amount', NULL, 1768.25, 'pending', '2023-02-07', '2023-02-07 16:11:03'),
  (5732044, 27799214, '0002', 'Phase 2 - Front Yard landscape', NULL, NULL, 13655.00, 'pending', '2023-02-08', '2023-02-08 11:47:54'),
  (5734830, 27971242, '0001', 'Rachio Smart Timer', NULL, NULL, 435.00, 'pending', '2023-02-09', '2023-02-09 07:33:27'),
  (5737296, 14175746, '0022', '11 lights', NULL, NULL, 2640.00, 'pending', '2023-02-09', '2023-02-09 14:31:59'),
  (5737750, 27317498, '0004', 'Credits/ additional change orders', '1- credit of 40 sq ft of putting green at $17 a sq ft  $-680
2- adding 61 sq. Feet concrete  + demo of 61 down 7 inches +814
3- adding 4 LF. Of curb  $+160
4- 8 LF. Of steps $+520
5- adding 2 more lights $+480
Credit 80 LF of drainage @25 a linear ft -2000

total credit $-716', NULL, -706.00, 'pending', '2023-02-09', '2023-02-09 16:45:47'),
  (5740994, 27770234, '0001', 'Credit for Conduit and Irrigation', NULL, NULL, -1450.00, 'sold', '2023-02-10', '2023-02-10 14:31:04'),
  (5740999, 27770234, '0002', 'Add''l Pavers for Outside of Gate Entry', 'For 16sqft', NULL, 292.00, 'sold', '2023-02-10', '2023-02-10 14:32:50'),
  (5741002, 27770234, '0003', 'Upgrading Paver Selection to Castle Cobble', 'For 245sqft (pavers within the gate entry)', NULL, 800.00, 'sold', '2023-02-10', '2023-02-10 14:33:31'),
  (5741006, 27770234, '0004', 'Paver Sealant for 261sqft', 'semi gloss', NULL, 450.00, 'sold', '2023-02-10', '2023-02-10 14:35:00'),
  (5741077, 27799214, '0003', 'Additional light for vine', NULL, NULL, 240.00, 'sold', '2023-02-10', '2023-02-10 14:59:42'),
  (5741087, 27799214, '0004', 'Removal of three lights for front yard - 720', NULL, NULL, -720.00, 'pending', '2023-02-10', '2023-02-10 15:04:12'),
  (5741088, 27799214, '0005', 'Downsizing 24g fruit to 15g', NULL, NULL, -500.00, 'pending', '2023-02-10', '2023-02-10 15:04:58'),
  (5741768, 27770234, '0005', 'Paver Sealer Description', 'Change from semi-gloss to wet look', NULL, 0, 'pending', '2023-02-12', '2023-02-12 09:45:59'),
  (5741989, 18063939, '0002', 'Extra plants (credit)', '(9) 5 gallons

(1) 24 inch box', NULL, -777.00, 'sold', '2023-02-12', '2023-02-12 15:34:21'),
  (5742190, 18063939, '0003', 'Front entry steps', 'Extend front entry way for step pad. Total 26 LF', NULL, 1430.00, 'sold', '2023-02-12', '2023-02-12 19:50:43'),
  (5742191, 18063939, '0004', 'Stump removal', NULL, NULL, 250.00, 'sold', '2023-02-12', '2023-02-12 19:51:00'),
  (5742662, 14175746, '0023', 'Additional 4 ground lights', NULL, NULL, 1000.00, 'sold', '2023-02-13', '2023-02-13 06:45:16'),
  (5743187, 27799214, '0006', 'Backyard items', 'Rock upgrade +175
Irrigation timer 8 station +400
Removal of transformer - 437', NULL, 212.00, 'sold', '2023-02-13', '2023-02-13 08:24:09'),
  (5743913, 27773845, '0001', 'Smart timer', NULL, NULL, 450.00, 'pending', '2023-02-13', '2023-02-13 10:20:39'),
  (5743931, 27773845, '0002', 'Move hose bib 10 LF', NULL, NULL, 250.00, 'pending', '2023-02-13', '2023-02-13 10:23:20'),
  (5744316, 27773845, '0003', 'Adding one netafim drip zone.', NULL, NULL, 950.00, 'pending', '2023-02-13', '2023-02-13 11:17:48'),
  (5748137, 27773845, '0004', '1 1/4"Conduit 176 LF with 6 wires', 'Old costs for electrical runs:
100 LF of 3/4" conduit with (6) 12 gauge wires (no breakers) = $4,550

New costs:
176 LF of 1 1/4" conduit with (6) 12 gauge wires, junction box and 2 breakers = $9,176

Cost difference (change order charged above): $4,926', NULL, 4926.00, 'sold', '2023-02-14', '2023-02-14 09:38:43'),
  (5748143, 27773845, '0005', '60 LF of 1 1/4" EMT', '60 LF of EMT', NULL, 1700.00, 'sold', '2023-02-14', '2023-02-14 09:39:40'),
  (5748374, 27770234, '0006', 'Upgrading pavers to Belgard Toscana', NULL, NULL, 200.00, 'sold', '2023-02-14', '2023-02-14 10:14:19'),
  (5749169, 18063939, '0005', 'Bougainvilleas', '(2) 15 gal Bougainvillea', NULL, -300.00, 'sold', '2023-02-14', '2023-02-14 12:04:15'),
  (5749229, 18063939, '0006', 'Parkway plants', 'Install (8) 5 gallon Agave Americana 
Install (4) 24 gallon multi olives
Install(3) 5 gallon Mexican Fence post
Install (2) 15-gallon fire sticks', NULL, 2715.00, 'sold', '2023-02-14', '2023-02-14 12:14:31'),
  (5749870, 13433560, '0007', 'Credit check issued (Do not pay)', NULL, NULL, 600.00, 'pending', '2023-02-14', '2023-02-14 13:53:52'),
  (5752536, 12436689, '0002', 'Credit for permit', NULL, NULL, -945.00, 'pending', '2023-02-15', '2023-02-15 09:49:16'),
  (5753783, 27773845, '0006', 'Design Credit', NULL, NULL, -500.00, 'sold', '2023-02-15', '2023-02-15 12:56:04'),
  (5756237, 27773845, '0007', 'Credit for moving boulders aside', '-$300 credit for removing boulders and setting aside

$300 needed in budget to move boulders back to front yard with wheelbarrow', NULL, -300.00, 'sold', '2023-02-16', '2023-02-16 08:27:04'),
  (5756243, 27773845, '0008', 'Credit for Roses', NULL, NULL, -500.00, 'sold', '2023-02-16', '2023-02-16 08:28:09'),
  (5756268, 27773845, '0009', 'credit removal of link fence- no posts or footings', NULL, NULL, -300.00, 'sold', '2023-02-16', '2023-02-16 08:31:10'),
  (5756287, 27773845, '0010', 'Credit removal of jade', NULL, NULL, -40.00, 'sold', '2023-02-16', '2023-02-16 08:33:37'),
  (5757462, 27770234, '0007', 'stump grind roots of Jacaranda Tree', NULL, NULL, 450.00, 'sold', '2023-02-16', '2023-02-16 11:43:51'),
  (5757988, 27799214, '0007', 'Additional plants', '26 1 gallon plants at 21.50 each (18 planted now, 8 later )
7 5gallon plants at 43.50 each 
1 15 gallon plant at 150 
Transplanting plants $50


Original plant quote in Contract is 976

New amount is 1063.50

Difference of 
$87.50', NULL, 87.50, 'pending', '2023-02-16', '2023-02-16 13:00:48'),
  (5757994, 27799214, '0008', 'Transformer', 'New transformer', NULL, 437.00, 'pending', '2023-02-16', '2023-02-16 13:02:14'),
  (5758784, 27799214, '0009', 'CREDIT 6 plants 5gal to 1gal', NULL, NULL, -132.50, 'pending', '2023-02-16', '2023-02-16 16:11:45'),
  (5758915, 27317498, '0005', 'Additional items', 'Rock boulders +430
Additional electrical run +640', NULL, 1070.00, 'pending', '2023-02-16', '2023-02-16 17:13:18'),
  (5759166, 27375049, '0001', 'Design credit', NULL, NULL, -750.00, 'pending', '2023-02-16', '2023-02-16 22:38:35'),
  (5765874, 27317498, '0006', 'Additional Lighting 8 lights', '8 lights at 240 each', NULL, 1920.00, 'pending', '2023-02-20', '2023-02-20 12:16:34'),
  (5766034, 27317498, '0007', 'Planting/mulch difference', '16 creeping fig 5 gallon at $50  each
22 1 gallon lirope at 25 each
12 5 gallon maori queen at $50 each 
4 5 gallon purple lantana at $50  each
13 5 gallon bush jasmine at $50 each
1 15 gallon japanese maple tree at 315 each
10 5 gallon white gardenia at $50 each
6 1 gallon coral bells at 25 each
2 15 gallon pygmy palms at 315 each
12 1 gallon white acopa at 25 each
11 5 gallon pink kangaroo paw $50 each
1 1/2 flats succulents $125
1 5 gallon night blooming jasmine at $50
4 lavender hidcote at $50 each


71  total 5 gallons =3550
40 1 gallon plants =860
3 15 gallon ornamentals =945
1 1/2 flats of succulents = 125
5 linear feet of channel drains at 80 per lf = 400



Iniital proposed amount 7588 of planting 

credit of', NULL, -2599.00, 'pending', '2023-02-20', '2023-02-20 12:45:43'),
  (5766068, 27317498, '0008', 'mulch to rock difference', '$875 of mulch originally allocated for 350 sq ft

new total is 580 sq ft of decorative rock at 3.85 a sq ft $2233', NULL, 1358.00, 'pending', '2023-02-20', '2023-02-20 12:51:14'),
  (5773965, 27773845, '0011', 'Credit for mailbox column', 'Line item #3 under pilasters
Not doing', NULL, -822.00, 'sold', '2023-02-22', '2023-02-22 11:07:38'),
  (5774801, 27773845, '0012', 'Credit for fountain', 'not doing the fountain, not demo, not providing river rock.

(Outlet install is under Utilities)', 'we are not to move the fountain or help with fountain in any way.  No digging, no install.', -2400.00, 'sold', '2023-02-22', '2023-02-22 13:10:09'),
  (5777153, 27317498, '0009', 'Additional 9 lights', 'Total of lights installed 31
14 lights in contact 
Additional 8 lights on 2/20/2023
Additional 9 lights on 2/22/2023', NULL, 2160.00, 'pending', '2023-02-23', '2023-02-23 08:28:38'),
  (5777645, 27941145, '0001', 'Drains', 'Tie Downspouts into (2) 3” drains with pop ups into the yard beyond concrete', NULL, 1000.00, 'sold', '2023-02-23', '2023-02-23 09:41:10'),
  (5778699, 14175746, '0024', 'Plant Install', '(5) Leucadendron 
(4) Cordyline', NULL, 200.00, 'sold', '2023-02-23', '2023-02-23 12:24:02'),
  (5783556, 17944004, '0001', 'shape of turf add 115 SF', 'Each piece is 16'' long by x wide.  In order to get the shape of your design, we need an extra 115 SF of turf. This does not include the 10% overage which is included in our costs.', NULL, 1750.00, 'pending', '2023-02-24', '2023-02-24 17:01:15'),
  (5805259, 12162722, '0006', 'Electrical repair', NULL, NULL, 280.00, 'pending', '2023-03-03', '2023-03-03 14:21:47'),
  (5805331, 27716394, '0002', 'Extra Demo', '1- Demo concrete water feature dispose. $2800

2- 904 sq.  extra demo/grading of soil $6000.', NULL, 8800.00, 'sold', '2023-03-03', '2023-03-03 14:46:07'),
  (5805334, 27716394, '0003', '100 LF. New main water line for irrigation', NULL, NULL, 2600.00, 'sold', '2023-03-03', '2023-03-03 14:47:12'),
  (5805336, 27716394, '0004', 'Adding 1 step at 12 LF.', NULL, NULL, 780.00, 'sold', '2023-03-03', '2023-03-03 14:48:28'),
  (5805342, 27716394, '0005', 'Additional drainage 38 LF.', 'Moving drain from the step and drain in ti planter', NULL, 950.00, 'sold', '2023-03-03', '2023-03-03 14:50:23'),
  (5805423, 14175746, '0025', 'Add on''s', 'Adding 1-2 inch mexican buff with weed fabric front and back yard.
Additional bend a board.', NULL, 2750.00, 'sold', '2023-03-03', '2023-03-03 15:31:53'),
  (5805513, 14175746, '0026', 'Upgrade rock', NULL, NULL, 1560.00, 'sold', '2023-03-03', '2023-03-03 16:41:52'),
  (5810156, 27773845, '0013', 'Lights for columns', '7 lights for columns labor only.', NULL, 490.00, 'sold', '2023-03-06', '2023-03-06 13:40:14'),
  (5818245, 14175746, '0027', 'Additional light', NULL, NULL, 250.00, 'sold', '2023-03-08', '2023-03-08 11:57:35'),
  (5818687, 12478911, '0006', 'change orders', '1100 sq ft of rtf sod at 3.75 per sq ft $4125
adjustment of sprinkler $40
benderboard $225', NULL, 4390.00, 'pending', '2023-03-08', '2023-03-08 12:55:02'),
  (5821379, 28098770, '0001', 'Part 2 payment (pay this)', NULL, NULL, 9336.69, 'pending', '2023-03-09', '2023-03-09 08:28:55'),
  (5821387, 28098770, '0002', 'Credit (balance to remain from invoice 0002)', NULL, NULL, -9336.69, 'pending', '2023-03-09', '2023-03-09 08:30:08'),
  (5823950, 28280277, '0001', 'upgrade to 3/8" Del Rio gravel for pathway', '165 SF 3/8" del rio gravel', NULL, 80.00, 'sold', '2023-03-09', '2023-03-09 15:02:03'),
  (5827125, 28088643, '0001', 'Design', NULL, NULL, 1700.00, 'pending', '2023-03-10', '2023-03-10 13:17:26'),
  (5830523, 17944004, '0002', 'Credit for brick wall', NULL, NULL, -500.00, 'pending', '2023-03-13', '2023-03-13 10:31:01'),
  (5830527, 17944004, '0003', 'Credit for 2 stump grinds', NULL, NULL, -250.00, 'pending', '2023-03-13', '2023-03-13 10:31:52'),
  (5830529, 17944004, '0004', 'Credit for removing trees', NULL, NULL, -426.00, 'pending', '2023-03-13', '2023-03-13 10:32:15'),
  (5830535, 17944004, '0005', 'Add 20 feet brown Bender board', NULL, NULL, 175.00, 'pending', '2023-03-13', '2023-03-13 10:33:25'),
  (5830539, 17944004, '0006', 'Add 250 SF POLYSAND', NULL, NULL, 445.00, 'pending', '2023-03-13', '2023-03-13 10:33:54'),
  (5830546, 17944004, '0007', 'Credit cap for flagstone bbq', NULL, NULL, -300.00, 'pending', '2023-03-13', '2023-03-13 10:34:26'),
  (5830550, 17944004, '0008', 'Install new irrigation timer', 'client purchased timer, this is for installation only', NULL, 50.00, 'pending', '2023-03-13', '2023-03-13 10:34:58'),
  (5830592, 17944004, '0009', 'outdoor weatherproof outlet', NULL, NULL, 140.00, 'pending', '2023-03-13', '2023-03-13 10:42:50'),
  (5832858, 27863561, '0001', 'Replacement Irrigation Valves', 'Switch (2) valves out and add drip to middle planter', NULL, 550.00, 'pending', '2023-03-13', '2023-03-13 17:33:41'),
  (5832861, 27863561, '0002', 'Removing gravel against the house', NULL, NULL, 300.00, 'pending', '2023-03-13', '2023-03-13 17:34:13'),
  (5832910, 27317498, '0010', 'Additional turf', NULL, NULL, 2640.00, 'pending', '2023-03-13', '2023-03-13 18:08:02'),
  (5832915, 27317498, '0011', 'Repair fence', NULL, NULL, 468.00, 'sold', '2023-03-13', '2023-03-13 18:10:11'),
  (5836996, 13043432, '0001', 'Design Revisions', '1) Pool- moved away from house, changed orientation, added spa
2) Moved shower location
3) Shifted decking and steppers
4) Removed sauna', NULL, 200.00, 'pending', '2023-03-14', '2023-03-14 15:12:25'),
  (5844799, 12608924, '0047', 'Plants - March 2023', '(2) 5g Rosmarinus officinalis
(5) 5g Lavandula angustifolia', NULL, 400.00, 'sold', '2023-03-16', '2023-03-16 13:25:10'),
  (5845480, 27375049, '0002', 'Plants', 'Add (2) 15 gallon plants to the backyard pots
Add (3) 5 gallon plants to the DG planter', NULL, 385.00, 'pending', '2023-03-16', '2023-03-16 16:08:58'),
  (5848588, 27773845, '0014', 'Bellacrete Modern Pilaster Cap', '9 - 26" x 26" Modern Bellacrete Pilaster Caps

Original material option was for a 16-24" cap at $25 material allowance per cap.  These are $100 each with a discount on our markup (as I know this is mid-project).', NULL, 700.00, 'sold', '2023-03-17', '2023-03-17 14:37:53'),
  (5848791, 12478911, '0007', 'Turf', '92 Sq ft of turf 75x6 man hours 105 Sq ft ordered at 4.25 a sq ft50 dollars in base$25 nails$971', NULL, 971.00, 'sold', '2023-03-17', '2023-03-17 16:18:48'),
  (5848813, 12478911, '0008', 'Front yard planting', 'OPTION 1
4 15 gallon colored roses at 225 each
14 15 gallon iceburg roses at 175 each
20 1 gallon bacopa at 21.50 each
20 5 gallon lavender hidcote at 43. 50 each
16 5 gallon penstemon tbd at 43.50 each
Removal of existing plants at 300
1 new zone of drip rrigation at 950
Mulch  with weed fabric 240
$6836

OPTION 2 (Price for less mature roses)
14 5 gallon ice burgs at 43.50
4 5 gallon colored roses at 65 each
$3486', NULL, 6836.00, 'sold', '2023-03-17', '2023-03-17 16:48:21'),
  (5856688, 28280277, '0002', 'Drain repair', NULL, NULL, 175.00, 'sold', '2023-03-21', '2023-03-21 11:24:13'),
  (5856694, 28280277, '0003', 'Berm labor - 2 hours credit', NULL, NULL, -150.00, 'sold', '2023-03-21', '2023-03-21 11:24:49'),
  (5856700, 28280277, '0004', 'Remove palm tree', NULL, NULL, 80.00, 'sold', '2023-03-21', '2023-03-21 11:25:23'),
  (5857097, 28280277, '0005', 'Credit 2 hours lighting', NULL, NULL, -150.00, 'sold', '2023-03-21', '2023-03-21 12:11:29'),
  (5857295, 28280277, '0006', 'Additional planting (not in contract)', 'LABOR ONLY!

85 (1gal) in contract, we have 139 (1gal) in total + 2 (2gal) = qty difference is 56 (1gal) @ $12/each = $672
 
1 - 15 gallon @ $50/each = $50

 

3 (5gal) in contract, we have 7 (5gal) in total = qty difference is 4 (5gal) @ $20/each = $80

 

2 - 2 gallon - included in 1 gallons above!', NULL, 802.00, 'sold', '2023-03-21', '2023-03-21 12:36:48'),
  (5858352, 12608924, '0048', 'DG correction after rains', '- Demo and install new Decomposed granite, approx. 1,000 SF at 2" depth. Grade towards drains, add or reposition one drain near flow. $4,500
- Remove and reuse bender board in DG area to sit above final grade as much as possible. Approx. 75 LF - Labor only $300
- Replace (courtesy of manufacturer) X LF of benderboard in areas where paint has worn off. (no charge)
- Install 6 CY mulch throughout property. $800
- Weeding. $150
- Install 80 SF of sod. $320
- Remove and reuse bender board nearest veggie beds and clean up mulch that has spilled over. (no charge)', NULL, 6070.00, 'sold', '2023-03-21', '2023-03-21 16:02:52'),
  (5860977, 28280277, '0007', 'Plant 2 flats', NULL, NULL, 42.00, 'sold', '2023-03-22', '2023-03-22 10:17:13'),
  (5861584, 27799214, '0010', 'Additional 6- 5 gal', NULL, NULL, 321.50, 'sold', '2023-03-22', '2023-03-22 11:36:57'),
  (5861590, 27799214, '0011', '2 additional lights', NULL, NULL, 500.00, 'pending', '2023-03-22', '2023-03-22 11:37:53'),
  (5861608, 27799214, '0012', 'Trans-plant 2 plants', 'We do not warranty transplanted plants', NULL, 95.00, 'pending', '2023-03-22', '2023-03-22 11:39:48'),
  (5878812, 27770234, '0008', 'Paver Sealer', 'Homeowner is declining the sealant at this time. Daniel go ahead and approve this negative change order and we will proceed with finishing out the financials. Thank you!', NULL, -450.00, 'sold', '2023-03-28', '2023-03-28 11:19:06'),
  (5883766, 28374487, '0001', 'Additional Plants', '(1) 36" multi Arbutus marina 
(2) 15 gallon Abelia grandiflora', NULL, 1500.00, 'pending', '2023-03-29', '2023-03-29 12:17:09'),
  (5886791, 18063939, '0007', 'Additional plants', '5- 5gal. Westragea
5- 1gal. Rosemary pastrada', NULL, 353.00, 'sold', '2023-03-30', '2023-03-30 09:09:19'),
  (5886843, 18063939, '0008', 'Gravel and mulch', NULL, NULL, 259.00, 'sold', '2023-03-30', '2023-03-30 09:21:12'),
  (5888709, 14175746, '0028', 'Remove and reinstall turf in back yard', NULL, NULL, 1000.00, 'sold', '2023-03-30', '2023-03-30 14:15:06'),
  (5892604, 27716394, '0006', 'Additional paver', NULL, NULL, 999.00, 'sold', '2023-03-31', '2023-03-31 11:38:24'),
  (5893762, 27863561, '0003', 'Credit for Design', NULL, NULL, -300.00, 'pending', '2023-03-31', '2023-03-31 16:57:36'),
  (5896168, 27159351, '0001', 'Add weed barrier', '245 SF weed barrier', NULL, 185.00, 'pending', '2023-04-03', '2023-04-03 09:37:12'),
  (5896172, 27159351, '0002', 'Add 4 LF sdr drain pipe and catch basin', NULL, NULL, 300.00, 'pending', '2023-04-03', '2023-04-03 09:37:55'),
  (5896186, 27159351, '0003', '27 LF timber minor retaining steps', NULL, NULL, 861.00, 'pending', '2023-04-03', '2023-04-03 09:39:59'),
  (5896190, 27159351, '0004', 'Vine credit', NULL, NULL, -200.00, 'pending', '2023-04-03', '2023-04-03 09:40:16'),
  (5896196, 27159351, '0005', 'Cut white fence credit', NULL, NULL, -200.00, 'pending', '2023-04-03', '2023-04-03 09:40:59'),
  (5896266, 27159351, '0006', 'Adding planter wall 16 LF', NULL, NULL, 1200.00, 'pending', '2023-04-03', '2023-04-03 09:52:33'),
  (5899932, 28098770, '0003', 'Credit', NULL, NULL, -21627.30, 'pending', '2023-04-04', '2023-04-04 08:08:48'),
  (5902880, 17944004, '0010', 'Adding (6) lights', 'Adding (5) path and (1) up light.', 'Same style, brightness, bulbs, spread as already purchased for this job.', 1440.00, 'pending', '2023-04-04', '2023-04-04 16:33:34'),
  (5902905, 28169218, '0001', 'Upgrade to 1/4" Mexican Beach Pebble', NULL, NULL, 150.00, 'sold', '2023-04-04', '2023-04-04 16:46:58'),
  (5902910, 18028569, '0003', 'Paver walkway and new proch', NULL, NULL, 2725.65, 'pending', '2023-04-04', '2023-04-04 16:48:10'),
  (5908748, 28098770, '0004', 'Additional turf', NULL, NULL, 2744.00, 'sold', '2023-04-06', '2023-04-06 09:09:32'),
  (5909257, 27816112, '0002', 'Permit fees', NULL, NULL, 1000.00, 'pending', '2023-04-06', '2023-04-06 10:34:58'),
  (5909264, 27816112, '0003', 'Additional 2 zones', NULL, NULL, 2000.00, 'pending', '2023-04-06', '2023-04-06 10:35:51'),
  (5909943, 27773845, '0015', 'CREDIT - 1 zone', NULL, NULL, -950.00, 'pending', '2023-04-06', '2023-04-06 12:28:57'),
  (5910939, 27159351, '0007', 'Add one more layer of planter wall 17 LF', NULL, NULL, 350.00, 'sold', '2023-04-06', '2023-04-06 16:12:22'),
  (5912909, 27816112, '0004', 'Add irrigation timer', NULL, NULL, 400.00, 'pending', '2023-04-07', '2023-04-07 12:34:14'),
  (5913283, 28098770, '0005', 'Part 4 (pay this)', NULL, NULL, 11381.85, 'pending', '2023-04-07', '2023-04-07 14:51:24'),
  (5913284, 28098770, '0006', 'Credit', NULL, NULL, -11381.85, 'pending', '2023-04-07', '2023-04-07 14:51:52'),
  (5918291, 11697068, '0008', 'irrigation repairs day 1', 'Recunduct 3 stations manifold 
Repair 1-1 inch pipe', NULL, 800.00, 'pending', '2023-04-11', '2023-04-11 07:17:07'),
  (5921860, 27716394, '0007', 'Upgrading the 5 tree sizes', 'From 15 gallon to 24" box The difference is $925.005 count.', NULL, 925.00, 'pending', '2023-04-11', '2023-04-11 19:23:43'),
  (5921912, 14124510, '0001', 'Design Credit', 'Credit for design', NULL, -375.00, 'pending', '2023-04-11', '2023-04-11 20:08:19'),
  (5922640, 28098770, '0008', 'Part 5 (pay this)', NULL, NULL, 6156.40, 'pending', '2023-04-12', '2023-04-12 06:42:58'),
  (5922659, 28098770, '0009', 'Credit', NULL, NULL, -6156.40, 'pending', '2023-04-12', '2023-04-12 06:47:10'),
  (5925441, 28581838, '0001', 'Demo Pick Up/Dump Fees', NULL, NULL, 1500.00, 'sold', '2023-04-12', '2023-04-12 13:57:24'),
  (5927649, 27602555, '0001', 'Mulch', '850 Sq ft of mulch at 1.25 a sq ft', NULL, 1062.00, 'sold', '2023-04-13', '2023-04-13 08:55:27'),
  (5927962, 28581838, '0002', 'Remove back retaining wall', 'Along very back of property', NULL, 3000.00, 'sold', '2023-04-13', '2023-04-13 09:50:01'),
  (5930052, 27863561, '0004', '8 additional Grevillea for the property line', NULL, NULL, 400.00, 'pending', '2023-04-13', '2023-04-13 18:31:33'),
  (5933371, 12478911, '0009', 'Steppers', 'Bellecrete called me back with the final pricing. The steppers cost $53 plus tax It''s going to be for a 18x24 stepping stone. We would charge $25 per stone installed. So 200 total for the install cost. 466.40 for material', NULL, 666.40, 'pending', '2023-04-14', '2023-04-14 16:00:48'),
  (5935547, 10751504, '0011', '3 new pathlights and glue one firepit cap', '3 new pathlight to replace 3 that broek, paid repair, the glass on the path lights were brokern   Lightcraft AP--C-2108-Amber
Also one of the firepit caps is loose, and needs to be glued back', NULL, 675.00, 'pending', '2023-04-17', '2023-04-17 08:45:06'),
  (5937665, 7748494, '0009', '13 SF of pavers', '3.5'' X 3.5= approximately 13 SF  Juventino said he would charge $300.00, they have pavers on site', NULL, 450.00, 'pending', '2023-04-17', '2023-04-17 14:00:58'),
  (5940179, 28581838, '0003', 'Retaining Wall/Shared With Neighbor', '4'' 6"H x 20 long CMU Block includes demo and haul out (no stucco)', NULL, 5000.00, 'sold', '2023-04-18', '2023-04-18 08:55:00'),
  (5940719, 27816112, '0005', 'Additional 186 sq. feet of sod', NULL, NULL, 372.00, 'sold', '2023-04-18', '2023-04-18 10:18:02'),
  (5940738, 27816112, '0006', 'Seal pavers', NULL, NULL, 924.00, 'sold', '2023-04-18', '2023-04-18 10:20:22'),
  (5944635, 17944004, '0011', 'Credit 1 light + Timer material', 'Credit for light - 240
Timer/Install  + 160', NULL, -80.00, 'pending', '2023-04-19', '2023-04-19 08:44:09'),
  (5954466, 27716394, '0008', 'Sod Credit, sod not installed', 'reduced the sod by 228 SF X $4.25= 969.00', NULL, -969.00, 'pending', '2023-04-21', '2023-04-21 12:42:16'),
  (5958053, 28631390, '0001', 'Ash Tree Stump Removal', 'grind out stump and roots for (2) stumps', NULL, 650.00, 'sold', '2023-04-24', '2023-04-24 10:41:11'),
  (5959379, 28581838, '0004', 'Outdoor Kitchen Extension', '9 linear feet of countertop and island additonal', NULL, 4350.00, 'sold', '2023-04-24', '2023-04-24 13:32:35'),
  (5959391, 28581838, '0005', 'Drainage Additional', 'We installed an additional 120 linear feet of drainage (100 linear feet on original contract)', NULL, 2800.00, 'sold', '2023-04-24', '2023-04-24 13:33:30'),
  (5960772, 27716394, '0009', 'Backfill veggie boxes and plant daylilies', 'The owner has provided daylilies', NULL, 500.00, 'sold', '2023-04-25', '2023-04-25 06:22:38'),
  (5961665, 28631390, '0002', 'Gopher Mesh + Baskets', 'mesh for roughly 500sqft
37 baskets for front yard (main area)', NULL, 1500.00, 'sold', '2023-04-25', '2023-04-25 08:45:44'),
  (5961747, 28631390, '0003', 'credit for (1) irrigation zone', NULL, NULL, -1050.00, 'sold', '2023-04-25', '2023-04-25 08:53:48'),
  (5961754, 28631390, '0004', 'Additional irrigation wire', NULL, NULL, 290.00, 'sold', '2023-04-25', '2023-04-25 08:54:07'),
  (5964961, 27395103, '0001', 'Design Credit', NULL, NULL, -750.00, 'pending', '2023-04-25', '2023-04-25 18:58:35'),
  (5966883, 28631390, '0005', 'Landscape tie steps for backyard', '(4) 4’ wide steps', NULL, 520.00, 'sold', '2023-04-26', '2023-04-26 09:58:15'),
  (5968656, 28581838, '0006', 'Additional square footage of stucco 208', NULL, NULL, 1393.60, 'sold', '2023-04-26', '2023-04-26 14:04:18'),
  (5968936, 28631390, '0006', '(1) 24” Pineapple Guava Tree', NULL, NULL, 385.00, 'sold', '2023-04-26', '2023-04-26 15:10:32'),
  (5969284, 28645809, '0001', 'credit for remote 3D portion of design', NULL, NULL, -200.00, 'sold', '2023-04-26', '2023-04-26 17:03:55'),
  (5973365, 27716394, '0010', 'Backfill boxes with veggie mix soil', NULL, NULL, 1000.00, 'pending', '2023-04-27', '2023-04-27 15:45:53'),
  (5974465, 11697068, '0009', 'Plants and irrigation', 'Replaced 1 shut-off valve
Replaced 1- pressure regulator 
With box
Planted 
13- 5 gal. Shurbs
14- 1 gal. Shurbs
2- flats ground cover
Irrigation included', NULL, 2268.40, 'pending', '2023-04-28', '2023-04-28 06:49:47'),
  (5979101, 12478911, '0010', 'Additional Plants', NULL, NULL, 151.50, 'pending', '2023-05-01', '2023-05-01 08:11:49'),
  (5979318, 12478911, '0011', 'Added Benderboard', NULL, NULL, 315.00, 'pending', '2023-05-01', '2023-05-01 08:45:52'),
  (5979998, 18229619, '0005', 'Credits', '(6) 5 gallon plants
1600sq ft of dg
$6,901', NULL, -6901.00, 'sold', '2023-05-01', '2023-05-01 10:34:48'),
  (5984245, 29073074, '0001', 'Mow straps and adding more drainage', 'Adding mow straps and drainage', NULL, 2726.00, 'pending', '2023-05-02', '2023-05-02 10:42:41'),
  (5986584, 28275243, '0001', 'Credits and misc changes', 'Credit of 7 lights $1680
Removal of 10 5 gallon little Johns $435
Breaking  two drain grates and adding two catch basins 12 inch$750
Adding 600 Sq ft of pea gravel from mulch$1200




Total credit $165', NULL, -165.00, 'pending', '2023-05-02', '2023-05-02 17:47:23'),
  (5990816, 13262395, '0007', 'CREDIT - POOL WALL', NULL, NULL, -23167.00, 'pending', '2023-05-03', '2023-05-03 15:16:51'),
  (5990930, 27905694, '0001', 'Permit Fees', NULL, NULL, 750.00, 'pending', '2023-05-03', '2023-05-03 15:46:58'),
  (5990945, 27905694, '0002', 'credits paver to turf', 'change order for going from pavers to turf -$335', NULL, -335.00, 'pending', '2023-05-03', '2023-05-03 15:50:08'),
  (5997418, 18229619, '0006', 'Additional Plants', 'Add (2) 5 Gallon Creeping Fig
Add (4) 15 Gallon Silver Sheen', NULL, 687.00, 'sold', '2023-05-05', '2023-05-05 10:05:55'),
  (5997427, 18229619, '0007', 'Irrigation Timer', 'Add 11 Station Rachio Irrigation Timer / 120’ of irrigation wire', NULL, 658.00, 'sold', '2023-05-05', '2023-05-05 10:07:53'),
  (5997440, 18229619, '0008', 'Sod Credit', 'Contracted for 3,150 sq ft
Installation of 2,420
  Difference of 730 sq ft', NULL, -2920.00, 'sold', '2023-05-05', '2023-05-05 10:11:24'),
  (6002331, 27651875, '0001', 'Miscellaneous', 'Clean out pool from water and debris

Clean up Misc pipe laying around in the backyard

Trim branches that are hanging over the pool

Add new regulator and auto fill for Courtyard water feature. Clean out as well', NULL, 475.00, 'pending', '2023-05-08', '2023-05-08 11:50:39'),
  (6003560, 7666319, '0052', 'Additional Planting', '48 (5 gals) with irrigation at $45.00 = 2,160
20 (1 gals) with irrigation at $23.00 = 460', NULL, 2620.00, 'pending', '2023-05-08', '2023-05-08 15:15:24'),
  (6003619, 29397413, '0001', 'Paver wall', 'Additional paver wall to fit the 24" boxes', NULL, 1800.00, 'pending', '2023-05-08', '2023-05-08 15:29:26'),
  (6009243, 8309666, '0013', 'Tree Demo / Tree Planting', 'Removal of Existing Trees.  Plant (8) 24" Box Ficus Nitida Trees', NULL, 4640.00, 'sold', '2023-05-10', '2023-05-10 06:46:39'),
  (6011375, 29209062, '0001', 'Adding 15g pygmy date palm, 2 clivias', 'Original cost of palm $360 - (2) $45/ 5 gallons that we couldn''t get.
New total is $270 for palm.
Subbing (2) 5gal clivias.', NULL, 270.00, 'pending', '2023-05-10', '2023-05-10 12:06:27'),
  (6014687, 29457223, '0001', 'Add Fabric Barrier', 'Barrier 
Lay 2,880 Sq Ft of barrier on project area
Fabric type is Weed barrier.', NULL, 1728.00, 'pending', '2023-05-11', '2023-05-11 09:33:58'),
  (6024192, 29284090, '0001', 'Turf Upgrade', 'Upgrade turf to Nature''s Best by SGW Corp. $160', NULL, 160.00, 'sold', '2023-05-15', '2023-05-15 13:02:52'),
  (6024834, 29397873, '0001', 'Credit for extending equipment wall', NULL, NULL, -1600.00, 'sold', '2023-05-15', '2023-05-15 15:16:54'),
  (6024841, 29397873, '0002', 'Wall for equipment', 'Rebuild completely new wall with 6”
CMU block and finished in sanded stucco
Wall to be 15’ x 5’ tall', NULL, 3500.00, 'sold', '2023-05-15', '2023-05-15 15:18:08'),
  (6029505, 10491463, '0005', 'Replace 2 step lights', 'Replace (2) Step lights at front walkway', NULL, 450.00, 'pending', '2023-05-16', '2023-05-16 16:17:01'),
  (6029566, 3676700, '2017023', 'Additional Work', 'Jaclyn Santana
Cell: 661-713-0799
Email: Santana.jaclyn@gmail.com
1124 Arbor Dell Road, Los Angeles, CA 90041.

Demolition
1. Remove/ brake pavers in 2x2 Square Feet area.
2. Haul debris removed by picture build.

Repair
1. Repair 2x2 Square Feet area set new pavers in (Client is to provide pavers for repair)', NULL, 800.00, 'pending', '2023-05-16', '2023-05-16 16:58:33'),
  (6030468, 3905763, '0006', 'Stabalizer and plants', 'For 3 flats of creeping thyme
12 1 gallon false Heather''s
3 whirling butterfly in 5 gallon', NULL, 3015.00, 'pending', '2023-05-17', '2023-05-17 06:17:42'),
  (6030485, 3905763, '0007', 'Additional work', 'Additional dg
Benderboard fix
Irrigation', NULL, 4925.00, 'pending', '2023-05-17', '2023-05-17 06:21:05'),
  (6032015, 28581838, '0007', 'Bellecrete Wall Caps for existing retaining wall', '+24 linear feet of wall cap for a total of 90 linear feet
increase size of wall cap from 8" t0 10"', NULL, 1000.00, 'sold', '2023-05-17', '2023-05-17 10:33:36'),
  (6032080, 28581838, '0008', 'Additional Bellecrete for Steps/Landings', '(3) landings in Bellecrete for a total of 28 linear feet of landings
(originally contract stated landings would be concrete only)', NULL, 2000.00, 'sold', '2023-05-17', '2023-05-17 10:41:55'),
  (6032090, 28581838, '0009', 'Gas run for bbq', '65 linear feet for 1 1/2" gas line', NULL, 2150.00, 'sold', '2023-05-17', '2023-05-17 10:43:12'),
  (6032113, 28581838, '0010', 'Electrical run for fountains and grill', '70 linear feet for 3/4" electrical line', NULL, 2000.00, 'sold', '2023-05-17', '2023-05-17 10:46:11'),
  (6032121, 28581838, '0011', '(12) step lights + transformer', NULL, NULL, 3400.00, 'sold', '2023-05-17', '2023-05-17 10:46:58'),
  (6035978, 27905694, '0003', 'REMOVE Patio Cover', NULL, NULL, -23900.00, 'pending', '2023-05-18', '2023-05-18 09:15:14'),
  (6038567, 29374265, '0001', 'Adding 140sqft turf', NULL, NULL, 1650.00, 'pending', '2023-05-18', '2023-05-18 17:43:42'),
  (6046619, 29416859, '0001', 'Additional Demo for DG', NULL, NULL, 1000.00, 'pending', '2023-05-22', '2023-05-22 17:06:28'),
  (6048840, 29416859, '0002', 'Additional Plants', '(1) 15G Dwarf Japanese Maple
(1) 5G Salvia Clevelandii 
(1) 5G Mexican Salvia 
(3) 5G Lomandra ''Breeze''', NULL, 500.00, 'pending', '2023-05-23', '2023-05-23 09:49:05'),
  (6062725, 13262395, '0008', 'Backyard Grass, Concrete Cut, Front Drains', '648 sqft sod - $2,430
30 sqft saw cut - $473
Drains - $3900', NULL, 6803.00, 'pending', '2023-05-26', '2023-05-26 13:29:37'),
  (6062867, 18229619, '0009', 'Sod C/O', NULL, NULL, 1450.00, 'pending', '2023-05-26', '2023-05-26 14:09:55'),
  (6067192, 18229619, '0010', 'Invoice (Pay this)', NULL, NULL, 14210.25, 'pending', '2023-05-30', '2023-05-30 11:38:46'),
  (6067200, 18229619, '0011', 'CREDIT offset new invoice', NULL, NULL, -14210.25, 'pending', '2023-05-30', '2023-05-30 11:39:29'),
  (6069690, 29397873, '0003', 'Additional BBQ Sq Footage', 'Additional Sq Ft to accomodate the Pizza oven and countertop / Electrical', NULL, 1800.00, 'pending', '2023-05-31', '2023-05-31 06:40:02'),
  (6070198, 29416859, '0003', '7 additional plants', '(5) 1 gallon Nepeta
(2) 1 gallon Sea Lavender', NULL, 160.00, 'sold', '2023-05-31', '2023-05-31 08:10:37'),
  (6070232, 29416859, '0004', '7 yards brown shredded mulch', 'For all front yard beds and parkway beds on Texhoma', NULL, 700.00, 'sold', '2023-05-31', '2023-05-31 08:16:55'),
  (6072977, 28581838, '0012', 'Lighting x 29 pieces', '(9) stem path lights
(17) up lights
(3) wall wash lights', NULL, 6400.00, 'sold', '2023-05-31', '2023-05-31 14:57:10'),
  (6073063, 28581838, '0013', 'Additional plants/shrubs/trees', 'Total plant count
164 1 gallon
90 5 gallon
56 15 gallon
11 24" boxed trees (does not include (2) 7 gallon redbud Yvonne sourced separately)
50 flats of Carpet of Stars groundcover', NULL, 9800.00, 'sold', '2023-05-31', '2023-05-31 15:23:55'),
  (6073068, 28581838, '0014', 'Credit for Sod', NULL, NULL, -400.00, 'sold', '2023-05-31', '2023-05-31 15:25:41'),
  (6073119, 28275378, '0001', 'CO''s', 'upgrade tree 36in - $975
6 station timer - $330', NULL, 1305.00, 'pending', '2023-05-31', '2023-05-31 15:45:34'),
  (6073148, 27602555, '0002', '2 bibs', NULL, NULL, 30.00, 'pending', '2023-05-31', '2023-05-31 15:55:26'),
  (6073171, 27602555, '0003', 'Pine Credit', NULL, NULL, -131.00, 'pending', '2023-05-31', '2023-05-31 16:00:42'),
  (6075092, 29090849, '0001', 'Moving main line over (copper pipes)', NULL, NULL, 350.00, 'pending', '2023-06-01', '2023-06-01 08:35:37'),
  (6076112, 27375049, '0003', 'Service', NULL, NULL, 487.50, 'pending', '2023-06-01', '2023-06-01 11:14:48'),
  (6077290, 29099203, '0001', '3 lights + Credit for valve, still need adjustment', '3 lights - 675
Credit for valve, still need adjustments (-565)', NULL, 110.00, 'pending', '2023-06-01', '2023-06-01 14:26:25'),
  (6081456, 29284090, '0002', 'Drains / Gravel Pit', 'Add 40 LF of drains and 2 gravel pits for deck drains and pool overflow', NULL, 1900.00, 'sold', '2023-06-02', '2023-06-02 16:37:40'),
  (6081471, 29284090, '0003', 'Saw Cut/Demo + Add 2 Steps', 'Saw Cut (E) 2 steps at back patio and remove

 Re pour to help elevation difference and make better transition', NULL, 1350.00, 'sold', '2023-06-02', '2023-06-02 16:45:03'),
  (6081475, 29284090, '0004', 'Planter wall Height reduction', 'Deduction in height of planter wall by approximately 16”', NULL, -217.00, 'sold', '2023-06-02', '2023-06-02 16:47:07'),
  (6081480, 29284090, '0005', 'Cancel Weep Hole / French Drain in raised planter', 'This is to credit for Weep holes, French drain and (1) Drain inlet...  Homeowner and I discussed allowing water to permeate into the planter rather than having the water go into gravel retention basins...', NULL, -651.00, 'sold', '2023-06-02', '2023-06-02 16:48:52'),
  (6081664, 29099203, '0002', 'Hillside Mulch', 'Add 2 to 3 inches of gorilla hair, mulch for backyard hillside', NULL, 1225.00, 'sold', '2023-06-03', '2023-06-03 08:15:30'),
  (6081732, 29284090, '0006', 'Additional Soil Removal', '(2) Additional Bins were needed in order to achieve the necessary elevations', NULL, 1600.00, 'sold', '2023-06-03', '2023-06-03 10:40:14'),
  (6081741, 29284090, '0007', 'Light Reduction', 'Possibly reduce the light count by 3 lights', NULL, -729.00, 'sold', '2023-06-03', '2023-06-03 10:48:15'),
  (6081746, 29284090, '0008', 'Plant Reduction', 'To possibly reduce plant costs...19 (1) Gallon Contracted VS 7 (1) Gallon Proposed Reduction for a total of 12 Planted $175
                                                   13 (5) Gallon Contracted VS 9 (5) Gallon Proposed Reduction for a total of 4 Planted $180', NULL, -355.00, 'sold', '2023-06-03', '2023-06-03 10:58:08'),
  (6083278, 29090849, '0002', '(2) 5G Kangaroo Paws', NULL, NULL, 90.00, 'pending', '2023-06-05', '2023-06-05 08:01:05'),
  (6086243, 28274626, '0001', 'Slump stone wall', '14 linear feet of wall combined
18 inches high
with belleCrete caps (existing) 

$1160', '14 linear feet of wall combined
18 inches high
with belleCrete caps (existing)', 1160.00, 'pending', '2023-06-05', '2023-06-05 17:19:05'),
  (6095136, 28274626, '0002', 'Added drainage', 'Additional drainage 76 lnft with inlets $32.50 - $2470', NULL, 2470.00, 'pending', '2023-06-07', '2023-06-07 16:40:54'),
  (6095138, 28274626, '0003', 'vertical soldier course', 'vertical soldier course 25lnft', NULL, 500.00, 'pending', '2023-06-07', '2023-06-07 16:41:19'),
  (6095140, 28274626, '0004', 'CREDIT DEMO', NULL, NULL, -1000.00, 'pending', '2023-06-07', '2023-06-07 16:42:04'),
  (6095145, 28274626, '0005', 'CREDIT - Pergola', NULL, NULL, -12700.00, 'pending', '2023-06-07', '2023-06-07 16:43:43'),
  (6097784, 27905694, '0004', 'Demo and Add Sod to yard (st Agustine)', NULL, NULL, 3657.60, 'pending', '2023-06-08', '2023-06-08 10:57:18'),
  (6097841, 27905694, '0005', 'Veneer install / CREDIT stucco', 'credit stucco $-1300
80sqft seating area @ 28.50
12lnft edges @ 28.50
72 sqft veneer bbq @28.50
$4332

Total 3,374', NULL, 3374.00, 'pending', '2023-06-08', '2023-06-08 11:05:34'),
  (6097955, 29540377, '0001', 'Additional plants', '(1) 15G icee blue Podocarpus
(3) flats of groundcover 
(1) 5G kangaroo paw', NULL, 475.00, 'pending', '2023-06-08', '2023-06-08 11:25:13'),
  (6097960, 29540377, '0002', 'Additional plant removal(large Azalea)', NULL, NULL, 300.00, 'pending', '2023-06-08', '2023-06-08 11:25:56'),
  (6097969, 29540377, '0003', 'Additional irrigation emitters and drip tube', '20’ tube
100 emitters', NULL, 350.00, 'pending', '2023-06-08', '2023-06-08 11:27:48'),
  (6097976, 10713700, '0013', 'Generator Pad, Tile and grout material', 'Tile', NULL, 2700.00, 'pending', '2023-06-08', '2023-06-08 11:29:17'),
  (6097992, 10713700, '0014', 'PB Allocation to redo pool lines', 'Per contract, picture build was to redo pool lines. allocation was $4375

Client requested rerouting which was billed by contract at different rate. Picture Build did not redo lines, credited back to client.', NULL, -4375.00, 'pending', '2023-06-08', '2023-06-08 11:31:32'),
  (6098406, 28274626, '0006', 'Add 1 light', NULL, NULL, 240.00, 'sold', '2023-06-08', '2023-06-08 12:27:14'),
  (6101074, 17948081, '0004', 'Added Work', NULL, NULL, 19730.00, 'pending', '2023-06-09', '2023-06-09 08:55:20'),
  (6102827, 28275378, '0002', 'Swap Gorilla mulch for del rio and bark', NULL, NULL, 2400.00, 'pending', '2023-06-09', '2023-06-09 15:13:30'),
  (6106884, 29202650, '0001', 'Additional Gravel for front yard areas', '225sqft of additional Del Rio gravel used', NULL, 650.00, 'sold', '2023-06-12', '2023-06-12 13:23:04'),
  (6106892, 29202650, '0002', 'Additional boulders', '(6) medium/large size boulders added to front yard', NULL, 200.00, 'sold', '2023-06-12', '2023-06-12 13:23:48'),
  (6106915, 29202650, '0003', 'Additional plants', '(2) 5 gallon Leucospurmum 
(2) 5 gallon Aeonium succulents in purple 
(3) 5 gallon Lavender ''Meerlo''
(6) 1 gallon French Lavender
(3) 1 gallon Sea Lavender', NULL, 600.00, 'sold', '2023-06-12', '2023-06-12 13:26:21'),
  (6118578, 29284090, '0009', 'Plants', 'Add the original quantity of plants back in per the contract.', NULL, 355.00, 'pending', '2023-06-14', '2023-06-14 16:51:05'),
  (6118584, 29284090, '0010', 'Low Voltage Lighting', 'Add back the original contracted amount of lights in plus add 5 more for a total of 15
  (12) Step Lights 
  (3) Up Lights', NULL, 1215.00, 'sold', '2023-06-14', '2023-06-14 16:53:40'),
  (6118613, 29826617, '0001', 'Sleeve for Driveway', 'Add 20 ft of 3” pipe under the driveway for future access', NULL, 150.00, 'pending', '2023-06-14', '2023-06-14 17:08:06'),
  (6122042, 29643792, '0001', 'Paver border for entire backyard area', 'Holland Paver border for around turf (border for paver area which is 19 linear feet is included in original cost)', NULL, 1200.00, 'pending', '2023-06-15', '2023-06-15 13:30:11'),
  (6122110, 13262395, '0009', 'Concrete Pots', 'Coring, patching and waterproofing of 12 pots. 
  This does not include soil or plants.', NULL, 2640.00, 'pending', '2023-06-15', '2023-06-15 13:43:40'),
  (6122593, 29623558, '0001', 'Drain Pour Lid', 'Deduct 2 Pour Lids', NULL, -200.00, 'sold', '2023-06-15', '2023-06-15 15:37:18'),
  (6122622, 29623558, '0002', 'Add Channel Drain', 'Add 1'' of channel Drain at Garage', NULL, 65.00, 'sold', '2023-06-15', '2023-06-15 15:44:49'),
  (6122628, 29623558, '0003', 'Vertical Course', 'Add Vertical paver course along property line in the Driveway', NULL, 507.00, 'sold', '2023-06-15', '2023-06-15 15:46:15'),
  (6122702, 29397413, '0002', 'Additional items', 'One zone of irrigationConcrete cutting Resetting one row of 12x12 pavers.', NULL, 850.00, 'pending', '2023-06-15', '2023-06-15 16:18:22'),
  (6130522, 18226736, '0004', 'Trench 8lf V swell for dry river bed', '1 guy 2 hours or 2 guys 1 hourTrench for dry riverbed. All rocks on sight in area that PB has deo rio installed. $150.00', NULL, 150.00, 'pending', '2023-06-19', '2023-06-19 15:27:53'),
  (6133102, 29953160, '0001', 'Additional for demo', NULL, NULL, 1000.00, 'pending', '2023-06-20', '2023-06-20 10:38:41'),
  (6133261, 29953160, '0002', 'Back yard', '1-Demo ex. wall

2- Demo 200 sq feet of damaged concrete 

3- Pour  200 sq. feet of natural grey 3000 psi. to match existing.

4-Build new 6x8x8 cmu wall about 57LF at 18" with sand stucco to match house

5- Install about 60 LF. 2x12 treated timber in front of fence to help hold soil.

6- plant install.
     20- 5- gal. shrubs 
     15- 1- gal. shubs

7-  install 420 sq. Feet of 1" del rio with fabric 

8- install 1 zone drip line.', NULL, 30352.00, 'pending', '2023-06-20', '2023-06-20 11:03:42'),
  (6134797, 29622563, '0001', 'Concrete Cap', 'Add a course of Block cap on top of pool deck to divert pool water', NULL, 150.00, 'sold', '2023-06-20', '2023-06-20 15:04:30'),
  (6134800, 29622563, '0002', 'Front Grade', 'Cut back front grass to slope to new concrete', NULL, 300.00, 'sold', '2023-06-20', '2023-06-20 15:05:23'),
  (6137799, 29857171, '0001', 'Credit for (1) 5 gallon plant', NULL, NULL, -48.00, 'pending', '2023-06-21', '2023-06-21 11:30:57'),
  (6140828, 29397873, '0004', 'Additional plants', '(3) 5 gallon Bougainvillea 
(3) 5 gallon succulents for planters', NULL, 250.00, 'sold', '2023-06-22', '2023-06-22 08:11:06'),
  (6140986, 28374038, '0001', 'Reinstalling Fountain with bigger basin', 'Reinstalling fountain with bigger basin, plus additional rocks will be needed to fill around the fountain area.', NULL, 350.00, 'sold', '2023-06-22', '2023-06-22 08:36:48'),
  (6141032, 28374038, '0002', '8 additional plants', '(4) 1 gallon Creepping Rosemary
(4) 1 gallon Mexican Salvia', NULL, 175.00, 'sold', '2023-06-22', '2023-06-22 08:45:25'),
  (6143037, 29397873, '0005', 'FOOTING FOR LAMP POST IN BBQ', NULL, NULL, 100.00, 'sold', '2023-06-22', '2023-06-22 14:10:13'),
  (6143551, 26949840, '0001', 'Permit for gas/electric', 'Electric and Gas for bbq/fireplace 
japprox $500-$1000 for both permits', NULL, 600.00, 'pending', '2023-06-22', '2023-06-22 17:09:20'),
  (6145456, 28274626, '0007', 'Credit', 'Credit for not building soldier course', NULL, -500.00, 'pending', '2023-06-23', '2023-06-23 10:06:36'),
  (6145462, 28274626, '0008', '2 lights', '2 lights discounted price', NULL, 400.00, 'pending', '2023-06-23', '2023-06-23 10:08:05'),
  (6145470, 28274626, '0009', 'Credit for reduction in wall size', 'Credit for wall reduction', NULL, -150.00, 'pending', '2023-06-23', '2023-06-23 10:09:06'),
  (6149272, 15047432, '0002', 'Repair - 13 flats 2 bags amend', NULL, NULL, 975.00, 'sold', '2023-06-26', '2023-06-26 09:28:44'),
  (6149572, 28274626, '0010', 'Swapping valves', 'Swapping old irrigation valves with new ones. Plastic', NULL, 490.00, 'pending', '2023-06-26', '2023-06-26 10:08:22'),
  (6150453, 11303103, '0004', 'Birds of paradise removal', NULL, NULL, 750.00, 'sold', '2023-06-26', '2023-06-26 12:21:49'),
  (6151396, 11303103, '0005', 'Extra demo costs', NULL, NULL, 3000.00, 'sold', '2023-06-26', '2023-06-26 15:03:11'),
  (6153272, 29622563, '0003', 'Added work', NULL, NULL, 2373.00, 'pending', '2023-06-27', '2023-06-27 08:23:46'),
  (6157436, 27317498, '0012', 'Pressure Regulator', 'Replace 3/4" pressure regulator in the backyard', NULL, 395.00, 'sold', '2023-06-28', '2023-06-28 07:31:18'),
  (6160771, 28274626, '0011', 'Paver walkway', 'Remove and Re-Install pavers along front driveway to sideyard to square pavers with the house.  Remove (1) existing light', NULL, 1500.00, 'sold', '2023-06-28', '2023-06-28 18:20:52'),
  (6168727, 29970457, '0001', 'Credit for sprinkler lines not reconnected.', 'Pvc not reconnected to sprinklers. She handled it herself.', NULL, -150.00, 'pending', '2023-07-02', '2023-07-02 10:37:59'),
  (6169959, 29599393, '0001', 'Lighting', '(4) step lights ($240 each installed)  + 1 transformer ($435)', NULL, 1400.00, 'sold', '2023-07-03', '2023-07-03 09:45:00'),
  (6169961, 29599393, '0002', 'Sand finish Upgrade for Concrete', '420sqft', NULL, 420.00, 'sold', '2023-07-03', '2023-07-03 09:45:26'),
  (6169962, 29599393, '0003', 'Electrical Run + Outlet', '27 LINEAR FEET OF 1" CONDUIT BURIED BELOW GRADE WITH 1 J-BOX ROUGH IN', NULL, 400.00, 'sold', '2023-07-03', '2023-07-03 09:45:50'),
  (6169967, 29599393, '0004', 'Timber Step', '16 LF Green Landscape Timber Step', NULL, 550.00, 'sold', '2023-07-03', '2023-07-03 09:47:07'),
  (6169970, 29599393, '0005', 'Additional Turf', '65SQFT ADDITIONAL TURF', NULL, 600.00, 'sold', '2023-07-03', '2023-07-03 09:47:32'),
  (6170016, 29599393, '0006', 'Additional Concrete (side of house by slider)', '35sqft', NULL, 510.00, 'sold', '2023-07-03', '2023-07-03 10:01:26'),
  (6173633, 29599393, '0007', 'credit for 8'' linear feet of retaining wall', NULL, NULL, -200.00, 'sold', '2023-07-05', '2023-07-05 09:35:42'),
  (6183102, 30187938, '0001', 'REFERRAL CREDIT', NULL, NULL, -500.00, 'pending', '2023-07-07', '2023-07-07 15:32:25'),
  (6187799, 14175746, '0029', 'CREDIT sealer', NULL, NULL, -597.50, 'pending', '2023-07-10', '2023-07-10 16:23:45'),
  (6191320, 29599393, '0008', '15 LF Timber for fence gaps', NULL, NULL, 250.00, 'sold', '2023-07-11', '2023-07-11 13:04:09'),
  (6191949, 29880035, '0002', 'Demo small pad of concrete', '1 hour of work', NULL, 100.00, 'pending', '2023-07-11', '2023-07-11 14:51:31'),
  (6192131, 30099079, '0001', 'CO', NULL, NULL, 170.00, 'pending', '2023-07-11', '2023-07-11 15:34:32'),
  (6192563, 11303103, '0006', 'Additional drainage 50LF.', NULL, NULL, 1250.00, 'sold', '2023-07-11', '2023-07-11 19:48:53'),
  (6192663, 29925348, '0001', 'Additional demo/soil removal', 'Bringing grade down below small wall + large Westringia shrub', NULL, 400.00, 'sold', '2023-07-11', '2023-07-11 21:24:51'),
  (6197016, 13262395, '0010', 'Extensive Patio Work Forming/Concrete/Stone', 'Extensive added hardscape work on back patio.
1) Form for extended patio sections.
2) Form for extended step sections.
3) Hand Mix and Float entire back patio.
4) Hand Mix and Pour added steps.
5) Total hand mix and pour of 20 yards of concrete. 
6) Cover all need sections and steps with stone

Originally $14,000.00, reduced to $7,500', NULL, 7500.00, 'sold', '2023-07-12', '2023-07-12 18:39:38'),
  (6197024, 13262395, '0011', 'Additional tree demo', '1-Demo out a total of 6 palm trees and 2 small trees 
2- Stump grind 
3- Dump fees', NULL, 6900.00, 'sold', '2023-07-12', '2023-07-12 18:50:29'),
  (6197084, 13262395, '0014', 'Additional Citrus for pots and plants', '2- bears lime
2 -Washington navel
2 -myer lemon

4- gal. Westragea 
3- 15. Carolina cherry', NULL, 1890.00, 'pending', '2023-07-12', '2023-07-12 19:44:04'),
  (6197090, 13262395, '0015', 'Replace all pool equipment', 'Remove Old Equipment

Install new equipment (designed to interface with Control 4 home system):
(1) New Pentair Load Center
(1) New Pentair Intellitouch System I9+3.  For 3 lights to be controlled seperately.  If more lights added we will need to add more channels.
(1) New Pentair Screen Logic System
(3) New Pentair Intelliflo 3VSF Variable Speed Pumps - 3 HP
(1) New Pentair FLT CNC PLS 520 Cartridge Filter
(1) New Pentair Master Temp Lo Nox Natural 400K BTU Gas Heater
(3) New Pentair LT INTLBRT 5G 120 V LED Pool Lights', NULL, 22770.00, 'sold', '2023-07-12', '2023-07-12 19:48:48'),
  (6197101, 13262395, '0016', 'Alley demo, concrete and curb', 'Demo 2 Elm tree 

Demo out 487 square feet 6/7 inches of soils for concrete 

Form and pour 6" high curb 13LF.

Rebar and pour about 487 square feet of concrete', NULL, 12862.00, 'pending', '2023-07-12', '2023-07-12 19:55:36'),
  (6197103, 13262395, '0017', '227 sq ft of concrete - perimeter of sports court', 'Added concrete around sports court. Short load. Small pour $30/ sq feet including finishing.', NULL, 6810.00, 'sold', '2023-07-12', '2023-07-12 19:56:55'),
  (6197107, 13262395, '0018', 'Saw cut and demo concrete for planter', 'Saw cut 8 LF./demo 12sq. Feet of concrete for planter in front of alley wall.', NULL, 250.00, 'sold', '2023-07-12', '2023-07-12 20:00:35'),
  (6197114, 13262395, '0020', 'Paint existing wall - Prep and Paint', 'trim around plants, tack plants, Scrape, grind wall for prep and proper paint adhesion. Paint wall two coats. Roughly 1200 sq feet.', NULL, 7700.00, 'pending', '2023-07-12', '2023-07-12 20:06:32'),
  (6197120, 13262395, '0021', 'Add Shower Demo, Grind Walls and Stucco 72 sq ft.', 'Did shower demo including wall - this was over credited in previous credit change order.  
Need to prep and grind all shower walls,  Need to stucco coat wall.', NULL, 2950.00, 'sold', '2023-07-12', '2023-07-12 20:11:00'),
  (6197851, 13262395, '0022', 'Credit for Water Feature', 'Did not do water feature install in the backyard.', NULL, -1130.00, 'sold', '2023-07-13', '2023-07-13 07:18:13'),
  (6197905, 13262395, '0023', 'Credit for Planting.  Totals as of 7/13', 'Due to changes in planting schedule.  We did on onsite assessment of current planting vs contract. 

Current planting has (14) - 1 gallon rosemary.  (130) 1 gallon Lerope  (27) 5 gallon boxwood  (4) 5 gallon Acacia  (11) 1 gallon Barkley Sage  (2) 5 gallon Westrangia. (23) 15 gallon fieres

Credit due of $1,170 due to less plants and smaller sizes for some.

All planting from this point will be charged seperately in a change order', NULL, -1170.00, 'sold', '2023-07-13', '2023-07-13 07:29:52'),
  (6198059, 13262395, '0024', 'Tree Credit', 'Original contract had (12) trees.  4 olives and 1 pygmy palm have been planted, 2 more being ordered plus 3 refused that cannot be returned to the nursery. 

(Credit 2 trees) $4,832', NULL, -4832.00, 'sold', '2023-07-13', '2023-07-13 07:56:13'),
  (6198926, 15051229, '0001', 'Adding Weed Fabric', 'Adding weed barrier for about 600 sqft under mulch', NULL, 300.00, 'sold', '2023-07-13', '2023-07-13 10:23:05'),
  (6199624, 29912551, '0001', 'Additional 19 LF. Of edging', NULL, NULL, 665.00, 'sold', '2023-07-13', '2023-07-13 12:12:46'),
  (6199637, 29912551, '0002', 'Additional 30square feet of stone and concrete pad', NULL, NULL, 1000.00, 'sold', '2023-07-13', '2023-07-13 12:15:05'),
  (6199659, 29912551, '0003', 'Additional 7 LF. of steps', NULL, NULL, 315.00, 'sold', '2023-07-13', '2023-07-13 12:19:04'),
  (6199667, 29912551, '0004', 'Credit 10 LF', NULL, NULL, -250.00, 'sold', '2023-07-13', '2023-07-13 12:20:34'),
  (6199716, 29912551, '0005', '170 square feet extra demo', NULL, NULL, 850.00, 'sold', '2023-07-13', '2023-07-13 12:27:51'),
  (6200507, 27905694, '0006', 'Synlawn Turf chosen', 'BiInvoiced for normal turf at $21,937', NULL, 8033.00, 'pending', '2023-07-13', '2023-07-13 14:47:55'),
  (6200841, 30187938, '0003', 'Soldier Course Ledge and planter (Rustic Wall)', '14linear feet of ledge using Rustic wall (grey/charcoal to match pavers) with wall cap to be installed to cover footings behind far side of pool and 23 linear feet of Rustic Wall to create planter starting from the telephone pole towards entry gate.  This will allow the footings to be hidden.', NULL, 1600.00, 'sold', '2023-07-13', '2023-07-13 17:00:05'),
  (6207690, 29925348, '0002', 'Jute net for hillside', NULL, NULL, 1400.00, 'sold', '2023-07-17', '2023-07-17 13:06:07'),
  (6207692, 29925348, '0003', '1-2” gorilla hair mulch', NULL, NULL, 750.00, 'sold', '2023-07-17', '2023-07-17 13:06:30'),
  (6208719, 28581838, '0015', 'Credit for concrete steppers/ gravel (in contract)', NULL, NULL, -3600.00, 'sold', '2023-07-17', '2023-07-17 17:51:34'),
  (6208727, 28581838, '0016', 'Stepstone steppers x 70', 'Wrinkled 24 x 12 Sonorostone french grey stepper for around the pathway on back 40', NULL, 3500.00, 'sold', '2023-07-17', '2023-07-17 18:00:00'),
  (6208736, 28581838, '0017', 'Bellecrete Steppers for behind bedroom', '11 x 24x24 Modern/Straight/Sand Finish in Midnight
t', NULL, 1500.00, 'sold', '2023-07-17', '2023-07-17 18:05:16'),
  (6208745, 13262395, '0025', 'Prep for pools walls that was overcredited', 'Picture Build did all the demo and chipping of pool wall and preped and floated all the walls.', NULL, 5850.00, 'sold', '2023-07-17', '2023-07-17 18:08:09'),
  (6208755, 28581838, '0018', 'Bellecrete Stepper Path (back 40)', '16 x 24''x14 Modern/Straight Steppers in Midnight', NULL, 0, 'sold', '2023-07-17', '2023-07-17 18:16:19'),
  (6208756, 28581838, '0019', 'Yosemite Gravel for Back 40 Pathway/Behind Bedroom', NULL, NULL, 0, 'sold', '2023-07-17', '2023-07-17 18:16:57'),
  (6208971, 13262395, '0026', 'Credit for unlayed stone. (client keeping)', 'Upon review the pricing had 4,263 sq feet. However, per the contract that included 10% overage of material. So the actual installation of stone was charged at 3,836 sq feet only.  Actual waste was very minimal. 

However, that calculation also  included the steps which being charged for separately should have not been included in the actual sq foot count.  So the actual installation charge for flat work not including the steps should have been 3,836 minus the step installation being charged separately.   The steps were roughly 280 square feet (224 x 15 inches).  Thus, the actual stone installed should have been only 3,556 sq feet. 

However, we ended adding some sq footage back in by adding extra sq footage in patio, some risers and the firepit work. That added up to 127 square feet.  (not as much as in the other deleted change order).

Thus, the actual installed stone per contract and measurements should have been 3,683

The actual stone onsite remaining is 93 pieces. 93 x 6 sq feet equals  558 sq feet.   The original order of 4,263 minus 558  is 3705. This leaves about 22 square feet that was used for cuts.  Which is pretty close. 

So the installation work charged per contract is correct.

However, waste being actual very minimal and some extra due to steps incorrectly in contract.  Picture Build will pay for 1/2 the stone $4,882 onsite.', NULL, 0, 'sold', '2023-07-17', '2023-07-17 20:40:34'),
  (6212785, 29388894, '0001', 'CO Demo Phase 1 - misc work backfill', 'Trenching for utilities Backfill and compact = $3900 misc work done to backfill trench and compact 3 ft down by 41 linear feet. Wasn''t in initial scope of work', NULL, 3900.00, 'pending', '2023-07-18', '2023-07-18 14:36:20'),
  (6212788, 29388894, '0002', 'CO Drainage and Inlets additional', 'Drainage 480lnft @25 = $12000 
Drain Inlets = $1800

11000 in original estimate', NULL, 2800.00, 'pending', '2023-07-18', '2023-07-18 14:36:41'),
  (6212794, 29388894, '0003', 'CO LIDS + Waterproofing', '80% of drainage cost is related to lids based on lids plan run  ($11,040)Lids however, you can deduct this out of the original estimate since we don''t anticipate running new drains. 
 other drainage ran in anticipation of future hardscape/landscape.
80 sq ft of rain garden = $4400 Lids
French drain storm planter 37lnft $600 Lids
Rain Barrels 1150 Lids
Backfill $390 3 yards Lids
Waterproofing-coats of roll on + bituthene 4000 111 sqft total $1831.50 37 linear feet by 3 feet high
 LIDS', NULL, 8371.50, 'pending', '2023-07-18', '2023-07-18 14:37:20'),
  (6213153, 29643792, '0002', 'Pet Odorizer', NULL, NULL, 165.00, 'pending', '2023-07-18', '2023-07-18 16:13:38'),
  (6215002, 30187938, '0004', '68 sqft additional turf', NULL, NULL, 600.00, 'sold', '2023-07-19', '2023-07-19 09:13:38'),
  (6215012, 30187938, '0005', 'Plant credit', 'Allowance was $1600, reducing to $1000 too offset additional turf cost', NULL, -600.00, 'sold', '2023-07-19', '2023-07-19 09:14:32'),
  (6218778, 29202650, '0004', '15 Gallon Palo Verde', 'Plus double staking', NULL, 180.00, 'sold', '2023-07-20', '2023-07-20 07:39:06'),
  (6219432, 30154946, '0001', 'Additional planter wall 4 feet', 'Extend the planter wall out 4 feet', NULL, 222.00, 'pending', '2023-07-20', '2023-07-20 09:15:27'),
  (6219464, 30154946, '0002', 'Additional grass st augustine', 'Additional grass st Augustine 188 sf x 4,25= $799.', NULL, 799.00, 'pending', '2023-07-20', '2023-07-20 09:21:14'),
  (6220746, 30154946, '0003', 'Credit for Concrete Cut and Bevel', 'This credit will attach to the new change order where we will be concrete cutting the length of the patio at the brick ribbon.  We will still sand and bevel the short area of concrete that will still be adjacent to the grass.', NULL, -450.00, 'sold', '2023-07-20', '2023-07-20 12:31:58'),
  (6220756, 30154946, '0004', 'Concrete cut the length of the patio', 'This is to concrete cut the length of the patio at the brick ribbon.  We will still need to sand and bevel the short concrete area on short planter box side.  This includes hauling away the concrete', NULL, 1400.00, 'sold', '2023-07-20', '2023-07-20 12:35:07'),
  (6220773, 30154946, '0005', 'Brick border on side of new drain area', '10 Linear Feet of brick border, to cover a drainage line X $25.00= $250.00', NULL, 250.00, 'sold', '2023-07-20', '2023-07-20 12:38:08'),
  (6220790, 30154946, '0006', 'Added Drainage pipe and one cap', 'Additional 21 Linear Feet of drainage X $25.00= $525.00 with 1 additional cap $75.00= $600.00', NULL, 600.00, 'sold', '2023-07-20', '2023-07-20 12:41:12'),
  (6223228, 29912551, '0006', 'credit for pavers', NULL, NULL, -912.80, 'sold', '2023-07-21', '2023-07-21 08:51:28'),
  (6227457, 17971182, '0001', 'CO''s', '1
			Credit of (28) 15 Gallon plants at $165 each 2 camellias were subbed
			($4,950.00)
			ok
		
		
			2
			credit of reduction of edging -$180
			($180.00)
			ok
		
		
			3
			Credit for string lights 158 linear feet needed, difference of 42 lf -$210
			($210.00)
			ok
		
		
			4
			credit 6 lf of channel drain
			($360.00)
			ok
		
		
			5
			Credit Post
			($300.00)
			ok
		
		
			6
			Credit Post #2 (this credit was put into the paver sealing)
			($300.00)
			ADDED - USE ON LINE 17
		
		
			7
			-
			-
			 
		
		
			8
			Additional 175 Sq Ft of Pavers $2817.15
			$2,817.15
			ok
		
		
			9
			28 lf of paver wall cap difference of $280
			$280.00
			ok
		
		
			10
			13 LF of steps over contracted amount at $65 a lf $845
			$845.00
			ok
		
		
			11
			60 sq ft of additional stabilized dg at 4.15 per sq ft $249
			$249.00
			ok
		
		
			12
			front side walk street repair at $25 per sq ft with demo $560
			$560.00
			MISSING
		
		
			13
			Garage concrete repair 30 sq ft of concrete at $25 per sq ft with demo $750
			$750.00
			ok
		
		
			14
			110 sq ft of mulch with weed fabric at $2 per sq ft $220
			$220.00
			ok
		
		
			15
			water proofing  2 coats of roll on and subseal at 16.50 per sq ft $2326.50
			$2,689.50
			ok
		
		
			16
			Core Curbing Permit
			$781.00
			ok
		
		
			17
			Paver sealing
			$3,650.00
			ok - $300 CREDIT FROM LINE 6', NULL, 6541.65, 'pending', '2023-07-24', '2023-07-24 09:23:31'),
  (6227651, 17971182, '0002', 'CREDIT', '12
			front side walk street repair at $25 per sq ft with demo $560
			$560.00
			MISSING', NULL, -560.00, 'pending', '2023-07-24', '2023-07-24 09:54:22'),
  (6228678, 30299450, '0001', 'Post and footings for car port', 'Install 2- 4x6 CBS stone tie with 1 inch stand-off 
Install 2- 4x6 post
2x2 footings/concrete', NULL, 978.00, 'sold', '2023-07-24', '2023-07-24 12:33:40'),
  (6228765, 30299450, '0002', 'Credit for Concrete Curb', NULL, NULL, -2000.00, 'sold', '2023-07-24', '2023-07-24 12:45:14'),
  (6228784, 30299450, '0003', 'Bender board edging around turf', NULL, NULL, 700.00, 'sold', '2023-07-24', '2023-07-24 12:47:40'),
  (6229221, 30058865, '0001', 'Backsplash/Bartop', 'Backsplash/Bartop 
1. Add blacksplash 10 LF
2. Poured in place concrete cap 10 LF (include forming)
3. Trowel for smooth finish
4. Blacksplash to be smooth stucco (to match house color)', NULL, 4283.00, 'pending', '2023-07-24', '2023-07-24 13:59:12'),
  (6229301, 30068111, '0001', '49sqft of additional concrete pad', NULL, NULL, 1200.00, 'sold', '2023-07-24', '2023-07-24 14:13:30'),
  (6229304, 30068111, '0002', '1 concrete step', NULL, NULL, 440.00, 'sold', '2023-07-24', '2023-07-24 14:14:24'),
  (6229315, 30068111, '0003', 'CREDIT FOR GRAVEL', NULL, NULL, -515.00, 'sold', '2023-07-24', '2023-07-24 14:16:09'),
  (6229339, 30068111, '0004', 'CREDIT FOR EXTRA PLANTS', NULL, NULL, -200.00, 'pending', '2023-07-24', '2023-07-24 14:21:51'),
  (6230911, 27651875, '0002', 'Planting', 'Fruitless olive tree Wilsoni upgrade +200
Fruit trees upgrade +900
24 in box upgrade in backyard install in front +980 (8) + (3) 24 inch box for front yard $720
(4) 15 gallon ficus installed in front +600 
(1) 5 gallon ficus $43.50 for front yard
6 low voltage lights $240each ($1440) + 3 low voltage lights for front yard 
1 low voltage transformer $437
1 new Irrigation zone for top planter +900
Irrigation add on to front yard +300
moving plants/transplanting plants in front planter to back planter. Adjust irrigation lines $300

Total $7540.50', NULL, 7540.50, 'sold', '2023-07-25', '2023-07-25 07:00:46'),
  (6232292, 29912551, '0007', 'Additional valve', 'Adding 1 valve for front hillside (just stubbed out no sprinkler heads)', NULL, 550.00, 'sold', '2023-07-25', '2023-07-25 10:43:02'),
  (6232398, 30187938, '0006', 'Add’l plants', '2 15G Olives
2 5G Leucadendron
6 1G climbing Jasmine
2 flats Blue Chalksticks
Wiring for Jasmine and soil for pots', NULL, 900.00, 'sold', '2023-07-25', '2023-07-25 10:58:39'),
  (6232818, 30216439, '0001', '1 transformer with timer', NULL, NULL, 430.00, 'sold', '2023-07-25', '2023-07-25 12:05:17'),
  (6232824, 30216439, '0002', 'Install 1 light owner to provide a light fixture', 'Wire and install 1 low voltage light (owner to provide light fixture)', NULL, 170.00, 'sold', '2023-07-25', '2023-07-25 12:06:44'),
  (6232833, 30216439, '0003', 'Credit for posts', 'Only installing 7 posts instead of 10', NULL, -840.00, 'sold', '2023-07-25', '2023-07-25 12:08:35'),
  (6232880, 30216439, '0004', 'Credit for 3 15 gal. Bougainvillea', NULL, NULL, -450.00, 'sold', '2023-07-25', '2023-07-25 12:15:44'),
  (6232887, 30216439, '0005', 'Credit for citrus', NULL, NULL, -315.00, 'sold', '2023-07-25', '2023-07-25 12:16:13'),
  (6233434, 29912551, '0008', 'Additional valve to separate the back yard', 'Adding 1 valve, no lateral line. To separate the back yard', NULL, 550.00, 'sold', '2023-07-25', '2023-07-25 13:40:07'),
  (6233808, 30154946, '0007', 'Additional demo (existing footings)', 'Demo out existing wall footings', NULL, 1000.00, 'sold', '2023-07-25', '2023-07-25 14:46:21'),
  (6234039, 30187938, '0007', 'Bonding Wire install partial credit', NULL, NULL, -350.00, 'sold', '2023-07-25', '2023-07-25 16:02:12'),
  (6235258, 28581838, '0020', 'Bellecrete 24” x 16” Steppers Back 40', '16 steppers to be placed side by side to create walkway from steps to patio', NULL, 1200.00, 'pending', '2023-07-26', '2023-07-26 07:35:30'),
  (6237352, 30216439, '0006', 'total cc feesdfj', NULL, NULL, 247.67, 'pending', '2023-07-26', '2023-07-26 13:03:39'),
  (6241947, 7666319, '0053', 'Misc items', 'Fixing mainline at street side $300


Adding pvc shut off valve to hillside manifold $65

One split zone material $160  time 3 hrs $225 COST $385

Bottom hillside zone 100 linear feet of pipe, valve and labor $ 1050
Trenching on electrical hillside 250 linear feet  running 9 strand irrigation wire $800 
Timer+install  $400
Total $3100

Check valves/ misc repairs
no charge
Erosion repair from water leaks, No charge', NULL, 3100.00, 'pending', '2023-07-27', '2023-07-27 14:19:10'),
  (6242414, 30340654, '0001', 'Bender board credit 30LF', NULL, NULL, -360.00, 'pending', '2023-07-27', '2023-07-27 16:32:04'),
  (6247389, 13262395, '0027', 'Stucco remainder of back pool wall', 'Stucco the entire back wall of the pool for one uniform look.', NULL, 2400.00, 'sold', '2023-07-31', '2023-07-31 07:19:19'),
  (6247588, 13262395, '0028', 'Sod Installation Additional for Parkway', NULL, 'Now including the parkway.

On the measurements for the sod we have:
26'' by 23'' 3" area 604.50 Sqft for the back. The parkway next to the street is 7'' 6" by 56'' for a total of 420 Sqft. Total sod install of 1024.5 sq feet.

The original change order for adding grass that was approved and paid was for 648 sq feet which leaves us with a difference of 376.5 sq feet.  Currently at 3.75 sq foot that leaves $1411.87 additional for the sod.', 1148.87, 'pending', '2023-07-31', '2023-07-31 07:53:49'),
  (6247944, 30247578, '0001', 'Concrete cut', '35 linear feet x $10.00= $350.00', NULL, 350.00, 'pending', '2023-07-31', '2023-07-31 08:49:41'),
  (6253827, 30365496, '0001', 'Additional backyard demo and haul out', '(4) stumps (grinding roots)
(2) block walls
Hauling all debris (concrete and green waste)', NULL, 2000.00, 'sold', '2023-08-01', '2023-08-01 12:12:36'),
  (6253860, 30365496, '0002', 'Redoing front yard concrete and steps/walkway', 'Remove all concrete, steps and brick landing for front entry way and side yard walkway
Redo all areas in concrete to match backyard- color tbd and sand finish 
Steps to be concrete (straight edge)', NULL, 10700.00, 'sold', '2023-08-01', '2023-08-01 12:17:27'),
  (6254445, 30154946, '0008', 'Adding gravel behind wall', '1 man, 3 hours plus material''s', NULL, 400.00, 'sold', '2023-08-01', '2023-08-01 13:43:29'),
  (6259053, 30365496, '0003', 'FRONT YARD SHRUB REMOVAL (NORTH/SOUTH SIDES)', NULL, NULL, 2200.00, 'sold', '2023-08-02', '2023-08-02 13:40:59'),
  (6263131, 26949840, '0002', 'Audio Visual Conduit and Electrical.', NULL, 'Installing  electrical and Audio Visual Conduit.

2379 linear feet of conduit priced at $7.90 per linear foot = $18794.1

Trenching and backfilling for 381 feet at $6 per foot =$2286

Does not include electrical wire or outlets for Audio Visual Stands', 21080.10, 'pending', '2023-08-03', '2023-08-03 12:59:02'),
  (6264128, 30282982, '0002', 'Steel Edging', 'steel edging', 'steel edging', 980.00, 'pending', '2023-08-03', '2023-08-03 16:48:59'),
  (6267348, 14557511, '0005', '3 Timers', 'Installation of three timers.', NULL, 1300.00, 'pending', '2023-08-04', '2023-08-04 14:24:20'),
  (6267509, 27651875, '0003', 'Backfill', 'Backfill top planter 2 yards', NULL, 450.00, 'pending', '2023-08-04', '2023-08-04 15:56:31'),
  (6267528, 26913236, '0007', 'Remove tree and stump grind', NULL, 'Remove tree and stump grind 12"', 800.00, 'sold', '2023-08-04', '2023-08-04 16:17:45'),
  (6267532, 11075368, '0002', 'New Timer', NULL, NULL, 400.00, 'pending', '2023-08-04', '2023-08-04 16:24:13'),
  (6271869, 12608924, '0049', '20'' metal post with footing', '20'' tall x" steel post in 1-2'' footings TBD on site.
-Painted black
-Added hooks', NULL, 800.00, 'sold', '2023-08-07', '2023-08-07 15:43:59'),
  (6271873, 12608924, '0050', 'String Light Repair', '1) Reinstall two string light strands to new metal post
2) Assess flickering light fixture in tree and repair (if new fixture needed will be more)
3) One additional string light repair - no charge', NULL, 800.00, 'sold', '2023-08-07', '2023-08-07 15:44:58'),
  (6274335, 30553887, '0001', 'Changing porch to all flagstone', NULL, NULL, 887.50, 'pending', '2023-08-08', '2023-08-08 10:18:48'),
  (6274352, 30553887, '0002', 'Inside flagstone including demo of exiting', 'Inside porch need to demo and install flagstone', NULL, 2484.00, 'pending', '2023-08-08', '2023-08-08 10:21:45'),
  (6274453, 30553887, '0003', 'Dg in parkwsy', 'Total 357 sf - 184 sf 
$1,856.40 - $956.80= $899.60
Minus bender board credit $182.00', NULL, 717.60, 'pending', '2023-08-08', '2023-08-08 10:35:31'),
  (6275474, 28275378, '0003', 'CREDIT 1-1gal', NULL, NULL, -21.50, 'pending', '2023-08-08', '2023-08-08 12:56:57'),
  (6276751, 29209062, '0002', 'Remove (8) Bird of Paradise and haul to dump', NULL, NULL, 450.00, 'pending', '2023-08-08', '2023-08-08 18:59:19'),
  (6280383, 29880035, '0003', 'Adding flagstones with gravel', '1.Grading - fix area to grade down 3" below final grade, use same weed fabric for under stones and gravel. Haul material away. $300

2.Black Mexican Mix Pebbles around flagstones- $1,100

3.Flagstone approx. 6 large pieces 2-3'' each going longways across set in concrete (Arizona gold - $1,200)

TOTAL: $2,600', NULL, 2600.00, 'sold', '2023-08-09', '2023-08-09 14:22:56'),
  (6280622, 30426173, '0001', 'Additional flagstone patio', '1.5 pallets Idaho silver plus labor (extra cutting of flagstone) and dry setting leftover flagstone for pathways adjacent to kitchen patio area (adds 1 extra full day of work for 2 guys) 
(6) Sydney Peak boulders set', NULL, 4200.00, 'pending', '2023-08-09', '2023-08-09 15:16:54'),
  (6280625, 30426173, '0002', 'Additional gravel for fountain area', '3/4” Del Rio for 220sqft', NULL, 650.00, 'pending', '2023-08-09', '2023-08-09 15:17:20'),
  (6280631, 30426173, '0003', 'Mulch upgrade to small bark', 'includes weed barrier for across the back perimeter', 'Small bark mulch upgrade from shredded mulch', 2200.00, 'pending', '2023-08-09', '2023-08-09 15:18:17'),
  (6280632, 30426173, '0004', 'Additional plant material', 'Upgrade to 36” Arbutus tree', NULL, 1400.00, 'sold', '2023-08-09', '2023-08-09 15:18:31'),
  (6280643, 30426173, '0005', 'Small concrete pedestal for fountain', NULL, NULL, 250.00, 'pending', '2023-08-09', '2023-08-09 15:20:58'),
  (6280745, 27651875, '0004', 'misc items', 'white rock added to back planters $1000
tree from boething +$225', NULL, 1225.00, 'pending', '2023-08-09', '2023-08-09 15:49:24'),
  (6280855, 3905763, '0008', 'Paver repair due to roots', 'Pull up pavers 
Cut roots 
Grade and compact road base
Grade sand
Install papers
Sand and compact', NULL, 1550.00, 'pending', '2023-08-09', '2023-08-09 16:24:14'),
  (6280920, 27651875, '0005', 'Skimmer', '3 skimmer extensions', NULL, 80.00, 'pending', '2023-08-09', '2023-08-09 16:43:14'),
  (6284364, 2018594, '0001', 'Paver Repair', 'Pick up paver and remove tree roots.   Then relay the paver. 400 sq feet.', NULL, 8000.00, 'pending', '2023-08-10', '2023-08-10 13:17:07'),
  (6284892, 30549620, '0001', 'Additional DG and upgrading to color grey', NULL, NULL, 1000.00, 'pending', '2023-08-10', '2023-08-10 15:07:03'),
  (6285103, 26949840, '0003', 'Electrical', '1. Sub Panel (includes 1" conduit)
236 lnft of #4 wire. 60 amp
$7,900

2. Electrical Run
405 lnft 3/4" conduit. includes 4 #12 guage wiring
$9,315

3. Outlets
15 total outlets. 2 on seatbench, 2 on pilasters, 4 on outdoor kitchen, add 4 for the TVs. 8 included in contract, need 7 more
$840

Note : May require additional electrical change orders.
Does not include permitting costs there will be an additional change order once the fees are calculated by the city.', NULL, 18055.00, 'sold', '2023-08-10', '2023-08-10 16:46:04'),
  (6285138, 28275378, '0004', 'CREDIT material 3 1gals', NULL, NULL, -30.00, 'pending', '2023-08-10', '2023-08-10 17:07:31'),
  (6285208, 30426173, '0006', '2 up lights (canceled)', '2 additional up lights', NULL, 440.00, 'pending', '2023-08-10', '2023-08-10 18:11:15'),
  (6285212, 30426173, '0007', 'Return to job site after house painting', 'Finish installing gravel on side of house /rain garden and plants', NULL, 0, 'sold', '2023-08-10', '2023-08-10 18:12:23'),
  (6287719, 30426173, '0008', 'Credit for one transformer', 'Owner purchased his own transformer', NULL, -435.00, 'sold', '2023-08-11', '2023-08-11 12:52:52'),
  (6288803, 30426173, '0009', 'Installing 36” Olive Tree', 'Owner purchased separately and we installed', NULL, 460.00, 'sold', '2023-08-13', '2023-08-13 08:30:12'),
  (6290552, 30426173, '0010', 'Relocate existing irrigation timer to backyard', 'Connecting to new irrigation zones and existing front yard zones', NULL, 175.00, 'sold', '2023-08-14', '2023-08-14 09:15:32'),
  (6293687, 30426173, '0011', 'Trenching for electrical conduit', '25’L x 18”D', NULL, 350.00, 'sold', '2023-08-15', '2023-08-15 04:48:31'),
  (6297473, 30549620, '0002', '11 additional plants', '(10)1 gallons
(1) 5 gallon', NULL, 275.00, 'pending', '2023-08-15', '2023-08-15 16:02:07'),
  (6297529, 12608924, '0051', 'Install 2- 24" box Jacaranda trees', NULL, NULL, 900.00, 'sold', '2023-08-15', '2023-08-15 16:25:18'),
  (6301601, 30553887, '0004', 'Additional plants to match the plan', 'The plan had more plants than the contract. We needed to add 13 5 gallon and 1 15 gallon to match. I discussed it with Marcia at the walk though and she approved. She wants all of the plants', NULL, 740.50, 'pending', '2023-08-16', '2023-08-16 15:24:47'),
  (6303003, 27905694, '0007', 'Replace broken marlex under roots', 'Time and materials', NULL, 75.00, 'sold', '2023-08-17', '2023-08-17 07:47:13'),
  (6308194, 30549620, '0003', 'Credit Against Failed Payment', NULL, NULL, -3580.00, 'pending', '2023-08-18', '2023-08-18 11:18:21'),
  (6308198, 30549620, '0004', 'New Completion Payment', NULL, NULL, 3580.00, 'pending', '2023-08-18', '2023-08-18 11:18:49'),
  (6308897, 30854463, '0001', 'Install Mulch, Minor Irrigation', '1) Install 900 sq feet of Medium bark Nugget
2) Check over entire irrigation system
3) Fix minor tears in tubing.', NULL, 0, 'pending', '2023-08-18', '2023-08-18 13:36:49'),
  (6313899, 30553887, '0005', 'Fxl upcharge', 'I have to have your approval for $2,782.00 to be able to offer all of the lights on the revised list with all color changing and dimming features.

Thank you!', NULL, 2782.00, 'sold', '2023-08-21', '2023-08-21 16:01:58'),
  (6318525, 13262395, '0029', 'Upgrade to Pebble Sheen', 'Upgrade from Pebble Fina finish to Pebble Sheen.  Color to be Aqua Blue', NULL, 3500.00, 'sold', '2023-08-22', '2023-08-22 18:14:14'),
  (6322756, 30426173, '0012', 'Credit for unused flagstone', NULL, NULL, -1101.19, 'pending', '2023-08-23', '2023-08-23 15:54:33'),
  (6322889, 27651875, '0006', 'Additional transformer and timer', NULL, NULL, 437.00, 'sold', '2023-08-23', '2023-08-23 16:48:58'),
  (6324571, 30154946, '0009', 'Credit', NULL, NULL, -500.00, 'pending', '2023-08-24', '2023-08-24 08:48:26'),
  (6328683, 30512103, '0001', 'Additional demo', '132 sf more', NULL, 594.00, 'pending', '2023-08-25', '2023-08-25 09:06:52'),
  (6328700, 30512103, '0002', 'Del rio 3/8" additional rock', '217 total. This is for the additional 132 sf', NULL, 754.00, 'pending', '2023-08-25', '2023-08-25 09:09:18'),
  (6328756, 30512103, '0003', 'Additional bender board', '15 additional lfx $8.00', NULL, 120.00, 'pending', '2023-08-25', '2023-08-25 09:19:23'),
  (6328948, 30512103, '0004', 'Additional gas line', 'Additional gas line. 45 lf. May recieve a credit if we are able to use less', NULL, 1575.00, 'pending', '2023-08-25', '2023-08-25 09:52:19'),
  (6329252, 29388894, '0004', 'CO Front Yard Phase 8.25.23', 'Front Wall Installation
 


	
	Dig footings for approximately 6 linear feet of wall.
	
	
	Footing size to be 1 ft wide and 1 ft deep
	
	
	Install #4 Rebar Cage in footings
	
	
	Install #4 Vertical Rebar 16 inches on center
	
	
	Pour 3000 PSI concrete footing
	
	
	Wet lay first course of 8 x 8 x16 CMU block
	
	
	Install additional courses per plan portion A wall in graded heights of 18 inches  tall
	
	
	In wall building install horizontal#4 rebar reinforcement.
	
	
	Grout lift all cells.
	
	
	Install 18 linear feet of CMU Wall Cap
	


COST $600
 

*Optional Install 80 linear feet of cmu wall cap at $5 per linear foot for storm planter

Optional stucco cap at $15 per linear foot. 

Front concrete
 


	
	Form for roughly 1850  total sq feet of colored concrete or topcast concrete tbd
	
	
	Install 2 inches of Class II roadbase.
	
	
	Compact base.
	
	
	Install #4 rebar 24 inches on center
	
	
	Pour 3000 PSI concrete flat sections
	
	
	Install roughly 240 linear of additional forming for pads and concrete cutaways.
	
	
	Light broom finish
	

 

COST $16,187



 
Front yard concrete step work. 
 


	
	Form for 90 linear feet of steps of colored  cantilever concrete at $70 per lf
	
	
	Install base and rebar, install form for future lighting
	
	
	Light broom finish
	


COST $6300
 

Pilaster work

(4) 24 inch pilasters with sand finish stucco

Light rough in (2)

Mail box fitted (1)

Bellecrete cap (2)

3 ft tall
 

COST $2,800
 

Removal of sand stucco -$540
 

24 linear feet of edges for smaller pilasters

36 linear feet of edges for larger pilasters 

60 linear feet of edges total at $30 per lf ft =$1800
 

88 sq ft of flat at 23.50 a sq ft $2068
 

6 lights at $350 each (halo lights with channel bracket) $2450


 
Additional Demo 

1 container allowance for front hillside grading and misc driveway grading $2400


 
Curbing
 

Forming for 14 linear feet of curbing and gutters to city spec at $60 a linear ft

$840
 

Permit fee $385.77

Demo of asphalt $380

Tree removal with stump grind $540

Additional drain work for storm planter $350

Total for front yard
 

36560.77', NULL, 36560.77, 'pending', '2023-08-25', '2023-08-25 10:46:35'),
  (6329265, 29388894, '0005', 'CO Fireplace tile', NULL, NULL, 1167.43, 'pending', '2023-08-25', '2023-08-25 10:49:57'),
  (6330670, 7666319, '0054', 'Misc timber items', '64 linear feet of timber added to single existing course

COST $3,584

Installing new timber wall for hillside retention 64 linear feet two courses high
128 linear feet of courses allotted 

COST $6144

Rebuilding collapsing wall using existing courses and new footing courses timbers. Compacting sunken areas and backfilling. $5,440

Misc repairs with 200 sq ft of california gold pathway
Misc demo for side of timberwalls

COST $1400', '64 linear feet of timber added to single existing course

COST $3,584

Installing new timber wall for hillside retention 64 linear feet two courses high
128 linear feet of courses allotted 

COST $6144
Misc repairs with 200 sq ft of california gold pathway
Misc demo for side of timberwalls

COST $1400', 0, 'pending', '2023-08-25', '2023-08-25 16:29:16'),
  (6334956, 29090849, '0003', 'Credit for 500sqft over contract', 'Credit for the difference of 500sqft  additonal mulch and demo', NULL, -1800.00, 'pending', '2023-08-28', '2023-08-28 14:49:08'),
  (6335172, 30741140, '0001', 'misc items', '90 sq ft of turf additional $1440
60 linear feet of new edging $410
Additional rock for front yard and backyard planters $1000  350 sq ft 
fixing and repair lighting / swapping replacement led bulbs (34 lights) at $40 per light $1360
additional planting $200 for tree and misc 1 gallon plants', NULL, 4410.00, 'pending', '2023-08-28', '2023-08-28 15:40:37'),
  (6335510, 12608924, '0053', '200 SF mulch', 'Remove mud/DG and replace with mulch (should be weed barrier under there).  Bring weed barrier just incase it''s needed.', NULL, 385.00, 'sold', '2023-08-28', '2023-08-28 17:45:48'),
  (6339622, 30561013, '0001', 'Additional bend a board 147lnft  (BACKYARD)', NULL, NULL, 1029.00, 'pending', '2023-08-29', '2023-08-29 15:41:31'),
  (6339637, 30512103, '0005', 'Additional 20 LF for electrical in attic', NULL, NULL, 250.00, 'pending', '2023-08-29', '2023-08-29 15:46:29'),
  (6341712, 12608924, '0054', 'Adding to lighting', '(1) FL-105B Big Smoky Accent Light w/Glare Control (ON NEW JACARANDA)
(3) FL-116B Wall Liter Accent Light LED T3 Lamp - 5W - 30K
(2) MOVE two lights to better area.
(1) Fix one light that was knocked over.', NULL, 1500.00, 'sold', '2023-08-30', '2023-08-30 09:31:56'),
  (6341714, 12608924, '0055', 'Clean out aeration pvc pipes', NULL, NULL, 0, 'sold', '2023-08-30', '2023-08-30 09:32:19'),
  (6344056, 28581838, '0021', 'Additional Stepstone steppers x 30', NULL, NULL, 1500.00, 'sold', '2023-08-30', '2023-08-30 16:43:11'),
  (6345866, 12608924, '0056', '50 SF pre-stablized D.G.', NULL, NULL, 300.00, 'pending', '2023-08-31', '2023-08-31 09:29:47'),
  (6347416, 31038031, '0001', 'Poly Sand', NULL, 'Changing to polymeric sand
To help keeping sand in place and filling larger gaps properly.', 407.00, 'pending', '2023-08-31', '2023-08-31 13:28:25'),
  (6347432, 31038031, '0002', 'Soldier Course around AC unit.', NULL, 'Adding vertical solider course around ac unit and cutting pavers for overlay on brick.', 226.00, 'pending', '2023-08-31', '2023-08-31 13:30:15'),
  (6347994, 28374487, '0002', 'Installing Additional Shrubbery + Irrigation', 'Install (10) 15 gallon Leucadendron ''Safari Sunset = $1800
Install (12) 15 gallon Carolina Cherry = $1800
Install (1) 15 gallon Purple Hopseed =$150
Stake 23 shrubs = $140
Extend irrigation to Carolina Cherries and add drip emitters to all new shrubbery= $750

Total = $4640.00', NULL, 4640.00, 'sold', '2023-08-31', '2023-08-31 15:23:41'),
  (6349316, 30569690, '0001', 'Redwood Planter Boxes x 2', '(1) @7x4x18”
(1) @7’x3x18”', NULL, 1700.00, 'sold', '2023-09-01', '2023-09-01 07:36:23'),
  (6349334, 30569690, '0002', 'Redoing Concrete next to ADU (drainage)', 'Saw cutting existing concrete 
Regrading area next to ADU to pitch water towards street
Pouring new concrete for 40sqft', NULL, 1100.00, 'sold', '2023-09-01', '2023-09-01 07:38:39'),
  (6349341, 30569690, '0003', 'Credit for channel drain', NULL, NULL, -850.00, 'sold', '2023-09-01', '2023-09-01 07:39:35'),
  (6349347, 30569690, '0004', 'Adding drain back corner of ADU', 'Adding a 22" drain from back corner of ADU to exit into garden bed', 'This can be removed, this was expired I added a new', 500.00, 'pending', '2023-09-01', '2023-09-01 07:40:41'),
  (6350200, 13262395, '0030', 'CREDIT Water Feature Front', NULL, NULL, -4750.00, 'pending', '2023-09-01', '2023-09-01 10:25:51'),
  (6351318, 30448638, '0001', 'NUTSEDGE REMEDIATION', NULL, NULL, 200.00, 'sold', '2023-09-01', '2023-09-01 14:40:31'),
  (6353376, 13262395, '0031', 'Pool change orders', 'Spa front wall got extended to the bottom of the bench so more tile is being added so that will be an addition $1600 additional change order The client asked for a new spa remote that I already have for him and that will be an additional $900 change order', NULL, 2500.00, 'sold', '2023-09-05', '2023-09-05 06:30:27'),
  (6355730, 29388894, '0006', 'CO Asphalt on street', 'Asphalt on street at cost $600.', NULL, 600.00, 'pending', '2023-09-05', '2023-09-05 12:45:21'),
  (6355873, 27816112, '0007', 'Change order for running new pipe.', NULL, '5 hours at $75 per hour plus 40 in material  total $415', 415.00, 'sold', '2023-09-05', '2023-09-05 13:07:05'),
  (6356705, 30418383, '0001', 'Add Arizona river rock', 'Pull about half a basket of old granite and add half basket of Arizona River rock 3" minus', NULL, 500.00, 'pending', '2023-09-05', '2023-09-05 16:07:03'),
  (6365403, 30418383, '0002', 'Additional work on river bed', 'This change order is to remove more granite rock from river bed and to repurpose in other parts of the yard. This is only time for labor.

5 hours 1 man', NULL, 350.00, 'pending', '2023-09-07', '2023-09-07 09:43:10'),
  (6367299, 30569690, '0005', 'Removal large Bougainvillea', NULL, NULL, 400.00, 'sold', '2023-09-07', '2023-09-07 14:25:41'),
  (6367763, 30418383, '0003', 'New planter irrigation and plants.', 'Install one new spray zone on side yard planter

Install 11 new gazania flats

Remove old ground cover in area.', NULL, 2150.00, 'pending', '2023-09-07', '2023-09-07 16:37:30'),
  (6367770, 30418383, '0004', 'Side yard sod', 'Side yard St Augustine 200 Sq ft.

Adjust irrigation heads.

Includes tilling, adding amendments, grading and laying of sod.', NULL, 1400.00, 'pending', '2023-09-07', '2023-09-07 16:40:09'),
  (6369310, 31157079, '0001', 'Widen parking spot', '24 additional sq feet', NULL, 336.00, 'pending', '2023-09-08', '2023-09-08 09:08:09'),
  (6372726, 30569690, '0006', 'adding drain behind adu', 'Adding a 22" drain from back corner of ADU to exit into garden bed', 'Adding a 22" drain from back corner of ADU to exit into garden bed', 500.00, 'sold', '2023-09-11', '2023-09-11 06:43:09'),
  (6373261, 26949840, '0004', 'FOOTINGS FOR PATIO COVER', '(6) 27"X27"X27" CONCRETE FOOTINGS FOR PATIO COVER, INCLUDES DIGGING HOLES, FORMING FOR CONCRETE AND POURING CONCRETE', NULL, 5400.00, 'sold', '2023-09-11', '2023-09-11 08:29:59'),
  (6373924, 30569690, '0007', '(1) 15 gallon Catalina Ironwood Tree', NULL, NULL, 150.00, 'sold', '2023-09-11', '2023-09-11 10:21:48'),
  (6374824, 30569690, '0008', 'Remove 2nd large Bougainvillea', NULL, NULL, 400.00, 'pending', '2023-09-11', '2023-09-11 12:48:18'),
  (6378770, 30569690, '0009', '2 yards 50/50 soil for planters', NULL, NULL, 300.00, 'sold', '2023-09-12', '2023-09-12 11:50:18'),
  (6381991, 13262395, '0032', 'Adding Microbrights w/installation', '$1600 for lights (offered lower price to client)
$ 600 Installation
$160 Sales Tax', NULL, 2360.00, 'sold', '2023-09-13', '2023-09-13 08:30:12'),
  (6382750, 30542368, '0001', 'Foundation Work', '4 Man Days
Demo, trenching, sewer, crack repair, backfilling, compacting. 

Part Guy Hauling and Dump Fees
Material Fees', NULL, 3000.00, 'pending', '2023-09-13', '2023-09-13 10:20:30'),
  (6384860, 30561013, '0002', 'Benderboard option approved from original estimate', '400 linear feet of benderboard was put in from the options in contract.', NULL, 2800.00, 'pending', '2023-09-13', '2023-09-13 17:05:47'),
  (6391919, 30561013, '0003', 'Channel Drains and moving/resetting concrete steps', 'Adding 16 linear feet of channel drains and connecting it with drain system. 
Channel drain to be set in concrete and grading to appropriate grade 
We would need to lift all the concrete squares in that area and reset them', NULL, 1920.00, 'pending', '2023-09-15', '2023-09-15 12:09:29'),
  (6393453, 30569690, '0010', 'Credit for lattice install', NULL, NULL, -350.00, 'pending', '2023-09-17', '2023-09-17 20:44:59'),
  (6397090, 18189451, '0003', 'Adding plants and Rachio Install', NULL, 'Price for adding plants $276
Rachio Install $225', 501.00, 'pending', '2023-09-18', '2023-09-18 15:43:49'),
  (6401736, 30418383, '0005', 'Lights', NULL, NULL, 2610.00, 'pending', '2023-09-19', '2023-09-19 16:09:12'),
  (6403457, 13262395, '0033', 'Additional parts for pool equipment', NULL, NULL, 7800.00, 'sold', '2023-09-20', '2023-09-20 08:18:37'),
  (6406462, 30741140, '0002', 'Additional work on stain/sealer', NULL, NULL, 300.00, 'pending', '2023-09-20', '2023-09-20 17:29:46'),
  (6414078, 31330972, '0004', 'Waterproofing Neighboring wall', 'Install 96 square feet of waterproofing on neighboring wall Primer and membrane
To meet up with existing waterproof as best as possible', NULL, 1166.40, 'pending', '2023-09-22', '2023-09-22 15:38:21'),
  (6416677, 31273124, '0001', 'Stump grind 2 Crepe Myrtle trunks', NULL, NULL, 150.00, 'sold', '2023-09-25', '2023-09-25 10:17:16'),
  (6416684, 31273124, '0002', '15’ bender board', NULL, NULL, 105.00, 'sold', '2023-09-25', '2023-09-25 10:18:58'),
  (6416733, 31273124, '0003', '4 yards 50/50 topsoil backfill', NULL, NULL, 460.00, 'sold', '2023-09-25', '2023-09-25 10:25:48'),
  (6416855, 31273124, '0004', 'Extra demo front planters against house', NULL, NULL, 150.00, 'sold', '2023-09-25', '2023-09-25 10:44:06'),
  (6418656, 30418383, '0006', 'CREDIT 1 Lights and 20 sqft turf', '1 light - $240
20 sqft turf - 350', NULL, -590.00, 'pending', '2023-09-25', '2023-09-25 15:53:45'),
  (6418658, 30418383, '0007', 'Gorilla hair mulch update', NULL, NULL, 500.00, 'pending', '2023-09-25', '2023-09-25 15:54:00'),
  (6420188, 31248085, '0001', 'Stackable Garden Wall', '1) Install gravel base for wall
2) Install 112 linear feet of stackable wall block by Angelus 4” x 12” x 7” to 24 inches high
3) Install 107 linear feet of stackable wall block by Angelus 4” x 12” x 7” to 18 inches high', NULL, 17645.00, 'pending', '2023-09-26', '2023-09-26 08:06:38'),
  (6420930, 31248085, '0002', 'Retaining/Seat Wall & Hidden Under Lighting', '1) Dig footings for 20 Ln Feet of Retaining Wall in Pool Equipment Are 2 to 3 feet wide
1a) Dig section for footing keys per plan
2) Dig footings for 60 Ln Feet of Retaining Wall for Pool Access Walls (steps section)
2a) Dig section for footing keys per plan
3) Dig footings for 65 Ln Feet of Retaining/Seat Wall 
4) Install rebar cage for all retaining walls per plan including rebar from #3 to #5
5) Pour footings for all walls.
6) Install 20 linear feet of 8x8x16 CMU for Pool Equipment Retaining Wall. Up to 4 foot height
7) Install 60 linear feet of 8x8x16 CMU for Pool Access Wall.  Staggered Height Average of 2.5 to 3 feet height
8) Install 65 linear feet of 8x8x16 CMU for Seat Walls. Height to be 18"
9) Install Retaining Gravel behind all walls for wall drainage system
10) Install 145 linear feet of 3" French drain system with geotextile socks and or gravel bed wrapping.
11) Install base prime coat of water proofing in 357 square feet of wall area.
12) Install bitchinthane or similar waterproofing membrane in 357 sqare feet of wall area.
13) Form for 145 linear feet of poured in place concrete wall cap.
14) Install rebar reinforcement for poured in place wall cap 145  linear feet.
15) Pour roughly 210 sq feet of colored 2500 psi concrete for wall cap
16) Install Mesh Coat base stucco layer for 357 square feet of wall
17) Install Final Coast stucco layer for 357 square feet of wall.
18) Form for strip brackets under tops.  
19) Install strip lighting brackets
20) Install LightCraft strip lighting under all seat walls and Wall caps.', NULL, 47792.00, 'pending', '2023-09-26', '2023-09-26 10:00:30'),
  (6420948, 30542368, '0002', 'Credit Light Purchase', NULL, NULL, -865.00, 'pending', '2023-09-26', '2023-09-26 10:04:20'),
  (6421019, 30542368, '0003', 'Added Work', '1) Install 4 additional lights -  $480
2) Planting $1330
3) Mulch and Much Installation -$1060
4) Extra Drain - $375
5) Steel Bender Board Upgrade - $535', NULL, 3780.00, 'pending', '2023-09-26', '2023-09-26 10:15:31'),
  (6423165, 26949840, '0005', 'BBQ EQUIPMENT', '1) 32" BBQ 
2) DOUBLE ACCESS DOORS (UNDER BBQ)
3) SINGLE ACCESS DOOR (UNDER SINK)
4) REFRIGERATOR 
5) ICE CHEST
6) SINK
7) TRASH BIN
8) DOUBLE DRAWERS', NULL, 8500.00, 'sold', '2023-09-26', '2023-09-26 16:21:06'),
  (6427387, 30216439, '0007', 'Additional trees', 'We will need to install 7- 24" box red leaf plums Planting mix. $2695. We need a bigger gauge wire for the bougainvillea and hardware. $380.', NULL, 3075.00, 'sold', '2023-09-27', '2023-09-27 15:12:13'),
  (6429126, 31248085, '0003', 'Gas Line, Added Retaining Drain Exit,', '1) Add in 185 linear feet of gas line - $7065
2) Retaining walls subsurface drain tie in.  - $6003) Includes trenching and backfilling.', NULL, 7665.00, 'pending', '2023-09-28', '2023-09-28 08:23:59'),
  (6429468, 26949840, '0006', 'Credit for Concrete Curb', NULL, NULL, -2600.00, 'sold', '2023-09-28', '2023-09-28 09:20:33'),
  (6429918, 26949840, '0007', 'Pony wall (north side perimeter)', '(2) courses of block @ 83 linear feet 
(1) course of block @ 46 linear feet', NULL, 9800.00, 'sold', '2023-09-28', '2023-09-28 10:21:51'),
  (6429923, 26949840, '0008', 'Pony wall (South side perimeter)', '(2) courses of block @ 90 linear feet', NULL, 6800.00, 'sold', '2023-09-28', '2023-09-28 10:22:51'),
  (6431692, 28275378, '0005', 'Credit for Plants', NULL, 'Credit for 8 1 gallons 
20 succulents on flats', -225.00, 'sold', '2023-09-28', '2023-09-28 15:26:43'),
  (6439829, 31273124, '0005', 'Credit for parkway mulch', NULL, NULL, -200.00, 'sold', '2023-10-02', '2023-10-02 14:53:59'),
  (6439842, 31273124, '0006', 'Del Rio Gravel For Parkway', NULL, NULL, 400.00, 'sold', '2023-10-02', '2023-10-02 14:56:43'),
  (6439850, 31273124, '0007', 'Del Rio Gravel for planter against house', NULL, NULL, 160.00, 'sold', '2023-10-02', '2023-10-02 14:57:37'),
  (6442424, 31425637, '0001', '1 additional irrigation zone for existing trees', 'Netafim drip with copper shield', NULL, 1425.00, 'sold', '2023-10-03', '2023-10-03 09:51:08'),
  (6442883, 7666319, '0055', 'Wall rebuild', 'wall rebuild with additional supports', NULL, 8600.00, 'pending', '2023-10-03', '2023-10-03 11:05:13'),
  (6444622, 31425637, '0002', 'Rear Fountain', '•  Create a raised, sturdy base for the hand pump - 6" to 8" high above soil level. 
•  Made of cinder block on a cement footing with cinder block voids filled with cement - to make the top of the cinder blocks look flush.
•  With a black plastic tub set into the ground - edges at soil level - in front of the hand pump, creating a small "pond.".
•  Position pump at edge of cinder block base - as close as practical to black plastic tub.

Black plastic tub dimensions:  35" long x 25" wide x 12" deep.', NULL, 3500.00, 'sold', '2023-10-03', '2023-10-03 15:43:05'),
  (6447227, 26949840, '0009', 'Additional demo to fire pit area', NULL, NULL, 5620.00, 'sold', '2023-10-04', '2023-10-04 10:41:36'),
  (6447230, 26949840, '0010', 'Additional gas for fire pit', NULL, NULL, 630.00, 'sold', '2023-10-04', '2023-10-04 10:42:10'),
  (6447234, 26949840, '0011', 'Plumbing for sink', NULL, NULL, 600.00, 'sold', '2023-10-04', '2023-10-04 10:42:30'),
  (6447242, 26949840, '0012', 'Move electrical and water line', NULL, NULL, 340.00, 'sold', '2023-10-04', '2023-10-04 10:42:59'),
  (6447271, 26949840, '0013', 'Additional Drainage  from Adu to street', 'Additional 545 LF from ADU to street including tap into all down spouts on house', NULL, 16350.00, 'sold', '2023-10-04', '2023-10-04 10:46:52'),
  (6453758, 31248085, '0004', 'Grading & Compaction of 1st Tier Garden Wall', 'We had to add more soils and compact entire 1st tier of garden wall sections,', NULL, 2700.00, 'sold', '2023-10-05', '2023-10-05 17:09:07'),
  (6465828, 31425637, '0003', 'Planting add’l plants + delivery', '(54) 1 gallons
(90) 4”', NULL, 475.00, 'sold', '2023-10-10', '2023-10-10 16:39:27'),
  (6469977, 31382032, '0001', 'Additional surface drainage', '55 linear feet of 3" surface drain across front of the house', NULL, 1265.00, 'sold', '2023-10-11', '2023-10-11 15:28:39'),
  (6469982, 31382032, '0002', 'Dry Creek for Front Yard', '17 linear feet of bed at 3'' wide connected 8''x5'' dry pool', NULL, 2200.00, 'sold', '2023-10-11', '2023-10-11 15:30:38'),
  (6469998, 31425637, '0004', 'Additional boulders', 'Original estimate gave an allowance of $2000-2500, however only $2000 was included in total contract cost.  The remaining $500 was needed to complete the requested order', NULL, 500.00, 'sold', '2023-10-11', '2023-10-11 15:37:03'),
  (6473908, 31248085, '0005', 'Irrigation and Added Hosebibs', '1)  Install 10 schedule 80 risers for hosebibs
2)  Install 10 brass hose bibs.
3) Support stake hosebib risers.
4) Install (4) main line water shutoff valves
5) Install (2) backflow prevention devices on water lines
6) Install (1) 8 station Rachio Irrigation Controller with outdoor cabinet
7) Install (1) 16 station Rachio Irrigation Controller with outdoor cabinet
8) Install 14 zones of lateral pipe per Section A of Irrigation Schedule. 3/4" PVC Schedule 40 per spec. Roughly 1820 linear feet.
9) Install 7 zones of lateral pipe per Section B of Irrigation Schedule. 3/4" PVC Schedule 40 per spec. Roughly 720 linear feet.
10) Install 10 irrigation filter/pressure regulators for flood zones.
11) Install 5 copper subterranean drip grids per plans
12) Install flush valves for all subterranean drip grid systems.
13) Install 16 zones of drip line or rotors for slope/edible garden  and tree irrigation
14) Install 21 Rain Bird Anti Siphon Valves', NULL, 26700.00, 'sold', '2023-10-12', '2023-10-12 14:37:12'),
  (6473955, 31248085, '0006', 'Speaker wire and Conduit', 'Run 245 linear feet of conduit and speaker wire per plan.  Includes added trenching.', NULL, 3675.00, 'sold', '2023-10-12', '2023-10-12 14:48:46'),
  (6474004, 31248085, '0007', 'Poured in Place Coping', '1) Form for 124 liner feet of pool coping.
2) Form for Pool Vault Sections for pool coverings. Vault support by other contractor
3) Pour concrete, Color TBD
4) Pull forms', NULL, 9735.00, 'sold', '2023-10-12', '2023-10-12 14:58:40'),
  (6474121, 13262395, '0034', 'CREDIT Light Labor credit', NULL, NULL, -2037.50, 'pending', '2023-10-12', '2023-10-12 15:31:42'),
  (6474125, 13262395, '0035', 'CREDIT Gravel, Planter Wall', 'Gravel
			$680.00
			0%
		
		
			Planter Wall
			$1,477.00
			0%
		
	



Removed from scope of work, picture build did not do.', NULL, -2157.00, 'pending', '2023-10-12', '2023-10-12 15:33:08'),
  (6474134, 13262395, '0036', 'CREDIT A/C Screen', NULL, NULL, -1600.00, 'sold', '2023-10-12', '2023-10-12 15:35:31'),
  (6474424, 31425637, '0005', 'Concrete stacks x 2', NULL, NULL, 240.00, 'sold', '2023-10-12', '2023-10-12 18:27:26'),
  (6477878, 31382032, '0003', 'Privacy Wall Rebuild/Reinforcement', 'Demo and Rebuild middle section of wall that''s shared with neighbor @ 27 linear feet x 5 tall, wall to include footing, rebar and grout lifting
Add (11)  reinforcement pilasters to remaining sections of wall - will need to saw cut into concrete to add footings
Each pilaster to be 5'' tall by 8" wide', NULL, 9200.00, 'pending', '2023-10-13', '2023-10-13 15:39:49'),
  (6477896, 13262395, '0037', 'Additional Tiles below current tile line', NULL, NULL, 2200.00, 'sold', '2023-10-13', '2023-10-13 15:57:44'),
  (6480199, 30579258, '0001', 'Plant Change Order', NULL, NULL, 1754.50, 'pending', '2023-10-16', '2023-10-16 09:45:10'),
  (6480258, 31333701, '0001', 'Move and repair the existing sprinker line', NULL, NULL, 120.00, 'sold', '2023-10-16', '2023-10-16 09:54:49'),
  (6480275, 31333701, '0002', 'Add timer', 'Add rainbird timer with modules for 13 stations', NULL, 689.00, 'sold', '2023-10-16', '2023-10-16 09:57:03'),
  (6480281, 31333701, '0003', 'Add 106 LF metal edging', NULL, NULL, 1672.00, 'sold', '2023-10-16', '2023-10-16 09:57:48'),
  (6480287, 31333701, '0004', 'Add main 65LF. Main line with Hose bib', NULL, NULL, 1255.00, 'sold', '2023-10-16', '2023-10-16 09:58:47'),
  (6480309, 31333701, '0005', 'Add 1 zone for citrus trees', NULL, NULL, 950.00, 'sold', '2023-10-16', '2023-10-16 10:02:02'),
  (6483629, 26949840, '0014', 'Property Survey', 'Pls note the surveying company will need a copy of the legal description from the grant deed in order to the survey.  If you’d like easements included a full title report and underlying documents may be required.

Description of service provided:

• Recover and find original survey monuments
• Prepare calculations for setting monuments
• Set iron pipes on lot corners and markers on lot lines
• Prepare a Record of Survey showing the monuments found or set (stamped and signed)
• File map with the County Surveyor at the county of Los Angeles Building (required)', NULL, 5600.00, 'pending', '2023-10-17', '2023-10-17 07:22:24'),
  (6484440, 31511056, '0001', 'Design', NULL, NULL, 1000.00, 'pending', '2023-10-17', '2023-10-17 09:18:19'),
  (6487130, 29388894, '0007', 'Pool', 'Coping-bellecrete mocha modern finish sand
tile work with elements bronze 6x6
equipment -spa heater-filter-pump-two lights for spa and pool
Baja shelf 13x9 
widening of spa spillway to 42 inches
one step
pebble finish black
plumbing
electrical and gas hookup', NULL, 50000.00, 'pending', '2023-10-17', '2023-10-17 16:53:53'),
  (6487163, 31511192, '0001', 'Electrical/switch reroute and repair', 'fixing outdoor lighting and camera', NULL, 200.00, 'pending', '2023-10-17', '2023-10-17 17:08:36'),
  (6491577, 30448638, '0002', 'Flats of Carex Pansa for lawn area', NULL, NULL, 1200.00, 'sold', '2023-10-18', '2023-10-18 15:59:45'),
  (6493591, 31382032, '0004', 'Upgraded Boulders, Cobbles and Gravel/Dry Creek', 'Upgraded to more expensive gravel, cobble and boulder selections for dry creek and kept some extra for future use (we returned 1/2 basket of 3-6" Yosemite and 1/2 basket of 3-6" Auburn)
Used 1/2 basket of 3-6" Yosemite=$210.00
          1/2 basket of 3-6" Auburn = $300.00
           1 basket 1-2" Yosemite = $65.00
           1 basket 6-9" Auburn =$640.00
           Granite boulders 18" (multiple)=$70.00
LABOR=$1515.00', NULL, 600.00, 'pending', '2023-10-19', '2023-10-19 09:11:44'),
  (6493597, 31382032, '0005', 'Upgraded gravel for around fountain', '40sqft of Mojave 3/4" gravel (originally spec''d out at 20sqft Del Rio Gravel)', NULL, 100.00, 'sold', '2023-10-19', '2023-10-19 09:12:52'),
  (6493600, 31382032, '0006', 'Credit for brick cap repair', NULL, NULL, -150.00, 'pending', '2023-10-19', '2023-10-19 09:13:43'),
  (6495838, 31382032, '0007', 'Reinforce/Build/Repair Brick Wall', 'We still need 2 quotes for the walls. Both quotes should have the shared wall separately priced and broken out in detail. We will decide whether to keep the original scope of fixing all the top caps on the walls or adding in the reinforcing etc. I don''t want to approve or deny the brick cap repair change order I see until we can get this other information.

Can this work be completed between Nov 12 - Dec 9?  I can approve prior to leaving out of town next week, if we get it and have a few days to review and talk with our neighbors.
1st Quote Reinforcement of the walls with pilaster. Qty of 8x8 pilasters on the shared wall = $$, Qty of 8x8 pilasters on the back wall =$$, 
2nd Quote Reinforcement/Rebuild : rebuild 27''x5'' linear ft =$$ shared wall. Qty of 8x8 pilaster of Shared wall=$$  , Qty of 8x8 pilaster on the back wall =$$', NULL, 0, 'pending', '2023-10-19', '2023-10-19 15:03:46'),
  (6503844, 30448638, '0003', '3 fruit trees', '15 gallon Lime
15 gallon Mission Fig
15 gallon Haas Avo', NULL, 450.00, 'sold', '2023-10-23', '2023-10-23 14:01:21'),
  (6506517, 31248085, '0008', 'Replace 50 LF old damaged drain pipe side of house', NULL, NULL, 1500.00, 'sold', '2023-10-24', '2023-10-24 09:12:18'),
  (6506963, 31248085, '0009', 'Concrete Work', 'Form and Pour Concrete sections.   Base, Rebar, 2500 PSI concrete.  Color TBD. Light Broom Finish

Walkway to Pool Equipment 27x6
Walkway to Oak Patio 5x5
Oak Patio 14x25
Concrete Steppers 18 (2x2)
Pool Deck 4x20,  16x26,  46x6,  8x34
Pool Equip Area 13 x 6.5
189 Linear Feet of Total Steps and Sides

Roughly 40 yards of concrete.', NULL, 36894.00, 'sold', '2023-10-24', '2023-10-24 10:15:18'),
  (6509279, 31581766, '0001', 'Cut, Fill, Compact', 'Lot will be cut down to trench depth and refilled and recompacted. Roughly 48'' wide x 113'' long x 24 - 30" depth.  Grade will be brought up to 8 inches below T.O.S. 
We may need to cut some additional soils from property to bring up grade that will be replenished with trench spoils and recompacted.', NULL, 15000.00, 'sold', '2023-10-24', '2023-10-24 16:41:57'),
  (6509326, 31248085, '0010', 'Design for West side of Yard (adjacent to pool)', 'Creating a 3D design for 2 areas on West side of the yard adjacent to the pool', NULL, 750.00, 'sold', '2023-10-24', '2023-10-24 17:02:19'),
  (6515715, 26949840, '0015', 'Adding strip lights to fire pits, bench, kitchen', '120 linear feet of strip lights added', NULL, 6200.00, 'sold', '2023-10-26', '2023-10-26 09:26:36'),
  (6515719, 26949840, '0016', 'Additional tree demo', 'Remove trees in back corners of property line and stump grind roots
Stump grind all remaining stumps along west side fence line
Remove vines along west side fence', NULL, 4800.00, 'sold', '2023-10-26', '2023-10-26 09:26:57'),
  (6516252, 31248085, '0011', 'Rain Tank System', '1) Install (2) Bushman 5050 gal Round Raintanks (Tan) 
2) Install (2) Bushman BCK0001 First Flush Connection Kits
3) Install (1) Bushman BCK0003  First Flush Key Component Kits
4) Install (2) Flex Hose Kits
5) Install (2) Bushman Auto Fill #64333
6) Install (1) AY McDonald E series 3/4 hp 120v Boot Pumps
7) Includes $1200 Freight Charge and tax.', NULL, 17141.11, 'sold', '2023-10-26', '2023-10-26 10:51:10'),
  (6516441, 31248085, '0012', 'Concrete Pad for  Rain Tank', '1) Grade out to best possible for new pad.
2) Dig out the edge of the pad down into the slope so it will retain the pad.
3) For new pad with 12 -18 inch high edge sections to take out slope.
4) Install rebar
5) Pour 12 x 22 foot pad to hold both rain tanks.', NULL, 8840.00, 'sold', '2023-10-26', '2023-10-26 11:24:18'),
  (6518095, 31333701, '0006', 'Add gopher baskets', 'Total of 248 1 gal. Gopher baskets 

Total of 162 5 gal. Gopher baskets', NULL, 3852.00, 'sold', '2023-10-26', '2023-10-26 17:52:23'),
  (6524870, 31333701, '0007', 'Add lights and transformer', 'Install 1- 300w. Transformer 

Install 11-  AP-00B-107 in bronze
Install 9-   FL-289B IN BRONZE', NULL, 5014.00, 'sold', '2023-10-30', '2023-10-30 11:33:45'),
  (6526243, 28088643, '0002', 'Additional sod for Front Yard', NULL, 'We will install an additional 285 sqft of RTF sod for the front yard area

Total charge 1200', 1200.00, 'pending', '2023-10-30', '2023-10-30 15:21:47'),
  (6526496, 31545886, '0001', 'Replace gas line for pool and BBQ', 'Total of 57LF. 2''poly line and 37 LF 1"poly line', NULL, 3122.00, 'pending', '2023-10-30', '2023-10-30 16:45:52'),
  (6529655, 31382032, '0008', 'Installing back wall support pilasters', 'Installing 6 every 8 feet across back wall', NULL, 1440.00, 'sold', '2023-10-31', '2023-10-31 12:47:25'),
  (6529846, 31696923, '0001', 'Additional demo for deck area', NULL, NULL, 600.00, 'sold', '2023-10-31', '2023-10-31 13:14:19'),
  (6530366, 30561013, '0004', 'Referral', 'Client referall discount', NULL, -500.00, 'pending', '2023-10-31', '2023-10-31 14:50:40'),
  (6534797, 28088643, '0003', 'Additional items', 'Removal of one tree $1000Adding 15 15 gallon shrubs 2250', NULL, 3250.00, 'pending', '2023-11-01', '2023-11-01 16:11:00'),
  (6534917, 30426173, '0013', 'Drain with Basin', NULL, 'Installing 6 linear feet of drain. 9x9 catch basin with pvc cover.', 387.00, 'pending', '2023-11-01', '2023-11-01 16:57:43'),
  (6534956, 26864979, '0005', 'Tilling soil between groundcover areas', '(3) hours of work)
Loosen soil between ground cover to soften the ground up, add some soil amendments to enrich soil structure', NULL, 225.00, 'sold', '2023-11-01', '2023-11-01 17:25:27'),
  (6539283, 26949840, '0019', 'Metal fencing', 'Installing 670 linear feet 6 feet tall fencing 7 foot on center spacing of posts.
Approximately 105 posts 8–10 feet in length to inlay 2-3 foot into wall and footings.

2) electric motors for driveway sliding gates with capacity to be controlled with phone as well as 4 controllers
5-year warranty on gate motors

2) 14 by 6 foot sliding gates for driveway entrances connected to electric motors. Includes two 28 foot track rails.

12 by 6 entryway fencing with 4 foot door. Including 2 standard handles. Also, includes all hardware for door.
Door must be set to swing outwards towards street to comply with city and state regulations.

All fencing and posts will be powder coated Flat Black.
All connections will be hand welded on site throughout entire fence.', NULL, 131000.00, 'sold', '2023-11-02', '2023-11-02 17:46:00'),
  (6542123, 3905763, '0009', 'Grinding and adding sand cracked areas', 'Grinding out sand where there are cracks and refilling the polymeric sand for the entire paver area.', NULL, 900.00, 'pending', '2023-11-03', '2023-11-03 13:15:45'),
  (6542131, 3905763, '0010', 'Sealing pavers natural look sealer', 'Providing and installing natural look sealer for 1600 sqft of pavers', NULL, 1200.00, 'pending', '2023-11-03', '2023-11-03 13:17:16'),
  (6542133, 3905763, '0011', 'Sealing pavers Wet look sealer', 'Providing and installing wet look sealer for 1600 sqft of pavers', NULL, 1400.00, 'pending', '2023-11-03', '2023-11-03 13:17:49'),
  (6542687, 8237000, '0006', 'Replaced one light', 'Changed one light at cost', NULL, 110.00, 'pending', '2023-11-03', '2023-11-03 17:07:33'),
  (6551730, 31511092, '0001', 'Additional Retaining wall', '20 linear foot wall 3 feet hight with 3 foot by 1 foot footings $189 per foot $3780 total.
To be built with slump stone in doeskin

25 linear feet of root barrier 3 feet deep $600', NULL, 4380.00, 'pending', '2023-11-07', '2023-11-07 14:21:04'),
  (6551734, 31511092, '0002', 'Additional Demo of Tree stump.', 'Demo for very large tree stump and roots in the raised where the new patio will be going. 
We will just charge labor for this any additional dump fees and stump grinding pricing we will cover.

Additional labor is at $600', NULL, 600.00, 'pending', '2023-11-07', '2023-11-07 14:21:32'),
  (6552109, 31511092, '0003', 'Lighting', NULL, NULL, 0, 'pending', '2023-11-07', '2023-11-07 16:02:12'),
  (6556130, 30659893, '0001', 'Main line run from fron of the house', 'Installing 65 linear feet of main line on the side of house
Cutting out concrete as needed for mainline.', NULL, 750.00, 'sold', '2023-11-08', '2023-11-08 13:32:40'),
  (6556144, 30659893, '0002', 'Adding concrete side of the house', 'Adding concrete on the gap on the east side of the house
Approximately 60 sqft 
4 Inches of base 
3 inch concrete
2500 psi
Broom finish', NULL, 900.00, 'sold', '2023-11-08', '2023-11-08 13:34:22'),
  (6559096, 31696923, '0002', 'Additional drainage (50LF)', NULL, NULL, 1750.00, 'pending', '2023-11-09', '2023-11-09 10:46:31'),
  (6559107, 31696923, '0003', 'Additional demo (concrete pad)', NULL, NULL, 460.00, 'pending', '2023-11-09', '2023-11-09 10:47:40'),
  (6564125, 30216439, '0008', '8 Yards of Brown Shredded Mulch', 'Supplying and installing 8 cubic yards of brown shredded mulch.', NULL, 1000.00, 'pending', '2023-11-10', '2023-11-10 14:37:30'),
  (6567486, 31837744, '0001', 'Concrete pad removal', '232 Square Feet concrete to be removed', NULL, 755.62, 'sold', '2023-11-13', '2023-11-13 11:54:53'),
  (6572687, 31545886, '0002', 'pool plumbing', 'plumbing with new skimmer', 'plumbing with new skimmer', 6800.00, 'pending', '2023-11-14', '2023-11-14 14:04:46'),
  (6572866, 32061671, '0001', 'Credit for Drip Zone', 'Credit for removing one drip.', NULL, -950.00, 'pending', '2023-11-14', '2023-11-14 14:43:12'),
  (6577074, 30579258, '0002', 'Wall Credit for courses not installed', '26 Linear Feet X $34.00 = $884.00 credit', NULL, -884.00, 'pending', '2023-11-15', '2023-11-15 13:59:27'),
  (6581866, 31545886, '0003', 'CREDIT - Shoring', NULL, NULL, -5200.00, 'pending', '2023-11-16', '2023-11-16 16:39:55'),
  (6591520, 32061671, '0002', 'Pressure Regulator', 'Installing pressure regulator for watter pressure to valves.', NULL, 170.00, 'pending', '2023-11-21', '2023-11-21 07:14:05'),
  (6592692, 30741140, '0003', '7 lights', '7 lights installed.', NULL, 1300.00, 'pending', '2023-11-21', '2023-11-21 10:25:36'),
  (6593985, 30216439, '0009', 'CREDIT', NULL, NULL, -400.00, 'pending', '2023-11-21', '2023-11-21 13:42:02'),
  (6597589, 31837744, '0002', 'Bender Board', '22.5 Linear Feet X $7.00  in the front of the property to border neighbor.', NULL, 157.50, 'sold', '2023-11-22', '2023-11-22 14:01:50'),
  (6597606, 31837744, '0003', 'Additional Square Feet of Dry River Bed', '25 additioanl square feet of dry river bed, trenching, large and small rocks X $24.00 (Reduced from $28 a SF)= $600.00
This is as drawn today', NULL, 600.00, 'sold', '2023-11-22', '2023-11-22 14:04:56'),
  (6597615, 31837744, '0004', 'Drain Lines f house to dry river bed', '2 lines from the corners of the front garage:
1)  18 Linear Feet from the corner of the garage to the end of the Dry River Bed
2)  16 Linear Feet from the garage Driveway corner to the begining of the Dry River Bed
34 Linear Feet total X $20.00= $680.00  (Reduced from $25.00 a Linear Foot)', NULL, 680.00, 'sold', '2023-11-22', '2023-11-22 14:09:12'),
  (6597642, 31837744, '0005', 'Valve Additioanl for future use', 'The planter beds in front will need their own valve based on water pressure in the future.
Inlcudes additing a line through both planters in the front, and a PVC connection under the brick planter mow strip to the side of the house for future emitters.
Price reduced, because not all of the furture plants are installed at the time.
$800.00', NULL, 800.00, 'sold', '2023-11-22', '2023-11-22 14:15:53'),
  (6597691, 30579258, '0003', 'Design Credit', '1/2 of the Design fee credited back to installation  $1/2 0f $750.00= $375.00', NULL, -375.00, 'pending', '2023-11-22', '2023-11-22 14:32:56'),
  (6600767, 31333701, '0008', 'Main line repair', NULL, NULL, 750.00, 'pending', '2023-11-27', '2023-11-27 07:00:47'),
  (6602014, 31837744, '0006', 'Additional soil demo', 'Up to 1 lowboy,', NULL, 1600.00, 'sold', '2023-11-27', '2023-11-27 10:19:58'),
  (6603098, 31696923, '0004', 'Credit for driveway concrete', '80sqft', NULL, -656.00, 'sold', '2023-11-27', '2023-11-27 13:00:35'),
  (6603123, 31696923, '0005', 'Additional Apron for Driveway per city inspection', '16 feet long by 5’ wide at standard 6” deep', NULL, 3100.00, 'sold', '2023-11-27', '2023-11-27 13:03:07'),
  (6603141, 31696923, '0006', 'Permit for driveway apron', NULL, NULL, 600.00, 'sold', '2023-11-27', '2023-11-27 13:05:19'),
  (6603544, 31696923, '0007', 'Additional drainage for front yard', '40 linear feet additional', NULL, 1400.00, 'sold', '2023-11-27', '2023-11-27 14:13:12'),
  (6604203, 31511092, '0004', 'Credit of wall and steps', NULL, NULL, -1905.00, 'pending', '2023-11-27', '2023-11-27 17:45:18'),
  (6605865, 27816112, '0008', 'CREDIT - Pergola', NULL, NULL, -17162.00, 'pending', '2023-11-28', '2023-11-28 09:05:24'),
  (6606532, 31696923, '0008', 'Additional step linear feet for front entry', '+10 linear feet', NULL, 750.00, 'pending', '2023-11-28', '2023-11-28 10:49:30'),
  (6606544, 31849639, '0001', 'Additional 40sqft of Turf', NULL, NULL, 520.00, 'sold', '2023-11-28', '2023-11-28 10:51:12'),
  (6607073, 30418383, '0008', 'Additional light and tree', NULL, NULL, 360.00, 'sold', '2023-11-28', '2023-11-28 12:10:22'),
  (6615062, 12174250, '0003', 'Paver Repair', NULL, NULL, 628.75, 'pending', '2023-11-30', '2023-11-30 10:04:06'),
  (6617243, 31837744, '0007', 'Plant change order', 'Credit for 9 1 gallon daisies $21.50 each $193.50
Adding 7 dirt flats $67.00 each $469.00
$275.50 total difference', NULL, 275.50, 'sold', '2023-11-30', '2023-11-30 16:45:01'),
  (6620837, 31696923, '0009', 'Additional lighting for driveway', 'Approved via text', NULL, 720.00, 'sold', '2023-12-02', '2023-12-02 12:03:26'),
  (6623081, 26949840, '0020', 'Additional pavers for ADU area', '+1560sqft pavers for (2) sides and back of ADU', NULL, 23800.00, 'sold', '2023-12-04', '2023-12-04 09:55:36'),
  (6623085, 26949840, '0021', 'Additional steps for ADU area', '60 linear feet of paver steps', NULL, 3300.00, 'sold', '2023-12-04', '2023-12-04 09:56:13'),
  (6623110, 26949840, '0022', 'Support wall for ramp by ADU', NULL, NULL, 890.00, 'sold', '2023-12-04', '2023-12-04 09:59:54'),
  (6624462, 30659893, '0003', 'Assembly for Pergola', 'Price for assembly of pergola at cost as a  courtesy on the project.', NULL, 480.00, 'pending', '2023-12-04', '2023-12-04 13:15:57'),
  (6631660, 31581766, '0002', 'Extra excavation, rebar, concrete for south side', 'Plan specs were 2 feet deep on the foundation footing and 16 inches wide
Plan specs were 4 inches deep and 1 foot wide for walkway bond beams.

Actual as built per requests were:

4 feet deep on the foundation footing and 20 inches wide 
4 feet deep on the walkway bond beams and 20 inches wide.

Trenching concrete and footings for two walkway bond beams sections are 45 and 20 linear feet. 
Trenching concrete and footings for the foundation sections are 23 and 22 linear feet.

Additional excavation and hauling of extra walkway material of 10 yards.             $2,125
Additional excavation and hauling of extra footing depth and width of 6 yards.     $1,775

Additional rebar for walkway trenches     $1,125
Additional rebar for footing trenches       $985

Additional concrete and pumping.  $5,875', NULL, 11885.00, 'pending', '2023-12-06', '2023-12-06 10:14:00'),
  (6631667, 31581766, '0003', 'Repair forms (plumbing)', NULL, NULL, 700.00, 'pending', '2023-12-06', '2023-12-06 10:14:52'),
  (6631699, 31581766, '0004', 'Clean up/grade after plumbing', NULL, NULL, 285.00, 'pending', '2023-12-06', '2023-12-06 10:19:23'),
  (6633659, 31382032, '0009', 'Wall Cap Repair', NULL, NULL, 150.00, 'pending', '2023-12-06', '2023-12-06 16:25:38'),
  (6633910, 31581766, '0005', 'Samples for top cast', NULL, NULL, 1800.00, 'pending', '2023-12-06', '2023-12-06 18:44:31'),
  (6635128, 31330972, '0005', 'Conctrete Pads/Steps (11,459) REMOVED', NULL, NULL, -11459.00, 'pending', '2023-12-07', '2023-12-07 08:26:49'),
  (6635701, 31545886, '0004', 'Additional work ; Misc items', '36 lf of additional standard sdr 35 drains at 25 a lf $900
additional gas line run of 10'' with ground connection $385 point for bbq
The new conduit runs at $20 lf (37 lf for adu, 30 lf for internet)+$200
30 lf for old ridge conduit replacement + wall core) $940

additional spa light replacement $850



Drain inlet upgrade to pour lids 
two skimmers pour lids +170
+10 pour lid drains for pavers at $85 each $850

total cost for additional changes $4,265', NULL, 4265.00, 'pending', '2023-12-07', '2023-12-07 09:52:15'),
  (6637393, 31849639, '0002', 'Add''l turf strips, plants, bender board, mulch', '1 yard mulch (we will not add mulch between blue chalksticks, just behind the plants, those plants will need room to grow as they are a groundcover and are meant to grow together)
Additional plants for beds closer to b/yard
Bender board for new turf strips 
Installation of additional turf strips (using left over material on site. Please note if additional turf is needed we will add the difference for time/material as a separate c/order)', NULL, 2900.00, 'sold', '2023-12-07', '2023-12-07 14:12:23'),
  (6638902, 31849639, '0003', 'Credit for 10 unused 2x2 steppers', NULL, NULL, -270.00, 'pending', '2023-12-08', '2023-12-08 07:56:33'),
  (6640977, 31330972, '0006', 'Additional paver sqft', 'The contract had 446 sqft the real area after the concrete was poured and extended the area between the buildings was 727 
At 18 dollars a square foot for the additional area the total is $5058', NULL, 5058.00, 'pending', '2023-12-08', '2023-12-08 15:06:14'),
  (6641208, 28581838, '0022', '6 additional light', NULL, NULL, 1440.00, 'sold', '2023-12-09', '2023-12-09 08:10:30'),
  (6643469, 31511092, '0005', 'CC invoice 8', 'Invoice 8 - 299.46', NULL, 299.46, 'pending', '2023-12-11', '2023-12-11 09:34:15'),
  (6645662, 31382108, '0001', 'Add''l linear feet for Steps + Material Upgrade', '+ 8 Linear feet of steps
upgrade to Belgard Dimension', NULL, 400.00, 'sold', '2023-12-11', '2023-12-11 15:33:25'),
  (6645683, 31382108, '0002', 'Additional Drainage + inlets', '+ 60 linear feet + 13 additonal inlets', NULL, 2200.00, 'sold', '2023-12-11', '2023-12-11 15:41:03'),
  (6645689, 31382108, '0004', 'Additional Demo', '+Removing concrete slab (main patio area)
+Removing remaining footings from deck/patio cover
Hauling and disposing of materials', NULL, 2000.00, 'sold', '2023-12-11', '2023-12-11 15:43:06'),
  (6645923, 28581838, '0023', 'Additional plant material', '(3) 5g Little Ollie @ $129.00(for the raised planter above bbq area)
(14) 1g Yellow Yarrow @ $308.00 (for corner of beds flanking upper tier patio)
(10) 1g Blue Fescue @ $220.00 (to fill in near Strawberry and for corner beds flanking upper tier patio)
(1) 5g Salvia Leucantha @ $43.00 (for space where kangaroo paws were located)', NULL, 700.00, 'pending', '2023-12-11', '2023-12-11 17:51:38'),
  (6650234, 32047640, '0002', 'Sod install (w/additional demo)', NULL, NULL, 2600.00, 'pending', '2023-12-12', '2023-12-12 17:42:59'),
  (6652976, 31925620, '0001', 'additional forms', 'additional forming for segmented concrete', NULL, 950.00, 'pending', '2023-12-13', '2023-12-13 11:57:08'),
  (6656166, 17944004, '0014', 'Credit', NULL, NULL, -225.00, 'pending', '2023-12-14', '2023-12-14 09:41:02'),
  (6656400, 32199250, '0001', 'Credit no concrete in back sideyard', NULL, NULL, -2100.00, 'pending', '2023-12-14', '2023-12-14 10:19:11'),
  (6656409, 32199250, '0002', '5 LF 3” Grey channel strip drain pvc', NULL, NULL, 425.00, 'sold', '2023-12-14', '2023-12-14 10:19:45'),
  (6656424, 32199250, '0003', 'Adding 105 SF grey gravel at 3”', 'Adding to Sideyard with DOUBLE weed barrier
Grey construction gravel', NULL, 420.00, 'pending', '2023-12-14', '2023-12-14 10:21:20'),
  (6656431, 32199250, '0004', '2 (12”) catch basin on sideyard', NULL, NULL, 480.00, 'pending', '2023-12-14', '2023-12-14 10:21:42'),
  (6656433, 32199250, '0005', '44 LF 3” pvc drain pipe', NULL, NULL, 1000.00, 'pending', '2023-12-14', '2023-12-14 10:22:05'),
  (6656436, 32199250, '0006', '4 drain atriums', NULL, NULL, 300.00, 'pending', '2023-12-14', '2023-12-14 10:22:21'),
  (6656440, 32199250, '0007', '1 downspout connector', NULL, NULL, 75.00, 'pending', '2023-12-14', '2023-12-14 10:22:36'),
  (6656516, 32199250, '0008', '5 LF bender board', NULL, NULL, 0, 'pending', '2023-12-14', '2023-12-14 10:37:21'),
  (6656761, 32199250, '0009', 'Extended tile', 'Bring out tile to one more pad to eliminate pitch backwards 

31 SF concrete removal $155
31 SF new 3” pour grey concrete $500
31 SF tile overlay $680

*not included tile to purchase!', NULL, 1335.00, 'pending', '2023-12-14', '2023-12-14 11:13:23'),
  (6658461, 31511092, '0006', 'Added paver material', NULL, NULL, 680.00, 'pending', '2023-12-14', '2023-12-14 17:35:43'),
  (6658469, 31545886, '0005', 'Paver Upgrade and additional 190 sqft', '790 sqft of pavers at $31.50
minus 9150 in contract
total : 15735', NULL, 15735.00, 'pending', '2023-12-14', '2023-12-14 17:42:17'),
  (6658490, 31696923, '0010', 'DG FOR HVAC AREA', 'DG FOR APPROX 320SQFT
1" MINUS DEL RIO GRAVEL BORDER FOR (2) FENCE SIDE AREAS, BORDER TO BE 18" DEPTH
BENDER BOARD FOR 2 SIDES, APPROX 46 LINEAR FEET
PLANTS FOR GRAVEL BORDER ($350 ALLOWANCE)', NULL, 2300.00, 'pending', '2023-12-14', '2023-12-14 17:58:34'),
  (6659586, 32199250, '0010', '41 LF pipe and board wall', 'Retain 12” of soil on neighbors side with:

(41) LF of 2x12x16’ pressure treated lumber 
(20) stakes 
(1) day labor 2 guys
Includes demo', NULL, 2300.00, 'sold', '2023-12-15', '2023-12-15 08:27:18'),
  (6660066, 30503593, '0001', 'ADD 2" BACKFLOW, MASTER VALVE FLOW SENSOR', NULL, NULL, 7537.15, 'pending', '2023-12-15', '2023-12-15 09:57:40'),
  (6661226, 31511092, '0007', 'CC invoice 9', NULL, NULL, 305.25, 'pending', '2023-12-15', '2023-12-15 14:08:02'),
  (6662972, 28088643, '0004', 'Additional Valve and irrigation for Front', NULL, NULL, 1100.00, 'pending', '2023-12-18', '2023-12-18 07:00:17'),
  (6663128, 31696923, '0011', 'Turf for HVAC Area (side yard)', 'Approx 320sqft- if additional demo is needed a separate change order will be added', NULL, 4200.00, 'sold', '2023-12-18', '2023-12-18 07:31:10'),
  (6665372, 31696923, '0012', '50/50 compost soil blend backfill', '10 yards for the front yard
3 yards for all of the planter beds 
Soil had to be brought in to fill in all planter beds', NULL, 1500.00, 'sold', '2023-12-18', '2023-12-18 13:06:42'),
  (6665968, 32199250, '0011', 'Move back flow', NULL, NULL, 300.00, 'sold', '2023-12-18', '2023-12-18 14:45:57'),
  (6667385, 31382108, '0005', 'Materials Upgrade Charge (Belgard Slabs)', 'Upgraded paver cost (from original bid) for pavers and steppers for side yard to 2x2 + 2x1 Belgard Slab pavers', NULL, 2100.00, 'sold', '2023-12-19', '2023-12-19 07:45:09'),
  (6667388, 31382108, '0006', 'Additional Irrigation Drip Zone', NULL, NULL, 1050.00, 'sold', '2023-12-19', '2023-12-19 07:45:51'),
  (6673960, 28581838, '0024', '(2) additional step lights', NULL, NULL, 480.00, 'pending', '2023-12-20', '2023-12-20 14:53:03'),
  (6675485, 31696923, '0013', 'Additional plant material for front and backyard', 'Discussed with Carmen last week prior to placing order', NULL, 2500.00, 'sold', '2023-12-21', '2023-12-21 08:08:34'),
  (6676074, 32053237, '0001', 'Stump grinding remaining tree roots', NULL, NULL, 350.00, 'sold', '2023-12-21', '2023-12-21 09:42:09'),
  (6679845, 31511092, '0008', 'Double siding on the fence', 'Double siding 86 linear feet of fencing', NULL, 2523.00, 'pending', '2023-12-22', '2023-12-22 11:41:42'),
  (6681759, 31930909, '0001', 'Remove (1) Crape Myrtle Tree', NULL, NULL, 450.00, 'sold', '2023-12-26', '2023-12-26 14:02:59'),
  (6681853, 32404546, '0001', '(3) 5gallon Nandina plants', NULL, NULL, 135.00, 'sold', '2023-12-26', '2023-12-26 15:17:23'),
  (6681891, 32053237, '0002', 'Remove 2 posts and fence', NULL, NULL, 250.00, 'pending', '2023-12-26', '2023-12-26 16:08:28'),
  (6681920, 32053237, '0003', 'ADDENDUM ADDITION ERR CREDITED as less DG/stepper', NULL, NULL, -700.00, 'sold', '2023-12-26', '2023-12-26 17:03:05'),
  (6684058, 31696923, '0014', 'Haul out of leftover lumber/concrete', 'Leftover lumber from deck install (left behind by fence company)
concrete pieces', NULL, 500.00, 'pending', '2023-12-27', '2023-12-27 20:32:43'),
  (6684060, 31696923, '0016', 'Bender board dividing neighbor property', '33 linear feet of black steel edging', NULL, 400.00, 'sold', '2023-12-27', '2023-12-27 20:33:14'),
  (6685953, 32372609, '0001', 'Cleanup for Cottage Garden', '1/2 day', NULL, 600.00, 'pending', '2023-12-28', '2023-12-28 13:39:42'),
  (6685957, 32372609, '0002', 'Add’l demo/gravel side of the property', '80sqft of concrete removed plus install of crushed gravel', NULL, 500.00, 'pending', '2023-12-28', '2023-12-28 13:42:24'),
  (6685958, 32372609, '0003', 'Sanded stucco for privacy wall', NULL, NULL, 2800.00, 'pending', '2023-12-28', '2023-12-28 13:42:43'),
  (6686311, 32047640, '0003', 'Pony walls', '2 walls, each 5 1/2 long by 18" tall installed and veneering with wall stone', NULL, 2000.00, 'pending', '2023-12-28', '2023-12-28 23:49:52'),
  (6687411, 30797398, '0001', 'Concrete saw + 4” asphalt demo', NULL, NULL, 4300.00, 'pending', '2023-12-29', '2023-12-29 11:02:46'),
  (6687426, 31511092, '0009', 'CC invoice 11', NULL, NULL, 226.25, 'pending', '2023-12-29', '2023-12-29 11:09:04'),
  (6687427, 31511092, '0010', 'CC invoice 10', NULL, NULL, 151.59, 'pending', '2023-12-29', '2023-12-29 11:09:48'),
  (6687774, 31696923, '0017', 'Bender board to hold soil in backyard planter area', '60 linear feet of bender board to lock soil in from spilling out under fence', NULL, 420.00, 'sold', '2023-12-29', '2023-12-29 13:16:49'),
  (6687780, 31696923, '0018', '(1) GFI for transformer and irrigation timer', NULL, NULL, 350.00, 'sold', '2023-12-29', '2023-12-29 13:18:27'),
  (6687925, 31556682, '0001', 'Re-Design', NULL, NULL, 500.00, 'sold', '2023-12-29', '2023-12-29 14:31:28'),
  (6688368, 32372609, '0004', 'Additional labor for wall repair', NULL, NULL, 600.00, 'sold', '2023-12-31', '2023-12-31 09:15:19'),
  (6690951, 31930909, '0002', 'Additional Demo to adjust grade to one level', '1 extra low boy + 1 additional day of demo', NULL, 2800.00, 'sold', '2024-01-02', '2024-01-02 13:08:08'),
  (6691562, 26949840, '0023', 'Step Lights x 30', NULL, NULL, 7200.00, 'sold', '2024-01-02', '2024-01-02 15:31:18'),
  (6694251, 31545886, '0006', 'Chip out pool bond beam', NULL, NULL, 1600.00, 'sold', '2024-01-03', '2024-01-03 11:57:58'),
  (6696408, 31930909, '0003', 'Additional pavers about 60 Sq. Feet', NULL, NULL, 0, 'pending', '2024-01-04', '2024-01-04 07:55:23'),
  (6696605, 32047640, '0004', 'Bellecrete Wall Cap 8”', 'Color is Midnight and style is Modern', NULL, 1850.00, 'pending', '2024-01-04', '2024-01-04 08:24:58'),
  (6698317, 30524037, '0001', 'Additional excavation of River Bed', 'Jorge communicated that there was additional time and labor in excavating the river bed due to the supervision on the arborist $550.00. change order', NULL, 550.00, 'pending', '2024-01-04', '2024-01-04 12:59:16'),
  (6698524, 32404546, '0002', 'CREDIT - (1) up light', NULL, NULL, -240.00, 'sold', '2024-01-04', '2024-01-04 13:34:04'),
  (6699142, 31511092, '0011', 'CC invoice 12', NULL, NULL, 341.41, 'pending', '2024-01-04', '2024-01-04 16:20:58'),
  (6699980, 31849436, '0001', 'Sand finish topcast for concrete', NULL, NULL, 250.00, 'sold', '2024-01-05', '2024-01-05 08:01:16'),
  (6701766, 32404546, '0003', 'Difference of roses vs sedum', 'You cannot get the seat on Autumnjoy, so we opted for 5 gallon carpet roses in red.

This is the cost difference .', NULL, 117.50, 'sold', '2024-01-05', '2024-01-05 13:11:53'),
  (6702322, 31511092, '0012', 'Mulch and weed barrier upgrade', 'Mulch and weed barrier upgrade and additional mulch 800 sq ft', NULL, 1750.00, 'pending', '2024-01-05', '2024-01-05 17:08:18'),
  (6702323, 31511092, '0013', 'additional panel change and 10 ft fence boards', '10 ft fence boards and swap out of fence boards above retaining wall.', NULL, 1586.00, 'pending', '2024-01-05', '2024-01-05 17:09:49'),
  (6705204, 32404546, '0004', 'Total benderboard + 17LF', 'We had 50 lineal feet of Bender board in the contract and we need 67 lineal feet for a difference of 17 lineal feet x $12 = $204', NULL, 204.00, 'sold', '2024-01-08', '2024-01-08 11:28:28'),
  (6705876, 32404546, '0005', 'Porta potty reimbursement', 'Typical rental is $100 for 1-30 days.
Porta potty never came, hence this reimbursement.', NULL, -100.00, 'sold', '2024-01-08', '2024-01-08 13:11:49'),
  (6710032, 32244517, '0001', 'DESIGN Credit', NULL, NULL, -375.00, 'pending', '2024-01-09', '2024-01-09 13:19:47'),
  (6710802, 32244517, '0002', 'Pipe repair', NULL, NULL, 120.00, 'pending', '2024-01-09', '2024-01-09 16:45:01'),
  (6718588, 26949840, '0025', 'Demo for ADU', 'Demo sides and back of ADU in prep for pavers for 1560sqft', 'Hi Morse, I thought I sent you this change order last month when I sent the change order for the additional pavers for the ADU area, and realized today it was never released.  I apologize for that.', 5700.00, 'sold', '2024-01-11', '2024-01-11 16:00:34'),
  (6718661, 28581838, '0025', '3 additional path lights', NULL, NULL, 660.00, 'pending', '2024-01-11', '2024-01-11 16:23:18'),
  (6719777, 31330972, '0007', 'Groutlifting Blocks', 'Groutlifting with rebar 5 blocks adding cap to match wall.', NULL, 100.00, 'pending', '2024-01-12', '2024-01-12 08:22:17'),
  (6726142, 32223073, '0001', 'Credit for 106 linear feet of benderboard', 'Credit for 106 linear feet of bender board  that was removed from the contract.', NULL, -742.00, 'sold', '2024-01-15', '2024-01-15 16:23:20'),
  (6726178, 32223073, '0002', 'Additional Demo for Gravel that was below soil.', 'This is the additional charge for the labor of removing the additional   gravel that was below the soil.', NULL, 450.00, 'sold', '2024-01-15', '2024-01-15 16:38:56'),
  (6726260, 28581838, '0026', 'Upgrade for Yosemite Gravel', '(gravel was estimated in for Del Rio and Crushed Gravel)', NULL, 500.00, 'pending', '2024-01-15', '2024-01-15 17:53:08'),
  (6728838, 32223073, '0003', 'Drainage', 'Drainage for walkway 
50 linear feet $23 linear foot
5 inlets $75 each', NULL, 1525.00, 'sold', '2024-01-16', '2024-01-16 11:57:00'),
  (6729297, 31930909, '0004', 'Credit for (1) step (pavers)', 'Transition from pathway in front of ADU stepping up to patio by kitchen', NULL, -495.00, 'sold', '2024-01-16', '2024-01-16 13:01:00'),
  (6729307, 31930909, '0005', 'Bullnose steps for (2) slider doors', '12.6 Linear Feet Bullnose Steps', NULL, 890.00, 'sold', '2024-01-16', '2024-01-16 13:02:48'),
  (6730042, 32223073, '0004', 'Additional Sod Square footage', 'The sod area that we marked out is wider than the contract. If we want to go with that footprint, the additional sqtf is 290 at 3.90 per sqft', NULL, 1131.00, 'sold', '2024-01-16', '2024-01-16 15:45:01'),
  (6730048, 32223073, '0005', 'Gopher Mesh', 'This is the price to put gopher mush underneath the sod area to protect from gophers.

1910 sqft assuming additional sod is added. If not, it will be changed.
The price is at $2.10 per sqft', NULL, 4011.00, 'pending', '2024-01-16', '2024-01-16 15:47:28'),
  (6731447, 31696923, '0019', 'Gate/fence repair', NULL, NULL, -340.00, 'pending', '2024-01-17', '2024-01-17 08:26:37'),
  (6731636, 30524037, '0002', 'Grid Driveway credit', '1.  Eliminating the 3" of road base
2.  Keeping grids
3. increasing DG with stabilizer to 4"
Same 2,028 SF
2,028 X $1.80= credit of $3,650.40', NULL, -3650.14, 'pending', '2024-01-17', '2024-01-17 08:49:24'),
  (6731647, 30524037, '0003', 'Bender board 2" think 200 Linear Feet', 'Adding 2" bender Board', NULL, 1650.00, 'pending', '2024-01-17', '2024-01-17 08:51:35'),
  (6732023, 31382108, '0007', 'Upgraded cost for Olive Tree', NULL, NULL, 550.00, 'sold', '2024-01-17', '2024-01-17 09:48:16'),
  (6733775, 32422492, '0001', 'Sump pump c/o', 'Electrical, sump pump, basin.', NULL, 2200.00, 'pending', '2024-01-17', '2024-01-17 14:34:58'),
  (6733986, 31849436, '0002', '2 add''l plants', '(1) 1 gallon Dianella ''Lil Rev''
(1) 5 gallon Jerusalem Sage', NULL, 65.00, 'sold', '2024-01-17', '2024-01-17 15:29:40'),
  (6737995, 32390216, '0001', 'jute netting', 'additional jute netting+pick up time', NULL, 225.00, 'pending', '2024-01-18', '2024-01-18 16:26:31'),
  (6743871, 32971056, '0001', 'Credit for City Permit Fees', 'The city waived the permit fee.  So crediting the client the fees.', NULL, -780.00, 'sold', '2024-01-22', '2024-01-22 09:44:49'),
  (6749875, 5884691, '0002', 'Remove 24 sf of pavers. Removal only', 'Removal only, will need another change order to reinstall', NULL, 144.00, 'pending', '2024-01-23', '2024-01-23 14:43:43'),
  (6750213, 30797398, '0002', 'misc items', 'light well demo
light well repair
concrete epoxy and shotcretewall repair. 
 

	
		
		
		
	
	
		
			
			Item Description Qty 
			
			
			Unit 
			
			
			Total Cost
			
		
		
			
			Demo light wells 
			
			
			ls 
			
			
			$2,500
			
		
		
			
			Concrete small holes 1x2 with dowels 
			
			
			ls 
			
			
			$7,800
			
		
		
			
			Light wells concrete top 1ft (9) 9 
			
			
			ls 
			
			
			$8,300', NULL, 18600.00, 'pending', '2024-01-23', '2024-01-23 16:19:02'),
  (6751238, 18160323, '0008', 'Replacing 240sqft No Mow Fescue', NULL, NULL, 1750.00, 'pending', '2024-01-24', '2024-01-24 07:12:54'),
  (6751388, 32591483, '0001', 'Additional zone of irrigation', '(1) drip zone for driveway planters', NULL, 1050.00, 'sold', '2024-01-24', '2024-01-24 07:38:14'),
  (6751394, 32591483, '0002', 'Cleaning up Plumbago Shrubs', 'Topping of Plumbago adjacent to pool', NULL, 600.00, 'pending', '2024-01-24', '2024-01-24 07:40:02'),
  (6752248, 30524037, '0004', 'Credit of river bed fabric', 'Did not use fabric in river bed', NULL, -450.00, 'pending', '2024-01-24', '2024-01-24 09:46:45'),
  (6752253, 30524037, '0005', 'Credit for 1 lowboy', 'Did not need extra hauling', NULL, -1900.00, 'pending', '2024-01-24', '2024-01-24 09:47:36'),
  (6753009, 30524037, '0006', 'Additional Bender Board 2" 120 LF', '2" Bender Board for 120 Linear Feet', NULL, 900.00, 'pending', '2024-01-24', '2024-01-24 11:38:37'),
  (6753055, 30524037, '0007', 'Additional Del Riio -1"', '2-2.5 scoops of Del Rio <1"', NULL, 960.00, 'pending', '2024-01-24', '2024-01-24 11:44:47'),
  (6753136, 30524037, '0008', 'Planting', 'Additional plants9 -5gal agave blow glows1 -5 gal lions tail1- 5 gal nandina Gulfstream1- 5 gal pitt silver sheen2- 15 gal Toyons1- 24" box palo verde multi (desert museum)2- 15 gal Rhus ovata12 @ 5 gal × $43.50= $522.004 @ 15 gal x $150.00= $600.001 24" box x $380.00Total: $1,502.00', NULL, 1502.00, 'pending', '2024-01-24', '2024-01-24 11:59:32'),
  (6753782, 32979016, '0001', 'Pipe and board for 24 LF', 'Install pipe and board (2) 12x wooden boards with metal stakes along fence of neighbor. stakes will be on inside of board, boards will sit in between columns.

Soil needs to be cut, grade needs to be taken out. Some soil will need to be removed or graded into front yard.', NULL, 1450.00, 'sold', '2024-01-24', '2024-01-24 13:36:32'),
  (6753894, 32979016, '0002', '100 Sf of Brown Shredded Mulch with demo', '100 SF of Brown Shredded Mulch. (NO weed barrier because roots of trees are too large to cut around and staple)
Includes demo of 3" below soil and removing shallow roots of the hedge that are in the way.', NULL, 400.00, 'sold', '2024-01-24', '2024-01-24 13:53:10'),
  (6753906, 32979016, '0003', '41 LF of 3/4" brown plastic benderboard', 'along sidewalk on hedge side to prevent mulch from spilling onto sidewalk.', NULL, 287.00, 'sold', '2024-01-24', '2024-01-24 13:54:28'),
  (6754012, 32979016, '0004', 'Hand Water Liability Waiver', 'Please sign to confirm that we are not responsible for plants that do not have irrigation.
These plants will be hand watered by client so as to VOID our plant warranty.', NULL, 0, 'sold', '2024-01-24', '2024-01-24 14:15:04'),
  (6757351, 31696923, '0020', 'Mailbox Pilaster', NULL, NULL, -800.00, 'pending', '2024-01-25', '2024-01-25 12:07:04'),
  (6758000, 29388894, '0008', 'CO SHEET', NULL, NULL, 84807.00, 'pending', '2024-01-25', '2024-01-25 13:35:14'),
  (6758664, 32591483, '0003', 'Additional Demo', 'Remove existing Fig Trees (x2) 
Remove existing Ash Trees (x2)
Grind stumps and haul debris
Additional demo for rain garden (digging down additional 4-8" for 120sqft)', NULL, 2000.00, 'sold', '2024-01-25', '2024-01-25 16:31:48'),
  (6767120, 32979016, '0005', '30 additional LF of Brown plastic bender board.', NULL, NULL, 200.00, 'sold', '2024-01-29', '2024-01-29 17:31:52'),
  (6771214, 32591483, '0004', 'Additional concrete', 'Concrete is 350sqft vs 300sqft', NULL, 750.00, 'pending', '2024-01-30', '2024-01-30 16:38:57'),
  (6777565, 8668349, '0009', 'Paver Additional Patio extension', NULL, NULL, 4041.00, 'pending', '2024-02-01', '2024-02-01 09:38:51'),
  (6779026, 29397873, '0006', 'Adding a Gas Pressure Regulator for Pizza Oven', 'Adding a gas pressure regulator to the line going to the Pizza oven per manufacturer''s recommendation.', NULL, 250.00, 'sold', '2024-02-01', '2024-02-01 13:13:29'),
  (6779666, 26949840, '0026', 'REMOVED LINE ITEM 6 CONCRETE', NULL, NULL, -4600.00, 'pending', '2024-02-01', '2024-02-01 15:15:38'),
  (6782683, 32979016, '0006', '(6) 5 gallon Butterfly agave (cactus)', '(6) 5 gallon Butterfly agave

Client will place plants with Sal.', NULL, 390.00, 'sold', '2024-02-02', '2024-02-02 12:59:59'),
  (6796843, 32309360, '0001', 'Off Hours Inspector', NULL, NULL, 424.56, 'pending', '2024-02-07', '2024-02-07 16:57:15'),
  (6799128, 32662685, '0001', 'Additional pavers', 'Adding pavers on the side of patio then taking out pavers under the AC. 
52.5 more sq ft x $17.50= $918.75', NULL, 918.75, 'sold', '2024-02-08', '2024-02-08 10:41:57'),
  (6799142, 32662685, '0002', 'Additional step build in bullnose', 'Additional 24.5 linear feet, 10 in contract already installing total iof 34.5 lf
24.5 X $60.00= $1,470.00', NULL, 1470.00, 'sold', '2024-02-08', '2024-02-08 10:44:49'),
  (6799154, 32662685, '0003', 'Polymeric Sand', '564.5 SF X $1.00= $564.50', NULL, 564.50, 'sold', '2024-02-08', '2024-02-08 10:46:18'),
  (6799159, 32662685, '0004', '4 Step lights', 'Adding 4 step light around pavers steps
4 X $240.00', NULL, 960.00, 'sold', '2024-02-08', '2024-02-08 10:47:39'),
  (6799182, 32662685, '0005', 'Changing all planters to gravel,', 'The gravel area is now 340 sq ft total
285 in contract X $6.50Extra 55 X $6.50= $362.75Taking out mulch - $618.75CREDIT OF $256.00', NULL, -256.00, 'pending', '2024-02-08', '2024-02-08 10:52:57'),
  (6799953, 32591483, '0005', 'Small Bark Nugget Mulch', 'Mulching all planter beds that are newly planted for backyard - approx 13 yards at 3”', NULL, 3000.00, 'sold', '2024-02-08', '2024-02-08 12:49:48'),
  (6801040, 26949840, '0027', 'Sump Pump', NULL, NULL, 6000.00, 'sold', '2024-02-08', '2024-02-08 17:01:18'),
  (6804264, 31248085, '0013', 'Wall, Step Lights, Cantilever', 'Install 52 linear feet of stack stone wall at 42 inches high.  Other wall chargee at $80 per foot at average of 20" high. This wall will be $160 per foot as it is double size.  $6,720

Install 28 step lights $5,340

Cantilever 189 linear feet of steps and sides of steps.  Total linear footage of cantilever is 232 linear feet.  $4,900', NULL, 16960.00, 'sold', '2024-02-09', '2024-02-09 15:39:09'),
  (6804378, 26949840, '0028', 'Soldier Course to hold grade along driveway entry', 'To prevent the dirt from neighboring driveway from eroding into driveway area 
27 linear feet of soldier course', NULL, 600.00, 'sold', '2024-02-09', '2024-02-09 17:09:37'),
  (6804379, 26949840, '0029', 'ADU DRAINAGE', '252 LINEAR FEET OF DRAINAGE PIPE AROUND ENTIRE ADU', NULL, 5800.00, 'sold', '2024-02-09', '2024-02-09 17:10:28'),
  (6811352, 26949840, '0031', 'Lighting for Backyard', 'Backyard lights only 34 flood lights/well lights +  37 path lights', NULL, 17020.00, 'sold', '2024-02-13', '2024-02-13 10:13:35'),
  (6812962, 32591483, '0006', 'ADDITIONAL PLANT MATERIAL', '5G TOYON X 4 
5G LEMONADE BERRY X2
1G VERBENA LOLLIPOP X2
1G CAREX X3
1G JUNCUS X3
1G MONARDELLA X6
1G SNOWBERRY X3
1G RED BUCKWHEAT X1', NULL, 790.00, 'pending', '2024-02-13', '2024-02-13 14:05:27'),
  (6816199, 26949840, '0032', 'Paver soldier course S/E side of prop', '138 linear feet of soldier course front corner for planter along 
S/E side of property', NULL, 3174.00, 'sold', '2024-02-14', '2024-02-14 11:19:54'),
  (6816763, 32662685, '0006', 'Mex Black pebble 1/2-1" upgrade', NULL, NULL, 2380.00, 'pending', '2024-02-14', '2024-02-14 12:43:25'),
  (6816808, 32662685, '0007', '3more lights, 2 up 1 path, same models', NULL, NULL, 675.00, 'pending', '2024-02-14', '2024-02-14 12:49:06'),
  (6817519, 26949840, '0033', 'Rebuild small wall by gate entry plus stucco', '15'' x 16" (no footing) and stucco for both sides of wall, haul away old concrete', NULL, 1270.00, 'sold', '2024-02-14', '2024-02-14 14:55:52'),
  (6817531, 26949840, '0034', 'Stucco 7 pilasters front entry walkway area', 'total of 262sqft for (7) pilasters front entry near street', NULL, 2500.00, 'sold', '2024-02-14', '2024-02-14 14:59:22'),
  (6817556, 26949840, '0035', 'Bellecrete Caps for Seated Wall Sunken Firepit', '27 linear feet', NULL, 850.00, 'sold', '2024-02-14', '2024-02-14 15:11:30'),
  (6817560, 26949840, '0036', 'Credit for poured concrete cap for wall/sunken pit', NULL, NULL, -370.00, 'sold', '2024-02-14', '2024-02-14 15:12:42'),
  (6817567, 26949840, '0037', 'Bellecrete caps for front entry walls', '15 linear feet of wall cap (10") x 2 (for rebuild wall and existing wall) for the front entry near street', NULL, 1006.00, 'sold', '2024-02-14', '2024-02-14 15:16:38'),
  (6817721, 26949840, '0038', 'Bellecrete caps for Front Entry Pilasters', '7 pilasters (includes mailbox pilaster) for front entry area near street', NULL, 3200.00, 'sold', '2024-02-14', '2024-02-14 16:21:19'),
  (6817802, 32979016, '0007', 'Add (1) valve for additional spray zone', NULL, NULL, 1100.00, 'sold', '2024-02-14', '2024-02-14 17:17:31'),
  (6826253, 26949840, '0039', 'CREDIT FOR PLANT MATERIAL (FROM OG ESTIMATE)', 'TOTAL OF $43,935.00 ON ORIGINAL ESTIMATE/ADDENDUM 
$31,350 OF THIS TOTAL AMOUNT WAS APPLIED TO PURCHASE AND PLANT (209) 15 GALLON PODOCARPUS', NULL, -12585.00, 'sold', '2024-02-16', '2024-02-16 11:29:12'),
  (6826278, 26949840, '0040', 'PALM TREES', '(3) 8'' BARE ROOT DACTALIFERA PALM TREES @$4200 EA
(7) 42" BOXED BISMARCK PALM TREES @ $3900 EA (INCLUDES 2 TREES FOR FRONT GATE PLANTERS)', NULL, 39900.00, 'sold', '2024-02-16', '2024-02-16 11:33:46'),
  (6826323, 32591483, '0007', 'CREDIT FOR DEMO', 'Applying credit towards $9000 estimated demo', NULL, -1200.00, 'sold', '2024-02-16', '2024-02-16 11:41:29'),
  (6826496, 32662685, '0008', 'Materials Credit', NULL, NULL, -1000.00, 'pending', '2024-02-16', '2024-02-16 12:10:09'),
  (6827159, 32463832, '0001', 'Credit for Plants', NULL, NULL, -600.00, 'sold', '2024-02-16', '2024-02-16 14:44:32'),
  (6827166, 32463832, '0002', 'Stump removal', NULL, NULL, 300.00, 'sold', '2024-02-16', '2024-02-16 14:48:13'),
  (6827244, 26949840, '0041', 'FRONT/SIDE LIGHTING', 'Sides of property = (28) floodlights spaced 8'' apart
                               (16) eyeball lights for N/W side only space 8'' apart
                                (3) eyeballs for Cypress Trees by garage
Front Entry              (12) floods for trees
                                (6) eyeballs for pathway', NULL, 16300.00, 'sold', '2024-02-16', '2024-02-16 15:24:40'),
  (6829861, 32463832, '0003', 'Install 1 check valve for leaking sprinkler valve', NULL, NULL, 75.00, 'sold', '2024-02-19', '2024-02-19 09:52:35'),
  (6837678, 32647651, '0001', '12 Linear Feet of Concrete steps/pool entry', '3 steps @12 lf 
Plus 1 landing 
Topcast finish', NULL, 1100.00, 'sold', '2024-02-21', '2024-02-21 08:01:18'),
  (6838300, 32647651, '0002', 'New concrete landing', 'Between deck steps and new steps 
18sqft', NULL, 500.00, 'sold', '2024-02-21', '2024-02-21 09:33:21'),
  (6839759, 26949840, '0042', 'Stucco for existing garden wall front entry', NULL, NULL, 800.00, 'sold', '2024-02-21', '2024-02-21 12:55:21'),
  (6839774, 26949840, '0043', 'Removing pavers to create larger planters', 'Removing pavers along step by ADU to create larger planter 
Removing pavers along step by entry to backyard to create larger planter
Finishing border along pavers', NULL, 1500.00, 'sold', '2024-02-21', '2024-02-21 12:56:58'),
  (6844096, 32053237, '0004', 'Additional drainage', NULL, NULL, 850.00, 'sold', '2024-02-22', '2024-02-22 13:42:51'),
  (6844659, 26949840, '0044', '15 Podocarpus to fill in next to steps', 'Where pavers were removed to create additonal planter', NULL, 2400.00, 'sold', '2024-02-22', '2024-02-22 15:44:03'),
  (6854367, 32647651, '0003', 'Additional demo', 'Demo took a lot longer than expected - guys discovered another wall behind Boulder wall that they needed to remove as well', NULL, 2100.00, 'pending', '2024-02-27', '2024-02-27 07:14:11'),
  (6854746, 33478759, '0001', 'Additional bender board edging', '60 LF', NULL, 420.00, 'sold', '2024-02-27', '2024-02-27 08:23:30'),
  (6855033, 32647651, '0004', 'Cantilevering Steps', NULL, NULL, 900.00, 'pending', '2024-02-27', '2024-02-27 09:03:49'),
  (6859043, 26949840, '0045', 'Additional Mexican Beach Pebble', 'Additional gravel for + approx 1000sqft', NULL, 10000.00, 'sold', '2024-02-28', '2024-02-28 08:29:24'),
  (6859235, 31248085, '0014', 'Planting', 'Install the following plants from design.', NULL, 38983.00, 'sold', '2024-02-28', '2024-02-28 09:00:56'),
  (6859294, 32647651, '0005', 'Additional Demo', NULL, NULL, 1400.00, 'sold', '2024-02-28', '2024-02-28 09:08:26'),
  (6859302, 31248085, '0015', 'Prep and Mulching', 'Pull weeds and/or cut and treat. 
Rough Grade all soils in roughly 14,000 square feet. 
Fine grade all soils
(Any soil removals if needed for grades would be additional)
Later after planting install the following Mulches in roughly 14,000 sq ft.', NULL, 31450.00, 'sold', '2024-02-28', '2024-02-28 09:10:35'),
  (6860702, 32463832, '0004', 'Credit for Check Valve', NULL, NULL, -75.00, 'sold', '2024-02-28', '2024-02-28 12:35:55'),
  (6860704, 32463832, '0005', 'Replace plastic valve', 'Valve connected to existing zone (not installed by PB)', NULL, 200.00, 'sold', '2024-02-28', '2024-02-28 12:36:35'),
  (6861189, 26949840, '0047', '2 Transformers for front/side lights', NULL, NULL, 900.00, 'sold', '2024-02-28', '2024-02-28 13:50:49'),
  (6865293, 29388894, '0009', 'Added CO''s from sheet', NULL, NULL, 8940.00, 'pending', '2024-02-29', '2024-02-29 14:22:37'),
  (6871995, 33431219, '0001', 'Waterproofing the retaining wall', '60sqft of thoroseal and roll on waterproof', NULL, 700.00, 'sold', '2024-03-04', '2024-03-04 10:01:55'),
  (6872011, 33431219, '0002', 'Adding on 6 blocks to wall', 'Creating a partial 3rd course for retaining wall', NULL, 50.00, 'sold', '2024-03-04', '2024-03-04 10:04:03'),
  (6873900, 26949840, '0048', 'Added Metalwork', 'adding posts and panels for pool equipment area
2 gates in pool equipment area
$14,010.00

one handrailing for wheelchair access
$6,720.00

Total $20,730.00', NULL, 20730.00, 'sold', '2024-03-04', '2024-03-04 14:23:50'),
  (6874620, 26949840, '0049', '2x2 steppers for Hammock Planter', '16 Bellecrete steppers to create pathway for hammock access', NULL, 1500.00, 'sold', '2024-03-04', '2024-03-04 18:22:00'),
  (6876921, 12174250, '0004', 'CC fees from original contract', NULL, NULL, 368.04, 'pending', '2024-03-05', '2024-03-05 10:46:31'),
  (6879232, 26949840, '0050', 'Electrical (internal brain to exterior)', 'INSTALLING CONDUIT FOR MAIN INTERNAL AUDIO/VIDEO SYSTEM', NULL, 6200.00, 'sold', '2024-03-05', '2024-03-05 17:29:32'),
  (6879237, 26949840, '0051', 'Gates and Gooseneck Conduit', 'INSTALL CONDUIT TO GOOSENECK (CALL BOX), INSTALL GATE SENSORS', NULL, 4100.00, 'sold', '2024-03-05', '2024-03-05 17:30:20'),
  (6887061, 31916414, '0001', 'Lighting', 'ADding 1 150 Transformer with installation $425.00
Adding 8 lights @ $225.00 each
This includes all wiring and installation of transformer and connection to house
$2,225.00 total', NULL, 2225.00, 'pending', '2024-03-07', '2024-03-07 17:43:18'),
  (6887131, 31916414, '0002', 'Demolition and prep for existing wall, then stucco', '1)  Sanding and preparation of  existing wall paint debris  $600.00
2)  1 coat of Polybond prep
3)  Color coat  
2 + days of labor with materials  $1,200.00', NULL, 1800.00, 'pending', '2024-03-07', '2024-03-07 19:03:23'),
  (6887136, 31916414, '0003', 'Drainage Additional', 'Cost of Labor and materials  with Profit  and Over head included
$900.00 Materials 
$750.00 labor
based on custom work directed by outside contrctor', NULL, 1650.00, 'pending', '2024-03-07', '2024-03-07 19:06:49'),
  (6887739, 31916414, '0004', 'Grass credit', 'Taking out grass', NULL, -318.75, 'pending', '2024-03-08', '2024-03-08 06:43:35'),
  (6888614, 31916414, '0005', 'Plant size reduction', 'Total savings from reducing the size would be $319.50. 3 plants at 15 gallon reduced to3 plants at 5 gallon

Would you like to reduce the size of the 3 plants for the $319.50 savings?

Thank you,

Verva

Yes', NULL, -319.50, 'pending', '2024-03-08', '2024-03-08 09:20:18'),
  (6888711, 33431219, '0003', 'Credit for Design', 'Crediting cost of design mock up back to project as per design agreement', NULL, -400.00, 'sold', '2024-03-08', '2024-03-08 09:35:56'),
  (6888958, 33161756, '0001', 'Add 15 SF 4” concrete sand finish', NULL, NULL, 217.00, 'sold', '2024-03-08', '2024-03-08 10:14:15'),
  (6888966, 33161756, '0002', 'Add 20 LF of wooden forming', NULL, NULL, 100.00, 'sold', '2024-03-08', '2024-03-08 10:14:47'),
  (6888991, 33161756, '0003', 'Add 95 SF St. Augustine sod in backyard', NULL, NULL, 451.00, 'sold', '2024-03-08', '2024-03-08 10:19:04'),
  (6888998, 33161756, '0004', 'Move 1 light to Liquid Ambar tree', NULL, NULL, 100.00, 'sold', '2024-03-08', '2024-03-08 10:20:03'),
  (6889069, 33161756, '0005', 'Demo 126 SF on side yard at 3”', 'Set gravel aside for mixing with extra gravel brook front path', NULL, 365.00, 'sold', '2024-03-08', '2024-03-08 10:31:50'),
  (6889086, 33161756, '0006', 'Reset 8 steppers on side yard', '2 hours to set', NULL, 150.00, 'sold', '2024-03-08', '2024-03-08 10:33:30'),
  (6889106, 33161756, '0007', 'Credit brass drain grate', 'NOT DOING DRAIN IN HARDSCAPE AREA', NULL, -225.00, 'sold', '2024-03-08', '2024-03-08 10:36:30'),
  (6889117, 33161756, '0008', 'Move drain 3.5 LF (no charge)', 'Moving drain to grass area from Hardscape area', NULL, 0, 'sold', '2024-03-08', '2024-03-08 10:37:38'),
  (6889180, 33161756, '0009', '(2) brass valves upgrade from plastic to match', NULL, NULL, 150.00, 'sold', '2024-03-08', '2024-03-08 10:47:21'),
  (6890972, 9912505, '0008', 'Phase 2: Add (2) lights', '(1) path light - 2.5W: https://lightcraftoutdoor.com/product/ap-128b-5/

(1) up light - 4.5W: https://lightcraftoutdoor.com/product/fl-286b/', 'Lights plus travel time.', 650.00, 'pending', '2024-03-09', '2024-03-09 15:19:15'),
  (6895863, 33431219, '0004', '22 linear feet of CMU Wall Cap', NULL, NULL, 165.00, 'sold', '2024-03-11', '2024-03-11 19:18:34'),
  (6897598, 33431219, '0005', '1 yard 50/50 backfill soil for stepper area', NULL, NULL, 130.00, 'sold', '2024-03-12', '2024-03-12 09:54:52'),
  (6899484, 31545886, '0007', 'Wood  for step treds', 'This is cost for the wood only
4x12 milled to 3 x11.5', NULL, 2691.75, 'sold', '2024-03-12', '2024-03-12 14:15:02'),
  (6900011, 33577562, '0001', 'CREDIT for main 120 LF', NULL, NULL, -2640.00, 'pending', '2024-03-12', '2024-03-12 16:31:12'),
  (6900286, 32309360, '0002', '69 Linear Feet of concrete V Swell', '69 linear feet X $55.00= $3,795.00', NULL, 3795.00, 'pending', '2024-03-12', '2024-03-12 19:04:21'),
  (6900290, 32309360, '0003', '9" Catch Basin', NULL, NULL, 198.00, 'pending', '2024-03-12', '2024-03-12 19:05:22'),
  (6900292, 32309360, '0004', 'Additional 3" wall core', NULL, NULL, 150.00, 'pending', '2024-03-12', '2024-03-12 19:06:04'),
  (6900297, 32309360, '0005', '30 Flats of ground cover with amendments', '30 flats of ground cover with amendments', NULL, 1680.00, 'pending', '2024-03-12', '2024-03-12 19:08:22'),
  (6900329, 33431219, '0006', 'Plant credit', NULL, NULL, -70.00, 'sold', '2024-03-12', '2024-03-12 19:39:23'),
  (6901095, 31333701, '0009', 'Hill side clean up/dump 2 men 1 day', NULL, NULL, 1575.00, 'pending', '2024-03-13', '2024-03-13 07:16:50'),
  (6904156, 30797398, '0003', 'SM Seismic Retrofit', NULL, NULL, 35500.00, 'pending', '2024-03-13', '2024-03-13 15:15:09'),
  (6904437, 26949840, '0052', 'SEALANT FOR PEBBLES', 'FOR 2700SQFT', NULL, 4500.00, 'sold', '2024-03-13', '2024-03-13 16:57:23'),
  (6906432, 33777247, '0001', 'May 3 Event', 'Plant List
(3) Lavandula angustifolia - 5 gal.

(1) Rosmarinus officinalis - 5 gal.

(2) Star Jasmine - 5 gal. (staked)

(1) Camellia japonica - 5 gal. (pink or white blossoms)



$335 - 2 hours powerwash all stones in the pool area and seed Marathon
$840 - (2) down lights with tree climbing and straps for lights 
$980 - (4) step lights and wire to extend (tucked under cantiliver step).
$375 - Approx. 50 SF DG  (3" in volume) and spray stabilizer on edges on side opposite of Deodar tree
$400 - Plants (see list below) plus adjusting irrigation to accommodate new plants', '1. leave the seed bag with client to continue to use
2. Move the uplights in the arbor forward in front of the plants to shine on Pride of Maderia and checking the irrigation.  (this is time and material - $85/hour plus wire if needed to extend - I will have to wait to see how long it takes and add change order).', 2930.00, 'pending', '2024-03-14', '2024-03-14 10:07:17'),
  (6908556, 33577562, '0002', 'CREDIT Lighting', 'Credit for removing lighting fixtures from contract', NULL, -3145.00, 'pending', '2024-03-14', '2024-03-14 17:40:49'),
  (6910412, 33161618, '0001', '(2) 15g Citrus', '(1) 15g Dwarf Meyer Lemon
(1) 15g Bearss Lime Standard', NULL, 630.00, 'pending', '2024-03-15', '2024-03-15 10:12:33'),
  (6910415, 33161618, '0002', 'Powerwash back and front concrete', '4 hours of powerwashing - no guaruntee of final look', NULL, 300.00, 'sold', '2024-03-15', '2024-03-15 10:13:18'),
  (6910420, 33161618, '0003', 'Soil for pots', 'Adding soil for (3) pots and 1 XL planter', NULL, 100.00, 'sold', '2024-03-15', '2024-03-15 10:14:03'),
  (6910429, 33161618, '0004', '(3) 5g Jasmine vine for XL planter', NULL, NULL, 135.00, 'sold', '2024-03-15', '2024-03-15 10:15:30'),
  (6910895, 31511092, '0014', 'Sealing 1570sqft at 1.20', NULL, NULL, 1884.00, 'pending', '2024-03-15', '2024-03-15 11:30:19'),
  (6912247, 32971056, '0002', 'Wall for retaining pavers', 'Install 18 inch wall on south side property.  Wall will be buried in soils to take out grade and stabilize the top includinig the paver. 
Wall will be capped with paver.   Wall to be roughly 70 linear feet.', NULL, 4870.00, 'sold', '2024-03-16', '2024-03-16 08:25:49'),
  (6912356, 32971056, '0003', 'Credit Remove sidewalk, curb and apron for now.', NULL, NULL, -13845.00, 'sold', '2024-03-16', '2024-03-16 11:55:41'),
  (6912836, 33161756, '0010', 'Replace 2 old valves w/ new Brass valve & actuator', NULL, NULL, 450.00, 'sold', '2024-03-17', '2024-03-17 18:27:31'),
  (6915545, 33161756, '0011', 'Move drain out of mulch into grass area', '3.6LF of 3" SDR pipe extend from mulch area to grass area with NEW drain grate.', NULL, 162.00, 'sold', '2024-03-18', '2024-03-18 11:43:49'),
  (6916100, 33161756, '0012', '(3) new drain grates', NULL, NULL, 200.00, 'sold', '2024-03-18', '2024-03-18 13:07:20'),
  (6916502, 33161618, '0005', 'Core through planter, add 2 LF 3" SDR', NULL, NULL, 248.00, 'sold', '2024-03-18', '2024-03-18 14:16:22'),
  (6918760, 31711365, '0001', 'CO - Requested Material (3" 45 Elbow (SxS)', '3" 45 Elbow (SxS) PVC Schedule 80

Product #: GFP-817030
Weight: 1.3
Description
3" 45 Elbow (SxS) PVC Schedule 80

40 units', NULL, 3092.81, 'pending', '2024-03-19', '2024-03-19 08:54:20'),
  (6918986, 31248085, '0016', 'Concrete swell', '57 LF. Concrete swell 
Form about 57LF for concrete swell 
Pour concrete trawl and finish', NULL, 3256.00, 'sold', '2024-03-19', '2024-03-19 09:28:23'),
  (6918999, 31248085, '0017', 'Additional grading', 'Cut and grade back hill side, remove and export about 120 yards of soil', NULL, 19674.00, 'sold', '2024-03-19', '2024-03-19 09:30:19'),
  (6919013, 31248085, '0018', 'Compact hillside 2 man days', NULL, NULL, 1500.00, 'sold', '2024-03-19', '2024-03-19 09:31:32'),
  (6919022, 31248085, '0019', 'Concrete pad for future shed 13x15', NULL, NULL, 5850.00, 'sold', '2024-03-19', '2024-03-19 09:32:36'),
  (6919318, 30365496, '0004', 'Replacing Drainage for Entire Property', '360 feet 4” ABS Drains with inlets Tie in downspouts', NULL, 9800.00, 'sold', '2024-03-19', '2024-03-19 10:13:41'),
  (6921323, 30365496, '0005', 'Additional gas line', '+ 55 linear feet from gas line to gas meter', NULL, 1815.00, 'sold', '2024-03-19', '2024-03-19 15:46:32'),
  (6921327, 30365496, '0006', 'Additional linear feet for outdoor kitchen', NULL, NULL, 3000.00, 'sold', '2024-03-19', '2024-03-19 15:49:04'),
  (6921343, 33478759, '0002', '+ 8 linear feet of garden wall', 'Estimate states 75 linear feet, wall is actually 83 linear feet', NULL, 800.00, 'pending', '2024-03-19', '2024-03-19 15:54:53'),
  (6921619, 26949840, '0053', 'Additional Mexican Beach Pebble', 'FRONT 2 PLANTERS', NULL, 3200.00, 'sold', '2024-03-19', '2024-03-19 17:56:55'),
  (6921858, 9912505, '0009', 'Phase 2: Demo, Planting, Gravel', 'Demo
1. Hand demo.
2. Demo 175 SF at 3” depth.
3. Keep roses and Dusty Miller (protect in beds during demo).
4. Remove weeds in bed along property line. Dig up invasive lily with roots.
5. Remove white gravel under large tree. Keep weed barrier.
6. Remove gravel in side area along with weed barrier.
7. Haul all materials to appropriate sites.
8. Porta Potty rental included for duration of project.
COST: $825

Planting
1. Install (12) Standard 1 gallons ($25/each).
2. Install (6) Specialty 7 gallons ($135/each).
3. Client to purchase Dusty Miller. Cost to plant $10 each - TBD.
COST: $1,110

Gravel
1. Install approx. 105 SF of pea gravel to match with new weed barrier.
2. Install approx. 70 SF of Del Rio gravel 1” minus under tree - use existing
weed barrier.
COST: $395

TOTAL COST: $2,330', 'Please double check that irrigation is reaching new plants and if not, make suggestions and I will put in a change order.
Client is aware. She will buy the Dusty Miller plants for us to plant @ $10/each.', 2330.00, 'sold', '2024-03-19', '2024-03-19 21:27:07'),
  (6922528, 33784914, '0001', 'Pressure wash and paint wall', NULL, NULL, 300.00, 'sold', '2024-03-20', '2024-03-20 06:59:13'),
  (6922533, 33784914, '0002', 'Electrical conduit rough in only', NULL, NULL, 700.00, 'sold', '2024-03-20', '2024-03-20 07:00:55'),
  (6922543, 33784914, '0003', 'Additional linear feet for steps', NULL, NULL, 260.00, 'sold', '2024-03-20', '2024-03-20 07:02:48'),
  (6922567, 33784914, '0004', 'Price deference for paseo1 and 2', NULL, NULL, 2400.00, 'sold', '2024-03-20', '2024-03-20 07:06:43'),
  (6922586, 33784914, '0005', 'Add 1 6x6x10 post to match existing', NULL, NULL, 200.00, 'sold', '2024-03-20', '2024-03-20 07:09:18'),
  (6922592, 33784914, '0006', 'Additional drainage to street', NULL, NULL, 1075.00, 'sold', '2024-03-20', '2024-03-20 07:09:48'),
  (6923069, 30365496, '0007', 'Conduit for bbq to connect GFIs', '+40 linear feet of 3/4" conduit and wiring', NULL, 1500.00, 'pending', '2024-03-20', '2024-03-20 08:23:03'),
  (6923087, 30365496, '0008', 'Replacing electrical line from main to sub panel', '1 1/4" conduit only to replace corroded line for 52 linear feet', NULL, 1900.00, 'pending', '2024-03-20', '2024-03-20 08:24:18'),
  (6924011, 32462121, '0002', '(PBUILD) Extra Demo', 'Extra Demo for 10 -12 inch concrete pad under Patio - $2250
Extra Demo for Grade Behind Pool - $750', NULL, 2900.00, 'pending', '2024-03-20', '2024-03-20 10:34:11'),
  (6924480, 33161618, '0006', '3 new drain grates', '@$85/each', NULL, 255.00, 'sold', '2024-03-20', '2024-03-20 11:36:18'),
  (6924753, 33161756, '0013', 'Credit 70 SF St. Augustine sod', NULL, NULL, -332.50, 'sold', '2024-03-20', '2024-03-20 12:13:57'),
  (6925006, 33784914, '0007', 'Additional demo', NULL, NULL, 2700.00, 'sold', '2024-03-20', '2024-03-20 12:44:48'),
  (6925011, 33784914, '0008', 'Additional steps 21LF.', NULL, NULL, 1365.00, 'sold', '2024-03-20', '2024-03-20 12:45:36'),
  (6925207, 32591483, '0008', 'ADDITIONAL PLANT MATERIAL', 'New Plants
(2) Cali Fuchsia (credit)
(2) San Miguel Buckwheat (credit)
(2) Manzanita (only charged for 1)
(2) Rhus', NULL, 127.00, 'sold', '2024-03-20', '2024-03-20 13:09:57'),
  (6925962, 33161756, '0014', '31 (1gallons) Planting Only', 'Client provided 31 (1 gallon) plants to plant. Labor only.', NULL, 310.00, 'sold', '2024-03-20', '2024-03-20 15:47:59'),
  (6925965, 33161756, '0015', '(4) added pop ups to irrigation zone.', '@$38 (labor and material) per pop up', NULL, 152.00, 'sold', '2024-03-20', '2024-03-20 15:49:13'),
  (6927390, 33161618, '0007', 'Plants for front raised pot', '(1) 5gallon Pink Passion $45
(1) 1gallon Azalea $22
(1) 1gallon Creeping Jenny $22', NULL, 89.00, 'sold', '2024-03-20', '2024-03-20 19:32:06'),
  (6931209, 33577562, '0004', 'CO Insurance requirements', NULL, NULL, 1125.00, 'pending', '2024-03-21', '2024-03-21 16:12:25'),
  (6931451, 32462121, '0003', '(PBUILD) Outdoor Kitchen', 'Install 9 foot base kitchen
Install 11 foot x 3 foot 
Install undermount lighting
Install composite veneer to match front.', NULL, 8100.00, 'pending', '2024-03-21', '2024-03-21 18:09:00'),
  (6931457, 32462121, '0004', '(PBUILD) Sump Pump System', '1) Install electrical conduit 20 linear feet.
2) New 2x2 catch basin 3 ft deep
3) New 1/2 HP pump
4) 60 linear feet of 2 inch discharge line.
5) Catch basin extensions for 3ft depth
6) 2 inch check valve
7) Check valve union
8) Black PVC drain grate.', NULL, 2850.00, 'pending', '2024-03-21', '2024-03-21 18:12:36'),
  (6931466, 32462121, '0005', '(PBUILD) Utilities for Kitchen', NULL, 'Install 65 feet of electrical from panel to outdoor kitchen. 
Install 35 ln feet from vent exit.', 2300.00, 'pending', '2024-03-21', '2024-03-21 18:22:51'),
  (6938489, 32591483, '0009', 'Timer upgrade', NULL, NULL, 425.00, 'sold', '2024-03-25', '2024-03-25 12:32:03'),
  (6947287, 30365496, '0009', 'Redoing concrete pad for equipement', 'Removal of existing pad, repouring new concrete and reinstalling pool equipment
40sqft of concrete', NULL, 1100.00, 'pending', '2024-03-27', '2024-03-27 12:25:14'),
  (6947822, 33893750, '0001', 'Additional Work for Phase 2/3', 'Additional scoping 
Covering up open areas by garage and inner courtyard where channel drain and catch basins are being installed in prep to finalize work', NULL, 1200.00, 'sold', '2024-03-27', '2024-03-27 13:44:51'),
  (6948332, 32462121, '0006', '(PBUILD) Main water 40LF. From meter to house.', 'Run new 1" copper water main line 40 LF. from street meter to house.', NULL, 1760.00, 'pending', '2024-03-27', '2024-03-27 15:27:10'),
  (6950694, 33784914, '0009', 'Soldier mow strip', NULL, NULL, 360.00, 'sold', '2024-03-28', '2024-03-28 10:25:50'),
  (6953403, 26949840, '0054', '5 LED lights for behind seated bench (firepit)', '5 Lights to be directly installed into top of bench every 6’', NULL, 1200.00, 'sold', '2024-03-29', '2024-03-29 08:13:06'),
  (6959353, 29623558, '0004', 'Drain Pour Lid', NULL, NULL, 100.00, 'pending', '2024-04-01', '2024-04-01 16:36:42'),
  (6960052, 30365496, '0010', 'Spa Renovation', 'New Skimmer (Demo, Steel, Concrete) New Auto Fill Replaster New LED Spa Light/extend brass pipe to equipment Retile New Wi-Fi Controls New Coping/pour in place. and stucco', NULL, 22000.00, 'sold', '2024-04-02', '2024-04-02 06:02:24'),
  (6965962, 33784914, '0010', 'Retaining wall with cap', NULL, NULL, 380.00, 'sold', '2024-04-03', '2024-04-03 09:01:17'),
  (6967015, 33784914, '0011', 'Stucco patching', NULL, NULL, 400.00, 'sold', '2024-04-03', '2024-04-03 11:40:17'),
  (6971198, 32462121, '0007', '(PBUILD) Credit for Apron Demo', NULL, NULL, -1000.00, 'pending', '2024-04-04', '2024-04-04 11:39:21'),
  (6971206, 32462121, '0008', '(PBUILD) Upgrade Paver', NULL, NULL, 6800.00, 'pending', '2024-04-04', '2024-04-04 11:40:14'),
  (6971563, 32462121, '0009', '(PBUILD) Fencing (Does not include Iron Work)', 'Backyard Fencing Installed @ 6ft height (8 foot posts) 162 Linear Feet
Backyard Trash Enclosure  4''7" x 10 feet.  Includes 2 access gates

One Sided Only.  Side and Back Neighbor do not require it.  Assuming left side neighbor okay since it is mostly next to his garage. 

Demo existing fencing and haul.
Dig footings for fencing every 4 feet.
Footings to be 3 1/2 feet deep due to eventaul size of fencing at 8 feet.
Waterproof post bases.  
Install 12 foot pressure treated lumber posts.
Install 2 x 6 x 8 foot fence boarding. 
Repair Brick and Concrete on Neighbor Side.

Front Yard Fencing Installed @ 3 ft height 143 linear feet.
Front pricing figures for installing cedar fencing i slotted metal railings and gates.', NULL, 25900.00, 'pending', '2024-04-04', '2024-04-04 12:30:58'),
  (6971823, 32462121, '0010', '(PBUILD) Credit for removing composite front wall', NULL, NULL, -1250.00, 'pending', '2024-04-04', '2024-04-04 13:15:48'),
  (6971960, 32462121, '0011', '(PBUILD) Extra Stucco Work', 'Wrap front house wall with waterproofing and wire.
Clean up patio footings and lower wall.
Wrap patio sections with waterproofing and wire as needed.
Install scratch coat on wire front and patio
Install brown coats for front and patio
Install stucco coats for front and patio', NULL, 1300.00, 'pending', '2024-04-04', '2024-04-04 13:35:54'),
  (6972614, 32309360, '0006', 'Design', NULL, NULL, 375.00, 'pending', '2024-04-04', '2024-04-04 16:44:21'),
  (6975524, 31545886, '0008', 'Jorges change order items', '5x5 concrete landings $460
10Lf. Steps and cut into block for landing $720
Demo 10 medium trees 1,000
Grade and export soils 220 square feet 1100
60lf sub drains $2,382
220 sq ft of concrete on side yard $3,900

Leave a comment on which one you would like to approve to finalize change order', NULL, 2860.00, 'pending', '2024-04-05', '2024-04-05 13:31:18'),
  (6975648, 31545886, '0009', 'Midnight blue pebble', 'midnight blue pebble finish', NULL, 5200.00, 'pending', '2024-04-05', '2024-04-05 13:56:44'),
  (6980356, 33691503, '0001', 'DRAINAGE (3 SIDES OF PROPERTY)', '288 linear feet of 4" high grade pipe around 3 sides of property and connecting to existing pipe installed by Alpha
Includes inlets', NULL, 7200.00, 'sold', '2024-04-08', '2024-04-08 15:16:16'),
  (6980681, 33577562, '0005', 'CO Tree removal and stump gride', NULL, NULL, 1300.00, 'pending', '2024-04-08', '2024-04-08 17:42:38'),
  (6982395, 33691503, '0002', 'Remove concrete behind house for drainage', '30''x 7'' and 8" below grade includes hauling out debris', NULL, 1050.00, 'sold', '2024-04-09', '2024-04-09 08:52:14'),
  (6987506, 3164800, '1606991', 'Paver repair', 'Hey George, so I ran the numbers for the pavers 

 15x15 area 
Pull pavers to re-grade for natural water flow
Re-install pavers 

6x11 area
Pull pavers 
Remove tree root 
Back fill and compact
Re-install pavers 

15 lf. New drain line for future down spout

$5,000', NULL, 5000.00, 'pending', '2024-04-10', '2024-04-10 10:47:56'),
  (6990876, 32462121, '0012', '(PBUILD) Crawl Space Cover', 'Dowel, form and pour foundation cover in patio.', NULL, 290.00, 'pending', '2024-04-11', '2024-04-11 08:51:05'),
  (6990997, 32462121, '0013', '(PBUILD) Bouganvillia Removal', 'Remove Bouganvillia, 
Remove trunk and root systems. 
Haul waste.', NULL, 1600.00, 'pending', '2024-04-11', '2024-04-11 09:08:14'),
  (6991539, 32462121, '0014', '(PBUILD) Foundation Repair', 'Jack house, 
Remove unused anchors
Install New Sill plates
Install Sill straps
Install new pier supports for subfloor beam', NULL, 2100.00, 'pending', '2024-04-11', '2024-04-11 10:25:00'),
  (6991695, 32971056, '0004', 'Remove Demo of tree and Sidewalk from Contract', NULL, NULL, -2180.00, 'sold', '2024-04-11', '2024-04-11 10:44:16'),
  (6993662, 31545886, '0010', 'CREDIT WALL', NULL, NULL, -13500.00, 'pending', '2024-04-11', '2024-04-11 16:29:54'),
  (6997315, 33784914, '0012', 'CREDITS', 'Border credit - $800
Wood Post $200
Design Credit $450', NULL, -1450.00, 'pending', '2024-04-12', '2024-04-12 16:47:22'),
  (6999101, 33691503, '0003', 'Bellecrete Steps + Landings (front/side/back)', 'Backyard landings (2) @ 8 linear feet and (1) @ 12 linear feet  - landings to have standard 3'' depth (@$5000.00)
Step to get into backyard (1) @ 12 linear feet/step to have 14" tread (@$1100.00)
(These steps include concrete forming and pouring for base)

Bellecrete for front entry steps includes (1) landing at 3'' depth and (2) steps at 8 linear feet each 
These steps are Bellecrete only as steps formed and poured by interior contractor (@$2200.00)', NULL, 8300.00, 'sold', '2024-04-15', '2024-04-15 08:05:25'),
  (6999165, 33691503, '0004', 'Bellecrete Wall Cap for Perimeter Wall', '87 linear feet of wall cap', NULL, 3600.00, 'sold', '2024-04-15', '2024-04-15 08:16:03'),
  (6999199, 33691503, '0005', 'Bellecrete Spa Coping', '28 linear feet (does not include water feature wall)', NULL, 2564.00, 'pending', '2024-04-15', '2024-04-15 08:21:20'),
  (7002117, 26949840, '0055', 'PLANTS FOR FRONT + BACK PLANTERS', '(24) 5 GALLON COUSIN ITT @$1560
(20) 5 GALLON CONVOLVULUS  @$860
(6) 15 GALLON AGAVE PARYII @ $1100
(4) 15 GALLON EUPHORBIA SUCCULENTS @$700
(54) 1 GALLON KANGAROO PAWS @ $1200', NULL, 5420.00, 'sold', '2024-04-15', '2024-04-15 18:26:06'),
  (7002184, 33777247, '0002', 'May 3rd Adding lights', '3 path
3 flood 

Additional cost for strip lights; instead of step lights', 'Need to know what flood lights these are, maybe crew in field can take photo? Lighting plan has many different lights.', 1740.00, 'sold', '2024-04-15', '2024-04-15 19:34:19'),
  (7002185, 33777247, '0003', 'Add (1) 5 gallon lavender', NULL, NULL, 45.00, 'sold', '2024-04-15', '2024-04-15 19:34:50'),
  (7004740, 31930909, '0006', '60sqft of Weed Fabric', 'BRYAN TO INSTALL WEED FABRIC FOR 2 BEDS FOR 60SQFT', NULL, 200.00, 'sold', '2024-04-16', '2024-04-16 11:01:43'),
  (7005511, 33784914, '0013', 'Sod price deference', NULL, NULL, 117.00, 'pending', '2024-04-16', '2024-04-16 12:46:26'),
  (7006143, 33893750, '0002', 'P3 Work', NULL, NULL, 12000.00, 'pending', '2024-04-16', '2024-04-16 14:28:22'),
  (7007435, 33478759, '0003', 'Additional mulch', NULL, NULL, 550.00, 'sold', '2024-04-17', '2024-04-17 06:20:33'),
  (7013141, 32462121, '0015', '(PBUILD) Iron Work, Gate, Motor, Low Volt, Striker', '- New Custom Powder Coated Posts and railings - Black 
- Custom Slide In fencing edges for no screw exposed look. 
- New driveway gate with railings
- New Motor and Motor Pad for driveway gate
- Electrical run to motor
- Low voltage to pedestrian gate
- New Striker at pedestrian gate and latch
- New steel framed pedestrian gate for front and side yard access.', NULL, 27500.00, 'pending', '2024-04-18', '2024-04-18 09:38:34'),
  (7013169, 32462121, '0016', '(PBUILD) Remove Equip/Frame/Stucco backyard wall', 'Remove equipment from wall
Remove electrical
Frame out opening for panel
Install mesh wire in open sections
Scratch coat patches
Brown coat patches
Final coat stucco', NULL, 900.00, 'pending', '2024-04-18', '2024-04-18 09:43:28'),
  (7013174, 33691503, '0006', 'EXTENDING STEPS FOR FRONT ENTRY', 'concrete pour plus bellecrete pieces', NULL, 540.00, 'sold', '2024-04-18', '2024-04-18 09:44:47'),
  (7013222, 32462121, '0017', '(PBUILD) Front Patio Post Change Out', 'Existing post did not go to ground.   Remove, brace and install new post.', NULL, 400.00, 'pending', '2024-04-18', '2024-04-18 09:50:26'),
  (7017309, 33691503, '0007', 'UPPER SLOPE INSTALL', 'SOIL PREP (no import or haul out of soil/limited access to slope)

·        Lightly grade sloped area above the side and back areas of the property; fill in low spots with existing soil 

·        Prep soil with organic amendments 

 

COST $2500.00

 

IRRIGATION

·        Install (3) new irrigation zones, for 3 drip lines

·        Install (3) new irrigation plastic valves 

·        Install pressure regulator/filters for drip lines 

·        All lateral trenches 12 inches below grade 

·       Install drip tubing 

·        Install 8 station smart irrigation timer (connect to 120v electrical service)

 

COST $3500.00

 

PLANTS 

·        Install approx (75) 5 gallon creeping shrubs (suggesting mix of Ceanothus ‘Yankee Point’ and Diplacus or similar)

·        Install approx (6) 5 gallon shrubs to screen existing culvert (suggesting Calycanthus occidentalis or Rhamnus californica or similar)

COST $4500.00

 

ESTIMATE TOTAL $10,500.00', NULL, 10500.00, 'sold', '2024-04-19', '2024-04-19 09:40:37'),
  (7024197, 32462121, '0018', '(PBUILD) Fence neighbor side', NULL, NULL, 2900.00, 'pending', '2024-04-22', '2024-04-22 18:26:23'),
  (7027336, 32926681, '0001', 'Weed Removal and 2 Treatments.', NULL, NULL, 2400.00, 'pending', '2024-04-23', '2024-04-23 12:51:02'),
  (7027407, 32926681, '0002', 'Tree/Plant Trimming and Plant Removal', 'BACKYARD
Trim (2) Eucalyptus - lower canopy section
Trim (6) Podocarpus - lower canopy section
Trim Rhaphiolipsis shrubs\

WEST SIDEYARD
Trim Podocarpus lower and mid canopy

FRONTYARD

Remove planting in front left planter at house.
Remove roots and stumps
Transplant existing fruit to pot
Light trim Podocarpus
Trim outside Parkway plants

Haul all material', NULL, 4900.00, 'pending', '2024-04-23', '2024-04-23 13:03:10'),
  (7027419, 32926681, '0003', 'Install 80 linear ft of sleeving for front / back', NULL, NULL, 1200.00, 'sold', '2024-04-23', '2024-04-23 13:04:28'),
  (7029741, 32462121, '0019', '(PBUILD) Grind and Restucco Pool Wall', NULL, NULL, 1900.00, 'pending', '2024-04-24', '2024-04-24 07:45:27'),
  (7032605, 32325665, '0001', 'Paver steps', 'Paver step redo', NULL, 1000.00, 'pending', '2024-04-24', '2024-04-24 14:55:43'),
  (7035900, 31248085, '0020', 'Add 2 valves and main extension to front exterior', 'Trench 50 feet for 2 new irrigation zones to extra planting from concrete fence to current planting plan. 
Trench additional 25 feet under concrete fencing for main line to front. 
Run 75 feet of new mainline for front.', NULL, 3200.00, 'sold', '2024-04-25', '2024-04-25 12:45:22'),
  (7035911, 31248085, '0021', 'Build 3 Garden Walls and Flatten Grade Sections', NULL, NULL, 5900.00, 'sold', '2024-04-25', '2024-04-25 12:46:43'),
  (7036202, 31248085, '0022', 'Fencing Redo', 'Remove existing fencing and grind out rebar reinforcement.
Install 164 ln feet of new chain link fence of smaller hole width along the entire back.  Chain link to meet LABC requirements adn will be 1 1/4 inch mesh spacing.
Remove and Replace 2 posts that are bent.
Haul waste fence', NULL, 6900.00, 'sold', '2024-04-25', '2024-04-25 13:28:43'),
  (7036207, 31248085, '0023', 'Culvert for Back Wall.', 'Install concrete culvert 99 linear feet. 12 inches wide.', NULL, 6930.00, 'sold', '2024-04-25', '2024-04-25 13:29:53'),
  (7044688, 33691503, '0008', 'Gas line (14LF)', NULL, NULL, 588.00, 'sold', '2024-04-29', '2024-04-29 13:40:59'),
  (7050134, 32462121, '0020', '(PBUILD) Extra deck step and material upgrade.', 'Add another 17 linear feet of step to the original contract. Total of 34 feet.   $1900
Upgrade material to Timber Tech premium. $800', 'Approved via phone', 2700.00, 'pending', '2024-04-30', '2024-04-30 16:38:12'),
  (7050148, 31545886, '0012', 'Natural look seal for pavers', NULL, NULL, 1400.00, 'sold', '2024-04-30', '2024-04-30 16:43:27'),
  (7052044, 26949840, '0056', 'Firepit Glass Chips', '40 bags of glass chips for fire pits', NULL, 2400.00, 'sold', '2024-05-01', '2024-05-01 09:11:36'),
  (7052434, 31248085, '0024', '4 veggie boxes (clear redwood) 8x5x2', NULL, NULL, 6567.80, 'sold', '2024-05-01', '2024-05-01 10:03:19'),
  (7052447, 31248085, '0025', 'Extra demo on fencing', NULL, NULL, 1400.00, 'sold', '2024-05-01', '2024-05-01 10:05:11'),
  (7052519, 26949840, '0057', '7 additional lights for 2 planters', '4 up lights 
3 path lights', NULL, 1750.00, 'sold', '2024-05-01', '2024-05-01 10:15:12'),
  (7057221, 32926681, '0004', 'CREDIT - project', NULL, NULL, -85348.00, 'pending', '2024-05-02', '2024-05-02 09:46:31'),
  (7057490, 32971056, '0005', 'Widening driveway', NULL, NULL, 1875.00, 'pending', '2024-05-02', '2024-05-02 10:30:01'),
  (7057655, 32971056, '0006', 'Credit planting', NULL, NULL, -280.00, 'sold', '2024-05-02', '2024-05-02 10:49:46'),
  (7058682, 31248085, '0026', 'Credit for Planter Boxes', NULL, NULL, -800.00, 'sold', '2024-05-02', '2024-05-02 13:16:10'),
  (7059587, 33123453, '0001', 'CREDIT Cable Railing', NULL, NULL, -2080.00, 'pending', '2024-05-02', '2024-05-02 16:53:00'),
  (7059641, 31248085, '0027', 'Credit on Planting', 'New planting layout including added hillside and reductions are as follows

Additional (38) 1 gallon - $950
A reduction of (6) 5 gallons - ($240)
A reduction of (10) 15 gallons - ($1500)', NULL, -790.00, 'sold', '2024-05-02', '2024-05-02 17:22:38'),
  (7059660, 31248085, '0028', 'Gopher Baskets', 'Add (603) 1 gallon gopher baskets @$8 each installed.   - $4,824

Add. (113) 5 gallon gopher baskets. @$15 each installed - $1,695

Add (12) custom 15 gallon gopher baskets. @$19 each installed. $228

No baskets for flats.  Option to put field wire below flats', NULL, 6747.00, 'sold', '2024-05-02', '2024-05-02 17:37:09'),
  (7060478, 33691503, '0009', '110 linear feet bender board edging', 'To separate ground cover from gravel', NULL, 770.00, 'pending', '2024-05-03', '2024-05-03 07:03:49'),
  (7063260, 31248085, '0029', 'Jut Net', 'Install 1140sq. Jut net', NULL, 1710.00, 'sold', '2024-05-04', '2024-05-04 09:16:48'),
  (7065375, 33185933, '0001', 'Rebuilding section of wall below fenceline', 'REbuilding 8 linear feet of railroad tie wall up by fenceline to stabilize, will use the same materials and reset courses', NULL, 1500.00, 'pending', '2024-05-06', '2024-05-06 09:41:11'),
  (7065378, 33185933, '0002', 'Additional Plant Material for Lower Slope', NULL, NULL, 1500.00, 'pending', '2024-05-06', '2024-05-06 09:41:37'),
  (7067471, 33123453, '0002', 'Additional drainage', '40 lf of drainage around pool', NULL, 1000.00, 'pending', '2024-05-06', '2024-05-06 15:26:08'),
  (7067475, 33123453, '0003', 'Additional electrical work and wifi Panel', 'Upgrade subpanel, new breakers, new wire.
New wifi switch', NULL, 2400.00, 'pending', '2024-05-06', '2024-05-06 15:27:06'),
  (7067500, 33123453, '0005', 'upgrade in rock selection', 'upgraded from pea gravel to arizone river rock', NULL, 220.00, 'pending', '2024-05-06', '2024-05-06 15:30:58'),
  (7067503, 33123453, '0006', 'lighting', '$240 per light
$400 lighting transformer', NULL, 3280.00, 'pending', '2024-05-06', '2024-05-06 15:31:39'),
  (7067779, 34087735, '0001', 'Fruit tree transplanting', 'Credit for removal and planting of 2 fruit trees and one fig tree', NULL, -75.00, 'sold', '2024-05-06', '2024-05-06 16:57:19'),
  (7067783, 34087735, '0002', 'Credit jasmine plants (material only)', '6 Jasmines will be paid for and delivered by client
(We will do the planting @ $40 each)', NULL, -210.00, 'sold', '2024-05-06', '2024-05-06 17:00:04'),
  (7067786, 34087735, '0003', 'Credit (5) 1g Achillea', NULL, NULL, -50.00, 'sold', '2024-05-06', '2024-05-06 17:01:12'),
  (7067790, 34087735, '0004', 'Hauling of extra material and tires', NULL, NULL, 200.00, 'sold', '2024-05-06', '2024-05-06 17:01:52'),
  (7067846, 34087735, '0005', 'Credit agaves', 'Credit for difference between:

6 (1gallon) agave blue glow
To
(2) 5 gallon agave blue glow', NULL, -60.00, 'sold', '2024-05-06', '2024-05-06 17:37:37'),
  (7067849, 34087735, '0006', 'Wash - (2) aster for (1) 5g echinacea', NULL, NULL, 0, 'sold', '2024-05-06', '2024-05-06 17:38:24'),
  (7067857, 34087735, '0007', 'Trade (1) Mexican orange out for (2) gardenias', NULL, NULL, -60.00, 'sold', '2024-05-06', '2024-05-06 17:42:05'),
  (7072183, 33185933, '0003', 'Credit for lighting', NULL, NULL, -3300.00, 'pending', '2024-05-07', '2024-05-07 16:14:10'),
  (7072184, 33185933, '0004', 'Shredded Mulch/Gravel for Hillside in Backyard', '3/8" black lava rock approx 150sqft
brown shredded mulch approx 300sqft (no weed cloth)', NULL, 1175.00, 'pending', '2024-05-07', '2024-05-07 16:14:39'),
  (7073302, 30365496, '0011', 'Split drains at spa', 'Demo concrete and split drains', NULL, 1500.00, 'sold', '2024-05-08', '2024-05-08 06:57:20'),
  (7073507, 33125271, '0001', 'Removing Hedges in front yard', 'Demo and hauling seven hedges in planter in the front yard 
Removing root balls and hedge.', NULL, 750.00, 'pending', '2024-05-08', '2024-05-08 07:31:00'),
  (7076822, 33185933, '0005', 'Jute mesh fur lower slope', '600sqft', NULL, 1200.00, 'pending', '2024-05-08', '2024-05-08 16:16:01'),
  (7079930, 33691503, '0010', 'Stepstone stepper South side', 'Approx 900sqft of steppers with 6” joints - gravel to be a separate c/o
Order will be placed today Includes demo', NULL, 23500.00, 'sold', '2024-05-09', '2024-05-09 11:56:44'),
  (7080298, 34535568, '0001', 'Snake and scope behind guest house', NULL, NULL, 2000.00, 'sold', '2024-05-09', '2024-05-09 12:43:40'),
  (7082584, 33691503, '0011', 'Podocarpus', '(16) 15 gallon
(21) 24”', NULL, 8990.00, 'sold', '2024-05-10', '2024-05-10 08:11:22'),
  (7084020, 34087735, '0008', 'Additional demo', '1 crew day', NULL, 2100.00, 'sold', '2024-05-10', '2024-05-10 12:25:25'),
  (7084657, 32422492, '0002', 'deck', NULL, NULL, 19744.00, 'pending', '2024-05-10', '2024-05-10 15:15:06'),
  (7086728, 33185933, '0006', 'PLANT PLACEMENT (DANA)', NULL, NULL, 375.00, 'pending', '2024-05-13', '2024-05-13 08:28:09'),
  (7092202, 32325665, '0002', 'sealer', 'sealer for pavers', NULL, 1800.00, 'pending', '2024-05-14', '2024-05-14 11:19:17'),
  (7100760, 33123453, '0007', 'Credit pavers 810 vs 676 actual', NULL, NULL, -2010.00, 'pending', '2024-05-16', '2024-05-16 09:49:25'),
  (7100765, 33123453, '0008', 'Credit turf 55sqft', NULL, NULL, -572.00, 'pending', '2024-05-16', '2024-05-16 09:50:14'),
  (7100772, 33123453, '0009', 'Credit BBQ counter', NULL, NULL, -1800.00, 'pending', '2024-05-16', '2024-05-16 09:50:44'),
  (7100925, 33577562, '0006', 'CREDIT 300W transformer', NULL, NULL, -450.00, 'pending', '2024-05-16', '2024-05-16 10:15:20'),
  (7101550, 34625025, '0001', 'Drainage and Sump Pit', NULL, NULL, 1500.00, 'pending', '2024-05-16', '2024-05-16 11:51:24'),
  (7101893, 30797398, '0004', 'Sleeving', NULL, NULL, 4071.35, 'pending', '2024-05-16', '2024-05-16 12:40:03'),
  (7101910, 30797398, '0005', '18 inches of asphalt demo beyond contract demo', NULL, NULL, 3370.75, 'pending', '2024-05-16', '2024-05-16 12:42:11'),
  (7101914, 30797398, '0006', 'Concrete Slab Underneath Wood Pos', NULL, NULL, 1256.00, 'pending', '2024-05-16', '2024-05-16 12:43:07'),
  (7102743, 30797398, '0007', 'Concrete Demo', NULL, NULL, 941.00, 'pending', '2024-05-16', '2024-05-16 15:01:17'),
  (7102873, 32638422, '0001', 'Shoring for Corner of the House', 'There was no shoring detail on the approved plans from the city, but the city required it to move forward.

We received a shoring detail from the engineer for 8 foot deep posts that would have required having a drilling company come in to complete

We were able to get that revised with the engineer to go 4 feet deep and with cross bracing to avoid that cost.

3.5 Man days of labor
Digging two one foot wide four foot deep holes.
Insall two eight foot 8x8 posts with cement slurry
Install four 4x12 supports across the face
Install two 4x8 supports braced to the curb

Total cost $4590', NULL, 4590.00, 'pending', '2024-05-16', '2024-05-16 15:50:43'),
  (7102931, 30579258, '0004', 'Drainage Repair on existing drains.', 'Exposing all existing drainage to find problems
Lowering outlet pipes.
Jetting and cleaning existing drains
Rerunning and splicing 6 drains to get flow out to creek.', NULL, 3750.00, 'pending', '2024-05-16', '2024-05-16 16:11:38'),
  (7102957, 33123453, '0010', 'Stucco repair on the House', 'Water proofing on existing stucco was cut with old deck install
Needed to redo stucco around ledger boards and 3 feet down
17 linear feet by 3 feet down and closing vents.', NULL, 1300.00, 'pending', '2024-05-16', '2024-05-16 16:26:44'),
  (7102990, 33896812, '0001', 'Main Line Rerouting', 'Rerouting the main line around the other side of the house because there was concrete poured where our line is supposed to be run.
The inspector required removing concrete to install the main line, which is not an option.
There were no sleeving installed on 6 paths that were called out for sleeves on the plan.
Jetting main line 28 feet in areas with no sleeves.

6 man days for jetting and rerouting mainline.', NULL, 5460.00, 'pending', '2024-05-16', '2024-05-16 16:44:41'),
  (7106403, 33123453, '0011', 'Gravel Stabilizer Walkway', 'Adding Stabilizer for the Walkway and around the Olive Tree

Lifting gravel and mixing with stabilizer and trowling down.', NULL, 1800.00, 'pending', '2024-05-17', '2024-05-17 15:27:12'),
  (7106475, 32462121, '0021', '(PBUILD) Subterranean Drip Irrigation', 'Adding Subterranean Drip for Grass', NULL, 1200.00, 'pending', '2024-05-17', '2024-05-17 16:17:15'),
  (7106479, 32462121, '0022', '(PBUILD) Side and ADU gate and fencing.', NULL, NULL, 2100.00, 'pending', '2024-05-17', '2024-05-17 16:19:15'),
  (7106484, 32462121, '0023', '(PBUILD) Credit Iron Fencing', NULL, NULL, -2000.00, 'pending', '2024-05-17', '2024-05-17 16:20:21'),
  (7106507, 9089392, '0006', 'Repair on Valve', 'Electrical Repair on Valve 
Fixed Broken T', NULL, 150.00, 'pending', '2024-05-17', '2024-05-17 16:51:11'),
  (7110886, 32325665, '0003', 'additional plants', '2 camellia
1 new 15 gallon espalier', NULL, 350.00, 'pending', '2024-05-20', '2024-05-20 17:13:34'),
  (7110893, 32325665, '0004', 'lighting', 'lights 1620', NULL, 1620.00, 'pending', '2024-05-20', '2024-05-20 17:19:51'),
  (7114074, 32307925, '0001', 'Paver credit', NULL, NULL, -7522.50, 'pending', '2024-05-21', '2024-05-21 12:08:36'),
  (7114083, 32307925, '0002', 'Additional Drainage 380 lf needed, 120 in contract', 'Additional drainage. 260 additional lfx $25', NULL, 6500.00, 'pending', '2024-05-21', '2024-05-21 12:10:30'),
  (7114098, 32307925, '0003', 'Seat Wall Shortened', NULL, NULL, -1408.00, 'pending', '2024-05-21', '2024-05-21 12:11:51'),
  (7114113, 32307925, '0004', '2 new Planters at ends on bench seat', 'Adding at ends of bench seat', NULL, 640.00, 'pending', '2024-05-21', '2024-05-21 12:13:37'),
  (7114133, 32307925, '0005', 'Outdoor kitchen additional foot', 'Adding one foot', NULL, 1165.00, 'pending', '2024-05-21', '2024-05-21 12:15:12'),
  (7114495, 32307925, '0006', 'Weed clearing and additional demo', NULL, NULL, 1800.00, 'pending', '2024-05-21', '2024-05-21 12:56:13'),
  (7114606, 34087735, '0009', 'Bend a board', 'Approved verbally in meeting', NULL, 680.00, 'pending', '2024-05-21', '2024-05-21 13:12:29'),
  (7115776, 34087735, '0010', '2 yards of crush gravel', NULL, NULL, 648.00, 'sold', '2024-05-21', '2024-05-21 18:24:31'),
  (7116793, 32307925, '0007', 'Paver Credit Off', 'Earlier paver credit had a 12-foot deep front patio.   The front patio, per request, is to be 14 and half feet deep (18) inches away from sidewalk.  So this change adds back 65 square feet.', NULL, 910.00, 'pending', '2024-05-22', '2024-05-22 07:28:31'),
  (7116878, 32462121, '0024', '(PBUILD) Post and fence west sideyard', 'Attach posts and fencing for west side Yard.  2x4 anchored to the wall every 4 feet, with 4x4 support.  Then cedar fencing for the top section.
Add additional 4x4 to sign to fur out fencing on neighbor side.', NULL, 2450.00, 'pending', '2024-05-22', '2024-05-22 07:42:03'),
  (7116886, 32462121, '0025', '(PBUILD) xtra for decking for non seam look', NULL, NULL, 1100.00, 'pending', '2024-05-22', '2024-05-22 07:43:15'),
  (7116891, 32462121, '0026', '(PBUILD) Gate culvert with paver', NULL, NULL, 1650.00, 'pending', '2024-05-22', '2024-05-22 07:43:53'),
  (7117351, 34535568, '0002', 'PATCHING CONCRETE CURB', 'Saw cut approx 15 linear feet of concrete curb
	Haul debris 
	Form for 15 linear feet of concrete curbing at 6 inches above grade 
	Pour 3000 psi natural grey concrete 
	Pull forms
	Apply Top Cast to curing concrete 
	Pressure wash to expose sand finish 
	Repair approx (6) cracks within concrete gutter and curb
	Core for drainage exit', NULL, 3600.00, 'sold', '2024-05-22', '2024-05-22 08:51:18'),
  (7117502, 34634270, '0001', 'Add bond and paver', 'Add flagstone and bond beam', NULL, 750.00, 'pending', '2024-05-22', '2024-05-22 09:12:12'),
  (7121036, 32462121, '0027', '(PBUILD) Step Lights for Decking', NULL, NULL, 1500.00, 'pending', '2024-05-23', '2024-05-23 06:49:55'),
  (7125630, 10553589, '0028', '2 hours labor + drive time', NULL, NULL, 150.00, 'sold', '2024-05-24', '2024-05-24 08:28:20'),
  (7126290, 34087735, '0011', 'Gravel price deference', 'Approved via text', NULL, 369.00, 'pending', '2024-05-24', '2024-05-24 10:26:55'),
  (7126625, 34625025, '0002', 'lighting change and 2 lights', 'via text from jorge
2 lights
swap from little smokeys to a different light', NULL, 500.00, 'pending', '2024-05-24', '2024-05-24 11:31:32'),
  (7127801, 34087735, '0012', '1 boulder', NULL, NULL, -92.00, 'sold', '2024-05-25', '2024-05-25 07:45:37'),
  (7128661, 34087735, '0013', 'Credit for Unused Gravel', 'Credit for 1/2 yard of unused gravel.', NULL, -160.00, 'sold', '2024-05-27', '2024-05-27 07:29:23'),
  (7134978, 33806261, '0001', 'Install about 400 sq. Miners gold 3/4" at 2 "', NULL, NULL, 2460.00, 'pending', '2024-05-29', '2024-05-29 07:29:38'),
  (7135245, 26949840, '0058', 'Pavers for Firepit Area', '200sqft of pavers for sunken firepit 

****Pls note there was a credit issued on 2/1/24 for concrete (#26) - part of this credit was initiated b/c the original design plan called out concrete for the firepit area which we switched out to pavers, the change order should have also reflected the additional pavers but the change order was never updated***', NULL, 3200.00, 'sold', '2024-05-29', '2024-05-29 08:17:41'),
  (7141899, 34719252, '0001', '10 LF OF ADDITIONAL CURBING', NULL, NULL, 440.00, 'pending', '2024-05-30', '2024-05-30 13:19:22'),
  (7141906, 34719252, '0002', '10 LF IF ADDITIONAL ELECTRICAL WIRING', NULL, NULL, 310.00, 'pending', '2024-05-30', '2024-05-30 13:20:11'),
  (7141938, 34719252, '0003', 'Additional 8x8x16 doweled in', '8 LF X $62.40= $499.00', NULL, 499.00, 'pending', '2024-05-30', '2024-05-30 13:24:53'),
  (7142708, 32462121, '0028', '(PBUILD) Sewer Line Work', 'Install cleanouts beyond fence area', NULL, 1700.00, 'pending', '2024-05-30', '2024-05-30 16:54:54'),
  (7142711, 33577562, '0007', 'CREDIT Wiring', 'Credit for removing wiring work of lights in contract', NULL, -2795.00, 'pending', '2024-05-30', '2024-05-30 16:55:34'),
  (7146091, 34538659, '0001', 'Rear & front yard change order', 'Remove driveway, patio & rear step
Install 1066sf  ''Courtyard'' driveway and rear patio
Install 36lf of bullnose steps rear patio
Upgrade front edging to metal & add along north front p/l
Add (3) 4" flats south of driveway planter & irrigation
Add (1) zone irrigation for rear sod 
Remove rear lawn and add 735 sf of ''marathon I'' sod
Add 350 sf of mulch to rear yard
Plant approx (10) owner supplied plants 

Total Change Order is $27,733

Approved for 12K to be paid for change order and the remaining balance of 15,733 to be paid once house sells.', 'Mo approved 12K to be paid for change order and remaining balance to be paid once house sells.', 27733.00, 'pending', '2024-05-31', '2024-05-31 14:22:54'),
  (7146297, 26949840, '0059', 'Wet look Sealant for all pavers', NULL, NULL, 34050.00, 'sold', '2024-05-31', '2024-05-31 15:40:15'),
  (7146720, 34281908, '0001', 'Driveway change order approved', 'Adding the driveway', NULL, 25787.00, 'pending', '2024-06-01', '2024-06-01 19:04:28'),
  (7151267, 34760103, '0001', 'Stamping approx 290sqft of Concrete', 'Entire patio area concrete to be stamped concrete, this will include the areas on either side of patio cover (current concrete does not include 
this 290sqft)', NULL, 700.00, 'sold', '2024-06-03', '2024-06-03 16:16:17'),
  (7156202, 32307925, '0008', 'Taking out Garbage Can Walls', 'Not installing the garbage can walls, taking out of contract.', NULL, -7590.00, 'pending', '2024-06-04', '2024-06-04 20:03:17'),
  (7156361, 32462121, '0029', '(PBUILD) Block wall fencing overlay', NULL, NULL, 850.00, 'pending', '2024-06-04', '2024-06-04 22:28:11'),
  (7157264, 34281908, '0002', 'Rustic wall block curb', '2.  Curbing Angelus Rustic wall block on it''s 8" vertical side, exposing 4''-6" curb next to pavers on the front porch side

12 Linear Feet X $28.80= $354.60


Material choices:

Wall:  Angelus Rustic Wall Block in grey/moss/charcoal

Curb:  Angelus Rustic Wall grey/moss/charcoal', NULL, 354.60, 'pending', '2024-06-05', '2024-06-05 07:29:42'),
  (7157276, 34281908, '0003', 'Garden wall', '1.  Garden Wall 12" high in Angelus Rustic wall block in Grey/Moss/Charcoal 

30 LInear Feet X $86.40= $2,592.00




Material choices:

Wall:  Angelus Rustic Wall grey/moss/charvoal

Pavers: Angelus Holland in grey/moss/charcoal 

  Border same paver in soldier''s course

  Field in horizontal runner course', NULL, 2592.00, 'pending', '2024-06-05', '2024-06-05 07:31:32'),
  (7157340, 34281908, '0004', 'Credit for taking out concrete 2x2', 'Concrete pads

1.      6 pads 

2.      2’ X 2’

3.      Poured in place or Angelus Pavilion
2’ X 2’

4.      $125.00 each

Cost:   $750.00', NULL, -750.00, 'pending', '2024-06-05', '2024-06-05 07:40:01'),
  (7160585, 28581838, '0027', 'Tree Credit', NULL, NULL, -176.40, 'pending', '2024-06-05', '2024-06-05 17:42:06'),
  (7160925, 32462121, '0030', '(PBUILD) Gravel Installation', 'Remove 3 inches of soils and grade.
Install geotextile fabric
Install 350 square feet of Del Rio Gravel', NULL, 1750.00, 'pending', '2024-06-05', '2024-06-05 21:53:16'),
  (7160929, 32462121, '0031', '(PBUILD) Fencing Neighbor side behind garage.', NULL, NULL, 1900.00, 'pending', '2024-06-05', '2024-06-05 21:54:28'),
  (7160936, 32462121, '0032', '(PBUILD) Patio Post and Beam work', 'Install 3 2x8 beam covers inside patio.
Install 3 2x8 outlet wraps outside posts
Install 3 patio light extensions
Wrap 3 posts in 3/4 inch wood table grade ply.  Butt joint
Fill and level wood patching w 4 to 5 coats of Bondo.
Install plastic post veneer bases to all posts.', NULL, 2825.00, 'pending', '2024-06-05', '2024-06-05 22:01:20'),
  (7160955, 32462121, '0033', '(PBUILD) Planting and Mulch', 'Install 
(14) 5 Gallon Lady Banks
(8) 5 Gallon Giant Bird of Paradise
(16) 5 Gallon Staked Star Jasmine
(2) 15 Gallon Durante
(20) 5 Gallon Boxwood
(14) 5 Gallon Grewia
(3) 15 Gallon Regular Bird of Paradise
(8) 1 Gallon Stattice

Install 2 yards of Walk on Mulch', NULL, 4485.00, 'pending', '2024-06-05', '2024-06-05 22:22:10'),
  (7165437, 33185933, '0007', '1 add''l zone of drip irrigation (side to front)', NULL, NULL, 1200.00, 'pending', '2024-06-06', '2024-06-06 20:36:38'),
  (7166497, 30365496, '0012', 'New Walkway/Steps Front Entry', '1. Rebuilding small retaining walls flanking steps (brick caps) @$4000.00
2. Rebuilding steps to front yard 6 steps cantilevered in concrete (finish//color to be the same as b/y) @$3800.00
3. Rebuilding (2) front step landing areas, for a total of 84 linear feet in concrete (finish/color to be same as b/y) and concrete walkway aligned      to steps and front entry walkway for 209sqft @$4800.00', NULL, 12600.00, 'sold', '2024-06-07', '2024-06-07 08:16:32'),
  (7167029, 32307925, '0009', 'Adding pizza oven counter', 'This counter will be priced at straight, not curved, with flat counter top to match outdoor kitchen counter

6" wall/edge 30" pizza oven on counter 24" counter next to pizza oven for a total of 5'' wide with 36" deep. 

5'' x $740.00 masonry = $3,700.00

Gas 10 linear feet x $35.00= $350.00

Electric 9 lf x $35.00 $315.00

Total $4,365.00

Includes installation of pizza oven and access doors', NULL, 4365.00, 'pending', '2024-06-07', '2024-06-07 09:54:00'),
  (7167397, 30797398, '0008', 'Credits due', NULL, NULL, -2991.65, 'pending', '2024-06-07', '2024-06-07 11:09:40'),
  (7168632, 31545886, '0013', 'DG', '231 sqft of DG 4.15 per sqft total is $958.65', NULL, 958.65, 'sold', '2024-06-07', '2024-06-07 16:57:34'),
  (7168633, 31545886, '0014', 'Del Rio Gravel for Side yard', '100 sqft of Del Rio Gravel for Side Yard 3.85 per sqft 
Total is $385', NULL, 385.00, 'sold', '2024-06-07', '2024-06-07 16:59:08'),
  (7168637, 31545886, '0016', '7) 15 gallon climbing roses', '7) 15 gallon climbing roses $315 per rose

Total $2205', NULL, 2205.00, 'sold', '2024-06-07', '2024-06-07 17:02:17'),
  (7168638, 31545886, '0017', 'Trellis install', 'Installing Trellises

2 hours of labor at $70 per hour

Total $140', NULL, 140.00, 'sold', '2024-06-07', '2024-06-07 17:03:44'),
  (7168644, 31545886, '0018', 'Planting', '8) 15 gallon Ligustrums Texanum $150 per plant
1) 24 inch box Magnolia Little Gem $385

Total $1585', NULL, 1585.00, 'sold', '2024-06-07', '2024-06-07 17:09:18'),
  (7168651, 31545886, '0019', 'Concrete', '18 sqft of concrete $50 per sqft

Total  $900Understanding is this is the planter on the side of the house to be covered.', NULL, 900.00, 'sold', '2024-06-07', '2024-06-07 17:15:56'),
  (7168652, 31581766, '0006', 'Labor for Cleaning and Covering', NULL, NULL, 350.00, 'pending', '2024-06-07', '2024-06-07 17:16:58'),
  (7168856, 32462121, '0034', '(PBUILD) Outdoor Kitchen Wood Veneer', 'Rip cut 2x6 fencing material. 
Drill Anchors and attach wood veneer
Veneer in staggered butt joint ends.', NULL, 1950.00, 'pending', '2024-06-08', '2024-06-08 11:01:01'),
  (7169726, 33691503, '0012', 'Gas line/extra demo', NULL, NULL, 1360.00, 'sold', '2024-06-10', '2024-06-10 06:24:50'),
  (7170924, 34722397, '0001', 'PERGOLA', 'Alumawood Pergola. PB to excavate footings only', 'Alumawood Pergola. PB to excavate footings only', 20577.00, 'pending', '2024-06-10', '2024-06-10 09:58:31'),
  (7170971, 30365496, '0013', 'Credit mulch', NULL, NULL, -2000.00, 'sold', '2024-06-10', '2024-06-10 10:06:10'),
  (7170974, 30365496, '0014', 'Additional Gravel', 'Del Rio at 3" @3042sqft includes landscape fabric', NULL, 11800.00, 'sold', '2024-06-10', '2024-06-10 10:06:27'),
  (7174210, 34722397, '0002', 'Sleeves front driveway', NULL, NULL, 0, 'pending', '2024-06-11', '2024-06-11 06:44:35'),
  (7174213, 34722397, '0003', 'Additional pavers', NULL, NULL, 0, 'pending', '2024-06-11', '2024-06-11 06:44:47'),
  (7175468, 34841717, '0001', 'Bellecrete Step for Spa 20 linear feet', NULL, NULL, 1460.00, 'pending', '2024-06-11', '2024-06-11 09:42:35'),
  (7175477, 34841717, '0002', 'Credit for Bellecrete border  upper deck area', NULL, NULL, -1710.00, 'sold', '2024-06-11', '2024-06-11 09:43:56'),
  (7177960, 32462121, '0035', '(PBUILD) Fence Sealing', '1) Clean fencing
2) Apply Cabots clear wood sealer. Roughly 4160 sq feet', NULL, 4200.00, 'pending', '2024-06-11', '2024-06-11 16:11:35'),
  (7178176, 33691503, '0013', 'GROUND COVER FOR STEPSTONES SOUTHSIDE', '7 FLATS BLUE STAR', NULL, 500.00, 'sold', '2024-06-11', '2024-06-11 17:49:18'),
  (7178179, 33691503, '0014', '1 ZONE IRRIGATION SUBTERRANEAN', NULL, NULL, 1400.00, 'sold', '2024-06-11', '2024-06-11 17:50:25'),
  (7179218, 33896812, '0002', 'Culvert and Sidewalk', 'Install culvert and sidewalk.', NULL, 3750.00, 'pending', '2024-06-12', '2024-06-12 07:03:57'),
  (7179589, 34281908, '0006', 'Pavers Credit', 'The amount of Paver installed was actually 1100 sqft plus 42 sqft still needed for parkway.
549 sqft being Credited 
15.25 per sqft 
Total credit of $8,372.25', NULL, -8646.75, 'pending', '2024-06-12', '2024-06-12 07:59:59'),
  (7179698, 34281908, '0007', 'One additional light, same uplight as others', NULL, NULL, 225.00, 'pending', '2024-06-12', '2024-06-12 08:14:13'),
  (7185757, 34281908, '0008', '280 additional SF of rock', '380 sf x $5.50= $1,540.00', NULL, 1540.00, 'pending', '2024-06-13', '2024-06-13 12:01:26'),
  (7186763, 34720122, '0001', 'CREDIT 500 If of turf strip REMOVED 7831', NULL, NULL, -7831.00, 'pending', '2024-06-13', '2024-06-13 14:50:05'),
  (7190936, 32462121, '0036', '(PBUILD) Stucco Repair East Side Wall', 'Grind out cracks made in stucco. 
Grind out bad stucco patch 
Grind out small section stucco patio
Repair stucco patches and cracks', NULL, 800.00, 'pending', '2024-06-15', '2024-06-15 23:25:33'),
  (7190938, 32462121, '0038', '(PBUILD) Add 2 24x24 paver pads near Cat House', NULL, NULL, 485.00, 'pending', '2024-06-15', '2024-06-15 23:34:15'),
  (7190939, 32462121, '0039', '(PBUILD) Garden Border', 'Install roughly 110 of 2x6 treated board. Not included in original contract.

(No charge for original bender board swap out', NULL, 620.00, 'pending', '2024-06-15', '2024-06-15 23:39:23'),
  (7195200, 34281908, '0009', '6 2 gallon lavenders', '6 2 gallon lavenders @ $30.00 each. $180.00', NULL, 180.00, 'pending', '2024-06-17', '2024-06-17 15:07:32'),
  (7195796, 32462121, '0040', '(PBUILD) Sod Upgrade', 'Upgrade Sod to St Augustine', NULL, 2200.00, 'pending', '2024-06-17', '2024-06-17 19:46:17'),
  (7195801, 32462121, '0041', '(PBUILD) Install Additional Lighting', 'Original Contract has 19 lights.  Install 21 bed lights
Plus Install 4 FX Luminaire Upgraded Path lights
Plus Install 2 down lights for trash area.', NULL, 2300.00, 'pending', '2024-06-17', '2024-06-17 19:50:10'),
  (7198970, 32462121, '0042', '(PBUILD) Add self closer to side gate', NULL, NULL, 150.00, 'pending', '2024-06-18', '2024-06-18 12:31:40'),
  (7203065, 35157995, '0001', 'Credit for Front Demo', NULL, NULL, -600.00, 'pending', '2024-06-19', '2024-06-19 11:12:36'),
  (7206250, 34722397, '0004', 'Addtl Gopher mesh & revised (reduced) plants', NULL, NULL, 222.00, 'pending', '2024-06-20', '2024-06-20 08:01:53'),
  (7210563, 35064636, '0001', 'Additional Demo', 'Additional Demo for the front yard.', NULL, 1800.00, 'sold', '2024-06-21', '2024-06-21 08:27:12'),
  (7210575, 35064636, '0002', 'Stump Griding', 'Stump grinding $460', NULL, 460.00, 'sold', '2024-06-21', '2024-06-21 08:28:18'),
  (7210584, 35064636, '0003', 'Drainage to rain Garden', '43 linear feet at 13 dollars a foot', NULL, 637.00, 'sold', '2024-06-21', '2024-06-21 08:29:19'),
  (7212811, 32916329, '0001', 'Dirt Import', '2.5 Crew days at 7 hours a day $150/hour - $7875
Import 9 yards of dirt, $400 delivery (x2), $13/yard  - 917', NULL, 8792.00, 'pending', '2024-06-21', '2024-06-21 16:36:15'),
  (7214685, 34722397, '0005', 'Gopher Mesh & plant Credit', NULL, NULL, 222.00, 'pending', '2024-06-24', '2024-06-24 08:09:47'),
  (7216500, 34719252, '0004', '1 additional light', 'Added one light', NULL, 225.00, 'pending', '2024-06-24', '2024-06-24 12:44:15'),
  (7222389, 32307925, '0010', 'Paver Circle Pattern with solid dark border', NULL, '1.  Circle pattern in Angelus Courtyard in Tuscan
2.  Dark border in charcoal or Mocha
If you would like the  circle pattern instead of the random 4 piece pattern the cost is:  $675.00  This includes the additional special order of the circle with the hand grouted polymeric grout needed for the joint spaces.
If you would like a dark charcoal border around the circle it is $105.00
Total for both:  $780.00', 780.00, 'pending', '2024-06-25', '2024-06-25 18:52:39'),
  (7222473, 34719252, '0005', 'Wall Credit', 'That is $383.44/ft, and we are short 5.5'' on the s/w return = $2,108.92', NULL, -2108.92, 'pending', '2024-06-25', '2024-06-25 20:08:21'),
  (7222475, 34719252, '0006', 'Transformer credit leaving install of new transfor', 'Leaving $200.00 to install an owner provided app- operated transformer', NULL, -300.00, 'pending', '2024-06-25', '2024-06-25 20:10:33'),
  (7223204, 33691503, '0015', 'Demo tile for fireplace', 'Demo and haul', NULL, 700.00, 'sold', '2024-06-26', '2024-06-26 06:50:50'),
  (7223234, 33691503, '0016', '(2) Steps for Courtyard', 'Install step at 6’ x 26”
Install step at 79”x 24”', NULL, 2400.00, 'sold', '2024-06-26', '2024-06-26 06:55:11'),
  (7226223, 33185933, '0008', '2 15G Bougainvillea', NULL, NULL, 300.00, 'pending', '2024-06-26', '2024-06-26 14:04:44'),
  (7231257, 34720122, '0002', 'Add 100 lnft drains', NULL, NULL, 2500.00, 'pending', '2024-06-27', '2024-06-27 18:47:00'),
  (7231276, 34456359, '0001', 'CREDIT FOR 2X2 STEPPERS', NULL, NULL, -1500.00, 'sold', '2024-06-27', '2024-06-27 18:58:35'),
  (7231278, 34456359, '0002', 'LIGHTING', '6 PATHS
3 UPS
1 TRANSFORMER', NULL, 2415.00, 'sold', '2024-06-27', '2024-06-27 18:59:21'),
  (7231281, 34456359, '0003', '75SQFT OF JELLY BEAN GRAVEL', 'Added JellyBean to gravel areas', NULL, 225.00, 'sold', '2024-06-27', '2024-06-27 19:01:02'),
  (7232340, 34719252, '0007', 'Plant credit', 'See list from Jorge of reduced plants and add 1 15 gal lime and 1 flat of rosemary. Original in contract $5,092.50 , reduced to $3,411.00. Difference is -$1,680.50', NULL, -1680.50, 'pending', '2024-06-28', '2024-06-28 07:57:18'),
  (7232351, 34719252, '0008', '1 Irrigation zone', 'Credit for 1 irrigation zone', NULL, -1008.00, 'pending', '2024-06-28', '2024-06-28 07:58:56'),
  (7232352, 34171881, '0001', 'Additional Demo', '530sqft at 7" below grade', NULL, 2100.00, 'sold', '2024-06-28', '2024-06-28 07:59:22'),
  (7232368, 34171881, '0002', 'Rustic Wall/Along left side of driveway', '23 linear feet at 1'' tall', NULL, 2665.00, 'sold', '2024-06-28', '2024-06-28 08:02:41'),
  (7232377, 34171881, '0003', 'Soldier Course right side of driveway', '55 linear feet', NULL, 1200.00, 'sold', '2024-06-28', '2024-06-28 08:03:45'),
  (7232390, 34171881, '0004', 'Credit for 70 linear feet of drainage', NULL, NULL, -5000.00, 'sold', '2024-06-28', '2024-06-28 08:05:08'),
  (7232399, 34171881, '0005', 'Credit for concrete curb (driveway)', NULL, NULL, -500.00, 'sold', '2024-06-28', '2024-06-28 08:07:40'),
  (7233149, 34171881, '0008', 'Sump pump, Channel Drain Install, ETC', 'Sump Pump + 2x2 Catch Basin
120 LF of 2" Schedule 40 pipe to connect pump and run out to street
19 LF Strip Drain across the edge of the garage
12 LF Conduit w/gfi breaker', NULL, 9700.00, 'pending', '2024-06-28', '2024-06-28 10:13:15'),
  (7234573, 34171881, '0009', 'discount on sump pump', NULL, NULL, -1000.00, 'pending', '2024-06-28', '2024-06-28 15:15:10'),
  (7241463, 33896812, '0003', 'Added Step', NULL, NULL, 1700.00, 'pending', '2024-07-02', '2024-07-02 09:15:36'),
  (7242064, 35162285, '0001', 'Sub concrete walkway for pavers', 'catalina grana victorian', NULL, 1100.00, 'pending', '2024-07-02', '2024-07-02 10:33:54'),
  (7244205, 33185933, '0009', 'Additional plant, topiaries', NULL, NULL, 120.00, 'pending', '2024-07-02', '2024-07-02 16:21:19'),
  (7244231, 33125271, '0002', 'sod/valve additions', 'additional sod and valve', NULL, 1950.00, 'pending', '2024-07-02', '2024-07-02 16:35:27'),
  (7244294, 33806261, '0002', '6- 5 gals', '6- 5 gals Total $261 Let me know if if this works. we can coordinate for the next yard check this Friday', NULL, 261.00, 'pending', '2024-07-02', '2024-07-02 17:00:56'),
  (7245342, 32462121, '0043', '(PBUILD) Credit for removing path lights.', 'No walkway lights to be installed.', NULL, -1200.00, 'pending', '2024-07-03', '2024-07-03 07:15:31'),
  (7245507, 32462121, '0044', '(PBUILD) Additional Items', '1) Install Brickwork for neighbor side around fencing footings.   (Needed due to having to cut neighbor concrete around old footings)
2) Install Hose Reels
3) Install Large Del Rio for back planters
4) Build Raised Planter Bed. Redwood posts, Redwood rails, and Overlapped Cedar Siding
5) Finish Fencing in upper section. 
6) Wrap front post and beams.(have to wrap beam to match post wrap thickness)', NULL, 5850.00, 'pending', '2024-07-03', '2024-07-03 07:42:08'),
  (7246130, 34456359, '0004', 'Arizona Buckskin Flagstone Steppers', '14  irregular pieces for 3 small pathways to be set approx 12" apart', NULL, 1600.00, 'sold', '2024-07-03', '2024-07-03 09:12:34'),
  (7248337, 34760103, '0002', 'Additional Zone for Drip', 'For back planter', NULL, 1050.00, 'sold', '2024-07-03', '2024-07-03 16:18:11'),
  (7248339, 34760103, '0003', 'Sleeves for under new concrete', NULL, NULL, 0, 'pending', '2024-07-03', '2024-07-03 16:18:28'),
  (7252771, 34841717, '0004', 'Remove front yard Jacaranda', 'includes stump/root grinding and debris haul', NULL, 600.00, 'pending', '2024-07-08', '2024-07-08 08:20:16'),
  (7252774, 34841717, '0005', 'Adding 7 linear feet for seated wall', NULL, NULL, 900.00, 'pending', '2024-07-08', '2024-07-08 08:20:48'),
  (7253922, 35259913, '0001', 'Engineering', NULL, NULL, 750.00, 'pending', '2024-07-08', '2024-07-08 11:24:14'),
  (7257169, 32422492, '0003', 'Price difference for copping', NULL, 'Approved verbally', 2400.00, 'pending', '2024-07-09', '2024-07-09 08:37:31'),
  (7262718, 34841717, '0006', 'Drainage 246 LF. 4" SDR35 PIPE', '4”
SDR 35 pipe includes tie in to downspouts', NULL, 5800.00, 'sold', '2024-07-10', '2024-07-10 11:00:13'),
  (7262740, 34841717, '0007', 'Chip pool bond beam about 1.5 inches', 'Chip out 67 LF. ON BOND BEAM @1.5 INCHES TO GET CORRECT ELEVATION TO MEET 1 INCH UNDER WEEP SCREED.', NULL, 2860.00, 'pending', '2024-07-10', '2024-07-10 11:04:40'),
  (7267687, 35156966, '0001', 'Sideyard work', 'Taking out fence 

Grading dirt flat', NULL, 800.00, 'sold', '2024-07-11', '2024-07-11 12:57:31'),
  (7267694, 35156966, '0002', 'Additional valve', 'Adding one valve for the grass', NULL, 750.00, 'sold', '2024-07-11', '2024-07-11 12:58:15'),
  (7268275, 33691503, '0017', 'PLANTS FOR FRONT ENTRY/ SOUTH SIDE', '(21) 5 GALLON SHRUBS (silver sheen pittosporum, golf ball pittosporum)
(39) 1 GALLON PERENNIALS (licorice, salvia, lavender)', NULL, 1760.00, 'sold', '2024-07-11', '2024-07-11 14:34:49'),
  (7268466, 34841717, '0008', 'CREDIT 70 LINEAR FEET OF TRENCHING FOR DRAINAGE', NULL, NULL, -700.00, 'sold', '2024-07-11', '2024-07-11 15:21:31'),
  (7268470, 34841717, '0009', 'Rebar and Dowel in', 'to level out bond beam', NULL, 800.00, 'sold', '2024-07-11', '2024-07-11 15:22:32'),
  (7270846, 34570205, '0002', 'Additional plant material', NULL, NULL, 1000.00, 'sold', '2024-07-12', '2024-07-12 10:13:01'),
  (7271121, 32307925, '0011', 'Step lights', '4 black step lights. Approved via text', NULL, 960.00, 'pending', '2024-07-12', '2024-07-12 10:54:15'),
  (7271247, 32422492, '0004', 'bbq', 'bbq spec''d above is with decking tile.', NULL, 17940.00, 'sold', '2024-07-12', '2024-07-12 11:11:33'),
  (7271269, 32422492, '0005', 'credits', 'credit for tile $300
credit for sod $3000
concrete design from original design $7000
half irrigation credit (irrigation is preliminary ran, electrical ran for valves ran to timer)  $1200
demo of concrete at 3.75 sq ft $2,250', NULL, -13750.00, 'sold', '2024-07-12', '2024-07-12 11:14:45'),
  (7271330, 32422492, '0006', 'new concrete design with turf strips', '950 sq ft of concrete $8,218
300 linear feet of turf strips $5,500
300 sq ft of turf under lemon $4,700
demo 7 inches below grade to prep for new concrete $3,325
600 linear feet of forming for  segmented concrete and turf strips with stakes and 2x4''s $2800', NULL, 24543.00, 'sold', '2024-07-12', '2024-07-12 11:22:46'),
  (7275371, 32462121, '0045', '(PBUILD) Credit Water Heater Contract', 'Removed moving water heater from Picture Build Scope.   Credit from contract.', NULL, -1980.00, 'pending', '2024-07-15', '2024-07-15 10:25:49'),
  (7275380, 32462121, '0046', '(PBUILD) Credit For Electrical', 'Panel work done by 360.  Credit from Contract.', NULL, -5150.00, 'pending', '2024-07-15', '2024-07-15 10:26:58'),
  (7279373, 34760103, '0004', 'Irrigation Valve for Sod', NULL, NULL, 800.00, 'sold', '2024-07-16', '2024-07-16 09:06:39'),
  (7280144, 34570205, '0004', 'Credit for down lights x5', NULL, NULL, -1125.00, 'sold', '2024-07-16', '2024-07-16 10:56:58'),
  (7280149, 34570205, '0005', 'Labor to fix existing down lights', NULL, NULL, 150.00, 'sold', '2024-07-16', '2024-07-16 10:57:38'),
  (7284107, 34171881, '0010', 'Credit for plant allowance', NULL, NULL, -750.00, 'sold', '2024-07-17', '2024-07-17 09:31:36'),
  (7284163, 34171881, '0011', '1" minus Del Rio Gravel against garage 50sqft', 'With bender board edging to separate from sod 22 linear feet', NULL, 350.00, 'pending', '2024-07-17', '2024-07-17 09:40:21'),
  (7284449, 34171881, '0012', '1075sqft permeable weed barrier for sod areas', NULL, NULL, 805.00, 'sold', '2024-07-17', '2024-07-17 10:23:12'),
  (7284456, 34171881, '0013', '15 lf of Main Line 3/4"', NULL, NULL, 390.00, 'sold', '2024-07-17', '2024-07-17 10:24:12'),
  (7284713, 35350842, '0001', 'Credit (1) 15g Tree', NULL, NULL, -150.00, 'sold', '2024-07-17', '2024-07-17 11:02:21'),
  (7286661, 32422492, '0007', 'Credit for soil', NULL, NULL, -2336.00, 'sold', '2024-07-17', '2024-07-17 16:47:45'),
  (7290441, 32422492, '0008', 'Credit for reduction of concrete', 'reduction of concrete based on jorge final measurement', NULL, -2450.00, 'sold', '2024-07-18', '2024-07-18 13:46:30'),
  (7290552, 34760103, '0005', 'Gravel', 'Upcharge for the 1/2" Jeally Bean gravel', NULL, 1000.00, 'sold', '2024-07-18', '2024-07-18 14:04:48'),
  (7291284, 33691503, '0018', 'Credit for (1) pool step', '8 linear feet + 1 light', NULL, -900.00, 'sold', '2024-07-18', '2024-07-18 18:35:37'),
  (7291298, 33691503, '0019', 'CREDIT FOR LABOR/STEPSTONES', 'FIRST PART OF COURTYARD', NULL, -3300.00, 'pending', '2024-07-18', '2024-07-18 18:50:16'),
  (7309899, 35586604, '0001', 'Adding Stabilizer to DG', NULL, NULL, 574.00, 'pending', '2024-07-25', '2024-07-25 07:27:33'),
  (7309905, 35586604, '0002', '17 feet of bender board to separate property lines', NULL, NULL, 119.00, 'pending', '2024-07-25', '2024-07-25 07:28:14'),
  (7312827, 32422492, '0009', 'CREDIT No Soils End', NULL, NULL, -3200.00, 'pending', '2024-07-25', '2024-07-25 15:38:44');

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

  RAISE NOTICE 'Batch 4 of 5 complete — Imported: %, Already-imported: %, No matching job: %',
    v_imported, v_dup, v_no_job;
END $$;

COMMIT;
