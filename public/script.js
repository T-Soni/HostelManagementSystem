const roleSelect = document.getElementById('role');
const registerBtn = document.getElementById('registerBtn');
const loginBtn = document.getElementById('loginBtn');

const studentRegisterForm = document.getElementById('studentRegisterForm');
const studentLoginForm = document.getElementById('studentLoginForm');
const adminLoginForm = document.getElementById('adminLoginForm');

const allowedRolls = []; // This will store the allowed rolls from backend

// Function to update the form visibility based on role selection
function updateFormVisibility() {
  const role = roleSelect.value;
  const isRegister = registerBtn.classList.contains('active');

  studentRegisterForm.style.display = (role === 'student' && isRegister) ? 'block' : 'none';
  studentLoginForm.style.display = (role === 'student' && !isRegister) ? 'block' : 'none';
  adminLoginForm.style.display = (role === 'admin') ? 'block' : 'none';
}

roleSelect.addEventListener('change', updateFormVisibility);

// Handling register button click
registerBtn.addEventListener('click', () => {
  registerBtn.classList.add('active');
  loginBtn.classList.remove('active');
  updateFormVisibility();
});

// Handling login button click
loginBtn.addEventListener('click', () => {
  registerBtn.classList.remove('active');
  loginBtn.classList.add('active');
  updateFormVisibility();
});

// Fetch allowed rolls from backend when the page loads
// fetch('/api/allowed-rolls')
fetch('http://localhost:3000/api/allowed-rolls')
.then(response => {
    console.log("Response status:", response.status);
    return response.text().then(text => {
      console.log("Raw response text:", text);
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON: ${text}`);
      }
    });
  })
//   .then(response => response.json())
  .then(data => {
    console.log('Fetched allowed rolls:', data); // Debugging: check what data is received
    console.log('Type of first roll:', typeof data[0]);
    allowedRolls.push(...data);
    console.log('Stored allowed rolls:', allowedRolls);
  })
  .catch(err => console.error('Error fetching allowed rolls:', err));

// Handle Student Registration
document.getElementById('studentRegisterForm').addEventListener('submit', async function(event) {
  event.preventDefault();

  const roll = document.getElementById('s_roll').value.trim();
//const roll = String(document.getElementById('s_roll').value).trim().toUpperCase();
  const name = document.getElementById('s_name').value;
  const password = document.getElementById('s_password').value;
  const gender = document.getElementById('s_gender').value;
  const program = document.getElementById('s_program').value;
  const year = document.getElementById('s_year').value;

  if (!roll || !name || !password || !gender || !program || !year) {
    alert('Please fill in all fields!');
    return;
  }

//   if (!allowedRolls.includes(roll)) {
//     alert('Invalid roll number');
//     return;
//   }
if (!allowedRolls.includes(String(roll))) { // Double ensure string comparison
    alert('Invalid roll number');
    return;
  }
  try {
    // Make a POST request to register the student
    //const response = await fetch('/api/register', {
        const response = await fetch('http://localhost:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roll, name, password, gender, program, year })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
    if (data.success) {
      alert('Registration successful!');
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error('Error during registration:', err);
  }
});

// Handle Student Login
document.getElementById('studentLoginForm').addEventListener('submit', async function(event) {
  event.preventDefault();

  const roll = document.getElementById('login_roll').value;
  const password = document.getElementById('login_password').value;

  // Make a POST request to log the student in
  try {
    console.log("Attempting login for roll:", roll); // Debug log
    
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        role: 'student', 
        roll: roll, 
        password: password 
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Login response:", data); // Debug log

    if (data.exists && data.match) {
      // Store student data for dashboard
      localStorage.setItem('studentRoll', roll);
      console.log("Redirecting to dashboard..."); // Debug log
      window.location.href = 'student-dashboard.html';
    } else if (!data.exists) {
      alert('Student not registered!');
    } else {
      alert('Incorrect password!');
    }
  } catch (error) {
    console.error('Login failed:', error);
    alert('Login failed. Please try again.');
  }
//   fetch('/api/login', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ role: 'student', roll, password })
//   })
//     .then(response => response.json())
//     .then(data => {
//       if (!data.exists) {
//         alert('User not registered');
//       } else if (!data.match) {
//         alert('Incorrect password');
//       } else {
//         alert('Login successful! Redirecting...');
//         window.location.href = '/student-dashboard.html'; // Redirect to student dashboard
//       }
//     })
//     .catch(err => console.error('Error during login:', err));
});

// Handle Admin Login
document.getElementById('adminLoginForm').addEventListener('submit', function(event) {
  event.preventDefault();

  const username = document.getElementById('a_username').value;
  const password = document.getElementById('a_password').value;

  // Make a POST request to log the admin in
  fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'admin', username, password })
  })
    .then(response => response.json())
    .then(data => {
      if (!data.exists) {
        alert('Admin not found');
      } else if (!data.match) {
        alert('Incorrect password');
      } else {
        alert('Admin login successful! Redirecting...');
        window.location.href = '/admin-dashboard.html'; // Redirect to admin dashboard
      }
    })
    .catch(err => console.error('Error during admin login:', err));
});
