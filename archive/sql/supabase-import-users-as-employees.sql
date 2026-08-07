-- ─────────────────────────────────────────────────────────────────
-- import-users-as-employees.sql
-- Imports 58 users from Users.xlsx into the employees table.
-- Merges by name: updates existing records, inserts new ones.
-- Safe to run multiple times (idempotent).
-- ─────────────────────────────────────────────────────────────────

DO $$
DECLARE r RECORD;
BEGIN

  -- Carter Godley
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Carter') AND LOWER(last_name)=LOWER('Godley')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'carter@picturebuild.com'),
      phone       = COALESCE(NULLIF(phone,''),      '818-808-2706'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Owner'),
      department  = COALESCE(NULLIF(department,''), 'Admin'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Carter') AND LOWER(last_name)=LOWER('Godley');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Carter', 'Godley', NULL, 'carter@picturebuild.com', '818-808-2706', 'Owner', 'Admin', 'active');
  END IF;

  -- Jorge Flores
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Jorge') AND LOWER(last_name)=LOWER('Flores')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'jorge@picturebuild.com'),
      phone       = COALESCE(NULLIF(phone,''),      '(818) 339-5575'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Administrator'),
      department  = COALESCE(NULLIF(department,''), 'Admin'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Jorge') AND LOWER(last_name)=LOWER('Flores');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Jorge', 'Flores', NULL, 'jorge@picturebuild.com', '(818) 339-5575', 'Administrator', 'Admin', 'active');
  END IF;

  -- Paul DeAngelis
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Paul') AND LOWER(last_name)=LOWER('DeAngelis')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'paul@picturebuild.com'),
      phone       = COALESCE(NULLIF(phone,''),      '818 233 4477'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Administrator'),
      department  = COALESCE(NULLIF(department,''), 'Admin'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Paul') AND LOWER(last_name)=LOWER('DeAngelis');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Paul', 'DeAngelis', NULL, 'paul@picturebuild.com', '818 233 4477', 'Administrator', 'Admin', 'active');
  END IF;

  -- Mo Solomon
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Mo') AND LOWER(last_name)=LOWER('Solomon')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'mo@picturebuild.com'),
      phone       = COALESCE(NULLIF(phone,''),      '(310) 995-4957'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Owner'),
      department  = COALESCE(NULLIF(department,''), 'Admin'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Mo') AND LOWER(last_name)=LOWER('Solomon');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Mo', 'Solomon', NULL, 'mo@picturebuild.com', '(310) 995-4957', 'Owner', 'Admin', 'active');
  END IF;

  -- MO MO
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('MO') AND LOWER(last_name)=LOWER('MO')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'mohammedpicturebuild@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      NULL),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Chief'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('MO') AND LOWER(last_name)=LOWER('MO');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('MO', 'MO', NULL, 'mohammedpicturebuild@gmail.com', NULL, 'Crew Chief', 'Operations', 'active');
  END IF;

  -- Adrian Iniguez
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Adrian') AND LOWER(last_name)=LOWER('Iniguez')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'ainiguez793@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '(818) 919-4319'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Adrian') AND LOWER(last_name)=LOWER('Iniguez');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Adrian', 'Iniguez', NULL, 'ainiguez793@gmail.com', '(818) 919-4319', 'Crew Member', 'Operations', 'active');
  END IF;

  -- Alfredo Moran
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Alfredo') AND LOWER(last_name)=LOWER('Moran')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'alfredomoran925@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '818-262-4303'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Alfredo') AND LOWER(last_name)=LOWER('Moran');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Alfredo', 'Moran', NULL, 'alfredomoran925@gmail.com', '818-262-4303', 'Crew Member', 'Operations', 'active');
  END IF;

  -- Anna Kurihara
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Anna') AND LOWER(last_name)=LOWER('Kurihara')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'anna@picturebuild.com'),
      phone       = COALESCE(NULLIF(phone,''),      '818-390-0004'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Sales Representative'),
      department  = COALESCE(NULLIF(department,''), 'Sales'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Anna') AND LOWER(last_name)=LOWER('Kurihara');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Anna', 'Kurihara', NULL, 'anna@picturebuild.com', '818-390-0004', 'Sales Representative', 'Sales', 'active');
  END IF;

  -- Antonio Nanez
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Antonio') AND LOWER(last_name)=LOWER('Nanez')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'antonionanez320@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '747-286-9267'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Antonio') AND LOWER(last_name)=LOWER('Nanez');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Antonio', 'Nanez', NULL, 'antonionanez320@gmail.com', '747-286-9267', 'Crew Member', 'Operations', 'active');
  END IF;

  -- Antonio Nazario Torres
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Antonio') AND LOWER(last_name)=LOWER('Nazario Torres')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'tonynazario1988@icloud.com'),
      phone       = COALESCE(NULLIF(phone,''),      '661-477-8405'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Antonio') AND LOWER(last_name)=LOWER('Nazario Torres');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Antonio', 'Nazario Torres', NULL, 'tonynazario1988@icloud.com', '661-477-8405', 'Crew Member', 'Operations', 'active');
  END IF;

  -- Aracely Villegas
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Aracely') AND LOWER(last_name)=LOWER('Villegas')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'aracely@picturebuild.com'),
      phone       = COALESCE(NULLIF(phone,''),      '661-874-5080'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Sales Representative'),
      department  = COALESCE(NULLIF(department,''), 'Sales'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Aracely') AND LOWER(last_name)=LOWER('Villegas');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Aracely', 'Villegas', NULL, 'aracely@picturebuild.com', '661-874-5080', 'Sales Representative', 'Sales', 'active');
  END IF;

  -- Brian Godley
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Brian') AND LOWER(last_name)=LOWER('Godley')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'brian@picturebuild.com'),
      phone       = COALESCE(NULLIF(phone,''),      '(818) 720-9215'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Owner'),
      department  = COALESCE(NULLIF(department,''), 'Admin'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Brian') AND LOWER(last_name)=LOWER('Godley');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Brian', 'Godley', NULL, 'brian@picturebuild.com', '(818) 720-9215', 'Owner', 'Admin', 'active');
  END IF;

  -- Bryan Vielman
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Bryan') AND LOWER(last_name)=LOWER('Vielman')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'theebvielman@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '747-217-5378'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Administrator'),
      department  = COALESCE(NULLIF(department,''), 'Admin'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Bryan') AND LOWER(last_name)=LOWER('Vielman');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Bryan', 'Vielman', NULL, 'theebvielman@gmail.com', '747-217-5378', 'Administrator', 'Admin', 'active');
  END IF;

  -- Carlos Maldonado
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Carlos') AND LOWER(last_name)=LOWER('Maldonado')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'alekey330@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '818-614-1821'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Chief'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   'Alex'),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Carlos') AND LOWER(last_name)=LOWER('Maldonado');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Carlos', 'Maldonado', 'Alex', 'alekey330@gmail.com', '818-614-1821', 'Crew Chief', 'Operations', 'active');
  END IF;

  -- Carlos Sosa
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Carlos') AND LOWER(last_name)=LOWER('Sosa')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'cmsosa1983@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '(443) 278-1529'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Chief'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Carlos') AND LOWER(last_name)=LOWER('Sosa');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Carlos', 'Sosa', NULL, 'cmsosa1983@gmail.com', '(443) 278-1529', 'Crew Chief', 'Operations', 'active');
  END IF;

  -- Dana Weinroth
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Dana') AND LOWER(last_name)=LOWER('Weinroth')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'dana@picturebuild.com'),
      phone       = COALESCE(NULLIF(phone,''),      '917-365-3181'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Sales Representative'),
      department  = COALESCE(NULLIF(department,''), 'Sales'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Dana') AND LOWER(last_name)=LOWER('Weinroth');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Dana', 'Weinroth', NULL, 'dana@picturebuild.com', '917-365-3181', 'Sales Representative', 'Sales', 'active');
  END IF;

  -- Daniel Aguilar
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Daniel') AND LOWER(last_name)=LOWER('Aguilar')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'daniel@picturebuild.com'),
      phone       = COALESCE(NULLIF(phone,''),      '(661) 480-3599'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Administrator'),
      department  = COALESCE(NULLIF(department,''), 'Admin'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Daniel') AND LOWER(last_name)=LOWER('Aguilar');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Daniel', 'Aguilar', NULL, 'daniel@picturebuild.com', '(661) 480-3599', 'Administrator', 'Admin', 'active');
  END IF;

  -- Erik Reyes
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Erik') AND LOWER(last_name)=LOWER('Reyes')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'erikm474@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '323-596-8732'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Sales Representative'),
      department  = COALESCE(NULLIF(department,''), 'Sales'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Erik') AND LOWER(last_name)=LOWER('Reyes');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Erik', 'Reyes', NULL, 'erikm474@gmail.com', '323-596-8732', 'Sales Representative', 'Sales', 'active');
  END IF;

  -- Fernando Vega
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Fernando') AND LOWER(last_name)=LOWER('Vega')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'f48vega@icloud.com'),
      phone       = COALESCE(NULLIF(phone,''),      '747-746-8818'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Fernando') AND LOWER(last_name)=LOWER('Vega');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Fernando', 'Vega', NULL, 'f48vega@icloud.com', '747-746-8818', 'Crew Member', 'Operations', 'active');
  END IF;

  -- Fidel Calixto
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Fidel') AND LOWER(last_name)=LOWER('Calixto')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'fidelshakacalixto@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '(818) 414-9778'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Chief'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   'Shaka'),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Fidel') AND LOWER(last_name)=LOWER('Calixto');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Fidel', 'Calixto', 'Shaka', 'fidelshakacalixto@gmail.com', '(818) 414-9778', 'Crew Chief', 'Operations', 'active');
  END IF;

  -- Fidel Corona
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Fidel') AND LOWER(last_name)=LOWER('Corona')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'fidelac62@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '(818) 207-1719'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Chief'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Fidel') AND LOWER(last_name)=LOWER('Corona');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Fidel', 'Corona', NULL, 'fidelac62@gmail.com', '(818) 207-1719', 'Crew Chief', 'Operations', 'active');
  END IF;

  -- Francisco Lazaro
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Francisco') AND LOWER(last_name)=LOWER('Lazaro')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'lazaro.francisco.me@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '818-966-1627'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   'Pancho'),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Francisco') AND LOWER(last_name)=LOWER('Lazaro');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Francisco', 'Lazaro', 'Pancho', 'lazaro.francisco.me@gmail.com', '818-966-1627', 'Crew Member', 'Operations', 'active');
  END IF;

  -- Hebert Mejia
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Hebert') AND LOWER(last_name)=LOWER('Mejia')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'hebertpaultorres@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '240-701-8373'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Hebert') AND LOWER(last_name)=LOWER('Mejia');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Hebert', 'Mejia', NULL, 'hebertpaultorres@gmail.com', '240-701-8373', 'Crew Member', 'Operations', 'active');
  END IF;

  -- Hector Martinez
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Hector') AND LOWER(last_name)=LOWER('Martinez')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'infernokuskatan@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '747-282-4340'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Hector') AND LOWER(last_name)=LOWER('Martinez');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Hector', 'Martinez', NULL, 'infernokuskatan@gmail.com', '747-282-4340', 'Crew Member', 'Operations', 'active');
  END IF;

  -- Hugo Galan
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Hugo') AND LOWER(last_name)=LOWER('Galan')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'marroquinhugo075@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      NULL),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'archived'
    WHERE LOWER(first_name)=LOWER('Hugo') AND LOWER(last_name)=LOWER('Galan');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Hugo', 'Galan', NULL, 'marroquinhugo075@gmail.com', NULL, 'Crew Member', 'Operations', 'archived');
  END IF;

  -- Hugo Guzman
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Hugo') AND LOWER(last_name)=LOWER('Guzman')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'hugoguzmanga@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '323-826-8051'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Hugo') AND LOWER(last_name)=LOWER('Guzman');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Hugo', 'Guzman', NULL, 'hugoguzmanga@gmail.com', '323-826-8051', 'Crew Member', 'Operations', 'active');
  END IF;

  -- Ignacio “Nacho” Iniguez
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Ignacio') AND LOWER(last_name)=LOWER('“Nacho” Iniguez')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'iniguez.ignacio@yahoo.com'),
      phone       = COALESCE(NULLIF(phone,''),      '(818) 934-3298'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Chief'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Ignacio') AND LOWER(last_name)=LOWER('“Nacho” Iniguez');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Ignacio', '“Nacho” Iniguez', NULL, 'iniguez.ignacio@yahoo.com', '(818) 934-3298', 'Crew Chief', 'Operations', 'active');
  END IF;

  -- Ignacio Chavez
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Ignacio') AND LOWER(last_name)=LOWER('Chavez')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'lol@me.net'),
      phone       = COALESCE(NULLIF(phone,''),      '818-770-4321'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Ignacio') AND LOWER(last_name)=LOWER('Chavez');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Ignacio', 'Chavez', NULL, 'lol@me.net', '818-770-4321', 'Crew Member', 'Operations', 'active');
  END IF;

  -- James Durso
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('James') AND LOWER(last_name)=LOWER('Durso')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'james@picturebuild.com'),
      phone       = COALESCE(NULLIF(phone,''),      NULL),
      job_title   = COALESCE(NULLIF(job_title,''),  'Administrator'),
      department  = COALESCE(NULLIF(department,''), 'Admin'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('James') AND LOWER(last_name)=LOWER('Durso');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('James', 'Durso', NULL, 'james@picturebuild.com', NULL, 'Administrator', 'Admin', 'active');
  END IF;

  -- Jason Hatheway
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Jason') AND LOWER(last_name)=LOWER('Hatheway')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'jason@hathewaydesign.com'),
      phone       = COALESCE(NULLIF(phone,''),      '626-864-3634'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Sales Representative'),
      department  = COALESCE(NULLIF(department,''), 'Sales'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'archived'
    WHERE LOWER(first_name)=LOWER('Jason') AND LOWER(last_name)=LOWER('Hatheway');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Jason', 'Hatheway', NULL, 'jason@hathewaydesign.com', '626-864-3634', 'Sales Representative', 'Sales', 'archived');
  END IF;

  -- Javier Andrade
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Javier') AND LOWER(last_name)=LOWER('Andrade')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'javi@picturebuild.com'),
      phone       = COALESCE(NULLIF(phone,''),      '310-254-7984'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Administrator'),
      department  = COALESCE(NULLIF(department,''), 'Admin'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Javier') AND LOWER(last_name)=LOWER('Andrade');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Javier', 'Andrade', NULL, 'javi@picturebuild.com', '310-254-7984', 'Administrator', 'Admin', 'active');
  END IF;

  -- Jesus Gallo
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Jesus') AND LOWER(last_name)=LOWER('Gallo')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'jessiegallo34@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '8182746359'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   'Jesse'),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Jesus') AND LOWER(last_name)=LOWER('Gallo');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Jesus', 'Gallo', 'Jesse', 'jessiegallo34@gmail.com', '8182746359', 'Crew Member', 'Operations', 'active');
  END IF;

  -- Jesus Panuco
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Jesus') AND LOWER(last_name)=LOWER('Panuco')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'jesuspanuco97@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '818-691-9054'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Chief'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Jesus') AND LOWER(last_name)=LOWER('Panuco');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Jesus', 'Panuco', NULL, 'jesuspanuco97@gmail.com', '818-691-9054', 'Crew Chief', 'Operations', 'active');
  END IF;

  -- Jimmy Lopez
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Jimmy') AND LOWER(last_name)=LOWER('Lopez')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'abjunitedvalet@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '+1 747 299 6322'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Chief'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Jimmy') AND LOWER(last_name)=LOWER('Lopez');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Jimmy', 'Lopez', NULL, 'abjunitedvalet@gmail.com', '+1 747 299 6322', 'Crew Chief', 'Operations', 'active');
  END IF;

  -- John Durso
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('John') AND LOWER(last_name)=LOWER('Durso')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'john@picturebuild.com'),
      phone       = COALESCE(NULLIF(phone,''),      '818 441 8966'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Owner'),
      department  = COALESCE(NULLIF(department,''), 'Admin'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('John') AND LOWER(last_name)=LOWER('Durso');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('John', 'Durso', NULL, 'john@picturebuild.com', '818 441 8966', 'Owner', 'Admin', 'active');
  END IF;

  -- Jose Rosas
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Jose') AND LOWER(last_name)=LOWER('Rosas')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'marcelinocharli528@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '818 470 4954'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Chief'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Jose') AND LOWER(last_name)=LOWER('Rosas');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Jose', 'Rosas', NULL, 'marcelinocharli528@gmail.com', '818 470 4954', 'Crew Chief', 'Operations', 'active');
  END IF;

  -- Juan Campos
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Juan') AND LOWER(last_name)=LOWER('Campos')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'juancarloscamposluna6@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '346-255-2203'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Juan') AND LOWER(last_name)=LOWER('Campos');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Juan', 'Campos', NULL, 'juancarloscamposluna6@gmail.com', '346-255-2203', 'Crew Member', 'Operations', 'active');
  END IF;

  -- Juan Rodriguez
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Juan') AND LOWER(last_name)=LOWER('Rodriguez')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'rodriguezdan16@icloud.com'),
      phone       = COALESCE(NULLIF(phone,''),      '747-250-6079'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Chief'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Juan') AND LOWER(last_name)=LOWER('Rodriguez');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Juan', 'Rodriguez', NULL, 'rodriguezdan16@icloud.com', '747-250-6079', 'Crew Chief', 'Operations', 'active');
  END IF;

  -- JuanCarlos Vallejo
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('JuanCarlos') AND LOWER(last_name)=LOWER('Vallejo')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'jcv91335@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '(818) 522-1424'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Chief'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('JuanCarlos') AND LOWER(last_name)=LOWER('Vallejo');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('JuanCarlos', 'Vallejo', NULL, 'jcv91335@gmail.com', '(818) 522-1424', 'Crew Chief', 'Operations', 'active');
  END IF;

  -- Justin Gonzales
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Justin') AND LOWER(last_name)=LOWER('Gonzales')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'justin.gonz311@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '818-799-2871'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Justin') AND LOWER(last_name)=LOWER('Gonzales');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Justin', 'Gonzales', NULL, 'justin.gonz311@gmail.com', '818-799-2871', 'Crew Member', 'Operations', 'active');
  END IF;

  -- Juventino Acevedo
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Juventino') AND LOWER(last_name)=LOWER('Acevedo')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'm.rahman095@me.net'),
      phone       = COALESCE(NULLIF(phone,''),      '818-471-8228'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'archived'
    WHERE LOWER(first_name)=LOWER('Juventino') AND LOWER(last_name)=LOWER('Acevedo');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Juventino', 'Acevedo', NULL, 'm.rahman095@me.net', '818-471-8228', 'Crew Member', 'Operations', 'archived');
  END IF;

  -- Kevin Torres
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Kevin') AND LOWER(last_name)=LOWER('Torres')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'kevtorres1081@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '980-319-6968'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Kevin') AND LOWER(last_name)=LOWER('Torres');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Kevin', 'Torres', NULL, 'kevtorres1081@gmail.com', '980-319-6968', 'Crew Member', 'Operations', 'active');
  END IF;

  -- Lucas Rosas
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Lucas') AND LOWER(last_name)=LOWER('Rosas')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'elche2k@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '747 201 1248'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   'Jose'),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Lucas') AND LOWER(last_name)=LOWER('Rosas');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Lucas', 'Rosas', 'Jose', 'elche2k@gmail.com', '747 201 1248', 'Crew Member', 'Operations', 'active');
  END IF;

  -- Luis Rosas
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Luis') AND LOWER(last_name)=LOWER('Rosas')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'luisrosas199723@icloud.com'),
      phone       = COALESCE(NULLIF(phone,''),      '747-252-8422'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Chief'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Luis') AND LOWER(last_name)=LOWER('Rosas');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Luis', 'Rosas', NULL, 'luisrosas199723@icloud.com', '747-252-8422', 'Crew Chief', 'Operations', 'active');
  END IF;

  -- Malaquias Sanchez
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Malaquias') AND LOWER(last_name)=LOWER('Sanchez')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'manuelsanchez1970b@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '213-926-3948'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Malaquias') AND LOWER(last_name)=LOWER('Sanchez');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Malaquias', 'Sanchez', NULL, 'manuelsanchez1970b@gmail.com', '213-926-3948', 'Crew Member', 'Operations', 'active');
  END IF;

  -- Marco Pacheco
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Marco') AND LOWER(last_name)=LOWER('Pacheco')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'marckpol2110@yahoo.com'),
      phone       = COALESCE(NULLIF(phone,''),      '661 964 9907'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Chief'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Marco') AND LOWER(last_name)=LOWER('Pacheco');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Marco', 'Pacheco', NULL, 'marckpol2110@yahoo.com', '661 964 9907', 'Crew Chief', 'Operations', 'active');
  END IF;

  -- Maximino Sanchez
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Maximino') AND LOWER(last_name)=LOWER('Sanchez')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'max.sanchez1984@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '213-276-3332'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Chief'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Maximino') AND LOWER(last_name)=LOWER('Sanchez');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Maximino', 'Sanchez', NULL, 'max.sanchez1984@gmail.com', '213-276-3332', 'Crew Chief', 'Operations', 'active');
  END IF;

  -- Nicole Antoine
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Nicole') AND LOWER(last_name)=LOWER('Antoine')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'nicole@picturebuild.com'),
      phone       = COALESCE(NULLIF(phone,''),      '415-947-9701'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Sales Representative'),
      department  = COALESCE(NULLIF(department,''), 'Sales'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Nicole') AND LOWER(last_name)=LOWER('Antoine');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Nicole', 'Antoine', NULL, 'nicole@picturebuild.com', '415-947-9701', 'Sales Representative', 'Sales', 'active');
  END IF;

  -- Oscar Valdez
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Oscar') AND LOWER(last_name)=LOWER('Valdez')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'valdezoscar97@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '6617435889'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Sales Representative'),
      department  = COALESCE(NULLIF(department,''), 'Sales'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Oscar') AND LOWER(last_name)=LOWER('Valdez');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Oscar', 'Valdez', NULL, 'valdezoscar97@gmail.com', '6617435889', 'Sales Representative', 'Sales', 'active');
  END IF;

  -- Rafael Aguilar
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Rafael') AND LOWER(last_name)=LOWER('Aguilar')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'rafael.aguilar1227@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      NULL),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Chief'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Rafael') AND LOWER(last_name)=LOWER('Aguilar');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Rafael', 'Aguilar', NULL, 'rafael.aguilar1227@gmail.com', NULL, 'Crew Chief', 'Operations', 'active');
  END IF;

  -- Rigoberto Navarro
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Rigoberto') AND LOWER(last_name)=LOWER('Navarro')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'rigonavarro45@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '818-863-2409'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   'Rigo'),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Rigoberto') AND LOWER(last_name)=LOWER('Navarro');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Rigoberto', 'Navarro', 'Rigo', 'rigonavarro45@gmail.com', '818-863-2409', 'Crew Member', 'Operations', 'active');
  END IF;

  -- Roman DeAngelis
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Roman') AND LOWER(last_name)=LOWER('DeAngelis')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'steelershark@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '918-810-4177'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Roman') AND LOWER(last_name)=LOWER('DeAngelis');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Roman', 'DeAngelis', NULL, 'steelershark@gmail.com', '918-810-4177', 'Crew Member', 'Operations', 'active');
  END IF;

  -- Roy Kimchi
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Roy') AND LOWER(last_name)=LOWER('Kimchi')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'roykimchi1@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      NULL),
      job_title   = COALESCE(NULLIF(job_title,''),  'Sales Representative'),
      department  = COALESCE(NULLIF(department,''), 'Sales'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Roy') AND LOWER(last_name)=LOWER('Kimchi');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Roy', 'Kimchi', NULL, 'roykimchi1@gmail.com', NULL, 'Sales Representative', 'Sales', 'active');
  END IF;

  -- Ryan Jimenez
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Ryan') AND LOWER(last_name)=LOWER('Jimenez')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'ryanjimenez46@yahoo.com'),
      phone       = COALESCE(NULLIF(phone,''),      '818 263 6615'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Ryan') AND LOWER(last_name)=LOWER('Jimenez');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Ryan', 'Jimenez', NULL, 'ryanjimenez46@yahoo.com', '818 263 6615', 'Crew Member', 'Operations', 'active');
  END IF;

  -- Salvador Calixto
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Salvador') AND LOWER(last_name)=LOWER('Calixto')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'salcalixto1128@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '(818) 416-9673'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Chief'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Salvador') AND LOWER(last_name)=LOWER('Calixto');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Salvador', 'Calixto', NULL, 'salcalixto1128@gmail.com', '(818) 416-9673', 'Crew Chief', 'Operations', 'active');
  END IF;

  -- Verva Gerse
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Verva') AND LOWER(last_name)=LOWER('Gerse')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'verva@picturebuild.com'),
      phone       = COALESCE(NULLIF(phone,''),      '(818) 419-8326'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Sales Representative'),
      department  = COALESCE(NULLIF(department,''), 'Sales'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'archived'
    WHERE LOWER(first_name)=LOWER('Verva') AND LOWER(last_name)=LOWER('Gerse');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Verva', 'Gerse', NULL, 'verva@picturebuild.com', '(818) 419-8326', 'Sales Representative', 'Sales', 'archived');
  END IF;

  -- Victor Nazario Torres
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Victor') AND LOWER(last_name)=LOWER('Nazario Torres')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'vnazario296@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '661-643-4946'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Victor') AND LOWER(last_name)=LOWER('Nazario Torres');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Victor', 'Nazario Torres', NULL, 'vnazario296@gmail.com', '661-643-4946', 'Crew Member', 'Operations', 'active');
  END IF;

  -- Wilians Sibrian
  IF EXISTS (SELECT 1 FROM employees WHERE LOWER(first_name)=LOWER('Wilians') AND LOWER(last_name)=LOWER('Sibrian')) THEN
    UPDATE employees SET
      email       = COALESCE(NULLIF(email,''),      'williamsibrian09@gmail.com'),
      phone       = COALESCE(NULLIF(phone,''),      '818-335-6973'),
      job_title   = COALESCE(NULLIF(job_title,''),  'Crew Member'),
      department  = COALESCE(NULLIF(department,''), 'Operations'),
      nickname    = COALESCE(NULLIF(nickname,''),   NULL),
      status      = 'active'
    WHERE LOWER(first_name)=LOWER('Wilians') AND LOWER(last_name)=LOWER('Sibrian');
  ELSE
    INSERT INTO employees (first_name, last_name, nickname, email, phone, job_title, department, status)
    VALUES ('Wilians', 'Sibrian', NULL, 'williamsibrian09@gmail.com', '818-335-6973', 'Crew Member', 'Operations', 'active');
  END IF;

END $$;