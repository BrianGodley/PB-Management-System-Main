-- ============================================================
-- v2 CO Enrichment — Batch 4 of 5
-- 1,337 CO updates (rows 4012-5348 of 6,685)
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
  (5396484, 'Add (12) 5 gallon plants Total
        (8) Ligustrum
        (4) Dwarf Bottlebrush

Add (4) 1 gallon plants Total
        (2) Tuscan Rosemary
        (2) Sage
        ', NULL, '2022-10-11 14:54:12', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5396493, 'Add 3/4” gravel for upper pathway with Weed Fabric', NULL, '2022-10-11 14:53:56', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5396503, 'Add a 2”x10” header board to delineate property line down upper area hillside ', NULL, '2022-10-11 14:53:34', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5397084, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5397091, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5397098, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5397799, 'Doing 3 layers of stucco both back and front of wall, including paper layer (over wood frame)<br />
Stucco will be sanded and match back to house', NULL, '2022-10-12 08:23:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5399316, '3/4" Del rio gravel for 200sqft ', NULL, '2022-10-13 08:35:29', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (5400384, 'Did not need to plant (2) 5 gallon plants and owner supplied the mulch ', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5404394, 'Lots of roots underneath grass took 2 additional man days.', NULL, NULL, 1, '2022-10-13 10:01:02', 'Carter Godley', 'Carter Godley', 'sold'),
  (5407525, 'Removal of mulch 1000
Decorative rock 2250', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5409995, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5410000, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5412935, NULL, NULL, '2022-10-17 09:04:40', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5413055, 'Credit for 20lf benderboard
Dg to mulch
Turf to concrete ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5414553, NULL, NULL, '2022-10-17 12:34:31', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5416081, 'Price difference for 1 gallon to 5 gallon', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5416191, NULL, NULL, '2022-10-17 22:23:29', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5416404, ' added turf 
159.5  @ 
$11. Per square feet 
 
Total $1754.50', NULL, '2022-10-17 18:02:01', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5418788, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5420165, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (5420169, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (5420570, '8lf three courses high with cap

850', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5420689, 'Replace 1 1/4" gas line from corner of the house to pool equipment  Existing gas line is leaking and is not holding pressure', NULL, '2022-10-18 16:08:00', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5420698, 'Reduce cost of 1 1/2" gas line to 1" in the ', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5420704, 'Add 3/4" electrical conduit only to future BBQ area from pool equipment area', NULL, '2022-11-03 14:37:39', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5423993, NULL, NULL, '2022-10-20 14:53:49', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5425321, 'Removal of planter bed', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5425326, 'Installation of only 1 set not 2 sets of arbor posts', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5430521, 'Add mulch to existing planters in frontyard', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'pending'),
  (5433003, NULL, NULL, '2022-10-23 16:17:35', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5433005, NULL, NULL, '2022-10-23 16:14:26', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5433020, NULL, NULL, '2022-10-23 16:11:58', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5433022, 'Not entire zone, just valve ', NULL, '2022-10-23 16:10:51', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5433026, '57 LF of 3" sdr
5 inlets
1 pop-up ', NULL, '2022-10-23 16:09:18', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5436193, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5436277, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5439213, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5439518, 'Remove concrete along the fence : 22’L X 2’W', NULL, '2022-10-25 10:54:50', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5439597, 'Grade backyard to match existing concrete level. 
Grading includes excavation and hauling of material. 
Approx. 7” difference from concrete and grass ', NULL, '2022-10-28 10:08:36', NULL, NULL, NULL, 'Alex Trinidad', 'lost'),
  (5440231, '
Run 54 LF of 4inch SDR35
Install 6 Drain inlets. 
', NULL, NULL, 1, '2022-10-25 10:15:42', 'Alex Trinidad', 'Alex Trinidad', 'sold'),
  (5440329, 'Extend new planter box bed additional 10LF', NULL, NULL, NULL, NULL, NULL, 'Alex Trinidad', 'pending'),
  (5440369, 'Install 190 sqft of paver for patio extension.
Similar to plan layout. ', NULL, NULL, 1, '2022-10-26 10:46:35', 'Alex Trinidad', 'Alex Trinidad', 'sold'),
  (5440422, 'Install new valve and connect to existing irrigation system for side planter. 

Fix and cap any broken pipe.
', NULL, NULL, 1, '2022-10-25 10:13:52', 'Alex Trinidad', 'Alex Trinidad', 'sold'),
  (5440608, 'Install expansion joint felt around concrete for weep screed. ', NULL, '2022-10-25 10:53:57', NULL, NULL, NULL, 'Alex Trinidad', 'sold'),
  (5441036, 'Drill into concrete and add rebar dowels.
Rebar dowels will have anchoring epoxy to bond.', NULL, '2022-10-25 16:31:48', NULL, NULL, NULL, 'Alex Trinidad', 'sold'),
  (5442913, 'Add approximately 120 sq ft of concrete to “firepit sitting area” ', NULL, '2022-11-03 14:37:50', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5442917, 'Remove 1 column at driveway ', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5442921, 'Removal of approximately 120sq ft of turf in “firepit sitting area”', NULL, '2022-11-03 14:37:56', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5442927, 'Add 80 linear ft of drainage deck drains and French drains as a combination between the 2 ', NULL, '2022-11-03 14:37:15', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5442929, 'Additional 4 low voltage lights discounted', NULL, '2022-11-03 14:38:10', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5442931, 'To remove rebar and forms to make way for retention footings and replace once complete', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5442937, 'Additional concrete to pour retention footings along various areas ', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5445000, 'Install 35LF of 4inch SDR35 pipe.
Install 5 inlets', NULL, NULL, 1, '2022-10-26 09:32:39', 'Alex Trinidad', 'Alex Trinidad', 'sold'),
  (5450653, 'water permeable weed Fabric for 3200 sq ft&nbsp;<br />
anchored down with galvanized landscape staples<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5450665, 'ten plants from 1 gallons to 5 gallons @ 22 each<br />
<br />
$220<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5451982, '(1) flat dymondia
Reconnecting all the irrigation ', NULL, '2022-10-27 16:39:43', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5452009, 'Paint ready redwood<br />
8'' wide<br />
2 1/2 feet deep<br />
2'' tall<br />
<br />
 ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5453908, 'Remove a 4’x4’ tree stump centered in the rain garden.', NULL, '2022-10-28 10:08:14', NULL, NULL, NULL, 'Alex Trinidad', 'sold'),
  (5454229, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5456163, 'Demo 7-8 inches for paver installation.
Install Grey Charcoal Courtyard pavers. 
Polymeric sand included for joints.
Approx. 638 sqft', NULL, NULL, 1, '2022-10-30 14:04:34', 'Alex Trinidad', 'Alex Trinidad', 'sold'),
  (5459301, 'Cost of material only - not for installation.<br />
314 SF @ $3.59 (contractor price for turf)<br />
<br />
Client can keep extra pieces of turf waste.<br />
<br />
&nbsp;<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">We will need to charge for rectangle shapes in 15'' width x length for turf not by SF because with curves there''s too much waste.  This is not economical or sustainable, especially the plastic waste.</div></div>', NULL, '2022-10-31 14:59:47', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5459847, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5468969, 'Fill in rock for pots and planters', NULL, '2022-11-02 14:55:01', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5472027, NULL, NULL, '2022-11-03 17:52:30', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5472573, NULL, NULL, '2022-11-03 17:51:45', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5472577, NULL, NULL, '2022-11-03 17:50:59', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5472586, 'We cannot get pincushion. Here is the credit.', NULL, '2022-11-03 17:49:53', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5473517, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">60 sq ft at $11 a sq ft ($660)and a material change order for 70 sq ft at 3.90 a sq ft  for $273 for a total of $933</span></span><br />
 ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5473695, NULL, NULL, '2022-11-03 18:44:29', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5473765, NULL, NULL, '2022-11-03 17:47:47', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5477053, 'Minimized planter and turned into turf', NULL, '2022-11-04 17:25:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5477059, NULL, NULL, '2022-11-04 17:24:50', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5477063, 'Pull up pavers in 2 areas to convert to planters 
May need pavers

Add bend a board
Move irrigation 
Convert planter area into more turf

', NULL, '2022-11-12 08:14:45', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5482429, 'We are CANCELLING the turf strips for the driveway. <br />
<br />
Line item under DEMO - #4. Saw cut at 4" pad only approx. 220 LF ($1,833) - **we are still doing saw cut around black tile patio. 20 LF**<br />
Item labeled TURF all line items ($877)<br />
<br />
Credit includes all labor and materials as cost in contract addendum for the line items listed above.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Concrete needs to be refurbished first and then maybe after our project she will think about doing it. It is a lot of saw cutting and measurements are off with the layout so it wouldn''t be equal distanced strips.</div></div>', NULL, '2022-11-08 14:45:05', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5482439, '<strong>add 36 LF</strong> to gas line.<br />
<br />
We cannot take the gas line from the box outside, Jorge said that you could get a drop in BTUs in your shower/hot water output so we have to get it nice and clean from the gas meter.<br />
<br />
Cost includes trench and backfill as stated in contract addendum @ $33/LF<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">I was out there with Daniel and he said we would take it from that box so that''s where I measured it from, know I know better that we cannot take gas from the shower or other areas of the house, only from the meter.  I hope that is correct.</div></div>', NULL, '2022-11-08 14:44:45', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5482503, 'This is for the interior patio area with Wayfair hexagon tile only.  We made the patio 1'' wider and the side area 1'' wider.  21'' SF + 13''6" SF + little pathway inbetween blue fescue 10''4" SF = 45 total SF increase.<br />
<br />
(does not include the area where the "steppers" and blue fescue are)', NULL, '2022-11-08 14:43:54', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5482535, 'In the "flood area" of the property along existing pathway near garage we are suggesting a drainage system that can allow water to penetrate deep down.<br />
<br />
Gravel bed 2-3'' down<br />
Soil on top, then DG and plants<br />
2 inlets<br />
PVC pipe from inlet to gravel well', NULL, '2022-11-08 14:42:16', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5482556, NULL, NULL, '2022-11-07 17:34:50', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5482557, NULL, NULL, '2022-11-07 17:34:23', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5482558, NULL, NULL, '2022-11-07 17:33:56', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5482560, NULL, NULL, '2022-11-07 17:33:21', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5484564, NULL, NULL, '2022-11-08 14:41:55', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5490837, '3/4" Electrical conduit and electrical for Fountain from Pine tree to fountain', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5493067, 'Reduction of plant sizes for 19 Tropicana plants
255
', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5496278, 'Add 14'' of Drains of the corner of the house ', NULL, '2022-11-11 17:18:25', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5497213, NULL, NULL, '2022-11-11 15:48:19', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5501716, '27 LF. 3 courses $3,523.
24 LF. 1 course.  $1,400.
16 LF. 2 courses $1,050.

Back fill.                $1,100.

 ', NULL, '2022-11-14 10:51:25', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5503541, NULL, NULL, '2022-11-17 21:02:17', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5503746, 'Details are listed on revised estimate', NULL, '2022-11-15 06:14:09', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5509927, NULL, NULL, '2022-11-17 03:50:51', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5512183, 'Steps to be constructed with paver block for 48 linear feet&nbsp;', NULL, '2022-11-16 22:53:18', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5512190, NULL, NULL, '2022-11-16 22:53:00', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5512196, NULL, NULL, '2022-11-16 22:52:46', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5512257, NULL, NULL, '2022-11-16 22:52:27', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5513505, NULL, NULL, '2022-11-17 14:51:54', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5516307, '10 path lights are being upgraded to Vista 4203 @ $13/each extra costs.', NULL, '2022-11-17 21:02:47', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5516624, '<u><strong>Day 1</strong></u>: Trimming, clean up, lighting check and glue, Brick repair with saw cut, grading, root cutting (if tree is the issue) - 3 guys labor plus material $2,300<br />
<br />
<u><strong>Day 2</strong></u>: Planting, compost, mulch, and irrigation including audit of irrigation. $3,496<br />
<br />
Included in Day 2 costs:<br />
- 957 SF of matching mulch at 2-3" depth (no weed barrier) $1,876<br />
- Adding compost amendments to base of all plants $100<br />
- (10) 1 gallons - $230<br />
- (12) 5 gallons - $540<br />
- Adding emitters to new plants and adding 2 emitters where necessary. $100<br />
- Audit of all irrigation in frontyard $650 - one guy, all day.', NULL, '2022-11-29 19:31:33', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5516660, 'going from a 15 gallon to a 24" box.', NULL, '2022-11-21 12:46:03', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5516664, 'We dont need that many!', NULL, '2022-11-17 20:58:05', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5517810, NULL, NULL, '2022-11-21 12:43:40', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5519984, NULL, NULL, '2022-11-22 09:09:43', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5519985, NULL, NULL, '2022-11-22 09:07:35', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (5522039, NULL, NULL, '2022-11-21 12:43:26', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5522061, 'Total of 3 path lights need approval to order lights&nbsp;<br />
need to order 2 more lights.', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (5522694, '(5) 5 gallon shrubs (Grevillea and Salvia Clevelandii)
(18) 1 gallon plants (Rosemary, Ceanothus)
(1) 15 gallon Yuzu ', NULL, '2022-11-21 10:30:01', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5530543, 'Install (2) Brass valves instead of standard installation valves. ', NULL, NULL, 1, '2022-11-23 10:27:34', 'Alex Trinidad', 'Alex Trinidad', 'sold'),
  (5532209, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5532422, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5535194, NULL, NULL, '2023-01-17 19:50:59', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5535661, 'Adding and checking lights that went out in front.<br />
<br />
(3) Up - FL-105B in 2700K 5.5W<br />
Cost includes wiring and all labor.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Make sure order matches what we purchased first time around.</div></div>', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5540368, 'Remove 5 (1 gallon) plants along back fence.<br />Remove 1 (15 gallon) Schefflera <br />
 ', NULL, '2022-11-29 13:26:29', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5542655, 'Did not end up needing bending board for planters ', NULL, NULL, NULL, NULL, NULL, 'Alex Trinidad', 'sold'),
  (5542687, '10sqft paver install plus removal of curb', '2022-11-29 15:54:00', '2022-11-29 16:47:22', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5542717, 'Remove 2” of soil and gently grade planter.
Install shredded mulch ', '2022-11-29 16:03:00', '2022-11-29 16:46:54', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5545084, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5545108, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5545600, NULL, NULL, '2022-11-30 15:39:29', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5549104, '30 LF. ', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5549120, 'Brown shredded ', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5549733, 'Adding approx 370sqft of concrete total&nbsp;<br />
Design was slightly off in terms of measurements plus added some additional concrete for ADU area', NULL, '2022-12-01 12:14:46', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5549736, NULL, NULL, '2022-12-01 12:09:37', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5549981, 'Includes demo and hauling. Stump grind if necessary. Leave soil at grade, flat ', NULL, '2022-12-08 15:26:52', 1, '2022-12-01 13:10:33', 'Nicole Antoine', 'Nicole Antoine', 'lost'),
  (5550111, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">5 x $25 credit for downsizing from 5g to 1g for Crassula Rippe Jade.</div></div>', NULL, '2022-12-07 18:50:52', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5550164, 'One bag for Ficus benjamina.

2nd bag for repotting existing overgrown plant into old pot that had dead ficus. Labor for replanting add $25.', NULL, '2022-12-08 15:26:14', 1, '2022-12-01 13:12:16', 'Nicole Antoine', 'Nicole Antoine', 'lost'),
  (5550384, '20 SF extra Montana gravel @ $12/SF. <br />
3" depth includes weed barrier.', NULL, '2022-12-01 14:43:48', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5550392, 'We are not removing 2 potted Ficus trees (from pool decking area. They will stay in their pots.)<br />
&nbsp;', NULL, '2022-12-08 15:24:37', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5550824, 'no cost', NULL, '2022-12-04 15:20:01', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5550837, 'Transplant 5 mexican sage to new area @ $15 each.<br />
Labor and irrigation emitter to new plant location included in cost. <br />
<br />
**Does not guauntee that plant will live in it''s new spot. Voiding plant warranty.', NULL, '2022-12-04 15:19:47', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5550838, 'No charge, this is under our warranty (from final job walk!)', NULL, '2022-12-04 15:19:33', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5550849, '4 on each side of walkway to back fence/gate.&nbsp;', NULL, '2022-12-04 15:19:15', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5550854, 'No charge this was under warranty (from final job walk!)', NULL, '2022-12-04 15:18:59', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5550860, 'Meadow: Karelaine suggested <a href="http://soilssolutions.com/california-native-grass-sods/#preservationmix" target="_blank">Native preservation mix</a>.  We discussed if you purchase the material we will remove the old sod and install with costs based on $650/per man day.  Jorge estimates that it will take 3 guys, 3 days to remove dead sod, check irrigation, prep soils and roll out sod. If they do it faster, then we will credit you.<br />
<br />
Cost is for 3 guys, 3 days.<br />
Included is: unloading sod (if needed to help speed up install, we should plan for the delivery while we are on site if possible, on our 2nd day), the dump fees for dead sod, amendments (if needed), testing and repairs to grid irrigation (if needed) and install of new sod.', NULL, '2022-12-04 15:18:37', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5551100, 'This is option 2: CMU block with stucco finish<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">This is option 2: CMU block with stucco finish</div></div>', NULL, '2022-12-02 11:11:49', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5551150, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5555904, 'This is for the additional walkway in the front and to extend the paver walkway between garage and patio', NULL, '2022-12-17 08:49:27', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5555918, 'This is the removal of soldier course along the walkway between garage and patio&nbsp;', NULL, '2022-12-17 08:50:14', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5559436, 'Original scope of work was for 4 valves,&nbsp; We are deducting 1 Valve and using that deduction towards additional necessary drainage for the paver area.&nbsp;&nbsp;', NULL, '2022-12-06 09:11:48', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5566762, 'For string lights to plug in behind hedge', NULL, '2022-12-07 18:50:13', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5566893, 'verb approval via arely with bryan', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5566903, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5566949, 'swapping from lava rock to black mexican beach pebble. this is the price with the credit applied.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">swapping from lava rock to black mexican beach pebble</div></div>', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5567647, 'Removal of flagstone steppers along backyard turf', NULL, '2022-12-08 09:17:43', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5567666, 'Removal of bendaboard edging in backyard turf area', NULL, '2022-12-08 09:19:20', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5567680, 'Add flagstone cap to backyard pony wall', NULL, '2022-12-08 09:20:10', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5572062, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5572237, 'Additional 40 LF of Benda Board along Gravel and Mulch', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5572247, 'Add 3 Concrete steppers along Garage wall', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5572259, 'Plant (2) 5 Gallon Cassia''s by wood garden fence', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5572274, 'Replace Leaking Hose Bib by Pool cost 65', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'pending'),
  (5572291, 'Replace Walk on Mulch for 3/8" Del Rio Gravel', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5572310, 'Replace Leaking Main Line Shut Off Valve on Side of the House cost 165', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'pending'),
  (5572354, 'Add homeowner provided flagstone steppers to create a pathway from path to patio', NULL, '2022-12-09 14:56:53', NULL, NULL, NULL, 'Brian McBride', 'pending'),
  (5578509, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5582646, 'Not removing:

7- 1 gallon $70
3 - 5 gallons $120', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5582658, 'Not tilling side yard see contract #3 in demo.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5584451, 'Credit for three man days.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Thank you everyone that is a 100% WRAP!</div></div>', NULL, '2022-12-14 15:36:58', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5588065, 'Left of driveway 
(4) Dianella
(4) Regal Mist Muhlenbergia', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (5590536, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (5591184, NULL, NULL, '2022-12-15 16:46:00', NULL, NULL, NULL, 'Jorge Flores', 'lost'),
  (5591318, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (5591325, NULL, NULL, '2022-12-15 10:06:05', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5591331, NULL, NULL, '2022-12-15 10:06:56', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5591970, 'We could not get (9) 1 gallons @ $22/each.

Bea might get the natives she wants and we will plant them.

We will need to charge for LABOR only @ $10 per 1 gallon.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5592976, 'one more plant ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5593535, NULL, NULL, '2022-12-22 14:54:18', NULL, NULL, NULL, 'Jorge Flores', 'lost'),
  (5594201, 'Add 3 additional low voltage lights to backyard', NULL, '2022-12-16 09:16:04', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5595333, 'design credit. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5595575, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5595846, 'Install 144LF of block wall,
Sand stucco finish,
Includes Hand trowel stucco cap. ', NULL, NULL, NULL, NULL, NULL, 'Alex Trinidad', 'sold'),
  (5596352, 'Additional Drainage&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5596657, NULL, NULL, '2022-12-23 09:11:15', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5600997, NULL, NULL, '2022-12-20 11:50:44', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5601961, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5602198, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5602205, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5603100, 'We did not install cardboard under mulch.
Credit for labor.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5604306, 'Connect downspouts to existing drains', NULL, '2022-12-20 18:37:26', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5604962, NULL, NULL, '2022-12-21 21:24:11', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5604963, 'price to be added once linear feet is confirmed', NULL, '2022-12-21 21:23:22', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5606348, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5606604, NULL, NULL, '2022-12-21 21:24:01', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5607754, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5608164, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">upgrade in plant size for purple smoke trees (2)</div></div>', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5609422, '+100sqft of concrete with top cast #25/#5
(Measurements on original plan incorrect)
Concrete was remeasured after job walk once grading was completed. Spoke with client about this before forming was installed.
', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5609429, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5611235, 'Pool plumbing reroute ($10500),<br />
New pool lights (3) ($3600),<br />
Pool skimmer repair ($2000) ,<br />
Backfill and compaction front and back (16HRS= 1600),<br />
Spa plumbing valves relocation ($1750).<br />
Waterline tile removal, plaster removal, replaster for waterline,waterproof waterline tile, reset waterline tile ($4000).', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5611718, 'Poolside Planter clean out of mint and mix of plants.&nbsp; Add (9) 1 gallon plants in the backyard + $75.00 for 1 yard of mulch, labor cost plus material', NULL, '2022-12-28 00:48:35', NULL, NULL, NULL, 'Brian McBride', 'pending'),
  (5611791, 'Based on the new layout, it looks as though there is an overage in sq footage.&nbsp; If you can approve this, when We are finished with the installation We can credit any sq ft over or under accordingly.&nbsp;&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'pending'),
  (5612864, NULL, NULL, '2022-12-23 13:13:20', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5612929, 'Install 32LF of ACQ Green timber ', NULL, NULL, 1, '2022-12-23 11:43:28', 'Alex Trinidad', 'Alex Trinidad', 'sold'),
  (5613617, '1 1gal<br />
4 5gal', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5613738, 'Credit for (4) full size boulders. ', NULL, NULL, NULL, NULL, NULL, 'Alex Trinidad', 'sold'),
  (5615020, NULL, NULL, '2022-12-30 16:16:07', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5618207, NULL, NULL, '2022-12-28 15:58:42', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5618260, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5619385, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5621745, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5622379, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5624295, 'remove flagstone, add 2-3" of gravel in area between pavers and putting green for approx 60sqft and small bed against house to left of new pavers for roughly 24sqft', NULL, '2023-01-04 00:16:35', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5625580, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5625835, '18 linear feet of bbq L shape<br />
smooth stucco finish color&nbsp; tbd<br />
concrete top color tbd<br />
5 electrical outlets (one for the bbq area, fridge) 3 for the exterior&nbsp;', NULL, '2023-01-06 09:36:53', NULL, NULL, NULL, 'Daniel Aguilar', 'lost'),
  (5625903, '160 linear feet of drainage with 14 inlets/ connection points<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">160 linear feet of drainage with 14 inlets/ connection points</div></div>', NULL, '2023-01-06 16:42:32', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5625931, '5x5x3 drainage pit<br />
5 feet down<br />
5 feet wide<br />
3 feet deep<br />
backfilled with gravel<br />
<br />
$560<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">5x5</div></div>', NULL, '2023-01-06 09:38:01', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5625966, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">stump grind of large palm
$250</div></div>', NULL, '2023-01-06 09:37:42', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5626699, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5632442, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5637087, 'Medium bark mulch with weed barrier in planters', NULL, NULL, 1, '2023-01-06 15:31:12', 'Alex Trinidad', 'Alex Trinidad', 'sold'),
  (5649532, '30 5 gallons in contract<br />
28 installed&nbsp;<br />
43.50 x 2 = $87', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5649538, 'Removing pilasters from contract&nbsp;<br />
<b>$3,198</b><br />
additional concrete/demo work', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5649646, 'Credit from the design contract', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5649648, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5649652, '42 Linear feet additional wall averageing 18" high X $115.00 a linear foot= $4,830.00<br />
 ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5649655, '48 linear feet of additional pavers, X $15.25&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5650656, 'Approved via text ', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5650667, NULL, NULL, '2023-01-12 09:02:32', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5650670, NULL, NULL, '2023-01-12 09:04:28', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5655055, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5656182, '(1) 5 gallon leucadendron for corner
(1) 5 gallon agave Americana for in front of window
(6) 1 gallon Sea Lavender 
(1) 5 gallon Yucca golden sword 
(1) 5 gallon Aloe

(1) yard shredded mulch', NULL, '2023-01-13 12:58:15', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5656391, NULL, NULL, '2023-01-13 12:57:11', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5656562, 'To hold DG in along the side where the fence has gapping ', NULL, '2023-01-24 10:10:35', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5658837, 'Credit for a 5 Gallon Strawberry tree', NULL, '2023-02-05 17:08:36', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5658843, 'Charge for 15 Gallon Strawberry tree', NULL, '2023-02-05 17:07:47', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5659914, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5664005, 'Saw cut 62 LF of 4" concrete on neighbors side.
Along house complementary per Jorge.', NULL, '2023-01-23 11:25:57', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5664025, '(5) inlets @ $65/each= $325
(1) popup $50
65 LF 3" SDR pvc pipe $1,400', NULL, '2023-01-23 11:25:44', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5664029, NULL, NULL, '2023-01-23 11:25:28', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5665008, 'Allowance for Permitting.<br />
We will share permit cost with you and our billed hours (@$120/hr.) then we will credit back the difference.<br />
Public Works permits are faster than going through planning so shouldn''t be that bad. Thank you!', NULL, '2023-01-27 15:04:01', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5666087, NULL, NULL, '2023-01-18 15:16:37', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5666108, '15 gallon for 5 gallon<br />
(2) 1 gallon plants <br />
(1) 5 gallon plant<br />
(2) 4" plants<br />
 ', NULL, '2023-01-17 20:05:28', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5668376, 'Backyard adding a drainage run from corner of garden bed near pathway (with 1 inlet) to drain beneath small boulders (with 1 catch basin)<br />
Frontyard we will be reshaping existing dry creek to create better drainage pathway using existing gravels/rocks', NULL, '2023-01-20 06:22:51', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5668381, '(4) Dianella ''Lil Rev''', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5669681, 'We are not doing the fountain in this phase.&nbsp; Maybe in Phase 3.', NULL, '2023-01-19 20:58:15', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5669726, 'Material costs in estimate - $150<br />
Actual cost of Bloodgood Maple - $250', NULL, '2023-01-19 20:57:50', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5678663, NULL, NULL, '2023-01-23 11:25:10', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5678667, 'Credit: $865<br />
<br />
Maple original cost($385) + approved maple change order($100) = $485<br />
4 (1 gallon) Sea Thrift = $100<br />
4 (5 gallon) Kalanchoe bracteata (Silver teaspoons) = $180<br />
3 (1 gallon) Echinacea angustifolia = $75<br />
2 - 4" Large Italian Basil = $25', NULL, '2023-01-23 11:24:42', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5681484, 'Add 2 additional ground lights ', NULL, '2023-01-23 11:28:23', NULL, NULL, NULL, 'Alex Trinidad', 'sold'),
  (5681491, 'Build step along patio section- 18LF ', NULL, '2023-01-23 11:26:43', NULL, NULL, NULL, 'Alex Trinidad', 'sold'),
  (5681509, NULL, NULL, '2023-01-23 11:28:04', NULL, NULL, NULL, 'Alex Trinidad', 'sold'),
  (5682536, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">224 sq ft of concrete $4592</span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">135 additional linear feet of additional forming for turf strips $650</span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">82 linear foot of turf strips at $23 per linear foot $1886</span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">44 linear feet of drainage 5 inlets $1550</span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">$8678</span></span>', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5687054, 'As per design plan ', NULL, '2023-01-25 15:40:54', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5687056, NULL, NULL, '2023-01-25 15:40:43', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5687066, '1 Zone ', NULL, '2023-01-25 15:40:30', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5687847, 'Removal of gate/track/motor is not possible due to the severity of the system', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5687851, 'Lower the existing sewer line in the driveway.  The current condition it that is just under the surface of the concrete driveway.  Needs to be lowered by 12'' below grade ', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5690917, NULL, NULL, '2023-01-25 14:46:02', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5690928, '10- 1.gal.
2- 15.gal.
12- 5gal.', NULL, '2023-01-25 14:47:02', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5691802, NULL, NULL, '2023-08-07 18:55:16', NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (5691804, NULL, NULL, '2023-08-08 20:13:18', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5693607, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5694568, '2 matching path lights WITHOUT bulbs from Vista.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">i already ordered with Jose Luis from Irrigation Express.</div></div>', NULL, '2023-02-01 09:05:05', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5695630, NULL, NULL, '2023-01-26 18:57:49', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5695645, NULL, NULL, '2023-01-26 18:58:05', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5695661, NULL, NULL, '2023-01-26 18:57:31', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5695672, 'See contract credit for 3 15gallon at $175.00 each', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5695809, '$12.00 @ LINEAR FOOT X 90 LINEAR FEET= $1,080.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5698569, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5699752, '<div style="margin-left: 8px"> </div>

<ol>
	<li style="margin-left: 8px"><span style="font-family: Times New Roman, Times, serif">Turf prep </span></li>
	<li style="margin-left: 8px"><span style="font-family: Times New Roman, Times, serif"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="color: black">Install 2” of class II roadbase, compact</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-family: Times New Roman, Times, serif"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="color: black">Install 1” of DG subbase, compact</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-family: Times New Roman, Times, serif"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="color: black">Install roughly 660sqft of turf (turf to be ordered by client/price of the turf not included in total cost)</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-family: Times New Roman, Times, serif"><span style="font-size: 11pt"><span style="line-height: 105%"><span style="color: black">Stake, staple and S seam all joints </span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-family: Times New Roman, Times, serif"><span style="font-size: 11pt"><span style="line-height: normal"><span style="color: black">Install bender board for approx 20 linear feet to separate tree in front yard from turf</span></span></span></span></li>
	<li style="margin-left: 8px"><span style="font-family: Times New Roman, Times, serif"><span style="font-size: 11pt"><span style="line-height: normal"><span style="color: black">Install bender board for new shrub for top left slope  roughly 20 linear feet </span></span></span></span></li>
</ol>
', NULL, '2023-02-23 12:53:33', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5699754, NULL, NULL, '2023-02-01 19:59:50', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5704732, 'Removal of waterfall feature.&nbsp;<br />
Installing new prefab water feature.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Removal of waterfall feature. 
Installing new prefab water feature.</div></div>', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5704736, 'Prodigy Design credit for installation.<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5704737, '51 linear feet of copper plumbing at $55 per lnear foot&nbsp;', NULL, '2023-02-05 09:32:59', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5704748, 'New estimated turf amount is 225 sq ft (60 sq ft more than contracted amount at 17 per sq ft', NULL, '2023-02-05 09:32:07', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5709445, 'Cost in contract is added incorrectly

Will credit $1165. 50

Brings contract for backyard to $21,551. 50', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5710020, 'Apply sealer for the Driveway pavers.&nbsp; This is only for the main driveway..for both driveways it will be an additional $450.00', NULL, '2023-02-01 09:32:25', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5712975, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (5713005, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5716519, 'Install (4) recessed lighting fixtures.

Install ceiling fan fixture.

Install one outlet.

Install 2 light switches. 
', NULL, '2023-02-02 15:06:54', NULL, NULL, NULL, 'Alex Trinidad', 'sold'),
  (5716881, NULL, NULL, '2023-02-02 17:25:38', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5718645, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5719929, 'No need for the additional valve', NULL, '2023-02-22 18:35:37', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5719958, 'Additional 4 Stations for Rachio ($424.00)<br />
<br />
Install new 1" main Pressure Regulator plus Pressure Relief Valve for Water main ($635.00)<br />
<br />
Run new irrigation wire from front irrigation valves to the backyard ($225.00)<br />
<br />
<br />
<br />
<br />
<br />
 ', NULL, '2023-02-22 18:35:10', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5719986, 'Add (5) Flood Lights  ($1,125.00)<br />
Add (2) 24" box trees ($770.00)<br />
Add (17) 5 Gallon plants ($739.50)<br />
Saw cut and demo concrete by corner of house ($725.00)', NULL, '2023-02-04 13:11:39', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5729188, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">3150 for wall
300 for compaction</div></div>', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5729195, 'Additonal rock installed&nbsp;<br />
673 sq ft more than contracted amount<br />
<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5732044, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5734830, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (5737296, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5737750, '1- credit of 40 sq ft of putting green at $17 a sq ft&nbsp; $-680<br />
2- adding 61 sq. Feet concrete&nbsp; + demo of 61 down 7 inches +814<br />
3- adding 4 LF. Of curb&nbsp; $+160<br />
4- 8 LF. Of steps $+520<br />
5- adding 2 more lights $+480<br />
Credit 80 LF of drainage @25 a linear ft -2000<br />
<br />
total credit $-716', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5740994, NULL, NULL, '2023-02-10 14:42:13', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5740999, 'For 16sqft&nbsp;', NULL, '2023-02-10 14:42:42', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5741002, 'For 245sqft (pavers within the gate entry)', NULL, '2023-02-10 14:43:03', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5741006, 'semi gloss', NULL, '2023-02-10 14:43:21', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5741077, NULL, NULL, '2023-02-10 15:48:35', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5741087, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5741088, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5741768, 'Change from semi-gloss to wet look', NULL, NULL, NULL, NULL, NULL, 'Daniel  Selnick', 'pending'),
  (5741989, '(9) 5 gallons

(1) 24 inch box ', NULL, '2023-02-14 13:39:47', NULL, NULL, NULL, 'Alex Trinidad', 'sold'),
  (5742190, 'Extend front entry way for step pad. Total 26 LF ', NULL, '2023-03-15 10:29:39', NULL, NULL, NULL, 'Alex Trinidad', 'sold'),
  (5742191, NULL, NULL, '2023-03-15 10:29:54', NULL, NULL, NULL, 'Alex Trinidad', 'sold'),
  (5742662, NULL, NULL, '2023-02-23 11:48:13', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5743187, 'Rock upgrade +175
Irrigation timer 8 station +400
Removal of transformer - 437', NULL, '2023-02-13 15:49:58', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5743913, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5743931, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5744316, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5748137, 'Old costs for electrical runs:<br />
100 LF of 3/4" conduit with (6) 12 gauge wires (no breakers) = $4,550<br />
<br />
New costs:<br />
176 LF of 1 1/4" conduit with (6) 12 gauge wires, junction box and 2 breakers = $9,176<br />
<br />
Cost difference (change order charged above): $4,926<br />
 ', NULL, '2023-02-16 14:24:40', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5748143, '60 LF of EMT', NULL, '2023-02-16 14:24:20', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5748374, NULL, NULL, '2023-02-14 12:54:34', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5749169, '(2) 15 gal Bougainvillea ', NULL, '2023-02-14 13:40:18', NULL, NULL, NULL, 'Alex Trinidad', 'sold'),
  (5749229, 'Install (8) 5 gallon Agave Americana 
Install (4) 24 gallon multi olives
Install(3) 5 gallon Mexican Fence post
Install (2) 15-gallon fire sticks ', NULL, '2023-03-15 10:28:49', NULL, NULL, NULL, 'Alex Trinidad', 'sold'),
  (5749870, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5752536, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5753783, NULL, NULL, '2023-02-16 14:24:00', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5756237, '-$300 credit for removing boulders and setting aside<br />
<br />
$300 needed in budget to move boulders back to front yard with wheelbarrow', NULL, '2023-02-16 14:23:44', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5756243, NULL, NULL, '2023-02-16 14:23:28', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5756268, NULL, NULL, '2023-02-16 14:23:14', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5756287, NULL, NULL, '2023-02-16 14:22:54', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5757462, NULL, NULL, '2023-02-16 11:44:14', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5757988, '26 1 gallon plants at 21.50 each (18 planted now, 8 later )
7 5gallon plants at 43.50 each 
1 15 gallon plant at 150 
Transplanting plants $50


Original plant quote in Contract is 976

New amount is 1063.50

Difference of 
$87.50', NULL, '2023-02-16 14:17:52', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5757994, 'New transformer ', NULL, '2023-02-16 14:05:13', NULL, NULL, NULL, 'Daniel Aguilar', 'lost'),
  (5758784, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5758915, 'Rock boulders +430
Additional electrical run +640
', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5759166, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5765874, '8 lights at 240 each', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5766034, '16 creeping fig 5 gallon at $50&nbsp; each<br />
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
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5766068, '$875 of mulch originally allocated for 350 sq ft<br />
<br />
new total is 580 sq ft of decorative rock at 3.85 a sq ft $2233', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5773965, 'Line item #3 under pilasters
Not doing', NULL, '2023-02-28 11:55:42', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5774801, 'not doing the fountain, not demo, not providing river rock.<br />
<br />
(Outlet install is under Utilities)<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">we are not to move the fountain or help with fountain in any way.  No digging, no install.</div></div>', NULL, '2023-02-28 11:55:22', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5777153, 'Total of lights installed 31
14 lights in contact 
Additional 8 lights on 2/20/2023
Additional 9 lights on 2/22/2023', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5777645, 'Tie Downspouts into (2) 3” drains with pop ups into the yard beyond concrete ', NULL, '2023-02-23 17:19:51', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5778699, '(5) Leucadendron&nbsp;<br />
(4) Cordyline&nbsp;', NULL, '2023-02-23 12:33:50', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5783556, 'Each piece is 16'' long by x wide.  In order to get the shape of your design, we need an extra 115 SF of turf. This does not include the 10% overage which is included in our costs.', NULL, NULL, 1, '2023-03-31 09:46:03', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (5805259, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5805331, '1- Demo concrete water feature dispose. $2800

2- 904 sq.  extra demo/grading of soil $6000.


', NULL, '2023-03-04 22:49:21', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5805334, NULL, NULL, '2023-03-22 08:45:13', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5805336, NULL, NULL, '2023-03-04 23:05:11', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5805342, 'Moving drain from the step and drain in ti planter', NULL, '2023-03-04 23:06:05', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5805423, 'Adding 1-2 inch mexican buff with weed fabric front and back yard.
Additional bend a board.

', NULL, '2023-03-03 15:55:32', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5805513, NULL, NULL, '2023-03-03 16:42:21', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5810156, '7 lights for columns labor only.', NULL, '2023-03-07 20:03:01', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5818245, NULL, NULL, '2023-03-08 12:06:20', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5818687, '1100 sq ft of rtf sod at 3.75 per sq ft $4125<br />
adjustment of sprinkler $40<br />
benderboard $225', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5821379, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5821387, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5823950, '165 SF 3/8" del rio gravel', NULL, '2023-03-19 10:27:53', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5827125, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5830523, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5830527, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5830529, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5830535, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5830539, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5830546, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5830550, 'client purchased timer, this is for installation only', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5830592, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5832858, 'Switch (2) valves out and add drip to middle planter&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5832861, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5832910, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (5832915, NULL, NULL, '2023-03-24 18:30:56', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5836996, '1) Pool- moved away from house, changed orientation, added spa<br />
2) Moved shower location<br />
3) Shifted decking and steppers<br />
4) Removed sauna', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (5844799, '(2) 5g Rosmarinus officinalis<br />
(5) 5g Lavandula angustifolia', NULL, '2023-03-28 14:18:49', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5845480, 'Add (2) 15 gallon plants to the backyard pots<br />
Add (3) 5 gallon plants to the DG planter', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5848588, '9 - 26" x 26" Modern Bellacrete Pilaster Caps<br />
<br />
Original material option was for a 16-24" cap at $25 material allowance per cap.  These are $100 each with a discount on our markup (as I know this is mid-project).', NULL, '2023-03-17 14:43:16', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5848791, '92 Sq ft of turf <br /><br />75x6 man hours <br />105 Sq ft ordered at 4.25 a sq ft<br />50 dollars in base<br />$25 nails<br /><br /><br /><br />$971', NULL, '2023-04-05 17:54:24', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5848813, '<u><strong>OPTION 1</strong></u><br />
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
&nbsp;', NULL, '2023-04-05 17:53:42', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5856688, NULL, NULL, '2023-03-21 12:27:45', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5856694, NULL, NULL, '2023-03-21 12:29:10', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5856700, NULL, NULL, '2023-03-21 12:29:38', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5857097, NULL, NULL, '2023-03-21 12:30:04', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5857295, 'LABOR ONLY!<br />
<br />
85 (1gal) in contract, we have 139 (1gal) in total + 2 (2gal) = qty difference is 56 (1gal) @ $12/each = $672<br />
 
<div><span>1 - 15 gallon @ $50/each = $50</span></div>

<div> </div>

<div><span>3 (5gal) in contract, we have 7 (5gal) in total = qty difference is 4 (5gal) @ $20/each = $80</span></div>

<div> </div>

<div><span>2 - 2 gallon - included in 1 gallons above!</span></div>
', NULL, '2023-03-21 12:44:05', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5858352, '- Demo and install new Decomposed granite, approx. 1,000 SF at 2" depth. Grade towards drains, add or reposition one drain near flow. $4,500<br />
- Remove and reuse bender board in DG area to sit above final grade as much as possible. Approx. 75 LF - Labor only $300<br />
- Replace (courtesy of manufacturer) X LF of benderboard in areas where paint has worn off. (no charge)<br />
- Install 6 CY mulch throughout property. $800<br />
- Weeding. $150<br />
- Install 80 SF of sod. $320<br />
- Remove and reuse bender board nearest veggie beds and clean up mulch that has spilled over. (no charge)<br />
 ', NULL, '2023-03-28 14:19:10', 1, '2023-03-21 17:57:55', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (5860977, NULL, NULL, '2023-03-22 13:42:59', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5861584, NULL, NULL, '2023-03-23 20:08:09', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5861590, NULL, NULL, '2023-03-22 11:50:21', NULL, NULL, NULL, 'Jorge Flores', 'lost'),
  (5861608, 'We do not warranty transplanted plants', NULL, '2023-03-24 16:09:35', NULL, NULL, NULL, 'Jorge Flores', 'lost'),
  (5878812, 'Homeowner is declining the sealant at this time. Daniel go ahead and approve this negative change order and we will proceed with finishing out the financials. Thank you! ', NULL, '2023-03-28 12:05:51', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5883766, '(1) 36" multi Arbutus marina <br />
(2) 15 gallon Abelia grandiflora ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5886791, '5- 5gal. Westragea
5- 1gal. Rosemary pastrada ', NULL, '2023-03-30 09:48:44', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5886843, NULL, NULL, '2023-03-30 09:49:14', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5888709, NULL, NULL, '2023-03-31 07:21:52', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5892604, NULL, NULL, '2023-04-24 20:28:02', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5893762, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5896168, '245 SF weed barrier ', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5896172, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5896186, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5896190, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5896196, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5896266, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5899932, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5902880, 'Adding (5) path and (1) up light.<br />
&nbsp;<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Same style, brightness, bulbs, spread as already purchased for this job.</div></div>', NULL, NULL, 1, '2023-04-05 08:07:21', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (5902905, NULL, NULL, '2023-04-05 10:32:11', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5902910, NULL, NULL, NULL, 1, '2023-04-04 16:48:10', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (5908748, NULL, NULL, '2023-04-06 18:12:33', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5909257, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5909264, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5909943, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5910939, NULL, NULL, '2023-04-06 16:31:15', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5912909, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5913283, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5913284, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5918291, 'Recunduct 3 stations manifold 
Repair 1-1 inch pipe
', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5921860, 'From 15 gallon to 24" box <br />The difference is $925.00<br />5 count. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5921912, 'Credit for design', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5922640, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5922659, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5925441, NULL, NULL, '2023-04-13 11:14:20', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5927649, '850 Sq ft of mulch at 1.25 a sq ft ', NULL, '2023-04-13 09:34:13', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5927962, 'Along very back of property ', NULL, '2023-04-13 11:13:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5930052, NULL, NULL, '2023-04-14 13:25:25', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5933371, 'Bellecrete called me back with the final pricing. The steppers cost $53 plus tax It''s going to be for a 18x24 stepping stone. We would charge $25 per stone installed. So 200 total for the install cost. 466.40 for material', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'lost'),
  (5935547, '3 new pathlight to replace 3 that broek, paid repair, the glass on the path lights were brokern&nbsp; &nbsp;Lightcraft AP--C-2108-Amber<br />
Also one of the firepit caps is loose, and needs to be glued back<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5937665, '3.5'' X 3.5= approximately 13 SF  Juventino said he would charge $300.00, they have pavers on site', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5940179, '4'' 6"H x 20 long CMU Block includes demo and haul out (no stucco)', NULL, '2023-04-26 08:39:05', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5940719, NULL, NULL, '2023-04-18 10:18:17', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5940738, NULL, NULL, '2023-04-18 10:20:58', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5944635, 'Credit for light - 240<br />
Timer/Install&nbsp; + 160', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5954466, 'reduced the sod by 228 SF X $4.25= 969.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5958053, 'grind out stump and roots for (2) stumps&nbsp;', NULL, '2023-04-25 13:07:24', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5959379, '9 linear feet of countertop and island additonal&nbsp;', NULL, '2023-04-24 13:58:19', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5959391, 'We installed an additional 120 linear feet of drainage (100 linear feet on original contract)', NULL, '2023-04-24 13:57:39', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5960772, 'The owner has provided daylilies ', NULL, '2023-04-25 07:41:02', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5961665, 'mesh for roughly 500sqft<br />
37 baskets for front yard (main area)', NULL, '2023-04-25 13:07:49', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5961747, NULL, NULL, '2023-04-25 13:08:06', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5961754, NULL, NULL, '2023-04-26 10:18:32', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5964961, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5966883, '(4) 4’ wide steps ', NULL, '2023-04-26 10:00:18', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5968656, NULL, NULL, '2023-04-29 11:17:28', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5968936, NULL, NULL, '2023-04-26 16:31:16', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5969284, NULL, NULL, '2023-05-01 09:57:34', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5973365, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5974465, 'Replaced 1 shut-off valve
Replaced 1- pressure regulator 
With box
Planted 
13- 5 gal. Shurbs
14- 1 gal. Shurbs
2- flats ground cover
Irrigation included ', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5979101, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5979318, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5979998, '(6) 5 gallon plants
1600sq ft of dg
$6,901', NULL, '2023-05-02 09:03:35', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5984245, 'Adding mow straps and drainage', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5986584, 'Credit of 7 lights $1680
Removal of 10 5 gallon little Johns $435
Breaking  two drain grates and adding two catch basins 12 inch$750
Adding 600 Sq ft of pea gravel from mulch$1200




Total credit $165

', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5990816, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5990930, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5990945, 'change order for going from pavers to turf -$335', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5997418, 'Add (2) 5 Gallon Creeping Fig
Add (4) 15 Gallon Silver Sheen
', NULL, '2023-05-06 16:02:13', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5997427, 'Add 11 Station Rachio Irrigation Timer / 120’ of irrigation wire', NULL, '2023-05-06 16:02:42', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5997440, 'Contracted for 3,150 sq ft
Installation of 2,420
  Difference of 730 sq ft', NULL, '2023-05-06 16:02:29', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6002331, ' Clean out pool from water and debris

Clean up Misc pipe laying around in the backyard

Trim branches that are hanging over the pool

Add new regulator and auto fill for Courtyard water feature. Clean out as well', NULL, '2023-07-25 08:07:57', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6003560, '48 (5 gals) with irrigation at $45.00 =&nbsp;2,160<br />
20 (1 gals) with irrigation at $23.00 = 460', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6003619, 'Additional paver wall to fit the 24" boxes&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6009243, 'Removal of Existing Trees.  Plant (8) 24" Box Ficus Nitida Trees ', NULL, '2023-05-10 07:35:45', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6011375, 'Original cost of palm $360 - (2) $45/ 5 gallons that we couldn''t get.
New total is $270 for palm.
Subbing (2) 5gal clivias.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6014687, 'Barrier&nbsp;<br />
Lay 2,880 Sq Ft of barrier on project area<br />
Fabric type is Weed barrier.', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6024192, 'Upgrade turf to Nature''s Best by SGW Corp. $160', NULL, '2023-06-04 21:12:57', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6024834, NULL, NULL, '2023-05-15 15:21:21', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6024841, 'Rebuild completely new wall with 6”
CMU block and finished in sanded stucco
Wall to be 15’ x 5’ tall ', '2023-05-15 15:18:00', '2023-05-15 15:25:38', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6029505, 'Replace (2) Step lights at front walkway', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6029566, 'Jaclyn Santana<br />
Cell: 661-713-0799<br />
Email: Santana.jaclyn@gmail.com<br />
1124 Arbor Dell Road, Los Angeles, CA 90041.<br />
<br />
Demolition<br />
1. Remove/ brake pavers in 2x2 Square Feet area.<br />
2. Haul debris removed by picture build.<br />
<br />
Repair<br />
1. Repair 2x2 Square Feet area set new pavers in (Client is to provide pavers for repair)', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'pending'),
  (6030468, '

For 3 flats of creeping thyme
12 1 gallon false Heather''s
3 whirling butterfly in 5 gallon ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6030485, 'Additional dg
Benderboard fix
Irrigation
', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6032015, '+24 linear feet of wall cap for a total of 90 linear feet<br />
increase size of wall cap from 8" t0 10"', NULL, '2023-05-17 22:01:14', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6032080, '(3) landings in Bellecrete for a total of 28 linear feet of landings<br />
(originally contract stated landings would be concrete only)<br />
&nbsp;', NULL, '2023-05-17 22:00:57', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6032090, '65 linear feet for 1 1/2" gas line ', NULL, '2023-05-17 22:00:39', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6032113, '70 linear feet for 3/4" electrical line ', NULL, '2023-05-17 22:00:12', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6032121, NULL, NULL, '2023-05-17 21:59:49', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6035978, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6038567, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6046619, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6048840, '(1) 15G Dwarf Japanese Maple<br />
(1) 5G Salvia Clevelandii <br />
(1) 5G Mexican Salvia <br />
(3) 5G Lomandra ''Breeze''', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6062725, '648 sqft sod - $2,430<br />
30 sqft saw cut - $473<br />
Drains - $3900', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6062867, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6067192, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6067200, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6069690, 'Additional Sq Ft to accomodate the Pizza oven and countertop / Electrical', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6070198, '(5) 1 gallon Nepeta
(2) 1 gallon Sea Lavender ', NULL, '2023-05-31 10:27:27', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6070232, 'For all front yard beds and parkway beds on Texhoma ', NULL, '2023-05-31 10:24:48', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6072977, '(9) stem path lights<br />
(17) up lights<br />
(3) wall wash lights', NULL, '2023-07-18 20:55:15', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6073063, '<strong>Total plant count</strong><br />
<strong>164</strong> 1 gallon<br />
<strong>90</strong> 5 gallon<br />
<strong>56 </strong>15 gallon<br />
<strong>11</strong> 24" boxed trees (does not include (2) 7 gallon redbud Yvonne sourced separately)<br />
<strong>50</strong> flats of Carpet of Stars groundcover <br />
 ', NULL, '2023-07-18 20:55:44', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6073068, NULL, NULL, '2023-05-31 19:19:13', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6073119, 'upgrade tree 36in - $975<br />
6 station timer - $330<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6073148, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6073171, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6075092, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6076112, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6077290, '3 lights - 675<br />
Credit for valve, still need adjustments (-565)', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6081456, 'Add 40 LF of drains and 2 gravel pits for deck drains and pool overflow ', NULL, '2023-06-04 21:13:09', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6081471, 'Saw Cut (E) 2 steps at back patio and remove

 Re pour to help elevation difference and make better transition

', NULL, '2023-06-04 21:13:50', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6081475, 'Deduction in height of planter wall by approximately 16”', NULL, '2023-06-04 21:12:43', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6081480, 'This is to credit for Weep holes, French drain and (1) Drain inlet...&nbsp; Homeowner and I discussed allowing water to permeate into the planter rather than having the water go into gravel retention basins...', NULL, '2023-06-04 21:12:30', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6081664, 'Add 2 to 3 inches of gorilla hair, mulch for backyard hillside', NULL, '2023-06-03 08:31:25', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6081732, '(2) Additional Bins were needed in order to achieve the necessary elevations', NULL, '2023-06-04 21:12:07', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6081741, 'Possibly reduce the light count by 3 lights', NULL, '2023-06-04 21:14:22', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6081746, 'To possibly reduce plant costs...19 (1) Gallon Contracted VS 7 (1) Gallon Proposed Reduction for a total of 12 Planted $175<br />
&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;13 (5) Gallon Contracted VS 9 (5) Gallon Proposed Reduction for a total of 4 Planted $180', NULL, '2023-06-04 21:14:08', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6083278, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6086243, '14 linear feet of wall combined<br />
18 inches high<br />
with belleCrete caps (existing)&nbsp;<br />
<br />
$1160<br />
&nbsp;<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">14 linear feet of wall combined
18 inches high
with belleCrete caps (existing)</div></div>', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6095136, 'Additional drainage 76 lnft with inlets $32.50 - $2470', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6095138, 'vertical soldier course 25lnft', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6095140, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6095145, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6097784, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6097841, 'credit stucco $-1300<br />
80sqft seating area @ 28.50<br />
12lnft edges @ 28.50<br />
72 sqft veneer bbq @28.50<br />
$4332<br />
<br />
Total&nbsp;3,374<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6097955, '(1) 15G icee blue Podocarpus
(3) flats of groundcover 
(1) 5G kangaroo paw ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6097960, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6097969, '20’ tube
100 emitters ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6097976, 'Tile&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6097992, 'Per contract, picture build was to redo pool lines. allocation was $4375<br />
<br />
Client requested rerouting which was billed by contract at different rate. Picture Build did not redo lines, credited back to client.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'pending'),
  (6098406, NULL, NULL, '2023-06-09 14:19:03', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6101074, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6102827, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6106884, '225sqft of additional Del Rio gravel used&nbsp;', NULL, '2023-06-13 15:53:26', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6106892, '(6) medium/large size boulders added to front yard&nbsp;<br />
&nbsp;', NULL, '2023-06-13 15:52:38', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6106915, '(2) 5 gallon Leucospurmum <br />
(2) 5 gallon Aeonium succulents in purple <br />
(3) 5 gallon Lavender ''Meerlo''<br />
(6) 1 gallon French Lavender<br />
(3) 1 gallon Sea Lavender ', NULL, '2023-06-13 15:51:03', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6118578, 'Add the original quantity of plants back in per the contract. ', NULL, '2023-06-15 19:38:07', NULL, NULL, NULL, 'Brian McBride', 'lost'),
  (6118584, 'Add back the original contracted amount of lights in plus add 5 more for a total of 15
  (12) Step Lights 
  (3) Up Lights ', NULL, '2023-06-15 19:37:42', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6118613, 'Add 20 ft of 3” pipe under the driveway for future access ', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6122042, 'Holland Paver border for around turf (border for paver area which is 19 linear feet is included in original cost)', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6122110, 'Coring, patching and waterproofing of 12 pots. 
  This does not include soil or plants. ', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6122593, 'Deduct 2 Pour Lids', NULL, '2023-06-15 15:53:12', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6122622, 'Add 1'' of channel Drain at Garage', NULL, '2023-06-16 07:40:05', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6122628, 'Add Vertical paver course along property line in the Driveway', NULL, '2023-06-15 15:52:43', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6122702, 'One zone of irrigation<br />Concrete cutting <br />Resetting one row of 12x12 pavers. ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6130522, '1 guy 2 hours or 2 guys 1 hour<br />Trench for dry riverbed. All rocks on sight in area that PB has deo rio installed. <br />$150.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6133102, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6133261, '1-Demo ex. wall

2- Demo 200 sq feet of damaged concrete 

3- Pour  200 sq. feet of natural grey 3000 psi. to match existing.

4-Build new 6x8x8 cmu wall about 57LF at 18" with sand stucco to match house

5- Install about 60 LF. 2x12 treated timber in front of fence to help hold soil.

6- plant install.
     20- 5- gal. shrubs 
     15- 1- gal. shubs

7-  install 420 sq. Feet of 1" del rio with fabric 

8- install 1 zone drip line.  




', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6134797, 'Add a course of Block cap on top of pool deck to divert pool water', NULL, '2023-06-20 17:54:12', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6134800, 'Cut back front grass to slope to new concrete', NULL, '2023-06-21 07:14:27', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6137799, NULL, NULL, '2023-06-28 12:14:59', NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (6140828, '(3) 5 gallon Bougainvillea 
(3) 5 gallon succulents for planters 
', '2023-06-22 08:11:00', '2023-06-22 08:26:48', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6140986, 'Reinstalling fountain with bigger basin, plus additional rocks will be needed to fill around the fountain area.', NULL, '2023-07-10 16:48:03', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6141032, '(4) 1 gallon Creepping Rosemary<br />
(4) 1 gallon Mexican Salvia<br />
&nbsp;', NULL, '2023-07-10 16:47:46', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6143037, NULL, NULL, '2023-06-22 14:17:30', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6143551, 'Electric and Gas for bbq/fireplace&nbsp;<br />
japprox $500-$1000 for both permits', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (6145456, 'Credit for not building soldier course', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6145462, '2 lights discounted price', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6145470, 'Credit for wall reduction', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6149272, NULL, NULL, '2023-06-26 13:01:45', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6149572, 'Swapping old irrigation valves with new ones. Plastic ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6150453, NULL, NULL, '2023-06-26 13:41:10', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6151396, NULL, NULL, '2023-06-26 15:12:03', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6153272, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6157436, 'Replace 3/4" pressure regulator in the backyard', NULL, '2023-06-28 13:20:45', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6160771, 'Remove and Re-Install pavers along front driveway to sideyard to square pavers with the house.&nbsp; Remove (1) existing light&nbsp;', NULL, '2023-07-06 17:40:38', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (6168727, 'Pvc not reconnected to sprinklers. She handled it herself.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6169959, '(4) step lights ($240 each installed)&nbsp; + 1 transformer ($435)', NULL, '2023-07-03 09:47:02', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6169961, '420sqft', NULL, '2023-07-05 10:45:27', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6169962, '27 LINEAR FEET OF 1" CONDUIT BURIED BELOW GRADE WITH 1 J-BOX ROUGH IN ', NULL, '2023-07-13 19:30:07', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6169967, '16 LF Green Landscape Timber Step', NULL, '2023-07-05 10:35:12', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6169970, '65SQFT ADDITIONAL TURF&nbsp;', NULL, '2023-07-05 10:34:27', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6170016, '35sqft&nbsp;', NULL, '2023-07-05 10:34:08', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6173633, NULL, NULL, '2023-07-05 10:33:41', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6183102, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6187799, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6191320, NULL, NULL, '2023-07-11 13:17:26', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6191949, '1 hour of work ', NULL, '2023-07-11 21:12:39', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6192131, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6192563, NULL, NULL, '2023-07-14 12:02:11', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6192663, 'Bringing grade down below small wall + large Westringia shrub ', NULL, '2023-07-17 14:52:08', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6197016, 'Extensive added hardscape work on back patio.<br />
1) Form for extended patio sections.<br />
2) Form for extended step sections.<br />
3) Hand Mix and Float entire back patio.<br />
4) Hand Mix and Pour added steps.<br />
5) Total hand mix and pour of 20 yards of concrete.&nbsp;<br />
6) Cover all need sections and steps with stone<br />
<br />
Originally $14,000.00, reduced to $7,500', NULL, '2023-11-20 15:42:38', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6197024, '1-Demo out a total of 6 palm trees and 2 small trees 
2- Stump grind 
3- Dump fees', NULL, '2023-07-22 00:43:40', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6197084, '2- bears lime
2 -Washington navel
2 -myer lemon

4- gal. Westragea 
3- 15. Carolina cherry ', NULL, '2023-07-22 00:42:56', NULL, NULL, NULL, 'Jorge Flores', 'lost'),
  (6197090, '<br />
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
&nbsp;', NULL, '2023-09-13 08:05:52', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6197101, 'Demo 2 Elm tree 

Demo out 487 square feet 6/7 inches of soils for concrete 

Form and pour 6" high curb 13LF.

Rebar and pour about 487 square feet of concrete 
', NULL, '2023-07-18 09:10:20', NULL, NULL, NULL, 'Jorge Flores', 'lost'),
  (6197103, 'Added concrete around sports court. Short load. Small pour $30/ sq feet including finishing.', NULL, '2023-07-22 00:42:43', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6197107, 'Saw cut 8 LF./demo 12sq. Feet of concrete for planter in front of alley wall.
', NULL, '2023-07-22 00:42:20', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6197114, 'trim around plants, tack plants, Scrape, grind wall for prep and proper paint adhesion. Paint wall two coats. Roughly 1200 sq feet.', NULL, '2023-07-18 09:09:36', NULL, NULL, NULL, 'Jorge Flores', 'lost'),
  (6197120, 'Did shower demo including wall - this was over credited in previous credit change order.&nbsp;&nbsp;<br />
Need to prep and grind all shower walls,&nbsp; Need to stucco coat wall.&nbsp;', NULL, '2023-07-22 00:42:07', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6197851, 'Did not do water feature install in the backyard.', NULL, '2023-07-22 00:41:53', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6197905, 'Due to changes in planting schedule.&nbsp; We did on onsite assessment of current planting vs contract.&nbsp;<br />
<br />
Current planting has (14) - 1 gallon rosemary.&nbsp; (130) 1 gallon Lerope&nbsp; (27) 5 gallon boxwood&nbsp; (4) 5 gallon Acacia&nbsp; (11) 1 gallon Barkley Sage&nbsp; (2) 5 gallon Westrangia. (23) 15 gallon fieres<br />
<br />
Credit due of $1,170 due to less plants and smaller sizes for some.<br />
<br />
All planting from this point will be charged seperately in a change order', NULL, '2023-07-22 00:41:33', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6198059, 'Original contract had (12) trees.&nbsp; 4 olives and 1 pygmy palm have been planted, 2 more being ordered plus 3 refused that cannot be returned to the nursery.&nbsp;<br />
<br />
(Credit 2 trees) $4,832', NULL, '2023-07-22 00:41:20', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6198926, 'Adding weed barrier for about 600 sqft under mulch', NULL, '2023-07-13 11:46:17', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6199624, NULL, NULL, '2023-07-21 12:15:24', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6199637, NULL, NULL, '2023-07-21 12:14:57', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6199659, NULL, NULL, '2023-07-21 12:14:30', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6199667, NULL, NULL, '2023-07-21 12:14:01', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6199716, NULL, NULL, '2023-07-21 12:12:53', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6200507, 'BiInvoiced for normal turf at $21,937', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6200841, '14linear feet of ledge using Rustic wall (grey/charcoal to match pavers) with wall cap to be installed to cover footings behind far side of pool and 23 linear feet of Rustic Wall to create planter starting from the telephone pole towards entry gate.&nbsp; This will allow the footings to be hidden.&nbsp;', NULL, '2023-07-28 09:33:12', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6207690, NULL, NULL, '2023-07-17 14:49:02', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6207692, NULL, NULL, '2023-07-17 14:51:48', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6208719, NULL, NULL, '2023-07-18 20:56:08', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6208727, 'Wrinkled 24 x 12 Sonorostone french grey stepper for around the pathway on back 40', NULL, '2023-07-18 20:56:32', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6208736, '11 x 24x24 Modern/Straight/Sand Finish in Midnight<br />
t', NULL, '2023-07-18 20:56:52', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6208745, 'Picture Build did all the demo and chipping of pool wall and preped and floated all the walls.&nbsp;', NULL, '2023-07-22 00:41:04', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6208755, '16 x 24''x14 Modern/Straight Steppers in Midnight ', NULL, '2024-01-10 19:08:07', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6208756, NULL, NULL, '2024-01-10 19:07:46', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6208971, 'Upon review the pricing had 4,263 sq feet. However, per the contract that included 10% overage of material. So the actual installation of stone was charged at 3,836 sq feet only.&nbsp; Actual waste was very minimal.&nbsp;<br />
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
&nbsp;', NULL, '2023-10-12 17:40:21', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6212785, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: "><span style="color: black">Trenching for utilities Backfill and compact = <b>$3900 misc </b>work done to backfill trench and compact 3 ft down by 41 linear feet. <b>Wasn''t in initial scope of work</b></span></span></span></span><br />
 ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6212788, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: "><span style="color: black">Drainage 480lnft @25 = $12000 </span></span></span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: "><span style="color: black">Drain Inlets = $1800</span></span></span></span><br />
<br />
11000 in original estimate', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6212794, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: "><span style="color: black">80% of drainage cost is related to lids based on lids plan run  (<b>$11,040)Lids</b> however, you can deduct this out of the original estimate since we don''t anticipate running new drains. </span></span></span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: "><span style="color: black"> other drainage ran in anticipation of future hardscape/landscape.</span></span></span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: "><span style="color: black">80 sq ft of rain garden = $4400 <b>Lids</b></span></span></span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: "><span style="color: black">French drain storm planter 37lnft $600<b> Lids</b></span></span></span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: "><span style="color: black">Rain Barrels 1150 <b>Lids</b></span></span></span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: "><span style="color: black">Backfill $390 3 yards <b>Lids</b></span></span></span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: "><span style="color: black">Waterproofing-coats of roll on + bituthene 4000 111 sqft total<b> $1831.50</b> 37 linear feet by 3 feet high</span></span></span></span><br />
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"><span style="font-family: "><span style="color: black"> <b>LIDS</b></span></span></span></span><br />
 ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6213153, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6215002, NULL, NULL, '2023-07-28 09:31:34', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6215012, 'Allowance was $1600, reducing to $1000 too offset additional turf cost', NULL, '2023-07-28 09:31:25', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6218778, 'Plus double staking ', '2023-07-20 07:39:00', '2023-07-20 14:32:06', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6219432, 'Extend the planter wall out 4 feet', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6219464, 'Additional grass st Augustine 188 sf x 4,25= $799.', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6220746, 'This credit will attach to the new change order where we will be concrete cutting the length of the patio at the brick ribbon.&nbsp; We will still sand and bevel the short area of concrete that will still be adjacent to the grass.', NULL, '2023-07-20 15:21:53', 1, '2023-07-20 12:48:45', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (6220756, 'This is to concrete cut the length of the patio at the brick ribbon.&nbsp; We will still need to sand and bevel the short concrete area on short planter box side.&nbsp; This includes hauling away the concrete', NULL, '2023-07-21 10:06:21', 1, '2023-07-20 12:47:50', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (6220773, '10 Linear Feet of brick border, to cover a drainage line X $25.00= $250.00', NULL, '2023-07-20 15:22:11', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6220790, 'Additional 21 Linear Feet of drainage X $25.00= $525.00 with 1 additional cap $75.00= $600.00', NULL, '2023-07-20 15:21:10', 1, '2023-07-20 12:49:47', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (6223228, NULL, NULL, '2023-07-21 12:09:46', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6227457, '<table style="border-collapse: collapse; width: 644px" width="644">
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
', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6227651, '<table style="border-collapse: collapse; width: 644px" width="644">
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
', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6228678, 'Install 2- 4x6 CBS stone tie with 1 inch stand-off 
Install 2- 4x6 post
2x2 footings/concrete ', NULL, '2023-07-24 12:57:00', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6228765, NULL, NULL, '2023-07-24 12:57:34', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6228784, NULL, NULL, '2023-07-24 12:57:48', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6229221, '<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="line-height: 106%"><span style="font-family: ">Backsplash/Bartop </span></span></span></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="line-height: 106%"><span style="font-family: ">1. Add blacksplash 10 LF</span></span></span></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="line-height: 106%"><span style="font-family: ">2. Poured in place concrete cap 10 LF (include forming)</span></span></span></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="line-height: 106%"><span style="font-family: ">3. Trowel for smooth finish</span></span></span></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><span style="font-size: 12.0pt"><span style="line-height: 106%"><span style="font-family: ">4. Blacksplash to be smooth stucco (to match house color)</span></span></span></span></span></span><br />
 ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'pending'),
  (6229301, NULL, NULL, '2023-07-24 20:05:28', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6229304, NULL, NULL, '2023-07-24 20:10:46', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6229315, NULL, NULL, '2023-07-24 20:11:04', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6229339, NULL, NULL, '2023-07-24 20:12:47', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6230911, 'Fruitless olive tree Wilsoni upgrade +200<br />
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
Total $7540.50', NULL, '2023-08-01 19:58:07', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6232292, 'Adding 1 valve for front hillside (just stubbed out no sprinkler heads)', NULL, '2023-07-25 10:51:31', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6232398, '2 15G Olives
2 5G Leucadendron
6 1G climbing Jasmine
2 flats Blue Chalksticks
Wiring for Jasmine and soil for pots ', NULL, '2023-07-28 09:31:14', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6232818, NULL, NULL, '2023-07-25 13:36:50', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6232824, 'Wire and install 1 low voltage light (owner to provide light fixture)', NULL, '2023-07-25 13:36:36', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6232833, 'Only installing 7 posts instead of 10', NULL, '2023-07-25 13:36:23', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6232880, NULL, NULL, '2023-07-25 13:36:09', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6232887, NULL, NULL, '2023-07-25 13:35:51', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6233434, 'Adding 1 valve, no lateral line. To separate the back yard', NULL, '2023-07-25 13:41:36', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6233808, 'Demo out existing wall footings ', NULL, '2023-07-25 14:47:07', 1, '2023-07-25 14:46:21', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (6234039, NULL, NULL, '2023-07-28 09:31:00', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6235258, '16 steppers to be placed side by side to create walkway from steps to patio ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6237352, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6241947, 'Fixing mainline at street side $300<br />
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
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6242414, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6247389, 'Stucco the entire back wall of the pool for one uniform look.&nbsp;', NULL, '2023-07-31 21:42:16', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6247588, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Now including the parkway.

On the measurements for the sod we have:
26'' by 23'' 3" area 604.50 Sqft for the back. The parkway next to the street is 7'' 6" by 56'' for a total of 420 Sqft. Total sod install of 1024.5 sq feet.

The original change order for adding grass that was approved and paid was for 648 sq feet which leaves us with a difference of 376.5 sq feet.  Currently at 3.75 sq foot that leaves $1411.87 additional for the sod.</div></div>', NULL, '2023-07-31 21:41:34', NULL, NULL, NULL, 'Brian Godley', 'lost'),
  (6247944, '35 linear feet x $10.00= $350.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6253827, '(4) stumps (grinding roots)
(2) block walls
Hauling all debris (concrete and green waste) ', NULL, '2023-08-24 19:23:10', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6253860, 'Remove all concrete, steps and brick landing for front entry way and side yard walkway
Redo all areas in concrete to match backyard- color tbd and sand finish 
Steps to be concrete (straight edge) ', NULL, '2023-08-24 19:21:13', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6254445, '1 man, 3 hours plus material''s 
', NULL, '2023-08-01 14:46:50', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6259053, NULL, NULL, '2023-08-24 19:22:25', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6263131, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Installing  electrical and Audio Visual Conduit.

2379 linear feet of conduit priced at $7.90 per linear foot = $18794.1

Trenching and backfilling for 381 feet at $6 per foot =$2286

Does not include electrical wire or outlets for Audio Visual Stands</div></div>', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6264128, 'steel edging<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">steel edging</div></div>', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6267348, 'Installation of three timers.', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6267509, 'Backfill top planter 2 yards ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6267528, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Remove tree and stump grind 12"</div></div>', NULL, '2023-08-07 20:50:29', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6267532, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (6271869, '20'' tall x" steel post in 1-2'' footings TBD on site.<br />
-Painted black<br />
-Added hooks<br />
 ', NULL, '2023-08-11 12:55:22', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6271873, '1) Reinstall two string light strands to new metal post<br />
2) Assess flickering light fixture in tree and repair (if new fixture needed will be more)<br />
3) One additional string light repair - no charge', NULL, '2023-08-11 12:55:43', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6274335, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6274352, 'Inside porch need to demo and install flagstone&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6274453, 'Total 357 sf - 184 sf 
$1,856.40 - $956.80= $899.60
Minus bender board credit $182.00
', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6275474, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6276751, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6280383, '<div>1.Grading - fix area to grade down 3" below final grade, use same weed fabric for under stones and gravel. Haul material away. $300</div>

<div>2.Black Mexican Mix Pebbles around flagstones- $1,100</div>

<div>3.Flagstone approx. 6 large pieces 2-3'' each going longways across set in concrete (Arizona gold - $1,200)</div>

<div><b><u>TOTAL:</u> $2,600</b></div>
', NULL, '2023-08-09 14:29:17', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6280622, '1.5 pallets Idaho silver plus labor (extra cutting of flagstone) and dry setting leftover flagstone for pathways adjacent to kitchen patio area (adds 1 extra full day of work for 2 guys) 
(6) Sydney Peak boulders set', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6280625, '3/4” Del Rio for 220sqft', NULL, '2023-08-09 17:23:12', NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (6280631, 'includes weed barrier for across the back perimeter&nbsp;<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Small bark mulch upgrade from shredded mulch</div></div>', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6280632, 'Upgrade to 36” Arbutus tree', NULL, '2023-08-17 17:19:14', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6280643, NULL, NULL, '2023-08-09 17:54:05', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6280745, 'white rock added to back planters $1000<br />
tree from boething +$225<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6280855, 'Pull up pavers 
Cut roots 
Grade and compact road base
Grade sand
Install papers
Sand and compact ', NULL, '2023-08-09 16:24:40', NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (6280920, '3 skimmer extensions&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6284364, 'Pick up paver and remove tree roots.&nbsp; &nbsp;Then relay the paver. 400 sq feet.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6284892, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6285103, '1. Sub Panel (includes 1" conduit)<br />
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
Does not include permitting costs there will be an additional change order once the fees are calculated by the city.', NULL, '2023-08-15 11:08:20', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6285138, NULL, NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6285208, '2 additional up lights ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (6285212, 'Finish installing gravel on side of house /rain garden and plants 

', NULL, '2023-08-14 09:46:25', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6287719, 'Owner purchased his own transformer', NULL, '2023-08-14 09:48:10', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6288803, 'Owner purchased separately and we installed&nbsp;', NULL, '2023-08-16 14:05:49', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6290552, 'Connecting to new irrigation zones and existing front yard zones<br />
&nbsp;', NULL, '2023-08-14 09:41:51', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6293687, '25’L x 18”D', NULL, '2023-08-16 14:04:25', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6297473, '(10)1 gallons
(1) 5 gallon ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6297529, NULL, NULL, '2023-08-15 17:21:21', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6301601, 'The plan had more plants than the contract. We needed to add 13 5 gallon and 1 15 gallon to match. <br />I discussed it with Marcia at the walk though and she approved. She wants all of the plants ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6303003, 'Time and materials ', NULL, '2023-08-19 12:34:56', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6308194, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6308198, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6308897, '1) Install 900 sq feet of Medium bark Nugget<br />
2) Check over entire irrigation system<br />
3) Fix minor tears in tubing.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (6313899, ' I have to have your approval for $2,782.00 to be able to offer all of the lights on the revised list with all color changing and dimming features.

Thank you!', NULL, '2023-08-21 16:41:22', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6318525, 'Upgrade from Pebble Fina finish to Pebble Sheen.&nbsp; Color to be Aqua Blue', NULL, '2023-08-24 10:16:19', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6322756, NULL, NULL, '2023-08-23 19:48:02', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6322889, NULL, NULL, '2023-08-23 17:29:25', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6324571, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6328683, '132 sf more&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6328700, '217 total. This is for the additional 132 sf', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6328756, '15 additional lfx $8.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6328948, 'Additional gas line. 45 lf. May recieve a credit if we are able to use less', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6329252, '<p dir="ltr"><b>Front Wall Installation</b></p>
 

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
 ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6329265, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6330670, '64 linear feet of timber added to single existing course<br />
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
&nbsp;<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">64 linear feet of timber added to single existing course

COST $3,584

Installing new timber wall for hillside retention 64 linear feet two courses high
128 linear feet of courses allotted 

COST $6144
Misc repairs with 200 sq ft of california gold pathway
Misc demo for side of timberwalls

COST $1400</div></div>', NULL, '2023-10-03 14:33:35', NULL, NULL, NULL, 'Daniel Aguilar', 'pending'),
  (6334956, 'Credit for the difference of 500sqft&nbsp; additonal mulch and demo&nbsp;', NULL, '2023-08-28 15:32:08', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6335172, '90 sq ft of turf additional $1440<br />
60 linear feet of new edging $410<br />
Additional rock for front yard and backyard planters $1000&nbsp; 350 sq ft&nbsp;<br />
fixing and repair lighting / swapping replacement led bulbs (34 lights) at $40 per light $1360<br />
additional planting $200 for tree and misc 1 gallon plants', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6335510, 'Remove mud/DG and replace with mulch (should be weed barrier under there).  Bring weed barrier just incase it''s needed.', NULL, '2023-08-30 16:48:30', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6339622, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6339637, NULL, NULL, '2023-08-29 21:52:14', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6341712, '<span style="font-size: 12px">(1) <span dir="ltr" style="left: 181.53px; top: 958.182px; font-family: sans-serif">FL-105B</span><span dir="ltr" style="left: 181.53px; top: 969.452px; font-family: sans-serif"> Big Smoky Accent Light w/Glare Control (ON NEW JACARANDA)<br />
(3) </span>FL-116B Wall Liter Accent Light<span dir="ltr" style="left: 181.53px; top: 969.452px; font-family: sans-serif"> </span></span>LED T3 Lamp - 5W - 30K<br />
<span style="font-size: 12px"><span dir="ltr" style="left: 181.53px; top: 969.452px; font-family: sans-serif">(2) MOVE two lights to better area.<br />
(1) Fix one light that was knocked over. </span></span>', NULL, '2023-08-30 16:49:07', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6341714, NULL, NULL, '2023-08-30 16:48:11', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6344056, NULL, NULL, '2023-08-30 18:41:10', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6345866, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6347416, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Changing to polymeric sand
To help keeping sand in place and filling larger gaps properly.</div></div>', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6347432, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Adding vertical solider course around ac unit and cutting pavers for overlay on brick.</div></div>', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6347994, 'Install (10) 15 gallon Leucadendron ''Safari Sunset = $1800<br />
Install (12) 15 gallon Carolina Cherry = $1800<br />
Install (1) 15 gallon Purple Hopseed =$150<br />
Stake 23 shrubs = $140<br />
Extend irrigation to Carolina Cherries and add drip emitters to all new shrubbery= $750<br />
<br />
Total = $4640.00', NULL, '2023-09-01 12:50:59', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6349316, '(1) @7x4x18”
(1) @7’x3x18”', NULL, '2023-09-07 17:42:32', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6349334, 'Saw cutting existing concrete 
Regrading area next to ADU to pitch water towards street
Pouring new concrete for 40sqft ', NULL, '2023-09-07 17:43:05', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6349341, NULL, NULL, '2023-09-07 17:43:26', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6349347, 'Adding a 22" drain from back corner of ADU to exit into garden bed<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">This can be removed, this was expired I added a new</div></div>', '2023-09-01 07:40:00', NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (6350200, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6351318, NULL, NULL, '2023-09-05 12:04:33', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6353376, 'Spa front wall got extended to the bottom of the bench so more tile is being added so that will be an addition $1600 additional change order The client asked for a new spa remote that I already have for him and that will be an additional $900 change order', NULL, '2023-09-13 08:05:31', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6355730, 'Asphalt on street at cost $600.', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6355873, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">5 hours at $75 per hour plus 40 in material  total $415</div></div>', NULL, '2023-09-05 13:08:27', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6356705, 'Pull about half a basket of old granite and add half basket of Arizona River rock 3" minus ', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6365403, 'This change order is to remove more granite rock from river bed and to repurpose in other parts of the yard. This is only time for labor.

5 hours 1 man ', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6367299, NULL, NULL, '2023-09-07 17:44:04', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6367763, 'Install one new spray zone on side yard planter

Install 11 new gazania flats

Remove old ground cover in area. ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6367770, 'Side yard St Augustine 200 Sq ft.

Adjust irrigation heads.

Includes tilling, adding amendments, grading and laying of sod. ', NULL, '2023-09-10 21:10:04', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6369310, '24 additional sq feet', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6372726, 'Adding a 22" drain from back corner of ADU to exit into garden bed<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Adding a 22" drain from back corner of ADU to exit into garden bed</div></div>', NULL, '2023-09-11 19:04:49', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6373261, '(6) 27"X27"X27" CONCRETE FOOTINGS FOR PATIO COVER, INCLUDES DIGGING HOLES, FORMING FOR CONCRETE AND POURING CONCRETE ', NULL, '2023-09-11 10:07:28', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6373924, NULL, NULL, '2023-09-14 14:23:15', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6374824, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (6378770, NULL, NULL, '2023-09-14 14:23:37', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6381991, '$1600 for lights (offered lower price to client)<br />
$ 600 Installation<br />
$160 Sales Tax', NULL, '2023-09-13 08:52:32', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6382750, '4 Man Days<br />
Demo, trenching, sewer, crack repair, backfilling, compacting.&nbsp;<br />
<br />
Part Guy Hauling and Dump Fees<br />
Material Fees', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6384860, '400 linear feet of benderboard was put in from the options in contract.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Kimberly Uriarte', 'sold'),
  (6391919, 'Adding 16 linear feet of channel drains and connecting it with drain system.&nbsp;<br />
Channel drain to be set in concrete and grading to appropriate grade&nbsp;<br />
We would need to lift all the concrete squares in that area and reset them', NULL, '2023-09-15 19:07:17', NULL, NULL, NULL, 'Kimberly Uriarte', 'sold'),
  (6393453, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6397090, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Price for adding plants $276
Rachio Install $225</div></div>', NULL, '2023-09-18 16:22:36', NULL, NULL, NULL, 'Carter Godley', 'lost'),
  (6401736, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6403457, NULL, NULL, '2023-09-20 08:23:35', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6406462, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6414078, 'Install 96 square feet of waterproofing on neighboring wall Primer and membrane<br />
To meet up with existing waterproof as best as possible', NULL, '2023-09-25 15:44:54', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6416677, NULL, NULL, '2023-09-26 08:17:26', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6416684, NULL, NULL, '2023-09-26 08:17:08', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6416733, NULL, NULL, '2023-09-26 08:16:52', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6416855, NULL, NULL, '2023-09-26 08:16:39', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6418656, '1 light - $240<br />
20 sqft turf - 350', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6418658, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6420188, '1) Install gravel base for wall<br />
2) Install 112 linear feet of stackable wall block by Angelus 4” x 12” x 7” to 24 inches high<br />
3) Install 107 linear feet of stackable wall block by Angelus 4” x 12” x 7” to 18 inches high<br />
<br />
 ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6420930, '1) Dig footings for 20 Ln Feet of Retaining Wall in Pool Equipment Are 2 to 3 feet wide<br />
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
 ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6420948, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6421019, '1) Install 4 additional lights -&nbsp; $480<br />
2) Planting $1330<br />
3) Mulch and Much Installation -$1060<br />
4) Extra Drain - $375<br />
5) Steel Bender Board Upgrade - $535<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6423165, '1) 32" BBQ <br />
2) DOUBLE ACCESS DOORS (UNDER BBQ)<br />
3) SINGLE ACCESS DOOR (UNDER SINK)<br />
4) REFRIGERATOR <br />
5) ICE CHEST<br />
6) SINK<br />
7) TRASH BIN<br />
8) DOUBLE DRAWERS <br />
 ', NULL, '2023-09-27 09:41:21', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6427387, 'We will need to install 7- 24" box red leaf plums Planting mix. $2695. We need a bigger gauge wire for the bougainvillea and hardware. $380.', NULL, '2023-10-07 16:47:44', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6429126, '1) Add in 185 linear feet of gas line - $7065<br />
2) Retaining walls subsurface drain tie in.  - $600<br />3) Includes trenching and backfilling.', NULL, '2023-09-29 10:27:01', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6429468, NULL, NULL, '2023-09-28 10:00:26', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6429918, '(2) courses of block @ 83 linear feet 
(1) course of block @ 46 linear feet', NULL, '2023-09-28 10:36:30', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6429923, '(2) courses of block @ 90 linear feet ', NULL, '2023-09-28 10:36:51', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6431692, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Credit for 8 1 gallons 
20 succulents on flats</div></div>', NULL, '2023-09-28 17:06:13', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6439829, NULL, NULL, '2023-10-03 22:14:08', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6439842, NULL, NULL, '2023-10-03 22:15:03', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6439850, NULL, NULL, '2023-10-03 22:15:22', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6442424, 'Netafim drip with copper shield&nbsp;', NULL, '2023-10-03 11:45:56', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6442883, 'wall rebuild with additional supports', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6444622, '•  Create a raised, sturdy base for the hand pump - 6" to 8" high above soil level. <br />
•  Made of cinder block on a cement footing with cinder block voids filled with cement - to make the top of the cinder blocks look flush.<br />
•  With a <i><b>black plastic tub</b></i> set into the ground - edges at soil level - in front of the hand pump, creating a small "pond.".<br />
•  Position pump at edge of cinder block base - as close as practical to black plastic tub.<br />
<br />
Black plastic tub dimensions:  35" long x 25" wide x 12" deep.<br />
 ', NULL, '2023-10-12 18:40:42', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6447227, NULL, NULL, '2023-10-04 10:53:32', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6447230, NULL, NULL, '2023-10-04 10:54:34', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6447234, NULL, NULL, '2023-10-09 16:31:49', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6447242, NULL, NULL, '2023-10-04 10:55:23', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6447271, 'Additional 545 LF from ADU to street including tap into all down spouts on house ', NULL, '2023-10-04 10:54:59', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6453758, 'We had to add more soils and compact entire 1st tier of garden wall sections,&nbsp;&nbsp;', NULL, '2023-10-17 07:33:29', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6465828, '(54) 1 gallons
(90) 4”', NULL, '2023-10-10 17:01:18', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6469977, '55 linear feet of 3" surface drain across front of the house', NULL, '2023-10-11 23:46:45', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6469982, '17 linear feet of bed at 3'' wide connected 8''x5'' dry pool ', NULL, '2023-10-11 23:36:47', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6469998, 'Original estimate gave an allowance of $2000-2500, however only $2000 was included in total contract cost.&nbsp; The remaining $500 was needed to complete the requested order&nbsp;', NULL, '2023-10-11 17:07:23', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6473908, '1)  Install 10 schedule 80 risers for hosebibs<br />
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
 ', NULL, '2023-10-19 20:49:47', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6473955, 'Run 245 linear feet of conduit and speaker wire per plan.&nbsp; Includes added trenching.&nbsp;', NULL, '2023-10-17 07:36:53', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6474004, '1) Form for 124 liner feet of pool coping.<br />
2) Form for Pool Vault Sections for pool coverings. Vault support by other contractor<br />
3) Pour concrete, Color TBD<br />
4) Pull forms', NULL, '2023-10-17 07:33:04', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6474121, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6474125, '<table style="border-collapse: collapse; width: 456px" width="456">
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
Removed from scope of work, picture build did not do. ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6474134, NULL, NULL, '2023-10-12 17:40:08', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6474424, NULL, NULL, '2023-10-12 18:39:54', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6477878, 'Demo and Rebuild middle section of wall that''s shared with neighbor @ 27 linear feet x 5 tall, wall to include footing, rebar and grout lifting<br />
Add (11)  reinforcement pilasters to remaining sections of wall - will need to saw cut into concrete to add footings<br />
Each pilaster to be 5'' tall by 8" wide <br />
 ', NULL, '2023-10-15 13:29:10', NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (6477896, NULL, NULL, '2023-10-15 13:04:02', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6480199, NULL, NULL, NULL, 2, '2023-10-16 09:45:10', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (6480258, NULL, NULL, '2023-10-17 11:40:20', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6480275, 'Add rainbird timer with modules for 13 stations ', NULL, '2023-10-17 11:39:00', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6480281, NULL, NULL, '2023-10-17 11:38:32', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6480287, NULL, NULL, '2023-10-17 11:37:53', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6480309, NULL, NULL, '2023-10-17 11:35:46', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6483629, 'Pls note the surveying company will need a copy of the legal description from the grant deed in order to the survey.  If you’d like easements included a full title report and underlying documents may be required.

Description of service provided:

• Recover and find original survey monuments
• Prepare calculations for setting monuments
• Set iron pipes on lot corners and markers on lot lines
• Prepare a Record of Survey showing the monuments found or set (stamped and signed)
• File map with the County Surveyor at the county of Los Angeles Building (required)', NULL, '2023-10-18 11:51:36', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (6484440, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6487130, 'Coping-bellecrete mocha modern finish sand<br />
tile work with elements bronze 6x6<br />
equipment -spa heater-filter-pump-two lights for spa and pool<br />
Baja shelf 13x9&nbsp;<br />
widening of spa spillway to 42 inches<br />
one step<br />
pebble finish black<br />
plumbing<br />
electrical and gas hookup<br />
<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Kimberly Uriarte', 'sold'),
  (6487163, 'fixing outdoor lighting and camera', NULL, NULL, NULL, NULL, NULL, 'Kimberly Uriarte', 'sold'),
  (6491577, NULL, NULL, '2023-10-23 14:14:13', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6493591, 'Upgraded to more expensive gravel, cobble and boulder selections for dry creek and kept some extra for future use (we returned 1/2 basket of 3-6" Yosemite and 1/2 basket of 3-6" Auburn)<br />
Used 1/2 basket of 3-6" Yosemite=$210.00<br />
          1/2 basket of 3-6" Auburn = $300.00<br />
           1 basket 1-2" Yosemite = $65.00<br />
           1 basket 6-9" Auburn =$640.00<br />
           Granite boulders 18" (multiple)=$70.00<br />
<strong>LABOR=$1515.00</strong><br />
           ', NULL, '2023-10-19 15:11:47', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6493597, '40sqft of Mojave 3/4" gravel (originally spec''d out at 20sqft Del Rio Gravel)', NULL, '2023-10-19 14:47:02', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6493600, NULL, NULL, '2023-10-19 14:46:53', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6495838, 'We still need 2 quotes for the walls. Both quotes should have the shared wall separately priced and broken out in detail. We will decide whether to keep the original scope of fixing all the top caps on the walls or adding in the reinforcing etc. I don''t want to approve or deny the brick cap repair change order I see until we can get this other information.<br />
<br />
Can this work be completed between Nov 12 - Dec 9?  I can approve prior to leaving out of town next week, if we get it and have a few days to review and talk with our neighbors.<br />
1st Quote Reinforcement of the walls with pilaster. Qty of 8x8 pilasters on the shared wall = $$, Qty of 8x8 pilasters on the back wall =$$, <br />
2nd Quote Reinforcement/Rebuild : rebuild 27''x5'' linear ft =$$ shared wall. Qty of 8x8 pilaster of Shared wall=$$  , Qty of 8x8 pilaster on the back wall =$$', NULL, NULL, NULL, NULL, NULL, 'Kathy & Keith Wilson', 'pending'),
  (6503844, '15 gallon Lime<br />
15 gallon Mission Fig<br />
15 gallon Haas Avo', NULL, '2023-10-23 14:14:29', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6506517, NULL, NULL, '2023-10-26 23:28:51', 1, '2023-10-24 09:12:18', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (6506963, '<p>Form and Pour Concrete sections.&nbsp; &nbsp;Base, Rebar, 2500 PSI concrete.&nbsp; Color TBD. Light Broom Finish<br />
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
', NULL, '2024-01-16 21:28:46', 1, '2023-10-24 10:15:18', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (6509279, 'Lot will be cut down to trench depth and refilled and recompacted. Roughly 48'' wide x 113'' long x 24 - 30" depth.  Grade will be brought up to 8 inches below T.O.S. <br />
We may need to cut some additional soils from property to bring up grade that will be replenished with trench spoils and recompacted. ', NULL, '2023-10-24 17:03:50', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6509326, 'Creating a 3D design for 2 areas on West side of the yard adjacent to the pool&nbsp;<br />
&nbsp;', NULL, '2023-10-24 19:36:46', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6515715, '120 linear feet of strip lights added ', NULL, '2024-02-09 12:51:42', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6515719, 'Remove trees in back corners of property line and stump grind roots<br />
Stump grind all remaining stumps along west side fence line<br />
Remove vines along west side fence<br />
&nbsp;', NULL, '2023-10-27 08:56:10', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6516252, '1) Install (2) Bushman 5050 gal Round Raintanks (Tan)&nbsp;<br />
2) Install (2) Bushman BCK0001 First Flush Connection Kits<br />
3) Install (1) Bushman BCK0003&nbsp; First Flush Key Component Kits<br />
4) Install (2) Flex Hose Kits<br />
5) Install (2) Bushman Auto Fill #64333<br />
6) Install (1) AY McDonald E series 3/4 hp 120v Boot Pumps<br />
7) Includes $1200 Freight Charge and tax.&nbsp;', NULL, '2023-10-30 09:50:05', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6516441, '1) Grade out to best possible for new pad.<br />
2) Dig out the edge of the pad down into the slope so it will retain the pad.<br />
3) For new pad with 12 -18 inch high edge sections to take out slope.<br />
4) Install rebar<br />
5) Pour 12 x 22 foot pad to hold both rain tanks.<br />
<br />
&nbsp;', NULL, '2023-10-26 23:29:49', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6518095, 'Total of 248 1 gal. Gopher baskets 

