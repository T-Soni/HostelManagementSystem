// // Load student data on page load
// document.addEventListener('DOMContentLoaded', () => {
//     const roll = localStorage.getItem('studentRoll');
    
//     if (!roll) {
//       window.location.href = '/'; // Redirect if not logged in
//       return;
//     }
  
//     // Display basic info
//     document.getElementById('studentRoll').textContent = roll;
    
//     // Fetch additional student data
//     fetch(`http://localhost:3000/api/student/${roll}`)
//       .then(response => response.json())
//       .then(data => {
//         document.getElementById('studentName').textContent = data.name;
//         if (data.room) {
//           document.getElementById('studentRoom').textContent = data.room;
//         }
//       });
  
//     // Logout handler
//     document.getElementById('logoutBtn').addEventListener('click', () => {
//       localStorage.removeItem('studentRoll');
//       window.location.href = '/';
//     });
//   });

document.addEventListener('DOMContentLoaded', async () => {
    const roll = localStorage.getItem('studentRoll');
    
    if (!roll) {
      window.location.href = '/';
      return;
    }
  
    // Display basic info
    document.getElementById('studentRoll').textContent = roll;
  
    try {
      // Fetch student data
      const response = await fetch(`http://localhost:3000/api/student/${roll}`);
      const data = await response.json();
  
      // Populate student info
      document.getElementById('studentName').textContent = data.name;
      document.getElementById('studentProgram').textContent = data.program;
      document.getElementById('studentYear').textContent = data.year;
  
      // Show room if allocated
      if (data.room) {
        document.getElementById('studentRoom').textContent = data.room;
        document.getElementById('feeStatus').textContent = data.fee_status || 'Paid';
      } else {
        // Show application form if no room allocated
        document.getElementById('hostelApplication').style.display = 'block';
      }
  
      // Hostel application form handler
      document.getElementById('hostelForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const periodStart = document.getElementById('periodStart').value;
        const periodEnd = document.getElementById('periodEnd').value;
  
        try {
          const application = await fetch('http://localhost:3000/api/apply-hostel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roll,
              period_start: periodStart,
              period_end: periodEnd
            })
          });
  
          const result = await application.json();
          
          if (result.payment_url) {
            // Redirect to payment gateway (simulated)
            window.location.href = result.payment_url;
          } else {
            alert('Application submitted! Awaiting admin approval.');
          }
        } catch (err) {
          console.error('Application error:', err);
          alert('Failed to submit application');
        }
      });
  
    } catch (err) {
      console.error('Failed to load student data:', err);
    }
  
    // Logout handler
    document.getElementById('logoutBtn').addEventListener('click', () => {
      localStorage.removeItem('studentRoll');
      window.location.href = '/';
    });
  });