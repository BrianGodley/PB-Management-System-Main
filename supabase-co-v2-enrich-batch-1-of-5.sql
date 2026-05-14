-- ============================================================
-- v2 CO Enrichment — Batch 1 of 5
-- 1,337 CO updates (rows 1-1337 of 6,685)
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
  (932420, '$350 change order for upgraded White rock instead of DelRio in contract.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Called Matt and he is fine with the $350 change order for the rock he wants on the side of house.
300sqft.  3.5yards of material</div></div>', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'pending'),
  (950125, 'Price for soil removal and replacement only for trenching around house. 4 foot depth only.<br />
<br />
Includes drainage.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Payed $25,000 
 demo 11,000 and waterproofing trench 14,000</div></div>', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (964394, 'Additional 42'' of drain pipe <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Total drain pipe is 177''
Contracted for 135''</div></div>', '2016-09-25 12:43:50', '2016-09-22 15:15:09', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (964969, 'Seal patio pavers and planter wall', NULL, '2016-09-21 06:34:45', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (970250, 'Had to extend wall for water and dirt run off', '2016-09-25 20:11:15', '2016-09-22 15:13:47', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (971199, '<p>&nbsp;</p>

<p>Upgrade to PebbleFina smooth finish with warranty. (colors available)<br />
Convert to salt water system<br />
Use heavy equipment and remove Large boulders from pool to create cleaner look. Haul away all material.<br />
Install new poly 2 inch gas line from new meter location to new pool equipment location.<br />
Move pool equipment to new location. Replumb all subterranean lines. Rerun electrical circuits.<br />
Cannot get access with truck per neighbor. Must bring in small trailer and multiple dump loads. Add 2 days to demo and double dump fee<br />
Install New Jandy Filter System, New Jandy High Efficiency Pump, New High Efficiency Jandy Heater and new above ground plumbing and controls.<br />
Install new skimmer system</p>

<p>&nbsp;</p>

<p>Total</p>

<p>$27,455</p>
', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (971828, 'Rain bird 6 station indoor timer<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Existing timer does not work correctly</div></div>', '2016-09-22 16:30:09', NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (972881, 'Replacing a additional 25'' of block wall. Replacing a additional 120sqft of concrete. Replacing steps with curved step and following the design ', '2016-09-30 12:40:27', '2016-09-29 14:57:08', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (976498, '$1 per sqft  total 761sqft', '2016-09-27 14:48:53', '2016-09-27 14:57:58', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (976499, 'Labor only. Customer will provide paint', '2016-09-27 14:50:34', '2016-09-27 14:59:03', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (978266, 'Custom made bullnose wall cap', '2016-09-30 15:25:08', '2016-09-29 14:55:06', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (978501, 'Seal pavers and sit walls with gloss sealer 2,100sqft', '2016-09-29 20:58:52', '2016-10-04 14:31:38', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (986271, 'Add a 6''x 4'' paver BBQ pad per updated plans.', '2016-10-14 19:48:55', '2016-10-14 09:03:15', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (990071, '1 New palm tree to match existing back left side of house with additional irrigation
Planting and irrigation for 6 extra rose bushes provided by customer', '2016-10-10 10:24:29', '2016-10-10 22:05:41', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (995277, 'Remove hedge along the back side of the pool for pavers to be 1'' away allowing for a planter along the wall.
Relocate and install 1 new valve into planter around pool and put in a drip system
', '2016-10-14 17:06:33', '2016-10-14 10:57:58', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (997330, 'Trenching from the back house to the main house and along the garage', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1001602, '22 lights total Includes transformer, lights, wire, timer and installation. 3 Left driveway lights will be connected by customers electrician due to that area will be under contraction and the wire will need to be ran under the brick and into the garage<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Payment of $10,000 for second progress payment and part lighting payment.</div></div>', '2016-10-26 00:00:00', '2016-10-20 07:40:28', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1001615, 'New Gate to patio ', '2016-10-20 19:42:21', '2016-10-20 10:02:46', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1002054, 'Run electrical to pergola pad, electrical to future yard post, and future office', '2016-10-20 08:42:43', '2016-10-20 08:52:39', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1002057, 'Due to gophers we had to poor a concrete lining to prevent any kind of sinking', '2016-10-20 08:44:38', '2016-10-20 08:52:01', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1002061, 'New trash can pad near the BBQ pad', '2016-10-20 08:45:37', '2016-10-20 08:51:24', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1008249, 'Gopher baskets for plants', '2016-10-26 07:16:50', NULL, NULL, NULL, NULL, 'Brandon Disney', 'pending'),
  (1012503, 'Replace leaking copper line and replace a new main shutoff valve in the front yard', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1012505, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1015575, 'Add on the fountain in the back', '2016-11-07 00:00:00', NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1021139, 'Pool had undersized suction line need to replace back to extension area.<br />
Needed new code required floor drain.&nbsp;<br />
Need new pool light.<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1022989, '$1600 for added paver sq footage.<br />
$300 additional demo<br />
$350 added steps for transition<br />
<br />
No Charge to remove existing wall and steps in back<br />
No Charge to reinstall new wall in back<br />
No Charge to reinstall steps<br />
No Charge for fence post installation<br />
No Charge for plumbing repair work', NULL, '2016-11-11 14:33:08', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1026827, 'Upgrade lawn to Buffalo grass. $1200 &nbsp; Install in 6-8 inch clusters vs 12 inch. $780', NULL, '2016-11-14 15:58:43', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1027626, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1029016, 'FInal plant cost $2345 minus credit of $800.', NULL, '2016-11-14 15:58:19', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1032375, 'Add longer step forming for new design on continuous patio section by house. $1500<br />
Added drains for gargage exit doors and patio. &nbsp;$800<br />
Removal of Large Hedging on Northside South Side and South Wall. &nbsp;Stump grinding . Trim additional trees. Have to hand haul to front due to neighbor. &nbsp;$4200<br />
Added conduit for Outdoor Refridgerator. &nbsp;$500<br />
Added pump fee due to neighbor not allowing concrete truck in alley. &nbsp;$400.<br />
Add (15) 15 gallon hedges. North Wall $2900<br />
Add (12) 15 gallon hedges West Wall &nbsp;$2300<br />
Add (10) 15 gallon hedges &nbsp;South Wall by Garage $1900<br />
<br />
<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1047582, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1055081, '3 uplights  
10 path lights', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1055083, 'Seal backyard pavers before demo', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1065167, 'Replace and lower laundry drain from the garage to the clean out below the kitchen window with ABS', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1066633, 'Replacing cleanout under kitchen window due to it not being installed correctly.', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1068614, 'Added planting.&nbsp; Deduct $200 from this CO for tree', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1068662, 'Install rear dual split face wall.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1068684, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1071378, 'Add square footage to backayrd patio to bring it closer to house.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1071380, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1073350, '1) Demo and install new wall cap front &nbsp;yard.<br />
2) Install overaly on side of north lawn walkway and change elevation down to steps.<br />
3) Install new concrete pad on north side of house.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1077076, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1077518, 'Add new drain line connection for new downspout. &nbsp;$250<br />
Trash permit fee required by city &nbsp; $1850', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1080160, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1080176, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1083364, 'Total plant costs were $2497.67', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1083571, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1085415, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1085420, '-31 upgraded lights $3100 -10 additional lights $3500 -23 hanging lights around pergola and trees provided by Robert $3450', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1085437, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1087871, 'Grass at cost ', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1088047, '1 new valve and drip line<br />
Demo<br />
Planting&nbsp;<br />
Mulch', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1090378, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1097170, 'Replace 3 valves with new brass valves', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1099304, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1100372, 'Seal new paver', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1100374, 'Demo and replace bad & cracked stucco above sliding door on right side yard', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1100376, 'Install provided lights by homeowner. Told the owner these lights won''t last that long and due to them being given to her as a gift she wants them installed. Labor and wire provided by us.', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1101615, '5 path lights 2 uplights', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1101627, 'Replacing 2 exterior lights
Adding 4 new lights', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1103179, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1103274, 'Install fountain between the front 2 windows', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1105844, '300sqft dwarf mondo grass. Replace galvanized to pvc in parkway. Smooth coat Stucco front wall. Cut vine down to allow it to regrow on wall. Replace parkway dirt and put pre-emergence in soil.', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1106759, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1115814, 'Per change order', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1115819, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1115821, 'Rework paver bond beam and tumbled upgrade', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1115822, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1117349, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1117400, 'Install 6 station controller for front yard.  Demo and install new irrigation to parkway. Install 250 sqft RTF sod.', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1120449, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1139635, 'Add 22&#39; of splitfaced wall around pool equipment. Build 4x6 above ground planter box<br />
Upgrade on pool plaser color', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1143240, 'Add controller. &nbsp;Install setps in concrete. &nbsp;Install two new zones of irrigation&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1143623, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1150252, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1156782, 'Demo parkway, front yard, remove stump, 3 yards pea gravel for pathway', NULL, '2017-03-23 16:04:37', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1156796, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1158661, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1158956, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1160264, 'Upgrade cost to pool finish color', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1162244, 'Tiger turf 500 sqft', NULL, '2017-03-23 16:21:21', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1162249, '14 lights with transformer and timer
2 column lights
', NULL, '2017-03-23 16:17:48', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1162250, 'Install drip system in front yard planters
140'' benderboard for planters and pathway', NULL, '2017-03-23 16:17:56', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1162264, '-9 custom made column caps
-50 sqft pavers front porch landing
- bullnose steps
-custom step stones for pathway to match column caps
- 32sqft stackstone

