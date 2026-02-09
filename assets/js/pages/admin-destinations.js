/**
 * Admin Destinations Management
 * CRUD operations for destination images via Backend API
 * Now uses database storage instead of localStorage for proper data persistence
 */

let destinations = [];
let currentFilter = 'all';
let editingDestination = null;
let deletingDestination = null;

/**
 * Initialize the page
 */
document.addEventListener('DOMContentLoaded', () => {
    // Check admin access
    if (!requireAdmin()) return;
    
    // Initialize user info
    initUserInfo();
    
    // Load destinations from API
    loadDestinations();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup sidebar toggle
    setupSidebar();
});

/**
 * Initialize user info in topbar
 */
function initUserInfo() {
    const user = Auth.getUser();
    if (user) {
        document.getElementById('userAvatar').textContent = Auth.getUserInitials();
        document.getElementById('userName').textContent = Auth.getUserDisplayName();
    }
}

/**
 * Load destinations from API
 */
async function loadDestinations() {
    const grid = document.getElementById('destinationsGrid');
    
    // Show loading state
    grid.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading destinations...</p></div>';
    
    try {
        const response = await API.admin.getDestinations();
        
        if (response.success && response.data) {
            destinations = response.data;
            
            // If no destinations exist, seed defaults
            if (destinations.length === 0) {
                await seedDestinations();
                return; // seedDestinations will call loadDestinations again
            }
            
            renderDestinations();
        } else {
            throw new Error('Failed to load destinations');
        }
    } catch (error) {
        console.error('Error loading destinations:', error);
        
        // If API fails (possibly first time), try to seed
        if (error.status === 404 || destinations.length === 0) {
            await seedDestinations();
        } else {
            grid.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to load destinations</h3>
                    <p>${error.message || 'Please try again later'}</p>
                    <button class="btn btn-primary" onclick="loadDestinations()">Retry</button>
                </div>
            `;
        }
    }
}

/**
 * Seed default destinations to database
 */
async function seedDestinations() {
    try {
        UI.toast('Initializing destinations...', 'info');
        const response = await API.admin.seedDestinations();
        
        if (response.success && response.data) {
            destinations = response.data;
            renderDestinations();
            UI.toast('Destinations initialized successfully', 'success');
        }
    } catch (error) {
        console.error('Error seeding destinations:', error);
        UI.toast('Failed to initialize destinations', 'error');
    }
}

/**
 * Render destinations grid
 */
function renderDestinations() {
    const grid = document.getElementById('destinationsGrid');
    const emptyState = document.getElementById('emptyState');
    
    // Filter destinations
    let filtered = [...destinations];
    
    if (currentFilter !== 'all') {
        filtered = filtered.filter(dest => dest.region === currentFilter);
    }
    
    // Search filter
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value.trim()) {
        const search = searchInput.value.toLowerCase();
        filtered = filtered.filter(dest => dest.city.toLowerCase().includes(search));
    }
    
    if (filtered.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    
    grid.innerHTML = filtered.map(dest => {
        // Add cache-busting parameter to image URL
        const imageUrl = dest.updatedAt 
            ? `${dest.imageUrl}${dest.imageUrl.includes('?') ? '&' : '?'}v=${new Date(dest.updatedAt).getTime()}`
            : dest.imageUrl;
        
        return `
            <div class="destination-admin-card" data-id="${dest.id}" data-city="${dest.city}">
                <div class="destination-image">
                    <img src="${imageUrl}" alt="${dest.city}" onerror="this.src='https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600'">
                    <div class="destination-overlay">
                        <div class="destination-actions">
                            <button class="action-btn" onclick="editDestination(${dest.id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn action-btn-danger" onclick="deleteDestination(${dest.id}, '${dest.city}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="destination-info">
                    <h3 class="destination-name">${dest.city}</h3>
                    <span class="destination-region">${getRegionLabel(dest.region)}</span>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Get region display label
 */
function getRegionLabel(region) {
    const labels = {
        'tamilnadu': 'Tamil Nadu',
        'usa': 'USA',
        'europe': 'Europe',
        'asia': 'Asia',
        'other': 'Other'
    };
    return labels[region] || region || 'Other';
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.region;
            renderDestinations();
        });
    });
    
    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            renderDestinations();
        }, 300));
    }
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            Auth.logout();
            UI.toast('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 500);
        });
    }
}

/**
 * Setup sidebar toggle
 */
function setupSidebar() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (toggle && sidebar) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
}

/**
 * Open add destination modal
 */
function openAddModal() {
    editingDestination = null;
    document.getElementById('modalTitle').textContent = 'Add Destination';
    document.getElementById('destinationForm').reset();
    document.getElementById('cityName').disabled = false;
    hidePreview();
    document.getElementById('destinationModal').classList.add('active');
}

/**
 * Edit destination
 */
