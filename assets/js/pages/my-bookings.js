/**
 * My Bookings Page JavaScript
 */

let allBookings = [];
let currentTab = 'upcoming';
let bookingToCancel = null;
let countdownIntervals = [];
let reviewEligibility = {}; // Track which bookings can be reviewed
let existingReviews = {}; // Track existing reviews with their status { bookingId: { id, status } }

/**
 * Parse date string to local timezone midnight
 * Fixes timezone issues when parsing date-only strings like "2026-02-06"
 */
function parseLocalDate(dateStr) {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day); // Creates date at local midnight
}

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    
    initTabs();
    initModal();
    initReviewModal();
    loadBookings();
    
    // Initialize Memory Lane compact view
    if (window.MemoryLane) {
        window.MemoryLane.initCompactView('memoryLaneSidebar', 3);
    }
});

/**
 * Start countdown timers for all booking cards
 */
function startCountdownTimers() {
    // Clear any existing intervals
    countdownIntervals.forEach(interval => clearInterval(interval));
    countdownIntervals = [];
    
    const timerElements = document.querySelectorAll('.cancellation-timer');
    
    timerElements.forEach(timerEl => {
        const deadline = new Date(timerEl.dataset.deadline);
        
        const updateTimer = () => {
            const now = new Date();
            const diff = deadline - now;
            
            if (diff <= 0) {
                // Timer expired - reload to update UI
                timerEl.innerHTML = `
                    <div class="cancellation-expired">
                        <i class="fas fa-info-circle"></i>
                        <span>Free cancellation period has ended</span>
                    </div>
                `;
                // Find and hide the cancel button
                const bookingCard = timerEl.closest('.booking-card');
                const cancelBtn = bookingCard?.querySelector('.cancel-booking-btn');
                if (cancelBtn) cancelBtn.style.display = 'none';
                return false;
            }
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            const hoursEl = timerEl.querySelector('.hours');
            const minutesEl = timerEl.querySelector('.minutes');
            const secondsEl = timerEl.querySelector('.seconds');
            
            if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
            if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
            if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
            
            // Add urgency class if less than 1 hour
            if (diff < 60 * 60 * 1000) {
                timerEl.classList.add('timer-urgent');
            }
            
            return true;
        };
        
        // Initial update
        if (updateTimer()) {
            // Start interval
            const interval = setInterval(() => {
                if (!updateTimer()) {
                    clearInterval(interval);
                }
            }, 1000);
            countdownIntervals.push(interval);
        }
    });
}

/**
 * Initialize tabs
 */
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            filterBookings();
        });
    });
}

/**
 * Initialize cancel modal
 */
function initModal() {
    const backdrop = document.getElementById('cancelModalBackdrop');
    const modal = document.getElementById('cancelModal');
    const closeBtn = document.getElementById('closeCancelModal');
    const noBtn = document.getElementById('cancelModalNo');
    const yesBtn = document.getElementById('cancelModalYes');
    
    const closeModal = () => {
        backdrop.classList.remove('active');
        modal.classList.remove('active');
        bookingToCancel = null;
    };
    
    backdrop.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    noBtn.addEventListener('click', closeModal);
    
    yesBtn.addEventListener('click', async () => {
        if (!bookingToCancel) return;
        
        // Use premium button loading
        UI.setButtonLoading(yesBtn, true);
        
        try {
            const response = await API.bookings.cancel(bookingToCancel);
            
            if (response.success) {
                UI.toast('Booking cancelled successfully', 'success');
                closeModal();
                loadBookings();
            } else {
                throw new Error(response.message || 'Failed to cancel booking');
            }
        } catch (error) {
            console.error('Cancellation error:', error);
            UI.toast(error.message || 'Failed to cancel booking', 'error');
            closeModal();
        }
        
        UI.setButtonLoading(yesBtn, false);
    });
}

/**
 * Load Stay Countdown widgets for booking cards
 * Enhances each booking card with a visual countdown
 */
