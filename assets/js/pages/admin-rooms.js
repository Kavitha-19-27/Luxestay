/**
 * Admin Rooms Management
 * ADMIN role only
 */

document.addEventListener('DOMContentLoaded', () => {
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
    
    initAdminRooms();
});

// No fallback data - database is the single source of truth

let rooms = [];
let hotels = [];

function initAdminRooms() {
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
    
    // Load data
    loadHotels();
    loadRooms();
    setupEventListeners();
    
    // Check for hotel filter from URL
    const urlParams = new URLSearchParams(window.location.search);
    const hotelId = urlParams.get('hotelId');
    if (hotelId) {
        setTimeout(() => {
            document.getElementById('hotelFilter').value = hotelId;
            filterRooms();
        }, 500);
    }
}

async function loadHotels() {
    try {
        const response = await API.admin.getHotels();
        hotels = response.data || response.content || response || [];
    } catch (error) {
        console.error('Failed to load hotels:', error);
        hotels = [];
    }
    
    // Populate hotel dropdowns
    const hotelFilter = document.getElementById('hotelFilter');
    const hotelSelect = document.getElementById('hotelId');
    
    hotels.forEach(hotel => {
        hotelFilter.innerHTML += `<option value="${hotel.id}">${hotel.name}</option>`;
    });
    
    hotels.forEach(hotel => {
        hotelSelect.innerHTML += `<option value="${hotel.id}">${hotel.name}</option>`;
    });
}

async function loadRooms() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const tableBody = document.getElementById('roomsTableBody');
    
    loadingState.classList.remove('hidden');
    emptyState.classList.add('hidden');
    tableBody.innerHTML = '';
    
    try {
        const response = await API.admin.getRooms();
        rooms = response.data || response.content || response || [];
        
        loadingState.classList.add('hidden');
        
        if (rooms.length === 0) {
            emptyState.classList.remove('hidden');
            document.getElementById('roomCount').textContent = '0';
            return;
        }
        
        document.getElementById('roomCount').textContent = rooms.length;
        renderRooms(rooms);
    } catch (error) {
        console.error('Failed to load rooms:', error);
        loadingState.classList.add('hidden');
        emptyState.classList.remove('hidden');
        document.getElementById('roomCount').textContent = '0';
        UI.toast('Failed to load rooms. Please try again.', 'error');
    }
}

