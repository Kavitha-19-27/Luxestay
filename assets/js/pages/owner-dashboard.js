/**
 * Hotel Owner Dashboard
 * Handles the owner dashboard functionality
 */

// Store dashboard data
let dashboardData = null;
let allRooms = [];
let allBookings = [];

/**
 * Initialize dashboard on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    // Check hotel owner access
    if (!Auth.isAuthenticated()) {
        window.location.href = '../login.html';
        return;
    }
    
    if (!Auth.isHotelOwner()) {
        UI.toast('Access denied. Hotel owner privileges required.', 'error');
        setTimeout(() => window.location.href = '../index.html', 2000);
        return;
    }
    
    // Check if password change is required
    if (Auth.mustChangePassword()) {
        document.getElementById('passwordChangeAlert').style.display = 'flex';
    }
    
    // Set user info
    const user = Auth.getUser();
    document.getElementById('userAvatar').textContent = Auth.getUserInitials();
    document.getElementById('userName').textContent = user?.firstName || 'Owner';
    
    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });
    
    // Logout handler
    document.getElementById('logoutBtn').addEventListener('click', () => {
        Auth.logout();
        window.location.href = '../index.html';
    });
    
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadDashboardData();
        UI.toast('Refreshing data...', 'info');
    });
    
    // Status change handler
    document.getElementById('newStatus').addEventListener('change', (e) => {
        const reasonGroup = document.getElementById('reasonGroup');
        reasonGroup.style.display = e.target.value === 'CANCELLED' ? 'block' : 'none';
    });
    
    // Load dashboard data
    loadDashboardData();
});

/**
 * Load all dashboard data
 */
async function loadDashboardData() {
    try {
        const response = await API.owner.getDashboard();
        dashboardData = response.data || response;
        
        // Update hotel name
        if (dashboardData.hotel) {
            document.getElementById('hotelName').textContent = dashboardData.hotel.name;
        }
        
        // Update stats
        if (dashboardData.stats) {
            updateStats(dashboardData.stats);
        }
        
        // Load rooms
        await loadRooms();
        
        // Load bookings
        await loadBookings();
        
        // Load today's check-ins and check-outs
        await Promise.all([
            loadTodayCheckins(),
            loadTodayCheckouts()
        ]);
        
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        UI.toast('Failed to load dashboard data', 'error');
    }
}

/**
 * Update statistics display
 */
function updateStats(stats) {
    document.getElementById('totalRooms').textContent = stats.totalRooms || 0;
    document.getElementById('availableRooms').textContent = stats.availableRooms || 0;
    document.getElementById('totalBookings').textContent = stats.totalBookings || 0;
    
    const revenue = parseFloat(stats.totalRevenue || 0);
    document.getElementById('totalRevenue').textContent = 
        '₹' + revenue.toLocaleString('en-IN', { minimumFractionDigits: 0 });
    
    // Update performance bars
    const occupancy = stats.occupancyRate || 0;
    document.getElementById('occupancyRate').textContent = occupancy + '%';
    document.getElementById('occupancyBar').style.width = occupancy + '%';
    
    const confirmed = stats.confirmedBookings || 0;
    const pending = stats.pendingBookings || 0;
    const total = confirmed + pending || 1;
    
    document.getElementById('confirmedCount').textContent = confirmed;
    document.getElementById('confirmedBar').style.width = ((confirmed / total) * 100) + '%';
    
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('pendingBar').style.width = ((pending / total) * 100) + '%';
}

/**
 * Load rooms
 */
async function loadRooms() {
    try {
        const response = await API.owner.getRooms();
        allRooms = response.data || response || [];
        renderRoomsGrid(allRooms);
    } catch (error) {
        console.error('Failed to load rooms:', error);
        document.getElementById('roomsGrid').innerHTML = 
            '<p class="empty-state">Failed to load rooms</p>';
    }
}

/**
 * Render rooms grid
 */
