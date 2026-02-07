/**
 * Booking Page JavaScript
 */

let bookingData = {
    hotelId: null,
    roomId: null,
    hotel: null,
    room: null,
    checkIn: null,
    checkOut: null,
    nights: 0,
    guests: 1
};

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (!requireAuth()) return;
    
    // Check if user has USER role (only users can book, not admins or hotel owners)
    if (!Auth.isUser()) {
        UI.toast('Only registered users can make bookings. Admins and Hotel Owners cannot book rooms.', 'error');
        setTimeout(() => window.location.href = 'hotels.html', 3000);
        return;
    }
    
    initBookingPage();
});

/**
 * Initialize booking page
 */
async function initBookingPage() {
    const params = UI.getUrlParams();
    
    if (!params.hotelId || !params.roomId) {
        UI.toast('Invalid booking parameters', 'error');
        setTimeout(() => window.location.href = 'hotels.html', 2000);
        return;
    }
    
    bookingData.hotelId = params.hotelId;
    bookingData.roomId = params.roomId;
    bookingData.checkIn = params.checkIn || UI.formatDateForInput(new Date());
    bookingData.checkOut = params.checkOut || UI.formatDateForInput(new Date(Date.now() + 86400000));
    bookingData.nights = UI.calculateNights(bookingData.checkIn, bookingData.checkOut);
    bookingData.guests = parseInt(params.guests) || 1;
    
    await loadBookingDetails();
}

/**
 * Load hotel and room details
 */
async function loadBookingDetails() {
    try {
        // Fetch from API - database is single source of truth
        const [hotelRes, roomsRes] = await Promise.all([
            API.hotels.getById(bookingData.hotelId).catch(() => null),
            API.hotels.getRooms(bookingData.hotelId).catch(() => null)
        ]);
        
        if (hotelRes?.success && hotelRes.data) {
            bookingData.hotel = hotelRes.data;
        }
        
        if (roomsRes?.success && roomsRes.data) {
            bookingData.room = roomsRes.data.find(r => r.id == bookingData.roomId);
        }
        
        // Show error if hotel or room not found - no fake data
        if (!bookingData.hotel || !bookingData.room) {
            showBookingError('Hotel or room not found. Please go back and select again.');
            return;
        }
        
        renderBookingPage();
    } catch (error) {
        console.error('Error loading booking details:', error);
        showBookingError('Unable to load booking details. Please check your connection and try again.');
    }
}

/**
 * Show booking error - no fake data, database is single source of truth
 */
function showBookingError(message) {
    const container = document.getElementById('bookingContent');
    container.innerHTML = `
        <div class="booking-error">
            <div class="error-icon">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <h2>Unable to Complete Booking</h2>
            <p>${message}</p>
            <div class="error-actions">
                <a href="hotels.html" class="btn btn-primary">
                    <i class="fas fa-search"></i>
                    Browse Hotels
                </a>
                <button class="btn btn-secondary" onclick="location.reload()">
                    <i class="fas fa-redo"></i>
                    Try Again
                </button>
            </div>
        </div>
    `;
}

/**
 * Render booking page
 */