<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">$100 payment August 25 2017</div></div>', NULL, '2017-03-23 16:18:41', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1162265, NULL, NULL, '2017-03-23 16:18:30', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1162271, '800 sqft weed barrier 2) 24" box trees 70) 5 gal<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">700 payment August 25 2017</div></div>', NULL, '2017-04-28 16:56:30', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1163981, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1169536, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1169537, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1169538, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1170108, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1170216, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1170409, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1173497, 'Plans called for Boston ivy, concerned about it growing on the wall it was switched to jasmine', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'pending'),
  (1177982, '140'' gas line
50'' electrical pop out from wall outlet', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1177991, '12 lights', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1178000, 'Allotted fountain $350-$400
', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1178076, '8 uplights
300-600w transformer 
Timer', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1178077, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1178083, 'Fire pit outlet
BBQ outlets
<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Homeowners electrician might run electrical 
200'' 
Conduit $2000
Wire, boxes, outletsGFI weatherproof boxes $2500</div></div>', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1179235, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1181319, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1181324, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1185111, 'Enlarge BBQ 4'' 
Add water and drain pipe to planter for sink', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1185166, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1185316, '110'' of boarder for new concrete driveway/basketball court
Rebar boarder so concrete will be attached to paver boarder
$16 per foot
Rebar $440', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1185354, '820 sqft 
sand finish
Trash pad', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1191987, '2''x20'' paver pathway
Add water for the tree and add pop up behind wall', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1192088, 'Emergency delivery of soil for soil delivery.
Moon valley nursery was supposed to bring soil.', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1193045, '42 sqft', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1196386, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1198275, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1200465, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1201472, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1201512, '37'' re stucco planter wall and waterproof the inside', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1203765, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1203767, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1203770, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1203774, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1203777, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1203778, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1212921, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1212926, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1217208, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1217648, '500 sqft AC1', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1217652, '115'' drains
4'' trench drain for backyard in beginning of pavers', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1217654, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1217655, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1220551, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1220556, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1220667, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1222774, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1223690, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1225795, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1226202, NULL, NULL, '2017-05-10 12:55:34', NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1226401, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1226722, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1233700, '$15', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1233702, '$15', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1236075, '8 foot fence with gate', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1237648, 'Front porch 44sqft
2 steps.   13LF steps', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1241699, 'Orco pavers', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1241702, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1241714, '15- 15gal portacarpus 
9 -5gal white roses
8 -1gal asparagus fern 
12- 5 gal kangaroo paw mix
1 - 15gal white peach tree
Budget total $4500', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1243313, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1246545, 'Replace brick on 2 planters
60''', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'pending'),
  (1246553, 'Install fountain equipment.', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'pending'),
  (1246583, '1 zones lawn 1/2 zone - $700<br />
1 zones planters - $700', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'pending'),
  (1246590, '$200', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'pending'),
  (1246629, 'Seal pavers and travertine.<br />
<br />
square footage 600 square feet.&nbsp;<br />
<br />
travertine sealer.', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'pending'),
  (1247057, '1 24&quot; box crepe Myrtle Plant cost &nbsp;- $500<br />
(10) 5 gallons for front of wall - $600<br />
(15) 5 gallons for small planters - $900<br />
(25) 1 gallons for fill in &nbsp;- $500<br />
<br />
<br />
<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'pending'),
  (1247060, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'pending'),
  (1247085, 'Redwood with redwood detail on post', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1253639, 'Reducing the planter adding more turf', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1255177, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1255180, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1255919, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1261968, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1265991, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1267272, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1268464, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1274100, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1274101, 'Connect from a 1/2" gas line to a 2" gas line for more gas', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1275998, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1278940, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1281412, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1288795, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1292679, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1295339, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1298873, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1303878, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1305864, '300
504', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'pending'),
  (1307673, '3 uplights
3 pathlights', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1308683, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1309752, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1311360, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1311369, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1312308, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1322002, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1323260, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1329215, '125'' 3" drain pipe', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1330322, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1330323, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1333285, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1338134, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1338466, '$20 sqft?', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1338470, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1340205, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1344639, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1346295, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1349037, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1353106, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1353107, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1363803, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1364941, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1365961, '300w transformer 5 up lights 3 path lights 2 step lights', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1365968, '50. 5 gal. Boxwood 8. 5 gal. Plants 3 Flats. Blue fescue', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1365974, '1 drip zone fruit trees
1 drip zone planters
1  spray zone for hillside by turf', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1365979, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1365983, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1365987, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1368620, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1368635, 'Lower dirt near fruit trees and mulch planters', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1368642, 'Weatherproof 12" below dirt
Remove 3" of dirt
Add 3" base to divert water deigns pool house', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1368661, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1368664, '2x6 treated lumber steps and rock landing', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1369868, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1372590, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1378920, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1379616, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1383656, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1387506, 'Approved by txt message 
164 sqft concrete going from driveway to the back yard', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1395101, 'Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1395102, 'Wire mesh under grass
Upgrade to St Augustine ', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1395161, 'Approved by txt
60 1 gal succulents 
15.  5gal plants', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1395164, 'Approved by txt
Stepstones near gate entrance and near step on concrete', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1400701, 'Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1405077, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1406836, '4 pathlights
4 up light
200w transformer', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1408984, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1409040, 'Approved by txt by John 
Grade backyard and remove stumps
Remove soil in front to the back for grading
Remove stumps in front', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1414731, 'Clear redwood TG', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1417740, 'Replace valve and T off front irrigation
Amendments for planting
Weed barrier
Drip line
10). 5 gal plants
20). 1 gal plants
', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1419787, '(1) 5 gal plant
Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1423252, 'Move pile of pavers under house
Put 7yds dirt under house with base and compact
Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1424322, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1424681, 'Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1424682, 'Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1424683, 'By txt Need to confirm prices and additional work for the area', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1426131, 'Non rubber coated wire mesh 
Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1426766, 'Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1429072, 'Approved by txt
Additional 160 sqft grass. $480
Credit $200 for less rock area
Additional $500 to place flagstone in dirt for a patio seating area', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1429691, 'Approved by txt
7) 5gal
15) 1gal
Use left over mulch
Discount for a even final payment of $3,000', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1433863, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1433934, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1434131, 'Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1434132, 'Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1434133, 'Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1434134, 'Approved by txt
1420 sqft wire mesh pvc coated', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1437852, 'Approved by txt 4 path lights 4 uplights 8 5gal plants', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1441847, 'Approved by txt. Demo front tile. Install new paver university paver on front porch and back step. Install 2 lights on pergola. Replace front sprinkler in parkway', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1443851, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1443860, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1447304, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1451269, 'Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1452250, 'Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1458820, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1458822, 'Removed patio and replace with grass
90sqft', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1458826, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1460042, 'Change block to weston', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1462472, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1468018, 'Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1468030, '3. 15gal cypress
1.  1gal plant', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1468080, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1469323, '80'' 4" pipe 2 9" catchbasin', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1469383, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1469764, 'Discount price.  $0.65 per sqft foot
1791 sqft total', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1477218, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1478721, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1485683, 'Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1485684, '24"x 20 feet root barrier to help keep ivy growing into the planter', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1485686, '20'' drain pipe with 9" catch basin', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1485687, 'Repair boarder/bombeam on brick ', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1488376, 'Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1489322, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1490960, 'Upgrade to peseo ', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1493112, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1496703, 'Approved by txt Repair conduit Electrical for pylaster lights Outlet of transformer', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1496704, 'Approved by txt Landscape netting $425 Mulch. $1650 Paver plus delivery. $175', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1504725, 'Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1504729, 'Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1504731, 'Approved by txt
12/20/17.  Payment $200
1/3/18.   Payment $400', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1505819, '9 station outdoor timer
Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1505837, 'Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1505863, 'Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1506086, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1516075, 'Klarise approved', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1516148, 'Approved klarise', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1516160, 'Approved by phone', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1520092, 'Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1521766, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1525464, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1525957, 'Electrical for pump $200
Electrical for transformer $200
Fountain $2,000 (allotted fountain price $400)', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'pending'),
  (1527058, 'Removed<br>
<br>
(1) 24 inch box<br>
(3) 15 gallon plants<br>
(7) 15 vines<br>
(52) 5 gallon plants<br>
<br>
Added<br>
<br>
(70) 15 gallon hedges<br>
<br>
Difference in plant cost is additional $6,780', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1530911, 'Jacuzzi pad was removed and patio pad in front of Jacuzzi  (100 sq.feet)', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1530913, 'Electrical Added For BBQ and out door transformer and irritation timer.', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1536518, 'Remove brick veneer and replace with Half brick manufactured used Approved by txt', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1536529, 'Added plants', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1537398, 'Dog run wall 13'' x 3 courses to retain soil Add 2 courses to wall for fence', NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1544400, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1546189, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1547665, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1548214, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Connect down spout to 3" drain and catch basin out 44 feet to popup no core.</div></div>', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1552285, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Irrigation to be upgraded to subterranean copper liner drip</div></div>', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (1552555, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Disney', 'sold'),
  (1554102, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1554104, 'Electrical for BBQ, Irrigation and transformer@ $500. Also will be installing a out door heater. power will be pulled direct for panel @$1,600.', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1555440, 'Additional subterranean drip for plantersChanging out nettafim drip to rainbird copper line', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1566851, 'Additional Demo on side of house, weed clearing    $200.00<br>Changing 6 linear feet of Fence to 6 LF Gate            $200.00<br>Total                                                                            $400.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1583694, 'Adding 2 step lights Vista in the Light Bronze finish.  SL-4242–LZ-2.5-W-T3 TOTAL should be 6', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (1583705, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1583708, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (1583720, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1584900, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1589281, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1593981, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Turf TBD by Sat Feb 17th</div></div>', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1598778, '1 additional 3/4" superior valve
Relocation of 5-3/4" valves to be replaced with new brass valves', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1606982, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1606986, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1606990, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1612383, 'Replace patio cover structure with four posts $600. Use 4x4 redwood<br /><br />Make a planter area where existing fornt wall is $200. This will reduce sod size by 40 sq feet. <br /><br />Put a sleeve in planter to planter next to house to make it ready for irrigation. We are not installing irrigation or plants. ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1613729, 'For signed change order for extra valve, turf and tree planted', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1614808, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1620186, 'Paver upgrade to Catalina Slate', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1627630, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1632195, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1634088, 'Remove plants -<br>
(3)  5 gallons<br>
(16) 15 gallons<br>
(74) 1 gallons<br>
<br>
Credit $3660<br>
<br>
Add plants 8 flats<br>
$640<br>
<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1637285, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1637616, '3 15 gal. Additional bougainvillia', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1638186, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1638295, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1638297, 'Veneer - Patio post with pressure treated 2x8 wrap and stack stone veneer.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1642888, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1643237, 'Changing area on side of house from rock to pavers', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'pending'),
  (1646119, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1646998, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1647007, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1648452, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1649305, 'Install a new main water line from the meter to house. <br><br> ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1654438, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1657906, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1659445, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1663596, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1664121, 'Extra demo on steps for backyard transition as area had 3 layers of concrete.  Take out rock border near concrete strips by garden beds.<br><br>All brick work had extra layer of patio underneath it.  <br>plus the retaining wall required extra demo <br><br>Add $500 for demo. <br><br>Client requested additional zone of irrigation for garden beds.<br><br>Add $775<br><br>Client requested main line for valves to be moved to side area.  LIne to be done in copper.<br><br>Add $350. <br><br><br><br> ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1664726, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1665982, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1665985, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1665988, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1667348, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1667413, 'Add 3 GFI with weather proof boxes: 

Run 20 feet conduit to post for GFI outlet on switch 

10 feet conduit for GFI for irrigation time and Transformer

Replace existing outlets to GFI with weather proof box and extension box', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (1667416, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1667419, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1667425, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1667544, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1679533, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1680848, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1684187, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1684189, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1684195, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1684199, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1685000, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1685077, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1685083, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1685086, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1686859, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1687577, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1689938, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (1694155, NULL, NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (1694213, '$2100 for added work<br />$1300 for floor issue repair.', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1695608, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1696577, '1) We are building two courses of landscape timber (level) for the section next to driveway. $680<br />2) We are adding more plants in the planters for the two boxes in front and for the planter next to the lawn. $400<br />3) We are will be finishing the sump pump line in the ditch next to the driveway and covering it.  Sump pump line has to have cleanouts every 50 feet.  $800<br /><br /><br /> ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1701307, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1701311, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1701313, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1701314, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1701316, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1701322, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1703143, 'Taking off contract 89 LF of one course of block  12 X 89= $1,068<br /><br />Adding 108 SF per plan    108SF X $11.50= $1,242.00<br /><br />Adding drainage 104 LF with 5 caps and 1 gutter conection   $1,215.00<br /><br />Courtesy discount of $174.00<br /><br />Balance due after pavers and drainage $1,215.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'pending'),
  (1714851, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1714856, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1719680, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1719711, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">$600. Credit for broken line</div></div>', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1719942, 'Added 8 lights. $200/each<br /><br />and <br /><br />200 feet of wiring.  $100/each', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1722522, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1722528, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1730207, '<p> </p><p>1. 16 Linear Feet of Channel drain</p><p>2. 44 Linear Feet of Drainage</p><p>3. 1 pop up in planter</p><p>4. Trench to proper depth and grade for the channel drain in front of the garage door</p><p>5. Trench to proper depth and grade for the drainage pipe to be set under the pavers</p><p>6. Compact the soils in the bottom of the trench </p><p>7. Set the pipe to proper grade and set channel drain</p><p>8. Connect the drains</p><p>10. Backfill and compact to proper 95% compaction in trench over the pipe to prepare for pavers</p><p>11. Install pop up in planter</p><p>12. Haul all extra soils and debris to proper dump sites</p><p>13. Clean and prepare for pavers</p><p> </p><p>Cost:  $1,350.00</p><p>Customer discount    $200.00</p><p>Total $1,150.00</p><div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Has been approved via Email</div></div>', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'pending'),
  (1730969, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1731398, 'Additional pavers on the property line side where a planter was<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Has been approved via email</div></div>', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'pending'),
  (1732333, '$1000  mixed blend of Stone and Modular Catalina <br />$2587 Slate upgrade<br /> ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1733613, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1741402, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1743519, NULL, NULL, '2018-08-27 16:09:32', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1743524, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1743532, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Need to give $620 Robert credit</div></div>', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1743548, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1743552, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1745382, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1754533, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1755352, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1755355, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1755356, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1755360, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1757645, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1761217, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1761222, 'We added concrete footings for extra engineering.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1761231, 'Added plugs plus footage', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1762724, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1763001, 'Paver count at 45SF more, not 100 SF', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1763092, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1763341, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1763345, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1764075, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1764536, 'This is change order price with mix.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1768643, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1768647, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1768944, 'Drainage costs<br /><br />320 x$25 per foot  $8125<br /><br />Minus courtesy discount $2000<br /><br />Subtotal $6125<br /><br />Take off another 25 feet for patio 1.  -$625', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1769396, 'Adding Pavers, mow strip border and gas line.&nbsp; Change order in documents<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">approved via email</div></div>', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1772634, 'Taking off Eye Drop Pool Lounge Pad', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1772658, '<span style="font-family: Arial, sans-serif"><span style="font-size: 10.5pt">Hi Matt and Meredith,</span></span><br>
<span style="font-family: Arial, sans-serif"><span style="font-size: 10.5pt">The scope of work includes:</span></span><br>
<span style="font-family: Arial, sans-serif"><span style="font-size: 10.5pt">NEW WALL</span></span>
<ol>
	<li><span style="font-family: Arial, sans-serif"><span style="font-size: 10.5pt">Trenching additional amount for footings</span></span></li>
	<li><span style="font-family: Arial, sans-serif"><span style="font-size: 10.5pt">18 Linear Feet of Footing</span></span></li>
	<li><span style="font-family: Arial, sans-serif"><span style="font-size: 10.5pt">18 Linear feet of Belgard Belair retaining decorative wall in Victorian</span></span></li>
	<li><span style="font-family: Arial, sans-serif"><span style="font-size: 10.5pt">There will be 6 Linear Feet at 3 courses high with cap, 6 Linear Feet of 2 courses high with cap, 6 Linear Feet at 1 course high with cap.</span></span></li>
</ol>
<span style="font-family: Arial, sans-serif"><span style="font-size: 10.5pt">Cost:      $72.00 LF X 18 LF= $1,296.00</span></span><br>
This was approved in EMAIL', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1776192, 'First plant order see list in daily logs attachment', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'pending'),
  (1779571, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1780496, 'Change order, I will put in change orders,<br>26 LF of not just conduit as in contract but pulling the wire and setting up GFI<br>Total cost:  $750.00<br><br>Credit of the conduit in contract  $260.00<br><br>Change order is $490.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1787745, '<span style="color: #1f497d">500W  - “equivalent lumens”  LED White Pool light  - $843 installed<br><br>approved per email</span><br> <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Pentair 601301 IntelliBrite 5G White Underwater LED Pool Light, 120 Volt, 50 Foot Cord, 500 Watt Equivalent

order from superior /scp</div></div>', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (1788501, 'Run 16 feet conduit and rewire 2" conduit for pond  1/2 of the run was promised in original contract', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1788571, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1789121, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (1789642, '78 linear feet of drain pipe.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1789672, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1790000, 'Using 1 yard of Palm Springs 3/4" in 75 SF upgrade<br />approved via email<br /> ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'pending'),
  (1790045, 'Plant count went from:<br />$3,775.00 in budget to $2,625.00 in final install count= $1,150.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'pending'),
  (1790046, 'Reduced valves by one valve<br />$150.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'pending'),
  (1790834, '<span style="color: #1f497d"><span style="font-family: Calibri, sans-serif"><span style="font-size: 11.0pt">Add 200Sqft Lawn $900</span></span></span><br /><span style="color: #1f497d"><span style="font-family: Calibri, sans-serif"><span style="font-size: 11.0pt">Add 300Sqft DG under Shed $980</span></span></span><br /><span style="color: #1f497d"><span style="font-family: Calibri, sans-serif"><span style="font-size: 11.0pt">Move shed $650</span></span></span><br /><span style="color: #1f497d"><span style="font-family: Calibri, sans-serif"><span style="font-size: 11.0pt">Excavate for new location of shed and grade approx. 4 yards soil removed  $1028</span></span></span><br /><span style="color: #1f497d"><span style="font-family: Calibri, sans-serif"><span style="font-size: 11.0pt">Additional lawn irrigation $850</span></span></span><br /><span style="color: #1f497d"><span style="font-family: Calibri, sans-serif"><span style="font-size: 11.0pt">Additional benda-board 50ft $385</span></span></span><br /><span style="color: #1f497d"><span style="font-family: Calibri, sans-serif"><span style="font-size: 11.0pt">Bender Board written per contract 85ft $650</span></span></span><br /><span style="color: #1f497d"><span style="font-family: Calibri, sans-serif"><span style="font-size: 11.0pt">Deck install $4180</span></span></span><br /><u><span style="color: #1f497d"><span style="font-family: Calibri, sans-serif"><span style="font-size: 11.0pt">Mulch credit -$572</span></span></span></u><br /><u><span style="color: #1f497d"><span style="font-family: Calibri, sans-serif"><span style="font-size: 11.0pt">Total  $9051</span></span></span></u><br /><br /><strong><u>Payment Schedule (for the Above)</u></strong><br />50% Complete $5000<br />75% Complete $2000<br />100% Complete $2051<br /> ', NULL, NULL, 1, '2018-06-21 08:24:22', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (1791951, 'Hi Verva, Change order approved. Thanks, Jacki On Tue, Jun 19, 2018 at 2:20 PM, Verva <  verva@picturebuild.com> wrote:   Hi Jacki, I we are coming along.  Demo is almost done.  Please approve these change orders:   Drainage, as per our discussion 26 additional linear feet at the SDR 35 rate $20.00 = $520.00 59 additional linear feet at the SDR 35 rate $20.00 = $1,180.00 Total for Drainage: $1,700.00   Pavers, on the side of house 27’ X 3’= 81 Square Feet X $11.50= $931.00   Moving a main water line $100.00   Bench Seat: Bench Seat 2 options: 14 LF long,  24” deep, with 2 LF (12”) into the fence, 18” high Cap will 12” deep @ $84.00 X 16= $1,344.00 + 12” SF pavers $161.00 = $1,505.00 We can fill in the 14 feet in the back of the wall with soil for a planter, or only 12 SF of pavers for a 24” deep seat. It would be enough room to put back cushions. The $1,505.00 minus the 15 cent credit ($303.00)= $1,202.00   Steps 22 Linear Feet in contract, need to add 4 more linear feet to make the steps 4’6” wide, and for step edge on porch 4 LF X $50.00= $200.00   TOTAL OF ALL CHANGES: $4,133.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1793807, 'Not using polymeric sand in pavers, still need in steps', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'pending'),
  (1794185, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1795539, 'Change out 8x8 post.<br /><br /><br /> ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1800897, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1805515, 'Did not do main line. Irrigation included ball valve.', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1810523, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1811593, NULL, NULL, NULL, 1, '2018-07-25 11:39:53', 'Verva Gerse', 'Jorge Flores', 'sold'),
  (1817595, '<ul>	<li>15-Gallon
	<ul>		<li>Red Bud Tree - Purple leaf (1)</li>		<li>Carolina cherry laurel (5)</li>	</ul>	</li>	<li>5-Gallon
	<ul>		<li>Nandina - can we get the ''blush'' (5)</li>		<li>Pittosporum tobira varigata (5)</li>	</ul>	</li>	<li>1-Gallon
	<ul>		<li>Daylilies - "stella de orro" (6)</li>		<li>Achillea  - yellow (6)</li>		<li>Salvia leucantha (6)</li>	</ul>	</li></ul>', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (1819106, '1)    Reducing turf from 400 to 125 SF    Credit -$2,470.00    <br />2)    Adding curves $200.00<br />3)   Wrapping a post in wall block 18" high at wall level  $350.00<br />4)    Adding pavers 13X4=52 X $12.00 =$624.00<br />5)     Adding one step 6 LF X $50,00    $300.00<br />6)    Adding 10 SF at driveway side for flair    $120.00<br />Credit of $876.00<br /><br />APPROVED VIA SIGNATURE ON DRAWING', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'pending'),
  (1819945, 'Building a weed barrier in concrete for planter by second wall.  Jorge to place 3/4" pipe for drainage.  $1,600.00 and 20 Horse Tail plants @ 1 gallon  $400.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1821265, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1826810, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1826881, 'Adding one more light. Approved by signature on drawing.', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1830538, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1832704, NULL, NULL, NULL, NULL, NULL, NULL, 'Erin Godley', 'sold'),
  (1837653, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1837654, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1844184, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1847565, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1849536, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1852377, 'Reroute irrigation systems and new brown drip line<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Credit of $600.</div></div>', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1852537, 'Additional 3 course belgard Weston in Bella.', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1853748, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1858227, 'Ryan – Design, permit running, time at city hall etc                $1000<br />Geo-Labs – Soils report for wall                                               $1041<br />Geo –labs  - compaction testing                                               $1262.50<br />Stromb Engineering for patio cover extension                         $1000<br />Thousand Oaks Permit Fees                                                   $722.93<br /> <br />Total      $5026.43<br /> ', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (1868946, 'Taking out 16 linear feet of decking with redwood upgrade, and staining@&nbsp; $60 a square foot', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1881318, '20sqft additional', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (1881320, '15 gallon Magnolia "Little Gem"', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (1884703, 'Using Angelus stone wall II Cream/terracotta/BROWN. Wall block and cap. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1884787, 'For lowering fence from 5 feet to 3 feet per homeowner request. painting fence', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1885079, 'This is for the permit fee for the job.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1885081, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1893395, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1896234, 'Upgrade to Belgard Catalina Grana Avignon<br>
778 SF X .60= $467.00<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1897523, 'Full House Stucco 0 $11,500', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1900062, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1902077, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1902656, 'For planter walls', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1903533, 'Initial city permit fees. Planning Checks etc.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1903970, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1905218, 'APPROVED BY EMAIL<br>
<br>
 
<div> </div>
<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Original contract for planting $4640
 
46-5Gal @ $40ea   - $2080
5-15Gal @ $150ea   - $750
3-24” @ $350ea  - $1050
Total planting $3880
 
Additional lawn (because you wanted the planters smaller-which made the lawn larger)
From 800 to $1080Sqft
@ $3sqft x220 $660 
 
There is a credit of $100</div></div>', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (1905980, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1905985, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1905987, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1905991, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1905992, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1905993, 'This covers the permit fee for electrical and plumbing', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1907928, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1908097, 'Customer wants to add irrigation. <br>
<br>
2 new zones of drip and a new 9 station timer. ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1910235, '<font><span style="font-size: 21.3333px"><b>Tile overlay Concrete</b></span></font><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">Additional SF 54 X $27.00</span></span></b></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">Cost:          $1,458.00</span></span></b></span></span><br>
<br>
<br>
<br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">Belgard Noon Porcelain Paver</span></span></b></span></span><br>
<font><span style="font-size: 21.3333px"><b>Upgrade</b></span></font><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">Cost:          $2,433.00</span></span></b></span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">Additional Linear Feet of Kitchen Counter</span></span></b></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">The counter was expanded 3 Linear Feet, 2 LF + 1 LF</span></span></b></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">3 X $850.00</span></span></b></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">Cost:          $2,550.00</span></span></b></span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">Additional Stack Stone in Black Quartz</span></span></b></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">From the contract we added additional lf of counter and expanded the stack stone to cover the 7 foot side facing the water feature. At 3 feet high.  Additional 27 SF X $25.00</span></span></b></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">Cost:          $675.00</span></span></b></span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">Total of additional costs:   $7,116.00</span></span></b></span></span><br>
<br>
<br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">Credits:</span></span></b></span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">Planting</span></span></b></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">Reduction in bender board 45 LF- 19 LF=26 LF</span></span></b></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">Credit:      $152.00</span></span></b></span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">Reduction in planting, because of expanded tile patio 4 @ 1 gallon and 4 @ 5 gallon</span></span></b></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">Credit:      $240.00</span></span></b></span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">Reduction of Step Stones in backyard</span></span></b></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">Reduction of step stone in the backyard from 18 -7= 11 remaining</span></span></b></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">The steps stone are custom made</span></span></b></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">Credit:      $630.00</span></span></b></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">Total of credits:          $1,022.00</span></span></b></span></span><br>
<br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">Difference of all change orders:</span></span></b></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">$6,094.00</span></span></b></span></span><br>
<br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">Please respond to this with your approval, so that we may continue moving forward with your project.</span></span></b></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 16.0pt"><span style="font-family: ">Thank you for choosing Picture Build!!<br>
GUS APPROVED THIS VIA EMAIL</span></span></b></span></span><br>
 ', NULL, NULL, 1, '2018-09-04 07:15:23', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (1910904, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1912950, 'Misunderstanding on steps. 2 steps 3lf wide each. I charged an extra 50 cents per SF. It is covered in contract price. 
Overage on pavers $389.  Overage on Paver upgrade $233.=$622 - steps $300. = $322 Overage on contract unit pricing. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1913414, 'simple turf "Cali supreme"  105sqft<br>
see design for location , measure from jobsite ', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (1913669, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">$1050 design fee,  $525 paid</div></div>', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (1914030, 'install pressure treated ,screwed  to new fence as needed   <br>
6" to 12" sizes<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">when ready please consult with Ryan</div></div>', NULL, '2019-07-16 12:04:52', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (1914158, '$3099 includes  (price matched)<br>
1. 40" BBQ  #90823  <br>
2. Single Side Burner # L5631<br>
3. Door & Drawer Combo # L3320<br>
4. Refrigerator #2002<br>
5. Sink with Faucet # 54167<br>
6. Charcoal Tray # L109673<br>
<br>
Recommend you get a double door for under the BBQ<br>
$294 (price matched)<br>
<br>
Total $3393<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Change out double door to Horizontal Door

note to self will find out if there is a credit or now</div></div>', NULL, '2018-09-05 13:58:56', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (1914980, '<table style="width: 513.9pt; border-collapse: collapse; border: solid windowtext 1.0pt" width="1713">
	<tbody>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 45.9pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="153"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Symbol</span></span></span></td>
			<td style="border: solid windowtext 1.0pt; width: 374.9pt; border-left: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1250"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Name</span></span></span></td>
			<td style="border: solid windowtext 1.0pt; width: 43.15pt; border-left: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="144"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Size</span></span></span></td>
			<td style="border: solid windowtext 1.0pt; width: 49.95pt; border-left: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="167"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Quantity</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 45.9pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="153"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">ML</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 374.9pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1250"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Magnolia “Little Gem”</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 43.15pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="144"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">15Gal</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 49.95pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="167"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">3</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 45.9pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="153"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">CM</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 374.9pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1250"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Crape Myrtle  “Multi”    pink or burgundy – no white</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 43.15pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="144"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">15Gal</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 49.95pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="167"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">1</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 45.9pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="153"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">C24</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 374.9pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1250"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Crape Myrtle  “Standard” pink or burgundy – no white</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 43.15pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="144"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">24”Box</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 49.95pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="167"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">1</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 45.9pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="153"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">JM</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 374.9pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1250"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Japanese Maple “Bloodgood”</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 43.15pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="144"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">15Gal</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 49.95pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="167"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">2</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 45.9pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="153"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">CC</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 374.9pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1250"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Carolina Cherry</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 43.15pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="144"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">5Gal</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 49.95pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="167"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">5</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 45.9pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="153"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">PS</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 374.9pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1250"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Pitosporum Silver Sheen</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 43.15pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="144"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">15Gal</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 49.95pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="167"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">6</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 45.9pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="153"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">CJ</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 374.9pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1250"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Camelia Japonica - pink</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 43.15pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="144"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">15Gal</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 49.95pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="167"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">2</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 45.9pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="153"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">IR</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 374.9pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1250"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Iceberg Rose  “White”</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 43.15pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="144"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">5Gal</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 49.95pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="167"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">7</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 45.9pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="153"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">ND</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 374.9pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1250"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Nandina Domestica</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 43.15pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="144"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">5Gal</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 49.95pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="167"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">3</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 45.9pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="153"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">LG</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 374.9pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1250"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Liriope Gigantea</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 43.15pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="144"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">5Gal</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 49.95pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="167"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">11</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 45.9pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="153"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">AR</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 374.9pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1250"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Arbutilon (1-RED)(2-Peach), no white or varigated</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 43.15pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="144"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">5Gal</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 49.95pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="167"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">3</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 45.9pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="153"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">DL</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 374.9pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1250"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Daylily “Stella De Oro”</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 43.15pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="144"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">1Gal</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 49.95pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="167"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">13</span></span></span></td>
		</tr>
		<tr style="height: 10.3pt">
			<td style="border: solid windowtext 1.0pt; width: 45.9pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt; height: 10.3pt" valign="top" width="153"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">DB</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 374.9pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt; height: 10.3pt" valign="top" width="1250"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Daylily “Burnt Orange”  the biggest tallest orange variety</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 43.15pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt; height: 10.3pt" valign="top" width="144"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">1Gal</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 49.95pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt; height: 10.3pt" valign="top" width="167"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">10</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 45.9pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="153"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">CT</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 374.9pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1250"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Canna Lily “Tropicana”</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 43.15pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="144"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">1Gal</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 49.95pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="167"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">4</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 45.9pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="153"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">JA</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 374.9pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1250"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Japanese Anemone “pink or peach” – not white</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 43.15pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="144"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">1Gal</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 49.95pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="167"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">7</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 45.9pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="153"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">AD</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 374.9pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1250"><span style="font-size: 11pt"><span style="background: white"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: #282828">Asparagus densiflorus ''Meyers'' (A. meyeri)</span></span></span></span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 43.15pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="144"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">1Gal</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 49.95pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="167"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">16</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 45.9pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="153"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">GM</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 374.9pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1250"><span style="font-size: 11pt"><span style="background: white"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: #282828">Geranium macrorrhizum</span></span></span></span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 43.15pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="144"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">1Gal</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 49.95pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="167"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">7</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 45.9pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="153"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Lantana</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 374.9pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1250"><span style="font-size: 11pt"><span style="background: white"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: #282828">Lantana “Groundcover” pink or red</span></span></span></span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 43.15pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="144"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Flat</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 49.95pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="167"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">4</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 45.9pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="153"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">BI</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 374.9pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1250"><span style="font-size: 11pt"><span style="background: white"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: #282828">Parthenocissus tricuspidata</span></span></span></span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 43.15pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="144"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">1Gal</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 49.95pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="167"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">8</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 45.9pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="153"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">AC</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 374.9pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1250"><span style="font-size: 11pt"><span style="background: white"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="color: #282828">Achillea “Red or burgundy” dwarf variety</span></span></span></span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 43.15pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="144"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">1Gal</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 49.95pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="167"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">4</span></span></span></td>
		</tr>
	</tbody>
</table>
<br>
Remove 1 large junipers and dispose,<br>
<br>
Total Additional cost  - no change<br>
 ', NULL, '2018-09-06 13:34:11', 1, '2018-09-06 12:36:25', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (1915397, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1916579, '6 large shrubs to be removed please see photos.&nbsp; Approved via email', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'pending'),
  (1917698, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1918958, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1918959, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1923763, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1923767, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1928927, 'Paver patio extended due to layout on walk through.   Then paver patio and walkways extended again due to reducing planter on side yard.  <br>
<br>
Original Contract was for 622 sq feet.<br>
Installed paver was 780 sq feet. <br>
<br>
Total added footage was 158 sq feet. <br>
<br>
Artificial Turf is 320 sq feet contract was 300.  - Courtesy no charge for addtional sq footage. ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1928938, 'Sealer all paver', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1929033, 'Thoroseal/surecoat "masonry sealer" behind all walls, 2 coats, <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">up to 8 hours labor should be spent on this, according to the crew..we shal see</div></div>', NULL, '2018-09-13 21:51:38', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (1930470, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1930757, 'originally 800 , credit of 300 given', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1932517, 'Added 8 LF of 4 Feet high Angelus Stone Wall II block and cap in grey moss charcoal', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1938086, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1945713, 'credit&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1945947, 'Demolition of 250 SF in back yard', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1945948, 'Demolition of 24 LF of 3'' high wood fence', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1946009, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (1946577, 'Reduced the oz of Turf from 90 oz in contract to 50 oz $1.00 a SF credit<br>
Added 36 SF of Turf<br>
<br>
Please see attached chenge order', NULL, NULL, 1, '2018-09-25 08:14:18', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (1946587, 'Electrical Verified by Max,<br>
Pulled 92 LF from the 100 LF inbudget<br>
8 X $25.00<br>
$200.00 credit', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1946591, 'Please see attached changes in concrete<br>
 ', NULL, NULL, 1, '2018-09-25 08:17:59', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (1946598, 'Shelving on back wall taken out', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1946603, 'Credit of wood not being used, Jennifer is buying her own wood for fencing', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1946613, 'Taking bender board out of contract', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1946624, 'Rocks on side of property line put in trench and poured conrete in trench', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1946628, 'Installation only $10 @ 1 gallon X 8= $80.00<br>
Installation only $20 @ 5 Gallon X 3= $60.00<br>
$140.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1946641, '<br>
Added 71 sq feet of rock.  Original contract was 507sq feet. Installed 578.<br>
$426<br>
<br>
Upgrade to Mexican Beach Pebble.<br>
$1976 total rock Material Cost<br>
($224) credit for gravel included in contract<br>
<br>
Please see attached notes:<br>
Lemon tree was accidentally chopped off and the water was left on all night<br>
($578) credit<br>
<br>
Total Change Order<br>
$1600<br>
<br>
 ', NULL, NULL, 1, '2018-09-25 08:34:42', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (1946719, '198 Square Feet X $9.50  bobcat accessable<br>
Approved with signature on contract<br>
<br>
Additional 198 SF bobcat demo', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1950479, 'Install new irrigation control wire from garage to rear valves.  Install new Rain Dial 9 station irrigation control clock in garage', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (1951931, 'Installing a stainless steel edging on the step overlay<br>
Materials should be only $240.00<br>
Should be same labor', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1951943, 'Additional 34 Linear Feet of Drainage SDR 35&nbsp; $25.00 X 34 LF', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1951949, 'Belgard Anglia Curb <br>
37 Linear Feet X $27.00<br>
$999.00<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1952198, 'Demo 8 LF of Wall  8 X $20 $160.00<br>
Install 3 course with cap 6 LF X $82.00= $492.00<br>
$652.00<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1952199, 'ADD<br>
1. 100Sqft DG at upper hillside patio per design  $400<br>
2. 100Sqft lawn at front yard lawn extension including 1 sprinkler $385<br>
 ', NULL, '2018-09-27 20:41:42', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (1952214, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1952216, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1952425, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1958471, 'Wall cap on existing wall.', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1963474, '(3) 15 gal arbutus marina', NULL, '2018-10-31 11:23:17', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (1964502, 'Pressure Regulator Installation', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (1964532, '7 more of edger @27 = $189.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1968116, '<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><u><span style="font-family: ">Demo/Cleanup - Additional</span></u></b></span></span></span>
<div style="margin-bottom: .0001pt; margin: 0in 0in 0.0001pt 0.5in"> </div>

<ol>
	<li style="margin-bottom: .0001pt; margin: 0in 0in 0.0001pt 0.5in"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">Existing pavers 330Sqft  ($660)</span></span></span></span></li>
	<li style="margin-bottom: .0001pt; margin: 0in 0in 0.0001pt 0.5in"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">35ft x 16” brick wall - Dispose Only ($330)</span></span></span></span></li>
	<li style="margin-bottom: .0001pt; margin: 0in 0in 0.0001pt 0.5in"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">Addition Error on Contract ($370)</span></span></span></span></li>
</ol>
<br>
<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (1968212, 'The stripping of the 4x4 down to about a 3x2 in order to be able to have gate latch and gate close.<br>
The addtional pieces from arrow fencing to be applied to lower part of the decking fence panels to enclose.', NULL, NULL, NULL, NULL, NULL, 'Sean Martinez', 'sold'),
  (1970578, 'was paid early on, never added as change order or addedum', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1970581, 'was paid early on, never added as change order or addedum', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1970590, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1971047, 'Total labor : 29 hours<br>
<br>
Dump Fee : $250.00<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1975492, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (1976657, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1977172, 'Add Railing below fencing.<br>
Change front gate to open outwards', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1977808, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1977811, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1977820, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1977823, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (1982178, 'Adding Mulch back into the contract:<br>
2,339 Square Feet @ $1.00 a SF<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1982182, 'Adding DG with stabilizer and geotextile fabric to already demoed area 520 Square Feet&nbsp; X $5.00:= $2,600.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1983616, '$1600 for concrete weed barrier
<div>$400 for 20 1 gallon plants<br>
Approve via email<br>
<br>
was 2000</div>
', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (1983776, 'Ipe Upgrade for Steps<br>
<br>
$1300 Wood<br>
$1400 Labor<br>
<br>
2700', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1984747, 'Instllation of the fountain&nbsp; &nbsp;and trench for the electrician&nbsp; $650.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1984760, '610 Square Feet X 50 cents= $305.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1985270, '$600.00 extra Soil<br>
$747.00 Avignon upgrade<br>
$2,071.00 Additional Pavers  <br>
$1,517.00  Additional block wall<br>
$300.00 Additional steps<br>
$1,541.00  Wall A  new retaining wall<br>
$1,399.00  WAll   new retaining wall<br>
$8,175.00', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (1986077, 'Added as a change order for accounting purposes. <br>
<br>
This was already billed and paid for. <br>
<br>
from original bill <br>
$3517.67 permits, engineering, soils<br>
$900  Ryan, permit Running and permit design', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1986158, ' <br>
Moved from owner payments to a CO for accounting purposes. <br>
<br>
This was already billed and paid for.<br>
 <br>
 ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1986165, 'plus permits, engineering, soils , design , permit running costs<br>
<br>
Moved from owner payments to a CO for accounting purposes. <br>
<br>
This was already billed and paid for.', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1986175, '<br>
pool tile upgrades', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1988438, 'Soil preparation and 6 additional flats of Buffalo grass<br>
<br>
635 Square Feet  15" on center  72 plugs per flat  X 6 flats  $900.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (1990487, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1990869, 'additional 77 SF of pavers in the back yard, bobcat demo', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1990884, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1991299, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (1991367, '1/2 of $750 Design fee deposit', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (1991442, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2000290, 'Adding one GFI $150.00<br>
Adding one Vista 150 Watt  $350.00<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">By Verva</div></div>', NULL, NULL, NULL, NULL, NULL, 'Sean Martinez', 'sold'),
  (2000305, 'Moving 2 valves to planter with existing valve, replacing valves with new brass valves', NULL, NULL, NULL, NULL, NULL, 'Sean Martinez', 'sold'),
  (2003295, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2008231, 'Install 4 flats needle point ivy on west hillside,  and install jute mesh ,  install (7) 15gal Carolina cherry shrubs @ $175ea ', NULL, '2018-10-31 13:31:58', 1, '2018-10-30 14:10:42', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2008249, 'Remove existing and install new rotor sprinklers  along top of  hillside .<br>3 zones @ $850ea  = $2550<br>tie front drain inyo new drain system $247<br>$631  Irrigation repair credit<br>Total $1919', NULL, '2018-10-31 13:30:40', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2008267, 'By owner request clean hillside additionally , trim figs down from 50% to 25% , removed shrubs as directed. &nbsp;And expressed to workers', NULL, '2018-10-31 13:27:22', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2008675, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2011122, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2014518, 'Hoa&nbsp;design this is half of the fee&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Sean Martinez', 'sold'),
  (2014561, 'This is half of deposit if sell job', '2018-11-02 00:00:00', NULL, NULL, NULL, NULL, 'Sean Martinez', 'sold'),
  (2015438, 'after talking to our crew Anne elected to not cut the tree to bring in the concrete truck, we agree to split the cost of the concrete pumper costs <br>
<br>
Concrete Pumper $268 / 2 = $134 + admin fee $65   = $200<br>
Splitting concrete into 2 trucks = $300 + environmental feel $35 = $335   + Additional yard of concrete $78 with tax comes out to $454.30<br>
<br>
$454.30 + $200 =$654.30', NULL, '2018-11-05 11:33:25', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2015458, 'Add additional 43sqft synthetic lawn per owner request<br>
<br>
 ', NULL, '2018-11-02 17:14:56', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (2017022, 'change orders. 
14- 1gal. Succulents $280.
And 3 flats of chalk sticks $205.
Total $505.

', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (2018271, '26 LF. Fencing and Gate.<br>
<br>
2,530.00 and 200 credit', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2023704, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2023705, 'additional Allowance $1200 <br>
billed at the rate of $100hr<br>
Approx 8-12 Additional hours to make Fuel mod for whole property<br>
final bill will be charged against the allowance , not to exceed without approval', NULL, '2018-11-09 15:42:42', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2028153, 'no soil included, installing synthetic lawn raises the rear yard so the new synthetic lawn is "level" with the new pavers, planter areas may be a little low and may require additional soil or additional mulch <br>
<br>
a discount of $425 is applied only if the above work is approved', NULL, '2018-11-13 06:49:25', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (2028154, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (2031509, '80ft 3" drain line and inlets along side, of house. minor irrigation repair included<br>
see attached drawing', NULL, '2018-11-13 15:16:43', 1, '2018-11-13 09:19:31', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2031752, 'This change order removes drainage , main line and wire from original contract, <br>
We are only doing paver install  as of 11/13/2018 10:30am<br>
<br>
NEW PAYMENT SCHEDULE<br>
Deposit                               $1520<br>
Demo/Cleanup                   $2000<br>
Delivery of Pavers              $1255<br>
Balance upon completion  $1000<br>
<br>
Reduces original contract from ($7470) $7020 + $450 main line<br>
to ($6150) $5775 + $375 Hoa Design<br>
<br>
Owner is having others do Drain and main line work, owner agrees to have all trenching compacted, <br>
<br>
our paver crew is installing (3)  drain grates provided at $65 ea  ($195 total)<br>
, this includes cutting the pavers, cutting the pipe and setting them', NULL, '2018-11-13 13:37:52', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2033292, 'invoice from "Pool Engineering"<br>
see attached', NULL, NULL, 1, '2018-11-14 02:13:32', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2033762, NULL, NULL, NULL, 1, '2018-11-14 08:01:43', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2034128, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2034155, 'Putting in new gas line 31 linear feet', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2034530, 'Upgrade turf to 94 oz and green backfill', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2035863, 'remove existing small siding pieces on either side of window<br>
vichithane seal up all exposed flashing, and studs, <br>
install 1x12x16  tongue and groove siding<br>
painting not included', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2037976, 'half of design price', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2037982, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2038397, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2039250, 'pull up new synthetic grass where spa is to be located, excavate 4" depth, form and install steel reinforced concrete set 1" above lawn. regrade as necessary and reinstall lawn around hot tub pad, cleanup <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">7-1/2 x 7-1/2 concrete pad, verify with owner for spa
maybe only 3" depth for excavation, maybe 1/2 yard of soil
no base needed just pour pad</div></div>', NULL, '2018-11-20 07:52:46', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2040889, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2040896, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2041701, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2044001, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2045601, 'Putting in new copper main, 1" copper  additional 9 LF @ $56.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'pending'),
  (2045614, 'Upgrade from basic to Castle Cobble Distressed for 1,333 square feet X $1.80.', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2046086, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2048899, 'Upgrade gravel $950<br>
Install electrical conduit rough in.  Includes trenching and recompaction.  204 linear feet  $3,468<br>
Install Lamp Posts set in concrete bed  $360 <br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2049056, 'Jack up  patio cover beam 1/4"-1/2" with car jack and secure with temporary 4x4 post to hold up cover-beam.while work is performed<br>
saw cut concrete around post to install new approx 12wx24" depth footings, install simpson cbs4x4 anchors install brick around anchor to decorate and hide saw cuts, either flat or 1 brick in height as determined by installer, install post cap simposon EPC4Z "ON END" & PC44-16 on "CENTER" post.  Use high strength hight speed fast curing concrete available at home depot see picture attached. finish grout joint similar to existing work <br>
no panting <br>
 ', NULL, '2018-11-26 10:46:05', 1, '2018-11-26 09:17:06', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2052209, 'design deposit 50%<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">paid with chk #124</div></div>', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2052289, '5-hours total rough drawings and consultation time with city $500', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2052314, 'Not to exceed $4000 without further approval<br>
$100hr design Fee for permit technician drawings and time approx $800-1500 -<br>
<br>
approx $1000 for retaining wall engineering<br>
does not include soils testing if required<br>
approx $800-1500 in city permit fees<br>
will include rough layout to be approved by owner before moving forward to permit ready drawings for retaining wall<br>
will provide all receipts and final bill when complete<br>
 ', NULL, '2018-11-28 09:28:37', NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2054502, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'lost'),
  (2054747, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2054761, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2055078, 'concept design and meet with a engineer to get sample engineering that way we are not purchasing engineering to get s idea what the wall would entail to build that way i can get you s estimate. .   Either way full permit or just a design its yours to get other bids on..  $750 plus 1-2hours consulting..we would credit back half of the design fee if we get the job..basically $375<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">check #1095 and 1093
$500 city Consultation @$100hr
$750 design fee</div></div>', NULL, '2018-11-28 15:37:58', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2055452, 'program with existing system', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2057060, 'Create and submit designs that comply with code<br>
Record covenant with City/County<br>
City/County review and permit fees<br>
City/County Road Plan check fees', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2057062, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2059442, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2064145, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">12 x 3
56 x 3</div></div>', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2064518, '750 <br>
375 credit<br>
375 due', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2066895, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2072389, '100 additional in front yard', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2079502, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2084408, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2086269, 'Installation of 4 step lights at porch entry&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Sean Martinez', 'pending'),
  (2089424, '9 Vista Led Uplights Installed. $225/each (inc. wiring)<br>
<br>
1 Vista 200 W Transformer Installed $375<br>
<br>
Total  $2,400', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2092010, 'as of 12/20/18<br>
All Permit Technician Related activity at the rate of $100hr per contract ,<br>
drawings, meeting with engineers, permit running. meeting with city<br>
<br>
Permit Plan Drawing                          12.5hrs     $1250<br>
Meeting With engineers                    1.5hrs        $150<br>
Meeting With city and plan submittal  10hrs        $1000<br>
<br>
                                                                   Total  $2400<br>
<br>
as of 12/20 city all documents were scanned, and emailed to supervisor for further review of corrections or additions plan checker is requiring<br>
<br>
additional may be required <br>
 ', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2094469, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2094738, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2096125, '1600 sq feet of mulching installed @ 1.00 per sq foot&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2096759, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2097395, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2097512, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2097515, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2097517, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2097665, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2097694, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2097716, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2100822, 'Additional concrete pour at $15.00 a Square foot', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2100840, 'Additional soils removed average of 4"-8"<br>
Total contracted in soils removal $3,334.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2101181, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2101190, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2101209, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2101307, 'Cost for <br>
Pool review fees (building and safety)<br>
Soils review/stamp fees (engineering)<br>
Labor/time<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">For Permits;
Mo - 12 Hours
Ryan - 4 Hours

2000.00

Fees;
SGI - 400.00
Pool Review - 1310.70


C/O 3310.70 + 291.65 (gas)


Costs of Planning was already C/O''d

PERMIT 3,602.35</div></div>', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2102362, '94 sf', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2102451, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2102453, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2103317, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2103443, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2106127, 'Put in roughly 1600 sq feet of bender board.  <br>
Contract only called for 835.<br>
<br>
Not charging for overage.<br>
<br>
Additional 165 linear feet of bender board along front fencing.  Will charge for this. 8x $165 = $1320', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2107532, 'Had to remove and install new wood and pour a foundation for steps took an additional day&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Sean Martinez', 'sold'),
  (2108873, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2110364, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2110520, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2112396, 'Adding 29 linear feet of drainage. $725.00<br>adding labor for irrigation control. $100', NULL, NULL, 1, '2019-01-10 08:47:04', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (2112750, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2114597, 'see attached copy of work order<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">see attached copy of work order</div></div>', NULL, NULL, 1, '2019-01-11 09:11:44', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2115516, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2121185, 'deposit of design fee<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">office, did i turn this check in?

..i think i did . i don''t appear to have it...let me know and i may ask client for another check if it was misplaced</div></div>', NULL, NULL, 2, '2019-01-16 01:35:57', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2122711, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2127057, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2127176, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2127661, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2128673, '(2) Phoenix Precast planters in smooth brown<br>
Oblique style<br>
<br>
Due Upon Order<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">$1536</div></div>', NULL, '2019-04-24 22:43:05', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2128772, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2130125, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2130133, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2130297, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2132453, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2132591, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2133659, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2139360, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2141156, '1) Go down additional 24 inches on berm footing per city request.  $3000<br>
2) Remove tile section in corner and add 8 linear feet of addtional berm.  $2000<br>
3) Rebuild retaining walls in corner that were on tile pad.  $1500<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2143050, 'Client upgraded contract from stucco to stackstone.<br>
The cost per sq foot of stucco work is $5 per sq foot.<br>
The cost for stack stone work is $25 per sq foot flat plus $30 per linear edge including material.<br>
<br>
The difference  is $20 per sq foot.  We had 70 sq feet. $1400 plus 12 linear feet of edge. $360.  Total difference $1760<br>
 ', NULL, '2019-02-05 17:40:58', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2143092, 'Remove existing pergola due to wood rot.  Rebuild existing pergola.<br>
<br>
Contract price for pergolas was $12,500 including installing shade bars and new posts for existing.  Now must remove entire thing and rebuild including main beam and rafter beams.  Includes all new hardware.<br>
<br>
$2,450', NULL, '2019-02-05 17:43:58', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2143451, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2144067, '1) Drain pipe 13 LF X $25.00= $325.00<br>
2) Drain pipe from the center drain to the grass area 18LF X $25.00= $450.00<br>
3) Gas Line 15 LF X $25.00= $375.00<br>
4) Electrical 15 LF X $25.00= $375.00<br>
<br>
Total:  $1,525.00<br>
<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2144355, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2144714, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2150228, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2152896, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2152904, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2156492, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2156572, NULL, NULL, '2019-02-05 17:43:02', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2160103, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2160509, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2162382, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2165959, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2165963, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2166460, '420Sqft (2) hole putting green, per design,<br>
<br>
please approve asap so that we may credit 1-zone of irrigation and lawn  included in this change order, also excavation is not included, additional project soil to be filled in this area  and will become an additional cost to remove of putting green is not approved asap<br>
<br>
Thank you', '2019-02-13 00:00:00', '2019-02-13 14:09:14', 1, '2019-02-12 00:56:07', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2166463, '32" Lion BBQ Grill, Double Equipment Door, see attached<br>
 ', NULL, '2019-02-22 10:43:56', 1, '2019-02-12 01:27:09', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2166466, 'Extend Driveway with Belgard group 1 paver, 24-30" as requested by owner up to 160sqft, set on concrete, must be approved asap to be included at this price with other paver install <br>
Owner Responsible for HOA approvals<br>
 ', NULL, '2019-02-28 13:57:41', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2167256, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2171492, '8hrs  @ $100hr<br>
Permit Technician: Includes all Permit Drawing, Permit submittal time, Time with engineers, all time included preparing permits and Submittal <br>
 ', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2171497, 'All Walls, BBQ, Bench, Step Face, Pilasters, shall be Angelus Brand "Rustic Wall" in " Sand Stone Mocha color" in Custom "Non-Tumbled"<br>
This is a non-stock, non-returnable item<br>
Additional Charge : $1267<br>
<br>
Steps, Bench Top, bbq top, Wall Caps, Borders, Fireplace mante;l and chimney cap Shall Be Belgard Brand, Victorian Color<br>
Wall cap is beveled/radius  on one side only<br>
No Additional Charge<br>
<br>
Paver interiors, including walkways, patio shall be Angelus Brand, "Courtyard Stone-4 stone package style" in sand stone mocha color<br>
No Additional Charge', NULL, '2019-02-15 14:25:58', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2175378, '2x4=8 square feet @$15 a sq ft', NULL, NULL, NULL, NULL, NULL, 'Sean Martinez', 'sold'),
  (2175795, 'includes backyard design, 3D, HOA, and Fuel Mod<br>
$700 of $1400 total', NULL, NULL, 1, '2019-02-16 14:04:43', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2177058, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2177092, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'pending'),
  (2181295, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2181436, '$20  linear Foot 41 LF<br>
1/4" henry''s tar<br>
and attach adhesive tar membrane waterproofing', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2181448, '117 SF additional pavers X $11.50', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2184430, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">I approve. Thank you. </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Sent from my iPhone</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">On Feb 20, 2019, at 10:14 AM, Verva <<a href="mailto:verva@picturebuild.com" style="color: blue; text-decoration: underline">verva@picturebuild.com</a>> wrote:</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"> </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Hi Mark, Karen and Sam,</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Thank you for meeting with me yesterday.</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Please let me know what you think of the blends.</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">The one closest to Sam’s door in the Sand Stone Mocha, and farther is the Tuscan</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"> </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Lowering the 18 LF wall about 12”, saves 2 courses,</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Taking off $540.00</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"> </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Additional Planter at 16 linear feet straight, which is 18” beyond opening on both sides.</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">This allows a nice clean straight line and you still have 12” depth space for a planter.</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">I am calculating it at 15” high, which will double as a bench.</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">With footing</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">$1,280.00</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"> </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Price Difference is an additional $740.00</span></span><br>
THIS WAS APPROVED VIA EMAIL', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2189899, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">widen putting green area approx 1-1/2ft to 2ft         $1342
Raise wall approx 1ft and push back 1-1/2 to 2ft     $875
Extend BBQ x 1ft from 8ft-9ft                                   $460
Add light at step at entry to putting green                $220</div></div>', NULL, '2019-02-25 20:29:31', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2190096, 'Install 9 salvia leucantha (1 Gallon)<br>
out 26ft from existing drip<br>
see design attached for location <br>
<br>
"This is our minimum cost to send a crew out to service your project"', NULL, '2019-02-28 23:02:19', 1, '2019-02-25 18:15:16', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2191255, '(2) caps to cover up crawls space openings on rear and north side <br>
<br>
No Charge - per verbal Agreement made with Brian we will install step tile no charge in trade for rock digging footings<br>
 ', NULL, '2019-02-26 11:04:28', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2191840, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2192063, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2192410, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2194895, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b>Purdon Upgrade Scope Change</b></span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b>PAVERS: Cost: <s><span style="background: yellow">$9,240</span></s> <span style="background: lime">new cost $12,684  (+$3,444)</span></b></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Deliver and install new SUI Antique Yellow (Limestone) natural stone pavers in 4 piece pattern in rear yard with polymeric sand. (8x8, 8x16, 16x16, 16x24) <s><span style="background: yellow">550 sqft.</span></s>  <span style="background: lime">755 sqft</span></span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b>HARDSCAPE: Cost: <s><span style="background: yellow">$6,850</span></s> <span style="background: lime">new cost $4,800  (-$2,050)</span></b></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><s><span style="background: yellow">Form and pour natural grey concrete with lite broom finish in pool equipment area, includes #3 rebar 24” o.c. 205 sqft.</span></s></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Form and pour new wall cap (approx. 14” wide by 3” thick of concrete to match new coping color close possible.</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">40 linft. Includes approximately 2” cantilever past new Azek with slot for LED tape (see detail A), includes (2) #3 horizontal rebar length of cap.</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Form and pour new countertop on existing stucco’d base 3” thick of concrete to match new coping color close</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">possible. Apprximately 21 sqft. Includes approximately 2” cantilever past new Azek with slot for LED tape (see detail A), includes #3 rebar 18”-24” o.c.</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Form and pour small curb under RxR ties right side of yard. 5’ long.</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b><span style="background: lime">+$1,394 = Total upgrade cost to upgrade pool equipment concrete to Sui Antique Yellow limestone pavers.</span></b></span></span><br>
<br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><b>Also the extra cost to remove the extra concrete that we found in the equipment area is $300. Please reply back that this is approved.</b></span></span><br>
 ', NULL, NULL, NULL, NULL, NULL, 'Sean Martinez', 'sold'),
  (2194898, '<b>Also the extra cost to remove the extra concrete that we found in the equipment area is $300. Please reply back that this is approved.</b><br>
 ', NULL, '2019-02-27 15:59:52', NULL, NULL, NULL, 'Sean Martinez', 'sold'),
  (2195854, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Verva-</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Thanks so much for dropping off the samples.  Extremely helpful in making the decision.  We have decided to mulch the planting beds so we can go with the rock we really want (picture below)</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Mulch 1137 x 1.50 = 1705</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Mex Black Rock 180 x 15.00 = 2700</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Total = 4405 ($1477 over contract budget)</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Plus, the additional grass needed to fill out the lawn at $1500</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">I will send a separate email approving the final plants.  </span></span><br>
 ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2195864, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">44linear feet of new electrical $1,100.00 (electrical)</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"> repair and cancellation of 1 line $140.00</span></span><br>
<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Sean Martinez', 'pending'),
  (2195866, '<br>
water main line 31 linear feet  3/4inch copper line $1643', NULL, NULL, NULL, NULL, NULL, 'Sean Martinez', 'sold'),
  (2196221, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2196508, 'ADD<br>
Bellecrete  "Risers" to steps in sand finish <br>
also finish visible sides of raised patio ,<br>
<br>
see attached plan for locations to be installed<br>
<br>
All Bellecrete to be "Midnight" color<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">23 pcs 16"x24 , 1" thick</div></div>', NULL, '2019-02-28 11:10:46', 1, '2019-02-28 11:06:02', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2196518, 'Install 180ft&nbsp; 1-1/4 pvc&nbsp;main line from front to rear&nbsp;', NULL, '2019-02-28 11:13:33', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2196522, 'install 30ft  3/4" conduit from side to raised patio', NULL, '2019-02-28 11:13:00', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2196737, '147 SF additional pavers', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2197546, '1, String Lights: Add (2) 2x2 black steel posts 8-10ft in height as shown in lighting plan, with eye hooks at top, install eye hook on house and patio cover , install electrical to top of patio cover posts for outlet controlled by switch at bbq. install owner provided string lights  $1687<br>
<br>
2 Patio Cover Fan:  Add electrical from BBQ to top of posts so that patio cover company can complete connection and install owner provided outdoor rated fan and light. owner to pay patio cover company directly for fan install  $155<br>
<br>
3. Additional Vista,  Low Voltage lighting "Architectural Bronze" @ $220ea  <br>
    ADD (3) Cap lights    #4260<br>
            (1) Step Lights  #4242<br>
            (5) Path lights   #7210       total $1980<br>
<br>
4. low voltage BBQ light on switch installed in patio cover   # DL2236 Black $350<br>
<br>
this is additional to what has already been approved<br>
<br>
See attached lighting plan<br>
Total $4172<br>
<br>
 ', NULL, '2019-02-28 21:48:28', 1, '2019-02-28 17:45:55', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2199431, 'Demo entry and install 4ft wide walk, with pavers <br>
<br>
Raise gate as necessary<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Demo entry and install 4ft wide walk, with pavers 

Raise gate as necessary</div></div>', NULL, '2019-03-04 08:53:29', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2201517, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Add approx 80ft pavers

Owner responsible for all Hoa approvals including driveway extension</div></div>', NULL, '2019-03-04 11:54:51', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2204141, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">permit fee 391.14
4 hours</div></div>', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2209728, 'including the 14 LF of binder board and 8@  5 gallon plants<br>
difference $28.00<br>
Ballance previously $460.00<br>
-$320.00 and $112.00<br>
$280.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2210197, 'Owner has agreed to keep existing pilaster,&nbsp;', NULL, '2019-03-11 12:41:27', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2210200, 'Demo existing Driveway and remove soil as necessary 810Sqft      $2680<br>
<br>
Repair or Replace existing drain under driveway that is connected to rear drain system   $1217<br>
<br>
Install New pavers widening existing driveway by approx 3ft, install paver walkway to shed and to gate behind garage as shown on plan attached<br>
$6570<br>
<br>
See attached plan and also visit this link for the pavers proposed and colors available, <br>
<br>
https://www.belgard.com/products/pavers/catalina-grana<br>
<br>
We  recommend a paver with some red in it to blend in with the brickwork around the home <br>
<br>
colors recommend if available <br>
Autumn, Baja, Bella, Toscana   <br>
i can supply samples  just let me know<br>
<br>
Total $10,467<br>
<br>
<br>
 ', NULL, NULL, 1, '2019-03-07 22:54:04', 'Ryan Kleefisch', 'Ryan Kleefisch', 'pending'),
  (2210203, 'Demo Existing Fence as shown in plan  80ft   $1820<br>
<br>
Install new 5ft vinyl fence x80ft         $5270<br>
<br>
see attached example of vinyl fence proposed<br>
<br>
Total ', NULL, NULL, 1, '2019-03-07 23:05:42', 'Ryan Kleefisch', 'Ryan Kleefisch', 'pending'),
  (2212142, 'Up to 18 yards soil  disposal $130 per yard, , <br>
calculated at 2.25 yards each post x 8 = 18 yards', NULL, '2019-03-08 18:08:07', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (2214878, 'Upgrade all stone from MSI to Norstone Rockpanel "Charcoal" <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">our price is $9.75 6x24
corners $10.75 
Shipping $155  from southgate
norstone charcoal rockpanel
108pcs of corners
240sqft 6x24</div></div>', NULL, '2019-03-13 10:40:06', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2217625, 'Change order cost is Removal of 11 sumac 11x$20= $220.00<br>
Change order cost for replacement of 12 red flower grass to westranga 12x$40=$480.00<br>
dump fee $50.00<br>
Total $750.00', NULL, NULL, NULL, NULL, NULL, 'Sean Martinez', 'sold'),
  (2217650, '7 footings at approx $400 each @ $50hr allowance $3000<br>
soil disposal allowance $130yard $2000<br>
<br>
holes to be excavated at the rate of $50hr', NULL, '2019-03-14 22:45:31', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (2217711, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2220219, NULL, NULL, NULL, 1, '2019-03-13 17:06:46', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (2223703, '7 yards redwood brown much in all lower planter areas . No weed barrier inc<br>
2" thick', NULL, '2019-03-17 00:18:40', NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2224216, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2224411, 'this will be a credit if we are do the work', NULL, '2019-03-19 16:10:22', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2224618, 'see attached breakdown and lighting plan<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">see attached prior to placing order to check quantity 

http://www.lightdisty.com/sollos-igt049-ss-in-ground-led-mr16-stainless-steel-trim-ring-well-light-996134.html  
order  MR16NFL7/830/LED MR16 7 Watt GU5.3 3000k Narrow Beam

Wac lighting order through electrical wholesale distributors sylmar 818-367-1115  sales order 1939</div></div>', NULL, '2019-03-19 09:37:52', 1, '2019-03-15 18:52:31', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2228692, '<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><b><u>Total Budget/Allowance  $11750</u></b><br>
(2) 24” Box @ $350ea                   $350<br>
(35) 15Gal @ $150ea                     $5250<br>
(62) 5Gal @ $40ea                         $2480<br>
(63) 1Gal @ $20ea                         $1260<br>
(22) Flats @ $75ea                         $1650<br>
<b><u>Total Budget used                         $10,990</u></b><b> (remaining allowance  $760) </b><br>
<br>
<b><u>Plants Needed Additionally and order for Friday</u></b><br>
(1) 24”Chamerops palm                                                                            $350<br>
(2) 15Gal Prunus Laurocerasus @ $150ea                                            $300<br>
(2) 1Gal Agapanthus Peter Pan   @ $20ea                                            $40<br>
(10) Creeping Fig Vine @ $20ea                                                              $200<br>
(5) Flats Vinca Major “Alba”  @$75ea                                                   $375</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">(1) phoenix roebellini                                                                                   $150   </span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">(1) Phormium  “sunset” 5Gal                                                                      $40</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">(2) Kangaroo paw            RED        2ft variety   5Gal                                  $80</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">(6) Kangaroo Paw            Orange   3ft Variet     5Gal                                $240 </span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Move palm in pot to top hill per plan                                                         $65<br>
(1) Agave Attenuata     5 gal (Damaged/warranty)                                   NC</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"> (1) piece Sod  warranty (warranty)                                                             NC</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">(2) Bougainvillea Trailing “Groundcover   -RED (included)   15Gal       NC</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">                                                                                                         <b>Total     $1840</b><br>
<br>
<b><u>Additional planting requested cost above original allowance          $1080</u></b></span></span></span><br>
<br>
 ', NULL, '2019-03-26 11:09:15', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2228715, 'new irrigation connected to existing clock, existing clock needs a module to expand to additional valves needed<br>
<br>
 ', NULL, '2019-03-19 09:38:58', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2238333, '<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><b><u><span style="font-size: 14.0pt"><span style="line-height: 115%">Scope of Plant Change/Change Order</span></span></u></b></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Replace (3) 24”Box   Chamerops palms  with phoenix reobelini palms </span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Replace (2) King palms with (12ft Multi trunk 24” Box Palms </span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Add (3) 1 gallon Boston ivy          </span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Upgrade (2) Citrus from 15Gallon to 24” Box size ($200)</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">ADD (8) 15 Gallon Pitosporum Silver Sheen ($100ea   - $800)</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Add (23) 1 gallon lambs ear  ($95 Value – no charge)</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Remove (3) 5 gallon Liriope Gigantea (-$120)</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Replace (7) 5 gallon Roses with (5) <span style="font-size: 11.5pt"><span style="background: white"><span style="line-height: 115%"><span arial="" style="font-family: ">Rhaphiolipsis Ballerina</span></span></span></span> (-$40)</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><b><u>Additional planting        Price $840</u><br>
<br>
plus (1)  Additional 15 Gallon  Citrus Lime $150<br>
<br>
see attached plan, <br>
some plant locations of the plants will be adjusted by Ryan<br>
<br>
<u>Total $990</u></b></span></span></span><br>
 ', NULL, '2019-03-25 08:54:02', 1, '2019-03-25 08:28:13', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2238378, 'Per plan<br>
(4) 24"  Box  @ $350ea                  $1400<br>
(2) 15 Gallon citrus @ $200ea       $400<br>
(5) 15 Gallo shrub @ $150ea`       $750<br>
(54) 5 Gallon @ $40ea                  $2160<br>
(40)   1 Gallon @ $20ea                $800<br>
Total $5510<br>
<br>
original contract allowance $3552<br>
<br>
Total Change order  upgrade $1902', NULL, '2019-03-26 20:50:54', 1, '2019-03-25 08:40:52', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2238978, 'Additional 25 sf @ $16 = $400.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2239224, NULL, NULL, NULL, 1, '2019-03-25 12:21:06', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (2241208, 'by owner request change from 24" proposed fringe to 16" reducing the design by by 8" closer to the walls and house, as its wavy next to the house<br>
<br>
No charge<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">please see comments</div></div>', NULL, '2019-03-26 10:29:43', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2243901, 'upgrade from 6ft&nbsp;king palms to approx 12ft&nbsp;multi king palms', NULL, '2019-03-27 10:14:30', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2245150, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2246664, NULL, NULL, '2019-03-28 11:12:37', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2246809, 'No charge', NULL, '2019-03-28 12:44:46', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2246827, 'Set 2 grana slab victorian stones over concrete to secure', NULL, '2019-03-28 14:23:49', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2246855, 'Raise air conditioning units no charge

No warranty included 
Slight possibility of damage to plumbing may occur
Owner responsible for any damage

If not approved . Owner responsible to hire an AC expert at additional cost', NULL, '2019-03-28 13:40:22', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2247271, 'Original contract was to tie into existing clock<br><br>Existing clock is not adequate and is only 6 station<br><br>We need an additional 7th station<br><br>upgrade the clock to 8 station clock at cost<br><br>$150', NULL, '2019-03-28 14:10:04', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2249463, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2249467, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2249471, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2249477, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2251151, '(4) additional Vista LED gr2216 black up lights  $220 each<br>
see attached plan<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">(4) additionalVista LED gr2216 black up lights per
see attached plan</div></div>', NULL, '2019-04-01 10:10:01', 1, '2019-04-01 09:25:31', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2260458, 'Extend drain line to front sidewalk with pop-up at end<br>
add 4 yards soil to level out area to le', NULL, '2019-04-08 14:54:10', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2260462, 'Left Of Fireplace<br>
(2) 15 Gallon Pitosporum Silver sheen $200ea = $400<br>
(3) 5 Gallon Rhaphiolipsis ballerina ($40ea  = $120<br>
move 3 shrubs  $65<br>
Delivery fee $125<br>
$710<br>
<br>
String lights with owner provided cable, using crimp tools to secure<br>
includes additional time/labor <br>
$97<br>
<br>
 ', NULL, '2019-04-15 09:21:00', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (2261084, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2261088, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2261354, 'Vista 4260M-SS  (brushed) <br>
<br>
owner to pickup light , unless we are already at warehouse<br>
will notify when available for pickup<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">make sure they order BRUSHED STAINLESS STEEL</div></div>', NULL, '2019-04-05 12:48:51', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2261912, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'pending'),
  (2261915, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">556
-340</div></div>', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2264323, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2264363, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2265310, '1. saw cut drainage swale, <br>
2. install 10x10 drain box and grate<br>
3. install plumbing to lower area to collect rain water into barrel<br>
4. install hose bid to allow use of rain water captured from barrel<br>
<br>
$1800 installation cost +<br>
$300 allowance for barrel <br>
<br>
 ', NULL, '2019-10-24 10:11:57', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (2266558, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2266772, 'Demo the existing 6 post wraps<br>
<br>
reinstall with new design  (install them bigger with bullnose on cap)', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'pending'),
  (2266824, 'Change order for new concrete driveway is $6,986.25. This cost does not include any permits or city fees that may be required. This is a total 517.5 sqft. this includes the 3 different areas. 280.5 (driveway) 192 (approach) 45 (sidewalk)', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'pending'),
  (2266826, '1-saw cut damaged area.<br>
2- grade area<br>
3- add pins to driveway to reinforce concrete pad<br>
4- Pour concrete to match (Cannot guarantee exact match) Exact match needs entire area demo and redone. ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'pending'),
  (2267954, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2267957, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2268706, 'WAC 4011-30SS Step Light for Steps $220 x2', NULL, '2019-04-10 07:59:03', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2270432, 'Removal and re installing of 12 sq ft of pavers&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Sean Martinez', 'sold'),
  (2270561, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2270860, 'This price is  additional costs above the original tile price associated with upgrading the standard 6x6 group 1 tile to oceanside glass tile<br>
<br>
1. Includes the additional installation labor necessary to complete<br>
2. installed to Oceanside Tile specifications and materials, <br>
3. includes the upgraded materials for installation<br>
4. Muse Blend,Moroccan Desert,  size- 7/8x7/8 <br>
5. epoxy gray grout - owner to select<br>
<br>
Step tile  - no charge per Brian (trade for footing rock excavation)<br>
<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">order 60Sqft Oceanside Tile Muse Blend Moroccan Desert
contact Sarah to order
Sarah Eamigh
Architectural + Design Sales Executive
Western Region
C: 760.405.7650

visit these links to order the correct install materials  - carlos can advise on quantity of materials needed
http://www.glasstile.com/tile-installation-pdfs/
http://www.glasstile.com/tile-installation-videos/</div></div>', NULL, '2019-04-11 08:16:09', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2274444, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2276368, 'Bender board amount 209 with discount becuase of Verva aclulation mistake', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2276379, 'additional planats', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2283779, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2283805, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2284708, 'the glass Bifold door is $715 plus installation/Delivery 2 hours time <br>
total door cost $845<br>
<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">42LBFOD-BS Outdoor bi-fold door w/ frame & hoods, Brushed stainless 
order from fireside experts</div></div>', NULL, '2019-04-24 09:40:01', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (2284909, '<span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><b><span style="font-size: 12.0pt"><span new="" roman="" style="font-family: " times="">Rabbit Fencing</span></span></b></span></span></span>
<ol>
	<li style="margin-bottom: .0001pt; margin: 0in 0in 0.0001pt 0.5in"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span new="" roman="" style="font-family: " times="">Install ½”x2ft rabbit fencing </span></span></span></span></span></li>
	<li style="margin-bottom: .0001pt; margin: 0in 0in 0.0001pt 0.5in"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span new="" roman="" style="font-family: " times="">Wire to existing ornamental iron fence</span></span></span></span></span></li>
	<li style="margin-bottom: .0001pt; margin: 0in 0in 10pt 0.5in"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span new="" roman="" style="font-family: " times="">Approx. 75lf</span></span></span></span></span></li>
	<li style="margin-bottom: .0001pt; margin: 0in 0in 10pt 0.5in"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span new="" roman="" style="font-family: " times="">dig down approx 6" depth</span></span></span></span></span></li>
</ol>
<br>
<br>
 ', NULL, '2019-04-19 09:55:42', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2284966, 'Front Yard<br>
clean up 1200sqft of weeds, trim and remove succulents as needed to improve curb appeal  -  2 men half day $650<br>
<br>
install 1" of mulch  (4 yards)  $600  ', NULL, '2019-04-19 09:54:23', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (2286128, 'This change order includes all change orders and contract amount. + processing fee.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2286635, 'upgrade the brass drain grates to "pour a Grate"  gray  (3) @ $25ea = $75<br>
<br>
Upgrade standard white skimmer and auto fill lids to "pour a lids" Gray (2) @ $60ea = $120<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Ryan will pick these up for the crew to install prior to pouring concrete</div></div>', NULL, '2019-04-19 07:56:26', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2291966, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2292035, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2292083, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2294775, 'Recording fees for apron permit', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2294952, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2295508, 'Area measured with Victor<br>
486 SF<br>
X $10.75<br>
$5,225.00<br>
No demo, bobcat access for base, and easy access<br>
Price approved by Brian', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2295580, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2295584, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2296567, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2299843, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2302288, 'dig 16x16x1ft concrete pads 4-corners <br>
includes concrete ', NULL, '2019-04-29 15:47:09', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2302293, 'additional 20ft trenching and drainage plumbing tieing in downspouts', NULL, '2019-04-29 15:44:39', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2307199, NULL, NULL, '2019-05-03 14:42:59', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2308016, '1) Reduce Demo by for not doing iron fencing demo                    - $250<br>
2) Driveway paver reduction  by widening planter less paver.       - $264<br>
3) Paver entry reduction                                                                 - $1,368<br>
4) Paver parkway reduction                                                            - $288<br>
5) Remove block wall                                                                      - $2,640<br>
6) Decorative retaining wall reduction                                             - $4,560<br>
7) Lighting Add on                                                                          + $500<br>
8) Step reduction                                                                             - $200<br>
9) Reduction of mailbox install to just footing                                  - $490<br>
10) Drainage error on early change order                                       - $180<br>
<br>
-9,740.00<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2308243, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2309903, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2309952, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2310806, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2311502, NULL, NULL, '2019-05-03 14:42:10', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2311512, '<p>Please approve this to confirm your selections<br>
<br>
Coping - Bellecrete ..Color-Kahlua<br>
<br>
Stone - MSI...Color-Canyon Creek .. LPNLQCANCRE624<br>
<br>
Plaster - StoneScapes ..Color-Aqua White (Mini)  <br>
<br>
Tile - To Be Detrermined<br>
Concrete Stain  - To Be Verified Tan</p>
<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">concrete stain is Arizona Tan FX nano available at prime building materials  B#180312  gallons needed tbd by crew and sqft</div></div>', NULL, '2019-05-03 14:41:19', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2311523, 'Remove from contract -  We will not do<br>
<br>
We will still evaluate the front pavers and reset any pavers with settlement  under warranty conditions<br>
<br>
since this was part of the Package Deal we made at the table  "package price"  full price credit cannot be given <br>
<br>
This is the maximum credit from the total contract price<br>
<br>
Credit $1770<br>
<br>
<br>
 ', NULL, '2019-05-03 14:39:54', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2311595, 'This is for added fencing for side gates and under house. Plus switching from wood to iron railing.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2311611, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2313004, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2313035, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">8 in revised contract, plus this one, 9 total</div></div>', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2313274, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2318049, '100sqft at $10sqft = $1000', NULL, '2019-05-07 11:59:49', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2320874, 'using stone on hand, <br>
chip off hi spots from existing stonework.<br>
brown coat/flatten with mortar to prepare for new stone overlay<br>
overlay stone over existing, and over concrete cap sides, no stone on top of existing concrete cap<br>
no cap to be installed or showing from sides<br>
<br>
does not include any repair of the rood , flashing or sealing if and or necessary<br>
we will notify you if we visually see a issue<br>
<br>
thank you Rafi for being a great customer <br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">please use caution and be tied to the roof  
Do not work on the roof without being tied down</div></div>', NULL, '2019-05-08 11:49:51', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2322092, NULL, NULL, '2019-05-09 10:08:54', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2323204, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2325444, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2326260, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2326387, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2326428, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2326443, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2326477, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2326760, NULL, NULL, '2019-05-11 16:19:42', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2329306, 'no longer being done by us<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">30x30 X1FT DEEP</div></div>', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2329658, '<span style="font-size: 11.0pt"><span style="background: yellow"><span calibri="" style="font-family: ">Demo and remove blocks in a V shape leaving the bottom block. Reconstruct blocks and dowel in rebar as needed. Reattach brick cap.</span></span></span>', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2330921, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2334236, '(3) 24" Box Trees<br>
<br>
(1) in front yard<br>
(2) in rear yard<br>
<br>
location and type to be determined', NULL, '2019-05-15 12:31:12', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2334411, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2337491, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2337754, 'Replace main water line to meter.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2338699, '~10'' 4x4. wants at least 8'' exposed. <br>
<br>
edited from 2 psots to 4 by mo @ 275 ea', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2339570, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2340153, 'See attached color swatches  for shef
White trim
Campagne base 
Roof shingle  color as shown ', NULL, '2019-05-19 11:53:19', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2341466, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2342925, '<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">1. Excavate front yard necessary to complete the following $2980</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">2. Irrigation, 1 Drip Zone , 1 Spray zone Lawn                $1700</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">3. Form and install concrete per plan in modern design $4200</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">               -Top Cast #3 “Acid finish”</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">               -Natural Gray concrete</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">               -Includes, 14” Driveway strips on side of driveway,</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">-side gate walk and front entry pads</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">4. Valley RTF Sod  300sqft            $1600</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">5. Planting</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">(1) 36” Box Palo Verde - tree       $1375</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"> (13) 5Gallon plants                        $520</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">(26) 1Gallon plants                         $520</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">6.  ¾” Crushed gravel  450sqft                    $1387</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">7. ¾” Mexican Pebble as shown in design $467</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">7. Lighting $1980</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">               (2) well lights</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">               (4) up lights</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">               (3) step lights – in steps</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">               Tie into rear yard transformer</span></span></span><br>
<br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Total $16,729</span></span></span><br>
<br>
 ', NULL, '2019-06-13 23:35:29', 2, '2019-05-20 22:09:41', 'Ryan Kleefisch', 'Ryan Kleefisch', 'pending'),
  (2346702, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2346707, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2346721, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2347903, 'This is to drop grade even lower for front grade by owner request.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2347921, 'Added drainage.<br>
<br>
125 hillside drainage. SDR 35.<br>
80 linear feet of backyard drainage. SDR 35<br>
60 linear feet of sideyard drainage. SDR 35<br>
40 linear feet of drainage in front SDR 35<br>
Strip drains for front garage.  18 linear feet.<br>
<br>
Catch basins in back yard.<br>
Drains for side yard. <br>
<br>
Total $5900', NULL, '2019-05-22 15:58:29', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2351973, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2352513, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2352531, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2352865, 'Please contact me regarding the demo change email I received Sat. 6/25.

Marcia Mahony<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Ryan, Saw your Mahony change order re rototilling, preemergent instead of Roundup. This decision came from Brian in order to plan calendar. Please take note of Sean''s Friday Daily Log.</div></div>', NULL, NULL, NULL, NULL, NULL, 'Marcia Mahony', 'pending'),
  (2356406, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2356422, '1) Install new main line 1" copper.  Buried 2 feet due to grade. back fill trenches and recompact.<br>
2) Install separate 1" PVC main line to side planter and to backyard for bibs and irrigation.<br>
3) Install new pressure regulator.<br>
4) Install 2 new ball valves for water lines<br>
5) Install new backflow sever prevention and clean out.<br>
6) Install new earthquake gas valve.<br>
7) Move all pool equipment lines. <br>
<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2358986, '16x30 Foundation per County Requirement for shed , see example attached<br>
<br>
includes 10x14 concrete Pad for patio cover<br>
<br>
includes 3% CC fee. <br>
 
<table>
	<tbody>
		<tr>
			<td cobalance="" text:="">$12,784.00 </td>
		</tr>
	</tbody>
</table>
<br>
<br>
7100 on CC<br>
5000 on CC<br>
<br>
12100 x .03 = 363 CC fees<br>
<br>
<br>
<br>
684 + 363 = 1047.00 by check', NULL, '2019-05-29 14:50:27', 1, '2019-05-29 14:39:31', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2361398, 'Electrical run to feature. <br>
<br>
90 feet plus plug. $20 per foot.  <br>
<br>
Total $1800', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2364061, 'This is the Corrected Change order<br>
This Change order supersedes previous orders , this one has been corrected to make clear of all changes<br>
See attached<br>
<br>
Amount : $(155,982.00)<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Change order amount : $155,982.00</div></div>', NULL, '2019-06-03 07:45:36', 2, '2019-06-02 23:32:26', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2364270, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2364271, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2364272, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2364274, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2364969, 'Square foot calculation was incorrect of contract, contract  says 100Sqft, need 300Sqft total<br>
<br>
Additional 200sqft   $1875<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Ryan created this change order, i hope the owner approved it verbally? looks like george approved it manually??</div></div>', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2365767, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2367660, 'Upgrade tile to Universal Tile&nbsp; CB661 Marine 6x6&nbsp;and 1x1 for step tile<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">order from  universal tile  818-700-1666
18418 Bryant St, Northridge Ca</div></div>', NULL, '2019-06-04 17:07:34', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2370042, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2370049, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2370283, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2370417, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2370419, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2371581, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2371838, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2372361, 'the following items are to be repaired or installed<br>
1. at column against house , remove wood approx 16"height..same height as bottom of window, stone this column at house<br>
2. install waterproofing where needed at wood exposed areas and fix lath and browncoat in order to be able to install new stone<br>
<br>
 ', NULL, '2019-06-17 15:15:52', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2372413, 'See Daily Log', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2375573, NULL, NULL, '2019-06-07 09:27:18', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2375827, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2376040, '<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><b>REMOVED ITEMS   - </b>$68,973</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">These Items shall be removed from the Original contract</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">1. Raised Planter                                                           $9680</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">2. Fireplace & Bench                                                    $17,987</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">3. Precast Planter Bowls (from 4 to 2)                      $1660</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">4. Pool Auto cover                                                        $15,586</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">5. Synthetic Lawn                                                        $14,200</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">6., Raised Patio w Steps                                              $9680</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">                      </span></span></span><br>
<br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><b>NEW ITEMS - $38,037</b></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">These items are additional to the contract</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><b><u>Sunken Fire Pit Area 16''x16''-16” Depth</u></b>     Price $29,300</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">               1. Excavate 30 yards soil for sunken fire pit area               </span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">               2. All poured in place acid finish #3                         </span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">               3. 8” Deep Steps (2) sets as per plan</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">               4. 16ft bench with backrest                                       </span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">               5. Concrete floor</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">               6. 110V Sump Pump connected into drain system</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">               7. 20ft 1” Poly Gas line  </span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">               8. 48” Wok Style Fire Bowl W/Lave rock fill, with Mexican pebble around base,</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">               9. (14) low voltage step lights on separate switch<br>
<br>
<strong>Lawn/Sod 1850Sqft </strong>   Price $8737<br>
                1, (2) zones Irrigation pop-ups or Rotors  <br>
                2. Amend soil and grade<br>
                3. Install Valley RTF Sod </span></span></span><br>
<br>
<br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Original Contract  $193.389</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">With items Removed -$68,973 = $124,416</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">New total Contract ADD $29,300 + $124,416 = $162,453 -      Reduces the original contract by $30,936</span></span></span><br>
<br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Total Contract $167,616 + Any Additional approved change orders and permit costs</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><b>NEW PAYMENT SCHEDULE</b></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Deposit                                                            $1000 - Paid</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Yard Grading & Demo                                   $10,000</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Pool Excavation                                              $20,000</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Rough Underground – Landscape              $10,000</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Rough Plumbing – Pool                                $15,000</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Pool & BBQ Equipment Delivered              $20,000</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Pool Steel                                                        $20,000</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Gunite                                                              $20,000</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Concrete Work 50%                                      $10,000</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Concrete Work 100%                                    $10,000</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Planting Installed                                           $10,000</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Pool Plaster ( pre-plaster walkthrough)     $5000</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Low Voltage Lighting installed                     $5000</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">All work Complete                                         $6453</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Upon Billing of all permit costs and fees</span></span></span><br>
<br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><b>OWNER RESPONSIBILITIES </b></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">1. Watering pool Gunite for 5 days after install</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">2. “Start up” operation using a pool care professional</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">3. Brushing pool 2-3x daily for 5 days to keep plaster dust suspended and to polish plaster surface</span></span></span><br>
 ', NULL, '2019-07-16 16:29:40', NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2376049, 'See attached and approve , this also shows the locations of the 24" box trees', NULL, '2019-06-07 03:50:31', 1, '2019-06-07 01:44:23', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2376204, 'Additional 29 LF of CMU retaining wall with 24" with cap exposed average. 29 of of additional drainage. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'pending'),
  (2377347, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2377373, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'pending'),
  (2377908, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2379319, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2380127, 'Add 150 sq feet more.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2380352, 'This is a previous client that we are adding work to for this job.&nbsp;', NULL, NULL, 1, '2019-06-10 12:27:32', 'Brian Godley', 'Brian Godley', 'pending'),
  (2381194, 'from 34 total lights to 26 lights <br>
8 lights  @$220ea = $1760<br>
<br>
 ', NULL, '2019-06-11 09:57:05', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2381207, 'Design and install Dirt Bike track for kids 6-12<br>
<br>
<strong><u>INCLUDES:</u></strong><br>
Earthwork /Tractor work <br>
 Design Layout / Design work $500Value<br>
120  1-1/2" main line to hose bib to water track<br>
100ft-1" Quality rubber hose hose and large fire hose type nozzle<br>
<br>
<u><strong>NOT INCLUDED:</strong></u><br>
Hay Bails, Barriers, fencing.<br>
imported soil<br>
<br>
Payment Schedule<br>
$5000 upon completion of main line<br>
$5587   When track complete<br>
<br>
see attached location of track, size area and hose bib location<br>
<br>
<br>
 ', NULL, '2019-06-12 11:10:24', 1, '2019-06-12 11:04:02', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2381245, '1. install owner provided 2500Gallon water tank with auto shut top off valve at left side of Shed<br>
Available here <a href="https://www.ntotank.com/2500gallon-norwesco-green-vertical-water-tank-x2969324">https://www.ntotank.com/2500gallon-norwesco-green-vertical-water-tank-x2969324</a><br>
2. install 1" pvc main line from home irrigation main line to Tank to top-off water tank feed <br>
3. install owner provided pump<br>
available here   <a href="https://powerequipment.honda.com/pumps/models/wb20">https://powerequipment.honda.com/pumps/models/wb20</a>  <br>
4. install 200ft of 2" pvc main line  to (2) fire hose bibs  <br>
5. install (2) 1-1/2 x50ft fire hoses and (2) nozzles with shut off valves <br>
$6780+ tank and pump<br>
<br>
See attached location of tankk, and hose water hoses<br>
<br>
Upgrade to Electric pump see additional change order', NULL, '2019-06-12 10:05:43', 1, '2019-06-10 18:11:55', 'Ryan Kleefisch', 'Ryan Kleefisch', 'lost'),
  (2381252, 'Electrical pump option so that you can just flip a switch to turn on pump to water track<br>
<br>
1. Install electrical from right of shed to left of shed where pump and tank will be <br>
2. install Electrical disconnect.<br>
3. install 4x4 concrete pad for pump<br>
4. install 5hp 220V Waterpump <br>
<br>
$4532', NULL, '2019-06-12 10:07:11', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (2381293, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2381300, 'Permit Technician at the rate of $120hr includes all further drawings necessary for site plan and requirements by city.  time permit running at city  or with engineers. <br>
<br>
+ Soils Reports costs/fees<br>
+ Structural Engineering<br>
+ City permit Costs, fees, permit application will go forward once job costs are approved by owner<br>
<br>
Not to exceed $5000 without further approval, <br>
Additional approval will be estimated if required in an additional change order<br>
<br>
Due upon invoiced for expenses  incurred <br>
 <!-- begin_ammend --> <br>
Survey Costs $2800<br>
Picture Build Technician costs 6hrs, @ $120hr = $720<br>
<br>
<br>
Total to be deducted from Deposit $3520<br>
 <br>
 <!-- end_ammend -->', NULL, '2019-06-11 08:25:56', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2382315, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2383006, '1) Install brick capping for side wall for complete look. $875<br>
2) Upgrade back paver to Paseo.  $4,325<br>
3) Paver Install in back increased to 1882 sq feet. Larger than original layout and contract.  - $1,650<br>
4) Polysand requirement for Paseo paver.  - $2445<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2388234, 'Please see under contracts for details  <br>
This includes:<br>
171 of pavers @ $16.25 SF<br>
$185.00 delivery charge', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2389383, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2389389, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2390329, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2390365, 'install of 4 5gal plants checking drip and irrigation spreading 4 wheels barrows of mulch', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'pending'),
  (2390589, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2391669, '15 uplights × $25 = $375 for uplight upgrade', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2393244, 'from Vista Brand Lights to BSO lighting brand <br>
Add 1-addtional Uplight<br>
Add 1-Transformer<br>
<br>
the following will be installed<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">10x         2216-BSO uplight</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">2x           5105- BSO Flood</span></span><br>
<span style="font-size: 11.0pt"><span style="font-family: " calibri",="" "sans-serif""="">15x         5014i – BSO Small uplight</span></span><br>
 ', NULL, '2019-06-17 15:16:13', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2393938, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2393944, 'Wall cap is $18.75 per linear foot installed.  Total ln feet was 203. <br>
<br>
18.75 x 203 = $3,806', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2394185, 'upgrade (3) 24" box trees (9-10ft)  <br>
to 36" Box trees 11-12feet high', NULL, '2019-06-17 14:44:38', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2394369, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2395233, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2397206, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2398358, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2398389, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2399417, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2399977, 'original contract 6640 square feet sod<br>
<br>
Additional 1860sqft to complete  8500sqft total    (measured 3x onsite to confirm and by Ryan Personally-onsite)<br>
<br>
Difference in cost $3575', NULL, '2019-06-19 17:31:05', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2404192, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2404196, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2404501, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2406865, 'Upon the request of the owner<br>
<br>
Seal coping and stonework, <br>
using all purpose sealer, this will darken the stone and coping work,<br>
a test sample will be provided upon written request<br>
<br>
Material only, Picture Build will provide labor at no cost<br>
<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">this was not included verbally or included in the contract</div></div>', NULL, '2019-06-27 10:20:00', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2410224, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2410321, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2410664, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2410665, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2411520, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2411815, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2415694, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2417985, '1. Install 96 Hay Bales<br>
2. Hay Bale Covers<br>
    (66) white<br>
    (27) Colored W/Logo (see attached)<br>
3. (600ft) Checker Flag flag tape as shown on plan<br>
4. (56) Acerbis Track Markers<br>
<br>
<br>
see attached design and proposal<br>
<br>
Original amount $5,987.00 + 3% CC fee. 6166.61<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Hay Bales (Hemme Hay feed, lancaster - Robert 661-942-7880 96pcs @ $6.95 plus 20 Delivery   - Deliver as close as possible or around the track)

Penants (order 6) https://www.doolins.com/product/black-white-checker-100ft-pennant-strings/?gclid=CjwKCAjw9dboBRBUEiwA7VrrzW6L5VjUm7Z4r5O28l6WyWoRZ2jknItYV5h-wiUTru6Ol89G4WbzohoCWagQAvD_BwE 

(1) acerbis  track markers - includes 56pcs
https://www.amazon.com</div></div>', NULL, '2019-06-28 18:04:25', 1, '2019-06-28 17:52:23', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2418126, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2419480, '(19) Vista 4260mm-ss led wall lights  (brushed finish)<br>
<br>
installed all epe covered walls', NULL, '2019-07-01 09:11:08', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2419953, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2419956, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2423413, NULL, NULL, '2019-07-02 16:10:52', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2424432, 'NO CHARGE<br>
original measurement by Rick Hames, corrected by Jorge Flores<br>
<br>
approx 20 lnft measured<br>
20 lnft at 21.00 total of $420<br>
<br>
<br>
CHARGE :<br>
Material for lights allocation on contract ~500<br>
Material costs $783.85<br>
<br>
Difference : $283.85', NULL, NULL, NULL, NULL, NULL, 'Rick Hames', 'sold'),
  (2425358, '&nbsp;IPE along interior side and red wood on neighbor&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2425361, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2426910, NULL, NULL, NULL, 1, '2019-07-05 06:19:18', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (2429144, '801 Square Feet front and back', NULL, NULL, 1, '2019-07-08 08:21:34', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (2429160, '238 Square Feet', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2429181, '12 LF X $50.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2429196, 'Wall cap turned vertical for planter border', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2429213, 'In the email approved change order I listed the incinerator at $400.00, it was inputted at $480.00&nbsp; so the balance is $372.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2429224, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2429346, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Email on 7/6/19 approving pour-a-lids

Hi David,

Yes, please proceed. 

Thanks,
Emily

On Sat, Jul 6, 2019 at 11:39 AM David Bender  wrote:
Hi Emily
The upgrade cost for pour-a-lids are $100 per lid.
6 lids will be $600.
Please reply back with an approval.</div></div>', NULL, NULL, NULL, NULL, NULL, 'David Bender', 'sold'),
  (2429543, NULL, NULL, NULL, NULL, NULL, NULL, 'Rick Hames', 'pending'),
  (2429876, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2429878, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2429997, NULL, NULL, NULL, NULL, NULL, NULL, 'Rick Hames', 'pending'),
  (2430502, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2430508, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2430526, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2430533, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2430538, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2430563, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2430565, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2430580, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2430583, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2430588, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2430591, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2430603, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2430607, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2430618, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2430634, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2430639, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2430711, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2432297, '<span style="font-size: 12pt"><span new="" roman="" style="font-family: " times=""><b><span style="font-size: 14.0pt">Artificial Turf</span></b></span></span><br>
 
<ol>
	<li style="margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span><span new="" roman="" style="font-family: " times="">Sod cut existing grass.</span></span></span></li>
	<li style="margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span><span new="" roman="" style="font-family: " times="">Cap all lawn irrigation</span></span></span></li>
	<li style="margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span><span new="" roman="" style="font-family: " times="">Remove soils down to 3 inches below grade</span></span></span></li>
	<li style="margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span><span new="" roman="" style="font-family: " times="">Install 2 inch base layer and compact</span></span></span></li>
	<li style="margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span><span new="" roman="" style="font-family: " times="">Install 1 inch DG layer</span></span></span></li>
	<li style="margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span style="color: black"><span><span new="" roman="" style="font-family: " times="">Install Turf.  Simple Turf - Pet Turf -Emerald Green 50 oz. Pile Height 1 1/8” According to previous Sod install = 460 sq. ft. </span></span></span></span></li>
</ol>
<br>
<span style="font-size: 12pt"><span new="" roman="" style="font-family: " times="">COST $4900 </span></span><br>
<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2432300, '<span style="font-size: 12pt"><span new="" roman="" style="font-family: " times=""><b><span style="font-size: 14.0pt">Gravel Bed</span></b></span></span><br>
 
<ol>
	<li style="margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span><span new="" roman="" style="font-family: " times="">Install new weed barrier sections</span></span></span></li>
	<li style="margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span><span new="" roman="" style="font-family: " times="">Install another yard of Del Rio gravel to increase gravel layer</span></span></span></li>
</ol>
', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2432303, '<span style="font-size: 12pt"><span new="" roman="" style="font-family: " times=""><b><span style="font-size: 14.0pt">Planting/Lawn</span></b></span></span><br>
 
<ol>
	<li style="margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span style="color: black"><span><span new="" roman="" style="font-family: " times="">Install new Tree Selection: 24” box Ojai Tangerine. Client OK to Substitute Dwarf Myer Lemon. All citrus tree sales are final.</span></span></span></span></li>
	<li style="margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span style="color: black"><span><span new="" roman="" style="font-family: " times="">Amend soil with Palm, Cacti, Citrus Soil before planting citrus.</span></span></span></span></li>
	<li style="margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span style="color: black"><span><span new="" roman="" style="font-family: " times="">Install replacement podocarpus (no charge)</span></span></span></span></li>
	<li style="margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span style="color: black"><span><span new="" roman="" style="font-family: " times="">Install one (1) Rhododendron Azalea Hybrid ‘George Tabor’ one (1) – 15 Gal</span></span></span></span></li>
	<li style="margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span style="color: black"><span><span new="" roman="" style="font-family: " times="">Remove all current Ophiopogon ‘Nigrescens’ (black grass tufts) and replace with ten (10) additional Ophiopogon japonicus (dark green leaves) </span></span></span></span></li>
	<li style="margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span style="color: black"><span><span new="" roman="" style="font-family: " times="">Transplant one (1) Coprosma repens plant in front of pool equipment planting area (first one in front) to lower turf area in between other Coprosma where there is a gap.</span></span></span></span></li>
	<li style="margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span style="color: black"><span><span new="" roman="" style="font-family: " times="">Install one (1) new Coprosma repens Dwarf in front of pool equipment planting area. Marybeth to match variegated dwarf plant.</span></span></span></span></li>
	<li style="margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span style="color: black"><span><span new="" roman="" style="font-family: " times="">Adjust irrigation</span></span></span></span></li>
	<li style="margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span><span new="" roman="" style="font-family: " times="">Add fertilizer for shrubs</span></span></span></li>
</ol>
', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2432305, '<span style="font-size: 12pt"><span new="" roman="" style="font-family: " times=""><b><span style="font-size: 14.0pt">Lighting</span></b></span></span><br>
 
<ol>
	<li style="text-align: justify; margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span new="" roman="" style="font-family: " times="">Install one (1) Vista 5006 Architectural Bronze to behind Wishing Well nearest to back gate.</span></span></li>
	<li style="text-align: justify; margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span new="" roman="" style="font-family: " times="">Install one (1) – Vista 6223 Black at corner of planting area nearest to Wishing Well.</span></span></li>
	<li style="text-align: justify; margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span new="" roman="" style="font-family: " times="">Client would like to by-pass current box and will explain further to crew at installation. </span></span></li>
</ol>
', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2438240, 'Gorilla Hair Mulch with Weed Barrier for Front Hill - 2,000 sq. ft.', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2438369, 'Standard Mulch for level planting areas with Weed Barrier 2,520 sq. ft.', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2438551, '<span style="font-size: 12pt"><span style="font-family: " times="" new="" roman",="" serif"=""><b><span style="font-size: 14.0pt">Planting </span></b></span></span><br>
 
<ol>
	<li style="margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span style="color: black"><span><span style="font-family: " times="" new="" roman",="" serif"="">Install 6 Flats of Gazania rigens ‘Kiss Orange Flame’ or other Orange/Yellow Trailing species, 12” spacing to the 54’ x 12’ (648 sq. ft.) area throughout trees but not within 2’ of tree trunk.                                                                                                                          $378</span></span></span></span></li>
</ol>
 

<ol start="2">
	<li style="margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span style="color: black"><span><span style="font-family: " times="" new="" roman",="" serif"="">Install 10 – 1 Gal <span style="background: white"><span style="color: #333333">Lavandula x heterophylla </span></span>intermittent on hillside. As per 7/9 email.                                                                                                                                            $215</span></span></span></span></li>
	<li style="margin: 0in 0in 0.0001pt"><span style="font-size: 12pt"><span style="color: black"><span><span style="font-family: " times="" new="" roman",="" serif"="">Spread 2” of Mulch on top of existing mulch around Gazania and existing fruit trees. Client currently has fairly fresh, existing mulch so 3” is not necessary. Square footage is 648 sq. ft. however I am basing quantity on 2/3 of regular cost.                                                                                                                                                                                   $445</span></span></span></span></li>
</ol>
', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2440549, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2440557, '18 linear feet 1 course 1 cap planter', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2440987, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2441009, 'removing staining', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2441243, '<table style="border-collapse: collapse; width: 630pt; border: none" width="839">
	<colgroup>
		<col span="3" style="width: 66pt" width="88">
		<col style="width: 82pt" width="109">
		<col span="4" style="width: 66pt" width="88">
		<col style="width: 86pt" width="114">
	</colgroup>
	<tbody>
		<tr height="40" style="height: 30.0pt">
			<td class="xl64" height="40" style="border: none; border-bottom: none; height: 30.0pt; width: 66pt; text-align: center; vertical-align: middle; border-top: none; border-right: 0.5pt solid windowtext; border-left: 0.5pt solid windowtext; white-space: normal; padding-top: 1px; padding-right: 1px; padding-left: 1px" width="88"><span style="font-size: 12pt"><span style="color: black"><span style="font-weight: 700"><span style="font-style: italic"><span style="font-family: Arial, sans-serif"><span style="text-decoration: none"> </span></span></span></span></span></span></td>
			<td class="xl64" style="border: none; border-bottom: none; border-left: none; width: 66pt; text-align: center; vertical-align: middle; border-top: none; border-right: 0.5pt solid windowtext; white-space: normal; padding-top: 1px; padding-right: 1px; padding-left: 1px" width="88"><span style="font-size: 12pt"><span style="color: black"><span style="font-weight: 700"><span style="font-style: italic"><span style="font-family: Arial, sans-serif"><span style="text-decoration: none">1 GAL</span></span></span></span></span></span></td>
			<td class="xl64" style="border: none; border-bottom: none; border-left: none; width: 66pt; text-align: center; vertical-align: middle; border-top: none; border-right: 0.5pt solid windowtext; white-space: normal; padding-top: 1px; padding-right: 1px; padding-left: 1px" width="88"><span style="font-size: 12pt"><span style="color: black"><span style="font-weight: 700"><span style="font-style: italic"><span style="font-family: Arial, sans-serif"><span style="text-decoration: none">5 GAL</span></span></span></span></span></span></td>
			<td class="xl64" style="border: none; border-bottom: none; border-left: none; width: 82pt; text-align: center; vertical-align: middle; border-top: none; border-right: 0.5pt solid windowtext; white-space: normal; padding-top: 1px; padding-right: 1px; padding-left: 1px" width="109"><span style="font-size: 12pt"><span style="color: black"><span style="font-weight: 700"><span style="font-style: italic"><span style="font-family: Arial, sans-serif"><span style="text-decoration: none">15 GAL</span></span></span></span></span></span></td>
			<td class="xl64" style="border: none; border-bottom: none; border-left: none; width: 66pt; text-align: center; vertical-align: middle; border-top: none; border-right: 0.5pt solid windowtext; white-space: normal; padding-top: 1px; padding-right: 1px; padding-left: 1px" width="88"><span style="font-size: 12pt"><span style="color: black"><span style="font-weight: 700"><span style="font-style: italic"><span style="font-family: Arial, sans-serif"><span style="text-decoration: none">24"</span></span></span></span></span></span></td>
			<td class="xl64" style="border: none; border-bottom: none; border-left: none; width: 66pt; text-align: center; vertical-align: middle; border-top: none; border-right: 0.5pt solid windowtext; white-space: normal; padding-top: 1px; padding-right: 1px; padding-left: 1px" width="88"><span style="font-size: 12pt"><span style="color: black"><span style="font-weight: 700"><span style="font-style: italic"><span style="font-family: Arial, sans-serif"><span style="text-decoration: none">36"</span></span></span></span></span></span></td>
			<td class="xl64" style="border: none; border-bottom: none; border-left: none; width: 66pt; text-align: center; vertical-align: middle; border-top: none; border-right: 0.5pt solid windowtext; white-space: normal; padding-top: 1px; padding-right: 1px; padding-left: 1px" width="88"><span style="font-size: 12pt"><span style="color: black"><span style="font-weight: 700"><span style="font-style: italic"><span style="font-family: Arial, sans-serif"><span style="text-decoration: none">24" cit</span></span></span></span></span></span></td>
			<td style="border: none; width: 66pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap" width="88"> </td>
			<td class="xl65" style="border: none; border-bottom: none; width: 86pt; text-align: center; vertical-align: middle; border-top: none; border-right: none; border-left: 0.5pt solid windowtext; white-space: normal; padding-top: 1px; padding-right: 1px; padding-left: 1px" width="114"><span style="font-size: 12pt"><span style="color: black"><span style="font-weight: 700"><span style="font-style: italic"><span style="font-family: Arial, sans-serif"><span style="text-decoration: none">TOTALS</span></span></span></span></span></span></td>
		</tr>
		<tr height="21" style="height: 15.75pt">
			<td class="xl66" height="21" style="border: none; border-bottom: none; height: 15.75pt; border-top: none; border-right: 0.5pt solid windowtext; border-left: 0.5pt solid windowtext; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 12pt"><span style="font-family: Arial, sans-serif"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none">count</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 12pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">222</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 12pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">160</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 12pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">119</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 12pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">5</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 12pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">1</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 12pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">3</span></span></span></span></span></span></td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 12pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">502</span></span></span></span></span></span></td>
		</tr>
	</tbody>
</table>
', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2441245, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2444707, 'install (2) pour a lids , includes stamped concrete, and removal of concrete installed<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">owner approved by text to george</div></div>', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2445921, '<span style="font-size: 11.0pt"><span style="font-family: " calibri",="" sans-serif"="">.  The $1,250 difference consists of demo adjustments (client completed demo items;  removed iron fence, $250, buried cables in yard, $100) and lighting adjustments of $900 </span></span>', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2446388, '(1) Vista 4260mm-ss led wall lights&nbsp; (brushed finish)<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">when ordering per Vista lighting Tony
“-SP” for special. In the notes it will need to say something to the extent of “Stainless Steel Shiny Brush Finish” adding “see Tony C” would help as well.
Tony C</div></div>', NULL, '2019-07-17 09:20:45', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2448724, 'Replace (2) Bellecrete caps damaged by other contractors working on project<br>
includes<br>
(2) caps<br>
Demo<br>
Installation and mortar<br>
grouting<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">need to order (2)  - 12" caps
we have a 8" cap onsite</div></div>', NULL, '2019-07-17 09:02:24', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2448741, 'install (2) gas lines for patio cover approx 30ft,<br>
run to top and cap for future heaters<br>
Exchange BBQ covers for more flat  "non BELL"  or branded covers available from home depot or other suppliers<br>
Move or replace  (2) 15 gallon red trailing bougainvillea on hillside, install (1) additional<br>
<br>
This is a trade/no charge<br>
this is in exchange for not doing the 4 electrical runs and outlets done by Rafi''s patio cover contractor,.<br>
 ', NULL, '2019-07-17 09:21:01', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2449282, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2450376, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2451861, '<p class="MsoNormal">Yes, please proceed.</p>

<p class="MsoNormal"> </p>

<p class="MsoNormal">On Tue, Jul 16, 2019 at 8:16 AM David Bender <<a href="mailto:david@picturebuild.com">david@picturebuild.com</a>> wrote:</p>

<p class="MsoNormal">Hi Emily</p>

<p class="MsoNormal">The guys measured the wall and says it is 33 sqft x $11.75 = $387</p>

<p class="MsoNormal">Includes scratch coat and stucco color coat. No painting included.</p>

<p class="MsoNormal">Please let us know with an approval to this email.</p>
', NULL, NULL, NULL, NULL, NULL, 'Sean Martinez', 'sold'),
  (2452112, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2453188, 'Install (3) 24" box trees on hillside @ $165ea<br>
<br>
no  warranty on owner provided shrubs/trees', NULL, '2019-07-20 08:50:44', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2453945, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2454024, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2454042, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">this includes 6 hours of time spent meeting with romb engineering, drawing, site plan, working with pool engineering, drawing hoa and fuel mod plans</div></div>', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2455297, 'Owner approves of the use of Natria Weed Killer applied 10 days prior to start of work. <br>
owner understands this is a pilot program to switching to a more organic solution to weeds and understands that if weeds/grass are not fully eradicated by Natria that  Roundup may still be used as a final spot alternative . there is no warranty to the effectiveness of weed killers <br>
<br>
<a href="https://www.natria.com/products/grass-weed-killer-products">https://www.natria.com/products/grass-weed-killer-products</a><br>
<br>
No Additional Charge<br>
 ', NULL, '2019-07-26 13:38:21', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2455300, 'Owner Declines HOA approval and that Picture Build will not be held responsible for any additional labor /material costs associated with Delay or changes that may occur<br>
<br>
Customer agrees that HOA approval is responsibility of the Owner <br>
 ', NULL, '2019-07-26 13:40:00', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2455354, 'Please view the attached plan and approve<br>
Substitutions may be made by Ryan<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Sean
please order 1-additional bougainvillea red trailing 15 gallon to install on hillside ..see previous gas line work order as it was a trade for electrical work</div></div>', NULL, '2019-07-21 13:22:22', 2, '2019-07-20 18:10:33', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2457474, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2459894, 'Front Landing Tile Work:<br>
<br>
Demo existing.<br>
Level pad<br>
Install 80 sq feet of tile (customer provided)<br>
Grout tile<br>
<br>
Steps included in original contract<br>
<br>
80 sq feet @$33 per sq foot.<br>
Customer provided tile minus $5.00 per sq foot<br>
Total 80 sq feet @$28 per sq foot<br>
<br>
$2240<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2461135, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Change Order for the Differential Total from original contract Planting Allowance for both Front and Rear property areas </span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">1 - 30” Box Australian Willow for Back @ $630</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">1- 24” Box Magnolia ‘Little Gem’ @$385</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">1 - 24” Box Swan Hill Olive - @$630</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">6 - 15 Gal - Pittosperum ‘Silver Sheen’@$150ea  = $900</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">53 - 5 Gal - Various -@$40ea (Front and Back) = $2120</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">189 - 1 Gal - Various - @$20ea (Front and Back) $3780</span></span><br>
 ', NULL, '2019-07-24 11:11:32', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2462846, '162 Square Feet', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2462852, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2462854, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2462861, '5 LF of 18" high wall', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2462928, '31 Linear Feet of Bender Board', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2464762, 'Deck With patio cover Engineering<br>
<br>
$2000 Engineering + design engineer technician time  at the rate of $120hr<br>
<br>
not to exceed  without customer approval<br>
<br>
$4000 allowance<br>
 ', NULL, '2019-08-02 18:05:37', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2465183, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2466127, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2466149, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2466153, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2467339, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2467978, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2468278, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2468570, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2470133, 'Additional Plants Needed   / see attached plan , additional plants in RED
<table class="MsoTableGrid" style="border-collapse: collapse; border: solid windowtext 1.0pt">
	<tbody>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 41.4pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="138"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">symbol</span></span></span></td>
			<td style="border: solid windowtext 1.0pt; width: 333.0pt; border-left: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1110"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Name</span></span></span></td>
			<td style="border: solid windowtext 1.0pt; width: .75in; border-left: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="180"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Size</span></span></span></td>
			<td style="border: solid windowtext 1.0pt; width: .7in; border-left: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="168"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Count</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 41.4pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="138"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">BG</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 333.0pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1110"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Agave “Blue Glow”</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: .75in; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="180"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">15</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: .7in; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="168"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">3</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 41.4pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="138"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">AV</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 333.0pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1110"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Agave Americana varigata “butterfingers”</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: .75in; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="180"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">15</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: .7in; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="168"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">1</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 41.4pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="138"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">AF</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 333.0pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1110"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Aloe Ferox “Cape Aloe”</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: .75in; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="180"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">15</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: .7in; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="168"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">6</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 41.4pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="138"> </td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 333.0pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1110"> </td>
			<td style="border-bottom: solid windowtext 1.0pt; width: .75in; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="180"> </td>
			<td style="border-bottom: solid windowtext 1.0pt; width: .7in; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="168"> </td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 41.4pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="138"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">KP</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 333.0pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1110"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Anigozanthos “Big Red”  tallest variety red</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: .75in; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="180"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">5</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: .7in; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="168"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">2</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 41.4pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="138"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">ND</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 333.0pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1110"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Nandina “Domestica”</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: .75in; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="180"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">5</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: .7in; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="168"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">2</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 41.4pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="138"> </td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 333.0pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1110"> </td>
			<td style="border-bottom: solid windowtext 1.0pt; width: .75in; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="180"> </td>
			<td style="border-bottom: solid windowtext 1.0pt; width: .7in; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="168"> </td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 41.4pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="138"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">CB</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 333.0pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1110"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Dianella “Casa Blue”</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: .75in; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="180"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">1</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: .7in; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="168"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">3</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 41.4pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="138"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">SM</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 333.0pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1110"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Senecio Mandraliscae</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: .75in; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="180"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">1</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: .7in; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="168"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">9</span></span></span></td>
		</tr>
		<tr>
			<td style="border: solid windowtext 1.0pt; width: 41.4pt; border-top: none; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="138"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">BF</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: 333.0pt; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="1110"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">Bulbine frutescens (caulescens)</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: .75in; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="180"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">1</span></span></span></td>
			<td style="border-bottom: solid windowtext 1.0pt; width: .7in; border-top: none; border-left: none; border-right: solid windowtext 1.0pt; padding: 0in 5.4pt 0in 5.4pt" valign="top" width="168"><span style="font-size: 11pt"><span style="line-height: normal"><span style="font-family: Calibri, sans-serif">4</span></span></span></td>
		</tr>
	</tbody>
</table>
<br>
Additional Planting cost $1980<br>
<br>
Credit - for installing ''Tape lights" on BBQ, owner to install   -$490<br>
<br>
Total Change Order $1490<br>
<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">see notes on plan in RED</div></div>', NULL, '2019-07-29 09:54:06', 1, '2019-07-29 09:32:58', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2470641, 'Per owner request to add planting per "Fuel mod'' with plant types changed <br>
<br>
(3) trees from 15Gal to 24" Box ADD/Upgrade $230ea   +$690<br>
(40) 5Gal Shrubs         @     $40ea   +$1600<br>
(67) 1Gal Plants           @    $20ea   +1340<br>
(3) flats verbena 4"      @     $75ea   +$225<br>
<br>
Total additional $3705<br>
<br>
see attached planting plan<br>
<br>
Step lights will be  "Weather iron" gray, see attached picture', NULL, '2019-08-17 10:28:07', 2, '2019-08-15 12:57:40', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2473289, 'Upgrade stone around from Del Rio to "Jelly Bean" pebble 1"<br>
<br>
Credit $2.52LF 116lf bend-a-board material = -$292<br>
installed 150lf  owner provided aluminum board material an additional 34ft installed @ the rate of $5.48ftx34ft=+$186<br>
<br>
Pebble Upgrade $1664<br>
Bender Credit $106<br>
<br>
Total cost $1558<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">need 3 yards</div></div>', NULL, '2019-07-30 11:38:35', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2473572, 'Block to build form for sink.', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2473925, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2476486, 'by Owner Request<br>
move Arizona Flagstone steping stones from 4-6" spacing to 2" spacing in between<br>
Additional stone and installation required', NULL, '2019-08-09 16:55:28', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2477206, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2479644, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2480347, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2482619, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2484547, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2485007, 'Adding pea gravel area already demoed and fabric $535.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2489876, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2492329, '(1) additional yard of Jellybean pebble<br>
(1) additional yard of Mexican pebble<br>
(1) additional yard of premium redwood much 3/4"<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">order (4) total yards jellybean 5/8-1"  when you order it</div></div>', NULL, '2019-08-08 09:45:28', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2492705, NULL, NULL, '2019-08-08 11:04:31', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2493279, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2493647, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2493699, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span><span style="color: #000000"><span style="font-style: normal"><span><span style="font-weight: normal"><span style="letter-spacing: normal"><span style="orphans: auto"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: auto"><span style="word-spacing: 0px"><span><span style="text-decoration: none">1.Remove Demo and Planting sections of plan that are not Client property: All of Lower Level and ½ of Slope. </span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span><span style="color: #000000"><span style="font-style: normal"><span><span style="font-weight: normal"><span style="letter-spacing: normal"><span style="orphans: auto"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: auto"><span style="word-spacing: 0px"><span><span style="text-decoration: none">Add demo of trees and shrubs on backyard West wall. </span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span><span style="color: #000000"><span style="font-style: normal"><span><span style="font-weight: normal"><span style="letter-spacing: normal"><span style="orphans: auto"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: auto"><span style="word-spacing: 0px"><span><span style="text-decoration: none">2. Install additional 160 sq. ft of Pavers, backyard ground level.</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span><span style="color: #000000"><span style="font-style: normal"><span><span style="font-weight: normal"><span style="letter-spacing: normal"><span style="orphans: auto"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: auto"><span style="word-spacing: 0px"><span><span style="text-decoration: none">Remove existing concrete with embedded stone currently in this area.  </span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span><span style="color: #000000"><span style="font-style: normal"><span><span style="font-weight: normal"><span style="letter-spacing: normal"><span style="orphans: auto"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: auto"><span style="word-spacing: 0px"><span><span style="text-decoration: none">3. Additional Lights added:</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span><span style="color: #000000"><span style="font-style: normal"><span><span style="font-weight: normal"><span style="letter-spacing: normal"><span style="orphans: auto"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: auto"><span style="word-spacing: 0px"><span><span style="text-decoration: none">Note: All Path and Uplights will be Architectural Bronze (no upcharge for color)</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span><span style="color: #000000"><span style="font-style: normal"><span><span style="font-weight: normal"><span style="letter-spacing: normal"><span style="orphans: auto"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: auto"><span style="word-spacing: 0px"><span><span style="text-decoration: none">Add 8 Vista LED # 6540 Arch. Bronze Path Lights</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span><span style="color: #000000"><span style="font-style: normal"><span><span style="font-weight: normal"><span style="letter-spacing: normal"><span style="orphans: auto"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: auto"><span style="word-spacing: 0px"><span><span style="text-decoration: none">Add 3 Vista LED # 4246 Black Step Lights </span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span><span style="color: #000000"><span style="font-style: normal"><span><span style="font-weight: normal"><span style="letter-spacing: normal"><span style="orphans: auto"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: auto"><span style="word-spacing: 0px"><span><span style="text-decoration: none">4. Adjusted Plant totals as follows:</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span><span style="color: #000000"><span style="font-style: normal"><span><span style="font-weight: normal"><span style="letter-spacing: normal"><span style="orphans: auto"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: auto"><span style="word-spacing: 0px"><span><span style="text-decoration: none">Install  (14) 15 Gallon Standard trees</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span><span style="color: #000000"><span style="font-style: normal"><span><span style="font-weight: normal"><span style="letter-spacing: normal"><span style="orphans: auto"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: auto"><span style="word-spacing: 0px"><span><span style="text-decoration: none">Install (34) 5 Gallon Plants</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span><span style="color: #000000"><span style="font-style: normal"><span><span style="font-weight: normal"><span style="letter-spacing: normal"><span style="orphans: auto"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: auto"><span style="word-spacing: 0px"><span><span style="text-decoration: none">Install (62) I gallon plants</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span><span style="color: #000000"><span style="font-style: normal"><span><span style="font-weight: normal"><span style="letter-spacing: normal"><span style="orphans: auto"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: auto"><span style="word-spacing: 0px"><span><span style="text-decoration: none">Install (2) Flats</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span><span style="color: #000000"><span style="font-style: normal"><span><span style="font-weight: normal"><span style="letter-spacing: normal"><span style="orphans: auto"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: auto"><span style="word-spacing: 0px"><span><span style="text-decoration: none">5. Remove Gravel component from Addendum.</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span><span style="color: #000000"><span style="font-style: normal"><span><span style="font-weight: normal"><span style="letter-spacing: normal"><span style="orphans: auto"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: auto"><span style="word-spacing: 0px"><span><span style="text-decoration: none">Additional Job Start Notes:</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span><span style="color: #000000"><span style="font-style: normal"><span><span style="font-weight: normal"><span style="letter-spacing: normal"><span style="orphans: auto"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: auto"><span style="word-spacing: 0px"><span><span style="text-decoration: none">Save Agaves in Backyard. Some will be repositioned and others remain per client request.</span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span><span style="color: #000000"><span style="font-style: normal"><span><span style="font-weight: normal"><span style="letter-spacing: normal"><span style="orphans: auto"><span style="text-transform: none"><span style="white-space: normal"><span style="widows: auto"><span style="word-spacing: 0px"><span><span style="text-decoration: none">Revisit whether client wants the Ficus pumila -Fig Vine- removed from front wall. </span></span></span></span></span></span></span></span></span></span></span></span></span></span></span><br>
<br>
 ', NULL, '2019-08-09 12:47:48', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2494829, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2494837, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2495811, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2495904, '1/2-3/4  <br>
<br>
1/2" yard Del rio stones near rear slider door<br>
<br>
Add 3x3 garbage can area at side yard near rear garage door<br>
<br>
 ', NULL, '2019-08-09 16:56:20', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2495973, 'Planting<br>
1-24" Box  @360ea<br>
8-15 Gal @150ea<br>
13-5Gal @40ea<br>
27-1Gal @20ea<br>
1-flat Lantana @$75<br>
Total $2620<br>
Allowance $5360<br>
Credit -$2740<br>
<br>
Additional design or plant request at the rate of $120hr<br>
<br>
Plant returns at the rate of 20% restocking fee after delivery if owner does not approve of variety + $120hr design and delivery fee', NULL, '2019-08-10 12:35:37', 1, '2019-08-09 17:11:37', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2496019, 'Gorilla hair mulch on hill side', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2496174, NULL, NULL, NULL, NULL, NULL, NULL, 'Joshua Jordan', 'pending'),
  (2496226, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2499096, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2499097, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2499099, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2499104, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2499107, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2499206, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2500738, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2501047, 'FILL - blended gray charcoal Holland pavers herringbone pattern 90 degree from house <br>
<br>
BORDER - Charcoal<br>
<br>
see attached picture by owner for reference <br>
<br>
no additional charge<br>
 ', NULL, '2019-08-14 10:25:57', 1, '2019-08-13 12:01:04', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2501049, 'Haul away and or grade soil to have been removed by owner.  <br>Dispose of two (2) concrete stoops <br><br>$1200<br><br>Remove mulch from contract -$700<br><br>Total change  +$500<br> ', NULL, '2019-08-21 11:21:04', NULL, NULL, NULL, 'Joshua Jordan', 'sold'),
  (2501376, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2502193, 'Plant design.', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2503144, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2504056, NULL, NULL, NULL, 1, '2019-08-14 12:57:16', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (2505345, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2505368, 'Paver is Orco Holland in Manor, with a burnish finish 775 sf', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2505463, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">This is one (1) 350 sq ft. 45 degree angle hillside. MB</div></div>', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2509679, 'Contracted 3-rail fencing 1105ft<br>
After onsite measurements actual length is 1135ft<br>
<br>
add 30ft 3-rail <br>
 ', NULL, '2019-08-17 15:03:16', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2510095, 'The block wall is to install a 4'' gate in the middle.6'' high.<br>
Priced at $235.00 a Linear Foot<br>
Masonry crew to give Saen the order for block to match existing back wall', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2512513, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2518006, 'Fountain order $1085 with tax<br>
Delivery $350<br>
<br>
Material allowance in contract was $600<br>
<br>
Difference of $735<br>
<br>
Added planting for driveway. <br>
<br>
$250', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2519515, 'Add 500Sqft mulch to side yard, no weed barrier&nbsp;', NULL, '2019-08-22 14:47:24', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2519896, 'This is for the change order for the wall and step material upgrade.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2520513, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2520619, 'up to 60ft 1" sch 40 pvc main line to rear<br>
(1) 3/4" garden valve for your hose<br>
install left of bbq pad<br>
<br>
this is recommended by our irrigation crew , so that the lawn irrigation works and flows better<br>
<br>
 ', NULL, '2019-08-22 22:47:33', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (2520840, '$900.00 for drip with valve&nbsp; and $200.00 for valve', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'pending'),
  (2520989, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">This covers everything that we have discussed so far in irrigation. </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">The new zone:</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">It includes all of the emitters and placing them in your plant zone. </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Includes the needed main line</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Includes a new plastic valve for your existing. </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"> </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">If you need additional zones or work then that would be an added conversation. But from what I''m told this is all that has been planned. </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">I do not have an estimate yet for the weep screed. </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">I will follow up. </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Please confirm for the irrigation. </span></span><br>
 ', NULL, '2019-09-04 17:40:33', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2521913, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2522317, 'additional 200sqft pavers<br>
<br>
this additional pavers is required because the patio was extended out ', NULL, '2019-08-23 11:17:09', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2522454, '1) Expand decking and add paver step landings. Increase over last chance order is 242 sq feet. Roughly 650 sq feet in total. Need to also bring in and compact 8 additional tons of base to take out hillside grade.   $3630 for added paver and $1200 for base and compaction

2) Add 35 linear feet of paver step $1750


3) Remove 62 linear feet of landscape tie step ($1950)

4) Remove 34 linear feet of landscape tie wall ($2800)

5) Expand wall add wall for step transition.
65 on feet add on.  $6450.

6) Remove roughly 20 5 gallons from contact ($800)

7) Change wood bench to paver seat wall. No charge.



<!-- begin_ammend -->For the Order.<br>
The Rustic wall amount is 24 inches @140 linear feet. Top row figure as soldier course and not running bond for seating<br>
Then Rustic all soldier course for all step treads this is 63 linear feet of step.<br>
<br>
650 sq feet of paver.  Same paver for border<br>
<br>
We will probably also have another change order with step lights. <br>
 <!-- end_ammend -->', NULL, '2019-08-23 10:49:51', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2524584, 'install (1) 3/4 drip valve @ existing valves on hillside. install drip tubing and (3) 2gph emitters each tree planted..(3) maples and (1) palo verde<br>
<br>
move  existing sprinklers and add about (2)  rotor sprinklers due the fence installation so proper coverage of hillside is obtained', NULL, '2019-08-26 17:49:45', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2524595, 'on (2) columns base <br>
using onsite stone and wall cap , fabricate and install stone along base, install bellecrete cap cut and fit gap between post and step gap..grout all joints', NULL, '2019-08-26 07:51:57', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2525525, '344 additional square feet of sod', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2526416, '7 Additional Vista Lights<br>
(3 for backyard stairs, 4 for front porch steps, 1 for Utility stairs)', NULL, '2019-08-26 15:16:08', NULL, NULL, NULL, 'Marybeth Jacobsen', 'sold'),
  (2526455, '6 additional Vista Lights at $225 each', NULL, '2019-10-18 15:17:49', NULL, NULL, NULL, 'Marybeth Jacobsen', 'sold'),
  (2526604, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2526607, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2526693, 'Upgrade current selection of pebble  plaster to pebble tec  pebble brilliance "vivid shores"', NULL, '2019-08-28 14:38:56', NULL, NULL, NULL, 'Marybeth Jacobsen', 'sold'),
  (2526700, 'seal all new concrete with natural look sealer, includes all copings&nbsp;<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">approx 2400sqft</div></div>', NULL, '2019-08-27 11:25:11', NULL, NULL, NULL, 'Marybeth Jacobsen', 'lost'),
  (2526717, 'Fireplace W/Bench<br>
1. Approx 6x9F<br>
2. Smooth stucco finished<br>
3. 14ft Wide bench  w/bellecrete cap. use stone onsite to finish bench and or buy additional as needed<br>
4. 72" wide fireplace  insert included w/ fireglass (owner to select color)<br>
5. owner declines permits and agrees to take all responsibility meeting city codes and restrictions. <br>
6. owner agrees picture build will not be responsible for any negative actions arising from any violation of city codes <br>
7. includes full masonry warranty of 3 years<br>
 - lights additional<br>
<br>
includes vichothan around (2) patio cover columns at hillside<br>
<br>
Original Contract: Fire/Water Feature         $9467      (in original contract)<br>
Fireplace W/Bench                                       $17,987  (replaces Fire feature)<br>
Difference                                                     $8520<br>
<br>
  <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">DO NOT START TILL WE GET FINAL (FINAL) INSPECTION ON THIS JOB
please build it like the  attached engineering
no inspections required, owner agrees they take full responsibility as we are building within the setback, 
this item will be installed after final inspections</div></div>', NULL, '2019-08-26 22:58:07', 1, '2019-08-26 22:46:34', 'Ryan Kleefisch', 'Marybeth Jacobsen', 'sold'),
  (2527633, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2528073, 'use leftover jellybean  at back fence <br>
will not install 1 yard premium mulch<br>
install 7 additional bags black la paz pebble under pots', NULL, '2019-08-27 09:49:22', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2531503, 'ALL MATERIALS APPROVED VERBALLY WITH CLIENT - Need to list Additional Charge of side Melville Stair Walls<br>
<br>
<br>
Front Porch/Steps and Utility area Landing and Steps Selections: Front Porch: Belgard, Catalina Grana Rio Small Ashlar Pattern Front Steps - Melville Cap - Graphite Utility Steps: Belgard, Melville Wall stacked on either side of stairs. Landing: Belgard, Catalina Grana Rio Small Ashlar Pattern Steps: Melville Cap - Graphite', NULL, NULL, NULL, NULL, NULL, 'Marybeth Jacobsen', 'sold'),
  (2532177, 'plant (4) owner supplied Japanese Maples  @  $90ea  =$360<br>
<br>
Plant 15 gallon trees @ $150ea<br>
(1) 15Gal purple leaf plum<br>
(2) Magnolia "little gem"<br>
(2) Crape Myrtle "white multi<br>
(1) Western Redbud "forest pansy" purple lead<br>
<br>
6x$150=$900<br>
total  $1260<br>
<br>
Original Budget $1000<br>
<br>
Additional cost $260<br>
<br>
owner agrees to properly water all plants installed by hand<br>
no warranty on plantings without automatic irrigation<br>
<br>
 ', NULL, '2019-08-28 22:27:32', 1, '2019-08-28 17:08:47', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2532179, 'Change Arizona Flagstone color to "Classic Oak Select"   ', NULL, NULL, NULL, NULL, NULL, 'Marybeth Jacobsen', 'pending'),
  (2532305, '(4) 15 gallon red trailing bougainvillea on hillside @150ea<br>
<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">plant where white flags are on hillside</div></div>', NULL, '2019-09-03 20:59:41', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2534015, '504 additional sf', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2534686, 'No charge for plants shown on plan<br>
<br>
10 yards Gorilla hair $2500<br>
<br>
 ', NULL, '2019-09-06 17:32:22', 1, '2019-08-29 13:41:21', 'Ryan Kleefisch', 'Ryan Kleefisch', 'lost'),
  (2535269, 'Trees to be staked with to loge poles, 2 loge poles per tree with staps ', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2536416, '10x14 pad for owner provided/installed patio cover<br>
<br>
includes forming and steel<br>
gray broom finish<br>
<br>
 ', NULL, '2019-08-30 11:02:08', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2536520, 'Total job $111,375<br>
<br>
1. Deposit                                                                 $1000 (paid)<br>
2.Demo/Cleanup                                                      $20.000<br>
3. Rough Underground                                            $10.000<br>
4. Block Wall Excavations    50%                            $10.000<br>
5. Block Wall Excavation    100%                            $5000<br>
6. block Walls Material Delivery                               $5000<br>
7. Block Walls Completed 50%                                $5000<br>
8. Block Walls Completed 100%                               $10.000<br>
9.Stucco work                                                           $4000<br>
10. City Concrete Forming/entry and sidewalk         $5000<br>
11. City Concrete work completed                            $10.000<br>
12. Staircase forming                                                $5000    <br>
13. Staircase completed                                            $5000<br>
14. Planting                                                                $4750<br>
15. Parkway lawn installed                                        $3000<br>
16. Low Voltage Lighting Delivered                            $5000<br>
17. Job completed                                                      $3625<br>
18. permits/Engineering                                       due upon invoice<br>
19. Deputy Inspection costs if required               due upon invoice<br>
20 , all change orders                                         due upon invoice<br>
<br>
 ', NULL, '2019-08-30 13:50:48', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2536698, 'Fire Flow Test  Sundale                                           $100<br>
County Building Plan Check Fee                             $500.60<br>
Zoning/Planning fee                                                 $535.00<br>
<br>
Permit Technician - Ryan                   <br>
drawing, working with engineers,<br>
drive time, multiple meeting with city officials <br>
<br>
16hrs @ $120hr = $1920<br>
<br>
Total $3055.60<br>
<br>
<br>
Los Angeles Fire Dept                            $440.64-Owner Paid<br>
Building Permit Fee                                $743.30 -Owner Paid<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2537654, '5 - 1 gal Anigozanthos ''Harmony''<br>
5 - 1 gal Verbena ''Homestead Purple'' or equivalent<br>
<br>
Client would like to replace Agapanthus in planter next to front entrance. <br>
Suggest transplanting Agapanthus to semi-sunny location. ', NULL, NULL, NULL, NULL, NULL, 'Marybeth Jacobsen', 'sold'),
  (2537926, '<span style="font-size: 12pt"><span new="" roman="" style="font-family: " times="">Adjust Current Light Order to the Following Styles and Quantities due to Design Changes:</span></span><br>
<span new="" roman="" style="font-family: " times="">*    Current Order Includes Vista – Qty.10 - Path Lights #6540 Architectural Bronze – </span><b new="" roman="" style="font-family: " times="">Cancel three (3).</b><br>
<span new="" roman="" style="font-family: " times=""><b>*    </b>Current Order Includes Vista – Qty.4 - Small Spots #</span>5014i<span new="" roman="" style="font-family: " times=""> Architectural Bronze – </span><b new="" roman="" style="font-family: " times="">Cancel all four (4).  Change to Qty. 3 -Vista #5006 Architectural Bronze<br>
 *    </b><span new="" roman="" style="font-family: " times="">Current Order Includes Vista – Qty.3 - Step Lights #4246 Black – </span><span style="font-size: 12pt"><span new="" roman="" style="font-family: " times=""><b>Cancel all three (3).  Change to Qty. 12 – Vista #4260 Architectural Bronze</b></span></span><br>
<br>
<span style="font-size: 12pt"><span new="" roman="" style="font-family: " times=""><b>Total Additional Lights: 5</b></span></span><br>
<span style="font-size: 12pt"><span new="" roman="" style="font-family: " times=""><b>Cost: $1,100</b></span></span><br>
<br>
Note: Depending on final stair construction we may only need 11 Step Lights. If so, one will be credited back to client. <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Depending on final stair construction we may only need 11 Step Lights. If so, one will be credited back to client.</div></div>', NULL, NULL, NULL, NULL, NULL, 'Marybeth Jacobsen', 'sold'),
  (2538093, '190 SF X $10.45&nbsp;&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2539372, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2539991, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2543371, 'Remove 20 linear feet of sand set brick.  Dig trench.  Electrician gotten by owner will be onsite,  lay conduit and then we relay brick paver style.<br>
<br>
Said he wants the other paver that was done set in concrete.  Will need about 6 90lb bags of concrete. <br>
<br>
Cost will be determined after work.  Time and materials. <br>
<br>
<br>
Will need to add earlier change order cost to this one. ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2543496, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2545402, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2546092, '<table aria-labelledby="gbox_ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid" aria-multiselectable="false" border="0" cellpadding="0" cellspacing="0" id="ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid" role="grid" tabindex="0">
	<tbody>
		<tr id="2473289" role="row" tabindex="-1">
			<td aria-describedby="ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid_ID#" role="gridcell" title="2128697"><a data-ga-click="Select Change Order" href="https://buildertrend.net/Payments/CustomerInvoices.aspx#" onclick="CustomerInvoicesList.openChangeOrderDetails(2473289,4312960); return false;">2128697</a></td>
			<td aria-describedby="ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid_title" role="gridcell" title="Pebble Upgrade">Pebble Upgrade</td>
			<td aria-describedby="ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid_Invoice Amount" role="gridcell" title="$1,558.00">$1,558.00</td>
		</tr>
	</tbody>
</table>
 

<table aria-labelledby="gbox_ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid" aria-multiselectable="false" border="0" cellpadding="0" cellspacing="0" id="ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid" role="grid" tabindex="0">
	<tbody>
		<tr id="2492329" role="row" tabindex="-1">
			<td aria-describedby="ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid_ID#" role="gridcell" title="2128698"><a data-ga-click="Select Change Order" href="https://buildertrend.net/Payments/CustomerInvoices.aspx#" onclick="CustomerInvoicesList.openChangeOrderDetails(2492329,4312960); return false;">2128698</a></td>
			<td aria-describedby="ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid_title" role="gridcell" title="Additional:Mexican Pebble, Jellybean & Mulch">Additional:Mexican Pebble, Jellybean & Mulch</td>
			<td aria-describedby="ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid_Invoice Amount" role="gridcell" title="$3,689.00">$3,689.00</td>
		</tr>
	</tbody>
</table>

<table aria-labelledby="gbox_ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid" aria-multiselectable="false" border="0" cellpadding="0" cellspacing="0" id="ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid" role="grid" tabindex="0">
	<tbody>
		<tr id="2524584" role="row" tabindex="-1">
			<td aria-describedby="ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid_ID#" role="gridcell" title="2128699"><a data-ga-click="Select Change Order" href="https://buildertrend.net/Payments/CustomerInvoices.aspx#" onclick="CustomerInvoicesList.openChangeOrderDetails(2524584,4312960); return false;">2128699</a></td>
			<td aria-describedby="ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid_title" role="gridcell" title="Irrigation Zone and move sprinklers">Irrigation Zone and move sprinklers</td>
			<td aria-describedby="ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid_Invoice Amount" role="gridcell" title="$650.00">$650.00</td>
		</tr>
	</tbody>
</table>
 

<table aria-labelledby="gbox_ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid" aria-multiselectable="false" border="0" cellpadding="0" cellspacing="0" id="ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid" role="grid" tabindex="0">
	<tbody>
		<tr id="2524595" role="row" tabindex="-1">
			<td aria-describedby="ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid_ID#" role="gridcell" title="2128700"><a data-ga-click="Select Change Order" href="https://buildertrend.net/Payments/CustomerInvoices.aspx#" onclick="CustomerInvoicesList.openChangeOrderDetails(2524595,4312960); return false;">2128700</a></td>
			<td aria-describedby="ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid_title" role="gridcell" title="Patio Cover Base Stonework">Patio Cover Base Stonework</td>
			<td aria-describedby="ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid_Invoice Amount" role="gridcell" title="$650.00">$650.00</td>
		</tr>
	</tbody>
</table>
 

<table aria-labelledby="gbox_ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid" aria-multiselectable="false" border="0" cellpadding="0" cellspacing="0" id="ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid" role="grid" tabindex="0">
	<tbody>
		<tr id="2532305" role="row" tabindex="-1">
			<td aria-describedby="ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid_ID#" role="gridcell" title="2128705"><a data-ga-click="Select Change Order" href="https://buildertrend.net/Payments/CustomerInvoices.aspx#" onclick="CustomerInvoicesList.openChangeOrderDetails(2532305,4312960); return false;">2128705</a></td>
			<td aria-describedby="ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid_title" role="gridcell" title="(4) additional Bougainvillea on hillside">(4) additional Bougainvillea on hillside</td>
			<td aria-describedby="ctl00_ctl00_BaseMain_MainContentHolder_dgInvoices_jqGrid_Invoice Amount" role="gridcell" title="$600.00">$600.00</td>
		</tr>
	</tbody>
</table>
', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2547643, 'Planting Plan Update', NULL, NULL, 1, '2019-09-06 10:51:35', 'Marybeth Jacobsen', 'Marybeth Jacobsen', 'sold'),
  (2548608, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2548612, '<table style="border-collapse: collapse; width: 442pt; border: none" width="590">
	<colgroup>
		<col span="3" style="width: 48pt" width="64">
		<col style="width: 53pt" width="71">
		<col span="4" style="width: 48pt" width="64">
		<col style="width: 53pt" width="71">
	</colgroup>
	<tbody>
		<tr height="21" style="height: 15.75pt">
			<td class="xl67" height="21" style="border: none; height: 15.75pt; width: 48pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap" width="64"><span style="font-size: 12pt"><span style="font-weight: 700"><span style="color: black"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">Planted</span></span></span></span></span></span></td>
			<td style="border: none; width: 48pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap" width="64"> </td>
			<td style="border: none; width: 48pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap" width="64"> </td>
			<td style="border: none; width: 53pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap" width="71"> </td>
			<td style="border: none; width: 48pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap" width="64"> </td>
			<td class="xl67" colspan="2" style="border: none; width: 96pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap" width="128"><span style="font-size: 12pt"><span style="font-weight: 700"><span style="color: black"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">Original C/O</span></span></span></span></span></span></td>
			<td style="border: none; width: 48pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap" width="64"> </td>
			<td style="border: none; width: 53pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap" width="71"> </td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td class="xl65" height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="font-weight: 700"><span style="text-decoration: underline"><span style="color: black"><span style="font-style: normal"><span style="font-family: Calibri, sans-serif">SIZE</span></span></span></span></span></span></td>
			<td class="xl65" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="font-weight: 700"><span style="text-decoration: underline"><span style="color: black"><span style="font-style: normal"><span style="font-family: Calibri, sans-serif">QTY</span></span></span></span></span></span></td>
			<td class="xl65" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="font-weight: 700"><span style="text-decoration: underline"><span style="color: black"><span style="font-style: normal"><span style="font-family: Calibri, sans-serif">COST PER</span></span></span></span></span></span></td>
			<td class="xl65" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="font-weight: 700"><span style="text-decoration: underline"><span style="color: black"><span style="font-style: normal"><span style="font-family: Calibri, sans-serif">TOTAL</span></span></span></span></span></span></td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td class="xl65" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="font-weight: 700"><span style="text-decoration: underline"><span style="color: black"><span style="font-style: normal"><span style="font-family: Calibri, sans-serif">SIZE</span></span></span></span></span></span></td>
			<td class="xl65" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="font-weight: 700"><span style="text-decoration: underline"><span style="color: black"><span style="font-style: normal"><span style="font-family: Calibri, sans-serif">QTY</span></span></span></span></span></span></td>
			<td class="xl65" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="font-weight: 700"><span style="text-decoration: underline"><span style="color: black"><span style="font-style: normal"><span style="font-family: Calibri, sans-serif">COST PER</span></span></span></span></span></span></td>
			<td class="xl65" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="font-weight: 700"><span style="text-decoration: underline"><span style="color: black"><span style="font-style: normal"><span style="font-family: Calibri, sans-serif">TOTAL</span></span></span></span></span></span></td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">1G</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">206</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">21.5</span></span></span></span></span></span></td>
			<td align="right" class="xl66" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$4,429.00</span></span></span></span></span></span></td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">1G</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">222</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">21.5</span></span></span></span></span></span></td>
			<td align="right" class="xl66" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$4,773.00</span></span></span></span></span></span></td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">5G</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">155</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">43.5</span></span></span></span></span></span></td>
			<td align="right" class="xl66" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$6,742.50</span></span></span></span></span></span></td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">5G</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">160</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">43.5</span></span></span></span></span></span></td>
			<td align="right" class="xl66" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$6,960.00</span></span></span></span></span></span></td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">15G</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">114</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">175</span></span></span></span></span></span></td>
			<td align="right" class="xl66" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$19,950.00</span></span></span></span></span></span></td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">15G</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">119</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">175</span></span></span></span></span></span></td>
			<td align="right" class="xl66" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$20,825.00</span></span></span></span></span></span></td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">24"</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">5</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">385</span></span></span></span></span></span></td>
			<td align="right" class="xl66" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$1,925.00</span></span></span></span></span></span></td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">24"</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">5</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">385</span></span></span></span></span></span></td>
			<td align="right" class="xl66" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$1,925.00</span></span></span></span></span></span></td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">36"</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">1</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">1375</span></span></span></span></span></span></td>
			<td align="right" class="xl66" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$1,375.00</span></span></span></span></span></span></td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">36"</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">1</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">1375</span></span></span></span></span></span></td>
			<td align="right" class="xl66" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$1,375.00</span></span></span></span></span></span></td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">Flats</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">4</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">63</span></span></span></span></span></span></td>
			<td align="right" class="xl66" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$252.00</span></span></span></span></span></span></td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">Flats</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">0</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">63</span></span></span></span></span></span></td>
			<td align="right" class="xl66" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$0.00</span></span></span></span></span></span></td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">24" cit</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">2</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">825</span></span></span></span></span></span></td>
			<td align="right" class="xl66" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$1,650.00</span></span></span></span></span></span></td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">24" cit</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">3</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">825</span></span></span></span></span></span></td>
			<td align="right" class="xl66" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$2,475.00</span></span></span></span></span></span></td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">15" citrus</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">1</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">200</span></span></span></span></span></span></td>
			<td align="right" class="xl66" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$200.00</span></span></span></span></span></span></td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td align="right" class="xl66" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$38,333.00</span></span></span></span></span></span></td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td align="right" class="xl66" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$36,523.50</span></span></span></span></span></span></td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td colspan="2" height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">Difference</span></span></span></span></span></span></td>
			<td align="right" class="xl66" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">$1,809.50</span></span></span></span></span></span></td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
		</tr>
	</tbody>
</table>
', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2548613, '<table style="border-collapse: collapse; width: 96pt; border: none" width="128">
	<colgroup>
		<col span="2" style="width: 48pt" width="64">
	</colgroup>
	<tbody>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; width: 48pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap" width="64"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">flat</span></span></span></span></span></span></td>
			<td align="right" style="border: none; width: 48pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap" width="64"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">816</span></span></span></span></span></span></td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">270</span></span></span></span></span></span></td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">42</span></span></span></span></span></span></td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">18</span></span></span></span></span></span></td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">18</span></span></span></span></span></span></td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">79.6</span></span></span></span></span></span></td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">116.6</span></span></span></span></span></span></td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">31.5</span></span></span></span></span></span></td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">60</span></span></span></span></span></span></td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">60</span></span></span></span></span></span></td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">38</span></span></span></span></span></span></td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">14</span></span></span></span></span></span></td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
			<td style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"> </td>
		</tr>
		<tr height="20" style="height: 15.0pt">
			<td height="20" style="border: none; height: 15.0pt; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">Total</span></span></span></span></span></span></td>
			<td align="right" style="border: none; padding-top: 1px; padding-right: 1px; padding-left: 1px; vertical-align: bottom; white-space: nowrap"><span style="font-size: 11pt"><span style="color: black"><span style="font-weight: 400"><span style="font-style: normal"><span style="text-decoration: none"><span style="font-family: Calibri, sans-serif">1563.7</span></span></span></span></span></span></td>
		</tr>
	</tbody>
</table>
<br>
<br>
2520sqft estimated - 1563.7sqft actual laid x 1.5 = 1,434.45 refund', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2550917, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2551193, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2551500, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2551503, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2551521, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2551682, '2 guys one day and material expense', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2551795, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2551801, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2552091, 'Survey Costs $2800<br>
Picture Build Technician costs 6hrs, @ $120hr = $720<br>
<br>
<br>
Total to be deducted from Deposit $3520', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2552177, 'this change order supersedes the original scope of work in the original contract. - see attached new scope of work<br>
removes the following items from scope of work<br>
Original contract $90,378<br>
excavation $7280<br>
block retaining walls $24,421<br>
Stonework $6600<br>
Pilasters $3217<br>
Firepit $9611<br>
Concrete Flatwork $7632<br>
Lighting budget $2800<br>
Irrigation work $1700<br>
Planting Budget $3400<br>
Demo/Cleanup $3600<br>
Irrigation Drains $6400<br>
Concrete at patio cover area  $6750<br>
Slup stone block walls $2280<br>
Lawn $7687<br>
Permits and engineering Allowance $3500<br>
<br>
New scope of work/change order $36,198 (see attached)<br>
Reduces contract by $54,180<br>
<br>
Owner Declines HOA/Permits , owner takes all responsibility for any and all cost associated with permits. owner elects to install block wall without permits<br>
<br>
Total $36,198<br>
Payment Schedule<br>
Deposit                            $1000 - paid<br>
Demo/Excavation            $10.000<br>
Block Delivered                $5000<br>
Block Installed                  $8000<br>
Concrete Forming            $6000<br>
Concrete 100%                $5000<br>
All work Complete            $2198<br>
<br>
<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">this change order supersedes the original scope of work in the original contract.
see attached</div></div>', NULL, '2019-09-10 16:58:56', 1, '2019-09-09 22:58:56', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2552196, 'see attached lighting plan<br>
(5) path lights @ $220ea<br>
(5) up-lights @ $220ea<br>
(1) transformer @480<br>
total $2680<br>
<br>
original labor included $1280<br>
<br>
Difference $1400<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">see attached lighting plan</div></div>', NULL, NULL, 1, '2019-09-09 23:44:05', 'Ryan Kleefisch', 'Ryan Kleefisch', 'pending'),
  (2552206, 'install approx 120sqft Additional pavers<br>
<br>
includes additional demo and minor irrigation repair<br>
<br>
see attached plan<br>
 ', NULL, '2019-09-11 12:40:37', 1, '2019-09-10 00:36:17', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2552218, 'Design rear yard in 3d<br>
Conceptual Design Includes the following features<br>
pool remodel<br>
patio cover<br>
BBq<br>
conceptual plant layout sizes<br>
hardscape design and patio<br>
includes as many edits as necessary  up to 15 hours<br>
<br>
does not include hillside design worl<br>
<br>
Total design fee is $1400 <br>
<br>
1/2 down $700+3% credit card fee =$721<br>
700 due upon completion <br>
 ', NULL, '2019-09-10 08:56:42', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2554180, 'please approve the attached plan<br>
<br>
if you agree, please fill out the attached plan approval form as well and email me a copy asap<br>
<br>
Upgrade 3-5gallon to 2-15gallon bougainvillea  $180<br>
<br>
Thank you<br>
Ryan<br>
 ', NULL, '2019-09-11 14:37:48', 2, '2019-09-11 13:35:35', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2556623, 'Pavilion - (2300) credit<br>
Gas line - 5315<br>
Electrical - 2520<br>
 ', NULL, NULL, 1, '2019-09-11 12:12:01', 'Mohammed Rahman', 'Mohammed Rahman', 'sold'),
  (2556762, 'I zone of irrigation, plants, jute, demo', NULL, NULL, 1, '2019-09-11 12:50:43', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (2557308, 'Please approve the following<br>
<br>
Paver Choice: Belgard Catalina Grana –Toscana Large (Sizes: 6”x12”x2 3/8” / 9”x12”x2 3/8” / 12’x12’x2 3/8”) ·<br>
Border: Belgard Catalina Grana –Toscana (Size: 6”x9”x2 3/8”) ·<br>
Wall Cap: Belgard Marina Coping 6” – Toscana · Stucco Color: X-16 Silver Gray ·<br>
Standard Crushed Gravel ·<br>
Standard Shredded Brown Bark', NULL, '2019-09-11 15:31:03', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2557444, 'Plant Count Differential from Last Design <br>
 ', NULL, '2019-09-14 17:32:40', 1, '2019-09-11 23:41:43', 'Marybeth Jacobsen', 'Marybeth Jacobsen', 'lost'),
  (2559454, 'Customer requesting curb core.&nbsp; &nbsp;Per Contract $450 to do this', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2559752, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2559753, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2559992, 'Chip on stucco stucco guy had to come back and match ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2562309, 'Install 35ft 1x6 bender board', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2562664, 'Benderboard Removal - 80 Linear Ft. - Credit $640<br>
1 - 15 Gal Ficus benjamina non-variegarted - $175<br>
1 - 7 Gal Ficus benjamina Variegated ''Spearmint'' - Credit $50<br>
2 - Vegetable Beds 6''x3'' Redwood (3 course 6" each) replacing <span style="font-size: 12pt"><span new="" roman="" style="font-family: " times=""> 6x8 tan/green landscape ties - $0</span></span><br>
1 - Attached Revised Plan needs Approval<br>
 ', NULL, '2019-09-14 17:33:08', 1, '2019-09-14 08:04:42', 'Marybeth Jacobsen', 'Marybeth Jacobsen', 'sold'),
  (2564422, '55ft 1" main line and garden valve', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2564505, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2564508, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2564579, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2564697, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2564912, NULL, NULL, '2019-09-16 12:33:18', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2565873, '195 SF of sod<br>
using their own controller', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2567269, 'Install (46) 15 gallon Podacarpus Gracilior (column type)              $8050<br>
Install a little more paver and concrete border paver                         $500<br>
Install (1) new zone of irrigation                                                         $850<br>
Install 100 linear feet of bender board                                                $800<br>
Bring out 120 bender board for order<br>
<br>
Will need dump truck or trailer for hauling plant demo soils<br>
Will need amendments<br>
Crew to be onsite and verify irrigation order and bender board from Irrigation Express and order that morning. <br>
<br>
Did not need to haul some soils  and amendments                                                      $-400<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2568248, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2568251, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2568254, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2568257, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2568259, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2568261, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2568844, 'install 135ft&nbsp;1x4 bender board', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2569173, 'water line 30 linear feet X $20.00= $600.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'pending'),
  (2569197, 'See attached planting plan and approve', NULL, '2019-09-19 00:34:45', 1, '2019-09-17 23:05:19', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2569489, 'Top of rafters using 1x6 instead of plywood&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2569917, 'Exchanging Umbellaria ca, for Laurus nobilis - $0<br>
<br>
Installing 6- pop up heads around Ash tree for Vinca irrigation. - $0', NULL, NULL, NULL, NULL, NULL, 'Marybeth Jacobsen', 'sold'),
  (2573573, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2573829, 'Credit for (4) 5 gal Rosa ''High Society" Climbing<br>
<br>
Material only credit<br>
Credit for (5) vista up lights<br>
Credit for (2) vista path lights<br>
Credit for (2) vista up/down lights', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2574137, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2575783, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2576316, 'Nano-Seal ghost', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2576484, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2578229, '100ft SDR thick wall pipe to extend drain', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2578808, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2579293, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2580573, 'Front yard Planting<br>
Prep area, weed barrier, 5 -1 Gals, 3-5 Gals, Brown shredded bark mulch, 40 Sq ft.<br>
 ', NULL, '2019-09-24 16:44:07', 1, '2019-09-24 08:06:41', 'Marybeth Jacobsen', 'Marybeth Jacobsen', 'sold'),
  (2583372, '<p>install 40 yards Class A Base,<br>
from front door to driveway entry , approx  20ft feet beyond front of house property line<br>
grade and compact</p>

<p>$4556<br>
<br>
3-24" Box Trees   $1270<br>
12-5Gallon shrubs  $480<br>
12-1 Gallon plants   $240<br>
<br>
Mulch shreaded   $1300  <br>
<br>
Irrigation/Drip  $1200<br>
<br>
Total  $9046<br>
 </p>
<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">see attached quote
includes 2 man days
1 mini excavator and flat pan compactor
truck will do most of spreading, finish grading with mini and compact...
should not take more than a day</div></div>', NULL, '2019-10-01 15:20:25', 1, '2019-09-25 07:34:26', 'Ryan Kleefisch', 'Ryan Kleefisch', 'lost'),
  (2585188, '<br>
Clean Seal new pavers with water based Natural look sealer<br>
<br>
fill joints that are missing sand', NULL, '2019-09-26 10:51:06', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2586301, '<p>install 40 yards Class A Base,<br>
from front door to driveway entry , approx  20ft feet beyond front of house property line<br>
grade and compact</p>

<p>$4556<br>
<br>
3-24" Box Trees   $1270<br>
12-5Gallon shrubs  $480<br>
12-1 Gallon plants   $240<br>
<br>
Mulch shreaded   $1300  <br>
<br>
No Irrigation / no warranty on plants<br>
<br>
Total  $7846</p>
', NULL, '2019-10-01 15:27:38', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (2587985, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2588845, NULL, NULL, NULL, 1, '2019-09-27 07:25:36', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (2589312, 'Extend block wall 35ft up to 2ft tan slump stone  $4500<br>
<br>
Upgrade firepit<br>
Add 8" bellecrete cap<br>
Face sides with high desert stone<br>
$1745<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Use 10" cap for firepit..not 8"</div></div>', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2589779, '1) Tap into main line and install new copper connection to ball valve.  Please confirm with Daniel the size of copper needed for main line. <br>
2) Install new ball valve and cover.<br>
3) Install new superior brass valve.<br>
4) Install battery operated actuator.<br>
5) Install new laterals and drip lines to new plants. <br>
<br>
Note to crew to install plants while there. ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2591145, '1 - 5 Gallon, multi Rossettes (if possible) for small direct poolside planting area<br>
6 - 5 Gallon Pittosperum tobira Wheelers Dwarf<br>
11- 1 Gallon Rhaphiolepis indica ''Ballerina''<br>
<br>
Crew Notes:  <br>
Backyard planting areas have been flagged with above plants accordingly.<br>
Do NOT remove Rosemary. Only the one dead one. <br>
Do NOT remove pink Geraniums. Client''s gardener will trim.<br>
DO remove all dead and living Yarrow, Penstemon, Phormium Flax. <br>
Follow instructions on flags with regard to Agapanthus.<br>
Call MB with questions.<br>
Readjust and check drip line placement accordingly as well as irrigation controller to accommodate change of weather. <br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Please see my Daily Log of 9/28.</div></div>', NULL, NULL, 2, '2019-09-29 20:26:57', 'Marybeth Jacobsen', 'Marybeth Jacobsen', 'sold'),
  (2591692, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (2593791, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2596529, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2596575, 'Redwood smooth Pergola $2,140.00<br>
Redwood smooth Trellis $1,051.00<br>
$3,191.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2598875, ' <br>
Additional lights<br>
 
<p> </p>

<p><b>2) LIGHTING</b></p>

<p>Up lights (in black):</p>

<p><a href="https://www.vistapro.com/product.aspx?catid=3&typeid=1&prodid=5">https://www.vistapro.com/product.aspx?catid=3&typeid=1&prodid=5</a></p>

<p> </p>

<p>Path Lights (in black):</p>

<p><a href="https://www.vistapro.com/product.aspx?catid=3&typeid=3&prodid=56">https://www.vistapro.com/product.aspx?catid=3&typeid=3&prodid=56</a></p>

<p> </p>

<p><b>2a) LOWER YARD LIGHTING ADDITIONS</b></p>

<p>We’d like to add some additional path/up lights to the lower yard</p>

<p>- 2 up lights: 1) under lemon tree and 2) in hill/shrubs pointing towards trees behind fire pit</p>

<p>- 4 path lights: 1) at beginning of new planting area at the bottom of steps, 2) on the alternate side along steps, 3) at the end of the current BBQ area,  and 4) one closer to the lemon tree (b/t fake grass and flagstone)</p>
', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2599604, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2599605, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2600743, '1100 credit<br>
980 material cost for coping', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2600747, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2601936, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2603209, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2603212, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2604803, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2609379, 'Substituting 2 - Aeonium "Sunburst"  - removing 2 - 5 Gals  Agave attenuata from plant list', NULL, '2019-10-16 14:19:48', 1, '2019-10-08 10:48:03', 'Marybeth Jacobsen', 'Marybeth Jacobsen', 'pending'),
  (2609562, 'One - 15 Gal Meyer Lemon Tree semi-dwarf (special price approved) $150<br>
$65 Light Warranty reinstall Fee', NULL, NULL, NULL, NULL, NULL, 'Marybeth Jacobsen', 'sold'),
  (2610771, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2611808, 'Plant selection approved by Client and Picture Build 10/7:<br>
45 - 1 Gal Trachelospermum jasminoides - Star Jasmine<br>
4 - 1 Gal    Pelargonium x hortorum Red - Common Red Geranium (not trailing)<br>
3 - 5 Gal    Grevillea  fililoba   - Spider Net Grevillea (red)<br>
4 - 5 Gal    Phormium Sundowner  - Sundowner New Zealand Flax<br>
3 - 5 Gal    Leucodendron ''Safari Sunset'' - Safari Conebush<br>
1  - 15 Gal    Prunus laurocerasus - English Laurel<br>
1 -  15 Gal    Phoenix roebillini - Pygmy Date Palm<br>
<br>
Repair Leaking Valve<br>
<br>
Lift 1 yellowing Chamaerops humilis palm keeping root ball above service. Amend with Palm Soil and Fertilize with Grow More -Palm Food.<br>
<br>
Client is requesting Daniel and Fidel''s Crew for install for October 16th.  If not available she is willing to wait for their availability. <br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Marybeth Jacobsen', 'sold'),
  (2612470, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (2613272, '1667 sqft', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2613275, 'Approx 1011 sqft of pavers', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2618318, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2618319, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2624046, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (2624051, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2625943, '1 - 15 Gal Blue Cedar - Warranty - Order from Green Thumb - Ask for 12'' Height - Send pic<br>
<br>
Client will Purchase the following and install himself:<br>
1 - 15 Gal Dodonaea viscosa  ''Purpurea''-  Hop Bush<br>
2 - 5 Gal Texas Ranger - Leucophyllum<br>
6 - 1 Gal Ceanothus Yankee Point<br>
<br>
1 Gallons@ $21.50<br>
5 Gallons@ $43.50<br>
15 Gallons@ $175.00<br>
<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Cedar under warranty due to broken valve issue. Clients purchasing all other plants from us and will install himself.</div></div>', NULL, NULL, NULL, NULL, NULL, 'Marybeth Jacobsen', 'sold'),
  (2627602, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2627609, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2629129, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2630071, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2630072, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2630171, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2634156, 'Move existing valves on side of house 20ft<br>to planter', NULL, '2019-10-28 22:36:20', NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2634283, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2635564, '<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><b><u>Planting and Related Services</u></b></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">1. (9) 1 gal heuchera “plum pudding” or silver,  - not purple palace or green varietys</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">2. (2) 1 gal coreopsis grandiflora</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">3. (1) 5 gal  Arbutilon “Red”</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">4. (1) 15 gal pomegranate</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">5. (1) Flat Vinca Major at front hillside</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">6. Move rose – no warranty</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">7. Add Drippers to Bougavillea and impatients at front entry</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">8. Fertilize all plans with Turf Supreme (1 handful per plant and water in)</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">9. Check Flax for overwatering</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">10. Trim back plants along north planter</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">11. provide owner with 1 bad Turf Supreme</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">12. provide bag of 100 drippers, roll spaghetti tubing, 100 staples.</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">13. Show Sharon how to install additional dripper</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><b>Price $2242</b></span></span></span><br>
<br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><b><u>Low Voltage lights</u></b></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">ADD (3) path lights along steps up the hill</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">Check lights and reposistion as necessary</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><b>Price $660</b></span></span></span><br>
<br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><b><u>Café lights install</u></b></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">1. Install (2) owner provided poles,          </span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">2. drill and install eye hooks on poles</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">3. install eye hooks on bldg. where shown</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">4. excavate approx. 2 feet and install poles with concrete</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">5. install owner provided café lights</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><b>Price $1465</b></span></span></span><br>
<br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><b><u>Decomposed Granite</u></b></span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">1. Add 1.5yards Decomposed granite</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">2. install approx. 1” over existing</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">3. grade and slope towards drains</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">4. move drain inlet near hillside</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif">5. lower (2) drains in DG and slope for proper drainage</span></span></span><br>
<span style="font-size: 11pt"><span style="line-height: 115%"><span style="font-family: Calibri, sans-serif"><b>Price $787</b></span></span></span><br>
 ', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2636747, 'NEW DESIGN<br>
<br>
PAVERS ADD 265Sqft - New Total  ADD $2120<br>
<br>
LAWN -Subtract 233Sqft New Total  -980Sqft<br>
Credit $806<br>
<br>
Total $1314<br>
<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">we charged $8 a sqft additional pavers here?</div></div>', NULL, '2019-11-11 16:59:45', 1, '2019-10-22 08:41:01', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2636839, 'extend Drain to sidewalk, <br>
Remove sidewalk if necessary<br>
core hole  in curb<br>
re-install existing lawn and or make repairs as necessary<br>
install per city standards provided with permit<br>
Does not include compaction testing, deputy inspector or permit cost<br>
$2200 + Permit  Allowance<br>
<br>
 ', NULL, '2019-10-22 12:31:34', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2636845, 'For curb Coring sidewalk and Rear electrical<br>
<br>
Permit Allowance $1500 (up to-not to exceed without further approval)<br>
permit cost include, drawings, permit running, including time at Building dept and permit fees<br>
 ', NULL, '2019-10-23 00:47:59', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2636982, 'Gas line ADD 45Ft to Fire-pit <br>
ADD $1575', NULL, '2019-11-22 17:39:56', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (2637339, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2637674, 'Tile overlay material allowance. <br>
<br>
$22.00 a square foot with a $5.00 budget for tile, over this amount Se Mi pays the difference<br>
<br>
136sqft + 209sqft = 345 sqft total in contract <br>
<br>
345 X $5.00 = $1725.00 allowance for tile. <br>
<br>
<br>
Actual order total $1,951.22 - $60.55 (grout) = $1890.67 (see attached)<br>
<br>
Difference in allowance vs actual = $165.67<br>
<br>
 ', NULL, NULL, 1, '2019-10-22 12:08:02', 'Mohammed Rahman', 'Mohammed Rahman', 'sold'),
  (2638576, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2643577, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2643579, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2644202, '1 gals - 29 @ 20 = 580<br>
75 5 gals @ 40 = 3000<br>
15 gals @ 175 = 1050<br>
total 4630<br>
benderboard  75ln@ 8 = 600<br>
<br>
Total : $5230<br>
<br>
Added into addendum : 3000<br>
<br>
Difference;<br>
Total : $2230', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'pending'),
  (2645941, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2646069, 'see attached proposal<br>
<br>
please double check plants listed against previous installed planting plan<br>
<br>
18,705.00', NULL, '2019-10-26 10:36:56', 2, '2019-10-30 11:41:44', 'Ryan Kleefisch', 'Ryan Kleefisch', 'lost'),
  (2646078, 'Trench and install 100ft drain line<br>
replace sprinklers as needed and repair irrigation lines damaged during install<br>
<br>
Price $4100', NULL, '2020-01-14 11:00:52', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2650751, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2651354, 'This includings the following.<br>
<br>
3 guys wednesday <br>
2 guys thursday<br>
2 guys friday<br>
3 guys monday (mason crew)<br>
<br>
This does not include materials used on jobsite. ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2655067, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2656933, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2657577, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2658631, '40 linear feet<br>
excavate approx 1.5ft from foundation. 2ft deep<br>
approx 5 yards soil removal<br>
install 5 yard crushed gravel<br>
40ft perforated drain line<br>
clean foundation of soil<br>
vertically waterproof foundation', NULL, '2020-01-14 10:59:57', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2659528, 'Using owners irrigation controller  -$400.00<br>
Adding 1 light transformer and 2 lights for the pilasters  + $850.00<br>
Add $450.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2659547, NULL, NULL, NULL, 1, '2019-11-01 13:07:58', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (2662939, NULL, NULL, '2019-11-04 17:34:25', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2662942, '2 drain modifications @ $65ea<br>
waterproofing $200<br>
24lnft drainage - $528', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2663610, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2666492, 'this is to balance out the account to 0', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2666548, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2670102, 'Credit of 2 bench seat walls<br>
<br>
-1806', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2670108, 'Taking out 2 pilasters', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2670119, '231 Square Feet.<br>
-809.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2670123, '852 of Additional pavers', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2670127, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2670242, 'see attached&nbsp;scope of work and approve', NULL, NULL, 1, '2019-11-07 08:01:05', 'Ryan Kleefisch', 'Ryan Kleefisch', 'lost'),
  (2674068, 'Area does not need to be excavated, this is for planters.  Using geotextile fabric  450 SF 2" down', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2674661, 'see attached plan , please approve/sign to approve', NULL, '2019-11-10 18:26:52', 1, '2019-11-10 13:08:06', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2674936, 'Add garden valve to bbq area', NULL, '2019-11-10 18:41:22', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2676074, 'please approve of the design attached', NULL, '2019-11-11 11:10:18', 1, '2019-11-11 10:29:17', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2676616, 'Need about 18&nbsp;lodgepole installed. $40 per stake installed.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (2677133, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2677236, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2677246, 'Additional gas line to start from gas meter 30&nbsp; LF', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2677254, '36 Linear Feet 3 GFIs', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2677260, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2678668, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2680415, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">3750 - our crew
3600 - eh crew
1949.75 - material</div></div>', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2680416, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2682782, 'Add 40ft New bender board edging<br>
 ', NULL, '2019-11-13 17:13:23', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (2682789, 'Add additional 3ft to bbq<br>
$800 per foot', NULL, '2019-11-13 17:12:13', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2682812, '1. Wire new owner provided lights (22)<br>
2. use owner provided wire and include  up to 500 additional feet 12/2 wire<br>
3. trench bury all wire 4-6'' Depth<br>
 ', NULL, '2019-11-19 10:26:12', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2682929, '<br>
<br>
(1) Large 36" Fruiting Manzanillo  15-18'' tall  - add $2,400 with delivery and installation. <br>
(2) 24" fruitless olives - add $1,500 with delivery and installation<br>
(2) Raised planters in 100% redwoos - 3''x10''  -add $2400 with veggie ready soils delivery and installation ($1800 without soils)<br>
Change sod to Pacific Medallion plus - add $175<br>
<br>
Lighting:<br>
<br>
(7) Hinkley Lighting 1530BZ Uplighting Spotlight,<br>
<br>
(12) Hinkley Lighting 1531BZ LED Path Light,<br>
<br>
(8) 15232 Hinkley Lighting 15232BZ Round Deck Sconce<br>
<br>
(1) New transformer<br>
<br>
Lighting total, installed with wiring.  $3150<br>
<br>
<br>
<br>
<br>
 ', NULL, '2019-11-15 10:12:53', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2684354, 'Upgrade paver to Castle Cobble distressed.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2687023, 'Irrigation controller + 2 lights/transformer - 450<br>
<br>
Various change orders - 762', NULL, '2019-11-22 13:34:20', NULL, NULL, NULL, 'Mohammed Rahman', 'pending'),
  (2688387, 'Put in Lodgepoles.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2689635, '(2) zones irrigation $1700<br>
Owner procided sprinkler heads (7)  credit $100<br>
Concrete demo credit $700<br>
<br>
$1700<br>
-$700<br>
<br>
Total $1000<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2690083, 'Maggie found someone else to install the pavers at $8.00 a square foot.&nbsp; all other work stays the same. I will let her know that the pavers need to go in first, with sleeves.', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2690410, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'pending'),
  (2690872, 'Permits and Engineering  $4587<br>
<br>
Designs - $800<br>
<br>
60 hours Permit and Engineering admin, city counter work @$80/hr - $4800.  Discount given to client ($1800).  Subtotal $3000', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2692429, NULL, NULL, '2019-11-19 09:57:13', NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (2692510, 'Add 8 more privets.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2692628, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2692695, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2692704, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2693913, 'Trench and install up to 95ft 3" drain pipe to front sidewalk', NULL, '2019-11-19 18:40:54', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2695515, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (2697956, 'Install new 3/4 Irrigation valve', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2700397, '86 SF X $12.00= $1,032.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2701908, 'up to 5ft Square Fire pit, 14" Height<br>
Angelus Rustic Wall and Cap <br>
Color Gray Charcoal<br>
1" lava rock gravel and 6-8" lava rock <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">includes 10% fire dept discount
no cuts , thinset together

gravel fill, 1" lava rock gravel and 6-8" lava rock</div></div>', NULL, '2019-11-22 17:41:23', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2703462, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2704383, 'ADD (4) additional bougainvillea on hillside  $150ea x4 =$600<br>
 ', NULL, '2019-11-25 13:39:28', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2706972, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">We will be adding drainage to the 45 LF on the first change order. Approved via text message see image</div></div>', NULL, NULL, 1, '2019-11-26 12:47:14', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (2710897, 'Install approx 20sqft sod near Bbq

Seed all rear lawns with winter  Rye grass
Finish with seed topper<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Steer manure</div></div>', NULL, '2019-11-29 07:53:42', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (2712809, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2715386, 'Using controller in contract. ', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2716308, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2716922, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Hi Marcie,</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Thank you for meeting with me today.  To confirm our discussion on finishing:</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Grass:</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Amount in contract                                                         1,588 square feet</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Credit for pavers taking out some grass                  -231 square feet</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">taken out in previous change order</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Credit for final grass amount                                       -359 square feet</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Final count for grass                                                        998 square feet</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">359 square feet X $3.50                                                 $1,256.00             CREDIT</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Mulch:</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Mulch in contract                                                             400 square feet</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Extra mulch in all planters except the side</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">                                                                                         + 450 square feet</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Total mulch                                                                        850 square feet of mulch</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Change order add                                                            450 X $1.50         $675.00  ADD</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Bender Board:</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Bender Board not put in contract</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">103 Linear feet X $8.00                                                   $824.00  ADD</span></span><br>
<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">TOTAL OF THIS CHANGE ORDER:                                $243.00</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Already Approved</span></span><br>
 ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2722557, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2723270, 'Install 5 powder coated 8ft posts <br>
not painted', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2723281, 'Upgrade (1) 24" box tree to Citrus<br><br>Owner to select type', NULL, '2021-01-30 17:33:37', NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2724345, 'continue anglia edger along back planter  up to 36ft<br>
add approx 8 anglia edgers atop already installed edgers in left corner to cover up exposed soil', NULL, '2019-12-26 12:44:52', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (2724347, 'along left fence ..connect with approx 20ft anglia edger', NULL, '2019-12-26 12:45:18', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (2724588, 'Excavate approx 3ft deep
Install concrete
And post anchors', NULL, '2019-12-13 17:42:50', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (2724615, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2725544, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">8 lights Vista 5106 textured black
Transformer 150 watts</div></div>', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2727881, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2728747, NULL, NULL, NULL, 1, '2019-12-09 17:25:38', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (2728749, NULL, NULL, NULL, 1, '2019-12-09 17:28:17', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (2728776, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Discount because wiring is already there, and frustration with the steppers not coming
2 uplights  Vista 5006 Black Standard
4 path lights Vista 6216 Black Standard</div></div>', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2730213, 'Ladbs 10/1/19 check # 6740      $445.48<br>
Ladbs 12/10/19 check # 6739    $1139.90<br>
Romb Engineering                      $2000.00<br>
<br>
Total                                             $3585.38<br>
<br>
does not include Permit plan drawing, running, meetings at ladbs, will include on additional allowanced approved by email on 12/10/19', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2730258, 'Additional Permit Allowance approved by email $3000 on 12/10/19<br>
<br>
to date Permit Running , meeting with Romb Engineering, meeting with LADBS, drawing and plan corrections<br>
at the rate of $120  16hrs x $120hr = $1920<br>
Ladbs downtown parking Fees 3x$30ea  = $90<br>
<br>
Allowance remaining  $990', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2731038, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2732863, 'Resetting posts. Tino agreed to $300. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2734166, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2734169, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2734233, '<p>405sqft pavers included in original contract<br>
650sqft pavers measured needed to complete<br>
<br>
245sqft pavers additional $2891</p>
', NULL, '2019-12-13 12:39:59', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2737537, 'Add 10 feef of 3" drain 
Extend rear slider pad out additional 16" and add 45sqft near spa area
', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2739013, '8-5gal. French Lavender 

9-5gal. Rosemary (Tuscan)', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2739014, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2739016, 'Need to credit 1-5gal. Legustrum (only be need 4)<br>
<br>
planted', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2739058, 'With a picture of the front yard
Use similar colors provided owner and apply them to the front of the house for the Hoa', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2740135, 'Re-using existing wall cap, add 1 row of 8" block to existing wall<br>
 ', NULL, '2019-12-23 07:27:08', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (2740164, 'Install 45ft 1" conduit at 18" depth with 8awg Wire for future Charging station in garage, connect into junction box<br>
run back an additional 3/4" conduit from garage for GFI protected electrical outlet<br>
disconnect all romex around backyard prior to digging for safety prior to trenching for safety from potential shock<br>
220v includes small sub panel in garage<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">$700 for small sub panel in garage</div></div>', NULL, '2019-12-17 08:02:29', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2740182, 'install 850sqft  SynLawn    St Augustine 547<br>
excavate approx 3" depth<br>
install 3" compacted base<br>
up to 150ft  bender board<br>
install 150Sqft gravel , re-use owners steppings stones, install bender board<br>
<br>
see plan attached <br>
<br>
<br>
<br>
 ', NULL, '2019-12-23 07:24:20', 1, '2019-12-18 22:34:50', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2743161, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2746469, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2746484, 'Gaps to be filled with del rio 3/4"', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2746647, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2747363, 'Mask and seal bbq countertop with water based wet look sealer', NULL, '2019-12-18 18:34:33', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2748521, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2748547, 'Added 30Sqft Sod   ADD$140<br>
Added Additional lawn<br>
Planting (new plant count based on final design) see attached<br>
(1) Citrus                           $825<br>
(2) 24" Box @ $385ea      $710<br>
(17) 15Gal @ $150ea       $2550<br>
(19)  5Gal  @ $40ea         $760<br>
(46) 1Gal  @ $$20ea        $920<br>
Total $5765.   Original budget $4305.       ADD $1460<br>
<br>
Pavers removed from contract -$4550<br>
<br>
<br>
<br>
Old contract price $27,616<br>
New contract price $27,322<br>
Change in contract price -$294<br>
 ', NULL, '2020-01-01 10:16:11', 2, '2019-12-31 13:55:41', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2749305, '8ft of 3" drainage ', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2749469, NULL, NULL, '2019-12-19 15:29:17', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2751123, 'Build paver step set in concrete and mortar', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2751870, 'Install a kit', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2754229, 'Excavate and install 280sqft decomposed granite 3"thick', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2754230, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2754959, NULL, NULL, '2019-12-26 14:06:48', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2754962, NULL, NULL, '2019-12-26 14:10:02', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2754969, NULL, NULL, '2019-12-26 14:09:37', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2754971, NULL, NULL, '2019-12-26 17:06:50', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2757181, 'install (8) 24x24" step pads made from pavers <br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'pending'),
  (2757269, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2757318, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2757445, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'pending'),
  (2757647, NULL, NULL, '2019-12-30 12:51:19', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2759130, 'Add wall cap in paver bullnose.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2759322, NULL, NULL, NULL, 1, '2019-12-31 20:21:53', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (2760137, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2760287, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2760431, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2760436, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2763064, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (2763067, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (2764319, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2765300, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2767670, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2767736, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2769885, NULL, NULL, NULL, NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2770332, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2774188, '3D conceptual design  for the Front Rear and Hillside<br>
<br>
- Plants rendered will be as similar as possible to what is available in the rendering program<br>
- Finishes will be as close as possible to actual <br>
-<br>
- These conceptual 3D renderings are not meant to be used as construction details but conceptually mimic spaces, textures and areas <br>
-Elevations will reflect similar elevations as onsite<br>
-3D Video on youtube  and personal virtual walkthrough with laptop will be provided <br>
-not to exceed 20 hours drawing<br>
<br>
1st Payment $1000<br>
Remainder due upon completion $1000<br>
<br>
Total $2000<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Ryan will do the 3D design</div></div>', NULL, '2020-01-12 01:13:34', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2776796, 'approve change order', NULL, NULL, NULL, NULL, NULL, 'Adel Villalobos - Marco', 'pending'),
  (2778018, 'Pick up pavers,  Clean Poly Sand<br>
<br>
Install new drain line tap in.   Reinstall pavers. ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2778487, '$400 for added drainage work.<br>
$500 for main line work. ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2778678, 'Drill and Epoxy new rebar at a 45Deg  angle  and epoxy into existing footing and bend so to improve connection<br>
41 linear ft', NULL, '2020-01-13 12:49:33', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2778737, 'Remove/Demo  existing block wall cap, $850<br>
Grout  wall solid in all cells not filled $1400<br>
install new 6" cap $1200<br>
<br>
<br>
Total $3450<br>
<br>
<br>
<br>
 ', NULL, '2020-01-13 12:49:47', NULL, NULL, NULL, 'Ryan Kleefisch', 'lost'),
  (2778956, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2782077, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Daniel to place vines</div></div>', NULL, '2020-01-14 13:56:02', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2784074, NULL, NULL, '2020-01-16 13:34:35', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2785577, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2792569, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2793652, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2795998, 'Plant allowance of 2000 was used to invoice deposit and final payment. 1000 on each. <br>
<br>
Final plant total was 2570.<br>
<br>
Plants were invoiced in full. 1570 and 1000.<br>
<br>
A credit of $2000 due. <br>
<br>
Given to invoice 0009 and 0018 for $1000 each', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2796145, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2796287, 'Upgrade to Montecito color
Use small/large Pattern 
Catalina grana 6x9 border

', NULL, '2020-01-21 15:42:58', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2796613, 'see attached "Article A" typed<br>
please approve<br>
Thank you', NULL, '2020-01-23 12:50:25', 1, '2020-01-22 22:35:08', 'Ryan Kleefisch', 'Ryan Kleefisch', 'sold'),
  (2801876, 'Additional turf 24 SF X $11= $264.00<br>
Drainage             8 additional LF $160.00<br>
Waterproofing    wall 34 LF $400.00<br>
Demo credit not removing 2 trees --$200.00<br>
Additional flagstone cost    $1.25 SF X 333 SF= $416.00<br>
???????Total $1,040.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2802707, 'Install (8) new Pottery pads.   Pavers set in concrete.  $1200<br>
Minua<br>
Credit for plant size count and change $500', NULL, '2020-01-24 10:46:04', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2802914, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2806362, 'Per contract install 1x3ft footing for 70ft block wall , no keyway equals  (up to  8 yards concrete  and excavation  included)<br>
Per contract install 30ft  garden wall included (2 yards)<br>
10 yards concrete included in contract<br>
<br>
Per Permits and Engineering install approx 2ftx7.5ft footing at 70ft  and keyway (approx yards required 38)<br>
Approx 30 additional yards concrete  needed above contracted to be paid by owner at the rate of $124yard which includes pumper fee. <br>
Approx $3720 +-  paid by owner directly on pour day a the rate of $124yard<br>
Additional  Excavation required for larger footing 30 yards at the rate of $907 paid directly to Excavator<br>
Keyway excavation by hand by picture build at the rate of $250<br>
<br>
<u><strong>Paid by Owner</strong></u><br>
Excavator $907       - paid to excavator<br>
Concrete $3720 approx     - paid to concrete company<br>
Keyway Trench labor $250    - paid to picture build<br>
<strong>Total approx $4877</strong><br>
 ', NULL, '2020-01-29 10:38:19', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2810252, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (2810474, '- saw cut concrete 30ft 350<br>
- install 11 feet of Channel drains  495<br>
- 1 deck drain 45<br>
- install 30ft brick  1200<br>
- trench and install 60ft of drain pipe 1320<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">breakdown
saw cut concrete 30ft $350
install 11 feet of Channel drains  $495
1 deck drain $45
install 30ft brick  $1200
trench and install 60ft of drain pipe $1320</div></div>', NULL, '2020-01-29 10:17:50', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2812603, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2814237, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2814447, 'Remove all shrubs trees  necessary to complete proposed landscaping<br>
 - includes removing rear yard bamboo, front tree, jacaranda tree, and shrubs front and back <br>
 - cleanup all areas from plant debris. blow rake and trim <br>
  - haul away all materials<br>
  -  Does not include rock demo<br>
<br>
includes up to 3-laborers (2-days, up to 48hrs labor)<br>
<br>
  ', NULL, '2020-01-30 11:57:59', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2814466, 'Jackhammer and remove approx 1 foot rock in rear yard<br>
- Haul away all rock<br>
- re-grade  soil back for lawn area<br>
<br>
<br>
estimated up to 32hrs labor - (2 laborers for 2 days)  approx  $2080<br>
 - lowboy at the rate of $650ea  - to haul away rock material<br>
<br>
Billed at the rate <br>
Labor  $65hr + Lowboy at the rate of $650ea<br>
<br>
Allowance $3000 not to exceed without further approval<br>
 ', NULL, '2020-01-30 11:58:32', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2816088, 'Deliver 13 -15 yards of mulch. <br>
Install in Planter beds.', NULL, '2020-01-31 07:36:12', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2816596, 'Pressure wash pavers. <br>
Top off joint sand. <br>
Apply joint stabilizer and penetrating sealer to all pavers.<br>
Prep outdoor kitchen concrete tops. <br>
Apply sealer to outdoor kitchen<br>
<br>
$2300<br>
<br>
Credit for Pottery Pads<br>
<br>
-$300<br>
<br>
Subtotal $2000', NULL, '2020-01-31 21:10:39', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (2818183, NULL, NULL, '2020-01-31 16:05:53', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (2821517, NULL, NULL, NULL, 1, '2020-02-03 16:46:38', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (2831709, '$198 each light', NULL, '2020-03-06 07:41:55', NULL, NULL, NULL, 'Ryan Kleefisch', 'sold'),
  (2832887, 'Additional pavers on side of house&nbsp; 238 SF', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2832897, 'using less poured concrete and more pavers', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (2832898, '1)  Garden Wall stucco 11 more additional LF X $175.00 = $1925.00<br>
2)  Water main 12 LF X $20.00= $240.00<br>
3) Side of house in pavers 230 SF X $12.00= $2,760.00<br>
4) Additional courtyard pavers 88 SF X $12.00= $1,056.00<br>
$5,981.00<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold');

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
