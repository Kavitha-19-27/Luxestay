/**
 * Admin Hotels Management
 * ADMIN role only
 */

let pendingHotels = [];
let currentApprovalHotel = null;

document.addEventListener('DOMContentLoaded', () => {
    // Check admin access
    if (!Auth.isAuthenticated()) {
        window.location.href = '../login.html';
        return;
    }
    
    const isAdmin = Auth.isAdmin();
    
    if (!isAdmin) {
        UI.toast('Access denied. Admin privileges required.', 'error');
        setTimeout(() => window.location.href = '../index.html', 2000);
        return;
    }
    
    initAdminHotels();
});

function initAdminHotels() {
    // Set user info
    const user = Auth.getUser();
    document.getElementById('userAvatar').textContent = Auth.getUserInitials();
    document.getElementById('userName').textContent = user?.firstName || 'Admin';
    
    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        Auth.logout();
        window.location.href = '../index.html';
    });
    
    // Load pending approvals first, then hotels
    loadPendingApprovals();
    loadHotels();
    
    // Event listeners
    setupEventListeners();
}

/**
 * Load pending hotel registrations
 */
async function loadPendingApprovals() {
    try {
        const response = await API.admin.getPendingApprovals();
        pendingHotels = response.data || response || [];
        
        const card = document.getElementById('pendingApprovalsCard');
        const list = document.getElementById('pendingList');
        const count = document.getElementById('pendingCount');
        
        count.textContent = pendingHotels.length;
        
        if (pendingHotels.length === 0) {
            card.style.display = 'none';
            return;
        }
        
        card.style.display = 'block';
        
        list.innerHTML = pendingHotels.map(hotel => `
            <div class="pending-registration-item">
                <img src="${hotel.heroImageUrl || hotel.imageUrl || CONFIG.DEFAULT_HOTEL_IMAGE}" 
                     alt="${hotel.name}" class="hotel-image"
                     onerror="this.src='${CONFIG.DEFAULT_HOTEL_IMAGE}'">
                <div class="hotel-info">
                    <div class="hotel-name">${hotel.name}</div>
                    <div class="hotel-meta">
                        <i class="fas fa-map-marker-alt"></i> ${hotel.city}, ${hotel.country}
                        <span class="separator">•</span>
                        <span class="stars"><i class="fas fa-star"></i> ${hotel.starRating} Stars</span>
                    </div>
                    <div class="owner-info">
                        <i class="fas fa-user"></i> Owner: ${hotel.ownerName || hotel.ownerEmail || 'N/A'}
                    </div>
                </div>
                <div class="actions">
                    <button class="btn-review-hotel" onclick="reviewRegistration(${hotel.id})" title="Review">
                        <i class="fas fa-eye"></i> Review
                    </button>
                    <button class="btn-approve-hotel" onclick="quickApprove(${hotel.id})" title="Quick Approve">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-reject-hotel" onclick="quickReject(${hotel.id})" title="Quick Reject">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.warn('Failed to load pending approvals:', error);
        document.getElementById('pendingApprovalsCard').style.display = 'none';
    }
}

/**
 * Review a registration in detail
 */
window.reviewRegistration = function(hotelId) {
    currentApprovalHotel = pendingHotels.find(h => h.id === hotelId);
    if (!currentApprovalHotel) return;
    
    const details = document.getElementById('approvalDetails');
    details.innerHTML = `
        <div class="approval-detail-grid">
            <div class="approval-detail-item">
                <label>Hotel Name</label>
                <span>${currentApprovalHotel.name}</span>
            </div>
            <div class="approval-detail-item">
                <label>Star Rating</label>
                <span>${currentApprovalHotel.starRating} Stars</span>
            </div>
            <div class="approval-detail-item">
                <label>City</label>
                <span>${currentApprovalHotel.city}</span>
            </div>
            <div class="approval-detail-item">
                <label>Country</label>
                <span>${currentApprovalHotel.country}</span>
            </div>
            <div class="approval-detail-item full-width">
                <label>Address</label>
                <span>${currentApprovalHotel.address || 'N/A'}</span>
            </div>
            <div class="approval-detail-item">
                <label>Owner Name</label>
                <span>${currentApprovalHotel.ownerName || 'N/A'}</span>
            </div>
            <div class="approval-detail-item">
                <label>Owner Email</label>
                <span>${currentApprovalHotel.ownerEmail || 'N/A'}</span>
            </div>
            <div class="approval-detail-item full-width">
                <label>Description</label>
                <span>${currentApprovalHotel.description || 'N/A'}</span>
            </div>
        </div>
    `;
    
    document.getElementById('rejectionReasonGroup').style.display = 'none';
    document.getElementById('rejectionReason').value = '';
    document.getElementById('approvalModal').classList.add('active');
};

/**
 * Close approval modal
 */
window.closeApprovalModal = function() {
    document.getElementById('approvalModal').classList.remove('active');
    currentApprovalHotel = null;
};

/**
 * Handle approve from modal
 */
window.handleApprove = async function() {
    if (!currentApprovalHotel) return;
    
    try {
        await API.admin.approveHotel(currentApprovalHotel.id, true);
        UI.toast('Hotel approved successfully! Owner account has been created.', 'success');
        closeApprovalModal();
        loadPendingApprovals();
        loadHotels();
    } catch (error) {
        console.error('Failed to approve hotel:', error);
        UI.toast(error.message || 'Failed to approve hotel', 'error');
    }
};

/**
 * Handle reject from modal
 */
window.handleReject = async function() {
    const reasonGroup = document.getElementById('rejectionReasonGroup');
    
    // Show reason field if not visible
    if (reasonGroup.style.display === 'none') {
        reasonGroup.style.display = 'block';
        return;
    }
    
    const reason = document.getElementById('rejectionReason').value.trim();
    if (!reason) {
        UI.toast('Please provide a reason for rejection', 'warning');
        return;
    }
    
    if (!currentApprovalHotel) return;
    
    try {
        await API.admin.approveHotel(currentApprovalHotel.id, false, reason);
        UI.toast('Hotel registration rejected', 'success');
        closeApprovalModal();
        loadPendingApprovals();
        loadHotels();
    } catch (error) {
        console.error('Failed to reject hotel:', error);
        UI.toast(error.message || 'Failed to reject hotel', 'error');
    }
};

/**
 * Quick approve without opening modal
 */
window.quickApprove = async function(hotelId) {
    try {
        await API.admin.approveHotel(hotelId, true);
        UI.toast('Hotel approved successfully!', 'success');
        loadPendingApprovals();
        loadHotels();
    } catch (error) {
        console.error('Failed to approve hotel:', error);
        UI.toast(error.message || 'Failed to approve hotel', 'error');
    }
};

/**
 * Quick reject opens modal for reason
 */
window.quickReject = function(hotelId) {
    const hotel = pendingHotels.find(h => h.id === hotelId);
    if (hotel) {
        reviewRegistration(hotelId);
        // Show rejection reason field immediately
        setTimeout(() => {
            document.getElementById('rejectionReasonGroup').style.display = 'block';
        }, 100);
    }
};

// No fallback hotel data - database is the single source of truth

let hotels = [];

async function loadHotels() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const tableBody = document.getElementById('hotelsTableBody');
    
    loadingState.classList.remove('hidden');
    emptyState.classList.add('hidden');
    tableBody.innerHTML = '';
    
    try {
        const response = await API.admin.getHotels();
        hotels = response.data || response.content || response || [];
        
        loadingState.classList.add('hidden');
        
        if (hotels.length === 0) {
            emptyState.classList.remove('hidden');
            document.getElementById('hotelCount').textContent = '0';
            return;
        }
        
        document.getElementById('hotelCount').textContent = hotels.length;
        renderHotels(hotels);
    } catch (error) {
        console.error('Failed to load hotels:', error);
        loadingState.classList.add('hidden');
        emptyState.classList.remove('hidden');
        document.getElementById('hotelCount').textContent = '0';
        UI.toast('Failed to load hotels. Please try again.', 'error');
    }
}

function renderHotels(hotelList) {
    const tableBody = document.getElementById('hotelsTableBody');
    
    tableBody.innerHTML = hotelList.map(hotel => `
        <tr>
            <td>
                <div class="table-hotel">
                    <img src="${hotel.heroImageUrl || hotel.imageUrl || CONFIG.DEFAULT_HOTEL_IMAGE}" 
                         alt="${hotel.name}"
                         onerror="this.src='${CONFIG.DEFAULT_HOTEL_IMAGE}'">
                    <div class="table-hotel-info">
                        <span class="table-hotel-name">${hotel.name}</span>
                    </div>
                </div>
            </td>
            <td>
                <div class="location-cell">
                    <span class="location-city">${hotel.city}</span>
                    <span class="location-country">${hotel.country}</span>
                </div>
            </td>
            <td>${hotel.roomCount || 0}</td>
            <td>
                <div class="stars stars-sm">
                    ${renderStars(hotel.starRating)}
                </div>
            </td>
            <td>
                <span class="price-cell">
                    <span class="currency">$</span>${hotel.minPrice || 0}
                </span>
            </td>
            <td>
                <span class="status-badge ${hotel.active !== false ? 'status-active' : 'status-inactive'}">
                    <i class="fas ${hotel.active !== false ? 'fa-check-circle' : 'fa-pause-circle'}"></i>
                    ${hotel.active !== false ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-table-action btn-edit" title="Edit" onclick="editHotel(${hotel.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-table-action btn-view" title="View Rooms" onclick="viewRooms(${hotel.id})">
                        <i class="fas fa-bed"></i>
                    </button>
                    <button class="btn-table-action btn-delete" title="Delete" onclick="deleteHotel(${hotel.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<i class="fa${i <= rating ? 's' : 'r'} fa-star${i > rating ? ' empty' : ''}"></i>`;
    }
    return stars;
}

function setupEventListeners() {
    const modal = document.getElementById('hotelModal');
    const deleteModal = document.getElementById('deleteModal');
    
    // Add hotel button
    document.getElementById('addHotelBtn').addEventListener('click', () => {
        resetForm();
        document.getElementById('modalTitle').textContent = 'Add New Hotel';
        modal.classList.add('active');
    });
    
    // Close modal buttons
    document.getElementById('closeModal').addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    document.getElementById('cancelBtn').addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    // Close on overlay click
    modal.querySelector('.modal-overlay').addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    // Delete modal
    document.getElementById('closeDeleteModal').addEventListener('click', () => {
        deleteModal.classList.remove('active');
    });
    
    document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
        deleteModal.classList.remove('active');
    });
    
    deleteModal.querySelector('.modal-overlay').addEventListener('click', () => {
        deleteModal.classList.remove('active');
    });
    
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
    
    // Form submission
    document.getElementById('hotelForm').addEventListener('submit', handleSubmit);
    
    // Search
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = hotels.filter(h => 
            h.name.toLowerCase().includes(query) ||
            h.city.toLowerCase().includes(query) ||
            h.country.toLowerCase().includes(query)
        );
        renderHotels(filtered);
    });
    
    // Status filter
    document.getElementById('statusFilter').addEventListener('change', (e) => {
        const status = e.target.value;
        let filtered = hotels;
        if (status === 'active') {
            filtered = hotels.filter(h => h.active !== false && h.approvalStatus !== 'PENDING');
        } else if (status === 'inactive') {
            filtered = hotels.filter(h => h.active === false);
        } else if (status === 'PENDING') {
            filtered = hotels.filter(h => h.approvalStatus === 'PENDING');
        }
        renderHotels(filtered);
    });
}

