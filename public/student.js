// Fetch student data on load
async function loadStudentData() {
    const roll = localStorage.getItem('studentRoll'); // Set during login
    const response = await fetch(`/api/student/${roll}`);
    const data = await response.json();
    
    document.getElementById('studentName').textContent = data.name;
    document.getElementById('roomDetails').textContent = data.room || 'Not allocated';
    document.getElementById('feeStatus').textContent = data.fee_status;
  }
  
  window.onload = loadStudentData;