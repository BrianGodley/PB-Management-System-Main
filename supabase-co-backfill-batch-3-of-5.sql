-- ============================================================
-- CO Backfill — Batch 3 of 5
-- Updates 1,336 bids rows (rows 2673-4008 of 6,676)
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
  (4024981, 9, 'have to sleeve under the driveway for side planter'),
  (4024984, 10, NULL),
  (4024987, 11, 'Includes demo, no sand to set pavers, just digging in and setting.<br>
Side by side steppers'),
  (4027063, 1, NULL),
  (4030698, 35, 'Demoed and added 2 extra inches of base material in roughly 700 square feet.   $1,800<br>
<br>
Back fill lower planter wall (not in backyard change order) $400<br>
<br>
Raise height of planter wall by 2 courses vs plan.  $1,100<br>
<br>
Still need to have change order for extra grade removal at bottom beyond 7 inches.  Will figure this out once we grade and compact for new step location. '),
  (4030790, 36, 'Did out rain garden 3.5 feet down.  Haul out extra soils to dump.<br>
<br>
Install pond liner system. <br>
<br>
Deliver gravel and textile fabrics and haul in,. <br>
<br>
Deliver top soils for 12 inch bed and haul to backyard.<br>
<br>
Install mulch layer<br>
<br>
Install rip rap<br>
<br>
Install 10 feet of Overflow drain system.<br>
<br>
Planting not included<br>
<br>
 '),
  (4032279, 3, 'Please see attached planting list.  Plants priced out per standard table included in contract.,  <br>
<br>
 '),
  (4033063, 7, 'Measurement off from plan - additional 70 SF needed'),
  (4033093, 8, '44 LF of brown plastic bender board 6" x 1" '),
  (4033116, 9, 'Credit for valley rtf sod 135 sf'),
  (4033275, 10, 'For jacuzzi run 90 LF of 1" conduit
(6) 6 guage wires
18" below grade'),
  (4033279, 11, 'Client will pull permit'),
  (4033320, 12, 'We are NOT going to do DG under jaccuzzi'),
  (4033326, 13, '50 LF of Belgard Catalina Grana in Victorian'),
  (4033471, 14, '1 brass valve for planters with Netafim $800
1 brass valve for grass spray zone $895
Install of smart timer $50
Complementary new hose bib ($200)'),
  (4037391, 2, NULL),
  (4040907, 2, NULL),
  (4040960, 12, NULL),
  (4040987, 1, '86 LF of 3" sdr pipe
3 drain grates
Remove, grade and relay existing brick paver across driveway to make way for  connecting drains '),
  (4040991, 2, 'Not doing as big an area for paver'),
  (4041146, 3, 'Main line from where existing hose bib is to nearest CMU wall where roses will be

Use existing hose bib'),
  (4041665, 13, NULL),
  (4042121, 3, 'Credit for providing the controller. Picture Build still installing and wiring. '),
  (4042184, 37, NULL),
  (4042799, 1, 'Original Plant budget was $1700<br>
<br>
Adding 5 1 gallon blue fescue. <br>
<br>
Total plant orderis now $1441<br>
<br>
Credit due of $259'),
  (4046542, 14, NULL),
  (4046605, 15, 'Includes demo'),
  (4046630, 16, '19LF x 8”x8”
Also will need to core drill curb to extend rebar '),
  (4046651, 17, NULL),
  (4046698, 18, NULL),
  (4047448, 15, 'This is for digging trenches for another electrician outside of Picture build to install. Picture Build is not liable for permitting nor electrical work.

Separate document with liability clause to be sent via email and signed by both parties.'),
  (4051384, 4, NULL),
  (4053230, 5, NULL),
  (4053785, 3, NULL),
  (4054046, 11, 'Repair paver borders that sunk in due to next door construction. <br>
Remove borders that were set in concrete. <br>
If needed remove more of the pavers.<br>
Bring in new pavers.<br>
level and compact the effected area one more time.<br>
Wet set the borders again in concrete.<br>
Set the pavers back in.<br>
Add sand as needed. '),
  (4054087, 19, NULL),
  (4059143, 11, NULL),
  (4059202, 5, NULL),
  (4060017, 38, '1) Move soils from rear yard and haul, that was not in contract.   Regrade and compact section by new steps near firepit.  $4000<br>
2) Cantilever steps per client request.  $20 per linear foot.  123 linear feet of steps. $2460<br>
3) Demo and add walls for new side steps and rear step 17 liner feet in total.    Saw cut and demo walls. $2,960<br>
<br>
Veneer add to be in separate change order. <br>
 '),
  (4062238, 1, NULL),
  (4063154, 1, 'Price differeence for using new pavers'),
  (4063161, 5, NULL),
  (4063205, 8, '(2) new valves
(2) new pressure regulators
(1) 12” ground box'),
  (4063709, 20, '140sqft around sod'),
  (4063711, 21, NULL),
  (4063716, 22, NULL),
  (4066003, 2, NULL),
  (4066408, 1, '30sqft plus demo'),
  (4067346, 14, '(1) 300 watt transformer
(2) 5.5 watt LED well light bulbs
Labor to install the above included
'),
  (4067590, 15, NULL),
  (4067959, 23, 'Stucco for wall extensions (recent change orders)'),
  (4070907, 3, '3 additional path lights'),
  (4071466, 2, 'Due to the shape of the center island grass area. There will always be some form of overspray to account for the wind that is frequent in the Santa Clarita Valley. <br><br>????Without overspray, there would be sufficient coverage for the sprinklers and grass would end up dying. We are limited in the type of nozzles available and have the smallest ones chosen to have minimal overspray. <br><br>????<br><br>??<br>?????'),
  (4074116, 6, 'Not using rock. Using mulch which will be added in mulch change order&nbsp;'),
  (4074158, 7, NULL),
  (4075403, 8, 'Original Mulch in the contract 445 SF<br>
Back count 400 SF<br>
Front Count with parkway 408<br>
Total to install:<br>
808 SF - 445 in contract<br>
$635.00'),
  (4075776, 2, '-remove flagstone/gravel 7" below final grade<br>
-Install roughly 370 sqft of pavers (will use some of the pavers that are left over from pathway)'),
  (4075781, 3, NULL),
  (4075782, 4, NULL),
  (4075789, 14, NULL),
  (4077077, 6, NULL),
  (4077478, 7, NULL),
  (4077933, 16, '(3) up lights -  CL531B-GM-LED11 2.5 
(1) path light - CL735B- GM-18-LED16-3W-WF

Includes wiring, assembly, light fixture, LED bulbs, placement and all other labor associated with lighting.'),
  (4077943, 17, 'No charge as a gift complementary of Nicole.
Additional cost specified in contract was $200 to upgrade to a smart timer. '),
  (4081746, 16, 'Found 3 stumps in grass area for stump grinder'),
  (4082708, 17, 'We are not doing the drainage as stated in the signed contract. Client Dara has signed a liability waiver (in Permits folder).'),
  (4082765, 10, NULL),
  (4082929, 4, 'Import additional 7 yards of 50/50 soil.  

In contract we had Import 3 yards of 50/50.'),
  (4083515, 9, '- Even out mulch in the front
- Add bender board in parkway
- Remove bathroom 
- Replace the broken hose
- Fix drainage
- Replace 3 lights'),
  (4084756, 6, NULL),
  (4087428, 5, 'Main line shut off valve. There was not one before which means you have to call the city to shut off your water. This is highly recommended. Thank you!'),
  (4087458, 2, 'This has to be done in 2 phases.<br>
First day one coat and have to go back the next day for the second coat. '),
  (4087506, 10, NULL),
  (4087600, 3, NULL),
  (4089533, 14, 'Steps have been requested by client to be encased, timber allotment did not consider encasement going all the way up to DG/jaccuzzi pad. See most recent photos. We have used 50 timbers so far, we need 20 more. In total that equates to 70 LF x 8 ft = 560 LF.'),
  (4091344, 3, 'If we are under then we will credit you.  Permits are in process of being pulled, we do not know costs of this yet.  This is an allotment.'),
  (4091520, 18, '8 flagstones set in grass to connect front entrance to side gate (through grass area, meeting up with DG area).
'),
  (4091526, 1, 'We did not install main line ball valve shut off with cover. Not needed.
'),
  (4093150, 2, NULL),
  (4093160, 3, '2 new drip zones with all new brass valves. '),
  (4094596, 18, 'Adding 1'' square stepping stones to patio for a total of 24 SF and 24 pavers, we need 3 more 1’ x 1’ to complete the look/project .  We did not use road base on these stepping stones.  We did need to cut the grass around the stones and we did have to align them to make a path and make them equal distance.'),
  (4095603, 1, NULL),
  (4095730, 1, 'Install two new retaining walls.  14'' x 3'' plus footing   10 ''x 4'' plus footing<br>
<br>
Includes demo,  reinforcement, grout cells, water proofing for one wall and stucco coating.'),
  (4097927, 6, 'Adding 5 6” x 6” x 8’ ACQ Green timbers to retaining wall - $350 
Labor - $500 - 1/2 day '),
  (4098720, 7, 'Labor for lifting brick and replacing.  Melinda discussed with Emelley.'),
  (4098722, 8, '20 pieces of Rustic Wall in Grey/Charcoal to complete and finish the wall. NO CHARGE as this was estimated at 21 LF in contract, as an offset for needing more timbers, I have given this at no charge to Emelley. '),
  (4100933, 2, NULL),
  (4101521, 2, 'Change type '),
  (4101989, 15, '(4) 6 x 6 x 8 timbers to retain wall of steps leading up to jacuzzi patio.
Includes labor. I have given best price on final order of timbers. This should complete all the ACQ timbers needed for this project.'),
  (4102060, 2, NULL),
  (4110328, 16, 'Stucco existing wall to match. Approx 28 SF (13 SF of stucco was included in other change order)'),
  (4110340, 17, '6 LF of 8” x 8” x 16” CMU block wall on top of fresh newly built wall
- cut block to ensure that caps match height of top step
6 LF of Rectangular CMU wall cap'),
  (4110820, 3, 'total additional needed 57 Linear FeetX $22.00= $1,254.00'),
  (4110842, 4, 'French Drain, 3" perforated pipe in sleeve, set in 12" gravel behind waterproof wall<br>
60 Linear feet X $35.00= $2,100.00<br>
70 Linear feet X $23.00= $1,610.00<br>
Total $3,710.00'),
  (4110890, 5, NULL),
  (4111126, 18, 'Cost difference for 2 24” Pablo verde tree boxes- $130, Nicole is splitting it with client, 50/50.'),
  (4111517, 6, 'Add high grade weed barrier 450 SF includes installation '),
  (4111551, 6, NULL),
  (4112255, 1, '1) Do a job clean up and haul all waste.  <br>
2) Demo down 16 inches for A/C pad per client instructions to have it low as possible. Haul extra soils. <br>
3) Install sleeves and drain line under the pad.  <br>
4) Form for A/C with bi level per instructions from A/C contractor. <br>
5) Install A/C rebar pour and finish A/C pad <br>
6) Dig trench for electrical contractor to run new electrical. Roughly 110 linear feet.  Backfill and recompact later with future work <br>
 '),
  (4113368, 7, 'Johnny had installed prior to start.'),
  (4113375, 8, 'We received a 5g to plant, not a 15g.  This is a labor credit as the client purchased plants himself. '),
  (4116495, 4, NULL),
  (4116525, 9, NULL),
  (4117016, 2, NULL),
  (4119610, 11, 'Approved via text '),
  (4120113, 1, 'See Change Order Estimate in documents folder, signed by both parties. '),
  (4120135, 4, NULL),
  (4120296, 5, NULL),
  (4120841, 5, 'Removed from scope:

 Concrete Bench
1. Install footings and wooden forms for concrete pour. SEE PLANS.
2. Little bench is to be poured in place concrete at approx:
a. 1’ 10” arms
b. 7’ 2” length.
c. 18” maximum in height, anything over this will be a change order.
3. Carpenter to install wooden planks for sitting.
4. Sand finish on poured concrete approx. 28 SF
COST: $966'),
  (4122116, 3, NULL),
  (4122472, 6, 'Adding approx 14.4 LF of cantilever step at back kitchen step (was a normal step before, see addendum). Sand finish. '),
  (4123738, 1, NULL),
  (4123743, 2, NULL),
  (4123746, 3, '250-300 linear feet'),
  (4123747, 4, 'Updated 9/9'),
  (4123918, 3, '90 day plant warranty is not over 
Yard checks to be completed 
DG be compacted '),
  (4124179, 3, 'Remove concrete swale and haul to dump.'),
  (4124363, 39, '1- At bottom for smoker moved out to make wider additional concrete 18"x25''  $350<br>
2- We now have a total of 40 steps and a total of 145 LF of steps (there will be more added). We had 96 ln feet in change order.  $2695<br>
3- 1 man day to demo part of pool on rain garden area and haul.  $625<br>
4- Remove and haul soil from AC area (not ib previous change order/contract). Area 2 Man Days. Two extra loads of hauling. $2800<br>
5- Demo for drainage installation at bottom walkway to Park area - 2 man days plus material  $1200<br>
6- demo rain garden wall 1/2 man day and haul.  $450<br>
7- Poured in Place wall cap 71 ln feet  $4615<br>
<br>
 '),
  (4124703, 5, NULL),
  (4125542, 7, NULL),
  (4125547, 6, NULL),
  (4125557, 4, NULL),
  (4125572, 4, NULL),
  (4125575, 10, NULL),
  (4125589, 26, NULL),
  (4125591, 40, NULL),
  (4125595, 19, NULL),
  (4127988, 4, 'Adding shut off valve for backyard irrigation valves.'),
  (4130076, 5, NULL),
  (4130085, 6, NULL),
  (4130109, 1, 'New timer and wiring.<br><br>Verbally approved by Charles. '),
  (4130365, 7, 'See lighting choices and notes:

3 up - 2201 in black (5W LED, beam spread 30) for tree in front
9 up - 5003 in black (beam spread 60) hedge, driveway  grasses and back/side wall splashes
5 up - 5003 in black (beam spread 36) for up into trees
*3 step - 4246 in black ($325)
15 path - 6507 in black
46 LF of LED strip lighting for under cantilever steps

2 - 300 watt transformers'),
  (4131922, 34, NULL),
  (4131964, 35, NULL),
  (4131977, 36, NULL),
  (4132308, 5, 'Blocks on wall need repairing and restablizing before we can tie new wall into it'),
  (4134427, 2, NULL),
  (4136869, 6, 'Adding border 81 LF of Cat. Grana in Victorian 6” x 9”
Wet lay border stone.
Includes labor and additional sand materials, etc.'),
  (4137233, 3, 'A normal concrete pad has 4" anything over the 4" requires a change, this concrete pad is about 16" please see image '),
  (4137476, 15, NULL),
  (4137677, 24, '16 flats'),
  (4140188, 1, NULL),
  (4141487, 8, 'In contract I have 100 LF and we need an additional 32 LF. @$12.50/LF as in contract.'),
  (4142160, 8, '(10) 5 gallon roses<br>
(1) 15 gallon Eugenia<br>
transplanting'),
  (4143610, 4, '<br>
1- Remove about 30 yards of cut and haul soils from back for new grading levels per layout.  $6,900<br>
2- Run low voltage wire (as of now we have 250 LF. installed)  $500<br>
3- Add about 25 LF. of drainage to down spout in front porch. Demo section of front path and reinstall. (best effort to save existing) $950<br>
4- In front yard landscape timber wall - first 16LF. 3 courses including gravel beds and fabric coverage $1,600<br>
5- In front yard add additional 19LF. about 5 courses pending on elevations (first course will be buried)  $2,800<br>
6- Build about 4 LF. return wall along garage 4ft tall connected to existing retaining wall.  Standard detail footing.  $1,000<br>
7- Backyard install 85 ln feet of 24 inch timber wall to take out grades per last requirement and wrap around tree. $13,655<br>
<br>
<br>
 '),
  (4145990, 1, '4 focus nitilda for right corner. '),
  (4146561, 7, 'Raising the back wall up to 1 course in the center of the water feature arch, and taper down to the 40" back pilaster $5.25 X 12= $63.00<br>
Raise the scupper to be over the mermaid<br>
Additional Tile on the facade water side average of 1/2 of a AF, $10.75 X 12= $129.00<br>
Additional water proofing on the back side 1/2 SF X $5.25= $63.00<br>
$255.00 Total to raise the back of the arch to 42" + 7"= 50" plus the 3" cap, 53 inches high in the middle.<br>
<br>
 '),
  (4148931, 7, '677 additional sf of rtf grass. X $3.50= $2,369.50'),
  (4149147, 9, NULL),
  (4149930, 4, NULL),
  (4149967, 25, NULL),
  (4149979, 26, NULL),
  (4152203, 1, NULL),
  (4154100, 22, 'Need 2 more rectangular pavers Stepstone to match what we have.
Add black pebble in-between same as what we have. (Few bags)
Add little piece of bender board to complete pathway. 
Includes labor and material.'),
  (4159536, 1, 'Remove (4) tree stumps<br>
 '),
  (4159974, 2, NULL),
  (4160071, 5, NULL),
  (4160140, 2, 'Demo concrete slab nearest concrete steps (18 SF)

Remove brick at back shed area and spread out small pebbles (13 LF)

Re-install brick border at back shed with half brick showing (acting as a bender board for pebbles)



'),
  (4160178, 3, 'Wet lay (2) 2''6" LF brick steps on top of concrete
Remove turf and add soil underneath, compact
Re-install turf after brick steps are complete and seam up '),
  (4160254, 4, '(2) steps at side door 13 LF with border and herringbone infill 

'),
  (4161771, 20, 'Credit as per design agreement.'),
  (4161801, 19, 'Credit for design agreement dated 02/22/2021'),
  (4162156, 7, 'Additional 217 SF of creeping red fescue for expanded grass area'),
  (4162192, 8, 'Based on 1,170 Sf of Concrete pour, Sand fnish $.75, (75 cents) per SF<br>
$877.50'),
  (4165697, 9, NULL),
  (4165967, 6, '(1) stump was included in the original contract <br>
 '),
  (4166099, 8, 'Credit for (2) plants that we cannot find Cotelydon orbiculata (Pig’s Ear).  

Beds are full of plants and all looks good.'),
  (4166209, 1, '57''L x 24"H Curb would be $3817 - $217 Discount = $3600 '),
  (4166579, 11, 'We did not use (1) brass valve that was on contract, we did use the piping for it, but not the actual brass valve material.  This is a credit for that.  '),
  (4166635, 3, 'See daily log:<br>
8 5 gallon plants @ $43.50=  $348.00<br>
3 15 gallon podocarpus  @ $150.00= $450.00<br>
Total Credit:  $798.00'),
  (4166638, 4, 'Installing geotextile fabric 140 SF and 6" of basic gravel @ $4.65 SF= $651.00'),
  (4170702, 7, NULL),
  (4170878, 9, 'Demo gutter (street side)
Form up
Pour concrete 3000 psi city mix for up to 17 LF.
Install asphalt infill at street'),
  (4173150, 2, '1) Remove 16 foot tall Jacaranda.<br>
2) Remove stump from hillside that is in the way of the wall location<br>
3) Remove additional concrete from side gate to driveway<br>
4) Install new walkway with the rest of the pour from side gate to driveway. '),
  (4173160, 2, NULL),
  (4173300, 23, '33 LF of black bender board ($360)
12 (2 x 2) Stepstone pavers ($880)
Del Rio inbetween pads (we have enough on site from beds, some areas of beds are very full with gravel and we can use some inbetween the steppers - approx 2” between each stepper, not that much gravel)'),
  (4173329, 10, 'Brian has gifted Amy 2 LF of apron at approx $250/LF for a total of $500.'),
  (4174172, 16, NULL),
  (4174625, 27, NULL),
  (4177847, 19, NULL),
  (4180540, 1, NULL),
  (4181127, 5, NULL),
  (4182580, 9, '40 additional sf of colored. Concrete. $11.00 + .75=&nbsp; $11.75 a sf. = $470.00'),
  (4188355, 11, 'We went from 88 LF to approx 82 LF of cantilever steps at front entrance.  '),
  (4188368, 12, 'Adding 2” to the thickness of concrete planter wall (continuous 2nd step out of garage)
Poured in place approx. 21 LF at 14” thickness'),
  (4189067, 13, 'Adding 1.5’ (or 18”) on each side of garage steps. Landing pad should go to end of garage wall.

Landing pad - 3’2” x 7’ 2 1/2” (1st step) with 14” step treads
(3rd step ) 7’ 2 1/2” with 14” step treads'),
  (4189130, 14, '20.7 LF of 4” grey concrete poured in place wall up against front of house. 
Cover and close up the fireplace clean out.
Smooth stucco from top to below soil level.
'),
  (4189256, 5, 'One punch-out GFI outlet includes labor.'),
  (4189856, 15, 'We are now doing a straight concrete pour in your driveway with scoring instead of sectioned pads with DG in-between.

Under contract addendum see page 1….
Concrete Sectioned Pads - Entrance of driveway up to gate
DG - $375
Wooden Forms - $400'),
  (4190421, 16, 'No base in our concrete pours (including under any stepping pads).  '),
  (4195807, 2, NULL),
  (4197157, 1, 'Permit for apron - $437
Admin hours - 1 hour @ $100 per hour

Total Allotment in Contract: $1,000 - $547= $453<!-- begin_ammend -->I meant $110 an hour as in contract! Typo there.<!-- end_ammend -->'),
  (4197173, 3, '<strong><u>Demo/Grading</u></strong><br>
 <br>
1.Remove existing concrete driveway at 7” below final grade up to gate and not beyond.<br>
2. Remove existing pathway at 7” below final grade.<br>
3. Be careful of grass.<br>
4. Haul all materials to appropriate sites.<br>
*Soil maybe imported if grade needs to rise, but we should have enough after taking out 7” of soil in driveway to build it up on the exit. If soil is needed, we will have to do a change order.<br>
**Wall demo TBD (as soon as we get on site) This cost does not include wall.<br>
<br>
COST: $3,532'),
  (4197604, 11, NULL),
  (4197633, 4, 'Paving Stone<br>
<br>
1. Install 3 inches of class II road base for pavers in driveway and pathway areas.<br>
2. Install one inch of screeded sand bed.<br>
3. Install approx.1466 SF of Angelus Holland in Cream, Brown, Charcoal TUMBLED.<br>
4. Compact Pavers.<br>
5. At borders dig trenches and pour concrete bond beams.<br>
6. Wet-lay pavers over borders.<br>
7. Install joint sand.<br>
8. Recompact pavers.<br>
9. Clean and water test.<br>
(Upgrade option - add polymeric sand in joints instead of regular sand $1,800)<br>
<br>
COST: $16,525'),
  (4205771, 1, NULL),
  (4205791, 2, NULL),
  (4205833, 3, 'Picture build will take over the installation of the pool coping which is $6,200. <br>
<br>
Water works will remove this from their contract at the exact same price.  So the pool contract will be $6,200 less. <br>
<br>
We will be doing Bellecrete precast with grouted joints. '),
  (4209010, 1, NULL),
  (4209075, 2, NULL),
  (4210010, 1, NULL),
  (4210224, 1905558, NULL),
  (4210356, 1913415, NULL),
  (4210820, 5, 'Parking permit for 2 cars 
10 days '),
  (4211331, 27, NULL),
  (4212425, 5, '1) Add Masonry curb to hide footing on south side of property -  Need to chip and form and pour in place. <br>
$2250<br>
<br>
2) Add 3 (5) foot concrete steps for south side of property with new layout - <br>
$975<br>
<br>
3) Add 3 steps for north side of property new location. - <br>
$0 No Charge.  Included in existing contract<br>
<br>
4) Need to add new 19 foot Block wall on fence line of north side of property in order to retain new concrete steps at higher elevation to cover the metal flashing and footing per request. <br>
<br>
Includes demo of existing fencing and haul. <br>
Includes demo of large existing footing on property line  that has to come out anyway for tile elevation Footing on property line wall to be 12 x 12<br>
$3900<br>
<br>
5) Backyard reduced timber wall by one course with new grade requirements.  <br>
($2200) Credit<br>
<br>
6) Retier backyard wall per request.  Haul waste $800<br>
<br>
 '),
  (4214144, 17, 'As per Melinda, we used up 2 truckloads of hauling for front yard grading.  Lots of roots and stumps, etc.  

Only included in Lawn area was fine grading, so this is additional. I checked grade today and looks amazing. We needed to take it out and lower area nearest tree. '),
  (4214160, 6, 'Not using a tumbled paver $1/SF credit for 1,466 SF'),
  (4214215, 7, 'Polymeric sand for in-between pavers in driveway and pathway.'),
  (4214808, 1, 'Not doing smart timer, using their existing rainbird with 12 zones'),
  (4214836, 2, '240 SF of Marathon 1
Includes demo
Irrigation is already covered.'),
  (4218942, 8, NULL),
  (4219139, 2, 'Removing existing concrete walkway<br>
Adding (10) 2x2 concrete steppers '),
  (4219143, 3, NULL),
  (4219200, 8, '2 cars @ 10 days @ $3/day + $3.50 convenience fee = $63.50'),
  (4221127, 9, '100 SF of stucco
Building out wall to approx 8 1/2" nearest gate
Includes color'),
  (4222384, 2, '$14.00 A sf 14 additional sf  = $196.00. '),
  (4222655, 10, 'Add 20 LF of new black tubing for existing and future plants nearest A/C unit. 

Make sure water is irrigating to that area.

Might add plants at a later date.'),
  (4222676, 6, 'We did the wiring but did not add a new switch. '),
  (4222755, 3, 'Entire property needs new drainage approx 200LF of 3" SDR pipe.
Includes trenching, 6 grates, and all labor.

Tie in all gutters into new drainage.
Drainage will go out to curb.
One inlet in grass zone.

Victor reviewed with client that old drainage was clogged and damaged. '),
  (4222854, 4, NULL),
  (4223134, 18, 'Stucco the entire wall and top of wall along driveway and patch the end of wall where it is currently not finished. Approx. 100 SF of wall to be stucco. 

COLOR tbd by client. '),
  (4227159, 5, 'Del Rio'),
  (4227163, 6, NULL),
  (4227351, 7, '(2) 5 gallon staked pale pink roses <br>
(1) 5 gallon Buddleja (purple)<br>
(1) 5 gallon Salvia Apiana'),
  (4227688, 3, NULL),
  (4229068, 14, NULL),
  (4230110, 1, NULL),
  (4230135, 2, NULL),
  (4231279, 7, NULL),
  (4232940, 1, '(22) path and spread lights for front and behind studio<br>
(1) uplight front tree<br>
(1) uplight lemon tree in back<br>
(4) uplights for along front fence<br>
(2) down lights for front tree'),
  (4234817, 1, NULL),
  (4237684, 1, 'As per our discussion during the job walk
Remove shrubs around light pole
Remove shrubs to the left of mailbox '),
  (4237749, 2, NULL),
  (4237772, 3, '22 linear feet'),
  (4238057, 4, 'Removal of Birch tree (does not include removing ALL the roots)
Includes stump grinding'),
  (4238220, 5, '96 LF of Marathon sod added to front lawn grass area (Nearest neighbor)'),
  (4238238, 6, 'Adding 23 SF of paver near birch tree (removal). 

Cost value: $239
Gift to Nate and Kate per Nicole'),
  (4238609, 7, '11’ x 8” of concrete pour in gap in driveways.
6’ x 6” of spec mix applied to existing CMU non-retaining wall.
Includes labor.'),
  (4238888, 8, NULL),
  (4238961, 1, '5 man hours x $75.00= $375.00<br>$140.00. Materials. <br>total. $515.00<br> '),
  (4238972, 2, '26 linear feet of line. 1 GFI  outlet'),
  (4238982, 3, NULL),
  (4240870, 3, 'Credit for install, Craig Kengla will be installing the pergola'),
  (4241145, 3, NULL),
  (4245617, 4, '10 linear feet&nbsp;'),
  (4245623, 5, '20sqft&nbsp;'),
  (4245708, 9, 'Pick up tile and delivery at cost.'),
  (4245749, 10, 'We are filling in 7’ x 7” wide of step.

This is so the step will be a full tile and not cut. The esthetic will be more pleasing.'),
  (4250507, 1, NULL),
  (4251580, 1, NULL),
  (4252664, 2, 'Please see attached list:<br>
Red are plants that we didn''t install<br>
Black are plants that we did install<br>
Green are plants that we are adding<br>
<br>
Total credit:  -$454.50'),
  (4255257, 11, 'Adding (1) Mandeville (white) vine to planting plan to climb up post and onto trellis that is above the new tile area. Place in corner. '),
  (4255722, 11, 'Stucco repair to side of home nearest planter/gate. $300
Tile installation to bottom of front patio step (5-6 pieces, client purchased direct) $50'),
  (4256025, 1, NULL),
  (4259070, 1, 'Adding approx 5.5 yards of import 50/50 soil to grass area.  
I had 3.5 yards in contract for $300 and production informed me we will need 9yards total to cover at 3” depth.  This will allow the seed area to have best potential for growth. '),
  (4259524, 4, NULL),
  (4260434, 4, 'Victor and I had to make a concession in the additional Sf&nbsp; that was mismeasured.&nbsp;'),
  (4260613, 1, 'Gas line taken from the stub up on the house 26 Linear feet to the fire pit.&nbsp; &nbsp;Permit separate change'),
  (4260614, 2, '35 additional square feet of pavers, X $13.25&nbsp; backyard paver price'),
  (4260626, 3, 'Total linear Feet of electrical line 150 LF<br>
2 outlets already included<br>
40 Lineaer Feet included in the contract<br>
Additional 110 of electrcial line needed.  Use of the outdoor electrical boxes have not had enough wattage to support the power equipment of the paver crew on site.  This is a clue that the outlets do not have enough wattage to support 2 new outlets.  The electrical will now have to come from the box. <br>
We are reducing the per linear foot cost because it is over 100 Linear feet to $19.00 a Linear foot<br>
110 Linear Feet X  $18.00= $1,980.00'),
  (4261865, 4, 'Electrical permit $98.10<br>
Gas/plumbing $64.95<br>
Total: $163.05'),
  (4263621, 5, 'Need to remove a 5x5 area of pavers add about 5 LF. Of drainage with black drain grate
Backfill and compact install pavers add sand and compact pavers.'),
  (4263821, 2, NULL),
  (4263970, 3, '<br>
(6) 5 gallon Hydrangea macrophylla <br>
(18) 1 gallons of Lamb''s ear, Santolina, Sedum<br>
 '),
  (4264155, 9, NULL),
  (4264665, 12, 'This is apart of the total stucco price. Nicole made a mistake in calculation of how much would it actually be from photos alone.  The work is more.'),
  (4264795, 2, 'We are NOT ordering (2) French Grey stepstone steppers 18 x 36”.

Laura has purchased her own 2x2’s.'),
  (4266477, 2127177, NULL),
  (4268604, 13, 'Thank you for giving us the chance to work on your project.'),
  (4268988, 6, '<p>Irrigation<br>
1) Add one subterranean drip system with flush and backflow connections per plan<br>
2) Change out timer to plan specific Hunter controller with sun sensor system.<br>
3) Extend additional drip zones to stub ups by the footing ledge in back of the house.<br>
<br>
Planting<br>
1) 36 inch Querces Lobata - Pick up and deliver from Riverside<br>
2) 36 inch Cercus Occidentalis - Still need to source.   Boething''s  are not good.<br>
3) 15 gallon Meyer Lemon<br>
4) (5) 15 gallon Conch Ceonthus<br>
5) (9) 15 gallon Carpenteria  Californica<br>
6) (3) 15 gallon Ceanothus Griseus<br>
7) (9) 15 gallon Polystichum Muntum<br>
8) (2) 5 gallon Dwarf Coyote Bush<br>
9) (3) 5 gallon Salvia Apiana<br>
10) (6) 5 gallon Salvia Clevelandii<br>
11) (6) 5 gallon Albutinon Palmeri<br>
12) (11) 5 gallon Eriogonum Fasciculatum<br>
13) (11) 5 gallon Salvia Mellifera<br>
14) (33) 1 gallon Chalk Dudleya<br>
15) (11) 1 gallon Muhlenbergia Rigens<br>
16) (18) 1 gallon Epilobium Canum<br>
17) (8) 1 gallon Eschscholzia Californica<br>
18) (6) 1 gallon Penstemon Centranthifolius<br>
19) (10) 1 gallon Heuchera Maxima<br>
20) 2 flats Satureja Douglasii<br>
<br>
Crane Rental <br>
Rent medium crane to handle up to 1500 lbs.<br>
<br>
Soil Preparation<br>
Hand till down to 6 inches all soils on property.  Requires a full crew almost 2 days.<br>
Introduce the following soils amendments<br>
Potassium sulfate (0-0-50) – 6 pounds for Frontyard, 8 pounds for Backyard<br>
Agricultural gypsum - 20 pounds for Frontyard, 30 pounds for Backyard<br>
Organic soil amendment - about 4 cubic yards, sufficient for 4% to 6% soil<br>
organic matter on a dry weight basis<br>
(Note Organic soil amendments with the exact specifications as noted in report may be difficult to acquire)<br>
<br>
Subtotal -  $24600<br>
<br>
Less $800 credit from Picture Build sharing cost as we will be using the Crane while it is there.<br>
<br>
Total Change Order  $23,800<br>
<br>
<br>
<br>
<br>
<br>
<br>
 </p>
'),
  (4269009, 19, 'In contract we have 2,707 SF and the measurements are 2,780 SF for St. Augustine sod.

This is because you minimized the cantilever steps which added 64 SF of grass. 
The additional 9 SF are from plans not being exact, which is typical in our industry.
'),
  (4269786, 1, ' 238 courtyard, and 170 entry  

2.  408 total

on page 3 the total was 238 X $14.00= $3,332.00

I mistakenly didn''t add in the 170 pavers for the entry.

The correct total is $5,712.00  

The difference that we need to add is $2.380.00.


'),
  (4271781, 1, 'Removal of 10  extra yards of soil '),
  (4272460, 10, NULL),
  (4272799, 1, '$200 for the material upgrade<br>
$140 for additional gravel (hugging the steppers on both sides of pathway)'),
  (4272802, 2, '40 linear feet of edging'),
  (4274064, 12, 'We could not re-use the old bender-board, as it was not in great shape.

200 LF of brown 6” x 1” plastic bender-board.'),
  (4274324, 4, NULL),
  (4274335, 5, '450sqft includes demo (removal of gravel, soils)'),
  (4275934, 20, '(2) 15g Pittosporum silver sheen'),
  (4275965, 4, 'Permit fees <br>
See attached'),
  (4278500, 1, 'Decided no bender board at all on this project.'),
  (4279834, 13, '1g instead of 5g credit'),
  (4280219, 6, '(3) Large Podocarpus <br>
(1) Acacia Tree'),
  (4280381, 5, NULL),
  (4280382, 6, NULL),
  (4280517, 4, '1- 42 LF bend a board to separate DG from planters on side yard (pool equipment area)<br>
2- 35 LF of sewer line for outdoor kitchen sink <br>
3- Form for step up on walk way at gate 3.5 LF.<br>
4- 185 sq. Feet of DG on side yard (pool equipment area). Stablized with base.<br>
5- Add grading to raise area for putting green and sewer access. 385 sq feet x 3 inches.<br>
<br>
Added putting green in separate change order.'),
  (4280964, 2, NULL),
  (4282139, 5, '240 Square Feet X $14.00 pavers + .65 cents for Belgard Catalina Grana = $14.65 = $3,516.00'),
  (4282155, 6, 'This includes 120 Linear feet of drainage 3" and up to 6 drain caps and 1 pop up exit  120 lf X $23.00'),
  (4282569, 5, '28 x $13.25= $371.00'),
  (4283314, 2, '65lf x $25.00= $1,625.00'),
  (4284554, 7, 'Stucco Exterior Walls<br>
<br>
Left side property wall (when facing house) <br>
Very Rear property wall <br>
<br>
Sand Finish Stucco - Paint Ready or Color coat'),
  (4284590, 7, NULL),
  (4284612, 8, 'Adding 28 linear feet. One outlet additional. For all lines to outdoor kitchen and fountain. '),
  (4284620, 9, 'From meter to outdoor kitchen to firepit. '),
  (4284648, 10, 'To outdoor kitchen and spigot next to it. 24 lf.&nbsp;'),
  (4284913, 6, 'Demo 8 ld of cap. Install 8 lf of new slump stone wall and new cap. Includes all dump and delivery $60.00 @lf X 8 lf= $480.00'),
  (4288692, 21, '<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif">I am submitting a change order. Please approve online.</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif">Here are some changes we made at the job site for planting. We are returning some and we got some extra plants. You are getting a credit back, so it is not an extra charge. Please approve online.</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><b><span style="color: #0070c0">4 Extra 1 gallon coralbells.</span></b> This was the nurseries mistake, but we found some place for them in the front planter, and it looks nice. <b><span style="color: #0070c0">$86</span></b></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><b><span style="color: #0070c0">2 Extra 1 gallon Sedum Dragon’s Blood</span></b>. This was supposed to be canceled but it was not, so they delivered these by mistake. But again, we found room for them in the front planter. <b><span style="color: #0070c0">$43</span></b></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><b><span style="color: #0070c0">1 Extra 5 gallon upright rosemary.</span></b> This was also not supposed to be shipped but they sent it and we found room for it in front of Amy’s office window. <b><span style="color: #0070c0">$43</span></b></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><b><span style="color: #0070c0">1 more 5 gallon Mauri Chief.</span></b> We added one more to make the spacing even on top of the wall. <b><span style="color: #0070c0">$43</span></b></span></span></span><br>
<br>
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><b><span style="color: #c00000">Returning 24 one gallon “Reullia Brittoniana Pink Katie”</span></b> – Carter talked to the nursery, and they will accept the return. They sent us 5 gallons instead of one gallon. Amy and Isaac do not like the way these plants look so we will try to return them. <b><span style="color: #c00000">- $480</span></b></span></span></span><br>
<br>
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><b><span style="color: #c00000">$480</span></b> - <b><span style="color: #0070c0">$215</span></b> = <b><span style="color: #7030a0">$265 Credit</span></b></span></span></span><br>
<br>
 '),
  (4288860, 3, 'Taking out plants. He plans to buy himself. '),
  (4288894, 9, '24" box swan hill olive tagged at paramount.  They brought it to the front. Pink tag. This is to replace a 15 gal that didn''t survive. $360.00- $100.00 credit= $260.00. '),
  (4289391, 22, NULL),
  (4291985, 14, NULL),
  (4292509, 23, '<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><b><span style="background: yellow">Mulch 923</span></b> sf (<b><span style="color: red">237 sf more</span></b> than what was quoted on contract)</span></span></span>
<div style="border-bottom: solid windowtext 1.0pt; padding: 0in 0in 1.0pt 0in"><span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif">Need to get approval of a change order for <b><span style="color: red">$568.80</span></b> to install.</span></span></span></div>
'),
  (4293389, 25, NULL),
  (4296101, 9, NULL),
  (4303331, 1, NULL),
  (4305875, 9, 'Add one on other side of steps to match.'),
  (4308092, 6, NULL),
  (4309150, 4, NULL),
  (4309348, 26, 'Credit for Buffalo Grass plugs 55 SF

We did not acquire and did not install.'),
  (4311273, 24, NULL),
  (4311281, 25, NULL),
  (4314524, 11, NULL),
  (4314554, 12, 'See detail<br>
trench 1'' X 2'' X 4''=  8 square feet<br>
3'' X3" perforated pipe in sleeve<br>
set in gravel, to be covered with geotextile fabric and Del Rio at planter level<br>
6 hours plus materials '),
  (4315051, 3, NULL),
  (4316661, 7, NULL),
  (4317707, 2, 'We are ordering all plants (except Japanese Maple Tree) from FK Nursery.
This is a premium nursery that is a bit higher per plant, but has superior quality.

'),
  (4317996, 8, '(1) Blood Orange
(1) Grapefruit'),
  (4317998, 9, NULL),
  (4321407, 4, NULL),
  (4321781, 2, NULL),
  (4326920, 13, '28 sf x $14.65=  $410.20<br>
Any additional pavers will be in final count'),
  (4326926, 14, '8 lf of step build x $60.00= $480.00'),
  (4330166, 3, 'Credit for Mimulus Monkeyflower
We could only get a 1g and a 5g was in your contract, this is the cost difference.'),
  (4330380, 15, NULL),
  (4331680, 15, 'Steps Total:<br>
3 Linear feet by side gate<br>
5 Linear feet by side of house by A/C ( it is actually 5.5''<br>
8 Added for side of raised back existing patio<br>
6'' additional step Change order for 1 additional step <br>
<br>
Total: for change order 6'),
  (4331693, 16, 'Had 9 steppers at $100.00 each, with $50.00 rocks taken out.<br>
They are being replaced with more pavers and grass.<br>
Final count for pavers afater completion of pavers<br>
Final count for grass at Landscape first day walkthrough'),
  (4331699, 17, '9 linear feet of drainage please see plan in current design folder under 21-10-20 Changes <br>
BEhind outdoor kitchen<br>
9 X $23.00= $207.00'),
  (4331837, 7, NULL),
  (4333676, 4, 'Adding 1 spray zone to grass area in backyard.'),
  (4333714, 5, 'Core thru wall $200
7 LF of sleeve for irrigation wire. $150'),
  (4333721, 6, 'Add shut off valve'),
  (4333810, 7, 'Adding 105 SF of Marathon II'),
  (4334889, 3, '2 1/2 inch not available anywhere.  We barely were able to find 3", so had to upgrade to that. <br>
<br>
190 linear feet of 3 inch line <br>
and<br>
45 linear feet of 1 1/2 line'),
  (4335450, 3, '53 LF of 1” copper main water line.  Include labor and trenching 18” below grade per code.
Includes backfill.'),
  (4335456, 1, 'Need a permit from the city of Pasadena to replace an existing retaining wall with a new one that is not leaning. 

This is the allowance, once we have obtained the permit, we will let you know the permit fee, and the admin hours that it took to obtain the permit.'),
  (4337190, 27, NULL),
  (4337605, 4, '53 LF of 1" main water line, includes trenching, backfill and labor.'),
  (4337828, 3, NULL),
  (4337841, 4, 'Replaced (1) valve that was leaking and had been chewed through by rodents '),
  (4337980, 8, 'One additional uplight'),
  (4338213, 9, NULL),
  (4338500, 5, NULL),
  (4338969, 8, 'Ball valve update'),
  (4343689, 7, NULL),
  (4344061, 1, NULL),
  (4346034, 1, '1) We are going to move a shed<br>
2) We are digging trenches for small retaining wall under the backyard fence.<br>
3) We are building a small retaining wall out of block in that section. <br>
4) We are then repairing a small sinking section of paver<br>
5) Then we are forming and putting in rebar for the concrete.<br>
6) We re pouring the concrete.'),
  (4347249, 18, '2 step lights. Lightcraft. Masonry light 13. $240.00 each. $480.00 total.&nbsp;'),
  (4347840, 19, 'One additional lightcraft masonry light 13. '),
  (4350917, 9, '180 SF of Del Rio Gravel 1" minus at 3" of depth
Includes weed barrier, delivery and labor.'),
  (4350926, 10, '276 SF of Supreme mulch at 3" depth in all backyard beds

Includes labor and delivery.'),
  (4350943, 11, '276 SF of Del Rio 1" minus at 3" depth in all backyard beds

Includes weed barrier, labor and delivery.'),
  (4351070, 12, '1 hour plant placement w Nicole'),
  (4354349, 4, '1) Add Brilliant Wonders Glow Bubblers to water feature. Run 320 linear feet of additional piping for each bubbler to the back as the client did not want a manifold in front.  Includes ball valve for each bubbler to control water flow.  Does not include automated control system for individual bubbler settings per request. Run separate electrical lines back to control station added 320 linear feet.<br>
<br>
2 guys one day to expand trench size (from original contracted trench).  2 guys one day to run all the piping.  1 guy one day to connect all electrical and valve controls at termination. 2 guys 1/2 day to backfill the extra portion of trench and compact.<br>
6 added man days $3300 labor.  $850 materials for piping.   $4200 total for that.<br>
Light costs are $600 per bubbler plus $90 per bubbler installation in feature.  Total of $2760 for bubblers.  (did not upcharge on expensive lights as courtesy to client)<br>
Total $6,910<br>
<br>
3) Run separate water line back to pump area for each Lion Head as the client did not want a manifold in front.  Install separate ball valve flow control per lion head per request.  Total 300 linear feet of plumbing for that. <br>
<br>
One man day to run all water line back to pump area. 1/2 man day for added 8 inches of trenching and backfill. . Connect up lion head to future auto control system per client request. <br>
1 1/2 added man days $900. $350 for material $1250<br>
 '),
  (4354686, 2, '27 Linear feet&nbsp; of GAS line'),
  (4354697, 3, '198 SF of Pavers X $13,40= $2,653.20'),
  (4354707, 4, '26 addtional Linear feet + various heights'),
  (4358879, 6, NULL),
  (4360246, 1, 'Changing the concrete pad of 156, to pavers&nbsp; $20.50- $17.65= $2.85 Difference X 156=&nbsp; $444.60 Credit&nbsp;&nbsp;'),
  (4360286, 1, NULL),
  (4362752, 2, NULL),
  (4363109, 1, NULL),
  (4364339, 1, 'Credit for 20 sf of grass. $70.00. $17.00 charge for plant change. Total credit $53.00'),
  (4364617, 2, NULL),
  (4364618, 3, NULL),
  (4364620, 4, 'Add''l 65 Linear Feet'),
  (4364621, 5, NULL),
  (4365537, 1, NULL),
  (4369640, 8, 'Add 5 yards of Brown Mulching to Project - Deliver and haul to back and front slopes  $1400<br>
<br>
Change out irrigation from drip systems (per initial layout prior to irrigation plan) to sprays.  $900'),
  (4370133, 5, 'Contract included 165 feet of 3" SDR. Drains were upgraded to 4"  <br>
Plus<br>
324 linear feet were installed. Add 159 linear feet installed<br>
Plus<br>
Earlier change order included 35 linear feet of sewer line.   Installed 81 ln feet.<br>
Plus<br>
Drain to Curb so curb cut out and patch<br>
<br>
Difference in cost.<br>
$6,450<br>
 '),
  (4371604, 9, 'Install 19 Corona Lights per last request.  (see attached sheets for lighting choices)<br>
<br>
Install 1 Corona transformer'),
  (4376929, 2, '6'' of bass added in the area of the spa, 156 SF  $1.00 per inch X 6"=$6.00 X 156 SF= $936.00'),
  (4376944, 3, 'Cannot drill through the alley wall, for the drain pipe, instead Marcelino will create small weep joints in the grouted area just as the building code requires.  Will not be drilling through blcok, because of possible rebar.<br>
Cost $330.00  original  $560.00= credit of $230.00'),
  (4376959, 4, '2 steps for the back door:<br>
1st step top landing 3'' out X 8'' long<br>
2nd step 18" out, to use 12" bullnose and 6" of field<br>
Riser is the Holland, border in Holland, as we will have planty left of the pallet.<br>
Will only need 16 square feet of the Aqualina in Rio<br>
Need to order 30 LF of Belgard Rio Bullnose<br>
 '),
  (4376971, 5, 'Olive tree, 24" box multi truck, non-fruiting<br>
take out approximately 50 sf of grass to plant it '),
  (4380281, 6, NULL),
  (4380288, 7, 'roughly 60 1 gallon baskets<br>
roughly 18 5 gallon baskets<br>
4 15 gallon baskets'),
  (4381533, 20, 'The Del Rio in the parkway is approved 
I have the measurements for Del Rio. 11x16. 176 sf x 5=  $880.00. You are still getting a Del Rio credit when we measure it out the areas that we expanded with pavers. We will measure those areas for the reduced amount.'),
  (4383860, 1, 'Water proofing 2 coats of Henry''s tar<br>
8" down<br>
53 Linear Feet<br>
X $25.00'),
  (4383880, 2, 'Drainage line already in line with new drains<br>
New:<br>
3 connecting downspouts X $125.00= $375.00<br>
3 new drain caps X $50.00= $150.00<br>
Total:  $525.00'),
  (4384218, 1, NULL),
  (4385602, 21, 'Additional linear feet of drainage directed to Marcelino 12 lf X $22.00= $264.00.&nbsp;'),
  (4388469, 1, NULL),
  (4389014, 2, 'The flagstone was not installed in concrete footings. Credit of $20.00 per flagstone x 23 flagstone. $460.00. '),
  (4389055, 3, 'Credit for 4 5 gallon plants. '),
  (4389224, 5, 'Drip zone for planters. '),
  (4389452, 26, NULL),
  (4389687, 6, NULL),
  (4391583, 1, NULL),
  (4392934, 3, NULL),
  (4395693, 1, 'Raise curb wall up to 24 inch retaining wall for roughly 40 linear feet<br>
Regrade areas next to curb wall flat<br>
No Charge<br>
<br>
Add back in from earlier bid, Backyard Steps and Step Wall. Includes stucco coat and waterproofing<br>
$5,350<br>
<br>
Add back in from earlier bid, Walls around Tree.  Includes stucco coat and waterproofing<br>
$5,650'),
  (4396015, 4, NULL),
  (4396703, 2, 'Remove  18 foot Tree and Root System.<br>
$1300<br>
<br>
Remove Small Tree<br>
No Charge'),
  (4396895, 2, NULL),
  (4400220, 6, '4 feet x 70 linear feet gopher mesh. 18" under railing. With 30" above the railing  attached with wire. Use 1/4 inch wire mesh with black coating. Set with concrete at bottom.  Priced at $15.00 a linear foot. $1,050.00'),
  (4400271, 3, 'Design credit. '),
  (4400282, 5, NULL),
  (4400348, 7, NULL),
  (4400351, 10, NULL),
  (4400440, 1, NULL),
  (4400447, 1, NULL),
  (4400455, 1, NULL),
  (4400458, 4, NULL),
  (4400771, 2, NULL),
  (4400795, 1, 'Upgrading pavers to Mirage Quartzii Waterfall pavers<br>
Upgrading bullnose to Unico<br>
Upgrading wall cap to Prime Silver Travertine<br>
Stacked stone/veneer will be East West Natural Icicle Grey'),
  (4401258, 20, 'Approx 23'' of Rustic Wall in Tuscan with a height ranging from 8"-16". Wood dividers to remain to retain soil. (Understood they may get damaged during construction) 

See attached contract addendum with photos.

Any work outside of this addendum will be an additional change order.'),
  (4404169, 3, NULL),
  (4404939, 1, NULL),
  (4406057, 2, '12 Additional Linear Feet of Wall Rustic wall Tuscan @ $129.00 a SF'),
  (4406060, 2, 'This includes sand finish on: front steps, larger step pads leading to front door and around to west side, the front porch concrete, the 2''x2'' step pads into the backyard and the backyard patio.'),
  (4406062, 3, '63 Linear Feet of Conduit and wiring  X $23.00<br>
This is to go under grass, and DG to baack of shed'),
  (4406069, 4, '1 transformer<br>
1 more ledger light'),
  (4406109, 3, 'This change order is for the caps on top of the wall on the steps leading onto the front porch.'),
  (4406129, 4, '61 square feet of decomposed granite is needed for placement in between step pads in front yard. Bender board is included in original bid.'),
  (4406166, 5, 'This change order is for the removal of the existing pad with slate (6.5''x10'') and concrete ''path'' (2''x22'') underneath edge of pad near the playroom. Replacement with a new 2''x10'' concrete step with sand finish in front of french doors.'),
  (4406273, 6, 'Remove existing 46 square feet of concrete pad with slate veneer near kitchen french doors. Replace with ''L'' shaped step at total of 35 square feet with sand finish. Add additional 11 square feet of concrete with sand finish to patio.'),
  (4406307, 7, NULL),
  (4406342, 8, NULL),
  (4406356, 9, 'This change order includes: removal of 321 cubic feet of soil 3'' back from sidewalk to retaining wall, 60 linear foot 8"x8"x16" CMU retaining wall with 1''x3'' footings (linear foot includes two 3'' returns on ends by neighbors properties) waterproofing of the retaining wall and stucco finish (Color TBD by client).'),
  (4406357, 10, '8"x8"x16" CMU block, 1''x3'' footings with stucco finish'),
  (4406383, 11, 'Waterproofing for 113 linear feet of retaining wall in backyard. This includes the bbq area and the wall by the synthetic turf area.'),
  (4407604, 22, 'Sand and seal counter top. '),
  (4407869, 4, NULL),
  (4407950, 5, '40 linear feet&nbsp;'),
  (4408944, 6, 'Office hours for permit pulling are billed at $120/hr. 

If we are pulling permits it is $120/hr plus cost of permit (which we will share with you).  This is typically set as an allocation, but in this case, Mohammed spent only one hour working on your permit.  

If we need to pull the Apron permit with our C-27, it will be a separate change order for an allocation amount.'),
  (4409573, 12, 'This change order is for the option of replacing the current quoted sod in front yard with synthetic turf. If replacing with synthetic turf, 2 spray zones will be credited (-$1,770) and sod pricing will be credited (-$3,633).'),
  (4410651, 13, 'Removal of bougainvillea in backyard in corner near garage. '),
  (4412504, 2, 'Engineering with Oscar for retaining wall as required by City of Pasadena.

Once engineering is completed, we will submit to city for final approval.'),
  (4412516, 14, 'Removal of pilaster with light near stairs by the garage'),
  (4414318, 6, NULL),
  (4414361, 6, NULL),
  (4414379, 7, NULL),
  (4416558, 10, 'Trash can wall in contract included block wall and standard footing.  ($1850 Credit)<br>
<br>
Wall now engineered with friction piles, bond beams nad fencing anchors at 14 foot length.<br>
<br>
Wall is 14 ft by 5 1/2 ft tall.  Poured in place concrete.  Will use tie and plate construction.  (see example from one of our other jobs) <br>
<br>
<img alt="Image 208" src="https://buildertrend.net/HttpHandlers/GetFile.ashx?f=fYLFcWYHErlJ3uxf5n4tCQ-svg_mxn8H8LJd6Ogzt2hQ45QjMdPlCg&fl=1&ia=0&fn=20200630_155113.jpg&e=.jpg"><br>
<br>
Friction piles to be heavy equipment drilled to 12 foot depth  includes 10 foot of pile and 2 foot of footing.<br>
<img alt="Image 489" src="https://buildertrend.net/HttpHandlers/GetFile.ashx?f=fYLFcWYHErn3izAoQw1xcv3jWVGyU_q0_84H5K58RBFQ45QjMdPlCg&fl=1&ia=0&fn=20210215_125243.jpg&e=.jpg"><br>
<br>
Dig rest of bond beam footing 2 foot x 2 foot and tie to friction piles.<br>
<br>
Install fencing anchors.<br>
<br>
Stucco coat. <br>
<br>
Water proofing and wall drainage by other. <br>
<br>
Includes inspection meetings.<br>
<br>
 '),
  (4418344, 15, 'Change order is for 13 linear feet of CMU block wall 4"x8"x16" to repair foundation for fireplace. Also includes moving the mainline for water, so that it is not in the way of the block wall.'),
  (4418646, 2, '8"x8" block column for porch. CMU. TO BE STUCCO that matches the pilasters. Color to be selected with verva'),
  (4418650, 3, NULL),
  (4419369, 8, 'Assemble and soil'),
  (4420187, 16, 'Install 26 linear feet of 4" drainage pipe.'),
  (4420554, 23, '6 less linear feet x $60.00. $360.00 credit'),
  (4420713, 24, '$14.65 x 33 sf'),
  (4420742, 8, 'Extend wall 10 linear feet 
Add 40-50sqft concrete behind pool wall
Remove excess soil and haul'),
  (4420758, 4, NULL),
  (4420923, 25, '32 more linear feet'),
  (4420986, 26, '256 sf less x $3.75= $960.00'),
  (4421065, 27, '13 lf of bender board. '),
  (4421143, 28, 'Using own controller'),
  (4422023, 6, 'ccredit for plant not installed and plant install only balance<br>
TOTAL PLANT CREDIT FROM CONTRACT IS $323.00, $174.00 ALREADY GIVEN<br>
<br>
In contract:<br>
30  1 gallon<br>
58  5 gallon<br>
1    15 gallon<br>
<br>
<b>Actual:</b><br>
<b>#1  7     5 gallon</b><br>
<b>#2  7     5 gallon</b><br>
<b>#3  6     5 gallon</b><br>
<b>#4  6     1 gallon</b><br>
<b>#6  14   5 gallon</b><br>
<b>#7  -0-   5 gallon    3  1 gallon @ Install only X $10.00</b><br>
<b>#8  2     1 gallon</b><br>
<b>#9  9     5 gallon</b><br>
<b>#10 2    1 gallon</b><br>
<b>#11 -0-  5 gallon</b><br>
<b>#12  8   1 gallon</b><br>
<b>#13  1   5 gallon</b><br>
<b>#14  5   5 gallon</b><br>
<b>#15  -0- 5 gallon   1  5 gallon @ Install only X $21.00</b><br>
<b>#16  1   15 gallon</b><br>
<b># 17 -0- 5 gallon</b><br>
<b>#19  4  1 gallon  </b><br>
<b>#20  4   5 gallon</b><br>
<b>#21  1   1 gallon</b><br>
<b>#22  4   1 gallon</b><br>
<b>#23  3  1 gallon</b><br>
<br>
<b>Additional  Install only 1 5 gallon in front of entry  $21.00</b><br>
<br>
<b>Total Delivered:</b><br>
<b>1 gallon  30  X $21.50=  $645.00</b><br>
<b>5 gallon   53  X $43.50=  $2,305.50</b><br>
<b>1 15 gallon  X $175.00</b><br>
<br>
<b>Install only  3 1 gallon  $30.00 + 2 5 gallon $40.00=  $70.00</b><br>
<b>TOTAL INSTALLED: $3,195.50</b><br>
<b>TOTAL IN CONTRACT: $3,518.00</b><br>
<b>CHANGE ORDER CREDIT:  $323.00  ( $174.00 already given) <br>
<br>
Balance $149.00</b><br>
<br>
<b>I will put in the change order as approved, as we went through this list together.</b><br>
<br>
<b>Thank you Gail, it is a pleasure to assist you!</b>'),
  (4422032, 3, 'Paver contract  price 344 sf  $5,418.00  (mistake in math of $100.00, should have been $5,314.80)<br>
<br>
Actual installed 290 sf X $15.45= $4,480.50<br>
Difference $903.40'),
  (4422037, 4, 'Waterproofing was supposed to be 1 coat Henry''s Tar, and 1 coat bichathene<br>
53 linear feet with 12"-18" deep<br>
The footings were exposed and the crew could only apply 1-2 coats Henry''s tar, at only 5-6"<br>
Time taken was not for the amount charged<br>
 '),
  (4422049, 5, '60 linear feet added<br>
6 under pavers<br>
3 down spouts<br>
Amount in Change Order of 11/8  $525.00<br>
<br>
Total installed:  $1,518.00  - 525.00= $993.00 '),
  (4422169, 5, '20 linear feet of drainage with caps x $25.00=$450.00'),
  (4428217, 1, 'Additional plants <br>12 succulents<br>4 smaller creeping fog<br>  2 larger creeping fig <br>360<br> '),
  (4428271, 1, 'Additional plants a<br>2 gave tequilina<br>10 dichondria silver fall ground cover<br>1050<br><br>600 Sq ft of 6oz weed fabric <br>600 Sq ft of California gold 3/4 rock <br>1300<br><br>20 additional feet of Edging <br><br> '),
  (4429374, 1, 'This is for plants ordered from FK Nursery, our premium nursery.'),
  (4429850, 2, '1 (5g) peanut cactus
1 (5g) woolly cactus 

We could not source these, client will purchase and we will plant.  Credit is for material only.'),
  (4430752, 7, 'Here is the planting add on for the project:<br>
<br>
(1) 24” boxed Avocado Tree<br>
(2) 24” Australian Tree Ferns<br>
(5) 15g Plumeria ‘Aztec Gold’<br>
(4) 15g Musa Giant Dwarf<br>
(3) 15g Zamia pumila<br>
(12) 5g Torch Lily in yellow<br>
(6) 5g Yucca ‘Color Guard’<br>
(8) 5g Hebe varigata<br>
(6) 5g Philodendron ‘Xanadu’<br>
(5) 5g Angiozanthos either yellow or red<br>
(6) 5g Cordyline ‘Pink Passion’<br>
(4) 5g Musa ‘Zebrina’<br>
(21) 5g Ceanothus thrysiflorus var. repens<br>
(8) 5g Canna Lily ‘Fire Dragon’<br>
(6) 5g Canna Lily ‘Tropicana’<br>
(21) 1g Salvia farinacea<br>
(20) 1g Clivia<br>
(18) 1g Asparagus Fern<br>
(11) 1g Asclepius tuberosa<br>
(27) 1g Gallardia<br>
(9) 1g Lantana ‘Hot Blooded’<br>
(9) 1g Rudbeckia (whatever variety you can find is fine)<br>
(21) 1g Limonium<br>
(22) 1g Sedum ‘Autumn Joy’<br>
$10,160<br>
<br>
We also need to add another zone of irrigation.<br>
$950<br>
<br>
Irrigation repair in front is no charge.<br>
$0'),
  (4430790, 6, 'Additional&nbsp; 405 Sf of grass RTF X $3.75= $1,518.75'),
  (4436133, 7, 'Credit for entire paver amount in contract - see contract addendum.  '),
  (4436134, 8, 'Credit for flagstone installation (material was purchased by client) '),
  (4436135, 9, 'All according to city code, 
Apron will be 9” x 9’ with two 2’9”-3’ wings.
“Sidewalk” is approx. 9’ x 3’6. Total LF from curb to end of city property is 12’6”

Cost includes all concrete labor, installation, scoring, forming and material.'),
  (4436138, 10, '15 LF of concrete curb at 3” $700
30 SF of asphalt $400 (includes demo of existing asphalt)'),
  (4436139, 11, '400 SF of pavers, they are on site already.
400 SF of polysand. 

Includes labor and material. '),
  (4436141, 3, 'Planting 2 (15g) cactus that are already on site in pots.'),
  (4440281, 4, 'Install and purchase one smart timer with 6 stations and outdoor box.
Connect all irrigation wires to box.
Show client how to use the WiFi smart timer.'),
  (4440292, 5, 'Raise up olive tree to appropriate grade level.  
No charge. '),
  (4440329, 6, '6 SF of concrete patch with top cast finish. 
Dig 6-7” below to get at least 4” of concrete pour.
2 men, half day
'),
  (4440562, 10, NULL),
  (4440677, 1, NULL),
  (4442852, 7, 'Jorge suggested the copper shield irrigation tubing for the drip line in the back yard.  
This is the cost difference between Netafim tubing and copper shield tubing. 

Please contact Jorge for any explanations needed!'),
  (4444204, 8, '(16) path lights<br>
(9)   up lights<br>
(1)  transformer'),
  (4444367, 9, 'Alleged damage to ac by our crews'),
  (4444466, 6, '52 Linear Feet of Bender Board for side of walkway'),
  (4444479, 7, '1)  Demo of existing concrete, was done by Paver crew<br>
2)  Insatll 3 slabs that are on the property in walkway area<br>
3)  Install 78 Sf of Del Rio 4" or less that is on property<br>
4)  Purchase 181 Sf of Del Rio 4" or less for rest of walkway, NO GEOTEXTILE FABRIC<br>
<br>
 '),
  (4444485, 8, 'Backfill and compact the electrical trench<br>
4 man hours X $75.00'),
  (4446186, 9, 'Add in Rachio Timer System.'),
  (4450397, 1, '5’ x 3’'),
  (4451242, 7, NULL),
  (4455845, 8, '7'' conduit<br>
35'' wire<br>
Box and gfi outlet'),
  (4458832, 9, 'Needed to import 70/30 soil for backyard as grass had thatched and was considerably high. Needed to build this up to grade. Have given a $200 discount as a gift from Nicole.'),
  (4459061, 9, NULL),
  (4459571, 2, 'Install weed barrier and Install 5 yards of gravel around 750 sq feet. <br>
<br>
Gravel to be 4 yards of California Gold 3/4 inch and 1 yard of California Gold 3/8ths. <br>
<br>
Client may add more. '),
  (4459581, 2, 'Install 2 yards of white 3/4 crushed gravel.  No weed barrier.<br>
<br>
To be done on the same day as Johanna Altman'),
  (4461014, 17, 'This change order is for changing the material in the backyard from Del Rio gravel to stabilized decomposed granite. Total of 1,219 square feet of material.'),
  (4463560, 1, 'Demolition of the work area. Prep area, amend soil and install plants. <br>
<br>
4 - 24 inch box Redpush Pistachio<br>
<br>
1 - 15 Gallon Rose of Sharon<br>
3 - 15 Gallon White Hibiscus<br>
<br>
51  -  5 Gallon Red Roses<br>
21  -  5 Gallon White Iceberg Roses<br>
14   - 5 Gallon Camellia Sasquancha  White or Red or Combination<br>
25  -  5 Gallon Red Azeleas<br>
<br>
<br>
72-   1 Gallon Myoporum White<br>
69 – 1 Gallon White Lantana<br>
14 – 1 Gallon Cranebill White or Red'),
  (4466577, 10, '153 additional sq feet of Veneer at $25 per sq foot.   - $3,825<br>
<br>
Discount given per Jorge for veneer $625.   Total  $3,200'),
  (4468757, 1, 'Adding timer for irrigation zones. Will be placed in garage for easy access to homeowner and electricity.'),
  (4469374, 10, 'Plants damaged during paver installation.&nbsp;'),
  (4469390, 2, 'In order to have the right amount of pressure for the valves for the irrigation zones, we need to connect to the mainline at the side of the house. We will be installing 80 linear feet of piping with all fittings to manifolds for irrigation.'),
  (4469409, 3, 'With the added pressure we are getting from the mainline, we do not need as many zones of irrigation for the plants. A credit will be given to your account.'),
  (4470012, 4, 'The stump in the front planter is bigger and deeper upon further inspection. The pricing is for renting the stump grinder, man-hours and other materials needed for full removal.'),
  (4470628, 3, 'Add sod back in to contract.&nbsp; 1305 sq feet of Valley RTF'),
  (4470634, 4, '<span style="font-size: 12pt"><span style="font-family: "><b><span style="font-size: 14.0pt">Irrigation</span></b></span></span><br>
 
<ol>
	<li><span style="font-size: 12pt"><span style="font-family: ">Install (1) new main line water shutoff valves</span></span></li>
	<li><span style="font-size: 12pt"><span style="font-family: ">Install (5) new brass superior auto anti-siphon valves backyard</span></span></li>
</ol>

<ol>
	<li><span style="font-size: 12pt"><span><span style="font-family: ">Install (2) new pressure regulator filters for planting zones.</span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: ">Install new ¾ inch PVC lateral lines.</span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: ">Install new ¼ tie in emitters for plants</span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: ">Install new spray for lawns with Toro/Rainbird nozzles</span></span></span></li>
	<li><span style="font-size: 12pt"><span><span style="font-family: ">Use existing controller</span></span></span></li>
</ol>
<span style="font-size: 12pt"><span><span style="font-family: ">Install Black 1/4 inch drip line later when plants are installed. </span></span></span>'),
  (4488542, 1, '(6) 15 gallon'),
  (4488589, 2, NULL),
  (4491866, 3, 'We can irrigate all plantings with 2 zones'),
  (4491890, 4, 'Will need to run an addtional 50 linear feet of pvc x 2 under driveway in order to irrigate/light bed to the left of drive<br>
Also need to run roughly 10 linear feet of sleeving for both irrigation/electric under walkway from manifold to small bed on the left side of front entryway'),
  (4491969, 5, 'Neighbor''s approved'),
  (4494716, 5, 'Contract states 35 tons of soils to be removed.  We had to remove over 90 tons -  3 and 1/2 super 10 semi dump loads. <br>
<br>
We will not charge for extra labor for removal. Just for pickup and demo dump fees. <br>
 <br>
Added demo soils dump fees is $2,600. <br>
 '),
  (4494723, 6, 'Cut and install turf strips. <br>
Includes base, hand compaction, dg underlayer, turf, seaming and nailing.<br>
$2,850.<br>
<br>
 '),
  (4494726, 7, 'Spray Top Cast on all concrete surfaces.&nbsp; &nbsp;Then powerwash and scrub.&nbsp;'),
  (4495751, 19, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">1. We had a gopher attack in the front yard. Now they have been caught but I need the DG to be repaired in about 6 spots.</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">2. When this is being done, I want too source and plant some new plants in the back:</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"> </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">                6 x Lavandula Thumbelina</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">                6 x Agapanthus Baby Pete</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"> </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Both in 5G if available, although they are small plants so maybe only 2G available. Can you source these plants?</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">3. Need 3 new Monkey Paw plants to replace ones that got cut back too far. I think that Daniel knows about this.</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">4. Need 3 scabiosa and 3 geranium St Ore (?) to fill in a few bald spots.</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">5. Generally check irrigation outlets.</span></span><br>
 '),
  (4496754, 1, 'Roughly 40 linear feet'),
  (4496758, 2, NULL),
  (4496763, 3, '(9) uplights plus (1) transformer '),
  (4497174, 3, 'Height of wall is  now 7’8”'),
  (4497190, 5, 'Separating DG from Gravel
45 linear feet '),
  (4497200, 6, '450sqft at 2”
In front of turf to top of wall'),
  (4497214, 7, 'Install 2” of DG Install 2” of Road Base Install 500 sf of existing turf with pet infill sand.'),
  (4497818, 6, NULL),
  (4500543, 12, 'After apron is installed we measured 451 SF of paver. 9'' at bottom and 11'' at gate. This is an additional 51 SF than we originally estimated.'),
  (4501540, 1, 'Adding 4 LF of CMU 8" x 8" x 16" wall along property line, closest to backyard gate to retain to soil from neighbor.<br>
Sanded stucco. (color TBD on site with swatch from project sup.)<br>
<br>
includes labor, footings, rebar, infill, stucco and block wall.'),
  (4505839, 18, 'Extend lawn from top of yard, down the slope to the sidewalk. Total add of lawn: 330 square feet. Price for lawn: $1,155<br>
<br>
Because we are removing and relocating a few of the plants, there is a credit of -$846 for the plants we are not ordering. Removal of (11) 1 gal plants and (14) 5 gal plants.'),
  (4505928, 11, '1- relocated main line 10LF 3/4" pipe total of 6 fittings 3/4" - $480 with material<br>
<br>
2- (3) total curb cores 1 for surface drains, 1 for French drain and 1 for house rain gutters - $590  ($390 labor/$200 core drill rental)<br>
<br>
3 - Add additional drain connections for all drain lines $350 with material<br>
<br>
4- Install Sump Pump system with catch basin, catch basin lid, evacuation lines and tie in inlets and electrical - $1750<br>
<br>
<br>
<br>
 '),
  (4508869, 13, 'this is to offset the accounting for job'),
  (4512042, 19, 'This pricing is for a desert vibe parkway from picture Veronica sent to me.<br>
Includes:<br>
557 square feet of demo of existing sod<br>
6 boulders $110<br>
    (2) 1/2 head<br>
    (2) 3/4 head<br>
    (2) full head<br>
20 feet of bender board<br>
557 square feet of decomposed granite, not stabilized, includes weed barrier<br>
(12) 1 gallon Festuca glauca plants<br>
(8) 5 gallon plants<br>
    (4) Agave desmetiana ''Veriegata''<br>
    (4) Dasylirion wheeleri<br>
<br>
 '),
  (4512054, 8, '1. Dig holes for plants<br>
2. Introduce 2 1/2 to 3 yards of amendments<br>
3. Plant (30) 15 gallon Laurel Nobilis Hedge plants'),
  (4513235, 8, NULL),
  (4515872, 3, '<p><u>FOR THE RECORDS</u>:<br />
Initial deposit for permit: $1,000<br />
Change order previously approved (not invoiced): $2,500<br />
&nbsp;</p>

<p>Total permit cost:<br />
$5,475.37 - $3,500<br />
<u><strong>= $1,975.37</strong></u></p>
'),
  (4518528, 9, 'Taking out the stucco section of the contract and instead paint over all walls in the attached photos. <br>
No extra charge. Please just approve the changes of scope of work.<br>
We will also paint the short walls at no additional cost to make it uniform if you''d like to do so.<br>
Please see attached phots and let me know if you have any questions. <br>
<br>
*Exterior paint. Black color. Flat Finish. '),
  (4521079, 20, 'Adding a wooden retaining wall to the left side of yard by hedges to hold back the soil. There is an elevation change we need to accommodate for and make sure that the soil does not flow into the decomposed granite we are planning on placing underneath the embankment.'),
  (4521080, 21, 'This french drain will help move the water away from the wall.'),
  (4521083, 23, 'This is for an additional 380 linear feet of bender board along the steppers, sides of the yard, and any transition of materials (mulch to DG, grass to mulch) throughout the site. By adding more bender board, you are creating a more unified, modern look to compliment the overall design.'),
  (4522982, 2, '98 additional linear feet of drainage. X $22.00'),
  (4523152, 24, 'Here is pricing for just Decomposed Granite in the parkways.<br>
557 square feet of stabilized DG with weed barrier<br>
557 square feet of removal of existing lawn, with soil removal at 3" depth for the decomposed granite to fit in the parkway'),
  (4523244, 1, '11 linear feet of step build stone wall 2 as tread in Tuscan.&nbsp;'),
  (4523294, 1, '150 watt steel outdoor transformer
Includes all labor and wiring.

To be installed for front property low voltage lights, install on interior of fence/gate.'),
  (4523346, 2, 'Measurement in contract was 215 SF. 
Measurement on site is 265 SF due to small changes in wall size and layout of pathway. 

NO CHARGE '),
  (4523358, 3, 'This helps keep sand in joints and acts as a binding agent. 
@ $1.75/SF according to contract.'),
  (4523361, 9, NULL),
  (4523377, 4, '6” CMU block for 24LF @ 36”
4” CMU block for 64LF @ 16”

Approx. 157 SF of sanded stucco.

Cost is a wash with what is on contract.'),
  (4524154, 1, 'Planting design amended. Evaluate and adjust plant quantities within the current plant budget.
Develop a new CAD plan.'),
  (4524198, 3, 'Timeframe: Pots laid out in field per plan, prior to planting/digging. 
Summary: Adjust site layout of plants. Get approval from client on layout. '),
  (4526593, 10, NULL),
  (4527076, 4, NULL),
  (4528834, 3, '114 Additional Square Feet of Pavers Base price at $13.25 and upgrade of polymeric sand and Heartland + $3.60 SF= $1,943.70<br>
Changing wall blend out from Grey moss Charcoal to Tuscan as well'),
  (4528892, 4, 'Additional 17 LF of Step Build X $60.00'),
  (4528919, 5, '9 Linear feet less&nbsp; &nbsp; $152.00 X 9 LF= -$1,368.00'),
  (4529820, 5, '(1) 4 x 6 structural beam 
(9) 2 x 6 

See design attached.
Labor and all materials (screws etc) included in cost.
Client to handle painting after PictureBuild is off site.'),
  (4529944, 6, ' 350 SF
Power wash upper backyard patio pavers and steps. 
Install new polysand in pavers and steps. @$1.50/SF
Apply color boost sealant to pavers and steps. @$1/SF.

This cost is for upper area only. '),
  (4530753, 2, 'We have 87 LF of fence demo in contract and total fence demo is 128 LF (chain link, front fence and gate, front entryway fence)

Cost difference is 41 LF. '),
  (4530802, 3, '38 LF of CMU 6" x 8" x 16" @ 24" high. $4,370
Sanded stucco 76 SF. $646
Thoroseal waterproofing $893
Labor and all materials included.

If LF is less, we will credit you. There will be a step up in 8 ft sections as needed.'),
  (4531894, 9, '60sqft 1-2" Mexican Beach in black <br>
(9) 1 gallons'),
  (4533410, 7, 'Color Boost Sealer @ $1/SF for pavers.
Location - Front entrance pathway and step
'),
  (4533612, 8, NULL),
  (4536284, 1, 'Replace 38 linear feet of 3/4”copper main line '),
  (4536540, 9, 'This price does not include laying asphalt after completion. We can hire an asphalt company to do this, but to save you guys some money. We recommend you hiring a company and paying them directly. If not then asphalt would be on a separate change order with its own pricing. **Also to do this work we will have to give proper notice to all residents that share this drive-way.<br>
<br>
Price breakdown.<br>
<br>
250 linear feet of 1 inch copper with couplings  - Material charge $17 per linear foot - $4250<br>
Asphalt cutting - Machine rental with blades and dump fees  - $1200<br>
Mini Excavator - Rental   - $1000<br>
Crew Labor - Excavation - $2350<br>
Crew Labor Installation - $1700<br>
Crew Labor Refill and Compact in Lifts with Jumping Jack - $3000'),
  (4537337, 25, 'This is for 100 sqft of concrete, broom finished for the sidewalk. Pricing is changed per discussion with Jorge.'),
  (4537348, 26, 'This is a credit for 4 drip valves that we do not need to install for a completed project.'),
  (4543119, 2, '40 Linear Feet'),
  (4543134, 3, 'Adding 4" SDR 35 pipe plus 2x2 catch basin'),
  (4543967, 8, 'Remove existing concrete and haul to dump.<br>
<br>
Remove subgrade soils down to 7 inches below grade.<br>
<br>
Install 46 linear feet of SDR 35 drain line<br>
<br>
Install two drain inlets and one downspout inlet<br>
<br>
Install one drain pop up<br>
<br>
Install class @ roabase subgrade for concrete.<br>
<br>
Install forms <br>
<br>
Install #4 rebat 24 inches on center<br>
<br>
Pour concrete, finish and remove forms. '),
  (4544018, 10, 'Pressure regulator $325
Labor $75'),
  (4545794, 4, '22 pieces of block'),
  (4546834, 6, NULL),
  (4546842, 7, NULL),
  (4549136, 5, NULL),
  (4550862, 29, 'Job closed '),
  (4550897, 8, NULL),
  (4550972, 4, 'Very happy '),
  (4551887, 9, NULL),
  (4551906, 10, 'Credit for orignal concrete job'),
  (4551976, 27, NULL),
  (4556053, 14, NULL),
  (4556059, 15, NULL),
  (4557426, 10, NULL),
  (4557865, 8, NULL),
  (4558045, 11, NULL),
  (4558085, 7, NULL),
  (4558236, 6, 'Poppy seeds were not planted by Picture Build. Credit for labor and materials that was in final price list and contract.'),
  (4562152, 30, 'Install 16 zone rachio timer
Install two new sprinklers for better coverage
Cancel one sprinkler by side wall
'),
  (4562256, 2, NULL),
  (4564028, 5, '(17) 15 gallon&nbsp;'),
  (4566256, 10, '60 linear feet of drain 
7 basins 9”x9”'),
  (4566258, 11, '2 courses 
Dowel rebar into existing wall
Smooth stucco in white'),
  (4566346, 11, 'demo, form and pour approx 30 SF of concrete in upper backyard, see photo attached.<br>
<br>
(replacement of concrete pad)'),
  (4566570, 6, NULL),
  (4566758, 10, '3 hours labor @$75/hr. + $80 material

Rewire valves, check all lines.'),
  (4568197, 1, 'Pour colored concrete pad for wood
2'' x 7''6" = 15.2 SF
Includes forming, labor and all materials.'),
  (4568604, 2, 'Trim back large vining rose bush 18"'),
  (4568614, 3, '14 LF of 3" SDR drainage from French perforated drain to dry well (in planter)'),
  (4568646, 4, '- Add one 6" CMU course to 18 LF of wall
- Add rectangular cap to wall for garbage can enclosure. (So the taller garbage can tops can be hidden) 18 LF'),
  (4568660, 5, 'Not doing a footing for towel rack near spa
Issuing a credit.'),
  (4568703, 6, '3" triple wall sleeve for approx 14LF

From stub up in planter to garage disconnect.'),
  (4568823, 7, 'Demo Trex steps.
<br>Form 3 steps with 6" rise for Trex overlay. <br>Includes all wood.<br>Trex boards are 5 1/2" wide. <br>So step tread will be 11" (or 13" if 2" pieces can be used).<br><br>*Client to purchase Trex separately.<br><br>(If lead time for Trex is longer, we can credit for installing Trex)'),
  (4569338, 6, 'Additonal sod was added as beds were reshaped&nbsp;'),
  (4570408, 12, '12 LF of 3/4” Electrical conduit with (3) 12 gauge wires
(1) outdoor rated duplex outlet
Includes punch out, trenching and electrical.'),
  (4571752, 13, 'Saw cut and chip away from wall. This is for saw cutter and labor to chip away without damaging wall.'),
  (4574644, 7, NULL),
  (4575311, 7, NULL),
  (4575316, 8, NULL),
  (4575319, 9, NULL),
  (4576345, 1, NULL),
  (4576403, 8, '49LF of trenching at 18" deep. (to code)
Includes backfill.

*Work is already performed.'),
  (4576413, 14, 'Valves near pool are old and leaking. 
Install (2) new plastic valves and test.'),
  (4576604, 10, NULL),
  (4576626, 2, 'The first course is 5 LF.    $375.
     
6 course at 5 LF. each course
30 LF.    $1,500

Back fill with existing soil $150.
Delivery for timber. $120.

Total $2,145.
'),
  (4576807, 3, 'This irrigation is only for the top of the hill for the new plants.


Not the podocarpus 
'),
  (4576849, 1, NULL),
  (4582290, 2, NULL),
  (4583370, 6, 'Continue border stone along both sides of carport. 
19’ 6” (x both sides) = 39’ LF of border.'),
  (4583379, 7, 'Client already has main line shut off valve.'),
  (4583382, 8, '18 LF of main line 3/4” copper.
Buried 18" below grade per code.
Includes trenching and backfill.

New location near fence in grass zone buried with green cover at grade. Going to be out of the way and much cleaner of a look. Zero trip hazard.'),
  (4583384, 9, 'No charge.'),
  (4585559, 12, ' 
- Install 4 LF. Of 8" brick for cap and grout on 6" return wall

 Install 70 square feet brick veneer and grout.

All labor and materials included.'),
  (4587429, 8, NULL),
  (4587471, 10, ' Grace,

It was so great to see you yesterday and enjoy seeing your amazing backyard!!

Notes from our meeting:

1)  Please approve 8 more Wax Leaf Privets X $43.50= $348.00

2)  Lights- moving 2 lights, we can easily move them when our landscape crew is next door installing lights

'),
  (4588879, 1, 'Dig down 24 inches remove soil and backfill with gravel on 30 drain inlets at $250 per inlet<br>
<br>
total $7500'),
  (4588915, 2, 'One additional planter to be graded and plants to be removed. Using existing plants from another planter to transplant.<br>
Backfill with 27 cu ft of soil <br>
grade planters to drains.<br>
3 yards of Additional soils for other planters needed<br>
$1500'),
  (4590098, 3, 'Approved at job site&nbsp;'),
  (4591762, 3, 'demo existing planters and vegetation, backfill with 7 yards of soil to original planters discussed. <br>
grade soil to drains for proper water drainage.<br>
adjust heights of drains accordingly. '),
  (4594708, 10, '9 LF of border stone on either side of apron. 18 LF in total.'),
  (4597007, 4, NULL),
  (4597559, 28, NULL),
  (4598904, 15, 'Tile labor'),
  (4598907, 16, '@$1/SF'),
  (4598916, 17, 'Credit for not doing polysand at front entryway'),
  (4598963, 18, '8 LF of bullnose material not using'),
  (4599170, 19, 'Credit for overage on wall
15lf one course'),
  (4602155, 12, 'Move hose bib out of grass area 21 LF
Move hose bib out of walkway and into retaining wall bed. 2'' 6" LF'),
  (4603914, 1, NULL),
  (4603937, 2, NULL),
  (4603952, 3, NULL),
  (4607032, 4, NULL),
  (4607770, 41, 'Per attached addendum.&nbsp; Price may fluctuate depending upon shooting grades and path location.&nbsp;'),
  (4610206, 20, NULL),
  (4611118, 14, NULL),
  (4611155, 15, NULL),
  (4611977, 5, 'Credit for 3 @5 gal. 5@1 gal. '),
  (4613410, 9, NULL),
  (4613466, 42, NULL),
  (4613695, 16, 'Install 45 LF of 3/4” Galvanized Line 18” below grade per code.

Giving a discount for additional work.

'),
  (4617775, 4, NULL),
  (4620039, 5, NULL),
  (4620443, 17, '(3) coats of roll on waterproofing behind walls approx. 57 LF x 3 FT (TALL) = 171 SF

Cost is $10.50/SF and I have given it at $9.35/SF for a total of $1,599.

This is so the stucco doesn’t get damaged when water tries to come through the wall. We did not have this is the contract, but it is suggested.

Discount of $200.'),
  (4621228, 1, '1) Change to paver and add sq footage - $2300<br>
2) Added drainage - $1000<br>
3) Added post work - $450<br>
4) Add one more irrigation zone - $800<br>
5) Add copper main line work - $4100<br>
6) Remove 80 linear feet of bender board - credit ($800)<br>
7) Added demo $800<br>
<br>
 '),
  (4621498, 9, 'As contracted in our design agreement ($400 CREDIT)
THANK YOU MAZERS!'),
  (4623394, 2, 'Additional 625 sq feet of sod.&nbsp;'),
  (4628605, 6, 'We are switching out the sod for Synthetic turf<br>
<br>
4 seams $3825 - Pet Gravel Install<br>
credit of $700 for sod installation.<br>
<br>
Turf will be #109 So Cal Blend Supreme.<br>
Will need 15 x 14 foot roll. '),
  (4628897, 2, '27 linear feet of 3” drain '),
  (4632425, 18, 'FRONTYARD:
30 LF of 4” SDR @ $24 lineal foot

This is to keep water from spilling soil and mulch up and over wall, this will capture the rainwater from the surface.'),
  (4632458, 19, '30 LF of French Drain at bottom of larger retaining wall, includes sock and 12” gravel bed. 
@$40/Lineal Foot'),
  (4633064, 43, NULL),
  (4633863, 1, 'for roughly 45 linear feet by 1-2'' post installation of driveway apron and small curb '),
  (4634107, 20, 'Credit for over-measurement of wall.  Wall is 29 LF long @ $155.50/LF.'),
  (4634114, 21, 'Over measurement of conduit. Credit $200.'),
  (4634140, 22, 'We need 7 LF of 8” CMU block to make wall slightly higher.
Stucco to match. 
'),
  (4634949, 1, NULL),
  (4634983, 7, NULL),
  (4637149, 7, 'waterproofing credit       $125.00<br>
returned plants               $195.00'),
  (4638439, 3, NULL),
  (4638655, 6, '3- 5gal Westrangia 
1- 5gal. Pit. Golf ball'),
  (4641088, 1, NULL),
  (4641525, 2, NULL),
  (4641527, 3, NULL),
  (4642017, 1, 'Plant design. '),
  (4642179, 10, 'Cost difference from 48” box to 36” box. 
We could not find the 48” Liquid Amber so we are getting a 36” box PINK multi-trunk Crape Myrtle.'),
  (4642547, 4, NULL),
  (4645968, 2, 'Remove tree and stump, additional soils <br>
Remove fence posts/entry gate '),
  (4645978, 3, NULL),
  (4645984, 4, NULL),
  (4645989, 5, 'Henry''s tar'),
  (4645998, 6, '3" drain wrapped in sock buried in 12" gravel bed, exit and pop up into bed with Jades'),
  (4646174, 1, NULL),
  (4646177, 2, NULL),
  (4646178, 3, NULL),
  (4646179, 4, NULL),
  (4646221, 5, 'Removing chainlink fence,&nbsp;footings, ivy, 2 small trees 4 additional stumps'),
  (4648649, 23, NULL),
  (4648659, 24, NULL),
  (4648671, 8, NULL),
  (4648720, 11, NULL),
  (4651781, 4, NULL),
  (4656656, 44, NULL),
  (4658642, 11, 'We did not complete steps, Mikale was going to install and needed to return to Michigan for a family emergency. '),
  (4658691, 7, NULL),
  (4660997, 45, '<p>CREDIT  the following<br>
Landscape Timber Retaining Walls – Main Path<br>
1.    Use 8’ x 6” ACQ Pressure Treated Lumber from Topanga Lumber<br>
2.    Dig footings for steps down 12 inches below grade<br>
3.    Install geofabric and ¾ crushed gravel bed.<br>
4.    Install first course beam to grade.  Use 3 foot #4 rebar to secure to ground<br>
5.    Secure added courses with 3/8” x 10” timber screws<br>
6.    Install total of roughly 215 linear feet of retaining wall at average 24 inch height. <br>
7.    Install Timber edging border to math existing. <br>
CREDIT TOTAL (36,550)</p>

<p><br>
ADD back in -<br>
200 lnft next to lower walkway ditch or two course retaining.<br>
Retaining section bottom gully under walkway piping. <br>
1 course timber retainment for flat sections of walkway. approx 80 lnft for each of the two sides.160 lnft total<br>
Upper patio retainment for main walkway<br>
TOTAL : $27,500<br>
<br>
NET TOTAL : (9,050)<br>
<br>
 </p>
'),
  (4667572, 1, 'Add copper shield to ground cover areas in front and back for Dymondia silver carpet.'),
  (4667665, 2, 'We have 66 LF in contract and 70 LF is needed.
This is the cost difference.'),
  (4667726, 25, 'Stump removal 24" away from house 24" from current grade level according to foundation repair company.'),
  (4667743, 26, 'Pour approx. 20 LF of 2500 psi concrete at 2'' depth BELOW paver demo grade (6").

Concrete to be with #3 rebars at 2'' depth.

Total concrete 1.5 CY.

This is to protect the foundation of house and new pavers from being uplifted by neighbors tree.'),
  (4668141, 27, '@$3.25/SF for 150 SF

Bender board lines around trees have changed (closer to trees now) so therefore, more grass is needed.'),
  (4672078, 2, NULL),
  (4672392, 6, NULL),
  (4672413, 7, NULL),
  (4683038, 5, NULL),
  (4683361, 4, 'We need a manual 6 station timer, currently there is a timer with 4 stations and we have 5 zones.'),
  (4685895, 3, NULL),
  (4686026, 4, 'Not using steel, using vinyl. Adding 50 lf. '),
  (4686854, 8, 'With water proofing '),
  (4686895, 9, NULL),
  (4686900, 6, NULL),
  (4690904, 1, 'Permits pulled by client for utilities.
We will schedule inspections and meet with inspector.'),
  (4690913, 2, 'Client installed dry wells already. 
Line item # 14 under "Drainage"'),
  (4691014, 4, '36" fire ring
46" firepit (contract has 40")'),
  (4691040, 5, NULL),
  (4692863, 46, NULL),
  (4692866, 47, NULL),
  (4695169, 1, '17 linear feet, stepping up to follow grade 
1 course plus footing'),
  (4695171, 2, NULL),
  (4695172, 3, NULL),
  (4695243, 5, 'Credit for 
two medium size 2-head boulders and 
two large size 4-headed boulders.'),
  (4696484, 28, 'Smooth stucco 320 SF. (Upgrade from sanded stucco in contract)'),
  (4697049, 48, NULL),
  (4697371, 49, 'This change order is for 8 tons of 3 to 6" rock. If more is needed, we would need to add more cost.'),
  (4697392, 9, 'Sealer to be wet look pbpro

Change order approved via text '),
  (4697403, 1, NULL),
  (4697405, 2, NULL),
  (4697409, 3, 'Includes demo of DG in front area, soils between flagstones side/back areas<br>
Will add 2 yds of 50/50 soil<br>
<br>
16 flats of groundcover for front<br>
8 flats for side/back<br>
<br>
Mixing Creeping Thyme and Sedum Gold Moss for sunnier areas and Blue Star (Isotoma)<br>
Plus (1) 5 gallon Red Hibiscus '),
  (4701053, 6, NULL),
  (4701073, 7, NULL),
  (4704197, 6, NULL),
  (4709405, 4, '5 path lights 
1- 150w. Transformer 

The client will text me the model number by Monday '),
  (4710764, 1, 'Extra hauling of plant materials and rock removal. Bird of Paradise on side of home as well.'),
  (4716435, 4, NULL),
  (4716439, 5, NULL),
  (4719770, 5, NULL),
  (4723835, 1, 'Additional 51 LF. Of 1½" poly line from gas meter to reduce ¾" for  house fireplace and 1¼"  to bbq and fire pit.'),
  (4726306, 8, NULL),
  (4726317, 10, 'Demo out pavers and replace with new pavers'),
  (4728347, 1, 'Stump grinding along new wooden fence where large trees coming out.'),
  (4729462, 3, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">8 large ones at 360 each</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">12 medium ones at 150 each</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">15 smalller ones at 42 each</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Larger ones are about 7-8 feet tall (the replacement one in the front yard size) </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Medium is 5 feet tall about a foot wide</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Smaller ones are about 3 feet tall. </span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Total cost is $5310</span></span><br>
 '),
  (4729515, 1, NULL),
  (4731426, 2, '55 LF. Of 1¼" conduit 3- #4 wires.'),
  (4733339, 6, NULL),
  (4734624, 7, NULL),
  (4738032, 1, 'Design credit. '),
  (4738044, 2, '7x $190.00= $1,330.00'),
  (4742893, 7, NULL),
  (4743606, 1, 'See photo'),
  (4746947, 9, NULL),
  (4746965, 10, NULL),
  (4746978, 11, NULL),
  (4746993, 12, NULL),
  (4748264, 2, NULL),
  (4749788, 6, NULL),
  (4750182, 2, NULL),
  (4750308, 3, NULL),
  (4751984, 13, NULL),
  (4754920, 1, NULL),
  (4754937, 2, 'Materials (concrete plus river rock for all 4 sides of median)
Labor
Delivery of material to site'),
  (4759115, 8, NULL),
  (4759293, 2, '489 sqft of dual layers of water proofing<br>
trenching and recompaction<br>
applying roll on waterproofing and then applying subseal<br>
torching the waterproofing and roll on waterproofing<br>
compaction and cleaning<br>
$9650<br>
Retrofitting existing valve to drip netafilm system <br>
$800<br>
<br>
Total $10450'),
  (4759963, 14, NULL),
  (4765207, 1, 'Additional sod '),
  (4765368, 3, NULL),
  (4768589, 3, 'Need to run new irrrigation laterals to bypass leaking under decking.&nbsp;'),
  (4768613, 10, NULL),
  (4768685, 5, NULL),
  (4768760, 15, '12 CY of additional soil removal @ $130/CY
3 CY was in contract, we hauled 16 in total.'),
  (4768809, 16, 'Credit for one cantilever step 5’2” x 1’ w sand finish '),
  (4768879, 17, '11 steps at 3’ now going to be 4’
3 steps at 5’2” now going to be 6’2”  (at bottom)

Adding 2” cantilever to each front facing side
Adding 14 SF of sand finish (no charge)
Adding 14 LF of additional forming (no charge)'),
  (4769187, 18, 'Adding concrete pour for extra 32 SF 
Sand finish 32 SF
Adding forming 55 SF

This is where the concrete poured in place pavers will be since we are not doing a 2nd bench '),
  (4772752, 4, NULL),
  (4772780, 5, NULL),
  (4773776, 1, NULL),
  (4774139, 21, NULL),
  (4783491, 3, NULL),
  (4783493, 4, NULL),
  (4785907, 6, NULL),
  (4794830, 6, '2 cubic yards of fabric and -1"del Rio please order&nbsp;<br>10 bags of 4-6"rock to be delivered by Verva&nbsp;<br>15 boulders to be delivered by Verva&nbsp;'),
  (4795052, 1, 'Adding curved bender board 21 LF for flower bed'),
  (4795162, 2, 'Installing flagstones in concrete and cutting turf around so that stones don''t wobble on top of turf.

$650 labor
$300 material'),
  (4797972, 7, 'Additional sf of grass. Field measurement. '),
  (4799272, 7, NULL),
  (4801540, 9, 'Raise Skimmer - Break out shell, reset. $1900<br />
Raise Overflow - Remove coping. Break out shell.  Move Overflow, Dowel and reconcrete shell.  $1200<br />
Raise Vacuum -  New Core shell, Patch old shell core.  Reinstall vacuum line - $700<br />
Add 3 LED lights - run conduit and lights back to controller.  Core sheet for Niche Globrite (does not include lights)  $1200<br />
Remove existing pool light and patch shell - $250<br />
Lower trenching on pool equipment for elevator 2 1/2 feet deep and continue under grade beam. - $900<br />
<br />
Tiles having issues. All pool tile work outside of original contract to be future assessed.  Not included in this change order. '),
  (4802565, 8, 'Got it, thanks! 

So I''ll put I the change orders
LIGHTS 
1. Credit on lights. 

32 in contract+ 7 in change order= 39 -36 final count. 

Credit of 3 lights @ $190.00= $570.00

PLANTS
2. Adding 1 24" box tree $360.0

6 1 Gallon white Lantana. $129.00

2 5 gallon little John''s $87.00

Plant total. $576.00


No charge on the rock. I''ll bring of 2 bags of the 1" del Rio when I bring the larger rock tomorrow. 
TOTAL CHANGE ORDER $6.00
'),
  (4805252, 4, NULL),
  (4805825, 1, 'adding 1 - 5 gallon rosemary<br>
adding 1 - 1 gallon thyme'),
  (4809593, 1, 'Wash with saw cutting concrete on contract. '),
  (4813659, 2, 'Adding 3/4" polyline to reach firepit.'),
  (4813736, 3, 'Grass and soil on side yard is very high. We only have 3" removal BELOW soil level. Above soil level is another 5"-8" average which we need to also remove.'),
  (4813859, 4, 'Need additional bender board with curved lines.
190 LF was in contact
Measured 260 LF 
Difference is 70 @ discounted price $11.50'),
  (4813888, 5, 'Adding 6" more of del Rio gravel all the way around fence area as to avoid concrete fence footings.'),
  (4814973, 19, 'Credit for not doing waterproofing.'),
  (4816151, 3, '$200 credit!! '),
  (4818143, 20, NULL),
  (4818148, 21, NULL),
  (4818606, 50, 'Two new valves with electrical ran to irrigation timer at 1450 each 
40 yards of brown shredded mulch 6200
1600 Sq ft of jute fabric at 1.50 a Sq ft
$2400
Total 11500'),
  (4822397, 2, NULL),
  (4823710, 5, '280 sq feet of turf 
Will will use existing turf 
Need nails and infield 
Road base 

280 sq. Dg 

'),
  (4827536, 1, NULL),
  (4828596, 1, 'Dg path is actually 440sqft <br>
240 linear feet of black plastic bender board'),
  (4828602, 2, 'I can give you a $200 credit towards the irrigation, so the added zone will only be 665.00, a Netafim zone is usually $865/zone.'),
  (4828618, 3, NULL),
  (4828627, 4, NULL),
  (4829216, 6, NULL),
  (4830081, 29, NULL),
  (4830083, 30, NULL),
  (4830085, 31, NULL),
  (4830088, 32, NULL),
  (4830103, 33, NULL),
  (4830105, 34, NULL),
  (4831006, 6, NULL),
  (4832096, 1, 'Adding one zone'),
  (4832202, 2, 'Adding 55 LF of black bender board to front yard'),
  (4832210, 3, 'Stake for parkway tree'),
  (4832217, 4, 'Adding 118 SF to kurapia measurements.'),
  (4834528, 7, 'Our included amount for vase was $500 ( including tax). The vase chosen is $799. Upcharge cost is $299 plus tax.'),
  (4834947, 1, '4 additional linear feet of Step Build  $212.00<br>
1 additinal step light $225.00'),
  (4834963, 2, 'Additional turf with upgrade $1,626.00<br>
<br>
Credits:  <br>
Mulch 200 SF X $1.75= -$350.00<br>
Plant reduced see attached invoices  -$841.00<br>
TOTAL CHANGE ORDER  $435.00<br>
 '),
  (4834995, 3, 'Plants not used<br>
 <br>Hi Mo and Christopher,<div style="font-size: 12.8px">This would be the final count:</div><div style="font-size: 12.8px">2 fruit trees, even at the size of 5 gallon, they are at a higher price  $100.00 each,  $200.00</div><div style="font-size: 12.8px">29 @5 gallon plants  X $43.50=  $1,261.50</div><div style="font-size: 12.8px">22 @ 1 gallon X $21.50= $473.00</div><div style="font-size: 12.8px">Total planted:  $1,934.50</div><div style="font-size: 12.8px">In Change order:  $2,290.00</div><div style="font-size: 12.8px">Credit in difference $355.50</div>'),
  (4837107, 1, NULL),
  (4839043, 3, NULL),
  (4839047, 4, NULL),
  (4840676, 5, NULL),
  (4842951, 9, 'demo existing driveway<br>
install new pavement to match existing<br>
approx 360sqft'),
  (4843280, 3, NULL),
  (4847699, 1, 'Extending drainage out towards side of property&nbsp;'),
  (4849824, 1, 'Moving main water line from outside of gate to inside of gate next to A/C unit. 33 LF of 3/4" COPPER water line.<br>
Jorge explained on site why this is needed. '),
  (4849848, 2, 'adding 3 LF to built in bench nearest sliding doors. This is to cut out and cover up large crack in existing wall.  <br>
<br>
Total seated bench area will be 9 LF.<br>
8" CMU block will be use for the backing of the bench. This backing will meet other retaining wall so there is not an awkward space between walls.'),
  (4849859, 3, '152 SF of waterproofing behind armrests so water does not sit and crack new stucco.'),
  (4849862, 4, 'CREDIT!<br>
<br>
24 SF of Flagstone we are NOT installing.  This was if we were to demo to the bottom of the existing wall.  We are not doing this.'),
  (4849866, 8, NULL),
  (4849875, 5, 'Credit for drainage, Jorge said we will be good with one drain pipe from wall to existing drain grate (which takes it out to the street).'),
  (4849894, 6, 'Smooth stucco entire upper back wall approx. 148 SF. <br>
This will look better than what we have in contract (which is just stucco the backing of the new benches).  This way the back wall will have the same texture and look new.'),
  (4849968, 22, NULL),
  (4850395, 5, 'upgrade to $20 per light for Universal Opal Mica - (3) = $60<br>
2 NEW lights added - Poppy Post Opal $220/each'),
  (4852711, 1, NULL),
  (4852716, 2, NULL),
  (4852733, 3, NULL),
  (4855356, 4, 'Current grade higher towards sidewalk including terraced area. Requires add’l demo, grading and hauling'),
  (4856152, 2, NULL),
  (4857328, 1, 'Remove 2 vines and remove + haul 2 CY soil behind bbq area.
This will allow soil to stay in beds and not spill over.'),
  (4858256, 2, NULL),
  (4858270, 3, 'Remove old Playhouse steps- NO CHARGE'),
  (4858708, 4, 'On side of house

Demo 130 SF 3'' x 43'' to 6"-7" below grade
Remove brown bender board and rocks
Pour 2500 psi concrete for 130 SF
Sand finish
'),
  (4861805, 5, '24" x 24" stump grind.'),
  (4867263, 5, NULL),
  (4867499, 7, NULL),
  (4870170, 9, NULL),
  (4874771, 1, NULL),
  (4874808, 2, 'Removing extra 7 CY of soil and put it in the back of property near walls.'),
  (4874832, 3, 'Credit for 2 catch basins'),
  (4874858, 4, 'Adding 3 drain grates (in concrete area instead of catch basins) @$65/each'),
  (4874941, 5, NULL),
  (4876894, 3, NULL),
  (4876909, 4, NULL),
  (4879559, 7, NULL),
  (4880851, 6, 'Old measurements for gopher mesh - 3,900 SF + 108 under veg beds.<br>
This old measurement was for planting areas, veg beds, and meadow, which for the planting areas, we cannot do with the roll out mesh.<br>
We need baskets for the plants (see separate change order for baskets).<br>
<br>
NEW measurement is 5,690 SF<br>
This NEW measurement includes meadow, sod, under veg beds and all D.G. areas since we found gopher holes in many DG areas.<br>
<br>
COST is the difference@ $2/SF.'),
  (4880949, 7, '<br>
8 - 15gallon wire baskets @ $25/each = $200<br>
<br>
UPDATED we are only using baskets on Citrus and please wrap wire mesh on base of 36" Olive tree.'),
  (4881092, 8, 'Karelaine is updating the planting plan.&nbsp; We are removing (1) 15g citrus from the contract.'),
  (4881458, 9, '6 drain grates (tan/brown) with 3" PVC perforated holes with gravel 16" deep in Decomposed Granite area.<br>
<br>
Time and material.<br>
 '),
  (4881748, 10, 'We have 635 LF in our contract and we used 600 LF.<br>
<br>
Credit is for 35 LF.'),
  (4881756, 11, '200 SF of Marathon II - $750<br>
<br>
We initially had seed in the contract + amendments for this area (complementary seed + $500 in amendments).<br>
<br>
Cost difference is $250<br>
<br>
 '),
  (4881764, 12, '<p>ORIGINAL contract:<br>
<br>
72 (1gallons)<br>
180 (5gallons)<br>
 </p>

<p>NEW plant count:<br>
81 (1 gallons)<br>
194 (5 gallons)<br>
<br>
The change order is the cost difference.<br>
9 (1 gallons) @ $22/each = $198<br>
14 (5 gallons) @$45/each = $630<br>
<br>
(1) citrus was removed and credit is separate change order.</p>
'),
  (4881765, 13, 'we had 10 path lights in front and we are only installing 8.<br>
<br>
Lights are $280 each.'),
  (4882684, 6, 'Adding (4) additional lights from original count of 10'),
  (4885252, 8, 'Add 6 LF step down near A/C unit.
Hand mix concrete.
Light broom finish.
'),
  (4885895, 2, NULL),
  (4885981, 7, NULL),
  (4888484, 6, 'No soil is included for backfilling '),
  (4894180, 9, 'Client requested change order:<br>
<br>
268 SF of stucco on lower retaining wall from gate to new timber retaining wall.<br>
Prep for stucco, removing paint, etc.<br>
Color to be chosen from swatch with client.'),
  (4895062, 1, NULL),
  (4895064, 2, NULL),
  (4899315, 6, 'Remove one stone and pave around the rest 
Cancel irrigation around stone'),
  (4899640, 6, 'We did not use 100 SF of potting soil in pots near trellis.<br>
credit for planting vines'),
  (4900589, 1, '
> Hi,
> It is getting cleaned out!
> Here are the actual finished counts:
> Wall got longer by 2.5 feet. $395.00
> Reworked extra excavation ramp area $300.00.
> Credit of 10 linear feet of step build --$600.00
> Price difference $95.00
>
> New apron. We will  need to break out an additional foot or 2 in so that we can feather a nice slope in. $561.14 it will look much better than just adding to the end.'),
  (4901635, NULL, '9 linear feet of brick bullnose and 120 Sq ft of Concrete 6 inches '),
  (4903044, 7, 'Leftover sod from front yard to be installed in backyard'),
  (4904245, 14, '120 SF in the front side yard - after the concrete pour and up to the other mulch area (where little bench is).<br>
<br>
Mulch is Premium Walk-on to match.'),
  (4904256, 15, '3,430 SF of brown shredded mulch @ 2" deep.<br><br>I calculated 21 Cubic Yards for this cost.<br>
&nbsp;'),
  (4907961, 10, '200 SF of brown shredded mulch at 2-3" depth.
Include jute nearest Candelabra Cacti to protect erosion.'),
  (4907983, 11, 'Didn''t use 3 Mexican fence posts'),
  (4908524, 4, NULL),
  (4912256, 1, '5lf reduction in BBQ size. '),
  (4912457, 16, '1- run ³/4"  conduit for cat7 wire.      $1,200.
2- run 1" conduit (extra) for future.  $1,200.

No wire.


Total $2,400.
'),
  (4914858, 1, '+ 500sqft'),
  (4914871, 2, '+ 350sqft'),
  (4914877, 3, 'Demo and Disposal'),
  (4915405, 1, NULL),
  (4915417, 2, NULL),
  (4915830, 5, NULL),
  (4916542, 1, 'Need 2 hours to update design, decrease plants by 25%.<br>
<br>
 '),
  (4916686, 1, '103sqft'),
  (4916691, 2, '68 linear feet'),
  (4916901, 3, NULL),
  (4919458, 1, NULL),
  (4919485, 2, NULL),
  (4919534, 1, NULL),
  (4919547, 2, 'Replacing concrete behind grill'),
  (4921612, 1, 'Running lateral lines to each zone, adding UV line around perimeter to back of wall '),
  (4921627, 2, NULL),
  (4921629, 3, NULL),
  (4921632, 4, NULL),
  (4921838, 3, NULL),
  (4922034, 1, '3x12 dg and fabric. '),
  (4922084, 3, 'v<br>
Total wall credit $152.00<br>
Additional Step build $500.00<br>
Rock instead of mulch $607.50<br>
Total:  $955.50 additional'),
  (4922088, 4, 'Taking out poured in place curb by road'),
  (4925611, 3, NULL),
  (4933237, 7, NULL),
  (4935687, 17, 'We need 240 SF more of grass. I have given a discounted cost @ $3.25 SF.

Total grass installed 2,440 SF
Total in contract plus change order 2,200 SF'),
  (4937225, 5, NULL),
  (4937258, 6, NULL),
  (4939382, 4, NULL),
  (4939436, 1, '8lf x $25= $200.00'),
  (4939463, 2, '47 sf x $14.35= $674.45'),
  (4939515, 3, 'Wall. + 3 lf. + 12" higher'),
  (4939545, 4, NULL),
  (4939562, 5, 'Difference in front yard order'),
  (4939577, 6, 'Reduced rock amount 192x $5.00= $960.00'),
  (4939588, 7, '154 sf x $1.85= $284.90'),
  (4941740, 4, NULL),
  (4941746, 5, NULL),
  (4942842, 1, 'Add''l Bender board will be calculated on site during job walk<br>
$8/linear foot '),
  (4944479, 6, NULL),
  (4945572, 5, 'Additional riser and border around porch, curb around trash cans '),
  (4945573, 6, 'Channel drain in front of garage '),
  (4953462, 2, NULL),
  (4953887, 18, 'Climbing 8 trees 60 ft. and installing up lights with tree straps.<br>
 '),
  (4953895, 4, '(1) 24" Palo Verde tree'),
  (4954096, 5, '(1) 1''4" x 1''4" x 3''3" pilaster with Eco Outdoor veneer in Bodega'),
  (4954534, 1, 'Lafitte was in contract, using Catalina grana instead. '),
  (4954535, 2, NULL),
  (4955378, 5, NULL),
  (4955384, 6, NULL),
  (4955393, 8, NULL),
  (4957833, 6, '<br>
(1)  BATTEN 2" x 6" x 18''6" - ASPEN<br>
(1) BATTEN BASE/BRACKET 2" x 2" x 18''6" - ASPEN<br>
(4) BATTEN END MOUNT CLIP -  MILL FINISH<br>
<br>
All cuts and installation included in costs.'),
  (4957834, 19, '366 LF of BK-E26-BK-V Bistro Lights with LED bulbs
366 LF of Suspension galvanized cable for bistro string
8 Galvanized cable clamps
183 - 8” black cable ties (120 Lb. Test)
All labor included in cost (ladder, zip ties every 2ft, etc).'),
  (4958127, 4, NULL),
  (4958128, 5, 'Succulents, Blue Hibiscus, grasses
25 total'),
  (4960275, 20, 'Trim back for (6) cedar beds.<br>
Incudes installation.'),
  (4962693, 6, NULL),
  (4962707, 7, NULL),
  (4965550, 1, '396 Sq ft of rtf turf for backyard. '),
  (4965770, 1, '897 sf
Priced at $14.50 a SF

Belgard Dublin Cobble 4 piece set  +  Polymeric Sand 
Dublin Cobble + $3.45 + Polymeric Sand $1

Priced at $18.95 X 897= $16,998.15  $13,006.70=

Change Order $3,991.45

Fire Pit in Belgard j with Belgard Belaire cap  + $299.00

block wall seat in Belgard Weston Wall block with Belgard   Belaire cap + $375.00

$4,665.45



'),
  (4965980, 3, NULL),
  (4969296, 4, NULL),
  (4975470, 2, 'Upgrade to inline valves     400<br>
Sand setting existing paver steppers in sod 160<br>
<br>
Total 560'),
  (4985320, 9, '70 linear feet of main line running to backyard.'),
  (4986328, 1, 'Additional drainage to downspouts behind house 65 linear feet x $25.00= $1,625.00'),
  (4989689, 7, NULL),
  (4990073, 8, NULL),
  (4991500, 9, 'Please see email sent to Joe and Jorge and Jorge''s daily log'),
  (4993088, 5, NULL),
  (4994470, 7, NULL),
  (4998772, 2, NULL),
  (4998773, 3, NULL),
  (4998777, 4, NULL),
  (4998783, 5, '45 linear feet of trenched electric&nbsp;'),
  (5000466, 1, 'Dig trenches<br>
Remove old pipe<br>
Install new pvc<br>
Rewire<br>
Backfill and compact.'),
  (5001117, 6, NULL),
  (5002765, 2, NULL),
  (5003204, 8, 'From dana:<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">I did (5) hours worth of design work for this portion, that should be billed to him at $150/hour.  </span></span><br>
 '),
  (5003599, 1, 'Additional main line 38 feet<br>
Trenching<br>
Going under wall'),
  (5003619, 8, NULL),
  (5007506, 3, 'For a total of 3 uplights, 6 steplights, 4 path. '),
  (5007527, 4, '2 steps at 4 lf wide. '),
  (5007544, 5, '17 lf X $135.00= $2,295.00'),
  (5008899, 1, 'Design agreement states $500 discount towards installation.'),
  (5010659, 1, 'Not doing sand finish, we will do broom finish.'),
  (5010671, 2, NULL),
  (5010678, 3, NULL),
  (5010711, 4, 'Repair with (6) 8" CMU blocks with brick cap'),
  (5010724, 5, 'Add 10.7 LF of 6" CMU block'),
  (5013099, 2, 'We cannot get the 24” box olive trees.  We can get the 15gallons so this is a credit for the difference.'),
  (5013120, 21, 'Credit for not getting 5 citrus trees at $315/each
Charge for (3) 15gallons and (1) 24” box olive.
Cost difference is this credit. '),
  (5014688, 8, '10- PS 501B 2.5 W.
3-   FL 117B  5.   W.
2-   FL 105B. 5.   W.
1- 300w transformer 
ALL IN BRONZE. 
'),
  (5014692, 3, 'Replaced smart timer with manual timer'),
  (5017749, 6, 'Remove one (15g) roses from front planter bed and haul.
Add 1 (5g) rose to planting plan.'),
  (5020873, 2, '60 sf x $5.5, area in driveway planter. '),
  (5020876, 3, '28 5 gallon plants x $43.50
1 24" box $385.00'),
  (5020885, 4, NULL),
  (5023305, 4, 'Add subsurface irrigation to parkway.'),
  (5024854, 5, NULL),
  (5024973, 1, NULL),
  (5031369, 7, 'Change to drip '),
  (5032484, 1, NULL),
  (5032500, 2, NULL),
  (5032508, 3, NULL),
  (5033430, 6, NULL),
  (5034179, 8, '(6) Day lily in yellow 1G
(2) Gaura hot pink -5G
(9) Lavender Provence 5G'),
  (5036165, 9, NULL),
  (5037450, 7, 'Valve replace only. '),
  (5040851, 6, '3 - 5g bird of paradise'),
  (5042780, 7, '10 man days $6000<br>
Discount Given client $600<br>
<br>
Total labor $5400'),
  (5044140, 4, NULL),
  (5044149, 5, NULL),
  (5044158, 6, NULL),
  (5044162, 7, NULL),
  (5044175, 8, NULL),
  (5045521, 1, NULL),
  (5045537, 2, NULL),
  (5045577, 3, '3- gal. Electric pink cordyline  $130.50
6- gal Peter pan Agapanthus  $129'),
  (5045673, 9, NULL),
  (5045733, 10, NULL),
  (5045774, 22, NULL),
  (5045783, 23, NULL),
  (5045795, 24, NULL),
  (5045861, 4, NULL),
  (5046654, 5, 'Lighting credit'),
  (5047327, 7, NULL),
  (5047486, 1, 'Fire pit to be 4x4 -18" high in grey charcoal rustic wall with cap'),
  (5047488, 2, '150 LF. AT 18" DEEP'),
  (5047498, 3, '191 LF. Edger to be 4x12 orco paver
On all planters in front yard and 3 in the back yard'),
  (5047504, 4, '168 LF 4 courses includes cap
12"x12" footings '),
  (5047509, 5, 'Pavers to be angulus grey charcoal 4 piece large @ 13.75 per square feet.
'),
  (5047518, 6, '400 square feet orco paver 4x12 in manor
In a herringbone pattern 
@$16.25 with a dark charcoal boarder'),
  (5047536, 7, '16 LF to match existing wall with wall cap
8x8x16 tan wall with cap
2- 3 courses '),
  (5047541, 8, 'Bull nose to be dark grey charcoal '),
  (5049642, 4, NULL),
  (5052115, 1, NULL),
  (5052116, 2, NULL),
  (5052119, 3, NULL),
  (5052321, 25, NULL),
  (5056474, 26, 'New measurement is 240 SF.
Credit at $14.40/lf includes wire, clips, zip ties, and labor.'),
  (5056493, 1, NULL),
  (5058096, 27, NULL),
  (5058835, 1, NULL),
  (5059185, 9, NULL),
  (5061892, 13, NULL),
  (5062162, 2, 'Remove 7" of /grade soils (72sq. Feet) Area Behind trees<br>
Total concrete removal was 1,491 sq feet including pad by pool and extra concrete to shed side of driveway'),
  (5062174, 3, 'Install 902 square feet of additional turf.  Includes two additional walkways that were changed from stone.<br>
Plus upgrade turf to Synlawn 347 <br>
<br>
 '),
  (5062191, 1, '40 lf timber wall 4500<br>Additional steps 900<br>Two additional lights 480<br>New concrete walkway 150 Sq ft 1750<br>Total 7630'),
  (5062193, 5, 'Add more Delta No Mow Grass - Native Variety'),
  (5062332, 6, NULL),
  (5062340, 7, 'Cut out sections of existing Wall.<br>
<br>
Dowel into existing wall block <br>
<br>
Epoxy in rebar connectors<br>
<br>
Install 5 18x18 block reinforcment columns<br>
<br>
<br>
<br>
 '),
  (5063603, 8, 'We had in contract (2) 36" box Magnolias<br>
We installed (3) 24" box Palo verdes.<br>
<br>
This is the credit for the difference.'),
  (5063637, 28, 'As per designer Karelaine''s email<br>
ADDING (2) 5g Lavandula angustifolia to the 2 cast iron plants near the patio in front of the north wall.'),
  (5063872, 8, NULL),
  (5063884, 9, 'Install new rough in for electrical circuit out by play structure.<br>
<br>
Roughly 50 linear. Breakout concrete curb.<br>
<br>
 '),
  (5063888, 10, 'Install new Rachio timer $450<br>
<br>
Instal new exterior outlet $150'),
  (5063897, 11, 'Install weed barrier and extended section of mulching next to shed driveway 110 sq feet.&nbsp; No plants or cardboard sheeting.'),
  (5064122, 12, '179 linear feet included in contract.  New design requires 365 linear feet. 186 linear feet addtional needed.<br>
<br>
 '),
  (5065915, 13, 'Cardboard, weed barrier, mulching beds.'),
  (5069108, 10, '. Install existing steppers near raised planter and plant (1) flat of groundcover between steppers (flat is already on site) and move planters with vines <b>$100.00 </b><br>
2. Install (2) new drip zones for pool area plants/shrubs, use netafim soaker hose with copper shield and connect to existing timer <b>$2130.00</b> (if it''s only 1 zone will give a credit for $1065.00)<br>
3. Plant (3) 5 gallon Vines for pergola posts (recommending purple trumpet vine or Clematis <b>$135.00</b><br>
4. Plant (10) 15 gallon Pittosporum ''Silver Sheen'' against wall behind pergola to screen neighbors yard <b>$1500.00</b><br>
5. Plant (50) 1 gallon mix of perennials for front bed near driveway (3 Asparagus Ferns, 3 Lomandra ''Breeze) and remaining (44) plants for bed around pool area to fill into empty spaces.  (suggested plants for backyard: Asparagus Fern, Lomandra Breeze,  Dianella ''Little Rev'',Thrift Plant, Coral Bells, Hummingbird Sage, Mexican Petunia) <b>$1075.00</b><br>
6. Plant (10) 1 gallon orange daylilies to the left of pool pergola near fence to fill into spaces <b>$215.00</b><br>
7. Plant (6) 4" succulents for pots on shelf  <b>$60.00</b><br>
8. Plant placement (Dana) $100/hour (not included in change order pricing, will be added after plants have been placed)'),
  (5070377, NULL, 'One concrete stepper 120

New valves with one check valve 450

Upgraded size on 6 red aloe to 5 gallon 120
'),
  (5071853, 2, NULL),
  (5071931, 3, NULL),
  (5071939, 1, NULL),
  (5071985, 10, NULL),
  (5072829, 11, NULL),
  (5073518, 8, 'Turf to be socal blend -190
Emerald Green/ Lime Green/Field Green 2"'),
  (5073546, 9, 'Stump grind will need to be done very carefully due to swimming pool line will also need plywood to protect fencing '),
  (5073764, 1, NULL),
  (5073817, 5, NULL),
  (5073842, 6, NULL),
  (5073895, 14, NULL),
  (5077336, 7, NULL),
  (5082686, 8, NULL),
  (5084448, 9, '4 man days with 33% discount. <br>
<br>
$1,320'),
  (5089476, 1, NULL),
  (5090383, 1, NULL),
  (5090872, 29, 'Manila Mango originally priced at 24" box and we could only get a 15g. This is cost difference.'),
  (5092558, 31, 'Credit for 9 FX Path lights that are now Lightcraft - MATERIAL only.'),
  (5092977, 12, NULL),
  (5092987, 13, NULL),
  (5095341, 1, '840 Sq ft of turf
95 linear feet of benderboard

'),
  (5096768, 1, 'Flats of blue fescue - $1420<br>
<br>
3 zones of irrigation - $850 per zone total of - $2550<br>
<br>
Grass demo - $600'),
  (5096787, 2, 'Added these items back into project from original bid.&nbsp;'),
  (5096791, 3, 'Added pavers back in $5,082<br>
Added firepit back in $3,400'),
  (5096971, 1, 'Demo,<br>
Grade,<br>
Form<br>
Pour<br>
Finish'),
  (5102454, 3, '<strong>FIREPIT </strong><br>
-20 linear feet of gas line <br>
-Double burner <br>
-Gas Key <br>
-(2) 18" X 2''  high wall return to enclose some of the firepit <br>
-Brick work for the top of the pit <br>
-Cap <br>
 '),
  (5102457, 4, '(8) 5 gallon shrubs'),
  (5102966, 4, 'Adding:<br>
2'' Concrete countertop - $630<br>
3'' CMU Block - $1,380<br>
2 outlets - @ $90/each = $180'),
  (5102979, 5, '14 LF 3/4" conduit - $280<br>
7 LF wire only - $20'),
  (5102986, 6, NULL),
  (5102990, 7, NULL),
  (5103000, 8, 'At both ends of turf area, at gates we will need bender board to hold in turf.  Another little piece is needed near planter bed (called out in the design).<br>
Three areas need 5 LF of bender board.'),
  (5103015, 9, '232 LF of 3" SDR pvc drain pipe<br>
9 drain grates<br>
2 downspout connections<br>
 '),
  (5103154, 32, NULL),
  (5105998, 1, 'Adding one more grass zone'),
  (5106086, 2, 'We had black metal in contract, switching ALL bender board to Brown plastic 1x6. 

Renders a credit.'),
  (5106133, 3, NULL),
  (5106683, 10, 'Complementary per Jorge and Nicole. $75/each value '),
  (5108527, 11, 'NOTICE : Turf rolls of the same name, blend, color and weight vary by dye lot. This can result in the same turf looking different if they were installed from different batches. Picture Build recommends replacing the all the turf to guarantee consistency in appearance and texture. <br>
<br>
Repairing the damaged turf. The damage in underneath the swing set, the damaged crosses a seam and affects two pieces of turf. <br>
<br>
The work needed;<br>
Demo existing turf of 375sqft<br>
Subsurface grading as needed<br>
Install 375 of turf - to match existing<br>
Install infill<br>
<br>
Total : $4,387.50<br>
<br>
 '),
  (5112658, 1, NULL),
  (5114272, 14, '3-15g. Podocarpus 
1- 1gal. Rosemary 
1- 5gal. Olive '),
  (5114820, 12, 'Demo existing turf of 1286sqft<br>
Subsurface grading as needed<br>
Install 1286 of turf - to match existing<br>
Install infill<br>
<br>
Total : $10,400.00<br>
<br>
<br>
 '),
  (5116487, 7, NULL),
  (5117597, 5, '2 1/2 hours of plant placement/selections @ $150/hour as listed on estimate<br>
 '),
  (5117607, 13, '2 hours @ $100/hour&nbsp;'),
  (5117962, 14, '(6) 4" Summer squash and zucchini plants<br>
(4) 4" Cauliflower plants'),
  (5119915, 3, '<span style="font-family: "Century Gothic", sans-serif; font-size: 12pt">Planting<br>
Introduce equestrian shaving amendments for all planting. Roughly 2 yards</span><br>
<span style="font-size: 12pt"><span><span style="font-family: "Times New Roman", serif"><span style="font-family: "Century Gothic", sans-serif">Install (1) 24 Inch Box Trees</span></span></span></span><br>
<span style="font-size: 12pt"><span><span style="font-family: "Times New Roman", serif"><span style="font-family: "Century Gothic", sans-serif">Install (22) 5 gallon plants.</span></span></span></span><br>
<span style="font-size: 12pt"><span><span style="font-family: "Times New Roman", serif"><span style="font-family: "Century Gothic", sans-serif">Install (28) 1 gallon plants</span></span></span></span><br>
<span style="font-size: 12pt"><span style="font-family: "Times New Roman", serif"><span style="font-family: "Century Gothic", sans-serif">$1972<br>
<br>
Irrigation</span></span></span><br>
<span style="font-size: 12pt"><span><span style="font-family: "Times New Roman", serif"><span style="font-family: "Century Gothic", sans-serif">Install (1) new Superior Brass Valves</span></span></span></span><br>
<span style="font-size: 12pt"><span><span style="font-family: "Times New Roman", serif"><span style="font-family: "Century Gothic", sans-serif">Install (1) new pressure regulator filters</span></span></span></span><br>
<span style="font-size: 12pt"><span><span style="font-family: "Times New Roman", serif"><span style="font-family: "Century Gothic", sans-serif">Wire to existing timer. </span></span></span></span><br>
<span style="font-size: 12pt"><span style="font-family: "Times New Roman", serif"><span style="font-family: "Century Gothic", sans-serif">$1055</span></span></span><br>
<br>
<span style="font-size: 12pt"><span><span style="font-family: "Times New Roman", serif"><span style="font-family: "Century Gothic", sans-serif">Install (1) New Light Craft 300 W Transformer</span></span></span></span><br>
<span style="font-size: 12pt"><span><span style="font-family: "Times New Roman", serif"><span style="font-family: "Century Gothic", sans-serif">Install (16) LightCraft Standard LED path Lights</span></span></span></span><br>
<span style="font-size: 12pt"><span><span style="font-family: "Times New Roman", serif"><span style="font-family: "Century Gothic", sans-serif">Install (3) Light Craft Standard LED up lights.</span></span></span></span><br>
<br>
<span style="font-size: 12pt"><span style="font-family: "Times New Roman", serif"><span style="font-family: "Century Gothic", sans-serif">$4,674</span></span></span><br>
<br>
<br>
<br>
 '),
  (5120299, 2, 'Add additional turf to one putting green 120 Sq ft<br />
<br />
30 1 gallon plants<br />
30 5 gallon plants<br />
60 linear feet of benderboard.<br />
2 24 in box trees'),
  (5122952, 9, '<br>
1. The price included the artificial turf in the 3 measured areas and will be the same turf as installed in the backyard.<br>
2.  All irrigation included<br>
3. 3 new trees.  I believe we agreed to the 24” box fruitless pear and a 15” box for both the hot pink crape myrtle tree and a new tree (can’t remember the name) that matches the one close to the neighbors house by the property line where our previous one blew over)<br>
4.  New steel edging to match the backyard to separate our lawn with the neighbors.<br>
5.  Flex edging for all planters'),
  (5122965, 10, 'Change Lime from a 15 gallon to a 5 gallon.&nbsp;'),
  (5124395, 2, '- 10 (1 gallon) Eliljah Blue Fescue<br>
- connect new plants to irrigation drip line (time + material)'),
  (5124560, 11, 'Add two more path lights to the back.&nbsp;'),
  (5124911, 15, 'Remove existing sod/soil 3" below final grade<br>
Install mix of smaller Mexican Beach pebbles as "river" and larger beach pebbles to anchor each side<br>
Area is approx 80" x 8"'),
  (5125869, 10, NULL),
  (5125908, 11, NULL),
  (5125934, 3, NULL),
  (5127264, 16, NULL),
  (5129753, 1, 'Additional wall amount during walkthrough 575<br>
 '),
  (5129762, 2, '24 linear feet of conduit 480<br>
one weather resistant outlet 90'),
  (5134776, 51, 'Add 432 linear feet of main water line.  Buried 12 inches. Then backfill and recompact.  Add in Spigots.<br>
Normally $27/ft per price list.  Good client discount to $21 per foot.  $9072.<br>
<br>
Remove gravel in slippery section. Add Timber for 24 linear feet of side retainment.  Then add (3) 4 foot steps across.  $4375.<br>
Add gopher mesh. Backfill with base to make level walking pads and compact about 4-5 yards.  Reinstall gravel  $935<br>
<br>
Repair other steps and add gopher mesh to bottom steps.  $550<br>
+1 irrigation valve with one stub up +200<br>
<br>
 '),
  (5134976, 1212927, 'Pavers have settled due to water will need further assessment after raising the pavers.
1-we will need lift about 100 square feet of pavers 

2- remove sand and road base to test soil compactation if soil is not compacted we would need to compact soil in lifts, add road base, sand and install pavers with a 1.5 pitch away from the house. ( soil compactation will be an additional $640. Or more pending on how low we will need to compact.)

'),
  (5136592, 1, NULL),
  (5136598, 2, NULL),
  (5136609, 3, 'In the original estimate, 260 linear feet of bender board was factored into the total cost of the DG pathways.  <br>
We are still using bender board to separate the turf from mulched areas'),
  (5136615, 4, NULL),
  (5136648, 5, NULL),
  (5136677, 6, NULL),
  (5138431, 14, 'main line repair front yard $300<br>
<br>
 '),
  (5139837, 15, NULL),
  (5144002, 12, NULL),
  (5144056, 13, '6- one gal. Garlic
12- one gal. Daylilies
12- five gal. Iceberg rose''s 
3- 15 gal. Phoenix Roebeleni
4- 15 gal. Ligustrum 

6 bags 2-3" river rock and 4 bags 3/8 with weed fabric 

300 square feet of brown shredded mulch 

'),
  (5144082, 14, NULL),
  (5144171, 2, '8 5 gallon plants<br>
4 1 gallon plants<br>
<br>
434 credit issued'),
  (5144175, 3, '4 1 gallon plants 21.50 each<br>
2 5 gallon plants 43.50 each <br>
1 300w multitap low voltage transformer $437<br>
<br>
Total 610'),
  (5144218, 7, NULL),
  (5146566, 1, '5 agave striata  360<br>
8 1 gallon red yucca 22 176<br>
3 octopus agave 135<br>
3 5 gallon mexican fence post at 150 each, you have a credit of 45 each on those so total cost on them is an additional $315<br>
<br>
you have a credit for 5 prickly pear 360<br>
<br>
total cost of the plantings is 626<br>
<br>
Gravel with 12 linear feet of bender board is $322<br>
<br>
Total cost is $948<br>
<br>
 '),
  (5147142, 4, 'Some of the plants we could not get in the sizes in the contract.  Those plants gave a credit as detailed below:<br>
<br>
We moved 4 15 gallon down to 5 gallons = $424 credit<br>
We moved 5 5 gallon to 1 gallon = $110 credit<br>
<br>
 <br>
 '),
  (5148470, 12, 'We realized we cannot install jasmine vines there best to have them in pots.  This is a credit for those plants.  Thanks!<br>
<br>
5 5gallons @ $44.each'),
  (5151068, 1, 'Extending coping on both sides of pool for a total of 10 additional linear feet'),
  (5151084, 2, 'Separating grass from gravel, around fig tree
24 linear feet (15 for gravel and 9 for tree) '),
  (5151090, 3, NULL),
  (5151124, 4, 'Adding trains to compensate for grade shift due to pool being lower than pathway 
Will keep surface water from seeping into pool/studio'),
  (5151346, 5, '(4) uplights
(2) well lights '),
  (5152849, 13, NULL),
  (5152891, 14, 'We had in contract 690 SF of turf.
We need 795 SF of turf.

Cost difference = 105 SF @ $11.25/SF '),
  (5152920, 15, '29 LF of 3/4" conduit from pool to bbq

White wire in existing box was not neutral it was ground. Please speak with Jorge for questions.'),
  (5153418, 1, '(3) 15g wire basket @ $30/each = $90<br>
(14) 5g wire basket @ $10/each = $140<br>
(29) 1g wire basket @ $9/each = $261<br>
<br>
65 Square Feet wire grid for groundcover @ $2.50/SF = $162'),
  (5156193, 12, '$17913. Total 
$8045. In contract 
$9868 in change order. '),
  (5156579, 10, NULL),
  (5160510, 1, '14lf x $14.50= $203.00.  +  4 lf step build v $60.00= $240.00'),
  (5162053, 6, NULL),
  (5165277, 13, NULL),
  (5165282, 14, NULL),
  (5166813, 17, NULL),
  (5168644, 1, '40 LF of 3" SDR with three matching downspout connections'),
  (5168656, 2, NULL),
  (5168670, 3, '22 LF of main line 3/4" PVC from back yard to planting area (where valves will live later).'),
  (5168671, 4, NULL),
  (5168735, 5, '77 LF of 3/4" poly line in sand 18" below grade with detection wire '),
  (5169492, 7, NULL),
  (5174037, 1, NULL),
  (5174040, 2, NULL),
  (5174848, 3, NULL),
  (5175227, 6, '(5) 12" x 16" concrete footings for fence.<br>
(4)18" x 18" concrete footings for pergola.'),
  (5178014, 7, 'Owner specified specific post braces Simpson MPB66Z.

For pergola this will require $50 extra cost per footing because braces specified. (Fence post braces are ok)

'),
  (5182801, 4, NULL),
  (5183676, 8, 'Used Brick from La Canada Rustic Stone - Install of pathway is 85 SF. add $425<br>
(2) 2''6" Used Brick steps - add $100<br>
<br>
If we install more than 85 SF of brick for pathway, cost will be @ $25/SF (since we are sprinkling in some of your own used bricks).'),
  (5184236, 1, NULL),
  (5184325, 1, '1. Irrigation- two dedicated valves for existing olive trees at 975 each, includes trenching, backfill, material and labor. <br>
5 24 inch box agave tequiliana at $425 each for the driveway entrance, Includes running appropriate irrigation to the agave.<br>
<br>
removal of leaning fruit tree- 410<br>
<br>
replace podacarpis in pool area - warranty<br>
<br>
cost $3510<br>
<br>
<br>
<br>
<br>
 '),
  (5188291, 6, NULL),
  (5190158, 15, NULL),
  (5191333, 1, NULL),
  (5192114, 1, '22 linear feet of 3" Drains from downspout to planter area...$506.00'),
  (5196494, 3, 'Drain repair 150 (100 dollar credit, Originally 250) <br>
<br>
Credit on 13 5 gallon plants<br>
<br>
10 1 gallon plants<br>
<br>
1112 gravel credit<br>
<br>
total credit 1892<br>
upgrade rock $2688'),
  (5196824, 1, '<br>
48 linear feet to relocate pool electric to box at house<br>
28 linear feet to run electric for fountain<br>
6 linear feet for jbox to underhouse to j box on the outside of house<br>
34 linear feet to relocate pool light electric<br>
 '),
  (5197020, 2, 'California Room floor'),
  (5197051, 3, NULL),
  (5197053, 4, NULL),
  (5197055, 5, '(3) path lights<br>
(2) up lights'),
  (5197056, 6, NULL),
  (5197066, 7, NULL),
  (5197068, 8, '(1) new spray for groundcover<br>
(1) add''l drip'),
  (5197071, 9, NULL),
  (5198764, 4, NULL),
  (5200853, 7, NULL),
  (5201516, 1, 'Adding 280 linear feet of drains throughout the back yard and front yard…
 Connect existing and future downspouts into the new drains '),
  (5201528, NULL, '45 Linear feet of electrical conduit / receptacle  for backyard fountain '),
  (5201538, NULL, 'Add Lightcraft brand low voltage lighting as designated per plan

  Cost includes., 18 lights (4 submersible, 4 path 10 well lights approximately 60 linear ft of tape light for front steps and front wall cap 300 watt transformer with timer. Unit to be installed inside the garage '),
  (5203471, 2, 'creditfor 1 24 box agave 425'),
  (5204576, 1, '90 linear feet of gas run '),
  (5204607, 2, '70 linear feet of electrical run'),
  (5204810, 3, NULL),
  (5204837, 4, NULL),
  (5204843, 5, NULL),
  (5204845, 6, NULL),
  (5209204, 1, '35 linear feet total'),
  (5209278, 2, NULL),
  (5209304, 2, NULL),
  (5209308, 3, NULL),
  (5210623, 11, NULL),
  (5212764, 12, '120 linear feet all the way around pool with (3) inlets and (1) 12 linear foot channel drain in front of Cali room'),
  (5217697, 1, 'adding 500 sq ft of del rio 3/8ths to side yard'),
  (5218830, 2, NULL),
  (5219221, 7, NULL),
  (5221789, 3, 'We need to rebuild 8'' of 8" CMU wall from the crack over at 3'' high. This is with a new footing.'),
  (5225064, 9, 'See #5 in contract.'),
  (5225447, 1, NULL),
  (5226732, 1, 'Credit on turf $130 <br>
Stump removal $210<br>
<br>
 '),
  (5232368, 4, '(3) 5g Salvia ‘Black and Blue’
(4) 5g Westringia ‘Grey Box’
(2) 1g Dianella ‘Lil Rev’
(3)1g Salvia farinacea
(3) 1g Salvia pink
(1) flat Senecio
(1) 5g Red Yucca

'),
  (5232718, 5, '(2) hours of design work includes plant placement and selections'),
  (5236297, 2, 'Installation of 1,250 Simple Turf Bel Air Supreme 116      1,250 X  $10.50  ($13,125.00)<br>
Installation of 160 sq ft (TBD) Putting Green 160  X $16.20  ($2,592.00)<br>
Putting Green Cups/Flags   4 x $93.00  ($372.00)<br>
<br>
 '),
  (5236304, 3, 'Additional 679 sq ft of stucco which includes the side yard retaining wall as well as Rear raised planter wall plus the visible sides to neighbor<br>
 '),
  (5236316, 4, 'White Marble Pebble Upgrade vs Contracted white crushed rock'),
  (5238917, 13, 'Very limited access to backyard having to go through the garage as well as site conditions. Extra demo for the steps leading to platform. <br>
Demo took an additional 12 man days.'),
  (5241107, 14, '(4) 6 gauge wires<br>
new breakers<br>
new subpanel'),
  (5241109, 15, NULL),
  (5241293, 16, '(1 Strawberry Unedo and 1 Olea europaea)'),
  (5247362, 8, 'Per city requirements from pre inspection<br />
1 guy 3 hours extra demo.&nbsp; add $210<br />
extra concrete 6x6 , contract had 1 1/2 by 6.&nbsp; So extra 27 sq feet. add $810'),
  (5247680, 9, NULL),
  (5250258, 9, NULL),
  (5250839, 3, 'Additional Flagstone for patio which includes labor and material.&nbsp; Installed additional amount of 103 pieces.&nbsp;&nbsp;'),
  (5251068, 4, '3" deep of Brown shredded mulch WITHOUT weed barrier.<br />
300 SF for upper and lower planters.<br />
$555<br />
<br />
Demo - Upper planter soils need to come down 2" to make it flat.'),
  (5251075, 10, '@ $130/CY as in contract.'),
  (5252086, 1, '9x 3 x 18”'),
  (5256577, 10, 'We are needing to separate a valve for the myoporum groundcover slope.&nbsp; There are issues with runoff from the neighbors property creating flooding in Bevers yard.&nbsp; This is to be able to control the extra runoff.&nbsp;&nbsp;'),
  (5258201, 1, 'Adding to the length of the first step when you come throught the front gate - step was 4'' long and is now 6.5 LF'),
  (5258250, 17, NULL),
  (5258264, 2, 'In order to get our levels right, we are adding a 4''2" step after the retaining walls (front yard pathway).<br />
Typical rise, typical step tread.'),
  (5258286, 3, 'Step is 3'' 5" wide with 1'' 10" landing.<br />
typical 6" rise<br />
sand finish<br />
*includes demo'),
  (5258300, 4, 'Adding 27 SF of concrete to walkway when you first get past the gate, the width of pathway will be 6''6" and then it will end at retaining walls.<br />
<br />
Price as in contract is $14.50/SF<br />
 '),
  (5258338, 6, 'Connect all drains on the studio and grass side of house to our existing drainage plan (which, separately is 170 LF, and is included in our contract).<br />
2 Downspouts will connect to our drains underground.<br />
Two drain grates will be in grass area to prevent flooding and catch water.<br />
All drains will connect to one central spot (pop ups).<br />
Drainage will go inbetween studio and house and jog down the sideyard to the frontyard where it will connect with popups.<br />
<br />
&nbsp;'),
  (5258349, 7, 'Jorge recommended that drains on gravel side of house should be larger because they are collecting a lot more water.<br />
This is the cost difference of a 3" PVC pipe to 4" for 170 LF.'),
  (5258526, 8, 'Parkway demo - 3" of mulch and weed fabric 980 SF. **CLIENT HAS HANDLED ON THEIR OWN.<br />
<br />
Demo of 3" below grade, tilling, grading, and adding amendments in prep for future planting WITH weed fabric. 980 SF - $2,675  <strong>**THIS IS ALREADY DONE.</strong><br />
<br />
Del Rio gravel - approx. 600 SF at 3" depth. $1,200 (DISCOUNTED)<br />
<br />
Install 12-14 (2x2 grey steppers on-site) - 2 guys 2 hours $300<br />
Install cobble stones as border of planters in parkway - 2 guys 2 hours $300<br />
<br />
<u><strong>PLANTS- $354</strong></u>
<div>For the non-Oak side:</div>

<div>(3) 1g lavender</div>

<div>(2) 5g boxwood japonica</div>

<div>(5) 1g Salvia Blue Spires<br />
Oak side: (4) 1g Bluestar creeper groundcover</div>
<br />
<strong>I<strong>RRIGATION </strong>- </strong>(1) brass value drip zone $965<br />
<br />
This was updated on 9/21.'),
  (5258613, 9, 'We aren''t doing demo in the side yard from edge of garage (past shed) towards end of ADU. We will just MIX in the del rio.<br />
<br />
The area to the Left of the garage still needs to come down 3" (because right now gravel tends to spill over).'),
  (5258629, 10, '192 LF of 3" SDR PVC drain pipe $4,415 (@$23/LF)<br />
3 Downspouts will connect to drains underground - one at garage, 2 at house $85<br />
Two drain grates will be in grass area to prevent flooding and catch water. @ $75/each = $150<br />
Drain to connect to 4" pipe in front yard and to exit at street <br />
Permits $800 **We will credit you if less, cost is permit + admin hours for pulling permit $150/hr. We will share permit cost with you.**<br />
Saw cut, demo, core curb at street and re-pour concrete in broom finish $1,200<br />
 '),
  (5258826, 11, 'Demo and pour 3,000 psi concrete for 7 SF with sand finish to match.'),
  (5265759, 12, 'Not doing extra step in backyard 3 LF.'),
  (5266453, 13, '<strong>Concrete Retaining walls in backyard #2 in Contract Addendum</strong><br />
<br />
$3,527 (CREDIT)'),
  (5266540, 14, '55 Lf. @ $25. LF.  $1375. Discount for trenching 
37LF.  @ $40. LF.  $1480.
 Total $2855.00'),
  (5267068, 5, 'didn''t install 2 flats. '),
  (5267900, 35, 'Order for (3) up lights - same up lights from installation. <span><span dir="ltr" style="left: 181.53px; top: 958.182px; font-size: 9.8px; font-family: sans-serif">FL-105B</span><span dir="ltr" style="left: 181.53px; top: 969.452px; font-size: 9.8px; font-family: sans-serif"> Big Smoky Accent Light w/Glare Contro</span></span><br />
Not going up any trees.<br />
<br />
We need some (maybe 2-3) extenders so the lights near jasmine path can come down and re-purpose the extenders to put path lights in center of boxwood hedge, as some are not in center, they are on outside.<br /><br />Please check irrigation and plants that look like they are dying.<br />
<br />
 '),
  (5268152, 5, 'Additional plants:<br />
<br />
(6) 15 gallon Pygmy Date Palms<br />
(2) 24" box Pygmy Date Palms<br />
(1) 24" box Queen Palm<br />
(1) 15 gallon Queen Palm'),
  (5268703, 4, NULL),
  (5273415, 2, 'This is a credit of (3) step lights for the deck area'),
  (5273432, 3, 'Installation of additional 90 sq ft of artificial turf to the backyard'),
  (5276304, 1, 'Run main line behind new retaining wall 
About 25 LF. '),
  (5276327, 2, 'Electrical includes 
91LF. Conduit with wire
2- breakers 
1-outlet'),
  (5276905, 6, 'Credit for (1) 15 gallon Queen Palm in backyard&nbsp;'),
  (5276908, 3, 'Less soils removed - $1400 credit<br />
Less course on wall on tall section - $780 credit<br />
Less turf installed - $1320 credit.'),
  (5276962, 7, 'Raised planter 3/4" crushed white gravel for backyard'),
  (5285579, 3, 'Brick veneer on the riser. approximately 15 linear feet<br />
<br />
Material;&nbsp;Pacific clay Iron lights brick veneer<br />
One box, the material is TBD. We are waiting to hear from distributor on estimated delivery and price. We estimate&nbsp; $75-80<br />
<br />
Installation will take approximately 3-4 hours.&nbsp;<br />
&nbsp;'),
  (5288546, 2, 'Includes (2) separate risers with rotary heads for HOA planted areas&nbsp;'),
  (5290334, 4, '9 zones of irrigation at 800 each'),
  (5290811, 15, 'Permit was $491
One hour for permit @ $150/hr = $641
$800 allowance for permitting - $641 = $159'),
  (5290978, 1, '2 citrus '),
  (5294544, 3, NULL),
  (5296341, 2, 'Install (1) Bubbler zone and (1) 4 station timer for front yard trees'),
  (5300000, 2, 'Saw cut concrete for electrical access to the spa location. '),
  (5300636, 3, 'Add 2.5 yards of brown shredded mulch to backyard landscape. No weed fabric '),
  (5301530, 16, 'We have in contract 770 SF.<br />
We need 710.<br />
<br />
Credit is for 60 SF of St AUG sod.<br />
<br />
&nbsp;'),
  (5301556, 17, 'We have 875 SF of sod in Frontyard in contract.<br />
With current layout we have 1,175 SF.&nbsp;<br />
<br />
Difference is 300 SF = $1,300'),
  (5301562, 18, 'Clients will PURCHASE and PLANT the roses (18 - 5gallons) or whatever they like!'),
  (5301588, 19, 'We have 868 in contract and crew measured 1006.<br />
<br />
Difference of 139 SF.'),
  (5304020, 16, NULL),
  (5306340, 12, '<p>Plants backyard - (3) 5g lavender, (1) 15g Bird of Paradise (2) 5g tbd.<br />
Plants front yard - (1) 15g, (10) 5g, 5 (1g)<br />
Plants side yard - (4) 5g<br />
TOTAL PLANT COST $1,975<br />
Includes adding emitters to these new plants AND checking older plants for any leaks.<br />
<br />
Mulch - 1 CY Gorilla Hair @ 3" depth $225<br />
<br />
Wire for jasmine on back walls $300</p>

<p>Remove giant bird of paradise and replace with regular bird of paradise (as we had planned initially). <em>No charge for removal of larger bird of paradise, only for (1) 15g included in plant total above.</em></p><p>Includes fixing cactus that are buried.</p><p>Plant removal TBD.</p><p>
<br />
 </p>
'),
  (5309225, 4, 'Wall will be 2 courses high with no more that 7"footings 2'' from back neighbors wall.
In grey split face'),
  (5314450, 1, '9 additional linear feet of electrical<br />Z $25.00= $225.00<br />12 linear feet of gas line 1" x $36.00= $420.00<br />$645.00 total'),
  (5314506, 5, '2 24" Ficus<br />
3 15 gallon Dodos'),
  (5314515, 6, 'Credit for 1 15 gallon Mont cypress and 1 15 gallon Honeysuckle'),
  (5314530, 7, NULL),
  (5314751, 8, NULL),
  (5315679, 1, '<table border="0" cellpadding="0" cellspacing="0" width="564">
	<colgroup>
		<col width="367" />
		<col width="111" />
		<col width="86" />
	</colgroup>
	<tbody>
		<tr height="21">
			<td height="21" width="367">Landscaping Project - Picture Build</td>
			<td width="111">&nbsp;</td>
			<td width="86">&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">&nbsp;</td>
			<td>&nbsp;</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="21">
			<td height="21">Item</td>
			<td>Cost</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">Front Yard</td>
			<td>&nbsp;</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">Paver Mow Strip set in concrete</td>
			<td>&nbsp;$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 380.00</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">120 linier feet of benderboard edging</td>
			<td>&nbsp;$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 840.00</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">Turf - Socal Blend 109 (775 Feet)</td>
			<td>&nbsp;$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 9,300.00</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">Plants</td>
			<td>&nbsp;</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">23 5-gallon plants</td>
			<td>&nbsp;$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 1,005.50</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">11 1-gallon plants</td>
			<td>&nbsp;$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 236.50</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">2 24in box trees</td>
			<td>&nbsp;$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 770.00</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">5 flats of vinca</td>
			<td>&nbsp;$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 250.00</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">&nbsp;</td>
			<td>&nbsp;</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">Driveway &amp; Walkway</td>
			<td>&nbsp;</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">12 5-gallon raphilopsis ballerina</td>
			<td>&nbsp;$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 522.00</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">Roses</td>
			<td>&nbsp;$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 696.00</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">Planting Mix backfill</td>
			<td>&nbsp;$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 300.00</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">&nbsp;</td>
			<td>&nbsp;</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">Backyard</td>
			<td>&nbsp;</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">6 5-gallon semi-dwarf blue cypress</td>
			<td>&nbsp;$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 261</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">&nbsp;</td>
			<td>&nbsp;</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">Running Total</td>
			<td>&nbsp;$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 14,597</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">&nbsp;</td>
			<td>&nbsp;</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">Add-ons</td>
			<td>&nbsp;</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">Additional Turf</td>
			<td>&nbsp;$&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;300&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; -&nbsp;&nbsp;</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">Add pipes for drip system</td>
			<td>&nbsp;$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 100.00</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">Rocks with weed fabric (walkway, rose area, adu side)</td>
			<td>&nbsp;$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 926.00</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">Backyard Planters</td>
			<td>&nbsp;</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">&nbsp;</td>
			<td>&nbsp;</td>
			<td>&nbsp;</td>
		</tr>
		<tr height="20">
			<td height="20">Back planter 19 plants (excluding cyprus)</td>
			<td>&nbsp;$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 826.5<br />
			<br />
			Total $16,748</td>
		</tr>
	</tbody>
</table>
<br />
<br />
Difference from original is $1298'),
  (5319906, 1, NULL),
  (5319966, 4, NULL),
  (5320176, 4, 'Add 3 yards of mulch in side yard and back yard<br />
&nbsp;'),
  (5321426, 2, 'Change order approved via text '),
  (5322158, 1, 'Lower existing gas line below grade'),
  (5322201, 1, '50 LF - 3/4" copper main line
New hose bib'),
  (5322209, 2, '1 weatherproof outlet above existing'),
  (5322226, 3, 'Keeping bamboo '),
  (5322234, 4, 'Credit for cutting down jasmines'),
  (5322842, 5, '(11) brown 4" grates
(11) PVC pipe for deep water'),
  (5323489, 1, 'Additional 160 Sq ft of dg with Edging '),
  (5323514, 1, NULL),
  (5323870, 9, '(2) Chinese Elm Trees<br />
(1) Live Oak Tree'),
  (5323871, 10, NULL),
  (5323872, 11, NULL),
  (5323874, 13, 'Soil removal from Monterey Cypress bed and where Pine tree was located<br />
Additional grading required than what was listed in contract<br />
Dump fees included in this change order'),
  (5323881, 18, 'Installing 
 
3- 1gal. Feather grass
3- 15gal. Silversheen 

Total $514.5
'),
  (5325996, 3, NULL),
  (5327301, 2, NULL),
  (5328787, 4, NULL),
  (5330437, 14, NULL),
  (5333560, 20, 'Jorge sprayed out the area for the bender board in back along wooden fence.&nbsp; This will house the trees (and any future plantings).<br />
37 LF'),
  (5335937, 6, 'We need 34 extra LF for dog run area.
I have given a discounted cost @ $8.75/LF (it''s $10/LF in contract).'),
  (5337814, 5, NULL),
  (5337828, 6, NULL),
  (5339763, 1, NULL),
  (5341719, 15, NULL),
  (5342013, 8, '<br /><br />Add (3) 15 Gallon plants for the pots&nbsp;'),
  (5342026, 9, 'This is a credit for (5) spot lights as they were not needed and wanted'),
  (5342078, 10, 'Additional turf for parkway, driveway side and upper left area at the house.  These measurements were not initially factored in due to the fact that construction was still ongoing and didn''t have accurate areas of detail'),
  (5342174, 5, NULL),
  (5344439, 7, NULL),
  (5344445, 8, NULL),
  (5344840, 4, NULL),
  (5345160, 17, NULL),
  (5345266, 9, '1500sqft of Marathon<br />
I plus 2 zones of Irrigation&nbsp;'),
  (5348102, 18, NULL),
  (5348645, 1, 'Need water source to backyard - 

11 LF 1/2" copper water line (attached to foundation) @ $38/LF
16 LF 1/2" PVC pipe (under deck) @ $27/LF'),
  (5348743, 2, '13 additional LF of RRv ties for steps going down'),
  (5353049, 7, 'We need 9 gallons of spray on stabilizer.
Labor included.'),
  (5353080, 2, NULL),
  (5353096, 3, 'Credit of112sf x $2.25 $252.00<br />Add rock 112 x $5.50= $616.00<br />+$364.00'),
  (5353124, 4, '8 x $100.00=$800.00'),
  (5353159, 5, NULL),
  (5358986, 1, 'Adding turf strip on top&nbsp;'),
  (5359050, 2, '8 linear feet of poured concrete to be the base for the wooden IPE wall that Craig will install&nbsp;'),
  (5359129, 3, 'To stablilize joints between pavers&nbsp;'),
  (5359133, 4, 'For a total of 1014 pavers (contract has 985)&nbsp;'),
  (5359145, 5, '53 linear feet of 4" SDR 35 drain pipe<br />
(3) plastic inlets<br />
(4) inlets (for paver area, will be finished in the paver) '),
  (5359190, 5, NULL),
  (5359364, 20, NULL),
  (5359412, 2, 'Plant credit for plants not installed per contract.&nbsp; I have reviewed the order list and reflected what was installed to what was installed.&nbsp;'),
  (5359755, 38, '<div>The 3 Olives replacing the 3 Camellias (to be transplanted) should be 5 gallon dwarf "patio" olives (short single trunk) - the same as those in the large, tall pots around the patio. I found those at La Crescenta Nursery and they are priced accordingly.<br />
<br />
Cost includes replanting camellias and irrigating them in their new spots. **Karelaine to flag</div>
'),
  (5359756, 39, NULL),
  (5359775, 3, 'Approx. 200 SF of weed fabric used to target grassy areas of hillside.<br />
Double up the weed fabric to black out the grasses. Not all areas have persistent weeds.<br />
<br />
*This is a measure that we use to combat weeds, it is by no means a solution to weeds never coming back.<br />
**By signing this change order, you agree that other measures should be used to combat weeds after Picture Build is off of the job site.'),
  (5360780, 6, NULL),
  (5366518, 18, 'both are 15 gallons'),
  (5366633, 19, '(10) 1g Dianella ''little rev''<br />
(6) 5g Muhlenbergia ''Regal Mist''<br />
(4) 5g Pittosporum ''Silver Sheen''<br />
(3) 5g Salvia ''Mystic Spires''<br />
(3) 5g White Iceberg Roses<br />
(3) 5g Westringia ''Morning Light''<br />
(1) 5g Salvia greggii <br />
(9) 1g Limonium <br />
 '),
  (5366776, 4, '(1) outdoor weatherproof outlet with cover<br />
<br />
There is no other power outside.<br />
&nbsp;'),
  (5368753, 2, '250 additional Sq ft of Concrete $1900<br /><br />Demo for backyard to level 600 cu ft by bobcat<br />2508<br /><br />Total $4408'),
  (5368972, 5, '(5) 12'' boards with rebar to hold up new pathway across upper slope to new steps location'),
  (5370512, 7, NULL),
  (5370521, 8, '(3) up lights&nbsp;<br />
(1) transformer'),
  (5370583, 20, '+1 uplight<br />
+1 path light<br />
+4 accent lights'),
  (5371318, 21, 'one additional up light $225<br />
<br />
- per client note in previous CO&nbsp;<br />
<br />
Total of 3175 in new change orders.&nbsp; $95.25'),
  (5371455, 6, '7 plants @ $22 extra each ~ $150'),
  (5371473, 5, 'Form and pour about 18 concrete pads 
With 1" minus del rio. gravel in strips 
'),
  (5371556, 7, NULL),
  (5371621, 6, NULL),
  (5373609, 1, '(2) 5 gallon purple Salvia greggii<br />
(8) 1 gallon orange daylilies&nbsp;'),
  (5377809, 23, NULL),
  (5378109, 26, NULL),
  (5378320, 27, NULL),
  (5380322, 11, 'Succulent planting for (4) pots in the Front Yard'),
  (5380412, 29, NULL),
  (5380489, 30, NULL),
  (5382470, 1, NULL),
  (5382474, 2, 'No charge!'),
  (5382482, 3, NULL),
  (5382484, 4, NULL),
  (5382515, 5, '172 SF (mix of pink and white kurapia)'),
  (5382577, 6, 'For area near pool equipment'),
  (5383417, 1, NULL),
  (5383474, 3, NULL),
  (5385048, 31, NULL),
  (5387248, 2, 'Additional pavers. '),
  (5387283, 3, '<br />2)  To add the 2 planters 2X240= 480 X $5.50= $2,640.00- Demo in contract $936.00= $1,704.00 (we can throw rock on the side of the walkway going back, with any overage)<br />'),
  (5387848, 10, 'White pebble cost upgrade'),
  (5387863, 12, 'Rock cost upgrade to original scope of work'),
  (5388143, 22, NULL),
  (5388146, 23, '(3) 5 gallon shrubs<br />
&nbsp;'),
  (5388234, 1, 'Need to order 1 pallet to satisfy sq footage.&nbsp; There is not enough pavers on hand to complete the extension'),
  (5388241, 2, 'Replace coping and various pavers that have old fence posts and plugs around the pool'),
  (5392315, 8, 'This outlet was not necessary'),
  (5395254, 3, 'Brick border re alignment '),
  (5396484, 9, 'Add (12) 5 gallon plants Total
        (8) Ligustrum
        (4) Dwarf Bottlebrush

Add (4) 1 gallon plants Total
        (2) Tuscan Rosemary
        (2) Sage
        ');

UPDATE bids b
SET custom_co_id       = u.custom_co_id,
    scope_of_work_html = NULLIF(u.scope_html, '')
FROM _co_backfill u
WHERE b.bt_change_order_id = u.bt_co_id;

COMMIT;
