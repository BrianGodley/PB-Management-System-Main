-- ============================================================
-- CO Backfill — Batch 4 of 5
-- Updates 1,336 bids rows (rows 4009-5344 of 6,676)
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
  (5396493, 10, 'Add 3/4” gravel for upper pathway with Weed Fabric'),
  (5396503, 11, 'Add a 2”x10” header board to delineate property line down upper area hillside '),
  (5397084, 7, NULL),
  (5397091, 8, NULL),
  (5397098, 9, NULL),
  (5397799, 9, 'Doing 3 layers of stucco both back and front of wall, including paper layer (over wood frame)<br />
Stucco will be sanded and match back to house'),
  (5399316, 1, '3/4" Del rio gravel for 200sqft '),
  (5400384, 2, 'Did not need to plant (2) 5 gallon plants and owner supplied the mulch '),
  (5404394, 4, 'Lots of roots underneath grass took 2 additional man days.'),
  (5407525, 11, 'Removal of mulch 1000
Decorative rock 2250'),
  (5409995, 10, NULL),
  (5410000, 11, NULL),
  (5412935, 12, NULL),
  (5413055, 4, 'Credit for 20lf benderboard
Dg to mulch
Turf to concrete '),
  (5414553, 6, NULL),
  (5416081, 4, 'Price difference for 1 gallon to 5 gallon'),
  (5416191, 13, NULL),
  (5416404, 7, ' added turf 
159.5  @ 
$11. Per square feet 
 
Total $1754.50'),
  (5418788, 8, NULL),
  (5420165, 2, NULL),
  (5420169, 3, NULL),
  (5420570, 1, '8lf three courses high with cap

850'),
  (5420689, 2, 'Replace 1 1/4" gas line from corner of the house to pool equipment  Existing gas line is leaking and is not holding pressure'),
  (5420698, 3, 'Reduce cost of 1 1/2" gas line to 1" in the '),
  (5420704, 4, 'Add 3/4" electrical conduit only to future BBQ area from pool equipment area'),
  (5423993, 5, NULL),
  (5425321, 1, 'Removal of planter bed'),
  (5425326, 2, 'Installation of only 1 set not 2 sets of arbor posts'),
  (5430521, 1, 'Add mulch to existing planters in frontyard'),
  (5433003, 1, NULL),
  (5433005, 2, NULL),
  (5433020, 3, NULL),
  (5433022, 4, 'Not entire zone, just valve '),
  (5433026, 5, '57 LF of 3" sdr
5 inlets
1 pop-up '),
  (5436193, 1, NULL),
  (5436277, 2, NULL),
  (5439213, 3, NULL),
  (5439518, 1, 'Remove concrete along the fence : 22’L X 2’W'),
  (5439597, 2, 'Grade backyard to match existing concrete level. 
Grading includes excavation and hauling of material. 
Approx. 7” difference from concrete and grass '),
  (5440231, 1, '
Run 54 LF of 4inch SDR35
Install 6 Drain inlets. 
'),
  (5440329, 2, 'Extend new planter box bed additional 10LF'),
  (5440369, 3, 'Install 190 sqft of paver for patio extension.
Similar to plan layout. '),
  (5440422, 4, 'Install new valve and connect to existing irrigation system for side planter. 

Fix and cap any broken pipe.
'),
  (5440608, 3, 'Install expansion joint felt around concrete for weep screed. '),
  (5441036, 4, 'Drill into concrete and add rebar dowels.
Rebar dowels will have anchoring epoxy to bond.'),
  (5442913, 5, 'Add approximately 120 sq ft of concrete to “firepit sitting area” '),
  (5442917, 6, 'Remove 1 column at driveway '),
  (5442921, 7, 'Removal of approximately 120sq ft of turf in “firepit sitting area”'),
  (5442927, 8, 'Add 80 linear ft of drainage deck drains and French drains as a combination between the 2 '),
  (5442929, 9, 'Additional 4 low voltage lights discounted'),
  (5442931, 10, 'To remove rebar and forms to make way for retention footings and replace once complete'),
  (5442937, 11, 'Additional concrete to pour retention footings along various areas '),
  (5445000, 5, 'Install 35LF of 4inch SDR35 pipe.
Install 5 inlets'),
  (5450653, 1, 'water permeable weed Fabric for 3200 sq ft&nbsp;<br />
anchored down with galvanized landscape staples<br />
&nbsp;'),
  (5450665, 2, 'ten plants from 1 gallons to 5 gallons @ 22 each<br />
<br />
$220<br />
&nbsp;'),
  (5451982, 6, '(1) flat dymondia
Reconnecting all the irrigation '),
  (5452009, 1, 'Paint ready redwood<br />
8'' wide<br />
2 1/2 feet deep<br />
2'' tall<br />
<br />
 '),
  (5453908, 5, 'Remove a 4’x4’ tree stump centered in the rain garden.'),
  (5454229, 6, NULL),
  (5456163, 6, 'Demo 7-8 inches for paver installation.
Install Grey Charcoal Courtyard pavers. 
Polymeric sand included for joints.
Approx. 638 sqft'),
  (5459301, 1, 'Cost of material only - not for installation.<br />
314 SF @ $3.59 (contractor price for turf)<br />
<br />
Client can keep extra pieces of turf waste.<br />
<br />
&nbsp;'),
  (5459847, 1, NULL),
  (5468969, 13, 'Fill in rock for pots and planters'),
  (5472027, 6, NULL),
  (5472573, 7, NULL),
  (5472577, 8, NULL),
  (5472586, 9, 'We cannot get pincushion. Here is the credit.'),
  (5473517, 1, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">60 sq ft at $11 a sq ft ($660)and a material change order for 70 sq ft at 3.90 a sq ft  for $273 for a total of $933</span></span><br />
 '),
  (5473695, 2, NULL),
  (5473765, 10, NULL),
  (5477053, 10, 'Minimized planter and turned into turf'),
  (5477059, 11, NULL),
  (5477063, 12, 'Pull up pavers in 2 areas to convert to planters 
May need pavers

Add bend a board
Move irrigation 
Convert planter area into more turf

'),
  (5482429, 1, 'We are CANCELLING the turf strips for the driveway. <br />
<br />
Line item under DEMO - #4. Saw cut at 4" pad only approx. 220 LF ($1,833) - **we are still doing saw cut around black tile patio. 20 LF**<br />
Item labeled TURF all line items ($877)<br />
<br />
Credit includes all labor and materials as cost in contract addendum for the line items listed above.'),
  (5482439, 2, '<strong>add 36 LF</strong> to gas line.<br />
<br />
We cannot take the gas line from the box outside, Jorge said that you could get a drop in BTUs in your shower/hot water output so we have to get it nice and clean from the gas meter.<br />
<br />
Cost includes trench and backfill as stated in contract addendum @ $33/LF'),
  (5482503, 3, 'This is for the interior patio area with Wayfair hexagon tile only.  We made the patio 1'' wider and the side area 1'' wider.  21'' SF + 13''6" SF + little pathway inbetween blue fescue 10''4" SF = 45 total SF increase.<br />
<br />
(does not include the area where the "steppers" and blue fescue are)'),
  (5482535, 4, 'In the "flood area" of the property along existing pathway near garage we are suggesting a drainage system that can allow water to penetrate deep down.<br />
<br />
Gravel bed 2-3'' down<br />
Soil on top, then DG and plants<br />
2 inlets<br />
PVC pipe from inlet to gravel well'),
  (5482556, 1, NULL),
  (5482557, 2, NULL),
  (5482558, 3, NULL),
  (5482560, 4, NULL),
  (5484564, 5, NULL),
  (5490837, 1, '3/4" Electrical conduit and electrical for Fountain from Pine tree to fountain'),
  (5493067, 1, 'Reduction of plant sizes for 19 Tropicana plants
255
'),
  (5496278, 1, 'Add 14'' of Drains of the corner of the house '),
  (5497213, 5, NULL),
  (5501716, 1, '27 LF. 3 courses $3,523.
24 LF. 1 course.  $1,400.
16 LF. 2 courses $1,050.

Back fill.                $1,100.

 '),
  (5503541, 6, NULL),
  (5503746, 2, 'Details are listed on revised estimate'),
  (5509927, 6, NULL),
  (5512183, 1, 'Steps to be constructed with paver block for 48 linear feet&nbsp;'),
  (5512190, 2, NULL),
  (5512196, 3, NULL),
  (5512257, 4, NULL),
  (5513505, 7, NULL),
  (5516307, 7, '10 path lights are being upgraded to Vista 4203 @ $13/each extra costs.'),
  (5516624, 21, '<u><strong>Day 1</strong></u>: Trimming, clean up, lighting check and glue, Brick repair with saw cut, grading, root cutting (if tree is the issue) - 3 guys labor plus material $2,300<br />
<br />
<u><strong>Day 2</strong></u>: Planting, compost, mulch, and irrigation including audit of irrigation. $3,496<br />
<br />
Included in Day 2 costs:<br />
- 957 SF of matching mulch at 2-3" depth (no weed barrier) $1,876<br />
- Adding compost amendments to base of all plants $100<br />
- (10) 1 gallons - $230<br />
- (12) 5 gallons - $540<br />
- Adding emitters to new plants and adding 2 emitters where necessary. $100<br />
- Audit of all irrigation in frontyard $650 - one guy, all day.'),
  (5516660, 8, 'going from a 15 gallon to a 24" box.'),
  (5516664, 9, 'We dont need that many!'),
  (5517810, 10, NULL),
  (5519984, 1, NULL),
  (5519985, 2, NULL),
  (5522039, 11, NULL),
  (5522061, 12, 'Total of 3 path lights need approval to order lights&nbsp;<br />
need to order 2 more lights.'),
  (5522694, 3, '(5) 5 gallon shrubs (Grevillea and Salvia Clevelandii)
(18) 1 gallon plants (Rosemary, Ceanothus)
(1) 15 gallon Yuzu '),
  (5530543, 1, 'Install (2) Brass valves instead of standard installation valves. '),
  (5532209, 1, NULL),
  (5532422, 1, NULL),
  (5535194, 1, NULL),
  (5535661, 7, 'Adding and checking lights that went out in front.<br />
<br />
(3) Up - FL-105B in 2700K 5.5W<br />
Cost includes wiring and all labor.'),
  (5540368, 2, 'Remove 5 (1 gallon) plants along back fence.<br />Remove 1 (15 gallon) Schefflera <br />
 '),
  (5542655, 2, 'Did not end up needing bending board for planters '),
  (5542687, 5, '10sqft paver install plus removal of curb'),
  (5542717, 6, 'Remove 2” of soil and gently grade planter.
Install shredded mulch '),
  (5545084, 4, NULL),
  (5545108, 5, NULL),
  (5545600, 12, NULL),
  (5549104, 2, '30 LF. '),
  (5549120, 3, 'Brown shredded '),
  (5549733, 1, 'Adding approx 370sqft of concrete total&nbsp;<br />
Design was slightly off in terms of measurements plus added some additional concrete for ADU area'),
  (5549736, 2, NULL),
  (5549981, 6, 'Includes demo and hauling. Stump grind if necessary. Leave soil at grade, flat '),
  (5550111, 13, NULL),
  (5550164, 7, 'One bag for Ficus benjamina.

2nd bag for repotting existing overgrown plant into old pot that had dead ficus. Labor for replanting add $25.'),
  (5550384, 8, '20 SF extra Montana gravel @ $12/SF. <br />
3" depth includes weed barrier.'),
  (5550392, 9, 'We are not removing 2 potted Ficus trees (from pool decking area. They will stay in their pots.)<br />
&nbsp;'),
  (5550824, 40, 'no cost'),
  (5550837, 41, 'Transplant 5 mexican sage to new area @ $15 each.<br />
Labor and irrigation emitter to new plant location included in cost. <br />
<br />
**Does not guauntee that plant will live in it''s new spot. Voiding plant warranty.'),
  (5550838, 42, 'No charge, this is under our warranty (from final job walk!)'),
  (5550849, 43, '4 on each side of walkway to back fence/gate.&nbsp;'),
  (5550854, 44, 'No charge this was under warranty (from final job walk!)'),
  (5550860, 45, 'Meadow: Karelaine suggested <a href="http://soilssolutions.com/california-native-grass-sods/#preservationmix" target="_blank">Native preservation mix</a>.  We discussed if you purchase the material we will remove the old sod and install with costs based on $650/per man day.  Jorge estimates that it will take 3 guys, 3 days to remove dead sod, check irrigation, prep soils and roll out sod. If they do it faster, then we will credit you.<br />
<br />
Cost is for 3 guys, 3 days.<br />
Included is: unloading sod (if needed to help speed up install, we should plan for the delivery while we are on site if possible, on our 2nd day), the dump fees for dead sod, amendments (if needed), testing and repairs to grid irrigation (if needed) and install of new sod.'),
  (5551100, 2, 'This is option 2: CMU block with stucco finish'),
  (5551150, 3, NULL),
  (5555904, 1, 'This is for the additional walkway in the front and to extend the paver walkway between garage and patio'),
  (5555918, 2, 'This is the removal of soldier course along the walkway between garage and patio&nbsp;'),
  (5559436, 1, 'Original scope of work was for 4 valves,&nbsp; We are deducting 1 Valve and using that deduction towards additional necessary drainage for the paver area.&nbsp;&nbsp;'),
  (5566762, 14, 'For string lights to plug in behind hedge'),
  (5566893, 2, 'verb approval via arely with bryan'),
  (5566903, 3, NULL),
  (5566949, 1, 'swapping from lava rock to black mexican beach pebble. this is the price with the credit applied.'),
  (5567647, 4, 'Removal of flagstone steppers along backyard turf'),
  (5567666, 5, 'Removal of bendaboard edging in backyard turf area'),
  (5567680, 6, 'Add flagstone cap to backyard pony wall'),
  (5572062, 40, NULL),
  (5572237, 3, 'Additional 40 LF of Benda Board along Gravel and Mulch'),
  (5572247, 4, 'Add 3 Concrete steppers along Garage wall'),
  (5572259, 5, 'Plant (2) 5 Gallon Cassia''s by wood garden fence'),
  (5572274, 6, 'Replace Leaking Hose Bib by Pool cost 65'),
  (5572291, 7, 'Replace Walk on Mulch for 3/8" Del Rio Gravel'),
  (5572310, 8, 'Replace Leaking Main Line Shut Off Valve on Side of the House cost 165'),
  (5572354, 9, 'Add homeowner provided flagstone steppers to create a pathway from path to patio'),
  (5578509, 2, NULL),
  (5582646, 1, 'Not removing:

7- 1 gallon $70
3 - 5 gallons $120'),
  (5582658, 2, 'Not tilling side yard see contract #3 in demo.'),
  (5584451, 46, 'Credit for three man days.'),
  (5588065, 1, 'Left of driveway 
(4) Dianella
(4) Regal Mist Muhlenbergia'),
  (5590536, 2, NULL),
  (5591184, 1, NULL),
  (5591318, 3, NULL),
  (5591325, 1, NULL),
  (5591331, 2, NULL),
  (5591970, 3, 'We could not get (9) 1 gallons @ $22/each.

Bea might get the natives she wants and we will plant them.

We will need to charge for LABOR only @ $10 per 1 gallon.'),
  (5592976, 1, 'one more plant '),
  (5593535, 2, NULL),
  (5594201, 7, 'Add 3 additional low voltage lights to backyard'),
  (5595333, 2, 'design credit. '),
  (5595575, 4, NULL),
  (5595846, 1, 'Install 144LF of block wall,
Sand stucco finish,
Includes Hand trowel stucco cap. '),
  (5596352, 1, 'Additional Drainage&nbsp;'),
  (5596657, 3, NULL),
  (5600997, 4, NULL),
  (5601961, 4, NULL),
  (5602198, 5, NULL),
  (5602205, 6, NULL),
  (5603100, 7, 'We did not install cardboard under mulch.
Credit for labor.'),
  (5604306, 3, 'Connect downspouts to existing drains'),
  (5604962, 1, NULL),
  (5604963, 2, 'price to be added once linear feet is confirmed'),
  (5606348, 8, NULL),
  (5606604, 3, NULL),
  (5607754, 4, NULL),
  (5608164, 1, NULL),
  (5609422, 4, '+100sqft of concrete with top cast #25/#5
(Measurements on original plan incorrect)
Concrete was remeasured after job walk once grading was completed. Spoke with client about this before forming was installed.
'),
  (5609429, 5, NULL),
  (5611235, 11, 'Pool plumbing reroute ($10500),<br />
New pool lights (3) ($3600),<br />
Pool skimmer repair ($2000) ,<br />
Backfill and compaction front and back (16HRS= 1600),<br />
Spa plumbing valves relocation ($1750).<br />
Waterline tile removal, plaster removal, replaster for waterline,waterproof waterline tile, reset waterline tile ($4000).'),
  (5611718, 17, 'Poolside Planter clean out of mint and mix of plants.&nbsp; Add (9) 1 gallon plants in the backyard + $75.00 for 1 yard of mulch, labor cost plus material'),
  (5611791, 1, 'Based on the new layout, it looks as though there is an overage in sq footage.&nbsp; If you can approve this, when We are finished with the installation We can credit any sq ft over or under accordingly.&nbsp;&nbsp;'),
  (5612864, 6, NULL),
  (5612929, 7, 'Install 32LF of ACQ Green timber '),
  (5613617, 7, '1 1gal<br />
4 5gal'),
  (5613738, 1, 'Credit for (4) full size boulders. '),
  (5615020, 1, NULL),
  (5618207, 5, NULL),
  (5618260, 2, NULL),
  (5619385, 5, NULL),
  (5621745, 3, NULL),
  (5622379, 12, NULL),
  (5624295, 2, 'remove flagstone, add 2-3" of gravel in area between pavers and putting green for approx 60sqft and small bed against house to left of new pavers for roughly 24sqft'),
  (5625580, 4, NULL),
  (5625835, 1, '18 linear feet of bbq L shape<br />
smooth stucco finish color&nbsp; tbd<br />
concrete top color tbd<br />
5 electrical outlets (one for the bbq area, fridge) 3 for the exterior&nbsp;'),
  (5625903, 2, '160 linear feet of drainage with 14 inlets/ connection points'),
  (5625931, 3, '5x5x3 drainage pit<br />
5 feet down<br />
5 feet wide<br />
3 feet deep<br />
backfilled with gravel<br />
<br />
$560'),
  (5625966, 4, NULL),
  (5626699, 1, NULL),
  (5632442, 4, NULL),
  (5637087, 8, 'Medium bark mulch with weed barrier in planters'),
  (5649532, 3, '30 5 gallons in contract<br />
28 installed&nbsp;<br />
43.50 x 2 = $87'),
  (5649538, 4, 'Removing pilasters from contract&nbsp;<br />
<b>$3,198</b><br />
additional concrete/demo work'),
  (5649646, 1, 'Credit from the design contract'),
  (5649648, 2, NULL),
  (5649652, 3, '42 Linear feet additional wall averageing 18" high X $115.00 a linear foot= $4,830.00<br />
 '),
  (5649655, 4, '48 linear feet of additional pavers, X $15.25&nbsp;'),
  (5650656, 1, 'Approved via text '),
  (5650667, 2, NULL),
  (5650670, 3, NULL),
  (5655055, 1, NULL),
  (5656182, 3, '(1) 5 gallon leucadendron for corner
(1) 5 gallon agave Americana for in front of window
(6) 1 gallon Sea Lavender 
(1) 5 gallon Yucca golden sword 
(1) 5 gallon Aloe

(1) yard shredded mulch'),
  (5656391, 4, NULL),
  (5656562, 2, 'To hold DG in along the side where the fence has gapping '),
  (5658837, 2, 'Credit for a 5 Gallon Strawberry tree'),
  (5658843, 3, 'Charge for 15 Gallon Strawberry tree'),
  (5659914, 1, NULL),
  (5664005, 1, 'Saw cut 62 LF of 4" concrete on neighbors side.
Along house complementary per Jorge.'),
  (5664025, 2, '(5) inlets @ $65/each= $325
(1) popup $50
65 LF 3" SDR pvc pipe $1,400'),
  (5664029, 3, NULL),
  (5665008, 1, 'Allowance for Permitting.<br />
We will share permit cost with you and our billed hours (@$120/hr.) then we will credit back the difference.<br />
Public Works permits are faster than going through planning so shouldn''t be that bad. Thank you!'),
  (5666087, 3, NULL),
  (5666108, 4, '15 gallon for 5 gallon<br />
(2) 1 gallon plants <br />
(1) 5 gallon plant<br />
(2) 4" plants<br />
 '),
  (5668376, 1, 'Backyard adding a drainage run from corner of garden bed near pathway (with 1 inlet) to drain beneath small boulders (with 1 catch basin)<br />
Frontyard we will be reshaping existing dry creek to create better drainage pathway using existing gravels/rocks'),
  (5668381, 2, '(4) Dianella ''Lil Rev'''),
  (5669681, 4, 'We are not doing the fountain in this phase.&nbsp; Maybe in Phase 3.'),
  (5669726, 5, 'Material costs in estimate - $150<br />
Actual cost of Bloodgood Maple - $250'),
  (5678663, 6, NULL),
  (5678667, 7, 'Credit: $865<br />
<br />
Maple original cost($385) + approved maple change order($100) = $485<br />
4 (1 gallon) Sea Thrift = $100<br />
4 (5 gallon) Kalanchoe bracteata (Silver teaspoons) = $180<br />
3 (1 gallon) Echinacea angustifolia = $75<br />
2 - 4" Large Italian Basil = $25'),
  (5681484, 1, 'Add 2 additional ground lights '),
  (5681491, 2, 'Build step along patio section- 18LF '),
  (5681509, 3, NULL),
  (5682536, 5, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">224 sq ft of concrete $4592</span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">135 additional linear feet of additional forming for turf strips $650</span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">82 linear foot of turf strips at $23 per linear foot $1886</span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">44 linear feet of drainage 5 inlets $1550</span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">$8678</span></span>'),
  (5687054, 13, 'As per design plan '),
  (5687056, 14, NULL),
  (5687066, 15, '1 Zone '),
  (5687847, 1, 'Removal of gate/track/motor is not possible due to the severity of the system'),
  (5687851, 2, 'Lower the existing sewer line in the driveway.  The current condition it that is just under the surface of the concrete driveway.  Needs to be lowered by 12'' below grade '),
  (5690917, 5, NULL),
  (5690928, 6, '10- 1.gal.
2- 15.gal.
12- 5gal.'),
  (5691802, 4, NULL),
  (5691804, 5, NULL),
  (5693607, 6, NULL),
  (5694568, 8, '2 matching path lights WITHOUT bulbs from Vista.'),
  (5695630, 16, NULL),
  (5695645, 17, NULL),
  (5695661, 18, NULL),
  (5695672, 7, 'See contract credit for 3 15gallon at $175.00 each'),
  (5695809, 2, '$12.00 @ LINEAR FOOT X 90 LINEAR FEET= $1,080.00'),
  (5698569, 8, NULL),
  (5699752, 19, '<div style="margin-left: 8px"> </div>

<ol>
	<li style="margin-left: 8px"><span style="font-family: Times New Roman, Times, serif">Turf prep </span></li>
	<li style="margin-left: 8px"><span style="font-family: Times New Roman, Times, serif"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="color: black">Install 2” of class II roadbase, compact</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-family: Times New Roman, Times, serif"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="color: black">Install 1” of DG subbase, compact</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-family: Times New Roman, Times, serif"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="color: black">Install roughly 660sqft of turf (turf to be ordered by client/price of the turf not included in total cost)</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-family: Times New Roman, Times, serif"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="color: black">Stake, staple and S seam all joints </span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-family: Times New Roman, Times, serif"><span style="font-size: 11pt"><span style="line-height: normal"><span style="color: black">Install bender board for approx 20 linear feet to separate tree in front yard from turf</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-family: Times New Roman, Times, serif"><span style="font-size: 11pt"><span style="line-height: normal"><span style="color: black">Install bender board for new shrub for top left slope  roughly 20 linear feet </span></span></span></span></li>
</ol>
'),
  (5699754, 20, NULL),
  (5704732, 1, 'Removal of waterfall feature.&nbsp;<br />
Installing new prefab water feature.'),
  (5704736, 1, 'Prodigy Design credit for installation.<br />
&nbsp;'),
  (5704737, 2, '51 linear feet of copper plumbing at $55 per lnear foot&nbsp;'),
  (5704748, 3, 'New estimated turf amount is 225 sq ft (60 sq ft more than contracted amount at 17 per sq ft'),
  (5709445, 1, 'Cost in contract is added incorrectly

Will credit $1165. 50

Brings contract for backyard to $21,551. 50'),
  (5710020, 3, 'Apply sealer for the Driveway pavers.&nbsp; This is only for the main driveway..for both driveways it will be an additional $450.00'),
  (5712975, 1, NULL),
  (5713005, 21, NULL),
  (5716519, 1, 'Install (4) recessed lighting fixtures.

Install ceiling fan fixture.

Install one outlet.

Install 2 light switches. 
'),
  (5716881, 4, NULL),
  (5718645, 6, NULL),
  (5719929, 1, 'No need for the additional valve'),
  (5719958, 2, 'Additional 4 Stations for Rachio ($424.00)<br />
<br />
Install new 1" main Pressure Regulator plus Pressure Relief Valve for Water main ($635.00)<br />
<br />
Run new irrigation wire from front irrigation valves to the backyard ($225.00)<br />
<br />
<br />
<br />
<br />
<br />
 '),
  (5719986, 3, 'Add (5) Flood Lights  ($1,125.00)<br />
Add (2) 24" box trees ($770.00)<br />
Add (17) 5 Gallon plants ($739.50)<br />
Saw cut and demo concrete by corner of house ($725.00)'),
  (5729188, 2, NULL),
  (5729195, 3, 'Additonal rock installed&nbsp;<br />
673 sq ft more than contracted amount<br />
<br />
&nbsp;'),
  (5732044, 2, NULL),
  (5734830, 1, NULL),
  (5737296, 22, NULL),
  (5737750, 4, '1- credit of 40 sq ft of putting green at $17 a sq ft&nbsp; $-680<br />
2- adding 61 sq. Feet concrete&nbsp; + demo of 61 down 7 inches +814<br />
3- adding 4 LF. Of curb&nbsp; $+160<br />
4- 8 LF. Of steps $+520<br />
5- adding 2 more lights $+480<br />
Credit 80 LF of drainage @25 a linear ft -2000<br />
<br />
total credit $-716'),
  (5740994, 1, NULL),
  (5740999, 2, 'For 16sqft&nbsp;'),
  (5741002, 3, 'For 245sqft (pavers within the gate entry)'),
  (5741006, 4, 'semi gloss'),
  (5741077, 3, NULL),
  (5741087, 4, NULL),
  (5741088, 5, NULL),
  (5741768, 5, 'Change from semi-gloss to wet look'),
  (5741989, 2, '(9) 5 gallons

(1) 24 inch box '),
  (5742190, 3, 'Extend front entry way for step pad. Total 26 LF '),
  (5742191, 4, NULL),
  (5742662, 23, NULL),
  (5743187, 6, 'Rock upgrade +175
Irrigation timer 8 station +400
Removal of transformer - 437'),
  (5743913, 1, NULL),
  (5743931, 2, NULL),
  (5744316, 3, NULL),
  (5748137, 4, 'Old costs for electrical runs:<br />
100 LF of 3/4" conduit with (6) 12 gauge wires (no breakers) = $4,550<br />
<br />
New costs:<br />
176 LF of 1 1/4" conduit with (6) 12 gauge wires, junction box and 2 breakers = $9,176<br />
<br />
Cost difference (change order charged above): $4,926<br />
 '),
  (5748143, 5, '60 LF of EMT'),
  (5748374, 6, NULL),
  (5749169, 5, '(2) 15 gal Bougainvillea '),
  (5749229, 6, 'Install (8) 5 gallon Agave Americana 
Install (4) 24 gallon multi olives
Install(3) 5 gallon Mexican Fence post
Install (2) 15-gallon fire sticks '),
  (5749870, 7, NULL),
  (5752536, 2, NULL),
  (5753783, 6, NULL),
  (5756237, 7, '-$300 credit for removing boulders and setting aside<br />
<br />
$300 needed in budget to move boulders back to front yard with wheelbarrow'),
  (5756243, 8, NULL),
  (5756268, 9, NULL),
  (5756287, 10, NULL),
  (5757462, 7, NULL),
  (5757988, 7, '26 1 gallon plants at 21.50 each (18 planted now, 8 later )
7 5gallon plants at 43.50 each 
1 15 gallon plant at 150 
Transplanting plants $50


Original plant quote in Contract is 976

New amount is 1063.50

Difference of 
$87.50'),
  (5757994, 8, 'New transformer '),
  (5758784, 9, NULL),
  (5758915, 5, 'Rock boulders +430
Additional electrical run +640
'),
  (5759166, 1, NULL),
  (5765874, 6, '8 lights at 240 each'),
  (5766034, 7, '16 creeping fig 5 gallon at $50&nbsp; each<br />
22 1 gallon lirope at 25 each<br />
12 5 gallon maori queen at $50 each&nbsp;<br />
4 5 gallon purple lantana at $50&nbsp; each<br />
13 5 gallon bush jasmine at $50 each<br />
1 15 gallon japanese maple tree at 315 each<br />
10 5 gallon white gardenia at $50 each<br />
6 1 gallon coral bells at 25 each<br />
2 15 gallon pygmy palms at 315 each<br />
12 1 gallon white acopa at 25 each<br />
11 5 gallon pink kangaroo paw $50 each<br />
1 1/2 flats succulents $125<br />
1 5 gallon night blooming jasmine at $50<br />
4 lavender hidcote at $50 each<br />
<br />
<br />
71&nbsp; total 5 gallons =3550<br />
40 1 gallon plants =860<br />
3 15 gallon ornamentals =945<br />
1 1/2 flats of succulents = 125<br />
5 linear feet of channel drains at 80 per lf = 400<br />
<br />
<br />
<br />
Iniital proposed amount 7588 of planting&nbsp;<br />
<br />
credit of&nbsp;<br />
&nbsp;'),
  (5766068, 8, '$875 of mulch originally allocated for 350 sq ft<br />
<br />
new total is 580 sq ft of decorative rock at 3.85 a sq ft $2233'),
  (5773965, 11, 'Line item #3 under pilasters
Not doing'),
  (5774801, 12, 'not doing the fountain, not demo, not providing river rock.<br />
<br />
(Outlet install is under Utilities)'),
  (5777153, 9, 'Total of lights installed 31
14 lights in contact 
Additional 8 lights on 2/20/2023
Additional 9 lights on 2/22/2023'),
  (5777645, 1, 'Tie Downspouts into (2) 3” drains with pop ups into the yard beyond concrete '),
  (5778699, 24, '(5) Leucadendron&nbsp;<br />
(4) Cordyline&nbsp;'),
  (5783556, 1, 'Each piece is 16'' long by x wide.  In order to get the shape of your design, we need an extra 115 SF of turf. This does not include the 10% overage which is included in our costs.'),
  (5805259, 6, NULL),
  (5805331, 2, '1- Demo concrete water feature dispose. $2800

2- 904 sq.  extra demo/grading of soil $6000.


'),
  (5805334, 3, NULL),
  (5805336, 4, NULL),
  (5805342, 5, 'Moving drain from the step and drain in ti planter'),
  (5805423, 25, 'Adding 1-2 inch mexican buff with weed fabric front and back yard.
Additional bend a board.

'),
  (5805513, 26, NULL),
  (5810156, 13, '7 lights for columns labor only.'),
  (5818245, 27, NULL),
  (5818687, 6, '1100 sq ft of rtf sod at 3.75 per sq ft $4125<br />
adjustment of sprinkler $40<br />
benderboard $225'),
  (5821379, 1, NULL),
  (5821387, 2, NULL),
  (5823950, 1, '165 SF 3/8" del rio gravel'),
  (5827125, 1, NULL),
  (5830523, 2, NULL),
  (5830527, 3, NULL),
  (5830529, 4, NULL),
  (5830535, 5, NULL),
  (5830539, 6, NULL),
  (5830546, 7, NULL),
  (5830550, 8, 'client purchased timer, this is for installation only'),
  (5830592, 9, NULL),
  (5832858, 1, 'Switch (2) valves out and add drip to middle planter&nbsp;'),
  (5832861, 2, NULL),
  (5832910, 10, NULL),
  (5832915, 11, NULL),
  (5836996, 1, '1) Pool- moved away from house, changed orientation, added spa<br />
2) Moved shower location<br />
3) Shifted decking and steppers<br />
4) Removed sauna'),
  (5844799, 47, '(2) 5g Rosmarinus officinalis<br />
(5) 5g Lavandula angustifolia'),
  (5845480, 2, 'Add (2) 15 gallon plants to the backyard pots<br />
Add (3) 5 gallon plants to the DG planter'),
  (5848588, 14, '9 - 26" x 26" Modern Bellacrete Pilaster Caps<br />
<br />
Original material option was for a 16-24" cap at $25 material allowance per cap.  These are $100 each with a discount on our markup (as I know this is mid-project).'),
  (5848791, 7, '92 Sq ft of turf <br /><br />75x6 man hours <br />105 Sq ft ordered at 4.25 a sq ft<br />50 dollars in base<br />$25 nails<br /><br /><br /><br />$971'),
  (5848813, 8, '<u><strong>OPTION 1</strong></u><br />
4 15 gallon colored roses at 225 each<br />
14 15 gallon iceburg roses at 175 each<br />
20 1 gallon bacopa at 21.50 each<br />
20 5 gallon lavender hidcote at 43. 50 each<br />
16 5 gallon penstemon tbd at 43.50 each<br />
Removal of existing plants at 300<br />
1 new zone of drip rrigation at 950<br />
Mulch&nbsp; with weed fabric 240<br />
$6836<br />
<br />
<strong><u>OPTION 2 (</u></strong>Price for less mature roses)<br />
14 5 gallon ice burgs at 43.50<br />
4 5 gallon colored roses at 65 each<br />
$3486<br />
&nbsp;'),
  (5856688, 2, NULL),
  (5856694, 3, NULL),
  (5856700, 4, NULL),
  (5857097, 5, NULL),
  (5857295, 6, 'LABOR ONLY!<br />
<br />
85 (1gal) in contract, we have 139 (1gal) in total + 2 (2gal) = qty difference is 56 (1gal) @ $12/each = $672<br />
 
<div><span>1 - 15 gallon @ $50/each = $50</span></div>

<div> </div>

<div><span>3 (5gal) in contract, we have 7 (5gal) in total = qty difference is 4 (5gal) @ $20/each = $80</span></div>

<div> </div>

<div><span>2 - 2 gallon - included in 1 gallons above!</span></div>
'),
  (5858352, 48, '- Demo and install new Decomposed granite, approx. 1,000 SF at 2" depth. Grade towards drains, add or reposition one drain near flow. $4,500<br />
- Remove and reuse bender board in DG area to sit above final grade as much as possible. Approx. 75 LF - Labor only $300<br />
- Replace (courtesy of manufacturer) X LF of benderboard in areas where paint has worn off. (no charge)<br />
- Install 6 CY mulch throughout property. $800<br />
- Weeding. $150<br />
- Install 80 SF of sod. $320<br />
- Remove and reuse bender board nearest veggie beds and clean up mulch that has spilled over. (no charge)<br />
 '),
  (5860977, 7, NULL),
  (5861584, 10, NULL),
  (5861590, 11, NULL),
  (5861608, 12, 'We do not warranty transplanted plants'),
  (5878812, 8, 'Homeowner is declining the sealant at this time. Daniel go ahead and approve this negative change order and we will proceed with finishing out the financials. Thank you! '),
  (5883766, 1, '(1) 36" multi Arbutus marina <br />
(2) 15 gallon Abelia grandiflora '),
  (5886791, 7, '5- 5gal. Westragea
5- 1gal. Rosemary pastrada '),
  (5886843, 8, NULL),
  (5888709, 28, NULL),
  (5892604, 6, NULL),
  (5893762, 3, NULL),
  (5896168, 1, '245 SF weed barrier '),
  (5896172, 2, NULL),
  (5896186, 3, NULL),
  (5896190, 4, NULL),
  (5896196, 5, NULL),
  (5896266, 6, NULL),
  (5899932, 3, NULL),
  (5902880, 10, 'Adding (5) path and (1) up light.<br />
&nbsp;'),
  (5902905, 1, NULL),
  (5902910, 3, NULL),
  (5908748, 4, NULL),
  (5909257, 2, NULL),
  (5909264, 3, NULL),
  (5909943, 15, NULL),
  (5910939, 7, NULL),
  (5912909, 4, NULL),
  (5913283, 5, NULL),
  (5913284, 6, NULL),
  (5918291, 8, 'Recunduct 3 stations manifold 
Repair 1-1 inch pipe
'),
  (5921860, 7, 'From 15 gallon to 24" box <br />The difference is $925.00<br />5 count. '),
  (5921912, 1, 'Credit for design'),
  (5922640, 8, NULL),
  (5922659, 9, NULL),
  (5925441, 1, NULL),
  (5927649, 1, '850 Sq ft of mulch at 1.25 a sq ft '),
  (5927962, 2, 'Along very back of property '),
  (5930052, 4, NULL),
  (5933371, 9, 'Bellecrete called me back with the final pricing. The steppers cost $53 plus tax It''s going to be for a 18x24 stepping stone. We would charge $25 per stone installed. So 200 total for the install cost. 466.40 for material'),
  (5935547, 11, '3 new pathlight to replace 3 that broek, paid repair, the glass on the path lights were brokern&nbsp; &nbsp;Lightcraft AP--C-2108-Amber<br />
Also one of the firepit caps is loose, and needs to be glued back<br />
&nbsp;'),
  (5937665, 9, '3.5'' X 3.5= approximately 13 SF  Juventino said he would charge $300.00, they have pavers on site'),
  (5940179, 3, '4'' 6"H x 20 long CMU Block includes demo and haul out (no stucco)'),
  (5940719, 5, NULL),
  (5940738, 6, NULL),
  (5944635, 11, 'Credit for light - 240<br />
Timer/Install&nbsp; + 160'),
  (5954466, 8, 'reduced the sod by 228 SF X $4.25= 969.00'),
  (5958053, 1, 'grind out stump and roots for (2) stumps&nbsp;'),
  (5959379, 4, '9 linear feet of countertop and island additonal&nbsp;'),
  (5959391, 5, 'We installed an additional 120 linear feet of drainage (100 linear feet on original contract)'),
  (5960772, 9, 'The owner has provided daylilies '),
  (5961665, 2, 'mesh for roughly 500sqft<br />
37 baskets for front yard (main area)'),
  (5961747, 3, NULL),
  (5961754, 4, NULL),
  (5964961, 1, NULL),
  (5966883, 5, '(4) 4’ wide steps '),
  (5968656, 6, NULL),
  (5968936, 6, NULL),
  (5969284, 1, NULL),
  (5973365, 10, NULL),
  (5974465, 9, 'Replaced 1 shut-off valve
Replaced 1- pressure regulator 
With box
Planted 
13- 5 gal. Shurbs
14- 1 gal. Shurbs
2- flats ground cover
Irrigation included '),
  (5979101, 10, NULL),
  (5979318, 11, NULL),
  (5979998, 5, '(6) 5 gallon plants
1600sq ft of dg
$6,901'),
  (5984245, 1, 'Adding mow straps and drainage'),
  (5986584, 1, 'Credit of 7 lights $1680
Removal of 10 5 gallon little Johns $435
Breaking  two drain grates and adding two catch basins 12 inch$750
Adding 600 Sq ft of pea gravel from mulch$1200




Total credit $165

'),
  (5990816, 7, NULL),
  (5990930, 1, NULL),
  (5990945, 2, 'change order for going from pavers to turf -$335'),
  (5997418, 6, 'Add (2) 5 Gallon Creeping Fig
Add (4) 15 Gallon Silver Sheen
'),
  (5997427, 7, 'Add 11 Station Rachio Irrigation Timer / 120’ of irrigation wire'),
  (5997440, 8, 'Contracted for 3,150 sq ft
Installation of 2,420
  Difference of 730 sq ft'),
  (6002331, 1, ' Clean out pool from water and debris

Clean up Misc pipe laying around in the backyard

Trim branches that are hanging over the pool

Add new regulator and auto fill for Courtyard water feature. Clean out as well'),
  (6003560, 52, '48 (5 gals) with irrigation at $45.00 =&nbsp;2,160<br />
20 (1 gals) with irrigation at $23.00 = 460'),
  (6003619, 1, 'Additional paver wall to fit the 24" boxes&nbsp;'),
  (6009243, 13, 'Removal of Existing Trees.  Plant (8) 24" Box Ficus Nitida Trees '),
  (6011375, 1, 'Original cost of palm $360 - (2) $45/ 5 gallons that we couldn''t get.
New total is $270 for palm.
Subbing (2) 5gal clivias.'),
  (6014687, 1, 'Barrier&nbsp;<br />
Lay 2,880 Sq Ft of barrier on project area<br />
Fabric type is Weed barrier.'),
  (6024192, 1, 'Upgrade turf to Nature''s Best by SGW Corp. $160'),
  (6024834, 1, NULL),
  (6024841, 2, 'Rebuild completely new wall with 6”
CMU block and finished in sanded stucco
Wall to be 15’ x 5’ tall '),
  (6029505, 5, 'Replace (2) Step lights at front walkway'),
  (6029566, 2017023, 'Jaclyn Santana<br />
Cell: 661-713-0799<br />
Email: Santana.jaclyn@gmail.com<br />
1124 Arbor Dell Road, Los Angeles, CA 90041.<br />
<br />
Demolition<br />
1. Remove/ brake pavers in 2x2 Square Feet area.<br />
2. Haul debris removed by picture build.<br />
<br />
Repair<br />
1. Repair 2x2 Square Feet area set new pavers in (Client is to provide pavers for repair)'),
  (6030468, 6, '

For 3 flats of creeping thyme
12 1 gallon false Heather''s
3 whirling butterfly in 5 gallon '),
  (6030485, 7, 'Additional dg
Benderboard fix
Irrigation
'),
  (6032015, 7, '+24 linear feet of wall cap for a total of 90 linear feet<br />
increase size of wall cap from 8" t0 10"'),
  (6032080, 8, '(3) landings in Bellecrete for a total of 28 linear feet of landings<br />
(originally contract stated landings would be concrete only)<br />
&nbsp;'),
  (6032090, 9, '65 linear feet for 1 1/2" gas line '),
  (6032113, 10, '70 linear feet for 3/4" electrical line '),
  (6032121, 11, NULL),
  (6035978, 3, NULL),
  (6038567, 1, NULL),
  (6046619, 1, NULL),
  (6048840, 2, '(1) 15G Dwarf Japanese Maple<br />
(1) 5G Salvia Clevelandii <br />
(1) 5G Mexican Salvia <br />
(3) 5G Lomandra ''Breeze'''),
  (6062725, 8, '648 sqft sod - $2,430<br />
30 sqft saw cut - $473<br />
Drains - $3900'),
  (6062867, 9, NULL),
  (6067192, 10, NULL),
  (6067200, 11, NULL),
  (6069690, 3, 'Additional Sq Ft to accomodate the Pizza oven and countertop / Electrical'),
  (6070198, 3, '(5) 1 gallon Nepeta
(2) 1 gallon Sea Lavender '),
  (6070232, 4, 'For all front yard beds and parkway beds on Texhoma '),
  (6072977, 12, '(9) stem path lights<br />
(17) up lights<br />
(3) wall wash lights'),
  (6073063, 13, '<strong>Total plant count</strong><br />
<strong>164</strong> 1 gallon<br />
<strong>90</strong> 5 gallon<br />
<strong>56 </strong>15 gallon<br />
<strong>11</strong> 24" boxed trees (does not include (2) 7 gallon redbud Yvonne sourced separately)<br />
<strong>50</strong> flats of Carpet of Stars groundcover <br />
 '),
  (6073068, 14, NULL),
  (6073119, 1, 'upgrade tree 36in - $975<br />
6 station timer - $330<br />
&nbsp;'),
  (6073148, 2, NULL),
  (6073171, 3, NULL),
  (6075092, 1, NULL),
  (6076112, 3, NULL),
  (6077290, 1, '3 lights - 675<br />
Credit for valve, still need adjustments (-565)'),
  (6081456, 2, 'Add 40 LF of drains and 2 gravel pits for deck drains and pool overflow '),
  (6081471, 3, 'Saw Cut (E) 2 steps at back patio and remove

 Re pour to help elevation difference and make better transition

'),
  (6081475, 4, 'Deduction in height of planter wall by approximately 16”'),
  (6081480, 5, 'This is to credit for Weep holes, French drain and (1) Drain inlet...&nbsp; Homeowner and I discussed allowing water to permeate into the planter rather than having the water go into gravel retention basins...'),
  (6081664, 2, 'Add 2 to 3 inches of gorilla hair, mulch for backyard hillside'),
  (6081732, 6, '(2) Additional Bins were needed in order to achieve the necessary elevations'),
  (6081741, 7, 'Possibly reduce the light count by 3 lights'),
  (6081746, 8, 'To possibly reduce plant costs...19 (1) Gallon Contracted VS 7 (1) Gallon Proposed Reduction for a total of 12 Planted $175<br />
&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;13 (5) Gallon Contracted VS 9 (5) Gallon Proposed Reduction for a total of 4 Planted $180'),
  (6083278, 2, NULL),
  (6086243, 1, '14 linear feet of wall combined<br />
18 inches high<br />
with belleCrete caps (existing)&nbsp;<br />
<br />
$1160<br />
&nbsp;'),
  (6095136, 2, 'Additional drainage 76 lnft with inlets $32.50 - $2470'),
  (6095138, 3, 'vertical soldier course 25lnft'),
  (6095140, 4, NULL),
  (6095145, 5, NULL),
  (6097784, 4, NULL),
  (6097841, 5, 'credit stucco $-1300<br />
80sqft seating area @ 28.50<br />
12lnft edges @ 28.50<br />
72 sqft veneer bbq @28.50<br />
$4332<br />
<br />
Total&nbsp;3,374<br />
&nbsp;'),
  (6097955, 1, '(1) 15G icee blue Podocarpus
(3) flats of groundcover 
(1) 5G kangaroo paw '),
  (6097960, 2, NULL),
  (6097969, 3, '20’ tube
100 emitters '),
  (6097976, 13, 'Tile&nbsp;'),
  (6097992, 14, 'Per contract, picture build was to redo pool lines. allocation was $4375<br />
<br />
Client requested rerouting which was billed by contract at different rate. Picture Build did not redo lines, credited back to client.&nbsp;'),
  (6098406, 6, NULL),
  (6101074, 4, NULL),
  (6102827, 2, NULL),
  (6106884, 1, '225sqft of additional Del Rio gravel used&nbsp;'),
  (6106892, 2, '(6) medium/large size boulders added to front yard&nbsp;<br />
&nbsp;'),
  (6106915, 3, '(2) 5 gallon Leucospurmum <br />
(2) 5 gallon Aeonium succulents in purple <br />
(3) 5 gallon Lavender ''Meerlo''<br />
(6) 1 gallon French Lavender<br />
(3) 1 gallon Sea Lavender '),
  (6118578, 9, 'Add the original quantity of plants back in per the contract. '),
  (6118584, 10, 'Add back the original contracted amount of lights in plus add 5 more for a total of 15
  (12) Step Lights 
  (3) Up Lights '),
  (6118613, 1, 'Add 20 ft of 3” pipe under the driveway for future access '),
  (6122042, 1, 'Holland Paver border for around turf (border for paver area which is 19 linear feet is included in original cost)'),
  (6122110, 9, 'Coring, patching and waterproofing of 12 pots. 
  This does not include soil or plants. '),
  (6122593, 1, 'Deduct 2 Pour Lids'),
  (6122622, 2, 'Add 1'' of channel Drain at Garage'),
  (6122628, 3, 'Add Vertical paver course along property line in the Driveway'),
  (6122702, 2, 'One zone of irrigation<br />Concrete cutting <br />Resetting one row of 12x12 pavers. '),
  (6130522, 4, '1 guy 2 hours or 2 guys 1 hour<br />Trench for dry riverbed. All rocks on sight in area that PB has deo rio installed. <br />$150.00'),
  (6133102, 1, NULL),
  (6133261, 2, '1-Demo ex. wall

2- Demo 200 sq feet of damaged concrete 

3- Pour  200 sq. feet of natural grey 3000 psi. to match existing.

4-Build new 6x8x8 cmu wall about 57LF at 18" with sand stucco to match house

5- Install about 60 LF. 2x12 treated timber in front of fence to help hold soil.

6- plant install.
     20- 5- gal. shrubs 
     15- 1- gal. shubs

7-  install 420 sq. Feet of 1" del rio with fabric 

8- install 1 zone drip line.  




'),
  (6134797, 1, 'Add a course of Block cap on top of pool deck to divert pool water'),
  (6134800, 2, 'Cut back front grass to slope to new concrete'),
  (6137799, 1, NULL),
  (6140828, 4, '(3) 5 gallon Bougainvillea 
(3) 5 gallon succulents for planters 
'),
  (6140986, 1, 'Reinstalling fountain with bigger basin, plus additional rocks will be needed to fill around the fountain area.'),
  (6141032, 2, '(4) 1 gallon Creepping Rosemary<br />
(4) 1 gallon Mexican Salvia<br />
&nbsp;'),
  (6143037, 5, NULL),
  (6143551, 1, 'Electric and Gas for bbq/fireplace&nbsp;<br />
japprox $500-$1000 for both permits'),
  (6145456, 7, 'Credit for not building soldier course'),
  (6145462, 8, '2 lights discounted price'),
  (6145470, 9, 'Credit for wall reduction'),
  (6149272, 2, NULL),
  (6149572, 10, 'Swapping old irrigation valves with new ones. Plastic '),
  (6150453, 4, NULL),
  (6151396, 5, NULL),
  (6153272, 3, NULL),
  (6157436, 12, 'Replace 3/4" pressure regulator in the backyard'),
  (6160771, 11, 'Remove and Re-Install pavers along front driveway to sideyard to square pavers with the house.&nbsp; Remove (1) existing light&nbsp;'),
  (6168727, 1, 'Pvc not reconnected to sprinklers. She handled it herself.&nbsp;'),
  (6169959, 1, '(4) step lights ($240 each installed)&nbsp; + 1 transformer ($435)'),
  (6169961, 2, '420sqft'),
  (6169962, 3, '27 LINEAR FEET OF 1" CONDUIT BURIED BELOW GRADE WITH 1 J-BOX ROUGH IN '),
  (6169967, 4, '16 LF Green Landscape Timber Step'),
  (6169970, 5, '65SQFT ADDITIONAL TURF&nbsp;'),
  (6170016, 6, '35sqft&nbsp;'),
  (6173633, 7, NULL),
  (6183102, 1, NULL),
  (6187799, 29, NULL),
  (6191320, 8, NULL),
  (6191949, 2, '1 hour of work '),
  (6192131, 1, NULL),
  (6192563, 6, NULL),
  (6192663, 1, 'Bringing grade down below small wall + large Westringia shrub '),
  (6197016, 10, 'Extensive added hardscape work on back patio.<br />
1) Form for extended patio sections.<br />
2) Form for extended step sections.<br />
3) Hand Mix and Float entire back patio.<br />
4) Hand Mix and Pour added steps.<br />
5) Total hand mix and pour of 20 yards of concrete.&nbsp;<br />
6) Cover all need sections and steps with stone<br />
<br />
Originally $14,000.00, reduced to $7,500'),
  (6197024, 11, '1-Demo out a total of 6 palm trees and 2 small trees 
2- Stump grind 
3- Dump fees'),
  (6197084, 14, '2- bears lime
2 -Washington navel
2 -myer lemon

4- gal. Westragea 
3- 15. Carolina cherry '),
  (6197090, 15, '<br />
Remove Old Equipment<br />
<br />
Install new equipment (designed to interface with Control 4 home system):<br />
(1) New Pentair Load Center<br />
(1) New Pentair Intellitouch System I9+3.&nbsp; For 3 lights to be controlled seperately.&nbsp; If more lights added we will need to add more channels.<br />
(1) New Pentair Screen Logic System<br />
(3) New Pentair Intelliflo 3VSF Variable Speed Pumps - 3 HP<br />
(1) New Pentair FLT CNC PLS 520 Cartridge Filter<br />
(1) New Pentair Master Temp Lo Nox Natural 400K BTU Gas Heater<br />
(3) New Pentair LT INTLBRT 5G 120 V LED Pool Lights<br />
&nbsp;'),
  (6197101, 16, 'Demo 2 Elm tree 

Demo out 487 square feet 6/7 inches of soils for concrete 

Form and pour 6" high curb 13LF.

Rebar and pour about 487 square feet of concrete 
'),
  (6197103, 17, 'Added concrete around sports court. Short load. Small pour $30/ sq feet including finishing.'),
  (6197107, 18, 'Saw cut 8 LF./demo 12sq. Feet of concrete for planter in front of alley wall.
'),
  (6197114, 20, 'trim around plants, tack plants, Scrape, grind wall for prep and proper paint adhesion. Paint wall two coats. Roughly 1200 sq feet.'),
  (6197120, 21, 'Did shower demo including wall - this was over credited in previous credit change order.&nbsp;&nbsp;<br />
Need to prep and grind all shower walls,&nbsp; Need to stucco coat wall.&nbsp;'),
  (6197851, 22, 'Did not do water feature install in the backyard.'),
  (6197905, 23, 'Due to changes in planting schedule.&nbsp; We did on onsite assessment of current planting vs contract.&nbsp;<br />
<br />
Current planting has (14) - 1 gallon rosemary.&nbsp; (130) 1 gallon Lerope&nbsp; (27) 5 gallon boxwood&nbsp; (4) 5 gallon Acacia&nbsp; (11) 1 gallon Barkley Sage&nbsp; (2) 5 gallon Westrangia. (23) 15 gallon fieres<br />
<br />
Credit due of $1,170 due to less plants and smaller sizes for some.<br />
<br />
All planting from this point will be charged seperately in a change order'),
  (6198059, 24, 'Original contract had (12) trees.&nbsp; 4 olives and 1 pygmy palm have been planted, 2 more being ordered plus 3 refused that cannot be returned to the nursery.&nbsp;<br />
<br />
(Credit 2 trees) $4,832'),
  (6198926, 1, 'Adding weed barrier for about 600 sqft under mulch'),
  (6199624, 1, NULL),
  (6199637, 2, NULL),
  (6199659, 3, NULL),
  (6199667, 4, NULL),
  (6199716, 5, NULL),
  (6200507, 6, 'BiInvoiced for normal turf at $21,937'),
  (6200841, 3, '14linear feet of ledge using Rustic wall (grey/charcoal to match pavers) with wall cap to be installed to cover footings behind far side of pool and 23 linear feet of Rustic Wall to create planter starting from the telephone pole towards entry gate.&nbsp; This will allow the footings to be hidden.&nbsp;'),
  (6207690, 2, NULL),
  (6207692, 3, NULL),
  (6208719, 15, NULL),
  (6208727, 16, 'Wrinkled 24 x 12 Sonorostone french grey stepper for around the pathway on back 40'),
  (6208736, 17, '11 x 24x24 Modern/Straight/Sand Finish in Midnight<br />
t'),
  (6208745, 25, 'Picture Build did all the demo and chipping of pool wall and preped and floated all the walls.&nbsp;'),
  (6208755, 18, '16 x 24''x14 Modern/Straight Steppers in Midnight '),
  (6208756, 19, NULL),
  (6208971, 26, 'Upon review the pricing had 4,263 sq feet. However, per the contract that included 10% overage of material. So the actual installation of stone was charged at 3,836 sq feet only.&nbsp; Actual waste was very minimal.&nbsp;<br />
<br />
However, that calculation also&nbsp; included the steps which being charged for separately should have not been included in the actual sq foot count.&nbsp; So the actual installation charge for flat work not including the steps should have been 3,836 minus the step installation being charged separately.&nbsp; &nbsp;The steps were roughly 280 square feet (224 x 15 inches).&nbsp; Thus, the actual stone installed should have been only 3,556 sq feet.&nbsp;<br />
<br />
However, we ended adding some sq footage back in by adding extra sq footage in patio, some risers and the firepit work. That added up to 127 square feet.&nbsp; (not as much as in the other deleted change order).<br />
<br />
Thus, the actual installed stone per contract and measurements should have been 3,683<br />
<br />
The actual stone onsite remaining is 93 pieces. 93 x 6 sq feet equals&nbsp; 558 sq feet.&nbsp; &nbsp;The original order of 4,263 minus 558&nbsp; is 3705. This leaves about 22 square feet that was used for cuts.&nbsp; Which is pretty close.&nbsp;<br />
<br />
So the installation work charged per contract is correct.<br />
<br />
However, waste being actual very minimal and some extra due to steps incorrectly in contract.&nbsp; Picture Build will pay for 1/2 the stone $4,882 onsite.&nbsp;<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
&nbsp;'),
  (6212785, 1, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: "><span style="color: black">Trenching for utilities Backfill and compact = <b>$3900 misc </b>work done to backfill trench and compact 3 ft down by 41 linear feet. <b>Wasn''t in initial scope of work</b></span></span></span></span><br />
 '),
  (6212788, 2, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: "><span style="color: black">Drainage 480lnft @25 = $12000 </span></span></span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: "><span style="color: black">Drain Inlets = $1800</span></span></span></span><br />
<br />
11000 in original estimate'),
  (6212794, 3, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: "><span style="color: black">80% of drainage cost is related to lids based on lids plan run  (<b>$11,040)Lids</b> however, you can deduct this out of the original estimate since we don''t anticipate running new drains. </span></span></span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: "><span style="color: black"> other drainage ran in anticipation of future hardscape/landscape.</span></span></span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: "><span style="color: black">80 sq ft of rain garden = $4400 <b>Lids</b></span></span></span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: "><span style="color: black">French drain storm planter 37lnft $600<b> Lids</b></span></span></span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: "><span style="color: black">Rain Barrels 1150 <b>Lids</b></span></span></span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: "><span style="color: black">Backfill $390 3 yards <b>Lids</b></span></span></span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: "><span style="color: black">Waterproofing-coats of roll on + bituthene 4000 111 sqft total<b> $1831.50</b> 37 linear feet by 3 feet high</span></span></span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: "><span style="color: black"> <b>LIDS</b></span></span></span></span><br />
 '),
  (6213153, 2, NULL),
  (6215002, 4, NULL),
  (6215012, 5, 'Allowance was $1600, reducing to $1000 too offset additional turf cost'),
  (6218778, 4, 'Plus double staking '),
  (6219432, 1, 'Extend the planter wall out 4 feet'),
  (6219464, 2, 'Additional grass st Augustine 188 sf x 4,25= $799.'),
  (6220746, 3, 'This credit will attach to the new change order where we will be concrete cutting the length of the patio at the brick ribbon.&nbsp; We will still sand and bevel the short area of concrete that will still be adjacent to the grass.'),
  (6220756, 4, 'This is to concrete cut the length of the patio at the brick ribbon.&nbsp; We will still need to sand and bevel the short concrete area on short planter box side.&nbsp; This includes hauling away the concrete'),
  (6220773, 5, '10 Linear Feet of brick border, to cover a drainage line X $25.00= $250.00'),
  (6220790, 6, 'Additional 21 Linear Feet of drainage X $25.00= $525.00 with 1 additional cap $75.00= $600.00'),
  (6223228, 6, NULL),
  (6227457, 1, '<table style="border-collapse: collapse; width: 644px" width="644">
	<colgroup>
		<col style="width: 28pt" width="37" />
		<col style="width: 345pt" width="460" />
		<col style="width: 62pt" width="83" />
		<col style="width: 48pt" width="64" />
	</colgroup>
	<tbody>
		<tr>
			<td align="right" style="border-bottom: 1px solid black; height: 20px; width: 37px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: 1px solid black; border-right: 1px solid black; border-left: 1px solid black"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">1</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; width: 460px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: 1px solid black; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">Credit of (28) 15 Gallon plants at $165 each 2 camellias were subbed</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; width: 83px; text-align: right; vertical-align: top; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: 1px solid black; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-family: Calibri"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><font color="#FF0000"><font>($4,950.00)</font></font></span></span></span></span></span></span></td>
			<td style="border-bottom: none; width: 64px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">ok</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td align="right" style="border-bottom: 1px solid black; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: 1px solid black"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">2</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">credit of reduction of edging -$180</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; text-align: right; vertical-align: top; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-family: Calibri"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><font color="#FF0000"><font>($180.00)</font></font></span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">ok</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td align="right" style="border-bottom: 1px solid black; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: 1px solid black"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">3</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">Credit for string lights 158 linear feet needed, difference of 42 lf -$210</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; text-align: right; vertical-align: top; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-family: Calibri"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><font color="#FF0000"><font>($210.00)</font></font></span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">ok</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td align="right" style="border-bottom: 1px solid black; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: 1px solid black"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">4</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; text-align: left; vertical-align: top; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-family: Calibri"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none">credit 6 lf of channel drain</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; text-align: right; vertical-align: top; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-family: Calibri"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><font color="#FF0000"><font>($360.00)</font></font></span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">ok</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td align="right" style="border-bottom: 1px solid black; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: 1px solid black"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">5</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; text-align: left; vertical-align: top; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-family: Calibri"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none">Credit Post</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; text-align: right; vertical-align: top; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-family: Calibri"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><font color="#FF0000"><font>($300.00)</font></font></span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">ok</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td align="right" style="border-bottom: 1px solid black; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: 1px solid black"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">6</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">Credit Post #2 (this credit was put into the paver sealing)</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; text-align: right; vertical-align: top; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-family: Calibri"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><font color="#FF0000"><font>($300.00)</font></font></span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; background-color: #e2efda; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">ADDED - USE ON LINE 17</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td align="right" style="border-bottom: 1px solid black; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: 1px solid black"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">7</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">-</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; text-align: right; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">-</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"> </td>
		</tr>
		<tr>
			<td align="right" style="border-bottom: 1px solid black; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: 1px solid black"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">8</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">Additional 175 Sq Ft of Pavers $2817.15</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; text-align: right; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$2,817.15</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">ok</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td align="right" style="border-bottom: 1px solid black; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: 1px solid black"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">9</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">28 lf of paver wall cap difference of $280</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; text-align: right; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$280.00</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">ok</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td align="right" style="border-bottom: 1px solid black; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: 1px solid black"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">10</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">13 LF of steps over contracted amount at $65 a lf $845</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; text-align: right; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$845.00</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">ok</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td align="right" style="border-bottom: 1px solid black; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: 1px solid black"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">11</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">60 sq ft of additional stabilized dg at 4.15 per sq ft $249</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; text-align: right; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$249.00</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">ok</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td align="right" style="border-bottom: 1px solid black; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: 1px solid black"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">12</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">front side walk street repair at $25 per sq ft with demo $560</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; text-align: right; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$560.00</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; background-color: #fce4d6; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">MISSING</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td align="right" style="border-bottom: 1px solid black; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: 1px solid black"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">13</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">Garage concrete repair 30 sq ft of concrete at $25 per sq ft with demo $750</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; text-align: right; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$750.00</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">ok</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td align="right" style="border-bottom: 1px solid black; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: 1px solid black"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">14</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">110 sq ft of mulch with weed fabric at $2 per sq ft $220</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; text-align: right; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$220.00</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">ok</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td align="right" style="border-bottom: 1px solid black; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: 1px solid black"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">15</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">water proofing  2 coats of roll on and subseal at 16.50 per sq ft $2326.50</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; text-align: right; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$2,689.50</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">ok</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td align="right" style="border-bottom: 1px solid black; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: 1px solid black"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">16</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; text-align: left; vertical-align: top; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-family: Calibri"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none">Core Curbing Permit</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; text-align: right; vertical-align: top; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-family: Calibri"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none">$781.00</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">ok</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td align="right" style="border-bottom: 1px solid black; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: 1px solid black"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">17</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; text-align: left; vertical-align: top; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-family: Calibri"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none">Paver sealing</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; text-align: right; vertical-align: top; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-family: Calibri"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none">$3,650.00</span></span></span></span></span></span></td>
			<td style="border-bottom: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; background-color: #e2efda; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">ok - $300 CREDIT FROM LINE 6</span></span></span></span></span></span></td>
		</tr>
	</tbody>
</table>
'),
  (6227651, 2, '<table style="border-collapse: collapse; width: 644px" width="644">
	<colgroup>
		<col style="width: 28pt" width="37" />
		<col style="width: 345pt" width="460" />
		<col style="width: 62pt" width="83" />
		<col style="width: 48pt" width="64" />
	</colgroup>
	<tbody>
		<tr>
			<td align="right" style="border-bottom: 1px solid black; height: 20px; width: 37px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: 1px solid black; border-right: 1px solid black; border-left: 1px solid black"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">12</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; width: 460px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: 1px solid black; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">front side walk street repair at $25 per sq ft with demo $560</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; width: 83px; text-align: right; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: 1px solid black; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$560.00</span></span></span></span></span></span></td>
			<td style="border-bottom: none; width: 64px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; background-color: #fce4d6; border-top: none; border-right: none; border-left: none"><span style="font-size: 15px"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">MISSING</span></span></span></span></span></span></td>
		</tr>
	</tbody>
</table>
'),
  (6228678, 1, 'Install 2- 4x6 CBS stone tie with 1 inch stand-off 
Install 2- 4x6 post
2x2 footings/concrete '),
  (6228765, 2, NULL),
  (6228784, 3, NULL),
  (6229221, 1, '<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="line-height: 106%"><span style="font-family: ">Backsplash/Bartop </span></span></span></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="line-height: 106%"><span style="font-family: ">1. Add blacksplash 10 LF</span></span></span></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="line-height: 106%"><span style="font-family: ">2. Poured in place concrete cap 10 LF (include forming)</span></span></span></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="line-height: 106%"><span style="font-family: ">3. Trowel for smooth finish</span></span></span></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="line-height: 106%"><span style="font-family: ">4. Blacksplash to be smooth stucco (to match house color)</span></span></span></span></span></span><br />
 '),
  (6229301, 1, NULL),
  (6229304, 2, NULL),
  (6229315, 3, NULL),
  (6229339, 4, NULL),
  (6230911, 2, 'Fruitless olive tree Wilsoni upgrade +200<br />
Fruit trees upgrade +900<br />
24 in box upgrade in backyard install in front +980 (8) + (3) 24 inch box for front yard $720<br />
(4) 15 gallon ficus installed in front +600&nbsp;<br />
(1) 5 gallon ficus $43.50 for front yard<br />
6 low voltage lights $240each ($1440) + 3 low voltage lights for front yard&nbsp;<br />
1 low voltage transformer $437<br />
1 new Irrigation zone for top planter +900<br />
Irrigation add on to front yard +300<br />
moving plants/transplanting plants in front planter to back planter. Adjust irrigation lines $300<br />
<br />
Total $7540.50'),
  (6232292, 7, 'Adding 1 valve for front hillside (just stubbed out no sprinkler heads)'),
  (6232398, 6, '2 15G Olives
2 5G Leucadendron
6 1G climbing Jasmine
2 flats Blue Chalksticks
Wiring for Jasmine and soil for pots '),
  (6232818, 1, NULL),
  (6232824, 2, 'Wire and install 1 low voltage light (owner to provide light fixture)'),
  (6232833, 3, 'Only installing 7 posts instead of 10'),
  (6232880, 4, NULL),
  (6232887, 5, NULL),
  (6233434, 8, 'Adding 1 valve, no lateral line. To separate the back yard'),
  (6233808, 7, 'Demo out existing wall footings '),
  (6234039, 7, NULL),
  (6235258, 20, '16 steppers to be placed side by side to create walkway from steps to patio '),
  (6237352, 6, NULL),
  (6241947, 53, 'Fixing mainline at street side $300<br />
<br />
<br />
Adding pvc shut off valve to hillside manifold $65<br />
<br />
One split zone material $160&nbsp; time 3 hrs $225 COST $385<br />
<br />
Bottom hillside zone 100 linear feet of pipe, valve and labor $ 1050<br />
Trenching&nbsp;on electrical hillside 250 linear feet&nbsp; running 9 strand irrigation wire $800&nbsp;<br />
Timer+install&nbsp; $400<br />
Total $3100<br />
<br />
Check valves/ misc repairs<br />
no charge<br />
Erosion repair from water leaks, No charge<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
&nbsp;'),
  (6242414, 1, NULL),
  (6247389, 27, 'Stucco the entire back wall of the pool for one uniform look.&nbsp;'),
  (6247588, 28, NULL),
  (6247944, 1, '35 linear feet x $10.00= $350.00'),
  (6253827, 1, '(4) stumps (grinding roots)
(2) block walls
Hauling all debris (concrete and green waste) '),
  (6253860, 2, 'Remove all concrete, steps and brick landing for front entry way and side yard walkway
Redo all areas in concrete to match backyard- color tbd and sand finish 
Steps to be concrete (straight edge) '),
  (6254445, 8, '1 man, 3 hours plus material''s 
'),
  (6259053, 3, NULL),
  (6263131, 2, NULL),
  (6264128, 2, 'steel edging'),
  (6267348, 5, 'Installation of three timers.'),
  (6267509, 3, 'Backfill top planter 2 yards '),
  (6267528, 7, NULL),
  (6267532, 2, NULL),
  (6271869, 49, '20'' tall x" steel post in 1-2'' footings TBD on site.<br />
-Painted black<br />
-Added hooks<br />
 '),
  (6271873, 50, '1) Reinstall two string light strands to new metal post<br />
2) Assess flickering light fixture in tree and repair (if new fixture needed will be more)<br />
3) One additional string light repair - no charge'),
  (6274335, 1, NULL),
  (6274352, 2, 'Inside porch need to demo and install flagstone&nbsp;'),
  (6274453, 3, 'Total 357 sf - 184 sf 
$1,856.40 - $956.80= $899.60
Minus bender board credit $182.00
'),
  (6275474, 3, NULL),
  (6276751, 2, NULL),
  (6280383, 3, '<div>1.Grading - fix area to grade down 3" below final grade, use same weed fabric for under stones and gravel. Haul material away. $300</div>

<div>2.Black Mexican Mix Pebbles around flagstones- $1,100</div>

<div>3.Flagstone approx. 6 large pieces 2-3'' each going longways across set in concrete (Arizona gold - $1,200)</div>

<div><b><u>TOTAL:</u> $2,600</b></div>
'),
  (6280622, 1, '1.5 pallets Idaho silver plus labor (extra cutting of flagstone) and dry setting leftover flagstone for pathways adjacent to kitchen patio area (adds 1 extra full day of work for 2 guys) 
(6) Sydney Peak boulders set'),
  (6280625, 2, '3/4” Del Rio for 220sqft'),
  (6280631, 3, 'includes weed barrier for across the back perimeter&nbsp;'),
  (6280632, 4, 'Upgrade to 36” Arbutus tree'),
  (6280643, 5, NULL),
  (6280745, 4, 'white rock added to back planters $1000<br />
tree from boething +$225<br />
&nbsp;'),
  (6280855, 8, 'Pull up pavers 
Cut roots 
Grade and compact road base
Grade sand
Install papers
Sand and compact '),
  (6280920, 5, '3 skimmer extensions&nbsp;'),
  (6284364, 1, 'Pick up paver and remove tree roots.&nbsp; &nbsp;Then relay the paver. 400 sq feet.'),
  (6284892, 1, NULL),
  (6285103, 3, '1. Sub Panel (includes 1" conduit)<br />
236 lnft of #4 wire. 60 amp<br />
$7,900<br />
<br />
2. Electrical Run<br />
405 lnft 3/4" conduit. includes 4 #12 guage wiring<br />
$9,315<br />
<br />
3. Outlets<br />
15 total outlets. 2 on seatbench, 2 on pilasters, 4 on outdoor kitchen, add 4 for the TVs. 8 included in contract, need 7 more<br />
$840<br />
<br />
Note : May require additional electrical change orders.<br />
Does not include permitting costs there will be an additional change order once the fees are calculated by the city.'),
  (6285138, 4, NULL),
  (6285208, 6, '2 additional up lights '),
  (6285212, 7, 'Finish installing gravel on side of house /rain garden and plants 

'),
  (6287719, 8, 'Owner purchased his own transformer'),
  (6288803, 9, 'Owner purchased separately and we installed&nbsp;'),
  (6290552, 10, 'Connecting to new irrigation zones and existing front yard zones<br />
&nbsp;'),
  (6293687, 11, '25’L x 18”D'),
  (6297473, 2, '(10)1 gallons
(1) 5 gallon '),
  (6297529, 51, NULL),
  (6301601, 4, 'The plan had more plants than the contract. We needed to add 13 5 gallon and 1 15 gallon to match. <br />I discussed it with Marcia at the walk though and she approved. She wants all of the plants '),
  (6303003, 7, 'Time and materials '),
  (6308194, 3, NULL),
  (6308198, 4, NULL),
  (6308897, 1, '1) Install 900 sq feet of Medium bark Nugget<br />
2) Check over entire irrigation system<br />
3) Fix minor tears in tubing.'),
  (6313899, 5, ' I have to have your approval for $2,782.00 to be able to offer all of the lights on the revised list with all color changing and dimming features.

Thank you!'),
  (6318525, 29, 'Upgrade from Pebble Fina finish to Pebble Sheen.&nbsp; Color to be Aqua Blue'),
  (6322756, 12, NULL),
  (6322889, 6, NULL),
  (6324571, 9, NULL),
  (6328683, 1, '132 sf more&nbsp;'),
  (6328700, 2, '217 total. This is for the additional 132 sf'),
  (6328756, 3, '15 additional lfx $8.00'),
  (6328948, 4, 'Additional gas line. 45 lf. May recieve a credit if we are able to use less'),
  (6329252, 4, '<p dir="ltr"><b>Front Wall Installation</b></p>
 

<ol>
	<li dir="ltr">
	<p dir="ltr"><b>Dig footings for approximately 6 linear feet of wall.</b></p>
	</li>
	<li dir="ltr">
	<p dir="ltr"><b>Footing size to be 1 ft wide and 1 ft deep</b></p>
	</li>
	<li dir="ltr">
	<p dir="ltr"><b>Install #4 Rebar Cage in footings</b></p>
	</li>
	<li dir="ltr">
	<p dir="ltr"><b>Install #4 Vertical Rebar 16 inches on center</b></p>
	</li>
	<li dir="ltr">
	<p dir="ltr"><b>Pour 3000 PSI concrete footing</b></p>
	</li>
	<li dir="ltr">
	<p dir="ltr"><b>Wet lay first course of 8 x 8 x16 CMU block</b></p>
	</li>
	<li dir="ltr">
	<p dir="ltr"><b>Install additional courses per plan portion A wall in graded heights of 18 inches  tall</b></p>
	</li>
	<li dir="ltr">
	<p dir="ltr"><b>In wall building install horizontal#4 rebar reinforcement.</b></p>
	</li>
	<li dir="ltr">
	<p dir="ltr"><b>Grout lift all cells.</b></p>
	</li>
	<li dir="ltr">
	<p dir="ltr"><b>Install 18 linear feet of CMU Wall Cap</b></p>
	</li>
</ol>

<p dir="ltr"><b>COST $600</b></p>
 

<p dir="ltr"><b>*Optional Install 80 linear feet of cmu wall cap at $5 per linear foot for storm planter</b></p>

<p dir="ltr"><b>Optional stucco cap at $15 per linear foot. </b></p>
<br />
<p dir="ltr"><b>Front concrete</b></p>
 

<ol>
	<li dir="ltr">
	<p dir="ltr"><b>Form for roughly 1850  total sq feet of colored concrete or topcast concrete tbd</b></p>
	</li>
	<li dir="ltr">
	<p dir="ltr"><b>Install 2 inches of Class II roadbase.</b></p>
	</li>
	<li dir="ltr">
	<p dir="ltr"><b>Compact base.</b></p>
	</li>
	<li dir="ltr">
	<p dir="ltr"><b>Install #4 rebar 24 inches on center</b></p>
	</li>
	<li dir="ltr">
	<p dir="ltr"><b>Pour 3000 PSI concrete flat sections</b></p>
	</li>
	<li dir="ltr">
	<p dir="ltr"><b>Install roughly 240 linear of additional forming for pads and concrete cutaways.</b></p>
	</li>
	<li dir="ltr">
	<p dir="ltr"><b>Light broom finish</b></p>
	</li>
</ol>
 

<p dir="ltr"><b>COST $16,187</b></p>
<br />
<br />
<br />
 
<p dir="ltr"><b>Front yard concrete step work. </b></p>
 

<ol>
	<li dir="ltr">
	<p dir="ltr"><b>Form for 90 linear feet of steps of colored  cantilever concrete at $70 per lf</b></p>
	</li>
	<li dir="ltr">
	<p dir="ltr"><b>Install base and rebar, install form for future lighting</b></p>
	</li>
	<li dir="ltr">
	<p dir="ltr"><b>Light broom finish</b></p>
	</li>
</ol>

<p dir="ltr"><b>COST $6300</b></p>
 

<p dir="ltr"><b>Pilaster work</b></p>

<p dir="ltr"><b>(4) 24 inch pilasters with sand finish stucco</b></p>

<p dir="ltr"><b>Light rough in (2)</b></p>

<p dir="ltr"><b>Mail box fitted (1)</b></p>

<p dir="ltr"><b>Bellecrete cap (2)</b></p>

<p dir="ltr"><b>3 ft tall</b></p>
 

<p dir="ltr"><b>COST $2,800</b></p>
 

<p dir="ltr"><b>Removal of sand stucco -$540</b></p>
 

<p dir="ltr"><b>24 linear feet of edges for smaller pilasters</b></p>

<p dir="ltr"><b>36 linear feet of edges for larger pilasters </b></p>

<p dir="ltr"><b>60 linear feet of edges total at $30 per lf ft =$1800</b></p>
 

<p dir="ltr"><b>88 sq ft of flat at 23.50 a sq ft $2068</b></p>
 

<p dir="ltr"><b>6 lights at $350 each (halo lights with channel bracket) $2450</b></p>
<br />
<br />
 
<p dir="ltr"><b>Additional Demo </b></p>

<p dir="ltr"><b>1 container allowance for front hillside grading and misc driveway grading $2400</b></p>
<br />
<br />
 
<p dir="ltr"><b>Curbing</b></p>
 

<p dir="ltr"><b>Forming for 14 linear feet of curbing and gutters to city spec at $60 a linear ft</b></p>

<p dir="ltr"><b>$840</b></p>
 

<p dir="ltr"><b>Permit fee $385.77</b></p>

<p dir="ltr"><b>Demo of asphalt $380</b></p>

<p dir="ltr"><b>Tree removal with stump grind $540</b></p>

<p dir="ltr"><b>Additional drain work for storm planter $350</b></p>
<br />
<p dir="ltr"><b>Total for front yard</b></p>
 

<p dir="ltr"><b>36560.77</b></p>
<br />
<br />
<br />
 '),
  (6329265, 5, NULL),
  (6330670, 54, '64 linear feet of timber added to single existing course<br />
<br />
COST $3,584<br />
<br />
Installing new timber wall for hillside retention 64 linear feet two courses high<br />
128 linear feet of courses allotted&nbsp;<br />
<br />
COST $6144<br />
<br />
Rebuilding collapsing wall using existing courses and new footing courses timbers. Compacting sunken areas and backfilling. $5,440<br />
<br />
Misc repairs with 200 sq ft of california gold pathway<br />
Misc demo for side of timberwalls<br />
<br />
COST $1400<br />
&nbsp;'),
  (6334956, 3, 'Credit for the difference of 500sqft&nbsp; additonal mulch and demo&nbsp;'),
  (6335172, 1, '90 sq ft of turf additional $1440<br />
60 linear feet of new edging $410<br />
Additional rock for front yard and backyard planters $1000&nbsp; 350 sq ft&nbsp;<br />
fixing and repair lighting / swapping replacement led bulbs (34 lights) at $40 per light $1360<br />
additional planting $200 for tree and misc 1 gallon plants'),
  (6335510, 53, 'Remove mud/DG and replace with mulch (should be weed barrier under there).  Bring weed barrier just incase it''s needed.'),
  (6339622, 1, NULL),
  (6339637, 5, NULL),
  (6341712, 54, '<span style="font-size: 12px">(1) <span dir="ltr" style="left: 181.53px; top: 958.182px; font-family: sans-serif">FL-105B</span><span dir="ltr" style="left: 181.53px; top: 969.452px; font-family: sans-serif"> Big Smoky Accent Light w/Glare Control (ON NEW JACARANDA)<br />
(3) </span>FL-116B Wall Liter Accent Light<span dir="ltr" style="left: 181.53px; top: 969.452px; font-family: sans-serif"> </span></span>LED T3 Lamp - 5W - 30K<br />
<span style="font-size: 12px"><span dir="ltr" style="left: 181.53px; top: 969.452px; font-family: sans-serif">(2) MOVE two lights to better area.<br />
(1) Fix one light that was knocked over. </span></span>'),
  (6341714, 55, NULL),
  (6344056, 21, NULL),
  (6345866, 56, NULL),
  (6347416, 1, NULL),
  (6347432, 2, NULL),
  (6347994, 2, 'Install (10) 15 gallon Leucadendron ''Safari Sunset = $1800<br />
Install (12) 15 gallon Carolina Cherry = $1800<br />
Install (1) 15 gallon Purple Hopseed =$150<br />
Stake 23 shrubs = $140<br />
Extend irrigation to Carolina Cherries and add drip emitters to all new shrubbery= $750<br />
<br />
Total = $4640.00'),
  (6349316, 1, '(1) @7x4x18”
(1) @7’x3x18”'),
  (6349334, 2, 'Saw cutting existing concrete 
Regrading area next to ADU to pitch water towards street
Pouring new concrete for 40sqft '),
  (6349341, 3, NULL),
  (6349347, 4, 'Adding a 22" drain from back corner of ADU to exit into garden bed'),
  (6350200, 30, NULL),
  (6351318, 1, NULL),
  (6353376, 31, 'Spa front wall got extended to the bottom of the bench so more tile is being added so that will be an addition $1600 additional change order The client asked for a new spa remote that I already have for him and that will be an additional $900 change order'),
  (6355730, 6, 'Asphalt on street at cost $600.'),
  (6355873, 7, NULL),
  (6356705, 1, 'Pull about half a basket of old granite and add half basket of Arizona River rock 3" minus '),
  (6365403, 2, 'This change order is to remove more granite rock from river bed and to repurpose in other parts of the yard. This is only time for labor.

5 hours 1 man '),
  (6367299, 5, NULL),
  (6367763, 3, 'Install one new spray zone on side yard planter

Install 11 new gazania flats

Remove old ground cover in area. '),
  (6367770, 4, 'Side yard St Augustine 200 Sq ft.

Adjust irrigation heads.

Includes tilling, adding amendments, grading and laying of sod. '),
  (6369310, 1, '24 additional sq feet'),
  (6372726, 6, 'Adding a 22" drain from back corner of ADU to exit into garden bed'),
  (6373261, 4, '(6) 27"X27"X27" CONCRETE FOOTINGS FOR PATIO COVER, INCLUDES DIGGING HOLES, FORMING FOR CONCRETE AND POURING CONCRETE '),
  (6373924, 7, NULL),
  (6374824, 8, NULL),
  (6378770, 9, NULL),
  (6381991, 32, '$1600 for lights (offered lower price to client)<br />
$ 600 Installation<br />
$160 Sales Tax'),
  (6382750, 1, '4 Man Days<br />
Demo, trenching, sewer, crack repair, backfilling, compacting.&nbsp;<br />
<br />
Part Guy Hauling and Dump Fees<br />
Material Fees'),
  (6384860, 2, '400 linear feet of benderboard was put in from the options in contract.&nbsp;'),
  (6391919, 3, 'Adding 16 linear feet of channel drains and connecting it with drain system.&nbsp;<br />
Channel drain to be set in concrete and grading to appropriate grade&nbsp;<br />
We would need to lift all the concrete squares in that area and reset them'),
  (6393453, 10, NULL),
  (6397090, 3, NULL),
  (6401736, 5, NULL),
  (6403457, 33, NULL),
  (6406462, 2, NULL),
  (6414078, 4, 'Install 96 square feet of waterproofing on neighboring wall Primer and membrane<br />
To meet up with existing waterproof as best as possible'),
  (6416677, 1, NULL),
  (6416684, 2, NULL),
  (6416733, 3, NULL),
  (6416855, 4, NULL),
  (6418656, 6, '1 light - $240<br />
20 sqft turf - 350'),
  (6418658, 7, NULL),
  (6420188, 1, '1) Install gravel base for wall<br />
2) Install 112 linear feet of stackable wall block by Angelus 4” x 12” x 7” to 24 inches high<br />
3) Install 107 linear feet of stackable wall block by Angelus 4” x 12” x 7” to 18 inches high<br />
<br />
 '),
  (6420930, 2, '1) Dig footings for 20 Ln Feet of Retaining Wall in Pool Equipment Are 2 to 3 feet wide<br />
1a) Dig section for footing keys per plan<br />
2) Dig footings for 60 Ln Feet of Retaining Wall for Pool Access Walls (steps section)<br />
2a) Dig section for footing keys per plan<br />
3) Dig footings for 65 Ln Feet of Retaining/Seat Wall <br />
4) Install rebar cage for all retaining walls per plan including rebar from #3 to #5<br />
5) Pour footings for all walls.<br />
6) Install 20 linear feet of 8x8x16 CMU for Pool Equipment Retaining Wall. Up to 4 foot height<br />
7) Install 60 linear feet of 8x8x16 CMU for Pool Access Wall.  Staggered Height Average of 2.5 to 3 feet height<br />
8) Install 65 linear feet of 8x8x16 CMU for Seat Walls. Height to be 18"<br />
9) Install Retaining Gravel behind all walls for wall drainage system<br />
10) Install 145 linear feet of 3" French drain system with geotextile socks and or gravel bed wrapping.<br />
11) Install base prime coat of water proofing in 357 square feet of wall area.<br />
12) Install bitchinthane or similar waterproofing membrane in 357 sqare feet of wall area.<br />
13) Form for 145 linear feet of poured in place concrete wall cap.<br />
14) Install rebar reinforcement for poured in place wall cap 145  linear feet.<br />
15) Pour roughly 210 sq feet of colored 2500 psi concrete for wall cap<br />
16) Install Mesh Coat base stucco layer for 357 square feet of wall<br />
17) Install Final Coast stucco layer for 357 square feet of wall.<br />
18) Form for strip brackets under tops.  <br />
19) Install strip lighting brackets<br />
20) Install LightCraft strip lighting under all seat walls and Wall caps. <br />
<br />
 '),
  (6420948, 2, NULL),
  (6421019, 3, '1) Install 4 additional lights -&nbsp; $480<br />
2) Planting $1330<br />
3) Mulch and Much Installation -$1060<br />
4) Extra Drain - $375<br />
5) Steel Bender Board Upgrade - $535<br />
&nbsp;'),
  (6423165, 5, '1) 32" BBQ <br />
2) DOUBLE ACCESS DOORS (UNDER BBQ)<br />
3) SINGLE ACCESS DOOR (UNDER SINK)<br />
4) REFRIGERATOR <br />
5) ICE CHEST<br />
6) SINK<br />
7) TRASH BIN<br />
8) DOUBLE DRAWERS <br />
 '),
  (6427387, 7, 'We will need to install 7- 24" box red leaf plums Planting mix. $2695. We need a bigger gauge wire for the bougainvillea and hardware. $380.'),
  (6429126, 3, '1) Add in 185 linear feet of gas line - $7065<br />
2) Retaining walls subsurface drain tie in.  - $600<br />3) Includes trenching and backfilling.'),
  (6429468, 6, NULL),
  (6429918, 7, '(2) courses of block @ 83 linear feet 
(1) course of block @ 46 linear feet'),
  (6429923, 8, '(2) courses of block @ 90 linear feet '),
  (6431692, 5, NULL),
  (6439829, 5, NULL),
  (6439842, 6, NULL),
  (6439850, 7, NULL),
  (6442424, 1, 'Netafim drip with copper shield&nbsp;'),
  (6442883, 55, 'wall rebuild with additional supports'),
  (6444622, 2, '•  Create a raised, sturdy base for the hand pump - 6" to 8" high above soil level. <br />
•  Made of cinder block on a cement footing with cinder block voids filled with cement - to make the top of the cinder blocks look flush.<br />
•  With a <i><b>black plastic tub</b></i> set into the ground - edges at soil level - in front of the hand pump, creating a small "pond.".<br />
•  Position pump at edge of cinder block base - as close as practical to black plastic tub.<br />
<br />
Black plastic tub dimensions:  35" long x 25" wide x 12" deep.<br />
 '),
  (6447227, 9, NULL),
  (6447230, 10, NULL),
  (6447234, 11, NULL),
  (6447242, 12, NULL),
  (6447271, 13, 'Additional 545 LF from ADU to street including tap into all down spouts on house '),
  (6453758, 4, 'We had to add more soils and compact entire 1st tier of garden wall sections,&nbsp;&nbsp;'),
  (6465828, 3, '(54) 1 gallons
(90) 4”'),
  (6469977, 1, '55 linear feet of 3" surface drain across front of the house'),
  (6469982, 2, '17 linear feet of bed at 3'' wide connected 8''x5'' dry pool '),
  (6469998, 4, 'Original estimate gave an allowance of $2000-2500, however only $2000 was included in total contract cost.&nbsp; The remaining $500 was needed to complete the requested order&nbsp;'),
  (6473908, 5, '1)  Install 10 schedule 80 risers for hosebibs<br />
2)  Install 10 brass hose bibs.<br />
3) Support stake hosebib risers.<br />
4) Install (4) main line water shutoff valves<br />
5) Install (2) backflow prevention devices on water lines<br />
6) Install (1) 8 station Rachio Irrigation Controller with outdoor cabinet<br />
7) Install (1) 16 station Rachio Irrigation Controller with outdoor cabinet<br />
8) Install 14 zones of lateral pipe per Section A of Irrigation Schedule. 3/4" PVC Schedule 40 per spec. Roughly 1820 linear feet.<br />
9) Install 7 zones of lateral pipe per Section B of Irrigation Schedule. 3/4" PVC Schedule 40 per spec. Roughly 720 linear feet.<br />
10) Install 10 irrigation filter/pressure regulators for flood zones.<br />
11) Install 5 copper subterranean drip grids per plans<br />
12) Install flush valves for all subterranean drip grid systems.<br />
13) Install 16 zones of drip line or rotors for slope/edible garden  and tree irrigation<br />
14) Install 21 Rain Bird Anti Siphon Valves<br />
<br />
 '),
  (6473955, 6, 'Run 245 linear feet of conduit and speaker wire per plan.&nbsp; Includes added trenching.&nbsp;'),
  (6474004, 7, '1) Form for 124 liner feet of pool coping.<br />
2) Form for Pool Vault Sections for pool coverings. Vault support by other contractor<br />
3) Pour concrete, Color TBD<br />
4) Pull forms'),
  (6474121, 34, NULL),
  (6474125, 35, '<table style="border-collapse: collapse; width: 456px" width="456">
	<colgroup>
		<col style="width: 242pt" width="323" />
		<col style="width: 66pt" width="88" />
		<col style="width: 34pt" width="45" />
	</colgroup>
	<tbody>
		<tr>
			<td style="border-bottom: 1px solid black; height: 20px; width: 323px; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: 1px solid black; border-right: 1px solid black; border-left: 1px solid black"><span style="font-size: 15px"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">Gravel</span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; width: 88px; text-align: right; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: 1px solid black; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$680.00</span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid black; width: 45px; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: 1px solid black; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">0%</span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: 1px solid black; height: 20px; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: 1px solid black"><span style="font-size: 15px"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">Planter Wall</span></span></span></span></span></td>
			<td style="border-bottom: 1px solid black; text-align: right; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$1,477.00</span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid black; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid black; border-left: none"><span style="font-size: 15px"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">0%</span></span></span></span></span></td>
		</tr>
	</tbody>
</table>
<br />
<br />
Removed from scope of work, picture build did not do. '),
  (6474134, 36, NULL),
  (6474424, 5, NULL),
  (6477878, 3, 'Demo and Rebuild middle section of wall that''s shared with neighbor @ 27 linear feet x 5 tall, wall to include footing, rebar and grout lifting<br />
Add (11)  reinforcement pilasters to remaining sections of wall - will need to saw cut into concrete to add footings<br />
Each pilaster to be 5'' tall by 8" wide <br />
 '),
  (6477896, 37, NULL),
  (6480199, 1, NULL),
  (6480258, 1, NULL),
  (6480275, 2, 'Add rainbird timer with modules for 13 stations '),
  (6480281, 3, NULL),
  (6480287, 4, NULL),
  (6480309, 5, NULL),
  (6483629, 14, 'Pls note the surveying company will need a copy of the legal description from the grant deed in order to the survey.  If you’d like easements included a full title report and underlying documents may be required.

Description of service provided:

• Recover and find original survey monuments
• Prepare calculations for setting monuments
• Set iron pipes on lot corners and markers on lot lines
• Prepare a Record of Survey showing the monuments found or set (stamped and signed)
• File map with the County Surveyor at the county of Los Angeles Building (required)'),
  (6484440, 1, NULL),
  (6487130, 7, 'Coping-bellecrete mocha modern finish sand<br />
tile work with elements bronze 6x6<br />
equipment -spa heater-filter-pump-two lights for spa and pool<br />
Baja shelf 13x9&nbsp;<br />
widening of spa spillway to 42 inches<br />
one step<br />
pebble finish black<br />
plumbing<br />
electrical and gas hookup<br />
<br />
&nbsp;'),
  (6487163, 1, 'fixing outdoor lighting and camera'),
  (6491577, 2, NULL),
  (6493591, 4, 'Upgraded to more expensive gravel, cobble and boulder selections for dry creek and kept some extra for future use (we returned 1/2 basket of 3-6" Yosemite and 1/2 basket of 3-6" Auburn)<br />
Used 1/2 basket of 3-6" Yosemite=$210.00<br />
          1/2 basket of 3-6" Auburn = $300.00<br />
           1 basket 1-2" Yosemite = $65.00<br />
           1 basket 6-9" Auburn =$640.00<br />
           Granite boulders 18" (multiple)=$70.00<br />
<strong>LABOR=$1515.00</strong><br />
           '),
  (6493597, 5, '40sqft of Mojave 3/4" gravel (originally spec''d out at 20sqft Del Rio Gravel)'),
  (6493600, 6, NULL),
  (6495838, 7, 'We still need 2 quotes for the walls. Both quotes should have the shared wall separately priced and broken out in detail. We will decide whether to keep the original scope of fixing all the top caps on the walls or adding in the reinforcing etc. I don''t want to approve or deny the brick cap repair change order I see until we can get this other information.<br />
<br />
Can this work be completed between Nov 12 - Dec 9?  I can approve prior to leaving out of town next week, if we get it and have a few days to review and talk with our neighbors.<br />
1st Quote Reinforcement of the walls with pilaster. Qty of 8x8 pilasters on the shared wall = $$, Qty of 8x8 pilasters on the back wall =$$, <br />
2nd Quote Reinforcement/Rebuild : rebuild 27''x5'' linear ft =$$ shared wall. Qty of 8x8 pilaster of Shared wall=$$  , Qty of 8x8 pilaster on the back wall =$$'),
  (6503844, 3, '15 gallon Lime<br />
15 gallon Mission Fig<br />
15 gallon Haas Avo'),
  (6506517, 8, NULL),
  (6506963, 9, '<p>Form and Pour Concrete sections.&nbsp; &nbsp;Base, Rebar, 2500 PSI concrete.&nbsp; Color TBD. Light Broom Finish<br />
<br />
Walkway to Pool Equipment 27x6<br />
Walkway to Oak Patio 5x5<br />
Oak Patio 14x25<br />
Concrete Steppers 18 (2x2)<br />
Pool Deck 4x20,&nbsp; 16x26,&nbsp; 46x6,&nbsp; 8x34<br />
Pool Equip Area 13 x 6.5<br />
189 Linear Feet of Total Steps and Sides<br />
<br />
Roughly 40 yards of concrete.</p>

<p><br />
&nbsp;</p>
'),
  (6509279, 1, 'Lot will be cut down to trench depth and refilled and recompacted. Roughly 48'' wide x 113'' long x 24 - 30" depth.  Grade will be brought up to 8 inches below T.O.S. <br />
We may need to cut some additional soils from property to bring up grade that will be replenished with trench spoils and recompacted. '),
  (6509326, 10, 'Creating a 3D design for 2 areas on West side of the yard adjacent to the pool&nbsp;<br />
&nbsp;'),
  (6515715, 15, '120 linear feet of strip lights added '),
  (6515719, 16, 'Remove trees in back corners of property line and stump grind roots<br />
Stump grind all remaining stumps along west side fence line<br />
Remove vines along west side fence<br />
&nbsp;'),
  (6516252, 11, '1) Install (2) Bushman 5050 gal Round Raintanks (Tan)&nbsp;<br />
2) Install (2) Bushman BCK0001 First Flush Connection Kits<br />
3) Install (1) Bushman BCK0003&nbsp; First Flush Key Component Kits<br />
4) Install (2) Flex Hose Kits<br />
5) Install (2) Bushman Auto Fill #64333<br />
6) Install (1) AY McDonald E series 3/4 hp 120v Boot Pumps<br />
7) Includes $1200 Freight Charge and tax.&nbsp;'),
  (6516441, 12, '1) Grade out to best possible for new pad.<br />
2) Dig out the edge of the pad down into the slope so it will retain the pad.<br />
3) For new pad with 12 -18 inch high edge sections to take out slope.<br />
4) Install rebar<br />
5) Pour 12 x 22 foot pad to hold both rain tanks.<br />
<br />
&nbsp;'),
  (6518095, 6, 'Total of 248 1 gal. Gopher baskets 

Total of 162 5 gal. Gopher baskets 

'),
  (6524870, 7, 'Install 1- 300w. Transformer 

Install 11-  AP-00B-107 in bronze
Install 9-   FL-289B IN BRONZE'),
  (6526243, 2, NULL),
  (6526496, 1, 'Total of 57LF. 2''poly line and 37 LF 1"poly line'),
  (6529655, 8, 'Installing 6 every 8 feet across back wall'),
  (6529846, 1, NULL),
  (6530366, 4, 'Client referall discount'),
  (6534797, 3, 'Removal of one tree $1000<br /><br />Adding 15 15 gallon shrubs 2250<br /><br /><br />'),
  (6534917, 13, NULL),
  (6534956, 5, '(3) hours of work)<br />
Loosen soil between ground cover to soften the ground up, add some soil amendments to enrich soil structure'),
  (6539283, 19, 'Installing 670 linear feet 6 feet tall fencing 7 foot on center spacing of posts.<br />
Approximately 105 posts 8–10 feet in length to inlay 2-3 foot into wall and footings.<br />
<br />
2) electric motors for driveway sliding gates with capacity to be controlled with phone as well as 4 controllers<br />
5-year warranty on gate motors<br />
<br />
2) 14 by 6 foot sliding gates for driveway entrances connected to electric motors. Includes two 28 foot track rails.<br />
<br />
12 by 6 entryway fencing with 4 foot door. Including 2 standard handles. Also, includes all hardware for door.<br />
Door must be set to swing outwards towards street to comply with city and state regulations.<br />
<br />
All fencing and posts will be powder coated Flat Black.<br />
All connections will be hand welded on site throughout entire fence. <br />
 '),
  (6542123, 9, 'Grinding out sand where there are cracks and refilling the polymeric sand for the entire paver area.'),
  (6542131, 10, 'Providing and installing natural look sealer for 1600 sqft of pavers'),
  (6542133, 11, 'Providing and installing wet look sealer for 1600 sqft of pavers'),
  (6542687, 6, 'Changed one light at cost'),
  (6551730, 1, '20 linear foot wall 3 feet hight with 3 foot by 1 foot footings $189 per foot $3780 total.<br />
To be built with slump stone in doeskin<br />
<br />
25 linear feet of root barrier 3 feet deep $600 <br />
 '),
  (6551734, 2, 'Demo for very large tree stump and roots in the raised where the new patio will be going.&nbsp;<br />
We will just charge labor for this any additional dump fees and stump grinding pricing we will cover.<br />
<br />
Additional labor is at $600<br />
&nbsp;'),
  (6552109, 3, NULL),
  (6556130, 1, 'Installing 65 linear feet of main line on the side of house
Cutting out concrete as needed for mainline.'),
  (6556144, 2, 'Adding concrete on the gap on the east side of the house
Approximately 60 sqft 
4 Inches of base 
3 inch concrete
2500 psi
Broom finish'),
  (6559096, 2, NULL),
  (6559107, 3, NULL),
  (6564125, 8, 'Supplying and installing 8 cubic yards of brown shredded mulch.'),
  (6567486, 1, '232 Square Feet concrete to be removed'),
  (6572687, 2, 'plumbing with new skimmer'),
  (6572866, 1, 'Credit for removing one drip.'),
  (6577074, 2, '26 Linear Feet X $34.00 = $884.00 credit'),
  (6581866, 3, NULL),
  (6591520, 2, 'Installing pressure regulator for watter pressure to valves.'),
  (6592692, 3, '7 lights installed.&nbsp;'),
  (6593985, 9, NULL),
  (6597589, 2, '22.5 Linear Feet X $7.00&nbsp; in the front of the property to border neighbor.<br />
&nbsp;'),
  (6597606, 3, '25 additioanl square feet of dry river bed, trenching, large and small rocks X $24.00 (Reduced from $28 a SF)= $600.00<br />
This is as drawn today'),
  (6597615, 4, '2 lines from the corners of the front garage:<br />
1)&nbsp; 18 Linear Feet from the corner of the garage to the end of the Dry River Bed<br />
2)&nbsp; 16 Linear Feet from the garage Driveway corner to the begining of the Dry River Bed<br />
34 Linear Feet total X $20.00= $680.00&nbsp; (Reduced from $25.00 a Linear Foot)<br />
&nbsp;'),
  (6597642, 5, 'The planter beds in front will need their own valve based on water pressure in the future.<br />
Inlcudes additing a line through both planters in the front, and a PVC connection under the brick planter mow strip to the side of the house for future emitters.<br />
Price reduced, because not all of the furture plants are installed at the time.<br />
$800.00'),
  (6597691, 3, '1/2 of the Design fee credited back to installation&nbsp; $1/2 0f $750.00= $375.00'),
  (6600767, 8, NULL),
  (6602014, 6, 'Up to 1 lowboy, '),
  (6603098, 4, '80sqft '),
  (6603123, 5, '16 feet long by 5’ wide at standard 6” deep'),
  (6603141, 6, NULL),
  (6603544, 7, '40 linear feet additional '),
  (6604203, 4, NULL),
  (6605865, 8, NULL),
  (6606532, 8, '+10 linear feet'),
  (6606544, 1, NULL),
  (6607073, 8, NULL),
  (6615062, 3, NULL),
  (6617243, 7, 'Credit for 9 1 gallon daisies $21.50 each $193.50
Adding 7 dirt flats $67.00 each $469.00
$275.50 total difference'),
  (6620837, 9, 'Approved via text'),
  (6623081, 20, '+1560sqft pavers for (2) sides and back of ADU'),
  (6623085, 21, '60 linear feet of paver steps'),
  (6623110, 22, NULL),
  (6624462, 3, 'Price for assembly of pergola at cost as a  courtesy on the project.'),
  (6631660, 2, 'Plan specs were 2 feet deep on the foundation footing and 16 inches wide<br />
Plan specs were 4 inches deep and 1 foot wide for walkway bond beams.<br />
<br />
Actual as built per requests were:<br />
<br />
4 feet deep on the foundation footing and 20 inches wide&nbsp;<br />
4 feet deep on the walkway bond beams and 20 inches wide.<br />
<br />
Trenching concrete and footings for two walkway bond beams sections are 45 and 20 linear feet.&nbsp;<br />
Trenching concrete and footings for the foundation sections are 23 and 22 linear feet.<br />
<br />
Additional excavation and hauling of extra walkway material of 10 yards.&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;$2,125<br />
Additional excavation and hauling of extra footing depth and width of 6 yards.&nbsp; &nbsp; &nbsp;$1,775<br />
<br />
Additional rebar for walkway trenches&nbsp; &nbsp; &nbsp;$1,125<br />
Additional rebar for footing trenches&nbsp; &nbsp; &nbsp; &nbsp;$985<br />
<br />
Additional concrete and pumping.&nbsp; $5,875<br />
<br />
<br />
<br />
&nbsp;'),
  (6631667, 3, NULL),
  (6631699, 4, NULL),
  (6633659, 9, NULL),
  (6633910, 5, NULL),
  (6635128, 5, NULL),
  (6635701, 4, '<br />
36 lf of additional standard sdr 35 drains at 25 a lf $900<br />
additional gas line run of 10'' with ground connection $385 point for bbq<br />
The new conduit runs at $20 lf (37 lf for adu, 30 lf for internet)+$200<br />
30 lf for old ridge conduit replacement + wall core) $940<br />
<br />
additional spa light replacement $850<br />
<br />
<br />
<br />
<strong>Drain inlet upgrade to pour lids <br />
two skimmers pour lids +170<br />
+10 pour lid drains for pavers at $85 each $850<br />
<br />
total cost for additional changes $4,265</strong>'),
  (6637393, 2, '1 yard mulch (we will not add mulch between blue chalksticks, just behind the plants, those plants will need room to grow as they are a groundcover and are meant to grow together)<br />
Additional plants for beds closer to b/yard<br />
Bender board for new turf strips&nbsp;<br />
Installation of additional turf strips (using left over material on site. Please note if additional turf is needed we will add the difference for time/material as a separate c/order)'),
  (6638902, 3, NULL),
  (6640977, 6, 'The contract had 446 sqft the real area after the concrete was poured and extended the area between the buildings was 727 
At 18 dollars a square foot for the additional area the total is $5058'),
  (6641208, 22, NULL),
  (6643469, 5, 'Invoice 8 - 299.46'),
  (6645662, 1, '+ 8 Linear feet of steps<br />
upgrade to Belgard Dimension&nbsp;'),
  (6645683, 2, '+ 60 linear feet + 13 additonal inlets'),
  (6645689, 4, '+Removing concrete slab (main patio area)<br />
+Removing remaining footings from deck/patio cover<br />
Hauling and disposing of materials&nbsp;'),
  (6645923, 23, '<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">(3) 5g Little Ollie @ <b>$129.00</b>(for the raised planter above bbq area)</span></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">(14) 1g Yellow Yarrow @ <b>$308.00</b> (for corner of beds flanking upper tier patio)</span></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">(10) 1g Blue Fescue @ <b>$220.00 </b>(to fill in near Strawberry and for corner beds flanking upper tier patio)</span></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">(1) 5g Salvia Leucantha @ <b>$43.00</b> (for space where kangaroo paws were located)</span></span></span></span><br />
 '),
  (6650234, 2, NULL),
  (6652976, 1, 'additional forming for segmented concrete&nbsp;'),
  (6656166, 14, NULL),
  (6656400, 1, NULL),
  (6656409, 2, NULL),
  (6656424, 3, 'Adding to Sideyard with DOUBLE weed barrier
Grey construction gravel '),
  (6656431, 4, NULL),
  (6656433, 5, NULL),
  (6656436, 6, NULL),
  (6656440, 7, NULL),
  (6656516, 8, NULL),
  (6656761, 9, 'Bring out tile to one more pad to eliminate pitch backwards 

31 SF concrete removal $155
31 SF new 3” pour grey concrete $500
31 SF tile overlay $680

*not included tile to purchase!'),
  (6658461, 6, NULL),
  (6658469, 5, '790 sqft of pavers at $31.50<br />
minus 9150 in contract<br />
total :&nbsp;15735'),
  (6658490, 10, 'DG FOR APPROX 320SQFT<br />
1" MINUS DEL RIO GRAVEL BORDER FOR (2) FENCE SIDE AREAS, BORDER TO BE 18" DEPTH<br />
BENDER BOARD FOR 2 SIDES, APPROX 46 LINEAR FEET<br />
PLANTS FOR GRAVEL BORDER ($350 ALLOWANCE)'),
  (6659586, 10, 'Retain 12” of soil on neighbors side with:

(41) LF of 2x12x16’ pressure treated lumber 
(20) stakes 
(1) day labor 2 guys
Includes demo'),
  (6660066, 1, NULL),
  (6661226, 7, NULL),
  (6662972, 4, NULL),
  (6663128, 11, 'Approx 320sqft- if additional demo is needed a separate change order will be added '),
  (6665372, 12, '10 yards for the front yard
3 yards for all of the planter beds 
Soil had to be brought in to fill in all planter beds '),
  (6665968, 11, NULL),
  (6667385, 5, 'Upgraded paver cost (from original bid) for pavers and steppers for side yard to 2x2 + 2x1 Belgard Slab pavers&nbsp;'),
  (6667388, 6, NULL),
  (6673960, 24, NULL),
  (6675485, 13, 'Discussed with Carmen last week prior to placing order'),
  (6676074, 1, NULL),
  (6679845, 8, 'Double siding 86 linear feet of fencing'),
  (6681759, 1, NULL),
  (6681853, 1, NULL),
  (6681891, 2, NULL),
  (6681920, 3, NULL),
  (6684058, 14, 'Leftover lumber from deck install (left behind by fence company)<br />
concrete pieces&nbsp;'),
  (6684060, 16, '33 linear feet of black steel edging'),
  (6685953, 1, '1/2 day'),
  (6685957, 2, '80sqft of concrete removed plus install of crushed gravel '),
  (6685958, 3, NULL),
  (6686311, 3, '2 walls, each 5 1/2 long by 18" tall installed and veneering with wall stone'),
  (6687411, 1, NULL),
  (6687426, 9, NULL),
  (6687427, 10, NULL),
  (6687774, 17, '60 linear feet of bender board to lock soil in from spilling out under fence&nbsp;'),
  (6687780, 18, NULL),
  (6687925, 1, NULL),
  (6688368, 4, NULL),
  (6690951, 2, '1 extra low boy + 1 additional day of demo'),
  (6691562, 23, NULL),
  (6694251, 6, NULL),
  (6696408, 3, NULL),
  (6696605, 4, 'Color is Midnight and style is Modern'),
  (6698317, 1, 'Jorge communicated that there was additional time and labor in excavating the river bed due to the supervision on the arborist $550.00. change order'),
  (6698524, 2, NULL),
  (6699142, 11, NULL),
  (6699980, 1, NULL),
  (6701766, 3, 'You cannot get the seat on Autumnjoy, so we opted for 5 gallon carpet roses in red.

This is the cost difference .'),
  (6702322, 12, 'Mulch and weed barrier upgrade and additional mulch 800 sq ft'),
  (6702323, 13, '10 ft fence boards and swap out of fence boards above retaining wall.&nbsp;'),
  (6705204, 4, 'We had 50 lineal feet of Bender board in the contract and we need 67 lineal feet for a difference of 17 lineal feet x $12 = $204'),
  (6705876, 5, 'Typical rental is $100 for 1-30 days.
Porta potty never came, hence this reimbursement.'),
  (6710032, 1, NULL),
  (6710802, 2, NULL),
  (6718588, 25, 'Demo sides and back of ADU in prep for pavers for 1560sqft&nbsp;'),
  (6718661, 25, NULL),
  (6719777, 7, 'Groutlifting with rebar 5 blocks adding cap to match wall.'),
  (6726142, 1, 'Credit for 106 linear feet of bender board&nbsp; that was removed from the contract.'),
  (6726178, 2, 'This is the additional charge for the labor of removing the additional&nbsp; &nbsp;gravel that was below the soil.'),
  (6726260, 26, '(gravel was estimated in for Del Rio and Crushed Gravel)'),
  (6728838, 3, 'Drainage for walkway 
50 linear feet $23 linear foot
5 inlets $75 each'),
  (6729297, 4, 'Transition from pathway in front of ADU stepping up to patio by kitchen'),
  (6729307, 5, '12.6 Linear Feet Bullnose Steps'),
  (6730042, 4, 'The sod area that we marked out is wider than the contract. If we want to go with that footprint, the additional sqtf is 290 at 3.90 per sqft'),
  (6730048, 5, 'This is the price to put gopher mush underneath the sod area to protect from gophers.<br />
<br />
1910 sqft assuming additional sod is added. If not, it will be changed.<br />
The price is at $2.10 per sqft<br />
&nbsp;'),
  (6731447, 19, NULL),
  (6731636, 2, '1.  Eliminating the 3" of road base<br />
2.  Keeping grids<br />
3. increasing DG with stabilizer to 4"<br />
Same 2,028 SF<br />
2,028 X $1.80= credit of $3,650.40'),
  (6731647, 3, 'Adding 2" bender Board '),
  (6732023, 7, NULL),
  (6733775, 1, 'Electrical, sump pump, basin. '),
  (6733986, 2, '(1) 1 gallon Dianella ''Lil Rev''<br />
(1) 5 gallon Jerusalem Sage'),
  (6737995, 1, 'additional jute netting+pick up time'),
  (6743871, 1, 'The city waived the permit fee.&nbsp; So crediting the client the fees.&nbsp;'),
  (6749875, 2, 'Removal only, will need another change order to reinstall '),
  (6750213, 2, 'light well demo<br />
light well repair<br />
concrete epoxy and shotcretewall repair. <br />
 
<table>
	<colgroup>
		<col width="360" />
		<col width="40" />
		<col width="153" />
	</colgroup>
	<tbody>
		<tr>
			<td>
			<p dir="ltr"><b>Item Description Qty </b></p>
			</td>
			<td>
			<p dir="ltr"><b>Unit </b></p>
			</td>
			<td>
			<p dir="ltr"><b>Total Cost</b></p>
			</td>
		</tr>
		<tr>
			<td>
			<p dir="ltr"><b>Demo light wells </b></p>
			</td>
			<td>
			<p dir="ltr"><b>ls </b></p>
			</td>
			<td>
			<p dir="ltr"><b>$2,500</b></p>
			</td>
		</tr>
		<tr>
			<td>
			<p dir="ltr"><b>Concrete small holes 1x2 with dowels </b></p>
			</td>
			<td>
			<p dir="ltr"><b>ls </b></p>
			</td>
			<td>
			<p dir="ltr"><b>$7,800</b></p>
			</td>
		</tr>
		<tr>
			<td>
			<p dir="ltr"><b>Light wells concrete top 1ft (9) 9 </b></p>
			</td>
			<td>
			<p dir="ltr"><b>ls </b></p>
			</td>
			<td>
			<p dir="ltr"><b>$8,300</b></p>
			</td>
		</tr>
	</tbody>
</table>
'),
  (6751238, 8, NULL),
  (6751388, 1, '(1) drip zone for driveway planters'),
  (6751394, 2, 'Topping of Plumbago adjacent to pool'),
  (6752248, 4, 'Did not use fabric in river bed'),
  (6752253, 5, 'Did not need extra hauling'),
  (6753009, 6, '2" Bender Board for 120 Linear Feet'),
  (6753055, 7, '2-2.5 scoops of Del Rio <1" '),
  (6753136, 8, 'Additional plants<br /><br />9 -5gal agave blow glows<br />1 -5 gal lions tail<br />1- 5 gal nandina Gulfstream<br />1- 5 gal pitt silver sheen<br />2- 15 gal Toyons<br />1- 24" box palo verde multi (desert museum)<br />2- 15 gal Rhus ovata<br /><br />12 @ 5 gal × $43.50= $522.00<br />4 @ 15 gal x $150.00= $600.00<br />1 24" box x $380.00<br />Total: $1,502.00 '),
  (6753782, 1, 'Install pipe and board (2) 12x wooden boards with metal stakes along fence of neighbor. stakes will be on inside of board, boards will sit in between columns.<br />
<br />
Soil needs to be cut, grade needs to be taken out. Some soil will need to be removed or graded into front yard.'),
  (6753894, 2, '100 SF of Brown Shredded Mulch. (NO weed barrier because roots of trees are too large to cut around and staple)<br />
<u><strong>Includes demo</strong></u> of 3" below soil and removing shallow roots of the hedge that are in the way.'),
  (6753906, 3, 'along sidewalk on hedge side to prevent mulch from spilling onto sidewalk.'),
  (6754012, 4, 'Please sign to confirm that we are not responsible for plants that do not have irrigation.<br />
These plants will be hand watered by client so as to VOID our plant warranty.'),
  (6757351, 20, NULL),
  (6758000, 8, NULL),
  (6758664, 3, 'Remove existing Fig Trees (x2) <br />
Remove existing Ash Trees (x2)<br />
Grind stumps and haul debris<br />
Additional demo for rain garden (digging down additional 4-8" for 120sqft) '),
  (6767120, 5, NULL),
  (6771214, 4, 'Concrete is 350sqft vs 300sqft&nbsp;'),
  (6777565, 9, NULL),
  (6779026, 6, 'Adding a gas pressure regulator to the line going to the Pizza oven per manufacturer''s recommendation. <br />
 '),
  (6779666, 26, NULL),
  (6782683, 6, '(6) 5 gallon Butterfly agave<br />
<br />
Client will place plants with Sal.'),
  (6796843, 1, NULL),
  (6799128, 1, 'Adding pavers on the side of patio then taking out pavers under the AC. 
52.5 more sq ft x $17.50= $918.75'),
  (6799142, 2, 'Additional 24.5 linear feet, 10 in contract already installing total iof 34.5 lf
24.5 X $60.00= $1,470.00'),
  (6799154, 3, '564.5 SF X $1.00= $564.50'),
  (6799159, 4, 'Adding 4 step light around pavers steps
4 X $240.00'),
  (6799182, 5, 'The gravel area is now 340 sq ft total
285 in contract X $6.50<br />Extra 55 X $6.50= $362.75<br />Taking out mulch - $618.75<br />CREDIT OF $256.00'),
  (6799953, 5, 'Mulching all planter beds that are newly planted for backyard - approx 13 yards at 3”'),
  (6801040, 27, NULL),
  (6804264, 13, 'Install 52 linear feet of stack stone wall at 42 inches high.  Other wall chargee at $80 per foot at average of 20" high. This wall will be $160 per foot as it is double size.  $6,720<br />
<br />
Install 28 step lights $5,340<br />
<br />
Cantilever 189 linear feet of steps and sides of steps.  Total linear footage of cantilever is 232 linear feet.  $4,900'),
  (6804378, 28, 'To prevent the dirt from neighboring driveway from eroding into driveway area&nbsp;<br />
27 linear feet of soldier course'),
  (6804379, 29, '252 LINEAR FEET OF DRAINAGE PIPE AROUND ENTIRE ADU&nbsp;'),
  (6811352, 31, 'Backyard lights only 34 flood lights/well lights +&nbsp; 37 path lights'),
  (6812962, 6, '5G TOYON X 4&nbsp;<br />
5G LEMONADE BERRY X2<br />
1G VERBENA LOLLIPOP X2<br />
1G CAREX X3<br />
1G JUNCUS X3<br />
1G MONARDELLA X6<br />
1G SNOWBERRY X3<br />
1G RED BUCKWHEAT X1<br />
<br />
&nbsp;'),
  (6816199, 32, '138 linear feet of soldier course front corner for planter along 
S/E side of property '),
  (6816763, 6, NULL),
  (6816808, 7, NULL),
  (6817519, 33, '15'' x 16" (no footing) and stucco for both sides of wall, haul away old concrete'),
  (6817531, 34, 'total of 262sqft for (7) pilasters front entry near street'),
  (6817556, 35, '27 linear feet&nbsp;'),
  (6817560, 36, NULL),
  (6817567, 37, '15 linear feet of wall cap (10") x 2 (for rebuild wall and existing wall) for the front entry near street'),
  (6817721, 38, '7 pilasters (includes mailbox pilaster) for front entry area near street<br />
<br />
&nbsp;'),
  (6817802, 7, NULL),
  (6826253, 39, 'TOTAL OF $43,935.00 ON ORIGINAL ESTIMATE/ADDENDUM&nbsp;<br />
$31,350 OF THIS TOTAL AMOUNT WAS APPLIED TO PURCHASE AND PLANT (209) 15 GALLON PODOCARPUS'),
  (6826278, 40, '(3) 8'' BARE ROOT DACTALIFERA PALM TREES @$4200 EA<br />
(7) 42" BOXED BISMARCK PALM TREES @ $3900 EA (INCLUDES 2 TREES FOR FRONT GATE PLANTERS)'),
  (6826323, 7, 'Applying credit towards $9000 estimated demo'),
  (6826496, 8, NULL),
  (6827159, 1, NULL),
  (6827166, 2, NULL),
  (6827244, 41, 'Sides of property = (28) floodlights spaced 8'' apart<br />
                               (16) eyeball lights for N/W side only space 8'' apart<br />
                                (3) eyeballs for Cypress Trees by garage<br />
Front Entry              (12) floods for trees<br />
                                (6) eyeballs for pathway '),
  (6829861, 3, NULL),
  (6837678, 1, '3 steps @12 lf 
Plus 1 landing 
Topcast finish '),
  (6838300, 2, 'Between deck steps and new steps 
18sqft '),
  (6839759, 42, NULL),
  (6839774, 43, 'Removing pavers along step by ADU to create larger planter&nbsp;<br />
Removing pavers along step by entry to backyard to create larger planter<br />
Finishing border along pavers<br />
&nbsp;'),
  (6844096, 4, NULL),
  (6844659, 44, 'Where pavers were removed to create additonal planter&nbsp;'),
  (6854367, 3, 'Demo took a lot longer than expected - guys discovered another wall behind Boulder wall that they needed to remove as well '),
  (6854746, 1, '60 LF'),
  (6855033, 4, NULL),
  (6859043, 45, 'Additional gravel for + approx 1000sqft '),
  (6859235, 14, 'Install the following plants from design.&nbsp;<br />
<br />
<img src="https://i.gyazo.com/f2895f67ac7ab12fc258dd1348d31e59.png" /><br />
<br />
<img src="https://i.gyazo.com/34f3b0e219498275781cd3c0ab2d7a5b.png" /><br />
<br />
<img src="https://i.gyazo.com/00bee5be55c3ba450924229fdc43b8bd.png" /><br />
<br />
<img src="https://i.gyazo.com/cc7def0faa82ad67966dc31a30bc381c.png" />'),
  (6859294, 5, NULL),
  (6859302, 15, 'Pull weeds and/or cut and treat.&nbsp;<br />
Rough Grade all soils in roughly 14,000 square feet.&nbsp;<br />
Fine grade all soils<br />
(Any soil removals if needed for grades would be additional)<br />
Later after planting install the following Mulches in roughly 14,000 sq ft.<br />
<img src="https://i.gyazo.com/c7ca572976bce5215b1c9906defcad88.png" />'),
  (6860702, 4, NULL),
  (6860704, 5, 'Valve connected to existing zone (not installed by PB)'),
  (6861189, 47, NULL),
  (6865293, 9, NULL),
  (6871995, 1, '60sqft of thoroseal and roll on waterproof&nbsp;'),
  (6872011, 2, 'Creating a partial 3rd course for retaining wall'),
  (6873900, 48, 'adding posts and panels for pool equipment area<br />
2 gates in pool equipment area<br />
$14,010.00<br />
<br />
one handrailing for wheelchair access<br />
$6,720.00<br />
<br />
Total $20,730.00<br />
&nbsp;'),
  (6874620, 49, '16 Bellecrete steppers to create pathway for hammock access'),
  (6876921, 4, NULL),
  (6879232, 50, 'INSTALLING CONDUIT FOR MAIN INTERNAL AUDIO/VIDEO SYSTEM'),
  (6879237, 51, '&nbsp;INSTALL CONDUIT TO GOOSENECK (CALL BOX), INSTALL GATE SENSORS&nbsp;'),
  (6887061, 1, 'ADding 1 150 Transformer with installation $425.00<br />
Adding 8 lights @ $225.00 each<br />
This includes all wiring and installation of transformer and connection to house<br />
$2,225.00 total'),
  (6887131, 2, '1)&nbsp; Sanding and preparation of&nbsp; existing wall paint debris&nbsp; $600.00<br />
2)&nbsp; 1 coat of Polybond prep<br />
3)&nbsp; Color coat&nbsp;&nbsp;<br />
2 + days of labor with materials&nbsp; $1,200.00<br />
&nbsp;'),
  (6887136, 3, 'Cost of Labor and materials&nbsp; with Profit&nbsp; and Over head included<br />
$900.00 Materials&nbsp;<br />
$750.00 labor<br />
based on custom work directed by outside contrctor'),
  (6887739, 4, 'Taking out grass'),
  (6888614, 5, 'Total savings from reducing the size would be $319.50. 3 plants at 15 gallon reduced to3 plants at 5 gallon

Would you like to reduce the size of the 3 plants for the $319.50 savings?

Thank you,

Verva

Yes

'),
  (6888711, 3, 'Crediting cost of design mock up back to project as per design agreement'),
  (6888958, 1, NULL),
  (6888966, 2, NULL),
  (6888991, 3, NULL),
  (6888998, 4, NULL),
  (6889069, 5, 'Set gravel aside for mixing with extra gravel brook front path'),
  (6889086, 6, '2 hours to set'),
  (6889106, 7, 'NOT DOING DRAIN IN HARDSCAPE AREA'),
  (6889117, 8, 'Moving drain to grass area from Hardscape area'),
  (6889180, 9, NULL),
  (6890972, 8, '<div><span>(1) path light - 2.5W: <a href="https://lightcraftoutdoor.com/product/ap-128b-5/" target="_blank">https://lightcraftoutdoor.com/<wbr />product/ap-128b-5/</a></span></div>

<div><span>(1) up light - 4.5W: <a href="https://lightcraftoutdoor.com/product/fl-286b/" target="_blank">https://lightcraftoutdoor.com/<wbr />product/fl-286b/</a></span></div>

<div> </div>
'),
  (6895863, 4, NULL),
  (6897598, 5, NULL),
  (6899484, 7, 'This is cost for the wood only
4x12 milled to 3 x11.5 
'),
  (6900011, 1, NULL),
  (6900286, 2, '69 linear feet X $55.00= $3,795.00'),
  (6900290, 3, NULL),
  (6900292, 4, NULL),
  (6900297, 5, '30 flats of ground cover with amendments '),
  (6900329, 6, NULL),
  (6901095, 9, NULL),
  (6904156, 3, NULL),
  (6904437, 52, 'FOR 2700SQFT&nbsp;'),
  (6906432, 1, '<span style="color: rgb(61,133,198)"><u><strong>Plant List</strong></u></span>
<div>(3) Lavandula angustifolia - 5 gal.</div>

<div>(1) Rosmarinus officinalis - 5 gal.</div>

<div>(2) Star Jasmine - 5 gal. (staked)</div>

<div>(1) Camellia japonica - 5 gal. (pink or white blossoms)</div>
<br />
<br />
<br />
<span style="color: rgb(61,133,198)">$335 - 2 hours powerwash all stones in the pool area and seed Marathon<br />
$840 - (2) down lights with tree climbing and straps for lights </span><br />
<span style="color: rgb(61,133,198)">$980 </span>- <span style="color: rgb(61,133,198)">(4) step lights and wire to extend (tucked under cantiliver step).<br />
$375 - Approx. 50 SF DG  (3" in volume) and spray stabilizer on edges on side opposite of Deodar tree<br />
$400 - Plants (see list below) plus adjusting irrigation to accommodate new plants</span><br />
 
<div> </div>
<br />
 '),
  (6908556, 2, 'Credit for removing lighting fixtures from contract'),
  (6910412, 1, '(1) 15g Dwarf Meyer Lemon<br />
(1) 15g Bearss Lime Standard<br />
&nbsp;'),
  (6910415, 2, '4 hours of powerwashing - no guaruntee of final look'),
  (6910420, 3, 'Adding soil for (3) pots and 1 XL planter'),
  (6910429, 4, NULL),
  (6910895, 14, NULL),
  (6912247, 2, 'Install 18 inch wall on south side property.&nbsp; Wall will be buried in soils to take out grade and stabilize the top includinig the paver.&nbsp;<br />
Wall will be capped with paver.&nbsp; &nbsp;Wall to be roughly 70 linear feet.&nbsp;'),
  (6912356, 3, NULL),
  (6912836, 10, NULL),
  (6915545, 11, '3.6LF of 3" SDR pipe extend from mulch area to grass area with NEW drain grate.'),
  (6916100, 12, NULL),
  (6916502, 5, NULL),
  (6918760, 1, '3" 45 Elbow (SxS) PVC Schedule 80<br />
<br />
Product #: GFP-817030<br />
Weight: 1.3<br />
Description<br />
3" 45 Elbow (SxS) PVC Schedule 80<br />
<br />
40 units'),
  (6918986, 16, '57 LF. Concrete swell 
Form about 57LF for concrete swell 
Pour concrete trawl and finish '),
  (6918999, 17, 'Cut and grade back hill side, remove and export about 120 yards of soil'),
  (6919013, 18, NULL),
  (6919022, 19, NULL),
  (6919318, 4, '360 feet 4” ABS Drains with inlets Tie in downspouts'),
  (6921323, 5, '+ 55 linear feet from gas line to gas meter'),
  (6921327, 6, NULL),
  (6921343, 2, 'Estimate states 75 linear feet, wall is actually 83 linear feet&nbsp;<br />
&nbsp;'),
  (6921619, 53, 'FRONT 2 PLANTERS'),
  (6921858, 9, 'Demo<br />
1. Hand demo.<br />
2. Demo 175 SF at 3” depth.<br />
3. Keep roses and Dusty Miller (protect in beds during demo).<br />
4. Remove weeds in bed along property line. Dig up invasive lily with roots.<br />
5. Remove white gravel under large tree. Keep weed barrier.<br />
6. Remove gravel in side area along with weed barrier.<br />
7. Haul all materials to appropriate sites.<br />
8. Porta Potty rental included for duration of project.<br />
COST: $825<br />
<br />
Planting<br />
1. Install (12) Standard 1 gallons ($25/each).<br />
2. Install (6) Specialty 7 gallons ($135/each).<br />
3. Client to purchase Dusty Miller. Cost to plant $10 each - TBD.<br />
COST: $1,110<br />
<br />
Gravel<br />
1. Install approx. 105 SF of pea gravel to match with new weed barrier.<br />
2. Install approx. 70 SF of Del Rio gravel 1” minus under tree - use existing<br />
weed barrier.<br />
COST: $395<br />
<br />
TOTAL COST: $2,330'),
  (6922528, 1, NULL),
  (6922533, 2, NULL),
  (6922543, 3, NULL),
  (6922567, 4, NULL),
  (6922586, 5, NULL),
  (6922592, 6, NULL),
  (6923069, 7, '+40 linear feet of 3/4" conduit and wiring '),
  (6923087, 8, '1 1/4" conduit only to replace corroded line for 52 linear feet'),
  (6924011, 2, 'Extra Demo for 10 -12 inch concrete pad under Patio - $2250<br />
Extra Demo for Grade Behind Pool - $750'),
  (6924480, 6, '@$85/each'),
  (6924753, 13, NULL),
  (6925006, 7, NULL),
  (6925011, 8, NULL),
  (6925207, 8, '<br />
New Plants<br />
(2) Cali Fuchsia (credit)<br />
(2) San Miguel Buckwheat (credit)<br />
(2) Manzanita (only charged for 1)<br />
(2) Rhus&nbsp;<br />
&nbsp;'),
  (6925962, 14, 'Client provided 31 (1 gallon) plants to plant. Labor only.'),
  (6925965, 15, '@$38 (labor and material) per pop up'),
  (6927390, 7, '(1) 5gallon Pink Passion $45<br />
(1) 1gallon Azalea $22<br />
(1) 1gallon Creeping Jenny $22'),
  (6931209, 4, NULL),
  (6931451, 3, 'Install 9 foot base kitchen<br />
Install 11 foot x 3 foot&nbsp;<br />
Install undermount lighting<br />
Install composite veneer to match front.&nbsp;'),
  (6931457, 4, '1) Install electrical conduit 20 linear feet.<br />
2) New 2x2 catch basin 3 ft deep<br />
3) New 1/2 HP pump<br />
4) 60 linear feet of 2 inch discharge line.<br />
5) Catch basin extensions for 3ft depth<br />
6) 2 inch check valve<br />
7) Check valve union<br />
8) Black PVC drain grate.'),
  (6931466, 5, NULL),
  (6938489, 9, NULL),
  (6947287, 9, 'Removal of existing pad, repouring new concrete and reinstalling pool equipment<br />
40sqft of concrete'),
  (6947822, 1, 'Additional scoping&nbsp;<br />
Covering up open areas by garage and inner courtyard where channel drain and catch basins are being installed in prep to finalize work&nbsp;'),
  (6948332, 6, 'Run new 1" copper water main line 40 LF. from street meter to house.'),
  (6950694, 9, NULL),
  (6953403, 54, '5 Lights to be directly installed into top of bench every 6’'),
  (6959353, 4, NULL),
  (6960052, 10, 'New Skimmer (Demo, Steel, Concrete) New Auto Fill Replaster New LED Spa Light/extend brass pipe to equipment Retile New Wi-Fi Controls New Coping/pour in place. and stucco&nbsp;'),
  (6965962, 10, NULL),
  (6967015, 11, NULL),
  (6971198, 7, NULL),
  (6971206, 8, NULL),
  (6971563, 9, 'Backyard Fencing Installed @ 6ft height (8 foot posts) 162 Linear Feet<br />
Backyard Trash Enclosure  4''7" x 10 feet.  Includes 2 access gates<br />
<br />
One Sided Only.  Side and Back Neighbor do not require it.  Assuming left side neighbor okay since it is mostly next to his garage. <br />
<br />
Demo existing fencing and haul.<br />
Dig footings for fencing every 4 feet.<br />
Footings to be 3 1/2 feet deep due to eventaul size of fencing at 8 feet.<br />
Waterproof post bases.  <br />
Install 12 foot pressure treated lumber posts.<br />
Install 2 x 6 x 8 foot fence boarding. <br />
Repair Brick and Concrete on Neighbor Side.<br />
<br />
Front Yard Fencing Installed @ 3 ft height 143 linear feet.<br />
Front pricing figures for installing cedar fencing i slotted metal railings and gates. '),
  (6971823, 10, NULL),
  (6971960, 11, 'Wrap front house wall with waterproofing and wire.<br />
Clean up patio footings and lower wall.<br />
Wrap patio sections with waterproofing and wire as needed.<br />
Install scratch coat on wire front and patio<br />
Install brown coats for front and patio<br />
Install stucco coats for front and patio'),
  (6972614, 6, NULL),
  (6975524, 8, '5x5 concrete landings $460<br />
10Lf. Steps and cut into block for landing $720<br />
Demo 10 medium trees 1,000<br />
Grade and export soils 220 square feet 1100<br />
60lf sub drains $2,382<br />
220 sq ft of concrete on side yard $3,900<br />
<br />
Leave a comment on which one you would like to approve to finalize change order'),
  (6975648, 9, 'midnight blue pebble finish'),
  (6980356, 1, '288 linear feet of 4" high grade pipe around 3 sides of property and connecting to existing pipe installed by Alpha<br />
Includes inlets'),
  (6980681, 5, NULL),
  (6982395, 2, '30''x 7'' and 8" below grade includes hauling out debris'),
  (6987506, 1606991, 'Hey George, so I ran the numbers for the pavers 

 15x15 area 
Pull pavers to re-grade for natural water flow
Re-install pavers 

6x11 area
Pull pavers 
Remove tree root 
Back fill and compact
Re-install pavers 

15 lf. New drain line for future down spout

$5,000


'),
  (6990876, 12, 'Dowel, form and pour foundation cover in patio.&nbsp; &nbsp;<br />
&nbsp;'),
  (6990997, 13, 'Remove Bouganvillia,&nbsp;<br />
Remove trunk and root systems.&nbsp;<br />
Haul waste.&nbsp;'),
  (6991539, 14, 'Jack house,&nbsp;<br />
Remove unused anchors<br />
Install New Sill plates<br />
Install Sill straps<br />
Install new pier supports for subfloor beam'),
  (6991695, 4, NULL),
  (6993662, 10, NULL),
  (6997315, 12, 'Border credit - $800<br />
Wood Post $200<br />
Design Credit $450'),
  (6999101, 3, 'Backyard landings (2) @ 8 linear feet and (1) @ 12 linear feet  - landings to have standard 3'' depth <strong>(@$5000.00)</strong><br />
Step to get into backyard (1) @ 12 linear feet/step to have 14" tread<strong> (@$1100.00)</strong><br />
(These steps include concrete forming and pouring for base)<br />
<br />
Bellecrete for front entry steps includes (1) landing at 3'' depth and (2) steps at 8 linear feet each <br />
These steps are Bellecrete only as steps formed and poured by interior contractor <strong>(@$2200.00)</strong>'),
  (6999165, 4, '87 linear feet of wall cap&nbsp;'),
  (6999199, 5, '28 linear feet (does not include water feature wall)'),
  (7002117, 55, '(24) 5 GALLON COUSIN ITT @$1560<br />
(20) 5 GALLON CONVOLVULUS&nbsp; @$860<br />
(6) 15 GALLON AGAVE PARYII @ $1100<br />
(4) 15 GALLON EUPHORBIA SUCCULENTS @$700<br />
(54) 1 GALLON KANGAROO PAWS @ $1200&nbsp;'),
  (7002184, 2, '3 path
3 flood 

Additional cost for strip lights; instead of step lights'),
  (7002185, 3, NULL),
  (7004740, 6, 'BRYAN TO INSTALL WEED FABRIC FOR 2 BEDS FOR 60SQFT'),
  (7005511, 13, NULL),
  (7006143, 2, NULL),
  (7007435, 3, NULL),
  (7013141, 15, '- New Custom Powder Coated Posts and railings - Black&nbsp;<br />
- Custom Slide In fencing edges for no screw exposed look.&nbsp;<br />
- New driveway gate with railings<br />
- New Motor and Motor Pad for driveway gate<br />
- Electrical run to motor<br />
- Low voltage to pedestrian gate<br />
- New Striker at pedestrian gate and latch<br />
- New steel framed pedestrian gate for front and side yard access.&nbsp;<br />
&nbsp;'),
  (7013169, 16, 'Remove equipment from wall<br />
Remove electrical<br />
Frame out opening for panel<br />
Install mesh wire in open sections<br />
Scratch coat patches<br />
Brown coat patches<br />
Final coat stucco'),
  (7013174, 6, 'concrete pour plus bellecrete pieces'),
  (7013222, 17, 'Existing post did not go to ground.&nbsp; &nbsp;Remove, brace and install new post.'),
  (7017309, 7, '<p style="margin-bottom: 0"><b><span style="font-size: 12pt; line-height: 105%">SOIL PREP</span></b><span> (no import or haul out of soil/limited access to slope)</span></p>

<p style="margin-bottom: 0; text-indent: -0.25in"><span style="font-family: Symbol"><span>·<span>        </span></span></span><span>Lightly grade sloped area above the side and back areas of the property; fill in low spots with existing soil </span></p>

<p style="margin-bottom: 0; text-indent: -0.25in"><span style="font-family: Symbol"><span>·<span>        </span></span></span><span>Prep soil with organic amendments </span></p>

<p style="margin-bottom: 0"><span> </span></p>

<p style="margin-bottom: 0"><b><span style="font-size: 12pt; line-height: 105%">COST $2500.00</span></b></p>

<p style="margin-bottom: 0"><b><span style="font-size: 12pt; line-height: 105%"> </span></b></p>

<p style="margin-bottom: 0"><b><span style="font-size: 12pt; line-height: 105%">IRRIGATION</span></b></p>

<p style="margin: 0 0 1.25pt 0.5in; text-indent: -0.25in"><span style="font-size: 11pt; font-family: Symbol"><span>·<span>        </span></span></span><span style="font-size: 11pt">Install (3) new irrigation zones, for 3 drip lines</span></p>

<p style="margin-left: 0.5in; text-indent: -0.25in"><span style="font-size: 11pt; font-family: Symbol"><span>·<span>        </span></span></span><span style="font-size: 11pt">Install (3) new irrigation plastic valves </span></p>

<p style="margin: 0 0 1.35pt 0.5in; text-indent: -0.25in"><span style="font-size: 11pt; font-family: Symbol"><span>·<span>        </span></span></span><span style="font-size: 11pt">Install pressure regulator/filters for drip lines </span></p>

<p style="margin: 0 0 1.35pt 0.5in; text-indent: -0.25in"><span style="font-size: 11pt; font-family: Symbol"><span>·<span>        </span></span></span><span style="font-size: 11pt">All lateral trenches 12 inches below grade </span></p>

<p style="margin: 0 0 1.35pt 0.5in; text-indent: -0.25in"><span style="font-size: 11pt; font-family: Symbol"><span>·<span>       </span></span></span><span style="font-size: 11pt">Install drip tubing </span></p>

<p style="margin-bottom: 0; text-indent: -0.25in; line-height: 105%"><span style="font-family: Symbol"><span>·<span>        </span></span></span><span>Install 8 station smart irrigation timer (connect to 120v electrical service)</span><b><span /></b></p>

<p style="margin-bottom: 0; line-height: 105%"><span> </span></p>

<p style="margin-bottom: 0; line-height: 105%"><b><span style="font-size: 12pt; line-height: 105%">COST $3500.00</span></b><b><span style="font-size: 12pt; line-height: 105%" /></b></p>

<p style="margin-bottom: 0"><b><span style="font-size: 12pt; line-height: 105%"> </span></b></p>

<p style="margin-bottom: 0"><b><span style="font-size: 12pt; line-height: 105%">PLANTS </span></b></p>

<p style="margin-bottom: 0; text-indent: -0.25in"><span style="font-family: Symbol"><span>·<span>        </span></span></span><span>Install approx (75) 5 gallon creeping shrubs (suggesting mix of Ceanothus ‘Yankee Point’ and Diplacus or similar)</span></p>

<p style="margin-bottom: 0; text-indent: -0.25in"><span style="font-family: Symbol"><span>·<span>        </span></span></span><span>Install approx (6) 5 gallon shrubs to screen existing culvert (suggesting Calycanthus occidentalis or Rhamnus californica or similar)</span></p>

<p style="margin-bottom: 0"><b><span style="font-size: 12pt; line-height: 105%">COST $4500.00</span></b></p>

<p style="margin-bottom: 0"><span> </span></p>

<p style="margin-bottom: 0"><b><span style="font-size: 12pt; line-height: 105%">ESTIMATE TOTAL $10,500.00</span></b></p>
'),
  (7024197, 18, NULL),
  (7027336, 1, NULL),
  (7027407, 2, 'BACKYARD<br />
Trim (2) Eucalyptus - lower canopy section<br />
Trim (6) Podocarpus - lower canopy section<br />
Trim Rhaphiolipsis shrubs\<br />
<br />
WEST SIDEYARD<br />
Trim Podocarpus lower and mid canopy<br />
<br />
FRONTYARD<br />
<br />
Remove planting in front left planter at house.<br />
Remove roots and stumps<br />
Transplant existing fruit to pot<br />
Light trim Podocarpus<br />
Trim outside Parkway plants<br />
<br />
Haul all material<br />
&nbsp;'),
  (7027419, 3, NULL),
  (7029741, 19, NULL),
  (7032605, 1, 'Paver step redo '),
  (7035900, 20, 'Trench 50 feet for 2 new irrigation zones to extra planting from concrete fence to current planting plan.&nbsp;<br />
Trench additional 25 feet under concrete fencing for main line to front.&nbsp;<br />
Run 75 feet of new mainline for front.&nbsp;'),
  (7035911, 21, NULL),
  (7036202, 22, 'Remove existing fencing and grind out rebar reinforcement.<br />
Install 164 ln feet of new chain link fence of smaller hole width along the entire back.&nbsp; Chain link to meet LABC requirements adn will be 1 1/4 inch mesh spacing.<br />
Remove and Replace 2 posts that are bent.<br />
Haul waste fence'),
  (7036207, 23, 'Install concrete culvert 99 linear feet. 12 inches wide.'),
  (7044688, 8, NULL),
  (7050134, 20, 'Add another 17 linear feet of step to the original contract. Total of 34 feet.&nbsp; &nbsp;$1900<br />
Upgrade material to Timber Tech premium. $800'),
  (7050148, 12, NULL),
  (7052044, 56, '40 bags of glass chips for fire pits '),
  (7052434, 24, NULL),
  (7052447, 25, NULL),
  (7052519, 57, '4 up lights 
3 path lights '),
  (7057221, 4, NULL),
  (7057490, 5, NULL),
  (7057655, 6, NULL),
  (7058682, 26, NULL),
  (7059587, 1, NULL),
  (7059641, 27, 'New planting layout including added hillside and reductions are as follows<br />
<br />
Additional (38) 1 gallon - $950<br />
A reduction of (6) 5 gallons - ($240)<br />
A reduction of (10) 15 gallons - ($1500)'),
  (7059660, 28, 'Add (603) 1 gallon gopher baskets @$8 each installed.&nbsp; &nbsp;- $4,824<br />
<br />
Add. (113) 5 gallon gopher baskets. @$15 each installed - $1,695<br />
<br />
Add (12) custom 15 gallon gopher baskets. @$19 each installed. $228<br />
<br />
No baskets for flats.&nbsp; Option to put field wire below flats'),
  (7060478, 9, 'To separate ground cover from gravel '),
  (7063260, 29, 'Install 1140sq. Jut net'),
  (7065375, 1, 'REbuilding 8 linear feet of railroad tie wall up by fenceline to stabilize, will use the same materials and reset courses'),
  (7065378, 2, NULL),
  (7067471, 2, '40 lf of drainage around pool'),
  (7067475, 3, 'Upgrade subpanel, new breakers, new wire.
New wifi switch
'),
  (7067500, 5, 'upgraded from pea gravel to arizone river rock&nbsp;'),
  (7067503, 6, '$240 per light<br />
$400 lighting transformer&nbsp;'),
  (7067779, 1, 'Credit for removal and planting of 2 fruit trees and one fig tree'),
  (7067783, 2, '6 Jasmines will be paid for and delivered by client
(We will do the planting @ $40 each)'),
  (7067786, 3, NULL),
  (7067790, 4, NULL),
  (7067846, 5, 'Credit for difference between:

6 (1gallon) agave blue glow
To
(2) 5 gallon agave blue glow '),
  (7067849, 6, NULL),
  (7067857, 7, NULL),
  (7072183, 3, NULL),
  (7072184, 4, '3/8" black lava rock approx 150sqft<br />
brown shredded mulch approx 300sqft (no weed cloth)'),
  (7073302, 11, 'Demo concrete and split drains'),
  (7073507, 1, 'Demo and hauling seven hedges in planter in the front yard&nbsp;<br />
Removing root balls and hedge.<br />
&nbsp;'),
  (7076822, 5, '600sqft'),
  (7079930, 10, 'Approx 900sqft of steppers with 6” joints - gravel to be a separate c/o
Order will be placed today <!-- begin_ammend -->Includes demo<!-- end_ammend -->'),
  (7080298, 1, NULL),
  (7082584, 11, '(16) 15 gallon
(21) 24”'),
  (7084020, 8, '1 crew day'),
  (7084657, 2, NULL),
  (7086728, 6, NULL),
  (7092202, 2, 'sealer for pavers'),
  (7100760, 7, NULL),
  (7100765, 8, NULL),
  (7100772, 9, NULL),
  (7100925, 6, NULL),
  (7101550, 1, NULL),
  (7101893, 4, NULL),
  (7101910, 5, NULL),
  (7101914, 6, NULL),
  (7102743, 7, NULL),
  (7102873, 1, 'There was no shoring detail on the approved plans from the city, but the city required it to move forward.<br />
<br />
We received a shoring detail from the engineer for 8 foot deep posts that would have required having a drilling company come in to complete<br />
<br />
We were able to get that revised with the engineer to go 4 feet deep and with cross bracing to avoid that cost.<br />
<br />
3.5 Man days of labor<br />
Digging two one foot wide four foot deep holes.<br />
Insall two eight foot 8x8 posts with cement slurry<br />
Install four 4x12 supports across the face<br />
Install two 4x8 supports braced to the curb<br />
<br />
Total cost $4590<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
&nbsp;'),
  (7102931, 4, 'Exposing all existing drainage to find problems<br />
Lowering outlet pipes.<br />
Jetting and cleaning existing drains<br />
Rerunning and splicing 6 drains to get flow out to creek.<br />
&nbsp;'),
  (7102957, 10, 'Water proofing on existing stucco was cut with old deck install<br />
Needed to redo stucco around ledger boards and 3 feet down<br />
17 linear feet by 3 feet down and closing vents.<br />
&nbsp;'),
  (7102990, 1, 'Rerouting the main line around the other side of the house because there was concrete poured where our line is supposed to be run.<br />
The inspector required removing concrete to install the main line, which is not an option.
<div>There were no sleeving installed on 6 paths that were called out for sleeves on the plan.</div>
Jetting main line 28 feet in areas with no sleeves.<br />
<br />
6 man days for jetting and rerouting mainline.'),
  (7106403, 11, 'Adding Stabilizer for the Walkway and around the Olive Tree<br />
<br />
Lifting gravel and mixing with stabilizer and trowling down.'),
  (7106475, 21, 'Adding Subterranean Drip for Grass'),
  (7106479, 22, NULL),
  (7106484, 23, NULL),
  (7106507, 6, 'Electrical Repair on Valve&nbsp;<br />
Fixed Broken T'),
  (7110886, 3, '2 camellia<br />
1 new 15 gallon espalier&nbsp;'),
  (7110893, 4, 'lights 1620'),
  (7114074, 1, NULL),
  (7114083, 2, 'Additional drainage. 260 additional lfx $25'),
  (7114098, 3, NULL),
  (7114113, 4, 'Adding at ends of bench seat'),
  (7114133, 5, 'Adding one foot'),
  (7114495, 6, NULL),
  (7114606, 9, 'Approved verbally in meeting '),
  (7115776, 10, NULL),
  (7116793, 7, 'Earlier paver credit had a 12-foot deep front patio.&nbsp; &nbsp;The front patio, per request, is to be 14 and half feet deep (18) inches away from sidewalk.&nbsp; So this change adds back 65 square feet.'),
  (7116878, 24, 'Attach posts and fencing for west side Yard.&nbsp; 2x4 anchored to the wall every 4 feet, with 4x4 support.&nbsp; Then cedar fencing for the top section.<br />
Add additional 4x4 to sign to fur out fencing on neighbor side.<br />
&nbsp;'),
  (7116886, 25, NULL),
  (7116891, 26, NULL),
  (7117351, 2, '<ul>
	<li><span style="font-size: 12pt"><span><span style="font-family: "Times New Roman", serif"><span style="font-size: 11pt"><span style="font-family: "Century Gothic", sans-serif">Saw cut approx 15 linear feet of concrete curb</span></span></span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: "Times New Roman", serif"><span style="font-size: 11pt"><span style="font-family: "Century Gothic", sans-serif">Haul debris </span></span></span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: "Times New Roman", serif"><span style="font-size: 11pt"><span style="font-family: "Century Gothic", sans-serif">Form for 15 linear feet of concrete curbing at 6 inches above grade </span></span></span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: "Times New Roman", serif"><span style="font-size: 11pt"><span style="font-family: "Century Gothic", sans-serif">Pour 3000 psi natural grey concrete </span></span></span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: "Times New Roman", serif"><span style="font-size: 11pt"><span style="font-family: "Century Gothic", sans-serif">Pull forms</span></span></span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: "Times New Roman", serif"><span style="font-size: 11pt"><span style="font-family: "Century Gothic", sans-serif">Apply Top Cast to curing concrete </span></span></span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: "Times New Roman", serif"><span style="font-size: 11pt"><span style="font-family: "Century Gothic", sans-serif">Pressure wash to expose sand finish </span></span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 12pt"><span><span style="font-family: "Times New Roman", serif"><span style="font-size: 11pt"><span style="font-family: "Century Gothic", sans-serif">Repair approx (6) cracks within concrete gutter and curb</span></span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 12pt"><span><span style="font-family: "Times New Roman", serif"><span style="font-size: 11pt"><span style="font-family: "Century Gothic", sans-serif">Core for drainage exit</span></span></span></span></span></li>
</ul>
'),
  (7117502, 1, 'Add flagstone and bond beam'),
  (7121036, 27, NULL),
  (7125630, 28, NULL),
  (7126290, 11, 'Approved via text'),
  (7126625, 2, 'via text from jorge<br />
2 lights<br />
swap from little smokeys to a different light'),
  (7127801, 12, NULL),
  (7128661, 13, 'Credit for 1/2 yard of unused gravel.'),
  (7134978, 1, NULL),
  (7135245, 58, '200sqft of pavers for sunken firepit 

****Pls note there was a credit issued on 2/1/24 for concrete (#26) - part of this credit was initiated b/c the original design plan called out concrete for the firepit area which we switched out to pavers, the change order should have also reflected the additional pavers but the change order was never updated***'),
  (7141899, 1, NULL),
  (7141906, 2, NULL),
  (7141938, 3, '8 LF X $62.40= $499.00'),
  (7142708, 28, 'Install cleanouts beyond fence area'),
  (7142711, 7, 'Credit for removing wiring work of lights in contract'),
  (7146091, 1, 'Remove driveway, patio & rear step<br />
Install 1066sf  ''Courtyard'' driveway and rear patio<br />
Install 36lf of bullnose steps rear patio<br />
Upgrade front edging to metal & add along north front p/l<br />
Add (3) 4" flats south of driveway planter & irrigation<br />
Add (1) zone irrigation for rear sod <br />
Remove rear lawn and add 735 sf of ''marathon I'' sod<br />
Add 350 sf of mulch to rear yard<br />
Plant approx (10) owner supplied plants <br />
<br />
Total Change Order is $27,733<br />
<br />
Approved for 12K to be paid for change order and the remaining balance of 15,733 to be paid once house sells. <br />
 '),
  (7146297, 59, NULL),
  (7146720, 1, 'Adding the driveway'),
  (7151267, 1, 'Entire patio area concrete to be stamped concrete, this will include the areas on either side of patio cover (current concrete does not include&nbsp;<br />
this 290sqft)'),
  (7156202, 8, 'Not installing the garbage can walls, taking out of contract.'),
  (7156361, 29, NULL),
  (7157264, 2, '

2.  Curbing Angelus Rustic wall block on it''s 8" vertical side, exposing 4''-6" curb next to pavers on the front porch side

12 Linear Feet X $28.80= $354.60


Material choices:

Wall:  Angelus Rustic Wall Block in grey/moss/charcoal

Curb:  Angelus Rustic Wall grey/moss/charcoal

'),
  (7157276, 3, '

1.  Garden Wall 12" high in Angelus Rustic wall block in Grey/Moss/Charcoal 

30 LInear Feet X $86.40= $2,592.00




Material choices:

Wall:  Angelus Rustic Wall grey/moss/charvoal

Pavers: Angelus Holland in grey/moss/charcoal 

  Border same paver in soldier''s course

  Field in horizontal runner course

'),
  (7157340, 4, '

<p style="margin-bottom: 0"><b><span style="font-size: 12pt; line-height: 107%; font-family: "Times New Roman", serif"> </span></b></p>

<p style="margin-bottom: 0"><b><span style="font-size: 12pt; line-height: 107%; font-family: "Times New Roman", serif">Concrete pads</span></b></p>

<p style="margin-bottom: 0; text-indent: -0.25in"><span style="font-size: 12pt; line-height: 107%; font-family: "Times New Roman", serif">1.<span style="font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-alternates: normal; font-kerning: auto; font-feature-settings: normal; font-variant-position: normal; font-stretch: normal; font-size: 7pt; line-height: normal; font-family: "Times New Roman"">      </span></span><span style="font-size: 12pt; line-height: 107%; font-family: "Times New Roman", serif">6 pads </span></p>

<p style="margin-bottom: 0; text-indent: -0.25in"><span style="font-size: 12pt; line-height: 107%; font-family: "Times New Roman", serif">2.<span style="font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-alternates: normal; font-kerning: auto; font-feature-settings: normal; font-variant-position: normal; font-stretch: normal; font-size: 7pt; line-height: normal; font-family: "Times New Roman"">      </span></span><span style="font-size: 12pt; line-height: 107%; font-family: "Times New Roman", serif">2’ X 2’</span></p>

<p style="margin-bottom: 0; text-indent: -0.25in"><span style="font-size: 12pt; line-height: 107%; font-family: "Times New Roman", serif">3.<span style="font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-alternates: normal; font-kerning: auto; font-feature-settings: normal; font-variant-position: normal; font-stretch: normal; font-size: 7pt; line-height: normal; font-family: "Times New Roman"">      </span></span><span style="font-size: 12pt; line-height: 107%; font-family: "Times New Roman", serif">Poured in place or Angelus Pavilion
2’ X 2’</span></p>

<p style="margin-bottom: 0; text-indent: -0.25in"><span style="font-size: 12pt; line-height: 107%; font-family: "Times New Roman", serif">4.<span style="font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-alternates: normal; font-kerning: auto; font-feature-settings: normal; font-variant-position: normal; font-stretch: normal; font-size: 7pt; line-height: normal; font-family: "Times New Roman"">      </span></span><span style="font-size: 12pt; line-height: 107%; font-family: "Times New Roman", serif">$125.00 each</span></p>

<p style="margin-bottom: 0"><span style="font-size: 12pt; line-height: 107%; font-family: "Times New Roman", serif">Cost:   $750.00</span></p>

'),
  (7160585, 27, NULL),
  (7160925, 30, 'Remove 3 inches of soils and grade.<br />
Install geotextile fabric<br />
Install 350 square feet of Del Rio Gravel'),
  (7160929, 31, NULL),
  (7160936, 32, 'Install 3 2x8 beam covers inside patio.<br />
Install 3 2x8 outlet wraps outside posts<br />
Install 3 patio light extensions<br />
Wrap 3 posts in 3/4 inch wood table grade ply.&nbsp; Butt joint<br />
Fill and level wood patching w 4 to 5 coats of Bondo.<br />
Install plastic post veneer bases to all posts.'),
  (7160955, 33, 'Install&nbsp;<br />
(14) 5 Gallon Lady Banks<br />
(8) 5 Gallon Giant Bird of Paradise<br />
(16) 5 Gallon Staked Star Jasmine<br />
(2) 15 Gallon Durante<br />
(20) 5 Gallon Boxwood<br />
(14) 5 Gallon Grewia<br />
(3) 15 Gallon Regular Bird of Paradise<br />
(8) 1 Gallon Stattice<br />
<br />
Install 2 yards of Walk on Mulch'),
  (7165437, 7, NULL),
  (7166497, 12, '1. Rebuilding small retaining walls flanking steps (brick caps) @$4000.00<br />
2. Rebuilding steps to front yard 6 steps cantilevered in concrete (finish//color to be the same as b/y) @$3800.00<br />
3. Rebuilding (2) front step landing areas, for a total of 84 linear feet in concrete (finish/color to be same as b/y) and&nbsp;concrete walkway aligned&nbsp; &nbsp; &nbsp; to steps and front entry walkway for 209sqft @$4800.00'),
  (7167029, 9, 'This counter will be priced at straight, not curved, with flat counter top to match outdoor kitchen counter

6" wall/edge 30" pizza oven on counter 24" counter next to pizza oven for a total of 5'' wide with 36" deep. 

5'' x $740.00 masonry = $3,700.00

Gas 10 linear feet x $35.00= $350.00

Electric 9 lf x $35.00 $315.00

Total $4,365.00

Includes installation of pizza oven and access doors

'),
  (7167397, 8, NULL),
  (7168632, 13, '231 sqft of DG 4.15 per sqft total is $958.65'),
  (7168633, 14, '100 sqft of Del Rio Gravel for Side Yard 3.85 per sqft&nbsp;<br />
Total is&nbsp;$385'),
  (7168637, 16, '7) 15 gallon climbing roses $315 per rose<br />
<br />
Total $2205'),
  (7168638, 17, 'Installing Trellises<br />
<br />
2 hours of labor at $70 per hour<br />
<br />
Total $140'),
  (7168644, 18, '8) 15 gallon Ligustrums Texanum $150 per plant<br />
1) 24 inch box Magnolia Little Gem $385<br />
<br />
Total $1585'),
  (7168651, 19, '18 sqft of concrete $50 per sqft<br />
<br />
Total&nbsp; $900<!-- begin_ammend --><p>Understanding is this is the planter on the side of the house to be covered.</p>
<!-- end_ammend -->'),
  (7168652, 6, NULL),
  (7168856, 34, 'Rip cut 2x6 fencing material.&nbsp;<br />
Drill Anchors and attach wood veneer<br />
Veneer in staggered butt joint ends.'),
  (7169726, 12, NULL),
  (7170924, 1, 'Alumawood Pergola. PB to excavate footings only'),
  (7170971, 13, NULL),
  (7170974, 14, 'Del Rio at 3" @3042sqft includes landscape fabric'),
  (7174210, 2, NULL),
  (7174213, 3, NULL),
  (7175468, 1, NULL),
  (7175477, 2, NULL),
  (7177960, 35, '1) Clean fencing<br />
2) Apply Cabots clear wood sealer. Roughly 4160 sq feet<br />
&nbsp;'),
  (7178176, 13, '7 FLATS BLUE STAR'),
  (7178179, 14, NULL),
  (7179218, 2, 'Install culvert and sidewalk.'),
  (7179589, 6, 'The amount of Paver installed was actually 1100 sqft plus 42 sqft still needed for parkway.<br />
549 sqft being Credited <br />
15.25 per sqft <br />
Total credit of $8,372.25'),
  (7179698, 7, NULL),
  (7185757, 8, '380 sf x $5.50= $1,540.00'),
  (7186763, 1, NULL),
  (7190936, 36, 'Grind out cracks made in stucco.&nbsp;<br />
Grind out bad stucco patch&nbsp;<br />
Grind out small section stucco patio<br />
Repair stucco patches and cracks'),
  (7190938, 38, NULL),
  (7190939, 39, 'Install roughly 110 of 2x6 treated board. Not included in original contract.<br />
<br />
(No charge for original bender board swap out'),
  (7195200, 9, '6 2 gallon lavenders @ $30.00 each. $180.00'),
  (7195796, 40, 'Upgrade Sod to St Augustine'),
  (7195801, 41, 'Original Contract has 19 lights.&nbsp; Install 21 bed lights<br />
Plus Install 4 FX Luminaire Upgraded Path lights<br />
Plus Install 2 down lights for trash area.'),
  (7198970, 42, NULL),
  (7203065, 1, NULL),
  (7206250, 4, NULL),
  (7210563, 1, 'Additional Demo for the front yard.'),
  (7210575, 2, 'Stump grinding $460&nbsp;'),
  (7210584, 3, '43 linear feet at 13 dollars a foot&nbsp;'),
  (7212811, 1, '2.5 Crew days at 7 hours a day $150/hour - $7875<br />
Import 9 yards of dirt, $400 delivery (x2), $13/yard&nbsp; - 917'),
  (7214685, 5, NULL),
  (7216500, 4, 'Added one light'),
  (7222389, 10, NULL),
  (7222473, 5, '


That is $383.44/ft, and we are short 5.5'' on the s/w return = $2,108.92

'),
  (7222475, 6, 'Leaving $200.00 to install an owner provided app- operated transformer'),
  (7223204, 15, 'Demo and haul'),
  (7223234, 16, 'Install step at 6’ x 26”
Install step at 79”x 24”'),
  (7226223, 8, NULL),
  (7231257, 2, NULL),
  (7231276, 1, NULL),
  (7231278, 2, '6 PATHS<br />
3 UPS<br />
1 TRANSFORMER'),
  (7231281, 3, 'Added JellyBean to gravel areas'),
  (7232340, 7, 'See list from Jorge of reduced plants and add 1 15 gal lime and 1 flat of rosemary. Original in contract $5,092.50 , reduced to $3,411.00. Difference is -$1,680.50'),
  (7232351, 8, 'Credit for 1 irrigation zone'),
  (7232352, 1, '530sqft at 7" below grade'),
  (7232368, 2, '23 linear feet at 1'' tall '),
  (7232377, 3, '55 linear feet&nbsp;'),
  (7232390, 4, NULL),
  (7232399, 5, NULL),
  (7233149, 8, 'Sump Pump + 2x2 Catch Basin<br />
120 LF of 2" Schedule 40 pipe to connect pump and run out to street<br />
19 LF Strip Drain across the edge of the garage<br />
12 LF Conduit w/gfi breaker '),
  (7234573, 9, NULL),
  (7241463, 3, NULL),
  (7242064, 1, 'catalina grana victorian'),
  (7244205, 9, NULL),
  (7244231, 2, 'additional sod and valve&nbsp;'),
  (7244294, 2, '6- 5 gals Total $261 Let me know if if this works. we can coordinate for the next yard check this Friday'),
  (7245342, 43, 'No walkway lights to be installed.&nbsp;'),
  (7245507, 44, '1) Install Brickwork for neighbor side around fencing footings.&nbsp; &nbsp;(Needed due to having to cut neighbor concrete around old footings)<br />
2) Install Hose Reels<br />
3) Install Large Del Rio for back planters<br />
4) Build Raised Planter Bed. Redwood posts, Redwood rails, and Overlapped Cedar Siding<br />
5) Finish Fencing in upper section.&nbsp;<br />
6) Wrap front post and beams.(have to wrap beam to match post wrap thickness)'),
  (7246130, 4, '14  irregular pieces for 3 small pathways to be set approx 12" apart'),
  (7248337, 2, 'For back planter'),
  (7248339, 3, NULL),
  (7252771, 4, 'includes stump/root grinding and debris haul&nbsp;'),
  (7252774, 5, NULL),
  (7253922, 1, NULL),
  (7257169, 3, NULL),
  (7262718, 6, '4”
SDR 35 pipe includes tie in to downspouts '),
  (7262740, 7, 'Chip out 67 LF. ON BOND BEAM @1.5 INCHES TO GET CORRECT ELEVATION TO MEET 1 INCH UNDER WEEP SCREED.'),
  (7267687, 1, 'Taking out fence 

Grading dirt flat'),
  (7267694, 2, 'Adding one valve for the grass '),
  (7268275, 17, '(21) 5 GALLON SHRUBS (silver sheen pittosporum, golf ball pittosporum)<br />
(39) 1 GALLON PERENNIALS (licorice, salvia, lavender)'),
  (7268466, 8, NULL),
  (7268470, 9, 'to level out bond beam'),
  (7270846, 2, NULL),
  (7271121, 11, '4 black step lights. Approved via text'),
  (7271247, 4, 'bbq spec''d above is with decking tile. '),
  (7271269, 5, 'credit for tile $300<br />
credit for sod $3000<br />
concrete design from original design $7000<br />
half irrigation credit (irrigation is preliminary ran, electrical ran for valves ran to timer)&nbsp; $1200<br />
demo of concrete at 3.75 sq ft $2,250'),
  (7271330, 6, '950 sq ft of concrete $8,218<br />
300 linear feet of turf strips $5,500<br />
300 sq ft of turf under lemon $4,700<br />
demo 7 inches below grade to prep for new concrete $3,325<br />
600 linear feet of forming for  segmented concrete and turf strips with stakes and 2x4''s $2800<br />
<br />
<br />
<br />
 '),
  (7275371, 45, 'Removed moving water heater from Picture Build Scope.&nbsp; &nbsp;Credit from contract.'),
  (7275380, 46, 'Panel work done by 360.&nbsp; Credit from Contract.'),
  (7279373, 4, NULL),
  (7280144, 4, NULL),
  (7280149, 5, NULL),
  (7284107, 10, NULL),
  (7284163, 11, 'With bender board edging to separate from sod 22 linear feet'),
  (7284449, 12, NULL),
  (7284456, 13, NULL),
  (7284713, 1, NULL),
  (7286661, 7, NULL),
  (7290441, 8, 'reduction of concrete based on jorge final measurement'),
  (7290552, 5, 'Upcharge for the 1/2" Jeally Bean gravel'),
  (7291284, 18, '8 linear feet + 1 light'),
  (7291298, 19, 'FIRST PART OF COURTYARD'),
  (7309899, 1, NULL),
  (7309905, 2, NULL),
  (7312827, 9, NULL);

UPDATE bids b
SET custom_co_id       = u.custom_co_id,
    scope_of_work_html = NULLIF(u.scope_html, '')
FROM _co_backfill u
WHERE b.bt_change_order_id = u.bt_co_id;

COMMIT;
