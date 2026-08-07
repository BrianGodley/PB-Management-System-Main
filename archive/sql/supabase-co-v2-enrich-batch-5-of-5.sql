-- ============================================================
-- v2 CO Enrichment — Batch 5 of 5
-- 1,337 CO updates (rows 5349-6685 of 6,685)
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
  (7316091, NULL, NULL, '2024-08-08 12:23:31', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7319612, '(10) 15 gallon Silver Sheen<br />
Small selection of yarrow, salvia and Westringia for underplantings', NULL, '2024-07-29 12:53:11', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7321911, '1,799 sf X .90 cents = $1,619.00<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">1,799 sf X .90 cents = $1,619.00</div></div>', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7321916, 'CMU Wall block with CMU block cap to match existing.  7 linear feet, please match 2''-30" high', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7321919, 'Adding 7 @ 10" wide  step lights under the wall caps in the courtyard.  The step lights for the steps will be the same.<br />
All dark bronze', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7321929, '3 concrete pads for fountains<br />
2 @ 15" X 28" to go in front planter<br />
1 @ 32" X 32"  in backyard.', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7321933, 'This is to lower the grade and cover the weep joints in planter next to the house by 6".  see daily log for 7-29-2024', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7321937, '2 rustic wall blocks framing entry steps.  30"-34" high  in Tuscan blend', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7322459, '12 acacia 5 gallon
12 carex sedge 1 gallon ', NULL, '2024-07-30 11:46:08', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7328135, 'Remove sod,&nbsp; Trench roughly 50 feet, adjust irrigation system.&nbsp;<br />
Instal 1 inch conduit.&nbsp; Recompact and relay sod.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7328159, 'Kitchen stain and sealing was not in previous change orders.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7337397, '5 hours of labor at $95 per hour<br />
$200 dollars of material<br />
$675<br />
&nbsp;', NULL, '2024-08-05 14:17:31', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7338426, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7340101, '$2.50 per foot for sealing<br />
$.75 per foot for cleaning.<br />
Good Customer discount&nbsp; &nbsp;$.50 per foot<br />
<br />
Total $2.75 per foot.&nbsp;<br />
Total footage 1964<br />
<br />
$5,401<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7340215, 'Burbank requested a permit on the Outdoor Kitchen.<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7340481, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7340744, 'Reimburse credit given by 360 for Picture Build trash removal.<br />
<br />
Price to 360 was 1500.&nbsp; Price reduced to 1300 to remove profit', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7341054, NULL, NULL, NULL, 1, '2024-08-05 09:51:47', 'Mo Solomon', 'Mo Solomon', 'sold'),
  (7343247, NULL, NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7345251, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7346724, 'Total wall is approx 85 linear feet<br />
50L x 2 1/2" tall <br />
23L x 18" tall<br />
12L x 12" tall <br />
<br />
Wall price includes waterproofing and smooth stucco', NULL, '2024-08-08 12:22:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7346742, 'Wall (curb) approx 73'' <br />
13'' x 16" tall<br />
60'' x 1'' tall <br />
<br />
Includes smooth stucco', NULL, '2024-08-08 12:21:26', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7346750, 'Install Palermo cobble for approx 2900sqft&nbsp;', NULL, '2024-08-08 12:21:11', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7346792, 'Removing existing asphalt driveway plus soils beneath final grade, grade entire area @2900sqft<br />
Remove existing retaining wall/footings, grade in prep for new wall @ 85 linear feet x 18" <br />
Remove curb hugging driveway, lower slope, grade in prep for new curb/small wall @ 73 linear feet ', NULL, '2024-08-08 12:20:09', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7352380, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7352381, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7352382, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7356782, 'Weed guard under all kurapia and all plants. 1,350 sf x .95. (95 cents)', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7360335, 'additional irrigation valve', NULL, '2024-08-10 14:06:35', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7360722, 'misc add ons<br />
timer<br />
cobble for mulch', NULL, NULL, 1, '2024-08-12 08:26:33', 'Mo Solomon', 'Daniel Aguilar', 'sold'),
  (7362151, NULL, NULL, '2024-08-12 07:48:24', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7368201, '5 additional step lights', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7369666, NULL, NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7372381, NULL, NULL, NULL, 3, '2024-08-14 10:30:33', 'Mo Solomon', 'Mo Solomon', 'sold'),
  (7372561, NULL, NULL, '2024-08-14 12:42:19', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7372564, NULL, NULL, '2024-08-14 12:46:36', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7372567, NULL, NULL, '2024-08-14 12:47:09', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7373414, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (7373907, '16 ficus stumps, removed and debris hauled<br />
4&nbsp; ficus stumps cut to grade, drilled and stump killed', NULL, '2024-08-14 14:19:42', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7374754, NULL, NULL, '2024-08-26 15:26:28', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7374769, '4- 5 gal creeping fig 22- gal shurbs $658<br />
190 sq ft of decorative&nbsp;gravel $864', NULL, '2024-08-26 15:25:57', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7374773, NULL, NULL, '2024-08-26 15:25:10', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7378792, 'Permit fees sidewalk $1200<br />
Traffic Control $600<br />
Admin Hours for Permits $450', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7381388, NULL, NULL, '2024-08-16 11:47:56', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7381393, NULL, NULL, '2024-08-16 11:48:25', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7381405, 'using existing line, from planter to valve, no warranty on irrigation&nbsp;', NULL, '2024-08-16 11:48:47', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7381421, 'For back permieter planters&nbsp;', NULL, '2024-08-16 11:49:12', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7385501, '15 pieces of flagstone and 60sqft of demo', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7385504, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7385509, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7385512, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7385518, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7385525, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7390286, '1) Install 3 new irrigation zones for lawn area.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;$3,300&nbsp;<br />
2) Run new wiring to equipment (difficult install). $450&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &nbsp;&nbsp;<br />
3) Till and grade soils for Sod, amend and compact 1600 sq feet.&nbsp; $4170<br />
4) Install 1600 sq feet of St Augustine (St Augustine is a premium sod).&nbsp; $3780<br />
5) 180 sq feet of Belgard Victorin paver stepper in lawn area.&nbsp; Includes 7 inches of demolition, 3 inches of base, one inch of sand.&nbsp; Mix concrete and concrete wet lay all out edge paving. $5,875<br />
6) Remove soils and grade Install 72 sq feet of DG. $475<br />
7) Install chicken coop and cage foundation work.&nbsp; Includes 72 linear feet of block set on concrete footings with rebar and grout lift cells.&nbsp; 218 sq feet of gopher mesh.&nbsp; 115 cubic feet of 3/4 limestone gravel. 48 cubic feet of soils compacted.&nbsp; &nbsp;$6,460', NULL, '2025-02-01 09:24:00', NULL, NULL, NULL, 'Brian Godley', 'lost'),
  (7391873, 'Replacing a 15 gallon Podocarpus<br />
We will flush the lines and do an irrigation inspection as a courtesy after the installation is complete.', NULL, '2024-08-28 20:42:35', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7392211, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7394309, NULL, NULL, '2024-09-08 09:14:54', NULL, NULL, NULL, 'Brian Godley', 'lost'),
  (7397002, '133sqft of tile&nbsp;&nbsp;', NULL, '2024-08-29 10:55:32', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7399163, 'Deck<br />
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
 ', NULL, NULL, 2, '2024-08-22 10:07:04', 'John Durso', 'John Durso', 'sold'),
  (7401517, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7401526, NULL, '2024-08-22 18:12:00', NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7404425, '12 5 gallon gopher baskets @ $22.00 each', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7409186, '839 sf gopher ness x $2.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7409195, '20 more 5 gal for wax leafs in back of gate. Approved verbally to Jesus', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7409243, 'Additional plants over the original budget', NULL, NULL, 1, '2024-08-26 13:15:05', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (7409312, '1. 2  Flats of Dianthus. @ $75.00.  $150.00<br />2. 12 1 gallon salvias. @ $21.50.   $258.00<br />3. 8 5 gallon gardenias @ $43.50. $348.00<br />4. 2  5 gal Fox tail agave @ $43.50. $87.00<br />5. 2 15 gallon secco @ $150.00. $300.00<br />Total: $1,143.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7409787, '30 baskets for hillside lavender and gardenias $22.00 = $660.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7409873, NULL, NULL, '2024-08-29 10:11:29', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7410398, 'This is the list Tammy ordered today:<br clear="all" />
The planting is looking amazing!<br />
Today''s additional plants to be delivered 8/27/2024:This should complete the landscaping in plants.  If you find that you want a few more during the next month where we will be having our weekly yard checks, then I can add them for you.<br />
1.  4 @ 5 gallon Gardenias X $43.50= $174.00  (On slope)<br />
2.  10 @ 5 gallon Lavenders X $43.50= $435.00 (On slope and 4 for the front side on driveway)<br />
3.  1 @ 5 gallon White Iceberg X $43.50=$43.50 ( for front right side of patio)<br />
4.  4 pink iceberg X $43.50= $174.00 (side of driveway to match the other side)<br />
2.  2 @  15 gallon secco X $150.00= $300.00  (front columns)<br />
TOTAL: $1,126.50<br />
<br />
Please approve, thank you!!', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7410430, 'There are 3 Lights in your contract<br />
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
 ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'lost'),
  (7414186, '220 sf of cal gold -1" x $3.50=  $770.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'lost'),
  (7418230, NULL, NULL, '2024-08-30 10:48:27', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7418424, NULL, NULL, '2024-09-11 18:15:20', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7420656, NULL, NULL, '2024-09-03 17:30:21', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7422811, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7422935, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7424179, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7424182, '<table style="border-collapse: collapse; width: 256px" width="256">
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
', NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7424184, 'Sealing<br />
3650 sqft * 1.4 = $5110<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7424207, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7425256, 'Move existing electrical for spa labor.
 25 LF 1/2 conduit w/wire', NULL, '2024-09-04 15:06:03', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7425261, 'moving main line and re running new mainline to reconnect to autofill', NULL, '2024-09-04 15:06:37', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7425278, NULL, NULL, '2024-09-04 15:06:57', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7425315, NULL, NULL, '2024-08-30 13:16:07', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7425758, 'Includes plumbing/steel work (plus 2 gate cylinders)&nbsp;<br />
Fixtures not included (tbd)&nbsp;', NULL, '2024-08-30 09:39:10', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7425770, 'Demo backslope in prep for new plants ($2700)<br />
Remove 2 medium sized trees ($1600)', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (7426143, NULL, NULL, '2024-08-30 10:48:01', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7426789, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7430689, 'Additional pavers 330 sq feet<br />
additional demo 330 sq ft', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7431348, NULL, NULL, NULL, 1, '2024-10-30 12:13:37', 'Mo Solomon', 'Mo Solomon', 'sold'),
  (7431832, '25 5 gallon plants @ $1100<br />
1 zone drip @$1050<br />
plant placement @$200', NULL, '2024-09-04 11:11:33', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7432400, '160 feet of bistro lights plus 2 poles/hardware', NULL, '2024-09-11 18:15:17', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7434885, NULL, NULL, '2024-09-04 11:12:48', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7435402, NULL, NULL, '2024-09-04 10:50:59', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7435762, 'tile work for bbq backsplash. Owner provided tile', NULL, '2024-09-04 15:07:24', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7437909, NULL, NULL, '2024-09-24 17:12:23', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7442257, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7445749, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7445754, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7453378, NULL, NULL, '2024-11-05 12:23:31', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7453383, '16 lf concrete steps ', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7459350, 'Credit for Irrigation and Planter change, and add for new Synthetic turf and 40lf of benderboard CO dated 9/6/2024', NULL, NULL, 1, '2024-09-30 16:09:04', 'Mo Solomon', 'Mo Solomon', 'sold'),
  (7467537, 'Price includes sand stucco for front side and waterproofing for back side, weep holes for drainage&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7472473, NULL, NULL, '2024-09-18 09:08:24', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7477917, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7479919, NULL, NULL, '2024-09-18 09:08:49', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7485664, '<h2>Change order</h2>

<p>Spoke to lawerence let him know Timer wires were ripped out. I told him it would be 90 per hour, including drive time he gave me verbal authorization. Repaired and tested every valve. I also had a guy go into shed while I was getting tools from truck kicked him out. Please draft up change or for 3 hours @$90.00 per hour</p>
', NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7486188, 'includes brown coat&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7486189, '8 linear of paver steps plus 16sqft of paver landing and demo', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7486193, NULL, NULL, '2024-09-19 15:36:15', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7493388, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7496637, NULL, NULL, NULL, 3, '2024-10-30 12:13:46', 'Mo Solomon', 'Mo Solomon', 'sold'),
  (7496642, NULL, NULL, NULL, 2, '2024-10-30 12:13:58', 'Mo Solomon', 'Mo Solomon', 'sold'),
  (7496723, '170sqft', NULL, '2024-09-24 17:12:13', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7496726, NULL, NULL, '2024-09-24 17:11:58', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (7496730, NULL, NULL, '2024-09-24 17:11:49', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7497070, '+ 300sqft&nbsp;', NULL, '2024-09-24 17:11:33', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7497072, NULL, NULL, '2024-09-24 17:11:16', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7499839, '(1) 15G Olive 
(3) 5G Leucadendron
(2) 5G Aeonium sunburst 
(1) 5G Golden Breath of Heaven
(2) 5G Little Ollie Olives
(3) 1G Lavender dentata
(7) 1G Salvia Greggii 
(3) 1G Westringia Morning Light ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7499842, '(15) 5G ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7501733, NULL, NULL, '2024-10-03 11:12:59', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7501734, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (7501736, NULL, NULL, '2024-10-08 11:56:16', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7503347, '10 linear feet', NULL, '2024-09-25 14:26:38', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (7506218, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (7506230, 'Demo soils and prep areas, grade lightly, haul additional soil<br />
approx 70''x3'' to create curb appeal in front of ficus ', NULL, '2024-10-03 11:12:02', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7508898, 'backfilling to raise grade in backyard patio', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7510132, 'left side of driveway', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7510135, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7510141, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7510164, '(12 5 gallons in contract)<br />
Added:<br />
(30) 1 gallon<br />
&nbsp;', NULL, '2024-09-27 12:18:08', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7510232, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7510462, 'Wood Fencing<br />
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
Total Cost $21,058.00 - Cash/Check Price', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7510598, 'Additional forming for segmented concrete with additional concrete pad ', NULL, '2024-11-05 12:23:13', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7512186, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7512202, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7512210, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7512617, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7512620, 'Westringia ''Grey Box''<br />
5 gallons', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7512760, '$1100 permit<br />
$1500 permit run', NULL, '2024-09-27 11:45:29', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7517437, NULL, NULL, NULL, 3, '2024-09-30 11:52:58', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (7517450, 'Plants:<br />
15 1 Gallon Lantanas Radiant $21.50 each for back planters $322.50<br />
15 1 Gallon Salvias $21.50 each for back planters $322.50<br />
2 5 gallon Fig Ivy (the 3 previously in C/O already) $42.50 $85.00<br />
<br />
Total: $730.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7518257, 'Driveway Walls (both sides)
(1) transformer ', NULL, '2024-10-03 11:13:20', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7521206, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7521324, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7523372, 'driveway apron 11 lf&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7526094, '4 Lightcraft FLAT TOP IG 63 06B 3.5 W&nbsp;<br />
3 lIGHTCRAFT BIG SMOKEY FL 105B 3.5 W<br />
These are the only ones that need to be charged.&nbsp; See Daily log on Lighting', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7527467, 'Installed new paver area with one step in side yard by water heater and ac unit. $1800<br />
Repaired 15 sqft of pavers that were damaged and added new polysand $200', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7527767, NULL, NULL, NULL, 1, '2024-10-02 14:59:43', 'Mo Solomon', 'Mo Solomon', 'sold'),
  (7528034, '(3) 5 gallon Gaura ‘Whirling Butterflies’
(1) 1 gallon Blue Agave', NULL, '2024-10-07 10:51:44', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7536269, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7536276, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7539223, NULL, NULL, '2024-10-07 14:19:34', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7542225, NULL, NULL, '2024-10-08 11:56:05', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7542824, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7543055, 'Plus (1) transformer 
Hooks for install ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7543152, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7543178, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7543300, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7543401, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7547025, 'Swap installed timer to smart timer<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Client wanted smart timer</div></div>', NULL, '2024-10-09 13:00:02', NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (7547936, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7549291, NULL, NULL, NULL, 1, '2024-10-09 15:34:54', 'Mo Solomon', 'Mo Solomon', 'sold'),
  (7549361, '(13) 1 gall plants<br />
(2) 15 gall Standard Olive Wilsonii', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7549509, 'Seated wall that goes across back of pool area<br />
24 linear feet x 18" height<br />
Sanded Stucco both sides of wall<br />
Bellecrete concrete wall cap ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7550053, 'Adjustment', NULL, '2024-10-11 09:29:22', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7550512, 'Adding one inch of 3/4 del rio over the top of existing gravel.', NULL, '2024-10-10 12:15:59', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7553424, NULL, NULL, '2024-10-10 16:45:48', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7553523, 'I dont have the original reciept but I have attached the credit card payment.&nbsp;', NULL, NULL, 1, '2024-10-10 17:23:56', 'Mo Solomon', 'Mo Solomon', 'sold'),
  (7554835, NULL, NULL, '2024-10-11 09:28:57', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7554837, NULL, NULL, '2024-10-11 09:29:39', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7555418, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7559134, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7574015, '5 5 gallon Cape Honeysuckle for the backyard columns', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7574307, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7574574, NULL, NULL, '2024-10-17 16:15:23', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7574577, 'Approx 60sqft&nbsp;', NULL, '2024-10-17 16:17:04', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7574593, NULL, NULL, '2024-10-18 10:55:18', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7574595, NULL, NULL, '2024-10-18 10:55:51', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7574598, NULL, NULL, '2024-10-18 10:56:37', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7574599, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (7576737, '1. Subcontractor shall provide a 30” x 30” concrete pad for the water heater at the ADU. The location of the pad will be determined in the field. The concrete pad shall be placed at the same time as the sidewalk concrete. $100.00<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">30"x30" x47" water heater concrete pad</div></div>', NULL, NULL, 1, '2024-11-07 12:16:22', 'Mo Solomon', 'John Durso', 'sold'),
  (7577995, NULL, NULL, '2024-10-20 17:41:49', NULL, NULL, NULL, 'Mo Solomon', 'pending'),
  (7578067, 'Upgrade is for a top cap fence ', NULL, '2024-10-30 21:54:31', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7579591, NULL, NULL, '2024-10-21 18:13:23', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7579593, NULL, NULL, '2024-10-21 18:15:51', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7579598, 'removal of 2 drip irrigation zones', NULL, '2024-10-21 18:14:20', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7580484, 'Additional pavers ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7582373, '110lf benderboard', NULL, '2024-10-21 18:15:00', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7585011, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7585201, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7586303, '5. Subcontractor shall provide additional courses of CMU block per field direction at the northeast and southeast corners of the Duplex and at the entry of the ADU. An area drain shall be added at the northeast corner of the Duplex and tied into the storm drain system. $2,460.00<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">5. Subcontractor shall provide additional courses of CMU
block per field direction at the northeast and
southeast corners of the Duplex and at the entry of
the ADU. An area drain shall be added at the northeast
corner of the Duplex and tied into the storm drain
system. $2,460.00 2 COURSE BY 25'' LONG</div></div>', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7586792, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7590961, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7590969, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7590972, '8 path lights from Vista
5 wall washers 
1 transformer ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (7591002, 'Redoing pavers in front to a different color ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'lost'),
  (7592351, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7592354, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7592496, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (7595916, '4 5 gallon privet 
1 5 gallon Jasmine 
Irrigation to all new plants', NULL, '2024-10-24 12:47:30', NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (7597272, 'Adding soul for pot
Adding new boarder and dump fees for removed paver
Credit for paver overage  ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7597277, 'Permit fees $909.09 and admin paperwork ($250)', NULL, '2024-11-05 12:22:40', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7599681, NULL, NULL, '2024-10-25 11:28:49', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7599747, NULL, NULL, '2024-10-25 11:38:08', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7599759, 'Pick up existing pavers in front of gate - reinstall sub base and pavers ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7603678, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (7605695, 'Change 2 transformers in the front yard to the smart transformers.', NULL, '2024-10-29 15:00:29', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7605701, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Add 700 sq feet of St. Augustine</div></div>', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7607330, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7609811, 'Change order consists of 25 linear ft of brown bender board. Stakes and labor are included ', NULL, '2024-10-31 10:36:29', NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (7610254, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7610686, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7610758, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7614733, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7615181, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7615195, 'REMOVE<br />
Timber Retaining Wall Excavate for wall footings Install 24 linear feet of 6” x 6” ACQ ‘Green’ timber per plan COST $1,078.00', NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7615339, 'forgot to add on original amount in contract', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7615356, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7618415, NULL, NULL, '2024-11-03 12:30:16', NULL, NULL, NULL, 'Jorge Flores', 'lost'),
  (7619656, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7625095, '$220/light and install
$435 for (1) transformer installed ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7627760, 'First Plant Change  was $2335<br />
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
', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7628516, 'Trim pittispornum.     $70.
Remove 2''  fencing.   $250.
Move sod irrigation.  $160.
Add bend a board.     $200.
Color for concrete.    $600.', NULL, '2024-11-04 20:49:46', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7632034, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7632049, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7632122, 'New Sidewalk & Driveway Aprons<br />
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
Job Total $14,899 - Cash/Check Price<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Approved by Mario</div></div>', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7632129, '3. Subcontractor shall extend the CMU retaining wall between the Duplex and ADU an additional 24” per direction of Ownership. $1,187.00<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Extend Wall Height 24”
Drill, insert rebar dowels with epoxy
Lap steel and add 2 additional block courses
Fill cells with solid grout
COST $1187
Job Total $1187 - Cash/Check Price</div></div>', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7632810, NULL, NULL, '2024-11-05 18:20:38', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7635522, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7637222, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7639006, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7639170, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7640628, '4. Subcontractor shall provide additional wood fencing at the driveway per the sketch provided by Ownership. Reference attachments #2 &amp; #3 for clarification. $3,361.00<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">4. Subcontractor shall provide additional wood fencing at
the driveway per the sketch provided by Ownership.
Reference attachments #2 & #3 for clarification.
$3,361.00</div></div>', NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7641206, '18.50 per linear foot of mainline approx 30 feet (To be verified on install.) $555<br />
$1,117 For New valve Assembly and Ground Box with new laterals and Bubblers.', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7641220, 'This will be based on time and material work will take Approx 8 working hours. This will be adjusted based on actual hours worked.<br />
$75 an hour&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'pending'),
  (7641240, 'This will be based on time and Material and will be adjusted after work is complete to reflect actual costs.<br />
Material will be Approximately $200 This is for fittings and about 10 feet of pvc pipe for connection to existing valve.<br />
$75 an hour for Labor Approximately 8 hours $600', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7645508, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7647809, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7647820, NULL, NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7648972, '12.5 lf BBQ with smooth stucco and two outlets

Connect plumbing
Install owner provided equipment. <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">10 Man Dayts</div></div>', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7648980, 'Credit for removal of pilaster <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">minus 3 man days</div></div>', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7648984, 'Driveway brick 17 x5', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7649018, 'Permit for electrical panel work ', NULL, '2024-11-12 11:44:20', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7650507, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7652937, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">raised backsplash, stone veneer, PIP cap</div></div>', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7653617, NULL, NULL, '2024-11-12 16:21:13', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7654220, 'Removing chain link fencing.', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7656554, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7658190, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7664422, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7665140, 'Demo and grade area for steppers 

Set steppers at grade to match existing steppers 
Cut steppers as needed at the wall

Remove and dump soil if needed', NULL, '2024-11-21 13:43:18', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7667867, NULL, NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7670693, NULL, NULL, '2024-11-22 16:54:01', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7670702, NULL, NULL, '2024-11-22 16:53:41', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7670746, NULL, NULL, '2024-11-22 16:53:19', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7670765, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Remove Jacuzzi,  Haul Waste,</div></div>', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7670779, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Add additional sq footage and remove section of palm tree.</div></div>', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7670793, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7682012, 'Install 48" box tree - Boething Treeland', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7685910, '520 Sq ft pavers ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7686287, '10 feet stem wall for property', NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7687126, 'Adding wiring and install for 5 lights', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7687127, 'Credit for planting that the owner paid for.', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7687134, 'Lights plus labor', NULL, NULL, 1, '2024-12-03 15:57:02', 'Jorge Flores', 'Mo Solomon', 'sold'),
  (7687135, 'Checking all valve wiring and identifying all valves.<br />
Relabel all wires in controller<br />
<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7687426, NULL, NULL, '2024-11-22 07:02:07', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7688462, 'Gravel pit install.&nbsp;<br />
<br />
digging out 2x3x3 hole, installing aqua boxes and installing gravel', NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7690210, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Fence Modification
Revised bid to account for 2x2 vertical fence
COST $2,636

Approved by Mario & Owner via email from Mario 11/22/24
"the owner has agreed to pay the additional $2,636 to provide the fence per the design in the change order. Please send a change order request to formalize this. "</div></div>', NULL, NULL, 2, '2025-03-24 12:06:50', 'Mo Solomon', 'John Durso', 'sold'),
  (7693321, '4 Creeping Figs<br />
1 15 gallon african boxwood', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7693330, 'Customer has lights to install.&nbsp;<br />
Need to install 2 column lights.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7696820, 'Checking all valve wiring and identifying all valves.<br />
Relabeling all valves<br />
Relabel all wires in controller<br />
Stamping all existing box lids<br />
<br />
Time and material Basis<br />
650 per man day (8 hours)<br />
Material will be charged at a 30 percent markup.<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7698237, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7698242, NULL, NULL, '2024-11-27 14:39:57', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7698262, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7699539, NULL, NULL, '2024-11-26 15:00:06', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7699617, NULL, NULL, '2024-12-02 20:44:49', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7699978, NULL, NULL, NULL, 1, '2024-12-03 15:57:26', 'Jorge Flores', 'Brian Godley', 'sold'),
  (7707058, 'Aprovall of the design', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7709239, 'Rwmoving stump on side yard
Hauling an dumping', NULL, NULL, 1, '2024-12-02 14:08:53', 'Carter Godley', 'Carter Godley', 'sold'),
  (7711422, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7711431, 'Plan approval choices same as listen on plan', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7712536, '30 lf conduit 1 outlet', NULL, '2024-12-03 11:55:32', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7712566, '1 path light
3 spot lights', NULL, '2024-12-03 11:55:09', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7712614, NULL, NULL, '2024-12-03 11:54:36', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7714087, NULL, NULL, '2024-12-03 16:03:07', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7717641, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7718823, 'Removal and reinstall of timber walls - 40 ln feet.&nbsp;<br />
Leveling the timber steps in front of the wall.<br />
( removed 7ft timber wall section until clarified if the addtional work beyond this change order is approved to do)<br />
( will need to add for addtional material needed in other change order)', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7718867, 'Removal of additonal wood around spa
Hauling in 4x4 and wood for rebuild', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7718869, 'Cleaning up hillside removing lose dirt 
Tamping down hill', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'lost'),
  (7718876, 'Demolition & Grading<br />
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
Job Total $62,000 - Cash/Check Price', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7719704, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7723147, '47 linear feet of steps additional', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7723151, '90 sq ft of segmented concrete walkway to street', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7723154, '31 linear feet of steps as alternative', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'pending'),
  (7723221, NULL, NULL, '2024-12-09 20:20:00', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7723400, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7725902, NULL, NULL, '2024-12-06 14:56:14', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7726840, '1. Demo and irrigation $800.00
Irrigating 80 linear ft with 2 rows of perforated hose 160 linear ft total.
Demo, haul trash, and grading are included. 

2.12 flats of senicio @$75 per flat
12x90= 900

3. 11 12 ft high 3 inch in diameter tree stakes priced at $30 per stake. 30x11= $330 installation included in labor cost.

4. 2 guys with rate @$80 per guy for 8 hour''s 
Totals $1280.00

Grand total : $3310.00
', NULL, NULL, NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (7729912, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7731709, 'Demo @ $2400<br />
Grey Concrete/Light Broom Finish for 19'' x 20'' @ $10,300', NULL, '2025-08-05 10:20:19', NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (7735601, 'Adding 12 additional railroad ties to replace rotted ones.', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7735630, 'Removing the existing wall that retains the walkway<br />
Removing the existing wall retaining the hillside<br />
Grading the hillside to slope down and not be over the deck<br />
Removing excess dirt approximately 4 yards<br />
Trenching 3 feet deep, approx 20 feet.<br />
Installing (20) 5 foot timber post to retain the walkway.', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'lost'),
  (7738443, 'For cleaning the area and fixing the hose', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7738519, '<b>Planting charge for owner provided plants<br />
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
 ', NULL, '2024-12-12 07:54:46', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7738597, '<p dir="ltr"><b>34 1 gallon plants at $21.50 each installed $731.00</b></p>

<p dir="ltr"><b>96 5 gallon plants installed at $43.50 each $4,176.00       </b></p>

<p dir="ltr"><b>2 fruit trees in 15 gallon     $620  </b></p>

<p dir="ltr"><b>1 36 in box trees installed at $1425 each </b></p>

<p dir="ltr"><b>2 flats of ground cover installed at $75 each $150</b></p>
<b>Total planting cost $7,102.00 </b>', NULL, '2024-12-12 09:22:22', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7738626, '<b>Planting charge for owner provided plants<br />
<br />
(72) 5 gallons--$3,153.75<br />
(123) 1 gallons-- $2644.50</b><br />
<br />
<br />
&nbsp;', NULL, '2024-12-12 06:31:21', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7742610, 'Install new side deck at back house. 5''x5'' all pressure treated deck  $1350<br />
<br />
<br />
COST $1,350', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7743553, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">CMU Wall
Install 4’ x 18” CMU wall
Install (2) 12”x12” plastic catch basins
COST $2,020</div></div>', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7744896, 'Install channel drain system per plan<br />
Install step transition.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7752011, 'Need to spray Nutsedge and invasive Juncus on slope', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (7758804, 'Remove and prep for new mailbox
Install new mailbox', NULL, '2024-12-18 10:09:39', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7758807, NULL, NULL, '2024-12-18 10:08:59', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7759193, 'Per email.&nbsp; Added sq footage due to paver width off on plan.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7759199, 'Added paver to install by removing planters.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7759238, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7763596, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7766233, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7769378, 'Adding new 50 amp breaker and running it to new sub panel', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7769715, '(8) flats Rosemary prostratus<br />
(30) 1 gallon Lavender (filling in between Salvia)<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7780757, 'The costs for demo &amp; remove stump (up to 1ft deep) $700<br />
Lawn 120 SF more is $440<br />
(5) shrubs is $176<br />
36 SF additional pavers $660<br />
COST $1,976', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7781059, NULL, NULL, '2025-02-06 11:47:55', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7781077, '<span style="font-size: 11pt"><span style="page-break-after: avoid"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><b><span lang="EN" style="font-size: 16pt"><span style="line-height: 106%">Demolition & Site Prep</span></span></b></span></span></span></span><br />
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
 ', NULL, '2025-02-06 12:24:20', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7782488, 'Here is the&nbsp;quote for the work.<br />
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
$7,863&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7782542, 'Hi&nbsp;&nbsp;Wil,<br />
<br />
<br />
The price for the pit will be $4,913 for demo soils removal (2 super tens) and 3 separate gravel deliveries with the geotextile&nbsp;fabric and pipe installation<br />
<br />
Best,<br />
Brian', NULL, NULL, 1, '2025-01-02 09:04:52', 'Brian Godley', 'Brian Godley', 'sold'),
  (7782640, '- Install additional 28 linear feet (12 included in previous change order) for a total of $4,620<br />
- Root work added $475', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (7782693, 'THIS IS WORK ALREADY DONE AND PAID FOR', NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7782697, '3 Crew Days. Hand Demo plus fine grading<br />
Additional equipment and driver.<br />
Plus Soils Removal&nbsp;<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7782830, 'Carter mentioned that the wall near new pool equipment has footing that is now pretty exposed. We think we should actually build a wall right in front of property wall. It will be 24" tall instead of 12" high and a bit longer. The cost would be $2090 for this. This would also mean that the pool equipment is no longer elevated, which may be a good thing.<br />
<br />
He also mentioned an option for lowering the gas line. Basically cut side concrete and install new gas line. The cost would be $2801.00. This is optional and we can of course leave gas line as it is.<br />
<br />
Lastly, all the electrical is pretty shot. I was thinking of 2 new plugs on the dg/seat wall side and 1 new plug for the pergola area. This would be $2340.', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7783108, 'Approved at site with Jimmy', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7788183, 'Replace 5 5 gallon Jasmine 14 1 gallon plants damaged by gophers', NULL, '2025-01-05 13:14:05', NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (7789148, 'Adding 3 additional&nbsp;AP-00B-01B around the Driveway.', NULL, '2025-01-06 07:52:48', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7792102, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7792381, '1) Remove existing fencing, posts etc. (not including public fence).<br />
2) Remove 4 feet x 2 foot section along back wall including minor root removal.&nbsp; 25 linear feet.&nbsp;<br />
3) Distribute portion of soils around sump pump wall and cover piping<br />
4) Back fill behind completed wall and compact.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (7793267, 'We did not install upper landing concrete steps.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7794035, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (7796534, 'Demo ($940)<br />
remove soils 7" below final grade/grade area, prep and  prep for steps <br />
<br />
Concrete ($3000 for stamped concrete with color/approx 110sqft)<br />
 ', NULL, '2025-01-13 11:50:18', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7796538, '(4) masonry lights for new steps (will connect to existing transformer)', NULL, '2025-01-13 11:51:12', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7796541, '57 linear feet of stamped concrete with color&nbsp;', NULL, '2025-01-13 11:51:38', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7796542, 'approx 360sqft of St Augustine', NULL, '2025-01-14 14:10:56', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7796545, '(20) 15 gallon Photinia @$3000<br />
(14) 24" Boxed Photinia @$4800<br />
 ', NULL, '2025-01-14 14:07:10', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7796547, '(2) drip zones for lower slope<br />
(1) spray zone for sod<br />
Will connect to existing timer&nbsp;', NULL, '2025-01-14 14:12:17', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7796550, 'Suggesting 12 up lights for entire slope area', NULL, '2025-01-20 10:36:29', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7804485, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7804668, 'Removing 40 linear feet of curbs
Removing 25 sqft of concrete
Installing 25 sqft of walkway
Installing 35 linear feet of new curbs
Topcast finish', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7804672, 'Removing 27 linear feet of new 3 inch curb', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7806605, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7807960, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7808075, 'Erik to measure wall attached to side gate entry (rebuilding wall) for section-elevation drawing to rebuild wall', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7808717, '(10) path/up lights<br />
(2) step lights<br />
(1) transformer', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7808725, '(23) up/path lights<br />
(9) masonry lights<br />
(1) transformer&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7808732, 'Add''l 151sqft of pavers (side paths and driveway)<br />
Sealant for a total of 854sqft of pavers', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7808734, '45 linear feet of Wall Cap', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7808741, '+20.8 linear feet of steps<br />
+16sqft paver landing', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7808742, 'Reducing Steppers to 23 total&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7808748, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7817241, 'removal of charge for mixing rock<br />
small basket vredit<br />
&nbsp;', NULL, '2025-01-14 22:08:38', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7817707, NULL, NULL, '2025-01-17 14:38:23', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7817714, NULL, NULL, '2025-01-17 14:37:19', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7817716, NULL, NULL, '2025-01-19 21:16:58', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7824929, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7825276, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7825286, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7825515, 'Concrete pad for Bar<br />
Concrete for trashcan', NULL, '2025-01-17 09:00:19', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (7825646, NULL, NULL, '2025-01-17 08:58:39', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7825881, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7826238, NULL, NULL, NULL, 2, '2025-01-16 15:55:16', 'Mo Solomon', 'Mo Solomon', 'sold'),
  (7827407, NULL, NULL, '2025-01-17 14:35:47', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7829786, 'Adding 60 sqft of paver for front yard', NULL, '2025-01-29 22:06:03', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7829788, 'Changing Planters for front yard edging to Bender Board', NULL, '2025-01-19 21:17:33', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7831511, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Approved over the phone</div></div>', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7832353, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7834824, 'Removing from Contract<br />
<br />
$1934 for decking<br />
$1382 for steps<br />
$2995 for railing<br />
$15130 for steps and bench<br />
$900 for fencing work in front.<br />
<br />
Total $22,321', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7839765, NULL, NULL, '2025-01-22 10:49:25', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7842703, 'Removing weeds

Adding weed barrier 

Adding mulch

For 780sqft of existing planters', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7842707, 'Adding 5 broze uplights to new planters', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7842713, NULL, NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7845600, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7845605, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7845611, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7845676, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7848151, 'Credit for 4 5 gallon plants Picking up 13 24 in boxes and planting them<br />
<br />
Discount of $200 applied, on 1700 invoice', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7853203, '14 shrubs were reduced in size from 24" to 15 gallon', NULL, '2025-01-27 12:57:58', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7855746, 'Adding 8 sqft of brick in front of front gate', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7858491, 'Credit due for lower quantity of plants<br />
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
', NULL, '2025-02-06 23:12:20', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7858511, 'Mulch Hillside -&nbsp; Roughly 4,400 square feet<br />
Gorilla Hair<br />
<br />
The original quote was for $3,800 with mix.&nbsp;<br />
<br />
No charge added for doing all Gorilla Hair.<br />
<br />
Additional $800 courtesy credit.<br />
<br />
Total price $3,000<br />
&nbsp;', NULL, '2025-02-06 23:10:42', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7858515, NULL, NULL, '2025-01-29 22:03:33', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7862157, 'Adding 2 flats of ground cover', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7862339, 'Remove debris from planter (trash planter boxes) and remove veggie box soil. Add weed barrier to planter 41'' x3'' add 2 yards of pea gravel. Install 8 station rachio.

 Total 2900.00', NULL, NULL, 1, '2025-01-29 07:38:41', 'Bryan Vielman', 'Bryan Vielman', 'sold'),
  (7863115, '5 gallons ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (7863860, 'Approved via text. Got retail magnolia for an additional +$400', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7865095, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">BP water based ‘Wet Look’ Sealer

14 hours labor
$1810 materials - (5) 5 gal buckets $330 each at Prime +tax</div></div>', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7865692, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7867505, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (7872518, 'Block Wall - 11 feet long 18 inches high for security. -&nbsp; $1925<br />
Footings for pool fencing -&nbsp; $1900<br />
Install 13 concrete pads for pool cover - $250<br />
<br />
DG pathway 72 sq feet - $475<br />
connect pool auto fill - $80<br />
<br />
&nbsp;', NULL, '2025-02-07 08:48:06', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7876258, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7877667, 'Adding surface drains in back of wall with 5 inlets&nbsp;<br />
&nbsp;', NULL, '2025-02-03 20:07:00', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7877829, NULL, NULL, '2025-02-04 14:43:45', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (7878114, NULL, NULL, '2025-02-03 13:31:51', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7878118, NULL, NULL, '2025-02-03 13:31:15', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7879260, NULL, NULL, '2025-02-04 14:43:33', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7882306, 'Sanded stucco for back of privacy wall&nbsp;', NULL, '2025-02-04 14:43:18', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7883203, NULL, NULL, '2025-02-04 21:34:14', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7883209, NULL, NULL, '2025-02-04 21:34:42', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7883212, NULL, NULL, '2025-02-04 21:35:29', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7883214, '(100) 1 gallon Ceanothus Yankee Point', NULL, '2025-02-04 21:35:59', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7883233, '3 up lights<br />
6 path lights', NULL, '2025-02-06 06:23:47', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (7883321, NULL, NULL, '2025-02-05 12:51:18', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7883444, 'We had to move the concrete pour to two dates.&nbsp; Added labor and material for waste and short load.&nbsp;&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7883508, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7883660, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7888041, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7889206, 'Courtesy No Charge Installation.&nbsp;', NULL, '2025-02-06 23:10:23', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7889228, 'Return (12) FC: Eyebrow SD 406B&nbsp;&nbsp;<br />
Add (25)&nbsp;Lightcraft Step Light 4 2700K&nbsp;', NULL, '2025-02-06 23:12:34', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7889826, 'Did not install gravel along back walkway', NULL, '2025-02-06 23:09:57', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7890927, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7890948, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7893732, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7900756, NULL, NULL, '2025-02-11 14:59:38', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7905378, NULL, NULL, '2025-02-11 14:59:03', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7905385, NULL, NULL, '2025-02-11 14:59:19', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7905394, 'approx 19 yards of soil to backfill planter areas', NULL, '2025-02-11 14:59:57', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7905901, NULL, NULL, '2025-02-14 23:01:12', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7915493, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7918835, NULL, NULL, '2025-02-14 23:00:38', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7918942, 'Approved via phone call', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7923900, 'Repairing cracks in the stucco. ', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7925621, '<span style="font-size: 11pt">Credit vermiculite $109.48<br />
Credit powerwash rental $48<br />
Credit new gravel $100</span>', NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7928043, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7929516, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7929520, NULL, NULL, '2025-02-20 17:11:04', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7929523, NULL, NULL, '2025-02-20 17:11:29', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7929554, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Client verbal approval at contract rate per foot.</div></div>', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7934868, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7938439, 'For pool equip', NULL, '2025-02-25 06:48:45', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7938443, NULL, NULL, '2025-02-25 06:49:13', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7938450, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (7938499, NULL, NULL, '2025-02-25 06:49:32', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7940933, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7940934, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7940997, 'To upgrade from (40) 5 gal to (24) 15 gal would be $1610.00<br />
For (8) 5 gal along block wall on other side would be $280<br />
<br />
From Moore "Yikes. Ok.  Let’s do it and hope for no more surprises.  <br />
<br />
Just fyi.  The guys are working on the step underneath the porch door (with the new stones) and I can’t open the door now.  I’m guessing they probably have a plan but just wanted to bring it up in case they didn’t notice   <br />
<br />
Thank you "', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7943770, 'Includes 3D', NULL, '2025-02-24 12:45:43', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7944514, NULL, NULL, '2025-02-25 06:49:51', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7945982, 'To use about 5 bags of 50/50 soil, add RTF seed and manure to cover it.
Cost includes materials and labor

Total cost five hundred dollars', NULL, NULL, NULL, NULL, NULL, 'Bryan Vielman', 'pending'),
  (7947300, NULL, NULL, '2025-02-25 20:18:24', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7947390, NULL, NULL, '2025-02-25 20:16:49', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7948014, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7948404, NULL, NULL, NULL, 1, '2025-02-25 09:47:47', 'Mo Solomon', 'Mo Solomon', 'sold'),
  (7950556, 'For additional lights near Pole, these will be spotlights.<br />Total cost seven hundred and fifty dollars', NULL, '2025-02-26 09:53:08', NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (7951160, 'Demo approx 300sqft $900
DG/pre stabilized approx 300sqft $1425
Plants $1000', NULL, '2025-02-25 20:17:36', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7959446, 'Adding gravel and metal edging for front walk', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7960803, 'Lights requested were installed.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7961027, 'Backyard work.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (7961395, NULL, NULL, '2025-02-28 20:28:10', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7961862, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (7962936, '<style type="text/css">td { border: 1px solid rgba(204, 204, 204, 1) }
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
Sewer trenches in back. Recompact in 8 inch lifts', NULL, NULL, 1, '2025-08-06 08:47:06', '(HR) Mo Solomon', 'Daniel Aguilar', 'sold'),
  (7963076, 'Approved via text ', NULL, NULL, 1, '2025-02-28 14:43:58', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (7966464, 'Remove existing brick/dispose
Dowel into existing footing and install 2 courses of 6” block, grout lift
Waterproof back of wall ', NULL, '2025-03-03 18:42:57', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7970334, NULL, NULL, '2025-03-05 07:26:47', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7970907, NULL, NULL, '2025-03-04 11:15:19', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7971168, '1) Install new transformer and rewire step lighting - $407<br />
2) Stucco work (2 trips) - $633', NULL, '2025-03-04 12:12:03', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7971187, NULL, NULL, '2025-03-04 11:33:26', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7973393, 'Planting &amp; Mulch<br />
Till and amend planting area soil, approx. 300 square feet<br />
Install the following plant sizes/quantities:<br />
(14 qty.) 24 in box upgraded from 15 gallons<br />
(47 qty.) 5 gal shrubs<br />
55 15 gallon plants<br />
150 sq ft of brown shredded mulch w/o weed barrier', NULL, '2025-03-04 16:41:10', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7976854, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7977104, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7979605, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7986985, 'Erosion channel next to concrete stair runoff.&nbsp; Install jute netting and 2 new catch basins.&nbsp; Install drain system. to exit point.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7996490, '<span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12pt"><span style="line-height: 105%"><span>Electrical Rough In for Parking Lights – 4,370 linear feet</span></span></span></b></span></span></span><br />
 
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
 ', NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (8001187, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8001188, '1 African sumac
1 tristania tree
1 strawberry tree ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8001214, '1 36 in box at 1250
3 15 gallon fruit trees at 300 each
(10) 15 gallon podacarpis hedge for seating area $130 each
15 5 gallons at 42.50 each 
10 1 gallons at 21.50 each 
 Total cost $4302.50
', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8002627, 'Date of Work Item Description Total Cost<br />
5/14/2024 on Install Added Rebar $3,799<br />
/3/2024 on Install 7 Extra Feet of Wall $3,738<br />
9/10/2024 on Rough Grading Work $26,237<br />
N/A Credit - Planting, Soils Specs -$7,703<br />
N/A Credit - Remove Flashing/Mesh from Wall -$2,800', NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (8003847, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (8003850, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (8003868, 'Install 2 pygmy plants. Priced at $75each and irrigate also charge 2 hours of labor at $80 an hour.<br />
<br />
(UPDATE)&nbsp; We are going to waive the labor cost as a courtesy to the client.&nbsp;', NULL, NULL, 1, '2025-03-13 11:57:19', 'Bryan Vielman', 'Bryan Vielman', 'sold'),
  (8004076, '32sqft', NULL, '2025-03-13 23:31:36', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8005188, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8005281, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8010859, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (8010862, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (8010876, NULL, NULL, '2025-03-18 11:14:36', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (8013985, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8015453, NULL, NULL, '2025-04-04 07:18:08', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (8015463, NULL, NULL, '2025-03-18 11:13:05', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (8015494, NULL, NULL, '2025-03-28 12:44:16', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (8015523, NULL, NULL, '2025-03-20 12:32:21', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8015531, 'Bury downspouts along side/back of property ', NULL, '2025-03-20 12:31:19', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8015572, '120 Sq ft of additional pavers ', NULL, '2025-03-18 11:11:54', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8015593, 'Removal of Edging and rock&nbsp;', NULL, '2025-03-18 11:08:14', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8019349, 'Trenching and installing 65 linear feet of electrical conduit.
$11 per linear foot
', NULL, '2025-03-18 19:59:11', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (8019352, 'Installing 15 linear feet of reused tile over face of demoed patio to cover exposed concrete past where new planters will be located
$20 per linear foot', NULL, '2025-03-18 19:59:35', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (8019358, 'Half of the cost for the additional material
Total was $1067 we are covering half the cost of the material because of additional cuts that needed to be made.&nbsp;', NULL, '2025-03-18 19:58:39', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (8021000, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (8026092, NULL, NULL, '2025-03-20 12:30:04', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8026097, NULL, NULL, '2025-03-20 10:41:09', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8032385, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (8040245, 'Contract has 80 linear feet alloted.

140 linear feet will be needed

60 linear feet additional at $900', NULL, '2025-05-05 15:37:00', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8048392, NULL, NULL, NULL, 1, '2025-03-27 06:53:32', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (8048396, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (8048401, '30 linear feet for storage unit (side yard)', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (8048404, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (8049292, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (8049402, NULL, NULL, '2025-03-27 10:14:21', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8050944, 'Client wants one additional fifteen gallon privet', NULL, '2025-03-27 14:02:10', NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (8055668, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8055679, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8055691, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8055795, 'conduit run from rear corner of property to fountain area', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8055804, '(4) podacarpus 15 gallon<br />
(4) 24" sumac trees <br />
(16) 10 foot lodge pole stakes<br />
5 feather reed grasses 5galllon<br />
1 15 gallon patio great majestic beauty', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8067371, 'Upgrade to Arizona River rock ', NULL, '2025-04-02 18:38:33', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8067657, '7 5 gallon privets<br />
4 24 inch box podacarpus<br />
1) 15 gallon boxwood<br />
3 15 gallon texas privets', NULL, '2025-04-02 08:51:29', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8068153, NULL, NULL, '2025-04-02 11:13:08', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (8084548, NULL, NULL, '2025-08-15 12:56:33', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8084550, NULL, NULL, '2025-08-15 12:55:55', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8088494, 'Hi John- <br />
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
', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8093861, 'Front/Left side of wall', NULL, '2025-05-07 13:34:27', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8096276, '18 linear feet of gas in original contract for a total of 82 feet', NULL, '2025-04-11 07:37:16', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8096378, NULL, NULL, '2025-04-11 07:36:44', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8099843, '865 sqft of Medium nugget Mulch', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (8099851, 'Removing Planting Hedge in the front yard beneath the wall.', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (8100050, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (8102306, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8102432, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (8102598, NULL, NULL, '2025-04-12 09:21:53', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (8102904, '(4) 6’ long steps to change to be cantilever in the lower yard area
', NULL, '2025-04-14 22:21:43', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (8103507, '42 linear feet of additional Edging ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'pending'),
  (8104754, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8104797, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8107124, NULL, NULL, '2025-04-16 21:04:15', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (8112533, NULL, NULL, '2025-04-16 19:46:11', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8113897, 'Upgrade existing twenty four inch olive to a thirty six inch box, olive fruitless', NULL, NULL, NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (8118921, 'Includes install', NULL, '2025-04-20 21:15:23', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8119848, 'Credit for implied  pots', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8124796, '<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Trench and run 75 linear feet of 220V electric from meter to EV location at front corner of house </i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Install dedicated 40 amp breaker at meter</i></span></span></span><br />
<br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>*Permits required for utilities and is not included in this price</i></span></span></span><br />
 ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8124814, 'Needed to make the lump wall, a little bit higher to retain the soil from the oak tree area. 
9 LF (One course higher)', NULL, '2025-04-19 15:52:13', 2, '2025-04-18 17:23:26', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (8124817, 'To match steps , top level area of patio should also be cantilever.', NULL, '2025-04-18 18:41:36', 1, '2025-04-18 17:26:54', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (8124828, '20” long 8” thick poured in place concrete little retaining wall to meet basketball court corner.
Wall connects to bball court concrete area, thus closing off the planter. Includes waterproofing.

See photo attached.', NULL, '2025-04-22 08:58:24', 1, '2025-04-21 13:11:38', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (8124832, 'Don’t need to order boulders!! So many on site.', NULL, '2025-04-19 15:50:10', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (8124834, NULL, NULL, '2025-04-19 15:49:18', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (8124836, 'No charge', NULL, '2025-04-19 15:48:16', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (8124840, '32 LF of CMU 8x8x16 grey block with smooth stucco and dowel ins.', NULL, '2025-04-22 08:57:25', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (8124843, 'Water will now go to street (halfway down natural concrete swale)', NULL, '2025-04-19 15:47:05', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (8124847, 'NO CHARGE ($135 value)

Nearest A/C unit, needs to meet pathway on side of house. 16 SF
(See photo of drawing)', NULL, '2025-04-19 15:45:34', 1, '2025-04-18 18:16:47', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (8124859, 'Normal price per low boy $875 includes dump fees

***Labor per low boy separate (these are man hours not material)', NULL, '2025-04-19 15:46:15', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (8127783, NULL, NULL, '2025-04-22 08:58:39', 1, '2025-04-21 11:39:44', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (8127834, 'We had 32LF in the contract and we used 6LF', NULL, '2025-04-21 14:05:05', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (8127847, NULL, NULL, '2025-04-21 14:09:03', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (8127902, 'We needed 2.5 lineal feet to clear the curve of the existing slump wall. Original measurement was 12LF.
The wall will have waterproofing but not the French drain so this cost includes a small credit for the French drain of -$100.

Juan spaced out the blocks at the bottom to allow weeping.(The rest of slump wall has no drainage plus soil is very dry)', NULL, '2025-04-22 08:57:42', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (8128221, 'See updated design in email dated 4/21', NULL, '2025-04-22 08:57:06', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (8129159, NULL, NULL, '2025-04-22 07:19:43', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8129236, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8129380, NULL, NULL, '2025-04-22 08:58:07', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (8134018, 'Permit Costs For the Sewer Permit', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (8134024, 'Cutting existing sewer<br />
Trenching for New sewer line<br />
Installing New Sewer Line', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (8134028, 'Demo For Extra Pool wall that was uncovered during Excavation.', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (8134034, 'Removing existing Brick Planter Including Plants and Steps to door.', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (8134239, 'Would need 35 linear feet of electrical more and 60 linear feet of gas more ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'lost'),
  (8138884, 'Topcast finish on concrete ', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (8139188, NULL, NULL, '2025-04-23 19:41:37', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8143252, 'Paver install includes demo approx 794sqft', NULL, '2025-04-24 16:49:15', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8143257, 'approx 25 linear feet to pop out into side garden', NULL, '2025-04-24 16:49:46', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8143260, 'Remove 148sqft of concrete and replace&nbsp; conrete light broom finish', NULL, '2025-04-24 16:49:35', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8145186, 'See attached estimate', NULL, '2025-04-25 10:30:58', 1, '2025-04-25 10:18:46', 'Dana Weinroth', 'Dana Weinroth', 'sold'),
  (8156418, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (8156763, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8159725, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">To: Beverly Hills Building Department</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Date: 04/15/25</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Pool Permit: $3,632.84</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Plumbing Permit: $268.99</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Electrical Permit: $268.99</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $4,170.82</span></span><br />
 ', NULL, '2025-04-30 14:24:18', NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (8160435, 'Angeuls Stonewall II&nbsp; wallcap in grey/charcoal', NULL, '2025-04-30 13:25:48', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8161779, '63 linear feet from crawl space to shower location ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8161786, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8161787, 'electrical, sewer, drainage', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8161789, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8161791, 'Saw cut  20'' of concrete on side of house from crawl space to corner of house in order to trench sewer line<br />
Includes patching (repouring conrcrete and coring through crawl space entrance)', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8165577, NULL, NULL, '2025-05-01 13:46:32', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8169444, '2 linear feet added on both sides for a total of 4 linear feet&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8169452, '$Cost difference is 8.33 a sq ft', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8169465, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8169472, '220 sq ft of concrete patio by sports court<br />
also to credit turf for applicable square footage', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8169474, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'lost'),
  (8169863, 'Change from Del Rio to Miners Gold DG - STABILIZED DG. Compact dg. No edging. Customer understands that slope will not contain dg indefinitely', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8169930, '1850 sq ft of concrete in white cement.&nbsp;<br />
includes 15 linear feet of a new step<br />
white concrete at $20 sf', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'lost'),
  (8169943, '46 linear feet of block compared to 34 with more smooth stucco and a larger bar seating area 11lf<br />
90 sq ft of countertop vs 56 in original<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8169949, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">cost for the lights (without materials) and transplants is $2880</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"> </span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">cost for 13 1 gallons standard plants $286</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">cost for 2 5 gallon agave and 10 5 gallon boxwood is $540</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">there was an existing change order for the additional metal edging for $900 60 linear feet</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"> </span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"> </span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">upgrading the (5)24" box to </span></span><span style="font-size: 11pt"><span>10gal Buxus Winter Gem globe from Boething </span></span><span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">will add $650</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"> </span></span><br />
 ', NULL, '2025-05-05 15:33:43', NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (8174502, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">(3) 7g Birds of Paradise
(3) 5g Agave attenuata
(1) 5g Coral Aloe
(1) 7g Aloe Vera

TOTAL PLANTS on site to reuse: 8</div></div>', NULL, '2025-05-06 22:29:45', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (8175144, NULL, NULL, '2025-05-05 18:37:16', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8175148, NULL, NULL, '2025-05-05 18:37:33', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8175152, NULL, NULL, '2025-05-05 18:37:47', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8177995, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (8181948, NULL, NULL, '2025-05-07 14:07:28', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (8182141, 'See plan ''Patatian Addtl Plants''<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">See plan</div></div>', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8182948, 'Around Palm tree and small area for existing planter<br />
Around Clivia and Crepe Myrtle&nbsp;', NULL, '2025-05-07 14:08:08', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8182953, 'New planter<br />
Existing planter with palm tree/boulders/replanted plants', NULL, '2025-05-07 14:08:41', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8182954, NULL, NULL, '2025-05-07 14:09:00', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8182967, 'Planter with Clivia, planter with palm tree and replanted Liriope/Mondo<br />
&nbsp;', NULL, '2025-05-07 14:09:22', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8182973, 'St Augustine&nbsp;', NULL, '2025-05-07 14:09:45', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8182982, NULL, NULL, '2025-05-07 14:10:04', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8182986, NULL, NULL, '2025-05-07 14:11:19', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8182991, NULL, NULL, '2025-05-07 14:12:03', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8183188, NULL, NULL, '2025-05-07 13:34:44', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8183282, 'Includes Wall Veneer', NULL, '2025-05-07 13:35:01', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8191149, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (8191160, 'Demo 3 LF. Wall and rebuilt at 2 feet high for steps return pip with stucco', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (8191163, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (8191334, ' 
<p dir="ltr"><b>3,300 sq ft Segmented concrete  step pads </b></p>

<p dir="ltr"><b>Topcast finished concrete-$53,500.00</b></p>
<b>50 linear feet of concrete curbing up to 10 inches high. $3,000</b>

<p dir="ltr"><b>Walls                  </b></p>

<p dir="ltr"><b>101 linear feet of 3’ tall cmu  retaining wall with an 18inch footing $13,975</b></p>

<p dir="ltr"><b>62 linear feet of garden wall in front yard heights up to 30” with smooth stucco finish. Includes waterproofing – $10,700.00</b></p>
<strong>turf strips-$15,770<br />
<br />
site prep for walls and compaction/backfill </strong><b>$5,000</b><br />
 ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8200695, 'Credit for 7 lights at $220 each.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (8210701, 'Selection of 1 and 5 gallon plants 
', NULL, '2025-05-22 08:14:08', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8210751, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8211324, 'Estimate for
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
', NULL, '2025-05-15 11:02:04', NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (8213223, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8217370, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8221956, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (8222487, 'Client to buy 2 fruit trees. Cost is for labor only. ', NULL, '2025-06-17 22:49:28', NULL, NULL, NULL, 'Nicole Antoine', 'pending'),
  (8222499, 'Install 875 SF sod (purchased by client) with amendments only', NULL, '2025-05-21 13:55:35', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (8223568, 'Paver change Belgard Cambridge cobble in Rio 6x6 & 6x9 in ''I'' pattern. No cost difference', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8227114, 'Demolition Demolish and (1) brick column and connecting brick walls No painting or patching is included in price COST $843<br />
Paver Ribbons Remove existing brick ribbons Saw cut ribbons wider to accept 6x9 paver Set pavers $1525', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8229515, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (8234181, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8234758, 'Add 15-5 gal. Ligustrum (staked)
Add drip irrigation from existing line.', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (8236839, '170sqft of gravel, removing (1) section of Palm tree and hauling debris&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8240125, 'Drainage<br />
Install approx 170 lf of 2” SDR drainpipe connected to existing sum pump system<br />
Install approx 20 lf of 3” SDR drainpipe and connect to existing downspouts<br />
Core curb in 2 locations<br />
COST $2700<br />
Gate track<br />
Install concrete pad for gate track & gate motor<br />
Veneer track with paving stones matching driveway<br />
COST $1800<br />
Total Cost $4,500 (check/cash price)', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8247002, '10lf BBQ with stucco finish and standard concrete color countertop. 2 gfci and installing owner provided equipment. ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8247007, '7 pilasters 6'' tall 18 inches wide with smooth stucco finish with Pip cap or brick cap depending on owner preference.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8251844, '555 Sq ft of white concrete additional. ', NULL, '2025-05-30 10:19:48', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8251846, '225 Sq ft of sealer for front of wall
100 Sq ft of veneer for kitchen 

', NULL, '2025-06-02 16:19:38', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8256643, NULL, NULL, '2025-05-30 15:27:16', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8257730, '2 citrus 15 gallons
Meyer lemon
Bears lime
Semi dwarf for each ', NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8257732, 'Clean up of hillside with minor Grading. ', NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8258628, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8258735, 'Softscape & Irrigation<br />
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
Total Cost $37,652 - Cash/Check Price', NULL, NULL, 1, '2025-05-30 10:51:08', 'John Durso', 'John Durso', 'sold'),
  (8258788, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8258897, 'Install fence posts.&nbsp;&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8265412, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8265628, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8268742, 'Install (14) Dodonaea 5 gal along patio in side yard. Add 2 driplines along outside of plants.<br />
Add (4) Dodonaea 5 gal behind newly planted euphorbias (hummingbird feeder area)<br />
(10) flats Lampranthus on slope<br />
(5) PLANTS FROM OUR YARD<br />
<br />
Grand Total $1915', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8270445, NULL, NULL, '2025-06-04 09:16:20', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8270461, '100sqft', NULL, '2025-06-04 09:15:39', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8270601, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Deck is an additional 30sqft from original planned size of 17 1/2 x 7 (upgraded 20 x 8)</div></div>', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8271748, NULL, NULL, NULL, NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8272818, '1850 Sq ft of concrete with 15 linear feet of step.<br />Natural gray concrete with trowel finish. <br />No stain or hardener included. ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8272827, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8274973, NULL, NULL, '2025-06-04 20:41:55', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (8276578, NULL, NULL, '2025-06-11 20:20:46', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8276581, NULL, NULL, '2025-06-11 19:24:49', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8276583, NULL, NULL, '2025-06-11 19:24:17', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8276623, NULL, NULL, '2025-06-11 20:20:27', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8282871, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8283068, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8283533, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8283683, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8288369, NULL, NULL, '2025-06-09 17:48:57', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8288373, NULL, NULL, '2025-06-09 17:48:32', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8295256, 'Install one path light.', NULL, NULL, NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (8296289, NULL, NULL, '2025-06-11 19:23:36', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8296303, NULL, NULL, '2025-06-11 19:24:03', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8296335, 'Cleanup some of the existing plant material in the planters flanking the turf area<br />
Adding more plants for these planters<br />
Adding (1) replacement Carolina Cherry', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8298141, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8301244, NULL, NULL, '2025-06-25 09:25:11', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (8301450, NULL, NULL, '2025-06-12 15:28:03', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8301897, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8303848, 'chip out existing stucco. Fix wire, install new wire if necessary. Install brown coat, install stucco coats up to window line.', NULL, '2025-06-13 09:27:55', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8303976, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8305847, 'Credit for (2) 15 gal palms @ $90 each', NULL, '2025-06-13 19:20:49', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (8305892, '<span style="font-size: 11pt"><span>1MM umbrella at $9,420.30 split</span></span>', NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8309312, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8310738, NULL, NULL, '2025-06-16 16:47:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8310757, NULL, NULL, '2025-06-16 16:54:11', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8312776, 'We used existing piping for the back and front slope areas, we had to replace the valves,drip tubing and spray heads that were burned.<br />
We also used 2 full irrigation zones for sod area', NULL, '2025-06-17 08:36:26', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8315288, NULL, NULL, NULL, 1, '2025-06-17 13:22:55', 'John Durso', 'John Durso', 'sold'),
  (8316361, 'Driveway extension to second slab 300 sq ft ', NULL, '2025-06-18 14:35:06', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8320644, NULL, NULL, NULL, NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8321081, NULL, NULL, NULL, NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8325521, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8327561, NULL, NULL, NULL, NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (8327564, '<span style="font-size: small"><span style="color: rgba(34, 34, 34, 1)"><span style="font-family: Arial, Helvetica, sans-serif"><span style="font-style: normal"><span style="font-variant-ligatures: normal"><span style="font-variant-caps: normal"><span style="font-weight: 400"><span style="letter-spacing: normal"><span style="orphans: 2"><span style="text-transform: none"><span style="widows: 2"><span style="word-spacing: 0"><span style="white-space: normal"><span style="background-color: rgba(255, 255, 255, 1)"><span><span style="text-decoration-style: initial"><span style="text-decoration-color: initial"><b><span style="font-size: 12pt"><span style="font-family: "Futura PT Book", sans-serif">NEW PLANTINGS: *Please review existing drip irrigation for new planting as part of scope</span></span></b></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br />
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
', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8333305, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8333783, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8334043, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8334046, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8334052, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8334085, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8339219, 'increase of retaining wall height from 24" to 42"<br />
increase of footing size from 12" to 24" with new key course. ', NULL, '2025-08-27 20:24:16', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8339256, '650 sq ft of turf installed<br />
<br />
&nbsp;', NULL, '2025-06-24 15:42:35', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8339304, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8339516, NULL, NULL, '2025-07-07 13:26:31', 1, '2025-06-24 17:19:45', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (8341513, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (8341752, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8342703, '25) 24" box podacarpis hedge installed.
', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8344402, 'Please see attached for scope of work!', NULL, '2025-06-27 13:15:46', 1, '2025-06-25 17:11:19', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (8346471, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8347220, 'Upcharge to poured in place <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Upcharge to change coping to poured in place</div></div>', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8349000, 'Add Salt System<br />
Furnish and install ‘Jandy’ brand ‘Apurem’ Aquapure power and control salt chlorination system<br />
COST $2,771', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8351901, 'Removing tree stump grinding. Removing roots as needed for underground utilities, Removing wall footing around tree', NULL, NULL, NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (8352202, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8355960, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">From C&S nursery</div></div>', NULL, '2025-07-07 13:25:42', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (8357697, NULL, NULL, NULL, NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8358969, '(3)Aeonium Zwartkopf
(2) Agave Blue Glow
(2)Agave Foxtail', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8358973, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8358974, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8360451, 'Additional Paver Curbing<br />
Added 3lf of paver soldier course to parking stop<br />
COST $363<br />
Sanitation Facilities<br />
Put in order to expedite portable sanitation pickup<br />
COST $300<br />
Paver Modification<br />
Modified paver entry to conform with Public Works inspector slope request by removing pavers,<br />
regrading paver base and reinstalling 240 sf of pavers (normally $2400 with $1620 discount)<br />
COST $780<br />
Job Total $1,443 - Cash/Check Price', NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8360739, 'Add a drip to this area', NULL, '2025-07-01 16:49:58', 1, '2025-07-01 11:22:03', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (8364194, NULL, NULL, '2025-07-02 08:31:53', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8364201, NULL, NULL, '2025-07-02 08:31:13', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8364211, NULL, NULL, '2025-07-02 08:31:38', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8365630, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8367185, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8367251, NULL, NULL, '2025-07-02 16:31:48', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8371039, 'Credit for (56) 1 gallon and (1) 5 gallon plant', NULL, '2025-07-24 10:10:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8371265, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Bureau of Engineering Clearance: $264.42</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Supplemental Permit to Review Ret. Wall Plans: $596.65</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Extension for plan review timeframe : $305.60</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Record Notarized Bureau of Engineering Document: $38.00</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Retaining Wall & Grading Permits: $851.80</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total Cost: $2,056.47</span></span><br />
<br />
+ $450 processing time', NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8375530, '  mainline run with sch 80 pvc 1" with sleeve. $1050
Sump pit and pump $2400
Badujet increase  $3000
', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8376892, 'Permit - $1,014.95<br />
Additional Concrete work for garage - $2000', NULL, '2025-07-07 20:49:34', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8378414, NULL, NULL, NULL, NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8386084, NULL, NULL, '2025-07-09 15:38:42', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8387742, 'We installed a new drip zone on an old valve per contract.&nbsp; &nbsp;The old valve is not working correctly and needs to be replaced.&nbsp; &nbsp;This is the zone near the gas meter.', NULL, '2025-07-10 08:05:51', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8388906, 'Mini Pebble finsih - color TBD<br />
Tiles - 239 lnft<br />
Pool Drain', NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8390421, 'Costs:<br />
Pool Engineering Plans: $170.78<br />
Pool &amp; Grading Plan Check: $628.17<br />
Pool &amp; Grading Permits: $1,122.51<br />
Pool Eng. Revision to Plans: $45.00<br />
Pool Supplemental Plan Check: $438.78<br />
Bureau of Engineering Clearance: $132.21<br />
Pool Supplemental Permit: $174.74<br />
Total Cost: $2,712.19', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8394752, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8394762, 'Turf from original bid ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8394764, 'Removal of wooden door. 520 Sq feet of additional turf 
', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8394767, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8397252, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8399280, NULL, NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8399708, 'Landscape Remove misc plants Prep areas to be planted Install (7) Lady Banks Rose Vines 15 gal Pin vines to wall with anchors Install (35) Lavander 5 gal Install (52) Lantana 5 gal Install (20) Snow In Summer flats Install (15) lf of metal edging for small planters around fire pit area Convert lawn pop-ups to 12” pop-ups for small planters COST $6,607 Lighting Install (1) Flood light on hillside Install (5) Path Lights Install (3) additional spots on trees over pool COST $1,953', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8400205, '<p><span style="color: rgba(0, 0, 0, 1)">Pool Plan Check: $438.78</span></p>

<p><span style="color: rgba(0, 0, 0, 1)">Pool/Grading Permits: $1,305.22</span></p>

<p><span style="color: rgba(0, 0, 0, 1)">Electrical + Plumbing Permit: $158.05</span></p>

<p><span style="color: rgba(0, 0, 0, 1)">Total Cost: $2,176.33</span></p>

<p> </p>
', NULL, '2025-11-24 10:44:01', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8400212, '<p><span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(0, 0, 0, 1)">The 6 hours include:</span></span></span></span><br />
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
', NULL, '2025-10-28 12:59:06', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8403513, 'Concrete 130 sq ft $2460
Drainage 40 linear feet $1200
 ', NULL, NULL, NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8403521, 'Adding benching for rear of spa.', NULL, NULL, NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8404757, 'x5 15 gallons (incl Crepe Myrtle tree)<br />
x33 5 gallons<br />
x28 1 gallons<br />
<br />
Tilling and amending soils for planters', NULL, '2025-07-15 15:28:36', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8404761, NULL, NULL, '2025-07-15 15:29:08', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8404765, 'to backfill circular raised planters&nbsp;', NULL, '2025-07-16 15:30:47', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8407370, 'Plaster choice is Stonescapes Aqua White (no extra)<br />
<br />
Tile is NPT Continental 3x6 pacific blue $280 upcharge', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8408600, NULL, NULL, '2025-07-16 17:35:04', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8408632, 'OK via email', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8409689, 'Includes stucco, waterproofing, soil backfill', NULL, '2025-07-16 15:45:59', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (8409777, 'Please bring small 1/3 of a yard of crushed gravel to fill bottoms of each pot and some some mesh&nbsp;', NULL, '2025-07-17 11:17:48', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8410004, 'Seal existing pavers and fix (2) pieces of bullnose for step area', NULL, '2025-07-16 21:09:07', NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (8410049, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (8411253, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8416413, 'from 8x6 to 9x7 feet', NULL, '2025-08-08 07:12:08', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8416654, '5 in ground for Boxwood<br />
5 steps lights (for paver steps)&nbsp;', NULL, '2025-07-18 10:51:37', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8416657, NULL, NULL, '2025-07-18 10:30:58', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8417320, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8417360, 'Depth originally specified for 12 feet drilled.&nbsp; Actual drilling was 25 feet per engineer requirement.&nbsp;<br />
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
Also hit bolders required retooling and breaker.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8417598, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8425353, 'Repair 1 irrigation valve ', '2025-07-22 00:00:00', NULL, NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (8428560, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8435619, 'Measured out approx 500sqft (incl wasteage) on site&nbsp;', NULL, '2025-07-24 10:11:29', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8437203, '24" limestone vessel (purchased by HO) to be converted into fire feature (to be delivered and placed into desired spot by delivery company)<br />
Will need to provide lava rocks or glass (samples to client)<br />
Gas line (we''ve already stubbed up for this) and burner<br />
Vessel will need to be drilled at bottom for pipe<br />
 ', NULL, '2025-08-05 10:17:57', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8465186, NULL, NULL, '2025-08-01 12:20:46', NULL, NULL, NULL, 'John Durso', 'sold'),
  (8465653, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8466961, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8471187, NULL, NULL, '2025-09-12 14:42:34', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8471491, NULL, NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8472956, NULL, NULL, '2025-08-07 16:46:49', NULL, NULL, NULL, 'Daniel Aguilar', 'pending'),
  (8473140, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8475564, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8480966, '15 x 15 pad,<br />
<br />
12 ln feet of addtional steps<br />
<br />
extra walkway concrete', NULL, '2025-08-06 13:50:20', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8480985, '140 linear feet&nbsp;<br />
<br />
Iron pipe PROW drain.&nbsp;', NULL, '2025-08-06 13:50:00', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8481004, 'Added 17 feet of additional curb and gutter and asphalt.', NULL, '2025-08-06 13:49:37', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8481070, NULL, NULL, '2025-08-06 13:49:15', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8481081, NULL, NULL, '2025-08-06 13:48:46', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8481100, 'Trenched 120 linear feet.&nbsp;<br />
Added second conduit.<br />
<br />
40 ln feet included in contract.', NULL, '2025-08-06 13:48:04', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8481522, 'Demo and Hauling', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8486792, 'We will be applying the Glaze n Seal Wet look sealer. We will be applying with a sprayer and then rolling out the sealer. This application method was requested. After sealer application, picture build will not be responsible for any underlying color deviations in the pavers.&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;', NULL, '2025-08-07 11:41:47', NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (8487458, '20 new podacarpis 24"', NULL, '2025-08-11 11:09:58', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8488414, '22 LF Curved Steps<br />
Additional Grading/Base&nbsp;<br />
Waterproof Sill Plate<br />
(2) Step Lights<br />
<br />
**Waiver: Client agrees to cover vents + sill plate and holds Picture Build harmless on any claims or warranty for sill plate waterproofing**', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8488605, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8489956, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'pending'),
  (8490927, 'upgrade to mini pebble', NULL, '2025-08-07 21:13:08', NULL, NULL, NULL, 'Daniel Aguilar', 'pending'),
  (8493087, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Credit Ceiling Fan 
Install (1) GFCI receptacle
Additional Planting: 5 x lady ferns (1g) front pathway
Keep Agapanthus in the corner of the front bed
New Pathway to Gazebo: 45 Sq Ft. of Angelus Courtyard
Move GFCI by Gazebo to Patio</div></div>', NULL, '2025-08-27 10:02:59', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8493490, 'Adding 1" of gravel to this area (will be 3" total of gravel) includes landscape fabric and additional demo', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8500146, '12 5 gallon purple wistraingia replacing lavenders in front', NULL, '2025-08-11 13:59:50', 1, '2025-08-11 13:31:19', 'Bryan Vielman', 'Bryan Vielman', 'sold'),
  (8503274, 'Approximately 20'' of additional drain lines and 9 new drain inlets.', NULL, '2025-08-27 10:02:44', NULL, NULL, NULL, 'Paul DeAngelis', 'sold'),
  (8504605, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8506934, 'Credit concrete install
Pavers, Angelus courtyard
8” roadbase
Client OK with ramping up to Gazebo
', NULL, '2025-08-27 09:53:46', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8506944, 'Remove existing concrete and replace with natural stone pavers (to match rest of backyard) approx 200sqft - includes demo', NULL, '2025-08-12 18:04:54', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8510451, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8515581, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">CE #164 - Palm Maintenance

- Plans call for the palms to be trimmed as they are severely neglected. 

- Remove and discard Palm Fronds from palm trunks

- Remove additional palm trunk

- Rent 85 articulation boom to remove fronds from lower and higher palms

- Top cut fronds down from 22 palms

- Shred fronds with drum shredder into containers

- Haul green waste

- Cut additional palm trunk. Had cut smaller trunks and shred pieces

- Does not include knife cutting stubs</div></div>', NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8515679, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8519550, '(8) 15 Gallon Podacarpus. $950<br />
(5) 5 Gallon Japanese Boxwood $200<br />
(8) 5 Gallon Lomandra $320<br />
(1) 15 Gallon Foxtail $175<br />
(2) 5 Gallon Gardenia $80', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8519564, 'Client onsite rewquest to transplant 10 plants', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8520488, 'credit for delayed response in finalizing project', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8520563, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Hours total:  5</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Permit Cost (Plan Review + Permit): $2,511.64</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Engineering: $170.78</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $2,682.42</span></span>', NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8520595, '<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">The 2.5 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting detailed plan per city requirements, revision of scope of work. Submitting plan to structural engineering and review of detail. Online submission. Communication & correspondence with city plan checkers to ensure compliance with local codes and standards for approval. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Permit Cost (Plan Review + Permit): $1,483.86</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Engineering: $170.78</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $1,654.64</span></span><br />
 ', NULL, '2025-08-15 11:17:41', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8520601, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">The 5 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting plan per and conc. detail per city requirements, revision of scope of work. Over the counter submission of plans to relevant authorities to ensure compliance with local codes and standards for approval. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Permit Cost (Plan Review + Permit): $1,014.95</span></span><br />
 ', NULL, '2025-08-15 18:17:17', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8520603, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Time Invested to Obtain Permit: 3.5 hours.<br />
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
Total: $2,106.21</span></span>', NULL, '2025-09-18 09:24:44', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8520611, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">The 1.5 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Revision of scope of work.  Over-the-counter application submission to the city. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Permit Cost: $130.00</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $130.00</span></span>', NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8520618, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="font-family: "Arial", sans-serif"><span style="color: rgba(32, 34, 39, 1)">The 2 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting detailed plan per city requirements, revision of scope of work. Submitting application & plan to city to ensure compliance with local codes and city standards for approval. Addressed comments & corrections from plan checker. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Permit Cost (Plan Review + Permit): $1,535.22</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $1,535.22</span></span><br />
 ', NULL, '2025-08-15 12:56:51', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8520881, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="font-family: "Arial", sans-serif"><span style="color: rgba(32, 34, 39, 1)">The 5 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting detailed plan per city requirements, revision of scope of work. Submitting plan to structural engineering and review of detail.  Over the counter coordination/plan check submission addressed comments & corrections per plan checker. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Fireplace Plan Check: $337.29</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Fireplace Permit: $376.79</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Gas/Electrical Permit: $201.09</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total Cost: $1,965.17</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Thanks,</span></span><br />
 ', NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8520896, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="font-family: "Arial", sans-serif"><span style="color: rgba(32, 34, 39, 1)">The 1.5 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting detailed plan per city requirements, revision of scope of work. Online permit submittal. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Wall Permit: $173.93</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total Cost: $173.93</span></span><br />
 ', NULL, '2025-09-15 13:12:00', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8521211, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">The 2 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting detailed plans per Bureau of Eng. requirements. Submission of application and plan to the Bureau of eng. Communication and correspondence with the bureau of engineering plan checker. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Curb Core Permit: $343.78</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total Cost: $343.78</span></span><br />
 350 paid', NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8521374, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="font-family: "Arial", sans-serif"><span style="color: rgba(0, 0, 0, 1)">The 4 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Over the counter submission of application to relevant authorities to ensure compliance with local codes and standards for approval. Permit issuance.</span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Right of Way Use Permit<span style="color: rgba(0, 0, 0, 1)">: $537.70</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Total: $537.70</span></span></span><br />
 ', NULL, '2025-08-15 18:10:07', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8521378, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Online application submission. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Permit Cost: $108.92</span></span><br />
 ', NULL, '2025-08-15 12:56:24', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8521384, '<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="font-family: "Arial", sans-serif"><span style="color: rgba(0, 0, 0, 1)">The 3 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Drafting of permit plan. Over the counter submission of application to relevant authorities to ensure compliance with local codes and standards for approval. Permit issuance.</span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"> Pool Enclosure Fence Permit<span style="color: rgba(0, 0, 0, 1)">: </span>$1,870.76</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Total: </span>$1,870.76</span></span><br />
 ', NULL, '2025-08-15 11:58:49', NULL, NULL, NULL, '(HR) Mo Solomon', 'lost'),
  (8521405, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(0, 0, 0, 1)">The 1.5 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Drafting detailed plan per inspector requirements, revision of scope of work. Over the counter coordination/plan check submission, addressed comments from plan checker. Permit issuance.</span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool Supplemental Plan Check: $83.41</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool Supplemental Permit: $183.38</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Total Cost: $266.79</span></span></span><br />
 ', NULL, '2025-08-15 12:56:03', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8521409, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">The 3 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting permit plan. Revision of scope of work.  Over-the-counter application submission to the city. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Permit Cost: $489.95</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $489.95</span></span><br />
 ', NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8521415, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(0, 0, 0, 1)">The 4 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Revision of scope of work & plans. Submitting plan to structural engineering, review of detail.  Over the counter coordination/plan check submission. Picked up corrections from the city, reviewed plan checker comments. Resubmittal to the city. Permit issuance.</span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool Engineering Plans: $170.78</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Grading Pre-Inspection Report: $161.54</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool & Grading Plan Check: $560.66</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool Eng. Revision to Plans: $46.58</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool & Grading Permits: $994.74</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Total Cost: $1,934.30</span></span></span><br />
 ', NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8521420, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Submitting application online. Permit issuance.</span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Street Use Permit: </span>$66.67</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Total Cost: </span>$66.67</span></span><br />
 ', NULL, '2025-08-15 12:56:07', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8521597, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(0, 0, 0, 1)">The 5 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting detailed plan per city requirements, revision of scope of work. Application and plan submittal online to Alhambra city. Communication & correspondence with city plan checkers. Drafting/updating plans per city comments/corrections. Communication & correspondence with soils eng.<span style="color: rgba(0, 0, 0, 1)"> Permit issuance.</span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool Engineering Plans: $377.78</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Planning Plan Review: $291.02</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool /Grading Plan Check: </span>$1,614.43</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Pool Engineered Restamp: $46.58</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Pool Permit: $1,475.54</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Total Cost: $3,805.35</span></span></span><br />
 ', NULL, '2025-08-15 12:54:04', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8521601, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="font-family: "Arial", sans-serif"><span style="color: rgba(32, 34, 39, 1)">The 3.5 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting detailed plan per city requirements, revision of scope of work. Submitting plan to structural engineering and review of detail. Online submission. Communication & correspondence with city plan checkers to ensure compliance with local codes and standards for approval. Addressed and drafted corrections from County Plan Checker. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool Engineering Plans: $170.78</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool Remodel Plan Check: $405.53</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">CND Clearance Deposit: $620.00</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool Engineering Plan Revision: $46.58</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool</span> <span style="color: rgba(0, 0, 0, 1)">Remodel Permits: </span>$1,540.43</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Total Cost: $2,783.32</span></span></span><br />
 ', NULL, '2025-08-26 09:58:05', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8526590, 'Mary, I wanted to extend a partial credit on the design as a courtesy for you.&nbsp;&nbsp;', NULL, '2025-08-18 13:40:10', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8528838, 'Adding 26 linear feet wall @ 18” tall, in back left corner of yard. To get 10” Bellecrete modern cap ', NULL, '2025-08-20 10:02:02', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8528839, 'Current estimate has drainage included, the change order cost of $2000 is in addition to the $2091 on the contract&nbsp;', NULL, '2025-08-20 09:26:44', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8537744, 'Removing 32sqft of paver area to accomodate planter and seated wall', NULL, '2025-08-20 10:02:30', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8540936, 'Estimate quantity is more than design<br />
total of (14) 1 gallons is missing from plan', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8543962, NULL, NULL, '2025-08-21 09:36:19', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8545849, 'Approved by client', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8547323, NULL, NULL, '2025-08-27 09:54:17', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8547554, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8552723, 'Brass valve install. ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8553566, 'Repair 3 tiles. Add 3 gallons of sealer. Tiles will be provided by client ', NULL, '2025-08-29 10:09:07', NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (8559941, NULL, NULL, '2025-08-27 09:54:52', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8569115, 'Moving irrigation valves outside deck area, reconnecting them to existing irrigation.

Running new mainline to rear irrigation valves ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8569266, '13 1 gallon Japanese boxwood<br />2 1 gallon foxtail fern<br />8 5 gallon privets staked ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8574031, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Max requested I get a plumbing permit for Pazzoky. Took about 10 min. online.</span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Plumbing/Elec. Permit: $209.28</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Ser Fee: $</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $209.28</span></span><br />
 ', NULL, '2025-08-27 18:23:35', NULL, NULL, NULL, '(HR) Mo Solomon', 'lost'),
  (8574033, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">I invested a cumulative of 8<span style="font-family: "Arial", sans-serif"><span style="color: rgba(32, 34, 39, 1)"> hours to get the permit issued.</span></span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="font-family: "Arial", sans-serif"><span style="color: rgba(32, 34, 39, 1)">The 8 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting plan per and details per city requirements, revision of scope of work. Over the counter submission of plans to relevant authorities to ensure compliance with local codes and standards for approval. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Permit Cost (Plan Review + Permit): $1,570.58</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $1,570.58</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">No more permits are expected pulled for this project.</span></span><br />
 ', NULL, '2025-08-27 16:48:58', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8574040, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">I invested a cumulative of 3<span style="font-family: "Arial", sans-serif"><span style="color: rgba(32, 34, 39, 1)"> hours to get the permit issued.</span></span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="font-family: "Arial", sans-serif"><span style="color: rgba(32, 34, 39, 1)">The 3 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting plan per and details per city requirements, revision of scope of work. Over the counter submission of plans to relevant authorities to ensure compliance with local codes and standards for approval. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Permit Cost (Plan Review + Permit): $2,575.40</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $2,575.40</span></span>', NULL, '2025-08-27 16:47:51', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8576280, '$4 per sqft Total sqft 1850 sqft with $1600 Discount', NULL, '2025-08-29 08:50:16', NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (8576666, '66 sqft total 
To be replaced with brick ', NULL, '2025-10-07 07:30:31', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8576701, NULL, NULL, '2025-12-12 06:21:28', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8577688, NULL, NULL, '2025-08-28 10:55:36', NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (8580175, 'All plants installed to client satisfaction.', NULL, NULL, NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (8583602, 'seal coping&nbsp;', NULL, '2025-09-19 15:51:06', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8583665, '2 additional gallons with labor if needed<br />
<br />
Can not gurantee color or finish of the stain.', NULL, '2025-09-12 14:43:32', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8590621, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Adding this to the Cost of the Permit:</span></span><br />
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
 ', NULL, '2025-09-02 17:31:08', 1, '2025-09-02 12:09:52', '(HR) Mo Solomon', '(HR) Mo Solomon', 'sold'),
  (8592809, 'Remove existing brick planting border in front yard, approx. 31 linear feet - $70<br />
Grind existing stump and remove - $151<br />
Install (1 qty.) 10’ ht. 6 x 6 redwood post set in concrete footing - $291<br />
Provide and install the following plantings: - $410<br />
Install (3 qty.) 5 gallon succulents = VARYING ALOE SPECIES (red & orange blooms), MIX IT UP.<br />
Install (1 qty.) 1 gallon succulent = ALOE<br />
Install (12 qty.) 4” herbs = ANY VARIETY, BUT MIX IT UP.<br />
Potting soil allowance - $50<br />
Install 116 linear feet of black metal benderboard edging - $2,294', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8598509, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8598511, 'Re-grade/haul away 2" of dirt', NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8601155, 'Install half a yard of white gravel. In planters and back of adu', NULL, '2025-09-04 10:42:08', NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (8605724, '1 more 5g x Creeping Rosemary to plant in owner provided pot', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8605883, '2 wifi smart plug adapter for low voltage lights ', NULL, '2025-09-04 15:21:13', 1, '2025-09-04 15:17:10', 'Bryan Vielman', 'Bryan Vielman', 'lost'),
  (8605901, NULL, NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8605933, NULL, NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8624552, 'Stain existing concrete via Paul''s recommendation. ', NULL, '2025-09-10 09:49:16', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8625095, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8628685, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Yes, that''s correct.  I guess our planting diagram was not to scale, so there were some big gaps.  I approve the additional cost of the plants. 

On Wed, Sep 10, 2025, 9:34?AM John Durso &lt;john@picturebuild.com&gt; wrote:
Hi Christopher - I was told you want (17) more 15 gal & (6) more 5 gal plants. If that is correct, the cost would be 2029.00

I am going into a zoom shortly but should be done around 11am if you have questions.</div></div>', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8629397, '2 man days to remove all the pots install flat pavers underneath all of them and then place them back with irrigation.', NULL, NULL, NULL, NULL, NULL, '(.PM) Carter Godley', 'pending'),
  (8629422, '4 more 5 gallon plants needed for filling additional pots', NULL, NULL, NULL, NULL, NULL, '(.PM) Carter Godley', 'pending'),
  (8635271, 'Remove existing pots<br />
Install flat pavers underneath pots, re-place with irrigation<br />
Provide and install (4 qty.) additional 5 gallon standard shrubs<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Remove existing pots
Install flat pavers underneath pots, re-place with irrigation
Provide and install (4 qty.) additional 5 gallon standard shrubs</div></div>', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8638104, NULL, NULL, '2025-09-11 17:30:09', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8638179, '<table style="border-collapse: collapse; width: 429px" width="429">
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
', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8640442, NULL, NULL, '2025-09-18 09:28:47', NULL, NULL, NULL, 'John Durso', 'sold'),
  (8642853, 'Cap to be Travertine Coping', NULL, '2025-09-15 09:49:32', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8642859, 'Original Contract Planting:<br />
<br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Till and amend planting area soil, approx. 400 square feet</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>Install the following plant sizes/quantities:</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>(34 qty.) 15 gal shrubs</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>(20 qty.) 5 gal shrubs</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>(37 qty.) 1 gal shrubs</i></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><i>(1 qty.) flat of groundcover</i></span></span></span><br />
 ', NULL, '2025-09-15 09:52:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8645167, 'Adding a saltwater chlorinator
Adding pool saltwater  startup ', NULL, '2025-09-15 08:49:19', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8647867, 'Install approx (30) 5 gallon shrubs (preferrably Agaia Odorata - Chinese Fragrance Plant)<br />
Price includes tilling soil and adding plant amendments&nbsp;', NULL, '2025-09-15 12:06:00', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8649841, 'Demolish and remove existing step/landing in east rear yard, approx. 12 square feet<br />
Install 28 linear feet of bullnose step build around pavers (Color: TBD)<br />
Credit for 95 linear feet of SDR35 4” drainpipe and (5 qty.) paver top inlet drains<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Demolish and remove existing step/landing in east rear yard, approx. 12 square feet
Install 28 linear feet of bullnose step build around pavers (Color: TBD)
Credit for 95 linear feet of SDR35 4” drainpipe and (5 qty.) paver top inlet drains</div></div>', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8654220, 'Blk/white spots on pavers need to be corrected before sealer goes on.&nbsp;<br />
480 sqft of sealer and 1 md<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Debbie said blk/white spots on pavers need to get corrected before sealer goes on. Texted Bryan if he knew about that. Bryan can do sealer on during yard check.
480 sqft of sealer and 1 md</div></div>', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8655533, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8656743, NULL, NULL, '2025-09-16 22:32:18', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8656745, NULL, NULL, '2025-09-19 15:50:04', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8656747, NULL, NULL, '2025-09-19 15:49:40', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8659918, NULL, NULL, '2025-09-17 11:39:58', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8660892, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="font-family: "Arial", sans-serif"><span style="color: rgba(32, 34, 39, 1)">The 15 mins include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="font-family: "Arial", sans-serif"><span style="color: rgba(32, 34, 39, 1)">Online application submittal. Permit issuance.</span></span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:<br />
Electrical Permit: $105.28<br />
Gas Permit: $118.80<br />
Total: $224.08</span></span><br />
 ', NULL, '2025-09-17 15:13:20', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8660988, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">The 1 hours includes:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Submission of application to the Bureau of eng. Virtual meeting with the bureau of engineering plan checker. Addressing concerns and comments. Permit issuance.<br />
<br />
Costs:<br />
Driveway Permit: $376.29</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total Cost: $376.29</span></span><br />
 ', NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8661801, 'misc debris removal from backyard - 2 5 gallon plants lava rock for fireplace', NULL, '2025-09-17 14:21:31', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8671718, 'Credit Electrical<br />
Credit Electrical in contract<br />
COST&lt; $1,808&gt;<br />
Remove Rear Fence<br />
Remove rear wood fence panel and posts/footings<br />
COST $634', NULL, '2025-09-19 09:08:14', NULL, NULL, NULL, 'John Durso', 'sold'),
  (8671794, 'Install 2 lights for water feature ', NULL, '2025-09-19 11:07:54', 1, '2025-09-19 09:02:24', 'Bryan Vielman', 'Bryan Vielman', 'sold'),
  (8674086, '<table style="border-collapse: collapse; width: 429px" width="429">
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
', NULL, '2025-09-20 08:25:12', 1, '2025-09-22 12:13:21', 'Daniel Aguilar', 'Daniel Aguilar', 'sold'),
  (8674486, 'Addint an additional up light', NULL, '2025-09-20 10:25:47', NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (8676298, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8676308, 'Damange to call&nbsp;', NULL, '2025-09-22 08:49:14', NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (8677562, '2 lights upgraded to 200 ft Electrical work run Gas line run New plumbing materials cost $2400 8 man days of labor', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8679479, '5 podacarpis 15 gallon<br />
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
add irrigation emitters to all plants', NULL, '2025-09-22 11:58:47', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8683678, NULL, NULL, '2025-09-23 08:42:24', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8683691, NULL, NULL, '2025-09-23 08:41:27', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8683705, NULL, NULL, '2025-09-23 08:37:28', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8687233, 'Adding 5 additional lights 210 per light.', NULL, NULL, NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (8692510, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8694019, 'Pavers & Step Install an additional 27 square feet of ‘Angelus’ brand ‘Paseo I & II’ paver <br />
Drainage Install drainage lines and outlets as needed<br />
New Posts Temporarily shore existing patio posts<br />
Install (3 qty.) new posts set in concrete footings<br />
Additional Planting Provide and install (3 qty.) 15 gallon shrubs ', NULL, '2025-09-24 15:16:42', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8698638, 'Contract has 25 lights allocated, plan has 36 lights called. 34 were installed. so 9 additional masonry step lights.&nbsp;', NULL, '2025-09-25 12:34:11', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8698725, NULL, NULL, '2025-09-25 12:30:04', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8699927, 'removal of stucco finishes on bbq and Pilasters', NULL, '2025-09-25 14:25:39', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8700366, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8700688, NULL, NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'lost'),
  (8700744, NULL, NULL, '2025-09-26 12:33:27', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8700763, NULL, NULL, '2025-09-25 17:54:22', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8700961, NULL, NULL, '2025-09-28 11:22:17', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8700976, '42 ln conduit, 3 electrical wire , 1 outlet', NULL, '2025-09-25 16:48:26', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8701006, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8703760, 'Includes programming and installation&nbsp;', NULL, '2025-09-27 17:13:50', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8714328, NULL, NULL, '2025-09-30 09:08:08', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8714332, NULL, NULL, '2025-09-30 09:08:41', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8714827, 'Installing Seat bench across the back fence.; 18 inches tall with Bellecrete cap 14 inches wide.<br />
<br />
Small wall approx 9 inches Tall&nbsp; x 22 Ln feet - Stucco Finish, Stucco Cap', NULL, NULL, NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (8715635, NULL, NULL, '2025-10-07 09:30:36', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8717245, 'Install 1 sprinkler in front yard', NULL, NULL, 1, '2025-09-30 12:21:21', 'Bryan Vielman', 'Bryan Vielman', 'sold'),
  (8719402, NULL, NULL, '2025-10-03 11:36:13', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8727919, NULL, NULL, '2025-10-02 08:38:06', NULL, NULL, NULL, '(.PM) Paul DeAngelis', 'sold'),
  (8733837, 'Total lights 8 little smokey (black) (change order) 

17 masonry lights (covered under original scope) 

1 wall washer (black) (covered under original scope) 

100 LF. Strip lights added (change order) 

2 dimmers', NULL, '2025-10-06 11:18:08', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8736182, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8736856, NULL, NULL, '2025-11-05 21:17:27', NULL, NULL, NULL, 'John Durso', 'sold'),
  (8737625, 'Attach 30’ channel drain along the side of the pavers and between fence. Tie into storm drain line to prevent water to flow onto neighbors property.', '2025-10-10 05:28:00', '2025-10-10 09:52:58', NULL, NULL, NULL, '(.PM) Paul DeAngelis', 'sold'),
  (8738911, 'Approximately 81 sqft of mortared brick walkway in a herringbone pattern with a row lock border on opposite side of the drain to match the upper patio. Bricks are to be set on a reinforced concrete base.', NULL, '2025-10-10 15:23:16', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8744130, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Drafting detailed plan per city requirements, revision of scope of work. Drivetime to Altadena One Stop Center. Over the counter submittal plans review for approval. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool</span> <span style="color: rgba(0, 0, 0, 1)">Remodel Permits: </span>$2,297.83</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Total Cost: $</span>2,297.83</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">--</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Thanks,</span></span>', NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8746884, 'Spoke to Taran on 10/06 about the additional planting needed. New planting #s: QTY 5 x 1 gallon (previous change order had 5 gallon x QTY 4). Credit $60.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Spoke to Taran on 10/06 about the additional planting needed. New planting #s: QTY 5 x 1 gallon (previous change order had 5 gallon x QTY 4). Credit $60.</div></div>', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8749552, '65 lnft of main line replacement on rear of property $980.00<br />
replace 8 valves 3/4 inch @ $165 each $1320.00', NULL, '2025-10-08 15:00:42', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8749556, '115 linear feet  of gas line 1 1/4"  with poly pipe trenched down 18" below grade  to city code, backfilled and compacted', NULL, '2025-10-08 15:00:07', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8750346, NULL, NULL, '2025-10-07 17:21:22', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8750685, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8754585, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool Supplemental&nbsp;Plan Check: $79.62</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Bureau of Engineering Clearance: $132.21</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Pool&nbsp;Supplemental&nbsp;Permit: $170.37</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Total Cost: $382.20</span></span></span><br />
&nbsp;', NULL, '2026-02-26 16:04:07', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8758605, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8759604, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8760444, 'Per conversation with Don/John/Dana on 10/9/25&nbsp;<br />
Difference in cost of brick&nbsp;<br />
&nbsp;', NULL, '2025-10-10 09:24:49', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8762297, NULL, NULL, '2025-10-10 09:53:44', NULL, NULL, NULL, '(.PM) Paul DeAngelis', 'sold'),
  (8762493, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8762807, 'Adding a 23linear foot curb to the garage.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8764656, '18,000 for labor for a crew for 6 days. 3,000 per day<br />
3,000 for heavy machinery<br />
2,200 in dump fees.<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (8764731, NULL, NULL, NULL, NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (8767261, NULL, NULL, NULL, 1, '2025-10-10 14:20:01', 'John Durso', 'John Durso', 'sold'),
  (8767516, 'Need to be replaced due to water damage from city main rupture.<br />
<br />
(2) 5gallon Diosma sunset gold (3) 1gallon sesleria autumnalis (2) 1gallon lomandra longifolia. -&nbsp; $195&nbsp;<br />
<br />
15 Yards of Mulch per yard installed per contract.&nbsp; - $1,968.60<br />
<br />
&nbsp;', NULL, '2025-10-13 12:04:41', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8767546, '<p dir="ltr"><b>37 linear feet of additional gas line run 1 ¼” <br />
buried 18" below grade and compacted back<br />
$1110</b></p>

<p dir="ltr"><b>Removal of gravel and reinstall of gravel<br />
regrading of planter area<br />
2 man days via Jorge $1400</b></p>
 

<p dir="ltr"><b>¾ gas line to house fireplace </b></p>
 

<p dir="ltr"><b>35 linear feet from pool equipment to fireplace $945 buried 18" below grade and compacted back</b></p>
', NULL, '2025-10-16 22:18:32', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8771678, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Called Cathy & got phone approval</div></div>', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8774013, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8779849, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (8784909, '*Asphalt demo and repair $1990<br />
*$4800 Demo down 8 inches of soil for apron<br />
*Replace Curb and Gutter $3200<br />
$9,990', NULL, NULL, NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (8785664, '<div>42 purple penstemon 1g $1075</div><div>4 Lomandria 5 g for pool area$160</div><div>Repair irrigation line in grass  $125 depending on excess</div><div>3 15 gallon blue glow $345 material delivered not planted </div><div><br /></div><div>30 5g Lomandria added to hill again $1200</div><div><br /></div><div>Move lines and move misc  existing plants down - no cost </div><div><br /></div>', NULL, '2025-10-15 17:51:25', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8786171, 'Clean Up on Hillside.&nbsp; Time and Material.&nbsp; About a crew day and dump fees.&nbsp; Price to be entered after time.&nbsp;', NULL, '2025-10-16 14:27:53', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8786398, 'Coping&nbsp;<br />
$820&nbsp;<br />
<br />
Tile<br />
$161<br />
<br />
Boulders<br />
$430', NULL, '2025-10-15 19:34:49', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8788318, NULL, NULL, '2025-10-16 12:52:59', NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (8788350, NULL, NULL, '2025-10-16 12:52:32', NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (8792202, NULL, NULL, '2026-02-02 20:38:02', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8792455, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8792474, 'credit for drainage work', NULL, '2025-10-16 15:53:56', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8792767, 'tree removal $580', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8794232, NULL, NULL, NULL, NULL, NULL, NULL, '(.PM) Paul DeAngelis', 'sold'),
  (8800423, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8807339, '2 15 gallon citrus<br />
6 flats of ground cover', NULL, '2025-10-21 10:23:52', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8807352, 'Replacing saltwalter chlorinator<br />
pool plumbing', NULL, '2025-10-21 19:27:23', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8807596, 'Adding stucco all the way to the wall', NULL, '2026-02-26 16:04:13', NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (8808943, '$2200 each palm

250 for delivery

', NULL, '2025-10-21 12:36:15', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8809944, '(2)  low profile18 catch basins - $450<br />
40 Ln Feet of 4" Sdr Drain Line - $800<br />
(2) 4" Drain Pop Ups - $40', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8823004, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8830612, NULL, NULL, '2025-11-14 17:00:42', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8841814, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">The 8 hours include:</span></span></span></span><br />
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
&nbsp;', NULL, '2025-10-28 12:24:08', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8841825, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">The 3.5 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">Drafting detailed plan per city requirements, revision of scope of work. Over the counter submission of plans to relevant authorities to ensure compliance with local codes and standards for approval. Permit issuance.</span></span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">BBQ Permit: $217.98<br />
Time at $75/hour</span></span><br />
 ', NULL, '2025-10-28 18:32:10', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8841834, '<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(0, 0, 0, 1)">The 1 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Application and plan submission online to Alhambra city. Communication & correspondence with city plan checkers. <span style="color: rgba(0, 0, 0, 1)">Permit issuance.</span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Grading Plan Review: $408.11</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Grading Permit: $605.30</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $1,013.41</span></span><br />
Time at $75/hour<br />
 ', NULL, '2025-11-01 07:02:46', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8841843, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(0, 0, 0, 1)">The 4 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Application submittal to the Bureau of Engineering. Recording of documents. Communication and correspondence with Bureau of Engineering & </span>Office of the City Administrative Officer. Permit issuance.</span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Record Waiver of Damages for Bureau of Engineering: $104.75</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">R Permit Review & Permit: $2,090.18</span></span><br />
Time at $75/hour = $300<br />
 ', NULL, '2025-10-29 05:55:49', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8854093, 'Extend driveway 501 sf: $8,031<br />
<br />
Electrical trenching and conduit 65 LF: $1248', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8854716, 'Attached docuemnt', NULL, '2025-12-12 14:34:02', 1, '2025-12-11 18:14:58', '(HR) Mo Solomon', '(HR) Mo Solomon', 'sold'),
  (8857123, 'for bottom of fence line&nbsp;<br />
60 linear feet<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Redwood 2x4</div></div>', NULL, '2025-11-14 17:03:50', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8857497, 'Install conduit between light poles, weld LB @ East lamp post, rewire light poles, install 3 way switches, provide breaker + plug for sauna', NULL, '2025-10-30 15:23:26', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8857987, NULL, NULL, NULL, NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (8858376, 'Installing 5 yards of rock with weed barrier and installing allowance  20 linear feet of new Edging
Reinstalling existing benderboard with new stakes. ', NULL, '2025-10-31 16:25:04', 1, '2025-10-30 20:32:00', 'Daniel Aguilar', 'Daniel Aguilar', 'sold'),
  (8861101, 'Patio Angelus 12x24 paver<br />
Driveway Angelus 4x12 80 mm paver&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8861501, 'Page 1 of 1<br />
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
*This price is valid for up to 30 days from above date', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (8866956, NULL, NULL, '2025-11-08 08:10:51', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8867006, NULL, NULL, '2025-11-08 08:11:25', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8867033, 'Lights to be flat side path&nbsp;', NULL, '2025-11-10 08:00:59', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8867186, NULL, NULL, '2025-11-08 08:12:05', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8867486, NULL, NULL, NULL, NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (8871445, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8879864, 'Electrical work and trenching with conduit<br />
new motor<br />
new tracks<br />
Safety sensors<br />
New black pool cover<br />
Adjustment to motor housing size<br />
Drain overflow into basin', NULL, '2025-11-05 10:17:00', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8879898, 'shotcrete new steps into pool, backfill baja.&nbsp;<br />
adding small steps by spa side for new entry<br />
full length steps into pool after baja', NULL, '2025-11-05 10:15:24', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8879929, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8883052, '<span style="font-size: 11pt"><span style="line-height: 105%"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12pt"><span style="line-height: 105%"><span style="font-family: "Century Gothic", sans-serif">Electrical Rough In for Services</span></span></span></b></span></span></span><br />
 
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
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">rerun mainline irrigation</div></div>', NULL, NULL, 1, '2025-11-26 09:29:51', 'Brian Godley', 'Brian Godley', 'sold'),
  (8883728, NULL, NULL, '2025-11-05 18:36:44', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8888729, NULL, NULL, '2025-11-07 09:21:36', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8888738, NULL, NULL, '2025-11-07 09:20:44', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8895380, 'Fuel Mod Plans', NULL, '2025-11-07 17:35:23', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8895448, NULL, NULL, '2025-11-07 19:11:48', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (8895450, '40 hours of labor time<br />
2 trailer loads&nbsp;<br />
1 10 yard low boy dump&nbsp;<br />
<br />
Total cost $4300', NULL, '2025-11-07 17:31:09', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8895471, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8895503, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8901506, 'Concrete Landing Downsize<br />
Reduce concrete landing from 30 square feet to 16 square feet.<br />
Credit for 14 square feet of difference<br />
in rear flagstone patio', NULL, '2025-11-10 13:43:53', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8902761, NULL, NULL, '2025-11-10 16:58:55', NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (8902767, 'Credit for using existing Heater', NULL, '2025-11-10 20:24:10', NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (8902778, 'Footings For Arbor&nbsp;- $230<br />
<br />
Mantel Install - $390<br />
<br />
Gate Flipping - $240', NULL, '2025-11-12 20:16:25', NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (8905711, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">No hours to get these issued.</span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Electrical/Plumbing Permits</span>: $129.03</span></span><br />
 ', NULL, '2025-11-11 09:48:32', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8906024, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">I invested a cumulative of 20min </span><span style="font-family: "Arial", sans-serif"><span style="color: rgba(0, 0, 0, 1)">to get the permit issued.</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"> </span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="font-family: "Arial", sans-serif"><span style="color: rgba(0, 0, 0, 1)">The 20 min include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Application and plan submission online to Alhambra city. Communication & correspondence with city plan checkers. <span style="color: rgba(0, 0, 0, 1)">Permit issuance.</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"> </span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Electrical: $77.15</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $77.15</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"> </span></span><br />
 ', NULL, '2025-12-13 05:45:11', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8906033, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">I invested a cumulative of 3 hour </span><span><span style="color: rgba(0, 0, 0, 1)">to get the permit issued. @75/hour</span></span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">The 3 hours include:</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">Drafting detailed plan per city requirements, revision of scope of work. Over the counter submission of plans to relevant authorities to ensure compliance with local codes and standards for approval. Permit issuance.</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"> </span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">BBQ Permit: $217.98</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"> </span></span><br />
 ', NULL, '2025-11-14 17:02:44', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8910432, 'Additional San Agustín sod for front yard (does not include park way)', NULL, '2025-12-05 22:39:43', 1, '2025-11-21 17:47:14', '(.PM) Carter Godley', '(.PM) Jorge Flores', 'sold'),
  (8910472, NULL, NULL, '2025-12-05 13:42:36', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8910475, NULL, NULL, '2025-12-01 14:47:01', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8911553, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8911560, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8911580, 'Irrigation inspection.', NULL, '2025-11-15 11:43:23', NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (8915472, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8916209, 'An additional pallet needed for larger size paver as there are 2 different sized pavers required to complete the repair work disturbed by the fire', NULL, '2025-11-18 09:44:56', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8918392, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">The 3 hours include: @100/hour</span></span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span><span style="color: rgba(32, 34, 39, 1)">Drafting detailed plan per county requirements, revision of scope of work. Online submission of plans to relevant authorities to ensure compliance with local codes and standards for approval. Communication & correspondence w/ County Plan Checkers. Permit issuance.</span></span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Costs:</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">CND Clearance Deposit: $</span>1,876.20</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Demo Permit: $</span>276.82</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Grading Permit: $388.79</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total: $2,541.81</span></span><br />
 ', NULL, '2025-11-14 11:06:53', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8921905, 'Restucco entire balcony, outer and inner columns', NULL, '2025-11-17 07:39:51', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8923578, NULL, NULL, '2025-11-14 17:02:05', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8925573, '8 x 15g Silver Sheen with supplemental drip irrigation<br />
Check with HO for final plant placement before planting. 2 plants will be on the other side of the Oleander.&nbsp;<br />
Note: have oleander trimmed back a couple of feet.&nbsp;', NULL, '2025-11-14 12:04:01', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8937970, '1 path light 
Lift up bricks to run wire 22 planters that are not currently wired
2 underwater lights 
1 15 gallon arbutus standard ', NULL, NULL, 2, '2025-12-03 06:04:25', 'Bryan Vielman', 'Bryan Vielman', 'sold'),
  (8953046, '2300sqft is listed in the contract, and only 1950sqft is necessary for install', NULL, '2025-11-21 11:03:15', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8953345, 'Credit Posts -$2,375 (no longer needed shoring or replacing)<br />
Charge for Pool Shell Repair $1600<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Credit Posts -$2,375 (no longer needed shoring or replacing)
Charge for Pool Shell Repair $1600</div></div>', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8956961, NULL, NULL, NULL, NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8956988, NULL, NULL, NULL, NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8957385, NULL, NULL, '2025-11-21 12:50:28', NULL, NULL, NULL, '(.PM) Paul DeAngelis', 'sold'),
  (8960586, 'Cut concrete, demo concrete, dig out pipes to assess.', NULL, NULL, NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (8961738, 'Install roughly 1500 linear feet of 12-gauge wiring&nbsp; 3 runs of 500 feet with 3 wires.<br />
6 outlets', NULL, '2026-02-04 23:29:36', NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (8964838, 'As per my conversation with Hugo previous to our installation, I let him know that the cost of the installation of the apron independent of the entire driveway would be an additional $2000 (he had<br />
already provided us with a $3000 deposit).&nbsp; Hugo was invoiced for a balance of $300 without the change order being approved.&nbsp; The new balance for the project is $1700', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (8973829, NULL, NULL, '2025-12-17 12:16:59', NULL, NULL, NULL, '(HR) Mo Solomon', 'pending'),
  (8973989, 'Trench and run 75 linear feet of 4” SDR35 drainpipe<br />
Excavate a 3’ x 3’ x 4’ drainage pit<br />
Fill pit with ¾” crushed gravel, approx. 1 cubic yard (Material allowance: $50/yard)<br />
Wrap with filter fabric<br />
COST $2,494', NULL, '2025-12-01 08:37:05', NULL, NULL, NULL, 'Anna Kurihara', 'lost'),
  (8977976, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Item Labor Material Total
Replacing Irrigation for $4300 $300 $4600
Hillside sprayheads</div></div>', NULL, '2025-11-28 08:57:27', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8977992, 'direct cost', NULL, '2025-11-29 06:39:08', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8986248, NULL, NULL, '2025-12-02 07:48:03', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (8987214, '+ 700 sqft of brown shredded mulch (no charge to the client)', NULL, '2025-12-02 09:12:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8989640, 'upgrade to 16" msi beige travertine including freight. ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (8991314, 'Please order an additional 300sqft plus what''s on the plan/contract.  No additional cost to client ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (8995092, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">No hours to get these issued.</span></span></span><br />
<br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Costs:</span></span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif"><span style="color: rgba(0, 0, 0, 1)">Supplemental Electrical Permit</span>: $54.74</span></span><br />
 ', NULL, '2025-12-03 12:03:16', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (8995150, 'Direct passthrough cost to client', NULL, '2025-12-03 19:24:17', 1, '2025-12-03 12:08:16', '(HR) Mo Solomon', '(HR) Mo Solomon', 'sold'),
  (8995221, NULL, NULL, '2025-12-09 22:01:23', 1, '2025-12-03 12:14:41', '(HR) Mo Solomon', '(HR) Mo Solomon', 'sold'),
  (8995302, NULL, NULL, '2025-12-09 14:07:23', 1, '2025-12-03 12:21:40', '(HR) Mo Solomon', '(HR) Mo Solomon', 'sold'),
  (8995368, NULL, NULL, '2025-12-03 12:31:27', 1, '2025-12-03 12:28:00', '(HR) Mo Solomon', '(HR) Mo Solomon', 'lost'),
  (9000915, '<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Pool Eng. Inc</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Date: 11.19.25</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">For: Restamp on Revised Plan</span></span><br />
<span style="font-size: 12pt"><span style="font-family: Aptos, sans-serif">Total:  $274.28</span></span><br />
 ', NULL, '2026-02-09 09:56:36', NULL, NULL, NULL, '(HR) Mo Solomon', 'pending'),
  (9004822, 'Electrical<br />
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
 ', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9008032, NULL, NULL, '2025-12-15 11:12:17', NULL, NULL, NULL, '(.PM) Paul DeAngelis', 'sold'),
  (9010484, 'Replace pipe that is holding water along the planter area behind east gate.', NULL, NULL, NULL, NULL, NULL, '(.PM) Paul DeAngelis', 'sold'),
  (9010515, 'Move the junction box from the lower patio area, relocate to the wesat side of upper pool deck area adjacent to the rock. Replace the pool light as required. Check the spa light to ensure its working properly.', NULL, NULL, NULL, NULL, NULL, '(.PM) Paul DeAngelis', 'sold'),
  (9012772, NULL, NULL, '2025-12-08 13:00:09', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9014892, 'No Charge - John Durso approved this change order.', NULL, NULL, NULL, NULL, NULL, '(.PM) Paul DeAngelis', 'sold'),
  (9015133, NULL, NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9018692, '16 linear feet of Bel Air Wall with cap<br />
1 course plus footing', NULL, '2025-12-10 14:44:17', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9018888, NULL, NULL, '2025-12-09 09:42:03', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9019083, NULL, NULL, '2025-12-12 10:06:06', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9020033, NULL, NULL, '2025-12-11 12:46:27', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9021828, NULL, NULL, '2025-12-12 10:04:59', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9024698, NULL, NULL, '2025-12-13 05:44:44', NULL, NULL, NULL, '(.PM) Paul DeAngelis', 'sold'),
  (9025386, NULL, NULL, '2025-12-10 09:54:35', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9027463, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9028574, NULL, NULL, '2026-02-26 14:46:16', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (9028579, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Fairfax Irrigation and Replacing Head and Splitting Zones, Irrigation Repairs in Sod Area</div></div>', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (9034330, 'Cut down oleander down to trunk. Use stumpaway on trunk', NULL, '2025-12-11 14:09:02', NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (9035416, NULL, NULL, '2025-12-11 17:35:25', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9038192, 'Composite edging for backyard to separate DG and gravel approx 100 linear feet ', NULL, '2025-12-21 11:02:04', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9038222, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9040377, NULL, NULL, '2025-12-12 19:08:45', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9043701, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Removing flagstone and adding stucco</div></div>', NULL, '2025-12-15 11:12:41', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9053427, NULL, NULL, '2025-12-16 22:44:32', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9055369, 'See attachment.
Added a salt chlorinator
Subpanel work', NULL, '2025-12-17 08:31:12', 1, '2025-12-17 07:11:28', 'Daniel Aguilar', 'Daniel Aguilar', 'sold'),
  (9058039, NULL, NULL, '2025-12-23 10:28:11', 1, '2025-12-18 15:43:19', 'Brian Godley', 'Brian Godley', 'pending'),
  (9059839, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9060001, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'pending'),
  (9063322, 'Installing 125 15 gallon podacarpis hedge $14,375', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9065943, NULL, NULL, '2025-12-23 14:29:54', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (9068183, NULL, NULL, NULL, NULL, NULL, NULL, '(.PM) Paul DeAngelis', 'sold'),
  (9068197, NULL, NULL, NULL, NULL, NULL, NULL, '(.PM) Paul DeAngelis', 'sold'),
  (9070715, NULL, NULL, '2025-12-23 17:37:08', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9073277, NULL, NULL, NULL, NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (9078623, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9080142, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9081882, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (9084570, NULL, NULL, '2025-12-29 12:51:42', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9085234, NULL, NULL, '2025-12-29 12:51:15', NULL, NULL, NULL, '(.PM) Paul DeAngelis', 'pending'),
  (9087656, NULL, NULL, '2026-03-09 10:18:49', NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (9088034, NULL, NULL, '2026-01-02 11:28:31', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9088096, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'pending'),
  (9092165, NULL, NULL, '2026-02-03 12:19:12', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9092188, NULL, NULL, '2025-12-31 14:24:48', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9094257, NULL, NULL, '2026-01-02 11:28:06', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9099487, NULL, NULL, '2026-01-05 11:39:55', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9100145, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Olive Tree
Install ‘Wilsonii’ fruitless olive 36" box
Install (5) Red Trumpet vine 5 gal
COST $2,800
Plant Replacement
Replace 24” box Tristania columnar tree
Replace (2) Cordyline 5 gal with new plant TBD
COST $0</div></div>', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (9101321, NULL, NULL, '2026-01-05 15:29:39', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (9103731, 'Change plastic bender board to metal edging around the citrus tree', '2026-01-06 09:09:00', NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9105711, NULL, NULL, '2026-01-21 07:27:46', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9112622, '1 additional path light', NULL, '2026-01-07 14:29:19', NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (9113413, NULL, NULL, '2026-01-07 17:17:14', 1, '2026-01-07 16:59:11', '(HR) Mo Solomon', '(HR) Mo Solomon', 'sold'),
  (9115477, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9118894, NULL, NULL, '2026-02-02 16:10:50', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9119368, NULL, NULL, '2026-01-11 19:43:56', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9124259, 'Adding metal lodge poles to support existing wall approx 40 linear feet', NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9127001, '400k jandy heater installed.&nbsp;', NULL, '2026-04-01 10:36:14', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9127531, 'Installing 3 pots on top of column. ', NULL, '2026-01-26 15:09:05', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9133254, NULL, NULL, '2026-02-03 12:01:10', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (9140783, NULL, NULL, '2026-01-14 11:16:28', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9142128, NULL, NULL, '2026-01-15 13:31:25', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9142132, 'Increase in material charge for jellybean ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9142151, '1 new 15 gallon naval citrus dwarf&nbsp;', NULL, '2026-01-15 13:34:01', NULL, NULL, NULL, 'Daniel Aguilar', 'lost'),
  (9143827, NULL, NULL, '2026-02-03 11:31:59', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9146912, NULL, NULL, '2026-03-05 13:57:17', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9147011, NULL, NULL, '2026-01-20 15:25:47', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9148873, NULL, NULL, '2026-04-17 11:37:31', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9149301, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'pending'),
  (9150715, 'Widen pilasters for 3'' caps', NULL, '2026-02-05 08:04:12', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (9150733, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">gopher baskets for 7 15 gallons and 2 24 gallon trees</div></div>', NULL, '2026-02-05 10:36:48', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (9162676, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Hedge Removal
Remove (1 qty.) ficus hedge plant
Grind and remove stump roots

Planting
Furnish and install (2 qty.) 15 gal ficus hedge plants in Rear
Front garden: remove 1 agave and trim back snake plants

(SUB: Mitch) Pool Equipment Enclosure - Trex
Install 12 linear feet of 4’ height Trex 1x6 composite fencing
No gates or doors included</div></div>', NULL, '2026-01-29 15:47:06', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9165530, 'Ran 35 ft of 5 strand wire and swapped 1 solenoid. Hours build at $75 per hour 2 and a half hours 187.50 and $80 in materials', NULL, '2026-01-29 12:46:44', NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (9166182, 'All irrigation is now complete.', NULL, NULL, NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (9169087, NULL, NULL, '2026-01-21 14:52:36', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9169348, NULL, NULL, '2026-01-20 15:25:21', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9169350, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Switching Mulch To gorilla hair</div></div>', NULL, NULL, NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (9170125, NULL, NULL, NULL, 1, '2026-01-21 08:36:35', 'Brian Godley', '(.PM) Carter Godley', 'pending'),
  (9172769, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9176235, NULL, NULL, NULL, NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (9181272, NULL, NULL, '2026-01-22 15:11:09', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9183053, NULL, NULL, '2026-01-23 01:53:58', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9183102, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'pending'),
  (9184880, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9185337, NULL, NULL, '2026-01-23 15:30:36', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9187433, NULL, NULL, '2026-01-23 21:55:41', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9187441, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'pending'),
  (9190478, NULL, NULL, '2026-02-05 22:14:24', NULL, NULL, NULL, '(HR) Mo Solomon', 'pending'),
  (9191698, '121 linear feet of metal Edging to retain gravel on rear property line.&nbsp;', NULL, '2026-01-26 11:24:46', NULL, NULL, NULL, 'Daniel Aguilar', 'lost'),
  (9191707, '2 additional path-lights&nbsp;', NULL, '2026-01-26 11:26:57', NULL, NULL, NULL, 'Daniel Aguilar', 'lost'),
  (9191716, '3 led light shades and 6 led bulbs from lightcraft&nbsp;', NULL, '2026-01-26 11:27:42', NULL, NULL, NULL, 'Daniel Aguilar', 'lost'),
  (9193473, NULL, NULL, '2026-01-27 10:18:22', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9193654, NULL, NULL, '2026-01-27 09:21:52', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9196453, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (9197036, NULL, NULL, '2026-02-03 14:25:47', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9199024, NULL, NULL, '2026-01-29 17:25:51', 1, '2026-01-27 12:33:56', 'Anna Kurihara', 'Anna Kurihara', 'sold'),
  (9200275, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">6 man days</div></div>', NULL, NULL, NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (9200593, 'All work has been completed after installation of drain and 1 plant', NULL, NULL, NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (9200828, NULL, NULL, '2026-01-27 16:58:06', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9207421, NULL, NULL, '2026-01-29 17:26:09', 1, '2026-01-28 17:12:27', 'Anna Kurihara', 'Anna Kurihara', 'sold'),
  (9207447, NULL, NULL, '2026-01-29 15:51:45', NULL, NULL, NULL, '(.PM) Paul DeAngelis', 'sold'),
  (9210532, NULL, NULL, NULL, 1, '2026-01-29 10:19:33', 'John Durso', 'John Durso', 'sold'),
  (9213359, NULL, NULL, '2026-01-29 16:25:23', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9213389, NULL, NULL, '2026-01-29 15:50:17', 1, '2026-01-29 15:29:51', 'Anna Kurihara', 'Anna Kurihara', 'sold'),
  (9213414, 'Grading front yard to picth to street/ create burm about 

Reconfigure main line for valves 
Including parts', NULL, '2026-01-31 14:38:57', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (9213483, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'pending'),
  (9213492, NULL, NULL, '2026-02-01 15:32:21', NULL, NULL, NULL, '(.PM) Jorge Flores', 'lost'),
  (9214899, NULL, NULL, '2026-03-13 15:17:14', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (9229563, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Adding 478 SQFT of pavers at 37 per sqft</div></div>', NULL, NULL, NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (9229978, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">1 hour
$136 materials</div></div>', NULL, '2026-02-03 09:51:03', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9230328, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">3 man days (Bryan plus 2 guys)</div></div>', NULL, '2026-02-04 16:48:45', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9232160, NULL, NULL, '2026-02-03 12:19:02', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9232610, NULL, NULL, '2026-02-03 17:50:31', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (9234132, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">2 additional hours over contract. & $60 materials</div></div>', NULL, NULL, 2, '2026-02-03 16:06:36', 'John Durso', 'John Durso', 'sold'),
  (9234590, NULL, NULL, NULL, NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (9234715, NULL, NULL, '2026-02-06 05:05:31', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9237252, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">3.5 man days for Wall Installation/1.3 man days for drains
8" CMU 
Rebar
Concrete for footings
Sand Stucco
Straight Brick Cap (color to match pool coping )

4" drain pipe/5 inlets</div></div>', NULL, '2026-02-04 10:20:31', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9239197, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">18 sq ft bellecrete pavers
1.5 MD</div></div>', NULL, '2026-02-06 10:16:28', 1, '2026-02-04 12:13:00', 'Anna Kurihara', 'Anna Kurihara', 'sold'),
  (9242423, 'Adding 5 path lights
Adding 2 flood lights
Adding 1ground light', NULL, '2026-02-05 08:02:05', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (9242437, NULL, NULL, '2026-04-15 17:14:36', NULL, NULL, NULL, '(.PM) Jorge Flores', 'lost'),
  (9245611, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9248098, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">1 MD</div></div>', NULL, '2026-02-05 15:51:32', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9248149, NULL, NULL, '2026-02-05 15:54:06', 1, '2026-02-05 15:53:47', '(HR) Mo Solomon', '(HR) Mo Solomon', 'pending'),
  (9248421, NULL, NULL, '2026-02-06 05:56:25', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9252043, 'Replacing hose bib with copper. ', NULL, NULL, NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (9253055, NULL, NULL, '2026-02-13 06:44:03', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9257153, NULL, NULL, '2026-02-09 12:06:42', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9257506, NULL, NULL, '2026-02-09 11:45:47', NULL, NULL, NULL, '(HR) Mo Solomon', 'pending'),
  (9258660, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (9260942, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'pending'),
  (9261299, NULL, NULL, NULL, NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (9264777, NULL, NULL, '2026-03-26 19:36:23', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9267983, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Additional Hedge Trees
Provide and install (4 qty.) 15 gal hedge trees
COST $596 - Cash/Check Price

Additional 1 gal
Provide and install (1 qty.) 1 gal shrub
COST $18 - Cash/Check Price

Cut Turf
Cut 6” x 6” area into existing artificial turf
COST $4 - Cash/Check Price</div></div>', NULL, '2026-02-10 15:55:43', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9268634, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Vines 
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
COST $173</div></div>', '2026-02-10 16:06:06', '2026-02-12 16:03:33', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9268726, NULL, NULL, '2026-02-10 17:17:14', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9268820, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (9276451, NULL, NULL, '2026-02-12 07:33:41', NULL, NULL, NULL, '(HR) Mo Solomon', 'pending'),
  (9276453, NULL, NULL, '2026-02-11 18:42:26', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9282717, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Planting Locations: 

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
QTY 18 x 6" WHITE Kalanchoe (Foothill Nursery)</div></div>', NULL, '2026-02-13 10:09:43', 1, '2026-02-12 16:31:36', 'Anna Kurihara', 'Anna Kurihara', 'sold'),
  (9286760, NULL, NULL, '2026-02-15 07:24:29', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9286761, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">1 hr for hauling banana leaves and dumping
2.5 hrs for soldering copper and installing irrigation valve + $100 in material</div></div>', NULL, '2026-02-14 09:27:58', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9286797, NULL, NULL, '2026-02-16 20:50:17', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9287833, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9288065, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9292540, NULL, NULL, '2026-03-31 09:04:44', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9294960, NULL, NULL, '2026-03-02 09:15:03', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9294995, NULL, NULL, '2026-03-02 09:14:49', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9301386, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">$400 in materials + 3 hours</div></div>', NULL, '2026-02-17 16:30:38', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9307863, NULL, NULL, NULL, 1, '2026-02-18 11:02:24', '(HR) Mo Solomon', '(HR) Mo Solomon', 'lost'),
  (9321762, NULL, NULL, '2026-02-19 11:32:42', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9322007, NULL, NULL, '2026-02-27 11:14:33', 1, '2026-02-27 11:47:33', '(HR) Mo Solomon', 'Daniel Aguilar', 'sold'),
  (9332163, NULL, NULL, '2026-02-23 22:50:47', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9336009, NULL, NULL, '2026-02-20 15:59:46', NULL, NULL, NULL, 'Javier Andrade', 'sold'),
  (9343498, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (9347285, NULL, NULL, '2026-02-23 18:39:52', NULL, NULL, NULL, '(HR) Mo Solomon', 'pending'),
  (9348374, NULL, NULL, '2026-03-30 20:47:42', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9358916, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Javier to remove - his charge is $300</div></div>', NULL, '2026-02-26 06:17:10', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9360572, NULL, NULL, '2026-03-03 14:56:11', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9361043, NULL, NULL, '2026-03-13 14:18:40', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9361046, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">4.03 MDs</div></div>', NULL, '2026-02-24 15:44:58', 1, '2026-02-24 15:33:36', 'Anna Kurihara', 'Anna Kurihara', 'sold'),
  (9361371, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9361513, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'pending'),
  (9365166, 'Includes 9 inlets <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">2 man days
Pipe and inlets (area drains)</div></div>', NULL, '2026-02-25 08:55:01', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (9366125, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'pending'),
  (9369331, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9384457, NULL, NULL, '2026-03-02 10:25:46', 1, '2026-02-26 15:26:45', 'Daniel Aguilar', 'Daniel Aguilar', 'sold'),
  (9385309, 'Pavers, drains<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">2md $1719 materials</div></div>', NULL, '2026-02-26 18:04:47', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9385478, 'Install 30 ft 2x12 pressure treated wood with metal stakes. Add basin connecting to existing drains. Mock up attached ', NULL, '2026-02-26 20:56:13', 1, '2026-02-26 18:57:51', 'Bryan Vielman', 'Bryan Vielman', 'sold'),
  (9385533, '6 Arizona flagstones <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">2 hours</div></div>', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'pending'),
  (9388736, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">turf for 2100sqft Bel Air or Socal Blend 93 19.7 man days
Metal edging 150 linear feet 3.1 man days
pipe for 2 drip zones 3.1 man days
pipe for drains plus 7 inlets 1.9 man days</div></div>', NULL, '2026-03-03 14:55:55', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (9393640, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">1.16MD
394.00 material 

(re-using material from yard)</div></div>', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9406439, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">concrete, rebar, stucco, CMU block 
1 man day</div></div>', NULL, '2026-03-03 10:06:19', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9406500, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">.25 MD</div></div>', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9406510, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">CMU block 8", rebar, grout, sanded stucco 4 man days</div></div>', NULL, '2026-03-03 10:05:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9406564, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Pvc, (6) 3" inlets, (1) 12"x12" catch basin, 2.2 man days</div></div>', NULL, '2026-03-03 10:06:46', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9406591, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">1.5 man days, wire for irrigation</div></div>', NULL, '2026-03-03 10:05:21', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9406596, NULL, NULL, '2026-03-03 10:07:10', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9406789, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">1.13 MD</div></div>', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9411677, NULL, NULL, '2026-03-03 10:07:25', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9412041, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">5.25 man days/pipe and emitters</div></div>', NULL, '2026-03-12 06:25:07', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9412142, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">.25 man days/Japanese boxwood 5 gallon</div></div>', NULL, '2026-03-12 06:24:56', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9416134, NULL, NULL, '2026-03-12 06:24:37', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9417793, NULL, NULL, NULL, 2, '2026-03-03 15:04:23', 'John Durso', 'John Durso', 'sold'),
  (9424431, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">.26 MD</div></div>', NULL, '2026-03-04 10:01:36', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9424542, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">$222.38 --  1.04 hours -- 0.13 MDs</div></div>', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9430847, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9435940, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">1.2 man days
iron pipe 1"</div></div>', NULL, '2026-03-31 21:09:03', NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (9440826, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">300sqft of Mexican Beach Pebble in buff 1-2"
20 lf of 6" metal edging
4.1 man days</div></div>', NULL, '2026-03-15 06:38:11', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9446080, NULL, NULL, '2026-03-06 12:59:01', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9446145, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9446439, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9455720, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (9455935, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (9461916, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">6 x Outlet Covers</div></div>', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9472591, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">$130 mat -- 1.67 hours / 0.21 MDs</div></div>', NULL, '2026-03-11 16:50:50', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9475118, NULL, NULL, '2026-03-10 19:38:14', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9475134, NULL, NULL, '2026-03-11 11:56:24', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9483628, NULL, NULL, NULL, 1, '2026-03-12 10:00:48', '(HR) Mo Solomon', '(HR) Mo Solomon', 'lost'),
  (9485199, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">#1 - Materials $273.98 — 44.64 hours / 6 MDs

#2 - Materials $683.10 —  3.00 hours / 0.5 MDs

#3 - Materials $812.32 — 37.10 hours / 5 MDs</div></div>', NULL, '2026-03-12 10:57:09', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9485569, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">12"x6" wall block gray
3 hours</div></div>', NULL, '2026-03-12 06:24:23', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9492303, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Sub cost $504</div></div>', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9492395, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">#1 LIGHTING Materials  $796.50 -- 3.50 hours / 0.44 MDs

#2 IRRIGATION MAterials $985.00 -- 16 hours / 2 MDs</div></div>', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9492815, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Material: $900 (MD - 4 hours)</div></div>', NULL, '2026-03-12 14:37:09', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9496132, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">materials	hours	MDs
wall	$1,934.71	46.37	5.80
waterproof	$394.20	6.67	0.83
wall cap	$798.55	10.58	1.32
irrigation	$75.56	2.50	0.31
electrical	$757.17	6.23	0.78</div></div>', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9500610, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9500950, NULL, NULL, '2026-03-15 22:16:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9502436, NULL, NULL, '2026-03-15 22:16:51', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9502537, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">(25) 5 gallon Japanese Boxwood 
5 hours</div></div>', NULL, '2026-04-18 13:15:26', NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (9505687, NULL, NULL, '2026-03-14 09:18:13', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (9507571, 'The slope on the front of the yard is too steep. Working with the foreman, he has come up with the idea to use some wall blocks to allow the lawn to be leveled as orgionally intended in the project scope. The yard needs to be reviewed and slopes adjusted to increase flatness.', NULL, NULL, NULL, NULL, NULL, 'Jared Walton', 'pending'),
  (9507574, '<p>I have been asking for 2+ weeks for a new design. Now the landscape team is here and is not clear on what they need to be doing. The area is not edged, drains connected, or prepared. This is delaying the laying of the sod.&nbsp;</p>
', NULL, NULL, NULL, NULL, NULL, 'Jared Walton', 'pending'),
  (9514383, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">3 hours/1 guy</div></div>', NULL, '2026-03-19 18:44:31', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9517337, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">.25 hours/40sqft brown shredded mulch 
1.5 hours/17 linear feet of plastic bender board 
3 hours/17 linear feet of metal edging 
2.5 hours/14 2x2 precast grey concrete steppers dry set
3.5 hours/70sqft of landscape gravel 
2 hours/(5) 5 gallon, (7) 1 gallon - till/amend 40 sqft</div></div>', NULL, '2026-03-25 22:48:38', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9517531, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">3 hours
60 pieces of Angelus garden wall block in grey
2 yds 70/30</div></div>', NULL, '2026-03-20 14:43:57', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9517553, NULL, NULL, '2026-03-20 14:46:32', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (9527128, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">(1) NICHELESS LIGHT COLOR CHANGING</div></div>', NULL, '2026-05-01 16:56:07', NULL, NULL, NULL, '(.PM) Jorge Flores', 'pending'),
  (9527140, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">29 hours/iron pipe 1 1/2", conduit</div></div>', NULL, '2026-05-05 13:38:06', NULL, NULL, NULL, '(.PM) Jorge Flores', 'pending'),
  (9537706, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (9537748, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (9546288, NULL, NULL, '2026-03-19 13:07:06', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9546709, NULL, NULL, '2026-03-19 13:33:19', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9547532, NULL, NULL, '2026-03-20 11:09:33', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9548204, NULL, NULL, '2026-03-21 16:38:51', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9548384, NULL, NULL, '2026-03-19 16:06:56', NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (9548424, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">3 hours, $18 materials</div></div>', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9548551, NULL, NULL, NULL, NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (9556268, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9563217, NULL, NULL, NULL, 1, '2026-03-23 09:17:20', '(HR) Mo Solomon', '(HR) Mo Solomon', 'lost'),
  (9563228, NULL, NULL, NULL, 1, '2026-03-23 09:17:47', '(HR) Mo Solomon', '(HR) Mo Solomon', 'lost'),
  (9565065, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">1 man day/wire</div></div>', NULL, '2026-03-24 07:22:29', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9575405, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">$330 mat -- 4 hours / 0.5 MDs
$539 mat -- 2 hours / 0.25 MDs</div></div>', NULL, '2026-04-07 14:41:37', 1, '2026-03-24 11:07:07', 'Anna Kurihara', 'Anna Kurihara', 'sold'),
  (9579181, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (9587957, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'pending'),
  (9589701, NULL, NULL, '2026-04-22 13:53:52', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9595690, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'pending'),
  (9596238, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'lost'),
  (9596256, NULL, NULL, '2026-03-26 11:15:00', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9597867, NULL, NULL, '2026-03-28 18:37:07', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9613395, NULL, NULL, '2026-04-01 10:17:24', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (9617774, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9617792, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9620448, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'pending'),
  (9621156, NULL, NULL, '2026-04-07 06:24:24', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9623745, NULL, NULL, '2026-04-06 14:17:45', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9623760, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">(4) flats of Rosemary
(2) 5g Passionflower
(3) 15 gallon Camellia 
3 man hours

Install wire to 40'' fence for Passionflower
4 man hours</div></div>', NULL, '2026-04-07 11:49:11', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9627838, 'Extending drain to exit back of property', NULL, '2026-04-17 15:00:14', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9637694, 'Chip and stucco bond beam back side of the pool', NULL, '2026-04-15 17:13:58', NULL, NULL, NULL, '(.PM) Jorge Flores', 'sold'),
  (9640121, NULL, NULL, '2026-05-13 10:48:11', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9640134, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9640543, NULL, NULL, '2026-04-01 13:22:56', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9645638, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">total = $525 installed -- 2.68 hours / 0.33 MDs -- $262.80 materials</div></div>', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9655347, NULL, NULL, '2026-04-02 15:11:08', 1, '2026-04-02 13:13:41', '(HR) Mo Solomon', '(HR) Mo Solomon', 'sold'),
  (9657530, NULL, NULL, '2026-04-15 17:10:58', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9663126, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">1.25 hours / 0.16 MDs / $464 materials</div></div>', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9663626, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">3md & 182.00</div></div>', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9663892, NULL, NULL, '2026-04-03 15:54:57', NULL, NULL, NULL, 'Daniel Aguilar', 'pending'),
  (9664318, NULL, NULL, '2026-04-05 15:49:10', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9665300, 'Jorge said we don''t need a step at the front walkway to the house and a credit would be applied.', NULL, NULL, NULL, NULL, NULL, 'Michelle Minch', 'pending'),
  (9667449, NULL, NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'pending'),
  (9667469, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">$1,326 materials</div></div>', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9673961, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">NEW MDs/HOURS for Scope of Work:
$5,127 materials -- 107 hours / 13.37 MDs

120 sqft pavers:
demo/base/install = $1,701 materials -- 6.41 hours / 0.8 MDs -- $630 sub cost (paver install)

435 sqft turf:
demo/base/install = $1,258 materials -- 35.52 hours / 4.44 MDs 

5 gal hedges:
$297 materials -- 3.2 hours / 0.40 MDs

15 gal hedge upgrade:
$688 materials -- 5.33 hours / 0.67 MDs</div></div>', NULL, '2026-04-06 14:51:11', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9674200, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">1.25 Man Days at 725= $906.25
Mortar $20</div></div>', NULL, '2026-04-07 14:40:21', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9682566, NULL, NULL, '2026-04-07 11:49:21', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9691457, NULL, NULL, '2026-04-08 09:57:04', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9691470, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9703053, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">$341.55 materials, 1.5 hours / 0.19 MDs</div></div>', NULL, '2026-04-09 09:46:29', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9709143, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9709154, NULL, NULL, '2026-04-09 18:23:22', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9709183, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (9709341, NULL, NULL, '2026-04-18 06:32:09', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9713607, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (9713627, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (9713762, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (9713952, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (9715829, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'pending'),
  (9715847, NULL, NULL, '2026-04-10 12:41:31', NULL, NULL, NULL, 'Daniel Aguilar', 'pending'),
  (9718240, NULL, NULL, '2026-04-12 16:07:44', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9718311, NULL, NULL, NULL, 1, '2026-04-10 15:56:51', 'Daniel Aguilar', 'Daniel Aguilar', 'sold'),
  (9731259, NULL, NULL, '2026-04-16 07:52:43', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9740000, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'pending'),
  (9740143, NULL, NULL, '2026-05-11 19:21:41', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9749535, '1 replacement light and installation ', NULL, NULL, NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (9751096, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'pending'),
  (9753623, NULL, NULL, '2026-04-15 14:37:39', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9760001, NULL, NULL, '2026-04-30 17:22:12', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9765882, NULL, NULL, '2026-04-16 16:46:18', NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9771652, '3 glass shades 6 75 lbs bags of jellybean gravel', NULL, '2026-04-17 11:21:06', 1, '2026-04-17 10:59:00', 'Bryan Vielman', 'Bryan Vielman', 'sold'),
  (9771862, NULL, NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9772293, NULL, NULL, '2026-04-27 15:17:16', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9773847, NULL, NULL, '2026-04-17 15:00:25', NULL, NULL, NULL, '(.PM) Carter Godley', 'sold'),
  (9774809, NULL, NULL, NULL, NULL, NULL, NULL, 'Javier Andrade', 'pending'),
  (9782684, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">80 sqft of sealer: $105
$65 mat, 0.40 hours / 0.05 MDs</div></div>', NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9782934, NULL, NULL, '2026-05-01 23:34:07', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9788306, NULL, NULL, '2026-04-21 16:54:53', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9797024, NULL, NULL, '2026-04-21 16:55:23', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9799425, NULL, NULL, NULL, NULL, NULL, NULL, 'Anna Kurihara', 'sold'),
  (9809064, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9823296, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9823310, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9827745, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'pending'),
  (9832754, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9838626, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9841105, NULL, NULL, '2026-04-27 15:16:55', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (9841175, NULL, NULL, '2026-05-12 18:25:44', NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (9844389, NULL, NULL, '2026-05-10 13:22:29', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (9844408, NULL, NULL, '2026-04-29 14:20:08', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (9851933, NULL, NULL, '2026-04-30 19:19:44', NULL, NULL, NULL, '(.PM) Paul DeAngelis', 'sold'),
  (9857032, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9857166, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (9859505, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'pending'),
  (9859513, NULL, NULL, '2026-05-01 10:15:16', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9859555, NULL, NULL, '2026-05-01 13:07:13', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9861245, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9861253, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (9861260, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9861274, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9861440, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'pending'),
  (9861782, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (9863211, 'Will use 8 linear feet of curbing.
Pour and form for 1350 sq ft of concrete up from 870', NULL, '2026-05-04 10:49:34', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9864265, NULL, NULL, NULL, 1, '2026-05-11 09:16:36', '(HR) Mo Solomon', '(HR) Mo Solomon', 'lost'),
  (9864270, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'pending'),
  (9864540, NULL, NULL, NULL, 1, '2026-05-04 10:59:02', '(HR) Mo Solomon', '(HR) Mo Solomon', 'sold'),
  (9866982, 'Install 1 yard of premium mulch', NULL, '2026-05-04 17:40:46', NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (9875685, NULL, NULL, '2026-05-06 11:31:54', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9881903, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9883741, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (9884211, NULL, NULL, '2026-05-07 22:19:16', NULL, NULL, NULL, '(HR) Mo Solomon', 'sold'),
  (9885687, NULL, NULL, '2026-05-11 08:08:34', NULL, NULL, NULL, 'Daniel Aguilar', 'lost'),
  (9888198, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'pending'),
  (9891048, NULL, NULL, NULL, NULL, NULL, NULL, '(HR) Mo Solomon', 'pending'),
  (9896861, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (9899830, 'Swap out 2 actuators ', NULL, NULL, NULL, NULL, NULL, 'Bryan Vielman', 'sold'),
  (9902402, NULL, NULL, '2026-05-13 13:06:45', NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (9903288, NULL, NULL, '2026-05-13 13:06:33', NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (9904188, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending');

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
