/**
 * Hotel Detail Page JavaScript
 */

let currentHotel = null;
let currentRooms = [];

document.addEventListener('DOMContentLoaded', () => {
    const params = UI.getUrlParams();
    const hotelId = params.id;
    
    if (!hotelId) {
        window.location.href = 'hotels.html';
        return;
    }
    
    loadHotelDetails(hotelId);
    initDatePicker();
});

/**
 * Load hotel details
 */
async function loadHotelDetails(hotelId) {
    const contentContainer = document.getElementById('hotelContent');
    const heroElement = document.getElementById('hotelHero');
    
    try {
        const response = await API.hotels.getById(hotelId);
        
        if (response.success && response.data) {
            currentHotel = response.data;
            renderHotelDetails(currentHotel);
            document.title = `${currentHotel.name} | LuxeStay`;
            
            // Set hero background
            const heroImage = UI.getHotelImage(currentHotel);
            heroElement.style.backgroundImage = `url(${heroImage})`;
            
            // Update breadcrumb
            document.getElementById('breadcrumbHotelName').textContent = currentHotel.name;
            
            // Load rooms
            loadRooms(hotelId);
            
            // Load reviews
            loadReviews(hotelId);
        } else {
            // Hotel not found - show error, no fake data
            showHotelNotFound();
        }
    } catch (error) {
        console.error('Error loading hotel:', error);
        // API error - show error state, no fake data
        showHotelError();
    }
}

/**
 * Show hotel not found error - no fake data
 */
function showHotelNotFound() {
    const contentContainer = document.getElementById('hotelContent');
    document.title = 'Hotel Not Found | LuxeStay';
    document.getElementById('breadcrumbHotelName').textContent = 'Not Found';
    
    contentContainer.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 60px 20px;">
            <i class="fas fa-hotel" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 20px;"></i>
            <h2>Hotel Not Found</h2>
            <p style="color: var(--text-muted); margin-bottom: 20px;">This hotel does not exist or may have been removed.</p>
            <a href="hotels.html" class="btn btn-primary">Browse All Hotels</a>
        </div>
    `;
    
    // Hide rooms section
    document.getElementById('roomsSection').style.display = 'none';
}

/**
 * Show hotel loading error - no fake data
 */
function showHotelError() {
    const contentContainer = document.getElementById('hotelContent');
    document.title = 'Error | LuxeStay';
    document.getElementById('breadcrumbHotelName').textContent = 'Error';
    
    contentContainer.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 60px 20px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: var(--warning); margin-bottom: 20px;"></i>
            <h2>Unable to Load Hotel</h2>
            <p style="color: var(--text-muted); margin-bottom: 20px;">Please check your connection and try again.</p>
            <button onclick="location.reload()" class="btn btn-primary">Try Again</button>
        </div>
    `;
    
    // Hide rooms section
    document.getElementById('roomsSection').style.display = 'none';
}

/**
 * Render hotel details
 */
