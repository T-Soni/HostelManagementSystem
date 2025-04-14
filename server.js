const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced CORS configuration
const corsOptions = {
  origin: [
    'http://127.0.0.1:5500', 
    'http://localhost:5500',
    'http://127.0.0.1:5501',
    'http://localhost:5501'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
    process.exit(1);
  }
  console.log('Connected to MySQL DB!');
});

// === API ENDPOINTS ===

// Test endpoint
app.get('/api/db-test', (req, res) => {
  db.query('SELECT 1 + 1 AS solution', (err, results) => {
    if (err) return res.status(500).json({ error: 'Database connection failed' });
    res.json({ solution: results[0].solution });
  });
});

// Get allowed roll numbers
app.get('/api/allowed-rolls', (req, res) => {
  // Add CORS headers manually
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  db.query('SELECT roll_number FROM allowed_roll_numbers', (err, results) => {
    if (err) {
      console.error('Error fetching allowed rolls:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    const rolls = results.map(row => String(row.roll_number));
    res.json(rolls);
  });
});

// Register student
app.post('/api/register', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');

  const { roll, name, password, gender, program, year } = req.body;

  if (!roll || !name || !password || !gender || !program || !year) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check if roll is allowed
  db.query('SELECT * FROM allowed_roll_numbers WHERE roll_number = ?', [roll], (err, allowedResult) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (allowedResult.length === 0) return res.status(403).json({ error: 'Roll number not allowed' });

    // Check if already registered
    db.query('SELECT * FROM students WHERE roll_number = ?', [roll], (err, studentResult) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (studentResult.length > 0) return res.status(409).json({ error: 'Student already registered' });

      // Insert new student
      const insertQuery = `
        INSERT INTO students (roll_number, name, password, gender, program, year)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      db.query(insertQuery, [roll, name, password, gender, program, year], (err) => {
        if (err) return res.status(500).json({ error: 'Registration failed' });
        res.status(201).json({ success: true, message: 'Registered successfully' });
      });
    });
  });
});

// Login
app.post('/api/login', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');

  const { role } = req.body;

  if (role === 'student') {
    const { roll, password } = req.body;

    if (!roll || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    db.query('SELECT * FROM students WHERE roll_number = ?', [roll], (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (results.length === 0) return res.status(404).json({ exists: false, match: false });

      const student = results[0];
      res.json({
        exists: true,
        match: student.password === password,
        studentData: {
          name: student.name,
          roll: student.roll_number
        }
      });
    });
  } else if (role === 'admin') {
    const { username, password } = req.body;

    db.query('SELECT * FROM admins WHERE username = ?', [username], (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (results.length === 0) return res.status(404).json({ exists: false });

      const admin = results[0];
      res.json({
        exists: true,
        match: admin.password === password
      });
    });
  } else {
    res.status(400).json({ error: 'Invalid role specified' });
  }
});

// Get room occupancy report
app.get('/api/reports/occupancy', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  
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

// Get available rooms
app.get('/api/rooms', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  
  db.query('SELECT * FROM rooms WHERE status = "available"', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Allocate room to student
app.post('/api/allocate-room', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');

  const { roll, roomId } = req.body;

  // 1. Check if student exists
  db.query('SELECT id FROM students WHERE roll_number = ?', [roll], (err, student) => {
    if (err) return res.status(500).json({ error: err.message });
    if (student.length === 0) return res.status(404).json({ error: 'Student not found' });

    // 2. Check room capacity
    db.query('SELECT capacity, current_occupancy FROM rooms WHERE room_id = ?', [roomId], (err, room) => {
      if (err) return res.status(500).json({ error: err.message });
      if (room[0].current_occupancy >= room[0].capacity) {
        return res.status(400).json({ error: 'Room is full' });
      }

      // 3. Allocate room
      db.query(
        'INSERT INTO allocations (student_id, room_id, check_in_date) VALUES (?, ?, CURDATE())',
        [student[0].id, roomId],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });

          // Update room occupancy
          db.query('UPDATE rooms SET current_occupancy = current_occupancy + 1 WHERE room_id = ?', [roomId]);
          res.json({ success: true, message: 'Room allocated successfully' });
        }
      );
    });
  });
});

// Get student details
app.get('/api/student/:roll', async (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  
  try {
    const { roll } = req.params;
    const [results] = await db.promise().query(`
      SELECT s.*, r.room_no, h.name AS hostel_name, p.status AS fee_status
      FROM students s
      LEFT JOIN allocations a ON s.id = a.student_id AND a.check_out_date IS NULL
      LEFT JOIN rooms r ON a.room_id = r.room_id
      LEFT JOIN hostels h ON r.hostel_id = h.hostel_id
      LEFT JOIN payments p ON s.id = p.student_id
      WHERE s.roll_number = ?
      LIMIT 1
    `, [roll]);

    if (!results.length) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = results[0];
    res.json({
      name: student.name,
      roll: student.roll_number,
      program: student.program,
      year: student.year,
      room: student.room_no ? `${student.hostel_name} - ${student.room_no}` : null,
      fee_status: student.fee_status || 'unpaid'
    });
  } catch (err) {
    console.error('Student fetch error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Apply for hostel
app.post('/api/apply-hostel', async (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');

  try {
    const { roll, period_start, period_end } = req.body;

    if (!period_start || !period_end) {
      return res.status(400).json({ error: 'Period dates required' });
    }

    const [student] = await db.promise().query(
      'SELECT id, gender, program, year FROM students WHERE roll_number = ?', 
      [roll]
    );

    if (!student.length) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Create application
    const [result] = await db.promise().query(
      'INSERT INTO applications (student_id, period_start, period_end) VALUES (?, ?, ?)',
      [student[0].id, period_start, period_end]
    );

    res.json({
      success: true,
      payment_url: `/payment?application_id=${result.insertId}`,
      period: `${period_start} to ${period_end}`
    });
  } catch (err) {
    console.error('Application error:', err);
    res.status(500).json({ error: 'Application failed' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
    process.exit(1);
  }
});