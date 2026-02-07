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
 * Get destination image URL (from localStorage or CONFIG fallback)
 */
function getDestinationImage(city) {
    // Check localStorage first (admin-managed destinations)
    const storedDestinations = localStorage.getItem('luxestay_destinations');
    if (storedDestinations) {
        const destinations = JSON.parse(storedDestinations);
        if (destinations[city] && destinations[city].imageUrl) {
            return destinations[city].imageUrl;
        }
    }
    // Fallback to CONFIG
    return CONFIG.CITY_IMAGES[city] || 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600';
}

/**
 * Get all admin-added destinations from localStorage
 */
function getAdminDestinations() {
    const storedDestinations = localStorage.getItem('luxestay_destinations');
    if (storedDestinations) {
        return Object.keys(JSON.parse(storedDestinations));
    }
    return [];
}

/**
 * Load popular destinations
 */
async function loadDestinations() {
    const container = document.getElementById('destinationsGrid');
    
    try {
        const response = await API.hotels.getCities();
        let cities = [];
        
        if (response.success && response.data && response.data.length > 0) {
            cities = [...response.data];
        }
        
        // Merge with admin-added destinations
        const adminDestinations = getAdminDestinations();
        adminDestinations.forEach(city => {
            if (!cities.includes(city)) {
                cities.push(city);
            }
        });
        
        if (cities.length > 0) {
            // Sort alphabetically and show up to 12 cities
            cities.sort();
            container.innerHTML = cities.slice(0, 12).map(city => renderDestinationCard(city)).join('');
        } else {
            // Show empty state - no fake data
            UI.showEmpty(container, 'No Destinations', 'Check back soon for new destinations', 'fa-map-marker-alt');
        }
    } catch (error) {
        console.error('Error loading destinations:', error);
        // On error, try to show admin destinations at least
        const adminDestinations = getAdminDestinations();
        if (adminDestinations.length > 0) {
            container.innerHTML = adminDestinations.slice(0, 12).map(city => renderDestinationCard(city)).join('');
        } else {
            // Show error state - no fake data
            UI.showEmpty(container, 'Unable to Load Destinations', 'Please try again later', 'fa-map-marker-alt');
        }
    }
}

/**
 * Render destination card
 */
function renderDestinationCard(city) {
    const imageUrl = getDestinationImage(city);
    
    return `
        <a href="hotels.html?search=${encodeURIComponent(city)}" class="destination-card">
            <img src="${imageUrl}" alt="${city}" onerror="this.src='https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600'">
            <div class="destination-card-overlay">
                <h3 class="destination-card-title">${city}</h3>
                <p class="destination-card-count">Explore hotels</p>
            </div>
        </a>
    `;
}

// No fallback destinations - database is the single source of truth
