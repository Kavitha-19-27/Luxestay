/**
 * Hotels Page JavaScript
 * Updated for Server-Side Pagination & Filtering
 */

let currentPage = 0;
let totalPages = 0;
let isLoading = false;
let selectedStarRating = 'all'; // Track selected star rating
let selectedLocation = null; // Track selected quick location

document.addEventListener('DOMContentLoaded', () => {
    initFilters();
    initStarRatingChips();
    initQuickLocationChips();
    // Initial load
    fetchHotels(0);
    
    // Load Guest Match recommendations for logged-in users
    if (window.GuestMatch) {
        window.GuestMatch.initOnHotelsPage('guestMatchContainer');
    }
});

/**
 * Initialize star rating filter chips
 */
function initStarRatingChips() {
    const starChips = document.querySelectorAll('#starRatingChips .filter-chip');
    
    starChips.forEach(chip => {
        chip.addEventListener('click', function() {
            // Remove active class from all chips
            starChips.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked chip
            this.classList.add('active');
            
            // Update selected star rating
            selectedStarRating = this.getAttribute('data-stars');
            
            // Reset page and fetch
            fetchHotels(0);
        });
    });
}

/**
 * Initialize quick location chips
 */
function initQuickLocationChips() {
    const locationChips = document.querySelectorAll('#quickLocations .location-chip');
    
    locationChips.forEach(chip => {
        chip.addEventListener('click', function() {
            const location = this.getAttribute('data-location');
            
            // Toggle selection
            if (selectedLocation === location) {
                // Deselect
                selectedLocation = null;
                this.classList.remove('active');
            } else {
                // Remove active from all chips
                locationChips.forEach(c => c.classList.remove('active'));
                
                // Select this location
                selectedLocation = location;
                this.classList.add('active');
            }
            
            // Update search input with location
            const searchInput = document.getElementById('searchInput');
            searchInput.value = selectedLocation || '';
            
            // Reset page and fetch
            fetchHotels(0);
        });
    });
}

/**
 * Initialize filters
 */
function initFilters() {
    const form = document.getElementById('filterForm');
    const checkInInput = document.getElementById('filterCheckIn');
    const checkOutInput = document.getElementById('filterCheckOut');
    
    // Reset form to clear browser cached values
    form.reset();
    
    // Set min dates
    const today = new Date();
    checkInInput.min = UI.formatDateForInput(today);
    
    // Get URL params and pre-fill
    const params = UI.getUrlParams();
    
    if (params.search) {
        document.getElementById('searchInput').value = params.search;
    }
    if (params.checkIn) {
        checkInInput.value = params.checkIn;
    }
    if (params.checkOut) {
        checkOutInput.value = params.checkOut;
    }
    if (params.guests) {
        document.getElementById('filterGuests').value = params.guests;
    }
    
    // Check-in change updates check-out min
    checkInInput.addEventListener('change', () => {
        const checkIn = new Date(checkInInput.value);
        const minCheckout = new Date(checkIn);
        minCheckout.setDate(minCheckout.getDate() + 1);
        
        checkOutInput.min = UI.formatDateForInput(minCheckout);
        
        if (checkOutInput.value && new Date(checkOutInput.value) <= checkIn) {
            checkOutInput.value = UI.formatDateForInput(minCheckout);
        }
    });
    
    // Filter change handlers - trigger API call
    const liveFilters = ['filterRegion', 'filterStars', 'filterPrice', 'filterSort'];
    liveFilters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', () => {
                fetchHotels(0);
            });
        }
    });
    
    // Search input with debounce
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            fetchHotels(0);
        }, 500); // Increased debounce time for network requests
    });
    
    // Form submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        fetchHotels(0);
    });
    
    // Clear filters
    document.getElementById('clearFilters').addEventListener('click', () => {
        form.reset();
        
        // Reset star rating chips
        const starChips = document.querySelectorAll('#starRatingChips .filter-chip');
        starChips.forEach(c => c.classList.remove('active'));
        starChips[0]?.classList.add('active'); // Select "All"
        selectedStarRating = 'all';
        
        // Reset location chips
        const locationChips = document.querySelectorAll('#quickLocations .location-chip');
        locationChips.forEach(c => c.classList.remove('active'));
        selectedLocation = null;
        
        // Clear URL params
        if (window.location.search) {
            window.history.replaceState({}, '', window.location.pathname);
        }
        
        // Fetch original list
        fetchHotels(0);
    });
}