async function loadStayCountdowns(bookings) {
    for (const booking of bookings) {
        try {
            const countdown = await StayCountdown.getBookingCountdown(booking.id);
            if (!countdown) continue;
            
            // Find the booking card
            const bookingCard = document.querySelector(`.booking-card[data-booking-id="${booking.id}"]`);
            if (!bookingCard) {
                // Try by booking reference if data attribute doesn't exist
                const cards = document.querySelectorAll('.booking-card');
                for (const card of cards) {
                    const refEl = card.querySelector('.booking-ref-value');
                    if (refEl && refEl.textContent === booking.bookingReference) {
                        addCountdownToCard(card, countdown);
                        break;
                    }
                }
            } else {
                addCountdownToCard(bookingCard, countdown);
            }
        } catch (error) {
            console.warn('Could not load countdown for booking:', booking.id);
        }
    }
}

/**
 * Add countdown widget to a booking card
 */
function addCountdownToCard(card, countdown) {
    // Check if countdown already exists
    if (card.querySelector('.stay-countdown-inline')) return;
    
    // Create inline countdown element
    const countdownEl = document.createElement('div');
    countdownEl.className = 'stay-countdown-inline';
    
    const daysUntil = countdown.daysUntilCheckIn;
    const phase = countdown.phase;
    
    // Create countdown display based on phase
    let badgeClass = 'countdown-normal';
    let displayText = '';
    
    if (daysUntil === 0) {
        badgeClass = 'countdown-today';
        displayText = '🎉 Today!';
    } else if (daysUntil === 1) {
        badgeClass = 'countdown-tomorrow';
        displayText = '⭐ Tomorrow!';
    } else if (daysUntil <= 7) {
        badgeClass = 'countdown-soon';
        displayText = `${daysUntil} days`;
    } else {
        displayText = `${daysUntil} days`;
    }
    
    countdownEl.innerHTML = `
        <div class="countdown-inline-badge ${badgeClass}">
            <span class="countdown-inline-number">${displayText}</span>
            <span class="countdown-inline-label">until check-in</span>
        </div>
        <p class="countdown-inline-message">${countdown.excitementMessage || ''}</p>
    `;
    
    // Insert after booking header
    const bookingBody = card.querySelector('.booking-card-body');
    if (bookingBody) {
        bookingBody.insertBefore(countdownEl, bookingBody.firstChild);
    }
}

/**
 * Load bookings
 */
async function loadBookings() {
    const container = document.getElementById('bookingsList');
    
    // Show skeleton loading for premium experience
    UI.showSkeletonLoading(container, 3, 'row');
    
    try {
        const response = await API.bookings.getMyBookings();
        
        if (response.success && response.data) {
            allBookings = response.data;
        } else {
            console.error('Invalid response format', response);
            UI.showErrorWithRetry(container, 'Failed to load your bookings.', loadBookings);
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
        UI.showErrorWithRetry(container, 'Connection error. Please check your network.', loadBookings);
        return; // Don't proceed to update counts if loading failed
    }
    
    updateCounts();
    filterBookings();
}

/**
 * Update tab counts
 */
function updateCounts() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcoming = allBookings.filter(b => 
        parseLocalDate(b.checkInDate) >= today && 
        (b.status === 'PENDING' || b.status === 'CONFIRMED')
    );
    
    const past = allBookings.filter(b => 
        parseLocalDate(b.checkOutDate) < today && 
        b.status !== 'CANCELLED'
    );
    
    const cancelled = allBookings.filter(b => b.status === 'CANCELLED');
    
    document.getElementById('upcomingCount').textContent = upcoming.length;
    document.getElementById('pastCount').textContent = past.length;
    document.getElementById('cancelledCount').textContent = cancelled.length;
}

/**
 * Filter and display bookings based on current tab
 */