function renderHotelDetails(hotel) {
    const container = document.getElementById('hotelContent');
    
    const amenities = hotel.amenities || [];
    const images = hotel.images || [];
    
    // Build gallery HTML if images exist
    const galleryHtml = images.length > 0 ? `
        <div class="hotel-gallery-section">
            <div class="hotel-gallery">
                ${images.slice(0, 5).map((img, i) => `
                    <div class="hotel-gallery-item ${i === 0 ? 'hotel-gallery-main' : ''}" 
                         data-index="${i}"
                         role="button"
                         tabindex="0"
                         aria-label="View image ${i + 1}">
                        <img src="${img.imageUrl || img}" alt="${img.caption || hotel.name + ' - Image ' + (i + 1)}" loading="lazy">
                        ${i === 4 && images.length > 5 ? `
                            <div class="hotel-gallery-more">+${images.length - 5} more</div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-outline btn-gallery-all" id="viewAllPhotos">
                <i class="fas fa-images"></i> View All ${images.length} Photos
            </button>
        </div>
    ` : '';
    
    container.innerHTML = `
        ${galleryHtml}
        
        <div class="hotel-header">
            <div class="hotel-title-section">
                <div class="hotel-title-row">
                    <h1>${hotel.name}</h1>
                    <div class="hotel-actions">
                        <button class="wishlist-btn wishlist-btn-lg" 
                                data-hotel-id="${hotel.id}"
                                aria-label="Add to favorites"
                                type="button">
                            <i class="far fa-heart"></i>
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
                <div class="hotel-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${hotel.address ? hotel.address + ', ' : ''}${hotel.city}, ${hotel.country}
                </div>
                <div class="hotel-rating">
                    ${UI.generateStars(hotel.starRating)}
                    <span class="badge badge-gold" style="margin-left: var(--space-2);">${hotel.starRating} Star Hotel</span>
                </div>
            </div>
            <div class="hotel-rating-section">
                ${hotel.featured ? '<span class="badge badge-gold">Featured</span>' : ''}
                <div class="hotel-price-range">
                    ${UI.formatCurrency(hotel.minPrice || 200)}+
                    <span>/ night</span>
                </div>
            </div>
        </div>
        
        <div class="hotel-body">
            <div class="hotel-main">
                <div class="content-section hotel-description">
                    <h3>About This Hotel</h3>
                    <p>${hotel.description || 'Experience luxury and comfort at ' + hotel.name + '. Our hotel offers world-class amenities and exceptional service to ensure an unforgettable stay.'}</p>
                </div>
                
                ${amenities.length > 0 ? `
                <div class="content-section">
                    <h3>Amenities</h3>
                    <div class="amenities-grid">
                        ${amenities.map(amenity => `
                            <div class="amenity-item">
                                <i class="fas ${UI.getAmenityIcon(amenity)}"></i>
                                <span>${amenity}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="hotel-sidebar">
                <div class="quick-book-card">
                    <h4 class="quick-book-title">Quick Book</h4>
                    <form class="quick-book-form" id="quickBookForm">
                        <div class="form-group">
                            <label class="form-label" for="quickCheckIn">Check In</label>
                            <input type="date" id="quickCheckIn" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="quickCheckOut">Check Out</label>
                            <input type="date" id="quickCheckOut" class="form-input" required>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block quick-book-btn">
                            Check Availability
                        </button>
                    </form>
                    <p class="quick-book-note">
                        <i class="fas fa-info-circle"></i>
                        Free cancellation available
                    </p>
                    
                    <div class="hotel-info-list">
                        <div class="hotel-info-item">
                            <i class="fas fa-clock"></i>
                            <span>Check-in: 3:00 PM<br>Check-out: 11:00 AM</span>
                        </div>
                        <div class="hotel-info-item">
                            <i class="fas fa-phone"></i>
                            <span>+1 (555) 123-4567</span>
                        </div>
                        <div class="hotel-info-item">
                            <i class="fas fa-envelope"></i>
                            <span>reservations@luxestay.com</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Initialize quick book form
    initQuickBookForm();
    
    // Initialize photo gallery
    initPhotoGallery(images);
    
    // Initialize wishlist button
    initWishlistButton(hotel.id);
    
    // Show rooms section
    document.getElementById('roomsSection').style.display = 'block';
}

/**
 * Initialize quick book form
 */
function initQuickBookForm() {
    const form = document.getElementById('quickBookForm');
    const checkInInput = document.getElementById('quickCheckIn');
    const checkOutInput = document.getElementById('quickCheckOut');
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    checkInInput.min = UI.formatDateForInput(today);
    checkInInput.value = UI.formatDateForInput(today);
    checkOutInput.min = UI.formatDateForInput(tomorrow);
    checkOutInput.value = UI.formatDateForInput(tomorrow);
    
    checkInInput.addEventListener('change', () => {
        const checkIn = new Date(checkInInput.value);
        const minCheckout = new Date(checkIn);
        minCheckout.setDate(minCheckout.getDate() + 1);
        checkOutInput.min = UI.formatDateForInput(minCheckout);
        if (new Date(checkOutInput.value) <= checkIn) {
            checkOutInput.value = UI.formatDateForInput(minCheckout);
        }
    });
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        // Sync with room date picker and scroll to rooms
        document.getElementById('roomCheckIn').value = checkInInput.value;
        document.getElementById('roomCheckOut').value = checkOutInput.value;
        loadAvailableRooms();
        document.getElementById('roomsSection').scrollIntoView({ behavior: 'smooth' });
    });
}

/**
 * Initialize date picker for rooms
 */
function initDatePicker() {
    const form = document.getElementById('datePickerForm');
    const checkInInput = document.getElementById('roomCheckIn');
    const checkOutInput = document.getElementById('roomCheckOut');
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    checkInInput.min = UI.formatDateForInput(today);
    checkInInput.value = UI.formatDateForInput(today);
    checkOutInput.min = UI.formatDateForInput(tomorrow);
    checkOutInput.value = UI.formatDateForInput(tomorrow);
    
    // Get dates from URL params
    const params = UI.getUrlParams();
    if (params.checkIn) checkInInput.value = params.checkIn;
    if (params.checkOut) checkOutInput.value = params.checkOut;
    
    checkInInput.addEventListener('change', () => {
        const checkIn = new Date(checkInInput.value);
        const minCheckout = new Date(checkIn);
        minCheckout.setDate(minCheckout.getDate() + 1);
        checkOutInput.min = UI.formatDateForInput(minCheckout);
        if (new Date(checkOutInput.value) <= checkIn) {
            checkOutInput.value = UI.formatDateForInput(minCheckout);
        }
    });
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        loadAvailableRooms();
    });
}

/**
 * Load rooms for hotel
 */
async function loadRooms(hotelId) {
    const container = document.getElementById('roomsList');
    
    try {
        const response = await API.hotels.getRooms(hotelId);
        
        if (response.success && response.data && response.data.length > 0) {
            currentRooms = response.data;
            renderRooms(response.data);
        } else {
            // Show empty state for hotels without rooms
            currentRooms = [];
            UI.showEmpty(container, 'No Rooms Available', 'This hotel has not added any rooms yet. Please check back later.', 'fa-bed');
        }
    } catch (error) {
        console.error('Error loading rooms:', error);
        // Show empty state on error
        currentRooms = [];
        UI.showEmpty(container, 'Unable to Load Rooms', 'Please try again later.', 'fa-bed');
    }
}

/**
 * Load available rooms for selected dates
 */
async function loadAvailableRooms() {
    const container = document.getElementById('roomsList');
    const checkIn = document.getElementById('roomCheckIn').value;
    const checkOut = document.getElementById('roomCheckOut').value;
    
    if (!checkIn || !checkOut) {
        UI.toast('Please select check-in and check-out dates', 'warning');
        return;
    }
    
    // Show skeleton loading for premium experience
    UI.showSkeletonLoading(container, 3, 'row');
    
    try {
        const response = await API.hotels.getAvailableRooms(currentHotel.id, checkIn, checkOut);
        
        if (response.success && response.data) {
            if (response.data.length > 0) {
                currentRooms = response.data;
                renderRooms(response.data, checkIn, checkOut);
            } else {
                UI.showEmpty(container, 'No Rooms Available', 'Try different dates for availability', 'fa-bed');
            }
        } else {
            renderRooms(currentRooms, checkIn, checkOut);
        }
    } catch (error) {
        console.error('Error checking availability:', error);
        renderRooms(currentRooms, checkIn, checkOut);
    }
}

// No fallback rooms - database is the single source of truth

/**
 * Render rooms
 */
function renderRooms(rooms, checkIn = '', checkOut = '') {
    const container = document.getElementById('roomsList');
    
    if (rooms.length === 0) {
        UI.showEmpty(container, 'No Rooms Available', 'Try different dates for availability', 'fa-bed');
        return;
    }
    
    container.innerHTML = rooms.map(room => UI.renderRoomCard(room, currentHotel.id, checkIn, checkOut)).join('');
}

/**
 * Load reviews for hotel
 */
async function loadReviews(hotelId) {
    const container = document.getElementById('reviewsContainer');
    if (!container) return;
    
    // Use Reviews module to load and render reviews
    if (typeof Reviews !== 'undefined') {
        await Reviews.loadHotelReviews(hotelId, container);
    } else {
        console.error('Reviews module not loaded');
        container.innerHTML = '<p class="text-muted">Unable to load reviews.</p>';
    }
}

/**
 * Initialize photo gallery with lightbox
 */
function initPhotoGallery(images) {
    if (!images || images.length === 0) return;
    
    // Normalize images to array of objects with url and alt
    const normalizedImages = images.map((img, i) => ({
        url: img.imageUrl || img,
        alt: img.caption || (currentHotel ? currentHotel.name + ' - Image ' + (i + 1) : 'Image ' + (i + 1))
    }));
    
    // Add click handlers to gallery items
    document.querySelectorAll('.hotel-gallery-item').forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.index);
            if (typeof Lightbox !== 'undefined') {
                Lightbox.show(normalizedImages, index);
            }
        });
        
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const index = parseInt(item.dataset.index);
                if (typeof Lightbox !== 'undefined') {
                    Lightbox.show(normalizedImages, index);
                }
            }
        });
    });
    
    // View all photos button
    const viewAllBtn = document.getElementById('viewAllPhotos');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            if (typeof Lightbox !== 'undefined') {
                Lightbox.show(normalizedImages, 0);
            }
        });
    }
}

/**
 * Initialize wishlist button for hotel
 */
function initWishlistButton(hotelId) {
    const button = document.querySelector(`.wishlist-btn[data-hotel-id="${hotelId}"]`);
    if (!button) return;
    
    // Update initial state from Wishlist module
    if (typeof Wishlist !== 'undefined' && Wishlist.isInitialized) {
        const isWishlisted = Wishlist.isWishlisted(hotelId);
        Wishlist.updateButton(button, isWishlisted);
    }
    
    // Add click handler
    button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (typeof Wishlist !== 'undefined') {
            await Wishlist.toggle(hotelId, button);
        } else {
            UI.showToast('Please log in to save favorites', 'warning');
        }
    });
}
