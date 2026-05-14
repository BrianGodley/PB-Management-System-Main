-- ============================================================
-- BT Change Orders Import — Batch 3 of 5
-- COs in this batch: 1,337 (rows 2675-4011 of 6,681)
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
  (4021480, 10003679, '0001', 'Additional pavers 28 sf', '28 more pavers at $18 sf', NULL, 504.00, 'pending', '2021-07-03', '2021-07-03 10:54:50'),
  (4021483, 10003679, '0002', 'Drainage', '8 foot sleeve. X $15.00', NULL, 120.00, 'pending', '2021-07-03', '2021-07-03 10:59:28'),
  (4021487, 10003679, '0003', 'Drainage line front', 'Catch basins  drain needs to go into left and right planter with jetting under 3 foot walkways then attaching a pop top exit into the planters  2 count 8 feet. + jet $200.00 x 2= $400.00', NULL, 400.00, 'pending', '2021-07-03', '2021-07-03 11:02:15'),
  (4022759, 9976353, '0004', 'Larger box for extra outlet', NULL, NULL, 100.00, 'pending', '2021-07-05', '2021-07-05 13:40:47'),
  (4024869, 10003679, '0004', 'Mulch in back planter with geotextile fabric', '125 sf mulch with fabric. X $1.75', NULL, 218.00, 'pending', '2021-07-06', '2021-07-06 10:04:36'),
  (4024931, 10001394, '0007', 'Irrigation valve/Split Zone Planter back path', NULL, NULL, 450.00, 'sold', '2021-07-06', '2021-07-06 10:16:44'),
  (4024974, 10001394, '0008', 'Spray Zone for Front Lawn', NULL, NULL, 860.00, 'sold', '2021-07-06', '2021-07-06 10:24:01'),
  (4024981, 10001394, '0009', 'Drip Zone for Front Planters', 'have to sleeve under the driveway for side planter', NULL, 1200.00, 'sold', '2021-07-06', '2021-07-06 10:25:07'),
  (4024984, 10001394, '0010', 'Irrigation Zone for Front Parkway', NULL, NULL, 900.00, 'pending', '2021-07-06', '2021-07-06 10:25:27'),
  (4024987, 10001394, '0011', 'Installation of 18x18 Steppers (front yard)', 'Includes demo, no sand to set pavers, just digging in and setting.
Side by side steppers', NULL, 1200.00, 'pending', '2021-07-06', '2021-07-06 10:26:24'),
  (4027063, 10097123, '0001', '9 more linear feet of Bender Board', NULL, NULL, 72.00, 'pending', '2021-07-06', '2021-07-06 19:12:23'),
  (4030698, 7799379, '0035', 'Added base, heightened wall, extra backfiling.', 'Demoed and added 2 extra inches of base material in roughly 700 square feet.   $1,800

Back fill lower planter wall (not in backyard change order) $400

Raise height of planter wall by 2 courses vs plan.  $1,100

Still need to have change order for extra grade removal at bottom beyond 7 inches.  Will figure this out once we grade and compact for new step location.', NULL, 3300.00, 'sold', '2021-07-07', '2021-07-07 16:17:03'),
  (4030790, 7799379, '0036', 'Rain Garden', 'Did out rain garden 3.5 feet down.  Haul out extra soils to dump.

Install pond liner system. 

Deliver gravel and textile fabrics and haul in,. 

Deliver top soils for 12 inch bed and haul to backyard.

Install mulch layer

Install rip rap

Install 10 feet of Overflow drain system.

Planting not included', NULL, 4400.00, 'sold', '2021-07-07', '2021-07-07 16:59:58'),
  (4032279, 10127581, '0003', 'Planting Pricing (under allowances in contract)', 'Please see attached planting list.  Plants priced out per standard table included in contract.,', NULL, 4610.50, 'sold', '2021-07-08', '2021-07-08 08:32:34'),
  (4033063, 10043446, '0007', 'Bel Air 92 Simple Turf - 70 SF', 'Measurement off from plan - additional 70 SF needed', NULL, 1067.00, 'pending', '2021-07-08', '2021-07-08 10:41:24'),
  (4033093, 10043446, '0008', '44 LF Bender board 6 x 1"', '44 LF of brown plastic bender board 6" x 1"', NULL, 375.00, 'pending', '2021-07-08', '2021-07-08 10:45:43'),
  (4033116, 10043446, '0009', 'Grass credit', 'Credit for valley rtf sod 135 sf', NULL, -506.00, 'pending', '2021-07-08', '2021-07-08 10:48:56'),
  (4033275, 10043446, '0010', '1" electrical conduit  with (6) 6 guage wires', 'For jacuzzi run 90 LF of 1" conduit
(6) 6 guage wires
18" below grade', NULL, 2677.00, 'pending', '2021-07-08', '2021-07-08 11:19:14'),
  (4033279, 10043446, '0011', 'Permit CO refund', 'Client will pull permit', NULL, -500.00, 'pending', '2021-07-08', '2021-07-08 11:19:54'),
  (4033320, 10043446, '0012', 'Credit NO decomposed granite', 'We are NOT going to do DG under jaccuzzi', NULL, -230.00, 'pending', '2021-07-08', '2021-07-08 11:26:47'),
  (4033326, 10043446, '0013', 'Adding 50 SF of Belgard Catalina Grana', '50 LF of Belgard Catalina Grana in Victorian', NULL, 653.00, 'pending', '2021-07-08', '2021-07-08 11:28:11'),
  (4033471, 10043446, '0014', 'Adding irrigation (1 drip, 1 spray)', '1 brass valve for planters with Netafim $800
1 brass valve for grass spray zone $895
Install of smart timer $50
Complementary new hose bib ($200)', NULL, 1745.00, 'pending', '2021-07-08', '2021-07-08 11:52:21'),
  (4037391, 10097123, '0002', 'Hook up all 6 Sprinklers vales to 1 Timer', NULL, NULL, 600.00, 'sold', '2021-07-09', '2021-07-09 12:18:30'),
  (4040907, 10054765, '0002', 'Upgrading flagstone to larger size', NULL, NULL, 750.00, 'pending', '2021-07-12', '2021-07-12 10:15:00'),
  (4040960, 10001394, '0012', 'Credit for irrigation', NULL, NULL, -500.00, 'sold', '2021-07-12', '2021-07-12 10:23:42'),
  (4040987, 10042815, '0001', 'Drainage', '86 LF of 3" sdr pipe
3 drain grates
Remove, grade and relay existing brick paver across driveway to make way for  connecting drains', NULL, 2300.00, 'pending', '2021-07-12', '2021-07-12 10:28:10'),
  (4040991, 10042815, '0002', 'Less paver', 'Not doing as big an area for paver', NULL, -120.00, 'pending', '2021-07-12', '2021-07-12 10:28:51'),
  (4041146, 10042815, '0003', 'Main line 3/4" 12LF', 'Main line from where existing hose bib is to nearest CMU wall where roses will be

Use existing hose bib', NULL, 300.00, 'pending', '2021-07-12', '2021-07-12 10:55:11'),
  (4041665, 10001394, '0013', 'Credit - Design', NULL, NULL, -375.00, 'pending', '2021-07-12', '2021-07-12 12:19:59'),
  (4042121, 10097123, '0003', 'Controller credit', 'Credit for providing the controller. Picture Build still installing and wiring.', NULL, -175.00, 'pending', '2021-07-12', '2021-07-12 13:28:50'),
  (4042184, 7799379, '0037', 'CREDIT - Mitch Work', NULL, NULL, -3750.00, 'pending', '2021-07-12', '2021-07-12 13:39:11'),
  (4042799, 9977850, '0001', 'Plant Credit and add', 'Original Plant budget was $1700

Adding 5 1 gallon blue fescue. 

Total plant orderis now $1441

Credit due of $259', NULL, -259.00, 'pending', '2021-07-12', '2021-07-12 15:45:40'),
  (4046542, 9831009, '0014', 'DG walkway 80sqft', NULL, NULL, 550.00, 'sold', '2021-07-13', '2021-07-13 13:54:16'),
  (4046605, 9831009, '0015', 'Timber Retaining Wall 17’ x 2’', 'Includes demo', NULL, 5200.00, 'sold', '2021-07-13', '2021-07-13 14:04:08'),
  (4046630, 9831009, '0016', 'Concrete curb for upper terrace', '19LF x 8”x8”
Also will need to core drill curb to extend rebar', NULL, 800.00, 'sold', '2021-07-13', '2021-07-13 14:07:18'),
  (4046651, 9831009, '0017', 'Extend 1st wall 13’', NULL, NULL, 165.00, 'sold', '2021-07-13', '2021-07-13 14:09:42'),
  (4046698, 9831009, '0018', 'Demo for DG pathway', NULL, NULL, 75.00, 'sold', '2021-07-13', '2021-07-13 14:20:45'),
  (4047448, 10043446, '0015', 'Trenching, backfill, and compacting', 'This is for digging trenches for another electrician outside of Picture build to install. Picture Build is not liable for permitting nor electrical work.

Separate document with liability clause to be sent via email and signed by both parties.', NULL, 1350.00, 'sold', '2021-07-13', '2021-07-13 19:01:31'),
  (4051384, 10127581, '0004', 'Credit again Add sod', NULL, NULL, -1700.00, 'pending', '2021-07-14', '2021-07-14 16:41:28'),
  (4053230, 10127581, '0005', '6 Station Irrigation Controller.', NULL, NULL, 330.00, 'pending', '2021-07-15', '2021-07-15 09:54:51'),
  (4053785, 10054765, '0003', 'Additional 40 sq. Feet', NULL, NULL, 363.00, 'pending', '2021-07-15', '2021-07-15 11:37:16'),
  (4054046, 8602967, '0011', 'Repair paver borders', 'Repair paver borders that sunk in due to next door construction. 
Remove borders that were set in concrete. 
If needed remove more of the pavers.
Bring in new pavers.
level and compact the effected area one more time.
Wet set the borders again in concrete.
Set the pavers back in.
Add sand as needed.', NULL, 780.00, 'pending', '2021-07-15', '2021-07-15 12:28:16'),
  (4054087, 9831009, '0019', 'Sand finish for concrete squares (terrace)', NULL, NULL, 475.00, 'pending', '2021-07-15', '2021-07-15 12:35:04'),
  (4059143, 9390377, '0011', 'Replace 1 Valve', NULL, NULL, 220.00, 'pending', '2021-07-16', '2021-07-16 15:44:34'),
  (4059202, 10003679, '0005', 'Mulch in front planters near the house', NULL, NULL, 300.00, 'pending', '2021-07-16', '2021-07-16 16:32:12'),
  (4060017, 7799379, '0038', 'Added, Grading, Steps, Veneer Work', '1) Move soils from rear yard and haul, that was not in contract.   Regrade and compact section by new steps near firepit.  $4000
2) Cantilever steps per client request.  $20 per linear foot.  123 linear feet of steps. $2460
3) Demo and add walls for new side steps and rear step 17 liner feet in total.    Saw cut and demo walls. $2,960

Veneer add to be in separate change order.', NULL, 9440.00, 'pending', '2021-07-18', '2021-07-18 18:12:33'),
  (4062238, 10203460, '0001', 'Refund', NULL, NULL, -1000.00, 'pending', '2021-07-19', '2021-07-19 11:26:01'),
  (4063154, 10322924, '0001', 'Using new pavers for walkway 150 sf', 'Price differeence for using new pavers', NULL, 300.00, 'pending', '2021-07-19', '2021-07-19 14:03:18'),
  (4063161, 10096826, '0005', 'Credit for 10 plants at 1 gallon instead of 5 gal', NULL, NULL, -220.00, 'pending', '2021-07-19', '2021-07-19 14:05:04'),
  (4063205, 9643179, '0008', '(2) New Valves, (2) Pressure Regulators', '(2) new valves
(2) new pressure regulators
(1) 12” ground box', NULL, 800.00, 'pending', '2021-07-19', '2021-07-19 14:15:04'),
  (4063709, 9831009, '0020', 'Mexican Beach Pebble Border', '140sqft around sod', NULL, 1350.00, 'sold', '2021-07-19', '2021-07-19 17:26:14'),
  (4063711, 9831009, '0021', 'Bender board for gravel 100 linear feet', NULL, NULL, 900.00, 'sold', '2021-07-19', '2021-07-19 17:27:26'),
  (4063716, 9831009, '0022', 'Gopher Mesh under Sod', NULL, NULL, 1800.00, 'sold', '2021-07-19', '2021-07-19 17:29:45'),
  (4066003, 8160247, '0002', 'Permit Allowance', NULL, NULL, 3000.00, 'pending', '2021-07-20', '2021-07-20 11:04:20'),
  (4066408, 10202889, '0001', 'Concrete pad by alley entry', '30sqft plus demo', NULL, 825.00, 'sold', '2021-07-20', '2021-07-20 12:03:03'),
  (4067346, 9902783, '0014', '300 watt transfrmr and (2) 5.5 watt well bulbs', '(1) 300 watt transformer
(2) 5.5 watt LED well light bulbs
Labor to install the above included', NULL, 494.00, 'sold', '2021-07-20', '2021-07-20 14:18:47'),
  (4067590, 9902783, '0015', 'Additional mulch', NULL, NULL, 120.00, 'sold', '2021-07-20', '2021-07-20 15:23:58'),
  (4067959, 9831009, '0023', 'Stucco for wall extensions', 'Stucco for wall extensions (recent change orders)', NULL, 1400.00, 'sold', '2021-07-20', '2021-07-20 18:41:26'),
  (4070907, 10233398, '0003', '3 additional path lights', '3 additional path lights', NULL, 650.00, 'sold', '2021-07-21', '2021-07-21 13:24:10'),
  (4071466, 9951448, '0002', 'Info on sprinklers for lawn', 'Due to the shape of the center island grass area. There will always be some form of overspray to account for the wind that is frequent in the Santa Clarita Valley. ????Without overspray, there would be sufficient coverage for the sprinklers and grass would end up dying. We are limited in the type of nozzles available and have the smallest ones chosen to have minimal overspray. ???????????', NULL, 0, 'pending', '2021-07-21', '2021-07-21 15:18:01'),
  (4074116, 10096826, '0006', 'Rock taken out using mukch', 'Not using rock. Using mulch which will be added in mulch change order', NULL, -378.00, 'pending', '2021-07-22', '2021-07-22 11:14:47'),
  (4074158, 10096826, '0007', 'Additional rtf 83 sf.', NULL, NULL, 290.00, 'sold', '2021-07-22', '2021-07-22 11:22:15'),
  (4075403, 10096826, '0008', 'Additional Mulch/Fabric for the Front', 'Original Mulch in the contract 445 SF
Back count 400 SF
Front Count with parkway 408
Total to install:
808 SF - 445 in contract
$635.00', NULL, 635.00, 'sold', '2021-07-22', '2021-07-22 15:26:38'),
  (4075776, 10202889, '0002', 'Pavers for around the pool', '-remove flagstone/gravel 7" below final grade
-Install roughly 370 sqft of pavers (will use some of the pavers that are left over from pathway)', NULL, 3100.00, 'pending', '2021-07-22', '2021-07-22 18:16:42'),
  (4075781, 10202889, '0003', '(2) New Drip Zones', NULL, NULL, 2000.00, 'sold', '2021-07-22', '2021-07-22 18:19:39'),
  (4075782, 10202889, '0004', 'Lighting Assessment Credit', NULL, NULL, -250.00, 'sold', '2021-07-22', '2021-07-22 18:20:27'),
  (4075789, 10001394, '0014', 'Credit for outdoor kitchen', NULL, NULL, -3000.00, 'sold', '2021-07-22', '2021-07-22 18:24:10'),
  (4077077, 10127581, '0006', 'Contract completion', NULL, NULL, 0, 'pending', '2021-07-23', '2021-07-23 08:51:05'),
  (4077478, 10127581, '0007', '5 gallon Knockout Rose tree form', NULL, 'supposed to be $50', 50.00, 'pending', '2021-07-23', '2021-07-23 10:02:39'),
  (4077933, 9902783, '0016', '(4) additional lights', '(3) up lights -  CL531B-GM-LED11 2.5 
(1) path light - CL735B- GM-18-LED16-3W-WF

Includes wiring, assembly, light fixture, LED bulbs, placement and all other labor associated with lighting.', 'Please make sure to go and flag with the client where these lights will go.  They know and have an idea of where each light is needed… do not install without them APPROVING.', 920.00, 'sold', '2021-07-23', '2021-07-23 11:23:54'),
  (4077943, 9902783, '0017', 'Smart timer - No charge', 'No charge as a gift complementary of Nicole.
Additional cost specified in contract was $200 to upgrade to a smart timer.', 'I need a text, or reminder that the client has opted for smart timer before we purchase and move forward. I think this happened rather quickly and I don’t remember officially letting them know it was more cost to do the timer anywhere in my communications.  Then it was installed, Rachio before I even caught it. Thank you!  I will try to be more clear here in the future.', 0, 'sold', '2021-07-23', '2021-07-23 11:25:59'),
  (4081746, 10043446, '0016', 'Stump grinding (3)', 'Found 3 stumps in grass area for stump grinder', NULL, 550.00, 'sold', '2021-07-26', '2021-07-26 11:15:43'),
  (4082708, 10043446, '0017', 'Credit for drainage', 'We are not doing the drainage as stated in the signed contract. Client Dara has signed a liability waiver (in Permits folder).', 'Mohammed or anyone - Let me know if we need another liability waiver saying client is responsible for permits?', -2390.00, 'sold', '2021-07-26', '2021-07-26 13:56:41'),
  (4082765, 9067501, '0010', 'Up to 40 lf of bender board.', NULL, NULL, 210.00, 'pending', '2021-07-26', '2021-07-26 14:08:57'),
  (4082929, 10042815, '0004', 'Import soil', 'Import additional 7 yards of 50/50 soil.  

In contract we had Import 3 yards of 50/50.', NULL, 600.00, 'pending', '2021-07-26', '2021-07-26 14:44:36'),
  (4083515, 10096826, '0009', 'Contract completion', '- Even out mulch in the front
- Add bender board in parkway
- Remove bathroom 
- Replace the broken hose
- Fix drainage
- Replace 3 lights', NULL, 0, 'sold', '2021-07-26', '2021-07-26 18:08:02'),
  (4084756, 10003679, '0006', 'Stepper install in concrete no bender biard', NULL, NULL, 150.00, 'pending', '2021-07-27', '2021-07-27 08:20:22'),
  (4087428, 10042815, '0005', 'Main line shut off valve', 'Main line shut off valve. There was not one before which means you have to call the city to shut off your water. This is highly recommended. Thank you!', NULL, 100.00, 'pending', '2021-07-27', '2021-07-27 16:45:15'),
  (4087458, 9978406, '0002', 'Add Stabilizer to newly installed DG.', 'This has to be done in 2 phases.
First day one coat and have to go back the next day for the second coat.', NULL, 1970.00, 'pending', '2021-07-27', '2021-07-27 16:54:53'),
  (4087506, 10096826, '0010', 'Credit for Hose', NULL, NULL, -40.00, 'pending', '2021-07-27', '2021-07-27 17:12:19'),
  (4087600, 9978406, '0003', 'Plant Credit', NULL, NULL, -650.00, 'pending', '2021-07-27', '2021-07-27 18:09:50'),
  (4089533, 9964015, '0014', '(20 pieces) 6 x 6 x 8 ACQ green timbers & install', 'Steps have been requested by client to be encased, timber allotment did not consider encasement going all the way up to DG/jaccuzzi pad. See most recent photos. We have used 50 timbers so far, we need 20 more. In total that equates to 70 LF x 8 ft = 560 LF.', NULL, 2507.00, 'sold', '2021-07-28', '2021-07-28 10:26:51'),
  (4091344, 10553589, '0003', 'Allocation for pulling permits', 'If we are under then we will credit you.  Permits are in process of being pulled, we do not know costs of this yet.  This is an allotment.', NULL, 1000.00, 'pending', '2021-07-28', '2021-07-28 16:16:52'),
  (4091520, 9902783, '0018', '8 New flagstones grass set', '8 flagstones set in grass to connect front entrance to side gate (through grass area, meeting up with DG area).', 'Please make them the same as the ones you have already put in DG area. I WANTED the first and last flagstones to be bigger than the others, but its already done. It’s fine, i don’t want to redo the DG.', 500.00, 'sold', '2021-07-28', '2021-07-28 17:45:11'),
  (4091526, 10016524, '0001', 'Main Line shut off with cover - did not install', 'We did not install main line ball valve shut off with cover. Not needed.', NULL, -100.00, 'pending', '2021-07-28', '2021-07-28 17:46:42'),
  (4093150, 10322924, '0002', 'Additional pavers. 7 sf × $14.00= $98.00', NULL, NULL, 98.00, 'pending', '2021-07-29', '2021-07-29 09:00:28'),
  (4093160, 10322924, '0003', '2 drip zones', '2 new drip zones with all new brass valves.', NULL, 1930.00, 'pending', '2021-07-29', '2021-07-29 09:02:10'),
  (4094596, 10043446, '0018', 'Add stepping stones to grass area leading to patio', 'Adding 1'' square stepping stones to patio for a total of 24 SF and 24 pavers, we need 3 more 1’ x 1’ to complete the look/project .  We did not use road base on these stepping stones.  We did need to cut the grass around the stones and we did have to align them to make a path and make them equal distance.', NULL, 280.00, 'sold', '2021-07-29', '2021-07-29 12:41:01'),
  (4095603, 10563792, '0001', 'Additional Plants', NULL, 'Please see attached final planting plan', 862.00, 'pending', '2021-07-29', '2021-07-29 16:22:38'),
  (4095730, 10391726, '0001', 'Add two retaining walls', 'Install two new retaining walls.  14'' x 3'' plus footing   10 ''x 4'' plus footing

Includes demo,  reinforcement, grout cells, water proofing for one wall and stucco coating.', NULL, 4735.00, 'sold', '2021-07-29', '2021-07-29 17:37:57'),
  (4097927, 10042815, '0006', '5 timbers and labor', 'Adding 5 6” x 6” x 8’ ACQ Green timbers to retaining wall - $350 
Labor - $500 - 1/2 day', NULL, 850.00, 'pending', '2021-07-30', '2021-07-30 12:01:32'),
  (4098720, 10042815, '0007', 'Driveway Brick repair', 'Labor for lifting brick and replacing.  Melinda discussed with Emelley.', NULL, 250.00, 'pending', '2021-07-30', '2021-07-30 16:57:05'),
  (4098722, 10042815, '0008', '20 pieces Rustic Wall', '20 pieces of Rustic Wall in Grey/Charcoal to complete and finish the wall. NO CHARGE as this was estimated at 21 LF in contract, as an offset for needing more timbers, I have given this at no charge to Emelley.', NULL, 0, 'pending', '2021-07-30', '2021-07-30 16:58:27'),
  (4100933, 10391726, '0002', 'Bee Relocation', NULL, NULL, 750.00, 'pending', '2021-08-02', '2021-08-02 09:10:54'),
  (4101521, 9841032, '0002', 'Rachio controller instead of irritable.', 'Change type', NULL, 0, 'pending', '2021-08-02', '2021-08-02 10:53:10'),
  (4101989, 9964015, '0015', '(4 pieces) 6 x 6 x 8 ACQ Green timbers', '(4) 6 x 6 x 8 timbers to retain wall of steps leading up to jacuzzi patio.
Includes labor. I have given best price on final order of timbers. This should complete all the ACQ timbers needed for this project.', 'Danny talked with Fidel and they can complete the look with just 4 timbers.', 466.00, 'sold', '2021-08-02', '2021-08-02 12:09:30'),
  (4102060, 9977850, '0002', 'Credit 3@ 5G Blue Sedge for 6@ 1G Blue Fescues', NULL, NULL, 0, 'pending', '2021-08-02', '2021-08-02 12:19:28'),
  (4110328, 9964015, '0016', 'Stucco existing wall', 'Stucco existing wall to match. Approx 28 SF (13 SF of stucco was included in other change order)', NULL, 140.00, 'sold', '2021-08-04', '2021-08-04 13:28:46'),
  (4110340, 9964015, '0017', 'Adding one course CMU 8” block wall', '6 LF of 8” x 8” x 16” CMU block wall on top of fresh newly built wall
- cut block to ensure that caps match height of top step
6 LF of Rectangular CMU wall cap', NULL, 100.00, 'sold', '2021-08-04', '2021-08-04 13:30:33'),
  (4110820, 9841032, '0003', 'Electrical additional', 'total additional needed 57 Linear FeetX $22.00= $1,254.00', NULL, 1254.00, 'sold', '2021-08-04', '2021-08-04 15:08:01'),
  (4110842, 9841032, '0004', 'Drainage', 'French Drain, 3" perforated pipe in sleeve, set in 12" gravel behind waterproof wall
60 Linear feet X $35.00= $2,100.00
70 Linear feet X $23.00= $1,610.00
Total $3,710.00', NULL, 3710.00, 'sold', '2021-08-04', '2021-08-04 15:13:05'),
  (4110890, 9841032, '0005', 'Stump grind', NULL, '36" X 36" based on estimator $238.00', 238.00, 'sold', '2021-08-04', '2021-08-04 15:24:10'),
  (4111126, 9964015, '0018', '15g to 24” box Desert Museum Paulo Verde trees', 'Cost difference for 2 24” Pablo verde tree boxes- $130, Nicole is splitting it with client, 50/50.', NULL, 65.00, 'sold', '2021-08-04', '2021-08-04 16:48:26'),
  (4111517, 8470970, '0006', 'Weed barrier', 'Add high grade weed barrier 450 SF includes installation', NULL, 175.00, 'pending', '2021-08-04', '2021-08-04 22:30:59'),
  (4111551, 9841032, '0006', 'One additional uplight Vista 5005', NULL, NULL, 225.00, 'pending', '2021-08-05', '2021-08-05 00:23:31'),
  (4112255, 10713700, '0001', 'Job Clean Up,  Demo and A/C. pad', '1) Do a job clean up and haul all waste.  
2) Demo down 16 inches for A/C pad per client instructions to have it low as possible. Haul extra soils. 
3) Install sleeves and drain line under the pad.  
4) Form for A/C with bi level per instructions from A/C contractor. 
5) Install A/C rebar pour and finish A/C pad 
6) Dig trench for electrical contractor to run new electrical. Roughly 110 linear feet.  Backfill and recompact later with future work', NULL, 6850.00, 'pending', '2021-08-05', '2021-08-05 07:47:42'),
  (4113368, 8470970, '0007', 'Credit for sleepers', 'Johnny had installed prior to start.', NULL, -400.00, 'pending', '2021-08-05', '2021-08-05 11:13:40'),
  (4113375, 8470970, '0008', '5g that was supposed to be a 15g', 'We received a 5g to plant, not a 15g.  This is a labor credit as the client purchased plants himself.', NULL, -50.00, 'pending', '2021-08-05', '2021-08-05 11:14:45'),
  (4116495, 10553589, '0004', 'Allotment payment 3% cc fee', NULL, NULL, 30.00, 'pending', '2021-08-06', '2021-08-06 09:31:25'),
  (4116525, 10042815, '0009', 'Design Credit due', NULL, NULL, -600.00, 'pending', '2021-08-06', '2021-08-06 09:36:16'),
  (4117016, 10016524, '0002', 'Contract Completion', NULL, NULL, 0, 'sold', '2021-08-06', '2021-08-06 11:15:53'),
  (4119610, 9975675, '0011', '3.5 yards of mulch', 'Approved via text', NULL, 320.00, 'pending', '2021-08-09', '2021-08-09 07:19:26'),
  (4120113, 10690372, '0001', 'Plant Refresher Change Order', 'See Change Order Estimate in documents folder, signed by both parties.', NULL, 4657.00, 'sold', '2021-08-09', '2021-08-09 08:54:04'),
  (4120135, 10322924, '0004', '62 linear feet bender board', NULL, NULL, 496.00, 'pending', '2021-08-09', '2021-08-09 08:58:51'),
  (4120296, 10322924, '0005', 'Credit using own rachio', NULL, NULL, -150.00, 'pending', '2021-08-09', '2021-08-09 09:24:03'),
  (4120841, 10553589, '0005', 'Credit for not doing concrete bench', 'Removed from scope:

 Concrete Bench
1. Install footings and wooden forms for concrete pour. SEE PLANS.
2. Little bench is to be poured in place concrete at approx:
a. 1’ 10” arms
b. 7’ 2” length.
c. 18” maximum in height, anything over this will be a change order.
3. Carpenter to install wooden planks for sitting.
4. Sand finish on poured concrete approx. 28 SF
COST: $966', NULL, -966.00, 'sold', '2021-08-09', '2021-08-09 11:04:05'),
  (4122116, 9977850, '0003', 'Additional to planter walls', NULL, NULL, 5500.00, 'sold', '2021-08-09', '2021-08-09 14:57:42'),
  (4122472, 10553589, '0006', 'Upgrade back kitchen step to cantilever', 'Adding approx 14.4 LF of cantilever step at back kitchen step (was a normal step before, see addendum). Sand finish.', NULL, 360.00, 'sold', '2021-08-09', '2021-08-09 16:56:11'),
  (4123738, 10307532, '0001', '2 Add''l Zones of Irrigation', NULL, NULL, 1775.00, 'sold', '2021-08-10', '2021-08-10 08:13:54'),
  (4123743, 10307532, '0002', '(1) Add''l  24" Boxed Eugenia or Ficus Nitida', NULL, NULL, 385.00, 'sold', '2021-08-10', '2021-08-10 08:14:53'),
  (4123746, 10307532, '0003', 'Bender board for Pathway', '250-300 linear feet', NULL, 2400.00, 'sold', '2021-08-10', '2021-08-10 08:16:08'),
  (4123747, 10307532, '0004', 'Drainage Extension w/pop up near pool equip', 'Updated 9/9', NULL, 990.00, 'pending', '2021-08-10', '2021-08-10 08:16:33'),
  (4123918, 10016524, '0003', 'Contract Completion', '90 day plant warranty is not over 
Yard checks to be completed 
DG be compacted', NULL, 0, 'sold', '2021-08-10', '2021-08-10 08:48:35'),
  (4124179, 10391726, '0003', 'Remove swale and haul.', 'Remove concrete swale and haul to dump.', NULL, 500.00, 'pending', '2021-08-10', '2021-08-10 09:36:04'),
  (4124363, 7799379, '0039', 'Wall cap, added steps, extra soil removal', '1- At bottom for smoker moved out to make wider additional concrete 18"x25''  $350
2- We now have a total of 40 steps and a total of 145 LF of steps (there will be more added). We had 96 ln feet in change order.  $2695
3- 1 man day to demo part of pool on rain garden area and haul.  $625
4- Remove and haul soil from AC area (not ib previous change order/contract). Area 2 Man Days. Two extra loads of hauling. $2800
5- Demo for drainage installation at bottom walkway to Park area - 2 man days plus material  $1200
6- demo rain garden wall 1/2 man day and haul.  $450
7- Poured in Place wall cap 71 ln feet  $4615', NULL, 12735.00, 'pending', '2021-08-10', '2021-08-10 10:10:36'),
  (4124703, 10202889, '0005', 'CREDIT: 40 lnft drainage from contract', NULL, NULL, -1000.00, 'pending', '2021-08-10', '2021-08-10 11:12:27'),
  (4125542, 10003679, '0007', 'Contract Completion', NULL, NULL, 0, 'pending', '2021-08-10', '2021-08-10 13:33:28'),
  (4125547, 10202889, '0006', 'Contract Completion', NULL, NULL, 0, 'sold', '2021-08-10', '2021-08-10 13:33:51'),
  (4125557, 9978406, '0004', 'Contract Completion', NULL, NULL, 0, 'pending', '2021-08-10', '2021-08-10 13:35:02'),
  (4125572, 9977850, '0004', 'Contract Completion', NULL, NULL, 0, 'sold', '2021-08-10', '2021-08-10 13:37:47'),
  (4125575, 10042815, '0010', 'Contract Completion', NULL, NULL, 0, 'pending', '2021-08-10', '2021-08-10 13:38:07'),
  (4125589, 9680412, '0026', 'Contract Completion', NULL, NULL, 0, 'sold', '2021-08-10', '2021-08-10 13:39:57'),
  (4125591, 7666319, '0040', 'Contract Completion', NULL, NULL, 0, 'pending', '2021-08-10', '2021-08-10 13:40:10'),
  (4125595, 9902783, '0019', 'Contract Completion', NULL, NULL, 0, 'pending', '2021-08-10', '2021-08-10 13:40:34'),
  (4127988, 10233398, '0004', 'Shut off valve for backyard', 'Adding shut off valve for backyard irrigation valves.', NULL, 150.00, 'pending', '2021-08-11', '2021-08-11 09:22:50'),
  (4130076, 10233398, '0005', 'Contract Completion', NULL, NULL, 0, 'pending', '2021-08-11', '2021-08-11 15:22:53'),
  (4130085, 10322924, '0006', 'Contract Completion', NULL, NULL, 0, 'pending', '2021-08-11', '2021-08-11 15:24:01'),
  (4130109, 10783978, '0001', 'New timer', 'New timer and wiring.Verbally approved by Charles.', NULL, 400.00, 'pending', '2021-08-11', '2021-08-11 15:28:01'),
  (4130365, 10553589, '0007', 'Upgrade lighting', 'See lighting choices and notes:

3 up - 2201 in black (5W LED, beam spread 30) for tree in front
9 up - 5003 in black (beam spread 60) hedge, driveway  grasses and back/side wall splashes
5 up - 5003 in black (beam spread 36) for up into trees
*3 step - 4246 in black ($325)
15 path - 6507 in black
46 LF of LED strip lighting for under cantilever steps

2 - 300 watt transformers', NULL, 325.00, 'sold', '2021-08-11', '2021-08-11 16:50:21'),
  (4131922, 8739112, '0034', 'credit for (65) Blue Fescue by Pool', NULL, NULL, -700.00, 'sold', '2021-08-12', '2021-08-12 09:03:13'),
  (4131964, 8739112, '0035', 'Add''l 1/2-1" Arroyo River Rock (400sqft)', NULL, NULL, 3200.00, 'sold', '2021-08-12', '2021-08-12 09:10:01'),
  (4131977, 8739112, '0036', 'Replacing 12 pieces of Sod (dog damage)', NULL, NULL, 200.00, 'sold', '2021-08-12', '2021-08-12 09:12:13'),
  (4132308, 10307532, '0005', 'Fix small pony wall (wall to tie into new wall)', 'Blocks on wall need repairing and restablizing before we can tie new wall into it', NULL, 200.00, 'sold', '2021-08-12', '2021-08-12 10:23:12'),
  (4134427, 10563792, '0002', '72 sf pavers added', NULL, NULL, 914.00, 'pending', '2021-08-12', '2021-08-12 22:12:21'),
  (4136869, 10233398, '0006', 'Add border stone 81 LF of Cat Grana Victorian 6x9', 'Adding border 81 LF of Cat. Grana in Victorian 6” x 9”
Wet lay border stone.
Includes labor and additional sand materials, etc.', NULL, 425.00, 'sold', '2021-08-13', '2021-08-13 13:26:31'),
  (4137233, 8160247, '0003', 'Extra demo concrete concrete pad 16"', 'A normal concrete pad has 4" anything over the 4" requires a change, this concrete pad is about 16" please see image', NULL, 968.00, 'sold', '2021-08-13', '2021-08-13 16:01:06'),
  (4137476, 10001394, '0015', 'Credit for Countertop Tile Repair', NULL, NULL, -200.00, 'pending', '2021-08-14', '2021-08-14 10:16:35'),
  (4137677, 9831009, '0024', 'Kurapia for spacing between terrace steppers', '16 flats', NULL, 1200.00, 'sold', '2021-08-15', '2021-08-15 09:01:36'),
  (4140188, 10612622, '0001', 'ACH Credit', NULL, NULL, -18.00, 'pending', '2021-08-16', '2021-08-16 11:03:36'),
  (4141487, 10553589, '0008', 'Extra 32 LF of Black Metal bender board', 'In contract I have 100 LF and we need an additional 32 LF. @$12.50/LF as in contract.', NULL, 400.00, 'sold', '2021-08-16', '2021-08-16 14:25:11'),
  (4142160, 10127581, '0008', 'Additional plants + planting', '(10) 5 gallon roses
(1) 15 gallon Eugenia
transplanting', NULL, 700.00, 'pending', '2021-08-16', '2021-08-16 18:20:02'),
  (4143610, 10391726, '0004', 'Added grading, walls, drainage', '1- Remove about 30 yards of cut and haul soils from back for new grading levels per layout.  $6,900
2- Run low voltage wire (as of now we have 250 LF. installed)  $500
3- Add about 25 LF. of drainage to down spout in front porch. Demo section of front path and reinstall. (best effort to save existing) $950
4- In front yard landscape timber wall - first 16LF. 3 courses including gravel beds and fabric coverage $1,600
5- In front yard add additional 19LF. about 5 courses pending on elevations (first course will be buried)  $2,800
6- Build about 4 LF. return wall along garage 4ft tall connected to existing retaining wall.  Standard detail footing.  $1,000
7- Backyard install 85 ln feet of 24 inch timber wall to take out grades per last requirement and wrap around tree. $13,655', NULL, 27405.00, 'pending', '2021-08-17', '2021-08-17 08:47:18'),
  (4145990, 10820925, '0001', '4 additional small hedges', '4 focus nitilda for right corner.', NULL, 160.00, 'pending', '2021-08-17', '2021-08-17 15:42:49'),
  (4146561, 9841032, '0007', 'Additional height on the water feature back wall', 'Raising the back wall up to 1 course in the center of the water feature arch, and taper down to the 40" back pilaster $5.25 X 12= $63.00
Raise the scupper to be over the mermaid
Additional Tile on the facade water side average of 1/2 of a AF, $10.75 X 12= $129.00
Additional water proofing on the back side 1/2 SF X $5.25= $63.00
$255.00 Total to raise the back of the arch to 42" + 7"= 50" plus the 3" cap, 53 inches high in the middle.', NULL, 255.00, 'sold', '2021-08-17', '2021-08-17 21:09:25'),
  (4148931, 10322924, '0007', 'Additional rtf grass', '677 additional sf of rtf grass. X $3.50= $2,369.50', NULL, 2369.50, 'sold', '2021-08-18', '2021-08-18 11:59:00'),
  (4149147, 9650717, '0009', 'Job completed', NULL, NULL, 0, 'pending', '2021-08-18', '2021-08-18 12:33:09'),
  (4149930, 8160247, '0004', '20 LF. Main water line for valves', NULL, NULL, 560.00, 'sold', '2021-08-18', '2021-08-18 15:05:24'),
  (4149967, 9831009, '0025', 'Credit for timber steps', NULL, NULL, -350.00, 'sold', '2021-08-18', '2021-08-18 15:16:52'),
  (4149979, 9831009, '0026', 'Credit for (1) irrigation zone', NULL, NULL, -950.00, 'sold', '2021-08-18', '2021-08-18 15:19:01'),
  (4152203, 10829279, '0001', 'One yard of mulch and soil', NULL, NULL, 600.00, 'pending', '2021-08-19', '2021-08-19 10:35:27'),
  (4154100, 9760016, '0022', 'Missing pavers', 'Need 2 more rectangular pavers Stepstone to match what we have.
Add black pebble in-between same as what we have. (Few bags)
Add little piece of bender board to complete pathway. 
Includes labor and material.', 'Thank you for being so patient!  We did the design and now adding more it’s looking amazing, I will try to come in person to check it out at the final job walk.  Again, thank you so much, I hope you are enjoying your summer!', 280.00, 'sold', '2021-08-19', '2021-08-19 17:04:21'),
  (4159536, 10737221, '0001', 'Tree Stump Removal', 'Remove (4) tree stumps', NULL, 1560.00, 'pending', '2021-08-23', '2021-08-23 08:52:50'),
  (4159974, 10322184, '0002', 'CREDIT TO CLOSE JOB', NULL, NULL, -4357.50, 'pending', '2021-08-23', '2021-08-23 10:12:23'),
  (4160071, 8160247, '0005', 'Gas main line 110LF.', NULL, NULL, 3600.00, 'sold', '2021-08-23', '2021-08-23 10:30:07'),
  (4160140, 9912505, '0002', 'Added demo and shed area', 'Demo concrete slab nearest concrete steps (18 SF)

Remove brick at back shed area and spread out small pebbles (13 LF)

Re-install brick border at back shed with half brick showing (acting as a bender board for pebbles)', NULL, 450.00, 'sold', '2021-08-23', '2021-08-23 10:42:26'),
  (4160178, 9912505, '0003', 'Shed brick steps (thin set)', 'Wet lay (2) 2''6" LF brick steps on top of concrete
Remove turf and add soil underneath, compact
Re-install turf after brick steps are complete and seam up', NULL, 250.00, 'sold', '2021-08-23', '2021-08-23 10:48:47'),
  (4160254, 9912505, '0004', 'Side brick steps (thin set)', '(2) steps at side door 13 LF with border and herringbone infill', NULL, 850.00, 'sold', '2021-08-23', '2021-08-23 11:03:55'),
  (4161771, 9902783, '0020', 'Credit as per design agreement', 'Credit as per design agreement.', 'See design job for signed design agreement', -600.00, 'sold', '2021-08-23', '2021-08-23 15:17:16'),
  (4161801, 9964015, '0019', 'Credit as per design agreement', 'Credit for design agreement dated 02/22/2021', NULL, -800.00, 'sold', '2021-08-23', '2021-08-23 15:27:04'),
  (4162156, 10233398, '0007', 'Additional sod 217 SF', 'Additional 217 SF of creeping red fescue for expanded grass area', NULL, 1045.00, 'sold', '2021-08-23', '2021-08-23 17:40:31'),
  (4162192, 9841032, '0008', 'Sand Finish on Patio', 'Based on 1,170 Sf of Concrete pour, Sand fnish $.75, (75 cents) per SF
$877.50', NULL, 877.50, 'sold', '2021-08-23', '2021-08-23 18:05:51'),
  (4165697, 8630833, '0009', 'CREDIT', NULL, NULL, -1000.00, 'pending', '2021-08-24', '2021-08-24 14:23:49'),
  (4165967, 10307532, '0006', 'Remove (4) Tree Stumps', '(1) stump was included in the original contract', NULL, 1560.00, 'sold', '2021-08-24', '2021-08-24 15:16:16'),
  (4166099, 10233398, '0008', 'Credit for (2) 1g Cotelydon orbiculata', 'Credit for (2) plants that we cannot find Cotelydon orbiculata (Pig’s Ear).  

Beds are full of plants and all looks good.', NULL, -43.00, 'sold', '2021-08-24', '2021-08-24 15:51:20'),
  (4166209, 10513078, '0001', 'Addition to 9" curb / up to 24" Pour', '57''L x 24"H Curb would be $3817 - $217 Discount = $3600', NULL, 3600.00, 'pending', '2021-08-24', '2021-08-24 16:38:53'),
  (4166579, 10042815, '0011', '(1) Brass valve not used', 'We did not use (1) brass valve that was on contract, we did use the piping for it, but not the actual brass valve material.  This is a credit for that.', 'See latest log', -50.00, 'pending', '2021-08-24', '2021-08-24 21:17:05'),
  (4166635, 10563792, '0003', 'Credit for plants', 'See daily log:
8 5 gallon plants @ $43.50=  $348.00
3 15 gallon podocarpus  @ $150.00= $450.00
Total Credit:  $798.00', NULL, -798.00, 'pending', '2021-08-24', '2021-08-24 22:56:27'),
  (4166638, 10563792, '0004', 'Gravel', 'Installing geotextile fabric 140 SF and 6" of basic gravel @ $4.65 SF= $651.00', NULL, 651.00, 'pending', '2021-08-24', '2021-08-24 23:01:59'),
  (4170702, 10307532, '0007', '(7) 15 gallon Carolina Cherry Shrubs', NULL, NULL, 2500.00, 'sold', '2021-08-25', '2021-08-25 18:47:26'),
  (4170878, 10553589, '0009', 'Gutter', 'Demo gutter (street side)
Form up
Pour concrete 3000 psi city mix for up to 17 LF.
Install asphalt infill at street', NULL, 469.00, 'sold', '2021-08-25', '2021-08-25 22:07:30'),
  (4173150, 9067548, '0002', 'Remove tree and stump, add additional concrete', '1) Remove 16 foot tall Jacaranda.
2) Remove stump from hillside that is in the way of the wall location
3) Remove additional concrete from side gate to driveway
4) Install new walkway with the rest of the pour from side gate to driveway.', NULL, 2800.00, 'sold', '2021-08-26', '2021-08-26 11:50:13'),
  (4173160, 10690372, '0002', 'Contract Completion', NULL, 'Client is on maintenance, not sure how often.', 0, 'sold', '2021-08-26', '2021-08-26 11:51:06'),
  (4173300, 9760016, '0023', 'Trash can pathway to driveway', '33 LF of black bender board ($360)
12 (2 x 2) Stepstone pavers ($880)
Del Rio inbetween pads (we have enough on site from beds, some areas of beds are very full with gravel and we can use some inbetween the steppers - approx 2” between each stepper, not that much gravel)', '2 x 2s are in Picture Build yard.', 1240.00, 'pending', '2021-08-26', '2021-08-26 12:10:47'),
  (4173329, 10553589, '0010', 'Additional apron LF no charge', 'Brian has gifted Amy 2 LF of apron at approx $250/LF for a total of $500.', NULL, 0, 'sold', '2021-08-26', '2021-08-26 12:15:12'),
  (4174172, 10001394, '0016', 'Irrigation repair for backyard planter', NULL, NULL, 300.00, 'sold', '2021-08-26', '2021-08-26 14:42:06'),
  (4174625, 9831009, '0027', 'Job completed', NULL, NULL, 0, 'pending', '2021-08-26', '2021-08-26 17:26:06'),
  (4177847, 10043446, '0019', 'Final job walk complete', NULL, NULL, 0, 'pending', '2021-08-27', '2021-08-27 15:51:08'),
  (4180540, 10737906, '0001', 'Additional Work', NULL, NULL, 1673.00, 'pending', '2021-08-30', '2021-08-30 10:45:20'),
  (4181127, 10563792, '0005', 'Contract Completion', NULL, NULL, 0, 'pending', '2021-08-30', '2021-08-30 12:14:19'),
  (4182580, 9841032, '0009', '40 additional Sf of concrete', '40 additional sf of colored. Concrete. $11.00 + .75=  $11.75 a sf. = $470.00', NULL, 470.00, 'sold', '2021-08-30', '2021-08-30 19:10:16'),
  (4188355, 10553589, '0011', 'Credit for LF of cantiliver steps in front', 'We went from 88 LF to approx 82 LF of cantilever steps at front entrance.', NULL, -400.00, 'sold', '2021-09-01', '2021-09-01 10:03:38'),
  (4188368, 10553589, '0012', 'Back garage wall 2” thicker (poured concrete)', 'Adding 2” to the thickness of concrete planter wall (continuous 2nd step out of garage)
Poured in place approx. 21 LF at 14” thickness', NULL, 420.00, 'sold', '2021-09-01', '2021-09-01 10:06:03'),
  (4189067, 10553589, '0013', 'Additional 1.5’ on each side of steps near garage', 'Adding 1.5’ (or 18”) on each side of garage steps. Landing pad should go to end of garage wall.

Landing pad - 3’2” x 7’ 2 1/2” (1st step) with 14” step treads
(3rd step ) 7’ 2 1/2” with 14” step treads', NULL, 450.00, 'sold', '2021-09-01', '2021-09-01 12:05:59'),
  (4189130, 10553589, '0014', 'Poured in place concrete wall 4”', '20.7 LF of 4” grey concrete poured in place wall up against front of house. 
Cover and close up the fireplace clean out.
Smooth stucco from top to below soil level.', 'Carlos said he will pour this right up against house with no gaps.', 830.00, 'sold', '2021-09-01', '2021-09-01 12:14:17'),
  (4189256, 9912505, '0005', '1 punchout GFI outlet', 'One punch-out GFI outlet includes labor.', NULL, 200.00, 'sold', '2021-09-01', '2021-09-01 12:30:43'),
  (4189856, 10553589, '0015', 'Credit for driveway sectioned pads w/ DG', 'We are now doing a straight concrete pour in your driveway with scoring instead of sectioned pads with DG in-between.

Under contract addendum see page 1….
Concrete Sectioned Pads - Entrance of driveway up to gate
DG - $375
Wooden Forms - $400', 'I will still need TOTAL SF of concrete flatwork #’s to make sure we hit our mark.  The credits above are for forming and DG, not for SF of concrete. Thanks!', -775.00, 'sold', '2021-09-01', '2021-09-01 14:22:00'),
  (4190421, 10553589, '0016', 'Credit for no base in concrete flatwork', 'No base in our concrete pours (including under any stepping pads).', NULL, -550.00, 'sold', '2021-09-01', '2021-09-01 16:19:04'),
  (4195807, 10513078, '0002', 'CREDIT', NULL, NULL, -1000.00, 'pending', '2021-09-03', '2021-09-03 08:47:30'),
  (4197157, 10951109, '0001', 'Credit for Permit Allowance', 'Permit for apron - $437
Admin hours - 1 hour @ $100 per hour

Total Allotment in Contract: $1,000 - $547= $453I meant $110 an hour as in contract! Typo there.', NULL, -453.00, 'sold', '2021-09-03', '2021-09-03 13:50:51'),
  (4197173, 10951109, '0003', 'Demo of existing driveway and pathway only', 'Demo/Grading
 
1.Remove existing concrete driveway at 7” below final grade up to gate and not beyond.
2. Remove existing pathway at 7” below final grade.
3. Be careful of grass.
4. Haul all materials to appropriate sites.
*Soil maybe imported if grade needs to rise, but we should have enough after taking out 7” of soil in driveway to build it up on the exit. If soil is needed, we will have to do a change order.
**Wall demo TBD (as soon as we get on site) This cost does not include wall.

COST: $3,532', NULL, 3532.00, 'sold', '2021-09-03', '2021-09-03 13:53:47'),
  (4197604, 9067501, '0011', 'Add DG Stabilizer', NULL, NULL, 940.00, 'pending', '2021-09-03', '2021-09-03 17:15:31'),
  (4197633, 10951109, '0004', 'Pavers', 'Paving Stone

1. Install 3 inches of class II road base for pavers in driveway and pathway areas.
2. Install one inch of screeded sand bed.
3. Install approx.1466 SF of Angelus Holland in Cream, Brown, Charcoal TUMBLED.
4. Compact Pavers.
5. At borders dig trenches and pour concrete bond beams.
6. Wet-lay pavers over borders.
7. Install joint sand.
8. Recompact pavers.
9. Clean and water test.
(Upgrade option - add polymeric sand in joints instead of regular sand $1,800)

COST: $16,525', NULL, 16525.00, 'sold', '2021-09-03', '2021-09-03 18:14:15'),
  (4205771, 10491463, '0001', 'Move step ( Redo Step )', NULL, NULL, 2400.00, 'pending', '2021-09-08', '2021-09-08 12:20:12'),
  (4205791, 10491463, '0002', '(2) Add''l Step Lights', NULL, NULL, 450.00, 'pending', '2021-09-08', '2021-09-08 12:22:07'),
  (4205833, 9067548, '0003', 'Add Pool Coping, remove from Waterworks contract.', 'Picture build will take over the installation of the pool coping which is $6,200. 

Water works will remove this from their contract at the exact same price.  So the pool contract will be $6,200 less. 

We will be doing Bellecrete precast with grouted joints.', NULL, 6200.00, 'pending', '2021-09-08', '2021-09-08 12:27:21'),
  (4209010, 10917305, '0001', 'Extra Demo for concrete under deck', NULL, NULL, 800.00, 'sold', '2021-09-09', '2021-09-09 09:33:41'),
  (4209075, 10713700, '0002', 'Engineering', NULL, NULL, 5000.00, 'pending', '2021-09-09', '2021-09-09 09:41:50'),
  (4210010, 9380894, '0001', 'Design Credit due', NULL, NULL, -375.00, 'pending', '2021-09-09', '2021-09-09 12:20:43'),
  (4210224, 4128999, '1905558', 'CREDIT', NULL, NULL, -938.00, 'pending', '2021-09-09', '2021-09-09 12:54:10'),
  (4210356, 4300720, '1913415', 'CREDIT', NULL, NULL, -822.00, 'pending', '2021-09-09', '2021-09-09 13:16:44'),
  (4210820, 10951109, '0005', 'Credit for parking permit', 'Parking permit for 2 cars 
10 days', NULL, -63.50, 'sold', '2021-09-09', '2021-09-09 14:37:16'),
  (4211331, 9680412, '0027', 'Water Credit', NULL, NULL, -75.60, 'pending', '2021-09-09', '2021-09-09 18:02:25'),
  (4212425, 10391726, '0005', 'Added Masonry and Steps, Credit for reduced Timber', '1) Add Masonry curb to hide footing on south side of property -  Need to chip and form and pour in place. 
$2250

2) Add 3 (5) foot concrete steps for south side of property with new layout - 
$975

3) Add 3 steps for north side of property new location. - 
$0 No Charge.  Included in existing contract

4) Need to add new 19 foot Block wall on fence line of north side of property in order to retain new concrete steps at higher elevation to cover the metal flashing and footing per request. 

Includes demo of existing fencing and haul. 
Includes demo of large existing footing on property line  that has to come out anyway for tile elevation Footing on property line wall to be 12 x 12
$3900

5) Backyard reduced timber wall by one course with new grade requirements.  
($2200) Credit

6) Retier backyard wall per request.  Haul waste $800', NULL, 5725.00, 'sold', '2021-09-10', '2021-09-10 08:14:36'),
  (4214144, 10553589, '0017', 'Extra hauling and demo in front yard', 'As per Melinda, we used up 2 truckloads of hauling for front yard grading.  Lots of roots and stumps, etc.  

Only included in Lawn area was fine grading, so this is additional. I checked grade today and looks amazing. We needed to take it out and lower area nearest tree.', NULL, 500.00, 'sold', '2021-09-10', '2021-09-10 13:51:15'),
  (4214160, 10951109, '0006', 'Credit for switching to non-tumbled', 'Not using a tumbled paver $1/SF credit for 1,466 SF', NULL, -1466.00, 'sold', '2021-09-10', '2021-09-10 13:55:08'),
  (4214215, 10951109, '0007', 'Polymeric sand for pavers', 'Polymeric sand for in-between pavers in driveway and pathway.', NULL, 1800.00, 'sold', '2021-09-10', '2021-09-10 14:06:40'),
  (4214808, 10700300, '0001', 'Credit for smart timer', 'Not doing smart timer, using their existing rainbird with 12 zones', NULL, -400.00, 'pending', '2021-09-11', '2021-09-11 10:57:27'),
  (4214836, 10700300, '0002', 'Add Sod to parkway', '240 SF of Marathon 1
Includes demo
Irrigation is already covered.', NULL, 860.00, 'pending', '2021-09-11', '2021-09-11 11:35:25'),
  (4218942, 10307532, '0008', 'Job completion', NULL, NULL, 0, 'pending', '2021-09-13', '2021-09-13 15:22:35'),
  (4219139, 10917305, '0002', 'Demo 27'' concrete walkway/(10) concrete steppers', 'Removing existing concrete walkway
Adding (10) 2x2 concrete steppers', NULL, 1300.00, 'sold', '2021-09-13', '2021-09-13 16:21:38'),
  (4219143, 10917305, '0003', 'Stump Grind 36"x36" stump, aggressive root system', NULL, NULL, 375.00, 'sold', '2021-09-13', '2021-09-13 16:22:49'),
  (4219200, 10951109, '0008', 'Credit #2 for parking permit', '2 cars @ 10 days @ $3/day + $3.50 convenience fee = $63.50', NULL, -63.50, 'sold', '2021-09-13', '2021-09-13 16:47:18'),
  (4221127, 10951109, '0009', 'Stucco 100 SF', '100 SF of stucco
Building out wall to approx 8 1/2" nearest gate
Includes color', NULL, 975.00, 'pending', '2021-09-14', '2021-09-14 09:30:45'),
  (4222384, 10737906, '0002', 'Additional 14 sf I f turf.', '$14.00 A sf 14 additional sf  = $196.00.', NULL, 196.00, 'pending', '2021-09-14', '2021-09-14 12:41:18'),
  (4222655, 10951109, '0010', 'New black tubing drip line for plants near A/C', 'Add 20 LF of new black tubing for existing and future plants nearest A/C unit. 

Make sure water is irrigating to that area.

Might add plants at a later date.', NULL, 200.00, 'sold', '2021-09-14', '2021-09-14 13:29:21'),
  (4222676, 9912505, '0006', 'Credit for switch', 'We did the wiring but did not add a new switch.', NULL, -70.00, 'sold', '2021-09-14', '2021-09-14 13:31:42'),
  (4222755, 10700300, '0003', 'Drainage 200 LF', 'Entire property needs new drainage approx 200LF of 3" SDR pipe.
Includes trenching, 6 grates, and all labor.

Tie in all gutters into new drainage.
Drainage will go out to curb.
One inlet in grass zone.

Victor reviewed with client that old drainage was clogged and damaged.', NULL, 3900.00, 'sold', '2021-09-14', '2021-09-14 13:45:16'),
  (4222854, 10917305, '0004', '80sqft Sod', NULL, NULL, 300.00, 'sold', '2021-09-14', '2021-09-14 14:07:31'),
  (4223134, 10553589, '0018', 'Stucco for long short wall along driveway', 'Stucco the entire wall and top of wall along driveway and patch the end of wall where it is currently not finished. Approx. 100 SF of wall to be stucco. 

COLOR tbd by client.', NULL, 975.00, 'pending', '2021-09-14', '2021-09-14 15:16:11'),
  (4227159, 10917305, '0005', '50sqft of Gravel', 'Del Rio', NULL, 200.00, 'sold', '2021-09-15', '2021-09-15 14:25:24'),
  (4227163, 10917305, '0006', '120 linear feet of bender board for gravel areas', NULL, NULL, 1000.00, 'sold', '2021-09-15', '2021-09-15 14:26:01'),
  (4227351, 10917305, '0007', '(4) 5 gallon plants', '(2) 5 gallon staked pale pink roses 
(1) 5 gallon Buddleja (purple)
(1) 5 gallon Salvia Apiana', NULL, 180.00, 'sold', '2021-09-15', '2021-09-15 15:05:43'),
  (4227688, 10513078, '0003', 'Final completion project', NULL, NULL, 0, 'pending', '2021-09-15', '2021-09-15 17:39:25'),
  (4229068, 8330556, '0014', 'Client confirmed that she would keep the tree.', NULL, 'what tree? where? this change order is wayyyy to vague to be enforceable.', 0, 'pending', '2021-09-16', '2021-09-16 08:37:15'),
  (4230110, 10982964, '0001', 'Design credit.', NULL, NULL, -375.00, 'pending', '2021-09-16', '2021-09-16 11:17:34'),
  (4230135, 10982964, '0002', 'Upgrade to belgard Catalina grana in bella', NULL, NULL, 517.40, 'sold', '2021-09-16', '2021-09-16 11:22:26'),
  (4231279, 9912505, '0007', 'Final project completion', NULL, NULL, 0, 'pending', '2021-09-16', '2021-09-16 15:23:26'),
  (4232940, 10345652, '0001', 'Additional lighting', '(22) path and spread lights for front and behind studio
(1) uplight front tree
(1) uplight lemon tree in back
(4) uplights for along front fence
(2) down lights for front tree', NULL, 6125.00, 'pending', '2021-09-17', '2021-09-17 08:54:28'),
  (4234817, 10182293, '0001', 'Design additional', NULL, NULL, 1300.00, 'pending', '2021-09-17', '2021-09-17 17:56:44'),
  (4237684, 10728309, '0001', 'Shrub removal front entry garden beds', 'As per our discussion during the job walk
Remove shrubs around light pole
Remove shrubs to the left of mailbox', NULL, 525.00, 'sold', '2021-09-20', '2021-09-20 11:02:02'),
  (4237749, 10728309, '0002', 'Transformer for lights', NULL, NULL, 430.00, 'sold', '2021-09-20', '2021-09-20 11:12:29'),
  (4237772, 10728309, '0003', 'Sleeves for future lights/electric', '22 linear feet', NULL, 265.00, 'sold', '2021-09-20', '2021-09-20 11:14:48'),
  (4238057, 10700300, '0004', 'Removal of Birch tree', 'Removal of Birch tree (does not include removing ALL the roots)
Includes stump grinding', NULL, 1200.00, 'sold', '2021-09-20', '2021-09-20 11:54:43'),
  (4238220, 10700300, '0005', 'Added grass nearest neighbor', '96 LF of Marathon sod added to front lawn grass area (Nearest neighbor)', NULL, 300.00, 'sold', '2021-09-20', '2021-09-20 12:20:20'),
  (4238238, 10700300, '0006', 'Adding 23 SF of paver', 'Adding 23 SF of paver near birch tree (removal). 

Cost value: $239
Gift to Nate and Kate per Nicole', NULL, 0, 'sold', '2021-09-20', '2021-09-20 12:22:19'),
  (4238609, 10700300, '0007', 'Block wall and concrete (driveway near old gate)', '11’ x 8” of concrete pour in gap in driveways.
6’ x 6” of spec mix applied to existing CMU non-retaining wall.
Includes labor.', NULL, 500.00, 'sold', '2021-09-20', '2021-09-20 13:22:33'),
  (4238888, 10917305, '0008', 'Final project completion', NULL, NULL, 0, 'pending', '2021-09-20', '2021-09-20 14:09:02'),
  (4238961, 10717157, '0001', 'Moving valves', '5 man hours x $75.00= $375.00$140.00. Materials. total. $515.00', NULL, 515.00, 'pending', '2021-09-20', '2021-09-20 14:20:46'),
  (4238972, 10717157, '0002', 'Electrical line and outlet gfi', '26 linear feet of line. 1 GFI  outlet', NULL, 937.00, 'pending', '2021-09-20', '2021-09-20 14:22:21'),
  (4238982, 10717157, '0003', 'Additional 36 sf of pavers x $14.00. $504.00', NULL, NULL, 504.00, 'pending', '2021-09-20', '2021-09-20 14:23:36'),
  (4240870, 10982964, '0003', 'Credit for Trellis Install', 'Credit for install, Craig Kengla will be installing the pergola', NULL, -1200.00, 'pending', '2021-09-21', '2021-09-21 08:19:41'),
  (4241145, 10737906, '0003', 'Breaker adding to panel.', NULL, NULL, 275.00, 'sold', '2021-09-21', '2021-09-21 09:01:42'),
  (4245617, 10728309, '0004', 'Add''l water main line', '10 linear feet', NULL, 300.00, 'sold', '2021-09-22', '2021-09-22 10:02:41'),
  (4245623, 10728309, '0005', 'Add''l pavers for behind gate entry', '20sqft', NULL, 225.00, 'sold', '2021-09-22', '2021-09-22 10:03:04'),
  (4245708, 10700300, '0009', 'Pick up for tile and delivery', 'Pick up tile and delivery at cost.', NULL, 200.00, 'sold', '2021-09-22', '2021-09-22 10:15:24'),
  (4245749, 10700300, '0010', 'Add step 7’ x 7” to tile area', 'We are filling in 7’ x 7” wide of step.

This is so the step will be a full tile and not cut. The esthetic will be more pleasing.', NULL, 375.00, 'sold', '2021-09-22', '2021-09-22 10:24:24'),
  (4250507, 10658820, '0001', 'CREDITS', NULL, NULL, -853.06, 'pending', '2021-09-23', '2021-09-23 10:36:45'),
  (4251580, 10811242, '0001', '340 sqft of RTF', NULL, NULL, 1190.00, 'pending', '2021-09-23', '2021-09-23 13:29:56'),
  (4252664, 10811242, '0002', 'Plants final count itemized', 'Please see attached list:
Red are plants that we didn''t install
Black are plants that we did install
Green are plants that we are adding

Total credit:  -$454.50', NULL, -454.50, 'pending', '2021-09-23', '2021-09-23 21:40:53'),
  (4255257, 10700300, '0011', 'Adding (1) 5g Mandevillea White vine', 'Adding (1) Mandeville (white) vine to planting plan to climb up post and onto trellis that is above the new tile area. Place in corner.', NULL, 40.00, 'sold', '2021-09-24', '2021-09-24 13:46:39'),
  (4255722, 10951109, '0011', 'Stucco and tile repair', 'Stucco repair to side of home nearest planter/gate. $300
Tile installation to bottom of front patio step (5-6 pieces, client purchased direct) $50', NULL, 350.00, 'sold', '2021-09-24', '2021-09-24 16:59:39'),
  (4256025, 10679131, '0001', 'Contract Completion', NULL, NULL, 0, 'pending', '2021-09-25', '2021-09-25 13:46:31'),
  (4259070, 11066555, '0001', 'Import 50/50 amendment to future seed grass area', 'Adding approx 5.5 yards of import 50/50 soil to grass area.  
I had 3.5 yards in contract for $300 and production informed me we will need 9yards total to cover at 3” depth.  This will allow the seed area to have best potential for growth.', NULL, 475.00, 'sold', '2021-09-27', '2021-09-27 12:01:35'),
  (4259524, 10717157, '0004', 'Final contract completion', NULL, NULL, 0, 'pending', '2021-09-27', '2021-09-27 13:08:13'),
  (4260434, 10737906, '0004', 'Additional turf. 122 square feet x $14.00', 'Victor and I had to make a concession in the additional Sf  that was mismeasured.', NULL, 804.00, 'pending', '2021-09-27', '2021-09-27 16:44:26'),
  (4260613, 10717130, '0001', 'Gas Line', 'Gas line taken from the stub up on the house 26 Linear feet to the fire pit.   Permit separate change', NULL, 858.00, 'sold', '2021-09-27', '2021-09-27 19:04:52'),
  (4260614, 10717130, '0002', 'additional pavers', '35 additional square feet of pavers, X $13.25  backyard paver price', NULL, 463.75, 'sold', '2021-09-27', '2021-09-27 19:07:31'),
  (4260626, 10717130, '0003', 'Electrical Line from the Electrical Box', 'Total linear Feet of electrical line 150 LF
2 outlets already included
40 Lineaer Feet included in the contract
Additional 110 of electrcial line needed.  Use of the outdoor electrical boxes have not had enough wattage to support the power equipment of the paver crew on site.  This is a clue that the outlets do not have enough wattage to support 2 new outlets.  The electrical will now have to come from the box. 
We are reducing the per linear foot cost because it is over 100 Linear feet to $19.00 a Linear foot
110 Linear Feet X  $18.00= $1,980.00', NULL, 1980.00, 'sold', '2021-09-27', '2021-09-27 19:15:03'),
  (4261865, 10717130, '0004', 'Permit fees', 'Electrical permit $98.10
Gas/plumbing $64.95
Total: $163.05', NULL, 163.05, 'sold', '2021-09-28', '2021-09-28 08:14:23'),
  (4263621, 9118708, '0005', 'Drain paver repair', 'Need to remove a 5x5 area of pavers add about 5 LF. Of drainage with black drain grate
Backfill and compact install pavers add sand and compact pavers.', NULL, 800.00, 'pending', '2021-09-28', '2021-09-28 12:52:10'),
  (4263821, 10345652, '0002', '(1) 15 gallon Ruby Red Grapefruit Tree (dwarf)', NULL, NULL, 315.00, 'pending', '2021-09-28', '2021-09-28 13:23:23'),
  (4263970, 10345652, '0003', 'Add''l plants side of house/backyard', '(6) 5 gallon Hydrangea macrophylla 
(18) 1 gallons of Lamb''s ear, Santolina, Sedum', NULL, 660.00, 'pending', '2021-09-28', '2021-09-28 13:44:59'),
  (4264155, 8309666, '0009', 'Turf Repair and reinstall 710 sf.', NULL, NULL, 6567.00, 'pending', '2021-09-28', '2021-09-28 14:17:15'),
  (4264665, 10951109, '0012', 'Additional stucco repair', 'This is apart of the total stucco price. Nicole made a mistake in calculation of how much would it actually be from photos alone.  The work is more.', NULL, 275.00, 'sold', '2021-09-28', '2021-09-28 17:00:16'),
  (4264795, 11066555, '0002', 'Credit for Stepstone French Grey Pavers', 'We are NOT ordering (2) French Grey stepstone steppers 18 x 36”.

Laura has purchased her own 2x2’s.', NULL, -175.00, 'sold', '2021-09-28', '2021-09-28 18:26:20'),
  (4266477, 4186919, '2127177', 'Paver repair only', NULL, NULL, 950.00, 'pending', '2021-09-29', '2021-09-29 09:27:27'),
  (4268604, 10951109, '0013', 'Contract completion', 'Thank you for giving us the chance to work on your project.', NULL, 0, 'sold', '2021-09-29', '2021-09-29 15:59:13'),
  (4268988, 10391726, '0006', 'Planting, Soil Work and Irrigation Addition', 'Irrigation
1) Add one subterranean drip system with flush and backflow connections per plan
2) Change out timer to plan specific Hunter controller with sun sensor system.
3) Extend additional drip zones to stub ups by the footing ledge in back of the house.

Planting
1) 36 inch Querces Lobata - Pick up and deliver from Riverside
2) 36 inch Cercus Occidentalis - Still need to source.   Boething''s  are not good.
3) 15 gallon Meyer Lemon
4) (5) 15 gallon Conch Ceonthus
5) (9) 15 gallon Carpenteria  Californica
6) (3) 15 gallon Ceanothus Griseus
7) (9) 15 gallon Polystichum Muntum
8) (2) 5 gallon Dwarf Coyote Bush
9) (3) 5 gallon Salvia Apiana
10) (6) 5 gallon Salvia Clevelandii
11) (6) 5 gallon Albutinon Palmeri
12) (11) 5 gallon Eriogonum Fasciculatum
13) (11) 5 gallon Salvia Mellifera
14) (33) 1 gallon Chalk Dudleya
15) (11) 1 gallon Muhlenbergia Rigens
16) (18) 1 gallon Epilobium Canum
17) (8) 1 gallon Eschscholzia Californica
18) (6) 1 gallon Penstemon Centranthifolius
19) (10) 1 gallon Heuchera Maxima
20) 2 flats Satureja Douglasii

Crane Rental 
Rent medium crane to handle up to 1500 lbs.

Soil Preparation
Hand till down to 6 inches all soils on property.  Requires a full crew almost 2 days.
Introduce the following soils amendments
Potassium sulfate (0-0-50) – 6 pounds for Frontyard, 8 pounds for Backyard
Agricultural gypsum - 20 pounds for Frontyard, 30 pounds for Backyard
Organic soil amendment - about 4 cubic yards, sufficient for 4% to 6% soil
organic matter on a dry weight basis
(Note Organic soil amendments with the exact specifications as noted in report may be difficult to acquire)

Subtotal -  $24600

Less $800 credit from Picture Build sharing cost as we will be using the Crane while it is there.

Total Change Order  $23,800', NULL, 23800.00, 'sold', '2021-09-29', '2021-09-29 19:11:30'),
  (4269009, 10553589, '0019', 'Additional 73 SF of St. Augustine sod', 'In contract we have 2,707 SF and the measurements are 2,780 SF for St. Augustine sod.

This is because you minimized the cantilever steps which added 64 SF of grass. 
The additional 9 SF are from plans not being exact, which is typical in our industry.', NULL, 328.00, 'sold', '2021-09-29', '2021-09-29 19:35:17'),
  (4269786, 10563668, '0001', 'Additional pavers correction', '238 courtyard, and 170 entry  

2.  408 total

on page 3 the total was 238 X $14.00= $3,332.00

I mistakenly didn''t add in the 170 pavers for the entry.

The correct total is $5,712.00  

The difference that we need to add is $2.380.00.', NULL, 2380.00, 'pending', '2021-09-30', '2021-09-30 07:22:31'),
  (4271781, 10932457, '0001', 'Additional demo', 'Removal of 10  extra yards of soil', NULL, 1500.00, 'pending', '2021-09-30', '2021-09-30 12:53:25'),
  (4272460, 9841032, '0010', 'Job completion', NULL, NULL, 0, 'sold', '2021-09-30', '2021-09-30 15:06:52'),
  (4272799, 11104749, '0001', 'Add''l Del Rio gravel for front', '$200 for the material upgrade
$140 for additional gravel (hugging the steppers on both sides of pathway)', NULL, 140.00, 'pending', '2021-09-30', '2021-09-30 17:21:46'),
  (4272802, 11104749, '0002', 'Bender board edging for pathway', '40 linear feet of edging', NULL, 325.00, 'pending', '2021-09-30', '2021-09-30 17:23:05'),
  (4274064, 10700300, '0012', '200 LF of 6” x 1” Bender board', 'We could not re-use the old bender-board, as it was not in great shape.

200 LF of brown 6” x 1” plastic bender-board.', NULL, 1600.00, 'sold', '2021-10-01', '2021-10-01 08:52:00'),
  (4274324, 10345652, '0004', 'Credit for mulch and gravel', NULL, NULL, -800.00, 'pending', '2021-10-01', '2021-10-01 09:40:19'),
  (4274335, 10345652, '0005', 'Additional sod for behind studio', '450sqft includes demo (removal of gravel, soils)', NULL, 1800.00, 'pending', '2021-10-01', '2021-10-01 09:43:10'),
  (4275934, 10553589, '0020', '(2) 15g pittosporum silver sheen', '(2) 15g Pittosporum silver sheen', NULL, 300.00, 'pending', '2021-10-01', '2021-10-01 15:36:18'),
  (4275965, 10982964, '0004', 'Permit Fees', 'Permit fees 
See attached', NULL, 251.32, 'pending', '2021-10-01', '2021-10-01 16:03:33'),
  (4278500, 11128437, '0001', 'Not doing 37 LF bender board', 'Decided no bender board at all on this project.', NULL, -325.00, 'sold', '2021-10-04', '2021-10-04 10:31:36'),
  (4279834, 10700300, '0013', 'Vine credit', '1g instead of 5g credit', NULL, -20.00, 'sold', '2021-10-04', '2021-10-04 13:34:22'),
  (4280219, 10345652, '0006', 'Tree Removal', '(3) Large Podocarpus 
(1) Acacia Tree', NULL, 4000.00, 'pending', '2021-10-04', '2021-10-04 14:40:48'),
  (4280381, 10737906, '0005', 'Camera Credit', NULL, NULL, -150.00, 'pending', '2021-10-04', '2021-10-04 15:23:02'),
  (4280382, 10737906, '0006', 'Add 1 light', NULL, NULL, 225.00, 'pending', '2021-10-04', '2021-10-04 15:23:16'),
  (4280517, 9067548, '0004', 'Added changes', '1- 42 LF bend a board to separate DG from planters on side yard (pool equipment area)
2- 35 LF of sewer line for outdoor kitchen sink 
3- Form for step up on walk way at gate 3.5 LF.
4- 185 sq. Feet of DG on side yard (pool equipment area). Stablized with base.
5- Add grading to raise area for putting green and sewer access. 385 sq feet x 3 inches.

Added putting green in separate change order.', NULL, 4600.00, 'sold', '2021-10-04', '2021-10-04 16:03:01'),
  (4280964, 10932457, '0002', 'Final job completion', NULL, NULL, 0, 'pending', '2021-10-04', '2021-10-04 20:56:12'),
  (4282139, 10982964, '0005', 'ADditional Pavers with upgrade of Belgard CG', '240 Square Feet X $14.00 pavers + .65 cents for Belgard Catalina Grana = $14.65 = $3,516.00', NULL, 3516.00, 'pending', '2021-10-05', '2021-10-05 08:36:00'),
  (4282155, 10982964, '0006', 'Drainage', 'This includes 120 Linear feet of drainage 3" and up to 6 drain caps and 1 pop up exit  120 lf X $23.00', NULL, 2760.00, 'pending', '2021-10-05', '2021-10-05 08:38:33'),
  (4282569, 10717130, '0005', 'AdditionL pavers', '28 x $13.25= $371.00', NULL, 371.00, 'sold', '2021-10-05', '2021-10-05 09:43:27'),
  (4283314, 10563668, '0002', 'Drainage. 65 more lf', '65lf x $25.00= $1,625.00', NULL, 1625.00, 'pending', '2021-10-05', '2021-10-05 11:40:03'),
  (4284554, 10391726, '0007', 'Exterior Stucco Work', 'Stucco Exterior Walls

Left side property wall (when facing house) 
Very Rear property wall 

Sand Finish Stucco - Paint Ready or Color coat', NULL, 2800.00, 'sold', '2021-10-05', '2021-10-05 14:51:44'),
  (4284590, 10982964, '0007', 'One more pathlight', NULL, NULL, 225.00, 'pending', '2021-10-05', '2021-10-05 15:04:55'),
  (4284612, 10982964, '0008', 'Electrical', 'Adding 28 linear feet. One outlet additional. For all lines to outdoor kitchen and fountain.', NULL, 644.00, 'pending', '2021-10-05', '2021-10-05 15:09:51'),
  (4284620, 10982964, '0009', 'Gas line 98 lf', 'From meter to outdoor kitchen to firepit.', NULL, 3430.00, 'pending', '2021-10-05', '2021-10-05 15:13:17'),
  (4284648, 10982964, '0010', 'Water main to outdoor kitchen and spigot', 'To outdoor kitchen and spigot next to it. 24 lf.', NULL, 552.00, 'pending', '2021-10-05', '2021-10-05 15:17:59'),
  (4284913, 10717130, '0006', 'Demo cap and install 1 course + cap', 'Demo 8 ld of cap. Install 8 lf of new slump stone wall and new cap. Includes all dump and delivery $60.00 @lf X 8 lf= $480.00', NULL, 480.00, 'sold', '2021-10-05', '2021-10-05 16:34:31'),
  (4288692, 10553589, '0021', 'Credit for planting', 'I am submitting a change order. Please approve online.
Here are some changes we made at the job site for planting. We are returning some and we got some extra plants. You are getting a credit back, so it is not an extra charge. Please approve online.
4 Extra 1 gallon coralbells. This was the nurseries mistake, but we found some place for them in the front planter, and it looks nice. $86
2 Extra 1 gallon Sedum Dragon’s Blood. This was supposed to be canceled but it was not, so they delivered these by mistake. But again, we found room for them in the front planter. $43
1 Extra 5 gallon upright rosemary. This was also not supposed to be shipped but they sent it and we found room for it in front of Amy’s office window. $43
1 more 5 gallon Mauri Chief. We added one more to make the spacing even on top of the wall. $43

Returning 24 one gallon “Reullia Brittoniana Pink Katie” – Carter talked to the nursery, and they will accept the return. They sent us 5 gallons instead of one gallon. Amy and Isaac do not like the way these plants look so we will try to return them. - $480

$480 - $215 = $265 Credit', NULL, -265.00, 'sold', '2021-10-06', '2021-10-06 14:34:52'),
  (4288860, 10811242, '0003', 'Taking out 5 15 gal roses', 'Taking out plants. He plans to buy himself.', NULL, -750.00, 'sold', '2021-10-06', '2021-10-06 15:15:07'),
  (4288894, 9144542, '0009', 'Adding a 24" box olive. Swan hill', '24" box swan hill olive tagged at paramount.  They brought it to the front. Pink tag. This is to replace a 15 gal that didn''t survive. $360.00- $100.00 credit= $260.00.', NULL, 640.00, 'pending', '2021-10-06', '2021-10-06 15:24:24'),
  (4289391, 10553589, '0022', 'Credit for DG', NULL, NULL, -275.00, 'sold', '2021-10-06', '2021-10-06 18:55:45'),
  (4291985, 10700300, '0014', 'Design Credit due', NULL, NULL, -1000.00, 'pending', '2021-10-07', '2021-10-07 12:08:56'),
  (4292509, 10553589, '0023', 'Mulch 237sf / Contract adjustment per scope change', 'Mulch 923 sf (237 sf more than what was quoted on contract)
Need to get approval of a change order for $568.80 to install.', NULL, 568.50, 'sold', '2021-10-07', '2021-10-07 13:26:48'),
  (4293389, 10553589, '0025', 'Gravel -46sf /Contract adjustment per scope change', NULL, NULL, -263.00, 'sold', '2021-10-07', '2021-10-07 17:27:23'),
  (4296101, 10233398, '0009', 'Change grass to Greenwave 530sf', NULL, NULL, 500.00, 'sold', '2021-10-08', '2021-10-08 13:27:28'),
  (4303331, 11084937, '0001', 'Install (1) rachio timer and box', NULL, NULL, 80.00, 'pending', '2021-10-12', '2021-10-12 09:48:33'),
  (4305875, 9458413, '0009', '1 (15gallon) Cordelyine australis (not planted?)', 'Add one on other side of steps to match.', NULL, 0, 'pending', '2021-10-13', '2021-10-13 00:04:15'),
  (4308092, 10728309, '0006', 'Job completion', NULL, NULL, 0, 'pending', '2021-10-13', '2021-10-13 11:50:46'),
  (4309150, 10811242, '0004', 'Final sign off completion', NULL, NULL, 0, 'pending', '2021-10-13', '2021-10-13 14:54:17'),
  (4309348, 10553589, '0026', 'Credit for buffalo grass plugs', 'Credit for Buffalo Grass plugs 55 SF

We did not acquire and did not install.', NULL, -345.00, 'sold', '2021-10-13', '2021-10-13 15:47:37'),
  (4311273, 8769652, '0024', 'Seal 2070 sf of Pavers - $1.15/sf', NULL, NULL, 2380.50, 'sold', '2021-10-14', '2021-10-14 09:15:15'),
  (4311281, 8769652, '0025', '2 landscape lights and one 150W transformer', NULL, NULL, 850.00, 'pending', '2021-10-14', '2021-10-14 09:16:53'),
  (4314524, 10982964, '0011', 'Water Line Permit fee', NULL, NULL, 80.34, 'sold', '2021-10-15', '2021-10-15 06:48:59'),
  (4314554, 10982964, '0012', 'French Drain and sink drain hook up', 'See detail
trench 1'' X 2'' X 4''=  8 square feet
3'' X3" perforated pipe in sleeve
set in gravel, to be covered with geotextile fabric and Del Rio at planter level
6 hours plus materials', NULL, 535.00, 'sold', '2021-10-15', '2021-10-15 06:55:55'),
  (4315051, 10491463, '0003', 'Final contract completion', NULL, NULL, 0, 'pending', '2021-10-15', '2021-10-15 08:25:24'),
  (4316661, 10345652, '0007', 'Final contract completion', NULL, NULL, 0, 'pending', '2021-10-15', '2021-10-15 13:54:43'),
  (4317707, 11128437, '0002', 'Upgrading plants from FK Nursery', 'We are ordering all plants (except Japanese Maple Tree) from FK Nursery.
This is a premium nursery that is a bit higher per plant, but has superior quality.', NULL, 450.00, 'sold', '2021-10-15', '2021-10-15 14:06:09'),
  (4317996, 10345652, '0008', '(2) 24” Citrus Trees', '(1) Blood Orange
(1) Grapefruit', NULL, 700.00, 'pending', '2021-10-15', '2021-10-15 16:11:29'),
  (4317998, 10345652, '0009', 'Brick repairs for edging and firepit', NULL, NULL, 175.00, 'pending', '2021-10-15', '2021-10-15 16:11:59'),
  (4321407, 10491463, '0004', 'Sprinkler Work', NULL, NULL, -200.00, 'pending', '2021-10-18', '2021-10-18 12:22:52'),
  (4321781, 11084937, '0002', 'Credit for (3) 5 gallon Roses', NULL, NULL, -130.00, 'pending', '2021-10-18', '2021-10-18 13:14:02'),
  (4326920, 10982964, '0013', 'Additional pavers', '28 sf x $14.65=  $410.20
Any additional pavers will be in final count', NULL, 410.20, 'sold', '2021-10-19', '2021-10-19 15:15:21'),
  (4326926, 10982964, '0014', 'Step.build 8 linear feet', '8 lf of step build x $60.00= $480.00', NULL, 480.00, 'sold', '2021-10-19', '2021-10-19 15:16:54'),
  (4330166, 11128437, '0003', 'Credit for Mimlus Monkeyflower downsize', 'Credit for Mimulus Monkeyflower
We could only get a 1g and a 5g was in your contract, this is the cost difference.', NULL, -22.00, 'pending', '2021-10-20', '2021-10-20 12:10:53'),
  (4330380, 10700300, '0015', 'Final contract sign', NULL, NULL, 0, 'pending', '2021-10-20', '2021-10-20 12:41:45'),
  (4331680, 10982964, '0015', 'Additional Step build 6 LF', 'Steps Total:
3 Linear feet by side gate
5 Linear feet by side of house by A/C ( it is actually 5.5''
8 Added for side of raised back existing patio
6'' additional step Change order for 1 additional step 

Total: for change order 6', NULL, 360.00, 'sold', '2021-10-20', '2021-10-20 17:56:14'),
  (4331693, 10982964, '0016', 'Stepping pads credit, taken out of contract', 'Had 9 steppers at $100.00 each, with $50.00 rocks taken out.
They are being replaced with more pavers and grass.
Final count for pavers afater completion of pavers
Final count for grass at Landscape first day walkthrough', NULL, -950.00, 'sold', '2021-10-20', '2021-10-20 18:04:51'),
  (4331699, 10982964, '0017', 'Additional Drainage', '9 linear feet of drainage please see plan in current design folder under 21-10-20 Changes 
BEhind outdoor kitchen
9 X $23.00= $207.00', NULL, 207.00, 'sold', '2021-10-20', '2021-10-20 18:09:33'),
  (4331837, 10717130, '0007', '2 more pathlights.', NULL, NULL, 450.00, 'pending', '2021-10-20', '2021-10-20 20:13:25'),
  (4333676, 11128437, '0004', 'Adding one spray zone in backyard', 'Adding 1 spray zone to grass area in backyard.', NULL, 885.00, 'pending', '2021-10-21', '2021-10-21 09:51:28'),
  (4333714, 11128437, '0005', 'Add 7 LF of 3/4" sleeve for irrigation and coring', 'Core thru wall $200
7 LF of sleeve for irrigation wire. $150', NULL, 350.00, 'pending', '2021-10-21', '2021-10-21 09:56:00'),
  (4333721, 11128437, '0006', 'Add shut off valve for the lower grass area', 'Add shut off valve', NULL, 100.00, 'pending', '2021-10-21', '2021-10-21 09:56:41'),
  (4333810, 11128437, '0007', 'Sod measurement 105 SF off', 'Adding 105 SF of Marathon II', NULL, 395.00, 'pending', '2021-10-21', '2021-10-21 10:12:50'),
  (4334889, 10713700, '0003', 'Gas Line', '2 1/2 inch not available anywhere.  We barely were able to find 3", so had to upgrade to that. 

190 linear feet of 3 inch line 
and
45 linear feet of 1 1/2 line', NULL, 6580.00, 'sold', '2021-10-21', '2021-10-21 13:08:41'),
  (4335450, 11066555, '0003', '53 LF of 1” copper main line', '53 LF of 1” copper main water line.  Include labor and trenching 18” below grade per code.
Includes backfill.', NULL, 2015.00, 'pending', '2021-10-21', '2021-10-21 15:07:33'),
  (4335456, 11303103, '0001', 'Permit Allocation for retaining wall', 'Need a permit from the city of Pasadena to replace an existing retaining wall with a new one that is not leaning. 

This is the allowance, once we have obtained the permit, we will let you know the permit fee, and the admin hours that it took to obtain the permit.', NULL, 1000.00, 'sold', '2021-10-21', '2021-10-21 15:10:06'),
  (4337190, 10553589, '0027', 'Contract Completion', NULL, NULL, 0, 'sold', '2021-10-22', '2021-10-22 08:56:00'),
  (4337605, 11066555, '0004', '53 LF of 1" pvc main water line', '53 LF of 1" main water line, includes trenching, backfill and labor.', NULL, 1537.00, 'pending', '2021-10-22', '2021-10-22 10:31:13'),
  (4337828, 11104749, '0003', 'Credit for steppers( backyard) we didn’t use', NULL, NULL, -500.00, 'sold', '2021-10-22', '2021-10-22 11:17:49'),
  (4337841, 11104749, '0004', 'Irrigation valve replacement', 'Replaced (1) valve that was leaking and had been chewed through by rodents', NULL, 500.00, 'sold', '2021-10-22', '2021-10-22 11:19:06'),
  (4337980, 10717130, '0008', 'One more up light', 'One additional uplight', NULL, 225.00, 'pending', '2021-10-22', '2021-10-22 11:48:08'),
  (4338213, 10717130, '0009', 'Final project completion', NULL, NULL, 0, 'pending', '2021-10-22', '2021-10-22 12:38:22'),
  (4338500, 11104749, '0005', 'Plumbing Credit', NULL, NULL, -175.00, 'pending', '2021-10-22', '2021-10-22 13:32:40'),
  (4338969, 11128437, '0008', 'Ball valve', 'Ball valve update', NULL, 60.00, 'sold', '2021-10-22', '2021-10-22 16:15:21'),
  (4343689, 10728309, '0007', 'Credit for (1) irrigation zone (front yard)', NULL, NULL, -975.00, 'sold', '2021-10-25', '2021-10-25 15:50:00'),
  (4344061, 10751504, '0001', 'Gas Line Fee', NULL, NULL, 129.46, 'pending', '2021-10-25', '2021-10-25 18:30:17'),
  (4346034, 2020711, '0001', 'Add small retaining wall and a concrete pad.', '1) We are going to move a shed
2) We are digging trenches for small retaining wall under the backyard fence.
3) We are building a small retaining wall out of block in that section. 
4) We are then repairing a small sinking section of paver
5) Then we are forming and putting in rebar for the concrete.
6) We re pouring the concrete.', NULL, 7500.00, 'pending', '2021-10-26', '2021-10-26 09:56:21'),
  (4347249, 10982964, '0018', '2 step.lights.', '2 step lights. Lightcraft. Masonry light 13. $240.00 each. $480.00 total.', NULL, 480.00, 'sold', '2021-10-26', '2021-10-26 13:03:02'),
  (4347840, 10982964, '0019', '1 more step light. (Three total)', 'One additional lightcraft masonry light 13.', NULL, 240.00, 'pending', '2021-10-26', '2021-10-26 14:44:54'),
  (4350917, 11128437, '0009', '180 SF of Del Rio 1" minus at 3" depth (front)', '180 SF of Del Rio Gravel 1" minus at 3" of depth
Includes weed barrier, delivery and labor.', NULL, 450.00, 'sold', '2021-10-27', '2021-10-27 11:32:32'),
  (4350926, 11128437, '0010', '276 SF Supreme mulch in backyard beds', '276 SF of Supreme mulch at 3" depth in all backyard beds

Includes labor and delivery.', NULL, 675.00, 'pending', '2021-10-27', '2021-10-27 11:33:37'),
  (4350943, 11128437, '0011', '276 SF of Del Rio 1" minus at 3" depth', '276 SF of Del Rio 1" minus at 3" depth in all backyard beds

Includes weed barrier, labor and delivery.', NULL, 900.00, 'pending', '2021-10-27', '2021-10-27 11:35:09'),
  (4351070, 11128437, '0012', 'Plant placement', '1 hour plant placement w Nicole', NULL, 85.00, 'sold', '2021-10-27', '2021-10-27 11:49:32'),
  (4354349, 10713700, '0004', 'Added items for front yard', '1) Add Brilliant Wonders Glow Bubblers to water feature. Run 320 linear feet of additional piping for each bubbler to the back as the client did not want a manifold in front.  Includes ball valve for each bubbler to control water flow.  Does not include automated control system for individual bubbler settings per request. Run separate electrical lines back to control station added 320 linear feet.

2 guys one day to expand trench size (from original contracted trench).  2 guys one day to run all the piping.  1 guy one day to connect all electrical and valve controls at termination. 2 guys 1/2 day to backfill the extra portion of trench and compact.
6 added man days $3300 labor.  $850 materials for piping.   $4200 total for that.
Light costs are $600 per bubbler plus $90 per bubbler installation in feature.  Total of $2760 for bubblers.  (did not upcharge on expensive lights as courtesy to client)
Total $6,910

3) Run separate water line back to pump area for each Lion Head as the client did not want a manifold in front.  Install separate ball valve flow control per lion head per request.  Total 300 linear feet of plumbing for that. 

One man day to run all water line back to pump area. 1/2 man day for added 8 inches of trenching and backfill. . Connect up lion head to future auto control system per client request. 
1 1/2 added man days $900. $350 for material $1250', NULL, 8160.00, 'sold', '2021-10-28', '2021-10-28 09:42:45'),
  (4354686, 10751504, '0002', 'GAS line additional 27 LF', '27 Linear feet  of GAS line', NULL, 864.00, 'pending', '2021-10-28', '2021-10-28 10:43:20'),
  (4354697, 10751504, '0003', 'Additional Pavers', '198 SF of Pavers X $13,40= $2,653.20', NULL, 2653.20, 'pending', '2021-10-28', '2021-10-28 10:45:54'),
  (4354707, 10751504, '0004', '108 total linear feet 26 additional LF', '26 addtional Linear feet + various heights', NULL, 5126.00, 'pending', '2021-10-28', '2021-10-28 10:48:45'),
  (4358879, 11104749, '0006', 'Final sign off', NULL, NULL, 0, 'pending', '2021-10-29', '2021-10-29 11:43:03'),
  (4360246, 11292533, '0001', 'Credit for Pavers instead of concrete', 'Changing the concrete pad of 156, to pavers  $20.50- $17.65= $2.85 Difference X 156=  $444.60 Credit', NULL, -444.60, 'pending', '2021-10-30', '2021-10-30 14:26:15'),
  (4360286, 11149775, '0001', 'Final Sign Off Completion', NULL, NULL, 0, 'pending', '2021-10-30', '2021-10-30 18:04:47'),
  (4362752, 11149775, '0002', 'Credit', NULL, NULL, -1225.00, 'pending', '2021-11-01', '2021-11-01 11:10:14'),
  (4363109, 11287561, '0001', 'Electrical for Fountain', NULL, NULL, 860.00, 'sold', '2021-11-01', '2021-11-01 12:02:27'),
  (4364339, 11268828, '0001', 'Final change order', 'Credit for 20 sf of grass. $70.00. $17.00 charge for plant change. Total credit $53.00', NULL, -53.00, 'pending', '2021-11-01', '2021-11-01 15:49:21'),
  (4364617, 11287561, '0002', 'Credit for DG', NULL, NULL, -1245.00, 'sold', '2021-11-01', '2021-11-01 17:45:07'),
  (4364618, 11287561, '0003', 'Credit for Sod', NULL, NULL, -300.00, 'sold', '2021-11-01', '2021-11-01 17:46:02'),
  (4364620, 11287561, '0004', 'Additional Bender Board', 'Add''l 65 Linear Feet', NULL, 600.00, 'sold', '2021-11-01', '2021-11-01 17:46:36'),
  (4364621, 11287561, '0005', 'Adding Main line for Irrigation', NULL, NULL, 700.00, 'sold', '2021-11-01', '2021-11-01 17:47:10'),
  (4365537, 10783240, '0001', 'Final job walk', NULL, NULL, 0, 'pending', '2021-11-02', '2021-11-02 07:26:39'),
  (4369640, 10391726, '0008', 'Mulch and Irrigation Change', 'Add 5 yards of Brown Mulching to Project - Deliver and haul to back and front slopes  $1400

Change out irrigation from drip systems (per initial layout prior to irrigation plan) to sprays.  $900', NULL, 2300.00, 'pending', '2021-11-03', '2021-11-03 08:02:23'),
  (4370133, 9067548, '0005', 'Add drainage', 'Contract included 165 feet of 3" SDR. Drains were upgraded to 4"  
Plus
324 linear feet were installed. Add 159 linear feet installed
Plus
Earlier change order included 35 linear feet of sewer line.   Installed 81 ln feet.
Plus
Drain to Curb so curb cut out and patch

Difference in cost.
$6,450', NULL, 6450.00, 'sold', '2021-11-03', '2021-11-03 09:18:07'),
  (4371604, 10391726, '0009', 'Lighting', 'Install 19 Corona Lights per last request.  (see attached sheets for lighting choices)

Install 1 Corona transformer', NULL, 4875.00, 'pending', '2021-11-03', '2021-11-03 12:41:20'),
  (4376929, 11292533, '0002', 'Additional Base 6" in 156 SF', '6'' of bass added in the area of the spa, 156 SF  $1.00 per inch X 6"=$6.00 X 156 SF= $936.00', NULL, 936.00, 'pending', '2021-11-04', '2021-11-04 16:58:45'),
  (4376944, 11292533, '0003', 'Drainage Change Credit', 'Cannot drill through the alley wall, for the drain pipe, instead Marcelino will create small weep joints in the grouted area just as the building code requires.  Will not be drilling through blcok, because of possible rebar.
Cost $330.00  original  $560.00= credit of $230.00', NULL, -230.00, 'pending', '2021-11-04', '2021-11-04 17:04:58'),
  (4376959, 11292533, '0004', 'Step Build', '2 steps for the back door:
1st step top landing 3'' out X 8'' long
2nd step 18" out, to use 12" bullnose and 6" of field
Riser is the Holland, border in Holland, as we will have planty left of the pallet.
Will only need 16 square feet of the Aqualina in Rio
Need to order 30 LF of Belgard Rio Bullnose', NULL, 1884.00, 'pending', '2021-11-04', '2021-11-04 17:14:27'),
  (4376971, 11292533, '0005', 'Olive tree with grass removal', 'Olive tree, 24" box multi truck, non-fruiting
take out approximately 50 sf of grass to plant it', NULL, 510.00, 'pending', '2021-11-04', '2021-11-04 17:19:15'),
  (4380281, 11287561, '0006', 'Gopher Mesh for Sod', NULL, NULL, 4100.00, 'sold', '2021-11-05', '2021-11-05 15:14:07'),
  (4380288, 11287561, '0007', 'Gopher Baskets for Plants/Trees', 'roughly 60 1 gallon baskets
roughly 18 5 gallon baskets
4 15 gallon baskets', NULL, 1000.00, 'sold', '2021-11-05', '2021-11-05 15:15:54'),
  (4381533, 10982964, '0020', 'Additional Del Rio for the parkway.', 'The Del Rio in the parkway is approved 
I have the measurements for Del Rio. 11x16. 176 sf x 5=  $880.00. You are still getting a Del Rio credit when we measure it out the areas that we expanded with pavers. We will measure those areas for the reduced amount.', NULL, 880.00, 'pending', '2021-11-07', '2021-11-07 22:52:17'),
  (4383860, 10919041, '0001', 'Water Proofing Wall', 'Water proofing 2 coats of Henry''s tar
8" down
53 Linear Feet
X $25.00', NULL, 1325.00, 'pending', '2021-11-08', '2021-11-08 11:55:52'),
  (4383880, 10919041, '0002', 'Drainage', 'Drainage line already in line with new drains
New:
3 connecting downspouts X $125.00= $375.00
3 new drain caps X $50.00= $150.00
Total:  $525.00', NULL, 525.00, 'pending', '2021-11-08', '2021-11-08 11:58:15'),
  (4384218, 11292606, '0001', '3 new brass valves. $225.00 each.', NULL, NULL, 675.00, 'pending', '2021-11-08', '2021-11-08 12:45:34'),
  (4385602, 10982964, '0021', 'Additional linear feet of drainage', 'Additional linear feet of drainage directed to Marcelino 12 lf X $22.00= $264.00.', NULL, 264.00, 'pending', '2021-11-08', '2021-11-08 20:56:57'),
  (4388469, 11136139, '0001', '53 linear feet of Conduit', NULL, NULL, 1060.00, 'sold', '2021-11-09', '2021-11-09 12:34:16'),
  (4389014, 11292606, '0002', 'Flagstone credit', 'The flagstone was not installed in concrete footings. Credit of $20.00 per flagstone x 23 flagstone. $460.00.', NULL, -460.00, 'pending', '2021-11-09', '2021-11-09 13:58:34'),
  (4389055, 11292606, '0003', 'Plant credit', 'Credit for 4 5 gallon plants.', NULL, -174.00, 'pending', '2021-11-09', '2021-11-09 14:08:35'),
  (4389224, 10751504, '0005', 'Additional drip zone', 'Drip zone for planters.', NULL, 965.00, 'sold', '2021-11-09', '2021-11-09 14:44:18'),
  (4389452, 8769652, '0026', 'Wet look sealer', NULL, NULL, 400.00, 'sold', '2021-11-09', '2021-11-09 15:37:51'),
  (4389687, 10713700, '0006', 'Credit - Remove Laser Panel Installation', NULL, NULL, -3250.00, 'pending', '2021-11-09', '2021-11-09 17:07:05'),
  (4391583, 11418763, '0001', 'Additional 31 sq. Feet of sod', NULL, NULL, 116.00, 'pending', '2021-11-10', '2021-11-10 09:30:02'),
  (4392934, 10563668, '0003', '3 bases for the Lanterns to install on pilasters', NULL, NULL, 87.27, 'pending', '2021-11-10', '2021-11-10 12:51:48'),
  (4395693, 11403264, '0001', 'Masonry Work Added Back In', 'Raise curb wall up to 24 inch retaining wall for roughly 40 linear feet
Regrade areas next to curb wall flat
No Charge

Add back in from earlier bid, Backyard Steps and Step Wall. Includes stucco coat and waterproofing
$5,350

Add back in from earlier bid, Walls around Tree.  Includes stucco coat and waterproofing
$5,650', NULL, 11000.00, 'sold', '2021-11-11', '2021-11-11 09:21:55'),
  (4396015, 11292606, '0004', 'Final contract sign off', NULL, NULL, 0, 'pending', '2021-11-11', '2021-11-11 10:11:58'),
  (4396703, 11403264, '0002', 'Remove Trees and Root System', 'Remove  18 foot Tree and Root System.
$1300

Remove Small Tree
No Charge', NULL, 1300.00, 'sold', '2021-11-11', '2021-11-11 12:07:47'),
  (4396895, 11418763, '0002', 'Shrub removed and 2 more ficus nitida5 gal', NULL, NULL, 187.00, 'pending', '2021-11-11', '2021-11-11 12:39:29'),
  (4400220, 10751504, '0006', 'Gopher animal mesh', '4 feet x 70 linear feet gopher mesh. 18" under railing. With 30" above the railing  attached with wire. Use 1/4 inch wire mesh with black coating. Set with concrete at bottom.  Priced at $15.00 a linear foot. $1,050.00', NULL, 1050.00, 'sold', '2021-11-12', '2021-11-12 11:49:06'),
  (4400271, 11418763, '0003', 'Design credit', 'Design credit.', NULL, -375.00, 'pending', '2021-11-12', '2021-11-12 11:55:29'),
  (4400282, 11292606, '0005', 'Design credit', NULL, NULL, -375.00, 'pending', '2021-11-12', '2021-11-12 11:56:52'),
  (4400348, 10751504, '0007', 'Design Credit', NULL, NULL, -375.00, 'pending', '2021-11-12', '2021-11-12 12:09:24'),
  (4400351, 10717130, '0010', 'Design Credit', NULL, NULL, -750.00, 'pending', '2021-11-12', '2021-11-12 12:10:40'),
  (4400440, 11289954, '0001', 'Design credit', NULL, NULL, -375.00, 'pending', '2021-11-12', '2021-11-12 12:26:59'),
  (4400447, 11305160, '0001', 'Design credit', NULL, NULL, -750.00, 'pending', '2021-11-12', '2021-11-12 12:28:56'),
  (4400455, 11407673, '0001', 'Design credit', NULL, NULL, -375.00, 'pending', '2021-11-12', '2021-11-12 12:30:29'),
  (4400458, 10563668, '0004', 'Design credit', NULL, NULL, -375.00, 'pending', '2021-11-12', '2021-11-12 12:31:32'),
  (4400771, 11136139, '0002', 'Turf Strips in place of brick ribbons', NULL, NULL, 2800.00, 'sold', '2021-11-12', '2021-11-12 13:40:49'),
  (4400795, 11302625, '0001', 'Material Selection Upgrade', 'Upgrading pavers to Mirage Quartzii Waterfall pavers
Upgrading bullnose to Unico
Upgrading wall cap to Prime Silver Travertine
Stacked stone/veneer will be East West Natural Icicle Grey', NULL, 6900.00, 'pending', '2021-11-12', '2021-11-12 13:48:58'),
  (4401258, 10043446, '0020', 'Rustic Wall Contract', 'Approx 23'' of Rustic Wall in Tuscan with a height ranging from 8"-16". Wood dividers to remain to retain soil. (Understood they may get damaged during construction) 

See attached contract addendum with photos.

Any work outside of this addendum will be an additional change order.', 'Client wants to bury the pvc pipe himself once we have dug trench. He will be doing electrical after.  
No soil included in contract. 
They will leave the pavers and block where it is now unless it’s in the way. 
All other CMU block will be hauled.', 2800.00, 'sold', '2021-11-12', '2021-11-12 19:03:46'),
  (4404169, 11136139, '0003', '23 linear feet brick ribbon edging by kitchen', NULL, NULL, 240.00, 'sold', '2021-11-15', '2021-11-15 10:53:59'),
  (4404939, 11299030, '0001', 'Additional turf 100SQ. For back yard', NULL, NULL, 160.00, 'sold', '2021-11-15', '2021-11-15 12:43:19'),
  (4406057, 11289954, '0002', 'Bench Wall 12 more LF', '12 Additional Linear Feet of Wall Rustic wall Tuscan @ $129.00 a SF', NULL, 1548.00, 'pending', '2021-11-15', '2021-11-15 16:44:48'),
  (4406060, 11299030, '0002', 'Sand finishing on all new concrete surfaces', 'This includes sand finish on: front steps, larger step pads leading to front door and around to west side, the front porch concrete, the 2''x2'' step pads into the backyard and the backyard patio.', NULL, 774.00, 'sold', '2021-11-15', '2021-11-15 16:46:17'),
  (4406062, 11289954, '0003', 'Electrical conduit and wire', '63 Linear Feet of Conduit and wiring  X $23.00
This is to go under grass, and DG to baack of shed', NULL, 1449.00, 'pending', '2021-11-15', '2021-11-15 16:47:31'),
  (4406069, 11289954, '0004', 'Additional ledger light, and Transformer', '1 transformer
1 more ledger light', NULL, 665.00, 'sold', '2021-11-15', '2021-11-15 16:51:05'),
  (4406109, 11299030, '0003', 'Cap on wall by front porch steps', 'This change order is for the caps on top of the wall on the steps leading onto the front porch.', NULL, 83.00, 'sold', '2021-11-15', '2021-11-15 17:15:46'),
  (4406129, 11299030, '0004', 'Decomposed granite for front yard step pads', '61 square feet of decomposed granite is needed for placement in between step pads in front yard. Bender board is included in original bid.', NULL, 244.00, 'sold', '2021-11-15', '2021-11-15 17:23:39'),
  (4406166, 11299030, '0005', 'New landing by playroom', 'This change order is for the removal of the existing pad with slate (6.5''x10'') and concrete ''path'' (2''x22'') underneath edge of pad near the playroom. Replacement with a new 2''x10'' concrete step with sand finish in front of french doors.', NULL, 582.00, 'sold', '2021-11-15', '2021-11-15 17:38:46'),
  (4406273, 11299030, '0006', 'Remove & replace pad near kitchen french doors', 'Remove existing 46 square feet of concrete pad with slate veneer near kitchen french doors. Replace with ''L'' shaped step at total of 35 square feet with sand finish. Add additional 11 square feet of concrete with sand finish to patio.', NULL, 706.00, 'sold', '2021-11-15', '2021-11-15 18:51:41'),
  (4406307, 11299030, '0007', 'Parkway: Synthetic Turf Option', NULL, 'This change order is for using So Cal Blend Simple Turf synthetic turf in the parkway.', 8912.00, 'pending', '2021-11-15', '2021-11-15 19:18:45'),
  (4406342, 11299030, '0008', 'Parkway: Sod Option', NULL, 'This change order is for the option of setting new sod in the parkway and making sure the spray irrigation is functional.', 2835.00, 'pending', '2021-11-15', '2021-11-15 19:51:44'),
  (4406356, 11299030, '0009', 'Retaining Wall Option', 'This change order includes: removal of 321 cubic feet of soil 3'' back from sidewalk to retaining wall, 60 linear foot 8"x8"x16" CMU retaining wall with 1''x3'' footings (linear foot includes two 3'' returns on ends by neighbors properties) waterproofing of the retaining wall and stucco finish (Color TBD by client).', NULL, 14123.00, 'pending', '2021-11-15', '2021-11-15 20:02:18'),
  (4406357, 11299030, '0010', 'Returns for stairs', '8"x8"x16" CMU block, 1''x3'' footings with stucco finish', NULL, 1875.00, 'pending', '2021-11-15', '2021-11-15 20:02:36'),
  (4406383, 11299030, '0011', 'Waterproofing for backyard retaining wall', 'Waterproofing for 113 linear feet of retaining wall in backyard. This includes the bbq area and the wall by the synthetic turf area.', NULL, 1900.00, 'pending', '2021-11-15', '2021-11-15 20:26:37'),
  (4407604, 10982964, '0022', 'Sand and seal', 'Sand and seal counter top.', NULL, 350.00, 'pending', '2021-11-16', '2021-11-16 08:43:56'),
  (4407869, 11136139, '0004', 'Additional Drain for downspout', NULL, NULL, 175.00, 'sold', '2021-11-16', '2021-11-16 09:27:43'),
  (4407950, 11136139, '0005', 'Re-mortar brick ribbon along edge/concrete patio', '40 linear feet', NULL, 425.00, 'pending', '2021-11-16', '2021-11-16 09:38:31'),
  (4408944, 11066555, '0006', 'Permit - Office hours', 'Office hours for permit pulling are billed at $120/hr. 

If we are pulling permits it is $120/hr plus cost of permit (which we will share with you).  This is typically set as an allocation, but in this case, Mohammed spent only one hour working on your permit.  

If we need to pull the Apron permit with our C-27, it will be a separate change order for an allocation amount.', 'I have another change order on hold for permit allocation for the apron, let’s see what city says first with the plan (and if pavers can be installed in apron, I doubt it). 

UPDATE: Brian told her it was ok to decline this CO.', 120.00, 'pending', '2021-11-16', '2021-11-16 12:31:30'),
  (4409573, 11299030, '0012', 'Synthetic Turf option for frontyard grass', 'This change order is for the option of replacing the current quoted sod in front yard with synthetic turf. If replacing with synthetic turf, 2 spray zones will be credited (-$1,770) and sod pricing will be credited (-$3,633).', NULL, 16608.00, 'pending', '2021-11-16', '2021-11-16 13:59:23'),
  (4410651, 11299030, '0013', 'Remove bougainvillea', 'Removal of bougainvillea in backyard in corner near garage.', NULL, 150.00, 'pending', '2021-11-16', '2021-11-16 23:40:14'),
  (4412504, 11303103, '0002', 'Engineering for retaining wall', 'Engineering with Oscar for retaining wall as required by City of Pasadena.

Once engineering is completed, we will submit to city for final approval.', NULL, 2500.00, 'sold', '2021-11-17', '2021-11-17 10:17:36'),
  (4412516, 11299030, '0014', 'Remove pilaster with light', 'Removal of pilaster with light near stairs by the garage', NULL, 250.00, 'pending', '2021-11-17', '2021-11-17 10:19:11'),
  (4414318, 11136139, '0006', 'Stucco pool wall', NULL, NULL, 650.00, 'pending', '2021-11-17', '2021-11-17 15:11:41'),
  (4414361, 9067548, '0006', 'Additional 600 sqft concrete', NULL, NULL, 5641.57, 'sold', '2021-11-17', '2021-11-17 15:23:25'),
  (4414379, 11136139, '0007', 'Gas line/35 linear feet', NULL, NULL, 1200.00, 'pending', '2021-11-17', '2021-11-17 15:27:48'),
  (4416558, 10391726, '0010', 'Front Wall Upgrade', 'Trash can wall in contract included block wall and standard footing.  ($1850 Credit)

Wall now engineered with friction piles, bond beams nad fencing anchors at 14 foot length.

Wall is 14 ft by 5 1/2 ft tall.  Poured in place concrete.  Will use tie and plate construction.  (see example from one of our other jobs) 



Friction piles to be heavy equipment drilled to 12 foot depth  includes 10 foot of pile and 2 foot of footing.


Dig rest of bond beam footing 2 foot x 2 foot and tie to friction piles.

Install fencing anchors.

Stucco coat. 

Water proofing and wall drainage by other. 

Includes inspection meetings.', NULL, 15750.00, 'sold', '2021-11-18', '2021-11-18 09:53:19'),
  (4418344, 11299030, '0015', 'CMU Block wall to repair fireplace', 'Change order is for 13 linear feet of CMU block wall 4"x8"x16" to repair foundation for fireplace. Also includes moving the mainline for water, so that it is not in the way of the block wall.', NULL, 1690.00, 'sold', '2021-11-18', '2021-11-18 14:45:21'),
  (4418646, 11407673, '0002', 'Column on porch', '8"x8" block column for porch. CMU. TO BE STUCCO that matches the pilasters. Color to be selected with verva', NULL, 875.00, 'pending', '2021-11-18', '2021-11-18 16:39:47'),
  (4418650, 11407673, '0003', '10 linear feet of step build', NULL, NULL, 600.00, 'pending', '2021-11-18', '2021-11-18 16:40:37'),
  (4419369, 10751504, '0008', '3 veggie beds', 'Assemble and soil', NULL, 375.00, 'pending', '2021-11-19', '2021-11-19 06:38:40'),
  (4420187, 11299030, '0016', '4" Drainage pipe', 'Install 26 linear feet of 4" drainage pipe.', NULL, 650.00, 'pending', '2021-11-19', '2021-11-19 09:16:33'),
  (4420554, 10982964, '0023', 'Less LF of steps', '6 less linear feet x $60.00. $360.00 credit', NULL, -360.00, 'pending', '2021-11-19', '2021-11-19 10:33:38'),
  (4420713, 10982964, '0024', 'Additional pavers. 33sf', '$14.65 x 33 sf', NULL, 483.00, 'pending', '2021-11-19', '2021-11-19 11:09:39'),
  (4420742, 11136139, '0008', 'Ext. Wall towards fence/concrete behind pool equip', 'Extend wall 10 linear feet 
Add 40-50sqft concrete behind pool wall
Remove excess soil and haul', NULL, 3000.00, 'sold', '2021-11-19', '2021-11-19 11:15:29'),
  (4420758, 11418763, '0004', 'Job Complete', NULL, NULL, 0, 'sold', '2021-11-19', '2021-11-19 11:18:31'),
  (4420923, 10982964, '0025', 'Additional del rio', '32 more linear feet', NULL, 160.00, 'pending', '2021-11-19', '2021-11-19 11:46:25'),
  (4420986, 10982964, '0026', 'Less grass', '256 sf less x $3.75= $960.00', NULL, -960.00, 'pending', '2021-11-19', '2021-11-19 11:58:07'),
  (4421065, 10982964, '0027', '13 lf of bender board', '13 lf of bender board.', NULL, 104.00, 'pending', '2021-11-19', '2021-11-19 12:12:58'),
  (4421143, 10982964, '0028', 'Credit for controller', 'Using own controller', NULL, -300.00, 'pending', '2021-11-19', '2021-11-19 12:26:45'),
  (4422023, 11292606, '0006', 'Final Plant credit- see previous credit', 'ccredit for plant not installed and plant install only balance
TOTAL PLANT CREDIT FROM CONTRACT IS $323.00, $174.00 ALREADY GIVEN

In contract:
30  1 gallon
58  5 gallon
1    15 gallon

Actual:
#1  7     5 gallon
#2  7     5 gallon
#3  6     5 gallon
#4  6     1 gallon
#6  14   5 gallon
#7  -0-   5 gallon    3  1 gallon @ Install only X $10.00
#8  2     1 gallon
#9  9     5 gallon
#10 2    1 gallon
#11 -0-  5 gallon
#12  8   1 gallon
#13  1   5 gallon
#14  5   5 gallon
#15  -0- 5 gallon   1  5 gallon @ Install only X $21.00
#16  1   15 gallon
# 17 -0- 5 gallon
#19  4  1 gallon  
#20  4   5 gallon
#21  1   1 gallon
#22  4   1 gallon
#23  3  1 gallon

Additional  Install only 1 5 gallon in front of entry  $21.00

Total Delivered:
1 gallon  30  X $21.50=  $645.00
5 gallon   53  X $43.50=  $2,305.50
1 15 gallon  X $175.00

Install only  3 1 gallon  $30.00 + 2 5 gallon $40.00=  $70.00
TOTAL INSTALLED: $3,195.50
TOTAL IN CONTRACT: $3,518.00
CHANGE ORDER CREDIT:  $323.00  ( $174.00 already given) 

Balance $149.00

I will put in the change order as approved, as we went through this list together.

Thank you Gail, it is a pleasure to assist you!', NULL, 149.00, 'pending', '2021-11-20', '2021-11-20 08:45:41'),
  (4422032, 10919041, '0003', 'Paver Credit', 'Paver contract  price 344 sf  $5,418.00  (mistake in math of $100.00, should have been $5,314.80)

Actual installed 290 sf X $15.45= $4,480.50
Difference $903.40', NULL, -903.40, 'sold', '2021-11-20', '2021-11-20 09:06:50'),
  (4422037, 10919041, '0004', 'Waterproofing credit', 'Waterproofing was supposed to be 1 coat Henry''s Tar, and 1 coat bichathene
53 linear feet with 12"-18" deep
The footings were exposed and the crew could only apply 1-2 coats Henry''s tar, at only 5-6"
Time taken was not for the amount charged', NULL, -1100.00, 'sold', '2021-11-20', '2021-11-20 09:16:56'),
  (4422049, 10919041, '0005', 'ADditional Drainage', '60 linear feet added
6 under pavers
3 down spouts
Amount in Change Order of 11/8  $525.00

Total installed:  $1,518.00  - 525.00= $993.00', NULL, 993.00, 'sold', '2021-11-20', '2021-11-20 09:27:12'),
  (4422169, 11289954, '0005', 'Drainage', '20 linear feet of drainage with caps x $25.00=$450.00', NULL, 450.00, 'sold', '2021-11-20', '2021-11-20 14:20:34'),
  (4428217, 11522825, '0001', 'Additional plants', 'Additional plants 12 succulents4 smaller creeping fog  2 larger creeping fig 360', NULL, 360.00, 'pending', '2021-11-23', '2021-11-23 08:32:19'),
  (4429374, 11453358, '0001', 'Plants upgrade to premium nursery', 'This is for plants ordered from FK Nursery, our premium nursery.', NULL, 325.00, 'sold', '2021-11-23', '2021-11-23 11:43:04'),
  (4429850, 11453358, '0002', 'Credit for 2 (5g) cactus', '1 (5g) peanut cactus
1 (5g) woolly cactus 

We could not source these, client will purchase and we will plant.  Credit is for material only.', NULL, -40.00, 'sold', '2021-11-23', '2021-11-23 12:46:45'),
  (4430752, 9067548, '0007', 'Planting - Irrigation Add On', 'Here is the planting add on for the project:

(1) 24” boxed Avocado Tree
(2) 24” Australian Tree Ferns
(5) 15g Plumeria ‘Aztec Gold’
(4) 15g Musa Giant Dwarf
(3) 15g Zamia pumila
(12) 5g Torch Lily in yellow
(6) 5g Yucca ‘Color Guard’
(8) 5g Hebe varigata
(6) 5g Philodendron ‘Xanadu’
(5) 5g Angiozanthos either yellow or red
(6) 5g Cordyline ‘Pink Passion’
(4) 5g Musa ‘Zebrina’
(21) 5g Ceanothus thrysiflorus var. repens
(8) 5g Canna Lily ‘Fire Dragon’
(6) 5g Canna Lily ‘Tropicana’
(21) 1g Salvia farinacea
(20) 1g Clivia
(18) 1g Asparagus Fern
(11) 1g Asclepius tuberosa
(27) 1g Gallardia
(9) 1g Lantana ‘Hot Blooded’
(9) 1g Rudbeckia (whatever variety you can find is fine)
(21) 1g Limonium
(22) 1g Sedum ‘Autumn Joy’
$10,160

We also need to add another zone of irrigation.
$950

Irrigation repair in front is no charge.
$0', NULL, 11110.00, 'sold', '2021-11-23', '2021-11-23 15:44:39'),
  (4430790, 11289954, '0006', 'Additional Grass', 'Additional  405 Sf of grass RTF X $3.75= $1,518.75', NULL, 1518.75, 'sold', '2021-11-23', '2021-11-23 16:00:19'),
  (4436133, 11066555, '0007', 'Paver credit (total cost from contract)', 'Credit for entire paver amount in contract - see contract addendum.', NULL, -11676.00, 'sold', '2021-11-27', '2021-11-27 15:20:25'),
  (4436134, 11066555, '0008', 'Credit for flagstone installation', 'Credit for flagstone installation (material was purchased by client)', NULL, -150.00, 'sold', '2021-11-27', '2021-11-27 15:22:01'),
  (4436135, 11066555, '0009', 'Concrete apron and city sidewalk', 'All according to city code, 
Apron will be 9” x 9’ with two 2’9”-3’ wings.
“Sidewalk” is approx. 9’ x 3’6. Total LF from curb to end of city property is 12’6”

Cost includes all concrete labor, installation, scoring, forming and material.', NULL, 3655.00, 'sold', '2021-11-27', '2021-11-27 15:26:00'),
  (4436138, 11066555, '0010', 'Concrete curb and asphalt', '15 LF of concrete curb at 3” $700
30 SF of asphalt $400 (includes demo of existing asphalt)', NULL, 1100.00, 'sold', '2021-11-27', '2021-11-27 15:30:43'),
  (4436139, 11066555, '0011', '400 SF of pavers with Polysand', '400 SF of pavers, they are on site already.
400 SF of polysand. 

Includes labor and material.', NULL, 5010.00, 'sold', '2021-11-27', '2021-11-27 15:33:26'),
  (4436141, 11453358, '0003', 'Installation of 2 cactus’ (on-site already)', 'Planting 2 (15g) cactus that are already on site in pots.', NULL, 100.00, 'sold', '2021-11-27', '2021-11-27 15:52:30'),
  (4440281, 11453358, '0004', 'Smart timer and outdoor box', 'Install and purchase one smart timer with 6 stations and outdoor box.
Connect all irrigation wires to box.
Show client how to use the WiFi smart timer.', NULL, 450.00, 'sold', '2021-11-29', '2021-11-29 15:30:06'),
  (4440292, 11453358, '0005', 'Raise up Olive tree to appropriate height', 'Raise up olive tree to appropriate grade level.  
No charge.', NULL, 0, 'sold', '2021-11-29', '2021-11-29 15:32:32'),
  (4440329, 11453358, '0006', 'Concrete patch 6 SF (front)', '6 SF of concrete patch with top cast finish. 
Dig 6-7” below to get at least 4” of concrete pour.
2 men, half day', NULL, 560.00, 'pending', '2021-11-29', '2021-11-29 15:45:45'),
  (4440562, 10345652, '0010', 'Credit for water leak', NULL, NULL, -90.00, 'pending', '2021-11-29', '2021-11-29 17:33:25'),
  (4440677, 11047318, '0001', 'Add 4 Spec 36 inch trees', NULL, NULL, 3600.00, 'pending', '2021-11-29', '2021-11-29 19:05:28'),
  (4442852, 11453358, '0007', 'Copper shield irrigation', 'Jorge suggested the copper shield irrigation tubing for the drip line in the back yard.  
This is the cost difference between Netafim tubing and copper shield tubing. 

Please contact Jorge for any explanations needed!', NULL, 100.00, 'sold', '2021-11-30', '2021-11-30 10:56:36'),
  (4444204, 9067548, '0008', 'Lights', '(16) path lights
(9)   up lights
(1)  transformer', NULL, 6000.00, 'sold', '2021-11-30', '2021-11-30 13:57:32'),
  (4444367, 10751504, '0009', 'A/C CREDIT FOR Damage', 'Alleged damage to ac by our crews', NULL, -250.00, 'pending', '2021-11-30', '2021-11-30 14:21:40'),
  (4444466, 11292533, '0006', 'Bender Board', '52 Linear Feet of Bender Board for side of walkway', NULL, 416.00, 'pending', '2021-11-30', '2021-11-30 14:42:47'),
  (4444479, 11292533, '0007', 'Back Walkway', '1)  Demo of existing concrete, was done by Paver crew
2)  Insatll 3 slabs that are on the property in walkway area
3)  Install 78 Sf of Del Rio 4" or less that is on property
4)  Purchase 181 Sf of Del Rio 4" or less for rest of walkway, NO GEOTEXTILE FABRIC', NULL, 2384.00, 'pending', '2021-11-30', '2021-11-30 14:46:56'),
  (4444485, 11292533, '0008', 'Backfill electrical trench', 'Backfill and compact the electrical trench
4 man hours X $75.00', NULL, 300.00, 'pending', '2021-11-30', '2021-11-30 14:50:49'),
  (4446186, 9067548, '0009', 'Rachio Timer Installation', 'Add in Rachio Timer System.', NULL, 550.00, 'pending', '2021-12-01', '2021-12-01 08:07:57'),
  (4450397, 11442280, '0001', 'Increasing footing size', '5’ x 3’', NULL, 9000.00, 'sold', '2021-12-02', '2021-12-02 07:56:48'),
  (4451242, 11289954, '0007', 'Plant credit', NULL, NULL, -86.50, 'pending', '2021-12-02', '2021-12-02 10:32:51'),
  (4455845, 11453358, '0008', 'Electrical repair', '7'' conduit
35'' wire
Box and gfi outlet', NULL, 410.00, 'sold', '2021-12-03', '2021-12-03 12:26:01'),
  (4458832, 11453358, '0009', 'Import 4 cubic yards 70/30 mix', 'Needed to import 70/30 soil for backyard as grass had thatched and was considerably high. Needed to build this up to grade. Have given a $200 discount as a gift from Nicole.', NULL, 600.00, 'sold', '2021-12-06', '2021-12-06 08:22:09'),
  (4459061, 11292533, '0009', '19 Mas lf of bender board', NULL, NULL, 152.00, 'pending', '2021-12-06', '2021-12-06 09:04:17'),
  (4459581, 10820925, '0002', 'Add Gravel', 'Install 2 yards of white 3/4 crushed gravel.  No weed barrier.

To be done on the same day as Johanna Altman', NULL, 1000.00, 'pending', '2021-12-06', '2021-12-06 10:26:50'),
  (4461014, 11299030, '0017', 'Decomposed Granite for backyard', 'This change order is for changing the material in the backyard from Del Rio gravel to stabilized decomposed granite. Total of 1,219 square feet of material.', NULL, 1646.00, 'sold', '2021-12-06', '2021-12-06 13:43:34'),
  (4463560, 11075368, '0001', 'Additional Work', 'Demolition of the work area. Prep area, amend soil and install plants. 

4 - 24 inch box Redpush Pistachio

1 - 15 Gallon Rose of Sharon
3 - 15 Gallon White Hibiscus

51  -  5 Gallon Red Roses
21  -  5 Gallon White Iceberg Roses
14   - 5 Gallon Camellia Sasquancha  White or Red or Combination
25  -  5 Gallon Red Azeleas


72-   1 Gallon Myoporum White
69 – 1 Gallon White Lantana
14 – 1 Gallon Cranebill White or Red', NULL, 12800.00, 'pending', '2021-12-07', '2021-12-07 09:01:44'),
  (4466577, 9067548, '0010', 'Veneer Add On', '153 additional sq feet of Veneer at $25 per sq foot.   - $3,825

Discount given per Jorge for veneer $625.   Total  $3,200', NULL, 3200.00, 'sold', '2021-12-07', '2021-12-07 19:14:29'),
  (4468757, 11551200, '0001', 'Smart Timer for irrigation', 'Adding timer for irrigation zones. Will be placed in garage for easy access to homeowner and electricity.', NULL, 500.00, 'sold', '2021-12-08', '2021-12-08 10:39:46'),
  (4469374, 11292533, '0010', 'Plant credit', 'Plants damaged during paver installation.', NULL, -200.00, 'pending', '2021-12-08', '2021-12-08 12:16:52'),
  (4469390, 11551200, '0002', '80 linear feet of mainline', 'In order to have the right amount of pressure for the valves for the irrigation zones, we need to connect to the mainline at the side of the house. We will be installing 80 linear feet of piping with all fittings to manifolds for irrigation.', NULL, 2000.00, 'sold', '2021-12-08', '2021-12-08 12:19:39'),
  (4469409, 11551200, '0003', 'Credit for 1 zone of drip irrigation', 'With the added pressure we are getting from the mainline, we do not need as many zones of irrigation for the plants. A credit will be given to your account.', NULL, -965.00, 'sold', '2021-12-08', '2021-12-08 12:22:30'),
  (4470012, 11551200, '0004', 'Stump Grinding', 'The stump in the front planter is bigger and deeper upon further inspection. The pricing is for renting the stump grinder, man-hours and other materials needed for full removal.', NULL, 300.00, 'sold', '2021-12-08', '2021-12-08 13:56:20'),
  (4470628, 11403264, '0003', 'Sod Installation', 'Add sod back in to contract.  1305 sq feet of Valley RTF', NULL, 5640.00, 'sold', '2021-12-08', '2021-12-08 16:26:39'),
  (4470634, 11403264, '0004', 'Irrigation for Lawn', 'Irrigation
 

	Install (1) new main line water shutoff valves
	Install (5) new brass superior auto anti-siphon valves backyard



	Install (2) new pressure regulator filters for planting zones.
	Install new ¾ inch PVC lateral lines.
	Install new ¼ tie in emitters for plants
	Install new spray for lawns with Toro/Rainbird nozzles
	Use existing controller

Install Black 1/4 inch drip line later when plants are installed.', NULL, 4835.00, 'sold', '2021-12-08', '2021-12-08 16:30:24'),
  (4488542, 11697068, '0001', 'Add’l Leucadendron', '(6) 15 gallon', NULL, 900.00, 'pending', '2021-12-15', '2021-12-15 09:23:10'),
  (4488589, 11697068, '0002', 'Add’l path light', NULL, NULL, 220.00, 'pending', '2021-12-15', '2021-12-15 09:30:22'),
  (4491866, 11697068, '0003', 'Credit for (1) zone irrigation', 'We can irrigate all plantings with 2 zones', NULL, -965.00, 'pending', '2021-12-16', '2021-12-16 07:21:15'),
  (4491890, 11697068, '0004', 'Sleeving for electrical and irrigation', 'Will need to run an addtional 50 linear feet of pvc x 2 under driveway in order to irrigate/light bed to the left of drive
Also need to run roughly 10 linear feet of sleeving for both irrigation/electric under walkway from manifold to small bed on the left side of front entryway', NULL, 750.00, 'pending', '2021-12-16', '2021-12-16 07:26:50'),
  (4491969, 11697068, '0005', 'Removal of the remainder of Star of Jasmine Hedge', 'Neighbor''s approved', NULL, 200.00, 'pending', '2021-12-16', '2021-12-16 07:42:11'),
  (4494716, 11403264, '0005', 'Added soils removal.', 'Contract states 35 tons of soils to be removed.  We had to remove over 90 tons -  3 and 1/2 super 10 semi dump loads. 

We will not charge for extra labor for removal. Just for pickup and demo dump fees. 
 
Added demo soils dump fees is $2,600.', NULL, 2600.00, 'sold', '2021-12-16', '2021-12-16 16:27:19'),
  (4494723, 11403264, '0006', 'Artificial Turf Strips', 'Cut and install turf strips. 
Includes base, hand compaction, dg underlayer, turf, seaming and nailing.
$2,850.', NULL, 2850.00, 'sold', '2021-12-16', '2021-12-16 16:31:03'),
  (4494726, 11403264, '0007', 'Sand Finish Concrete', 'Spray Top Cast on all concrete surfaces.   Then powerwash and scrub.', NULL, 1480.00, 'sold', '2021-12-16', '2021-12-16 16:33:25'),
  (4495751, 8283798, '0019', 'CO request from 12.3.21', '1. We had a gopher attack in the front yard. Now they have been caught but I need the DG to be repaired in about 6 spots.
2. When this is being done, I want too source and plant some new plants in the back:
 
                6 x Lavandula Thumbelina
                6 x Agapanthus Baby Pete
 
Both in 5G if available, although they are small plants so maybe only 2G available. Can you source these plants?
3. Need 3 new Monkey Paw plants to replace ones that got cut back too far. I think that Daniel knows about this.
4. Need 3 scabiosa and 3 geranium St Ore (?) to fill in a few bald spots.
5. Generally check irrigation outlets.', NULL, 1275.00, 'pending', '2021-12-17', '2021-12-17 07:31:19'),
  (4496754, 11686414, '0001', 'Trenching irrigation pipes to ea planter', 'Roughly 40 linear feet', NULL, 2500.00, 'pending', '2021-12-17', '2021-12-17 10:55:28'),
  (4496758, 11686414, '0002', 'Credit for 2 irrigation zones', NULL, NULL, -1800.00, 'pending', '2021-12-17', '2021-12-17 10:56:08'),
  (4496763, 11686414, '0003', 'Lighting', '(9) uplights plus (1) transformer', NULL, 2500.00, 'pending', '2021-12-17', '2021-12-17 10:57:07'),
  (4497174, 11442280, '0003', 'Wall Height Increase', 'Height of wall is  now 7’8”', NULL, 0, 'sold', '2021-12-17', '2021-12-17 12:19:07'),
  (4497190, 11442280, '0005', 'Bender board', 'Separating DG from Gravel
45 linear feet', NULL, 100.00, 'sold', '2021-12-17', '2021-12-17 12:22:07'),
  (4497200, 11442280, '0006', 'Del Rio Gravel', '450sqft at 2”
In front of turf to top of wall', NULL, 500.00, 'sold', '2021-12-17', '2021-12-17 12:23:41'),
  (4497214, 11442280, '0007', 'DG/Base/Turf Install', 'Install 2” of DG Install 2” of Road Base Install 500 sf of existing turf with pet infill sand.', NULL, 3500.00, 'sold', '2021-12-17', '2021-12-17 12:26:28'),
  (4497818, 11697068, '0006', '22 12”x12” concrete steppers', NULL, NULL, 200.00, 'pending', '2021-12-17', '2021-12-17 14:54:56'),
  (4500543, 11066555, '0012', 'Additional 51 SF of pavers with polysand', 'After apron is installed we measured 451 SF of paver. 9'' at bottom and 11'' at gate. This is an additional 51 SF than we originally estimated.', NULL, 638.00, 'sold', '2021-12-20', '2021-12-20 10:45:48'),
  (4501540, 10609753, '0001', 'Additional 4 LF of CMU 8" wall', 'Adding 4 LF of CMU 8" x 8" x 16" wall along property line, closest to backyard gate to retain to soil from neighbor.
Sanded stucco. (color TBD on site with swatch from project sup.)

includes labor, footings, rebar, infill, stucco and block wall.', NULL, 565.00, 'sold', '2021-12-20', '2021-12-20 13:19:11'),
  (4505839, 11299030, '0018', 'Extension of grass in frontyard', 'Extend lawn from top of yard, down the slope to the sidewalk. Total add of lawn: 330 square feet. Price for lawn: $1,155

Because we are removing and relocating a few of the plants, there is a credit of -$846 for the plants we are not ordering. Removal of (11) 1 gal plants and (14) 5 gal plants.', NULL, 310.00, 'sold', '2021-12-21', '2021-12-21 14:38:33'),
  (4505928, 10391726, '0011', 'Drain and Mainline Work Sump Pump', '1- relocated main line 10LF 3/4" pipe total of 6 fittings 3/4" - $480 with material

2- (3) total curb cores 1 for surface drains, 1 for French drain and 1 for house rain gutters - $590  ($390 labor/$200 core drill rental)

3 - Add additional drain connections for all drain lines $350 with material

4- Install Sump Pump system with catch basin, catch basin lid, evacuation lines and tie in inlets and electrical - $1750', NULL, 3170.00, 'sold', '2021-12-21', '2021-12-21 14:59:31'),
  (4508869, 11066555, '0013', '(CC fee)', 'this is to offset the accounting for job', NULL, 150.00, 'pending', '2021-12-22', '2021-12-22 13:17:31'),
  (4512042, 11299030, '0019', 'Parkway with desert design', 'This pricing is for a desert vibe parkway from picture Veronica sent to me.
Includes:
557 square feet of demo of existing sod
6 boulders $110
    (2) 1/2 head
    (2) 3/4 head
    (2) full head
20 feet of bender board
557 square feet of decomposed granite, not stabilized, includes weed barrier
(12) 1 gallon Festuca glauca plants
(8) 5 gallon plants
    (4) Agave desmetiana ''Veriegata''
    (4) Dasylirion wheeleri', NULL, 5668.00, 'pending', '2021-12-23', '2021-12-23 21:12:09'),
  (4512054, 11403264, '0008', 'Planting', '1. Dig holes for plants
2. Introduce 2 1/2 to 3 yards of amendments
3. Plant (30) 15 gallon Laurel Nobilis Hedge plants', NULL, 3300.00, 'sold', '2021-12-24', '2021-12-24 03:29:16'),
  (4513235, 11442280, '0008', 'Credit for: Re-connecting AC units', NULL, NULL, -2160.00, 'sold', '2021-12-27', '2021-12-27 10:39:21'),
  (4515872, 11303103, '0003', 'Balance for wall permit', 'FOR THE RECORDS:
Initial deposit for permit: $1,000
Change order previously approved (not invoiced): $2,500
 

Total permit cost:
$5,475.37 - $3,500
= $1,975.37', NULL, 1975.37, 'sold', '2021-12-28', '2021-12-28 14:01:38'),
  (4518528, 11403264, '0009', 'Paint walls / No stucco', 'Taking out the stucco section of the contract and instead paint over all walls in the attached photos. 
No extra charge. Please just approve the changes of scope of work.
We will also paint the short walls at no additional cost to make it uniform if you''d like to do so.
Please see attached phots and let me know if you have any questions. 

*Exterior paint. Black color. Flat Finish.', NULL, 0, 'sold', '2021-12-29', '2021-12-29 18:28:02'),
  (4521079, 11299030, '0020', '25 linear feet of Timber wall', 'Adding a wooden retaining wall to the left side of yard by hedges to hold back the soil. There is an elevation change we need to accommodate for and make sure that the soil does not flow into the decomposed granite we are planning on placing underneath the embankment.', NULL, 1075.00, 'sold', '2022-01-01', '2022-01-01 18:00:38'),
  (4521080, 11299030, '0021', 'French Drain behind retaining wall', 'This french drain will help move the water away from the wall.', NULL, 6000.00, 'pending', '2022-01-01', '2022-01-01 18:03:17'),
  (4521083, 11299030, '0023', 'Additional 124 linear feet of bender board', 'This is for an additional 380 linear feet of bender board along the steppers, sides of the yard, and any transition of materials (mulch to DG, grass to mulch) throughout the site. By adding more bender board, you are creating a more unified, modern look to compliment the overall design.', NULL, 992.00, 'sold', '2022-01-01', '2022-01-01 18:13:53'),
  (4522982, 11305160, '0002', 'Drainage. 98 linear feet additional', '98 additional linear feet of drainage. X $22.00', NULL, 2156.00, 'pending', '2022-01-03', '2022-01-03 11:21:15'),
  (4523152, 11299030, '0024', 'DG only for parkway', 'Here is pricing for just Decomposed Granite in the parkways.
557 square feet of stabilized DG with weed barrier
557 square feet of removal of existing lawn, with soil removal at 3" depth for the decomposed granite to fit in the parkway', NULL, 3342.00, 'pending', '2022-01-03', '2022-01-03 11:50:29'),
  (4523244, 11686236, '0001', 'Additional step build', '11 linear feet of step build stone wall 2 as tread in Tuscan.', NULL, 550.00, 'pending', '2022-01-03', '2022-01-03 12:13:47'),
  (4523294, 11515957, '0001', '150Watt Transformer', '150 watt steel outdoor transformer
Includes all labor and wiring.

To be installed for front property low voltage lights, install on interior of fence/gate.', 'Carter already ordered from Lightcraft. (Prior to this)', 430.00, 'sold', '2022-01-03', '2022-01-03 12:22:16'),
  (4523346, 11515957, '0002', 'Pavers', 'Measurement in contract was 215 SF. 
Measurement on site is 265 SF due to small changes in wall size and layout of pathway. 

NO CHARGE', 'Difference was a credit of $122 according to PB price sheet thus no charge.', 0, 'sold', '2022-01-03', '2022-01-03 12:29:55'),
  (4523358, 11515957, '0003', 'Poly sand for pavers', 'This helps keep sand in joints and acts as a binding agent. 
@ $1.75/SF according to contract.', 'Please inform Tino if this is approved. This is for front entrance area only', 331.25, 'sold', '2022-01-03', '2022-01-03 12:31:27'),
  (4523361, 11442280, '0009', 'Contract Completion', NULL, NULL, 0, 'sold', '2022-01-03', '2022-01-03 12:32:26'),
  (4523377, 11515957, '0004', 'Walls (Updated to using CMU)', '6” CMU block for 24LF @ 36”
4” CMU block for 64LF @ 16”

Approx. 157 SF of sanded stucco.

Cost is a wash with what is on contract.', NULL, 0, 'sold', '2022-01-03', '2022-01-03 12:34:06'),
  (4524154, 11582899, '0001', '4 hours - Amended plant design and site plan', 'Planting design amended. Evaluate and adjust plant quantities within the current plant budget.
Develop a new CAD plan.', '4 hours David H.', 360.00, 'sold', '2022-01-03', '2022-01-03 15:54:00'),
  (4524198, 11582899, '0003', '2 hours - Site Meeting', 'Timeframe: Pots laid out in field per plan, prior to planting/digging. 
Summary: Adjust site layout of plants. Get approval from client on layout.', '2 hours David Hanrahan', 180.00, 'sold', '2022-01-03', '2022-01-03 16:18:58'),
  (4526593, 11403264, '0010', 'Contract Completion', NULL, NULL, 0, 'pending', '2022-01-04', '2022-01-04 12:30:59'),
  (4527076, 11686414, '0004', '(8) medium/large boulders (not on contract)', NULL, NULL, 200.00, 'pending', '2022-01-04', '2022-01-04 13:42:47'),
  (4528834, 11305160, '0003', 'Pavers additional 114 SF + changing blend', '114 Additional Square Feet of Pavers Base price at $13.25 and upgrade of polymeric sand and Heartland + $3.60 SF= $1,943.70
Changing wall blend out from Grey moss Charcoal to Tuscan as well', NULL, 1943.70, 'pending', '2022-01-05', '2022-01-05 08:43:43'),
  (4528892, 11305160, '0004', 'Additioanl steps 17 more LF', 'Additional 17 LF of Step Build X $60.00', NULL, 1020.00, 'pending', '2022-01-05', '2022-01-05 08:53:27'),
  (4528919, 11305160, '0005', 'Wall credit for 9 LF less installed', '9 Linear feet less    $152.00 X 9 LF= -$1,368.00', NULL, -1368.00, 'pending', '2022-01-05', '2022-01-05 08:58:07'),
  (4529820, 11515957, '0005', 'Custom (new) trellis with structural beam', '(1) 4 x 6 structural beam 
(9) 2 x 6 

See design attached.
Labor and all materials (screws etc) included in cost.
Client to handle painting after PictureBuild is off site.', NULL, 2600.00, 'pending', '2022-01-05', '2022-01-05 11:50:06'),
  (4529944, 11515957, '0006', 'Upper patio - power wash, redo polysand, and seal', '350 SF
Power wash upper backyard patio pavers and steps. 
Install new polysand in pavers and steps. @$1.50/SF
Apply color boost sealant to pavers and steps. @$1/SF.

This cost is for upper area only.', NULL, 940.00, 'sold', '2022-01-05', '2022-01-05 12:10:35'),
  (4530753, 10609753, '0002', 'Additional fence demo', 'We have 87 LF of fence demo in contract and total fence demo is 128 LF (chain link, front fence and gate, front entryway fence)

Cost difference is 41 LF.', NULL, 650.00, 'sold', '2022-01-05', '2022-01-05 14:30:57'),
  (4530802, 10609753, '0003', 'Adding 38 LF of CMU wall in front of gas line', '38 LF of CMU 6" x 8" x 16" @ 24" high. $4,370
Sanded stucco 76 SF. $646
Thoroseal waterproofing $893
Labor and all materials included.

If LF is less, we will credit you. There will be a step up in 8 ft sections as needed.', NULL, 5909.00, 'pending', '2022-01-05', '2022-01-05 14:41:20'),
  (4531894, 11136139, '0009', 'Plants and Pebbles', '60sqft 1-2" Mexican Beach in black 
(9) 1 gallons', NULL, 750.00, 'sold', '2022-01-06', '2022-01-06 07:42:29'),
  (4533410, 11515957, '0007', 'Color Boost Sealer for front entrance', 'Color Boost Sealer @ $1/SF for pavers.
Location - Front entrance pathway and step', NULL, 265.00, 'sold', '2022-01-06', '2022-01-06 12:09:13'),
  (4533612, 11515957, '0008', 'Water main line work/ 2 valves', NULL, NULL, 1200.00, 'sold', '2022-01-06', '2022-01-06 12:42:10'),
  (4536284, 11822158, '0001', '3/4”’copper main line replacement', 'Replace 38 linear feet of 3/4”copper main line', NULL, 1700.00, 'sold', '2022-01-07', '2022-01-07 10:37:39'),
  (4536540, 11515957, '0009', 'New water mainline to street', 'This price does not include laying asphalt after completion. We can hire an asphalt company to do this, but to save you guys some money. We recommend you hiring a company and paying them directly. If not then asphalt would be on a separate change order with its own pricing. **Also to do this work we will have to give proper notice to all residents that share this drive-way.

Price breakdown.

250 linear feet of 1 inch copper with couplings  - Material charge $17 per linear foot - $4250
Asphalt cutting - Machine rental with blades and dump fees  - $1200
Mini Excavator - Rental   - $1000
Crew Labor - Excavation - $2350
Crew Labor Installation - $1700
Crew Labor Refill and Compact in Lifts with Jumping Jack - $3000', NULL, 13500.00, 'sold', '2022-01-07', '2022-01-07 11:25:49'),
  (4537337, 11299030, '0025', '100sqft of concrete', 'This is for 100 sqft of concrete, broom finished for the sidewalk. Pricing is changed per discussion with Jorge.', NULL, 600.00, 'sold', '2022-01-07', '2022-01-07 13:52:50'),
  (4537348, 11299030, '0026', 'Credit for 4 drip valves', 'This is a credit for 4 drip valves that we do not need to install for a completed project.', NULL, -3860.00, 'sold', '2022-01-07', '2022-01-07 13:55:01'),
  (4543119, 11822158, '0002', 'Additional bender board', '40 Linear Feet', NULL, 400.00, 'sold', '2022-01-11', '2022-01-11 08:34:04'),
  (4543134, 11822158, '0003', '25 linear feet of drainage + catch basin', 'Adding 4" SDR 35 pipe plus 2x2 catch basin', NULL, 800.00, 'sold', '2022-01-11', '2022-01-11 08:35:42'),
  (4543967, 10003679, '0008', 'Concrete and Drainage', 'Remove existing concrete and haul to dump.

Remove subgrade soils down to 7 inches below grade.

Install 46 linear feet of SDR 35 drain line

Install two drain inlets and one downspout inlet

Install one drain pop up

Install class @ roabase subgrade for concrete.

Install forms 

Install #4 rebat 24 inches on center

Pour concrete, finish and remove forms.', NULL, 3600.00, 'pending', '2022-01-11', '2022-01-11 10:53:05'),
  (4544018, 11515957, '0010', 'Pressure regulator', 'Pressure regulator $325
Labor $75', NULL, 400.00, 'sold', '2022-01-11', '2022-01-11 11:02:41'),
  (4545794, 11822158, '0004', 'Additional Wall Block to finish wall', '22 pieces of block', NULL, 330.00, 'sold', '2022-01-11', '2022-01-11 18:01:46'),
  (4546834, 8160247, '0006', 'Additional valve for front yard', NULL, NULL, 950.00, 'sold', '2022-01-12', '2022-01-12 08:10:21'),
  (4546842, 8160247, '0007', 'Adding 2 irrigation timers front and back', NULL, NULL, 700.00, 'sold', '2022-01-12', '2022-01-12 08:11:14'),
  (4549136, 11551200, '0005', 'Final walk complete', NULL, NULL, 0, 'pending', '2022-01-12', '2022-01-12 14:07:39'),
  (4550862, 10982964, '0029', '0 balance. Job complete', 'Job closed', NULL, 0, 'pending', '2022-01-13', '2022-01-13 08:00:18'),
  (4550897, 11289954, '0008', 'Final walk complete. Paid in full.', NULL, NULL, 0, 'pending', '2022-01-13', '2022-01-13 08:05:35'),
  (4550972, 11407673, '0004', 'Final walk done', 'Very happy', NULL, 0, 'pending', '2022-01-13', '2022-01-13 08:19:07'),
  (4551887, 10003679, '0009', 'Artificial Turf', '• 400 sq ft of turf install with 56 linear feet of composite edging installed.', NULL, 6000.00, 'sold', '2022-01-13', '2022-01-13 10:58:01'),
  (4551906, 10003679, '0010', 'Credit for concrete job', 'Credit for orignal concrete job', NULL, -2400.00, 'pending', '2022-01-13', '2022-01-13 11:02:05'),
  (4551976, 11299030, '0027', 'Additional stems for lights', NULL, NULL, 246.50, 'pending', '2022-01-13', '2022-01-13 11:17:34'),
  (4556053, 11066555, '0014', 'Final Payment (pay this one)', NULL, NULL, 3207.50, 'pending', '2022-01-14', '2022-01-14 09:17:36'),
  (4556059, 11066555, '0015', 'To balance account', NULL, NULL, -3207.50, 'pending', '2022-01-14', '2022-01-14 09:18:17'),
  (4557426, 11453358, '0010', 'Final job walk', NULL, NULL, 0, 'pending', '2022-01-14', '2022-01-14 13:45:17'),
  (4557865, 8160247, '0008', 'REMOVE Firepit', NULL, NULL, -3750.00, 'pending', '2022-01-14', '2022-01-14 16:57:55'),
  (4558045, 9067548, '0011', 'Final walk complete', NULL, NULL, 0, 'pending', '2022-01-15', '2022-01-15 09:19:15'),
  (4558085, 11697068, '0007', 'Final walk complete', NULL, NULL, 0, 'pending', '2022-01-15', '2022-01-15 10:36:13'),
  (4558236, 11551200, '0006', 'Credit for poppy seeds', 'Poppy seeds were not planted by Picture Build. Credit for labor and materials that was in final price list and contract.', NULL, -75.00, 'pending', '2022-01-15', '2022-01-15 17:21:14'),
  (4562152, 10982964, '0030', 'Misc irrigation work', 'Install 16 zone rachio timer
Install two new sprinklers for better coverage
Cancel one sprinkler by side wall', NULL, 800.00, 'pending', '2022-01-17', '2022-01-17 16:03:02'),
  (4562256, 11686236, '0002', 'Pavers 26 sf less and 1 more lf of step', NULL, NULL, -314.00, 'pending', '2022-01-17', '2022-01-17 16:54:49'),
  (4564028, 11822158, '0005', 'Add''l Podocarpus Henkelii', '(17) 15 gallon', NULL, 3000.00, 'pending', '2022-01-18', '2022-01-18 09:32:45'),
  (4566256, 11136139, '0010', 'Surface Drain System with catch basins', '60 linear feet of drain 
7 basins 9”x9”', NULL, 1950.00, 'sold', '2022-01-18', '2022-01-18 15:49:10'),
  (4566258, 11136139, '0011', 'Wall extension', '2 courses 
Dowel rebar into existing wall
Smooth stucco in white', NULL, 500.00, 'sold', '2022-01-18', '2022-01-18 15:49:59'),
  (4566346, 11515957, '0011', 'Concrete (upper yard) ~30SF', 'demo, form and pour approx 30 SF of concrete in upper backyard, see photo attached.

(replacement of concrete pad)', NULL, 600.00, 'sold', '2022-01-18', '2022-01-18 16:31:14'),
  (4566570, 11305160, '0006', 'Add rachio controller per conversation', NULL, NULL, 300.00, 'pending', '2022-01-18', '2022-01-18 18:22:33'),
  (4566758, 9458413, '0010', 'Irrigation wiring', '3 hours labor @$75/hr. + $80 material

Rewire valves, check all lines.', NULL, 305.00, 'sold', '2022-01-18', '2022-01-18 22:18:44'),
  (4568197, 11918167, '0001', 'Colored concrete pad for firewood', 'Pour colored concrete pad for wood
2'' x 7''6" = 15.2 SF
Includes forming, labor and all materials.', NULL, 250.00, 'sold', '2022-01-19', '2022-01-19 09:46:45'),
  (4568604, 11918167, '0002', 'Trim roses', 'Trim back large vining rose bush 18"', NULL, 65.00, 'sold', '2022-01-19', '2022-01-19 10:47:10'),
  (4568614, 11918167, '0003', '3" SDR pipe for drainage', '14 LF of 3" SDR drainage from French perforated drain to dry well (in planter)', NULL, 322.00, 'sold', '2022-01-19', '2022-01-19 10:48:29'),
  (4568646, 11918167, '0004', 'Add one course and cap to CMU wall', '- Add one 6" CMU course to 18 LF of wall
- Add rectangular cap to wall for garbage can enclosure. (So the taller garbage can tops can be hidden) 18 LF', NULL, 263.00, 'sold', '2022-01-19', '2022-01-19 10:53:49'),
  (4568660, 11918167, '0005', 'Credit for towel rack footing', 'Not doing a footing for towel rack near spa
Issuing a credit.', NULL, -100.00, 'sold', '2022-01-19', '2022-01-19 10:55:07'),
  (4568703, 11918167, '0006', '14 LF of sleeve for electrical stub up for spa', '3" triple wall sleeve for approx 14LF

From stub up in planter to garage disconnect.', NULL, 210.00, 'pending', '2022-01-19', '2022-01-19 11:00:28'),
  (4568823, 11918167, '0007', 'Demo and forming 3 steps', 'Demo Trex steps.
Form 3 steps with 6" rise for Trex overlay. Includes all wood.Trex boards are 5 1/2" wide. So step tread will be 11" (or 13" if 2" pieces can be used).*Client to purchase Trex separately.(If lead time for Trex is longer, we can credit for installing Trex)', NULL, 775.00, 'sold', '2022-01-19', '2022-01-19 11:19:50'),
  (4569338, 11822158, '0006', 'Additional Sod', 'Additonal sod was added as beds were reshaped', NULL, 900.00, 'sold', '2022-01-19', '2022-01-19 12:36:10'),
  (4570408, 11515957, '0012', 'Electrical - outlet and conduit', '12 LF of 3/4” Electrical conduit with (3) 12 gauge wires
(1) outdoor rated duplex outlet
Includes punch out, trenching and electrical.', NULL, 330.00, 'pending', '2022-01-19', '2022-01-19 16:37:04'),
  (4571752, 11515957, '0013', 'Additional labor for concrete upper backyard', 'Saw cut and chip away from wall. This is for saw cutter and labor to chip away without damaging wall.', NULL, 250.00, 'sold', '2022-01-20', '2022-01-20 08:06:43'),
  (4574644, 11305160, '0007', '4 more linear feet of step build.', NULL, NULL, 240.00, 'pending', '2022-01-20', '2022-01-20 17:29:52'),
  (4575311, 11822158, '0007', 'Credit for wall block', NULL, NULL, -150.00, 'sold', '2022-01-21', '2022-01-21 06:51:23'),
  (4575316, 11822158, '0008', 'Credit for Play Structure Removal', NULL, NULL, -300.00, 'sold', '2022-01-21', '2022-01-21 06:52:04'),
  (4575319, 11822158, '0009', 'Additional Demo', NULL, NULL, 1600.00, 'sold', '2022-01-21', '2022-01-21 06:52:37'),
  (4576345, 11925579, '0001', '5 Additional 15 gal. Podocarpus @ $175.', NULL, NULL, 875.00, 'pending', '2022-01-21', '2022-01-21 10:08:46'),
  (4576403, 11918167, '0008', '49 LF of trenching at 18" deep', '49LF of trenching at 18" deep. (to code)
Includes backfill.

*Work is already performed.', NULL, 735.00, 'sold', '2022-01-21', '2022-01-21 10:21:21'),
  (4576413, 11515957, '0014', '2 replacement valves near pool', 'Valves near pool are old and leaking. 
Install (2) new plastic valves and test.', NULL, 200.00, 'pending', '2022-01-21', '2022-01-21 10:22:37'),
  (4576604, 11822158, '0010', 'Credit for 200sqft mulch', NULL, NULL, -225.00, 'sold', '2022-01-21', '2022-01-21 10:58:53'),
  (4576626, 11925579, '0002', 'Small timber retaining wall 5 LF.', 'The first course is 5 LF.    $375.
     
6 course at 5 LF. each course
30 LF.    $1,500

Back fill with existing soil $150.
Delivery for timber. $120.

Total $2,145.', NULL, 2145.00, 'sold', '2022-01-21', '2022-01-21 11:04:35'),
  (4576807, 11925579, '0003', 'Irrigation: connecting to existing Irrigation', 'This irrigation is only for the top of the hill for the new plants.


Not the podocarpus', NULL, 300.00, 'sold', '2022-01-21', '2022-01-21 11:39:46'),
  (4576849, 11897498, '0001', 'Drainage  80 lf with caps.', NULL, NULL, 1760.00, 'pending', '2022-01-21', '2022-01-21 11:47:59'),
  (4582290, 11897498, '0002', 'Design credit', NULL, NULL, -750.00, 'pending', '2022-01-24', '2022-01-24 13:57:33'),
  (4583370, 10609753, '0006', 'Add 41 LF border stone to concrete under carport', 'Continue border stone along both sides of carport. 
19’ 6” (x both sides) = 39’ LF of border.', 'Make sure TINO has this part in his scope.', 490.00, 'sold', '2022-01-24', '2022-01-24 20:36:43'),
  (4583379, 10609753, '0007', 'Credit - main line shut off valve', 'Client already has main line shut off valve.', NULL, -100.00, 'sold', '2022-01-24', '2022-01-24 20:41:55'),
  (4583382, 10609753, '0008', '18 LF of main line 3/4”', '18 LF of main line 3/4” copper.
Buried 18" below grade per code.
Includes trenching and backfill.

New location near fence in grass zone buried with green cover at grade. Going to be out of the way and much cleaner of a look. Zero trip hazard.', 'This is the correct size and LF, but needs to be copper line..(.ok thanks, corrected and sent!)', 750.00, 'sold', '2022-01-24', '2022-01-24 20:43:23'),
  (4583384, 10609753, '0009', 'Kill ivy with Organic Ivy Spray, on first day', 'No charge.', NULL, 0, 'sold', '2022-01-24', '2022-01-24 20:44:23'),
  (4585559, 10391726, '0012', 'Brick cap and Brick Veneer install', '- Install 4 LF. Of 8" brick for cap and grout on 6" return wall

 Install 70 square feet brick veneer and grout.

All labor and materials included.', NULL, 4950.00, 'pending', '2022-01-25', '2022-01-25 11:01:51'),
  (4587429, 11305160, '0008', 'Pea gravel. 250 sf', NULL, NULL, 1250.00, 'pending', '2022-01-25', '2022-01-25 16:23:58'),
  (4587471, 10751504, '0010', '8 more Wax privets', 'Grace,

It was so great to see you yesterday and enjoy seeing your amazing backyard!!

Notes from our meeting:

1)  Please approve 8 more Wax Leaf Privets X $43.50= $348.00

2)  Lights- moving 2 lights, we can easily move them when our landscape crew is next door installing lights', NULL, 348.00, 'pending', '2022-01-25', '2022-01-25 16:44:29'),
  (4588879, 11894433, '0001', 'Drain work', 'Dig down 24 inches remove soil and backfill with gravel on 30 drain inlets at $250 per inlet

total $7500', NULL, 7500.00, 'pending', '2022-01-26', '2022-01-26 08:38:00'),
  (4588915, 11894433, '0002', 'One additional large planter grading', 'One additional planter to be graded and plants to be removed. Using existing plants from another planter to transplant.
Backfill with 27 cu ft of soil 
grade planters to drains.
3 yards of Additional soils for other planters needed
$1500', NULL, 1500.00, 'pending', '2022-01-26', '2022-01-26 08:43:06'),
  (4590098, 11897498, '0003', 'Additional 76 sf of pavers.', 'Approved at job site', NULL, 1140.00, 'pending', '2022-01-26', '2022-01-26 11:51:12'),
  (4591762, 11894433, '0003', 'Original grading work', 'demo existing planters and vegetation, backfill with 7 yards of soil to original planters discussed. 
grade soil to drains for proper water drainage.
adjust heights of drains accordingly.', 'demo existing planters and vegetation, backfill with 7 yards of soil to original planters discussed. 
grade soil to drains for proper water drainage.
adjust heights of drains accordingly.', 4150.00, 'pending', '2022-01-26', '2022-01-26 17:02:44'),
  (4594708, 10609753, '0010', 'Add 18 LF of border stone on either side of apron', '9 LF of border stone on either side of apron. 18 LF in total.', NULL, 187.00, 'sold', '2022-01-27', '2022-01-27 12:34:42'),
  (4597007, 11925579, '0004', 'Irrigation repairs', NULL, NULL, 180.00, 'sold', '2022-01-28', '2022-01-28 07:44:41'),
  (4597559, 11299030, '0028', 'Job completion', NULL, NULL, 0, 'pending', '2022-01-28', '2022-01-28 09:26:45'),
  (4598904, 11515957, '0015', 'Tile labor', 'Tile labor', NULL, 900.00, 'sold', '2022-01-28', '2022-01-28 13:39:11'),
  (4598907, 11515957, '0016', 'Credit for color booster front step entrance', '@$1/SF', NULL, -80.00, 'sold', '2022-01-28', '2022-01-28 13:40:05'),
  (4598916, 11515957, '0017', 'Credit for polysand', 'Credit for not doing polysand at front entryway', NULL, -140.00, 'sold', '2022-01-28', '2022-01-28 13:42:02'),
  (4598963, 11515957, '0018', 'Credit 8 LF of bullnose', '8 LF of bullnose material not using', NULL, -64.00, 'sold', '2022-01-28', '2022-01-28 13:53:30'),
  (4599170, 11515957, '0019', 'Credit 15 LF of wall one course', 'Credit for overage on wall
15lf one course', NULL, -135.00, 'sold', '2022-01-28', '2022-01-28 14:42:52'),
  (4602155, 10609753, '0012', 'Move (2) hose bibs 23.6 LF', 'Move hose bib out of grass area 21 LF
Move hose bib out of walkway and into retaining wall bed. 2'' 6" LF', NULL, 920.00, 'sold', '2022-01-31', '2022-01-31 09:53:49'),
  (4603914, 11917333, '0001', '9 path lights $220. each. No transformer', NULL, NULL, 1980.00, 'sold', '2022-01-31', '2022-01-31 14:05:09'),
  (4603937, 11917333, '0002', 'Adding 5- 15 gal podocarpus macrophyllus', NULL, NULL, 570.00, 'sold', '2022-01-31', '2022-01-31 14:08:24'),
  (4603952, 11917333, '0003', 'Upgrading Ligustrum from 5g to 15g', NULL, NULL, 625.00, 'sold', '2022-01-31', '2022-01-31 14:10:50'),
  (4607032, 11897498, '0004', 'Additional 10 lf of drainage and a cap', NULL, NULL, 220.00, 'pending', '2022-02-01', '2022-02-01 10:51:02'),
  (4607770, 7666319, '0041', 'Added Parking and Timber Step Walkways', 'Per attached addendum.  Price may fluctuate depending upon shooting grades and path location.', NULL, 168521.00, 'sold', '2022-02-01', '2022-02-01 12:37:33'),
  (4610206, 11515957, '0020', 'Tile for front step', NULL, NULL, 437.53, 'pending', '2022-02-02', '2022-02-02 07:28:26'),
  (4611118, 10609753, '0014', 'Gas line repair', NULL, NULL, 1140.00, 'sold', '2022-02-02', '2022-02-02 09:38:35'),
  (4611155, 10609753, '0015', 'Electrical conduit and 2 outlets', NULL, NULL, 837.00, 'sold', '2022-02-02', '2022-02-02 09:45:59'),
  (4611977, 11897498, '0005', 'Plant credit', 'Credit for 3 @5 gal. 5@1 gal.', NULL, -238.00, 'pending', '2022-02-02', '2022-02-02 11:41:01'),
  (4613410, 6731794, '0009', 'Irrigation & valve Repair', NULL, NULL, 450.00, 'pending', '2022-02-02', '2022-02-02 15:09:52'),
  (4613466, 7666319, '0042', 'Back fill and compact 2 sink holes in lifts', NULL, NULL, 1800.00, 'pending', '2022-02-02', '2022-02-02 15:22:22'),
  (4613695, 10609753, '0016', 'Additional gas line work 45 LF', 'Install 45 LF of 3/4” Galvanized Line 18” below grade per code.

Giving a discount for additional work.', NULL, 2200.00, 'pending', '2022-02-02', '2022-02-02 16:40:55'),
  (4617775, 11917333, '0004', '4 zones drip irrigation', NULL, NULL, 3600.00, 'sold', '2022-02-03', '2022-02-03 14:50:24'),
  (4620039, 11917333, '0005', '5 add’l 5g Pittosporum ‘Golf Balls’', NULL, NULL, 225.00, 'sold', '2022-02-04', '2022-02-04 09:40:10'),
  (4620443, 10609753, '0017', 'Waterproofing other main retaining walls', '(3) coats of roll on waterproofing behind walls approx. 57 LF x 3 FT (TALL) = 171 SF

Cost is $10.50/SF and I have given it at $9.35/SF for a total of $1,599.

This is so the stucco doesn’t get damaged when water tries to come through the wall. We did not have this is the contract, but it is suggested.

Discount of $200.', NULL, 1599.00, 'sold', '2022-02-04', '2022-02-04 11:08:26'),
  (4621228, 11610380, '0001', 'Added work, paver, irrigation, demo, main line etc', '1) Change to paver and add sq footage - $2300
2) Added drainage - $1000
3) Added post work - $450
4) Add one more irrigation zone - $800
5) Add copper main line work - $4100
6) Remove 80 linear feet of bender board - credit ($800)
7) Added demo $800', NULL, 9050.00, 'pending', '2022-02-04', '2022-02-04 13:37:57'),
  (4621498, 11918167, '0009', 'Credit for Design', 'As contracted in our design agreement ($400 CREDIT)
THANK YOU MAZERS!', NULL, -400.00, 'sold', '2022-02-04', '2022-02-04 14:54:51'),
  (4623394, 11610380, '0002', 'Added Sod', 'Additional 625 sq feet of sod.', NULL, 2275.00, 'pending', '2022-02-07', '2022-02-07 07:47:49'),
  (4628605, 10919041, '0006', 'Switch out grass for Synthetic Turf', 'We are switching out the sod for Synthetic turf

4 seams $3825 - Pet Gravel Install
credit of $700 for sod installation.

Turf will be #109 So Cal Blend Supreme.
Will need 15 x 14 foot roll.', NULL, 3125.00, 'sold', '2022-02-08', '2022-02-08 10:04:07'),
  (4628897, 11302625, '0002', 'Adding drain', '27 linear feet of 3” drain', NULL, 600.00, 'sold', '2022-02-08', '2022-02-08 10:48:24'),
  (4632425, 10609753, '0018', '30 LF of 4” SDR drainage for large retaining wall', 'FRONTYARD:
30 LF of 4” SDR @ $24 lineal foot

This is to keep water from spilling soil and mulch up and over wall, this will capture the rainwater from the surface.', NULL, 720.00, 'pending', '2022-02-09', '2022-02-09 08:56:25'),
  (4632458, 10609753, '0019', '30 LF French drain frontyard retaining wall', '30 LF of French Drain at bottom of larger retaining wall, includes sock and 12” gravel bed. 
@$40/Lineal Foot', NULL, 1200.00, 'sold', '2022-02-09', '2022-02-09 09:02:58'),
  (4633064, 7666319, '0043', '18 LF of 12" drainage/ under pathway', NULL, NULL, 1080.00, 'pending', '2022-02-09', '2022-02-09 10:48:29'),
  (4633863, 12092100, '0001', 'Asphalt patching/street side', 'for roughly 45 linear feet by 1-2'' post installation of driveway apron and small curb', NULL, 900.00, 'sold', '2022-02-09', '2022-02-09 12:32:11'),
  (4634107, 10609753, '0020', 'Credit for wall near gas line', 'Credit for over-measurement of wall.  Wall is 29 LF long @ $155.50/LF.', NULL, -1400.00, 'sold', '2022-02-09', '2022-02-09 13:08:45'),
  (4634114, 10609753, '0021', 'Credit for Electrical conduit', 'Over measurement of conduit. Credit $200.', NULL, -200.00, 'sold', '2022-02-09', '2022-02-09 13:09:28'),
  (4634140, 10609753, '0022', '7 LF of one course of 8” CMU block', 'We need 7 LF of 8” CMU block to make wall slightly higher.
Stucco to match.', NULL, 125.00, 'sold', '2022-02-09', '2022-02-09 13:11:50'),
  (4634949, 1998991, '0001', 'Paver repair', NULL, NULL, 465.00, 'pending', '2022-02-09', '2022-02-09 15:37:56'),
  (4634983, 10713700, '0007', 'Trenching and backfilling in lifts 2 days men', NULL, NULL, 3000.00, 'pending', '2022-02-09', '2022-02-09 15:46:48'),
  (4637149, 10919041, '0007', 'Additional Credits', 'waterproofing credit       $125.00
returned plants               $195.00', NULL, -320.00, 'pending', '2022-02-10', '2022-02-10 10:18:42'),
  (4638439, 11302625, '0003', '11 step lights', NULL, NULL, 2450.00, 'sold', '2022-02-10', '2022-02-10 13:56:19'),
  (4638655, 11917333, '0006', 'Additional 5-gallon plants', '3- 5gal Westrangia 
1- 5gal. Pit. Golf ball', NULL, 174.00, 'sold', '2022-02-10', '2022-02-10 14:35:53'),
  (4641088, 12017844, '0001', 'Replace outlet', NULL, NULL, 120.00, 'pending', '2022-02-11', '2022-02-11 10:43:31'),
  (4641525, 12017844, '0002', 'Credit for Ceanothus', NULL, NULL, -45.00, 'pending', '2022-02-11', '2022-02-11 11:57:53'),
  (4641527, 12017844, '0003', '(3) flats Dymondia', NULL, NULL, 210.00, 'pending', '2022-02-11', '2022-02-11 11:58:07'),
  (4642017, 12080928, '0001', 'Plant design.', 'Plant design.', NULL, 375.00, 'pending', '2022-02-11', '2022-02-11 13:19:38'),
  (4642179, 11918167, '0010', 'Credit for 48” box difference', 'Cost difference from 48” box to 36” box. 
We could not find the 48” Liquid Amber so we are getting a 36” box PINK multi-trunk Crape Myrtle.', NULL, -350.00, 'sold', '2022-02-11', '2022-02-11 13:55:44'),
  (4642547, 11302625, '0004', 'Build ledge to cover footings', NULL, NULL, 525.00, 'sold', '2022-02-11', '2022-02-11 16:40:07'),
  (4645968, 12092100, '0002', 'Tree removal/Fence Posts', 'Remove tree and stump, additional soils 
Remove fence posts/entry gate', NULL, 1000.00, 'sold', '2022-02-14', '2022-02-14 11:34:54'),
  (4645978, 12092100, '0003', 'Additional St. Augustine Sod', NULL, NULL, 2000.00, 'sold', '2022-02-14', '2022-02-14 11:36:39'),
  (4645984, 12092100, '0004', '(1) valve', NULL, NULL, 250.00, 'sold', '2022-02-14', '2022-02-14 11:37:10'),
  (4645989, 12092100, '0005', 'Waterproof Retaining Wall', 'Henry''s tar', NULL, 700.00, 'sold', '2022-02-14', '2022-02-14 11:38:01'),
  (4645998, 12092100, '0006', 'French Drain for Behind Retaining Wall', '3" drain wrapped in sock buried in 12" gravel bed, exit and pop up into bed with Jades', NULL, 1300.00, 'sold', '2022-02-14', '2022-02-14 11:38:58'),
  (4646174, 1773939, '0001', 'Wallwork', NULL, NULL, 16000.00, 'pending', '2022-02-14', '2022-02-14 12:04:26'),
  (4646177, 1773939, '0002', 'Existing wall demo', NULL, NULL, 4000.00, 'pending', '2022-02-14', '2022-02-14 12:04:42'),
  (4646178, 1773939, '0003', 'Original Quote 2 tree', NULL, NULL, 1900.00, 'pending', '2022-02-14', '2022-02-14 12:04:53'),
  (4646179, 1773939, '0004', 'Addition for tall tree', NULL, NULL, 600.00, 'pending', '2022-02-14', '2022-02-14 12:05:07'),
  (4646221, 1773939, '0005', 'Removing chainlink fence, footings, etc', 'Removing chainlink fence, footings, ivy, 2 small trees 4 additional stumps', NULL, 2000.00, 'pending', '2022-02-14', '2022-02-14 12:13:25'),
  (4648649, 10609753, '0023', 'Adding 15LF. Of conduit', NULL, NULL, 225.00, 'sold', '2022-02-15', '2022-02-15 06:50:17'),
  (4648659, 10609753, '0024', 'Cut wall back 18" for gate', NULL, NULL, 450.00, 'sold', '2022-02-15', '2022-02-15 06:52:29'),
  (4648671, 10713700, '0008', 'Tile upgrade', NULL, NULL, 900.00, 'pending', '2022-02-15', '2022-02-15 06:54:25'),
  (4648720, 9458413, '0011', 'Replace a broken valve.', NULL, NULL, 250.00, 'sold', '2022-02-15', '2022-02-15 07:02:13'),
  (4651781, 12017844, '0004', 'Job completion', NULL, NULL, 0, 'pending', '2022-02-15', '2022-02-15 14:17:28'),
  (4656656, 7666319, '0044', '140 LF. Of conduit (wire not included)', NULL, NULL, 2100.00, 'sold', '2022-02-16', '2022-02-16 15:41:06'),
  (4658642, 11918167, '0011', 'Credit for steps', 'We did not complete steps, Mikale was going to install and needed to return to Michigan for a family emergency.', NULL, -775.00, 'sold', '2022-02-17', '2022-02-17 09:04:17'),
  (4658691, 12092100, '0007', 'Steal angle for pipe', NULL, NULL, 0, 'sold', '2022-02-17', '2022-02-17 09:10:12'),
  (4660997, 7666319, '0045', 'CREDIT Landscape Timber Retaining Walls Main Path', 'CREDIT  the following
Landscape Timber Retaining Walls – Main Path
1.    Use 8’ x 6” ACQ Pressure Treated Lumber from Topanga Lumber
2.    Dig footings for steps down 12 inches below grade
3.    Install geofabric and ¾ crushed gravel bed.
4.    Install first course beam to grade.  Use 3 foot #4 rebar to secure to ground
5.    Secure added courses with 3/8” x 10” timber screws
6.    Install total of roughly 215 linear feet of retaining wall at average 24 inch height. 
7.    Install Timber edging border to math existing. 
CREDIT TOTAL (36,550)


ADD back in -
200 lnft next to lower walkway ditch or two course retaining.
Retaining section bottom gully under walkway piping. 
1 course timber retainment for flat sections of walkway. approx 80 lnft for each of the two sides.160 lnft total
Upper patio retainment for main walkway
TOTAL : $27,500

NET TOTAL : (9,050)', NULL, -9050.00, 'sold', '2022-02-17', '2022-02-17 15:06:20'),
  (4667572, 12151137, '0001', 'Copper shield for irrigation for ground covers', 'Add copper shield to ground cover areas in front and back for Dymondia silver carpet.', NULL, 175.00, 'sold', '2022-02-21', '2022-02-21 10:09:59'),
  (4667665, 12151137, '0002', '4 LF 6" x 1" brown plastic bender board', 'We have 66 LF in contract and 70 LF is needed.
This is the cost difference.', NULL, 35.00, 'sold', '2022-02-21', '2022-02-21 10:26:02'),
  (4667726, 10609753, '0025', 'Extra stump removal in backyard near house', 'Stump removal 24" away from house 24" from current grade level according to foundation repair company.', NULL, 450.00, 'sold', '2022-02-21', '2022-02-21 10:36:16'),
  (4667743, 10609753, '0026', 'Concrete root barrier pour', 'Pour approx. 20 LF of 2500 psi concrete at 2'' depth BELOW paver demo grade (6").

Concrete to be with #3 rebars at 2'' depth.

Total concrete 1.5 CY.

This is to protect the foundation of house and new pavers from being uplifted by neighbors tree.', NULL, 2600.00, 'pending', '2022-02-21', '2022-02-21 10:39:28'),
  (4668141, 10609753, '0027', '150 SF additional grass', '@$3.25/SF for 150 SF

Bender board lines around trees have changed (closer to trees now) so therefore, more grass is needed.', NULL, 487.00, 'sold', '2022-02-21', '2022-02-21 11:46:33'),
  (4672078, 12080928, '0002', 'Adding 84 sf of dg', NULL, NULL, 420.00, 'pending', '2022-02-22', '2022-02-22 10:51:46'),
  (4672392, 1773939, '0006', 'Extra Excavation for footings', NULL, NULL, 400.00, 'pending', '2022-02-22', '2022-02-22 11:36:00'),
  (4672413, 1773939, '0007', '75 LF. 3" French drain', NULL, NULL, 3000.00, 'pending', '2022-02-22', '2022-02-22 11:38:39'),
  (4683038, 11302625, '0005', 'Extra demo', NULL, NULL, 400.00, 'pending', '2022-02-24', '2022-02-24 14:19:12'),
  (4683361, 12151137, '0004', 'New manual timer', 'We need a manual 6 station timer, currently there is a timer with 4 stations and we have 5 zones.', NULL, 250.00, 'sold', '2022-02-24', '2022-02-24 15:24:25'),
  (4685895, 12080928, '0003', 'Plant changes $81.00', NULL, NULL, 81.00, 'pending', '2022-02-25', '2022-02-25 11:00:02'),
  (4686026, 12080928, '0004', 'Vinyl credit.', 'Not using steel, using vinyl. Adding 50 lf.', NULL, -50.00, 'pending', '2022-02-25', '2022-02-25 11:21:32'),
  (4686854, 12092100, '0008', 'Additional return wall 7LF. 28"H.  with', 'With water proofing', NULL, 1000.00, 'sold', '2022-02-25', '2022-02-25 13:40:47'),
  (4686895, 12092100, '0009', '40LF. Bend a board for trees', NULL, NULL, 160.00, 'sold', '2022-02-25', '2022-02-25 13:49:36'),
  (4686900, 11302625, '0006', '9sqft of paver pathway added  ( towards driveway)', NULL, NULL, 275.00, 'pending', '2022-02-25', '2022-02-25 13:50:41'),
  (4690904, 12244813, '0001', 'Credit for permitting', 'Permits pulled by client for utilities.
We will schedule inspections and meet with inspector.', NULL, -2500.00, 'sold', '2022-02-28', '2022-02-28 11:00:42'),
  (4690913, 12244813, '0002', 'Credit for dry wells', 'Client installed dry wells already. 
Line item # 14 under "Drainage"', NULL, -900.00, 'sold', '2022-02-28', '2022-02-28 11:01:48'),
  (4691014, 12244813, '0004', 'Add 6" diameter to circular firepit', '36" fire ring
46" firepit (contract has 40")', NULL, 235.00, 'sold', '2022-02-28', '2022-02-28 11:18:33'),
  (4691040, 12244813, '0005', 'Credit for 6" less of upper planter', NULL, NULL, -235.00, 'sold', '2022-02-28', '2022-02-28 11:23:07'),
  (4692863, 7666319, '0046', 'Conduit for Pilasters 85Lf (rough only)', NULL, NULL, 1275.00, 'sold', '2022-02-28', '2022-02-28 17:06:04'),
  (4692866, 7666319, '0047', 'Additional 2 pilasters18"×18"× 6'' high (no veneer)', NULL, NULL, 1675.00, 'sold', '2022-02-28', '2022-02-28 17:07:48'),
  (4695169, 12131143, '0001', 'Return wall against steps', '17 linear feet, stepping up to follow grade 
1 course plus footing', NULL, 750.00, 'sold', '2022-03-01', '2022-03-01 10:29:53'),
  (4695171, 12131143, '0002', 'Adding (1) course for return/driveway', NULL, NULL, 200.00, 'sold', '2022-03-01', '2022-03-01 10:30:22'),
  (4695172, 12131143, '0003', 'Extending water main to move irrigation valves', NULL, NULL, 350.00, 'sold', '2022-03-01', '2022-03-01 10:30:54'),
  (4695243, 12151137, '0005', 'Credit for boulders', 'Credit for 
two medium size 2-head boulders and 
two large size 4-headed boulders.', NULL, -284.00, 'sold', '2022-03-01', '2022-03-01 10:41:47'),
  (4696484, 10609753, '0028', 'Smooth stucco upgrade', 'Smooth stucco 320 SF. (Upgrade from sanded stucco in contract)', NULL, 468.00, 'sold', '2022-03-01', '2022-03-01 13:29:02'),
  (4697049, 7666319, '0048', 'Additional wall 40 LF 3 courses with cap', NULL, NULL, 6340.00, 'sold', '2022-03-01', '2022-03-01 15:14:52'),
  (4697371, 7666319, '0049', '8 tons of 3 to 6-inch rock for bottom gully', 'This change order is for 8 tons of 3 to 6" rock. If more is needed, we would need to add more cost.', NULL, 6950.00, 'sold', '2022-03-01', '2022-03-01 17:04:41'),
  (4697392, 8160247, '0009', 'Paver sealer', 'Sealer to be wet look pbpro

Change order approved via text', NULL, 2410.50, 'pending', '2022-03-01', '2022-03-01 17:16:57'),
  (4697403, 11505897, '0001', 'Credit for Planter Box', NULL, NULL, -750.00, 'pending', '2022-03-01', '2022-03-01 17:24:39'),
  (4697405, 11505897, '0002', 'Credit for plants', NULL, NULL, -400.00, 'pending', '2022-03-01', '2022-03-01 17:25:27'),
  (4697409, 11505897, '0003', 'Addition of groundcover for front/sides/back', 'Includes demo of DG in front area, soils between flagstones side/back areas
Will add 2 yds of 50/50 soil

16 flats of groundcover for front
8 flats for side/back

Mixing Creeping Thyme and Sedum Gold Moss for sunnier areas and Blue Star (Isotoma)
Plus (1) 5 gallon Red Hibiscus', NULL, 3175.00, 'pending', '2022-03-01', '2022-03-01 17:29:16'),
  (4701053, 12244813, '0006', 'Move drain line 6LF.', NULL, NULL, 252.00, 'sold', '2022-03-02', '2022-03-02 11:07:44'),
  (4701073, 12244813, '0007', 'Backfill and compact in lifts on N. side for steps', NULL, NULL, 2400.00, 'sold', '2022-03-02', '2022-03-02 11:11:05'),
  (4704197, 12151137, '0006', 'New brass Valve', NULL, NULL, 265.00, 'sold', '2022-03-03', '2022-03-03 07:27:42'),
  (4709405, 12131143, '0004', 'Low voltage lighting', '5 path lights 
1- 150w. Transformer 

The client will text me the model number by Monday', NULL, 1530.00, 'sold', '2022-03-04', '2022-03-04 09:43:17'),
  (4710764, 12234940, '0001', 'Extra hauling of plant material', 'Extra hauling of plant materials and rock removal. Bird of Paradise on side of home as well.', NULL, 200.00, 'pending', '2022-03-04', '2022-03-04 13:58:30'),
  (4716435, 11505897, '0004', 'Credit for (1) 5 gallon Hibiscus', NULL, NULL, -45.00, 'pending', '2022-03-07', '2022-03-07 16:08:22'),
  (4716439, 11505897, '0005', 'Addition of (1) 15 gallon Podocarpus', NULL, NULL, 150.00, 'pending', '2022-03-07', '2022-03-07 16:08:54'),
  (4719770, 12131143, '0005', 'Additional course', NULL, NULL, 399.00, 'pending', '2022-03-08', '2022-03-08 12:31:53'),
  (4723835, 12317877, '0001', 'Additional gas line 51 Lf. 1¹/²', 'Additional 51 LF. Of 1½" poly line from gas meter to reduce ¾" for  house fireplace and 1¼"  to bbq and fire pit.', NULL, 1683.00, 'sold', '2022-03-09', '2022-03-09 10:51:57'),
  (4726306, 12244813, '0008', '¾" pipe run to front yard 60 LF.', NULL, NULL, 180.00, 'sold', '2022-03-09', '2022-03-09 20:16:35'),
  (4726317, 8160247, '0010', 'Paver repair due to contractor damage', 'Demo out pavers and replace with new pavers', NULL, 0, 'pending', '2022-03-09', '2022-03-09 20:22:29'),
  (4728347, 12345938, '0001', '(4) additional stump grinds', 'Stump grinding along new wooden fence where large trees coming out.', NULL, 500.00, 'pending', '2022-03-10', '2022-03-10 10:19:34'),
  (4729515, 12192102, '0001', '2 flats, 2 5gals', NULL, NULL, 234.00, 'pending', '2022-03-10', '2022-03-10 12:53:48'),
  (4731426, 12317877, '0002', 'New electrical run for pool equipment', '55 LF. Of 1¼" conduit 3- #4 wires.', NULL, 1200.00, 'sold', '2022-03-11', '2022-03-11 07:04:34'),
  (4733339, 11505897, '0006', 'Cleanup for Parkway on Southside', NULL, NULL, 600.00, 'pending', '2022-03-11', '2022-03-11 12:39:15'),
  (4734624, 12151137, '0007', 'Final walk', NULL, NULL, 0, 'pending', '2022-03-12', '2022-03-12 14:37:38'),
  (4738032, 12294179, '0001', 'Design credit', 'Design credit.', NULL, -750.00, 'pending', '2022-03-14', '2022-03-14 12:51:12'),
  (4738044, 12294179, '0002', '7 more lights', '7x $190.00= $1,330.00', NULL, 1330.00, 'pending', '2022-03-14', '2022-03-14 12:53:26'),
  (4742893, 11505897, '0007', 'Final walk', NULL, NULL, 0, 'pending', '2022-03-15', '2022-03-15 13:41:53'),
  (4743606, 11939094, '0001', 'Adding planting and mulch.', 'See photo', NULL, 2830.00, 'pending', '2022-03-15', '2022-03-15 16:47:00'),
  (4746947, 12244813, '0009', 'Additional 2 steps North side', NULL, NULL, 260.00, 'sold', '2022-03-16', '2022-03-16 12:55:17'),
  (4746965, 12244813, '0010', 'Move 2 drain lines & add 1 drain north side steps', NULL, NULL, 180.00, 'sold', '2022-03-16', '2022-03-16 12:57:40'),
  (4746978, 12244813, '0011', 'Move gas line for fire pit', NULL, NULL, 120.00, 'sold', '2022-03-16', '2022-03-16 12:59:02'),
  (4746993, 12244813, '0012', 'Extend planter on north side', NULL, NULL, 89.00, 'sold', '2022-03-16', '2022-03-16 13:00:30'),
  (4748264, 11939094, '0002', 'Extend wall 4 ft, curved corners & curve pavers', NULL, NULL, 808.00, 'pending', '2022-03-16', '2022-03-16 18:25:53'),
  (4749788, 12131143, '0006', 'Final walk', NULL, NULL, 0, 'pending', '2022-03-17', '2022-03-17 08:54:32'),
  (4750182, 12345938, '0002', 'Additional plant costs', NULL, NULL, 400.00, 'pending', '2022-03-17', '2022-03-17 10:01:49'),
  (4750308, 12294179, '0003', 'Polymeric sand', NULL, NULL, 893.00, 'pending', '2022-03-17', '2022-03-17 10:21:18'),
  (4751984, 12244813, '0013', 'Back fill and compact dry well', NULL, NULL, 260.00, 'sold', '2022-03-17', '2022-03-17 15:20:03'),
  (4754920, 11768634, '0001', 'Credit 350sqft rock (soil set) on estimate', NULL, NULL, -3500.00, 'pending', '2022-03-18', '2022-03-18 12:26:17'),
  (4754937, 11768634, '0002', 'River rock concrete set 350sqft', 'Materials (concrete plus river rock for all 4 sides of median)
Labor
Delivery of material to site', NULL, 12250.00, 'pending', '2022-03-18', '2022-03-18 12:28:15'),
  (4759115, 11505897, '0008', 'Credit 1 15gal', NULL, NULL, -150.00, 'pending', '2022-03-21', '2022-03-21 11:04:02'),
  (4759293, 11047318, '0002', 'Additional Work', '489 sqft of dual layers of water proofing
trenching and recompaction
applying roll on waterproofing and then applying subseal
torching the waterproofing and roll on waterproofing
compaction and cleaning
$9650
Retrofitting existing valve to drip netafilm system 
$800

Total $10450', NULL, 10450.00, 'pending', '2022-03-21', '2022-03-21 11:28:28'),
  (4759963, 12244813, '0014', 'Move drain line on south side', NULL, NULL, 189.00, 'sold', '2022-03-21', '2022-03-21 12:56:23'),
  (4765207, 12386445, '0001', 'Additional sod', 'Additional sod', NULL, 287.00, 'pending', '2022-03-22', '2022-03-22 13:48:13'),
  (4765368, 12317877, '0003', 'Additional course 39 lf.', NULL, NULL, 375.00, 'sold', '2022-03-22', '2022-03-22 14:16:08'),
  (4768589, 11047318, '0003', 'Rerun new irrigation laterals', 'Need to run new irrrigation laterals to bypass leaking under decking.', NULL, 2500.00, 'pending', '2022-03-23', '2022-03-23 10:41:00'),
  (4768613, 8309666, '0010', 'Remulch 4 yards.', NULL, NULL, 900.00, 'pending', '2022-03-23', '2022-03-23 10:43:33'),
  (4768685, 11925579, '0005', 'Added Planting', NULL, NULL, 9500.00, 'pending', '2022-03-23', '2022-03-23 10:52:12'),
  (4768760, 12244813, '0015', 'Hauling soil 13 CY', '12 CY of additional soil removal @ $130/CY
3 CY was in contract, we hauled 16 in total.', NULL, 1560.00, 'sold', '2022-03-23', '2022-03-23 11:03:04'),
  (4768809, 12244813, '0016', 'Credit for 1 step at bottom of south steps', 'Credit for one cantilever step 5’2” x 1’ w sand finish', NULL, -500.00, 'sold', '2022-03-23', '2022-03-23 11:11:34'),
  (4768879, 12244813, '0017', 'Adding 1 LF of cantilever to 14 steps', '11 steps at 3’ now going to be 4’
3 steps at 5’2” now going to be 6’2”  (at bottom)

Adding 2” cantilever to each front facing side
Adding 14 SF of sand finish (no charge)
Adding 14 LF of additional forming (no charge)', NULL, 1022.00, 'sold', '2022-03-23', '2022-03-23 11:19:59'),
  (4769187, 12244813, '0018', 'Adding more pavers and forming', 'Adding concrete pour for extra 32 SF 
Sand finish 32 SF
Adding forming 55 SF

This is where the concrete poured in place pavers will be since we are not doing a 2nd bench', NULL, 432.00, 'sold', '2022-03-23', '2022-03-23 12:01:03'),
  (4772752, 12294179, '0004', 'Additional Bender Board 120 LF', NULL, NULL, 960.00, 'pending', '2022-03-24', '2022-03-24 09:21:50'),
  (4772780, 12294179, '0005', '9 cubic yards of 50/50 soil + delivery', NULL, NULL, 844.00, 'pending', '2022-03-24', '2022-03-24 09:24:40'),
  (4773776, 12443656, '0001', 'Playground mulch', NULL, NULL, 107.00, 'pending', '2022-03-24', '2022-03-24 11:52:31'),
  (4774139, 11515957, '0021', 'Re-stucco walls', NULL, NULL, 630.00, 'pending', '2022-03-24', '2022-03-24 12:43:31'),
  (4783491, 11768634, '0003', 'Compacting soils in lifts', NULL, NULL, 1350.00, 'pending', '2022-03-28', '2022-03-28 13:42:52'),
  (4783493, 11768634, '0004', 'Solar timer with steel stand', NULL, NULL, 1200.00, 'pending', '2022-03-28', '2022-03-28 13:43:38'),
  (4785907, 11925579, '0006', '3 yds premium walk on mulch', NULL, NULL, 400.00, 'pending', '2022-03-29', '2022-03-29 08:25:15'),
  (4794830, 12294179, '0006', '220 sf rock gardens', '2 cubic yards of fabric and -1"del Rio please order 10 bags of 4-6"rock to be delivered by Verva 15 boulders to be delivered by Verva', NULL, 1320.00, 'pending', '2022-03-31', '2022-03-31 08:25:07'),
  (4795052, 12392902, '0001', 'Add 21 LF of brown bender board 1" x 6"', 'Adding curved bender board 21 LF for flower bed', NULL, 157.50, 'pending', '2022-03-31', '2022-03-31 09:23:05'),
  (4795162, 12392902, '0002', 'Install concrete for base of flagstones', 'Installing flagstones in concrete and cutting turf around so that stones don''t wobble on top of turf.

$650 labor
$300 material', NULL, 950.00, 'pending', '2022-03-31', '2022-03-31 09:40:20'),
  (4797972, 12294179, '0007', 'Additional rtf 1048 sf', 'Additional sf of grass. Field measurement.', NULL, 3668.00, 'pending', '2022-03-31', '2022-03-31 18:32:19'),
  (4799272, 11925579, '0007', 'Drip Irrigation to new plantings', NULL, NULL, 300.00, 'pending', '2022-04-01', '2022-04-01 08:06:54'),
  (4801540, 10713700, '0009', 'Additional Pool Work', 'Raise Skimmer - Break out shell, reset. $1900
Raise Overflow - Remove coping. Break out shell.  Move Overflow, Dowel and reconcrete shell.  $1200
Raise Vacuum -  New Core shell, Patch old shell core.  Reinstall vacuum line - $700
Add 3 LED lights - run conduit and lights back to controller.  Core sheet for Niche Globrite (does not include lights)  $1200
Remove existing pool light and patch shell - $250
Lower trenching on pool equipment for elevator 2 1/2 feet deep and continue under grade beam. - $900

Tiles having issues. All pool tile work outside of original contract to be future assessed.  Not included in this change order.', NULL, 6150.00, 'pending', '2022-04-01', '2022-04-01 15:27:31'),
  (4802565, 12294179, '0008', 'Lights credit & additional plants.', 'Got it, thanks! 

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
TOTAL CHANGE ORDER $6.00', NULL, 6.00, 'pending', '2022-04-03', '2022-04-03 20:42:11'),
  (4805252, 12317877, '0004', 'Polysand', NULL, NULL, 1400.00, 'sold', '2022-04-04', '2022-04-04 12:28:59'),
  (4805825, 12470275, '0001', 'adding plants', 'adding 1 - 5 gallon rosemary
adding 1 - 1 gallon thyme', NULL, 65.00, 'pending', '2022-04-04', '2022-04-04 13:42:26'),
  (4809593, 12478911, '0001', 'Paver dump fee', 'Wash with saw cutting concrete on contract.', NULL, 0, 'pending', '2022-04-05', '2022-04-05 11:32:28'),
  (4813659, 12470275, '0002', 'Add 18 LF for gas line', 'Adding 3/4" polyline to reach firepit.', NULL, 518.00, 'pending', '2022-04-06', '2022-04-06 10:19:39'),
  (4813736, 12470275, '0003', '715 SF of 8" additional demo on side yard', 'Grass and soil on side yard is very high. We only have 3" removal BELOW soil level. Above soil level is another 5"-8" average which we need to also remove.', NULL, 1250.00, 'pending', '2022-04-06', '2022-04-06 10:28:17'),
  (4813859, 12470275, '0004', 'Additional bender board 70 LF', 'Need additional bender board with curved lines.
190 LF was in contact
Measured 260 LF 
Difference is 70 @ discounted price $11.50', NULL, 850.00, 'pending', '2022-04-06', '2022-04-06 10:46:22'),
  (4813888, 12470275, '0005', 'Adding 6" of gravel nearest fence', 'Adding 6" more of del Rio gravel all the way around fence area as to avoid concrete fence footings.', NULL, 200.00, 'pending', '2022-04-06', '2022-04-06 10:50:45'),
  (4814973, 12244813, '0019', 'Credit for waterproofing (3) raised planters', 'Credit for not doing waterproofing.', NULL, -1476.00, 'sold', '2022-04-06', '2022-04-06 13:21:20'),
  (4816151, 12345938, '0003', 'Credit from design agreement', '$200 credit!!', NULL, -200.00, 'pending', '2022-04-06', '2022-04-06 19:21:20'),
  (4818143, 12244813, '0020', 'Pour in lids for drains', NULL, NULL, 340.00, 'pending', '2022-04-07', '2022-04-07 10:13:57'),
  (4818148, 12244813, '0021', 'Footings for fencing', NULL, NULL, 225.00, 'pending', '2022-04-07', '2022-04-07 10:14:33'),
  (4818606, 7666319, '0050', 'Additional work', 'Two new valves with electrical ran to irrigation timer at 1450 each 
40 yards of brown shredded mulch 6200
1600 Sq ft of jute fabric at 1.50 a Sq ft
$2400
Total 11500', NULL, 11350.00, 'pending', '2022-04-07', '2022-04-07 11:27:14'),
  (4822397, 12478911, '0002', 'Design Credit', NULL, NULL, -750.00, 'pending', '2022-04-08', '2022-04-08 10:49:09'),
  (4823710, 12317877, '0005', 'Turf and Dg', '280 sq feet of turf 
Will will use existing turf 
Need nails and infield 
Road base 

280 sq. Dg', NULL, 4200.00, 'pending', '2022-04-08', '2022-04-08 16:30:18'),
  (4827536, 12294709, '0001', 'Design Credit', NULL, NULL, -700.00, 'pending', '2022-04-11', '2022-04-11 10:37:07'),
  (4828596, 12505937, '0001', 'Additional DG/Bender board', 'Dg path is actually 440sqft 
240 linear feet of black plastic bender board', NULL, 400.00, 'pending', '2022-04-11', '2022-04-11 12:47:39'),
  (4828602, 12505937, '0002', '(1) additional zone of irrigation', 'I can give you a $200 credit towards the irrigation, so the added zone will only be 665.00, a Netafim zone is usually $865/zone.', NULL, 665.00, 'sold', '2022-04-11', '2022-04-11 12:48:14'),
  (4828618, 12505937, '0003', 'Del Rio Gravel Path w/bender board (n/w area)', NULL, NULL, 650.00, 'pending', '2022-04-11', '2022-04-11 12:50:01'),
  (4828627, 12505937, '0004', 'Clean up for hillside (south perimeter)', NULL, NULL, 750.00, 'pending', '2022-04-11', '2022-04-11 12:50:45'),
  (4829216, 12470275, '0006', '2 additional valves for grass', NULL, NULL, 1800.00, 'pending', '2022-04-11', '2022-04-11 14:13:58'),
  (4830081, 10609753, '0029', 'Demo and rebuild wall', NULL, NULL, 1583.00, 'sold', '2022-04-11', '2022-04-11 18:41:54'),
  (4830083, 10609753, '0030', 'Add channel drain', NULL, NULL, 1360.00, 'sold', '2022-04-11', '2022-04-11 18:42:33'),
  (4830085, 10609753, '0031', 'Drian line to channel drain 20 LF.', NULL, NULL, 350.00, 'sold', '2022-04-11', '2022-04-11 18:43:20'),
  (4830088, 10609753, '0032', 'Raise grades for pavers', NULL, NULL, 1920.00, 'sold', '2022-04-11', '2022-04-11 18:44:08'),
  (4830103, 10609753, '0033', 'Additional 2 steps', NULL, NULL, 550.00, 'sold', '2022-04-11', '2022-04-11 18:48:44'),
  (4830105, 10609753, '0034', 'Water proofing', NULL, NULL, 650.00, 'sold', '2022-04-11', '2022-04-11 18:49:10'),
  (4831006, 12317877, '0006', 'Additional stucco', NULL, NULL, 525.00, 'sold', '2022-04-12', '2022-04-12 07:03:04'),
  (4832096, 12598353, '0001', 'Adding one irrigation zone', 'Adding one zone', NULL, 965.00, 'pending', '2022-04-12', '2022-04-12 09:32:17'),
  (4832202, 12598353, '0002', 'Add 55 LF of black bender board', 'Adding 55 LF of black bender board to front yard', NULL, 475.00, 'pending', '2022-04-12', '2022-04-12 09:47:31'),
  (4832210, 12598353, '0003', 'One stake for tree in parkway', 'Stake for parkway tree', NULL, 30.00, 'pending', '2022-04-12', '2022-04-12 09:48:23'),
  (4832217, 12598353, '0004', 'Add 118 SF of Kurapia', 'Adding 118 SF to kurapia measurements.', NULL, 600.00, 'pending', '2022-04-12', '2022-04-12 09:49:45'),
  (4834528, 12470275, '0007', 'Bubbling vase upcharge', 'Our included amount for vase was $500 ( including tax). The vase chosen is $799. Upcharge cost is $299 plus tax.', NULL, 320.00, 'pending', '2022-04-12', '2022-04-12 15:49:57'),
  (4834947, 11877212, '0001', 'Concrete additional SF and step light', '4 additional linear feet of Step Build  $212.00
1 additinal step light $225.00', NULL, 437.00, 'pending', '2022-04-12', '2022-04-12 19:05:55'),
  (4834963, 11877212, '0002', 'Plant credit, mulch credit, and + additional turf', 'Additional turf with upgrade $1,626.00

Credits:  
Mulch 200 SF X $1.75= -$350.00
Plant reduced see attached invoices  -$841.00
TOTAL CHANGE ORDER  $435.00', NULL, 435.00, 'pending', '2022-04-12', '2022-04-12 19:11:17'),
  (4834995, 11939094, '0003', 'Plant Credit for plants not used', 'Plants not used
 Hi Mo and Christopher,This would be the final count:2 fruit trees, even at the size of 5 gallon, they are at a higher price  $100.00 each,  $200.0029 @5 gallon plants  X $43.50=  $1,261.5022 @ 1 gallon X $21.50= $473.00Total planted:  $1,934.50In Change order:  $2,290.00Credit in difference $355.50', NULL, -355.00, 'pending', '2022-04-12', '2022-04-12 19:30:22'),
  (4837107, 12456114, '0001', 'Job completion', NULL, NULL, 0, 'pending', '2022-04-13', '2022-04-13 10:28:50'),
  (4839043, 12478911, '0003', '656aq. Feet of marathon 2', NULL, NULL, 2300.00, 'pending', '2022-04-13', '2022-04-13 16:52:04'),
  (4839047, 12478911, '0004', 'CREDIT Gas Line', NULL, NULL, -500.00, 'pending', '2022-04-13', '2022-04-13 16:52:51'),
  (4840676, 12505937, '0005', 'Gopher mesh dg pathway', NULL, NULL, 1597.50, 'pending', '2022-04-14', '2022-04-14 08:45:26'),
  (4842951, 12294179, '0009', 'Install new driveway', 'demo existing driveway
install new pavement to match existing
approx 360sqft', NULL, 3500.00, 'pending', '2022-04-14', '2022-04-14 15:24:53'),
  (4843280, 11877212, '0003', 'Design Credit', NULL, NULL, -375.00, 'pending', '2022-04-14', '2022-04-14 20:43:48'),
  (4847699, 12162722, '0001', 'Additional drainage', 'Extending drainage out towards side of property', NULL, 500.00, 'sold', '2022-04-18', '2022-04-18 09:00:29'),
  (4849824, 12665841, '0001', 'Moving main water line 33 LF - 3/4" COPPER', 'Moving main water line from outside of gate to inside of gate next to A/C unit. 33 LF of 3/4" COPPER water line.
Jorge explained on site why this is needed.', NULL, 1287.00, 'sold', '2022-04-18', '2022-04-18 14:17:12'),
  (4849848, 12665841, '0002', 'Add 3 LF to bench nearest sliding doors', 'adding 3 LF to built in bench nearest sliding doors. This is to cut out and cover up large crack in existing wall.  

Total seated bench area will be 9 LF.
8" CMU block will be use for the backing of the bench. This backing will meet other retaining wall so there is not an awkward space between walls.', NULL, 960.00, 'sold', '2022-04-18', '2022-04-18 14:20:27'),
  (4849859, 12665841, '0003', 'Waterproofing behind "armrests"', '152 SF of waterproofing behind armrests so water does not sit and crack new stucco.', NULL, 1413.00, 'sold', '2022-04-18', '2022-04-18 14:22:30'),
  (4849862, 12665841, '0004', 'Credit for 24 SF of Flagstone', 'CREDIT!

24 SF of Flagstone we are NOT installing.  This was if we were to demo to the bottom of the existing wall.  We are not doing this.', NULL, -984.00, 'sold', '2022-04-18', '2022-04-18 14:23:44'),
  (4849866, 12470275, '0008', 'Pipe repair', NULL, NULL, 120.00, 'pending', '2022-04-18', '2022-04-18 14:24:24'),
  (4849875, 12665841, '0005', 'Credit for drainage', 'Credit for drainage, Jorge said we will be good with one drain pipe from wall to existing drain grate (which takes it out to the street).', NULL, -480.00, 'sold', '2022-04-18', '2022-04-18 14:25:18'),
  (4849894, 12665841, '0006', 'Stucco add on - OPTIONAL', 'Smooth stucco entire upper back wall approx. 148 SF. 
This will look better than what we have in contract (which is just stucco the backing of the new benches).  This way the back wall will have the same texture and look new.', NULL, 1665.00, 'sold', '2022-04-18', '2022-04-18 14:28:01'),
  (4849968, 12244813, '0022', 'Additional outlet with box and breaker', NULL, NULL, 378.00, 'pending', '2022-04-18', '2022-04-18 14:42:30'),
  (4850395, 12598353, '0005', 'Lighting upgrades and 2 additional lights', 'upgrade to $20 per light for Universal Opal Mica - (3) = $60
2 NEW lights added - Poppy Post Opal $220/each', NULL, 500.00, 'sold', '2022-04-18', '2022-04-18 17:18:48'),
  (4852711, 12503291, '0001', '(2) add’l irrigation zones', NULL, NULL, 1930.00, 'pending', '2022-04-19', '2022-04-19 10:28:35'),
  (4852716, 12503291, '0002', 'Steel edging 55’', NULL, NULL, 660.00, 'pending', '2022-04-19', '2022-04-19 10:29:08'),
  (4852733, 12503291, '0003', 'Brown edging for parkway 20’ x 2', NULL, NULL, 320.00, 'pending', '2022-04-19', '2022-04-19 10:30:32'),
  (4855356, 12503291, '0004', 'Additional demo/grading for sod', 'Current grade higher towards sidewalk including terraced area. Requires add’l demo, grading and hauling', NULL, 1500.00, 'pending', '2022-04-19', '2022-04-19 20:35:04'),
  (4856152, 12162722, '0002', 'Replace skimmer', NULL, NULL, 2200.00, 'sold', '2022-04-20', '2022-04-20 07:03:58'),
  (4857328, 12608924, '0001', 'Remove 2 vines and 2 CY soil', 'Remove 2 vines and remove + haul 2 CY soil behind bbq area.
This will allow soil to stay in beds and not spill over.', NULL, 375.00, 'sold', '2022-04-20', '2022-04-20 09:50:51'),
  (4858256, 12608924, '0002', 'Haul pingpong table + plastic shed', NULL, NULL, 150.00, 'sold', '2022-04-20', '2022-04-20 11:58:37'),
  (4858270, 12608924, '0003', 'Remove 12 SF concrete steps', 'Remove old Playhouse steps- NO CHARGE', NULL, 0, 'sold', '2022-04-20', '2022-04-20 11:59:51'),
  (4858708, 12608924, '0004', 'Concrete pathway (with demo)', 'On side of house

Demo 130 SF 3'' x 43'' to 6"-7" below grade
Remove brown bender board and rocks
Pour 2500 psi concrete for 130 SF
Sand finish', NULL, 3382.00, 'sold', '2022-04-20', '2022-04-20 13:04:32'),
  (4861805, 12608924, '0005', 'stump grind elm tree', '24" x 24" stump grind.', 'Edison will remove entire tree as per client.', 200.00, 'sold', '2022-04-21', '2022-04-21 09:39:37'),
  (4867263, 12503291, '0005', 'Copper parts and installation/irrigation manifold', NULL, NULL, 450.00, 'pending', '2022-04-22', '2022-04-22 13:43:01'),
  (4867499, 12665841, '0007', 'Outlet for timer (punch out)', NULL, NULL, 100.00, 'sold', '2022-04-22', '2022-04-22 14:51:46'),
  (4870170, 12470275, '0009', 'Credit 6lnft gas line', NULL, NULL, -172.66, 'pending', '2022-04-25', '2022-04-25 10:23:08'),
  (4874771, 12727257, '0001', 'Add metal fence removal 16 LF', NULL, NULL, 160.00, 'pending', '2022-04-26', '2022-04-26 10:07:12'),
  (4874808, 12727257, '0002', 'Adding soil removal', 'Removing extra 7 CY of soil and put it in the back of property near walls.', NULL, 750.00, 'pending', '2022-04-26', '2022-04-26 10:12:15'),
  (4874832, 12727257, '0003', 'Credit for 2 catch basins', 'Credit for 2 catch basins', NULL, -480.00, 'pending', '2022-04-26', '2022-04-26 10:15:45'),
  (4874858, 12727257, '0004', 'Add 2 drain grates', 'Adding 3 drain grates (in concrete area instead of catch basins) @$65/each', NULL, 130.00, 'pending', '2022-04-26', '2022-04-26 10:19:27'),
  (4874941, 12727257, '0005', 'Upgrade to 4" SDR drain piping', NULL, NULL, 370.00, 'pending', '2022-04-26', '2022-04-26 10:30:48'),
  (4876894, 12162722, '0003', 'Upgrade in drain grate', NULL, NULL, 1200.00, 'pending', '2022-04-26', '2022-04-26 15:05:06'),
  (4876909, 12162722, '0004', 'Bender board 60LF.', NULL, NULL, 500.00, 'pending', '2022-04-26', '2022-04-26 15:09:03'),
  (4879559, 12317877, '0007', 'Cash discount w/ Brian', NULL, NULL, -1695.08, 'pending', '2022-04-27', '2022-04-27 10:39:04'),
  (4880851, 12608924, '0006', 'Gopher Mesh (new measurements) - adding 1,682 SF', 'Old measurements for gopher mesh - 3,900 SF + 108 under veg beds.
This old measurement was for planting areas, veg beds, and meadow, which for the planting areas, we cannot do with the roll out mesh.
We need baskets for the plants (see separate change order for baskets).

NEW measurement is 5,690 SF
This NEW measurement includes meadow, sod, under veg beds and all D.G. areas since we found gopher holes in many DG areas.

COST is the difference@ $2/SF.', NULL, 3364.00, 'sold', '2022-04-27', '2022-04-27 13:51:10'),
  (4880949, 12608924, '0007', 'Wire Baskets for Citrus trees only', '8 - 15gallon wire baskets @ $25/each = $200

UPDATED we are only using baskets on Citrus and please wrap wire mesh on base of 36" Olive tree.', 'No baskets for transplants, for 36" box tree use wire mesh to wrap around base of tree!!!', 200.00, 'sold', '2022-04-27', '2022-04-27 14:09:01'),
  (4881092, 12608924, '0008', 'Credit for (1) 15g citrus tree', 'Karelaine is updating the planting plan.  We are removing (1) 15g citrus from the contract.', NULL, -315.00, 'sold', '2022-04-27', '2022-04-27 14:33:43'),
  (4881458, 12608924, '0009', 'Drainage - 6', '6 drain grates (tan/brown) with 3" PVC perforated holes with gravel 16" deep in Decomposed Granite area.

Time and material.', NULL, 210.00, 'sold', '2022-04-27', '2022-04-27 16:18:10'),
  (4881748, 12608924, '0010', 'CREDIT - Bender Board', 'We have 635 LF in our contract and we used 600 LF.

Credit is for 35 LF.', NULL, -446.00, 'sold', '2022-04-27', '2022-04-27 19:01:02'),
  (4881756, 12608924, '0011', 'SOD - adding 200 SF Marathon II (not doing seed)', '200 SF of Marathon II - $750

We initially had seed in the contract + amendments for this area (complementary seed + $500 in amendments).

Cost difference is $250', 'Total amount of Marathon II is 910 SF.', 250.00, 'sold', '2022-04-27', '2022-04-27 19:06:04'),
  (4881764, 12608924, '0012', 'Plants (ADDING)', 'ORIGINAL contract:

72 (1gallons)
180 (5gallons)
 

NEW plant count:
81 (1 gallons)
194 (5 gallons)

The change order is the cost difference.
9 (1 gallons) @ $22/each = $198
14 (5 gallons) @$45/each = $630

(1) citrus was removed and credit is separate change order.', 'see notes and new planting plan in CURRENT DESIGN', 828.00, 'sold', '2022-04-27', '2022-04-27 19:10:26'),
  (4881765, 12608924, '0013', 'Credit for (2) front yard path lights', 'we had 10 path lights in front and we are only installing 8.

Lights are $280 each.', NULL, -560.00, 'sold', '2022-04-27', '2022-04-27 19:10:48'),
  (4882684, 12503291, '0006', 'Additional lighting', 'Adding (4) additional lights from original count of 10', NULL, 945.00, 'pending', '2022-04-28', '2022-04-28 07:03:10'),
  (4885252, 12665841, '0008', 'Add step down from patio 6 LF', 'Add 6 LF step down near A/C unit.
Hand mix concrete.
Light broom finish.', NULL, 650.00, 'sold', '2022-04-28', '2022-04-28 13:40:14'),
  (4885895, 12294709, '0002', 'Transformer and light installation', NULL, NULL, 580.00, 'sold', '2022-04-28', '2022-04-28 16:13:11'),
  (4885981, 12131143, '0007', 'Pressure regulator', NULL, NULL, 350.00, 'sold', '2022-04-28', '2022-04-28 16:48:06'),
  (4888484, 12727257, '0006', 'Cmu planter with water proofing & stucco', 'No soil is included for backfilling', NULL, 825.25, 'pending', '2022-04-29', '2022-04-29 11:21:09'),
  (4894180, 12665841, '0009', 'Adding 268 SF of stucco on lower retaining wall', 'Client requested change order:

268 SF of stucco on lower retaining wall from gate to new timber retaining wall.
Prep for stucco, removing paint, etc.
Color to be chosen from swatch with client.', NULL, 1920.00, 'sold', '2022-05-02', '2022-05-02 14:37:53'),
  (4895062, 12611577, '0001', 'Raising pvc 1" 81 lf. X $19.00= $1,539.00', NULL, NULL, 1539.00, 'pending', '2022-05-02', '2022-05-02 21:01:02'),
  (4895064, 12611577, '0002', 'Cutting pavers to install lower than threshold.', NULL, NULL, 176.00, 'pending', '2022-05-02', '2022-05-02 21:02:19'),
  (4899315, 9118708, '0006', 'Additional paver work', 'Remove one stone and pave around the rest 
Cancel irrigation around stone', NULL, 1920.00, 'pending', '2022-05-03', '2022-05-03 17:17:22'),
  (4899640, 12598353, '0006', 'credit for potting soil', 'We did not use 100 SF of potting soil in pots near trellis.
credit for planting vines', NULL, -180.00, 'pending', '2022-05-03', '2022-05-03 20:55:22'),
  (4900589, 12537035, '0001', 'Hardscape finish counts+additional pavers', '> Hi,
> It is getting cleaned out!
> Here are the actual finished counts:
> Wall got longer by 2.5 feet. $395.00
> Reworked extra excavation ramp area $300.00.
> Credit of 10 linear feet of step build --$600.00
> Price difference $95.00
>
> New apron. We will  need to break out an additional foot or 2 in so that we can feather a nice slope in. $561.14 it will look much better than just adding to the end.', NULL, 656.14, 'pending', '2022-05-04', '2022-05-04 07:30:26'),
  (4901635, 12655622, 'Additional work', 'Additional concrete and 9 linear feet of brick', '9 linear feet of brick bullnose and 120 Sq ft of Concrete 6 inches', NULL, 3450.00, 'pending', '2022-05-04', '2022-05-04 09:52:08'),
  (4903044, 12503291, '0007', '85sqft of sod to be installed in backyard', 'Leftover sod from front yard to be installed in backyard', NULL, 250.00, 'pending', '2022-05-04', '2022-05-04 13:17:39'),
  (4904245, 12608924, '0014', '120 SF Premium walk-on mulch front side yard', '120 SF in the front side yard - after the concrete pour and up to the other mulch area (where little bench is).

Mulch is Premium Walk-on to match.', 'NO WEED BARRIER', 150.00, 'sold', '2022-05-04', '2022-05-04 19:48:33'),
  (4904256, 12608924, '0015', 'Brown shredded mulch in all new planting areas', '3,430 SF of brown shredded mulch @ 2" deep.I calculated 21 Cubic Yards for this cost.', 'this wasn''t on contract, we added and i don''t think anyone caught this!

We are doing 2" deep. 

NO weed barrier', 2287.00, 'sold', '2022-05-04', '2022-05-04 19:55:58'),
  (4907961, 12665841, '0010', '200 SF mulch only in bed nearest bougainvillea', '200 SF of brown shredded mulch at 2-3" depth.
Include jute nearest Candelabra Cacti to protect erosion.', NULL, 250.00, 'sold', '2022-05-05', '2022-05-05 14:13:08'),
  (4907983, 12665841, '0011', 'Credit 3 Mexican fence posts material.', 'Didn''t use 3 Mexican fence posts', NULL, -330.00, 'sold', '2022-05-05', '2022-05-05 14:15:48'),
  (4908524, 12345938, '0004', 'Additional plants 4-1gal with irrigation', NULL, NULL, 160.00, 'sold', '2022-05-05', '2022-05-05 16:22:58'),
  (4912256, 12655622, '0001', 'Credit', '5lf reduction in BBQ size.', NULL, -2400.00, 'pending', '2022-05-06', '2022-05-06 17:08:38'),
  (4912457, 12608924, '0016', '³/4" Conduit for cat7 and extra 1" conduit', '1- run ³/4"  conduit for cat7 wire.      $1,200.
2- run 1" conduit (extra) for future.  $1,200.

No wire.


Total $2,400.', NULL, 2400.00, 'pending', '2022-05-07', '2022-05-07 09:49:55'),
  (4914858, 12737333, '0001', 'Additional Sod', '+ 500sqft', NULL, 2250.00, 'sold', '2022-05-09', '2022-05-09 10:04:24'),
  (4914871, 12737333, '0002', 'Additional DG( wider path)', '+ 350sqft', NULL, 1210.00, 'sold', '2022-05-09', '2022-05-09 10:05:47'),
  (4914877, 12737333, '0003', 'Cacti Removal', 'Demo and Disposal', NULL, 1150.00, 'sold', '2022-05-09', '2022-05-09 10:06:30'),
  (4915405, 12174250, '0001', '10 1 gallon plants', NULL, NULL, 215.00, 'pending', '2022-05-09', '2022-05-09 11:10:05'),
  (4915417, 12174250, '0002', '30 more sf of pavers. X $18.45', NULL, NULL, 553.50, 'pending', '2022-05-09', '2022-05-09 11:11:25'),
  (4915830, 12162722, '0005', 'Electrical repair', NULL, NULL, 375.00, 'sold', '2022-05-09', '2022-05-09 12:10:56'),
  (4916542, 12462744, '0001', '2 design hours', 'Need 2 hours to update design, decrease plants by 25%.', 'very hard to get him to sign off on design, keeps changing mind about things. Very sweet couple, but cannot make a decision.', 180.00, 'sold', '2022-05-09', '2022-05-09 13:49:28'),
  (4916686, 12629415, '0001', 'Add''l Concrete', '103sqft', NULL, 900.00, 'pending', '2022-05-09', '2022-05-09 14:11:33'),
  (4916691, 12629415, '0002', 'French Drain', '68 linear feet', NULL, 2800.00, 'pending', '2022-05-09', '2022-05-09 14:12:07'),
  (4916901, 12629415, '0003', 'Bonding wire and clamps', NULL, NULL, 950.00, 'pending', '2022-05-09', '2022-05-09 15:01:37'),
  (4919458, 12555206, '0001', 'Pavers for behind grill', NULL, NULL, 0, 'pending', '2022-05-10', '2022-05-10 09:47:20'),
  (4919485, 12555206, '0002', '28 feet of electric run plus one outlet', NULL, NULL, 660.00, 'pending', '2022-05-10', '2022-05-10 09:51:04'),
  (4919534, 12736288, '0001', '28 linear feet plus outlet', NULL, NULL, 660.00, 'sold', '2022-05-10', '2022-05-10 09:59:17'),
  (4919547, 12736288, '0002', '54 linear feet of pavers', 'Replacing concrete behind grill', NULL, 1000.00, 'sold', '2022-05-10', '2022-05-10 10:01:14'),
  (4921612, 12715459, '0001', 'Add’l irrigation', 'Running lateral lines to each zone, adding UV line around perimeter to back of wall', NULL, 1600.00, 'sold', '2022-05-10', '2022-05-10 14:49:48'),
  (4921627, 12715459, '0002', 'Planting 36” boxed tree/Moon Valley', NULL, NULL, 350.00, 'sold', '2022-05-10', '2022-05-10 14:51:38'),
  (4921629, 12715459, '0003', '(1) add’l 15g Cypress', NULL, NULL, 150.00, 'sold', '2022-05-10', '2022-05-10 14:52:08'),
  (4921632, 12715459, '0004', 'Add’l grading along sidewalk', NULL, NULL, 300.00, 'sold', '2022-05-10', '2022-05-10 14:52:58'),
  (4921838, 12537035, '0003', 'Plant final count', NULL, NULL, 438.00, 'pending', '2022-05-10', '2022-05-10 15:41:18'),
  (4922034, 12506017, '0001', 'Fabric and dg', '3x12 dg and fabric.', NULL, 215.00, 'pending', '2022-05-10', '2022-05-10 16:41:19'),
  (4922084, 12611577, '0003', 'Wall credit, adding rock, adding porch LF', 'v
Total wall credit $152.00
Additional Step build $500.00
Rock instead of mulch $607.50
Total:  $955.50 additional', NULL, 955.50, 'pending', '2022-05-10', '2022-05-10 17:04:19'),
  (4922088, 12611577, '0004', 'Curb by road credit', 'Taking out poured in place curb by road', NULL, -1900.00, 'pending', '2022-05-10', '2022-05-10 17:07:02'),
  (4925611, 12736288, '0003', 'Credit for flatwork', NULL, NULL, -500.00, 'sold', '2022-05-11', '2022-05-11 13:00:32'),
  (4933237, 12727257, '0007', 'Additional stucco 30sq. feet', NULL, NULL, 210.00, 'sold', '2022-05-13', '2022-05-13 08:01:30'),
  (4935687, 12608924, '0017', 'Grass measurements', 'We need 240 SF more of grass. I have given a discounted cost @ $3.25 SF.

Total grass installed 2,440 SF
Total in contract plus change order 2,200 SF', NULL, 780.00, 'sold', '2022-05-13', '2022-05-13 20:10:15'),
  (4937225, 12715459, '0005', 'Additional 2up lights  same as ordered', NULL, NULL, 590.00, 'sold', '2022-05-16', '2022-05-16 07:14:20'),
  (4937258, 12715459, '0006', '7- 5gal. Lereope veregated (see pictures)', NULL, NULL, 304.50, 'sold', '2022-05-16', '2022-05-16 07:20:36'),
  (4939382, 12537035, '0004', 'Boulders. Material only', NULL, NULL, 447.50, 'pending', '2022-05-16', '2022-05-16 12:33:18'),
  (4939436, 12658133, '0001', 'Additional drainage 8lf', '8lf x $25= $200.00', NULL, 200.00, 'pending', '2022-05-16', '2022-05-16 12:40:34'),
  (4939463, 12658133, '0002', 'Pavers. 47 more sf', '47 sf x $14.35= $674.45', NULL, 674.45, 'pending', '2022-05-16', '2022-05-16 12:46:01'),
  (4939515, 12658133, '0003', 'Wall Build.', 'Wall. + 3 lf. + 12" higher', NULL, 1059.00, 'pending', '2022-05-16', '2022-05-16 12:53:53'),
  (4939545, 12658133, '0004', 'Rtf. 22 more sf', NULL, NULL, 82.50, 'pending', '2022-05-16', '2022-05-16 12:57:01'),
  (4939562, 12658133, '0005', 'Plant credit for front', 'Difference in front yard order', NULL, -258.00, 'pending', '2022-05-16', '2022-05-16 12:58:40'),
  (4939577, 12658133, '0006', 'Rock credit 192 sf', 'Reduced rock amount 192x $5.00= $960.00', NULL, -960.00, 'pending', '2022-05-16', '2022-05-16 13:00:46'),
  (4939588, 12658133, '0007', 'Mulch. 154 sf front', '154 sf x $1.85= $284.90', NULL, 284.90, 'pending', '2022-05-16', '2022-05-16 13:02:27'),
  (4941740, 12736288, '0004', 'Drainage 16 lf.', NULL, NULL, 208.00, 'sold', '2022-05-17', '2022-05-17 06:59:27'),
  (4941746, 12736288, '0005', 'Umbrella sleeve', NULL, NULL, 100.00, 'sold', '2022-05-17', '2022-05-17 07:00:06'),
  (4942842, 12781862, '0001', 'Add’l 465 sqft of turf', 'Add''l Bender board will be calculated on site during job walk
$8/linear foot', NULL, 5300.00, 'sold', '2022-05-17', '2022-05-17 09:54:37'),
  (4944479, 12736288, '0006', 'Built in Sink 3''x3''x2''', NULL, NULL, 1040.00, 'pending', '2022-05-17', '2022-05-17 13:54:27'),
  (4945572, 12611577, '0005', 'Additional Riser', 'Additional riser and border around porch, curb around trash cans', NULL, 280.00, 'pending', '2022-05-17', '2022-05-17 20:17:03'),
  (4945573, 12611577, '0006', 'Channel Drain', 'Channel drain in front of garage', NULL, 810.00, 'pending', '2022-05-17', '2022-05-17 20:18:02'),
  (4953462, 8563042, '0002', 'Maintenance. $687.00. Please see log', NULL, NULL, 687.00, 'pending', '2022-05-19', '2022-05-19 13:22:21'),
  (4953887, 12608924, '0018', 'Tree climbing (8 trees)', 'Climbing 8 trees 60 ft. and installing up lights with tree straps.', NULL, 1200.00, 'sold', '2022-05-19', '2022-05-19 14:40:54'),
  (4953895, 11582899, '0004', '24" Palo Verde tree', '(1) 24" Palo Verde tree', NULL, 385.00, 'sold', '2022-05-19', '2022-05-19 14:41:52'),
  (4954096, 11582899, '0005', '(1) Pilaster', '(1) 1''4" x 1''4" x 3''3" pilaster with Eco Outdoor veneer in Bodega', NULL, 1670.00, 'sold', '2022-05-19', '2022-05-19 15:41:45'),
  (4954534, 12651492, '0001', 'Credit for Catalina grana instead of lafitte', 'Lafitte was in contract, using Catalina grana instead.', NULL, -1424.00, 'pending', '2022-05-19', '2022-05-19 20:35:32'),
  (4954535, 12651492, '0002', 'Design credit', NULL, NULL, -375.00, 'pending', '2022-05-19', '2022-05-19 20:36:34'),
  (4955378, 12537035, '0005', '2 more hade not on the previous receipts. 5 gal', NULL, NULL, 87.00, 'pending', '2022-05-20', '2022-05-20 07:39:13'),
  (4955384, 12537035, '0006', 'Design credit applied', NULL, NULL, -750.00, 'pending', '2022-05-20', '2022-05-20 07:40:29'),
  (4955393, 12658133, '0008', 'Design credit', NULL, NULL, -375.00, 'pending', '2022-05-20', '2022-05-20 07:42:03'),
  (4957833, 11582899, '0006', '(1) Alumawood batten 18''6" Aspen w/ clips', '(1)  BATTEN 2" x 6" x 18''6" - ASPEN
(1) BATTEN BASE/BRACKET 2" x 2" x 18''6" - ASPEN
(4) BATTEN END MOUNT CLIP -  MILL FINISH

All cuts and installation included in costs.', NULL, 2600.00, 'sold', '2022-05-20', '2022-05-20 17:26:14'),
  (4957834, 12608924, '0019', '366 LF of Bistro lights', '366 LF of BK-E26-BK-V Bistro Lights with LED bulbs
366 LF of Suspension galvanized cable for bistro string
8 Galvanized cable clamps
183 - 8” black cable ties (120 Lb. Test)
All labor included in cost (ladder, zip ties every 2ft, etc).', 'Cost is @ $14.40/linear foot (for credit)', 5260.00, 'pending', '2022-05-20', '2022-05-20 17:30:07'),
  (4958127, 12629415, '0004', '(5) Additional up lights', NULL, NULL, 1100.00, 'pending', '2022-05-21', '2022-05-21 13:01:02'),
  (4958128, 12629415, '0005', 'Additional plants', 'Succulents, Blue Hibiscus, grasses
25 total', NULL, 750.00, 'pending', '2022-05-21', '2022-05-21 13:04:15'),
  (4960275, 12608924, '0020', 'Trim pack for cedar beds', 'Trim back for (6) cedar beds.
Incudes installation.', 'Carter - please call Christine (or Camille) at 1-800-807-3404 to place order.', 850.00, 'pending', '2022-05-23', '2022-05-23 09:34:27'),
  (4962693, 12629415, '0006', 'Adding 2 more lights', NULL, NULL, 300.00, 'pending', '2022-05-23', '2022-05-23 17:45:20'),
  (4962707, 12629415, '0007', 'Install Deco-seal', NULL, NULL, 195.00, 'pending', '2022-05-23', '2022-05-23 17:56:19'),
  (4965550, 12859486, '0001', 'Additional turf for back yard', '396 Sq ft of rtf turf for backyard.', NULL, 1485.00, 'pending', '2022-05-24', '2022-05-24 11:51:48'),
  (4965770, 12762663, '0001', 'Paver block choices', '897 sf
Priced at $14.50 a SF

Belgard Dublin Cobble 4 piece set  +  Polymeric Sand 
Dublin Cobble + $3.45 + Polymeric Sand $1

Priced at $18.95 X 897= $16,998.15  $13,006.70=

Change Order $3,991.45

Fire Pit in Belgard j with Belgard Belaire cap  + $299.00

block wall seat in Belgard Weston Wall block with Belgard   Belaire cap + $375.00

$4,665.45', NULL, 4665.45, 'pending', '2022-05-24', '2022-05-24 12:23:29'),
  (4965980, 12651492, '0003', 'One more light', NULL, NULL, 225.00, 'pending', '2022-05-24', '2022-05-24 12:47:49'),
  (4969296, 12651492, '0004', 'Steel edging instead of bender board.', NULL, NULL, 270.00, 'sold', '2022-05-25', '2022-05-25 10:01:16'),
  (4975470, 12859486, '0002', 'Additional work', 'Upgrade to inline valves     400
Sand setting existing paver steppers in sod 160

Total 560', NULL, 560.00, 'pending', '2022-05-26', '2022-05-26 13:53:20'),
  (4985320, 12658133, '0009', 'Additional Main Line', '70 linear feet of main line running to backyard.', NULL, 450.00, 'sold', '2022-05-31', '2022-05-31 17:40:18'),
  (4986328, 12728917, '0001', 'Additional 65 linear feet', 'Additional drainage to downspouts behind house 65 linear feet x $25.00= $1,625.00', NULL, 1625.00, 'pending', '2022-06-01', '2022-06-01 06:55:15'),
  (4989689, 12611577, '0007', 'Additional drainage. 27 linear feet x $25', NULL, NULL, 675.00, 'sold', '2022-06-01', '2022-06-01 15:05:13'),
  (4990073, 12611577, '0008', 'Additional sod', NULL, NULL, 2500.00, 'sold', '2022-06-01', '2022-06-01 16:55:47'),
  (4991500, 12611577, '0009', 'Plant Credit Final count', 'Please see email sent to Joe and Jorge and Jorge''s daily log', NULL, -3514.50, 'sold', '2022-06-02', '2022-06-02 08:21:57'),
  (4993088, 12651492, '0005', 'Plant Credit', NULL, NULL, -445.00, 'pending', '2022-06-02', '2022-06-02 12:23:57'),
  (4994470, 12736288, '0007', 'Sealant and light sanding for countertop', NULL, NULL, 300.00, 'sold', '2022-06-02', '2022-06-02 20:08:05'),
  (4998772, 12781862, '0002', '(9) 5 gallon Lavandula ''Sweet Romance''', NULL, NULL, 450.00, 'sold', '2022-06-03', '2022-06-03 16:03:08'),
  (4998773, 12781862, '0003', '(2) additional subterranean irrigation zones', NULL, NULL, 3860.00, 'sold', '2022-06-03', '2022-06-03 16:04:10'),
  (4998777, 12781862, '0004', 'Add''l Plants/Small Tree Demo', NULL, NULL, 700.00, 'sold', '2022-06-03', '2022-06-03 16:05:26'),
  (4998783, 12781862, '0005', 'Electrical connection for Fountain', '45 linear feet of trenched electric', NULL, 900.00, 'sold', '2022-06-03', '2022-06-03 16:08:15'),
  (5000466, 12947486, '0001', 'Electrical', 'Dig trenches
Remove old pipe
Install new pvc
Rewire
Backfill and compact.', NULL, 450.00, 'pending', '2022-06-06', '2022-06-06 07:26:56'),
  (5001117, 12781862, '0006', 'Adjustment', NULL, NULL, -5400.00, 'pending', '2022-06-06', '2022-06-06 09:11:12'),
  (5002765, 12762663, '0002', '38 Lf. 1" gas line', NULL, NULL, 1330.00, 'pending', '2022-06-06', '2022-06-06 13:15:45'),
  (5003204, 11925579, '0008', 'Design Work (5 hours)', 'From dana:
I did (5) hours worth of design work for this portion, that should be billed to him at $150/hour.', NULL, 750.00, 'pending', '2022-06-06', '2022-06-06 14:15:02'),
  (5003599, 12728869, '0001', 'Moving Valves to back yard', 'Additional main line 38 feet
Trenching
Going under wall', NULL, 1320.00, 'pending', '2022-06-06', '2022-06-06 15:39:27'),
  (5003619, 12629415, '0008', '(6) 3''x2'' steppers', NULL, NULL, 1450.00, 'pending', '2022-06-06', '2022-06-06 15:45:51'),
  (5007506, 12762663, '0003', 'Additional 4 lights', 'For a total of 3 uplights, 6 steplights, 4 path.', NULL, 900.00, 'pending', '2022-06-07', '2022-06-07 13:08:56'),
  (5007527, 12762663, '0004', '8 lf of step build', '2 steps at 4 lf wide.', NULL, 480.00, 'pending', '2022-06-07', '2022-06-07 13:10:43'),
  (5007544, 12762663, '0005', 'Additional wall build 17 lf', '17 lf X $135.00= $2,295.00', NULL, 2295.00, 'pending', '2022-06-07', '2022-06-07 13:12:56'),
  (5008899, 12942466, '0001', 'Design Agreement discount towards install', 'Design agreement states $500 discount towards installation.', NULL, -500.00, 'pending', '2022-06-07', '2022-06-07 22:04:51'),
  (5010659, 12852157, '0001', 'Credit for sand finish driveway', 'Not doing sand finish, we will do broom finish.', NULL, -225.00, 'pending', '2022-06-08', '2022-06-08 10:05:12'),
  (5010671, 12852157, '0002', 'Adding 11LF of 3" SDR with 2 atriums', NULL, NULL, 353.00, 'pending', '2022-06-08', '2022-06-08 10:07:21'),
  (5010678, 12852157, '0003', 'Digging holes in backyard for plumeria and palm', NULL, NULL, 225.00, 'pending', '2022-06-08', '2022-06-08 10:08:34'),
  (5010711, 12852157, '0004', 'Repair neighboring retaining wall', 'Repair with (6) 8" CMU blocks with brick cap', NULL, 250.00, 'pending', '2022-06-08', '2022-06-08 10:13:08'),
  (5010724, 12852157, '0005', 'Adding one course to lower retaining wall', 'Add 10.7 LF of 6" CMU block', NULL, 200.00, 'pending', '2022-06-08', '2022-06-08 10:15:05'),
  (5013099, 12942466, '0002', 'Downsized Olive trees.', 'We cannot get the 24” box olive trees.  We can get the 15gallons so this is a credit for the difference.', NULL, -470.00, 'pending', '2022-06-08', '2022-06-08 17:19:59'),
  (5013120, 12608924, '0021', 'Credit for citrus', 'Credit for not getting 5 citrus trees at $315/each
Charge for (3) 15gallons and (1) 24” box olive.
Cost difference is this credit.', NULL, -740.00, 'sold', '2022-06-08', '2022-06-08 17:31:56'),
  (5014688, 12317877, '0008', 'Lighting total of 15 lights', '10- PS 501B 2.5 W.
3-   FL 117B  5.   W.
2-   FL 105B. 5.   W.
1- 300w transformer 
ALL IN BRONZE.', NULL, 3809.00, 'sold', '2022-06-09', '2022-06-09 08:35:08'),
  (5014692, 12942466, '0003', 'Credit for smart timer', 'Replaced smart timer with manual timer', NULL, -200.00, 'pending', '2022-06-09', '2022-06-09 08:35:55'),
  (5017749, 12852157, '0006', 'Remove 15g rose in front bed and add 1 (5g) rose', 'Remove one (15g) roses from front planter bed and haul.
Add 1 (5g) rose to planting plan.', NULL, 100.00, 'sold', '2022-06-09', '2022-06-09 22:09:02'),
  (5020873, 12728869, '0002', 'Gravel. Brown bark 3/4 "', '60 sf x $5.5, area in driveway planter.', NULL, 200.00, 'pending', '2022-06-10', '2022-06-10 16:27:00'),
  (5020876, 12728869, '0003', 'Additional plants.', '28 5 gallon plants x $43.50
1 24" box $385.00', NULL, 1618.00, 'pending', '2022-06-10', '2022-06-10 16:29:32'),
  (5020885, 12728869, '0004', 'Additional emitters per carter', NULL, NULL, 250.00, 'pending', '2022-06-10', '2022-06-10 16:35:28'),
  (5023305, 12942466, '0004', 'Subsurface irrigation in parkway', 'Add subsurface irrigation to parkway.', NULL, 885.00, 'pending', '2022-06-13', '2022-06-13 09:43:58'),
  (5024854, 12942466, '0005', 'Transformer', NULL, NULL, 400.00, 'pending', '2022-06-13', '2022-06-13 13:28:30'),
  (5024973, 12943226, '0001', '112 feet of landscape timber for easement', NULL, NULL, 3530.00, 'pending', '2022-06-13', '2022-06-13 13:45:38'),
  (5031369, 12781862, '0007', '2 zones irrigation front yard', 'Change to drip', NULL, 1930.00, 'sold', '2022-06-15', '2022-06-15 07:17:00'),
  (5032484, 12728944, '0001', 'Paver credit 38 sf x $14', NULL, NULL, -532.00, 'pending', '2022-06-15', '2022-06-15 10:09:16'),
  (5032500, 12728944, '0002', 'Additional 20 lf X $64.00', NULL, NULL, 1280.00, 'pending', '2022-06-15', '2022-06-15 10:11:49'),
  (5032508, 12728944, '0003', 'Polymeric sand', NULL, NULL, 1635.00, 'pending', '2022-06-15', '2022-06-15 10:13:13'),
  (5033430, 12762663, '0006', '4 more lf of seat wall x $135.00= $540.00', NULL, NULL, 540.00, 'pending', '2022-06-15', '2022-06-15 12:22:10'),
  (5034179, 12781862, '0008', 'Additional plants', '(6) Day lily in yellow 1G
(2) Gaura hot pink -5G
(9) Lavender Provence 5G', NULL, 630.00, 'sold', '2022-06-15', '2022-06-15 14:13:42'),
  (5036165, 12781862, '0009', '(2) 15 gallon Pittosporum', NULL, NULL, 300.00, 'pending', '2022-06-16', '2022-06-16 07:57:57'),
  (5037450, 12852157, '0007', 'Additional valve', 'Valve replace only.', NULL, 200.00, 'sold', '2022-06-16', '2022-06-16 11:22:00'),
  (5040851, 12942466, '0006', '(3) 5g Bird of Paradise', '3 - 5g bird of paradise', NULL, 130.00, 'sold', '2022-06-17', '2022-06-17 09:32:09'),
  (5042780, 11582899, '0007', 'Added Labor time pilasters', '10 man days $6000
Discount Given client $600

Total labor $5400', NULL, 5400.00, 'pending', '2022-06-18', '2022-06-18 06:40:44'),
  (5044140, 12728944, '0004', 'Repair pool light conduit', NULL, NULL, 120.00, 'sold', '2022-06-20', '2022-06-20 07:26:54'),
  (5044149, 12728944, '0005', 'Run new electrical 96 LF. With wire', NULL, NULL, 2880.00, 'sold', '2022-06-20', '2022-06-20 07:28:39'),
  (5044158, 12728944, '0006', 'Repair main line', NULL, NULL, 240.00, 'sold', '2022-06-20', '2022-06-20 07:29:33'),
  (5044162, 12728944, '0007', 'Drain 235 LF.', NULL, NULL, 5405.00, 'sold', '2022-06-20', '2022-06-20 07:30:58'),
  (5044175, 12728944, '0008', 'Run pool line deeper', NULL, NULL, 1272.00, 'sold', '2022-06-20', '2022-06-20 07:33:35'),
  (5045521, 13065764, '0001', '100 LF. Additional steel edging', NULL, NULL, 1275.00, 'sold', '2022-06-20', '2022-06-20 11:03:21'),
  (5045537, 13065764, '0002', 'Conver 1 zone to drip front yard', NULL, NULL, 775.00, 'sold', '2022-06-20', '2022-06-20 11:05:17'),
  (5045577, 13065764, '0003', 'Additional plants for planter by garage', '3- gal. Electric pink cordyline  $130.50
6- gal Peter pan Agapanthus  $129', NULL, 250.50, 'sold', '2022-06-20', '2022-06-20 11:11:09'),
  (5045673, 12728944, '0009', 'Credit 50 Lf 3" drain line', NULL, NULL, -1150.00, 'pending', '2022-06-20', '2022-06-20 11:28:20'),
  (5045733, 12728944, '0010', 'Credit for step build', NULL, NULL, -360.00, 'pending', '2022-06-20', '2022-06-20 11:35:01'),
  (5045774, 12608924, '0022', 'Credit for STUCCO on pool equip wall', NULL, NULL, -900.00, 'sold', '2022-06-20', '2022-06-20 11:40:42'),
  (5045783, 12608924, '0023', '(5) 5g Star Jasmine staked', NULL, NULL, 218.00, 'sold', '2022-06-20', '2022-06-20 11:41:51'),
  (5045795, 12608924, '0024', '(4) Flats - Mondo Grass (around front yard Deodar)', NULL, NULL, 268.00, 'sold', '2022-06-20', '2022-06-20 11:43:05'),
  (5045861, 13065764, '0004', 'Additional gravel 77sq. Feet', NULL, NULL, 693.00, 'sold', '2022-06-20', '2022-06-20 11:52:53'),
  (5046654, 12728869, '0005', 'Lighting credit', 'Lighting credit', NULL, -675.00, 'pending', '2022-06-20', '2022-06-20 13:44:42'),
  (5047327, 9118708, '0007', 'Additional labor', NULL, NULL, 360.00, 'sold', '2022-06-20', '2022-06-20 16:05:32'),
  (5047486, 12606892, '0001', 'Fire pit 4x4', 'Fire pit to be 4x4 -18" high in grey charcoal rustic wall with cap', 'Change order approved via text', 3675.00, 'pending', '2022-06-20', '2022-06-20 17:12:56'),
  (5047488, 12606892, '0002', 'Gas line', '150 LF. AT 18" DEEP', 'Change order approved via text', 4955.00, 'pending', '2022-06-20', '2022-06-20 17:14:08'),
  (5047498, 12606892, '0003', 'Paver edger 218 LF.', '191 LF. Edger to be 4x12 orco paver
On all planters in front yard and 3 in the back yard', 'Change order approved via text', 4698.00, 'pending', '2022-06-20', '2022-06-20 17:18:45'),
  (5047504, 12606892, '0004', 'Rustic wall 168 LF.', '168 LF 4 courses includes cap
12"x12" footings', 'Change order approved via text', 20496.00, 'pending', '2022-06-20', '2022-06-20 17:23:30'),
  (5047509, 12606892, '0005', '2110 Square feet of pavers', 'Pavers to be angulus grey charcoal 4 piece large @ 13.75 per square feet.', 'Change orders approved via text', 29012.50, 'pending', '2022-06-20', '2022-06-20 17:27:31'),
  (5047518, 12606892, '0006', '400 square feet for drive way', '400 square feet orco paver 4x12 in manor
In a herringbone pattern 
@$16.25 with a dark charcoal boarder', 'Change order approved via text', 6500.00, 'pending', '2022-06-20', '2022-06-20 17:33:02'),
  (5047536, 12606892, '0007', 'Extending front wall to sidewalk 16 LF.', '16 LF to match existing wall with wall cap
8x8x16 tan wall with cap
2- 3 courses', 'Change order approved via text', 1954.00, 'pending', '2022-06-20', '2022-06-20 17:38:58'),
  (5047541, 12606892, '0008', '57 LF. Bull nose steps', 'Bull nose to be dark grey charcoal', NULL, 3705.00, 'pending', '2022-06-20', '2022-06-20 17:41:17'),
  (5049642, 6845509, '0004', 'Sprinkler Repair', NULL, NULL, 150.00, 'pending', '2022-06-21', '2022-06-21 09:52:14'),
  (5052115, 13162971, '0001', 'Credit - client removed pavers on side of home', NULL, NULL, -850.00, 'sold', '2022-06-21', '2022-06-21 15:58:08'),
  (5052116, 13162971, '0002', 'Credit - client removed lemon tree', NULL, NULL, -125.00, 'sold', '2022-06-21', '2022-06-21 15:58:40'),
  (5052119, 13162971, '0003', 'Credit - NOT DOING LIGHTS', NULL, NULL, -3674.00, 'sold', '2022-06-21', '2022-06-21 15:59:27'),
  (5052321, 12608924, '0025', '(1) 24" box tree Manila Mango', NULL, NULL, 825.00, 'pending', '2022-06-21', '2022-06-21 17:20:21'),
  (5056474, 12608924, '0026', 'Credit for bistro lights', 'New measurement is 240 SF.
Credit at $14.40/lf includes wire, clips, zip ties, and labor.', NULL, -1815.00, 'sold', '2022-06-22', '2022-06-22 15:47:48'),
  (5056493, 12546043, '0001', '7.5h added design work', NULL, NULL, 750.00, 'pending', '2022-06-22', '2022-06-22 15:56:36'),
  (5058096, 12608924, '0027', 'Install swing', NULL, NULL, 350.00, 'sold', '2022-06-23', '2022-06-23 08:24:17'),
  (5058835, 13124167, '0001', 'Remove 2 tree w/ stump grind', NULL, NULL, 3400.00, 'sold', '2022-06-23', '2022-06-23 10:28:48'),
  (5059185, 12606892, '0009', 'Additional wall back yard by fence', NULL, NULL, 600.00, 'pending', '2022-06-23', '2022-06-23 11:21:31'),
  (5061892, 10391726, '0013', 'Red wood timber (6x6)', NULL, NULL, 3320.00, 'sold', '2022-06-24', '2022-06-24 07:22:17'),
  (5062162, 13124167, '0002', 'Added Concrete/soils removal', 'Remove 7" of /grade soils (72sq. Feet) Area Behind trees
Total concrete removal was 1,491 sq feet including pad by pool and extra concrete to shed side of driveway', NULL, 1250.00, 'sold', '2022-06-24', '2022-06-24 08:08:41'),
  (5062174, 13124167, '0003', 'Additional turf 902 sq feet', 'Install 902 square feet of additional turf.  Includes two additional walkways that were changed from stone.
Plus upgrade turf to Synlawn 347', NULL, 14978.00, 'sold', '2022-06-24', '2022-06-24 08:10:36'),
  (5062191, 13123534, '0001', 'Additional items', '40 lf timber wall 4500Additional steps 900Two additional lights 480New concrete walkway 150 Sq ft 1750Total 7630', NULL, 7630.00, 'pending', '2022-06-24', '2022-06-24 08:14:23'),
  (5062193, 13124167, '0005', 'Added Delta No Mow Grass 220 sq feet', 'Add more Delta No Mow Grass - Native Variety', NULL, 1210.00, 'sold', '2022-06-24', '2022-06-24 08:14:46'),
  (5062332, 13124167, '0006', 'Rebar and grout lift 60lf in backyard', NULL, NULL, 1500.00, 'sold', '2022-06-24', '2022-06-24 08:38:00'),
  (5062340, 13124167, '0007', 'Build 5 pilasters to retain wall', 'Cut out sections of existing Wall.

Dowel into existing wall block 

Epoxy in rebar connectors

Install 5 18x18 block reinforcment columns', NULL, 4475.00, 'sold', '2022-06-24', '2022-06-24 08:39:10'),
  (5063603, 11582899, '0008', 'Credit for trees', 'We had in contract (2) 36" box Magnolias
We installed (3) 24" box Palo verdes.

This is the credit for the difference.', NULL, -900.00, 'pending', '2022-06-24', '2022-06-24 12:56:37'),
  (5063637, 12608924, '0028', '(2) 5g Lavandula angustifolia', 'As per designer Karelaine''s email
ADDING (2) 5g Lavandula angustifolia to the 2 cast iron plants near the patio in front of the north wall.', NULL, 87.00, 'sold', '2022-06-24', '2022-06-24 13:04:03'),
  (5063872, 13124167, '0008', 'Credit for Removal of Delta Bent Grass Install', NULL, NULL, -9300.00, 'sold', '2022-06-24', '2022-06-24 13:50:28'),
  (5063884, 13124167, '0009', 'Add Electrical Rough', 'Install new rough in for electrical circuit out by play structure.

Roughly 50 linear. Breakout concrete curb.', NULL, 975.00, 'sold', '2022-06-24', '2022-06-24 13:52:38'),
  (5063888, 13124167, '0010', 'Install new Rachio timer and Outdoor Plug', 'Install new Rachio timer $450

Instal new exterior outlet $150', NULL, 600.00, 'sold', '2022-06-24', '2022-06-24 13:54:02'),
  (5063897, 13124167, '0011', 'Mulching for extended section of driveway.', 'Install weed barrier and extended section of mulching next to shed driveway 110 sq feet.  No plants or cardboard sheeting.', NULL, 170.00, 'sold', '2022-06-24', '2022-06-24 13:55:53'),
  (5064122, 13124167, '0012', 'Added Bender Board', '179 linear feet included in contract.  New design requires 365 linear feet. 186 linear feet addtional needed.', NULL, 1569.00, 'sold', '2022-06-24', '2022-06-24 15:00:52'),
  (5065915, 13124167, '0013', 'Cardboard installation for planters', 'Cardboard, weed barrier, mulching beds.', NULL, 1570.00, 'pending', '2022-06-27', '2022-06-27 07:22:20'),
  (5069108, 12781862, '0010', 'Additional Plants + Irrigation', '. Install existing steppers near raised planter and plant (1) flat of groundcover between steppers (flat is already on site) and move planters with vines $100.00 
2. Install (2) new drip zones for pool area plants/shrubs, use netafim soaker hose with copper shield and connect to existing timer $2130.00 (if it''s only 1 zone will give a credit for $1065.00)
3. Plant (3) 5 gallon Vines for pergola posts (recommending purple trumpet vine or Clematis $135.00
4. Plant (10) 15 gallon Pittosporum ''Silver Sheen'' against wall behind pergola to screen neighbors yard $1500.00
5. Plant (50) 1 gallon mix of perennials for front bed near driveway (3 Asparagus Ferns, 3 Lomandra ''Breeze) and remaining (44) plants for bed around pool area to fill into empty spaces.  (suggested plants for backyard: Asparagus Fern, Lomandra Breeze,  Dianella ''Little Rev'',Thrift Plant, Coral Bells, Hummingbird Sage, Mexican Petunia) $1075.00
6. Plant (10) 1 gallon orange daylilies to the left of pool pergola near fence to fill into spaces $215.00
7. Plant (6) 4" succulents for pots on shelf  $60.00
8. Plant placement (Dana) $100/hour (not included in change order pricing, will be added after plants have been placed)', NULL, 5125.00, 'sold', '2022-06-27', '2022-06-27 16:04:56'),
  (5070377, 12859486, 'More items ', 'More items', 'One concrete stepper 120

New valves with one check valve 450

Upgraded size on 6 red aloe to 5 gallon 120', NULL, 690.00, 'pending', '2022-06-28', '2022-06-28 07:08:32'),
  (5071853, 12728917, '0002', 'Credit', NULL, NULL, -500.00, 'pending', '2022-06-28', '2022-06-28 10:56:42'),
  (5071931, 12859486, '0003', 'Design Fee (w/ credit)', NULL, NULL, 375.00, 'pending', '2022-06-28', '2022-06-28 11:08:11'),
  (5071939, 11186379, '0001', 'Design credit', NULL, NULL, -375.00, 'pending', '2022-06-28', '2022-06-28 11:09:07'),
  (5071985, 12611577, '0010', 'Design Credit', NULL, NULL, -375.00, 'pending', '2022-06-28', '2022-06-28 11:16:13'),
  (5072829, 12728944, '0011', 'Additional 10lf. Bull nose pool copping', NULL, NULL, 650.00, 'sold', '2022-06-28', '2022-06-28 13:13:11'),
  (5073518, 9118708, '0008', '660 square feet turf', 'Turf to be socal blend -190
Emerald Green/ Lime Green/Field Green 2"', NULL, 7590.00, 'sold', '2022-06-28', '2022-06-28 15:29:40'),
  (5073546, 9118708, '0009', 'Tree removal/stump grind', 'Stump grind will need to be done very carefully due to swimming pool line will also need plywood to protect fencing', NULL, 480.00, 'sold', '2022-06-28', '2022-06-28 15:40:08'),
  (5073764, 12672375, '0001', 'Design Discount', NULL, NULL, -1000.00, 'pending', '2022-06-28', '2022-06-28 17:15:20'),
  (5073817, 13065764, '0005', 'Credit for post', NULL, NULL, 195.00, 'pending', '2022-06-28', '2022-06-28 17:39:19'),
  (5073842, 13065764, '0006', 'Credit Post', NULL, NULL, -195.00, 'sold', '2022-06-28', '2022-06-28 17:58:19'),
  (5073895, 10391726, '0014', 'Backfill with Organic soil.', NULL, NULL, 600.00, 'sold', '2022-06-28', '2022-06-28 18:28:22'),
  (5077336, 13065764, '0007', '4 Additional lights 3 path & 1 spot @ $248. Each', NULL, NULL, 992.00, 'sold', '2022-06-29', '2022-06-29 13:20:42'),
  (5082686, 13065764, '0008', 'Additional path light', NULL, NULL, 248.00, 'sold', '2022-06-30', '2022-06-30 16:39:18'),
  (5084448, 11582899, '0009', 'Additional Labor', '4 man days with 33% discount. 

$1,320', NULL, 1320.00, 'pending', '2022-07-01', '2022-07-01 10:04:05'),
  (5089476, 13063363, '0001', '25 LF (3) 12 guage wire + weatherproof outlet', NULL, NULL, 275.00, 'pending', '2022-07-05', '2022-07-05 11:47:42'),
  (5090383, 12352512, '0001', 'Design invoiced on install project', NULL, NULL, -750.00, 'pending', '2022-07-05', '2022-07-05 14:07:46'),
  (5090872, 12608924, '0029', 'Credit for mango sizing down', 'Manila Mango originally priced at 24" box and we could only get a 15g. This is cost difference.', NULL, -500.00, 'sold', '2022-07-05', '2022-07-05 16:10:36'),
  (5092558, 12608924, '0031', 'Credit for FX path lights in front- now Lightcraft', 'Credit for 9 FX Path lights that are now Lightcraft - MATERIAL only.', NULL, -360.00, 'sold', '2022-07-06', '2022-07-06 08:45:22'),
  (5092977, 12728944, '0012', 'Mainline repair (front yard)', NULL, NULL, 300.00, 'sold', '2022-07-06', '2022-07-06 10:01:27'),
  (5092987, 12728944, '0013', 'Edger in rustic wall', NULL, NULL, 475.00, 'sold', '2022-07-06', '2022-07-06 10:03:16'),
  (5095341, 13112275, '0001', 'Additional turf', '840 Sq ft of turf
95 linear feet of benderboard', NULL, 11440.00, 'pending', '2022-07-06', '2022-07-06 16:46:52'),
  (5096768, 13229565, '0001', 'Flats and Irrigation', 'Flats of blue fescue - $1420

3 zones of irrigation - $850 per zone total of - $2550

Grass demo - $600', NULL, 4570.00, 'pending', '2022-07-07', '2022-07-07 07:39:18'),
  (5096787, 13229565, '0002', 'Gravel, Edging and Mulch', 'Added these items back into project from original bid.', NULL, 8936.00, 'pending', '2022-07-07', '2022-07-07 07:43:05'),
  (5096791, 13229565, '0003', 'Added Hardscape Back In', 'Added pavers back in $5,082
Added firepit back in $3,400', NULL, 8482.00, 'pending', '2022-07-07', '2022-07-07 07:44:12'),
  (5096971, 13123257, '0001', 'Concrete Pad', 'Demo,
Grade,
Form
Pour
Finish', NULL, 1200.00, 'pending', '2022-07-07', '2022-07-07 08:12:04'),
  (5102454, 12943226, '0003', 'Fire Feature Install', 'FIREPIT 
-20 linear feet of gas line 
-Double burner 
-Gas Key 
-(2) 18" X 2''  high wall return to enclose some of the firepit 
-Brick work for the top of the pit 
-Cap', NULL, 2300.00, 'pending', '2022-07-08', '2022-07-08 11:31:24'),
  (5102457, 12943226, '0004', 'Additional Plants for Backyard', '(8) 5 gallon shrubs', NULL, 350.00, 'pending', '2022-07-08', '2022-07-08 11:32:02'),
  (5102966, 13162971, '0004', 'Addition to BBQ', 'Adding:
2'' Concrete countertop - $630
3'' CMU Block - $1,380
2 outlets - @ $90/each = $180', NULL, 2190.00, 'sold', '2022-07-08', '2022-07-08 12:56:51'),
  (5102979, 13162971, '0005', '14 LF conduit and 7 LF wire only', '14 LF 3/4" conduit - $280
7 LF wire only - $20', NULL, 300.00, 'sold', '2022-07-08', '2022-07-08 12:58:35'),
  (5102986, 13162971, '0006', '7 LF gas line  3/4" poly gas line', NULL, NULL, 200.00, 'sold', '2022-07-08', '2022-07-08 12:59:30'),
  (5102990, 13162971, '0007', 'Bonding wire and clamps for north side of pool', NULL, NULL, 80.00, 'sold', '2022-07-08', '2022-07-08 13:00:03'),
  (5103000, 13162971, '0008', '15 LF brown plastic bender board', 'At both ends of turf area, at gates we will need bender board to hold in turf.  Another little piece is needed near planter bed (called out in the design).
Three areas need 5 LF of bender board.', NULL, 120.00, 'sold', '2022-07-08', '2022-07-08 13:01:38'),
  (5103015, 13162971, '0009', 'Drainage', '232 LF of 3" SDR pvc drain pipe
9 drain grates
2 downspout connections', 'Jorge, Carlos and Nicole to explain drainage issue to client.', 5502.00, 'pending', '2022-07-08', '2022-07-08 13:04:23'),
  (5103154, 12608924, '0032', 'Credit for (1) jasmine vine 5g', NULL, NULL, -44.00, 'sold', '2022-07-08', '2022-07-08 13:35:05'),
  (5105998, 12979003, '0001', 'Irrigation - (1) more grass zone', 'Adding one more grass zone', NULL, 885.00, 'pending', '2022-07-11', '2022-07-11 09:21:37'),
  (5106086, 12979003, '0002', 'Add 50 LF brown plastic bender board', 'We had black metal in contract, switching ALL bender board to Brown plastic 1x6. 

Renders a credit.', NULL, -100.00, 'pending', '2022-07-11', '2022-07-11 09:37:34'),
  (5106133, 12979003, '0003', '(2) 5g Euonymus japonicus', NULL, NULL, 80.00, 'pending', '2022-07-11', '2022-07-11 09:47:11'),
  (5106683, 13162971, '0010', '(5) drain grates', 'Complementary per Jorge and Nicole. $75/each value', NULL, 0, 'pending', '2022-07-11', '2022-07-11 11:11:35'),
  (5108527, 12781862, '0011', 'Repair of Damaged Turf Area (+3% CC fee)', 'NOTICE : Turf rolls of the same name, blend, color and weight vary by dye lot. This can result in the same turf looking different if they were installed from different batches. Picture Build recommends replacing the all the turf to guarantee consistency in appearance and texture. 

Repairing the damaged turf. The damage in underneath the swing set, the damaged crosses a seam and affects two pieces of turf. 

The work needed;
Demo existing turf of 375sqft
Subsurface grading as needed
Install 375 of turf - to match existing
Install infill

Total : $4,387.50', NULL, 4519.12, 'pending', '2022-07-11', '2022-07-11 16:37:21'),
  (5112658, 13131461, '0001', 'Adding 3D design work', NULL, NULL, 400.00, 'sold', '2022-07-12', '2022-07-12 14:21:08'),
  (5114272, 13124167, '0014', 'Additional plants', '3-15g. Podocarpus 
1- 1gal. Rosemary 
1- 5gal. Olive', NULL, 515.00, 'sold', '2022-07-13', '2022-07-13 07:13:05'),
  (5114820, 12781862, '0012', 'Replace entire turf area', 'Demo existing turf of 1286sqft
Subsurface grading as needed
Install 1286 of turf - to match existing
Install infill

Total : $10,400.00', NULL, 10400.00, 'pending', '2022-07-13', '2022-07-13 08:38:58'),
  (5116487, 12762663, '0007', 'Credit 1 15gal', NULL, NULL, -150.00, 'pending', '2022-07-13', '2022-07-13 12:30:49'),
  (5117597, 12943226, '0005', 'Plant selection/placement design fee', '2 1/2 hours of plant placement/selections @ $150/hour as listed on estimate', NULL, 375.00, 'pending', '2022-07-13', '2022-07-13 15:30:57'),
  (5117607, 12781862, '0013', 'Plant consultation and placement fee for pool area', '2 hours @ $100/hour', NULL, 200.00, 'sold', '2022-07-13', '2022-07-13 15:34:22'),
  (5117962, 12781862, '0014', 'Veggies/Planting', '(6) 4" Summer squash and zucchini plants
(4) 4" Cauliflower plants', NULL, 80.00, 'sold', '2022-07-13', '2022-07-13 18:40:08'),
  (5119915, 12294709, '0003', 'Add Backard Yard plants, irrigation and lighting', 'Planting
Introduce equestrian shaving amendments for all planting. Roughly 2 yards
Install (1) 24 Inch Box Trees
Install (22) 5 gallon plants.
Install (28) 1 gallon plants
$1972

Irrigation
Install (1) new Superior Brass Valves
Install (1) new pressure regulator filters
Wire to existing timer. 
$1055

Install (1) New Light Craft 300 W Transformer
Install (16) LightCraft Standard LED path Lights
Install (3) Light Craft Standard LED up lights.

$4,674', NULL, 7701.00, 'sold', '2022-07-14', '2022-07-14 10:00:59'),
  (5120299, 13123534, '0002', 'Added Turf and Plants', 'Add additional turf to one putting green 120 Sq ft

30 1 gallon plants
30 5 gallon plants
60 linear feet of benderboard.
2 24 in box trees', NULL, 4884.00, 'pending', '2022-07-14', '2022-07-14 10:55:14'),
  (5122952, 13065764, '0009', 'Front Yard Landscape', '1. The price included the artificial turf in the 3 measured areas and will be the same turf as installed in the backyard.
2.  All irrigation included
3. 3 new trees.  I believe we agreed to the 24” box fruitless pear and a 15” box for both the hot pink crape myrtle tree and a new tree (can’t remember the name) that matches the one close to the neighbors house by the property line where our previous one blew over)
4.  New steel edging to match the backyard to separate our lawn with the neighbors.
5.  Flex edging for all planters', NULL, 32800.00, 'sold', '2022-07-15', '2022-07-15 07:24:07'),
  (5122965, 13065764, '0010', 'Credit for Lime Size', 'Change Lime from a 15 gallon to a 5 gallon.', NULL, -185.00, 'pending', '2022-07-15', '2022-07-15 07:27:05'),
  (5124395, 13063363, '0002', '10 (1 gallon) Elijah Blue Fescue', '- 10 (1 gallon) Eliljah Blue Fescue
- connect new plants to irrigation drip line (time + material)', NULL, 350.00, 'sold', '2022-07-15', '2022-07-15 11:26:17'),
  (5124560, 13065764, '0011', 'Add one more light', 'Add two more path lights to the back.', NULL, 55.00, 'sold', '2022-07-15', '2022-07-15 11:55:30'),
  (5124911, 12781862, '0015', 'Pebble Bed', 'Remove existing sod/soil 3" below final grade
Install mix of smaller Mexican Beach pebbles as "river" and larger beach pebbles to anchor each side
Area is approx 80" x 8"', NULL, 750.00, 'pending', '2022-07-15', '2022-07-15 12:54:13'),
  (5125869, 12606892, '0010', 'Poly sand', NULL, NULL, 2536.00, 'pending', '2022-07-16', '2022-07-16 10:16:32'),
  (5125908, 12606892, '0011', '2 Pour in lids', NULL, NULL, 200.00, 'pending', '2022-07-16', '2022-07-16 11:40:16'),
  (5125934, 13063363, '0003', 'Design Credit -$300', NULL, NULL, -300.00, 'sold', '2022-07-16', '2022-07-16 12:40:25'),
  (5127264, 12781862, '0016', '8 yards shredded mulch for pool/jasmine', NULL, NULL, 880.00, 'sold', '2022-07-18', '2022-07-18 07:31:32'),
  (5129753, 13243040, '0001', 'Additional wall amount', 'Additional wall amount during walkthrough 575', NULL, 575.00, 'sold', '2022-07-18', '2022-07-18 13:51:41'),
  (5129762, 13243040, '0002', 'Additional electrical work', '24 linear feet of conduit 480
one weather resistant outlet 90', '24 linear feet of conduit 480
one weather resistant outlet 90', 570.00, 'sold', '2022-07-18', '2022-07-18 13:52:48'),
  (5134776, 7666319, '0051', 'Main Line,  Steps, Repairs', 'Add 432 linear feet of main water line.  Buried 12 inches. Then backfill and recompact.  Add in Spigots.
Normally $27/ft per price list.  Good client discount to $21 per foot.  $9072.

Remove gravel in slippery section. Add Timber for 24 linear feet of side retainment.  Then add (3) 4 foot steps across.  $4375.
Add gopher mesh. Backfill with base to make level walking pads and compact about 4-5 yards.  Reinstall gravel  $935

Repair other steps and add gopher mesh to bottom steps.  $550
+1 irrigation valve with one stub up +200', NULL, 15137.00, 'pending', '2022-07-19', '2022-07-19 15:21:56'),
  (5134976, 2248928, '1212927', 'Paver repair', 'Pavers have settled due to water will need further assessment after raising the pavers.
1-we will need lift about 100 square feet of pavers 

2- remove sand and road base to test soil compactation if soil is not compacted we would need to compact soil in lifts, add road base, sand and install pavers with a 1.5 pitch away from the house. ( soil compactation will be an additional $640. Or more pending on how low we will need to compact.)', NULL, 1400.00, 'sold', '2022-07-19', '2022-07-19 16:30:00'),
  (5136592, 13283498, '0001', 'Credit for DG pathways + demo', NULL, NULL, -3100.00, 'sold', '2022-07-20', '2022-07-20 08:23:38'),
  (5136598, 13283498, '0002', '120sqft of additional Turf', NULL, NULL, 1250.00, 'sold', '2022-07-20', '2022-07-20 08:24:13'),
  (5136609, 13283498, '0003', '170 linear feet of bender board', 'In the original estimate, 260 linear feet of bender board was factored into the total cost of the DG pathways.  
We are still using bender board to separate the turf from mulched areas', NULL, 1360.00, 'sold', '2022-07-20', '2022-07-20 08:25:51'),
  (5136615, 13283498, '0004', 'Extra demo for mulched areas/soil mound', NULL, NULL, 1700.00, 'sold', '2022-07-20', '2022-07-20 08:26:35'),
  (5136648, 13283498, '0005', 'Shredded Mulch borders 710sqft', NULL, NULL, 500.00, 'sold', '2022-07-20', '2022-07-20 08:31:39'),
  (5136677, 13283498, '0006', 'Playground Mulch 240sqft', NULL, NULL, 360.00, 'sold', '2022-07-20', '2022-07-20 08:35:44'),
  (5138431, 12728944, '0014', 'CREDIT Main Line front', 'main line repair front yard $300', NULL, -300.00, 'pending', '2022-07-20', '2022-07-20 12:14:44'),
  (5139837, 13124167, '0015', '1 Additional valves', NULL, NULL, 800.00, 'pending', '2022-07-20', '2022-07-20 16:36:42'),
  (5144002, 13065764, '0012', 'Add 1 up light', NULL, NULL, 200.00, 'sold', '2022-07-21', '2022-07-21 14:54:12'),
  (5144056, 13065764, '0013', 'Additional planting', '6- one gal. Garlic
12- one gal. Daylilies
12- five gal. Iceberg rose''s 
3- 15 gal. Phoenix Roebeleni
4- 15 gal. Ligustrum 

6 bags 2-3" river rock and 4 bags 3/8 with weed fabric 

300 square feet of brown shredded mulch', NULL, 3801.00, 'sold', '2022-07-21', '2022-07-21 15:09:05'),
  (5144082, 13065764, '0014', 'Credit for 132sq. Feet of turf installation', NULL, NULL, -1782.00, 'pending', '2022-07-21', '2022-07-21 15:16:16'),
  (5144171, 13112275, '0002', 'Credits', '8 5 gallon plants
4 1 gallon plants

434 credit issued', NULL, -434.00, 'pending', '2022-07-21', '2022-07-21 15:42:13'),
  (5144175, 13112275, '0003', 'Additional Items', '4 1 gallon plants 21.50 each
2 5 gallon plants 43.50 each 
1 300w multitap low voltage transformer $437

Total 610', NULL, 610.00, 'pending', '2022-07-21', '2022-07-21 15:44:41'),
  (5144218, 13283498, '0007', 'Haul 4 wheelbarrows of concrete to dump', NULL, NULL, 100.00, 'sold', '2022-07-21', '2022-07-21 16:00:13'),
  (5146566, 13144178, '0001', 'additional items', '5 agave striata  360
8 1 gallon red yucca 22 176
3 octopus agave 135
3 5 gallon mexican fence post at 150 each, you have a credit of 45 each on those so total cost on them is an additional $315

you have a credit for 5 prickly pear 360

total cost of the plantings is 626

Gravel with 12 linear feet of bender board is $322

Total cost is $948', NULL, 948.00, 'pending', '2022-07-22', '2022-07-22 10:43:06'),
  (5147142, 12979003, '0004', 'Credits for plant downsizing', 'Some of the plants we could not get in the sizes in the contract.  Those plants gave a credit as detailed below:

We moved 4 15 gallon down to 5 gallons = $424 credit
We moved 5 5 gallon to 1 gallon = $110 credit', NULL, -534.00, 'pending', '2022-07-22', '2022-07-22 12:15:48'),
  (5148470, 13162971, '0012', 'Credit - Jasmine vines for wall', 'We realized we cannot install jasmine vines there best to have them in pots.  This is a credit for those plants.  Thanks!

5 5gallons @ $44.each', NULL, -220.00, 'sold', '2022-07-23', '2022-07-23 14:07:08'),
  (5151068, 13344765, '0001', 'Add’l coping', 'Extending coping on both sides of pool for a total of 10 additional linear feet', NULL, 470.00, 'sold', '2022-07-25', '2022-07-25 10:33:18'),
  (5151084, 13344765, '0002', 'Additional bender board', 'Separating grass from gravel, around fig tree
24 linear feet (15 for gravel and 9 for tree)', NULL, 192.00, 'sold', '2022-07-25', '2022-07-25 10:34:59'),
  (5151090, 13344765, '0003', '30sqft of sod', NULL, NULL, 135.00, 'sold', '2022-07-25', '2022-07-25 10:35:47'),
  (5151124, 13344765, '0004', '45 linear feet of drains', 'Adding trains to compensate for grade shift due to pool being lower than pathway 
Will keep surface water from seeping into pool/studio', NULL, 1035.00, 'sold', '2022-07-25', '2022-07-25 10:39:52'),
  (5151346, 13344765, '0005', '(6) add’l lights', '(4) uplights
(2) well lights', NULL, 1320.00, 'sold', '2022-07-25', '2022-07-25 11:04:36'),
  (5152849, 13162971, '0013', 'Footing for pergola labor only', NULL, NULL, 60.00, 'sold', '2022-07-25', '2022-07-25 14:30:00'),
  (5152891, 13162971, '0014', 'Additional footage of turf', 'We had in contract 690 SF of turf.
We need 795 SF of turf.

Cost difference = 105 SF @ $11.25/SF', NULL, 1181.00, 'sold', '2022-07-25', '2022-07-25 14:34:32'),
  (5152920, 13162971, '0015', '3/4 Conduit from pool equipment to bbq', '29 LF of 3/4" conduit from pool to bbq

White wire in existing box was not neutral it was ground. Please speak with Jorge for questions.', NULL, 580.00, 'pending', '2022-07-25', '2022-07-25 14:39:39'),
  (5153418, 13417357, '0001', 'Gopher baskets and mesh', '(3) 15g wire basket @ $30/each = $90
(14) 5g wire basket @ $10/each = $140
(29) 1g wire basket @ $9/each = $261

65 Square Feet wire grid for groundcover @ $2.50/SF = $162', NULL, 653.00, 'sold', '2022-07-25', '2022-07-25 16:45:09'),
  (5156193, 12606892, '0012', 'Additional turf', '$17913. Total 
$8045. In contract 
$9868 in change order.', NULL, 9868.00, 'sold', '2022-07-26', '2022-07-26 11:06:01'),
  (5156579, 11582899, '0010', 'Plant credit', NULL, NULL, -2000.00, 'pending', '2022-07-26', '2022-07-26 11:52:34'),
  (5160510, 12918412, '0001', 'Additional step build and pavers', '14lf x $14.50= $203.00.  +  4 lf step build v $60.00= $240.00', NULL, 443.00, 'pending', '2022-07-27', '2022-07-27 10:20:29'),
  (5162053, 13344765, '0006', 'Credit for timer', NULL, NULL, -424.00, 'pending', '2022-07-27', '2022-07-27 14:05:21'),
  (5165277, 12606892, '0013', 'Planting Credit', NULL, NULL, -7339.50, 'pending', '2022-07-28', '2022-07-28 11:25:19'),
  (5165282, 12606892, '0014', 'Credit for not running drop to plants', NULL, NULL, -1000.00, 'pending', '2022-07-28', '2022-07-28 11:25:57'),
  (5166813, 12781862, '0017', '12 station Rachio timer', NULL, NULL, 800.00, 'pending', '2022-07-28', '2022-07-28 16:44:59'),
  (5168644, 13471035, '0001', 'Drainage 3" SDR for 28 LF', '40 LF of 3" SDR with three matching downspout connections', NULL, 960.00, 'sold', '2022-07-29', '2022-07-29 09:48:43'),
  (5168656, 13471035, '0002', 'Saw cut 6 LF at front steps', NULL, NULL, 45.00, 'pending', '2022-07-29', '2022-07-29 09:50:35'),
  (5168670, 13471035, '0003', 'Main line 3/4" pvc', '22 LF of main line 3/4" PVC from back yard to planting area (where valves will live later).', NULL, 650.00, 'sold', '2022-07-29', '2022-07-29 09:52:50'),
  (5168671, 13471035, '0004', 'Hose bib in back yard', NULL, NULL, 100.00, 'sold', '2022-07-29', '2022-07-29 09:53:06'),
  (5168735, 13471035, '0005', '3/4" Gas poly line 77 LF', '77 LF of 3/4" poly line in sand 18" below grade with detection wire', NULL, 2387.00, 'pending', '2022-07-29', '2022-07-29 10:04:44'),
  (5169492, 13344765, '0007', 'Credit for (2) lights', NULL, NULL, -440.00, 'pending', '2022-07-29', '2022-07-29 12:20:47'),
  (5174037, 13458644, '0001', 'Credit for (18) 15 gallon Shrubs', NULL, NULL, -2700.00, 'sold', '2022-08-01', '2022-08-01 12:45:05'),
  (5174040, 13458644, '0002', '(21) 24" Boxed Carolina Cherry Shrubs', NULL, NULL, 8085.00, 'pending', '2022-08-01', '2022-08-01 12:45:39'),
  (5174848, 13458644, '0003', '30sqft add''l gravel', NULL, NULL, 100.00, 'sold', '2022-08-01', '2022-08-01 15:03:34'),
  (5175227, 13471035, '0006', '9 footings for post bases', '(5) 12" x 16" concrete footings for fence.
(4)18" x 18" concrete footings for pergola.', NULL, 1800.00, 'sold', '2022-08-01', '2022-08-01 17:20:50'),
  (5178014, 13471035, '0007', 'Post braces for pergola', 'Owner specified specific post braces Simpson MPB66Z.

For pergola this will require $50 extra cost per footing because braces specified. (Fence post braces are ok)', NULL, 200.00, 'sold', '2022-08-02', '2022-08-02 11:33:38'),
  (5182801, 13063363, '0004', '43 LF of 6" x 1" Brown Plastic Bender Board', NULL, NULL, 375.00, 'sold', '2022-08-03', '2022-08-03 12:03:25'),
  (5183676, 13471035, '0008', 'La Canada Used Brick front pathway + steps', 'Used Brick from La Canada Rustic Stone - Install of pathway is 85 SF. add $425
(2) 2''6" Used Brick steps - add $100

If we install more than 85 SF of brick for pathway, cost will be @ $25/SF (since we are sprinkling in some of your own used bricks).', NULL, 525.00, 'sold', '2022-08-03', '2022-08-03 14:02:51'),
  (5184236, 13461543, '0001', 'credit for design', NULL, NULL, -200.00, 'pending', '2022-08-03', '2022-08-03 16:24:21'),
  (5188291, 12943226, '0006', 'Front yard lights', NULL, NULL, 70.00, 'pending', '2022-08-04', '2022-08-04 15:15:11'),
  (5190158, 12606892, '0015', 'Lighting Credit', NULL, NULL, -1785.00, 'pending', '2022-08-05', '2022-08-05 09:01:36'),
  (5191333, 13136058, '0001', 'Credit', NULL, NULL, -26.00, 'pending', '2022-08-05', '2022-08-05 12:14:01'),
  (5192114, 13440383, '0001', 'Drains', '22 linear feet of 3" Drains from downspout to planter area...$506.00', '22 linear feet of 3" Drains from downspout to planter area...$506.00', 506.00, 'sold', '2022-08-05', '2022-08-05 15:06:45'),
  (5196494, 13243040, '0003', 'Additional items', 'Drain repair 150 (100 dollar credit, Originally 250) 

Credit on 13 5 gallon plants

10 1 gallon plants

1112 gravel credit

total credit 1892
upgrade rock $2688', NULL, 946.00, 'pending', '2022-08-08', '2022-08-08 14:33:01'),
  (5196824, 13469272, '0001', 'Electrical Work Outside Work', '48 linear feet to relocate pool electric to box at house
28 linear feet to run electric for fountain
6 linear feet for jbox to underhouse to j box on the outside of house
34 linear feet to relocate pool light electric', NULL, 2670.00, 'sold', '2022-08-08', '2022-08-08 15:54:26'),
  (5197020, 13469272, '0002', 'Acid Wash Concrete', 'California Room floor', NULL, 475.00, 'sold', '2022-08-08', '2022-08-08 17:00:37'),
  (5197051, 13469272, '0003', '(4) additional linear feet of retaining wall', NULL, 'Adding 4 linear feet of wall at 32" with stucco', 750.00, 'sold', '2022-08-08', '2022-08-08 17:11:56'),
  (5197053, 13469272, '0004', 'Credit for (1) 15 linear foot step', NULL, NULL, -945.00, 'sold', '2022-08-08', '2022-08-08 17:12:24'),
  (5197055, 13469272, '0005', 'Lights for Front Yard', '(3) path lights
(2) up lights', NULL, 1100.00, 'sold', '2022-08-08', '2022-08-08 17:13:43'),
  (5197056, 13469272, '0006', '(1) Citrus tree 15 gallon', NULL, NULL, 315.00, 'sold', '2022-08-08', '2022-08-08 17:14:29'),
  (5197066, 13469272, '0007', 'Credit for Mulch Backyard', NULL, NULL, -330.00, 'sold', '2022-08-08', '2022-08-08 17:19:03'),
  (5197068, 13469272, '0008', '(2) new irrigation valves/zones front yard', '(1) new spray for groundcover
(1) add''l drip', NULL, 1850.00, 'sold', '2022-08-08', '2022-08-08 17:20:10'),
  (5197071, 13469272, '0009', 'Credit for (3) linear feet garden wall', NULL, NULL, -300.00, 'sold', '2022-08-08', '2022-08-08 17:21:31'),
  (5198764, 13458644, '0004', 'Trim 5  palm trees.', NULL, NULL, 1000.00, 'pending', '2022-08-09', '2022-08-09 09:16:03'),
  (5200853, 12943226, '0007', 'Extra irrigation', NULL, NULL, 2200.00, 'pending', '2022-08-09', '2022-08-09 14:14:01'),
  (5201516, 13448673, '0001', 'Drains', 'Adding 280 linear feet of drains throughout the back yard and front yard…
 Connect existing and future downspouts into the new drains', NULL, 5650.00, 'sold', '2022-08-09', '2022-08-09 17:00:05'),
  (5201528, 13448673, 'Fountain Electrical ', 'Electrical', '45 Linear feet of electrical conduit / receptacle  for backyard fountain', NULL, 990.00, 'sold', '2022-08-09', '2022-08-09 17:06:48'),
  (5201538, 13448673, 'Low Voltage Lighting', 'Lighting', 'Add Lightcraft brand low voltage lighting as designated per plan

  Cost includes., 18 lights (4 submersible, 4 path 10 well lights approximately 60 linear ft of tape light for front steps and front wall cap 300 watt transformer with timer. Unit to be installed inside the garage', NULL, 5134.00, 'sold', '2022-08-09', '2022-08-09 17:11:21'),
  (5204576, 13525947, '0001', 'Gas run for outdoor kitchen', '90 linear feet of gas run', NULL, 2700.00, 'pending', '2022-08-10', '2022-08-10 12:00:45'),
  (5204607, 13525947, '0002', 'Electrical run for outdoor kitchen', '70 linear feet of electrical run', NULL, 1610.00, 'pending', '2022-08-10', '2022-08-10 12:05:19'),
  (5204810, 13525947, '0003', '40 Linear Feet Steps', NULL, NULL, 2200.00, 'sold', '2022-08-10', '2022-08-10 12:32:15'),
  (5204837, 13525947, '0004', '100sqft of decking along short side pool', NULL, NULL, 1670.00, 'sold', '2022-08-10', '2022-08-10 12:35:55'),
  (5204843, 13525947, '0005', 'Skimmer Boxes x 3', NULL, NULL, 660.00, 'sold', '2022-08-10', '2022-08-10 12:36:15'),
  (5204845, 13525947, '0006', 'Credit for 36sqft pavers', NULL, NULL, -450.00, 'sold', '2022-08-10', '2022-08-10 12:36:43'),
  (5209204, 13607123, '0001', 'Additional bender board for bed right of driveway', '35 linear feet total', NULL, 280.00, 'pending', '2022-08-11', '2022-08-11 12:19:05'),
  (5209278, 13417357, '0002', 'Remove (1) 15g jade and (1) 15 g cactus', NULL, NULL, 300.00, 'sold', '2022-08-11', '2022-08-11 12:28:59'),
  (5209304, 13607123, '0002', '12 linear feet of Paver Strip bottom drive', NULL, NULL, 400.00, 'pending', '2022-08-11', '2022-08-11 12:31:51'),
  (5209308, 13607123, '0003', 'Credit for Irrigation lateral/backyard', NULL, NULL, -400.00, 'pending', '2022-08-11', '2022-08-11 12:32:15'),
  (5210623, 13469272, '0011', 'UC Verde Front Yard', NULL, NULL, 3700.00, 'sold', '2022-08-11', '2022-08-11 18:07:54'),
  (5212764, 13469272, '0012', 'Redoing pool drainage', '120 linear feet all the way around pool with (3) inlets and (1) 12 linear foot channel drain in front of Cali room', NULL, 4300.00, 'sold', '2022-08-12', '2022-08-12 11:18:26'),
  (5217697, 13643594, '0001', 'Del Rio change order', 'adding 500 sq ft of del rio 3/8ths to side yard', NULL, 1625.00, 'pending', '2022-08-15', '2022-08-15 12:35:05'),
  (5218830, 13440383, '0002', 'Deisgn fee', NULL, NULL, 750.00, 'pending', '2022-08-15', '2022-08-15 16:07:14'),
  (5219221, 13525947, '0007', 'Adding 2 Linear Feet/Outdoor Kitchen', NULL, NULL, 950.00, 'pending', '2022-08-15', '2022-08-15 20:35:18'),
  (5221789, 13417357, '0003', 'New CMU wall up to 3'' tall, 8'' long', 'We need to rebuild 8'' of 8" CMU wall from the crack over at 3'' high. This is with a new footing.', NULL, 850.00, 'sold', '2022-08-16', '2022-08-16 11:31:56'),
  (5225064, 13471035, '0009', 'Credit for SDR pipe #5 in contract 19 LF', 'See #5 in contract.', 'I asked for TOTAL LF of drainage but never got these numbers from the crew or Brian and client is asking for a credit so I just gave it to him.
Next time before we back fill, I will need the exact LF of what we install, especially if client is watching every little thing we do we have to be exact.', -285.00, 'sold', '2022-08-17', '2022-08-17 08:20:15'),
  (5225447, 13185676, '0001', 'Canceling BBQ', NULL, NULL, -5100.00, 'pending', '2022-08-17', '2022-08-17 09:14:00'),
  (5226732, 13120554, '0001', 'Change order for tree stump / credit on turf', 'Credit on turf $130 
Stump removal $210', 'credit on turf went from socal blend 109 to autumn grass 97
cost diffrence is .50 cents a sq ft 
$130', 80.00, 'pending', '2022-08-17', '2022-08-17 12:07:32'),
  (5232368, 13607123, '0004', 'Add’l plants front/back', '(3) 5g Salvia ‘Black and Blue’
(4) 5g Westringia ‘Grey Box’
(2) 1g Dianella ‘Lil Rev’
(3)1g Salvia farinacea
(3) 1g Salvia pink
(1) flat Senecio
(1) 5g Red Yucca', NULL, 610.00, 'pending', '2022-08-18', '2022-08-18 14:29:58'),
  (5232718, 13458644, '0005', 'Design Fee', '(2) hours of design work includes plant placement and selections', NULL, 200.00, 'pending', '2022-08-18', '2022-08-18 15:51:28'),
  (5236297, 13448673, '0002', 'Artificial Turf', 'Installation of 1,250 Simple Turf Bel Air Supreme 116      1,250 X  $10.50  ($13,125.00)
Installation of 160 sq ft (TBD) Putting Green 160  X $16.20  ($2,592.00)
Putting Green Cups/Flags   4 x $93.00  ($372.00)', NULL, 16089.00, 'sold', '2022-08-19', '2022-08-19 14:31:02'),
  (5236304, 13448673, '0003', 'Additional Stucco for CMU walls', 'Additional 679 sq ft of stucco which includes the side yard retaining wall as well as Rear raised planter wall plus the visible sides to neighbor', NULL, 5941.00, 'sold', '2022-08-19', '2022-08-19 14:34:48'),
  (5236316, 13448673, '0004', 'White Marble Rock 1"-2"', 'White Marble Pebble Upgrade vs Contracted white crushed rock', NULL, 303.00, 'sold', '2022-08-19', '2022-08-19 14:41:37'),
  (5238917, 13469272, '0013', 'Additional Demo due to Access', 'Very limited access to backyard having to go through the garage as well as site conditions. Extra demo for the steps leading to platform. 
Demo took an additional 12 man days.', NULL, 3400.00, 'sold', '2022-08-22', '2022-08-22 09:33:41'),
  (5241107, 13469272, '0014', 'Electrical Main Panel to Sub Panel', '(4) 6 gauge wires
new breakers
new subpanel', NULL, 3010.00, 'sold', '2022-08-22', '2022-08-22 15:13:03'),
  (5241109, 13469272, '0015', '17 ln feet of gas line', NULL, NULL, 400.00, 'sold', '2022-08-22', '2022-08-22 15:13:36'),
  (5241293, 13469272, '0016', 'Front yard trees', '(1 Strawberry Unedo and 1 Olea europaea)', NULL, 300.00, 'pending', '2022-08-22', '2022-08-22 15:52:30'),
  (5247362, 12727257, '0008', 'Extra Demo and Concrete', 'Per city requirements from pre inspection
1 guy 3 hours extra demo.  add $210
extra concrete 6x6 , contract had 1 1/2 by 6.  So extra 27 sq feet. add $810', NULL, 1020.00, 'pending', '2022-08-24', '2022-08-24 07:42:55'),
  (5247680, 13525947, '0009', 'Cut for burner', NULL, NULL, 100.00, 'pending', '2022-08-24', '2022-08-24 08:25:42'),
  (5250258, 12727257, '0009', 'Design Credit', NULL, NULL, -500.00, 'pending', '2022-08-24', '2022-08-24 14:27:26'),
  (5250839, 13330004, '0003', 'Additional Flagstone for turf patio', 'Additional Flagstone for patio which includes labor and material.  Installed additional amount of 103 pieces.', NULL, 8900.00, 'pending', '2022-08-24', '2022-08-24 17:10:49'),
  (5251068, 13417357, '0004', 'Brown Shredded Mulch 2.5y', '3" deep of Brown shredded mulch WITHOUT weed barrier.
300 SF for upper and lower planters.
$555

Demo - Upper planter soils need to come down 2" to make it flat.', 'this cost is for top planter coming down 2" plus the 300 SF of mulch. 
bottom planter is okay. 
Move forward with these items ONLY w/ approval. Thanks!', 555.00, 'sold', '2022-08-24', '2022-08-24 20:01:29'),
  (5251075, 13471035, '0010', 'Credit for 3 CY imported raw soil', '@ $130/CY as in contract.', NULL, -390.00, 'sold', '2022-08-24', '2022-08-24 20:06:41'),
  (5252086, 13433560, '0001', 'CMU with stucco raised planter', '9x 3 x 18”', NULL, 1850.00, 'sold', '2022-08-25', '2022-08-25 07:36:02'),
  (5256577, 12658133, '0010', 'Additional Irrigation Valve for hillside', 'We are needing to separate a valve for the myoporum groundcover slope.  There are issues with runoff from the neighbors property creating flooding in Bevers yard.  This is to be able to control the extra runoff.', NULL, 500.00, 'pending', '2022-08-26', '2022-08-26 08:17:40'),
  (5258201, 13644428, '0001', 'Adding 2'' 6" LF to new 4 step at front gate', 'Adding to the length of the first step when you come throught the front gate - step was 4'' long and is now 6.5 LF', NULL, 157.00, 'sold', '2022-08-26', '2022-08-26 13:07:26'),
  (5258250, 13469272, '0017', '+3% CC for CO''s', NULL, NULL, 607.35, 'pending', '2022-08-26', '2022-08-26 13:20:50'),
  (5258264, 13644428, '0002', 'Add 4''2" step @ end of retaining wall - front path', 'In order to get our levels right, we are adding a 4''2" step after the retaining walls (front yard pathway).
Typical rise, typical step tread.', NULL, 265.00, 'sold', '2022-08-26', '2022-08-26 13:22:20'),
  (5258286, 13644428, '0003', 'Demo and add new 3.5 concrete step at studio', 'Step is 3'' 5" wide with 1'' 10" landing.
typical 6" rise
sand finish
*includes demo', NULL, 550.00, 'pending', '2022-08-26', '2022-08-26 13:28:43'),
  (5258300, 13644428, '0004', 'Adding 27 SF of concrete to front entrance', 'Adding 27 SF of concrete to walkway when you first get past the gate, the width of pathway will be 6''6" and then it will end at retaining walls.

Price as in contract is $14.50/SF', NULL, 390.00, 'sold', '2022-08-26', '2022-08-26 13:32:26'),
  (5258338, 13644428, '0006', '80 LF of 3" SDR pipe with downspout connectors', 'Connect all drains on the studio and grass side of house to our existing drainage plan (which, separately is 170 LF, and is included in our contract).
2 Downspouts will connect to our drains underground.
Two drain grates will be in grass area to prevent flooding and catch water.
All drains will connect to one central spot (pop ups).
Drainage will go inbetween studio and house and jog down the sideyard to the frontyard where it will connect with popups.', NULL, 1950.00, 'pending', '2022-08-26', '2022-08-26 13:42:19'),
  (5258349, 13644428, '0007', 'Upgrade 170 LF of drain in gravel sideyard to 4"', 'Jorge recommended that drains on gravel side of house should be larger because they are collecting a lot more water.
This is the cost difference of a 3" PVC pipe to 4" for 170 LF.', NULL, 510.00, 'sold', '2022-08-26', '2022-08-26 13:45:08'),
  (5258526, 13644428, '0008', 'Parkway (UPDATED 9/21)', 'Parkway demo - 3" of mulch and weed fabric 980 SF. **CLIENT HAS HANDLED ON THEIR OWN.

Demo of 3" below grade, tilling, grading, and adding amendments in prep for future planting WITH weed fabric. 980 SF - $2,675  **THIS IS ALREADY DONE.

Del Rio gravel - approx. 600 SF at 3" depth. $1,200 (DISCOUNTED)

Install 12-14 (2x2 grey steppers on-site) - 2 guys 2 hours $300
Install cobble stones as border of planters in parkway - 2 guys 2 hours $300

PLANTS- $354
For the non-Oak side:

(3) 1g lavender

(2) 5g boxwood japonica

(5) 1g Salvia Blue Spires
Oak side: (4) 1g Bluestar creeper groundcover

IRRIGATION - (1) brass value drip zone $965

This was updated on 9/21.', NULL, 5794.00, 'sold', '2022-08-26', '2022-08-26 14:30:36'),
  (5258613, 13644428, '0009', 'credit no demo for sideyard where shed is 163 SF', 'We aren''t doing demo in the side yard from edge of garage (past shed) towards end of ADU. We will just MIX in the del rio.

The area to the Left of the garage still needs to come down 3" (because right now gravel tends to spill over).', NULL, -200.00, 'sold', '2022-08-26', '2022-08-26 14:58:07'),
  (5258629, 13644428, '0010', '192 LF of 3" SDR pipe from garage to front yard', '192 LF of 3" SDR PVC drain pipe $4,415 (@$23/LF)
3 Downspouts will connect to drains underground - one at garage, 2 at house $85
Two drain grates will be in grass area to prevent flooding and catch water. @ $75/each = $150
Drain to connect to 4" pipe in front yard and to exit at street 
Permits $800 **We will credit you if less, cost is permit + admin hours for pulling permit $150/hr. We will share permit cost with you.**
Saw cut, demo, core curb at street and re-pour concrete in broom finish $1,200', NULL, 6650.00, 'sold', '2022-08-26', '2022-08-26 15:04:00'),
  (5258826, 13644428, '0011', 'Extra concrete (ADU landing pad) 7 SF', 'Demo and pour 3,000 psi concrete for 7 SF with sand finish to match.', NULL, 150.00, 'sold', '2022-08-26', '2022-08-26 17:06:29'),
  (5265759, 13644428, '0012', 'Credit 1 step in backyard 3 LF', 'Not doing extra step in backyard 3 LF.', NULL, -350.00, 'sold', '2022-08-30', '2022-08-30 08:59:54'),
  (5266453, 13644428, '0013', 'Credit for all backyard retaining walls', 'Concrete Retaining walls in backyard #2 in Contract Addendum

$3,527 (CREDIT)', NULL, -3527.00, 'sold', '2022-08-30', '2022-08-30 10:31:03'),
  (5266540, 13644428, '0014', '92 LF. Main 1" copper', '55 Lf. @ $25. LF.  $1375. Discount for trenching 
37LF.  @ $40. LF.  $1480.
 Total $2855.00', NULL, 2855.00, 'sold', '2022-08-30', '2022-08-30 10:42:00'),
  (5267068, 13417357, '0005', 'Credit 2 flats', 'didn''t install 2 flats.', 'please return to yard for credits', -134.00, 'sold', '2022-08-30', '2022-08-30 11:53:35'),
  (5267900, 12608924, '0035', '(3) uplights and front pathway extenders', 'Order for (3) up lights - same up lights from installation. FL-105B Big Smoky Accent Light w/Glare Contro
Not going up any trees.

We need some (maybe 2-3) extenders so the lights near jasmine path can come down and re-purpose the extenders to put path lights in center of boxwood hedge, as some are not in center, they are on outside.Please check irrigation and plants that look like they are dying.', NULL, 900.00, 'sold', '2022-08-30', '2022-08-30 13:46:30'),
  (5268152, 13448673, '0005', 'Additional Plants', 'Additional plants:

(6) 15 gallon Pygmy Date Palms
(2) 24" box Pygmy Date Palms
(1) 24" box Queen Palm
(1) 15 gallon Queen Palm', 'Additional plants include

(6) 15 gallon Pygmy Date Palms
(2) 24" box Pygmy Date Palms
(1) 15 gallon Queen Palm', 3420.00, 'sold', '2022-08-30', '2022-08-30 14:20:18'),
  (5268703, 6849642, '0004', 'Install 1- 15 gal. Carolina cherry', NULL, NULL, 300.00, 'sold', '2022-08-30', '2022-08-30 16:22:21'),
  (5273415, 13123257, '0002', 'Step Light Credit', 'This is a credit of (3) step lights for the deck area', NULL, -720.00, 'sold', '2022-08-31', '2022-08-31 16:49:50'),
  (5273432, 13123257, '0003', 'Additional 90 sq ft of artificial turf in backyard', 'Installation of additional 90 sq ft of artificial turf to the backyard', 'Additional 90 sq ft of artificial turf in backyard patio area', 1195.00, 'sold', '2022-08-31', '2022-08-31 16:55:09'),
  (5276304, 13939548, '0001', 'Main line 25 LF.', 'Run main line behind new retaining wall 
About 25 LF.', NULL, 700.00, 'sold', '2022-09-01', '2022-09-01 11:42:19'),
  (5276327, 13939548, '0002', 'Electrical for tool shed and outlets', 'Electrical includes 
91LF. Conduit with wire
2- breakers 
1-outlet', NULL, 2430.00, 'sold', '2022-09-01', '2022-09-01 11:46:50'),
  (5276905, 13448673, '0006', 'Credit (1) 15 Gallon Queen Palm', 'Credit for (1) 15 gallon Queen Palm in backyard', NULL, -300.00, 'sold', '2022-09-01', '2022-09-01 13:08:45'),
  (5276908, 13939548, '0003', 'Credit for moving wall.', 'Less soils removed - $1400 credit
Less course on wall on tall section - $780 credit
Less turf installed - $1320 credit.', NULL, -3500.00, 'sold', '2022-09-01', '2022-09-01 13:09:07'),
  (5276962, 13448673, '0007', 'Backyard 3/4" white crushed gravel', 'Raised planter 3/4" crushed white gravel for backyard', NULL, 550.00, 'sold', '2022-09-01', '2022-09-01 13:17:32'),
  (5285579, 12655622, '0003', 'Brick veneer on the riser', 'Brick veneer on the riser. approximately 15 linear feet

Material; Pacific clay Iron lights brick veneer
One box, the material is TBD. We are waiting to hear from distributor on estimated delivery and price. We estimate  $75-80

Installation will take approximately 3-4 hours.', NULL, 250.00, 'pending', '2022-09-06', '2022-09-06 12:01:51'),
  (5288546, 13185676, '0002', '(2) additional zones for brush', 'Includes (2) separate risers with rotary heads for HOA planted areas', NULL, 2500.00, 'sold', '2022-09-07', '2022-09-07 08:12:10'),
  (5290334, 11894433, '0004', 'new irrigation', '9 zones of irrigation at 800 each', '9 zones of irrigation', 7200.00, 'pending', '2022-09-07', '2022-09-07 12:26:27'),
  (5290811, 13644428, '0015', 'Permit credit', 'Permit was $491
One hour for permit @ $150/hr = $641
$800 allowance for permitting - $641 = $159', NULL, -159.00, 'sold', '2022-09-07', '2022-09-07 13:33:03'),
  (5290978, 13703376, '0001', 'Citrus', '2 citrus', NULL, 630.00, 'pending', '2022-09-07', '2022-09-07 13:57:52'),
  (5294544, 13185676, '0003', '3% CC fees from Original Contract', NULL, NULL, 1538.40, 'pending', '2022-09-08', '2022-09-08 11:20:11'),
  (5296341, 13703376, '0002', 'Irrigation', 'Install (1) Bubbler zone and (1) 4 station timer for front yard trees', NULL, 1065.00, 'sold', '2022-09-08', '2022-09-08 18:04:46'),
  (5300000, 13433560, '0002', 'Concrete Saw Cut', 'Saw cut concrete for electrical access to the spa location.', NULL, 570.00, 'sold', '2022-09-09', '2022-09-09 09:26:58'),
  (5300636, 13433560, '0003', 'Mulch', 'Add 2.5 yards of brown shredded mulch to backyard landscape. No weed fabric', NULL, 555.00, 'sold', '2022-09-09', '2022-09-09 11:17:47'),
  (5301530, 13644428, '0016', 'Credit sod - BACKYARD', 'We have in contract 770 SF.
We need 710.

Credit is for 60 SF of St AUG sod.', NULL, -285.00, 'sold', '2022-09-09', '2022-09-09 14:39:56'),
  (5301556, 13644428, '0017', 'St Augustine - FRONTYARD', 'We have 875 SF of sod in Frontyard in contract.
With current layout we have 1,175 SF. 

Difference is 300 SF = $1,300', 'gave a small discount on sod. 2%', 1300.00, 'sold', '2022-09-09', '2022-09-09 14:50:03'),
  (5301562, 13644428, '0018', 'Credit for roses', 'Clients will PURCHASE and PLANT the roses (18 - 5gallons) or whatever they like!', 'Rachelle will PURCHASE and PLANT the roses (18 - 5gallons)', -783.00, 'sold', '2022-09-09', '2022-09-09 14:51:25'),
  (5301588, 13644428, '0019', 'Extra gravel needed 138', 'We have 868 in contract and crew measured 1006.

Difference of 139 SF.', NULL, 448.00, 'sold', '2022-09-09', '2022-09-09 15:04:08'),
  (5304020, 13162971, '0016', 'Seal counter top', NULL, NULL, 200.00, 'sold', '2022-09-12', '2022-09-12 10:45:02'),
  (5306340, 9458413, '0012', 'Refresher', 'Plants backyard - (3) 5g lavender, (1) 15g Bird of Paradise (2) 5g tbd.
Plants front yard - (1) 15g, (10) 5g, 5 (1g)
Plants side yard - (4) 5g
TOTAL PLANT COST $1,975
Includes adding emitters to these new plants AND checking older plants for any leaks.

Mulch - 1 CY Gorilla Hair @ 3" depth $225

Wire for jasmine on back walls $300

Remove giant bird of paradise and replace with regular bird of paradise (as we had planned initially). No charge for removal of larger bird of paradise, only for (1) 15g included in plant total above.Includes fixing cactus that are buried.Plant removal TBD.', 'for MAINTENENCE - Grass seed, trim roses.', 2500.00, 'pending', '2022-09-12', '2022-09-12 17:22:13'),
  (5309225, 13939548, '0004', 'Additional 44 LF. Of wall 6x8x16 2 courses total', 'Wall will be 2 courses high with no more that 7"footings 2'' from back neighbors wall.
In grey split face', NULL, 3478.00, 'sold', '2022-09-13', '2022-09-13 11:24:47'),
  (5314450, 13757170, '0001', 'Gas and electrical', '9 additional linear feet of electricalZ $25.00= $225.0012 linear feet of gas line 1" x $36.00= $420.00$645.00 total', NULL, 645.00, 'pending', '2022-09-14', '2022-09-14 12:35:06'),
  (5314506, 13185676, '0005', 'Additional plants', '2 24" Ficus
3 15 gallon Dodos', NULL, 1220.00, 'sold', '2022-09-14', '2022-09-14 12:41:45'),
  (5314515, 13185676, '0006', 'Credit for plants', 'Credit for 1 15 gallon Mont cypress and 1 15 gallon Honeysuckle', NULL, -300.00, 'sold', '2022-09-14', '2022-09-14 12:42:51'),
  (5314530, 13185676, '0007', 'Credit for mulch', NULL, NULL, -900.00, 'sold', '2022-09-14', '2022-09-14 12:43:57'),
  (5314751, 13185676, '0008', 'Credit for (1) Monterey Cypress not being removed', NULL, NULL, -410.00, 'sold', '2022-09-14', '2022-09-14 13:08:02'),
  (5315679, 13099574, '0001', 'Scope of work change', 'Landscaping Project - Picture Build
			 
			 
		
		
			 
			 
			 
		
		
			Item
			Cost
			 
		
		
			Front Yard
			 
			 
		
		
			Paver Mow Strip set in concrete
			 $                  380.00
			 
		
		
			120 linier feet of benderboard edging
			 $                  840.00
			 
		
		
			Turf - Socal Blend 109 (775 Feet)
			 $              9,300.00
			 
		
		
			Plants
			 
			 
		
		
			23 5-gallon plants
			 $              1,005.50
			 
		
		
			11 1-gallon plants
			 $                  236.50
			 
		
		
			2 24in box trees
			 $                  770.00
			 
		
		
			5 flats of vinca
			 $                  250.00
			 
		
		
			 
			 
			 
		
		
			Driveway & Walkway
			 
			 
		
		
			12 5-gallon raphilopsis ballerina
			 $                  522.00
			 
		
		
			Roses
			 $                  696.00
			 
		
		
			Planting Mix backfill
			 $                  300.00
			 
		
		
			 
			 
			 
		
		
			Backyard
			 
			 
		
		
			6 5-gallon semi-dwarf blue cypress
			 $                  261
			 
		
		
			 
			 
			 
		
		
			Running Total
			 $            14,597
			 
		
		
			 
			 
			 
		
		
			Add-ons
			 
			 
		
		
			Additional Turf
			 $         300                  -  
			 
		
		
			Add pipes for drip system
			 $                  100.00
			 
		
		
			Rocks with weed fabric (walkway, rose area, adu side)
			 $                  926.00
			 
		
		
			Backyard Planters
			 
			 
		
		
			 
			 
			 
		
		
			Back planter 19 plants (excluding cyprus)
			 $              826.5
			
			Total $16,748
		
	



Difference from original is $1298', NULL, -1298.00, 'pending', '2022-09-14', '2022-09-14 16:09:45'),
  (5319906, 13262395, '0001', 'Added cost for price discrepancy on edging stone.', NULL, NULL, 3067.75, 'sold', '2022-09-15', '2022-09-15 14:52:05'),
  (5319966, 13433560, '0004', 'credit for concrete steps', NULL, NULL, 0, 'pending', '2022-09-15', '2022-09-15 15:05:07'),
  (5320176, 13123257, '0004', 'Mulch', 'Add 3 yards of mulch in side yard and back yard', NULL, 555.00, 'sold', '2022-09-15', '2022-09-15 16:18:19'),
  (5321426, 13757170, '0002', 'Polymeric sand', 'Change order approved via text', NULL, 798.27, 'pending', '2022-09-16', '2022-09-16 07:52:31'),
  (5322158, 14069657, '0001', 'Lower existing gas line', 'Lower existing gas line below grade', NULL, 400.00, 'pending', '2022-09-16', '2022-09-16 10:00:50'),
  (5322201, 12829114, '0001', '3/4" copper main line + new hose bib', '50 LF - 3/4" copper main line
New hose bib', NULL, 2070.00, 'pending', '2022-09-16', '2022-09-16 10:09:41'),
  (5322209, 12829114, '0002', '(1) extra weatherproof outlet', '1 weatherproof outlet above existing', NULL, 120.00, 'pending', '2022-09-16', '2022-09-16 10:10:47'),
  (5322226, 12829114, '0003', 'CREDIT - Keeping (4) 15gallon bamboo', 'Keeping bamboo', NULL, -568.00, 'pending', '2022-09-16', '2022-09-16 10:14:55'),
  (5322234, 12829114, '0004', 'Credit - Craig did a little cutting jasmine', 'Credit for cutting down jasmines', NULL, -75.00, 'pending', '2022-09-16', '2022-09-16 10:16:32'),
  (5322842, 12829114, '0005', 'Deep watering PVC pipe w grates', '(11) brown 4" grates
(11) PVC pipe for deep water', NULL, 780.00, 'sold', '2022-09-16', '2022-09-16 12:06:33'),
  (5323489, 14013643, '0001', 'Additional dg', 'Additional 160 Sq ft of dg with Edging', NULL, 1400.00, 'pending', '2022-09-16', '2022-09-16 14:01:01'),
  (5323514, 13757191, '0001', '(4) step lights and (1) transformer', NULL, NULL, 1400.00, 'pending', '2022-09-16', '2022-09-16 14:06:42'),
  (5323870, 13185676, '0009', '(3) 24" Boxed Trees', '(2) Chinese Elm Trees
(1) Live Oak Tree', NULL, 1200.00, 'sold', '2022-09-16', '2022-09-16 17:04:50'),
  (5323871, 13185676, '0010', 'Credit for (2) lights and (1) transformer', NULL, NULL, -885.00, 'sold', '2022-09-16', '2022-09-16 17:07:19'),
  (5323872, 13185676, '0011', 'Additional Valve (front plants)', NULL, NULL, 350.00, 'sold', '2022-09-16', '2022-09-16 17:08:09'),
  (5323874, 13185676, '0013', 'Soil removal and additional grading', 'Soil removal from Monterey Cypress bed and where Pine tree was located
Additional grading required than what was listed in contract
Dump fees included in this change order', NULL, 450.00, 'sold', '2022-09-16', '2022-09-16 17:09:50'),
  (5323881, 12781862, '0018', 'Additional plants', 'Installing 
 
3- 1gal. Feather grass
3- 15gal. Silversheen 

Total $514.5', NULL, 514.50, 'sold', '2022-09-16', '2022-09-16 17:29:16'),
  (5325996, 13757170, '0003', 'CO 3%', NULL, NULL, 43.30, 'pending', '2022-09-19', '2022-09-19 08:48:55'),
  (5327301, 13099574, '0002', 'Credit due', NULL, NULL, -34.50, 'pending', '2022-09-19', '2022-09-19 12:03:16'),
  (5328787, 13757170, '0004', 'Paver sealer', NULL, NULL, 766.00, 'pending', '2022-09-19', '2022-09-19 16:54:06'),
  (5330437, 13185676, '0014', '(1) light', NULL, NULL, 225.00, 'sold', '2022-09-20', '2022-09-20 08:32:04'),
  (5333560, 13644428, '0020', '37 LF of bender board for planter along fence', 'Jorge sprayed out the area for the bender board in back along wooden fence.  This will house the trees (and any future plantings).
37 LF', NULL, 320.00, 'pending', '2022-09-20', '2022-09-20 18:44:54'),
  (5335937, 12829114, '0006', 'Extra 34 LF of 1"x6" brown plastic bend-a-board', 'We need 34 extra LF for dog run area.
I have given a discounted cost @ $8.75/LF (it''s $10/LF in contract).', NULL, 298.00, 'sold', '2022-09-21', '2022-09-21 10:48:17'),
  (5337814, 13123257, '0005', 'Plant Credit', NULL, 'Client declined vines on Patio structure posts .  Credit (2) 5 gallon vines', -88.00, 'pending', '2022-09-21', '2022-09-21 16:48:09'),
  (5337828, 13123257, '0006', 'Snake fencing on iron fencing', NULL, 'Roughly 80-90 linear feet of mesh fencing', 770.00, 'sold', '2022-09-21', '2022-09-21 16:52:28'),
  (5339763, 14157948, '0001', 'Main line water 24 lf X $23.00= $552.00', NULL, NULL, 552.00, 'pending', '2022-09-22', '2022-09-22 09:29:09'),
  (5341719, 13185676, '0015', 'Adding 1- 36" box pine tree', NULL, NULL, 1475.00, 'pending', '2022-09-22', '2022-09-22 14:15:59'),
  (5342013, 13448673, '0008', 'Plants', 'Add (3) 15 Gallon plants for the pots', NULL, 675.00, 'sold', '2022-09-22', '2022-09-22 15:10:35'),
  (5342026, 13448673, '0009', 'Low Voltage Lighting Credit', 'This is a credit for (5) spot lights as they were not needed and wanted', NULL, -1125.00, 'sold', '2022-09-22', '2022-09-22 15:12:28'),
  (5342078, 13448673, '0010', 'Artificial Turf', 'Additional turf for parkway, driveway side and upper left area at the house.  These measurements were not initially factored in due to the fact that construction was still ongoing and didn''t have accurate areas of detail', NULL, 4200.00, 'sold', '2022-09-22', '2022-09-22 15:23:56'),
  (5342174, 13757170, '0005', 'CO Sealer 3%', NULL, NULL, 22.98, 'pending', '2022-09-22', '2022-09-22 15:51:39'),
  (5344439, 13123257, '0007', 'CREDIT AGAINST INDIVIDUAL INVOICES', NULL, NULL, -3237.00, 'pending', '2022-09-23', '2022-09-23 10:32:29'),
  (5344445, 13123257, '0008', 'Consolidated balance', NULL, NULL, 3237.00, 'pending', '2022-09-23', '2022-09-23 10:33:02'),
  (5344840, 13330004, '0004', 'Change Order 1', NULL, NULL, 1000.00, 'pending', '2022-09-23', '2022-09-23 11:43:47'),
  (5345160, 13185676, '0017', 'Remove stump', NULL, NULL, 700.00, 'sold', '2022-09-23', '2022-09-23 12:43:28'),
  (5345266, 12629415, '0009', 'Sod Installation', '1500sqft of Marathon
I plus 2 zones of Irrigation', NULL, 7100.00, 'sold', '2022-09-23', '2022-09-23 13:04:54'),
  (5348102, 13185676, '0018', '(1) 24" Paperbark Tree', NULL, NULL, 400.00, 'sold', '2022-09-26', '2022-09-26 09:02:31'),
  (5348645, 14145921, '0001', '25 LF 3/4" water line for irrigation', 'Need water source to backyard - 

11 LF 1/2" copper water line (attached to foundation) @ $38/LF
16 LF 1/2" PVC pipe (under deck) @ $27/LF', NULL, 850.00, 'sold', '2022-09-26', '2022-09-26 10:22:58'),
  (5348743, 14145921, '0002', '13 additional LF for second course for steps', '13 additional LF of RRv ties for steps going down', NULL, 390.00, 'sold', '2022-09-26', '2022-09-26 10:33:40'),
  (5353049, 12829114, '0007', 'Add stabilizer to DG', 'We need 9 gallons of spray on stabilizer.
Labor included.', NULL, 1600.00, 'sold', '2022-09-27', '2022-09-27 10:10:29'),
  (5353080, 14157948, '0002', '10 1 gallon pink Muhle grass', NULL, NULL, 215.00, 'pending', '2022-09-27', '2022-09-27 10:15:56'),
  (5353096, 14157948, '0003', 'Mulch/rock ratio', 'Credit of112sf x $2.25 $252.00Add rock 112 x $5.50= $616.00+$364.00', NULL, 364.00, 'pending', '2022-09-27', '2022-09-27 10:18:46'),
  (5353124, 14157948, '0004', 'Steppers', '8 x $100.00=$800.00', NULL, 800.00, 'pending', '2022-09-27', '2022-09-27 10:21:22'),
  (5353159, 14157948, '0005', 'Design credit', NULL, NULL, -375.00, 'pending', '2022-09-27', '2022-09-27 10:25:41'),
  (5358986, 14175746, '0001', '42 linear feet of small wall along property line', 'Adding turf strip on top', NULL, 1100.00, 'sold', '2022-09-28', '2022-09-28 14:38:41'),
  (5359050, 14175746, '0002', 'Small Concrete Wall for California Room', '8 linear feet of poured concrete to be the base for the wooden IPE wall that Craig will install', NULL, 1300.00, 'sold', '2022-09-28', '2022-09-28 14:47:43'),
  (5359129, 14175746, '0003', 'Polymeric Sand for Paver Joints', 'To stablilize joints between pavers', NULL, 1800.00, 'sold', '2022-09-28', '2022-09-28 15:01:10'),
  (5359133, 14175746, '0004', '30sqft additional pavers', 'For a total of 1014 pavers (contract has 985)', NULL, 420.00, 'sold', '2022-09-28', '2022-09-28 15:02:25'),
  (5359145, 14175746, '0005', 'Drainage', '53 linear feet of 4" SDR 35 drain pipe
(3) plastic inlets
(4) inlets (for paver area, will be finished in the paver)', NULL, 2400.00, 'sold', '2022-09-28', '2022-09-28 15:04:04'),
  (5359190, 13433560, '0005', 'Credit for steps', NULL, NULL, -300.00, 'pending', '2022-09-28', '2022-09-28 15:18:39'),
  (5359364, 13185676, '0020', 'Additional sod', NULL, NULL, 660.00, 'sold', '2022-09-28', '2022-09-28 16:13:15'),
  (5359412, 13144178, '0002', 'Plant order credit', 'Plant credit for plants not installed per contract.  I have reviewed the order list and reflected what was installed to what was installed.', NULL, -1344.00, 'pending', '2022-09-28', '2022-09-28 16:30:32'),
  (5359755, 12608924, '0038', '(3) 5g dwarf "patio" olives (short-single trunk)', 'The 3 Olives replacing the 3 Camellias (to be transplanted) should be 5 gallon dwarf "patio" olives (short single trunk) - the same as those in the large, tall pots around the patio. I found those at La Crescenta Nursery and they are priced accordingly.

Cost includes replanting camellias and irrigating them in their new spots. **Karelaine to flag', NULL, 500.00, 'sold', '2022-09-28', '2022-09-28 21:35:13'),
  (5359756, 12608924, '0039', 'Extra (1) 5g Azelea', NULL, NULL, 45.00, 'sold', '2022-09-28', '2022-09-28 21:36:38'),
  (5359775, 14145921, '0003', 'Weed fabric in targeted grassy areas', 'Approx. 200 SF of weed fabric used to target grassy areas of hillside.
Double up the weed fabric to black out the grasses. Not all areas have persistent weeds.

*This is a measure that we use to combat weeds, it is by no means a solution to weeds never coming back.
**By signing this change order, you agree that other measures should be used to combat weeds after Picture Build is off of the job site.', NULL, 600.00, 'sold', '2022-09-28', '2022-09-28 21:54:37'),
  (5360780, 14175746, '0006', 'Credit for block wall with stucco', NULL, NULL, -2800.00, 'sold', '2022-09-29', '2022-09-29 08:43:17'),
  (5366518, 13469272, '0018', 'Add''l Olive + Strawberry Trees (front)', 'both are 15 gallons', NULL, 300.00, 'sold', '2022-09-30', '2022-09-30 15:44:34'),
  (5366633, 13469272, '0019', 'Additional plant front/ back', '(10) 1g Dianella ''little rev''
(6) 5g Muhlenbergia ''Regal Mist''
(4) 5g Pittosporum ''Silver Sheen''
(3) 5g Salvia ''Mystic Spires''
(3) 5g White Iceberg Roses
(3) 5g Westringia ''Morning Light''
(1) 5g Salvia greggii 
(9) 1g Limonium', NULL, 1300.00, 'sold', '2022-09-30', '2022-09-30 18:23:48'),
  (5366776, 14145921, '0004', 'Outdoor weatherproof outlet (punch out garage)', '(1) outdoor weatherproof outlet with cover

There is no other power outside.', NULL, 175.00, 'sold', '2022-10-01', '2022-10-01 09:05:14'),
  (5368753, 14306877, '0002', 'Additional items', '250 additional Sq ft of Concrete $1900Demo for backyard to level 600 cu ft by bobcat2508Total $4408', NULL, 4408.00, 'pending', '2022-10-03', '2022-10-03 09:00:22'),
  (5368972, 14145921, '0005', 'Pathway retained with 12'' boards', '(5) 12'' boards with rebar to hold up new pathway across upper slope to new steps location', NULL, 600.00, 'sold', '2022-10-03', '2022-10-03 09:32:31'),
  (5370512, 14175746, '0007', 'irrigation for 2 zones', NULL, NULL, 2000.00, 'sold', '2022-10-03', '2022-10-03 13:08:49'),
  (5370521, 14175746, '0008', 'Lighting', '(3) up lights 
(1) transformer', NULL, 1200.00, 'sold', '2022-10-03', '2022-10-03 13:09:42'),
  (5370583, 13469272, '0020', 'Additional Lighting for front', '+1 uplight
+1 path light
+4 accent lights', NULL, 1350.00, 'sold', '2022-10-03', '2022-10-03 13:20:36'),
  (5371318, 13469272, '0021', 'one additional up light +3% for new CO''s', 'one additional up light $225

- per client note in previous CO 

Total of 3175 in new change orders.  $95.25', NULL, 320.25, 'pending', '2022-10-03', '2022-10-03 15:46:32'),
  (5371455, 14145921, '0006', 'Upsizing 7 plants from 1g to 5g', '7 plants @ $22 extra each ~ $150', NULL, 150.00, 'sold', '2022-10-03', '2022-10-03 16:35:58'),
  (5371473, 13939548, '0005', 'Side yard concrete work with gravel', 'Form and pour about 18 concrete pads 
With 1" minus del rio. gravel in strips', NULL, 4137.00, 'sold', '2022-10-03', '2022-10-03 16:40:53'),
  (5371556, 14145921, '0007', '6-8 station Rachio Smart Timer plus 50 LF cable', NULL, NULL, 550.00, 'sold', '2022-10-03', '2022-10-03 17:15:57'),
  (5371621, 13433560, '0006', 'Credit for concrete trax marks', NULL, NULL, -300.00, 'pending', '2022-10-03', '2022-10-03 17:49:30'),
  (5373609, 13718259, '0001', '10 additional plants for parkway', '(2) 5 gallon purple Salvia greggii
(8) 1 gallon orange daylilies', NULL, 230.00, 'sold', '2022-10-04', '2022-10-04 09:55:09'),
  (5377809, 13185676, '0023', 'Credit for 2 yards of 50/50 soil', NULL, NULL, -200.00, 'sold', '2022-10-05', '2022-10-05 08:51:34'),
  (5378109, 13185676, '0026', 'Electrical credit', NULL, NULL, -550.00, 'pending', '2022-10-05', '2022-10-05 09:35:05'),
  (5378320, 13185676, '0027', 'Credit for damage', NULL, NULL, -1000.00, 'pending', '2022-10-05', '2022-10-05 10:10:46'),
  (5380322, 13448673, '0011', 'Front Column Pot Planting', 'Succulent planting for (4) pots in the Front Yard', NULL, 475.00, 'sold', '2022-10-05', '2022-10-05 15:21:52'),
  (5380412, 13185676, '0029', 'Credit for 1 transformer', NULL, NULL, -434.00, 'sold', '2022-10-05', '2022-10-05 15:48:38'),
  (5380489, 13185676, '0030', 'Credit for potted plants', NULL, NULL, -65.00, 'sold', '2022-10-05', '2022-10-05 16:19:17'),
  (5382470, 13484698, '0001', '(9) 15 gallon plant removal', NULL, NULL, 1278.00, 'pending', '2022-10-06', '2022-10-06 09:39:05'),
  (5382474, 13484698, '0002', 'Removal of hammock and metal stand', 'No charge!', NULL, 0, 'pending', '2022-10-06', '2022-10-06 09:40:03'),
  (5382482, 13484698, '0003', 'Add (2) 5g Clivia', NULL, NULL, 90.00, 'pending', '2022-10-06', '2022-10-06 09:41:11'),
  (5382484, 13484698, '0004', 'Add one 1/4" drip zone for ground cover at tree', NULL, NULL, 865.00, 'pending', '2022-10-06', '2022-10-06 09:41:42'),
  (5382515, 13484698, '0005', 'Adding 172 SF of Kurapia', '172 SF (mix of pink and white kurapia)', NULL, 1032.00, 'pending', '2022-10-06', '2022-10-06 09:46:19'),
  (5382577, 13484698, '0006', '(15g) phoenix robellini palm', 'For area near pool equipment', NULL, 360.00, 'pending', '2022-10-06', '2022-10-06 09:53:50'),
  (5383417, 14251083, '0001', '3 pilaster wraps @ $645.00', NULL, NULL, 1935.00, 'pending', '2022-10-06', '2022-10-06 11:58:46'),
  (5383474, 14306877, '0003', 'Stump grind', NULL, NULL, 300.00, 'sold', '2022-10-06', '2022-10-06 12:07:13'),
  (5385048, 13185676, '0031', 'CC 3%', NULL, NULL, 26.23, 'pending', '2022-10-06', '2022-10-06 17:39:17'),
  (5387248, 14251083, '0002', '63 additional sf pavers', 'Additional pavers.', NULL, 903.00, 'pending', '2022-10-07', '2022-10-07 11:20:30'),
  (5387283, 14251083, '0003', 'Del Rio Rock', '2)  To add the 2 planters 2X240= 480 X $5.50= $2,640.00- Demo in contract $936.00= $1,704.00 (we can throw rock on the side of the walkway going back, with any overage)', NULL, 1704.00, 'sold', '2022-10-07', '2022-10-07 11:26:03'),
  (5387848, 10713700, '0010', 'Rock Uograde', 'White pebble cost upgrade', NULL, 2845.00, 'pending', '2022-10-07', '2022-10-07 13:05:54'),
  (5387863, 13448673, '0012', 'Rock Cost Upgrade', 'Rock cost upgrade to original scope of work', NULL, 2845.00, 'sold', '2022-10-07', '2022-10-07 13:08:24'),
  (5388143, 13469272, '0022', 'String Light and Anchor Pole Installation', NULL, NULL, 760.00, 'sold', '2022-10-07', '2022-10-07 14:12:14'),
  (5388146, 13469272, '0023', '3 extra plants', '(3) 5 gallon shrubs', NULL, 135.00, 'sold', '2022-10-07', '2022-10-07 14:13:14'),
  (5388234, 14214494, '0001', 'Additional Paver Pallet', 'Need to order 1 pallet to satisfy sq footage.  There is not enough pavers on hand to complete the extension', NULL, 450.00, 'pending', '2022-10-07', '2022-10-07 14:44:12'),
  (5388241, 14214494, '0002', 'Coping repair', 'Replace coping and various pavers that have old fence posts and plugs around the pool', NULL, 1100.00, 'pending', '2022-10-07', '2022-10-07 14:46:39'),
  (5392315, 14145921, '0008', 'Credit for outdoor outlet', 'This outlet was not necessary', NULL, -175.00, 'sold', '2022-10-10', '2022-10-10 13:44:36'),
  (5395254, 14214494, '0003', 'Brick demo for pavers', 'Brick border re alignment', NULL, 200.00, 'pending', '2022-10-11', '2022-10-11 10:03:01');

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

  RAISE NOTICE 'Batch 3 of 5 complete — Imported: %, Already-imported: %, No matching job: %',
    v_imported, v_dup, v_no_job;
END $$;

COMMIT;