async function filterBookings() {
    const container = document.getElementById('bookingsList');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let filtered = [];
    
    switch (currentTab) {
        case 'upcoming':
            filtered = allBookings.filter(b => 
                parseLocalDate(b.checkInDate) >= today && 
                (b.status === 'PENDING' || b.status === 'CONFIRMED')
            );
            break;
        case 'past':
            filtered = allBookings.filter(b => 
                parseLocalDate(b.checkOutDate) < today && 
                b.status !== 'CANCELLED'
            );
            // Check review eligibility for past bookings
            if (typeof Reviews !== 'undefined') {
                await checkReviewEligibility(filtered);
            }
            break;
        case 'cancelled':
            filtered = allBookings.filter(b => b.status === 'CANCELLED');
            break;
    }
    
    if (filtered.length === 0) {
        const messages = {
            upcoming: { title: 'No Upcoming Bookings', text: 'Browse our hotels and plan your next trip!', icon: 'fa-calendar-alt' },
            past: { title: 'No Past Bookings', text: 'Your completed stays will appear here.', icon: 'fa-history' },
            cancelled: { title: 'No Cancelled Bookings', text: 'Great! You haven\'t cancelled any bookings.', icon: 'fa-check-circle' }
        };
        
        const msg = messages[currentTab];
        UI.showEmpty(container, msg.title, msg.text, msg.icon);
        return;
    }
    
    // Pass review eligibility and existing review info to renderBookingCard for past tab
    container.innerHTML = filtered.map(booking => {
        const canReview = currentTab === 'past' && reviewEligibility[booking.id] === true;
        const existingReview = currentTab === 'past' ? existingReviews[booking.id] : null;
        return UI.renderBookingCard(booking, canReview, existingReview);
    }).join('');
    
    // Start countdown timers
    startCountdownTimers();
    
    // Load Stay Countdown widgets for upcoming bookings
    if (currentTab === 'upcoming' && typeof StayCountdown !== 'undefined') {
        loadStayCountdowns(filtered);
    }
    
    // Add cancel button handlers
    document.querySelectorAll('.cancel-booking-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const bookingId = parseInt(btn.dataset.id);
            const booking = allBookings.find(b => b.id === bookingId);
            
            if (booking) {
                bookingToCancel = bookingId;
                document.getElementById('cancelBookingRef').textContent = booking.bookingReference;
                document.getElementById('cancelModalBackdrop').classList.add('active');
                document.getElementById('cancelModal').classList.add('active');
            }
        });
    });

    // Add itinerary button handlers
    document.querySelectorAll('.view-itinerary-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const bookingId = parseInt(btn.dataset.id);
            showItinerarySection(bookingId);
        });
    });
    
    // Add review button handlers
    addReviewButtons();
}

/**
 * Show itinerary section for a booking
 */
