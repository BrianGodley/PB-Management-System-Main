-- ============================================================
-- CO Backfill — Batch 2 of 5
-- Updates 1,336 bids rows (rows 1337-2672 of 6,676)
-- Sets custom_co_id and scope_of_work_html from the BT CSV.
-- Idempotent: matches on bt_change_order_id.
-- ============================================================

BEGIN;

CREATE TEMP TABLE _co_backfill (
  bt_co_id      BIGINT PRIMARY KEY,
  custom_co_id  INT,
  scope_html    TEXT
) ON COMMIT DROP;

INSERT INTO _co_backfill (bt_co_id, custom_co_id, scope_html) VALUES
  (2840893, 4, NULL),
  (2840963, 5, '18" Tall  Grey Charcoal '),
  (2849757, 6, 'Curb on side of driveway and side of house walkway <br>
Rustic wall block on it''s side. with 8" side at the height side.  2" buried in footing and 6" exposed.'),
  (2849839, 1, 'Bender board as in the plan I gave Fidel on 2-17-20 36 LF X $8.00=&nbsp; $288.00'),
  (2856161, 2, NULL),
  (2859123, 7, 'Deck repair full repair, rebuild see attachment for details, includes paint'),
  (2859265, 1100, 'Original Contract includes (4) outlets<br>
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
 '),
  (2861626, 7, '10 5 gallon Carolina cherry'),
  (2864022, 9, NULL),
  (2864030, 10, NULL),
  (2864492, 3, 'Taking out steppers'),
  (2869351, 11, 'One additional foot of outdoor kitchen'),
  (2870016, 1102, NULL),
  (2871254, 3, 'Dig footings.  Deliver material.   Install rebar  and footings . Install block and grout lift cells   $2875<br>
<br>
Additional bobcat demo -  $490 for equipment rental.  <br>
<br>
$630 Rental charge of forklifts for previous issues on jobsite - No Charge to client. '),
  (2871429, 1105, '6-8 week delivery'),
  (2871435, 1106, '<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><u><span style="font-family: ">Paver and Spa Area   "Adobe Copper Mocha"</span></u></b></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">             1. Install 4” compacted base</span></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">             2. 1” Screed Sand</span></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">             3. 640Sqft Group 1 pavers</span></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">            4. complete with joint sand<br>
<br>
Excavation included in contract</span></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">            </span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">          </span></span></span></span><br>
 '),
  (2871443, 1108, 'Install Bellecrete Wall Cap and Step tread in Coffee Color.<br>
Victorian Style and Smooth Finish for Walls and Possibly steps. <br>
Roughly 130 linear feet.  '),
  (2871453, 2, 'changes contracted driveway from pavers to broom finished concrete with up to 3 bands across driveway filled in with decorative del rio group 1 stone. concrete to be 4" thick under entry bands where triangles are, continuous rebar<br>
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
 '),
  (2872314, 2, NULL),
  (2872934, 4, NULL),
  (2873752, 3, 'credit, we are not doing the garage work'),
  (2875027, 1, '<p>Angelus courtyard stone 616sqft<br>
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
'),
  (2878756, 1110, '1000<br>
<br>
declined by owner'),
  (2879922, 12, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Hi Sandy and Dan,</span></span><br>
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
 '),
  (2880602, 1111, 'This is for adding veneer for step risers.'),
  (2880855, 5, NULL),
  (2882594, 13, '13 linear feet of bench seat in Angelus stone wall ''ll<br>
2 courses with cap. <br>
I nstall fabric to hold back soil<br>
cut pipe 6" and lower 12" <br>
back fill back side of wall with gravel'),
  (2883017, 14, '31 Linear feet of french drain 12" from finish grade to drain 2 percent slope at minimum<br>
Trench away from house 12" and apply 2 coats of Henry''s Tar and 1 layer of bichathene<br>
Set perorated pipe in fabric sleeve and back fill with gravel<br>
 '),
  (2887659, 1, 'Smooth stucco finish
Up to 18" height'),
  (2887677, 2, 'Tie in downspouts 
5 ft of chanel drain'),
  (2888989, 2039251, NULL),
  (2890588, 4, 'Taking out pergola from contract.&nbsp; Will work with Craig Kanga directly'),
  (2890592, 5, 'Setting stucco and concrete top 36"-40" high post wraps/pilasters to match the kitchen <br>
Same color stucco and same concrete top color'),
  (2890996, 1112, 'Extend patio to previous string line location.'),
  (2891001, 1113, 'Add hidden wall down lights around permitter wall.  Spaced every 6 feet.   will be additional 12 lights.<br>
<br>
Note - Step lights will be hidden under mount as well. <br>
<br>
 '),
  (2891089, 4, NULL),
  (2891093, 5, NULL),
  (2891672, 1, 'Front Lawn area  2 zones rain bird pop-ups for future lawn<br>Tie in 3 shrub bubblers for 3  owner installed plants to one of the zones<br><br>Rear Lawn 2 zones rain bird pop-ups .install 8f nozzes on left zone<br><br>Install 1 zone for garden area. With pressure reglator and Y filter . Install  (6) 6-outlett spaghetti  tubing risers Rainbird Emt-6X<br><br>move existing valve and add new valves to left rear corner. And install garden valve<br><br>Rake and remove all rear gravel and dispose<br><br> '),
  (2894008, 3, 'Trench and install 80 linear feet 3/4 conduit<br>
install 5 GFI protected outlets<br>
includes 12/2 wire <br>
see attached design for approx locations requested by owner<br>
does not include permits'),
  (2894020, 4, 'Remove 2 large concrete rocks <br>
install stacked concrete walls shown in picture<br>
includes up to 16hrs labor and (1) lowboy to dispose<br>
grade hills side smooth <br>
<br>
see attached picture showing walls and rock to be removed<br>
<br>
 '),
  (2897116, 1, 'Using clay pavers in light iron spot approved via email and text'),
  (2897767, 5, 'Gas and Electrical permits, include Permit Technician  at the rate of $120hr  includes Drawings, travel and permits running and Permit Fees/costs<br>
<br>
not to exceed $1600 without further approval <br>
<br>
 '),
  (2897897, 15, 'Water main line to fountain. 42 linear feet. X $20.00. Measured by Jorge. '),
  (2897899, 16, '2 new valves. For existing hillside spray. '),
  (2900085, 1, 'DG with stablizer from Ornelas Wood Recovery OWR - no additional charge<br>
<br>
Upgrade to Group 3 Rock  ADD $1512<br>
Arizona River Rock 1/2-3/4 C&M Topsoil<br>
 '),
  (2901977, 1, 'Clean up jobsite remove all trash.<br>
Remove concrete debris. <br>
Remove materials in driveway.   <br>
Remove southern fencing.<br>
Remove footings for existing fencing.<br>
Haul debris to dump. <br>
<br>
 '),
  (2902004, 2, 'Remove 3 trees.<br>
Remove stump for citrus<br>
Stump grind palm base and root system.<br>
Remove green material in backyard.<br>
Remove hedges in front. <br>
Haul waste.'),
  (2902012, 3, 'Add step for grade transition in north corner of house.&nbsp;'),
  (2902054, 4, 'Need to cut additional 2 feet x 10 x 3-8 foot section of soil/hardpan for retaining wall on north side for waterproof and drainage access.<br>
<br>
Grade is 10 inches low in entire north side section.  By northeast corner grade is over 2 feet low.   Need to raise entire grade.  Soils must be compacted in 4-8 inch lifts to 90% proctor for proper stabilization.   Roughly 440 sq feet and 15 yards.   Using all soils from onsite demo of pool deck , wall and front planter.  Any added soils at additional cost. <br>
<br>
<br>
<br>
<br>
 '),
  (2902073, 5, 'Remove roughly 2-3 yards of extra soils in back of pool area.<br>
Backfill all existing open trenches. <br>
Compact trenches in lifts.<br>
 '),
  (2902140, 6, 'Raise back lawn grade 12 inches roughly 500 sq feet.  Must import 16 yards soils and amendments and use 2 yards from onsite.  Roughly 18 yards total.  2 yards of it  from onsite to remain from step grading etc. <br>
<br>
Will bring up soils using conveyors. and wheelbarrows.  420 wheelbarrows and 42 linear feet of conveyors. '),
  (2902160, 7, 'Back fill concrete around posts. Roughly 3/4 of yard.<br>
<br>
Backfill additional non footing areas around posts<br>
<br>
Raise grade of portion of back patio by 6 inches.   Use soils from upper section demo. <br>
<br>
Compact soils in lifts. '),
  (2902379, 8, 'Add additional course and grout lift for Bench seat wall. Contract was 8" need 12 " now.  $390<br>
Add additional bench seat return wall that was not in contract.   $900'),
  (2902419, 6, 'no paint included'),
  (2902830, 6, 'Credited for not applying rock facade to front yard facade.'),
  (2903287, 9, 'Dig footings down 12 inches be low grade. <br>
Form 51 linear feet of curbing. two sides with stake restraints<br>
Release agent on forms<br>
Pour curbing with 2500 psi concrete.<br>
Remove forms when set and finish. '),
  (2905369, 17, 'This is for the planter that is behind the stone wall II.&nbsp; It connects to drainage in pavers and to existing drainage lines in th back taking the water to the street.'),
  (2905474, 18, NULL),
  (2905489, 19, 'Final count <br>
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
 '),
  (2906673, 2, NULL),
  (2910958, 1, NULL),
  (2910972, 2, NULL),
  (2911292, 10, NULL),
  (2911322, 11, NULL),
  (2912620, 12, NULL),
  (2913813, 3, 'See attched updated lighting plan<br>
<br>
Vista Brand LED Fixtures (Group 1) $220ea<br>
(3) Path Lights<br>
(3) Up lights<br>
(3) Well lights<br>
Transformer $660<br>
<br>
Total lights 28x $220 = $1980<br>
Transformer $660<br>
Total lighting package $2640'),
  (2915015, 4, NULL),
  (2915643, 3, 'stepping stones to remain as is&nbsp;'),
  (2919499, 15, '- Install new concrete walkway on slope with swaling/slope for runoff.<br>
- Remove and replace plants as needed for new slope terracing.<br>
- Install 2 new landscape tie walls with two new levels.<br>
- Backfill new terrace and rerun irrigation. <br>
<br>
Payment schedule with be based upon completion of change order.<br>
10% due at 10% completion points of work.  Roughly 2 1/2 weeks of work. '),
  (2919614, 20, '3 posts at $146.00 in materials X 1.4= $204.00<br>
Labor $700.00<br>
$904.00<br>
 '),
  (2919764, 16, 'This is to build the patio cover.   <br>
<br>
Original Price $21,140 in contract.<br>
Plus $950 for material to extend beyond Kitchen win width direction.  Labor covered by Picture Build as post not set early<br>
Plus $1800 for labor and material to extend pergola depth.  (Can be reduced in size and remove this charge, this is elective)<br>
Plus $3400 for permits and engineering.  (Add on per contract)<br>
<br>
Other items not covered for final build<br>
<br>
Prep and Painting of wood. Not covered as mentioned in contract.  $2900  by Picture Build or owner can use his own painter. (Not included in this change order)<br>
 '),
  (2919779, 17, '$400 per garden bed 8x3. Clear Redwoos.  2 courses of 2 x 6 with redwood posts.<br>
$250 per garden bed for backfilling<br>
<br>
3 beds total $1950<br>
<br>
<br>
 '),
  (2920640, 4, NULL),
  (2921869, 8, NULL),
  (2922434, 5, '(7) 1 Gal Sedum Autumn<br>
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
 '),
  (2922764, 3, 'Add<br>
(2) path lights  $440<br>
(1) Up lights    $220<br>
Transplant 2 agapanthus $20 <br>
Set 2 owner provided step stones in concrete in DG area $45<br>
<br>
total $725<br>
<br>
 '),
  (2927066, 13, '1) Extra Demo on Patio Wall<strong> $600</strong>,  Gave discount of $900<strong> </strong>of this extra demo  (3 guys additional day)<br>
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
 '),
  (2929291, 2, NULL),
  (2931115, 21, 'Moving a switch.on the deck'),
  (2931127, 22, 'sealer for the pavers, and curb'),
  (2935920, 18, NULL),
  (2936602, 14, 'Upgrade concrete beds to 6 inches for pool deck, side yard and front walkway.  $4,000<br>
<br>
Upgrade Retaining Wall for Pool Deck to Poured in Place vs Block wall in contract  $4,800.    8 additional man days plus material. '),
  (2938277, 15, 'Front walkway grading removed from scope of work and credited. <br>
Grade was already lowered. '),
  (2938623, 23, 'Waterproofing deck'),
  (2939404, 1, NULL),
  (2939406, 2, NULL),
  (2939410, 3, NULL),
  (2939418, 4, 'No charge to client.&nbsp;'),
  (2939429, 5, NULL),
  (2939437, 6, 'Turf plus additional demo.'),
  (2939516, 7, 'Additional 90 square feet of turf.&nbsp;'),
  (2940484, 4, 'Vista LED GR2216 Black<br>
includes wire and instalation'),
  (2940691, 1, NULL),
  (2940746, 1114, NULL),
  (2940987, 18, 'see attached proposal and plan'),
  (2941102, 1, 'Adding additional 370 SF X $11.00= $4,070.00'),
  (2941532, 16, 'Remove property line trees and roots . - 3 guys one day plus 1 guy another day plus dump fees . - $2400<br>
Extra Demo and Install on property curb wall.  Wall at 2 feet instead of 16 inches - $900 . 2 guys 3/4 day for demo and extra install plus material<br>
Extra Demo on Patio Return Wall return  down to bedrock (not one foot below) . - $250<br>
Added Trenching and backfill with compaction on side yard for gas line - $500<br>
 '),
  (2941567, 17, 'Remove concrete pad and Tile overlay for rear patio. <br>
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
<strong>Add</strong> <strong>$8850</strong>'),
  (2944621, 6, NULL),
  (2944637, 7, NULL),
  (2945307, 2128707, NULL),
  (2945467, 1, '20 additional sqft brick at gate area'),
  (2945468, 2, '30ft additional drains'),
  (2945469, 3, 'Move plants along front entry back to aporox locations'),
  (2948092, 19, 'Engineering for Pergola has been completed. Stamped docs in office.&nbsp;'),
  (2949993, 8, 'Add additional (12) 1 gallon plants and one more 5 gallon.&nbsp;'),
  (2952589, 9, NULL),
  (2952663, 20, '<br>
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
Total $1723  '),
  (2957205, 18, '1) Added course for garden and dowel rebar  $950<br>
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
 '),
  (2957318, 5, 'install 1364sqft tall fescue&nbsp;/ Valley RTF'),
  (2957370, 4, '<p style="margin-bottom: .0001pt; line-height: normal"><b><u><span style="font-size: 12.0pt; font-family: ">Lawn </span></u></b><b><span style="font-size: 12.0pt; font-family: ">– 370Sqft</span></b></p>

<p style="margin-top: 0in; margin-right: 0in; margin-left: .75in; margin-bottom: .0001pt; text-indent: -.25in; line-height: normal"><span style="font-style: normal; font-variant: normal; font-weight: normal; line-height: normal; font-size: 16px"><font>1</font></span><span style="font: 7pt">    </span><span style="font-size: 12.0pt; font-family: ">install 1-zone Rain Bird Pop-up<span>  </span>Irrigation</span></p>

<p style="margin-top: 0in; margin-right: 0in; margin-left: .75in; margin-bottom: .0001pt; text-indent: -.25in; line-height: normal"><span style="font-size: 12.0pt; font-family: "><span>2.<span style="font: 7.0pt">     </span></span></span><span style="font-size: 12.0pt; font-family: ">Apply topsoil or soil amendment and rototill</span></p>

<p style="margin-top: 0in; margin-right: 0in; margin-left: .75in; margin-bottom: .0001pt; text-indent: -.25in; line-height: normal"><span style="font-size: 12.0pt; font-family: "><span>3.<span style="font: 7.0pt">     </span></span></span><span style="font-size: 12.0pt; font-family: ">Install Valley RTF Tall Fescue lawn</span></p>

<p style="margin-top: 0in; margin-right: 0in; margin-left: .75in; margin-bottom: .0001pt; text-indent: -.25in; line-height: normal"><span style="font-size: 12.0pt; font-family: "><span>4.<span style="font: 7.0pt">     </span></span></span><span style="font-size: 12.0pt; font-family: ">Includes 55ft Bend-a-Board edging </span></p>

<p style="margin-top: 0in; margin-right: 0in; margin-left: .5in; margin-bottom: .0001pt; line-height: normal"><b><span style="font-size: 5.0pt; font-family: "> </span></b></p>
<b><span style="font-size: 12.0pt; line-height: 115%; font-family: ">Price $2677 </span></b>'),
  (2957371, 5, '1. install 4" compacted base<br>
2. 55ft bender board<br>
3. install group 1 sythetic lawn - 370sqft<br>
includes sand infill '),
  (2957372, 6, '<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><u><span style="font-size: 12.0pt"><span style="font-family: ">Lawn </span></span></u></b><span style="font-size: 12.0pt"><span style="font-family: ">– 570sqft</span></span></span></span></span>
<ol>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="font-family: ">Rake back existing rocks and grade</span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="font-family: ">Install 1-zone Rain Bird pop-up sprinklers</span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="font-family: ">Apply topsoil or amend existing and rototill</span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="font-family: ">Install 90ft bend-A-Board edging</span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="font-family: ">Install RTF Tall Fescue</span></span></span></span></span></li>
</ol>
<br>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12.0pt"><span style="font-family: ">Price   $3565</span></span></b></span></span></span><br>
 '),
  (2957373, 7, '<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><u><span style="font-size: 12.0pt"><span style="font-family: ">Lawn </span></span></u></b><span style="font-size: 12.0pt"><span style="font-family: ">– 489sqft</span></span></span></span></span>
<ol>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="font-family: ">Rake back existing rocks and grade</span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="font-family: ">Install 1-zone Rain Bird pop-up sprinklers</span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="font-family: ">Apply topsoil or amend existing and rototill</span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="font-family: ">Install 60ft bend-A-Board edging</span></span></span></span></span></li>
	<li style="margin-left: 32px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="font-family: ">Install RTF Tall Fescue</span></span></span></span></span></li>
</ol>
<br>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12.0pt"><span style="font-family: ">Price   $3041</span></span></b></span></span></span><br>
 '),
  (2957376, 8, 'Trench and install 3" sdr drain pipe , connect downsputs and install Atrium inlets where necessary, core curb<br>
permits not included'),
  (2957377, 9, 'rake back rocks, and move to other side, <br>
grade and excavate up to 3 yards soil'),
  (2961453, 19, 'Demo footing for curb wall and haul. <br>
<br>
Install 30 linear feet fo curb wall.  Will be roughly 24 inches in height.  Footings plus block courses plus rebar.   $4300<br>
<br>
Post anchors for both curb walls on south side of property.   18 total  $380.  No Charge for labor.'),
  (2961486, 1, 'Demo out concrete pad and haul $380<br>
<br>
Demo out concrete and pour newer section of pad in front of steps.  5 ft deep by 10 feet wide.  $600<br>
<br>
Outdoor kitchen change from contract.   Kitchen doubled in size normally additional $9000+ per contract. <br>
<br>
Gave client $4000+ discount - New price $5000.'),
  (2962872, 1, NULL),
  (2963986, 2, 'Brought price down from $25.00 to $15.00 because trenches were open.'),
  (2963997, 3, '45 SF of Veneer on outdoor kitchen X $21.00= $945.00'),
  (2964380, 8, 'LADBS permit costs $158.05<br>
Permit Technician costs, drawing, permit drawing, paperwork submittal @ $120hr x 6hrs = $720<br>
<br>
Total $878.05'),
  (2964425, 7, 'Drawing and working with Engineer<br>
and additional time spent at LADBS over previous permit allowance <br>
@$120hr 8hrs = $960'),
  (2972086, 9, 'Original Contract budget $4507<br>
additional plants per this design $5303<br>
total additional costs $796<br>
<br>
After Delivery ,Plants are subject to 20% restocking fee + $65hr to return and exchange for a different variety <br>
plants below wholesale quality will be exchanged at no charge'),
  (2973384, 4, 'Not installing 135 Square feet in the coverd patio area 135 SF X $12.00= $1,620.00'),
  (2973549, 10, 'frame and install 200Sqft m babbo0 composite decking between front dor and garage area,&nbsp;'),
  (2973586, 11, 'Install 10ft bamboo composite horizontal fence with 2x2 powder coated steel posts  $2200<br>
Install 13''6"  double swing composite gate with metal frame $3567<br>
Material Delivery charge $249 for materials ordered after (4/21) <br>
<br>
Total $6016'),
  (2973751, 12, 'at pool area, excavate and grade as necessary<br>
install 4" compacted base<br>
install 733Sqft group 1 synthetic lawn'),
  (2974210, 13, 'Change all Fencing and deck skirt from IPE Bamboo Composite                                                 -$506<br>
lower block wall at bench from 4ft to 3ft and add 2ft Composite horizontal fencing above             +$1288<br>
Curb wall along fencing add 8" a total height to of 1.5ft                                                                  +$1120<br>
lower fencing from 7ft to 5.5ft                                                                                                           -$2400<br>
Gate will be (2) swing gates a total of 6ft, per discussion with George                                               n/c<br>
                                                                                                                                    Fence Credit $498<br>
 '),
  (2974258, 5, '65 Linear feet of Belgard 2 courses of block, 1 cap 15" high X $86.00=  $5,590.00<br>
Takiing out 65 square feet of pavers to replace with the bench seat next to the planter in the back  65 SF X $12.00=-- $780.00<br>
Final Cost:  $4,810.00<br>
Same as front walls <br>
Belgard Bel air Toscana block 2 courses and cap'),
  (2974440, 20, '<br>
1) Add another course left side of stairs and additional 4 anchors- $475 <br>
2) Added drains in patio area 21 linear feet. - $460<br>
3) Back fill of walls and compaction in 6 inches fill lifts per inspector request for patio walls and north retaining wall.   Method brings soils only down to a 2 - 3 inch compacted layer resulting in 18-20 separate lifts for patio wall and 32- 40 lifts for north retaining (all not in contract)  Took 2 guys 6 entire days to backfill and compact.  $6000<br>
4) Reroute french drain behind north wall  $240<br>
5) Repair french drains interrupted by gas line for north side of property 1 guy almost full day $400<br>
6) 24 linear feet of drainage north side from large wall to front of property.  $520<br>
<br>
 '),
  (2975440, 19, NULL),
  (2976771, 2, 'Taking out the #10 in the back Melaleuca&nbsp;gunguenervia&nbsp;15 gallon'),
  (2977424, 21, 'Add benderboard in lawn area for tree.<br>
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
 '),
  (2978642, 1115, NULL),
  (2978671, 2, NULL),
  (2983567, 14, 'Price difference on turf $228.75

Add play ground pads $343.

Additional labor $260.'),
  (2984832, 3, NULL),
  (2985334, 1, 'Remove Expand Mulch bed   - 2075<br>
Remove Bubbling Vase.         - 1800<br>
Remove Pebble for Vase        - 250<br>
<br>
Additional Turf for New Layout.   +780<br>
 '),
  (2988935, 15, 'install 15 gallon lemon tree ,<br>
owner to show crew where to plant<br>
 '),
  (2989222, 1, NULL),
  (2993003, 2, NULL),
  (2993005, 3, NULL),
  (2993569, 21, NULL),
  (2995882, 4, NULL),
  (2996116, 4, 'Approved via text '),
  (2996447, 6, 'To rebuild the wall that was taken down for the pool install.  8 linear feet long, 8 LF of footing X $58.00 , 8 courses high X $13.00=$162.00 X 8 linear feet= $1,296.00<br>
Slump Stone to match adjacent existing wall.'),
  (2996458, 7, 'takingout jar founatin'),
  (2997228, 8, 'Rough irrigation was already installed, final irrigation not installed taking out of contrazct, however, she has an option to add for $1,500.00 to finish emiters, lines and connect to controller'),
  (2997242, 9, 'Reducing the lights to 5 pathlights X $225.00= $1,125 + Transformer $400.00= $1,525.00<br>
In contract  $3,775.00 - $1,525.00= $2,250.00'),
  (2997563, 1, NULL),
  (3000197, 2, 'approved by text to george<br>
<br>
19lf 1" main line'),
  (3000233, 6, '<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 9.0pt"><span style="background: #f7f7f7"><span style="line-height: 115%"><span style="font-family: "><span style="color: #626262">1- reset 3- 24"x24" pavers and add 3 more (see images </span></span></span></span></span></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 9.0pt"><span style="background: #f7f7f7"><span style="line-height: 115%"><span style="font-family: "><span style="color: #626262">2- cut and remove about 6 inches of sod and and dymondea (see images) </span></span></span></span></span></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 9.0pt"><span style="background: #f7f7f7"><span style="line-height: 115%"><span style="font-family: "><span style="color: #626262">3- remove about 6 inches of of mulch and add dymondea (see images) </span></span></span></span></span></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 9.0pt"><span style="background: #f7f7f7"><span style="line-height: 115%"><span style="font-family: "><span style="color: #626262">4- remove 7 plants and replace with calandrinia(see images)</span></span></span></span></span></span></span></span><br>
 '),
  (3001169, 2, NULL),
  (3002405, 5, NULL),
  (3003139, 16, '<table align="left" style="width: 630px; border-collapse: collapse; border: none; margin-left: 10px; margin-right: 10px" width="630">
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
'),
  (3003569, 6, '120sf of Siberian Tundra - L70112241U - (size 12"x24")<br>
 '),
  (3004023, 1116, '1 additional wall light Vista 4260 LED / Bronze $195.00<br>
Labor to take out one wall cap, run addition wiring, install new cap (customer provided), electrical hook up. $477.00<br>
<br>
672.00'),
  (3004416, 10, '$1.00 more for 312 Square Feet&nbsp;'),
  (3004472, 11, NULL),
  (3004474, 12, '65 square feet less'),
  (3004475, 13, '99 linear feet in contract final measurement was 56 LF= 43 LF Ft less X $8.00'),
  (3004481, 14, '66 more LF of drainage X $15.00&nbsp;&nbsp;'),
  (3004645, 15, 'Install a gazebo kit from Costco '),
  (3006417, 2, NULL),
  (3006467, 3, 'Credit for valve and 1 station timer'),
  (3006785, 22, '13 yards of dirt @25/yard -325<br>
credit of labor -2000<br>
 '),
  (3008367, 1, NULL),
  (3009405, 4, 'Complete additional 2x8 pressure treated wood to rear property line'),
  (3009411, 5, 'Upgrade from standard infill to pet deodorizer type infill for pets'),
  (3010518, 22, 'Add:<br>
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
 '),
  (3012635, 23, '180 ln feet of sdr 35 drain.&nbsp;'),
  (3012637, 24, '16 LF. On landing plus 9 LF. On stairway'),
  (3012640, 25, 'Forming add rebar pour concrete 9 feet in length 8 inches high and 6 inches wide'),
  (3014155, 1, NULL),
  (3016671, 5, 'Wood has to be upgraded per city requirement.<br>
<br>
Adding full 4x4 trellis on top. '),
  (3016677, 6, 'Remove planting from contract.&nbsp;'),
  (3019267, 1, NULL),
  (3019849, 7, NULL),
  (3019851, 8, NULL),
  (3020493, 7, NULL),
  (3020495, 8, NULL),
  (3020672, 2112782, '(3) 15 gallon<br>
(1) 5 gallon'),
  (3022158, 9, 'Needed to order more tile for front entry.&nbsp;'),
  (3022287, 1, 'Lion Premium Grill Appliances:<br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: ">L75000 grill $1,495</span></span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: ">Double door $294</span></span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: ">Refrigerator $299</span></span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: ">Refrigerator Frame $69<br>
***Total + Tax: </span></span></span></span>$2,324.17<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10.0pt"><span style="font-family: ">Curbside delivery $220<br>
Total + Tax + Delivery: $2544.17</span></span></span></span><br>
 '),
  (3023729, 10, 'For additional electrical for switch for BBQ light.'),
  (3027709, 2, '1 crew man a full day, please see Jorge for details'),
  (3027732, 3, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">However, here is the cost that I anticipate:</span></span>
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
 '),
  (3030678, 2, 'Replacing (5) 5-Gallon Buganvilleas with (5) 15-Gallon Podocarpus Gracilior<br>
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
 '),
  (3030683, 3, 'Kitchen on contract 11''   <br>
Reduces to 9''8"                               Credit of $750<br>
<br>
Other contractor installed valves     Credit of $400'),
  (3032032, 26, 'Add 90 linear feet of additional concrete curbing.<br>
<br>
Form,<br>
Rebar,<br>
Pour,<br>
Top Cast Finish<br>
<br>
Curb to be 6 inches wide and 14 inches tall. <br>
<br>
 '),
  (3033102, 1, 'Crew to remove additional square footage for property.  Clean sides not in contract. <br>
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
 '),
  (3034169, 1, NULL),
  (3034474, 2, 'Difference in price from contract and changes in newest addendum'),
  (3037007, 3, 'Takin out 600 SFof gpoher mesh'),
  (3037095, 2112783, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">2-1/2 yards of Cedar shredded mulch </span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">5-1/2 yards of Gorilla hair </span></span></span>'),
  (3043736, 3, NULL),
  (3043975, 1, '2 baskets of Santa Barbara Light at 3,000 pounds each, $550.00 each&nbsp;&nbsp;'),
  (3045326, 4, 'This is for excvation of soils behind 4'' average wall, 14 linear feet long<br>
Waterproofing with 2 coats Henry''s Tar,<br>
Installing french drain with sleeve and backfilling with gravel<br>
Connecting to new drain line under pavers.'),
  (3045831, 2, NULL),
  (3048165, 1, 'not removing a tree'),
  (3048697, 2, 'Changing the 220 wiring to sleeve only credit  $390.00, 30 LF X $13.00<br>
Adding in 3 outlets  3 X $80.00= $240.00<br>
110 wiring 3 locations:<br>
37 Linear Feet on the side of house<br>
22 Linear Feet in the back yard<br>
4 Linear Feet in front<br>
63 total Linear Feet X $21.00= $1,323.00  <br>
Total $1,563.00 - $390.00 Credit for not including wiring= $1,173.00'),
  (3051639, 1, NULL),
  (3054058, 2, NULL),
  (3054226, 27, 'Front Yard<br>
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
- 4 man whole day install steel posts for fencing  $2,000'),
  (3055962, 28, '- (10) 4" pour in drain inlets     $300<br>
- (3) 9" pour in for skimmers    $350<br>
- (2) 6" pour in for cleanouts    $280'),
  (3056044, 2, '52 linear feet at $25.00 a Linear foot, we are building the wall and most of it will be open trench for installation'),
  (3056045, 3, '202 Squre Feet X $11.00 all bobcat accessable or over lay with limited demo'),
  (3056047, 4, 'Taking out the removal on 1 tree'),
  (3056058, 5, 'Behind Veg wall, we are water proofing and it''s open already'),
  (3056071, 3, '15 lf X $21.00'),
  (3056075, 4, 'Drainage $21.00 LF X 55= $1,155.00<br>
3 pop ups X $25.00= $75.00<br>
$1,230.00'),
  (3056197, 1, 'change concrete from 260sqft to 75sqft concrete   SUBTRACT -$1000<br>
<br>
Remove (5) 5 gallon plants from planting @ $45ea =SUBTRACT -$200<br>
<br>
Add 40ft Drains and core curb ADD + $1100<br>
<br>
Increase Decomposed granite from 425sqft to 665sqft  ADD +$1200'),
  (3058666, 29, NULL),
  (3058674, 2, 'Install Febco Backflow system. <br>
Rework Main copper line.<br>
Install Main Line Shutoff Valve<br>
Install 580 linear feet of Main Water Line to supply Valve Stations  (Valves forward covered in contract)<br>
<br>
Originally $9800'),
  (3061480, 30, NULL),
  (3062772, 1, 'Replace 3 zones. Valves . Reconnect as needed. Includes sleeves across driveway'),
  (3064009, 1844185, NULL),
  (3066419, 3, '2 pots $311.38<br>
String lights for the Trellis $54,75<br>
Cost of irrigating the posts $250.00<br>
Total $616.13<br>
 '),
  (3066986, 1, 'from group 1 tile t group 10 <br>
MARF235 2X2  with white grout'),
  (3067467, 1, '<br>
Upgrade standard 300 watt transformer to Bluetooth dimmable transformer <br>
included installation and setup <br>
<br>
<br>
 '),
  (3067473, 2, 'Permits for Gas line at the rate of $120hr plus city permit fees<br>
not to exceed $1000 without further approval'),
  (3067506, 3, '(4) well lights  black @ $220ea x4= $880                              pn 5262<br>
(6) up-lights composite  @ $220ea x6=$1320                       pn 5280<br>
(1) Path lights     Black    @ $220ea                                     pn 5202<br>
Transformer "Bluetooth 300 watt"     $845                            pn VPRO2<br>
<br>
Total $3265'),
  (3073723, 2, 'Owner accepts Marf235 tile as installed<br>this is a no charge upgrade<br><br>Approx 50ft of coping was found "hollow" potentially loose. Owner declines repair of these existing copings<br><br>Picture build will grout one piece of coping at no charge'),
  (3075348, 31, 'no gas valve, fire ring or lava rock provided'),
  (3075350, 32, NULL),
  (3075378, 33, 'garden wall for northside, taller than contract, change from block to poured in place with inspections - 3900<br>
waterproofing - 600<br>
french drains - 400<br>
<br>
 '),
  (3078052, 1, '1) Raise Driveway Wall to take out grades being to high behind wall.<br>
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
 '),
  (3079585, 2, '8) Poured in place Wall Cap.  Remove some portion of existing stone capping.  Remove top layer of veneer stone to allow for form boards. Install forms and pour cap.  Remove Forms and finish.  Color TBD.  Straight edge.  321 Linear footage included.   Does not include footage for under fencing as requested.<br>
 '),
  (3080715, 4, '(4) Well lights  - WAC   PN  5031 - 27BBR 9-15 VAC  - Bronze on Brass -  set in pavers - color changing @ $334ea x4= $1336<br>
(6) Up-Lights - WAC     PN  5011 -27BBR 9-15 VAC  - Bronze  on Brass -   Landscape  -  color changing @ $302 ea x6 = $1812<br>
Vista Low Voltage Transformer  $650<br>
<br>
Total $3798<br>
<br>
<br>
with the WAC lighting you can control each light and turn them ALL off directly and adjust colors, no need to upgraded bluetooth  transformer'),
  (3082045, 2, 'Upgrade (2)  Gates from 4x5ft square steel frame to 4x5ft with with round top<br>
<br>
ADD $1650<br>
 '),
  (3082405, 5, '424sqft group 1 3/4" crush gravel 3" thick<br>
installed $1423<br>
<br>
3/4 crush Palm springs Gold or landscape rock 1" '),
  (3087488, 3, NULL),
  (3088836, 4, 'Does not include demo'),
  (3088934, 5, NULL),
  (3089627, 4, 'Credit for removing this portion of job from project.&nbsp;'),
  (3092153, 1, '<br>
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
 '),
  (3093347, 2, 'Stump grind 2 stumps
Remove and dispose of concrete by gate '),
  (3093353, 3, 'Add 4 steps overlays from 9 to 13 steps
Add 4  step lights '),
  (3094679, 6, '424 sqft <br>
3'' thick<br>
includes<br>
mexican pebble 3/8-5/8 <br>
prime montana<br>
prime black mix<br>
mexican beach pebble  1/4"-1/2" <br>
 '),
  (3094868, 34, 'The entire west side of the lot and the south side of the lot from the bottom of the steps until it meets the west (rear) will be fenced in ipe on the side of the posts facing the house with clean cuts that are precisely aligned for visual impact, and both iron gates and frames proving access to the rear yard will be fenced in ipe on both sides. Owner will provide the ipe, penofin oil, penofin cleaner, and screws for the fence, which will be unloaded from the delivery truck and installed by Picture Build. All cuts and holes will be sanded, and the ipe will be cleaned before oiling using Penofin. The Penofin Oil will be brush or rag applied on all four sides, all end and other cuts and holes (unless Owner supplies a wax treatement for the end cuts), and otherwise applied in accordance with the manufacturer’s instructions. All ipe will be protected from the sun and kept off the ground until installation in a manner that allows the wood to breathe..<br>
<br>
The wood fence framing will be GCB-, which will be provided by Picture Build and installed as follows:<br>
(1) two 2x2 GCB on each post (one installed on each flange of the post) for attaching the ipe;<br>
(2) a 2x4 horizontal top rail and a 2x4 horizontal bottom rail between each metal post, with another 2x4 installed vertically between the top and bottom rail at the midpoint between posts;<br>
(3) the reverse side of each metal post (the side facing the neighboring properties) will have a 1x6 GCB- covering the metal. All GCB- cuts to be treated (copper brown treatment).'),
  (3097113, 35, 'Finish side block curb to match back.  - $350<br>
Raise concrete step wall in front - $2000<br>
Waterpoofing and Backfilling front - $5000 <br>
Added drain line firepit area - $200<br>
Added French Drain front 59 linear feet $1180<br>
Added regular drain freont 37 linear feet $740<br>
Added electrical work for firepit for phone activation $200<br>
<br>
 '),
  (3097609, 9, NULL),
  (3097617, 10, NULL),
  (3097623, 11, NULL),
  (3097772, 5, NULL),
  (3097823, 17, 'Upgrade from shredded mulch to "Gorilla hair"; <br>
950sqft '),
  (3105921, 6, 'Demo wall and frame out closet opening. $1,900<br>
Break out slab footing<br>
Epoxy and dowel.<br>
New footings.<br>
Block wall to three feet.<br>
Water proof. $3,200'),
  (3106108, 6, 'Two Days Bobcat Grading -  $2200<br>
One Man Day,  Trenching Back filling and compaction as a part of grading $480<br>
<br>
Extra soils movement, backfilling and grading not covered in grading plan: <br>
<br>
1) Entire Lawn area had to be cut and raised to get better slope. <br>
2) Remove large soils deposit and spread soils in back to provide better grade.<br>
3) Backfill and Compact open trenches including sewer lines. <br>
4) Need to still adjust back grade behind pool wall for pathway and planters levels now requested.   <br>
<br>
Pricing to be assessed after final determinations.'),
  (3106342, 7, 'Install 4 foot timber section, near southwest drop off - 3 feet in height. <br>
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
New total is $19,950</strong>'),
  (3108351, 1, NULL),
  (3115074, 7, 'Upgrade from Tan Decomposed Granite to gray'),
  (3117208, 1, 'Credit of $450.00 kitchen demo, it was already done<br>
Credit of $375.00 in drainage in contract<br>
adding in total of 60 linear feet of drainage at $20.00 $1,200.00<br>
Total  difference $375.00'),
  (3117437, 36, '- Remove 2 feet of high soils. Haul soils. - $1400<br>
- Demo out area down to 6 to 9 feet beyond new grade to get to bedrock - contract states 4 feet. Additional 22 yards - $2700<br>
- Pour new footing at 18 inches to 3 feet deep   contract states 4 inch pad.  added forming and additional 10 yards of concrete -   $1900<br>
- Form new poured in place walls vs block. Walls are 4 and 5 feet in height vs 3 feet in contract - $900  added material plus $8500 added labor - changed to $6500<br>
- Pour new storm garden wall. Extra material $1700 (minus block credit of $400) $1300 for concrete and pumper.  3 guys additional crew day for pour and strip forms. $1500<br>
<br>
Does not include waterproofing or backfilling or additional compactions. <br>
<br>
 '),
  (3119684, 5, '<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12.0pt"><span style="line-height: 107%"><span style="font-family: ">18lnlft * $35 = 630<br>
<br>
Run Gas Line:</span></span></span></b></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12.0pt"><span style="line-height: 107%"><span style="font-family: ">Need to disconnect existing gas line <a name="_t8t10adzm43p"></a></span></span></span></b></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="line-height: 107%"><span style="font-family: ">Total LF to be determined</span></span></span></span></span></span>
<ol>
	<li><span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><a name="_wshgterpo1h1"></a><span style="font-size: 12.0pt"><span style="line-height: 107%"><span style="font-family: ">Unit price $35 per LF, </span></span></span></span></span></span></li>
</ol>
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><a name="_im4qt2iu7job"></a><span style="font-size: 12.0pt"><span style="line-height: 107%"><span style="font-family: ">Picture Build is not installing the outdoor kitchen now</span></span></span></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12.0pt"><span style="line-height: 107%"><span style="font-family: ">New BBQ is not assembled by Picture Build, there will be additional cost if Picture Build is to assist in the hook up.</span></span></span></b>  </span></span></span><br>
 '),
  (3119883, 6, NULL),
  (3119885, 7, NULL),
  (3119886, 8, '122 SQFT<br>
<br>
 '),
  (3121788, 2, '<a href="https://buildertrend.net/DailyLogs/DailyLogsList.aspx#">7-6-2020</a> <br>
<strong>Added By: </strong>Verva Gerse<br>
Paver and Outdoor Kitchen change order and notes: Adding 41 SF of Pavers Outdoor kitchen adding 1. 7 linear feet 2. 1 additional GFI in back of U shape total of 2 GFI inside the kitchen and 2 external, includes addiing the linear feet for the gas line that is necessary for the grills in the extended area. 3. Make sure there is an electrcial conduite from the kitchen to the fire pit for the firepit light and switch at kitchen 4. Watch for the copper pipe by steps, too high for pavers 5. Remember to move sprinklers over 6. the Side of the kitchen closest to the fire pit is 6" lighter and cantilevered<br>
<br>
Price at 7 linear feet X $680.00 with gas line included, electrical outlet, and 41 additional feet of pavers.<br>
Total for Change Order: $4,760.00'),
  (3123000, 2, NULL),
  (3123723, 7, 'Remove soils in 204 linear feet of trenches.<br>
Recompact soils in lifts 204 linear feet of trenches.<br>
Install soils in another 135 linear feet of open trenches. Compact in lifts.<br>
<br>
Remove 30 linear feet of drain.  Reinstall with proper glued joints. Replace damaged section of pipe.<br>
Trench out triple wall drain line across driveway.  Remove and replace with SDR 35 with. primed and glued joints. <br>
<br>
Dig out soils from rear sidewalk area.  (already removed 5 yards of material from section.  Will have additional soils for to remove for dumping later not covered in this change order)'),
  (3124173, 4, 'Install new irrigation valve and 15ft of pipe'),
  (3125951, 18, '65inx70 pre-hung swing doors "outside swing"<br>
2-mascinite solid core 1-3/4 in thick<br>
5in jams<br>
4in hinges<br>
oak sill<br>
bottom door sweep<br>
weather stripping<br>
flush bolt<br>
paint by owner'),
  (3129115, 3, NULL),
  (3131038, 2, 'Take newly installed Turf out, Dig about 2" and install "Mexican Mix 1/2-1" Gravel" - $0 (No charge - Warranty issue)<br>
Add same gravel to planters - labor + material (tax and delivery included) - $1,100.00'),
  (3131902, 12, 'Per client request<br>
<br>
Additional 50 linear feet of corners @ $10.49 per foot   - $576.95 w/tax<br>
Additional 78 square feet of flat veneer @7.25 per sq foot - $622.11 w/tax<br>
<br>
Total'),
  (3131974, 37, 'Backfill lower two planters next driveway<br>
Backfill gravel on and behind storm garden<br>
Have to be installed via buckets<br>
10 yards in total. - $3200 5 guys one day plus gravel cost. (if takes less time will credit on other invoice)<br>
<br>
Credit 3 yards in original contract (960)<br>
<br>
Waterproof large storm garden - $1900 3 guys one day plus material<br>
Waterproof lower planter beds  - $950 3 guys half day plus material<br>
 '),
  (3134251, 1, NULL),
  (3134322, 3, '
34 LF X $35.00= $1,190.00

Electrical Line 19 linear feet, in contract we were to use the existing, we needed to add new conduite from the house, priced at $22.00 = $418.00

Water line included

$1,608.00
'),
  (3137170, 12, 'Extend Garden Beds and DG path by 7 feet. $1400<br>
Add return wall to side of walkway $275<br>
Fix out of Level Section of Garden Wall - No Charge<br>
Add 2 spot lights to back, Run new circuit from Transformer. $500<br>
Change out 20 1 gallon plants in back. - No Charge<br>
Add 3 bags of lava rock - $90<br>
Paint Extended Garden Beds - $290<br>
<br>
<br>
 '),
  (3145653, 8, 'Rework existing drains again for drainage to a/c units and planter beds.<br>
<br>
Re run water mains.<br>
<br>
2 guys 1 day'),
  (3151085, 4, NULL),
  (3151109, 1, NULL),
  (3151149, 2, NULL),
  (3151220, 5, NULL),
  (3152303, 38, 'additional sqft from original bid. compromised on splitting cost. - per jorge'),
  (3152627, 3, 'Client kept extra material.&nbsp;'),
  (3152660, 4, 'We are to stucco 2 walls on both sides of house 

Wall 1 on bbq side 32''x9'' 
From retaining wall towards front yard

Wall 2 opposite side from retaining wall towards front yard 48''x6'''),
  (3152774, 2, NULL),
  (3158101, 1, NULL),
  (3163962, 2, NULL),
  (3164908, 5, 'Includes (2) transformers.  Please ensure enough wattage capacity. <br>
 '),
  (3169838, 2, NULL),
  (3169930, 5, NULL),
  (3170824, 39, NULL),
  (3170832, 6, '52 SF x $15.00= $780.00'),
  (3170844, 7, '30sf x $15= $450.00 + $250.00 trench and backfill. $700.00'),
  (3170857, 8, '37 of x $25.00= $925.00 + $125.00 box. $1,050.00 total '),
  (3172522, 9, 'Driveway extension wall: -remove existing wall and up to 2 feet of soils -Haul away     $600.00 -20 linear feet of new footings $80.00, 3 courses or average of 18” high in matching Angelus Block,  $45.00, and waterproofing 2 coats of henry’s tar $20.00=   $145.00 a linear foot X 20 LF= $2,900.00 Total:     $3,500.00   <br><br>Brick cap on existing wall -remove existing cap, and prep for new cap $10.00 -Thin set new brick cap, soldier’s course -Grout brick as in existing  $15.00 $25.00 for 53 linear feet, 19 on the side, 34 lf in front Total:  $1,325.00<br><br>  TOTAL:  $4,825.00  <br>Please respond with any change/ your approval. Thank you!     Verva Gerse Picture Build Cell : 818-419-8326 www.picturebuild.com verva@picturebuild.com   ?Virus-free. www.avg.com Okay,   we approve. Please move forward with this. thanks Rick and Jennifer. Show quoted text Thank you will do. <br><  kingsarenum1@aol.com><  verva@picturebuild.com><  kingsarenum1@aol.com><  mkingjqueen@sbcglobal.net><  verva@picturebuild.com> (There will be a few more pavers, however, as agreed, we will not charge more or less than we have actually installed.  We can do a new count at the time of paver installation, and discuss.  It will be approximately 40 additional SF of pavers.)  <  /verva@picturebuild.com><  /mkingjqueen@sbcglobal.net><  /kingsarenum1@aol.com><  /verva@picturebuild.com><  /kingsarenum1@aol.com>'),
  (3172726, 1, NULL),
  (3173302, 9, NULL),
  (3177682, 1, '<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><u><span style="font-size: 10.0pt"><span style="font-family: "><span style="color: #26282a">Cleanup/Grading/Demo</span></span></span></u></b></span></span></span>
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
 '),
  (3177686, 6, 'demo/remove Decomposed granite except side yard to 3" depth and dispose <br>
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
 '),
  (3181268, 3, NULL),
  (3182633, 7, NULL),
  (3183041, 10, '<ol>
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
See attached drawing and cabinet data.'),
  (3183053, 11, 'Removing portion of work for change order #1&nbsp; - wall size increase.&nbsp;'),
  (3183061, 12, 'Client provided some fencing material for contract.&nbsp; Mitch gave us a credit of&nbsp; $650 passing this credit on to Fermin.&nbsp;'),
  (3183173, 40, 'Original Contract included 9ft x 30 inch CMU wall and 24 ft x 8 inch block curb wall.  $1530 dollar credit.<br>
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
 '),
  (3183177, 41, 'Electrical&nbsp;demo and other work only took 1 day instead of 2.&nbsp; Credit 2 man days.&nbsp; $1000'),
  (3183204, 13, 'Dig out section per plan and haul soils.  $2400.  Additional sand bedding or layering would be additional if required.<br>
<br>
Install 62 ln feet of 1 1/2 poly line.  Includes trenching, installing line and 14 gauge tracer wire, sanding line,  backfill in lifts and compact in lifts. <br>
$1980'),
  (3185150, 13, 'Demo out existing plastic from joint and despose.

Clean out and prep joints for deco seal.

Add deco seal to joints and apply silica sand.
Clean remaining sand from pool deck
'),
  (3188181, 1, '1.  One additional course of wall block with stucco 46 Linear feet X $20.00= $920.00<br>
2.  5 additional liner feet of wall stucco with concrete cap X $86.00= $430.00<br>
3.  CREDIT grass 47 SF --$165.00<br>
4.  Adding bender board to area of grass and planter 19 LF X $8.00= $152.00<br>
5.  waterproofing was in contract, I made a mistake and forgot to put in addendum<br>
Total= $1,337.00'),
  (3193752, 1, NULL),
  (3194559, 10, 'Using Rustic Wall Block on the 12'' wide  8" high side Set on the side for a border <br>
19 LF in the backyard, by walkway to EDU X $25.00= $475.00<br>
32 LF on the neighboring side of the driveway X $25.00= $800.00<br>
Total:  $1,275.00<br>
<br>
PLEASE ORDER 60 PIECES OF ANGELUS RUSTIC WALL BLOCK IN GREY CHARCOAL'),
  (3198318, 8, '$1000 allowance<br>
<br>
-6 hours<br>
-119.90 permit fee<br>
<br>
 '),
  (3198349, 14, 'Add CMU to walkway and back of driveway.<br>
<br>
Includes doweling into existing walls and adding reinforcement. <br>
<br>
Includes addtional veneering that will be needed. '),
  (3198364, 15, 'Includes removal of siding section by dog bath and hauling to dump<br>
<br>
Includes Demo of previous front fencing and hauling.<br>
<br>
Includes last fence items and hauling to dump <br>
<br>
Will require one load to haul fencing, link and siding removal. <br>
<br>
Includes new wiring and paper. <br>
<br>
Includes all stucco work for the siding section '),
  (3198670, 1, '4 kangaroo paw pink Joey 1g'),
  (3200906, 8, '1) Add new pressure regulator.  $687 contractor cost  and no installation fee.<br>
2) Add 110 4 foot timber steps $22,000. <br>
3) Add 30 yards of 50/50 back fill - garden ready soils. $2485<br>
4) Add 120 linear feet of gravel walk at bottom plus hillside cut out and retaining wall. $2900<br>
5) Add hillside retainment along two cut back path through hillside  $3400'),
  (3202058, 16, 'Move road base and bring down soil to appropriate grade so concrete is at 6" instead of 4"'),
  (3202089, 42, 'First course on existing wall at $20.Per LF. $240
Additional 3 courses at 12LF. $13. Per course 
$468.
'),
  (3203818, 1, 'Need one more outlet for inside the kitchen to connect refrigerator and kegerator.'),
  (3204946, 1, NULL),
  (3207968, 2, 'Add concrete to cover exposed wall footings to both sides of the paver wall.'),
  (3208149, 43, '$1000 1 day two guys for extra footing demo<br>
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
 '),
  (3210670, 2, 'Additional 4 Linear feet of block with stucco and concrete top X $86.00= $344.00'),
  (3210753, 3, ' 2)  7 Linear feet of 6"x6" landscape ties, 3 courses.  each course is $20.00 X3= $60.00 per linear foot X 7 LF= $420.00<br>
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
Thanks so much!'),
  (3213844, 1, NULL),
  (3216419, 11, 'Not installing 32 linear feet of rustic wall curbing x $25.00. = $800.00.'),
  (3217081, 1, NULL),
  (3217086, 1, NULL),
  (3217092, 1, NULL),
  (3217098, 1, NULL),
  (3217105, 1, NULL),
  (3218584, 44, NULL),
  (3218749, 1, '20 extra pavers at no charge to customer to make a straight line. '),
  (3219770, 3, 'Originally quoted 969 sf of pavers.<br>
Installed 947.69 sf of pavers.<br>
Credit back for 21.31 sf '),
  (3220769, 8, '-50 credit for drip lines in planters<br>
-150 credit for drainage '),
  (3223932, 45, 'Demo existing apron 4''x19'' and formand pour new at 4''x22'' 
Curb needs to cut, formed and poured separately with regular grey concrete '),
  (3224804, 46, NULL),
  (3226462, 4, '60*20lnft - $1200<br>
2x draincaps $50'),
  (3226756, 2, '<table cellpadding="0">
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
$1,000.00'),
  (3228335, 1, 'Add additional 50ft drain line to street, core curb Credit 20ft electrical Adds $1350'),
  (3228794, 1, 'All three trees removed from contract.&nbsp;'),
  (3229134, 1, NULL),
  (3229593, 4, NULL),
  (3231725, 2, NULL),
  (3232067, 47, NULL),
  (3232241, 17, 'Instead of installing a drop in unit, we are forming a custom concrete basin.&nbsp;'),
  (3232244, 18, NULL),
  (3232285, 5, NULL),
  (3234865, 1, NULL),
  (3237068, 1, '<br>
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
'),
  (3238251, 2, '<ol>
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
 '),
  (3241336, 9, 'Added walkway length will be incorporated into previous contracted gravel area.       No added cost for this. <br>
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
 '),
  (3242396, 2, 'dig 2 footings for canopy contractor 20"x20" <br>
<br>
and set concrete\'),
  (3242628, 6, 'Installation of 86 LF. Wall cap approved via text'),
  (3242667, 5, '51 Square Feet of grass<br>
Original in contract 29X23= 667 SF<br>
Installed 21 X 28= 588 SF<br>
Credit of 79 SF X $3.50= $277.00'),
  (3242730, 6, '- $20 / Paver credit was calculated at $11.50 but it should have been $20.<br>
- $130 / Drainage should have been charge at $75 per linear feet.'),
  (3242884, 3, '*** NO ADDITIONAL CHARGE ***<br>
<br>
Wall material changed to: Angeles Tango II Cream Terracotta Brown <br>
<br>
 '),
  (3242991, 3, '35 sf of pavers 
Prep and demo as necessary 
Move shed labor'),
  (3245810, 2, 'GAs and Electrical permit fee'),
  (3249282, 1, '14 Linear Feet 18" high Rustic Wall runner for the wall soldier course for the cap  in Grey Charcoal'),
  (3249739, 4, 'see attached plan<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Add additional course where shown $308</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">add additional 2 course wall where shown  $790</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"> 5 feet of concrete curb $185</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"> move owners rock to along the walkway – no charge</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Total $1283</span></span><br>
 '),
  (3251910, 4, NULL),
  (3252798, 1, NULL),
  (3254315, 1, NULL),
  (3254671, 5, NULL),
  (3255466, 5, NULL),
  (3258516, 6, NULL),
  (3258704, 7, NULL),
  (3260309, 8, NULL),
  (3262506, 9, NULL),
  (3263358, 1, 'Removing this from addendum.  '),
  (3263761, 12, NULL),
  (3263953, 1, NULL),
  (3263963, 2, NULL),
  (3263971, 1, NULL),
  (3264340, 2, 'We will do concrete all the way down the side house instead of stepper pads.&nbsp; It will connect to trash pad on driveway.'),
  (3265063, 7, 'Plants taken out from original plan to plant change order Podacarpus<br>
<br>
Remove (4) 1 gallon Perennials, (5) 5 gallon Purple Fountain  (4) 1 gallon California Fuchsia (5) 5 gallon Bouganvillias,  '),
  (3265078, 8, 'Change out 27 stakes to driven lodgepoles.        $940<br>
Change out ground cover to    N/C<br>
<br>
Added planting in front:<br>
(2) 5 gallon Purple Fountain <br>
(2) 1 gallon California Fuschia    $135<br>
<br>
Add extra (5) 5 gallon lavender for various layout by client  $220'),
  (3265131, 6, NULL),
  (3265680, 7, 'Installed 9/9/2020'),
  (3269392, 1, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Demo/Cleanup                                                              $1300  </span></span><br>
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
 '),
  (3270207, 48, '3 guys one day plus one dump truck load&nbsp; $1500 plus $500 dump fee.&nbsp;'),
  (3270739, 2128708, 'Owner to provide access door we''re just doing the labor 1 man 4 hours'),
  (3271915, 6, NULL),
  (3273222, 9, 'Soil removals for leak detect.<br>
Clean Up and Grade front yard for planting. '),
  (3274330, 1, NULL),
  (3274395, 1, NULL),
  (3275665, 2, 'credt of 5 linear feet of bender board $40.00<br>
Additional plants  12 1 gallon @ $21.00= $252.00<br>
ADditional Plants 2 5 gallon @ $42.00= $84.00<br>
$296.00<br>
 '),
  (3275801, 3, NULL),
  (3275896, 1, '<br>
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
I''ll watch for the rose choices.'),
  (3275898, 2, '30 Linear feet of electrical line with 1 GFI box.&nbsp; $660.00'),
  (3277904, 3, NULL),
  (3277907, 3, 'Adding (9) path lights to backyard plus (3) spots <br>
Adding (6) path lights to frontyard plus (2) spots<!-- begin_ammend --><br>
We will need:<br>
<br>
(15) of these <br>
https://www.vistapro.com/product.aspx?catid=1&typid=3&prodid=697<br>
<br>
(5) of these<br>
https://www.vistapro.com/product.aspx?catid=1&typid=1&prodid=146<br>
<br>
(1) CTS 300 Transformer <!-- end_ammend -->'),
  (3277910, 4, NULL),
  (3278326, 8, NULL),
  (3278685, 9, NULL),
  (3278826, 1, NULL),
  (3278827, 2, NULL),
  (3279438, 4, NULL),
  (3281659, 3, '45 additional linear feet of bender ,board, customer was not told, I texted him after the fact, not approved yet.  by Verva<br>
 '),
  (3284204, 1, NULL),
  (3284517, 1, '58 linear feet of Bender board'),
  (3284529, 2, '34 sf pavers x$14'),
  (3284549, 10, 'Add 3 new pepper trees for slope coverage near driveway per meeting on 9/15'),
  (3285715, 5, 'Additional Pavers 441 SF X $11.15= $4,917.00'),
  (3285731, 6, 'Taking out one 18" high planter '),
  (3285743, 7, 'Step build $45.00 X 29 LF=$1,305'),
  (3285772, 8, 'Additional Utilties from contract, <br>
Calculated man days 3 man days  plus materials<br>
$5,100.00 utiltites total minus in contract $3,280.00= $1,820.00 total<br>
Using the same trenching when possible, using Mini.<br>
<br>
<br>
 '),
  (3286776, 9, '5 foot diameter Stone Wall II Sand stone mocha<br>
Order 2 courses of cap, one for the base and one for the top'),
  (3287592, 1, NULL),
  (3287601, 2, NULL),
  (3288674, 3, '120 Linear Feet of drainage with 10 caps'),
  (3288680, 4, 'Stump removed by Juventino, logged by Jorge'),
  (3288735, 10, 'Installation 2 ceiling fans with switch <br>
Owner provides fans '),
  (3289243, 1, NULL),
  (3289245, 2, NULL),
  (3290098, 1, NULL),
  (3290581, 3, 'Taking out Bender board'),
  (3290593, 4, 'Taking out extra shrub s and tree roots. '),
  (3291015, 1, 'Remove Euphorbia on right side of property close to cement walkway '),
  (3291297, 6, ' <br>
1.  Cap 40 LF X $30.00=$1,200.00<br>
2.  Stucco 40 LF X $12.00= $480.00<br>
3.  2courses of block ($15.00 each) $30.00 X 40 LF=$1,200.00<br>
$2,880.00<br>
<br>
<br>
 '),
  (3291364, 2, '30LF of edging to separate DG walkway from Del Rio Gravel bed (front left)'),
  (3296353, 7, '<br>
1.  Steps 12 Linear feet to connect the grass to the entry priced at $60.00,= $720.00'),
  (3296409, 1, '- Demo brick curb near driveway that sits on top of concrete driveway.<br>
- Steps in front and on side are now going to be paver steps.<br>
<br>
No charge for changing steps and demo of brick curb.'),
  (3298537, 2, '1. Irrigation - Front - Adding 2 new grass zones<br>
2. Irrigation - Back - Adding 4 new grass zones<br>
3. Timer - Client requested NEW Rainbird timer<br>
4. Timer location - Client requested to move Rainbird timer to garage area (drilling hole through garage from manifold location).<br>
<br>
After assessing Irrigation valves need replacing as well as piping, brass valves and sprinkler heads (we tested and it was clogged). <br>
 '),
  (3298715, 3, 'Add 60 SF at 3" of Grey Crushed Gravel to side yard. Keeping planting the same since plant count was already lowered.  Difference for mulch in that area (60 SF) is a wash.'),
  (3298823, 4, '- Added step from driveway paver pathway to backyard. Melinda suggested placement, right at pergola wall.<br>
- 7LF of Angelus bullnose charcoal.'),
  (3298847, 5, '-Main water line was rusted out, needed replacing.  <br>
- Will lie under pavers.<br>
- Approx. 40 LF of 3/4" PVC main line, includes trenching, time + material. '),
  (3298862, 6, '- Adding one more footing and one more post (structure was not fully supported with designed amount of wood material)<br>
- Adding 3 beams along outside of structure (current wood is rotten and splitting)'),
  (3301284, 2128709, 'Add 40 blocks  and widen existing wall to 8"  - $800<br>
<br>
apply Thoroseal/sure coat existing wall with 2 coats $1680<br>
<br>
Brown coat wall   about 1/2" thick to remove  slumpstone and make wall ready for stucco  $2800<br>
<br>
Total $5280<br>
<br>
 '),
  (3301377, 3, 'We are taking out the section of wall that was impacted by tree roots, which has forced the wall to bow outwards and upwards.&nbsp; We will replace 12LF and demo the remaining 2LF at the end (but not replace) where the palm tree is located.&nbsp; We will also delete the straight caps and just stucco over the walls instead.&nbsp; Carlos said we only need 16 blocks to install the replacement.&nbsp; There will be no additional charge for this.&nbsp; We also explained that the current wall has no footings and is a free standing wall.'),
  (3302404, 5, 'Extending concrete extension (next to patio) by another 1'' in width by same length and addition square footage for the concrete area for outdoor kitchen'),
  (3302545, 6, '85LF of perforated pipe installed behind East side retaining wall and connect to hillside piping to allow water to run off and not settle behind wall'),
  (3304185, 4, NULL),
  (3304557, 4, 'No change in price. 
Reason: Since the existing wall is not perfectly straight, the rough finish will show less imperfections rather than a smooth finish.'),
  (3304810, 10, 'Wtrproof, Drain, Backfill - $9600<br>
<br>
Irr. Valves - $300<br>
<br>
Poll Valve - $200'),
  (3305357, 7, 'Added 2 new hose bibs and 1 shut off valve. (<em>Complementary of Nicole</em>)'),
  (3305520, 8, '- Updated design from poured concrete to 2'' x 2'' square Grey pavers.  (no charge)'),
  (3305669, 2, '17 man days labor (man day = 8 hours)<br>
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
z2 - lawn - 116 lnft 1" pipe, 15 rain bird 6" pop ups'),
  (3307997, 49, 'Add in plants per addendum.&nbsp;'),
  (3308021, 14, NULL),
  (3308651, 4, '3 fictures labor @ $75.8 ea&nbsp;&nbsp;'),
  (3309760, 5, 'Additional Demo and Grading for Backyard'),
  (3309864, 11, '58 Linear Feet of Gas Line X $35.00 $2,030.00<br>
No Linear Feet in contract'),
  (3309881, 12, '198 Linear Feet (Including the electrical inside the AC enclosure 14 Feet and 45 feet EMT <br>
Electrical for SPA, Outlets and Pilasters, and all outlets<br>
50 Linear Feet was included in contract<br>
148 Linear Feet X $18.00= $2,664.00'),
  (3309888, 7, '<b>(1) 24" box Lipan Crape Myrtle </b><br>
<b>(2) 5g Salvia leucantha ''Santa Barbara'' </b><br>
<b>(4) 5g Salvia mystic spires blue</b><br>
<b>(7) 1g Lavandula stoechas ''Fat Head'' or Anouk</b><br>
<b>(8) 1g Lavandula angustifolia ''Hidcote'' or ''Munstead'' </b><br>
<b>(9) 1g Pennisetum ''Little Bunny''</b><br>
<b>(6) 1g Blue Fescue</b><br>
<b>(16) 1g Armeria meritima ''Bloodstone''</b><br>
<b>(6) 1g Sedum ''Autumn Joy''</b><br>
<b>(6)  1g Agastache ''Blue Fortune''</b>'),
  (3309894, 14, '*** Main water line : 128 LF (3 bibs and 25 LF included on contract)<br>
<br>
Priced at $18.00 a Liner Foot<br>
<br>
128-25 (in contract) 103 LF X $18.00= $1,854'),
  (3311730, 1, '- Removed drainage from scope. Credited $1,522.00<br>
<br>
- If new work is to be approved by Tom Hall, we will keep this job open and create a large change order.  Payments can come from Tom Hall via check or passing it to Melinda.<br>
 '),
  (3312310, 50, 'Mulching Citrus Trees<br>
Jute Install for front slope<br>
Trim Eugenias<br>
Prep front parkway for planting. Planting by Jeremy<br>
Install and compact 1 yard sectino next to Storm Garden<br>
Backfill several yards of soils for storm garden<br>
<br>
6 Man Days plus, soil delivery and  material - $3550<br>
 '),
  (3312963, 1, '17.5 addiitional sf of pavers'),
  (3313342, 5, 'Changing finish from smooth to rough. 
No price change '),
  (3314050, 4, 'Custom frame would be $350
Previous change order was $250
The difference is $100
'),
  (3314154, 5, 'Upgrade to 600 watt transformer. $400.00 additional for change order. '),
  (3314244, 5, 'Vista 6540 in arch bronze path light approved via text '),
  (3314922, 51, '41 ln feet of metal edging plus stakes. There will be some left over.<br>
Two guys two hours.<br>
 '),
  (3315219, 11, '3 more linear feet of BBQ island = $1575<br>
Discount: Island blocks = $630<br>
Only charging for countertop concrete and labor to finish = $945'),
  (3316387, 7, NULL),
  (3317719, 8, NULL),
  (3318111, 2, 'Demolition/Reinstall<br>
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
TOTAL DRAINAGE: $2,200'),
  (3318998, 16, NULL),
  (3319729, 6, 'From Contract <br>
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
 '),
  (3320756, 19, 'undermount touchup.   $300<br>
<br>
Demo out footing for wall at sidewalk<br>
Drainage work from planters to street<br>
Sleeves for irrigation, conduit for electrical and low voltage.  $1700<br>
 '),
  (3321224, 10, NULL),
  (3321577, 9, 'Not able to perform sandblasting on red paint slab. Our crew chief doesn''t recommend removing with grinding (which we initially thought was an option).<br>
<br>
Keith has painters coming to paint the entire exterior, they should be accustom to removing paint. FYI Pasadena requires a lead test prior to any paint removal ($150).'),
  (3322961, 1, NULL),
  (3322962, 1, NULL),
  (3322966, 1, NULL),
  (3322968, 1, NULL),
  (3323086, 10, '4 stucco columns wrapped around pergola post anchors. With Waterproofing, mesh, Brown coat and stucco.
We’ll try to make it as small as possible. Suggested size is 6” x 6” x 18”. '),
  (3323192, 3, 'Added mulching to project and two additional 15 gallon plants.&nbsp;'),
  (3323219, 3, 'Cleanup planting Area and prepare for Planting     $650<br>
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
Total $4643'),
  (3323245, 11, '- Credit for not painting posts and beams of pergola<br>
(House painters will be doing the painting of posts)'),
  (3325008, 1, 'Fence erosion correction

- 4 pressure treated (6×6×8)
- rebar
- 2 man days labor'),
  (3325014, 2, '(1) ball valve for irrigation'),
  (3325232, 3, '60 LF of brown plastic 4" tall x 2" wide bender board along existing lawn line in front inner yard '),
  (3327833, 4, 'Additional&nbsp; 719 sq feet of sod added.&nbsp; Contract was 7101.&nbsp; Total installed ended at 7820 sq feet. Contract price was $5.22 per sq foot.&nbsp;'),
  (3328446, 12, NULL),
  (3328685, 13, '3 outlets included in contract 
Installing total 8 outlets
37’ additional conduit @ $20/ lf: $807
5 additional outlets @$120/ea: $600'),
  (3329008, 2, 'SEaler for the pavers.&nbsp; $1.00 a SF&nbsp;'),
  (3329923, 12, 'Approx. 564 SF in front lawn of Valley RTF &nbsp;(includes demo, tilling &amp; amendments). I have given a 8% discount on the grass.'),
  (3331308, 1, NULL),
  (3332511, 4, 'Stucco patch and fade into existing&nbsp;'),
  (3332699, 1, NULL),
  (3332922, 3, NULL),
  (3335369, 1, '(4) black step lights *Jorge showed client
(1) 150 watt steel outdoor transformer '),
  (3335685, 11, 'Approved via text'),
  (3335927, 2, '105 SF of sealing and waterproofing inside of seat wall (against neighbors garage)'),
  (3336490, 8, 'Adding:<br>
12) 1g blue fescue<br>
(3) 5g Salvia Blue spirea<br>
(3) 1g lavender hidcote<br>
(3) 1g Sedum Autumn Joy'),
  (3336506, 9, 'Installing 2 poles to string lights from'),
  (3336728, 3, '70 LF of Angelus Bullnose in Dark Grey/Pewter/Charcoal'),
  (3336841, 1, 'ADD (12) Vista 2216 Up-Lights Black<br>
<br>
<br>
 '),
  (3338329, 3, 'Only run conduit $850'),
  (3339021, 20, 'Remove and reinstall 97 sq feet wall #2 <br>
Remove and reinstall 38 sq feet for top section wall # 3 in front<br>
Remove and reinstall 68 sq feet inside driveway wall<br>
<br>
Total of 203 sq feet of additional veneer work  = $6496<br>
<br>
Landscape Timber Wall. <br>
Demo exsting.<br>
Install 6x6 ACQ treated timber retained. Includes waterproofing and gravel beds for proper drainage. <br>
for 30 linear feet x roughly 3 feet tall. <br>
$5300'),
  (3339110, 3, NULL),
  (3339149, 3, 'ALL POTS<br>
Texture: Smooth<br>
Color: White Pearl<br>
(36) 48" x 26"<br>
(1) 30" x 26" (this pot replaces a 38" pot on the plan and goes in the Diagonal Area)<br>
(13) 38" x 26"<br>
approx 6 week Delivery'),
  (3339411, 52, NULL),
  (3339425, 10, 'Upgrade to Rachio timer<br>
Owner has approved via text'),
  (3339542, 11, 'Credit should be issued for difference in cost from 24" box citrus to 15gallon citrus'),
  (3339673, 4, 'Additional soils approved via email. '),
  (3342316, 1, 'New electrical conduit with wiring, stub up to GFI; 48 LF one GFI'),
  (3342679, 1, 'Demo existing posts install 3 new posts. Paint or stain ready. 6" x 6" with stucco patch at beam'),
  (3343087, 13, 'Credit for sod plugs.'),
  (3343456, 2, 'New main line. Replace old galvanized pipes from front to side of the house, under the house to connect to other side.  With new pressure regulator.  
$5,900.00

120 linear feet of additional main line from side of house to the back of house. X $20.00 a linear = $2,400.00

2 hose bibs and 5 brass valves (5 zones)
Hose bibs included. 5 new brass valves with all new emitters and filters x $850.00 = $4,250.00
'),
  (3344254, 3, NULL),
  (3345218, 4, NULL),
  (3345515, 5, 'Sidewalk only 
Includes additional delivery fee $100
And demo costs'),
  (3346244, 1, 'Demo flagstone near "Big Boy" and haul. (Being mindful of Big Boy)<br>
Add weed barrier.<br>
Add approx. 20 SF of 1/2"-1" Mexican Full Mix Beach Pebble.<br>
Add 1 piece of black metal edging to keep pebbles in. (Approx. 8-10ft)'),
  (3346268, 2, 'Add 1 5g Jasmine Vine (staked) for near the front entrance (near little iron fence).<br>
Add 1 5g Bamboo to upper bed.<br>
<br>
No charge!'),
  (3346279, 3, 'Demo swale at top of wall and haul.<br>
Grade and prep for planting up top as in original design. '),
  (3346302, 4, 'swapping out (9) 15 gallons for (6) 24'' box Podocarpus gracilior '),
  (3348054, 5, 'Address step light installed on column above mailbox.'),
  (3348106, 1, NULL),
  (3348342, 1, NULL),
  (3349125, 14, '40 LF of 3" SDR 35 for drainage in font of home to connect to gutters and direct water away from foundation<br>
<br>
(pricing includes labor + materials)<br>
<br>
2 pop ups (green to match grass)<br>
2 adapters<br>
1 90s'),
  (3349246, 15, 'Swapping out 100 SF of gravel for brown shredded mulch under the tree. (CREDIT)'),
  (3349876, 6, '150 SF of crushed gravel at 2" depth with weed barrier.'),
  (3349959, 4, 'Rain Bird Lanscape sub-surface drip series<br>
Rain Bird Lanscape water meter<br>
Reduced pressure backflow<br>
Master valve Rain Baird 1" Brass tee flow sensor<br>
Manual shut off valve<br>
Root zone watering system<br>
Low flow control zone kit with PR filters<br>
Quick coupler valve<br>
Weatherbarsed auto controller Rainbird<br>
Rainbird wireless sensor'),
  (3351584, 11, 'Install 18 new timber steps. - $3600<br>
Install step retainment on lower section   - $800<br>
 '),
  (3352237, 14, 'Adding elevated bar top to outdoor kitchen. Additional forming. Back splash stucco and concrete top form. 
$374.00 a linear foot. X 16 linear feet. $5974.00. Total change reduced to $2,500.00
Approved via phone call. '),
  (3352955, 4, '9 new watering rings x $64.00 each. $576.00
4 new brass valves with actuators. $210.00 each. $840.00. Total $1,416.00'),
  (3353884, 21, 'Install new bond beam for gate operation.&nbsp;'),
  (3354740, 2, 'New main line linear feet 28 linear feet X $20.00= $560.00'),
  (3354755, 3, 'Drain pipe and caps. 60 linear feet X $18.00=. $1080.00'),
  (3355347, 2, NULL),
  (3356465, 1, 'Will be applied towards contract'),
  (3358731, 5, NULL),
  (3358771, 6, 'I originally put in for 4 at $256.00. Need to add for the cost of 2 more. $128.00 for a total of $384.00'),
  (3359403, 7, '1.  Flush water heater from settlement and repair leaksabd flush  $615.00<br>
2.  Under house additional repairs on sections of pipes     $878.00<br>
3.  Charcoal filter set up   $570.00<br>
Total:  $2,063.00<br>
 '),
  (3359479, 8, 'New water heater with installation Melinda to list the make and model number in change order'),
  (3360059, 15, '18 linear feet of step. $810.00. 123 sf of steps  $1353.00. Total $2,163.00. '),
  (3362332, 9, 'Installation only:<br>
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
Total: $578.50'),
  (3362596, 16, '6 cubic yards 50/50 backfill'),
  (3363384, 7, '(2) 15g
(6) 5g
(4) 1g
(1) flat'),
  (3363574, 10, '1.  2  Asparagus Springeri   5 gallon  @ $43.00=  $86.00<br>
2.  1 lavender 5 gallon @ $43.00=  $43.00<br>
3.  Front yard 1 additional flat of blue fescue = $75.00<br>
Pebbles for the Fountain $99.00<br>
Total:  $303.00'),
  (3365664, 1, NULL),
  (3365668, 2, NULL),
  (3366336, 17, '(3) path lights for back patio area
(2) up lights for large tree
(1) 300 watt Transformer. (More lights can be added to the transformer later for front and adding lights anywhere on property)
(1) Auto-timer'),
  (3366491, 11, NULL),
  (3366681, 1, NULL),
  (3368665, 1, 'Regarding the Grass:

original in contract 575 SF X $3.50 = $2,012 in contract

New amount total 1,705 SF X $3.00 = $5,115.00

$5115.00 - $2,012.00= $3,103.00 + lowering the Valves and installing into a box $150.00

Total change order $3,103.00 + $150.00= $3,253.00


'),
  (3368709, 1, NULL),
  (3368752, 2, 'Setting the conduit for the cab le company 45 LF X $15.00= $675.00<br>
 '),
  (3368762, 3, '60 Linear Feet to move main line to planter X $22.00= $1,320.00'),
  (3368783, 4, 'Drainage 40 Linear Feet with drain caps X $19.00= $760.00'),
  (3369190, 3, 'No charge '),
  (3369617, 3, 'Change  fron adding new check valve to taking existing valve and have a custom welded adapter and cut hole. . Raise up with 4" abs anf cap off, install 6" pour a lid 

This adds an Additional $445 to the originsl agreement'),
  (3372176, 8, 'We are no longer doing 2 step lights and 1 address step light. '),
  (3372203, 9, 'In the previous change order for Podocarpus I had counted only (6) 24" boxes and we ordered and installed (7) as per client request to make upper beds look full and tall.'),
  (3372253, 5, '60 linear feet if conduit at $15.00 a linear foot. '),
  (3372390, 6, NULL),
  (3373351, 10, 'Credit for not doing #5 in demo: Digging out (2) large boulders in-between grill and waterfall area.'),
  (3373625, 2, 'Scrape off existing stucco, install mesh, scratch coat, brown coat and redo stucco. 
Match existing color 
*** New stucco color will look different since it is going next to old stucco. Over time they will look more and more similar. '),
  (3375397, 1, NULL),
  (3379092, 1, NULL),
  (3379163, 53, 'Original contract had 8 zones included.  Installed 13 zones. Including 2 zones of inline valves and 100 feet of 13 strand wire and 50 feet of standard.  - $4700<br>
<br>
Install new 16 zone Rachio timer unit.  $350<br>
<br>
Install 15 bags of polished mexican beach pebble.  $575<br>
<br>
Discount given on above. ($600)'),
  (3380841, 4, NULL),
  (3381021, 54, NULL),
  (3381439, 2128710, 'under both patio covers, and bbq top, and Fireplace bench<br>
Pressure wash <br>
Seal with Natural Look Sealer<br>
add additional drippers under "palo verde" tree ..the one first large one when you walk into the backyard<br>
 '),
  (3382993, 3, 'Mistake on linear foot count in contract by verva. Reduced to cost. $5.90 a linear foot. '),
  (3384141, 4, NULL),
  (3385522, 1, NULL),
  (3385665, 2, 'run new wire from clock to 2 locations&nbsp;'),
  (3386855, 3, 'remove 10 yards soil from front yard'),
  (3386900, 1, 'Install 1 gfi- at main panel<br>
21lf 1" emt<br>
50lf metal flex<br>
45ft 1" pvc conduit<br>
55 1/2" pvc for pool lighting <br>
(1) sub panel<br>
includes all trenching and installation'),
  (3389530, 12, '1) Sub - (124) Acacia 15 gallon for additional (124) Westringia 15 gallon - No Charge<br>
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
 '),
  (3389603, 13, '1) Add - 3 new pilasters with rough in electrical - $1,200<br>
2) Add - Upgrade border on northern edge walkway to a "Floating Border"  - $900<br>
3) Add - Drainage for planter beds and roof drains to catch basins. Plus new heavy strip drain for garage (does not include grates) -$3,925<br>
4) Add -  Retaining Walls and concrete pads for Driveway gates and Equipment. - $2,650<br>
5) Add -  2403 additional sq feet of driveway installation - Paver upgrade on seperate line -  $25,231<br>
6) Upgrade - Paver to Aqualina 80mm.  $2.85 extra per square foot included added demo and haul for 5321 total sq feet - $14,908<br>
7) Add - 8 ln feet of walls. 149 with added backyard patio area, contract had 141. Walls to 2 feet average vs 18 inch in contract - $2,270<br>
<br>
8) No Charge - For all additional demo and grading for front and side section of property due to surprise of driveway sq footage difference.  '),
  (3389768, 4, NULL),
  (3389927, 5, NULL),
  (3390146, 4, '35 SF extra of Courtyard pavers to avoid cut
4 LF bullnose on step
Extra Rustic Wall 10 LF'),
  (3390228, 1, '22 Linear Feet of Electrical X $20.00'),
  (3390233, 2, 'Need to stabilize&nbsp;side of steps&nbsp;'),
  (3390252, 3, '36 Square Feet additional X $12.00= $432.00'),
  (3390263, 4, '10 Linear Feet of 24" wall build X $106.00 = $1,060.00  Belgard Belaire in Bella with cap<br>
5 Linear Feet of 18" wall on side next to steps that are already in the contract X $86.00= $430.00  Belgard Belaire in Bella with cap<br>
80 Square feet of Pavers X $12.00= $960.00 Belgard Catalina Grana in Bella small sizes'),
  (3390289, 5, 'Damage was done by demo crew.&nbsp; Permission was given to cut one tree back, but not the special bottle brush tree that the crew sawed off quite a few branches for bobcat access.'),
  (3392795, 1, NULL),
  (3392855, 16, '18 additional Linear Feet of Step build in the back.<br>
X $45.00= $810.00'),
  (3393941, 1, 'Added pavers to the backyard 1,093 SF X $11.00, all bobcat access'),
  (3395643, 5, 'Did not install wood A/C screen'),
  (3397371, 55, 'Approved via text ser images '),
  (3397659, 6, '24sf of fence / Priced at 29.50 per original contract = $708<br>
2 more posts at $60/ea = $120'),
  (3397671, 7, '$1480 Steel Frame for Gate and Side Panel ~5''W x 6''H<br>
$900 Powder Coating - 40% Gloss Black<br>
$1330 IPE Veneer over Fence'),
  (3403294, 17, NULL),
  (3405483, 14, '1) Add - 2 Additional Pilasters $800<br>
2) Credit - Remove "Floating Border" (-$900)<br>
3) Add - Upgrade all border on driveway to double stone $2,450<br>
4) Add - 548 additional 5 gallon gopher mesh  @ $6.95 per cage - $3,808<br>
5) Add - Excavation with backhoe and bobcat  for 60 inch, 36 inch and  84 inch boxes, (48 inch already included in contract). Remove 2 truckloads of soils -  $3,250<br>
6) Add - Planting 60 inch and 84 inch box trees (48 inch included in contract) 6 guys 1/2 day - $1500.  (Additional drainage not included)<br>
7) Add - Trench and run separate zone irrigation for all large box trees.  - $1800<br>
8) Add - Move 120 1 gallon plants (holes were dug) - $960<br>
9) Add - Additional Gate pad - $950<br>
<br>
Total change order $14,618'),
  (3405758, 56, '<span style="font-size: 11.0pt"><span style="font-family: ">for plant/lighting design for back/front - multiple beds, multiple revisions. </span></span>'),
  (3408543, 2, NULL),
  (3408703, 3, NULL),
  (3409928, 2, NULL),
  (3410602, 1, 'Over on design hours, billing for 4 additional hours @ $75/hour.

(*Provided 4 complementary additional hours as courtesy, this does not include drive time)

Thank you!'),
  (3410624, 1, 'Install 3" SDR 35 drain '),
  (3412314, 1, NULL),
  (3412426, 2, NULL),
  (3412428, 3, NULL),
  (3412692, 6, 'Add 2 more steps before the circular paver area to lower the elevation with ease. Each step is 3'' (see attached)<br>
Step built priced at $60/lf'),
  (3412740, 7, '26'' water line, 13'' gas line, 7'' electrical conduit and new LB on right side of the house next to porch (See attached)<br>
Change 6'' Electrical conduit and new LB on left side of the house (see attached, existing conduit in bad shape)<br>
5'' sleeve under pavers, so in the future ac can be moved to the other side of the yard at no charge. <br>
<br>
26lf water line x $22=$572 - $52 Discount = $520<br>
13lf gas line x $30= $455 - $65 Discount = $390<br>
13lf electrical x $22= $286 - $26 Discount = $260<br>
<br>
 '),
  (3412753, 8, '20 more linear feet of planter wall (see attached)<br>
Priced at $86/ lf '),
  (3412771, 9, '$300 Remove existing chain link fence<br>
$1500 build and install 20 lf of new wooden fence with 3 posts and pressure treated wood. '),
  (3417340, 10, NULL),
  (3418671, 2, NULL),
  (3418720, 3, NULL),
  (3418907, 1, 'Additional pavers around the perimieter 35 SF + 16 sf = 51 SF X $12.00= $612.00<br>
Additional pavers in the planter area 2 X 18.5''= 37 SF X $12.00= $444.00<br>
Additional Step build 71 Linear feet needed, 36 Linear feet in contract,  = 35 LF additional X $60.00= $2,100.00<br>
$3,156.00'),
  (3418998, 4, NULL),
  (3419009, 3, NULL),
  (3420774, 1, NULL),
  (3420811, 5, 'see attached plan'),
  (3423045, 3, 'We may only need 20LF - will determine on site when we demo'),
  (3425075, 12, '7 5g California fuschia<br>
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
 '),
  (3425237, 12, NULL),
  (3425266, 4, 'Install <br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">(9) 5 gallon Cassa Blue Lily flax </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">(7) 5 gallon Canyon Prince.</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">(3) 24 inch blue podacarupus<br>
<br>
We will need to decision on replacement </span></span>'),
  (3425275, 1, '22 LF of fascia pavers (Catalina Grana)'),
  (3425308, 2, 'Move hose bib 3 LF over, no charge'),
  (3425326, 3, 'Removal of tree in bed along neighbors garage'),
  (3425361, 4, 'Not able to cut and remove high voltage lighting. '),
  (3425430, 19, 'Install (2) 36 inch Crepe Myrtle. Need 5 or so crew.  <br>
Include shipping.'),
  (3425472, 6, 'Install 24 inch peppermint'),
  (3426844, 4, 'additional water spigot in back yard for hose in north east corner'),
  (3426929, 1, '22 linear feet x $28.00= $616.00'),
  (3427094, 2, NULL),
  (3427122, 19, 'Demolition of existing concrete counter top, forming, and new pour of concrete 3,000 PSI with additional rebar.  New fiber, if wanted. Not polished, sanded 2-4 coats of sealer <br>
Stucco patch included<br>
Forms need to be oiled right before the pour<br>
Elastic additive needs to be included, exact additive to be decided with lient tomorrow <br>
Expansion joints need a very thin profile tooling scribe, to look like the concrete cuts, very narrow<br>
<br>
 '),
  (3429000, 22, 'Per text change approval on 11-11'),
  (3431390, 5, '2 flagstone not needed, credit given'),
  (3433360, 18, NULL),
  (3433424, 19, 'Gravel: Palm Springs Gold'),
  (3433781, 11, '22 lf of sewer line connecting existing metal pipe to new sewer line 
'),
  (3435529, 6, 'Installation of new irrigation timer (**CLIENT to purchase timer)<br>
This is for running new wires and labor (time + material).'),
  (3441941, 1, '120 aditional sf of rtf sod. At $3.50 a sf'),
  (3441951, 2, '120 linear feet of drainage at $18.00 a linear foot. '),
  (3442446, 1, NULL),
  (3443400, 7, 'Not doing mastic. '),
  (3445684, 23, 'Add clearstory openings to entry and gate.<br>
(No Glass)'),
  (3450093, 20, 'Plating only 2 15 gallon trees. 2x $75.00= $150.00
 2 24" box treed. 2x $180.00= $360.00
34 linear feet of bender board x $8.00 = $272.00
$477.00 total. '),
  (3450172, 1, '50’ tree in the back $1425 
2 trees in the front $1100
All three together $2525'),
  (3451540, 2, 'Taking out the weed guard and fabric'),
  (3451617, 3, 'Additional Man hours to stack a wall, no mortar, with customer providing block garden wall, on existing wall j$414.00'),
  (3453115, 3, '8 yards of 50/50'),
  (3453260, 2, '1. Demo existing front tree and Dispose                                                                                                   $350<br>2. Parkway , sod cut and remove grass, disposes , excavate upt to 3 yards soil approx , 150sqft<br>    tunnel under sidewalk and install irrigation , install new Fescue grass                                                 $1562<br>3. Demo rear concrete pad ,up to 450sqft<br>4. install (6) boston ivy along rear wall                                                                                                      $132<br>5. Install 24" box tree in front $385<br>                                                                                                                                                       Total $2429'),
  (3454038, 4, NULL),
  (3455493, 1, NULL),
  (3455507, 5, NULL),
  (3455518, 6, 'Nursery sent this tree with rest of the order, but it was canceled from order last week as owner picked up her own'),
  (3458327, 1, NULL),
  (3458397, 1, NULL),
  (3458428, 2, 'Additional 18LF of bullnose paver in charcoal&nbsp;'),
  (3458440, 3, 'Extension of each side of walkway to be 5'' total on each side from edging border<br>
Gray Charcoal Antique Cobbles 3 piece '),
  (3458805, 4, 'Grey-Charcoal<br>
110sqft of 6x9 for soldier course <br>
840sqft for the interior <br>
 '),
  (3463409, 8, NULL),
  (3463449, 9, 'Credit for (1) 5g Avo tree, (2) 5g Ceanothus and (6) 1g Aqualegia <br>
Addition of (2) flats of Creeping Thyme'),
  (3463941, 7, 'We budgeted for 12 Lineal Feet and we need 32 Lineal Feet.

Honoring original price'),
  (3465203, 15, 'Previous change order had 149 lin feet of garden retaining wall. Installed only 104 with back patio benching.  ($3,400) credit due.<br>
<br>
Gate retaining walls to 24 inches with cap instead of 18 inches.   $1600.<br>
<br>
Total retaining wall credit. $1800'),
  (3465235, 16, '1) Remove driveway and set gate loops.   Reset pavers.  $1,900<br>
<br>
2) Install drainage for large specimen oak per requirements.  35 feet of trenching at 52 inches deep with drain line and drain socks.  Backfill and recompact.   $1,890<br>
<br>
3) Install new planting ordered.  New plant list is attached:  $9,485<br>
<br>
Total. $13,275<br>
<br>
<br>
 '),
  (3465309, 17, 'Install <br>
<br>
1) small retaining wall for front section of walkway where gravel meets decking. 2 foot by 8 foot 2 foot deep footings.   $720<br>
2) lower wall section retaining for soils to cover pipes.  4 1/2 ft down to 1 t in 15 section on south side.  $2,525<br>
3) 4 1/2 ft to 1 foot stepped on right 21 feet.  $3,265<br>
4) footings to be buried 2/12 to 3 foot deep 2 feet wise.  rebar reinforced.  Remove sand bags. <br>
5) Install french drains and footing exits. $500 <br>
5) Back fill sections with soils and base to raise grades for proper walkway and pipe coverages, compacted  $600<br>
6) Grout lift walls $300<br>
6) Install waterproofing for front planter walls,  back fill. $975'),
  (3465331, 18, 'Change mulch to "Forest Floor" at Foothill Soils per Jeff recommendation.   Price is $14 more per yard. <br>
<br>
Total of 65 yards.    $910'),
  (3465576, 18, 'Add (1) matching path light as requested.

Thank you Keith. Let me know if there is anything else! Nicole@picturebuild.com '),
  (3467769, 20, NULL),
  (3467927, 21, NULL),
  (3467932, 22, 'From previous change order<br>
Planting only<br>
2 15 gallon trees. 2x $75.00= $150.00<br>
2 24" box treed. 2x $180.00= $360.00<br>
34 linear feet of bender board x $8.00 = $272.00<br>
<br>
Total = $782<br>
<br>
was billed 477.00<br>
<br>
Difference of $305.00'),
  (3470464, 8, 'Paint wall - 42 ft x 8.5 ft = 357ft in Swiss Coffee

We budgeted $300 in contract. This is the difference for paint,  power wash,  extra labor. '),
  (3470555, 1, NULL),
  (3470583, 1, NULL),
  (3470940, 6, 'Add border to grass area up to 75ft , using cream brown charcoal rustic wall . Set on edge&nbsp;'),
  (3470998, 7, 'Demo existinhg patio and dispose<br>220sqft<br>Install new pavers'),
  (3471143, 8, NULL),
  (3472486, 1, NULL),
  (3473965, 12, 'Change out shut off valve'),
  (3475322, 5, 'Transplant move (18) 5 gallon plants per request @ $20 ea              $360<br>
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
      '),
  (3477251, 5, NULL),
  (3477739, 9, 'Had 29 (5gallons) in contract.
Only needed 22 (5gallons) according to new planting plan. 

Credit is for 7 (5gallons).'),
  (3480928, 2, '1) Extend outdoor Kitchen and Bartop to 11 feet one side and 9 foot 6.  Total now is 20'' 6 inches.  16 feet included in contract  $2600<br>
2) Wrap bar top around on east side $600<br>
3) Grade all soils in backyard down to level grade with pool and haul. $1900 (little less than quoted earlier)<br>
<br>
 '),
  (3482362, 10, '5 bags of 1-2" Arroyo River Rock
Includes pick up and installation of rocks around basin. '),
  (3485694, 4, NULL),
  (3486399, 3, 'extend concrete curb 30ft&nbsp;'),
  (3486722, 1, '+150sqft of DG w/fabric for parkway (Texhoma) that is directly in front of entry gate'),
  (3486730, 2, '(4)Pathlights for around front entry and side garden entryway<br>
(1) Uplight for front tree<br>
(1) Transformer<br>
<br>
Light order<br>
(4) 9206 in pewter<br>
(1) 2205 in pewter'),
  (3486732, 3, 'Our irrigation specialist was on site yesterday (Thurs) and strongly recommends 9-10 zones rather than 6 zones as previously mentioned. We tried to cover the whole area with just 6 zones, but it''s not going to be enough pressure to cover all the planting areas. <br>
<br>
(5) Drip Zones<br>
(5) Netafim Zones<br>
 '),
  (3486746, 4, '400 +/- linear feet of bender board for DG pathways, garden beds<br>Bender Board (4" H x 3/4" W) = $6/lf<br> '),
  (3486747, 5, NULL),
  (3486770, 6, '(1) concrete step for front porch (lt broom finish) cantilevered 7'' wide'),
  (3487465, 2, NULL),
  (3491252, 7, 'Replacing current galvanized pipe with pvc'),
  (3491265, 11, 'I did not estimate correctly for these rocks.  Cost did not cover the material that was ordered and installed. '),
  (3495188, 13, NULL),
  (3495999, 8, 'To prevent tripping hazard when stepping down onto concrete paver (to accomodate difference in inches from top of current patio to where the grade will be for paver)'),
  (3496427, 8, '1 yard of Del Rio 3/8" gravel. Spread in front planter to cover all exposed fabric. '),
  (3497064, 19, 'Extra Grading in Front<br>
<br>
First day of grading with Bobcat $3000 - Paid by Picture Build as a gesture for mistake on driveway measure - $0.00<br>
Additional 5 days of demo, grading with Mini Skid Steer - Two guys. -$7000<br>
Additional 3 guys one day of berm compaction - $1500'),
  (3497806, 9, 'Provide (4) cbsq44 post anchors and install'),
  (3501801, 1, 'Moving existing manifolds'),
  (3502286, 2, '40 linear feet '),
  (3502287, 3, 'Moving 11 plants '),
  (3502288, 4, NULL),
  (3502289, 9, NULL),
  (3502537, 3, NULL),
  (3503728, 10, 'Add 65 ln ft of electrical and added switch and outlet. '),
  (3504043, 1, 'Extra demo going 7" below grade for driveway area. 
Adding road base to driveway area $450
'),
  (3504092, 2, 'Credit for 2 Agave attenuata ''Nova'''),
  (3504709, 5, 'Add 280sqft pavers 
Sealer 
Includes demo

Use owner pavers from earlier job about 80sqft'),
  (3504897, 2, NULL),
  (3505056, 3, NULL),
  (3505158, 4, 'Adding 2 zones of spray  $1,800.00<br>
612 SF of RTF grass    $2,142.00'),
  (3505190, 5, '40 additional SF of sicde of the house<br>
37 additional SF in back patio<br>
17 additional SF on lawn side of patio<br>
94 SF total added in back X $11.00= <br>
$1,034.00'),
  (3505202, 6, 'Front yard pavers:<br>
17 LF on side of house<br>
2 feet by 20 feet to extend front yard patio = 40 <br>
Total 57 SF X $11.00= $627.00'),
  (3505469, 1, NULL),
  (3505471, 2, NULL),
  (3506938, 3, '154 SF X $12.00 = $1,848.00'),
  (3506952, 4, 'Shortened Gas Line by 28 LF X $35.00= Credit of $868.00'),
  (3507374, 20, 'Add two zones of irrigation.&nbsp; Run additional 300 linear feet of drip lines and emitters for added planting.&nbsp;'),
  (3507387, 21, '<br>
1) Add gravel and sq footage that is beyond the contracted amount already delivered.'),
  (3507390, 22, 'This is for the front grass installation that is not included in original contract.&nbsp;'),
  (3507394, 23, NULL),
  (3507400, 24, '1) Added roughly 30 timber steps, wall for rear seating area.  - $1500<br>
<br>
2) Added timber for step retaining.  $ 200'),
  (3507406, 25, 'Add in 195 yards of mulch.  Hillsides will have to be blown in with equipment. <br>
<br>
Upgrade all to forest floor. '),
  (3507408, 26, 'Add 50 stakes and 8 guide wire installations.&nbsp; 2 guys one day plus material.&nbsp;'),
  (3507418, 27, NULL),
  (3507500, 24, NULL),
  (3507519, 25, 'Remove wood from driveway gate and driveway side of entry wall.<br>
Install new wood on driveway gate to widen gate to fit over curve at entry wall and extend towards neighbor side. <br>
<br>
Remove boxed out section on Entry wall and install new wood. <br>
<br>
Includes $1000 credit for no longer welding extension for roof for box out section. '),
  (3507637, 4, NULL),
  (3508800, 5, 'Credit of one zone $900.00. Using 3 existing valves. $175.00 x 3= $525.00 total credit $1,425.00'),
  (3508905, 6, NULL),
  (3510622, 9, '48" Olive Tree $3000.00<br>
(2) 36" Crepe Myrtle Tuscarora $5400.00<br>
(1) 24" Waxed Leaf Privet $1500.00<br>
<br>
Includes Tax, Delivery and Installation'),
  (3510677, 10, '(1) 36" Olive<br>
(2) 36" Crepe Myrtle Tuscarora<br>
(2) 15 gallon Waxed Leaf Privet '),
  (3511270, 11, NULL),
  (3511273, 12, NULL),
  (3511277, 13, 'upgrade from pressure treated  to Rustic wall <br>
<br>
boxes approx 5x10 , inner dimension approx 4x8<br>
install 3 courses approx 12" in height<br>
<br>
thinset each course in place, set over 4" bagged concrete base to secure'),
  (3511422, 5, NULL),
  (3511423, 10, 'install electrical<br>
 '),
  (3514266, 5, 'Purchase Podocarpus from Green Thumb nursery.&nbsp; $500 added to cost from this source.&nbsp;'),
  (3514722, 2, NULL),
  (3514739, 1, NULL),
  (3515195, 1, 'Please see attached document&nbsp; New drawing of walls will be in current design under Wall Design'),
  (3515228, 2, 'Taking out 2 path lights'),
  (3515790, 14, NULL),
  (3515855, 1, '<br>
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
 '),
  (3515867, 2, 'add 462sqft additional lawn to front yard             $1732<br>
1-zone rainbird pop-ups                                       $850<br>
tunnel under driveway to install irrigation              $480<br>
additional cleanup                                                $474<br>
<br>
Total Additional cost                                            $3536'),
  (3517353, 1, 'Adding 35 LF of main pvc line to new manifold area located in back side yard.

We originally budgeted for 17 LF but after reviewing,  we decided an additional 35 LF was needed to go from front of home to back.

Nacho will add a T and cap it for phase 2 (*front yard irrigation and valves)'),
  (3517359, 2, 'We are not repairing concrete slab, this will be done in another phase.  '),
  (3517391, 4, 'Not removing little tree'),
  (3517867, 5, 'Concrete and forming credit + $430
Extra 48 SF of Valley RTF Sod - $180 (complementary)'),
  (3518387, 7, NULL),
  (3518643, 7, '50/more sf pavers in front. '),
  (3521263, 1, NULL),
  (3523249, 6, NULL),
  (3523350, 7, NULL),
  (3524137, 4, 'after tally of planting to be installed per finalized design vs budget, a credit is issued of $43'),
  (3528572, 6, '$2500 Allowance  - not to exceed without further approval<br>
Handle permits for owner at the Rate of $120hr + permits fees and costs, <br>
includes Drawing plans, Permit running, etc<br>
<br>
Additional work or installation  to be performed to pass inspection additional at owners expense<br>
<br>
Declined =  Owner to submit and handle all permits and costs<br>
Approved  = Picture Build to handle all fees and permitting submittal and meeting with inspector<br>
 '),
  (3530896, 7, NULL),
  (3531490, 6, 'Driveway: <br>
    1. Demo Existing Driveway, excavate for paver work and Dispose<br>
    2. install 4" compacted base<br>
    3. 1" Screed sand<br>
    4. install 2000sqft pavers , 32ft bullnose and joint sand<br>
    5. install water based natural look sealer after completion <br>
            Price $25,460<br>
<br>
Drains 120ft  - Price $2640<br>
<br>
package price $27,800'),
  (3531740, 1, 'Emitters attached to every temporary pot, tapping into existing drips <br>
 '),
  (3531843, 7, NULL),
  (3531920, 6, 'Taking out the Fuerte 15 gal. And one hot poker 1gal. '),
  (3533741, 8, '52 more sf of rtf for planter area '),
  (3534472, 11, NULL),
  (3534479, 12, NULL),
  (3537232, 2, 'If French Drain does need to be moved after pool demo, we will add this back as a change order'),
  (3539955, 9, 'Pilaster stucco and Bella Crete cap height flat cap to have light. Light and wiring by others. 16" x16" '),
  (3541360, 10, NULL),
  (3541965, 1, '20 additional LF X $35.00= $700.00'),
  (3541973, 2, '97 LF X $18.00'),
  (3541981, 3, '$20.00 X 85 LF'),
  (3541991, 4, '98 LF X $18.00 a LF= $1,764.00'),
  (3542008, 5, NULL),
  (3543542, 5, NULL),
  (3544261, 6, 'Raised sod area to level (not a slope as in design). 

6 cubic yards 50/50 soil.
Additional 16” steel and rebar (along olive trees) to allow sod to be raised to level. Additional welding and labor. ($100 discount)'),
  (3544802, 6, NULL),
  (3545441, 7, '8 cubic yards of 50/50 backfill

(Will credit if we do not use all)'),
  (3545590, 21, '3 linear feet not installed $55.80 / lnft<br>
<br>
 '),
  (3545595, 22, '4 linear feet of wall and rised height'),
  (3545609, 23, '69 Sf of pavers in final count'),
  (3549159, 6, '2.5 feet x 5 feet. 12.5 feet x $12.00. '),
  (3549160, 7, '16 linear feet '),
  (3554611, 1, NULL),
  (3558312, 26, NULL),
  (3558327, 27, NULL),
  (3559848, 28, 'Mulch front yard. Natural brown Double Shredded.<br>
<br>
950 sq feet at $1.00 per foot. '),
  (3563869, 1, NULL),
  (3563873, 2, '60 linea feet to separate gravel from sod'),
  (3563879, 3, 'No longer a need for the step/landing off guest house, there will only be a 2-3" step down from threshold to flagstone'),
  (3563880, 4, NULL),
  (3563948, 5, 'No electrial being installed'),
  (3563950, 6, 'Will need an additional 100sqft for patio area'),
  (3563957, 7, 'Not installing at this time'),
  (3567111, 7, NULL),
  (3567362, 1, NULL),
  (3567363, 2, NULL),
  (3569675, 3, NULL),
  (3570209, 8, 'Includes 80 linear feet of wire, 3/4 inch conduit with (3) 12 gauge wiring $1600.00<br>
Plus wiring for electrical panel $400.00'),
  (3570620, 3, '24 additional sf for back yard planter. '),
  (3576166, 4, NULL),
  (3580168, 28, '1) Ordered 10 yards of California Gold beyond contract which equals roughly 1350 added sq feet of ground covering. <br>
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
 '),
  (3580434, 29, 'This is for the back and side projects as bid earlier.  <br>
This does not cover other items that were excluded in previous bids like the northwest transition <br>
<br>
Pricing and scope exactly as per earlier bids with no additional items added.<br>
<br>
Please see the attached change order addendum for a breakdown.<br>
<br>
Payments will be scheduled according to progress sections and will be entered into the invoicing section of Builder Trend. '),
  (3582634, 29, 'I found a mulch blowing service that works with my mulch supplier that was much cheaper.&nbsp; Passing the savings on.&nbsp;'),
  (3582655, 15, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><u>15 Gallon Fruit Trees 1 each @ $200 each x 10 = $2,000</u></span></span><br>
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
 '),
  (3584144, 5, 'excavating up to 24: down connect to existing drainage, wat3er proof back of gunite around pool with 2 coats henry''s Tar, set perforated pipe in sock sleeve, back fill with gravel.  Set RTF over gravel to patch'),
  (3585874, 9, 'Topcast #1/Sand Finish for 1100 sqft of concrete (d/way+garage)'),
  (3585878, 10, 'Demo 20.5sqft of existing brick pathway<br>
Install additional 12sqft of reclaimed bricks to join up to concrete'),
  (3585888, 11, 'Demo existing steps<br>
Rebuild steps in poured concrete with brick veneer face and overlay<br>
Steps will be 18''-8" long x 48"H from threshold, with (2) separate landings at 8''6" x 4'' + 6 x 4'' with (3) steps down each with 17.5" treads and 6" risers (see sketch)'),
  (3587270, 12, NULL),
  (3588781, 30, 'Cost for permits and expediting fees.'),
  (3590960, 1, 'Upgrade to bullnose steps 5.5 LF x 2 steps'),
  (3590998, 2, NULL),
  (3592143, 8, '(4) metal stakes             $380<br>
100ft Metal Edging         $1200<br>
3 yards Del Rio               $900<br>
1/2 yard  DG                   $265'),
  (3593116, 1, NULL),
  (3593125, 1, NULL),
  (3593130, 1, NULL),
  (3594397, 3, 'Drain grate 14 LF, 
labor for drain, 
coring of curb at driveway
2 extra LF of SDR pipe.'),
  (3595037, 1, 'Install roughly 460sqft of 3/4 Del Rio gravel for remainder of front yard at 3" deep'),
  (3595039, 2, 'Install roughly 460sqft of mesh under gravel/cost tbd'),
  (3596596, 1, '30 additional pavers at BBQ area<br>
74 more SF in front of the gates<br>
104 more total<br>
$1,367.00'),
  (3596609, 2, 'one uplight and 2 path lights'),
  (3596629, 3, 'adding 1 24" box  $360.00<br>
taking out 1 15 gallon --$175.00<br>
adding 6 5 gallon @ $43.00=  $258.00<br>
adding 12 1 gallon @ $21.00= $252.00<br>
Total $695.00'),
  (3596968, 1, NULL),
  (3599321, 1, '58 lf of bender board. 28 lf of 6"30 lf of 4"'),
  (3599408, 2, NULL),
  (3600257, 7, 'Taking out 1 15 gallon plant'),
  (3602170, 1, 'Original Contract Budget $7573<br>
owner request upgrade to (7) shrubs from 15 to 24" box<br>
additional cost to budget $1457'),
  (3602587, 1, 'original allowance $3700<br>
owner upgraded (2) trees to 24" box<br>
additional allowance needed $203<br>
total plant budget $3903'),
  (3602793, 5, '(1) more step will be added at 6 linear feet&nbsp;'),
  (3602916, 8, '(3) 5 gallon Dwarf Horsetail&nbsp; - Equisetum scirpoides&nbsp;planted in the front fountain'),
  (3602978, 16, 'change Decomposed granite around garden area to Del-rio gravel , no additional or change in price'),
  (3602991, 17, 'install (2) owner provided light posts, <br>
includes excavation and installation with up to 4 bags concrete<br>
<br>
$325'),
  (3604204, 4, 'needed one more for a total count of 12 lights'),
  (3604221, 1, 'There is one 15 gallon in the contract, they want 2 more&nbsp;'),
  (3607243, 1, NULL),
  (3607244, 2, NULL),
  (3607245, 3, NULL),
  (3611361, 8, 'Must be installed at the same time as yard checks or while completing punch list.'),
  (3612427, 1, 'Credit for vinyl tree ring. $35.00<br>crefit for vinyl bender board replacing metal edging. $4.00 x 86 =$344.00<br>total credit $379.00'),
  (3612737, 3, NULL),
  (3614092, 8, 'Connection from water supply to  fountain
'),
  (3614677, 30, '1) Install gopher mesh for lawn section  $2,850<br>
2) Regrade south section of yard near driveway. Compact in lifts $3,400 <br>
3) Waterproof, add drainage and backfill retaining wall $1,200<br>
<br>
<br>
 '),
  (3614787, 31, 'Handle back section of soils issue on property Includes:<br>
<br>
Install 92 ln feet of 3 foot deep concrete berm w/key.  (best guess as to depth of hard soils section could be lower or higher.  Will adjust up or down accordingly. About 27 yards of concrete poured and roughly 20 yards of soils removal. 10 yards to remain on site and be compacted in lifts on hillside. Includes regrading existing erosion damage and recompacting existing soils section as best as possible on outer section of fence line. Cannot guarantee soils movement in those sections without pulling entire previous soils fill and replacing and compacting in lifts.<br>
<br>
Moving existing plants and irrigation and replant when done in sections in front of a behind rear fence line<br>
<br>
Installing 92 ln feet of concrete culvert<br>
<br>
Install 2 concrete catch basins (grates additional)<br>
<br>
Installing 136 linear feet of 8 inch pipe to connect to basin and run under timer wall and gravel path to lower valley'),
  (3616397, 2, NULL),
  (3620913, 18, NULL),
  (3621492, 4, NULL),
  (3622496, 5, '59 Linear Feet credit, $1,888.00'),
  (3623683, 19, '20 5gals not installed     ($900)<br>
2 5gals left on site           $40<br>
<br>
Total credit $860'),
  (3624116, 6, NULL),
  (3624122, 7, 'Will try and also haul out existing mound of dirt beneath wall if there''s room in dumpster'),
  (3624716, 1, NULL),
  (3625196, 6, NULL),
  (3627190, 7, NULL),
  (3628828, 8, NULL),
  (3630329, 2, 'Extra gravel for side planter'),
  (3631319, 2, NULL),
  (3631362, 3, NULL),
  (3632266, 32, '1) Install 63 linear feet of Modular wall with cap on side of driveway. $5,040<br>
2) Install additional 11 feet of timber wall next to transitions steps from grass area to path down for  lower parking. $770'),
  (3632383, 1, NULL),
  (3632419, 8, NULL),
  (3632443, 4, 'Entered an charge instead of a credit'),
  (3632446, 5, NULL),
  (3633529, 13, NULL),
  (3635359, 5, NULL),
  (3635364, 6, NULL),
  (3635900, 2, 'Pavers are already at job site for the steps. This is for area on right of driveway. '),
  (3635904, 3, 'Additional wall on right of driveway. 34 linear feet. '),
  (3637520, 7, '<table style="border-collapse: collapse; width: 260px" width="260">
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
'),
  (3638300, 1, 'Adding 300sqft of DG to garden bed against house'),
  (3639088, 2, 'Adding one Anti-siphon drip control zone for bed against front of house'),
  (3640352, 1, 'Add 35 linear feet of additional retaining wall.<br>
Add 24 addtional feet of steps<br>
Rerun grey water drainage line<br>
<br>
Total Cost about $12,000.   $3,000 discount given.'),
  (3641413, 20, NULL),
  (3642056, 2, 'Hi All,<br>
Just confirming:<br>
4  #9  Hesperaloe   5 gallon   X $43.00 =  $172.00<br>
3  #16  Agave Deserti  5 gallon  X $43.00 = $129.00<br>
2  # 17  Agave Desmentiana  5 gallon X $43.00 = $86.00<br>
2  # 18 Red Hot Poker   5 gallon  X $43.00 = $86.00<br>
Total:  $473.00<br>
Confirming your approval'),
  (3643681, 1, NULL),
  (3644353, 3, 'Take out large agaves in the back side'),
  (3644383, 25, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="color: black">2C: A copper wire was inserted into a hole in the stucco to keep a screw in place, instead of using a proper anchor. See the attached picture (copper_wire.JPG). An anchor should have been used to properly secure the PVC pipe to the structure. We already fixed this issue ourselves. </span><span style="color: red">Ok fine.  This is a temporary hold when they don’t. have anchors and we usually go back and anchor later.  If this has been done by you then fine.  Credit $30</span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="color: black">2D: The GFCI outlet underneath the electrical panel was not installed correctly. The reset button was not working properly. See the attached picture (gfci_outlet.JPG). It turns out that it was not working because the load wire was plugged to the line and the line wire to the load. We have expensive appliances connected to this main outlet which can cause damage to our expensive USA-made appliances. We already corrected this issue ourselves as well. We would need to be credited for this correction.  </span><span style="color: red">Ok, fine. This is a quick fix 5 mins.  We will credit $60.</span></span></span>'),
  (3644760, 7, NULL),
  (3647183, 26, '<span style="font-size: 11.0pt"><span style="font-family: "><span style="color: black">at $60/LF minus the 7% (so it should be $55.80/LF). The invoice amount should be $669.60 instead of $720. </span></span></span>'),
  (3647793, 10, 'Additional lf of French drain and waterproofing. '),
  (3648849, 8, NULL),
  (3649091, 4, NULL),
  (3649124, 5, 'pink lasy goes between deck and lawn ..the curvy area  <br>
2 yards needed here '),
  (3649135, 6, '1 yard ''Honey gold"  upgrade<br>
must be ordred, may be delay'),
  (3651146, 6, NULL),
  (3656341, 1, NULL),
  (3656354, 2, '1000sqft 4mil plastic installed with staples before compacted base installed'),
  (3657428, 1, NULL),
  (3657429, 2, NULL),
  (3657430, 3, NULL),
  (3659424, 9, NULL),
  (3660173, 1, NULL),
  (3660331, 10, '70 additional sf mulch. '),
  (3660772, 2, 'Able to use 2 existing lines of irrigation. '),
  (3660774, 3, NULL),
  (3660776, 4, 'Because of the amount of outlets Victor needed to install 1 600 watt transformer instead of 2 200 watt. Price difference with labor and materials $100.00 '),
  (3660778, 5, 'Additional 120 sf of turf in back and on side  to complete design of areas adjacent to planters. '),
  (3662837, 8, NULL),
  (3662971, 11, '1.  Changing Strawberry tree from 24" to 36" box  $760.00- $360.00= + $360.00<br>
2.  Changing Poplar tree from 24" to 36" box  box $760.00 - $360.00= + $360.00<br>
3.  Changing Necturne from 15 gal to 24" box $360.00 - $175.00= + $185.00<br>
4.  Changing Tangerine from 15 gal to 24" box $360.00- $175.00= + $185.00<br>
Total: + $1,090.00'),
  (3664919, 4, '<span style="font-size: 11.0pt; line-height: 107%; font-family: ">#1217 in black in low volt (pls note mounting hardware and lamp not included with fixture)</span>'),
  (3664924, 27, 'Below are credits<br />
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
 '),
  (3664981, 8, '(2) rolls = $380<br>
labor= $380'),
  (3667994, 3, NULL),
  (3668806, 11, '2,well lights vista pro 5271 arch bronze 5.5 watts '),
  (3668873, 4, 'Parthenocissus tricuspidata&nbsp;installed at fence line&nbsp;between pads as shown on plan'),
  (3672106, 14, 'Owner approved already'),
  (3672163, 1, NULL),
  (3672278, 15, NULL),
  (3672430, 28, NULL),
  (3679056, 1, 'Remove existing mastic joint. <br>
Apply new mastic joint (color to be confirmed with client.)<br>
Add sand on top to archive more uniform look. (It won''t look like plastic but more like concrete finish.)'),
  (3679622, 6, 'Trimming grooming ficus and staking. 2 crew one day. Haul away'),
  (3681832, 7, NULL),
  (3681845, 8, NULL),
  (3682833, 16, '(85) 1 gallon Boulder Blue Fescue - (40) for back border behind pool, (35) for in front of fence frontyard, (10 )for bed against back of house<br>
(3) 5 gallon Ceanothus thrysiflorus var. repens<br>
(7) 1 gallon creeping Rosemary<br>
(6) 1 gallon Blechnum spicant (hard fern)<br>
(3) 15 gallon Bougainvillea vine in magenta'),
  (3683519, 17, '1300sqft<br>
<br>
price to be added'),
  (3683640, 2, 'Install addtional layer of timber to raise grade to get above exposed sewer line.  $800<br>
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
3- 50 LF. GAS LINE FOR BBQ'),
  (3683733, 3, '15 path lights - Vista LED 6540<br>
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
(Can remove any number if price is too high.)'),
  (3686355, 2, NULL),
  (3686677, 1, NULL),
  (3686692, 2, NULL),
  (3687928, 31, 'Needed to additional demo due to existing pool shell issues.'),
  (3688013, 18, NULL),
  (3688774, 12, NULL),
  (3692016, 7, 'Already have 15 gallon in yard. Already took 5gallon lemon. '),
  (3693406, 2, 'Adding paver border to back concrete patio, extending from corner of old patio to corner of new patio for far end<br>
Running border corner to to corner for new patio for end closer to house<br>
Saw cut existing concrete that leads to side walkway so new concrete will join seamlessly <br>
Cut landscape tie on side near Cypress to allow for drainage and add weep holes to existing ties<br>
<br>
 '),
  (3693524, 3, 'add 24 linear feet of electrical sleeve for future lighting'),
  (3693594, 4, '19 Linear feet x 32"H of retaining wall to be added to support wall on property line<br>
We will grout all cels of original wall to reinforce it<br>
 '),
  (3693687, 5, 'Adding (1) more course to the top of wall&nbsp;'),
  (3693901, 14, 'Simon providing lights and plants:<br>
Please see daily log:<br>
replace 15 @ 5 gallon  installation only 15 @ $21.00= $315.00<br>
Install 11 new lights installation only @ $75.00 each $825.00<br>
$1,140.00 Total'),
  (3695598, 1, NULL),
  (3696955, 6, NULL),
  (3701655, 19, NULL),
  (3701672, 20, NULL),
  (3701681, 1, NULL),
  (3701696, 21, '(1) 5 gallon Salvia leucophylla <br>
(1) 5 gallon Lavender augustifolia<br>
(3) 1 gallon Creeping Rosemary'),
  (3702355, 3, NULL),
  (3705428, 7, '3% CC fee to be added on all payments made via a credit card. To be determined at the end of the project.&nbsp;'),
  (3706830, 13, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Final Measurement</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Turf : 2428 sqft</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">The original contract has</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Turf : 2331 sqft</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">A difference of</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Turf : 97 sqft</span></span><br>
 '),
  (3706838, 14, '<p><span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Final Measurement</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Gravel : 1050 sqft</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">The original contract has</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Gravel : 865 sqft</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">A difference of</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Gravel : 185 sqft</span></span></p>
'),
  (3707327, 15, '12  linear feet long<br>
30" to 36" high<br>
to use 6" X 6"   landscape timber <br>
Rebar and Screw Construction no waterproofing, back fill with soil on site.<br>
 '),
  (3707981, 9, 'these will be placed behind the sculpture..behind the magnolia little gem'),
  (3712699, 22, 'Credit for (6) Iceberg Roses'),
  (3712710, 23, 'Adding (16) 5 gallon Eugenias'),
  (3712715, 24, 'Swapped 15 gallons for 5 gallons'),
  (3713338, 1, 'Adding 50 LF of drain pipe'),
  (3714110, 3, '5-gallon to 15-gallon upgrade= $110 each X 21 = $2,310.00'),
  (3714331, 8, 'Credit for parking pass $110<br>
Reimbursement for paying for parking ticket $60'),
  (3714652, 2, 'Adding a second transformer.  (Hide behind ADU unit).

- Vanja to purchase smart plugs
'),
  (3714815, 3, 'We are NOT getting these pavers. Credit was included in price of drainage change order (Credit for 4 pavers-$60/each= $240 total credit given towards drainage change order)'),
  (3716893, 2, 'Change pressure treated 4”x8” to redwood 2”x8” no charge '),
  (3720761, 4, '1) Remove rock pilaster and wall for 7 feet.<br>
2) Excavate for wall and footings additional 7 feet.<br>
3) Extend retaining wall additional 7 feet.    <br>
4) Add 1 1/2 courses of block to entire retaining wall.  <br>
5) Add additional rebar reinforcement during grout lift of wall.<br>
6)  Credit for reduced fencing.<br>
 '),
  (3720997, 7, NULL),
  (3721878, 16, NULL),
  (3725999, 1, 'Extra 60 SF of grey crushed gravel near shed area'),
  (3726015, 2, 'Credit for (1) electrical box and conduit for side yard area (not doing)'),
  (3726037, 3, 'No charge (core and curbing - not doing, cost is a wash)

Adding 6 LF of 3 inch SDR 
Removing concrete - 7.5 SF
Repouring concrete - 7.5 SF
Score concrete'),
  (3726046, 4, 'We are not shaving the footing of archway in driveway.'),
  (3726068, 5, 'Adding one more spray zone to backyard. 
Brass anti-siphon valve.
All irrigation for grass needs to be new and have correct throw.'),
  (3732916, 10, NULL),
  (3734133, 1, 'Adding new drip emitter hoses with filter valve'),
  (3734598, 22, 'see attached<br>
<br>
remember this is a CREDIT againsts what has been paid or owed as a whole of all the work completed or already approved and not paid.   <br>
<br>
item 0007 is an additional change order already paid in full, and the total amount of pavers (220sqft) is not part of the total sqft pavers included in the attached calculation.     payments made per the original contract are progress payments. see your contract..  dont confuse it with the item cost and contract progress payments are different.'),
  (3734839, 25, '(65) 1 gallon Boulder blue Fescue for back pool and bed against house'),
  (3737597, 4, 'Adding 9 creeping thyme
Adding 9 dymondia silver carpet'),
  (3738086, 2, 'Demo the DG and grade, fill in alongside of patio where concrete was demoed&nbsp;'),
  (3740103, 26, 'Sweet Lavender is the variety'),
  (3742232, 4, '<s>160 lf x $8 per linear feet = $128.00</s><br>
<br>
160 lf x $8 per linear feet = $1280.00'),
  (3742257, 5, '870 square feet of mulch x $1 per Square feet = $870.00'),
  (3742268, 6, 'Add 300 W transformer = $350<br>
Smart controller = No extra charge<br>
 '),
  (3744457, 7, NULL),
  (3746125, 5, 'Client request to add 3 (15g) Silversheen for more coverage for garbage cans.

We already planted everything so we cannot restock the 3 (5g).'),
  (3747608, 2, NULL),
  (3748399, 8, NULL),
  (3752999, 8, 'The heads in the back of the lawn area will also need to be moved to accommodate for adjusted grading<br>
Approximately 3 hours of extra labor'),
  (3753367, 9, '160sqft'),
  (3754258, 12, 'We apologize and thank you for your understanding'),
  (3754367, 17, 'Consultation and 3 applications/trips.&nbsp; of white fly pest control.&nbsp;'),
  (3754611, 9, NULL),
  (3755925, 1, 'Vista brand led (2) up -lights gr2216
(4) well lights
transformer'),
  (3755986, 10, NULL),
  (3756390, 9, '<table style="border-collapse: collapse; width: 353px" width="353">
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
'),
  (3756416, 23, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">0008 - Extend basketball court 150sqft                   ($990)</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Remove the 45sqft credit                                              $337.50 (removing this as it is a redundant credit)</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b>Total credit due : $652.50</b></span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">This results in you paying for the remaining item. - 105sqft concrete $787.50</span></span><br>
 '),
  (3756467, 10, 'additional Ficus Nitida 3 15 gallon plants&nbsp;'),
  (3757071, 10, NULL),
  (3757074, 11, NULL),
  (3757201, 1, NULL),
  (3759894, 33, '<header>(5 Job *B) Mason, Gudrun<br>
Created By Brian Godley on Fri, Jul 31, 2020</header>

<main> </main>
'),
  (3760138, 1, 'Max said he will need one more full day of work to demo, wall install- taking longer due to access/hillside'),
  (3761254, 2, NULL),
  (3761257, 3, NULL),
  (3761261, 4, NULL),
  (3761263, 5, NULL),
  (3761615, 15, NULL),
  (3763113, 11, '7gals x $43ea = 301'),
  (3764520, 2, NULL),
  (3769109, 12, NULL),
  (3769218, 2, 'Raised curb  using a Rustic wall block on it''s side.  Need to order 18 pieces.  for 17 linear feet, X $33.00 a Linear foot= $561.00'),
  (3769222, 3, '27 Linear feet X $11.50 a SF= $310.00'),
  (3769225, 4, '22 linear feet of drainage X $20.00 a LF<br>
connecting 3 close down spouts'),
  (3769228, 5, '8 linear feet of step build 8 LF X $50.00=$400.00'),
  (3771075, 6, '<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><u><span style="font-family: "Times New Roman", serif">Planting Allowance</span></u></b></span></span></span>
<ol>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-family: "Times New Roman", serif">24" Box-tree @ $385ea / 15Gallon @ $150ea / 5Gallon @ $45ea / 1Gallon @ $22ea / $400 plant layout design / 1 yard mulch $300</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-family: "Times New Roman", serif">Amend soil, Fertilize and Basin each plant</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-family: "Times New Roman", serif">90 Day Warranty / 3 week yard check included</span></span></span></span></li>
</ol>

<div style="margin-left: 8px">credits will be applied on remaining balance of allowance used</div>
<br>
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><span style="font-family: "Times New Roman", serif"> Allowance $2880</span></b></span></span></span><br>
 '),
  (3772774, 1, '<span style="font-size: 11pt"><span style="background: white"><span style="font-family: Calibri, sans-serif"><span style="color: black">Grade lower Area -                                                                                          $800</span></span></span></span><br>
<span style="font-size: 11pt"><span style="background: white"><span style="font-family: Calibri, sans-serif"><span style="color: black">(24) 5 Gallon Trailing Rosemary                                                                    $1080</span></span></span></span><br>
<span style="font-size: 11pt"><span style="background: white"><span style="font-family: Calibri, sans-serif"><span style="color: black">(1) 15 Gallon Arbutus Marina single trunk  Tree  - staked                         $212</span></span></span></span><br>
<span style="font-size: 11pt"><span style="background: white"><span style="font-family: Calibri, sans-serif"><span style="color: black">Jute Mesh 250sqft                                                                                             $650<br>
<br>
SEE ATTACHED </span></span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"> </span></span><br>
<br>
 '),
  (3774061, 5, NULL),
  (3774080, 6, NULL),
  (3774083, 7, NULL),
  (3774129, 6, NULL),
  (3774370, 34, 'Added Timber Steps. 160 ln feet.  3 added secions. Added timber retaining wall and landings 36 ln feet - $10,200<br>
Compact North Hillside - 2 days - $1900<br>
Install SDR 35 drainage North Hillside and Bury - $1200<br>
<br>
 '),
  (3774446, 1, NULL),
  (3774596, 7, '1 CY 50/50 for 2 BERMS in front yard, there was not enough soil on site to berm.'),
  (3774959, 2, NULL),
  (3774963, 3, NULL),
  (3774971, 4, NULL),
  (3774982, 5, NULL),
  (3775604, 3, NULL),
  (3775708, 6, NULL),
  (3776129, 4, 'Backyard Privets'),
  (3776131, 3, NULL),
  (3776132, 4, 'Erosion Control for holding dirt back on hillside'),
  (3776134, 5, '652sqft'),
  (3776164, 27, NULL),
  (3776166, 28, 'Owner wound up providing own blocks for outside wall'),
  (3776167, 29, NULL),
  (3776170, 30, 'Removal of garage cabinets and dump disposal&nbsp;'),
  (3776287, 13, NULL),
  (3776546, 1, '63 LF 4" Black metal bender board'),
  (3776556, 3, '3 stump grinds
40 SF of concrete removal'),
  (3776558, 4, 'Remove all electrical (old lights, electrical boxes, pipes)'),
  (3776663, 5, 'We are ADDING smooth stucco as in attached drawing.  I approximate that the area is 9 ft x 5 ft high. 

The wall will then be painted black later by the client’s painter so stucco does not need color.'),
  (3776671, 7, 'We will need approx. 60 LF at 18”-30” of waterproofing for all walls.

This will ensure that the water doesn’t come through and stain the concrete over time.
(frontyard garden and retaining wall plus backyard retaining walls)'),
  (3776679, 8, 'We are looking for an organic solution to spray on the hillside since there is substantial growth of the invasive grass since I last visited and the ivy is getting a little out of control.  You will need a gardener to be on top of the ivy once we have installed all the new plants, as it can get bad quick! 

This cost is for material and labor of the entire hillside.'),
  (3778325, 6, NULL),
  (3780619, 8, NULL),
  (3780746, 5, NULL),
  (3781040, 7, NULL),
  (3781046, 8, 'Credit '),
  (3784241, 35, 'Remove sub irrigation for previous design.  Add two zones of sprayhead irrigation - $1850<br>
Till, grade add amendments. $1700<br>
1650 sq feet of lawn.   -  $3,685<br>
250 ln feet of benderboard.  - $2250<br>
<br>
Gopher mesh install - <br>
credit for 1/2 day of mesh install - ($500)<br>
 '),
  (3784293, 9, 'Credit for mulch that we will not be doing on the very upper hillside slope.  

We will still mulch other beds that don’t have gravel with plants.'),
  (3784386, 10, 'I didn’t account for the 30” freeboard section of the 5’ tall CMU wall in the contract. (The L shaped wall on the left)

This is for the extra courses and labor. 

'),
  (3786988, 1, NULL),
  (3786993, 2, NULL),
  (3787163, 1, NULL),
  (3787170, 1, NULL),
  (3788172, 12, 'Credit for 1/2 of design fee (designer Harley Barber)'),
  (3788714, 13, 'There was another wall behind the lava wall that is extending 18 linear feet and is 28” tall. See attached photo. 

This wall and the footings will have to be removed so we can build properly and ensure the wall will never be compromised. 

This cost is for extra material, removal, and hauling.'),
  (3794340, 5, '1)  Outdoor Kitchen:<br>
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
Total final change order:  $1,960.00'),
  (3794840, 6, NULL),
  (3795825, 1, NULL),
  (3796033, 8, 'We did not receive or install 3 flats of silver falls groundcover for under the camellias and toyon tree in back.'),
  (3797936, 9, '60 linear feet at $6.00= $360.00'),
  (3798355, 1, NULL),
  (3798369, 1, 'Extending the drain across entire back side of pool and adding a pop up for just outside fence'),
  (3798418, 2, '+4 linear feet, will split with bbq<br>
will need to remove trex planks to trench gas line towards firepit'),
  (3798437, 3, NULL),
  (3798463, 1, NULL),
  (3798615, 1, 'Add 20 LF of 3/4" SDR drain pipe. Includes labor'),
  (3798653, 2, 'We are not doing 8 drains boxes, we are now doing 3 boxes total.'),
  (3798683, 3, 'Adding 28 LF of main line for irrigation from back house hose to grass area'),
  (3798692, 4, 'Add sleeve under concrete for future water main (if ever needed client will have access under concrete pour)'),
  (3798696, 5, 'Move soil around on hillside so it doesn''t spill over.'),
  (3798726, 6, 'Remove soil down to 6" behind retaining wall
Add 115 SF of 4" concrete pour with light broom finish'),
  (3798761, 7, '15 LF of railroad treated landscape timbers retaining wall at 2 courses high'),
  (3798767, 8, '1" poly line for future BBQ at 41 LF'),
  (3798837, 10, '4arcticoke.  5gal
Blue glue.   5gal. '),
  (3798933, 9, 'Adding one step 4-6" rise so 6 steps in total.'),
  (3802494, 4, NULL),
  (3807154, 5, 'Bullnose paver in charcoal for 36 linear feet, risers will be in 6x9 charcoal to match-'),
  (3809030, 36, '1) Added rear valve and hose bib for rear planter - 1/2 day 1 guy plus material  $490<br>
2) Added drainage inlets pool planter - 1/2 day 1 guy plus material  $435<br>
3) Back filled front and back planter with 4 yards of 50/50  2 guys 1/2 day. plus material and $250 delivery fee - $985<br>
4) Gopher Mesh front - 3 guys 1/2 day - $2350<br>
5) Benderboard for all rear walkways.  260 ln feet - $2340<br>
6) Add 3 timber steps and landing - $850<br>
7) Add 60 yards of Mulch - $5,191<br>
<br>
 '),
  (3811328, 7, NULL),
  (3812729, 3, 'see attached revised scope of work and new payment schedule<br>
<br>
Deposit  - Paid<br>
$34,000 additional'),
  (3816574, 14, '300 Watt Transformer $400 (gave a discount here)
Labor for installing 38 lights - $1,550
300 LF of wire - $350'),
  (3817983, 2, NULL),
  (3818492, 5, '#2211 in black'),
  (3818607, 8, NULL),
  (3818795, 1, NULL),
  (3819036, 9, NULL),
  (3819601, 1, 'in front yard'),
  (3820442, 2, NULL),
  (3820450, 1, 'this is included in the cost of the job'),
  (3820540, 1, 'this allowance covers additional costs including, permit and pre-permit work including side view drawings of 3d design, this also includes costs associated with submitting to engineer<br>
Designer at the rate of $120hr, Permit/Engineering running , working with the city<br>
estimated engineering costs of $2000 not to exceed without further approval'),
  (3822807, 1, 'Removal of tree stump/roots next to deck'),
  (3822812, 2, NULL),
  (3822815, 3, 'Secure riser&nbsp;'),
  (3822822, 4, NULL),
  (3822848, 5, NULL),
  (3823184, 7, 'Turf to be 400sqft'),
  (3823544, 1, 'Angelus Holland stone (Red-Brown-Charcoal, Tumbled) price difference for approx. 500 SF
If SF is less once on-site, we will credit you. 

We need to see the grade on-site for steps at the job walk.  This cost will be an extra $500 if we determine that two steps are needed. The steps will be made out of pavers as well. Once demo is complete, grade can be determined with string,  and we will know if steps are necessary.'),
  (3823600, 37, 'Added plants. <br>
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
 '),
  (3825096, 10, NULL),
  (3825617, 3, '(12) 5 Gallon plants @ $45ea  = $540<br>
Return (6) plants @ $45 = $270<br>
total Additional $270<br>
 '),
  (3826757, 6, NULL),
  (3826954, 1, 'NOT planting<br>
<br>
(17) 15g blue ice podocarpus<br>
(32) 4" succulents'),
  (3826963, 2, 'Only need one drip'),
  (3827017, 3, '3 drain boxes
76 LF of 3" SDR drain pipe'),
  (3827026, 4, 'Add 55 LF of 3/4" water main line
Add hose bib'),
  (3827028, 5, 'Add 5 LF of benderboard to keep in gravel '),
  (3827045, 6, 'Total SF of gravel has changed due to podocarpus not being planted'),
  (3827092, 7, '18 SF of concrete (sand finish) - (2) 3x3’ step pads
Forming and labor'),
  (3827112, 8, '300 watt transformer
6 step lights (under new wall cap)
3 up lights'),
  (3827140, 9, '58 LF of Rustic Wall in grey/charcoal (or similar color) for wall cap.  
I have given you a discount on the added cap!

Max will bring samples, maybe you want to hold off on approving until he shows you the sample on Monday. '),
  (3827141, 10, '<ul><li><span>12’ (4x10) pressure treated Doug Fir (termite and rot resistant) with concrete footing.</span></li><li><span>32 LF of hot water line </span><span>1/2” copper pipe buried 18” below grade per code, includes trenching and backfill.</span></li></ul>'),
  (3827179, 11, 'Add one citrus 15g - Max will let Kim and Kevin know what variety of orange they have.

I have given $20 off this plant. Citrus are non-returnable.'),
  (3827340, 7, NULL),
  (3827342, 8, NULL),
  (3831232, 1, 'We are now doing 6 Natural Flagstones instead of circular pavers set in DG. <br>
<br>
This is the cost difference from what we had in the contract to the new change.'),
  (3831454, 4, '$85 per yard.&nbsp;'),
  (3831556, 2, 'Cost difference for doing the brick BULLNOSE steps instead of the pavers in the center and brick rectangle edge (as we have in contract). Initially we were going to do the same paver as in the back pool deck area in the center of the brick steps, but we have not gotten that far with the phase 2 material selections.<br>
<br>
The steps will be all brick with a bullnose edge.'),
  (3831667, 3, 'Set new mailbox (*to be purchased by client) in concrete footing.'),
  (3832597, 10, 'only 6 lights were included in previous light change order, this change order adds (1) additional per request on owner provided lighting plan.&nbsp;'),
  (3832871, 11, 'install (4) 7ftx2x2 square post set with concrete for gate, post to be 5ft high when finished. or cut off to exact length after setting, at house/garage run a lag and also concrete footings<br>
<br>
george - see attached plan, verify exact location with owner<br>
<br>
fence is in the process of being designed/quoted/approved'),
  (3833247, 1, 'Cost difference of switching to all Stepstone Porcelain pavers. 

(64) 2 x 2 vs. what we had in the contract (Antique Cobble or Catalina Grana in Rio).  This is the cost difference.'),
  (3833260, 2, 'Adding 90 LF of 4” black metal edging'),
  (3833274, 3, 'Adding 1”-2” full Mexican Mixed Beach Pebble for in-between all of the pavers. Both in pathway area and in paver patio grid.  Approx. 60 SF at 3” depth.  Includes weed barrier.

(Planting beds will still be Del Rio - size is 1” minus)'),
  (3833432, 7, 'Wall to be 8 linear feet with 2 courses (above grade) smooth stucco w/brick cap to match existing walls<br>
This will include demo, material pick up <br>
 '),
  (3835892, 1, NULL),
  (3835902, 2, '170 Sf more in front X $12.00&nbsp; pavers'),
  (3836068, 1, '121 SF of sod (to match front lawn) in the mow strip in-between driveway. (Replace existing with same look and size)'),
  (3836436, 13, 'These (8) 15g Podocarpus Blue Ice are more expensive than our allotted $75 per 15g plants. They are $125/piece so the difference is $400, I have given a discount here.

Once approved we will move forward with placing the order. If you don''t want Blue Ice the other Podocarpus in the plan (gracillior) are at our price point.'),
  (3836594, 10, NULL),
  (3836724, 12, NULL),
  (3839083, 2, '40 linear feet of wiring and one outlet&nbsp; $22 X 40 linear feet = $880.00, one outlet $100.00 = $980.00'),
  (3839528, 1, NULL),
  (3839570, 14, 'Max found 8 small stumps with thick roots in the planter beds.

We will need a stump grinder.'),
  (3839625, 15, 'Not doing this many vines.  We are keeping 2 (1gallon) - Jasmine vine for corner and grape vine for for shower area or vice versa.'),
  (3839745, 1, 'This amount was included in the contract $3.00 for demo, and $8.00 for form and pour'),
  (3840975, 11, '140sqft includes weed fabric'),
  (3841286, 12, '346 additional square feet X $3.50= $1,211.00'),
  (3841843, 15, 'Import 2 CY soil to fill behind walls and raise soil level'),
  (3843345, 3, NULL),
  (3844887, 13, NULL),
  (3844972, 12, NULL),
  (3844987, 16, 'Stumps are huge and we need machine for another day. Max has shown clients and described extra large Juniper skyrocket stumps in planter bed.'),
  (3848177, 8, NULL),
  (3851328, 9, 'credit for 15 gallon Olive Tree<br>
 '),
  (3851347, 10, '(1) 24Gallon Podocarpus (440.00)<br>
(3) 15G Podocarpus ($150 ea planted)<br>
(3) 1G grasses ($21 - you had a credit for (1) 5 gallon topiary that was on the original estimate) '),
  (3852450, 14, NULL),
  (3853912, 14, 'see allowance per previous approved change order #0006<br>
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
 '),
  (3855566, 5, 'please see attached copy of email as an E-approval for this upgrade'),
  (3855621, 4, 'Remove CMU wall in preparation for gate installation. See photo attached.

Approx. 3.5’ x 5’ 3” CMU block wall with 19” wood lattice top.'),
  (3856952, 3, '165 so x $12.00. Juventino to pick up pavers tomorrow'),
  (3857016, 11, 'We had 702 SF of sod in the contract, client measured 730 SF. This doesn''t include industry standard of overage.'),
  (3857034, 5, NULL),
  (3857284, 8, NULL),
  (3859790, 5, 'Move main line 34 LF towards steps and out of concrete BB area. Hidden behind plants or pot.'),
  (3860224, 6, '20 LF of 3/4" conduit and waterproof electrical box'),
  (3860237, 7, 'Concrete step down to shed 4 LF'),
  (3860292, 8, 'Adding concrete'),
  (3860312, 9, 'We are not doing a wall where entrance to shed is, instead we added a step down. This is the credit for wall.'),
  (3860359, 10, '21 LF of concrete curb 10" high 6" thick'),
  (3860377, 11, 'Courtesy no charge ($127)'),
  (3860397, 12, 'Add 34 LF of 3/4" conduit with outdoor waterproof electrical box'),
  (3860647, 3, NULL),
  (3861258, 12, NULL),
  (3861587, 13, 'We are doing 7 x 7 = 49 (2x2''s)
I estimated for 8 x 8 so this is the credit difference for 15 stepping stones. '),
  (3861602, 14, 'Shaka did 2 other courts recently and their specs followed appropriate footings. Recommended 48" x 24".

We had in contract 48" x 16" and both Melinda and Shaka agree we need stronger footings at 5000 psi (not 2500 psi). '),
  (3861681, 2, NULL),
  (3861687, 3, NULL),
  (3865859, 1, '50 linear feet'),
  (3871752, 1, '750-375&nbsp;'),
  (3873129, 4, '<br>
Credit 1-block not installed , includes 20% return costs   -$300<br>
<br>
 '),
  (3873441, 15, 'Actual Original Contract $29,836 -Typo (not $28,836)    Add $1000        see contract addition<br>
Credit -  Sidewalk Demo and install                                      - $3200<br>
Credit - Permit Allowance                                                      - $1500<br>
<br>
                                                                            Total Credit -$3700'),
  (3873461, 16, '<br>
38ft of  pressure treated 2x4'),
  (3873807, 2, '2 new drip zones for the planters'),
  (3873878, 3, '1) Courtyard driveway 52 square feet X $12.00= $630.00<br>
2)  Paseo I & II front porch and entry  18 SF X $15.25= $274.00<br>
3)  Paseo I & II extending the back patio11.5 ft  X 2 ft = 23 SF X $15.25= $350.00<br>
4)  CREDIT 7 SF on side of the house - $84.00 <br>
Total additional pavers<br>
$1,170.00<br>
 '),
  (3875085, 3, '5 additional 5 gallon Raphiolepis umbrella minor'),
  (3875765, 2, 'Demo 86 SF of older concrete up until the red line <br>
86 paver install up to the red line (not including any steps)<br>
<br>
 '),
  (3876756, 3, 'Hand demo existing concrete steps/landing out from garage and timbers.<br>
<br>
- ADD (2) 6.6 LF Holland tumbled paver steps (RBC) out from garage.  Jorge and Jueventino offered design of one diagonal step and one semi-straight step.  (Similar to what is existing now as it is a small corner).<br>
<br>
- Infill approx 12 SF of Holland tumbled pavers (RBC).'),
  (3876773, 4, 'ADD 4 LF of drain pipe to popup<br>
ADD 4 socks to downspouts to connect to main drain '),
  (3876783, 5, 'Contract had 500 SF of paver, we are needing 550 SF of paver.&nbsp; This is the cost difference.'),
  (3877131, 2, 'Wall #1 (bottom for fence) +6"H<br>
Wall #2 reducing 1 linear foot, adding 13" (1 1/2 courses)<br>
Wall #3 +3 linear feet<br>
Wall #5 +5 linear feet, + 14"H (1 1/2 courses)<br>
Wall #6 + 2 linear feet<br>
 '),
  (3877132, 3, NULL),
  (3877133, 4, NULL),
  (3877134, 5, 'Additional 150sqft'),
  (3877137, 6, '+74 linear feet of drainage'),
  (3877138, 7, '10 linear feet total<br>
(2) 3 linear feet for second terraced wall<br>
(10) 4 linear feet step for 1st terraced wall'),
  (3877191, 19, '<span style="font-size: small"><span style="color: #222222"><span style="font-family: Arial, Helvetica, sans-serif"><span style="font-style: normal"><span><span><span style="font-weight: 400"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: 2"><span style="word-spacing: 0px"><span style="background-color: #ffffff"><span><span><span>ADDED Plant request per client:</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<br>
<span style="font-size: small"><span style="color: #222222"><span style="font-family: Arial, Helvetica, sans-serif"><span style="font-style: normal"><span><span><span style="font-weight: 400"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: 2"><span style="word-spacing: 0px"><span style="background-color: #ffffff"><span><span><span>(13) 1gallon Golden variegated Sweet Flag ($280- labor and material)</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<span style="font-size: small"><span style="color: #222222"><span style="font-family: Arial, Helvetica, sans-serif"><span style="font-style: normal"><span><span><span style="font-weight: 400"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: 2"><span style="word-spacing: 0px"><span style="background-color: #ffffff"><span><span><span> </span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<span style="font-size: small"><span style="color: #222222"><span style="font-family: Arial, Helvetica, sans-serif"><span style="font-style: normal"><span><span><span style="font-weight: 400"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: 2"><span style="word-spacing: 0px"><span style="background-color: #ffffff"><span><span><span>(3) 5gallon Agave foxtail (<strong>No additional charge</strong>, exchange for (3) 5gallon fire sticks)</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span>'),
  (3877226, 31, NULL),
  (3877228, 32, NULL),
  (3877230, 33, NULL),
  (3877232, 1, NULL),
  (3877251, 1, 'We are NOT going to demo 13 LF of fencing in front of little wall. 
Linsey and Daniel have taken care of this already.  '),
  (3877262, 4, 'Thin out bamboo stems from the lower trunk area. Cut stems so there is spacing at bottom and less of a clump where the pool decking meets the planter bed. 

NO HEDGING.

Remove plants behind couch (1 gallons and maybe (1) 5 gallon)'),
  (3877278, 6, 'Now that we know paver is almost flush with back door, there will be a step down to the gravel area on the side of the house (where the A/C unit is). This is for paver install for approx 4-5 LF of paver step.'),
  (3877280, 7, 'Waterproofing 18 LF near bottom of house where concrete meets siding.&nbsp;'),
  (3881979, 13, NULL),
  (3881982, 1, 'Pergola to be done by other.&nbsp;'),
  (3883422, 17, NULL),
  (3883603, 15, 'Upgrade to colored concrete - Davis in Outback - 8-9 yards'),
  (3884004, 1, '25 linear feet of drainage X $25.00= $625.00'),
  (3884015, 2, NULL),
  (3884022, 3, 'Installation of Gazibo'),
  (3884044, 5, 'Installig 134 Less Square Feet X $12.00'),
  (3884053, 6, NULL),
  (3884644, 4, 'Total drainage is 242 linear feet with caps. <br>84 linear feet  in contract <br>158 additional lf drainage. X $20.00<br>= $3,160.00'),
  (3884734, 5, NULL),
  (3884753, 6, NULL),
  (3884796, 7, NULL),
  (3886178, 5, 'This is the cost for doing all new manufactured brick (just like the one you have in the driveway) for the pathways and near gate.  '),
  (3886863, 8, '(1) 24" Agonis flexuosa<br>
(5) 5g Mimulus aurantiacus<br>
(8) 5g Hedychium (Ginger lilies)'),
  (3888001, 11, 'Beds by lake x 2 <br>
47x3'),
  (3888245, 20, 'Credit for purchasing plants directly from Moon Valley.
Credit was negotiated with Brian and client. '),
  (3888250, 21, 'Cost to install palms as per Brian and Eric’s conversation'),
  (3888709, 1, NULL),
  (3889269, 5, NULL),
  (3890105, 16, 'Two steps need to be added to make grass lower and flat.
Steps are 4'' and 7''
Both have a 7" rise (typical is 4-6" rise) and 12" step tread (normal).
Both steps are in colored concrete.'),
  (3890606, 2, NULL),
  (3890947, 12, NULL),
  (3891266, 4, 'add approx 75sqft additional synnthetic grass and 5 ft bender board edging'),
  (3892370, 13, NULL),
  (3893644, 6, NULL),
  (3894285, 2, NULL),
  (3894325, 9, NULL),
  (3894547, 1, NULL),
  (3894553, 2, '(1) Netafim drip zone<br>
(1) Spray Zone<br>
(1) Drip zone for beds'),
  (3894562, 3, 'Adding a change order for this as it will likely take (1) full day to install this, we will give a credit if it takes less time.'),
  (3894753, 3, NULL),
  (3896007, 5, 'includes upgraded Japanese maple to 24" box so its of decent size'),
  (3897973, 4, 'Bender Board $8.00 X 30= $240.00<br>
Plants please see attachement for list  = $857.00<br>
Mulch  400 additional Sf X $1.50= $600.00<br>
$1697.00'),
  (3898094, 14, '(1) path <br>
(1) uplight'),
  (3900184, 2, NULL),
  (3900431, 1, NULL),
  (3900465, 1, NULL),
  (3901994, 15, NULL),
  (3902483, 3, 'Area for grass has been reduced'),
  (3902484, 4, 'adding 1 additional drip zone'),
  (3902603, 13, '(8) 1 Gallon plants       $176<br>
(4) 5 gallon plants        $180<br>
4ft of 6" bender board   $65'),
  (3906481, 2, '1) Bring up grade along deck and out towards patio, roughly 450 sqft x 6" depth, will need add''l 50/50 soil to avoid having to build 2 deck steps<br>
2) Remove ivy from fence along side shared with neighbor''s <br>
3) Remove naval tree by deck<br>
 '),
  (3906486, 3, NULL),
  (3906523, 4, '+12sqft of patio (for kitchen area)<br>
+30sqft from patio towards deck (where steppers will be)<br>
+30sqft for area behind firepit (for seating)<br>
<br>
Reduction in stepper size (losing 150sqft)<br>
 '),
  (3906525, 5, NULL),
  (3906533, 6, '48 lf of electrical conduit from kitchen to deck area<br>
Plus 1 outlet (total of 3)'),
  (3908059, 9, '1 24” multi crepe Myrtle 1 15” Bahunia<br>
(6) 5 gallon Azalea '),
  (3911405, 1, 'by ryan'),
  (3911406, 1, 'By Ryan'),
  (3911407, 1, 'by ryan'),
  (3912555, 1, NULL),
  (3913290, 1, '24 additional 5 gal plants @ 43.50 each'),
  (3913301, 2, '480 sqft of gorilla hair mulch/no weed barrier @ 1.65'),
  (3913308, 3, 'adding additional rows of drip lines<br>
fixing 30 tears in drip lines<br>
 '),
  (3913512, 7, 'Rudbeckia that were smaller'),
  (3916658, 3, NULL),
  (3916668, 4, NULL),
  (3916690, 5, NULL),
  (3916706, 7, NULL),
  (3916763, 6, NULL),
  (3917765, 6, 'Our sub contractor is no longer available to install this fencing for this for 5 months <br>
 '),
  (3917939, 22, NULL),
  (3918149, 7, NULL),
  (3918180, 5, '1 spray zone =$900.00<br>
RTF  230 SF X $33.50= $805.00<br>
Bender Board 64 SF X $8.00= $512.00<br>
Del Rio 1" 99 SF X $6.00= 594.00<br>
5 more 1 gallon lavender X $21.00 = $105.00<br>
<br>
Moving the mulch from the front to the back of the grass in back<br>
Keeping green carpet, moving them to front and putting some lavenders in between<br>
<br>
 '),
  (3918191, 13, '50 sf replacing same pavers after plumbing work was done. <br>
pavers are on site. '),
  (3921035, 6, '10 plants by owner x $10.00. '),
  (3923153, 8, 'Adding 5 linear feet of countertop for bbq, includes stone veneer facing'),
  (3923945, 1, 'Add linear 51 feet at $21 a foot.  - $1071<br>
<br>
Add 9 linear feet of Belgard Highland Wall 18 inches high including cap  $1457<br>
<br>
 '),
  (3927200, 8, NULL),
  (3928034, 1, 'Spa/Electrical – 120lf<br>
1. Install 1” conduit from panel.<br>
2. Includes 220v service and 8awg wire<br>
3. GFi and spa disconnect 5ft from spa as required per code<br>
Price $3424<br>
<br>
Only running 1" line rough<br>
120x$20 lnft = $2400<br>
<br>
Credit difference of $1,024'),
  (3929839, 6, NULL),
  (3929912, 4, NULL),
  (3930285, 9, NULL),
  (3930761, 18, NULL),
  (3931412, 9, NULL),
  (3933931, 1, NULL),
  (3938139, 2, '2" x 6" brown plastic bender board for protecting fence from concrete pour'),
  (3938151, 3, '3 hours of labor for grinding concrete wall on east side of driveway'),
  (3938173, 4, '68 LF of 1" main line PVC'),
  (3938198, 5, 'Need to add 178 SF of Valley RTF sod (measurement of sod was crooked due to property lines being not straight)'),
  (3938203, 6, NULL),
  (3941377, 7, 'UPGRADE from 2500 psi to 3000 psi for concrete pour for 1,945 SF

*with either psi, cracks are not guaranteed nor covered by our concrete warranty '),
  (3941583, 1, 'Remove Bamboo near front gate and along mow strip on side of driveway'),
  (3941661, 17, 'Outdoor rated switch for basketball court light (to be located near timer)
Wiring is ready, sleeve is ready for Nacho to install.'),
  (3948631, 18, 'Credit for 9 (1 gallons) Sweet grass ''Ogon'' that we did not recieve or plant.'),
  (3948636, 19, '3 (1 gallons) Kangaroo paws (need to know color choice)'),
  (3948648, 20, 'Demo existing concrete 16 x 3 ($295)
7 rectangular stepping stones ($875)
Labor included.
Hauling included.
Dump fees included.'),
  (3948784, 23, 'Max and helper to install 7 high voltage lights on the home exterior'),
  (3952855, 2, '50 LF of 3” SDR pipe includes materials, labor, trenching and backfill($25/LF = $1,250)
Core through front property line retaining wall ($500)
2 downspout adapters (gutter attachment) - Complementary

9” valve box for the sewer pipe (bring it down and hide it) - ($130)'),
  (3952869, 3, '6 LF of CMU 8” x 8” x 16” retaining wall in backyard with 1’ x 2’ footings
Wall is to be 4.5’ high (approx 54”)
Hand trowel stucco cap - 6 LF
Smooth stucco add on to this wall only - ($260) color TBD

(*Length might change depending on tread of steps)'),
  (3952887, 4, 'Demo existing concrete steps, see photo attached.

(Hauling fees are included and extra if we are mixing loads of concrete with green waste)'),
  (3952901, 5, '7 steps at 4’ wide with 2 1/2” cantilever and 4” tile overlay (see separate change order for tile). 
3000 psi GREY concrete pour
Sand finish on cantilever steps to match existing pavers in backyard. 
Smooth Stucco same as wall - approx 13 SF ($120)'),
  (3952937, 9, 'Add one drip zone, Brass anti-siphon valve, Netafim drip line to back hillside.

Jorge mentioned splitting it down the middle so half on one side and half on the other.'),
  (3954146, 8, NULL),
  (3954559, 14, '<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif">(10) 1 Gallon plants / Pink Cranesbill                              $22/ea x 10 = $220</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif">(1) 5 Gallon plants / Agapanthus Purple                        $45/ea</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif">(1) 15 Gallon plant / Pittosporum Dwarf Fruitless       $150/ea<br>
<br>
Total: $415</span></span></span><br>
 '),
  (3956177, 11, 'Additional 1 1/4” conduit for 75 LF on hillside ($2,475) - (65 LF of conduit is already in the contract)
Wiring only - (6) 12 gauge wiring ($910)
1 sub panel, 100 amp - $250
1 weatherproof outdoor outlet for irrigation timer ($70)
1 weatherproof box with flat cover at top of hillside ($110)
2 breakers ($300)

(4 outlets total: 2 at top, 1 at BBQ, 1 at Irrigation timer) 2 of the 4 were already included in contract)

All electrical to be buried underground.'),
  (3959806, 6, NULL),
  (3959830, 8, 'Add pavers to sidewalk area 32 x 3 (96 SF)
Angelus Holland tumbled'),
  (3960021, 1, NULL),
  (3961962, 12, '29 LF of 6” x 6” ACQ Green Timbers for steps and any necessary retaining (on sides of steps nearest top) going up to DG patio. '),
  (3962405, 2, 'We are not planting
(1) 15g
(2) 5g
(2) 1g

New design for planting has been uploaded to BT'),
  (3966377, 32, '1- 80 LF. Gas line (need to pull permits)  $2,140 plus permit fees<br>
<br>
2- 88 LF. Electrical 5 12 gauge circuits. (no heaters)  (will need to add for outlets and switches depending upon final locations, does not include runs for switches.   $3,254 plus permit fees<br>
<br>
3- waterproof for fire pit area 14lf. x 2 feet high and waterproof raised planter behind bbq. 38lf.x 3 feet high   Use thoroughseal  $870 <br>
<br>
4- extra demo and grading not included in contract plus back fill and compact firepit deck and patio,  planter area behind bbq and patio section.  $2,800 '),
  (3966404, 7, 'Install 26 up lights with 300 watt transformer Pricing on lights is based on wattage of lights. Lights fixtures we are quoting for wattage is to be under 6 watts. If client wants a higher wattage light fixture price will increase.<br>
<br>
Light Model:<br>
Lightcraft FL-114B MATADOR WALL WASHER'),
  (3966407, 8, NULL),
  (3966409, 9, NULL),
  (3966414, 10, 'switching from battery operated valve to additional irrigation controller to handle extra zone.'),
  (3966420, 11, NULL),
  (3966452, 5, NULL),
  (3969182, 1, 'Needed to update design.  2-3 hours. This will be required for the city to approve plans.'),
  (3969236, 5, 'Demo frontyard and grade, includes hauling. Approx 480 SF ($800)
Mulch - 450 SF of Brown Shredded Mulch www.cmtopsoils.com/bark-mulch ($500)
Plant installation of (1) 15 gallon, (16) 5 gallons, and 9 flats with amendment and compost ($967)
Install concrete “sleepers” (client will purchase) ($400)
Irrigation - Fix timer issue and reconnect drip lines. (If no material, then no cost).  If any material or labor outside of this needs attention, a change order will be submitted)'),
  (3972023, 9, 'Total of 265 linear feet of block'),
  (3974383, 24, NULL),
  (3974422, 25, '- Install (2) 15 gallon Birds of Paradise'),
  (3980874, 33, '1) Install 200 linear feet of main water line and 5 hose bibs.  Install 5 copper risers.  $5,800<br>
<br>
2) Install 22 ln feet of 3 inch drainage.  140 linear feet of 4 inch drainage.  Install PVC inlets. $4,374<br>
<br>
Any additional sewer line, sump pump work etc will be on a different change order. <br>
<br>
 '),
  (3981323, 8, 'Import 8 yards 50/50 with wheelbarrow to backyard to raise lawn'),
  (3981444, 7, NULL),
  (3981506, 8, 'Lights are from: Light Craft 

Light selection: 9- Led. Fl.113B 6w.
1- 150w transformer '),
  (3982431, 10, '140 linear feet '),
  (3982893, 4, '105 lf border
60sqft pavers'),
  (3983047, 2, NULL),
  (3983564, 9, 'We did not pour 25 SF on concrete in corner where block wall meets corner of home. '),
  (3983691, 2, NULL),
  (3983867, 18, '<div style="margin-bottom: 16px">
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
'),
  (3985581, 11, 'Includes installation&nbsp;'),
  (3985769, 5, 'Moving the drains 1 1/2 feet up from where they are currently located, inside sod area.'),
  (3985781, 6, 'Adding footings and brackets to posts'),
  (3988093, 12, 'Third crane - $1400.00'),
  (3990030, 13, '3/4" PVC water line with hose bib to be installed at the top of the landing/upper patio. 80 LINEAL FEET.'),
  (3990807, 10, '32 SF of sod added to contact plus change order from earlier. Total now is 1,440 of sod.'),
  (3992667, 6, 'Plants are NOT installing:
10 - 1g
6 - 5g'),
  (3994241, 34, '1) After measurement verification,   gas line increased to 88 linear feet.  Additional $280<br>
<br>
2) Electrical run was 67 ln feet from panel and 11 additional feet from BBQ to bar top area.  Total of 88 linear feet.    No change in price<br>
 '),
  (3995176, 7, 'Pour 70 SF of 3000 PSI grey concrete
Sand Finish top cast 1
'),
  (3995205, 8, 'Remove bougainvillea and other plants near mailbox. 
Demo footings of mailbox and prep for new footing.
Remove plants on little landing and grade down.
(*We need to see what is under those plants, sand or dirt)
We will be installing plants here.'),
  (3995294, 38, '1) Additional plants (beyond what is still due per last change order)<br>
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
 '),
  (3995449, 39, '1) Add soils to Pepper Tree - No Charge<br>
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
 '),
  (3996148, 2, '750 sqft in contract<br>
675 installed<br>
<br>
75 sqft credit @ 9.95 = $746'),
  (3997996, 1, 'Scope changed and we are not doing this much turf anymore.'),
  (3998007, 2, 'Bel Air 92 - Client has sample at house, it was sent via mail from vendor.'),
  (3998017, 3, '1,455 SF of Valley RTF Sod. '),
  (3998033, 4, '3 Anti-siphon brass valves for grass spray zones.

Not included is main line, this will be determined at job walk $25/Lineal Foot.
'),
  (3998043, 5, 'demo is included in cost of sod, this is a credit for the turf area which was to be demo.'),
  (4000231, 13, NULL),
  (4000243, 9, 'Remove 2 large cypress approx 20 ft high +
Stump Grind (we will do all stumps on same day for noise reduction)
Haul tree material and pay dump fees'),
  (4000250, 10, 'Complementary per Nicole and Jorge

Wire ($30-40)
Labor (1 hour @ $65)'),
  (4000332, 11, 'We did not use 120 LF of bender board as the client had enough on site to put back in.
Labor was still charged.'),
  (4000593, 11, '(5)  15gallon sweet peas to be planted along wall with irrigation emitters. 
2 flats of purple heart (not planted) 

1 flat of star Jasmin (not to be planted) 

Move exisiting bougainvillea to upper slope or front yard. 
'),
  (4002384, 12, '500sqft'),
  (4005219, 16, NULL),
  (4005363, 15, '(4) 5 gallon plants&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &nbsp; $180'),
  (4006663, 16, NULL),
  (4008177, 1, NULL),
  (4008208, 1, NULL),
  (4009353, 11, 'Irrigation in planter beds needs to replaced. Old and pipes are not good. This is for 2 new brass Anti-Siphon valves for the two new drip zones. 

This will ensure all plants are getting  water and will reduce water costs in the long term.'),
  (4009729, 1, 'Additional pavers to 295  <br>
Reduced price from $18.00 to $16.00 per Square Foot 70 SF<br>
Original in contract 225 X $18.00= $4,050.00<br>
Change 295 X $16.00= $4,720.00<br>
Difference $670.00'),
  (4009731, 2, '1/2 Man Day trimming tree, pulling weeds and restaking&nbsp;fabric, fabric is existing'),
  (4009736, 3, '81 additional linear feet X $8.00= $648.00'),
  (4009740, 4, '10 5 gallon plants X $43.50= $435.00'),
  (4012108, 10, 'Forming for 35 indivual pads, all to be different sizes as per plan. Range from 3x3 to smaller sized pads.&nbsp; Running bond pattern.'),
  (4013453, 6, 'This is for electrical permit. If permit allocation is less than estimated, we will credit you. If it''s under cost, we will submit another change order.

 Once approved we will submit permit info to the city.'),
  (4013697, 12, NULL),
  (4013774, 11, NULL),
  (4015144, 9, 'Did not need irrigation timer we used her existing one. (It was good)'),
  (4015155, 10, NULL),
  (4017157, 12, '1,143 SF of St. Augustine sod
2 new Anti-Siphon brass valves for new grass spray zones'),
  (4017392, 13, '3 - 15g Silver Sheen
2 - 5g Spanish lavender
2 - 1g Artichoke agave
2 - 1g Cotyledon orbiculate
2 - 1g Lantana (Rainbow)
'),
  (4018136, 12, NULL),
  (4018144, 13, 'Demo 4-5" soil below final grade and grade area'),
  (4021174, 3, NULL),
  (4021480, 1, '28 more pavers at $18 sf'),
  (4021483, 2, '8 foot sleeve. X $15.00'),
  (4021487, 3, 'Catch basins  drain needs to go into left and right planter with jetting under 3 foot walkways then attaching a pop top exit into the planters<br>  2 count 8 feet. + jet <br>$200.00 x 2= $400.00'),
  (4022759, 4, NULL),
  (4024869, 4, '125 sf mulch with fabric. X $1.75'),
  (4024931, 7, NULL),
  (4024974, 8, NULL);

UPDATE bids b
SET custom_co_id       = u.custom_co_id,
    scope_of_work_html = NULLIF(u.scope_html, '')
FROM _co_backfill u
WHERE b.bt_change_order_id = u.bt_co_id;

COMMIT;
