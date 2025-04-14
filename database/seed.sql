-- Sample admin user
INSERT INTO admins (username, password) VALUES 
('admin', 'securepassword123'); -- Hash this in production!

-- Sample allowed roll numbers
INSERT INTO allowed_roll_numbers (roll_number) VALUES 
('23CS8001'), ('23CS8002'), ('23CS8003');

-- Sample rooms
INSERT INTO rooms (room_no, capacity) VALUES
('A101', 2),
('A102', 3),
('B201', 4);

-- Hostels (as per your requirements)
INSERT INTO hostels (name, gender, program, year) VALUES
-- Girls Hostels
('Hall 10', 'female', 'BTech', 1),
('Hall 13', 'female', 'BTech', NULL), -- All years
('Hall 13', 'female', 'MTech', NULL),
-- Boys Hostels
('Hall 11', 'male', 'BTech', 1),
('Hall 14', 'male', 'BTech', 2),
('Hall 2', 'male', 'BTech', 3),
('Hall 1', 'male', 'BTech', 4),
('Hall 14', 'male', 'MTech', NULL);

-- Rooms (150 per hostel, capacity=3)
INSERT INTO rooms (hostel_id, room_no, capacity)
SELECT hostel_id, CONCAT('R', n), 3 
FROM hostels 
CROSS JOIN (SELECT 1 AS n UNION SELECT 2 UNION ... UNION SELECT 150) numbers;

DELIMITER //
CREATE PROCEDURE InsertRooms()
BEGIN
    DECLARE i INT DEFAULT 1;
    WHILE i <= 150 DO
        INSERT INTO rooms (hostel_id, room_no, capacity)
        SELECT hostel_id, CONCAT('R', i), 3 FROM hostels;
        SET i = i + 1;
    END WHILE;
END //
DELIMITER ;

CALL InsertRooms();
DROP PROCEDURE InsertRooms;