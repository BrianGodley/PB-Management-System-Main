-- ============================================================
-- v2 CO Enrichment — Batch 3 of 5
-- 1,337 CO updates (rows 2675-4011 of 6,685)
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
  (4021480, '28 more pavers at $18 sf', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4021483, '8 foot sleeve. X $15.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4021487, 'Catch basins  drain needs to go into left and right planter with jetting under 3 foot walkways then attaching a pop top exit into the planters<br>  2 count 8 feet. + jet <br>$200.00 x 2= $400.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4022759, NULL, NULL, '2021-07-05 16:40:39', NULL, NULL, NULL, 'Melinda Babaian', 'pending'),
  (4024869, '125 sf mulch with fabric. X $1.75', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4024931, NULL, NULL, '2021-07-06 10:48:15', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4024974, NULL, NULL, '2021-07-06 10:50:27', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4024981, 'have to sleeve under the driveway for side planter', NULL, '2021-07-06 10:50:07', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4024984, NULL, NULL, '2021-07-06 10:50:43', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (4024987, 'Includes demo, no sand to set pavers, just digging in and setting.<br>
Side by side steppers', NULL, '2021-07-06 10:50:57', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (4027063, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4030698, 'Demoed and added 2 extra inches of base material in roughly 700 square feet.   $1,800<br>
<br>
Back fill lower planter wall (not in backyard change order) $400<br>
<br>
Raise height of planter wall by 2 courses vs plan.  $1,100<br>
<br>
Still need to have change order for extra grade removal at bottom beyond 7 inches.  Will figure this out once we grade and compact for new step location. ', NULL, '2021-07-07 17:14:50', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4030790, 'Did out rain garden 3.5 feet down.  Haul out extra soils to dump.<br>
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
 ', NULL, '2021-07-07 17:16:18', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4032279, 'Please see attached planting list.  Plants priced out per standard table included in contract.,  <br>
<br>
 ', NULL, '2021-07-08 09:04:19', 1, '2021-07-08 08:32:34', 'Brian Godley', 'Brian Godley', 'sold'),
  (4033063, 'Measurement off from plan - additional 70 SF needed', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4033093, '44 LF of brown plastic bender board 6" x 1" ', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4033116, 'Credit for valley rtf sod 135 sf', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4033275, 'For jacuzzi run 90 LF of 1" conduit
(6) 6 guage wires
18" below grade', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (4033279, 'Client will pull permit', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4033320, 'We are NOT going to do DG under jaccuzzi', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4033326, '50 LF of Belgard Catalina Grana in Victorian', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4033471, '1 brass valve for planters with Netafim $800
1 brass valve for grass spray zone $895
Install of smart timer $50
Complementary new hose bib ($200)', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4037391, NULL, NULL, '2021-07-09 14:54:53', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4040907, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4040960, NULL, NULL, '2021-07-12 10:29:11', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4040987, '86 LF of 3" sdr pipe
3 drain grates
Remove, grade and relay existing brick paver across driveway to make way for  connecting drains ', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4040991, 'Not doing as big an area for paver', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4041146, 'Main line from where existing hose bib is to nearest CMU wall where roses will be

Use existing hose bib', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4041665, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4042121, 'Credit for providing the controller. Picture Build still installing and wiring. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4042184, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4042799, 'Original Plant budget was $1700<br>
<br>
Adding 5 1 gallon blue fescue. <br>
<br>
Total plant orderis now $1441<br>
<br>
Credit due of $259', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4046542, NULL, NULL, '2021-07-13 13:54:33', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4046605, 'Includes demo', NULL, '2021-07-13 14:14:39', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4046630, '19LF x 8”x8”
Also will need to core drill curb to extend rebar ', NULL, '2021-07-13 14:10:46', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4046651, NULL, NULL, '2021-07-13 14:11:02', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4046698, NULL, NULL, '2021-07-19 12:06:08', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4047448, 'This is for digging trenches for another electrician outside of Picture build to install. Picture Build is not liable for permitting nor electrical work.

Separate document with liability clause to be sent via email and signed by both parties.', NULL, '2021-07-14 10:36:05', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4051384, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4053230, NULL, NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4053785, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4054046, 'Repair paver borders that sunk in due to next door construction. <br>
Remove borders that were set in concrete. <br>
If needed remove more of the pavers.<br>
Bring in new pavers.<br>
level and compact the effected area one more time.<br>
Wet set the borders again in concrete.<br>
Set the pavers back in.<br>
Add sand as needed. ', NULL, '2021-07-15 16:21:55', NULL, NULL, NULL, 'Melinda Babaian', 'pending'),
  (4054087, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4059143, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4059202, NULL, NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4060017, '1) Move soils from rear yard and haul, that was not in contract.   Regrade and compact section by new steps near firepit.  $4000<br>
2) Cantilever steps per client request.  $20 per linear foot.  123 linear feet of steps. $2460<br>
3) Demo and add walls for new side steps and rear step 17 liner feet in total.    Saw cut and demo walls. $2,960<br>
<br>
Veneer add to be in separate change order. <br>
 ', NULL, '2021-08-13 10:40:24', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4062238, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4063154, 'Price differeence for using new pavers', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4063161, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4063205, '(2) new valves
(2) new pressure regulators
(1) 12” ground box', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (4063709, '140sqft around sod', NULL, '2021-07-19 17:27:52', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4063711, NULL, NULL, '2021-07-19 17:28:16', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4063716, NULL, NULL, '2021-07-19 17:38:35', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4066003, NULL, NULL, '2021-08-14 16:40:18', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4066408, '30sqft plus demo', NULL, '2021-07-22 21:57:27', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4067346, '(1) 300 watt transformer
(2) 5.5 watt LED well light bulbs
Labor to install the above included
', NULL, '2021-07-20 14:25:37', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4067590, NULL, NULL, '2021-07-21 16:23:23', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4067959, 'Stucco for wall extensions (recent change orders)', NULL, '2021-07-20 18:41:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4070907, '3 additional path lights', NULL, '2021-07-22 16:00:36', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4071466, 'Due to the shape of the center island grass area. There will always be some form of overspray to account for the wind that is frequent in the Santa Clarita Valley. <br><br>????Without overspray, there would be sufficient coverage for the sprinklers and grass would end up dying. We are limited in the type of nozzles available and have the smallest ones chosen to have minimal overspray. <br><br>????<br><br>??<br>?????', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'pending'),
  (4074116, 'Not using rock. Using mulch which will be added in mulch change order&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4074158, NULL, NULL, '2021-07-23 07:54:05', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4075403, 'Original Mulch in the contract 445 SF<br>
Back count 400 SF<br>
Front Count with parkway 408<br>
Total to install:<br>
808 SF - 445 in contract<br>
$635.00', NULL, '2021-07-23 07:53:49', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4075776, '-remove flagstone/gravel 7" below final grade<br>
-Install roughly 370 sqft of pavers (will use some of the pavers that are left over from pathway)', NULL, '2021-07-22 21:57:13', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4075781, NULL, NULL, '2021-07-22 21:56:59', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4075782, NULL, NULL, '2021-07-22 21:56:35', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4075789, NULL, NULL, '2021-08-03 14:23:36', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4077077, NULL, NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4077478, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">supposed to be $50</div></div>', NULL, '2021-07-23 11:24:05', 1, '2021-07-23 10:02:39', 'Melinda Babaian', 'Melinda Babaian', 'sold'),
  (4077933, '(3) up lights -  CL531B-GM-LED11 2.5 
(1) path light - CL735B- GM-18-LED16-3W-WF

Includes wiring, assembly, light fixture, LED bulbs, placement and all other labor associated with lighting.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Please make sure to go and flag with the client where these lights will go.  They know and have an idea of where each light is needed… do not install without them APPROVING.</div></div>', NULL, '2021-07-23 14:36:39', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4077943, 'No charge as a gift complementary of Nicole.
Additional cost specified in contract was $200 to upgrade to a smart timer. <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">I need a text, or reminder that the client has opted for smart timer before we purchase and move forward. I think this happened rather quickly and I don’t remember officially letting them know it was more cost to do the timer anywhere in my communications.  Then it was installed, Rachio before I even caught it. Thank you!  I will try to be more clear here in the future.</div></div>', NULL, '2021-07-23 14:37:03', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4081746, 'Found 3 stumps in grass area for stump grinder', NULL, '2021-07-26 14:41:08', 2, '2021-07-26 11:15:43', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (4082708, 'We are not doing the drainage as stated in the signed contract. Client Dara has signed a liability waiver (in Permits folder).<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Mohammed or anyone - Let me know if we need another liability waiver saying client is responsible for permits?</div></div>', NULL, '2021-07-26 14:40:42', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4082765, NULL, NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4082929, 'Import additional 7 yards of 50/50 soil.  

In contract we had Import 3 yards of 50/50.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4083515, '- Even out mulch in the front
- Add bender board in parkway
- Remove bathroom 
- Replace the broken hose
- Fix drainage
- Replace 3 lights', NULL, '2021-07-27 09:34:41', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4084756, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4087428, 'Main line shut off valve. There was not one before which means you have to call the city to shut off your water. This is highly recommended. Thank you!', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4087458, 'This has to be done in 2 phases.<br>
First day one coat and have to go back the next day for the second coat. ', NULL, '2021-07-27 17:46:12', NULL, NULL, NULL, 'Melinda Babaian', 'lost'),
  (4087506, NULL, NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4087600, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4089533, 'Steps have been requested by client to be encased, timber allotment did not consider encasement going all the way up to DG/jaccuzzi pad. See most recent photos. We have used 50 timbers so far, we need 20 more. In total that equates to 70 LF x 8 ft = 560 LF.', NULL, '2021-07-28 13:21:26', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4091344, 'If we are under then we will credit you.  Permits are in process of being pulled, we do not know costs of this yet.  This is an allotment.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4091520, '8 flagstones set in grass to connect front entrance to side gate (through grass area, meeting up with DG area).
<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Please make them the same as the ones you have already put in DG area. I WANTED the first and last flagstones to be bigger than the others, but its already done. It’s fine, i don’t want to redo the DG.</div></div>', NULL, '2021-07-30 17:42:08', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4091526, 'We did not install main line ball valve shut off with cover. Not needed.
', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4093150, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4093160, '2 new drip zones with all new brass valves. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4094596, 'Adding 1'' square stepping stones to patio for a total of 24 SF and 24 pavers, we need 3 more 1’ x 1’ to complete the look/project .  We did not use road base on these stepping stones.  We did need to cut the grass around the stones and we did have to align them to make a path and make them equal distance.', NULL, '2021-07-30 15:53:50', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4095603, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Please see attached final planting plan</div></div>', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4095730, 'Install two new retaining walls.  14'' x 3'' plus footing   10 ''x 4'' plus footing<br>
<br>
Includes demo,  reinforcement, grout cells, water proofing for one wall and stucco coating.', NULL, '2021-07-30 09:28:53', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4097927, 'Adding 5 6” x 6” x 8’ ACQ Green timbers to retaining wall - $350 
Labor - $500 - 1/2 day ', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4098720, 'Labor for lifting brick and replacing.  Melinda discussed with Emelley.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4098722, '20 pieces of Rustic Wall in Grey/Charcoal to complete and finish the wall. NO CHARGE as this was estimated at 21 LF in contract, as an offset for needing more timbers, I have given this at no charge to Emelley. ', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4100933, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4101521, 'Change type ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4101989, '(4) 6 x 6 x 8 timbers to retain wall of steps leading up to jacuzzi patio.
Includes labor. I have given best price on final order of timbers. This should complete all the ACQ timbers needed for this project.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Danny talked with Fidel and they can complete the look with just 4 timbers.</div></div>', NULL, '2021-08-03 13:14:02', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4102060, NULL, NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4110328, 'Stucco existing wall to match. Approx 28 SF (13 SF of stucco was included in other change order)', NULL, '2021-08-04 14:18:35', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4110340, '6 LF of 8” x 8” x 16” CMU block wall on top of fresh newly built wall
- cut block to ensure that caps match height of top step
6 LF of Rectangular CMU wall cap', NULL, '2021-08-04 14:18:57', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4110820, 'total additional needed 57 Linear FeetX $22.00= $1,254.00', NULL, '2021-08-04 19:30:56', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4110842, 'French Drain, 3" perforated pipe in sleeve, set in 12" gravel behind waterproof wall<br>
60 Linear feet X $35.00= $2,100.00<br>
70 Linear feet X $23.00= $1,610.00<br>
Total $3,710.00', NULL, '2021-08-04 19:31:44', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4110890, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">36" X 36" based on estimator $238.00</div></div>', NULL, '2021-08-05 08:01:29', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4111126, 'Cost difference for 2 24” Pablo verde tree boxes- $130, Nicole is splitting it with client, 50/50.', NULL, '2021-08-04 16:50:49', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4111517, 'Add high grade weed barrier 450 SF includes installation ', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4111551, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4112255, '1) Do a job clean up and haul all waste.  <br>
2) Demo down 16 inches for A/C pad per client instructions to have it low as possible. Haul extra soils. <br>
3) Install sleeves and drain line under the pad.  <br>
4) Form for A/C with bi level per instructions from A/C contractor. <br>
5) Install A/C rebar pour and finish A/C pad <br>
6) Dig trench for electrical contractor to run new electrical. Roughly 110 linear feet.  Backfill and recompact later with future work <br>
 ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4113368, 'Johnny had installed prior to start.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4113375, 'We received a 5g to plant, not a 15g.  This is a labor credit as the client purchased plants himself. ', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4116495, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4116525, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4117016, NULL, NULL, '2021-08-10 12:50:21', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4119610, 'Approved via text ', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4120113, 'See Change Order Estimate in documents folder, signed by both parties. ', NULL, '2021-08-11 12:57:13', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4120135, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4120296, NULL, NULL, '2021-08-09 09:24:26', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4120841, 'Removed from scope:

 Concrete Bench
