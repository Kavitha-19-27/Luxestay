/**
 * Home Page JavaScript
 * Handles homepage functionality
 */

document.addEventListener('DOMContentLoaded', () => {
    initSearchForm();
    loadFeaturedHotels();
    loadDestinations();
});

/**
 * Initialize search form
 */
function initSearchForm() {
    const form = document.getElementById('searchForm');
    const checkInInput = document.getElementById('searchCheckIn');
    const checkOutInput = document.getElementById('searchCheckOut');
    
    // Set min dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    checkInInput.min = UI.formatDateForInput(today);
    checkInInput.value = UI.formatDateForInput(today);
    
    checkOutInput.min = UI.formatDateForInput(tomorrow);
    checkOutInput.value = UI.formatDateForInput(tomorrow);
    
    // Update checkout min when checkin changes
    checkInInput.addEventListener('change', () => {
        const checkIn = new Date(checkInInput.value);
        const minCheckout = new Date(checkIn);
        minCheckout.setDate(minCheckout.getDate() + 1);
        
        checkOutInput.min = UI.formatDateForInput(minCheckout);
        
        if (new Date(checkOutInput.value) <= checkIn) {
            checkOutInput.value = UI.formatDateForInput(minCheckout);
        }
    });
    
    // Form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const destination = document.getElementById('searchDestination').value;
        const checkIn = checkInInput.value;
        const checkOut = checkOutInput.value;
        const guests = document.getElementById('searchGuests').value;
        
        // Build search URL
        const params = new URLSearchParams();
        if (destination) params.append('search', destination);
        if (checkIn) params.append('checkIn', checkIn);
        if (checkOut) params.append('checkOut', checkOut);
        if (guests) params.append('guests', guests);
        
        window.location.href = `hotels.html?${params.toString()}`;
    });
}

/**
 * Load featured hotels
 */
async function loadFeaturedHotels() {
    const container = document.getElementById('featuredHotels');
    
    // Show skeleton loading for premium experience
    UI.showSkeletonLoading(container, 3, 'card');
    
    try {
        const response = await API.hotels.getFeatured();
        
        if (response.success && response.data && response.data.length > 0) {
            container.innerHTML = response.data.map(hotel => UI.renderHotelCard(hotel)).join('');
        } else {
            // Fallback: load all hotels
            const allHotels = await API.hotels.getAll({ page: 0, size: 6 });
            if (allHotels.success && allHotels.data && allHotels.data.content && allHotels.data.content.length > 0) {
                container.innerHTML = allHotels.data.content.map(hotel => UI.renderHotelCard(hotel)).join('');
            } else {
                // Show empty state - no fake data
                UI.showEmpty(container, 'No Hotels Available', 'Check back soon for new listings', 'fa-hotel');
            }
        }
    } catch (error) {
        console.error('Error loading hotels:', error);
        // Show error state - no fake data
        UI.showErrorWithRetry(container, 'Unable to load hotels. Please check your connection.', () => loadFeaturedHotels());
    }
}

// No fallback hotels - database is the single source of truth

/**
 * Load popular destinations from API (database as single source of truth)
 */
async function loadDestinations() {
    const container = document.getElementById('destinationsGrid');
    
    try {
        // Fetch destinations from the backend API
        const response = await API.destinations.getAll();
        
        if (response.success && response.data && response.data.length > 0) {
            // Sort by sortOrder, then alphabetically
            const destinations = response.data.sort((a, b) => {
                if (a.sortOrder !== b.sortOrder) {
                    return a.sortOrder - b.sortOrder;
                }
                return a.city.localeCompare(b.city);
            });
            
            // Show up to 12 destinations
            container.innerHTML = destinations.slice(0, 12).map(dest => renderDestinationCard(dest)).join('');
        } else {
            // Show empty state - no fake data
            UI.showEmpty(container, 'No Destinations', 'Check back soon for new destinations', 'fa-map-marker-alt');
        }
    } catch (error) {
        console.error('Error loading destinations:', error);
        // Show error state - no fake data
        UI.showEmpty(container, 'Unable to Load Destinations', 'Please try again later', 'fa-map-marker-alt');
    }
}

/**
 * Render destination card with cache-busting
 */
function renderDestinationCard(dest) {
    // Add cache-busting parameter to ensure fresh images after admin updates
    const imageUrl = dest.updatedAt 
        ? `${dest.imageUrl}${dest.imageUrl.includes('?') ? '&' : '?'}v=${new Date(dest.updatedAt).getTime()}`
        : dest.imageUrl;
    
    return `
        <a href="hotels.html?search=${encodeURIComponent(dest.city)}" class="destination-card">
            <img src="${imageUrl}" alt="${dest.city}" onerror="this.src='https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600'">
            <div class="destination-card-overlay">
                <h3 class="destination-card-title">${dest.city}</h3>
                <p class="destination-card-count">Explore hotels</p>
            </div>
        </a>
    `;
}

// No fallback destinations - database is the single source of truth
