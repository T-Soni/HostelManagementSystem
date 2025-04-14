const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// app.use(cors());
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'], // Your frontend origin
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true
}));

// Add this OPTIONS handler
app.options('*', cors());
app.use(express.json());
app.use(express.static('public'));

// MySQL Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('MySQL connection error:', err);
        return;
    }
    console.log('Connected to MySQL DB!');
});

// === API ENDPOINTS ===

app.get('/api/db-test', (req, res) => {
    db.query('SELECT 1 + 1 AS solution', (err, results) => {
        if (err) return res.status(500).json({ error: 'Database connection failed' });
        res.json({ solution: results[0].solution }); // Should return 2
    });
});

// 1. Get allowed roll numbers
app.get('/api/allowed-rolls', (req, res) => {
    db.query('SELECT roll_number FROM allowed_roll_numbers', (err, results) => {
        if (err) {
            console.error('Error fetching allowed rolls:', err);
            return res.status(500).json({ success: false, error: err });
        }
        //const rolls = results.map(row => row.roll_number);
        const rolls = results.map(row => String(row.roll_number));
        res.json(rolls);

    });
});
// Add this before your routes
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
// 2. Register student
app.post('/api/register', (req, res) => {
    const { roll, name, password, gender, program, year } = req.body;

    if (!roll || !name || !password || !gender || !program || !year) {
        return res.json({ success: false, message: "Missing fields" });
    }

    // Check if roll is allowed
    console.log("Checking roll:", roll);

    db.query('SELECT * FROM allowed_roll_numbers WHERE roll_number = ?', [roll], (err, allowedResult) => {
        console.log("Allowed roll check result:", allowedResult);
        if (err) return res.status(500).json({ success: false, error: err });

        if (allowedResult.length === 0) {
            return res.json({ success: false, message: "Invalid roll number" });
        }


        // Check if already registered
        db.query('SELECT * FROM students WHERE roll_number = ?', [roll], (err, studentResult) => {
            if (err) return res.status(500).json({ success: false, error: err });

            if (studentResult.length > 0) {
                return res.json({ success: false, message: "Already registered" });
            }

            // Insert new student
            const insertQuery = `
        INSERT INTO students (roll_number, name, password, gender, program, year)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
            db.query(insertQuery, [roll, name, password, gender, program, year], (err) => {
                if (err) return res.status(500).json({ success: false, error: err });
                res.status(201).json({ success: true, message: "Registered successfully!" });
            });
        });
    });
});

// 3. Login
app.post('/api/login', (req, res) => {
    const { role } = req.body;

    if (role === 'student') {
        const { roll, password } = req.body;

        db.query('SELECT * FROM students WHERE roll_number = ?', [roll], (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ success: false, error: err });
            }
            if (results.length === 0) {
                return res.json({ exists: false, match: false });
            }
            const student = results[0];
            const passwordMatch = (student.password === password);

            res.json({
                exists: true,
                match: passwordMatch,
                studentData: {  // Send additional data if needed
                    name: student.name,
                    roll: student.roll_number
                }
            });
            // if (student.password !== password) return res.json({ exists: true, match: false });
            // return res.json({ exists: true, match: true });
        });
    }

    else if (role === 'admin') {
        const { username, password } = req.body;

        db.query('SELECT * FROM admins WHERE username = ?', [username], (err, results) => {
            if (err) return res.status(500).json({ success: false, error: err });

            if (results.length === 0) return res.json({ exists: false });
            const admin = results[0];

            if (admin.password !== password) return res.json({ exists: true, match: false });
            return res.json({ exists: true, match: true });
        });
    }

    else {
        res.json({ success: false, message: "Invalid role" });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

app.get('/api/reports/occupancy', (req, res) => {
    db.query(`
      SELECT r.room_no, r.capacity, r.current_occupancy, 
             GROUP_CONCAT(s.name) AS occupants
      FROM rooms r
      LEFT JOIN allocations a ON r.room_id = a.room_id
      LEFT JOIN students s ON a.student_id = s.id
      GROUP BY r.room_id
    `, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Get all rooms
app.get('/api/rooms', (req, res) => {
    db.query('SELECT * FROM rooms WHERE status = "available"', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Allocate room
app.post('/api/allocate-room', (req, res) => {
    const { roll, roomId } = req.body;

    // 1. Check if student exists
    db.query('SELECT id FROM students WHERE roll_number = ?', [roll], (err, student) => {
        if (err) return res.status(500).json({ error: err.message });
        if (student.length === 0) return res.status(404).json({ message: 'Student not found' });

        // 2. Check room capacity
        db.query('SELECT capacity, current_occupancy FROM rooms WHERE room_id = ?', [roomId], (err, room) => {
            if (room[0].current_occupancy >= room[0].capacity) {
                return res.status(400).json({ message: 'Room is full' });
            }

            // 3. Allocate room
            db.query(
                'INSERT INTO allocations (student_id, room_id, check_in_date) VALUES (?, ?, CURDATE())',
                [student[0].id, roomId],
                (err) => {
                    if (err) return res.status(500).json({ error: err.message });

                    // Update room occupancy
                    db.query('UPDATE rooms SET current_occupancy = current_occupancy + 1 WHERE room_id = ?', [roomId]);
                    res.json({ message: 'Room allocated successfully' });
                }
            );
        });
    });
});

app.get('/api/student/:roll', (req, res) => {
    const { roll } = req.params;

    db.query(
        //     `
        //   SELECT s.*, r.room_no 
        //   FROM students s
        //   LEFT JOIN allocations a ON s.id = a.student_id
        //   LEFT JOIN rooms r ON a.room_id = r.room_id
        //   WHERE s.roll_number = ? AND a.check_out_date IS NULL
        // `
        `
    SELECT s.*, r.room_no, h.name AS hostel_name, p.status AS fee_status
    FROM students s
    LEFT JOIN allocations a ON s.id = a.student_id AND a.check_out_date IS NULL
    LEFT JOIN rooms r ON a.room_id = r.room_id
    LEFT JOIN hostels h ON r.hostel_id = h.hostel_id
    LEFT JOIN payments p ON s.id = p.student_id
    WHERE s.roll_number = ?`
        , [roll], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length === 0) return res.status(404).json({ error: 'Student not found' });

            res.json({
                // name: results[0].name,
                // roll: results[0].roll_number,
                // room: results[0].room_no || null
                name: student.name,
                roll: student.roll_number,
                program: student.program,
                year: student.year,
                room: student.room_no ? `${student.hostel_name} - ${student.room_no}` : null,
                fee_status: student.fee_status
            });
        });
});

// Student applies for hostel
app.post('/api/apply-hostel', async (req, res) => {
    const { roll, period_start, period_end } = req.body;

    // 1. Get student details
    const [student] = await db.query(`
      SELECT s.id, s.gender, s.program, s.year 
      FROM students s WHERE roll_number = ?`, [roll]);

    // 2. Find eligible hostels
    const [hostels] = await db.query(`
      SELECT * FROM hostels 
      WHERE gender = ? AND program = ? AND (year IS NULL OR year = ?)`,
        [student.gender, student.program, student.year]);

    // 3. Create application
    await db.query(`
      INSERT INTO applications (student_id, hostel_id)
      VALUES (?, ?)`, [student.id, hostels[0].hostel_id]);

    // 4. Return payment link (simplified)
    res.json({
        payment_url: `/payment?application_id=...&amount=5000`,
        period: `${period_start} to ${period_end}`
    });
});

// Admin approves allocation
app.post('/api/allocate-room', async (req, res) => {
    const { application_id, room_id } = req.body;

    // 1. Verify room capacity
    const [room] = await db.query(`
      SELECT * FROM rooms 
      WHERE room_id = ? AND current_occupancy < capacity`, [room_id]);

    if (!room) return res.status(400).json({ error: 'Room full' });

    // 2. Allocate room
    await db.query(`
      INSERT INTO allocations (student_id, room_id, check_in_date)
      SELECT student_id, ?, CURDATE()
      FROM applications WHERE application_id = ?`,
        [room_id, application_id]);

    // 3. Update occupancy
    await db.query(`
      UPDATE rooms SET current_occupancy = current_occupancy + 1
      WHERE room_id = ?`, [room_id]);

    res.json({ success: true });
});