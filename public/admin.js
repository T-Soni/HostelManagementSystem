// Fetch all rooms and populate dropdown
async function loadRooms() {
    const response = await fetch('/api/rooms');
    const rooms = await response.json();
    const select = document.getElementById('roomSelect');

    rooms.forEach(room => {
        const option = document.createElement('option');
        option.value = room.room_id;
        option.textContent = `${room.room_no} (${room.current_occupancy}/${room.capacity})`;
        select.appendChild(option);
    });
}

// Allocate room to student
document.getElementById('allocateForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const roll = document.getElementById('studentRoll').value;
    const roomId = document.getElementById('roomSelect').value;

    const response = await fetch('/api/allocate-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roll, roomId })
    });

    const result = await response.json();
    alert(result.message);
});

// Load data on page open
window.onload = () => {
    loadRooms();
    loadStudents();
};

// Generate occupancy report
async function generateReport() {
    const response = await fetch('/api/reports/occupancy');
    const data = await response.json();

    // Render data as a table/chart (using Chart.js or similar)
    console.log('Occupancy Report:', data);
}