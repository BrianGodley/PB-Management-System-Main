-- ============================================================
-- BT Change Orders Import — Batch 2 of 5
-- COs in this batch: 1,337 (rows 1338-2674 of 6,681)
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
  (2833126, 7063556, '0002', 'Trenching for main line (water)', NULL, NULL, 1400.00, 'pending', '2020-02-08', '2020-02-08 13:57:19'),
  (2833162, 6931718, '0001', 'Additional Demo and Hauling', 'Original contract has 700 sq ft x 19 inches deep demo for a total of 38 cubic yards. (3 truckloads) 
Actual demo and hauling was 90 total yards (7 1/2 Truckloads) including extra soil on top and sides. 
Forklift Rental for moving pallets. 
 

Total additional soils change order is $3,800', NULL, 3800.00, 'pending', '2020-02-08', '2020-02-08 19:42:14'),
  (2833345, 6713355, '0014', 'Veneer Front', 'Remove existing wall cap.
Install matching veneer to house.
Install new bullnose cap for wall. 
Grout Cap
Grout Veneer.', NULL, 4100.00, 'pending', '2020-02-09', '2020-02-09 12:57:58'),
  (2835011, 6962273, '0002', 'Additional Pavers', NULL, NULL, 2548.00, 'pending', '2020-02-10', '2020-02-10 11:10:57'),
  (2835014, 6962273, '0003', 'Additional Steps', NULL, NULL, 720.00, 'pending', '2020-02-10', '2020-02-10 11:11:49'),
  (2835017, 6962273, '0004', 'Additional Step Lights', NULL, NULL, 490.00, 'pending', '2020-02-10', '2020-02-10 11:12:29'),
  (2835024, 6962273, '0005', 'Additional Planter Pavers', NULL, NULL, 330.00, 'pending', '2020-02-10', '2020-02-10 11:13:17'),
  (2835043, 6962273, '0006', 'Electrical Change order', NULL, NULL, 120.00, 'pending', '2020-02-10', '2020-02-10 11:19:51'),
  (2837504, 6829895, '0003', 'Extra demo', NULL, NULL, 3300.00, 'pending', '2020-02-11', '2020-02-11 09:43:56'),
  (2838540, 6931718, '0002', 'Concrete', 'Concrete Pad

Install road base layer,  Compact.
Install forms for concrete by garage.
Install #4 rebar 24 inches on center
Core garage pad anchor hole.  Epoxy and pin slab to garage pad. 
Pour 2500 PSI concrete. Roughly 190 square feet. 
$2000

Wall

Dig footings
Install rebar every 16 inches on center
Pour concrete footings  24 inches deep,  2 1/2 feet wide.  with a key
Install 17 linear feet of 8x8x16 CMU block 5 feet high.
Install 10 linear feet of 8x8x16 CMU block 3 feet high.
Install 13 linear feet of 8x8x16 CMU block 2 feet high.
Install waterproofing layer behind wall 
Grout lift wall cells
Install wall cap
$6,750', NULL, 2000.00, 'sold', '2020-02-11', '2020-02-11 13:28:57'),
  (2840882, 7063556, '0003', 'Gas line for BBQ 80 feet', NULL, NULL, 2800.00, 'pending', '2020-02-12', '2020-02-12 11:16:53'),
  (2840893, 7063556, '0004', 'Electrical for BBQ and water feature 86 feet', NULL, NULL, 1892.00, 'pending', '2020-02-12', '2020-02-12 11:18:41'),
  (2840963, 7063556, '0005', 'Seat at 36 LF. Stone wall 2 and cap', '18" Tall  Grey Charcoal', NULL, 3862.00, 'pending', '2020-02-12', '2020-02-12 11:35:11'),
  (2849757, 7063556, '0006', '69 Linear Feet of Rustic wall block curbing', 'Curb on side of driveway and side of house walkway 
Rustic wall block on it''s side. with 8" side at the height side.  2" buried in footing and 6" exposed.', NULL, 2070.00, 'pending', '2020-02-17', '2020-02-17 16:24:09'),
  (2849839, 7108235, '0001', 'Bender Board in parkways', 'Bender board as in the plan I gave Fidel on 2-17-20 36 LF X $8.00=  $288.00', NULL, 288.00, 'pending', '2020-02-17', '2020-02-17 17:15:24'),
  (2856161, 7108235, '0002', 'Demo fabric and mulch 315 sf', NULL, NULL, 787.00, 'pending', '2020-02-19', '2020-02-19 20:33:44'),
  (2859123, 7063556, '0007', 'Deck Repair (14,100)', 'Deck repair full repair, rebuild see attachment for details, includes paint', NULL, 0, 'pending', '2020-02-20', '2020-02-20 19:03:28'),
  (2859265, 5472327, '1100', 'Additional 110V Outlets', 'Original Contract includes (4) outlets

(NOT ADDED; 
Extend gas line approx 10ft from bbq area $600)

Add Additional outlets as shown on attached plan
Back wall Center                             $350
Back wall right hand corner             $75
Garage Wall        Right corner        $300
Garage Wall        Left corner           $75
House Wall                                      $300

                                        Total $1100

see attached  plan for locations', NULL, 1100.00, 'sold', '2020-02-21', '2020-02-21 01:00:32'),
  (2861626, 6962273, '0007', '10 5 gallon plants', '10 5 gallon Carolina cherry', NULL, 400.00, 'pending', '2020-02-22', '2020-02-22 08:59:49'),
  (2864022, 7063556, '0009', 'Deck Start', NULL, NULL, 7050.00, 'pending', '2020-02-24', '2020-02-24 11:49:43'),
  (2864030, 7063556, '0010', 'Deck Finish with (-800 credit)', NULL, NULL, 6250.00, 'pending', '2020-02-24', '2020-02-24 11:50:27'),
  (2864492, 7108235, '0003', 'Taking out Steppers (-2700)', 'Taking out steppers', NULL, 0, 'pending', '2020-02-24', '2020-02-24 13:47:32'),
  (2869351, 7063556, '0011', '1 additional foot of Outdoor Kitchen', 'One additional foot of outdoor kitchen', NULL, 850.00, 'pending', '2020-02-26', '2020-02-26 08:59:37'),
  (2870016, 5472327, '1102', 'Add 8" block to existing wall.', NULL, NULL, 1050.00, 'sold', '2020-02-26', '2020-02-26 11:26:55'),
  (2871254, 6931718, '0003', '54 linear feet of new bond beam retaining walls', 'Dig footings.  Deliver material.   Install rebar  and footings . Install block and grout lift cells   $2875

Additional bobcat demo -  $490 for equipment rental.  

$630 Rental charge of forklifts for previous issues on jobsite - No Charge to client.', NULL, 3265.00, 'pending', '2020-02-26', '2020-02-26 17:45:44'),
  (2871429, 5472327, '1105', 'Sandy Beach veneer stone', '6-8 week delivery', NULL, 7720.00, 'sold', '2020-02-26', '2020-02-26 22:08:45'),
  (2871435, 5472327, '1106', 'Pavers Courtyard   - Patio & Spa areas (revised)', 'Paver and Spa Area   "Adobe Copper Mocha"
             1. Install 4” compacted base
             2. 1” Screed Sand
             3. 640Sqft Group 1 pavers
            4. complete with joint sand

Excavation included in contract', NULL, 4864.00, 'sold', '2020-02-26', '2020-02-26 22:15:16'),
  (2871443, 5472327, '1108', 'Bellacrete Wall and Steps', 'Install Bellecrete Wall Cap and Step tread in Coffee Color.
Victorian Style and Smooth Finish for Walls and Possibly steps. 
Roughly 130 linear feet.', NULL, 4710.00, 'sold', '2020-02-26', '2020-02-26 22:30:03'),
  (2871453, 7185170, '0002', 'Concrete Driveway With 4" loose rock bands + Scope', 'changes contracted driveway from pavers to broom finished concrete with up to 3 bands across driveway filled in with decorative del rio group 1 stone. concrete to be 4" thick under entry bands where triangles are, continuous rebar

reduces contract by  $1232 as a credit from total sum
ADD additional Demo to remove 9" thick  driveway (an additional 5") over 4 normal driveway $1680

Total additional cost is $448

change is scope of work as described below no additional charge
- subtracts extension of front porch area and moves square footage to behind garage
 - Removes step from garage area, and includes demo of existing concrete and ramps this area
 - Paseo 2 paver pads to 3" spacing from 6" spacing may require additional pads beyond contracted 
 - additional pads will be at the rate of $44ea
 - Lawn area will be graded to near flat and taper at 4ft planter area', NULL, 448.00, 'pending', '2020-02-26', '2020-02-26 22:59:16'),
  (2872314, 6962900, '0002', '14 linear ft channel grate', NULL, NULL, 850.00, 'pending', '2020-02-27', '2020-02-27 09:03:03'),
  (2872934, 6931718, '0004', 'Consolidation of invoice 3,6,7 (+3% cc fee)', NULL, NULL, 11005.55, 'pending', '2020-02-27', '2020-02-27 11:36:41'),
  (2873752, 6962900, '0003', 'Garage Concrete Work (credit)', 'credit, we are not doing the garage work', NULL, -4950.00, 'sold', '2020-02-27', '2020-02-27 14:34:51'),
  (2875027, 7185170, '00001', 'Paver Driveway "Courtyard" + Scope change', 'Angelus courtyard stone 616sqft
border 6x9
Field 9x9, 9x12, 15x15 random mix

reduces contract by  $1373 
ADD additional Demo to remove 9" thick  driveway (an additional 5") over 4 normal driveway $1680

Total additional cost is $307

change is scope of work as described below no additional charge
- subtracts extension of front porch area and moves square footage to behind garage
 - Removes step from garage area, and includes demo of existing concrete and ramps this area
 - Paseo 2 paver pads to 3" spacing from 6" spacing may require additional pads beyond contracted 
 - additional pads will be at the rate of $44ea
 - Lawn area will be graded to near flat and taper at 4ft planter area', NULL, 307.00, 'sold', '2020-02-28', '2020-02-28 08:48:57'),
  (2878756, 5472327, '1110', 'Additional valve for lawn (need to core wall)', '1000

declined by owner', NULL, 0, 'pending', '2020-03-02', '2020-03-02 12:29:29'),
  (2879922, 7063556, '0012', 'PLANTS, MULCH BENDER BOARD', 'Hi Sandy and Dan,
I look forward to stopping by tomorrow around 2-3pm.  Can’t wait to see the progress!!

Please approve the count for plants, mulch and bender board.  Jorge mentioned about adding plants on the side which I would be happy to do.
Based on the approved plan:
1 Gallon @ $21.00            Front 32 plants                 Back 2 plants      Total 34 1 gallon X $21.00=           $714.00
5 Gallon @ $42.00            Front 42 plants                  Back 36 plants   Total 78 5 gallon X $42.00=        $3,276.00
15 gallon @ $175.00        Front 1                                  Back 2                   Total 3 15 gallon X $42.00=           $525.00
Total for plants= $4,515.00

Mulch Gorilla Hair, upgrade $1.75 @ SF  1,120 Square Feet=  $1,960.00

Bender Board    90 Linear Feet X $8.00= $720.00

Total=  $7,195.00
In contract $3,000.00
Difference in change order= $4,195.00

APPROVED', NULL, 4195.00, 'pending', '2020-03-02', '2020-03-02 23:16:40'),
  (2880602, 5472327, '1111', 'Step Veneer', 'This is for adding veneer for step risers.', NULL, 1250.00, 'sold', '2020-03-03', '2020-03-03 08:02:56'),
  (2880855, 6931718, '0005', 'Adjustment for CC payment', NULL, NULL, -10685.00, 'pending', '2020-03-03', '2020-03-03 09:01:08'),
  (2882594, 7063556, '0013', 'Bench seat in front', '13 linear feet of bench seat in Angelus stone wall ''ll
2 courses with cap. 
I nstall fabric to hold back soil
cut pipe 6" and lower 12" 
back fill back side of wall with gravel', NULL, 1112.00, 'pending', '2020-03-03', '2020-03-03 15:54:13'),
  (2883017, 7063556, '0014', 'French drain with waterproofing on house footing', '31 Linear feet of french drain 12" from finish grade to drain 2 percent slope at minimum
Trench away from house 12" and apply 2 coats of Henry''s Tar and 1 layer of bichathene
Set perorated pipe in fabric sleeve and back fill with gravel', NULL, 1240.00, 'pending', '2020-03-03', '2020-03-03 20:52:06'),
  (2887659, 7168264, '0001', '30ft of concrete block wall along DG walk', 'Smooth stucco finish
Up to 18" height', NULL, 2890.00, 'sold', '2020-03-05', '2020-03-05 11:04:22'),
  (2887677, 7168264, '0002', '40ft of drain at play area w inlets', 'Tie in downspouts 
5 ft of chanel drain', NULL, 1130.00, 'sold', '2020-03-05', '2020-03-05 11:08:30'),
  (2888989, 3357309, '2039251', 'Turf Maintenance', NULL, NULL, 250.00, 'pending', '2020-03-05', '2020-03-05 16:44:37'),
  (2890588, 6829895, '0004', 'Removing Pergola from contract', 'Taking out pergola from contract.  Will work with Craig Kanga directly', NULL, -25530.00, 'pending', '2020-03-06', '2020-03-06 11:39:26'),
  (2890592, 6829895, '0005', 'Adding in the pergola stucco/concrete post wraps', 'Setting stucco and concrete top 36"-40" high post wraps/pilasters to match the kitchen 
Same color stucco and same concrete top color', NULL, 2700.00, 'pending', '2020-03-06', '2020-03-06 11:41:53'),
  (2890996, 5472327, '1112', 'Extend Patio additional amount', 'Extend patio to previous string line location.', NULL, 250.00, 'sold', '2020-03-06', '2020-03-06 13:50:20'),
  (2891001, 5472327, '1113', 'Additional Wall lighting', 'Add hidden wall down lights around permitter wall.  Spaced every 6 feet.   will be additional 12 lights.

Note - Step lights will be hidden under mount as well.', NULL, 2340.00, 'sold', '2020-03-06', '2020-03-06 13:52:14'),
  (2891089, 6962900, '0004', 'Paver Sealer - natural look', NULL, NULL, 1200.00, 'pending', '2020-03-06', '2020-03-06 14:26:38'),
  (2891093, 6962900, '0005', 'Remove 12ft ornamental fence and dispose', NULL, NULL, 250.00, 'pending', '2020-03-06', '2020-03-06 14:27:29'),
  (2891672, 6957272, '0001', 'Irrigation', 'Front Lawn area  2 zones rain bird pop-ups for future lawnTie in 3 shrub bubblers for 3  owner installed plants to one of the zonesRear Lawn 2 zones rain bird pop-ups .install 8f nozzes on left zoneInstall 1 zone for garden area. With pressure reglator and Y filter . Install  (6) 6-outlett spaghetti  tubing risers Rainbird Emt-6Xmove existing valve and add new valves to left rear corner. And install garden valveRake and remove all rear gravel and dispose', NULL, 4800.00, 'pending', '2020-03-07', '2020-03-07 15:45:46'),
  (2894008, 7168264, '0003', 'Electrical Outlets', 'Trench and install 80 linear feet 3/4 conduit
install 5 GFI protected outlets
includes 12/2 wire 
see attached design for approx locations requested by owner
does not include permits', NULL, 2240.00, 'sold', '2020-03-09', '2020-03-09 13:14:24'),
  (2894020, 7168264, '0004', 'Demo rocks and Wals', 'Remove 2 large concrete rocks 
install stacked concrete walls shown in picture
includes up to 16hrs labor and (1) lowboy to dispose
grade hills side smooth 

see attached picture showing walls and rock to be removed', NULL, 2467.00, 'sold', '2020-03-09', '2020-03-09 13:16:50'),
  (2897116, 6883019, '0001', 'Upgrade to Pacific Clay Paver in Light Iron Spot', 'Using clay pavers in light iron spot approved via email and text', NULL, 823.00, 'pending', '2020-03-10', '2020-03-10 12:45:02'),
  (2897767, 7168264, '0005', 'Gas and Electrical Permit (allowance $1600)', 'Gas and Electrical permits, include Permit Technician  at the rate of $120hr  includes Drawings, travel and permits running and Permit Fees/costs

not to exceed $1600 without further approval', NULL, -1600.00, 'pending', '2020-03-10', '2020-03-10 15:54:08'),
  (2897897, 7063556, '0015', 'Water main to fountain', 'Water main line to fountain. 42 linear feet. X $20.00. Measured by Jorge.', NULL, 820.00, 'pending', '2020-03-10', '2020-03-10 17:00:55'),
  (2897899, 7063556, '0016', '2 new valves in back hill area.', '2 new valves. For existing hillside spray.', NULL, 1100.00, 'pending', '2020-03-10', '2020-03-10 17:02:51'),
  (2900085, 6845509, '0001', 'Rock & Decomposed Granite Selections', 'DG with stablizer from Ornelas Wood Recovery OWR - no additional charge

Upgrade to Group 3 Rock  ADD $1512
Arizona River Rock 1/2-3/4 C&M Topsoil', NULL, 1512.00, 'sold', '2020-03-11', '2020-03-11 11:19:32'),
  (2901977, 7240573, '0001', 'Jobsite Cleanup, Fence Demo  and Trash Removal', 'Clean up jobsite remove all trash.
Remove concrete debris. 
Remove materials in driveway.   
Remove southern fencing.
Remove footings for existing fencing.
Haul debris to dump.', NULL, 2800.00, 'sold', '2020-03-12', '2020-03-12 06:58:45'),
  (2902004, 7240573, '0002', 'Tree and Softscape Removal', 'Remove 3 trees.
Remove stump for citrus
Stump grind palm base and root system.
Remove green material in backyard.
Remove hedges in front. 
Haul waste.', NULL, 2190.00, 'sold', '2020-03-12', '2020-03-12 07:06:37'),
  (2902012, 7240573, '0003', 'Add Step', 'Add step for grade transition in north corner of house.', NULL, 200.00, 'sold', '2020-03-12', '2020-03-12 07:08:15'),
  (2902054, 7240573, '0004', 'Added Demo, Backfilling, Grading North side.', 'Need to cut additional 2 feet x 10 x 3-8 foot section of soil/hardpan for retaining wall on north side for waterproof and drainage access.

Grade is 10 inches low in entire north side section.  By northeast corner grade is over 2 feet low.   Need to raise entire grade.  Soils must be compacted in 4-8 inch lifts to 90% proctor for proper stabilization.   Roughly 440 sq feet and 15 yards.   Using all soils from onsite demo of pool deck , wall and front planter.  Any added soils at additional cost.', NULL, 3800.00, 'sold', '2020-03-12', '2020-03-12 07:21:19'),
  (2902073, 7240573, '0005', 'Pool Deck demo and Backfilling', 'Remove roughly 2-3 yards of extra soils in back of pool area.
Backfill all existing open trenches. 
Compact trenches in lifts.', NULL, 1300.00, 'sold', '2020-03-12', '2020-03-12 07:26:43'),
  (2902140, 7240573, '0006', 'Raise grade for back lawn', 'Raise back lawn grade 12 inches roughly 500 sq feet.  Must import 16 yards soils and amendments and use 2 yards from onsite.  Roughly 18 yards total.  2 yards of it  from onsite to remain from step grading etc. 

Will bring up soils using conveyors. and wheelbarrows.  420 wheelbarrows and 42 linear feet of conveyors.', NULL, 6800.00, 'sold', '2020-03-12', '2020-03-12 07:43:15'),
  (2902160, 7240573, '0007', 'Raise grade for Rear Patio', 'Back fill concrete around posts. Roughly 3/4 of yard.

Backfill additional non footing areas around posts

Raise grade of portion of back patio by 6 inches.   Use soils from upper section demo. 

Compact soils in lifts.', NULL, 1350.00, 'sold', '2020-03-12', '2020-03-12 07:49:35'),
  (2902379, 7240573, '0008', 'Add Bench Seat Wall Work', 'Add additional course and grout lift for Bench seat wall. Contract was 8" need 12 " now.  $390
Add additional bench seat return wall that was not in contract.   $900', NULL, 1290.00, 'sold', '2020-03-12', '2020-03-12 08:47:37'),
  (2902419, 6962900, '0006', 'Wood Step Disassemble/Reassemble', 'no paint included', NULL, 821.00, 'sold', '2020-03-12', '2020-03-12 08:56:08'),
  (2902830, 6829895, '0006', 'Pilaster Rock facade credit on front pilaster', 'Credited for not applying rock facade to front yard facade.', NULL, -430.00, 'pending', '2020-03-12', '2020-03-12 10:48:48'),
  (2903287, 7240573, '0009', 'Install new property line curbing', 'Dig footings down 12 inches be low grade. 
Form 51 linear feet of curbing. two sides with stake restraints
Release agent on forms
Pour curbing with 2500 psi concrete.
Remove forms when set and finish.', NULL, 3900.00, 'sold', '2020-03-12', '2020-03-12 12:34:56'),
  (2905369, 7063556, '0017', 'Drainage, backyard planter/under pavers', 'This is for the planter that is behind the stone wall II.  It connects to drainage in pavers and to existing drainage lines in th back taking the water to the street.', NULL, 1200.00, 'pending', '2020-03-13', '2020-03-13 10:11:02'),
  (2905474, 7063556, '0018', 'Final Hardscape Count', NULL, NULL, 270.00, 'pending', '2020-03-13', '2020-03-13 10:45:48'),
  (2905489, 7063556, '0019', 'Final Plant Count', 'Final count 
From the daily log;

Verva -

Actual plant count based on Plan. Plant list varied from plan.

See the total of what the plant PLAN calls for and what is ordered. (we subbed 1 15 gal for a 5gal.

58 - 1gals
92 - 5gals
2 - 15gals

Total planting cost should be $5257. From my understanding the client has been invoiced a total of 4515 so far.

A change order for $742.00 needs to be added for planting.
 
Thanks.


Respectfully,

Mohammed Rahman', NULL, 742.00, 'pending', '2020-03-13', '2020-03-13 10:50:01'),
  (2906673, 6957272, '0002', 'Rototill  w/amendment andl Finish Grade Front Lawn', NULL, NULL, 2913.00, 'sold', '2020-03-14', '2020-03-14 11:51:10'),
  (2910958, 7337311, '0001', '1st Design payment', NULL, NULL, 700.00, 'pending', '2020-03-17', '2020-03-17 09:17:25'),
  (2910972, 7337311, '0002', 'Final Design Payment', NULL, NULL, 700.00, 'pending', '2020-03-17', '2020-03-17 09:18:50'),
  (2911292, 7240573, '0010', 'Rebuild patio wall', NULL, NULL, 6250.00, 'pending', '2020-03-17', '2020-03-17 10:39:40'),
  (2911322, 7240573, '0011', 'Demo concrete pad', NULL, NULL, 650.00, 'pending', '2020-03-17', '2020-03-17 10:46:58'),
  (2912620, 7240573, '0012', 'Core 3 holes on wall for plumbing', NULL, NULL, 400.00, 'sold', '2020-03-17', '2020-03-17 17:07:33'),
  (2913813, 7185170, '0003', 'Low Voltage Lighting (updated)', 'See attched updated lighting plan

Vista Brand LED Fixtures (Group 1) $220ea
(3) Path Lights
(3) Up lights
(3) Well lights
Transformer $660

Total lights 28x $220 = $1980
Transformer $660
Total lighting package $2640', NULL, 2640.00, 'pending', '2020-03-18', '2020-03-18 09:41:39'),
  (2915015, 7185170, '0004', '42 additional 5 gallon Ligustrum', NULL, NULL, 1890.00, 'sold', '2020-03-18', '2020-03-18 14:25:10'),
  (2915643, 6957272, '0003', 'Rototill  w/amendment and Finish Grade REAR Lawn', 'stepping stones to remain as is', NULL, 3412.00, 'sold', '2020-03-18', '2020-03-18 20:50:59'),
  (2919499, 6713355, '0015', 'Concrete and slope work', '- Install new concrete walkway on slope with swaling/slope for runoff.
- Remove and replace plants as needed for new slope terracing.
- Install 2 new landscape tie walls with two new levels.
- Backfill new terrace and rerun irrigation. 

Payment schedule with be based upon completion of change order.
10% due at 10% completion points of work.  Roughly 2 1/2 weeks of work.', NULL, 34450.00, 'pending', '2020-03-20', '2020-03-20 10:34:55'),
  (2919614, 7063556, '0020', '3 metal posts', '3 posts at $146.00 in materials X 1.4= $204.00
Labor $700.00
$904.00', NULL, 904.00, 'pending', '2020-03-20', '2020-03-20 11:05:41'),
  (2919764, 6713355, '0016', 'Patio Cover', 'This is to build the patio cover.   

Original Price $21,140 in contract.
Plus $950 for material to extend beyond Kitchen win width direction.  Labor covered by Picture Build as post not set early
Plus $1800 for labor and material to extend pergola depth.  (Can be reduced in size and remove this charge, this is elective)
Plus $3400 for permits and engineering.  (Add on per contract)

Other items not covered for final build

Prep and Painting of wood. Not covered as mentioned in contract.  $2900  by Picture Build or owner can use his own painter. (Not included in this change order)', NULL, 27290.00, 'pending', '2020-03-20', '2020-03-20 11:55:39'),
  (2919779, 6713355, '0017', 'Garden Beds', '$400 per garden bed 8x3. Clear Redwoos.  2 courses of 2 x 6 with redwood posts.
$250 per garden bed for backfilling

3 beds total $1950', NULL, 1950.00, 'sold', '2020-03-20', '2020-03-20 11:59:37'),
  (2920640, 6957272, '0004', 'Wire valve to timer', NULL, NULL, 180.00, 'sold', '2020-03-21', '2020-03-21 14:46:31'),
  (2921869, 6962273, '0008', '2x5 gal rose', NULL, NULL, 84.00, 'pending', '2020-03-23', '2020-03-23 09:22:27'),
  (2922434, 7185170, '0005', 'Additional Plants', '(7) 1 Gal Sedum Autumn
(6) 1 Gal Lavandula "purple" grosso
(14) 1 Gal  Calandrinia   
Total 1Gal  - 27 x $22ea =$594

(2) 5 Gal Westrigia x $45ea = $90

(4) flats Senecio Serpends  x $75ea  = $300
(6) Flats dymondia = $75ea = $450

Total $1434', NULL, 1434.00, 'pending', '2020-03-23', '2020-03-23 11:32:06'),
  (2922764, 7035723, '0003', 'Additional items requested', 'Add
(2) path lights  $440
(1) Up lights    $220
Transplant 2 agapanthus $20 
Set 2 owner provided step stones in concrete in DG area $45

total $725', NULL, 725.00, 'sold', '2020-03-23', '2020-03-23 13:00:05'),
  (2927066, 7240573, '0013', 'Wall, Drainage, Waterproof and Compaction Add Ons', '1) Extra Demo on Patio Wall $600,  Gave discount of $900 of this extra demo  (3 guys additional day)
2) Demo down footing per inspector request to 1 foot below bedrock 3 feet beyond previous calc. $1500 7 yards of additional demo and soil movement.  (3 guys additional day)
3) Extra demo on planter area 25 sq feet down to bedrock and remove added roots.  (2 guys one day)  $1000
3) Extra Concrete for Patio Wall retaining and Planter. $1800 - 2 feet extra deep  and 1 foot extra wide added rebar and need to pump additional 10 yards of concrete . $200 for pumper add on. Plus $1600 for added concrete and delivery truck
4) Extra rebar work for large footing for patio retaining - $700  $300 Material plus partial man day.
5) Waterproofing planter and patio retaining wall 170 sq feet.  $1400 (2 guys 1/2 day plus $400 material)
6) Added gravel work for patio retaining.  1+ yard of Gravel to be wrapped in geotextile fabric vs drain sock.  $850  $350 material and 1 guy 1 day.
7) Added course for patio wall $375  (1 guy 1/4 day plus $250 material with grout and extra rebar.
8) Drain for patio area and patio retaining wall - 120 ln feet of solid SDR 35 plus 30 linear of SDR 35 french drain.  Tie into existing drain to street with no hub coupling. $23 per ln foot. $3450
9) Extra backfill and compact on utility lines  $1500  (2 guys one 1/2 day)
10) Add one inch of main water line for backyard irrigation system.  $600  $10 per foot with connections', NULL, 13775.00, 'sold', '2020-03-25', '2020-03-25 09:14:33'),
  (2929291, 6883019, '0002', 'Adding 220 sf of sod rtf', NULL, NULL, 770.00, 'pending', '2020-03-26', '2020-03-26 07:13:37'),
  (2931115, 7063556, '0021', 'Moving Electrical on Deck', 'Moving a switch.on the deck', NULL, 350.00, 'pending', '2020-03-26', '2020-03-26 17:50:47'),
  (2931127, 7063556, '0022', 'Sealer for pavers and curb', 'sealer for the pavers, and curb', NULL, 1661.00, 'pending', '2020-03-26', '2020-03-26 17:59:39'),
  (2935920, 6713355, '0018', 'Extra course of landscape tie', NULL, NULL, 3060.00, 'sold', '2020-03-30', '2020-03-30 15:44:35'),
  (2936602, 7240573, '0014', 'Concrete to 6 in and Upgrade Wall to pour in place', 'Upgrade concrete beds to 6 inches for pool deck, side yard and front walkway.  $4,000

Upgrade Retaining Wall for Pool Deck to Poured in Place vs Block wall in contract  $4,800.    8 additional man days plus material.', NULL, 8800.00, 'sold', '2020-03-31', '2020-03-31 07:12:53'),
  (2938277, 7240573, '0015', 'Credit - Front walkway Grading (-1,600.00)', 'Front walkway grading removed from scope of work and credited. 
Grade was already lowered.', NULL, -1600.00, 'pending', '2020-03-31', '2020-03-31 14:10:05'),
  (2938623, 7063556, '0023', 'Deck Waterproofing', 'Waterproofing deck', NULL, 2500.00, 'pending', '2020-03-31', '2020-03-31 17:03:13'),
  (2939404, 7396534, '0001', '30 Podocarpus 5 gallon Podocarpus @ 43.5 each', NULL, NULL, 1305.00, 'pending', '2020-04-01', '2020-04-01 08:09:08'),
  (2939406, 7396534, '0002', '13 LF. Brick mow strip', NULL, NULL, 260.00, 'sold', '2020-04-01', '2020-04-01 08:09:50'),
  (2939410, 7396534, '0003', '25 LF conduit with wire', NULL, NULL, 650.00, 'sold', '2020-04-01', '2020-04-01 08:10:33'),
  (2939418, 7396534, '0004', 'Demo front planter''s - No Charge', 'No charge to client.', NULL, 0, 'sold', '2020-04-01', '2020-04-01 08:11:47'),
  (2939429, 7396534, '0005', 'Add plants for front yard-(10- 5 gal. & 14- 1gal)', NULL, NULL, 736.00, 'sold', '2020-04-01', '2020-04-01 08:14:36'),
  (2939437, 7396534, '0006', 'Owner request 120 sq. Feet of turf and Demo', 'Turf plus additional demo.', NULL, 1150.00, 'sold', '2020-04-01', '2020-04-01 08:17:25'),
  (2939516, 7396534, '0007', 'Turf Footage difference between contract and actua', 'Additional 90 square feet of turf.', NULL, 810.00, 'sold', '2020-04-01', '2020-04-01 08:40:33'),
  (2940484, 7035723, '0004', '(2) Additional Low Voltage Up-Lights', 'Vista LED GR2216 Black
includes wire and instalation', 'Vista', 440.00, 'sold', '2020-04-01', '2020-04-01 13:21:31'),
  (2940691, 7063516, '0001', 'Backfill and Compaction and Job Clean up', NULL, NULL, 3000.00, 'pending', '2020-04-01', '2020-04-01 14:28:32'),
  (2940746, 5472327, '1114', 'Add one additional wall light', NULL, NULL, 195.00, 'pending', '2020-04-01', '2020-04-01 14:46:00'),
  (2940987, 5512086, '0018', 'Fire Damages and replacments', 'see attached proposal and plan', NULL, 19726.00, 'sold', '2020-04-01', '2020-04-01 16:53:15'),
  (2941102, 7063445, '0001', 'Driveway Pavers', 'Adding additional 370 SF X $11.00= $4,070.00', NULL, 4070.00, 'pending', '2020-04-01', '2020-04-01 18:47:24'),
  (2941532, 7240573, '0016', 'Added Demo', 'Remove property line trees and roots . - 3 guys one day plus 1 guy another day plus dump fees . - $2400
Extra Demo and Install on property curb wall.  Wall at 2 feet instead of 16 inches - $900 . 2 guys 3/4 day for demo and extra install plus material
Extra Demo on Patio Return Wall return  down to bedrock (not one foot below) . - $250
Added Trenching and backfill with compaction on side yard for gas line - $500', NULL, 4050.00, 'sold', '2020-04-02', '2020-04-02 07:05:24'),
  (2941567, 7240573, '0017', 'Change Patio to Sand Set Tile', 'Remove concrete pad and Tile overlay for rear patio. 

Credit $9,380



Add sand set large tile.

Includes 5+ inch class II roadbase bed and one inch of screeded angular bedding sand, 

Includes laying tile with spacers.

Includes polymeric joint sand. 

Owner to provide tile    
 
Add $8850', NULL, -530.00, 'sold', '2020-04-02', '2020-04-02 07:14:21'),
  (2944621, 7168264, '0006', 'Stump grinding', NULL, NULL, 475.00, 'sold', '2020-04-03', '2020-04-03 11:25:54'),
  (2944637, 7168264, '0007', 'Remove 2 plum bego,', NULL, NULL, 250.00, 'sold', '2020-04-03', '2020-04-03 11:30:38'),
  (2945307, 4312960, '2128707', 'CC transaction fee (not refunded to us by vender)', NULL, NULL, 279.50, 'pending', '2020-04-03', '2020-04-03 16:59:06'),
  (2945467, 7402782, '0001', 'Additional pavers', '20 additional sqft brick at gate area', NULL, 260.00, 'pending', '2020-04-04', '2020-04-04 10:40:24'),
  (2945468, 7402782, '0002', '30ft additional drains', '30ft additional drains', NULL, 660.00, 'pending', '2020-04-04', '2020-04-04 10:41:30'),
  (2945469, 7402782, '0003', 'Transplant exist plants at entry', 'Move plants along front entry back to aporox locations', NULL, 500.00, 'pending', '2020-04-04', '2020-04-04 10:44:21'),
  (2948092, 6713355, '0019', 'Engineering for Pergola', 'Engineering for Pergola has been completed. Stamped docs in office.', NULL, 2350.00, 'pending', '2020-04-06', '2020-04-06 18:03:55'),
  (2949993, 7396534, '0008', 'Added planting above other change orders', 'Add additional (12) 1 gallon plants and one more 5 gallon.', NULL, 340.00, 'pending', '2020-04-07', '2020-04-07 13:38:42'),
  (2952589, 7396534, '0009', 'Additional Plants above C/Os', NULL, NULL, 340.00, 'pending', '2020-04-08', '2020-04-08 14:37:14'),
  (2952663, 6713355, '0020', 'Plant plus credit', 'Add (39) 5 gallon trailing Lantana
Add (39) 5 gallon myoporum
$3,510 

Per Jorge offer discount on plants.  credit of $375

additional credit for pavers .  $150 

Sub Total $2985

Lights credit. $1,242

Total $1723', NULL, 1723.00, 'sold', '2020-04-08', '2020-04-08 15:08:17'),
  (2957205, 7240573, '0018', 'Extra Trench, Compact, Wall, Pours', '1) Added course for garden and dowel rebar  $950

2) Core holes for front garden bed. $600. (includes core rental and return)

3) Trenching and Backfill and Compacting:  $ 1500 (2 guys - 3/4 day )    Includes the following

6 feet of Trench electrical lines and back fill and compact entire trench.

Mostly Backfill gas line and electrical trench in patio.

4) Extra pour to do steps first vs pouring with storm garden.   One added pumper,  One added delivery fee,  Additional finisher time  $1500', NULL, 4010.00, 'pending', '2020-04-11', '2020-04-11 07:34:02'),
  (2957318, 6957272, '0005', 'Complete Rear yard with lawn', 'install 1364sqft tall fescue / Valley RTF', NULL, 3547.00, 'pending', '2020-04-11', '2020-04-11 12:42:29'),
  (2957370, 7402782, '0004', 'Rear Lawn - Sod', 'Lawn – 370Sqft

1    install 1-zone Rain Bird Pop-up  Irrigation

2.     Apply topsoil or soil amendment and rototill

3.     Install Valley RTF Tall Fescue lawn

4.     Includes 55ft Bend-a-Board edging 

 
Price $2677', NULL, 2677.00, 'pending', '2020-04-11', '2020-04-11 18:45:36'),
  (2957371, 7402782, '0005', 'Rear lawn - Synthetic', '1. install 4" compacted base
2. 55ft bender board
3. install group 1 sythetic lawn - 370sqft
includes sand infill', NULL, 6192.00, 'pending', '2020-04-11', '2020-04-11 18:47:47'),
  (2957372, 7402782, '0006', 'East Lawn- Sod', 'Lawn – 570sqft

	Rake back existing rocks and grade
	Install 1-zone Rain Bird pop-up sprinklers
	Apply topsoil or amend existing and rototill
	Install 90ft bend-A-Board edging
	Install RTF Tall Fescue


Price   $3565', NULL, 3565.00, 'pending', '2020-04-11', '2020-04-11 18:49:24'),
  (2957373, 7402782, '0007', 'South Lawn, -Sod', 'Lawn – 489sqft

	Rake back existing rocks and grade
	Install 1-zone Rain Bird pop-up sprinklers
	Apply topsoil or amend existing and rototill
	Install 60ft bend-A-Board edging
	Install RTF Tall Fescue


Price   $3041', NULL, 3041.00, 'pending', '2020-04-11', '2020-04-11 18:50:42'),
  (2957376, 7402782, '0008', 'Drains, West side', 'Trench and install 3" sdr drain pipe , connect downsputs and install Atrium inlets where necessary, core curb
permits not included', NULL, 3320.00, 'pending', '2020-04-11', '2020-04-11 19:10:01'),
  (2957377, 7402782, '0009', 'Grading - west side', 'rake back rocks, and move to other side, 
grade and excavate up to 3 yards soil', NULL, 700.00, 'pending', '2020-04-11', '2020-04-11 19:11:29'),
  (2961453, 7240573, '0019', 'New curb wall for steps/ Post achors', 'Demo footing for curb wall and haul. 

Install 30 linear feet fo curb wall.  Will be roughly 24 inches in height.  Footings plus block courses plus rebar.   $4300

Post anchors for both curb walls on south side of property.   18 total  $380.  No Charge for labor.', NULL, 4680.00, 'sold', '2020-04-14', '2020-04-14 12:59:16'),
  (2961486, 7402917, '0001', 'Outdoor Kitchen,  Concrete, Demo', 'Demo out concrete pad and haul $380

Demo out concrete and pour newer section of pad in front of steps.  5 ft deep by 10 feet wide.  $600

Outdoor kitchen change from contract.   Kitchen doubled in size normally additional $9000+ per contract. 

Gave client $4000+ discount - New price $5000.', NULL, 5980.00, 'sold', '2020-04-14', '2020-04-14 13:06:56'),
  (2962872, 7414067, '0001', 'Change order to scope of work', NULL, NULL, 2006.00, 'pending', '2020-04-15', '2020-04-15 07:52:07'),
  (2963986, 7063516, '0002', 'Additional Drainage', 'Brought price down from $25.00 to $15.00 because trenches were open.', NULL, 900.00, 'pending', '2020-04-15', '2020-04-15 13:13:13'),
  (2963997, 7063516, '0003', 'BBQ veneer', '45 SF of Veneer on outdoor kitchen X $21.00= $945.00', NULL, 945.00, 'pending', '2020-04-15', '2020-04-15 13:15:40'),
  (2964380, 7168264, '0008', 'Permit Costs - completed', 'LADBS permit costs $158.05
Permit Technician costs, drawing, permit drawing, paperwork submittal @ $120hr x 6hrs = $720

Total $878.05', 'original permit allowance was $1600

Actual $878.05', 878.05, 'pending', '2020-04-15', '2020-04-15 15:05:16'),
  (2964425, 5145518, '0007', 'Permit Allowance #3 - completed', 'Drawing and working with Engineer
and additional time spent at LADBS over previous permit allowance 
@$120hr 8hrs = $960', NULL, 960.00, 'pending', '2020-04-15', '2020-04-15 15:25:43'),
  (2972086, 7168264, '0009', 'Planting Plan', 'Original Contract budget $4507
additional plants per this design $5303
total additional costs $796

After Delivery ,Plants are subject to 20% restocking fee + $65hr to return and exchange for a different variety 
plants below wholesale quality will be exchanged at no charge', NULL, 796.00, 'sold', '2020-04-20', '2020-04-20 23:39:51'),
  (2973384, 7063516, '0004', 'Pavers Credit 135 SF', 'Not installing 135 Square feet in the coverd patio area 135 SF X $12.00= $1,620.00', NULL, -1620.00, 'pending', '2020-04-21', '2020-04-21 12:13:59'),
  (2973549, 7168264, '0010', 'Front  - Garage planter Area Decking', 'frame and install 200Sqft m babbo0 composite decking between front dor and garage area,', NULL, 7200.00, 'pending', '2020-04-21', '2020-04-21 12:46:31'),
  (2973586, 7168264, '0011', 'Bottom Gate and Fence (updated)', 'Install 10ft bamboo composite horizontal fence with 2x2 powder coated steel posts  $2200
Install 13''6"  double swing composite gate with metal frame $3567
Material Delivery charge $249 for materials ordered after (4/21) 

Total $6016', NULL, 6016.00, 'sold', '2020-04-21', '2020-04-21 12:53:47'),
  (2973751, 7168264, '0012', 'Pool Area Synthetic Lawn', 'at pool area, excavate and grade as necessary
install 4" compacted base
install 733Sqft group 1 synthetic lawn', NULL, 7330.00, 'pending', '2020-04-21', '2020-04-21 13:36:34'),
  (2974210, 7168264, '0013', 'Fence Change Order - Credit', 'Change all Fencing and deck skirt from IPE Bamboo Composite                                                 -$506
lower block wall at bench from 4ft to 3ft and add 2ft Composite horizontal fencing above             +$1288
Curb wall along fencing add 8" a total height to of 1.5ft                                                                  +$1120
lower fencing from 7ft to 5.5ft                                                                                                           -$2400
Gate will be (2) swing gates a total of 6ft, per discussion with George                                               n/c
                                                                                                                                    Fence Credit $498', NULL, -498.00, 'sold', '2020-04-21', '2020-04-21 16:50:15'),
  (2974258, 7063516, '0005', 'Adding bench seat, taking out some pavers', '65 Linear feet of Belgard 2 courses of block, 1 cap 15" high X $86.00=  $5,590.00
Takiing out 65 square feet of pavers to replace with the bench seat next to the planter in the back  65 SF X $12.00=-- $780.00
Final Cost:  $4,810.00
Same as front walls 
Belgard Bel air Toscana block 2 courses and cap', NULL, 4810.00, 'pending', '2020-04-21', '2020-04-21 17:40:14'),
  (2974440, 7240573, '0020', 'Additional Work', '1) Add another course left side of stairs and additional 4 anchors- $475 
2) Added drains in patio area 21 linear feet. - $460
3) Back fill of walls and compaction in 6 inches fill lifts per inspector request for patio walls and north retaining wall.   Method brings soils only down to a 2 - 3 inch compacted layer resulting in 18-20 separate lifts for patio wall and 32- 40 lifts for north retaining (all not in contract)  Took 2 guys 6 entire days to backfill and compact.  $6000
4) Reroute french drain behind north wall  $240
5) Repair french drains interrupted by gas line for north side of property 1 guy almost full day $400
6) 24 linear feet of drainage north side from large wall to front of property.  $520', NULL, 8095.00, 'sold', '2020-04-21', '2020-04-21 21:25:19'),
  (2975440, 5512086, '0019', 'Rewire front valves to timer', NULL, NULL, 600.00, 'pending', '2020-04-22', '2020-04-22 10:06:43'),
  (2976771, 7063445, '0002', 'one tree credit', 'Taking out the #10 in the back Melaleuca gunguenervia 15 gallon', NULL, -175.00, 'pending', '2020-04-22', '2020-04-22 17:51:08'),
  (2977424, 6713355, '0021', 'Added planting etc.', 'Add benderboard in lawn area for tree.
Additional well light
Plant (3) 15 gallon owner provided trees.
Remove one tree
Install (6) 5 gallon Indian Hawthorne
Install (5) 5 gallon Bouganvillia white
Install (1) 5 gallon Bouganvilllia red
Run additional lighting wire to tree circle 
Install 1 /2 yard white gravel. 

Credit one 5 gallon.', NULL, 1275.00, 'sold', '2020-04-23', '2020-04-23 07:57:32'),
  (2978642, 5472327, '1115', 'Add one additional wall light', NULL, NULL, 195.00, 'pending', '2020-04-23', '2020-04-23 13:35:48'),
  (2978671, 7402917, '0002', 'Main line water', NULL, NULL, 700.00, 'sold', '2020-04-23', '2020-04-23 13:41:46'),
  (2983567, 7168264, '0014', 'Play ground area see (descriptions)', 'Price difference on turf $228.75

Add play ground pads $343.

Additional labor $260.', NULL, 831.75, 'sold', '2020-04-27', '2020-04-27 14:21:47'),
  (2984832, 7402917, '0003', 'Ball Valve and Cover', NULL, NULL, 90.00, 'sold', '2020-04-28', '2020-04-28 08:59:08'),
  (2985334, 7577238, '0001', 'Removed and added items', 'Remove Expand Mulch bed   - 2075
Remove Bubbling Vase.         - 1800
Remove Pebble for Vase        - 250

Additional Turf for New Layout.   +780', NULL, -3345.00, 'pending', '2020-04-28', '2020-04-28 11:18:50'),
  (2988935, 7168264, '0015', '15 gallon Eureka Lemon Tree', 'install 15 gallon lemon tree ,
owner to show crew where to plant', NULL, 200.00, 'sold', '2020-04-29', '2020-04-29 17:42:30'),
  (2989222, 7402945, '0001', 'additional  putting  green hole', NULL, NULL, 93.00, 'sold', '2020-04-30', '2020-04-30 02:04:01'),
  (2993003, 7577238, '0002', 'Extra shade bar and paint', NULL, NULL, 1050.00, 'pending', '2020-05-01', '2020-05-01 11:47:31'),
  (2993005, 7577238, '0003', 'Paint all existing pergola', NULL, NULL, 1550.00, 'pending', '2020-05-01', '2020-05-01 11:48:27'),
  (2993569, 7240573, '0021', 'Demo back fence and despose', NULL, NULL, 1300.00, 'sold', '2020-05-01', '2020-05-01 16:18:13'),
  (2995882, 7402917, '0004', 'Move walk way forms', NULL, NULL, 195.00, 'sold', '2020-05-04', '2020-05-04 13:25:44'),
  (2996116, 7577238, '0004', 'Run 3 wires to shower room 70 Lf.', 'Approved via text', NULL, 535.00, 'pending', '2020-05-04', '2020-05-04 14:37:18'),
  (2996447, 7063516, '0006', 'Wall install 6 foot high slump stone', 'To rebuild the wall that was taken down for the pool install.  8 linear feet long, 8 LF of footing X $58.00 , 8 courses high X $13.00=$162.00 X 8 linear feet= $1,296.00
Slump Stone to match adjacent existing wall.', NULL, 1296.00, 'pending', '2020-05-04', '2020-05-04 16:48:50'),
  (2996458, 7063516, '0007', 'Taking out Jar Founatin', 'takingout jar founatin', NULL, -2050.00, 'pending', '2020-05-04', '2020-05-04 16:53:51'),
  (2997228, 7063516, '0008', 'Taking out Irrigation', 'Rough irrigation was already installed, final irrigation not installed taking out of contrazct, however, she has an option to add for $1,500.00 to finish emiters, lines and connect to controller', NULL, -3700.00, 'pending', '2020-05-05', '2020-05-05 07:56:19'),
  (2997242, 7063516, '0009', 'Reducing Lights', 'Reducing the lights to 5 pathlights X $225.00= $1,125 + Transformer $400.00= $1,525.00
In contract  $3,775.00 - $1,525.00= $2,250.00', NULL, -2250.00, 'pending', '2020-05-05', '2020-05-05 08:01:19'),
  (2997563, 7567551, '0001', 'Added hedge side yard 41 LF.', NULL, NULL, 0, 'pending', '2020-05-05', '2020-05-05 09:20:52'),
  (3000197, 6845509, '0002', 'Irrigation main line', 'approved by text to george

19lf 1" main line', NULL, 760.00, 'pending', '2020-05-06', '2020-05-06 09:06:09'),
  (3000233, 7185170, '0006', 'landscape changes - Requested', '1- reset 3- 24"x24" pavers and add 3 more (see images 
2- cut and remove about 6 inches of sod and and dymondea (see images) 
3- remove about 6 inches of of mulch and add dymondea (see images) 
4- remove 7 plants and replace with calandrinia(see images)', NULL, 894.00, 'pending', '2020-05-06', '2020-05-06 09:13:30'),
  (3001169, 7567551, '0002', '19 Lf of water proofing', NULL, NULL, 438.00, 'pending', '2020-05-06', '2020-05-06 13:06:14'),
  (3002405, 7577238, '0005', 'Paint Landscape ties', NULL, NULL, 678.00, 'sold', '2020-05-07', '2020-05-07 06:40:32'),
  (3003139, 7168264, '0016', 'Revised Plant Size', 'Plant name
			Size 
			QTY
			New price 
			Previously quoted size and price 
		
		
			AGAVE BLUE GLOW
			5
			9
			$60/ea
			 Size: 4” - $8.00
		
		
			ECHEVERIA AFTERGLOW
			5
			10
			$60/ea
			 Size: 4” - $8.00
		
		
			 
			New Total:
			$ 1,140.00
			Prev. Total:
			$ 152.00
			Total change order:
			New-Prev.= $ 988', 'Customer does not want any 4" size plants.', 988.00, 'pending', '2020-05-07', '2020-05-07 10:05:49'),
  (3003569, 7577238, '0006', 'Siberian Tundra Tile', '120sf of Siberian Tundra - L70112241U - (size 12"x24")', NULL, 1400.00, 'pending', '2020-05-07', '2020-05-07 12:00:25'),
  (3004023, 5472327, '1116', 'Add 1 more wall light', '1 additional wall light Vista 4260 LED / Bronze $195.00
Labor to take out one wall cap, run addition wiring, install new cap (customer provided), electrical hook up. $477.00

672.00', NULL, 0, 'pending', '2020-05-07', '2020-05-07 13:44:32'),
  (3004416, 7063516, '0010', 'Installation of Pavers in the back instead of Turf', '$1.00 more for 312 Square Feet', NULL, 312.00, 'pending', '2020-05-07', '2020-05-07 16:32:03'),
  (3004472, 7063516, '0011', 'Rough Irrigation Only', NULL, NULL, 2200.00, 'pending', '2020-05-07', '2020-05-07 17:06:34'),
  (3004474, 7063516, '0012', 'Less turf in front', '65 square feet less', NULL, -650.00, 'pending', '2020-05-07', '2020-05-07 17:07:55'),
  (3004475, 7063516, '0013', 'Less bender board than contract', '99 linear feet in contract final measurement was 56 LF= 43 LF Ft less X $8.00', NULL, -344.00, 'pending', '2020-05-07', '2020-05-07 17:11:14'),
  (3004481, 7063516, '0014', '66 LF of additional pavers', '66 more LF of drainage X $15.00', NULL, 990.00, 'pending', '2020-05-07', '2020-05-07 17:16:45'),
  (3004645, 7063516, '0015', 'Gazebo install.', 'Install a gazebo kit from Costco', NULL, 1200.00, 'pending', '2020-05-07', '2020-05-07 19:53:30'),
  (3006417, 7402945, '0002', '2x8 pressure treated along fence', NULL, NULL, 127.00, 'sold', '2020-05-08', '2020-05-08 13:45:57'),
  (3006467, 7402945, '0003', 'Credit', 'Credit for valve and 1 station timer', NULL, -278.00, 'sold', '2020-05-08', '2020-05-08 14:04:29'),
  (3006785, 7240573, '0022', 'Raise grade for back lawn (CREDIT)', '13 yards of dirt @25/yard -325
credit of labor -2000', NULL, -2325.00, 'pending', '2020-05-08', '2020-05-08 19:38:55'),
  (3008367, 7237038, '0001', '7% Courtesy', NULL, NULL, -8310.00, 'pending', '2020-05-11', '2020-05-11 09:40:39'),
  (3009405, 7402945, '0004', 'Additional pressure treated along fence', 'Complete additional 2x8 pressure treated wood to rear property line', NULL, 85.17, 'pending', '2020-05-11', '2020-05-11 14:09:22'),
  (3009411, 7402945, '0005', 'pet odor infill upgrade', 'Upgrade from standard infill to pet deodorizer type infill for pets', NULL, 84.00, 'sold', '2020-05-11', '2020-05-11 14:11:06'),
  (3010518, 6713355, '0022', 'Add More Planting, Items', 'Add:

(6) 5 gallon sea lavender
(2) 5 gallon Hydrangea Blue
(8) 5 gallon Full sun Hydrangea Vine

(1) Raspberry -  Replacement No charge.  Get size from Daniel. 

(1) Hawthorne - Swap out for proper one No charge. Get size from Daniel.

(1) Spot Light - Hillside

(1) 8 ft lodgepols for Nectarine

(1) 4 ft Timber Installation - No Charge', NULL, 990.00, 'sold', '2020-05-12', '2020-05-12 06:53:56'),
  (3012635, 7240573, '0023', 'Drainage for pool deck', '180 ln feet of sdr 35 drain.', NULL, 3960.00, 'sold', '2020-05-12', '2020-05-12 16:37:35'),
  (3012637, 7240573, '0024', 'Additional steps on landing', '16 LF. On landing plus 9 LF. On stairway', NULL, 1250.00, 'sold', '2020-05-12', '2020-05-12 16:39:41'),
  (3012640, 7240573, '0025', 'Raise existing curb for fencing', 'Forming add rebar pour concrete 9 feet in length 8 inches high and 6 inches wide', NULL, 490.00, 'sold', '2020-05-12', '2020-05-12 16:42:31'),
  (3014155, 7484154, '0001', 'Main Line Repair', NULL, NULL, 260.00, 'pending', '2020-05-13', '2020-05-13 10:53:03'),
  (3016671, 7402917, '0005', 'Upgrades on Pergola', 'Wood has to be upgraded per city requirement.

Adding full 4x4 trellis on top.', 'contract', 5335.00, 'sold', '2020-05-14', '2020-05-14 09:40:31'),
  (3016677, 7402917, '0006', 'Remove planting from contract', 'Remove planting from contract.', NULL, -3950.00, 'sold', '2020-05-14', '2020-05-14 09:43:29'),
  (3019267, 7267941, '0001', 'Design', NULL, NULL, 375.00, 'pending', '2020-05-15', '2020-05-15 09:04:22'),
  (3019849, 7402917, '0007', 'Remove Rock from contract (possible revisit)', NULL, NULL, -1600.00, 'sold', '2020-05-15', '2020-05-15 11:48:58'),
  (3019851, 7402917, '0008', 'Credit Irrigation/Sleeves TBD', NULL, NULL, 0, 'pending', '2020-05-15', '2020-05-15 11:49:20'),
  (3020493, 7577238, '0007', 'Credit paint', NULL, NULL, -600.00, 'pending', '2020-05-15', '2020-05-15 16:19:07'),
  (3020495, 7577238, '0008', 'Pump credit', NULL, NULL, -50.00, 'pending', '2020-05-15', '2020-05-15 16:20:29'),
  (3020672, 2248927, '2112782', 'Extra Planting', '(3) 15 gallon
(1) 5 gallon', NULL, 490.00, 'pending', '2020-05-16', '2020-05-16 09:43:05'),
  (3022158, 7577238, '0009', 'Additional Tile Required', 'Needed to order more tile for front entry.', NULL, 250.00, 'pending', '2020-05-18', '2020-05-18 09:51:06'),
  (3022287, 7687226, '0001', 'Appliances', 'Lion Premium Grill Appliances:

L75000 grill $1,495
Double door $294
Refrigerator $299
Refrigerator Frame $69
***Total + Tax: $2,324.17
Curbside delivery $220
Total + Tax + Delivery: $2544.17', NULL, 2544.17, 'pending', '2020-05-18', '2020-05-18 10:32:49'),
  (3023729, 7577238, '0010', 'Additional Electrical', 'For additional electrical for switch for BBQ light.', NULL, 500.00, 'pending', '2020-05-18', '2020-05-18 18:26:53'),
  (3027709, 7237038, '0002', 'Additional excavation to locate Water Main', '1 crew man a full day, please see Jorge for details', NULL, 500.00, 'pending', '2020-05-20', '2020-05-20 08:57:32'),
  (3027732, 7237038, '0003', 'Spa Surround in masonry, may need modification', 'However, here is the cost that I anticipate:

	Excavate 24 inches  down and 10 linear feet X 10 linear feet= 200 cubic feet
	Pour 4-5” depth concrete slab with rebar that is specified by model #
	Trench for 10 LF X 4 sides of CMU block wall, deeper that slab, using #3 rebar
	Pour wall footings
	Set 4 courses, and form for the concrete cap 4”
	Stucco façade and seal concrete cap when it is properly cured.
	Pour the slab 100 SF X $12.00= $1,200.00
	Build 2 steps 4 feet wide X 20” deep  with concrete treads 8 linear feet X $50.00=$400.00 ( Not charging for the steps)
	40 Linear Feet X $140.00= $5,600.00 + slab $1,200.00

Cost:      $6,800.00', NULL, 6800.00, 'pending', '2020-05-20', '2020-05-20 09:02:35'),
  (3030678, 7687226, '0002', '(27) 15g Podocarpus', 'Replacing (5) 5-Gallon Buganvilleas with (5) 15-Gallon Podocarpus Gracilior
5-gallons: $43.50
15-gallons: $140

On contract: 5 x $43.50 = $217.50
5 15-gallons: 5 x $140 = $700

$875 - $217.50 = $482.50

Add 22 more 15 gallon podacarpus.    $2980
Remove (3) 1 gallons', NULL, 3462.50, 'pending', '2020-05-21', '2020-05-21 08:47:43'),
  (3030683, 7687226, '0003', 'Kitchen Size Reduction an Valve Credits', 'Kitchen on contract 11''   
Reduces to 9''8"                               Credit of $750

Other contractor installed valves     Credit of $400', NULL, -1150.00, 'pending', '2020-05-21', '2020-05-21 08:48:36'),
  (3032032, 7240573, '0026', 'Additional Curbing', 'Add 90 linear feet of additional concrete curbing.

Form,
Rebar,
Pour,
Top Cast Finish

Curb to be 6 inches wide and 14 inches tall.', NULL, 6300.00, 'sold', '2020-05-21', '2020-05-21 14:48:18'),
  (3033102, 7666319, '0001', 'Additional Hill Clearing.  Tree Trimming', 'Crew to remove additional square footage for property.  Clean sides not in contract. 

Add additional 200% square footage of brush removal outside contracted sections. 

Trim trees.

Additional Sections are farther out and harder access.  

Treat all additional areas with weed killer.  

Need all next week to remove.', NULL, 8000.00, 'sold', '2020-05-22', '2020-05-22 08:14:44'),
  (3034169, 7695482, '0001', '7% May Covid-19 Discount', NULL, NULL, -3232.00, 'pending', '2020-05-22', '2020-05-22 14:27:46'),
  (3034474, 7267941, '0002', 'Difference between contract and addendum', 'Difference in price from contract and changes in newest addendum', NULL, 2934.00, 'pending', '2020-05-23', '2020-05-23 10:25:03'),
  (3037007, 7267941, '0003', 'Taking out Gopher Mesh', 'Takin out 600 SFof gpoher mesh', NULL, -750.00, 'pending', '2020-05-26', '2020-05-26 10:44:22'),
  (3037095, 2248927, '2112783', 'Additional Mulch', '2-1/2 yards of Cedar shredded mulch 
5-1/2 yards of Gorilla hair', NULL, 1000.00, 'sold', '2020-05-26', '2020-05-26 11:05:31'),
  (3043736, 6845509, '0003', 'Credit 1 Zone', NULL, NULL, -850.00, 'pending', '2020-05-28', '2020-05-28 14:10:55'),
  (3043975, 7728345, '0001', 'Adding cot of Boulders for border', '2 baskets of Santa Barbara Light at 3,000 pounds each, $550.00 each', NULL, 1100.00, 'pending', '2020-05-28', '2020-05-28 15:20:58'),
  (3045326, 7237038, '0004', 'Waterproofing behind 4'' average wall 14 feet', 'This is for excvation of soils behind 4'' average wall, 14 linear feet long
Waterproofing with 2 coats Henry''s Tar,
Installing french drain with sleeve and backfilling with gravel
Connecting to new drain line under pavers.', NULL, 4750.00, 'pending', '2020-05-29', '2020-05-29 09:10:12'),
  (3045831, 7728345, '0002', 'Mow strip 48 LF in rock', NULL, NULL, 576.00, 'pending', '2020-05-29', '2020-05-29 11:28:27'),
  (3048165, 7748778, '0001', 'REMOVE Demo outdoor kitchen', 'not removing a tree', NULL, -1600.00, 'pending', '2020-06-01', '2020-06-01 09:18:42'),
  (3048697, 7695482, '0002', 'Electrical Changes', 'Changing the 220 wiring to sleeve only credit  $390.00, 30 LF X $13.00
Adding in 3 outlets  3 X $80.00= $240.00
110 wiring 3 locations:
37 Linear Feet on the side of house
22 Linear Feet in the back yard
4 Linear Feet in front
63 total Linear Feet X $21.00= $1,323.00  
Total $1,563.00 - $390.00 Credit for not including wiring= $1,173.00', NULL, 1173.00, 'pending', '2020-06-01', '2020-06-01 11:23:56'),
  (3051639, 2816210, '0001', 'test', NULL, NULL, 345.00, 'pending', '2020-06-02', '2020-06-02 11:16:59'),
  (3054058, 2816210, '0002', 'Test 2', NULL, NULL, 1.00, 'pending', '2020-06-03', '2020-06-03 08:58:12'),
  (3054226, 7240573, '0027', 'Additional Items as of 6/2 (without pool items)', 'Front Yard
- Wall : dug additional 3ft beyond contractor for footing for planter wall - 3 guys one day plus dump fees
$1,700


Side Yard/Pool Area
- 3 man x 4 hours extra conduit low voltage  $750
- 3 man x 5 hours raise planter (additional)  $950


Back Yard
- 4 man whole day install steel posts for fencing  $2,000', NULL, 5400.00, 'sold', '2020-06-03', '2020-06-03 09:44:29'),
  (3055962, 7240573, '0028', 'CO adjustment 6/3 (pool items)', '- (10) 4" pour in drain inlets     $300
- (3) 9" pour in for skimmers    $350
- (2) 6" pour in for cleanouts    $280', NULL, 930.00, 'sold', '2020-06-03', '2020-06-03 18:32:55'),
  (3056044, 7748778, '0002', 'French Drainage', '52 linear feet at $25.00 a Linear foot, we are building the wall and most of it will be open trench for installation', NULL, 1300.00, 'pending', '2020-06-03', '2020-06-03 19:45:57'),
  (3056045, 7748778, '0003', 'Additional Pavers 202 sf', '202 Squre Feet X $11.00 all bobcat accessable or over lay with limited demo', NULL, 2222.00, 'pending', '2020-06-03', '2020-06-03 19:48:10'),
  (3056047, 7748778, '0004', 'Taking out tree out of demo', 'Taking out the removal on 1 tree', NULL, -600.00, 'pending', '2020-06-03', '2020-06-03 19:51:20'),
  (3056058, 7237038, '0005', 'Additional French Drain', 'Behind Veg wall, we are water proofing and it''s open already', NULL, 574.00, 'pending', '2020-06-03', '2020-06-03 20:08:21'),
  (3056071, 7695482, '0003', 'Reducing electrical by 15 linear feet', '15 lf X $21.00', NULL, -262.00, 'pending', '2020-06-03', '2020-06-03 20:24:50'),
  (3056075, 7695482, '0004', 'Drainage 55 LF + 3 pop ups', 'Drainage $21.00 LF X 55= $1,155.00
3 pop ups X $25.00= $75.00
$1,230.00', NULL, 1220.00, 'pending', '2020-06-03', '2020-06-03 20:27:22'),
  (3056197, 7685978, '0001', 'Drains and other changes', 'change concrete from 260sqft to 75sqft concrete   SUBTRACT -$1000

Remove (5) 5 gallon plants from planting @ $45ea =SUBTRACT -$200

Add 40ft Drains and core curb ADD + $1100

Increase Decomposed granite from 425sqft to 665sqft  ADD +$1200', NULL, 1100.00, 'pending', '2020-06-04', '2020-06-04 02:55:13'),
  (3058666, 7240573, '0029', 'REMOVE Raise existing curb for fencing', NULL, NULL, -490.00, 'pending', '2020-06-04', '2020-06-04 17:02:02'),
  (3058674, 7666319, '0002', 'Main Line Work Needed (Reduced by 50%)', 'Install Febco Backflow system. 
Rework Main copper line.
Install Main Line Shutoff Valve
Install 580 linear feet of Main Water Line to supply Valve Stations  (Valves forward covered in contract)

Originally $9800', NULL, 4900.00, 'sold', '2020-06-04', '2020-06-04 17:06:53'),
  (3061480, 7240573, '0030', 'Frame for gate''s (powder coated) black', NULL, NULL, 3850.00, 'sold', '2020-06-07', '2020-06-07 10:28:51'),
  (3062772, 7682815, '0001', '3 new irrigation zones', 'Replace 3 zones. Valves . Reconnect as needed. Includes sleeves across driveway', NULL, 2500.00, 'pending', '2020-06-08', '2020-06-08 09:07:24'),
  (3064009, 4069521, '1844185', 'Daniel spray', NULL, NULL, 60.00, 'pending', '2020-06-08', '2020-06-08 13:57:46'),
  (3066419, 7063445, '0003', 'planter pots, irrigation for pots, lights', '2 pots $311.38
String lights for the Trellis $54,75
Cost of irrigating the posts $250.00
Total $616.13', NULL, 616.13, 'pending', '2020-06-09', '2020-06-09 11:48:47'),
  (3066986, 7748936, '0001', 'Tile Upgrade', 'from group 1 tile t group 10 
MARF235 2X2  with white grout', NULL, 840.00, 'pending', '2020-06-09', '2020-06-09 14:08:25'),
  (3067467, 7743794, '0001', 'Low Voltage Dimming Bluetooth Transformer', 'Upgrade standard 300 watt transformer to Bluetooth dimmable transformer 
included installation and setup', 'Vista CTS300T', 780.00, 'pending', '2020-06-09', '2020-06-09 17:13:54'),
  (3067473, 7743794, '0002', 'Permit Allowance', 'Permits for Gas line at the rate of $120hr plus city permit fees
not to exceed $1000 without further approval', NULL, 1000.00, 'sold', '2020-06-09', '2020-06-09 17:16:16'),
  (3067506, 7743794, '0003', 'Vista LED Low Voltage lighting Package w/Bluetoot', '(4) well lights  black @ $220ea x4= $880                              pn 5262
(6) up-lights composite  @ $220ea x6=$1320                       pn 5280
(1) Path lights     Black    @ $220ea                                     pn 5202
Transformer "Bluetooth 300 watt"     $845                            pn VPRO2

Total $3265', NULL, 3265.00, 'pending', '2020-06-09', '2020-06-09 17:43:05'),
  (3073723, 7748936, '0002', 'Tile selection MARF235', 'Owner accepts Marf235 tile as installedthis is a no charge upgradeApprox 50ft of coping was found "hollow" potentially loose. Owner declines repair of these existing copingsPicture build will grout one piece of coping at no charge', NULL, 0, 'sold', '2020-06-11', '2020-06-11 19:32:56'),
  (3075348, 7240573, '0031', 'Firepit', 'no gas valve, fire ring or lava rock provided', NULL, 3000.00, 'sold', '2020-06-12', '2020-06-12 12:11:10'),
  (3075350, 7240573, '0032', 'Polishing firepit 2 days', NULL, NULL, 900.00, 'sold', '2020-06-12', '2020-06-12 12:11:44'),
  (3075378, 7240573, '0033', 'Garden Walls for North Sideyard (CO)', 'garden wall for northside, taller than contract, change from block to poured in place with inspections - 3900
waterproofing - 600
french drains - 400', NULL, 4900.00, 'sold', '2020-06-12', '2020-06-12 12:18:51'),
  (3078052, 7799379, '0001', 'Initial changes to Contract', '1) Raise Driveway Wall to take out grades being to high behind wall.
   a) Add 1 course 9''
   b) Add 2 courses 15''
   c) Add 1 course of 4 inch block  60''
   d) Add additional veneer to project.
Cost $3100

2) Bay Window removal. Framing and Drywall Install (no mudding)
Cost $1700

3) Fencing for Dog Run
Remove block Wall 
Install new steel posts.  40 linear feet of fencing. Additional work on posts to be off set steel. 
Install Mangaris on Interior - Neighbor unfinished.
Cost $4435

4) Cantilever front entry steps  - NO Charge

5) Add reinforcement for roof work change roof to thicker profile  - NO Charge

6) Add 31 linear feet of Wall for A/C enclosure and planters6x8x16 CMU.   Includes trenching, steel work and footings.  Stucco coat interior wall profile. 
(Need to discuss if the fencing and gates is desired for trash enclosure area still which will affect how wall is built)
Cost $3200

7) Stucco repair work for home  Lathe, plaster and stucco.  Paint ready or desired color coat.
Cost $5950', NULL, 18385.00, 'sold', '2020-06-15', '2020-06-15 10:39:53'),
  (3079585, 7799379, '0002', 'Poured in Place Wall Cap', '8) Poured in place Wall Cap.  Remove some portion of existing stone capping.  Remove top layer of veneer stone to allow for form boards. Install forms and pour cap.  Remove Forms and finish.  Color TBD.  Straight edge.  321 Linear footage included.   Does not include footage for under fencing as requested.', NULL, 18860.00, 'sold', '2020-06-15', '2020-06-15 18:28:07'),
  (3080715, 7743794, '0004', 'Low Voltage Lighting (WAC Lighting)  - BRASS', '(4) Well lights  - WAC   PN  5031 - 27BBR 9-15 VAC  - Bronze on Brass -  set in pavers - color changing @ $334ea x4= $1336
(6) Up-Lights - WAC     PN  5011 -27BBR 9-15 VAC  - Bronze  on Brass -   Landscape  -  color changing @ $302 ea x6 = $1812
Vista Low Voltage Transformer  $650

Total $3798


with the WAC lighting you can control each light and turn them ALL off directly and adjust colors, no need to upgraded bluetooth  transformer', NULL, 3798.00, 'sold', '2020-06-16', '2020-06-16 08:54:26'),
  (3082045, 7682815, '0002', 'Gate Upgrade - Round Top', 'Upgrade (2)  Gates from 4x5ft square steel frame to 4x5ft with with round top

ADD $1650', NULL, 1620.00, 'pending', '2020-06-16', '2020-06-16 13:38:56'),
  (3082405, 7743794, '0005', 'Gravel "Front Yard" 3/4" Crushed', '424sqft group 1 3/4" crush gravel 3" thick
installed $1423

3/4 crush Palm springs Gold or landscape rock 1"', NULL, 1423.00, 'sold', '2020-06-16', '2020-06-16 15:12:27'),
  (3087488, 7799379, '0003', 'Gas line - east side (CREDIT)', NULL, NULL, -950.00, 'sold', '2020-06-18', '2020-06-18 10:50:22'),
  (3088836, 7799379, '0004', 'Additional stucco work', 'Does not include demo', NULL, 2510.00, 'sold', '2020-06-18', '2020-06-18 16:18:43'),
  (3088934, 7799379, '0005', 'Demo for additional stucco', NULL, NULL, 700.00, 'sold', '2020-06-18', '2020-06-18 17:20:58'),
  (3089627, 7666319, '0004', 'Credit for Corner Wall and Concrete', 'Credit for removing this portion of job from project.', NULL, -12800.00, 'sold', '2020-06-19', '2020-06-19 07:09:28'),
  (3092153, 7685954, '0001', 'Dog Area Lawn', '1. remove 2 stumps and cleanup all rear are in preparation for new lawn   $1200
    2. remove 2x8ft concrete step at gate/tree area                                            
    3. grade all rear area in prep for new lawn
    4. install (2) zones irrigation                                                                           $1700
    5. 65ft 2x4 brown "Cedar tone" pressure treated  as edging                         $475
    6. Amend and rototill soil and finish grade
    7. install 1000sqft valley RTF tall fescue                                                         $3525


                                                                                                                     Total $6900', NULL, 6900.00, 'pending', '2020-06-22', '2020-06-22 00:23:30'),
  (3093347, 7685954, '0002', 'Concrete and stump removal', 'Stump grind 2 stumps
Remove and dispose of concrete by gate', NULL, 425.00, 'sold', '2020-06-22', '2020-06-22 09:50:09'),
  (3093353, 7685954, '0003', 'Additional steps and lights', 'Add 4 steps overlays from 9 to 13 steps
Add 4  step lights', NULL, 1980.00, 'sold', '2020-06-22', '2020-06-22 09:51:57'),
  (3094679, 7743794, '0006', 'Pebble Gravel', '424 sqft 
3'' thick
includes
mexican pebble 3/8-5/8 
prime montana
prime black mix
mexican beach pebble  1/4"-1/2"', NULL, 5023.00, 'pending', '2020-06-22', '2020-06-22 14:36:46'),
  (3094868, 7240573, '0034', 'Ipe Fencing / framing', 'The entire west side of the lot and the south side of the lot from the bottom of the steps until it meets the west (rear) will be fenced in ipe on the side of the posts facing the house with clean cuts that are precisely aligned for visual impact, and both iron gates and frames proving access to the rear yard will be fenced in ipe on both sides. Owner will provide the ipe, penofin oil, penofin cleaner, and screws for the fence, which will be unloaded from the delivery truck and installed by Picture Build. All cuts and holes will be sanded, and the ipe will be cleaned before oiling using Penofin. The Penofin Oil will be brush or rag applied on all four sides, all end and other cuts and holes (unless Owner supplies a wax treatement for the end cuts), and otherwise applied in accordance with the manufacturer’s instructions. All ipe will be protected from the sun and kept off the ground until installation in a manner that allows the wood to breathe..

The wood fence framing will be GCB-, which will be provided by Picture Build and installed as follows:
(1) two 2x2 GCB on each post (one installed on each flange of the post) for attaching the ipe;
(2) a 2x4 horizontal top rail and a 2x4 horizontal bottom rail between each metal post, with another 2x4 installed vertically between the top and bottom rail at the midpoint between posts;
(3) the reverse side of each metal post (the side facing the neighboring properties) will have a 1x6 GCB- covering the metal. All GCB- cuts to be treated (copper brown treatment).', NULL, 18825.00, 'sold', '2020-06-22', '2020-06-22 15:46:34'),
  (3097113, 7240573, '0035', 'Added Front, Waterproof, Backfill, Drains', 'Finish side block curb to match back.  - $350
Raise concrete step wall in front - $2000
Waterpoofing and Backfilling front - $5000 
Added drain line firepit area - $200
Added French Drain front 59 linear feet $1180
Added regular drain freont 37 linear feet $740
Added electrical work for firepit for phone activation $200', NULL, 9670.00, 'sold', '2020-06-23', '2020-06-23 12:14:04'),
  (3097609, 7402917, '0009', 'Move soil from concrete area', NULL, NULL, 135.00, 'pending', '2020-06-23', '2020-06-23 14:16:50'),
  (3097617, 7402917, '0010', 'Form and pour 5 samples pads', NULL, NULL, 380.00, 'pending', '2020-06-23', '2020-06-23 14:18:00'),
  (3097623, 7402917, '0011', 'Demo for form expansion', NULL, NULL, 65.00, 'sold', '2020-06-23', '2020-06-23 14:19:03'),
  (3097772, 7666319, '0005', 'Extend drain pipe', NULL, NULL, 300.00, 'sold', '2020-06-23', '2020-06-23 14:58:52'),
  (3097823, 7168264, '0017', 'Mulch Upgrade', 'Upgrade from shredded mulch to "Gorilla hair"; 
950sqft', NULL, 715.00, 'sold', '2020-06-23', '2020-06-23 15:16:11'),
  (3105921, 7799379, '0006', 'Garage Wall Removal', 'Demo wall and frame out closet opening. $1,900
Break out slab footing
Epoxy and dowel.
New footings.
Block wall to three feet.
Water proof. $3,200', NULL, 5100.00, 'pending', '2020-06-26', '2020-06-26 12:33:50'),
  (3106108, 7666319, '0006', 'Grading Backyard', 'Two Days Bobcat Grading -  $2200
One Man Day,  Trenching Back filling and compaction as a part of grading $480

Extra soils movement, backfilling and grading not covered in grading plan: 

1) Entire Lawn area had to be cut and raised to get better slope. 
2) Remove large soils deposit and spread soils in back to provide better grade.
3) Backfill and Compact open trenches including sewer lines. 
4) Need to still adjust back grade behind pool wall for pathway and planters levels now requested.   

Pricing to be assessed after final determinations.', NULL, 2680.00, 'sold', '2020-06-26', '2020-06-26 13:27:11'),
  (3106342, 7666319, '0007', 'Garden Retain Wall and North Timber Steps and Wall', 'Install 4 foot timber section, near southwest drop off - 3 feet in height. 
Install 7 foot angled and stepped timber section transition from 3 foot wall to long main wall.
Install 87 foot 2 foot high timber section along back
Install 8 foot return timber section near cabana at 3 feet high. 

Install 7 foot  timber section at 3 feet high to retain next to cabana landing exit to back yard.
Install 7 foot timber curb section to form outside gravel landing for cabana exit
Install 9 foot timber angled first step
Install (3) 5 foot timber steps
Install 14 foot timber section at 1 foot height to form step retainer on north side for transition steps to backyard 
Install 12 feet of step retainer on south side of transition steps to backyard. 
 

	Use 8’ x 6” ACQ Pressure Treated Lumber from Topanga Lumber
	Dig footings for steps down 12 inches below grade
	Install geofabric and ¾ crushed gravel bed.
	Install first step beam to grade.  Use 3 foot #4 rebar to secure to ground
	Install second beam above grade to create 6 inch step.
	Secure second step with 3/8” x 10” timber screws
	Total of (65) 4’ foot steps
	Use Timber Screws to secure each course.



Garden Retain Wall and North Timber Steps and Wall
Original approved co 21,900.00
using 8x6


Credit of -1950 using 6x6 timbers

New total is $19,950', NULL, 19950.00, 'pending', '2020-06-26', '2020-06-26 15:35:48'),
  (3108351, 7571586, '0001', 'Montana Gravel For South Side Of House', NULL, 'Install 1.5 inches of Del Rio at the bottom.
Install 1.5 inches of Montana on top. $624 difference from all Del Rio.', 624.00, 'pending', '2020-06-29', '2020-06-29 09:43:15'),
  (3115074, 7743794, '0007', 'Upgrade to Gray Decomposed Granite', 'Upgrade from Tan Decomposed Granite to gray', NULL, 689.00, 'pending', '2020-07-01', '2020-07-01 12:15:37'),
  (3117208, 7748494, '0001', 'Taking out kitchen demo ading drainage', 'Credit of $450.00 kitchen demo, it was already done
Credit of $375.00 in drainage in contract
adding in total of 60 linear feet of drainage at $20.00 $1,200.00
Total  difference $375.00', NULL, 375.00, 'pending', '2020-07-02', '2020-07-02 09:17:40'),
  (3117437, 7240573, '0036', 'Storm Garden Wall Changes from Contract', '- Remove 2 feet of high soils. Haul soils. - $1400
- Demo out area down to 6 to 9 feet beyond new grade to get to bedrock - contract states 4 feet. Additional 22 yards - $2700
- Pour new footing at 18 inches to 3 feet deep   contract states 4 inch pad.  added forming and additional 10 yards of concrete -   $1900
- Form new poured in place walls vs block. Walls are 4 and 5 feet in height vs 3 feet in contract - $900  added material plus $8500 added labor - changed to $6500
- Pour new storm garden wall. Extra material $1700 (minus block credit of $400) $1300 for concrete and pumper.  3 guys additional crew day for pour and strip forms. $1500

Does not include waterproofing or backfilling or additional compactions.', NULL, 16200.00, 'sold', '2020-07-02', '2020-07-02 10:11:37'),
  (3119684, 7695482, '0005', 'Gas line 18lnft', '18lnlft * $35 = 630

Run Gas Line:
Need to disconnect existing gas line 
Total LF to be determined

	Unit price $35 per LF, 

Picture Build is not installing the outdoor kitchen now
New BBQ is not assembled by Picture Build, there will be additional cost if Picture Build is to assist in the hook up.', NULL, 630.00, 'pending', '2020-07-03', '2020-07-03 12:18:18'),
  (3119883, 7695482, '0006', 'Electrical Line Spa CREDIT', NULL, NULL, -390.00, 'pending', '2020-07-03', '2020-07-03 16:29:45'),
  (3119885, 7695482, '0007', 'Drainage Credit', NULL, NULL, -237.08, 'pending', '2020-07-03', '2020-07-03 16:31:00'),
  (3119886, 7695482, '0008', 'Paver SQFT Credit', '122 SQFT', NULL, -1660.92, 'pending', '2020-07-03', '2020-07-03 16:31:57'),
  (3121788, 7748494, '0002', 'outdoor kitchen LF and some extra paver', '7-6-2020 
Added By: Verva Gerse
Paver and Outdoor Kitchen change order and notes: Adding 41 SF of Pavers Outdoor kitchen adding 1. 7 linear feet 2. 1 additional GFI in back of U shape total of 2 GFI inside the kitchen and 2 external, includes addiing the linear feet for the gas line that is necessary for the grills in the extended area. 3. Make sure there is an electrcial conduite from the kitchen to the fire pit for the firepit light and switch at kitchen 4. Watch for the copper pipe by steps, too high for pavers 5. Remember to move sprinklers over 6. the Side of the kitchen closest to the fire pit is 6" lighter and cantilevered

Price at 7 linear feet X $680.00 with gas line included, electrical outlet, and 41 additional feet of pavers.
Total for Change Order: $4,760.00', NULL, 4760.00, 'pending', '2020-07-06', '2020-07-06 11:23:07'),
  (3123000, 7571586, '0002', 'Additional 100 sq. feet of turf', NULL, NULL, 1100.00, 'pending', '2020-07-06', '2020-07-06 17:40:27'),
  (3123723, 7799379, '0007', 'Backfilling, Compaction and Drainage.', 'Remove soils in 204 linear feet of trenches.
Recompact soils in lifts 204 linear feet of trenches.
Install soils in another 135 linear feet of open trenches. Compact in lifts.

Remove 30 linear feet of drain.  Reinstall with proper glued joints. Replace damaged section of pipe.
Trench out triple wall drain line across driveway.  Remove and replace with SDR 35 with. primed and glued joints. 

Dig out soils from rear sidewalk area.  (already removed 5 yards of material from section.  Will have additional soils for to remove for dumping later not covered in this change order)', NULL, 5953.00, 'pending', '2020-07-07', '2020-07-07 07:16:51'),
  (3124173, 7685954, '0004', 'Additional valve and split lawn zone', 'Install new irrigation valve and 15ft of pipe', NULL, 600.00, 'sold', '2020-07-07', '2020-07-07 09:04:12'),
  (3125951, 7168264, '0018', 'Custom Storage Doors', '65inx70 pre-hung swing doors "outside swing"
2-mascinite solid core 1-3/4 in thick
5in jams
4in hinges
oak sill
bottom door sweep
weather stripping
flush bolt
paint by owner', NULL, 3770.00, 'pending', '2020-07-07', '2020-07-07 16:38:30'),
  (3129115, 7571586, '0003', 'Seal concrete with semigloss', NULL, NULL, 1200.00, 'pending', '2020-07-08', '2020-07-08 18:01:04'),
  (3131038, 7484154, '0002', 'Add Gravel to Planters', 'Take newly installed Turf out, Dig about 2" and install "Mexican Mix 1/2-1" Gravel" - $0 (No charge - Warranty issue)
Add same gravel to planters - labor + material (tax and delivery included) - $1,100.00', NULL, 1100.00, 'pending', '2020-07-09', '2020-07-09 11:38:46'),
  (3131902, 7402917, '0012', 'Added veneer', 'Per client request

Additional 50 linear feet of corners @ $10.49 per foot   - $576.95 w/tax
Additional 78 square feet of flat veneer @7.25 per sq foot - $622.11 w/tax

Total', NULL, 1199.06, 'sold', '2020-07-09', '2020-07-09 15:51:27'),
  (3131974, 7240573, '0037', 'Added Gravel and Waterproofing', 'Backfill lower two planters next driveway
Backfill gravel on and behind storm garden
Have to be installed via buckets
10 yards in total. - $3200 5 guys one day plus gravel cost. (if takes less time will credit on other invoice)

Credit 3 yards in original contract (960)

Waterproof large storm garden - $1900 3 guys one day plus material
Waterproof lower planter beds  - $950 3 guys half day plus material', NULL, 5090.00, 'sold', '2020-07-09', '2020-07-09 16:18:18'),
  (3134251, 7870638, '0001', 'Design Credit due', NULL, NULL, -700.00, 'pending', '2020-07-10', '2020-07-10 13:37:06'),
  (3134322, 7748494, '0003', 'Gas and electric lines.', '34 LF X $35.00= $1,190.00

Electrical Line 19 linear feet, in contract we were to use the existing, we needed to add new conduite from the house, priced at $22.00 = $418.00

Water line included

$1,608.00', NULL, 1608.00, 'sold', '2020-07-10', '2020-07-10 13:55:35'),
  (3137170, 7577238, '0012', 'Additional Requested Items', 'Extend Garden Beds and DG path by 7 feet. $1400
Add return wall to side of walkway $275
Fix out of Level Section of Garden Wall - No Charge
Add 2 spot lights to back, Run new circuit from Transformer. $500
Change out 20 1 gallon plants in back. - No Charge
Add 3 bags of lava rock - $90
Paint Extended Garden Beds - $290', NULL, 2555.00, 'pending', '2020-07-13', '2020-07-13 12:37:27'),
  (3145653, 7799379, '0008', 'Water main and added drainage', 'Rework existing drains again for drainage to a/c units and planter beds.

Re run water mains.

2 guys 1 day', NULL, 1000.00, 'sold', '2020-07-16', '2020-07-16 09:41:56'),
  (3151085, 7928625, '0004', 'New 1" main line to rear 55ft', NULL, NULL, 1250.00, 'sold', '2020-07-20', '2020-07-20 08:53:39'),
  (3151109, 7903624, '0001', '(29) 4" Begonia richemendensis', NULL, NULL, 276.00, 'pending', '2020-07-20', '2020-07-20 08:56:31'),
  (3151149, 7903624, '0002', '15 Gallon Raphiolepsis Majestic Beauty', NULL, NULL, 150.00, 'pending', '2020-07-20', '2020-07-20 09:06:17'),
  (3151220, 7928625, '0005', '100ft irrigation control wire. Clock to valves', NULL, NULL, 175.00, 'sold', '2020-07-20', '2020-07-20 09:21:39'),
  (3152303, 7240573, '0038', 'Fence Lnft Addition compromise', 'additional sqft from original bid. compromised on splitting cost. - per jorge', NULL, 1750.00, 'sold', '2020-07-20', '2020-07-20 13:33:18'),
  (3152627, 7484154, '0003', 'Additional gravel', 'Client kept extra material.', NULL, 180.00, 'pending', '2020-07-20', '2020-07-20 15:00:16'),
  (3152660, 7687226, '0004', 'Stucco 2 walls', 'We are to stucco 2 walls on both sides of house 

Wall 1 on bbq side 32''x9'' 
From retaining wall towards front yard

Wall 2 opposite side from retaining wall towards front yard 48''x6''', NULL, 3440.00, 'sold', '2020-07-20', '2020-07-20 15:10:06'),
  (3152774, 7685978, '0002', 'Additional drainage', NULL, NULL, 469.00, 'sold', '2020-07-20', '2020-07-20 15:38:30'),
  (3158101, 7799925, '0001', 'Main line to back yard', NULL, NULL, 790.00, 'sold', '2020-07-22', '2020-07-22 11:26:46'),
  (3163962, 7799925, '0002', 'Extend concrete by 80sqft', NULL, NULL, 500.00, 'sold', '2020-07-24', '2020-07-24 10:55:12'),
  (3164908, 7687226, '0005', 'Lighting per New Plan', 'Includes (2) transformers.  Please ensure enough wattage capacity.', NULL, 5675.00, 'pending', '2020-07-24', '2020-07-24 16:00:58'),
  (3169838, 7931614, '0002', 'Chip footings on 2 post + Credit 1 15gal ficus', NULL, NULL, 150.00, 'pending', '2020-07-28', '2020-07-28 09:48:33'),
  (3169930, 7748778, '0005', 'Half day 2 guy''s trenching for gas line', NULL, NULL, 800.00, 'pending', '2020-07-28', '2020-07-28 10:10:52'),
  (3170824, 7240573, '0039', 'Trenching for electrical 2 men 2 days', NULL, NULL, 2000.00, 'sold', '2020-07-28', '2020-07-28 13:30:36'),
  (3170832, 7748778, '0006', 'Additional water proofing on house', '52 SF x $15.00= $780.00', NULL, 780.00, 'pending', '2020-07-28', '2020-07-28 13:33:48'),
  (3170844, 7748778, '0007', 'Additional waterproofing on adu', '30sf x $15= $450.00 + $250.00 trench and backfill. $700.00', NULL, 700.00, 'pending', '2020-07-28', '2020-07-28 13:36:38'),
  (3170857, 7748778, '0008', '220 electrical from garage to spa.', '37 of x $25.00= $925.00 + $125.00 box. $1,050.00 total', NULL, 1050.00, 'pending', '2020-07-28', '2020-07-28 13:39:14'),
  (3172522, 7748778, '0009', 'Wall work in front.', 'Driveway extension wall: -remove existing wall and up to 2 feet of soils -Haul away     $600.00 -20 linear feet of new footings $80.00, 3 courses or average of 18” high in matching Angelus Block,  $45.00, and waterproofing 2 coats of henry’s tar $20.00=   $145.00 a linear foot X 20 LF= $2,900.00 Total:     $3,500.00   Brick cap on existing wall -remove existing cap, and prep for new cap $10.00 -Thin set new brick cap, soldier’s course -Grout brick as in existing  $15.00 $25.00 for 53 linear feet, 19 on the side, 34 lf in front Total:  $1,325.00  TOTAL:  $4,825.00  Please respond with any change/ your approval. Thank you!     Verva Gerse Picture Build Cell : 818-419-8326 www.picturebuild.com verva@picturebuild.com   ?Virus-free. www.avg.com Okay,   we approve. Please move forward with this. thanks Rick and Jennifer. Show quoted text Thank you will do.  (There will be a few more pavers, however, as agreed, we will not charge more or less than we have actually installed.  We can do a new count at the time of paver installation, and discuss.  It will be approximately 40 additional SF of pavers.)', NULL, 4825.00, 'pending', '2020-07-29', '2020-07-29 08:08:54'),
  (3172726, 7981668, '0001', 'Move 2 Drains up to 10ft', NULL, NULL, 220.00, 'pending', '2020-07-29', '2020-07-29 08:54:25'),
  (3173302, 7799379, '0009', 'Additional framing by garage and roof', NULL, NULL, 2520.00, 'sold', '2020-07-29', '2020-07-29 11:13:23'),
  (3177682, 7839729, '0001', 'Front Yard Work', 'Cleanup/Grading/Demo

	Remove existing plants and save, dipose of un-used plants
	Grade front yard and parkway in prep for new driveway extension and Synthetic Grass

Price $2800

Irrigation


	Re-configure, cap off and convert zone to drip as needed

Price $850

Planting


	Using existing plants arrange in planter areas
	No warranty on transplants

Price $850

Synthetic Grass - 520sqft


	Excavate to 3” depth
	Install approx 30ft bender board edging
	Install 3” compacted base
	Install group 1-synthetic grass

Price $6230

Driveway Extension -100sqft


	Extend driveway up to 2.5ft wide on both sides
	Excavate up to 7” depth
	Install border pavers with concrete
	Group 1 pavers

Price $2680', 'see front yard plan', 13410.00, 'pending', '2020-07-31', '2020-07-31 00:27:26'),
  (3177686, 7928625, '0006', 'Gravel,, Valve,  Drip emitter tubing', 'demo/remove Decomposed granite except side yard to 3" depth and dispose 
install new del/rio gravel or group 1 stone 430sqft
Price $2314

New Garden Valve  $45', NULL, 2359.00, 'pending', '2020-07-31', '2020-07-31 01:17:42'),
  (3181268, 7903624, '0003', '3 Additional Lights', NULL, NULL, 660.00, 'pending', '2020-08-03', '2020-08-03 08:49:48'),
  (3182633, 7928625, '0007', 'Gate and Handle Credit', NULL, NULL, -1510.00, 'pending', '2020-08-03', '2020-08-03 13:40:47'),
  (3183041, 7799379, '0010', 'Custom Outdoor Pet Bathing Unit', 'We would form a concrete pad for floor section. 
	Pour the floor section and finish it.
	Then we build the walls out of CMU.
	We then build the steps of CMU as well
	Then Grout lift all cells of block.
	Then we form a poured in place concrete top with  lots of rebar and backer board an. 4 Inch thick
	Then we form step tops with reinforced rebar. 4 inches thick
	We then pour using the same color we have on the caps for the walls.   
	We finish that and set the cabinet and wash pan/basin. 
	Then we connect the drain line.  
	Then we do a stucco coat  on the exterior side of walls and steps for uniform look. 

See attached drawing and cabinet data.', NULL, 5600.00, 'pending', '2020-08-03', '2020-08-03 15:58:11'),
  (3183053, 7799379, '0011', 'Credit Change Order for CO #1', 'Removing portion of work for change order #1  - wall size increase.', NULL, -3100.00, 'sold', '2020-08-03', '2020-08-03 16:04:52'),
  (3183061, 7799379, '0012', 'Credit Change Order for Client Provided Fencing', 'Client provided some fencing material for contract.  Mitch gave us a credit of  $650 passing this credit on to Fermin.', NULL, -650.00, 'sold', '2020-08-03', '2020-08-03 16:09:33'),
  (3183173, 7240573, '0040', 'Wall work for Driveway', 'Original Contract included 9ft x 30 inch CMU wall and 24 ft x 8 inch block curb wall.  $1530 dollar credit.

Current requirements are:

1) Wall by very back of driveway.  6x8x16 CMU.   5 ln ft x 22 inches and 8 ln feet x 30 inches stucco by other.  Footings to be 12 inches deep by 16 inches wide.  3 guys 1 day.  
$1800

2) Wall by entry stairs 5.5 ft tall to 4 ft tall. 10 feet long.  8x8x16 CMU. Dowel into existing footings.  Grout lift all cells. Waterproof back. 
Backfill .  Non-Engineered compaction. 2 guys 3 days plus material 
$3400

3) Wall by street side to curb.  Will need a 24 inch deep wall.  Flatten out lower section. to wall.  8x8x16 CMU.  Will have 6" exposed curb on driveway side.  24 feet long.  Standard 12x16 footing.  Demo existing wall, form footings, rebar pour, install wall and cap.  Stucco by others.
2 guys 3 days plus material. 
$3400

4) Saw cut existing concrete wall on driveway.  $200. 

5) 1 man day for drainage demo for planter. N/C

$8800 - $3900 credit   = $3900', NULL, 3900.00, 'sold', '2020-08-03', '2020-08-03 17:13:54'),
  (3183177, 7240573, '0041', 'Credit against other change order', 'Electrical demo and other work only took 1 day instead of 2.  Credit 2 man days.  $1000', NULL, -1000.00, 'sold', '2020-08-03', '2020-08-03 17:15:03'),
  (3183204, 7799379, '0013', 'Prep for Fuel Tank', 'Dig out section per plan and haul soils.  $2400.  Additional sand bedding or layering would be additional if required.

Install 62 ln feet of 1 1/2 poly line.  Includes trenching, installing line and 14 gauge tracer wire, sanding line,  backfill in lifts and compact in lifts. 
$1980', NULL, 4380.00, 'sold', '2020-08-03', '2020-08-03 17:30:51'),
  (3185150, 7402917, '0013', 'Install 85 LF. deco seal', 'Demo out existing plastic from joint and despose.

Clean out and prep joints for deco seal.

Add deco seal to joints and apply silica sand.
Clean remaining sand from pool deck', NULL, 1890.00, 'pending', '2020-08-04', '2020-08-04 11:22:16'),
  (3188181, 7916075, '0001', 'Walls, grass, bender board, waterproofing wall', '1.  One additional course of wall block with stucco 46 Linear feet X $20.00= $920.00
2.  5 additional liner feet of wall stucco with concrete cap X $86.00= $430.00
3.  CREDIT grass 47 SF --$165.00
4.  Adding bender board to area of grass and planter 19 LF X $8.00= $152.00
5.  waterproofing was in contract, I made a mistake and forgot to put in addendum
Total= $1,337.00', NULL, 1337.00, 'pending', '2020-08-05', '2020-08-05 11:03:24'),
  (3193752, 7740536, '0001', 'Design Credit due', NULL, NULL, -375.00, 'pending', '2020-08-07', '2020-08-07 09:23:13'),
  (3194559, 7748778, '0010', 'Raised Border 19 LF and 32 LF', 'Using Rustic Wall Block on the 12'' wide  8" high side Set on the side for a border 
19 LF in the backyard, by walkway to EDU X $25.00= $475.00
32 LF on the neighboring side of the driveway X $25.00= $800.00
Total:  $1,275.00

PLEASE ORDER 60 PIECES OF ANGELUS RUSTIC WALL BLOCK IN GREY CHARCOAL', NULL, 1275.00, 'pending', '2020-08-07', '2020-08-07 13:03:26'),
  (3198318, 7743794, '0008', 'Permit Allowance CREDIT', '$1000 allowance

-6 hours
-119.90 permit fee', NULL, -160.10, 'pending', '2020-08-10', '2020-08-10 14:23:49'),
  (3198349, 7799379, '0014', 'Added Wall Work', 'Add CMU to walkway and back of driveway.

Includes doweling into existing walls and adding reinforcement. 

Includes addtional veneering that will be needed.', NULL, 880.00, 'sold', '2020-08-10', '2020-08-10 14:35:12'),
  (3198364, 7799379, '0015', 'Demo siding, fencing stucco, hauling costs.', 'Includes removal of siding section by dog bath and hauling to dump

Includes Demo of previous front fencing and hauling.

Includes last fence items and hauling to dump 

Will require one load to haul fencing, link and siding removal. 

Includes new wiring and paper. 

Includes all stucco work for the siding section', NULL, 1740.00, 'sold', '2020-08-10', '2020-08-10 14:40:10'),
  (3198670, 7763254, '0001', 'Additional planting for fountain area.', '4 kangaroo paw pink Joey 1g', NULL, 88.00, 'pending', '2020-08-10', '2020-08-10 16:53:43'),
  (3200906, 7666319, '0008', 'Add loop steps, path, retain, backfill, regulator', '1) Add new pressure regulator.  $687 contractor cost  and no installation fee.
2) Add 110 4 foot timber steps $22,000. 
3) Add 30 yards of 50/50 back fill - garden ready soils. $2485
4) Add 120 linear feet of gravel walk at bottom plus hillside cut out and retaining wall. $2900
5) Add hillside retainment along two cut back path through hillside  $3400', NULL, 31472.00, 'pending', '2020-08-11', '2020-08-11 12:29:17'),
  (3202058, 7799379, '0016', 'Driveway demo', 'Move road base and bring down soil to appropriate grade so concrete is at 6" instead of 4"', NULL, 6200.00, 'sold', '2020-08-11', '2020-08-11 19:41:53'),
  (3202089, 7240573, '0042', 'Additional 12 LF. wall work', 'First course on existing wall at $20.Per LF. $240
Additional 3 courses at 12LF. $13. Per course 
$468.', NULL, 708.00, 'sold', '2020-08-11', '2020-08-11 20:13:25'),
  (3203818, 7909383, '0001', 'Additional outlet', 'Need one more outlet for inside the kitchen to connect refrigerator and kegerator.', NULL, 180.00, 'pending', '2020-08-12', '2020-08-12 11:43:48'),
  (3204946, 7808502, '0001', 'Cut patio concrete', NULL, 'Cut concrete to make pavers straight', 300.00, 'sold', '2020-08-12', '2020-08-12 16:48:54'),
  (3207968, 7808502, '0002', 'Concrete to cover old footings + Brown coat', 'Add concrete to cover exposed wall footings to both sides of the paver wall.', NULL, 1190.00, 'pending', '2020-08-13', '2020-08-13 15:25:46'),
  (3208149, 7240573, '0043', 'Extra Demo, Drains and Wall work', '$1000 1 day two guys for extra footing demo
$250 1 guy 1/2 day for machinery assist on footing demo
$1800 for heavy machinery demo on walls for retaining wall footing and extra wall demo for driveway expansion.
$800 for 1 guy one day cutting footings and diamond blades

$500 1/2 day for doweling walls and footing
$1000 2 guys epoxy and rebar for footings
$2200 for footing forming,  6 yards of concrete and  delivery and rest.
$1250 for 50 linear of drains from rain planter to street and planters by steps. 


Pricing change to $8450 based upon emails and conversation.', NULL, 8450.00, 'sold', '2020-08-13', '2020-08-13 17:01:55'),
  (3210670, 7916075, '0002', 'additional Bench Wall', 'Additional 4 Linear feet of block with stucco and concrete top X $86.00= $344.00', NULL, 344.00, 'pending', '2020-08-14', '2020-08-14 19:32:47'),
  (3210753, 7916075, '0003', 'Landscape ties, and extra 4 LF of wall', '2)  7 Linear feet of 6"x6" landscape ties, 3 courses.  each course is $20.00 X3= $60.00 per linear foot X 7 LF= $420.00
> 3)  4 more linear feet of bench seat wall, $344.00, Jorge said that you already approved it. X $86.00= $344.00

	
		
			
			
				
					
						
						Paulina Berger
						
					
				
			
			
			Aug 14, 2020, 8:44 PM (9 hours ago)
			 
			
			
		
		
			
			
				
					
						to me
						
					
				
			
			
		
	


Thanks for this info.

We are going to hold off on the apron at this time. We just want to make a clean line with the existing asphalt. Thank you.

In terms of landscape ties we are good to go and approve that.

We are going to keep it as bender board as we originally planned for the 20 linear feet.

And last but not least... yes we approved the Additional 4 feet today.

Thanks so much!', NULL, 764.00, 'pending', '2020-08-15', '2020-08-15 06:36:38'),
  (3213844, 8136753, '0001', 'Design Credit', NULL, NULL, -750.00, 'pending', '2020-08-17', '2020-08-17 14:15:38'),
  (3216419, 7748778, '0011', 'Not doing curb by driveway', 'Not installing 32 linear feet of rustic wall curbing x $25.00. = $800.00.', NULL, -800.00, 'pending', '2020-08-18', '2020-08-18 11:51:43'),
  (3217081, 8048377, '0001', 'Design Credit due', NULL, NULL, -750.00, 'pending', '2020-08-18', '2020-08-18 14:28:15'),
  (3217086, 8147083, '0001', 'Design Credit due', NULL, NULL, -375.00, 'pending', '2020-08-18', '2020-08-18 14:29:09'),
  (3217092, 7529832, '0001', 'Design Credit due', NULL, NULL, -375.00, 'pending', '2020-08-18', '2020-08-18 14:30:30'),
  (3217098, 7606106, '0001', 'Design Credit due', NULL, NULL, -750.00, 'pending', '2020-08-18', '2020-08-18 14:31:38'),
  (3217105, 7908727, '0001', 'Design Credit due', NULL, NULL, -750.00, 'pending', '2020-08-18', '2020-08-18 14:33:57'),
  (3218584, 7240573, '0044', 'Rebuild gates', NULL, NULL, 1485.00, 'sold', '2020-08-19', '2020-08-19 08:12:08'),
  (3218749, 8136781, '0001', '20 extra pavers', '20 extra pavers at no charge to customer to make a straight line.', NULL, 0, 'pending', '2020-08-19', '2020-08-19 08:53:22'),
  (3219770, 7808502, '0003', 'Credit for Pavers', 'Originally quoted 969 sf of pavers.
Installed 947.69 sf of pavers.
Credit back for 21.31 sf', NULL, -245.00, 'sold', '2020-08-19', '2020-08-19 12:21:49'),
  (3220769, 7928625, '0008', 'Credits due', '-50 credit for drip lines in planters
-150 credit for drainage', NULL, -200.00, 'pending', '2020-08-19', '2020-08-19 16:48:10'),
  (3223932, 7240573, '0045', 'Demo existing apron 4''x19'' and formand pour new', 'Demo existing apron 4''x19'' and formand pour new at 4''x22'' 
Curb needs to cut, formed and poured separately with regular grey concrete', NULL, 4200.00, 'pending', '2020-08-20', '2020-08-20 17:39:35'),
  (3224804, 7240573, '0046', 'Patio railing', NULL, NULL, 1052.00, 'sold', '2020-08-21', '2020-08-21 08:09:07'),
  (3226462, 7808502, '0004', 'Drains from rear to front of property 60lnft', '60*20lnft - $1200
2x draincaps $50', NULL, 1150.00, 'sold', '2020-08-21', '2020-08-21 15:48:40'),
  (3226756, 8136781, '0002', 'Drainage', 'Verva Gerse 
						
					
				
			
			
			1:21 PM (12 minutes ago)
			 
			
			
		
		
			
			
				
					
						to Jenny, Melinda
						
					
				
			
			
		
	


Hi Miguel and Jennifer,
We hope you are pleased with your new patio.
We strongly suggest that you have this drainage installed that we had discussed in the walk through. 
This is your pricing for parts and labor:
Piping to be SDR 35, high quality 4" 
The drainage line is 50 linear feet  @ $25.00 a LF  = $1,250.00
2 90 degree elbows up @ $25.00 each = $50.00
2 45 degree elbows up @ $25.00 each = $50.00
2 T''s @ $25.00 each =$50.00 
3 caps and 1 pop up @ $25.00 each $100.00
Total: $1,500.00

We would like to offer a courtesy of 50 LF X $20.00= $1,000.00
And no charge for all of the rest of materials listed above.
Total offer to you:
$1,000.00', NULL, 1000.00, 'pending', '2020-08-22', '2020-08-22 13:35:31'),
  (3228335, 8160256, '0001', 'New drain line', 'Add additional 50ft drain line to street, core curb Credit 20ft electrical Adds $1350', NULL, 1350.00, 'pending', '2020-08-24', '2020-08-24 09:36:51'),
  (3228794, 7760257, '0001', 'Planting credit', 'All three trees removed from contract.', NULL, -525.00, 'pending', '2020-08-24', '2020-08-24 11:08:46'),
  (3229134, 8048485, '0001', 'Design Credit', NULL, NULL, -750.00, 'pending', '2020-08-24', '2020-08-24 12:13:35'),
  (3229593, 7748494, '0004', 'HVAC repair', NULL, NULL, -390.00, 'pending', '2020-08-24', '2020-08-24 13:48:59'),
  (3231725, 7909383, '0002', 'Seal the counter top', NULL, NULL, 650.00, 'pending', '2020-08-25', '2020-08-25 09:40:53'),
  (3232067, 7240573, '0047', 'Meter Box Credit', NULL, NULL, -234.90, 'pending', '2020-08-25', '2020-08-25 10:58:05'),
  (3232241, 7799379, '0017', 'Custom forming for custom dog bath basin', 'Instead of installing a drop in unit, we are forming a custom concrete basin.', NULL, 2900.00, 'pending', '2020-08-25', '2020-08-25 11:21:37'),
  (3232244, 7799379, '0018', 'Veneer work for dog bath and dog bath wall', NULL, NULL, 1900.00, 'pending', '2020-08-25', '2020-08-25 11:22:58'),
  (3232285, 7748494, '0005', 'Additional pavers.', NULL, NULL, 3670.00, 'pending', '2020-08-25', '2020-08-25 11:30:30'),
  (3234865, 8006570, '0001', '60ft gas line 1-1/4"', NULL, NULL, 1980.00, 'pending', '2020-08-26', '2020-08-26 09:04:12'),
  (3237068, 8151227, '0001', 'Outdoor Kitchen', 'Please see attached Measurements/drawing specifications

	
		
			
			
				
					
						
						El Echauri
						
					
				
			
			
			6:45 PM (8 minutes ago)
			 
			
			
		
		
			
			
				
					
						to me
						
					
				
			
			
		
	


Yes, I approve.
On Wed, Aug 26, 2020 at 18:42 Verva Gerse verva@picturebuild.com> wrote:

Hi Jose,
Please approve the attached Outdoor Kitchen drawing.  If you would like any changes please let me know.
This is calculated at 12 Linear Feet, 8 Linear Feet on one side of the L shape, and 7 Linear Feet on the other side.  The counter overhang is 14" on the 2 outer sides.

First 6 LF= $4,900.00
6 additional LF X $525.00= $3,150.00
Total: $8,050.00', NULL, 8050.00, 'pending', '2020-08-26', '2020-08-26 18:57:46'),
  (3238251, 8006570, '0002', 'BBQ Equipment', '1) 32” BBQ - Natural Gas ($1,742.00)        part number #2853064

    Includes “gourmet package”
               — Rotisserie
               — Cover
               — Smoker Box
               — Griddle and Griddle Remover

2) Double Door with Towel Rack ($354.00)

3) Refrigerator ($317.00)', NULL, 2413.00, 'sold', '2020-08-27', '2020-08-27 09:04:19'),
  (3241336, 7666319, '0009', 'Timber Add/Subtract for new route.', 'Added walkway length will be incorporated into previous contracted gravel area.       No added cost for this. 

Earlier change order included 110 Linear feet of steps.   Only will be installing 101.  Credit of 9 steps ($1800)

Previous Change Order had 2 retaining sections roughly 2 feet tall x 18 feet each. 144 linear course feet.  $3400 divided by 144 course feet is $23.60 per course foot.   Actual retaining sections being installed are:

1) 24 feet x 24 inches high,
2) 20 feet x 24 inches high
3) 14 feet x 24 inches high
4) 4 feet x 24 inches high. 
5) 6 feet x 24 inches high.
6) 7 feet x 18 inches high.
7) 8 feet x 18 inches high.
8) 20 feet x 12 inches high
9) 8 feet x 12 inches high. 
10) 4 feet x 12 inches
11) 16 feet x 12 inches

There were a few long flat  retaining landings that needed timber separation to take out small grade for easier traverse  20x4, 8x4, 12x4 20x4.
120 added course feet

Total course feet 541.   Minus previous course feet included in change order #8 (160) equals  381 new course feet.   381@$23.60 per foot is $8,991.60

$8,991.60 minus $1800 credit for steps not installed equals change order total of $7,191.60', NULL, 7191.60, 'pending', '2020-08-28', '2020-08-28 09:23:32'),
  (3242396, 8160256, '0002', 'Additional Demo', 'dig 2 footings for canopy contractor 20"x20" 

and set concrete\', NULL, 600.00, 'sold', '2020-08-28', '2020-08-28 13:54:43'),
  (3242628, 7687226, '0006', 'Install wall cap', 'Installation of 86 LF. Wall cap approved via text', NULL, 860.00, 'pending', '2020-08-28', '2020-08-28 16:22:06'),
  (3242667, 7808502, '0005', 'Grass Credit', '51 Square Feet of grass
Original in contract 29X23= 667 SF
Installed 21 X 28= 588 SF
Credit of 79 SF X $3.50= $277.00', NULL, -277.00, 'pending', '2020-08-28', '2020-08-28 17:07:32'),
  (3242730, 7808502, '0006', 'Final Credits', '- $20 / Paver credit was calculated at $11.50 but it should have been $20.
- $130 / Drainage should have been charge at $75 per linear feet.', NULL, -150.00, 'sold', '2020-08-28', '2020-08-28 18:43:22'),
  (3242884, 8006570, '0003', 'Wall Material Change', '*** NO ADDITIONAL CHARGE ***

Wall material changed to: Angeles Tango II Cream Terracotta Brown', NULL, 0, 'sold', '2020-08-29', '2020-08-29 09:34:47'),
  (3242991, 8160256, '0003', 'Additional pavers', '35 sf of pavers 
Prep and demo as necessary 
Move shed labor', NULL, 700.00, 'sold', '2020-08-29', '2020-08-29 13:06:43'),
  (3245810, 8151227, '0002', 'GAs And Electrical Permit Fee', 'GAs and Electrical permit fee', NULL, 191.16, 'pending', '2020-08-31', '2020-08-31 13:38:51'),
  (3249282, 8237000, '0001', 'Bench Seat wall', '14 Linear Feet 18" high Rustic Wall runner for the wall soldier course for the cap  in Grey Charcoal', NULL, 1206.00, 'pending', '2020-09-01', '2020-09-01 14:13:23'),
  (3249739, 8006570, '0004', 'Wall Extension (see plan attached)', 'see attached plan
Add additional course where shown $308
add additional 2 course wall where shown  $790
 5 feet of concrete curb $185
 move owners rock to along the walkway – no charge
Total $1283', NULL, 1283.00, 'pending', '2020-09-01', '2020-09-01 16:54:39'),
  (3251910, 8160256, '0004', 'Remove 3 Volunteer trees', NULL, NULL, 300.00, 'sold', '2020-09-02', '2020-09-02 12:25:30'),
  (3252798, 8274743, '0001', 'Design Credit due', NULL, NULL, -375.00, 'pending', '2020-09-02', '2020-09-02 16:08:35'),
  (3254315, 8295596, '0001', 'Add 17’ Drainage', NULL, NULL, 375.00, 'pending', '2020-09-03', '2020-09-03 09:35:13'),
  (3254671, 8006570, '0005', 'Add 1 drip irrigation zone', NULL, NULL, 850.00, 'sold', '2020-09-03', '2020-09-03 10:58:32'),
  (3255466, 8160256, '0005', 'Add paver step', NULL, NULL, 225.00, 'sold', '2020-09-03', '2020-09-03 13:56:15'),
  (3258516, 8160256, '0006', 'Install New Timer', NULL, NULL, 0, 'pending', '2020-09-04', '2020-09-04 19:45:08'),
  (3258704, 8160256, '0007', 'New timer. 4 zones', NULL, NULL, 300.00, 'sold', '2020-09-05', '2020-09-05 18:45:24'),
  (3260309, 8160256, '0008', 'Additional path light', NULL, NULL, 220.00, 'sold', '2020-09-08', '2020-09-08 07:25:36'),
  (3262506, 8160256, '0009', 'Fix Stucco under doors', NULL, NULL, 200.00, 'sold', '2020-09-08', '2020-09-08 16:09:05'),
  (3263358, 8082324, '0001', 'Front Yard Retaining Wall', 'Removing this from addendum.', 'Owners may plant on hillside to hold grade', 0, 'sold', '2020-09-09', '2020-09-09 07:11:13'),
  (3263761, 7748778, '0012', 'Credit stained boards on fence', NULL, NULL, -150.00, 'pending', '2020-09-09', '2020-09-09 08:26:20'),
  (3263953, 8254081, '0001', 'Design Credit', NULL, NULL, -375.00, 'pending', '2020-09-09', '2020-09-09 09:02:59'),
  (3263963, 8254081, '0002', 'Design Credit due', NULL, NULL, -375.00, 'pending', '2020-09-09', '2020-09-09 09:05:18'),
  (3263971, 8254133, '0001', 'Design Credit due', NULL, NULL, -375.00, 'pending', '2020-09-09', '2020-09-09 09:08:39'),
  (3264340, 8082324, '0002', 'Additional concrete for side entry walkway', 'We will do concrete all the way down the side house instead of stepper pads.  It will connect to trash pad on driveway.', NULL, 350.00, 'sold', '2020-09-09', '2020-09-09 10:31:57'),
  (3265063, 7687226, '0007', 'Credit for plants taken out of contract', 'Plants taken out from original plan to plant change order Podacarpus

Remove (4) 1 gallon Perennials, (5) 5 gallon Purple Fountain  (4) 1 gallon California Fuchsia (5) 5 gallon Bouganvillias,', NULL, -560.00, 'sold', '2020-09-09', '2020-09-09 12:44:15'),
  (3265078, 7687226, '0008', 'Planting Change and Lodge Poles', 'Change out 27 stakes to driven lodgepoles.        $940
Change out ground cover to    N/C

Added planting in front:
(2) 5 gallon Purple Fountain 
(2) 1 gallon California Fuschia    $135

Add extra (5) 5 gallon lavender for various layout by client  $220', NULL, 1295.00, 'sold', '2020-09-09', '2020-09-09 12:47:27'),
  (3265131, 8006570, '0006', 'Rain Dial 9 station control clock', NULL, NULL, 580.00, 'sold', '2020-09-09', '2020-09-09 13:00:24'),
  (3265680, 8006570, '0007', 'Add Umbrella Sleeve', 'Installed 9/9/2020', NULL, 85.00, 'sold', '2020-09-09', '2020-09-09 15:20:37'),
  (3269392, 8401360, '0001', 'Scope of Work Change Order', 'Demo/Cleanup                                                              $1300  
Decomposed granite                                                     $850
(11)  2x2 pavers pads set w Concrete                        $935
2X4 Pressure treated Edging      90ft                         $1080
Synthetic grass                                                               $3280
Planting  1-15 gal fruit tree2-15, 39-5, 18-1           $2671
Zone Drip w/controller                                               $925
Mulch                                                                              $425     
Install owner provide poles                                       $425
Electrical 1-outlet                                                         $375     
 
                                                                           Total $12,266             (ADD $571) to original agreement', NULL, 571.00, 'sold', '2020-09-10', '2020-09-10 23:50:03'),
  (3270207, 7240573, '0048', 'Grade, Clean Up, Trim', '3 guys one day plus one dump truck load  $1500 plus $500 dump fee.', NULL, 2000.00, 'sold', '2020-09-11', '2020-09-11 08:41:18'),
  (3270739, 4312960, '2128708', 'Add access door for fireplace', 'Owner to provide access door we''re just doing the labor 1 man 4 hours', NULL, 260.00, 'sold', '2020-09-11', '2020-09-11 10:45:19'),
  (3271915, 7748494, '0006', 'Shipping credit', NULL, NULL, -50.00, 'pending', '2020-09-11', '2020-09-11 16:45:52'),
  (3273222, 7687226, '0009', 'Soils Removal for leak detect. Clean up/grade', 'Soil removals for leak detect.
Clean Up and Grade front yard for planting.', NULL, 1800.00, 'sold', '2020-09-14', '2020-09-14 07:11:55'),
  (3274330, 8077649, '0001', 'Design Credit due', NULL, NULL, -1000.00, 'pending', '2020-09-14', '2020-09-14 10:50:25'),
  (3274395, 8048448, '0001', 'Design Credit due', NULL, NULL, -750.00, 'pending', '2020-09-14', '2020-09-14 11:03:02'),
  (3275665, 8237000, '0002', 'Additional Plants/bender board 5 LF credit', 'credt of 5 linear feet of bender board $40.00
Additional plants  12 1 gallon @ $21.00= $252.00
ADditional Plants 2 5 gallon @ $42.00= $84.00
$296.00', NULL, 296.00, 'sold', '2020-09-14', '2020-09-14 15:32:43'),
  (3275801, 7909383, '0003', 'Install Frame for Refrigerator', NULL, NULL, 250.00, 'sold', '2020-09-14', '2020-09-14 16:42:21'),
  (3275896, 8310771, '0001', 'Additional Plants, stump grind (2 small)', 'I cross referenced the plant list with the new plants.
1.  Flowering Plum  24" box 2 additional  @ $360.00=  $720.00  (3 total @ 24: box)
2.  Birds of Paradise 5 gallon  3 additional @ $42.00= $126.00  (11 total @ 5 gallon)
3.  Red Bananas   5 gallon  3 total  @ $42.00=$126.00
4.  Red Kangaroo paws 1 gallon 4 additional @ $21.00= $84.00 ( 26 total @ 1 gallon)
5.  Coral Bells  1 gallon 6 additional @ $21.00= $126.00  ( 26 total @ 1 gallon)
Total:  $1,182.00

Please approve what you would like, then I can send to Carter for ordering.
We will dig out the stumps 12" from the top of the grade to get them out of the way, as a courtesy.
I''ll watch for the rose choices.', NULL, 1182.00, 'pending', '2020-09-14', '2020-09-14 17:19:26'),
  (3275898, 8310771, '0002', 'GFI 30 LF of electrical', '30 Linear feet of electrical line with 1 GFI box.  $660.00', NULL, 660.00, 'pending', '2020-09-14', '2020-09-14 17:21:18'),
  (3277904, 8151227, '0003', '50’ additional drainage @$15/ft', NULL, NULL, 750.00, 'sold', '2020-09-15', '2020-09-15 11:16:21'),
  (3277907, 8082324, '0003', 'Lighting', 'Adding (9) path lights to backyard plus (3) spots 
Adding (6) path lights to frontyard plus (2) spots
We will need:

(15) of these 
https://www.vistapro.com/product.aspx?catid=1&typid=3&prodid=697

(5) of these
https://www.vistapro.com/product.aspx?catid=1&typid=1&prodid=146

(1) CTS 300 Transformer', NULL, 4670.00, 'sold', '2020-09-15', '2020-09-15 11:16:42'),
  (3277910, 8151227, '0004', '4 Brass drain grates', NULL, NULL, 168.00, 'sold', '2020-09-15', '2020-09-15 11:16:58'),
  (3278326, 8006570, '0008', 'Apply countertop sealer', NULL, NULL, 250.00, 'sold', '2020-09-15', '2020-09-15 12:26:29'),
  (3278685, 8006570, '0009', 'Credit 9-station clock to 6-station clock', NULL, NULL, -67.32, 'sold', '2020-09-15', '2020-09-15 13:34:50'),
  (3278826, 8319562, '0001', 'ADD Front Design', NULL, NULL, 450.00, 'pending', '2020-09-15', '2020-09-15 14:08:53'),
  (3278827, 8319562, '0002', 'ADD Fuel Modification Plan', NULL, NULL, 400.00, 'pending', '2020-09-15', '2020-09-15 14:09:25'),
  (3279438, 8082324, '0004', 'Plants', NULL, 'Bougainvillea will be Rosenka
Jasmine is Night Blooming 
Magnolia liliflora is being replaced with Lipan Crepe Myrtle (Tree Form only 24" boxed)', 0, 'sold', '2020-09-15', '2020-09-15 18:55:43'),
  (3281659, 8310771, '0003', '45lf of Bender board', '45 additional linear feet of bender ,board, customer was not told, I texted him after the fact, not approved yet.  by Verva', NULL, 360.00, 'sold', '2020-09-16', '2020-09-16 11:42:05'),
  (3284204, 8071515, '0001', 'Gravel for Switches', NULL, NULL, 4150.00, 'pending', '2020-09-17', '2020-09-17 09:15:25'),
  (3284517, 8386992, '0001', 'Bender board d', '58 linear feet of Bender board', NULL, 464.00, 'pending', '2020-09-17', '2020-09-17 10:13:42'),
  (3284529, 8386992, '0002', 'Additional pavers 34 sf', '34 sf pavers x$14', NULL, 476.00, 'pending', '2020-09-17', '2020-09-17 10:15:09'),
  (3284549, 7666319, '0010', 'Add (3) 24 inch box pepper trees', 'Add 3 new pepper trees for slope coverage near driveway per meeting on 9/15', NULL, 1185.00, 'sold', '2020-09-17', '2020-09-17 10:18:51'),
  (3285715, 8151227, '0005', 'Additional Pavers 441', 'Additional Pavers 441 SF X $11.15= $4,917.00', NULL, 4917.00, 'pending', '2020-09-17', '2020-09-17 14:33:16'),
  (3285731, 8151227, '0006', 'Taking out one planter', 'Taking out one 18" high planter', NULL, -1591.00, 'pending', '2020-09-17', '2020-09-17 14:36:22'),
  (3285743, 8151227, '0007', 'Step Build', 'Step build $45.00 X 29 LF=$1,305', NULL, 1305.00, 'pending', '2020-09-17', '2020-09-17 14:38:58'),
  (3285772, 8151227, '0008', 'Additional Utilities', 'Additional Utilties from contract, 
Calculated man days 3 man days  plus materials
$5,100.00 utiltites total minus in contract $3,280.00= $1,820.00 total
Using the same trenching when possible, using Mini.', NULL, 1820.00, 'pending', '2020-09-17', '2020-09-17 14:47:13'),
  (3286776, 8151227, '0009', 'Fire Pit-Stone Wall II', '5 foot diameter Stone Wall II Sand stone mocha
Order 2 courses of cap, one for the base and one for the top', NULL, 3600.00, 'pending', '2020-09-18', '2020-09-18 07:05:03'),
  (3287592, 8356030, '0001', '25ft drain line to down spout', NULL, NULL, 550.00, 'pending', '2020-09-18', '2020-09-18 10:27:09'),
  (3287601, 8356030, '0002', 'Demo wall and re-route pipe', NULL, NULL, 500.00, 'pending', '2020-09-18', '2020-09-18 10:30:41'),
  (3288674, 8237000, '0003', 'Drainage', '120 Linear Feet of drainage with 10 caps', NULL, 2400.00, 'pending', '2020-09-18', '2020-09-18 16:22:06'),
  (3288680, 8237000, '0004', 'Stump Removal', 'Stump removed by Juventino, logged by Jorge', NULL, 300.00, 'pending', '2020-09-18', '2020-09-18 16:26:39'),
  (3288735, 8151227, '0010', 'Installing 2 ceiling fans with switch in Pavillion', 'Installation 2 ceiling fans with switch 
Owner provides fans', NULL, 600.00, 'pending', '2020-09-18', '2020-09-18 17:26:19'),
  (3289243, 8444451, '0001', '84sqft. Pavers (fills planter area)', NULL, NULL, 1000.00, 'sold', '2020-09-20', '2020-09-20 08:52:18'),
  (3289245, 8444451, '0002', '2ft pavers around pool -65 linear ft', NULL, NULL, 1900.00, 'pending', '2020-09-20', '2020-09-20 08:54:03'),
  (3290098, 7958649, '0001', '1/2 yard California gold gravel', NULL, NULL, 250.00, 'pending', '2020-09-21', '2020-09-21 07:14:51'),
  (3290581, 8386992, '0003', 'Taking out Bender board', 'Taking out Bender board', NULL, -464.00, 'pending', '2020-09-21', '2020-09-21 09:08:00'),
  (3290593, 8386992, '0004', 'Extra demo', 'Taking out extra shrub s and tree roots.', NULL, 1140.00, 'pending', '2020-09-21', '2020-09-21 09:09:31'),
  (3291015, 8230539, '0001', '(Eurphobia tirucalli (pencil cacti) Removal', 'Remove Euphorbia on right side of property close to cement walkway', 'Remove (2) Euphorbia on right side of property, one is along property line, other closer to cement walkway', 350.00, 'sold', '2020-09-21', '2020-09-21 10:49:10'),
  (3291297, 7237038, '0006', 'Credit for Spa design change', '1.  Cap 40 LF X $30.00=$1,200.00
2.  Stucco 40 LF X $12.00= $480.00
3.  2courses of block ($15.00 each) $30.00 X 40 LF=$1,200.00
$2,880.00', NULL, -2880.00, 'sold', '2020-09-21', '2020-09-21 11:49:06'),
  (3291364, 8230539, '0002', 'Bender board edging to separate DG pathway', '30LF of edging to separate DG walkway from Del Rio Gravel bed (front left)', NULL, 180.00, 'sold', '2020-09-21', '2020-09-21 12:01:05'),
  (3296353, 7237038, '0007', 'Extra Steps 12 linear feet', '1.  Steps 12 Linear feet to connect the grass to the entry priced at $60.00,= $720.00', NULL, 720.00, 'pending', '2020-09-22', '2020-09-22 18:20:43'),
  (3296409, 8406571, '0001', 'Steps (front and side)', '- Demo brick curb near driveway that sits on top of concrete driveway.
- Steps in front and on side are now going to be paver steps.

No charge for changing steps and demo of brick curb.', 'need price of bullnose to see if it''s covered', 0, 'sold', '2020-09-22', '2020-09-22 18:52:56'),
  (3298537, 8406571, '0002', 'Irrigation - Front and Back', '1. Irrigation - Front - Adding 2 new grass zones
2. Irrigation - Back - Adding 4 new grass zones
3. Timer - Client requested NEW Rainbird timer
4. Timer location - Client requested to move Rainbird timer to garage area (drilling hole through garage from manifold location).

After assessing Irrigation valves need replacing as well as piping, brass valves and sprinkler heads (we tested and it was clogged).', NULL, 5190.00, 'sold', '2020-09-23', '2020-09-23 12:00:14'),
  (3298715, 8406571, '0003', 'Gravel', 'Add 60 SF at 3" of Grey Crushed Gravel to side yard. Keeping planting the same since plant count was already lowered.  Difference for mulch in that area (60 SF) is a wash.', NULL, 70.00, 'sold', '2020-09-23', '2020-09-23 12:38:12'),
  (3298823, 8406571, '0004', 'Added 6" step to paver pathway leading to backyard', '- Added step from driveway paver pathway to backyard. Melinda suggested placement, right at pergola wall.
- 7LF of Angelus bullnose charcoal.', 'slope was annoying going ''down'' to the backyard via a paved slope.  Melinda suggested a step and loved that idea!', 329.00, 'sold', '2020-09-23', '2020-09-23 12:59:10'),
  (3298847, 8406571, '0005', 'Main Water Line', '-Main water line was rusted out, needed replacing.  
- Will lie under pavers.
- Approx. 40 LF of 3/4" PVC main line, includes trenching, time + material.', NULL, 1000.00, 'sold', '2020-09-23', '2020-09-23 13:04:47'),
  (3298862, 8406571, '0006', 'Additional material for Pergola', '- Adding one more footing and one more post (structure was not fully supported with designed amount of wood material)
- Adding 3 beams along outside of structure (current wood is rotten and splitting)', NULL, 1500.00, 'sold', '2020-09-23', '2020-09-23 13:07:29'),
  (3301284, 4312960, '2128709', 'Add block and Brown Coat Wall', 'Add 40 blocks  and widen existing wall to 8"  - $800

apply Thoroseal/sure coat existing wall with 2 coats $1680

Brown coat wall   about 1/2" thick to remove  slumpstone and make wall ready for stucco  $2800

Total $5280', 'should take 6 man days
$800 material approx', 5280.00, 'sold', '2020-09-24', '2020-09-24 09:47:25'),
  (3301377, 8230539, '0003', 'Repair/Rebuild 12LF of Wall (Right Side)', 'We are taking out the section of wall that was impacted by tree roots, which has forced the wall to bow outwards and upwards.  We will replace 12LF and demo the remaining 2LF at the end (but not replace) where the palm tree is located.  We will also delete the straight caps and just stucco over the walls instead.  Carlos said we only need 16 blocks to install the replacement.  There will be no additional charge for this.  We also explained that the current wall has no footings and is a free standing wall.', NULL, 0, 'pending', '2020-09-24', '2020-09-24 10:09:07'),
  (3302404, 8082324, '0005', 'Add''l Concrete for Extension next to Patio/Kitchen', 'Extending concrete extension (next to patio) by another 1'' in width by same length and addition square footage for the concrete area for outdoor kitchen', NULL, 480.00, 'sold', '2020-09-24', '2020-09-24 13:37:00'),
  (3302545, 8082324, '0006', 'Perforated Pipe for French Drain (behind wall)', '85LF of perforated pipe installed behind East side retaining wall and connect to hillside piping to allow water to run off and not settle behind wall', NULL, 1100.00, 'pending', '2020-09-24', '2020-09-24 14:09:25'),
  (3304185, 8310771, '0004', '1 yard of California Gold Gravel', NULL, NULL, 200.00, 'sold', '2020-09-25', '2020-09-25 08:58:27'),
  (3304557, 8230539, '0004', 'Changing Stucco finish from Smooth to Rough', 'No change in price. 
Reason: Since the existing wall is not perfectly straight, the rough finish will show less imperfections rather than a smooth finish.', NULL, 0, 'pending', '2020-09-25', '2020-09-25 10:25:45'),
  (3304810, 7687226, '0010', 'Wtrproof, Drain, Backfill, Irr. Valves, Pool Valve', 'Wtrproof, Drain, Backfill - $9600

Irr. Valves - $300

Poll Valve - $200', NULL, 10100.00, 'pending', '2020-09-25', '2020-09-25 11:29:33'),
  (3305357, 8406571, '0007', 'Irrigation parts', 'Added 2 new hose bibs and 1 shut off valve. (Complementary of Nicole)', NULL, 0, 'sold', '2020-09-25', '2020-09-25 13:43:59'),
  (3305520, 8406571, '0008', 'Pre-fab grey pavers', '- Updated design from poured concrete to 2'' x 2'' square Grey pavers.  (no charge)', NULL, 0, 'sold', '2020-09-25', '2020-09-25 14:44:47'),
  (3305669, 8071515, '0002', 'Irrigation T&M', '17 man days labor (man day = 8 hours)

Bio Science
zone1 lawn  - 60 lnft 1" pipe, 5 rottor head popups
zone2 lawn - 22 lnft 3/4" pipe, 2 rain bird 6" pop ups
zone3 planter - pipe repair, 2 rain bird 6" pop ups

P.E
60 lnft 1" pipe, replace 1 rottor head popups, 9 bubbler heads

Kings Hall
zone1 lawn - 156 lnft 1" pipe, 19 rain bird 6" pop ups
zone2 planter - 57lnft 1" pipe, 8 rain bird 6" pop ups

Lot 6
38 lnft 1" pipe, 7 rain bird 6" pop ups

Theatre
z1 planter - 42 lnft 1" pipe, repair 3 spinkler heads
z2 - lawn - 116 lnft 1" pipe, 15 rain bird 6" pop ups', '48h * 97.94 = 4701.12
88h * 75.33 = 6629.04

Material 1690.93 *1.5 = $2536.40', 13866.56, 'pending', '2020-09-25', '2020-09-25 16:09:14'),
  (3307997, 7240573, '0049', 'Planting', 'Add in plants per addendum.', NULL, 3461.00, 'pending', '2020-09-28', '2020-09-28 10:17:42'),
  (3308021, 7402917, '0014', 'Credit for 1 Column', NULL, NULL, -800.00, 'pending', '2020-09-28', '2020-09-28 10:21:36'),
  (3308651, 7903624, '0004', 'light "Labor Credit"', '3 fictures labor @ $75.8 ea', NULL, -227.40, 'pending', '2020-09-28', '2020-09-28 12:09:41'),
  (3309760, 8237000, '0005', 'Additional Demo Charge', 'Additional Demo and Grading for Backyard', NULL, 1400.00, 'pending', '2020-09-28', '2020-09-28 16:52:20'),
  (3309864, 7237038, '0011', 'Gas Line', '58 Linear Feet of Gas Line X $35.00 $2,030.00
No Linear Feet in contract', NULL, 2030.00, 'sold', '2020-09-28', '2020-09-28 18:04:48'),
  (3309881, 7237038, '0012', 'Electrical', '198 Linear Feet (Including the electrical inside the AC enclosure 14 Feet and 45 feet EMT 
Electrical for SPA, Outlets and Pilasters, and all outlets
50 Linear Feet was included in contract
148 Linear Feet X $18.00= $2,664.00', NULL, 2664.00, 'sold', '2020-09-28', '2020-09-28 18:12:49'),
  (3309888, 8082324, '0007', 'Plants for Front beds', '(1) 24" box Lipan Crape Myrtle 
(2) 5g Salvia leucantha ''Santa Barbara'' 
(4) 5g Salvia mystic spires blue
(7) 1g Lavandula stoechas ''Fat Head'' or Anouk
(8) 1g Lavandula angustifolia ''Hidcote'' or ''Munstead'' 
(9) 1g Pennisetum ''Little Bunny''
(6) 1g Blue Fescue
(16) 1g Armeria meritima ''Bloodstone''
(6) 1g Sedum ''Autumn Joy''
(6)  1g Agastache ''Blue Fortune''', NULL, 1580.00, 'pending', '2020-09-28', '2020-09-28 18:22:04'),
  (3309894, 7237038, '0014', 'Additional water line', '*** Main water line : 128 LF (3 bibs and 25 LF included on contract)

Priced at $18.00 a Liner Foot

128-25 (in contract) 103 LF X $18.00= $1,854', NULL, 1854.00, 'sold', '2020-09-28', '2020-09-28 18:29:29'),
  (3311730, 8399331, '0001', 'Credit for removing drainage from scope', '- Removed drainage from scope. Credited $1,522.00

- If new work is to be approved by Tom Hall, we will keep this job open and create a large change order.  Payments can come from Tom Hall via check or passing it to Melinda.', 'We are going to be adding a large change order for this job as per Brian''s request.  We are not creating a NEW JOB, it''s too much work and client will pass check to Melinda anyways.  Checks will come from Tom and Doreen Hall and I will update Client''s name to include Tom Hall.', -1522.00, 'pending', '2020-09-29', '2020-09-29 10:54:02'),
  (3312310, 7240573, '0050', 'Fabric, Trim, Prep, Back fill, Compaction', 'Mulching Citrus Trees
Jute Install for front slope
Trim Eugenias
Prep front parkway for planting. Planting by Jeremy
Install and compact 1 yard sectino next to Storm Garden
Backfill several yards of soils for storm garden

6 Man Days plus, soil delivery and  material - $3550', NULL, 3550.00, 'sold', '2020-09-29', '2020-09-29 12:50:27'),
  (3312963, 8396282, '0001', 'Additional pavers.', '17.5 addiitional sf of pavers', NULL, 245.00, 'pending', '2020-09-29', '2020-09-29 15:15:47'),
  (3313342, 8230539, '0005', 'Rough finish stucco', 'Changing finish from smooth to rough. 
No price change', NULL, 0, 'pending', '2020-09-29', '2020-09-29 19:11:34'),
  (3314050, 7909383, '0004', 'Custom made frame difference', 'Custom frame would be $350
Previous change order was $250
The difference is $100', NULL, 100.00, 'sold', '2020-09-30', '2020-09-30 07:21:55'),
  (3314154, 8310771, '0005', 'Upgrade to 600 watt transformer.', 'Upgrade to 600 watt transformer. $400.00 additional for change order.', NULL, 400.00, 'pending', '2020-09-30', '2020-09-30 07:42:29'),
  (3314244, 8386992, '0005', 'Additional path light', 'Vista 6540 in arch bronze path light approved via text', NULL, 225.00, 'pending', '2020-09-30', '2020-09-30 08:00:55'),
  (3314922, 7240573, '0051', 'Metal Edging', '41 ln feet of metal edging plus stakes. There will be some left over.
Two guys two hours.', NULL, 850.00, 'sold', '2020-09-30', '2020-09-30 10:10:12'),
  (3315219, 8151227, '0011', '3 More linear feet of BBQ island', '3 more linear feet of BBQ island = $1575
Discount: Island blocks = $630
Only charging for countertop concrete and labor to finish = $945', NULL, 945.00, 'sold', '2020-09-30', '2020-09-30 11:09:26'),
  (3316387, 7748494, '0007', 'Post footings', NULL, NULL, 500.00, 'pending', '2020-09-30', '2020-09-30 15:23:53'),
  (3317719, 7748494, '0008', 'Electrical Credit', NULL, NULL, -250.00, 'pending', '2020-10-01', '2020-10-01 08:26:51'),
  (3318111, 8399331, '0002', 'Drainage', 'Demolition/Reinstall
1. Remove pavers for drainage install.
2. Remove sand to trench for drain pipe.
3. Remove approx 20SF of concrete near gate and through curb.
4. Reinstall pavers, compact and sand fill.
5. Haul all material to appropriate dump sites.
COST: $700

Drainage
1. Install approx. 36 linear feet of 3 inch SDR 35 drain pipe.
2. Install (1) 8” x 8” landscape drain boxes with black grate cover.
COST: $1,500

TOTAL DRAINAGE: $2,200', 'Client had me put together estimate for drainage, sod, and irrigation.  They only want to move forward with drainage at this time because they said "the rest is way more than expected".

Client is old, doesn''t use email. Clients are splitting payments, (not of our concern).', 2200.00, 'pending', '2020-10-01', '2020-10-01 09:57:26'),
  (3318998, 7237038, '0016', 'Credit for spa', NULL, NULL, -250.00, 'pending', '2020-10-01', '2020-10-01 12:47:36'),
  (3319729, 8310771, '0006', 'Planting Credit', 'From Contract 
1 5gal $42.00
4 15gal $175.00

Total $742.00

Credit due

4x133 = 574
+42

= 574', NULL, -574.00, 'pending', '2020-10-01', '2020-10-01 15:18:33'),
  (3320756, 7799379, '0019', 'other items', 'undermount touchup.   $300

Demo out footing for wall at sidewalk
Drainage work from planters to street
Sleeves for irrigation, conduit for electrical and low voltage.  $1700', NULL, 2000.00, 'sold', '2020-10-02', '2020-10-02 07:21:07'),
  (3321224, 8160256, '0010', 'Fix pavers taken out by canopy installers', NULL, NULL, 100.00, 'sold', '2020-10-02', '2020-10-02 09:05:20'),
  (3321577, 8406571, '0009', 'Credit for Sandblasst', 'Not able to perform sandblasting on red paint slab. Our crew chief doesn''t recommend removing with grinding (which we initially thought was an option).

Keith has painters coming to paint the entire exterior, they should be accustom to removing paint. FYI Pasadena requires a lead test prior to any paint removal ($150).', NULL, -500.00, 'sold', '2020-10-02', '2020-10-02 10:38:50'),
  (3322961, 8359175, '0001', 'Design Credit due', NULL, NULL, -375.00, 'pending', '2020-10-03', '2020-10-03 11:36:20'),
  (3322962, 7930414, '0001', 'Design Credit due', NULL, NULL, -375.00, 'pending', '2020-10-03', '2020-10-03 11:37:31'),
  (3322966, 8124062, '0001', 'Design Credit due', NULL, NULL, -350.00, 'pending', '2020-10-03', '2020-10-03 11:45:49'),
  (3322968, 8418323, '0001', 'Design Credit due', NULL, NULL, -375.00, 'pending', '2020-10-03', '2020-10-03 11:50:30'),
  (3323086, 8406571, '0010', 'Stucco over post anchors', '4 stucco columns wrapped around pergola post anchors. With Waterproofing, mesh, Brown coat and stucco.
We’ll try to make it as small as possible. Suggested size is 6” x 6” x 18”.', NULL, 1040.00, 'sold', '2020-10-03', '2020-10-03 19:39:19'),
  (3323192, 8071515, '0003', 'Added Mulching and Plants', 'Added mulching to project and two additional 15 gallon plants.', NULL, 4500.00, 'pending', '2020-10-04', '2020-10-04 09:53:45'),
  (3323219, 8356030, '0003', 'Front Yard Planting rev1', 'Cleanup planting Area and prepare for Planting     $650
Irrigation/Drip                                                          $850
Planting - 
(1) 15-Gallon shrubs @ $150ea                 $150
(26)  5-Gallon Plants @ $45ea                    $1170
(58) 1-Gallon Plants @ $22ea                    $1276
Move (9) roses (1) Magnolia                         $247   (no warranty on transplants)
Planting Design Fee                                    $300     
Basins and Fertilize and Amend each plant
90 Day  warranty  on new planting

Mulch-Premium  - by owner

Total $4643', NULL, 4643.00, 'pending', '2020-10-04', '2020-10-04 10:37:06'),
  (3323245, 8406571, '0011', 'Credit - Painting posts', '- Credit for not painting posts and beams of pergola
(House painters will be doing the painting of posts)', 'we still charged for priming, demo was high so we have budget there. I hope he is happy with this credit!', -350.00, 'sold', '2020-10-04', '2020-10-04 12:01:09'),
  (3325008, 8470970, '0001', 'Pressure treated lumber & install', 'Fence erosion correction

- 4 pressure treated (6×6×8)
- rebar
- 2 man days labor', NULL, 1850.00, 'pending', '2020-10-05', '2020-10-05 10:38:06'),
  (3325014, 8470970, '0002', 'Ball valve', '(1) ball valve for irrigation', NULL, 120.00, 'pending', '2020-10-05', '2020-10-05 10:39:19'),
  (3325232, 8470970, '0003', 'Benderboard (inner yard)', '60 LF of brown plastic 4" tall x 2" wide bender board along existing lawn line in front inner yard', NULL, 435.00, 'pending', '2020-10-05', '2020-10-05 11:29:40'),
  (3327833, 8071515, '0004', 'Added Sod', 'Additional  719 sq feet of sod added.  Contract was 7101.  Total installed ended at 7820 sq feet. Contract price was $5.22 per sq foot.', NULL, 3753.00, 'pending', '2020-10-06', '2020-10-06 09:01:49'),
  (3328446, 8151227, '0012', '47’ additional drainage @$15/lf', NULL, NULL, 700.00, 'sold', '2020-10-06', '2020-10-06 10:56:06'),
  (3328685, 8151227, '0013', 'Additional outlets and conduit', '3 outlets included in contract 
Installing total 8 outlets
37’ additional conduit @ $20/ lf: $807
5 additional outlets @$120/ea: $600', NULL, 1400.00, 'sold', '2020-10-06', '2020-10-06 11:39:43'),
  (3329008, 8396282, '0002', 'Paver Sealer', 'SEaler for the pavers.  $1.00 a SF', NULL, 385.00, 'pending', '2020-10-06', '2020-10-06 12:28:34'),
  (3329923, 8406571, '0012', 'Front Lawn', 'Approx. 564 SF in front lawn of Valley RTF  (includes demo, tilling & amendments). I have given a 8% discount on the grass.', 'Gave a little discount 8% maybe?', 1850.00, 'sold', '2020-10-06', '2020-10-06 16:55:31'),
  (3331308, 8554151, '0001', 'Design Credit due', NULL, NULL, -375.00, 'pending', '2020-10-07', '2020-10-07 08:47:05'),
  (3332511, 8356030, '0004', 'Stucco work', 'Stucco patch and fade into existing', NULL, 867.00, 'pending', '2020-10-07', '2020-10-07 13:01:17'),
  (3332699, 8631009, '0001', 'Design Credit due', NULL, NULL, -375.00, 'pending', '2020-10-07', '2020-10-07 13:33:54'),
  (3332922, 8396282, '0003', 'One podocarpus 5 gallon', NULL, NULL, 43.00, 'pending', '2020-10-07', '2020-10-07 14:15:10'),
  (3335369, 8445141, '0001', 'Step lights', '(4) black step lights *Jorge showed client
(1) 150 watt steel outdoor transformer', 'Client gave approval via text', 1430.00, 'pending', '2020-10-08', '2020-10-08 10:53:14'),
  (3335685, 7687226, '0011', 'Install mulch', 'Approved via text', NULL, 700.00, 'pending', '2020-10-08', '2020-10-08 11:44:35'),
  (3335927, 8445141, '0002', 'Waterproofing', '105 SF of sealing and waterproofing inside of seat wall (against neighbors garage)', 'The cost is $5.80 per SF @ 105 SF. 
Extra budget is for painting and prepping wall. $500', 1160.00, 'pending', '2020-10-08', '2020-10-08 12:24:01'),
  (3336490, 8082324, '0008', 'Added Plants', 'Adding:
12) 1g blue fescue
(3) 5g Salvia Blue spirea
(3) 1g lavender hidcote
(3) 1g Sedum Autumn Joy', NULL, 400.00, 'pending', '2020-10-08', '2020-10-08 14:19:07'),
  (3336506, 8082324, '0009', '(2) Poles for String Lights', 'Installing 2 poles to string lights from', NULL, 50.00, 'pending', '2020-10-08', '2020-10-08 14:22:55'),
  (3336728, 8445141, '0003', 'Angelus Bullnose Dark Grey/Pewter/Charcoal', '70 LF of Angelus Bullnose in Dark Grey/Pewter/Charcoal', 'ordering 79LF', 350.00, 'pending', '2020-10-08', '2020-10-08 15:31:50'),
  (3336841, 8630833, '0001', 'Additional Rear Low Voltage Lights', 'ADD (12) Vista 2216 Up-Lights Black', NULL, 2640.00, 'sold', '2020-10-08', '2020-10-08 16:41:40'),
  (3338329, 8444451, '0003', 'Add GFI with 37lf conduit', 'Only run conduit $850', NULL, 1300.00, 'pending', '2020-10-09', '2020-10-09 10:04:11'),
  (3339021, 7799379, '0020', 'Landscape Wall and Extra Veneer', 'Remove and reinstall 97 sq feet wall #2 
Remove and reinstall 38 sq feet for top section wall # 3 in front
Remove and reinstall 68 sq feet inside driveway wall

Total of 203 sq feet of additional veneer work  = $6496

Landscape Timber Wall. 
Demo exsting.
Install 6x6 ACQ treated timber retained. Includes waterproofing and gravel beds for proper drainage. 
for 30 linear feet x roughly 3 feet tall. 
$5300', NULL, 11796.00, 'pending', '2020-10-09', '2020-10-09 12:59:27'),
  (3339110, 7728345, '0003', 'Lighting', NULL, NULL, 3950.00, 'pending', '2020-10-09', '2020-10-09 13:15:48'),
  (3339149, 8330556, '0003', 'Pots   Approval', 'ALL POTS
Texture: Smooth
Color: White Pearl
(36) 48" x 26"
(1) 30" x 26" (this pot replaces a 38" pot on the plan and goes in the Diagonal Area)
(13) 38" x 26"
approx 6 week Delivery', NULL, 0, 'pending', '2020-10-09', '2020-10-09 13:23:28'),
  (3339411, 7240573, '0052', 'Credit for mailbox', NULL, NULL, -900.00, 'pending', '2020-10-09', '2020-10-09 14:58:15'),
  (3339425, 8082324, '0010', 'Upgrading Irrigation Timer', 'Upgrade to Rachio timer
Owner has approved via text', NULL, 150.00, 'pending', '2020-10-09', '2020-10-09 15:03:58'),
  (3339542, 8082324, '0011', 'Credit for 24" box grapefruit, could only find 15g', 'Credit should be issued for difference in cost from 24" box citrus to 15gallon citrus', NULL, -625.00, 'pending', '2020-10-09', '2020-10-09 16:43:30'),
  (3339673, 8396282, '0004', 'Additional 6 yards of soil', 'Additional soils approved via email.', NULL, 550.00, 'pending', '2020-10-10', '2020-10-10 07:34:38'),
  (3342316, 8283798, '0001', 'Electrical Conduit and wiring', 'New electrical conduit with wiring, stub up to GFI; 48 LF one GFI', NULL, 1056.00, 'sold', '2020-10-12', '2020-10-12 12:34:45'),
  (3342679, 8275694, '0001', 'Demo  posts and install 3 new posts', 'Demo existing posts install 3 new posts. Paint or stain ready. 6" x 6" with stucco patch at beam', NULL, 2000.00, 'sold', '2020-10-12', '2020-10-12 13:49:25'),
  (3343087, 8406571, '0013', 'Plugs credit', 'Credit for sod plugs.', NULL, -300.00, 'pending', '2020-10-12', '2020-10-12 15:39:43'),
  (3343456, 8283798, '0002', 'Main lines (2) 5 new zones of irrigation.', 'New main line. Replace old galvanized pipes from front to side of the house, under the house to connect to other side.  With new pressure regulator.  
$5,900.00

120 linear feet of additional main line from side of house to the back of house. X $20.00 a linear = $2,400.00

2 hose bibs and 5 brass valves (5 zones)
Hose bibs included. 5 new brass valves with all new emitters and filters x $850.00 = $4,250.00', NULL, 10550.00, 'sold', '2020-10-12', '2020-10-12 20:03:55'),
  (3344254, 8283798, '0003', 'Pilaster light transformer.', NULL, NULL, 240.00, 'sold', '2020-10-13', '2020-10-13 08:01:41'),
  (3345218, 8444451, '0004', 'New wood for post', NULL, NULL, 100.00, 'sold', '2020-10-13', '2020-10-13 11:14:15'),
  (3345515, 8444451, '0005', '128sqft additional  pavers inc Demo', 'Sidewalk only 
Includes additional delivery fee $100
And demo costs', NULL, 1610.00, 'pending', '2020-10-13', '2020-10-13 12:07:46'),
  (3346244, 8424736, '0001', 'Demo flagstone, add pebbles, add edging', 'Demo flagstone near "Big Boy" and haul. (Being mindful of Big Boy)
Add weed barrier.
Add approx. 20 SF of 1/2"-1" Mexican Full Mix Beach Pebble.
Add 1 piece of black metal edging to keep pebbles in. (Approx. 8-10ft)', NULL, 365.00, 'sold', '2020-10-13', '2020-10-13 14:16:27'),
  (3346268, 8424736, '0002', 'Plants', 'Add 1 5g Jasmine Vine (staked) for near the front entrance (near little iron fence).
Add 1 5g Bamboo to upper bed.

No charge!', 'We had more plants on the contract than we ordered. No charge for adding a few plants here.', 0, 'sold', '2020-10-13', '2020-10-13 14:21:27'),
  (3346279, 8424736, '0003', 'Demo swale and haul', 'Demo swale at top of wall and haul.
Grade and prep for planting up top as in original design.', 'Jorge said 3 guys 1 day. I charged extra for hauling because it’s hard to access.', 1975.00, 'sold', '2020-10-13', '2020-10-13 14:24:28'),
  (3346302, 8424736, '0004', '(6) 24” box Podocarpus (Swapping)', 'swapping out (9) 15 gallons for (6) 24'' box Podocarpus gracilior', NULL, 560.00, 'sold', '2020-10-13', '2020-10-13 14:29:02'),
  (3348054, 8424736, '0005', 'Address (step light)', 'Address step light installed on column above mailbox.', 'Vista light 4260M in BLACK', 240.00, 'sold', '2020-10-14', '2020-10-14 08:47:37'),
  (3348106, 8145255, '0001', 'Design Credit due', NULL, NULL, -350.00, 'pending', '2020-10-14', '2020-10-14 08:58:17'),
  (3348342, 8483337, '0001', 'Set posts with 5 bags concrete', NULL, NULL, 385.00, 'pending', '2020-10-14', '2020-10-14 09:49:37'),
  (3349125, 8406571, '0014', 'Drainage from gutters', '40 LF of 3" SDR 35 for drainage in font of home to connect to gutters and direct water away from foundation

(pricing includes labor + materials)

2 pop ups (green to match grass)
2 adapters
1 90s', NULL, 1120.00, 'sold', '2020-10-14', '2020-10-14 12:28:17'),
  (3349246, 8406571, '0015', 'Swapping mulch for gravel under large tree', 'Swapping out 100 SF of gravel for brown shredded mulch under the tree. (CREDIT)', NULL, -90.00, 'sold', '2020-10-14', '2020-10-14 12:48:33'),
  (3349876, 8424736, '0006', 'Gravel for upper level (new rose beds)', '150 SF of crushed gravel at 2" depth with weed barrier.', NULL, 550.00, 'pending', '2020-10-14', '2020-10-14 15:08:25'),
  (3349959, 8470970, '0004', 'Substrate root zone watering system', 'Rain Bird Lanscape sub-surface drip series
Rain Bird Lanscape water meter
Reduced pressure backflow
Master valve Rain Baird 1" Brass tee flow sensor
Manual shut off valve
Root zone watering system
Low flow control zone kit with PR filters
Quick coupler valve
Weatherbarsed auto controller Rainbird
Rainbird wireless sensor', NULL, 7500.00, 'pending', '2020-10-14', '2020-10-14 15:38:09'),
  (3351584, 7666319, '0011', 'Timber Steps and Retaining North Side yard.', 'Install 18 new timber steps. - $3600
Install step retainment on lower section   - $800', NULL, 4400.00, 'sold', '2020-10-15', '2020-10-15 09:21:32'),
  (3352237, 8151227, '0014', 'Adding bar top to kitchen', 'Adding elevated bar top to outdoor kitchen. Additional forming. Back splash stucco and concrete top form. 
$374.00 a linear foot. X 16 linear feet. $5974.00. Total change reduced to $2,500.00
Approved via phone call.', NULL, 2500.00, 'pending', '2020-10-15', '2020-10-15 11:31:14'),
  (3352955, 8283798, '0004', '4 new brass valves. And 9 water rings', '9 new watering rings x $64.00 each. $576.00
4 new brass valves with actuators. $210.00 each. $840.00. Total $1,416.00', NULL, 1416.00, 'sold', '2020-10-15', '2020-10-15 14:02:08'),
  (3353884, 7799379, '0021', 'Gate Bond Beam', 'Install new bond beam for gate operation.', NULL, 1200.00, 'pending', '2020-10-16', '2020-10-16 06:11:51'),
  (3354740, 8275694, '0002', 'New main lines.', 'New main line linear feet 28 linear feet X $20.00= $560.00', NULL, 560.00, 'sold', '2020-10-16', '2020-10-16 09:48:30'),
  (3354755, 8275694, '0003', 'Drainage', 'Drain pipe and caps. 60 linear feet X $18.00=. $1080.00', NULL, 1080.00, 'sold', '2020-10-16', '2020-10-16 09:52:04'),
  (3355347, 8483337, '0002', 'Soil allowance (10 yards 1850) 5 yards done', NULL, NULL, 925.00, 'pending', '2020-10-16', '2020-10-16 11:54:32'),
  (3356465, 8319489, '0001', 'Hoe plan', 'Will be applied towards contract', NULL, 400.00, 'pending', '2020-10-17', '2020-10-17 12:52:01'),
  (3358731, 8283798, '0005', '6 additional water rings. X $64.00 each. $384.00', NULL, NULL, 256.00, 'sold', '2020-10-19', '2020-10-19 11:05:35'),
  (3358771, 8283798, '0006', 'Price for 2 more for total of 6  $184.0', 'I originally put in for 4 at $256.00. Need to add for the cost of 2 more. $128.00 for a total of $384.00', NULL, 128.00, 'sold', '2020-10-19', '2020-10-19 11:12:19'),
  (3359403, 8283798, '0007', 'Additional Plumbing', '1.  Flush water heater from settlement and repair leaksabd flush  $615.00
2.  Under house additional repairs on sections of pipes     $878.00
3.  Charcoal filter set up   $570.00
Total:  $2,063.00', NULL, 2063.00, 'sold', '2020-10-19', '2020-10-19 13:07:29'),
  (3359479, 8283798, '0008', 'New Water Heater with installation', 'New water heater with installation Melinda to list the make and model number in change order', NULL, 2775.00, 'sold', '2020-10-19', '2020-10-19 13:19:22'),
  (3360059, 8151227, '0015', 'Entry walk and steps', '18 linear feet of step. $810.00. 123 sf of steps  $1353.00. Total $2,163.00.', NULL, 2163.00, 'pending', '2020-10-19', '2020-10-19 15:26:12'),
  (3362332, 8283798, '0009', 'Additional Plants owner bought / we need to buy', 'Installation only:
1.  5 Myers Asparagus fern 5 gal @ $21.50 each = $107.50
2.  2 Rosemary       5 gal @ $21.50 each = $43.00
3.  3 Plumbago     1 gal @ $10.50 each = $31.50 
4.  3 Iceberg roses   5 gal @ $21.50 each = $64.50

To order and install:
1.  3 Carissa Macrocarpa dwarf spreading 5 gal    @ $43.00 each = $129.00
2.  2 Springgerii asparagus fern  5 gal  @ $43.00 each = $86.00
3.  2 Kangaroo paw Pink Joey  1 gal @ $21.00 each = $42.00
4.  1 flat of blue fescue in 4" pots  $75.00  $75.00

Total: $578.50', NULL, 578.50, 'sold', '2020-10-20', '2020-10-20 11:05:41'),
  (3362596, 8406571, '0016', 'Backfill 50/50', '6 cubic yards 50/50 backfill', NULL, 780.00, 'sold', '2020-10-20', '2020-10-20 11:50:42'),
  (3363384, 8424736, '0007', 'Additional plants', '(2) 15g
(6) 5g
(4) 1g
(1) flat', NULL, 797.00, 'sold', '2020-10-20', '2020-10-20 14:32:58'),
  (3363574, 8283798, '0010', 'Additional plants and pebbles', '1.  2  Asparagus Springeri   5 gallon  @ $43.00=  $86.00
2.  1 lavender 5 gallon @ $43.00=  $43.00
3.  Front yard 1 additional flat of blue fescue = $75.00
Pebbles for the Fountain $99.00
Total:  $303.00', NULL, 303.00, 'sold', '2020-10-20', '2020-10-20 15:37:06'),
  (3365664, 8576758, '0001', '35ft drain pipe', NULL, NULL, 770.00, 'sold', '2020-10-21', '2020-10-21 10:43:49'),
  (3365668, 8576758, '0002', '100sqft pavers', NULL, NULL, 1500.00, 'sold', '2020-10-21', '2020-10-21 10:45:16'),
  (3366336, 8406571, '0017', 'Lights', '(3) path lights for back patio area
(2) up lights for large tree
(1) 300 watt Transformer. (More lights can be added to the transformer later for front and adding lights anywhere on property)
(1) Auto-timer', NULL, 1675.00, 'sold', '2020-10-21', '2020-10-21 12:49:49'),
  (3366491, 8283798, '0011', 'Additional Mulch', NULL, NULL, 300.00, 'sold', '2020-10-21', '2020-10-21 13:16:46'),
  (3366681, 8048471, '0001', 'Replace pool steps', NULL, NULL, 450.00, 'pending', '2020-10-21', '2020-10-21 13:51:38'),
  (3368665, 8414885, '0001', 'Grass and valve box', 'Regarding the Grass:

original in contract 575 SF X $3.50 = $2,012 in contract

New amount total 1,705 SF X $3.00 = $5,115.00

$5115.00 - $2,012.00= $3,103.00 + lowering the Valves and installing into a box $150.00

Total change order $3,103.00 + $150.00= $3,253.00', NULL, 3253.00, 'pending', '2020-10-22', '2020-10-22 09:06:08'),
  (3368709, 7937001, '0001', 'Credit for no 3D', NULL, NULL, -800.00, 'pending', '2020-10-22', '2020-10-22 09:16:19'),
  (3368752, 8048471, '0002', 'Conduit pipe for cable company', 'Setting the conduit for the cab le company 45 LF X $15.00= $675.00', NULL, 675.00, 'sold', '2020-10-22', '2020-10-22 09:25:36'),
  (3368762, 8048471, '0003', 'New Water Main Line', '60 Linear Feet to move main line to planter X $22.00= $1,320.00', NULL, 1320.00, 'sold', '2020-10-22', '2020-10-22 09:28:07'),
  (3368783, 8048471, '0004', 'Drainage', 'Drainage 40 Linear Feet with drain caps X $19.00= $760.00', NULL, 760.00, 'sold', '2020-10-22', '2020-10-22 09:35:19'),
  (3369190, 8576758, '0003', 'Changing Mulch to Gravel', 'No charge', NULL, 0, 'sold', '2020-10-22', '2020-10-22 10:56:00'),
  (3369617, 8483337, '0003', 'Custom Check Valve Cleanout', 'Change  fron adding new check valve to taking existing valve and have a custom welded adapter and cut hole. . Raise up with 4" abs anf cap off, install 6" pour a lid 

This adds an Additional $445 to the originsl agreement', NULL, 445.00, 'pending', '2020-10-22', '2020-10-22 12:15:20'),
  (3372176, 8424736, '0008', 'Credit for step lights', 'We are no longer doing 2 step lights and 1 address step light.', NULL, -720.00, 'sold', '2020-10-23', '2020-10-23 09:39:20'),
  (3372203, 8424736, '0009', '(1) 24" box Podocarpus', 'In the previous change order for Podocarpus I had counted only (6) 24" boxes and we ordered and installed (7) as per client request to make upper beds look full and tall.', 'Carter - we are not ordering this, I didn''t account for 7 boxes in initial change order for the Podocarpus boxes.', 385.00, 'sold', '2020-10-23', '2020-10-23 09:44:54'),
  (3372253, 8048471, '0005', 'Additional conduit', '60 linear feet if conduit at $15.00 a linear foot.', NULL, 900.00, 'sold', '2020-10-23', '2020-10-23 09:57:24'),
  (3372390, 8048471, '0006', 'Hose bib', NULL, NULL, 90.00, 'pending', '2020-10-23', '2020-10-23 10:32:43'),
  (3373351, 8424736, '0010', 'Credit for boulder near pool', 'Credit for not doing #5 in demo: Digging out (2) large boulders in-between grill and waterfall area.', 'We initially had planned on digging out the boulder near the pool area.  See #5 in demo on contract.
It''s okay, Client is happy with leaving it there anyways.', -250.00, 'sold', '2020-10-23', '2020-10-23 14:10:42'),
  (3373625, 8414885, '0002', 'Redo stucco', 'Scrape off existing stucco, install mesh, scratch coat, brown coat and redo stucco. 
Match existing color 
*** New stucco color will look different since it is going next to old stucco. Over time they will look more and more similar.', NULL, 1500.00, 'pending', '2020-10-23', '2020-10-23 17:35:04'),
  (3375397, 8615207, '0001', 'Additional 200sqft art turf', NULL, NULL, 1000.00, 'sold', '2020-10-26', '2020-10-26 09:08:00'),
  (3379092, 8336540, '0001', 'Design Credit due', NULL, NULL, -750.00, 'pending', '2020-10-27', '2020-10-27 09:29:31'),
  (3379163, 7240573, '0053', 'Irrigation and Added items', 'Original contract had 8 zones included.  Installed 13 zones. Including 2 zones of inline valves and 100 feet of 13 strand wire and 50 feet of standard.  - $4700

Install new 16 zone Rachio timer unit.  $350

Install 15 bags of polished mexican beach pebble.  $575

Discount given on above. ($600)', NULL, 5025.00, 'sold', '2020-10-27', '2020-10-27 09:47:56'),
  (3380841, 8576758, '0004', 'Add additional 25 liner feet of pavers', NULL, '13sqft', 195.00, 'sold', '2020-10-27', '2020-10-27 15:07:55'),
  (3381021, 7240573, '0054', 'Credit for (1) 24" Manzanita ''Dr Hurd''', NULL, NULL, -385.00, 'sold', '2020-10-27', '2020-10-27 16:23:34'),
  (3381439, 4312960, '2128710', 'Concrete Sealing 1200sqft', 'under both patio covers, and bbq top, and Fireplace bench
Pressure wash 
Seal with Natural Look Sealer
add additional drippers under "palo verde" tree ..the one first large one when you walk into the backyard', NULL, 2000.00, 'sold', '2020-10-27', '2020-10-27 23:29:27'),
  (3382993, 8414885, '0003', 'Additional bender board. 100 lf X $8.00= $800.00.', 'Mistake on linear foot count in contract by verva. Reduced to cost. $5.90 a linear foot.', NULL, 590.00, 'sold', '2020-10-28', '2020-10-28 10:44:21'),
  (3384141, 8275694, '0004', 'Adding 2 path lights', NULL, 'Approved via text', 450.00, 'pending', '2020-10-28', '2020-10-28 14:37:41'),
  (3385522, 8300912, '0001', 'New 50ft x 1-1/2" Main line', NULL, NULL, 1680.00, 'sold', '2020-10-29', '2020-10-29 08:15:33'),
  (3385665, 8300912, '0002', '280ft 8 wire multi conductor  - irrigation Wire', 'run new wire from clock to 2 locations', NULL, 659.00, 'sold', '2020-10-29', '2020-10-29 08:45:50'),
  (3386855, 8300912, '0003', 'Soil Removal', 'remove 10 yards soil from front yard', NULL, 850.00, 'sold', '2020-10-29', '2020-10-29 12:56:14'),
  (3386900, 8455994, '0001', 'New Pool Equipment Electrical', 'Install 1 gfi- at main panel
21lf 1" emt
50lf metal flex
45ft 1" pvc conduit
55 1/2" pvc for pool lighting 
(1) sub panel
includes all trenching and installation', NULL, 3218.00, 'sold', '2020-10-29', '2020-10-29 13:03:31'),
  (3389530, 7666319, '0012', 'Plant Changes - Not Inc. Specimen Trees', '1) Sub - (124) Acacia 15 gallon for additional (124) Westringia 15 gallon - No Charge
2) Add - (6) 15 Gallon Ceanothus - $1,080
3) Add - (73) 5 Gallons - 407 inc, in contract 482 delivered.  - $2,920
4) Add - (124) Acacia 5 gallons for hillside fill ins - $5,580
4) Credit - (12) 3 Gallon "El Campo"  - Not Available -  ($360)
5) Credit - (55) 7 Gallon Yucca - Not Available ($2,750)
6) Credit - (63) 2 Gallon "Dan Tangerine" - Not Availalbe ($1,260)
7) Credit - (31) 1 Gallons - 305 inc in contract 274 delivered - ($620)

Large specimin trees to be added in addtional change order depending upon placement.', NULL, 4590.00, 'sold', '2020-10-30', '2020-10-30 11:53:48'),
  (3389603, 7666319, '0013', 'Hardscape Changes', '1) Add - 3 new pilasters with rough in electrical - $1,200
2) Add - Upgrade border on northern edge walkway to a "Floating Border"  - $900
3) Add - Drainage for planter beds and roof drains to catch basins. Plus new heavy strip drain for garage (does not include grates) -$3,925
4) Add -  Retaining Walls and concrete pads for Driveway gates and Equipment. - $2,650
5) Add -  2403 additional sq feet of driveway installation - Paver upgrade on seperate line -  $25,231
6) Upgrade - Paver to Aqualina 80mm.  $2.85 extra per square foot included added demo and haul for 5321 total sq feet - $14,908
7) Add - 8 ln feet of walls. 149 with added backyard patio area, contract had 141. Walls to 2 feet average vs 18 inch in contract - $2,270

8) No Charge - For all additional demo and grading for front and side section of property due to surprise of driveway sq footage difference.', NULL, 51084.00, 'sold', '2020-10-30', '2020-10-30 12:11:12'),
  (3389768, 8300912, '0004', 'New 36" Southern Live Oak', NULL, NULL, 1375.00, 'sold', '2020-10-30', '2020-10-30 12:50:22'),
  (3389927, 8576758, '0005', 'Concrete sealer 1500sqft', NULL, NULL, 2265.00, 'pending', '2020-10-30', '2020-10-30 13:37:50'),
  (3390146, 8445141, '0004', 'Additional pavers', '35 SF extra of Courtyard pavers to avoid cut
4 LF bullnose on step
Extra Rustic Wall 10 LF', NULL, 838.00, 'pending', '2020-10-30', '2020-10-30 14:52:49'),
  (3390228, 8300857, '0001', 'Electrical', '22 Linear Feet of Electrical X $20.00', NULL, 440.00, 'pending', '2020-10-30', '2020-10-30 15:47:15'),
  (3390233, 8300857, '0002', 'Side Wall for 3 steps', 'Need to stabilize side of steps', NULL, 258.00, 'pending', '2020-10-30', '2020-10-30 15:51:32'),
  (3390252, 8300857, '0003', 'Pavers additional 36 sf', '36 Square Feet additional X $12.00= $432.00', NULL, 432.00, 'pending', '2020-10-30', '2020-10-30 15:59:56'),
  (3390263, 8300857, '0004', 'Paver Porch', '10 Linear Feet of 24" wall build X $106.00 = $1,060.00  Belgard Belaire in Bella with cap
5 Linear Feet of 18" wall on side next to steps that are already in the contract X $86.00= $430.00  Belgard Belaire in Bella with cap
80 Square feet of Pavers X $12.00= $960.00 Belgard Catalina Grana in Bella small sizes', NULL, 2450.00, 'pending', '2020-10-30', '2020-10-30 16:07:47'),
  (3390289, 8300857, '0005', 'Damage to tree', 'Damage was done by demo crew.  Permission was given to cut one tree back, but not the special bottle brush tree that the crew sawed off quite a few branches for bobcat access.', NULL, -500.00, 'pending', '2020-10-30', '2020-10-30 16:35:38'),
  (3392795, 8203699, '0001', 'Design Credit due', NULL, NULL, -400.00, 'pending', '2020-11-02', '2020-11-02 10:49:29'),
  (3392855, 8151227, '0016', 'Additional Step Build 18 LF', '18 additional Linear Feet of Step build in the back.
X $45.00= $810.00', NULL, 810.00, 'sold', '2020-11-02', '2020-11-02 11:01:03'),
  (3393941, 8602967, '0001', 'Added pavers to the back yard', 'Added pavers to the backyard 1,093 SF X $11.00, all bobcat access', NULL, 12023.00, 'pending', '2020-11-02', '2020-11-02 14:36:50'),
  (3395643, 8445141, '0005', 'A/C Screen', 'Did not install wood A/C screen', NULL, -740.00, 'pending', '2020-11-03', '2020-11-03 09:34:29'),
  (3397371, 7240573, '0055', 'Driveway railing', 'Approved via text ser images', NULL, 1994.00, 'pending', '2020-11-03', '2020-11-03 15:24:28'),
  (3397659, 8576758, '0006', 'Additional 24sf fence and 2 more posts', '24sf of fence / Priced at 29.50 per original contract = $708
2 more posts at $60/ea = $120', NULL, 828.00, 'sold', '2020-11-03', '2020-11-03 18:28:14'),
  (3397671, 8576758, '0007', 'Gate with side panel / Steel Frame & IPE', '$1480 Steel Frame for Gate and Side Panel ~5''W x 6''H
$900 Powder Coating - 40% Gloss Black
$1330 IPE Veneer over Fence', NULL, 3710.00, 'pending', '2020-11-03', '2020-11-03 18:37:24'),
  (3403294, 8151227, '0017', 'Front Yard demo and landscaping See attachment', NULL, NULL, 11120.00, 'sold', '2020-11-05', '2020-11-05 13:29:47'),
  (3405483, 7666319, '0014', 'Latest Changes', '1) Add - 2 Additional Pilasters $800
2) Credit - Remove "Floating Border" (-$900)
3) Add - Upgrade all border on driveway to double stone $2,450
4) Add - 548 additional 5 gallon gopher mesh  @ $6.95 per cage - $3,808
5) Add - Excavation with backhoe and bobcat  for 60 inch, 36 inch and  84 inch boxes, (48 inch already included in contract). Remove 2 truckloads of soils -  $3,250
6) Add - Planting 60 inch and 84 inch box trees (48 inch included in contract) 6 guys 1/2 day - $1500.  (Additional drainage not included)
7) Add - Trench and run separate zone irrigation for all large box trees.  - $1800
8) Add - Move 120 1 gallon plants (holes were dug) - $960
9) Add - Additional Gate pad - $950

Total change order $14,618', NULL, 14618.00, 'sold', '2020-11-06', '2020-11-06 10:46:41'),
  (3405758, 7240573, '0056', 'Design work by Dana', 'for plant/lighting design for back/front - multiple beds, multiple revisions.', NULL, 1200.00, 'pending', '2020-11-06', '2020-11-06 11:50:34'),
  (3408543, 8630833, '0002', '125sqft additional concrete', NULL, NULL, 1250.00, 'pending', '2020-11-09', '2020-11-09 09:25:49'),
  (3408703, 8630833, '0003', 'Extend front block wall 5ft', NULL, NULL, 375.00, 'pending', '2020-11-09', '2020-11-09 10:03:33'),
  (3409928, 8455994, '0002', 'Bead Blast Tile', NULL, NULL, 870.00, 'sold', '2020-11-09', '2020-11-09 13:45:52'),
  (3410602, 7882418, '0001', 'Design Hours', 'Over on design hours, billing for 4 additional hours @ $75/hour.

(*Provided 4 complementary additional hours as courtesy, this does not include drive time)

Thank you!', 'I am way over on design hours. Client doesn’t want to go to showrooms or pick materials based on what I send. I had Catalina Grana sent over, now I have pool tiles sent over, still no decisions,we’re still in limbo where the design is done, but now they want me to pick pool plaster, tiles. In the beginning, 2 hrs picking the color of their home for when they paint it.The design fee for this client should have been 2x. I’m now going to have to clock time w/ this client.', 300.00, 'pending', '2020-11-09', '2020-11-09 17:37:47'),
  (3410624, 8489469, '0001', 'Drain for Future Shower', 'Install 3" SDR 35 drain', NULL, 225.00, 'sold', '2020-11-09', '2020-11-09 17:52:01'),
  (3412314, 8769652, '0001', 'Driveway Extension 70sqft pavers', NULL, NULL, 579.00, 'pending', '2020-11-10', '2020-11-10 10:17:04'),
  (3412426, 8769652, '0002', '(3) 15 Gallon Fruit Trees', NULL, NULL, 600.00, 'pending', '2020-11-10', '2020-11-10 10:39:53'),
  (3412428, 8769652, '0003', 'Additional plant budget', NULL, NULL, 874.00, 'pending', '2020-11-10', '2020-11-10 10:40:29'),
  (3412692, 8300857, '0006', 'Add 2 more 3'' steps', 'Add 2 more steps before the circular paver area to lower the elevation with ease. Each step is 3'' (see attached)
Step built priced at $60/lf', 'Recommendation', 360.00, 'sold', '2020-11-10', '2020-11-10 11:33:05'),
  (3412740, 8300857, '0007', '26'' water line, 13'' gas line, 13'' electrical', '26'' water line, 13'' gas line, 7'' electrical conduit and new LB on right side of the house next to porch (See attached)
Change 6'' Electrical conduit and new LB on left side of the house (see attached, existing conduit in bad shape)
5'' sleeve under pavers, so in the future ac can be moved to the other side of the yard at no charge. 

26lf water line x $22=$572 - $52 Discount = $520
13lf gas line x $30= $455 - $65 Discount = $390
13lf electrical x $22= $286 - $26 Discount = $260', 'Recommendation', 1170.00, 'sold', '2020-11-10', '2020-11-10 11:43:00'),
  (3412753, 8300857, '0008', '20 more linear feet of planter wall', '20 more linear feet of planter wall (see attached)
Priced at $86/ lf', 'Suggestion', 1729.00, 'sold', '2020-11-10', '2020-11-10 11:45:44'),
  (3412771, 8300857, '0009', 'Remove chain link fence / Install new wooden fence', '$300 Remove existing chain link fence
$1500 build and install 20 lf of new wooden fence with 3 posts and pressure treated wood.', 'Recommendation', 1800.00, 'pending', '2020-11-10', '2020-11-10 11:49:24'),
  (3417340, 8300857, '0010', 'Remove chain link fence', NULL, NULL, 300.00, 'sold', '2020-11-11', '2020-11-11 17:00:12'),
  (3418671, 8489469, '0002', '(2) 13'' posts with welded rings for string lights', NULL, NULL, 500.00, 'sold', '2020-11-12', '2020-11-12 08:56:07'),
  (3418720, 8489469, '0003', 'pressure regulator/shut off valve for shower', NULL, NULL, 200.00, 'sold', '2020-11-12', '2020-11-12 09:08:37'),
  (3418907, 8647469, '0001', 'Additional Pavers Additional step build', 'Additional pavers around the perimieter 35 SF + 16 sf = 51 SF X $12.00= $612.00
Additional pavers in the planter area 2 X 18.5''= 37 SF X $12.00= $444.00
Additional Step build 71 Linear feet needed, 36 Linear feet in contract,  = 35 LF additional X $60.00= $2,100.00
$3,156.00', NULL, 3156.00, 'pending', '2020-11-12', '2020-11-12 09:49:57'),
  (3418998, 8489469, '0004', '15LF of pvc installed for water hookup', NULL, NULL, 350.00, 'sold', '2020-11-12', '2020-11-12 10:10:50'),
  (3419009, 8455994, '0003', 'Pool start up (by Preciado)', NULL, NULL, 650.00, 'sold', '2020-11-12', '2020-11-12 10:13:04'),
  (3420774, 8813960, '0001', 'Credit - Remove Stucco work from scope of work', NULL, NULL, -2217.00, 'sold', '2020-11-12', '2020-11-12 20:34:26'),
  (3420811, 7903624, '0005', 'Warranty/ Repairs/ (no charge)', 'see attached plan', NULL, 0, 'pending', '2020-11-12', '2020-11-12 23:59:49'),
  (3423045, 8554151, '0003', '26LF of 4" drain', 'We may only need 20LF - will determine on site when we demo', NULL, 750.00, 'pending', '2020-11-13', '2020-11-13 16:20:09'),
  (3425075, 7687226, '0012', 'Added plants to back', '7 5g California fuschia
6 5g Lantana 3
5g fountain grass
18 5gallons $783.00

3 flats dwarf chopsticks
3 flat $189.00

4 1g blue fescue
4 1gallons $86', NULL, 1058.00, 'pending', '2020-11-16', '2020-11-16 09:18:56'),
  (3425237, 8283798, '0012', 'Plumbing credit', NULL, NULL, -615.00, 'pending', '2020-11-16', '2020-11-16 09:55:19'),
  (3425266, 6455206, '0004', 'Added Planting', 'Install 

(9) 5 gallon Cassa Blue Lily flax 
(7) 5 gallon Canyon Prince.
(3) 24 inch blue podacarupus

We will need to decision on replacement', NULL, 2170.00, 'pending', '2020-11-16', '2020-11-16 09:59:43'),
  (3425275, 8585241, '0001', 'Additional pavers', '22 LF of fascia pavers (Catalina Grana)', NULL, 330.00, 'pending', '2020-11-16', '2020-11-16 10:00:39'),
  (3425308, 8585241, '0002', 'Hose bib', 'Move hose bib 3 LF over, no charge', NULL, 0, 'pending', '2020-11-16', '2020-11-16 10:10:27'),
  (3425326, 8585241, '0003', 'Additional tree removal', 'Removal of tree in bed along neighbors garage', NULL, 500.00, 'pending', '2020-11-16', '2020-11-16 10:12:59'),
  (3425361, 8585241, '0004', 'Credit for lights removal', 'Not able to cut and remove high voltage lighting.', NULL, -100.00, 'pending', '2020-11-16', '2020-11-16 10:17:14'),
  (3425430, 5049684, '0019', '(2) 36 inch Crepe Myrtle', 'Install (2) 36 inch Crepe Myrtle. Need 5 or so crew.  
Include shipping.', NULL, 2500.00, 'pending', '2020-11-16', '2020-11-16 10:29:18'),
  (3425472, 5686048, '0006', 'Install 24 inch pepper', 'Install 24 inch peppermint', NULL, 390.00, 'pending', '2020-11-16', '2020-11-16 10:37:22'),
  (3426844, 8630833, '0004', 'add water spigot in backyard', 'additional water spigot in back yard for hose in north east corner', NULL, 0, 'pending', '2020-11-16', '2020-11-16 14:56:53'),
  (3426929, 8563042, '0001', 'Drainage', '22 linear feet x $28.00= $616.00', NULL, 616.00, 'sold', '2020-11-16', '2020-11-16 15:26:58'),
  (3427094, 8647469, '0002', 'Stucco repair', NULL, NULL, 150.00, 'pending', '2020-11-16', '2020-11-16 16:44:56'),
  (3427122, 7237038, '0019', 'New concrete counter top', 'Demolition of existing concrete counter top, forming, and new pour of concrete 3,000 PSI with additional rebar.  New fiber, if wanted. Not polished, sanded 2-4 coats of sealer 
Stucco patch included
Forms need to be oiled right before the pour
Elastic additive needs to be included, exact additive to be decided with lient tomorrow 
Expansion joints need a very thin profile tooling scribe, to look like the concrete cuts, very narrow', NULL, 3200.00, 'sold', '2020-11-16', '2020-11-16 16:59:56'),
  (3429000, 7799379, '0022', 'Front Work and Support', 'Per text change approval on 11-11', NULL, 3680.00, 'sold', '2020-11-17', '2020-11-17 10:39:06'),
  (3431390, 8585241, '0005', 'Credit for flagstone', '2 flagstone not needed, credit given', NULL, -100.00, 'sold', '2020-11-18', '2020-11-18 07:45:50'),
  (3433360, 8151227, '0018', '3 new Brass Valves', NULL, NULL, 720.00, 'sold', '2020-11-18', '2020-11-18 13:35:20'),
  (3433424, 8151227, '0019', 'Weed fabric and 4 yards of gravel', 'Gravel: Palm Springs Gold', NULL, 1150.00, 'sold', '2020-11-18', '2020-11-18 13:48:25'),
  (3433781, 8300857, '0011', 'Sewer line', '22 lf of sewer line connecting existing metal pipe to new sewer line', NULL, 616.00, 'sold', '2020-11-18', '2020-11-18 15:01:29'),
  (3435529, 8585241, '0006', 'Installation of new irrigation timer', 'Installation of new irrigation timer (**CLIENT to purchase timer)
This is for running new wires and labor (time + material).', 'Victor said should take about 3 hours so I priced out 3 x $65/hr.', 195.00, 'sold', '2020-11-19', '2020-11-19 10:04:24'),
  (3441941, 8602934, '0001', '120 sf of sod', '120 aditional sf of rtf sod. At $3.50 a sf', NULL, 420.00, 'pending', '2020-11-23', '2020-11-23 09:38:39'),
  (3441951, 8602934, '0002', 'Drainage. 70 linear feet', '120 linear feet of drainage at $18.00 a linear foot.', NULL, 1470.00, 'pending', '2020-11-23', '2020-11-23 09:40:15'),
  (3442446, 8379317, '0001', 'Add 10 yards of soil for grading', NULL, NULL, 1275.00, 'sold', '2020-11-23', '2020-11-23 11:15:00'),
  (3443400, 8048471, '0007', 'Mastic credit', 'Not doing mastic.', NULL, -1000.00, 'sold', '2020-11-23', '2020-11-23 13:52:45'),
  (3445684, 7799379, '0023', 'Add clearstory openings to gate/entry', 'Add clearstory openings to entry and gate.
(No Glass)', NULL, 3850.00, 'sold', '2020-11-24', '2020-11-24 09:47:35'),
  (3450093, 8151227, '0020', 'Bender board planting only 4 trees', 'Plating only 2 15 gallon trees. 2x $75.00= $150.00
 2 24" box treed. 2x $180.00= $360.00
34 linear feet of bender board x $8.00 = $272.00
$477.00 total.', NULL, 477.00, 'sold', '2020-11-25', '2020-11-25 16:35:43'),
  (3450172, 8815412, '0001', 'Trim 3 trees', '50’ tree in the back $1425 
2 trees in the front $1100
All three together $2525', NULL, 2525.00, 'sold', '2020-11-25', '2020-11-25 17:39:26'),
  (3451540, 8815412, '0002', 'Credit Mulch and weed fabric, taking out', 'Taking out the weed guard and fabric', NULL, -1250.00, 'sold', '2020-11-27', '2020-11-27 13:23:40'),
  (3451617, 8815412, '0003', 'Additional Man Labor and demolition', 'Additional Man hours to stack a wall, no mortar, with customer providing block garden wall, on existing wall j$414.00', NULL, 1056.00, 'sold', '2020-11-27', '2020-11-27 15:35:58'),
  (3453115, 8602934, '0003', 'Additional soils.', '8 yards of 50/50', NULL, 720.00, 'pending', '2020-11-30', '2020-11-30 08:05:11'),
  (3453260, 8813960, '0002', 'Additional Items / changes', '1. Demo existing front tree and Dispose                                                                                                   $3502. Parkway , sod cut and remove grass, disposes , excavate upt to 3 yards soil approx , 150sqft    tunnel under sidewalk and install irrigation , install new Fescue grass                                                 $15623. Demo rear concrete pad ,up to 450sqft4. install (6) boston ivy along rear wall                                                                                                      $1325. Install 24" box tree in front $385                                                                                                                                                       Total $2429', NULL, 2429.00, 'sold', '2020-11-30', '2020-11-30 08:42:15'),
  (3454038, 8769652, '0004', 'Allowance', NULL, NULL, 11360.00, 'pending', '2020-11-30', '2020-11-30 11:28:06'),
  (3455493, 8585952, '0001', 'Add 3D design for front', NULL, NULL, 500.00, 'sold', '2020-11-30', '2020-11-30 17:00:52'),
  (3455507, 8554151, '0005', 'Pine Bark Mulch', NULL, 'Owner prefers this to the shredded mulch', 0, 'sold', '2020-11-30', '2020-11-30 17:06:46'),
  (3455518, 8554151, '0006', 'Pineapple Guava Tree', 'Nursery sent this tree with rest of the order, but it was canceled from order last week as owner picked up her own', NULL, 0, 'pending', '2020-11-30', '2020-11-30 17:09:35'),
  (3458327, 8713437, '0001', 'Lights- 4261 should be in black', NULL, NULL, 0, 'sold', '2020-12-01', '2020-12-01 13:52:48'),
  (3458397, 8309666, '0001', 'Posts added to contract', NULL, NULL, 800.00, 'pending', '2020-12-01', '2020-12-01 14:06:24'),
  (3458428, 8713437, '0002', 'Additional bullnose paver', 'Additional 18LF of bullnose paver in charcoal', NULL, 0, 'pending', '2020-12-01', '2020-12-01 14:12:38'),
  (3458440, 8713437, '0003', 'Additional Antique Cobble Pavers', 'Extension of each side of walkway to be 5'' total on each side from edging border
Gray Charcoal Antique Cobbles 3 piece', NULL, 300.00, 'pending', '2020-12-01', '2020-12-01 14:14:04'),
  (3458805, 8713437, '0004', 'Antique Cobble Pavers Total Amt', 'Grey-Charcoal
110sqft of 6x9 for soldier course 
840sqft for the interior', NULL, 0, 'sold', '2020-12-01', '2020-12-01 15:42:30'),
  (3463409, 8554151, '0008', 'Pergola was canceled before job start', NULL, NULL, -3700.00, 'pending', '2020-12-03', '2020-12-03 08:32:15'),
  (3463449, 8554151, '0009', 'Avocado Tree, perennials', 'Credit for (1) 5g Avo tree, (2) 5g Ceanothus and (6) 1g Aqualegia 
Addition of (2) flats of Creeping Thyme', NULL, -114.00, 'pending', '2020-12-03', '2020-12-03 08:37:38'),
  (3463941, 8585241, '0007', 'Additional electrical wiring', 'We budgeted for 12 Lineal Feet and we need 32 Lineal Feet.

Honoring original price', 'Brian approval. We messed up and didn’t catch that wire had to run BEFORE paver install. Melinda was out sick. No one caught this. We did discuss with client and Victor punching through home, client remembered this and reminded me.

They are happy though, just need to firm up our job walks and I need to firm up my addendums.', 0, 'pending', '2020-12-03', '2020-12-03 10:16:39'),
  (3465203, 7666319, '0015', 'Retaining Wall Credits/Add', 'Previous change order had 149 lin feet of garden retaining wall. Installed only 104 with back patio benching.  ($3,400) credit due.

Gate retaining walls to 24 inches with cap instead of 18 inches.   $1600.

Total retaining wall credit. $1800', NULL, -1800.00, 'sold', '2020-12-03', '2020-12-03 14:37:32'),
  (3465235, 7666319, '0016', 'Gate Loops, New Plants, Tree Drainage.', '1) Remove driveway and set gate loops.   Reset pavers.  $1,900

2) Install drainage for large specimen oak per requirements.  35 feet of trenching at 52 inches deep with drain line and drain socks.  Backfill and recompact.   $1,890

3) Install new planting ordered.  New plant list is attached:  $9,485

Total. $13,275', NULL, 13275.00, 'sold', '2020-12-03', '2020-12-03 14:44:46'),
  (3465309, 7666319, '0017', 'Added wall work for back corner and front planters', 'Install 

1) small retaining wall for front section of walkway where gravel meets decking. 2 foot by 8 foot 2 foot deep footings.   $720
2) lower wall section retaining for soils to cover pipes.  4 1/2 ft down to 1 t in 15 section on south side.  $2,525
3) 4 1/2 ft to 1 foot stepped on right 21 feet.  $3,265
4) footings to be buried 2/12 to 3 foot deep 2 feet wise.  rebar reinforced.  Remove sand bags. 
5) Install french drains and footing exits. $500 
5) Back fill sections with soils and base to raise grades for proper walkway and pipe coverages, compacted  $600
6) Grout lift walls $300
6) Install waterproofing for front planter walls,  back fill. $975', NULL, 8885.00, 'sold', '2020-12-03', '2020-12-03 15:08:58'),
  (3465331, 7666319, '0018', 'Mulch Change', 'Change mulch to "Forest Floor" at Foothill Soils per Jeff recommendation.   Price is $14 more per yard. 

Total of 65 yards.    $910', NULL, 910.00, 'sold', '2020-12-03', '2020-12-03 15:24:17'),
  (3465576, 8406571, '0018', 'Path light', 'Add (1) matching path light as requested.

Thank you Keith. Let me know if there is anything else! Nicole@picturebuild.com', NULL, 220.00, 'sold', '2020-12-03', '2020-12-03 18:01:39'),
  (3467769, 7237038, '0020', 'Design Credit due', NULL, NULL, -350.00, 'sold', '2020-12-04', '2020-12-04 13:49:05'),
  (3467927, 8151227, '0021', 'Planting credit 2x24"', NULL, NULL, -720.00, 'pending', '2020-12-04', '2020-12-04 14:38:08'),
  (3467932, 8151227, '0022', 'Adjustment invoice 32/co 20', 'From previous change order
Planting only
2 15 gallon trees. 2x $75.00= $150.00
2 24" box treed. 2x $180.00= $360.00
34 linear feet of bender board x $8.00 = $272.00

Total = $782

was billed 477.00

Difference of $305.00', NULL, 305.00, 'pending', '2020-12-04', '2020-12-04 14:40:17'),
  (3470464, 8585241, '0008', 'Additional paint for back wall', 'Paint wall - 42 ft x 8.5 ft = 357ft in Swiss Coffee

We budgeted $300 in contract. This is the difference for paint,  power wash,  extra labor.', NULL, 300.00, 'sold', '2020-12-07', '2020-12-07 09:58:44'),
  (3470555, 8160266, '0001', 'Design Credit due', NULL, NULL, -375.00, 'pending', '2020-12-07', '2020-12-07 10:15:19'),
  (3470583, 6927712, '0001', 'Design Credit due', NULL, NULL, -375.00, 'pending', '2020-12-07', '2020-12-07 10:19:10'),
  (3470940, 8769652, '0006', 'Rear Yard garden wall 75ft using Rustic Wall', 'Add border to grass area up to 75ft , using cream brown charcoal rustic wall . Set on edge', NULL, 2200.00, 'sold', '2020-12-07', '2020-12-07 11:25:55'),
  (3470998, 8769652, '0007', 'Replace rear Patio with courtyard pavers 220sqft', 'Demo existinhg patio and dispose220sqftInstall new pavers', NULL, 2000.00, 'sold', '2020-12-07', '2020-12-07 11:37:29'),
  (3471143, 8769652, '0008', 'Extend basketball court 150sqft', NULL, NULL, 990.00, 'sold', '2020-12-07', '2020-12-07 12:06:39'),
  (3472486, 2020485, '0001', 'DG Repair', NULL, NULL, 2100.00, 'pending', '2020-12-07', '2020-12-07 19:05:33'),
  (3473965, 8300857, '0012', 'Shut off valve. Part', 'Change out shut off valve', NULL, 105.00, 'sold', '2020-12-08', '2020-12-08 09:58:28'),
  (3475322, 8300912, '0005', 'Additional planting', 'Transplant move (18) 5 gallon plants per request @ $20 ea              $360
Add 
    (13) 1 gallon plants @ $22ea                                                         $286
    (19) 5 gallon plants @ $45ea                                                         $855
    (3)   36" Box olives  @ $1375ea                                                     $4125
    
Demo street tree and Dispose                                                           $450

Grade and prep parkway 200sqft                                                       $300
install 1-zone irrigation at parkway                                                      $850
install 200Sqft pebble at parkway at 3" thick                                      $425   (owner to select color)

see revised planting plan  attached                                        Total   $7651', NULL, 7651.00, 'sold', '2020-12-08', '2020-12-08 14:11:53'),
  (3477251, 8713437, '0005', 'Pressure washing brick pilasters/chimney', NULL, NULL, 250.00, 'sold', '2020-12-09', '2020-12-09 08:57:47'),
  (3477739, 8585241, '0009', 'Credit for plants', 'Had 29 (5gallons) in contract.
Only needed 22 (5gallons) according to new planting plan. 

Credit is for 7 (5gallons).', NULL, -240.00, 'sold', '2020-12-09', '2020-12-09 10:34:32'),
  (3480928, 8309666, '0002', 'Extra Grading,   Extend Outdoor Kitchen,', '1) Extend outdoor Kitchen and Bartop to 11 feet one side and 9 foot 6.  Total now is 20'' 6 inches.  16 feet included in contract  $2600
2) Wrap bar top around on east side $600
3) Grade all soils in backyard down to level grade with pool and haul. $1900 (little less than quoted earlier)', NULL, 5100.00, 'pending', '2020-12-10', '2020-12-10 09:47:21'),
  (3482362, 8585241, '0010', 'Fountain basin rocks', '5 bags of 1-2" Arroyo River Rock
Includes pick up and installation of rocks around basin.', NULL, 85.00, 'sold', '2020-12-10', '2020-12-10 14:52:54'),
  (3485694, 8815412, '0004', 'Putting mulch back in.', NULL, NULL, 1250.00, 'pending', '2020-12-12', '2020-12-12 10:55:19'),
  (3486399, 8309666, '0003', 'Front yard - extend concrete curb 30ft', 'extend concrete curb 30ft', NULL, 1680.00, 'sold', '2020-12-13', '2020-12-13 23:40:30'),
  (3486722, 8614611, '0001', 'DG for Front Entry (parkway)', '+150sqft of DG w/fabric for parkway (Texhoma) that is directly in front of entry gate', NULL, 510.00, 'sold', '2020-12-14', '2020-12-14 06:46:09'),
  (3486730, 8614611, '0002', 'Lighting (DG/concrete front paths)', '(4)Pathlights for around front entry and side garden entryway
(1) Uplight for front tree
(1) Transformer

Light order
(4) 9206 in pewter
(1) 2205 in pewter', NULL, 1535.00, 'sold', '2020-12-14', '2020-12-14 06:47:48'),
  (3486732, 8614611, '0003', 'Irrigation', 'Our irrigation specialist was on site yesterday (Thurs) and strongly recommends 9-10 zones rather than 6 zones as previously mentioned. We tried to cover the whole area with just 6 zones, but it''s not going to be enough pressure to cover all the planting areas. 

(5) Drip Zones
(5) Netafim Zones', 'The difference in price is $50 as  owner had a $2500 credit from original contract (we revised original contract of $36,395 to $33,895 after contract was signed b/c we removed some citrus trees from the total cost and this would have been credited back at the end of the project if there were no change orders).  I''ve applied the $2500 towards the additional irrigation.', 3450.00, 'sold', '2020-12-14', '2020-12-14 06:48:26'),
  (3486746, 8614611, '0004', 'Bender Board Edging', '400 +/- linear feet of bender board for DG pathways, garden bedsBender Board (4" H x 3/4" W) = $6/lf', NULL, 2400.00, 'sold', '2020-12-14', '2020-12-14 06:50:58'),
  (3486747, 8614611, '0005', 'Kurapia between pavers', NULL, NULL, 0, 'sold', '2020-12-14', '2020-12-14 06:51:27'),
  (3486770, 8614611, '0006', 'Concrete Step for Front Porch', '(1) concrete step for front porch (lt broom finish) cantilevered 7'' wide', NULL, 336.00, 'sold', '2020-12-14', '2020-12-14 06:59:53'),
  (3487465, 8615207, '0002', 'Credit due', NULL, NULL, -1000.00, 'pending', '2020-12-14', '2020-12-14 09:22:03'),
  (3491252, 8614611, '0007', '62'' of PVC Main for Irrigation', 'Replacing current galvanized pipe with pvc', NULL, 1500.00, 'sold', '2020-12-15', '2020-12-15 10:06:11'),
  (3491265, 8585241, '0011', 'Additional cost for fountain basin rocks', 'I did not estimate correctly for these rocks.  Cost did not cover the material that was ordered and installed.', NULL, 85.00, 'sold', '2020-12-15', '2020-12-15 10:09:56'),
  (3495188, 8300857, '0013', 'Additional rtf grass 108 sf.', NULL, NULL, 378.00, 'sold', '2020-12-16', '2020-12-16 12:00:28'),
  (3495999, 8614611, '0008', 'concrete extension for back patio', 'To prevent tripping hazard when stepping down onto concrete paver (to accomodate difference in inches from top of current patio to where the grade will be for paver)', NULL, 70.00, 'sold', '2020-12-16', '2020-12-16 14:56:51'),
  (3496427, 8576758, '0008', 'Add one yard of gravel', '1 yard of Del Rio 3/8" gravel. Spread in front planter to cover all exposed fabric.', NULL, 0, 'sold', '2020-12-16', '2020-12-16 18:12:41'),
  (3497064, 7666319, '0019', 'Extra Grading', 'Extra Grading in Front

First day of grading with Bobcat $3000 - Paid by Picture Build as a gesture for mistake on driveway measure - $0.00
Additional 5 days of demo, grading with Mini Skid Steer - Two guys. -$7000
Additional 3 guys one day of berm compaction - $1500', NULL, 8500.00, 'sold', '2020-12-17', '2020-12-17 07:19:04'),
  (3497806, 8769652, '0009', 'Post anchor brackets cbsq44', 'Provide (4) cbsq44 post anchors and install', NULL, 293.00, 'pending', '2020-12-17', '2020-12-17 10:06:24'),
  (3501801, 8697687, '0001', 'Move existing manifold', 'Moving existing manifolds', NULL, 300.00, 'sold', '2020-12-18', '2020-12-18 13:24:21'),
  (3502286, 8697687, '0002', 'Electrical line', '40 linear feet', NULL, 820.00, 'sold', '2020-12-18', '2020-12-18 18:56:17'),
  (3502287, 8697687, '0003', 'Transplant 11 plants', 'Moving 11 plants', NULL, 110.00, 'sold', '2020-12-18', '2020-12-18 18:58:11'),
  (3502288, 8697687, '0004', 'Gas line. 140/linear feet.', NULL, NULL, 4200.00, 'sold', '2020-12-18', '2020-12-18 19:05:56'),
  (3502289, 8576758, '0009', 'Credit for downspout', NULL, NULL, -50.00, 'pending', '2020-12-18', '2020-12-18 19:16:31'),
  (3502537, 8813960, '0003', 'Lower existing copper main line to 18" below grade', NULL, NULL, 400.00, 'sold', '2020-12-19', '2020-12-19 13:22:28'),
  (3503728, 8769652, '0010', 'Add electrical', 'Add 65 ln ft of electrical and added switch and outlet.', NULL, 1375.00, 'sold', '2020-12-21', '2020-12-21 08:15:35'),
  (3504043, 9096076, '0001', 'Added depth for demo + roadbase', 'Extra demo going 7" below grade for driveway area. 
Adding road base to driveway area $450', NULL, 450.00, 'sold', '2020-12-21', '2020-12-21 09:20:44'),
  (3504092, 9096076, '0002', 'Credit for plants', 'Credit for 2 Agave attenuata ''Nova''', 'We are only planting 2 (5gallon) agaves', -87.00, 'sold', '2020-12-21', '2020-12-21 09:28:40'),
  (3504709, 6940786, '0005', 'Additional Pavers', 'Add 280sqft pavers 
Sealer 
Includes demo

Use owner pavers from earlier job about 80sqft', NULL, 4476.00, 'pending', '2020-12-21', '2020-12-21 11:32:35'),
  (3504897, 8602967, '0002', '2 drain caps', NULL, NULL, 150.00, 'pending', '2020-12-21', '2020-12-21 12:01:23'),
  (3505056, 8602967, '0003', 'Taking out Artifiical Turf', NULL, NULL, -4680.00, 'pending', '2020-12-21', '2020-12-21 12:30:15'),
  (3505158, 8602967, '0004', '2 zones spray and RTF for front yard', 'Adding 2 zones of spray  $1,800.00
612 SF of RTF grass    $2,142.00', NULL, 3942.00, 'pending', '2020-12-21', '2020-12-21 12:47:42'),
  (3505190, 8602967, '0005', 'Back yard pavers', '40 additional SF of sicde of the house
37 additional SF in back patio
17 additional SF on lawn side of patio
94 SF total added in back X $11.00= 
$1,034.00', NULL, 1034.00, 'pending', '2020-12-21', '2020-12-21 12:55:37'),
  (3505202, 8602967, '0006', 'Added Pavers for Front', 'Front yard pavers:
17 LF on side of house
2 feet by 20 feet to extend front yard patio = 40 
Total 57 SF X $11.00= $627.00', NULL, 627.00, 'pending', '2020-12-21', '2020-12-21 12:58:54'),
  (3505469, 8362337, '0001', 'Taking out Trellis', NULL, NULL, -2800.00, 'pending', '2020-12-21', '2020-12-21 13:56:50'),
  (3505471, 8362337, '0002', 'Takingout Patio cover kits', NULL, NULL, -10000.00, 'pending', '2020-12-21', '2020-12-21 13:58:02'),
  (3506938, 8362337, '0003', 'additional pavers 154 SF', '154 SF X $12.00 = $1,848.00', NULL, 1848.00, 'pending', '2020-12-22', '2020-12-22 08:26:08'),
  (3506952, 8362337, '0004', 'Gas Line shortened by 28 LF', 'Shortened Gas Line by 28 LF X $35.00= Credit of $868.00', NULL, -868.00, 'pending', '2020-12-22', '2020-12-22 08:28:08'),
  (3507374, 7666319, '0020', 'Added Irrigation', 'Add two zones of irrigation.  Run additional 300 linear feet of drip lines and emitters for added planting.', NULL, 3800.00, 'sold', '2020-12-22', '2020-12-22 10:15:31'),
  (3507387, 7666319, '0021', 'Added Gravel for Walkways and Flagstone', '1) Add gravel and sq footage that is beyond the contracted amount already delivered.', NULL, 0, 'sold', '2020-12-22', '2020-12-22 10:18:25'),
  (3507390, 7666319, '0022', 'Front Grass', 'This is for the front grass installation that is not included in original contract.', NULL, 0, 'sold', '2020-12-22', '2020-12-22 10:19:01'),
  (3507394, 7666319, '0023', 'Custom Prefab caps for rear bench', NULL, NULL, 475.00, 'sold', '2020-12-22', '2020-12-22 10:19:51'),
  (3507400, 7666319, '0024', 'Added Landscape Timber', '1) Added roughly 30 timber steps, wall for rear seating area.  - $1500

2) Added timber for step retaining.  $ 200', NULL, 1700.00, 'sold', '2020-12-22', '2020-12-22 10:21:49'),
  (3507406, 7666319, '0025', 'Added Mulch requested', 'Add in 195 yards of mulch.  Hillsides will have to be blown in with equipment. 

Upgrade all to forest floor.', NULL, 20875.00, 'sold', '2020-12-22', '2020-12-22 10:22:29'),
  (3507408, 7666319, '0026', 'Add stakes and guide wires', 'Add 50 stakes and 8 guide wire installations.  2 guys one day plus material.', NULL, 1500.00, 'sold', '2020-12-22', '2020-12-22 10:23:38'),
  (3507418, 7666319, '0027', 'Demo and Haul Drain basin in back to dump.', NULL, NULL, 450.00, 'sold', '2020-12-22', '2020-12-22 10:27:19'),
  (3507500, 7799379, '0024', 'Neighbor fencing plus metal work.', NULL, NULL, 3000.00, 'pending', '2020-12-22', '2020-12-22 10:43:19'),
  (3507519, 7799379, '0025', 'Added front gate changes', 'Remove wood from driveway gate and driveway side of entry wall.
Install new wood on driveway gate to widen gate to fit over curve at entry wall and extend towards neighbor side. 

Remove boxed out section on Entry wall and install new wood. 

Includes $1000 credit for no longer welding extension for roof for box out section.', NULL, 6200.00, 'pending', '2020-12-22', '2020-12-22 10:48:01'),
  (3507637, 8309666, '0004', 'ADD (3) concrete pads 3x3', NULL, NULL, 600.00, 'sold', '2020-12-22', '2020-12-22 11:13:00'),
  (3508800, 8697687, '0005', 'Credit on irrigation', 'Credit of one zone $900.00. Using 3 existing valves. $175.00 x 3= $525.00 total credit $1,425.00', NULL, -1425.00, 'sold', '2020-12-22', '2020-12-22 17:10:43'),
  (3508905, 8300912, '0006', 'Hillside steps  (Credit)', NULL, NULL, -2280.00, 'pending', '2020-12-22', '2020-12-22 20:30:38'),
  (3510622, 8614611, '0009', '(4) Trees from Moon Valley', '48" Olive Tree $3000.00
(2) 36" Crepe Myrtle Tuscarora $5400.00
(1) 24" Waxed Leaf Privet $1500.00

Includes Tax, Delivery and Installation', NULL, 9900.00, 'sold', '2020-12-23', '2020-12-23 13:56:35'),
  (3510677, 8614611, '0010', 'Credit for Original Tree Selection', '(1) 36" Olive
(2) 36" Crepe Myrtle Tuscarora
(2) 15 gallon Waxed Leaf Privet', NULL, -4425.00, 'sold', '2020-12-23', '2020-12-23 14:18:02'),
  (3511270, 8769652, '0011', 'Add additional Rustic  wall curb 41ft', NULL, NULL, 1367.00, 'sold', '2020-12-24', '2020-12-24 10:20:47'),
  (3511273, 8769652, '0012', 'Putting Green  additional 65sqft', NULL, NULL, 893.00, 'pending', '2020-12-24', '2020-12-24 10:22:24'),
  (3511277, 8769652, '0013', 'Garden box upgrade to Rustic wall', 'upgrade from pressure treated  to Rustic wall 

boxes approx 5x10 , inner dimension approx 4x8
install 3 courses approx 12" in height

thinset each course in place, set over 4" bagged concrete base to secure', NULL, 1308.00, 'sold', '2020-12-24', '2020-12-24 10:26:41'),
  (3511422, 8630833, '0005', 'Upgrade to Del Rio Gravel 1630sqft', NULL, NULL, 2363.00, 'sold', '2020-12-24', '2020-12-24 15:14:08'),
  (3511423, 8576758, '0010', 'Add electrical outlet', 'install electrical', NULL, 550.00, 'pending', '2020-12-24', '2020-12-24 15:15:43'),
  (3514266, 6455206, '0005', 'Podocarpus Chagne', 'Purchase Podocarpus from Green Thumb nursery.  $500 added to cost from this source.', NULL, 500.00, 'pending', '2020-12-29', '2020-12-29 07:34:00'),
  (3514722, 7958649, '0002', 'Design Credit due', NULL, NULL, -375.00, 'pending', '2020-12-29', '2020-12-29 09:40:25'),
  (3514739, 8896008, '0001', 'Design Credit due', NULL, NULL, -375.00, 'pending', '2020-12-29', '2020-12-29 09:44:06'),
  (3515195, 8300808, '0001', 'Walls Change in Design', 'Please see attached document  New drawing of walls will be in current design under Wall Design', NULL, 5719.00, 'pending', '2020-12-29', '2020-12-29 11:50:31'),
  (3515228, 8300808, '0002', 'taking out 2 path lights', 'Taking out 2 path lights', NULL, -450.00, 'pending', '2020-12-29', '2020-12-29 12:03:43'),
  (3515790, 8769652, '0014', 'Credit  - 2 footings', NULL, NULL, -560.00, 'pending', '2020-12-29', '2020-12-29 15:30:24'),
  (3515855, 9067501, '0001', 'Remove Pavers , ADD lawn, DG, irrigation etc', 'ADD  -
 lawn 275sqft                                                             $1039
Bender Board for lawn and DG Area 120ft               $720
1-Zone Rain Bird pop-ups for additional lawn          $850
Decomposed Granite 550sqft                                  $2965
                                                                         Total $5574
Remove  - Pavers from Contract -                          -$8316

                                                                            Credit -$2742', NULL, -2742.00, 'pending', '2020-12-29', '2020-12-29 16:15:29'),
  (3515867, 9067501, '0002', 'Front Lawn - additional', 'add 462sqft additional lawn to front yard             $1732
1-zone rainbird pop-ups                                       $850
tunnel under driveway to install irrigation              $480
additional cleanup                                                $474

Total Additional cost                                            $3536', NULL, 3536.00, 'pending', '2020-12-29', '2020-12-29 16:22:04'),
  (3517353, 8962358, '0001', 'Adding 35 LF of main line', 'Adding 35 LF of main pvc line to new manifold area located in back side yard.

We originally budgeted for 17 LF but after reviewing,  we decided an additional 35 LF was needed to go from front of home to back.

Nacho will add a T and cap it for phase 2 (*front yard irrigation and valves)', NULL, 875.00, 'sold', '2020-12-30', '2020-12-30 12:47:42'),
  (3517359, 8962358, '0002', 'Repair of concrete slab - credit', 'We are not repairing concrete slab, this will be done in another phase.', NULL, -200.00, 'sold', '2020-12-30', '2020-12-30 12:48:56'),
  (3517391, 8962358, '0004', 'Tree removal - credit', 'Not removing little tree', NULL, -140.00, 'sold', '2020-12-30', '2020-12-30 12:57:20'),
  (3517867, 8962358, '0005', 'Concrete pours (credit) and sod', 'Concrete and forming credit + $430
Extra 48 SF of Valley RTF Sod - $180 (complementary)', 'Total sod: 1,130 SF (12/30/2020)', -430.00, 'sold', '2020-12-30', '2020-12-30 16:18:28'),
  (3518387, 7808502, '0007', 'Additional 70 LF. Drainage', NULL, NULL, 1680.00, 'pending', '2020-12-31', '2020-12-31 08:19:28'),
  (3518643, 8602967, '0007', '50 more sf for front pavers. X $11.00= $550.00', '50/more sf pavers in front.', NULL, 550.00, 'sold', '2020-12-31', '2020-12-31 10:05:10'),
  (3521263, 8896010, '0001', 'Design Credit due', NULL, NULL, -375.00, 'pending', '2021-01-04', '2021-01-04 11:17:19'),
  (3523249, 8309666, '0006', 'Pet odorizer', NULL, NULL, 432.00, 'sold', '2021-01-05', '2021-01-05 08:06:18'),
  (3523350, 8309666, '0007', '7 yards Additional soil removal over 10 included', NULL, NULL, 1260.00, 'sold', '2021-01-05', '2021-01-05 08:28:33'),
  (3524137, 8813960, '0004', 'Credit  - planting allowance adjustment', 'after tally of planting to be installed per finalized design vs budget, a credit is issued of $43', NULL, -43.00, 'pending', '2021-01-05', '2021-01-05 11:13:55'),
  (3528572, 8630833, '0006', 'Permits Gas and Electrical Etc', '$2500 Allowance  - not to exceed without further approval
Handle permits for owner at the Rate of $120hr + permits fees and costs, 
includes Drawing plans, Permit running, etc

Additional work or installation  to be performed to pass inspection additional at owners expense

Declined =  Owner to submit and handle all permits and costs
Approved  = Picture Build to handle all fees and permitting submittal and meeting with inspector', NULL, 2500.00, 'pending', '2021-01-06', '2021-01-06 15:33:38'),
  (3530896, 5686048, '0007', 'additional work', NULL, NULL, 390.00, 'pending', '2021-01-07', '2021-01-07 12:09:58'),
  (3531490, 6940786, '0006', 'Front Driveway Etc', 'Driveway: 
    1. Demo Existing Driveway, excavate for paver work and Dispose
    2. install 4" compacted base
    3. 1" Screed sand
    4. install 2000sqft pavers , 32ft bullnose and joint sand
    5. install water based natural look sealer after completion 
            Price $25,460

Drains 120ft  - Price $2640

package price $27,800', NULL, 27800.00, 'pending', '2021-01-07', '2021-01-07 14:04:56'),
  (3531740, 9118512, '0001', 'Credit for Irrigation,', 'Emitters attached to every temporary pot, tapping into existing drips', NULL, -700.00, 'sold', '2021-01-07', '2021-01-07 15:14:31'),
  (3531843, 8630833, '0007', '6 station sprinkler  timer installed', NULL, NULL, 650.00, 'pending', '2021-01-07', '2021-01-07 15:50:13'),
  (3531920, 8697687, '0006', 'Taking out plants', 'Taking out the Fuerte 15 gal. And one hot poker 1gal.', NULL, -196.00, 'pending', '2021-01-07', '2021-01-07 16:29:41'),
  (3533741, 8602967, '0008', 'Additional grass', '52 more sf of rtf for planter area', NULL, 182.00, 'sold', '2021-01-08', '2021-01-08 11:38:24'),
  (3534472, 8614611, '0011', 'Irrigation Control Timer', NULL, NULL, 300.00, 'sold', '2021-01-08', '2021-01-08 14:53:51'),
  (3534479, 8614611, '0012', 'Credit for (5) 1gallon Santolina', NULL, NULL, -107.50, 'sold', '2021-01-08', '2021-01-08 14:55:12'),
  (3537232, 9118512, '0002', 'Credit for French Drain', 'If French Drain does need to be moved after pool demo, we will add this back as a change order', NULL, -400.00, 'sold', '2021-01-11', '2021-01-11 11:04:49'),
  (3539955, 8602967, '0009', 'Pilaster', 'Pilaster stucco and Bella Crete cap height flat cap to have light. Light and wiring by others. 16" x16"', NULL, 400.00, 'pending', '2021-01-12', '2021-01-12 08:45:59'),
  (3541360, 8602967, '0010', 'Bender Board 34 LF', NULL, NULL, 272.00, 'pending', '2021-01-12', '2021-01-12 12:44:23'),
  (3541965, 8668349, '0001', 'Gas Line 20 more LF', '20 additional LF X $35.00= $700.00', NULL, 700.00, 'pending', '2021-01-12', '2021-01-12 14:56:07'),
  (3541973, 8668349, '0002', 'Water Main Line 1"', '97 LF X $18.00', NULL, 1746.00, 'pending', '2021-01-12', '2021-01-12 14:57:47'),
  (3541981, 8668349, '0003', 'Electrical', '$20.00 X 85 LF', NULL, 1700.00, 'pending', '2021-01-12', '2021-01-12 14:59:25'),
  (3541991, 8668349, '0004', 'Drainage Credit', '98 LF X $18.00 a LF= $1,764.00', NULL, -1764.00, 'pending', '2021-01-12', '2021-01-12 15:01:03'),
  (3542008, 8668349, '0005', '18 More SF to widen the walkways', NULL, NULL, 216.00, 'pending', '2021-01-12', '2021-01-12 15:06:39'),
  (3543542, 8813960, '0005', '4 additional 1 gallon Senecio', NULL, NULL, 88.00, 'sold', '2021-01-13', '2021-01-13 09:17:50'),
  (3544261, 8962358, '0006', 'Additional soil and steel', 'Raised sod area to level (not a slope as in design). 

6 cubic yards 50/50 soil.
Additional 16” steel and rebar (along olive trees) to allow sod to be raised to level. Additional welding and labor. ($100 discount)', 'This brings us exact to budget for steel edging and little retaining wall. (I think)', 1150.00, 'sold', '2021-01-13', '2021-01-13 11:48:35'),
  (3544802, 8813960, '0006', 'Additional 1/2 yard of rock installed', NULL, NULL, 284.00, 'pending', '2021-01-13', '2021-01-13 13:24:17'),
  (3545441, 8962358, '0007', 'Additional soil', '8 cubic yards of 50/50 backfill

(Will credit if we do not use all)', NULL, 1600.00, 'pending', '2021-01-13', '2021-01-13 15:31:15'),
  (3545590, 7237038, '0021', 'Step credit (Adjusted with 7% discount)', '3 linear feet not installed $55.80 / lnft', NULL, -167.40, 'pending', '2021-01-13', '2021-01-13 16:42:19'),
  (3545595, 7237038, '0022', '4 additional LF of A/C wall', '4 linear feet of wall and rised height', NULL, 892.80, 'pending', '2021-01-13', '2021-01-13 16:44:26'),
  (3545609, 7237038, '0023', '69 Additional SF of Pavers', '69 Sf of pavers in final count', NULL, 770.04, 'pending', '2021-01-13', '2021-01-13 16:49:58'),
  (3549159, 8668349, '0006', 'Additional pavers.', '2.5 feet x 5 feet. 12.5 feet x $12.00.', NULL, 150.00, 'pending', '2021-01-14', '2021-01-14 16:33:08'),
  (3549160, 8668349, '0007', 'Additional gas line', '16 linear feet', NULL, 550.00, 'pending', '2021-01-14', '2021-01-14 16:34:44'),
  (3554611, 9118685, '0001', '8 additional lf of root barrier', NULL, NULL, 337.00, 'pending', '2021-01-18', '2021-01-18 10:18:26'),
  (3558312, 7799379, '0026', 'Move 20 LF. drain line (minus materials)', NULL, NULL, 415.00, 'sold', '2021-01-19', '2021-01-19 10:19:57'),
  (3558327, 7799379, '0027', '45 LF. Additional water main', NULL, NULL, 990.00, 'sold', '2021-01-19', '2021-01-19 10:22:14'),
  (3559848, 7799379, '0028', 'Mulch', 'Mulch front yard. Natural brown Double Shredded.

950 sq feet at $1.00 per foot.', NULL, 950.00, 'sold', '2021-01-19', '2021-01-19 15:10:01'),
  (3563869, 8739112, '0001', 'Temporary Fence', NULL, NULL, 469.00, 'sold', '2021-01-20', '2021-01-20 16:53:45'),
  (3563873, 8739112, '0002', 'Bender board for back border garden', '60 linea feet to separate gravel from sod', NULL, 360.00, 'sold', '2021-01-20', '2021-01-20 16:54:53'),
  (3563879, 8739112, '0003', 'Credit for step landing', 'No longer a need for the step/landing off guest house, there will only be a 2-3" step down from threshold to flagstone', NULL, -780.00, 'sold', '2021-01-20', '2021-01-20 16:56:25'),
  (3563880, 8739112, '0004', 'Pressure/Acid Wash Flagstone', NULL, NULL, 250.00, 'sold', '2021-01-20', '2021-01-20 16:56:53'),
  (3563948, 8739112, '0005', 'Credit For Electric', 'No electrial being installed', NULL, -1125.00, 'sold', '2021-01-20', '2021-01-20 17:29:56'),
  (3563950, 8739112, '0006', 'Additional Brick for Patio', 'Will need an additional 100sqft for patio area', NULL, 2300.00, 'sold', '2021-01-20', '2021-01-20 17:33:19'),
  (3563957, 8739112, '0007', 'Credit for Driveway Apron', 'Not installing at this time', NULL, -2055.00, 'sold', '2021-01-20', '2021-01-20 17:36:54'),
  (3567111, 8300912, '0007', 'Upgrade to jet black 1/2" pebble', NULL, '1/4-3/8 black polish pebbles nstone99 from prime', 453.00, 'sold', '2021-01-21', '2021-01-21 15:43:27'),
  (3567362, 9118718, '0001', 'Ball valve', NULL, NULL, 90.00, 'pending', '2021-01-21', '2021-01-21 18:15:19'),
  (3567363, 9118718, '0002', '3 additional 15 gal plants x $150.00= $450.00', NULL, NULL, 450.00, 'pending', '2021-01-21', '2021-01-21 18:17:06'),
  (3569675, 9118718, '0003', '3% cc fee change orders', NULL, NULL, 16.20, 'pending', '2021-01-22', '2021-01-22 13:00:04'),
  (3570209, 8739112, '0008', 'Electrical for Gate', 'Includes 80 linear feet of wire, 3/4 inch conduit with (3) 12 gauge wiring $1600.00
Plus wiring for electrical panel $400.00', NULL, 2000.00, 'sold', '2021-01-22', '2021-01-22 15:26:35'),
  (3570620, 8300808, '0003', 'Additional pavers in the back to fill in planter', '24 additional sf for back yard planter.', NULL, 264.00, 'pending', '2021-01-23', '2021-01-23 10:31:33'),
  (3576166, 8300808, '0004', 'changing gravel to honey gold 1/2"', NULL, NULL, 212.00, 'sold', '2021-01-26', '2021-01-26 08:57:14'),
  (3580168, 7666319, '0028', 'Added items', '1) Ordered 10 yards of California Gold beyond contract which equals roughly 1350 added sq feet of ground covering. 
Total add $4,860
2) Saw cut driveway entry aprons  demo, form, rebar and pour.  Remove house entry paver, form, rebar and pour 
Total add $4800
3) Added retaining wall work to provide best possible footings.  
Original change order: south side wall - 4 1/2 to 1 foot down.  Actual install was 6 feet to 2 foot down 
Original change order:  east side wall - 4 1/2 feet to 1 foot down. Actual install was  6 feet to 2 feet down
Added additional 8 linear feet of retaining wall for upper walkways per request.  No charge for later reworking angle per additional client request.
Total add $3600
4) Add more landscape timber step retaining for rear seat wall areas per designed layout and gate entry
Original change order: 30 linear feet .  Actual installation 53 linear feet    No charge for rework design per client additional client request.
Total add $1150', NULL, 14410.00, 'sold', '2021-01-27', '2021-01-27 09:29:46'),
  (3580434, 7799379, '0029', 'Back and Side Yard Projects', 'This is for the back and side projects as bid earlier.  
This does not cover other items that were excluded in previous bids like the northwest transition 

Pricing and scope exactly as per earlier bids with no additional items added.

Please see the attached change order addendum for a breakdown.

Payments will be scheduled according to progress sections and will be entered into the invoicing section of Builder Trend.', NULL, 164214.00, 'sold', '2021-01-27', '2021-01-27 10:24:44'),
  (3582634, 7666319, '0029', 'Mulching credit', 'I found a mulch blowing service that works with my mulch supplier that was much cheaper.  Passing the savings on.', NULL, -4000.00, 'pending', '2021-01-27', '2021-01-27 21:25:10'),
  (3582655, 8769652, '0015', 'planting order  - approved via email', '15 Gallon Fruit Trees 1 each @ $200 each x 10 = $2,000
1) Navel Orange (seedless preferred)
2) Valencia Orange (seedless preferred)
3) Meyer Lemon
4) Keffir Lime
5) Pomegranate
6) Thai White Guava
7) Indian White Guava
8) Tangerine (seedless preferred)
9) Tangerine (seedless preferred)
10) Tangerine (seedless preferred)

Approved items: 5 gallon plants - $45 each x 67 = $3015
Please note - The Green Mountain Boxwood we put the corkscrew shape and I previously provided links for several items on the list. Let me know if you have any questions.
 

	
		
			4
			Green Mountain Boxwood (Corkscrew shaped tree)
		
		
			3
			Avalanche Feather Reed Grass
		
		
			3
			Dasylirion Wheeleri 
		
		
			3
			Cordyline Pink Passion 
		
		
			4
			Purple Fountain Grass
		
		
			4
			Helictrotrichon Sempervirens (Blue Oat Grass)
		
		
			2
			Green Mountain Boxwood (Corkscrew shaped tree)
		
		
			3
			Chondropetalum tectorum 
		
		
			15
			New Zealand Flax (Pink Stripe, Purple, Green)
		
		
			8
			Margaret Merril Roses
		
		
			3
			Purple Fountain Grass
		
		
			3
			Helictrotrichon Sempervirens (Blue Oat Grass)
		
		
			2
			Purple Fountain Grass
		
		
			2
			Helictrotrichon Sempervirens
		
		
			8
			Carpet Roses
		
	


Owner Provided Plants planted at $20 each x 19 = $380 no warranty

Total Approved is $2000+$3015+$380 = $5395
owner to be available on plant day to place each plant - office and project manager coordinate', NULL, 5395.00, 'pending', '2021-01-27', '2021-01-27 21:56:22'),
  (3584144, 8300808, '0005', 'French Drain with waterproffing', 'excavating up to 24: down connect to existing drainage, wat3er proof back of gunite around pool with 2 coats henry''s Tar, set perforated pipe in sock sleeve, back fill with gravel.  Set RTF over gravel to patch', NULL, 2870.00, 'pending', '2021-01-28', '2021-01-28 10:27:37'),
  (3585874, 8739112, '0009', 'Sand finish for driveway/garage', 'Topcast #1/Sand Finish for 1100 sqft of concrete (d/way+garage)', NULL, 825.00, 'sold', '2021-01-28', '2021-01-28 17:53:51'),
  (3585878, 8739112, '0010', 'Extending front brick walkway to driveway', 'Demo 20.5sqft of existing brick pathway
Install additional 12sqft of reclaimed bricks to join up to concrete', NULL, 355.00, 'sold', '2021-01-28', '2021-01-28 17:55:32'),
  (3585888, 8739112, '0011', 'Redo side door stairway', 'Demo existing steps
Rebuild steps in poured concrete with brick veneer face and overlay
Steps will be 18''-8" long x 48"H from threshold, with (2) separate landings at 8''6" x 4'' + 6 x 4'' with (3) steps down each with 17.5" treads and 6" risers (see sketch)', NULL, 3600.00, 'sold', '2021-01-28', '2021-01-28 18:02:50'),
  (3587270, 8739112, '0012', 'Credit for original step extension', NULL, NULL, -400.00, 'sold', '2021-01-29', '2021-01-29 09:35:10'),
  (3588781, 7799379, '0030', 'Permits', 'Cost for permits and expediting fees.', NULL, 2208.00, 'sold', '2021-01-29', '2021-01-29 15:20:13'),
  (3590960, 9325191, '0001', 'Bullnose steps instead of regular pavers', 'Upgrade to bullnose steps 5.5 LF x 2 steps', NULL, 100.00, 'pending', '2021-02-01', '2021-02-01 09:00:27'),
  (3590998, 9325191, '0002', 'Add Pet deodorant to turf area', NULL, NULL, 100.00, 'pending', '2021-02-01', '2021-02-01 09:07:39'),
  (3592143, 8630833, '0008', 'Various items (listed)', '(4) metal stakes             $380
100ft Metal Edging         $1200
3 yards Del Rio               $900
1/2 yard  DG                   $265', NULL, 2745.00, 'sold', '2021-02-01', '2021-02-01 12:36:02'),
  (3593116, 9285263, '0001', 'Design Credit', NULL, NULL, -750.00, 'pending', '2021-02-01', '2021-02-01 15:55:59'),
  (3593125, 8274761, '0001', 'Design Credit due', NULL, NULL, -375.00, 'pending', '2021-02-01', '2021-02-01 15:59:42'),
  (3593130, 8245875, '0001', 'Design Credit due', NULL, NULL, -375.00, 'pending', '2021-02-01', '2021-02-01 16:01:39'),
  (3594397, 9325191, '0003', 'Drainage', 'Drain grate 14 LF, 
labor for drain, 
coring of curb at driveway
2 extra LF of SDR pipe.', 'Extra $100 added for turf upgrade (found out price and process after I had already given turf change order so added it here)', 750.00, 'sold', '2021-02-02', '2021-02-02 07:59:09'),
  (3595037, 9265745, '0001', 'Del Rio Gravel 3/4" for front yard', 'Install roughly 460sqft of 3/4 Del Rio gravel for remainder of front yard at 3" deep', NULL, 2200.00, 'sold', '2021-02-02', '2021-02-02 10:14:07'),
  (3595039, 9265745, '0002', 'Gopher Mesh for Front Yard', 'Install roughly 460sqft of mesh under gravel/cost tbd', NULL, 0, 'sold', '2021-02-02', '2021-02-02 10:14:44'),
  (3596596, 9255525, '0001', 'additional Pavers  104= 30 + 74', '30 additional pavers at BBQ area
74 more SF in front of the gates
104 more total
$1,367.00', NULL, 1367.00, 'pending', '2021-02-02', '2021-02-02 15:19:53'),
  (3596609, 9255525, '0002', '3 additional lights', 'one uplight and 2 path lights', NULL, 675.00, 'pending', '2021-02-02', '2021-02-02 15:21:36'),
  (3596629, 9255525, '0003', 'Plant changes', 'adding 1 24" box  $360.00
taking out 1 15 gallon --$175.00
adding 6 5 gallon @ $43.00=  $258.00
adding 12 1 gallon @ $21.00= $252.00
Total $695.00', NULL, 695.00, 'pending', '2021-02-02', '2021-02-02 15:27:21'),
  (3596968, 9089392, '0001', 'Add top cast 1 (sand finish)', NULL, 'Approved via text', 408.75, 'pending', '2021-02-02', '2021-02-02 17:32:58'),
  (3599321, 9118708, '0001', 'Bender board', '58 lf of bender board. 28 lf of 6"30 lf of 4"', NULL, 464.00, 'pending', '2021-02-03', '2021-02-03 12:13:52'),
  (3599408, 9118708, '0002', 'Lift pavers to find drains estimate.', NULL, NULL, 390.00, 'pending', '2021-02-03', '2021-02-03 12:25:36'),
  (3600257, 8697687, '0007', 'Credit Moringa 15 gallon', 'Taking out 1 15 gallon plant', NULL, -175.00, 'pending', '2021-02-03', '2021-02-03 15:05:18'),
  (3602170, 9375449, '0001', 'Additional plant budget', 'Original Contract Budget $7573
owner request upgrade to (7) shrubs from 15 to 24" box
additional cost to budget $1457', NULL, 1457.00, 'pending', '2021-02-04', '2021-02-04 09:46:31'),
  (3602587, 9294501, '0001', 'Additional planting Allowance for 24" box trees', 'original allowance $3700
owner upgraded (2) trees to 24" box
additional allowance needed $203
total plant budget $3903', NULL, 203.00, 'sold', '2021-02-04', '2021-02-04 11:05:14'),
  (3602793, 9265745, '0005', 'Additional step', '(1) more step will be added at 6 linear feet', NULL, 116.00, 'sold', '2021-02-04', '2021-02-04 11:49:27'),
  (3602916, 8300912, '0008', '(3) 5 Gallon plants for the fountain', '(3) 5 gallon Dwarf Horsetail  - Equisetum scirpoides planted in the front fountain', NULL, 135.00, 'sold', '2021-02-04', '2021-02-04 12:13:25'),
  (3602978, 8769652, '0016', 'Change Decomposed Granite to Gravel (no charge)', 'change Decomposed granite around garden area to Del-rio gravel , no additional or change in price', NULL, 0, 'pending', '2021-02-04', '2021-02-04 12:24:03'),
  (3602991, 8769652, '0017', 'Install (2) light posts with concrete', 'install (2) owner provided light posts, 
includes excavation and installation with up to 4 bags concrete

$325', NULL, 325.00, 'sold', '2021-02-04', '2021-02-04 12:25:22'),
  (3604204, 9255525, '0004', 'one more light, uplight', 'needed one more for a total count of 12 lights', NULL, 225.00, 'sold', '2021-02-04', '2021-02-04 18:38:37'),
  (3604221, 9198585, '0001', '2 15 gallon trees', 'There is one 15 gallon in the contract, they want 2 more', NULL, 350.00, 'pending', '2021-02-04', '2021-02-04 18:52:27'),
  (3607243, 9359454, '0001', '12"x13ft slumpstone block wall around front tree', NULL, NULL, 845.00, 'sold', '2021-02-05', '2021-02-05 23:42:18'),
  (3607244, 9359454, '0002', 'Remove Ivy around Trash Can area', NULL, NULL, 650.00, 'pending', '2021-02-05', '2021-02-05 23:42:59'),
  (3607245, 9359454, '0003', 'Add additional Vine Wire on block wall', NULL, NULL, 85.00, 'sold', '2021-02-05', '2021-02-05 23:43:42'),
  (3611361, 8697687, '0008', 'Replace 2 valves (PVC)', 'Must be installed at the same time as yard checks or while completing punch list.', NULL, 200.00, 'sold', '2021-02-08', '2021-02-08 18:06:52'),
  (3612427, 9144542, '0001', 'Changing out metal edging to vinyl bender board.', 'Credit for vinyl tree ring. $35.00crefit for vinyl bender board replacing metal edging. $4.00 x 86 =$344.00total credit $379.00', NULL, -379.00, 'pending', '2021-02-09', '2021-02-09 08:22:36'),
  (3612737, 9118708, '0003', 'Additional 11 LF of drainage', NULL, NULL, 242.00, 'sold', '2021-02-09', '2021-02-09 09:18:44'),
  (3614092, 8668349, '0008', 'Fountain Connection', 'Connection from water supply to  fountain', NULL, 300.00, 'pending', '2021-02-09', '2021-02-09 13:14:45'),
  (3614677, 7666319, '0030', 'Additional Changes', '1) Install gopher mesh for lawn section  $2,850
2) Regrade south section of yard near driveway. Compact in lifts $3,400 
3) Waterproof, add drainage and backfill retaining wall $1,200', NULL, 7450.00, 'pending', '2021-02-09', '2021-02-09 15:18:03'),
  (3614787, 7666319, '0031', 'Rear yard berm, culvert, drainage and recompaction', 'Handle back section of soils issue on property Includes:

Install 92 ln feet of 3 foot deep concrete berm w/key.  (best guess as to depth of hard soils section could be lower or higher.  Will adjust up or down accordingly. About 27 yards of concrete poured and roughly 20 yards of soils removal. 10 yards to remain on site and be compacted in lifts on hillside. Includes regrading existing erosion damage and recompacting existing soils section as best as possible on outer section of fence line. Cannot guarantee soils movement in those sections without pulling entire previous soils fill and replacing and compacting in lifts.

Moving existing plants and irrigation and replant when done in sections in front of a behind rear fence line

Installing 92 ln feet of concrete culvert

Install 2 concrete catch basins (grates additional)

Installing 136 linear feet of 8 inch pipe to connect to basin and run under timer wall and gravel path to lower valley', NULL, 26900.00, 'pending', '2021-02-09', '2021-02-09 15:47:14'),
  (3616397, 8379317, '0002', 'Raise Gate', NULL, NULL, 335.00, 'pending', '2021-02-10', '2021-02-10 09:11:51'),
  (3620913, 8769652, '0018', '2 15gal guava''s credited', NULL, NULL, -400.00, 'pending', '2021-02-11', '2021-02-11 11:42:01'),
  (3621492, 9118708, '0004', 'Install 120 sf of pavers x $11.00 sf', NULL, NULL, 1320.00, 'sold', '2021-02-11', '2021-02-11 13:21:25'),
  (3622496, 9255525, '0005', 'Gas Line Credit', '59 Linear Feet credit, $1,888.00', NULL, -1888.00, 'pending', '2021-02-11', '2021-02-11 20:41:22'),
  (3623683, 8769652, '0019', '5gal plant adjustments', '20 5gals not installed     ($900)
2 5gals left on site           $40

Total credit $860', NULL, -860.00, 'pending', '2021-02-12', '2021-02-12 09:25:27'),
  (3624116, 9265745, '0006', 'Cancel fence re-attachment', NULL, NULL, -250.00, 'sold', '2021-02-12', '2021-02-12 10:57:39'),
  (3624122, 9265745, '0007', 'Rent Low Boy for Dirt Haul Out', 'Will try and also haul out existing mound of dirt beneath wall if there''s room in dumpster', NULL, 500.00, 'sold', '2021-02-12', '2021-02-12 10:58:38'),
  (3624716, 8926582, '0001', 'cancel check credit', NULL, NULL, -25.00, 'pending', '2021-02-12', '2021-02-12 13:10:30'),
  (3625196, 8300808, '0006', 'Credit for 1 gallon plants 17. Using flats instead', NULL, NULL, -200.00, 'pending', '2021-02-12', '2021-02-12 15:50:29'),
  (3627190, 8300808, '0007', 'mailed check 238', NULL, NULL, 238.00, 'pending', '2021-02-15', '2021-02-15 09:33:04'),
  (3628828, 8300808, '0008', 'Additional up light', NULL, NULL, 250.00, 'pending', '2021-02-15', '2021-02-15 16:31:06'),
  (3630329, 9144542, '0002', 'Extra cal.gold', 'Extra gravel for side planter', NULL, 150.00, 'pending', '2021-02-16', '2021-02-16 09:34:27'),
  (3631319, 9089392, '0002', 'Plant credit: 11- 1gal. (6 gazenia and 5 nepeta)', NULL, NULL, 236.50, 'sold', '2021-02-16', '2021-02-16 12:43:04'),
  (3631362, 9089392, '0003', 'Credit for lawn strips  (240 SF.)', NULL, NULL, -1080.00, 'pending', '2021-02-16', '2021-02-16 12:49:38'),
  (3632266, 7666319, '0032', 'Driveway wall and add timbers', '1) Install 63 linear feet of Modular wall with cap on side of driveway. $5,040
2) Install additional 11 feet of timber wall next to transitions steps from grass area to path down for  lower parking. $770', NULL, 5810.00, 'pending', '2021-02-16', '2021-02-16 16:24:06'),
  (3632383, 9390377, '0001', 'Upgrading to Split Face Block in White', NULL, NULL, 600.00, 'sold', '2021-02-16', '2021-02-16 17:43:38'),
  (3632419, 8309666, '0008', 'Additional black polished pebbles', NULL, 'Customer approved by text', 140.00, 'pending', '2021-02-16', '2021-02-16 18:10:19'),
  (3632443, 9089392, '0004', 'Cancel out #2 change order', 'Entered an charge instead of a credit', NULL, -236.50, 'pending', '2021-02-16', '2021-02-16 18:28:45'),
  (3632446, 9089392, '0005', 'Credit for 11 1 gallon', NULL, NULL, -231.00, 'pending', '2021-02-16', '2021-02-16 18:30:41'),
  (3633529, 8739112, '0013', 'Repair brick on back patio', NULL, NULL, 500.00, 'sold', '2021-02-17', '2021-02-17 08:54:56'),
  (3635359, 9144542, '0005', '1- 15 gal. Little Olie', NULL, NULL, 316.00, 'pending', '2021-02-17', '2021-02-17 15:14:14'),
  (3635364, 9144542, '0006', '1-15 gal bougainvillea', NULL, NULL, 175.00, 'pending', '2021-02-17', '2021-02-17 15:14:53'),
  (3635900, 9255644, '0002', '50 sf of pavers.', 'Pavers are already at job site for the steps. This is for area on right of driveway.', NULL, 550.00, 'pending', '2021-02-17', '2021-02-17 19:47:28'),
  (3635904, 9255644, '0003', '34 linear feet of wall', 'Additional wall on right of driveway. 34 linear feet.', NULL, 3264.00, 'pending', '2021-02-17', '2021-02-17 19:49:21'),
  (3637520, 9144542, '0007', 'Credits for plants', 'size
			qty
			amount
			total
		
		
			15gal
			-2
			150
			-300
		
		
			5gal
			-1
			41
			-41
		
		
			1gal
			-15
			20
			-300
		
		
			 
			 
			 
			 
		
		
			 
			 
			 
			 $ (641.00)', NULL, -641.00, 'pending', '2021-02-18', '2021-02-18 10:52:00'),
  (3638300, 9352808, '0001', 'Additional DG for garden bed', 'Adding 300sqft of DG to garden bed against house', NULL, 1000.00, 'pending', '2021-02-18', '2021-02-18 13:20:30'),
  (3639088, 9352808, '0002', 'Additional Irrigation', 'Adding one Anti-siphon drip control zone for bed against front of house', NULL, 1000.00, 'pending', '2021-02-18', '2021-02-18 17:43:14'),
  (3640352, 9160267, '0001', 'Additional Retaining Wall', 'Add 35 linear feet of additional retaining wall.
Add 24 addtional feet of steps
Rerun grey water drainage line

Total Cost about $12,000.   $3,000 discount given.', NULL, 9000.00, 'sold', '2021-02-19', '2021-02-19 09:59:49'),
  (3641413, 8769652, '0020', 'Set up bbq 1 hour of labor', NULL, NULL, 150.00, 'sold', '2021-02-19', '2021-02-19 14:11:02'),
  (3642056, 9118685, '0002', 'Additional Plants behind the wall', 'Hi All,
Just confirming:
4  #9  Hesperaloe   5 gallon   X $43.00 =  $172.00
3  #16  Agave Deserti  5 gallon  X $43.00 = $129.00
2  # 17  Agave Desmentiana  5 gallon X $43.00 = $86.00
2  # 18 Red Hot Poker   5 gallon  X $43.00 = $86.00
Total:  $473.00
Confirming your approval', NULL, 473.00, 'pending', '2021-02-20', '2021-02-20 19:54:45'),
  (3643681, 9021894, '0001', 'Design Credit due', NULL, NULL, -375.00, 'pending', '2021-02-22', '2021-02-22 09:02:06'),
  (3644353, 9118685, '0003', 'Removing plants in side planter', 'Take out large agaves in the back side', NULL, 450.00, 'pending', '2021-02-22', '2021-02-22 10:57:20'),
  (3644383, 7237038, '0025', 'Electrical Credit', '2C: A copper wire was inserted into a hole in the stucco to keep a screw in place, instead of using a proper anchor. See the attached picture (copper_wire.JPG). An anchor should have been used to properly secure the PVC pipe to the structure. We already fixed this issue ourselves. Ok fine.  This is a temporary hold when they don’t. have anchors and we usually go back and anchor later.  If this has been done by you then fine.  Credit $30
2D: The GFCI outlet underneath the electrical panel was not installed correctly. The reset button was not working properly. See the attached picture (gfci_outlet.JPG). It turns out that it was not working because the load wire was plugged to the line and the line wire to the load. We have expensive appliances connected to this main outlet which can cause damage to our expensive USA-made appliances. We already corrected this issue ourselves as well. We would need to be credited for this correction.  Ok, fine. This is a quick fix 5 mins.  We will credit $60.', NULL, -60.00, 'pending', '2021-02-22', '2021-02-22 11:03:08'),
  (3644760, 8813960, '0007', 'Concrete Credit', NULL, NULL, -500.00, 'pending', '2021-02-22', '2021-02-22 12:06:11'),
  (3647183, 7237038, '0026', 'Steps change order credit', 'at $60/LF minus the 7% (so it should be $55.80/LF). The invoice amount should be $669.60 instead of $720.', NULL, -50.40, 'pending', '2021-02-23', '2021-02-23 08:49:27'),
  (3647793, 8300808, '0010', 'Additional lf of French drain and waterproofing.', 'Additional lf of French drain and waterproofing.', NULL, 300.00, 'pending', '2021-02-23', '2021-02-23 10:46:17'),
  (3648849, 9255525, '0008', 'Hook up Fire pit', NULL, NULL, 200.00, 'pending', '2021-02-23', '2021-02-23 13:32:01'),
  (3649091, 9359454, '0004', 'Wet look seal rocks', NULL, 'turn over rocks as you spray the water based sealer..allow to dry', 325.00, 'sold', '2021-02-23', '2021-02-23 14:15:09'),
  (3649124, 9359454, '0005', '"Pink lady" 3/4 stone @ french drain', 'pink lasy goes between deck and lawn ..the curvy area  
2 yards needed here', NULL, 245.00, 'sold', '2021-02-23', '2021-02-23 14:22:52'),
  (3649135, 9359454, '0006', '"Honey gold" 3/4" at 2 small planters at house', '1 yard ''Honey gold"  upgrade
must be ordred, may be delay', NULL, 176.00, 'sold', '2021-02-23', '2021-02-23 14:24:33'),
  (3651146, 9255644, '0006', 'Cancelling lights', NULL, NULL, -2200.00, 'pending', '2021-02-24', '2021-02-24 09:05:44'),
  (3656341, 9360765, '0001', '35ft drain pipe', NULL, NULL, 770.00, 'sold', '2021-02-25', '2021-02-25 13:32:24'),
  (3656354, 9360765, '0002', 'Black plastic to control nut sedge weeds', '1000sqft 4mil plastic installed with staples before compacted base installed', NULL, 425.00, 'sold', '2021-02-25', '2021-02-25 13:33:44'),
  (3657428, 9509510, '0001', '(3) additional outlets', NULL, NULL, 255.00, 'sold', '2021-02-26', '2021-02-26 00:08:18'),
  (3657429, 9509510, '0002', 'extend bar additional 3 1/2 ft', NULL, NULL, 750.00, 'sold', '2021-02-26', '2021-02-26 00:09:19'),
  (3657430, 9509510, '0003', 'Install Hot water Dispenser', NULL, NULL, 85.00, 'sold', '2021-02-26', '2021-02-26 00:10:34'),
  (3659424, 8697687, '0009', '2 5gals credit', NULL, NULL, -86.00, 'pending', '2021-02-26', '2021-02-26 12:17:48'),
  (3660173, 9509634, '0001', 'Design', NULL, NULL, 750.00, 'pending', '2021-02-26', '2021-02-26 15:22:31'),
  (3660331, 9255525, '0010', '70 SF of mulch', '70 additional sf mulch.', NULL, 105.00, 'sold', '2021-02-26', '2021-02-26 19:29:17'),
  (3660772, 9348018, '0002', 'Credit. 2 zones of irrigation.', 'Able to use 2 existing lines of irrigation.', NULL, -1800.00, 'pending', '2021-02-28', '2021-02-28 07:53:27'),
  (3660774, 9348018, '0003', 'Adding 2 new brass valves.', NULL, NULL, 480.00, 'pending', '2021-02-28', '2021-02-28 07:55:05'),
  (3660776, 9348018, '0004', '600 watt transformer', 'Because of the amount of outlets Victor needed to install 1 600 watt transformer instead of 2 200 watt. Price difference with labor and materials $100.00', NULL, 100.00, 'pending', '2021-02-28', '2021-02-28 07:58:29'),
  (3660778, 9348018, '0005', 'Additional 120 sf turf', 'Additional 120 sf of turf in back and on side  to complete design of areas adjacent to planters.', NULL, 1440.00, 'pending', '2021-02-28', '2021-02-28 08:02:40'),
  (3662837, 9144542, '0008', 'CC fee''s paid - DO NOT PAY', NULL, NULL, 431.70, 'pending', '2021-03-01', '2021-03-01 10:01:20'),
  (3662971, 9255525, '0011', 'Enlarging Tree sizes', '1.  Changing Strawberry tree from 24" to 36" box  $760.00- $360.00= + $360.00
2.  Changing Poplar tree from 24" to 36" box  box $760.00 - $360.00= + $360.00
3.  Changing Necturne from 15 gal to 24" box $360.00 - $175.00= + $185.00
4.  Changing Tangerine from 15 gal to 24" box $360.00- $175.00= + $185.00
Total: + $1,090.00', NULL, 1090.00, 'pending', '2021-03-01', '2021-03-01 10:23:46'),
  (3664919, 9352808, '0004', '(2) additional path lights', '#1217 in black in low volt (pls note mounting hardware and lamp not included with fixture)', NULL, 440.00, 'pending', '2021-03-01', '2021-03-01 17:18:04'),
  (3664924, 7237038, '0027', 'Credits for Contract items not done', 'Below are credits
0004 Demolition Landscape (-deposit)     $500
0006 6 Pilasters                                        $600
0008 Irrigation Front                                 $1485
0009 Lights Front                                      $2425
0010 Planting Front                                   $4000
0011 Lawn                                                 $3325
0017 Irrigation Back                                  $1080
0019 Lighting Back                                    $5125
0021 Planting Back                                   $7359


Below is a charge against the credit invoice
0023 7% Courtesy                                    $1813.02', NULL, -24085.98, 'pending', '2021-03-01', '2021-03-01 17:19:24'),
  (3664981, 9265745, '0008', 'Gopher Mesh (updated with cost)', '(2) rolls = $380
labor= $380', NULL, 760.00, 'sold', '2021-03-01', '2021-03-01 17:41:01'),
  (3667994, 9360765, '0003', 'Making fire pit 3" wider', NULL, NULL, 400.00, 'pending', '2021-03-02', '2021-03-02 13:18:13'),
  (3668806, 8300808, '0011', '2 Additional well lights 5271', '2,well lights vista pro 5271 arch bronze 5.5 watts', NULL, 450.00, 'pending', '2021-03-02', '2021-03-02 16:27:44'),
  (3668873, 9509510, '0004', '(3) 1 Gallon "boston ivy" with irrigation', 'Parthenocissus tricuspidata installed at fence line between pads as shown on plan', NULL, 115.00, 'sold', '2021-03-02', '2021-03-02 17:07:00'),
  (3672106, 8739112, '0014', 'Irrigation maintenance and repair', 'Owner approved already', NULL, 1400.00, 'pending', '2021-03-03', '2021-03-03 14:33:19'),
  (3672163, 1731776, '0001', 'Payment for portion of Repair', NULL, NULL, 950.00, 'pending', '2021-03-03', '2021-03-03 14:53:36'),
  (3672278, 8739112, '0015', '(9) Flats of Sweet Alyssum', NULL, NULL, 570.00, 'sold', '2021-03-03', '2021-03-03 15:20:07'),
  (3672430, 7237038, '0028', 'Electrical Credit 2', NULL, NULL, -30.00, 'pending', '2021-03-03', '2021-03-03 16:08:45'),
  (3679056, 9458121, '0001', 'New Mastic Joint', 'Remove existing mastic joint. 
Apply new mastic joint (color to be confirmed with client.)
Add sand on top to archive more uniform look. (It won''t look like plastic but more like concrete finish.)', NULL, 1785.00, 'sold', '2021-03-05', '2021-03-05 14:11:17'),
  (3679622, 9348018, '0006', 'Ficus grooming and staking', 'Trimming grooming ficus and staking. 2 crew one day. Haul away', NULL, 1200.00, 'pending', '2021-03-06', '2021-03-06 09:11:23'),
  (3681832, 9359454, '0007', '(3) 24" box ligustrum', NULL, NULL, 1155.00, 'sold', '2021-03-08', '2021-03-08 09:17:46'),
  (3681845, 9359454, '0008', '12-16" x5ft  slumpstone wall at trashcan gate area', NULL, NULL, 467.00, 'sold', '2021-03-08', '2021-03-08 09:19:16'),
  (3682833, 8739112, '0016', 'Plant Additions', '(85) 1 gallon Boulder Blue Fescue - (40) for back border behind pool, (35) for in front of fence frontyard, (10 )for bed against back of house
(3) 5 gallon Ceanothus thrysiflorus var. repens
(7) 1 gallon creeping Rosemary
(6) 1 gallon Blechnum spicant (hard fern)
(3) 15 gallon Bougainvillea vine in magenta', NULL, 2557.00, 'pending', '2021-03-08', '2021-03-08 12:10:32'),
  (3683519, 8739112, '0017', '1/2-1"Arroyo River Rock in place of Del Rio Gravel', '1300sqft

price to be added', NULL, 0, 'sold', '2021-03-08', '2021-03-08 14:00:09'),
  (3683640, 9160267, '0002', 'Utility lines and added layer of timber.', 'Install addtional layer of timber to raise grade to get above exposed sewer line.  $800


Utility Work: $3800

Dig trenches.  Replace soils and recompact. Replace brick for side patio section. 

Utility runs: 

1- 30 LF. ELECTRICAL FOR BBQ 110 volt. Terminate in outdoor junction box. One outlet with Standard 12 gauge wiring per code.

2- 40 LF. ELECTRICAL FOR SPA  220 volt.  Use heavy 6 gauge wire per code. 

3- Install 1 outdoor disconnect service for spa per code. (installation will be 4 feet from spa per code)

3- 50 LF. GAS LINE FOR BBQ', NULL, 4600.00, 'sold', '2021-03-08', '2021-03-08 14:23:44'),
  (3683733, 9160267, '0003', 'Outdoor lighting', '15 path lights - Vista LED 6540

2 up lights  - Vista LED 5006


8 step lights. Vista 4246 with optional LED set up 

1 300 watt transformer

1 timer dial
roughly 250 linear feet of outdoor lighting cable
Staple cable

(Can remove any number if price is too high.)', NULL, 5825.00, 'sold', '2021-03-08', '2021-03-08 14:42:10'),
  (3686355, 9458121, '0002', 'Design Credit due', NULL, NULL, -700.00, 'pending', '2021-03-09', '2021-03-09 10:53:17'),
  (3686677, 9497797, '0001', '34 additional sf at job walk. X$12', NULL, NULL, 408.00, 'pending', '2021-03-09', '2021-03-09 11:51:16'),
  (3686692, 9497797, '0002', '14 more linear feet of border', NULL, NULL, 168.00, 'pending', '2021-03-09', '2021-03-09 11:53:34'),
  (3687928, 7799379, '0031', 'Added demo', 'Needed to additional demo due to existing pool shell issues.', NULL, 3400.00, 'sold', '2021-03-09', '2021-03-09 16:15:28'),
  (3688013, 8739112, '0018', 'Move electrical for gate motor', NULL, NULL, 1350.00, 'sold', '2021-03-09', '2021-03-09 17:02:16'),
  (3688774, 9255525, '0012', 'Additional.valve for veggie beds', NULL, NULL, 450.00, 'pending', '2021-03-10', '2021-03-10 06:40:22'),
  (3692016, 9348018, '0007', 'Credit for lemon tree $175.00. Changed to 5 gallon', 'Already have 15 gallon in yard. Already took 5gallon lemon.', NULL, -132.00, 'pending', '2021-03-10', '2021-03-10 18:09:11'),
  (3693406, 9390377, '0002', 'Border for Patio/Saw cut concrete, etc', 'Adding paver border to back concrete patio, extending from corner of old patio to corner of new patio for far end
Running border corner to to corner for new patio for end closer to house
Saw cut existing concrete that leads to side walkway so new concrete will join seamlessly 
Cut landscape tie on side near Cypress to allow for drainage and add weep holes to existing ties', NULL, 500.00, 'sold', '2021-03-11', '2021-03-11 09:13:36'),
  (3693524, 9390377, '0003', 'Electrical Sleeve for Front Yard', 'add 24 linear feet of electrical sleeve for future lighting', NULL, 200.00, 'pending', '2021-03-11', '2021-03-11 09:38:18'),
  (3693594, 9390377, '0004', 'CMU Wall For Shed Area', '19 Linear feet x 32"H of retaining wall to be added to support wall on property line
We will grout all cels of original wall to reinforce it', NULL, 1400.00, 'sold', '2021-03-11', '2021-03-11 09:52:40'),
  (3693687, 9390377, '0005', 'Additional course for retaining wall', 'Adding (1) more course to the top of wall', NULL, 400.00, 'sold', '2021-03-11', '2021-03-11 10:11:06'),
  (3693901, 8283798, '0014', 'Planting and Light installation', 'Simon providing lights and plants:
Please see daily log:
replace 15 @ 5 gallon  installation only 15 @ $21.00= $315.00
Install 11 new lights installation only @ $75.00 each $825.00
$1,140.00 Total', NULL, 1140.00, 'sold', '2021-03-11', '2021-03-11 10:49:13'),
  (3695598, 8164913, '0001', '3D design service  for bbq', NULL, NULL, 800.00, 'pending', '2021-03-11', '2021-03-11 18:35:03'),
  (3696955, 9390377, '0006', '5LF of electrical conduit', NULL, NULL, 50.00, 'sold', '2021-03-12', '2021-03-12 09:44:14'),
  (3701655, 8739112, '0019', 'Credit for Del Rio Gravel', NULL, NULL, -6800.00, 'sold', '2021-03-15', '2021-03-15 11:39:24'),
  (3701672, 8739112, '0020', '1/2-1"Arroyo River Rock in place of Del Rio Gravel', NULL, NULL, 5300.00, 'sold', '2021-03-15', '2021-03-15 11:42:02'),
  (3701681, 9403908, '0001', 'Design Credit due', NULL, NULL, -750.00, 'pending', '2021-03-15', '2021-03-15 11:42:51'),
  (3701696, 8739112, '0021', 'Plants', '(1) 5 gallon Salvia leucophylla 
(1) 5 gallon Lavender augustifolia
(3) 1 gallon Creeping Rosemary', NULL, 152.00, 'sold', '2021-03-15', '2021-03-15 11:45:19'),
  (3702355, 9497797, '0003', 'Modify and re-install railing', NULL, NULL, 0, 'pending', '2021-03-15', '2021-03-15 13:24:32'),
  (3705428, 9390377, '0007', '3% CC fee', '3% CC fee to be added on all payments made via a credit card. To be determined at the end of the project.', NULL, 0, 'sold', '2021-03-16', '2021-03-16 10:19:08'),
  (3706830, 9255525, '0013', 'Final Turf Count', 'Final Measurement
Turf : 2428 sqft

The original contract has
Turf : 2331 sqft

A difference of
Turf : 97 sqft', NULL, 970.00, 'pending', '2021-03-16', '2021-03-16 13:45:37'),
  (3706838, 9255525, '0014', 'Final Gravel Count', 'Final Measurement
Gravel : 1050 sqft

The original contract has
Gravel : 865 sqft

A difference of
Gravel : 185 sqft', NULL, 1110.00, 'pending', '2021-03-16', '2021-03-16 13:46:50'),
  (3707327, 8283798, '0015', 'Landscape Timber retaining', '12  linear feet long
30" to 36" high
to use 6" X 6"   landscape timber 
Rebar and Screw Construction no waterproofing, back fill with soil on site.', NULL, 1647.00, 'sold', '2021-03-16', '2021-03-16 15:36:04'),
  (3707981, 9359454, '0009', '(2) additional 5 gallon iceberg roses ''Burgundy"', 'these will be placed behind the sculpture..behind the magnolia little gem', NULL, 90.00, 'sold', '2021-03-17', '2021-03-17 02:05:15'),
  (3712699, 8739112, '0022', 'Credit for (15) gallon Roses', 'Credit for (6) Iceberg Roses', NULL, -900.00, 'sold', '2021-03-18', '2021-03-18 08:18:40'),
  (3712710, 8739112, '0023', 'Addition of Eugenia', 'Adding (16) 5 gallon Eugenias', NULL, 700.00, 'sold', '2021-03-18', '2021-03-18 08:19:34'),
  (3712715, 8739112, '0024', '(9) 5 gallon Iceberg Roses', 'Swapped 15 gallons for 5 gallons', NULL, 390.00, 'sold', '2021-03-18', '2021-03-18 08:20:53'),
  (3713338, 9493386, '0001', 'Drainage', 'Adding 50 LF of drain pipe', NULL, 950.00, 'pending', '2021-03-18', '2021-03-18 10:13:02'),
  (3714110, 9458121, '0003', 'Upgrade 21  5-gallons to 15-gallons', '5-gallon to 15-gallon upgrade= $110 each X 21 = $2,310.00', NULL, 2310.00, 'sold', '2021-03-18', '2021-03-18 12:18:33'),
  (3714331, 9348018, '0008', 'CREDIT Parking', 'Credit for parking pass $110
Reimbursement for paying for parking ticket $60', NULL, -170.00, 'pending', '2021-03-18', '2021-03-18 12:55:03'),
  (3714652, 9493386, '0002', '2nd Transformer', 'Adding a second transformer.  (Hide behind ADU unit).

- Vanja to purchase smart plugs', NULL, 430.00, 'sold', '2021-03-18', '2021-03-18 13:52:46'),
  (3714815, 9493386, '0003', 'Agave Green Stepstone Pavers', 'We are NOT getting these pavers. Credit was included in price of drainage change order (Credit for 4 pavers-$60/each= $240 total credit given towards drainage change order)', NULL, 0, 'sold', '2021-03-18', '2021-03-18 14:24:36'),
  (3716893, 9375449, '0002', 'Redwood veggie box', 'Change pressure treated 4”x8” to redwood 2”x8” no charge', NULL, 0, 'pending', '2021-03-19', '2021-03-19 09:38:58'),
  (3720761, 9160267, '0004', 'Extend Wall,   Add Wall Height,  Add Fencing', '1) Remove rock pilaster and wall for 7 feet.
2) Excavate for wall and footings additional 7 feet.
3) Extend retaining wall additional 7 feet.    
4) Add 1 1/2 courses of block to entire retaining wall.  
5) Add additional rebar reinforcement during grout lift of wall.
6)  Credit for reduced fencing.', NULL, 6100.00, 'sold', '2021-03-22', '2021-03-22 09:18:35'),
  (3720997, 9255644, '0007', 'Trash Credit', NULL, NULL, -65.00, 'pending', '2021-03-22', '2021-03-22 10:01:37'),
  (3721878, 8283798, '0016', 'Additional Plants purchased by PB', NULL, 'HI Melinda

Just to follow up on the Thursday installion. When Daniel came by we agreed that PictureBuild would supply the following plants:

2 x 15 gallon Hawthorne bushes (not the tree type but with max height up to 6’). White or pink.
2 x 5 gallon salvia (purple)
1 x 5 gallon azalea (white or pink)

Other plants already procured.

Please advise and issue change order.', 429.00, 'sold', '2021-03-22', '2021-03-22 12:42:10'),
  (3725999, 9458413, '0001', 'Crushed gravel', 'Extra 60 SF of grey crushed gravel near shed area', NULL, 180.00, 'sold', '2021-03-23', '2021-03-23 12:38:29'),
  (3726015, 9458413, '0002', 'Utilities credit', 'Credit for (1) electrical box and conduit for side yard area (not doing)', NULL, -120.00, 'sold', '2021-03-23', '2021-03-23 12:41:23'),
  (3726037, 9458413, '0003', 'Drainage', 'No charge (core and curbing - not doing, cost is a wash)

Adding 6 LF of 3 inch SDR 
Removing concrete - 7.5 SF
Repouring concrete - 7.5 SF
Score concrete', NULL, 0, 'sold', '2021-03-23', '2021-03-23 12:44:24'),
  (3726046, 9458413, '0004', 'Credit for archway', 'We are not shaving the footing of archway in driveway.', NULL, -120.00, 'sold', '2021-03-23', '2021-03-23 12:45:34'),
  (3726068, 9458413, '0005', 'Irrigation - grass zone', 'Adding one more spray zone to backyard. 
Brass anti-siphon valve.
All irrigation for grass needs to be new and have correct throw.', NULL, 860.00, 'sold', '2021-03-23', '2021-03-23 12:49:38'),
  (3732916, 9359454, '0010', '(4) white iceberg roses  at majestic beauty''s', NULL, NULL, 180.00, 'sold', '2021-03-25', '2021-03-25 10:16:26'),
  (3734133, 9643179, '0001', 'Front Irrigation', 'Adding new drip emitter hoses with filter valve', NULL, 700.00, 'sold', '2021-03-25', '2021-03-25 13:48:12'),
  (3734598, 8769652, '0022', 'Credit for Actual installed pavers, syn grass', 'see attached

remember this is a CREDIT againsts what has been paid or owed as a whole of all the work completed or already approved and not paid.   

item 0007 is an additional change order already paid in full, and the total amount of pavers (220sqft) is not part of the total sqft pavers included in the attached calculation.     payments made per the original contract are progress payments. see your contract..  dont confuse it with the item cost and contract progress payments are different.', NULL, -2684.04, 'sold', '2021-03-25', '2021-03-25 15:28:28'),
  (3734839, 8739112, '0025', 'Additional fescue', '(65) 1 gallon Boulder blue Fescue for back pool and bed against house', NULL, 1400.00, 'sold', '2021-03-25', '2021-03-25 17:20:54'),
  (3737597, 9493386, '0004', 'Adding flats', 'Adding 9 creeping thyme
Adding 9 dymondia silver carpet', NULL, 1130.00, 'pending', '2021-03-26', '2021-03-26 13:34:54'),
  (3738086, 9643179, '0002', 'Demo for the DG and grading', 'Demo the DG and grade, fill in alongside of patio where concrete was demoed', NULL, 700.00, 'sold', '2021-03-26', '2021-03-26 17:07:46'),
  (3740103, 8739112, '0026', '(2) 5 gallon Lavender', 'Sweet Lavender is the variety', NULL, 87.00, 'sold', '2021-03-29', '2021-03-29 07:54:26'),
  (3742232, 9458121, '0004', '160 lf of Bender Board', '160 lf x $8 per linear feet = $128.00

160 lf x $8 per linear feet = $1280.00', NULL, 1280.00, 'pending', '2021-03-29', '2021-03-29 13:52:23'),
  (3742257, 9458121, '0005', 'Add mulch - Brown shredded', '870 square feet of mulch x $1 per Square feet = $870.00', NULL, 870.00, 'sold', '2021-03-29', '2021-03-29 13:54:52'),
  (3742268, 9458121, '0006', '300 w transformer', 'Add 300 W transformer = $350
Smart controller = No extra charge', NULL, 350.00, 'sold', '2021-03-29', '2021-03-29 13:56:02'),
  (3744457, 9458121, '0007', 'One more zone for future veggie beds', NULL, NULL, 900.00, 'pending', '2021-03-30', '2021-03-30 08:35:28'),
  (3746125, 9493386, '0005', 'Adding 3 (15g) Pittosporum Silversheen', 'Client request to add 3 (15g) Silversheen for more coverage for garbage cans.

We already planted everything so we cannot restock the 3 (5g).', 'Client wants plants to be bigger,  A LOT of these plants don’t even come in 5g and they all have A LOT of spread.  Salvias, lavender, trees, all get very big in 3 years she will say it’s too crowded.', 450.00, 'sold', '2021-03-30', '2021-03-30 12:59:06'),
  (3747608, 9294501, '0002', 'Finish Gate with additional wood planking', NULL, NULL, 525.00, 'pending', '2021-03-31', '2021-03-31 01:56:36'),
  (3748399, 9458121, '0008', 'Remove all plants from the side of the house', NULL, NULL, 800.00, 'pending', '2021-03-31', '2021-03-31 08:10:50'),
  (3752999, 9390377, '0008', 'Moving and adjusting extra sprinkler heads', 'The heads in the back of the lawn area will also need to be moved to accommodate for adjusted grading
Approximately 3 hours of extra labor', NULL, 375.00, 'sold', '2021-04-01', '2021-04-01 10:04:26'),
  (3753367, 9390377, '0009', 'Shredded Mulch -Garden Wall Bed(no weed barrier)', '160sqft', NULL, 200.00, 'sold', '2021-04-01', '2021-04-01 11:25:00'),
  (3754258, 9359454, '0012', 'Upgrade to (4) 24" Japanese Maples', 'We apologize and thank you for your understanding', NULL, 1280.00, 'sold', '2021-04-01', '2021-04-01 14:24:58'),
  (3754367, 8283798, '0017', 'Consulting and spraying white fly pest control.', 'Consultation and 3 applications/trips.  of white fly pest control.', NULL, 750.00, 'sold', '2021-04-01', '2021-04-01 14:48:41'),
  (3754611, 9458121, '0009', 'Pool Cleaning Credit', NULL, NULL, -120.00, 'pending', '2021-04-01', '2021-04-01 15:51:01'),
  (3755925, 9593020, '0001', 'low voltage lighting', 'Vista brand led (2) up -lights gr2216
(4) well lights
transformer', NULL, 1920.00, 'sold', '2021-04-02', '2021-04-02 09:39:34'),
  (3755986, 9390377, '0010', 'Irritrol Timer', NULL, NULL, 275.00, 'sold', '2021-04-02', '2021-04-02 09:56:59'),
  (3756390, 9348018, '0009', 'CREDIT Plants installed vs contract', 'Actual Installed
			 
			 
		
		
			15gal
			4
			 $            175.00
			 $             700.00
		
		
			5gal
			58
			 $               43.00
			 $         2,494.00
		
		
			1gal
			41
			 $               21.00
			 $             861.00
		
		
			 
			 
			 
			 
		
		
			 
			 
			 
			 $         4,055.00
		
		
			 
			 
			 
			 
		
		
			 
			 
			 
			 
		
		
			From Contract
			 
			 
		
		
			24box
			1
			 $            360.00
			 $             360.00
		
		
			15gal
			5
			 $            175.00
			 $             875.00
		
		
			5gal
			75
			 $               43.00
			 $         3,225.00
		
		
			1gal
			60
			 $               21.00
			 $         1,260.00
		
		
			 
			 
			 
			 
		
		
			Change Orders
			 
			 
		
		
			15gal
			1
			 $          (175.00)
			 $          (175.00)
		
		
			 
			 
			 
			 
		
		
			 
			 
			 
			 $         5,545.00
		
		
			 
			 
			 
			 
		
		
			 
			 
			 
			 $       (1,490.00)', NULL, -1490.00, 'pending', '2021-04-02', '2021-04-02 11:52:10'),
  (3756416, 8769652, '0023', 'Concrete Credit', '0008 - Extend basketball court 150sqft                   ($990)
Remove the 45sqft credit                                              $337.50 (removing this as it is a redundant credit)

Total credit due : $652.50

This results in you paying for the remaining item. - 105sqft concrete $787.50', NULL, -652.50, 'pending', '2021-04-02', '2021-04-02 11:58:27'),
  (3756467, 9348018, '0010', '3 additional 15 gallon plants', 'additional Ficus Nitida 3 15 gallon plants', NULL, 525.00, 'pending', '2021-04-02', '2021-04-02 12:08:36'),
  (3757071, 9458121, '0010', 'Additional up light', NULL, NULL, 225.00, 'pending', '2021-04-02', '2021-04-02 15:56:26'),
  (3757074, 9458121, '0011', 'Stucco Repair', NULL, NULL, 100.00, 'sold', '2021-04-02', '2021-04-02 15:56:50'),
  (3757201, 9785320, '0001', 'Design', NULL, NULL, 750.00, 'pending', '2021-04-02', '2021-04-02 19:00:26'),
  (3759894, 7666319, '0033', 'Unallocated Credit', '(5 Job *B) Mason, Gudrun
Created By Brian Godley on Fri, Jul 31, 2020', NULL, -1950.00, 'sold', '2021-04-05', '2021-04-05 11:15:39'),
  (3760138, 9638887, '0001', 'Extra day of demo work', 'Max said he will need one more full day of work to demo, wall install- taking longer due to access/hillside', NULL, 1500.00, 'sold', '2021-04-05', '2021-04-05 11:56:47'),
  (3761254, 9593020, '0002', 'Add Gas line to fire pit area 10ft', NULL, NULL, 450.00, 'sold', '2021-04-05', '2021-04-05 16:08:52'),
  (3761257, 9593020, '0003', 'Stucco work - west side', NULL, 'patch and repair stucco - paint ready
painting not included
not to exceed 50 sq ft', 650.00, 'sold', '2021-04-05', '2021-04-05 16:10:11'),
  (3761261, 9593020, '0004', 'Credit - Timber planters (2)', NULL, NULL, -860.00, 'sold', '2021-04-05', '2021-04-05 16:11:18'),
  (3761263, 9593020, '0005', 'Credit - Redwood bench', NULL, NULL, -1400.00, 'sold', '2021-04-05', '2021-04-05 16:11:49'),
  (3761615, 9255525, '0015', 'Final count for Turf and Rock', NULL, 'Contract  TURF  2,331 sf      
Mohammed put in change order on March 16th adding 97 sf
Total before final count 2,428 sf
Final count;  2091
Difference 337 sf  X $10.00= $3,370.00 Credit

Contract ROCK  865
Mohammed put in change order on March 16 adding 185 sf
Final count 1,021 SF
Difference of 29 sf X $6.00= $174.00 credit

Total Credit after Mohammed''s change orders and final count: $3,544.00', -3544.00, 'pending', '2021-04-05', '2021-04-05 19:15:04'),
  (3763113, 9348018, '0011', 'CREDIT 7 5gals', '7gals x $43ea = 301', NULL, -301.00, 'pending', '2021-04-06', '2021-04-06 09:14:59'),
  (3764520, 9638887, '0002', 'Replacing 30lf of galvanized irrigation piping', NULL, NULL, 250.00, 'sold', '2021-04-06', '2021-04-06 13:24:17'),
  (3769109, 9458121, '0012', 'Irrigation Controller', NULL, NULL, 400.00, 'pending', '2021-04-07', '2021-04-07 17:49:14'),
  (3769218, 9198585, '0002', 'Raised border on side of house', 'Raised curb  using a Rustic wall block on it''s side.  Need to order 18 pieces.  for 17 linear feet, X $33.00 a Linear foot= $561.00', NULL, 561.00, 'pending', '2021-04-07', '2021-04-07 18:48:43'),
  (3769222, 9198585, '0003', '27 additional sf of pavers', '27 Linear feet X $11.50 a SF= $310.00', NULL, 310.00, 'pending', '2021-04-07', '2021-04-07 18:50:24'),
  (3769225, 9198585, '0004', 'drainage', '22 linear feet of drainage X $20.00 a LF
connecting 3 close down spouts', NULL, 440.00, 'pending', '2021-04-07', '2021-04-07 18:52:40'),
  (3769228, 9198585, '0005', 'Step build with block', '8 linear feet of step build 8 LF X $50.00=$400.00', NULL, 400.00, 'pending', '2021-04-07', '2021-04-07 18:55:34'),
  (3771075, 9593020, '0006', 'Planting Allowance', 'Planting Allowance

	24" Box-tree @ $385ea / 15Gallon @ $150ea / 5Gallon @ $45ea / 1Gallon @ $22ea / $400 plant layout design / 1 yard mulch $300
	Amend soil, Fertilize and Basin each plant
	90 Day Warranty / 3 week yard check included


credits will be applied on remaining balance of allowance used

 Allowance $2880', NULL, 2880.00, 'sold', '2021-04-08', '2021-04-08 10:34:35'),
  (3772774, 9509437, '0001', 'Hillside work', 'Grade lower Area -                                                                                          $800
(24) 5 Gallon Trailing Rosemary                                                                    $1080
(1) 15 Gallon Arbutus Marina single trunk  Tree  - staked                         $212
Jute Mesh 250sqft                                                                                             $650

SEE ATTACHED', NULL, 2742.00, 'sold', '2021-04-08', '2021-04-08 16:35:07'),
  (3774061, 9160267, '0005', 'Bend a board', NULL, NULL, 280.00, 'sold', '2021-04-09', '2021-04-09 07:50:14'),
  (3774080, 9160267, '0006', 'Metal frame tank & pour a lid for clean out', NULL, NULL, 420.00, 'sold', '2021-04-09', '2021-04-09 07:53:42'),
  (3774083, 9160267, '0007', 'Drains for planters', NULL, NULL, 660.00, 'sold', '2021-04-09', '2021-04-09 07:55:03'),
  (3774129, 9458413, '0006', 'Additional outlet', NULL, NULL, 120.00, 'sold', '2021-04-09', '2021-04-09 08:04:06'),
  (3774370, 7666319, '0034', 'Timber Steps, Drain and Compactions', 'Added Timber Steps. 160 ln feet.  3 added secions. Added timber retaining wall and landings 36 ln feet - $10,200
Compact North Hillside - 2 days - $1900
Install SDR 35 drainage North Hillside and Bury - $1200', NULL, 13400.00, 'sold', '2021-04-09', '2021-04-09 08:54:55'),
  (3774446, 9643536, '0001', 'Drains from Rear 150ft', NULL, NULL, 3300.00, 'sold', '2021-04-09', '2021-04-09 09:09:27'),
  (3774596, 9458413, '0007', 'Import 50/50 soil for creating 2 berms', '1 CY 50/50 for 2 BERMS in front yard, there was not enough soil on site to berm.', 'Need to do this so client will get grass rebate from the city
Berm #1 is under Agave Americana
Berm #2 is under Red Aeonium', 130.00, 'sold', '2021-04-09', '2021-04-09 09:38:45'),
  (3774959, 9643536, '0002', '475 more sqft of pavers', NULL, NULL, 4702.00, 'sold', '2021-04-09', '2021-04-09 10:53:58'),
  (3774963, 9643536, '0003', '200 sqft grass demo', NULL, NULL, 250.00, 'sold', '2021-04-09', '2021-04-09 10:54:39'),
  (3774971, 9643536, '0004', '200 sqft of grass RTF and irrigation', NULL, NULL, 1035.00, 'sold', '2021-04-09', '2021-04-09 10:55:39'),
  (3774982, 9643536, '0005', '200 sqft Del Rio Gravel [or equal] (Size TBD)', NULL, NULL, 300.00, 'pending', '2021-04-09', '2021-04-09 10:56:59'),
  (3775604, 9643179, '0003', 'Change out 1/4” Montana gravel to 1/2”', NULL, NULL, 400.00, 'sold', '2021-04-09', '2021-04-09 12:53:19'),
  (3775708, 9198585, '0006', 'Added course of block wall.', NULL, NULL, 425.00, 'pending', '2021-04-09', '2021-04-09 13:14:21'),
  (3776129, 9643179, '0004', 'Replaced soaker hoses with Netafim for Wax Privets', 'Backyard Privets', NULL, 500.00, 'sold', '2021-04-09', '2021-04-09 15:59:57'),
  (3776131, 9638887, '0003', '(6) Additional 15 gallon Privets', NULL, NULL, 900.00, 'sold', '2021-04-09', '2021-04-09 16:01:25'),
  (3776132, 9638887, '0004', 'Jute Mesh for Hillside', 'Erosion Control for holding dirt back on hillside', NULL, 125.00, 'sold', '2021-04-09', '2021-04-09 16:02:04'),
  (3776134, 9638887, '0005', 'Shredded Mulch for New Plants', '652sqft', NULL, 718.00, 'sold', '2021-04-09', '2021-04-09 16:03:29'),
  (3776164, 8739112, '0027', 'Credit for String Lights (not installing)', NULL, NULL, -125.00, 'sold', '2021-04-09', '2021-04-09 16:32:32'),
  (3776166, 8739112, '0028', 'Partial Credit for Firepit Install', 'Owner wound up providing own blocks for outside wall', NULL, -400.00, 'sold', '2021-04-09', '2021-04-09 16:35:07'),
  (3776167, 8739112, '0029', 'Credit for small "walls" w/owners materials', NULL, NULL, -375.00, 'sold', '2021-04-09', '2021-04-09 16:36:12'),
  (3776170, 8739112, '0030', 'Demo + Disposal for Garage Cabinetry', 'Removal of garage cabinets and dump disposal', NULL, 350.00, 'sold', '2021-04-09', '2021-04-09 16:37:16'),
  (3776287, 9458121, '0013', '160lnft bender board @ cost', NULL, NULL, 896.00, 'pending', '2021-04-09', '2021-04-09 18:48:11'),
  (3776546, 9680412, '0001', 'Benderboard', '63 LF 4" Black metal bender board', NULL, 670.00, 'pending', '2021-04-10', '2021-04-10 11:13:56'),
  (3776556, 9680412, '0003', 'Demo extra costs', '3 stump grinds
40 SF of concrete removal', NULL, 459.00, 'pending', '2021-04-10', '2021-04-10 11:25:33'),
  (3776558, 9680412, '0004', 'Electrical', 'Remove all electrical (old lights, electrical boxes, pipes)', NULL, 1400.00, 'sold', '2021-04-10', '2021-04-10 11:26:42'),
  (3776663, 9680412, '0005', 'Adding smooth stucco', 'We are ADDING smooth stucco as in attached drawing.  I approximate that the area is 9 ft x 5 ft high. 

The wall will then be painted black later by the client’s painter so stucco does not need color.', 'Please let me know if this is not clear. Thank you! Nicole', 300.00, 'sold', '2021-04-10', '2021-04-10 17:17:46'),
  (3776671, 9680412, '0007', 'Waterproofing', 'We will need approx. 60 LF at 18”-30” of waterproofing for all walls.

This will ensure that the water doesn’t come through and stain the concrete over time.
(frontyard garden and retaining wall plus backyard retaining walls)', NULL, 700.00, 'sold', '2021-04-10', '2021-04-10 17:38:59'),
  (3776679, 9680412, '0008', 'Organic spray for hillside', 'We are looking for an organic solution to spray on the hillside since there is substantial growth of the invasive grass since I last visited and the ivy is getting a little out of control.  You will need a gardener to be on top of the ivy once we have installed all the new plants, as it can get bad quick! 

This cost is for material and labor of the entire hillside.', NULL, 130.00, 'sold', '2021-04-10', '2021-04-10 18:08:42'),
  (3778325, 9638887, '0006', 'Add’l 30 linear feet of PVC replaces galvanized', NULL, NULL, 300.00, 'sold', '2021-04-12', '2021-04-12 08:43:32'),
  (3780619, 9160267, '0008', 'Add mulch (brown shredded', NULL, NULL, 300.00, 'sold', '2021-04-12', '2021-04-12 14:49:36'),
  (3780746, 9643179, '0005', 'Edging for trees', NULL, NULL, 200.00, 'sold', '2021-04-12', '2021-04-12 15:11:38'),
  (3781040, 9198585, '0007', 'Additional curb 10 linear feet', NULL, NULL, 330.00, 'pending', '2021-04-12', '2021-04-12 17:06:09'),
  (3781046, 9198585, '0008', 'Step build 1 1/2 feet less', 'Credit', NULL, -75.00, 'pending', '2021-04-12', '2021-04-12 17:07:23'),
  (3784241, 7666319, '0035', 'Install Front Lawn add Gopher Mesh Front/Back', 'Remove sub irrigation for previous design.  Add two zones of sprayhead irrigation - $1850
Till, grade add amendments. $1700
1650 sq feet of lawn.   -  $3,685
250 ln feet of benderboard.  - $2250

Gopher mesh install - 
credit for 1/2 day of mesh install - ($500)', NULL, 8985.00, 'sold', '2021-04-13', '2021-04-13 13:06:51'),
  (3784293, 9680412, '0009', 'Mulch credit', 'Credit for mulch that we will not be doing on the very upper hillside slope.  

We will still mulch other beds that don’t have gravel with plants.', NULL, -250.00, 'sold', '2021-04-13', '2021-04-13 13:14:22'),
  (3784386, 9680412, '0010', 'CMU wall in front', 'I didn’t account for the 30” freeboard section of the 5’ tall CMU wall in the contract. (The L shaped wall on the left)

This is for the extra courses and labor.', NULL, 100.00, 'sold', '2021-04-13', '2021-04-13 13:26:03'),
  (3786988, 9566529, '0001', 'New Skimmer', NULL, NULL, 1200.00, 'sold', '2021-04-14', '2021-04-14 09:38:52'),
  (3786993, 9566529, '0002', 'Cleaner Port', NULL, NULL, 350.00, 'sold', '2021-04-14', '2021-04-14 09:39:53'),
  (3787163, 9694064, '0001', '20ft Drain pipe and weed barrier for parkway', NULL, NULL, 740.00, 'pending', '2021-04-14', '2021-04-14 10:08:22'),
  (3787170, 9821402, '0001', '20ft additional Drain pipe', NULL, NULL, 440.00, 'sold', '2021-04-14', '2021-04-14 10:09:18'),
  (3788172, 9680412, '0012', 'Design fee credit', 'Credit for 1/2 of design fee (designer Harley Barber)', 'Mo - Is this typically how we do it? I''ve never done it this way before. Lmk!', -1100.00, 'sold', '2021-04-14', '2021-04-14 12:53:55'),
  (3788714, 9680412, '0013', 'Old wall was found on Wednesday, April 14', 'There was another wall behind the lava wall that is extending 18 linear feet and is 28” tall. See attached photo. 

This wall and the footings will have to be removed so we can build properly and ensure the wall will never be compromised. 

This cost is for extra material, removal, and hauling.', 'I’m confident that the news walls will be strong and give us a better planting area.', 180.00, 'sold', '2021-04-14', '2021-04-14 14:42:17'),
  (3794340, 8362337, '0005', 'Electrical, fan installation, and 2lf counter', '1)  Outdoor Kitchen:
- 2 additional linear feet
- set block, form concrete top, stucco in same color, concrete top in same color
-cure and seal
$635.00 a linear foot X 2=
$1,270.00

2)  Electrical
- 20 linear feet at $22.00
- fan installation $250.00  ( reduced from $300.00)
- outlets at no charge  
-$440.00 + $250.00
$690.00

Total final change order:  $1,960.00', NULL, 1960.00, 'pending', '2021-04-16', '2021-04-16 09:01:48'),
  (3794840, 9643179, '0006', 'Credit for plants', NULL, NULL, -300.00, 'sold', '2021-04-16', '2021-04-16 10:35:27'),
  (3795825, 9370871, '0001', 'Design Credit due', NULL, NULL, -350.00, 'pending', '2021-04-16', '2021-04-16 14:12:13'),
  (3796033, 9458413, '0008', 'Credit for 3 flats of Silver Falls ground cover', 'We did not receive or install 3 flats of silver falls groundcover for under the camellias and toyon tree in back.', 'We may want to add 5 (5g) Sword ferns when Daniel does yard checks.', -160.00, 'sold', '2021-04-16', '2021-04-16 15:26:55'),
  (3797936, 9198585, '0009', 'Bender board', '60 linear feet at $6.00= $360.00', NULL, 360.00, 'pending', '2021-04-19', '2021-04-19 07:55:58'),
  (3798355, 9683416, '0001', 'Design Credit due', NULL, NULL, -500.00, 'pending', '2021-04-19', '2021-04-19 09:06:31'),
  (3798369, 9789694, '0001', 'Additional drainage for 5 linear feet', 'Extending the drain across entire back side of pool and adding a pop up for just outside fence', NULL, 225.00, 'sold', '2021-04-19', '2021-04-19 09:07:56'),
  (3798418, 9789694, '0002', 'Add''l linear feet for gas line extension', '+4 linear feet, will split with bbq
will need to remove trex planks to trench gas line towards firepit', NULL, 350.00, 'sold', '2021-04-19', '2021-04-19 09:16:20'),
  (3798437, 9789694, '0003', 'Add''l pole for string lights black/square', NULL, NULL, 80.00, 'sold', '2021-04-19', '2021-04-19 09:19:44'),
  (3798463, 9469248, '0001', 'Design Credit due', NULL, NULL, -750.00, 'pending', '2021-04-19', '2021-04-19 09:23:23'),
  (3798615, 9491206, '0001', 'Adding 20 LF of drainage', 'Add 20 LF of 3/4" SDR drain pipe. Includes labor', NULL, 500.00, 'sold', '2021-04-19', '2021-04-19 09:45:29'),
  (3798653, 9491206, '0002', 'Credit for drain boxes', 'We are not doing 8 drains boxes, we are now doing 3 boxes total.', NULL, -200.00, 'sold', '2021-04-19', '2021-04-19 09:49:22'),
  (3798683, 9491206, '0003', 'Main line (Irrigation)', 'Adding 28 LF of main line for irrigation from back house hose to grass area', NULL, 675.00, 'sold', '2021-04-19', '2021-04-19 09:56:34'),
  (3798692, 9491206, '0004', 'Sleeve', 'Add sleeve under concrete for future water main (if ever needed client will have access under concrete pour)', NULL, 480.00, 'sold', '2021-04-19', '2021-04-19 09:57:51'),
  (3798696, 9491206, '0005', 'Move soil on hillside', 'Move soil around on hillside so it doesn''t spill over.', NULL, 375.00, 'sold', '2021-04-19', '2021-04-19 09:58:49'),
  (3798726, 9491206, '0006', 'Add concrete behind upper garage area', 'Remove soil down to 6" behind retaining wall
Add 115 SF of 4" concrete pour with light broom finish', NULL, 855.00, 'pending', '2021-04-19', '2021-04-19 10:05:15'),
  (3798761, 9491206, '0007', 'Add landscape ties retaining wall behind garage', '15 LF of railroad treated landscape timbers retaining wall at 2 courses high', NULL, 1295.00, 'pending', '2021-04-19', '2021-04-19 10:13:11'),
  (3798767, 9491206, '0008', 'Add gas line', '1" poly line for future BBQ at 41 LF', NULL, 1312.00, 'pending', '2021-04-19', '2021-04-19 10:14:54'),
  (3798837, 9198585, '0010', 'Additional plants', '4arcticoke.  5gal
Blue glue.   5gal.', NULL, 344.00, 'pending', '2021-04-19', '2021-04-19 10:26:45'),
  (3798933, 9491206, '0009', 'Adding a step to back behind garage', 'Adding one step 4-6" rise so 6 steps in total.', NULL, 130.00, 'sold', '2021-04-19', '2021-04-19 10:44:02'),
  (3802494, 9789694, '0004', 'Border pavers /leveling corner by firepit', NULL, NULL, 800.00, 'sold', '2021-04-20', '2021-04-20 09:02:16'),
  (3807154, 9789694, '0005', 'Bullnose steps for deck', 'Bullnose paver in charcoal for 36 linear feet, risers will be in 6x9 charcoal to match-', NULL, 1700.00, 'sold', '2021-04-21', '2021-04-21 10:48:18'),
  (3809030, 7666319, '0036', 'Added Items', '1) Added rear valve and hose bib for rear planter - 1/2 day 1 guy plus material  $490
2) Added drainage inlets pool planter - 1/2 day 1 guy plus material  $435
3) Back filled front and back planter with 4 yards of 50/50  2 guys 1/2 day. plus material and $250 delivery fee - $985
4) Gopher Mesh front - 3 guys 1/2 day - $2350
5) Benderboard for all rear walkways.  260 ln feet - $2340
6) Add 3 timber steps and landing - $850
7) Add 60 yards of Mulch - $5,191', NULL, 12641.00, 'sold', '2021-04-21', '2021-04-21 17:35:12'),
  (3811328, 9593020, '0007', 'bbq gas line credit - 8ft', NULL, NULL, -360.00, 'sold', '2021-04-22', '2021-04-22 10:50:09'),
  (3812729, 9067501, '0003', 'Scope of work Changer order Credit', 'see attached revised scope of work and new payment schedule

Deposit  - Paid
$34,000 additional', NULL, 34000.00, 'pending', '2021-04-22', '2021-04-22 15:15:24'),
  (3816574, 9680412, '0014', 'Lighting (Client purchased the light fixtures)', '300 Watt Transformer $400 (gave a discount here)
Labor for installing 38 lights - $1,550
300 LF of wire - $350', NULL, 2300.00, 'sold', '2021-04-24', '2021-04-24 11:23:50'),
  (3817983, 9509437, '0002', 'Jute Mesh', NULL, NULL, -650.00, 'sold', '2021-04-26', '2021-04-26 08:04:57'),
  (3818492, 9352808, '0005', 'Add''l Uplight', '#2211 in black', NULL, 225.00, 'pending', '2021-04-26', '2021-04-26 09:38:18'),
  (3818607, 9593020, '0008', '16ft 1" main line / 13ft Drains', NULL, NULL, 726.00, 'sold', '2021-04-26', '2021-04-26 09:57:32'),
  (3818795, 9760370, '0001', '3linear feet step build', NULL, NULL, 180.00, 'pending', '2021-04-26', '2021-04-26 10:28:01'),
  (3819036, 9593020, '0009', '10 linear ft of 6"step near garage form and finish', NULL, NULL, 647.00, 'sold', '2021-04-26', '2021-04-26 11:09:29'),
  (3819601, 9509174, '0001', 'Convert Irrigation to drip & replace (2) valves', 'in front yard', NULL, 1150.00, 'sold', '2021-04-26', '2021-04-26 12:40:38'),
  (3820442, 9509174, '0002', 'move (2) 24'' box magnolias to rear', NULL, NULL, 146.00, 'sold', '2021-04-26', '2021-04-26 15:35:01'),
  (3820450, 9976353, '0001', '3D Model design by Ryan $600', 'this is included in the cost of the job', 'this is included in the cost of the job, Remit $600 to Ryan for designwork', 0, 'pending', '2021-04-26', '2021-04-26 15:37:48'),
  (3820540, 9648452, '0001', 'Plan Drawing work, includes engineering allowance', 'this allowance covers additional costs including, permit and pre-permit work including side view drawings of 3d design, this also includes costs associated with submitting to engineer
Designer at the rate of $120hr, Permit/Engineering running , working with the city
estimated engineering costs of $2000 not to exceed without further approval', NULL, 2500.00, 'pending', '2021-04-26', '2021-04-26 16:03:09'),
  (3822807, 9740093, '0001', 'Stump removal', 'Removal of tree stump/roots next to deck', NULL, 300.00, 'pending', '2021-04-27', '2021-04-27 09:50:12'),
  (3822812, 9740093, '0002', 'Additional pavers for 45sqft for front walkway', NULL, NULL, 225.00, 'pending', '2021-04-27', '2021-04-27 09:50:56'),
  (3822815, 9740093, '0003', 'Hose bib next to dock', 'Secure riser', NULL, 600.00, 'pending', '2021-04-27', '2021-04-27 09:51:34'),
  (3822822, 9740093, '0004', 'Bender board for around the turf, all borders', NULL, NULL, 500.00, 'pending', '2021-04-27', '2021-04-27 09:53:20'),
  (3822848, 9740093, '0005', '(1g) 10 Mexican Beach Grass for in front plants', NULL, NULL, 215.00, 'pending', '2021-04-27', '2021-04-27 09:58:07'),
  (3823184, 9740093, '0007', 'credit for extra turf', 'Turf to be 400sqft', NULL, -1000.00, 'pending', '2021-04-27', '2021-04-27 10:48:30'),
  (3823544, 9650717, '0001', 'Holland paver upgrade', 'Angelus Holland stone (Red-Brown-Charcoal, Tumbled) price difference for approx. 500 SF
If SF is less once on-site, we will credit you. 

We need to see the grade on-site for steps at the job walk.  This cost will be an extra $500 if we determine that two steps are needed. The steps will be made out of pavers as well. Once demo is complete, grade can be determined with string,  and we will know if steps are necessary.', 'We need to determine if we need a step up and down at job site and see if we need to drop the entire patio down.  Client does want to drop it down, but need to see grade first.  

I did not include steps in paver cost.  $490 extra for 2 (4-5 Lineal Feet) steps. *Will be determined at job walk and a change order submitted at that time for the steps or within the first few days when demo is complete and grade is finalized.', 700.00, 'sold', '2021-04-27', '2021-04-27 11:37:52'),
  (3823600, 7666319, '0037', 'Additional Plants', 'Added plants. 

- 3 Dwarf Fruitless Little Ollie 24 box
- 33 Concha Ceanothus 15 gal
- 11 Coral Aloes 5 gal
- 25 Purple Sage Point Sal 5 gal
- 15 Huntington Carpet Rosemary 5 gal
- 26 Agave 5 gal 
- 12 Licorice Mint Hyssop Agastache Rupestris 1 gal
- 12 Dwarf Mat Rush Breeze1 gal
- 13 Pale Leaf Yucca 5 gal

Run new irrigation to all plants

Install 102 gopher cages to all 1 and 5 gallon plants.', NULL, 13478.00, 'sold', '2021-04-27', '2021-04-27 11:46:00'),
  (3825096, 9491206, '0010', 'Additional 18 LF. DRAINAGE', NULL, NULL, 400.00, 'pending', '2021-04-27', '2021-04-27 16:14:04'),
  (3825617, 9509174, '0003', 'Additional plants  and lighting plan', '(12) 5 Gallon plants @ $45ea  = $540
Return (6) plants @ $45 = $270
total Additional $270', NULL, 270.00, 'sold', '2021-04-27', '2021-04-27 22:27:34'),
  (3826757, 9789694, '0006', 'Reface sides of platform deck with MSI tiles', NULL, NULL, 650.00, 'pending', '2021-04-28', '2021-04-28 08:41:40'),
  (3826954, 9584599, '0001', 'Credit for plants', 'NOT planting

(17) 15g blue ice podocarpus
(32) 4" succulents', NULL, -2630.00, 'pending', '2021-04-28', '2021-04-28 09:17:15'),
  (3826963, 9584599, '0002', 'Credit for 1 drip zone', 'Only need one drip', NULL, -800.00, 'pending', '2021-04-28', '2021-04-28 09:19:59'),
  (3827017, 9584599, '0003', 'Drainage', '3 drain boxes
76 LF of 3" SDR drain pipe', NULL, 2050.00, 'pending', '2021-04-28', '2021-04-28 09:28:43'),
  (3827026, 9584599, '0004', 'Water main line', 'Add 55 LF of 3/4" water main line
Add hose bib', NULL, 1640.00, 'pending', '2021-04-28', '2021-04-28 09:30:36'),
  (3827028, 9584599, '0005', 'Bender board', 'Add 5 LF of benderboard to keep in gravel', NULL, 0, 'pending', '2021-04-28', '2021-04-28 09:31:16'),
  (3827045, 9584599, '0006', 'Gravel', 'Total SF of gravel has changed due to podocarpus not being planted', NULL, 560.00, 'pending', '2021-04-28', '2021-04-28 09:34:44'),
  (3827092, 9584599, '0007', 'Concrete pads for shower', '18 SF of concrete (sand finish) - (2) 3x3’ step pads
Forming and labor', 'Near shower area - del Rio gravel will be around pads', 430.00, 'pending', '2021-04-28', '2021-04-28 09:40:32'),
  (3827112, 9584599, '0008', 'Lights', '300 watt transformer
6 step lights (under new wall cap)
3 up lights', NULL, 2594.00, 'sold', '2021-04-28', '2021-04-28 09:43:42'),
  (3827140, 9584599, '0009', 'Wall cap', '58 LF of Rustic Wall in grey/charcoal (or similar color) for wall cap.  
I have given you a discount on the added cap!

Max will bring samples, maybe you want to hold off on approving until he shows you the sample on Monday.', 'I am unsure what line item this is on the price sheet.  This is my estimate. I think it’s high, but better safe than sorry.', 2150.00, 'sold', '2021-04-28', '2021-04-28 09:48:44'),
  (3827141, 9584599, '0010', 'Hot water and post', '12’ (4x10) pressure treated Doug Fir (termite and rot resistant) with concrete footing.32 LF of hot water line 1/2” copper pipe buried 18” below grade per code, includes trenching and backfill.', 'If we can get this wood from Ganahl that is the pricing I have and I love it there. Takes 1-2 days for the 12’ as it comes from Anaheim to the yard for pickup.', 1560.00, 'sold', '2021-04-28', '2021-04-28 09:48:59'),
  (3827179, 9584599, '0011', 'Add (1) 15g citrus', 'Add one citrus 15g - Max will let Kim and Kevin know what variety of orange they have.

I have given $20 off this plant. Citrus are non-returnable.', NULL, 180.00, 'sold', '2021-04-28', '2021-04-28 09:56:23'),
  (3827340, 9789694, '0007', 'Coring curb for drainage outlet', NULL, NULL, 500.00, 'sold', '2021-04-28', '2021-04-28 10:22:14'),
  (3827342, 9789694, '0008', 'Adding a pressure regulator filter (1) drip zone', NULL, NULL, 90.00, 'sold', '2021-04-28', '2021-04-28 10:22:44'),
  (3831232, 9902783, '0001', 'Natural Flagstones', 'We are now doing 6 Natural Flagstones instead of circular pavers set in DG. 

This is the cost difference from what we had in the contract to the new change.', 'Client doesn''t understand that we went over all of this in the design phase and we signed off on design.', 325.00, 'sold', '2021-04-29', '2021-04-29 09:45:03'),
  (3831454, 9067501, '0004', '3 yards of soil for grading', '$85 per yard.', NULL, 225.00, 'sold', '2021-04-29', '2021-04-29 10:24:27'),
  (3831556, 9902783, '0002', 'Brick Bullnose steps', 'Cost difference for doing the brick BULLNOSE steps instead of the pavers in the center and brick rectangle edge (as we have in contract). Initially we were going to do the same paver as in the back pool deck area in the center of the brick steps, but we have not gotten that far with the phase 2 material selections.

The steps will be all brick with a bullnose edge.', NULL, 425.00, 'sold', '2021-04-29', '2021-04-29 10:40:23'),
  (3831667, 9902783, '0003', 'Set new mailbox in concrete footing', 'Set new mailbox (*to be purchased by client) in concrete footing.', NULL, 200.00, 'sold', '2021-04-29', '2021-04-29 10:56:43'),
  (3832597, 9593020, '0010', 'add (1) Up-lights gr2216 vista', 'only 6 lights were included in previous light change order, this change order adds (1) additional per request on owner provided lighting plan.', NULL, 220.00, 'sold', '2021-04-29', '2021-04-29 13:51:19'),
  (3832871, 9593020, '0011', 'Gate Post   - see attached plan', 'install (4) 7ftx2x2 square post set with concrete for gate, post to be 5ft high when finished. or cut off to exact length after setting, at house/garage run a lag and also concrete footings

george - see attached plan, verify exact location with owner

fence is in the process of being designed/quoted/approved', NULL, 600.00, 'sold', '2021-04-29', '2021-04-29 14:47:44'),
  (3833247, 9760016, '0001', 'Pavers', 'Cost difference of switching to all Stepstone Porcelain pavers. 

(64) 2 x 2 vs. what we had in the contract (Antique Cobble or Catalina Grana in Rio).  This is the cost difference.', NULL, 630.00, 'sold', '2021-04-29', '2021-04-29 16:37:59'),
  (3833260, 9760016, '0002', 'Black Metal edging 4”', 'Adding 90 LF of 4” black metal edging', NULL, 950.00, 'sold', '2021-04-29', '2021-04-29 16:48:19'),
  (3833274, 9760016, '0003', 'Mexican Beach Pebble (Full mix)', 'Adding 1”-2” full Mexican Mixed Beach Pebble for in-between all of the pavers. Both in pathway area and in paver patio grid.  Approx. 60 SF at 3” depth.  Includes weed barrier.

(Planting beds will still be Del Rio - size is 1” minus)', NULL, 500.00, 'sold', '2021-04-29', '2021-04-29 16:54:52'),
  (3833432, 9638887, '0007', 'Wing Wall 8 linear feet at 2 courses', 'Wall to be 8 linear feet with 2 courses (above grade) smooth stucco w/brick cap to match existing walls
This will include demo, material pick up', NULL, 1850.00, 'sold', '2021-04-29', '2021-04-29 18:32:01'),
  (3835892, 9597616, '0001', 'Additional drainage', NULL, 'additional drainage 28 lf X $20.00', 560.00, 'pending', '2021-04-30', '2021-04-30 12:31:23'),
  (3835902, 9597616, '0002', '170 SF of additional pavers', '170 Sf more in front X $12.00  pavers', NULL, 2040.00, 'pending', '2021-04-30', '2021-04-30 12:33:37'),
  (3836068, 9912505, '0001', 'New grass for mow strip in middle of driveway', '121 SF of sod (to match front lawn) in the mow strip in-between driveway. (Replace existing with same look and size)', NULL, 460.00, 'sold', '2021-04-30', '2021-04-30 13:14:35'),
  (3836436, 9584599, '0013', 'Blue Ice Podocarpus', 'These (8) 15g Podocarpus Blue Ice are more expensive than our allotted $75 per 15g plants. They are $125/piece so the difference is $400, I have given a discount here.

Once approved we will move forward with placing the order. If you don''t want Blue Ice the other Podocarpus in the plan (gracillior) are at our price point.', NULL, 350.00, 'sold', '2021-04-30', '2021-04-30 15:35:04'),
  (3836594, 9789694, '0010', '40sqft of Mexican Beach Pebble  next to pool', NULL, NULL, 360.00, 'sold', '2021-04-30', '2021-04-30 18:47:44'),
  (3836724, 9593020, '0012', 'Trim back creeping fig', NULL, NULL, 485.00, 'pending', '2021-05-01', '2021-05-01 07:38:52'),
  (3839083, 9760370, '0002', 'Electrical conduite and wiring with one outlet', '40 linear feet of wiring and one outlet  $22 X 40 linear feet = $880.00, one outlet $100.00 = $980.00', NULL, 980.00, 'pending', '2021-05-03', '2021-05-03 09:42:57'),
  (3839528, 9990082, '0001', 'Controller', NULL, NULL, 400.00, 'pending', '2021-05-03', '2021-05-03 11:02:48'),
  (3839570, 9584599, '0014', '8 Stumps', 'Max found 8 small stumps with thick roots in the planter beds.

We will need a stump grinder.', NULL, 875.00, 'sold', '2021-05-03', '2021-05-03 11:09:30'),
  (3839625, 9584599, '0015', 'Credit 8 vines', 'Not doing this many vines.  We are keeping 2 (1gallon) - Jasmine vine for corner and grape vine for for shower area or vice versa.', NULL, -190.00, 'sold', '2021-05-03', '2021-05-03 11:17:23'),
  (3839745, 9841032, '0001', 'Adding 50 SF of concrete for trash can areas', 'This amount was included in the contract $3.00 for demo, and $8.00 for form and pour', NULL, 0, 'pending', '2021-05-03', '2021-05-03 11:34:36'),
  (3840975, 9789694, '0011', '3/4" Del Rio for Planter along back perimeter', '140sqft includes weed fabric', NULL, 350.00, 'sold', '2021-05-03', '2021-05-03 15:09:16'),
  (3841286, 8300808, '0012', 'adding RTF replaciment', '346 additional square feet X $3.50= $1,211.00', NULL, 1211.00, 'pending', '2021-05-03', '2021-05-03 16:42:41'),
  (3841843, 9680412, '0015', 'Import 2 yards raw soil with wheelbarrow', 'Import 2 CY soil to fill behind walls and raise soil level', NULL, 300.00, 'sold', '2021-05-03', '2021-05-03 23:25:16'),
  (3843345, 9566529, '0003', '30ft of paver step', NULL, NULL, 1950.00, 'sold', '2021-05-04', '2021-05-04 09:53:38'),
  (3844887, 9593020, '0013', 'Temporary fencing', NULL, NULL, 550.00, 'sold', '2021-05-04', '2021-05-04 14:06:03'),
  (3844972, 9789694, '0012', 'Moving the fire pit to be squared off w/tiles', NULL, NULL, 440.00, 'pending', '2021-05-04', '2021-05-04 14:20:26'),
  (3844987, 9584599, '0016', 'Additional stump removal', 'Stumps are huge and we need machine for another day. Max has shown clients and described extra large Juniper skyrocket stumps in planter bed.', NULL, 230.00, 'sold', '2021-05-04', '2021-05-04 14:23:00'),
  (3848177, 9740093, '0008', 'Extra pruning around the property', NULL, NULL, 500.00, 'pending', '2021-05-05', '2021-05-05 11:41:43'),
  (3851328, 9740093, '0009', 'Credit for Tree (15g Olive)', 'credit for 15 gallon Olive Tree', NULL, -150.00, 'pending', '2021-05-06', '2021-05-06 08:53:09'),
  (3851347, 9740093, '0010', 'Add''l Podocarpus and Grasses', '(1) 24Gallon Podocarpus (440.00)
(3) 15G Podocarpus ($150 ea planted)
(3) 1G grasses ($21 - you had a credit for (1) 5 gallon topiary that was on the original estimate)', NULL, 910.00, 'pending', '2021-05-06', '2021-05-06 08:55:05'),
  (3852450, 9458121, '0014', 'CREDIT', NULL, 'settlement credit', -431.00, 'pending', '2021-05-06', '2021-05-06 12:03:07'),
  (3853912, 9593020, '0014', 'Planting Plan with prices', 'see allowance per previous approved change order #0006

(2) 15 Gallon Palms                     $300ea                              $600
(1) 24" Box Tree                                                                    $385 
(22) 5 Gallon Shrubs                    @ $45ea                           $990
(32) 1 gallon plants                        @ $22ea                          $704
Planting Design                                                                       $400
                                                                                     Total  $3079
                                                                   Plant Allowance $2880
                                  Additional planting allowance required $199

Credits
Decomposed granite credit   from 500sqft to 350                 -$585
Concrete Credit from 875sqft to 820sqft                              - $473
Electric to bbq credit                                                             -$700
                                                                        Total Credit -$1758

this change order charges against the approved allowance as a credit', NULL, -1559.00, 'sold', '2021-05-06', '2021-05-06 19:04:18'),
  (3855566, 8330556, '0005', 'Upgrade (18) Fouqueria Splendens to 15 gallon', 'please see attached copy of email as an E-approval for this upgrade', 'from 5 gallon to 15 gallon', 3600.00, 'pending', '2021-05-07', '2021-05-07 10:25:47'),
  (3855621, 9760016, '0004', 'Added Demo', 'Remove CMU wall in preparation for gate installation. See photo attached.

Approx. 3.5’ x 5’ 3” CMU block wall with 19” wood lattice top.', NULL, 300.00, 'sold', '2021-05-07', '2021-05-07 10:34:37'),
  (3856952, 9597616, '0003', '165 so pavers', '165 so x $12.00. Juventino to pick up pavers tomorrow', NULL, 1980.00, 'pending', '2021-05-07', '2021-05-07 16:52:14'),
  (3857016, 9491206, '0011', 'Added sod', 'We had 702 SF of sod in the contract, client measured 730 SF. This doesn''t include industry standard of overage.', NULL, 105.00, 'pending', '2021-05-07', '2021-05-07 18:58:09'),
  (3857034, 9509510, '0005', 'Seal counter top', NULL, NULL, 300.00, 'sold', '2021-05-07', '2021-05-07 20:34:17'),
  (3857284, 9638887, '0008', 'Stucco and paint steps. All sides.', NULL, NULL, 980.00, 'sold', '2021-05-08', '2021-05-08 14:08:16'),
  (3859790, 9760016, '0005', 'Main line water 3/4" pvc pipe', 'Move main line 34 LF towards steps and out of concrete BB area. Hidden behind plants or pot.', NULL, 600.00, 'sold', '2021-05-10', '2021-05-10 10:36:07'),
  (3860224, 9760016, '0006', 'Basketball electrical', '20 LF of 3/4" conduit and waterproof electrical box', NULL, 370.00, 'sold', '2021-05-10', '2021-05-10 11:54:51'),
  (3860237, 9760016, '0007', 'Concrete step 4 LF', 'Concrete step down to shed 4 LF', NULL, 192.00, 'sold', '2021-05-10', '2021-05-10 11:57:21'),
  (3860292, 9760016, '0008', 'Adding 75 SF of concrete to BB area', 'Adding concrete', NULL, 500.00, 'sold', '2021-05-10', '2021-05-10 12:05:28'),
  (3860312, 9760016, '0009', 'Credit for 4'' of wall', 'We are not doing a wall where entrance to shed is, instead we added a step down. This is the credit for wall.', NULL, -545.00, 'sold', '2021-05-10', '2021-05-10 12:07:03'),
  (3860359, 9760016, '0010', 'Concrete curb for step down', '21 LF of concrete curb 10" high 6" thick', NULL, 945.00, 'sold', '2021-05-10', '2021-05-10 12:13:48'),
  (3860377, 9760016, '0011', 'Add 34 SF to sod measurement', 'Courtesy no charge ($127)', NULL, 0, 'sold', '2021-05-10', '2021-05-10 12:16:33'),
  (3860397, 9760016, '0012', 'Add electrical', 'Add 34 LF of 3/4" conduit with outdoor waterproof electrical box', NULL, 580.00, 'pending', '2021-05-10', '2021-05-10 12:19:02'),
  (3860647, 6304060, '0003', 'Design Credit due', NULL, NULL, -700.00, 'pending', '2021-05-10', '2021-05-10 12:57:53'),
  (3861258, 9348018, '0012', 'CREDIT', NULL, NULL, -69.94, 'pending', '2021-05-10', '2021-05-10 14:45:40'),
  (3861587, 9760016, '0013', 'Stepstone 2 x 2s credit', 'We are doing 7 x 7 = 49 (2x2''s)
I estimated for 8 x 8 so this is the credit difference for 15 stepping stones.', NULL, -1100.00, 'sold', '2021-05-10', '2021-05-10 16:49:47'),
  (3861602, 9760016, '0014', 'Extra footing for BB court', 'Shaka did 2 other courts recently and their specs followed appropriate footings. Recommended 48" x 24".

We had in contract 48" x 16" and both Melinda and Shaka agree we need stronger footings at 5000 psi (not 2500 psi).', NULL, 350.00, 'sold', '2021-05-10', '2021-05-10 16:54:28'),
  (3861681, 9785320, '0002', '(credit) Remove brick from scope of work 40ft', NULL, NULL, -1260.00, 'sold', '2021-05-10', '2021-05-10 17:27:01'),
  (3861687, 9785320, '0003', 'Stucco 1-side of block wall 450sqft', NULL, NULL, 3150.00, 'pending', '2021-05-10', '2021-05-10 17:31:06'),
  (3865859, 9831009, '0001', 'Temporary Fence', '50 linear feet', NULL, 600.00, 'sold', '2021-05-11', '2021-05-11 15:47:08'),
  (3871752, 9850257, '0001', 'Design', '750-375', NULL, 375.00, 'pending', '2021-05-13', '2021-05-13 08:58:23'),
  (3873129, 9785320, '0004', '(credit) 40ft - 1-block', 'Credit 1-block not installed , includes 20% return costs   -$300', NULL, -300.00, 'sold', '2021-05-13', '2021-05-13 13:05:02'),
  (3873441, 9593020, '0015', 'Credit, Drains and contract addition typo', 'Actual Original Contract $29,836 -Typo (not $28,836)    Add $1000        see contract addition
Credit -  Sidewalk Demo and install                                      - $3200
Credit - Permit Allowance                                                      - $1500

                                                                            Total Credit -$3700', NULL, -3700.00, 'sold', '2021-05-13', '2021-05-13 14:01:38'),
  (3873461, 9593020, '0016', '2x4 pressure treated border', '38ft of  pressure treated 2x4', NULL, 380.00, 'sold', '2021-05-13', '2021-05-13 14:06:20'),
  (3873807, 9821684, '0002', '2 additional drip zones', '2 new drip zones for the planters', NULL, 1800.00, 'pending', '2021-05-13', '2021-05-13 15:34:26'),
  (3873878, 9821684, '0003', 'additional pavers', '1) Courtyard driveway 52 square feet X $12.00= $630.00
2)  Paseo I & II front porch and entry  18 SF X $15.25= $274.00
3)  Paseo I & II extending the back patio11.5 ft  X 2 ft = 23 SF X $15.25= $350.00
4)  CREDIT 7 SF on side of the house - $84.00 
Total additional pavers
$1,170.00', NULL, 1170.00, 'pending', '2021-05-13', '2021-05-13 15:55:53'),
  (3875085, 9760370, '0003', '5 additional 5 gallon plants.', '5 additional 5 gallon Raphiolepis umbrella minor', NULL, 215.00, 'pending', '2021-05-14', '2021-05-14 07:41:30'),
  (3875765, 9650717, '0002', 'Add concrete slab demo and paver install', 'Demo 86 SF of older concrete up until the red line 
86 paver install up to the red line (not including any steps)', 'this does not include the 4.8 LF of stepdown, waiting to see what they choose for the step area to add on step cost.', 1460.00, 'sold', '2021-05-14', '2021-05-14 09:54:13'),
  (3876756, 9650717, '0003', 'Demo and install 2 Steps out from Garage', 'Hand demo existing concrete steps/landing out from garage and timbers.

- ADD (2) 6.6 LF Holland tumbled paver steps (RBC) out from garage.  Jorge and Jueventino offered design of one diagonal step and one semi-straight step.  (Similar to what is existing now as it is a small corner).

- Infill approx 12 SF of Holland tumbled pavers (RBC).', NULL, 855.00, 'sold', '2021-05-14', '2021-05-14 13:10:10'),
  (3876773, 9650717, '0004', 'Add 4 LF drain pipe & 4 socks gutter downspouts', 'ADD 4 LF of drain pipe to popup
ADD 4 socks to downspouts to connect to main drain', NULL, 100.00, 'sold', '2021-05-14', '2021-05-14 13:12:53'),
  (3876783, 9650717, '0005', '50 SF Paver patio (measurements not to scale)', 'Contract had 500 SF of paver, we are needing 550 SF of paver.  This is the cost difference.', NULL, 645.00, 'sold', '2021-05-14', '2021-05-14 13:15:44'),
  (3877131, 9831009, '0002', 'Retaining Wall Extensions', 'Wall #1 (bottom for fence) +6"H
Wall #2 reducing 1 linear foot, adding 13" (1 1/2 courses)
Wall #3 +3 linear feet
Wall #5 +5 linear feet, + 14"H (1 1/2 courses)
Wall #6 + 2 linear feet', NULL, 2575.00, 'sold', '2021-05-14', '2021-05-14 15:18:43'),
  (3877132, 9831009, '0003', 'Stucco for Wall Additions', NULL, NULL, 900.00, 'sold', '2021-05-14', '2021-05-14 15:19:16'),
  (3877133, 9831009, '0004', 'Waterproofing for Wall Additions', NULL, NULL, 550.00, 'sold', '2021-05-14', '2021-05-14 15:19:39'),
  (3877134, 9831009, '0005', 'Sod', 'Additional 150sqft', NULL, 525.00, 'sold', '2021-05-14', '2021-05-14 15:20:21'),
  (3877137, 9831009, '0006', 'Additional French Drains for Walls #3/#4', '+74 linear feet of drainage', NULL, 2960.00, 'sold', '2021-05-14', '2021-05-14 15:21:26'),
  (3877138, 9831009, '0007', 'Landscape Timber Steps For Side Walls/Step Area', '10 linear feet total
(2) 3 linear feet for second terraced wall
(10) 4 linear feet step for 1st terraced wall', NULL, 350.00, 'sold', '2021-05-14', '2021-05-14 15:22:44'),
  (3877191, 9680412, '0019', 'Additional plants per client request', 'ADDED Plant request per client:

(13) 1gallon Golden variegated Sweet Flag ($280- labor and material)
 
(3) 5gallon Agave foxtail (No additional charge, exchange for (3) 5gallon fire sticks)', NULL, 280.00, 'sold', '2021-05-14', '2021-05-14 16:18:40'),
  (3877226, 8739112, '0031', '1/2-1" Arroyo River Rock for Firepit Area', NULL, NULL, 525.00, 'sold', '2021-05-14', '2021-05-14 16:43:16'),
  (3877228, 8739112, '0032', 'Bender Board for Firepit Area', NULL, NULL, 180.00, 'sold', '2021-05-14', '2021-05-14 16:44:52'),
  (3877230, 8739112, '0033', 'Split Zone For Irrigation in Back', NULL, NULL, 700.00, 'pending', '2021-05-14', '2021-05-14 16:45:21'),
  (3877232, 8236436, '0001', 'CREDIT', NULL, NULL, -750.00, 'pending', '2021-05-14', '2021-05-14 16:46:37'),
  (3877251, 9964015, '0001', 'Credit for demo 13LF of fencing', 'We are NOT going to demo 13 LF of fencing in front of little wall. 
Linsey and Daniel have taken care of this already.', NULL, -200.00, 'sold', '2021-05-14', '2021-05-14 17:30:22'),
  (3877262, 9902783, '0004', 'Thin out bamboo and remove plants behind couch', 'Thin out bamboo stems from the lower trunk area. Cut stems so there is spacing at bottom and less of a clump where the pool decking meets the planter bed. 

NO HEDGING.

Remove plants behind couch (1 gallons and maybe (1) 5 gallon)', NULL, 450.00, 'sold', '2021-05-14', '2021-05-14 17:55:47'),
  (3877278, 9650717, '0006', 'Add 4 LF stepdown to gravel area (side of house)', 'Now that we know paver is almost flush with back door, there will be a step down to the gravel area on the side of the house (where the A/C unit is). This is for paver install for approx 4-5 LF of paver step.', 'Jorge said Jueventino will charge for this step down so we have to do it.', 180.00, 'sold', '2021-05-14', '2021-05-14 18:26:22'),
  (3877280, 9650717, '0007', 'Waterproofing 18 LF', 'Waterproofing 18 LF near bottom of house where concrete meets siding.', NULL, 180.00, 'sold', '2021-05-14', '2021-05-14 18:32:32'),
  (3881979, 9789694, '0013', 'Credit for (1) Light Pole', NULL, NULL, -80.00, 'pending', '2021-05-17', '2021-05-17 17:17:40'),
  (3881982, 9674051, '0001', 'Pergola Removal', 'Pergola to be done by other.', NULL, -8000.00, 'sold', '2021-05-17', '2021-05-17 17:18:07'),
  (3883422, 9593020, '0017', '4-station Irrigation Controller', NULL, NULL, 447.00, 'pending', '2021-05-18', '2021-05-18 07:53:59'),
  (3883603, 9760016, '0015', 'Colored concrete', 'Upgrade to colored concrete - Davis in Outback - 8-9 yards', NULL, 375.00, 'sold', '2021-05-18', '2021-05-18 08:14:27'),
  (3884004, 9951078, '0001', 'Drainage', '25 linear feet of drainage X $25.00= $625.00', NULL, 625.00, 'pending', '2021-05-18', '2021-05-18 09:18:32'),
  (3884015, 9951078, '0002', 'GAzebo Footings', NULL, '4 footings at $150.00 each', 600.00, 'pending', '2021-05-18', '2021-05-18 09:20:12'),
  (3884022, 9951078, '0003', 'GAzebo Installation', 'Installation of Gazibo', NULL, 1500.00, 'pending', '2021-05-18', '2021-05-18 09:21:42'),
  (3884044, 9951078, '0005', 'Paver Credit', 'Installig 134 Less Square Feet X $12.00', NULL, -1608.00, 'pending', '2021-05-18', '2021-05-18 09:24:23'),
  (3884053, 9951078, '0006', 'Credit for not putting back old gazebo', NULL, NULL, -500.00, 'pending', '2021-05-18', '2021-05-18 09:26:00'),
  (3884644, 9821684, '0004', 'Additional drainage', 'Total drainage is 242 linear feet with caps. 84 linear feet  in contract 158 additional lf drainage. X $20.00= $3,160.00', NULL, 3160.00, 'pending', '2021-05-18', '2021-05-18 10:49:39'),
  (3884734, 9067501, '0005', 'Hose Bib in the back', NULL, NULL, 450.00, 'sold', '2021-05-18', '2021-05-18 11:03:55'),
  (3884753, 9067501, '0006', '40 more lf of Bender Board', NULL, NULL, 240.00, 'sold', '2021-05-18', '2021-05-18 11:07:07'),
  (3884796, 9067501, '0007', 'Credit for DG 350sf', NULL, NULL, -1615.00, 'sold', '2021-05-18', '2021-05-18 11:13:09'),
  (3886178, 9902783, '0005', 'Brick', 'This is the cost for doing all new manufactured brick (just like the one you have in the driveway) for the pathways and near gate.', NULL, 1350.00, 'sold', '2021-05-18', '2021-05-18 14:44:42'),
  (3886863, 9067501, '0008', 'Add''l Plants', '(1) 24" Agonis flexuosa
(5) 5g Mimulus aurantiacus
(8) 5g Hedychium (Ginger lilies)', NULL, 950.00, 'sold', '2021-05-18', '2021-05-18 19:21:03'),
  (3888001, 9740093, '0011', '1/2-1" Mexican Beach Pebble Mix', 'Beds by lake x 2 
47x3', NULL, 1375.00, 'pending', '2021-05-19', '2021-05-19 08:11:02'),
  (3888245, 9680412, '0020', 'Credit client for purchasing plants direct', 'Credit for purchasing plants directly from Moon Valley.
Credit was negotiated with Brian and client.', NULL, -4300.00, 'sold', '2021-05-19', '2021-05-19 08:53:00'),
  (3888250, 9680412, '0021', 'Palm tree installation', 'Cost to install palms as per Brian and Eric’s conversation', NULL, 900.00, 'sold', '2021-05-19', '2021-05-19 08:54:25'),
  (3888709, 9785497, '0001', 'Add 1ft length to bbq', NULL, NULL, 600.00, 'pending', '2021-05-19', '2021-05-19 10:12:58'),
  (3889269, 9821684, '0005', 'Water main.', NULL, NULL, 1000.00, 'sold', '2021-05-19', '2021-05-19 11:37:12'),
  (3890105, 9760016, '0016', '2 Extra Steps', 'Two steps need to be added to make grass lower and flat.
Steps are 4'' and 7''
Both have a 7" rise (typical is 4-6" rise) and 12" step tread (normal).
Both steps are in colored concrete.', NULL, 570.00, 'sold', '2021-05-19', '2021-05-19 13:47:35'),
  (3890606, 9785497, '0002', 'Saw cut for utilities', NULL, NULL, 200.00, 'sold', '2021-05-19', '2021-05-19 15:37:54'),
  (3890947, 9740093, '0012', 'Shredded Mulch for beds hugging deck', NULL, NULL, 300.00, 'pending', '2021-05-19', '2021-05-19 18:06:09'),
  (3891266, 9566529, '0004', 'Additional synthetic grass and bender board', 'add approx 75sqft additional synnthetic grass and 5 ft bender board edging', NULL, 865.00, 'sold', '2021-05-19', '2021-05-19 21:57:49'),
  (3892370, 9740093, '0013', 'Extra Karl Foerster Grasses (1)g', NULL, NULL, 66.00, 'pending', '2021-05-20', '2021-05-20 08:23:31'),
  (3893644, 9821684, '0006', 'Pour in lid for clean out', NULL, NULL, 100.00, 'sold', '2021-05-20', '2021-05-20 12:14:32'),
  (3894285, 9975675, '0002', '(credit) remove fencing from scope of work', NULL, NULL, -2150.00, 'sold', '2021-05-20', '2021-05-20 14:04:59'),
  (3894325, 7928625, '0009', 'Credit Issued', NULL, NULL, -750.00, 'pending', '2021-05-20', '2021-05-20 14:17:23'),
  (3894547, 10001394, '0001', 'Credit for Irrigation Assessment (backyard)', NULL, NULL, -1200.00, 'sold', '2021-05-20', '2021-05-20 15:13:45'),
  (3894553, 10001394, '0002', 'Irrigation add on', '(1) Netafim drip zone
(1) Spray Zone
(1) Drip zone for beds', NULL, 2700.00, 'sold', '2021-05-20', '2021-05-20 15:15:01'),
  (3894562, 10001394, '0003', 'Trellis install (add''l time)', 'Adding a change order for this as it will likely take (1) full day to install this, we will give a credit if it takes less time.', NULL, 350.00, 'sold', '2021-05-20', '2021-05-20 15:17:24'),
  (3894753, 9785497, '0003', '(4) footings for cover and', NULL, 'We did not pour footings (cancel change order)', 980.00, 'sold', '2021-05-20', '2021-05-20 16:28:52'),
  (3896007, 9566529, '0005', 'Planting plan with layout attached', 'includes upgraded Japanese maple to 24" box so its of decent size', NULL, 2185.00, 'sold', '2021-05-21', '2021-05-21 08:22:42'),
  (3897973, 9597616, '0004', 'Additional Plants, bender board, and mulch', 'Bender Board $8.00 X 30= $240.00
Plants please see attachement for list  = $857.00
Mulch  400 additional Sf X $1.50= $600.00
$1697.00', NULL, 1697.00, 'pending', '2021-05-21', '2021-05-21 15:42:48'),
  (3898094, 9740093, '0014', 'Add''l lights', '(1) path 
(1) uplight', NULL, 445.00, 'pending', '2021-05-21', '2021-05-21 17:39:28'),
  (3900184, 9850257, '0002', 'Contract Changes', NULL, NULL, 3845.00, 'pending', '2021-05-24', '2021-05-24 09:00:26'),
  (3900431, 9597597, '0001', 'Design Credit due', NULL, NULL, -375.00, 'pending', '2021-05-24', '2021-05-24 09:47:36'),
  (3900465, 9951173, '0001', 'Design Credit due', NULL, NULL, -375.00, 'pending', '2021-05-24', '2021-05-24 09:53:20'),
  (3901994, 9740093, '0015', 'Install (4) 5 gallon plants for courtyard', NULL, NULL, 24.00, 'pending', '2021-05-24', '2021-05-24 13:54:08'),
  (3902483, 9850257, '0003', 'reduced RTF 131 sf', 'Area for grass has been reduced', NULL, -458.00, 'pending', '2021-05-24', '2021-05-24 15:57:50'),
  (3902484, 9850257, '0004', 'Additional Drip Line', 'adding 1 additional drip zone', NULL, 900.00, 'pending', '2021-05-24', '2021-05-24 15:59:34'),
  (3902603, 9359454, '0013', 'Additional plants', '(8) 1 Gallon plants       $176
(4) 5 gallon plants        $180
4ft of 6" bender board   $65', NULL, 421.00, 'sold', '2021-05-24', '2021-05-24 16:48:26'),
  (3906481, 9674051, '0002', 'Prep/Grading/Add''l Demo', '1) Bring up grade along deck and out towards patio, roughly 450 sqft x 6" depth, will need add''l 50/50 soil to avoid having to build 2 deck steps
2) Remove ivy from fence along side shared with neighbor''s 
3) Remove naval tree by deck', NULL, 2000.00, 'sold', '2021-05-25', '2021-05-25 15:02:33'),
  (3906486, 9674051, '0003', 'Sand Finish for All Concrete', NULL, NULL, 560.00, 'sold', '2021-05-25', '2021-05-25 15:03:25'),
  (3906523, 9674051, '0004', 'Additional concrete for patio extension', '+12sqft of patio (for kitchen area)
+30sqft from patio towards deck (where steppers will be)
+30sqft for area behind firepit (for seating)

Reduction in stepper size (losing 150sqft)', NULL, 100.00, 'sold', '2021-05-25', '2021-05-25 15:13:10'),
  (3906525, 9674051, '0005', 'Move water main in backyard to side of house', NULL, NULL, 150.00, 'sold', '2021-05-25', '2021-05-25 15:13:47'),
  (3906533, 9674051, '0006', 'Running Electrical for Kitchen + add''l outlet', '48 lf of electrical conduit from kitchen to deck area
Plus 1 outlet (total of 3)', NULL, 1100.00, 'sold', '2021-05-25', '2021-05-25 15:17:58'),
  (3908059, 9067501, '0009', 'Add’l trees/plants', '1 24” multi crepe Myrtle 1 15” Bahunia
(6) 5 gallon Azalea', NULL, 850.00, 'sold', '2021-05-26', '2021-05-26 07:52:43'),
  (3911405, 8307830, '0001', 'Permit Plan Drafting', 'by ryan', NULL, 600.00, 'pending', '2021-05-27', '2021-05-27 01:28:00'),
  (3911406, 8160247, '0001', 'Permit Plan Drafting', 'By Ryan', NULL, 600.00, 'pending', '2021-05-27', '2021-05-27 01:29:13'),
  (3911407, 9067548, '0001', 'Permit Plan Drafting', 'by ryan', NULL, 850.00, 'pending', '2021-05-27', '2021-05-27 01:30:11'),
  (3912555, 10054765, '0001', '(4) 5 gallon Creeping Fig', NULL, NULL, 175.00, 'sold', '2021-05-27', '2021-05-27 08:57:23'),
  (3913512, 9643179, '0007', 'Credit for (20) 1 Gallons', 'Rudbeckia that were smaller', NULL, -75.00, 'sold', '2021-05-27', '2021-05-27 11:50:34'),
  (3916658, 9975675, '0003', '100ft Main line', NULL, NULL, 2500.00, 'pending', '2021-05-28', '2021-05-28 10:11:14'),
  (3916668, 9975675, '0004', '68ft additional Bender Board', NULL, NULL, 408.00, 'pending', '2021-05-28', '2021-05-28 10:13:39'),
  (3916690, 9975675, '0005', 'credit for not removing palm tree..add trim 3 palm', NULL, NULL, -200.00, 'pending', '2021-05-28', '2021-05-28 10:18:01'),
  (3916706, 9674051, '0007', 'Burying water main/adding pvc pipe', NULL, NULL, 650.00, 'sold', '2021-05-28', '2021-05-28 10:21:08'),
  (3916763, 9975675, '0006', '2 iceberg rose vines pink or burgundy..nowhite', NULL, NULL, 120.00, 'pending', '2021-05-28', '2021-05-28 10:33:27'),
  (3917765, 9566529, '0006', '(credit) 40ft  Fencing and Gate  from contract', 'Our sub contractor is no longer available to install this fencing for this for 5 months', NULL, -2732.00, 'sold', '2021-05-28', '2021-05-28 14:32:36'),
  (3917939, 9680412, '0022', 'Install 3 low-voltage lights (per client request)', NULL, 'Labor for installing 3 additional low-voltage lights (per client request). Comped by Brian.', 0, 'sold', '2021-05-28', '2021-05-28 16:15:08'),
  (3918149, 9821684, '0007', '8 lf of electrical and one outlet', NULL, NULL, 300.00, 'sold', '2021-05-29', '2021-05-29 08:32:07'),
  (3918180, 9597616, '0005', 'Front Yard Changes', '1 spray zone =$900.00
RTF  230 SF X $33.50= $805.00
Bender Board 64 SF X $8.00= $512.00
Del Rio 1" 99 SF X $6.00= 594.00
5 more 1 gallon lavender X $21.00 = $105.00

Moving the mulch from the front to the back of the grass in back
Keeping green carpet, moving them to front and putting some lavenders in between', NULL, 2916.00, 'pending', '2021-05-29', '2021-05-29 10:03:48'),
  (3918191, 8300808, '0013', 'Paver repair 50 sf', '50 sf replacing same pavers after plumbing work was done. 
pavers are on site.', NULL, 450.00, 'pending', '2021-05-29', '2021-05-29 10:22:45'),
  (3921035, 9597616, '0006', 'Owner provided plants. 10', '10 plants by owner x $10.00.', NULL, 100.00, 'sold', '2021-06-01', '2021-06-01 08:48:49'),
  (3923153, 9674051, '0008', 'Kitchen Extension', 'Adding 5 linear feet of countertop for bbq, includes stone veneer facing', NULL, 2800.00, 'sold', '2021-06-01', '2021-06-01 14:21:50'),
  (3923945, 9951448, '0001', 'Drainage and Wall', 'Add linear 51 feet at $21 a foot.  - $1071

Add 9 linear feet of Belgard Highland Wall 18 inches high including cap  $1457', NULL, 2528.00, 'sold', '2021-06-01', '2021-06-01 19:18:24'),
  (3927200, 9821684, '0008', 'Fountain set up', NULL, NULL, 350.00, 'pending', '2021-06-02', '2021-06-02 13:37:55'),
  (3928034, 10127581, '0001', 'CREDIT Electrical', 'Spa/Electrical – 120lf
1. Install 1” conduit from panel.
2. Includes 220v service and 8awg wire
3. GFi and spa disconnect 5ft from spa as required per code
Price $3424

Only running 1" line rough
120x$20 lnft = $2400

Credit difference of $1,024', NULL, -1024.00, 'pending', '2021-06-02', '2021-06-02 17:19:16'),
  (3929839, 9509510, '0006', 'Boston Ivy Credit', NULL, NULL, -115.00, 'pending', '2021-06-03', '2021-06-03 09:20:08'),
  (3929912, 9785497, '0004', 'Seal counter top', NULL, NULL, 148.00, 'sold', '2021-06-03', '2021-06-03 09:35:27'),
  (3930285, 9674051, '0009', 'Conduit to spa area (No wire)', NULL, NULL, 330.00, 'sold', '2021-06-03', '2021-06-03 10:40:43'),
  (3930761, 9593020, '0018', 'Drainage/core street', NULL, NULL, 1500.00, 'sold', '2021-06-03', '2021-06-03 11:50:25'),
  (3931412, 9821684, '0009', 'Additional art turf 140 sf', NULL, NULL, 1400.00, 'sold', '2021-06-03', '2021-06-03 13:38:20'),
  (3933931, 9902311, '0001', 'Additional drainage 32 LF.', NULL, NULL, 800.00, 'pending', '2021-06-04', '2021-06-04 09:47:37'),
  (3938139, 9858125, '0002', 'Bender board for concrete driveway area', '2" x 6" brown plastic bender board for protecting fence from concrete pour', NULL, 300.00, 'sold', '2021-06-07', '2021-06-07 10:15:10'),
  (3938151, 9858125, '0003', 'Grinding off footings of little wall on east side', '3 hours of labor for grinding concrete wall on east side of driveway', NULL, 195.00, 'sold', '2021-06-07', '2021-06-07 10:17:27'),
  (3938173, 9858125, '0004', 'Main line (water)', '68 LF of 1" main line PVC', NULL, 1836.00, 'sold', '2021-06-07', '2021-06-07 10:20:51'),
  (3938198, 9858125, '0005', 'Extra grass needed', 'Need to add 178 SF of Valley RTF sod (measurement of sod was crooked due to property lines being not straight)', NULL, 650.00, 'sold', '2021-06-07', '2021-06-07 10:25:07'),
  (3938203, 9858125, '0006', 'Credit for smart timer', NULL, NULL, -400.00, 'sold', '2021-06-07', '2021-06-07 10:25:34'),
  (3941377, 9858125, '0007', '3000 psi', 'UPGRADE from 2500 psi to 3000 psi for concrete pour for 1,945 SF

*with either psi, cracks are not guaranteed nor covered by our concrete warranty', 'FYI Brian let me know that 3000 psi is $30/CY more than 2500 psi.  We can offer it, no problem, but with existing contracts we have to give them the option because it is a change order.', 720.00, 'sold', '2021-06-08', '2021-06-08 07:23:45'),
  (3941583, 10233398, '0001', 'Bamboo removal', 'Remove Bamboo near front gate and along mow strip on side of driveway', NULL, 850.00, 'sold', '2021-06-08', '2021-06-08 07:57:03'),
  (3941661, 9760016, '0017', 'Add one switch for BB light', 'Outdoor rated switch for basketball court light (to be located near timer)
Wiring is ready, sleeve is ready for Nacho to install.', NULL, 80.00, 'sold', '2021-06-08', '2021-06-08 08:07:50'),
  (3948631, 9760016, '0018', 'Credit for 9 (1 gallons)', 'Credit for 9 (1 gallons) Sweet grass ''Ogon'' that we did not recieve or plant.', NULL, -175.00, 'sold', '2021-06-09', '2021-06-09 16:19:32'),
  (3948636, 9760016, '0019', '3 (1gallon) Kangaroo paws', '3 (1 gallons) Kangaroo paws (need to know color choice)', NULL, 60.00, 'sold', '2021-06-09', '2021-06-09 16:21:13'),
  (3948648, 9760016, '0020', 'Pathway revised', 'Demo existing concrete 16 x 3 ($295)
7 rectangular stepping stones ($875)
Labor included.
Hauling included.
Dump fees included.', NULL, 1170.00, 'sold', '2021-06-09', '2021-06-09 16:26:36'),
  (3948784, 9680412, '0023', 'Install 7 high voltage lights', 'Max and helper to install 7 high voltage lights on the home exterior', NULL, 900.00, 'pending', '2021-06-09', '2021-06-09 17:32:06'),
  (3952855, 9964015, '0002', 'Drainage in frontyard', '50 LF of 3” SDR pipe includes materials, labor, trenching and backfill($25/LF = $1,250)
Core through front property line retaining wall ($500)
2 downspout adapters (gutter attachment) - Complementary

9” valve box for the sewer pipe (bring it down and hide it) - ($130)', NULL, 1880.00, 'sold', '2021-06-10', '2021-06-10 16:16:29'),
  (3952869, 9964015, '0003', '6 LF Retaining wall in backyard', '6 LF of CMU 8” x 8” x 16” retaining wall in backyard with 1’ x 2’ footings
Wall is to be 4.5’ high (approx 54”)
Hand trowel stucco cap - 6 LF
Smooth stucco add on to this wall only - ($260) color TBD

(*Length might change depending on tread of steps)', NULL, 1250.00, 'sold', '2021-06-10', '2021-06-10 16:25:21'),
  (3952887, 9964015, '0004', 'Demo existing concrete steps', 'Demo existing concrete steps, see photo attached.

(Hauling fees are included and extra if we are mixing loads of concrete with green waste)', NULL, 550.00, 'sold', '2021-06-10', '2021-06-10 16:32:23'),
  (3952901, 9964015, '0005', 'New concrete steps', '7 steps at 4’ wide with 2 1/2” cantilever and 4” tile overlay (see separate change order for tile). 
3000 psi GREY concrete pour
Sand finish on cantilever steps to match existing pavers in backyard. 
Smooth Stucco same as wall - approx 13 SF ($120)', NULL, 1544.00, 'sold', '2021-06-10', '2021-06-10 16:41:30'),
  (3952937, 9964015, '0009', 'Add one drip line to backyard hillside', 'Add one drip zone, Brass anti-siphon valve, Netafim drip line to back hillside.

Jorge mentioned splitting it down the middle so half on one side and half on the other.', NULL, 895.00, 'sold', '2021-06-10', '2021-06-10 16:52:36'),
  (3954146, 9831009, '0008', 'Remove Front Bollards', NULL, NULL, 600.00, 'sold', '2021-06-11', '2021-06-11 08:04:45'),
  (3954559, 9359454, '0014', 'Additional plants', '(10) 1 Gallon plants / Pink Cranesbill                              $22/ea x 10 = $220
(1) 5 Gallon plants / Agapanthus Purple                        $45/ea
(1) 15 Gallon plant / Pittosporum Dwarf Fruitless       $150/ea

Total: $415', NULL, 415.00, 'pending', '2021-06-11', '2021-06-11 09:26:20'),
  (3956177, 9964015, '0011', 'Electrical', 'Additional 1 1/4” conduit for 75 LF on hillside ($2,475) - (65 LF of conduit is already in the contract)
Wiring only - (6) 12 gauge wiring ($910)
1 sub panel, 100 amp - $250
1 weatherproof outdoor outlet for irrigation timer ($70)
1 weatherproof box with flat cover at top of hillside ($110)
2 breakers ($300)

(4 outlets total: 2 at top, 1 at BBQ, 1 at Irrigation timer) 2 of the 4 were already included in contract)

All electrical to be buried underground.', NULL, 4115.00, 'sold', '2021-06-11', '2021-06-11 15:44:13'),
  (3959806, 8330556, '0006', 'Plant Credit', NULL, NULL, -6073.00, 'pending', '2021-06-14', '2021-06-14 09:02:29'),
  (3959830, 9650717, '0008', 'Add paver to sidewalk 96 SF', 'Add pavers to sidewalk area 32 x 3 (96 SF)
Angelus Holland tumbled', 'Takes 2-3 weeks for tumbled to come in. Order once  approved will have to be asap.', 1250.00, 'sold', '2021-06-14', '2021-06-14 09:06:45'),
  (3960021, 10043622, '0001', 'Design Credit due', NULL, NULL, -750.00, 'pending', '2021-06-14', '2021-06-14 09:40:17'),
  (3961962, 9964015, '0012', '29 LF of timber steps up to upper DG patio', '29 LF of 6” x 6” ACQ Green Timbers for steps and any necessary retaining (on sides of steps nearest top) going up to DG patio.', NULL, 2160.00, 'pending', '2021-06-14', '2021-06-14 14:47:04'),
  (3962405, 10233398, '0002', 'Credit for plants removed from planting plan', 'We are not planting
(1) 15g
(2) 5g
(2) 1g

New design for planting has been uploaded to BT', NULL, -280.00, 'sold', '2021-06-14', '2021-06-14 17:13:51'),
  (3966377, 7799379, '0032', 'Added utility work, grading, waterproofing.', '1- 80 LF. Gas line (need to pull permits)  $2,140 plus permit fees

2- 88 LF. Electrical 5 12 gauge circuits. (no heaters)  (will need to add for outlets and switches depending upon final locations, does not include runs for switches.   $3,254 plus permit fees

3- waterproof for fire pit area 14lf. x 2 feet high and waterproof raised planter behind bbq. 38lf.x 3 feet high   Use thoroughseal  $870 

4- extra demo and grading not included in contract plus back fill and compact firepit deck and patio,  planter area behind bbq and patio section.  $2,800', NULL, 9064.00, 'sold', '2021-06-15', '2021-06-15 15:47:24'),
  (3966404, 8330556, '0007', 'Lighting 26 spot lights (up lights)', 'Install 26 up lights with 300 watt transformer Pricing on lights is based on wattage of lights. Lights fixtures we are quoting for wattage is to be under 6 watts. If client wants a higher wattage light fixture price will increase.

Light Model:
Lightcraft FL-114B MATADOR WALL WASHER', NULL, 6284.00, 'pending', '2021-06-15', '2021-06-15 15:57:34'),
  (3966407, 8330556, '0008', 'Install extra backflow on roof', NULL, NULL, 500.00, 'pending', '2021-06-15', '2021-06-15 15:58:15'),
  (3966409, 8330556, '0009', 'Plant to pots in back yard with irrigation', NULL, NULL, 500.00, 'pending', '2021-06-15', '2021-06-15 15:59:06'),
  (3966414, 8330556, '0010', 'Standard Irrigation Timers', 'switching from battery operated valve to additional irrigation controller to handle extra zone.', NULL, 400.00, 'pending', '2021-06-15', '2021-06-15 16:00:05'),
  (3966420, 8330556, '0011', 'Add 1- 5 gal. Kangaroo paw', NULL, NULL, 43.50, 'pending', '2021-06-15', '2021-06-15 16:01:38'),
  (3966452, 9785497, '0005', 'Change 16plants from 1 gal, to 5gal.', NULL, NULL, 352.00, 'sold', '2021-06-15', '2021-06-15 16:16:41'),
  (3969182, 8909247, '0001', 'Extra design work', 'Needed to update design.  2-3 hours. This will be required for the city to approve plans.', NULL, 220.00, 'pending', '2021-06-16', '2021-06-16 11:37:22'),
  (3969236, 8470970, '0005', 'Phase 2', 'Demo frontyard and grade, includes hauling. Approx 480 SF ($800)
Mulch - 450 SF of Brown Shredded Mulch www.cmtopsoils.com/bark-mulch ($500)
Plant installation of (1) 15 gallon, (16) 5 gallons, and 9 flats with amendment and compost ($967)
Install concrete “sleepers” (client will purchase) ($400)
Irrigation - Fix timer issue and reconnect drip lines. (If no material, then no cost).  If any material or labor outside of this needs attention, a change order will be submitted)', 'Please understand Johnny has attention to detail and wants it done correctly, SLEEPERS first then backfill and add compost.', 2667.00, 'pending', '2021-06-16', '2021-06-16 11:47:40'),
  (3972023, 9831009, '0009', 'Adding course to walls', 'Total of 265 linear feet of block', NULL, 2560.00, 'sold', '2021-06-17', '2021-06-17 08:23:23'),
  (3974383, 9680412, '0024', 'Credit for 4 (5g) plants', NULL, '4 (5g) from top of hillside are not doing well.', -174.00, 'sold', '2021-06-17', '2021-06-17 15:25:13'),
  (3974422, 9680412, '0025', '2 (15g) Birds of Paradise', '- Install (2) 15 gallon Birds of Paradise', 'Please order from Nick''s Nursery $45 each was my quote', 300.00, 'sold', '2021-06-17', '2021-06-17 15:34:47'),
  (3980874, 7799379, '0033', 'Utility work', '1) Install 200 linear feet of main water line and 5 hose bibs.  Install 5 copper risers.  $5,800

2) Install 22 ln feet of 3 inch drainage.  140 linear feet of 4 inch drainage.  Install PVC inlets. $4,374

Any additional sewer line, sump pump work etc will be on a different change order.', NULL, 10174.00, 'sold', '2021-06-21', '2021-06-21 08:03:08'),
  (3981323, 9858125, '0008', 'Import 8 yards of 50/50', 'Import 8 yards 50/50 with wheelbarrow to backyard to raise lawn', NULL, 1600.00, 'sold', '2021-06-21', '2021-06-21 09:22:10'),
  (3981444, 9975675, '0007', 'Remove 2 small Cypress trees (cut a grade)', NULL, NULL, 365.00, 'pending', '2021-06-21', '2021-06-21 09:38:11'),
  (3981506, 9975675, '0008', 'Low voltage lighting 9 spot lights/1-150w.trans.', 'Lights are from: Light Craft 

Light selection: 9- Led. Fl.113B 6w.
1- 150w transformer', NULL, 2510.00, 'pending', '2021-06-21', '2021-06-21 09:46:59'),
  (3982431, 9674051, '0010', 'Bender board', '140 linear feet', NULL, 800.00, 'sold', '2021-06-21', '2021-06-21 12:00:30'),
  (3982893, 10001394, '0004', 'Add’l pavers', '105 lf border
60sqft pavers', NULL, 1700.00, 'sold', '2021-06-21', '2021-06-21 13:07:38'),
  (3983047, 9976353, '0002', 'Install electrical outlet', NULL, NULL, 150.00, 'sold', '2021-06-21', '2021-06-21 13:36:36'),
  (3983564, 9858125, '0009', 'Credit for concrete not poured 25SF', 'We did not pour 25 SF on concrete in corner where block wall meets corner of home.', NULL, -200.00, 'sold', '2021-06-21', '2021-06-21 15:33:42'),
  (3983691, 10127581, '0002', 'Added Sod', NULL, NULL, 1700.00, 'pending', '2021-06-21', '2021-06-21 16:10:23'),
  (3983867, 8283798, '0018', 'Additional work', 'Plant about 25ft of Star Jasmine (1 gal) along new fence at the south side of the house plus 2 Ficus (15 gal) at end of fence. Irrigation is there but will need new drips, also gopher baskets. 

 


	Move 4 lavender from back wall to new locations (they are too big for the space). Replace with 4 new Rosemaries (we have the plants).

 


	We made a mistake with the side light on the new mailbox pillar. We want to move the wire from the side to the top of the column. Need to remove mailbox to do it. This for Max? Note: we have ordered a new fixture that I can install.

 


	Add - 6 x 1 gal Geranium Incanum (you supply) to replace existing ferns around water feature (they didn’t make it - too much sun). Use existing irrigation for these and the Rosemaries.

 


	Add - 6 x 1 gal scabiosas (Simon will show us where to plant them.)', NULL, 1582.00, 'pending', '2021-06-21', '2021-06-21 17:37:05'),
  (3985581, 9674051, '0011', '(4) Pendant Lights for Bar/Kitchen', 'Includes installation', NULL, 880.00, 'sold', '2021-06-22', '2021-06-22 08:45:43'),
  (3985769, 10001394, '0005', 'Drain repair', 'Moving the drains 1 1/2 feet up from where they are currently located, inside sod area.', NULL, 250.00, 'sold', '2021-06-22', '2021-06-22 09:11:15'),
  (3985781, 10001394, '0006', 'Footings for (4) patio cover posts', 'Adding footings and brackets to posts', NULL, 1600.00, 'sold', '2021-06-22', '2021-06-22 09:12:29'),
  (3988093, 8330556, '0012', 'Crane Rental (at cost)', 'Third crane - $1400.00', NULL, 1662.50, 'pending', '2021-06-22', '2021-06-22 15:28:25'),
  (3990030, 9964015, '0013', '3/4" Water line plus hose bib', '3/4" PVC water line with hose bib to be installed at the top of the landing/upper patio. 80 LINEAL FEET.', NULL, 880.00, 'pending', '2021-06-23', '2021-06-23 08:59:12'),
  (3990807, 9858125, '0010', '32 additional SF of sod', '32 SF of sod added to contact plus change order from earlier. Total now is 1,440 of sod.', 'Please see older change orders!!', 100.00, 'sold', '2021-06-23', '2021-06-23 11:26:44'),
  (3992667, 9902783, '0006', 'Credit for plants that we will not order', 'Plants are NOT installing:
10 - 1g
6 - 5g', NULL, -460.00, 'sold', '2021-06-23', '2021-06-23 22:24:19'),
  (3994241, 7799379, '0034', 'Adjustment for Change Order #32', '1) After measurement verification,   gas line increased to 88 linear feet.  Additional $280

2) Electrical run was 67 ln feet from panel and 11 additional feet from BBQ to bar top area.  Total of 88 linear feet.    No change in price', NULL, 280.00, 'sold', '2021-06-24', '2021-06-24 09:45:42'),
  (3995176, 9902783, '0007', '70 SF of Concrete Pour (Apron area)', 'Pour 70 SF of 3000 PSI grey concrete
Sand Finish top cast 1', NULL, 1435.00, 'sold', '2021-06-24', '2021-06-24 12:32:56'),
  (3995205, 9902783, '0008', 'Remove Bougainvillea near mailbox and plants', 'Remove bougainvillea and other plants near mailbox. 
Demo footings of mailbox and prep for new footing.
Remove plants on little landing and grade down.
(*We need to see what is under those plants, sand or dirt)
We will be installing plants here.', NULL, 475.00, 'sold', '2021-06-24', '2021-06-24 12:35:51'),
  (3995294, 7666319, '0038', 'Additional Plants', '1) Additional plants (beyond what is still due per last change order)

 - 20 dwarf coyote bush, 
 - 4 more Pale Leaf Yucca,
 - 20 Matt Rush
 - 5 Acacia   (offsets a couple of dead Westrengia - no charge)

2) Install Irrigation to those plants

3) Install gopher baskets to these plants.', NULL, 2200.00, 'pending', '2021-06-24', '2021-06-24 12:52:06'),
  (3995449, 7666319, '0039', 'Added work items.', '1) Add soils to Pepper Tree - No Charge

2) Straighten walkway benderboard  - No Charge

3) Make Yard map  - No Charge

4) Remove concrete for drain basin.  Add curbing to both sides. (will extend to culvert)  Haul waste to dump.   $2600

5) Add timber to catch basin far right to hold back wall.   $450

6) Provide Iron Grate covers and cut and install into concrete basins.  $900

7) Fix and Bury hoses on hillsides  -  No Charge

8) Install boulders and rocks along culverts and drain basins.  double head, single Head and 5 inch rock, varied type.    About 6 - 8 tons of rock to be brought in.   $2900

9) Install more soils for front and pool planters  $300 

10)  Chaulk and saw cut asphalt road in front to form better planter edges. Haul waste.  $350

11) Remove 3 inches and final grade for 930 sq feet in front planters to receive rock.  Waste to be hauled to new location on property. $1,860

12) Install 930 sq feet of weed barrier in the front and staple  $930

13) Install 930 sq feet of California Gold rock - 3 inches thick for front planter Roughly 9 yards.  $3,720

14) Trim front trees in front of portable toilets  and haul waster - $850

15) Install, client provided solar valves and drip systems for upper deck. $520', NULL, 15380.00, 'pending', '2021-06-24', '2021-06-24 13:18:37'),
  (3996148, 9902311, '0002', 'Paver Credit', '750 sqft in contract
675 installed

75 sqft credit @ 9.95 = $746', NULL, -746.00, 'pending', '2021-06-24', '2021-06-24 16:24:00'),
  (3997996, 10043446, '0001', 'Credit for total SF of turf from original scope', 'Scope changed and we are not doing this much turf anymore.', 'See updated plans in Current Design folder. 
See other change orders. 
See new job start notes.', -19327.00, 'sold', '2021-06-25', '2021-06-25 10:26:41'),
  (3998007, 10043446, '0002', 'Simple Turf Bel Air 92 approx. 305 SF', 'Bel Air 92 - Client has sample at house, it was sent via mail from vendor.', 'I haven’t seen it this turf its new.', 4651.00, 'sold', '2021-06-25', '2021-06-25 10:29:07'),
  (3998017, 10043446, '0003', 'Valley RTF Sod', '1,455 SF of Valley RTF Sod.', NULL, 5575.00, 'sold', '2021-06-25', '2021-06-25 10:30:31'),
  (3998033, 10043446, '0004', 'Irrigation for Sod', '3 Anti-siphon brass valves for grass spray zones.

Not included is main line, this will be determined at job walk $25/Lineal Foot.', NULL, 2655.00, 'sold', '2021-06-25', '2021-06-25 10:34:26'),
  (3998043, 10043446, '0005', 'Credit for not demo-ing Turf area', 'demo is included in cost of sod, this is a credit for the turf area which was to be demo.', NULL, -1500.00, 'sold', '2021-06-25', '2021-06-25 10:35:57'),
  (4000231, 8330556, '0013', 'CREDIT 4 (15gal) plants', NULL, NULL, -1250.00, 'pending', '2021-06-25', '2021-06-25 15:16:01'),
  (4000243, 9902783, '0009', 'Remove 2 large Italian Cypress trees', 'Remove 2 large cypress approx 20 ft high +
Stump Grind (we will do all stumps on same day for noise reduction)
Haul tree material and pay dump fees', NULL, 400.00, 'sold', '2021-06-25', '2021-06-25 15:22:47'),
  (4000250, 9902783, '0010', 'Wire for stringing up Lemon tree', 'Complementary per Nicole and Jorge

Wire ($30-40)
Labor (1 hour @ $65)', NULL, 0, 'sold', '2021-06-25', '2021-06-25 15:24:36'),
  (4000332, 9858125, '0011', 'Credit for material - Bender board not ordered', 'We did not use 120 LF of bender board as the client had enough on site to put back in.
Labor was still charged.', NULL, -330.00, 'pending', '2021-06-25', '2021-06-25 16:06:50'),
  (4000593, 8424736, '0011', 'Additional plants', '(5)  15gallon sweet peas to be planted along wall with irrigation emitters. 
2 flats of purple heart (not planted) 

1 flat of star Jasmin (not to be planted) 

Move exisiting bougainvillea to upper slope or front yard.', NULL, 920.00, 'sold', '2021-06-26', '2021-06-26 08:09:43'),
  (4002384, 9674051, '0012', 'Mulch for front and back', '500sqft', NULL, 500.00, 'sold', '2021-06-28', '2021-06-28 07:41:36'),
  (4005219, 9740093, '0016', 'Credit for 2x2 pavers not installed', NULL, NULL, -115.00, 'pending', '2021-06-28', '2021-06-28 16:16:16'),
  (4005363, 9359454, '0015', 'Credit for 4 Camellias', '(4) 5 gallon plants        $180', NULL, -180.00, 'pending', '2021-06-28', '2021-06-28 17:20:06'),
  (4006663, 9359454, '0016', '(8) 1 Gallon Pink Geranium Cranesbills', NULL, NULL, 176.00, 'pending', '2021-06-29', '2021-06-29 08:07:14'),
  (4008177, 10322184, '0001', 'Take plants out of contract', NULL, NULL, -1192.50, 'pending', '2021-06-29', '2021-06-29 11:56:14'),
  (4008208, 9978406, '0001', 'Mulch Upgrade', NULL, 'Upgrading 615 sqft of mulch from brown shredded to small bark nuggets.', 350.00, 'pending', '2021-06-29', '2021-06-29 12:00:49'),
  (4009353, 9902783, '0011', '2 new brass valves for new drip zones', 'Irrigation in planter beds needs to replaced. Old and pipes are not good. This is for 2 new brass Anti-Siphon valves for the two new drip zones. 

This will ensure all plants are getting  water and will reduce water costs in the long term.', NULL, 1730.00, 'sold', '2021-06-29', '2021-06-29 15:39:09'),
  (4009729, 10096826, '0001', 'additional pavers', 'Additional pavers to 295  
Reduced price from $18.00 to $16.00 per Square Foot 70 SF
Original in contract 225 X $18.00= $4,050.00
Change 295 X $16.00= $4,720.00
Difference $670.00', NULL, 670.00, 'pending', '2021-06-29', '2021-06-29 18:34:27'),
  (4009731, 10096826, '0002', 'Back of Fence Demo', '1/2 Man Day trimming tree, pulling weeds and restaking fabric, fabric is existing', NULL, 300.00, 'pending', '2021-06-29', '2021-06-29 18:36:40'),
  (4009736, 10096826, '0003', 'Additional bender board', '81 additional linear feet X $8.00= $648.00', NULL, 648.00, 'pending', '2021-06-29', '2021-06-29 18:38:46'),
  (4009740, 10096826, '0004', 'Planting', '10 5 gallon plants X $43.50= $435.00', NULL, 435.00, 'pending', '2021-06-29', '2021-06-29 18:42:05'),
  (4012108, 9831009, '0010', 'Concrete pads for 2 terrace', 'Forming for 35 indivual pads, all to be different sizes as per plan. Range from 3x3 to smaller sized pads.  Running bond pattern.', NULL, 5800.00, 'sold', '2021-06-30', '2021-06-30 11:24:40'),
  (4013453, 10043446, '0006', 'Permit allocation', 'This is for electrical permit. If permit allocation is less than estimated, we will credit you. If it''s under cost, we will submit another change order.

 Once approved we will submit permit info to the city.', NULL, 500.00, 'sold', '2021-06-30', '2021-06-30 15:37:24'),
  (4013697, 8424736, '0012', 'Plants subbed', NULL, NULL, 480.00, 'pending', '2021-06-30', '2021-06-30 17:15:47'),
  (4013774, 9831009, '0011', 'Credit for keeping (1) bollard', NULL, NULL, -300.00, 'sold', '2021-06-30', '2021-06-30 18:07:51'),
  (4015144, 9975675, '0009', 'Credit on irrigation timer', 'Did not need irrigation timer we used her existing one. (It was good)', NULL, -300.00, 'sold', '2021-07-01', '2021-07-01 08:55:21'),
  (4015155, 9975675, '0010', 'Pump and spillway for water feature', NULL, NULL, 630.00, 'sold', '2021-07-01', '2021-07-01 08:57:51'),
  (4017157, 9902783, '0012', 'New sod and grass irrigation zones', '1,143 SF of St. Augustine sod
2 new Anti-Siphon brass valves for new grass spray zones', NULL, 6913.00, 'sold', '2021-07-01', '2021-07-01 15:05:01'),
  (4017392, 9902783, '0013', 'Added plants', '3 - 15g Silver Sheen
2 - 5g Spanish lavender
2 - 1g Artichoke agave
2 - 1g Cotyledon orbiculate
2 - 1g Lantana (Rainbow)', NULL, 650.00, 'sold', '2021-07-01', '2021-07-01 16:44:36'),
  (4018136, 9831009, '0012', 'Remove/Grind large stump top terrace', NULL, NULL, 500.00, 'sold', '2021-07-02', '2021-07-02 06:32:41'),
  (4018144, 9831009, '0013', 'Demo for concrete steppers for terraces', 'Demo 4-5" soil below final grade and grade area', NULL, 500.00, 'sold', '2021-07-02', '2021-07-02 06:34:04'),
  (4021174, 9976353, '0003', 'New manifold / 4 valves / Extra outlet', NULL, NULL, 1360.00, 'pending', '2021-07-02', '2021-07-02 15:25:46');

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

  RAISE NOTICE 'Batch 2 of 5 complete — Imported: %, Already-imported: %, No matching job: %',
    v_imported, v_dup, v_no_job;
END $$;

COMMIT;