/**
 * Get current filter values
 */
function getFilters() {
    const regionSelect = document.getElementById('filterRegion');
    const searchInput = document.getElementById('searchInput');
    const priceSelect = document.getElementById('filterPrice');
    const sortSelect = document.getElementById('filterSort');
    
    // Map current sort value to sortBy/sortDir
    let sortBy = 'name';
    let sortDir = 'asc';
    
    if (sortSelect) {
        const val = sortSelect.value;
        if (val === 'price_asc') {
            sortBy = 'minPrice';
            sortDir = 'asc';
        } else if (val === 'price_desc') {
            sortBy = 'minPrice';
            sortDir = 'desc';
        } else if (val === 'rating') {
            sortBy = 'starRating';
            sortDir = 'desc';
        }
    }

    return {
        search: (searchInput ? searchInput.value : '').trim(),
        minStars: selectedStarRating || 'all',
        maxPrice: priceSelect ? priceSelect.value : '',
        region: regionSelect ? regionSelect.value : '',
        sortBy,
        sortDir
    };
}

/**
 * Fetch hotels from server (Server-Side Filter & Pagination)
 */
async function fetchHotels(page = 0) {
    // If a request is already running, we could cancel it or ignore (simplifying: just let it run)
    // but we update isLoading state
    const container = document.getElementById('hotelsGrid');
    const resultsCount = document.getElementById('resultsCount');
    const paginationContainer = document.getElementById('pagination');
    
    isLoading = true;
    currentPage = page;
    
    // Show skeleton loading for premium experience
    UI.showSkeletonLoading(container, 6, 'card');
    
    try {
        const filters = getFilters();
        
        // Prepare API params
        const params = {
            page: page,
            size: CONFIG.DEFAULT_PAGE_SIZE,
            sortBy: filters.sortBy,
            sortDir: filters.sortDir
        };

        if (filters.search) {
            params.search = filters.search;
        } else if (filters.region === 'tamilnadu') {
            params.search = 'Tamil Nadu';
        }

        if (filters.minStars !== 'all') params.minStars = filters.minStars;
        if (filters.maxPrice) params.maxPrice = filters.maxPrice;
        
        const response = await API.hotels.search(params);
        
        if (response.success && response.data) {
            const pageData = response.data;
            const hotels = pageData.content || [];
            totalPages = pageData.totalPages || 0;
            const totalElements = pageData.totalElements || 0;
            
            // Render Results Count
            resultsCount.innerHTML = `Showing <strong>${hotels.length}</strong> of <strong>${totalElements}</strong> hotels`;
            
            // Render Hotels with staggered animation
            if (hotels.length > 0) {
                container.innerHTML = hotels.map(hotel => UI.renderHotelCard(hotel)).join('');
                // Cards will auto-animate via CSS staggered animations
                renderPagination();
            } else {
                container.innerHTML = '';
                UI.showEmpty(container, 'No Hotels Found', 'Try adjusting your search filters', 'fa-hotel');
                paginationContainer.innerHTML = '';
            }
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error loading hotels:', error);
        container.innerHTML = '';
        UI.showErrorWithRetry(container, 'Failed to load hotels. Please check your connection.', () => fetchHotels(page));
    } finally {
        isLoading = false;
    }
}

/**
 * Render pagination
 */
function renderPagination() {
    const container = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `
        <button class="pagination-btn" ${currentPage === 0 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Page numbers logic (show limited window)
    for (let i = 0; i < totalPages; i++) {
        if (i === 0 || i === totalPages - 1 || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
                    ${i + 1}
                </button>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += '<span class="pagination-ellipsis">...</span>';
        }
    }
    
    // Next button
    html += `
        <button class="pagination-btn" ${currentPage === totalPages - 1 ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    container.innerHTML = html;
}

/**
 * Go to specific page
 */
function goToPage(page) {
    if (page < 0 || page >= totalPages) return;
    fetchHotels(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Make functions globally available for inline onclick attributes
window.goToPage = goToPage;