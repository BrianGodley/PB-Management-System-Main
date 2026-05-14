-- ============================================================
-- v2 BT todos → PBS job_tasks — Batch 3 of 5
-- 1,707 todos (rows 3415-5121 of 8,535)
-- Idempotent via bt_todo_id (unique partial index).
-- For each todo: look up the job by bt_job_id, try to match the BT
-- assignee_name to an active employee (case-insensitive, strips BT
-- prefixes like '(.PM) ' and '(HR) '), insert one job_tasks row.
-- ============================================================

BEGIN;

CREATE TEMP TABLE _todo_staging (
  bt_todo_id     BIGINT PRIMARY KEY,
  bt_job_id      BIGINT NOT NULL,
  title          TEXT NOT NULL,
  priority       TEXT,
  notes          TEXT,
  due_date       DATE,
  completed_at   TIMESTAMPTZ,
  completed_by   TEXT,
  assignee_name  TEXT
) ON COMMIT DROP;

INSERT INTO _todo_staging (bt_todo_id, bt_job_id, title, priority, notes, due_date, completed_at, completed_by, assignee_name) VALUES
  (33702026, 12294179, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (33702027, 12294179, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (33702028, 12294179, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (33704380, 12294709, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (33704381, 12294709, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (33704382, 12294709, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (33794317, 12316198, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (33803736, 12317877, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2022-03-08 07:37:52', 'Brian Godley', NULL),
  (33803737, 12317877, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (33803738, 12317877, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (33909706, 12345938, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2022-03-14 18:10:12', 'Nicole Antoine', NULL),
  (33909707, 12345938, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2022-04-11 16:34:12', 'Nicole Antoine', NULL),
  (33909708, 12345938, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (33930685, 12349538, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (33944797, 12352512, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, '2022-04-28 06:30:24', 'Dana Weinroth', NULL),
  (33959822, 12356705, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (34075403, 12386158, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (34075527, 12386232, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, '2022-04-28 06:30:41', 'Dana Weinroth', NULL),
  (34076215, 12386445, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (34076216, 12386445, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (34076217, 12386445, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (34100466, 12392902, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2022-03-18 09:14:21', 'Nicole Antoine', NULL),
  (34100467, 12392902, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2022-05-18 16:15:17', 'Nicole Antoine', NULL),
  (34100468, 12392902, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (34102520, 12393250, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (34267783, 12436689, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (34295225, 12443656, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (34295226, 12443656, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, NULL, NULL, NULL),
  (34295227, 12443656, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (34314449, 12450063, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (34314517, 12450094, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (34336937, 12456114, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (34336938, 12456114, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (34336939, 12456114, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (34363789, 12462744, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, '2022-05-18 16:15:07', 'Nicole Antoine', NULL),
  (34384164, 12470275, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2022-04-11 16:34:18', 'Nicole Antoine', NULL),
  (34384165, 12470275, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2022-04-11 16:34:20', 'Nicole Antoine', NULL),
  (34384166, 12470275, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (34415839, 12478911, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2022-04-04 10:38:49', 'Brian Godley', NULL),
  (34415840, 12478911, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (34415841, 12478911, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (34444112, 12486139, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (34471917, 12496570, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, '2022-04-22 15:50:22', 'Nicole Antoine', NULL),
  (34499131, 12503252, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, '2022-04-28 06:30:38', 'Dana Weinroth', NULL),
  (34499205, 12503291, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2022-03-29 08:46:10', 'Dana Weinroth', NULL),
  (34499206, 12503291, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, NULL, NULL, NULL),
  (34499207, 12503291, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (34508103, 12505937, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2022-04-08 12:42:55', 'Dana Weinroth', NULL),
  (34508104, 12505937, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (34508105, 12505937, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (34508626, 12506017, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2022-04-15 11:52:26', 'Verva Gerse', NULL),
  (34508627, 12506017, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, NULL, NULL, NULL),
  (34508628, 12506017, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (34628037, 12537035, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2022-04-11 17:00:23', 'Verva Gerse', NULL),
  (34628038, 12537035, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2022-11-21 10:49:00', 'Kimberly Uriarte', NULL),
  (34628039, 12537035, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2022-11-21 10:49:01', 'Kimberly Uriarte', NULL),
  (34666491, 12546043, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (34701646, 12555206, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, '2022-04-28 06:30:17', 'Dana Weinroth', NULL),
  (34740368, 12478911, 'Veneer Selection.  Turf Confirmation', NULL, 'Confirm Turf for Driveway', NULL, NULL, NULL, NULL),
  (34761944, 12569123, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (34860460, 12598353, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2022-04-08 10:44:56', 'Brian Godley', NULL),
  (34860461, 12598353, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2022-05-18 16:15:41', 'Nicole Antoine', NULL),
  (34860462, 12598353, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2022-11-08 14:23:43', 'Nicole Antoine', '(.PM) Jorge Flores'),
  (34898427, 12606892, 'all doc uploaded', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2022-05-07 10:25:20', 'Verva Gerse', NULL),
  (34898428, 12606892, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (34898429, 12606892, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (34905748, 12608924, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2022-04-12 16:52:16', 'Nicole Antoine', NULL),
  (34905749, 12608924, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, '2022-05-18 16:15:58', 'Nicole Antoine', NULL),
  (34905750, 12608924, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (34914878, 12611577, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2022-04-15 11:51:26', 'Verva Gerse', NULL),
  (34914879, 12611577, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, NULL, NULL, NULL),
  (34914880, 12611577, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (34975085, 12629415, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2022-04-12 08:21:45', 'Dana Weinroth', NULL),
  (34975086, 12629415, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (34975087, 12629415, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (35078208, 12651492, 'Sales Prep done', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2022-04-14 21:29:14', 'Verva Gerse', NULL),
  (35078209, 12651492, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, NULL, NULL, NULL),
  (35078210, 12651492, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (35095188, 12655622, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (35095189, 12655622, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, NULL, NULL, NULL),
  (35095190, 12655622, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (35096104, 12655877, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (35103997, 12658133, 'Sales Prep', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2022-04-14 21:02:49', 'Verva Gerse', NULL),
  (35103998, 12658133, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (35103999, 12658133, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (35133839, 12665841, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2022-04-17 00:45:11', 'Nicole Antoine', NULL),
  (35133840, 12665841, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2022-05-18 16:15:31', 'Nicole Antoine', NULL),
  (35133841, 12665841, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (35157939, 12672375, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (35163042, 12674136, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (35172414, 12677552, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (35173073, 12677700, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (35281002, 12709452, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, '2022-05-18 16:15:01', 'Nicole Antoine', NULL),
  (35302393, 12715459, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2022-04-25 11:54:27', 'Dana Weinroth', NULL),
  (35302394, 12715459, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (35302395, 12715459, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (35320418, 12723437, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (35326889, 12727257, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2022-04-25 07:19:24', 'Brian Godley', NULL),
  (35326890, 12727257, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2022-05-18 16:15:52', 'Nicole Antoine', NULL),
  (35326891, 12727257, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (35331326, 12728869, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2022-05-24 11:44:29', 'Verva Gerse', NULL),
  (35331327, 12728869, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, NULL, NULL, NULL),
  (35331328, 12728869, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (35331395, 12728917, 'docs uploaded', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (35331396, 12728917, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, '2022-05-09 22:45:33', 'Verva Gerse', NULL),
  (35331397, 12728917, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (35331412, 12728944, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2022-06-10 08:21:56', 'Brian Godley', NULL),
  (35331413, 12728944, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (35331414, 12728944, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (35355629, 12736288, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2022-04-25 11:17:48', 'Dana Weinroth', NULL),
  (35355630, 12736288, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2022-11-21 10:34:04', 'Kimberly Uriarte', NULL),
  (35355631, 12736288, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2022-11-21 10:30:36', 'Kimberly Uriarte', NULL),
  (35359614, 12737333, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2022-04-28 06:28:49', 'Dana Weinroth', NULL),
  (35359615, 12737333, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (35359616, 12737333, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (35445234, 12762663, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2022-06-07 13:25:18', 'Verva Gerse', NULL),
  (35445235, 12762663, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (35445236, 12762663, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (35509598, 12781862, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2022-05-06 10:53:04', 'Dana Weinroth', NULL),
  (35509599, 12781862, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2022-12-05 15:26:24', 'Kimberly Uriarte', NULL),
  (35509600, 12781862, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2022-12-05 15:26:25', 'Kimberly Uriarte', NULL),
  (35565561, 12797585, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (35565562, 12797585, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (35565563, 12797585, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (35622305, 12814623, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (35644173, 12819992, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, '2022-06-03 06:50:30', 'Nicole Antoine', NULL),
  (35677683, 12829114, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2022-05-13 14:37:11', 'Nicole Antoine', NULL),
  (35677684, 12829114, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, '2022-10-18 16:11:49', 'Nicole Antoine', NULL),
  (35677685, 12829114, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2022-11-08 14:23:46', 'Nicole Antoine', NULL),
  (35712967, 12837314, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (35759840, 12852157, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2022-05-13 13:05:54', 'Nicole Antoine', NULL),
  (35759841, 12852157, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2022-06-13 16:54:42', 'Nicole Antoine', NULL),
  (35759842, 12852157, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (35759960, 12852203, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2022-07-05 13:15:04', 'Nicole Antoine', NULL),
  (35759961, 12852203, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2022-12-05 12:42:08', 'Nicole Antoine', NULL),
  (35759962, 12852203, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2023-01-17 12:58:28', 'Nicole Antoine', '(.PM) Jorge Flores'),
  (35785255, 12859486, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (35785256, 12859486, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, NULL, NULL, NULL),
  (35785257, 12859486, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (35815555, 12867236, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (35950717, 12905571, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (35950718, 12905571, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (35950719, 12905571, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (35976351, 12917966, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (35977913, 12918412, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2022-06-23 14:34:21', 'Brian Godley', NULL),
  (35977914, 12918412, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (35977915, 12918412, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (35990925, 12921505, '(untitled)', NULL, 'Sales Prep

9. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (35990926, 12921505, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (35990927, 12921505, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (36044438, 12940981, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (36049730, 12942466, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2022-05-18 16:21:40', 'Nicole Antoine', NULL),
  (36049731, 12942466, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (36049732, 12942466, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (36052849, 12943226, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2022-05-20 15:54:52', 'Dana Weinroth', NULL),
  (36052850, 12943226, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2022-11-21 10:48:42', 'Kimberly Uriarte', NULL),
  (36052851, 12943226, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2022-11-21 10:48:43', 'Kimberly Uriarte', NULL),
  (36064454, 12947486, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2022-05-23 12:20:54', 'Brian Godley', NULL),
  (36064455, 12947486, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (36064456, 12947486, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (36143794, 12968302, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, '2022-07-05 13:13:48', 'Nicole Antoine', NULL),
  (36170973, 12974008, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (36197515, 12979003, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2022-05-31 12:40:01', 'Nicole Antoine', NULL),
  (36197516, 12979003, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, '2022-07-28 22:37:17', 'Nicole Antoine', NULL),
  (36197517, 12979003, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (36280904, 13001667, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, '2023-01-17 12:58:22', 'Nicole Antoine', NULL),
  (36354309, 13022023, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (36398045, 13034099, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (36427458, 13043432, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (36496907, 13063363, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(2.5 Sales Review)"', NULL, '2022-06-06 12:02:19', 'Nicole Antoine', NULL),
  (36496908, 13063363, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2022-07-05 13:14:43', 'Nicole Antoine', NULL),
  (36496909, 13063363, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2022-11-08 14:23:27', 'Nicole Antoine', NULL),
  (36505600, 13065764, 'Sales Prep', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2022-06-09 07:44:26', 'Brian Godley', NULL),
  (36505601, 13065764, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (36505602, 13065764, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (36603240, 13094411, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (36622189, 13099574, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2022-12-05 15:13:37', 'Kimberly Uriarte', NULL),
  (36622190, 13099574, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2022-12-05 15:13:38', 'Kimberly Uriarte', NULL),
  (36622191, 13099574, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2022-12-05 15:13:38', 'Kimberly Uriarte', NULL),
  (36668391, 13112275, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2022-12-05 15:13:05', 'Kimberly Uriarte', NULL),
  (36668392, 13112275, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2022-12-05 15:13:07', 'Kimberly Uriarte', NULL),
  (36668393, 13112275, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2022-12-05 15:13:06', 'Kimberly Uriarte', NULL),
  (36682063, 13115348, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (36682064, 13115348, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, NULL, NULL, NULL),
  (36682065, 13115348, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (36695193, 13118589, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (36703379, 13120554, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2022-11-21 10:32:11', 'Kimberly Uriarte', NULL),
  (36703380, 13120554, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2022-11-21 10:32:14', 'Kimberly Uriarte', NULL),
  (36703381, 13120554, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2022-11-21 10:32:12', 'Kimberly Uriarte', NULL),
  (36713917, 13123072, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (36713918, 13123072, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, NULL, NULL, NULL),
  (36713919, 13123072, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (36715112, 13123257, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2022-12-05 15:18:15', 'Kimberly Uriarte', NULL),
  (36715113, 13123257, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2022-12-05 15:18:16', 'Kimberly Uriarte', NULL),
  (36715114, 13123257, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2022-12-05 15:18:15', 'Kimberly Uriarte', NULL),
  (36716198, 13123534, '(untitled)', NULL, 'Sales Prep

-', NULL, '2022-11-21 10:42:02', 'Kimberly Uriarte', NULL),
  (36716199, 13123534, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2022-11-21 10:42:04', 'Kimberly Uriarte', NULL),
  (36716200, 13123534, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2022-11-21 10:42:03', 'Kimberly Uriarte', NULL),
  (36719224, 13124167, '(untitled)', NULL, 'Sales Prep

11.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (36719225, 13124167, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (36719226, 13124167, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (36721879, 13124865, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (36721891, 13124867, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (36721904, 13124870, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (36741996, 13131461, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, '2022-11-08 14:23:37', 'Nicole Antoine', NULL),
  (36747316, 13132492, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2022-06-20 15:00:11', 'Dana Weinroth', NULL),
  (36747317, 13132492, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (36747318, 13132492, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (36760022, 13136058, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (36760023, 13136058, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (36760024, 13136058, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (36780042, 13140541, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (36780886, 13140750, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (36781396, 13140912, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (36781452, 13140948, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (36781768, 13141042, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (36795144, 13144178, '(untitled)', NULL, 'Sales Prep

-', NULL, '2022-12-05 15:14:05', 'Kimberly Uriarte', NULL),
  (36795145, 13144178, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2022-12-05 15:14:07', 'Kimberly Uriarte', NULL),
  (36795146, 13144178, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2022-12-05 15:14:06', 'Kimberly Uriarte', NULL),
  (36800343, 13145316, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (36853493, 13159914, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, '2022-07-05 13:13:56', 'Nicole Antoine', NULL),
  (36853562, 13159934, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (36853563, 13159934, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, NULL, NULL, NULL),
  (36853564, 13159934, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (36865527, 13162971, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2022-06-29 07:58:54', 'Nicole Antoine', NULL),
  (36865528, 13162971, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2022-07-28 22:37:09', 'Nicole Antoine', NULL),
  (36865529, 13162971, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2022-11-16 18:53:02', 'Nicole Antoine', NULL),
  (36956610, 13185676, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2022-08-17 12:51:51', 'Brian Godley', NULL),
  (36956611, 13185676, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (36956612, 13185676, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (37070672, 13221104, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, '2022-11-08 14:20:17', 'Nicole Antoine', NULL),
  (37098973, 13229565, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (37098974, 13229565, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (37098975, 13229565, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (37150324, 13243040, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (37150325, 13243040, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (37150326, 13243040, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (37220327, 13262395, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (37220328, 13262395, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (37220329, 13262395, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (37307515, 13283498, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2022-07-11 11:20:44', 'Dana Weinroth', NULL),
  (37307516, 13283498, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (37307517, 13283498, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (37311029, 13284495, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, '2022-12-05 12:42:16', 'Nicole Antoine', NULL),
  (37372282, 13299080, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (37372351, 13299088, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (37478904, 13330004, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2022-07-13 17:37:45', 'Nicole Antoine', NULL),
  (37478905, 13330004, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, '2022-10-18 16:11:15', 'Nicole Antoine', NULL),
  (37478906, 13330004, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2023-03-08 18:14:13', 'Nicole Antoine', NULL),
  (37522643, 13344765, '(untitled)', NULL, 'Sales Prep

-', NULL, NULL, NULL, NULL),
  (37522644, 13344765, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (37522645, 13344765, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (37576755, 13359468, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (37680214, 13390002, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, '2022-07-28 22:37:29', 'Nicole Antoine', NULL),
  (37758586, 13417357, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2022-07-28 22:36:36', 'Nicole Antoine', NULL),
  (37758587, 13417357, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2022-10-18 16:11:43', 'Nicole Antoine', NULL),
  (37758588, 13417357, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2022-11-16 18:53:08', 'Nicole Antoine', NULL),
  (37795703, 13426396, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (37803750, 13429804, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (37803751, 13429804, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, NULL, NULL, NULL),
  (37803752, 13429804, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (37805791, 13430201, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (37805792, 13430201, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (37805793, 13430201, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (37818832, 13433560, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2022-08-15 12:01:36', 'Dana Weinroth', NULL),
  (37818833, 13433560, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2022-12-05 15:23:01', 'Kimberly Uriarte', NULL),
  (37818834, 13433560, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2022-12-05 15:23:06', 'Kimberly Uriarte', NULL),
  (37835652, 13440096, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, '2023-01-17 12:58:14', 'Nicole Antoine', NULL),
  (37836571, 13440383, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2022-07-28 07:35:08', 'Brian Godley', NULL),
  (37836572, 13440383, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2022-12-05 15:13:47', 'Kimberly Uriarte', NULL),
  (37836573, 13440383, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2022-12-05 15:13:49', 'Kimberly Uriarte', NULL),
  (37865292, 13448673, '(untitled)', NULL, 'Sales Prep

8. Material notes entered and a Material Selection To-Do List created.', NULL, '2022-12-05 15:18:43', 'Kimberly Uriarte', NULL),
  (37865293, 13448673, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2022-12-05 15:18:45', 'Kimberly Uriarte', NULL),
  (37865294, 13448673, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2022-12-05 15:18:44', 'Kimberly Uriarte', NULL),
  (37901911, 13458644, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2022-11-21 10:36:23', 'Kimberly Uriarte', NULL),
  (37901912, 13458644, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, '2022-11-21 10:36:25', 'Kimberly Uriarte', NULL),
  (37901913, 13458644, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2022-11-21 10:36:24', 'Kimberly Uriarte', NULL),
  (37912195, 13461543, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2022-07-28 22:37:04', 'Nicole Antoine', NULL),
  (37912196, 13461543, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, '2022-11-08 14:21:43', 'Nicole Antoine', NULL),
  (37912197, 13461543, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2022-11-08 14:21:43', 'Nicole Antoine', NULL),
  (37942181, 13469272, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2022-08-02 11:52:20', 'Dana Weinroth', NULL),
  (37942182, 13469272, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (37942183, 13469272, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (37948118, 13471035, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2022-07-28 22:36:59', 'Nicole Antoine', NULL),
  (37948119, 13471035, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2022-11-08 14:22:02', 'Nicole Antoine', NULL),
  (37948120, 13471035, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2022-11-08 14:24:22', 'Nicole Antoine', NULL),
  (37973490, 13484698, '(untitled)', NULL, 'Sales Prep

-', NULL, '2022-07-28 22:36:40', 'Nicole Antoine', NULL),
  (37973491, 13484698, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, '2022-10-18 16:11:38', 'Nicole Antoine', NULL),
  (37973492, 13484698, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2022-11-16 18:53:18', 'Nicole Antoine', NULL),
  (38025013, 13525947, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2022-08-05 13:48:26', 'Dana Weinroth', NULL),
  (38025014, 13525947, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2022-11-21 10:46:52', 'Kimberly Uriarte', NULL),
  (38025015, 13525947, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2022-11-21 10:46:53', 'Kimberly Uriarte', NULL),
  (38060493, 13532738, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (38123427, 13544767, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (38164354, 13553195, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (38165151, 13553553, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (38227662, 13565942, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, '2022-11-08 14:21:43', 'Nicole Antoine', NULL),
  (38298927, 13581217, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, '2022-10-18 16:10:54', 'Nicole Antoine', NULL),
  (38385350, 13595901, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (38388907, 13596459, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (38389984, 13597025, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (38408150, 13601376, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (38408151, 13601376, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (38408152, 13601376, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (38434681, 13607123, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2022-08-10 15:25:45', 'Dana Weinroth', NULL),
  (38434682, 13607123, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, '2022-11-21 10:33:29', 'Kimberly Uriarte', NULL),
  (38434683, 13607123, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2022-11-21 10:33:30', 'Kimberly Uriarte', NULL),
  (38565482, 13636900, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (38603222, 13643594, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (38603223, 13643594, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (38603224, 13643594, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (38606250, 13644428, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2022-08-31 16:09:12', 'Nicole Antoine', NULL),
  (38606251, 13644428, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2022-08-31 16:09:15', 'Nicole Antoine', NULL),
  (38606252, 13644428, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2022-11-16 18:53:16', 'Nicole Antoine', NULL),
  (38688340, 13665601, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (38800492, 13692728, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (38806914, 13694182, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, '2022-11-08 14:21:43', 'Nicole Antoine', NULL),
  (38842980, 13703376, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (38842981, 13703376, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (38842982, 13703376, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (38849033, 13705283, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (38901706, 13718259, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2022-08-31 07:49:07', 'Dana Weinroth', NULL),
  (38901707, 13718259, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2022-12-05 15:19:02', 'Kimberly Uriarte', NULL),
  (38901708, 13718259, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2022-12-05 15:19:03', 'Kimberly Uriarte', NULL),
  (38919894, 13724617, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, '2022-12-05 12:42:21', 'Nicole Antoine', NULL),
  (38971202, 13748809, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (38971203, 13748809, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (38971204, 13748809, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (38989846, 13757170, 'to do complete', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2022-08-29 18:51:07', 'Verva Gerse', NULL),
  (38989847, 13757170, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2022-12-05 15:22:54', 'Kimberly Uriarte', NULL),
  (38989848, 13757170, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2022-12-05 15:22:55', 'Kimberly Uriarte', NULL),
  (38989872, 13757191, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2022-08-31 08:26:31', 'Dana Weinroth', NULL),
  (38989873, 13757191, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2022-12-05 15:13:17', 'Kimberly Uriarte', NULL),
  (38989874, 13757191, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2022-12-05 15:13:18', 'Kimberly Uriarte', NULL),
  (38989881, 13757197, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (39053947, 13939548, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2022-08-30 08:28:06', 'Brian Godley', NULL),
  (39053948, 13939548, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (39053949, 13939548, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (39079370, 13595901, 'Yard design', NULL, 'Jason is working on it', NULL, NULL, NULL, 'Alison Bosdet'),
  (39185557, 14013643, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2022-12-05 15:17:36', 'Kimberly Uriarte', NULL),
  (39185558, 14013643, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, '2022-12-05 15:17:38', 'Kimberly Uriarte', NULL),
  (39185559, 14013643, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2022-12-05 15:17:37', 'Kimberly Uriarte', NULL),
  (39185594, 14013680, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (39185595, 14013680, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (39185596, 14013680, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (39196604, 14019873, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2022-10-18 16:11:25', 'Nicole Antoine', NULL),
  (39196605, 14019873, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, '2022-10-18 16:12:09', 'Nicole Antoine', NULL),
  (39196606, 14019873, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2022-11-16 18:53:21', 'Nicole Antoine', NULL),
  (39237459, 14040190, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (39290319, 14069657, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2022-09-12 10:28:29', 'Oscar Garcia', NULL),
  (39290320, 14069657, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2022-12-05 12:42:24', 'Nicole Antoine', NULL),
  (39290321, 14069657, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (39290670, 14069928, '(untitled)', NULL, 'Sales Prep

-', NULL, '2022-10-03 19:26:36', 'Dana Weinroth', NULL),
  (39290671, 14069928, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (39290672, 14069928, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (39341300, 14097528, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (39341311, 14097539, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (39341334, 14097566, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (39341350, 14097579, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (39378354, 14116040, '(untitled)', NULL, 'Sales Prep

-', NULL, '2022-10-03 20:22:49', 'Dana Weinroth', NULL),
  (39378355, 14116040, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (39378356, 14116040, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (39383128, 14118441, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (39383129, 14118441, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, NULL, NULL, NULL),
  (39383130, 14118441, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (39397657, 14124510, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (39402770, 14130454, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (39403111, 14130595, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (39403357, 14130651, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (39441009, 14145921, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2022-09-15 15:49:17', 'Nicole Antoine', NULL),
  (39441010, 14145921, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2022-10-18 16:11:30', 'Nicole Antoine', NULL),
  (39441011, 14145921, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2022-11-16 18:53:27', 'Nicole Antoine', NULL),
  (39472093, 14157948, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2022-09-20 09:38:19', 'Verva Gerse', NULL),
  (39472094, 14157948, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2022-12-05 15:18:36', 'Kimberly Uriarte', NULL),
  (39472095, 14157948, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2022-12-05 15:18:37', 'Kimberly Uriarte', NULL),
  (39511133, 14175746, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2022-09-19 09:03:20', 'Dana Weinroth', NULL),
  (39511134, 14175746, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (39511135, 14175746, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (39536768, 14190068, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (39537144, 14190401, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2022-09-30 19:06:42', 'Dana Weinroth', NULL),
  (39537145, 14190401, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, NULL, NULL, NULL),
  (39537146, 14190401, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (39574464, 14212852, '(untitled)', NULL, 'Sales Prep

-', NULL, '2022-12-05 15:14:52', 'Kimberly Uriarte', NULL),
  (39574465, 14212852, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2022-12-05 15:14:53', 'Kimberly Uriarte', NULL),
  (39574466, 14212852, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2022-12-05 15:14:52', 'Kimberly Uriarte', NULL),
  (39577888, 14214494, '(untitled)', NULL, 'Sales Prep

8. Material notes entered and a Material Selection To-Do List created.', NULL, '2022-09-19 12:18:56', 'Brian Godley', NULL),
  (39577889, 14214494, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, NULL, NULL, NULL),
  (39577890, 14214494, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (39594568, 14223995, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, '2022-11-08 14:24:02', 'Nicole Antoine', NULL),
  (39635763, 14251083, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2022-10-12 19:22:19', 'Verva Gerse', NULL),
  (39635764, 14251083, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, NULL, NULL, NULL),
  (39635765, 14251083, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (39636072, 14251149, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2022-10-12 19:22:07', 'Verva Gerse', NULL),
  (39636073, 14251149, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, NULL, NULL, NULL),
  (39636074, 14251149, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (39665596, 14269718, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (39698434, 14286812, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (39740216, 14306865, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (39740244, 14306877, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2022-12-05 15:18:29', 'Kimberly Uriarte', NULL),
  (39740245, 14306877, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2022-12-05 15:18:31', 'Kimberly Uriarte', NULL),
  (39740246, 14306877, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2022-12-05 15:18:30', 'Kimberly Uriarte', NULL),
  (39740273, 14306893, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2022-12-05 15:12:53', 'Kimberly Uriarte', NULL),
  (39740274, 14306893, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2022-12-05 15:12:48', 'Kimberly Uriarte', NULL),
  (39740275, 14306893, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2022-12-05 15:12:46', 'Kimberly Uriarte', NULL),
  (39795261, 14359777, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2022-10-03 08:45:51', 'Dana Weinroth', NULL),
  (39795262, 14359777, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, '2022-12-05 15:18:22', 'Kimberly Uriarte', NULL),
  (39795263, 14359777, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2022-12-05 15:18:24', 'Kimberly Uriarte', NULL),
  (39805711, 14364138, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2022-09-29 18:32:28', 'Nicole Antoine', NULL),
  (39805712, 14364138, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, '2022-11-16 18:53:29', 'Nicole Antoine', NULL),
  (39805713, 14364138, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2022-11-16 18:53:31', 'Nicole Antoine', NULL),
  (39821931, 14384853, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (39821932, 14384853, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (39821933, 14384853, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (39854305, 14400759, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (39881708, 14412273, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2022-12-05 15:13:29', 'Kimberly Uriarte', NULL),
  (39881709, 14412273, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2022-12-05 15:13:30', 'Kimberly Uriarte', NULL),
  (39881710, 14412273, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2022-12-05 15:13:29', 'Kimberly Uriarte', NULL),
  (39918773, 14495275, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (39924406, 14497804, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (40006834, 14543494, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2022-10-12 19:21:34', 'Verva Gerse', NULL),
  (40006835, 14543494, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2022-12-05 15:18:00', 'Kimberly Uriarte', NULL),
  (40006836, 14543494, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2022-12-05 15:18:01', 'Kimberly Uriarte', NULL),
  (40007330, 14543909, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (40011351, 14546089, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (40011352, 14546089, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (40011353, 14546089, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (40034166, 14557511, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (40034167, 14557511, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (40034168, 14557511, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (40063239, 14574506, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (40075697, 14584341, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2022-11-03 08:27:45', 'Brian Godley', NULL),
  (40075698, 14584341, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (40075699, 14584341, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (40075704, 14584343, '(untitled)', NULL, 'Sales Prep

9. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (40075705, 14584343, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (40075706, 14584343, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (40093907, 14594286, '(untitled)', NULL, 'Sales Prep

-', NULL, NULL, NULL, NULL),
  (40093908, 14594286, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, NULL, NULL, NULL),
  (40093909, 14594286, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (40104230, 14606481, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2022-10-12 19:21:10', 'Verva Gerse', NULL),
  (40104231, 14606481, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (40104232, 14606481, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (40104382, 14606518, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (40113761, 14610279, '(untitled)', NULL, 'Sales Prep

11.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2022-12-05 15:19:14', 'Kimberly Uriarte', NULL),
  (40113762, 14610279, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, '2022-12-05 15:19:16', 'Kimberly Uriarte', NULL),
  (40113763, 14610279, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2022-12-05 15:19:15', 'Kimberly Uriarte', NULL),
  (40146749, 14628167, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (40146750, 14628167, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (40146751, 14628167, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (40220436, 14670464, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (40220437, 14670464, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, '2022-10-18 06:53:39', 'Brian McBride', NULL),
  (40220438, 14670464, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (40250245, 14688331, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2022-12-05 15:17:47', 'Kimberly Uriarte', NULL),
  (40250246, 14688331, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, '2022-12-05 15:17:48', 'Kimberly Uriarte', NULL),
  (40250247, 14688331, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2022-12-05 15:17:48', 'Kimberly Uriarte', NULL),
  (40318615, 14816354, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (40318616, 14816354, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, NULL, NULL, NULL),
  (40318617, 14816354, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (40339485, 14828337, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2022-10-25 15:54:37', 'Nicole Antoine', NULL),
  (40339486, 14828337, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2022-11-16 18:53:33', 'Nicole Antoine', NULL),
  (40339487, 14828337, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (40343742, 14830732, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (40343743, 14830732, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, NULL, NULL, NULL),
  (40343744, 14830732, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (40352255, 14835518, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (40352256, 14835518, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (40352257, 14835518, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (40353265, 14835589, '(untitled)', NULL, 'Sales Prep

11.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (40353266, 14835589, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (40353267, 14835589, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (40419097, 14835589, 'Plant Selection', NULL, 'Need to find out which type of plants we are going to install.', '2022-10-24', NULL, NULL, NULL),
  (40490224, 14903451, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2022-11-16 18:53:39', 'Nicole Antoine', NULL),
  (40490225, 14903451, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2022-11-16 18:53:41', 'Nicole Antoine', NULL),
  (40490226, 14903451, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2022-11-16 18:53:43', 'Nicole Antoine', NULL),
  (40501524, 15002047, '(untitled)', NULL, 'Sales Prep

10.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (40501525, 15002047, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (40501526, 15002047, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (40522433, 15010072, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2022-12-05 15:17:53', 'Kimberly Uriarte', NULL),
  (40522434, 15010072, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, '2022-12-05 15:17:55', 'Kimberly Uriarte', NULL),
  (40522435, 15010072, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2022-12-05 15:17:54', 'Kimberly Uriarte', NULL),
  (40524364, 15010993, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (40535033, 15017926, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (40535034, 15017926, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (40535035, 15017926, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (40593702, 15047432, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (40593703, 15047432, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, NULL, NULL, NULL),
  (40593704, 15047432, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (40595538, 15047880, '(untitled)', NULL, 'Sales Prep

10.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (40595539, 15047880, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (40595540, 15047880, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (40602184, 15051229, '(untitled)', NULL, 'Sales Prep

11.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (40602185, 15051229, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (40602186, 15051229, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (40621252, 15061122, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2022-12-05 15:16:09', 'Kimberly Uriarte', NULL),
  (40621253, 15061122, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, '2022-12-05 15:16:11', 'Kimberly Uriarte', NULL),
  (40621254, 15061122, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2022-12-05 15:16:10', 'Kimberly Uriarte', NULL),
  (40623385, 15062246, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (40623386, 15062246, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (40623387, 15062246, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (40656398, 15081968, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (40737367, 17931081, '(untitled)', NULL, 'Sales Prep

8. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (40737368, 17931081, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (40737369, 17931081, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (40756974, 17944004, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2022-11-16 18:54:03', 'Nicole Antoine', NULL),
  (40756975, 17944004, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, '2023-05-01 14:26:28', 'Nicole Antoine', NULL),
  (40756976, 17944004, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (40765753, 17948081, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (40765754, 17948081, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (40765755, 17948081, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (40772600, 15047880, 'Materials', NULL, '1 gallon

Quantity 7- Little sur manzanita
Quantity 4- Firecracker penstemon
Quantity 3- Red Daylily
Quantity 1- Arroyo Azul Cleveland Sage


Quantity 4- Hybrid Tea Rose
Quantity 2- Dwarf Gardenia 
Quantity 3- Kimono Canzonetta Azalea
Quantity 4- Pink Princess Escallonia 
Quantity 1- Pittosporum shrub
Quantity 4- Society Garlic

Standard Flats
Quantity 6- Rupturewort groundcover


Boulders

Quantity 3- Granite 2 head', NULL, NULL, NULL, NULL),
  (40772668, 17951818, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2022-11-07 18:10:22', 'Dana Weinroth', NULL),
  (40772669, 17951818, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (40772670, 17951818, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (40808892, 17970867, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (40808893, 17970867, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (40808894, 17970867, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (40809702, 17971182, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (40809703, 17971182, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (40809704, 17971182, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (40809766, 17971252, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (40809767, 17971252, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, NULL, NULL, NULL),
  (40809768, 17971252, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (40891028, 18020293, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (40904479, 18028480, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (40904641, 18028569, 'Need permit curb core', NULL, 'Sales Prep, not complete, need core and apron permit, Verva to expedite

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (40904642, 18028569, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (40904643, 18028569, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (40927533, 18040699, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (40927534, 18040699, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (40927535, 18040699, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (40965290, 18063840, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, '2022-11-21 10:48:23', 'Kimberly Uriarte', NULL),
  (40965573, 18063939, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (40965574, 18063939, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (40965575, 18063939, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (40965687, 18063952, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (40965688, 18063952, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (40965689, 18063952, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (41034601, 18102006, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2022-11-23 13:32:48', 'Dana Weinroth', NULL),
  (41034602, 18102006, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, NULL, NULL, NULL),
  (41034603, 18102006, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (41040219, 18104170, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (41040400, 18104203, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (41067989, 18116724, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (41067990, 18116724, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (41067991, 18116724, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (41068243, 18116921, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2022-12-02 12:28:41', 'Dana Weinroth', NULL),
  (41068244, 18116921, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (41068245, 18116921, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (41083121, 18130814, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, '2023-01-31 19:37:52', 'Nicole Antoine', NULL),
  (41088336, 18133765, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2022-12-05 12:42:33', 'Nicole Antoine', NULL),
  (41088337, 18133765, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2023-01-17 12:58:50', 'Nicole Antoine', NULL),
  (41088338, 18133765, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2023-01-17 12:58:50', 'Nicole Antoine', NULL),
  (41099774, 18139870, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (41099775, 18139870, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (41099776, 18139870, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (41130565, 18160239, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (41130566, 18160239, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (41130567, 18160239, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (41130881, 18160323, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2022-11-23 16:13:42', 'Dana Weinroth', NULL),
  (41130882, 18160323, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, NULL, NULL, NULL),
  (41130883, 18160323, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (41170858, 18189451, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (41170859, 18189451, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (41170860, 18189451, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (41171186, 18189601, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (41171187, 18189601, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, NULL, NULL, NULL),
  (41171188, 18189601, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (41180659, 18194555, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (41180660, 18194555, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (41180661, 18194555, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (41183373, 18195455, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2022-11-28 11:55:09', 'Verva Gerse', NULL),
  (41183374, 18195455, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (41183375, 18195455, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (41202611, 18217034, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (41223709, 18226736, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2022-11-28 11:54:51', 'Verva Gerse', NULL),
  (41223710, 18226736, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (41223711, 18226736, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (41229598, 18229619, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (41229599, 18229619, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (41229600, 18229619, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (41288486, 26864979, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2022-12-02 15:53:12', 'Dana Weinroth', NULL),
  (41288487, 26864979, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, NULL, NULL, NULL),
  (41288488, 26864979, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (41319659, 26879394, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (41327363, 26883189, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2023-01-17 12:58:50', 'Nicole Antoine', NULL),
  (41327364, 26883189, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2023-01-17 12:58:50', 'Nicole Antoine', NULL),
  (41327365, 26883189, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (41347431, 26890979, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (41353277, 26894670, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (41391656, 26913236, '(untitled)', NULL, 'Sales Prep

-', NULL, NULL, NULL, NULL),
  (41391657, 26913236, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, NULL, NULL, NULL),
  (41391658, 26913236, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (41461600, 26949840, '(untitled)', NULL, 'Sales Prep

-', NULL, '2025-09-10 17:48:19', '(.PM) Carter Godley', NULL),
  (41461601, 26949840, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2025-09-10 17:48:17', '(.PM) Carter Godley', NULL),
  (41461602, 26949840, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2025-09-30 14:16:00', 'Brian Godley', NULL),
  (41601765, 27119189, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (41677898, 27159351, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2023-01-24 12:56:47', 'Nicole Antoine', NULL),
  (41677899, 27159351, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, '2023-05-01 14:26:32', 'Nicole Antoine', NULL),
  (41677900, 27159351, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (41705814, 27174801, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2022-12-21 12:42:11', 'Verva Gerse', NULL),
  (41705815, 27174801, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (41705816, 27174801, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (41763269, 27291924, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (41763270, 27291924, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, NULL, NULL, NULL),
  (41763271, 27291924, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (41804851, 27315145, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (41804852, 27315145, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, NULL, NULL, NULL),
  (41804853, 27315145, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (41811356, 27316943, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (41811357, 27316943, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (41811358, 27316943, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (41812216, 27317498, '(untitled)', NULL, 'Sales Prep

-', NULL, NULL, NULL, NULL),
  (41812217, 27317498, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (41812218, 27317498, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (41861735, 27344499, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (41861736, 27344499, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (41861737, 27344499, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (41881057, 27353825, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (41908535, 27369533, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (41908536, 27369533, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (41908537, 27369533, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (41917390, 27375049, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (41917391, 27375049, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, NULL, NULL, NULL),
  (41917392, 27375049, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (41955485, 27395103, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (41955486, 27395103, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (41955487, 27395103, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (42023444, 27438737, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (42096314, 27548250, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (42188497, 27602555, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (42188498, 27602555, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (42188499, 27602555, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (42231209, 27626220, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2023-01-17 18:13:55', 'Dana Weinroth', NULL),
  (42231210, 27626220, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (42231211, 27626220, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (42273622, 27651875, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (42273623, 27651875, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (42273624, 27651875, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (42389525, 27716394, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2023-01-30 16:24:31', 'Verva Gerse', NULL),
  (42389526, 27716394, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, NULL, NULL, NULL),
  (42389527, 27716394, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (42467160, 27770234, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (42467161, 27770234, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (42467162, 27770234, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (42474362, 27773845, '(untitled)', NULL, 'Sales Prep

-', NULL, '2023-01-25 11:25:56', 'Nicole Antoine', NULL),
  (42474363, 27773845, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2023-03-08 18:13:41', 'Nicole Antoine', NULL),
  (42474364, 27773845, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (42521499, 27799214, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (42521500, 27799214, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (42521501, 27799214, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (42558265, 27816112, '(untitled)', NULL, 'Sales Prep

10.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (42558266, 27816112, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (42558267, 27816112, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (42638387, 27863561, '(untitled)', NULL, 'Sales Prep

-', NULL, NULL, NULL, NULL),
  (42638388, 27863561, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (42638389, 27863561, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (42706822, 27905694, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (42706823, 27905694, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (42706824, 27905694, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (42750023, 27929693, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (42764747, 27941145, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (42764748, 27941145, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (42764749, 27941145, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (42833094, 27971242, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (42833095, 27971242, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (42833096, 27971242, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (42915412, 28021570, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, '2023-03-08 18:13:35', 'Nicole Antoine', NULL),
  (42953665, 28044108, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (43015180, 28088578, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (43015283, 28088643, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (43015284, 28088643, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (43015285, 28088643, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (43035244, 28098770, '(untitled)', NULL, 'Sales Prep

10.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (43035245, 28098770, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (43035246, 28098770, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (43136996, 28164608, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (43136997, 28164608, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (43136998, 28164608, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (43141849, 28169218, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (43141850, 28169218, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, NULL, NULL, NULL),
  (43141851, 28169218, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (43269347, 28239386, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, '2023-05-01 14:26:44', 'Nicole Antoine', NULL),
  (43328317, 28274626, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (43328318, 28274626, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, NULL, NULL, NULL),
  (43328319, 28274626, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (43330095, 28275243, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (43330096, 28275243, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (43330097, 28275243, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (43330331, 28275324, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (43330550, 28275378, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (43330551, 28275378, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, NULL, NULL, NULL),
  (43330552, 28275378, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (43342458, 28280277, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2023-03-08 18:13:27', 'Nicole Antoine', NULL),
  (43342459, 28280277, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, '2023-03-08 18:13:22', 'Nicole Antoine', NULL),
  (43342460, 28280277, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (43432468, 28325983, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (43511606, 28374038, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (43511607, 28374038, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (43511608, 28374038, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (43512153, 28374487, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (43512154, 28374487, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (43512155, 28374487, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (43698119, 28484894, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (43698120, 28484894, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (43698121, 28484894, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (43746827, 28516282, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (43759651, 28521777, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (43871876, 28581838, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (43871877, 28581838, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (43871878, 28581838, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (43965943, 28631390, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (43965944, 28631390, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, NULL, NULL, NULL),
  (43965945, 28631390, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (43990813, 28645809, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, '2025-07-03 09:03:30', 'Nicole Antoine', NULL),
  (44457972, 28919479, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (44702701, 29073074, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (44702702, 29073074, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (44702703, 29073074, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (44734583, 29090849, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (44734584, 29090849, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (44734585, 29090849, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (44750242, 29099203, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (44750243, 29099203, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (44750244, 29099203, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (44923151, 29186469, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (44923162, 29186496, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (44958935, 29202650, '(untitled)', NULL, 'Sales Prep

-', NULL, NULL, NULL, NULL),
  (44958936, 29202650, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, NULL, NULL, NULL),
  (44958937, 29202650, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (44974755, 29209062, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2023-05-01 14:26:50', 'Nicole Antoine', NULL),
  (44974756, 29209062, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2025-07-03 09:03:29', 'Nicole Antoine', NULL),
  (44974757, 29209062, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2025-07-03 09:03:28', 'Nicole Antoine', NULL),
  (44977232, 29210080, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (44977233, 29210080, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (44977234, 29210080, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (45057744, 29252547, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (45057745, 29252547, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (45057746, 29252547, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (45101429, 29275201, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (45101430, 29275201, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (45101431, 29275201, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (45123388, 29284090, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2023-05-01 14:26:55', 'Nicole Antoine', NULL),
  (45123389, 29284090, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2025-07-03 09:03:27', 'Nicole Antoine', NULL),
  (45123390, 29284090, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2025-07-03 09:03:26', 'Nicole Antoine', NULL),
  (45212444, 29331848, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (45295106, 29374265, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (45295107, 29374265, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (45295108, 29374265, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (45324473, 29388894, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (45324474, 29388894, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (45324475, 29388894, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (45341400, 29397413, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (45341401, 29397413, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, NULL, NULL, NULL),
  (45341402, 29397413, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (45343864, 29397873, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (45343865, 29397873, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (45343866, 29397873, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (45380417, 29416859, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (45380418, 29416859, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, NULL, NULL, NULL),
  (45380419, 29416859, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (45449960, 29457223, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (45449961, 29457223, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (45449962, 29457223, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (45625307, 29540377, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (45625308, 29540377, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, NULL, NULL, NULL),
  (45625309, 29540377, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (45726107, 29599393, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (45726108, 29599393, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (45726109, 29599393, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (45746116, 29612802, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (45764809, 29622563, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (45764810, 29622563, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (45764811, 29622563, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (45764877, 29622589, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (45764878, 29622589, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, NULL, NULL, NULL),
  (45764879, 29622589, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (45768588, 29623558, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (45768589, 29623558, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (45768590, 29623558, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (45816005, 29643792, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (45816006, 29643792, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (45816007, 29643792, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (46100712, 29793254, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (46152389, 29826617, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (46152390, 29826617, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (46152391, 29826617, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (46202163, 29857171, '(untitled)', NULL, 'Sales Prep

-', NULL, NULL, NULL, NULL),
  (46202164, 29857171, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (46202165, 29857171, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (46241580, 29877737, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (46241662, 29877766, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (46247507, 29880035, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2025-07-03 09:03:24', 'Nicole Antoine', NULL),
  (46247508, 29880035, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2025-07-03 09:03:23', 'Nicole Antoine', NULL),
  (46247509, 29880035, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2025-07-03 09:03:22', 'Nicole Antoine', NULL),
  (46313549, 29912551, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (46313550, 29912551, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, NULL, NULL, NULL),
  (46313551, 29912551, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (46337754, 29925348, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (46337755, 29925348, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (46337756, 29925348, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (46393804, 29953160, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (46393805, 29953160, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, NULL, NULL, NULL),
  (46393806, 29953160, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (46432221, 29970457, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (46432222, 29970457, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, NULL, NULL, NULL),
  (46432223, 29970457, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (46597203, 30034558, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (46602115, 30036606, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (46675726, 30058865, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (46675727, 30058865, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (46675728, 30058865, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (46696337, 30068111, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (46696338, 30068111, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, NULL, NULL, NULL),
  (46696339, 30068111, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (46765307, 30099079, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (46765308, 30099079, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, NULL, NULL, NULL),
  (46765309, 30099079, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (46765352, 30099126, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (46765353, 30099126, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (46765354, 30099126, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (46866497, 30154946, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (46866498, 30154946, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (46866499, 30154946, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (46934092, 30187938, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (46934093, 30187938, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, NULL, NULL, NULL),
  (46934094, 30187938, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (47056008, 30216439, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (47056009, 30216439, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, NULL, NULL, NULL),
  (47056010, 30216439, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (47242804, 30247578, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (47242805, 30247578, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (47242806, 30247578, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (47303061, 30282900, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (47303349, 30282982, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (47303350, 30282982, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (47303351, 30282982, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (47335093, 30299450, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (47335094, 30299450, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, NULL, NULL, NULL),
  (47335095, 30299450, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (47340806, 30302537, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (47412027, 30339943, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (47414068, 30340654, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2025-07-03 09:03:21', 'Nicole Antoine', NULL),
  (47414069, 30340654, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2025-07-03 09:03:20', 'Nicole Antoine', NULL),
  (47414070, 30340654, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2025-07-03 09:03:19', 'Nicole Antoine', NULL),
  (47467871, 30365496, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2025-09-30 14:15:57', 'Brian Godley', NULL),
  (47467872, 30365496, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2025-09-30 14:15:55', 'Brian Godley', NULL),
  (47467873, 30365496, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2025-09-30 14:15:53', 'Brian Godley', NULL),
  (47476756, 30370534, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (47564632, 30418383, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (47564633, 30418383, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (47564634, 30418383, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (47579901, 30426173, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (47579902, 30426173, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (47579903, 30426173, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (47603270, 30439832, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (47622068, 30448638, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (47622069, 30448638, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (47622070, 30448638, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (47628922, 30453039, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (47629442, 30453269, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (47662263, 30472721, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (47689473, 30099079, 'Follow up', 'high', '[Daily Log Notes] 
Maria called in to voice concerns regarding her garden. 
1. Koren grass has patches dying and would like the replacement of patches 
2. sprinklers are causing rocks from the zen garden to fall out of place and the area is losing shape (said we need to fix it and build something to stop the rocks from falling)', '2023-07-25', '2025-01-14 16:51:45', 'Carter Godley', '(.PM) Carter Godley'),
  (47712625, 30503593, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2023-10-04 13:29:36', 'Fidel Corona', NULL),
  (47712626, 30503593, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (47712627, 30503593, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (47732817, 30512103, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (47732818, 30512103, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (47732819, 30512103, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (47734190, 13448673, 'Follow up', NULL, '[Daily Log Notes] 
Leaking front bowl planter', '2023-07-26', '2025-01-14 16:51:46', 'Carter Godley', '(.PM) Carter Godley'),
  (47750923, 30524037, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2025-07-03 09:03:18', 'Nicole Antoine', NULL),
  (47750924, 30524037, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, '2025-07-03 09:03:17', 'Nicole Antoine', NULL),
  (47750925, 30524037, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2025-07-03 09:03:16', 'Nicole Antoine', NULL),
  (47774896, 30099079, 'Follow up Complaint call', NULL, '[Daily Log Notes] 
Concern Call Maria called again at @10:15 am 
1. PB has not gone out for yard checks 
2. Koren grass is dying and would like the replacement of patches 
(I spoke to Daniel he said we need to order 2 flats to replace) 
3. sprinklers are causing rocks from the zen garden to fall out of place and the area is losing shape
(I spoke to Daniel he said we will reset the rocks) 

Please call and assure her that we are working on the problems', '2023-07-27', '2025-01-14 16:51:46', 'Carter Godley', '(.PM) Carter Godley'),
  (47776353, 18189451, 'Follow up', NULL, '[Daily Log Notes] 
+HO called in to voice Complaints
1. When the project was completed a few plants died she was promised that they would get replaced and nobody ever followed up (would like plants replaced) 
2. Is a maintenance client and  PB has not gone to do maintenance at her property for 2 weeks now', NULL, '2025-01-14 16:52:01', 'Carter Godley', '(.PM) Carter Godley'),
  (47777784, 30538713, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (47777858, 9584599, 'Tree replacement (or options)', NULL, '[Daily Log Notes] 
Would like to know options for replacing a tree that may be dead', '2023-07-27', '2025-01-14 16:51:59', 'Carter Godley', '(.PM) Carter Godley'),
  (47784282, 30503593, 'Updated materials submittal', 'highest', '[Daily Log Notes] 
Requested on 7/20/2023 
Send the list to Rafael Gomez rafael@roadwayengineering.com

Please see the attached reviewed submittal for the Pomona Emergency Shelter project.  Please also send a submittal for all other irrigation materials that will be used and not included in this submittal (pipe, wire, bedding, warning tape, etc.)  Also, please send a submittal for the landscaping.', '2023-07-28', '2025-01-14 16:52:00', 'Carter Godley', '(.PM) Carter Godley,Brian Godley,Daniel Aguilar'),
  (47784805, 30542368, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (47784806, 30542368, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (47784807, 30542368, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (47801028, 30549620, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (47801029, 30549620, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (47801030, 30549620, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (47814532, 30553887, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (47814533, 30553887, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (47814534, 30553887, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (47826450, 30561013, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (47826451, 30561013, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, NULL, NULL, NULL),
  (47826452, 30561013, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (47850202, 30569690, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (47850203, 30569690, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (47850204, 30569690, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (47869265, 30579117, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (47869917, 30579258, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (47869918, 30579258, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (47869919, 30579258, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (47986748, 30644606, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, '2025-07-03 09:03:15', 'Nicole Antoine', NULL),
  (48012512, 30659893, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (48012513, 30659893, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (48012514, 30659893, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (48060974, 30689233, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (48161767, 30741140, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (48161768, 30741140, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, NULL, NULL, NULL),
  (48161769, 30741140, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (48275704, 30797398, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (48275705, 30797398, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (48275706, 30797398, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (48276075, 30797398, 'Sub Agreement & Prevailing wage', 'highest', 'Sub Agreement along with the Prevailing wage required forms for you to review & fill out. Please sign and return for full execution.', '2023-08-18', NULL, NULL, 'Kimberly Uriarte'),
  (48276118, 30797398, 'scope of work duration schedule & Materials Lead time', NULL, 'Provide a schedule for work scopes', '2023-08-18', '2025-01-14 16:51:53', 'Carter Godley', '(.PM) Carter Godley,Kimberly Uriarte'),
  (48276153, 30797398, 'Materials List', NULL, 'need submittal approval from our client before placing a material  order', '2023-08-18', '2025-01-14 16:51:52', 'Carter Godley', '(.PM) Carter Godley,Kimberly Uriarte'),
  (48303760, 30818193, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (48309351, 30820577, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (48385189, 30854463, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (48385190, 30854463, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (48385191, 30854463, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (48580134, 27395103, 'follow up', NULL, '[Daily Log Notes] 
In the span of 5 days 2 of our lantanas have died and 3 more are about to die. There''s something very wrong, as they''re all concentrated in one area. The rest of our lantanas in other areas are doing fine', NULL, '2025-01-14 16:52:00', 'Carter Godley', '(.PM) Carter Godley'),
  (48623418, 31013456, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2025-07-03 09:03:14', 'Nicole Antoine', NULL),
  (48623419, 31013456, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2025-07-03 09:03:06', 'Nicole Antoine', NULL),
  (48623420, 31013456, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2025-07-03 09:03:05', 'Nicole Antoine', NULL),
  (48653353, 31028134, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (48669284, 31038031, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (48669285, 31038031, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (48669286, 31038031, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (48793245, 31157079, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (48793246, 31157079, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (48793247, 31157079, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (48802922, 31163211, '(untitled)', NULL, 'Sales Prep

9. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (48802923, 31163211, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (48802924, 31163211, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (48855770, 31185313, '(untitled)', NULL, 'Sales Prep

8. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (48855771, 31185313, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (48855772, 31185313, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (48969152, 31248080, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (49011499, 31273124, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (49011500, 31273124, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, NULL, NULL, NULL),
  (49011501, 31273124, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (49103387, 31323897, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (49121190, 31330972, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (49121191, 31330972, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (49121192, 31330972, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (49129513, 31333701, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (49129514, 31333701, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (49129515, 31333701, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (49226463, 31382032, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (49226464, 31382032, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (49226465, 31382032, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (49226687, 31382108, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (49226688, 31382108, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (49226689, 31382108, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (49287122, 29202650, 'Follow up', NULL, '[Daily Log Notes] 
Client called 9/20 regarding dying plants please reach out', '2023-09-21', '2025-01-14 16:51:53', 'Carter Godley', '(.PM) Carter Godley'),
  (49312388, 31425637, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (49312389, 31425637, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (49312390, 31425637, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (49361905, 31448674, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (49459761, 31493442, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (49459762, 31493442, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, NULL, NULL, NULL),
  (49459763, 31493442, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (49496789, 31511056, '(untitled)', NULL, 'Sales Prep

10.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (49496790, 31511056, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, NULL, NULL, NULL),
  (49496791, 31511056, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (49496845, 31511092, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (49496847, 31511092, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, NULL, NULL, NULL),
  (49496849, 31511092, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (49497097, 31511192, '(untitled)', NULL, 'Sales Prep

8. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (49497098, 31511192, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (49497099, 31511192, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (49554567, 27971242, 'Follow up', NULL, '[Daily Log Notes] 
Both lights and irrigation won''t turn on needs someone to come out and see why they aren''t working. The client thinks it may be an electrical problem', NULL, '2025-01-14 16:51:56', 'Carter Godley', '(.PM) Carter Godley'),
  (49572494, 31545886, '(untitled)', NULL, 'Sales Prep

-', NULL, NULL, NULL, NULL),
  (49572495, 31545886, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, NULL, NULL, NULL),
  (49572496, 31545886, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (49605379, 31556682, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, '2023-11-10 05:51:56', 'Nicole Antoine', NULL),
  (49669685, 31581766, '(untitled)', NULL, 'Sales Prep

10.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (49669686, 31581766, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, NULL, NULL, NULL),
  (49669687, 31581766, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (49760270, 31623504, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (49872729, 31668573, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (49923816, 31696923, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (49923817, 31696923, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, NULL, NULL, NULL),
  (49923818, 31696923, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (49954027, 31711365, '(untitled)', NULL, 'Sales Prep

11.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (49954028, 31711365, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, NULL, NULL, NULL),
  (49954029, 31711365, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (49954152, 31711400, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (49954153, 31711400, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (49954154, 31711400, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (49956824, 30503593, 'Order material for approved backflow and valves', NULL, '[Daily Log Notes] 
added backflow and valves have been approved', NULL, '2025-01-14 16:52:02', 'Carter Godley', '(.PM) Carter Godley'),
  (49998673, 31736833, '(untitled)', NULL, 'Sales Prep

10.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2025-09-30 14:15:44', 'Brian Godley', NULL),
  (49998674, 31736833, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2025-09-30 14:15:47', 'Brian Godley', NULL),
  (49998675, 31736833, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2025-09-30 14:15:42', 'Brian Godley', NULL),
  (50050226, 31761919, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (50203112, 31837744, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (50203113, 31837744, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (50203114, 31837744, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (50225417, 31849436, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (50225418, 31849436, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, NULL, NULL, NULL),
  (50225419, 31849436, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (50225540, 31849504, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (50225672, 31849639, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (50225673, 31849639, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (50225674, 31849639, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (50342994, 31916414, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (50342995, 31916414, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (50342996, 31916414, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (50368690, 31925620, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (50368691, 31925620, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (50368692, 31925620, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (50381415, 31930909, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2025-07-18 23:07:19', 'Brian Godley', NULL),
  (50381416, 31930909, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2025-07-18 23:06:50', 'Brian Godley', NULL),
  (50381417, 31930909, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2025-07-18 23:06:51', 'Brian Godley', NULL),
  (50438173, 31979366, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (50439030, 31980248, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (50504440, 32005914, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (50556649, 32033303, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (50586761, 32047640, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (50586762, 32047640, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, NULL, NULL, NULL),
  (50586763, 32047640, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (50599330, 32053237, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (50599331, 32053237, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (50599332, 32053237, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (50618713, 32061671, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2025-07-03 09:03:04', 'Nicole Antoine', NULL),
  (50618714, 32061671, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2025-07-03 09:03:03', 'Nicole Antoine', NULL),
  (50618715, 32061671, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2025-07-03 09:03:02', 'Nicole Antoine', NULL),
  (50680560, 4104447, 'follow up', NULL, '[Daily Log Notes] 
H/O called in and asked for someone to come out and check if the pavers need more joint sand if so she would like to get it done', '2023-11-07', '2025-01-14 16:51:54', 'Carter Godley', '(.PM) Carter Godley'),
  (50793649, 32167214, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (50793650, 32167214, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (50793651, 32167214, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (50866755, 32199250, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2025-07-03 09:03:01', 'Nicole Antoine', NULL),
  (50866758, 32199250, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, '2025-07-03 09:03:00', 'Nicole Antoine', NULL),
  (50866761, 32199250, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2025-07-03 09:02:59', 'Nicole Antoine', NULL),
  (50914828, 32223073, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (50914829, 32223073, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (50914830, 32223073, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (50961388, 32244517, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (50961389, 32244517, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, NULL, NULL, NULL),
  (50961390, 32244517, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (51032038, 31273124, 'Follow up', NULL, '[Daily Log Notes] 
Please reach out to Mark patches from the backyard have died again.', '2023-11-21', '2025-01-14 16:51:55', 'Carter Godley', '(.PM) Carter Godley'),
  (51102954, 32307925, '(untitled)', NULL, 'Sales Prep

-', NULL, NULL, NULL, NULL),
  (51102955, 32307925, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, '2025-07-30 16:15:38', 'Brian Godley', NULL),
  (51102956, 32307925, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (51104778, 32309360, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (51104779, 32309360, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (51104780, 32309360, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (51142984, 32325665, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (51142985, 32325665, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (51142986, 32325665, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (51225562, 32372609, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (51225563, 32372609, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, NULL, NULL, NULL),
  (51225564, 32372609, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (51261494, 32389999, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (51261495, 32389999, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (51261496, 32389999, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (51261833, 32390171, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (51261834, 32390171, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (51261835, 32390171, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (51262016, 32390216, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (51262017, 32390216, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (51262018, 32390216, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (51290057, 32404546, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2025-07-03 09:02:58', 'Nicole Antoine', NULL),
  (51290058, 32404546, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2025-07-03 09:02:57', 'Nicole Antoine', NULL),
  (51290059, 32404546, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2025-07-03 09:02:56', 'Nicole Antoine', NULL),
  (51340354, 32422492, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (51340355, 32422492, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (51340356, 32422492, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (51375675, 32441415, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (51375676, 32441415, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (51375677, 32441415, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (51409844, 32462121, '(untitled)', NULL, 'Sales Prep

9. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (51409845, 32462121, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (51409846, 32462121, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (51413823, 32463832, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (51413824, 32463832, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (51413825, 32463832, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (51517564, 32515033, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (51645052, 32591483, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (51645053, 32591483, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, NULL, NULL, NULL),
  (51645054, 32591483, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (51734458, 32638422, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (51734459, 32638422, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, NULL, NULL, NULL),
  (51734460, 32638422, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (51751894, 32647651, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (51751895, 32647651, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (51751896, 32647651, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (51782994, 32662685, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (51782995, 32662685, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (51782996, 32662685, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (51880001, 32703429, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (51880002, 32703429, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, NULL, NULL, NULL),
  (51880003, 32703429, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (51927044, 32725840, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (52002665, 32764300, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (52207293, 32865633, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (52304036, 32916329, '(untitled)', NULL, 'Sales Prep

11.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (52304037, 32916329, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, NULL, NULL, NULL),
  (52304038, 32916329, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (52322367, 32926681, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (52322368, 32926681, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (52322369, 32926681, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (52359092, 32945975, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (52381566, 32971056, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2025-09-30 14:15:38', 'Brian Godley', NULL),
  (52381567, 32971056, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2025-09-30 14:15:36', 'Brian Godley', NULL),
  (52381568, 32971056, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2025-09-30 14:15:34', 'Brian Godley', NULL),
  (52397620, 32979016, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2025-07-03 09:02:55', 'Nicole Antoine', NULL),
  (52397621, 32979016, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2025-07-03 09:02:54', 'Nicole Antoine', NULL),
  (52397622, 32979016, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2025-07-03 09:02:53', 'Nicole Antoine', NULL),
  (52584965, 33075936, '(untitled)', NULL, 'Sales Prep

9. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2025-06-20 08:35:24', 'Brian Godley', NULL),
  (52584966, 33075936, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2025-06-20 08:35:22', 'Brian Godley', NULL),
  (52584967, 33075936, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2025-12-30 06:35:44', 'Brian Godley', NULL),
  (52678558, 33123453, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (52678559, 33123453, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, NULL, NULL, NULL),
  (52678560, 33123453, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (52681584, 33125271, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (52681585, 33125271, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (52681586, 33125271, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (52681714, 33125302, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (52686353, 33127732, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (52756032, 33161618, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2025-12-30 06:35:40', 'Brian Godley', NULL),
  (52756033, 33161618, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2025-12-30 06:35:37', 'Brian Godley', NULL),
  (52756034, 33161618, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2025-12-30 06:35:32', 'Brian Godley', NULL),
  (52756433, 33161756, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2024-02-01 19:03:58', 'Nicole Antoine', NULL),
  (52756434, 33161756, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, '2025-07-03 09:02:52', 'Nicole Antoine', NULL),
  (52756435, 33161756, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2025-07-03 09:02:51', 'Nicole Antoine', NULL),
  (52762592, 33166209, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, '2025-07-03 09:02:50', 'Nicole Antoine', NULL),
  (52799436, 33185933, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2024-04-15 11:34:21', 'Brian Godley', NULL),
  (52799437, 33185933, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2025-06-23 14:37:43', 'Brian Godley', NULL),
  (52799438, 33185933, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2025-06-23 17:56:16', 'Brian Godley', NULL),
  (52910638, 33246694, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (52965247, 33273515, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (53161763, 33375865, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2025-07-30 16:14:49', 'Brian Godley', NULL),
  (53161764, 33375865, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2025-07-30 16:14:47', 'Brian Godley', NULL),
  (53161765, 33375865, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2025-09-30 14:15:31', 'Brian Godley', NULL),
  (53282579, 33431219, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (53282580, 33431219, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (53282581, 33431219, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (53363861, 33478759, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (53363862, 33478759, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (53363863, 33478759, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (53543344, 33577562, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (53543345, 33577562, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (53543346, 33577562, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (53648234, 33622249, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, '2025-07-03 09:02:48', 'Nicole Antoine', NULL),
  (53687274, 33639274, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, '2025-07-03 09:02:47', 'Nicole Antoine', NULL),
  (53688097, 33639850, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (53736166, 33666094, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, '2025-07-03 09:02:45', 'Nicole Antoine', NULL),
  (53790103, 33691503, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2025-08-28 06:40:59', '(.PM) Jorge Flores', NULL),
  (53790104, 33691503, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2025-08-28 06:41:01', '(.PM) Jorge Flores', NULL),
  (53790105, 33691503, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2025-08-28 06:41:03', '(.PM) Jorge Flores', NULL),
  (53799128, 33696074, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (53799129, 33696074, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (53799130, 33696074, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (53927496, 33757521, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (53973902, 33777247, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2025-07-03 09:02:44', 'Nicole Antoine', NULL),
  (53973903, 33777247, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2025-07-03 09:02:43', 'Nicole Antoine', NULL),
  (53973904, 33777247, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2025-07-03 09:02:42', 'Nicole Antoine', NULL),
  (53990506, 33784914, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (53990507, 33784914, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (53990508, 33784914, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (54025080, 33806261, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (54025081, 33806261, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (54025082, 33806261, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (54169847, 29388894, 'Kelly, Kevin and Marian', NULL, NULL, NULL, NULL, NULL, NULL),
  (54169869, 33161756, 'Halebian, Susie 2', NULL, NULL, NULL, '2025-07-03 09:03:55', 'Nicole Antoine', NULL),
  (54208950, 33893750, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (54208951, 33893750, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (54208952, 33893750, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (54218922, 33896812, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (54218923, 33896812, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (54218924, 33896812, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (54344234, 33951147, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (54344635, 33951265, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (54471198, 34007670, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2025-07-03 09:02:40', 'Nicole Antoine', NULL),
  (54471199, 34007670, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, '2025-07-03 09:02:39', 'Nicole Antoine', NULL),
  (54471200, 34007670, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2025-07-03 09:02:38', 'Nicole Antoine', NULL),
  (54509830, 34029232, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, '2025-07-03 09:02:37', 'Nicole Antoine', NULL),
  (54637616, 34087735, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2024-04-09 09:03:58', 'Nicole Antoine', NULL),
  (54637617, 34087735, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, '2025-07-03 09:02:36', 'Nicole Antoine', NULL),
  (54637618, 34087735, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2025-07-03 09:02:34', 'Nicole Antoine', NULL),
  (54762542, 34145541, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2025-07-03 09:02:33', 'Nicole Antoine', NULL),
  (54762543, 34145541, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2025-07-03 09:02:32', 'Nicole Antoine', NULL),
  (54762544, 34145541, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2025-07-03 09:02:31', 'Nicole Antoine', NULL),
  (54819200, 34171881, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (54819201, 34171881, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (54819202, 34171881, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (54846062, 34182663, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (54861644, 34189300, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (54861645, 34189300, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (54861646, 34189300, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (54882579, 34202401, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (54882580, 34202401, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (54882581, 34202401, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (55000930, 34281908, '(untitled)', NULL, 'Sales Prep

-', NULL, NULL, NULL, NULL),
  (55000931, 34281908, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, NULL, NULL, NULL),
  (55000932, 34281908, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (55055424, 34303624, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (55166621, 34352790, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (55166622, 34352790, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (55166623, 34352790, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (55198338, 34366510, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (55396579, 34456359, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (55396580, 34456359, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, NULL, NULL, NULL),
  (55396581, 34456359, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (55574306, 34535568, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (55574307, 34535568, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (55574308, 34535568, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (55580597, 34538589, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (55580700, 34538659, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (55580701, 34538659, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (55580702, 34538659, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (55580874, 34538774, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (55644441, 34570205, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, '2025-09-30 14:15:28', 'Brian Godley', NULL),
  (55644442, 34570205, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, '2025-09-30 14:15:26', 'Brian Godley', NULL),
  (55644443, 34570205, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (55746138, 34624888, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (55746692, 34625007, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (55746705, 34625025, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (55746706, 34625025, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (55746707, 34625025, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (55765938, 34634270, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (55765939, 34634270, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (55765940, 34634270, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (55860475, 34681577, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (55860476, 34681577, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (55860477, 34681577, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (55945383, 34719252, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (55945384, 34719252, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (55945385, 34719252, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (55946791, 34720122, '(untitled)', NULL, 'Sales Prep

-', NULL, '2025-06-23 14:38:49', 'Brian Godley', NULL),
  (55946792, 34720122, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2025-06-23 14:38:50', 'Brian Godley', NULL),
  (55946793, 34720122, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2025-06-23 14:38:52', 'Brian Godley', NULL),
  (55951395, 34722397, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (55951396, 34722397, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, NULL, NULL, NULL),
  (55951397, 34722397, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (55976224, 34733319, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (56030032, 34760103, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (56030033, 34760103, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, NULL, NULL, NULL),
  (56030034, 34760103, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (56035665, 34763288, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (56081152, 34535568, 'Robinson', NULL, NULL, NULL, '2024-05-22 20:16:37', 'Jose Rosas', NULL),
  (56207263, 34841717, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (56207264, 34841717, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (56207265, 34841717, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (56332554, 34896254, '(untitled)', NULL, 'Sales Prep

-', NULL, NULL, NULL, NULL),
  (56332555, 34896254, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (56332556, 34896254, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (56338337, 34900568, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (56338338, 34900568, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, NULL, NULL, NULL),
  (56338339, 34900568, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (56403437, 34927957, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (56403438, 34927957, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (56403439, 34927957, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (56418999, 34935552, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (56554017, 34993250, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (56554091, 33691503, '(untitled)', NULL, '.', NULL, '2025-08-28 06:40:08', '(.PM) Jorge Flores', NULL),
  (56589960, 35007746, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (56640628, 35038566, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (56640681, 35038610, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (56654925, 35045881, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (56696427, 35064636, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (56696428, 35064636, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (56696429, 35064636, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (56823227, 35123003, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (56843427, 35133418, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (56843428, 35133418, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (56843429, 35133418, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (56843940, 35133643, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (56885522, 35156966, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (56885523, 35156966, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, NULL, NULL, NULL),
  (56885524, 35156966, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (56888091, 35157995, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (56888092, 35157995, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, NULL, NULL, NULL),
  (56888093, 35157995, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (56899174, 35162285, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (56899175, 35162285, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, NULL, NULL, NULL),
  (56899176, 35162285, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (57024890, 35220019, '(untitled)', NULL, 'Sales Prep

-', NULL, '2025-09-30 14:15:22', 'Brian Godley', NULL),
  (57024891, 35220019, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, '2025-09-30 14:15:20', 'Brian Godley', NULL),
  (57024892, 35220019, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2025-09-30 14:15:19', 'Brian Godley', NULL),
  (57104858, 35259806, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (57105011, 35259913, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2025-06-29 22:59:07', 'Brian Godley', NULL),
  (57105012, 35259913, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2025-06-29 22:59:09', 'Brian Godley', NULL),
  (57105013, 35259913, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2025-06-29 22:59:10', 'Brian Godley', NULL),
  (57105124, 35260002, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (57105125, 35260002, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, NULL, NULL, NULL),
  (57105126, 35260002, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (57148418, 35280230, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (57148419, 35280230, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (57148420, 35280230, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (57149765, 35280886, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (57149766, 35280886, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, NULL, NULL, NULL),
  (57149767, 35280886, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (57234128, 35316862, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (57234256, 35316923, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (57234287, 35316947, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (57234323, 35316998, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (57234341, 35317020, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (57234349, 35317034, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (57234362, 35317046, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (57316293, 35350842, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (57316294, 35350842, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, NULL, NULL, NULL),
  (57316295, 35350842, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (57418633, 35403194, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (57464373, 35423025, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (57518213, 35447398, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (57518214, 35447398, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, NULL, NULL, NULL),
  (57518215, 35447398, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (57594110, 35478313, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (57595213, 35482171, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (57595214, 35482171, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (57595215, 35482171, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (57601198, 35486873, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (57611801, 35491075, '(untitled)', NULL, 'Sales Prep

9. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, NULL, NULL, NULL),
  (57611802, 35491075, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (57611803, 35491075, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (57630529, 35503375, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (57630530, 35503375, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (57630531, 35503375, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (57700737, 35534051, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (57700738, 35534051, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (57700739, 35534051, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (57716336, 35538561, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (57729801, 35543806, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (57729802, 35543806, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (57729803, 35543806, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (57817174, 35586604, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (57817175, 35586604, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (57817176, 35586604, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (57855352, 35606551, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (57855353, 35606551, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, NULL, NULL, NULL),
  (57855354, 35606551, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (57957895, 35649886, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (57957896, 35649886, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (57957897, 35649886, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (58086707, 35712426, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (58147668, 35743604, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (58220902, 35775748, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (58220903, 35775748, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (58220904, 35775748, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (58221792, 35776452, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (58222194, 35776612, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (58222428, 35776830, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2025-09-30 14:15:16', 'Brian Godley', NULL),
  (58222429, 35776830, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, '2025-09-30 14:15:14', 'Brian Godley', NULL),
  (58222430, 35776830, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2025-09-30 14:15:13', 'Brian Godley', NULL),
  (58328025, 35831527, '(untitled)', NULL, 'Sales Prep

-', NULL, NULL, NULL, NULL),
  (58328026, 35831527, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, NULL, NULL, NULL),
  (58328027, 35831527, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (58364794, 35856450, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (58460015, 35901734, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (58460016, 35901734, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (58460017, 35901734, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (58515278, 35921733, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (58565531, 35942318, '(untitled)', NULL, 'Sales Prep

-', NULL, NULL, NULL, NULL),
  (58565532, 35942318, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (58565533, 35942318, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (58565970, 35942575, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (58565971, 35942575, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, NULL, NULL, NULL),
  (58565972, 35942575, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (58744825, 36034310, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (58797087, 36056404, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (58797088, 36056404, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (58797089, 36056404, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (58873649, 36094953, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (58874022, 36095168, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (58907011, 36109485, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (58907012, 36109485, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (58907013, 36109485, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (58981572, 36148606, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2025-06-20 08:00:55', 'Brian Godley', NULL),
  (58981573, 36148606, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2025-06-20 08:00:53', 'Brian Godley', NULL),
  (58981574, 36148606, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2025-09-30 14:15:09', 'Brian Godley', NULL),
  (59013600, 36168505, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2025-07-10 07:50:23', 'Brian Godley', NULL),
  (59013601, 36168505, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2025-07-10 07:50:25', 'Brian Godley', NULL),
  (59013602, 36168505, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2025-07-10 07:50:26', 'Brian Godley', NULL),
  (59013767, 36168526, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (59013768, 36168526, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, NULL, NULL, NULL),
  (59013769, 36168526, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (59051452, 36199414, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (59051453, 36199414, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (59051454, 36199414, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (59089576, 36220004, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (59089775, 36220078, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (59090139, 36220208, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (59090470, 36220338, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (59090634, 36220457, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2025-07-18 09:03:27', 'Brian Godley', NULL),
  (59090635, 36220457, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2025-07-18 09:03:28', 'Brian Godley', NULL),
  (59090636, 36220457, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2025-07-18 09:03:29', 'Brian Godley', NULL),
  (59461375, 36404291, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (59578523, 36466336, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (59609087, 36479250, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (59609088, 36479250, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (59609089, 36479250, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (59718854, 36532874, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2025-09-23 09:27:43', 'Brian Godley', NULL),
  (59718855, 36532874, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2025-09-23 09:27:43', 'Brian Godley', NULL),
  (59718856, 36532874, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2025-09-23 09:27:43', 'Brian Godley', NULL),
  (59760720, 36551611, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2025-06-09 16:14:13', 'Brian Godley', NULL),
  (59760721, 36551611, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, '2025-06-09 16:14:12', 'Brian Godley', NULL),
  (59760722, 36551611, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2025-11-13 16:05:21', '(.PM) Carter Godley', NULL),
  (59791545, 36567353, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (59791546, 36567353, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (59791547, 36567353, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (59839875, 36590620, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (59839876, 36590620, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (59839877, 36590620, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (59873721, 36611100, '(untitled)', NULL, 'Sales Prep

-', NULL, NULL, NULL, NULL),
  (59873722, 36611100, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (59873723, 36611100, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (59877030, 36613497, '(untitled)', NULL, 'Sales Prep

-', NULL, NULL, NULL, NULL),
  (59877031, 36613497, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (59877032, 36613497, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (59885019, 36620767, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (59885143, 36620882, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (59885144, 36620882, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (59885145, 36620882, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (59885196, 36620935, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (59885524, 36621100, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (59885702, 36621127, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (59885703, 36621127, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (59885704, 36621127, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (59895104, 36625488, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (59895184, 36625534, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (59895185, 36625534, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, NULL, NULL, NULL),
  (59895186, 36625534, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (59895348, 36625571, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (59917358, 36634969, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (59927227, 36638709, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (59929716, 36641056, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (59929717, 36641056, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, NULL, NULL, NULL),
  (59929718, 36641056, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (59932352, 36642587, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (59932353, 36642587, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (59932354, 36642587, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (59961383, 36654542, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (59961384, 36654542, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (59961385, 36654542, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (59968780, 36656916, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (59968781, 36656916, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, NULL, NULL, NULL),
  (59968782, 36656916, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (60013392, 36678549, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (60013393, 36678549, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (60013394, 36678549, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (60161227, 36755739, '(untitled)', NULL, 'Sales Prep

-', NULL, NULL, NULL, NULL),
  (60161228, 36755739, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, NULL, NULL, NULL),
  (60161229, 36755739, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (60191631, 36772464, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (60191632, 36772464, '(untitled)', NULL, 'Starting Job Walk

5. Project manager to arrive at job site and  look over design and read through job notes and contract docs with the sales rep 10 mins before meeting with the client.', NULL, NULL, NULL, NULL),
  (60191633, 36772464, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (60279973, 36822937, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (60279974, 36822937, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (60279975, 36822937, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (60398182, 36889610, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (60425742, 36905163, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (60425743, 36905163, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (60425744, 36905163, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (60426075, 36905386, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (60426384, 36905513, '(untitled)', NULL, 'Sales Prep

-', NULL, NULL, NULL, NULL),
  (60426385, 36905513, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, NULL, NULL, NULL),
  (60426386, 36905513, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (60435284, 36909985, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (60435285, 36909985, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (60435286, 36909985, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (60494047, 36936911, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2025-06-06 10:10:25', 'Brian Godley', NULL),
  (60494048, 36936911, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2025-06-06 10:10:26', 'Brian Godley', NULL),
  (60494049, 36936911, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2025-06-18 07:15:04', '(.PM) Jorge Flores', NULL),
  (60514024, 36989161, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2025-09-30 14:14:56', 'Brian Godley', NULL),
  (60514025, 36989161, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2025-09-30 14:14:52', 'Brian Godley', NULL),
  (60514026, 36989161, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2025-09-30 14:14:54', 'Brian Godley', NULL),
  (60629395, 37049304, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (60652168, 37061295, '(untitled)', NULL, 'Sales Prep

-', NULL, NULL, NULL, NULL),
  (60652169, 37061295, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (60652170, 37061295, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (60652457, 37061381, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (60652458, 37061381, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, NULL, NULL, NULL),
  (60652459, 37061381, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (60654014, 37061524, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (60654015, 37061524, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, NULL, NULL, NULL),
  (60654016, 37061524, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (60654391, 37061884, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2025-06-23 14:36:28', 'Brian Godley', NULL),
  (60654392, 37061884, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, '2025-06-23 14:36:30', 'Brian Godley', NULL),
  (60654393, 37061884, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2025-06-30 17:50:25', 'Brian Godley', NULL),
  (60655311, 37062495, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (60764149, 37127458, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (60826693, 37155041, '(untitled)', NULL, 'Sales Prep

11.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2025-06-27 12:14:04', 'Brian Godley', NULL),
  (60826694, 37155041, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2025-06-27 12:14:02', 'Brian Godley', NULL),
  (60826695, 37155041, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2025-06-27 12:14:07', 'Brian Godley', NULL),
  (60899275, 37218799, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2025-07-31 09:55:38', 'Brian Godley', NULL),
  (60899276, 37218799, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, '2025-07-31 09:55:36', 'Brian Godley', NULL),
  (60899277, 37218799, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2025-08-12 06:50:34', '(.PM) Jorge Flores', NULL),
  (60948401, 37249737, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (60991728, 37274990, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (60991729, 37274990, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (60991730, 37274990, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (61065864, 37335444, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (61065865, 37335444, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, NULL, NULL, NULL),
  (61065866, 37335444, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (61181768, 37410703, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (61198432, 37419559, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (61200507, 37420562, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2025-07-18 09:15:04', 'Brian Godley', NULL),
  (61200508, 37420562, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, '2025-07-18 09:15:06', 'Brian Godley', NULL),
  (61200509, 37420562, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2025-07-18 09:15:03', 'Brian Godley', NULL),
  (61237692, 37443736, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2025-06-24 16:43:55', 'Brian Godley', NULL),
  (61237693, 37443736, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2025-06-24 16:43:53', 'Brian Godley', NULL),
  (61237694, 37443736, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (61238295, 37443869, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (61242663, 37446221, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (61242666, 37446221, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, NULL, NULL, NULL),
  (61242668, 37446221, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (61354775, 37519743, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (61354776, 37519743, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (61354777, 37519743, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (61399175, 37542899, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2025-06-18 07:03:43', 'Brian Godley', NULL),
  (61399176, 37542899, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2025-06-18 07:03:45', 'Brian Godley', NULL),
  (61399177, 37542899, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2025-09-30 14:14:44', 'Brian Godley', NULL),
  (61407719, 37548504, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (61443761, 37561500, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2025-06-17 07:36:11', 'Brian Godley', NULL),
  (61443762, 37561500, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, '2025-06-17 07:36:12', 'Brian Godley', NULL),
  (61443763, 37561500, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2025-11-03 16:52:29', '(.PM) Jorge Flores', NULL),
  (61542561, 37604271, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (61542623, 37604325, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2025-06-10 17:31:26', 'Brian Godley', NULL),
  (61542624, 37604325, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, '2025-06-10 17:31:27', 'Brian Godley', NULL),
  (61542625, 37604325, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2025-12-30 06:59:50', 'Brian Godley', NULL),
  (61567044, 37625737, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (61567245, 37625855, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (61684972, 37690129, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2025-06-18 07:56:29', 'Brian Godley', NULL),
  (61684973, 37690129, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2025-06-18 07:56:28', 'Brian Godley', NULL),
  (61692391, 37696423, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (61692392, 37696423, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, NULL, NULL, NULL),
  (61692393, 37696423, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (61723316, 37712117, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (61822534, 37756475, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (61822535, 37756475, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, NULL, NULL, NULL),
  (61822536, 37756475, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (61886186, 37798226, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (61886187, 37798226, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (61886188, 37798226, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (61901143, 37807802, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2025-07-17 07:16:07', 'Brian Godley', NULL),
  (61901144, 37807802, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2025-06-11 11:32:34', 'Brian Godley', NULL),
  (61901145, 37807802, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (61936397, 37823743, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (61936398, 37823743, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (61936399, 37823743, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (62010719, 37869167, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (62010720, 37869167, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, NULL, NULL, NULL),
  (62010721, 37869167, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (62019947, 37875881, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (62022208, 37890729, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2025-06-17 17:56:25', 'Brian Godley', NULL),
  (62022209, 37890729, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2025-06-17 17:56:22', 'Brian Godley', NULL),
  (62022210, 37890729, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2025-12-30 06:59:50', 'Brian Godley', NULL),
  (62060513, 37914465, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (62095623, 37934669, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (62115701, 37946474, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (62115855, 37946564, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (62116035, 37946608, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (62147483, 37965042, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (62196908, 37992089, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (62196909, 37992089, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (62196910, 37992089, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (62197001, 37992169, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (62214348, 37998571, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, NULL, NULL, NULL),
  (62214349, 37998571, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, NULL, NULL, NULL),
  (62214350, 37998571, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (62283789, 38031130, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2025-07-18 08:25:09', 'Brian Godley', NULL),
  (62283790, 38031130, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, '2025-07-18 08:25:10', 'Brian Godley', NULL),
  (62283791, 38031130, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2025-07-18 08:25:08', 'Brian Godley', NULL),
  (62365133, 38078848, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (62365134, 38078848, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (62365135, 38078848, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (62379352, 38084723, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (62579633, 38203350, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (62579634, 38203350, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (62579635, 38203350, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, NULL, NULL, NULL),
  (62691485, 38235319, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2025-06-20 08:28:35', 'Brian Godley', NULL),
  (62691486, 38235319, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, '2025-06-20 08:28:33', 'Brian Godley', NULL),
  (62691487, 38235319, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, '2025-07-10 13:59:35', 'Brian Godley', NULL),
  (62880011, 38328498, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (62880012, 38328498, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, NULL, NULL, NULL),
  (62880013, 38328498, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (62917346, 38348765, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2025-09-30 14:14:41', 'Brian Godley', NULL),
  (62917347, 38348765, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, '2025-09-30 14:14:39', 'Brian Godley', NULL),
  (62917348, 38348765, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2025-09-30 14:14:37', 'Brian Godley', NULL),
  (62963014, 38375048, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (62963020, 38375055, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (62979858, 38383142, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (62979859, 38383142, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (62979860, 38383142, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (62987295, 38387132, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (63022524, 38401782, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, '2025-06-09 16:22:31', 'Brian Godley', NULL),
  (63022525, 38401782, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2025-06-09 16:22:28', 'Brian Godley', NULL),
  (63022526, 38401782, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2025-06-11 17:38:42', 'Brian Godley', NULL),
  (63024306, 38402552, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2025-12-30 06:59:50', 'Brian Godley', NULL),
  (63024307, 38402552, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2025-12-30 06:59:50', 'Brian Godley', NULL),
  (63024308, 38402552, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (63029010, 38404369, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (63052140, 38412829, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (63093740, 38434139, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (63093741, 38434139, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (63093742, 38434139, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (63141785, 38453888, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (63159646, 38463981, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (63269518, 38523648, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, NULL, NULL, NULL),
  (63269519, 38523648, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, NULL, NULL, NULL),
  (63269520, 38523648, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (63300417, 38539722, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (63374520, 38585142, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (63467601, 38644965, '(untitled)', NULL, 'Sales Prep

10. Notes on ay permits, HOA and engineering need to be put in a Daily Log.', NULL, '2025-06-17 18:05:55', 'Brian Godley', NULL),
  (63467602, 38644965, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2025-06-17 18:05:53', 'Brian Godley', NULL),
  (63467603, 38644965, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, NULL, NULL, NULL),
  (63493834, 38664205, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (63493985, 38664300, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, NULL, NULL, NULL),
  (63573848, 38705345, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (63609437, 38723464, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (63610312, 38723844, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (63664073, 38757075, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (63666341, 38757758, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (63666378, 38757907, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (63700684, 38774894, 'Job Walk: Final', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (63716456, 38782528, '(untitled)', NULL, 'Design Steps

Measure Property', NULL, NULL, NULL, NULL),
  (63732465, 38790362, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (63740678, 38797233, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (63740679, 38797233, '(untitled)', NULL, 'Starting Job Walk

15.Project manager to install Job Box.', NULL, NULL, NULL, NULL),
  (63740680, 38797233, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (63761540, 38808094, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (63785163, 38819021, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2025-09-30 14:14:34', 'Brian Godley', NULL),
  (63785164, 38819021, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, '2025-09-30 14:14:32', 'Brian Godley', NULL),
  (63785165, 38819021, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2025-09-30 14:14:30', 'Brian Godley', NULL),
  (63786669, 38819798, '(untitled)', NULL, 'Design Steps

Get Design Agreement', NULL, NULL, NULL, NULL),
  (63819175, 38841327, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (63819306, 38841576, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (63823510, 38850481, '(untitled)', NULL, 'Sales Prep

7. Job Start Notes need to be added.', NULL, NULL, NULL, NULL),
  (63823511, 38850481, '(untitled)', NULL, 'Starting Job Walk

14. Project manager to get ok from client and install yard sign', NULL, NULL, NULL, NULL),
  (63823512, 38850481, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (63869821, 38884377, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (63907642, 38904439, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2025-04-14 12:46:19', 'Nicole Antoine', NULL),
  (63907643, 38904439, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, '2025-04-14 12:46:24', 'Nicole Antoine', NULL),
  (63907644, 38904439, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, '2025-06-09 18:25:33', '(.PM) Jorge Flores', NULL),
  (63927385, 38912472, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (63927491, 38912565, '(untitled)', NULL, 'Sales Prep

2. Collect deposit for contract.', NULL, '2025-06-17 18:00:18', 'Brian Godley', NULL),
  (63927492, 38912565, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2025-06-17 18:00:16', 'Brian Godley', NULL),
  (63927493, 38912565, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2025-12-30 06:39:07', 'Brian Godley', NULL),
  (63929624, 38913440, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, NULL, NULL, NULL),
  (63929625, 38913440, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, NULL, NULL, NULL),
  (63929626, 38913440, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, NULL, NULL, NULL),
  (63929873, 38913527, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (63930023, 38913579, '(untitled)', NULL, 'Sales Prep

11.  A copy of the pricing estimator that was used needs to be uploaded to Builder Trend', NULL, NULL, NULL, NULL),
  (63930024, 38913579, '(untitled)', NULL, 'Starting Job Walk

12. If there are any change to scope of work the rep is to create change orders and get them approved and signed by client during the job walk.', NULL, NULL, NULL, NULL),
  (63930025, 38913579, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (64092727, 38992799, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (64123183, 39006191, '(untitled)', NULL, 'Sales Prep

12.  When Sales Prep is all done a note "This project is ready for Project Planning" needs to be entered and the project name  status changed to "(Job Prep)"', NULL, '2025-09-30 14:14:27', 'Brian Godley', NULL),
  (64123184, 39006191, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2025-09-30 14:14:26', 'Brian Godley', NULL),
  (64123185, 39006191, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2025-09-30 14:14:24', 'Brian Godley', NULL),
  (64245142, 39079103, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (64256552, 39084411, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, NULL, NULL, NULL),
  (64256553, 39084411, '(untitled)', NULL, 'Starting Job Walk

10. Project manager to ensure client has informed neighbors of construction and issues, dust, parking etc. that can come from that.', NULL, NULL, NULL, NULL),
  (64256554, 39084411, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, NULL, NULL, NULL),
  (64261184, 39086453, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (64334307, 39121915, '(untitled)', NULL, 'Design Steps

Get final okay on all plans.  Have customer sign off on the approval sheet.  (Choices may still be open for exact materials and plants).   Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (64345291, 39127583, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2025-10-28 07:29:42', '(.PM) Paul DeAngelis', NULL),
  (64345292, 39127583, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2025-10-28 07:29:41', '(.PM) Paul DeAngelis', NULL),
  (64359483, 39133833, '(untitled)', NULL, 'Design Steps

Make any Changes per client request.   Permitting etc to be done later.  Upload to Builder Trend with date in file name', NULL, '2025-07-03 09:02:27', 'Nicole Antoine', NULL),
  (64376973, 39141320, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2025-09-30 14:14:21', 'Brian Godley', NULL),
  (64376974, 39141320, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2025-09-30 14:14:19', 'Brian Godley', NULL),
  (64376975, 39141320, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2025-09-30 14:14:17', 'Brian Godley', NULL),
  (64486664, 39200286, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (64664044, 39280087, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (64799974, 39348945, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, NULL, NULL, NULL),
  (64799975, 39348945, '(untitled)', NULL, 'Starting Job Walk

3. Project manager to bring yard sign, trash can and job box with stakes and wood for installation', NULL, NULL, NULL, NULL),
  (64799976, 39348945, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (64801082, 39350219, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, '2025-06-18 07:17:28', 'Brian Godley', NULL),
  (64801083, 39350219, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2025-06-16 16:36:45', 'Brian Godley', NULL),
  (64801084, 39350219, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2025-10-24 11:57:49', 'Brian Godley', NULL),
  (64807057, 39352943, '(untitled)', NULL, 'Sales Prep

1. Ensure company and client have a signed copy of contract.  Each copy must have a signature from client and the company rep to be legally binding.', NULL, NULL, NULL, NULL),
  (64807058, 39352943, '(untitled)', NULL, 'Starting Job Walk

8. Project manager and rep to go over each section of contract addendum with client one by one. Including marking items for demo, painting out hardscape, locating valves, bender board, planters, pergolas, kitchens, fire-pits etc.', NULL, NULL, NULL, NULL),
  (64807059, 39352943, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, NULL, NULL, NULL),
  (64807425, 39353081, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2025-06-18 07:06:55', 'Brian Godley', NULL),
  (64807426, 39353081, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, '2025-06-18 07:06:56', 'Brian Godley', NULL),
  (64807427, 39353081, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2025-09-30 14:14:15', 'Brian Godley', NULL),
  (64843591, 39367854, '(untitled)', NULL, 'Design Steps

Create first draft of design. Must include 3 pages.  Overall conceptual,  lighting plan.  planting plan. Upload to Builder Trend with date in file name.', NULL, NULL, NULL, NULL),
  (64896647, 39391525, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (64923792, 39401150, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, NULL, NULL, NULL),
  (64923793, 39401150, '(untitled)', NULL, 'Starting Job Walk

4. Project manager to bring stakes, string, marking paint, levels, short and long tape measures, string levels and transit if needed.', NULL, NULL, NULL, NULL),
  (64923794, 39401150, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL),
  (64931998, 39404979, '(untitled)', NULL, 'Design Steps

Get client needs and wants and handle according to budget.', NULL, NULL, NULL, NULL),
  (64933842, 39405668, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2025-12-30 06:39:07', 'Brian Godley', NULL),
  (64933843, 39405668, '(untitled)', NULL, 'Starting Job Walk

6. At job walk, the rep is to Introduce project manager and crew chief (if there) to customer. Project manager to give client their business card.', NULL, '2025-12-30 06:39:07', 'Brian Godley', NULL),
  (64933844, 39405668, '(untitled)', NULL, 'Final Job Walk

4. Pick up yard sign unless ok by client to leave longer.', NULL, NULL, NULL, NULL),
  (64935849, 39406205, '(untitled)', NULL, 'Sales Prep

6. Pre-Project  photos of the job uploaded to Builder Trend', NULL, '2025-06-23 14:37:01', 'Brian Godley', NULL),
  (64935850, 39406205, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2025-06-23 14:37:02', 'Brian Godley', NULL),
  (64935851, 39406205, '(untitled)', NULL, 'Final Job Walk

1. Walk jobsite with client.  Any outstanding items to be added to Job Completion To Do List.', NULL, '2025-06-24 07:39:42', 'Brian Godley', NULL),
  (64936105, 39406437, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2025-09-04 10:34:28', '(.PM) Carter Godley', NULL),
  (64936106, 39406437, '(untitled)', NULL, 'Starting Job Walk

7. Rep to ensure client has been given client the Customer Orientation booklet and ensures they have read it.', NULL, '2025-09-04 10:34:27', '(.PM) Carter Godley', NULL),
  (64936107, 39406437, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2025-09-04 10:34:25', '(.PM) Carter Godley', NULL),
  (64936119, 39406460, '(untitled)', NULL, 'Sales Prep

5. Upload files - Measurements, Designs, etc.   If job was sold from a design the content of design folders must be copied over from Design job.', NULL, '2025-06-16 07:50:57', 'Brian Godley', NULL),
  (64936120, 39406460, '(untitled)', NULL, 'Starting Job Walk

9. Project manager to look over job site and figure out job organization. Entry, exit points, parking, tool storage, demolition storage, trash cans etc.', NULL, '2025-06-16 07:50:36', 'Brian Godley', NULL),
  (64936121, 39406460, '(untitled)', NULL, 'Final Job Walk

5. If the client is happy with the work ask for a review.', NULL, '2025-07-30 16:14:18', 'Brian Godley', NULL),
  (64936139, 39406475, '(untitled)', NULL, 'Sales Prep

4. Any and all added notes that the client has communicated to the rep must be put in Daily Logs of the new job.', NULL, '2025-07-30 16:52:21', 'Brian Godley', NULL),
  (64936140, 39406475, '(untitled)', NULL, 'Starting Job Walk

2. Project manager to get their copy of the designs and the crew copy of designs at the office.  Bring them to job site.', NULL, '2025-06-06 09:11:21', '(HR) Mo Solomon', NULL),
  (64936141, 39406475, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2025-09-30 14:14:11', 'Brian Godley', NULL),
  (64991668, 39433058, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2025-06-30 07:58:59', 'Brian Godley', NULL),
  (64991669, 39433058, '(untitled)', NULL, 'Starting Job Walk

11. If there are any client originations that are not covered in contract or job start notes. Project manager to put in Daily logs and/or To-Do Lists.', NULL, '2025-07-22 16:54:18', 'Brian Godley', NULL),
  (64991670, 39433058, '(untitled)', NULL, 'Final Job Walk

3. Pick up Job Box.', NULL, '2025-12-30 06:39:07', 'Brian Godley', NULL),
  (64991746, 39433102, '(untitled)', NULL, 'Sales Prep

9. Material notes entered and a Material Selection To-Do List created.', NULL, '2025-06-18 07:46:54', 'Brian Godley', NULL),
  (64991747, 39433102, '(untitled)', NULL, 'Starting Job Walk

16. Project manager to store all designs, job folders, and appropriate permit docs in job box before leaving.', NULL, '2025-06-12 06:52:46', 'Brian Godley', NULL),
  (64991748, 39433102, '(untitled)', NULL, 'Final Job Walk

Take final photos for our website and upload to Builder Trend', NULL, '2025-09-30 14:14:08', 'Brian Godley', NULL),
  (64991814, 39433159, '(untitled)', NULL, 'Sales Prep

3. Ensure Job has the correct project name  "(Sales Prep) Last Name, First Name. Capitalize the first letters.', NULL, '2025-06-19 08:32:26', 'Brian Godley', NULL),
  (64991815, 39433159, '(untitled)', NULL, 'Starting Job Walk

1. Project manager to get their project folder and the crew project folders from the office. Bring them to job site.', NULL, '2025-07-08 16:44:32', '(.PM) Carter Godley', NULL),
  (64991816, 39433159, '(untitled)', NULL, 'Final Job Walk

2. Pick up final payment unless there are outstanding items for completion.', NULL, '2025-12-30 06:59:50', 'Brian Godley', NULL),
  (65028989, 39451022, '(untitled)', NULL, 'Design Steps

Get Budget', NULL, NULL, NULL, NULL),
  (65035373, 39453532, '(untitled)', NULL, 'Design Steps

Create a Base Sheet', NULL, NULL, NULL, NULL),
  (65098113, 39481672, '(untitled)', NULL, 'Sales Prep

-', NULL, NULL, NULL, NULL),
  (65098114, 39481672, '(untitled)', NULL, 'Starting Job Walk

13. Take photos of all approved layouts.  That way if demo messes them up or client tries to change something we have then on hand.', NULL, NULL, NULL, NULL),
  (65098115, 39481672, '(untitled)', NULL, 'Final Job Walk

6. Tell client to inform neighbors that we are complete or near complete if some outstanding items on Job completion list.   We can also inform the other neighbors ourselves.', NULL, NULL, NULL, NULL);

DO $$
DECLARE
  rec          RECORD;
  v_job_id     UUID;
  v_emp_id     UUID;
  v_clean_name TEXT;
  v_imported   INT := 0;
  v_dup        INT := 0;
  v_no_job     INT := 0;
BEGIN
  FOR rec IN SELECT * FROM _todo_staging LOOP
    -- Idempotency check
    IF EXISTS (SELECT 1 FROM job_tasks WHERE bt_todo_id = rec.bt_todo_id) THEN
      v_dup := v_dup + 1; CONTINUE;
    END IF;

    -- Resolve job by bt_job_id
    SELECT id INTO v_job_id FROM jobs WHERE bt_job_id = rec.bt_job_id LIMIT 1;
    IF v_job_id IS NULL THEN v_no_job := v_no_job + 1; CONTINUE; END IF;

    -- Best-effort assignee match: strip "(.PM) " / "(HR) " / etc. prefixes,
    -- then case-insensitive lookup on first_name + last_name.
    v_emp_id := NULL;
    IF rec.assignee_name IS NOT NULL AND rec.assignee_name <> '' THEN
      v_clean_name := TRIM(REGEXP_REPLACE(rec.assignee_name, '^\([^)]*\)\s*', ''));
      SELECT id INTO v_emp_id FROM employees
       WHERE status = 'active'
         AND LOWER(TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,''))) = LOWER(v_clean_name)
       LIMIT 1;
    END IF;

    INSERT INTO job_tasks (
      job_id, task_name, status, sort_order,
      bt_todo_id, priority, notes, due_date,
      completed_at, completed_by_name,
      assignee_id, assignee_name
    ) VALUES (
      v_job_id,
      rec.title,
      CASE WHEN rec.completed_at IS NOT NULL THEN 'completed' ELSE 'pending' END,
      0,
      rec.bt_todo_id,
      rec.priority,
      rec.notes,
      rec.due_date,
      rec.completed_at,
      NULLIF(rec.completed_by, ''),
      v_emp_id,
      NULLIF(rec.assignee_name, '')
    );

    v_imported := v_imported + 1;
  END LOOP;

  RAISE NOTICE 'Batch 3 of 5 — Imported: %, Already imported (skipped): %, No matching job (skipped): %',
    v_imported, v_dup, v_no_job;
END $$;

COMMIT;
