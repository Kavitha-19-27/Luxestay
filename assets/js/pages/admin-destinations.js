/**
 * Admin Destinations Management
 * CRUD operations for destination images
 */

// Store destinations in localStorage (simulating database)
const DESTINATIONS_KEY = 'luxestay_destinations';

// Default destinations from CONFIG
const DEFAULT_DESTINATIONS = {
    // Tamil Nadu
    'Chennai': { imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=600', region: 'tamilnadu' },
    'Coimbatore': { imageUrl: 'https://images.unsplash.com/photo-1590077428593-a55bb07c4665?w=600', region: 'tamilnadu' },
    'Madurai': { imageUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=600', region: 'tamilnadu' },
    'Ooty': { imageUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600', region: 'tamilnadu' },
    'Kodaikanal': { imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600', region: 'tamilnadu' },
    'Pondicherry': { imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=600', region: 'tamilnadu' },
    'Kanyakumari': { imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600', region: 'tamilnadu' },
    'Mahabalipuram': { imageUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600', region: 'tamilnadu' },
    'Coonoor': { imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600', region: 'tamilnadu' },
    
    // USA
    'New York': { imageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600', region: 'usa' },
    'Miami': { imageUrl: 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=600', region: 'usa' },
    'Chicago': { imageUrl: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=600', region: 'usa' },
    'Los Angeles': { imageUrl: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=600', region: 'usa' },
    'Las Vegas': { imageUrl: 'https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=600', region: 'usa' },
    'Aspen': { imageUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600', region: 'usa' },
    
    // Europe
    'Paris': { imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600', region: 'europe' },
    'London': { imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600', region: 'europe' },
    'Rome': { imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600', region: 'europe' },
    'Barcelona': { imageUrl: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600', region: 'europe' },
    
    // Asia
    'Tokyo': { imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600', region: 'asia' },
    'Singapore': { imageUrl: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600', region: 'asia' },
    'Dubai': { imageUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600', region: 'asia' },
    
    // Other
    'Sydney': { imageUrl: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600', region: 'other' },
    'Maldives': { imageUrl: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=600', region: 'other' }
};

let destinations = {};
let currentFilter = 'all';
let editingCity = null;
let deletingCity = null;

/**
 * Initialize the page
 */
document.addEventListener('DOMContentLoaded', () => {
    // Check admin access
    if (!requireAdmin()) return;
    
    // Initialize user info
    initUserInfo();
    
    // Load destinations
    loadDestinations();
    
    // Render destinations
    renderDestinations();
    
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
 * Load destinations from localStorage or use defaults
 */
function loadDestinations() {
    const stored = localStorage.getItem(DESTINATIONS_KEY);
    if (stored) {
        destinations = JSON.parse(stored);
    } else {
        destinations = { ...DEFAULT_DESTINATIONS };
        saveToStorage();
    }
}

/**
 * Save destinations to localStorage
 */
function saveToStorage() {
    localStorage.setItem(DESTINATIONS_KEY, JSON.stringify(destinations));
}

/**
 * Render destinations grid
 */
function renderDestinations() {
    const grid = document.getElementById('destinationsGrid');
    const emptyState = document.getElementById('emptyState');
    
    // Filter destinations
    let filtered = Object.entries(destinations);
    
    if (currentFilter !== 'all') {
        filtered = filtered.filter(([city, data]) => data.region === currentFilter);
    }
    
    // Search filter
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value.trim()) {
        const search = searchInput.value.toLowerCase();
        filtered = filtered.filter(([city]) => city.toLowerCase().includes(search));
    }
    
    if (filtered.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    
    grid.innerHTML = filtered.map(([city, data]) => `
        <div class="destination-admin-card" data-city="${city}">
            <div class="destination-image">
                <img src="${data.imageUrl}" alt="${city}" onerror="this.src='https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600'">
                <div class="destination-overlay">
                    <div class="destination-actions">
                        <button class="action-btn" onclick="editDestination('${city}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn action-btn-danger" onclick="deleteDestination('${city}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="destination-info">
                <h3 class="destination-name">${city}</h3>
                <span class="destination-region">${getRegionLabel(data.region)}</span>
            </div>
        </div>
    `).join('');
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
    return labels[region] || region;
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
    editingCity = null;
    document.getElementById('modalTitle').textContent = 'Add Destination';
    document.getElementById('destinationForm').reset();
    document.getElementById('cityName').disabled = false;
    hidePreview();
    document.getElementById('destinationModal').classList.add('active');
}

/**
 * Edit destination
 */
function editDestination(city) {
    editingCity = city;
    const data = destinations[city];
    
    document.getElementById('modalTitle').textContent = 'Edit Destination';
    document.getElementById('cityName').value = city;
    document.getElementById('cityName').disabled = true; // Can't change city name
    document.getElementById('imageUrl').value = data.imageUrl;
    document.getElementById('region').value = data.region;
    
    // Show preview
    showPreview(data.imageUrl);
    
    document.getElementById('destinationModal').classList.add('active');
}

/**
 * Save destination
 */
function saveDestination(event) {
    event.preventDefault();
    
    const cityName = document.getElementById('cityName').value.trim();
    const imageUrl = document.getElementById('imageUrl').value.trim();
    const region = document.getElementById('region').value;
    
    if (!cityName || !imageUrl) {
        UI.toast('Please fill in all required fields', 'error');
        return;
    }
    
    // Check for duplicate (only for new destinations)
    if (!editingCity && destinations[cityName]) {
        UI.toast('A destination with this name already exists', 'error');
        return;
    }
    
    // Save destination
    destinations[editingCity || cityName] = {
        imageUrl: imageUrl,
        region: region
    };
    
    saveToStorage();
    renderDestinations();
    closeModal();
    
    UI.toast(editingCity ? 'Destination updated successfully' : 'Destination added successfully', 'success');
}

/**
 * Delete destination
 */
function deleteDestination(city) {
    deletingCity = city;
    document.getElementById('deleteCityName').textContent = city;
    document.getElementById('deleteModal').classList.add('active');
}

/**
 * Confirm delete
 */
function confirmDelete() {
    if (deletingCity && destinations[deletingCity]) {
        delete destinations[deletingCity];
        saveToStorage();
        renderDestinations();
        closeDeleteModal();
        UI.toast('Destination deleted successfully', 'success');
    }
}

/**
 * Close main modal
 */
function closeModal() {
    document.getElementById('destinationModal').classList.remove('active');
    editingCity = null;
}

/**
 * Close delete modal
 */
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    deletingCity = null;
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
 * Reset destinations to defaults
 */
function resetToDefaults() {
    if (confirm('Are you sure you want to reset all destinations to defaults? This cannot be undone.')) {
        destinations = { ...DEFAULT_DESTINATIONS };
        saveToStorage();
        renderDestinations();
        UI.toast('Destinations reset to defaults', 'success');
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
