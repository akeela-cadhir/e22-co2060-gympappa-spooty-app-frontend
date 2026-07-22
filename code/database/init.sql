-- =====================================================
-- GympAPPa Safe Database Initialization Script
-- Idempotent version — safe to run multiple times.
-- Does NOT drop tables or delete existing data.
-- =====================================================

-- =========================
-- USER TABLE
-- =========================
CREATE TABLE IF NOT EXISTS "user" (
  user_id VARCHAR(20) PRIMARY KEY,
  role VARCHAR(50) NOT NULL DEFAULT 'student'
    CHECK (role IN ('student', 'games-captain', 'admin', 'counter-staff', 'psu', 'faculty-coordinator', 'coach', 'private-coach', 'academic-staff')),
  university_email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255),
  password_set BOOLEAN NOT NULL DEFAULT FALSE,
  auth_provider VARCHAR(20) NOT NULL DEFAULT 'password'
    CHECK (auth_provider IN ('password', 'firebase', 'hybrid')),
  firebase_uid VARCHAR(255) UNIQUE,
  profile_picture TEXT,
  tel VARCHAR(20),
  personal_email VARCHAR(255),
  district VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_id ON "user"(user_id);
CREATE INDEX IF NOT EXISTS idx_university_email ON "user"(university_email);
CREATE INDEX IF NOT EXISTS idx_role ON "user"(role);

