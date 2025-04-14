-- Main tables
CREATE TABLE IF NOT EXISTS allowed_roll_numbers (
  roll_number VARCHAR(20) PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  roll_number VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  password VARCHAR(100) NOT NULL, -- Store hashed passwords in production
  gender ENUM('male','female','other') NOT NULL,
  program VARCHAR(50) NOT NULL,
  year INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
  room_id INT AUTO_INCREMENT PRIMARY KEY,
  room_no VARCHAR(10) UNIQUE NOT NULL,
  capacity INT NOT NULL,
  current_occupancy INT DEFAULT 0,
  status ENUM('available','maintenance','occupied') DEFAULT 'available'
);

-- Junction tables
CREATE TABLE IF NOT EXISTS allocations (
  allocation_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  room_id INT NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE DEFAULT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('paid','unpaid') DEFAULT 'unpaid',
  due_date DATE NOT NULL,
  payment_date DATE DEFAULT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
-- 1. Hostels Table
CREATE TABLE hostels (
  hostel_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  gender ENUM('male','female') NOT NULL,
  program ENUM('BTech','MTech') NOT NULL,
  year INT NULL -- NULL means all years
);

-- 2. Rooms Table (updated)
ALTER TABLE rooms ADD COLUMN hostel_id INT NOT NULL AFTER room_id;
ALTER TABLE rooms ADD FOREIGN KEY (hostel_id) REFERENCES hostels(hostel_id);

-- -- 3. Payments Table (updated)
-- ALTER TABLE payments 
-- ADD COLUMN application_id INT NOT NULL AFTER payment_id,
-- ADD COLUMN period_start DATE NOT NULL,
-- ADD COLUMN period_end DATE NOT NULL;

-- -- 4. Applications Table
-- CREATE TABLE applications (
--   application_id INT AUTO_INCREMENT PRIMARY KEY,
--   student_id INT NOT NULL,
--   hostel_id INT NOT NULL,
--   status ENUM('pending','approved','rejected') DEFAULT 'pending',
--   FOREIGN KEY (student_id) REFERENCES students(id),
--   FOREIGN KEY (hostel_id) REFERENCES hostels(hostel_id)
-- );

-- Applications table (if not exists)
CREATE TABLE IF NOT EXISTS applications (
  application_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  hostel_id INT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (hostel_id) REFERENCES hostels(hostel_id)
);

-- Payments table (if not exists)
CREATE TABLE IF NOT EXISTS payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  student_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('paid','unpaid') DEFAULT 'unpaid',
  payment_date DATE DEFAULT NULL,
  FOREIGN KEY (application_id) REFERENCES applications(application_id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