function resetForm() {
    document.getElementById('hotelForm').reset();
    document.getElementById('hotelId').value = '';
    // Uncheck all amenities
    document.querySelectorAll('input[name="amenities"]').forEach(cb => cb.checked = false);
}

window.editHotel = function(id) {
    const hotel = hotels.find(h => h.id === id);
    if (!hotel) return;
    
    document.getElementById('modalTitle').textContent = 'Edit Hotel';
    document.getElementById('hotelId').value = hotel.id;
    document.getElementById('hotelName').value = hotel.name;
    document.getElementById('hotelRating').value = hotel.starRating;
    document.getElementById('hotelDescription').value = hotel.description;
    document.getElementById('hotelCity').value = hotel.city;
    document.getElementById('hotelCountry').value = hotel.country;
    document.getElementById('hotelAddress').value = hotel.address;
    document.getElementById('hotelPhone').value = hotel.phone || '';
    document.getElementById('hotelEmail').value = hotel.email || '';
    document.getElementById('hotelImage').value = hotel.heroImageUrl || hotel.imageUrl || '';
    
    // Set amenities
    document.querySelectorAll('input[name="amenities"]').forEach(cb => {
        cb.checked = hotel.amenities?.includes(cb.value) || false;
    });
    
    document.getElementById('hotelModal').classList.add('active');
};