-- =========================
-- ROLE REQUEST TABLE
-- =========================
CREATE TABLE IF NOT EXISTS role_request (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL,
  requested_role VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR(20),

  FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES "user"(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_role_request_user_id ON role_request(user_id);
CREATE INDEX IF NOT EXISTS idx_role_request_status ON role_request(status);

-- =========================
-- SPORTS TABLE
-- =========================
CREATE TABLE IF NOT EXISTS sports (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

-- =========================
-- EQUIPMENT TABLE
-- =========================
CREATE TABLE IF NOT EXISTS equipment (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

-- =========================
-- SPORT_EQUIPMENT TABLE
-- =========================
CREATE TABLE IF NOT EXISTS sport_equipment (
  id SERIAL PRIMARY KEY,
  sport_id INT NOT NULL,
  equipment_id INT NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  total_quantity INT NOT NULL,
  remaining_quantity INT NOT NULL,

  FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

-- =========================
-- REQUESTED EQUIPMENT TABLE
-- =========================
CREATE TABLE IF NOT EXISTS requested_equipment (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL,
  equipment_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  issued_quantity INT NOT NULL DEFAULT 0,
  returned_quantity INT NOT NULL DEFAULT 0,
  pickup_time VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'issued', 'pending_return', 'returned', 'cancelled')),
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (equipment_id) REFERENCES sport_equipment(id) ON DELETE CASCADE
);

-- =========================
-- INDEXES
-- =========================
CREATE INDEX IF NOT EXISTS idx_sport_equipment_sport_id ON sport_equipment(sport_id);
CREATE INDEX IF NOT EXISTS idx_sport_equipment_equipment_id ON sport_equipment(equipment_id);
CREATE INDEX IF NOT EXISTS idx_requested_equipment_student_id ON requested_equipment(student_id);
CREATE INDEX IF NOT EXISTS idx_requested_equipment_equipment_id ON requested_equipment(equipment_id);
CREATE INDEX IF NOT EXISTS idx_requested_equipment_status ON requested_equipment(status);

-- =========================
-- PARTNER FINDER TABLES
-- =========================
CREATE TABLE IF NOT EXISTS partner_requests (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL,
  sport VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10),
  venue VARCHAR(255),
  skill_level VARCHAR(30) NOT NULL,
  gender_preference VARCHAR(30) DEFAULT 'Anyone',
  notes TEXT,
  status VARCHAR(20) DEFAULT 'open'
    CHECK (status IN ('open','pending','matched','expired','cancelled','closed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES "user"(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS partner_join_requests (
  id SERIAL PRIMARY KEY,
  request_id INT NOT NULL,
  requester_id VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','rejected','matched','cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES partner_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (requester_id) REFERENCES "user"(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  receiver_id VARCHAR(20) NOT NULL,
  sender_id VARCHAR(20),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_request INT,
  related_join_request INT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (receiver_id) REFERENCES "user"(user_id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES "user"(user_id) ON DELETE SET NULL,
  FOREIGN KEY (related_request) REFERENCES partner_requests(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_partner_requests_user_id ON partner_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_requests_status ON partner_requests(status);
CREATE INDEX IF NOT EXISTS idx_partner_requests_date ON partner_requests(date);
CREATE INDEX IF NOT EXISTS idx_partner_join_requests_request_id ON partner_join_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_partner_join_requests_requester_id ON partner_join_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_notifications_receiver_id ON notifications(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- =========================
-- COURT & VENUE AVAILABILITY SCHEMA (NEW)
-- =========================

CREATE TABLE IF NOT EXISTS courts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  sport_id INT,
  location VARCHAR(255),
  capacity INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS court_status (
  id SERIAL PRIMARY KEY,
  court_id INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(20),
  reason TEXT,


  FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES "user"(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS gym_crowd_status (
  id SERIAL PRIMARY KEY,
  location VARCHAR(100) NOT NULL,
  crowd_level VARCHAR(20) NOT NULL DEFAULT 'low'
    CHECK (crowd_level IN ('low', 'medium', 'high', 'full')),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(20),

  FOREIGN KEY (updated_by) REFERENCES "user"(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_courts_sport_id ON courts(sport_id);
CREATE INDEX IF NOT EXISTS idx_court_status_court_id ON court_status(court_id);
CREATE INDEX IF NOT EXISTS idx_court_status_status ON court_status(status);
CREATE INDEX IF NOT EXISTS idx_gym_crowd_status_location ON gym_crowd_status(location);

-- =========================
-- EVENT & TOURNAMENT MANAGEMENT TABLES
-- =========================
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  item_type VARCHAR(20) NOT NULL DEFAULT 'event' CHECK (item_type IN ('event','tournament')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  banner_path TEXT,
  start_date DATE,
  end_date DATE,
  start_time VARCHAR(20),
  end_time VARCHAR(20),
  preparation_start_time VARCHAR(20),
  handover_time VARCHAR(20),
  notes TEXT,
  main_gym_selected BOOLEAN DEFAULT FALSE,
  selected_courts JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  creator_id VARCHAR(20) NOT NULL,
  request_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES "user"(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS event_requests (
  id SERIAL PRIMARY KEY,
  request_type VARCHAR(20) NOT NULL DEFAULT 'event' CHECK (request_type IN ('event','tournament')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  banner_path TEXT,
  start_date DATE,
  end_date DATE,
  start_time VARCHAR(20),
  end_time VARCHAR(20),
  preparation_start_time VARCHAR(20),
  handover_time VARCHAR(20),
  notes TEXT,
  main_gym_selected BOOLEAN DEFAULT FALSE,
  selected_courts JSONB DEFAULT '[]'::jsonb,
  sport_entries JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  creator_id VARCHAR(20) NOT NULL,
  review_message TEXT,
  reviewed_by VARCHAR(20),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES "user"(user_id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES "user"(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tournament_sports (
  id SERIAL PRIMARY KEY,
  tournament_id INT NOT NULL,
  sport_name VARCHAR(100) NOT NULL,
  sport_date DATE,
  start_time VARCHAR(20),
  end_time VARCHAR(20),
  court_name VARCHAR(255),
  game_banner TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tournament_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_events_creator_id ON events(creator_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_event_requests_creator_id ON event_requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_event_requests_status ON event_requests(status);
CREATE INDEX IF NOT EXISTS idx_tournament_sports_tournament_id ON tournament_sports(tournament_id);

-- =========================
-- TRIGGER FUNCTION
-- =========================
CREATE OR REPLACE FUNCTION update_user_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_updated_at ON "user";

CREATE TRIGGER trigger_update_user_updated_at
BEFORE UPDATE ON "user"
FOR EACH ROW
EXECUTE FUNCTION update_user_updated_at();

-- =========================
-- INSERT SAMPLE DATA (SAFE / NON-DUPLICATING)
-- =========================

-- SPORTS
INSERT INTO sports (name) VALUES
('Badminton'), ('Baseball'), ('Basketball'), ('Boxing'), ('Chess'),
('Cricket'), ('Elle'), ('Football'), ('Hockey'), ('Rugby'),
('Table Tennis'), ('Tennis'), ('Track & Field'), ('Volleyball'), ('Netball')
ON CONFLICT (name) DO NOTHING;

-- COURTS & VENUES
INSERT INTO courts (name, sport_id, location, capacity)
SELECT v.name, s.id, v.location, v.capacity
FROM (VALUES
  ('Badminton Court', 'Badminton', 'Indoor Gymnasium', 12),
  ('Basketball Court', 'Basketball', 'Indoor Gymnasium', 10),
  ('Volleyball Court Indoor', 'Volleyball', 'Indoor Gymnasium', 12),
  ('Volleyball Court Outdoor', 'Volleyball', 'Outdoor', 12),
  ('Table Tennis Area', 'Table Tennis', 'Indoor Gymnasium', 6),
  ('Carrom Room', 'Carrom', 'Indoor Gymnasium', 4),
  ('Chess Room', 'Chess', 'Indoor Gymnasium', 8),
  ('Cricket Ground', 'Cricket', 'Outdoor', 22),
  ('Football Field', 'Football', 'Outdoor', 22),
  ('Rugby Ground', 'Rugby', 'Outdoor', 30),
  ('Hockey Field', 'Hockey', 'Outdoor', 22),
  ('Tennis Court', 'Tennis', 'Outdoor', 4),
  ('Netball Court Indoor', 'Netball', 'Outdoor', 14),
  ('Netball Court Outdoor', 'Netball', 'Indoor', 14),
  ('Main Gymnasium Hall', NULL, 'Main Gymnasium Hall', 50)
) AS v(name, sport_name, location, capacity)
LEFT JOIN sports s ON s.name = v.sport_name
WHERE NOT EXISTS (
  SELECT 1 FROM courts c
  WHERE c.name = v.name
);


-- EQUIPMENT
INSERT INTO equipment (name) VALUES
('Bat'), ('Ball'), ('Racket'), ('Shuttlecock'),
('Gloves'), ('Shoes'), ('Uniform'), ('Pad'),
('Helmet'), ('Javelin'), ('Shot Put'), ('Clock')
ON CONFLICT (name) DO NOTHING;

-- SPORT_EQUIPMENT
-- (no unique constraint exists on this table, so we use
--  INSERT ... SELECT ... WHERE NOT EXISTS to avoid duplicates
--  without altering the schema)
INSERT INTO sport_equipment (sport_id, equipment_id, display_name, total_quantity, remaining_quantity)
SELECT v.sport_id, v.equipment_id, v.display_name, v.total_quantity, v.remaining_quantity
FROM (VALUES
  (6, 1, 'Cricket Bat', 6, 6),
  (6, 2, 'Cricket Ball', 10, 10),
  (2, 1, 'Baseball Bat', 6, 6),
  (2, 2, 'Baseball', 10, 10),
  (3, 2, 'Basketball', 6, 6),
  (12, 3, 'Tennis Racket', 8, 8),
  (12, 2, 'Tennis Ball', 20, 20),
  (11, 3, 'Table Tennis Racket', 10, 10),
  (11, 2, 'Table Tennis Ball', 20, 20),
  (1, 3, 'Badminton Racket', 10, 10),
  (1, 4, 'Shuttlecock', 20, 20),
  (14, 2, 'Volleyball', 6, 6),
  (8, 2, 'Football', 6, 6),
  (10, 2, 'Rugby Ball', 4, 4),
  (9, 2, 'Hockey Ball', 10, 10),
  (7, 2, 'Elle Ball', 6, 6),
  (5, 8, 'Chess Board', 5, 5),
  (7, 1, 'Elle Bat', 10, 10),
  (9, 1, 'Hockey Bat', 10, 10),
  (4, 5, 'Boxing Gloves', 10, 10),
  (13, 10, 'Javelin', 10, 10),
  (13, 11, 'Shot Put', 10, 10),
  (5, 12, 'Chess Clock', 10, 10)
) AS v(sport_id, equipment_id, display_name, total_quantity, remaining_quantity)
WHERE NOT EXISTS (
  SELECT 1 FROM sport_equipment se
  WHERE se.sport_id = v.sport_id
    AND se.equipment_id = v.equipment_id
    AND se.display_name = v.display_name
);