1. Install footings and wooden forms for concrete pour. SEE PLANS.
2. Little bench is to be poured in place concrete at approx:
a. 1’ 10” arms
b. 7’ 2” length.
c. 18” maximum in height, anything over this will be a change order.
3. Carpenter to install wooden planks for sitting.
4. Sand finish on poured concrete approx. 28 SF
COST: $966', NULL, '2021-08-09 20:39:02', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4122116, NULL, NULL, '2021-08-09 15:38:20', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4122472, 'Adding approx 14.4 LF of cantilever step at back kitchen step (was a normal step before, see addendum). Sand finish. ', NULL, '2021-08-09 20:37:09', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4123738, NULL, NULL, '2021-08-17 09:10:12', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4123743, NULL, NULL, '2021-08-17 09:09:44', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4123746, '250-300 linear feet', NULL, '2021-08-17 09:09:23', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4123747, 'Updated 9/9', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (4123918, '90 day plant warranty is not over 
Yard checks to be completed 
DG be compacted ', NULL, '2021-08-10 12:50:44', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4124179, 'Remove concrete swale and haul to dump.', NULL, '2021-08-10 11:59:21', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4124363, '1- At bottom for smoker moved out to make wider additional concrete 18"x25''  $350<br>
2- We now have a total of 40 steps and a total of 145 LF of steps (there will be more added). We had 96 ln feet in change order.  $2695<br>
3- 1 man day to demo part of pool on rain garden area and haul.  $625<br>
4- Remove and haul soil from AC area (not ib previous change order/contract). Area 2 Man Days. Two extra loads of hauling. $2800<br>
5- Demo for drainage installation at bottom walkway to Park area - 2 man days plus material  $1200<br>
6- demo rain garden wall 1/2 man day and haul.  $450<br>
7- Poured in Place wall cap 71 ln feet  $4615<br>
<br>
 ', NULL, '2021-08-13 10:41:06', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4124703, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4125542, NULL, NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4125547, NULL, NULL, '2021-08-12 20:04:52', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4125557, NULL, NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4125572, NULL, NULL, '2021-08-12 15:52:05', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4125575, NULL, NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4125589, NULL, NULL, '2021-08-19 13:13:16', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4125591, NULL, NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'pending'),
  (4125595, NULL, NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4127988, 'Adding shut off valve for backyard irrigation valves.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4130076, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Rodriguez', 'sold'),
  (4130085, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Rodriguez', 'sold'),
  (4130109, 'New timer and wiring.<br><br>Verbally approved by Charles. ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (4130365, 'See lighting choices and notes:

3 up - 2201 in black (5W LED, beam spread 30) for tree in front
9 up - 5003 in black (beam spread 60) hedge, driveway  grasses and back/side wall splashes
5 up - 5003 in black (beam spread 36) for up into trees
*3 step - 4246 in black ($325)
15 path - 6507 in black
46 LF of LED strip lighting for under cantilever steps

2 - 300 watt transformers', NULL, '2021-08-16 10:43:21', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4131922, NULL, NULL, '2021-08-17 07:53:03', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4131964, NULL, NULL, '2021-08-17 07:52:49', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4131977, NULL, NULL, '2021-08-17 07:52:28', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4132308, 'Blocks on wall need repairing and restablizing before we can tie new wall into it', NULL, '2021-08-17 09:08:39', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4134427, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4136869, 'Adding border 81 LF of Cat. Grana in Victorian 6” x 9”
Wet lay border stone.
Includes labor and additional sand materials, etc.', NULL, '2021-08-13 14:16:25', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4137233, 'A normal concrete pad has 4" anything over the 4" requires a change, this concrete pad is about 16" please see image ', NULL, '2021-08-13 17:22:39', 1, '2021-08-13 16:01:06', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (4137476, NULL, NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4137677, '16 flats', NULL, '2021-08-15 09:54:24', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4140188, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4141487, 'In contract I have 100 LF and we need an additional 32 LF. @$12.50/LF as in contract.', NULL, '2021-09-29 16:37:42', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4142160, '(10) 5 gallon roses<br>
(1) 15 gallon Eugenia<br>
transplanting', NULL, '2021-08-16 20:56:16', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (4143610, '<br>
1- Remove about 30 yards of cut and haul soils from back for new grading levels per layout.  $6,900<br>
2- Run low voltage wire (as of now we have 250 LF. installed)  $500<br>
3- Add about 25 LF. of drainage to down spout in front porch. Demo section of front path and reinstall. (best effort to save existing) $950<br>
4- In front yard landscape timber wall - first 16LF. 3 courses including gravel beds and fabric coverage $1,600<br>
5- In front yard add additional 19LF. about 5 courses pending on elevations (first course will be buried)  $2,800<br>
6- Build about 4 LF. return wall along garage 4ft tall connected to existing retaining wall.  Standard detail footing.  $1,000<br>
7- Backyard install 85 ln feet of 24 inch timber wall to take out grades per last requirement and wrap around tree. $13,655<br>
<br>
<br>
 ', NULL, '2021-08-17 08:54:16', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4145990, '4 focus nitilda for right corner. ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'pending'),
  (4146561, 'Raising the back wall up to 1 course in the center of the water feature arch, and taper down to the 40" back pilaster $5.25 X 12= $63.00<br>
Raise the scupper to be over the mermaid<br>
Additional Tile on the facade water side average of 1/2 of a AF, $10.75 X 12= $129.00<br>
Additional water proofing on the back side 1/2 SF X $5.25= $63.00<br>
$255.00 Total to raise the back of the arch to 42" + 7"= 50" plus the 3" cap, 53 inches high in the middle.<br>
<br>
 ', NULL, '2021-08-18 19:18:39', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4148931, '677 additional sf of rtf grass. X $3.50= $2,369.50', NULL, '2021-08-18 12:04:50', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4149147, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4149930, NULL, NULL, '2021-08-18 16:39:33', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4149967, NULL, NULL, '2021-08-18 15:20:07', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4149979, NULL, NULL, '2021-08-18 15:19:39', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4152203, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (4154100, 'Need 2 more rectangular pavers Stepstone to match what we have.
Add black pebble in-between same as what we have. (Few bags)
Add little piece of bender board to complete pathway. 
Includes labor and material.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Thank you for being so patient!  We did the design and now adding more it’s looking amazing, I will try to come in person to check it out at the final job walk.  Again, thank you so much, I hope you are enjoying your summer!</div></div>', NULL, '2021-08-26 12:22:34', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4159536, 'Remove (4) tree stumps<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (4159974, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4160071, NULL, NULL, '2021-08-24 14:53:24', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4160140, 'Demo concrete slab nearest concrete steps (18 SF)

Remove brick at back shed area and spread out small pebbles (13 LF)

Re-install brick border at back shed with half brick showing (acting as a bender board for pebbles)



', NULL, '2021-08-23 12:09:45', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4160178, 'Wet lay (2) 2''6" LF brick steps on top of concrete
Remove turf and add soil underneath, compact
Re-install turf after brick steps are complete and seam up ', NULL, '2021-08-23 12:09:00', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4160254, '(2) steps at side door 13 LF with border and herringbone infill 

', NULL, '2021-08-23 12:10:08', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4161771, 'Credit as per design agreement.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">See design job for signed design agreement</div></div>', NULL, '2021-08-23 15:17:56', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4161801, 'Credit for design agreement dated 02/22/2021', NULL, '2021-08-23 15:28:38', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4162156, 'Additional 217 SF of creeping red fescue for expanded grass area', NULL, '2021-08-23 20:04:20', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4162192, 'Based on 1,170 Sf of Concrete pour, Sand fnish $.75, (75 cents) per SF<br>
$877.50', NULL, '2021-08-23 18:54:24', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4165697, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4165967, '(1) stump was included in the original contract <br>
 ', NULL, '2021-08-26 11:05:28', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4166099, 'Credit for (2) plants that we cannot find Cotelydon orbiculata (Pig’s Ear).  

Beds are full of plants and all looks good.', NULL, '2021-08-24 15:53:02', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4166209, '57''L x 24"H Curb would be $3817 - $217 Discount = $3600 ', NULL, NULL, NULL, NULL, NULL, 'Victor Rodriguez', 'sold'),
  (4166579, 'We did not use (1) brass valve that was on contract, we did use the piping for it, but not the actual brass valve material.  This is a credit for that.  <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">See latest log</div></div>', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4166635, 'See daily log:<br>
8 5 gallon plants @ $43.50=  $348.00<br>
3 15 gallon podocarpus  @ $150.00= $450.00<br>
Total Credit:  $798.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4166638, 'Installing geotextile fabric 140 SF and 6" of basic gravel @ $4.65 SF= $651.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'pending'),
  (4170702, NULL, NULL, '2021-08-26 11:05:06', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4170878, 'Demo gutter (street side)
Form up
Pour concrete 3000 psi city mix for up to 17 LF.
Install asphalt infill at street', NULL, '2021-09-02 09:36:42', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4173150, '1) Remove 16 foot tall Jacaranda.<br>
2) Remove stump from hillside that is in the way of the wall location<br>
3) Remove additional concrete from side gate to driveway<br>
4) Install new walkway with the rest of the pour from side gate to driveway. ', NULL, '2021-08-26 17:44:35', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4173160, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Client is on maintenance, not sure how often.</div></div>', NULL, '2021-08-26 11:51:37', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4173300, '33 LF of black bender board ($360)
12 (2 x 2) Stepstone pavers ($880)
Del Rio inbetween pads (we have enough on site from beds, some areas of beds are very full with gravel and we can use some inbetween the steppers - approx 2” between each stepper, not that much gravel)<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">2 x 2s are in Picture Build yard.</div></div>', NULL, '2021-08-26 12:22:17', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (4173329, 'Brian has gifted Amy 2 LF of apron at approx $250/LF for a total of $500.', NULL, '2021-09-17 07:16:09', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4174172, NULL, NULL, '2021-08-30 08:32:06', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4174625, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4177847, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4180540, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4181127, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Rodriguez', 'pending'),
  (4182580, '40 additional sf of colored. Concrete. $11.00 + .75=&nbsp; $11.75 a sf. = $470.00', NULL, '2021-08-30 21:38:49', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4188355, 'We went from 88 LF to approx 82 LF of cantilever steps at front entrance.  ', NULL, '2021-09-17 07:16:38', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4188368, 'Adding 2” to the thickness of concrete planter wall (continuous 2nd step out of garage)
Poured in place approx. 21 LF at 14” thickness', NULL, '2021-09-02 09:57:49', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4189067, 'Adding 1.5’ (or 18”) on each side of garage steps. Landing pad should go to end of garage wall.

Landing pad - 3’2” x 7’ 2 1/2” (1st step) with 14” step treads
(3rd step ) 7’ 2 1/2” with 14” step treads', NULL, '2021-09-02 09:58:06', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4189130, '20.7 LF of 4” grey concrete poured in place wall up against front of house. 
Cover and close up the fireplace clean out.
Smooth stucco from top to below soil level.
<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Carlos said he will pour this right up against house with no gaps.</div></div>', NULL, '2021-09-02 09:59:06', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4189256, 'One punch-out GFI outlet includes labor.', NULL, '2021-09-01 12:40:45', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4189856, 'We are now doing a straight concrete pour in your driveway with scoring instead of sectioned pads with DG in-between.

Under contract addendum see page 1….
Concrete Sectioned Pads - Entrance of driveway up to gate
DG - $375
Wooden Forms - $400<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">I will still need TOTAL SF of concrete flatwork #’s to make sure we hit our mark.  The credits above are for forming and DG, not for SF of concrete. Thanks!</div></div>', NULL, '2021-09-07 12:25:20', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4190421, 'No base in our concrete pours (including under any stepping pads).  ', NULL, '2021-09-07 12:25:50', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4195807, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4197157, 'Permit for apron - $437
Admin hours - 1 hour @ $100 per hour

Total Allotment in Contract: $1,000 - $547= $453<!-- begin_ammend -->I meant $110 an hour as in contract! Typo there.<!-- end_ammend -->', NULL, '2021-09-03 13:53:03', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4197173, '<strong><u>Demo/Grading</u></strong><br>
 <br>
1.Remove existing concrete driveway at 7” below final grade up to gate and not beyond.<br>
2. Remove existing pathway at 7” below final grade.<br>
3. Be careful of grass.<br>
4. Haul all materials to appropriate sites.<br>
*Soil maybe imported if grade needs to rise, but we should have enough after taking out 7” of soil in driveway to build it up on the exit. If soil is needed, we will have to do a change order.<br>
**Wall demo TBD (as soon as we get on site) This cost does not include wall.<br>
<br>
COST: $3,532', NULL, '2021-09-03 14:17:47', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4197604, NULL, NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4197633, 'Paving Stone<br>
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
COST: $16,525', NULL, '2021-09-04 12:31:36', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4205771, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Rodriguez', 'sold'),
  (4205791, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4205833, 'Picture build will take over the installation of the pool coping which is $6,200. <br>
<br>
Water works will remove this from their contract at the exact same price.  So the pool contract will be $6,200 less. <br>
<br>
We will be doing Bellecrete precast with grouted joints. ', NULL, '2021-09-08 13:01:47', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4209010, NULL, NULL, '2021-09-14 09:42:33', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4209075, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4210010, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4210224, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4210356, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4210820, 'Parking permit for 2 cars 
10 days ', NULL, '2021-09-10 13:48:24', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4211331, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4212425, '1) Add Masonry curb to hide footing on south side of property -  Need to chip and form and pour in place. <br>
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
 ', NULL, '2021-09-14 09:57:19', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4214144, 'As per Melinda, we used up 2 truckloads of hauling for front yard grading.  Lots of roots and stumps, etc.  

Only included in Lawn area was fine grading, so this is additional. I checked grade today and looks amazing. We needed to take it out and lower area nearest tree. ', NULL, '2021-10-07 13:05:54', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4214160, 'Not using a tumbled paver $1/SF credit for 1,466 SF', NULL, '2021-09-10 14:16:19', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4214215, 'Polymeric sand for in-between pavers in driveway and pathway.', NULL, '2021-09-10 14:16:52', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4214808, 'Not doing smart timer, using their existing rainbird with 12 zones', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4214836, '240 SF of Marathon 1
Includes demo
Irrigation is already covered.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4218942, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4219139, 'Removing existing concrete walkway<br>
Adding (10) 2x2 concrete steppers ', NULL, '2021-09-14 09:42:56', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4219143, NULL, NULL, '2021-09-14 09:43:07', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4219200, '2 cars @ 10 days @ $3/day + $3.50 convenience fee = $63.50', NULL, '2021-09-13 16:51:58', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4221127, '100 SF of stucco
Building out wall to approx 8 1/2" nearest gate
Includes color', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4222384, '$14.00 A sf 14 additional sf  = $196.00. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4222655, 'Add 20 LF of new black tubing for existing and future plants nearest A/C unit. 

Make sure water is irrigating to that area.

Might add plants at a later date.', NULL, '2021-09-14 13:38:24', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4222676, 'We did the wiring but did not add a new switch. ', NULL, '2021-09-14 13:49:01', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4222755, 'Entire property needs new drainage approx 200LF of 3" SDR pipe.
Includes trenching, 6 grates, and all labor.

Tie in all gutters into new drainage.
Drainage will go out to curb.
One inlet in grass zone.

Victor reviewed with client that old drainage was clogged and damaged. ', NULL, '2021-09-14 14:29:00', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4222854, NULL, NULL, '2021-09-14 17:30:44', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4223134, 'Stucco the entire wall and top of wall along driveway and patch the end of wall where it is currently not finished. Approx. 100 SF of wall to be stucco. 

COLOR tbd by client. ', NULL, '2021-09-17 07:17:00', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (4227159, 'Del Rio', NULL, '2021-09-15 16:30:39', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4227163, NULL, NULL, '2021-09-15 16:31:00', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4227351, '(2) 5 gallon staked pale pink roses <br>
(1) 5 gallon Buddleja (purple)<br>
(1) 5 gallon Salvia Apiana', NULL, '2021-09-15 16:30:19', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4227688, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Rodriguez', 'sold'),
  (4229068, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">what tree? where? this change order is wayyyy to vague to be enforceable.</div></div>', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4230110, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4230135, NULL, NULL, '2021-09-16 22:48:16', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4231279, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Rodriguez', 'sold'),
  (4232940, '(22) path and spread lights for front and behind studio<br>
(1) uplight front tree<br>
(1) uplight lemon tree in back<br>
(4) uplights for along front fence<br>
(2) down lights for front tree', NULL, '2021-09-17 09:20:53', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4234817, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4237684, 'As per our discussion during the job walk
Remove shrubs around light pole
Remove shrubs to the left of mailbox ', NULL, '2021-09-20 11:31:41', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4237749, NULL, NULL, '2021-09-20 11:31:26', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4237772, '22 linear feet', NULL, '2021-09-20 11:31:06', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4238057, 'Removal of Birch tree (does not include removing ALL the roots)
Includes stump grinding', NULL, '2021-09-20 12:39:44', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4238220, '96 LF of Marathon sod added to front lawn grass area (Nearest neighbor)', NULL, '2021-09-20 12:39:35', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4238238, 'Adding 23 SF of paver near birch tree (removal). 

Cost value: $239
Gift to Nate and Kate per Nicole', NULL, '2021-09-20 12:39:08', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4238609, '11’ x 8” of concrete pour in gap in driveways.
6’ x 6” of spec mix applied to existing CMU non-retaining wall.
Includes labor.', NULL, '2021-09-20 20:05:47', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4238888, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Rodriguez', 'sold'),
  (4238961, '5 man hours x $75.00= $375.00<br>$140.00. Materials. <br>total. $515.00<br> ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4238972, '26 linear feet of line. 1 GFI  outlet', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4238982, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4240870, 'Credit for install, Craig Kengla will be installing the pergola', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4241145, NULL, NULL, '2021-09-21 10:30:33', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4245617, '10 linear feet&nbsp;', NULL, '2021-09-22 10:44:34', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4245623, '20sqft&nbsp;', NULL, '2021-09-22 10:44:55', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4245708, 'Pick up tile and delivery at cost.', NULL, '2021-09-22 11:26:58', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4245749, 'We are filling in 7’ x 7” wide of step.

This is so the step will be a full tile and not cut. The esthetic will be more pleasing.', NULL, '2021-09-22 11:26:14', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4250507, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4251580, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Rodriguez', 'sold'),
  (4252664, 'Please see attached list:<br>
Red are plants that we didn''t install<br>
Black are plants that we did install<br>
Green are plants that we are adding<br>
<br>
Total credit:  -$454.50', NULL, NULL, 1, '2021-09-30 15:26:56', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (4255257, 'Adding (1) Mandeville (white) vine to planting plan to climb up post and onto trellis that is above the new tile area. Place in corner. ', NULL, '2021-09-29 09:14:51', 1, '2021-09-27 11:13:20', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (4255722, 'Stucco repair to side of home nearest planter/gate. $300
Tile installation to bottom of front patio step (5-6 pieces, client purchased direct) $50', NULL, '2021-09-24 20:14:09', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4256025, NULL, NULL, NULL, NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4259070, 'Adding approx 5.5 yards of import 50/50 soil to grass area.  
I had 3.5 yards in contract for $300 and production informed me we will need 9yards total to cover at 3” depth.  This will allow the seed area to have best potential for growth. ', NULL, '2021-09-28 18:30:45', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4259524, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Rodriguez', 'sold'),
  (4260434, 'Victor and I had to make a concession in the additional Sf&nbsp; that was mismeasured.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4260613, 'Gas line taken from the stub up on the house 26 Linear feet to the fire pit.&nbsp; &nbsp;Permit separate change', NULL, '2021-09-28 08:55:09', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4260614, '35 additional square feet of pavers, X $13.25&nbsp; backyard paver price', NULL, '2021-09-28 08:54:47', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4260626, 'Total linear Feet of electrical line 150 LF<br>
2 outlets already included<br>
40 Lineaer Feet included in the contract<br>
Additional 110 of electrcial line needed.  Use of the outdoor electrical boxes have not had enough wattage to support the power equipment of the paver crew on site.  This is a clue that the outlets do not have enough wattage to support 2 new outlets.  The electrical will now have to come from the box. <br>
We are reducing the per linear foot cost because it is over 100 Linear feet to $19.00 a Linear foot<br>
110 Linear Feet X  $18.00= $1,980.00', NULL, '2021-09-28 10:06:46', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4261865, 'Electrical permit $98.10<br>
Gas/plumbing $64.95<br>
Total: $163.05', NULL, '2021-09-28 10:06:28', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4263621, 'Need to remove a 5x5 area of pavers add about 5 LF. Of drainage with black drain grate
Backfill and compact install pavers add sand and compact pavers.', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'pending'),
  (4263821, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4263970, '<br>
(6) 5 gallon Hydrangea macrophylla <br>
(18) 1 gallons of Lamb''s ear, Santolina, Sedum<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4264155, NULL, NULL, NULL, 1, '2021-09-28 14:18:38', 'Melinda Babaian', 'Melinda Babaian', 'sold'),
  (4264665, 'This is apart of the total stucco price. Nicole made a mistake in calculation of how much would it actually be from photos alone.  The work is more.', NULL, '2021-09-28 19:26:45', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4264795, 'We are NOT ordering (2) French Grey stepstone steppers 18 x 36”.

Laura has purchased her own 2x2’s.', NULL, '2021-09-28 18:30:08', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4266477, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4268604, 'Thank you for giving us the chance to work on your project.', NULL, '2021-09-29 19:14:55', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4268988, '<p>Irrigation<br>
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
', NULL, '2021-10-12 13:17:38', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4269009, 'In contract we have 2,707 SF and the measurements are 2,780 SF for St. Augustine sod.

This is because you minimized the cantilever steps which added 64 SF of grass. 
The additional 9 SF are from plans not being exact, which is typical in our industry.
', NULL, '2021-10-04 11:33:39', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4269786, ' 238 courtyard, and 170 entry  

2.  408 total

on page 3 the total was 238 X $14.00= $3,332.00

I mistakenly didn''t add in the 170 pavers for the entry.

The correct total is $5,712.00  

The difference that we need to add is $2.380.00.


', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4271781, 'Removal of 10  extra yards of soil ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4272460, NULL, NULL, '2021-10-04 13:03:16', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4272799, '$200 for the material upgrade<br>
$140 for additional gravel (hugging the steppers on both sides of pathway)', NULL, '2021-10-05 13:18:09', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4272802, '40 linear feet of edging', NULL, '2021-10-05 13:17:56', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4274064, 'We could not re-use the old bender-board, as it was not in great shape.

200 LF of brown 6” x 1” plastic bender-board.', NULL, '2021-10-04 09:12:23', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4274324, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4274335, '450sqft includes demo (removal of gravel, soils)', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4275934, '(2) 15g Pittosporum silver sheen', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (4275965, 'Permit fees <br>
See attached', NULL, NULL, 1, '2021-10-01 16:03:33', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (4278500, 'Decided no bender board at all on this project.', NULL, '2021-10-15 15:12:47', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4279834, '1g instead of 5g credit', NULL, '2021-10-27 15:14:14', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4280219, '(3) Large Podocarpus <br>
(1) Acacia Tree', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (4280381, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4280382, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4280517, '1- 42 LF bend a board to separate DG from planters on side yard (pool equipment area)<br>
2- 35 LF of sewer line for outdoor kitchen sink <br>
3- Form for step up on walk way at gate 3.5 LF.<br>
4- 185 sq. Feet of DG on side yard (pool equipment area). Stablized with base.<br>
5- Add grading to raise area for putting green and sewer access. 385 sq feet x 3 inches.<br>
<br>
Added putting green in separate change order.', NULL, '2021-10-04 19:30:36', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4280964, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Rodriguez', 'sold'),
  (4282139, '240 Square Feet X $14.00 pavers + .65 cents for Belgard Catalina Grana = $14.65 = $3,516.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4282155, 'This includes 120 Linear feet of drainage 3" and up to 6 drain caps and 1 pop up exit  120 lf X $23.00', NULL, '2021-10-05 10:46:19', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4282569, '28 x $13.25= $371.00', NULL, '2021-10-05 13:18:27', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4283314, '65lf x $25.00= $1,625.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4284554, 'Stucco Exterior Walls<br>
<br>
Left side property wall (when facing house) <br>
Very Rear property wall <br>
<br>
Sand Finish Stucco - Paint Ready or Color coat', NULL, '2021-10-11 09:07:26', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4284590, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4284612, 'Adding 28 linear feet. One outlet additional. For all lines to outdoor kitchen and fountain. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4284620, 'From meter to outdoor kitchen to firepit. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4284648, 'To outdoor kitchen and spigot next to it. 24 lf.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4284913, 'Demo 8 ld of cap. Install 8 lf of new slump stone wall and new cap. Includes all dump and delivery $60.00 @lf X 8 lf= $480.00', NULL, '2021-10-07 15:27:57', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4288692, '<span style="font-size: 11pt"><span style="line-height: 107%"><span style="font-family: Calibri, sans-serif">I am submitting a change order. Please approve online.</span></span></span><br>
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
 ', NULL, '2021-10-06 16:03:15', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4288860, 'Taking out plants. He plans to buy himself. ', NULL, '2021-10-06 15:26:26', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4288894, '24" box swan hill olive tagged at paramount.  They brought it to the front. Pink tag. This is to replace a 15 gal that didn''t survive. $360.00- $100.00 credit= $260.00. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4289391, NULL, NULL, '2021-10-07 12:48:41', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4291985, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4292509, '<span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif"><b><span style="background: yellow">Mulch 923</span></b> sf (<b><span style="color: red">237 sf more</span></b> than what was quoted on contract)</span></span></span>
<div style="border-bottom: solid windowtext 1.0pt; padding: 0in 0in 1.0pt 0in"><span style="font-size: 11pt"><span style="line-height: 106%"><span style="font-family: Calibri, sans-serif">Need to get approval of a change order for <b><span style="color: red">$568.80</span></b> to install.</span></span></span></div>
', NULL, '2021-10-07 23:35:48', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4293389, NULL, NULL, '2021-10-07 19:23:44', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4296101, NULL, NULL, '2021-10-11 15:56:54', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4303331, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (4305875, 'Add one on other side of steps to match.', NULL, '2021-10-14 09:06:41', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4308092, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4309150, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Rodriguez', 'sold'),
  (4309348, 'Credit for Buffalo Grass plugs 55 SF

We did not acquire and did not install.', NULL, '2021-10-13 16:47:39', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4311273, NULL, NULL, '2021-11-18 17:36:06', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4311281, NULL, NULL, '2021-11-18 17:35:11', NULL, NULL, NULL, 'Melinda Babaian', 'lost'),
  (4314524, NULL, NULL, '2021-10-15 13:51:49', 1, '2021-10-15 06:48:59', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (4314554, 'See detail<br>
trench 1'' X 2'' X 4''=  8 square feet<br>
3'' X3" perforated pipe in sleeve<br>
set in gravel, to be covered with geotextile fabric and Del Rio at planter level<br>
6 hours plus materials ', NULL, '2021-10-15 13:57:41', 1, '2021-10-15 06:55:55', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (4315051, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Rodriguez', 'sold'),
  (4316661, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Rodriguez', 'sold'),
  (4317707, 'We are ordering all plants (except Japanese Maple Tree) from FK Nursery.
This is a premium nursery that is a bit higher per plant, but has superior quality.

', NULL, '2021-10-15 15:11:20', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4317996, '(1) Blood Orange
(1) Grapefruit', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (4317998, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4321407, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4321781, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (4326920, '28 sf x $14.65=  $410.20<br>
Any additional pavers will be in final count', NULL, '2021-10-20 22:36:10', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4326926, '8 lf of step build x $60.00= $480.00', NULL, '2021-10-20 22:20:22', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4330166, 'Credit for Mimulus Monkeyflower
We could only get a 1g and a 5g was in your contract, this is the cost difference.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4330380, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Rodriguez', 'sold'),
  (4331680, 'Steps Total:<br>
3 Linear feet by side gate<br>
5 Linear feet by side of house by A/C ( it is actually 5.5''<br>
8 Added for side of raised back existing patio<br>
6'' additional step Change order for 1 additional step <br>
<br>
Total: for change order 6', NULL, '2021-10-20 22:34:18', 1, '2021-10-20 17:56:14', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (4331693, 'Had 9 steppers at $100.00 each, with $50.00 rocks taken out.<br>
They are being replaced with more pavers and grass.<br>
Final count for pavers afater completion of pavers<br>
Final count for grass at Landscape first day walkthrough', NULL, '2021-10-20 22:19:12', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4331699, '9 linear feet of drainage please see plan in current design folder under 21-10-20 Changes <br>
BEhind outdoor kitchen<br>
9 X $23.00= $207.00', NULL, '2021-10-20 22:19:51', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4331837, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4333676, 'Adding 1 spray zone to grass area in backyard.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4333714, 'Core thru wall $200
7 LF of sleeve for irrigation wire. $150', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4333721, 'Add shut off valve', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4333810, 'Adding 105 SF of Marathon II', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4334889, '2 1/2 inch not available anywhere.  We barely were able to find 3", so had to upgrade to that. <br>
<br>
190 linear feet of 3 inch line <br>
and<br>
45 linear feet of 1 1/2 line', NULL, '2021-11-09 08:51:12', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4335450, '53 LF of 1” copper main water line.  Include labor and trenching 18” below grade per code.
Includes backfill.', NULL, '2021-10-22 10:20:33', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (4335456, 'Need a permit from the city of Pasadena to replace an existing retaining wall with a new one that is not leaning. 

This is the allowance, once we have obtained the permit, we will let you know the permit fee, and the admin hours that it took to obtain the permit.', NULL, '2021-10-21 15:16:33', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4337190, NULL, NULL, '2021-10-22 12:54:30', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4337605, '53 LF of 1" main water line, includes trenching, backfill and labor.', NULL, '2021-10-22 11:20:15', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (4337828, NULL, NULL, '2021-10-22 12:33:56', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4337841, 'Replaced (1) valve that was leaking and had been chewed through by rodents ', NULL, '2021-10-22 13:11:23', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4337980, 'One additional uplight', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4338213, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Rodriguez', 'pending'),
  (4338500, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4338969, 'Ball valve update', NULL, '2021-10-22 17:01:08', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4343689, NULL, NULL, '2021-10-25 21:18:44', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4344061, NULL, NULL, NULL, 1, '2021-10-25 18:30:17', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (4346034, '1) We are going to move a shed<br>
2) We are digging trenches for small retaining wall under the backyard fence.<br>
3) We are building a small retaining wall out of block in that section. <br>
4) We are then repairing a small sinking section of paver<br>
5) Then we are forming and putting in rebar for the concrete.<br>
6) We re pouring the concrete.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4347249, '2 step lights. Lightcraft. Masonry light 13. $240.00 each. $480.00 total.&nbsp;', NULL, '2021-10-26 14:37:12', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4347840, 'One additional lightcraft masonry light 13. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4350917, '180 SF of Del Rio Gravel 1" minus at 3" of depth
Includes weed barrier, delivery and labor.', NULL, '2021-10-27 16:05:01', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4350926, '276 SF of Supreme mulch at 3" depth in all backyard beds

Includes labor and delivery.', NULL, '2021-10-27 16:07:10', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (4350943, '276 SF of Del Rio 1" minus at 3" depth in all backyard beds

Includes weed barrier, labor and delivery.', NULL, '2021-10-27 16:07:40', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (4351070, '1 hour plant placement w Nicole', NULL, '2021-10-27 12:29:01', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4354349, '1) Add Brilliant Wonders Glow Bubblers to water feature. Run 320 linear feet of additional piping for each bubbler to the back as the client did not want a manifold in front.  Includes ball valve for each bubbler to control water flow.  Does not include automated control system for individual bubbler settings per request. Run separate electrical lines back to control station added 320 linear feet.<br>
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
 ', NULL, '2021-11-09 08:51:56', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4354686, '27 Linear feet&nbsp; of GAS line', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4354697, '198 SF of Pavers X $13,40= $2,653.20', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4354707, '26 addtional Linear feet + various heights', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4358879, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Rodriguez', 'sold'),
  (4360246, 'Changing the concrete pad of 156, to pavers&nbsp; $20.50- $17.65= $2.85 Difference X 156=&nbsp; $444.60 Credit&nbsp;&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4360286, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Rodriguez', 'sold'),
  (4362752, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4363109, NULL, NULL, '2021-11-01 12:03:22', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4364339, 'Credit for 20 sf of grass. $70.00. $17.00 charge for plant change. Total credit $53.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4364617, NULL, NULL, '2021-11-02 19:52:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4364618, NULL, NULL, '2021-11-02 19:52:20', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4364620, 'Add''l 65 Linear Feet', NULL, '2021-11-02 19:51:55', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4364621, NULL, NULL, '2021-11-02 19:51:26', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4365537, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Rodriguez', 'sold'),
  (4369640, 'Add 5 yards of Brown Mulching to Project - Deliver and haul to back and front slopes  $1400<br>
<br>
Change out irrigation from drip systems (per initial layout prior to irrigation plan) to sprays.  $900', NULL, '2021-11-03 12:42:51', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4370133, 'Contract included 165 feet of 3" SDR. Drains were upgraded to 4"  <br>
Plus<br>
324 linear feet were installed. Add 159 linear feet installed<br>
Plus<br>
Earlier change order included 35 linear feet of sewer line.   Installed 81 ln feet.<br>
Plus<br>
Drain to Curb so curb cut out and patch<br>
<br>
Difference in cost.<br>
$6,450<br>
 ', NULL, '2021-11-04 21:33:00', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4371604, 'Install 19 Corona Lights per last request.  (see attached sheets for lighting choices)<br>
<br>
Install 1 Corona transformer', NULL, '2021-11-03 12:47:47', 3, '2021-11-03 12:41:21', 'Brian Godley', 'Brian Godley', 'sold'),
  (4376929, '6'' of bass added in the area of the spa, 156 SF  $1.00 per inch X 6"=$6.00 X 156 SF= $936.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4376944, 'Cannot drill through the alley wall, for the drain pipe, instead Marcelino will create small weep joints in the grouted area just as the building code requires.  Will not be drilling through blcok, because of possible rebar.<br>
Cost $330.00  original  $560.00= credit of $230.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4376959, '2 steps for the back door:<br>
1st step top landing 3'' out X 8'' long<br>
2nd step 18" out, to use 12" bullnose and 6" of field<br>
Riser is the Holland, border in Holland, as we will have planty left of the pallet.<br>
Will only need 16 square feet of the Aqualina in Rio<br>
Need to order 30 LF of Belgard Rio Bullnose<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4376971, 'Olive tree, 24" box multi truck, non-fruiting<br>
take out approximately 50 sf of grass to plant it ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4380281, NULL, NULL, '2021-11-09 07:35:09', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4380288, 'roughly 60 1 gallon baskets<br>
roughly 18 5 gallon baskets<br>
4 15 gallon baskets', NULL, '2021-11-09 07:34:46', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4381533, 'The Del Rio in the parkway is approved 
I have the measurements for Del Rio. 11x16. 176 sf x 5=  $880.00. You are still getting a Del Rio credit when we measure it out the areas that we expanded with pavers. We will measure those areas for the reduced amount.', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4383860, 'Water proofing 2 coats of Henry''s tar<br>
8" down<br>
53 Linear Feet<br>
X $25.00', NULL, NULL, 1, '2021-11-08 12:06:43', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (4383880, 'Drainage line already in line with new drains<br>
New:<br>
3 connecting downspouts X $125.00= $375.00<br>
3 new drain caps X $50.00= $150.00<br>
Total:  $525.00', NULL, NULL, 1, '2021-11-08 12:07:40', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (4384218, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4385602, 'Additional linear feet of drainage directed to Marcelino 12 lf X $22.00= $264.00.&nbsp;', NULL, '2021-11-15 14:26:03', 1, '2021-11-09 07:19:47', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (4388469, NULL, NULL, '2021-11-16 11:50:05', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4389014, 'The flagstone was not installed in concrete footings. Credit of $20.00 per flagstone x 23 flagstone. $460.00. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4389055, 'Credit for 4 5 gallon plants. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4389224, 'Drip zone for planters. ', NULL, '2021-11-15 11:31:07', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4389452, NULL, NULL, '2021-11-18 17:34:36', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4389687, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4391583, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4392934, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4395693, 'Raise curb wall up to 24 inch retaining wall for roughly 40 linear feet<br>
Regrade areas next to curb wall flat<br>
No Charge<br>
<br>
Add back in from earlier bid, Backyard Steps and Step Wall. Includes stucco coat and waterproofing<br>
$5,350<br>
<br>
Add back in from earlier bid, Walls around Tree.  Includes stucco coat and waterproofing<br>
$5,650', NULL, '2021-11-15 10:22:52', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4396015, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Rodriguez', 'sold'),
  (4396703, 'Remove  18 foot Tree and Root System.<br>
$1300<br>
<br>
Remove Small Tree<br>
No Charge', NULL, '2021-11-15 07:46:37', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4396895, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4400220, '4 feet x 70 linear feet gopher mesh. 18" under railing. With 30" above the railing  attached with wire. Use 1/4 inch wire mesh with black coating. Set with concrete at bottom.  Priced at $15.00 a linear foot. $1,050.00', NULL, '2021-11-15 11:30:27', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4400271, 'Design credit. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4400282, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4400348, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4400351, NULL, NULL, '2021-11-12 20:28:10', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4400440, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4400447, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4400455, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4400458, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4400771, NULL, NULL, '2021-11-16 11:50:29', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4400795, 'Upgrading pavers to Mirage Quartzii Waterfall pavers<br>
Upgrading bullnose to Unico<br>
Upgrading wall cap to Prime Silver Travertine<br>
Stacked stone/veneer will be East West Natural Icicle Grey', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4401258, 'Approx 23'' of Rustic Wall in Tuscan with a height ranging from 8"-16". Wood dividers to remain to retain soil. (Understood they may get damaged during construction) 

See attached contract addendum with photos.

Any work outside of this addendum will be an additional change order.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Client wants to bury the pvc pipe himself once we have dug trench. He will be doing electrical after.  
No soil included in contract. 
They will leave the pavers and block where it is now unless it’s in the way. 
All other CMU block will be hauled.</div></div>', NULL, '2021-11-13 11:54:55', 6, '2021-11-12 19:19:16', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (4404169, NULL, NULL, '2021-11-16 11:50:52', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4404939, NULL, NULL, '2021-11-16 10:11:25', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4406057, '12 Additional Linear Feet of Wall Rustic wall Tuscan @ $129.00 a SF', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4406060, 'This includes sand finish on: front steps, larger step pads leading to front door and around to west side, the front porch concrete, the 2''x2'' step pads into the backyard and the backyard patio.', NULL, '2021-11-16 10:11:41', NULL, NULL, NULL, 'Sabrina  Thorp', 'sold'),
  (4406062, '63 Linear Feet of Conduit and wiring  X $23.00<br>
This is to go under grass, and DG to baack of shed', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4406069, '1 transformer<br>
1 more ledger light', NULL, '2021-11-16 09:13:35', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4406109, 'This change order is for the caps on top of the wall on the steps leading onto the front porch.', NULL, '2021-11-16 10:11:01', NULL, NULL, NULL, 'Sabrina  Thorp', 'sold'),
  (4406129, '61 square feet of decomposed granite is needed for placement in between step pads in front yard. Bender board is included in original bid.', NULL, '2021-12-17 08:19:45', NULL, NULL, NULL, 'Sabrina  Thorp', 'sold'),
  (4406166, 'This change order is for the removal of the existing pad with slate (6.5''x10'') and concrete ''path'' (2''x22'') underneath edge of pad near the playroom. Replacement with a new 2''x10'' concrete step with sand finish in front of french doors.', NULL, '2021-11-16 10:10:40', NULL, NULL, NULL, 'Sabrina  Thorp', 'sold'),
  (4406273, 'Remove existing 46 square feet of concrete pad with slate veneer near kitchen french doors. Replace with ''L'' shaped step at total of 35 square feet with sand finish. Add additional 11 square feet of concrete with sand finish to patio.', NULL, '2021-11-16 10:09:57', NULL, NULL, NULL, 'Sabrina  Thorp', 'sold'),
  (4406307, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">This change order is for using So Cal Blend Simple Turf synthetic turf in the parkway.</div></div>', NULL, '2021-11-17 14:33:54', NULL, NULL, NULL, 'Sabrina  Thorp', 'lost'),
  (4406342, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">This change order is for the option of setting new sod in the parkway and making sure the spray irrigation is functional.</div></div>', NULL, '2021-11-19 06:33:45', NULL, NULL, NULL, 'Sabrina  Thorp', 'lost'),
  (4406356, 'This change order includes: removal of 321 cubic feet of soil 3'' back from sidewalk to retaining wall, 60 linear foot 8"x8"x16" CMU retaining wall with 1''x3'' footings (linear foot includes two 3'' returns on ends by neighbors properties) waterproofing of the retaining wall and stucco finish (Color TBD by client).', NULL, NULL, NULL, NULL, NULL, 'Sabrina  Thorp', 'lost'),
  (4406357, '8"x8"x16" CMU block, 1''x3'' footings with stucco finish', NULL, '2021-11-17 14:34:32', NULL, NULL, NULL, 'Sabrina  Thorp', 'lost'),
  (4406383, 'Waterproofing for 113 linear feet of retaining wall in backyard. This includes the bbq area and the wall by the synthetic turf area.', NULL, NULL, NULL, NULL, NULL, 'Sabrina  Thorp', 'sold'),
  (4407604, 'Sand and seal counter top. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4407869, NULL, NULL, '2021-11-16 11:51:08', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4407950, '40 linear feet&nbsp;', NULL, '2021-11-16 11:51:32', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (4408944, 'Office hours for permit pulling are billed at $120/hr. 

If we are pulling permits it is $120/hr plus cost of permit (which we will share with you).  This is typically set as an allocation, but in this case, Mohammed spent only one hour working on your permit.  

If we need to pull the Apron permit with our C-27, it will be a separate change order for an allocation amount.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">I have another change order on hold for permit allocation for the apron, let’s see what city says first with the plan (and if pavers can be installed in apron, I doubt it). 

UPDATE: Brian told her it was ok to decline this CO.</div></div>', NULL, '2021-11-29 18:49:23', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (4409573, 'This change order is for the option of replacing the current quoted sod in front yard with synthetic turf. If replacing with synthetic turf, 2 spray zones will be credited (-$1,770) and sod pricing will be credited (-$3,633).', NULL, '2021-11-19 06:20:28', NULL, NULL, NULL, 'Sabrina  Thorp', 'lost'),
  (4410651, 'Removal of bougainvillea in backyard in corner near garage. ', NULL, NULL, NULL, NULL, NULL, 'Sabrina  Thorp', 'sold'),
  (4412504, 'Engineering with Oscar for retaining wall as required by City of Pasadena.

Once engineering is completed, we will submit to city for final approval.', NULL, '2021-11-17 15:25:44', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4412516, 'Removal of pilaster with light near stairs by the garage', NULL, NULL, NULL, NULL, NULL, 'Sabrina  Thorp', 'sold'),
  (4414318, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4414361, NULL, NULL, '2021-11-17 16:24:48', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4414379, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4416558, 'Trash can wall in contract included block wall and standard footing.  ($1850 Credit)<br>
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
 ', NULL, '2021-12-06 11:50:09', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4418344, 'Change order is for 13 linear feet of CMU block wall 4"x8"x16" to repair foundation for fireplace. Also includes moving the mainline for water, so that it is not in the way of the block wall.', NULL, '2021-11-19 06:19:31', NULL, NULL, NULL, 'Sabrina  Thorp', 'sold'),
  (4418646, '8"x8" block column for porch. CMU. TO BE STUCCO that matches the pilasters. Color to be selected with verva', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4418650, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4419369, 'Assemble and soil', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4420187, 'Install 26 linear feet of 4" drainage pipe.', NULL, '2021-11-19 14:18:20', NULL, NULL, NULL, 'Sabrina  Thorp', 'lost'),
  (4420554, '6 less linear feet x $60.00. $360.00 credit', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4420713, '$14.65 x 33 sf', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4420742, 'Extend wall 10 linear feet 
Add 40-50sqft concrete behind pool wall
Remove excess soil and haul', NULL, '2021-12-22 14:37:46', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4420758, NULL, NULL, '2021-11-19 11:37:10', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4420923, '32 more linear feet', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4420986, '256 sf less x $3.75= $960.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4421065, '13 lf of bender board. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4421143, 'Using own controller', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4422023, 'ccredit for plant not installed and plant install only balance<br>
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
<b>Thank you Gail, it is a pleasure to assist you!</b>', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4422032, 'Paver contract  price 344 sf  $5,418.00  (mistake in math of $100.00, should have been $5,314.80)<br>
<br>
Actual installed 290 sf X $15.45= $4,480.50<br>
Difference $903.40', NULL, '2021-11-20 10:37:17', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4422037, 'Waterproofing was supposed to be 1 coat Henry''s Tar, and 1 coat bichathene<br>
53 linear feet with 12"-18" deep<br>
The footings were exposed and the crew could only apply 1-2 coats Henry''s tar, at only 5-6"<br>
Time taken was not for the amount charged<br>
 ', NULL, '2021-11-20 10:38:28', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4422049, '60 linear feet added<br>
6 under pavers<br>
3 down spouts<br>
Amount in Change Order of 11/8  $525.00<br>
<br>
Total installed:  $1,518.00  - 525.00= $993.00 ', NULL, '2021-11-20 10:58:27', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4422169, '20 linear feet of drainage with caps x $25.00=$450.00', NULL, '2021-11-20 15:29:49', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4428217, 'Additional plants <br>12 succulents<br>4 smaller creeping fog<br>  2 larger creeping fig <br>360<br> ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (4429374, 'This is for plants ordered from FK Nursery, our premium nursery.', NULL, '2021-11-28 11:40:55', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4429850, '1 (5g) peanut cactus
1 (5g) woolly cactus 

We could not source these, client will purchase and we will plant.  Credit is for material only.', NULL, '2021-11-28 11:40:19', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4430752, 'Here is the planting add on for the project:<br>
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
$0', NULL, '2021-11-23 15:50:27', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4430790, 'Additional&nbsp; 405 Sf of grass RTF X $3.75= $1,518.75', NULL, '2021-11-23 16:00:46', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4436133, 'Credit for entire paver amount in contract - see contract addendum.  ', NULL, '2021-11-30 09:29:33', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4436134, 'Credit for flagstone installation (material was purchased by client) ', NULL, '2021-11-30 09:29:15', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4436135, 'All according to city code, 
Apron will be 9” x 9’ with two 2’9”-3’ wings.
“Sidewalk” is approx. 9’ x 3’6. Total LF from curb to end of city property is 12’6”

Cost includes all concrete labor, installation, scoring, forming and material.', NULL, '2021-11-30 09:28:55', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4436138, '15 LF of concrete curb at 3” $700
30 SF of asphalt $400 (includes demo of existing asphalt)', NULL, '2021-11-30 09:28:11', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4436139, '400 SF of pavers, they are on site already.
400 SF of polysand. 

Includes labor and material. ', NULL, '2021-11-30 09:27:41', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4436141, 'Planting 2 (15g) cactus that are already on site in pots.', NULL, '2021-11-28 11:40:40', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4440281, 'Install and purchase one smart timer with 6 stations and outdoor box.
Connect all irrigation wires to box.
Show client how to use the WiFi smart timer.', NULL, '2021-11-29 15:35:27', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4440292, 'Raise up olive tree to appropriate grade level.  
No charge. ', NULL, '2021-11-29 15:35:07', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4440329, '6 SF of concrete patch with top cast finish. 
Dig 6-7” below to get at least 4” of concrete pour.
2 men, half day
', NULL, '2021-12-01 09:21:16', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (4440562, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4440677, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4442852, 'Jorge suggested the copper shield irrigation tubing for the drip line in the back yard.  
This is the cost difference between Netafim tubing and copper shield tubing. 

Please contact Jorge for any explanations needed!', NULL, '2021-11-30 11:11:13', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4444204, '(16) path lights<br>
(9)   up lights<br>
(1)  transformer', NULL, '2021-11-30 15:07:20', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4444367, 'Alleged damage to ac by our crews', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4444466, '52 Linear Feet of Bender Board for side of walkway', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4444479, '1)  Demo of existing concrete, was done by Paver crew<br>
2)  Insatll 3 slabs that are on the property in walkway area<br>
3)  Install 78 Sf of Del Rio 4" or less that is on property<br>
4)  Purchase 181 Sf of Del Rio 4" or less for rest of walkway, NO GEOTEXTILE FABRIC<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4444485, 'Backfill and compact the electrical trench<br>
4 man hours X $75.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4446186, 'Add in Rachio Timer System.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4450397, '5’ x 3’', NULL, '2021-12-02 20:27:13', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4451242, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4455845, '7'' conduit<br>
35'' wire<br>
Box and gfi outlet', NULL, '2021-12-03 12:37:32', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4458832, 'Needed to import 70/30 soil for backyard as grass had thatched and was considerably high. Needed to build this up to grade. Have given a $200 discount as a gift from Nicole.', NULL, '2021-12-06 08:23:04', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4459061, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4459581, 'Install 2 yards of white 3/4 crushed gravel.  No weed barrier.<br>
<br>
To be done on the same day as Johanna Altman', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4461014, 'This change order is for changing the material in the backyard from Del Rio gravel to stabilized decomposed granite. Total of 1,219 square feet of material.', NULL, '2022-01-04 11:29:33', NULL, NULL, NULL, 'Sabrina  Thorp', 'sold'),
  (4463560, 'Demolition of the work area. Prep area, amend soil and install plants. <br>
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
14 – 1 Gallon Cranebill White or Red', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4466577, '153 additional sq feet of Veneer at $25 per sq foot.   - $3,825<br>
<br>
Discount given per Jorge for veneer $625.   Total  $3,200', NULL, '2021-12-07 19:47:31', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4468757, 'Adding timer for irrigation zones. Will be placed in garage for easy access to homeowner and electricity.', NULL, '2021-12-08 17:31:38', NULL, NULL, NULL, 'Sabrina  Thorp', 'sold'),
  (4469374, 'Plants damaged during paver installation.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4469390, 'In order to have the right amount of pressure for the valves for the irrigation zones, we need to connect to the mainline at the side of the house. We will be installing 80 linear feet of piping with all fittings to manifolds for irrigation.', NULL, '2021-12-08 17:31:06', NULL, NULL, NULL, 'Sabrina  Thorp', 'sold'),
  (4469409, 'With the added pressure we are getting from the mainline, we do not need as many zones of irrigation for the plants. A credit will be given to your account.', NULL, '2021-12-08 17:30:31', NULL, NULL, NULL, 'Sabrina  Thorp', 'sold'),
  (4470012, 'The stump in the front planter is bigger and deeper upon further inspection. The pricing is for renting the stump grinder, man-hours and other materials needed for full removal.', NULL, '2021-12-08 17:29:21', NULL, NULL, NULL, 'Sabrina  Thorp', 'sold'),
  (4470628, 'Add sod back in to contract.&nbsp; 1305 sq feet of Valley RTF', NULL, '2021-12-09 18:54:41', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4470634, '<span style="font-size: 12pt"><span style="font-family: "><b><span style="font-size: 14.0pt">Irrigation</span></b></span></span><br>
 
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
<span style="font-size: 12pt"><span><span style="font-family: ">Install Black 1/4 inch drip line later when plants are installed. </span></span></span>', NULL, '2021-12-24 08:19:45', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4488542, '(6) 15 gallon', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4488589, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4491866, 'We can irrigate all plantings with 2 zones', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4491890, 'Will need to run an addtional 50 linear feet of pvc x 2 under driveway in order to irrigate/light bed to the left of drive<br>
Also need to run roughly 10 linear feet of sleeving for both irrigation/electric under walkway from manifold to small bed on the left side of front entryway', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4491969, 'Neighbor''s approved', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4494716, 'Contract states 35 tons of soils to be removed.  We had to remove over 90 tons -  3 and 1/2 super 10 semi dump loads. <br>
<br>
We will not charge for extra labor for removal. Just for pickup and demo dump fees. <br>
 <br>
Added demo soils dump fees is $2,600. <br>
 ', NULL, '2021-12-24 08:21:07', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4494723, 'Cut and install turf strips. <br>
Includes base, hand compaction, dg underlayer, turf, seaming and nailing.<br>
$2,850.<br>
<br>
 ', NULL, '2021-12-21 13:13:05', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4494726, 'Spray Top Cast on all concrete surfaces.&nbsp; &nbsp;Then powerwash and scrub.&nbsp;', NULL, '2021-12-16 16:43:06', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4495751, '<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">1. We had a gopher attack in the front yard. Now they have been caught but I need the DG to be repaired in about 6 spots.</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">2. When this is being done, I want too source and plant some new plants in the back:</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"> </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">                6 x Lavandula Thumbelina</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">                6 x Agapanthus Baby Pete</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif"> </span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">Both in 5G if available, although they are small plants so maybe only 2G available. Can you source these plants?</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">3. Need 3 new Monkey Paw plants to replace ones that got cut back too far. I think that Daniel knows about this.</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">4. Need 3 scabiosa and 3 geranium St Ore (?) to fill in a few bald spots.</span></span><br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">5. Generally check irrigation outlets.</span></span><br>
 ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4496754, 'Roughly 40 linear feet', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4496758, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4496763, '(9) uplights plus (1) transformer ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4497174, 'Height of wall is  now 7’8”', NULL, '2021-12-19 20:45:28', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4497190, 'Separating DG from Gravel
45 linear feet ', NULL, '2021-12-20 09:15:08', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4497200, '450sqft at 2”
In front of turf to top of wall', NULL, '2021-12-20 09:14:57', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4497214, 'Install 2” of DG Install 2” of Road Base Install 500 sf of existing turf with pet infill sand.', NULL, '2021-12-20 09:14:45', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4497818, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4500543, 'After apron is installed we measured 451 SF of paver. 9'' at bottom and 11'' at gate. This is an additional 51 SF than we originally estimated.', NULL, '2021-12-20 22:14:59', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4501540, 'Adding 4 LF of CMU 8" x 8" x 16" wall along property line, closest to backyard gate to retain to soil from neighbor.<br>
Sanded stucco. (color TBD on site with swatch from project sup.)<br>
<br>
includes labor, footings, rebar, infill, stucco and block wall.', NULL, '2022-01-28 15:46:17', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4505839, 'Extend lawn from top of yard, down the slope to the sidewalk. Total add of lawn: 330 square feet. Price for lawn: $1,155<br>
<br>
Because we are removing and relocating a few of the plants, there is a credit of -$846 for the plants we are not ordering. Removal of (11) 1 gal plants and (14) 5 gal plants.', NULL, '2021-12-22 08:59:31', NULL, NULL, NULL, 'Sabrina  Thorp', 'sold'),
  (4505928, '1- relocated main line 10LF 3/4" pipe total of 6 fittings 3/4" - $480 with material<br>
<br>
2- (3) total curb cores 1 for surface drains, 1 for French drain and 1 for house rain gutters - $590  ($390 labor/$200 core drill rental)<br>
<br>
3 - Add additional drain connections for all drain lines $350 with material<br>
<br>
4- Install Sump Pump system with catch basin, catch basin lid, evacuation lines and tie in inlets and electrical - $1750<br>
<br>
<br>
<br>
 ', NULL, '2021-12-29 11:45:54', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4508869, 'this is to offset the accounting for job', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4512042, 'This pricing is for a desert vibe parkway from picture Veronica sent to me.<br>
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
 ', NULL, '2021-12-31 14:48:39', NULL, NULL, NULL, 'Sabrina  Thorp', 'lost'),
  (4512054, '1. Dig holes for plants<br>
2. Introduce 2 1/2 to 3 yards of amendments<br>
3. Plant (30) 15 gallon Laurel Nobilis Hedge plants', NULL, '2021-12-24 08:20:05', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4513235, NULL, NULL, '2021-12-27 10:44:48', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4515872, '<p><u>FOR THE RECORDS</u>:<br />
Initial deposit for permit: $1,000<br />
Change order previously approved (not invoiced): $2,500<br />
&nbsp;</p>

<p>Total permit cost:<br />
$5,475.37 - $3,500<br />
<u><strong>= $1,975.37</strong></u></p>
', NULL, '2023-03-15 16:28:24', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4518528, 'Taking out the stucco section of the contract and instead paint over all walls in the attached photos. <br>
No extra charge. Please just approve the changes of scope of work.<br>
We will also paint the short walls at no additional cost to make it uniform if you''d like to do so.<br>
Please see attached phots and let me know if you have any questions. <br>
<br>
*Exterior paint. Black color. Flat Finish. ', NULL, '2021-12-31 08:39:38', 5, '2021-12-29 18:28:03', 'Melinda Babaian', 'Melinda Babaian', 'sold'),
  (4521079, 'Adding a wooden retaining wall to the left side of yard by hedges to hold back the soil. There is an elevation change we need to accommodate for and make sure that the soil does not flow into the decomposed granite we are planning on placing underneath the embankment.', NULL, '2022-01-04 08:27:46', NULL, NULL, NULL, 'Sabrina  Thorp', 'sold'),
  (4521080, 'This french drain will help move the water away from the wall.', NULL, '2022-01-03 12:05:24', NULL, NULL, NULL, 'Sabrina  Thorp', 'lost'),
  (4521083, 'This is for an additional 380 linear feet of bender board along the steppers, sides of the yard, and any transition of materials (mulch to DG, grass to mulch) throughout the site. By adding more bender board, you are creating a more unified, modern look to compliment the overall design.', NULL, '2022-01-04 08:27:25', NULL, NULL, NULL, 'Sabrina  Thorp', 'sold'),
  (4522982, '98 additional linear feet of drainage. X $22.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4523152, 'Here is pricing for just Decomposed Granite in the parkways.<br>
557 square feet of stabilized DG with weed barrier<br>
557 square feet of removal of existing lawn, with soil removal at 3" depth for the decomposed granite to fit in the parkway', NULL, '2022-01-03 12:04:44', NULL, NULL, NULL, 'Sabrina  Thorp', 'lost'),
  (4523244, '11 linear feet of step build stone wall 2 as tread in Tuscan.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4523294, '150 watt steel outdoor transformer
Includes all labor and wiring.

To be installed for front property low voltage lights, install on interior of fence/gate.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Carter already ordered from Lightcraft. (Prior to this)</div></div>', NULL, '2022-01-03 13:03:20', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4523346, 'Measurement in contract was 215 SF. 
Measurement on site is 265 SF due to small changes in wall size and layout of pathway. 

NO CHARGE <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Difference was a credit of $122 according to PB price sheet thus no charge.</div></div>', NULL, '2022-01-03 13:02:59', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4523358, 'This helps keep sand in joints and acts as a binding agent. 
@ $1.75/SF according to contract.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Please inform Tino if this is approved. This is for front entrance area only</div></div>', NULL, '2022-01-03 13:02:39', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4523361, NULL, NULL, '2022-01-03 17:03:43', NULL, NULL, NULL, 'Melinda Babaian', 'sold'),
  (4523377, '6” CMU block for 24LF @ 36”
4” CMU block for 64LF @ 16”

Approx. 157 SF of sanded stucco.

Cost is a wash with what is on contract.', NULL, '2022-01-03 13:01:58', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4524154, 'Planting design amended. Evaluate and adjust plant quantities within the current plant budget.
Develop a new CAD plan.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">4 hours David H.</div></div>', NULL, '2022-01-14 04:54:36', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4524198, 'Timeframe: Pots laid out in field per plan, prior to planting/digging. 
Summary: Adjust site layout of plants. Get approval from client on layout. <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">2 hours David Hanrahan</div></div>', NULL, '2022-01-14 04:55:29', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4526593, NULL, NULL, '2022-01-04 12:46:13', NULL, NULL, NULL, 'Melinda Babaian', 'pending'),
  (4527076, NULL, NULL, '2022-01-04 13:47:28', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4528834, '114 Additional Square Feet of Pavers Base price at $13.25 and upgrade of polymeric sand and Heartland + $3.60 SF= $1,943.70<br>
Changing wall blend out from Grey moss Charcoal to Tuscan as well', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4528892, 'Additional 17 LF of Step Build X $60.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4528919, '9 Linear feet less&nbsp; &nbsp; $152.00 X 9 LF= -$1,368.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4529820, '(1) 4 x 6 structural beam 
(9) 2 x 6 

See design attached.
Labor and all materials (screws etc) included in cost.
Client to handle painting after PictureBuild is off site.', NULL, '2022-01-06 09:26:39', 1, '2022-01-05 11:50:06', 'Nicole Antoine', 'Nicole Antoine', 'lost'),
  (4529944, ' 350 SF
Power wash upper backyard patio pavers and steps. 
Install new polysand in pavers and steps. @$1.50/SF
Apply color boost sealant to pavers and steps. @$1/SF.

This cost is for upper area only. ', NULL, '2022-01-06 15:14:26', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4530753, 'We have 87 LF of fence demo in contract and total fence demo is 128 LF (chain link, front fence and gate, front entryway fence)

Cost difference is 41 LF. ', NULL, '2022-01-28 15:46:07', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4530802, '38 LF of CMU 6" x 8" x 16" @ 24" high. $4,370
Sanded stucco 76 SF. $646
Thoroseal waterproofing $893
Labor and all materials included.

If LF is less, we will credit you. There will be a step up in 8 ft sections as needed.', NULL, NULL, 1, '2022-02-03 10:45:13', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (4531894, '60sqft 1-2" Mexican Beach in black <br>
(9) 1 gallons', NULL, '2022-01-06 20:56:54', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4533410, 'Color Boost Sealer @ $1/SF for pavers.
Location - Front entrance pathway and step
', NULL, '2022-01-06 16:58:17', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4533612, NULL, '2022-01-06 12:40:00', '2022-01-06 12:57:39', NULL, NULL, NULL, 'Mikale Perez', 'sold'),
  (4536284, 'Replace 38 linear feet of 3/4”copper main line ', '2022-01-07 10:37:00', '2022-01-07 10:52:42', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4536540, 'This price does not include laying asphalt after completion. We can hire an asphalt company to do this, but to save you guys some money. We recommend you hiring a company and paying them directly. If not then asphalt would be on a separate change order with its own pricing. **Also to do this work we will have to give proper notice to all residents that share this drive-way.<br>
<br>
Price breakdown.<br>
<br>
250 linear feet of 1 inch copper with couplings  - Material charge $17 per linear foot - $4250<br>
Asphalt cutting - Machine rental with blades and dump fees  - $1200<br>
Mini Excavator - Rental   - $1000<br>
Crew Labor - Excavation - $2350<br>
Crew Labor Installation - $1700<br>
Crew Labor Refill and Compact in Lifts with Jumping Jack - $3000', NULL, '2022-01-10 13:41:45', NULL, NULL, NULL, 'Mikale Perez', 'sold'),
  (4537337, 'This is for 100 sqft of concrete, broom finished for the sidewalk. Pricing is changed per discussion with Jorge.', NULL, '2022-01-20 17:32:57', NULL, NULL, NULL, 'Sabrina  Thorp', 'sold'),
  (4537348, 'This is a credit for 4 drip valves that we do not need to install for a completed project.', NULL, '2022-01-11 06:46:53', NULL, NULL, NULL, 'Sabrina  Thorp', 'sold'),
  (4543119, '40 Linear Feet', NULL, '2022-01-11 18:07:08', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4543134, 'Adding 4" SDR 35 pipe plus 2x2 catch basin', NULL, '2022-01-11 18:04:49', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4543967, 'Remove existing concrete and haul to dump.<br>
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
Pour concrete, finish and remove forms. ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4544018, 'Pressure regulator $325
Labor $75', NULL, '2022-01-11 11:10:57', NULL, NULL, NULL, 'Mikale Perez', 'sold'),
  (4545794, '22 pieces of block', NULL, '2022-01-12 08:08:28', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4546834, NULL, NULL, '2022-01-12 08:48:47', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4546842, NULL, NULL, '2022-01-12 08:48:15', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4549136, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4550862, 'Job closed ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4550897, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4550972, 'Very happy ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4551887, NULL, NULL, '2022-01-13 11:10:30', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (4551906, 'Credit for orignal concrete job', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (4551976, NULL, NULL, '2022-01-13 11:17:41', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4556053, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4556059, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4557426, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4557865, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4558045, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4558085, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4558236, 'Poppy seeds were not planted by Picture Build. Credit for labor and materials that was in final price list and contract.', NULL, NULL, NULL, NULL, NULL, 'Sabrina  Thorp', 'pending'),
  (4562152, 'Install 16 zone rachio timer
Install two new sprinklers for better coverage
Cancel one sprinkler by side wall
', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (4562256, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4564028, '(17) 15 gallon&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4566256, '60 linear feet of drain 
7 basins 9”x9”', NULL, '2022-01-19 13:31:05', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4566258, '2 courses 
Dowel rebar into existing wall
Smooth stucco in white', NULL, '2022-01-19 13:30:41', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4566346, 'demo, form and pour approx 30 SF of concrete in upper backyard, see photo attached.<br>
<br>
(replacement of concrete pad)', NULL, '2022-01-19 07:27:35', 1, '2022-01-18 16:31:14', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (4566570, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4566758, '3 hours labor @$75/hr. + $80 material

Rewire valves, check all lines.', NULL, '2022-01-19 09:41:10', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4568197, 'Pour colored concrete pad for wood
2'' x 7''6" = 15.2 SF
Includes forming, labor and all materials.', NULL, '2022-01-19 11:33:54', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4568604, 'Trim back large vining rose bush 18"', NULL, '2022-01-19 11:33:36', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4568614, '14 LF of 3" SDR drainage from French perforated drain to dry well (in planter)', NULL, '2022-01-19 11:33:11', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4568646, '- Add one 6" CMU course to 18 LF of wall
- Add rectangular cap to wall for garbage can enclosure. (So the taller garbage can tops can be hidden) 18 LF', NULL, '2022-01-19 11:32:53', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4568660, 'Not doing a footing for towel rack near spa
Issuing a credit.', NULL, '2022-01-19 11:32:35', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4568703, '3" triple wall sleeve for approx 14LF

From stub up in planter to garage disconnect.', NULL, '2022-01-19 11:32:13', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (4568823, 'Demo Trex steps.
<br>Form 3 steps with 6" rise for Trex overlay. <br>Includes all wood.<br>Trex boards are 5 1/2" wide. <br>So step tread will be 11" (or 13" if 2" pieces can be used).<br><br>*Client to purchase Trex separately.<br><br>(If lead time for Trex is longer, we can credit for installing Trex)', NULL, '2022-01-19 11:31:31', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4569338, 'Additonal sod was added as beds were reshaped&nbsp;', NULL, '2022-01-19 14:08:07', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4570408, '12 LF of 3/4” Electrical conduit with (3) 12 gauge wires
(1) outdoor rated duplex outlet
Includes punch out, trenching and electrical.', NULL, '2022-01-20 06:29:05', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (4571752, 'Saw cut and chip away from wall. This is for saw cutter and labor to chip away without damaging wall.', NULL, '2022-01-20 08:10:11', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4574644, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4575311, NULL, NULL, '2022-01-21 10:17:39', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4575316, NULL, NULL, '2022-01-21 10:17:25', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4575319, NULL, NULL, '2022-01-21 10:17:00', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4576345, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4576403, '49LF of trenching at 18" deep. (to code)
Includes backfill.

*Work is already performed.', NULL, '2022-01-21 11:22:36', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4576413, 'Valves near pool are old and leaking. 
Install (2) new plastic valves and test.', NULL, '2022-01-21 11:57:14', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (4576604, NULL, NULL, '2022-01-24 11:39:18', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4576626, 'The first course is 5 LF.    $375.
     
6 course at 5 LF. each course
30 LF.    $1,500

Back fill with existing soil $150.
Delivery for timber. $120.

Total $2,145.
', NULL, '2022-01-21 11:18:56', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4576807, 'This irrigation is only for the top of the hill for the new plants.


Not the podocarpus 
', NULL, '2022-01-21 12:38:09', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4576849, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4582290, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4583370, 'Continue border stone along both sides of carport. 
19’ 6” (x both sides) = 39’ LF of border.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Make sure TINO has this part in his scope.</div></div>', NULL, '2022-01-28 15:45:56', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4583379, 'Client already has main line shut off valve.', NULL, '2022-01-28 15:45:45', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4583382, '18 LF of main line 3/4” copper.
Buried 18" below grade per code.
Includes trenching and backfill.

New location near fence in grass zone buried with green cover at grade. Going to be out of the way and much cleaner of a look. Zero trip hazard.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">This is the correct size and LF, but needs to be copper line..(.ok thanks, corrected and sent!)</div></div>', NULL, '2022-01-28 15:45:32', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4583384, 'No charge.', NULL, '2022-01-28 15:45:19', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4585559, ' 
- Install 4 LF. Of 8" brick for cap and grout on 6" return wall

 Install 70 square feet brick veneer and grout.

All labor and materials included.', NULL, '2022-02-02 09:19:37', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4587429, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4587471, ' Grace,

It was so great to see you yesterday and enjoy seeing your amazing backyard!!

Notes from our meeting:

1)  Please approve 8 more Wax Leaf Privets X $43.50= $348.00

2)  Lights- moving 2 lights, we can easily move them when our landscape crew is next door installing lights

', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4588879, 'Dig down 24 inches remove soil and backfill with gravel on 30 drain inlets at $250 per inlet<br>
<br>
total $7500', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (4588915, 'One additional planter to be graded and plants to be removed. Using existing plants from another planter to transplant.<br>
Backfill with 27 cu ft of soil <br>
grade planters to drains.<br>
3 yards of Additional soils for other planters needed<br>
$1500', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (4590098, 'Approved at job site&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4591762, 'demo existing planters and vegetation, backfill with 7 yards of soil to original planters discussed. <br>
grade soil to drains for proper water drainage.<br>
adjust heights of drains accordingly. <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">demo existing planters and vegetation, backfill with 7 yards of soil to original planters discussed. 
grade soil to drains for proper water drainage.
adjust heights of drains accordingly.</div></div>', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (4594708, '9 LF of border stone on either side of apron. 18 LF in total.', NULL, '2022-01-28 15:44:49', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4597007, NULL, NULL, '2022-01-31 16:34:38', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4597559, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (4598904, 'Tile labor', NULL, '2022-01-28 21:26:50', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4598907, '@$1/SF', NULL, '2022-01-28 21:26:22', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4598916, 'Credit for not doing polysand at front entryway', NULL, '2022-01-28 21:26:07', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4598963, '8 LF of bullnose material not using', NULL, '2022-01-28 21:25:04', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4599170, 'Credit for overage on wall
15lf one course', NULL, '2022-01-28 21:25:47', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4602155, 'Move hose bib out of grass area 21 LF
Move hose bib out of walkway and into retaining wall bed. 2'' 6" LF', NULL, '2022-01-31 10:14:53', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4603914, NULL, NULL, '2022-01-31 14:33:57', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4603937, NULL, NULL, '2022-01-31 14:33:43', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4603952, NULL, NULL, '2022-01-31 14:33:19', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4607032, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4607770, 'Per attached addendum.&nbsp; Price may fluctuate depending upon shooting grades and path location.&nbsp;', NULL, '2022-02-01 13:05:15', 1, '2022-02-01 12:37:34', 'Brian Godley', 'Brian Godley', 'sold'),
  (4610206, NULL, NULL, '2022-02-02 08:53:36', NULL, NULL, NULL, 'Mikale Perez', 'sold'),
  (4611118, NULL, NULL, '2022-02-02 10:44:21', NULL, NULL, NULL, 'Mikale Perez', 'sold'),
  (4611155, NULL, NULL, '2022-02-02 10:48:01', NULL, NULL, NULL, 'Mikale Perez', 'sold'),
  (4611977, 'Credit for 3 @5 gal. 5@1 gal. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4613410, NULL, NULL, '2022-03-11 14:24:39', 1, '2022-02-02 15:09:52', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (4613466, NULL, NULL, '2022-02-02 15:23:35', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4613695, 'Install 45 LF of 3/4” Galvanized Line 18” below grade per code.

Giving a discount for additional work.

', NULL, NULL, 1, '2022-02-03 10:44:01', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (4617775, NULL, NULL, '2022-02-03 15:34:48', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4620039, NULL, NULL, '2022-02-10 08:01:42', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4620443, '(3) coats of roll on waterproofing behind walls approx. 57 LF x 3 FT (TALL) = 171 SF

Cost is $10.50/SF and I have given it at $9.35/SF for a total of $1,599.

This is so the stucco doesn’t get damaged when water tries to come through the wall. We did not have this is the contract, but it is suggested.

Discount of $200.', NULL, '2022-02-11 11:27:24', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4621228, '1) Change to paver and add sq footage - $2300<br>
2) Added drainage - $1000<br>
3) Added post work - $450<br>
4) Add one more irrigation zone - $800<br>
5) Add copper main line work - $4100<br>
6) Remove 80 linear feet of bender board - credit ($800)<br>
7) Added demo $800<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4621498, 'As contracted in our design agreement ($400 CREDIT)
THANK YOU MAZERS!', NULL, '2022-02-05 09:10:54', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4623394, 'Additional 625 sq feet of sod.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4628605, 'We are switching out the sod for Synthetic turf<br>
<br>
4 seams $3825 - Pet Gravel Install<br>
credit of $700 for sod installation.<br>
<br>
Turf will be #109 So Cal Blend Supreme.<br>
Will need 15 x 14 foot roll. ', NULL, '2022-02-08 12:11:59', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4628897, '27 linear feet of 3” drain ', '2022-02-08 10:48:00', '2022-02-08 22:43:17', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4632425, 'FRONTYARD:
30 LF of 4” SDR @ $24 lineal foot

This is to keep water from spilling soil and mulch up and over wall, this will capture the rainwater from the surface.', NULL, '2022-02-11 11:53:35', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (4632458, '30 LF of French Drain at bottom of larger retaining wall, includes sock and 12” gravel bed. 
@$40/Lineal Foot', NULL, '2022-02-11 11:26:45', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4633064, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4633863, 'for roughly 45 linear feet by 1-2'' post installation of driveway apron and small curb ', NULL, '2022-02-09 15:19:04', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4634107, 'Credit for over-measurement of wall.  Wall is 29 LF long @ $155.50/LF.', NULL, '2022-02-11 11:27:55', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4634114, 'Over measurement of conduit. Credit $200.', NULL, '2022-02-11 11:28:07', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4634140, 'We need 7 LF of 8” CMU block to make wall slightly higher.
Stucco to match. 
', NULL, '2022-02-11 11:26:08', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4634949, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4634983, NULL, NULL, '2022-10-07 13:20:38', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4637149, 'waterproofing credit       $125.00<br>
returned plants               $195.00', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4638439, NULL, NULL, '2022-02-11 11:42:31', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4638655, '3- 5gal Westrangia 
1- 5gal. Pit. Golf ball', NULL, '2022-02-10 15:03:20', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4641088, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4641525, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4641527, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4642017, 'Plant design. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4642179, 'Cost difference from 48” box to 36” box. 
We could not find the 48” Liquid Amber so we are getting a 36” box PINK multi-trunk Crape Myrtle.', NULL, '2022-02-16 15:18:12', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4642547, NULL, NULL, '2022-02-16 09:29:20', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4645968, 'Remove tree and stump, additional soils <br>
Remove fence posts/entry gate ', NULL, '2022-02-14 12:15:15', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4645978, NULL, NULL, '2022-02-14 12:14:59', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4645984, NULL, NULL, '2022-02-14 12:14:41', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4645989, 'Henry''s tar', NULL, '2022-02-14 12:14:22', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4645998, '3" drain wrapped in sock buried in 12" gravel bed, exit and pop up into bed with Jades', NULL, '2022-02-14 12:13:57', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4646174, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4646177, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4646178, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4646179, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4646221, 'Removing chainlink fence,&nbsp;footings, ivy, 2 small trees 4 additional stumps', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4648649, NULL, NULL, '2022-02-15 12:45:42', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4648659, NULL, NULL, '2022-02-15 12:47:46', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4648671, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4648720, NULL, NULL, '2022-02-15 08:56:02', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4651781, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4656656, NULL, NULL, '2022-02-19 10:40:17', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4658642, 'We did not complete steps, Mikale was going to install and needed to return to Michigan for a family emergency. ', NULL, '2022-02-17 10:55:43', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4658691, NULL, NULL, '2022-02-17 11:45:33', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4660997, '<p>CREDIT  the following<br>
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
', NULL, '2022-02-19 10:39:59', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4667572, 'Add copper shield to ground cover areas in front and back for Dymondia silver carpet.', NULL, '2022-02-24 08:28:47', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4667665, 'We have 66 LF in contract and 70 LF is needed.
This is the cost difference.', NULL, '2022-02-24 08:29:02', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4667726, 'Stump removal 24" away from house 24" from current grade level according to foundation repair company.', NULL, '2022-02-21 15:56:41', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4667743, 'Pour approx. 20 LF of 2500 psi concrete at 2'' depth BELOW paver demo grade (6").

Concrete to be with #3 rebars at 2'' depth.

Total concrete 1.5 CY.

This is to protect the foundation of house and new pavers from being uplifted by neighbors tree.', NULL, '2022-04-12 09:26:45', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (4668141, '@$3.25/SF for 150 SF

Bender board lines around trees have changed (closer to trees now) so therefore, more grass is needed.', NULL, '2022-02-21 15:57:15', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4672078, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4672392, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4672413, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4683038, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4683361, 'We need a manual 6 station timer, currently there is a timer with 4 stations and we have 5 zones.', NULL, '2022-02-24 15:32:02', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4685895, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4686026, 'Not using steel, using vinyl. Adding 50 lf. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4686854, 'With water proofing ', NULL, '2022-02-27 23:26:09', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4686895, NULL, NULL, '2022-02-27 23:25:30', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4686900, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (4690904, 'Permits pulled by client for utilities.
We will schedule inspections and meet with inspector.', NULL, '2022-02-28 13:06:48', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4690913, 'Client installed dry wells already. 
Line item # 14 under "Drainage"', NULL, '2022-02-28 13:07:16', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4691014, '36" fire ring
46" firepit (contract has 40")', NULL, '2022-03-02 11:16:57', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4691040, NULL, NULL, '2022-03-02 11:16:48', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4692863, NULL, NULL, '2022-03-02 08:56:12', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4692866, NULL, NULL, '2022-03-02 08:55:51', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4695169, '17 linear feet, stepping up to follow grade 
1 course plus footing', NULL, '2022-03-01 12:16:23', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4695171, NULL, NULL, '2022-03-01 12:19:25', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4695172, NULL, NULL, '2022-03-01 12:19:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4695243, 'Credit for 
two medium size 2-head boulders and 
two large size 4-headed boulders.', NULL, '2022-03-03 07:54:41', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4696484, 'Smooth stucco 320 SF. (Upgrade from sanded stucco in contract)', NULL, '2022-04-11 22:16:07', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4697049, NULL, NULL, '2022-03-02 08:55:22', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4697371, 'This change order is for 8 tons of 3 to 6" rock. If more is needed, we would need to add more cost.', NULL, '2022-03-03 10:46:29', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4697392, 'Sealer to be wet look pbpro

Change order approved via text ', NULL, '2022-03-01 20:37:26', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4697403, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4697405, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4697409, 'Includes demo of DG in front area, soils between flagstones side/back areas<br>
Will add 2 yds of 50/50 soil<br>
<br>
16 flats of groundcover for front<br>
8 flats for side/back<br>
<br>
Mixing Creeping Thyme and Sedum Gold Moss for sunnier areas and Blue Star (Isotoma)<br>
Plus (1) 5 gallon Red Hibiscus ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4701053, NULL, NULL, '2022-03-02 11:12:17', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4701073, NULL, NULL, '2022-03-02 11:12:49', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4704197, NULL, NULL, '2022-03-03 07:54:17', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4709405, '5 path lights 
1- 150w. Transformer 

The client will text me the model number by Monday ', NULL, '2022-03-07 17:13:41', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4710764, 'Extra hauling of plant materials and rock removal. Bird of Paradise on side of home as well.', NULL, '2022-03-12 18:00:57', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4716435, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4716439, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4719770, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4723835, 'Additional 51 LF. Of 1½" poly line from gas meter to reduce ¾" for  house fireplace and 1¼"  to bbq and fire pit.', NULL, '2022-03-09 10:58:22', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4726306, NULL, NULL, '2022-03-09 20:44:00', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4726317, 'Demo out pavers and replace with new pavers', NULL, '2022-03-09 21:01:31', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4728347, 'Stump grinding along new wooden fence where large trees coming out.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4729515, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4731426, '55 LF. Of 1¼" conduit 3- #4 wires.', NULL, '2022-03-11 07:49:23', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4733339, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (4734624, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4738032, 'Design credit. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4738044, '7x $190.00= $1,330.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4742893, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4743606, 'See photo', NULL, NULL, 1, '2022-03-15 16:47:01', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (4746947, NULL, NULL, '2022-03-16 13:43:38', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4746965, NULL, NULL, '2022-03-16 13:43:23', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4746978, NULL, NULL, '2022-03-16 13:43:08', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4746993, NULL, NULL, '2022-03-16 13:42:52', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4748264, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4749788, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4750182, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4750308, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4751984, NULL, NULL, '2022-03-21 13:03:43', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4754920, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4754937, 'Materials (concrete plus river rock for all 4 sides of median)
Labor
Delivery of material to site', '2022-03-18 12:28:00', NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4759115, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4759293, '489 sqft of dual layers of water proofing<br>
trenching and recompaction<br>
applying roll on waterproofing and then applying subseal<br>
torching the waterproofing and roll on waterproofing<br>
compaction and cleaning<br>
$9650<br>
Retrofitting existing valve to drip netafilm system <br>
$800<br>
<br>
Total $10450', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4759963, NULL, NULL, '2022-03-21 13:03:31', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4765207, 'Additional sod ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (4765368, NULL, NULL, '2022-03-22 14:52:18', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4768589, 'Need to run new irrrigation laterals to bypass leaking under decking.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4768613, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4768685, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4768760, '12 CY of additional soil removal @ $130/CY
3 CY was in contract, we hauled 16 in total.', NULL, '2022-03-24 12:00:38', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4768809, 'Credit for one cantilever step 5’2” x 1’ w sand finish ', NULL, '2022-03-24 12:01:07', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4768879, '11 steps at 3’ now going to be 4’
3 steps at 5’2” now going to be 6’2”  (at bottom)

Adding 2” cantilever to each front facing side
Adding 14 SF of sand finish (no charge)
Adding 14 LF of additional forming (no charge)', NULL, '2022-03-29 08:07:54', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4769187, 'Adding concrete pour for extra 32 SF 
Sand finish 32 SF
Adding forming 55 SF

This is where the concrete poured in place pavers will be since we are not doing a 2nd bench ', NULL, '2022-03-29 08:07:41', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4772752, NULL, NULL, '2022-03-30 08:53:11', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4772780, NULL, NULL, '2022-03-30 08:53:57', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4773776, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4774139, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4783491, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4783493, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4785907, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4794830, '2 cubic yards of fabric and -1"del Rio please order&nbsp;<br>10 bags of 4-6"rock to be delivered by Verva&nbsp;<br>15 boulders to be delivered by Verva&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4795052, 'Adding curved bender board 21 LF for flower bed', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4795162, 'Installing flagstones in concrete and cutting turf around so that stones don''t wobble on top of turf.

$650 labor
$300 material', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4797972, 'Additional sf of grass. Field measurement. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4799272, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4801540, 'Raise Skimmer - Break out shell, reset. $1900<br />
Raise Overflow - Remove coping. Break out shell.  Move Overflow, Dowel and reconcrete shell.  $1200<br />
Raise Vacuum -  New Core shell, Patch old shell core.  Reinstall vacuum line - $700<br />
Add 3 LED lights - run conduit and lights back to controller.  Core sheet for Niche Globrite (does not include lights)  $1200<br />
Remove existing pool light and patch shell - $250<br />
Lower trenching on pool equipment for elevator 2 1/2 feet deep and continue under grade beam. - $900<br />
<br />
Tiles having issues. All pool tile work outside of original contract to be future assessed.  Not included in this change order. ', NULL, '2022-11-09 14:12:15', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (4802565, 'Got it, thanks! 

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
', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4805252, NULL, NULL, '2022-04-04 13:57:11', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4805825, 'adding 1 - 5 gallon rosemary<br>
adding 1 - 1 gallon thyme', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4809593, 'Wash with saw cutting concrete on contract. ', NULL, '2023-04-05 17:55:10', NULL, NULL, NULL, 'Jorge Flores', 'lost'),
  (4813659, 'Adding 3/4" polyline to reach firepit.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4813736, 'Grass and soil on side yard is very high. We only have 3" removal BELOW soil level. Above soil level is another 5"-8" average which we need to also remove.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4813859, 'Need additional bender board with curved lines.
190 LF was in contact
Measured 260 LF 
Difference is 70 @ discounted price $11.50', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4813888, 'Adding 6" more of del Rio gravel all the way around fence area as to avoid concrete fence footings.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4814973, 'Credit for not doing waterproofing.', NULL, '2022-04-06 19:20:30', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4816151, '$200 credit!! ', NULL, NULL, 1, '2022-04-06 19:21:21', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (4818143, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4818148, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4818606, 'Two new valves with electrical ran to irrigation timer at 1450 each 
40 yards of brown shredded mulch 6200
1600 Sq ft of jute fabric at 1.50 a Sq ft
$2400
Total 11500', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (4822397, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4823710, '280 sq feet of turf 
Will will use existing turf 
Need nails and infield 
Road base 

280 sq. Dg 

', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4827536, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4828596, 'Dg path is actually 440sqft <br>
240 linear feet of black plastic bender board', NULL, '2022-04-12 12:16:43', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4828602, 'I can give you a $200 credit towards the irrigation, so the added zone will only be 665.00, a Netafim zone is usually $865/zone.', NULL, '2022-04-14 13:36:43', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4828618, NULL, NULL, '2022-04-13 14:06:48', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (4828627, NULL, NULL, '2022-04-12 12:12:24', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (4829216, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4830081, NULL, NULL, '2022-04-11 22:15:51', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4830083, NULL, NULL, '2022-04-11 22:15:38', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4830085, NULL, NULL, '2022-04-11 22:15:12', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4830088, NULL, NULL, '2022-04-11 22:14:59', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4830103, NULL, NULL, '2022-04-11 22:14:45', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4830105, NULL, NULL, '2022-04-11 22:14:22', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4831006, NULL, NULL, '2022-04-12 07:37:06', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4832096, 'Adding one zone', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4832202, 'Adding 55 LF of black bender board to front yard', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4832210, 'Stake for parkway tree', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4832217, 'Adding 118 SF to kurapia measurements.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4834528, 'Our included amount for vase was $500 ( including tax). The vase chosen is $799. Upcharge cost is $299 plus tax.', NULL, NULL, 1, '2022-04-12 16:00:48', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (4834947, '4 additional linear feet of Step Build  $212.00<br>
1 additinal step light $225.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4834963, 'Additional turf with upgrade $1,626.00<br>
<br>
Credits:  <br>
Mulch 200 SF X $1.75= -$350.00<br>
Plant reduced see attached invoices  -$841.00<br>
TOTAL CHANGE ORDER  $435.00<br>
 ', NULL, NULL, 1, '2022-04-12 19:12:44', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (4834995, 'Plants not used<br>
 <br>Hi Mo and Christopher,<div style="font-size: 12.8px">This would be the final count:</div><div style="font-size: 12.8px">2 fruit trees, even at the size of 5 gallon, they are at a higher price  $100.00 each,  $200.00</div><div style="font-size: 12.8px">29 @5 gallon plants  X $43.50=  $1,261.50</div><div style="font-size: 12.8px">22 @ 1 gallon X $21.50= $473.00</div><div style="font-size: 12.8px">Total planted:  $1,934.50</div><div style="font-size: 12.8px">In Change order:  $2,290.00</div><div style="font-size: 12.8px">Credit in difference $355.50</div>', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4837107, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4839043, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4839047, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4840676, NULL, NULL, '2022-04-14 13:35:11', NULL, NULL, NULL, 'Jorge Flores', 'lost'),
  (4842951, 'demo existing driveway<br>
install new pavement to match existing<br>
approx 360sqft', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4843280, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4847699, 'Extending drainage out towards side of property&nbsp;', NULL, '2022-04-18 09:08:29', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4849824, 'Moving main water line from outside of gate to inside of gate next to A/C unit. 33 LF of 3/4" COPPER water line.<br>
Jorge explained on site why this is needed. ', NULL, '2022-04-20 21:00:37', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4849848, 'adding 3 LF to built in bench nearest sliding doors. This is to cut out and cover up large crack in existing wall.  <br>
<br>
Total seated bench area will be 9 LF.<br>
8" CMU block will be use for the backing of the bench. This backing will meet other retaining wall so there is not an awkward space between walls.', NULL, '2022-04-20 21:02:56', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4849859, '152 SF of waterproofing behind armrests so water does not sit and crack new stucco.', NULL, '2022-04-20 21:03:59', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4849862, 'CREDIT!<br>
<br>
24 SF of Flagstone we are NOT installing.  This was if we were to demo to the bottom of the existing wall.  We are not doing this.', NULL, '2022-04-20 21:01:52', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4849866, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (4849875, 'Credit for drainage, Jorge said we will be good with one drain pipe from wall to existing drain grate (which takes it out to the street).', NULL, '2022-04-20 21:01:36', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4849894, 'Smooth stucco entire upper back wall approx. 148 SF. <br>
This will look better than what we have in contract (which is just stucco the backing of the new benches).  This way the back wall will have the same texture and look new.', NULL, '2022-04-20 21:02:29', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4849968, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4850395, 'upgrade to $20 per light for Universal Opal Mica - (3) = $60<br>
2 NEW lights added - Poppy Post Opal $220/each', NULL, '2022-04-19 14:33:43', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4852711, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4852716, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4852733, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4855356, 'Current grade higher towards sidewalk including terraced area. Requires add’l demo, grading and hauling', NULL, '2022-05-02 09:48:03', NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (4856152, NULL, NULL, '2022-04-20 08:29:05', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4857328, 'Remove 2 vines and remove + haul 2 CY soil behind bbq area.
This will allow soil to stay in beds and not spill over.', NULL, '2022-04-22 10:30:59', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4858256, NULL, NULL, '2022-04-22 10:30:45', 2, '2022-04-20 11:58:39', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (4858270, 'Remove old Playhouse steps- NO CHARGE', NULL, '2022-04-22 10:30:30', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4858708, 'On side of house

Demo 130 SF 3'' x 43'' to 6"-7" below grade
Remove brown bender board and rocks
Pour 2500 psi concrete for 130 SF
Sand finish
', NULL, '2022-04-22 10:30:04', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4861805, '24" x 24" stump grind.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Edison will remove entire tree as per client.</div></div>', NULL, '2022-04-22 10:29:40', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4867263, NULL, NULL, '2022-05-02 09:47:35', NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (4867499, NULL, NULL, '2022-04-28 17:06:52', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4870170, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4874771, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (4874808, 'Removing extra 7 CY of soil and put it in the back of property near walls.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4874832, 'Credit for 2 catch basins', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4874858, 'Adding 3 drain grates (in concrete area instead of catch basins) @$65/each', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (4874941, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4876894, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4876909, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4879559, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4880851, 'Old measurements for gopher mesh - 3,900 SF + 108 under veg beds.<br>
This old measurement was for planting areas, veg beds, and meadow, which for the planting areas, we cannot do with the roll out mesh.<br>
We need baskets for the plants (see separate change order for baskets).<br>
<br>
NEW measurement is 5,690 SF<br>
This NEW measurement includes meadow, sod, under veg beds and all D.G. areas since we found gopher holes in many DG areas.<br>
<br>
COST is the difference@ $2/SF.', NULL, '2022-04-28 12:28:28', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4880949, '<br>
8 - 15gallon wire baskets @ $25/each = $200<br>
<br>
UPDATED we are only using baskets on Citrus and please wrap wire mesh on base of 36" Olive tree.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">No baskets for transplants, for 36" box tree use wire mesh to wrap around base of tree!!!</div></div>', NULL, '2022-05-02 23:46:38', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4881092, 'Karelaine is updating the planting plan.&nbsp; We are removing (1) 15g citrus from the contract.', NULL, '2022-04-28 12:28:59', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4881458, '6 drain grates (tan/brown) with 3" PVC perforated holes with gravel 16" deep in Decomposed Granite area.<br>
<br>
Time and material.<br>
 ', NULL, '2022-05-20 10:36:39', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4881748, 'We have 635 LF in our contract and we used 600 LF.<br>
<br>
Credit is for 35 LF.', NULL, '2022-04-30 23:46:21', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4881756, '200 SF of Marathon II - $750<br>
<br>
We initially had seed in the contract + amendments for this area (complementary seed + $500 in amendments).<br>
<br>
Cost difference is $250<br>
<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Total amount of Marathon II is 910 SF.</div></div>', NULL, '2022-04-28 12:29:23', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4881764, '<p>ORIGINAL contract:<br>
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
<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">see notes and new planting plan in CURRENT DESIGN</div></div>', NULL, '2022-04-28 12:29:46', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4881765, 'we had 10 path lights in front and we are only installing 8.<br>
<br>
Lights are $280 each.', NULL, '2022-05-02 23:46:08', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4882684, 'Adding (4) additional lights from original count of 10', NULL, '2022-05-02 09:46:29', NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (4885252, 'Add 6 LF step down near A/C unit.
Hand mix concrete.
Light broom finish.
', NULL, '2022-04-28 17:06:23', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4885895, NULL, NULL, '2022-05-24 21:59:10', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4885981, NULL, NULL, '2022-04-28 21:26:43', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4888484, 'No soil is included for backfilling ', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4894180, 'Client requested change order:<br>
<br>
268 SF of stucco on lower retaining wall from gate to new timber retaining wall.<br>
Prep for stucco, removing paint, etc.<br>
Color to be chosen from swatch with client.', NULL, '2022-05-02 15:53:36', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4895062, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4895064, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4899315, 'Remove one stone and pave around the rest 
Cancel irrigation around stone', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4899640, 'We did not use 100 SF of potting soil in pots near trellis.<br>
credit for planting vines', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4900589, '
> Hi,
> It is getting cleaned out!
> Here are the actual finished counts:
> Wall got longer by 2.5 feet. $395.00
> Reworked extra excavation ramp area $300.00.
> Credit of 10 linear feet of step build --$600.00
> Price difference $95.00
>
> New apron. We will  need to break out an additional foot or 2 in so that we can feather a nice slope in. $561.14 it will look much better than just adding to the end.', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4901635, '9 linear feet of brick bullnose and 120 Sq ft of Concrete 6 inches ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (4903044, 'Leftover sod from front yard to be installed in backyard', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (4904245, '120 SF in the front side yard - after the concrete pour and up to the other mulch area (where little bench is).<br>
<br>
Mulch is Premium Walk-on to match.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">NO WEED BARRIER</div></div>', NULL, '2022-05-05 12:22:53', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4904256, '3,430 SF of brown shredded mulch @ 2" deep.<br><br>I calculated 21 Cubic Yards for this cost.<br>
&nbsp;<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">this wasn''t on contract, we added and i don''t think anyone caught this!

We are doing 2" deep. 

NO weed barrier</div></div>', NULL, '2022-05-07 15:57:58', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4907961, '200 SF of brown shredded mulch at 2-3" depth.
Include jute nearest Candelabra Cacti to protect erosion.', NULL, '2022-05-05 15:02:40', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4907983, 'Didn''t use 3 Mexican fence posts', NULL, '2022-05-05 15:02:19', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4908524, NULL, NULL, '2022-05-09 07:51:59', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4912256, '5lf reduction in BBQ size. ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (4912457, '1- run ³/4"  conduit for cat7 wire.      $1,200.
2- run 1" conduit (extra) for future.  $1,200.

No wire.


Total $2,400.
', NULL, '2022-05-09 14:17:37', NULL, NULL, NULL, 'Jorge Flores', 'lost'),
  (4914858, '+ 500sqft', NULL, '2022-05-09 10:26:23', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4914871, '+ 350sqft', NULL, '2022-05-09 10:26:54', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4914877, 'Demo and Disposal', '2022-05-09 10:06:00', '2022-05-09 10:27:25', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4915405, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4915417, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4915830, NULL, NULL, '2022-05-09 15:18:39', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4916542, 'Need 2 hours to update design, decrease plants by 25%.<br>
<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">very hard to get him to sign off on design, keeps changing mind about things. Very sweet couple, but cannot make a decision.</div></div>', NULL, '2022-05-14 14:29:49', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4916686, '103sqft', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4916691, '68 linear feet', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4916901, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (4919458, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (4919485, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (4919534, NULL, NULL, '2022-05-10 17:50:18', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4919547, 'Replacing concrete behind grill', NULL, '2022-05-10 17:49:24', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4921612, 'Running lateral lines to each zone, adding UV line around perimeter to back of wall ', NULL, '2022-05-10 15:08:17', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4921627, NULL, NULL, '2022-05-11 18:58:13', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4921629, NULL, NULL, '2022-05-10 15:17:03', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4921632, NULL, NULL, '2022-05-10 15:05:33', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4921838, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4922034, '3x12 dg and fabric. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4922084, 'v<br>
Total wall credit $152.00<br>
Additional Step build $500.00<br>
Rock instead of mulch $607.50<br>
Total:  $955.50 additional', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4922088, 'Taking out poured in place curb by road', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4925611, NULL, NULL, '2022-05-17 14:01:41', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4933237, NULL, NULL, '2022-05-20 16:49:18', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4935687, 'We need 240 SF more of grass. I have given a discounted cost @ $3.25 SF.

Total grass installed 2,440 SF
Total in contract plus change order 2,200 SF', NULL, '2022-05-20 10:37:14', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4937225, NULL, NULL, '2022-05-16 07:29:54', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4937258, NULL, NULL, '2022-05-16 07:27:24', 1, '2022-05-16 07:20:37', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (4939382, NULL, NULL, NULL, 1, '2022-05-16 12:33:19', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (4939436, '8lf x $25= $200.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4939463, '47 sf x $14.35= $674.45', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4939515, 'Wall. + 3 lf. + 12" higher', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4939545, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4939562, 'Difference in front yard order', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4939577, 'Reduced rock amount 192x $5.00= $960.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4939588, '154 sf x $1.85= $284.90', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4941740, NULL, NULL, '2022-05-17 14:01:56', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4941746, NULL, NULL, '2022-05-17 14:02:27', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4942842, 'Add''l Bender board will be calculated on site during job walk<br>
$8/linear foot ', NULL, '2022-05-18 19:48:19', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4944479, NULL, NULL, '2022-06-03 22:17:00', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (4945572, 'Additional riser and border around porch, curb around trash cans ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4945573, 'Channel drain in front of garage ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4953462, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4953887, 'Climbing 8 trees 60 ft. and installing up lights with tree straps.<br>
 ', NULL, '2022-05-20 10:36:58', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4953895, '(1) 24" Palo Verde tree', NULL, '2022-05-21 09:35:07', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4954096, '(1) 1''4" x 1''4" x 3''3" pilaster with Eco Outdoor veneer in Bodega', NULL, '2022-05-21 09:36:52', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4954534, 'Lafitte was in contract, using Catalina grana instead. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4954535, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4955378, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4955384, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4955393, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4957833, '<br>
(1)  BATTEN 2" x 6" x 18''6" - ASPEN<br>
(1) BATTEN BASE/BRACKET 2" x 2" x 18''6" - ASPEN<br>
(4) BATTEN END MOUNT CLIP -  MILL FINISH<br>
<br>
All cuts and installation included in costs.', NULL, '2022-05-21 09:34:29', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (4957834, '366 LF of BK-E26-BK-V Bistro Lights with LED bulbs
366 LF of Suspension galvanized cable for bistro string
8 Galvanized cable clamps
183 - 8” black cable ties (120 Lb. Test)
All labor included in cost (ladder, zip ties every 2ft, etc).<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Cost is @ $14.40/linear foot (for credit)</div></div>', NULL, NULL, 1, '2022-05-20 17:30:08', 'Nicole Antoine', 'Nicole Antoine', 'sold'),
  (4958127, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4958128, 'Succulents, Blue Hibiscus, grasses
25 total', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4960275, 'Trim back for (6) cedar beds.<br>
Incudes installation.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Carter - please call Christine (or Camille) at 1-800-807-3404 to place order.</div></div>', NULL, '2022-05-31 14:02:12', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (4962693, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4962707, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4965550, '396 Sq ft of rtf turf for backyard. ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (4965770, '897 sf
Priced at $14.50 a SF

Belgard Dublin Cobble 4 piece set  +  Polymeric Sand 
Dublin Cobble + $3.45 + Polymeric Sand $1

Priced at $18.95 X 897= $16,998.15  $13,006.70=

Change Order $3,991.45

Fire Pit in Belgard j with Belgard Belaire cap  + $299.00

block wall seat in Belgard Weston Wall block with Belgard   Belaire cap + $375.00

$4,665.45



', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4965980, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4969296, NULL, NULL, '2022-05-27 09:59:44', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4975470, 'Upgrade to inline valves     400<br>
Sand setting existing paver steppers in sod 160<br>
<br>
Total 560', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (4985320, '70 linear feet of main line running to backyard.', NULL, '2022-06-01 08:42:33', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (4986328, 'Additional drainage to downspouts behind house 65 linear feet x $25.00= $1,625.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4989689, NULL, NULL, '2022-06-02 08:20:08', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4990073, NULL, NULL, '2022-06-02 08:19:43', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (4991500, 'Please see email sent to Joe and Jorge and Jorge''s daily log', NULL, '2022-06-06 08:18:36', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (4993088, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (4994470, NULL, NULL, '2022-06-03 22:16:31', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4998772, NULL, NULL, '2022-06-04 06:42:54', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4998773, NULL, NULL, '2022-06-15 07:54:06', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4998777, NULL, NULL, '2022-06-04 06:44:14', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (4998783, '45 linear feet of trenched electric&nbsp;', NULL, '2022-06-04 06:43:48', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5000466, 'Dig trenches<br>
Remove old pipe<br>
Install new pvc<br>
Rewire<br>
Backfill and compact.', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (5001117, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5002765, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5003204, 'From dana:<br>
<span style="font-size: 11pt"><span style="font-family: Calibri, sans-serif">I did (5) hours worth of design work for this portion, that should be billed to him at $150/hour.  </span></span><br>
 ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5003599, 'Additional main line 38 feet<br>
Trenching<br>
Going under wall', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (5003619, NULL, NULL, '2022-07-09 09:11:03', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (5007506, 'For a total of 3 uplights, 6 steplights, 4 path. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5007527, '2 steps at 4 lf wide. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5007544, '17 lf X $135.00= $2,295.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5008899, 'Design agreement states $500 discount towards installation.', NULL, '2022-06-08 09:28:50', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5010659, 'Not doing sand finish, we will do broom finish.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5010671, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5010678, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5010711, 'Repair with (6) 8" CMU blocks with brick cap', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5010724, 'Add 10.7 LF of 6" CMU block', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5013099, 'We cannot get the 24” box olive trees.  We can get the 15gallons so this is a credit for the difference.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5013120, 'Credit for not getting 5 citrus trees at $315/each
Charge for (3) 15gallons and (1) 24” box olive.
Cost difference is this credit. ', NULL, '2022-06-16 10:46:50', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5014688, '10- PS 501B 2.5 W.
3-   FL 117B  5.   W.
2-   FL 105B. 5.   W.
1- 300w transformer 
ALL IN BRONZE. 
', NULL, '2022-06-09 13:58:16', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5014692, 'Replaced smart timer with manual timer', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5017749, 'Remove one (15g) roses from front planter bed and haul.
Add 1 (5g) rose to planting plan.', NULL, '2022-06-10 07:38:14', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5020873, '60 sf x $5.5, area in driveway planter. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5020876, '28 5 gallon plants x $43.50
1 24" box $385.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5020885, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5023305, 'Add subsurface irrigation to parkway.', NULL, '2022-06-13 09:54:30', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (5024854, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5024973, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5031369, 'Change to drip ', NULL, '2022-06-15 07:54:28', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5032484, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5032500, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5032508, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5033430, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5034179, '(6) Day lily in yellow 1G
(2) Gaura hot pink -5G
(9) Lavender Provence 5G', NULL, '2022-06-15 14:32:09', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5036165, NULL, NULL, '2022-06-16 10:22:05', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5037450, 'Valve replace only. ', NULL, '2022-06-16 11:22:24', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5040851, '3 - 5g bird of paradise', NULL, '2022-06-17 15:17:03', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5042780, '10 man days $6000<br>
Discount Given client $600<br>
<br>
Total labor $5400', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (5044140, NULL, NULL, '2022-06-20 11:00:38', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5044149, NULL, NULL, '2022-06-20 11:03:14', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5044158, NULL, NULL, '2022-06-20 11:12:00', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5044162, NULL, NULL, '2022-06-20 10:59:24', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5044175, NULL, NULL, '2022-06-20 11:00:07', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5045521, NULL, NULL, '2022-06-20 11:59:24', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5045537, NULL, NULL, '2022-06-21 11:10:54', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5045577, '3- gal. Electric pink cordyline  $130.50
6- gal Peter pan Agapanthus  $129', NULL, '2022-06-20 11:58:47', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5045673, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5045733, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5045774, NULL, NULL, '2022-06-21 23:45:59', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5045783, NULL, NULL, '2022-06-21 23:45:25', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5045795, NULL, NULL, '2022-06-21 23:45:40', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5045861, NULL, NULL, '2022-06-21 11:10:14', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5046654, 'Lighting credit', NULL, NULL, NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (5047327, NULL, NULL, '2022-06-28 16:09:30', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5047486, 'Fire pit to be 4x4 -18" high in grey charcoal rustic wall with cap<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Change order approved via text</div></div>', NULL, '2022-06-24 10:21:57', 1, '2022-06-28 19:10:36', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (5047488, '150 LF. AT 18" DEEP<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Change order approved via text</div></div>', NULL, NULL, 1, '2022-06-28 19:09:00', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (5047498, '191 LF. Edger to be 4x12 orco paver
On all planters in front yard and 3 in the back yard<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Change order approved via text</div></div>', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5047504, '168 LF 4 courses includes cap
12"x12" footings <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Change order approved via text</div></div>', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5047509, 'Pavers to be angulus grey charcoal 4 piece large @ 13.75 per square feet.
<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Change orders approved via text</div></div>', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5047518, '400 square feet orco paver 4x12 in manor
In a herringbone pattern 
@$16.25 with a dark charcoal boarder<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Change order approved via text</div></div>', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5047536, '16 LF to match existing wall with wall cap
8x8x16 tan wall with cap
2- 3 courses <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Change order approved via text</div></div>', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5047541, 'Bull nose to be dark grey charcoal ', NULL, '2022-06-24 10:19:33', NULL, NULL, NULL, 'Jorge Flores', 'lost'),
  (5049642, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5052115, NULL, NULL, '2022-06-22 06:40:00', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5052116, NULL, NULL, '2022-06-22 06:39:44', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5052119, NULL, NULL, '2022-06-22 06:39:26', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5052321, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5056474, 'New measurement is 240 SF.
Credit at $14.40/lf includes wire, clips, zip ties, and labor.', NULL, '2022-06-22 22:26:07', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5056493, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5058096, NULL, NULL, '2022-06-25 01:12:37', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5058835, NULL, NULL, '2022-06-29 14:20:38', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5059185, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (5061892, NULL, NULL, '2022-06-24 07:36:20', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5062162, 'Remove 7" of /grade soils (72sq. Feet) Area Behind trees<br>
Total concrete removal was 1,491 sq feet including pad by pool and extra concrete to shed side of driveway', NULL, '2022-06-27 20:00:14', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5062174, 'Install 902 square feet of additional turf.  Includes two additional walkways that were changed from stone.<br>
Plus upgrade turf to Synlawn 347 <br>
<br>
 ', NULL, '2022-06-28 21:01:05', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5062191, '40 lf timber wall 4500<br>Additional steps 900<br>Two additional lights 480<br>New concrete walkway 150 Sq ft 1750<br>Total 7630', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5062193, 'Add more Delta No Mow Grass - Native Variety', NULL, '2022-06-28 21:04:22', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5062332, NULL, NULL, '2022-06-27 20:03:07', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5062340, 'Cut out sections of existing Wall.<br>
<br>
Dowel into existing wall block <br>
<br>
Epoxy in rebar connectors<br>
<br>
Install 5 18x18 block reinforcment columns<br>
<br>
<br>
<br>
 ', NULL, '2022-06-27 19:57:31', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5063603, 'We had in contract (2) 36" box Magnolias<br>
We installed (3) 24" box Palo verdes.<br>
<br>
This is the credit for the difference.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5063637, 'As per designer Karelaine''s email<br>
ADDING (2) 5g Lavandula angustifolia to the 2 cast iron plants near the patio in front of the north wall.', NULL, '2022-06-25 01:10:41', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5063872, NULL, NULL, '2022-06-28 13:41:11', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (5063884, 'Install new rough in for electrical circuit out by play structure.<br>
<br>
Roughly 50 linear. Breakout concrete curb.<br>
<br>
 ', NULL, '2022-06-27 19:56:46', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (5063888, 'Install new Rachio timer $450<br>
<br>
Instal new exterior outlet $150', NULL, '2022-06-27 19:56:28', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (5063897, 'Install weed barrier and extended section of mulching next to shed driveway 110 sq feet.&nbsp; No plants or cardboard sheeting.', NULL, '2022-06-27 19:56:08', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (5064122, '179 linear feet included in contract.  New design requires 365 linear feet. 186 linear feet addtional needed.<br>
<br>
 ', NULL, '2022-06-27 19:55:32', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (5065915, 'Cardboard, weed barrier, mulching beds.', NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5069108, '. Install existing steppers near raised planter and plant (1) flat of groundcover between steppers (flat is already on site) and move planters with vines <b>$100.00 </b><br>
2. Install (2) new drip zones for pool area plants/shrubs, use netafim soaker hose with copper shield and connect to existing timer <b>$2130.00</b> (if it''s only 1 zone will give a credit for $1065.00)<br>
3. Plant (3) 5 gallon Vines for pergola posts (recommending purple trumpet vine or Clematis <b>$135.00</b><br>
4. Plant (10) 15 gallon Pittosporum ''Silver Sheen'' against wall behind pergola to screen neighbors yard <b>$1500.00</b><br>
5. Plant (50) 1 gallon mix of perennials for front bed near driveway (3 Asparagus Ferns, 3 Lomandra ''Breeze) and remaining (44) plants for bed around pool area to fill into empty spaces.  (suggested plants for backyard: Asparagus Fern, Lomandra Breeze,  Dianella ''Little Rev'',Thrift Plant, Coral Bells, Hummingbird Sage, Mexican Petunia) <b>$1075.00</b><br>
6. Plant (10) 1 gallon orange daylilies to the left of pool pergola near fence to fill into spaces <b>$215.00</b><br>
7. Plant (6) 4" succulents for pots on shelf  <b>$60.00</b><br>
8. Plant placement (Dana) $100/hour (not included in change order pricing, will be added after plants have been placed)', NULL, '2022-06-27 17:28:38', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5070377, 'One concrete stepper 120

New valves with one check valve 450

Upgraded size on 6 red aloe to 5 gallon 120
', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5071853, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5071931, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5071939, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5071985, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5072829, NULL, NULL, '2022-06-29 18:42:20', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5073518, 'Turf to be socal blend -190
Emerald Green/ Lime Green/Field Green 2"', NULL, '2022-06-28 15:47:09', 1, '2022-06-28 15:29:41', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (5073546, 'Stump grind will need to be done very carefully due to swimming pool line will also need plywood to protect fencing ', NULL, '2022-06-28 15:46:32', 2, '2022-06-28 15:40:10', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (5073764, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5073817, NULL, NULL, '2022-06-29 14:07:29', NULL, NULL, NULL, 'Jorge Flores', 'lost'),
  (5073842, NULL, NULL, '2022-06-29 14:07:12', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (5073895, NULL, NULL, '2022-06-29 09:31:19', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5077336, NULL, NULL, '2022-06-29 14:05:50', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5082686, NULL, NULL, '2022-06-30 16:50:13', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5084448, '4 man days with 33% discount. <br>
<br>
$1,320', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5089476, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5090383, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5090872, 'Manila Mango originally priced at 24" box and we could only get a 15g. This is cost difference.', NULL, '2022-07-06 14:16:31', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5092558, 'Credit for 9 FX Path lights that are now Lightcraft - MATERIAL only.', NULL, '2022-07-06 14:16:49', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5092977, NULL, NULL, '2022-07-06 13:56:30', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5092987, NULL, NULL, '2022-07-06 13:58:22', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5095341, '840 Sq ft of turf
95 linear feet of benderboard

', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5096768, 'Flats of blue fescue - $1420<br>
<br>
3 zones of irrigation - $850 per zone total of - $2550<br>
<br>
Grass demo - $600', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (5096787, 'Added these items back into project from original bid.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (5096791, 'Added pavers back in $5,082<br>
Added firepit back in $3,400', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (5096971, 'Demo,<br>
Grade,<br>
Form<br>
Pour<br>
Finish', NULL, '2022-07-07 09:42:50', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (5102454, '<strong>FIREPIT </strong><br>
-20 linear feet of gas line <br>
-Double burner <br>
-Gas Key <br>
-(2) 18" X 2''  high wall return to enclose some of the firepit <br>
-Brick work for the top of the pit <br>
-Cap <br>
 ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5102457, '(8) 5 gallon shrubs', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5102966, 'Adding:<br>
2'' Concrete countertop - $630<br>
3'' CMU Block - $1,380<br>
2 outlets - @ $90/each = $180', NULL, '2022-07-08 14:30:30', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5102979, '14 LF 3/4" conduit - $280<br>
7 LF wire only - $20', NULL, '2022-07-08 14:28:20', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5102986, NULL, NULL, '2022-07-08 14:29:29', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5102990, NULL, NULL, '2022-07-08 14:29:12', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5103000, 'At both ends of turf area, at gates we will need bender board to hold in turf.  Another little piece is needed near planter bed (called out in the design).<br>
Three areas need 5 LF of bender board.', NULL, '2022-07-08 14:28:49', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5103015, '232 LF of 3" SDR pvc drain pipe<br>
9 drain grates<br>
2 downspout connections<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Jorge, Carlos and Nicole to explain drainage issue to client.</div></div>', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5103154, NULL, NULL, '2022-07-11 00:54:35', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5105998, 'Adding one more grass zone', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5106086, 'We had black metal in contract, switching ALL bender board to Brown plastic 1x6. 

Renders a credit.', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5106133, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5106683, 'Complementary per Jorge and Nicole. $75/each value ', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5108527, 'NOTICE : Turf rolls of the same name, blend, color and weight vary by dye lot. This can result in the same turf looking different if they were installed from different batches. Picture Build recommends replacing the all the turf to guarantee consistency in appearance and texture. <br>
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
 ', NULL, '2022-07-18 13:02:21', NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5112658, NULL, NULL, '2022-07-12 16:28:53', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5114272, '3-15g. Podocarpus 
1- 1gal. Rosemary 
1- 5gal. Olive ', NULL, '2022-07-13 08:45:03', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5114820, 'Demo existing turf of 1286sqft<br>
Subsurface grading as needed<br>
Install 1286 of turf - to match existing<br>
Install infill<br>
<br>
Total : $10,400.00<br>
<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'pending'),
  (5116487, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5117597, '2 1/2 hours of plant placement/selections @ $150/hour as listed on estimate<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5117607, '2 hours @ $100/hour&nbsp;', NULL, '2022-07-14 09:51:34', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5117962, '(6) 4" Summer squash and zucchini plants<br>
(4) 4" Cauliflower plants', NULL, '2022-07-14 09:51:04', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5119915, '<span style="font-family: "Century Gothic", sans-serif; font-size: 12pt">Planting<br>
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
 ', NULL, '2022-07-14 14:19:08', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (5120299, 'Add additional turf to one putting green 120 Sq ft<br />
<br />
30 1 gallon plants<br />
30 5 gallon plants<br />
60 linear feet of benderboard.<br />
2 24 in box trees', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (5122952, '<br>
1. The price included the artificial turf in the 3 measured areas and will be the same turf as installed in the backyard.<br>
2.  All irrigation included<br>
3. 3 new trees.  I believe we agreed to the 24” box fruitless pear and a 15” box for both the hot pink crape myrtle tree and a new tree (can’t remember the name) that matches the one close to the neighbors house by the property line where our previous one blew over)<br>
4.  New steel edging to match the backyard to separate our lawn with the neighbors.<br>
5.  Flex edging for all planters', NULL, '2022-07-18 15:16:55', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (5122965, 'Change Lime from a 15 gallon to a 5 gallon.&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'pending'),
  (5124395, '- 10 (1 gallon) Eliljah Blue Fescue<br>
- connect new plants to irrigation drip line (time + material)', NULL, '2022-07-20 22:02:40', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5124560, 'Add two more path lights to the back.&nbsp;', NULL, '2022-07-18 15:16:09', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (5124911, 'Remove existing sod/soil 3" below final grade<br>
Install mix of smaller Mexican Beach pebbles as "river" and larger beach pebbles to anchor each side<br>
Area is approx 80" x 8"', NULL, '2022-07-15 14:11:47', NULL, NULL, NULL, 'Dana Weinroth', 'lost'),
  (5125869, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5125908, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5125934, NULL, NULL, '2022-07-16 16:12:57', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5127264, NULL, NULL, '2022-07-18 07:32:11', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5129753, 'Additional wall amount during walkthrough 575<br>
 ', NULL, '2022-07-18 14:57:42', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5129762, '24 linear feet of conduit 480<br>
one weather resistant outlet 90<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">24 linear feet of conduit 480
one weather resistant outlet 90</div></div>', NULL, '2022-07-18 14:56:56', NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5134776, 'Add 432 linear feet of main water line.  Buried 12 inches. Then backfill and recompact.  Add in Spigots.<br>
Normally $27/ft per price list.  Good client discount to $21 per foot.  $9072.<br>
<br>
Remove gravel in slippery section. Add Timber for 24 linear feet of side retainment.  Then add (3) 4 foot steps across.  $4375.<br>
Add gopher mesh. Backfill with base to make level walking pads and compact about 4-5 yards.  Reinstall gravel  $935<br>
<br>
Repair other steps and add gopher mesh to bottom steps.  $550<br>
+1 irrigation valve with one stub up +200<br>
<br>
 ', NULL, '2022-07-19 15:30:42', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (5134976, 'Pavers have settled due to water will need further assessment after raising the pavers.
1-we will need lift about 100 square feet of pavers 

2- remove sand and road base to test soil compactation if soil is not compacted we would need to compact soil in lifts, add road base, sand and install pavers with a 1.5 pitch away from the house. ( soil compactation will be an additional $640. Or more pending on how low we will need to compact.)

', NULL, '2022-07-28 08:35:18', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5136592, NULL, NULL, '2022-07-20 09:41:29', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5136598, NULL, NULL, '2022-07-20 09:47:20', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5136609, 'In the original estimate, 260 linear feet of bender board was factored into the total cost of the DG pathways.  <br>
We are still using bender board to separate the turf from mulched areas', NULL, '2022-07-20 09:46:57', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5136615, NULL, NULL, '2022-07-20 09:46:28', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5136648, NULL, NULL, '2022-07-20 09:46:13', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5136677, NULL, NULL, '2022-07-20 09:45:39', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5138431, 'main line repair front yard $300<br>
<br>
 ', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5139837, NULL, NULL, '2022-07-20 17:25:21', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5144002, NULL, NULL, '2022-07-22 09:19:49', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5144056, '6- one gal. Garlic
12- one gal. Daylilies
12- five gal. Iceberg rose''s 
3- 15 gal. Phoenix Roebeleni
4- 15 gal. Ligustrum 

6 bags 2-3" river rock and 4 bags 3/8 with weed fabric 

300 square feet of brown shredded mulch 

', NULL, '2022-07-22 09:19:31', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5144082, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5144171, '8 5 gallon plants<br>
4 1 gallon plants<br>
<br>
434 credit issued', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5144175, '4 1 gallon plants 21.50 each<br>
2 5 gallon plants 43.50 each <br>
1 300w multitap low voltage transformer $437<br>
<br>
Total 610', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5144218, NULL, NULL, '2022-07-22 09:00:31', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5146566, '5 agave striata  360<br>
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
 ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5147142, 'Some of the plants we could not get in the sizes in the contract.  Those plants gave a credit as detailed below:<br>
<br>
We moved 4 15 gallon down to 5 gallons = $424 credit<br>
We moved 5 5 gallon to 1 gallon = $110 credit<br>
<br>
 <br>
 ', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5148470, 'We realized we cannot install jasmine vines there best to have them in pots.  This is a credit for those plants.  Thanks!<br>
<br>
5 5gallons @ $44.each', NULL, '2022-07-25 16:28:33', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5151068, 'Extending coping on both sides of pool for a total of 10 additional linear feet', NULL, '2022-07-25 11:23:51', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5151084, 'Separating grass from gravel, around fig tree
24 linear feet (15 for gravel and 9 for tree) ', NULL, '2022-07-25 11:23:39', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5151090, NULL, NULL, '2022-07-25 11:23:27', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5151124, 'Adding trains to compensate for grade shift due to pool being lower than pathway 
Will keep surface water from seeping into pool/studio', NULL, '2022-07-25 11:23:11', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5151346, '(4) uplights
(2) well lights ', NULL, '2022-07-25 11:22:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5152849, NULL, NULL, '2022-07-25 16:28:12', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5152891, 'We had in contract 690 SF of turf.
We need 795 SF of turf.

Cost difference = 105 SF @ $11.25/SF ', NULL, '2022-07-25 16:27:46', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5152920, '29 LF of 3/4" conduit from pool to bbq

White wire in existing box was not neutral it was ground. Please speak with Jorge for questions.', NULL, '2022-09-12 12:32:07', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (5153418, '(3) 15g wire basket @ $30/each = $90<br>
(14) 5g wire basket @ $10/each = $140<br>
(29) 1g wire basket @ $9/each = $261<br>
<br>
65 Square Feet wire grid for groundcover @ $2.50/SF = $162', NULL, '2022-07-27 09:16:39', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5156193, '$17913. Total 
$8045. In contract 
$9868 in change order. ', NULL, '2022-07-26 15:07:04', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5156579, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5160510, '14lf x $14.50= $203.00.  +  4 lf step build v $60.00= $240.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5162053, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5165277, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5165282, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5166813, NULL, NULL, '2022-07-29 07:02:38', NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (5168644, '40 LF of 3" SDR with three matching downspout connections', NULL, '2022-08-02 06:48:37', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5168656, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5168670, '22 LF of main line 3/4" PVC from back yard to planting area (where valves will live later).', NULL, '2022-08-02 06:48:22', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5168671, NULL, NULL, '2022-08-25 15:55:16', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5168735, '77 LF of 3/4" poly line in sand 18" below grade with detection wire ', NULL, '2022-07-29 17:45:19', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (5169492, NULL, NULL, '2022-08-01 13:00:25', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5174037, NULL, NULL, '2022-08-09 09:57:16', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5174040, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5174848, NULL, NULL, '2022-08-09 09:57:54', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5175227, '(5) 12" x 16" concrete footings for fence.<br>
(4)18" x 18" concrete footings for pergola.', NULL, '2022-08-02 11:05:47', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5178014, 'Owner specified specific post braces Simpson MPB66Z.

For pergola this will require $50 extra cost per footing because braces specified. (Fence post braces are ok)

', NULL, '2022-08-02 13:56:49', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5182801, NULL, NULL, '2022-08-03 16:21:54', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5183676, 'Used Brick from La Canada Rustic Stone - Install of pathway is 85 SF. add $425<br>
(2) 2''6" Used Brick steps - add $100<br>
<br>
If we install more than 85 SF of brick for pathway, cost will be @ $25/SF (since we are sprinkling in some of your own used bricks).', NULL, '2022-08-03 16:29:09', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5184236, NULL, NULL, '2022-08-04 09:16:10', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5188291, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5190158, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5191333, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5192114, '22 linear feet of 3" Drains from downspout to planter area...$506.00<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">22 linear feet of 3" Drains from downspout to planter area...$506.00</div></div>', NULL, '2022-08-06 13:38:05', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5196494, 'Drain repair 150 (100 dollar credit, Originally 250) <br>
<br>
Credit on 13 5 gallon plants<br>
<br>
10 1 gallon plants<br>
<br>
1112 gravel credit<br>
<br>
total credit 1892<br>
upgrade rock $2688', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5196824, '<br>
48 linear feet to relocate pool electric to box at house<br>
28 linear feet to run electric for fountain<br>
6 linear feet for jbox to underhouse to j box on the outside of house<br>
34 linear feet to relocate pool light electric<br>
 ', NULL, '2022-08-25 15:45:43', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5197020, 'California Room floor', NULL, '2022-08-10 13:49:00', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5197051, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Adding 4 linear feet of wall at 32" with stucco</div></div>', NULL, '2022-08-10 13:49:17', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5197053, NULL, NULL, '2022-08-10 13:47:16', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5197055, '(3) path lights<br>
(2) up lights', NULL, '2022-08-10 13:48:40', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5197056, NULL, NULL, '2022-08-10 13:46:59', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5197066, NULL, NULL, '2022-08-10 13:46:42', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5197068, '(1) new spray for groundcover<br>
(1) add''l drip', NULL, '2022-08-12 13:22:52', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5197071, NULL, NULL, '2022-08-10 13:46:24', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5198764, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'pending'),
  (5200853, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5201516, 'Adding 280 linear feet of drains throughout the back yard and front yard…
 Connect existing and future downspouts into the new drains ', NULL, '2022-08-11 10:19:16', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5201528, '45 Linear feet of electrical conduit / receptacle  for backyard fountain ', NULL, '2022-08-11 10:18:47', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5201538, 'Add Lightcraft brand low voltage lighting as designated per plan

  Cost includes., 18 lights (4 submersible, 4 path 10 well lights approximately 60 linear ft of tape light for front steps and front wall cap 300 watt transformer with timer. Unit to be installed inside the garage ', NULL, '2022-08-11 10:18:13', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5204576, '90 linear feet of gas run ', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5204607, '70 linear feet of electrical run', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5204810, NULL, NULL, '2022-08-12 16:18:55', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5204837, NULL, NULL, '2022-08-12 16:19:15', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5204843, NULL, NULL, '2022-08-14 13:06:20', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5204845, NULL, NULL, '2022-08-12 16:17:50', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5209204, '35 linear feet total', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (5209278, NULL, NULL, '2022-08-11 19:21:46', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5209304, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (5209308, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (5210623, NULL, NULL, '2022-08-12 13:21:50', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5212764, '120 linear feet all the way around pool with (3) inlets and (1) 12 linear foot channel drain in front of Cali room', NULL, '2022-08-12 13:22:35', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5217697, 'adding 500 sq ft of del rio 3/8ths to side yard', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5218830, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5219221, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5221789, 'We need to rebuild 8'' of 8" CMU wall from the crack over at 3'' high. This is with a new footing.', NULL, '2022-08-16 14:10:31', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5225064, 'See #5 in contract.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">I asked for TOTAL LF of drainage but never got these numbers from the crew or Brian and client is asking for a credit so I just gave it to him.
Next time before we back fill, I will need the exact LF of what we install, especially if client is watching every little thing we do we have to be exact.</div></div>', NULL, '2022-08-17 08:21:02', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5225447, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5226732, 'Credit on turf $130 <br>
Stump removal $210<br>
<br>
 <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">credit on turf went from socal blend 109 to autumn grass 97
cost diffrence is .50 cents a sq ft 
$130</div></div>', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5232368, '(3) 5g Salvia ‘Black and Blue’
(4) 5g Westringia ‘Grey Box’
(2) 1g Dianella ‘Lil Rev’
(3)1g Salvia farinacea
(3) 1g Salvia pink
(1) flat Senecio
(1) 5g Red Yucca

', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5232718, '(2) hours of design work includes plant placement and selections', NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (5236297, 'Installation of 1,250 Simple Turf Bel Air Supreme 116      1,250 X  $10.50  ($13,125.00)<br>
Installation of 160 sq ft (TBD) Putting Green 160  X $16.20  ($2,592.00)<br>
Putting Green Cups/Flags   4 x $93.00  ($372.00)<br>
<br>
 ', NULL, '2022-08-19 14:48:54', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5236304, 'Additional 679 sq ft of stucco which includes the side yard retaining wall as well as Rear raised planter wall plus the visible sides to neighbor<br>
 ', NULL, '2022-08-19 14:50:12', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5236316, 'White Marble Pebble Upgrade vs Contracted white crushed rock', NULL, '2022-08-19 14:49:41', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5238917, 'Very limited access to backyard having to go through the garage as well as site conditions. Extra demo for the steps leading to platform. <br>
Demo took an additional 12 man days.', NULL, '2022-08-25 15:37:25', NULL, NULL, NULL, 'Carter Godley', 'sold'),
  (5241107, '(4) 6 gauge wires<br>
new breakers<br>
new subpanel', NULL, '2022-08-25 15:37:08', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (5241109, NULL, NULL, '2022-08-25 15:37:43', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (5241293, '(1 Strawberry Unedo and 1 Olea europaea)', NULL, '2022-10-07 16:03:52', NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (5247362, 'Per city requirements from pre inspection<br />
1 guy 3 hours extra demo.&nbsp; add $210<br />
extra concrete 6x6 , contract had 1 1/2 by 6.&nbsp; So extra 27 sq feet. add $810', NULL, NULL, NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (5247680, NULL, NULL, '2022-08-24 16:43:43', NULL, NULL, NULL, 'Jorge Flores', 'lost'),
  (5250258, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5250839, 'Additional Flagstone for patio which includes labor and material.&nbsp; Installed additional amount of 103 pieces.&nbsp;&nbsp;', NULL, '2022-08-29 15:55:46', 3, '2022-08-29 14:32:24', 'Carter Godley', 'Brian McBride', 'pending'),
  (5251068, '3" deep of Brown shredded mulch WITHOUT weed barrier.<br />
300 SF for upper and lower planters.<br />
$555<br />
<br />
Demo - Upper planter soils need to come down 2" to make it flat.<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">this cost is for top planter coming down 2" plus the 300 SF of mulch. 
bottom planter is okay. 
Move forward with these items ONLY w/ approval. Thanks!</div></div>', NULL, '2022-08-25 08:39:00', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5251075, '@ $130/CY as in contract.', NULL, '2022-08-25 09:21:15', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5252086, '9x 3 x 18”', NULL, '2022-09-12 12:37:00', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5256577, 'We are needing to separate a valve for the myoporum groundcover slope.&nbsp; There are issues with runoff from the neighbors property creating flooding in Bevers yard.&nbsp; This is to be able to control the extra runoff.&nbsp;&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5258201, 'Adding to the length of the first step when you come throught the front gate - step was 4'' long and is now 6.5 LF', NULL, '2022-08-29 11:43:05', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5258250, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5258264, 'In order to get our levels right, we are adding a 4''2" step after the retaining walls (front yard pathway).<br />
Typical rise, typical step tread.', NULL, '2022-08-29 11:43:33', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5258286, 'Step is 3'' 5" wide with 1'' 10" landing.<br />
typical 6" rise<br />
sand finish<br />
*includes demo', NULL, '2022-08-29 11:43:51', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (5258300, 'Adding 27 SF of concrete to walkway when you first get past the gate, the width of pathway will be 6''6" and then it will end at retaining walls.<br />
<br />
Price as in contract is $14.50/SF<br />
 ', NULL, '2022-08-29 11:44:31', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5258338, 'Connect all drains on the studio and grass side of house to our existing drainage plan (which, separately is 170 LF, and is included in our contract).<br />
2 Downspouts will connect to our drains underground.<br />
Two drain grates will be in grass area to prevent flooding and catch water.<br />
All drains will connect to one central spot (pop ups).<br />
Drainage will go inbetween studio and house and jog down the sideyard to the frontyard where it will connect with popups.<br />
<br />
&nbsp;', NULL, '2022-08-29 11:45:10', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (5258349, 'Jorge recommended that drains on gravel side of house should be larger because they are collecting a lot more water.<br />
This is the cost difference of a 3" PVC pipe to 4" for 170 LF.', NULL, '2022-08-29 13:12:58', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5258526, 'Parkway demo - 3" of mulch and weed fabric 980 SF. **CLIENT HAS HANDLED ON THEIR OWN.<br />
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
This was updated on 9/21.', NULL, '2022-09-21 09:27:55', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5258613, 'We aren''t doing demo in the side yard from edge of garage (past shed) towards end of ADU. We will just MIX in the del rio.<br />
<br />
The area to the Left of the garage still needs to come down 3" (because right now gravel tends to spill over).', NULL, '2022-08-29 12:01:16', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5258629, '192 LF of 3" SDR PVC drain pipe $4,415 (@$23/LF)<br />
3 Downspouts will connect to drains underground - one at garage, 2 at house $85<br />
Two drain grates will be in grass area to prevent flooding and catch water. @ $75/each = $150<br />
Drain to connect to 4" pipe in front yard and to exit at street <br />
Permits $800 **We will credit you if less, cost is permit + admin hours for pulling permit $150/hr. We will share permit cost with you.**<br />
Saw cut, demo, core curb at street and re-pour concrete in broom finish $1,200<br />
 ', NULL, '2022-08-30 12:57:28', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5258826, 'Demo and pour 3,000 psi concrete for 7 SF with sand finish to match.', NULL, '2022-08-29 12:00:20', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5265759, 'Not doing extra step in backyard 3 LF.', NULL, '2022-08-30 12:56:01', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5266453, '<strong>Concrete Retaining walls in backyard #2 in Contract Addendum</strong><br />
<br />
$3,527 (CREDIT)', NULL, '2022-08-30 12:55:48', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5266540, '55 Lf. @ $25. LF.  $1375. Discount for trenching 
37LF.  @ $40. LF.  $1480.
 Total $2855.00', NULL, '2022-08-30 12:57:39', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5267068, 'didn''t install 2 flats. <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">please return to yard for credits</div></div>', NULL, '2022-08-31 09:44:25', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5267900, 'Order for (3) up lights - same up lights from installation. <span><span dir="ltr" style="left: 181.53px; top: 958.182px; font-size: 9.8px; font-family: sans-serif">FL-105B</span><span dir="ltr" style="left: 181.53px; top: 969.452px; font-size: 9.8px; font-family: sans-serif"> Big Smoky Accent Light w/Glare Contro</span></span><br />
Not going up any trees.<br />
<br />
We need some (maybe 2-3) extenders so the lights near jasmine path can come down and re-purpose the extenders to put path lights in center of boxwood hedge, as some are not in center, they are on outside.<br /><br />Please check irrigation and plants that look like they are dying.<br />
<br />
 ', NULL, '2022-09-16 01:32:21', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5268152, 'Additional plants:<br />
<br />
(6) 15 gallon Pygmy Date Palms<br />
(2) 24" box Pygmy Date Palms<br />
(1) 24" box Queen Palm<br />
(1) 15 gallon Queen Palm<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Additional plants include

(6) 15 gallon Pygmy Date Palms
(2) 24" box Pygmy Date Palms
(1) 15 gallon Queen Palm</div></div>', NULL, '2022-08-30 17:33:10', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5268703, NULL, NULL, '2022-08-30 16:35:24', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5273415, 'This is a credit of (3) step lights for the deck area', NULL, '2022-09-12 15:03:09', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5273432, 'Installation of additional 90 sq ft of artificial turf to the backyard<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Additional 90 sq ft of artificial turf in backyard patio area</div></div>', NULL, '2022-09-12 15:03:26', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5276304, 'Run main line behind new retaining wall 
About 25 LF. ', NULL, '2022-09-01 13:33:38', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5276327, 'Electrical includes 
91LF. Conduit with wire
2- breakers 
1-outlet', NULL, '2022-09-01 13:33:18', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5276905, 'Credit for (1) 15 gallon Queen Palm in backyard&nbsp;', NULL, '2022-09-01 13:10:42', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5276908, 'Less soils removed - $1400 credit<br />
Less course on wall on tall section - $780 credit<br />
Less turf installed - $1320 credit.', NULL, '2022-09-01 13:32:48', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (5276962, 'Raised planter 3/4" crushed white gravel for backyard', NULL, '2022-09-01 13:18:41', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5285579, 'Brick veneer on the riser. approximately 15 linear feet<br />
<br />
Material;&nbsp;Pacific clay Iron lights brick veneer<br />
One box, the material is TBD. We are waiting to hear from distributor on estimated delivery and price. We estimate&nbsp; $75-80<br />
<br />
Installation will take approximately 3-4 hours.&nbsp;<br />
&nbsp;', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'pending'),
  (5288546, 'Includes (2) separate risers with rotary heads for HOA planted areas&nbsp;', NULL, '2022-09-07 09:51:07', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5290334, '9 zones of irrigation at 800 each<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">9 zones of irrigation</div></div>', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5290811, 'Permit was $491
One hour for permit @ $150/hr = $641
$800 allowance for permitting - $641 = $159', NULL, '2022-09-09 11:49:56', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5290978, '2 citrus ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5294544, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5296341, 'Install (1) Bubbler zone and (1) 4 station timer for front yard trees', NULL, '2022-09-09 11:00:40', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5300000, 'Saw cut concrete for electrical access to the spa location. ', NULL, '2022-09-12 12:32:49', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5300636, 'Add 2.5 yards of brown shredded mulch to backyard landscape. No weed fabric ', NULL, '2022-09-12 12:32:22', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5301530, 'We have in contract 770 SF.<br />
We need 710.<br />
<br />
Credit is for 60 SF of St AUG sod.<br />
<br />
&nbsp;', NULL, '2022-09-09 21:42:15', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5301556, 'We have 875 SF of sod in Frontyard in contract.<br />
With current layout we have 1,175 SF.&nbsp;<br />
<br />
Difference is 300 SF = $1,300<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">gave a small discount on sod. 2%</div></div>', NULL, '2022-09-09 21:42:38', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5301562, 'Clients will PURCHASE and PLANT the roses (18 - 5gallons) or whatever they like!<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Rachelle will PURCHASE and PLANT the roses (18 - 5gallons)</div></div>', NULL, '2022-09-09 21:43:06', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5301588, 'We have 868 in contract and crew measured 1006.<br />
<br />
Difference of 139 SF.', NULL, '2022-09-09 21:43:19', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5304020, NULL, NULL, '2022-09-23 12:40:37', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5306340, '<p>Plants backyard - (3) 5g lavender, (1) 15g Bird of Paradise (2) 5g tbd.<br />
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
<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">for MAINTENENCE - Grass seed, trim roses.</div></div>', NULL, '2022-09-15 21:16:08', NULL, NULL, NULL, 'Nicole Antoine', 'pending'),
  (5309225, 'Wall will be 2 courses high with no more that 7"footings 2'' from back neighbors wall.
In grey split face', NULL, '2022-09-30 15:40:59', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5314450, '9 additional linear feet of electrical<br />Z $25.00= $225.00<br />12 linear feet of gas line 1" x $36.00= $420.00<br />$645.00 total', NULL, NULL, 1, '2022-09-14 12:35:07', 'Verva Gerse', 'Verva Gerse', 'sold'),
  (5314506, '2 24" Ficus<br />
3 15 gallon Dodos', NULL, '2022-09-21 15:05:22', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5314515, 'Credit for 1 15 gallon Mont cypress and 1 15 gallon Honeysuckle', NULL, '2022-09-21 15:06:05', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5314530, NULL, NULL, '2022-09-21 15:06:27', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5314751, NULL, NULL, '2022-09-21 15:06:44', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5315679, '<table border="0" cellpadding="0" cellspacing="0" width="564">
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
Difference from original is $1298', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5319906, NULL, NULL, '2022-09-28 13:30:26', NULL, NULL, NULL, 'Brian Godley', 'sold'),
  (5319966, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'pending'),
  (5320176, 'Add 3 yards of mulch in side yard and back yard<br />
&nbsp;', NULL, '2022-09-15 16:21:48', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5321426, 'Change order approved via text ', NULL, NULL, 1, '2022-09-16 07:52:32', 'Jorge Flores', 'Jorge Flores', 'sold'),
  (5322158, 'Lower existing gas line below grade', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5322201, '50 LF - 3/4" copper main line
New hose bib', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5322209, '1 weatherproof outlet above existing', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5322226, 'Keeping bamboo ', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5322234, 'Credit for cutting down jasmines', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5322842, '(11) brown 4" grates
(11) PVC pipe for deep water', NULL, '2022-09-26 17:23:17', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5323489, 'Additional 160 Sq ft of dg with Edging ', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5323514, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5323870, '(2) Chinese Elm Trees<br />
(1) Live Oak Tree', NULL, '2022-09-21 15:07:47', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5323871, NULL, NULL, '2022-09-21 15:08:06', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5323872, NULL, NULL, '2022-09-21 15:08:21', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5323874, 'Soil removal from Monterey Cypress bed and where Pine tree was located<br />
Additional grading required than what was listed in contract<br />
Dump fees included in this change order', NULL, '2022-09-21 15:09:25', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5323881, 'Installing 
 
3- 1gal. Feather grass
3- 15gal. Silversheen 

Total $514.5
', NULL, '2022-09-16 18:20:07', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5325996, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5327301, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5328787, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5330437, NULL, NULL, '2022-09-21 15:09:58', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5333560, 'Jorge sprayed out the area for the bender board in back along wooden fence.&nbsp; This will house the trees (and any future plantings).<br />
37 LF', NULL, '2022-09-21 09:27:13', NULL, NULL, NULL, 'Nicole Antoine', 'lost'),
  (5335937, 'We need 34 extra LF for dog run area.
I have given a discounted cost @ $8.75/LF (it''s $10/LF in contract).', NULL, '2022-09-21 14:04:19', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5337814, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Client declined vines on Patio structure posts .  Credit (2) 5 gallon vines</div></div>', NULL, '2022-09-22 17:26:59', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5337828, '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #ccc;font-size:13px"><p style="font-weight:bold;color:#555;margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">From BT Notes:</p><div style="white-space:pre-wrap">Roughly 80-90 linear feet of mesh fencing</div></div>', NULL, '2022-09-21 16:55:06', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5339763, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5341719, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5342013, '<br /><br />Add (3) 15 Gallon plants for the pots&nbsp;', NULL, '2022-09-22 15:14:07', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5342026, 'This is a credit for (5) spot lights as they were not needed and wanted', NULL, '2022-09-22 15:12:43', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5342078, 'Additional turf for parkway, driveway side and upper left area at the house.  These measurements were not initially factored in due to the fact that construction was still ongoing and didn''t have accurate areas of detail', NULL, '2022-09-22 15:28:57', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5342174, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5344439, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5344445, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5344840, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5345160, NULL, NULL, '2022-09-23 14:04:26', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5345266, '1500sqft of Marathon<br />
I plus 2 zones of Irrigation&nbsp;', NULL, '2022-09-26 09:46:47', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5348102, NULL, NULL, '2022-09-26 09:31:03', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5348645, 'Need water source to backyard - 

11 LF 1/2" copper water line (attached to foundation) @ $38/LF
16 LF 1/2" PVC pipe (under deck) @ $27/LF', NULL, '2022-09-26 13:18:45', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5348743, '13 additional LF of RRv ties for steps going down', NULL, '2022-09-26 13:18:20', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5353049, 'We need 9 gallons of spray on stabilizer.
Labor included.', NULL, '2022-09-27 10:22:41', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5353080, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5353096, 'Credit of112sf x $2.25 $252.00<br />Add rock 112 x $5.50= $616.00<br />+$364.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5353124, '8 x $100.00=$800.00', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5353159, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5358986, 'Adding turf strip on top&nbsp;', NULL, '2022-09-28 15:42:47', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5359050, '8 linear feet of poured concrete to be the base for the wooden IPE wall that Craig will install&nbsp;', NULL, '2022-09-29 09:23:18', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5359129, 'To stablilize joints between pavers&nbsp;', NULL, '2022-09-28 15:25:18', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5359133, 'For a total of 1014 pavers (contract has 985)&nbsp;', NULL, '2022-09-28 15:23:54', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5359145, '53 linear feet of 4" SDR 35 drain pipe<br />
(3) plastic inlets<br />
(4) inlets (for paver area, will be finished in the paver) ', NULL, '2022-09-28 15:24:54', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5359190, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5359364, NULL, NULL, '2022-09-28 17:13:46', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5359412, 'Plant credit for plants not installed per contract.&nbsp; I have reviewed the order list and reflected what was installed to what was installed.&nbsp;', NULL, '2022-09-28 16:52:40', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5359755, '<div>The 3 Olives replacing the 3 Camellias (to be transplanted) should be 5 gallon dwarf "patio" olives (short single trunk) - the same as those in the large, tall pots around the patio. I found those at La Crescenta Nursery and they are priced accordingly.<br />
<br />
Cost includes replanting camellias and irrigating them in their new spots. **Karelaine to flag</div>
', NULL, '2022-12-04 15:20:31', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5359756, NULL, NULL, '2022-12-04 15:20:17', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5359775, 'Approx. 200 SF of weed fabric used to target grassy areas of hillside.<br />
Double up the weed fabric to black out the grasses. Not all areas have persistent weeds.<br />
<br />
*This is a measure that we use to combat weeds, it is by no means a solution to weeds never coming back.<br />
**By signing this change order, you agree that other measures should be used to combat weeds after Picture Build is off of the job site.', NULL, '2022-09-29 11:56:00', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5360780, NULL, NULL, '2022-09-29 09:22:46', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5366518, 'both are 15 gallons', NULL, '2022-09-30 17:00:20', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5366633, '(10) 1g Dianella ''little rev''<br />
(6) 5g Muhlenbergia ''Regal Mist''<br />
(4) 5g Pittosporum ''Silver Sheen''<br />
(3) 5g Salvia ''Mystic Spires''<br />
(3) 5g White Iceberg Roses<br />
(3) 5g Westringia ''Morning Light''<br />
(1) 5g Salvia greggii <br />
(9) 1g Limonium <br />
 ', NULL, '2022-10-03 14:45:04', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5366776, '(1) outdoor weatherproof outlet with cover<br />
<br />
There is no other power outside.<br />
&nbsp;', NULL, '2022-10-05 15:36:32', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5368753, '250 additional Sq ft of Concrete $1900<br /><br />Demo for backyard to level 600 cu ft by bobcat<br />2508<br /><br />Total $4408', NULL, NULL, NULL, NULL, NULL, 'Daniel Aguilar', 'sold'),
  (5368972, '(5) 12'' boards with rebar to hold up new pathway across upper slope to new steps location', NULL, '2022-10-03 11:38:03', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5370512, NULL, NULL, '2022-10-04 17:09:15', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5370521, '(3) up lights&nbsp;<br />
(1) transformer', NULL, '2022-10-04 17:08:54', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5370583, '+1 uplight<br />
+1 path light<br />
+4 accent lights', NULL, '2022-10-03 14:37:30', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5371318, 'one additional up light $225<br />
<br />
- per client note in previous CO&nbsp;<br />
<br />
Total of 3175 in new change orders.&nbsp; $95.25', NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5371455, '7 plants @ $22 extra each ~ $150', NULL, '2022-10-03 22:06:29', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5371473, 'Form and pour about 18 concrete pads 
With 1" minus del rio. gravel in strips 
', NULL, '2022-10-03 17:08:32', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5371556, NULL, NULL, '2022-10-05 15:36:13', NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5371621, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5373609, '(2) 5 gallon purple Salvia greggii<br />
(8) 1 gallon orange daylilies&nbsp;', NULL, '2022-10-11 17:42:19', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5377809, NULL, NULL, '2022-10-06 17:54:49', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5378109, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5378320, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5380322, 'Succulent planting for (4) pots in the Front Yard', NULL, '2022-10-06 02:28:34', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5380412, NULL, NULL, '2022-10-06 17:54:39', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5380489, NULL, NULL, '2022-10-06 17:54:20', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5382470, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5382474, 'No charge!', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5382482, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5382484, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5382515, '172 SF (mix of pink and white kurapia)', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5382577, 'For area near pool equipment', NULL, NULL, NULL, NULL, NULL, 'Nicole Antoine', 'sold'),
  (5383417, NULL, NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5383474, NULL, NULL, '2022-10-06 12:39:27', NULL, NULL, NULL, 'Jorge Flores', 'sold'),
  (5385048, NULL, NULL, NULL, NULL, NULL, NULL, 'Mohammed Rahman', 'sold'),
  (5387248, 'Additional pavers. ', NULL, NULL, NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5387283, '<br />2)  To add the 2 planters 2X240= 480 X $5.50= $2,640.00- Demo in contract $936.00= $1,704.00 (we can throw rock on the side of the walkway going back, with any overage)<br />', NULL, '2022-10-07 11:43:02', NULL, NULL, NULL, 'Verva Gerse', 'sold'),
  (5387848, 'White pebble cost upgrade', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5387863, 'Rock cost upgrade to original scope of work', NULL, '2022-10-07 13:10:57', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5388143, NULL, NULL, '2022-10-07 16:03:10', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5388146, '(3) 5 gallon shrubs<br />
&nbsp;', NULL, '2022-10-07 16:03:37', NULL, NULL, NULL, 'Dana Weinroth', 'sold'),
  (5388234, 'Need to order 1 pallet to satisfy sq footage.&nbsp; There is not enough pavers on hand to complete the extension', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5388241, 'Replace coping and various pavers that have old fence posts and plugs around the pool', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5392315, 'This outlet was not necessary', NULL, '2022-10-11 14:56:44', NULL, NULL, NULL, 'Brian McBride', 'sold'),
  (5395254, 'Brick border re alignment ', NULL, NULL, NULL, NULL, NULL, 'Brian McBride', 'sold');

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
