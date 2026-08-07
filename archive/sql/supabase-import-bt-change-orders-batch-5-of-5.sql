-- ============================================================
-- BT Change Orders Import — Batch 5 of 5
-- COs in this batch: 1,333 (rows 5349-6681 of 6,681)
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
  (7316091, 33691503, '0021', 'Credit for 2 Step Lights', NULL, NULL, -480.00, 'sold', '2024-07-26', '2024-07-26 13:24:27'),
  (7319612, 30365496, '0015', 'Plants to screen fence/neighbor''s view', '(10) 15 gallon Silver Sheen
Small selection of yarrow, salvia and Westringia for underplantings', NULL, 2000.00, 'sold', '2024-07-29', '2024-07-29 10:47:53'),
  (7321911, 32307925, '0012', 'Polymeric Sand', '1,799 sf X .90 cents = $1,619.00', '1,799 sf X .90 cents = $1,619.00', 1619.00, 'pending', '2024-07-29', '2024-07-29 21:37:28'),
  (7321916, 32307925, '0013', 'Wall extension in back left corner', 'CMU Wall block with CMU block cap to match existing.  7 linear feet, please match 2''-30" high', NULL, 1540.00, 'pending', '2024-07-29', '2024-07-29 21:40:42'),
  (7321919, 32307925, '0014', 'Lighting in front yard, courtyard', 'Adding 7 @ 10" wide  step lights under the wall caps in the courtyard.  The step lights for the steps will be the same.
All dark bronze', NULL, 1575.00, 'pending', '2024-07-29', '2024-07-29 21:44:31'),
  (7321929, 32307925, '0015', 'Fountain pads 3', '3 concrete pads for fountains
2 @ 15" X 28" to go in front planter
1 @ 32" X 32"  in backyard.', NULL, 375.00, 'pending', '2024-07-29', '2024-07-29 21:52:34'),
  (7321933, 32307925, '0016', 'Rustic wall block curb for front planter', 'This is to lower the grade and cover the weep joints in planter next to the house by 6".  see daily log for 7-29-2024', NULL, 0, 'pending', '2024-07-29', '2024-07-29 21:55:49'),
  (7321937, 32307925, '0017', '2 Rustic Wall block pilasters at first entry step', '2 rustic wall blocks framing entry steps.  30"-34" high  in Tuscan blend', NULL, 950.00, 'pending', '2024-07-29', '2024-07-29 21:59:09'),
  (7322459, 35482171, '0001', 'Plants', '12 acacia 5 gallon
12 carex sedge 1 gallon', NULL, 714.00, 'sold', '2024-07-30', '2024-07-30 06:35:50'),
  (7328135, 32462121, '0047', '(PBUILD) Add Underground Utility Conduit', 'Remove sod,  Trench roughly 50 feet, adjust irrigation system. 
Instal 1 inch conduit.  Recompact and relay sod.', NULL, 800.00, 'pending', '2024-07-31', '2024-07-31 09:14:41'),
  (7328159, 32462121, '0048', '(PBUILD) Kitchen Sealer', 'Kitchen stain and sealing was not in previous change orders.', NULL, 350.00, 'pending', '2024-07-31', '2024-07-31 09:19:24'),
  (7337397, 35482171, '0002', 'Change order for irrigation', '5 hours of labor at $95 per hour
$200 dollars of material
$675', NULL, 675.00, 'sold', '2024-08-02', '2024-08-02 11:44:35'),
  (7338426, 33691503, '0022', 'Credit for Stepstone Steppers', NULL, NULL, -3000.00, 'pending', '2024-08-02', '2024-08-02 16:14:46'),
  (7340101, 32462121, '0049', '(PBUILD) Paver Restoration and Sealing', '$2.50 per foot for sealing
$.75 per foot for cleaning.
Good Customer discount   $.50 per foot

Total $2.75 per foot. 
Total footage 1964

$5,401', NULL, 5401.00, 'pending', '2024-08-05', '2024-08-05 07:14:31'),
  (7340215, 32462121, '0050', '(PBUILD) Permit Requested', 'Burbank requested a permit on the Outdoor Kitchen.', NULL, 545.00, 'pending', '2024-08-05', '2024-08-05 07:36:20'),
  (7340481, 35482171, '0003', 'Design Credit', NULL, NULL, -500.00, 'pending', '2024-08-05', '2024-08-05 08:20:40'),
  (7340744, 32462121, '0051', '(PBUILD) Trash Removal', 'Reimburse credit given by 360 for Picture Build trash removal.

Price to 360 was 1500.  Price reduced to 1300 to remove profit', NULL, 1300.00, 'pending', '2024-08-05', '2024-08-05 09:00:31'),
  (7341054, 32916329, '0002', 'Change Order 2 dated 08/01/24', NULL, NULL, 2513.00, 'pending', '2024-08-05', '2024-08-05 09:51:47'),
  (7343247, 32307925, '0018', 'Main Line to Spigot next tot he Porch', NULL, NULL, 1252.00, 'pending', '2024-08-05', '2024-08-05 16:36:04'),
  (7345251, 32223073, '0006', 'Added work', NULL, NULL, 800.00, 'pending', '2024-08-06', '2024-08-06 09:23:07'),
  (7346724, 33691503, '0023', 'Retaining Wall for front driveway area', 'Total wall is approx 85 linear feet
50L x 2 1/2" tall 
23L x 18" tall
12L x 12" tall 

Wall price includes waterproofing and smooth stucco', NULL, 16100.00, 'sold', '2024-08-06', '2024-08-06 12:40:26'),
  (7346742, 33691503, '0024', 'Small Curb Wall for Driveway Area', 'Wall (curb) approx 73'' 
13'' x 16" tall
60'' x 1'' tall 

Includes smooth stucco', NULL, 5800.00, 'sold', '2024-08-06', '2024-08-06 12:42:40'),
  (7346750, 33691503, '0025', 'Paver Driveway', 'Install Palermo cobble for approx 2900sqft', NULL, 37000.00, 'sold', '2024-08-06', '2024-08-06 12:43:33'),
  (7346792, 33691503, '0026', 'Demo for driveway, existing wall and curb', 'Removing existing asphalt driveway plus soils beneath final grade, grade entire area @2900sqft
Remove existing retaining wall/footings, grade in prep for new wall @ 85 linear feet x 18" 
Remove curb hugging driveway, lower slope, grade in prep for new curb/small wall @ 73 linear feet', NULL, 13000.00, 'sold', '2024-08-06', '2024-08-06 12:48:15'),
  (7352380, 34720122, '0003', 'Add 260 lnft drains', NULL, NULL, 6500.00, 'pending', '2024-08-07', '2024-08-07 16:49:05'),
  (7352381, 34720122, '0004', 'Add 26 lights labor only', NULL, NULL, 780.00, 'pending', '2024-08-07', '2024-08-07 16:49:15'),
  (7352382, 34720122, '0005', 'Add 14 Brass Caps', NULL, NULL, 700.00, 'pending', '2024-08-07', '2024-08-07 16:49:25'),
  (7356782, 32307925, '0019', 'Weed guard in all planting areas', 'Weed guard under all kurapia and all plants. 1,350 sf x .95. (95 cents)', NULL, 1282.00, 'pending', '2024-08-08', '2024-08-08 18:14:54'),
  (7360335, 35534051, '0001', 'additional valve', 'additional irrigation valve', NULL, 500.00, 'pending', '2024-08-09', '2024-08-09 15:36:16'),
  (7360722, 34189300, '0001', 'addtional scope of work', 'misc add ons
timer
cobble for mulch', NULL, 20795.00, 'pending', '2024-08-10', '2024-08-10 11:40:28'),
  (7362151, 35260002, '0001', 'Additional demo/grading', NULL, NULL, 726.00, 'sold', '2024-08-12', '2024-08-12 07:39:46'),
  (7368201, 32307925, '0020', '5 additional step lights', '5 additional step lights', NULL, 1125.00, 'pending', '2024-08-13', '2024-08-13 11:31:56'),
  (7369666, 14013643, '0003', 'Irrigation Repair', NULL, NULL, 262.50, 'pending', '2024-08-13', '2024-08-13 14:51:49'),
  (7372381, 35259913, '0002', 'Supplemental Permits on patio structure', NULL, NULL, 273.01, 'pending', '2024-08-14', '2024-08-14 10:30:32'),
  (7372561, 35649886, '0001', '5 path lights', NULL, NULL, 1100.00, 'sold', '2024-08-14', '2024-08-14 10:56:24'),
  (7372564, 35649886, '0002', '(1) Drip Zone Irrigation (back perimeter planters)', NULL, NULL, 1050.00, 'sold', '2024-08-14', '2024-08-14 10:57:03'),
  (7372567, 35649886, '0003', '(6) 15 gallon Silver Sheen', NULL, NULL, 900.00, 'sold', '2024-08-14', '2024-08-14 10:57:30'),
  (7373414, 35586604, '0003', 'Credit for bathroom', NULL, NULL, -80.00, 'pending', '2024-08-14', '2024-08-14 12:50:39'),
  (7373907, 35649886, '0005', 'Stump Removal', '16 ficus stumps, removed and debris hauled
4  ficus stumps cut to grade, drilled and stump killed', NULL, 2400.00, 'sold', '2024-08-14', '2024-08-14 13:56:38'),
  (7374754, 32422492, '0010', '7 Path Light 1 Well light 21 lf bistro lights', NULL, NULL, 2235.00, 'sold', '2024-08-14', '2024-08-14 18:10:00'),
  (7374769, 32422492, '0011', 'Plants', '4- 5 gal creeping fig 22- gal shurbs $658
190 sq ft of decorative gravel $864', NULL, 1522.00, 'sold', '2024-08-14', '2024-08-14 18:19:22'),
  (7374773, 32422492, '0012', '170 sq turf for park way', NULL, NULL, 3060.00, 'sold', '2024-08-14', '2024-08-14 18:25:48'),
  (7378792, 33896812, '0004', 'Permit and Compliance Costs', 'Permit fees sidewalk $1200
Traffic Control $600
Admin Hours for Permits $450', NULL, 2250.00, 'pending', '2024-08-15', '2024-08-15 16:03:48'),
  (7381388, 35649886, '0006', 'Additional Gravel 50sqft', NULL, NULL, 300.00, 'sold', '2024-08-16', '2024-08-16 11:25:38'),
  (7381393, 35649886, '0007', 'Additional drip emitters for boxwood/front yard', NULL, NULL, 300.00, 'sold', '2024-08-16', '2024-08-16 11:26:13'),
  (7381405, 35649886, '0008', 'Irrigation for Silver Sheen/partial install', 'using existing line, from planter to valve, no warranty on irrigation', NULL, 300.00, 'sold', '2024-08-16', '2024-08-16 11:28:01'),
  (7381421, 35649886, '0009', 'Extension from main line to new irrigation valve', 'For back permieter planters', NULL, 200.00, 'sold', '2024-08-16', '2024-08-16 11:30:34'),
  (7385501, 35503375, '0001', 'Additional 60 sqft demo and flagstone', '15 pieces of flagstone and 60sqft of demo', NULL, 1725.00, 'pending', '2024-08-19', '2024-08-19 10:39:49'),
  (7385504, 35503375, '0002', '3 additional lights', NULL, NULL, 660.00, 'pending', '2024-08-19', '2024-08-19 10:40:04'),
  (7385509, 35503375, '0003', '20 LF drainage', NULL, NULL, 460.00, 'pending', '2024-08-19', '2024-08-19 10:40:24'),
  (7385512, 35503375, '0004', '42 LF metal edger', NULL, NULL, 500.00, 'pending', '2024-08-19', '2024-08-19 10:40:53'),
  (7385518, 35503375, '0005', 'Credit transformer', NULL, NULL, -435.00, 'pending', '2024-08-19', '2024-08-19 10:41:30'),
  (7385525, 35503375, '0006', 'Credit gopher mesh', NULL, NULL, -400.00, 'pending', '2024-08-19', '2024-08-19 10:42:35'),
  (7390286, 31248085, '0030', 'Added Work', '1) Install 3 new irrigation zones for lawn area.     $3,300 
2) Run new wiring to equipment (difficult install). $450                                         
3) Till and grade soils for Sod, amend and compact 1600 sq feet.  $4170
4) Install 1600 sq feet of St Augustine (St Augustine is a premium sod).  $3780
5) 180 sq feet of Belgard Victorin paver stepper in lawn area.  Includes 7 inches of demolition, 3 inches of base, one inch of sand.  Mix concrete and concrete wet lay all out edge paving. $5,875
6) Remove soils and grade Install 72 sq feet of DG. $475
7) Install chicken coop and cage foundation work.  Includes 72 linear feet of block set on concrete footings with rebar and grout lift cells.  218 sq feet of gopher mesh.  115 cubic feet of 3/4 limestone gravel. 48 cubic feet of soils compacted.   $6,460', NULL, 24510.00, 'pending', '2024-08-20', '2024-08-20 11:17:36'),
  (7391873, 31930909, '0007', 'Podocarpus Installation', 'Replacing a 15 gallon Podocarpus
We will flush the lines and do an irrigation inspection as a courtesy after the installation is complete.', NULL, 180.00, 'sold', '2024-08-20', '2024-08-20 15:07:10'),
  (7392211, 35503375, '0007', 'Credit for 1 zone drip irrigation', NULL, NULL, -600.00, 'pending', '2024-08-20', '2024-08-20 16:53:14'),
  (7394309, 30365496, '0016', 'Brickwork Sealing', NULL, NULL, 700.00, 'pending', '2024-08-21', '2024-08-21 09:37:06'),
  (7397002, 34841717, '0011', 'Bedrosian Celine Tile for waterline pool/spa', '133sqft of tile', NULL, 1650.00, 'sold', '2024-08-21', '2024-08-21 17:44:33'),
  (7399163, 31736833, '0002', '1. Masonry and Landscape', 'Deck
Dig footings for approx. 52 LF of deck sub wall
Pour 24” x 12” concrete footings
Install #4 rebar in footing
Install #4 vertical rebar at 16” on center
Pour 3000 PSI concrete footing
Wet lay first course of 8x8x16 CMU block
Install additional courses per plan up to 12” HT.
Install approx. 210 SF of Trex ‘Transcend’ composite decking per plan (Color: ‘Havana Gold’)
COST $13,225

Gravel - Rear Yard
Remove an average of 8” of soil over approx. 400 SF
Lay weed barrier fabric
Install approx. 560 SF of ?” Del Rio gravel per plan
Install approx. 110 LF of black metal edging per plan
COST $6,795

Complete Wall
Layout retaining wall per plan, approx. 15 LF x 36” HT.
Use existing concrete footing for wall
Install #4 horizontal rebar for mid & top bond beam block
Fill/grout cells
Install perforated drain behind walls and connect to drain system
COST $1,749

Stem Wall
Layout stem wall per plan, approx. 16 LF x 18” HT.
Excavate for and pour concrete footing for stem wall
Install #4 rebar in footing
Install #4 vertical rebar at 16” on center
Pour 3000 PSI concrete footing
Wet lay first course of 8x8x16 CMU block
Install additional courses per plan up to 18” HT.
No wall finish included
COST $1,150

Softscape & Irrigation
Soil prep approx. 700 SF of planter area with 1" compost tilled to 6" deep
Install (3) zones drip line or drip emitter zones
Install (3) rainbird anti-siphon valves with drip filter & regulator
Connect valves to existing controller
Install 733 SF of shredded bark mulch, approx. 3" thick (no weed barrier included)
Install (2 qty.) ‘Angelus’ brand Paseo II 24x24 steppers
Install the following plant sizes/quantities:
(4) 15 GAL trees
(98) 5 gal shrubs
(25) 1 gal shrubs
(10) dirt flats
Includes plant monitoring for 30 days after installation
COST $11,894

Job Total $79,810', NULL, 79810.00, 'pending', '2024-08-22', '2024-08-22 10:07:03'),
  (7401517, 33896812, '0005', 'Bubbler Zone (3 total, not 2)', NULL, NULL, 1312.50, 'pending', '2024-08-22', '2024-08-22 18:02:03'),
  (7401526, 35157995, '0002', 'Repair for block wall side beyond gate', NULL, NULL, 2100.00, 'pending', '2024-08-22', '2024-08-22 18:12:32'),
  (7404425, 32307925, '0021', 'Gopher Baskets 12', '12 5 gallon gopher baskets @ $22.00 each', NULL, 264.00, 'pending', '2024-08-23', '2024-08-23 12:38:33'),
  (7409186, 32307925, '0022', 'Gopher  Mesh', '839 sf gopher ness x $2.00', NULL, 1678.00, 'pending', '2024-08-26', '2024-08-26 13:06:58'),
  (7409195, 32307925, '0023', '20 additional 5 gal baskets', '20 more 5 gal for wax leafs in back of gate. Approved verbally to Jesus', NULL, 440.00, 'pending', '2024-08-26', '2024-08-26 13:08:02'),
  (7409243, 32307925, '0024', 'Delivery #2 additional plants difference', 'Additional plants over the original budget', NULL, 1293.00, 'pending', '2024-08-26', '2024-08-26 13:15:04'),
  (7409312, 32307925, '0025', 'Delivery #3', '1. 2  Flats of Dianthus. @ $75.00.  $150.002. 12 1 gallon salvias. @ $21.50.   $258.003. 8 5 gallon gardenias @ $43.50. $348.004. 2  5 gal Fox tail agave @ $43.50. $87.005. 2 15 gallon secco @ $150.00. $300.00Total: $1,143.00', NULL, 1143.00, 'pending', '2024-08-26', '2024-08-26 13:23:52'),
  (7409787, 32307925, '0026', 'Additional baskets', '30 baskets for hillside lavender and gardenias $22.00 = $660.00', NULL, 660.00, 'pending', '2024-08-26', '2024-08-26 14:48:02'),
  (7409873, 34841717, '0013', 'Demo and Prep for tile on spa infinity', NULL, NULL, 500.00, 'sold', '2024-08-26', '2024-08-26 15:09:25'),
  (7410398, 32307925, '0027', 'Delivery #4 Plants', 'This is the list Tammy ordered today:
The planting is looking amazing!
Today''s additional plants to be delivered 8/27/2024:This should complete the landscaping in plants.  If you find that you want a few more during the next month where we will be having our weekly yard checks, then I can add them for you.
1.  4 @ 5 gallon Gardenias X $43.50= $174.00  (On slope)
2.  10 @ 5 gallon Lavenders X $43.50= $435.00 (On slope and 4 for the front side on driveway)
3.  1 @ 5 gallon White Iceberg X $43.50=$43.50 ( for front right side of patio)
4.  4 pink iceberg X $43.50= $174.00 (side of driveway to match the other side)
2.  2 @  15 gallon secco X $150.00= $300.00  (front columns)
TOTAL: $1,126.50

Please approve, thank you!!', NULL, 1126.50, 'pending', '2024-08-26', '2024-08-26 18:29:21'),
  (7410430, 32307925, '0028', 'Additional Lights for front, side, back', 'There are 3 Lights in your contract
Plus 16 in change orders
Total already charged 19
Installed 6 step lights in steps
Installed/will install 8 step lights in patio
Will install 4 wash lights in front
Will install 1 uplight in front of Strawberry Tree
19 placed

Contracted, need to order:
3 more step lights 10" BZ ( in patio)
1 more wall wash light, Wall Liter FL116B 3,000kBZ 4W (front of patio)
1 uplight big smokey 60 degrees BZ 3,000k 4W (On other side of Driveway for strawberry tree)

New Lights Needed
2 inground lights for Columns front  (Flat Top in BZ (MR 16 ) to confirm with Jeff at lightcraft
2 inground light for bench planters in the back (Flat Top in BZ (MR 16)
2 wall wash lights for Tammy''s garden
3 wall wash lights for side with slope planter
3 uplights for columns
3 uplights for 3 trees in the back
Total 15 lights X $225.00= $3,375.00', NULL, 3375.00, 'pending', '2024-08-26', '2024-08-26 18:55:22'),
  (7414186, 32307925, '0029', 'Rock', '220 sf of cal gold -1" x $3.50=  $770.00', NULL, 770.00, 'pending', '2024-08-27', '2024-08-27 13:34:39'),
  (7418230, 33691503, '0027', 'Additional curb 21LF', NULL, NULL, 1800.00, 'sold', '2024-08-28', '2024-08-28 12:06:19'),
  (7418424, 34841717, '0014', 'Additional stucco 36x6', NULL, NULL, 2200.00, 'sold', '2024-08-28', '2024-08-28 12:32:35'),
  (7420656, 34841717, '0015', 'Pool crack repair', NULL, NULL, 2000.00, 'sold', '2024-08-29', '2024-08-29 06:48:22'),
  (7422811, 35260002, '0002', 'Ref Credit', NULL, NULL, -250.00, 'pending', '2024-08-29', '2024-08-29 11:50:38'),
  (7422935, 35280886, '0001', 'Additional bond beam', NULL, NULL, 2484.00, 'pending', '2024-08-29', '2024-08-29 12:09:30'),
  (7424179, 34720122, '0006', 'Add 16 more lights labor only', NULL, NULL, 480.00, 'pending', '2024-08-29', '2024-08-29 16:58:35'),
  (7424182, 34720122, '0007', 'Planting', '1gal
			119
			21.5
			2558.5
		
		
			5gal
			77
			43.5
			3349.5
		
		
			15gal
			1
			125
			125
		
		
			 
			 
			 
			6033', NULL, 6033.00, 'pending', '2024-08-29', '2024-08-29 16:59:04'),
  (7424184, 34720122, '0008', 'Sealing', 'Sealing
3650 sqft * 1.4 = $5110', NULL, 5110.00, 'pending', '2024-08-29', '2024-08-29 17:01:01'),
  (7424207, 34720122, '0009', 'Repairing front window shelf stucco', NULL, NULL, 250.00, 'pending', '2024-08-29', '2024-08-29 17:16:41'),
  (7425256, 35606551, '0001', 'Move Electrical for spa 25 LF', 'Move existing electrical for spa labor.
 25 LF 1/2 conduit w/wire', NULL, 500.00, 'sold', '2024-08-30', '2024-08-30 07:48:36'),
  (7425261, 35606551, '0002', 'Move water main and reconnect spa auto-fill', 'moving main line and re running new mainline to reconnect to autofill', NULL, 350.00, 'sold', '2024-08-30', '2024-08-30 07:49:19'),
  (7425278, 35606551, '0003', 'Waterproof for tile', NULL, NULL, 600.00, 'sold', '2024-08-30', '2024-08-30 07:51:47'),
  (7425315, 35157995, '0003', 'Rachio smart timer', NULL, NULL, 435.00, 'sold', '2024-08-30', '2024-08-30 07:57:27'),
  (7425758, 26949840, '0060', 'OUTDOOR SHOWER PLUMBING (DOESN''T INCL FIXTURE)', 'Includes plumbing/steel work (plus 2 gate cylinders) 
Fixtures not included (tbd)', NULL, 4710.00, 'sold', '2024-08-30', '2024-08-30 09:18:02'),
  (7425770, 34841717, '0016', 'Back Slope Cleanup/Tree Removal', 'Demo backslope in prep for new plants ($2700)
Remove 2 medium sized trees ($1600)', NULL, 4300.00, 'pending', '2024-08-30', '2024-08-30 09:20:06'),
  (7426143, 33691503, '0028', '35 linear feet of copper water main line', NULL, NULL, 1600.00, 'sold', '2024-08-30', '2024-08-30 10:21:34'),
  (7426789, 35503375, '0008', 'Credit 2 for irrigation', NULL, NULL, -50.00, 'pending', '2024-08-30', '2024-08-30 12:23:20'),
  (7430689, 35942575, '0001', 'Additional pavers 330 sq feet', 'Additional pavers 330 sq feet
additional demo 330 sq ft', NULL, 4950.00, 'pending', '2024-09-03', '2024-09-03 09:52:59'),
  (7431348, 33075936, '0001', 'CO 2 Excavation and Install Cobble Paving', NULL, NULL, 34480.80, 'pending', '2024-09-03', '2024-09-03 11:35:25'),
  (7431832, 35503375, '0010', 'Add''l plants/irrigation', '25 5 gallon plants @ $1100
1 zone drip @$1050
plant placement @$200', NULL, 2350.00, 'sold', '2024-09-03', '2024-09-03 12:45:23'),
  (7432400, 34841717, '0017', 'Bistro Lights', '160 feet of bistro lights plus 2 poles/hardware', NULL, 2500.00, 'pending', '2024-09-03', '2024-09-03 14:08:06'),
  (7434885, 34841717, '0018', 'Micro Fusion Plaster Upgrade', NULL, NULL, 6100.00, 'sold', '2024-09-04', '2024-09-04 09:00:30'),
  (7435402, 26949840, '0062', 'Fireglass install for pool firepit', NULL, NULL, 900.00, 'sold', '2024-09-04', '2024-09-04 10:20:26'),
  (7435762, 35606551, '0004', 'additional tile for bbq backsplash', 'tile work for bbq backsplash. Owner provided tile', NULL, 300.00, 'sold', '2024-09-04', '2024-09-04 11:11:45'),
  (7437909, 33691503, '0029', '100 linear feet of 1" conduit for future gate', NULL, NULL, 3500.00, 'sold', '2024-09-04', '2024-09-04 18:38:21'),
  (7442257, 33896812, '0006', 'CO added flagstone', NULL, NULL, 1980.00, 'pending', '2024-09-05', '2024-09-05 16:25:44'),
  (7445749, 35157995, '0004', 'CREDIT - Front Irrigation', NULL, NULL, -1800.00, 'pending', '2024-09-06', '2024-09-06 13:52:49'),
  (7445754, 35157995, '0005', 'ADD 2 lights, upgrad to tree mount lights', NULL, NULL, 600.00, 'pending', '2024-09-06', '2024-09-06 13:53:33'),
  (7453378, 35942318, '0001', '40 lf drain line 3 inlets', NULL, NULL, 1140.00, 'sold', '2024-09-10', '2024-09-10 09:34:38'),
  (7453383, 35942318, '0002', '16 lf concrete steps', '16 lf concrete steps', NULL, 1200.00, 'pending', '2024-09-10', '2024-09-10 09:35:00'),
  (7459350, 34189300, '0002', 'CO 9/6/24', 'Credit for Irrigation and Planter change, and add for new Synthetic turf and 40lf of benderboard CO dated 9/6/2024', NULL, 420.00, 'pending', '2024-09-11', '2024-09-11 12:05:29'),
  (7467537, 32638422, '0002', 'Additional 117 LF @ 2'' feet high', 'Price includes sand stucco for front side and waterproofing for back side, weep holes for drainage', NULL, 20300.00, 'pending', '2024-09-13', '2024-09-13 10:59:39'),
  (7472473, 26949840, '0063', '2 Additional gate pistons', NULL, NULL, 1200.00, 'sold', '2024-09-16', '2024-09-16 11:54:21'),
  (7477917, 32916329, '0003', 'Variance', NULL, NULL, 50.00, 'pending', '2024-09-17', '2024-09-17 13:03:49'),
  (7479919, 26949840, '0064', 'Shower fixture', NULL, NULL, 266.00, 'sold', '2024-09-18', '2024-09-18 06:38:29'),
  (7485664, 33577562, '0009', 'Timer Wiring 09.12.24', 'Change order

Spoke to lawerence let him know Timer wires were ripped out. I told him it would be 90 per hour, including drive time he gave me verbal authorization. Repaired and tested every valve. I also had a guy go into shed while I was getting tools from truck kicked him out. Please draft up change or for 3 hours @$90.00 per hour', NULL, 270.00, 'pending', '2024-09-19', '2024-09-19 09:08:47'),
  (7486188, 34202401, '0001', '28 ''x 12" tall CMU wall for right side of drive', 'includes brown coat', NULL, 2700.00, 'pending', '2024-09-19', '2024-09-19 10:28:20'),
  (7486189, 34202401, '0002', '2 steps plus paver landings', '8 linear of paver steps plus 16sqft of paver landing and demo', NULL, 900.00, 'pending', '2024-09-19', '2024-09-19 10:28:37'),
  (7486193, 34202401, '0003', 'REMOVE 1 JUNIPER', NULL, NULL, 500.00, 'pending', '2024-09-19', '2024-09-19 10:28:58'),
  (7493388, 34202401, '0004', '15 LF. Main line/ fix main line', NULL, NULL, 1000.00, 'pending', '2024-09-23', '2024-09-23 07:21:39'),
  (7496637, 33075936, '0003', 'CO 3_Reclaimed Main-Line Ext', NULL, NULL, 1871.23, 'pending', '2024-09-23', '2024-09-23 16:06:18'),
  (7496642, 33075936, '0004', 'CO 4_Paver Improv at City Hall', NULL, NULL, 62104.23, 'pending', '2024-09-23', '2024-09-23 16:09:05'),
  (7496723, 33691503, '0030', 'Asphalt redo( bottom of driveway)', '170sqft', NULL, 4250.00, 'sold', '2024-09-23', '2024-09-23 16:42:56'),
  (7496726, 33691503, '0031', 'Natural look paver sealer', NULL, NULL, 3625.00, 'pending', '2024-09-23', '2024-09-23 16:44:21'),
  (7496730, 33691503, '0032', 'Polymeric sand joint fill', NULL, NULL, 7395.00, 'sold', '2024-09-23', '2024-09-23 16:44:45'),
  (7497070, 33691503, '0033', 'Additional pavers/demo for additional pavers', '+ 300sqft', NULL, 5025.00, 'sold', '2024-09-23', '2024-09-23 19:25:31'),
  (7497072, 33691503, '0034', 'Polymeric Sand for additional 300sqft Pavers', NULL, NULL, 495.00, 'sold', '2024-09-23', '2024-09-23 19:28:05'),
  (7499839, 34841717, '0019', 'Additional Plants', '(1) 15G Olive 
(3) 5G Leucadendron
(2) 5G Aeonium sunburst 
(1) 5G Golden Breath of Heaven
(2) 5G Little Ollie Olives
(3) 1G Lavender dentata
(7) 1G Salvia Greggii 
(3) 1G Westringia Morning Light', NULL, 900.00, 'pending', '2024-09-24', '2024-09-24 11:21:48'),
  (7499842, 34841717, '0020', 'California Lilac for slope above turf', '(15) 5G', NULL, 675.00, 'pending', '2024-09-24', '2024-09-24 11:22:47'),
  (7501733, 33691503, '0035', '(4) 15 gallon Ficus', NULL, NULL, 600.00, 'sold', '2024-09-24', '2024-09-24 17:48:35'),
  (7501734, 33691503, '0036', 'Gravel for bottom of slope', NULL, NULL, 0, 'pending', '2024-09-24', '2024-09-24 17:48:48'),
  (7501736, 33691503, '0037', 'Wire for Conduit for Gate', NULL, NULL, 300.00, 'sold', '2024-09-24', '2024-09-24 17:49:53'),
  (7503347, 35649886, '0010', 'Electrical for bbq', '10 linear feet', NULL, 400.00, 'pending', '2024-09-25', '2024-09-25 08:16:31'),
  (7506218, 34841717, '0021', '2x2 steppers for front pathways', NULL, NULL, 500.00, 'pending', '2024-09-25', '2024-09-25 16:39:47'),
  (7506230, 33691503, '0038', 'Del Rio Gravel for bottom of slope', 'Demo soils and prep areas, grade lightly, haul additional soil
approx 70''x3'' to create curb appeal in front of ficus', NULL, 1400.00, 'sold', '2024-09-25', '2024-09-25 16:47:17'),
  (7508898, 35942318, '0003', 'backfill to raise patio grade backyard', 'backfilling to raise grade in backyard patio', NULL, 3100.00, 'pending', '2024-09-26', '2024-09-26 11:11:04'),
  (7510132, 34202401, '0005', '16 linear feet paver soldier course', 'left side of driveway', NULL, 350.00, 'pending', '2024-09-26', '2024-09-26 14:31:21'),
  (7510135, 34202401, '0006', '2 outlets', NULL, NULL, 200.00, 'pending', '2024-09-26', '2024-09-26 14:32:02'),
  (7510141, 34202401, '0007', 'New Irrigation timer', NULL, NULL, 435.00, 'pending', '2024-09-26', '2024-09-26 14:32:35'),
  (7510164, 34202401, '0008', 'Additional Plants', '(12 5 gallons in contract)
Added:
(30) 1 gallon', NULL, 750.00, 'pending', '2024-09-26', '2024-09-26 14:36:46'),
  (7510232, 34202401, '0009', '(3) additional 2x2'' steppers', NULL, NULL, 150.00, 'pending', '2024-09-26', '2024-09-26 14:50:13'),
  (7510462, 31736833, '0003', '2. Fence wood & chain link', 'Wood Fencing
Layout horizontal redwood fencing per plan, approx. 79 LF x 6’ HT.
Set 4x4 posts in concrete footings
Install 2x2 vertical slats with 2” gaps
Install 2x4 horizontal supports
Includes (2 qty.) 3’ wide matching gates per plan
Paint color TBD
COST $10,908
Chain Link Fencing
Layout chain link fencing per plan, approx. 203 LF x 6’ HT.
Set posts in concrete footings
Install standard detail chain link fencing at $50 per linear foot
COST $10,150

Total Cost $22,532.00 - Finance Price OAC
Total Cost $21,058.00 - Cash/Check Price', NULL, 21058.00, 'pending', '2024-09-26', '2024-09-26 16:08:59'),
  (7510598, 35942318, '0004', 'Additional  misc work', 'Additional forming for segmented concrete with additional concrete pad', NULL, 450.00, 'sold', '2024-09-26', '2024-09-26 17:27:35'),
  (7512186, 35259913, '0003', 'Change Order #3 Fire Pit', NULL, NULL, 4700.00, 'pending', '2024-09-27', '2024-09-27 09:29:58'),
  (7512202, 35259913, '0004', 'Change Order #1', NULL, NULL, 81500.00, 'pending', '2024-09-27', '2024-09-27 09:32:42'),
  (7512210, 35259913, '0005', 'Change order#2', NULL, NULL, 4550.00, 'pending', '2024-09-27', '2024-09-27 09:33:38'),
  (7512617, 36168526, '0001', 'Additional Sod for Parkway', NULL, NULL, 1250.00, 'pending', '2024-09-27', '2024-09-27 10:43:02'),
  (7512620, 36168526, '0002', '(8)  5 gallon Shrubs', 'Westringia ''Grey Box''
5 gallons', NULL, 345.00, 'pending', '2024-09-27', '2024-09-27 10:43:50'),
  (7512760, 35776830, '0001', 'Permit (1st half of install) plus permit run cost', '$1100 permit
$1500 permit run', NULL, 2600.00, 'pending', '2024-09-27', '2024-09-27 11:09:40'),
  (7517437, 32307925, '0030', 'Permits', NULL, NULL, 648.61, 'pending', '2024-09-30', '2024-09-30 11:52:57'),
  (7517450, 32307925, '0031', 'Additional Plants 9-30-2024', 'Plants:
15 1 Gallon Lantanas Radiant $21.50 each for back planters $322.50
15 1 Gallon Salvias $21.50 each for back planters $322.50
2 5 gallon Fig Ivy (the 3 previously in C/O already) $42.50 $85.00

Total: $730.00', NULL, 730.00, 'pending', '2024-09-30', '2024-09-30 11:55:08'),
  (7518257, 33691503, '0039', '16 Wall Mounted Lights', 'Driveway Walls (both sides)
(1) transformer', NULL, 3625.00, 'sold', '2024-09-30', '2024-09-30 13:49:41'),
  (7521206, 13448673, '0014', 'Light Repair', NULL, NULL, 0, 'pending', '2024-10-01', '2024-10-01 10:11:22'),
  (7521324, 30365496, '0017', 'Autofill installation', NULL, NULL, 350.00, 'pending', '2024-10-01', '2024-10-01 10:27:02'),
  (7523372, 35280230, '0001', 'Apron', 'driveway apron 11 lf', NULL, 3600.00, 'pending', '2024-10-01', '2024-10-01 15:38:32'),
  (7526094, 32307925, '0032', 'Final Uplights 7 more', '4 Lightcraft FLAT TOP IG 63 06B 3.5 W 
3 lIGHTCRAFT BIG SMOKEY FL 105B 3.5 W
These are the only ones that need to be charged.  See Daily log on Lighting', NULL, 1575.00, 'pending', '2024-10-02', '2024-10-02 10:52:28'),
  (7527467, 14584341, '0005', 'Paver Repair and new area', 'Installed new paver area with one step in side yard by water heater and ac unit. $1800
Repaired 15 sqft of pavers that were damaged and added new polysand $200', NULL, 2000.00, 'pending', '2024-10-02', '2024-10-02 13:59:34'),
  (7527767, 34189300, '0003', 'CO 1 - reuse blackflow', NULL, NULL, -1150.00, 'pending', '2024-10-02', '2024-10-02 14:59:43'),
  (7528034, 36056404, '0001', '(4) 5 Gallon Plants', '(3) 5 gallon Gaura ‘Whirling Butterflies’
(1) 1 gallon Blue Agave', NULL, 172.00, 'sold', '2024-10-02', '2024-10-02 16:11:58'),
  (7536269, 36567353, '0001', 'Credit for Design', NULL, NULL, -750.00, 'pending', '2024-10-04', '2024-10-04 17:38:15'),
  (7536276, 36567353, '0002', 'CC fee', NULL, NULL, 250.50, 'pending', '2024-10-04', '2024-10-04 17:52:03'),
  (7539223, 36656916, '0001', 'Credit for reduced Ficus. Add planting of Cypress', NULL, NULL, -1150.00, 'sold', '2024-10-07', '2024-10-07 11:20:17'),
  (7542225, 33691503, '0040', '20 5G Ceanothus for Slopes', NULL, NULL, 800.00, 'sold', '2024-10-08', '2024-10-08 08:11:17'),
  (7542824, 36199414, '0001', '20 feet of Main Line', NULL, NULL, 600.00, 'pending', '2024-10-08', '2024-10-08 09:32:17'),
  (7543055, 36199414, '0002', 'Bistro Lights 135 feet', 'Plus (1) transformer 
Hooks for install', NULL, 2035.00, 'pending', '2024-10-08', '2024-10-08 10:07:40'),
  (7543152, 36199414, '0003', '3 up lights and 1 transformers', NULL, NULL, 1095.00, 'pending', '2024-10-08', '2024-10-08 10:22:29'),
  (7543178, 36199414, '0004', 'Credit for 20 feet main line', NULL, NULL, -600.00, 'pending', '2024-10-08', '2024-10-08 10:26:00'),
  (7543300, 33691503, '0041', 'CREDITS bench/internet', NULL, NULL, -554.65, 'pending', '2024-10-08', '2024-10-08 10:42:53'),
  (7543401, 36479250, '0001', '8 sqft of pavers includes additional demo', NULL, NULL, 135.00, 'pending', '2024-10-08', '2024-10-08 10:56:11'),
  (7547025, 34202401, '0010', 'Smart timer', 'Swap installed timer to smart timer', 'Client wanted smart timer', 140.00, 'sold', '2024-10-09', '2024-10-09 09:26:48'),
  (7547936, 36479250, '0002', 'Additional sod +234 sqft', NULL, NULL, 1000.00, 'pending', '2024-10-09', '2024-10-09 11:49:11'),
  (7549291, 35775748, '0001', 'Permit Fees at cost', NULL, NULL, 381.00, 'pending', '2024-10-09', '2024-10-09 15:34:54'),
  (7549361, 36199414, '0005', 'Additional Plants', '(13) 1 gall plants
(2) 15 gall Standard Olive Wilsonii', NULL, 600.00, 'pending', '2024-10-09', '2024-10-09 15:54:06'),
  (7549509, 32638422, '0003', '24 linear feet of Seat Wall at 18" tall', 'Seated wall that goes across back of pool area
24 linear feet x 18" height
Sanded Stucco both sides of wall
Bellecrete concrete wall cap', NULL, 4300.00, 'pending', '2024-10-09', '2024-10-09 16:54:03'),
  (7550053, 36656916, '0002', 'Adjustment to previous credit', 'Adjustment', NULL, -50.00, 'sold', '2024-10-10', '2024-10-10 04:34:26'),
  (7550512, 35649886, '0011', 'Adding gravel', 'Adding one inch of 3/4 del rio over the top of existing gravel.', NULL, 580.00, 'sold', '2024-10-10', '2024-10-10 07:14:10'),
  (7553424, 35776830, '0002', 'Additional irrigation valve for turf', NULL, NULL, 950.00, 'pending', '2024-10-10', '2024-10-10 16:23:55'),
  (7553523, 35775748, '0002', 'Covenant recording fee', 'I dont have the original reciept but I have attached the credit card payment.', NULL, 51.75, 'pending', '2024-10-10', '2024-10-10 17:23:56'),
  (7554835, 36656916, '0003', 'Credit for 1- 15 gal ficus', NULL, NULL, -160.00, 'sold', '2024-10-11', '2024-10-11 08:49:04'),
  (7554837, 36656916, '0004', 'Five 10 foot stakes', NULL, NULL, 68.00, 'sold', '2024-10-11', '2024-10-11 08:49:31'),
  (7555418, 26949840, '0065', 'Screen Door Credit', NULL, NULL, -500.00, 'pending', '2024-10-11', '2024-10-11 10:37:30'),
  (7559134, 36168526, '0003', 'Root grinding for old Pine Tree', NULL, NULL, 700.00, 'pending', '2024-10-14', '2024-10-14 09:34:45'),
  (7574015, 32307925, '0033', '5 plants', '5 5 gallon Cape Honeysuckle for the backyard columns', NULL, 217.50, 'pending', '2024-10-17', '2024-10-17 13:54:12'),
  (7574307, 27651875, '0007', 'Pressure Regulation work', NULL, NULL, 500.00, 'pending', '2024-10-17', '2024-10-17 14:45:24'),
  (7574574, 35776830, '0003', 'Credit for 19 linear feet of Garden Wall', NULL, NULL, -6175.00, 'sold', '2024-10-17', '2024-10-17 16:15:16'),
  (7574577, 35776830, '0004', 'Flagstone in place of one section of Garden Wall', 'Approx 60sqft', NULL, 3000.00, 'sold', '2024-10-17', '2024-10-17 16:16:55'),
  (7574593, 36590620, '0001', 'Credit for Plants not used on East Side Planter', NULL, NULL, -240.00, 'sold', '2024-10-17', '2024-10-17 16:25:31'),
  (7574595, 36590620, '0002', 'Additional Demo Front Yard', NULL, NULL, 360.00, 'sold', '2024-10-17', '2024-10-17 16:25:51'),
  (7574598, 36590620, '0003', 'Additional DG', NULL, NULL, 70.00, 'sold', '2024-10-17', '2024-10-17 16:26:10'),
  (7574599, 36590620, '0004', 'Thicker BB for Backyard', NULL, NULL, 0, 'pending', '2024-10-17', '2024-10-17 16:26:30'),
  (7576737, 31736833, '0004', '3. Concrete Pad (all 3. COs in this file)', '1. Subcontractor shall provide a 30” x 30” concrete pad for the water heater at the ADU. The location of the pad will be determined in the field. The concrete pad shall be placed at the same time as the sidewalk concrete. $100.00', '30"x30" x47" water heater concrete pad', 100.00, 'pending', '2024-10-18', '2024-10-18 10:46:11'),
  (7577995, 28581838, '0028', 'CREDIT - Referrals (do not sign)', NULL, NULL, -1076.80, 'pending', '2024-10-18', '2024-10-18 15:30:05'),
  (7578067, 35942318, '0005', 'Fencing', 'Upgrade is for a top cap fence', NULL, 1139.00, 'sold', '2024-10-18', '2024-10-18 16:31:43'),
  (7579591, 36532874, '0001', 'Additional drainage 45 Lf 6 drain inlets', NULL, NULL, 1280.00, 'sold', '2024-10-21', '2024-10-21 06:51:25'),
  (7579593, 36532874, '0002', 'Additional 270 sq pavers', NULL, NULL, 4590.00, 'sold', '2024-10-21', '2024-10-21 06:51:44'),
  (7579598, 36532874, '0003', 'Credits 2 valves', 'removal of 2 drip irrigation zones', NULL, -2400.00, 'sold', '2024-10-21', '2024-10-21 06:52:19'),
  (7580484, 36611100, '0001', 'Additional pavers', 'Additional pavers', NULL, 3700.00, 'pending', '2024-10-21', '2024-10-21 09:12:54'),
  (7582373, 36532874, '0004', '110 lf bend a board', '110lf benderboard', NULL, 770.00, 'sold', '2024-10-21', '2024-10-21 13:45:29'),
  (7585011, 36642587, '0001', '20’ main line for hose bib', NULL, NULL, 400.00, 'pending', '2024-10-22', '2024-10-22 09:19:51'),
  (7585201, 36642587, '0002', 'Mailbox Install', NULL, NULL, 500.00, 'pending', '2024-10-22', '2024-10-22 09:45:40'),
  (7586303, 31736833, '0005', '3. Wall Modification', '5. Subcontractor shall provide additional courses of CMU block per field direction at the northeast and southeast corners of the Duplex and at the entry of the ADU. An area drain shall be added at the northeast corner of the Duplex and tied into the storm drain system. $2,460.00', '5. Subcontractor shall provide additional courses of CMU
block per field direction at the northeast and
southeast corners of the Duplex and at the entry of
the ADU. An area drain shall be added at the northeast
corner of the Duplex and tied into the storm drain
system. $2,460.00 2 COURSE BY 25'' LONG', 2460.00, 'pending', '2024-10-22', '2024-10-22 12:06:27'),
  (7586792, 35220019, '0001', '5 additional lights', NULL, NULL, 1100.00, 'pending', '2024-10-22', '2024-10-22 13:08:26'),
  (7590961, 36642587, '0003', 'Additional Main line for hose bib (planter boxes)', NULL, NULL, 60.00, 'pending', '2024-10-23', '2024-10-23 11:33:37'),
  (7590969, 36642587, '0004', 'Moving Irrigation Manifold 18"', NULL, NULL, 150.00, 'pending', '2024-10-23', '2024-10-23 11:34:06'),
  (7590972, 36642587, '0005', 'Lighting', '8 path lights from Vista
5 wall washers 
1 transformer', NULL, 3295.00, 'pending', '2024-10-23', '2024-10-23 11:34:22'),
  (7591002, 36532874, '0005', 'Redoing pavers in front yard 250 Sq ft', 'Redoing pavers in front to a different color', NULL, 4500.00, 'pending', '2024-10-23', '2024-10-23 11:38:27'),
  (7592351, 35259913, '0006', 'CO#4 - Retaining wall around BBQ area', NULL, NULL, 9000.00, 'pending', '2024-10-23', '2024-10-23 15:02:45'),
  (7592354, 35259913, '0007', 'CO#5 Spa light & Tile upgrade', NULL, NULL, 1889.00, 'pending', '2024-10-23', '2024-10-23 15:03:30'),
  (7592496, 30524037, '0009', 'Additional plants', NULL, NULL, 2805.00, 'pending', '2024-10-23', '2024-10-23 15:38:08'),
  (7595916, 34456359, '0005', '5 additional plants', '4 5 gallon privet 
1 5 gallon Jasmine 
Irrigation to all new plants', NULL, 290.00, 'sold', '2024-10-24', '2024-10-24 12:18:53'),
  (7597272, 36532874, '0006', 'Credit for pavers', 'Adding soul for pot
Adding new boarder and dump fees for removed paver
Credit for paver overage', NULL, -400.00, 'pending', '2024-10-24', '2024-10-24 17:19:47'),
  (7597277, 35942318, '0006', 'Change order for permit fees and handling frm city', 'Permit fees $909.09 and admin paperwork ($250)', NULL, 1159.09, 'sold', '2024-10-24', '2024-10-24 17:23:11'),
  (7599681, 36909985, '0001', '45sqft concrete', NULL, NULL, 900.00, 'pending', '2024-10-25', '2024-10-25 11:28:34'),
  (7599747, 36909985, '0002', '20 linear feet of drainage plus(6) inlets', NULL, NULL, 870.00, 'pending', '2024-10-25', '2024-10-25 11:37:21'),
  (7599759, 36909985, '0003', 'Paver fix by gate', 'Pick up existing pavers in front of gate - reinstall sub base and pavers', NULL, 700.00, 'pending', '2024-10-25', '2024-10-25 11:38:38'),
  (7603678, 36056404, '0002', 'Gorilla Hair Mulch for upper terrace', NULL, NULL, 1500.00, 'pending', '2024-10-28', '2024-10-28 10:26:27'),
  (7605695, 26949840, '0067', 'Transformer swap to smart', 'Change 2 transformers in the front yard to the smart transformers.', NULL, 1600.00, 'sold', '2024-10-28', '2024-10-28 15:22:31'),
  (7605701, 36905513, '0001', 'Additional Sq footage of St Augustine', NULL, 'Add 700 sq feet of St. Augustine', 3577.00, 'pending', '2024-10-28', '2024-10-28 15:25:34'),
  (7607330, 1854420, '0001', 'Paver Repair', NULL, NULL, 1200.00, 'pending', '2024-10-29', '2024-10-29 07:57:38'),
  (7609811, 34841717, '0022', 'Bender board', 'Change order consists of 25 linear ft of brown bender board. Stakes and labor are included', NULL, 250.00, 'sold', '2024-10-29', '2024-10-29 13:27:29'),
  (7610254, 36642587, '0006', 'Stump Grind 1 Palm Stump', NULL, NULL, 250.00, 'pending', '2024-10-29', '2024-10-29 14:36:13'),
  (7610686, 36642587, '0007', 'Additional Plant Material', NULL, NULL, 2000.00, 'pending', '2024-10-29', '2024-10-29 16:27:27'),
  (7610758, 35259913, '0008', 'Change Order #6 - Pool Wall cap/veneer', NULL, NULL, 9600.00, 'pending', '2024-10-29', '2024-10-29 17:11:14'),
  (7614733, 36642587, '0008', 'Wiring for 16 lights and 1 transformer', NULL, NULL, 1235.00, 'pending', '2024-10-30', '2024-10-30 14:06:29'),
  (7615181, 36642587, '0009', 'Design Credit', NULL, NULL, -200.00, 'pending', '2024-10-30', '2024-10-30 15:45:04'),
  (7615195, 36532874, '0007', 'CREDIT - Timber Retaining Wal', 'REMOVE
Timber Retaining Wall Excavate for wall footings Install 24 linear feet of 6” x 6” ACQ ‘Green’ timber per plan COST $1,078.00', NULL, -1078.00, 'pending', '2024-10-30', '2024-10-30 15:50:28'),
  (7615339, 36532874, '0008', 'Benderboard add on', 'forgot to add on original amount in contract', NULL, 1100.00, 'pending', '2024-10-30', '2024-10-30 16:49:09'),
  (7615356, 36905513, '0002', 'Stump Grind Small Stump', NULL, NULL, 200.00, 'pending', '2024-10-30', '2024-10-30 16:55:16'),
  (7618415, 36678549, '0001', 'Add 2x2 steppers', NULL, NULL, 1530.00, 'pending', '2024-10-31', '2024-10-31 12:09:27'),
  (7619656, 36642587, '0010', 'Add''l wiring for transformer and irrigation timer', NULL, NULL, 300.00, 'pending', '2024-10-31', '2024-10-31 17:16:14'),
  (7625095, 37061295, '0001', '4 up lights and 1 transformer', '$220/light and install
$435 for (1) transformer installed', NULL, 1315.00, 'pending', '2024-11-04', '2024-11-04 07:55:29'),
  (7627760, 35942318, '0008', 'Additional Planting', 'First Plant Change  was $2335

---------- Forwarded message ---------
From: Daniel Aguilar daniel@picturebuild.com>
Date: Wed, Oct 30, 2024, 6:47?PM
Subject: planting budget
To: Ruth Coyne ruthcoyne02@gmail.com>, John Durso john@picturebuild.com>, Jorge Flores jorge@picturebuild.com>
Hey ruth here is the breakdown for the new vs old

(2) 15 gal trees

(120) 5 gal shrubs

(135) 1 gal shrubs

(24) flats 4" plants
$10,035

New plant list 59 1 gallons

3 24 gallon trees

219 5 gallons

4 flats

$12,370

Difference of $2,335

Second change was text.

$3252 for (75) 5 gallon hedge plants', NULL, 5585.00, 'pending', '2024-11-04', '2024-11-04 13:54:05'),
  (7628516, 35942318, '0009', 'Additional change orders see description', 'Trim pittispornum.     $70.
Remove 2''  fencing.   $250.
Move sod irrigation.  $160.
Add bend a board.     $200.
Color for concrete.    $600.', NULL, 1280.00, 'sold', '2024-11-04', '2024-11-04 17:34:37'),
  (7632034, 37061295, '0002', 'Design credit', NULL, NULL, -200.00, 'pending', '2024-11-05', '2024-11-05 13:16:03'),
  (7632049, 37061295, '0003', '1 5G Mexican Sage', NULL, NULL, 43.00, 'pending', '2024-11-05', '2024-11-05 13:19:04'),
  (7632122, 31736833, '0006', '3. Sidewalk & Driveway', 'New Sidewalk & Driveway Aprons
Demolish and remove existing sidewalk, apron & curb, approx. 370 square feet
Demolish and remove 2’ x 55’ of street asphalt
Install 10 linear feet of SDR35 drainpipe
Install 2-4 inches of Class II road base
Form and pour new natural gray concrete sidewalk, broom finish, approx. 252 square feet
Form and pour new concrete curb, approx. 58 linear feet
Install core in new curb for drain line
Form and pour (2 qty.) new driveway aprons per approved city detail
Note: Replacement of all concrete/curbs is limited to property lines of project. Any requests from
Public Works inspector for additional sidewalk, curb or addition of a concrete gutter may incur
additional costs to Owner.
COST $12,499
Asphalt Repair
Patch 2’ x 55’ of street asphalt to city standards
COST $2,400
Job Total $14,899 - Cash/Check Price', 'Approved by Mario', 14899.00, 'pending', '2024-11-05', '2024-11-05 13:29:33'),
  (7632129, 31736833, '0007', '3. Extend Wall Height', '3. Subcontractor shall extend the CMU retaining wall between the Duplex and ADU an additional 24” per direction of Ownership. $1,187.00', 'Extend Wall Height 24”
Drill, insert rebar dowels with epoxy
Lap steel and add 2 additional block courses
Fill cells with solid grout
COST $1187
Job Total $1187 - Cash/Check Price', 1187.00, 'pending', '2024-11-05', '2024-11-05 13:30:38'),
  (7632810, 37061295, '0004', 'Stucco patching front yard', NULL, NULL, 300.00, 'sold', '2024-11-05', '2024-11-05 16:07:53'),
  (7635522, 35259913, '0009', 'Additional eng for patio cover', NULL, NULL, 150.00, 'pending', '2024-11-06', '2024-11-06 10:58:27'),
  (7637222, 36642587, '0011', 'Add''l Irrigation Valve for Raised Beds', NULL, NULL, 550.00, 'pending', '2024-11-06', '2024-11-06 15:11:41'),
  (7639006, 36909985, '0004', '(6) additional 2''x2'' pre cast grey steppers', NULL, NULL, 300.00, 'pending', '2024-11-07', '2024-11-07 08:16:01'),
  (7639170, 36989161, '0001', 'Additional dump fees. Owner agreed to split costs.', NULL, NULL, 400.00, 'pending', '2024-11-07', '2024-11-07 08:37:44'),
  (7640628, 31736833, '0008', '3. Add fencing', '4. Subcontractor shall provide additional wood fencing at the driveway per the sketch provided by Ownership. Reference attachments #2 & #3 for clarification. $3,361.00', '4. Subcontractor shall provide additional wood fencing at
the driveway per the sketch provided by Ownership.
Reference attachments #2 & #3 for clarification.
$3,361.00', 3361.00, 'pending', '2024-11-07', '2024-11-07 12:08:12'),
  (7641206, 34189300, '0005', 'Additional Valve', '18.50 per linear foot of mainline approx 30 feet (To be verified on install.) $555
$1,117 For New valve Assembly and Ground Box with new laterals and Bubblers.', NULL, 1672.00, 'pending', '2024-11-07', '2024-11-07 13:28:26'),
  (7641220, 34189300, '0006', 'Rewiring in Controller', 'This will be based on time and material work will take Approx 8 working hours. This will be adjusted based on actual hours worked.
$75 an hour', NULL, 600.00, 'pending', '2024-11-07', '2024-11-07 13:31:23'),
  (7641240, 34189300, '0007', 'Locating and Connecting lateral for Back planter', 'This will be based on time and Material and will be adjusted after work is complete to reflect actual costs.
Material will be Approximately $200 This is for fittings and about 10 feet of pvc pipe for connection to existing valve.
$75 an hour for Labor Approximately 8 hours $600', NULL, 800.00, 'pending', '2024-11-07', '2024-11-07 13:35:16'),
  (7645508, 35649886, '0012', 'CREDIT - irrigation back planters', NULL, NULL, -650.00, 'pending', '2024-11-08', '2024-11-08 14:33:55'),
  (7647809, 37061524, '0001', '3 linear feet of bender board', NULL, NULL, 21.00, 'pending', '2024-11-11', '2024-11-11 08:42:15'),
  (7647820, 37061524, 'Plan approval', 'Plan Approval', NULL, NULL, 0, 'pending', '2024-11-11', '2024-11-11 08:43:56'),
  (7648972, 35543806, '0001', 'Additional outdoor kitchen', '12.5 lf BBQ with smooth stucco and two outlets

Connect plumbing
Install owner provided equipment.', '10 Man Dayts', 10250.00, 'pending', '2024-11-11', '2024-11-11 11:42:30'),
  (7648980, 35543806, '0002', 'Credit plaster', 'Credit for removal of pilaster', 'minus 3 man days', -2700.00, 'pending', '2024-11-11', '2024-11-11 11:43:17'),
  (7648984, 35543806, '0003', 'Additional driveway work in brick', 'Driveway brick 17 x5', NULL, 3200.00, 'pending', '2024-11-11', '2024-11-11 11:43:54'),
  (7649018, 35543806, '0004', 'Permits for electrical (gate)', 'Permit for electrical panel work', NULL, 635.00, 'sold', '2024-11-11', '2024-11-11 11:48:15'),
  (7650507, 35543806, '0005', 'Credit for drainage changed from French to area', NULL, NULL, -600.00, 'pending', '2024-11-11', '2024-11-11 17:26:03'),
  (7652937, 35259913, '0010', 'Change Order BBQ', NULL, 'raised backsplash, stone veneer, PIP cap', 5500.00, 'pending', '2024-11-12', '2024-11-12 10:24:03'),
  (7653617, 26949840, '0068', '2 Main line filters', NULL, NULL, 660.00, 'sold', '2024-11-12', '2024-11-12 11:58:05'),
  (7654220, 36989161, '0002', 'Fencing Removal', 'Removing chain link fencing.', NULL, 750.00, 'pending', '2024-11-12', '2024-11-12 13:27:23'),
  (7656554, 35649886, '0013', 'CREDIT - sealing gravel', NULL, NULL, -900.00, 'pending', '2024-11-13', '2024-11-13 08:11:17'),
  (7658190, 18195455, '0004', 'Co - Bryan', NULL, NULL, 450.00, 'pending', '2024-11-13', '2024-11-13 11:45:47'),
  (7664422, 37061524, '0002', 'CREDIT - Design', NULL, NULL, -750.00, 'pending', '2024-11-14', '2024-11-14 16:58:56'),
  (7665140, 36678549, '0002', 'Install 2x2 steppers', 'Demo and grade area for steppers 

Set steppers at grade to match existing steppers 
Cut steppers as needed at the wall

Remove and dump soil if needed', NULL, 2960.00, 'sold', '2024-11-15', '2024-11-15 06:42:47'),
  (7667867, 36625534, '0001', 'Additional Drainage', NULL, NULL, 300.00, 'pending', '2024-11-15', '2024-11-15 16:48:27'),
  (7670693, 36220457, '0001', 'Additional 80 sq of pavers', NULL, NULL, 1760.00, 'sold', '2024-11-18', '2024-11-18 10:46:52'),
  (7670702, 36220457, '0002', 'Remove and haul 8 rain barrels', NULL, NULL, 850.00, 'sold', '2024-11-18', '2024-11-18 10:48:01'),
  (7670746, 36220457, '0003', '1 pour in. Lid', NULL, NULL, 120.00, 'sold', '2024-11-18', '2024-11-18 10:56:10'),
  (7670765, 36641056, '0001', 'Take out Jacuzzi', NULL, 'Remove Jacuzzi,  Haul Waste,', 1800.00, 'pending', '2024-11-18', '2024-11-18 10:58:27'),
  (7670779, 36641056, '0002', 'Extend Corner of Sidewalk to side of the house', NULL, 'Add additional sq footage and remove section of palm tree.', 400.00, 'pending', '2024-11-18', '2024-11-18 10:59:43'),
  (7670793, 36641056, '0004', 'Change Concrete out to paver for side area.', NULL, NULL, 500.00, 'pending', '2024-11-18', '2024-11-18 11:02:00'),
  (7682012, 35259913, '0011', 'Olive Tree', 'Install 48" box tree - Boething Treeland', NULL, 4300.00, 'pending', '2024-11-20', '2024-11-20 14:25:25'),
  (7685910, 36611100, '0002', 'Pavers', '520 Sq ft pavers', NULL, 13600.00, 'pending', '2024-11-21', '2024-11-21 12:40:29'),
  (7686287, 31581766, '0007', 'Stem Wall', '10 feet stem wall for property', NULL, 1830.00, 'pending', '2024-11-21', '2024-11-21 13:31:49'),
  (7687126, 36642587, '0012', 'Lighting', 'Adding wiring and install for 5 lights', NULL, 450.00, 'pending', '2024-11-21', '2024-11-21 17:21:03'),
  (7687127, 36642587, '0013', 'Planting Credit', 'Credit for planting that the owner paid for.', NULL, -245.24, 'pending', '2024-11-21', '2024-11-21 17:21:43'),
  (7687134, 34720122, '0010', 'Add 7 additional lights', 'Lights plus labor', NULL, 1120.00, 'pending', '2024-11-21', '2024-11-21 17:28:32'),
  (7687135, 34189300, '0008', 'Site Irrigation analysis', 'Checking all valve wiring and identifying all valves.
Relabel all wires in controller', NULL, 1900.00, 'pending', '2024-11-21', '2024-11-21 17:28:47'),
  (7687426, 36678549, '0003', '80 Sq ft stabalizer dg', NULL, NULL, 400.00, 'sold', '2024-11-21', '2024-11-21 23:26:37'),
  (7688462, 37061884, '0001', 'CO', 'Gravel pit install. 

digging out 2x3x3 hole, installing aqua boxes and installing gravel', NULL, 800.00, 'pending', '2024-11-22', '2024-11-22 08:36:50'),
  (7690210, 31736833, '0009', '4. Wood Fence Modification', NULL, 'Fence Modification
Revised bid to account for 2x2 vertical fence
COST $2,636

Approved by Mario & Owner via email from Mario 11/22/24
"the owner has agreed to pay the additional $2,636 to provide the fence per the design in the change order. Please send a change order request to formalize this. "', 2636.00, 'pending', '2024-11-22', '2024-11-22 13:27:01'),
  (7693321, 30365496, '0018', 'Added Plants', '4 Creeping Figs
1 15 gallon african boxwood', NULL, 375.00, 'pending', '2024-11-25', '2024-11-25 09:46:26'),
  (7693330, 30365496, '0019', 'Adding Lights', 'Customer has lights to install. 
Need to install 2 column lights.', NULL, 500.00, 'pending', '2024-11-25', '2024-11-25 09:47:38'),
  (7696820, 34189300, '0009', 'CREDIT - 1/3', 'Checking all valve wiring and identifying all valves.
Relabeling all valves
Relabel all wires in controller
Stamping all existing box lids

Time and material Basis
650 per man day (8 hours)
Material will be charged at a 30 percent markup.', NULL, -2528.00, 'pending', '2024-11-26', '2024-11-26 07:36:50'),
  (7698237, 35942318, '0010', 'Resand and paint deck', NULL, NULL, 1980.00, 'pending', '2024-11-26', '2024-11-26 11:08:13'),
  (7698242, 35942318, '0011', 'Additional 3 outlets', NULL, NULL, 540.00, 'pending', '2024-11-26', '2024-11-26 11:08:54'),
  (7698262, 35942318, '0012', 'Stain gates', NULL, NULL, 460.00, 'pending', '2024-11-26', '2024-11-26 11:12:05'),
  (7699539, 36905163, '0001', '2D Design Plan', NULL, NULL, 750.00, 'sold', '2024-11-26', '2024-11-26 14:24:59'),
  (7699617, 35942318, '0014', 'Additional 8 lights and 1 transformer', NULL, NULL, 2380.00, 'sold', '2024-11-26', '2024-11-26 14:38:17'),
  (7699978, 34720122, '0011', '16 Lights not paid by Client', NULL, NULL, 1600.00, 'pending', '2024-11-26', '2024-11-26 17:12:28'),
  (7707058, 37061381, '0001', 'Design Approval', 'Aprovall of the design', NULL, 0, 'pending', '2024-12-02', '2024-12-02 08:50:51'),
  (7709239, 37446221, '0001', 'Stump removal', 'Rwmoving stump on side yard
Hauling an dumping', NULL, 450.00, 'pending', '2024-12-02', '2024-12-02 14:08:53'),
  (7711422, 37274990, '0001', '60sqfr of Additional Yosemite Cobble', NULL, NULL, 480.00, 'pending', '2024-12-03', '2024-12-03 08:53:29'),
  (7711431, 37274990, '0002', 'Plan approval', 'Plan approval choices same as listen on plan', NULL, 0, 'pending', '2024-12-03', '2024-12-03 08:54:33'),
  (7712536, 36620882, '0001', 'Electrical/Outlet', '30 lf conduit 1 outlet', NULL, 1290.00, 'sold', '2024-12-03', '2024-12-03 11:38:12'),
  (7712566, 36620882, '0002', 'Additional 4 lights', '1 path light
3 spot lights', NULL, 895.00, 'sold', '2024-12-03', '2024-12-03 11:40:28'),
  (7712614, 36620882, '0003', '60 lf metal bend a board', NULL, NULL, 720.00, 'sold', '2024-12-03', '2024-12-03 11:46:49'),
  (7714087, 36620882, '0004', 'Credit for paver 79 Sq ft', NULL, NULL, -1042.00, 'sold', '2024-12-03', '2024-12-03 16:02:36'),
  (7717641, 32638422, '0005', '18 Masonry Lights for walls and steps', NULL, NULL, 4320.00, 'pending', '2024-12-04', '2024-12-04 12:45:57'),
  (7718823, 36641056, '0005', 'Removal of timber wall and reinstall strait', 'Removal and reinstall of timber walls - 40 ln feet. 
Leveling the timber steps in front of the wall.
( removed 7ft timber wall section until clarified if the addtional work beyond this change order is approved to do)
( will need to add for addtional material needed in other change order)', NULL, 3550.00, 'pending', '2024-12-04', '2024-12-04 16:40:27'),
  (7718867, 36641056, '0006', 'Removal of wood around spa', 'Removal of additonal wood around spa
Hauling in 4x4 and wood for rebuild', NULL, 850.00, 'pending', '2024-12-04', '2024-12-04 16:59:22'),
  (7718869, 36641056, '0007', 'Hillside clearing', 'Cleaning up hillside removing lose dirt 
Tamping down hill', NULL, 800.00, 'pending', '2024-12-04', '2024-12-04 17:00:03'),
  (7718876, 35259913, '0012', 'Change Order 12-4-24', 'Demolition & Grading
Remove an average of 7” of soil over 980 square feet
Remove (40 qty.) existing medium shrubs
Remove existing grass, approx. 1700 square feet
Fine grading in scope of work
*No removal of ivy/plants behind pool wall is included in this price
COST $8,500
Irrigation
Install (3 qty.) anti-siphon valves for spray irrigation zones
Install (4 qty.) anti-siphon valves for drip irrigation zones
Connect valves to existing irrigation timer
COST $12,200
Metal Edging
Install black steel edging per plan, approx. 352 linear feet
*Not including in D.G. area
COST $6,000
Soil Prep Till and amend planting area soil, approx. 2200 square feet
COST $2,600
Document Ref: ZDP66-BEH2Q-QXAD3-EOQVX Page 1 of 3
12410 Foothill Blvd Unit U Sylmar, CA 91342
(818) 751-2690 www.picturebuild.com
CA Contractor''s License B, C-27,8,53: 990772
11/22/2024
Page 2 of 3 Planting
Provide and install the following plant sizes/quantities:
(1 qty.) 36” box tree
(4 qty.) 24” box trees
(6 qty.) 15 gal shrubs
(49 qty.) 5 gal premium shrubs
(103 qty.) 5 gal shrubs
(14 qty.) 3 gal shrubs
(150 qty.) 1 gal shrubs
(25 qty.) dirt flats of groundcover
COST $19,000
Mulch
Install approx. 2200 square feet of standard shredded bark mulch
COST $1,500
D.G. Area
Excavate 3” below finish grade over approx. 233 square feet
Install 3” of tan, stabilized decomposed granite per plan, approx. 233 square feet
Includes 2 sacks of cement per cubic yard of D.G. for stabilization
Install (10 qty.) 2x2 ‘Angelus’ brand ‘Paseo II’ steppers per plan
Trench and run 60 linear feet of electrical from meter to fountain location
Install (1 qty.) GFIC receptacle
Lay weed barrier fabric
Install 3” of tan stabilized decomposed granite, approx. 153 square feet
D.G. includes 2 sacks of cement per cubic yard for stabilization purposes
Install approx. 75 linear feet of black metal edging
*Fountain and fountain install by others
*Benches by others
COST $4,400
Document Ref: ZDP66-BEH2Q-QXAD3-EOQVX Page 2 of 3
12410 Foothill Blvd Unit U Sylmar, CA 91342
(818) 751-2690 www.picturebuild.com
CA Contractor''s License B, C-27,8,53: 990772
11/22/2024
Page 3 of 3
Lighting
Install (1 qty.) 200-watt transformer, (1 qty.) 100-watt transformer
Install the following LED lights:
(14 qty.) path lights AP-128B-7 2.5w
(2 qty.) wall washer lights FL-113B 2.5w
(3 qty.) architectural in-grounds IG-63-00B 3.5w
(13 qty.) flood lights FL-115B 3.5w
(19 qty.) spot lights FL-105B 3.5w
Wire up all fixtures in 3 separate circuits
COST $7,800
Job Total $62,000 - Cash/Check Price', NULL, 62000.00, 'pending', '2024-12-04', '2024-12-04 17:03:14'),
  (7719704, 37420562, '0001', 'Gas line trenching', NULL, NULL, 350.00, 'pending', '2024-12-05', '2024-12-05 06:46:16'),
  (7723147, 37420562, '0002', 'Additional step work 47 linear feet', '47 linear feet of steps additional', NULL, 3500.00, 'pending', '2024-12-05', '2024-12-05 15:55:45'),
  (7723151, 37420562, '0003', 'Potential segmeneted concrete', '90 sq ft of segmented concrete walkway to street', NULL, 2200.00, 'pending', '2024-12-05', '2024-12-05 15:56:41'),
  (7723154, 37420562, '0004', 'step alternative 31 linear feet', '31 linear feet of steps as alternative', NULL, 2300.00, 'pending', '2024-12-05', '2024-12-05 15:57:26'),
  (7723221, 37061381, '0002', 'Reinforcing Patio Structure', NULL, NULL, 850.00, 'pending', '2024-12-05', '2024-12-05 16:21:46'),
  (7723400, 18028569, '0004', 'Paver repair', NULL, NULL, 700.00, 'pending', '2024-12-05', '2024-12-05 17:50:25'),
  (7725902, 32638422, '0006', 'Credit for lights', NULL, NULL, -4320.00, 'sold', '2024-12-06', '2024-12-06 12:06:36'),
  (7726840, 17948081, '0005', 'Side yard work', '1. Demo and irrigation $800.00
Irrigating 80 linear ft with 2 rows of perforated hose 160 linear ft total.
Demo, haul trash, and grading are included. 

2.12 flats of senicio @$75 per flat
12x90= 900

3. 11 12 ft high 3 inch in diameter tree stakes priced at $30 per stake. 30x11= $330 installation included in labor cost.

4. 2 guys with rate @$80 per guy for 8 hour''s 
Totals $1280.00

Grand total : $3310.00', NULL, 3300.00, 'pending', '2024-12-06', '2024-12-06 16:53:49'),
  (7729912, 35543806, '0006', 'Additional 9 lights', NULL, NULL, 2100.00, 'pending', '2024-12-09', '2024-12-09 10:38:32'),
  (7731709, 33691503, '0042', 'Demo/Concrete Install for Garage', 'Demo @ $2400
Grey Concrete/Light Broom Finish for 19'' x 20'' @ $10,300', NULL, 12700.00, 'pending', '2024-12-09', '2024-12-09 14:56:31'),
  (7735601, 36641056, '0008', 'Additional Railroad Ties', 'Adding 12 additional railroad ties to replace rotted ones.', NULL, 820.00, 'pending', '2024-12-10', '2024-12-10 12:41:11'),
  (7735630, 36641056, '0009', 'Replacing old Timber wall', 'Removing the existing wall that retains the walkway
Removing the existing wall retaining the hillside
Grading the hillside to slope down and not be over the deck
Removing excess dirt approximately 4 yards
Trenching 3 feet deep, approx 20 feet.
Installing (20) 5 foot timber post to retain the walkway.', NULL, 6350.00, 'pending', '2024-12-10', '2024-12-10 12:44:51'),
  (7738443, 37061381, '0003', 'Credit for cleaning', 'For cleaning the area and fixing the hose', NULL, -200.00, 'pending', '2024-12-11', '2024-12-11 09:12:58'),
  (7738519, 35543806, '0007', 'PLanting for owner provided plants', 'Planting charge for owner provided plants

20) 5 gallons--$440
54) 1 gallons-- $540
1 15 galllon $40
10) 24 in box''s--$1400
1) 36 in box- $450

$2,870', NULL, 2870.00, 'sold', '2024-12-11', '2024-12-11 09:25:34'),
  (7738597, 35543806, '0008', 'credit for original planting plan', '34 1 gallon plants at $21.50 each installed $731.00

96 5 gallon plants installed at $43.50 each $4,176.00       

2 fruit trees in 15 gallon     $620  

1 36 in box trees installed at $1425 each 

2 flats of ground cover installed at $75 each $150
Total planting cost $7,102.00', NULL, -7102.00, 'sold', '2024-12-11', '2024-12-11 09:36:54'),
  (7738626, 35543806, '0009', 'Remaining plants to be purchased and sourced by PB', 'Planting charge for owner provided plants

(72) 5 gallons--$3,153.75
(123) 1 gallons-- $2644.50', NULL, 5798.25, 'pending', '2024-12-11', '2024-12-11 09:41:00'),
  (7742610, 31736833, '0010', '4. Additional Deck', 'Install new side deck at back house. 5''x5'' all pressure treated deck  $1350


COST $1,350', NULL, 1350.00, 'pending', '2024-12-12', '2024-12-12 08:53:58'),
  (7743553, 31736833, '0012', '4. Wall & Catch basins', NULL, 'CMU Wall
Install 4’ x 18” CMU wall
Install (2) 12”x12” plastic catch basins
COST $2,020', 2020.00, 'pending', '2024-12-12', '2024-12-12 11:00:06'),
  (7744896, 31736833, '0013', '4. Driveway Changes', 'Install channel drain system per plan
Install step transition.', NULL, 4280.00, 'pending', '2024-12-12', '2024-12-12 14:31:25'),
  (7752011, 36772464, '0001', 'Weed Abatement for Slope', 'Need to spray Nutsedge and invasive Juncus on slope', NULL, 250.00, 'pending', '2024-12-16', '2024-12-16 12:13:32'),
  (7758804, 26949840, '0069', 'Install mailbox', 'Remove and prep for new mailbox
Install new mailbox', NULL, 600.00, 'sold', '2024-12-18', '2024-12-18 07:00:02'),
  (7758807, 26949840, '0070', 'Repair wall and cap', NULL, NULL, 460.00, 'sold', '2024-12-18', '2024-12-18 07:00:48'),
  (7759193, 31736833, '0014', '4. Added Paver Driveway Width', 'Per email.  Added sq footage due to paver width off on plan.', NULL, 735.00, 'pending', '2024-12-18', '2024-12-18 08:06:34'),
  (7759199, 31736833, '0015', '4. Added Paver to remove planters', 'Added paver to install by removing planters.', NULL, 720.00, 'pending', '2024-12-18', '2024-12-18 08:07:16'),
  (7759238, 31736833, '0018', '4. Trex Bottom Concrete Walkway', NULL, NULL, 600.00, 'pending', '2024-12-18', '2024-12-18 08:10:33'),
  (7763596, 35259913, '0013', 'Added 4 - 15 gal trees', NULL, NULL, 415.00, 'pending', '2024-12-19', '2024-12-19 08:17:30'),
  (7766233, 34927957, '0001', 'Credit', NULL, NULL, -300.00, 'pending', '2024-12-19', '2024-12-19 15:24:55'),
  (7769378, 36989161, '0003', 'Electrical', 'Adding new 50 amp breaker and running it to new sub panel', NULL, 2350.00, 'pending', '2024-12-20', '2024-12-20 13:59:27'),
  (7769715, 37823743, '0001', 'Additional Plants', '(8) flats Rosemary prostratus
(30) 1 gallon Lavender (filling in between Salvia)', NULL, 1000.00, 'pending', '2024-12-20', '2024-12-20 17:26:23'),
  (7780757, 37519743, '0001', 'ADDITIONAL ITEMS', 'The costs for demo & remove stump (up to 1ft deep) $700
Lawn 120 SF more is $440
(5) shrubs is $176
36 SF additional pavers $660
COST $1,976', NULL, 1976.00, 'pending', '2024-12-31', '2024-12-31 11:09:45'),
  (7781059, 36148606, '0001', 'CREDIT FOR INITIAL CONTRACT ADDENDUM', NULL, NULL, -36465.00, 'sold', '2024-12-31', '2024-12-31 13:12:06'),
  (7781077, 36148606, '0002', 'UPDATED CONTRACT ADDENDUM', 'Demolition & Site Prep
Demolish and remove existing pavers in north side of backyard
Demolish and remove existing flagstone paving in south side of backyard
Demolish and remove existing spa area in south side of backyard
Chip out existing patio tile and clean area
Remove existing raised ledge on patio
Demolish and remove 4” off existing raised patio

COST $5,143

Concrete Pathway
Form for 220 square feet of concrete
Install 2 inches of Class II road base for additional paver patio area
Set rebar grid at 24” on center
Pour 3000 PSI natural gray concrete per plan
Apply broom finish
Install control joints as needed

COST $2,127

Patio Remodel
Layout new patio extension per plan
Excavate for footing
Pour concrete footing
Install CMU block subwall for patio extension, approx. 40 linear feet x 12” HT.
Drill into side of existing patio slab, install rebar dowels and epoxy
Tie new steel into dowels
Install 4 inches of Class II road base for additional paver patio area
Install ‘Stepstone’ brand 24” x 24” pavers per plan, approx. 450 square feet
Install ‘Stepstone’ brand 24” x 24” pavers over existing ramp, approx. 64 square feet
Make cuts
Install polymeric sand in joints

COST $13,224

New Steps
Layout new steps per plan
Install CMU block subwall for new steps, approx. 115 linear feet total
Install 24” x 24” ‘Stepstone’ brand pavers as treads and risers per plan, approx. 115 linear feet
Make cuts
Grout joints

COST $10,564

Side Yard Pavers
Layout new pavers per plan
Install 4 inches of Class II road base 
Install 1 inch of washed leveling slang
Install ‘Stepstone’ brand 24” x 24” pavers, approx. 280 square feet
Make cuts
Fill joints with polymeric sand
Compact pavers

COST $6,060

PAVER SEALANT 
Install sealant for patio, side yard pavers and steps

COST $1,100

LIGHTING

Furnish and install (4) low voltage LED masonry step lights      
Furnish and install (4) low voltage LED up lights
Furnish and install (1) transformer and wire lights to panel

COST $2,275', NULL, 40493.00, 'sold', '2024-12-31', '2024-12-31 13:22:45'),
  (7782488, 31581766, '0008', 'A Permit Work', 'Here is the quote for the work.
 I am quoting to replace the whole sidewalk down the length as it is pretty cracked upon in a lot of sections. 
There is a bit of economy of scale with this as we will do one pour, one load no matter that size difference.

43 linear feet of sidewalk
New Apron
Demo all existing
Install 12 linear feet of new curbing and gutter 
Does not include any asphalt requirements or tree root work.


$7,863', NULL, 7863.00, 'pending', '2025-01-02', '2025-01-02 08:55:56'),
  (7782542, 31581766, '0009', 'LID work', 'Hi  Wil,


The price for the pit will be $4,913 for demo soils removal (2 super tens) and 3 separate gravel deliveries with the geotextile fabric and pipe installation

Best,
Brian', NULL, 4913.00, 'pending', '2025-01-02', '2025-01-02 09:04:51'),
  (7782640, 31581766, '0010', 'Added Curb and Root Work for A Permit', '- Install additional 28 linear feet (12 included in previous change order) for a total of $4,620
- Root work added $475', NULL, 5095.00, 'pending', '2025-01-02', '2025-01-02 09:25:09'),
  (7782693, 31581766, '0011', 'Plumbing Cleanup and Deepened Foundations', 'THIS IS WORK ALREADY DONE AND PAID FOR', NULL, 3362.00, 'pending', '2025-01-02', '2025-01-02 09:34:27'),
  (7782697, 31581766, '0012', 'Added grading and soils removal', '3 Crew Days. Hand Demo plus fine grading
Additional equipment and driver.
Plus Soils Removal', NULL, 8850.00, 'pending', '2025-01-02', '2025-01-02 09:34:52'),
  (7782830, 37807802, '0001', 'Approved Change Order', 'Carter mentioned that the wall near new pool equipment has footing that is now pretty exposed. We think we should actually build a wall right in front of property wall. It will be 24" tall instead of 12" high and a bit longer. The cost would be $2090 for this. This would also mean that the pool equipment is no longer elevated, which may be a good thing.

He also mentioned an option for lowering the gas line. Basically cut side concrete and install new gas line. The cost would be $2801.00. This is optional and we can of course leave gas line as it is.

Lastly, all the electrical is pretty shot. I was thinking of 2 new plugs on the dg/seat wall side and 1 new plug for the pergola area. This would be $2340.', NULL, 7231.00, 'pending', '2025-01-02', '2025-01-02 09:57:31'),
  (7783108, 36620882, '0005', 'Additional 2 path lights', 'Approved at site with Jimmy', NULL, 448.00, 'pending', '2025-01-02', '2025-01-02 10:43:51'),
  (7788183, 35942318, '0015', 'plant replacement for gopher damage', 'Replace 5 5 gallon Jasmine 14 1 gallon plants damaged by gophers', NULL, 645.00, 'sold', '2025-01-05', '2025-01-05 09:01:22'),
  (7789148, 36613497, '0001', 'Additional Lights', 'Adding 3 additional AP-00B-01B around the Driveway.', NULL, 660.00, 'sold', '2025-01-06', '2025-01-06 07:32:10'),
  (7792102, 35259913, '0014', 'Wall & Paint', NULL, NULL, 9820.00, 'pending', '2025-01-06', '2025-01-06 15:35:13'),
  (7792381, 31736833, '0019', 'Remove existing rear fence.  Grade back section', '1) Remove existing fencing, posts etc. (not including public fence).
2) Remove 4 feet x 2 foot section along back wall including minor root removal.  25 linear feet. 
3) Distribute portion of soils around sump pump wall and cover piping
4) Back fill behind completed wall and compact.', NULL, 3900.00, 'pending', '2025-01-06', '2025-01-06 18:16:13'),
  (7793267, 31736833, '0020', '4. Credit for Steps', 'We did not install upper landing concrete steps.', NULL, -300.00, 'pending', '2025-01-07', '2025-01-07 07:37:32'),
  (7794035, 37823743, '0002', 'Credit for(1) Olive', NULL, NULL, -345.00, 'pending', '2025-01-07', '2025-01-07 09:22:02'),
  (7796534, 32638422, '0007', 'Stamped Color Concrete Pad', 'Demo ($940)
remove soils 7" below final grade/grade area, prep and  prep for steps 

Concrete ($3000 for stamped concrete with color/approx 110sqft)', NULL, 3940.00, 'sold', '2025-01-07', '2025-01-07 17:34:34'),
  (7796538, 32638422, '0008', 'Additional Lights for new steps', '(4) masonry lights for new steps (will connect to existing transformer)', NULL, 960.00, 'sold', '2025-01-07', '2025-01-07 17:35:36'),
  (7796541, 32638422, '0009', 'New Steps to Pool Area/Exterior Door to Bathroom', '57 linear feet of stamped concrete with color', NULL, 4200.00, 'sold', '2025-01-07', '2025-01-07 17:37:07'),
  (7796542, 32638422, '0010', 'Sod for new yard area below pool', 'approx 360sqft of St Augustine', NULL, 1440.00, 'sold', '2025-01-07', '2025-01-07 17:38:12'),
  (7796545, 32638422, '0011', 'Photinia for lower slope', '(20) 15 gallon Photinia @$3000
(14) 24" Boxed Photinia @$4800', NULL, 7800.00, 'sold', '2025-01-07', '2025-01-07 17:43:10'),
  (7796547, 32638422, '0012', 'Irrigation for slope and sod', '(2) drip zones for lower slope
(1) spray zone for sod
Will connect to existing timer', NULL, 3300.00, 'sold', '2025-01-07', '2025-01-07 17:44:03'),
  (7796550, 32638422, '0014', 'Lights for Lower Slope', 'Suggesting 12 up lights for entire slope area', NULL, 2640.00, 'sold', '2025-01-07', '2025-01-07 17:46:11'),
  (7804485, 34927957, '0002', 'Credit Wall', NULL, NULL, -700.00, 'pending', '2025-01-09', '2025-01-09 14:33:30'),
  (7804668, 37798226, '0001', 'Concrete Curbs for front yard next to sidewalk', 'Removing 40 linear feet of curbs
Removing 25 sqft of concrete
Installing 25 sqft of walkway
Installing 35 linear feet of new curbs
Topcast finish', NULL, 1700.00, 'pending', '2025-01-09', '2025-01-09 15:35:35'),
  (7804672, 37798226, '0002', 'Credit curbs', 'Removing 27 linear feet of new 3 inch curb', NULL, -596.00, 'pending', '2025-01-09', '2025-01-09 15:36:21'),
  (7806605, 38031130, '0001', 'Design $600 PAID)', NULL, NULL, 0, 'pending', '2025-01-10', '2025-01-10 10:00:29'),
  (7807960, 35259913, '0015', 'Sod', NULL, NULL, 3700.00, 'pending', '2025-01-10', '2025-01-10 13:57:49'),
  (7808075, 37998571, '0001', 'Wall Sketch', 'Erik to measure wall attached to side gate entry (rebuilding wall) for section-elevation drawing to rebuild wall', NULL, 250.00, 'pending', '2025-01-10', '2025-01-10 14:27:51'),
  (7808717, 36905163, '0002', 'Credit for Lighting Original Contract', '(10) path/up lights
(2) step lights
(1) transformer', NULL, -3435.00, 'pending', '2025-01-12', '2025-01-12 08:56:29'),
  (7808725, 36905163, '0003', 'Lighting Current Contract', '(23) up/path lights
(9) masonry lights
(1) transformer', NULL, 7650.00, 'pending', '2025-01-12', '2025-01-12 09:08:15'),
  (7808732, 36905163, '0004', 'Add''l paver from OG contract/Sealant', 'Add''l 151sqft of pavers (side paths and driveway)
Sealant for a total of 854sqft of pavers', NULL, 3600.00, 'pending', '2025-01-12', '2025-01-12 09:17:24'),
  (7808734, 36905163, '0005', 'Bellecrete Wall Cap/+1'' Wall Height', '45 linear feet of Wall Cap', NULL, 2900.00, 'pending', '2025-01-12', '2025-01-12 09:18:49'),
  (7808741, 36905163, '0006', 'Increased Steps', '+20.8 linear feet of steps
+16sqft paver landing', NULL, 1280.00, 'pending', '2025-01-12', '2025-01-12 09:27:32'),
  (7808742, 36905163, '0007', 'Credit for Steppers', 'Reducing Steppers to 23 total', NULL, -1490.00, 'pending', '2025-01-12', '2025-01-12 09:28:04'),
  (7808748, 36905163, '0008', 'Credit (1) Zone Irrigation', NULL, NULL, -1050.00, 'pending', '2025-01-12', '2025-01-12 09:40:03'),
  (7817241, 38031130, '0002', 'misc credit', 'removal of charge for mixing rock
small basket vredit', NULL, -400.00, 'pending', '2025-01-14', '2025-01-14 14:29:15'),
  (7817707, 35220019, '0002', '330sqft Concrete Side Yard', NULL, NULL, 4500.00, 'sold', '2025-01-14', '2025-01-14 17:19:51'),
  (7817714, 35220019, '0003', 'Credit for Gravel Sideyard', NULL, NULL, -1100.00, 'sold', '2025-01-14', '2025-01-14 17:21:43'),
  (7817716, 35220019, '0004', 'Additional Demo for Concrete Side Yard', NULL, NULL, 924.00, 'sold', '2025-01-14', '2025-01-14 17:23:20'),
  (7824929, 37992089, '0001', 'Metal flashing/ additional forming for posts', NULL, NULL, 689.00, 'pending', '2025-01-16', '2025-01-16 12:00:38'),
  (7825276, 37992089, '0002', 'Additional railing', NULL, NULL, 898.00, 'pending', '2025-01-16', '2025-01-16 12:48:24'),
  (7825286, 37992089, '0003', 'Stucco walls Smooth Stucco (color Titanium)', NULL, NULL, 700.00, 'pending', '2025-01-16', '2025-01-16 12:49:43'),
  (7825515, 36168505, '0001', 'CONCRETE PADS', 'Concrete pad for Bar
Concrete for trashcan', NULL, 3400.00, 'pending', '2025-01-16', '2025-01-16 13:26:08'),
  (7825646, 36168505, '0002', 'Concrete slab for bar', NULL, NULL, 2800.00, 'sold', '2025-01-16', '2025-01-16 13:50:24'),
  (7825881, 35259913, '0016', 'Column size upgrade', NULL, NULL, 1200.00, 'pending', '2025-01-16', '2025-01-16 14:30:35'),
  (7826238, 37604325, '0001', 'Permits', NULL, NULL, 8013.13, 'pending', '2025-01-16', '2025-01-16 15:55:15'),
  (7827407, 35220019, '0005', 'Credit for brick edging', NULL, NULL, -1600.00, 'sold', '2025-01-17', '2025-01-17 07:55:33'),
  (7829786, 35220019, '0006', 'Extra Sqft of brick for front yard', 'Adding 60 sqft of paver for front yard', NULL, 760.00, 'sold', '2025-01-17', '2025-01-17 16:23:36'),
  (7829788, 35220019, '0007', 'Bender Board for front yard planters', 'Changing Planters for front yard edging to Bender Board', NULL, 602.00, 'sold', '2025-01-17', '2025-01-17 16:27:17'),
  (7831511, 37992089, '0004', 'Additional sand finish', NULL, 'Approved over the phone', 1100.00, 'pending', '2025-01-20', '2025-01-20 07:39:16'),
  (7832353, 37807802, '0002', 'Footing & install for diving board', NULL, NULL, 996.00, 'pending', '2025-01-20', '2025-01-20 09:52:53'),
  (7834824, 37155041, '0001', 'Credit for Carpentry', 'Removing from Contract

$1934 for decking
$1382 for steps
$2995 for railing
$15130 for steps and bench
$900 for fencing work in front.

Total $22,321', NULL, -22321.00, 'pending', '2025-01-20', '2025-01-20 23:53:48'),
  (7839765, 36168505, '0003', 'Credit for 3 Up Lights', NULL, NULL, -660.00, 'sold', '2025-01-22', '2025-01-22 07:13:50'),
  (7842703, 34007670, '0003', 'Planter bed', 'Removing weeds

Adding weed barrier 

Adding mulch

For 780sqft of existing planters', NULL, 3120.00, 'pending', '2025-01-22', '2025-01-22 14:18:28'),
  (7842707, 34007670, '0004', 'Adding 5 lights to new planters', 'Adding 5 broze uplights to new planters', NULL, 1100.00, 'pending', '2025-01-22', '2025-01-22 14:19:06'),
  (7842713, 34007670, '0005', 'Credit for not removing brick and steppers', NULL, NULL, -250.00, 'pending', '2025-01-22', '2025-01-22 14:19:34'),
  (7845600, 37992089, '0005', '24 LF electrical w/wire and outlet and cover', NULL, NULL, 831.00, 'pending', '2025-01-23', '2025-01-23 10:39:29'),
  (7845605, 37992089, '0006', '15 LF main water for fountain', NULL, NULL, 212.00, 'pending', '2025-01-23', '2025-01-23 10:40:31'),
  (7845611, 37992089, '0007', 'Retro fit sprinklers', NULL, NULL, 549.00, 'pending', '2025-01-23', '2025-01-23 10:41:02'),
  (7845676, 37992089, '0008', '80 LF 2x4 bender board', NULL, NULL, 719.00, 'pending', '2025-01-23', '2025-01-23 10:49:17'),
  (7848151, 35543806, '0010', 'Misc planting', 'Credit for 4 5 gallon plants Picking up 13 24 in boxes and planting them

Discount of $200 applied, on 1700 invoice', NULL, 1500.00, 'pending', '2025-01-24', '2025-01-24 06:12:52'),
  (7853203, 32638422, '0015', 'Credit for 24” shrubs', '14 shrubs were reduced in size from 24" to 15 gallon', NULL, -2730.00, 'sold', '2025-01-27', '2025-01-27 08:10:18'),
  (7855746, 35220019, '0008', 'Adding brick for walkway', 'Adding 8 sqft of brick in front of front gate', NULL, 130.00, 'pending', '2025-01-27', '2025-01-27 13:43:49'),
  (7858491, 37155041, '0002', 'Credit for Plant Difference', 'Credit due for lower quantity of plants
Less (2) 24 inch box trees  ($580 credit)
Less (31) 5 gallon plants ($1872 credit)
Add (16) 1 gallon plants ($1037 add)
Add (5) 15 Gallon ($865 add)
 

	
		
		
	
	
		
			PLANTS
			Difference
		
		
			1gal
			16
			$754
		
		
			5gal
			-31
			 $   (1,872.00)
		
		
			15gal
			5
			 $         865.00
		
		
			24 citrus
			0
			 $                  -   
		
		
			24 box
			-2
			 $      (580.00)
		
		
			 
			 
			($833)', NULL, -833.00, 'sold', '2025-01-28', '2025-01-28 09:21:54'),
  (7858511, 37155041, '0003', 'Mulch Hillside', 'Mulch Hillside -  Roughly 4,400 square feet
Gorilla Hair

The original quote was for $3,800 with mix. 

No charge added for doing all Gorilla Hair.

Additional $800 courtesy credit.

Total price $3,000', NULL, 3000.00, 'sold', '2025-01-28', '2025-01-28 09:24:27'),
  (7858515, 35220019, '0009', '1 additional light', NULL, NULL, 220.00, 'sold', '2025-01-28', '2025-01-28 09:25:02'),
  (7862157, 34007670, '0006', 'Additional Flats', 'Adding 2 flats of ground cover', NULL, 200.00, 'pending', '2025-01-29', '2025-01-29 07:03:32'),
  (7862339, 37696423, '0001', 'Backyard planter', 'Remove debris from planter (trash planter boxes) and remove veggie box soil. Add weed barrier to planter 41'' x3'' add 2 yards of pea gravel. Install 8 station rachio.

 Total 2900.00', NULL, 2900.00, 'pending', '2025-01-29', '2025-01-29 07:38:41'),
  (7863115, 35220019, '0010', '2 Hydrangeas', '5 gallons', NULL, 100.00, 'pending', '2025-01-29', '2025-01-29 09:27:50'),
  (7863860, 37542899, '0001', 'increase pricing for retail magnolia', 'Approved via text. Got retail magnolia for an additional +$400', NULL, 400.00, 'pending', '2025-01-29', '2025-01-29 11:28:13'),
  (7865095, 35259913, '0017', 'Patatian Sealer', NULL, 'BP water based ‘Wet Look’ Sealer

14 hours labor
$1810 materials - (5) 5 gal buckets $330 each at Prime +tax', 3000.00, 'pending', '2025-01-29', '2025-01-29 14:25:14'),
  (7865692, 35543806, '0011', 'Credit Motor Pad Credit plants', NULL, NULL, -304.52, 'pending', '2025-01-29', '2025-01-29 17:37:41'),
  (7867505, 38383142, '0002', 'Credit for stucco patching', NULL, NULL, 0, 'pending', '2025-01-30', '2025-01-30 09:19:32'),
  (7872518, 31248085, '0031', 'Wall, DG, Footings, Gravel', 'Block Wall - 11 feet long 18 inches high for security. -  $1925
Footings for pool fencing -  $1900
Install 13 concrete pads for pool cover - $250

DG pathway 72 sq feet - $475
connect pool auto fill - $80', NULL, 4630.00, 'sold', '2025-01-31', '2025-01-31 11:18:52'),
  (7876258, 35220019, '0011', 'Credit Design', NULL, NULL, -250.00, 'pending', '2025-02-03', '2025-02-03 09:27:24'),
  (7877667, 38383142, '0003', '51 linear feet of drains plus 5 inlets', 'Adding surface drains in back of wall with 5 inlets', NULL, 1500.00, 'sold', '2025-02-03', '2025-02-03 12:32:39'),
  (7877829, 38383142, '0004', 'Waterproofing Wall with Roll on Thoroseal', NULL, NULL, 1200.00, 'pending', '2025-02-03', '2025-02-03 12:51:58'),
  (7878114, 32638422, '0016', '12 flats of Creeping Thyme', NULL, NULL, 800.00, 'sold', '2025-02-03', '2025-02-03 13:29:24'),
  (7878118, 32638422, '0017', '(1) Copper Irrigation Drip Zone for Groundcover', NULL, NULL, 1400.00, 'sold', '2025-02-03', '2025-02-03 13:30:05'),
  (7879260, 38383142, '0006', 'Credit for Wall Addition', NULL, NULL, -2167.00, 'sold', '2025-02-03', '2025-02-03 20:23:17'),
  (7882306, 38383142, '0007', 'Stucco for back of privacy wall', 'Sanded stucco for back of privacy wall', NULL, 1200.00, 'sold', '2025-02-04', '2025-02-04 12:33:23'),
  (7883203, 38383142, '0008', 'Water main for fountain 41. LF. With bulb valve', NULL, NULL, 1200.00, 'sold', '2025-02-04', '2025-02-04 14:56:55'),
  (7883209, 38383142, '0009', '42 LF. Conduit with wire and outlet', NULL, NULL, 1800.00, 'sold', '2025-02-04', '2025-02-04 14:57:30'),
  (7883212, 38383142, '0010', 'Additional 1 valve for hillside', NULL, NULL, 1400.00, 'sold', '2025-02-04', '2025-02-04 14:57:53'),
  (7883214, 38383142, '0011', 'Planting for hillside', '(100) 1 gallon Ceanothus Yankee Point', NULL, 2200.00, 'sold', '2025-02-04', '2025-02-04 14:58:07'),
  (7883233, 38383142, '0012', 'Lighting', '3 up lights
6 path lights', NULL, 2400.00, 'pending', '2025-02-04', '2025-02-04 15:02:17'),
  (7883321, 38383142, '0013', 'Gopher Baskets for Slope Plants (100 count)', NULL, NULL, 900.00, 'sold', '2025-02-04', '2025-02-04 15:21:36'),
  (7883444, 31581766, '0013', 'Concrete Pour Moving', 'We had to move the concrete pour to two dates.  Added labor and material for waste and short load.', NULL, 3200.00, 'pending', '2025-02-04', '2025-02-04 15:56:44'),
  (7883508, 31736833, '0021', '5. Credit hardware/install', NULL, NULL, -450.00, 'pending', '2025-02-04', '2025-02-04 16:13:44'),
  (7883660, 35776830, '0005', '2 additional up light', NULL, NULL, 440.00, 'pending', '2025-02-04', '2025-02-04 17:32:31'),
  (7888041, 37998571, '0002', 'Shrub removal', NULL, NULL, 300.00, 'pending', '2025-02-05', '2025-02-05 16:11:05'),
  (7889206, 37155041, '0004', '24 inch Sycamore - No Charge', 'Courtesy No Charge Installation.', NULL, 0, 'sold', '2025-02-06', '2025-02-06 07:35:57'),
  (7889228, 37155041, '0005', 'Added Lighting', 'Return (12) FC: Eyebrow SD 406B  
Add (25) Lightcraft Step Light 4 2700K', NULL, 1625.00, 'sold', '2025-02-06', '2025-02-06 07:40:21'),
  (7889826, 37155041, '0006', 'Credit for Gravel', 'Did not install gravel along back walkway', NULL, -720.00, 'sold', '2025-02-06', '2025-02-06 09:20:31'),
  (7890927, 38328498, '0001', 'Tile for Side of Porch  Approx 24sqft', NULL, NULL, 800.00, 'pending', '2025-02-06', '2025-02-06 12:03:13'),
  (7890948, 38328498, '0002', 'Bender board for around tree/Along side by fence', NULL, NULL, 410.00, 'pending', '2025-02-06', '2025-02-06 12:06:06'),
  (7893732, 12611577, '0011', '1 light', NULL, NULL, 225.00, 'pending', '2025-02-07', '2025-02-07 08:41:43'),
  (7900756, 38383142, '0014', '1G YARROW MOONSHINE', NULL, NULL, 350.00, 'sold', '2025-02-10', '2025-02-10 13:51:51'),
  (7905378, 38383142, '0015', 'Credit for (2) 24" boxed trees', NULL, NULL, -500.00, 'sold', '2025-02-11', '2025-02-11 13:35:32'),
  (7905385, 38383142, '0016', 'Upgrading Guava tree to 25 gallon', NULL, NULL, 850.00, 'sold', '2025-02-11', '2025-02-11 13:36:13'),
  (7905394, 38383142, '0017', '50/50 soil backfill for planters front/back yard', 'approx 19 yards of soil to backfill planter areas', NULL, 2400.00, 'sold', '2025-02-11', '2025-02-11 13:37:23'),
  (7905901, 38383142, '0018', 'Clean turf glue off concrete', NULL, NULL, 390.00, 'sold', '2025-02-11', '2025-02-11 15:03:27'),
  (7915493, 38328498, '0003', 'Pet Odorizer', NULL, NULL, 450.00, 'pending', '2025-02-13', '2025-02-13 18:01:43'),
  (7918835, 38383142, '0019', 'Add''l Demo (removal of add''l sub base for turf)', NULL, NULL, 2200.00, 'sold', '2025-02-14', '2025-02-14 14:25:09'),
  (7918942, 38078848, '0001', 'Stucco repair', 'Approved via phone call', NULL, 600.00, 'pending', '2025-02-14', '2025-02-14 15:01:56'),
  (7923900, 36641056, '0010', 'Stucco repairs', 'Repairing cracks in the stucco.', NULL, 900.00, 'pending', '2025-02-17', '2025-02-17 16:59:04'),
  (7925621, 37798226, '0003', 'Credits', 'Credit vermiculite $109.48
Credit powerwash rental $48
Credit new gravel $100', NULL, -257.48, 'pending', '2025-02-18', '2025-02-18 09:09:04'),
  (7928043, 38523648, '0001', 'Additional Demo to Remove  thick Concrete', NULL, NULL, 2200.00, 'pending', '2025-02-18', '2025-02-18 14:52:03'),
  (7929516, 32638422, '0018', 'Drain for wall near street', NULL, NULL, 450.00, 'pending', '2025-02-19', '2025-02-19 07:14:06'),
  (7929520, 32638422, '0019', '300W Transformer', NULL, NULL, 575.00, 'sold', '2025-02-19', '2025-02-19 07:14:22'),
  (7929523, 32638422, '0020', '60 Feet of 2"x4" Bender Board', NULL, NULL, 780.00, 'sold', '2025-02-19', '2025-02-19 07:15:23'),
  (7929554, 38235319, '0001', '26 linear feet of main line', NULL, 'Client verbal approval at contract rate per foot.', 754.00, 'pending', '2025-02-19', '2025-02-19 07:19:18'),
  (7934868, 38348765, '0001', 'Remove waterfall', NULL, NULL, 1500.00, 'pending', '2025-02-20', '2025-02-20 08:56:04'),
  (7938439, 38401782, '0001', '35 linear feet of electrical and sub panel', 'For pool equip', NULL, 1500.00, 'sold', '2025-02-21', '2025-02-21 07:10:52'),
  (7938443, 38401782, '0002', '35 feet of electrical plus outlet', NULL, NULL, 1150.00, 'sold', '2025-02-21', '2025-02-21 07:12:11'),
  (7938450, 38401782, '0003', '2 Additional Jets for Spa', NULL, NULL, 0, 'pending', '2025-02-21', '2025-02-21 07:12:52'),
  (7938499, 38401782, '0004', 'Credit/Patio Cover Footings', NULL, NULL, -1200.00, 'sold', '2025-02-21', '2025-02-21 07:23:06'),
  (7940933, 38383142, '0020', 'Additional stucco 20.5 lnft of wall', NULL, NULL, 500.00, 'pending', '2025-02-21', '2025-02-21 15:52:38'),
  (7940934, 37998571, '0003', 'Credit Priv Wall', NULL, NULL, -2800.00, 'pending', '2025-02-21', '2025-02-21 15:53:01'),
  (7940997, 38348765, '0002', 'Plant upgrade', 'To upgrade from (40) 5 gal to (24) 15 gal would be $1610.00
For (8) 5 gal along block wall on other side would be $280

From Moore "Yikes. Ok.  Let’s do it and hope for no more surprises.  

Just fyi.  The guys are working on the step underneath the porch door (with the new stones) and I can’t open the door now.  I’m guessing they probably have a plan but just wanted to bring it up in case they didn’t notice   

Thank you "', NULL, 1890.00, 'pending', '2025-02-21', '2025-02-21 16:49:23'),
  (7943770, 32638422, '0021', 'Design Plan for Front/Side Yard', 'Includes 3D', NULL, 750.00, 'sold', '2025-02-24', '2025-02-24 09:31:42'),
  (7944514, 38401782, '0005', 'Reducing PSI to 3000 from 3500', NULL, NULL, -200.00, 'sold', '2025-02-24', '2025-02-24 11:20:23'),
  (7945982, 37992089, '0009', 'Reseed grass area', 'To use about 5 bags of 50/50 soil, add RTF seed and manure to cover it.
Cost includes materials and labor

Total cost five hundred dollars', NULL, 500.00, 'pending', '2025-02-24', '2025-02-24 14:37:00'),
  (7947300, 38401782, '0006', 'Automation System (Pool)', NULL, NULL, 2800.00, 'sold', '2025-02-25', '2025-02-25 06:52:51'),
  (7947390, 38401782, '0007', '(2) Color Changing Pool Lights', NULL, NULL, 1800.00, 'sold', '2025-02-25', '2025-02-25 07:09:08'),
  (7948014, 36654542, '0001', 'CO 50sq pavers', NULL, NULL, 647.24, 'pending', '2025-02-25', '2025-02-25 08:44:58'),
  (7948404, 33075936, '0005', 'CO 5: RCV Valve for Futrue', NULL, NULL, 5971.26, 'pending', '2025-02-25', '2025-02-25 09:47:01'),
  (7950556, 38348765, '0003', 'Additional lights near pool', 'For additional lights near Pole, these will be spotlights.Total cost seven hundred and fifty dollars', NULL, 750.00, 'sold', '2025-02-25', '2025-02-25 14:41:07'),
  (7951160, 38401782, '0008', 'Side yard', 'Demo approx 300sqft $900
DG/pre stabilized approx 300sqft $1425
Plants $1000', NULL, 3325.00, 'sold', '2025-02-25', '2025-02-25 18:26:26'),
  (7959446, 38850481, '0001', 'Front walkway gravel', 'Adding gravel and metal edging for front walk', NULL, 640.00, 'pending', '2025-02-27', '2025-02-27 15:32:48'),
  (7960803, 34007670, '0007', 'Client Requested 2 additional lights', 'Lights requested were installed.', NULL, 440.00, 'pending', '2025-02-28', '2025-02-28 07:59:17'),
  (7961027, 30512103, '0006', 'Clean Up, Refresh, mulch, gravel.', 'Backyard work.', NULL, 3700.00, 'pending', '2025-02-28', '2025-02-28 08:33:55'),
  (7961395, 38401782, '0009', '2 Irrigation Drips', NULL, NULL, 2400.00, 'sold', '2025-02-28', '2025-02-28 09:25:59'),
  (7961862, 38401782, '0010', 'Concrete Walkway (curb to gate)', NULL, NULL, 0, 'pending', '2025-02-28', '2025-02-28 10:56:07'),
  (7962936, 38774894, '0001', 'Pool/Trenching for utilities', 'td { border: 1px solid rgba(204, 204, 204, 1) }
br { }

	
		
		
	
	
		
			Pool
			$131,900.00
		
		
			Plan Redesign
			$1,200.00
		
		
			Trenching and backfilling for utilities
			$7,600.00
		
		
			Electrical for BBQ and sub pump area
			$3,750.00
		
	


Pool
Layout new pool & spa per plan, approx. 17’ x 34’
Dig pool area
Install deepend key based on architectural plan approx 2.5’. WIll be determined by city soil
engineer. Quote is for a 2.5’ deepend footing along with the 6” floor for a total of 3’
Set forms for pool, spa, and damwall
Pour 3000 PSI Shotcrete, approx.
Install standard mini pebble finish
Install 176 linear feet of 6” waterline tile for pool and spa (Material allowance: up to $9.50/sf)
Install 6” ceramic tile for dam wall, approx. 12 linear feet
Install ‘Bellecrete’ brand precast coping (Color: TBD)
Install (1 qty.) new ‘Jandy’ brand nichless RGB color lights
Install 2 standard led pool light in rgb
Install ‘Jandy’ brand 2.7 HP variable speed pump
Install ‘Jandy’ brand CV580 cartridge filter
Install ‘Jandy’ brand ‘JXI400N’ 400K BTU heater
Install ‘Jandy’ brand ‘Aqualink RS-P4’ 4-station automation
Install electric sub-panel at pool equipment
Includes standard plumbing
Install motorized pool cover
Install saltwater equipment and chlorinator


Plan redesign
Redesign landscape and backyard hardscape with lighting plan and outdoor bbq areas.
Will survey existing elevations of backyard to determine height of pool relative to back slope and
Rear patio area.

Utilities
Run new electrical to the bbq area with stub out and future gfci. Allowance of 50 feet
Allowance of 100 linear feet to sub pump electrical

Trenching
For main utilities -Gas from street to meter – electrical street to panel.
Sewer trenches in back. Recompact in 8 inch lifts', NULL, 144450.00, 'pending', '2025-02-28', '2025-02-28 14:04:10'),
  (7963076, 35259913, '0018', 'Salt system for pool', 'Approved via text', NULL, 2940.00, 'pending', '2025-02-28', '2025-02-28 14:43:58'),
  (7966464, 38401782, '0011', 'Wall rebuild (block and waterproof)', 'Remove existing brick/dispose
Dowel into existing footing and install 2 courses of 6” block, grout lift
Waterproof back of wall', NULL, 3200.00, 'sold', '2025-03-03', '2025-03-03 10:41:16'),
  (7970334, 36551611, '0001', 'Remove 2 trees w/stump grind', NULL, NULL, 900.00, 'pending', '2025-03-04', '2025-03-04 08:29:26'),
  (7970907, 38401782, '0012', 'Additional 15- gal cherries', NULL, NULL, 3300.00, 'sold', '2025-03-04', '2025-03-04 09:51:09'),
  (7971168, 38523648, '0002', 'Stucco Repair and Transformer', '1) Install new transformer and rewire step lighting - $407
2) Stucco work (2 trips) - $633', NULL, 1040.00, 'sold', '2025-03-04', '2025-03-04 10:31:29'),
  (7971187, 35220019, '0012', 'Gate Credit', NULL, NULL, -300.00, 'sold', '2025-03-04', '2025-03-04 10:33:27'),
  (7973393, 37542899, '0002', 'misc planting', 'Planting & Mulch
Till and amend planting area soil, approx. 300 square feet
Install the following plant sizes/quantities:
(14 qty.) 24 in box upgraded from 15 gallons
(47 qty.) 5 gal shrubs
55 15 gallon plants
150 sq ft of brown shredded mulch w/o weed barrier', NULL, 13000.00, 'sold', '2025-03-04', '2025-03-04 16:40:41'),
  (7976854, 38797233, '0001', 'Sawcut & remove approx 80sf of patio $1062', NULL, NULL, 1062.00, 'pending', '2025-03-05', '2025-03-05 12:23:55'),
  (7977104, 35942318, '0016', 'CREDIT DESIGN', NULL, NULL, -1200.10, 'pending', '2025-03-05', '2025-03-05 12:55:58'),
  (7979605, 35259913, '0019', 'Permits wall & pool plaster 151.42+246.66', NULL, NULL, 398.08, 'pending', '2025-03-06', '2025-03-06 08:08:30'),
  (7986985, 37155041, '0007', 'Erosion Control and Extra Drainage', 'Erosion channel next to concrete stair runoff.  Install jute netting and 2 new catch basins.  Install drain system. to exit point.', NULL, 800.00, 'pending', '2025-03-09', '2025-03-09 05:22:57'),
  (7996490, 37690129, '0001', 'Electrical Rough and Lighting', 'Electrical Rough In for Parking Lights – 4,370 linear feet
 

	Trench soils down 30” below final grade (assuming site at – 4 inches)
	Trench soils 6 inches wide
	Install 3/4 inch electrical conduit.  (Note, spec from plan shows 3 #8 conductors. This can be installed at max capacity for ½ but with the length of run this can be problematic. 1 inch may even be better for ease of pull. 
	Install 6 inch conduit sanding layer per specification.
	Back fill and machine tamp trench first 6 inch layer to 95% proctor standard using pneumatic tamper with 6” foot.
	Add in 6 inch wide electrical burial warning tape. 
	Back fill additional trenching material and compact in lifts with pneumatic tamper.
	Conductors by other


COST $118,000

Parking Light Pole Base Installation – Sonotube “Finish Free” 27 units
(Other contractor to provide bolt pattern plate or template based upon lighting chosen)
 

	Dig 2’ wide x 4’ deep hole for each lamp base.
	Haul spoils
	Install rebar cage per plan
	Locate appropriate conduit termination
	Install (4) #4 vertical rebar and tie in
	Install (4) #4 horizontal rebar and tie in.
	Install concrete J bolt anchoring w/ (4)-3/4”x 32” bolts with level and anchoring nuts
	Install Sonotube “Finish Free” 24 inch form.
	Install Bracing for tubing for plumb and level.
	Install Jbolt template
	Pour 3000 PSI concrete for each tube.
	Site finish top and tool camfer


COST $45,900


ESTIMATE TOTAL $163,900', NULL, 163900.00, 'pending', '2025-03-11', '2025-03-11 17:12:55'),
  (8001187, 38235319, '0002', 'Credit for removal of gravel', NULL, NULL, -3460.00, 'pending', '2025-03-12', '2025-03-12 19:10:48'),
  (8001188, 38235319, '0003', 'Upgrade tree sizes from 15g to 36"', '1 African sumac
1 tristania tree
1 strawberry tree', NULL, 3150.00, 'pending', '2025-03-12', '2025-03-12 19:12:15'),
  (8001214, 38235319, '0004', 'Adding more plants', '1 36 in box at 1250
3 15 gallon fruit trees at 300 each
(10) 15 gallon podacarpis hedge for seating area $130 each
15 5 gallons at 42.50 each 
10 1 gallons at 21.50 each 
 Total cost $4302.50', NULL, 4350.00, 'pending', '2025-03-12', '2025-03-12 19:28:57'),
  (8002627, 33375865, '0004', 'Change Order Date: 2/4/25', 'Date of Work Item Description Total Cost
5/14/2024 on Install Added Rebar $3,799
/3/2024 on Install 7 Extra Feet of Wall $3,738
9/10/2024 on Rough Grading Work $26,237
N/A Credit - Planting, Soils Specs -$7,703
N/A Credit - Remove Flashing/Mesh from Wall -$2,800', NULL, 21271.00, 'pending', '2025-03-13', '2025-03-13 08:47:39'),
  (8003847, 37869167, '0001', 'CO - Deputy Inspector', NULL, NULL, 1200.00, 'pending', '2025-03-13', '2025-03-13 11:54:17'),
  (8003850, 37869167, '0002', 'Permit Fees', NULL, NULL, 1005.20, 'pending', '2025-03-13', '2025-03-13 11:54:48'),
  (8003868, 38203350, '0002', '2 pygmy palms', 'Install 2 pygmy plants. Priced at $75each and irrigate also charge 2 hours of labor at $80 an hour.

(UPDATE)  We are going to waive the labor cost as a courtesy to the client.', NULL, 150.00, 'pending', '2025-03-13', '2025-03-13 11:57:18'),
  (8004076, 38401782, '0013', 'Concrete Pad (front entry to curb)', '32sqft', NULL, 500.00, 'sold', '2025-03-13', '2025-03-13 12:29:05'),
  (8005188, 35776830, '0006', 'Additional 15 gallon Shrub', NULL, NULL, 200.00, 'pending', '2025-03-13', '2025-03-13 16:15:05'),
  (8005281, 36989161, '0004', 'Spa Blower', NULL, NULL, 800.00, 'pending', '2025-03-13', '2025-03-13 17:08:24'),
  (8010859, 35259913, '0020', 'Add 2 vents on fireplace', NULL, NULL, 400.00, 'pending', '2025-03-17', '2025-03-17 06:59:08'),
  (8010862, 35259913, '0021', 'Add drainage to pool equipment area', NULL, NULL, 500.00, 'pending', '2025-03-17', '2025-03-17 06:59:47'),
  (8010876, 38819021, '0001', 'Repair electrical', NULL, NULL, 470.00, 'sold', '2025-03-17', '2025-03-17 07:02:57'),
  (8013985, 38401782, '0014', 'Shut off Valve', NULL, NULL, 125.00, 'pending', '2025-03-17', '2025-03-17 14:12:25'),
  (8015453, 36551611, '0002', 'Remove 6 mid size crape myrtle trees', NULL, NULL, 1800.00, 'sold', '2025-03-18', '2025-03-18 06:30:46'),
  (8015463, 38819021, '0003', 'About 40 LF. 4" drain line added 2 inlets', NULL, NULL, 1080.00, 'sold', '2025-03-18', '2025-03-18 06:32:24'),
  (8015494, 38819021, '0004', '30LF of 3/4"electrical conduit/wire/outlet', NULL, NULL, 200.00, 'pending', '2025-03-18', '2025-03-18 06:40:00'),
  (8015523, 37890729, '0001', 'Additional Pool Demo', NULL, NULL, 1800.00, 'sold', '2025-03-18', '2025-03-18 06:44:52'),
  (8015531, 37890729, '0002', 'Drains', 'Bury downspouts along side/back of property', NULL, 750.00, 'sold', '2025-03-18', '2025-03-18 06:45:41'),
  (8015572, 38819021, '0005', 'Additional pavers', '120 Sq ft of additional pavers', NULL, 2160.00, 'sold', '2025-03-18', '2025-03-18 06:54:13'),
  (8015593, 38819021, '0006', 'Credits', 'Removal of Edging and rock', NULL, -815.00, 'sold', '2025-03-18', '2025-03-18 06:57:35'),
  (8019349, 38797233, '0002', 'Electrical conduit', 'Trenching and installing 65 linear feet of electrical conduit.
$11 per linear foot', NULL, 715.00, 'sold', '2025-03-18', '2025-03-18 17:18:51'),
  (8019352, 38797233, '0003', 'Installing reused tile of face of patio', 'Installing 15 linear feet of reused tile over face of demoed patio to cover exposed concrete past where new planters will be located
$20 per linear foot', NULL, 300.00, 'sold', '2025-03-18', '2025-03-18 17:21:09'),
  (8019358, 38797233, '0004', 'Half of additional material', 'Half of the cost for the additional material
Total was $1067 we are covering half the cost of the material because of additional cuts that needed to be made.', NULL, 533.50, 'sold', '2025-03-18', '2025-03-18 17:26:28'),
  (8021000, 38797233, '0005', 'Drainage addition', NULL, NULL, 340.00, 'pending', '2025-03-19', '2025-03-19 08:32:21'),
  (8026092, 37890729, '0003', 'DG for Past Front Gate aligning with Driveway', NULL, NULL, 700.00, 'sold', '2025-03-20', '2025-03-20 09:31:55'),
  (8026097, 37890729, '0004', 'Concrete for HVAC and Shed in Side Yard', NULL, NULL, 700.00, 'sold', '2025-03-20', '2025-03-20 09:32:40'),
  (8032385, 38913440, '0001', 'CREDIT Precast Steppers', NULL, NULL, -1610.00, 'pending', '2025-03-21', '2025-03-21 17:21:08'),
  (8040245, 37542899, '0003', 'Additional metal Edging', 'Contract has 80 linear feet alloted.

140 linear feet will be needed

60 linear feet additional at $900', NULL, 900.00, 'sold', '2025-03-25', '2025-03-25 10:21:26'),
  (8048392, 38913440, '0002', 'Socal 93 lime green', NULL, NULL, 5000.00, 'pending', '2025-03-27', '2025-03-27 06:53:32'),
  (8048396, 38913440, '0004', 'Additional metal edging', NULL, NULL, 450.00, 'pending', '2025-03-27', '2025-03-27 06:54:18'),
  (8048401, 38913440, '0005', 'Bender board brown 2x4 plastic', '30 linear feet for storage unit (side yard)', NULL, 300.00, 'pending', '2025-03-27', '2025-03-27 06:55:01'),
  (8048404, 38913440, '0006', 'Additional 2 path lights', NULL, NULL, 400.00, 'pending', '2025-03-27', '2025-03-27 06:55:29'),
  (8049292, 31736833, '0022', 'CO 4 Adj', NULL, NULL, 675.00, 'pending', '2025-03-27', '2025-03-27 09:14:30'),
  (8049402, 32638422, '0022', '(4) 15G Privet', NULL, NULL, 600.00, 'sold', '2025-03-27', '2025-03-27 09:32:25'),
  (8050944, 32638422, '0023', '1 additional 15 gallon privet', 'Client wants one additional fifteen gallon privet', NULL, 150.00, 'sold', '2025-03-27', '2025-03-27 13:02:41'),
  (8055668, 38913440, '0007', 'Decomposed Granite for Sheds', NULL, NULL, 400.00, 'pending', '2025-03-28', '2025-03-28 15:35:51'),
  (8055679, 38913440, '0008', '35 linear feet of drainage with 3 inlets', NULL, NULL, 770.00, 'pending', '2025-03-28', '2025-03-28 15:41:14'),
  (8055691, 38913440, '0009', 'Credit for Dymondia', NULL, NULL, -500.00, 'pending', '2025-03-28', '2025-03-28 15:48:40'),
  (8055795, 38235319, '0005', 'Electrical conduit run to fountain area', 'conduit run from rear corner of property to fountain area', NULL, 680.00, 'pending', '2025-03-28', '2025-03-28 17:36:58'),
  (8055804, 38235319, '0006', 'Additional plants', '(4) podacarpus 15 gallon
(4) 24" sumac trees 
(16) 10 foot lodge pole stakes
5 feather reed grasses 5galllon
1 15 gallon patio great majestic beauty', NULL, 3275.00, 'pending', '2025-03-28', '2025-03-28 17:49:09'),
  (8067371, 37542899, '0004', 'Upgrade of rock to Arizona River rock', 'Upgrade to Arizona River rock', NULL, 1400.00, 'sold', '2025-04-02', '2025-04-02 07:40:05'),
  (8067657, 37542899, '0005', 'Additional plants', '7 5 gallon privets
4 24 inch box podacarpus
1) 15 gallon boxwood
3 15 gallon texas privets', NULL, 2275.50, 'sold', '2025-04-02', '2025-04-02 08:24:33'),
  (8068153, 38904439, '0001', 'Adding (1) light', NULL, NULL, 250.00, 'sold', '2025-04-02', '2025-04-02 09:42:59'),
  (8084548, 39565852, '0001', 'Credit for 100 feet of gas line cook ctr to equip', NULL, NULL, -2134.00, 'sold', '2025-04-07', '2025-04-07 17:24:38'),
  (8084550, 39565852, '0002', 'Credit for Pool Heater', NULL, NULL, -3147.00, 'sold', '2025-04-07', '2025-04-07 17:25:01'),
  (8088494, 39433159, '0001', 'Eng for fireplace', 'Hi John- 


Thank you!! Is permit processing started for electrical and gas? Please confirm. Don’t want to get caught in delays. 

Thank you! 

Lisa 


Sent from the all new AOL app for iOS
 
On Tuesday, April 8, 2025, 1:21 PM, John Durso  wrote:

Hi Andrew & Lisa,

The fireplace engineering will cost $1050 (our direct cost) and will be ready in approximately 3 weeks. Once we have that, we will be able to go in and start permit process. 
You will be receiving an invoice for that amount. Please  let me know if you have any questions or concerns?', NULL, 1050.00, 'pending', '2025-04-08', '2025-04-08 14:09:46'),
  (8093861, 39405668, '0001', '40sqft of Veneer for Existing Wall', 'Front/Left side of wall', NULL, 1212.00, 'sold', '2025-04-09', '2025-04-09 15:59:27'),
  (8096276, 39141320, '0001', '64 linear feet of gas conduit', '18 linear feet of gas in original contract for a total of 82 feet', NULL, 1465.00, 'sold', '2025-04-10', '2025-04-10 09:55:14'),
  (8096378, 39141320, '0002', '30'' Electrical Conduit plus 5 outlets', NULL, NULL, 373.00, 'sold', '2025-04-10', '2025-04-10 10:09:39'),
  (8099843, 38235319, '0007', 'Adding Medium Nugget Mulch to backyard', '865 sqft of Medium nugget Mulch', NULL, 1964.00, 'pending', '2025-04-11', '2025-04-11 07:50:59'),
  (8099851, 38235319, '0008', 'Credit for Planting in the front', 'Removing Planting Hedge in the front yard beneath the wall.', NULL, -360.00, 'pending', '2025-04-11', '2025-04-11 07:52:00'),
  (8100050, 39006191, '0001', 'Dimmer', NULL, NULL, 200.00, 'pending', '2025-04-11', '2025-04-11 08:21:25'),
  (8102306, 39406205, '0001', 'Additional elec trenching', NULL, NULL, 677.00, 'pending', '2025-04-11', '2025-04-11 15:28:11'),
  (8102432, 38913579, '0001', 'CO rachio cover', NULL, NULL, 40.00, 'pending', '2025-04-11', '2025-04-11 17:42:37'),
  (8102598, 37807802, '0003', 'Wood for fence', NULL, NULL, 560.00, 'sold', '2025-04-12', '2025-04-12 09:14:25'),
  (8102904, 38904439, '0002', 'Update lower steps to Cantilevered', '(4) 6’ long steps to change to be cantilever in the lower yard area', NULL, 480.00, 'sold', '2025-04-13', '2025-04-13 10:25:51'),
  (8103507, 38913579, '0002', 'Additional edger', '42 linear feet of additional Edging', NULL, 1680.00, 'pending', '2025-04-14', '2025-04-14 04:22:17'),
  (8104754, 39352943, '0001', 'Trim Ficus Tree', NULL, NULL, 80.00, 'pending', '2025-04-14', '2025-04-14 09:00:21'),
  (8104797, 39352943, '0002', 'Vine trim (neighbors)', NULL, NULL, 200.00, 'pending', '2025-04-14', '2025-04-14 09:05:57'),
  (8107124, 38904439, '0004', 'Update existing irrigation with (2)? new valves', NULL, NULL, 440.00, 'sold', '2025-04-14', '2025-04-14 14:25:54'),
  (8112533, 37890729, '0005', 'Credit for Pool Equipment', NULL, NULL, -7200.00, 'sold', '2025-04-15', '2025-04-15 16:09:10'),
  (8113897, 35259913, '0022', 'Upgrade 24" olive to 36" box', 'Upgrade existing twenty four inch olive to a thirty six inch box, olive fruitless', NULL, 600.00, 'pending', '2025-04-16', '2025-04-16 07:35:14'),
  (8118921, 37890729, '0006', 'Aqualink Automation System', 'Includes install', NULL, 2781.00, 'sold', '2025-04-17', '2025-04-17 08:13:00'),
  (8119848, 36220457, '0004', 'Credit', 'Credit for implied  pots', NULL, -250.00, 'pending', '2025-04-17', '2025-04-17 10:30:09'),
  (8124796, 39747782, '0001', 'Electrical EV Hookup', 'Trench and run 75 linear feet of 220V electric from meter to EV location at front corner of house 
Install dedicated 40 amp breaker at meter

*Permits required for utilities and is not included in this price', NULL, 1779.00, 'pending', '2025-04-18', '2025-04-18 16:44:52'),
  (8124814, 38904439, '0005', 'Add 9 LF to pink slump retaining wall', 'Needed to make the lump wall, a little bit higher to retain the soil from the oak tree area. 
9 LF (One course higher)', NULL, 100.00, 'sold', '2025-04-18', '2025-04-18 17:23:25'),
  (8124817, 38904439, '0006', 'Add 13LF of cantilever to bench patio area', 'To match steps , top level area of patio should also be cantilever.', NULL, 195.00, 'sold', '2025-04-18', '2025-04-18 17:26:54'),
  (8124828, 38904439, '0008', 'Little retaining wall connecting court w plants', '20” long 8” thick poured in place concrete little retaining wall to meet basketball court corner.
Wall connects to bball court concrete area, thus closing off the planter. Includes waterproofing.

See photo attached.', NULL, 325.00, 'sold', '2025-04-18', '2025-04-18 17:48:33'),
  (8124832, 38904439, '0009', 'Credit for Boulders', 'Don’t need to order boulders!! So many on site.', NULL, -100.00, 'sold', '2025-04-18', '2025-04-18 17:52:27'),
  (8124834, 38904439, '0010', 'Add 8” of sports court concrete', NULL, NULL, 150.00, 'sold', '2025-04-18', '2025-04-18 17:53:53'),
  (8124836, 38904439, '0011', 'Extend little curb wall 8” to meet new court edge', 'No charge', NULL, 0, 'sold', '2025-04-18', '2025-04-18 17:54:44'),
  (8124840, 38904439, '0012', 'Add (1) course 8” CMU block for 32 LF', '32 LF of CMU 8x8x16 grey block with smooth stucco and dowel ins.', NULL, 770.00, 'sold', '2025-04-18', '2025-04-18 18:05:48'),
  (8124843, 38904439, '0014', '55 LF SDR 4” pipe out to front yard', 'Water will now go to street (halfway down natural concrete swale)', NULL, 1375.00, 'sold', '2025-04-18', '2025-04-18 18:08:17'),
  (8124847, 38904439, '0015', 'Add 16 SF of concrete', 'NO CHARGE ($135 value)

Nearest A/C unit, needs to meet pathway on side of house. 16 SF
(See photo of drawing)', NULL, 0, 'sold', '2025-04-18', '2025-04-18 18:16:47'),
  (8124859, 38904439, '0016', '#12 low-boy + soil removal', 'Normal price per low boy $875 includes dump fees

***Labor per low boy separate (these are man hours not material)', NULL, 800.00, 'sold', '2025-04-18', '2025-04-18 18:44:22'),
  (8127783, 38904439, '0017', '36 SF concrete near side gate', NULL, NULL, 275.00, 'sold', '2025-04-21', '2025-04-21 11:39:44'),
  (8127834, 38904439, '0018', 'Credit for saw cutting', 'We had 32LF in the contract and we used 6LF', NULL, -195.00, 'sold', '2025-04-21', '2025-04-21 11:44:48'),
  (8127847, 38904439, '0019', 'Credit for not retaining 4 x 3 of planter', NULL, NULL, -829.00, 'sold', '2025-04-21', '2025-04-21 11:46:18'),
  (8127902, 38904439, '0020', 'Slump wall +2.5LF', 'We needed 2.5 lineal feet to clear the curve of the existing slump wall. Original measurement was 12LF.
The wall will have waterproofing but not the French drain so this cost includes a small credit for the French drain of -$100.

Juan spaced out the blocks at the bottom to allow weeping.(The rest of slump wall has no drainage plus soil is very dry)', NULL, 234.00, 'sold', '2025-04-21', '2025-04-21 11:53:39'),
  (8128221, 38904439, '0021', 'Cantilever all remaining steps approx 83.6 LF', 'See updated design in email dated 4/21', NULL, 1252.00, 'sold', '2025-04-21', '2025-04-21 12:37:05'),
  (8129159, 37890729, '0007', '100sqft of sod', NULL, NULL, 500.00, 'sold', '2025-04-21', '2025-04-21 15:23:07'),
  (8129236, 37604325, '0002', 'Credit for wall, swapping to step', NULL, NULL, -5700.00, 'pending', '2025-04-21', '2025-04-21 15:49:38'),
  (8129380, 38904439, '0022', 'Add 18 SF 4” of Grey concrete to make triangle', NULL, NULL, 137.00, 'sold', '2025-04-21', '2025-04-21 16:46:03'),
  (8134018, 37604325, '0003', 'Sewer Permits', 'Permit Costs For the Sewer Permit', NULL, 309.00, 'pending', '2025-04-22', '2025-04-22 15:14:39'),
  (8134024, 37604325, '0004', 'Rerouting Sewer Line', 'Cutting existing sewer
Trenching for New sewer line
Installing New Sewer Line', NULL, 3500.00, 'pending', '2025-04-22', '2025-04-22 15:15:50'),
  (8134028, 37604325, '0005', 'Demo For Additional Wall', 'Demo For Extra Pool wall that was uncovered during Excavation.', NULL, 1100.00, 'pending', '2025-04-22', '2025-04-22 15:16:39'),
  (8134034, 37604325, '0006', 'Additional Demo for Brick planter and steps.', 'Removing existing Brick Planter Including Plants and Steps to door.', NULL, 1200.00, 'pending', '2025-04-22', '2025-04-22 15:17:50'),
  (8134239, 39406460, '0001', 'Moving equipment from side yard to rear yard', 'Would need 35 linear feet of electrical more and 60 linear feet of gas more', NULL, 2850.00, 'pending', '2025-04-22', '2025-04-22 16:19:56'),
  (8138884, 36148606, '0003', 'Topcast finish for concrete', 'Topcast finish on concrete', NULL, 175.00, 'pending', '2025-04-23', '2025-04-23 16:15:10'),
  (8139188, 39353081, '0001', 'Up light for front tree', NULL, NULL, 220.00, 'sold', '2025-04-23', '2025-04-23 18:52:12'),
  (8143252, 39405668, '0002', 'Driveway Renovation', 'Paver install includes demo approx 794sqft', NULL, 15636.00, 'sold', '2025-04-24', '2025-04-24 16:35:25'),
  (8143257, 39405668, '0003', 'Drainage extension from top of driveway', 'approx 25 linear feet to pop out into side garden', NULL, 550.00, 'sold', '2025-04-24', '2025-04-24 16:41:22'),
  (8143260, 39405668, '0004', 'Concrete for Sidewalk', 'Remove 148sqft of concrete and replace  conrete light broom finish', NULL, 3308.00, 'sold', '2025-04-24', '2025-04-24 16:44:06'),
  (8145186, 37890729, '0008', 'Front Yard Install', 'See attached estimate', NULL, 15170.00, 'sold', '2025-04-25', '2025-04-25 10:18:46'),
  (8156418, 39406205, '0002', 'Demo 3x3 concrete pad', NULL, NULL, 300.00, 'pending', '2025-04-29', '2025-04-29 14:47:19'),
  (8156763, 39406205, '0003', 'Plants', NULL, NULL, 5467.00, 'pending', '2025-04-29', '2025-04-29 16:36:15'),
  (8159725, 38912565, '0001', 'Permit Fees', 'To: Beverly Hills Building Department
Date: 04/15/25
Pool Permit: $3,632.84
Plumbing Permit: $268.99
Electrical Permit: $268.99
Total: $4,170.82', NULL, 4170.82, 'sold', '2025-04-30', '2025-04-30 11:27:01'),
  (8160435, 39405668, '0005', 'Paver Wall Cap for Wall', 'Angeuls Stonewall II  wallcap in grey/charcoal', NULL, 1125.00, 'sold', '2025-04-30', '2025-04-30 12:53:13'),
  (8161779, 39747782, '0002', 'Sewer pipe lateral line to shower location', '63 linear feet from crawl space to shower location', NULL, 4000.00, 'pending', '2025-04-30', '2025-04-30 19:10:36'),
  (8161786, 39747782, '0003', '(2) Copper pipe laterals water tank to shower', NULL, NULL, 3150.00, 'pending', '2025-04-30', '2025-04-30 19:17:00'),
  (8161787, 39747782, '0004', '3 permits', 'electrical, sewer, drainage', NULL, 350.00, 'pending', '2025-04-30', '2025-04-30 19:18:13'),
  (8161789, 39747782, '0005', 'Hose Bib', NULL, NULL, 250.00, 'pending', '2025-04-30', '2025-04-30 19:18:45'),
  (8161791, 39747782, '0006', 'Concrete Saw Cut, patching,', 'Saw cut  20'' of concrete on side of house from crawl space to corner of house in order to trench sewer line
Includes patching (repouring conrcrete and coring through crawl space entrance)', NULL, 1300.00, 'pending', '2025-04-30', '2025-04-30 19:21:05'),
  (8165577, 39405668, '0006', 'Add''l 85sqft of Pavers for Driveway', NULL, NULL, 1673.00, 'sold', '2025-05-01', '2025-05-01 13:45:45'),
  (8169444, 38644965, '0001', '4 linear feet more of bbq', '2 linear feet added on both sides for a total of 4 linear feet', NULL, 1800.00, 'pending', '2025-05-02', '2025-05-02 13:38:14'),
  (8169452, 38644965, '0002', 'Sport court additional sq ft with turf credit', '$Cost difference is 8.33 a sq ft', NULL, 3731.84, 'pending', '2025-05-02', '2025-05-02 13:39:37'),
  (8169465, 38644965, '0003', 'credit of 78 sq ft of steppers', NULL, NULL, -1628.00, 'pending', '2025-05-02', '2025-05-02 13:41:49'),
  (8169472, 38644965, '0004', 'Adding concrete patio by sports court', '220 sq ft of concrete patio by sports court
also to credit turf for applicable square footage', NULL, 1050.00, 'pending', '2025-05-02', '2025-05-02 13:43:16'),
  (8169474, 38644965, '0005', 'Removal of concrete bby fire pit', NULL, NULL, 500.00, 'pending', '2025-05-02', '2025-05-02 13:43:45'),
  (8169863, 39406205, '0004', 'Dg upgrade - Miners Gold DG - Stabilized', 'Change from Del Rio to Miners Gold DG - STABILIZED DG. Compact dg. No edging. Customer understands that slope will not contain dg indefinitely', NULL, 650.00, 'pending', '2025-05-02', '2025-05-02 16:14:42'),
  (8169930, 37604325, '0007', 'upgrade to white concrete', '1850 sq ft of concrete in white cement. 
includes 15 linear feet of a new step
white concrete at $20 sf', NULL, 37600.00, 'pending', '2025-05-02', '2025-05-02 17:26:11'),
  (8169943, 37604325, '0008', 'bbq increase', '46 linear feet of block compared to 34 with more smooth stucco and a larger bar seating area 11lf
90 sq ft of countertop vs 56 in original', NULL, 4680.00, 'pending', '2025-05-02', '2025-05-02 17:33:35'),
  (8169949, 37542899, '0006', 'CO 5/2/2025', 'cost for the lights (without materials) and transplants is $2880
 
cost for 13 1 gallons standard plants $286
cost for 2 5 gallon agave and 10 5 gallon boxwood is $540
there was an existing change order for the additional metal edging for $900 60 linear feet
 
 
upgrading the (5)24" box to 10gal Buxus Winter Gem globe from Boething will add $650', NULL, 5256.00, 'sold', '2025-05-02', '2025-05-02 17:35:47'),
  (8174502, 38904439, '0023', 'Labor for planting (8) extra plants', NULL, '(3) 7g Birds of Paradise
(3) 5g Agave attenuata
(1) 5g Coral Aloe
(1) 7g Aloe Vera

TOTAL PLANTS on site to reuse: 8', 175.00, 'sold', '2025-05-05', '2025-05-05 14:44:47'),
  (8175144, 39352943, '0003', 'Credit for (2) area drain inlets', NULL, NULL, -110.00, 'sold', '2025-05-05', '2025-05-05 18:20:08'),
  (8175148, 39352943, '0004', 'Credit for (1) 15 gallon Shrub (Podocarpus)', NULL, NULL, -98.00, 'sold', '2025-05-05', '2025-05-05 18:22:17'),
  (8175152, 39352943, '0005', 'Credit for (1) Century Plant', NULL, NULL, -58.00, 'sold', '2025-05-05', '2025-05-05 18:23:56'),
  (8177995, 9912505, '0010', 'CO Bryan', NULL, NULL, 550.00, 'pending', '2025-05-06', '2025-05-06 11:18:18'),
  (8181948, 36148606, '0004', 'Credit fine', NULL, NULL, -100.00, 'sold', '2025-05-07', '2025-05-07 09:01:56'),
  (8182141, 35259913, '0023', 'See plan ''Patatian Addtl Plants''', 'See plan ''Patatian Addtl Plants''', 'See plan', 3100.00, 'pending', '2025-05-07', '2025-05-07 09:29:30'),
  (8182948, 36148606, '0005', 'Brown Shredded Mulch', 'Around Palm tree and small area for existing planter
Around Clivia and Crepe Myrtle', NULL, 200.00, 'sold', '2025-05-07', '2025-05-07 11:21:07'),
  (8182953, 36148606, '0006', 'Organic Soil Amendment', 'New planter
Existing planter with palm tree/boulders/replanted plants', NULL, 200.00, 'sold', '2025-05-07', '2025-05-07 11:21:56'),
  (8182954, 36148606, '0007', 'Brick Removal for planter', NULL, NULL, 75.00, 'sold', '2025-05-07', '2025-05-07 11:22:13'),
  (8182967, 36148606, '0008', 'Fixing Irrigation', 'Planter with Clivia, planter with palm tree and replanted Liriope/Mondo', NULL, 250.00, 'sold', '2025-05-07', '2025-05-07 11:23:23'),
  (8182973, 36148606, '0009', 'Sod for small area near steps/walkway', 'St Augustine', NULL, 300.00, 'sold', '2025-05-07', '2025-05-07 11:24:22'),
  (8182982, 36148606, '0010', 'Additional Spot Light', NULL, NULL, 200.00, 'sold', '2025-05-07', '2025-05-07 11:24:49'),
  (8182986, 36148606, '0011', 'Replanting existing Liriope/Mondo', NULL, NULL, 75.00, 'sold', '2025-05-07', '2025-05-07 11:25:06'),
  (8182991, 36148606, '0012', 'Importing 1 yard of Soil', NULL, NULL, 125.00, 'sold', '2025-05-07', '2025-05-07 11:25:27'),
  (8183188, 39405668, '0007', 'Credit for Stucco on Wall', NULL, NULL, -642.00, 'sold', '2025-05-07', '2025-05-07 11:52:16'),
  (8183282, 39405668, '0008', '15 linear feet of Wall for Neighboring Side', 'Includes Wall Veneer', NULL, 3284.00, 'sold', '2025-05-07', '2025-05-07 12:01:34'),
  (8191149, 39645431, '0001', 'Additional 4 lights', NULL, NULL, 600.00, 'pending', '2025-05-09', '2025-05-09 08:28:17'),
  (8191160, 39645431, '0002', 'Demo 3 LF. Wall and rebuild', 'Demo 3 LF. Wall and rebuilt at 2 feet high for steps return pip with stucco', NULL, 530.00, 'pending', '2025-05-09', '2025-05-09 08:30:06'),
  (8191163, 39645431, '0003', 'Additional 30 LF. Drainage', NULL, NULL, 800.00, 'pending', '2025-05-09', '2025-05-09 08:30:48'),
  (8191334, 38774894, '0003', 'Misc items', '3,300 sq ft Segmented concrete  step pads 

Topcast finished concrete-$53,500.00
50 linear feet of concrete curbing up to 10 inches high. $3,000

Walls                  

101 linear feet of 3’ tall cmu  retaining wall with an 18inch footing $13,975

62 linear feet of garden wall in front yard heights up to 30” with smooth stucco finish. Includes waterproofing – $10,700.00
turf strips-$15,770

site prep for walls and compaction/backfill $5,000', NULL, 101945.00, 'pending', '2025-05-09', '2025-05-09 08:52:52'),
  (8200695, 35776830, '0007', 'Lighting Credit', 'Credit for 7 lights at $220 each.', NULL, -1540.00, 'pending', '2025-05-13', '2025-05-13 08:56:52'),
  (8210701, 39742790, '0001', 'Plant Material', 'Selection of 1 and 5 gallon plants', NULL, 2000.00, 'sold', '2025-05-15', '2025-05-15 08:57:56'),
  (8210751, 39590939, '0001', 'Additional Concrete for 97sqft', NULL, NULL, 1000.00, 'pending', '2025-05-15', '2025-05-15 09:07:35'),
  (8211324, 13718259, '0002', 'Change order', 'Estimate for
 Devin Bennet
17429 covello st

Plants 
10 flats of orange hardy ice plant 

Decomposed granite 
1 yard of Stabilized dg 

Gravel
1 1/2 yards of Mexican beach pebble black 

Weed fabric on gravel area 

 Total cost: 3,500', NULL, 3500.00, 'sold', '2025-05-15', '2025-05-15 10:33:18'),
  (8213223, 38644965, '0006', 'Timber one row across the back wall', NULL, NULL, 2800.00, 'pending', '2025-05-15', '2025-05-15 15:33:22'),
  (8217370, 39433102, '0001', 'Additional Edging & electrical', NULL, NULL, 500.00, 'pending', '2025-05-16', '2025-05-16 16:33:59'),
  (8221956, 39590939, '0002', 'CREDIT - gutter repair', NULL, NULL, -1040.00, 'pending', '2025-05-19', '2025-05-19 14:33:30'),
  (8222487, 38904439, '0024', 'Plant (2) 15 gal fruit trees', 'Client to buy 2 fruit trees. Cost is for labor only.', NULL, 50.00, 'pending', '2025-05-19', '2025-05-19 17:24:51'),
  (8222499, 38904439, '0025', '875 SF install sod with amendments', 'Install 875 SF sod (purchased by client) with amendments only', NULL, 2187.00, 'pending', '2025-05-19', '2025-05-19 17:32:10'),
  (8223568, 36936911, '0001', 'Paver change', 'Paver change Belgard Cambridge cobble in Rio 6x6 & 6x9 in ''I'' pattern. No cost difference', NULL, 0, 'pending', '2025-05-20', '2025-05-20 06:52:10'),
  (8227114, 36936911, '0002', 'Demo & Ribbons', 'Demolition Demolish and (1) brick column and connecting brick walls No painting or patching is included in price COST $843
Paver Ribbons Remove existing brick ribbons Saw cut ribbons wider to accept 6x9 paver Set pavers $1525', NULL, 2368.00, 'pending', '2025-05-20', '2025-05-20 15:37:55'),
  (8229515, 39806009, '0001', 'CREDIT - Use of 25 sqft of Pavers', NULL, NULL, -100.00, 'pending', '2025-05-21', '2025-05-21 08:51:11'),
  (8234181, 39747782, '0007', 'Root Barrier for back planter', NULL, NULL, 2000.00, 'pending', '2025-05-22', '2025-05-22 08:28:27'),
  (8234758, 39406205, '0005', 'Credit (3) Hebe 5 gal', 'Add 15-5 gal. Ligustrum (staked)
Add drip irrigation from existing line.', NULL, -105.00, 'pending', '2025-05-22', '2025-05-22 10:03:36'),
  (8236839, 39742790, '0002', 'Adding gravel to area in front of pond', '170sqft of gravel, removing (1) section of Palm tree and hauling debris', NULL, 600.00, 'pending', '2025-05-22', '2025-05-22 15:20:54'),
  (8240125, 36936911, '0003', 'Drains and addtl pavers', 'Drainage
Install approx 170 lf of 2” SDR drainpipe connected to existing sum pump system
Install approx 20 lf of 3” SDR drainpipe and connect to existing downspouts
Core curb in 2 locations
COST $2700
Gate track
Install concrete pad for gate track & gate motor
Veneer track with paving stones matching driveway
COST $1800
Total Cost $4,500 (check/cash price)', NULL, 4500.00, 'pending', '2025-05-23', '2025-05-23 13:03:16'),
  (8247002, 38774894, '0005', 'BBQ', '10lf BBQ with stucco finish and standard concrete color countertop. 2 gfci and installing owner provided equipment.', NULL, 10800.00, 'pending', '2025-05-27', '2025-05-27 17:45:20'),
  (8247007, 38774894, '0004', 'Pilasters', '7 pilasters 6'' tall 18 inches wide with smooth stucco finish with Pip cap or brick cap depending on owner preference.', NULL, 12400.00, 'pending', '2025-05-27', '2025-05-27 17:48:13'),
  (8251844, 36551611, '0003', '555 Sq ft of white concrete additional', '555 Sq ft of white concrete additional.', NULL, 4545.00, 'sold', '2025-05-28', '2025-05-28 19:33:32'),
  (8251846, 36551611, '0004', 'Sealer for veneer', '225 Sq ft of sealer for front of wall
100 Sq ft of veneer for kitchen', NULL, 900.00, 'sold', '2025-05-28', '2025-05-28 19:36:44'),
  (8256643, 37890729, '0009', 'Credit for Automation programming', NULL, NULL, -400.00, 'sold', '2025-05-29', '2025-05-29 21:26:07'),
  (8257730, 39894552, '0001', '2 15gal citrus trees', '2 citrus 15 gallons
Meyer lemon
Bears lime
Semi dwarf for each', NULL, 600.00, 'pending', '2025-05-30', '2025-05-30 08:15:14'),
  (8257732, 39894552, '0002', 'Additional Cleanup', 'Clean up of hillside with minor Grading.', NULL, 6000.00, 'pending', '2025-05-30', '2025-05-30 08:15:34'),
  (8258628, 36551611, '0005', 'CREDIT Prefab Pergorla (to remove)', NULL, NULL, -4000.00, 'pending', '2025-05-30', '2025-05-30 10:35:43'),
  (8258735, 36936911, '0004', 'Landscape & Pool Equip', 'Softscape & Irrigation
Remove shrubs in front yard
Remove pool equipment wall
Install (5 qty.) anti-siphon valves for drip irrigation
Install Rachio brand ‘Smart’ 8-station irrigation controller
Install approx. 800 sqft. of premium mulch
Install approx. 64 linear feet of brown plastic bender board edging per plan
Till and amend planting area soil
Install the following plant sizes/quantities:
(4 qty.) 24” box trees
(78 qty.) 5 gal plants
(129 qty.) 1 gal plants
(10 qty.) dirt flats of groundcover
Install criss-cross wires for rear wall vines
Lay weed barrier fabric
Install 3” of decomposed granite around herb garden, approx. 75 sqft
Install 3” of decomposed granite in front yard, approx. 278 sqft
Install owner-provided pots, fill with 50/50 topsoil and planter mix
COST $21,446
Lighting
Install (2 qty.) 200-watt transformers
Install (5 qty.) ‘Lightcraft’ or equal LED path lights
Install (3 qty.) ‘Lightcraft’ or equal LED step lights
Install (14 qty.) ‘Lightcraft’ or equal LED flood lights
Install (7 qty.) ‘Lightcraft’ or equal LED spot lights
Connect to FX timer
Wire up all fixtures
COST $5,519

Pool Automation
Install ‘Jandy’ brand ‘iAqualink-IQ904 PS-4’ or equivalent automation system
COST $2,634
Option - Pool Heater
Install ‘Jandy’ brand 400K BTU heater
COST $4,372
Option - Replace Pool Filter
Replace existing pool filter with ‘Jandy’ brand ‘CV460’ cartridge filter
COST $1,661
Option - Replace Pool Pump
Replace existing pool pump with ‘Jandy’ brand 2.7 HP variable speed pump
COST $2,020

Total Cost $37,652 - Cash/Check Price', NULL, 37652.00, 'pending', '2025-05-30', '2025-05-30 10:51:08'),
  (8258788, 39590939, '0003', '12 sqft sod + drain (T&M)', NULL, NULL, 1100.00, 'pending', '2025-05-30', '2025-05-30 11:00:48'),
  (8258897, 38774894, '0006', 'Fence Posts', 'Install fence posts.', NULL, 800.00, 'pending', '2025-05-30', '2025-05-30 11:15:39'),
  (8265412, 37561500, '0003', 'Tile overlay - see plan in 6.1 Change Order Design', NULL, NULL, 10819.00, 'pending', '2025-06-02', '2025-06-02 15:33:50'),
  (8265628, 40108381, '0001', 'Credit Drain Grates', NULL, NULL, -717.00, 'pending', '2025-06-02', '2025-06-02 17:02:13'),
  (8268742, 39406205, '0006', 'More plants - See notes', 'Install (14) Dodonaea 5 gal along patio in side yard. Add 2 driplines along outside of plants.
Add (4) Dodonaea 5 gal behind newly planted euphorbias (hummingbird feeder area)
(10) flats Lampranthus on slope
(5) PLANTS FROM OUR YARD

Grand Total $1915', NULL, 1915.00, 'pending', '2025-06-03', '2025-06-03 11:12:12'),
  (8270445, 37890729, '0010', 'Additional irrigation for parkway', NULL, NULL, 1000.00, 'sold', '2025-06-03', '2025-06-03 16:10:49'),
  (8270461, 37890729, '0011', 'Mexican Beach Pebble for Front Walk Planters', '100sqft', NULL, 1000.00, 'sold', '2025-06-03', '2025-06-03 16:17:21'),
  (8270601, 39747782, '0008', 'Additional Deck Square Footage', NULL, 'Deck is an additional 30sqft from original planned size of 17 1/2 x 7 (upgraded 20 x 8)', 3360.00, 'pending', '2025-06-03', '2025-06-03 17:10:14'),
  (8271748, 39645431, '0004', 'Additional 6 path lights', NULL, NULL, 1320.00, 'pending', '2025-06-04', '2025-06-04 07:13:16'),
  (8272818, 37604325, '0009', 'Concrete work', '1850 Sq ft of concrete with 15 linear feet of step.Natural gray concrete with trowel finish. No stain or hardener included.', NULL, 24000.00, 'pending', '2025-06-04', '2025-06-04 09:52:11'),
  (8272827, 37604325, '0010', 'Poured in place concrete coping to match deck', NULL, NULL, 1000.00, 'pending', '2025-06-04', '2025-06-04 09:54:26'),
  (8274973, 38904439, '0026', 'Credit for 15g Black Pine', NULL, NULL, -175.00, 'sold', '2025-06-04', '2025-06-04 15:37:00'),
  (8276578, 38401782, '0015', 'Change 15 gal to 24" box for 3 trees', NULL, NULL, 300.00, 'sold', '2025-06-05', '2025-06-05 07:51:16'),
  (8276581, 38401782, '0016', 'Re- set belecrete caps', NULL, NULL, 1500.00, 'sold', '2025-06-05', '2025-06-05 07:51:48'),
  (8276583, 38401782, '0017', 'Repair Dg', NULL, NULL, 420.00, 'pending', '2025-06-05', '2025-06-05 07:52:24'),
  (8276623, 38401782, '0018', 'Acid wash concrete', NULL, NULL, 150.00, 'sold', '2025-06-05', '2025-06-05 07:57:27'),
  (8282871, 37561500, '0004', 'Soils Observation', NULL, NULL, 500.00, 'pending', '2025-06-06', '2025-06-06 12:44:57'),
  (8283068, 33075936, '0006', 'Tree Installation Add-On', NULL, NULL, 17484.00, 'pending', '2025-06-06', '2025-06-06 13:23:22'),
  (8283533, 39433058, '0001', 'Pergola upgrade to Alumawood', NULL, NULL, 2417.00, 'pending', '2025-06-06', '2025-06-06 15:11:14'),
  (8283683, 39406460, '0002', 'CC fee', NULL, NULL, 108.79, 'pending', '2025-06-06', '2025-06-06 17:23:11'),
  (8288369, 36551611, '0006', 'Gavel', NULL, NULL, 1400.00, 'sold', '2025-06-09', '2025-06-09 14:50:45'),
  (8288373, 36551611, '0007', 'Add 8 and 1 transformer', NULL, NULL, 2000.00, 'sold', '2025-06-09', '2025-06-09 14:51:16'),
  (8295256, 39433102, '0002', '1 additional pathway light', 'Install one path light.', NULL, 150.00, 'pending', '2025-06-11', '2025-06-11 08:02:09'),
  (8296289, 38401782, '0019', 'Reset post for pool fence', NULL, NULL, 300.00, 'sold', '2025-06-11', '2025-06-11 10:40:17'),
  (8296303, 38401782, '0020', 'Install plastic (no materials)', NULL, NULL, 100.00, 'sold', '2025-06-11', '2025-06-11 10:41:25'),
  (8296335, 33185933, '0011', '2025 Additional Plants/Plant Cleanup', 'Cleanup some of the existing plant material in the planters flanking the turf area
Adding more plants for these planters
Adding (1) replacement Carolina Cherry', NULL, 1450.00, 'pending', '2025-06-11', '2025-06-11 10:45:30'),
  (8298141, 36936911, '0005', '(14) Eugenia 15g & credit (14) 1 gal', NULL, NULL, 1200.00, 'pending', '2025-06-11', '2025-06-11 15:24:39'),
  (8301244, 40547912, '0001', 'Additional cost for special tile', NULL, NULL, 650.00, 'sold', '2025-06-12', '2025-06-12 11:44:37'),
  (8301450, 38401782, '0021', 'Credit for (3) 15G Swan Hill Olives', NULL, NULL, -375.00, 'sold', '2025-06-12', '2025-06-12 14:28:21'),
  (8301897, 38912565, '0002', 'CO 1 Time/Material (week1)', NULL, NULL, 4800.00, 'pending', '2025-06-12', '2025-06-12 16:31:43'),
  (8303848, 38912565, '0003', 'Stucco work', 'chip out existing stucco. Fix wire, install new wire if necessary. Install brown coat, install stucco coats up to window line.', NULL, 4725.00, 'sold', '2025-06-13', '2025-06-13 09:11:03'),
  (8303976, 38401782, '0022', 'CREDIT Gate', NULL, NULL, -1750.00, 'pending', '2025-06-13', '2025-06-13 09:29:31'),
  (8305847, 38904439, '0027', 'Credit for (2) Palms', 'Credit for (2) 15 gal palms @ $90 each', NULL, -180.00, 'sold', '2025-06-13', '2025-06-13 16:18:00'),
  (8305892, 40577384, '0001', 'Umbrella Policy Split', '1MM umbrella at $9,420.30 split', NULL, 4710.15, 'pending', '2025-06-13', '2025-06-13 17:22:02'),
  (8309312, 39645431, '0005', 'Credit for 9 linear feet of Steps', NULL, NULL, -1089.00, 'pending', '2025-06-16', '2025-06-16 11:32:08'),
  (8310738, 40157732, '0001', 'Credit for CMU Block Retaining Wall', NULL, NULL, -2625.00, 'pending', '2025-06-16', '2025-06-16 14:29:00'),
  (8310757, 40157732, '0002', 'Credit for Plants', NULL, NULL, -200.00, 'pending', '2025-06-16', '2025-06-16 14:31:31'),
  (8312776, 40157732, '0003', 'Credit for piping for irrigation', 'We used existing piping for the back and front slope areas, we had to replace the valves,drip tubing and spray heads that were burned.
We also used 2 full irrigation zones for sod area', NULL, -500.00, 'pending', '2025-06-17', '2025-06-17 07:57:49'),
  (8315288, 40268459, '0001', 'Additional conc per signed change order', NULL, NULL, 5932.00, 'pending', '2025-06-17', '2025-06-17 13:22:54'),
  (8316361, 38912565, '0004', 'Driveway extension', 'Driveway extension to second slab 300 sq ft', NULL, 4800.00, 'sold', '2025-06-17', '2025-06-17 18:03:32'),
  (8320644, 36936911, '0006', 'Additional plants', NULL, NULL, 280.00, 'pending', '2025-06-18', '2025-06-18 14:44:18'),
  (8321081, 36936911, '0007', 'Added transformer', NULL, NULL, 300.00, 'pending', '2025-06-18', '2025-06-18 17:08:53'),
  (8325521, 39645431, '0006', 'CREDIT', NULL, NULL, -450.00, 'pending', '2025-06-19', '2025-06-19 16:25:29'),
  (8327561, 40108381, '0002', 'DG Path Extention', NULL, NULL, 1700.00, 'pending', '2025-06-20', '2025-06-20 09:47:59'),
  (8327564, 37155041, '0008', 'Added Planting', 'NEW PLANTINGS: *Please review existing drip irrigation for new planting as part of scope
 
Front to the east of Driveway:
(7) 15 gallon Salvia Clevelandii or ‘Celestial Blue”
(1) 5 gallon Eriogonum giganteum ''St. Catherines Lace''

(5) 3 gallon Achillea Millefolium Common Yarrow

(2) 5 gallon Elymus Condensatus ''Canyon Prince''

(5) 3 gallon Lomandra longifolia Breeze

(3) 5 gallon Ceonothus Hearstiorum or ‘Yankee Point’

(2) 5 gallon Calystegia macrostegia ''Anacapa Pink'' (morning glory)

 
Along Dimmick the West of Driveway:
(3) 15 gallon Salvia Clevelandii or ‘Celestial Blue”

(3) 3 gallon Achillea Millefolium Common Yarrow

(3) 5 gallon Elymus Condensatus ''Canyon Prince''

(3) 3 gallon Lomandra longifolia Breeze', NULL, 2840.00, 'pending', '2025-06-20', '2025-06-20 09:48:42'),
  (8333305, 38774894, '0007', 'Forming Rework', NULL, NULL, 2000.00, 'pending', '2025-06-23', '2025-06-23 12:41:04'),
  (8333783, 40428500, '0001', 'Add $815 for step build per phone conf w/customer', NULL, NULL, 815.00, 'pending', '2025-06-23', '2025-06-23 13:43:35'),
  (8334043, 36936911, '0008', 'CREDIT 14 15gallons', NULL, NULL, -1361.94, 'pending', '2025-06-23', '2025-06-23 14:30:46'),
  (8334046, 36936911, '0009', 'CREDIT Material only 1 15gal and 9 24" plants', NULL, NULL, -1880.12, 'pending', '2025-06-23', '2025-06-23 14:32:18'),
  (8334052, 36936911, '0010', 'Labor Only for 1 15gal and 9 24"', NULL, NULL, 1483.50, 'pending', '2025-06-23', '2025-06-23 14:33:08'),
  (8334085, 36936911, '0011', 'CREDIT 4 24" Cypress', NULL, NULL, -1450.66, 'pending', '2025-06-23', '2025-06-23 14:37:53'),
  (8339219, 37443736, '0001', 'Retaining wall change', 'increase of retaining wall height from 24" to 42"
increase of footing size from 12" to 24" with new key course.', NULL, 2672.00, 'sold', '2025-06-24', '2025-06-24 15:26:09'),
  (8339256, 37604325, '0011', 'Turf Install', '650 sq ft of turf installed', NULL, 6500.00, 'pending', '2025-06-24', '2025-06-24 15:34:44'),
  (8339304, 40560885, '0001', 'Hauling Ficus Debris and Grinding Remaining Stumps', NULL, NULL, 1000.00, 'pending', '2025-06-24', '2025-06-24 15:46:03'),
  (8339516, 40475015, '0001', 'Vanja - Job Walk CO', NULL, NULL, 1125.00, 'pending', '2025-06-24', '2025-06-24 17:19:44'),
  (8341513, 40560885, '0002', 'Credit for Gravel (seated area)', NULL, NULL, 0, 'pending', '2025-06-25', '2025-06-25 09:11:33'),
  (8341752, 38774894, '0008', 'Pilaster Electrical', NULL, NULL, 2500.00, 'pending', '2025-06-25', '2025-06-25 09:47:44'),
  (8342703, 37542899, '0007', 'Podacarpis hedge (25)', '25) 24" box podacarpis hedge installed.', NULL, 10000.00, 'pending', '2025-06-25', '2025-06-25 11:53:09'),
  (8344402, 40547912, '0002', 'Client Requested Change Orders at Job Walk', 'Please see attached for scope of work!', NULL, 1913.00, 'sold', '2025-06-25', '2025-06-25 17:11:19'),
  (8346471, 35259913, '0024', 'CREDIT - 36" Olive to Carrotwood', NULL, NULL, -302.50, 'pending', '2025-06-26', '2025-06-26 09:24:26'),
  (8347220, 38774894, '0009', 'Poured In place', 'Upcharge to poured in place', 'Upcharge to change coping to poured in place', 1000.00, 'pending', '2025-06-26', '2025-06-26 11:19:36'),
  (8349000, 37561500, '0005', 'Salt system - see change order', 'Add Salt System
Furnish and install ‘Jandy’ brand ‘Apurem’ Aquapure power and control salt chlorination system
COST $2,771', NULL, 2771.00, 'pending', '2025-06-26', '2025-06-26 16:49:11'),
  (8351901, 39433159, '0002', 'Tree, Root and Footing removal with Stump Grinding', 'Removing tree stump grinding. Removing roots as needed for underground utilities, Removing wall footing around tree', NULL, 4135.00, 'pending', '2025-06-27', '2025-06-27 12:23:13'),
  (8352202, 2018519, '0001', 'Add Border work and full resand', NULL, NULL, 1900.00, 'pending', '2025-06-27', '2025-06-27 13:17:53'),
  (8355960, 40475015, '0002', 'Add (4) flats diamond (silver carpet)', NULL, 'From C&S nursery', 200.00, 'sold', '2025-06-30', '2025-06-30 11:07:01'),
  (8357697, 40268459, '0002', 'VOID Solder for planter 3LF.', NULL, NULL, 0, 'pending', '2025-06-30', '2025-06-30 16:01:30'),
  (8358969, 40635067, '0001', '(7) succulents', '(3)Aeonium Zwartkopf
(2) Agave Blue Glow
(2)Agave Foxtail', NULL, 300.00, 'pending', '2025-07-01', '2025-07-01 06:51:41'),
  (8358973, 40635067, '0002', '20’ Metal Edging', NULL, NULL, 200.00, 'pending', '2025-07-01', '2025-07-01 06:52:18'),
  (8358974, 40635067, '0003', '(2) 18” boulders', NULL, NULL, 150.00, 'pending', '2025-07-01', '2025-07-01 06:52:51'),
  (8360451, 40268459, '0004', 'Addtl Work', 'Additional Paver Curbing
Added 3lf of paver soldier course to parking stop
COST $363
Sanitation Facilities
Put in order to expedite portable sanitation pickup
COST $300
Paver Modification
Modified paver entry to conform with Public Works inspector slope request by removing pavers,
regrading paver base and reinstalling 240 sf of pavers (normally $2400 with $1620 discount)
COST $780
Job Total $1,443 - Cash/Check Price', NULL, 1443.00, 'pending', '2025-07-01', '2025-07-01 10:43:20'),
  (8360739, 40547912, '0003', 'Add drip line to front of house 17 LF', 'Add a drip to this area', NULL, 150.00, 'sold', '2025-07-01', '2025-07-01 11:22:02'),
  (8364194, 39894552, '0003', 'Additional Gravel', NULL, NULL, 650.00, 'sold', '2025-07-02', '2025-07-02 08:02:35'),
  (8364201, 39894552, '0004', 'Install New Rachio Timer', NULL, NULL, 450.00, 'sold', '2025-07-02', '2025-07-02 08:03:18'),
  (8364211, 39894552, '0005', 'Benderboard', NULL, NULL, 650.00, 'sold', '2025-07-02', '2025-07-02 08:04:38'),
  (8365630, 37604325, '0012', 'Upgrade for Pool Tile', NULL, NULL, 2553.00, 'pending', '2025-07-02', '2025-07-02 11:20:51'),
  (8367185, 38401782, '0023', 'CREDIT lights', NULL, NULL, -500.00, 'pending', '2025-07-02', '2025-07-02 15:28:01'),
  (8367251, 40444255, '0001', 'Pavers for steps (material only)', NULL, NULL, 1200.00, 'sold', '2025-07-02', '2025-07-02 15:43:27'),
  (8371039, 37218799, '0001', 'Credit for plants', 'Credit for (56) 1 gallon and (1) 5 gallon plant', NULL, -1247.00, 'sold', '2025-07-03', '2025-07-03 15:06:35'),
  (8371265, 40501925, '0001', 'Permit Fees', 'Costs:
Bureau of Engineering Clearance: $264.42
Supplemental Permit to Review Ret. Wall Plans: $596.65
Extension for plan review timeframe : $305.60
Record Notarized Bureau of Engineering Document: $38.00
Retaining Wall & Grading Permits: $851.80
Total Cost: $2,056.47

+ $450 processing time', NULL, 2506.47, 'pending', '2025-07-03', '2025-07-03 16:55:44'),
  (8375530, 38912565, '0005', 'Misc items', 'mainline run with sch 80 pvc 1" with sleeve. $1050
Sump pit and pump $2400
Badujet increase  $3000', NULL, 6450.00, 'pending', '2025-07-07', '2025-07-07 12:15:47'),
  (8376892, 38912565, '0006', 'Replacing Garage Concrete', 'Permit - $1,014.95
Additional Concrete work for garage - $2000', NULL, 3014.95, 'sold', '2025-07-07', '2025-07-07 16:47:57'),
  (8378414, 38774894, '0010', 'Additional channel drain', NULL, NULL, 1045.00, 'pending', '2025-07-08', '2025-07-08 07:57:40'),
  (8386084, 26949840, '0071', 'Picking Up Pavers to run electrical for cameras', NULL, NULL, 1800.00, 'sold', '2025-07-09', '2025-07-09 15:33:23'),
  (8387742, 39894552, '0006', 'Swap out Valve and Install Regulator', 'We installed a new drip zone on an old valve per contract.   The old valve is not working correctly and needs to be replaced.   This is the zone near the gas meter.', NULL, 300.00, 'sold', '2025-07-10', '2025-07-10 08:01:53'),
  (8388906, 39350219, '0001', 'Pool Remodel', 'Mini Pebble finsih - color TBD
Tiles - 239 lnft
Pool Drain', NULL, 27000.00, 'pending', '2025-07-10', '2025-07-10 10:49:25'),
  (8390421, 37561500, '0006', 'Permit Fees', 'Costs:
Pool Engineering Plans: $170.78
Pool & Grading Plan Check: $628.17
Pool & Grading Permits: $1,122.51
Pool Eng. Revision to Plans: $45.00
Pool Supplemental Plan Check: $438.78
Bureau of Engineering Clearance: $132.21
Pool Supplemental Permit: $174.74
Total Cost: $2,712.19', NULL, 2712.19, 'pending', '2025-07-10', '2025-07-10 14:19:56'),
  (8394752, 39997017, '0001', 'Permit fees', NULL, NULL, 526.27, 'pending', '2025-07-11', '2025-07-11 17:03:39'),
  (8394762, 40836356, '0001', 'Turf', 'Turf from original bid', NULL, 13860.00, 'pending', '2025-07-11', '2025-07-11 17:18:38'),
  (8394764, 40836356, '0002', 'Additional turf and wood removal', 'Removal of wooden door. 520 Sq feet of additional turf', NULL, 7100.00, 'pending', '2025-07-11', '2025-07-11 17:20:49'),
  (8394767, 40836356, '0003', 'Drain work replacement 80 linear feet', NULL, NULL, 2800.00, 'pending', '2025-07-11', '2025-07-11 17:28:05'),
  (8397252, 40268459, '0005', 'Driveway Apron Permit Fee at cost', NULL, NULL, 533.77, 'pending', '2025-07-14', '2025-07-14 09:01:58'),
  (8399280, 40824206, '0001', 'Driveway', NULL, NULL, 13128.00, 'pending', '2025-07-14', '2025-07-14 13:37:03'),
  (8399708, 35259913, '0025', 'Additional plnats & Lights', 'Landscape Remove misc plants Prep areas to be planted Install (7) Lady Banks Rose Vines 15 gal Pin vines to wall with anchors Install (35) Lavander 5 gal Install (52) Lantana 5 gal Install (20) Snow In Summer flats Install (15) lf of metal edging for small planters around fire pit area Convert lawn pop-ups to 12” pop-ups for small planters COST $6,607 Lighting Install (1) Flood light on hillside Install (5) Path Lights Install (3) additional spots on trees over pool COST $1,953', NULL, 8084.00, 'pending', '2025-07-14', '2025-07-14 14:46:38'),
  (8400205, 39894589, '0002', 'Permit Fees', 'Pool Plan Check: $438.78

Pool/Grading Permits: $1,305.22

Electrical + Plumbing Permit: $158.05

Total Cost: $2,176.33', NULL, 2176.33, 'pending', '2025-07-14', '2025-07-14 17:37:19'),
  (8400212, 37443736, '0002', 'Charbonneau - Pool & Retaining Wall Permits', 'The 6 hours include:
Drafting detailed plan per county requirements, revision of scope of work. Submitting plan to structural engineering and review of detail. Online submittal for plan check, addressed comments from plan checker from building, planning, drainage, CND plan checkers. Permit issuance.

Costs:
Pool Engineering Plans: $274.28
Regional Planning Plan Check: $797.00
Pool & Ret. Wall Plan Check: $653.41
Pool Engineering Plan Revision: $150.08
CND Clearance Deposit: $4,282.09
Pool & Ret. Wall Permits: $1,842.46
Total Cost: $7,999.32', NULL, 8449.32, 'pending', '2025-07-14', '2025-07-14 17:38:37'),
  (8403513, 40612449, '0001', 'Additional items', 'Concrete 130 sq ft $2460
Drainage 40 linear feet $1200', NULL, 3660.00, 'pending', '2025-07-15', '2025-07-15 12:02:32'),
  (8403521, 40612449, '0002', 'Spa seating', 'Adding benching for rear of spa.', NULL, 1000.00, 'pending', '2025-07-15', '2025-07-15 12:03:41'),
  (8404757, 40444255, '0002', 'Planting Homeowners Plants', 'x5 15 gallons (incl Crepe Myrtle tree)
x33 5 gallons
x28 1 gallons

Tilling and amending soils for planters', NULL, 1400.00, 'sold', '2025-07-15', '2025-07-15 15:01:55'),
  (8404761, 40444255, '0003', 'Credit for Gravel on Contract', NULL, NULL, -1341.00, 'sold', '2025-07-15', '2025-07-15 15:02:29'),
  (8404765, 40444255, '0004', '50/50 Soil import for planters x 3 yards', 'to backfill circular raised planters', NULL, 375.00, 'sold', '2025-07-15', '2025-07-15 15:02:48'),
  (8407370, 40778172, '0001', 'Tile & plaster', 'Plaster choice is Stonescapes Aqua White (no extra)

Tile is NPT Continental 3x6 pacific blue $280 upcharge', NULL, 280.00, 'pending', '2025-07-16', '2025-07-16 10:02:04'),
  (8408600, 40157732, '0004', 'Credit for Rachio Timer', NULL, NULL, -300.00, 'sold', '2025-07-16', '2025-07-16 12:31:38'),
  (8408632, 40824206, '0002', 'Add (1) spot light', 'OK via email', NULL, 160.00, 'pending', '2025-07-16', '2025-07-16 12:36:11'),
  (8409689, 40444255, '0005', 'Small Wall connecting wall to new steps', 'Includes stucco, waterproofing, soil backfill', NULL, 4100.00, 'pending', '2025-07-16', '2025-07-16 15:17:57'),
  (8409777, 40444255, '0006', 'Additional soil for backfill for (3) pots', 'Please bring small 1/3 of a yard of crushed gravel to fill bottoms of each pot and some some mesh', NULL, 250.00, 'sold', '2025-07-16', '2025-07-16 15:37:20'),
  (8410004, 31930909, '0008', 'Paver Sealant + Bullnose Paver repair (2 pieces)', 'Seal existing pavers and fix (2) pieces of bullnose for step area', NULL, 1510.00, 'pending', '2025-07-16', '2025-07-16 16:59:59'),
  (8410049, 40444255, '0007', 'Change Concrete Landing to Paver', NULL, NULL, 0, 'pending', '2025-07-16', '2025-07-16 17:28:00'),
  (8411253, 40475015, '0003', 'Credit for fountain electrical', NULL, NULL, -667.00, 'pending', '2025-07-17', '2025-07-17 07:28:32'),
  (8416413, 40612449, '0003', 'Expansion of Spa', 'from 8x6 to 9x7 feet', NULL, 800.00, 'pending', '2025-07-18', '2025-07-18 09:10:20'),
  (8416654, 40444255, '0008', 'Additional lighting', '5 in ground for Boxwood
5 steps lights (for paver steps)', NULL, 2000.00, 'sold', '2025-07-18', '2025-07-18 09:48:08'),
  (8416657, 40444255, '0009', '(2) 15 Gallon Boxwood', NULL, NULL, 300.00, 'sold', '2025-07-18', '2025-07-18 09:48:34'),
  (8417320, 40501925, '0002', 'Credit for One Pilaster not done at original price', NULL, NULL, -4500.00, 'pending', '2025-07-18', '2025-07-18 11:34:17'),
  (8417360, 40501925, '0003', 'Additional depth, boulders and mini rig', 'Depth originally specified for 12 feet drilled.  Actual drilling was 25 feet per engineer requirement. 
In addition, the job required two machines instead of one. 

Specialized mini rig for hard access areas

Also hit boulders requiring breaker tooling and added time.

Additional cost covers.

Drill Costs.
Additional Rebar
Additional Concrete
Require heavier crane to drop 28 foot cage. 
Additional machine delivery charge.
Also hit bolders required retooling and breaker.', NULL, 21000.00, 'pending', '2025-07-18', '2025-07-18 11:39:25'),
  (8417598, 37890729, '0012', 'CREDIT - stucco', NULL, NULL, -500.00, 'pending', '2025-07-18', '2025-07-18 12:21:37'),
  (8425353, 40157732, '0005', 'Irrigation valve repair', 'Repair 1 irrigation valve', NULL, 250.00, 'pending', '2025-07-22', '2025-07-22 08:14:49'),
  (8428560, 40820736, '0001', 'CO - 6 jasmine', NULL, NULL, 300.00, 'pending', '2025-07-22', '2025-07-22 15:43:10'),
  (8435619, 37218799, '0002', 'Credit for 200sqft of Turf', 'Measured out approx 500sqft (incl wasteage) on site', NULL, -2600.00, 'sold', '2025-07-24', '2025-07-24 09:35:11'),
  (8437203, 33691503, '0043', 'Installing Firepit using owner provided vessel', '24" limestone vessel (purchased by HO) to be converted into fire feature (to be delivered and placed into desired spot by delivery company)
Will need to provide lava rocks or glass (samples to client)
Gas line (we''ve already stubbed up for this) and burner
Vessel will need to be drilled at bottom for pipe', NULL, 2000.00, 'sold', '2025-07-24', '2025-07-24 13:27:13'),
  (8465186, 40597971, '0001', 'remove 5 cy gravel', NULL, NULL, 1694.00, 'sold', '2025-08-01', '2025-08-01 10:12:43'),
  (8465653, 39433102, '0003', 'Paver Sealer', NULL, NULL, 1062.00, 'pending', '2025-08-01', '2025-08-01 11:16:35'),
  (8466961, 39406205, '0007', 'Add (3) 12" popup stream rotors to upper hillside', NULL, NULL, 740.00, 'pending', '2025-08-01', '2025-08-01 15:30:20'),
  (8471187, 40612449, '0004', '2 piles more', NULL, NULL, 1000.00, 'pending', '2025-08-04', '2025-08-04 11:44:42'),
  (8471491, 40824206, '0003', 'New driveway apron, 100 sq ft. Pavers', NULL, NULL, 1475.00, 'pending', '2025-08-04', '2025-08-04 12:22:48'),
  (8472956, 40612449, '0005', 'Pebbletec upgrade mini pebble 5400', NULL, NULL, 0, 'pending', '2025-08-04', '2025-08-04 16:13:52'),
  (8473140, 39747782, '0010', 'Credit for (6) 5 gallon Jasmine', NULL, NULL, -212.00, 'sold', '2025-08-04', '2025-08-04 17:38:43'),
  (8475564, 40778172, '0002', 'jandy salt system', NULL, NULL, 2400.00, 'pending', '2025-08-05', '2025-08-05 09:33:48'),
  (8480966, 40422978, '0001', 'Extra Concrete', '15 x 15 pad,

12 ln feet of addtional steps

extra walkway concrete', NULL, 5580.00, 'sold', '2025-08-06', '2025-08-06 08:08:46'),
  (8480985, 40422978, '0002', 'Drainage', '140 linear feet 

Iron pipe PROW drain.', NULL, 3500.00, 'sold', '2025-08-06', '2025-08-06 08:10:17'),
  (8481004, 40422978, '0003', 'Additional Curb and Gutter', 'Added 17 feet of additional curb and gutter and asphalt.', NULL, 2890.00, 'sold', '2025-08-06', '2025-08-06 08:13:02'),
  (8481070, 40422978, '0004', 'Asphalt Patching', NULL, NULL, 2200.00, 'sold', '2025-08-06', '2025-08-06 08:19:55'),
  (8481081, 40422978, '0005', 'Electrical Wiring for Spa', NULL, NULL, 1250.00, 'sold', '2025-08-06', '2025-08-06 08:21:30'),
  (8481100, 40422978, '0006', 'Electrical Rough In.', 'Trenched 120 linear feet. 
Added second conduit.

40 ln feet included in contract.', NULL, 2400.00, 'sold', '2025-08-06', '2025-08-06 08:24:08'),
  (8481522, 38774894, '0011', 'Reduce Pilaster Height', 'Demo and Hauling', NULL, 2500.00, 'pending', '2025-08-06', '2025-08-06 09:08:19'),
  (8486792, 36148606, '0013', 'Sealing Release', 'We will be applying the Glaze n Seal Wet look sealer. We will be applying with a sprayer and then rolling out the sealer. This application method was requested. After sealer application, picture build will not be responsible for any underlying color deviations in the pavers.', NULL, 0, 'sold', '2025-08-07', '2025-08-07 07:37:45'),
  (8487458, 37542899, '0008', 'New podacarpis', '20 new podacarpis 24"', NULL, 8000.00, 'pending', '2025-08-07', '2025-08-07 08:58:13'),
  (8488414, 40824206, '0004', 'New Steps, Re-grade, Lights', '22 LF Curved Steps
Additional Grading/Base 
Waterproof Sill Plate
(2) Step Lights

**Waiver: Client agrees to cover vents + sill plate and holds Picture Build harmless on any claims or warranty for sill plate waterproofing**', NULL, 3150.00, 'sold', '2025-08-07', '2025-08-07 10:53:23'),
  (8488605, 39433102, '0004', '2 Posts', NULL, NULL, 600.00, 'pending', '2025-08-07', '2025-08-07 11:16:34'),
  (8489956, 40612449, '0006', 'Quartz plaster 6400', NULL, NULL, 0, 'pending', '2025-08-07', '2025-08-07 13:55:25'),
  (8490927, 40612449, '0007', 'Mini pebble 5400', 'upgrade to mini pebble', NULL, 0, 'pending', '2025-08-07', '2025-08-07 17:53:29'),
  (8493087, 40523628, '0001', 'Outlet, Planting, Pathway', NULL, 'Credit Ceiling Fan 
Install (1) GFCI receptacle
Additional Planting: 5 x lady ferns (1g) front pathway
Keep Agapanthus in the corner of the front bed
New Pathway to Gazebo: 45 Sq Ft. of Angelus Courtyard
Move GFCI by Gazebo to Patio', 558.00, 'pending', '2025-08-08', '2025-08-08 09:49:52'),
  (8493490, 40922633, '0001', 'Additional Gravel (right of driveway)', 'Adding 1" of gravel to this area (will be 3" total of gravel) includes landscape fabric and additional demo', NULL, 1500.00, 'pending', '2025-08-08', '2025-08-08 10:44:12'),
  (8500146, 32422492, '0013', 'Plant change order', '12 5 gallon purple wistraingia replacing lavenders in front', NULL, 765.00, 'sold', '2025-08-11', '2025-08-11 13:31:19'),
  (8503274, 40523628, '0002', 'Drain modification', 'Approximately 20'' of additional drain lines and 9 new drain inlets.', NULL, 900.00, 'sold', '2025-08-12', '2025-08-12 08:40:04'),
  (8504605, 40778172, '0003', 'Jandy CV460', NULL, NULL, 1940.00, 'pending', '2025-08-12', '2025-08-12 11:23:35'),
  (8506934, 40523628, '0003', 'Pavers for Gazebo, 8” Road Base', 'Credit concrete install
Pavers, Angelus courtyard
8” roadbase
Client OK with ramping up to Gazebo', NULL, 1546.00, 'pending', '2025-08-12', '2025-08-12 17:15:38'),
  (8506944, 40427946, '0001', 'Pavers for side of property', 'Remove existing concrete and replace with natural stone pavers (to match rest of backyard) approx 200sqft - includes demo', NULL, 4126.00, 'sold', '2025-08-12', '2025-08-12 17:20:02'),
  (8510451, 39433058, '0002', 'Downspout connections', NULL, NULL, 100.00, 'pending', '2025-08-13', '2025-08-13 11:19:30'),
  (8515581, 40577384, '0002', 'Palm Tree work', NULL, 'CE #164 - Palm Maintenance

- Plans call for the palms to be trimmed as they are severely neglected. 

- Remove and discard Palm Fronds from palm trunks

- Remove additional palm trunk

- Rent 85 articulation boom to remove fronds from lower and higher palms

- Top cut fronds down from 22 palms

- Shred fronds with drum shredder into containers

- Haul green waste

- Cut additional palm trunk. Had cut smaller trunks and shred pieces

- Does not include knife cutting stubs', 14850.00, 'pending', '2025-08-14', '2025-08-14 10:16:05'),
  (8515679, 40444255, '0010', 'CREDIT - Downspout', NULL, NULL, -256.41, 'pending', '2025-08-14', '2025-08-14 10:28:06'),
  (8519550, 37542899, '0009', 'Additional Change Order Plants', '(8) 15 Gallon Podacarpus. $950
(5) 5 Gallon Japanese Boxwood $200
(8) 5 Gallon Lomandra $320
(1) 15 Gallon Foxtail $175
(2) 5 Gallon Gardenia $80', NULL, 1725.00, 'pending', '2025-08-15', '2025-08-15 07:41:02'),
  (8519564, 37542899, '0010', 'Transplant', 'Client onsite rewquest to transplant 10 plants', NULL, 300.00, 'pending', '2025-08-15', '2025-08-15 07:43:14'),
  (8520488, 39406205, '0008', 'Credit', 'credit for delayed response in finalizing project', NULL, -500.00, 'pending', '2025-08-15', '2025-08-15 09:50:49'),
  (8520563, 40118858, '0001', 'Karme - Pool Permit', 'Hours total:  5
Permit Cost (Plan Review + Permit): $2,511.64
Engineering: $170.78
Total: $2,682.42', NULL, 3057.42, 'sold', '2025-08-15', '2025-08-15 09:59:52'),
  (8520595, 40427946, '0002', 'Tsui - Pool Permit', 'The 2.5 hours include:
Drafting detailed plan per city requirements, revision of scope of work. Submitting plan to structural engineering and review of detail. Online submission. Communication & correspondence with city plan checkers to ensure compliance with local codes and standards for approval. Permit issuance.

Costs:
Permit Cost (Plan Review + Permit): $1,483.86
Engineering: $170.78
Total: $1,654.64', NULL, 1842.14, 'sold', '2025-08-15', '2025-08-15 10:04:14'),
  (8520601, 38912565, '0007', 'Pradel - Replacing Garage Conc. Permit', 'The 5 hours include:
Drafting plan per and conc. detail per city requirements, revision of scope of work. Over the counter submission of plans to relevant authorities to ensure compliance with local codes and standards for approval. Permit issuance.

Costs:
Permit Cost (Plan Review + Permit): $1,014.95', NULL, 1389.95, 'sold', '2025-08-15', '2025-08-15 10:05:54'),
  (8520603, 39433058, '0003', 'Schaad- Ret Wal, BBQ and Patio Cover Permits', 'Time Invested to Obtain Permit: 3.5 hours.
Drafting detailed plan per city requirements, revision of scope of work. Application and plan submittal online to the city. Communication and correspondence with the city plan checker. Drafted corrections per city comments. Permit issuance.

Costs:
Ret. Wall Plan Check: $329.43
Ret. Wall Permit: $307.43
Engineering Plans: $155.25
Restamp of Engineering Plans: $46.58
BBQ, Gas & Elec. Permit: $391.51
Patio Cover Plan Review: $260.15
Patio Cover Permit Issuance: $615.86
Total: $2,106.21', NULL, 2368.71, 'sold', '2025-08-15', '2025-08-15 10:06:38'),
  (8520611, 40560885, '0003', 'Rily - Electrical Permit', 'The 1.5 hours include:
Revision of scope of work.  Over-the-counter application submission to the city. Permit issuance.

Costs:
Permit Cost: $130.00
Total: $130.00', NULL, 242.50, 'sold', '2025-08-15', '2025-08-15 10:07:13'),
  (8520618, 40422978, '0007', 'Davis - Right of Way - Apron Permit', 'The 2 hours include:
Drafting detailed plan per city requirements, revision of scope of work. Submitting application & plan to city to ensure compliance with local codes and city standards for approval. Addressed comments & corrections from plan checker. Permit issuance.

Costs:
Permit Cost (Plan Review + Permit): $1,535.22
Total: $1,535.22', NULL, 1685.22, 'sold', '2025-08-15', '2025-08-15 10:07:58'),
  (8520881, 39433159, '0003', 'Traum - Fireplace Permit', 'The 5 hours include:
Drafting detailed plan per city requirements, revision of scope of work. Submitting plan to structural engineering and review of detail.  Over the counter coordination/plan check submission addressed comments & corrections per plan checker. Permit issuance.

Costs:
Fireplace Plan Check: $337.29
Fireplace Permit: $376.79
Gas/Electrical Permit: $201.09
Total Cost: $1,965.17
Thanks,', NULL, 1290.17, 'sold', '2025-08-15', '2025-08-15 10:44:40'),
  (8520896, 40444255, '0011', 'Kerner - Wall Permit', 'The 1.5 hours include:
Drafting detailed plan per city requirements, revision of scope of work. Online permit submittal. Permit issuance.

Costs:
Wall Permit: $173.93
Total Cost: $173.93', NULL, 286.43, 'sold', '2025-08-15', '2025-08-15 10:46:03'),
  (8521211, 39747782, '0012', 'Credit Permit Fees', 'The 2 hours include:
Drafting detailed plans per Bureau of Eng. requirements. Submission of application and plan to the Bureau of eng. Communication and correspondence with the bureau of engineering plan checker. Permit issuance.

Costs:
Curb Core Permit: $343.78
Total Cost: $343.78
 350 paid', NULL, -6.22, 'pending', '2025-08-15', '2025-08-15 11:36:19'),
  (8521374, 38912565, '0008', 'Pradel - Right of Way Use Permit', 'The 4 hours include:
Over the counter submission of application to relevant authorities to ensure compliance with local codes and standards for approval. Permit issuance.

Costs:
Right of Way Use Permit: $537.70
Total: $537.70', NULL, 837.70, 'sold', '2025-08-15', '2025-08-15 11:55:38'),
  (8521378, 40422978, '0008', 'Davis - Electrical Permit', 'Online application submission. Permit issuance.

Costs:
Permit Cost: $108.92', NULL, 108.92, 'sold', '2025-08-15', '2025-08-15 11:56:17'),
  (8521384, 37604325, '0013', 'Naim- Pool Enclosure Fence Permit', 'The 3 hours include:
Drafting of permit plan. Over the counter submission of application to relevant authorities to ensure compliance with local codes and standards for approval. Permit issuance.

Costs:
 Pool Enclosure Fence Permit: $1,870.76
Total: $1,870.76', NULL, 2095.76, 'pending', '2025-08-15', '2025-08-15 11:56:54'),
  (8521405, 39894589, '0003', 'Pazooky Supplemental Pool Permit', 'The 1.5 hours include:
Drafting detailed plan per inspector requirements, revision of scope of work. Over the counter coordination/plan check submission, addressed comments from plan checker. Permit issuance.

Costs:
Pool Supplemental Plan Check: $83.41
Pool Supplemental Permit: $183.38
Total Cost: $266.79', NULL, 266.79, 'pending', '2025-08-15', '2025-08-15 11:59:10'),
  (8521409, 40560885, '0004', 'Rily - Prefab Spa Permit', 'The 3 hours include:
Drafting permit plan. Revision of scope of work.  Over-the-counter application submission to the city. Permit issuance.

Costs:
Permit Cost: $489.95
Total: $489.95', NULL, 714.95, 'pending', '2025-08-15', '2025-08-15 11:59:49'),
  (8521415, 40815571, '0001', 'Bailey Spa/Grading Permit', 'The 4 hours include:
Revision of scope of work & plans. Submitting plan to structural engineering, review of detail.  Over the counter coordination/plan check submission. Picked up corrections from the city, reviewed plan checker comments. Resubmittal to the city. Permit issuance.

Costs:
Pool Engineering Plans: $170.78
Grading Pre-Inspection Report: $161.54
Pool & Grading Plan Check: $560.66
Pool Eng. Revision to Plans: $46.58
Pool & Grading Permits: $994.74
Total Cost: $1,934.30', NULL, 2234.30, 'pending', '2025-08-15', '2025-08-15 12:00:39'),
  (8521420, 39894589, '0004', 'Pazooky - Street Use Permit', 'Submitting application online. Permit issuance.

Costs:
Street Use Permit: $66.67
Total Cost: $66.67', NULL, 66.67, 'pending', '2025-08-15', '2025-08-15 12:01:13'),
  (8521597, 39565852, '0003', 'Hernandez - Pool Permit', 'The 5 hours include:
Drafting detailed plan per city requirements, revision of scope of work. Application and plan submittal online to Alhambra city. Communication & correspondence with city plan checkers. Drafting/updating plans per city comments/corrections. Communication & correspondence with soils eng. Permit issuance.

Costs:
Pool Engineering Plans: $377.78
Planning Plan Review: $291.02
Pool /Grading Plan Check: $1,614.43
Pool Engineered Restamp: $46.58
Pool Permit: $1,475.54
Total Cost: $3,805.35', NULL, 4180.35, 'sold', '2025-08-15', '2025-08-15 12:24:55'),
  (8521601, 40715934, '0001', 'Goldberg - Pool Remodel Permit', 'The 3.5 hours include:
Drafting detailed plan per city requirements, revision of scope of work. Submitting plan to structural engineering and review of detail. Online submission. Communication & correspondence with city plan checkers to ensure compliance with local codes and standards for approval. Addressed and drafted corrections from County Plan Checker. Permit issuance.

Costs:
Pool Engineering Plans: $170.78
Pool Remodel Plan Check: $405.53
CND Clearance Deposit: $620.00
Pool Engineering Plan Revision: $46.58
Pool Remodel Permits: $1,540.43
Total Cost: $2,783.32', NULL, 3045.82, 'sold', '2025-08-15', '2025-08-15 12:25:35'),
  (8526590, 40422978, '0009', 'Partial Credit for Design', 'Mary, I wanted to extend a partial credit on the design as a courtesy for you.', NULL, -400.00, 'sold', '2025-08-18', '2025-08-18 11:32:35'),
  (8528838, 40427946, '0003', '26’ Seat Wall with Bellecrete Cap', 'Adding 26 linear feet wall @ 18” tall, in back left corner of yard. To get 10” Bellecrete modern cap', NULL, 6000.00, 'sold', '2025-08-18', '2025-08-18 18:13:35'),
  (8528839, 40427946, '0004', 'Slot drains for backyard', 'Current estimate has drainage included, the change order cost of $2000 is in addition to the $2091 on the contract', NULL, 2000.00, 'sold', '2025-08-18', '2025-08-18 18:13:51'),
  (8537744, 40427946, '0005', 'Credit for Pavers', 'Removing 32sqft of paver area to accomodate planter and seated wall', NULL, -660.00, 'sold', '2025-08-20', '2025-08-20 10:01:14'),
  (8540936, 40922633, '0002', 'Credit for 1 Gallon Plants', 'Estimate quantity is more than design
total of (14) 1 gallons is missing from plan', NULL, -230.00, 'pending', '2025-08-20', '2025-08-20 14:56:16'),
  (8543962, 40427946, '0006', 'Pebble Sheen Plaster Upgrade', NULL, NULL, 5540.00, 'sold', '2025-08-21', '2025-08-21 08:57:59'),
  (8545849, 40824206, '0005', 'Bury Main Line (existing on fence), 44 LF', 'Approved by client', NULL, 360.00, 'pending', '2025-08-21', '2025-08-21 12:04:40'),
  (8547323, 40523628, '0004', '3 Gardenias (15g) + Light Install', NULL, NULL, 140.00, 'pending', '2025-08-21', '2025-08-21 14:53:14'),
  (8547554, 40824206, '0006', 'Paver overage -  $1700', NULL, NULL, 1700.00, 'pending', '2025-08-21', '2025-08-21 15:43:04'),
  (8552723, 41275269, '0001', 'Brass valve install (1)', 'Brass valve install.', NULL, 160.00, 'sold', '2025-08-22', '2025-08-22 15:22:50'),
  (8553566, 32422492, '0014', 'Saltillo sealer and repair', 'Repair 3 tiles. Add 3 gallons of sealer. Tiles will be provided by client', NULL, 1000.00, 'sold', '2025-08-24', '2025-08-24 10:31:44'),
  (8559941, 40523628, '0005', 'Additional Mulching LG BARK NUGGETS - Front Yard', NULL, NULL, 329.00, 'pending', '2025-08-25', '2025-08-25 16:31:17'),
  (8569115, 40118858, '0002', 'Relocating mainline and valves', 'Moving irrigation valves outside deck area, reconnecting them to existing irrigation.

Running new mainline to rear irrigation valves', NULL, 1200.00, 'sold', '2025-08-27', '2025-08-27 06:52:47'),
  (8569266, 38644965, '0007', 'Misc additional planting for driveway', '13 1 gallon Japanese boxwood2 1 gallon foxtail fern8 5 gallon privets staked', NULL, 500.00, 'pending', '2025-08-27', '2025-08-27 07:10:26'),
  (8574031, 39894589, '0005', 'Pazooky - Plumbing Permit', 'Max requested I get a plumbing permit for Pazzoky. Took about 10 min. online.

Costs:
Plumbing/Elec. Permit: $209.28
Ser Fee: $
Total: $209.28', NULL, 209.28, 'pending', '2025-08-27', '2025-08-27 16:38:59'),
  (8574033, 38912565, '0009', 'Pradel - Sump Pump Permit', 'I invested a cumulative of 8 hours to get the permit issued.

The 8 hours include:
Drafting plan per and details per city requirements, revision of scope of work. Over the counter submission of plans to relevant authorities to ensure compliance with local codes and standards for approval. Permit issuance.

Costs:
Permit Cost (Plan Review + Permit): $1,570.58
Total: $1,570.58

No more permits are expected pulled for this project.', NULL, 2170.58, 'sold', '2025-08-27', '2025-08-27 16:39:35'),
  (8574040, 38912565, '0010', 'Pradel - Stucco Permit', 'I invested a cumulative of 3 hours to get the permit issued.

The 3 hours include:
Drafting plan per and details per city requirements, revision of scope of work. Over the counter submission of plans to relevant authorities to ensure compliance with local codes and standards for approval. Permit issuance.

Costs:
Permit Cost (Plan Review + Permit): $2,575.40
Total: $2,575.40', NULL, 2800.40, 'sold', '2025-08-27', '2025-08-27 16:42:06'),
  (8576280, 37604325, '0014', 'Concrete Sealer cost', '$4 per sqft Total sqft 1850 sqft with $1600 Discount', NULL, 6200.00, 'sold', '2025-08-28', '2025-08-28 08:22:06'),
  (8576666, 39565852, '0004', 'Remove concrete walkway and replace with/brick', '66 sqft total 
To be replaced with brick', NULL, 3630.00, 'sold', '2025-08-28', '2025-08-28 09:01:09'),
  (8576701, 39565852, '0005', 'Electric Heater', NULL, NULL, 5217.00, 'sold', '2025-08-28', '2025-08-28 09:04:16'),
  (8577688, 36148606, '0014', 'Sod Installation', NULL, NULL, 800.00, 'pending', '2025-08-28', '2025-08-28 10:53:52'),
  (8580175, 39747782, '0013', 'Work completed', 'All plants installed to client satisfaction.', NULL, 0, 'pending', '2025-08-28', '2025-08-28 16:27:55'),
  (8583602, 40612449, '0008', 'Sealer', 'seal coping', NULL, 300.00, 'sold', '2025-08-29', '2025-08-29 11:43:56'),
  (8583665, 40612449, '0009', 'additional gallons for stain (2)', '2 additional gallons with labor if needed

Can not gurantee color or finish of the stain.', NULL, 400.00, 'sold', '2025-08-29', '2025-08-29 11:52:03'),
  (8590621, 40118858, '0003', 'Karme - Pool Permit supplemental', 'Adding this to the Cost of the Permit:

Construction Tax - $768.00

Josselyn Garcia from Pasadena Permit Center reached out to me telling me:

"Hello,
We’re reaching out regarding permit BLDSFR2025-02090. Upon review, we discovered that a Construction Tax fee was inadvertently omitted from the original invoice and was not paid at the time of permit issuance.
We apologize for the oversight and appreciate your understanding.
Please find below the invoice for the construction tax. Kindly let me know once the payment has been processed.
Feel free to reach out if you have any questions."', NULL, 768.00, 'sold', '2025-09-02', '2025-09-02 12:09:52'),
  (8592809, 41157433, '0001', 'Softscaping Add-Ons', 'Remove existing brick planting border in front yard, approx. 31 linear feet - $70
Grind existing stump and remove - $151
Install (1 qty.) 10’ ht. 6 x 6 redwood post set in concrete footing - $291
Provide and install the following plantings: - $410
Install (3 qty.) 5 gallon succulents = VARYING ALOE SPECIES (red & orange blooms), MIX IT UP.
Install (1 qty.) 1 gallon succulent = ALOE
Install (12 qty.) 4” herbs = ANY VARIETY, BUT MIX IT UP.
Potting soil allowance - $50
Install 116 linear feet of black metal benderboard edging - $2,294', NULL, 3267.00, 'pending', '2025-09-02', '2025-09-02 17:45:39'),
  (8598509, 41127201, '0001', 'CO - Rachio Timer', NULL, NULL, 400.00, 'pending', '2025-09-03', '2025-09-03 13:34:29'),
  (8598511, 41127201, '0002', 'CO - Extra Demo', 'Re-grade/haul away 2" of dirt', NULL, 1000.00, 'pending', '2025-09-03', '2025-09-03 13:34:40'),
  (8601155, 32422492, '0015', 'Gravel', 'Install half a yard of white gravel. In planters and back of adu', NULL, 575.00, 'sold', '2025-09-04', '2025-09-04 06:48:00'),
  (8605724, 41157433, '0002', 'Addt''l Creeping Rosemary, 5g', '1 more 5g x Creeping Rosemary to plant in owner provided pot', NULL, 56.72, 'pending', '2025-09-04', '2025-09-04 14:49:28'),
  (8605883, 37542899, '0011', '2 smart plugs for low voltage lights', '2 wifi smart plug adapter for low voltage lights', NULL, 260.00, 'pending', '2025-09-04', '2025-09-04 15:17:10'),
  (8605901, 41127201, '0003', '1 more Silver Sheen, 15g.', NULL, NULL, 98.00, 'pending', '2025-09-04', '2025-09-04 15:19:11'),
  (8605933, 40824206, '0007', 'Extra Outlet', NULL, NULL, 382.00, 'pending', '2025-09-04', '2025-09-04 15:22:45'),
  (8624552, 41275269, '0002', 'Stain concrete', 'Stain existing concrete via Paul''s recommendation.', NULL, 473.00, 'sold', '2025-09-09', '2025-09-09 13:38:28'),
  (8625095, 37561500, '0007', 'Credit Gravel rear planter wall & replace w/mulch', NULL, NULL, -1300.00, 'pending', '2025-09-09', '2025-09-09 14:39:02'),
  (8628685, 37561500, '0008', 'More plants - Approved by owner', NULL, 'Yes, that''s correct.  I guess our planting diagram was not to scale, so there were some big gaps.  I approve the additional cost of the plants. 

On Wed, Sep 10, 2025, 9:34?AM John Durso  wrote:
Hi Christopher - I was told you want (17) more 15 gal & (6) more 5 gal plants. If that is correct, the cost would be 2029.00

I am going into a zoom shortly but should be done around 11am if you have questions.', 2029.00, 'pending', '2025-09-10', '2025-09-10 09:43:09'),
  (8629397, 41157433, '0003', 'Adding Pavers Beneath all pots and leveling.', '2 man days to remove all the pots install flat pavers underneath all of them and then place them back with irrigation.', NULL, 0, 'pending', '2025-09-10', '2025-09-10 10:59:18'),
  (8629422, 41157433, '0004', 'Adding plants for pots', '4 more 5 gallon plants needed for filling additional pots', NULL, 0, 'pending', '2025-09-10', '2025-09-10 11:02:09'),
  (8635271, 41157433, '0005', 'Pavers for Pots + Plants', 'Remove existing pots
Install flat pavers underneath pots, re-place with irrigation
Provide and install (4 qty.) additional 5 gallon standard shrubs', 'Remove existing pots
Install flat pavers underneath pots, re-place with irrigation
Provide and install (4 qty.) additional 5 gallon standard shrubs', 1671.00, 'pending', '2025-09-11', '2025-09-11 10:18:32'),
  (8638104, 40824206, '0008', 'CREDIT - Water Feature', NULL, NULL, -1055.00, 'pending', '2025-09-11', '2025-09-11 16:42:26'),
  (8638179, 38774894, '0012', 'Misc items approved by Iraj via phone', 'Description
			Unit
			QTY
			Unit Cost
			Total Cost
		
		
			Mulch
			Yards
			34
			241.1765
			 $    8,200.00
		
		
			Gravel / weed barrier
			Sf
			1960
			3.265306
			 $    6,400.00
		
		
			Lighting
			ea
			57
			217.5439
			 $  12,400.00
		
		
			Metal Edging
			ld
			225
			15.5
			 $    3,487.50
		
		
			Sports Court
			ls
			1100
			12.54545
			 $  13,800.00
		
		
			 
			 
			 
			 
			 $                 -   
		
		
			 
			 
			 
			 
			 $  44,287.50', NULL, 44287.00, 'pending', '2025-09-11', '2025-09-11 17:22:04'),
  (8640442, 39433058, '0004', 'Schaad - Plant Change Order', NULL, NULL, 162.00, 'sold', '2025-09-12', '2025-09-12 09:03:47'),
  (8642853, 40427946, '0007', 'Credit for 26'' Bellecrete Wall Cap', 'Cap to be Travertine Coping', NULL, -400.00, 'sold', '2025-09-12', '2025-09-12 14:35:43'),
  (8642859, 40427946, '0008', 'Credit for Plant Material', 'Original Contract Planting:

Till and amend planting area soil, approx. 400 square feet
Install the following plant sizes/quantities:
(34 qty.) 15 gal shrubs
(20 qty.) 5 gal shrubs
(37 qty.) 1 gal shrubs
(1 qty.) flat of groundcover', NULL, -5309.00, 'sold', '2025-09-12', '2025-09-12 14:36:59'),
  (8645167, 38912565, '0011', 'Adding saltwater chlorinator with startup', 'Adding a saltwater chlorinator
Adding pool saltwater  startup', NULL, 3200.00, 'sold', '2025-09-15', '2025-09-15 07:04:26'),
  (8647867, 40427946, '0009', 'Plant Material (updated)', 'Install approx (30) 5 gallon shrubs (preferrably Agaia Odorata - Chinese Fragrance Plant)
Price includes tilling soil and adding plant amendments', NULL, 1800.00, 'sold', '2025-09-15', '2025-09-15 12:04:58'),
  (8649841, 40752094, '0001', 'New steps, demo concrete landing, credit drains', 'Demolish and remove existing step/landing in east rear yard, approx. 12 square feet
Install 28 linear feet of bullnose step build around pavers (Color: TBD)
Credit for 95 linear feet of SDR35 4” drainpipe and (5 qty.) paver top inlet drains', 'Demolish and remove existing step/landing in east rear yard, approx. 12 square feet
Install 28 linear feet of bullnose step build around pavers (Color: TBD)
Credit for 95 linear feet of SDR35 4” drainpipe and (5 qty.) paver top inlet drains', 1485.00, 'pending', '2025-09-15', '2025-09-15 16:09:52'),
  (8654220, 40523628, '0006', 'Paver Sealer', 'Blk/white spots on pavers need to be corrected before sealer goes on. 
480 sqft of sealer and 1 md', 'Debbie said blk/white spots on pavers need to get corrected before sealer goes on. Texted Bryan if he knew about that. Bryan can do sealer on during yard check.
480 sqft of sealer and 1 md', 1171.00, 'pending', '2025-09-16', '2025-09-16 11:46:19'),
  (8655533, 37561500, '0009', 'Credit 8 Eugenia 15g & 3 gardenia 5 g', NULL, NULL, -961.00, 'pending', '2025-09-16', '2025-09-16 13:52:12'),
  (8656743, 40612449, '0010', 'Credit - Backfilling', NULL, NULL, -300.00, 'pending', '2025-09-16', '2025-09-16 17:49:17'),
  (8656745, 40612449, '0012', 'Credit - Piles Partial', NULL, NULL, -250.00, 'pending', '2025-09-16', '2025-09-16 17:49:40'),
  (8656747, 40612449, '0013', '1 Pool Light', NULL, NULL, 1080.00, 'pending', '2025-09-16', '2025-09-16 17:50:02'),
  (8659918, 39406205, '0009', 'Additional Credit', NULL, NULL, -240.00, 'pending', '2025-09-17', '2025-09-17 10:12:40'),
  (8660892, 40118858, '0004', 'Karme - Gas/Electrical Permit', 'The 15 mins include:
Online application submittal. Permit issuance.

Costs:
Costs:
Electrical Permit: $105.28
Gas Permit: $118.80
Total: $224.08', NULL, 242.83, 'sold', '2025-09-17', '2025-09-17 11:38:49'),
  (8660988, 41467003, '0001', 'Petta (Towsend) - Driveway Permit', 'The 1 hours includes:
Submission of application to the Bureau of eng. Virtual meeting with the bureau of engineering plan checker. Addressing concerns and comments. Permit issuance.

Costs:
Driveway Permit: $376.29
Total Cost: $376.29', NULL, 451.29, 'pending', '2025-09-17', '2025-09-17 11:46:58'),
  (8661801, 40836356, '0004', 'Misc debris + 2 plants', 'misc debris removal from backyard - 2 5 gallon plants lava rock for fireplace', NULL, 1550.00, 'pending', '2025-09-17', '2025-09-17 12:58:18'),
  (8671718, 41875273, '0001', 'Credit', 'Credit Electrical
Credit Electrical in contract
COST
Remove Rear Fence
Remove rear wood fence panel and posts/footings
COST $634', NULL, -1174.00, 'pending', '2025-09-19', '2025-09-19 08:54:31'),
  (8671794, 40824206, '0009', '2 submersible lights', 'Install 2 lights for water feature', NULL, 240.00, 'pending', '2025-09-19', '2025-09-19 09:02:24'),
  (8674086, 38774894, '0013', 'Additional items approved verbally over phone', 'Description
			Unit
			QTY
			Unit Cost
			Total Cost
		
		
			Planting
			Per Plan
			1
			23600
			 $  23,600.00
		
		
			Sod
			Sqft
			2200
			4.1
			 $    9,020.00
		
		
			Irrigation
			Ea
			12
			1466.667
			 $  17,600.00
		
		
			 
			 
			 
			 
			 $  50,220.00', NULL, 50220.00, 'pending', '2025-09-19', '2025-09-19 13:39:59'),
  (8674486, 40523628, '0007', 'Additional light', 'Addint an additional up light', NULL, 210.00, 'sold', '2025-09-19', '2025-09-19 14:56:45'),
  (8676298, 2018519, '0002', 'Additional Sanding', NULL, NULL, 1000.00, 'pending', '2025-09-22', '2025-09-22 06:00:33'),
  (8676308, 41018046, '0001', 'Billed to Contractor - EverFence', 'Damange to call', NULL, 0, 'pending', '2025-09-22', '2025-09-22 06:02:24'),
  (8677562, 39894589, '0006', 'Moving pool equipment', '2 lights upgraded to 200 ft Electrical work run Gas line run New plumbing materials cost $2400 8 man days of labor', NULL, 7700.00, 'pending', '2025-09-22', '2025-09-22 08:33:54'),
  (8679479, 37542899, '0012', 'Misc items', '5 podacarpis 15 gallon
60 acacia 5 gallons
2 1 gallon ceonthus
4 Lomandria 5 gallon
20 Lomandria left side 1 irrigation zone
1 flat dwarf mondo

20 Lomandria upper deck side run Irrigation down same line

Replace 1 24 in podacarpis warranty
6 5 gallon Huntington rosemary

Transplant ceonthus from front to back
add irrigation emitters to all plants', NULL, 8200.00, 'pending', '2025-09-22', '2025-09-22 11:58:02'),
  (8683678, 40922633, '0003', 'Mailbox Installation', NULL, NULL, 425.00, 'sold', '2025-09-23', '2025-09-23 08:24:16'),
  (8683691, 40922633, '0004', '(1) Path Light', NULL, NULL, 190.00, 'sold', '2025-09-23', '2025-09-23 08:25:51'),
  (8683705, 40922633, '0005', 'Credit for (1) Smart Timer', NULL, NULL, -110.00, 'sold', '2025-09-23', '2025-09-23 08:27:36'),
  (8687233, 41157433, '0006', 'Additional Lighting', 'Adding 5 additional lights 210 per light.', NULL, 1050.00, 'pending', '2025-09-23', '2025-09-23 14:26:14'),
  (8692510, 40523628, '0008', 'CREDIT - remove Ceiling Fans', NULL, NULL, -1234.00, 'pending', '2025-09-24', '2025-09-24 12:26:26'),
  (8694019, 41447322, '0001', 'Addt''l Pavers, Drains, Posts, Planting', 'Pavers & Step Install an additional 27 square feet of ‘Angelus’ brand ‘Paseo I & II’ paver 
Drainage Install drainage lines and outlets as needed
New Posts Temporarily shore existing patio posts
Install (3 qty.) new posts set in concrete footings
Additional Planting Provide and install (3 qty.) 15 gallon shrubs', NULL, 3690.00, 'pending', '2025-09-24', '2025-09-24 15:01:54'),
  (8698638, 39350219, '0002', 'CO - 9 additional lights on site', 'Contract has 25 lights allocated, plan has 36 lights called. 34 were installed. so 9 additional masonry step lights.', NULL, 1101.42, 'sold', '2025-09-25', '2025-09-25 11:36:56'),
  (8698725, 39350219, '0003', 'CO - 524sqft of gravel to mulch', NULL, NULL, -1188.17, 'sold', '2025-09-25', '2025-09-25 11:46:41'),
  (8699927, 38774894, '0014', 'Credit for stucco', 'removal of stucco finishes on bbq and Pilasters', NULL, -2320.00, 'pending', '2025-09-25', '2025-09-25 13:29:02'),
  (8700366, 38707991, '0001', 'CREDIT - Stucco', NULL, NULL, -1200.00, 'pending', '2025-09-25', '2025-09-25 14:24:10'),
  (8700688, 40752094, '0002', 'Credit Step, Add 54 Sq Ft of Pavers', NULL, NULL, 2002.00, 'pending', '2025-09-25', '2025-09-25 15:18:09'),
  (8700744, 40752094, '0003', 'Credit Step, Add 54 Sq Ft of Pavers', NULL, NULL, -240.97, 'sold', '2025-09-25', '2025-09-25 15:32:37'),
  (8700763, 41466802, '0001', 'Additional material', NULL, NULL, 485.23, 'pending', '2025-09-25', '2025-09-25 15:38:12'),
  (8700961, 40427946, '0010', 'Electric Heater Upgrade', NULL, NULL, 900.00, 'sold', '2025-09-25', '2025-09-25 16:40:09'),
  (8700976, 37561500, '0010', 'CO - Electrical', '42 ln conduit, 3 electrical wire , 1 outlet', NULL, 1809.28, 'pending', '2025-09-25', '2025-09-25 16:44:39'),
  (8701006, 41467003, '0002', 'CREDIT - Driveway sidewalk', NULL, NULL, -4500.00, 'pending', '2025-09-25', '2025-09-25 16:53:10'),
  (8703760, 39565852, '0006', 'Automation System for Pool', 'Includes programming and installation', NULL, 4400.00, 'sold', '2025-09-26', '2025-09-26 10:30:23'),
  (8714328, 40922633, '0006', 'Drain At Top of Steps', NULL, NULL, 242.00, 'sold', '2025-09-30', '2025-09-30 07:36:03'),
  (8714332, 40922633, '0007', 'Repair Stucco', NULL, NULL, 220.00, 'sold', '2025-09-30', '2025-09-30 07:36:25'),
  (8714827, 40715934, '0002', 'Seat Bench and Wall to cover fence', 'Installing Seat bench across the back fence.; 18 inches tall with Bellecrete cap 14 inches wide.

Small wall approx 9 inches Tall  x 22 Ln feet - Stucco Finish, Stucco Cap', NULL, 7900.00, 'pending', '2025-09-30', '2025-09-30 08:34:48'),
  (8715635, 40922633, '0008', 'Repairing/Rebuilding Wall by top of driveway', NULL, NULL, 450.00, 'sold', '2025-09-30', '2025-09-30 09:49:38'),
  (8717245, 34570205, '0007', 'Install 1 sprinkler', 'Install 1 sprinkler in front yard', NULL, 150.00, 'pending', '2025-09-30', '2025-09-30 12:21:21'),
  (8719402, 41762724, '0001', 'Filling cells of wall with Concrete', NULL, NULL, 200.00, 'pending', '2025-09-30', '2025-09-30 18:42:11'),
  (8727919, 41762724, '0002', 'Extra 4" Blocks', NULL, NULL, 100.00, 'sold', '2025-10-02', '2025-10-02 07:28:38'),
  (8733837, 40715934, '0003', 'Additional 8 lights & 100lf.strip lights', 'Total lights 8 little smokey (black) (change order) 

17 masonry lights (covered under original scope) 

1 wall washer (black) (covered under original scope) 

100 LF. Strip lights added (change order) 

2 dimmers', NULL, 3800.00, 'sold', '2025-10-03', '2025-10-03 07:15:16'),
  (8736182, 3164800, '1606992', 'Repair work on previous areas', NULL, NULL, 2000.00, 'pending', '2025-10-03', '2025-10-03 12:07:26'),
  (8736856, 39433058, '0005', 'Wall extension', NULL, NULL, 2969.00, 'pending', '2025-10-03', '2025-10-03 13:42:17'),
  (8737625, 40427946, '0011', 'Channel drain for side yard pavers', 'Attach 30’ channel drain along the side of the pavers and between fence. Tie into storm drain line to prevent water to flow onto neighbors property.', NULL, 587.00, 'sold', '2025-10-04', '2025-10-04 05:28:32'),
  (8738911, 41577005, '0001', 'Replacing concrete walk (by studio) w/brick path', 'Approximately 81 sqft of mortared brick walkway in a herringbone pattern with a row lock border on opposite side of the drain to match the upper patio. Bricks are to be set on a reinforced concrete base.', NULL, 4090.00, 'sold', '2025-10-06', '2025-10-06 06:15:24'),
  (8744130, 41180335, '0001', 'CO - Pool Remodel Permit', 'Drafting detailed plan per city requirements, revision of scope of work. Drivetime to Altadena One Stop Center. Over the counter submittal plans review for approval. Permit issuance.

Costs:
Pool Remodel Permits: $2,297.83
Total Cost: $2,297.83

--
Thanks,', NULL, 2297.83, 'pending', '2025-10-06', '2025-10-06 16:56:46'),
  (8746884, 41157433, '0007', 'Credit for 1g size Addt''l Plants', 'Spoke to Taran on 10/06 about the additional planting needed. New planting #s: QTY 5 x 1 gallon (previous change order had 5 gallon x QTY 4). Credit $60.', 'Spoke to Taran on 10/06 about the additional planting needed. New planting #s: QTY 5 x 1 gallon (previous change order had 5 gallon x QTY 4). Credit $60.', -60.00, 'pending', '2025-10-07', '2025-10-07 09:39:06'),
  (8749552, 40118858, '0005', 'CO - Water Main for Irrigation', '65 lnft of main line replacement on rear of property $980.00
replace 8 valves 3/4 inch @ $165 each $1320.00', NULL, 2300.00, 'sold', '2025-10-07', '2025-10-07 13:59:49'),
  (8749556, 40118858, '0006', 'CO - Gas line', '115 linear feet  of gas line 1 1/4"  with poly pipe trenched down 18" below grade  to city code, backfilled and compacted', NULL, 3200.00, 'sold', '2025-10-07', '2025-10-07 14:00:11'),
  (8750346, 40922633, '0009', 'credit for design', NULL, NULL, -600.00, 'pending', '2025-10-07', '2025-10-07 15:50:20'),
  (8750685, 39406460, '0003', 'Pool Filter', NULL, NULL, 1569.89, 'pending', '2025-10-07', '2025-10-07 17:30:44'),
  (8754585, 39894589, '0007', 'Pazooky - Supplemental Pool Equip Location Permit', 'Costs:
Pool Supplemental Plan Check: $79.62
Bureau of Engineering Clearance: $132.21
Pool Supplemental Permit: $170.37
Total Cost: $382.20', NULL, 382.20, 'pending', '2025-10-08', '2025-10-08 11:28:44'),
  (8758605, 41875273, '0002', 'Brick edging wall $378 & addtl demo $200', NULL, NULL, 578.00, 'pending', '2025-10-09', '2025-10-09 07:59:58'),
  (8759604, 37561500, '0011', 'CREDIT - 2x posts in concrete footings', NULL, NULL, -250.00, 'pending', '2025-10-09', '2025-10-09 09:53:16'),
  (8760444, 41332198, '0002', 'Additional Cost for Bricks', 'Per conversation with Don/John/Dana on 10/9/25 
Difference in cost of brick', NULL, 6861.00, 'sold', '2025-10-09', '2025-10-09 11:21:37'),
  (8762297, 40427946, '0012', 'Curb along the side yard channel drain', NULL, NULL, 1688.00, 'sold', '2025-10-09', '2025-10-09 14:29:21'),
  (8762493, 33075936, '0007', 'Final Adj', NULL, NULL, -985.67, 'pending', '2025-10-09', '2025-10-09 14:59:56'),
  (8762807, 41380400, '0001', 'Additional concrete curb', 'Adding a 23linear foot curb to the garage.', NULL, 1300.00, 'pending', '2025-10-09', '2025-10-09 16:18:08'),
  (8764656, 41017067, '0001', 'Demo Costs', '18,000 for labor for a crew for 6 days. 3,000 per day
3,000 for heavy machinery
2,200 in dump fees.', NULL, 23200.00, 'pending', '2025-10-10', '2025-10-10 08:27:53'),
  (8764731, 39907276, '0001', 'Change order for Grading on pavers', NULL, NULL, 2000.00, 'pending', '2025-10-10', '2025-10-10 08:35:45'),
  (8767261, 41875273, '0003', 'Planting $661.00', NULL, NULL, 661.00, 'pending', '2025-10-10', '2025-10-10 14:19:03'),
  (8767516, 40577384, '0003', 'Water Flood Repair', 'Need to be replaced due to water damage from city main rupture.

(2) 5gallon Diosma sunset gold (3) 1gallon sesleria autumnalis (2) 1gallon lomandra longifolia. -  $195 

15 Yards of Mulch per yard installed per contract.  - $1,968.60', NULL, 2163.60, 'pending', '2025-10-10', '2025-10-10 15:28:30'),
  (8767546, 40118858, '0007', 'Additional Gas Line for house main and fireplace', '37 linear feet of additional gas line run 1 ¼” 
buried 18" below grade and compacted back
$1110

Removal of gravel and reinstall of gravel
regrading of planter area
2 man days via Jorge $1400
 

¾ gas line to house fireplace 
 

35 linear feet from pool equipment to fireplace $945 buried 18" below grade and compacted back', NULL, 3455.00, 'sold', '2025-10-10', '2025-10-10 15:38:33'),
  (8771678, 41875273, '0004', 'Plant Upgrade (2) 5gal to 15 gal', NULL, 'Called Cathy & got phone approval', 200.00, 'pending', '2025-10-13', '2025-10-13 11:02:12'),
  (8774013, 36989161, '0005', 'CREDIT - Misc', NULL, NULL, -800.00, 'pending', '2025-10-13', '2025-10-13 16:53:34'),
  (8779849, 39127583, '0001', '2D Design Plan (front)', NULL, NULL, 500.00, 'pending', '2025-10-14', '2025-10-14 15:21:07'),
  (8784909, 38774894, '0015', 'Apron Curb and Gutter', '*Asphalt demo and repair $1990
*$4800 Demo down 8 inches of soil for apron
*Replace Curb and Gutter $3200
$9,990', NULL, 9990.00, 'pending', '2025-10-15', '2025-10-15 12:27:19'),
  (8785664, 37542899, '0013', 'Misc items 2', '42 purple penstemon 1g $10754 Lomandria 5 g for pool area$160Repair irrigation line in grass  $125 depending on excess3 15 gallon blue glow $345 material delivered not planted 30 5g Lomandria added to hill again $1200Move lines and move misc  existing plants down - no cost', NULL, 2905.00, 'pending', '2025-10-15', '2025-10-15 13:49:10'),
  (8786171, 40501925, '0004', 'Hilliside Clean Up', 'Clean Up on Hillside.  Time and Material.  About a crew day and dump fees.  Price to be entered after time.', NULL, 0, 'sold', '2025-10-15', '2025-10-15 15:07:44'),
  (8786398, 40815571, '0002', 'CO  - Credit Materials', 'Coping 
$820 

Tile
$161

Boulders
$430', NULL, -1411.00, 'pending', '2025-10-15', '2025-10-15 16:04:10'),
  (8788318, 39433159, '0004', 'Sealer Install', NULL, NULL, 3000.00, 'pending', '2025-10-16', '2025-10-16 07:44:37'),
  (8788350, 39433159, '0005', 'Log Set Purchase', NULL, NULL, 1400.00, 'sold', '2025-10-16', '2025-10-16 07:47:46'),
  (8792202, 38912565, '0012', 'Upgraded sump pumps per city specs', NULL, NULL, 3300.00, 'sold', '2025-10-16', '2025-10-16 14:50:14'),
  (8792455, 42015121, '0001', 'stump grindmisc roots and stumps', NULL, NULL, 300.00, 'pending', '2025-10-16', '2025-10-16 15:42:38'),
  (8792474, 41466802, '0002', 'credit for drain caps', 'credit for drainage work', NULL, -200.00, 'pending', '2025-10-16', '2025-10-16 15:48:38'),
  (8792767, 41180335, '0002', 'tree removal', 'tree removal $580', NULL, 580.00, 'pending', '2025-10-16', '2025-10-16 17:26:19'),
  (8794232, 41380400, '0002', 'Credit to change from curb, to stucco/French drain', NULL, NULL, -450.00, 'pending', '2025-10-17', '2025-10-17 08:06:28'),
  (8800423, 41875273, '0005', 'CO - rewiring electrical to garage', NULL, NULL, 2940.00, 'pending', '2025-10-20', '2025-10-20 08:33:03'),
  (8807339, 38912565, '0013', 'additional plants', '2 15 gallon citrus
6 flats of ground cover', NULL, 1050.00, 'sold', '2025-10-21', '2025-10-21 09:43:09'),
  (8807352, 40715934, '0004', 'Additional pool items', 'Replacing saltwalter chlorinator
pool plumbing', NULL, 10000.00, 'pending', '2025-10-21', '2025-10-21 09:44:33'),
  (8807596, 39894589, '0008', 'Stucco work all the way to the wall', 'Adding stucco all the way to the wall', NULL, 2000.00, 'pending', '2025-10-21', '2025-10-21 10:09:36'),
  (8808943, 42015121, '0002', 'Add 2 palms', '$2200 each palm

250 for delivery', NULL, 4650.00, 'pending', '2025-10-21', '2025-10-21 12:35:32'),
  (8809944, 40577384, '0004', 'Drainage Work', '(2)  low profile18 catch basins - $450
40 Ln Feet of 4" Sdr Drain Line - $800
(2) 4" Drain Pop Ups - $40', NULL, 1290.00, 'pending', '2025-10-21', '2025-10-21 14:25:27'),
  (8823004, 40118858, '0008', 'CO - Coping', NULL, NULL, 0, 'pending', '2025-10-23', '2025-10-23 13:00:59'),
  (8830612, 41332198, '0003', 'Upgrade to poly sand for bricks', NULL, NULL, 1250.00, 'pending', '2025-10-25', '2025-10-25 10:58:11'),
  (8841814, 39127583, '0002', 'Woodhill - Retaining Wall & Grading Permit', 'The 8 hours include:
Drafting detailed plan per city requirements, revision of scope of work. Over the counter submission of plans to relevant authorities to ensure compliance with local codes and standards for approval. Communication and correspondence with Soils Eng, Structural Public Works, Grading Dept. for city clearances and addressing corrections and updating plans per city requirements. Permit issuance.

Cost:
Retaining Wall & Grading Plan Check: $387.04
GPI Report: $161.54
Bureau of Eng. Clearance: $132.21
Soils Review Letter: $350.68
Soils Approval Letter: $350.68
Retaining Wall & Grading Permits: $449.36
Total: $1,831.51
Time at $75/hour = $600', NULL, 2431.51, 'sold', '2025-10-28', '2025-10-28 11:17:41'),
  (8841825, 40118858, '0009', 'Karme - BBQ Permit', 'The 3.5 hours include:
Drafting detailed plan per city requirements, revision of scope of work. Over the counter submission of plans to relevant authorities to ensure compliance with local codes and standards for approval. Permit issuance.

Costs:
BBQ Permit: $217.98
Time at $75/hour', NULL, 480.48, 'sold', '2025-10-28', '2025-10-28 11:18:48'),
  (8841834, 39565852, '0007', 'Hernandez - Grading Permit', 'The 1 hours include:
Application and plan submission online to Alhambra city. Communication & correspondence with city plan checkers. Permit issuance.

Costs:
Grading Plan Review: $408.11
Grading Permit: $605.30
Total: $1,013.41
Time at $75/hour', NULL, 1088.41, 'sold', '2025-10-28', '2025-10-28 11:19:25'),
  (8841843, 39747782, '0014', 'Russell - Public Works R Permit', 'The 4 hours include:
Application submittal to the Bureau of Engineering. Recording of documents. Communication and correspondence with Bureau of Engineering & Office of the City Administrative Officer. Permit issuance.

Costs:
Record Waiver of Damages for Bureau of Engineering: $104.75
R Permit Review & Permit: $2,090.18
Time at $75/hour = $300', NULL, 2390.18, 'sold', '2025-10-28', '2025-10-28 11:20:13'),
  (8854093, 41261562, '0001', 'Driveway Extension Demo, Trenching for Electrical', 'Extend driveway 501 sf: $8,031

Electrical trenching and conduit 65 LF: $1248', NULL, 9279.00, 'pending', '2025-10-30', '2025-10-30 09:01:12'),
  (8854716, 39894589, '0009', 'CO - Credits for client', 'Attached docuemnt', NULL, -14210.00, 'pending', '2025-10-30', '2025-10-30 10:03:49'),
  (8857123, 41332198, '0004', 'Redwood Edger', 'for bottom of fence line 
60 linear feet', 'Redwood 2x4', 1050.00, 'pending', '2025-10-30', '2025-10-30 13:59:21'),
  (8857497, 42040087, '0001', 'Added Electrical Work', 'Install conduit between light poles, weld LB @ East lamp post, rewire light poles, install 3 way switches, provide breaker + plug for sauna', NULL, 1400.00, 'pending', '2025-10-30', '2025-10-30 14:53:48'),
  (8857987, 42015121, '0003', 'Repairing front entry concrete corner', NULL, NULL, 450.00, 'pending', '2025-10-30', '2025-10-30 17:02:55'),
  (8858376, 42165550, '0001', 'Additional rock and Edging', 'Installing 5 yards of rock with weed barrier and installing allowance  20 linear feet of new Edging
Reinstalling existing benderboard with new stakes.', NULL, 2800.00, 'pending', '2025-10-30', '2025-10-30 20:31:59'),
  (8861101, 41261562, '0002', 'Paver Selection/Change', 'Patio Angelus 12x24 paver
Driveway Angelus 4x12 80 mm paver', NULL, 2561.00, 'pending', '2025-10-31', '2025-10-31 10:53:20'),
  (8861501, 41859021, '0001', 'plants/Lighting', 'Page 1 of 1
Change Order For Greg Patatian - 10/31/2025
18500 St. Moritz
Tarzana, CA 91356
Plant Size Upgrade
Upgrade (44 qty.) 1 gal shrubs to 5 gal standard shrubs
COST $1,056
Lighting Labor Only
Install the following Owner Provided materials
1000 ft of 12-2 low voltage wire
(10) path Lights
(19) Flood lights
(12) Spot Lights
(2) Transformers
Misc wire nuts/tape
COST $2,750
Job Total Cash/Check Price $3,806
*This price is valid for up to 30 days from above date', NULL, 3806.00, 'pending', '2025-10-31', '2025-10-31 11:37:48'),
  (8866956, 39633159, '0001', 'Credit for irrigation timer', NULL, NULL, -200.00, 'sold', '2025-11-03', '2025-11-03 10:21:16'),
  (8867006, 39633159, '0002', 'Credit for (3) up lights for front yard', NULL, NULL, -600.00, 'sold', '2025-11-03', '2025-11-03 10:26:05'),
  (8867033, 39633159, '0003', '(7) Path Lights for backyard', 'Lights to be flat side path', NULL, 1400.00, 'sold', '2025-11-03', '2025-11-03 10:28:37'),
  (8867186, 39633159, '0005', 'Credit for (6) 5 gallon plants', NULL, NULL, -240.00, 'sold', '2025-11-03', '2025-11-03 10:43:23'),
  (8867486, 38774894, '0016', 'Wall and backfilling in back planter', NULL, NULL, 2600.00, 'pending', '2025-11-03', '2025-11-03 11:20:04'),
  (8871445, 39633159, '0006', '(6) new 5 gallon shrubs (Mexican Salvia)', NULL, NULL, 240.00, 'pending', '2025-11-04', '2025-11-04 06:51:42'),
  (8879864, 40118858, '0010', 'Pool cover', 'Electrical work and trenching with conduit
new motor
new tracks
Safety sensors
New black pool cover
Adjustment to motor housing size
Drain overflow into basin', NULL, 21000.00, 'pending', '2025-11-05', '2025-11-05 09:25:46'),
  (8879898, 40118858, '0011', 'Pool steps and baja backfill', 'shotcrete new steps into pool, backfill baja. 
adding small steps by spa side for new entry
full length steps into pool after baja', NULL, 8000.00, 'sold', '2025-11-05', '2025-11-05 09:28:28'),
  (8879929, 38774894, '0017', 'additional putting green 27x14', NULL, NULL, 8300.00, 'pending', '2025-11-05', '2025-11-05 09:31:22'),
  (8883052, 37690129, '0002', 'Addedl Electrical Rough In - Main Line Replace', 'Electrical Rough In for Services
 

	Trench soils down 30” below final grade (assuming site at – 4 inches)
	Trench soils 6 inches wide
	Install 1348 Ln Feet of 5” Sch 40 PVC 
	Install 6 inch conduit sanding layer per specification.
	Add in 6 inch wide electrical burial warning tape. 
	Install (2) 5” Grey PVC Conduit in all trenches.
	Add in 6 inch wide electrical burial warning tape. 
	Back fill additional trenching material and compact in lifts with pneumatic tamper.
	Conductors and termination attachments by others


COST $51,224


Mainline Reinstallation 

713 ln feet of mainline was pulled out and backfilled by grader.  This was only a partial portion of the front installation where the rest is covered under the existing contract. 
 

	Trench Soils down 24” below final grade. 
	Install 1” Schedule 40 PVC piping along the front


 
COST $11,695



Gate Motor Electrical Conduit

This is to run additional electrical conduit for gate motors.  Most of this will be run in the mainline trench and main service conduit trenches. 
 

	Trench Soils down 24” below final grade in softscape 
	Trench Soils down 30” below final grade Hardscape Areas.
	Much of the trenching is being credited under the mainline installation so the only additional trenching and backfilling being charged is 310 feet. 
	Install 1373 ln feet of 1” PVC Conduit.
	Conductors and final termination by other.


 
COST $10,792


ESTIMATE TOTAL $73,711', 'rerun mainline irrigation', 73711.00, 'pending', '2025-11-05', '2025-11-05 14:34:41'),
  (8883728, 40715934, '0005', 'Umbrella sleeves', NULL, NULL, 500.00, 'sold', '2025-11-05', '2025-11-05 17:25:35'),
  (8888729, 41180335, '0003', 'Electrical for water feature', NULL, NULL, 1100.00, 'sold', '2025-11-06', '2025-11-06 13:21:57'),
  (8888738, 41180335, '0004', 'Water line for water feature', NULL, NULL, 400.00, 'sold', '2025-11-06', '2025-11-06 13:22:31'),
  (8895380, 37946474, '0001', 'Fuel Mod plans', 'Fuel Mod Plans', NULL, 750.00, 'pending', '2025-11-07', '2025-11-07 15:40:46'),
  (8895448, 39565852, '0008', 'Brick Upcharge', NULL, NULL, 783.00, 'pending', '2025-11-07', '2025-11-07 16:19:44'),
  (8895450, 40501925, '0005', 'Removal of misc fire debris n', '40 hours of labor time
2 trailer loads 
1 10 yard low boy dump 

Total cost $4300', NULL, 4300.00, 'pending', '2025-11-07', '2025-11-07 16:20:08'),
  (8895471, 42165550, '0002', '1 man day to move misc rock around property', NULL, NULL, 700.00, 'pending', '2025-11-07', '2025-11-07 16:31:18'),
  (8895503, 42040087, '0002', 'CREDIT 1 light', NULL, NULL, -161.00, 'pending', '2025-11-07', '2025-11-07 17:00:21'),
  (8901506, 41261562, '0003', 'Credit Downsizing of Concrete Landing', 'Concrete Landing Downsize
Reduce concrete landing from 30 square feet to 16 square feet.
Credit for 14 square feet of difference
in rear flagstone patio', NULL, -298.00, 'pending', '2025-11-10', '2025-11-10 13:34:09'),
  (8902761, 40815571, '0003', 'Smart System and Electrical', NULL, NULL, 4200.00, 'pending', '2025-11-10', '2025-11-10 16:56:48'),
  (8902767, 40815571, '0004', 'Credit for Heater', 'Credit for using existing Heater', NULL, -2400.00, 'pending', '2025-11-10', '2025-11-10 16:57:43'),
  (8902778, 39433159, '0006', 'Credits', 'Footings For Arbor - $230

Mantel Install - $390

Gate Flipping - $240', NULL, -860.00, 'pending', '2025-11-10', '2025-11-10 17:05:19'),
  (8905711, 40815571, '0005', 'Bailey - Electrical/Plumbing Permits', 'No hours to get these issued.

Costs:
Electrical/Plumbing Permits: $129.03', NULL, 129.03, 'sold', '2025-11-11', '2025-11-11 09:47:49'),
  (8906024, 39565852, '0009', 'Hernandez - Electrical Permit', 'I invested a cumulative of 20min to get the permit issued.
 
The 20 min include:
Application and plan submission online to Alhambra city. Communication & correspondence with city plan checkers. Permit issuance.
 
Costs:
Electrical: $77.15
Total: $77.15', NULL, 97.15, 'sold', '2025-11-11', '2025-11-11 10:22:05'),
  (8906033, 41332198, '0005', 'Gaby - BBQ Permit', 'I invested a cumulative of 3 hour to get the permit issued. @75/hour

The 3 hours include:
Drafting detailed plan per city requirements, revision of scope of work. Over the counter submission of plans to relevant authorities to ensure compliance with local codes and standards for approval. Permit issuance.
 
Costs:
BBQ Permit: $217.98', NULL, 442.98, 'pending', '2025-11-11', '2025-11-11 10:22:49'),
  (8910432, 41332198, '0006', 'Additional 1080 sod for front yard', 'Additional San Agustín sod for front yard (does not include park way)', NULL, 6004.00, 'pending', '2025-11-12', '2025-11-12 06:42:48'),
  (8910472, 41332198, '0007', 'Moving benderboard and moving plants', NULL, NULL, 700.00, 'pending', '2025-11-12', '2025-11-12 06:48:13'),
  (8910475, 41332198, '0008', 'Additional valve for back yard', NULL, NULL, 1750.00, 'pending', '2025-11-12', '2025-11-12 06:49:09'),
  (8911553, 39433159, '0007', 'CREDIT - Soil Ammendments', NULL, NULL, -127.53, 'pending', '2025-11-12', '2025-11-12 08:49:17'),
  (8911560, 39433159, '0008', 'CO - Repair Gate', NULL, NULL, 240.00, 'pending', '2025-11-12', '2025-11-12 08:49:51'),
  (8911580, 6731794, '0010', 'Irrigation audit', 'Irrigation inspection.', NULL, 220.00, 'pending', '2025-11-12', '2025-11-12 08:51:27'),
  (8915472, 42189248, '0001', 'CREDIT - SO', NULL, NULL, -300.00, 'pending', '2025-11-12', '2025-11-12 16:00:28'),
  (8916209, 41758449, '0001', 'Additional pallet for paver repair', 'An additional pallet needed for larger size paver as there are 2 different sized pavers required to complete the repair work disturbed by the fire', NULL, 907.00, 'sold', '2025-11-12', '2025-11-12 22:51:39'),
  (8918392, 41411781, '0001', 'Carpenter  - Grading + Demo Permits', 'The 3 hours include: @100/hour
Drafting detailed plan per county requirements, revision of scope of work. Online submission of plans to relevant authorities to ensure compliance with local codes and standards for approval. Communication & correspondence w/ County Plan Checkers. Permit issuance.

Costs:
CND Clearance Deposit: $1,876.20
Demo Permit: $276.82
Grading Permit: $388.79
Total: $2,541.81', NULL, 2841.81, 'sold', '2025-11-13', '2025-11-13 09:18:27'),
  (8921905, 40715934, '0006', 'restucco under balcony and colums', 'Restucco entire balcony, outer and inner columns', NULL, 3500.00, 'sold', '2025-11-13', '2025-11-13 16:31:59'),
  (8923578, 41332198, '0009', 'Upgrade steppers to stepstone', NULL, NULL, 550.00, 'sold', '2025-11-14', '2025-11-14 07:41:07'),
  (8925573, 41447322, '0002', 'Qty 8 x 15 gal Silver Sheen Pittosporum & Irrig', '8 x 15g Silver Sheen with supplemental drip irrigation
Check with HO for final plant placement before planting. 2 plants will be on the other side of the Oleander. 
Note: have oleander trimmed back a couple of feet.', NULL, 1237.00, 'pending', '2025-11-14', '2025-11-14 11:37:11'),
  (8937970, 35220019, '0013', '3 additional lights', '1 path light 
Lift up bricks to run wire 22 planters that are not currently wired
2 underwater lights 
1 15 gallon arbutus standard', NULL, 1800.00, 'pending', '2025-11-18', '2025-11-18 11:03:14'),
  (8953046, 41332198, '0010', 'Credit for Sod (Backyard)', '2300sqft is listed in the contract, and only 1950sqft is necessary for install', NULL, -1942.00, 'pending', '2025-11-20', '2025-11-20 15:25:58'),
  (8953345, 41447322, '0003', 'Credit Posts, Add Pool Shell Repair', 'Credit Posts -$2,375 (no longer needed shoring or replacing)
Charge for Pool Shell Repair $1600', 'Credit Posts -$2,375 (no longer needed shoring or replacing)
Charge for Pool Shell Repair $1600', -775.00, 'pending', '2025-11-20', '2025-11-20 16:47:16'),
  (8956961, 40715934, '0007', 'Electrical for pool', NULL, NULL, 2900.00, 'pending', '2025-11-21', '2025-11-21 11:55:44'),
  (8956988, 40715934, '0008', 'Add pool blower', NULL, NULL, 600.00, 'pending', '2025-11-21', '2025-11-21 11:59:15'),
  (8957385, 39127583, '0003', 'Additional depth and materials for caissons', NULL, NULL, 2400.00, 'sold', '2025-11-21', '2025-11-21 12:46:32'),
  (8960586, 35259913, '0026', 'Drainage repair', 'Cut concrete, demo concrete, dig out pipes to assess.', NULL, 1700.00, 'pending', '2025-11-24', '2025-11-24 07:14:40'),
  (8961738, 31248085, '0032', 'Electrical', 'Install roughly 1500 linear feet of 12-gauge wiring  3 runs of 500 feet with 3 wires.
6 outlets', NULL, 3350.00, 'pending', '2025-11-24', '2025-11-24 09:31:16'),
  (8964838, 38402552, '0001', 'Additional Cost for Apron Install', 'As per my conversation with Hugo previous to our installation, I let him know that the cost of the installation of the apron independent of the entire driveway would be an additional $2000 (he had
already provided us with a $3000 deposit).  Hugo was invoiced for a balance of $300 without the change order being approved.  The new balance for the project is $1700', NULL, 1700.00, 'pending', '2025-11-24', '2025-11-24 15:01:13'),
  (8973829, 37690129, '0003', 'CO - Subgrade work max', NULL, NULL, 1750.00, 'pending', '2025-11-26', '2025-11-26 09:38:17'),
  (8973989, 41261562, '0004', 'Drainage Pit', 'Trench and run 75 linear feet of 4” SDR35 drainpipe
Excavate a 3’ x 3’ x 4’ drainage pit
Fill pit with ¾” crushed gravel, approx. 1 cubic yard (Material allowance: $50/yard)
Wrap with filter fabric
COST $2,494', NULL, 2494.00, 'pending', '2025-11-26', '2025-11-26 10:02:48'),
  (8977976, 41017067, '0002', 'CO Hillside Irrigation', NULL, 'Item Labor Material Total
Replacing Irrigation for $4300 $300 $4600
Hillside sprayheads', 4600.00, 'pending', '2025-11-28', '2025-11-28 08:56:22'),
  (8977992, 41411781, '0002', 'CO - Electrical Permit', 'direct cost', NULL, 104.64, 'sold', '2025-11-28', '2025-11-28 09:07:43'),
  (8986248, 41261562, '0005', 'Paver and Flagstone Sealer', NULL, NULL, 3115.00, 'pending', '2025-12-02', '2025-12-02 07:26:04'),
  (8987214, 42747627, '0001', 'Additional Shredded Mulch', '+ 700 sqft of brown shredded mulch (no charge to the client)', NULL, 0, 'pending', '2025-12-02', '2025-12-02 09:10:11'),
  (8989640, 41180335, '0005', 'coping upgrade', 'upgrade to 16" msi beige travertine including freight.', NULL, 2100.00, 'pending', '2025-12-02', '2025-12-02 13:04:02'),
  (8991314, 42747627, '0002', 'Additional 300sqft of sod', 'Please order an additional 300sqft plus what''s on the plan/contract.  No additional cost to client', NULL, 0, 'pending', '2025-12-02', '2025-12-02 18:23:33'),
  (8995092, 40815571, '0006', 'Bailey - Supplemental Electrical Permit', 'No hours to get these issued.

Costs:
Supplemental Electrical Permit: $54.74', NULL, 54.74, 'pending', '2025-12-03', '2025-12-03 12:02:20'),
  (8995150, 39565852, '0010', 'Garcrest Engineering', 'Direct passthrough cost to client', NULL, 2750.00, 'pending', '2025-12-03', '2025-12-03 12:08:16'),
  (8995221, 39127583, '0004', 'CO - Passthrough Engineering', NULL, NULL, 2500.00, 'sold', '2025-12-03', '2025-12-03 12:14:41'),
  (8995302, 39127583, '0005', 'CO - Passthrough Inspection Fees', NULL, NULL, 475.00, 'sold', '2025-12-03', '2025-12-03 12:21:40'),
  (8995368, 40815571, '0007', 'Bailey - Core testing', NULL, NULL, 950.00, 'pending', '2025-12-03', '2025-12-03 12:27:59'),
  (9000915, 42809081, '0001', 'Rosenberg - Pool Eng', 'Pool Eng. Inc
Date: 11.19.25
For: Restamp on Revised Plan
Total:  $274.28', NULL, 274.28, 'pending', '2025-12-04', '2025-12-04 11:30:58'),
  (9004822, 41261562, '0006', 'Electrical, Dog Run, Backfill, Sod', 'Electrical
Trench and run electrical from meter to fire pit area, approx. 40 linear feet
Install J box

Dog Run - Gravel & Sand Base
Credit for 280 square feet of D.G.
Install 2” of pea gravel base
Install 2” of road base
No weed barrier fabric included

Backfill
Backfill approx. 5 cubic yards of soil
*Additional soil may be required

Sod
Till and amend 145 square feet of sod area soil
Install 145 square feet of ‘Marathon I’ sod or equivalent', NULL, 1318.00, 'pending', '2025-12-05', '2025-12-05 07:49:55'),
  (9008032, 39127583, '0006', 'Pool lights & relocate junction box to planter bed', NULL, NULL, 1850.00, 'sold', '2025-12-05', '2025-12-05 14:56:39'),
  (9010484, 41859021, '0002', 'Drain pipe in planter on east side replacement', 'Replace pipe that is holding water along the planter area behind east gate.', NULL, 850.00, 'pending', '2025-12-08', '2025-12-08 07:21:29'),
  (9010515, 41859021, '0003', 'Pool light J-box relocation & replace pool light', 'Move the junction box from the lower patio area, relocate to the wesat side of upper pool deck area adjacent to the rock. Replace the pool light as required. Check the spa light to ensure its working properly.', NULL, 3290.00, 'pending', '2025-12-08', '2025-12-08 07:26:04'),
  (9012772, 42565247, '0001', 'Upgrading to 3/4" Del Rio', NULL, NULL, 1280.00, 'sold', '2025-12-08', '2025-12-08 11:19:39'),
  (9014892, 41859021, '0004', 'Pull roots left of pool & spa, & front beds', 'No Charge - John Durso approved this change order.', NULL, 0, 'pending', '2025-12-08', '2025-12-08 15:26:35'),
  (9015133, 41261562, '0007', '2 more Lil Ollies (5 gal)', NULL, NULL, 73.00, 'pending', '2025-12-08', '2025-12-08 16:26:24'),
  (9018692, 39633159, '0007', 'Extending wall for front left side', '16 linear feet of Bel Air Wall with cap
1 course plus footing', NULL, 2050.00, 'sold', '2025-12-09', '2025-12-09 08:53:45'),
  (9018888, 42565247, '0002', '(2) new replacement irr valves for old irrigation', NULL, NULL, 400.00, 'sold', '2025-12-09', '2025-12-09 09:16:42'),
  (9019083, 42514935, '0001', 'Credit for electrical conduit/gfci', NULL, NULL, -1152.00, 'pending', '2025-12-09', '2025-12-09 09:36:10'),
  (9020033, 41261562, '0008', '12 cy of 50/50 soil', NULL, NULL, 1039.00, 'pending', '2025-12-09', '2025-12-09 11:04:12'),
  (9021828, 42514935, '0002', 'Credit for Lights', NULL, NULL, -3602.00, 'sold', '2025-12-09', '2025-12-09 13:40:42'),
  (9024698, 39565852, '0011', 'St. Augustine sod, repair existing irrigation', NULL, NULL, 4700.00, 'sold', '2025-12-10', '2025-12-10 08:02:50'),
  (9025386, 39127583, '0007', 'CO - REMOVE Timber Steps', NULL, NULL, -4278.00, 'sold', '2025-12-10', '2025-12-10 09:10:33'),
  (9027463, 41764903, '0001', 'Cohen (TriTech) - Pool/Grading Permit', NULL, NULL, 5271.15, 'pending', '2025-12-10', '2025-12-10 12:33:56'),
  (9028574, 41017067, '0003', 'Overseeding Time and Material', NULL, NULL, 13150.00, 'pending', '2025-12-10', '2025-12-10 14:45:03'),
  (9028579, 41017067, '0004', 'Irrigation Repairs/replacement sod area', NULL, 'Fairfax Irrigation and Replacing Head and Splitting Zones, Irrigation Repairs in Sod Area', 3690.00, 'pending', '2025-12-10', '2025-12-10 14:45:37'),
  (9034330, 41447322, '0004', 'Oleander removal', 'Cut down oleander down to trunk. Use stumpaway on trunk', NULL, 500.00, 'pending', '2025-12-11', '2025-12-11 13:20:53'),
  (9035416, 41261562, '0009', '5 Additional Path Lights', NULL, NULL, 1110.00, 'pending', '2025-12-11', '2025-12-11 16:37:14'),
  (9038192, 42514935, '0003', '2” BenderBoard edging (composite)', 'Composite edging for backyard to separate DG and gravel approx 100 linear feet', NULL, 1700.00, 'pending', '2025-12-12', '2025-12-12 10:28:19'),
  (9038222, 42514935, '0004', 'Credit for (1) step', NULL, NULL, -580.00, 'pending', '2025-12-12', '2025-12-12 10:32:19'),
  (9040377, 41447322, '0005', 'New plants, qty: 4, 5 gal (tree mallow)', NULL, NULL, 180.00, 'sold', '2025-12-12', '2025-12-12 17:38:51'),
  (9043701, 39127583, '0008', 'Redoing Equipment Wall', NULL, 'Removing flagstone and adding stucco', 2160.00, 'sold', '2025-12-15', '2025-12-15 09:21:04'),
  (9053427, 40118858, '0012', 'Turf substitution', NULL, NULL, 5400.00, 'sold', '2025-12-16', '2025-12-16 15:00:36'),
  (9055369, 40118858, '0013', 'All new equipment.', 'See attachment.
Added a salt chlorinator
Subpanel work', NULL, 20085.98, 'sold', '2025-12-17', '2025-12-17 07:11:28'),
  (9058039, 37690129, '0005', 'Additional Line, Other runs and Culvert', NULL, NULL, 6829.00, 'pending', '2025-12-17', '2025-12-17 11:50:06'),
  (9059839, 37443736, '0006', 'Sump pump', NULL, NULL, 6000.00, 'pending', '2025-12-17', '2025-12-17 15:13:01'),
  (9060001, 40815571, '0008', 'CO - Pool Coping', NULL, NULL, 1900.00, 'pending', '2025-12-17', '2025-12-17 15:42:05'),
  (9063322, 38774894, '0018', '125 additional podacarpis  15g', 'Installing 125 15 gallon podacarpis hedge $14,375', NULL, 14375.00, 'pending', '2025-12-18', '2025-12-18 10:24:45'),
  (9065943, 41180335, '0006', 'CO - Paver Risers', NULL, NULL, 990.00, 'sold', '2025-12-18', '2025-12-18 16:25:47'),
  (9068183, 41859021, '0005', 'BBQ Large Format Tile Countertop', NULL, NULL, 3800.00, 'pending', '2025-12-19', '2025-12-19 09:43:08'),
  (9068197, 41859021, '0006', 'Hillside Irrigation', NULL, NULL, 4000.00, 'pending', '2025-12-19', '2025-12-19 09:45:03'),
  (9070715, 42514935, '0007', 'Removal of Contractor''s Leftover 2x4s', NULL, NULL, 800.00, 'pending', '2025-12-20', '2025-12-20 09:44:35'),
  (9073277, 39747782, '0015', 'Bringing additional pavers', NULL, NULL, 600.00, 'pending', '2025-12-22', '2025-12-22 09:38:43'),
  (9078623, 38774894, '0019', 'CREDIT remaining putting green', NULL, NULL, -4150.00, 'pending', '2025-12-23', '2025-12-23 11:02:28'),
  (9080142, 42514935, '0009', 'Credit for Water Feature Install', NULL, NULL, -658.00, 'pending', '2025-12-23', '2025-12-23 16:00:12'),
  (9081882, 42989957, '0001', 'Add DG & Edging', NULL, NULL, 3000.00, 'pending', '2025-12-26', '2025-12-26 09:40:50'),
  (9084570, 39127583, '0009', 'Waterproofing + French Drain for New Wall', NULL, NULL, 2400.00, 'sold', '2025-12-29', '2025-12-29 10:48:50'),
  (9085234, 39127583, '0010', 'Retaining Wall French Drain & Waterproofing', NULL, NULL, 2400.00, 'pending', '2025-12-29', '2025-12-29 12:31:43'),
  (9087656, 39894589, '0010', 'Fencing on Side', NULL, NULL, 900.00, 'pending', '2025-12-30', '2025-12-30 08:41:23'),
  (9088034, 39127583, '0011', 'Paver upgrade', NULL, NULL, 2900.00, 'sold', '2025-12-30', '2025-12-30 09:45:47'),
  (9088096, 39433058, '0006', 'CO - V Ditch', NULL, NULL, 0, 'pending', '2025-12-30', '2025-12-30 09:55:55'),
  (9092165, 39405668, '0009', 'Repairs', NULL, NULL, 6061.00, 'sold', '2025-12-31', '2025-12-31 11:33:43'),
  (9092188, 39405668, '0010', 'Plant Material for Back Retaining Walls', NULL, NULL, 3000.00, 'sold', '2025-12-31', '2025-12-31 11:38:23'),
  (9094257, 39127583, '0012', 'Redo section of drain pipe due to root intrusion', NULL, NULL, 1800.00, 'sold', '2026-01-02', '2026-01-02 09:48:04'),
  (9099487, 41180158, '0001', 'Lerner - Pool Permit', NULL, NULL, 2233.01, 'sold', '2026-01-05', '2026-01-05 11:32:59'),
  (9100145, 35259913, '0027', 'Trees/plants', NULL, 'Olive Tree
Install ‘Wilsonii’ fruitless olive 36" box
Install (5) Red Trumpet vine 5 gal
COST $2,800
Plant Replacement
Replace 24” box Tristania columnar tree
Replace (2) Cordyline 5 gal with new plant TBD
COST $0', 2800.00, 'pending', '2026-01-05', '2026-01-05 12:41:43'),
  (9101321, 39633159, '0008', 'Additional drainage and wall', NULL, NULL, 835.00, 'sold', '2026-01-05', '2026-01-05 15:16:38'),
  (9103731, 42965806, '0001', 'Change edging to metal', 'Change plastic bender board to metal edging around the citrus tree', NULL, 465.00, 'pending', '2026-01-06', '2026-01-06 09:09:43'),
  (9105711, 43057414, '0001', '(2) footings for patio cover', NULL, NULL, 400.00, 'pending', '2026-01-06', '2026-01-06 12:23:25'),
  (9112622, 41261562, '0010', '1 additional pathlight', '1 additional path light', NULL, 250.00, 'pending', '2026-01-07', '2026-01-07 14:09:01'),
  (9113413, 42989957, '0002', 'CREDIT - Boulders', NULL, NULL, -353.61, 'sold', '2026-01-07', '2026-01-07 16:59:10'),
  (9115477, 37443736, '0007', 'CREDIT - Fencing', NULL, NULL, -6000.00, 'pending', '2026-01-08', '2026-01-08 08:59:29'),
  (9118894, 39405668, '0012', 'Mulch and Weed Fabric', NULL, NULL, 900.00, 'sold', '2026-01-08', '2026-01-08 15:10:00'),
  (9119368, 39433159, '0009', 'CO - Log Set Cost difference', NULL, NULL, 1500.00, 'pending', '2026-01-08', '2026-01-08 17:59:20'),
  (9124259, 43034709, '0001', 'CO - wooden landscape wall', 'Adding metal lodge poles to support existing wall approx 40 linear feet', NULL, 1800.00, 'pending', '2026-01-09', '2026-01-09 15:25:23'),
  (9127001, 41180335, '0007', 'New 400k jandy pool heater installed.', '400k jandy heater installed.', NULL, 4800.00, 'sold', '2026-01-12', '2026-01-12 07:40:51'),
  (9127531, 41180335, '0008', 'Pot installation', 'Installing 3 pots on top of column.', NULL, 3400.00, 'pending', '2026-01-12', '2026-01-12 08:39:18'),
  (9133254, 39405668, '0013', 'Adding 2 outlets Adding lighting for the back', NULL, NULL, 520.00, 'sold', '2026-01-13', '2026-01-13 07:12:37'),
  (9140783, 41411781, '0003', 'Paver Upgrade (Travertine)', NULL, NULL, 7000.00, 'sold', '2026-01-14', '2026-01-14 09:16:04'),
  (9142128, 41180335, '0009', 'Additional 24" box tree $375', NULL, NULL, 375.00, 'sold', '2026-01-14', '2026-01-14 11:22:50'),
  (9142132, 41180335, '0010', 'Additional material charge for jellybean', 'Increase in material charge for jellybean', NULL, 2850.00, 'pending', '2026-01-14', '2026-01-14 11:23:30'),
  (9142151, 41180335, '0011', 'Additional citrus', '1 new 15 gallon naval citrus dwarf', NULL, 260.00, 'pending', '2026-01-14', '2026-01-14 11:24:59'),
  (9143827, 39405668, '0014', 'CREDIT - Drainage 132 lnft', NULL, NULL, -2340.00, 'sold', '2026-01-14', '2026-01-14 14:03:49'),
  (9146912, 41411781, '0004', '(1) wall light', NULL, NULL, 200.00, 'sold', '2026-01-15', '2026-01-15 08:58:32'),
  (9147011, 41411781, '0005', 'Paver Sealant', NULL, NULL, 1500.00, 'sold', '2026-01-15', '2026-01-15 09:09:56'),
  (9148873, 36551611, '0008', 'CREDITS - paint and vault', NULL, NULL, -5800.00, 'sold', '2026-01-15', '2026-01-15 12:18:03'),
  (9149301, 41859021, '0007', 'Additional Concrete 151 sqft', NULL, NULL, 0, 'pending', '2026-01-15', '2026-01-15 12:56:55'),
  (9150715, 41180335, '0012', 'Additional stucco work', 'Widen pilasters for 3'' caps', NULL, 900.00, 'sold', '2026-01-15', '2026-01-15 16:12:33'),
  (9150733, 41180335, '0013', 'Gopher baskets', NULL, 'gopher baskets for 7 15 gallons and 2 24 gallon trees', 290.00, 'sold', '2026-01-15', '2026-01-15 16:16:31'),
  (9162676, 43018759, '0001', 'Addt''l Plants, Trex PE Enclosure', NULL, 'Hedge Removal
Remove (1 qty.) ficus hedge plant
Grind and remove stump roots

Planting
Furnish and install (2 qty.) 15 gal ficus hedge plants in Rear
Front garden: remove 1 agave and trim back snake plants

(SUB: Mitch) Pool Equipment Enclosure - Trex
Install 12 linear feet of 4’ height Trex 1x6 composite fencing
No gates or doors included', 5786.00, 'pending', '2026-01-19', '2026-01-19 15:04:43'),
  (9165530, 9089392, '0007', 'Re wire and solenoid repair', 'Ran 35 ft of 5 strand wire and swapped 1 solenoid. Hours build at $75 per hour 2 and a half hours 187.50 and $80 in materials', NULL, 267.50, 'sold', '2026-01-20', '2026-01-20 08:45:20'),
  (9166182, 34720122, '0012', 'Irrigation complete', 'All irrigation is now complete.', NULL, 0, 'pending', '2026-01-20', '2026-01-20 09:52:33'),
  (9169087, 27369533, '0002', 'New Irrigation Valves', NULL, NULL, 1200.00, 'sold', '2026-01-20', '2026-01-20 14:33:29'),
  (9169348, 41411781, '0006', 'Additional Wall Course with ledgerstone', NULL, NULL, 2800.00, 'sold', '2026-01-20', '2026-01-20 15:10:39'),
  (9169350, 41017067, '0005', 'CO - change of mulch', NULL, 'Switching Mulch To gorilla hair', 14300.00, 'pending', '2026-01-20', '2026-01-20 15:10:56'),
  (9170125, 37690129, '0006', 'Cleaning out soil of light post bases', NULL, NULL, 2355.00, 'pending', '2026-01-20', '2026-01-20 19:18:46'),
  (9172769, 42843186, '0001', 'Concrete setting flagstones', NULL, NULL, 250.00, 'pending', '2026-01-21', '2026-01-21 09:41:51'),
  (9176235, 33161618, '0008', 'Planting Change', NULL, NULL, 2500.00, 'pending', '2026-01-21', '2026-01-21 15:46:22'),
  (9181272, 42660242, '0001', 'Harrison, Joana - Pool Spa Permit', NULL, NULL, 2712.13, 'sold', '2026-01-22', '2026-01-22 12:58:35'),
  (9183053, 40118858, '0014', 'CO - Additional Work', NULL, NULL, 9120.00, 'pending', '2026-01-22', '2026-01-22 18:56:45'),
  (9183102, 41764903, '0002', 'CO - Additional Demo', NULL, NULL, 0, 'pending', '2026-01-22', '2026-01-22 19:38:45'),
  (9184880, 41017067, '0006', 'Fairfax Irrigation', NULL, NULL, 6980.00, 'pending', '2026-01-23', '2026-01-23 08:57:41'),
  (9185337, 41764903, '0003', 'Paver deck', NULL, NULL, 40000.00, 'pending', '2026-01-23', '2026-01-23 09:54:39'),
  (9187433, 41760041, '0001', 'Azizad - Pool Permit', NULL, NULL, 1557.65, 'pending', '2026-01-23', '2026-01-23 14:05:49'),
  (9187441, 43205218, '0001', 'Kawamura Driveway Permit', NULL, NULL, 792.89, 'pending', '2026-01-23', '2026-01-23 14:08:22'),
  (9190478, 42843186, '0002', 'CO - Permit Fees', NULL, NULL, 165.00, 'pending', '2026-01-26', '2026-01-26 08:41:27'),
  (9191698, 41180335, '0014', 'Edging option 1', '121 linear feet of metal Edging to retain gravel on rear property line.', NULL, 2100.00, 'pending', '2026-01-26', '2026-01-26 11:06:20'),
  (9191707, 41180335, '0015', '2 additional path-lights', '2 additional path-lights', NULL, 415.00, 'pending', '2026-01-26', '2026-01-26 11:07:11'),
  (9191716, 41180335, '0016', 'Additional lighting parts', '3 led light shades and 6 led bulbs from lightcraft', NULL, 300.00, 'pending', '2026-01-26', '2026-01-26 11:08:11'),
  (9193473, 42843186, '0003', 'Upgrading to 15 gallon Privet', NULL, NULL, 5120.00, 'pending', '2026-01-26', '2026-01-26 14:28:33'),
  (9193654, 42843186, '0004', 'Credit for (27) 5 gallon Privet', NULL, NULL, -1040.00, 'pending', '2026-01-26', '2026-01-26 14:52:46'),
  (9196453, 41180158, '0002', 'Upgrading to double brick coping', NULL, NULL, 1450.00, 'pending', '2026-01-27', '2026-01-27 08:32:54'),
  (9197036, 43299976, '0001', 'Pavers', NULL, NULL, 0, 'pending', '2026-01-27', '2026-01-27 09:31:16'),
  (9199024, 43018759, '0002', 'Remove wall, grading, vinyl fence', NULL, NULL, 5927.00, 'pending', '2026-01-27', '2026-01-27 12:31:25'),
  (9200275, 39907276, '0002', 'Grading for Pavers near Fountain', NULL, '6 man days', 5200.00, 'pending', '2026-01-27', '2026-01-27 14:53:52'),
  (9200593, 40778172, '0004', 'Work completed', 'All work has been completed after installation of drain and 1 plant', NULL, 0, 'pending', '2026-01-27', '2026-01-27 15:54:19'),
  (9200828, 41180158, '0003', 'Removal of brick steps between sod/patio', NULL, NULL, 1500.00, 'sold', '2026-01-27', '2026-01-27 16:49:24'),
  (9207421, 43018759, '0003', '14'' of Root Barrier by Ficus Hedge', NULL, NULL, 672.00, 'pending', '2026-01-28', '2026-01-28 17:09:42'),
  (9207447, 43018759, '0004', 'Root Barrier', NULL, NULL, 0, 'sold', '2026-01-28', '2026-01-28 17:20:57'),
  (9210532, 43318414, '0001', 'Lights, elec & plants - See attached signed CO', NULL, NULL, 4028.00, 'pending', '2026-01-29', '2026-01-29 10:19:32'),
  (9213359, 41180158, '0004', 'Removal of buried footing for pool excavate', NULL, NULL, 950.00, 'sold', '2026-01-29', '2026-01-29 15:23:39'),
  (9213389, 42580132, '0001', 'Bender board, drain, irrigation, 1 more pot', NULL, NULL, 3240.00, 'pending', '2026-01-29', '2026-01-29 15:29:51'),
  (9213414, 42897729, '0001', 'Grading with burm', 'Grading front yard to picth to street/ create burm about 

Reconfigure main line for valves 
Including parts', NULL, 618.75, 'sold', '2026-01-29', '2026-01-29 15:33:08'),
  (9213483, 33691503, '0044', 'CO - Flats', NULL, NULL, 0, 'pending', '2026-01-29', '2026-01-29 15:49:13'),
  (9213492, 31248085, '0033', 'Additional electrical work/ethernet', NULL, NULL, 10250.00, 'pending', '2026-01-29', '2026-01-29 15:50:50'),
  (9214899, 41411781, '0007', '85 LF Drainage total', NULL, NULL, 780.00, 'sold', '2026-01-29', '2026-01-29 18:41:38'),
  (9229563, 39907276, '0003', 'Paver Quantity', NULL, 'Adding 478 SQFT of pavers at 37 per sqft', 17636.00, 'pending', '2026-02-03', '2026-02-03 07:59:39'),
  (9229978, 42843186, '0005', '(1) Path Light', NULL, '1 hour
$136 materials', 200.00, 'pending', '2026-02-03', '2026-02-03 08:37:20'),
  (9230328, 33691503, '0045', '40 flats of groundcover replacement', NULL, '3 man days (Bryan plus 2 guys)', 1125.00, 'sold', '2026-02-03', '2026-02-03 09:11:52'),
  (9232160, 39405668, '0015', 'CO - Items moved from Repairs', NULL, NULL, 675.00, 'sold', '2026-02-03', '2026-02-03 12:09:46'),
  (9232610, 42843186, '0006', 'Job completed', NULL, NULL, 0, 'pending', '2026-02-03', '2026-02-03 12:47:10'),
  (9234132, 43318414, '0002', 'Plants', NULL, '2 additional hours over contract. & $60 materials', 259.00, 'pending', '2026-02-03', '2026-02-03 16:06:36'),
  (9234590, 41180335, '0017', 'Install fountain auto fill.', NULL, NULL, 300.00, 'pending', '2026-02-03', '2026-02-03 19:19:37'),
  (9234715, 43299976, '0002', 'More drains, demo soil, patio repair', NULL, NULL, 829.00, 'pending', '2026-02-03', '2026-02-03 20:14:00'),
  (9237252, 41180158, '0005', 'Garden Wall, Drainage', NULL, '3.5 man days for Wall Installation/1.3 man days for drains
8" CMU 
Rebar
Concrete for footings
Sand Stucco
Straight Brick Cap (color to match pool coping )

4" drain pipe/5 inlets', 9340.00, 'sold', '2026-02-04', '2026-02-04 09:31:53'),
  (9239197, 43018759, '0005', 'Addt''l Pavers', NULL, '18 sq ft bellecrete pavers
1.5 MD', 1624.00, 'pending', '2026-02-04', '2026-02-04 12:13:00'),
  (9242423, 41180335, '0018', 'Additional 8 lights', 'Adding 5 path lights
Adding 2 flood lights
Adding 1ground light', NULL, 1660.00, 'sold', '2026-02-05', '2026-02-05 05:37:10'),
  (9242437, 41180335, '0019', 'Additional plants for pilasters', NULL, NULL, 275.00, 'pending', '2026-02-05', '2026-02-05 05:41:21'),
  (9245611, 42754683, '0001', 'Ito - Spa Permit', NULL, NULL, 1333.13, 'pending', '2026-02-05', '2026-02-05 11:12:54'),
  (9248098, 42580132, '0002', 'Change Pea Pebble to Mex. Beach Pebble (3/8"-5/8")', NULL, '1 MD', 2173.00, 'pending', '2026-02-05', '2026-02-05 15:44:15'),
  (9248149, 41764903, '0004', 'Epoxy Inspection', NULL, NULL, 300.00, 'pending', '2026-02-05', '2026-02-05 15:53:47'),
  (9248421, 42783418, '0001', 'Weed Abatement - 1st treatment', NULL, NULL, 1860.00, 'pending', '2026-02-05', '2026-02-05 16:58:48'),
  (9252043, 43318414, '0003', 'Hose bib', 'Replacing hose bib with copper.', NULL, 200.00, 'pending', '2026-02-06', '2026-02-06 11:12:39'),
  (9253055, 42725146, '0001', 'Johnson - Pool/Spa Permit', NULL, NULL, 3360.36, 'sold', '2026-02-06', '2026-02-06 13:05:14'),
  (9257153, 42580132, '0003', 'Reiter - Curb Core Permit', NULL, NULL, 372.25, 'sold', '2026-02-09', '2026-02-09 08:46:07'),
  (9257506, 42809081, '0002', 'Rosenberg - Tritech pool/spa permit', NULL, NULL, 1677.88, 'pending', '2026-02-09', '2026-02-09 09:23:08'),
  (9258660, 43447324, '0001', 'Extra Curbing', NULL, NULL, 3690.00, 'pending', '2026-02-09', '2026-02-09 11:24:07'),
  (9260942, 42785001, '0001', 'Giesler - Spa Permit', NULL, NULL, 1317.38, 'pending', '2026-02-09', '2026-02-09 14:47:50'),
  (9261299, 39907276, '0004', 'Irrigation Repairs 5 man days', NULL, NULL, 5700.00, 'pending', '2026-02-09', '2026-02-09 15:48:56'),
  (9264777, 39127583, '0013', 'Final Compaction Report', NULL, NULL, 350.68, 'sold', '2026-02-10', '2026-02-10 09:44:24'),
  (9267983, 43018759, '0006', '4 more hedges + 1 creeping fig', NULL, 'Additional Hedge Trees
Provide and install (4 qty.) 15 gal hedge trees
COST $596 - Cash/Check Price

Additional 1 gal
Provide and install (1 qty.) 1 gal shrub
COST $18 - Cash/Check Price

Cut Turf
Cut 6” x 6” area into existing artificial turf
COST $4 - Cash/Check Price', 618.00, 'pending', '2026-02-10', '2026-02-10 14:25:12'),
  (9268634, 43253986, '0001', 'Credits', NULL, 'Vines 
Credit for installing (4 qty.) 8” x 8” x 8”  concrete footings and installing trellis: -$689 
Add wiring for vines: $295 
COST -$395 
Mulch - Credit Gravel 
Install 410 square feet of standard shredded bark mulch: $385 
Credit for ?” pea gravel, approx. 410 square feet: -$1,746 
COST -$1,362 

Additional Planting 
Install (1 qty.) premium 5 gal shrub 
Install (3 qty.) standard 5 gal shrubs 
COST $173', -1584.00, 'pending', '2026-02-10', '2026-02-10 16:08:08'),
  (9268726, 40118858, '0015', 'Swapping to higher voltage lights (3)', NULL, NULL, 3440.00, 'sold', '2026-02-10', '2026-02-10 16:35:15'),
  (9268820, 43447324, '0002', 'Install additional Catch Basin plus 10ft of drain', NULL, NULL, 580.00, 'pending', '2026-02-10', '2026-02-10 17:04:40'),
  (9276451, 43205218, '0002', 'Supplemental for Apron/Driveway Permit', NULL, NULL, 20.60, 'pending', '2026-02-11', '2026-02-11 18:39:08'),
  (9276453, 41180158, '0006', 'Lerner - Building Material Permit', NULL, NULL, 66.16, 'sold', '2026-02-11', '2026-02-11 18:39:43'),
  (9282717, 42580132, '0004', 'Addt''l Planting CO -  QTY/Species has Changed', NULL, 'Planting Locations: 

Front Hillside:
QTY 12 x 1 gal. DWARF senecio

Tree Canopy:
QTY 1 x 1 gal. Foxtail Agave
QTY 6 x 6" Pink Kalanchoe from Foothill Nursery see photo 

Front Planters and Foundation:
QTY 3 x 1 gal. Foxtail Agave
QTY 7 x 1 gal. DWARF senecio
QTY 1 x 1 gal. Crassula RUFFLES 

Pots:
QTY 2 x 6" Snake Plant (Foothill  Nursery)
QTY 6 x 4" Senecio radicans
Succulent potting mix

Poolside:
QTY 3 x 6" PINK Kalanchoe

Hedge planting:
QTY 18 x 6" WHITE Kalanchoe (Foothill Nursery)', 1074.00, 'pending', '2026-02-12', '2026-02-12 16:30:50'),
  (9286760, 42134207, '0001', 'Huffman - Pool/Spa & Grading Permit', NULL, NULL, 2179.38, 'sold', '2026-02-13', '2026-02-13 12:09:59'),
  (9286761, 43504880, '0001', 'Irrigation Valve + Haul Owner Green waste', NULL, '1 hr for hauling banana leaves and dumping
2.5 hrs for soldering copper and installing irrigation valve + $100 in material', 500.00, 'pending', '2026-02-13', '2026-02-13 12:09:59'),
  (9286797, 42660242, '0002', 'Removal of steel/forming and inserting new steel', NULL, NULL, 10400.00, 'sold', '2026-02-13', '2026-02-13 12:15:12'),
  (9287833, 39907276, '0005', 'Additional grading for planters', NULL, NULL, 2200.00, 'pending', '2026-02-13', '2026-02-13 14:32:39'),
  (9288065, 43447324, '0003', 'CO Tree Stakes', NULL, NULL, 973.00, 'pending', '2026-02-13', '2026-02-13 15:39:20'),
  (9292540, 40612449, '0014', 'CREDITS', NULL, NULL, -1500.00, 'pending', '2026-02-16', '2026-02-16 11:00:31'),
  (9294960, 43430595, '0001', 'credit for concrete step work in rear', NULL, NULL, -1200.00, 'sold', '2026-02-16', '2026-02-16 16:25:05'),
  (9294995, 43430595, '0002', 'additional removal of soil', NULL, NULL, 3800.00, 'sold', '2026-02-16', '2026-02-16 16:37:51'),
  (9301386, 41180158, '0007', 'Upcharge for installing Bellecrete Coping', NULL, '$400 in materials + 3 hours', 1700.00, 'sold', '2026-02-17', '2026-02-17 15:14:56'),
  (9307863, 41764903, '0005', 'Shotcrete Inspection', NULL, NULL, 400.00, 'pending', '2026-02-18', '2026-02-18 11:01:56'),
  (9321762, 43162412, '0001', 'subbing pedestrian gate for solid fencing', NULL, NULL, -300.00, 'sold', '2026-02-19', '2026-02-19 11:04:49'),
  (9322007, 43162412, '0002', 'Wack - Patio Trellis Permit', NULL, NULL, 1005.74, 'sold', '2026-02-19', '2026-02-19 11:20:19'),
  (9332163, 43464899, '0001', 'Difference in original contract price vs final', NULL, NULL, -486.00, 'sold', '2026-02-20', '2026-02-20 10:29:56'),
  (9336009, 39633159, '0009', 'Block and Cap to existing wall', NULL, NULL, 150.00, 'pending', '2026-02-20', '2026-02-20 14:58:12'),
  (9343498, 43447324, '0004', 'Added Concrete and Grading', NULL, NULL, 10138.39, 'pending', '2026-02-23', '2026-02-23 10:04:09'),
  (9347285, 43299976, '0003', 'Credit', NULL, NULL, -267.79, 'pending', '2026-02-23', '2026-02-23 13:20:57'),
  (9348374, 40998162, '0002', 'Poindexter - Pool/Spa Permit', NULL, NULL, 2750.58, 'sold', '2026-02-23', '2026-02-23 14:31:48'),
  (9358916, 43164712, '0001', 'Removal of mature Oleander shrubs', NULL, 'Javier to remove - his charge is $300', 600.00, 'sold', '2026-02-24', '2026-02-24 13:04:34'),
  (9360572, 41180158, '0008', 'Inspections IB', NULL, NULL, 300.00, 'pending', '2026-02-24', '2026-02-24 14:51:15'),
  (9361043, 43363329, '0001', 'Krul - Curb Core Permit', NULL, NULL, 399.37, 'sold', '2026-02-24', '2026-02-24 15:32:55'),
  (9361046, 43363329, '0002', 'Added work', NULL, '4.03 MDs', 5253.00, 'pending', '2026-02-24', '2026-02-24 15:33:17'),
  (9361371, 42783418, '0002', 'Weed Abatement - 2nd treatment', NULL, NULL, 1860.00, 'pending', '2026-02-24', '2026-02-24 16:11:24'),
  (9361513, 40577384, '0005', 'Repair Sod', NULL, NULL, 0, 'pending', '2026-02-24', '2026-02-24 16:33:10'),
  (9365166, 41180158, '0009', 'Drainage around the pool/100 feet', 'Includes 9 inlets', '2 man days
Pipe and inlets (area drains)', 2000.00, 'pending', '2026-02-25', '2026-02-25 08:02:19'),
  (9366125, 43363329, '0003', 'Sump Pump & Channel Drain', NULL, NULL, 0, 'pending', '2026-02-25', '2026-02-25 09:02:07'),
  (9369331, 33161618, '0009', 'CREDIT - pots', NULL, NULL, -100.00, 'pending', '2026-02-25', '2026-02-25 11:46:33'),
  (9384457, 41764903, '0006', 'Additional work', NULL, NULL, 31161.00, 'pending', '2026-02-26', '2026-02-26 15:26:44'),
  (9385309, 43363329, '0004', 'Pavers, drains', 'Pavers, drains', '2md $1719 materials', 3876.00, 'pending', '2026-02-26', '2026-02-26 18:00:16'),
  (9385478, 43299976, '0004', '2x12 30 ft long', 'Install 30 ft 2x12 pressure treated wood with metal stakes. Add basin connecting to existing drains. Mock up attached', NULL, 600.00, 'sold', '2026-02-26', '2026-02-26 18:57:51'),
  (9385533, 43299976, '0005', 'Arizona flagstones', '6 Arizona flagstones', '2 hours', 358.00, 'pending', '2026-02-26', '2026-02-26 19:25:59'),
  (9388736, 41180158, '0010', 'Turf, Demo, Grading, Irrigation, Drains', NULL, 'turf for 2100sqft Bel Air or Socal Blend 93 19.7 man days
Metal edging 150 linear feet 3.1 man days
pipe for 2 drip zones 3.1 man days
pipe for drains plus 7 inlets 1.9 man days', 34050.00, 'pending', '2026-02-27', '2026-02-27 08:45:51'),
  (9393640, 41963005, '0001', 'Steel edging', NULL, '1.16MD
394.00 material 

(re-using material from yard)', 500.00, 'pending', '2026-02-27', '2026-02-27 14:41:17'),
  (9406439, 43164712, '0002', 'Seated Wall to hide footings against wall', NULL, 'concrete, rebar, stucco, CMU block 
1 man day', 1675.00, 'sold', '2026-03-02', '2026-03-02 15:24:22'),
  (9406500, 41963005, '0002', 'Additional Lighting', NULL, '.25 MD', 804.00, 'pending', '2026-03-02', '2026-03-02 15:30:04'),
  (9406510, 43164712, '0003', 'Extending Small Retaining Wall by 22''', NULL, 'CMU block 8", rebar, grout, sanded stucco 4 man days', 3600.00, 'sold', '2026-03-02', '2026-03-02 15:30:31'),
  (9406564, 43164712, '0004', 'Drains', NULL, 'Pvc, (6) 3" inlets, (1) 12"x12" catch basin, 2.2 man days', 2052.00, 'sold', '2026-03-02', '2026-03-02 15:36:37'),
  (9406591, 43164712, '0005', 'Repairing Main Line, New Wire for Timer', NULL, '1.5 man days, wire for irrigation', 1450.00, 'sold', '2026-03-02', '2026-03-02 15:39:32'),
  (9406596, 43164712, '0006', '11'' step up of 6" concrete curb', NULL, NULL, 950.00, 'sold', '2026-03-02', '2026-03-02 15:39:55'),
  (9406789, 42580132, '0005', 'Rear Yard Lighting', NULL, '1.13 MD', 2902.00, 'pending', '2026-03-02', '2026-03-02 16:08:30'),
  (9411677, 43164712, '0007', 'Credit for 22 feet Pre Cast Wall Cap', NULL, NULL, -1473.00, 'sold', '2026-03-03', '2026-03-03 09:08:41'),
  (9412041, 43164712, '0008', '(1) Drip Irrigation Line', NULL, '5.25 man days/pipe and emitters', 1500.00, 'sold', '2026-03-03', '2026-03-03 09:27:36'),
  (9412142, 43164712, '0009', '(10) 5 gallons', NULL, '.25 man days/Japanese boxwood 5 gallon', 450.00, 'sold', '2026-03-03', '2026-03-03 09:32:41'),
  (9416134, 43164712, '0010', 'Credit for 145sqft of Concrete', NULL, NULL, -1465.00, 'sold', '2026-03-03', '2026-03-03 13:08:51'),
  (9417793, 41859021, '0008', 'Lights & plants - Bryan knows - See pics', NULL, NULL, 483.00, 'pending', '2026-03-03', '2026-03-03 15:00:21'),
  (9424431, 42580132, '0006', '18 x 1 gal. senecio planting', NULL, '.26 MD', 323.00, 'pending', '2026-03-04', '2026-03-04 10:00:07'),
  (9424542, 42580132, '0007', 'Tree Loc: Additional Plants', NULL, '$222.38 --  1.04 hours -- 0.13 MDs', 322.00, 'pending', '2026-03-04', '2026-03-04 10:05:43'),
  (9430847, 37443736, '0008', 'front yard landscape phase 1', NULL, NULL, 17297.00, 'pending', '2026-03-04', '2026-03-04 16:57:19'),
  (9435940, 40998162, '0003', 'Gas Line for Firebowls', NULL, '1.2 man days
iron pipe 1"', 1090.00, 'pending', '2026-03-05', '2026-03-05 09:33:24'),
  (9440826, 41411781, '0008', 'Adding Mexican Beach Pebble/Edging', NULL, '300sqft of Mexican Beach Pebble in buff 1-2"
20 lf of 6" metal edging
4.1 man days', 3956.00, 'sold', '2026-03-05', '2026-03-05 14:26:37'),
  (9446080, 43635179, '0001', 'Additional Plants', NULL, NULL, 839.00, 'sold', '2026-03-06', '2026-03-06 08:39:11'),
  (9446145, 38774894, '0020', 'CO - CREDITS post meeting', NULL, NULL, -2485.00, 'pending', '2026-03-06', '2026-03-06 08:43:25'),
  (9446439, 43318414, '0004', 'CREDIT', NULL, NULL, -1500.00, 'pending', '2026-03-06', '2026-03-06 09:03:16'),
  (9455720, 39894589, '0011', '2'' Footings', NULL, NULL, 800.00, 'pending', '2026-03-09', '2026-03-09 07:51:54'),
  (9455935, 40922633, '0010', 'Remove plants, Install gravel', NULL, NULL, 1370.00, 'pending', '2026-03-09', '2026-03-09 08:07:34'),
  (9461916, 41963005, '0003', 'New outlet covers', NULL, '6 x Outlet Covers', 480.00, 'pending', '2026-03-09', '2026-03-09 14:30:09'),
  (9472591, 43853281, '0001', 'Addt''l Root Barrier', NULL, '$130 mat -- 1.67 hours / 0.21 MDs', 288.00, 'pending', '2026-03-10', '2026-03-10 13:03:20'),
  (9475118, 43162412, '0003', 'Additional electrical', '• Installing a sub panel in garage
rewiring existing electrical to sub panel
wiring pool equipment to sub panel
put jbox for pool equipment
and rewire equipment', NULL, 2500.00, 'sold', '2026-03-10', '2026-03-10 17:42:20'),
  (9475134, 43162412, '0004', 'Vinyl fence color upgrade', NULL, NULL, 3053.00, 'sold', '2026-03-10', '2026-03-10 17:44:20'),
  (9483628, 40998162, '0004', 'Poindexter - Gas/Electrical Permit', NULL, NULL, 273.92, 'pending', '2026-03-11', '2026-03-11 13:22:12'),
  (9485199, 42783418, '0003', 'Re-locate hedges, Addt''l Lights', NULL, '#1 - Materials $273.98 — 44.64 hours / 6 MDs

#2 - Materials $683.10 —  3.00 hours / 0.5 MDs

#3 - Materials $812.32 — 37.10 hours / 5 MDs', 10769.00, 'pending', '2026-03-11', '2026-03-11 15:20:26'),
  (9485569, 43164712, '0011', 'Adding Courses to Tree Well Wall', NULL, '12"x6" wall block gray
3 hours', 650.00, 'sold', '2026-03-11', '2026-03-11 16:16:40'),
  (9492303, 43363329, '0005', 'Additional Edging', NULL, 'Sub cost $504', 785.00, 'pending', '2026-03-12', '2026-03-12 11:17:37'),
  (9492395, 42580132, '0008', 'Irrigation + Lights', NULL, '#1 LIGHTING Materials  $796.50 -- 3.50 hours / 0.44 MDs

#2 IRRIGATION MAterials $985.00 -- 16 hours / 2 MDs', 3628.00, 'pending', '2026-03-12', '2026-03-12 11:22:41'),
  (9492815, 43853281, '0002', 'Lighting', NULL, 'Material: $900 (MD - 4 hours)', 1750.00, 'pending', '2026-03-12', '2026-03-12 11:45:04'),
  (9496132, 43541680, '0002', 'Block wall, irrigation, lights', NULL, 'materials	hours	MDs
wall	$1,934.71	46.37	5.80
waterproof	$394.20	6.67	0.83
wall cap	$798.55	10.58	1.32
irrigation	$75.56	2.50	0.31
electrical	$757.17	6.23	0.78', 11066.00, 'pending', '2026-03-12', '2026-03-12 16:00:25'),
  (9500610, 39951145, '0001', 'More Tile', NULL, NULL, 300.00, 'pending', '2026-03-13', '2026-03-13 09:25:47'),
  (9500950, 43164712, '0012', 'Credit for DG for 240sqft', NULL, NULL, -1916.00, 'sold', '2026-03-13', '2026-03-13 09:50:06'),
  (9502436, 43164712, '0013', '600sqft of Brown Shredded Mulch', NULL, NULL, 560.00, 'sold', '2026-03-13', '2026-03-13 11:40:27'),
  (9502537, 43164712, '0014', '25 additional Japanese Boxwood for front', NULL, '(25) 5 gallon Japanese Boxwood 
5 hours', 1013.00, 'pending', '2026-03-13', '2026-03-13 11:46:29'),
  (9505687, 41411781, '0009', 'Credit for unused Plants', NULL, NULL, -260.00, 'pending', '2026-03-14', '2026-03-14 08:44:33'),
  (9507571, 43164712, '0015', 'Bricks to level front yard', 'The slope on the front of the yard is too steep. Working with the foreman, he has come up with the idea to use some wall blocks to allow the lawn to be leveled as orgionally intended in the project scope. The yard needs to be reviewed and slopes adjusted to increase flatness.', NULL, 0, 'pending', '2026-03-15', '2026-03-15 22:19:42'),
  (9507574, 43164712, '0016', 'Design between the old and new concrete pads', 'I have been asking for 2+ weeks for a new design. Now the landscape team is here and is not clear on what they need to be doing. The area is not edged, drains connected, or prepared. This is delaying the laying of the sod.', NULL, 0, 'pending', '2026-03-15', '2026-03-15 22:20:56'),
  (9514383, 33691503, '0046', '10 flats of Carpet of Stars', NULL, '3 hours/1 guy', 250.00, 'sold', '2026-03-16', '2026-03-16 12:55:25'),
  (9517337, 43164712, '0017', 'Landscaping for Backyard', NULL, '.25 hours/40sqft brown shredded mulch 
1.5 hours/17 linear feet of plastic bender board 
3 hours/17 linear feet of metal edging 
2.5 hours/14 2x2 precast grey concrete steppers dry set
3.5 hours/70sqft of landscape gravel 
2 hours/(5) 5 gallon, (7) 1 gallon - till/amend 40 sqft', 910.00, 'sold', '2026-03-16', '2026-03-16 17:55:00'),
  (9517531, 43164712, '0018', '2 courses of garden wall block with soil backfill', NULL, '3 hours
60 pieces of Angelus garden wall block in grey
2 yds 70/30', 530.00, 'sold', '2026-03-16', '2026-03-16 18:44:55'),
  (9517553, 43164712, '0019', 'Pipe Repair for Fence (Carpenter)', NULL, NULL, 300.00, 'pending', '2026-03-16', '2026-03-16 18:49:46'),
  (9527128, 40998162, '0005', '(1) Nicheless Light for Pool/Color Changing', NULL, '(1) NICHELESS LIGHT COLOR CHANGING', 1500.00, 'pending', '2026-03-17', '2026-03-17 15:24:40'),
  (9527140, 40998162, '0006', 'Conduit + Gas Lines for ADU', NULL, '29 hours/iron pipe 1 1/2", conduit', 2125.00, 'pending', '2026-03-17', '2026-03-17 15:26:17'),
  (9537706, 43447324, '0005', 'Install slurry back fill', NULL, NULL, 2500.00, 'pending', '2026-03-18', '2026-03-18 14:28:00'),
  (9537748, 44015329, '0001', 'Added Items', NULL, NULL, 7865.00, 'pending', '2026-03-18', '2026-03-18 14:30:59'),
  (9546288, 39127583, '0014', 'Additional Drainage/Wall Inspection Final Sign Off', NULL, NULL, 1850.00, 'sold', '2026-03-19', '2026-03-19 12:47:09'),
  (9546709, 43227529, '0001', 'Credit for Sideyard Drainage', NULL, NULL, -4532.00, 'sold', '2026-03-19', '2026-03-19 13:16:11'),
  (9547532, 43227529, '0002', 'Minch - Zoning Permit', NULL, NULL, 47.70, 'sold', '2026-03-19', '2026-03-19 14:22:38'),
  (9548204, 43987099, '0001', 'Permit/Plan Check + Engineering Fees', NULL, NULL, 978.31, 'sold', '2026-03-19', '2026-03-19 15:30:03'),
  (9548384, 43430595, '0003', 'Doorway Footings', NULL, NULL, 480.00, 'pending', '2026-03-19', '2026-03-19 15:58:18'),
  (9548424, 43455241, '0001', 'Addt''l pavers for curved walkway', NULL, '3 hours, $18 materials', 288.00, 'pending', '2026-03-19', '2026-03-19 16:06:12'),
  (9548551, 40820736, '0002', 'Grass Repair', NULL, NULL, 1100.00, 'pending', '2026-03-19', '2026-03-19 16:33:32'),
  (9556268, 40715934, '0009', 'Sealer', NULL, NULL, 300.00, 'pending', '2026-03-20', '2026-03-20 13:49:57'),
  (9563217, 42660242, '0003', 'IB Inpsecting', NULL, NULL, 300.00, 'pending', '2026-03-23', '2026-03-23 09:16:58'),
  (9563228, 40998162, '0007', 'IB Inpsecting', NULL, NULL, 450.00, 'pending', '2026-03-23', '2026-03-23 09:17:37'),
  (9565065, 41411781, '0010', 'Electrical wiring for Spa Hookup', NULL, '1 man day/wire', 900.00, 'sold', '2026-03-23', '2026-03-23 11:10:29'),
  (9575405, 39951145, '0002', 'Additional Lights - bistro, etc.', NULL, '$330 mat -- 4 hours / 0.5 MDs
$539 mat -- 2 hours / 0.25 MDs', 1458.00, 'pending', '2026-03-24', '2026-03-24 10:41:13'),
  (9579181, 35259913, '0028', 'Light for Olive', '• (1) Spotlight on Olive', NULL, 225.00, 'pending', '2026-03-24', '2026-03-24 14:28:32'),
  (9587957, 43634549, '0001', 'Austin - Pool Remodel Permit', NULL, NULL, 1409.06, 'pending', '2026-03-25', '2026-03-25 12:01:08'),
  (9589701, 42165692, '0001', 'Furey - Pool Permit', NULL, NULL, 5325.67, 'pending', '2026-03-25', '2026-03-25 13:43:22'),
  (9595690, 43205218, '0003', 'Credit for steel plate', NULL, NULL, -2000.00, 'pending', '2026-03-26', '2026-03-26 09:01:40'),
  (9596238, 37542899, '0014', '2 additional podacarpis', NULL, NULL, 850.00, 'pending', '2026-03-26', '2026-03-26 09:36:13'),
  (9596256, 37542899, '0015', 'quick connect coupler with key and hose bib', NULL, NULL, 195.00, 'sold', '2026-03-26', '2026-03-26 09:37:55'),
  (9597867, 43205218, '0004', 'Backfill and compaction', NULL, NULL, 4000.00, 'sold', '2026-03-26', '2026-03-26 11:18:28'),
  (9613395, 39907276, '0006', 'Added Mulch Cost', NULL, NULL, 2911.22, 'pending', '2026-03-29', '2026-03-29 22:49:46'),
  (9617774, 43162412, '0005', 'Removing 5 1 gallons from planting', NULL, NULL, -100.00, 'pending', '2026-03-30', '2026-03-30 10:17:34'),
  (9617792, 43162412, '0006', 'Decreasing container size on plants', NULL, NULL, -391.00, 'pending', '2026-03-30', '2026-03-30 10:18:56'),
  (9620448, 41760041, '0002', 'Keyway', NULL, NULL, 0, 'pending', '2026-03-30', '2026-03-30 12:41:25'),
  (9621156, 43537039, '0001', 'GPI Report', NULL, NULL, 360.00, 'pending', '2026-03-30', '2026-03-30 13:18:38'),
  (9623745, 44142804, '0001', 'Sump Pump', NULL, NULL, 850.00, 'pending', '2026-03-30', '2026-03-30 18:02:42'),
  (9623760, 43699270, '0001', 'Additional Plants for backyard', NULL, '(4) flats of Rosemary
(2) 5g Passionflower
(3) 15 gallon Camellia 
3 man hours

Install wire to 40'' fence for Passionflower
4 man hours', 505.00, 'pending', '2026-03-30', '2026-03-30 18:06:24'),
  (9627838, 43252956, '0001', '20 feet of drain pipe', 'Extending drain to exit back of property', NULL, 400.00, 'pending', '2026-03-31', '2026-03-31 08:50:43'),
  (9637694, 41180335, '0020', 'Chip and stucco bond beam', 'Chip and stucco bond beam back side of the pool

• Chip and stucco bond beam behind pool', NULL, 800.00, 'sold', '2026-04-01', '2026-04-01 07:12:21'),
  (9640121, 42134207, '0002', 'Huffman - Gas & Electrical Permit', NULL, NULL, 197.75, 'pending', '2026-04-01', '2026-04-01 09:30:32'),
  (9640134, 44052940, '0001', 'Griefer - Wall, Gas & Electrical Permit', NULL, NULL, 375.72, 'pending', '2026-04-01', '2026-04-01 09:31:14'),
  (9640543, 41180158, '0011', 'Lerner - Supplemental Pool Permit', NULL, NULL, 439.07, 'pending', '2026-04-01', '2026-04-01 09:55:13'),
  (9645638, 43455241, '0002', 'Paver Sealer', NULL, 'total = $525 installed -- 2.68 hours / 0.33 MDs -- $262.80 materials', 525.00, 'pending', '2026-04-01', '2026-04-01 14:50:57'),
  (9655347, 41411781, '0011', 'Garcrest Engineering', NULL, NULL, 3120.00, 'sold', '2026-04-02', '2026-04-02 13:13:13'),
  (9657530, 41180335, '0021', 'Pressure Wash and seal travertine pavers', NULL, NULL, 2600.00, 'sold', '2026-04-02', '2026-04-02 17:58:49'),
  (9663126, 43541680, '0003', 'Lights Credit', NULL, '1.25 hours / 0.16 MDs / $464 materials', -586.78, 'pending', '2026-04-03', '2026-04-03 13:04:30'),
  (9663626, 43541680, '0004', 'Concrete wall: prep, stucco, grind', NULL, '3md & 182.00', 2580.00, 'pending', '2026-04-03', '2026-04-03 14:10:47'),
  (9663892, 42165692, '0002', 'Automation', NULL, NULL, 3850.00, 'pending', '2026-04-03', '2026-04-03 14:53:39'),
  (9664318, 43784629, '0001', '42" wall + hedges', NULL, NULL, -747.00, 'pending', '2026-04-03', '2026-04-03 17:15:46'),
  (9665300, 43227529, '0003', 'Credit for no step on front walkway', 'Jorge said we don''t need a step at the front walkway to the house and a credit would be applied.', NULL, 0, 'pending', '2026-04-05', '2026-04-05 09:40:25'),
  (9667449, 43541680, '0005', 'BT Change Order 0005', NULL, NULL, 0, 'pending', '2026-04-06', '2026-04-06 07:50:40'),
  (9667469, 43455241, '0003', 'Tile Upgrade', NULL, '$1,326 materials', 990.00, 'pending', '2026-04-06', '2026-04-06 07:51:59'),
  (9673961, 43784629, '0002', 'Entire wall = 42" high, credit 6'' wall', NULL, 'NEW MDs/HOURS for Scope of Work:
$5,127 materials -- 107 hours / 13.37 MDs

120 sqft pavers:
demo/base/install = $1,701 materials -- 6.41 hours / 0.8 MDs -- $630 sub cost (paver install)

435 sqft turf:
demo/base/install = $1,258 materials -- 35.52 hours / 4.44 MDs 

5 gal hedges:
$297 materials -- 3.2 hours / 0.40 MDs

15 gal hedge upgrade:
$688 materials -- 5.33 hours / 0.67 MDs', -3128.00, 'pending', '2026-04-06', '2026-04-06 14:20:18'),
  (9674200, 39951145, '0003', 'Wall repair, Timer upgrade', NULL, '1.25 Man Days at 725= $906.25
Mortar $20', 1267.00, 'pending', '2026-04-06', '2026-04-06 14:41:05'),
  (9682566, 43699270, '0002', '(3) PLANTS FOR BACK PLANTER', NULL, NULL, 120.00, 'pending', '2026-04-07', '2026-04-07 11:47:48'),
  (9691457, 43784629, '0003', 'Chen - Freestanding Wall, Gas & Electrical Permit', NULL, NULL, 265.41, 'sold', '2026-04-08', '2026-04-08 09:21:31'),
  (9691470, 41760041, '0003', 'Azizad - BBQ Electrical & Plumbing Permit', NULL, NULL, 530.04, 'pending', '2026-04-08', '2026-04-08 09:22:17'),
  (9703053, 42580132, '0009', 'Additional 3 lights', NULL, '$341.55 materials, 1.5 hours / 0.19 MDs', 483.90, 'pending', '2026-04-09', '2026-04-09 09:29:53'),
  (9709143, 44142804, '0002', 'Credit for partial gravel along fence line', NULL, NULL, -468.00, 'pending', '2026-04-09', '2026-04-09 16:29:17'),
  (9709154, 44142804, '0003', 'Paver add for channel next to driveway', NULL, NULL, 1382.00, 'pending', '2026-04-09', '2026-04-09 16:30:53'),
  (9709183, 44142804, '0004', 'Credit for area drains', NULL, NULL, -250.00, 'pending', '2026-04-09', '2026-04-09 16:35:37'),
  (9709341, 43348423, '0001', 'Paver extension and Paver Curb', NULL, NULL, 1985.00, 'sold', '2026-04-09', '2026-04-09 17:14:43'),
  (9713607, 37690129, '0007', 'Credit Change Order Pond', NULL, NULL, -8946.00, 'pending', '2026-04-10', '2026-04-10 09:30:10'),
  (9713627, 37690129, '0008', 'Credit for 5 inch line not run', NULL, NULL, -540.00, 'pending', '2026-04-10', '2026-04-10 09:31:51'),
  (9713762, 37690129, '0009', '1 1/2" Lines added.', NULL, NULL, 7820.00, 'pending', '2026-04-10', '2026-04-10 09:42:17'),
  (9713952, 37690129, '0010', 'Culverts', NULL, NULL, 15320.00, 'pending', '2026-04-10', '2026-04-10 09:54:37'),
  (9715829, 41954408, '0001', 'Trenching Utlities and sewer/finding sewer lines', NULL, NULL, 2200.00, 'pending', '2026-04-10', '2026-04-10 11:58:59'),
  (9715847, 41954408, '0002', 'Demoing concrete slabs and foundation', NULL, NULL, 2000.00, 'pending', '2026-04-10', '2026-04-10 11:59:47'),
  (9718240, 42134207, '0003', 'Reconnect electric', NULL, NULL, 880.00, 'pending', '2026-04-10', '2026-04-10 15:39:25'),
  (9718311, 43230226, '0001', 'Different scope of work from original contract', NULL, NULL, 26623.00, 'pending', '2026-04-10', '2026-04-10 15:56:31'),
  (9731259, 42134207, '0004', 'Removal of planting', NULL, NULL, -7654.00, 'pending', '2026-04-13', '2026-04-13 16:29:37'),
  (9740000, 41760041, '0004', 'Shotcrete inspection', NULL, NULL, 300.00, 'pending', '2026-04-14', '2026-04-14 12:17:20'),
  (9740143, 42165692, '0003', 'IB Shotcrete inspection', NULL, NULL, 200.00, 'sold', '2026-04-14', '2026-04-14 12:23:26'),
  (9749535, 41157433, '0008', '1 ap214b path light and installation', '1 replacement light and installation', NULL, 275.00, 'pending', '2026-04-15', '2026-04-15 10:31:08'),
  (9751096, 41954408, '0003', 'IB Drypack', NULL, NULL, 300.00, 'pending', '2026-04-15', '2026-04-15 11:58:28'),
  (9753623, 43835162, '0001', 'CREDIT - Repairs', NULL, NULL, -1837.00, 'pending', '2026-04-15', '2026-04-15 14:34:45'),
  (9760001, 43634549, '0002', 'Austin - Parking Permits', NULL, NULL, 66.67, 'sold', '2026-04-16', '2026-04-16 09:37:54'),
  (9765882, 43784629, '0004', 'Remove CO 1 and 2 credits.', NULL, NULL, 3875.00, 'pending', '2026-04-16', '2026-04-16 16:44:31'),
  (9771652, 41180335, '0022', 'Additional gravel and glass shades', '3 glass shades 6 75 lbs bags of jellybean gravel', NULL, 282.00, 'pending', '2026-04-17', '2026-04-17 10:59:00'),
  (9771862, 43784629, '0005', 'Stucco Both Sides, $0', NULL, NULL, 0, 'pending', '2026-04-17', '2026-04-17 11:11:40'),
  (9772293, 43634549, '0003', 'Extra Demo', NULL, NULL, 1150.00, 'sold', '2026-04-17', '2026-04-17 11:40:35'),
  (9773847, 43252956, '0002', 'Credit for Steel edging', NULL, NULL, -384.00, 'pending', '2026-04-17', '2026-04-17 13:32:37'),
  (9774809, 41954408, '0004', 'Height Survey', NULL, NULL, 1600.00, 'pending', '2026-04-17', '2026-04-17 15:57:18'),
  (9782684, 43541680, '0006', 'Semi-gloss Paver Sealer', NULL, '80 sqft of sealer: $105
$65 mat, 0.40 hours / 0.05 MDs', 200.00, 'pending', '2026-04-20', '2026-04-20 10:45:43'),
  (9782934, 43835162, '0002', 'IB _ Anchors inspection', NULL, NULL, 300.00, 'sold', '2026-04-20', '2026-04-20 11:00:22'),
  (9788306, 43348423, '0002', 'Metal edging for planters', NULL, NULL, 2000.00, 'sold', '2026-04-20', '2026-04-20 19:38:33'),
  (9797024, 43348423, '0003', '(8) additional Plants + mulch for existing planter', NULL, NULL, 460.00, 'sold', '2026-04-21', '2026-04-21 13:08:14'),
  (9799425, 43541680, '0007', 'Change Order: Native plants + 1 Jasmine', NULL, NULL, 508.00, 'pending', '2026-04-21', '2026-04-21 15:48:47'),
  (9809064, 42165692, '0004', 'Concrete Pad', NULL, NULL, -460.00, 'pending', '2026-04-22', '2026-04-22 12:50:53'),
  (9823296, 41760041, '0005', 'Utlity runs', NULL, NULL, 4680.00, 'pending', '2026-04-23', '2026-04-23 16:29:15'),
  (9823310, 44052940, '0002', 'Weed Removal front Yard', NULL, NULL, 2650.00, 'pending', '2026-04-23', '2026-04-23 16:33:07'),
  (9827745, 43633156, '0001', 'Meurer - Gas/Electrical Permit', NULL, NULL, 335.44, 'pending', '2026-04-24', '2026-04-24 09:15:23'),
  (9832754, 44142804, '0005', 'Rosen - Curb Core Permit', NULL, NULL, 399.37, 'pending', '2026-04-24', '2026-04-24 15:51:49'),
  (9838626, 36551611, '0009', 'CREDIT - Irrigation', NULL, NULL, -2900.00, 'pending', '2026-04-27', '2026-04-27 09:46:11'),
  (9841105, 43634549, '0004', 'Repair for Pool Shell Cracks', NULL, NULL, 2246.00, 'sold', '2026-04-27', '2026-04-27 15:04:11'),
  (9841175, 44493788, '0001', 'Channel Drain / Downspout Tie In', NULL, NULL, 1400.00, 'pending', '2026-04-27', '2026-04-27 15:17:47'),
  (9844389, 44284160, '0001', 'Back fill LIDS planter.', NULL, NULL, 3200.00, 'sold', '2026-04-28', '2026-04-28 10:29:02'),
  (9844408, 44284160, '0002', 'Remove soils, backfill hillside,  Clean up soils.', NULL, NULL, 2875.00, 'sold', '2026-04-28', '2026-04-28 10:31:16'),
  (9851933, 44142804, '0006', 'Public Works Sidewalk Replacement', NULL, NULL, 1200.00, 'pending', '2026-04-29', '2026-04-29 16:24:20'),
  (9857032, 43699270, '0003', 'CREDIT - Trimming', NULL, NULL, -200.00, 'pending', '2026-04-30', '2026-04-30 16:08:06'),
  (9857166, 37690129, '0011', 'Added Pipe, Mandrelling, Cutting Pipe', NULL, NULL, 2800.00, 'pending', '2026-04-30', '2026-04-30 17:04:18'),
  (9859505, 44219850, '0001', 'BT Change Order 0001', NULL, NULL, 0, 'pending', '2026-05-01', '2026-05-01 09:56:04'),
  (9859513, 44219850, '0002', 'Change of original scope', NULL, NULL, -893.00, 'pending', '2026-05-01', '2026-05-01 09:56:45'),
  (9859555, 44219638, '0001', 'Additional work from original contract', NULL, NULL, 9370.00, 'pending', '2026-05-01', '2026-05-01 10:03:52'),
  (9861245, 41760041, '0006', 'BBQ', NULL, NULL, 17493.00, 'pending', '2026-05-01', '2026-05-01 14:53:45'),
  (9861253, 37690129, '0012', 'Inspector Required Backwards Mandrel', NULL, NULL, 1200.00, 'pending', '2026-05-01', '2026-05-01 14:56:16'),
  (9861260, 41760041, '0007', 'Additional height of curb wall', NULL, NULL, 4086.00, 'pending', '2026-05-01', '2026-05-01 14:57:43'),
  (9861274, 41760041, '0008', '8x8 tv wall', NULL, NULL, 12302.00, 'pending', '2026-05-01', '2026-05-01 15:01:10'),
  (9861440, 40998162, '0001', 'Pavers Credit (temp)', NULL, NULL, -2790.00, 'pending', '2026-05-01', '2026-05-01 16:47:18'),
  (9861782, 44638777, '0001', 'BT Change Order 0001', NULL, NULL, 0, 'pending', '2026-05-02', '2026-05-02 19:24:02'),
  (9863211, 42660242, '0004', 'Removal of curb and increase amount of concrete', 'Will use 8 linear feet of curbing.
Pour and form for 1350 sq ft of concrete up from 870', NULL, 2600.00, 'sold', '2026-05-04', '2026-05-04 07:22:43'),
  (9864265, 42660242, '0005', 'IB Inspection Anchors', NULL, NULL, 250.00, 'pending', '2026-05-04', '2026-05-04 09:41:49'),
  (9864270, 43634549, '0005', 'IB Inspection Anchors', NULL, NULL, 450.00, 'pending', '2026-05-04', '2026-05-04 09:42:32'),
  (9864540, 43987099, '0002', 'Updated Contract/Scope of work', NULL, NULL, 27920.00, 'pending', '2026-05-04', '2026-05-04 10:13:02'),
  (9866982, 44064446, '0001', '1 yard of premium mulch', 'Install 1 yard of premium mulch', NULL, 450.00, 'pending', '2026-05-04', '2026-05-04 16:36:47'),
  (9875685, 43987099, '0003', 'Libman - Pool Spa Remodel Permit', NULL, NULL, 1054.11, 'sold', '2026-05-06', '2026-05-06 11:23:59'),
  (9881903, 39951145, '0004', 'CREDIT - GFCI', NULL, NULL, -462.00, 'pending', '2026-05-07', '2026-05-07 10:48:53'),
  (9883741, 44219850, '0003', 'Additional Credits', NULL, NULL, -395.00, 'pending', '2026-05-07', '2026-05-07 14:50:37'),
  (9884211, 44493788, '0002', 'Restock/Delivery', NULL, NULL, 400.00, 'sold', '2026-05-07', '2026-05-07 17:55:29'),
  (9885687, 42660242, '0006', 'Automation', NULL, NULL, 3850.00, 'pending', '2026-05-08', '2026-05-08 08:13:38'),
  (9888198, 43022000, '0001', 'Ng - Pool Permit', NULL, NULL, 5009.20, 'pending', '2026-05-08', '2026-05-08 15:49:51'),
  (9891048, 42134207, '0005', 'IB Inspection Shotcrete', NULL, NULL, 300.00, 'pending', '2026-05-11', '2026-05-11 09:21:56'),
  (9896861, 43939058, '0001', 'Camellia 15g. Review location w/customer', NULL, NULL, 227.00, 'pending', '2026-05-12', '2026-05-12 09:38:31');

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

  RAISE NOTICE 'Batch 5 of 5 complete — Imported: %, Already-imported: %, No matching job: %',
    v_imported, v_dup, v_no_job;
END $$;

COMMIT;
