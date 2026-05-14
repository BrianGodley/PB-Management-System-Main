-- ============================================================
-- v2 CO Enrichment — Batch 2 of 5
-- 1,337 CO updates (rows 1338-2674 of 6,685)
-- v3: also sets bids.status using the v2 mapping:
--   APPROVED + MANUAL                    → sold
--   DECLINED + MANUAL_DECLINE + RECALLED → lost
--   PENDING + DRAFT + OWNER_REQUESTED    → pending
-- Idempotent: rebuilds scope from source on each run.
-- ============================================================

BEGIN;

CREATE TEMP TABLE _co_v2 (
  bt_co_id        BIGINT PRIMARY KEY,
  scope_html      TEXT,
  expires_at      TIMESTAMPTZ,
  viewed_at       TIMESTAMPTZ,
  att_count       INT,
  att_last_date   TIMESTAMPTZ,
  attached_by     TEXT,
  created_by      TEXT,
  new_status      TEXT
) ON COMMIT DROP;

INSERT INTO _co_v2 (bt_co_id, scope_html, expires_at, viewed_at, att_count, att_last_date, attached_by, created_by, new_status) VALUES
  (2833126, NULL, NULL, NULL, 1, '2020-02-08 13:57:55', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (2833162, 'Original contract has 700 sq ft x 19 inches deep demo for a total of 38 cubic yards. (3 truckloads) <br>
Actual demo and hauling was 90 total yards (7 1/2 Truckloads) including extra soil on top and sides. <br>
Forklift Rental for moving pallets. <br>
 <br>
<br>
Total additional soils change order is $3,800<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2833345, 'Remove existing wall cap.<br>
Install matching veneer to house.<br>
Install new bullnose cap for wall. <br>
Grout Cap<br>
Grout Veneer. ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2835011, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2835014, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2835017, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2835024, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2835043, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2837504, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2838540, 'Concrete Pad<br>
<br>
Install road base layer,  Compact.<br>
Install forms for concrete by garage.<br>
Install #4 rebar 24 inches on center<br>
Core garage pad anchor hole.  Epoxy and pin slab to garage pad. <br>
Pour 2500 PSI concrete. Roughly 190 square feet. <br>
$2000<br>
<br>
Wall<br>
<br>
Dig footings<br>
Install rebar every 16 inches on center<br>
Pour concrete footings  24 inches deep,  2 1/2 feet wide.  with a key<br>
Install 17 linear feet of 8x8x16 CMU block 5 feet high.<br>
Install 10 linear feet of 8x8x16 CMU block 3 feet high.<br>
Install 13 linear feet of 8x8x16 CMU block 2 feet high.<br>
Install waterproofing layer behind wall <br>
Grout lift wall cells<br>
Install wall cap<br>
$6,750<br>
<br>
<br>
 ', NULL, '2020-02-11 15:05:18', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2840882, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2840893, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2840963, '18" Tall  Grey Charcoal ', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2849757, 'Curb on side of driveway and side of house walkway <br>
Rustic wall block on it''s side. with 8" side at the height side.  2" buried in footing and 6" exposed.', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2849839, 'Bender board as in the plan I gave Fidel on 2-17-20 36 LF X $8.00=&nbsp; $288.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2856161, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2859123, 'Deck repair full repair, rebuild see attachment for details, includes paint', NULL, NULL, 2, '2020-02-20 19:03:28', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (2859265, 'Original Contract includes (4) outlets<br>
<br>
(NOT ADDED; <br>
Extend gas line approx 10ft from bbq area $600)<br>
<br>
Add Additional outlets as shown on attached plan<br>
Back wall Center                             $350<br>
Back wall right hand corner             $75<br>
Garage Wall        Right corner        $300<br>
Garage Wall        Left corner           $75<br>
House Wall                                      $300<br>
<br>
                                        Total $1100<br>
<br>
see attached  plan for locations<br>
 ', NULL, '2020-02-21 14:37:23', 1, '2020-02-21 01:12:44', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2861626, '10 5 gallon Carolina cherry', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2864022, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2864030, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2864492, 'Taking out steppers', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2869351, 'One additional foot of outdoor kitchen', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2870016, NULL, NULL, '2020-03-02 12:49:06', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2871254, 'Dig footings.  Deliver material.   Install rebar  and footings . Install block and grout lift cells   $2875<br>
<br>
Additional bobcat demo -  $490 for equipment rental.  <br>
<br>
$630 Rental charge of forklifts for previous issues on jobsite - No Charge to client. ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2871429, '6-8 week delivery', NULL, '2020-03-03 09:51:32', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2871435, '<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><u><span style="font-family: ">Paver and Spa Area   "Adobe Copper Mocha"</span></u></b></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">             1. Install 4” compacted base</span></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">             2. 1” Screed Sand</span></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">             3. 640Sqft Group 1 pavers</span></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">            4. complete with joint sand<br>
<br>
Excavation included in contract</span></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">            </span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">          </span></span></span></span><br>
 ', NULL, '2020-03-01 14:41:52', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2871443, 'Install Bellecrete Wall Cap and Step tread in Coffee Color.<br>
Victorian Style and Smooth Finish for Walls and Possibly steps. <br>
Roughly 130 linear feet.  ', NULL, '2020-03-04 09:48:39', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2871453, 'changes contracted driveway from pavers to broom finished concrete with up to 3 bands across driveway filled in with decorative del rio group 1 stone. concrete to be 4" thick under entry bands where triangles are, continuous rebar<br>
<br>
reduces contract by  $1232 as a credit from total sum<br>
ADD additional Demo to remove 9" thick  driveway (an additional 5") over 4 normal driveway $1680<br>
<br>
Total additional cost is $448<br>
<br>
<u><strong>change is scope of work as described below no additional charge</strong></u><br>
- subtracts extension of front porch area and moves square footage to behind garage<br>
 - Removes step from garage area, and includes demo of existing concrete and ramps this area<br>
 - Paseo 2 paver pads to 3" spacing from 6" spacing may require additional pads beyond contracted <br>
 - additional pads will be at the rate of $44ea<br>
 - Lawn area will be graded to near flat and taper at 4ft planter area<br>
<br>
 ', NULL, '2020-02-28 07:26:47', 1, '2020-02-28 09:01:58', 'Ryan Kleefisch', 'Ryan Kleefisch', 'lost'),
  (2872314, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2872934, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2873752, 'credit, we are not doing the garage work', NULL, '2020-02-27 16:33:22', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2875027, '<p>Angelus courtyard stone 616sqft<br>
border 6x9<br>
Field 9x9, 9x12, 15x15 random mix<br>
<br>
reduces contract by  $1373 <br>
ADD additional Demo to remove 9" thick  driveway (an additional 5") over 4 normal driveway $1680<br>
<br>
Total additional cost is $307<br>
<br>
<u><strong>change is scope of work as described below no additional charge</strong></u><br>
- subtracts extension of front porch area and moves square footage to behind garage<br>
 - Removes step from garage area, and includes demo of existing concrete and ramps this area<br>
 - Paseo 2 paver pads to 3" spacing from 6" spacing may require additional pads beyond contracted <br>
 - additional pads will be at the rate of $44ea<br>
 - Lawn area will be graded to near flat and taper at 4ft planter area</p>
', NULL, '2020-02-28 10:11:05', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2878756, '1000<br>
<br>
declined by owner', NULL, '2020-03-05 17:18:38', NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (2879922, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Hi Sandy and Dan,</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">I look forward to stopping by tomorrow around 2-3pm.  Can’t wait to see the progress!!</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Please approve the count for plants, mulch and bender board.  Jorge mentioned about adding plants on the side which I would be happy to do.</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Based on the approved plan:</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">1 Gallon @ $21.00            Front 32 plants                 Back 2 plants      Total 34 1 gallon X $21.00=           $714.00</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">5 Gallon @ $42.00            Front 42 plants                  Back 36 plants   Total 78 5 gallon X $42.00=        $3,276.00</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">15 gallon @ $175.00        Front 1                                  Back 2                   Total 3 15 gallon X $42.00=           $525.00</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Total for plants= $4,515.00</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Mulch Gorilla Hair, upgrade $1.75 @ SF  1,120 Square Feet=  $1,960.00</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Bender Board    90 Linear Feet X $8.00= $720.00</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Total=  $7,195.00</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">In contract $3,000.00</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Difference in change order= $4,195.00<br>
<br>
APPROVED</span></span><br>
 ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2880602, 'This is for adding veneer for step risers.', NULL, '2020-03-05 14:20:08', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2880855, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2882594, '13 linear feet of bench seat in Angelus stone wall ''ll<br>
2 courses with cap. <br>
I nstall fabric to hold back soil<br>
cut pipe 6" and lower 12" <br>
back fill back side of wall with gravel', NULL, NULL, 1, '2020-03-03 15:54:13', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (2883017, '31 Linear feet of french drain 12" from finish grade to drain 2 percent slope at minimum<br>
Trench away from house 12" and apply 2 coats of Henry''s Tar and 1 layer of bichathene<br>
Set perorated pipe in fabric sleeve and back fill with gravel<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2887659, 'Smooth stucco finish
Up to 18" height', NULL, '2020-03-06 09:32:17', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2887677, 'Tie in downspouts 
5 ft of chanel drain', NULL, '2020-03-06 09:34:44', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2888989, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2890588, 'Taking out pergola from contract.&nbsp; Will work with Craig Kanga directly', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2890592, 'Setting stucco and concrete top 36"-40" high post wraps/pilasters to match the kitchen <br>
Same color stucco and same concrete top color', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2890996, 'Extend patio to previous string line location.', NULL, '2020-03-07 05:10:20', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2891001, 'Add hidden wall down lights around permitter wall.  Spaced every 6 feet.   will be additional 12 lights.<br>
<br>
Note - Step lights will be hidden under mount as well. <br>
<br>
 ', NULL, '2020-03-25 21:48:46', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2891089, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2891093, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2891672, 'Front Lawn area  2 zones rain bird pop-ups for future lawn<br>Tie in 3 shrub bubblers for 3  owner installed plants to one of the zones<br><br>Rear Lawn 2 zones rain bird pop-ups .install 8f nozzes on left zone<br><br>Install 1 zone for garden area. With pressure reglator and Y filter . Install  (6) 6-outlett spaghetti  tubing risers Rainbird Emt-6X<br><br>move existing valve and add new valves to left rear corner. And install garden valve<br><br>Rake and remove all rear gravel and dispose<br><br> ', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2894008, 'Trench and install 80 linear feet 3/4 conduit<br>
install 5 GFI protected outlets<br>
includes 12/2 wire <br>
see attached design for approx locations requested by owner<br>
does not include permits', NULL, '2020-03-10 11:14:42', 1, '2020-03-09 13:18:29', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2894020, 'Remove 2 large concrete rocks <br>
install stacked concrete walls shown in picture<br>
includes up to 16hrs labor and (1) lowboy to dispose<br>
grade hills side smooth <br>
<br>
see attached picture showing walls and rock to be removed<br>
<br>
 ', NULL, '2020-03-09 15:06:46', 1, '2020-03-09 13:19:24', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2897116, 'Using clay pavers in light iron spot approved via email and text', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2897767, 'Gas and Electrical permits, include Permit Technician  at the rate of $120hr  includes Drawings, travel and permits running and Permit Fees/costs<br>
<br>
not to exceed $1600 without further approval <br>
<br>
 ', NULL, '2020-03-10 15:57:41', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2897897, 'Water main line to fountain. 42 linear feet. X $20.00. Measured by Jorge. ', '2020-03-10 00:00:00', NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2897899, '2 new valves. For existing hillside spray. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2900085, 'DG with stablizer from Ornelas Wood Recovery OWR - no additional charge<br>
<br>
Upgrade to Group 3 Rock  ADD $1512<br>
Arizona River Rock 1/2-3/4 C&M Topsoil<br>
 ', NULL, '2020-03-11 13:14:57', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2901977, 'Clean up jobsite remove all trash.<br>
Remove concrete debris. <br>
Remove materials in driveway.   <br>
Remove southern fencing.<br>
Remove footings for existing fencing.<br>
Haul debris to dump. <br>
<br>
 ', NULL, '2020-03-12 12:25:20', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2902004, 'Remove 3 trees.<br>
Remove stump for citrus<br>
Stump grind palm base and root system.<br>
Remove green material in backyard.<br>
Remove hedges in front. <br>
Haul waste.', NULL, '2020-03-12 12:24:58', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2902012, 'Add step for grade transition in north corner of house.&nbsp;', NULL, '2020-03-12 12:24:41', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2902054, 'Need to cut additional 2 feet x 10 x 3-8 foot section of soil/hardpan for retaining wall on north side for waterproof and drainage access.<br>
<br>
Grade is 10 inches low in entire north side section.  By northeast corner grade is over 2 feet low.   Need to raise entire grade.  Soils must be compacted in 4-8 inch lifts to 90% proctor for proper stabilization.   Roughly 440 sq feet and 15 yards.   Using all soils from onsite demo of pool deck , wall and front planter.  Any added soils at additional cost. <br>
<br>
<br>
<br>
<br>
 ', NULL, '2020-03-12 12:24:12', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2902073, 'Remove roughly 2-3 yards of extra soils in back of pool area.<br>
Backfill all existing open trenches. <br>
Compact trenches in lifts.<br>
 ', NULL, '2020-03-12 12:23:51', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2902140, 'Raise back lawn grade 12 inches roughly 500 sq feet.  Must import 16 yards soils and amendments and use 2 yards from onsite.  Roughly 18 yards total.  2 yards of it  from onsite to remain from step grading etc. <br>
<br>
Will bring up soils using conveyors. and wheelbarrows.  420 wheelbarrows and 42 linear feet of conveyors. ', NULL, '2020-03-12 12:23:26', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2902160, 'Back fill concrete around posts. Roughly 3/4 of yard.<br>
<br>
Backfill additional non footing areas around posts<br>
<br>
Raise grade of portion of back patio by 6 inches.   Use soils from upper section demo. <br>
<br>
Compact soils in lifts. ', NULL, '2020-03-12 12:22:59', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2902379, 'Add additional course and grout lift for Bench seat wall. Contract was 8" need 12 " now.  $390<br>
Add additional bench seat return wall that was not in contract.   $900', NULL, '2020-03-12 12:22:13', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2902419, 'no paint included', NULL, '2020-03-12 10:12:59', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2902830, 'Credited for not applying rock facade to front yard facade.', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2903287, 'Dig footings down 12 inches be low grade. <br>
Form 51 linear feet of curbing. two sides with stake restraints<br>
Release agent on forms<br>
Pour curbing with 2500 psi concrete.<br>
Remove forms when set and finish. ', NULL, '2020-03-12 14:48:39', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2905369, 'This is for the planter that is behind the stone wall II.&nbsp; It connects to drainage in pavers and to existing drainage lines in th back taking the water to the street.', NULL, NULL, 1, '2020-03-13 10:11:02', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (2905474, NULL, NULL, NULL, 1, '2020-03-13 10:45:48', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (2905489, 'Final count <br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">From the daily log;</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Verva -</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Actual plant count based on Plan. Plant list varied from plan.</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">See the total of what the plant PLAN calls for and what is ordered. (we subbed 1 15 gal for a 5gal.</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">58 - 1gals</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">92 - 5gals</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">2 - 15gals</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Total planting cost should be $5257. From my understanding the client has been invoiced a total of 4515 so far.</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">A change order for $742.00 needs to be added for planting.</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"> </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Thanks.</span></span><br>
<br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Respectfully,</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b>Mohammed Rahman</b></span></span><br>
 ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2906673, NULL, NULL, '2020-03-18 20:27:03', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2910958, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2910972, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2911292, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2911322, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2912620, NULL, NULL, '2020-03-17 17:30:17', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2913813, 'See attched updated lighting plan<br>
<br>
Vista Brand LED Fixtures (Group 1) $220ea<br>
(3) Path Lights<br>
(3) Up lights<br>
(3) Well lights<br>
Transformer $660<br>
<br>
Total lights 28x $220 = $1980<br>
Transformer $660<br>
Total lighting package $2640', NULL, NULL, 1, '2020-03-20 10:43:30', 'Ryan Kleefisch', 'Ryan Kleefisch', 'pending'),
  (2915015, NULL, NULL, '2020-03-18 14:25:57', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2915643, 'stepping stones to remain as is&nbsp;', NULL, '2020-03-18 20:53:51', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2919499, '- Install new concrete walkway on slope with swaling/slope for runoff.<br>
- Remove and replace plants as needed for new slope terracing.<br>
- Install 2 new landscape tie walls with two new levels.<br>
- Backfill new terrace and rerun irrigation. <br>
<br>
Payment schedule with be based upon completion of change order.<br>
10% due at 10% completion points of work.  Roughly 2 1/2 weeks of work. ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2919614, '3 posts at $146.00 in materials X 1.4= $204.00<br>
Labor $700.00<br>
$904.00<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2919764, 'This is to build the patio cover.   <br>
<br>
Original Price $21,140 in contract.<br>
Plus $950 for material to extend beyond Kitchen win width direction.  Labor covered by Picture Build as post not set early<br>
Plus $1800 for labor and material to extend pergola depth.  (Can be reduced in size and remove this charge, this is elective)<br>
Plus $3400 for permits and engineering.  (Add on per contract)<br>
<br>
Other items not covered for final build<br>
<br>
Prep and Painting of wood. Not covered as mentioned in contract.  $2900  by Picture Build or owner can use his own painter. (Not included in this change order)<br>
 ', NULL, '2020-04-17 10:46:09', NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (2919779, '$400 per garden bed 8x3. Clear Redwoos.  2 courses of 2 x 6 with redwood posts.<br>
$250 per garden bed for backfilling<br>
<br>
3 beds total $1950<br>
<br>
<br>
 ', NULL, '2020-03-20 12:02:42', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2920640, NULL, NULL, '2020-03-21 16:41:56', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2921869, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2922434, '(7) 1 Gal Sedum Autumn<br>
(6) 1 Gal Lavandula "purple" grosso<br>
(14) 1 Gal  Calandrinia   <br>
Total 1Gal  - 27 x $22ea =$594<br>
<br>
(2) 5 Gal Westrigia x $45ea = $90<br>
<br>
(4) flats Senecio Serpends  x $75ea  = $300<br>
(6) Flats dymondia = $75ea = $450<br>
<br>
Total $1434<br>
<br>
 ', NULL, '2020-03-29 16:48:11', NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2922764, 'Add<br>
(2) path lights  $440<br>
(1) Up lights    $220<br>
Transplant 2 agapanthus $20 <br>
Set 2 owner provided step stones in concrete in DG area $45<br>
<br>
total $725<br>
<br>
 ', NULL, '2020-03-23 13:11:35', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2927066, '1) Extra Demo on Patio Wall<strong> $600</strong>,  Gave discount of $900<strong> </strong>of this extra demo  (3 guys additional day)<br>
2) Demo down footing per inspector request to 1 foot below bedrock 3 feet beyond previous calc. <strong>$1500</strong> 7 yards of additional demo and soil movement.  (3 guys additional day)<br>
3) Extra demo on planter area 25 sq feet down to bedrock and remove added roots.  (2 guys one day)  <strong>$1000</strong><br>
3) Extra Concrete for Patio Wall retaining and Planter. <strong>$1800</strong> - 2 feet extra deep  and 1 foot extra wide added rebar and need to pump additional 10 yards of concrete . $200 for pumper add on. Plus $1600 for added concrete and delivery truck<br>
4) Extra rebar work for large footing for patio retaining - <strong>$700  </strong>$300 Material plus partial man day.<br>
5) Waterproofing planter and patio retaining wall 170 sq feet.  <strong>$1400 </strong>(2 guys 1/2 day plus $400 material)<br>
6) Added gravel work for patio retaining.  1+ yard of Gravel to be wrapped in geotextile fabric vs drain sock.  <strong>$850  </strong>$350 material and 1 guy 1 day.<br>
7) Added course for patio wall <strong>$375</strong>  (1 guy 1/4 day plus $250 material with grout and extra rebar.<br>
8) Drain for patio area and patio retaining wall - 120 ln feet of solid SDR 35 plus 30 linear of SDR 35 french drain.  Tie into existing drain to street with no hub coupling. $23 per ln foot. <strong>$3450</strong><br>
9) Extra backfill and compact on utility lines  <strong>$1500  </strong>(2 guys one 1/2 day)<br>
10) Add one inch of main water line for backyard irrigation system.  <strong>$600  </strong>$10 per foot with connections<br>
<br>
<br>
 ', NULL, '2020-03-26 19:22:15', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2929291, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2931115, 'Moving a switch.on the deck', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2931127, 'sealer for the pavers, and curb', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2935920, NULL, NULL, '2020-03-30 15:50:17', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2936602, 'Upgrade concrete beds to 6 inches for pool deck, side yard and front walkway.  $4,000<br>
<br>
Upgrade Retaining Wall for Pool Deck to Poured in Place vs Block wall in contract  $4,800.    8 additional man days plus material. ', NULL, '2020-03-31 07:36:15', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2938277, 'Front walkway grading removed from scope of work and credited. <br>
Grade was already lowered. ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2938623, 'Waterproofing deck', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2939404, NULL, NULL, '2020-04-01 08:50:09', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2939406, NULL, NULL, '2020-04-01 13:42:38', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2939410, NULL, NULL, '2020-04-01 13:42:20', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2939418, 'No charge to client.&nbsp;', NULL, '2020-04-01 13:41:59', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2939429, NULL, NULL, '2020-04-01 08:50:27', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2939437, 'Turf plus additional demo.', NULL, '2020-04-01 08:53:01', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2939516, 'Additional 90 square feet of turf.&nbsp;', NULL, '2020-04-01 08:51:13', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2940484, 'Vista LED GR2216 Black<br>
includes wire and instalation<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Vista</div></div>', NULL, '2020-04-01 15:32:47', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2940691, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2940746, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2940987, 'see attached proposal and plan', NULL, '2020-04-04 10:07:28', 1, '2020-04-03 16:59:14', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2941102, 'Adding additional 370 SF X $11.00= $4,070.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2941532, 'Remove property line trees and roots . - 3 guys one day plus 1 guy another day plus dump fees . - $2400<br>
Extra Demo and Install on property curb wall.  Wall at 2 feet instead of 16 inches - $900 . 2 guys 3/4 day for demo and extra install plus material<br>
Extra Demo on Patio Return Wall return  down to bedrock (not one foot below) . - $250<br>
Added Trenching and backfill with compaction on side yard for gas line - $500<br>
 ', NULL, '2020-04-02 08:17:18', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2941567, 'Remove concrete pad and Tile overlay for rear patio. <br>
<br>
<strong>Credit $9,380</strong><br>
<br>
<br>
<br>
Add sand set large tile.<br>
<br>
Includes 5+ inch class II roadbase bed and one inch of screeded angular bedding sand, <br>
<br>
Includes laying tile with spacers.<br>
<br>
Includes polymeric joint sand. <br>
<br>
Owner to provide tile    <br>
 <br>
<strong>Add</strong> <strong>$8850</strong>', NULL, '2020-04-02 08:15:41', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2944621, NULL, NULL, '2020-04-03 12:03:35', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2944637, NULL, NULL, '2020-04-03 11:32:03', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2945307, NULL, NULL, '2020-09-22 22:55:11', NULL, NULL, NULL, 'Mohammed Rahman', 'lost'),
  (2945467, '20 additional sqft brick at gate area', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2945468, '30ft additional drains', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2945469, 'Move plants along front entry back to aporox locations', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2948092, 'Engineering for Pergola has been completed. Stamped docs in office.&nbsp;', NULL, '2020-04-06 18:07:55', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2949993, 'Add additional (12) 1 gallon plants and one more 5 gallon.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2952589, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2952663, '<br>
Add (39) 5 gallon trailing Lantana<br>
Add (39) 5 gallon myoporum<br>
$3,510 <br>
<br>
Per Jorge offer discount on plants.  credit of $375<br>
<br>
additional credit for pavers .  $150 <br>
<br>
Sub Total $2985<br>
<br>
Lights credit. $1,242<br>
<br>
Total $1723  ', NULL, '2020-04-15 21:09:00', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2957205, '1) Added course for garden and dowel rebar  $950<br>
<br>
2) Core holes for front garden bed. $600. (includes core rental and return)<br>
<br>
3) Trenching and Backfill and Compacting:  $ 1500 (2 guys - 3/4 day )    Includes the following<br>
<br>
6 feet of Trench electrical lines and back fill and compact entire trench.<br>
<br>
Mostly Backfill gas line and electrical trench in patio.<br>
<br>
4) Extra pour to do steps first vs pouring with storm garden.   One added pumper,  One added delivery fee,  Additional finisher time  $1500<br>
<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2957318, 'install 1364sqft tall fescue&nbsp;/ Valley RTF', NULL, '2020-04-11 18:42:21', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (2957370, '<p style="margin-bottom: .0001pt; line-height: normal"><b><u><span style="font-size: 12.0pt; font-family: ">Lawn </span></u></b><b><span style="font-size: 12.0pt; font-family: ">– 370Sqft</span></b></p>

<p style="margin-top: 0in; margin-right: 0in; margin-left: .75in; margin-bottom: .0001pt; text-indent: -.25in; line-height: normal"><span style="font-style: normal; font-variant: normal; font-weight: normal; line-height: normal; font-size: 16px"><font>1</font></span><span style="font: 7pt">    </span><span style="font-size: 12.0pt; font-family: ">install 1-zone Rain Bird Pop-up<span>  </span>Irrigation</span></p>

<p style="margin-top: 0in; margin-right: 0in; margin-left: .75in; margin-bottom: .0001pt; text-indent: -.25in; line-height: normal"><span style="font-size: 12.0pt; font-family: "><span>2.<span style="font: 7.0pt">     </span></span></span><span style="font-size: 12.0pt; font-family: ">Apply topsoil or soil amendment and rototill</span></p>

<p style="margin-top: 0in; margin-right: 0in; margin-left: .75in; margin-bottom: .0001pt; text-indent: -.25in; line-height: normal"><span style="font-size: 12.0pt; font-family: "><span>3.<span style="font: 7.0pt">     </span></span></span><span style="font-size: 12.0pt; font-family: ">Install Valley RTF Tall Fescue lawn</span></p>

<p style="margin-top: 0in; margin-right: 0in; margin-left: .75in; margin-bottom: .0001pt; text-indent: -.25in; line-height: normal"><span style="font-size: 12.0pt; font-family: "><span>4.<span style="font: 7.0pt">     </span></span></span><span style="font-size: 12.0pt; font-family: ">Includes 55ft Bend-a-Board edging </span></p>

<p style="margin-top: 0in; margin-right: 0in; margin-left: .5in; margin-bottom: .0001pt; line-height: normal"><b><span style="font-size: 5.0pt; font-family: "> </span></b></p>
<b><span style="font-size: 12.0pt; line-height: 115%; font-family: ">Price $2677 </span></b>', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2957371, '1. install 4" compacted base<br>
2. 55ft bender board<br>
3. install group 1 sythetic lawn - 370sqft<br>
includes sand infill ', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2957372, '<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><u><span style="font-size: 12.0pt"><span style="font-family: ">Lawn </span></span></u></b><span style="font-size: 12.0pt"><span style="font-family: ">– 570sqft</span></span></span></span></span>
<ol>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="font-family: ">Rake back existing rocks and grade</span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="font-family: ">Install 1-zone Rain Bird pop-up sprinklers</span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="font-family: ">Apply topsoil or amend existing and rototill</span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="font-family: ">Install 90ft bend-A-Board edging</span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="font-family: ">Install RTF Tall Fescue</span></span></span></span></span></li>
</ol>
<br>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12.0pt"><span style="font-family: ">Price   $3565</span></span></b></span></span></span><br>
 ', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2957373, '<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><u><span style="font-size: 12.0pt"><span style="font-family: ">Lawn </span></span></u></b><span style="font-size: 12.0pt"><span style="font-family: ">– 489sqft</span></span></span></span></span>
<ol>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="font-family: ">Rake back existing rocks and grade</span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="font-family: ">Install 1-zone Rain Bird pop-up sprinklers</span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="font-family: ">Apply topsoil or amend existing and rototill</span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="font-family: ">Install 60ft bend-A-Board edging</span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="font-family: ">Install RTF Tall Fescue</span></span></span></span></span></li>
</ol>
<br>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12.0pt"><span style="font-family: ">Price   $3041</span></span></b></span></span></span><br>
 ', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2957376, 'Trench and install 3" sdr drain pipe , connect downsputs and install Atrium inlets where necessary, core curb<br>
permits not included', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2957377, 'rake back rocks, and move to other side, <br>
grade and excavate up to 3 yards soil', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2961453, 'Demo footing for curb wall and haul. <br>
<br>
Install 30 linear feet fo curb wall.  Will be roughly 24 inches in height.  Footings plus block courses plus rebar.   $4300<br>
<br>
Post anchors for both curb walls on south side of property.   18 total  $380.  No Charge for labor.', NULL, '2020-04-14 13:06:52', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2961486, 'Demo out concrete pad and haul $380<br>
<br>
Demo out concrete and pour newer section of pad in front of steps.  5 ft deep by 10 feet wide.  $600<br>
<br>
Outdoor kitchen change from contract.   Kitchen doubled in size normally additional $9000+ per contract. <br>
<br>
Gave client $4000+ discount - New price $5000.', NULL, '2020-04-14 20:10:59', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2962872, NULL, NULL, NULL, 1, '2020-04-15 07:52:46', 'Mohammed Rahman', 'Mohammed Rahman', 'sold'),
  (2963986, 'Brought price down from $25.00 to $15.00 because trenches were open.', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2963997, '45 SF of Veneer on outdoor kitchen X $21.00= $945.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2964380, 'LADBS permit costs $158.05<br>
Permit Technician costs, drawing, permit drawing, paperwork submittal @ $120hr x 6hrs = $720<br>
<br>
Total $878.05<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">original permit allowance was $1600

Actual $878.05</div></div>', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2964425, 'Drawing and working with Engineer<br>
and additional time spent at LADBS over previous permit allowance <br>
@$120hr 8hrs = $960', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2972086, 'Original Contract budget $4507<br>
additional plants per this design $5303<br>
total additional costs $796<br>
<br>
After Delivery ,Plants are subject to 20% restocking fee + $65hr to return and exchange for a different variety <br>
plants below wholesale quality will be exchanged at no charge', NULL, '2020-04-23 10:07:09', 2, '2020-04-22 23:02:17', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2973384, 'Not installing 135 Square feet in the coverd patio area 135 SF X $12.00= $1,620.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2973549, 'frame and install 200Sqft m babbo0 composite decking between front dor and garage area,&nbsp;', NULL, '2020-04-28 07:32:03', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (2973586, 'Install 10ft bamboo composite horizontal fence with 2x2 powder coated steel posts  $2200<br>
Install 13''6"  double swing composite gate with metal frame $3567<br>
Material Delivery charge $249 for materials ordered after (4/21) <br>
<br>
Total $6016', NULL, '2020-04-29 17:56:48', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2973751, 'at pool area, excavate and grade as necessary<br>
install 4" compacted base<br>
install 733Sqft group 1 synthetic lawn', NULL, '2020-04-21 13:41:29', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2974210, 'Change all Fencing and deck skirt from IPE Bamboo Composite                                                 -$506<br>
lower block wall at bench from 4ft to 3ft and add 2ft Composite horizontal fencing above             +$1288<br>
Curb wall along fencing add 8" a total height to of 1.5ft                                                                  +$1120<br>
lower fencing from 7ft to 5.5ft                                                                                                           -$2400<br>
Gate will be (2) swing gates a total of 6ft, per discussion with George                                               n/c<br>
                                                                                                                                    Fence Credit $498<br>
 ', NULL, '2020-04-29 17:56:34', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2974258, '65 Linear feet of Belgard 2 courses of block, 1 cap 15" high X $86.00=  $5,590.00<br>
Takiing out 65 square feet of pavers to replace with the bench seat next to the planter in the back  65 SF X $12.00=-- $780.00<br>
Final Cost:  $4,810.00<br>
Same as front walls <br>
Belgard Bel air Toscana block 2 courses and cap', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2974440, '<br>
1) Add another course left side of stairs and additional 4 anchors- $475 <br>
2) Added drains in patio area 21 linear feet. - $460<br>
3) Back fill of walls and compaction in 6 inches fill lifts per inspector request for patio walls and north retaining wall.   Method brings soils only down to a 2 - 3 inch compacted layer resulting in 18-20 separate lifts for patio wall and 32- 40 lifts for north retaining (all not in contract)  Took 2 guys 6 entire days to backfill and compact.  $6000<br>
4) Reroute french drain behind north wall  $240<br>
5) Repair french drains interrupted by gas line for north side of property 1 guy almost full day $400<br>
6) 24 linear feet of drainage north side from large wall to front of property.  $520<br>
<br>
 ', NULL, '2020-04-24 00:35:13', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2975440, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2976771, 'Taking out the #10 in the back Melaleuca&nbsp;gunguenervia&nbsp;15 gallon', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2977424, 'Add benderboard in lawn area for tree.<br>