function renderRoomsGrid(rooms) {
    const grid = document.getElementById('roomsGrid');
    
    if (!rooms || rooms.length === 0) {
        grid.innerHTML = `
            <div class="empty-state-container">
                <i class="fas fa-bed"></i>
                <p>No rooms added yet. Start by adding your first room to begin accepting bookings.</p>
                <button class="btn btn-primary" onclick="showAddRoomModal()">
                    <i class="fas fa-plus"></i> Add First Room
                </button>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = rooms.slice(0, 6).map(room => {
        const statusClass = room.isAvailable ? 'available' : 'occupied';
        const statusText = room.isAvailable ? 'Available' : 'Occupied';
        
        return `
            <div class="room-card room-${statusClass}">
                <div class="room-card-header">
                    <span class="room-number">${room.roomNumber}</span>
                    <span class="room-status badge badge-${room.isAvailable ? 'success' : 'warning'}">${statusText}</span>
                </div>
                <div class="room-card-body">
                    <p class="room-type">${formatRoomType(room.roomType)}</p>
                    <p class="room-price">₹${parseFloat(room.pricePerNight).toLocaleString('en-IN')}/night</p>
                    <p class="room-occupancy"><i class="fas fa-user"></i> Max ${room.capacity} guests</p>
                </div>
                <div class="room-card-actions">
                    <button class="btn btn-sm btn-ghost" onclick="toggleRoomAvailability(${room.id})" title="Toggle Availability">
                        <i class="fas fa-${room.isAvailable ? 'lock' : 'unlock'}"></i>
                    </button>
                    <button class="btn btn-sm btn-ghost" onclick="editRoom(${room.id})" title="Edit Room">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    if (rooms.length > 6) {
        grid.innerHTML += `
            <div class="room-card room-more">
                <a href="rooms.html" class="view-all-link">
                    <i class="fas fa-th"></i>
                    <span>View all ${rooms.length} rooms</span>
                </a>
            </div>
        `;
    }
}

/**
 * Format room type for display
 */
function formatRoomType(type) {
    return type.charAt(0) + type.slice(1).toLowerCase();
}

/**
 * Load bookings
 */
async function loadBookings() {
    try {
        const response = await API.owner.getBookings({ size: 10 });
        const bookingsData = response.data?.content || response.content || response.data || response || [];
        allBookings = Array.isArray(bookingsData) ? bookingsData : [];
        renderRecentBookings(allBookings.slice(0, 5));
    } catch (error) {
        console.error('Failed to load bookings:', error);
        document.getElementById('recentBookingsTable').innerHTML = 
            '<tr><td colspan="8" class="text-center">Failed to load bookings</td></tr>';
    }
}

/**
 * Render recent bookings table
 */
function renderRecentBookings(bookings) {
    const tableBody = document.getElementById('recentBookingsTable');
    
    if (!bookings || bookings.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No bookings found</td></tr>';
        return;
    }
    
    const statusBadges = {
        'PENDING': 'badge-warning',
        'CONFIRMED': 'badge-success',
        'CHECKED_IN': 'badge-info',
        'CHECKED_OUT': 'badge-secondary',
        'CANCELLED': 'badge-error',
        'COMPLETED': 'badge-info'
    };
    
    tableBody.innerHTML = bookings.map(booking => {
        const badgeClass = statusBadges[booking.status] || 'badge-info';
        const statusLabel = formatStatus(booking.status);
        
        return `
            <tr>
                <td><code>${booking.bookingReference}</code></td>
                <td>${booking.userFullName || booking.guestName || 'N/A'}</td>
                <td>${booking.roomType || 'N/A'}</td>
                <td>${formatDate(booking.checkInDate)}</td>
                <td>${formatDate(booking.checkOutDate)}</td>
                <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
                <td>₹${parseFloat(booking.totalPrice || 0).toLocaleString('en-IN')}</td>
                <td>
                    <button class="btn btn-sm btn-ghost" onclick="showUpdateStatusModal(${booking.id}, '${booking.status}')" title="Update Status">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Format status for display
 */
function formatStatus(status) {
    return status.replace(/_/g, ' ').toLowerCase()
        .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Load today's check-ins
 */
async function loadTodayCheckins() {
    try {
        const response = await API.owner.getTodayCheckIns();
        const checkins = response.data || response || [];
        
        document.getElementById('checkinCount').textContent = checkins.length;
        renderCheckins(checkins);
    } catch (error) {
        console.error('Failed to load check-ins:', error);
    }
}

/**
 * Render check-ins list
 */
function renderCheckins(checkins) {
    const container = document.getElementById('todayCheckins');
    
    if (!checkins || checkins.length === 0) {
        container.innerHTML = '<p class="empty-state">No check-ins scheduled for today</p>';
        return;
    }
    
    container.innerHTML = checkins.map(booking => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas fa-sign-in-alt"></i>
            </div>
            <div class="activity-info">
                <span class="activity-name">${booking.userFullName || booking.guestName}</span>
                <span class="activity-details">Room ${booking.roomNumber || booking.roomType}</span>
            </div>
            <div class="activity-actions">
                <button class="btn btn-sm btn-success" onclick="quickCheckIn(${booking.id})" title="Check In">
                    <i class="fas fa-check"></i>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Load today's check-outs
 */
async function loadTodayCheckouts() {
    try {
        const response = await API.owner.getTodayCheckOuts();
        const checkouts = response.data || response || [];
        
        document.getElementById('checkoutCount').textContent = checkouts.length;
        renderCheckouts(checkouts);
    } catch (error) {
        console.error('Failed to load check-outs:', error);
    }
}

/**
 * Render check-outs list
 */
function renderCheckouts(checkouts) {
    const container = document.getElementById('todayCheckouts');
    
    if (!checkouts || checkouts.length === 0) {
        container.innerHTML = '<p class="empty-state">No check-outs scheduled for today</p>';
        return;
    }
    
    container.innerHTML = checkouts.map(booking => `
        <div class="activity-item">
            <div class="activity-icon activity-icon-out">
                <i class="fas fa-sign-out-alt"></i>
            </div>
            <div class="activity-info">
                <span class="activity-name">${booking.userFullName || booking.guestName}</span>
                <span class="activity-details">Room ${booking.roomNumber || booking.roomType}</span>
            </div>
            <div class="activity-actions">
                <button class="btn btn-sm btn-warning" onclick="quickCheckOut(${booking.id})" title="Check Out">
                    <i class="fas fa-check"></i>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Quick check-in
 */
async function quickCheckIn(bookingId) {
    try {
        await API.owner.updateBookingStatus(bookingId, 'CHECKED_IN');
        UI.toast('Guest checked in successfully', 'success');
        loadDashboardData();
    } catch (error) {
        console.error('Failed to check in:', error);
        UI.toast('Failed to check in guest', 'error');
    }
}

/**
 * Quick check-out
 */
async function quickCheckOut(bookingId) {
    try {
        await API.owner.updateBookingStatus(bookingId, 'CHECKED_OUT');
        UI.toast('Guest checked out successfully', 'success');
        loadDashboardData();
    } catch (error) {
        console.error('Failed to check out:', error);
        UI.toast('Failed to check out guest', 'error');
    }
}

/**
 * Toggle room availability
 */
async function toggleRoomAvailability(roomId) {
    try {
        await API.owner.toggleRoomAvailability(roomId);
        UI.toast('Room availability updated', 'success');
        loadRooms();
    } catch (error) {
        console.error('Failed to toggle availability:', error);
        UI.toast('Failed to update room availability', 'error');
    }
}

/**
 * Edit room - redirect to rooms page
 */
function editRoom(roomId) {
    window.location.href = `rooms.html?edit=${roomId}`;
}

/**
 * Show add room modal
 */
function showAddRoomModal() {
    document.getElementById('addRoomForm').reset();
    document.getElementById('addRoomModal').classList.add('active');
}

/**
 * Close modal
 */
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

/**
 * Handle add room form submission
 */
async function handleAddRoom(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Validate required fields
    const roomNumber = formData.get('roomNumber')?.trim();
    const roomType = formData.get('roomType');
    const pricePerNight = parseFloat(formData.get('pricePerNight'));
    const capacity = parseInt(formData.get('maxOccupancy'));
    
    if (!roomNumber) {
        UI.toast('Room number is required', 'error');
        return;
    }
    if (!roomType) {
        UI.toast('Room type is required', 'error');
        return;
    }
    if (isNaN(pricePerNight) || pricePerNight <= 0) {
        UI.toast('Valid price per night is required', 'error');
        return;
    }
    if (isNaN(capacity) || capacity < 1 || capacity > 10) {
        UI.toast('Capacity must be between 1 and 10', 'error');
        return;
    }
    
    const roomData = {
        roomType: roomType,
        roomNumber: roomNumber,
        name: formData.get('roomName')?.trim() || roomType + ' Room',
        pricePerNight: pricePerNight,
        capacity: capacity,
        description: formData.get('description')?.trim() || '',
        amenities: formData.get('amenities') ? formData.get('amenities').split(',').map(a => a.trim()).filter(a => a) : [],
        imageUrl: formData.get('imageUrl')?.trim() || null
    };
    
    try {
        await API.owner.createRoom(roomData);
        UI.toast('Room added successfully', 'success');
        closeModal('addRoomModal');
        loadRooms();
        loadDashboardData();
    } catch (error) {
        console.error('Failed to add room:', error);
        // Show more detailed error message if available
        let errorMessage = 'Failed to add room';
        if (error.errors) {
            const firstError = Object.values(error.errors)[0];
            errorMessage = firstError || errorMessage;
        } else if (error.message) {
            errorMessage = error.message;
        }
        UI.toast(errorMessage, 'error');
    }
}

/**
 * Show update status modal
 */
function showUpdateStatusModal(bookingId, currentStatus) {
    document.getElementById('statusBookingId').value = bookingId;
    document.getElementById('newStatus').value = currentStatus;
    document.getElementById('statusReason').value = '';
    document.getElementById('reasonGroup').style.display = 'none';
    document.getElementById('updateStatusModal').classList.add('active');
}

/**
 * Handle update status form submission
 */
async function handleUpdateStatus(event) {
    event.preventDefault();
    
    const bookingId = document.getElementById('statusBookingId').value;
    const status = document.getElementById('newStatus').value;
    const reason = document.getElementById('statusReason').value;
    
    try {
        await API.owner.updateBookingStatus(bookingId, status, reason || null);
        UI.toast('Booking status updated', 'success');
        closeModal('updateStatusModal');
        loadBookings();
        loadDashboardData();
    } catch (error) {
        console.error('Failed to update status:', error);
        UI.toast(error.message || 'Failed to update booking status', 'error');
    }
}

// Close modals when clicking overlay
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.closest('.modal').classList.remove('active');
    }
});

// Close modals with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});
