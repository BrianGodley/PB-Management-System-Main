-- ============================================================
-- CO Backfill — Batch 5 of 5
-- Updates 1,332 bids rows (rows 5345-6676 of 6,676)
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
  (7316091, 21, NULL),
  (7319612, 15, '(10) 15 gallon Silver Sheen<br />
Small selection of yarrow, salvia and Westringia for underplantings'),
  (7321911, 12, '1,799 sf X .90 cents = $1,619.00'),
  (7321916, 13, 'CMU Wall block with CMU block cap to match existing.  7 linear feet, please match 2''-30" high'),
  (7321919, 14, 'Adding 7 @ 10" wide  step lights under the wall caps in the courtyard.  The step lights for the steps will be the same.<br />
All dark bronze'),
  (7321929, 15, '3 concrete pads for fountains<br />
2 @ 15" X 28" to go in front planter<br />
1 @ 32" X 32"  in backyard.'),
  (7321933, 16, 'This is to lower the grade and cover the weep joints in planter next to the house by 6".  see daily log for 7-29-2024'),
  (7321937, 17, '2 rustic wall blocks framing entry steps.  30"-34" high  in Tuscan blend'),
  (7322459, 1, '12 acacia 5 gallon
12 carex sedge 1 gallon '),
  (7328135, 47, 'Remove sod,&nbsp; Trench roughly 50 feet, adjust irrigation system.&nbsp;<br />
Instal 1 inch conduit.&nbsp; Recompact and relay sod.'),
  (7328159, 48, 'Kitchen stain and sealing was not in previous change orders.&nbsp;'),
  (7337397, 2, '5 hours of labor at $95 per hour<br />
$200 dollars of material<br />
$675<br />
&nbsp;'),
  (7338426, 22, NULL),
  (7340101, 49, '$2.50 per foot for sealing<br />
$.75 per foot for cleaning.<br />
Good Customer discount&nbsp; &nbsp;$.50 per foot<br />
<br />
Total $2.75 per foot.&nbsp;<br />
Total footage 1964<br />
<br />
$5,401<br />
&nbsp;'),
  (7340215, 50, 'Burbank requested a permit on the Outdoor Kitchen.<br />
&nbsp;'),
  (7340481, 3, NULL),
  (7340744, 51, 'Reimburse credit given by 360 for Picture Build trash removal.<br />
<br />
Price to 360 was 1500.&nbsp; Price reduced to 1300 to remove profit'),
  (7341054, 2, NULL),
  (7343247, 18, NULL),
  (7345251, 6, NULL),
  (7346724, 23, 'Total wall is approx 85 linear feet<br />
50L x 2 1/2" tall <br />
23L x 18" tall<br />
12L x 12" tall <br />
<br />
Wall price includes waterproofing and smooth stucco'),
  (7346742, 24, 'Wall (curb) approx 73'' <br />
13'' x 16" tall<br />
60'' x 1'' tall <br />
<br />
Includes smooth stucco'),
  (7346750, 25, 'Install Palermo cobble for approx 2900sqft&nbsp;'),
  (7346792, 26, 'Removing existing asphalt driveway plus soils beneath final grade, grade entire area @2900sqft<br />
Remove existing retaining wall/footings, grade in prep for new wall @ 85 linear feet x 18" <br />
Remove curb hugging driveway, lower slope, grade in prep for new curb/small wall @ 73 linear feet '),
  (7352380, 3, NULL),
  (7352381, 4, NULL),
  (7352382, 5, NULL),
  (7356782, 19, 'Weed guard under all kurapia and all plants. 1,350 sf x .95. (95 cents)'),
  (7360335, 1, 'additional irrigation valve'),
  (7360722, 1, 'misc add ons<br />
timer<br />
cobble for mulch'),
  (7362151, 1, NULL),
  (7368201, 20, '5 additional step lights'),
  (7369666, 3, NULL),
  (7372381, 2, NULL),
  (7372561, 1, NULL),
  (7372564, 2, NULL),
  (7372567, 3, NULL),
  (7373414, 3, NULL),
  (7373907, 5, '16 ficus stumps, removed and debris hauled<br />
4&nbsp; ficus stumps cut to grade, drilled and stump killed'),
  (7374754, 10, NULL),
  (7374769, 11, '4- 5 gal creeping fig 22- gal shurbs $658<br />
190 sq ft of decorative&nbsp;gravel $864'),
  (7374773, 12, NULL),
  (7378792, 4, 'Permit fees sidewalk $1200<br />
Traffic Control $600<br />
Admin Hours for Permits $450'),
  (7381388, 6, NULL),
  (7381393, 7, NULL),
  (7381405, 8, 'using existing line, from planter to valve, no warranty on irrigation&nbsp;'),
  (7381421, 9, 'For back permieter planters&nbsp;'),
  (7385501, 1, '15 pieces of flagstone and 60sqft of demo'),
  (7385504, 2, NULL),
  (7385509, 3, NULL),
  (7385512, 4, NULL),
  (7385518, 5, NULL),
  (7385525, 6, NULL),
  (7390286, 30, '1) Install 3 new irrigation zones for lawn area.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;$3,300&nbsp;<br />
2) Run new wiring to equipment (difficult install). $450&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &nbsp;&nbsp;<br />
3) Till and grade soils for Sod, amend and compact 1600 sq feet.&nbsp; $4170<br />
4) Install 1600 sq feet of St Augustine (St Augustine is a premium sod).&nbsp; $3780<br />
5) 180 sq feet of Belgard Victorin paver stepper in lawn area.&nbsp; Includes 7 inches of demolition, 3 inches of base, one inch of sand.&nbsp; Mix concrete and concrete wet lay all out edge paving. $5,875<br />
6) Remove soils and grade Install 72 sq feet of DG. $475<br />
7) Install chicken coop and cage foundation work.&nbsp; Includes 72 linear feet of block set on concrete footings with rebar and grout lift cells.&nbsp; 218 sq feet of gopher mesh.&nbsp; 115 cubic feet of 3/4 limestone gravel. 48 cubic feet of soils compacted.&nbsp; &nbsp;$6,460'),
  (7391873, 7, 'Replacing a 15 gallon Podocarpus<br />
We will flush the lines and do an irrigation inspection as a courtesy after the installation is complete.'),
  (7392211, 7, NULL),
  (7394309, 16, NULL),
  (7397002, 11, '133sqft of tile&nbsp;&nbsp;'),
  (7399163, 2, 'Deck<br />
Dig footings for approx. 52 LF of deck sub wall<br />
Pour 24” x 12” concrete footings<br />
Install #4 rebar in footing<br />
Install #4 vertical rebar at 16” on center<br />
Pour 3000 PSI concrete footing<br />
Wet lay first course of 8x8x16 CMU block<br />
Install additional courses per plan up to 12” HT.<br />
Install approx. 210 SF of Trex ‘Transcend’ composite decking per plan (Color: ‘Havana Gold’)<br />
COST $13,225<br />
<br />
Gravel - Rear Yard<br />
Remove an average of 8” of soil over approx. 400 SF<br />
Lay weed barrier fabric<br />
Install approx. 560 SF of ?” Del Rio gravel per plan<br />
Install approx. 110 LF of black metal edging per plan<br />
COST $6,795<br />
<br />
Complete Wall<br />
Layout retaining wall per plan, approx. 15 LF x 36” HT.<br />
Use existing concrete footing for wall<br />
Install #4 horizontal rebar for mid & top bond beam block<br />
Fill/grout cells<br />
Install perforated drain behind walls and connect to drain system<br />
COST $1,749<br />
<br />
Stem Wall<br />
Layout stem wall per plan, approx. 16 LF x 18” HT.<br />
Excavate for and pour concrete footing for stem wall<br />
Install #4 rebar in footing<br />
Install #4 vertical rebar at 16” on center<br />
Pour 3000 PSI concrete footing<br />
Wet lay first course of 8x8x16 CMU block<br />
Install additional courses per plan up to 18” HT.<br />
No wall finish included<br />
COST $1,150<br />
<br />
Softscape & Irrigation<br />
Soil prep approx. 700 SF of planter area with 1" compost tilled to 6" deep<br />
Install (3) zones drip line or drip emitter zones<br />
Install (3) rainbird anti-siphon valves with drip filter & regulator<br />
Connect valves to existing controller<br />
Install 733 SF of shredded bark mulch, approx. 3" thick (no weed barrier included)<br />
Install (2 qty.) ‘Angelus’ brand Paseo II 24x24 steppers<br />
Install the following plant sizes/quantities:<br />
(4) 15 GAL trees<br />
(98) 5 gal shrubs<br />
(25) 1 gal shrubs<br />
(10) dirt flats<br />
Includes plant monitoring for 30 days after installation<br />
COST $11,894<br />
<br />
Job Total $79,810<br />
 '),
  (7401517, 5, NULL),
  (7401526, 2, NULL),
  (7404425, 21, '12 5 gallon gopher baskets @ $22.00 each'),
  (7409186, 22, '839 sf gopher ness x $2.00'),
  (7409195, 23, '20 more 5 gal for wax leafs in back of gate. Approved verbally to Jesus'),
  (7409243, 24, 'Additional plants over the original budget'),
  (7409312, 25, '1. 2  Flats of Dianthus. @ $75.00.  $150.00<br />2. 12 1 gallon salvias. @ $21.50.   $258.00<br />3. 8 5 gallon gardenias @ $43.50. $348.00<br />4. 2  5 gal Fox tail agave @ $43.50. $87.00<br />5. 2 15 gallon secco @ $150.00. $300.00<br />Total: $1,143.00'),
  (7409787, 26, '30 baskets for hillside lavender and gardenias $22.00 = $660.00'),
  (7409873, 13, NULL),
  (7410398, 27, 'This is the list Tammy ordered today:<br clear="all" />
The planting is looking amazing!<br />
Today''s additional plants to be delivered 8/27/2024:This should complete the landscaping in plants.  If you find that you want a few more during the next month where we will be having our weekly yard checks, then I can add them for you.<br />
1.  4 @ 5 gallon Gardenias X $43.50= $174.00  (On slope)<br />
2.  10 @ 5 gallon Lavenders X $43.50= $435.00 (On slope and 4 for the front side on driveway)<br />
3.  1 @ 5 gallon White Iceberg X $43.50=$43.50 ( for front right side of patio)<br />
4.  4 pink iceberg X $43.50= $174.00 (side of driveway to match the other side)<br />
2.  2 @  15 gallon secco X $150.00= $300.00  (front columns)<br />
TOTAL: $1,126.50<br />
<br />
Please approve, thank you!!'),
  (7410430, 28, 'There are 3 Lights in your contract<br />
Plus 16 in change orders<br />
Total already charged 19<br />
Installed 6 step lights in steps<br />
Installed/will install 8 step lights in patio<br />
Will install 4 wash lights in front<br />
Will install 1 uplight in front of Strawberry Tree<br />
19 placed<br />
<br />
Contracted, need to order:<br />
3 more step lights 10" BZ ( in patio)<br />
1 more wall wash light, Wall Liter FL116B 3,000kBZ 4W (front of patio)<br />
1 uplight big smokey 60 degrees BZ 3,000k 4W (On other side of Driveway for strawberry tree)<br />
<br />
New Lights Needed<br />
2 inground lights for Columns front  (Flat Top in BZ (MR 16 ) to confirm with Jeff at lightcraft<br />
2 inground light for bench planters in the back (Flat Top in BZ (MR 16)<br />
2 wall wash lights for Tammy''s garden<br />
3 wall wash lights for side with slope planter<br />
3 uplights for columns<br />
3 uplights for 3 trees in the back<br />
Total 15 lights X $225.00= $3,375.00<br />
<br />
 '),
  (7414186, 29, '220 sf of cal gold -1" x $3.50=  $770.00'),
  (7418230, 27, NULL),
  (7418424, 14, NULL),
  (7420656, 15, NULL),
  (7422811, 2, NULL),
  (7422935, 1, NULL),
  (7424179, 6, NULL),
  (7424182, 7, '<table style="border-collapse: collapse; width: 256px" width="256">
	<colgroup>
		<col span="4" style="width: 48pt" width="64" />
	</colgroup>
	<tbody>
		<tr>
			<td style="border: 1px solid rgba(0, 0, 0, 1); height: 20px; width: 64px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>1gal</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); width: 64px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: 1px solid rgba(0, 0, 0, 1); border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>119</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); width: 64px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: 1px solid rgba(0, 0, 0, 1); border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>21.5</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); width: 64px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: 1px solid rgba(0, 0, 0, 1); border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>2558.5</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: 1px solid rgba(0, 0, 0, 1)"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>5gal</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>77</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>43.5</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>3349.5</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: 1px solid rgba(0, 0, 0, 1)"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>15gal</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>1</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>125</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>125</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border: none; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 15px"><span style="font-weight: 700"><span style="text-decoration: underline"><span style="color: rgba(0, 0, 0, 1)"><span style="font-style: normal"><span>6033</span></span></span></span></span></span></td>
		</tr>
	</tbody>
</table>
'),
  (7424184, 8, 'Sealing<br />
3650 sqft * 1.4 = $5110<br />
&nbsp;'),
  (7424207, 9, NULL),
  (7425256, 1, 'Move existing electrical for spa labor.
 25 LF 1/2 conduit w/wire'),
  (7425261, 2, 'moving main line and re running new mainline to reconnect to autofill'),
  (7425278, 3, NULL),
  (7425315, 3, NULL),
  (7425758, 60, 'Includes plumbing/steel work (plus 2 gate cylinders)&nbsp;<br />
Fixtures not included (tbd)&nbsp;'),
  (7425770, 16, 'Demo backslope in prep for new plants ($2700)<br />
Remove 2 medium sized trees ($1600)'),
  (7426143, 28, NULL),
  (7426789, 8, NULL),
  (7430689, 1, 'Additional pavers 330 sq feet<br />
additional demo 330 sq ft'),
  (7431348, 1, NULL),
  (7431832, 10, '25 5 gallon plants @ $1100<br />
1 zone drip @$1050<br />
plant placement @$200'),
  (7432400, 17, '160 feet of bistro lights plus 2 poles/hardware'),
  (7434885, 18, NULL),
  (7435402, 62, NULL),
  (7435762, 4, 'tile work for bbq backsplash. Owner provided tile'),
  (7437909, 29, NULL),
  (7442257, 6, NULL),
  (7445749, 4, NULL),
  (7445754, 5, NULL),
  (7453378, 1, NULL),
  (7453383, 2, '16 lf concrete steps '),
  (7459350, 2, 'Credit for Irrigation and Planter change, and add for new Synthetic turf and 40lf of benderboard CO dated 9/6/2024'),
  (7467537, 2, 'Price includes sand stucco for front side and waterproofing for back side, weep holes for drainage&nbsp;'),
  (7472473, 63, NULL),
  (7477917, 3, NULL),
  (7479919, 64, NULL),
  (7485664, 9, '<h2>Change order</h2>

<p>Spoke to lawerence let him know Timer wires were ripped out. I told him it would be 90 per hour, including drive time he gave me verbal authorization. Repaired and tested every valve. I also had a guy go into shed while I was getting tools from truck kicked him out. Please draft up change or for 3 hours @$90.00 per hour</p>
'),
  (7486188, 1, 'includes brown coat&nbsp;'),
  (7486189, 2, '8 linear of paver steps plus 16sqft of paver landing and demo'),
  (7486193, 3, NULL),
  (7493388, 4, NULL),
  (7496637, 3, NULL),
  (7496642, 4, NULL),
  (7496723, 30, '170sqft'),
  (7496726, 31, NULL),
  (7496730, 32, NULL),
  (7497070, 33, '+ 300sqft&nbsp;'),
  (7497072, 34, NULL),
  (7499839, 19, '(1) 15G Olive 
(3) 5G Leucadendron
(2) 5G Aeonium sunburst 
(1) 5G Golden Breath of Heaven
(2) 5G Little Ollie Olives
(3) 1G Lavender dentata
(7) 1G Salvia Greggii 
(3) 1G Westringia Morning Light '),
  (7499842, 20, '(15) 5G '),
  (7501733, 35, NULL),
  (7501734, 36, NULL),
  (7501736, 37, NULL),
  (7503347, 10, '10 linear feet'),
  (7506218, 21, NULL),
  (7506230, 38, 'Demo soils and prep areas, grade lightly, haul additional soil<br />
approx 70''x3'' to create curb appeal in front of ficus '),
  (7508898, 3, 'backfilling to raise grade in backyard patio'),
  (7510132, 5, 'left side of driveway'),
  (7510135, 6, NULL),
  (7510141, 7, NULL),
  (7510164, 8, '(12 5 gallons in contract)<br />
Added:<br />
(30) 1 gallon<br />
&nbsp;'),
  (7510232, 9, NULL),
  (7510462, 3, 'Wood Fencing<br />
Layout horizontal redwood fencing per plan, approx. 79 LF x 6’ HT.<br />
Set 4x4 posts in concrete footings<br />
Install 2x2 vertical slats with 2” gaps<br />
Install 2x4 horizontal supports<br />
Includes (2 qty.) 3’ wide matching gates per plan<br />
Paint color TBD<br />
COST $10,908<br />
Chain Link Fencing<br />
Layout chain link fencing per plan, approx. 203 LF x 6’ HT.<br />
Set posts in concrete footings<br />
Install standard detail chain link fencing at $50 per linear foot<br />
COST $10,150<br />
<br />
<s>Total Cost $22,532.00 - Finance Price OAC</s><br />
Total Cost $21,058.00 - Cash/Check Price'),
  (7510598, 4, 'Additional forming for segmented concrete with additional concrete pad '),
  (7512186, 3, NULL),
  (7512202, 4, NULL),
  (7512210, 5, NULL),
  (7512617, 1, NULL),
  (7512620, 2, 'Westringia ''Grey Box''<br />
5 gallons'),
  (7512760, 1, '$1100 permit<br />
$1500 permit run'),
  (7517437, 30, NULL),
  (7517450, 31, 'Plants:<br />
15 1 Gallon Lantanas Radiant $21.50 each for back planters $322.50<br />
15 1 Gallon Salvias $21.50 each for back planters $322.50<br />
2 5 gallon Fig Ivy (the 3 previously in C/O already) $42.50 $85.00<br />
<br />
Total: $730.00'),
  (7518257, 39, 'Driveway Walls (both sides)
(1) transformer '),
  (7521206, 14, NULL),
  (7521324, 17, NULL),
  (7523372, 1, 'driveway apron 11 lf&nbsp;'),
  (7526094, 32, '4 Lightcraft FLAT TOP IG 63 06B 3.5 W&nbsp;<br />
3 lIGHTCRAFT BIG SMOKEY FL 105B 3.5 W<br />
These are the only ones that need to be charged.&nbsp; See Daily log on Lighting'),
  (7527467, 5, 'Installed new paver area with one step in side yard by water heater and ac unit. $1800<br />
Repaired 15 sqft of pavers that were damaged and added new polysand $200'),
  (7527767, 3, NULL),
  (7528034, 1, '(3) 5 gallon Gaura ‘Whirling Butterflies’
(1) 1 gallon Blue Agave'),
  (7536269, 1, NULL),
  (7536276, 2, NULL),
  (7539223, 1, NULL),
  (7542225, 40, NULL),
  (7542824, 1, NULL),
  (7543055, 2, 'Plus (1) transformer 
Hooks for install '),
  (7543152, 3, NULL),
  (7543178, 4, NULL),
  (7543300, 41, NULL),
  (7543401, 1, NULL),
  (7547025, 10, 'Swap installed timer to smart timer'),
  (7547936, 2, NULL),
  (7549291, 1, NULL),
  (7549361, 5, '(13) 1 gall plants<br />
(2) 15 gall Standard Olive Wilsonii'),
  (7549509, 3, 'Seated wall that goes across back of pool area<br />
24 linear feet x 18" height<br />
Sanded Stucco both sides of wall<br />
Bellecrete concrete wall cap '),
  (7550053, 2, 'Adjustment'),
  (7550512, 11, 'Adding one inch of 3/4 del rio over the top of existing gravel.'),
  (7553424, 2, NULL),
  (7553523, 2, 'I dont have the original reciept but I have attached the credit card payment.&nbsp;'),
  (7554835, 3, NULL),
  (7554837, 4, NULL),
  (7555418, 65, NULL),
  (7559134, 3, NULL),
  (7574015, 33, '5 5 gallon Cape Honeysuckle for the backyard columns'),
  (7574307, 7, NULL),
  (7574574, 3, NULL),
  (7574577, 4, 'Approx 60sqft&nbsp;'),
  (7574593, 1, NULL),
  (7574595, 2, NULL),
  (7574598, 3, NULL),
  (7574599, 4, NULL),
  (7576737, 4, '1. Subcontractor shall provide a 30” x 30” concrete pad for the water heater at the ADU. The location of the pad will be determined in the field. The concrete pad shall be placed at the same time as the sidewalk concrete. $100.00'),
  (7577995, 28, NULL),
  (7578067, 5, 'Upgrade is for a top cap fence '),
  (7579591, 1, NULL),
  (7579593, 2, NULL),
  (7579598, 3, 'removal of 2 drip irrigation zones'),
  (7580484, 1, 'Additional pavers '),
  (7582373, 4, '110lf benderboard'),
  (7585011, 1, NULL),
  (7585201, 2, NULL),
  (7586303, 5, '5. Subcontractor shall provide additional courses of CMU block per field direction at the northeast and southeast corners of the Duplex and at the entry of the ADU. An area drain shall be added at the northeast corner of the Duplex and tied into the storm drain system. $2,460.00'),
  (7586792, 1, NULL),
  (7590961, 3, NULL),
  (7590969, 4, NULL),
  (7590972, 5, '8 path lights from Vista
5 wall washers 
1 transformer '),
  (7591002, 5, 'Redoing pavers in front to a different color '),
  (7592351, 6, NULL),
  (7592354, 7, NULL),
  (7592496, 9, NULL),
  (7595916, 5, '4 5 gallon privet 
1 5 gallon Jasmine 
Irrigation to all new plants'),
  (7597272, 6, 'Adding soul for pot
Adding new boarder and dump fees for removed paver
Credit for paver overage  '),
  (7597277, 6, 'Permit fees $909.09 and admin paperwork ($250)'),
  (7599681, 1, NULL),
  (7599747, 2, NULL),
  (7599759, 3, 'Pick up existing pavers in front of gate - reinstall sub base and pavers '),
  (7603678, 2, NULL),
  (7605695, 67, 'Change 2 transformers in the front yard to the smart transformers.'),
  (7605701, 1, NULL),
  (7607330, 1, NULL),
  (7609811, 22, 'Change order consists of 25 linear ft of brown bender board. Stakes and labor are included '),
  (7610254, 6, NULL),
  (7610686, 7, NULL),
  (7610758, 8, NULL),
  (7614733, 8, NULL),
  (7615181, 9, NULL),
  (7615195, 7, 'REMOVE<br />
Timber Retaining Wall Excavate for wall footings Install 24 linear feet of 6” x 6” ACQ ‘Green’ timber per plan COST $1,078.00'),
  (7615339, 8, 'forgot to add on original amount in contract'),
  (7615356, 2, NULL),
  (7618415, 1, NULL),
  (7619656, 10, NULL),
  (7625095, 1, '$220/light and install
$435 for (1) transformer installed '),
  (7627760, 8, 'First Plant Change  was $2335<br />
<br />
---------- Forwarded message ---------<br />
From: <strong dir="auto">Daniel Aguilar</strong> <<a href="mailto:daniel@picturebuild.com" target="_blank">daniel@picturebuild.com</a>><br />
Date: Wed, Oct 30, 2024, 6:47?PM<br />
Subject: planting budget<br />
To: Ruth Coyne <<a href="mailto:ruthcoyne02@gmail.com" target="_blank">ruthcoyne02@gmail.com</a>>, John Durso <<a href="mailto:john@picturebuild.com" target="_blank">john@picturebuild.com</a>>, Jorge Flores <<a href="mailto:jorge@picturebuild.com" target="_blank">jorge@picturebuild.com</a>>
<p>Hey ruth here is the breakdown for the new vs old</p>

<p dir="ltr">(2) 15 gal trees</p>

<p dir="ltr">(120) 5 gal shrubs</p>

<p dir="ltr">(135) 1 gal shrubs</p>

<p dir="ltr">(24) flats 4" plants<br />
<b>$10,035</b></p>

<p dir="ltr">New plant list 59 1 gallons</p>

<p dir="ltr">3 24 gallon trees</p>

<p dir="ltr">219 5 gallons</p>

<p dir="ltr">4 flats</p>

<p dir="ltr">$12,370</p>

<p dir="ltr">Difference of $2,335<br />
<br />
Second change was text.<br />
<br />
$3252 for (75) 5 gallon hedge plants</p>
'),
  (7628516, 9, 'Trim pittispornum.     $70.
Remove 2''  fencing.   $250.
Move sod irrigation.  $160.
Add bend a board.     $200.
Color for concrete.    $600.'),
  (7632034, 2, NULL),
  (7632049, 3, NULL),
  (7632122, 6, 'New Sidewalk & Driveway Aprons<br />
Demolish and remove existing sidewalk, apron & curb, approx. 370 square feet<br />
Demolish and remove 2’ x 55’ of street asphalt<br />
Install 10 linear feet of SDR35 drainpipe<br />
Install 2-4 inches of Class II road base<br />
Form and pour new natural gray concrete sidewalk, broom finish, approx. 252 square feet<br />
Form and pour new concrete curb, approx. 58 linear feet<br />
Install core in new curb for drain line<br />
Form and pour (2 qty.) new driveway aprons per approved city detail<br />
Note: Replacement of all concrete/curbs is limited to property lines of project. Any requests from<br />
Public Works inspector for additional sidewalk, curb or addition of a concrete gutter may incur<br />
additional costs to Owner.<br />
COST $12,499<br />
Asphalt Repair<br />
Patch 2’ x 55’ of street asphalt to city standards<br />
COST $2,400<br />
Job Total $14,899 - Cash/Check Price'),
  (7632129, 7, '3. Subcontractor shall extend the CMU retaining wall between the Duplex and ADU an additional 24” per direction of Ownership. $1,187.00'),
  (7632810, 4, NULL),
  (7635522, 9, NULL),
  (7637222, 11, NULL),
  (7639006, 4, NULL),
  (7639170, 1, NULL),
  (7640628, 8, '4. Subcontractor shall provide additional wood fencing at the driveway per the sketch provided by Ownership. Reference attachments #2 &amp; #3 for clarification. $3,361.00'),
  (7641206, 5, '18.50 per linear foot of mainline approx 30 feet (To be verified on install.) $555<br />
$1,117 For New valve Assembly and Ground Box with new laterals and Bubblers.'),
  (7641220, 6, 'This will be based on time and material work will take Approx 8 working hours. This will be adjusted based on actual hours worked.<br />
$75 an hour&nbsp;'),
  (7641240, 7, 'This will be based on time and Material and will be adjusted after work is complete to reflect actual costs.<br />
Material will be Approximately $200 This is for fittings and about 10 feet of pvc pipe for connection to existing valve.<br />
$75 an hour for Labor Approximately 8 hours $600'),
  (7645508, 12, NULL),
  (7647809, 1, NULL),
  (7648972, 1, '12.5 lf BBQ with smooth stucco and two outlets

Connect plumbing
Install owner provided equipment. '),
  (7648980, 2, 'Credit for removal of pilaster '),
  (7648984, 3, 'Driveway brick 17 x5'),
  (7649018, 4, 'Permit for electrical panel work '),
  (7650507, 5, NULL),
  (7652937, 10, NULL),
  (7653617, 68, NULL),
  (7654220, 2, 'Removing chain link fencing.'),
  (7656554, 13, NULL),
  (7658190, 4, NULL),
  (7664422, 2, NULL),
  (7665140, 2, 'Demo and grade area for steppers 

Set steppers at grade to match existing steppers 
Cut steppers as needed at the wall

Remove and dump soil if needed'),
  (7667867, 1, NULL),
  (7670693, 1, NULL),
  (7670702, 2, NULL),
  (7670746, 3, NULL),
  (7670765, 1, NULL),
  (7670779, 2, NULL),
  (7670793, 4, NULL),
  (7682012, 11, 'Install 48" box tree - Boething Treeland'),
  (7685910, 2, '520 Sq ft pavers '),
  (7686287, 7, '10 feet stem wall for property'),
  (7687126, 12, 'Adding wiring and install for 5 lights'),
  (7687127, 13, 'Credit for planting that the owner paid for.'),
  (7687134, 10, 'Lights plus labor'),
  (7687135, 8, 'Checking all valve wiring and identifying all valves.<br />
Relabel all wires in controller<br />
<br />
&nbsp;'),
  (7687426, 3, NULL),
  (7688462, 1, 'Gravel pit install.&nbsp;<br />
<br />
digging out 2x3x3 hole, installing aqua boxes and installing gravel'),
  (7690210, 9, NULL),
  (7693321, 18, '4 Creeping Figs<br />
1 15 gallon african boxwood'),
  (7693330, 19, 'Customer has lights to install.&nbsp;<br />
Need to install 2 column lights.&nbsp;'),
  (7696820, 9, 'Checking all valve wiring and identifying all valves.<br />
Relabeling all valves<br />
Relabel all wires in controller<br />
Stamping all existing box lids<br />
<br />
Time and material Basis<br />
650 per man day (8 hours)<br />
Material will be charged at a 30 percent markup.<br />
&nbsp;'),
  (7698237, 10, NULL),
  (7698242, 11, NULL),
  (7698262, 12, NULL),
  (7699539, 1, NULL),
  (7699617, 14, NULL),
  (7699978, 11, NULL),
  (7707058, 1, 'Aprovall of the design'),
  (7709239, 1, 'Rwmoving stump on side yard
Hauling an dumping'),
  (7711422, 1, NULL),
  (7711431, 2, 'Plan approval choices same as listen on plan'),
  (7712536, 1, '30 lf conduit 1 outlet'),
  (7712566, 2, '1 path light
3 spot lights'),
  (7712614, 3, NULL),
  (7714087, 4, NULL),
  (7717641, 5, NULL),
  (7718823, 5, 'Removal and reinstall of timber walls - 40 ln feet.&nbsp;<br />
Leveling the timber steps in front of the wall.<br />
( removed 7ft timber wall section until clarified if the addtional work beyond this change order is approved to do)<br />
( will need to add for addtional material needed in other change order)'),
  (7718867, 6, 'Removal of additonal wood around spa
Hauling in 4x4 and wood for rebuild'),
  (7718869, 7, 'Cleaning up hillside removing lose dirt 
Tamping down hill'),
  (7718876, 12, 'Demolition & Grading<br />
Remove an average of 7” of soil over 980 square feet<br />
Remove (40 qty.) existing medium shrubs<br />
Remove existing grass, approx. 1700 square feet<br />
Fine grading in scope of work<br />
*No removal of ivy/plants behind pool wall is included in this price<br />
COST $8,500<br />
Irrigation<br />
Install (3 qty.) anti-siphon valves for spray irrigation zones<br />
Install (4 qty.) anti-siphon valves for drip irrigation zones<br />
Connect valves to existing irrigation timer<br />
COST $12,200<br />
Metal Edging<br />
Install black steel edging per plan, approx. 352 linear feet<br />
*Not including in D.G. area<br />
COST $6,000<br />
Soil Prep Till and amend planting area soil, approx. 2200 square feet<br />
COST $2,600<br />
Document Ref: ZDP66-BEH2Q-QXAD3-EOQVX Page 1 of 3<br />
12410 Foothill Blvd Unit U Sylmar, CA 91342<br />
(818) 751-2690 www.picturebuild.com<br />
CA Contractor''s License B, C-27,8,53: 990772<br />
11/22/2024<br />
Page 2 of 3 Planting<br />
Provide and install the following plant sizes/quantities:<br />
(1 qty.) 36” box tree<br />
(4 qty.) 24” box trees<br />
(6 qty.) 15 gal shrubs<br />
(49 qty.) 5 gal premium shrubs<br />
(103 qty.) 5 gal shrubs<br />
(14 qty.) 3 gal shrubs<br />
(150 qty.) 1 gal shrubs<br />
(25 qty.) dirt flats of groundcover<br />
COST $19,000<br />
Mulch<br />
Install approx. 2200 square feet of standard shredded bark mulch<br />
COST $1,500<br />
D.G. Area<br />
Excavate 3” below finish grade over approx. 233 square feet<br />
Install 3” of tan, stabilized decomposed granite per plan, approx. 233 square feet<br />
Includes 2 sacks of cement per cubic yard of D.G. for stabilization<br />
Install (10 qty.) 2x2 ‘Angelus’ brand ‘Paseo II’ steppers per plan<br />
Trench and run 60 linear feet of electrical from meter to fountain location<br />
Install (1 qty.) GFIC receptacle<br />
Lay weed barrier fabric<br />
Install 3” of tan stabilized decomposed granite, approx. 153 square feet<br />
D.G. includes 2 sacks of cement per cubic yard for stabilization purposes<br />
Install approx. 75 linear feet of black metal edging<br />
*Fountain and fountain install by others<br />
*Benches by others<br />
COST $4,400<br />
Document Ref: ZDP66-BEH2Q-QXAD3-EOQVX Page 2 of 3<br />
12410 Foothill Blvd Unit U Sylmar, CA 91342<br />
(818) 751-2690 www.picturebuild.com<br />
CA Contractor''s License B, C-27,8,53: 990772<br />
11/22/2024<br />
Page 3 of 3<br />
Lighting<br />
Install (1 qty.) 200-watt transformer, (1 qty.) 100-watt transformer<br />
Install the following LED lights:<br />
(14 qty.) path lights AP-128B-7 2.5w<br />
(2 qty.) wall washer lights FL-113B 2.5w<br />
(3 qty.) architectural in-grounds IG-63-00B 3.5w<br />
(13 qty.) flood lights FL-115B 3.5w<br />
(19 qty.) spot lights FL-105B 3.5w<br />
Wire up all fixtures in 3 separate circuits<br />
COST $7,800<br />
Job Total $62,000 - Cash/Check Price'),
  (7719704, 1, NULL),
  (7723147, 2, '47 linear feet of steps additional'),
  (7723151, 3, '90 sq ft of segmented concrete walkway to street'),
  (7723154, 4, '31 linear feet of steps as alternative'),
  (7723221, 2, NULL),
  (7723400, 4, NULL),
  (7725902, 6, NULL),
  (7726840, 5, '1. Demo and irrigation $800.00
Irrigating 80 linear ft with 2 rows of perforated hose 160 linear ft total.
Demo, haul trash, and grading are included. 

2.12 flats of senicio @$75 per flat
12x90= 900

3. 11 12 ft high 3 inch in diameter tree stakes priced at $30 per stake. 30x11= $330 installation included in labor cost.

4. 2 guys with rate @$80 per guy for 8 hour''s 
Totals $1280.00

Grand total : $3310.00
'),
  (7729912, 6, NULL),
  (7731709, 42, 'Demo @ $2400<br />
Grey Concrete/Light Broom Finish for 19'' x 20'' @ $10,300'),
  (7735601, 8, 'Adding 12 additional railroad ties to replace rotted ones.'),
  (7735630, 9, 'Removing the existing wall that retains the walkway<br />
Removing the existing wall retaining the hillside<br />
Grading the hillside to slope down and not be over the deck<br />
Removing excess dirt approximately 4 yards<br />
Trenching 3 feet deep, approx 20 feet.<br />
Installing (20) 5 foot timber post to retain the walkway.'),
  (7738443, 3, 'For cleaning the area and fixing the hose'),
  (7738519, 7, '<b>Planting charge for owner provided plants<br />
<br />
20) 5 gallons--$440<br />
54) 1 gallons-- $540<br />
1 15 galllon $40<br />
10) 24 in box''s--$1400<br />
1) 36 in box- $450</b><br />
<br />
$2,870<br />
<br />
<br />
<br />
 '),
  (7738597, 8, '<p dir="ltr"><b>34 1 gallon plants at $21.50 each installed $731.00</b></p>

<p dir="ltr"><b>96 5 gallon plants installed at $43.50 each $4,176.00       </b></p>

<p dir="ltr"><b>2 fruit trees in 15 gallon     $620  </b></p>

<p dir="ltr"><b>1 36 in box trees installed at $1425 each </b></p>

<p dir="ltr"><b>2 flats of ground cover installed at $75 each $150</b></p>
<b>Total planting cost $7,102.00 </b>'),
  (7738626, 9, '<b>Planting charge for owner provided plants<br />
<br />
(72) 5 gallons--$3,153.75<br />
(123) 1 gallons-- $2644.50</b><br />
<br />
<br />
&nbsp;'),
  (7742610, 10, 'Install new side deck at back house. 5''x5'' all pressure treated deck  $1350<br />
<br />
<br />
COST $1,350'),
  (7743553, 12, NULL),
  (7744896, 13, 'Install channel drain system per plan<br />
Install step transition.&nbsp;'),
  (7752011, 1, 'Need to spray Nutsedge and invasive Juncus on slope'),
  (7758804, 69, 'Remove and prep for new mailbox
Install new mailbox'),
  (7758807, 70, NULL),
  (7759193, 14, 'Per email.&nbsp; Added sq footage due to paver width off on plan.&nbsp;'),
  (7759199, 15, 'Added paver to install by removing planters.&nbsp;'),
  (7759238, 18, NULL),
  (7763596, 13, NULL),
  (7766233, 1, NULL),
  (7769378, 3, 'Adding new 50 amp breaker and running it to new sub panel'),
  (7769715, 1, '(8) flats Rosemary prostratus<br />
(30) 1 gallon Lavender (filling in between Salvia)<br />
&nbsp;'),
  (7780757, 1, 'The costs for demo &amp; remove stump (up to 1ft deep) $700<br />
Lawn 120 SF more is $440<br />
(5) shrubs is $176<br />
36 SF additional pavers $660<br />
COST $1,976'),
  (7781059, 1, NULL),
  (7781077, 2, '<span style="font-size: 11pt"><span style="page-break-after: avoid"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><b><span lang="EN" style="font-size: 16pt"><span style="line-height: 106%">Demolition & Site Prep</span></span></b></span></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Demolish and remove existing pavers in north side of backyard</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Demolish and remove existing flagstone paving in south side of backyard</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Demolish and remove existing spa area in south side of backyard</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Chip out existing patio tile and clean area</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Remove existing raised ledge on patio</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Demolish and remove 4” off existing raised patio</i></span></span></span><br />
<br />
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><span lang="EN" style="font-size: 12pt">COST $5,143</span></b></span></span><br />
<br />
<span style="page-break-after: avoid"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><b><span lang="EN" style="font-size: 16pt"><span style="line-height: 106%">Concrete Pathway</span></span></b></span></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Form for 220 square feet of concrete</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Install 2 inches of Class II road base for additional paver patio area</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Set rebar grid at 24” on center</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Pour 3000 PSI natural gray concrete per plan</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Apply broom finish</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Install control joints as needed</i></span></span></span><br />
<br />
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><span lang="EN" style="font-size: 12pt">COST $2,127</span></b></span></span></span><br />
<br />
<span style="font-size: 11pt"><span style="page-break-after: avoid"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><b><span lang="EN" style="font-size: 16pt"><span style="line-height: 106%">Patio Remodel</span></span></b></span></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Layout new patio extension per plan</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Excavate for footing</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Pour concrete footing</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Install CMU block subwall for patio extension, approx. 40 linear feet x 12” HT.</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Drill into side of existing patio slab, install rebar dowels and epoxy</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Tie new steel into dowels</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Install 4 inches of Class II road base for additional paver patio area</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Install ‘Stepstone’ brand 24” x 24” pavers per plan, approx. 450 square feet</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Install ‘Stepstone’ brand 24” x 24” pavers over existing ramp, approx. 64 square feet</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Make cuts</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Install polymeric sand in joints</i></span></span></span><br />
<br />
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><span lang="EN" style="font-size: 12pt">COST $13,224</span></b></span></span></span><br />
<br />
<span style="font-size: 11pt"><span style="page-break-after: avoid"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><b><span lang="EN" style="font-size: 16pt"><span style="line-height: 106%">New Steps</span></span></b></span></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Layout new steps per plan</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Install CMU block subwall for new steps, approx. 115 linear feet total</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Install 24” x 24” ‘Stepstone’ brand pavers as treads and risers per plan, approx. 115 linear feet</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Make cuts</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Grout joints</i></span></span></span><br />
<br />
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><span lang="EN" style="font-size: 12pt">COST $10,564</span></b></span></span></span><br />
<br />
<span style="font-size: 11pt"><span style="page-break-after: avoid"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><b><span lang="EN" style="font-size: 16pt"><span style="line-height: 106%">Side Yard Pavers</span></span></b></span></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Layout new pavers per plan</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Install 4 inches of Class II road base </i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Install 1 inch of washed leveling slang</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Install ‘Stepstone’ brand 24” x 24” pavers, approx. 280 square feet</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Make cuts</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Fill joints with polymeric sand</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Compact pavers</i></span></span></span><br />
<br />
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><span lang="EN" style="font-size: 12pt">COST $6,060<br />
<br />
PAVER SEALANT </span></b></span></span></span><br />
<i><span lang="EN" style="font-size: 11pt"><span style="line-height: 106%"><span>Install sealant for patio, side yard pavers and steps</span></span></span></i><br />
<br />
<span style="font-size: 14px"><em><strong>C</strong></em><em><strong>OST $1,100<br />
<br />
LIGHTING</strong></em></span><br />
<br />
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span lang="EN" style="font-size: 10pt"><i>Furnish and install (4) low voltage LED masonry step lights      </i></span></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><i><span lang="EN" style="font-size: 10pt">Furnish and install (4) low voltage LED up lights</span></i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><i><span lang="EN" style="font-size: 10pt">Furnish and install (1) transformer and wire lights to panel</span></i></span></span></span><br />
<br />
<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><span lang="EN" style="font-size: 12pt">COST $2,275</span></b></span></span></span><br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
<br />
 '),
  (7782488, 8, 'Here is the&nbsp;quote for the work.<br />
&nbsp;I am quoting to&nbsp;replace the whole sidewalk down the length as it is pretty cracked upon in a lot of sections.&nbsp;<br />
There is a bit of economy of scale with this as we will do one pour, one load no matter that size difference.<br />
<br />
43 linear feet of sidewalk<br />
New Apron<br />
Demo all existing<br />
Install 12 linear feet of new curbing and gutter&nbsp;<br />
Does not include any asphalt requirements or tree root&nbsp;work.<br />
<br />
<br />
$7,863&nbsp;'),
  (7782542, 9, 'Hi&nbsp;&nbsp;Wil,<br />
<br />
<br />
The price for the pit will be $4,913 for demo soils removal (2 super tens) and 3 separate gravel deliveries with the geotextile&nbsp;fabric and pipe installation<br />
<br />
Best,<br />
Brian'),
  (7782640, 10, '- Install additional 28 linear feet (12 included in previous change order) for a total of $4,620<br />
- Root work added $475'),
  (7782693, 11, 'THIS IS WORK ALREADY DONE AND PAID FOR'),
  (7782697, 12, '3 Crew Days. Hand Demo plus fine grading<br />
Additional equipment and driver.<br />
Plus Soils Removal&nbsp;<br />
&nbsp;'),
  (7782830, 1, 'Carter mentioned that the wall near new pool equipment has footing that is now pretty exposed. We think we should actually build a wall right in front of property wall. It will be 24" tall instead of 12" high and a bit longer. The cost would be $2090 for this. This would also mean that the pool equipment is no longer elevated, which may be a good thing.<br />
<br />
He also mentioned an option for lowering the gas line. Basically cut side concrete and install new gas line. The cost would be $2801.00. This is optional and we can of course leave gas line as it is.<br />
<br />
Lastly, all the electrical is pretty shot. I was thinking of 2 new plugs on the dg/seat wall side and 1 new plug for the pergola area. This would be $2340.'),
  (7783108, 5, 'Approved at site with Jimmy'),
  (7788183, 15, 'Replace 5 5 gallon Jasmine 14 1 gallon plants damaged by gophers'),
  (7789148, 1, 'Adding 3 additional&nbsp;AP-00B-01B around the Driveway.'),
  (7792102, 14, NULL),
  (7792381, 19, '1) Remove existing fencing, posts etc. (not including public fence).<br />
2) Remove 4 feet x 2 foot section along back wall including minor root removal.&nbsp; 25 linear feet.&nbsp;<br />
3) Distribute portion of soils around sump pump wall and cover piping<br />
4) Back fill behind completed wall and compact.&nbsp;'),
  (7793267, 20, 'We did not install upper landing concrete steps.'),
  (7794035, 2, NULL),
  (7796534, 7, 'Demo ($940)<br />
remove soils 7" below final grade/grade area, prep and  prep for steps <br />
<br />
Concrete ($3000 for stamped concrete with color/approx 110sqft)<br />
 '),
  (7796538, 8, '(4) masonry lights for new steps (will connect to existing transformer)'),
  (7796541, 9, '57 linear feet of stamped concrete with color&nbsp;'),
  (7796542, 10, 'approx 360sqft of St Augustine'),
  (7796545, 11, '(20) 15 gallon Photinia @$3000<br />
(14) 24" Boxed Photinia @$4800<br />
 '),
  (7796547, 12, '(2) drip zones for lower slope<br />
(1) spray zone for sod<br />
Will connect to existing timer&nbsp;'),
  (7796550, 14, 'Suggesting 12 up lights for entire slope area'),
  (7804485, 2, NULL),
  (7804668, 1, 'Removing 40 linear feet of curbs
Removing 25 sqft of concrete
Installing 25 sqft of walkway
Installing 35 linear feet of new curbs
Topcast finish'),
  (7804672, 2, 'Removing 27 linear feet of new 3 inch curb'),
  (7806605, 1, NULL),
  (7807960, 15, NULL),
  (7808075, 1, 'Erik to measure wall attached to side gate entry (rebuilding wall) for section-elevation drawing to rebuild wall'),
  (7808717, 2, '(10) path/up lights<br />
(2) step lights<br />
(1) transformer'),
  (7808725, 3, '(23) up/path lights<br />
(9) masonry lights<br />
(1) transformer&nbsp;'),
  (7808732, 4, 'Add''l 151sqft of pavers (side paths and driveway)<br />
Sealant for a total of 854sqft of pavers'),
  (7808734, 5, '45 linear feet of Wall Cap'),
  (7808741, 6, '+20.8 linear feet of steps<br />
+16sqft paver landing'),
  (7808742, 7, 'Reducing Steppers to 23 total&nbsp;'),
  (7808748, 8, NULL),
  (7817241, 2, 'removal of charge for mixing rock<br />
small basket vredit<br />
&nbsp;'),
  (7817707, 2, NULL),
  (7817714, 3, NULL),
  (7817716, 4, NULL),
  (7824929, 1, NULL),
  (7825276, 2, NULL),
  (7825286, 3, NULL),
  (7825515, 1, 'Concrete pad for Bar<br />
Concrete for trashcan'),
  (7825646, 2, NULL),
  (7825881, 16, NULL),
  (7826238, 1, NULL),
  (7827407, 5, NULL),
  (7829786, 6, 'Adding 60 sqft of paver for front yard'),
  (7829788, 7, 'Changing Planters for front yard edging to Bender Board'),
  (7831511, 4, NULL),
  (7832353, 2, NULL),
  (7834824, 1, 'Removing from Contract<br />
<br />
$1934 for decking<br />
$1382 for steps<br />
$2995 for railing<br />
$15130 for steps and bench<br />
$900 for fencing work in front.<br />
<br />
Total $22,321'),
  (7839765, 3, NULL),
  (7842703, 3, 'Removing weeds

Adding weed barrier 

Adding mulch

For 780sqft of existing planters'),
  (7842707, 4, 'Adding 5 broze uplights to new planters'),
  (7842713, 5, NULL),
  (7845600, 5, NULL),
  (7845605, 6, NULL),
  (7845611, 7, NULL),
  (7845676, 8, NULL),
  (7848151, 10, 'Credit for 4 5 gallon plants Picking up 13 24 in boxes and planting them<br />
<br />
Discount of $200 applied, on 1700 invoice'),
  (7853203, 15, '14 shrubs were reduced in size from 24" to 15 gallon'),
  (7855746, 8, 'Adding 8 sqft of brick in front of front gate'),
  (7858491, 2, 'Credit due for lower quantity of plants<br />
Less (2) 24 inch box trees  ($580 credit)<br />
Less (31) 5 gallon plants ($1872 credit)<br />
Add (16) 1 gallon plants ($1037 add)<br />
Add (5) 15 Gallon ($865 add)<br />
 
<table style="border-collapse: collapse; width: 212px" width="212">
	<colgroup>
		<col span="2" style="width: 48pt" width="64" />
		<col style="width: 63pt" width="84" />
	</colgroup>
	<tbody>
		<tr>
			<td style="border: none; height: 20px; width: 64px; padding: 0 1px; vertical-align: middle; white-space: nowrap"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>PLANTS</span></span></span></span></span></span></td>
			<td colspan="2" style="border: none; width: 148px; padding: 0 1px; vertical-align: middle; white-space: nowrap"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>Difference</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border: 1px solid rgba(0, 0, 0, 1); height: 20px; padding: 0 1px; vertical-align: middle; white-space: nowrap"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>1gal</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); text-align: right; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: 1px solid rgba(0, 0, 0, 1); border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>16</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: 1px solid rgba(0, 0, 0, 1); border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>$754</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); height: 20px; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: 1px solid rgba(0, 0, 0, 1)"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>5gal</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); text-align: right; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>-31</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span> $   (1,872.00)</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); height: 20px; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: 1px solid rgba(0, 0, 0, 1)"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>15gal</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); text-align: right; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>5</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span> $         865.00</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); height: 20px; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: 1px solid rgba(0, 0, 0, 1)"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>24 citrus</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); text-align: right; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>0</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span> $                  -   </span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); height: 20px; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: 1px solid rgba(0, 0, 0, 1)"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>24 box</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); text-align: right; vertical-align: middle; padding-top: 1px; padding-right: 1px; padding-left: 1px; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>-2</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span> $      (580.00)</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border: none; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span><font color="#FF0000"><font>($833)</font></font></span></span></span></span></span></span></td>
		</tr>
	</tbody>
</table>
'),
  (7858511, 3, 'Mulch Hillside -&nbsp; Roughly 4,400 square feet<br />
Gorilla Hair<br />
<br />
The original quote was for $3,800 with mix.&nbsp;<br />
<br />
No charge added for doing all Gorilla Hair.<br />
<br />
Additional $800 courtesy credit.<br />
<br />
Total price $3,000<br />
&nbsp;'),
  (7858515, 9, NULL),
  (7862157, 6, 'Adding 2 flats of ground cover'),
  (7862339, 1, 'Remove debris from planter (trash planter boxes) and remove veggie box soil. Add weed barrier to planter 41'' x3'' add 2 yards of pea gravel. Install 8 station rachio.

 Total 2900.00'),
  (7863115, 10, '5 gallons '),
  (7863860, 1, 'Approved via text. Got retail magnolia for an additional +$400'),
  (7865095, 17, NULL),
  (7865692, 11, NULL),
  (7867505, 2, NULL),
  (7872518, 31, 'Block Wall - 11 feet long 18 inches high for security. -&nbsp; $1925<br />
Footings for pool fencing -&nbsp; $1900<br />
Install 13 concrete pads for pool cover - $250<br />
<br />
DG pathway 72 sq feet - $475<br />
connect pool auto fill - $80<br />
<br />
&nbsp;'),
  (7876258, 11, NULL),
  (7877667, 3, 'Adding surface drains in back of wall with 5 inlets&nbsp;<br />
&nbsp;'),
  (7877829, 4, NULL),
  (7878114, 16, NULL),
  (7878118, 17, NULL),
  (7879260, 6, NULL),
  (7882306, 7, 'Sanded stucco for back of privacy wall&nbsp;'),
  (7883203, 8, NULL),
  (7883209, 9, NULL),
  (7883212, 10, NULL),
  (7883214, 11, '(100) 1 gallon Ceanothus Yankee Point'),
  (7883233, 12, '3 up lights<br />
6 path lights'),
  (7883321, 13, NULL),
  (7883444, 13, 'We had to move the concrete pour to two dates.&nbsp; Added labor and material for waste and short load.&nbsp;&nbsp;'),
  (7883508, 21, NULL),
  (7883660, 5, NULL),
  (7888041, 2, NULL),
  (7889206, 4, 'Courtesy No Charge Installation.&nbsp;'),
  (7889228, 5, 'Return (12) FC: Eyebrow SD 406B&nbsp;&nbsp;<br />
Add (25)&nbsp;Lightcraft Step Light 4 2700K&nbsp;'),
  (7889826, 6, 'Did not install gravel along back walkway'),
  (7890927, 1, NULL),
  (7890948, 2, NULL),
  (7893732, 11, NULL),
  (7900756, 14, NULL),
  (7905378, 15, NULL),
  (7905385, 16, NULL),
  (7905394, 17, 'approx 19 yards of soil to backfill planter areas'),
  (7905901, 18, NULL),
  (7915493, 3, NULL),
  (7918835, 19, NULL),
  (7918942, 1, 'Approved via phone call'),
  (7923900, 10, 'Repairing cracks in the stucco. '),
  (7925621, 3, '<span style="font-size: 11pt">Credit vermiculite $109.48<br />
Credit powerwash rental $48<br />
Credit new gravel $100</span>'),
  (7928043, 1, NULL),
  (7929516, 18, NULL),
  (7929520, 19, NULL),
  (7929523, 20, NULL),
  (7929554, 1, NULL),
  (7934868, 1, NULL),
  (7938439, 1, 'For pool equip'),
  (7938443, 2, NULL),
  (7938450, 3, NULL),
  (7938499, 4, NULL),
  (7940933, 20, NULL),
  (7940934, 3, NULL),
  (7940997, 2, 'To upgrade from (40) 5 gal to (24) 15 gal would be $1610.00<br />
For (8) 5 gal along block wall on other side would be $280<br />
<br />
From Moore "Yikes. Ok.  Let’s do it and hope for no more surprises.  <br />
<br />
Just fyi.  The guys are working on the step underneath the porch door (with the new stones) and I can’t open the door now.  I’m guessing they probably have a plan but just wanted to bring it up in case they didn’t notice   <br />
<br />
Thank you "'),
  (7943770, 21, 'Includes 3D'),
  (7944514, 5, NULL),
  (7945982, 9, 'To use about 5 bags of 50/50 soil, add RTF seed and manure to cover it.
Cost includes materials and labor

Total cost five hundred dollars'),
  (7947300, 6, NULL),
  (7947390, 7, NULL),
  (7948014, 1, NULL),
  (7948404, 5, NULL),
  (7950556, 3, 'For additional lights near Pole, these will be spotlights.<br />Total cost seven hundred and fifty dollars'),
  (7951160, 8, 'Demo approx 300sqft $900
DG/pre stabilized approx 300sqft $1425
Plants $1000'),
  (7959446, 1, 'Adding gravel and metal edging for front walk'),
  (7960803, 7, 'Lights requested were installed.&nbsp;'),
  (7961027, 6, 'Backyard work.&nbsp;'),
  (7961395, 9, NULL),
  (7961862, 10, NULL),
  (7962936, 1, '<style type="text/css">td { border: 1px solid rgba(204, 204, 204, 1) }
br { }</style>
<table border="1" cellpadding="0" cellspacing="0" dir="ltr">
	<colgroup>
		<col width="230" />
		<col width="100" />
	</colgroup>
	<tbody>
		<tr>
			<td>Pool</td>
			<td>$131,900.00</td>
		</tr>
		<tr>
			<td>Plan Redesign</td>
			<td>$1,200.00</td>
		</tr>
		<tr>
			<td>Trenching and backfilling for utilities</td>
			<td>$7,600.00</td>
		</tr>
		<tr>
			<td>Electrical for BBQ and sub pump area</td>
			<td>$3,750.00</td>
		</tr>
	</tbody>
</table>
<br />
Pool<br />
Layout new pool & spa per plan, approx. 17’ x 34’<br />
Dig pool area<br />
Install deepend key based on architectural plan approx 2.5’. WIll be determined by city soil<br />
engineer. Quote is for a 2.5’ deepend footing along with the 6” floor for a total of 3’<br />
Set forms for pool, spa, and damwall<br />
Pour 3000 PSI Shotcrete, approx.<br />
Install standard mini pebble finish<br />
Install 176 linear feet of 6” waterline tile for pool and spa (Material allowance: up to $9.50/sf)<br />
Install 6” ceramic tile for dam wall, approx. 12 linear feet<br />
Install ‘Bellecrete’ brand precast coping (Color: TBD)<br />
Install (1 qty.) new ‘Jandy’ brand nichless RGB color lights<br />
Install 2 standard led pool light in rgb<br />
Install ‘Jandy’ brand 2.7 HP variable speed pump<br />
Install ‘Jandy’ brand CV580 cartridge filter<br />
Install ‘Jandy’ brand ‘JXI400N’ 400K BTU heater<br />
Install ‘Jandy’ brand ‘Aqualink RS-P4’ 4-station automation<br />
Install electric sub-panel at pool equipment<br />
Includes standard plumbing<br />
Install motorized pool cover<br />
Install saltwater equipment and chlorinator<br />
<br />
<br />
Plan redesign<br />
Redesign landscape and backyard hardscape with lighting plan and outdoor bbq areas.<br />
Will survey existing elevations of backyard to determine height of pool relative to back slope and<br />
Rear patio area.<br />
<br />
Utilities<br />
Run new electrical to the bbq area with stub out and future gfci. Allowance of 50 feet<br />
Allowance of 100 linear feet to sub pump electrical<br />
<br />
Trenching<br />
For main utilities -Gas from street to meter – electrical street to panel.<br />
Sewer trenches in back. Recompact in 8 inch lifts'),
  (7963076, 18, 'Approved via text '),
  (7966464, 11, 'Remove existing brick/dispose
Dowel into existing footing and install 2 courses of 6” block, grout lift
Waterproof back of wall '),
  (7970334, 1, NULL),
  (7970907, 12, NULL),
  (7971168, 2, '1) Install new transformer and rewire step lighting - $407<br />
2) Stucco work (2 trips) - $633'),
  (7971187, 12, NULL),
  (7973393, 2, 'Planting &amp; Mulch<br />
Till and amend planting area soil, approx. 300 square feet<br />
Install the following plant sizes/quantities:<br />
(14 qty.) 24 in box upgraded from 15 gallons<br />
(47 qty.) 5 gal shrubs<br />
55 15 gallon plants<br />
150 sq ft of brown shredded mulch w/o weed barrier'),
  (7976854, 1, NULL),
  (7977104, 16, NULL),
  (7979605, 19, NULL),
  (7986985, 7, 'Erosion channel next to concrete stair runoff.&nbsp; Install jute netting and 2 new catch basins.&nbsp; Install drain system. to exit point.&nbsp;'),
  (7996490, 1, '<span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12pt"><span style="line-height: 105%"><span>Electrical Rough In for Parking Lights – 4,370 linear feet</span></span></span></b></span></span></span><br />
 
<ul>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span>Trench soils down 30” below final grade (assuming site at – 4 inches)</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span>Trench soils 6 inches wide</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span>Install 3/4 inch electrical conduit.  (Note, spec from plan shows 3 #8 conductors. This can be installed at max capacity for ½ but with the length of run this can be problematic. 1 inch may even be better for ease of pull. </span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span>Install 6 inch conduit sanding layer per specification.</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span>Back fill and machine tamp trench first 6 inch layer to 95% proctor standard using pneumatic tamper with 6” foot.</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span>Add in 6 inch wide electrical burial warning tape. </span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span>Back fill additional trenching material and compact in lifts with pneumatic tamper.</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span>Conductors by other</span></span></span></span></li>
</ul>
<br />
<span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12pt"><span style="line-height: 105%"><span>COST $118,000</span></span></span></b></span></span></span><br />
<br />
<span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12pt"><span style="line-height: 105%"><span>Parking Light Pole Base Installation – Sonotube “Finish Free” 27 units</span></span></span></b></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10pt"><span style="line-height: 105%"><span>(Other contractor to provide bolt pattern plate or template based upon lighting chosen)</span></span></span></span></span></span><br />
 
<ul>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span>Dig 2’ wide x 4’ deep hole for each lamp base.</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span>Haul spoils</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span>Install rebar cage per plan</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><span><span style="color: rgba(0, 0, 0, 1)">Locate appropriate conduit termination</span></span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><span><span style="color: rgba(0, 0, 0, 1)">Install (4) #4 vertical rebar and tie in</span></span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><span><span style="color: rgba(0, 0, 0, 1)">Install (4) #4 horizontal rebar and tie in.</span></span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><span><span style="color: rgba(0, 0, 0, 1)">Install concrete J bolt anchoring w/ (4)-3/4”x 32” bolts with level and anchoring nuts</span></span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><span><span style="color: rgba(0, 0, 0, 1)">Install Sonotube “Finish Free” 24 inch form.</span></span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><span><span style="color: rgba(0, 0, 0, 1)">Install Bracing for tubing for plumb and level.</span></span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><span><span style="color: rgba(0, 0, 0, 1)">Install Jbolt template</span></span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><span><span style="color: rgba(0, 0, 0, 1)">Pour 3000 PSI concrete for each tube.</span></span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><span><span style="color: rgba(0, 0, 0, 1)">Site finish top and tool camfer</span></span></span></span></span></li>
</ul>
<br />
<span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12pt"><span style="line-height: 105%"><span><span style="color: rgba(0, 0, 0, 1)">COST $45,900</span></span></span></span></b></span></span></span><br />
<br />
<br />
<span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12pt"><span style="line-height: 105%"><span>ESTIMATE TOTAL $163,900</span></span></span></b></span></span></span><br />
 '),
  (8001187, 2, NULL),
  (8001188, 3, '1 African sumac
1 tristania tree
1 strawberry tree '),
  (8001214, 4, '1 36 in box at 1250
3 15 gallon fruit trees at 300 each
(10) 15 gallon podacarpis hedge for seating area $130 each
15 5 gallons at 42.50 each 
10 1 gallons at 21.50 each 
 Total cost $4302.50
'),
  (8002627, 4, 'Date of Work Item Description Total Cost<br />
5/14/2024 on Install Added Rebar $3,799<br />
/3/2024 on Install 7 Extra Feet of Wall $3,738<br />
9/10/2024 on Rough Grading Work $26,237<br />
N/A Credit - Planting, Soils Specs -$7,703<br />
N/A Credit - Remove Flashing/Mesh from Wall -$2,800'),
  (8003847, 1, NULL),
  (8003850, 2, NULL),
  (8003868, 2, 'Install 2 pygmy plants. Priced at $75each and irrigate also charge 2 hours of labor at $80 an hour.<br />
<br />
(UPDATE)&nbsp; We are going to waive the labor cost as a courtesy to the client.&nbsp;'),
  (8004076, 13, '32sqft'),
  (8005188, 6, NULL),
  (8005281, 4, NULL),
  (8010859, 20, NULL),
  (8010862, 21, NULL),
  (8010876, 1, NULL),
  (8013985, 14, NULL),
  (8015453, 2, NULL),
  (8015463, 3, NULL),
  (8015494, 4, NULL),
  (8015523, 1, NULL),
  (8015531, 2, 'Bury downspouts along side/back of property '),
  (8015572, 5, '120 Sq ft of additional pavers '),
  (8015593, 6, 'Removal of Edging and rock&nbsp;'),
  (8019349, 2, 'Trenching and installing 65 linear feet of electrical conduit.
$11 per linear foot
'),
  (8019352, 3, 'Installing 15 linear feet of reused tile over face of demoed patio to cover exposed concrete past where new planters will be located
$20 per linear foot'),
  (8019358, 4, 'Half of the cost for the additional material
Total was $1067 we are covering half the cost of the material because of additional cuts that needed to be made.&nbsp;'),
  (8021000, 5, NULL),
  (8026092, 3, NULL),
  (8026097, 4, NULL),
  (8032385, 1, NULL),
  (8040245, 3, 'Contract has 80 linear feet alloted.

140 linear feet will be needed

60 linear feet additional at $900'),
  (8048392, 2, NULL),
  (8048396, 4, NULL),
  (8048401, 5, '30 linear feet for storage unit (side yard)'),
  (8048404, 6, NULL),
  (8049292, 22, NULL),
  (8049402, 22, NULL),
  (8050944, 23, 'Client wants one additional fifteen gallon privet'),
  (8055668, 7, NULL),
  (8055679, 8, NULL),
  (8055691, 9, NULL),
  (8055795, 5, 'conduit run from rear corner of property to fountain area'),
  (8055804, 6, '(4) podacarpus 15 gallon<br />
(4) 24" sumac trees <br />
(16) 10 foot lodge pole stakes<br />
5 feather reed grasses 5galllon<br />
1 15 gallon patio great majestic beauty'),
  (8067371, 4, 'Upgrade to Arizona River rock '),
  (8067657, 5, '7 5 gallon privets<br />
4 24 inch box podacarpus<br />
1) 15 gallon boxwood<br />
3 15 gallon texas privets'),
  (8068153, 1, NULL),
  (8084548, 1, NULL),
  (8084550, 2, NULL),
  (8088494, 1, 'Hi John- <br />
<br />
<br />
Thank you!! Is permit processing started for electrical and gas? Please confirm. Don’t want to get caught in delays. <br />
<br />
Thank you! <br />
<br />
Lisa <br />
<br />
<br />
<a href="https://apps.apple.com/us/app/aol-news-email-weather-video/id646100661" title="https://apps.apple.com/us/app/aol-news-email-weather-video/id646100661">Sent from the all new AOL app for iOS</a><br />
 
<p>On Tuesday, April 8, 2025, 1:21 PM, John Durso <ohn@picturebuild.com> wrote:</p>

<blockquote>Hi Andrew & Lisa,<br />
<br />
The fireplace engineering will cost $1050 (our direct cost) and will be ready in approximately 3 weeks. Once we have that, we will be able to go in and start permit process. <br />
You will be receiving an invoice for that amount. Please  let me know if you have any questions or concerns?</blockquote>
'),
  (8093861, 1, 'Front/Left side of wall'),
  (8096276, 1, '18 linear feet of gas in original contract for a total of 82 feet'),
  (8096378, 2, NULL),
  (8099843, 7, '865 sqft of Medium nugget Mulch'),
  (8099851, 8, 'Removing Planting Hedge in the front yard beneath the wall.'),
  (8100050, 1, NULL),
  (8102306, 1, NULL),
  (8102432, 1, NULL),
  (8102598, 3, NULL),
  (8102904, 2, '(4) 6’ long steps to change to be cantilever in the lower yard area
'),
  (8103507, 2, '42 linear feet of additional Edging '),
  (8104754, 1, NULL),
  (8104797, 2, NULL),
  (8107124, 4, NULL),
  (8112533, 5, NULL),
  (8113897, 22, 'Upgrade existing twenty four inch olive to a thirty six inch box, olive fruitless'),
  (8118921, 6, 'Includes install'),
  (8119848, 4, 'Credit for implied  pots'),
  (8124796, 1, '<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Trench and run 75 linear feet of 220V electric from meter to EV location at front corner of house </i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Install dedicated 40 amp breaker at meter</i></span></span></span><br />
<br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>*Permits required for utilities and is not included in this price</i></span></span></span><br />
 '),
  (8124814, 5, 'Needed to make the lump wall, a little bit higher to retain the soil from the oak tree area. 
9 LF (One course higher)'),
  (8124817, 6, 'To match steps , top level area of patio should also be cantilever.'),
  (8124828, 8, '20” long 8” thick poured in place concrete little retaining wall to meet basketball court corner.
Wall connects to bball court concrete area, thus closing off the planter. Includes waterproofing.

See photo attached.'),
  (8124832, 9, 'Don’t need to order boulders!! So many on site.'),
  (8124834, 10, NULL),
  (8124836, 11, 'No charge'),
  (8124840, 12, '32 LF of CMU 8x8x16 grey block with smooth stucco and dowel ins.'),
  (8124843, 14, 'Water will now go to street (halfway down natural concrete swale)'),
  (8124847, 15, 'NO CHARGE ($135 value)

Nearest A/C unit, needs to meet pathway on side of house. 16 SF
(See photo of drawing)'),
  (8124859, 16, 'Normal price per low boy $875 includes dump fees

***Labor per low boy separate (these are man hours not material)'),
  (8127783, 17, NULL),
  (8127834, 18, 'We had 32LF in the contract and we used 6LF'),
  (8127847, 19, NULL),
  (8127902, 20, 'We needed 2.5 lineal feet to clear the curve of the existing slump wall. Original measurement was 12LF.
The wall will have waterproofing but not the French drain so this cost includes a small credit for the French drain of -$100.

Juan spaced out the blocks at the bottom to allow weeping.(The rest of slump wall has no drainage plus soil is very dry)'),
  (8128221, 21, 'See updated design in email dated 4/21'),
  (8129159, 7, NULL),
  (8129236, 2, NULL),
  (8129380, 22, NULL),
  (8134018, 3, 'Permit Costs For the Sewer Permit'),
  (8134024, 4, 'Cutting existing sewer<br />
Trenching for New sewer line<br />
Installing New Sewer Line'),
  (8134028, 5, 'Demo For Extra Pool wall that was uncovered during Excavation.'),
  (8134034, 6, 'Removing existing Brick Planter Including Plants and Steps to door.'),
  (8134239, 1, 'Would need 35 linear feet of electrical more and 60 linear feet of gas more '),
  (8138884, 3, 'Topcast finish on concrete '),
  (8139188, 1, NULL),
  (8143252, 2, 'Paver install includes demo approx 794sqft'),
  (8143257, 3, 'approx 25 linear feet to pop out into side garden'),
  (8143260, 4, 'Remove 148sqft of concrete and replace&nbsp; conrete light broom finish'),
  (8145186, 8, 'See attached estimate'),
  (8156418, 2, NULL),
  (8156763, 3, NULL),
  (8159725, 1, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">To: Beverly Hills Building Department</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Date: 04/15/25</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Pool Permit: $3,632.84</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Plumbing Permit: $268.99</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Electrical Permit: $268.99</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $4,170.82</span></span><br />
 '),
  (8160435, 5, 'Angeuls Stonewall II&nbsp; wallcap in grey/charcoal'),
  (8161779, 2, '63 linear feet from crawl space to shower location '),
  (8161786, 3, NULL),
  (8161787, 4, 'electrical, sewer, drainage'),
  (8161789, 5, NULL),
  (8161791, 6, 'Saw cut  20'' of concrete on side of house from crawl space to corner of house in order to trench sewer line<br />
Includes patching (repouring conrcrete and coring through crawl space entrance)'),
  (8165577, 6, NULL),
  (8169444, 1, '2 linear feet added on both sides for a total of 4 linear feet&nbsp;'),
  (8169452, 2, '$Cost difference is 8.33 a sq ft'),
  (8169465, 3, NULL),
  (8169472, 4, '220 sq ft of concrete patio by sports court<br />
also to credit turf for applicable square footage'),
  (8169474, 5, NULL),
  (8169863, 4, 'Change from Del Rio to Miners Gold DG - STABILIZED DG. Compact dg. No edging. Customer understands that slope will not contain dg indefinitely'),
  (8169930, 7, '1850 sq ft of concrete in white cement.&nbsp;<br />
includes 15 linear feet of a new step<br />
white concrete at $20 sf'),
  (8169943, 8, '46 linear feet of block compared to 34 with more smooth stucco and a larger bar seating area 11lf<br />
90 sq ft of countertop vs 56 in original<br />
&nbsp;'),
  (8169949, 6, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">cost for the lights (without materials) and transplants is $2880</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"> </span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">cost for 13 1 gallons standard plants $286</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">cost for 2 5 gallon agave and 10 5 gallon boxwood is $540</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">there was an existing change order for the additional metal edging for $900 60 linear feet</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"> </span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"> </span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">upgrading the (5)24" box to </span></span><span style="font-size: 11pt"><span>10gal Buxus Winter Gem globe from Boething </span></span><span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">will add $650</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"> </span></span><br />
 '),
  (8174502, 23, NULL),
  (8175144, 3, NULL),
  (8175148, 4, NULL),
  (8175152, 5, NULL),
  (8177995, 10, NULL),
  (8181948, 4, NULL),
  (8182141, 23, 'See plan ''Patatian Addtl Plants'''),
  (8182948, 5, 'Around Palm tree and small area for existing planter<br />
Around Clivia and Crepe Myrtle&nbsp;'),
  (8182953, 6, 'New planter<br />
Existing planter with palm tree/boulders/replanted plants'),
  (8182954, 7, NULL),
  (8182967, 8, 'Planter with Clivia, planter with palm tree and replanted Liriope/Mondo<br />
&nbsp;'),
  (8182973, 9, 'St Augustine&nbsp;'),
  (8182982, 10, NULL),
  (8182986, 11, NULL),
  (8182991, 12, NULL),
  (8183188, 7, NULL),
  (8183282, 8, 'Includes Wall Veneer'),
  (8191149, 1, NULL),
  (8191160, 2, 'Demo 3 LF. Wall and rebuilt at 2 feet high for steps return pip with stucco'),
  (8191163, 3, NULL),
  (8191334, 3, ' 
<p dir="ltr"><b>3,300 sq ft Segmented concrete  step pads </b></p>

<p dir="ltr"><b>Topcast finished concrete-$53,500.00</b></p>
<b>50 linear feet of concrete curbing up to 10 inches high. $3,000</b>

<p dir="ltr"><b>Walls                  </b></p>

<p dir="ltr"><b>101 linear feet of 3’ tall cmu  retaining wall with an 18inch footing $13,975</b></p>

<p dir="ltr"><b>62 linear feet of garden wall in front yard heights up to 30” with smooth stucco finish. Includes waterproofing – $10,700.00</b></p>
<strong>turf strips-$15,770<br />
<br />
site prep for walls and compaction/backfill </strong><b>$5,000</b><br />
 '),
  (8200695, 7, 'Credit for 7 lights at $220 each.&nbsp;'),
  (8210701, 1, 'Selection of 1 and 5 gallon plants 
'),
  (8210751, 1, NULL),
  (8211324, 2, 'Estimate for
 Devin Bennet
17429 covello st

Plants 
10 flats of orange hardy ice plant 

Decomposed granite 
1 yard of Stabilized dg 

Gravel
1 1/2 yards of Mexican beach pebble black 

Weed fabric on gravel area 

 Total cost: 3,500
'),
  (8213223, 6, NULL),
  (8217370, 1, NULL),
  (8221956, 2, NULL),
  (8222487, 24, 'Client to buy 2 fruit trees. Cost is for labor only. '),
  (8222499, 25, 'Install 875 SF sod (purchased by client) with amendments only'),
  (8223568, 1, 'Paver change Belgard Cambridge cobble in Rio 6x6 & 6x9 in ''I'' pattern. No cost difference'),
  (8227114, 2, 'Demolition Demolish and (1) brick column and connecting brick walls No painting or patching is included in price COST $843<br />
Paver Ribbons Remove existing brick ribbons Saw cut ribbons wider to accept 6x9 paver Set pavers $1525'),
  (8229515, 1, NULL),
  (8234181, 7, NULL),
  (8234758, 5, 'Add 15-5 gal. Ligustrum (staked)
Add drip irrigation from existing line.'),
  (8236839, 2, '170sqft of gravel, removing (1) section of Palm tree and hauling debris&nbsp;'),
  (8240125, 3, 'Drainage<br />
Install approx 170 lf of 2” SDR drainpipe connected to existing sum pump system<br />
Install approx 20 lf of 3” SDR drainpipe and connect to existing downspouts<br />
Core curb in 2 locations<br />
COST $2700<br />
Gate track<br />
Install concrete pad for gate track & gate motor<br />
Veneer track with paving stones matching driveway<br />
COST $1800<br />
Total Cost $4,500 (check/cash price)'),
  (8247002, 5, '10lf BBQ with stucco finish and standard concrete color countertop. 2 gfci and installing owner provided equipment. '),
  (8247007, 4, '7 pilasters 6'' tall 18 inches wide with smooth stucco finish with Pip cap or brick cap depending on owner preference.&nbsp;'),
  (8251844, 3, '555 Sq ft of white concrete additional. '),
  (8251846, 4, '225 Sq ft of sealer for front of wall
100 Sq ft of veneer for kitchen 

'),
  (8256643, 9, NULL),
  (8257730, 1, '2 citrus 15 gallons
Meyer lemon
Bears lime
Semi dwarf for each '),
  (8257732, 2, 'Clean up of hillside with minor Grading. '),
  (8258628, 5, NULL),
  (8258735, 4, 'Softscape & Irrigation<br />
Remove shrubs in front yard<br />
Remove pool equipment wall<br />
Install (5 qty.) anti-siphon valves for drip irrigation<br />
Install Rachio brand ‘Smart’ 8-station irrigation controller<br />
Install approx. 800 sqft. of premium mulch<br />
Install approx. 64 linear feet of brown plastic bender board edging per plan<br />
Till and amend planting area soil<br />
Install the following plant sizes/quantities:<br />
(4 qty.) 24” box trees<br />
(78 qty.) 5 gal plants<br />
(129 qty.) 1 gal plants<br />
(10 qty.) dirt flats of groundcover<br />
Install criss-cross wires for rear wall vines<br />
Lay weed barrier fabric<br />
Install 3” of decomposed granite around herb garden, approx. 75 sqft<br />
Install 3” of decomposed granite in front yard, approx. 278 sqft<br />
Install owner-provided pots, fill with 50/50 topsoil and planter mix<br />
COST $21,446<br />
Lighting<br />
Install (2 qty.) 200-watt transformers<br />
Install (5 qty.) ‘Lightcraft’ or equal LED path lights<br />
Install (3 qty.) ‘Lightcraft’ or equal LED step lights<br />
Install (14 qty.) ‘Lightcraft’ or equal LED flood lights<br />
Install (7 qty.) ‘Lightcraft’ or equal LED spot lights<br />
Connect to FX timer<br />
Wire up all fixtures<br />
COST $5,519<br />
<br />
Pool Automation<br />
Install ‘Jandy’ brand ‘iAqualink-IQ904 PS-4’ or equivalent automation system<br />
COST $2,634<br />
Option - Pool Heater<br />
Install ‘Jandy’ brand 400K BTU heater<br />
COST $4,372<br />
Option - Replace Pool Filter<br />
Replace existing pool filter with ‘Jandy’ brand ‘CV460’ cartridge filter<br />
COST $1,661<br />
Option - Replace Pool Pump<br />
Replace existing pool pump with ‘Jandy’ brand 2.7 HP variable speed pump<br />
COST $2,020<br />
<br />
Total Cost $37,652 - Cash/Check Price'),
  (8258788, 3, NULL),
  (8258897, 6, 'Install fence posts.&nbsp;&nbsp;'),
  (8265412, 3, NULL),
  (8265628, 1, NULL),
  (8268742, 6, 'Install (14) Dodonaea 5 gal along patio in side yard. Add 2 driplines along outside of plants.<br />
Add (4) Dodonaea 5 gal behind newly planted euphorbias (hummingbird feeder area)<br />
(10) flats Lampranthus on slope<br />
(5) PLANTS FROM OUR YARD<br />
<br />
Grand Total $1915'),
  (8270445, 10, NULL),
  (8270461, 11, '100sqft'),
  (8270601, 8, NULL),
  (8271748, 4, NULL),
  (8272818, 9, '1850 Sq ft of concrete with 15 linear feet of step.<br />Natural gray concrete with trowel finish. <br />No stain or hardener included. '),
  (8272827, 10, NULL),
  (8274973, 26, NULL),
  (8276578, 15, NULL),
  (8276581, 16, NULL),
  (8276583, 17, NULL),
  (8276623, 18, NULL),
  (8282871, 4, NULL),
  (8283068, 6, NULL),
  (8283533, 1, NULL),
  (8283683, 2, NULL),
  (8288369, 6, NULL),
  (8288373, 7, NULL),
  (8295256, 2, 'Install one path light.'),
  (8296289, 19, NULL),
  (8296303, 20, NULL),
  (8296335, 11, 'Cleanup some of the existing plant material in the planters flanking the turf area<br />
Adding more plants for these planters<br />
Adding (1) replacement Carolina Cherry'),
  (8298141, 5, NULL),
  (8301244, 1, NULL),
  (8301450, 21, NULL),
  (8301897, 2, NULL),
  (8303848, 3, 'chip out existing stucco. Fix wire, install new wire if necessary. Install brown coat, install stucco coats up to window line.'),
  (8303976, 22, NULL),
  (8305847, 27, 'Credit for (2) 15 gal palms @ $90 each'),
  (8305892, 1, '<span style="font-size: 11pt"><span>1MM umbrella at $9,420.30 split</span></span>'),
  (8309312, 5, NULL),
  (8310738, 1, NULL),
  (8310757, 2, NULL),
  (8312776, 3, 'We used existing piping for the back and front slope areas, we had to replace the valves,drip tubing and spray heads that were burned.<br />
We also used 2 full irrigation zones for sod area'),
  (8315288, 1, NULL),
  (8316361, 4, 'Driveway extension to second slab 300 sq ft '),
  (8320644, 6, NULL),
  (8321081, 7, NULL),
  (8325521, 6, NULL),
  (8327561, 2, NULL),
  (8327564, 8, '<span style="font-size: small"><span style="color: rgba(34, 34, 34, 1)"><span style="font-family: Arial, Helvetica, sans-serif"><span style="font-style: normal"><span style="font-variant-ligatures: normal"><span style="font-variant-caps: normal"><span style="font-weight: 400"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="widows: 2"><span style="word-spacing: 0"><span style="white-space: normal"><span style="background-color: rgba(255, 255, 255, 1)"><span><span style="text-decoration-style: initial"><span style="text-decoration-color: initial"><b><span style="font-size: 12pt"><span style="font-family: "Futura PT Book", sans-serif">NEW PLANTINGS: *Please review existing drip irrigation for new planting as part of scope</span></span></b></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br />
<span style="font-size: small"><span style="color: rgba(34, 34, 34, 1)"><span style="font-family: Arial, Helvetica, sans-serif"><span style="font-style: normal"><span style="font-variant-ligatures: normal"><span style="font-variant-caps: normal"><span style="font-weight: 400"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="widows: 2"><span style="word-spacing: 0"><span style="white-space: normal"><span style="background-color: rgba(255, 255, 255, 1)"><span><span style="text-decoration-style: initial"><span style="text-decoration-color: initial"><b> </b></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br />
<span style="font-size: small"><span style="color: rgba(34, 34, 34, 1)"><span style="font-family: Arial, Helvetica, sans-serif"><span style="font-style: normal"><span style="font-variant-ligatures: normal"><span style="font-variant-caps: normal"><span style="font-weight: 400"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="widows: 2"><span style="word-spacing: 0"><span style="white-space: normal"><span style="background-color: rgba(255, 255, 255, 1)"><span><span style="text-decoration-style: initial"><span style="text-decoration-color: initial"><b><u><span style="font-size: 12pt"><span style="font-family: "Futura PT Book", sans-serif">Front to the east of Driveway:</span></span></u></b></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br />
<span style="font-size: small"><span style="color: rgba(34, 34, 34, 1)"><span style="font-family: Arial, Helvetica, sans-serif"><span style="font-style: normal"><span style="font-variant-ligatures: normal"><span style="font-variant-caps: normal"><span style="font-weight: 400"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="widows: 2"><span style="word-spacing: 0"><span style="white-space: normal"><span style="background-color: rgba(255, 255, 255, 1)"><span><span style="text-decoration-style: initial"><span style="text-decoration-color: initial"><span style="font-size: 12pt"><span style="font-family: "Futura PT Book", sans-serif">(7) 15 gallon Salvia Clevelandii or ‘Celestial Blue”</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span>
<h1 style="margin-right: 15px; text-indent: 0"><span style="font-size: 24pt"><span style="background: rgba(255, 255, 255, 1)"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(34, 34, 34, 1)"><span style="font-style: normal"><span style="font-variant-ligatures: normal"><span style="font-variant-caps: normal"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="widows: 2"><span style="word-spacing: 0"><span style="white-space: normal"><span><span style="text-decoration-style: initial"><span style="text-decoration-color: initial"><span style="line-height: 12pt"><span style="font-size: 12pt"><span style="font-family: "Futura PT Book", sans-serif"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: normal">(1) 5 gallon </span></span></span></span><span style="font-size: 12pt"><span style="font-family: "Futura PT Book", sans-serif"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: normal">Eriogonum giganteum ''St. Catherines Lace''</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></h1>

<h1 style="margin-right: 15px; text-indent: 0"><span style="font-size: 24pt"><span style="background: rgba(255, 255, 255, 1)"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(34, 34, 34, 1)"><span style="font-style: normal"><span style="font-variant-ligatures: normal"><span style="font-variant-caps: normal"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="widows: 2"><span style="word-spacing: 0"><span style="white-space: normal"><span><span style="text-decoration-style: initial"><span style="text-decoration-color: initial"><span style="line-height: 12pt"><span style="font-size: 12pt"><span style="font-family: "Futura PT Book", sans-serif"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: normal">(5) 3 gallon Achillea Millefolium Common Yarrow</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></h1>

<h1 style="margin-right: 15px; text-indent: 0"><span style="font-size: 24pt"><span style="background: rgba(255, 255, 255, 1)"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(34, 34, 34, 1)"><span style="font-style: normal"><span style="font-variant-ligatures: normal"><span style="font-variant-caps: normal"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="widows: 2"><span style="word-spacing: 0"><span style="white-space: normal"><span><span style="text-decoration-style: initial"><span style="text-decoration-color: initial"><span style="line-height: 12pt"><span style="font-size: 12pt"><span style="font-family: "Futura PT Book", sans-serif"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: normal">(2) 5 gallon <span style="background: rgba(255, 255, 255, 1)">Elymus Condensatus ''Canyon Prince''</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></h1>

<h1 style="margin-right: 15px; text-indent: 0"><span style="font-size: 24pt"><span style="background: rgba(255, 255, 255, 1)"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(34, 34, 34, 1)"><span style="font-style: normal"><span style="font-variant-ligatures: normal"><span style="font-variant-caps: normal"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="widows: 2"><span style="word-spacing: 0"><span style="white-space: normal"><span><span style="text-decoration-style: initial"><span style="text-decoration-color: initial"><span style="line-height: 12pt"><span style="font-size: 12pt"><span style="background: rgba(255, 255, 255, 1)"><span style="font-family: "Futura PT Book", sans-serif"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: normal">(5) 3 gallon Lomandra longifolia Breeze</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></h1>

<h1 style="margin-right: 15px; text-indent: 0"><span style="font-size: 24pt"><span style="background: rgba(255, 255, 255, 1)"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(34, 34, 34, 1)"><span style="font-style: normal"><span style="font-variant-ligatures: normal"><span style="font-variant-caps: normal"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="widows: 2"><span style="word-spacing: 0"><span style="white-space: normal"><span><span style="text-decoration-style: initial"><span style="text-decoration-color: initial"><span style="line-height: 12pt"><span style="font-size: 12pt"><span style="background: rgba(255, 255, 255, 1)"><span style="font-family: "Futura PT Book", sans-serif"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: normal">(3) 5 gallon Ceonothus Hearstiorum or ‘Yankee Point’</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></h1>

<h1 style="margin-right: 15px; text-indent: 0"><span style="font-size: 24pt"><span style="background: rgba(255, 255, 255, 1)"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(34, 34, 34, 1)"><span style="font-style: normal"><span style="font-variant-ligatures: normal"><span style="font-variant-caps: normal"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="widows: 2"><span style="word-spacing: 0"><span style="white-space: normal"><span><span style="text-decoration-style: initial"><span style="text-decoration-color: initial"><span style="line-height: 12pt"><span style="font-size: 12pt"><span style="background: rgba(255, 255, 255, 1)"><span style="font-family: "Futura PT Book", sans-serif"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: normal">(2) 5 gallon </span></span></span></span></span><span style="font-size: 12pt"><span style="font-family: "Futura PT Book", sans-serif"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: normal">Calystegia macrostegia ''Anacapa Pink'' (morning glory)</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></h1>

<h1 style="margin-right: 15px; text-indent: 0"><span style="font-size: 24pt"><span style="background: rgba(255, 255, 255, 1)"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(34, 34, 34, 1)"><span style="font-style: normal"><span style="font-variant-ligatures: normal"><span style="font-variant-caps: normal"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="widows: 2"><span style="word-spacing: 0"><span style="white-space: normal"><span><span style="text-decoration-style: initial"><span style="text-decoration-color: initial"><span style="line-height: 12pt"> </span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></h1>
<span style="font-size: small"><span style="color: rgba(34, 34, 34, 1)"><span style="font-family: Arial, Helvetica, sans-serif"><span style="font-style: normal"><span style="font-variant-ligatures: normal"><span style="font-variant-caps: normal"><span style="font-weight: 400"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="widows: 2"><span style="word-spacing: 0"><span style="white-space: normal"><span style="background-color: rgba(255, 255, 255, 1)"><span><span style="text-decoration-style: initial"><span style="text-decoration-color: initial"><b><u><span style="font-size: 12pt"><span style="font-family: "Futura PT Book", sans-serif">Along Dimmick the West of Driveway:</span></span></u></b></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br />
<span style="font-size: small"><span style="color: rgba(34, 34, 34, 1)"><span style="font-family: Arial, Helvetica, sans-serif"><span style="font-style: normal"><span style="font-variant-ligatures: normal"><span style="font-variant-caps: normal"><span style="font-weight: 400"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="widows: 2"><span style="word-spacing: 0"><span style="white-space: normal"><span style="background-color: rgba(255, 255, 255, 1)"><span><span style="text-decoration-style: initial"><span style="text-decoration-color: initial"><span style="font-size: 12pt"><span style="font-family: "Futura PT Book", sans-serif">(3) 15 gallon Salvia Clevelandii or ‘Celestial Blue”</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span>

<h1 style="margin-right: 15px; text-indent: 0"><span style="font-size: 24pt"><span style="background: rgba(255, 255, 255, 1)"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(34, 34, 34, 1)"><span style="font-style: normal"><span style="font-variant-ligatures: normal"><span style="font-variant-caps: normal"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="widows: 2"><span style="word-spacing: 0"><span style="white-space: normal"><span><span style="text-decoration-style: initial"><span style="text-decoration-color: initial"><span style="line-height: 12pt"><span style="font-size: 12pt"><span style="font-family: "Futura PT Book", sans-serif"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: normal">(3) 3 gallon Achillea Millefolium Common Yarrow</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></h1>

<h1 style="margin-right: 15px; text-indent: 0"><span style="font-size: 24pt"><span style="background: rgba(255, 255, 255, 1)"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(34, 34, 34, 1)"><span style="font-style: normal"><span style="font-variant-ligatures: normal"><span style="font-variant-caps: normal"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="widows: 2"><span style="word-spacing: 0"><span style="white-space: normal"><span><span style="text-decoration-style: initial"><span style="text-decoration-color: initial"><span style="line-height: 12pt"><span style="font-size: 12pt"><span style="font-family: "Futura PT Book", sans-serif"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: normal">(3) 5 gallon <span style="background: rgba(255, 255, 255, 1)">Elymus Condensatus ''Canyon Prince''</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></h1>

<h1 style="margin-right: 15px; text-indent: 0"><span style="font-size: 24pt"><span style="background: rgba(255, 255, 255, 1)"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(34, 34, 34, 1)"><span style="font-style: normal"><span style="font-variant-ligatures: normal"><span style="font-variant-caps: normal"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="widows: 2"><span style="word-spacing: 0"><span style="white-space: normal"><span><span style="text-decoration-style: initial"><span style="text-decoration-color: initial"><span style="line-height: 12pt"><span style="font-size: 12pt"><span style="background: rgba(255, 255, 255, 1)"><span style="font-family: "Futura PT Book", sans-serif"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: normal">(3) 3 gallon Lomandra longifolia Breeze</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></h1>
'),
  (8333305, 7, NULL),
  (8333783, 1, NULL),
  (8334043, 8, NULL),
  (8334046, 9, NULL),
  (8334052, 10, NULL),
  (8334085, 11, NULL),
  (8339219, 1, 'increase of retaining wall height from 24" to 42"<br />
increase of footing size from 12" to 24" with new key course. '),
  (8339256, 11, '650 sq ft of turf installed<br />
<br />
&nbsp;'),
  (8339304, 1, NULL),
  (8339516, 1, NULL),
  (8341513, 2, NULL),
  (8341752, 8, NULL),
  (8342703, 7, '25) 24" box podacarpis hedge installed.
'),
  (8344402, 2, 'Please see attached for scope of work!'),
  (8346471, 24, NULL),
  (8347220, 9, 'Upcharge to poured in place '),
  (8349000, 5, 'Add Salt System<br />
Furnish and install ‘Jandy’ brand ‘Apurem’ Aquapure power and control salt chlorination system<br />
COST $2,771'),
  (8351901, 2, 'Removing tree stump grinding. Removing roots as needed for underground utilities, Removing wall footing around tree'),
  (8352202, 1, NULL),
  (8355960, 2, NULL),
  (8357697, 2, NULL),
  (8358969, 1, '(3)Aeonium Zwartkopf
(2) Agave Blue Glow
(2)Agave Foxtail'),
  (8358973, 2, NULL),
  (8358974, 3, NULL),
  (8360451, 4, 'Additional Paver Curbing<br />
Added 3lf of paver soldier course to parking stop<br />
COST $363<br />
Sanitation Facilities<br />
Put in order to expedite portable sanitation pickup<br />
COST $300<br />
Paver Modification<br />
Modified paver entry to conform with Public Works inspector slope request by removing pavers,<br />
regrading paver base and reinstalling 240 sf of pavers (normally $2400 with $1620 discount)<br />
COST $780<br />
Job Total $1,443 - Cash/Check Price'),
  (8360739, 3, 'Add a drip to this area'),
  (8364194, 3, NULL),
  (8364201, 4, NULL),
  (8364211, 5, NULL),
  (8365630, 12, NULL),
  (8367185, 23, NULL),
  (8367251, 1, NULL),
  (8371039, 1, 'Credit for (56) 1 gallon and (1) 5 gallon plant'),
  (8371265, 1, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Bureau of Engineering Clearance: $264.42</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Supplemental Permit to Review Ret. Wall Plans: $596.65</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Extension for plan review timeframe : $305.60</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Record Notarized Bureau of Engineering Document: $38.00</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Retaining Wall & Grading Permits: $851.80</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total Cost: $2,056.47</span></span><br />
<br />
+ $450 processing time'),
  (8375530, 5, '  mainline run with sch 80 pvc 1" with sleeve. $1050
Sump pit and pump $2400
Badujet increase  $3000
'),
  (8376892, 6, 'Permit - $1,014.95<br />
Additional Concrete work for garage - $2000'),
  (8378414, 10, NULL),
  (8386084, 71, NULL),
  (8387742, 6, 'We installed a new drip zone on an old valve per contract.&nbsp; &nbsp;The old valve is not working correctly and needs to be replaced.&nbsp; &nbsp;This is the zone near the gas meter.'),
  (8388906, 1, 'Mini Pebble finsih - color TBD<br />
Tiles - 239 lnft<br />
Pool Drain'),
  (8390421, 6, 'Costs:<br />
Pool Engineering Plans: $170.78<br />
Pool &amp; Grading Plan Check: $628.17<br />
Pool &amp; Grading Permits: $1,122.51<br />
Pool Eng. Revision to Plans: $45.00<br />
Pool Supplemental Plan Check: $438.78<br />
Bureau of Engineering Clearance: $132.21<br />
Pool Supplemental Permit: $174.74<br />
Total Cost: $2,712.19'),
  (8394752, 1, NULL),
  (8394762, 1, 'Turf from original bid '),
  (8394764, 2, 'Removal of wooden door. 520 Sq feet of additional turf 
'),
  (8394767, 3, NULL),
  (8397252, 5, NULL),
  (8399280, 1, NULL),
  (8399708, 25, 'Landscape Remove misc plants Prep areas to be planted Install (7) Lady Banks Rose Vines 15 gal Pin vines to wall with anchors Install (35) Lavander 5 gal Install (52) Lantana 5 gal Install (20) Snow In Summer flats Install (15) lf of metal edging for small planters around fire pit area Convert lawn pop-ups to 12” pop-ups for small planters COST $6,607 Lighting Install (1) Flood light on hillside Install (5) Path Lights Install (3) additional spots on trees over pool COST $1,953'),
  (8400205, 2, '<p><span style="color: rgba(0, 0, 0, 1)">Pool Plan Check: $438.78</span></p>

<p><span style="color: rgba(0, 0, 0, 1)">Pool/Grading Permits: $1,305.22</span></p>

<p><span style="color: rgba(0, 0, 0, 1)">Electrical + Plumbing Permit: $158.05</span></p>

<p><span style="color: rgba(0, 0, 0, 1)">Total Cost: $2,176.33</span></p>

<p> </p>
'),
  (8400212, 2, '<p><span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(0, 0, 0, 1)">The 6 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Drafting detailed plan per county requirements, revision of scope of work. Submitting plan to structural engineering and review of detail. Online submittal for plan check, addressed comments from plan checker from building, planning, drainage, CND plan checkers. Permit issuance.</span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool Engineering Plans: $274.28</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Regional Planning Plan Check: $797.00</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool & Ret. Wall Plan Check: </span>$653.41</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool Engineering Plan Revision: $150.08</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">CND Clearance Deposit: $4,282.09</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool & Ret. Wall Permits: </span>$1,842.46</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Total Cost: $7,999.32</span></span></span></p>
'),
  (8403513, 1, 'Concrete 130 sq ft $2460
Drainage 40 linear feet $1200
 '),
  (8403521, 2, 'Adding benching for rear of spa.'),
  (8404757, 2, 'x5 15 gallons (incl Crepe Myrtle tree)<br />
x33 5 gallons<br />
x28 1 gallons<br />
<br />
Tilling and amending soils for planters'),
  (8404761, 3, NULL),
  (8404765, 4, 'to backfill circular raised planters&nbsp;'),
  (8407370, 1, 'Plaster choice is Stonescapes Aqua White (no extra)<br />
<br />
Tile is NPT Continental 3x6 pacific blue $280 upcharge'),
  (8408600, 4, NULL),
  (8408632, 2, 'OK via email'),
  (8409689, 5, 'Includes stucco, waterproofing, soil backfill'),
  (8409777, 6, 'Please bring small 1/3 of a yard of crushed gravel to fill bottoms of each pot and some some mesh&nbsp;'),
  (8410004, 8, 'Seal existing pavers and fix (2) pieces of bullnose for step area'),
  (8410049, 7, NULL),
  (8411253, 3, NULL),
  (8416413, 3, 'from 8x6 to 9x7 feet'),
  (8416654, 8, '5 in ground for Boxwood<br />
5 steps lights (for paver steps)&nbsp;'),
  (8416657, 9, NULL),
  (8417320, 2, NULL),
  (8417360, 3, 'Depth originally specified for 12 feet drilled.&nbsp; Actual drilling was 25 feet per engineer requirement.&nbsp;<br />
In addition, the job required two machines instead of one.&nbsp;<br />
<br />
Specialized mini rig for hard access areas<br />
<br />
Also hit boulders requiring breaker tooling and added time.<br />
<br />
Additional cost covers.<br />
<br />
Drill Costs.<br />
Additional Rebar<br />
Additional Concrete<br />
Require heavier crane to drop 28 foot cage.&nbsp;<br />
Additional machine delivery charge.<br />
Also hit bolders required retooling and breaker.'),
  (8417598, 12, NULL),
  (8425353, 5, 'Repair 1 irrigation valve '),
  (8428560, 1, NULL),
  (8435619, 2, 'Measured out approx 500sqft (incl wasteage) on site&nbsp;'),
  (8437203, 43, '24" limestone vessel (purchased by HO) to be converted into fire feature (to be delivered and placed into desired spot by delivery company)<br />
Will need to provide lava rocks or glass (samples to client)<br />
Gas line (we''ve already stubbed up for this) and burner<br />
Vessel will need to be drilled at bottom for pipe<br />
 '),
  (8465186, 1, NULL),
  (8465653, 3, NULL),
  (8466961, 7, NULL),
  (8471187, 4, NULL),
  (8471491, 3, NULL),
  (8472956, 5, NULL),
  (8473140, 10, NULL),
  (8475564, 2, NULL),
  (8480966, 1, '15 x 15 pad,<br />
<br />
12 ln feet of addtional steps<br />
<br />
extra walkway concrete'),
  (8480985, 2, '140 linear feet&nbsp;<br />
<br />
Iron pipe PROW drain.&nbsp;'),
  (8481004, 3, 'Added 17 feet of additional curb and gutter and asphalt.'),
  (8481070, 4, NULL),
  (8481081, 5, NULL),
  (8481100, 6, 'Trenched 120 linear feet.&nbsp;<br />
Added second conduit.<br />
<br />
40 ln feet included in contract.'),
  (8481522, 11, 'Demo and Hauling'),
  (8486792, 13, 'We will be applying the Glaze n Seal Wet look sealer. We will be applying with a sprayer and then rolling out the sealer. This application method was requested. After sealer application, picture build will not be responsible for any underlying color deviations in the pavers.&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;'),
  (8487458, 8, '20 new podacarpis 24"'),
  (8488414, 4, '22 LF Curved Steps<br />
Additional Grading/Base&nbsp;<br />
Waterproof Sill Plate<br />
(2) Step Lights<br />
<br />
**Waiver: Client agrees to cover vents + sill plate and holds Picture Build harmless on any claims or warranty for sill plate waterproofing**'),
  (8488605, 4, NULL),
  (8489956, 6, NULL),
  (8490927, 7, 'upgrade to mini pebble'),
  (8493087, 1, NULL),
  (8493490, 1, 'Adding 1" of gravel to this area (will be 3" total of gravel) includes landscape fabric and additional demo'),
  (8500146, 13, '12 5 gallon purple wistraingia replacing lavenders in front'),
  (8503274, 2, 'Approximately 20'' of additional drain lines and 9 new drain inlets.'),
  (8504605, 3, NULL),
  (8506934, 3, 'Credit concrete install
Pavers, Angelus courtyard
8” roadbase
Client OK with ramping up to Gazebo
'),
  (8506944, 1, 'Remove existing concrete and replace with natural stone pavers (to match rest of backyard) approx 200sqft - includes demo'),
  (8510451, 2, NULL),
  (8515581, 2, NULL),
  (8515679, 10, NULL),
  (8519550, 9, '(8) 15 Gallon Podacarpus. $950<br />
(5) 5 Gallon Japanese Boxwood $200<br />
(8) 5 Gallon Lomandra $320<br />
(1) 15 Gallon Foxtail $175<br />
(2) 5 Gallon Gardenia $80'),
  (8519564, 10, 'Client onsite rewquest to transplant 10 plants'),
  (8520488, 8, 'credit for delayed response in finalizing project'),
  (8520563, 1, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Hours total:  5</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Permit Cost (Plan Review + Permit): $2,511.64</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Engineering: $170.78</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $2,682.42</span></span>'),
  (8520595, 2, '<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">The 2.5 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting detailed plan per city requirements, revision of scope of work. Submitting plan to structural engineering and review of detail. Online submission. Communication & correspondence with city plan checkers to ensure compliance with local codes and standards for approval. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Permit Cost (Plan Review + Permit): $1,483.86</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Engineering: $170.78</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $1,654.64</span></span><br />
 '),
  (8520601, 7, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">The 5 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting plan per and conc. detail per city requirements, revision of scope of work. Over the counter submission of plans to relevant authorities to ensure compliance with local codes and standards for approval. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Permit Cost (Plan Review + Permit): $1,014.95</span></span><br />
 '),
  (8520603, 3, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Time Invested to Obtain Permit: 3.5 hours.<br />
Drafting detailed plan per city requirements, revision of scope of work. Application and plan submittal online to the city. Communication and correspondence with the city plan checker. Drafted corrections per city comments. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Ret. Wall Plan Check: $329.43</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Ret. Wall Permit: $307.43</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Engineering Plans: $155.25</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Restamp of Engineering Plans: $46.58</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">BBQ, Gas & Elec. Permit: $391.51</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Patio Cover Plan Review: $260.15<br />
Patio Cover Permit Issuance: $615.86<br />
Total: $2,106.21</span></span>'),
  (8520611, 3, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">The 1.5 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Revision of scope of work.  Over-the-counter application submission to the city. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Permit Cost: $130.00</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $130.00</span></span>'),
  (8520618, 7, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="font-family: "Arial", sans-serif"><span style="color: rgba(32, 34, 39, 1)">The 2 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting detailed plan per city requirements, revision of scope of work. Submitting application & plan to city to ensure compliance with local codes and city standards for approval. Addressed comments & corrections from plan checker. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Permit Cost (Plan Review + Permit): $1,535.22</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $1,535.22</span></span><br />
 '),
  (8520881, 3, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="font-family: "Arial", sans-serif"><span style="color: rgba(32, 34, 39, 1)">The 5 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting detailed plan per city requirements, revision of scope of work. Submitting plan to structural engineering and review of detail.  Over the counter coordination/plan check submission addressed comments & corrections per plan checker. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Fireplace Plan Check: $337.29</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Fireplace Permit: $376.79</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Gas/Electrical Permit: $201.09</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total Cost: $1,965.17</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Thanks,</span></span><br />
 '),
  (8520896, 11, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="font-family: "Arial", sans-serif"><span style="color: rgba(32, 34, 39, 1)">The 1.5 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting detailed plan per city requirements, revision of scope of work. Online permit submittal. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Wall Permit: $173.93</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total Cost: $173.93</span></span><br />
 '),
  (8521211, 12, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">The 2 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting detailed plans per Bureau of Eng. requirements. Submission of application and plan to the Bureau of eng. Communication and correspondence with the bureau of engineering plan checker. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Curb Core Permit: $343.78</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total Cost: $343.78</span></span><br />
 350 paid'),
  (8521374, 8, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="font-family: "Arial", sans-serif"><span style="color: rgba(0, 0, 0, 1)">The 4 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Over the counter submission of application to relevant authorities to ensure compliance with local codes and standards for approval. Permit issuance.</span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Right of Way Use Permit<span style="color: rgba(0, 0, 0, 1)">: $537.70</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Total: $537.70</span></span></span><br />
 '),
  (8521378, 8, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Online application submission. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Permit Cost: $108.92</span></span><br />
 '),
  (8521384, 13, '<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="font-family: "Arial", sans-serif"><span style="color: rgba(0, 0, 0, 1)">The 3 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Drafting of permit plan. Over the counter submission of application to relevant authorities to ensure compliance with local codes and standards for approval. Permit issuance.</span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"> Pool Enclosure Fence Permit<span style="color: rgba(0, 0, 0, 1)">: </span>$1,870.76</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Total: </span>$1,870.76</span></span><br />
 '),
  (8521405, 3, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(0, 0, 0, 1)">The 1.5 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Drafting detailed plan per inspector requirements, revision of scope of work. Over the counter coordination/plan check submission, addressed comments from plan checker. Permit issuance.</span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool Supplemental Plan Check: $83.41</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool Supplemental Permit: $183.38</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Total Cost: $266.79</span></span></span><br />
 '),
  (8521409, 4, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">The 3 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting permit plan. Revision of scope of work.  Over-the-counter application submission to the city. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Permit Cost: $489.95</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $489.95</span></span><br />
 '),
  (8521415, 1, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(0, 0, 0, 1)">The 4 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Revision of scope of work & plans. Submitting plan to structural engineering, review of detail.  Over the counter coordination/plan check submission. Picked up corrections from the city, reviewed plan checker comments. Resubmittal to the city. Permit issuance.</span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool Engineering Plans: $170.78</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Grading Pre-Inspection Report: $161.54</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool & Grading Plan Check: $560.66</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool Eng. Revision to Plans: $46.58</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool & Grading Permits: $994.74</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Total Cost: $1,934.30</span></span></span><br />
 '),
  (8521420, 4, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Submitting application online. Permit issuance.</span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Street Use Permit: </span>$66.67</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Total Cost: </span>$66.67</span></span><br />
 '),
  (8521597, 3, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(0, 0, 0, 1)">The 5 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting detailed plan per city requirements, revision of scope of work. Application and plan submittal online to Alhambra city. Communication & correspondence with city plan checkers. Drafting/updating plans per city comments/corrections. Communication & correspondence with soils eng.<span style="color: rgba(0, 0, 0, 1)"> Permit issuance.</span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool Engineering Plans: $377.78</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Planning Plan Review: $291.02</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool /Grading Plan Check: </span>$1,614.43</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Pool Engineered Restamp: $46.58</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Pool Permit: $1,475.54</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Total Cost: $3,805.35</span></span></span><br />
 '),
  (8521601, 1, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="font-family: "Arial", sans-serif"><span style="color: rgba(32, 34, 39, 1)">The 3.5 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting detailed plan per city requirements, revision of scope of work. Submitting plan to structural engineering and review of detail. Online submission. Communication & correspondence with city plan checkers to ensure compliance with local codes and standards for approval. Addressed and drafted corrections from County Plan Checker. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool Engineering Plans: $170.78</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool Remodel Plan Check: $405.53</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">CND Clearance Deposit: $620.00</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool Engineering Plan Revision: $46.58</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool</span> <span style="color: rgba(0, 0, 0, 1)">Remodel Permits: </span>$1,540.43</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Total Cost: $2,783.32</span></span></span><br />
 '),
  (8526590, 9, 'Mary, I wanted to extend a partial credit on the design as a courtesy for you.&nbsp;&nbsp;'),
  (8528838, 3, 'Adding 26 linear feet wall @ 18” tall, in back left corner of yard. To get 10” Bellecrete modern cap '),
  (8528839, 4, 'Current estimate has drainage included, the change order cost of $2000 is in addition to the $2091 on the contract&nbsp;'),
  (8537744, 5, 'Removing 32sqft of paver area to accomodate planter and seated wall'),
  (8540936, 2, 'Estimate quantity is more than design<br />
total of (14) 1 gallons is missing from plan'),
  (8543962, 6, NULL),
  (8545849, 5, 'Approved by client'),
  (8547323, 4, NULL),
  (8547554, 6, NULL),
  (8552723, 1, 'Brass valve install. '),
  (8553566, 14, 'Repair 3 tiles. Add 3 gallons of sealer. Tiles will be provided by client '),
  (8559941, 5, NULL),
  (8569115, 2, 'Moving irrigation valves outside deck area, reconnecting them to existing irrigation.

Running new mainline to rear irrigation valves '),
  (8569266, 7, '13 1 gallon Japanese boxwood<br />2 1 gallon foxtail fern<br />8 5 gallon privets staked '),
  (8574031, 5, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Max requested I get a plumbing permit for Pazzoky. Took about 10 min. online.</span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Plumbing/Elec. Permit: $209.28</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Ser Fee: $</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $209.28</span></span><br />
 '),
  (8574033, 9, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">I invested a cumulative of 8<span style="font-family: "Arial", sans-serif"><span style="color: rgba(32, 34, 39, 1)"> hours to get the permit issued.</span></span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="font-family: "Arial", sans-serif"><span style="color: rgba(32, 34, 39, 1)">The 8 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting plan per and details per city requirements, revision of scope of work. Over the counter submission of plans to relevant authorities to ensure compliance with local codes and standards for approval. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Permit Cost (Plan Review + Permit): $1,570.58</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $1,570.58</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">No more permits are expected pulled for this project.</span></span><br />
 '),
  (8574040, 10, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">I invested a cumulative of 3<span style="font-family: "Arial", sans-serif"><span style="color: rgba(32, 34, 39, 1)"> hours to get the permit issued.</span></span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="font-family: "Arial", sans-serif"><span style="color: rgba(32, 34, 39, 1)">The 3 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting plan per and details per city requirements, revision of scope of work. Over the counter submission of plans to relevant authorities to ensure compliance with local codes and standards for approval. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Permit Cost (Plan Review + Permit): $2,575.40</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $2,575.40</span></span>'),
  (8576280, 14, '$4 per sqft Total sqft 1850 sqft with $1600 Discount'),
  (8576666, 4, '66 sqft total 
To be replaced with brick '),
  (8576701, 5, NULL),
  (8577688, 14, NULL),
  (8580175, 13, 'All plants installed to client satisfaction.'),
  (8583602, 8, 'seal coping&nbsp;'),
  (8583665, 9, '2 additional gallons with labor if needed<br />
<br />
Can not gurantee color or finish of the stain.'),
  (8590621, 3, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Adding this to the Cost of the Permit:</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Construction Tax - $768.00</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Josselyn Garcia from Pasadena Permit Center reached out to me telling me:</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">"Hello,<br />
We’re reaching out regarding permit BLDSFR2025-02090. Upon review, we discovered that a Construction Tax fee was inadvertently omitted from the original invoice and was not paid at the time of permit issuance.<br />
We apologize for the oversight and appreciate your understanding.<br />
Please find below the invoice for the construction tax. Kindly let me know once the payment has been processed.<br />
Feel free to reach out if you have any questions."</span></span><br />
 '),
  (8592809, 1, 'Remove existing brick planting border in front yard, approx. 31 linear feet - $70<br />
Grind existing stump and remove - $151<br />
Install (1 qty.) 10’ ht. 6 x 6 redwood post set in concrete footing - $291<br />
Provide and install the following plantings: - $410<br />
Install (3 qty.) 5 gallon succulents = VARYING ALOE SPECIES (red & orange blooms), MIX IT UP.<br />
Install (1 qty.) 1 gallon succulent = ALOE<br />
Install (12 qty.) 4” herbs = ANY VARIETY, BUT MIX IT UP.<br />
Potting soil allowance - $50<br />
Install 116 linear feet of black metal benderboard edging - $2,294'),
  (8598509, 1, NULL),
  (8598511, 2, 'Re-grade/haul away 2" of dirt'),
  (8601155, 15, 'Install half a yard of white gravel. In planters and back of adu'),
  (8605724, 2, '1 more 5g x Creeping Rosemary to plant in owner provided pot'),
  (8605883, 11, '2 wifi smart plug adapter for low voltage lights '),
  (8605901, 3, NULL),
  (8605933, 7, NULL),
  (8624552, 2, 'Stain existing concrete via Paul''s recommendation. '),
  (8625095, 7, NULL),
  (8628685, 8, NULL),
  (8629397, 3, '2 man days to remove all the pots install flat pavers underneath all of them and then place them back with irrigation.'),
  (8629422, 4, '4 more 5 gallon plants needed for filling additional pots'),
  (8635271, 5, 'Remove existing pots<br />
Install flat pavers underneath pots, re-place with irrigation<br />
Provide and install (4 qty.) additional 5 gallon standard shrubs'),
  (8638104, 8, NULL),
  (8638179, 12, '<table style="border-collapse: collapse; width: 429px" width="429">
	<colgroup>
		<col style="width: 117pt" width="156" />
		<col span="3" style="width: 48pt" width="64" />
		<col style="width: 61pt" width="81" />
	</colgroup>
	<tbody>
		<tr>
			<td style="border: none; height: 20px; width: 156px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 15px"><span style="font-weight: 700"><span style="color: rgba(0, 0, 0, 1)"><span style="font-style: normal"><span style="text-decoration: none"><span>Description</span></span></span></span></span></span></td>
			<td style="border: none; width: 64px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 15px"><span style="font-weight: 700"><span style="color: rgba(0, 0, 0, 1)"><span style="font-style: normal"><span style="text-decoration: none"><span>Unit</span></span></span></span></span></span></td>
			<td style="border: none; width: 64px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 15px"><span style="font-weight: 700"><span style="color: rgba(0, 0, 0, 1)"><span style="font-style: normal"><span style="text-decoration: none"><span>QTY</span></span></span></span></span></span></td>
			<td style="border: none; width: 64px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 15px"><span style="font-weight: 700"><span style="color: rgba(0, 0, 0, 1)"><span style="font-style: normal"><span style="text-decoration: none"><span>Unit Cost</span></span></span></span></span></span></td>
			<td style="border: none; width: 81px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 15px"><span style="font-weight: 700"><span style="color: rgba(0, 0, 0, 1)"><span style="font-style: normal"><span style="text-decoration: none"><span>Total Cost</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border: 1px solid rgba(0, 0, 0, 1); height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>Mulch</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: 1px solid rgba(0, 0, 0, 1); border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>Yards</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: 1px solid rgba(0, 0, 0, 1); border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>34</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: 1px solid rgba(0, 0, 0, 1); border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>241.1765</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: 1px solid rgba(0, 0, 0, 1); border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span> $    8,200.00</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: 1px solid rgba(0, 0, 0, 1)"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>Gravel / weed barrier</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>Sf</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>1960</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>3.265306</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span> $    6,400.00</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: 1px solid rgba(0, 0, 0, 1)"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>Lighting</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>ea</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>57</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>217.5439</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span> $  12,400.00</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: 1px solid rgba(0, 0, 0, 1)"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>Metal Edging</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>ld</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>225</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>15.5</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span> $    3,487.50</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: 1px solid rgba(0, 0, 0, 1)"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>Sports Court</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>ls</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>1100</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>12.54545</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span> $  13,800.00</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: 1px solid rgba(0, 0, 0, 1)"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span> </span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span> </span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span> </span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span> </span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span> $                 -   </span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border: none; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span> $  44,287.50</span></span></span></span></span></span></td>
		</tr>
	</tbody>
</table>
'),
  (8640442, 4, NULL),
  (8642853, 7, 'Cap to be Travertine Coping'),
  (8642859, 8, 'Original Contract Planting:<br />
<br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Till and amend planting area soil, approx. 400 square feet</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Install the following plant sizes/quantities:</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>(34 qty.) 15 gal shrubs</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>(20 qty.) 5 gal shrubs</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>(37 qty.) 1 gal shrubs</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>(1 qty.) flat of groundcover</i></span></span></span><br />
 '),
  (8645167, 11, 'Adding a saltwater chlorinator
Adding pool saltwater  startup '),
  (8647867, 9, 'Install approx (30) 5 gallon shrubs (preferrably Agaia Odorata - Chinese Fragrance Plant)<br />
Price includes tilling soil and adding plant amendments&nbsp;'),
  (8649841, 1, 'Demolish and remove existing step/landing in east rear yard, approx. 12 square feet<br />
Install 28 linear feet of bullnose step build around pavers (Color: TBD)<br />
Credit for 95 linear feet of SDR35 4” drainpipe and (5 qty.) paver top inlet drains'),
  (8654220, 6, 'Blk/white spots on pavers need to be corrected before sealer goes on.&nbsp;<br />
480 sqft of sealer and 1 md'),
  (8655533, 9, NULL),
  (8656743, 10, NULL),
  (8656745, 12, NULL),
  (8656747, 13, NULL),
  (8659918, 9, NULL),
  (8660892, 4, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="font-family: "Arial", sans-serif"><span style="color: rgba(32, 34, 39, 1)">The 15 mins include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="font-family: "Arial", sans-serif"><span style="color: rgba(32, 34, 39, 1)">Online application submittal. Permit issuance.</span></span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:<br />
Electrical Permit: $105.28<br />
Gas Permit: $118.80<br />
Total: $224.08</span></span><br />
 '),
  (8660988, 1, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">The 1 hours includes:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Submission of application to the Bureau of eng. Virtual meeting with the bureau of engineering plan checker. Addressing concerns and comments. Permit issuance.<br />
<br />
Costs:<br />
Driveway Permit: $376.29</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total Cost: $376.29</span></span><br />
 '),
  (8661801, 4, 'misc debris removal from backyard - 2 5 gallon plants lava rock for fireplace'),
  (8671718, 1, 'Credit Electrical<br />
Credit Electrical in contract<br />
COST&lt; $1,808&gt;<br />
Remove Rear Fence<br />
Remove rear wood fence panel and posts/footings<br />
COST $634'),
  (8671794, 9, 'Install 2 lights for water feature '),
  (8674086, 13, '<table style="border-collapse: collapse; width: 429px" width="429">
	<colgroup>
		<col style="width: 117pt" width="156" />
		<col span="3" style="width: 48pt" width="64" />
		<col style="width: 61pt" width="81" />
	</colgroup>
	<tbody>
		<tr>
			<td style="border: none; height: 20px; width: 156px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 15px"><span style="font-weight: 700"><span style="color: rgba(0, 0, 0, 1)"><span style="font-style: normal"><span style="text-decoration: none"><span>Description</span></span></span></span></span></span></td>
			<td style="border: none; width: 64px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 15px"><span style="font-weight: 700"><span style="color: rgba(0, 0, 0, 1)"><span style="font-style: normal"><span style="text-decoration: none"><span>Unit</span></span></span></span></span></span></td>
			<td style="border: none; width: 64px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 15px"><span style="font-weight: 700"><span style="color: rgba(0, 0, 0, 1)"><span style="font-style: normal"><span style="text-decoration: none"><span>QTY</span></span></span></span></span></span></td>
			<td style="border: none; width: 64px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 15px"><span style="font-weight: 700"><span style="color: rgba(0, 0, 0, 1)"><span style="font-style: normal"><span style="text-decoration: none"><span>Unit Cost</span></span></span></span></span></span></td>
			<td style="border: none; width: 81px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 15px"><span style="font-weight: 700"><span style="color: rgba(0, 0, 0, 1)"><span style="font-style: normal"><span style="text-decoration: none"><span>Total Cost</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border: 1px solid rgba(0, 0, 0, 1); height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>Planting</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: 1px solid rgba(0, 0, 0, 1); border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>Per Plan</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: 1px solid rgba(0, 0, 0, 1); border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>1</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: 1px solid rgba(0, 0, 0, 1); border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>23600</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: 1px solid rgba(0, 0, 0, 1); border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span> $  23,600.00</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: 1px solid rgba(0, 0, 0, 1)"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>Sod</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>Sqft</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>2200</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>4.1</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span> $    9,020.00</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: 1px solid rgba(0, 0, 0, 1)"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>Irrigation</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>Ea</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>12</span></span></span></span></span></span></td>
			<td align="right" style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span>1466.667</span></span></span></span></span></span></td>
			<td style="border-bottom: 1px solid rgba(0, 0, 0, 1); padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap; border-top: none; border-right: 1px solid rgba(0, 0, 0, 1); border-left: none"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span> $  17,600.00</span></span></span></span></span></span></td>
		</tr>
		<tr>
			<td style="border: none; height: 20px; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 15px"><span style="color: rgba(0, 0, 0, 1)"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span> $  50,220.00</span></span></span></span></span></span></td>
		</tr>
	</tbody>
</table>
'),
  (8674486, 7, 'Addint an additional up light'),
  (8676298, 2, NULL),
  (8676308, 1, 'Damange to call&nbsp;'),
  (8677562, 6, '2 lights upgraded to 200 ft Electrical work run Gas line run New plumbing materials cost $2400 8 man days of labor'),
  (8679479, 12, '5 podacarpis 15 gallon<br />
60 acacia 5 gallons<br />
2 1 gallon ceonthus<br />
4 Lomandria 5 gallon<br />
20 Lomandria left side 1 irrigation zone<br />
1 flat dwarf mondo<br />
<br />
20 Lomandria upper deck side run Irrigation down same line<br />
<br />
Replace 1 24 in podacarpis warranty<br />
6 5 gallon Huntington rosemary<br />
<br />
Transplant ceonthus from front to back<br />
add irrigation emitters to all plants'),
  (8683678, 3, NULL),
  (8683691, 4, NULL),
  (8683705, 5, NULL),
  (8687233, 6, 'Adding 5 additional lights 210 per light.'),
  (8692510, 8, NULL),
  (8694019, 1, 'Pavers & Step Install an additional 27 square feet of ‘Angelus’ brand ‘Paseo I & II’ paver <br />
Drainage Install drainage lines and outlets as needed<br />
New Posts Temporarily shore existing patio posts<br />
Install (3 qty.) new posts set in concrete footings<br />
Additional Planting Provide and install (3 qty.) 15 gallon shrubs '),
  (8698638, 2, 'Contract has 25 lights allocated, plan has 36 lights called. 34 were installed. so 9 additional masonry step lights.&nbsp;'),
  (8698725, 3, NULL),
  (8699927, 14, 'removal of stucco finishes on bbq and Pilasters'),
  (8700366, 1, NULL),
  (8700688, 2, NULL),
  (8700744, 3, NULL),
  (8700763, 1, NULL),
  (8700961, 10, NULL),
  (8700976, 10, '42 ln conduit, 3 electrical wire , 1 outlet'),
  (8701006, 2, NULL),
  (8703760, 6, 'Includes programming and installation&nbsp;'),
  (8714328, 6, NULL),
  (8714332, 7, NULL),
  (8714827, 2, 'Installing Seat bench across the back fence.; 18 inches tall with Bellecrete cap 14 inches wide.<br />
<br />
Small wall approx 9 inches Tall&nbsp; x 22 Ln feet - Stucco Finish, Stucco Cap'),
  (8715635, 8, NULL),
  (8717245, 7, 'Install 1 sprinkler in front yard'),
  (8719402, 1, NULL),
  (8727919, 2, NULL),
  (8733837, 3, 'Total lights 8 little smokey (black) (change order) 

17 masonry lights (covered under original scope) 

1 wall washer (black) (covered under original scope) 

100 LF. Strip lights added (change order) 

2 dimmers'),
  (8736182, 1606992, NULL),
  (8736856, 5, NULL),
  (8737625, 11, 'Attach 30’ channel drain along the side of the pavers and between fence. Tie into storm drain line to prevent water to flow onto neighbors property.'),
  (8738911, 1, 'Approximately 81 sqft of mortared brick walkway in a herringbone pattern with a row lock border on opposite side of the drain to match the upper patio. Bricks are to be set on a reinforced concrete base.'),
  (8744130, 1, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting detailed plan per city requirements, revision of scope of work. Drivetime to Altadena One Stop Center. Over the counter submittal plans review for approval. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool</span> <span style="color: rgba(0, 0, 0, 1)">Remodel Permits: </span>$2,297.83</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Total Cost: $</span>2,297.83</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">--</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Thanks,</span></span>'),
  (8746884, 7, 'Spoke to Taran on 10/06 about the additional planting needed. New planting #s: QTY 5 x 1 gallon (previous change order had 5 gallon x QTY 4). Credit $60.'),
  (8749552, 5, '65 lnft of main line replacement on rear of property $980.00<br />
replace 8 valves 3/4 inch @ $165 each $1320.00'),
  (8749556, 6, '115 linear feet  of gas line 1 1/4"  with poly pipe trenched down 18" below grade  to city code, backfilled and compacted'),
  (8750346, 9, NULL),
  (8750685, 3, NULL),
  (8754585, 7, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool Supplemental&nbsp;Plan Check: $79.62</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Bureau of Engineering Clearance: $132.21</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool&nbsp;Supplemental&nbsp;Permit: $170.37</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Total Cost: $382.20</span></span></span><br />
&nbsp;'),
  (8758605, 2, NULL),
  (8759604, 11, NULL),
  (8760444, 2, 'Per conversation with Don/John/Dana on 10/9/25&nbsp;<br />
Difference in cost of brick&nbsp;<br />
&nbsp;'),
  (8762297, 12, NULL),
  (8762493, 7, NULL),
  (8762807, 1, 'Adding a 23linear foot curb to the garage.&nbsp;'),
  (8764656, 1, '18,000 for labor for a crew for 6 days. 3,000 per day<br />
3,000 for heavy machinery<br />
2,200 in dump fees.<br />
&nbsp;'),
  (8764731, 1, NULL),
  (8767261, 3, NULL),
  (8767516, 3, 'Need to be replaced due to water damage from city main rupture.<br />
<br />
(2) 5gallon Diosma sunset gold (3) 1gallon sesleria autumnalis (2) 1gallon lomandra longifolia. -&nbsp; $195&nbsp;<br />
<br />
15 Yards of Mulch per yard installed per contract.&nbsp; - $1,968.60<br />
<br />
&nbsp;'),
  (8767546, 7, '<p dir="ltr"><b>37 linear feet of additional gas line run 1 ¼” <br />
buried 18" below grade and compacted back<br />
$1110</b></p>

<p dir="ltr"><b>Removal of gravel and reinstall of gravel<br />
regrading of planter area<br />
2 man days via Jorge $1400</b></p>
 

<p dir="ltr"><b>¾ gas line to house fireplace </b></p>
 

<p dir="ltr"><b>35 linear feet from pool equipment to fireplace $945 buried 18" below grade and compacted back</b></p>
'),
  (8771678, 4, NULL),
  (8774013, 5, NULL),
  (8779849, 1, NULL),
  (8784909, 15, '*Asphalt demo and repair $1990<br />
*$4800 Demo down 8 inches of soil for apron<br />
*Replace Curb and Gutter $3200<br />
$9,990'),
  (8785664, 13, '<div>42 purple penstemon 1g $1075</div><div>4 Lomandria 5 g for pool area$160</div><div>Repair irrigation line in grass  $125 depending on excess</div><div>3 15 gallon blue glow $345 material delivered not planted </div><div><br /></div><div>30 5g Lomandria added to hill again $1200</div><div><br /></div><div>Move lines and move misc  existing plants down - no cost </div><div><br /></div>'),
  (8786171, 4, 'Clean Up on Hillside.&nbsp; Time and Material.&nbsp; About a crew day and dump fees.&nbsp; Price to be entered after time.&nbsp;'),
  (8786398, 2, 'Coping&nbsp;<br />
$820&nbsp;<br />
<br />
Tile<br />
$161<br />
<br />
Boulders<br />
$430'),
  (8788318, 4, NULL),
  (8788350, 5, NULL),
  (8792202, 12, NULL),
  (8792455, 1, NULL),
  (8792474, 2, 'credit for drainage work'),
  (8792767, 2, 'tree removal $580'),
  (8794232, 2, NULL),
  (8800423, 5, NULL),
  (8807339, 13, '2 15 gallon citrus<br />
6 flats of ground cover'),
  (8807352, 4, 'Replacing saltwalter chlorinator<br />
pool plumbing'),
  (8807596, 8, 'Adding stucco all the way to the wall'),
  (8808943, 2, '$2200 each palm

250 for delivery

'),
  (8809944, 4, '(2)  low profile18 catch basins - $450<br />
40 Ln Feet of 4" Sdr Drain Line - $800<br />
(2) 4" Drain Pop Ups - $40'),
  (8823004, 8, NULL),
  (8830612, 3, NULL),
  (8841814, 2, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">The 8 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">Drafting detailed plan per city requirements, revision of scope of work.&nbsp;Over the counter submission of plans to relevant authorities to ensure compliance with local codes and standards for approval. Communication and correspondence with Soils Eng, Structural Public Works, Grading Dept. for city clearances and addressing corrections and updating plans per city requirements.&nbsp;Permit&nbsp;issuance.</span></span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">Cost:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Retaining Wall &amp; Grading Plan Check: $387.04</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">GPI Report: $161.54</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Bureau of Eng. Clearance: $132.21</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Soils Review Letter: $350.68</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Soils Approval Letter: $350.68</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Retaining Wall &amp; Grading Permits: $449.36</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $1,831.51</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Time at $75/hour = $600</span></span><br />
&nbsp;'),
  (8841825, 9, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">The 3.5 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">Drafting detailed plan per city requirements, revision of scope of work. Over the counter submission of plans to relevant authorities to ensure compliance with local codes and standards for approval. Permit issuance.</span></span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">BBQ Permit: $217.98<br />
Time at $75/hour</span></span><br />
 '),
  (8841834, 7, '<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(0, 0, 0, 1)">The 1 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Application and plan submission online to Alhambra city. Communication & correspondence with city plan checkers. <span style="color: rgba(0, 0, 0, 1)">Permit issuance.</span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Grading Plan Review: $408.11</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Grading Permit: $605.30</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $1,013.41</span></span><br />
Time at $75/hour<br />
 '),
  (8841843, 14, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(0, 0, 0, 1)">The 4 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Application submittal to the Bureau of Engineering. Recording of documents. Communication and correspondence with Bureau of Engineering & </span>Office of the City Administrative Officer. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Record Waiver of Damages for Bureau of Engineering: $104.75</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">R Permit Review & Permit: $2,090.18</span></span><br />
Time at $75/hour = $300<br />
 '),
  (8854093, 1, 'Extend driveway 501 sf: $8,031<br />
<br />
Electrical trenching and conduit 65 LF: $1248'),
  (8854716, 9, 'Attached docuemnt'),
  (8857123, 4, 'for bottom of fence line&nbsp;<br />
60 linear feet'),
  (8857497, 1, 'Install conduit between light poles, weld LB @ East lamp post, rewire light poles, install 3 way switches, provide breaker + plug for sauna'),
  (8857987, 3, NULL),
  (8858376, 1, 'Installing 5 yards of rock with weed barrier and installing allowance  20 linear feet of new Edging
Reinstalling existing benderboard with new stakes. '),
  (8861101, 2, 'Patio Angelus 12x24 paver<br />
Driveway Angelus 4x12 80 mm paver&nbsp;'),
  (8861501, 1, 'Page 1 of 1<br />
Change Order For Greg Patatian - 10/31/2025<br />
18500 St. Moritz<br />
Tarzana, CA 91356<br />
Plant Size Upgrade<br />
Upgrade (44 qty.) 1 gal shrubs to 5 gal standard shrubs<br />
COST $1,056<br />
Lighting Labor Only<br />
Install the following Owner Provided materials<br />
1000 ft of 12-2 low voltage wire<br />
(10) path Lights<br />
(19) Flood lights<br />
(12) Spot Lights<br />
(2) Transformers<br />
Misc wire nuts/tape<br />
COST $2,750<br />
Job Total Cash/Check Price $3,806<br />
*This price is valid for up to 30 days from above date'),
  (8866956, 1, NULL),
  (8867006, 2, NULL),
  (8867033, 3, 'Lights to be flat side path&nbsp;'),
  (8867186, 5, NULL),
  (8867486, 16, NULL),
  (8871445, 6, NULL),
  (8879864, 10, 'Electrical work and trenching with conduit<br />
new motor<br />
new tracks<br />
Safety sensors<br />
New black pool cover<br />
Adjustment to motor housing size<br />
Drain overflow into basin'),
  (8879898, 11, 'shotcrete new steps into pool, backfill baja.&nbsp;<br />
adding small steps by spa side for new entry<br />
full length steps into pool after baja'),
  (8879929, 17, NULL),
  (8883052, 2, '<span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12pt"><span style="line-height: 105%"><span style="font-family: "Century Gothic", sans-serif">Electrical Rough In for Services</span></span></span></b></span></span></span><br />
 
<ul>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span style="font-family: "Century Gothic", sans-serif">Trench soils down 30” below final grade (assuming site at – 4 inches)</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span style="font-family: "Century Gothic", sans-serif">Trench soils 6 inches wide</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span style="font-family: "Century Gothic", sans-serif">Install 1348 Ln Feet of 5” Sch 40 PVC </span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span style="font-family: "Century Gothic", sans-serif">Install 6 inch conduit sanding layer per specification.</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span style="font-family: "Century Gothic", sans-serif">Add in 6 inch wide electrical burial warning tape. </span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span style="font-family: "Century Gothic", sans-serif">Install (2) 5” Grey PVC Conduit in all trenches.</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span style="font-family: "Century Gothic", sans-serif">Add in 6 inch wide electrical burial warning tape. </span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span style="font-family: "Century Gothic", sans-serif">Back fill additional trenching material and compact in lifts with pneumatic tamper.</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span style="font-family: "Century Gothic", sans-serif">Conductors and termination attachments by others</span></span></span></span></li>
</ul>
<br />
<span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12pt"><span style="line-height: 105%"><span style="font-family: "Century Gothic", sans-serif">COST $51,224</span></span></span></b></span></span></span><br />
<br />
<br />
<span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12pt"><span style="line-height: 105%"><span style="font-family: "Century Gothic", sans-serif">Mainline Reinstallation </span></span></span></b></span></span></span><br />
<br />
<span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10pt"><span style="line-height: 105%"><span style="font-family: "Century Gothic", sans-serif">713 ln feet of mainline was pulled out and backfilled by grader.  This was only a partial portion of the front installation where the rest is covered under the existing contract. </span></span></span></span></span></span><br />
 
<ul>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span style="font-family: "Century Gothic", sans-serif">Trench Soils down 24” below final grade. </span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span style="font-family: "Century Gothic", sans-serif">Install 1” Schedule 40 PVC piping along the front</span></span></span></span></li>
</ul>
<br />
<span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"> </span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12pt"><span style="line-height: 105%"><span style="font-family: "Century Gothic", sans-serif">COST $11,695</span></span></span></b></span></span></span><br />
<br />
<br />
<br />
<span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12pt"><span style="line-height: 105%"><span style="font-family: "Century Gothic", sans-serif">Gate Motor Electrical Conduit</span></span></span></b></span></span></span><br />
<br />
<span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 10pt"><span style="line-height: 105%"><span style="font-family: "Century Gothic", sans-serif">This is to run additional electrical conduit for gate motors.  Most of this will be run in the mainline trench and main service conduit trenches. </span></span></span></span></span></span><br />
 
<ul>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span style="font-family: "Century Gothic", sans-serif">Trench Soils down 24” below final grade in softscape </span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span style="font-family: "Century Gothic", sans-serif">Trench Soils down 30” below final grade Hardscape Areas.</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span style="font-family: "Century Gothic", sans-serif">Much of the trenching is being credited under the mainline installation so the only additional trenching and backfilling being charged is 310 feet. </span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span style="font-family: "Century Gothic", sans-serif">Install 1373 ln feet of 1” PVC Conduit.</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><span style="font-family: "Century Gothic", sans-serif">Conductors and final termination by other.</span></span></span></span></li>
</ul>
<br />
<span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"> </span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12pt"><span style="line-height: 105%"><span style="font-family: "Century Gothic", sans-serif">COST $10,792</span></span></span></b></span></span></span><br />
<br />
<br />
<span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12pt"><span style="line-height: 105%"><span style="font-family: "Century Gothic", sans-serif">ESTIMATE TOTAL $73,711</span></span></span></b></span></span></span><br />
<br />
 '),
  (8883728, 5, NULL),
  (8888729, 3, NULL),
  (8888738, 4, NULL),
  (8895380, 1, 'Fuel Mod Plans'),
  (8895448, 8, NULL),
  (8895450, 5, '40 hours of labor time<br />
2 trailer loads&nbsp;<br />
1 10 yard low boy dump&nbsp;<br />
<br />
Total cost $4300'),
  (8895471, 2, NULL),
  (8895503, 2, NULL),
  (8901506, 3, 'Concrete Landing Downsize<br />
Reduce concrete landing from 30 square feet to 16 square feet.<br />
Credit for 14 square feet of difference<br />
in rear flagstone patio'),
  (8902761, 3, NULL),
  (8902767, 4, 'Credit for using existing Heater'),
  (8902778, 6, 'Footings For Arbor&nbsp;- $230<br />
<br />
Mantel Install - $390<br />
<br />
Gate Flipping - $240'),
  (8905711, 5, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">No hours to get these issued.</span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Electrical/Plumbing Permits</span>: $129.03</span></span><br />
 '),
  (8906024, 9, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">I invested a cumulative of 20min </span><span style="font-family: "Arial", sans-serif"><span style="color: rgba(0, 0, 0, 1)">to get the permit issued.</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"> </span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="font-family: "Arial", sans-serif"><span style="color: rgba(0, 0, 0, 1)">The 20 min include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Application and plan submission online to Alhambra city. Communication & correspondence with city plan checkers. <span style="color: rgba(0, 0, 0, 1)">Permit issuance.</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"> </span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Electrical: $77.15</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $77.15</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"> </span></span><br />
 '),
  (8906033, 5, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">I invested a cumulative of 3 hour </span><span><span style="color: rgba(0, 0, 0, 1)">to get the permit issued. @75/hour</span></span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">The 3 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">Drafting detailed plan per city requirements, revision of scope of work. Over the counter submission of plans to relevant authorities to ensure compliance with local codes and standards for approval. Permit issuance.</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"> </span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">BBQ Permit: $217.98</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"> </span></span><br />
 '),
  (8910432, 6, 'Additional San Agustín sod for front yard (does not include park way)'),
  (8910472, 7, NULL),
  (8910475, 8, NULL),
  (8911553, 7, NULL),
  (8911560, 8, NULL),
  (8911580, 10, 'Irrigation inspection.'),
  (8915472, 1, NULL),
  (8916209, 1, 'An additional pallet needed for larger size paver as there are 2 different sized pavers required to complete the repair work disturbed by the fire'),
  (8918392, 1, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">The 3 hours include: @100/hour</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">Drafting detailed plan per county requirements, revision of scope of work. Online submission of plans to relevant authorities to ensure compliance with local codes and standards for approval. Communication & correspondence w/ County Plan Checkers. Permit issuance.</span></span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">CND Clearance Deposit: $</span>1,876.20</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Demo Permit: $</span>276.82</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Grading Permit: $388.79</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $2,541.81</span></span><br />
 '),
  (8921905, 6, 'Restucco entire balcony, outer and inner columns'),
  (8923578, 9, NULL),
  (8925573, 2, '8 x 15g Silver Sheen with supplemental drip irrigation<br />
Check with HO for final plant placement before planting. 2 plants will be on the other side of the Oleander.&nbsp;<br />
Note: have oleander trimmed back a couple of feet.&nbsp;'),
  (8937970, 13, '1 path light 
Lift up bricks to run wire 22 planters that are not currently wired
2 underwater lights 
1 15 gallon arbutus standard '),
  (8953046, 10, '2300sqft is listed in the contract, and only 1950sqft is necessary for install'),
  (8953345, 3, 'Credit Posts -$2,375 (no longer needed shoring or replacing)<br />
Charge for Pool Shell Repair $1600'),
  (8956961, 7, NULL),
  (8956988, 8, NULL),
  (8957385, 3, NULL),
  (8960586, 26, 'Cut concrete, demo concrete, dig out pipes to assess.'),
  (8961738, 32, 'Install roughly 1500 linear feet of 12-gauge wiring&nbsp; 3 runs of 500 feet with 3 wires.<br />
6 outlets'),
  (8964838, 1, 'As per my conversation with Hugo previous to our installation, I let him know that the cost of the installation of the apron independent of the entire driveway would be an additional $2000 (he had<br />
already provided us with a $3000 deposit).&nbsp; Hugo was invoiced for a balance of $300 without the change order being approved.&nbsp; The new balance for the project is $1700'),
  (8973829, 3, NULL),
  (8973989, 4, 'Trench and run 75 linear feet of 4” SDR35 drainpipe<br />
Excavate a 3’ x 3’ x 4’ drainage pit<br />
Fill pit with ¾” crushed gravel, approx. 1 cubic yard (Material allowance: $50/yard)<br />
Wrap with filter fabric<br />
COST $2,494'),
  (8977976, 2, NULL),
  (8977992, 2, 'direct cost'),
  (8986248, 5, NULL),
  (8987214, 1, '+ 700 sqft of brown shredded mulch (no charge to the client)'),
  (8989640, 5, 'upgrade to 16" msi beige travertine including freight. '),
  (8991314, 2, 'Please order an additional 300sqft plus what''s on the plan/contract.  No additional cost to client '),
  (8995092, 6, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">No hours to get these issued.</span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Supplemental Electrical Permit</span>: $54.74</span></span><br />
 '),
  (8995150, 10, 'Direct passthrough cost to client'),
  (8995221, 4, NULL),
  (8995302, 5, NULL),
  (8995368, 7, NULL),
  (9000915, 1, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Pool Eng. Inc</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Date: 11.19.25</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">For: Restamp on Revised Plan</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total:  $274.28</span></span><br />
 '),
  (9004822, 6, 'Electrical<br />
Trench and run electrical from meter to fire pit area, approx. 40 linear feet<br />
Install J box<br />
<br />
Dog Run - Gravel & Sand Base<br />
Credit for 280 square feet of D.G.<br />
Install 2” of pea gravel base<br />
Install 2” of road base<br />
No weed barrier fabric included<br />
<br />
Backfill<br />
Backfill approx. 5 cubic yards of soil<br />
*Additional soil may be required<br />
<br />
Sod<br />
Till and amend 145 square feet of sod area soil<br />
Install 145 square feet of ‘Marathon I’ sod or equivalent<br />
 '),
  (9008032, 6, NULL),
  (9010484, 2, 'Replace pipe that is holding water along the planter area behind east gate.'),
  (9010515, 3, 'Move the junction box from the lower patio area, relocate to the wesat side of upper pool deck area adjacent to the rock. Replace the pool light as required. Check the spa light to ensure its working properly.'),
  (9012772, 1, NULL),
  (9014892, 4, 'No Charge - John Durso approved this change order.'),
  (9015133, 7, NULL),
  (9018692, 7, '16 linear feet of Bel Air Wall with cap<br />
1 course plus footing'),
  (9018888, 2, NULL),
  (9019083, 1, NULL),
  (9020033, 8, NULL),
  (9021828, 2, NULL),
  (9024698, 11, NULL),
  (9025386, 7, NULL),
  (9027463, 1, NULL),
  (9028574, 3, NULL),
  (9028579, 4, NULL),
  (9034330, 4, 'Cut down oleander down to trunk. Use stumpaway on trunk'),
  (9035416, 9, NULL),
  (9038192, 3, 'Composite edging for backyard to separate DG and gravel approx 100 linear feet '),
  (9038222, 4, NULL),
  (9040377, 5, NULL),
  (9043701, 8, NULL),
  (9053427, 12, NULL),
  (9055369, 13, 'See attachment.
Added a salt chlorinator
Subpanel work'),
  (9058039, 5, NULL),
  (9059839, 6, NULL),
  (9060001, 8, NULL),
  (9063322, 18, 'Installing 125 15 gallon podacarpis hedge $14,375'),
  (9065943, 6, NULL),
  (9068183, 5, NULL),
  (9068197, 6, NULL),
  (9070715, 7, NULL),
  (9073277, 15, NULL),
  (9078623, 19, NULL),
  (9080142, 9, NULL),
  (9081882, 1, NULL),
  (9084570, 9, NULL),
  (9085234, 10, NULL),
  (9087656, 10, NULL),
  (9088034, 11, NULL),
  (9088096, 6, NULL),
  (9092165, 9, NULL),
  (9092188, 10, NULL),
  (9094257, 12, NULL),
  (9099487, 1, NULL),
  (9100145, 27, NULL),
  (9101321, 8, NULL),
  (9103731, 1, 'Change plastic bender board to metal edging around the citrus tree'),
  (9105711, 1, NULL),
  (9112622, 10, '1 additional path light'),
  (9113413, 2, NULL),
  (9115477, 7, NULL),
  (9118894, 12, NULL),
  (9119368, 9, NULL),
  (9124259, 1, 'Adding metal lodge poles to support existing wall approx 40 linear feet'),
  (9127001, 7, '400k jandy heater installed.&nbsp;'),
  (9127531, 8, 'Installing 3 pots on top of column. '),
  (9133254, 13, NULL),
  (9140783, 3, NULL),
  (9142128, 9, NULL),
  (9142132, 10, 'Increase in material charge for jellybean '),
  (9142151, 11, '1 new 15 gallon naval citrus dwarf&nbsp;'),
  (9143827, 14, NULL),
  (9146912, 4, NULL),
  (9147011, 5, NULL),
  (9148873, 8, NULL),
  (9149301, 7, NULL),
  (9150715, 12, 'Widen pilasters for 3'' caps'),
  (9150733, 13, NULL),
  (9162676, 1, NULL),
  (9165530, 7, 'Ran 35 ft of 5 strand wire and swapped 1 solenoid. Hours build at $75 per hour 2 and a half hours 187.50 and $80 in materials'),
  (9166182, 12, 'All irrigation is now complete.'),
  (9169087, 2, NULL),
  (9169348, 6, NULL),
  (9169350, 5, NULL),
  (9170125, 6, NULL),
  (9172769, 1, NULL),
  (9176235, 8, NULL),
  (9181272, 1, NULL),
  (9183053, 14, NULL),
  (9183102, 2, NULL),
  (9184880, 6, NULL),
  (9185337, 3, NULL),
  (9187433, 1, NULL),
  (9187441, 1, NULL),
  (9190478, 2, NULL),
  (9191698, 14, '121 linear feet of metal Edging to retain gravel on rear property line.&nbsp;'),
  (9191707, 15, '2 additional path-lights&nbsp;'),
  (9191716, 16, '3 led light shades and 6 led bulbs from lightcraft&nbsp;'),
  (9193473, 3, NULL),
  (9193654, 4, NULL),
  (9196453, 2, NULL),
  (9197036, 1, NULL),
  (9199024, 2, NULL),
  (9200275, 2, NULL),
  (9200593, 4, 'All work has been completed after installation of drain and 1 plant'),
  (9200828, 3, NULL),
  (9207421, 3, NULL),
  (9207447, 4, NULL),
  (9210532, 1, NULL),
  (9213359, 4, NULL),
  (9213389, 1, NULL),
  (9213414, 1, 'Grading front yard to picth to street/ create burm about 

Reconfigure main line for valves 
Including parts'),
  (9213483, 44, NULL),
  (9213492, 33, NULL),
  (9214899, 7, NULL),
  (9229563, 3, NULL),
  (9229978, 5, NULL),
  (9230328, 45, NULL),
  (9232160, 15, NULL),
  (9232610, 6, NULL),
  (9234132, 2, NULL),
  (9234590, 17, NULL),
  (9234715, 2, NULL),
  (9237252, 5, NULL),
  (9239197, 5, NULL),
  (9242423, 18, 'Adding 5 path lights
Adding 2 flood lights
Adding 1ground light'),
  (9242437, 19, NULL),
  (9245611, 1, NULL),
  (9248098, 2, NULL),
  (9248149, 4, NULL),
  (9248421, 1, NULL),
  (9252043, 3, 'Replacing hose bib with copper. '),
  (9253055, 1, NULL),
  (9257153, 3, NULL),
  (9257506, 2, NULL),
  (9258660, 1, NULL),
  (9260942, 1, NULL),
  (9261299, 4, NULL),
  (9264777, 13, NULL),
  (9267983, 6, NULL),
  (9268634, 1, NULL),
  (9268726, 15, NULL),
  (9268820, 2, NULL),
  (9276451, 2, NULL),
  (9276453, 6, NULL),
  (9282717, 4, NULL),
  (9286760, 1, NULL),
  (9286761, 1, NULL),
  (9286797, 2, NULL),
  (9287833, 5, NULL),
  (9288065, 3, NULL),
  (9292540, 14, NULL),
  (9294960, 1, NULL),
  (9294995, 2, NULL),
  (9301386, 7, NULL),
  (9307863, 5, NULL),
  (9321762, 1, NULL),
  (9322007, 2, NULL),
  (9332163, 1, NULL),
  (9336009, 9, NULL),
  (9343498, 4, NULL),
  (9347285, 3, NULL),
  (9348374, 2, NULL),
  (9358916, 1, NULL),
  (9360572, 8, NULL),
  (9361043, 1, NULL),
  (9361046, 2, NULL),
  (9361371, 2, NULL),
  (9361513, 5, NULL),
  (9365166, 9, 'Includes 9 inlets '),
  (9366125, 3, NULL),
  (9369331, 9, NULL),
  (9384457, 6, NULL),
  (9385309, 4, 'Pavers, drains'),
  (9385478, 4, 'Install 30 ft 2x12 pressure treated wood with metal stakes. Add basin connecting to existing drains. Mock up attached '),
  (9385533, 5, '6 Arizona flagstones '),
  (9388736, 10, NULL),
  (9393640, 1, NULL),
  (9406439, 2, NULL),
  (9406500, 2, NULL),
  (9406510, 3, NULL),
  (9406564, 4, NULL),
  (9406591, 5, NULL),
  (9406596, 6, NULL),
  (9406789, 5, NULL),
  (9411677, 7, NULL),
  (9412041, 8, NULL),
  (9412142, 9, NULL),
  (9416134, 10, NULL),
  (9417793, 8, NULL),
  (9424431, 6, NULL),
  (9424542, 7, NULL),
  (9430847, 8, NULL),
  (9435940, 3, NULL),
  (9440826, 8, NULL),
  (9446080, 1, NULL),
  (9446145, 20, NULL),
  (9446439, 4, NULL),
  (9455720, 11, NULL),
  (9455935, 10, NULL),
  (9461916, 3, NULL),
  (9472591, 1, NULL),
  (9475118, 3, NULL),
  (9475134, 4, NULL),
  (9483628, 4, NULL),
  (9485199, 3, NULL),
  (9485569, 11, NULL),
  (9492303, 5, NULL),
  (9492395, 8, NULL),
  (9492815, 2, NULL),
  (9496132, 2, NULL),
  (9500610, 1, NULL),
  (9500950, 12, NULL),
  (9502436, 13, NULL),
  (9502537, 14, NULL),
  (9505687, 9, NULL),
  (9507571, 15, 'The slope on the front of the yard is too steep. Working with the foreman, he has come up with the idea to use some wall blocks to allow the lawn to be leveled as orgionally intended in the project scope. The yard needs to be reviewed and slopes adjusted to increase flatness.'),
  (9507574, 16, '<p>I have been asking for 2+ weeks for a new design. Now the landscape team is here and is not clear on what they need to be doing. The area is not edged, drains connected, or prepared. This is delaying the laying of the sod.&nbsp;</p>
'),
  (9514383, 46, NULL),
  (9517337, 17, NULL),
  (9517531, 18, NULL),
  (9517553, 19, NULL),
  (9527128, 5, NULL),
  (9527140, 6, NULL),
  (9537706, 5, NULL),
  (9537748, 1, NULL),
  (9546288, 14, NULL),
  (9546709, 1, NULL),
  (9547532, 2, NULL),
  (9548204, 1, NULL),
  (9548384, 3, NULL),
  (9548424, 1, NULL),
  (9548551, 2, NULL),
  (9556268, 9, NULL),
  (9563217, 3, NULL),
  (9563228, 7, NULL),
  (9565065, 10, NULL),
  (9575405, 2, NULL),
  (9579181, 28, NULL),
  (9587957, 1, NULL),
  (9589701, 1, NULL),
  (9595690, 3, NULL),
  (9596238, 14, NULL),
  (9596256, 15, NULL),
  (9597867, 4, NULL),
  (9613395, 6, NULL),
  (9617774, 5, NULL),
  (9617792, 6, NULL),
  (9620448, 2, NULL),
  (9621156, 1, NULL),
  (9623745, 1, NULL),
  (9623760, 1, NULL),
  (9627838, 1, 'Extending drain to exit back of property'),
  (9637694, 20, 'Chip and stucco bond beam back side of the pool'),
  (9640121, 2, NULL),
  (9640134, 1, NULL),
  (9640543, 11, NULL),
  (9645638, 2, NULL),
  (9655347, 11, NULL),
  (9657530, 21, NULL),
  (9663126, 3, NULL),
  (9663626, 4, NULL),
  (9663892, 2, NULL),
  (9664318, 1, NULL),
  (9665300, 3, 'Jorge said we don''t need a step at the front walkway to the house and a credit would be applied.'),
  (9667449, 5, NULL),
  (9667469, 3, NULL),
  (9673961, 2, NULL),
  (9674200, 3, NULL),
  (9682566, 2, NULL),
  (9691457, 3, NULL),
  (9691470, 3, NULL),
  (9703053, 9, NULL),
  (9709143, 2, NULL),
  (9709154, 3, NULL),
  (9709183, 4, NULL),
  (9709341, 1, NULL),
  (9713607, 7, NULL),
  (9713627, 8, NULL),
  (9713762, 9, NULL),
  (9713952, 10, NULL),
  (9715829, 1, NULL),
  (9715847, 2, NULL),
  (9718240, 3, NULL),
  (9718311, 1, NULL),
  (9731259, 4, NULL),
  (9740000, 4, NULL),
  (9740143, 3, NULL),
  (9749535, 8, '1 replacement light and installation '),
  (9751096, 3, NULL),
  (9753623, 1, NULL),
  (9760001, 2, NULL),
  (9765882, 4, NULL),
  (9771652, 22, '3 glass shades 6 75 lbs bags of jellybean gravel'),
  (9771862, 5, NULL),
  (9772293, 3, NULL),
  (9773847, 2, NULL),
  (9774809, 4, NULL),
  (9782684, 6, NULL),
  (9782934, 2, NULL),
  (9788306, 2, NULL),
  (9797024, 3, NULL),
  (9799425, 7, NULL),
  (9809064, 4, NULL),
  (9823296, 5, NULL),
  (9823310, 2, NULL),
  (9827745, 1, NULL),
  (9832754, 5, NULL),
  (9838626, 9, NULL),
  (9841105, 4, NULL),
  (9841175, 1, NULL),
  (9844389, 1, NULL),
  (9844408, 2, NULL),
  (9851933, 6, NULL),
  (9857032, 3, NULL),
  (9857166, 11, NULL),
  (9859505, 1, NULL),
  (9859513, 2, NULL),
  (9859555, 1, NULL),
  (9861245, 6, NULL),
  (9861253, 12, NULL),
  (9861260, 7, NULL),
  (9861274, 8, NULL),
  (9861440, 1, NULL),
  (9861782, 1, NULL),
  (9863211, 4, 'Will use 8 linear feet of curbing.
Pour and form for 1350 sq ft of concrete up from 870'),
  (9864265, 5, NULL),
  (9864270, 5, NULL),
  (9864540, 2, NULL),
  (9866982, 1, 'Install 1 yard of premium mulch'),
  (9875685, 3, NULL),
  (9881903, 4, NULL),
  (9883741, 3, NULL),
  (9884211, 2, NULL),
  (9885687, 6, NULL),
  (9888198, 1, NULL),
  (9891048, 5, NULL),
  (9896861, 1, NULL);

UPDATE bids b
SET custom_co_id       = u.custom_co_id,
    scope_of_work_html = NULLIF(u.scope_html, '')
FROM _co_backfill u
WHERE b.bt_change_order_id = u.bt_co_id;

COMMIT;
