/**
 * Admin Bookings Management
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.isAuthenticated()) {
        window.location.href = '../login.html';
        return;
    }
    
    if (!Auth.isAdmin()) {
        UI.toast('Access denied. Admin privileges required.', 'error');
        setTimeout(() => window.location.href = '../index.html', 2000);
        return;
    }
    
    initAdminBookings();
});

// Fallback data removed
let bookings = [];

function initAdminBookings() {
    const user = Auth.getUser();
    document.getElementById('userAvatar').textContent = Auth.getUserInitials();
    document.getElementById('userName').textContent = user?.firstName || 'Admin';
    
    document.getElementById('sidebarToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });
    
    document.getElementById('logoutBtn').addEventListener('click', () => {
        Auth.logout();
        window.location.href = '../index.html';
    });
    
    loadBookings();
    setupEventListeners();
}

async function loadBookings() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const tableBody = document.getElementById('bookingsTableBody');
    
    loadingState.classList.remove('hidden');
    emptyState.classList.add('hidden');
    tableBody.innerHTML = '';
    
    try {
        const response = await API.admin.getBookings();
        // Handle paged response: { data: { content: [...] } }
        bookings = response.data?.content || response.content || response.data || response || [];
    } catch (error) {
        console.error('Error loading admin bookings:', error);
        bookings = [];
        UI.toast('Failed to load bookings', 'error');
    }
    
    loadingState.classList.add('hidden');
    
    // Update stats
    updateStats();
    
    if (bookings.length === 0) {
        emptyState.classList.remove('hidden');
        document.getElementById('bookingCount').textContent = '0';
        return;
    }
    
    document.getElementById('bookingCount').textContent = bookings.length;
    renderBookings(bookings);
}

function updateStats() {
    const today = new Date().toISOString().split('T')[0];
    
    document.getElementById('pendingCount').textContent = 
        bookings.filter(b => b.status === 'PENDING').length;
    document.getElementById('confirmedCount').textContent = 
        bookings.filter(b => b.status === 'CONFIRMED').length;
    document.getElementById('checkinToday').textContent = 
        bookings.filter(b => b.checkInDate === today && b.status === 'CONFIRMED').length;
    document.getElementById('checkoutToday').textContent = 
        bookings.filter(b => b.checkOutDate === today && b.status === 'CHECKED_IN').length;
}

function renderBookings(bookingList) {
    const tableBody = document.getElementById('bookingsTableBody');
    
    tableBody.innerHTML = bookingList.map(booking => `
        <tr>
            <td><strong>${booking.bookingReference}</strong></td>
            <td>
                <div class="guest-info">
                    <span class="guest-name">${booking.userFullName || booking.guestName || 'N/A'}</span>
                    <span class="guest-email">${booking.userEmail || booking.guestEmail || ''}</span>
                </div>
            </td>
            <td>
                <div class="hotel-room-info">
                    <span class="hotel-name">${booking.hotelName}</span>
                    <span class="room-name">${booking.roomName}</span>
                </div>
            </td>
            <td>${UI.formatDate(booking.checkInDate)}</td>
            <td>${UI.formatDate(booking.checkOutDate)}</td>
            <td><strong>${UI.formatCurrency(booking.totalPrice)}</strong></td>
            <td>
                <span class="badge ${getStatusBadge(booking.status)}">
                    ${formatStatus(booking.status)}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="action-btn view-btn" title="View Details" onclick="viewBooking(${booking.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${getQuickActions(booking)}
                </div>
            </td>
        </tr>
    `).join('');
}

function getStatusBadge(status) {
    const badges = {
        'PENDING': 'badge-warning',
        'CONFIRMED': 'badge-success',
        'CHECKED_IN': 'badge-info',
        'CHECKED_OUT': 'badge-secondary',
        'CANCELLED': 'badge-error'
    };
    return badges[status] || 'badge-info';
}

function formatStatus(status) {
    return status.replace('_', ' ').toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function getQuickActions(booking) {
    let actions = '';
    
    switch(booking.status) {
        case 'PENDING':
            actions = `
                <button class="action-btn confirm-btn" title="Confirm" onclick="updateStatus(${booking.id}, 'CONFIRMED')">
                    <i class="fas fa-check"></i>
                </button>
                <button class="action-btn delete-btn" title="Cancel" onclick="updateStatus(${booking.id}, 'CANCELLED')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            break;
        case 'CONFIRMED':
            actions = `
                <button class="action-btn confirm-btn" title="Check In" onclick="updateStatus(${booking.id}, 'CHECKED_IN')">
                    <i class="fas fa-sign-in-alt"></i>
                </button>
            `;
            break;
        case 'CHECKED_IN':
            actions = `
                <button class="action-btn confirm-btn" title="Check Out" onclick="updateStatus(${booking.id}, 'CHECKED_OUT')">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            `;
            break;
    }
    
    return actions;
}

function setupEventListeners() {
    const bookingModal = document.getElementById('bookingModal');
    const statusModal = document.getElementById('statusModal');
    
    // Modal close buttons
    document.getElementById('closeModal').addEventListener('click', () => bookingModal.classList.remove('active'));
    document.getElementById('closeBookingBtn').addEventListener('click', () => bookingModal.classList.remove('active'));
    bookingModal.querySelector('.modal-overlay').addEventListener('click', () => bookingModal.classList.remove('active'));
    
    document.getElementById('closeStatusModal').addEventListener('click', () => statusModal.classList.remove('active'));
    document.getElementById('cancelStatusBtn').addEventListener('click', () => statusModal.classList.remove('active'));
    statusModal.querySelector('.modal-overlay').addEventListener('click', () => statusModal.classList.remove('active'));
    
    document.getElementById('confirmStatusBtn').addEventListener('click', confirmStatusUpdate);
    
    // Filters
    document.getElementById('searchInput').addEventListener('input', filterBookings);
    document.getElementById('statusFilter').addEventListener('change', filterBookings);
    document.getElementById('dateFilter').addEventListener('change', filterBookings);
    
    // Export
    document.getElementById('exportBtn').addEventListener('click', exportBookings);
}

function filterBookings() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const status = document.getElementById('statusFilter').value;
    const date = document.getElementById('dateFilter').value;
    
    let filtered = bookings.filter(booking => {
        const matchSearch = 
            booking.bookingReference.toLowerCase().includes(search) ||
            booking.guestName.toLowerCase().includes(search) ||
            booking.guestEmail.toLowerCase().includes(search) ||
            booking.hotelName.toLowerCase().includes(search);
        const matchStatus = !status || booking.status === status;
        const matchDate = !date || booking.checkInDate === date || booking.checkOutDate === date;
        
        return matchSearch && matchStatus && matchDate;
    });
    
    if (filtered.length === 0) {
        document.getElementById('bookingsTableBody').innerHTML = '';
        document.getElementById('emptyState').classList.remove('hidden');
    } else {
        document.getElementById('emptyState').classList.add('hidden');
        renderBookings(filtered);
    }
}

window.viewBooking = function(id) {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;
    
    const nights = Math.ceil((new Date(booking.checkOutDate) - new Date(booking.checkInDate)) / (1000 * 60 * 60 * 24));
    
    document.getElementById('bookingDetails').innerHTML = `
        <div class="booking-detail-grid">
            <div class="detail-section">
                <h4><i class="fas fa-ticket-alt"></i> Reservation Info</h4>
                <div class="detail-row">
                    <span>Reference:</span>
                    <strong>${booking.bookingReference}</strong>
                </div>
                <div class="detail-row">
                    <span>Status:</span>
                    <span class="badge ${getStatusBadge(booking.status)}">${formatStatus(booking.status)}</span>
                </div>
                <div class="detail-row">
                    <span>Created:</span>
                    <span>${new Date(booking.createdAt).toLocaleString()}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-user"></i> Guest Details</h4>
                <div class="detail-row">
                    <span>Name:</span>
                    <strong>${booking.guestName}</strong>
                </div>
                <div class="detail-row">
                    <span>Email:</span>
                    <span>${booking.guestEmail}</span>
                </div>
                <div class="detail-row">
                    <span>Phone:</span>
                    <span>${booking.guestPhone}</span>
                </div>
                <div class="detail-row">
                    <span>Guests:</span>
                    <span>${booking.adults} Adults${booking.children > 0 ? `, ${booking.children} Children` : ''}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-hotel"></i> Accommodation</h4>
                <div class="detail-row">
                    <span>Hotel:</span>
                    <strong>${booking.hotelName}</strong>
                </div>
                <div class="detail-row">
                    <span>Room:</span>
                    <span>${booking.roomName}</span>
                </div>
                <div class="detail-row">
                    <span>Check-in:</span>
                    <span>${UI.formatDate(booking.checkInDate)}</span>
                </div>
                <div class="detail-row">
                    <span>Check-out:</span>
                    <span>${UI.formatDate(booking.checkOutDate)}</span>
                </div>
                <div class="detail-row">
                    <span>Duration:</span>
                    <span>${nights} night${nights > 1 ? 's' : ''}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-money-bill-wave"></i> Payment</h4>
                <div class="detail-row total-row">
                    <span>Total Amount:</span>
                    <strong>${UI.formatCurrency(booking.totalPrice)}</strong>
                </div>
            </div>
            
            ${booking.specialRequests ? `
                <div class="detail-section full-width">
                    <h4><i class="fas fa-comment-dots"></i> Special Requests</h4>
                    <p class="special-requests">${booking.specialRequests}</p>
                </div>
            ` : ''}
        </div>
    `;
    
    // Set modal actions based on status
    let actions = '';
    switch(booking.status) {
        case 'PENDING':
            actions = `
                <button class="btn btn-success" onclick="updateStatus(${booking.id}, 'CONFIRMED')">
                    <i class="fas fa-check"></i> Confirm
                </button>
                <button class="btn btn-danger" onclick="updateStatus(${booking.id}, 'CANCELLED')">
                    <i class="fas fa-times"></i> Cancel
                </button>
            `;
            break;
        case 'CONFIRMED':
            actions = `
                <button class="btn btn-primary" onclick="updateStatus(${booking.id}, 'CHECKED_IN')">
                    <i class="fas fa-sign-in-alt"></i> Check In
                </button>
            `;
            break;
        case 'CHECKED_IN':
            actions = `
                <button class="btn btn-primary" onclick="updateStatus(${booking.id}, 'CHECKED_OUT')">
                    <i class="fas fa-sign-out-alt"></i> Check Out
                </button>
            `;
            break;
    }
    document.getElementById('modalActions').innerHTML = actions;
    
    document.getElementById('bookingModal').classList.add('active');
};

window.updateStatus = function(id, newStatus) {
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;
    
    const messages = {
        'CONFIRMED': 'Confirm this booking?',
        'CANCELLED': 'Cancel this booking? This action cannot be undone.',
        'CHECKED_IN': 'Check in this guest?',
        'CHECKED_OUT': 'Check out this guest?'
    };
    
    const icons = {
        'CONFIRMED': '<i class="fas fa-check-circle text-success"></i>',
        'CANCELLED': '<i class="fas fa-times-circle text-error"></i>',
        'CHECKED_IN': '<i class="fas fa-sign-in-alt text-info"></i>',
        'CHECKED_OUT': '<i class="fas fa-sign-out-alt text-info"></i>'
    };
    
    document.getElementById('statusIcon').innerHTML = icons[newStatus];
    document.getElementById('statusMessage').textContent = messages[newStatus];
    document.getElementById('updateBookingId').value = id;
    document.getElementById('updateStatus').value = newStatus;
    document.getElementById('statusModalTitle').textContent = `${formatStatus(newStatus)} Booking`;
    
    document.getElementById('bookingModal').classList.remove('active');
    document.getElementById('statusModal').classList.add('active');
};

async function confirmStatusUpdate() {
    const id = parseInt(document.getElementById('updateBookingId').value);
    const newStatus = document.getElementById('updateStatus').value;
    const confirmBtn = document.getElementById('confirmStatusBtn');
    
    try {
        UI.setButtonLoading(confirmBtn, true);
        
        const response = await API.admin.updateBookingStatus(id, newStatus);
        
        if (response.success || response.data) {
            UI.toast(`Booking ${formatStatus(newStatus).toLowerCase()} successfully`, 'success');
            document.getElementById('statusModal').classList.remove('active');
            // Reload bookings from server to get fresh data
            await loadBookings();
        } else {
            throw new Error(response.message || 'Failed to update booking status');
        }
    } catch (error) {
        console.error('Error updating booking status:', error);
        UI.toast(`Failed to update booking: ${error.message || 'Server error'}`, 'error');
        document.getElementById('statusModal').classList.remove('active');
    } finally {
        UI.setButtonLoading(confirmBtn, false);
    }
}

function exportBookings() {
    // Create CSV content
    const headers = ['Reference', 'Guest Name', 'Email', 'Hotel', 'Room', 'Check-in', 'Check-out', 'Total', 'Status'];
    const rows = bookings.map(b => [
        b.bookingReference,
        b.guestName,
        b.guestEmail,
        b.hotelName,
        b.roomName,
        b.checkInDate,
        b.checkOutDate,
        b.totalPrice,
        b.status
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    UI.toast('Bookings exported successfully', 'success');
}