function renderRooms(roomList) {
    const tableBody = document.getElementById('roomsTableBody');
    
    tableBody.innerHTML = roomList.map(room => `
        <tr>
            <td>
                <div class="table-hotel">
                    <img src="${room.imageUrl || CONFIG.DEFAULT_ROOM_IMAGE}" 
                         alt="${room.name}"
                         onerror="this.src='${CONFIG.DEFAULT_ROOM_IMAGE}'">
                    <span>${room.name}</span>
                </div>
            </td>
            <td>${room.hotelName || hotels.find(h => h.id === room.hotelId)?.name || 'N/A'}</td>
            <td><span class="badge badge-info">${room.roomType}</span></td>
            <td><i class="fas fa-user-friends"></i> ${room.capacity}</td>
            <td>${UI.formatCurrency(room.pricePerNight)}</td>
            <td>
                <span class="badge ${getStatusBadgeClass(room.status || 'available')}">
                    ${(room.status || 'available').charAt(0).toUpperCase() + (room.status || 'available').slice(1)}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="action-btn edit-btn" title="Edit" onclick="editRoom(${room.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" title="Delete" onclick="deleteRoom(${room.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'available': return 'badge-success';
        case 'occupied': return 'badge-warning';
        case 'maintenance': return 'badge-error';
        default: return 'badge-info';
    }
}

function setupEventListeners() {
    const modal = document.getElementById('roomModal');
    const deleteModal = document.getElementById('deleteModal');
    
    // Add room button
    document.getElementById('addRoomBtn').addEventListener('click', () => {
        resetForm();
        document.getElementById('modalTitle').textContent = 'Add New Room';
        modal.classList.add('active');
    });
    
    // Modal close buttons
    document.getElementById('closeModal').addEventListener('click', () => modal.classList.remove('active'));
    document.getElementById('cancelBtn').addEventListener('click', () => modal.classList.remove('active'));
    modal.querySelector('.modal-overlay').addEventListener('click', () => modal.classList.remove('active'));
    
    // Delete modal
    document.getElementById('closeDeleteModal').addEventListener('click', () => deleteModal.classList.remove('active'));
    document.getElementById('cancelDeleteBtn').addEventListener('click', () => deleteModal.classList.remove('active'));
    deleteModal.querySelector('.modal-overlay').addEventListener('click', () => deleteModal.classList.remove('active'));
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
    
    // Form submission
    document.getElementById('roomForm').addEventListener('submit', handleSubmit);
    
    // Filters
    document.getElementById('searchInput').addEventListener('input', filterRooms);
    document.getElementById('hotelFilter').addEventListener('change', filterRooms);
    document.getElementById('statusFilter').addEventListener('change', filterRooms);
}

function filterRooms() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const hotelId = document.getElementById('hotelFilter').value;
    const status = document.getElementById('statusFilter').value;
    
    let filtered = rooms.filter(room => {
        const matchSearch = room.name.toLowerCase().includes(search) || 
                           (room.hotelName || '').toLowerCase().includes(search);
        const matchHotel = !hotelId || room.hotelId === parseInt(hotelId);
        const matchStatus = !status || (room.status || 'available') === status;
        return matchSearch && matchHotel && matchStatus;
    });
    
    renderRooms(filtered);
}

function resetForm() {
    document.getElementById('roomForm').reset();
    document.getElementById('roomId').value = '';
    document.getElementById('roomNumber').value = '';
    document.querySelectorAll('input[name="roomAmenities"]').forEach(cb => cb.checked = false);
}

window.editRoom = function(id) {
    const room = rooms.find(r => r.id === id);
    if (!room) return;
    
    document.getElementById('modalTitle').textContent = 'Edit Room';
    document.getElementById('roomId').value = room.id;
    document.getElementById('hotelId').value = room.hotelId;
    document.getElementById('roomType').value = room.roomType;
    document.getElementById('roomNumber').value = room.roomNumber || '';
    document.getElementById('roomName').value = room.name;
    document.getElementById('roomDescription').value = room.description || '';
    document.getElementById('roomCapacity').value = room.capacity;
    document.getElementById('roomBeds').value = room.beds || room.bedType?.match(/\d+/)?.[0] || 1;
    document.getElementById('roomPrice').value = room.pricePerNight;
    document.getElementById('roomSize').value = room.sizeSqm || room.size || '';
    document.getElementById('roomImage').value = room.imageUrl || '';
    
    document.querySelectorAll('input[name="roomAmenities"]').forEach(cb => {
        cb.checked = room.amenities?.includes(cb.value) || false;
    });
    
    document.getElementById('roomModal').classList.add('active');
};

window.deleteRoom = function(id) {
    document.getElementById('deleteRoomId').value = id;
    document.getElementById('deleteModal').classList.add('active');
};

async function confirmDelete() {
    const id = document.getElementById('deleteRoomId').value;
    
    try {
        await API.admin.deleteRoom(id);
        UI.toast('Room deleted successfully', 'success');
        await loadRooms();
    } catch (error) {
        console.error('Failed to delete room:', error);
        UI.toast(error.message || 'Failed to delete room', 'error');
    }
    
    document.getElementById('deleteModal').classList.remove('active');
}

async function handleSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');
    submitBtn.disabled = true;
    
    const amenities = Array.from(document.querySelectorAll('input[name="roomAmenities"]:checked'))
        .map(cb => cb.value);
    
    const hotelId = parseInt(document.getElementById('hotelId').value);
    
    const roomData = {
        roomNumber: document.getElementById('roomNumber').value,
        name: document.getElementById('roomName').value,
        description: document.getElementById('roomDescription').value,
        roomType: document.getElementById('roomType').value,
        capacity: parseInt(document.getElementById('roomCapacity').value),
        bedType: document.getElementById('roomBeds').value + ' bed(s)',
        pricePerNight: parseFloat(document.getElementById('roomPrice').value),
        sizeSqm: parseInt(document.getElementById('roomSize').value) || null,
        imageUrl: document.getElementById('roomImage').value,
        amenities: amenities
    };
    
    const roomId = document.getElementById('roomId').value;
    
    try {
        if (roomId) {
            await API.admin.updateRoom(roomId, roomData);
            UI.toast('Room updated successfully', 'success');
        } else {
            await API.admin.createRoom(hotelId, roomData);
            UI.toast('Room created successfully', 'success');
        }
        document.getElementById('roomModal').classList.remove('active');
        loadRooms();
    } catch (error) {
        console.error('Failed to save room:', error);
        UI.toast(error.message || 'Failed to save room', 'error');
    } finally {
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
        submitBtn.disabled = false;
    }
}