function renderBookingPage() {
    const container = document.getElementById('bookingContent');
    const user = Auth.getUser();
    const hotelImage = UI.getHotelImage(bookingData.hotel);
    const roomPrice = bookingData.room.pricePerNight;
    const subtotal = roomPrice * bookingData.nights;
    const taxes = subtotal * 0.12;
    const total = subtotal + taxes;
    
    container.innerHTML = `
        <!-- Booking Form -->
        <div class="booking-form-card">
            <h2 class="booking-form-title">Guest Details</h2>
            
            <form id="bookingForm">
                <div class="booking-form-section">
                    <h4><i class="fas fa-user"></i> Primary Guest</h4>
                    <div class="form-row-2">
                        <div class="form-group">
                            <label class="form-label required" for="firstName">First Name</label>
                            <input type="text" id="firstName" class="form-input" value="${user?.firstName || ''}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label required" for="lastName">Last Name</label>
                            <input type="text" id="lastName" class="form-input" value="${user?.lastName || ''}" required>
                        </div>
                    </div>
                    <div class="form-row-2">
                        <div class="form-group">
                            <label class="form-label required" for="email">Email</label>
                            <input type="email" id="email" class="form-input" value="${user?.email || ''}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label required" for="phone">Phone</label>
                            <input type="tel" id="phone" class="form-input" value="${user?.phone || ''}" required>
                        </div>
                    </div>
                </div>
                
                <div class="booking-form-section">
                    <h4><i class="fas fa-calendar-alt"></i> Stay Details</h4>
                    <div class="form-row-2">
                        <div class="form-group">
                            <label class="form-label required" for="checkIn">Check-in Date</label>
                            <input type="date" id="checkIn" class="form-input" value="${bookingData.checkIn}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label required" for="checkOut">Check-out Date</label>
                            <input type="date" id="checkOut" class="form-input" value="${bookingData.checkOut}" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label required" for="guests">Number of Guests</label>
                        <select id="guests" class="form-select" required>
                            ${Array.from({length: bookingData.room.capacity || bookingData.room.maxOccupancy || 2}, (_, i) => 
                                `<option value="${i+1}" ${bookingData.guests === i+1 ? 'selected' : ''}>${i+1} Guest${i > 0 ? 's' : ''}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="booking-form-section">
                    <h4><i class="fas fa-comment-alt"></i> Special Requests</h4>
                    <div class="form-group">
                        <label class="form-label" for="specialRequests">Any special requests? (Optional)</label>
                        <textarea id="specialRequests" class="form-input special-requests-textarea" 
                            placeholder="E.g., Early check-in, high floor, extra pillows..."></textarea>
                    </div>
                </div>
                
                <div class="booking-form-section">
                    <h4><i class="fas fa-info-circle"></i> Policies</h4>
                    <div class="policies-list">
                        <div class="policy-item">
                            <i class="fas fa-clock"></i>
                            <span>Check-in: 3:00 PM | Check-out: 11:00 AM</span>
                        </div>
                        <div class="policy-item">
                            <i class="fas fa-undo"></i>
                            <span>Free cancellation up to 24 hours before check-in</span>
                        </div>
                        <div class="policy-item">
                            <i class="fas fa-credit-card"></i>
                            <span>Payment will be processed at check-in</span>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="agreeTerms" required>
                        <span class="checkmark"></span>
                        I agree to the <a href="#" target="_blank">Terms & Conditions</a> and <a href="#" target="_blank">Cancellation Policy</a>
                    </label>
                </div>
            </form>
        </div>
        
        <!-- Booking Summary -->
        <div class="booking-summary-card">
            <div class="summary-header">
                <h3>Booking Summary</h3>
            </div>
            
            <div class="summary-hotel">
                <div class="summary-hotel-image">
                    <img src="${hotelImage}" alt="${bookingData.hotel.name}">
                </div>
                <div class="summary-hotel-info">
                    <h4>${bookingData.hotel.name}</h4>
                    <p><i class="fas fa-map-marker-alt"></i> ${bookingData.hotel.city}, ${bookingData.hotel.country}</p>
                    <span class="summary-room">${bookingData.room.name}</span>
                </div>
            </div>
            
            <div class="summary-dates">
                <div class="summary-date">
                    <span class="summary-date-label">Check-in</span>
                    <span class="summary-date-value" id="summaryCheckIn">${UI.formatDate(bookingData.checkIn)}</span>
                </div>
                <div class="summary-date">
                    <span class="summary-date-label">Check-out</span>
                    <span class="summary-date-value" id="summaryCheckOut">${UI.formatDate(bookingData.checkOut)}</span>
                </div>
            </div>
            
            <!-- Booking Confidence Panel -->
            <div id="booking-confidence-panel"></div>
            
            <div class="summary-pricing">
                <div class="pricing-row">
                    <span>${UI.formatCurrency(roomPrice)} x <span id="summaryNights">${bookingData.nights}</span> night(s)</span>
                    <span id="summarySubtotal">${UI.formatCurrency(subtotal)}</span>
                </div>
                <div class="pricing-row">
                    <span>Taxes & fees (12%)</span>
                    <span id="summaryTaxes">${UI.formatCurrency(taxes)}</span>
                </div>
                <div class="pricing-row total">
                    <span>Total</span>
                    <span id="summaryTotal">${UI.formatCurrency(total)}</span>
                </div>
            </div>
            
            <div class="summary-actions">
                <button type="button" class="btn btn-primary btn-block" id="confirmBookingBtn">
                    <span class="btn-text">Confirm Booking</span>
                    <span class="btn-loader" style="display: none;">
                        <i class="fas fa-spinner fa-spin"></i>
                    </span>
                </button>
                
                <div class="summary-note">
                    <i class="fas fa-shield-alt"></i>
                    <span>Your payment is secure and encrypted</span>
                </div>
            </div>
        </div>
    `;
    
    initBookingForm();
}

/**
 * Initialize booking form handlers
 */
function initBookingForm() {
    const checkInInput = document.getElementById('checkIn');
    const checkOutInput = document.getElementById('checkOut');
    
    // Set min dates
    const today = new Date();
    checkInInput.min = UI.formatDateForInput(today);
    
    // Update summary when dates change
    const updateSummary = () => {
        const checkIn = new Date(checkInInput.value);
        const checkOut = new Date(checkOutInput.value);
        
        if (checkOut <= checkIn) {
            const newCheckOut = new Date(checkIn);
            newCheckOut.setDate(newCheckOut.getDate() + 1);
            checkOutInput.value = UI.formatDateForInput(newCheckOut);
        }
        
        bookingData.checkIn = checkInInput.value;
        bookingData.checkOut = checkOutInput.value;
        bookingData.nights = UI.calculateNights(bookingData.checkIn, bookingData.checkOut);
        
        const roomPrice = bookingData.room.pricePerNight;
        const subtotal = roomPrice * bookingData.nights;
        const taxes = subtotal * 0.12;
        const total = subtotal + taxes;
        
        document.getElementById('summaryCheckIn').textContent = UI.formatDate(bookingData.checkIn);
        document.getElementById('summaryCheckOut').textContent = UI.formatDate(bookingData.checkOut);
        document.getElementById('summaryNights').textContent = bookingData.nights;
        document.getElementById('summarySubtotal').textContent = UI.formatCurrency(subtotal);
        document.getElementById('summaryTaxes').textContent = UI.formatCurrency(taxes);
        document.getElementById('summaryTotal').textContent = UI.formatCurrency(total);
    };
    
    checkInInput.addEventListener('change', () => {
        const minCheckout = new Date(checkInInput.value);
        minCheckout.setDate(minCheckout.getDate() + 1);
        checkOutInput.min = UI.formatDateForInput(minCheckout);
        updateSummary();
        
        // Update booking confidence when dates change
        if (typeof onDatesChanged === 'function') {
            onDatesChanged(bookingData.roomId, checkInInput.value, checkOutInput.value);
        }
    });
    
    checkOutInput.addEventListener('change', () => {
        updateSummary();
        
        // Update booking confidence when dates change
        if (typeof onDatesChanged === 'function') {
            onDatesChanged(bookingData.roomId, checkInInput.value, checkOutInput.value);
        }
    });
    
    // Initialize booking confidence panel
    if (typeof initializeBookingConfidence === 'function') {
        initializeBookingConfidence(bookingData.roomId, bookingData.checkIn, bookingData.checkOut);
    }
    
    // Confirm booking button
    document.getElementById('confirmBookingBtn').addEventListener('click', submitBooking);
}

/**
 * Submit booking
 */
async function submitBooking() {
    const form = document.getElementById('bookingForm');
    const btn = document.getElementById('confirmBookingBtn');
    
    // Validate form
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Show loading with premium button state
    UI.setButtonLoading(btn, true);
    
    const bookingPayload = {
        roomId: parseInt(bookingData.roomId),
        checkInDate: document.getElementById('checkIn').value,
        checkOutDate: document.getElementById('checkOut').value,
        numGuests: parseInt(document.getElementById('guests').value),
        specialRequests: document.getElementById('specialRequests').value || null
    };
    
    try {
        const response = await API.bookings.create(bookingPayload);
        
        if (response.success && response.data) {
            showBookingSuccess(response.data);
        } else {
            throw new Error(response.message || 'Booking failed');
        }
    } catch (error) {
        console.error('Booking error:', error);
        UI.toast(error.message || 'Failed to create booking. Please try again.', 'error');
        
        // Reset button
        UI.setButtonLoading(btn, false);
    }
}

/**
 * Show booking success with premium celebration animation
 */
function showBookingSuccess(booking) {
    const container = document.getElementById('bookingContent');
    
    container.innerHTML = `
        <div class="booking-success">
            <div class="success-icon">
                <i class="fas fa-check"></i>
            </div>
            <h2>Booking Confirmed!</h2>
            <p>Thank you for choosing LuxeStay. Your reservation at <strong>${booking.hotelName || bookingData.hotel.name}</strong> has been confirmed.</p>
            
            <div class="booking-reference">
                ${booking.bookingReference}
            </div>
            <p style="color: var(--color-gray-500); font-size: var(--text-sm); margin-top: var(--space-2);">
                Save this reference number for your records
            </p>
            
            <div style="text-align: left; max-width: 400px; margin: var(--space-8) auto; background: var(--color-gray-50); padding: var(--space-5); border-radius: var(--radius-xl);">
                <div class="pricing-row" style="margin-bottom: var(--space-3);">
                    <span><i class="fas fa-hotel" style="width: 20px; color: var(--color-gold);"></i> Hotel</span>
                    <span>${booking.hotelName || bookingData.hotel.name}</span>
                </div>
                <div class="pricing-row" style="margin-bottom: var(--space-3);">
                    <span><i class="fas fa-bed" style="width: 20px; color: var(--color-gold);"></i> Room</span>
                    <span>${booking.roomName || bookingData.room.name}</span>
                </div>
                <div class="pricing-row" style="margin-bottom: var(--space-3);">
                    <span><i class="fas fa-calendar-check" style="width: 20px; color: var(--color-gold);"></i> Check-in</span>
                    <span>${UI.formatDate(booking.checkInDate)}</span>
                </div>
                <div class="pricing-row" style="margin-bottom: var(--space-3);">
                    <span><i class="fas fa-calendar-times" style="width: 20px; color: var(--color-gold);"></i> Check-out</span>
                    <span>${UI.formatDate(booking.checkOutDate)}</span>
                </div>
                <div class="pricing-row total" style="margin-top: var(--space-4); padding-top: var(--space-4); border-top: 2px solid var(--color-gold-light);">
                    <span><strong>Total Paid</strong></span>
                    <span style="font-size: var(--text-xl); color: var(--color-gold-dark);"><strong>${UI.formatCurrency(booking.totalAmount)}</strong></span>
                </div>
            </div>
            
            <p style="color: var(--color-gray-500); margin-bottom: var(--space-6);">
                <i class="fas fa-envelope"></i> A confirmation email has been sent to your email address
            </p>
            
            <div class="success-actions">
                <button class="btn btn-gold" id="planTripBtn" data-booking-id="${booking.id}">
                    <i class="fas fa-route"></i>
                    Plan My Trip
                </button>
                <a href="my-bookings.html" class="btn btn-primary">
                    <i class="fas fa-list"></i>
                    View My Bookings
                </a>
                <a href="hotels.html" class="btn btn-secondary">
                    <i class="fas fa-search"></i>
                    Browse More Hotels
                </a>
            </div>
            
            <!-- Trip Itinerary Section -->
            <div id="itinerary-section" style="margin-top: var(--space-8);"></div>
        </div>
    `;
    
    // Add Plan Trip button handler
    setTimeout(() => {
        const planTripBtn = document.getElementById('planTripBtn');
        if (planTripBtn) {
            planTripBtn.addEventListener('click', () => {
                const bookingId = planTripBtn.dataset.bookingId;
                document.getElementById('itinerary-section').style.display = 'block';
                itineraryGenerator.initialize(parseInt(bookingId));
                planTripBtn.style.display = 'none';
            });
        }
    }, 100);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