Additional well light<br>
Plant (3) 15 gallon owner provided trees.<br>
Remove one tree<br>
Install (6) 5 gallon Indian Hawthorne<br>
Install (5) 5 gallon Bouganvillia white<br>
Install (1) 5 gallon Bouganvilllia red<br>
Run additional lighting wire to tree circle <br>
Install 1 /2 yard white gravel. <br>
<br>
Credit one 5 gallon. <br>
<br>
 ', NULL, '2020-04-23 07:58:21', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2978642, NULL, NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (2978671, NULL, NULL, '2020-04-23 14:36:57', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2983567, 'Price difference on turf $228.75

Add play ground pads $343.

Additional labor $260.', NULL, '2020-04-27 14:22:31', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2984832, NULL, NULL, '2020-04-28 09:23:56', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2985334, 'Remove Expand Mulch bed   - 2075<br>
Remove Bubbling Vase.         - 1800<br>
Remove Pebble for Vase        - 250<br>
<br>
Additional Turf for New Layout.   +780<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2988935, 'install 15 gallon lemon tree ,<br>
owner to show crew where to plant<br>
 ', NULL, '2020-04-29 17:43:27', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2989222, NULL, NULL, '2020-05-08 14:26:03', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2993003, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2993005, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2993569, NULL, NULL, '2020-05-01 16:47:30', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2995882, NULL, NULL, '2020-05-15 11:01:22', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2996116, 'Approved via text ', NULL, NULL, 1, '2020-05-04 14:56:35', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (2996447, 'To rebuild the wall that was taken down for the pool install.  8 linear feet long, 8 LF of footing X $58.00 , 8 courses high X $13.00=$162.00 X 8 linear feet= $1,296.00<br>
Slump Stone to match adjacent existing wall.', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2996458, 'takingout jar founatin', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2997228, 'Rough irrigation was already installed, final irrigation not installed taking out of contrazct, however, she has an option to add for $1,500.00 to finish emiters, lines and connect to controller', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2997242, 'Reducing the lights to 5 pathlights X $225.00= $1,125 + Transformer $400.00= $1,525.00<br>
In contract  $3,775.00 - $1,525.00= $2,250.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2997563, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (3000197, 'approved by text to george<br>
<br>
19lf 1" main line', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3000233, '<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 9.0pt"><span style="background: #f7f7f7"><span style="line-height: 115%"><span style="font-family: "><span style="color: #626262">1- reset 3- 24"x24" pavers and add 3 more (see images </span></span></span></span></span></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 9.0pt"><span style="background: #f7f7f7"><span style="line-height: 115%"><span style="font-family: "><span style="color: #626262">2- cut and remove about 6 inches of sod and and dymondea (see images) </span></span></span></span></span></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 9.0pt"><span style="background: #f7f7f7"><span style="line-height: 115%"><span style="font-family: "><span style="color: #626262">3- remove about 6 inches of of mulch and add dymondea (see images) </span></span></span></span></span></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 9.0pt"><span style="background: #f7f7f7"><span style="line-height: 115%"><span style="font-family: "><span style="color: #626262">4- remove 7 plants and replace with calandrinia(see images)</span></span></span></span></span></span></span></span><br>
 ', NULL, NULL, 1, '2020-05-06 09:20:06', 'Ryan Kleefisch', 'Ryan Kleefisch', 'pending'),
  (3001169, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3002405, NULL, NULL, '2020-05-07 12:09:18', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3003139, '<table align="left" style="width: 630px; border-collapse: collapse; border: none; margin-left: 10px; margin-right: 10px" width="630">
	<tbody>
		<tr>
			<td style="border-bottom: 2px solid black; width: 162px; padding: 0in 7px 0in 7px; border-top: 2px solid black; border-right: 2px solid black; border-left: 2px solid black" valign="top"><span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="color: black">Plant name</span></span></span></span></td>
			<td style="border-bottom: 2px solid black; width: 42px; padding: 0in 7px 0in 7px; border-top: 2px solid black; border-right: 2px solid black; border-left: none" valign="top"><span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="color: black">Size </span></span></span></span></td>
			<td style="border-bottom: 2px solid black; width: 42px; padding: 0in 7px 0in 7px; border-top: 2px solid black; border-right: 2px solid black; border-left: none" valign="top"><span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="color: black">QTY</span></span></span></span></td>
			<td style="border-bottom: 2px solid black; width: 102px; padding: 0in 7px 0in 7px; border-top: 2px solid black; border-right: 2px solid black; border-left: none" valign="top"><span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="color: black">New price </span></span></span></span></td>
			<td colspan="2" style="border-bottom: 2px solid black; width: 282px; padding: 0in 0in 0in 0in; border-top: 2px solid black; border-right: 2px solid black; border-left: none" valign="top"><span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="color: black">Previously quoted size and price </span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: 2px solid black; width: 162px; padding: 0in 7px 0in 7px; border-top: none; border-right: 2px solid black; border-left: 2px solid black" valign="top"><span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="color: black">AGAVE BLUE GLOW</span></span></span></span></td>
			<td style="border-bottom: 2px solid black; width: 42px; padding: 0in 7px 0in 7px; border-top: none; border-right: 2px solid black; border-left: none" valign="top"><span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="color: black">5</span></span></span></span></td>
			<td style="border-bottom: 2px solid black; width: 42px; padding: 0in 7px 0in 7px; border-top: none; border-right: 2px solid black; border-left: none" valign="top"><span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="color: black">9</span></span></span></span></td>
			<td style="border-bottom: 2px solid black; width: 102px; padding: 0in 7px 0in 7px; border-top: none; border-right: 2px solid black; border-left: none" valign="top"><span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="color: black">$60/ea</span></span></span></span></td>
			<td colspan="2" style="border-bottom: 2px solid black; width: 282px; padding: 0in 0in 0in 0in; border-top: none; border-right: 2px solid black; border-left: none" valign="top"><span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="color: black"> Size: 4” - $8.00</span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: 2px solid black; width: 162px; padding: 0in 7px 0in 7px; border-top: none; border-right: 2px solid black; border-left: 2px solid black" valign="top"><span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><a name="_Hlk39585491"><span style="color: black">ECHEVERIA AFTERGLOW</span></a></span></span></span></td>
			<td style="border-bottom: 2px solid black; width: 42px; padding: 0in 7px 0in 7px; border-top: none; border-right: 2px solid black; border-left: none" valign="top"><span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="color: black">5</span></span></span></span></td>
			<td style="border-bottom: 2px solid black; width: 42px; padding: 0in 7px 0in 7px; border-top: none; border-right: 2px solid black; border-left: none" valign="top"><span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="color: black">10</span></span></span></span></td>
			<td style="border-bottom: 2px solid black; width: 102px; padding: 0in 7px 0in 7px; border-top: none; border-right: 2px solid black; border-left: none" valign="top"><span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="color: black">$60/ea</span></span></span></span></td>
			<td colspan="2" style="border-bottom: 2px solid black; width: 282px; padding: 0in 0in 0in 0in; border-top: none; border-right: 2px solid black; border-left: none" valign="top"><span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="color: black"> Size: 4” - $8.00</span></span></span></span></td>
		</tr>
		<tr>
			<td colspan="3" style="border-bottom: none; padding: 0in 0in 0in 0in; border-top: none; border-right: none; border-left: none; width: 246px"><span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"> </span></span></span></td>
			<td style="border-bottom: 2px solid black; width: 102px; padding: 0in 7px 0in 7px; height: 64px; border-top: none; border-right: 2px solid black; border-left: 2px solid black" valign="top"><span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif">New Total:</span></span></span><br>
			<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif">$ 1,140.00</span></span></span></td>
			<td style="border-bottom: 2px solid black; width: 102px; padding: 0in 7px 0in 7px; height: 64px; border-top: none; border-right: 2px solid black; border-left: none" valign="top"><span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif">Prev. Total:</span></span></span><br>
			<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif">$ 152.00</span></span></span></td>
			<td style="border-bottom: 2px solid black; width: 180px; padding: 0in 7px 0in 7px; height: 64px; border-top: none; border-right: 2px solid black; border-left: none" valign="top"><span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif">Total change order:</span></span></span><br>
			<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif">New-Prev.= $ 988</span></span></span></td>
		</tr>
	</tbody>
</table>
<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Customer does not want any 4" size plants.</div></div>', NULL, '2020-05-07 11:04:53', NULL, NULL, NULL, 'Melinda Babaian', 'pending'),
  (3003569, '120sf of Siberian Tundra - L70112241U - (size 12"x24")<br>
 ', NULL, '2020-05-07 12:09:53', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3004023, '1 additional wall light Vista 4260 LED / Bronze $195.00<br>
Labor to take out one wall cap, run addition wiring, install new cap (customer provided), electrical hook up. $477.00<br>
<br>
672.00', NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'pending'),
  (3004416, '$1.00 more for 312 Square Feet&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3004472, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3004474, '65 square feet less', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3004475, '99 linear feet in contract final measurement was 56 LF= 43 LF Ft less X $8.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3004481, '66 more LF of drainage X $15.00&nbsp;&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3004645, 'Install a gazebo kit from Costco ', NULL, NULL, 1, '2020-05-07 19:53:30', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (3006417, NULL, NULL, '2020-05-08 14:26:31', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3006467, 'Credit for valve and 1 station timer', NULL, '2020-05-08 14:10:13', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3006785, '13 yards of dirt @25/yard -325<br>
credit of labor -2000<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3008367, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3009405, 'Complete additional 2x8 pressure treated wood to rear property line', NULL, '2020-05-11 14:22:53', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (3009411, 'Upgrade from standard infill to pet deodorizer type infill for pets', NULL, '2020-05-11 14:18:09', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3010518, 'Add:<br>
<br>
(6) 5 gallon sea lavender<br>
(2) 5 gallon Hydrangea Blue<br>
(8) 5 gallon Full sun Hydrangea Vine<br>
<br>
(1) Raspberry -  Replacement No charge.  Get size from Daniel. <br>
<br>
(1) Hawthorne - Swap out for proper one No charge. Get size from Daniel.<br>
<br>
(1) Spot Light - Hillside<br>
<br>
(1) 8 ft lodgepols for Nectarine<br>
<br>
(1) 4 ft Timber Installation - No Charge<br>
 ', NULL, '2020-05-12 08:20:11', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3012635, '180 ln feet of sdr 35 drain.&nbsp;', NULL, '2020-05-13 14:15:28', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3012637, '16 LF. On landing plus 9 LF. On stairway', NULL, '2020-05-13 14:15:11', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3012640, 'Forming add rebar pour concrete 9 feet in length 8 inches high and 6 inches wide', NULL, '2020-05-13 14:14:50', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3014155, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3016671, 'Wood has to be upgraded per city requirement.<br>
<br>
Adding full 4x4 trellis on top. <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">contract</div></div>', NULL, '2020-05-15 12:15:33', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3016677, 'Remove planting from contract.&nbsp;', NULL, '2020-05-15 10:57:14', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3019267, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3019849, NULL, NULL, '2020-05-15 12:14:52', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3019851, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'pending'),
  (3020493, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3020495, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3020672, '(3) 15 gallon<br>
(1) 5 gallon', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3022158, 'Needed to order more tile for front entry.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3022287, 'Lion Premium Grill Appliances:<br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: ">L75000 grill $1,495</span></span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: ">Double door $294</span></span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: ">Refrigerator $299</span></span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: ">Refrigerator Frame $69<br>
***Total + Tax: </span></span></span></span>$2,324.17<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: ">Curbside delivery $220<br>
Total + Tax + Delivery: $2544.17</span></span></span></span><br>
 ', NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3023729, 'For additional electrical for switch for BBQ light.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3027709, '1 crew man a full day, please see Jorge for details', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3027732, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">However, here is the cost that I anticipate:</span></span>
<ol>
	<li><span style="font-size: 11pt"><span><span style="font-family: Calibri, sans-serif">Excavate 24 inches  down and 10 linear feet X 10 linear feet= 200 cubic feet</span></span></span></li>
	<li><span style="font-size: 11pt"><span><span style="font-family: Calibri, sans-serif">Pour 4-5” depth concrete slab with rebar that is specified by model #</span></span></span></li>
	<li><span style="font-size: 11pt"><span><span style="font-family: Calibri, sans-serif">Trench for 10 LF X 4 sides of CMU block wall, deeper that slab, using #3 rebar</span></span></span></li>
	<li><span style="font-size: 11pt"><span><span style="font-family: Calibri, sans-serif">Pour wall footings</span></span></span></li>
	<li><span style="font-size: 11pt"><span><span style="font-family: Calibri, sans-serif">Set 4 courses, and form for the concrete cap 4”</span></span></span></li>
	<li><span style="font-size: 11pt"><span><span style="font-family: Calibri, sans-serif">Stucco façade and seal concrete cap when it is properly cured.</span></span></span></li>
	<li><span style="font-size: 11pt"><span><span style="font-family: Calibri, sans-serif">Pour the slab 100 SF X $12.00= $1,200.00</span></span></span></li>
	<li><span style="font-size: 11pt"><span><span style="font-family: Calibri, sans-serif">Build 2 steps 4 feet wide X 20” deep  with concrete treads 8 linear feet X $50.00=$400.00 ( Not charging for the steps)</span></span></span></li>
	<li><span style="font-size: 11pt"><span><span style="font-family: Calibri, sans-serif">40 Linear Feet X $140.00= $5,600.00 + slab $1,200.00</span></span></span></li>
</ol>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Cost:      $6,800.00</span></span><br>
 ', NULL, '2020-05-21 11:21:41', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3030678, 'Replacing (5) 5-Gallon Buganvilleas with (5) 15-Gallon Podocarpus Gracilior<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">5-gallons: $43.50<br>
15-gallons: $140<br>
<br>
On contract: 5 x $43.50 = $217.50<br>
5 15-gallons: 5 x $140 = $700<br>
<br>
$875 - $217.50 = $482.50<br>
<br>
Add 22 more 15 gallon podacarpus.    $2980</span></span></span><br>
Remove (3) 1 gallons<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3030683, 'Kitchen on contract 11''   <br>
Reduces to 9''8"                               Credit of $750<br>
<br>
Other contractor installed valves     Credit of $400', NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3032032, 'Add 90 linear feet of additional concrete curbing.<br>
<br>
Form,<br>
Rebar,<br>
Pour,<br>
Top Cast Finish<br>
<br>
Curb to be 6 inches wide and 14 inches tall. <br>
<br>
 ', NULL, '2020-05-21 14:52:23', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3033102, 'Crew to remove additional square footage for property.  Clean sides not in contract. <br>
<br>
Add additional 200% square footage of brush removal outside contracted sections. <br>
<br>
Trim trees.<br>
<br>
Additional Sections are farther out and harder access.  <br>
<br>
Treat all additional areas with weed killer.  <br>
<br>
Need all next week to remove.  <br>
<br>
 <br>
 ', NULL, '2020-05-29 16:59:40', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3034169, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3034474, 'Difference in price from contract and changes in newest addendum', NULL, '2020-05-23 10:25:45', 1, '2020-05-28 15:55:05', 'Mohammed Rahman', 'Mohammed Rahman', 'sold'),
  (3037007, 'Takin out 600 SFof gpoher mesh', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3037095, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">2-1/2 yards of Cedar shredded mulch </span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">5-1/2 yards of Gorilla hair </span></span></span>', NULL, '2020-05-29 12:58:19', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3043736, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3043975, '2 baskets of Santa Barbara Light at 3,000 pounds each, $550.00 each&nbsp;&nbsp;', NULL, '2020-05-28 15:21:28', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3045326, 'This is for excvation of soils behind 4'' average wall, 14 linear feet long<br>
Waterproofing with 2 coats Henry''s Tar,<br>
Installing french drain with sleeve and backfilling with gravel<br>
Connecting to new drain line under pavers.', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3045831, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3048165, 'not removing a tree', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3048697, 'Changing the 220 wiring to sleeve only credit  $390.00, 30 LF X $13.00<br>
Adding in 3 outlets  3 X $80.00= $240.00<br>
110 wiring 3 locations:<br>
37 Linear Feet on the side of house<br>
22 Linear Feet in the back yard<br>
4 Linear Feet in front<br>
63 total Linear Feet X $21.00= $1,323.00  <br>
Total $1,563.00 - $390.00 Credit for not including wiring= $1,173.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3051639, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3054058, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3054226, 'Front Yard<br>
- Wall : dug additional 3ft beyond contractor for footing for planter wall - 3 guys one day plus dump fees<br>
$1,700<br>
<br>
<br>
Side Yard/Pool Area<br>
- 3 man x 4 hours extra conduit low voltage  $750<br>
- 3 man x 5 hours raise planter (additional)  $950<br>
<br>
<br>
Back Yard<br>
- 4 man whole day install steel posts for fencing  $2,000', NULL, '2020-06-03 18:35:49', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3055962, '- (10) 4" pour in drain inlets     $300<br>
- (3) 9" pour in for skimmers    $350<br>
- (2) 6" pour in for cleanouts    $280', NULL, '2020-06-03 19:48:17', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3056044, '52 linear feet at $25.00 a Linear foot, we are building the wall and most of it will be open trench for installation', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3056045, '202 Squre Feet X $11.00 all bobcat accessable or over lay with limited demo', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3056047, 'Taking out the removal on 1 tree', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3056058, 'Behind Veg wall, we are water proofing and it''s open already', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3056071, '15 lf X $21.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3056075, 'Drainage $21.00 LF X 55= $1,155.00<br>
3 pop ups X $25.00= $75.00<br>
$1,230.00', NULL, NULL, 1, '2020-06-06 22:29:10', 'John Sarkissian', 'Verva Gerse', 'sold'),
  (3056197, 'change concrete from 260sqft to 75sqft concrete   SUBTRACT -$1000<br>
<br>
Remove (5) 5 gallon plants from planting @ $45ea =SUBTRACT -$200<br>
<br>
Add 40ft Drains and core curb ADD + $1100<br>
<br>
Increase Decomposed granite from 425sqft to 665sqft  ADD +$1200', NULL, '2020-06-04 06:40:41', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3058666, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3058674, 'Install Febco Backflow system. <br>
Rework Main copper line.<br>
Install Main Line Shutoff Valve<br>
Install 580 linear feet of Main Water Line to supply Valve Stations  (Valves forward covered in contract)<br>
<br>
Originally $9800', NULL, '2020-06-10 13:06:37', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3061480, NULL, NULL, '2020-06-07 10:51:47', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3062772, 'Replace 3 zones. Valves . Reconnect as needed. Includes sleeves across driveway', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3064009, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3066419, '2 pots $311.38<br>
String lights for the Trellis $54,75<br>
Cost of irrigating the posts $250.00<br>
Total $616.13<br>
 ', NULL, NULL, 1, '2020-06-09 11:56:15', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (3066986, 'from group 1 tile t group 10 <br>
MARF235 2X2  with white grout', NULL, '2020-06-09 15:14:42', NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (3067467, '<br>
Upgrade standard 300 watt transformer to Bluetooth dimmable transformer <br>
included installation and setup <br>
<br>
<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Vista CTS300T</div></div>', NULL, '2020-06-24 20:21:09', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (3067473, 'Permits for Gas line at the rate of $120hr plus city permit fees<br>
not to exceed $1000 without further approval', NULL, '2020-06-09 19:44:16', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3067506, '(4) well lights  black @ $220ea x4= $880                              pn 5262<br>
(6) up-lights composite  @ $220ea x6=$1320                       pn 5280<br>
(1) Path lights     Black    @ $220ea                                     pn 5202<br>
Transformer "Bluetooth 300 watt"     $845                            pn VPRO2<br>
<br>
Total $3265', NULL, '2020-06-17 21:27:17', 1, '2020-06-09 22:29:24', 'Ryan Kleefisch', 'Ryan Kleefisch', 'lost'),
  (3073723, 'Owner accepts Marf235 tile as installed<br>this is a no charge upgrade<br><br>Approx 50ft of coping was found "hollow" potentially loose. Owner declines repair of these existing copings<br><br>Picture build will grout one piece of coping at no charge', NULL, '2020-06-11 19:36:47', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3075348, 'no gas valve, fire ring or lava rock provided', NULL, '2020-06-12 21:12:49', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3075350, NULL, NULL, '2020-06-12 21:13:25', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3075378, 'garden wall for northside, taller than contract, change from block to poured in place with inspections - 3900<br>
waterproofing - 600<br>
french drains - 400<br>
<br>
 ', NULL, '2020-06-12 12:41:00', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3078052, '1) Raise Driveway Wall to take out grades being to high behind wall.<br>
   a) Add 1 course 9''<br>
   b) Add 2 courses 15''<br>
   c) Add 1 course of 4 inch block  60''<br>
   d) Add additional veneer to project.<br>
Cost $3100<br>
<br>
2) Bay Window removal. Framing and Drywall Install (no mudding)<br>
Cost $1700<br>
<br>
3) Fencing for Dog Run<br>
Remove block Wall <br>
Install new steel posts.  40 linear feet of fencing. Additional work on posts to be off set steel. <br>
Install Mangaris on Interior - Neighbor unfinished.<br>
Cost $4435<br>
<br>
4) Cantilever front entry steps  - NO Charge<br>
<br>
5) Add reinforcement for roof work change roof to thicker profile  - NO Charge<br>
<br>
6) Add 31 linear feet of Wall for A/C enclosure and planters6x8x16 CMU.   Includes trenching, steel work and footings.  Stucco coat interior wall profile. <br>
(Need to discuss if the fencing and gates is desired for trash enclosure area still which will affect how wall is built)<br>
Cost $3200<br>
<br>
7) Stucco repair work for home  Lathe, plaster and stucco.  Paint ready or desired color coat.<br>
Cost $5950<br>
<br>
<br>
 ', NULL, '2020-06-16 10:25:54', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3079585, '8) Poured in place Wall Cap.  Remove some portion of existing stone capping.  Remove top layer of veneer stone to allow for form boards. Install forms and pour cap.  Remove Forms and finish.  Color TBD.  Straight edge.  321 Linear footage included.   Does not include footage for under fencing as requested.<br>
 ', NULL, '2020-06-17 12:02:43', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3080715, '(4) Well lights  - WAC   PN  5031 - 27BBR 9-15 VAC  - Bronze on Brass -  set in pavers - color changing @ $334ea x4= $1336<br>
(6) Up-Lights - WAC     PN  5011 -27BBR 9-15 VAC  - Bronze  on Brass -   Landscape  -  color changing @ $302 ea x6 = $1812<br>
Vista Low Voltage Transformer  $650<br>
<br>
Total $3798<br>
<br>
<br>
with the WAC lighting you can control each light and turn them ALL off directly and adjust colors, no need to upgraded bluetooth  transformer', NULL, '2020-06-18 08:24:30', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3082045, 'Upgrade (2)  Gates from 4x5ft square steel frame to 4x5ft with with round top<br>
<br>
ADD $1650<br>
 ', NULL, '2020-07-06 17:12:39', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (3082405, '424sqft group 1 3/4" crush gravel 3" thick<br>
installed $1423<br>
<br>
3/4 crush Palm springs Gold or landscape rock 1" ', NULL, '2020-06-22 21:04:28', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3087488, NULL, NULL, '2020-06-18 20:11:37', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3088836, 'Does not include demo', NULL, '2020-06-18 20:10:36', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3088934, NULL, NULL, '2020-06-18 20:11:10', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3089627, 'Credit for removing this portion of job from project.&nbsp;', NULL, '2020-06-30 09:29:24', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3092153, '<br>
    1. remove 2 stumps and cleanup all rear are in preparation for new lawn   $1200<br>
    2. remove 2x8ft concrete step at gate/tree area                                            <br>
    3. grade all rear area in prep for new lawn<br>
    4. install (2) zones irrigation                                                                           $1700<br>
    5. 65ft 2x4 brown "Cedar tone" pressure treated  as edging                         $475<br>
    6. Amend and rototill soil and finish grade<br>
    7. install 1000sqft valley RTF tall fescue                                                         $3525<br>
<br>
<br>
                                                                                                                     Total $6900<br>
<br>
<br>
 ', NULL, '2020-06-22 06:56:28', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (3093347, 'Stump grind 2 stumps
Remove and dispose of concrete by gate ', NULL, '2020-06-22 09:50:26', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3093353, 'Add 4 steps overlays from 9 to 13 steps
Add 4  step lights ', NULL, '2020-06-23 10:41:07', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3094679, '424 sqft <br>
3'' thick<br>
includes<br>
mexican pebble 3/8-5/8 <br>
prime montana<br>
prime black mix<br>
mexican beach pebble  1/4"-1/2" <br>
 ', NULL, '2020-06-22 14:37:27', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (3094868, 'The entire west side of the lot and the south side of the lot from the bottom of the steps until it meets the west (rear) will be fenced in ipe on the side of the posts facing the house with clean cuts that are precisely aligned for visual impact, and both iron gates and frames proving access to the rear yard will be fenced in ipe on both sides. Owner will provide the ipe, penofin oil, penofin cleaner, and screws for the fence, which will be unloaded from the delivery truck and installed by Picture Build. All cuts and holes will be sanded, and the ipe will be cleaned before oiling using Penofin. The Penofin Oil will be brush or rag applied on all four sides, all end and other cuts and holes (unless Owner supplies a wax treatement for the end cuts), and otherwise applied in accordance with the manufacturer’s instructions. All ipe will be protected from the sun and kept off the ground until installation in a manner that allows the wood to breathe..<br>
<br>
The wood fence framing will be GCB-, which will be provided by Picture Build and installed as follows:<br>
(1) two 2x2 GCB on each post (one installed on each flange of the post) for attaching the ipe;<br>
(2) a 2x4 horizontal top rail and a 2x4 horizontal bottom rail between each metal post, with another 2x4 installed vertically between the top and bottom rail at the midpoint between posts;<br>
(3) the reverse side of each metal post (the side facing the neighboring properties) will have a 1x6 GCB- covering the metal. All GCB- cuts to be treated (copper brown treatment).', NULL, '2020-07-03 07:18:57', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3097113, 'Finish side block curb to match back.  - $350<br>
Raise concrete step wall in front - $2000<br>
Waterpoofing and Backfilling front - $5000 <br>
Added drain line firepit area - $200<br>
Added French Drain front 59 linear feet $1180<br>
Added regular drain freont 37 linear feet $740<br>
Added electrical work for firepit for phone activation $200<br>
<br>
 ', NULL, '2020-06-25 15:23:12', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3097609, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (3097617, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (3097623, NULL, NULL, '2020-06-24 07:46:35', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3097772, NULL, NULL, '2020-06-30 09:29:49', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3097823, 'Upgrade from shredded mulch to "Gorilla hair"; <br>
950sqft ', NULL, '2020-06-23 22:25:22', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3105921, 'Demo wall and frame out closet opening. $1,900<br>
Break out slab footing<br>
Epoxy and dowel.<br>
New footings.<br>
Block wall to three feet.<br>
Water proof. $3,200', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (3106108, 'Two Days Bobcat Grading -  $2200<br>
One Man Day,  Trenching Back filling and compaction as a part of grading $480<br>
<br>
Extra soils movement, backfilling and grading not covered in grading plan: <br>
<br>
1) Entire Lawn area had to be cut and raised to get better slope. <br>
2) Remove large soils deposit and spread soils in back to provide better grade.<br>
3) Backfill and Compact open trenches including sewer lines. <br>
4) Need to still adjust back grade behind pool wall for pathway and planters levels now requested.   <br>
<br>
Pricing to be assessed after final determinations.', NULL, '2020-07-08 14:59:38', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3106342, 'Install 4 foot timber section, near southwest drop off - 3 feet in height. <br>
Install 7 foot angled and stepped timber section transition from 3 foot wall to long main wall.<br>
Install 87 foot 2 foot high timber section along back<br>
Install 8 foot return timber section near cabana at 3 feet high. <br>
<br>
Install 7 foot  timber section at 3 feet high to retain next to cabana landing exit to back yard.<br>
Install 7 foot timber curb section to form outside gravel landing for cabana exit<br>
Install 9 foot timber angled first step<br>
Install (3) 5 foot timber steps<br>
Install 14 foot timber section at 1 foot height to form step retainer on north side for transition steps to backyard <br>
Install 12 feet of step retainer on south side of transition steps to backyard. <br>
 
<ol>
	<li><span style="font-size: 12pt"><span><span style="font-family: ">Use 8’ x 6” ACQ Pressure Treated Lumber from Topanga Lumber</span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: ">Dig footings for steps down 12 inches below grade</span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: ">Install geofabric and ¾ crushed gravel bed.</span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: ">Install first step beam to grade.  Use 3 foot #4 rebar to secure to ground</span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: ">Install second beam above grade to create 6 inch step.</span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: ">Secure second step with 3/8” x 10” timber screws</span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: ">Total of (65) 4’ foot steps</span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: ">Use Timber Screws to secure each course.</span></span></span></li>