function showItinerarySection(bookingId) {
    const itinerarySection = document.getElementById('itinerary-section');
    const bookingsSection = document.querySelector('.bookings-tabs');
    const bookingsList = document.getElementById('bookingsList');
    
    if (!itinerarySection) {
        console.error('Itinerary section not found');
        return;
    }

    // Add back button and show itinerary section
    itinerarySection.innerHTML = `
        <div class="itinerary-nav">
            <button class="btn btn-ghost back-to-bookings" id="backToBookings">
                <i class="fas fa-arrow-left"></i> Back to Bookings
            </button>
        </div>
        <div id="itinerary-content-wrapper"></div>
    `;

    // Hide bookings, show itinerary
    if (bookingsSection) bookingsSection.style.display = 'none';
    if (bookingsList) bookingsList.style.display = 'none';
    itinerarySection.style.display = 'block';

    // Add back button handler
    document.getElementById('backToBookings').addEventListener('click', () => {
        hideItinerarySection();
    });

    // Create a wrapper for the itinerary generator to use
    const wrapper = document.getElementById('itinerary-content-wrapper');
    wrapper.innerHTML = '<div id="itinerary-section-inner"></div>';
    
    // Update the itinerary section ID for the generator
    const innerSection = document.getElementById('itinerary-section-inner');
    innerSection.id = 'itinerary-section';
    
    // Initialize and show the itinerary generator
    if (typeof itineraryGenerator !== 'undefined') {
        itineraryGenerator.initialize(bookingId);
    } else {
        wrapper.innerHTML = `
            <div class="itinerary-error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Itinerary generator not available. Please refresh the page.</p>
            </div>
        `;
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Hide itinerary section and show bookings
 */
function hideItinerarySection() {
    const itinerarySection = document.getElementById('itinerary-section');
    const bookingsSection = document.querySelector('.bookings-tabs');
    const bookingsList = document.getElementById('bookingsList');

    if (itinerarySection) itinerarySection.style.display = 'none';
    if (bookingsSection) bookingsSection.style.display = 'flex';
    if (bookingsList) bookingsList.style.display = 'block';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Initialize review modal
 */
function initReviewModal() {
    const backdrop = document.getElementById('reviewModalBackdrop');
    const modal = document.getElementById('reviewModal');
    const closeBtn = document.getElementById('closeReviewModal');
    
    if (!backdrop || !modal || !closeBtn) return;
    
    const closeModal = () => {
        backdrop.classList.remove('active');
        modal.classList.remove('active');
    };
    
    backdrop.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
}

/**
 * Open review modal for a booking
 */
async function openReviewModal(bookingId, hotelName, reviewId = null) {
    const backdrop = document.getElementById('reviewModalBackdrop');
    const modal = document.getElementById('reviewModal');
    const body = document.getElementById('reviewModalBody');
    const title = modal?.querySelector('.modal-title');
    
    if (!backdrop || !modal || !body) return;
    
    const isEditMode = reviewId !== null;
    
    // Update modal title with hotel name
    if (title) {
        title.innerHTML = `
            <i class="fas fa-star text-gold"></i>
            ${isEditMode ? 'Edit Your Review' : 'Write a Review'}
            <span class="modal-subtitle">for ${escapeHtml(hotelName)}</span>
        `;
    }
    
    // Render review form using Reviews module
    if (typeof Reviews !== 'undefined') {
        body.innerHTML = Reviews.renderReviewForm(bookingId, hotelName, reviewId);
        
        // If edit mode, pre-populate the form with existing review data
        if (isEditMode && existingReviews[bookingId]) {
            const existingReview = existingReviews[bookingId];
            
            // Set rating using Reviews.setRating for proper visual state
            if (existingReview.rating) {
                Reviews.setRating(bookingId, existingReview.rating);
            }
            
            // Set title
            const titleInput = body.querySelector('input[name="title"]');
            if (titleInput && existingReview.title) {
                titleInput.value = existingReview.title;
            }
            
            // Set comment
            const commentInput = body.querySelector('textarea[name="comment"]');
            if (commentInput && existingReview.comment) {
                commentInput.value = existingReview.comment;
                // Update character counter
                Reviews.updateCharCount(commentInput, bookingId);
            }
        }
    } else {
        body.innerHTML = '<p class="text-muted">Review form unavailable.</p>';
    }
    
    backdrop.classList.add('active');
    modal.classList.add('active');
}

/**
 * Helper to escape HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Check review eligibility for past bookings and fetch existing reviews
 */
async function checkReviewEligibility(bookings) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const pastBookings = bookings.filter(b => {
        const checkOutDate = parseLocalDate(b.checkOutDate);
        // Allow reviews for CHECKED_OUT, CHECKED_IN (past checkout), or past CONFIRMED bookings
        const isPast = checkOutDate < today;
        const hasValidStatus = b.status === 'CHECKED_OUT' || b.status === 'CONFIRMED' || b.status === 'CHECKED_IN';
        return isPast && hasValidStatus;
    });
    
    // Check eligibility and existing reviews for each past booking
    for (const booking of pastBookings) {
        try {
            const canReview = await Reviews.canReviewBooking(booking.id);
            reviewEligibility[booking.id] = canReview;
            
            // If can't review, check if there's an existing review
            if (!canReview) {
                try {
                    const reviewResponse = await API.reviews.getReviewForBooking(booking.id);
                    if (reviewResponse.success && reviewResponse.data) {
                        existingReviews[booking.id] = {
                            id: reviewResponse.data.id,
                            status: reviewResponse.data.status,
                            rating: reviewResponse.data.rating,
                            title: reviewResponse.data.title,
                            comment: reviewResponse.data.comment
                        };
                    }
                } catch (e) {
                    // No existing review or error - ignore
                }
            }
        } catch (error) {
            console.error(`Error checking review eligibility for booking ${booking.id}:`, error);
            reviewEligibility[booking.id] = false;
        }
    }
}

/**
 * Add review button to booking card
 */
function addReviewButtons() {
    document.querySelectorAll('.write-review-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const bookingId = parseInt(btn.dataset.id);
            const hotelName = btn.dataset.hotel;
            openReviewModal(bookingId, hotelName);
        });
    });
    
    document.querySelectorAll('.edit-review-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const bookingId = parseInt(btn.dataset.id);
            const hotelName = btn.dataset.hotel;
            const reviewId = parseInt(btn.dataset.reviewId);
            openReviewModal(bookingId, hotelName, reviewId);
        });
    });
}