function editDestination(id) {
    editingDestination = destinations.find(d => d.id === id);
    if (!editingDestination) return;
    
    document.getElementById('modalTitle').textContent = 'Edit Destination';
    document.getElementById('cityName').value = editingDestination.city;
    document.getElementById('cityName').disabled = true; // Can't change city name
    document.getElementById('imageUrl').value = editingDestination.imageUrl;
    document.getElementById('region').value = editingDestination.region || 'other';
    
    // Show preview
    showPreview(editingDestination.imageUrl);
    
    document.getElementById('destinationModal').classList.add('active');
}

/**
 * Save destination (create or update via API)
 */
async function saveDestination(event) {
    event.preventDefault();
    
    const cityName = document.getElementById('cityName').value.trim();
    const imageUrl = document.getElementById('imageUrl').value.trim();
    const region = document.getElementById('region').value;
    
    if (!cityName || !imageUrl) {
        UI.toast('Please fill in all required fields', 'error');
        return;
    }
    
    const destinationData = {
        city: cityName,
        imageUrl: imageUrl,
        region: region || 'other',
        isActive: true
    };
    
    // Disable form while saving
    const submitBtn = document.querySelector('#destinationForm button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    try {
        let response;
        
        if (editingDestination) {
            // Update existing destination
            response = await API.admin.updateDestination(editingDestination.id, destinationData);
        } else {
            // Create new destination
            response = await API.admin.createDestination(destinationData);
        }
        
        if (response.success) {
            closeModal();
            await loadDestinations(); // Reload from server to get fresh data
            UI.toast(editingDestination ? 'Destination updated successfully' : 'Destination added successfully', 'success');
        } else {
            throw new Error(response.message || 'Failed to save destination');
        }
    } catch (error) {
        console.error('Error saving destination:', error);
        UI.toast(error.message || 'Failed to save destination', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Delete destination
 */
function deleteDestination(id, city) {
    deletingDestination = { id, city };
    document.getElementById('deleteCityName').textContent = city;
    document.getElementById('deleteModal').classList.add('active');
}

/**
 * Confirm delete (via API)
 */
async function confirmDelete() {
    if (!deletingDestination) return;
    
    const deleteBtn = document.querySelector('#deleteModal .btn-danger');
    const originalText = deleteBtn.innerHTML;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    deleteBtn.disabled = true;
    
    try {
        const response = await API.admin.deleteDestination(deletingDestination.id);
        
        if (response.success) {
            closeDeleteModal();
            await loadDestinations(); // Reload from server
            UI.toast('Destination deleted successfully', 'success');
        } else {
            throw new Error(response.message || 'Failed to delete destination');
        }
    } catch (error) {
        console.error('Error deleting destination:', error);
        UI.toast(error.message || 'Failed to delete destination', 'error');
    } finally {
        deleteBtn.innerHTML = originalText;
        deleteBtn.disabled = false;
    }
}

/**
 * Close main modal
 */
function closeModal() {
    document.getElementById('destinationModal').classList.remove('active');
    editingDestination = null;
}

/**
 * Close delete modal
 */
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    deletingDestination = null;
}

/**
 * Preview image
 */
function previewImage() {
    const imageUrl = document.getElementById('imageUrl').value.trim();
    if (imageUrl) {
        showPreview(imageUrl);
    }
}

/**
 * Show image preview
 */
function showPreview(url) {
    const preview = document.getElementById('imagePreview');
    const img = document.getElementById('previewImg');
    const placeholder = preview.querySelector('.preview-placeholder');
    
    img.src = url;
    img.style.display = 'block';
    placeholder.style.display = 'none';
    
    img.onerror = () => {
        img.style.display = 'none';
        placeholder.style.display = 'flex';
        placeholder.innerHTML = '<i class="fas fa-exclamation-triangle"></i><p>Invalid image URL</p>';
    };
}

/**
 * Hide image preview
 */
function hidePreview() {
    const preview = document.getElementById('imagePreview');
    const img = document.getElementById('previewImg');
    const placeholder = preview.querySelector('.preview-placeholder');
    
    img.src = '';
    img.style.display = 'none';
    placeholder.style.display = 'flex';
    placeholder.innerHTML = '<i class="fas fa-image"></i><p>Image preview will appear here</p>';
}

/**
 * Debounce utility
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Reset destinations to defaults (via API seed)
 */
async function resetToDefaults() {
    if (confirm('Are you sure you want to reset all destinations to defaults? This will re-seed the default destinations.')) {
        try {
            await seedDestinations();
        } catch (error) {
            console.error('Error resetting destinations:', error);
            UI.toast('Failed to reset destinations', 'error');
        }
    }
}

/**
 * Export destinations as JSON
 */
function exportDestinations() {
    const dataStr = JSON.stringify(destinations, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', 'luxestay-destinations.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    UI.toast('Destinations exported successfully', 'success');
}