</ol>
<br>
<br>
<strong>Garden Retain Wall and North Timber Steps and Wall<br>
Original approved co 21,900.00<br>
using 8x6<br>
<br>
<br>
Credit of -1950 using 6x6 timbers<br>
<br>
New total is $19,950</strong>', NULL, '2020-07-08 15:00:01', 1, '2020-06-26 15:39:13', 'Brian Godley', 'Brian Godley', 'sold'),
  (3108351, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Install 1.5 inches of Del Rio at the bottom.
Install 1.5 inches of Montana on top. $624 difference from all Del Rio.</div></div>', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (3115074, 'Upgrade from Tan Decomposed Granite to gray', NULL, '2020-07-01 12:16:23', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (3117208, 'Credit of $450.00 kitchen demo, it was already done<br>
Credit of $375.00 in drainage in contract<br>
adding in total of 60 linear feet of drainage at $20.00 $1,200.00<br>
Total  difference $375.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3117437, '- Remove 2 feet of high soils. Haul soils. - $1400<br>
- Demo out area down to 6 to 9 feet beyond new grade to get to bedrock - contract states 4 feet. Additional 22 yards - $2700<br>
- Pour new footing at 18 inches to 3 feet deep   contract states 4 inch pad.  added forming and additional 10 yards of concrete -   $1900<br>
- Form new poured in place walls vs block. Walls are 4 and 5 feet in height vs 3 feet in contract - $900  added material plus $8500 added labor - changed to $6500<br>
- Pour new storm garden wall. Extra material $1700 (minus block credit of $400) $1300 for concrete and pumper.  3 guys additional crew day for pour and strip forms. $1500<br>
<br>
Does not include waterproofing or backfilling or additional compactions. <br>
<br>
 ', NULL, '2020-07-03 07:17:00', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3119684, '<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12.0pt"><span style="line-height: 107%"><span style="font-family: ">18lnlft * $35 = 630<br>
<br>
Run Gas Line:</span></span></span></b></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12.0pt"><span style="line-height: 107%"><span style="font-family: ">Need to disconnect existing gas line <a name="_t8t10adzm43p"></a></span></span></span></b></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="line-height: 107%"><span style="font-family: ">Total LF to be determined</span></span></span></span></span></span>
<ol>
	<li><span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><a name="_wshgterpo1h1"></a><span style="font-size: 12.0pt"><span style="line-height: 107%"><span style="font-family: ">Unit price $35 per LF, </span></span></span></span></span></span></li>
</ol>
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><a name="_im4qt2iu7job"></a><span style="font-size: 12.0pt"><span style="line-height: 107%"><span style="font-family: ">Picture Build is not installing the outdoor kitchen now</span></span></span></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12.0pt"><span style="line-height: 107%"><span style="font-family: ">New BBQ is not assembled by Picture Build, there will be additional cost if Picture Build is to assist in the hook up.</span></span></span></b>  </span></span></span><br>
 ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3119883, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3119885, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3119886, '122 SQFT<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3121788, '<a href="https://buildertrend.net/DailyLogs/DailyLogsList.aspx#">7-6-2020</a> <br>
<strong>Added By: </strong>Verva Gerse<br>
Paver and Outdoor Kitchen change order and notes: Adding 41 SF of Pavers Outdoor kitchen adding 1. 7 linear feet 2. 1 additional GFI in back of U shape total of 2 GFI inside the kitchen and 2 external, includes addiing the linear feet for the gas line that is necessary for the grills in the extended area. 3. Make sure there is an electrcial conduite from the kitchen to the fire pit for the firepit light and switch at kitchen 4. Watch for the copper pipe by steps, too high for pavers 5. Remember to move sprinklers over 6. the Side of the kitchen closest to the fire pit is 6" lighter and cantilevered<br>
<br>
Price at 7 linear feet X $680.00 with gas line included, electrical outlet, and 41 additional feet of pavers.<br>
Total for Change Order: $4,760.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3123000, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3123723, 'Remove soils in 204 linear feet of trenches.<br>
Recompact soils in lifts 204 linear feet of trenches.<br>
Install soils in another 135 linear feet of open trenches. Compact in lifts.<br>
<br>
Remove 30 linear feet of drain.  Reinstall with proper glued joints. Replace damaged section of pipe.<br>
Trench out triple wall drain line across driveway.  Remove and replace with SDR 35 with. primed and glued joints. <br>
<br>
Dig out soils from rear sidewalk area.  (already removed 5 yards of material from section.  Will have additional soils for to remove for dumping later not covered in this change order)', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3124173, 'Install new irrigation valve and 15ft of pipe', NULL, '2020-07-07 09:04:29', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3125951, '65inx70 pre-hung swing doors "outside swing"<br>
2-mascinite solid core 1-3/4 in thick<br>
5in jams<br>
4in hinges<br>
oak sill<br>
bottom door sweep<br>
weather stripping<br>
flush bolt<br>
paint by owner', NULL, '2020-08-13 13:46:51', NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (3129115, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (3131038, 'Take newly installed Turf out, Dig about 2" and install "Mexican Mix 1/2-1" Gravel" - $0 (No charge - Warranty issue)<br>
Add same gravel to planters - labor + material (tax and delivery included) - $1,100.00', NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'lost'),
  (3131902, 'Per client request<br>
<br>
Additional 50 linear feet of corners @ $10.49 per foot   - $576.95 w/tax<br>
Additional 78 square feet of flat veneer @7.25 per sq foot - $622.11 w/tax<br>
<br>
Total', NULL, '2020-07-09 16:34:04', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3131974, 'Backfill lower two planters next driveway<br>
Backfill gravel on and behind storm garden<br>
Have to be installed via buckets<br>
10 yards in total. - $3200 5 guys one day plus gravel cost. (if takes less time will credit on other invoice)<br>
<br>
Credit 3 yards in original contract (960)<br>
<br>
Waterproof large storm garden - $1900 3 guys one day plus material<br>
Waterproof lower planter beds  - $950 3 guys half day plus material<br>
 ', NULL, '2020-07-17 10:54:23', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3134251, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3134322, '
34 LF X $35.00= $1,190.00

Electrical Line 19 linear feet, in contract we were to use the existing, we needed to add new conduite from the house, priced at $22.00 = $418.00

Water line included

$1,608.00
', NULL, '2020-07-13 13:24:01', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3137170, 'Extend Garden Beds and DG path by 7 feet. $1400<br>
Add return wall to side of walkway $275<br>
Fix out of Level Section of Garden Wall - No Charge<br>
Add 2 spot lights to back, Run new circuit from Transformer. $500<br>
Change out 20 1 gallon plants in back. - No Charge<br>
Add 3 bags of lava rock - $90<br>
Paint Extended Garden Beds - $290<br>
<br>
<br>
 ', NULL, '2020-10-01 11:09:12', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3145653, 'Rework existing drains again for drainage to a/c units and planter beds.<br>
<br>
Re run water mains.<br>
<br>
2 guys 1 day', NULL, '2020-07-16 10:09:51', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3151085, NULL, NULL, '2020-07-20 08:56:35', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3151109, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (3151149, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3151220, NULL, NULL, '2020-07-20 09:22:18', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3152303, 'additional sqft from original bid. compromised on splitting cost. - per jorge', NULL, '2020-07-20 13:38:05', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3152627, 'Client kept extra material.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3152660, 'We are to stucco 2 walls on both sides of house 

Wall 1 on bbq side 32''x9'' 
From retaining wall towards front yard

Wall 2 opposite side from retaining wall towards front yard 48''x6''', NULL, '2020-07-21 07:40:21', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3152774, NULL, NULL, '2020-07-21 12:50:09', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3158101, NULL, NULL, '2020-07-22 12:22:42', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3163962, NULL, NULL, '2020-07-24 11:02:26', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3164908, 'Includes (2) transformers.  Please ensure enough wattage capacity. <br>
 ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3169838, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3169930, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3170824, NULL, NULL, '2020-07-28 13:36:21', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3170832, '52 SF x $15.00= $780.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3170844, '30sf x $15= $450.00 + $250.00 trench and backfill. $700.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3170857, '37 of x $25.00= $925.00 + $125.00 box. $1,050.00 total ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3172522, 'Driveway extension wall: -remove existing wall and up to 2 feet of soils -Haul away     $600.00 -20 linear feet of new footings $80.00, 3 courses or average of 18” high in matching Angelus Block,  $45.00, and waterproofing 2 coats of henry’s tar $20.00=   $145.00 a linear foot X 20 LF= $2,900.00 Total:     $3,500.00   <br><br>Brick cap on existing wall -remove existing cap, and prep for new cap $10.00 -Thin set new brick cap, soldier’s course -Grout brick as in existing  $15.00 $25.00 for 53 linear feet, 19 on the side, 34 lf in front Total:  $1,325.00<br><br>  TOTAL:  $4,825.00  <br>Please respond with any change/ your approval. Thank you!     Verva Gerse Picture Build Cell : 818-419-8326 www.picturebuild.com verva@picturebuild.com   ?Virus-free. www.avg.com Okay,   we approve. Please move forward with this. thanks Rick and Jennifer. Show quoted text Thank you will do. <br><  kingsarenum1@aol.com><  verva@picturebuild.com><  kingsarenum1@aol.com><  mkingjqueen@sbcglobal.net><  verva@picturebuild.com> (There will be a few more pavers, however, as agreed, we will not charge more or less than we have actually installed.  We can do a new count at the time of paver installation, and discuss.  It will be approximately 40 additional SF of pavers.)  <  /verva@picturebuild.com><  /mkingjqueen@sbcglobal.net><  /kingsarenum1@aol.com><  /verva@picturebuild.com><  /kingsarenum1@aol.com>', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3172726, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3173302, NULL, NULL, '2020-08-01 13:32:20', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3177682, '<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><u><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Cleanup/Grading/Demo</span></span></span></u></b></span></span></span>
<ol>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Remove existing plants and save, dipose of un-used plants</span></span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Grade front yard and parkway in prep for new driveway extension and Synthetic Grass</span></span></span></span></span></span></li>
</ol>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Price $2800</span></span></span></b></span></span></span><br>
<br>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><u><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Irrigation</span></span></span></u></b></span></span></span>

<ol>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Re-configure, cap off and convert zone to drip as needed</span></span></span></span></span></span></li>
</ol>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Price $850</span></span></span></b></span></span></span><br>
<br>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><u><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Planting</span></span></span></u></b></span></span></span>

<ol>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Using existing plants arrange in planter areas</span></span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">No warranty on transplants</span></span></span></span></span></span></li>
</ol>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Price $850</span></span></span></b></span></span></span><br>
<br>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><u><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Synthetic Grass</span></span></span></u></b><b><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a"> - 520sqft</span></span></span></b></span></span></span>

<ol>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Excavate to 3” depth</span></span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Install approx 30ft bender board edging</span></span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Install 3” compacted base</span></span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Install group 1-synthetic grass</span></span></span></span></span></span></li>
</ol>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Price $6230</span></span></span></b></span></span></span><br>
<br>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><u><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Driveway Extension</span></span></span></u></b><b><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a"> -100sqft</span></span></span></b></span></span></span>

<ol>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Extend driveway up to 2.5ft wide on both sides</span></span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Excavate up to 7” depth</span></span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Install border pavers with concrete</span></span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Group 1 pavers</span></span></span></span></span></span></li>
</ol>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Price $2680</span></span></span></b></span></span></span><br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">see front yard plan</div></div>', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (3177686, 'demo/remove Decomposed granite except side yard to 3" depth and dispose <br>
install new del/rio gravel or group 1 stone 430sqft<br>
Price $2314<br>
<br>
New Garden Valve  $45<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (3181268, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3182633, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3183041, '<ol>
	<li><span style="font-size: 12pt"><span><span style="font-family: Calibri, sans-serif"><span style="font-size: 11.0pt">We would form a concrete pad for floor section. </span></span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: Calibri, sans-serif"><span style="font-size: 11.0pt">Pour the floor section and finish it.</span></span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: Calibri, sans-serif"><span style="font-size: 11.0pt">Then we build the walls out of CMU.</span></span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: Calibri, sans-serif"><span style="font-size: 11.0pt">We then build the steps of CMU as well</span></span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: Calibri, sans-serif"><span style="font-size: 11.0pt">Then Grout lift all cells of block.</span></span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: Calibri, sans-serif"><span style="font-size: 11.0pt">Then we form a poured in place concrete top with  lots of rebar and backer board an. 4 Inch thick</span></span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: Calibri, sans-serif"><span style="font-size: 11.0pt">Then we form step tops with reinforced rebar. 4 inches thick</span></span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: Calibri, sans-serif"><span style="font-size: 11.0pt">We then pour using the same color we have on the caps for the walls.   </span></span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: Calibri, sans-serif"><span style="font-size: 11.0pt">We finish that and set the cabinet and wash pan/basin. </span></span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: Calibri, sans-serif"><span style="font-size: 11.0pt">Then we connect the drain line.  </span></span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: Calibri, sans-serif"><span style="font-size: 11.0pt">Then we do a stucco coat  on the exterior side of walls and steps for uniform look. </span></span></span></span></li>
</ol>
See attached drawing and cabinet data.', NULL, NULL, 2, '2020-08-03 15:58:11', 'Brian Godley', 'Brian Godley', 'sold'),
  (3183053, 'Removing portion of work for change order #1&nbsp; - wall size increase.&nbsp;', NULL, '2020-08-03 17:23:53', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3183061, 'Client provided some fencing material for contract.&nbsp; Mitch gave us a credit of&nbsp; $650 passing this credit on to Fermin.&nbsp;', NULL, '2020-08-03 17:23:16', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3183173, 'Original Contract included 9ft x 30 inch CMU wall and 24 ft x 8 inch block curb wall.  $1530 dollar credit.<br>
<br>
Current requirements are:<br>
<br>
1) Wall by very back of driveway.  6x8x16 CMU.   5 ln ft x 22 inches and 8 ln feet x 30 inches stucco by other.  Footings to be 12 inches deep by 16 inches wide.  3 guys 1 day.  <br>
$1800<br>
<br>
2) Wall by entry stairs 5.5 ft tall to 4 ft tall. 10 feet long.  8x8x16 CMU. Dowel into existing footings.  Grout lift all cells. Waterproof back. <br>
Backfill .  Non-Engineered compaction. 2 guys 3 days plus material <br>
$3400<br>
<br>
3) Wall by street side to curb.  Will need a 24 inch deep wall.  Flatten out lower section. to wall.  8x8x16 CMU.  Will have 6" exposed curb on driveway side.  24 feet long.  Standard 12x16 footing.  Demo existing wall, form footings, rebar pour, install wall and cap.  Stucco by others.<br>
2 guys 3 days plus material. <br>
$3400<br>
<br>
4) Saw cut existing concrete wall on driveway.  $200. <br>
<br>
5) 1 man day for drainage demo for planter. N/C<br>
<br>
$8800 - $3900 credit   = $3900<br>
 <br>
 ', NULL, '2020-08-04 10:20:11', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3183177, 'Electrical&nbsp;demo and other work only took 1 day instead of 2.&nbsp; Credit 2 man days.&nbsp; $1000', NULL, '2020-08-06 13:20:20', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3183204, 'Dig out section per plan and haul soils.  $2400.  Additional sand bedding or layering would be additional if required.<br>
<br>
Install 62 ln feet of 1 1/2 poly line.  Includes trenching, installing line and 14 gauge tracer wire, sanding line,  backfill in lifts and compact in lifts. <br>
$1980', NULL, '2020-08-03 17:47:10', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3185150, 'Demo out existing plastic from joint and despose.

Clean out and prep joints for deco seal.

Add deco seal to joints and apply silica sand.
Clean remaining sand from pool deck
', NULL, '2020-08-07 18:03:03', NULL, NULL, NULL, 'Jorge Flores', 'lost'),
  (3188181, '1.  One additional course of wall block with stucco 46 Linear feet X $20.00= $920.00<br>
2.  5 additional liner feet of wall stucco with concrete cap X $86.00= $430.00<br>
3.  CREDIT grass 47 SF --$165.00<br>
4.  Adding bender board to area of grass and planter 19 LF X $8.00= $152.00<br>
5.  waterproofing was in contract, I made a mistake and forgot to put in addendum<br>
Total= $1,337.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3193752, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3194559, 'Using Rustic Wall Block on the 12'' wide  8" high side Set on the side for a border <br>
19 LF in the backyard, by walkway to EDU X $25.00= $475.00<br>
32 LF on the neighboring side of the driveway X $25.00= $800.00<br>
Total:  $1,275.00<br>
<br>
PLEASE ORDER 60 PIECES OF ANGELUS RUSTIC WALL BLOCK IN GREY CHARCOAL', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3198318, '$1000 allowance<br>
<br>
-6 hours<br>
-119.90 permit fee<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3198349, 'Add CMU to walkway and back of driveway.<br>
<br>
Includes doweling into existing walls and adding reinforcement. <br>
<br>
Includes addtional veneering that will be needed. ', NULL, '2020-08-11 08:19:42', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3198364, 'Includes removal of siding section by dog bath and hauling to dump<br>
<br>
Includes Demo of previous front fencing and hauling.<br>
<br>
Includes last fence items and hauling to dump <br>
<br>
Will require one load to haul fencing, link and siding removal. <br>
<br>
Includes new wiring and paper. <br>
<br>
Includes all stucco work for the siding section ', NULL, '2020-08-11 08:21:27', 3, '2020-08-10 14:40:11', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (3198670, '4 kangaroo paw pink Joey 1g', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'pending'),
  (3200906, '1) Add new pressure regulator.  $687 contractor cost  and no installation fee.<br>
2) Add 110 4 foot timber steps $22,000. <br>
3) Add 30 yards of 50/50 back fill - garden ready soils. $2485<br>
4) Add 120 linear feet of gravel walk at bottom plus hillside cut out and retaining wall. $2900<br>
5) Add hillside retainment along two cut back path through hillside  $3400', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3202058, 'Move road base and bring down soil to appropriate grade so concrete is at 6" instead of 4"', NULL, '2020-08-20 18:27:30', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3202089, 'First course on existing wall at $20.Per LF. $240
Additional 3 courses at 12LF. $13. Per course 
$468.
', NULL, '2020-08-12 06:59:33', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3203818, 'Need one more outlet for inside the kitchen to connect refrigerator and kegerator.', NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3204946, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Cut concrete to make pavers straight</div></div>', NULL, '2020-08-13 11:54:36', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3207968, 'Add concrete to cover exposed wall footings to both sides of the paver wall.', NULL, NULL, 1, '2020-08-13 15:48:56', 'Melinda Babaian', 'Melinda Babaian', 'sold'),
  (3208149, '$1000 1 day two guys for extra footing demo<br>
$250 1 guy 1/2 day for machinery assist on footing demo<br>
$1800 for heavy machinery demo on walls for retaining wall footing and extra wall demo for driveway expansion.<br>
$800 for 1 guy one day cutting footings and diamond blades<br>
<br>
$500 1/2 day for doweling walls and footing<br>
$1000 2 guys epoxy and rebar for footings<br>
$2200 for footing forming,  6 yards of concrete and  delivery and rest.<br>
$1250 for 50 linear of drains from rain planter to street and planters by steps. <br>
<br>
<br>
Pricing change to $8450 based upon emails and conversation. <br>
 ', NULL, '2020-08-17 12:18:59', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3210670, 'Additional 4 Linear feet of block with stucco and concrete top X $86.00= $344.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3210753, ' 2)  7 Linear feet of 6"x6" landscape ties, 3 courses.  each course is $20.00 X3= $60.00 per linear foot X 7 LF= $420.00<br>
> 3)  4 more linear feet of bench seat wall, $344.00, Jorge said that you already approved it. X $86.00= $344.00
<table cellpadding="0">
	<tbody>
		<tr>
			<td>
			<table cellpadding="0">
				<tbody>
					<tr>
						<td>
						<h3>Paulina Berger</h3>
						</td>
					</tr>
				</tbody>
			</table>
			</td>
			<td>Aug 14, 2020, 8:44 PM (9 hours ago)</td>
			<td> </td>
			<td rowspan="2"><img alt="" src="https://mail.google.com/mail/u/0/images/cleardot.gif"><br>
			<img alt="" src="https://mail.google.com/mail/u/0/images/cleardot.gif"></td>
		</tr>
		<tr>
			<td colspan="3">
			<table cellpadding="0">
				<tbody>
					<tr>
						<td>to me<br>
						<img alt="" src="https://mail.google.com/mail/u/0/images/cleardot.gif"></td>
					</tr>
				</tbody>
			</table>
			</td>
		</tr>
	</tbody>
</table>
<br>
Thanks for this info.<br>
<br>
We are going to hold off on the apron at this time. We just want to make a clean line with the existing asphalt. Thank you.<br>
<br>
In terms of landscape ties we are good to go and approve that.<br>
<br>
We are going to keep it as bender board as we originally planned for the 20 linear feet.<br>
<br>
And last but not least... yes we approved the Additional 4 feet today.<br>
<br>
Thanks so much!', NULL, '2020-08-15 06:36:45', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3213844, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3216419, 'Not installing 32 linear feet of rustic wall curbing x $25.00. = $800.00.', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3217081, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3217086, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'pending'),
  (3217092, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3217098, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3217105, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3218584, NULL, NULL, '2020-08-19 08:48:25', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3218749, '20 extra pavers at no charge to customer to make a straight line. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3219770, 'Originally quoted 969 sf of pavers.<br>
Installed 947.69 sf of pavers.<br>
Credit back for 21.31 sf ', NULL, '2020-08-19 12:24:48', 1, '2020-08-19 12:21:49', 'Melinda Babaian', 'Melinda Babaian', 'sold'),
  (3220769, '-50 credit for drip lines in planters<br>
-150 credit for drainage ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3223932, 'Demo existing apron 4''x19'' and formand pour new at 4''x22'' 
Curb needs to cut, formed and poured separately with regular grey concrete ', NULL, '2020-08-21 08:57:34', NULL, NULL, NULL, 'Jorge Flores', 'lost'),
  (3224804, NULL, NULL, '2020-08-21 08:58:07', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3226462, '60*20lnft - $1200<br>
2x draincaps $50', NULL, '2020-08-28 18:45:30', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3226756, '<table cellpadding="0">
	<tbody>
		<tr>
			<td>
			<table cellpadding="0">
				<tbody>
					<tr>
						<td>
						<h3>Verva Gerse <  verva@picturebuild.com></h3>
						</td>
					</tr>
				</tbody>
			</table>
			</td>
			<td>1:21 PM (12 minutes ago)</td>
			<td> </td>
			<td rowspan="2"><img alt="" src="https://mail.google.com/mail/u/0/images/cleardot.gif"><br>
			<img alt="" src="https://mail.google.com/mail/u/0/images/cleardot.gif"></td>
		</tr>
		<tr>
			<td colspan="3">
			<table cellpadding="0">
				<tbody>
					<tr>
						<td>to Jenny, Melinda<br>
						<img alt="" src="https://mail.google.com/mail/u/0/images/cleardot.gif"></td>
					</tr>
				</tbody>
			</table>
			</td>
		</tr>
	</tbody>
</table>
<br>
Hi Miguel and Jennifer,<br>
We hope you are pleased with your new patio.<br>
We strongly suggest that you have this drainage installed that we had discussed in the walk through. <br>
This is your pricing for parts and labor:<br>
Piping to be SDR 35, high quality 4" <br>
The drainage line is 50 linear feet  @ $25.00 a LF  = $1,250.00<br>
2 90 degree elbows up @ $25.00 each = $50.00<br>
2 45 degree elbows up @ $25.00 each = $50.00<br>
2 T''s @ $25.00 each =$50.00 <br>
3 caps and 1 pop up @ $25.00 each $100.00<br>
Total: $1,500.00<br>
<br>
We would like to offer a courtesy of 50 LF X $20.00= $1,000.00<br>
And no charge for all of the rest of materials listed above.<br>
Total offer to you:<br>
$1,000.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'pending'),
  (3228335, 'Add additional 50ft drain line to street, core curb Credit 20ft electrical Adds $1350', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3228794, 'All three trees removed from contract.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3229134, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3229593, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3231725, NULL, NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3232067, NULL, NULL, NULL, 1, '2020-08-25 10:58:05', 'Mohammed Rahman', 'Mohammed Rahman', 'sold'),
  (3232241, 'Instead of installing a drop in unit, we are forming a custom concrete basin.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3232244, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3232285, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3234865, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3237068, '<br>
Please see attached Measurements/drawing specifications
<table cellpadding="0">
	<tbody>
		<tr>
			<td>
			<table cellpadding="0">
				<tbody>
					<tr>
						<td>
						<h3>El Echauri</h3>
						</td>
					</tr>
				</tbody>
			</table>
			</td>
			<td>6:45 PM (8 minutes ago)</td>
			<td> </td>
			<td rowspan="2"><img alt="" src="https://mail.google.com/mail/u/0/images/cleardot.gif"><br>
			<img alt="" src="https://mail.google.com/mail/u/0/images/cleardot.gif"></td>
		</tr>
		<tr>
			<td colspan="3">
			<table cellpadding="0">
				<tbody>
					<tr>
						<td>to me<br>
						<img alt="" src="https://mail.google.com/mail/u/0/images/cleardot.gif"></td>
					</tr>
				</tbody>
			</table>
			</td>
		</tr>
	</tbody>
</table>
<br>
Yes, I approve.<br>
On Wed, Aug 26, 2020 at 18:42 Verva Gerse <<a href="mailto:verva@picturebuild.com" target="_blank">verva@picturebuild.com</a>> wrote:

<blockquote>Hi Jose,<br>
Please approve the attached Outdoor Kitchen drawing.  If you would like any changes please let me know.<br>
This is calculated at 12 Linear Feet, 8 Linear Feet on one side of the L shape, and 7 Linear Feet on the other side.  The counter overhang is 14" on the 2 outer sides.<br>
<br>
First 6 LF= $4,900.00<br>
6 additional LF X $525.00= $3,150.00<br>
Total: $8,050.00</blockquote>
', NULL, NULL, 1, '2020-08-26 18:57:46', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (3238251, '<ol>
	<li><span style="font-size: 11pt"><span style="background: white"><span><span style="font-family: Calibri, sans-serif"><span style="color: black">1) 32” BBQ - Natural Gas ($1,742.00)        part number </span><span style="font-size: 9.5pt"><span style="font-family: Lato"><span style="color: #333333">#2853064</span></span></span></span></span></span></span></li>
</ol>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">    Includes “gourmet package”</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">               — Rotisserie</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">               — Cover</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">               — Smoker Box</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">               — Griddle and Griddle Remover</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">2) Double Door with Towel Rack ($354.00)</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">3) Refrigerator ($317.00)</span></span><br>
 ', NULL, '2020-08-27 10:05:07', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3241336, 'Added walkway length will be incorporated into previous contracted gravel area.       No added cost for this. <br>
<br>
Earlier change order included 110 Linear feet of steps.   Only will be installing 101.  Credit of 9 steps ($1800)<br>
<br>
Previous Change Order had 2 retaining sections roughly 2 feet tall x 18 feet each. 144 linear course feet.  $3400 divided by 144 course feet is $23.60 per course foot.   Actual retaining sections being installed are:<br>
<br>
1) 24 feet x 24 inches high,<br>
2) 20 feet x 24 inches high<br>
3) 14 feet x 24 inches high<br>
4) 4 feet x 24 inches high. <br>
5) 6 feet x 24 inches high.<br>
6) 7 feet x 18 inches high.<br>
7) 8 feet x 18 inches high.<br>
8) 20 feet x 12 inches high<br>
9) 8 feet x 12 inches high. <br>
10) 4 feet x 12 inches<br>
11) 16 feet x 12 inches<br>
<br>
There were a few long flat  retaining landings that needed timber separation to take out small grade for easier traverse  20x4, 8x4, 12x4 20x4.<br>
120 added course feet<br>
<br>
Total course feet 541.   Minus previous course feet included in change order #8 (160) equals  381 new course feet.   381@$23.60 per foot is $8,991.60<br>
<br>
$8,991.60 minus $1800 credit for steps not installed equals change order total of $7,191.60<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3242396, 'dig 2 footings for canopy contractor 20"x20" <br>
<br>
and set concrete\', NULL, '2020-08-28 16:02:36', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3242628, 'Installation of 86 LF. Wall cap approved via text', NULL, NULL, 1, '2020-08-28 16:22:06', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (3242667, '51 Square Feet of grass<br>
Original in contract 29X23= 667 SF<br>
Installed 21 X 28= 588 SF<br>
Credit of 79 SF X $3.50= $277.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3242730, '- $20 / Paver credit was calculated at $11.50 but it should have been $20.<br>
- $130 / Drainage should have been charge at $75 per linear feet.', NULL, '2020-08-28 18:44:17', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3242884, '*** NO ADDITIONAL CHARGE ***<br>
<br>
Wall material changed to: Angeles Tango II Cream Terracotta Brown <br>
<br>
 ', NULL, '2020-08-29 09:36:00', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3242991, '35 sf of pavers 
Prep and demo as necessary 
Move shed labor', NULL, '2020-08-29 13:10:53', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3245810, 'GAs and Electrical permit fee', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3249282, '14 Linear Feet 18" high Rustic Wall runner for the wall soldier course for the cap  in Grey Charcoal', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3249739, 'see attached plan<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Add additional course where shown $308</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">add additional 2 course wall where shown  $790</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"> 5 feet of concrete curb $185</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"> move owners rock to along the walkway – no charge</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Total $1283</span></span><br>
 ', NULL, '2020-09-01 16:56:05', 1, '2020-09-01 16:55:13', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (3251910, NULL, NULL, '2020-09-02 12:33:23', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3252798, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3254315, NULL, NULL, '2020-09-04 00:26:09', 1, '2020-09-03 09:35:13', 'Melinda Babaian', 'Melinda Babaian', 'sold'),
  (3254671, NULL, NULL, '2020-09-03 11:16:50', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3255466, NULL, NULL, '2020-09-03 13:57:13', 1, '2020-09-03 13:56:15', 'Melinda Babaian', 'Melinda Babaian', 'sold'),
  (3258516, NULL, NULL, '2020-09-04 20:13:11', NULL, NULL, NULL, 'Melinda Babaian', 'pending'),
  (3258704, NULL, NULL, '2020-09-05 18:59:31', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3260309, NULL, NULL, '2020-09-08 08:00:32', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3262506, NULL, NULL, '2020-09-08 16:21:56', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3263358, 'Removing this from addendum.  <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Owners may plant on hillside to hold grade</div></div>', NULL, '2020-10-06 21:18:58', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3263761, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3263953, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3263963, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3263971, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3264340, 'We will do concrete all the way down the side house instead of stepper pads.&nbsp; It will connect to trash pad on driveway.', NULL, '2020-10-06 21:18:42', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3265063, 'Plants taken out from original plan to plant change order Podacarpus<br>
<br>
Remove (4) 1 gallon Perennials, (5) 5 gallon Purple Fountain  (4) 1 gallon California Fuchsia (5) 5 gallon Bouganvillias,  ', NULL, '2020-09-12 14:09:17', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3265078, 'Change out 27 stakes to driven lodgepoles.        $940<br>
Change out ground cover to    N/C<br>
<br>
Added planting in front:<br>
(2) 5 gallon Purple Fountain <br>
(2) 1 gallon California Fuschia    $135<br>
<br>
Add extra (5) 5 gallon lavender for various layout by client  $220', NULL, '2020-09-12 14:09:37', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3265131, NULL, NULL, '2020-09-09 13:01:23', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3265680, 'Installed 9/9/2020', NULL, '2020-09-09 15:22:10', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3269392, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Demo/Cleanup                                                              $1300  </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Decomposed granite                                                     $850</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">(11)  2x2 pavers pads set w Concrete                        $935</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">2X4 Pressure treated Edging      90ft                         $1080</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Synthetic grass                                                               $3280</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Planting  1-15 gal fruit tree2-15, 39-5, 18-1           $2671</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Zone Drip w/controller                                               $925</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Mulch                                                                              $425     </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Install owner provide poles                                       $425</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Electrical 1-outlet                                                         $375     </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"> </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">                                                                           Total $12,266             (ADD $571) to original agreement</span></span><br>
 ', NULL, '2020-09-11 13:01:14', 1, '2020-09-10 23:50:03', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (3270207, '3 guys one day plus one dump truck load&nbsp; $1500 plus $500 dump fee.&nbsp;', NULL, '2020-09-21 10:30:10', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3270739, 'Owner to provide access door we''re just doing the labor 1 man 4 hours', NULL, '2020-09-11 12:03:51', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3271915, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3273222, 'Soil removals for leak detect.<br>
Clean Up and Grade front yard for planting. ', NULL, '2020-09-14 11:53:22', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3274330, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3274395, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3275665, 'credt of 5 linear feet of bender board $40.00<br>
Additional plants  12 1 gallon @ $21.00= $252.00<br>
ADditional Plants 2 5 gallon @ $42.00= $84.00<br>
$296.00<br>
 ', NULL, '2020-09-19 10:26:43', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3275801, NULL, NULL, '2020-09-14 20:52:11', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3275896, '<br>
<br>
I cross referenced the plant list with the new plants.<br>
1.  Flowering Plum  24" box 2 additional  @ $360.00=  $720.00  (3 total @ 24: box)<br>
2.  Birds of Paradise 5 gallon  3 additional @ $42.00= $126.00  (11 total @ 5 gallon)<br>
3.  Red Bananas   5 gallon  3 total  @ $42.00=$126.00<br>
4.  Red Kangaroo paws 1 gallon 4 additional @ $21.00= $84.00 ( 26 total @ 1 gallon)<br>
5.  Coral Bells  1 gallon 6 additional @ $21.00= $126.00  ( 26 total @ 1 gallon)<br>
Total:  $1,182.00<br>
<br>
Please approve what you would like, then I can send to Carter for ordering.<br>
We will dig out the stumps 12" from the top of the grade to get them out of the way, as a courtesy.<br>
I''ll watch for the rose choices.', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3275898, '30 Linear feet of electrical line with 1 GFI box.&nbsp; $660.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3277904, NULL, NULL, '2020-09-19 14:47:04', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3277907, 'Adding (9) path lights to backyard plus (3) spots <br>
Adding (6) path lights to frontyard plus (2) spots<!-- begin_ammend --><br>
We will need:<br>
<br>
(15) of these <br>
https://www.vistapro.com/product.aspx?catid=1&typid=3&prodid=697<br>
<br>
(5) of these<br>
https://www.vistapro.com/product.aspx?catid=1&typid=1&prodid=146<br>
<br>
(1) CTS 300 Transformer <!-- end_ammend -->', '2020-09-17 00:00:00', '2020-09-15 12:17:39', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3277910, NULL, NULL, '2020-09-19 14:47:51', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3278326, NULL, NULL, '2020-09-15 12:28:20', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3278685, NULL, NULL, '2020-09-15 13:35:27', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3278826, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3278827, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3279438, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Bougainvillea will be Rosenka
Jasmine is Night Blooming 
Magnolia liliflora is being replaced with Lipan Crepe Myrtle (Tree Form only 24" boxed)</div></div>', NULL, '2020-10-06 21:18:21', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3281659, '45 additional linear feet of bender ,board, customer was not told, I texted him after the fact, not approved yet.  by Verva<br>
 ', NULL, '2020-09-21 07:23:10', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3284204, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3284517, '58 linear feet of Bender board', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3284529, '34 sf pavers x$14', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3284549, 'Add 3 new pepper trees for slope coverage near driveway per meeting on 9/15', NULL, '2020-10-23 15:40:11', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3285715, 'Additional Pavers 441 SF X $11.15= $4,917.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3285731, 'Taking out one 18" high planter ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3285743, 'Step build $45.00 X 29 LF=$1,305', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3285772, 'Additional Utilties from contract, <br>
Calculated man days 3 man days  plus materials<br>
$5,100.00 utiltites total minus in contract $3,280.00= $1,820.00 total<br>
Using the same trenching when possible, using Mini.<br>
<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3286776, '5 foot diameter Stone Wall II Sand stone mocha<br>
Order 2 courses of cap, one for the base and one for the top', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3287592, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3287601, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3288674, '120 Linear Feet of drainage with 10 caps', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3288680, 'Stump removed by Juventino, logged by Jorge', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3288735, 'Installation 2 ceiling fans with switch <br>
Owner provides fans ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3289243, NULL, NULL, '2020-09-20 10:01:12', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3289245, NULL, NULL, '2020-09-20 10:01:34', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (3290098, NULL, NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'pending'),
  (3290581, 'Taking out Bender board', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3290593, 'Taking out extra shrub s and tree roots. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3291015, 'Remove Euphorbia on right side of property close to cement walkway <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Remove (2) Euphorbia on right side of property, one is along property line, other closer to cement walkway</div></div>', NULL, '2020-09-24 10:17:23', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3291297, ' <br>
1.  Cap 40 LF X $30.00=$1,200.00<br>
2.  Stucco 40 LF X $12.00= $480.00<br>
3.  2courses of block ($15.00 each) $30.00 X 40 LF=$1,200.00<br>
$2,880.00<br>
<br>
<br>
 ', NULL, '2020-09-28 18:57:58', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3291364, '30LF of edging to separate DG walkway from Del Rio Gravel bed (front left)', NULL, '2020-09-21 19:46:09', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3296353, '<br>
1.  Steps 12 Linear feet to connect the grass to the entry priced at $60.00,= $720.00', NULL, '2020-09-27 23:07:55', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3296409, '- Demo brick curb near driveway that sits on top of concrete driveway.<br>
- Steps in front and on side are now going to be paver steps.<br>
<br>
No charge for changing steps and demo of brick curb.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">need price of bullnose to see if it''s covered</div></div>', '2020-09-23 00:00:00', '2020-09-23 16:07:20', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3298537, '1. Irrigation - Front - Adding 2 new grass zones<br>
2. Irrigation - Back - Adding 4 new grass zones<br>
3. Timer - Client requested NEW Rainbird timer<br>
4. Timer location - Client requested to move Rainbird timer to garage area (drilling hole through garage from manifold location).<br>
<br>
After assessing Irrigation valves need replacing as well as piping, brass valves and sprinkler heads (we tested and it was clogged). <br>
 ', '2020-09-25 00:00:00', '2020-09-23 16:11:06', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3298715, 'Add 60 SF at 3" of Grey Crushed Gravel to side yard. Keeping planting the same since plant count was already lowered.  Difference for mulch in that area (60 SF) is a wash.', NULL, '2020-09-23 16:08:09', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3298823, '- Added step from driveway paver pathway to backyard. Melinda suggested placement, right at pergola wall.<br>
- 7LF of Angelus bullnose charcoal.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">slope was annoying going ''down'' to the backyard via a paved slope.  Melinda suggested a step and loved that idea!</div></div>', '2020-09-25 00:00:00', '2020-09-23 16:09:12', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3298847, '-Main water line was rusted out, needed replacing.  <br>
- Will lie under pavers.<br>
- Approx. 40 LF of 3/4" PVC main line, includes trenching, time + material. ', '2020-09-25 00:00:00', '2020-09-23 16:03:26', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3298862, '- Adding one more footing and one more post (structure was not fully supported with designed amount of wood material)<br>
- Adding 3 beams along outside of structure (current wood is rotten and splitting)', '2020-09-25 00:00:00', '2020-09-23 16:04:47', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3301284, 'Add 40 blocks  and widen existing wall to 8"  - $800<br>
<br>
apply Thoroseal/sure coat existing wall with 2 coats $1680<br>
<br>
Brown coat wall   about 1/2" thick to remove  slumpstone and make wall ready for stucco  $2800<br>
<br>
Total $5280<br>
<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">should take 6 man days
$800 material approx</div></div>', NULL, '2020-09-24 09:51:21', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3301377, 'We are taking out the section of wall that was impacted by tree roots, which has forced the wall to bow outwards and upwards.&nbsp; We will replace 12LF and demo the remaining 2LF at the end (but not replace) where the palm tree is located.&nbsp; We will also delete the straight caps and just stucco over the walls instead.&nbsp; Carlos said we only need 16 blocks to install the replacement.&nbsp; There will be no additional charge for this.&nbsp; We also explained that the current wall has no footings and is a free standing wall.', NULL, '2020-09-24 11:07:17', NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (3302404, 'Extending concrete extension (next to patio) by another 1'' in width by same length and addition square footage for the concrete area for outdoor kitchen', NULL, '2020-10-06 21:17:49', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3302545, '85LF of perforated pipe installed behind East side retaining wall and connect to hillside piping to allow water to run off and not settle behind wall', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3304185, NULL, NULL, '2020-09-25 08:59:32', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3304557, 'No change in price. 
Reason: Since the existing wall is not perfectly straight, the rough finish will show less imperfections rather than a smooth finish.', NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'pending'),
  (3304810, 'Wtrproof, Drain, Backfill - $9600<br>
<br>
Irr. Valves - $300<br>
<br>
Poll Valve - $200', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3305357, 'Added 2 new hose bibs and 1 shut off valve. (<em>Complementary of Nicole</em>)', NULL, '2020-10-02 16:36:22', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3305520, '- Updated design from poured concrete to 2'' x 2'' square Grey pavers.  (no charge)', NULL, '2020-10-02 16:35:53', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3305669, '17 man days labor (man day = 8 hours)<br>
<br>
Bio Science<br>
zone1 lawn  - 60 lnft 1" pipe, 5 rottor head popups<br>
zone2 lawn - 22 lnft 3/4" pipe, 2 rain bird 6" pop ups<br>
zone3 planter - pipe repair, 2 rain bird 6" pop ups<br>
<br>
P.E<br>
60 lnft 1" pipe, replace 1 rottor head popups, 9 bubbler heads<br>
<br>
Kings Hall<br>
zone1 lawn - 156 lnft 1" pipe, 19 rain bird 6" pop ups<br>
zone2 planter - 57lnft 1" pipe, 8 rain bird 6" pop ups<br>
<br>
Lot 6<br>
38 lnft 1" pipe, 7 rain bird 6" pop ups<br>
<br>
Theatre<br>
z1 planter - 42 lnft 1" pipe, repair 3 spinkler heads<br>
z2 - lawn - 116 lnft 1" pipe, 15 rain bird 6" pop ups<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">48h * 97.94 = 4701.12
88h * 75.33 = 6629.04

Material 1690.93 *1.5 = $2536.40</div></div>', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3307997, 'Add in plants per addendum.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3308021, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3308651, '3 fictures labor @ $75.8 ea&nbsp;&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3309760, 'Additional Demo and Grading for Backyard', NULL, '2020-09-28 16:54:23', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3309864, '58 Linear Feet of Gas Line X $35.00 $2,030.00<br>
No Linear Feet in contract', NULL, '2020-09-29 18:59:43', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3309881, '198 Linear Feet (Including the electrical inside the AC enclosure 14 Feet and 45 feet EMT <br>
Electrical for SPA, Outlets and Pilasters, and all outlets<br>
50 Linear Feet was included in contract<br>
148 Linear Feet X $18.00= $2,664.00', NULL, '2020-09-29 19:01:16', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3309888, '<b>(1) 24" box Lipan Crape Myrtle </b><br>
<b>(2) 5g Salvia leucantha ''Santa Barbara'' </b><br>
<b>(4) 5g Salvia mystic spires blue</b><br>
<b>(7) 1g Lavandula stoechas ''Fat Head'' or Anouk</b><br>
<b>(8) 1g Lavandula angustifolia ''Hidcote'' or ''Munstead'' </b><br>
<b>(9) 1g Pennisetum ''Little Bunny''</b><br>
<b>(6) 1g Blue Fescue</b><br>
<b>(16) 1g Armeria meritima ''Bloodstone''</b><br>
<b>(6) 1g Sedum ''Autumn Joy''</b><br>
<b>(6)  1g Agastache ''Blue Fortune''</b>', '2020-09-29 18:07:41', NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3309894, '*** Main water line : 128 LF (3 bibs and 25 LF included on contract)<br>
<br>
Priced at $18.00 a Liner Foot<br>
<br>
128-25 (in contract) 103 LF X $18.00= $1,854', NULL, '2021-01-25 16:17:08', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3311730, '- Removed drainage from scope. Credited $1,522.00<br>
<br>
- If new work is to be approved by Tom Hall, we will keep this job open and create a large change order.  Payments can come from Tom Hall via check or passing it to Melinda.<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">We are going to be adding a large change order for this job as per Brian''s request.  We are not creating a NEW JOB, it''s too much work and client will pass check to Melinda anyways.  Checks will come from Tom and Doreen Hall and I will update Client''s name to include Tom Hall.</div></div>', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3312310, 'Mulching Citrus Trees<br>
Jute Install for front slope<br>
Trim Eugenias<br>
Prep front parkway for planting. Planting by Jeremy<br>
Install and compact 1 yard sectino next to Storm Garden<br>
Backfill several yards of soils for storm garden<br>
<br>
6 Man Days plus, soil delivery and  material - $3550<br>
 ', NULL, '2020-09-29 17:01:33', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3312963, '17.5 addiitional sf of pavers', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3313342, 'Changing finish from smooth to rough. 
No price change ', NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'pending'),
  (3314050, 'Custom frame would be $350
Previous change order was $250
The difference is $100
', NULL, '2020-09-30 09:42:47', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3314154, 'Upgrade to 600 watt transformer. $400.00 additional for change order. ', NULL, '2020-10-21 09:56:15', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3314244, 'Vista 6540 in arch bronze path light approved via text ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3314922, '41 ln feet of metal edging plus stakes. There will be some left over.<br>
Two guys two hours.<br>
 ', NULL, '2020-09-30 12:13:51', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3315219, '3 more linear feet of BBQ island = $1575<br>
Discount: Island blocks = $630<br>
Only charging for countertop concrete and labor to finish = $945', NULL, '2020-10-02 13:33:28', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3316387, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3317719, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3318111, 'Demolition/Reinstall<br>
1. Remove pavers for drainage install.<br>
2. Remove sand to trench for drain pipe.<br>
3. Remove approx 20SF of concrete near gate and through curb.<br>
4. Reinstall pavers, compact and sand fill.<br>
5. Haul all material to appropriate dump sites.<br>
COST: $700<br>
<br>
Drainage<br>
1. Install approx. 36 linear feet of 3 inch SDR 35 drain pipe.<br>
2. Install (1) 8” x 8” landscape drain boxes with black grate cover.<br>
COST: $1,500<br>
<br>
TOTAL DRAINAGE: $2,200<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Client had me put together estimate for drainage, sod, and irrigation.  They only want to move forward with drainage at this time because they said "the rest is way more than expected".

Client is old, doesn''t use email. Clients are splitting payments, (not of our concern).</div></div>', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3318998, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3319729, 'From Contract <br>
1 5gal $42.00<br>
4 15gal $175.00<br>
<br>
Total $742.00<br>
<br>
Credit due<br>
<br>
4x133 = 574<br>
+42<br>
<br>
= 574<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3320756, 'undermount touchup.   $300<br>
<br>
Demo out footing for wall at sidewalk<br>
Drainage work from planters to street<br>
Sleeves for irrigation, conduit for electrical and low voltage.  $1700<br>
 ', NULL, '2020-10-13 17:26:37', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3321224, NULL, NULL, '2020-10-02 09:15:12', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3321577, 'Not able to perform sandblasting on red paint slab. Our crew chief doesn''t recommend removing with grinding (which we initially thought was an option).<br>
<br>
Keith has painters coming to paint the entire exterior, they should be accustom to removing paint. FYI Pasadena requires a lead test prior to any paint removal ($150).', NULL, '2020-10-02 16:35:30', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3322961, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3322962, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3322966, NULL, NULL, '2020-10-03 11:45:55', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3322968, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3323086, '4 stucco columns wrapped around pergola post anchors. With Waterproofing, mesh, Brown coat and stucco.
We’ll try to make it as small as possible. Suggested size is 6” x 6” x 18”. ', NULL, '2020-10-05 08:53:53', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3323192, 'Added mulching to project and two additional 15 gallon plants.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3323219, 'Cleanup planting Area and prepare for Planting     $650<br>
Irrigation/Drip                                                          $850<br>
Planting - <br>
(1) 15-Gallon shrubs @ $150ea                 $150<br>
(26)  5-Gallon Plants @ $45ea                    $1170<br>
(58) 1-Gallon Plants @ $22ea                    $1276<br>
Move (9) roses (1) Magnolia                         $247   (no warranty on transplants)<br>
Planting Design Fee                                    $300     <br>
Basins and Fertilize and Amend each plant<br>
90 Day  warranty  on new planting<br>
<br>
Mulch-Premium  - by owner<br>
<br>
Total $4643', NULL, '2020-10-30 09:44:50', 1, '2020-10-16 10:44:14', 'Ryan Kleefisch', 'Ryan Kleefisch', 'pending'),
  (3323245, '- Credit for not painting posts and beams of pergola<br>
(House painters will be doing the painting of posts)<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">we still charged for priming, demo was high so we have budget there. I hope he is happy with this credit!</div></div>', NULL, '2020-10-05 08:54:13', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3325008, 'Fence erosion correction

- 4 pressure treated (6×6×8)
- rebar
- 2 man days labor', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3325014, '(1) ball valve for irrigation', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3325232, '60 LF of brown plastic 4" tall x 2" wide bender board along existing lawn line in front inner yard ', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3327833, 'Additional&nbsp; 719 sq feet of sod added.&nbsp; Contract was 7101.&nbsp; Total installed ended at 7820 sq feet. Contract price was $5.22 per sq foot.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3328446, NULL, NULL, '2020-10-07 15:09:51', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3328685, '3 outlets included in contract 
Installing total 8 outlets
37’ additional conduit @ $20/ lf: $807
5 additional outlets @$120/ea: $600', NULL, '2020-10-07 15:08:52', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3329008, 'SEaler for the pavers.&nbsp; $1.00 a SF&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'pending'),
  (3329923, 'Approx. 564 SF in front lawn of Valley RTF &nbsp;(includes demo, tilling &amp; amendments). I have given a 8% discount on the grass.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Gave a little discount 8% maybe?</div></div>', NULL, '2020-10-12 15:13:23', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3331308, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3332511, 'Stucco patch and fade into existing&nbsp;', NULL, '2020-10-07 16:04:29', NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (3332699, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3332922, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3335369, '(4) black step lights *Jorge showed client
(1) 150 watt steel outdoor transformer <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Client gave approval via text</div></div>', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3335685, 'Approved via text', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3335927, '105 SF of sealing and waterproofing inside of seat wall (against neighbors garage)<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">The cost is $5.80 per SF @ 105 SF. 
Extra budget is for painting and prepping wall. $500</div></div>', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3336490, 'Adding:<br>
12) 1g blue fescue<br>
(3) 5g Salvia Blue spirea<br>
(3) 1g lavender hidcote<br>
(3) 1g Sedum Autumn Joy', '2020-10-09 14:20:17', NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3336506, 'Installing 2 poles to string lights from', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3336728, '70 LF of Angelus Bullnose in Dark Grey/Pewter/Charcoal<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">ordering 79LF</div></div>', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3336841, 'ADD (12) Vista 2216 Up-Lights Black<br>
<br>
<br>
 ', NULL, '2020-10-08 16:54:50', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3338329, 'Only run conduit $850', NULL, '2020-10-09 10:05:13', NULL, NULL, NULL, 'Melinda Babaian', 'lost'),
  (3339021, 'Remove and reinstall 97 sq feet wall #2 <br>
Remove and reinstall 38 sq feet for top section wall # 3 in front<br>
Remove and reinstall 68 sq feet inside driveway wall<br>
<br>
Total of 203 sq feet of additional veneer work  = $6496<br>
<br>
Landscape Timber Wall. <br>
Demo exsting.<br>
Install 6x6 ACQ treated timber retained. Includes waterproofing and gravel beds for proper drainage. <br>
for 30 linear feet x roughly 3 feet tall. <br>
$5300', NULL, '2020-10-13 17:27:27', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3339110, NULL, NULL, NULL, 1, '2020-10-09 13:15:48', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (3339149, 'ALL POTS<br>
Texture: Smooth<br>
Color: White Pearl<br>
(36) 48" x 26"<br>
(1) 30" x 26" (this pot replaces a 38" pot on the plan and goes in the Diagonal Area)<br>
(13) 38" x 26"<br>
approx 6 week Delivery', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3339411, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3339425, 'Upgrade to Rachio timer<br>
Owner has approved via text', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3339542, 'Credit should be issued for difference in cost from 24" box citrus to 15gallon citrus', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3339673, 'Additional soils approved via email. ', NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3342316, 'New electrical conduit with wiring, stub up to GFI; 48 LF one GFI', NULL, '2020-10-12 13:47:04', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3342679, 'Demo existing posts install 3 new posts. Paint or stain ready. 6" x 6" with stucco patch at beam', NULL, '2020-10-13 12:43:51', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3343087, 'Credit for sod plugs.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3343456, 'New main line. Replace old galvanized pipes from front to side of the house, under the house to connect to other side.  With new pressure regulator.  
$5,900.00

120 linear feet of additional main line from side of house to the back of house. X $20.00 a linear = $2,400.00

2 hose bibs and 5 brass valves (5 zones)
Hose bibs included. 5 new brass valves with all new emitters and filters x $850.00 = $4,250.00
', NULL, '2020-10-13 09:33:24', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3344254, NULL, NULL, '2020-10-13 09:34:09', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3345218, NULL, NULL, '2020-10-13 11:17:40', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3345515, 'Sidewalk only 
Includes additional delivery fee $100
And demo costs', NULL, '2020-10-14 13:30:18', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (3346244, 'Demo flagstone near "Big Boy" and haul. (Being mindful of Big Boy)<br>
Add weed barrier.<br>
Add approx. 20 SF of 1/2"-1" Mexican Full Mix Beach Pebble.<br>
Add 1 piece of black metal edging to keep pebbles in. (Approx. 8-10ft)', NULL, '2020-10-13 14:27:22', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3346268, 'Add 1 5g Jasmine Vine (staked) for near the front entrance (near little iron fence).<br>
Add 1 5g Bamboo to upper bed.<br>
<br>
No charge!<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">We had more plants on the contract than we ordered. No charge for adding a few plants here.</div></div>', NULL, '2020-10-13 14:30:44', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3346279, 'Demo swale at top of wall and haul.<br>
Grade and prep for planting up top as in original design. <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Jorge said 3 guys 1 day. I charged extra for hauling because it’s hard to access.</div></div>', NULL, '2020-10-13 14:31:14', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3346302, 'swapping out (9) 15 gallons for (6) 24'' box Podocarpus gracilior ', NULL, '2020-10-13 14:31:00', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3348054, 'Address step light installed on column above mailbox.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Vista light 4260M in BLACK</div></div>', NULL, '2020-10-14 08:48:23', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3348106, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'pending'),
  (3348342, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3349125, '40 LF of 3" SDR 35 for drainage in font of home to connect to gutters and direct water away from foundation<br>
<br>
(pricing includes labor + materials)<br>
<br>
2 pop ups (green to match grass)<br>
2 adapters<br>
1 90s', NULL, '2020-10-14 21:31:17', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3349246, 'Swapping out 100 SF of gravel for brown shredded mulch under the tree. (CREDIT)', NULL, '2020-10-14 21:30:46', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3349876, '150 SF of crushed gravel at 2" depth with weed barrier.', NULL, '2020-10-14 15:16:50', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (3349959, 'Rain Bird Lanscape sub-surface drip series<br>
Rain Bird Lanscape water meter<br>
Reduced pressure backflow<br>
Master valve Rain Baird 1" Brass tee flow sensor<br>
Manual shut off valve<br>
Root zone watering system<br>
Low flow control zone kit with PR filters<br>
Quick coupler valve<br>
Weatherbarsed auto controller Rainbird<br>
Rainbird wireless sensor', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (3351584, 'Install 18 new timber steps. - $3600<br>
Install step retainment on lower section   - $800<br>
 ', NULL, '2020-10-23 15:39:50', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3352237, 'Adding elevated bar top to outdoor kitchen. Additional forming. Back splash stucco and concrete top form. 
$374.00 a linear foot. X 16 linear feet. $5974.00. Total change reduced to $2,500.00
Approved via phone call. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3352955, '9 new watering rings x $64.00 each. $576.00
4 new brass valves with actuators. $210.00 each. $840.00. Total $1,416.00', NULL, '2020-10-15 16:02:42', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3353884, 'Install new bond beam for gate operation.&nbsp;', NULL, '2020-11-11 09:55:48', NULL, NULL, NULL, 'Brian Godley', 'lost'),
  (3354740, 'New main line linear feet 28 linear feet X $20.00= $560.00', NULL, '2020-10-16 10:01:58', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3354755, 'Drain pipe and caps. 60 linear feet X $18.00=. $1080.00', NULL, '2020-10-16 10:01:21', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3355347, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3356465, 'Will be applied towards contract', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3358731, NULL, NULL, '2020-10-19 11:07:28', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3358771, 'I originally put in for 4 at $256.00. Need to add for the cost of 2 more. $128.00 for a total of $384.00', NULL, '2020-10-19 13:30:23', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3359403, '1.  Flush water heater from settlement and repair leaksabd flush  $615.00<br>
2.  Under house additional repairs on sections of pipes     $878.00<br>
3.  Charcoal filter set up   $570.00<br>
Total:  $2,063.00<br>
 ', NULL, '2020-10-19 13:20:13', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3359479, 'New water heater with installation Melinda to list the make and model number in change order', NULL, '2020-10-19 13:29:59', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3360059, '18 linear feet of step. $810.00. 123 sf of steps  $1353.00. Total $2,163.00. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3362332, 'Installation only:<br>
1.  5 Myers Asparagus fern 5 gal @ $21.50 each = $107.50<br>
2.  2 Rosemary       5 gal @ $21.50 each = $43.00<br>
3.  3 Plumbago     1 gal @ $10.50 each = $31.50 <br>
4.  3 Iceberg roses   5 gal @ $21.50 each = $64.50<br>
<br>
To order and install:<br>
1.  3 Carissa Macrocarpa dwarf spreading 5 gal    @ $43.00 each = $129.00<br>
2.  2 Springgerii asparagus fern  5 gal  @ $43.00 each = $86.00<br>
3.  2 Kangaroo paw Pink Joey  1 gal @ $21.00 each = $42.00<br>
4.  1 flat of blue fescue in 4" pots  $75.00  $75.00<br>
<br>
Total: $578.50', NULL, '2020-10-20 11:48:54', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3362596, '6 cubic yards 50/50 backfill', NULL, '2020-10-20 16:31:12', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3363384, '(2) 15g
(6) 5g
(4) 1g
(1) flat', NULL, '2020-10-20 14:33:26', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3363574, '1.  2  Asparagus Springeri   5 gallon  @ $43.00=  $86.00<br>
2.  1 lavender 5 gallon @ $43.00=  $43.00<br>
3.  Front yard 1 additional flat of blue fescue = $75.00<br>
Pebbles for the Fountain $99.00<br>
Total:  $303.00', NULL, '2020-10-20 16:27:55', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3365664, NULL, NULL, '2020-10-27 12:25:33', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3365668, NULL, NULL, '2020-10-21 11:37:11', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3366336, '(3) path lights for back patio area
(2) up lights for large tree
(1) 300 watt Transformer. (More lights can be added to the transformer later for front and adding lights anywhere on property)
(1) Auto-timer', NULL, '2020-10-22 11:32:31', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3366491, NULL, NULL, '2020-10-21 14:33:04', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3366681, NULL, NULL, '2020-10-24 13:54:23', NULL, NULL, NULL, 'Melinda Babaian', 'lost'),
  (3368665, 'Regarding the Grass:

original in contract 575 SF X $3.50 = $2,012 in contract

New amount total 1,705 SF X $3.00 = $5,115.00

$5115.00 - $2,012.00= $3,103.00 + lowering the Valves and installing into a box $150.00

Total change order $3,103.00 + $150.00= $3,253.00


', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3368709, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3368752, 'Setting the conduit for the cab le company 45 LF X $15.00= $675.00<br>
 ', NULL, '2020-10-23 10:43:47', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3368762, '60 Linear Feet to move main line to planter X $22.00= $1,320.00', NULL, '2020-10-23 10:43:28', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3368783, 'Drainage 40 Linear Feet with drain caps X $19.00= $760.00', NULL, '2020-10-23 10:44:00', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3369190, 'No charge ', NULL, '2020-10-22 22:08:03', 2, '2020-10-22 22:19:39', 'Melinda Babaian', 'Melinda Babaian', 'sold'),
  (3369617, 'Change  fron adding new check valve to taking existing valve and have a custom welded adapter and cut hole. . Raise up with 4" abs anf cap off, install 6" pour a lid 

This adds an Additional $445 to the originsl agreement', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3372176, 'We are no longer doing 2 step lights and 1 address step light. ', NULL, '2020-10-23 11:01:53', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3372203, 'In the previous change order for Podocarpus I had counted only (6) 24" boxes and we ordered and installed (7) as per client request to make upper beds look full and tall.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Carter - we are not ordering this, I didn''t account for 7 boxes in initial change order for the Podocarpus boxes.</div></div>', NULL, '2020-10-23 14:18:56', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3372253, '60 linear feet if conduit at $15.00 a linear foot. ', NULL, '2020-10-23 10:42:42', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3372390, NULL, NULL, '2020-10-24 13:53:57', NULL, NULL, NULL, 'Melinda Babaian', 'lost'),
  (3373351, 'Credit for not doing #5 in demo: Digging out (2) large boulders in-between grill and waterfall area.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">We initially had planned on digging out the boulder near the pool area.  See #5 in demo on contract.
It''s okay, Client is happy with leaving it there anyways.</div></div>', NULL, '2020-10-23 14:18:43', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3373625, 'Scrape off existing stucco, install mesh, scratch coat, brown coat and redo stucco. 
Match existing color 
*** New stucco color will look different since it is going next to old stucco. Over time they will look more and more similar. ', NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3375397, NULL, NULL, '2020-10-26 09:21:08', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3379092, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3379163, 'Original contract had 8 zones included.  Installed 13 zones. Including 2 zones of inline valves and 100 feet of 13 strand wire and 50 feet of standard.  - $4700<br>
<br>
Install new 16 zone Rachio timer unit.  $350<br>
<br>
Install 15 bags of polished mexican beach pebble.  $575<br>
<br>
Discount given on above. ($600)', NULL, '2020-10-27 16:56:54', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3380841, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">13sqft</div></div>', NULL, '2020-10-27 15:18:26', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3381021, NULL, NULL, '2020-10-27 16:56:31', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3381439, 'under both patio covers, and bbq top, and Fireplace bench<br>
Pressure wash <br>
Seal with Natural Look Sealer<br>
add additional drippers under "palo verde" tree ..the one first large one when you walk into the backyard<br>
 ', NULL, '2020-10-28 01:55:25', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3382993, 'Mistake on linear foot count in contract by verva. Reduced to cost. $5.90 a linear foot. ', NULL, '2020-10-28 13:21:20', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3384141, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Approved via text</div></div>', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3385522, NULL, NULL, '2020-10-29 15:15:00', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3385665, 'run new wire from clock to 2 locations&nbsp;', NULL, '2020-10-29 15:14:39', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3386855, 'remove 10 yards soil from front yard', NULL, '2020-10-29 15:13:47', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3386900, 'Install 1 gfi- at main panel<br>
21lf 1" emt<br>
50lf metal flex<br>
45ft 1" pvc conduit<br>
55 1/2" pvc for pool lighting <br>
(1) sub panel<br>
includes all trenching and installation', NULL, '2020-10-29 13:04:25', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3389530, '1) Sub - (124) Acacia 15 gallon for additional (124) Westringia 15 gallon - No Charge<br>
2) Add - (6) 15 Gallon Ceanothus - $1,080<br>
3) Add - (73) 5 Gallons - 407 inc, in contract 482 delivered.  - $2,920<br>
4) Add - (124) Acacia 5 gallons for hillside fill ins - $5,580<br>
4) Credit - (12) 3 Gallon "El Campo"  - Not Available -  ($360)<br>
5) Credit - (55) 7 Gallon Yucca - Not Available ($2,750)<br>
6) Credit - (63) 2 Gallon "Dan Tangerine" - Not Availalbe ($1,260)<br>
7) Credit - (31) 1 Gallons - 305 inc in contract 274 delivered - ($620)<br>
<br>
Large specimin trees to be added in addtional change order depending upon placement. <br>
<br>
 ', NULL, '2020-11-09 12:35:36', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3389603, '1) Add - 3 new pilasters with rough in electrical - $1,200<br>
2) Add - Upgrade border on northern edge walkway to a "Floating Border"  - $900<br>
3) Add - Drainage for planter beds and roof drains to catch basins. Plus new heavy strip drain for garage (does not include grates) -$3,925<br>
4) Add -  Retaining Walls and concrete pads for Driveway gates and Equipment. - $2,650<br>
5) Add -  2403 additional sq feet of driveway installation - Paver upgrade on seperate line -  $25,231<br>
6) Upgrade - Paver to Aqualina 80mm.  $2.85 extra per square foot included added demo and haul for 5321 total sq feet - $14,908<br>
7) Add - 8 ln feet of walls. 149 with added backyard patio area, contract had 141. Walls to 2 feet average vs 18 inch in contract - $2,270<br>
<br>
8) No Charge - For all additional demo and grading for front and side section of property due to surprise of driveway sq footage difference.  ', NULL, '2020-11-09 12:34:08', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3389768, NULL, NULL, '2020-11-01 21:13:00', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3389927, NULL, NULL, '2020-11-02 09:56:57', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (3390146, '35 SF extra of Courtyard pavers to avoid cut
4 LF bullnose on step
Extra Rustic Wall 10 LF', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3390228, '22 Linear Feet of Electrical X $20.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3390233, 'Need to stabilize&nbsp;side of steps&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3390252, '36 Square Feet additional X $12.00= $432.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3390263, '10 Linear Feet of 24" wall build X $106.00 = $1,060.00  Belgard Belaire in Bella with cap<br>
5 Linear Feet of 18" wall on side next to steps that are already in the contract X $86.00= $430.00  Belgard Belaire in Bella with cap<br>
80 Square feet of Pavers X $12.00= $960.00 Belgard Catalina Grana in Bella small sizes', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3390289, 'Damage was done by demo crew.&nbsp; Permission was given to cut one tree back, but not the special bottle brush tree that the crew sawed off quite a few branches for bobcat access.', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3392795, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3392855, '18 additional Linear Feet of Step build in the back.<br>
X $45.00= $810.00', NULL, '2020-11-24 07:25:28', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3393941, 'Added pavers to the backyard 1,093 SF X $11.00, all bobcat access', NULL, NULL, 1, '2020-11-02 14:38:48', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (3395643, 'Did not install wood A/C screen', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3397371, 'Approved via text ser images ', NULL, NULL, 1, '2020-11-03 15:24:28', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (3397659, '24sf of fence / Priced at 29.50 per original contract = $708<br>
2 more posts at $60/ea = $120', NULL, '2020-11-04 10:35:02', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3397671, '$1480 Steel Frame for Gate and Side Panel ~5''W x 6''H<br>
$900 Powder Coating - 40% Gloss Black<br>
$1330 IPE Veneer over Fence', NULL, '2020-11-05 11:25:12', NULL, NULL, NULL, 'Melinda Babaian', 'lost'),
  (3403294, NULL, NULL, '2020-11-05 13:40:25', 1, '2020-11-05 13:29:48', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (3405483, '1) Add - 2 Additional Pilasters $800<br>
2) Credit - Remove "Floating Border" (-$900)<br>
3) Add - Upgrade all border on driveway to double stone $2,450<br>
4) Add - 548 additional 5 gallon gopher mesh  @ $6.95 per cage - $3,808<br>
5) Add - Excavation with backhoe and bobcat  for 60 inch, 36 inch and  84 inch boxes, (48 inch already included in contract). Remove 2 truckloads of soils -  $3,250<br>
6) Add - Planting 60 inch and 84 inch box trees (48 inch included in contract) 6 guys 1/2 day - $1500.  (Additional drainage not included)<br>
7) Add - Trench and run separate zone irrigation for all large box trees.  - $1800<br>
8) Add - Move 120 1 gallon plants (holes were dug) - $960<br>
9) Add - Additional Gate pad - $950<br>
<br>
Total change order $14,618', NULL, '2020-11-09 12:32:58', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3405758, '<span style="font-size: 11.0pt"><span style="font-family: ">for plant/lighting design for back/front - multiple beds, multiple revisions. </span></span>', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3408543, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3408703, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3409928, NULL, NULL, '2020-11-09 13:48:59', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3410602, 'Over on design hours, billing for 4 additional hours @ $75/hour.

(*Provided 4 complementary additional hours as courtesy, this does not include drive time)

Thank you!<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">I am way over on design hours. Client doesn’t want to go to showrooms or pick materials based on what I send. I had Catalina Grana sent over, now I have pool tiles sent over, still no decisions,we’re still in limbo where the design is done, but now they want me to pick pool plaster, tiles. In the beginning, 2 hrs picking the color of their home for when they paint it.The design fee for this client should have been 2x. I’m now going to have to clock time w/ this client.</div></div>', '2021-12-11 01:29:00', '2020-12-03 09:44:54', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3410624, 'Install 3" SDR 35 drain ', NULL, '2020-11-09 22:15:12', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3412314, NULL, NULL, '2020-11-28 21:01:41', NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (3412426, NULL, NULL, '2021-03-26 12:08:42', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (3412428, NULL, NULL, '2021-03-26 12:08:10', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (3412692, 'Add 2 more steps before the circular paver area to lower the elevation with ease. Each step is 3'' (see attached)<br>
Step built priced at $60/lf<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Recommendation</div></div>', NULL, '2020-11-10 12:24:38', 1, '2020-11-10 11:43:25', 'Melinda Babaian', 'Melinda Babaian', 'sold'),
  (3412740, '26'' water line, 13'' gas line, 7'' electrical conduit and new LB on right side of the house next to porch (See attached)<br>
Change 6'' Electrical conduit and new LB on left side of the house (see attached, existing conduit in bad shape)<br>
5'' sleeve under pavers, so in the future ac can be moved to the other side of the yard at no charge. <br>
<br>
26lf water line x $22=$572 - $52 Discount = $520<br>
13lf gas line x $30= $455 - $65 Discount = $390<br>
13lf electrical x $22= $286 - $26 Discount = $260<br>
<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Recommendation</div></div>', NULL, '2020-11-10 15:52:21', 3, '2020-11-10 11:43:01', 'Melinda Babaian', 'Melinda Babaian', 'sold'),
  (3412753, '20 more linear feet of planter wall (see attached)<br>
Priced at $86/ lf <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Suggestion</div></div>', NULL, '2020-11-11 16:26:31', 1, '2020-11-10 11:45:45', 'Melinda Babaian', 'Melinda Babaian', 'sold'),
  (3412771, '$300 Remove existing chain link fence<br>
$1500 build and install 20 lf of new wooden fence with 3 posts and pressure treated wood. <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Recommendation</div></div>', NULL, '2020-11-11 16:25:00', 1, '2020-11-10 11:49:24', 'Melinda Babaian', 'Melinda Babaian', 'lost'),
  (3417340, NULL, NULL, '2020-11-11 17:01:24', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3418671, NULL, NULL, '2020-11-12 23:09:20', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3418720, NULL, NULL, '2020-11-12 23:09:44', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3418907, 'Additional pavers around the perimieter 35 SF + 16 sf = 51 SF X $12.00= $612.00<br>
Additional pavers in the planter area 2 X 18.5''= 37 SF X $12.00= $444.00<br>
Additional Step build 71 Linear feet needed, 36 Linear feet in contract,  = 35 LF additional X $60.00= $2,100.00<br>
$3,156.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3418998, NULL, NULL, '2020-11-12 23:10:07', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3419009, NULL, NULL, '2020-11-12 10:13:31', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3420774, NULL, NULL, '2020-11-28 16:04:57', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3420811, 'see attached plan', NULL, NULL, 1, '2020-11-12 23:59:50', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (3423045, 'We may only need 20LF - will determine on site when we demo', NULL, '2020-11-26 10:37:02', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3425075, '7 5g California fuschia<br>
6 5g Lantana 3<br>
5g fountain grass<br>
18 5gallons $783.00<br>
<br>
3 flats dwarf chopsticks<br>
3 flat $189.00<br>
<br>
4 1g blue fescue<br>
4 1gallons $86<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3425237, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3425266, 'Install <br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">(9) 5 gallon Cassa Blue Lily flax </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">(7) 5 gallon Canyon Prince.</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">(3) 24 inch blue podacarupus<br>
<br>
We will need to decision on replacement </span></span>', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3425275, '22 LF of fascia pavers (Catalina Grana)', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3425308, 'Move hose bib 3 LF over, no charge', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3425326, 'Removal of tree in bed along neighbors garage', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3425361, 'Not able to cut and remove high voltage lighting. ', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3425430, 'Install (2) 36 inch Crepe Myrtle. Need 5 or so crew.  <br>
Include shipping.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3425472, 'Install 24 inch peppermint', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3426844, 'additional water spigot in back yard for hose in north east corner', NULL, NULL, NULL, NULL, NULL, 'Mario Carrasto', 'pending'),
  (3426929, '22 linear feet x $28.00= $616.00', NULL, '2020-11-16 15:36:09', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3427094, NULL, NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3427122, 'Demolition of existing concrete counter top, forming, and new pour of concrete 3,000 PSI with additional rebar.  New fiber, if wanted. Not polished, sanded 2-4 coats of sealer <br>
Stucco patch included<br>
Forms need to be oiled right before the pour<br>
Elastic additive needs to be included, exact additive to be decided with lient tomorrow <br>
Expansion joints need a very thin profile tooling scribe, to look like the concrete cuts, very narrow<br>
<br>
 ', NULL, '2020-11-16 18:19:04', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3429000, 'Per text change approval on 11-11', NULL, '2020-11-30 16:25:02', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3431390, '2 flagstone not needed, credit given', NULL, '2020-11-18 07:46:23', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3433360, NULL, NULL, '2020-11-18 13:36:59', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3433424, 'Gravel: Palm Springs Gold', NULL, '2020-11-23 10:39:12', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3433781, '22 lf of sewer line connecting existing metal pipe to new sewer line 
', NULL, '2020-11-18 15:02:34', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3435529, 'Installation of new irrigation timer (**CLIENT to purchase timer)<br>
This is for running new wires and labor (time + material).<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Victor said should take about 3 hours so I priced out 3 x $65/hr.</div></div>', NULL, '2020-11-19 12:56:51', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3441941, '120 aditional sf of rtf sod. At $3.50 a sf', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3441951, '120 linear feet of drainage at $18.00 a linear foot. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3442446, NULL, NULL, '2020-11-23 11:18:56', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3443400, 'Not doing mastic. ', NULL, '2020-11-23 13:58:52', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3445684, 'Add clearstory openings to entry and gate.<br>
(No Glass)', NULL, '2020-11-30 16:25:32', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3450093, 'Plating only 2 15 gallon trees. 2x $75.00= $150.00
 2 24" box treed. 2x $180.00= $360.00
34 linear feet of bender board x $8.00 = $272.00
$477.00 total. ', NULL, '2020-11-26 08:11:46', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3450172, '50’ tree in the back $1425 
2 trees in the front $1100
All three together $2525', NULL, '2020-11-30 12:51:25', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3451540, 'Taking out the weed guard and fabric', NULL, '2020-11-30 12:52:21', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3451617, 'Additional Man hours to stack a wall, no mortar, with customer providing block garden wall, on existing wall j$414.00', NULL, '2020-11-30 12:53:06', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3453115, '8 yards of 50/50', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3453260, '1. Demo existing front tree and Dispose                                                                                                   $350<br>2. Parkway , sod cut and remove grass, disposes , excavate upt to 3 yards soil approx , 150sqft<br>    tunnel under sidewalk and install irrigation , install new Fescue grass                                                 $1562<br>3. Demo rear concrete pad ,up to 450sqft<br>4. install (6) boston ivy along rear wall                                                                                                      $132<br>5. Install 24" box tree in front $385<br>                                                                                                                                                       Total $2429', NULL, '2020-12-01 18:55:14', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3454038, NULL, NULL, '2021-03-26 12:09:09', NULL, NULL, NULL, 'Mohammed Rahman', 'lost'),
  (3455493, NULL, NULL, '2020-12-13 11:11:55', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3455507, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Owner prefers this to the shredded mulch</div></div>', NULL, '2020-12-03 21:48:32', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3455518, 'Nursery sent this tree with rest of the order, but it was canceled from order last week as owner picked up her own', NULL, '2020-12-03 21:47:46', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (3458327, NULL, NULL, '2020-12-01 15:34:21', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3458397, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3458428, 'Additional 18LF of bullnose paver in charcoal&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (3458440, 'Extension of each side of walkway to be 5'' total on each side from edging border<br>
Gray Charcoal Antique Cobbles 3 piece ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (3458805, 'Grey-Charcoal<br>
110sqft of 6x9 for soldier course <br>
840sqft for the interior <br>
 ', NULL, '2020-12-01 15:51:05', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3463409, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3463449, 'Credit for (1) 5g Avo tree, (2) 5g Ceanothus and (6) 1g Aqualegia <br>
Addition of (2) flats of Creeping Thyme', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3463941, 'We budgeted for 12 Lineal Feet and we need 32 Lineal Feet.

Honoring original price<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Brian approval. We messed up and didn’t catch that wire had to run BEFORE paver install. Melinda was out sick. No one caught this. We did discuss with client and Victor punching through home, client remembered this and reminded me.

They are happy though, just need to firm up our job walks and I need to firm up my addendums.</div></div>', NULL, '2020-12-03 12:54:11', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3465203, 'Previous change order had 149 lin feet of garden retaining wall. Installed only 104 with back patio benching.  ($3,400) credit due.<br>
<br>
Gate retaining walls to 24 inches with cap instead of 18 inches.   $1600.<br>
<br>
Total retaining wall credit. $1800', NULL, '2020-12-07 08:42:13', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3465235, '1) Remove driveway and set gate loops.   Reset pavers.  $1,900<br>
<br>
2) Install drainage for large specimen oak per requirements.  35 feet of trenching at 52 inches deep with drain line and drain socks.  Backfill and recompact.   $1,890<br>
<br>
3) Install new planting ordered.  New plant list is attached:  $9,485<br>
<br>
Total. $13,275<br>
<br>
<br>
 ', NULL, '2020-12-07 08:41:54', 1, '2020-12-03 14:49:52', 'Brian Godley', 'Brian Godley', 'sold'),
  (3465309, 'Install <br>
<br>
1) small retaining wall for front section of walkway where gravel meets decking. 2 foot by 8 foot 2 foot deep footings.   $720<br>
2) lower wall section retaining for soils to cover pipes.  4 1/2 ft down to 1 t in 15 section on south side.  $2,525<br>
3) 4 1/2 ft to 1 foot stepped on right 21 feet.  $3,265<br>
4) footings to be buried 2/12 to 3 foot deep 2 feet wise.  rebar reinforced.  Remove sand bags. <br>
5) Install french drains and footing exits. $500 <br>
5) Back fill sections with soils and base to raise grades for proper walkway and pipe coverages, compacted  $600<br>
6) Grout lift walls $300<br>
6) Install waterproofing for front planter walls,  back fill. $975', NULL, '2020-12-07 08:41:17', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3465331, 'Change mulch to "Forest Floor" at Foothill Soils per Jeff recommendation.   Price is $14 more per yard. <br>
<br>
Total of 65 yards.    $910', NULL, '2020-12-28 14:02:49', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3465576, 'Add (1) matching path light as requested.

Thank you Keith. Let me know if there is anything else! Nicole@picturebuild.com ', NULL, '2020-12-09 18:01:53', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3467769, NULL, NULL, '2020-12-06 10:30:26', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3467927, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3467932, 'From previous change order<br>
Planting only<br>
2 15 gallon trees. 2x $75.00= $150.00<br>
2 24" box treed. 2x $180.00= $360.00<br>
34 linear feet of bender board x $8.00 = $272.00<br>
<br>
Total = $782<br>
<br>
was billed 477.00<br>
<br>
Difference of $305.00', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3470464, 'Paint wall - 42 ft x 8.5 ft = 357ft in Swiss Coffee

We budgeted $300 in contract. This is the difference for paint,  power wash,  extra labor. ', NULL, '2020-12-10 16:03:03', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3470555, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3470583, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3470940, 'Add border to grass area up to 75ft , using cream brown charcoal rustic wall . Set on edge&nbsp;', NULL, '2020-12-07 12:08:43', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3470998, 'Demo existinhg patio and dispose<br>220sqft<br>Install new pavers', NULL, '2020-12-07 12:06:35', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3471143, NULL, NULL, '2020-12-07 12:08:00', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3472486, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3473965, 'Change out shut off valve', NULL, '2020-12-08 09:59:12', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3475322, 'Transplant move (18) 5 gallon plants per request @ $20 ea              $360<br>
Add <br>
    (13) 1 gallon plants @ $22ea                                                         $286<br>
    (19) 5 gallon plants @ $45ea                                                         $855<br>
    (3)   36" Box olives  @ $1375ea                                                     $4125<br>
    <br>
Demo street tree and Dispose                                                           $450<br>
<br>
Grade and prep parkway 200sqft                                                       $300<br>
install 1-zone irrigation at parkway                                                      $850<br>
install 200Sqft pebble at parkway at 3" thick                                      $425   (owner to select color)<br>
<br>
see revised planting plan  attached                                        Total   $7651<br>
<br>
      ', NULL, '2020-12-11 15:34:29', 1, '2020-12-08 14:11:54', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (3477251, NULL, NULL, '2020-12-09 09:03:46', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3477739, 'Had 29 (5gallons) in contract.
Only needed 22 (5gallons) according to new planting plan. 

Credit is for 7 (5gallons).', NULL, '2020-12-10 16:03:56', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3480928, '1) Extend outdoor Kitchen and Bartop to 11 feet one side and 9 foot 6.  Total now is 20'' 6 inches.  16 feet included in contract  $2600<br>
2) Wrap bar top around on east side $600<br>
3) Grade all soils in backyard down to level grade with pool and haul. $1900 (little less than quoted earlier)<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3482362, '5 bags of 1-2" Arroyo River Rock
Includes pick up and installation of rocks around basin. ', NULL, '2020-12-10 16:04:13', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3485694, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3486399, 'extend concrete curb 30ft&nbsp;', NULL, '2020-12-22 12:30:46', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3486722, '+150sqft of DG w/fabric for parkway (Texhoma) that is directly in front of entry gate', NULL, '2020-12-18 11:07:31', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3486730, '(4)Pathlights for around front entry and side garden entryway<br>
(1) Uplight for front tree<br>
(1) Transformer<br>
<br>
Light order<br>
(4) 9206 in pewter<br>
(1) 2205 in pewter', NULL, '2020-12-18 11:06:41', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3486732, 'Our irrigation specialist was on site yesterday (Thurs) and strongly recommends 9-10 zones rather than 6 zones as previously mentioned. We tried to cover the whole area with just 6 zones, but it''s not going to be enough pressure to cover all the planting areas. <br>
<br>
(5) Drip Zones<br>
(5) Netafim Zones<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">The difference in price is $50 as  owner had a $2500 credit from original contract (we revised original contract of $36,395 to $33,895 after contract was signed b/c we removed some citrus trees from the total cost and this would have been credited back at the end of the project if there were no change orders).  I''ve applied the $2500 towards the additional irrigation.</div></div>', NULL, '2020-12-18 10:17:17', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3486746, '400 +/- linear feet of bender board for DG pathways, garden beds<br>Bender Board (4" H x 3/4" W) = $6/lf<br> ', NULL, '2020-12-18 11:06:07', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3486747, NULL, NULL, '2020-12-18 11:07:57', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3486770, '(1) concrete step for front porch (lt broom finish) cantilevered 7'' wide', NULL, '2020-12-18 10:19:47', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3487465, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3491252, 'Replacing current galvanized pipe with pvc', NULL, '2020-12-15 18:21:52', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3491265, 'I did not estimate correctly for these rocks.  Cost did not cover the material that was ordered and installed. ', NULL, '2020-12-17 14:13:32', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3495188, NULL, NULL, '2020-12-16 12:06:42', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3495999, 'To prevent tripping hazard when stepping down onto concrete paver (to accomodate difference in inches from top of current patio to where the grade will be for paver)', NULL, '2020-12-16 14:59:32', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3496427, '1 yard of Del Rio 3/8" gravel. Spread in front planter to cover all exposed fabric. ', NULL, '2020-12-17 07:51:02', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3497064, 'Extra Grading in Front<br>
<br>
First day of grading with Bobcat $3000 - Paid by Picture Build as a gesture for mistake on driveway measure - $0.00<br>
Additional 5 days of demo, grading with Mini Skid Steer - Two guys. -$7000<br>
Additional 3 guys one day of berm compaction - $1500', NULL, '2020-12-28 14:02:36', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3497806, 'Provide (4) cbsq44 post anchors and install', NULL, '2020-12-17 10:19:31', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (3501801, 'Moving existing manifolds', NULL, '2020-12-19 13:47:49', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3502286, '40 linear feet ', NULL, '2020-12-19 13:48:44', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3502287, 'Moving 11 plants ', NULL, '2020-12-19 13:49:07', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3502288, NULL, NULL, '2020-12-19 13:48:13', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3502289, NULL, NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3502537, NULL, NULL, '2020-12-22 11:43:45', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3503728, 'Add 65 ln ft of electrical and added switch and outlet. ', NULL, '2020-12-21 08:23:25', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3504043, 'Extra demo going 7" below grade for driveway area. 
Adding road base to driveway area $450
', NULL, '2020-12-22 18:03:25', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3504092, 'Credit for 2 Agave attenuata ''Nova''<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">We are only planting 2 (5gallon) agaves</div></div>', NULL, '2020-12-22 09:51:12', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3504709, 'Add 280sqft pavers 
Sealer 
Includes demo

Use owner pavers from earlier job about 80sqft', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3504897, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3505056, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3505158, 'Adding 2 zones of spray  $1,800.00<br>
612 SF of RTF grass    $2,142.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3505190, '40 additional SF of sicde of the house<br>
37 additional SF in back patio<br>
17 additional SF on lawn side of patio<br>
94 SF total added in back X $11.00= <br>
$1,034.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3505202, 'Front yard pavers:<br>
17 LF on side of house<br>
2 feet by 20 feet to extend front yard patio = 40 <br>
Total 57 SF X $11.00= $627.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3505469, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3505471, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3506938, '154 SF X $12.00 = $1,848.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3506952, 'Shortened Gas Line by 28 LF X $35.00= Credit of $868.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3507374, 'Add two zones of irrigation.&nbsp; Run additional 300 linear feet of drip lines and emitters for added planting.&nbsp;', NULL, '2020-12-28 14:01:40', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3507387, '<br>
1) Add gravel and sq footage that is beyond the contracted amount already delivered.', NULL, '2022-02-01 13:05:49', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3507390, 'This is for the front grass installation that is not included in original contract.&nbsp;', NULL, '2020-12-28 13:58:46', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3507394, NULL, NULL, '2020-12-28 13:58:34', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3507400, '1) Added roughly 30 timber steps, wall for rear seating area.  - $1500<br>
<br>
2) Added timber for step retaining.  $ 200', NULL, '2020-12-28 13:58:09', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3507406, 'Add in 195 yards of mulch.  Hillsides will have to be blown in with equipment. <br>
<br>
Upgrade all to forest floor. ', NULL, '2021-01-27 17:25:04', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3507408, 'Add 50 stakes and 8 guide wire installations.&nbsp; 2 guys one day plus material.&nbsp;', NULL, '2020-12-28 13:56:30', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3507418, NULL, NULL, '2020-12-28 13:55:58', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3507500, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3507519, 'Remove wood from driveway gate and driveway side of entry wall.<br>
Install new wood on driveway gate to widen gate to fit over curve at entry wall and extend towards neighbor side. <br>
<br>
Remove boxed out section on Entry wall and install new wood. <br>
<br>
Includes $1000 credit for no longer welding extension for roof for box out section. ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3507637, NULL, NULL, '2020-12-22 11:29:54', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3508800, 'Credit of one zone $900.00. Using 3 existing valves. $175.00 x 3= $525.00 total credit $1,425.00', NULL, '2020-12-23 13:40:14', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3508905, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3510622, '48" Olive Tree $3000.00<br>
(2) 36" Crepe Myrtle Tuscarora $5400.00<br>
(1) 24" Waxed Leaf Privet $1500.00<br>
<br>
Includes Tax, Delivery and Installation', NULL, '2020-12-30 13:22:04', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3510677, '(1) 36" Olive<br>
(2) 36" Crepe Myrtle Tuscarora<br>
(2) 15 gallon Waxed Leaf Privet ', NULL, '2020-12-30 13:21:11', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3511270, NULL, NULL, '2020-12-29 18:57:05', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3511273, NULL, NULL, '2021-03-16 16:55:05', NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (3511277, 'upgrade from pressure treated  to Rustic wall <br>
<br>
boxes approx 5x10 , inner dimension approx 4x8<br>
install 3 courses approx 12" in height<br>
<br>
thinset each course in place, set over 4" bagged concrete base to secure', NULL, '2020-12-29 18:57:45', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3511422, NULL, NULL, '2020-12-24 17:16:07', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3511423, 'install electrical<br>
 ', NULL, '2020-12-30 14:47:10', NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (3514266, 'Purchase Podocarpus from Green Thumb nursery.&nbsp; $500 added to cost from this source.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3514722, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3514739, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3515195, 'Please see attached document&nbsp; New drawing of walls will be in current design under Wall Design', NULL, NULL, 1, '2020-12-29 11:50:31', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (3515228, 'Taking out 2 path lights', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3515790, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3515855, '<br>
ADD  -<br>
 lawn 275sqft                                                             $1039<br>
Bender Board for lawn and DG Area 120ft               $720<br>
1-Zone Rain Bird pop-ups for additional lawn          $850<br>
Decomposed Granite 550sqft                                  $2965<br>
                                                                         Total $5574<br>
Remove  - Pavers from Contract -                          -$8316<br>
<br>
                                                                            Credit -$2742<br>
<br>
                                                                                <br>
<br>
 ', NULL, '2021-03-11 06:53:38', NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (3515867, 'add 462sqft additional lawn to front yard             $1732<br>
1-zone rainbird pop-ups                                       $850<br>
tunnel under driveway to install irrigation              $480<br>
additional cleanup                                                $474<br>
<br>
Total Additional cost                                            $3536', NULL, '2021-04-24 22:24:03', NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (3517353, 'Adding 35 LF of main pvc line to new manifold area located in back side yard.

We originally budgeted for 17 LF but after reviewing,  we decided an additional 35 LF was needed to go from front of home to back.

Nacho will add a T and cap it for phase 2 (*front yard irrigation and valves)', NULL, '2021-01-04 10:41:04', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3517359, 'We are not repairing concrete slab, this will be done in another phase.  ', NULL, '2021-01-04 10:41:17', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3517391, 'Not removing little tree', NULL, '2021-01-04 10:40:48', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3517867, 'Concrete and forming credit + $430
Extra 48 SF of Valley RTF Sod - $180 (complementary)<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Total sod: 1,130 SF (12/30/2020)</div></div>', NULL, '2021-01-04 10:40:09', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3518387, NULL, NULL, '2020-12-31 08:28:43', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3518643, '50/more sf pavers in front. ', NULL, '2020-12-31 10:47:00', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3521263, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3523249, NULL, NULL, '2021-01-05 10:17:58', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3523350, NULL, NULL, '2021-01-05 10:16:08', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3524137, 'after tally of planting to be installed per finalized design vs budget, a credit is issued of $43', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3528572, '$2500 Allowance  - not to exceed without further approval<br>
Handle permits for owner at the Rate of $120hr + permits fees and costs, <br>
includes Drawing plans, Permit running, etc<br>
<br>
Additional work or installation  to be performed to pass inspection additional at owners expense<br>
<br>
Declined =  Owner to submit and handle all permits and costs<br>
Approved  = Picture Build to handle all fees and permitting submittal and meeting with inspector<br>
 ', NULL, '2021-02-03 09:19:38', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (3530896, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3531490, 'Driveway: <br>
    1. Demo Existing Driveway, excavate for paver work and Dispose<br>
    2. install 4" compacted base<br>
    3. 1" Screed sand<br>
    4. install 2000sqft pavers , 32ft bullnose and joint sand<br>
    5. install water based natural look sealer after completion <br>
            Price $25,460<br>
<br>
Drains 120ft  - Price $2640<br>
<br>
package price $27,800', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (3531740, 'Emitters attached to every temporary pot, tapping into existing drips <br>
 ', NULL, '2021-01-14 07:48:41', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3531843, NULL, NULL, '2021-02-03 09:20:12', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (3531920, 'Taking out the Fuerte 15 gal. And one hot poker 1gal. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3533741, '52 more sf of rtf for planter area ', NULL, '2021-01-09 05:38:53', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3534472, NULL, NULL, '2021-01-08 14:57:20', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3534479, NULL, NULL, '2021-01-08 14:56:39', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3537232, 'If French Drain does need to be moved after pool demo, we will add this back as a change order', NULL, '2021-01-14 07:47:58', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3539955, 'Pilaster stucco and Bella Crete cap height flat cap to have light. Light and wiring by others. 16" x16" ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3541360, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3541965, '20 additional LF X $35.00= $700.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3541973, '97 LF X $18.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3541981, '$20.00 X 85 LF', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3541991, '98 LF X $18.00 a LF= $1,764.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3542008, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3543542, NULL, NULL, '2021-01-13 10:08:59', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3544261, 'Raised sod area to level (not a slope as in design). 

6 cubic yards 50/50 soil.
Additional 16” steel and rebar (along olive trees) to allow sod to be raised to level. Additional welding and labor. ($100 discount)<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">This brings us exact to budget for steel edging and little retaining wall. (I think)</div></div>', NULL, '2021-01-14 14:19:30', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3544802, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (3545441, '8 cubic yards of 50/50 backfill

(Will credit if we do not use all)', NULL, '2021-01-14 14:19:50', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (3545590, '3 linear feet not installed $55.80 / lnft<br>
<br>
 ', NULL, '2021-01-13 17:17:04', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3545595, '4 linear feet of wall and rised height', NULL, '2021-01-25 16:16:26', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3545609, '69 Sf of pavers in final count', NULL, '2021-01-25 16:15:38', 1, '2021-01-20 13:55:01', 'Mohammed Rahman', 'Verva Gerse', 'sold'),
  (3549159, '2.5 feet x 5 feet. 12.5 feet x $12.00. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3549160, '16 linear feet ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3554611, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3558312, NULL, NULL, '2021-01-19 10:35:11', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3558327, NULL, NULL, '2021-01-19 10:34:32', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3559848, 'Mulch front yard. Natural brown Double Shredded.<br>
<br>
950 sq feet at $1.00 per foot. ', NULL, '2021-01-20 11:18:06', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3563869, NULL, NULL, '2021-01-20 17:28:23', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3563873, '60 linea feet to separate gravel from sod', NULL, '2021-01-20 17:34:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3563879, 'No longer a need for the step/landing off guest house, there will only be a 2-3" step down from threshold to flagstone', NULL, '2021-01-20 17:28:01', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3563880, NULL, NULL, '2021-01-20 17:27:22', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3563948, 'No electrial being installed', NULL, '2021-01-20 18:20:57', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3563950, 'Will need an additional 100sqft for patio area', NULL, '2021-01-20 18:23:18', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3563957, 'Not installing at this time', NULL, '2021-01-20 18:22:58', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3567111, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">1/4-3/8 black polish pebbles nstone99 from prime</div></div>', NULL, '2021-01-21 15:50:45', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3567362, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3567363, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3569675, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3570209, 'Includes 80 linear feet of wire, 3/4 inch conduit with (3) 12 gauge wiring $1600.00<br>
Plus wiring for electrical panel $400.00', NULL, '2021-01-25 12:00:41', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3570620, '24 additional sf for back yard planter. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3576166, NULL, NULL, '2021-01-26 09:17:25', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3580168, '1) Ordered 10 yards of California Gold beyond contract which equals roughly 1350 added sq feet of ground covering. <br>
Total add $4,860<br>
2) Saw cut driveway entry aprons  demo, form, rebar and pour.  Remove house entry paver, form, rebar and pour <br>
Total add $4800<br>
3) Added retaining wall work to provide best possible footings.  <br>
Original change order: south side wall - 4 1/2 to 1 foot down.  Actual install was 6 feet to 2 foot down <br>
Original change order:  east side wall - 4 1/2 feet to 1 foot down. Actual install was  6 feet to 2 feet down<br>
Added additional 8 linear feet of retaining wall for upper walkways per request.  No charge for later reworking angle per additional client request.<br>
Total add $3600<br>
4) Add more landscape timber step retaining for rear seat wall areas per designed layout and gate entry<br>
Original change order: 30 linear feet .  Actual installation 53 linear feet    No charge for rework design per client additional client request.<br>
Total add $1150<br>
<br>
<br>
 ', NULL, '2021-01-27 17:24:08', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3580434, 'This is for the back and side projects as bid earlier.  <br>
This does not cover other items that were excluded in previous bids like the northwest transition <br>
<br>
Pricing and scope exactly as per earlier bids with no additional items added.<br>
<br>
Please see the attached change order addendum for a breakdown.<br>
<br>
Payments will be scheduled according to progress sections and will be entered into the invoicing section of Builder Trend. ', NULL, '2021-02-20 16:11:12', 1, '2021-01-27 10:24:44', 'Brian Godley', 'Brian Godley', 'sold'),
  (3582634, 'I found a mulch blowing service that works with my mulch supplier that was much cheaper.&nbsp; Passing the savings on.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3582655, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><u>15 Gallon Fruit Trees 1 each @ $200 each x 10 = $2,000</u></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">1) Navel Orange (seedless preferred)</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">2) Valencia Orange (seedless preferred)</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">3) Meyer Lemon</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">4) Keffir Lime</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">5) Pomegranate</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">6) Thai White Guava</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">7) Indian White Guava</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">8) Tangerine (seedless preferred)</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">9) Tangerine (seedless preferred)</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">10) Tangerine (seedless preferred)</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Approved items: 5 gallon plants - $45 each x 67 = $3015</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Please note - The Green Mountain Boxwood we put the corkscrew shape and I previously provided links for several items on the list. Let me know if you have any questions.</span></span><br>
 
<table style="width: 809px; border-collapse: collapse" width="809">
	<tbody>
		<tr>
			<td nowrap="nowrap" style="border-bottom: 1px solid black; width: 87px; padding: .100px .100px 0in .100px; height: 23px; border-top: none; border-right: none; border-left: none" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">4</span></span></span></span></td>
			<td nowrap="nowrap" style="border-bottom: 1px solid black; width: 723px; padding: .100px .100px 0in .100px; height: 23px; border-top: none; border-right: 1px solid black; border-left: none" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">Green Mountain Boxwood (Corkscrew shaped tree)</span></span></span></span></td>
		</tr>
		<tr>
			<td nowrap="nowrap" style="padding: .100px .100px 0in .100px; height: 21px" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">3</span></span></span></span></td>
			<td nowrap="nowrap" style="border-bottom: none; padding: .100px .100px 0in .100px; height: 21px; border-top: none; border-right: 1px solid black; border-left: none" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">Avalanche Feather Reed Grass</span></span></span></span></td>
		</tr>
		<tr>
			<td nowrap="nowrap" style="padding: .100px .100px 0in .100px; height: 21px" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">3</span></span></span></span></td>
			<td nowrap="nowrap" style="border-bottom: none; padding: .100px .100px 0in .100px; height: 21px; border-top: none; border-right: 1px solid black; border-left: none" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">Dasylirion Wheeleri </span></span></span></span></td>
		</tr>
		<tr>
			<td nowrap="nowrap" style="padding: .100px .100px 0in .100px; height: 21px" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">3</span></span></span></span></td>
			<td nowrap="nowrap" style="border-bottom: none; padding: .100px .100px 0in .100px; height: 21px; border-top: none; border-right: 1px solid black; border-left: none" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">Cordyline Pink Passion </span></span></span></span></td>
		</tr>
		<tr>
			<td nowrap="nowrap" style="padding: .100px .100px 0in .100px; height: 21px" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">4</span></span></span></span></td>
			<td nowrap="nowrap" style="border-bottom: none; padding: .100px .100px 0in .100px; height: 21px; border-top: none; border-right: 1px solid black; border-left: none" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">Purple Fountain Grass</span></span></span></span></td>
		</tr>
		<tr>
			<td nowrap="nowrap" style="padding: .100px .100px 0in .100px; height: 21px" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">4</span></span></span></span></td>
			<td nowrap="nowrap" style="border-bottom: none; padding: .100px .100px 0in .100px; height: 21px; border-top: none; border-right: 1px solid black; border-left: none" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">Helictrotrichon Sempervirens (Blue Oat Grass)</span></span></span></span></td>
		</tr>
		<tr>
			<td nowrap="nowrap" style="padding: .100px .100px 0in .100px; height: 21px" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">2</span></span></span></span></td>
			<td nowrap="nowrap" style="border-bottom: none; padding: .100px .100px 0in .100px; height: 21px; border-top: none; border-right: 1px solid black; border-left: none" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">Green Mountain Boxwood (Corkscrew shaped tree)</span></span></span></span></td>
		</tr>
		<tr>
			<td nowrap="nowrap" style="border-bottom: 1px solid black; padding: .100px .100px 0in .100px; height: 23px; border-top: none; border-right: none; border-left: none" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">3</span></span></span></span></td>
			<td nowrap="nowrap" style="border-bottom: 1px solid black; padding: .100px .100px 0in .100px; height: 23px; border-top: none; border-right: 1px solid black; border-left: none" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">Chondropetalum tectorum </span></span></span></span></td>
		</tr>
		<tr>
			<td nowrap="nowrap" style="border-bottom: 1px solid black; padding: .100px .100px 0in .100px; height: 23px; border-top: none; border-right: none; border-left: none" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">15</span></span></span></span></td>
			<td nowrap="nowrap" style="border-bottom: 1px solid black; padding: .100px .100px 0in .100px; height: 23px; border-top: none; border-right: 1px solid black; border-left: none" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">New Zealand Flax (Pink Stripe, Purple, Green)</span></span></span></span></td>
		</tr>
		<tr>
			<td nowrap="nowrap" style="padding: .100px .100px 0in .100px; height: 23px" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">8</span></span></span></span></td>
			<td nowrap="nowrap" style="border-bottom: none; padding: .100px .100px 0in .100px; height: 23px; border-top: none; border-right: 1px solid black; border-left: none" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">Margaret Merril Roses</span></span></span></span></td>
		</tr>
		<tr>
			<td nowrap="nowrap" style="border-bottom: none; padding: .100px .100px 0in .100px; height: 21px; border-top: 1px solid black; border-right: none; border-left: none" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">3</span></span></span></span></td>
			<td nowrap="nowrap" style="border-bottom: none; padding: .100px .100px 0in .100px; height: 21px; border-top: 1px solid black; border-right: 1px solid black; border-left: none" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">Purple Fountain Grass</span></span></span></span></td>
		</tr>
		<tr>
			<td nowrap="nowrap" style="padding: .100px .100px 0in .100px; height: 23px" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">3</span></span></span></span></td>
			<td nowrap="nowrap" style="border-bottom: none; padding: .100px .100px 0in .100px; height: 23px; border-top: none; border-right: 1px solid black; border-left: none" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">Helictrotrichon Sempervirens (Blue Oat Grass)</span></span></span></span></td>
		</tr>
		<tr>
			<td nowrap="nowrap" style="border-bottom: none; padding: .100px .100px 0in .100px; height: 21px; border-top: 1px solid black; border-right: none; border-left: none" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">2</span></span></span></span></td>
			<td nowrap="nowrap" style="border-bottom: none; padding: .100px .100px 0in .100px; height: 21px; border-top: 1px solid black; border-right: 1px solid black; border-left: none" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">Purple Fountain Grass</span></span></span></span></td>
		</tr>
		<tr>
			<td nowrap="nowrap" style="padding: .100px .100px 0in .100px; height: 21px" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">2</span></span></span></span></td>
			<td nowrap="nowrap" style="border-bottom: none; padding: .100px .100px 0in .100px; height: 21px; border-top: none; border-right: 1px solid black; border-left: none" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">Helictrotrichon Sempervirens</span></span></span></span></td>
		</tr>
		<tr>
			<td nowrap="nowrap" style="border-bottom: 1px solid black; padding: .100px .100px 0in .100px; height: 23px; border-top: none; border-right: none; border-left: none" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">8</span></span></span></span></td>
			<td nowrap="nowrap" style="border-bottom: 1px solid black; padding: .100px .100px 0in .100px; height: 23px; border-top: none; border-right: 1px solid black; border-left: none" valign="bottom"><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: black">Carpet Roses</span></span></span></span></td>
		</tr>
	</tbody>
</table>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Owner Provided Plants planted at $20 each x 19 = $380 no warranty</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Total Approved is $2000+$3015+$380 = <b>$5395</b></span></span><br>
owner to be available on plant day to place each plant - office and project manager coordinate<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3584144, 'excavating up to 24: down connect to existing drainage, wat3er proof back of gunite around pool with 2 coats henry''s Tar, set perforated pipe in sock sleeve, back fill with gravel.  Set RTF over gravel to patch', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3585874, 'Topcast #1/Sand Finish for 1100 sqft of concrete (d/way+garage)', NULL, '2021-01-29 09:00:34', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3585878, 'Demo 20.5sqft of existing brick pathway<br>
Install additional 12sqft of reclaimed bricks to join up to concrete', NULL, '2021-01-29 09:02:42', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3585888, 'Demo existing steps<br>
Rebuild steps in poured concrete with brick veneer face and overlay<br>
Steps will be 18''-8" long x 48"H from threshold, with (2) separate landings at 8''6" x 4'' + 6 x 4'' with (3) steps down each with 17.5" treads and 6" risers (see sketch)', NULL, '2021-01-29 10:06:29', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3587270, NULL, NULL, '2021-01-29 10:06:44', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3588781, 'Cost for permits and expediting fees.', NULL, '2021-02-03 16:09:46', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3590960, 'Upgrade to bullnose steps 5.5 LF x 2 steps', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3590998, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3592143, '(4) metal stakes             $380<br>
100ft Metal Edging         $1200<br>
3 yards Del Rio               $900<br>
1/2 yard  DG                   $265', NULL, '2021-02-01 17:11:06', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3593116, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3593125, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3593130, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3594397, 'Drain grate 14 LF, 
labor for drain, 
coring of curb at driveway
2 extra LF of SDR pipe.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Extra $100 added for turf upgrade (found out price and process after I had already given turf change order so added it here)</div></div>', NULL, '2021-02-02 08:08:40', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3595037, 'Install roughly 460sqft of 3/4 Del Rio gravel for remainder of front yard at 3" deep', NULL, '2021-02-02 10:25:12', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3595039, 'Install roughly 460sqft of mesh under gravel/cost tbd', NULL, '2021-02-02 10:27:48', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3596596, '30 additional pavers at BBQ area<br>
74 more SF in front of the gates<br>
104 more total<br>
$1,367.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3596609, 'one uplight and 2 path lights', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3596629, 'adding 1 24" box  $360.00<br>
taking out 1 15 gallon --$175.00<br>
adding 6 5 gallon @ $43.00=  $258.00<br>
adding 12 1 gallon @ $21.00= $252.00<br>
Total $695.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3596968, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Approved via text</div></div>', NULL, NULL, 1, '2021-02-04 15:39:26', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (3599321, '58 lf of bender board. 28 lf of 6"30 lf of 4"', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3599408, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3600257, 'Taking out 1 15 gallon plant', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3602170, 'Original Contract Budget $7573<br>
owner request upgrade to (7) shrubs from 15 to 24" box<br>
additional cost to budget $1457', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (3602587, 'original allowance $3700<br>
owner upgraded (2) trees to 24" box<br>
additional allowance needed $203<br>
total plant budget $3903', NULL, '2021-02-08 07:52:16', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3602793, '(1) more step will be added at 6 linear feet&nbsp;', NULL, '2021-02-08 16:51:20', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3602916, '(3) 5 gallon Dwarf Horsetail&nbsp; - Equisetum scirpoides&nbsp;planted in the front fountain', NULL, '2021-02-04 23:26:53', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3602978, 'change Decomposed granite around garden area to Del-rio gravel , no additional or change in price', NULL, '2021-02-04 12:25:18', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3602991, 'install (2) owner provided light posts, <br>
includes excavation and installation with up to 4 bags concrete<br>
<br>
$325', NULL, '2021-02-08 14:08:47', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3604204, 'needed one more for a total count of 12 lights', NULL, '2021-02-15 14:27:14', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3604221, 'There is one 15 gallon in the contract, they want 2 more&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3607243, NULL, NULL, '2021-02-08 01:12:49', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3607244, NULL, NULL, '2021-02-08 01:10:19', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (3607245, NULL, NULL, '2021-02-08 01:09:17', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3611361, 'Must be installed at the same time as yard checks or while completing punch list.', NULL, '2021-02-24 09:16:32', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3612427, 'Credit for vinyl tree ring. $35.00<br>crefit for vinyl bender board replacing metal edging. $4.00 x 86 =$344.00<br>total credit $379.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3612737, NULL, NULL, '2021-02-12 09:29:34', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3614092, 'Connection from water supply to  fountain
', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3614677, '1) Install gopher mesh for lawn section  $2,850<br>
2) Regrade south section of yard near driveway. Compact in lifts $3,400 <br>
3) Waterproof, add drainage and backfill retaining wall $1,200<br>
<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3614787, 'Handle back section of soils issue on property Includes:<br>
<br>
Install 92 ln feet of 3 foot deep concrete berm w/key.  (best guess as to depth of hard soils section could be lower or higher.  Will adjust up or down accordingly. About 27 yards of concrete poured and roughly 20 yards of soils removal. 10 yards to remain on site and be compacted in lifts on hillside. Includes regrading existing erosion damage and recompacting existing soils section as best as possible on outer section of fence line. Cannot guarantee soils movement in those sections without pulling entire previous soils fill and replacing and compacting in lifts.<br>
<br>
Moving existing plants and irrigation and replant when done in sections in front of a behind rear fence line<br>
<br>
Installing 92 ln feet of concrete culvert<br>
<br>
Install 2 concrete catch basins (grates additional)<br>
<br>
Installing 136 linear feet of 8 inch pipe to connect to basin and run under timer wall and gravel path to lower valley', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3616397, NULL, NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3620913, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3621492, NULL, NULL, '2021-02-12 09:28:35', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3622496, '59 Linear Feet credit, $1,888.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3623683, '20 5gals not installed     ($900)<br>
2 5gals left on site           $40<br>
<br>
Total credit $860', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3624116, NULL, NULL, '2021-02-12 10:59:08', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3624122, 'Will try and also haul out existing mound of dirt beneath wall if there''s room in dumpster', NULL, '2021-02-12 10:59:36', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3624716, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3625196, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3627190, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3628828, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3630329, 'Extra gravel for side planter', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3631319, NULL, NULL, '2021-02-16 14:25:47', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3631362, NULL, NULL, '2021-02-16 14:27:10', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3632266, '1) Install 63 linear feet of Modular wall with cap on side of driveway. $5,040<br>
2) Install additional 11 feet of timber wall next to transitions steps from grass area to path down for  lower parking. $770', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3632383, NULL, NULL, '2021-02-17 11:39:00', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3632419, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Customer approved by text</div></div>', NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3632443, 'Entered an charge instead of a credit', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3632446, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3633529, NULL, NULL, '2021-02-17 16:18:22', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3635359, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3635364, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3635900, 'Pavers are already at job site for the steps. This is for area on right of driveway. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3635904, 'Additional wall on right of driveway. 34 linear feet. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3637520, '<table style="border-collapse: collapse; width: 260px" width="260">
	<colgroup>
		<col span="3" style="width: 48pt" width="64">
		<col style="width: 51pt" width="68">
	</colgroup>
	<tbody>
		<tr>
			<td style="border-bottom: none; height: 20px; width: 64px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">size</span></span></span></span></span></span></td>
			<td style="border-bottom: none; width: 64px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">qty</span></span></span></span></span></span></td>
			<td style="border-bottom: none; width: 64px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">amount</span></span></span></span></span></span></td>
			<td style="border-bottom: none; width: 68px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">total</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: none; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">15gal</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">-2</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">150</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">-300</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: none; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">5gal</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">-1</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">41</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">-41</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: none; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">1gal</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">-15</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">20</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">-300</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: none; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
		</tr>
		<tr>
			<td style="border-bottom: none; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> $ (641.00)</span></span></span></span></span></span></td>
		</tr>
	</tbody>
</table>
', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3638300, 'Adding 300sqft of DG to garden bed against house', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3639088, 'Adding one Anti-siphon drip control zone for bed against front of house', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3640352, 'Add 35 linear feet of additional retaining wall.<br>
Add 24 addtional feet of steps<br>
Rerun grey water drainage line<br>
<br>
Total Cost about $12,000.   $3,000 discount given.', NULL, '2021-02-21 05:20:00', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3641413, NULL, NULL, '2021-02-19 14:12:40', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3642056, 'Hi All,<br>
Just confirming:<br>
4  #9  Hesperaloe   5 gallon   X $43.00 =  $172.00<br>
3  #16  Agave Deserti  5 gallon  X $43.00 = $129.00<br>
2  # 17  Agave Desmentiana  5 gallon X $43.00 = $86.00<br>
2  # 18 Red Hot Poker   5 gallon  X $43.00 = $86.00<br>
Total:  $473.00<br>
Confirming your approval', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3643681, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3644353, 'Take out large agaves in the back side', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3644383, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="color: black">2C: A copper wire was inserted into a hole in the stucco to keep a screw in place, instead of using a proper anchor. See the attached picture (copper_wire.JPG). An anchor should have been used to properly secure the PVC pipe to the structure. We already fixed this issue ourselves. </span><span style="color: red">Ok fine.  This is a temporary hold when they don’t. have anchors and we usually go back and anchor later.  If this has been done by you then fine.  Credit $30</span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="color: black">2D: The GFCI outlet underneath the electrical panel was not installed correctly. The reset button was not working properly. See the attached picture (gfci_outlet.JPG). It turns out that it was not working because the load wire was plugged to the line and the line wire to the load. We have expensive appliances connected to this main outlet which can cause damage to our expensive USA-made appliances. We already corrected this issue ourselves as well. We would need to be credited for this correction.  </span><span style="color: red">Ok, fine. This is a quick fix 5 mins.  We will credit $60.</span></span></span>', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3644760, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3647183, '<span style="font-size: 11.0pt"><span style="font-family: "><span style="color: black">at $60/LF minus the 7% (so it should be $55.80/LF). The invoice amount should be $669.60 instead of $720. </span></span></span>', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3647793, 'Additional lf of French drain and waterproofing. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3648849, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3649091, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">turn over rocks as you spray the water based sealer..allow to dry</div></div>', NULL, '2021-02-23 18:33:07', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3649124, 'pink lasy goes between deck and lawn ..the curvy area  <br>
2 yards needed here ', NULL, '2021-02-25 16:55:51', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3649135, '1 yard ''Honey gold"  upgrade<br>
must be ordred, may be delay', NULL, '2021-02-25 17:16:24', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3651146, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3656341, NULL, NULL, '2021-02-26 08:42:36', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3656354, '1000sqft 4mil plastic installed with staples before compacted base installed', NULL, '2021-02-26 08:46:19', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3657428, NULL, NULL, '2021-02-26 09:01:43', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3657429, NULL, NULL, '2021-02-26 09:02:17', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3657430, NULL, NULL, '2021-02-26 09:02:30', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3659424, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3660173, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3660331, '70 additional sf mulch. ', NULL, '2021-03-03 13:01:26', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3660772, 'Able to use 2 existing lines of irrigation. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3660774, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3660776, 'Because of the amount of outlets Victor needed to install 1 600 watt transformer instead of 2 200 watt. Price difference with labor and materials $100.00 ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3660778, 'Additional 120 sf of turf in back and on side  to complete design of areas adjacent to planters. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3662837, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3662971, '1.  Changing Strawberry tree from 24" to 36" box  $760.00- $360.00= + $360.00<br>
2.  Changing Poplar tree from 24" to 36" box  box $760.00 - $360.00= + $360.00<br>
3.  Changing Necturne from 15 gal to 24" box $360.00 - $175.00= + $185.00<br>
4.  Changing Tangerine from 15 gal to 24" box $360.00- $175.00= + $185.00<br>
Total: + $1,090.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3664919, '<span style="font-size: 11.0pt; line-height: 107%; font-family: ">#1217 in black in low volt (pls note mounting hardware and lamp not included with fixture)</span>', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3664924, 'Below are credits<br />
0004 Demolition Landscape (-deposit)     $500<br />
0006 6 Pilasters                                        $600<br />
0008 Irrigation Front                                 $1485<br />
0009 Lights Front                                      $2425<br />
0010 Planting Front                                   $4000<br />
0011 Lawn                                                 $3325<br />
0017 Irrigation Back                                  $1080<br />
0019 Lighting Back                                    $5125<br />
0021 Planting Back                                   $7359<br />
<br />
<br />
Below is a charge against the credit invoice<br />
0023 7% Courtesy                                    $1813.02<br />
<br />
 ', NULL, '2025-05-30 11:12:16', NULL, NULL, NULL, 'Mohammed Rahman', 'pending'),
  (3664981, '(2) rolls = $380<br>
labor= $380', NULL, '2021-05-03 15:18:48', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3667994, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3668806, '2,well lights vista pro 5271 arch bronze 5.5 watts ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3668873, 'Parthenocissus tricuspidata&nbsp;installed at fence line&nbsp;between pads as shown on plan', NULL, '2021-03-30 09:56:13', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3672106, 'Owner approved already', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3672163, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3672278, NULL, NULL, '2021-03-03 19:27:35', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3672430, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3679056, 'Remove existing mastic joint. <br>
Apply new mastic joint (color to be confirmed with client.)<br>
Add sand on top to archive more uniform look. (It won''t look like plastic but more like concrete finish.)', NULL, '2021-03-09 07:27:11', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3679622, 'Trimming grooming ficus and staking. 2 crew one day. Haul away', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3681832, NULL, NULL, '2021-03-09 00:00:56', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3681845, NULL, NULL, '2021-03-15 03:19:08', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3682833, '(85) 1 gallon Boulder Blue Fescue - (40) for back border behind pool, (35) for in front of fence frontyard, (10 )for bed against back of house<br>
(3) 5 gallon Ceanothus thrysiflorus var. repens<br>
(7) 1 gallon creeping Rosemary<br>
(6) 1 gallon Blechnum spicant (hard fern)<br>
(3) 15 gallon Bougainvillea vine in magenta', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3683519, '1300sqft<br>
<br>
price to be added', NULL, '2021-03-11 07:22:20', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3683640, 'Install addtional layer of timber to raise grade to get above exposed sewer line.  $800<br>
<br>
<br>
Utility Work: $3800<br>
<br>
Dig trenches.  Replace soils and recompact. Replace brick for side patio section. <br>
<br>
Utility runs: <br>
<br>
1- 30 LF. ELECTRICAL FOR BBQ 110 volt. Terminate in outdoor junction box. One outlet with Standard 12 gauge wiring per code.<br>
<br>
2- 40 LF. ELECTRICAL FOR SPA  220 volt.  Use heavy 6 gauge wire per code. <br>
<br>
3- Install 1 outdoor disconnect service for spa per code. (installation will be 4 feet from spa per code)<br>
<br>
3- 50 LF. GAS LINE FOR BBQ', NULL, '2021-03-08 18:18:30', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3683733, '15 path lights - Vista LED 6540<br>
<img alt="6540" src="https://www.vistapro.com/files/pictures/6540-lr.jpg"><br>
2 up lights  - Vista LED 5006<br>
<img alt="5006" src="https://www.vistapro.com/files/pictures/5006-Z.jpg"><br>
<br>
8 step lights. Vista 4246 with optional LED set up <br>
<img alt="4242" src="https://www.vistapro.com/files/pictures/4242.jpg"><br>
1 300 watt transformer<br>
<img alt="CTS Series" src="https://www.vistapro.com/files/pictures/CTS-1200.jpg"><br>
1 timer dial<br>
roughly 250 linear feet of outdoor lighting cable<br>
Staple cable<br>
<br>
(Can remove any number if price is too high.)', NULL, '2021-03-09 16:16:12', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3686355, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3686677, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3686692, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3687928, 'Needed to additional demo due to existing pool shell issues.', NULL, '2021-04-01 17:34:35', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3688013, NULL, NULL, '2021-03-11 07:21:36', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3688774, NULL, NULL, '2021-03-10 08:16:45', NULL, NULL, NULL, 'Verva Gerse', 'lost'),
  (3692016, 'Already have 15 gallon in yard. Already took 5gallon lemon. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3693406, 'Adding paver border to back concrete patio, extending from corner of old patio to corner of new patio for far end<br>
Running border corner to to corner for new patio for end closer to house<br>
Saw cut existing concrete that leads to side walkway so new concrete will join seamlessly <br>
Cut landscape tie on side near Cypress to allow for drainage and add weep holes to existing ties<br>
<br>
 ', NULL, '2021-03-12 10:12:49', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3693524, 'add 24 linear feet of electrical sleeve for future lighting', NULL, '2021-03-11 10:27:21', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (3693594, '19 Linear feet x 32"H of retaining wall to be added to support wall on property line<br>
We will grout all cels of original wall to reinforce it<br>
 ', NULL, '2021-03-12 10:13:25', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3693687, 'Adding (1) more course to the top of wall&nbsp;', NULL, '2021-03-12 10:13:49', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3693901, 'Simon providing lights and plants:<br>
Please see daily log:<br>
replace 15 @ 5 gallon  installation only 15 @ $21.00= $315.00<br>
Install 11 new lights installation only @ $75.00 each $825.00<br>
$1,140.00 Total', NULL, '2021-03-11 11:21:59', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3695598, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3696955, NULL, NULL, '2021-03-12 10:12:07', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3701655, NULL, NULL, '2021-03-15 16:35:25', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3701672, NULL, NULL, '2021-03-15 16:35:45', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3701681, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3701696, '(1) 5 gallon Salvia leucophylla <br>
(1) 5 gallon Lavender augustifolia<br>
(3) 1 gallon Creeping Rosemary', NULL, '2021-03-15 16:36:06', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3702355, NULL, NULL, '2021-03-15 13:27:53', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3705428, '3% CC fee to be added on all payments made via a credit card. To be determined at the end of the project.&nbsp;', NULL, '2021-03-16 10:39:44', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3706830, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Final Measurement</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Turf : 2428 sqft</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">The original contract has</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Turf : 2331 sqft</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">A difference of</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Turf : 97 sqft</span></span><br>
 ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3706838, '<p><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Final Measurement</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Gravel : 1050 sqft</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">The original contract has</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Gravel : 865 sqft</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">A difference of</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Gravel : 185 sqft</span></span></p>
', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3707327, '12  linear feet long<br>
30" to 36" high<br>
to use 6" X 6"   landscape timber <br>
Rebar and Screw Construction no waterproofing, back fill with soil on site.<br>
 ', NULL, '2021-03-17 09:16:00', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3707981, 'these will be placed behind the sculpture..behind the magnolia little gem', NULL, '2021-03-18 15:32:09', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3712699, 'Credit for (6) Iceberg Roses', NULL, '2021-03-21 09:10:01', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3712710, 'Adding (16) 5 gallon Eugenias', NULL, '2021-03-21 09:10:43', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3712715, 'Swapped 15 gallons for 5 gallons', NULL, '2021-03-21 09:10:18', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3713338, 'Adding 50 LF of drain pipe', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3714110, '5-gallon to 15-gallon upgrade= $110 each X 21 = $2,310.00', NULL, '2021-03-29 16:10:55', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3714331, 'Credit for parking pass $110<br>
Reimbursement for paying for parking ticket $60', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3714652, 'Adding a second transformer.  (Hide behind ADU unit).

- Vanja to purchase smart plugs
', NULL, '2021-03-24 09:47:27', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3714815, 'We are NOT getting these pavers. Credit was included in price of drainage change order (Credit for 4 pavers-$60/each= $240 total credit given towards drainage change order)', NULL, '2021-03-24 09:47:54', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3716893, 'Change pressure treated 4”x8” to redwood 2”x8” no charge ', NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'pending'),
  (3720761, '1) Remove rock pilaster and wall for 7 feet.<br>
2) Excavate for wall and footings additional 7 feet.<br>
3) Extend retaining wall additional 7 feet.    <br>
4) Add 1 1/2 courses of block to entire retaining wall.  <br>
5) Add additional rebar reinforcement during grout lift of wall.<br>
6)  Credit for reduced fencing.<br>
 ', NULL, '2021-03-22 11:08:04', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3720997, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3721878, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">HI Melinda

Just to follow up on the Thursday installion. When Daniel came by we agreed that PictureBuild would supply the following plants:

2 x 15 gallon Hawthorne bushes (not the tree type but with max height up to 6’). White or pink.
2 x 5 gallon salvia (purple)
1 x 5 gallon azalea (white or pink)

Other plants already procured.

Please advise and issue change order.</div></div>', NULL, '2021-03-23 08:01:18', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3725999, 'Extra 60 SF of grey crushed gravel near shed area', NULL, '2021-03-23 13:07:00', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3726015, 'Credit for (1) electrical box and conduit for side yard area (not doing)', NULL, '2021-03-23 13:05:32', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3726037, 'No charge (core and curbing - not doing, cost is a wash)

Adding 6 LF of 3 inch SDR 
Removing concrete - 7.5 SF
Repouring concrete - 7.5 SF
Score concrete', NULL, '2021-03-23 13:06:02', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3726046, 'We are not shaving the footing of archway in driveway.', NULL, '2021-03-23 13:05:02', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3726068, 'Adding one more spray zone to backyard. 
Brass anti-siphon valve.
All irrigation for grass needs to be new and have correct throw.', NULL, '2021-03-23 13:06:30', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3732916, NULL, NULL, '2021-03-26 00:44:13', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3734133, 'Adding new drip emitter hoses with filter valve', NULL, '2021-03-27 06:38:51', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3734598, 'see attached<br>
<br>
remember this is a CREDIT againsts what has been paid or owed as a whole of all the work completed or already approved and not paid.   <br>
<br>
item 0007 is an additional change order already paid in full, and the total amount of pavers (220sqft) is not part of the total sqft pavers included in the attached calculation.     payments made per the original contract are progress payments. see your contract..  dont confuse it with the item cost and contract progress payments are different.', NULL, '2021-03-26 12:06:15', 1, '2021-03-25 15:28:28', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (3734839, '(65) 1 gallon Boulder blue Fescue for back pool and bed against house', NULL, '2021-03-26 11:37:58', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3737597, 'Adding 9 creeping thyme
Adding 9 dymondia silver carpet', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3738086, 'Demo the DG and grade, fill in alongside of patio where concrete was demoed&nbsp;', NULL, '2021-03-27 06:39:24', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3740103, 'Sweet Lavender is the variety', NULL, '2021-04-09 10:41:01', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3742232, '<s>160 lf x $8 per linear feet = $128.00</s><br>
<br>
160 lf x $8 per linear feet = $1280.00', NULL, '2021-04-06 16:44:30', NULL, NULL, NULL, 'Melinda Babaian', 'lost'),
  (3742257, '870 square feet of mulch x $1 per Square feet = $870.00', NULL, '2021-03-29 16:11:16', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3742268, 'Add 300 W transformer = $350<br>
Smart controller = No extra charge<br>
 ', NULL, '2021-03-29 16:09:42', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3744457, NULL, NULL, '2021-03-30 08:47:59', NULL, NULL, NULL, 'Melinda Babaian', 'lost'),
  (3746125, 'Client request to add 3 (15g) Silversheen for more coverage for garbage cans.

We already planted everything so we cannot restock the 3 (5g).<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Client wants plants to be bigger,  A LOT of these plants don’t even come in 5g and they all have A LOT of spread.  Salvias, lavender, trees, all get very big in 3 years she will say it’s too crowded.</div></div>', NULL, '2021-03-30 19:03:24', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3747608, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (3748399, NULL, NULL, NULL, 1, '2021-03-31 08:10:50', 'Melinda Babaian', 'Melinda Babaian', 'lost'),
  (3752999, 'The heads in the back of the lawn area will also need to be moved to accommodate for adjusted grading<br>
Approximately 3 hours of extra labor', NULL, '2021-04-01 12:50:21', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3753367, '160sqft', NULL, '2021-04-01 12:49:50', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3754258, 'We apologize and thank you for your understanding', NULL, '2021-04-01 15:36:22', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3754367, 'Consultation and 3 applications/trips.&nbsp; of white fly pest control.&nbsp;', NULL, '2021-04-01 18:05:24', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3754611, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3755925, 'Vista brand led (2) up -lights gr2216
(4) well lights
transformer', NULL, '2021-04-02 09:44:25', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3755986, NULL, NULL, '2021-04-02 10:27:42', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3756390, '<table style="border-collapse: collapse; width: 353px" width="353">
	<colgroup>
		<col style="width: 57pt" width="76">
		<col style="width: 65pt" width="86">
		<col style="width: 71pt" width="95">
		<col style="width: 72pt" width="96">
	</colgroup>
	<tbody>
		<tr>
			<td colspan="2" style="border-bottom: none; height: 20px; width: 162px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">Actual Installed</span></span></span></span></span></span></td>
			<td style="border-bottom: none; width: 95px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; width: 96px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
		</tr>
		<tr>
			<td style="border-bottom: none; height: 20px; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: 1px solid black; border-right: none; border-left: 1px solid black"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">15gal</span></span></span></span></span></span></td>
			<td style="border-bottom: none; text-align: right; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: 1px solid black; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">4</span></span></span></span></span></span></td>
			<td style="border-bottom: none; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: 1px solid black; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> $            175.00</span></span></span></span></span></span></td>
			<td style="border-bottom: none; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: 1px solid black; border-right: 1px solid black; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> $             700.00</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: none; height: 20px; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: 1px solid black"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">5gal</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; text-align: right; vertical-align: middle; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">58</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; vertical-align: middle; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> $               43.00</span></span></span></span></span></span></td>
			<td style="border-bottom: none; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> $         2,494.00</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: none; height: 20px; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: 1px solid black"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">1gal</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; text-align: right; vertical-align: middle; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">41</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; vertical-align: middle; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> $               21.00</span></span></span></span></span></span></td>
			<td style="border-bottom: none; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> $             861.00</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: none; height: 20px; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: 1px solid black"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> </span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> </span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: 1px solid black; height: 20px; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: 1px solid black"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> </span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> </span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> </span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> $         4,055.00</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: none; height: 20px; padding-bottom: 0in; padding-top: 0in; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
		</tr>
		<tr>
			<td style="border-bottom: none; height: 20px; padding-bottom: 0in; padding-top: 0in; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
		</tr>
		<tr>
			<td colspan="2" style="border-bottom: none; height: 20px; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">From Contract</span></span></span></span></span></span></td>
			<td style="border-bottom: none; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
		</tr>
		<tr>
			<td style="border-bottom: none; height: 20px; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: 1px solid black; border-right: none; border-left: 1px solid black"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">24box</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; text-align: right; vertical-align: middle; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: 1px solid black; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">1</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; vertical-align: middle; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: 1px solid black; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> $            360.00</span></span></span></span></span></span></td>
			<td style="border-bottom: none; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: 1px solid black; border-right: 1px solid black; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> $             360.00</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: none; height: 20px; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: 1px solid black"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">15gal</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; text-align: right; vertical-align: middle; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">5</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; vertical-align: middle; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> $            175.00</span></span></span></span></span></span></td>
			<td style="border-bottom: none; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> $             875.00</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: none; height: 20px; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: 1px solid black"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">5gal</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; text-align: right; vertical-align: middle; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">75</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; vertical-align: middle; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> $               43.00</span></span></span></span></span></span></td>
			<td style="border-bottom: none; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> $         3,225.00</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: none; height: 20px; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: 1px solid black"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">1gal</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; text-align: right; vertical-align: middle; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">60</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; vertical-align: middle; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> $               21.00</span></span></span></span></span></span></td>
			<td style="border-bottom: none; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> $         1,260.00</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: none; height: 20px; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: 1px solid black"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> </span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> </span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td colspan="2" style="border-bottom: none; height: 20px; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: 1px solid black"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">Change Orders</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> </span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: none; height: 20px; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: 1px solid black"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">15gal</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; text-align: right; vertical-align: middle; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">1</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; vertical-align: middle; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> $          (175.00)</span></span></span></span></span></span></td>
			<td style="border-bottom: none; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> $          (175.00)</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: none; height: 20px; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: 1px solid black"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> </span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> </span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: 1px solid black; height: 20px; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: 1px solid black"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> </span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> </span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> </span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> $         5,545.00</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: none; height: 20px; padding-bottom: 0in; padding-top: 0in; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
		</tr>
		<tr>
			<td style="border-bottom: none; height: 20px; padding-bottom: 0in; padding-top: 0in; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
			<td style="border-bottom: none; padding-bottom: 0in; padding-top: 0in; vertical-align: middle; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 14px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif"> $       (1,490.00)</span></span></span></span></span></span></td>
		</tr>
	</tbody>
</table>
', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3756416, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">0008 - Extend basketball court 150sqft                   ($990)</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Remove the 45sqft credit                                              $337.50 (removing this as it is a redundant credit)</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b>Total credit due : $652.50</b></span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">This results in you paying for the remaining item. - 105sqft concrete $787.50</span></span><br>
 ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3756467, 'additional Ficus Nitida 3 15 gallon plants&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3757071, NULL, NULL, '2021-04-03 08:40:40', NULL, NULL, NULL, 'Melinda Babaian', 'lost'),
  (3757074, NULL, NULL, '2021-04-03 08:41:20', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3757201, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3759894, '<header>(5 Job *B) Mason, Gudrun<br>
Created By Brian Godley on Fri, Jul 31, 2020</header>

<main> </main>
', NULL, '2021-04-15 09:29:08', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3760138, 'Max said he will need one more full day of work to demo, wall install- taking longer due to access/hillside', NULL, '2021-04-07 07:55:15', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3761254, NULL, NULL, '2021-04-06 10:23:28', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3761257, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">patch and repair stucco - paint ready
painting not included
not to exceed 50 sq ft</div></div>', NULL, '2021-04-06 10:23:10', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3761261, NULL, NULL, '2021-04-06 10:22:57', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3761263, NULL, NULL, '2021-04-06 10:22:36', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3761615, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Contract  TURF  2,331 sf      
Mohammed put in change order on March 16th adding 97 sf
Total before final count 2,428 sf
Final count;  2091
Difference 337 sf  X $10.00= $3,370.00 Credit

Contract ROCK  865
Mohammed put in change order on March 16 adding 185 sf
Final count 1,021 SF
Difference of 29 sf X $6.00= $174.00 credit

Total Credit after Mohammed''s change orders and final count: $3,544.00</div></div>', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3763113, '7gals x $43ea = 301', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3764520, NULL, NULL, '2021-04-07 07:54:37', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3769109, NULL, NULL, '2021-04-16 12:27:37', NULL, NULL, NULL, 'Brian Godley', 'lost'),
  (3769218, 'Raised curb  using a Rustic wall block on it''s side.  Need to order 18 pieces.  for 17 linear feet, X $33.00 a Linear foot= $561.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3769222, '27 Linear feet X $11.50 a SF= $310.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3769225, '22 linear feet of drainage X $20.00 a LF<br>
connecting 3 close down spouts', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3769228, '8 linear feet of step build 8 LF X $50.00=$400.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3771075, '<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><u><span style="font-family: "Times New Roman", serif">Planting Allowance</span></u></b></span></span></span>
<ol>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-family: "Times New Roman", serif">24" Box-tree @ $385ea / 15Gallon @ $150ea / 5Gallon @ $45ea / 1Gallon @ $22ea / $400 plant layout design / 1 yard mulch $300</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-family: "Times New Roman", serif">Amend soil, Fertilize and Basin each plant</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-family: "Times New Roman", serif">90 Day Warranty / 3 week yard check included</span></span></span></span></li>
</ol>

<div style="margin-left: 8px">credits will be applied on remaining balance of allowance used</div>
<br>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><span style="font-family: "Times New Roman", serif"> Allowance $2880</span></b></span></span></span><br>
 ', NULL, '2021-04-12 17:49:28', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3772774, '<span style="font-size: 11pt"><span style="background: white"><span style="font-family: Calibri, sans-serif"><span style="color: black">Grade lower Area -                                                                                          $800</span></span></span></span><br>
<span style="font-size: 11pt"><span style="background: white"><span style="font-family: Calibri, sans-serif"><span style="color: black">(24) 5 Gallon Trailing Rosemary                                                                    $1080</span></span></span></span><br>
<span style="font-size: 11pt"><span style="background: white"><span style="font-family: Calibri, sans-serif"><span style="color: black">(1) 15 Gallon Arbutus Marina single trunk  Tree  - staked                         $212</span></span></span></span><br>
<span style="font-size: 11pt"><span style="background: white"><span style="font-family: Calibri, sans-serif"><span style="color: black">Jute Mesh 250sqft                                                                                             $650<br>
<br>
SEE ATTACHED </span></span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"> </span></span><br>
<br>
 ', NULL, '2021-04-08 16:46:58', 1, '2021-04-08 16:35:07', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (3774061, NULL, NULL, '2021-04-09 17:08:24', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3774080, NULL, NULL, '2021-04-09 17:07:58', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3774083, NULL, NULL, '2021-04-09 17:07:28', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3774129, NULL, NULL, '2021-04-09 09:21:48', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3774370, 'Added Timber Steps. 160 ln feet.  3 added secions. Added timber retaining wall and landings 36 ln feet - $10,200<br>
Compact North Hillside - 2 days - $1900<br>
Install SDR 35 drainage North Hillside and Bury - $1200<br>
<br>
 ', NULL, '2021-04-15 09:28:33', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3774446, NULL, NULL, '2021-04-10 13:31:48', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3774596, '1 CY 50/50 for 2 BERMS in front yard, there was not enough soil on site to berm.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Need to do this so client will get grass rebate from the city
Berm #1 is under Agave Americana
Berm #2 is under Red Aeonium</div></div>', NULL, '2021-04-09 17:52:54', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3774959, NULL, NULL, '2021-04-09 17:31:16', NULL, NULL, NULL, 'Victor Rodriguez', 'sold'),
  (3774963, NULL, NULL, '2021-04-09 17:30:16', NULL, NULL, NULL, 'Victor Rodriguez', 'sold'),
  (3774971, NULL, NULL, '2021-04-09 17:30:55', NULL, NULL, NULL, 'Victor Rodriguez', 'sold'),
  (3774982, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Rodriguez', 'pending'),
  (3775604, NULL, NULL, '2021-04-11 14:31:47', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3775708, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3776129, 'Backyard Privets', NULL, '2021-04-11 14:21:14', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3776131, NULL, NULL, '2021-04-10 07:28:43', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3776132, 'Erosion Control for holding dirt back on hillside', NULL, '2021-04-10 07:29:17', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3776134, '652sqft', NULL, '2021-04-10 07:34:07', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3776164, NULL, NULL, '2021-04-12 12:00:39', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3776166, 'Owner wound up providing own blocks for outside wall', NULL, '2021-04-12 12:00:58', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3776167, NULL, NULL, '2021-04-12 12:01:16', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3776170, 'Removal of garage cabinets and dump disposal&nbsp;', NULL, '2021-04-12 12:01:35', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3776287, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3776546, '63 LF 4" Black metal bender board', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3776556, '3 stump grinds
40 SF of concrete removal', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3776558, 'Remove all electrical (old lights, electrical boxes, pipes)', NULL, '2021-04-14 10:32:18', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3776663, 'We are ADDING smooth stucco as in attached drawing.  I approximate that the area is 9 ft x 5 ft high. 

The wall will then be painted black later by the client’s painter so stucco does not need color.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Please let me know if this is not clear. Thank you! Nicole</div></div>', NULL, '2021-04-17 09:04:43', 1, '2021-04-15 19:44:14', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (3776671, 'We will need approx. 60 LF at 18”-30” of waterproofing for all walls.

This will ensure that the water doesn’t come through and stain the concrete over time.
(frontyard garden and retaining wall plus backyard retaining walls)', NULL, '2021-04-24 13:02:21', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3776679, 'We are looking for an organic solution to spray on the hillside since there is substantial growth of the invasive grass since I last visited and the ivy is getting a little out of control.  You will need a gardener to be on top of the ivy once we have installed all the new plants, as it can get bad quick! 

This cost is for material and labor of the entire hillside.', NULL, '2021-04-14 21:45:33', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3778325, NULL, NULL, '2021-04-12 14:43:46', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3780619, NULL, NULL, '2021-04-12 16:55:28', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3780746, NULL, NULL, '2021-04-16 13:49:51', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3781040, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3781046, 'Credit ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3784241, 'Remove sub irrigation for previous design.  Add two zones of sprayhead irrigation - $1850<br>
Till, grade add amendments. $1700<br>
1650 sq feet of lawn.   -  $3,685<br>
250 ln feet of benderboard.  - $2250<br>
<br>
Gopher mesh install - <br>
credit for 1/2 day of mesh install - ($500)<br>
 ', NULL, '2021-04-15 09:27:59', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3784293, 'Credit for mulch that we will not be doing on the very upper hillside slope.  

We will still mulch other beds that don’t have gravel with plants.', NULL, '2021-04-14 21:47:22', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3784386, 'I didn’t account for the 30” freeboard section of the 5’ tall CMU wall in the contract. (The L shaped wall on the left)

This is for the extra courses and labor. 

', NULL, '2021-04-14 21:48:31', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3786988, NULL, NULL, '2021-04-14 10:19:09', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3786993, NULL, NULL, '2021-04-14 10:18:37', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3787163, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (3787170, NULL, NULL, '2021-04-14 11:18:33', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3788172, 'Credit for 1/2 of design fee (designer Harley Barber)<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Mo - Is this typically how we do it? I''ve never done it this way before. Lmk!</div></div>', NULL, '2021-04-14 17:27:09', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3788714, 'There was another wall behind the lava wall that is extending 18 linear feet and is 28” tall. See attached photo. 

This wall and the footings will have to be removed so we can build properly and ensure the wall will never be compromised. 

This cost is for extra material, removal, and hauling.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">I’m confident that the news walls will be strong and give us a better planting area.</div></div>', NULL, '2021-04-17 09:03:24', 1, '2021-04-14 14:42:17', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (3794340, '1)  Outdoor Kitchen:<br>
- 2 additional linear feet<br>
- set block, form concrete top, stucco in same color, concrete top in same color<br>
-cure and seal<br>
$635.00 a linear foot X 2=<br>
$1,270.00<br>
<br>
2)  Electrical<br>
- 20 linear feet at $22.00<br>
- fan installation $250.00  ( reduced from $300.00)<br>
- outlets at no charge  <br>
-$440.00 + $250.00<br>
$690.00<br>
<br>
Total final change order:  $1,960.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3794840, NULL, NULL, '2021-04-16 13:49:12', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3795825, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3796033, 'We did not receive or install 3 flats of silver falls groundcover for under the camellias and toyon tree in back.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">We may want to add 5 (5g) Sword ferns when Daniel does yard checks.</div></div>', NULL, '2021-04-19 11:07:52', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3797936, '60 linear feet at $6.00= $360.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3798355, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3798369, 'Extending the drain across entire back side of pool and adding a pop up for just outside fence', NULL, '2021-04-20 10:16:27', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3798418, '+4 linear feet, will split with bbq<br>
will need to remove trex planks to trench gas line towards firepit', NULL, '2021-04-20 10:18:00', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3798437, NULL, NULL, '2021-04-20 10:17:48', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3798463, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3798615, 'Add 20 LF of 3/4" SDR drain pipe. Includes labor', NULL, '2021-04-19 10:40:49', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3798653, 'We are not doing 8 drains boxes, we are now doing 3 boxes total.', NULL, '2021-04-19 10:40:35', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3798683, 'Adding 28 LF of main line for irrigation from back house hose to grass area', NULL, '2021-04-19 10:40:18', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3798692, 'Add sleeve under concrete for future water main (if ever needed client will have access under concrete pour)', NULL, '2021-04-19 10:40:04', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3798696, 'Move soil around on hillside so it doesn''t spill over.', NULL, '2021-04-19 10:39:49', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3798726, 'Remove soil down to 6" behind retaining wall
Add 115 SF of 4" concrete pour with light broom finish', NULL, '2021-04-19 10:39:12', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (3798761, '15 LF of railroad treated landscape timbers retaining wall at 2 courses high', NULL, '2021-04-19 10:38:38', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (3798767, '1" poly line for future BBQ at 41 LF', NULL, '2021-04-19 10:39:31', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (3798837, '4arcticoke.  5gal
Blue glue.   5gal. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3798933, 'Adding one step 4-6" rise so 6 steps in total.', NULL, '2021-04-19 10:46:50', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3802494, NULL, NULL, '2021-04-20 10:17:34', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3807154, 'Bullnose paver in charcoal for 36 linear feet, risers will be in 6x9 charcoal to match-', NULL, '2021-04-28 10:54:24', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3809030, '1) Added rear valve and hose bib for rear planter - 1/2 day 1 guy plus material  $490<br>
2) Added drainage inlets pool planter - 1/2 day 1 guy plus material  $435<br>
3) Back filled front and back planter with 4 yards of 50/50  2 guys 1/2 day. plus material and $250 delivery fee - $985<br>
4) Gopher Mesh front - 3 guys 1/2 day - $2350<br>
5) Benderboard for all rear walkways.  260 ln feet - $2340<br>
6) Add 3 timber steps and landing - $850<br>
7) Add 60 yards of Mulch - $5,191<br>
<br>
 ', NULL, '2021-04-21 17:38:18', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3811328, NULL, NULL, '2021-04-22 14:22:17', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3812729, 'see attached revised scope of work and new payment schedule<br>
<br>
Deposit  - Paid<br>
$34,000 additional', NULL, '2021-04-22 17:33:17', 1, '2021-04-22 15:15:24', 'Ryan Kleefisch', 'Ryan Kleefisch', 'lost'),
  (3816574, '300 Watt Transformer $400 (gave a discount here)
Labor for installing 38 lights - $1,550
300 LF of wire - $350', NULL, '2021-04-24 12:16:40', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3817983, NULL, NULL, '2021-04-27 09:20:21', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3818492, '#2211 in black', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3818607, NULL, NULL, '2021-04-26 10:26:52', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3818795, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3819036, NULL, NULL, '2021-04-26 11:30:11', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3819601, 'in front yard', NULL, '2021-04-26 21:12:09', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3820442, NULL, NULL, '2021-04-26 21:08:29', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3820450, 'this is included in the cost of the job<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">this is included in the cost of the job, Remit $600 to Ryan for designwork</div></div>', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3820540, 'this allowance covers additional costs including, permit and pre-permit work including side view drawings of 3d design, this also includes costs associated with submitting to engineer<br>
Designer at the rate of $120hr, Permit/Engineering running , working with the city<br>
estimated engineering costs of $2000 not to exceed without further approval', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (3822807, 'Removal of tree stump/roots next to deck', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3822812, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3822815, 'Secure riser&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3822822, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3822848, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3823184, 'Turf to be 400sqft', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3823544, 'Angelus Holland stone (Red-Brown-Charcoal, Tumbled) price difference for approx. 500 SF
If SF is less once on-site, we will credit you. 

We need to see the grade on-site for steps at the job walk.  This cost will be an extra $500 if we determine that two steps are needed. The steps will be made out of pavers as well. Once demo is complete, grade can be determined with string,  and we will know if steps are necessary.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">We need to determine if we need a step up and down at job site and see if we need to drop the entire patio down.  Client does want to drop it down, but need to see grade first.  

I did not include steps in paver cost.  $490 extra for 2 (4-5 Lineal Feet) steps. *Will be determined at job walk and a change order submitted at that time for the steps or within the first few days when demo is complete and grade is finalized.</div></div>', NULL, '2021-04-27 12:05:10', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3823600, 'Added plants. <br>
<br>
<span style="font-size: 12pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.5pt"><span style="background: white"><span style="font-family: "Segoe UI", sans-serif"><span style="color: #26292e">- 3 Dwarf Fruitless Little Ollie 24 box<br>
- 33 Concha Ceanothus 15 gal<br>
- 11 Coral Aloes 5 gal<br>
- 25 Purple Sage Point Sal 5 gal<br>
- 15 Huntington Carpet Rosemary 5 gal<br>
- 26 Agave 5 gal <br>
- 12 Licorice Mint Hyssop Agastache Rupestris 1 gal<br>
- 12 Dwarf Mat Rush Breeze1 gal<br>
- 13 Pale Leaf Yucca 5 gal</span></span></span></span></span></span><br>
<br>
Run new irrigation to all plants<br>
<br>
Install 102 gopher cages to all 1 and 5 gallon plants. <br>
<br>
 ', NULL, '2021-04-27 14:23:47', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3825096, NULL, NULL, '2021-04-27 16:14:13', 1, '2021-04-27 16:15:00', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (3825617, '(12) 5 Gallon plants @ $45ea  = $540<br>
Return (6) plants @ $45 = $270<br>
total Additional $270<br>
 ', NULL, '2021-05-03 16:19:47', 1, '2021-05-03 11:36:21', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (3826757, NULL, NULL, '2021-04-28 10:53:20', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3826954, 'NOT planting<br>
<br>
(17) 15g blue ice podocarpus<br>
(32) 4" succulents', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3826963, 'Only need one drip', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3827017, '3 drain boxes
76 LF of 3" SDR drain pipe', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3827026, 'Add 55 LF of 3/4" water main line
Add hose bib', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3827028, 'Add 5 LF of benderboard to keep in gravel ', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3827045, 'Total SF of gravel has changed due to podocarpus not being planted', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3827092, '18 SF of concrete (sand finish) - (2) 3x3’ step pads
Forming and labor<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Near shower area - del Rio gravel will be around pads</div></div>', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3827112, '300 watt transformer
6 step lights (under new wall cap)
3 up lights', NULL, '2021-04-29 17:47:03', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3827140, '58 LF of Rustic Wall in grey/charcoal (or similar color) for wall cap.  
I have given you a discount on the added cap!

Max will bring samples, maybe you want to hold off on approving until he shows you the sample on Monday. <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">I am unsure what line item this is on the price sheet.  This is my estimate. I think it’s high, but better safe than sorry.</div></div>', NULL, '2021-04-28 19:37:49', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3827141, '<ul><li><span>12’ (4x10) pressure treated Doug Fir (termite and rot resistant) with concrete footing.</span></li><li><span>32 LF of hot water line </span><span>1/2” copper pipe buried 18” below grade per code, includes trenching and backfill.</span></li></ul><div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">If we can get this wood from Ganahl that is the pricing I have and I love it there. Takes 1-2 days for the 12’ as it comes from Anaheim to the yard for pickup.</div></div>', NULL, '2021-05-03 10:59:35', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3827179, 'Add one citrus 15g - Max will let Kim and Kevin know what variety of orange they have.

I have given $20 off this plant. Citrus are non-returnable.', NULL, '2021-04-28 22:04:42', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3827340, NULL, NULL, '2021-04-28 10:54:00', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3827342, NULL, NULL, '2021-04-28 10:54:14', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3831232, 'We are now doing 6 Natural Flagstones instead of circular pavers set in DG. <br>
<br>
This is the cost difference from what we had in the contract to the new change.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Client doesn''t understand that we went over all of this in the design phase and we signed off on design.</div></div>', NULL, '2021-04-29 09:52:42', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3831454, '$85 per yard.&nbsp;', NULL, '2021-04-29 10:57:47', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3831556, 'Cost difference for doing the brick BULLNOSE steps instead of the pavers in the center and brick rectangle edge (as we have in contract). Initially we were going to do the same paver as in the back pool deck area in the center of the brick steps, but we have not gotten that far with the phase 2 material selections.<br>
<br>
The steps will be all brick with a bullnose edge.', NULL, '2021-04-29 11:20:19', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3831667, 'Set new mailbox (*to be purchased by client) in concrete footing.', NULL, '2021-04-29 11:19:12', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3832597, 'only 6 lights were included in previous light change order, this change order adds (1) additional per request on owner provided lighting plan.&nbsp;', NULL, '2021-04-29 14:02:23', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3832871, 'install (4) 7ftx2x2 square post set with concrete for gate, post to be 5ft high when finished. or cut off to exact length after setting, at house/garage run a lag and also concrete footings<br>
<br>
george - see attached plan, verify exact location with owner<br>
<br>
fence is in the process of being designed/quoted/approved', NULL, '2021-04-29 19:10:28', 1, '2021-04-29 14:47:44', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (3833247, 'Cost difference of switching to all Stepstone Porcelain pavers. 

(64) 2 x 2 vs. what we had in the contract (Antique Cobble or Catalina Grana in Rio).  This is the cost difference.', NULL, '2021-04-29 16:56:38', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3833260, 'Adding 90 LF of 4” black metal edging', NULL, '2021-04-29 16:56:01', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3833274, 'Adding 1”-2” full Mexican Mixed Beach Pebble for in-between all of the pavers. Both in pathway area and in paver patio grid.  Approx. 60 SF at 3” depth.  Includes weed barrier.

(Planting beds will still be Del Rio - size is 1” minus)', NULL, '2021-04-29 16:56:57', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3833432, 'Wall to be 8 linear feet with 2 courses (above grade) smooth stucco w/brick cap to match existing walls<br>
This will include demo, material pick up <br>
 ', NULL, '2021-04-30 17:10:07', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3835892, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">additional drainage 28 lf X $20.00</div></div>', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3835902, '170 Sf more in front X $12.00&nbsp; pavers', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3836068, '121 SF of sod (to match front lawn) in the mow strip in-between driveway. (Replace existing with same look and size)', NULL, '2021-05-03 07:03:39', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3836436, 'These (8) 15g Podocarpus Blue Ice are more expensive than our allotted $75 per 15g plants. They are $125/piece so the difference is $400, I have given a discount here.

Once approved we will move forward with placing the order. If you don''t want Blue Ice the other Podocarpus in the plan (gracillior) are at our price point.', NULL, '2021-05-03 16:20:38', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3836594, NULL, NULL, '2021-04-30 21:09:29', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3836724, NULL, NULL, '2021-05-01 07:53:59', NULL, NULL, NULL, 'Jorge Flores', 'lost'),
  (3839083, '40 linear feet of wiring and one outlet&nbsp; $22 X 40 linear feet = $880.00, one outlet $100.00 = $980.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3839528, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3839570, 'Max found 8 small stumps with thick roots in the planter beds.

We will need a stump grinder.', NULL, '2021-05-03 16:21:14', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3839625, 'Not doing this many vines.  We are keeping 2 (1gallon) - Jasmine vine for corner and grape vine for for shower area or vice versa.', NULL, '2021-05-03 16:21:40', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3839745, 'This amount was included in the contract $3.00 for demo, and $8.00 for form and pour', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3840975, '140sqft includes weed fabric', NULL, '2021-05-03 18:08:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3841286, '346 additional square feet X $3.50= $1,211.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3841843, 'Import 2 CY soil to fill behind walls and raise soil level', NULL, '2021-05-05 11:25:50', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3843345, NULL, NULL, '2021-05-04 11:27:23', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3844887, NULL, NULL, '2021-05-06 11:10:16', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3844972, NULL, NULL, '2021-05-04 19:12:11', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (3844987, 'Stumps are huge and we need machine for another day. Max has shown clients and described extra large Juniper skyrocket stumps in planter bed.', NULL, '2021-05-11 17:34:06', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3848177, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3851328, 'credit for 15 gallon Olive Tree<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3851347, '(1) 24Gallon Podocarpus (440.00)<br>
(3) 15G Podocarpus ($150 ea planted)<br>
(3) 1G grasses ($21 - you had a credit for (1) 5 gallon topiary that was on the original estimate) ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3852450, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">settlement credit</div></div>', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3853912, 'see allowance per previous approved change order #0006<br>
<br>
(2) 15 Gallon Palms                     $300ea                              $600<br>
(1) 24" Box Tree                                                                    $385 <br>
(22) 5 Gallon Shrubs                    @ $45ea                           $990<br>
(32) 1 gallon plants                        @ $22ea                          $704<br>
Planting Design                                                                       $400<br>
                                                                                     Total  $3079<br>
                                                                   Plant Allowance $2880<br>
                                  Additional planting allowance required $199<br>
<br>
<strong><u>Credits</u></strong><br>
Decomposed granite credit   from 500sqft to 350                 -$585<br>
Concrete Credit from 875sqft to 820sqft                              - $473<br>
Electric to bbq credit                                                             -$700<br>
                                                                        Total Credit -$1758<br>
<br>
this change order charges against the approved allowance as a credit<br>
<br>
                <br>
 ', NULL, '2021-05-07 06:53:25', 1, '2021-05-06 19:27:55', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (3855566, 'please see attached copy of email as an E-approval for this upgrade<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">from 5 gallon to 15 gallon</div></div>', NULL, NULL, 1, '2021-05-07 10:25:47', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (3855621, 'Remove CMU wall in preparation for gate installation. See photo attached.

Approx. 3.5’ x 5’ 3” CMU block wall with 19” wood lattice top.', NULL, '2021-05-10 08:45:03', 1, '2021-05-07 10:36:39', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (3856952, '165 so x $12.00. Juventino to pick up pavers tomorrow', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3857016, 'We had 702 SF of sod in the contract, client measured 730 SF. This doesn''t include industry standard of overage.', NULL, '2021-05-09 21:59:15', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3857034, NULL, NULL, '2021-05-07 20:36:28', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3857284, NULL, NULL, '2021-05-10 00:06:35', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3859790, 'Move main line 34 LF towards steps and out of concrete BB area. Hidden behind plants or pot.', NULL, '2021-05-18 09:11:11', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3860224, '20 LF of 3/4" conduit and waterproof electrical box', NULL, '2021-05-10 12:52:42', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3860237, 'Concrete step down to shed 4 LF', NULL, '2021-05-10 12:53:50', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3860292, 'Adding concrete', NULL, '2021-05-10 12:53:09', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3860312, 'We are not doing a wall where entrance to shed is, instead we added a step down. This is the credit for wall.', NULL, '2021-05-10 12:52:20', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3860359, '21 LF of concrete curb 10" high 6" thick', NULL, '2021-05-10 12:51:43', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3860377, 'Courtesy no charge ($127)', NULL, '2021-05-10 12:51:22', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3860397, 'Add 34 LF of 3/4" conduit with outdoor waterproof electrical box', NULL, '2021-05-17 09:49:26', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (3860647, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3861258, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3861587, 'We are doing 7 x 7 = 49 (2x2''s)
I estimated for 8 x 8 so this is the credit difference for 15 stepping stones. ', NULL, '2021-05-10 17:47:17', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3861602, 'Shaka did 2 other courts recently and their specs followed appropriate footings. Recommended 48" x 24".

We had in contract 48" x 16" and both Melinda and Shaka agree we need stronger footings at 5000 psi (not 2500 psi). ', NULL, '2021-05-10 17:47:00', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3861681, NULL, NULL, '2021-05-10 17:42:05', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3861687, NULL, NULL, '2021-09-23 11:04:15', NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (3865859, '50 linear feet', NULL, '2021-05-11 16:02:55', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3871752, '750-375&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3873129, '<br>
Credit 1-block not installed , includes 20% return costs   -$300<br>
<br>
 ', NULL, '2021-05-17 11:39:40', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3873441, 'Actual Original Contract $29,836 -Typo (not $28,836)    Add $1000        see contract addition<br>
Credit -  Sidewalk Demo and install                                      - $3200<br>
Credit - Permit Allowance                                                      - $1500<br>
<br>
                                                                            Total Credit -$3700', NULL, '2021-05-13 14:32:27', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3873461, '<br>
38ft of  pressure treated 2x4', NULL, '2021-05-18 08:55:55', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3873807, '2 new drip zones for the planters', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3873878, '1) Courtyard driveway 52 square feet X $12.00= $630.00<br>
2)  Paseo I & II front porch and entry  18 SF X $15.25= $274.00<br>
3)  Paseo I & II extending the back patio11.5 ft  X 2 ft = 23 SF X $15.25= $350.00<br>
4)  CREDIT 7 SF on side of the house - $84.00 <br>
Total additional pavers<br>
$1,170.00<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3875085, '5 additional 5 gallon Raphiolepis umbrella minor', NULL, '2021-05-15 14:04:43', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3875765, 'Demo 86 SF of older concrete up until the red line <br>
86 paver install up to the red line (not including any steps)<br>
<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">this does not include the 4.8 LF of stepdown, waiting to see what they choose for the step area to add on step cost.</div></div>', NULL, '2021-05-17 06:23:54', 1, '2021-05-14 09:54:14', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (3876756, 'Hand demo existing concrete steps/landing out from garage and timbers.<br>
<br>
- ADD (2) 6.6 LF Holland tumbled paver steps (RBC) out from garage.  Jorge and Jueventino offered design of one diagonal step and one semi-straight step.  (Similar to what is existing now as it is a small corner).<br>
<br>
- Infill approx 12 SF of Holland tumbled pavers (RBC).', NULL, '2021-05-17 06:31:18', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3876773, 'ADD 4 LF of drain pipe to popup<br>
ADD 4 socks to downspouts to connect to main drain ', NULL, '2021-05-17 06:30:54', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3876783, 'Contract had 500 SF of paver, we are needing 550 SF of paver.&nbsp; This is the cost difference.', NULL, '2021-05-17 06:30:13', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3877131, 'Wall #1 (bottom for fence) +6"H<br>
Wall #2 reducing 1 linear foot, adding 13" (1 1/2 courses)<br>
Wall #3 +3 linear feet<br>
Wall #5 +5 linear feet, + 14"H (1 1/2 courses)<br>
Wall #6 + 2 linear feet<br>
 ', NULL, '2021-05-14 16:14:59', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3877132, NULL, NULL, '2021-05-14 16:14:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3877133, NULL, NULL, '2021-05-14 16:14:25', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3877134, 'Additional 150sqft', NULL, '2021-05-14 16:14:05', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3877137, '+74 linear feet of drainage', NULL, '2021-05-14 16:13:49', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3877138, '10 linear feet total<br>
(2) 3 linear feet for second terraced wall<br>
(10) 4 linear feet step for 1st terraced wall', NULL, '2021-05-14 16:13:26', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3877191, '<span style="font-size: small"><span style="color: #222222"><span style="font-family: Arial, Helvetica, sans-serif"><span style="font-style: normal"><span><span><span style="font-weight: 400"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: 2"><span style="word-spacing: 0px"><span style="background-color: #ffffff"><span><span><span>ADDED Plant request per client:</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<br>
<span style="font-size: small"><span style="color: #222222"><span style="font-family: Arial, Helvetica, sans-serif"><span style="font-style: normal"><span><span><span style="font-weight: 400"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: 2"><span style="word-spacing: 0px"><span style="background-color: #ffffff"><span><span><span>(13) 1gallon Golden variegated Sweet Flag ($280- labor and material)</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<span style="font-size: small"><span style="color: #222222"><span style="font-family: Arial, Helvetica, sans-serif"><span style="font-style: normal"><span><span><span style="font-weight: 400"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: 2"><span style="word-spacing: 0px"><span style="background-color: #ffffff"><span><span><span> </span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<span style="font-size: small"><span style="color: #222222"><span style="font-family: Arial, Helvetica, sans-serif"><span style="font-style: normal"><span><span><span style="font-weight: 400"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: 2"><span style="word-spacing: 0px"><span style="background-color: #ffffff"><span><span><span>(3) 5gallon Agave foxtail (<strong>No additional charge</strong>, exchange for (3) 5gallon fire sticks)</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span>', NULL, '2021-05-16 23:05:34', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3877226, NULL, NULL, '2021-05-17 10:49:22', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3877228, NULL, NULL, '2021-05-17 10:49:04', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3877230, NULL, NULL, '2021-05-17 10:49:37', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (3877232, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3877251, 'We are NOT going to demo 13 LF of fencing in front of little wall. 
Linsey and Daniel have taken care of this already.  ', NULL, '2021-06-11 12:47:43', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3877262, 'Thin out bamboo stems from the lower trunk area. Cut stems so there is spacing at bottom and less of a clump where the pool decking meets the planter bed. 

NO HEDGING.

Remove plants behind couch (1 gallons and maybe (1) 5 gallon)', NULL, '2021-05-25 12:48:49', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3877278, 'Now that we know paver is almost flush with back door, there will be a step down to the gravel area on the side of the house (where the A/C unit is). This is for paver install for approx 4-5 LF of paver step.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Jorge said Jueventino will charge for this step down so we have to do it.</div></div>', NULL, '2021-05-17 06:29:51', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3877280, 'Waterproofing 18 LF near bottom of house where concrete meets siding.&nbsp;', NULL, '2021-05-17 06:29:14', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3881979, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3881982, 'Pergola to be done by other.&nbsp;', NULL, '2021-05-18 10:20:31', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3883422, NULL, NULL, '2021-05-18 08:55:21', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (3883603, 'Upgrade to colored concrete - Davis in Outback - 8-9 yards', NULL, '2021-05-18 09:10:49', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3884004, '25 linear feet of drainage X $25.00= $625.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3884015, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">4 footings at $150.00 each</div></div>', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3884022, 'Installation of Gazibo', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'lost'),
  (3884044, 'Installig 134 Less Square Feet X $12.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3884053, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3884644, 'Total drainage is 242 linear feet with caps. <br>84 linear feet  in contract <br>158 additional lf drainage. X $20.00<br>= $3,160.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3884734, NULL, NULL, '2021-05-26 18:44:20', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3884753, NULL, NULL, '2021-05-26 18:44:03', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3884796, NULL, NULL, '2021-05-26 18:43:45', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3886178, 'This is the cost for doing all new manufactured brick (just like the one you have in the driveway) for the pathways and near gate.  ', NULL, '2021-05-25 12:49:36', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3886863, '(1) 24" Agonis flexuosa<br>
(5) 5g Mimulus aurantiacus<br>
(8) 5g Hedychium (Ginger lilies)', NULL, '2021-05-26 18:43:17', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3888001, 'Beds by lake x 2 <br>
47x3', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3888245, 'Credit for purchasing plants directly from Moon Valley.
Credit was negotiated with Brian and client. ', NULL, '2021-06-03 11:17:09', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3888250, 'Cost to install palms as per Brian and Eric’s conversation', NULL, '2021-05-19 10:22:40', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3888709, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3889269, NULL, NULL, '2021-05-19 12:10:50', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3890105, 'Two steps need to be added to make grass lower and flat.
Steps are 4'' and 7''
Both have a 7" rise (typical is 4-6" rise) and 12" step tread (normal).
Both steps are in colored concrete.', NULL, '2021-05-19 15:46:57', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3890606, NULL, NULL, '2021-05-20 07:56:45', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3890947, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3891266, 'add approx 75sqft additional synnthetic grass and 5 ft bender board edging', NULL, '2021-05-20 07:49:53', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3892370, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3893644, NULL, NULL, '2021-05-20 12:27:38', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3894285, NULL, NULL, '2021-05-20 14:09:57', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3894325, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3894547, NULL, NULL, '2021-05-21 08:31:03', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3894553, '(1) Netafim drip zone<br>
(1) Spray Zone<br>
(1) Drip zone for beds', NULL, '2021-05-21 08:30:41', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3894562, 'Adding a change order for this as it will likely take (1) full day to install this, we will give a credit if it takes less time.', NULL, '2021-05-21 08:30:19', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3894753, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">We did not pour footings (cancel change order)</div></div>', NULL, '2021-05-20 17:06:51', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3896007, 'includes upgraded Japanese maple to 24" box so its of decent size', NULL, '2021-05-21 09:00:49', 1, '2021-05-21 08:22:43', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (3897973, 'Bender Board $8.00 X 30= $240.00<br>
Plants please see attachement for list  = $857.00<br>
Mulch  400 additional Sf X $1.50= $600.00<br>
$1697.00', NULL, NULL, 1, '2021-05-21 15:45:16', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (3898094, '(1) path <br>
(1) uplight', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3900184, NULL, NULL, NULL, 1, '2021-05-24 09:00:27', 'Mohammed Rahman', 'Mohammed Rahman', 'sold'),
  (3900431, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3900465, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3901994, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3902483, 'Area for grass has been reduced', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3902484, 'adding 1 additional drip zone', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3902603, '(8) 1 Gallon plants       $176<br>
(4) 5 gallon plants        $180<br>
4ft of 6" bender board   $65', NULL, '2021-05-25 00:26:15', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3906481, '1) Bring up grade along deck and out towards patio, roughly 450 sqft x 6" depth, will need add''l 50/50 soil to avoid having to build 2 deck steps<br>
2) Remove ivy from fence along side shared with neighbor''s <br>
3) Remove naval tree by deck<br>
 ', NULL, '2021-05-27 09:12:59', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3906486, NULL, NULL, '2021-05-27 09:09:29', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3906523, '+12sqft of patio (for kitchen area)<br>
+30sqft from patio towards deck (where steppers will be)<br>
+30sqft for area behind firepit (for seating)<br>
<br>
Reduction in stepper size (losing 150sqft)<br>
 ', NULL, '2021-05-27 09:13:22', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3906525, NULL, NULL, '2021-05-27 09:14:14', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3906533, '48 lf of electrical conduit from kitchen to deck area<br>
Plus 1 outlet (total of 3)', NULL, '2021-05-27 09:08:30', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3908059, '1 24” multi crepe Myrtle 1 15” Bahunia<br>
(6) 5 gallon Azalea ', NULL, '2021-05-26 18:42:01', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3911405, 'by ryan', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3911406, 'By Ryan', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3911407, 'by ryan', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3912555, NULL, NULL, '2021-05-27 12:11:17', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3913512, 'Rudbeckia that were smaller', NULL, '2021-05-27 14:00:41', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3916658, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3916668, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3916690, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3916706, NULL, NULL, '2021-05-28 10:33:19', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3916763, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3917765, 'Our sub contractor is no longer available to install this fencing for this for 5 months <br>
 ', NULL, '2021-06-03 11:23:49', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (3917939, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Labor for installing 3 additional low-voltage lights (per client request). Comped by Brian.</div></div>', NULL, '2021-06-09 18:01:31', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3918149, NULL, NULL, '2021-05-30 13:19:16', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3918180, '1 spray zone =$900.00<br>
RTF  230 SF X $33.50= $805.00<br>
Bender Board 64 SF X $8.00= $512.00<br>
Del Rio 1" 99 SF X $6.00= 594.00<br>
5 more 1 gallon lavender X $21.00 = $105.00<br>
<br>
Moving the mulch from the front to the back of the grass in back<br>
Keeping green carpet, moving them to front and putting some lavenders in between<br>
<br>
 ', NULL, NULL, 1, '2021-05-29 10:03:48', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (3918191, '50 sf replacing same pavers after plumbing work was done. <br>
pavers are on site. ', NULL, NULL, 2, '2021-05-29 10:23:24', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (3921035, '10 plants by owner x $10.00. ', NULL, '2021-06-01 09:06:19', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3923153, 'Adding 5 linear feet of countertop for bbq, includes stone veneer facing', NULL, '2021-06-02 08:52:30', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3923945, 'Add linear 51 feet at $21 a foot.  - $1071<br>
<br>
Add 9 linear feet of Belgard Highland Wall 18 inches high including cap  $1457<br>
<br>
 ', NULL, '2021-06-03 11:34:41', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3927200, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3928034, 'Spa/Electrical – 120lf<br>
1. Install 1” conduit from panel.<br>
2. Includes 220v service and 8awg wire<br>
3. GFi and spa disconnect 5ft from spa as required per code<br>
Price $3424<br>
<br>
Only running 1" line rough<br>
120x$20 lnft = $2400<br>
<br>
Credit difference of $1,024', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3929839, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3929912, NULL, NULL, '2021-06-03 09:44:46', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3930285, NULL, NULL, '2021-06-03 10:41:31', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3930761, NULL, NULL, '2021-06-04 08:24:50', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3931412, NULL, NULL, '2021-06-03 15:43:31', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (3933931, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3938139, '2" x 6" brown plastic bender board for protecting fence from concrete pour', NULL, '2021-06-07 10:31:28', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3938151, '3 hours of labor for grinding concrete wall on east side of driveway', NULL, '2021-06-07 10:31:17', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3938173, '68 LF of 1" main line PVC', NULL, '2021-06-07 10:31:00', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3938198, 'Need to add 178 SF of Valley RTF sod (measurement of sod was crooked due to property lines being not straight)', NULL, '2021-06-07 10:30:43', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3938203, NULL, NULL, '2021-06-07 10:29:25', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3941377, 'UPGRADE from 2500 psi to 3000 psi for concrete pour for 1,945 SF

*with either psi, cracks are not guaranteed nor covered by our concrete warranty <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">FYI Brian let me know that 3000 psi is $30/CY more than 2500 psi.  We can offer it, no problem, but with existing contracts we have to give them the option because it is a change order.</div></div>', NULL, '2021-06-08 07:33:17', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3941583, 'Remove Bamboo near front gate and along mow strip on side of driveway', NULL, '2021-06-08 09:02:56', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3941661, 'Outdoor rated switch for basketball court light (to be located near timer)
Wiring is ready, sleeve is ready for Nacho to install.', NULL, '2021-06-09 16:23:13', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3948631, 'Credit for 9 (1 gallons) Sweet grass ''Ogon'' that we did not recieve or plant.', NULL, '2021-06-09 16:23:34', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3948636, '3 (1 gallons) Kangaroo paws (need to know color choice)', NULL, '2021-06-09 16:24:03', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3948648, 'Demo existing concrete 16 x 3 ($295)
7 rectangular stepping stones ($875)
Labor included.
Hauling included.
Dump fees included.', NULL, '2021-06-23 08:49:49', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3948784, 'Max and helper to install 7 high voltage lights on the home exterior', NULL, '2021-06-09 18:01:09', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (3952855, '50 LF of 3” SDR pipe includes materials, labor, trenching and backfill($25/LF = $1,250)
Core through front property line retaining wall ($500)
2 downspout adapters (gutter attachment) - Complementary

9” valve box for the sewer pipe (bring it down and hide it) - ($130)', NULL, '2021-06-15 15:02:01', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3952869, '6 LF of CMU 8” x 8” x 16” retaining wall in backyard with 1’ x 2’ footings
Wall is to be 4.5’ high (approx 54”)
Hand trowel stucco cap - 6 LF
Smooth stucco add on to this wall only - ($260) color TBD

(*Length might change depending on tread of steps)', NULL, '2021-06-23 10:14:19', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3952887, 'Demo existing concrete steps, see photo attached.

(Hauling fees are included and extra if we are mixing loads of concrete with green waste)', NULL, '2021-06-15 13:53:41', 1, '2021-06-10 16:34:20', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (3952901, '7 steps at 4’ wide with 2 1/2” cantilever and 4” tile overlay (see separate change order for tile). 
3000 psi GREY concrete pour
Sand finish on cantilever steps to match existing pavers in backyard. 
Smooth Stucco same as wall - approx 13 SF ($120)', NULL, '2021-06-24 09:28:55', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3952937, 'Add one drip zone, Brass anti-siphon valve, Netafim drip line to back hillside.

Jorge mentioned splitting it down the middle so half on one side and half on the other.', NULL, '2021-06-15 15:01:47', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3954146, NULL, NULL, '2021-06-11 08:20:52', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3954559, '<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif">(10) 1 Gallon plants / Pink Cranesbill                              $22/ea x 10 = $220</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif">(1) 5 Gallon plants / Agapanthus Purple                        $45/ea</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif">(1) 15 Gallon plant / Pittosporum Dwarf Fruitless       $150/ea<br>
<br>
Total: $415</span></span></span><br>
 ', NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3956177, 'Additional 1 1/4” conduit for 75 LF on hillside ($2,475) - (65 LF of conduit is already in the contract)
Wiring only - (6) 12 gauge wiring ($910)
1 sub panel, 100 amp - $250
1 weatherproof outdoor outlet for irrigation timer ($70)
1 weatherproof box with flat cover at top of hillside ($110)
2 breakers ($300)

(4 outlets total: 2 at top, 1 at BBQ, 1 at Irrigation timer) 2 of the 4 were already included in contract)

All electrical to be buried underground.', NULL, '2021-06-17 11:08:17', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3959806, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3959830, 'Add pavers to sidewalk area 32 x 3 (96 SF)
Angelus Holland tumbled<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Takes 2-3 weeks for tumbled to come in. Order once  approved will have to be asap.</div></div>', '2021-06-14 00:00:00', '2021-06-14 09:48:15', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3960021, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3961962, '29 LF of 6” x 6” ACQ Green Timbers for steps and any necessary retaining (on sides of steps nearest top) going up to DG patio. ', '2021-06-14 14:47:00', NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3962405, 'We are not planting
(1) 15g
(2) 5g
(2) 1g

New design for planting has been uploaded to BT', NULL, '2021-06-28 09:03:11', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3966377, '1- 80 LF. Gas line (need to pull permits)  $2,140 plus permit fees<br>
<br>
2- 88 LF. Electrical 5 12 gauge circuits. (no heaters)  (will need to add for outlets and switches depending upon final locations, does not include runs for switches.   $3,254 plus permit fees<br>
<br>
3- waterproof for fire pit area 14lf. x 2 feet high and waterproof raised planter behind bbq. 38lf.x 3 feet high   Use thoroughseal  $870 <br>
<br>
4- extra demo and grading not included in contract plus back fill and compact firepit deck and patio,  planter area behind bbq and patio section.  $2,800 ', NULL, '2021-06-16 11:56:23', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3966404, 'Install 26 up lights with 300 watt transformer Pricing on lights is based on wattage of lights. Lights fixtures we are quoting for wattage is to be under 6 watts. If client wants a higher wattage light fixture price will increase.<br>
<br>
Light Model:<br>
Lightcraft FL-114B MATADOR WALL WASHER', NULL, NULL, 1, '2021-06-23 11:00:32', 'Mohammed Rahman', 'Jorge Flores', 'sold'),
  (3966407, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3966409, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3966414, 'switching from battery operated valve to additional irrigation controller to handle extra zone.', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3966420, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3966452, NULL, NULL, '2021-06-15 16:50:29', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3969182, 'Needed to update design.  2-3 hours. This will be required for the city to approve plans.', '2021-07-09 15:48:16', NULL, NULL, NULL, NULL, 'Nicole Antoine', 'pending'),
  (3969236, 'Demo frontyard and grade, includes hauling. Approx 480 SF ($800)
Mulch - 450 SF of Brown Shredded Mulch www.cmtopsoils.com/bark-mulch ($500)
Plant installation of (1) 15 gallon, (16) 5 gallons, and 9 flats with amendment and compost ($967)
Install concrete “sleepers” (client will purchase) ($400)
Irrigation - Fix timer issue and reconnect drip lines. (If no material, then no cost).  If any material or labor outside of this needs attention, a change order will be submitted)<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Please understand Johnny has attention to detail and wants it done correctly, SLEEPERS first then backfill and add compost.</div></div>', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3972023, 'Total of 265 linear feet of block', NULL, '2021-06-18 18:46:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3974383, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">4 (5g) from top of hillside are not doing well.</div></div>', NULL, '2021-06-17 18:44:43', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3974422, '- Install (2) 15 gallon Birds of Paradise<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Please order from Nick''s Nursery $45 each was my quote</div></div>', NULL, '2021-06-17 18:44:59', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3980874, '1) Install 200 linear feet of main water line and 5 hose bibs.  Install 5 copper risers.  $5,800<br>
<br>
2) Install 22 ln feet of 3 inch drainage.  140 linear feet of 4 inch drainage.  Install PVC inlets. $4,374<br>
<br>
Any additional sewer line, sump pump work etc will be on a different change order. <br>
<br>
 ', NULL, '2021-07-07 17:14:24', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3981323, 'Import 8 yards 50/50 with wheelbarrow to backyard to raise lawn', NULL, '2021-06-21 11:03:26', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3981444, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3981506, 'Lights are from: Light Craft 

Light selection: 9- Led. Fl.113B 6w.
1- 150w transformer ', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (3982431, '140 linear feet ', NULL, '2021-06-28 09:25:43', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3982893, '105 lf border
60sqft pavers', '2021-06-21 13:07:00', '2021-06-21 14:01:27', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3983047, NULL, NULL, '2021-06-21 14:22:23', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3983564, 'We did not pour 25 SF on concrete in corner where block wall meets corner of home. ', NULL, '2021-06-22 12:27:42', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3983691, NULL, NULL, '2021-07-08 09:03:59', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3983867, '<div style="margin-bottom: 16px">
<ol>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Plant about 25ft of Star Jasmine (1 gal) along new fence at the south side of the house plus 2 Ficus (15 gal) at end of fence. Irrigation is there but will need new drips, also gopher baskets. </span></span></span></li>
</ol>
 

<ol start="2">
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Move 4 lavender from back wall to new locations (they are too big for the space). Replace with 4 new Rosemaries (we have the plants).</span></span></span></li>
</ol>
 

<ol start="3">
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">We made a mistake with the side light on the new mailbox pillar. We want to move the wire from the side to the top of the column. Need to remove mailbox to do it. This for Max? Note: we have ordered a new fixture that I can install.</span></span></span></li>
</ol>
 

<ol start="4">
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Add - 6 x 1 gal Geranium Incanum (you supply) to replace existing ferns around water feature (they didn’t make it - too much sun). Use existing irrigation for these and the Rosemaries.</span></span></span></li>
</ol>
 

<ol start="5">
	<li style="margin-bottom: 11px; margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Add - 6 x 1 gal scabiosas (Simon will show us where to plant them.)</span></span></span></li>
</ol>
</div>
', NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (3985581, 'Includes installation&nbsp;', NULL, '2021-06-28 09:25:17', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3985769, 'Moving the drains 1 1/2 feet up from where they are currently located, inside sod area.', NULL, '2021-06-22 09:52:39', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3985781, 'Adding footings and brackets to posts', NULL, '2021-06-22 09:52:55', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (3988093, 'Third crane - $1400.00', NULL, '2021-06-23 16:43:47', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3990030, '3/4" PVC water line with hose bib to be installed at the top of the landing/upper patio. 80 LINEAL FEET.', NULL, '2021-06-23 10:14:31', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (3990807, '32 SF of sod added to contact plus change order from earlier. Total now is 1,440 of sod.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Please see older change orders!!</div></div>', NULL, '2021-06-23 11:33:46', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3992667, 'Plants are NOT installing:
10 - 1g
6 - 5g', NULL, '2021-06-23 22:26:22', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3994241, '1) After measurement verification,   gas line increased to 88 linear feet.  Additional $280<br>
<br>
2) Electrical run was 67 ln feet from panel and 11 additional feet from BBQ to bar top area.  Total of 88 linear feet.    No change in price<br>
 ', NULL, '2021-07-07 17:13:52', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3995176, 'Pour 70 SF of 3000 PSI grey concrete
Sand Finish top cast 1
', NULL, '2021-06-24 14:40:53', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3995205, 'Remove bougainvillea and other plants near mailbox. 
Demo footings of mailbox and prep for new footing.
Remove plants on little landing and grade down.
(*We need to see what is under those plants, sand or dirt)
We will be installing plants here.', NULL, '2021-06-26 00:11:14', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3995294, '1) Additional plants (beyond what is still due per last change order)<br>
<br>
 - 20 dwarf coyote bush, <br>
 - 4 more Pale Leaf Yucca,<br>
 - 20 Matt Rush<br>
 - 5 Acacia   (offsets a couple of dead Westrengia - no charge)<br>
<br>
2) Install Irrigation to those plants<br>
<br>
3) Install gopher baskets to these plants. <br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3995449, '1) Add soils to Pepper Tree - No Charge<br>
<br>
2) Straighten walkway benderboard  - No Charge<br>
<br>
3) Make Yard map  - No Charge<br>
<br>
4) Remove concrete for drain basin.  Add curbing to both sides. (will extend to culvert)  Haul waste to dump.   $2600<br>
<br>
5) Add timber to catch basin far right to hold back wall.   $450<br>
<br>
6) Provide Iron Grate covers and cut and install into concrete basins.  $900<br>
<br>
7) Fix and Bury hoses on hillsides  -  No Charge<br>
<br>
8) Install boulders and rocks along culverts and drain basins.  double head, single Head and 5 inch rock, varied type.    About 6 - 8 tons of rock to be brought in.   $2900<br>
<br>
9) Install more soils for front and pool planters  $300 <br>
<br>
10)  Chaulk and saw cut asphalt road in front to form better planter edges. Haul waste.  $350<br>
<br>
11) Remove 3 inches and final grade for 930 sq feet in front planters to receive rock.  Waste to be hauled to new location on property. $1,860<br>
<br>
12) Install 930 sq feet of weed barrier in the front and staple  $930<br>
<br>
13) Install 930 sq feet of California Gold rock - 3 inches thick for front planter Roughly 9 yards.  $3,720<br>
<br>
14) Trim front trees in front of portable toilets  and haul waster - $850<br>
<br>
15) Install, client provided solar valves and drip systems for upper deck. $520<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (3996148, '750 sqft in contract<br>
675 installed<br>
<br>
75 sqft credit @ 9.95 = $746', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (3997996, 'Scope changed and we are not doing this much turf anymore.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">See updated plans in Current Design folder. 
See other change orders. 
See new job start notes.</div></div>', NULL, '2021-06-25 12:07:26', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3998007, 'Bel Air 92 - Client has sample at house, it was sent via mail from vendor.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">I haven’t seen it this turf its new.</div></div>', NULL, '2021-06-25 12:07:05', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3998017, '1,455 SF of Valley RTF Sod. ', NULL, '2021-06-25 12:06:48', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3998033, '3 Anti-siphon brass valves for grass spray zones.

Not included is main line, this will be determined at job walk $25/Lineal Foot.
', NULL, '2021-06-25 12:05:58', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (3998043, 'demo is included in cost of sod, this is a credit for the turf area which was to be demo.', NULL, '2021-06-25 12:06:30', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4000231, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4000243, 'Remove 2 large cypress approx 20 ft high +
Stump Grind (we will do all stumps on same day for noise reduction)
Haul tree material and pay dump fees', NULL, '2021-06-26 00:10:59', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4000250, 'Complementary per Nicole and Jorge

Wire ($30-40)
Labor (1 hour @ $65)', NULL, '2021-06-26 00:11:34', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4000332, 'We did not use 120 LF of bender board as the client had enough on site to put back in.
Labor was still charged.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4000593, '(5)  15gallon sweet peas to be planted along wall with irrigation emitters. 
2 flats of purple heart (not planted) 

1 flat of star Jasmin (not to be planted) 

Move exisiting bougainvillea to upper slope or front yard. 
', NULL, '2021-06-26 11:07:27', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (4002384, '500sqft', NULL, '2021-06-28 09:23:23', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4005219, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4005363, '(4) 5 gallon plants&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &nbsp; $180', NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4006663, NULL, NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4008177, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4008208, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Upgrading 615 sqft of mulch from brown shredded to small bark nuggets.</div></div>', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (4009353, 'Irrigation in planter beds needs to replaced. Old and pipes are not good. This is for 2 new brass Anti-Siphon valves for the two new drip zones. 

This will ensure all plants are getting  water and will reduce water costs in the long term.', NULL, '2021-06-30 22:18:22', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4009729, 'Additional pavers to 295  <br>
Reduced price from $18.00 to $16.00 per Square Foot 70 SF<br>
Original in contract 225 X $18.00= $4,050.00<br>
Change 295 X $16.00= $4,720.00<br>
Difference $670.00', NULL, NULL, 1, '2021-06-29 18:34:28', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (4009731, '1/2 Man Day trimming tree, pulling weeds and restaking&nbsp;fabric, fabric is existing', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4009736, '81 additional linear feet X $8.00= $648.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4009740, '10 5 gallon plants X $43.50= $435.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4012108, 'Forming for 35 indivual pads, all to be different sizes as per plan. Range from 3x3 to smaller sized pads.&nbsp; Running bond pattern.', NULL, '2021-06-30 11:30:33', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4013453, 'This is for electrical permit. If permit allocation is less than estimated, we will credit you. If it''s under cost, we will submit another change order.

 Once approved we will submit permit info to the city.', NULL, '2021-06-30 15:54:49', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4013697, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4013774, NULL, NULL, '2021-07-02 07:19:41', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4015144, 'Did not need irrigation timer we used her existing one. (It was good)', NULL, '2021-07-01 08:55:43', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4015155, NULL, NULL, '2021-07-01 08:58:27', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4017157, '1,143 SF of St. Augustine sod
2 new Anti-Siphon brass valves for new grass spray zones', NULL, '2021-07-08 11:11:21', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4017392, '3 - 15g Silver Sheen
2 - 5g Spanish lavender
2 - 1g Artichoke agave
2 - 1g Cotyledon orbiculate
2 - 1g Lantana (Rainbow)
', NULL, '2021-07-08 11:10:55', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4018136, NULL, NULL, '2021-07-02 07:19:06', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4018144, 'Demo 4-5" soil below final grade and grade area', NULL, '2021-07-02 07:19:59', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4021174, NULL, NULL, '2021-07-02 19:34:55', NULL, NULL, NULL, 'Melinda Babaian', 'lost');

UPDATE bids b
SET scope_of_work_html      = NULLIF(u.scope_html, ''),
    expires_at              = u.expires_at,
    viewed_by_owner_at      = u.viewed_at,
    bt_attachment_count     = u.att_count,
    bt_attachment_last_date = u.att_last_date,
    bt_attached_by_names    = NULLIF(u.attached_by, ''),
    bt_created_by_name      = NULLIF(u.created_by, ''),
    status                  = u.new_status
FROM _co_v2 u
WHERE b.bt_change_order_id = u.bt_co_id;

COMMIT;