window.viewRooms = function(id) {
    window.location.href = `rooms.html?hotelId=${id}`;
};

window.deleteHotel = function(id) {
    document.getElementById('deleteHotelId').value = id;
    document.getElementById('deleteModal').classList.add('active');
};

async function confirmDelete() {
    const id = document.getElementById('deleteHotelId').value;
    
    try {
        await API.admin.deleteHotel(id);
        UI.toast('Hotel deleted successfully', 'success');
        document.getElementById('deleteModal').classList.remove('active');
        loadHotels();
    } catch (error) {
        console.error('Failed to delete hotel:', error);
        UI.toast(error.message || 'Failed to delete hotel', 'error');
        document.getElementById('deleteModal').classList.remove('active');
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');
    submitBtn.disabled = true;
    
    const amenities = Array.from(document.querySelectorAll('input[name="amenities"]:checked'))
        .map(cb => cb.value);
    
    const hotelData = {
        name: document.getElementById('hotelName').value,
        description: document.getElementById('hotelDescription').value,
        city: document.getElementById('hotelCity').value,
        country: document.getElementById('hotelCountry').value,
        address: document.getElementById('hotelAddress').value,
        starRating: parseInt(document.getElementById('hotelRating').value),
        phone: document.getElementById('hotelPhone').value,
        email: document.getElementById('hotelEmail').value,
        heroImageUrl: document.getElementById('hotelImage').value,
        amenities: amenities
    };
    
    const hotelId = document.getElementById('hotelId').value;
    
    try {
        if (hotelId) {
            await API.admin.updateHotel(hotelId, hotelData);
            UI.toast('Hotel updated successfully', 'success');
        } else {
            await API.admin.createHotel(hotelData);
            UI.toast('Hotel created successfully', 'success');
        }
        
        document.getElementById('hotelModal').classList.remove('active');
        loadHotels();
    } catch (error) {
        console.error('Failed to save hotel:', error);
        UI.toast(error.message || 'Failed to save hotel', 'error');
    } finally {
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
        submitBtn.disabled = false;
    }
}