Total of 162 5 gal. Gopher baskets 

', NULL, '2023-10-26 18:14:50', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6524870, 'Install 1- 300w. Transformer 

Install 11-  AP-00B-107 in bronze
Install 9-   FL-289B IN BRONZE', NULL, '2023-10-30 15:27:14', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6526243, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">We will install an additional 285 sqft of RTF sod for the front yard area

Total charge 1200</div></div>', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'lost'),
  (6526496, 'Total of 57LF. 2''poly line and 37 LF 1"poly line', NULL, '2023-11-14 13:59:55', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6529655, 'Installing 6 every 8 feet across back wall', NULL, '2023-11-21 22:32:34', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6529846, NULL, NULL, '2023-11-29 15:53:30', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6530366, 'Client referall discount', NULL, NULL, NULL, NULL, NULL, 'Kimberly Uriarte', 'sold'),
  (6534797, 'Removal of one tree $1000<br /><br />Adding 15 15 gallon shrubs 2250<br /><br /><br />', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6534917, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Installing 6 linear feet of drain. 9x9 catch basin with pvc cover.</div></div>', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'pending'),
  (6534956, '(3) hours of work)<br />
Loosen soil between ground cover to soften the ground up, add some soil amendments to enrich soil structure', NULL, '2023-11-02 10:59:14', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6539283, 'Installing 670 linear feet 6 feet tall fencing 7 foot on center spacing of posts.<br />
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
 ', NULL, '2023-11-03 09:13:29', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6542123, 'Grinding out sand where there are cracks and refilling the polymeric sand for the entire paver area.', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'pending'),
  (6542131, 'Providing and installing natural look sealer for 1600 sqft of pavers', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'pending'),
  (6542133, 'Providing and installing wet look sealer for 1600 sqft of pavers', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6542687, 'Changed one light at cost', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'pending'),
  (6551730, '20 linear foot wall 3 feet hight with 3 foot by 1 foot footings $189 per foot $3780 total.<br />
To be built with slump stone in doeskin<br />
<br />
25 linear feet of root barrier 3 feet deep $600 <br />
 ', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6551734, 'Demo for very large tree stump and roots in the raised where the new patio will be going.&nbsp;<br />
We will just charge labor for this any additional dump fees and stump grinding pricing we will cover.<br />
<br />
Additional labor is at $600<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6552109, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'pending'),
  (6556130, 'Installing 65 linear feet of main line on the side of house
Cutting out concrete as needed for mainline.', NULL, '2023-11-08 13:44:12', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6556144, 'Adding concrete on the gap on the east side of the house
Approximately 60 sqft 
4 Inches of base 
3 inch concrete
2500 psi
Broom finish', NULL, '2023-11-08 13:43:50', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6559096, NULL, NULL, '2023-11-28 08:22:21', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6559107, NULL, NULL, '2023-11-28 08:42:50', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6564125, 'Supplying and installing 8 cubic yards of brown shredded mulch.', NULL, '2023-11-10 17:12:16', NULL, NULL, NULL, 'Carter Godley', 'lost'),
  (6567486, '232 Square Feet concrete to be removed', NULL, '2023-11-13 12:28:36', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6572687, 'plumbing with new skimmer<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">plumbing with new skimmer</div></div>', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6572866, 'Credit for removing one drip.', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6577074, '26 Linear Feet X $34.00 = $884.00 credit', NULL, '2023-11-15 14:46:15', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6581866, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6591520, 'Installing pressure regulator for watter pressure to valves.', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6592692, '7 lights installed.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6593985, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6597589, '22.5 Linear Feet X $7.00&nbsp; in the front of the property to border neighbor.<br />
&nbsp;', NULL, '2023-11-22 14:28:06', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6597606, '25 additioanl square feet of dry river bed, trenching, large and small rocks X $24.00 (Reduced from $28 a SF)= $600.00<br />
This is as drawn today', NULL, '2023-11-22 14:25:44', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6597615, '2 lines from the corners of the front garage:<br />
1)&nbsp; 18 Linear Feet from the corner of the garage to the end of the Dry River Bed<br />
2)&nbsp; 16 Linear Feet from the garage Driveway corner to the begining of the Dry River Bed<br />
34 Linear Feet total X $20.00= $680.00&nbsp; (Reduced from $25.00 a Linear Foot)<br />
&nbsp;', NULL, '2023-11-22 14:15:22', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6597642, 'The planter beds in front will need their own valve based on water pressure in the future.<br />
Inlcudes additing a line through both planters in the front, and a PVC connection under the brick planter mow strip to the side of the house for future emitters.<br />
Price reduced, because not all of the furture plants are installed at the time.<br />
$800.00', NULL, '2023-11-22 14:40:04', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6597691, '1/2 of the Design fee credited back to installation&nbsp; $1/2 0f $750.00= $375.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6600767, NULL, NULL, '2024-04-08 07:35:20', NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (6602014, 'Up to 1 lowboy, ', NULL, '2023-11-27 10:34:51', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6603098, '80sqft ', NULL, '2023-11-28 08:20:25', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6603123, '16 feet long by 5’ wide at standard 6” deep', NULL, '2023-11-28 08:20:48', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6603141, NULL, NULL, '2023-11-28 08:41:55', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6603544, '40 linear feet additional ', NULL, '2023-11-28 08:14:12', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6604203, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6605865, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6606532, '+10 linear feet', NULL, '2023-11-29 14:42:19', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6606544, NULL, NULL, '2023-11-28 11:13:14', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6607073, NULL, NULL, '2023-11-28 16:16:01', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6615062, NULL, NULL, NULL, 1, '2023-11-30 10:04:07', 'Verva Gerse', 'Verva Gerse', 'lost'),
  (6617243, 'Credit for 9 1 gallon daisies $21.50 each $193.50
Adding 7 dirt flats $67.00 each $469.00
$275.50 total difference', NULL, '2023-11-30 16:48:29', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6620837, 'Approved via text', NULL, '2023-12-18 08:19:43', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6623081, '+1560sqft pavers for (2) sides and back of ADU', NULL, '2023-12-04 10:58:26', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6623085, '60 linear feet of paver steps', NULL, '2023-12-04 10:58:07', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6623110, NULL, NULL, '2024-02-10 10:38:58', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6624462, 'Price for assembly of pergola at cost as a  courtesy on the project.', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'pending'),
  (6631660, 'Plan specs were 2 feet deep on the foundation footing and 16 inches wide<br />
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
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'lost'),
  (6631667, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'lost'),
  (6631699, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'lost'),
  (6633659, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (6633910, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6635128, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6635701, '<br />
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
total cost for additional changes $4,265</strong>', NULL, '2023-12-15 12:42:15', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6637393, '1 yard mulch (we will not add mulch between blue chalksticks, just behind the plants, those plants will need room to grow as they are a groundcover and are meant to grow together)<br />
Additional plants for beds closer to b/yard<br />
Bender board for new turf strips&nbsp;<br />
Installation of additional turf strips (using left over material on site. Please note if additional turf is needed we will add the difference for time/material as a separate c/order)', NULL, '2023-12-11 14:55:49', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6638902, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6640977, 'The contract had 446 sqft the real area after the concrete was poured and extended the area between the buildings was 727 
At 18 dollars a square foot for the additional area the total is $5058', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6641208, NULL, NULL, '2024-01-10 19:06:40', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6643469, 'Invoice 8 - 299.46', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6645662, '+ 8 Linear feet of steps<br />
upgrade to Belgard Dimension&nbsp;', NULL, '2023-12-11 15:34:22', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6645683, '+ 60 linear feet + 13 additonal inlets', NULL, '2023-12-11 18:35:24', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6645689, '+Removing concrete slab (main patio area)<br />
+Removing remaining footings from deck/patio cover<br />
Hauling and disposing of materials&nbsp;', NULL, '2023-12-11 18:35:39', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6645923, '<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">(3) 5g Little Ollie @ <b>$129.00</b>(for the raised planter above bbq area)</span></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">(14) 1g Yellow Yarrow @ <b>$308.00</b> (for corner of beds flanking upper tier patio)</span></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">(10) 1g Blue Fescue @ <b>$220.00 </b>(to fill in near Strawberry and for corner beds flanking upper tier patio)</span></span></span></span><br />
<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif"><span style="font-family: ">(1) 5g Salvia Leucantha @ <b>$43.00</b> (for space where kangaroo paws were located)</span></span></span></span><br />
 ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6650234, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6652976, 'additional forming for segmented concrete&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6656166, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6656400, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6656409, NULL, NULL, '2023-12-15 05:52:43', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6656424, 'Adding to Sideyard with DOUBLE weed barrier
Grey construction gravel ', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6656431, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6656433, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6656436, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6656440, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6656516, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6656761, 'Bring out tile to one more pad to eliminate pitch backwards 

31 SF concrete removal $155
31 SF new 3” pour grey concrete $500
31 SF tile overlay $680

*not included tile to purchase!', NULL, '2023-12-15 05:53:31', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (6658461, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6658469, '790 sqft of pavers at $31.50<br />
minus 9150 in contract<br />
total :&nbsp;15735', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6658490, 'DG FOR APPROX 320SQFT<br />
1" MINUS DEL RIO GRAVEL BORDER FOR (2) FENCE SIDE AREAS, BORDER TO BE 18" DEPTH<br />
BENDER BOARD FOR 2 SIDES, APPROX 46 LINEAR FEET<br />
PLANTS FOR GRAVEL BORDER ($350 ALLOWANCE)', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (6659586, 'Retain 12” of soil on neighbors side with:

(41) LF of 2x12x16’ pressure treated lumber 
(20) stakes 
(1) day labor 2 guys
Includes demo', NULL, '2023-12-15 08:57:43', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6660066, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6661226, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6662972, NULL, NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'pending'),
  (6663128, 'Approx 320sqft- if additional demo is needed a separate change order will be added ', '2023-12-18 07:31:00', '2023-12-18 08:19:18', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6665372, '10 yards for the front yard
3 yards for all of the planter beds 
Soil had to be brought in to fill in all planter beds ', NULL, '2024-01-02 15:06:23', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6665968, NULL, NULL, '2023-12-19 06:30:04', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6667385, 'Upgraded paver cost (from original bid) for pavers and steppers for side yard to 2x2 + 2x1 Belgard Slab pavers&nbsp;', NULL, '2023-12-28 15:37:29', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6667388, NULL, NULL, '2023-12-28 15:36:48', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6673960, NULL, NULL, '2024-01-10 20:34:12', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6675485, 'Discussed with Carmen last week prior to placing order', NULL, '2023-12-21 11:11:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6676074, NULL, NULL, '2023-12-21 11:04:01', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6679845, 'Double siding 86 linear feet of fencing', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6681759, NULL, NULL, '2024-01-02 13:22:51', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6681853, NULL, NULL, '2024-01-08 14:28:22', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6681891, NULL, NULL, '2023-12-27 11:50:30', NULL, NULL, NULL, 'Jorge Flores', 'lost'),
  (6681920, NULL, NULL, '2023-12-27 11:49:31', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6684058, 'Leftover lumber from deck install (left behind by fence company)<br />
concrete pieces&nbsp;', NULL, '2024-01-02 15:15:20', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6684060, '33 linear feet of black steel edging', NULL, '2024-01-02 15:09:05', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6685953, '1/2 day', '2023-12-28 13:39:00', '2023-12-28 17:23:06', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6685957, '80sqft of concrete removed plus install of crushed gravel ', NULL, '2023-12-28 17:22:49', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6685958, NULL, NULL, '2023-12-30 12:16:39', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (6686311, '2 walls, each 5 1/2 long by 18" tall installed and veneering with wall stone', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6687411, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6687426, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6687427, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6687774, '60 linear feet of bender board to lock soil in from spilling out under fence&nbsp;', NULL, '2024-01-02 15:06:52', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6687780, NULL, NULL, '2024-01-02 15:06:08', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6687925, NULL, NULL, '2023-12-29 16:34:28', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6688368, NULL, NULL, '2024-01-02 18:35:34', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6690951, '1 extra low boy + 1 additional day of demo', NULL, '2024-01-03 14:17:44', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6691562, NULL, NULL, '2024-02-10 10:38:39', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6694251, NULL, NULL, '2024-01-08 09:44:16', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6696408, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (6696605, 'Color is Midnight and style is Modern', '2024-01-04 08:24:00', NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6698317, 'Jorge communicated that there was additional time and labor in excavating the river bed due to the supervision on the arborist $550.00. change order', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6698524, NULL, NULL, '2024-01-07 16:42:24', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6699142, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6699980, NULL, NULL, '2024-01-05 09:46:55', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6701766, 'You cannot get the seat on Autumnjoy, so we opted for 5 gallon carpet roses in red.

This is the cost difference .', NULL, '2024-01-07 15:17:31', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6702322, 'Mulch and weed barrier upgrade and additional mulch 800 sq ft', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6702323, '10 ft fence boards and swap out of fence boards above retaining wall.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6705204, 'We had 50 lineal feet of Bender board in the contract and we need 67 lineal feet for a difference of 17 lineal feet x $12 = $204', NULL, '2024-01-08 14:27:10', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6705876, 'Typical rental is $100 for 1-30 days.
Porta potty never came, hence this reimbursement.', NULL, '2024-01-08 14:28:58', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6710032, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6710802, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6718588, 'Demo sides and back of ADU in prep for pavers for 1560sqft&nbsp;<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Hi Morse, I thought I sent you this change order last month when I sent the change order for the additional pavers for the ADU area, and realized today it was never released.  I apologize for that.</div></div>', NULL, '2024-01-12 09:14:09', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6718661, NULL, NULL, '2024-01-22 19:40:50', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6719777, 'Groutlifting with rebar 5 blocks adding cap to match wall.', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6726142, 'Credit for 106 linear feet of bender board&nbsp; that was removed from the contract.', NULL, '2024-01-15 20:09:36', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6726178, 'This is the additional charge for the labor of removing the additional&nbsp; &nbsp;gravel that was below the soil.', NULL, '2024-02-02 15:17:34', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6726260, '(gravel was estimated in for Del Rio and Crushed Gravel)', NULL, '2024-01-22 19:41:03', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6728838, 'Drainage for walkway 
50 linear feet $23 linear foot
5 inlets $75 each', NULL, '2024-01-17 11:58:24', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6729297, 'Transition from pathway in front of ADU stepping up to patio by kitchen', NULL, '2024-01-16 18:49:13', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6729307, '12.6 Linear Feet Bullnose Steps', NULL, '2024-01-16 18:49:27', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6730042, 'The sod area that we marked out is wider than the contract. If we want to go with that footprint, the additional sqtf is 290 at 3.90 per sqft', NULL, '2024-01-17 11:59:14', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6730048, 'This is the price to put gopher mush underneath the sod area to protect from gophers.<br />
<br />
1910 sqft assuming additional sod is added. If not, it will be changed.<br />
The price is at $2.10 per sqft<br />
&nbsp;', NULL, '2024-01-17 11:59:36', NULL, NULL, NULL, 'Carter Godley', 'lost'),
  (6731447, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6731636, '1.  Eliminating the 3" of road base<br />
2.  Keeping grids<br />
3. increasing DG with stabilizer to 4"<br />
Same 2,028 SF<br />
2,028 X $1.80= credit of $3,650.40', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6731647, 'Adding 2" bender Board ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6732023, NULL, NULL, '2024-01-17 10:15:07', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6733775, 'Electrical, sump pump, basin. ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6733986, '(1) 1 gallon Dianella ''Lil Rev''<br />
(1) 5 gallon Jerusalem Sage', NULL, '2024-01-17 17:27:04', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6737995, 'additional jute netting+pick up time', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6743871, 'The city waived the permit fee.&nbsp; So crediting the client the fees.&nbsp;', NULL, '2024-01-22 09:46:56', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6749875, 'Removal only, will need another change order to reinstall ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6750213, 'light well demo<br />
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
', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6751238, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (6751388, '(1) drip zone for driveway planters', NULL, '2024-01-26 10:45:00', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6751394, 'Topping of Plumbago adjacent to pool', NULL, '2024-01-26 08:07:30', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (6752248, 'Did not use fabric in river bed', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6752253, 'Did not need extra hauling', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6753009, '2" Bender Board for 120 Linear Feet', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6753055, '2-2.5 scoops of Del Rio <1" ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6753136, 'Additional plants<br /><br />9 -5gal agave blow glows<br />1 -5 gal lions tail<br />1- 5 gal nandina Gulfstream<br />1- 5 gal pitt silver sheen<br />2- 15 gal Toyons<br />1- 24" box palo verde multi (desert museum)<br />2- 15 gal Rhus ovata<br /><br />12 @ 5 gal × $43.50= $522.00<br />4 @ 15 gal x $150.00= $600.00<br />1 24" box x $380.00<br />Total: $1,502.00 ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6753782, 'Install pipe and board (2) 12x wooden boards with metal stakes along fence of neighbor. stakes will be on inside of board, boards will sit in between columns.<br />
<br />
Soil needs to be cut, grade needs to be taken out. Some soil will need to be removed or graded into front yard.', NULL, '2024-01-24 15:45:12', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6753894, '100 SF of Brown Shredded Mulch. (NO weed barrier because roots of trees are too large to cut around and staple)<br />
<u><strong>Includes demo</strong></u> of 3" below soil and removing shallow roots of the hedge that are in the way.', NULL, '2024-01-24 15:47:14', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6753906, 'along sidewalk on hedge side to prevent mulch from spilling onto sidewalk.', NULL, '2024-01-24 15:48:32', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6754012, 'Please sign to confirm that we are not responsible for plants that do not have irrigation.<br />
These plants will be hand watered by client so as to VOID our plant warranty.', NULL, '2024-01-24 15:49:35', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6757351, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6758000, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6758664, 'Remove existing Fig Trees (x2) <br />
Remove existing Ash Trees (x2)<br />
Grind stumps and haul debris<br />
Additional demo for rain garden (digging down additional 4-8" for 120sqft) ', NULL, '2024-01-26 10:45:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6767120, NULL, NULL, '2024-01-30 09:09:02', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6771214, 'Concrete is 350sqft vs 300sqft&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6777565, NULL, NULL, NULL, 1, '2024-02-01 09:38:51', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (6779026, 'Adding a gas pressure regulator to the line going to the Pizza oven per manufacturer''s recommendation. <br />
 ', NULL, '2024-02-01 20:21:19', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6779666, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6782683, '(6) 5 gallon Butterfly agave<br />
<br />
Client will place plants with Sal.', NULL, '2024-02-02 13:11:59', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6796843, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6799128, 'Adding pavers on the side of patio then taking out pavers under the AC. 
52.5 more sq ft x $17.50= $918.75', NULL, '2024-02-08 12:00:31', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6799142, 'Additional 24.5 linear feet, 10 in contract already installing total iof 34.5 lf
24.5 X $60.00= $1,470.00', NULL, '2024-02-08 12:29:49', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6799154, '564.5 SF X $1.00= $564.50', NULL, '2024-02-08 12:30:27', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6799159, 'Adding 4 step light around pavers steps
4 X $240.00', NULL, '2024-02-08 14:22:55', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6799182, 'The gravel area is now 340 sq ft total
285 in contract X $6.50<br />Extra 55 X $6.50= $362.75<br />Taking out mulch - $618.75<br />CREDIT OF $256.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6799953, 'Mulching all planter beds that are newly planted for backyard - approx 13 yards at 3”', NULL, '2024-02-20 13:13:21', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6801040, NULL, NULL, '2024-02-10 10:38:07', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6804264, 'Install 52 linear feet of stack stone wall at 42 inches high.  Other wall chargee at $80 per foot at average of 20" high. This wall will be $160 per foot as it is double size.  $6,720<br />
<br />
Install 28 step lights $5,340<br />
<br />
Cantilever 189 linear feet of steps and sides of steps.  Total linear footage of cantilever is 232 linear feet.  $4,900', NULL, '2024-02-12 12:22:23', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6804378, 'To prevent the dirt from neighboring driveway from eroding into driveway area&nbsp;<br />
27 linear feet of soldier course', NULL, '2024-02-10 10:37:52', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6804379, '252 LINEAR FEET OF DRAINAGE PIPE AROUND ENTIRE ADU&nbsp;', NULL, '2024-02-10 10:37:26', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6811352, 'Backyard lights only 34 flood lights/well lights +&nbsp; 37 path lights', NULL, '2024-02-14 09:47:11', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6812962, '5G TOYON X 4&nbsp;<br />
5G LEMONADE BERRY X2<br />
1G VERBENA LOLLIPOP X2<br />
1G CAREX X3<br />
1G JUNCUS X3<br />
1G MONARDELLA X6<br />
1G SNOWBERRY X3<br />
1G RED BUCKWHEAT X1<br />
<br />
&nbsp;', NULL, '2024-02-14 20:34:10', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6816199, '138 linear feet of soldier course front corner for planter along 
S/E side of property ', NULL, '2024-02-14 11:24:03', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6816763, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6816808, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6817519, '15'' x 16" (no footing) and stucco for both sides of wall, haul away old concrete', NULL, '2024-02-14 16:40:43', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6817531, 'total of 262sqft for (7) pilasters front entry near street', NULL, '2024-02-14 16:41:30', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6817556, '27 linear feet&nbsp;', NULL, '2024-02-14 16:41:47', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6817560, NULL, NULL, '2024-02-14 16:42:02', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6817567, '15 linear feet of wall cap (10") x 2 (for rebuild wall and existing wall) for the front entry near street', NULL, '2024-02-14 16:42:20', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6817721, '7 pilasters (includes mailbox pilaster) for front entry area near street<br />
<br />
&nbsp;', NULL, '2024-02-22 17:32:19', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6817802, NULL, NULL, '2024-03-01 08:32:34', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6826253, 'TOTAL OF $43,935.00 ON ORIGINAL ESTIMATE/ADDENDUM&nbsp;<br />
$31,350 OF THIS TOTAL AMOUNT WAS APPLIED TO PURCHASE AND PLANT (209) 15 GALLON PODOCARPUS', NULL, '2024-02-16 11:51:41', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6826278, '(3) 8'' BARE ROOT DACTALIFERA PALM TREES @$4200 EA<br />
(7) 42" BOXED BISMARCK PALM TREES @ $3900 EA (INCLUDES 2 TREES FOR FRONT GATE PLANTERS)', NULL, '2024-02-16 11:52:02', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6826323, 'Applying credit towards $9000 estimated demo', NULL, '2024-02-19 18:33:45', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6826496, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6827159, NULL, NULL, '2024-02-18 12:41:21', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6827166, NULL, NULL, '2024-02-18 12:40:50', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6827244, 'Sides of property = (28) floodlights spaced 8'' apart<br />
                               (16) eyeball lights for N/W side only space 8'' apart<br />
                                (3) eyeballs for Cypress Trees by garage<br />
Front Entry              (12) floods for trees<br />
                                (6) eyeballs for pathway ', NULL, '2024-02-16 15:58:20', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6829861, NULL, NULL, '2024-02-19 10:08:15', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6837678, '3 steps @12 lf 
Plus 1 landing 
Topcast finish ', NULL, '2024-02-27 15:21:35', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6838300, 'Between deck steps and new steps 
18sqft ', NULL, '2024-02-27 15:20:48', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6839759, NULL, NULL, '2024-02-22 17:32:03', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6839774, 'Removing pavers along step by ADU to create larger planter&nbsp;<br />
Removing pavers along step by entry to backyard to create larger planter<br />
Finishing border along pavers<br />
&nbsp;', NULL, '2024-02-22 17:31:48', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6844096, NULL, NULL, '2024-02-22 13:56:31', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6844659, 'Where pavers were removed to create additonal planter&nbsp;', NULL, '2024-02-22 17:31:09', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6854367, 'Demo took a lot longer than expected - guys discovered another wall behind Boulder wall that they needed to remove as well ', NULL, '2024-02-27 15:22:12', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (6854746, '60 LF', NULL, '2024-02-27 10:28:39', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6855033, NULL, NULL, '2024-02-27 15:26:09', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (6859043, 'Additional gravel for + approx 1000sqft ', NULL, '2024-02-28 09:45:34', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6859235, 'Install the following plants from design.&nbsp;<br />
<br />
<img src="https://i.gyazo.com/f2895f67ac7ab12fc258dd1348d31e59.png" /><br />
<br />
<img src="https://i.gyazo.com/34f3b0e219498275781cd3c0ab2d7a5b.png" /><br />
<br />
<img src="https://i.gyazo.com/00bee5be55c3ba450924229fdc43b8bd.png" /><br />
<br />
<img src="https://i.gyazo.com/cc7def0faa82ad67966dc31a30bc381c.png" />', NULL, '2024-04-10 23:49:43', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6859294, NULL, NULL, '2024-02-28 09:26:29', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6859302, 'Pull weeds and/or cut and treat.&nbsp;<br />
Rough Grade all soils in roughly 14,000 square feet.&nbsp;<br />
Fine grade all soils<br />
(Any soil removals if needed for grades would be additional)<br />
Later after planting install the following Mulches in roughly 14,000 sq ft.<br />
<img src="https://i.gyazo.com/c7ca572976bce5215b1c9906defcad88.png" />', NULL, '2024-03-27 15:29:48', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6860702, NULL, NULL, '2024-03-05 12:25:50', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6860704, 'Valve connected to existing zone (not installed by PB)', NULL, '2024-03-05 12:25:16', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6861189, NULL, NULL, '2024-03-05 18:34:10', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6865293, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6871995, '60sqft of thoroseal and roll on waterproof&nbsp;', NULL, '2024-03-07 16:45:47', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6872011, 'Creating a partial 3rd course for retaining wall', NULL, '2024-03-07 16:42:33', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6873900, 'adding posts and panels for pool equipment area<br />
2 gates in pool equipment area<br />
$14,010.00<br />
<br />
one handrailing for wheelchair access<br />
$6,720.00<br />
<br />
Total $20,730.00<br />
&nbsp;', NULL, '2024-03-05 18:32:29', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6874620, '16 Bellecrete steppers to create pathway for hammock access', NULL, '2024-03-05 07:53:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6876921, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6879232, 'INSTALLING CONDUIT FOR MAIN INTERNAL AUDIO/VIDEO SYSTEM', NULL, '2024-03-22 09:17:29', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6879237, '&nbsp;INSTALL CONDUIT TO GOOSENECK (CALL BOX), INSTALL GATE SENSORS&nbsp;', NULL, '2024-03-22 09:18:04', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6887061, 'ADding 1 150 Transformer with installation $425.00<br />
Adding 8 lights @ $225.00 each<br />
This includes all wiring and installation of transformer and connection to house<br />
$2,225.00 total', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6887131, '1)&nbsp; Sanding and preparation of&nbsp; existing wall paint debris&nbsp; $600.00<br />
2)&nbsp; 1 coat of Polybond prep<br />
3)&nbsp; Color coat&nbsp;&nbsp;<br />
2 + days of labor with materials&nbsp; $1,200.00<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6887136, 'Cost of Labor and materials&nbsp; with Profit&nbsp; and Over head included<br />
$900.00 Materials&nbsp;<br />
$750.00 labor<br />
based on custom work directed by outside contrctor', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'pending'),
  (6887739, 'Taking out grass', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6888614, 'Total savings from reducing the size would be $319.50. 3 plants at 15 gallon reduced to3 plants at 5 gallon

Would you like to reduce the size of the 3 plants for the $319.50 savings?

Thank you,

Verva

Yes

', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6888711, 'Crediting cost of design mock up back to project as per design agreement', NULL, '2024-03-11 19:26:05', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6888958, NULL, NULL, '2024-03-08 10:24:48', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6888966, NULL, NULL, '2024-03-08 10:25:29', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6888991, NULL, NULL, '2024-03-08 10:25:48', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6888998, NULL, NULL, '2024-03-08 10:26:04', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6889069, 'Set gravel aside for mixing with extra gravel brook front path', NULL, '2024-03-08 10:47:26', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6889086, '2 hours to set', NULL, '2024-03-08 10:48:18', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6889106, 'NOT DOING DRAIN IN HARDSCAPE AREA', NULL, '2024-03-08 10:49:19', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6889117, 'Moving drain to grass area from Hardscape area', NULL, '2024-03-08 10:48:55', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6889180, NULL, NULL, '2024-03-08 10:49:38', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6890972, '<div><span>(1) path light - 2.5W: <a href="https://lightcraftoutdoor.com/product/ap-128b-5/" target="_blank">https://lightcraftoutdoor.com/<wbr />product/ap-128b-5/</a></span></div>

<div><span>(1) up light - 4.5W: <a href="https://lightcraftoutdoor.com/product/fl-286b/" target="_blank">https://lightcraftoutdoor.com/<wbr />product/fl-286b/</a></span></div>

<div> </div>
<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Lights plus travel time.</div></div>', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6895863, NULL, NULL, '2024-03-12 13:54:06', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6897598, NULL, NULL, '2024-03-12 13:53:46', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6899484, 'This is cost for the wood only
4x12 milled to 3 x11.5 
', NULL, '2024-03-12 14:38:12', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6900011, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6900286, '69 linear feet X $55.00= $3,795.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6900290, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6900292, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6900297, '30 flats of ground cover with amendments ', NULL, '2024-03-13 17:39:21', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (6900329, NULL, NULL, '2024-03-12 20:34:06', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6901095, NULL, NULL, '2024-03-13 07:38:14', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6904156, NULL, NULL, NULL, 1, '2024-03-13 15:15:09', 'Mohammed Rahman', 'Mohammed Rahman', 'sold'),
  (6904437, 'FOR 2700SQFT&nbsp;', NULL, '2024-03-13 17:48:49', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6906432, '<span style="color: rgb(61,133,198)"><u><strong>Plant List</strong></u></span>
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
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">1. leave the seed bag with client to continue to use
2. Move the uplights in the arbor forward in front of the plants to shine on Pride of Maderia and checking the irrigation.  (this is time and material - $85/hour plus wire if needed to extend - I will have to wait to see how long it takes and add change order).</div></div>', NULL, NULL, 1, '2024-03-26 16:18:54', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (6908556, 'Credit for removing lighting fixtures from contract', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6910412, '(1) 15g Dwarf Meyer Lemon<br />
(1) 15g Bearss Lime Standard<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6910415, '4 hours of powerwashing - no guaruntee of final look', NULL, '2024-03-16 18:17:02', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6910420, 'Adding soil for (3) pots and 1 XL planter', NULL, '2024-03-16 18:16:44', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6910429, NULL, NULL, '2024-03-16 18:16:23', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6910895, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6912247, 'Install 18 inch wall on south side property.&nbsp; Wall will be buried in soils to take out grade and stabilize the top includinig the paver.&nbsp;<br />
Wall will be capped with paver.&nbsp; &nbsp;Wall to be roughly 70 linear feet.&nbsp;', NULL, '2024-03-18 13:15:10', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (6912356, NULL, NULL, '2024-03-18 13:15:42', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6912836, NULL, NULL, '2024-03-18 15:06:05', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6915545, '3.6LF of 3" SDR pipe extend from mulch area to grass area with NEW drain grate.', NULL, '2024-03-18 15:17:07', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6916100, NULL, NULL, '2024-03-18 15:07:50', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6916502, NULL, NULL, '2024-03-18 20:20:14', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6918760, '3" 45 Elbow (SxS) PVC Schedule 80<br />
<br />
Product #: GFP-817030<br />
Weight: 1.3<br />
Description<br />
3" 45 Elbow (SxS) PVC Schedule 80<br />
<br />
40 units', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6918986, '57 LF. Concrete swell 
Form about 57LF for concrete swell 
Pour concrete trawl and finish ', NULL, '2024-03-26 23:09:40', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6918999, 'Cut and grade back hill side, remove and export about 120 yards of soil', NULL, '2024-03-26 20:21:37', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6919013, NULL, NULL, '2024-03-26 23:09:24', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6919022, NULL, NULL, '2024-03-26 23:10:35', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6919318, '360 feet 4” ABS Drains with inlets Tie in downspouts', '2024-05-31 10:13:00', '2024-05-09 07:53:31', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6921323, '+ 55 linear feet from gas line to gas meter', NULL, '2024-05-09 07:54:20', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6921327, NULL, NULL, '2024-05-09 07:52:49', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6921343, 'Estimate states 75 linear feet, wall is actually 83 linear feet&nbsp;<br />
&nbsp;', NULL, '2024-03-19 17:14:25', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6921619, 'FRONT 2 PLANTERS', NULL, '2024-03-22 09:17:48', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6921858, 'Demo<br />
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
TOTAL COST: $2,330<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Please double check that irrigation is reaching new plants and if not, make suggestions and I will put in a change order.
Client is aware. She will buy the Dusty Miller plants for us to plant @ $10/each.</div></div>', NULL, '2024-03-22 07:08:52', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6922528, NULL, NULL, '2024-03-20 11:37:08', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6922533, NULL, NULL, '2024-03-22 12:59:17', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6922543, NULL, NULL, '2024-03-20 11:38:09', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6922567, NULL, NULL, '2024-03-21 09:28:26', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6922586, NULL, NULL, '2024-03-20 11:38:42', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6922592, NULL, NULL, '2024-03-20 11:39:15', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6923069, '+40 linear feet of 3/4" conduit and wiring ', NULL, '2024-03-24 17:36:44', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6923087, '1 1/4" conduit only to replace corroded line for 52 linear feet', NULL, '2024-03-28 19:49:34', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6924011, 'Extra Demo for 10 -12 inch concrete pad under Patio - $2250<br />
Extra Demo for Grade Behind Pool - $750', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6924480, '@$85/each', NULL, '2024-03-20 19:24:53', 3, '2024-03-20 11:36:19', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (6924753, NULL, NULL, '2024-03-20 15:47:59', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6925006, NULL, NULL, '2024-03-21 09:28:59', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6925011, NULL, NULL, '2024-03-21 09:29:29', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6925207, '<br />
New Plants<br />
(2) Cali Fuchsia (credit)<br />
(2) San Miguel Buckwheat (credit)<br />
(2) Manzanita (only charged for 1)<br />
(2) Rhus&nbsp;<br />
&nbsp;', NULL, '2024-03-20 16:43:00', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6925962, 'Client provided 31 (1 gallon) plants to plant. Labor only.', NULL, '2024-03-20 15:48:34', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6925965, '@$38 (labor and material) per pop up', NULL, '2024-03-20 15:54:57', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6927390, '(1) 5gallon Pink Passion $45<br />
(1) 1gallon Azalea $22<br />
(1) 1gallon Creeping Jenny $22', NULL, '2024-03-21 09:37:40', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (6931209, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (6931451, 'Install 9 foot base kitchen<br />
Install 11 foot x 3 foot&nbsp;<br />
Install undermount lighting<br />
Install composite veneer to match front.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6931457, '1) Install electrical conduit 20 linear feet.<br />
2) New 2x2 catch basin 3 ft deep<br />
3) New 1/2 HP pump<br />
4) 60 linear feet of 2 inch discharge line.<br />
5) Catch basin extensions for 3ft depth<br />
6) 2 inch check valve<br />
7) Check valve union<br />
8) Black PVC drain grate.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6931466, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Install 65 feet of electrical from panel to outdoor kitchen. 
Install 35 ln feet from vent exit.</div></div>', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6938489, NULL, NULL, '2024-03-25 12:38:37', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6947287, 'Removal of existing pad, repouring new concrete and reinstalling pool equipment<br />
40sqft of concrete', NULL, '2024-03-28 19:49:22', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6947822, 'Additional scoping&nbsp;<br />
Covering up open areas by garage and inner courtyard where channel drain and catch basins are being installed in prep to finalize work&nbsp;', NULL, '2024-03-28 17:36:22', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6948332, 'Run new 1" copper water main line 40 LF. from street meter to house.', NULL, '2024-03-27 15:29:24', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6950694, NULL, NULL, '2024-03-28 11:51:29', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6953403, '5 Lights to be directly installed into top of bench every 6’', NULL, '2024-04-03 10:06:37', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6959353, NULL, NULL, '2024-10-28 13:55:28', NULL, NULL, NULL, 'Carter Godley', 'pending'),
  (6960052, 'New Skimmer (Demo, Steel, Concrete) New Auto Fill Replaster New LED Spa Light/extend brass pipe to equipment Retile New Wi-Fi Controls New Coping/pour in place. and stucco&nbsp;', '2024-05-31 06:02:00', '2024-05-09 07:55:28', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6965962, NULL, NULL, '2024-04-03 12:55:26', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6967015, NULL, NULL, '2024-04-03 12:54:29', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (6971198, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6971206, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6971563, 'Backyard Fencing Installed @ 6ft height (8 foot posts) 162 Linear Feet<br />
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
Front pricing figures for installing cedar fencing i slotted metal railings and gates. ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6971823, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6971960, 'Wrap front house wall with waterproofing and wire.<br />
Clean up patio footings and lower wall.<br />
Wrap patio sections with waterproofing and wire as needed.<br />
Install scratch coat on wire front and patio<br />
Install brown coats for front and patio<br />
Install stucco coats for front and patio', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6972614, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (6975524, '5x5 concrete landings $460<br />
10Lf. Steps and cut into block for landing $720<br />
Demo 10 medium trees 1,000<br />
Grade and export soils 220 square feet 1100<br />
60lf sub drains $2,382<br />
220 sq ft of concrete on side yard $3,900<br />
<br />
Leave a comment on which one you would like to approve to finalize change order', NULL, '2024-06-07 17:55:38', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6975648, 'midnight blue pebble finish', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (6980356, '288 linear feet of 4" high grade pipe around 3 sides of property and connecting to existing pipe installed by Alpha<br />
Includes inlets', NULL, '2024-04-16 09:07:58', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6980681, NULL, NULL, NULL, 1, '2024-04-08 17:47:37', 'Mo Solomon', 'Jorge Flores', 'sold'),
  (6982395, '30''x 7'' and 8" below grade includes hauling out debris', NULL, '2024-04-16 09:07:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6987506, 'Hey George, so I ran the numbers for the pavers 

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


', NULL, NULL, 1, '2024-04-10 10:50:57', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (6990876, 'Dowel, form and pour foundation cover in patio.&nbsp; &nbsp;<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6990997, 'Remove Bouganvillia,&nbsp;<br />
Remove trunk and root systems.&nbsp;<br />
Haul waste.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6991539, 'Jack house,&nbsp;<br />
Remove unused anchors<br />
Install New Sill plates<br />
Install Sill straps<br />
Install new pier supports for subfloor beam', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6991695, NULL, NULL, '2024-05-16 14:38:19', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (6993662, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (6997315, 'Border credit - $800<br />
Wood Post $200<br />
Design Credit $450', NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (6999101, 'Backyard landings (2) @ 8 linear feet and (1) @ 12 linear feet  - landings to have standard 3'' depth <strong>(@$5000.00)</strong><br />
Step to get into backyard (1) @ 12 linear feet/step to have 14" tread<strong> (@$1100.00)</strong><br />
(These steps include concrete forming and pouring for base)<br />
<br />
Bellecrete for front entry steps includes (1) landing at 3'' depth and (2) steps at 8 linear feet each <br />
These steps are Bellecrete only as steps formed and poured by interior contractor <strong>(@$2200.00)</strong>', NULL, '2024-04-24 15:30:16', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6999165, '87 linear feet of wall cap&nbsp;', NULL, '2024-04-16 09:07:11', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (6999199, '28 linear feet (does not include water feature wall)', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (7002117, '(24) 5 GALLON COUSIN ITT @$1560<br />
(20) 5 GALLON CONVOLVULUS&nbsp; @$860<br />
(6) 15 GALLON AGAVE PARYII @ $1100<br />
(4) 15 GALLON EUPHORBIA SUCCULENTS @$700<br />
(54) 1 GALLON KANGAROO PAWS @ $1200&nbsp;', NULL, '2024-04-18 17:28:27', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7002184, '3 path
3 flood 

Additional cost for strip lights; instead of step lights<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Need to know what flood lights these are, maybe crew in field can take photo? Lighting plan has many different lights.</div></div>', NULL, '2024-04-16 10:16:16', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (7002185, NULL, NULL, '2024-04-16 10:16:44', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (7004740, 'BRYAN TO INSTALL WEED FABRIC FOR 2 BEDS FOR 60SQFT', NULL, '2024-04-18 10:05:45', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7005511, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7006143, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7007435, NULL, NULL, '2024-04-17 09:55:12', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7013141, '- New Custom Powder Coated Posts and railings - Black&nbsp;<br />
- Custom Slide In fencing edges for no screw exposed look.&nbsp;<br />
- New driveway gate with railings<br />
- New Motor and Motor Pad for driveway gate<br />
- Electrical run to motor<br />
- Low voltage to pedestrian gate<br />
- New Striker at pedestrian gate and latch<br />
- New steel framed pedestrian gate for front and side yard access.&nbsp;<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7013169, 'Remove equipment from wall<br />
Remove electrical<br />
Frame out opening for panel<br />
Install mesh wire in open sections<br />
Scratch coat patches<br />
Brown coat patches<br />
Final coat stucco', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7013174, 'concrete pour plus bellecrete pieces', NULL, '2024-04-24 14:14:59', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7013222, 'Existing post did not go to ground.&nbsp; &nbsp;Remove, brace and install new post.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7017309, '<p style="margin-bottom: 0"><b><span style="font-size: 12pt; line-height: 105%">SOIL PREP</span></b><span> (no import or haul out of soil/limited access to slope)</span></p>

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
', NULL, '2024-04-19 10:15:00', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7024197, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7027336, NULL, NULL, '2024-04-27 09:36:22', NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (7027407, 'BACKYARD<br />
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
&nbsp;', NULL, '2024-04-25 11:12:33', NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (7027419, NULL, NULL, '2024-04-25 11:11:09', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7029741, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7032605, 'Paver step redo ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7035900, 'Trench 50 feet for 2 new irrigation zones to extra planting from concrete fence to current planting plan.&nbsp;<br />
Trench additional 25 feet under concrete fencing for main line to front.&nbsp;<br />
Run 75 feet of new mainline for front.&nbsp;', NULL, '2024-04-25 21:50:32', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7035911, NULL, NULL, '2024-04-25 21:50:03', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7036202, 'Remove existing fencing and grind out rebar reinforcement.<br />
Install 164 ln feet of new chain link fence of smaller hole width along the entire back.&nbsp; Chain link to meet LABC requirements adn will be 1 1/4 inch mesh spacing.<br />
Remove and Replace 2 posts that are bent.<br />
Haul waste fence', NULL, '2024-04-26 07:51:26', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7036207, 'Install concrete culvert 99 linear feet. 12 inches wide.', NULL, '2024-04-25 21:50:14', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7044688, NULL, NULL, '2024-04-30 07:28:45', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7050134, 'Add another 17 linear feet of step to the original contract. Total of 34 feet.&nbsp; &nbsp;$1900<br />
Upgrade material to Timber Tech premium. $800<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Approved via phone</div></div>', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7050148, NULL, NULL, '2024-04-30 16:44:51', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7052044, '40 bags of glass chips for fire pits ', NULL, '2024-05-01 09:25:57', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7052434, NULL, NULL, '2024-05-01 15:02:58', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7052447, NULL, NULL, '2024-05-01 13:07:05', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7052519, '4 up lights 
3 path lights ', NULL, '2024-05-01 10:23:05', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7057221, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7057490, NULL, NULL, '2024-05-16 14:38:45', NULL, NULL, NULL, 'Mo Solomon', 'lost'),
  (7057655, NULL, NULL, '2024-05-16 14:35:14', NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7058682, NULL, NULL, '2024-05-02 21:03:24', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7059587, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7059641, 'New planting layout including added hillside and reductions are as follows<br />
<br />
Additional (38) 1 gallon - $950<br />
A reduction of (6) 5 gallons - ($240)<br />
A reduction of (10) 15 gallons - ($1500)', NULL, '2024-05-02 21:03:36', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7059660, 'Add (603) 1 gallon gopher baskets @$8 each installed.&nbsp; &nbsp;- $4,824<br />
<br />
Add. (113) 5 gallon gopher baskets. @$15 each installed - $1,695<br />
<br />
Add (12) custom 15 gallon gopher baskets. @$19 each installed. $228<br />
<br />
No baskets for flats.&nbsp; Option to put field wire below flats', NULL, '2024-05-02 21:03:52', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7060478, 'To separate ground cover from gravel ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (7063260, 'Install 1140sq. Jut net', NULL, '2024-05-04 09:56:27', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7065375, 'REbuilding 8 linear feet of railroad tie wall up by fenceline to stabilize, will use the same materials and reset courses', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7065378, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7067471, '40 lf of drainage around pool', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7067475, 'Upgrade subpanel, new breakers, new wire.
New wifi switch
', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7067500, 'upgraded from pea gravel to arizone river rock&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7067503, '$240 per light<br />
$400 lighting transformer&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7067779, 'Credit for removal and planting of 2 fruit trees and one fig tree', NULL, '2024-05-07 10:14:34', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (7067783, '6 Jasmines will be paid for and delivered by client
(We will do the planting @ $40 each)', NULL, '2024-05-07 10:13:55', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (7067786, NULL, NULL, '2024-05-07 10:13:20', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (7067790, NULL, NULL, '2024-05-07 10:13:05', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (7067846, 'Credit for difference between:

6 (1gallon) agave blue glow
To
(2) 5 gallon agave blue glow ', NULL, '2024-05-07 10:11:58', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (7067849, NULL, NULL, '2024-05-07 10:11:33', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (7067857, NULL, NULL, '2024-05-07 10:10:46', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (7072183, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7072184, '3/8" black lava rock approx 150sqft<br />
brown shredded mulch approx 300sqft (no weed cloth)', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7073302, 'Demo concrete and split drains', NULL, '2024-05-09 07:55:02', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7073507, 'Demo and hauling seven hedges in planter in the front yard&nbsp;<br />
Removing root balls and hedge.<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'lost'),
  (7076822, '600sqft', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7079930, 'Approx 900sqft of steppers with 6” joints - gravel to be a separate c/o
Order will be placed today <!-- begin_ammend -->Includes demo<!-- end_ammend -->', NULL, '2024-05-10 08:14:05', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7080298, NULL, NULL, '2024-05-14 07:57:17', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7082584, '(16) 15 gallon
(21) 24”', '2024-05-10 08:10:00', '2024-05-10 08:13:14', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7084020, '1 crew day', NULL, '2024-05-16 09:28:46', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7084657, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7086728, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7092202, 'sealer for pavers', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7100760, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7100765, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7100772, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7100925, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7101550, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7101893, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7101910, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7101914, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7102743, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7102873, 'There was no shoring detail on the approved plans from the city, but the city required it to move forward.<br />
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
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7102931, 'Exposing all existing drainage to find problems<br />
Lowering outlet pipes.<br />
Jetting and cleaning existing drains<br />
Rerunning and splicing 6 drains to get flow out to creek.<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7102957, 'Water proofing on existing stucco was cut with old deck install<br />
Needed to redo stucco around ledger boards and 3 feet down<br />
17 linear feet by 3 feet down and closing vents.<br />
&nbsp;', NULL, '2024-05-17 13:06:03', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7102990, 'Rerouting the main line around the other side of the house because there was concrete poured where our line is supposed to be run.<br />
The inspector required removing concrete to install the main line, which is not an option.
<div>There were no sleeving installed on 6 paths that were called out for sleeves on the plan.</div>
Jetting main line 28 feet in areas with no sleeves.<br />
<br />
6 man days for jetting and rerouting mainline.', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7106403, 'Adding Stabilizer for the Walkway and around the Olive Tree<br />
<br />
Lifting gravel and mixing with stabilizer and trowling down.', NULL, '2024-05-17 15:29:05', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7106475, 'Adding Subterranean Drip for Grass', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7106479, NULL, NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7106484, NULL, NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7106507, 'Electrical Repair on Valve&nbsp;<br />
Fixed Broken T', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7110886, '2 camellia<br />
1 new 15 gallon espalier&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7110893, 'lights 1620', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7114074, NULL, NULL, NULL, 2, '2024-05-21 12:08:36', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (7114083, 'Additional drainage. 260 additional lfx $25', NULL, NULL, 1, '2024-05-21 12:10:30', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (7114098, NULL, NULL, NULL, 2, '2024-05-21 12:11:52', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (7114113, 'Adding at ends of bench seat', NULL, NULL, 2, '2024-05-21 12:13:37', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (7114133, 'Adding one foot', NULL, NULL, 2, '2024-05-21 12:15:12', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (7114495, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7114606, 'Approved verbally in meeting ', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7115776, NULL, NULL, '2024-05-21 19:30:27', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7116793, 'Earlier paver credit had a 12-foot deep front patio.&nbsp; &nbsp;The front patio, per request, is to be 14 and half feet deep (18) inches away from sidewalk.&nbsp; So this change adds back 65 square feet.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7116878, 'Attach posts and fencing for west side Yard.&nbsp; 2x4 anchored to the wall every 4 feet, with 4x4 support.&nbsp; Then cedar fencing for the top section.<br />
Add additional 4x4 to sign to fur out fencing on neighbor side.<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7116886, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7116891, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7117351, '<ul>
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
', NULL, '2024-05-22 09:04:44', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7117502, 'Add flagstone and bond beam', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7121036, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7125630, NULL, NULL, '2024-05-24 08:34:46', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (7126290, 'Approved via text', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7126625, 'via text from jorge<br />
2 lights<br />
swap from little smokeys to a different light', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7127801, NULL, NULL, '2024-05-25 09:30:07', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7128661, 'Credit for 1/2 yard of unused gravel.', NULL, '2024-05-27 13:17:34', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7134978, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (7135245, '200sqft of pavers for sunken firepit 

****Pls note there was a credit issued on 2/1/24 for concrete (#26) - part of this credit was initiated b/c the original design plan called out concrete for the firepit area which we switched out to pavers, the change order should have also reflected the additional pavers but the change order was never updated***', NULL, '2024-05-29 11:29:31', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7141899, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7141906, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7141938, '8 LF X $62.40= $499.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7142708, 'Install cleanouts beyond fence area', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7142711, 'Credit for removing wiring work of lights in contract', NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7146091, 'Remove driveway, patio & rear step<br />
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
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Mo approved 12K to be paid for change order and remaining balance to be paid once house sells.</div></div>', NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7146297, NULL, NULL, '2024-05-31 17:26:51', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7146720, 'Adding the driveway', NULL, NULL, 1, '2024-06-01 19:04:29', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (7151267, 'Entire patio area concrete to be stamped concrete, this will include the areas on either side of patio cover (current concrete does not include&nbsp;<br />
this 290sqft)', NULL, '2024-06-13 16:56:01', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7156202, 'Not installing the garbage can walls, taking out of contract.', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7156361, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7157264, '

2.  Curbing Angelus Rustic wall block on it''s 8" vertical side, exposing 4''-6" curb next to pavers on the front porch side

12 Linear Feet X $28.80= $354.60


Material choices:

Wall:  Angelus Rustic Wall Block in grey/moss/charcoal

Curb:  Angelus Rustic Wall grey/moss/charcoal

', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7157276, '

1.  Garden Wall 12" high in Angelus Rustic wall block in Grey/Moss/Charcoal 

30 LInear Feet X $86.40= $2,592.00




Material choices:

Wall:  Angelus Rustic Wall grey/moss/charvoal

Pavers: Angelus Holland in grey/moss/charcoal 

  Border same paver in soldier''s course

  Field in horizontal runner course

', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7157340, '

<p style="margin-bottom: 0"><b><span style="font-size: 12pt; line-height: 107%; font-family: "Times New Roman", serif"> </span></b></p>

<p style="margin-bottom: 0"><b><span style="font-size: 12pt; line-height: 107%; font-family: "Times New Roman", serif">Concrete pads</span></b></p>

<p style="margin-bottom: 0; text-indent: -0.25in"><span style="font-size: 12pt; line-height: 107%; font-family: "Times New Roman", serif">1.<span style="font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-alternates: normal; font-kerning: auto; font-feature-settings: normal; font-variant-position: normal; font-stretch: normal; font-size: 7pt; line-height: normal; font-family: "Times New Roman"">      </span></span><span style="font-size: 12pt; line-height: 107%; font-family: "Times New Roman", serif">6 pads </span></p>

<p style="margin-bottom: 0; text-indent: -0.25in"><span style="font-size: 12pt; line-height: 107%; font-family: "Times New Roman", serif">2.<span style="font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-alternates: normal; font-kerning: auto; font-feature-settings: normal; font-variant-position: normal; font-stretch: normal; font-size: 7pt; line-height: normal; font-family: "Times New Roman"">      </span></span><span style="font-size: 12pt; line-height: 107%; font-family: "Times New Roman", serif">2’ X 2’</span></p>

<p style="margin-bottom: 0; text-indent: -0.25in"><span style="font-size: 12pt; line-height: 107%; font-family: "Times New Roman", serif">3.<span style="font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-alternates: normal; font-kerning: auto; font-feature-settings: normal; font-variant-position: normal; font-stretch: normal; font-size: 7pt; line-height: normal; font-family: "Times New Roman"">      </span></span><span style="font-size: 12pt; line-height: 107%; font-family: "Times New Roman", serif">Poured in place or Angelus Pavilion
2’ X 2’</span></p>

<p style="margin-bottom: 0; text-indent: -0.25in"><span style="font-size: 12pt; line-height: 107%; font-family: "Times New Roman", serif">4.<span style="font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-alternates: normal; font-kerning: auto; font-feature-settings: normal; font-variant-position: normal; font-stretch: normal; font-size: 7pt; line-height: normal; font-family: "Times New Roman"">      </span></span><span style="font-size: 12pt; line-height: 107%; font-family: "Times New Roman", serif">$125.00 each</span></p>

<p style="margin-bottom: 0"><span style="font-size: 12pt; line-height: 107%; font-family: "Times New Roman", serif">Cost:   $750.00</span></p>

', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7160585, NULL, NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7160925, 'Remove 3 inches of soils and grade.<br />
Install geotextile fabric<br />
Install 350 square feet of Del Rio Gravel', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7160929, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7160936, 'Install 3 2x8 beam covers inside patio.<br />
Install 3 2x8 outlet wraps outside posts<br />
Install 3 patio light extensions<br />
Wrap 3 posts in 3/4 inch wood table grade ply.&nbsp; Butt joint<br />
Fill and level wood patching w 4 to 5 coats of Bondo.<br />
Install plastic post veneer bases to all posts.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7160955, 'Install&nbsp;<br />
(14) 5 Gallon Lady Banks<br />
(8) 5 Gallon Giant Bird of Paradise<br />
(16) 5 Gallon Staked Star Jasmine<br />
(2) 15 Gallon Durante<br />
(20) 5 Gallon Boxwood<br />
(14) 5 Gallon Grewia<br />
(3) 15 Gallon Regular Bird of Paradise<br />
(8) 1 Gallon Stattice<br />
<br />
Install 2 yards of Walk on Mulch', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7165437, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7166497, '1. Rebuilding small retaining walls flanking steps (brick caps) @$4000.00<br />
2. Rebuilding steps to front yard 6 steps cantilevered in concrete (finish//color to be the same as b/y) @$3800.00<br />
3. Rebuilding (2) front step landing areas, for a total of 84 linear feet in concrete (finish/color to be same as b/y) and&nbsp;concrete walkway aligned&nbsp; &nbsp; &nbsp; to steps and front entry walkway for 209sqft @$4800.00', NULL, '2024-06-09 19:18:16', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7167029, 'This counter will be priced at straight, not curved, with flat counter top to match outdoor kitchen counter

6" wall/edge 30" pizza oven on counter 24" counter next to pizza oven for a total of 5'' wide with 36" deep. 

5'' x $740.00 masonry = $3,700.00

Gas 10 linear feet x $35.00= $350.00

Electric 9 lf x $35.00 $315.00

Total $4,365.00

Includes installation of pizza oven and access doors

', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7167397, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7168632, '231 sqft of DG 4.15 per sqft total is $958.65', NULL, '2024-06-07 17:41:11', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7168633, '100 sqft of Del Rio Gravel for Side Yard 3.85 per sqft&nbsp;<br />
Total is&nbsp;$385', NULL, '2024-06-07 17:41:23', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7168637, '7) 15 gallon climbing roses $315 per rose<br />
<br />
Total $2205', NULL, '2024-06-07 17:50:09', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7168638, 'Installing Trellises<br />
<br />
2 hours of labor at $70 per hour<br />
<br />
Total $140', NULL, '2024-06-07 17:38:51', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7168644, '8) 15 gallon Ligustrums Texanum $150 per plant<br />
1) 24 inch box Magnolia Little Gem $385<br />
<br />
Total $1585', NULL, '2024-06-07 17:50:22', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7168651, '18 sqft of concrete $50 per sqft<br />
<br />
Total&nbsp; $900<!-- begin_ammend --><p>Understanding is this is the planter on the side of the house to be covered.</p>
<!-- end_ammend -->', NULL, '2024-06-07 17:50:41', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7168652, NULL, NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7168856, 'Rip cut 2x6 fencing material.&nbsp;<br />
Drill Anchors and attach wood veneer<br />
Veneer in staggered butt joint ends.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7169726, NULL, NULL, '2024-07-18 16:49:26', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7170924, 'Alumawood Pergola. PB to excavate footings only<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Alumawood Pergola. PB to excavate footings only</div></div>', NULL, NULL, 2, '2024-06-10 09:58:32', 'John Durso', 'John Durso', 'sold'),
  (7170971, NULL, NULL, '2024-06-28 18:11:19', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7170974, 'Del Rio at 3" @3042sqft includes landscape fabric', NULL, '2024-06-28 18:11:48', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7174210, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (7174213, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (7175468, NULL, NULL, '2024-07-10 16:35:48', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (7175477, NULL, NULL, '2024-07-15 17:05:00', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7177960, '1) Clean fencing<br />
2) Apply Cabots clear wood sealer. Roughly 4160 sq feet<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7178176, '7 FLATS BLUE STAR', NULL, '2024-07-18 16:49:09', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7178179, NULL, NULL, '2024-07-18 16:48:45', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7179218, 'Install culvert and sidewalk.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7179589, 'The amount of Paver installed was actually 1100 sqft plus 42 sqft still needed for parkway.<br />
549 sqft being Credited <br />
15.25 per sqft <br />
Total credit of $8,372.25', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7179698, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7185757, '380 sf x $5.50= $1,540.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7186763, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7190936, 'Grind out cracks made in stucco.&nbsp;<br />
Grind out bad stucco patch&nbsp;<br />
Grind out small section stucco patio<br />
Repair stucco patches and cracks', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7190938, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7190939, 'Install roughly 110 of 2x6 treated board. Not included in original contract.<br />
<br />
(No charge for original bender board swap out', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7195200, '6 2 gallon lavenders @ $30.00 each. $180.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7195796, 'Upgrade Sod to St Augustine', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7195801, 'Original Contract has 19 lights.&nbsp; Install 21 bed lights<br />
Plus Install 4 FX Luminaire Upgraded Path lights<br />
Plus Install 2 down lights for trash area.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7198970, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7203065, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7206250, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'pending'),
  (7210563, 'Additional Demo for the front yard.', NULL, '2024-06-21 08:42:27', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7210575, 'Stump grinding $460&nbsp;', NULL, '2024-06-21 08:42:50', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7210584, '43 linear feet at 13 dollars a foot&nbsp;', NULL, '2024-06-21 08:43:02', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7212811, '2.5 Crew days at 7 hours a day $150/hour - $7875<br />
Import 9 yards of dirt, $400 delivery (x2), $13/yard&nbsp; - 917', NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7214685, NULL, NULL, NULL, NULL, NULL, NULL, 'John Durso', 'sold'),
  (7216500, 'Added one light', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7222389, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">1.  Circle pattern in Angelus Courtyard in Tuscan
2.  Dark border in charcoal or Mocha
If you would like the  circle pattern instead of the random 4 piece pattern the cost is:  $675.00  This includes the additional special order of the circle with the hand grouted polymeric grout needed for the joint spaces.
If you would like a dark charcoal border around the circle it is $105.00
Total for both:  $780.00</div></div>', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7222473, '


That is $383.44/ft, and we are short 5.5'' on the s/w return = $2,108.92

', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7222475, 'Leaving $200.00 to install an owner provided app- operated transformer', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7223204, 'Demo and haul', '2025-06-26 00:00:00', '2024-07-18 16:48:27', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7223234, 'Install step at 6’ x 26”
Install step at 79”x 24”', NULL, '2024-08-08 12:24:01', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7226223, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7231257, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7231276, NULL, NULL, '2024-07-05 07:43:50', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7231278, '6 PATHS<br />
3 UPS<br />
1 TRANSFORMER', NULL, '2024-07-05 07:44:14', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7231281, 'Added JellyBean to gravel areas', NULL, '2024-07-05 07:44:36', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7232340, 'See list from Jorge of reduced plants and add 1 15 gal lime and 1 flat of rosemary. Original in contract $5,092.50 , reduced to $3,411.00. Difference is -$1,680.50', NULL, NULL, 1, '2024-06-28 07:57:18', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (7232351, 'Credit for 1 irrigation zone', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7232352, '530sqft at 7" below grade', NULL, '2024-06-30 19:24:21', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7232368, '23 linear feet at 1'' tall ', NULL, '2024-06-30 19:25:02', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7232377, '55 linear feet&nbsp;', NULL, '2024-06-30 19:23:28', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7232390, NULL, NULL, '2024-06-30 19:22:17', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7232399, NULL, NULL, '2024-06-30 19:21:25', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7233149, 'Sump Pump + 2x2 Catch Basin<br />
120 LF of 2" Schedule 40 pipe to connect pump and run out to street<br />
19 LF Strip Drain across the edge of the garage<br />
12 LF Conduit w/gfi breaker ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7234573, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7241463, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7242064, 'catalina grana victorian', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7244205, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7244231, 'additional sod and valve&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7244294, '6- 5 gals Total $261 Let me know if if this works. we can coordinate for the next yard check this Friday', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7245342, 'No walkway lights to be installed.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7245507, '1) Install Brickwork for neighbor side around fencing footings.&nbsp; &nbsp;(Needed due to having to cut neighbor concrete around old footings)<br />
2) Install Hose Reels<br />
3) Install Large Del Rio for back planters<br />
4) Build Raised Planter Bed. Redwood posts, Redwood rails, and Overlapped Cedar Siding<br />
5) Finish Fencing in upper section.&nbsp;<br />
6) Wrap front post and beams.(have to wrap beam to match post wrap thickness)', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7246130, '14  irregular pieces for 3 small pathways to be set approx 12" apart', NULL, '2024-07-05 07:44:51', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7248337, 'For back planter', NULL, '2024-07-05 10:53:33', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7248339, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (7252771, 'includes stump/root grinding and debris haul&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7252774, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7253922, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold'),
  (7257169, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Approved verbally</div></div>', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7262718, '4”
SDR 35 pipe includes tie in to downspouts ', NULL, '2024-07-15 17:05:17', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7262740, 'Chip out 67 LF. ON BOND BEAM @1.5 INCHES TO GET CORRECT ELEVATION TO MEET 1 INCH UNDER WEEP SCREED.', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7267687, 'Taking out fence 

Grading dirt flat', NULL, '2024-07-11 14:10:37', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7267694, 'Adding one valve for the grass ', NULL, '2024-07-11 14:10:06', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7268275, '(21) 5 GALLON SHRUBS (silver sheen pittosporum, golf ball pittosporum)<br />
(39) 1 GALLON PERENNIALS (licorice, salvia, lavender)', NULL, '2024-07-18 16:48:03', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7268466, NULL, NULL, '2024-07-16 09:43:16', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7268470, 'to level out bond beam', NULL, '2024-08-29 10:12:03', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7270846, NULL, NULL, '2024-07-16 18:02:31', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7271121, '4 black step lights. Approved via text', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (7271247, 'bbq spec''d above is with decking tile. ', NULL, '2024-07-19 06:35:05', 1, '2024-07-12 11:11:33', 'Daniel Aguilar', 'Daniel Aguilar', 'sold'),
  (7271269, 'credit for tile $300<br />
credit for sod $3000<br />
concrete design from original design $7000<br />
half irrigation credit (irrigation is preliminary ran, electrical ran for valves ran to timer)&nbsp; $1200<br />
demo of concrete at 3.75 sq ft $2,250', NULL, '2024-07-19 06:35:38', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7271330, '950 sq ft of concrete $8,218<br />
300 linear feet of turf strips $5,500<br />
300 sq ft of turf under lemon $4,700<br />
demo 7 inches below grade to prep for new concrete $3,325<br />
600 linear feet of forming for  segmented concrete and turf strips with stakes and 2x4''s $2800<br />
<br />
<br />
<br />
 ', NULL, '2024-07-19 07:10:42', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7275371, 'Removed moving water heater from Picture Build Scope.&nbsp; &nbsp;Credit from contract.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7275380, 'Panel work done by 360.&nbsp; Credit from Contract.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (7279373, NULL, NULL, '2024-07-18 11:19:25', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7280144, NULL, NULL, '2024-07-16 17:59:48', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7280149, NULL, NULL, '2024-07-16 18:01:07', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7284107, NULL, NULL, '2024-07-17 11:32:19', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7284163, 'With bender board edging to separate from sod 22 linear feet', NULL, '2024-07-17 11:33:03', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (7284449, NULL, NULL, '2024-07-17 11:37:44', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7284456, NULL, NULL, '2024-07-17 11:35:44', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7284713, NULL, NULL, '2024-07-17 11:02:55', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7286661, NULL, NULL, '2024-07-19 06:36:12', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (7290441, 'reduction of concrete based on jorge final measurement', NULL, '2024-07-19 06:36:26', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (7290552, 'Upcharge for the 1/2" Jeally Bean gravel', NULL, '2024-07-18 14:10:15', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (7291284, '8 linear feet + 1 light', NULL, '2024-08-08 12:23:46', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7291298, 'FIRST PART OF COURTYARD', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7309899, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7309905, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (7312827, NULL, NULL, NULL, NULL, NULL, NULL, 'Mo Solomon', 'sold');

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
