/**
 * UI Utilities
 * Common UI functions and components
 */

const UI = {
    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - Type: success, error, warning, info
     * @param {number} duration - Duration in ms (default 4000)
     */
    toast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toastContainer') || this.createToastContainer();
        
        const icons = {
            success: 'fa-check',
            error: 'fa-times',
            warning: 'fa-exclamation',
            info: 'fa-info'
        };
        
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${icons[type]}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${titles[type]}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(toast);
        
        // Close button handler
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.removeToast(toast);
        });
        
        // Auto remove
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);
    },
    
    removeToast(toast) {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    },
    
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    },
    
    /**
     * Format currency
     */
    formatCurrency(amount, currency = CONFIG.DEFAULT_CURRENCY_SYMBOL) {
        return `${currency}${parseFloat(amount).toFixed(2)}`;
    },
    
    /**
     * Format date
     */
    formatDate(dateString, options = {}) {
        const date = new Date(dateString);
        const defaultOptions = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        };
        return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
    },
    
    /**
     * Format date for input
     */
    formatDateForInput(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },
    
    /**
     * Generate star rating HTML
     */
    generateStars(rating) {
        let html = '<div class="stars">';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                html += '<i class="fas fa-star"></i>';
            } else if (i - 0.5 <= rating) {
                html += '<i class="fas fa-star-half-alt"></i>';
            } else {
                html += '<i class="far fa-star empty"></i>';
            }
        }
        html += '</div>';
        return html;
    },
    
    /**
     * Get hotel image URL with cache busting
     */
    getHotelImage(hotel) {
        let imageUrl;
        if (hotel.heroImageUrl) {
            imageUrl = hotel.heroImageUrl;
        } else if (hotel.images && hotel.images.length > 0) {
            const primaryImage = hotel.images.find(img => img.isPrimary);
            imageUrl = primaryImage ? primaryImage.imageUrl : hotel.images[0].imageUrl;
        } else {
            imageUrl = CONFIG.HOTEL_IMAGES[hotel.name] || CONFIG.PLACEHOLDER_HOTEL;
        }
        // Add cache-busting parameter based on updatedAt timestamp (or current time as fallback)
        if (imageUrl) {
            const cacheBuster = hotel.updatedAt ? new Date(hotel.updatedAt).getTime() : Date.now();
            imageUrl += (imageUrl.includes('?') ? '&' : '?') + 'v=' + cacheBuster;
        }
        return imageUrl;
    },
    
    /**
     * Get room image URL with cache busting
     */
    getRoomImage(room) {
        let imageUrl;
        if (room.imageUrl) {
            imageUrl = room.imageUrl;
        } else {
            imageUrl = CONFIG.ROOM_IMAGES[room.roomType] || CONFIG.PLACEHOLDER_ROOM;
        }
        // Add cache-busting parameter (use updatedAt or current time as fallback)
        if (imageUrl) {
            const cacheBuster = room.updatedAt ? new Date(room.updatedAt).getTime() : Date.now();
            imageUrl += (imageUrl.includes('?') ? '&' : '?') + 'v=' + cacheBuster;
        }
        return imageUrl;
    },
    
    /**
     * Get amenity icon
     */
    getAmenityIcon(amenity) {
        return CONFIG.AMENITY_ICONS[amenity] || 'fa-check';
    },
    
    /**
     * Render hotel card
     */
    renderHotelCard(hotel) {
        const imageUrl = this.getHotelImage(hotel);
        
        return `
            <article class="hotel-card card">
                <div class="card-image">
                    <img src="${imageUrl}" alt="${hotel.name}" loading="lazy">
                    ${hotel.featured ? '<span class="card-badge">Featured</span>' : ''}
                    <button class="card-favorite" aria-label="Add to favorites">
                        <i class="far fa-heart"></i>
                    </button>
                </div>
                <div class="card-body">
                    <h3 class="card-title">
                        <a href="hotel-detail.html?id=${hotel.id}">${hotel.name}</a>
                    </h3>
                    <div class="card-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${hotel.city}, ${hotel.country}
                    </div>
                    <div class="card-rating">
                        ${this.generateStars(hotel.starRating)}
                        <span class="rating-text">${hotel.starRating} Stars</span>
                    </div>
                    <div class="card-footer">
                        <div class="card-price">
                            ${this.formatCurrency(hotel.minPrice || 0)}
                            <span>/ night</span>
                        </div>
                        <a href="hotel-detail.html?id=${hotel.id}" class="btn btn-primary btn-sm">
                            View Details
                        </a>
                    </div>
                </div>
            </article>
        `;
    },
    
    /**
     * Render room card
     */
    renderRoomCard(room, hotelId, checkIn = '', checkOut = '') {
        const imageUrl = this.getRoomImage(room);
        const roomTypeName = CONFIG.ROOM_TYPES[room.roomType] || room.roomType;
        
        let bookingUrl = `booking.html?hotelId=${hotelId}&roomId=${room.id}`;
        if (checkIn) bookingUrl += `&checkIn=${checkIn}`;
        if (checkOut) bookingUrl += `&checkOut=${checkOut}`;
        
        return `
            <div class="room-card">
                <div class="room-image">
                    <img src="${imageUrl}" alt="${room.name}" loading="lazy">
                </div>
                <div class="room-details">
                    <div class="room-info">
                        <h4 class="room-name">${room.name}</h4>
                        <span class="room-type badge badge-gold">${roomTypeName}</span>
                        <p class="room-description">${room.description || 'Comfortable room with modern amenities'}</p>
                        <div class="room-specs">
                            <span><i class="fas fa-user-friends"></i> ${room.maxOccupancy} Guests</span>
                            <span><i class="fas fa-bed"></i> ${room.bedType || 'Queen Bed'}</span>
                            <span><i class="fas fa-expand-arrows-alt"></i> ${room.size || '30'} m²</span>
                        </div>
                    </div>
                    <div class="room-pricing">
                        <div class="room-price">
                            ${this.formatCurrency(room.pricePerNight)}
                            <span>/ night</span>
                        </div>
                        ${room.available !== false ? 
                            `<a href="${bookingUrl}" class="btn btn-primary">Book Now</a>` :
                            `<button class="btn btn-secondary" disabled>Not Available</button>`
                        }
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Render booking card
     */
    renderBookingCard(booking, canReview = false, existingReview = null) {
        const status = CONFIG.BOOKING_STATUS[booking.status] || { label: booking.status, class: 'badge-info' };
        const hotelImage = booking.hotelImageUrl || CONFIG.PLACEHOLDER_HOTEL;
        
        // Calculate cancellation deadline (24 hours from booking creation)
        const cancellationDeadline = booking.createdAt ? this.getCancellationDeadline(booking.createdAt) : null;
        const canCancel = (booking.status === 'PENDING' || booking.status === 'CONFIRMED') && cancellationDeadline && cancellationDeadline.canCancel;
        
        // Confirmation message for confirmed bookings
        const isConfirmed = booking.status === 'CONFIRMED';
        const isCheckedOut = booking.status === 'CHECKED_OUT';
        
        // Review button logic
        let reviewButton = '';
        if (canReview) {
            // Can write a new review
            reviewButton = `
                <button class="btn btn-gold btn-sm write-review-btn" data-id="${booking.id}" data-hotel="${booking.hotelName}">
                    <i class="fas fa-star"></i> Write Review
                </button>
            `;
        } else if (existingReview) {
            if (existingReview.status === 'PENDING') {
                // Can edit pending review
                reviewButton = `
                    <button class="btn btn-outline btn-sm edit-review-btn" data-id="${booking.id}" data-hotel="${booking.hotelName}" data-review-id="${existingReview.id}">
                        <i class="fas fa-edit"></i> Edit Review
                    </button>
                `;
            } else if (existingReview.status === 'APPROVED') {
                // Review is approved - show indicator only
                reviewButton = `
                    <span class="review-submitted-badge">
                        <i class="fas fa-check-circle"></i> Review Published
                    </span>
                `;
            } else if (existingReview.status === 'REJECTED') {
                // Review was rejected - can't edit
                reviewButton = `
                    <span class="review-rejected-badge">
                        <i class="fas fa-times-circle"></i> Review Not Published
                    </span>
                `;
            }
        }
        
        return `
            <div class="booking-card">
                <div class="booking-image">
                    <img src="${hotelImage}" alt="${booking.hotelName}">
                </div>
                <div class="booking-details">
                    <div class="booking-header">
                        <div>
                            <h4 class="booking-hotel">${booking.hotelName}</h4>
                            <p class="booking-room">${booking.roomName}</p>
                        </div>
                        <span class="badge ${status.class}">${status.label}</span>
                    </div>
                    ${isConfirmed ? `
                    <div class="booking-confirmed-message">
                        <i class="fas fa-check-circle"></i>
                        <span>Your booking has been confirmed by the Hotel Admin</span>
                    </div>
                    ` : booking.status === 'PENDING' ? `
                    <div class="booking-pending-message">
                        <i class="fas fa-clock"></i>
                        <span>Awaiting confirmation from the Hotel Admin</span>
                    </div>
                    ` : isCheckedOut ? `
                    <div class="booking-completed-message">
                        <i class="fas fa-check-double"></i>
                        <span>Stay completed - Thank you for choosing LuxeStay!</span>
                    </div>
                    ` : ''}
                    ${canCancel ? `
                    <div class="cancellation-timer" data-deadline="${cancellationDeadline.deadline}">
                        <div class="timer-header">
                            <i class="fas fa-clock"></i>
                            <span>Free cancellation available for</span>
                        </div>
                        <div class="timer-countdown">
                            <div class="timer-unit">
                                <span class="timer-value hours">00</span>
                                <span class="timer-label">Hours</span>
                            </div>
                            <span class="timer-separator">:</span>
                            <div class="timer-unit">
                                <span class="timer-value minutes">00</span>
                                <span class="timer-label">Min</span>
                            </div>
                            <span class="timer-separator">:</span>
                            <div class="timer-unit">
                                <span class="timer-value seconds">00</span>
                                <span class="timer-label">Sec</span>
                            </div>
                        </div>
                    </div>
                    ` : (booking.status === 'PENDING' || booking.status === 'CONFIRMED') ? `
                    <div class="cancellation-expired">
                        <i class="fas fa-info-circle"></i>
                        <span>Free cancellation period has ended</span>
                    </div>
                    ` : ''}
                    <div class="booking-info">
                        <div class="booking-dates">
                            <div class="date-item">
                                <span class="date-label">Check-in</span>
                                <span class="date-value">${this.formatDate(booking.checkInDate)}</span>
                            </div>
                            <div class="date-separator">
                                <i class="fas fa-arrow-right"></i>
                            </div>
                            <div class="date-item">
                                <span class="date-label">Check-out</span>
                                <span class="date-value">${this.formatDate(booking.checkOutDate)}</span>
                            </div>
                        </div>
                        <div class="booking-meta">
                            <span><i class="fas fa-moon"></i> ${booking.totalNights || booking.numberOfNights || 1} nights</span>
                            <span><i class="fas fa-user-friends"></i> ${booking.numGuests || booking.numberOfGuests || 1} guests</span>
                        </div>
                    </div>
                    <div class="booking-footer">
                        <div class="booking-total">
                            Total: ${this.formatCurrency(booking.totalPrice || booking.totalAmount || 0)}
                        </div>
                        <div class="booking-actions">
                            <span class="booking-ref">Ref: ${booking.bookingReference}</span>
                            ${reviewButton}
                            ${isConfirmed ? `
                                <button class="btn btn-gold btn-sm view-itinerary-btn" data-id="${booking.id}" data-hotel="${booking.hotelName}">
                                    <i class="fas fa-route"></i> Itinerary
                                </button>
                            ` : ''}
                            ${canCancel ? `
                                <button class="btn btn-outline btn-sm cancel-booking-btn" data-id="${booking.id}">
                                    Cancel
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Calculate cancellation deadline (24 hours from booking creation)
     */
    getCancellationDeadline(createdAt) {
        const createdDate = new Date(createdAt);
        const deadline = new Date(createdDate.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
        const now = new Date();
        const canCancel = deadline > now;
        
        return {
            deadline: deadline.toISOString(),
            canCancel: canCancel
        };
    },
    
    /**
     * Loading state for containers
     */
    showLoading(container) {
        container.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading...</p>
            </div>
        `;
    },
    
    /**
     * Empty state
     */
    showEmpty(container, title, message, icon = 'fa-folder-open') {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <h3 class="empty-state-title">${title}</h3>
                <p class="empty-state-text">${message}</p>
            </div>
        `;
    },
    
    /**
     * Error state
     */
    showError(container, message = 'Something went wrong') {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon" style="background: var(--color-error-light); color: var(--color-error);">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 class="empty-state-title">Error</h3>
                <p class="empty-state-text">${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">Try Again</button>
            </div>
        `;
    },
    
    /**
     * Calculate nights between dates
     */
    calculateNights(checkIn, checkOut) {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },
    
    /**
     * Validate form
     */
    validateForm(form) {
        let isValid = true;
        const inputs = form.querySelectorAll('[required]');
        
        inputs.forEach(input => {
            const errorEl = input.parentElement.querySelector('.form-error');
            
            if (!input.value.trim()) {
                input.classList.add('error');
                if (errorEl) errorEl.textContent = 'This field is required';
                isValid = false;
            } else if (input.type === 'email' && !this.isValidEmail(input.value)) {
                input.classList.add('error');
                if (errorEl) errorEl.textContent = 'Please enter a valid email';
                isValid = false;
            } else {
                input.classList.remove('error');
                if (errorEl) errorEl.textContent = '';
            }
        });
        
        return isValid;
    },
    
    /**
     * Email validation
     */
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },
    
    /**
     * Set minimum date for date inputs (today)
     */
    setMinDateToday(input) {
        input.min = this.formatDateForInput(new Date());
    },
    
    /**
     * Parse URL params
     */
    getUrlParams() {
        return Object.fromEntries(new URLSearchParams(window.location.search));
    },

    // =====================================================
    // PREMIUM ENHANCEMENTS - Skeleton Loaders
    // =====================================================
    
    /**
     * Generate skeleton card HTML
     */
    generateSkeletonCard() {
        return `
            <div class="skeleton-card">
                <div class="skeleton skeleton-image"></div>
                <div class="skeleton-content">
                    <div class="skeleton skeleton-text skeleton-text-lg w-70"></div>
                    <div class="skeleton skeleton-text w-50"></div>
                    <div class="skeleton skeleton-text w-80"></div>
                    <div class="skeleton-footer">
                        <div class="skeleton skeleton-text skeleton-price"></div>
                        <div class="skeleton skeleton-text skeleton-btn"></div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Generate skeleton row HTML (for lists)
     */
    generateSkeletonRow() {
        return `
            <div class="skeleton-card" style="flex-direction: row; padding: var(--space-4);">
                <div class="skeleton" style="width: 100px; height: 80px; border-radius: var(--radius-lg); flex-shrink: 0;"></div>
                <div class="skeleton-content" style="flex: 1; padding: 0 var(--space-4);">
                    <div class="skeleton skeleton-text w-60"></div>
                    <div class="skeleton skeleton-text w-40"></div>
                    <div class="skeleton skeleton-text w-30"></div>
                </div>
            </div>
        `;
    },

    /**
     * Show skeleton loading state
     * @param {HTMLElement} container - Container element
     * @param {number} count - Number of skeleton cards
     * @param {string} type - 'card' or 'row'
     */
    showSkeletonLoading(container, count = 6, type = 'card') {
        const skeletonGenerator = type === 'row' 
            ? this.generateSkeletonRow 
            : this.generateSkeletonCard;
        
        container.innerHTML = Array(count)
            .fill('')
            .map(() => skeletonGenerator.call(this))
            .join('');
        
        container.classList.add('fade-in');
    },

    /**
     * Enhanced loading with progress indicator
     */
    showProgressLoading(container, message = 'Loading...') {
        container.innerHTML = `
            <div class="loading-progress">
                <div class="page-progress" style="width: 0%; position: relative;"></div>
                <div class="loading-spinner"></div>
                <p class="loading-message">${message}</p>
            </div>
        `;
        
        // Animate progress
        const progress = container.querySelector('.page-progress');
        let width = 0;
        const interval = setInterval(() => {
            width += Math.random() * 15;
            if (width >= 90) {
                clearInterval(interval);
                width = 90;
            }
            progress.style.width = width + '%';
        }, 200);
        
        // Store interval for cleanup
        container._loadingInterval = interval;
    },

    /**
     * Complete progress loading
     */
    completeProgressLoading(container) {
        if (container._loadingInterval) {
            clearInterval(container._loadingInterval);
        }
        const progress = container.querySelector('.page-progress');
        if (progress) {
            progress.style.width = '100%';
            setTimeout(() => {
                progress.style.opacity = '0';
            }, 200);
        }
    },

    // =====================================================
    // PREMIUM ENHANCEMENTS - Button Interactions
    // =====================================================

    /**
     * Add ripple effect to button
     */
    addRippleEffect(button) {
        button.classList.add('btn-ripple');
        button.addEventListener('click', (e) => {
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            button.style.setProperty('--ripple-x', x + 'px');
            button.style.setProperty('--ripple-y', y + 'px');
            
            button.classList.add('rippling');
            setTimeout(() => button.classList.remove('rippling'), 600);
        });
    },

    /**
     * Set button loading state
     */
    setButtonLoading(button, loading = true) {
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
            button._originalText = button.innerHTML;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
            if (button._originalText) {
                button.innerHTML = button._originalText;
            }
        }
    },

    // =====================================================
    // PREMIUM ENHANCEMENTS - Form Interactions
    // =====================================================

    /**
     * Show form field success state
     */
    showFieldSuccess(input) {
        input.classList.remove('error');
        input.classList.add('success');
        setTimeout(() => input.classList.remove('success'), 1000);
    },

    /**
     * Show form field error with shake
     */
    showFieldError(input, message) {
        input.classList.add('error');
        input.classList.add('error-shake');
        
        const errorEl = input.parentElement.querySelector('.form-error');
        if (errorEl) errorEl.textContent = message;
        
        setTimeout(() => input.classList.remove('error-shake'), 500);
    },

    // =====================================================
    // PREMIUM ENHANCEMENTS - Animations
    // =====================================================

    /**
     * Animate element entrance
     */
    animateEntrance(element, delay = 0) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        element.style.transitionDelay = delay + 's';
        
        requestAnimationFrame(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });
    },

    /**
     * Stagger animate children
     */
    staggerAnimateChildren(container, selector, baseDelay = 0.05) {
        const children = container.querySelectorAll(selector);
        children.forEach((child, index) => {
            this.animateEntrance(child, index * baseDelay);
        });
    },

    /**
     * Setup scroll reveal for sections
     */
    setupScrollReveal() {
        const revealElements = document.querySelectorAll('.section-reveal');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        revealElements.forEach(el => observer.observe(el));
    },

    /**
     * Animate price update
     */
    animatePriceUpdate(element, newValue) {
        element.classList.add('price-update');
        element.textContent = this.formatCurrency(newValue);
        setTimeout(() => element.classList.remove('price-update'), 400);
    },

    /**
     * Count up animation for numbers
     */
    countUp(element, targetValue, duration = 1000, prefix = '', suffix = '') {
        const startValue = 0;
        const startTime = performance.now();
        
        const updateCount = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOut);
            
            element.textContent = prefix + currentValue.toLocaleString() + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(updateCount);
            }
        };
        
        requestAnimationFrame(updateCount);
    },

    // =====================================================
    // PREMIUM ENHANCEMENTS - Image Loading
    // =====================================================

    /**
     * Lazy load images with fade-in
     */
    setupLazyImages() {
        const images = document.querySelectorAll('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.onload = () => {
                        img.setAttribute('data-loaded', 'true');
                        img.removeAttribute('data-src');
                    };
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => {
            img.parentElement.classList.add('img-loading');
            imageObserver.observe(img);
        });
    },

    // =====================================================
    // PREMIUM ENHANCEMENTS - Booking Success
    // =====================================================

    /**
     * Show booking success celebration
     */
    showBookingSuccess(container, bookingReference, hotelName) {
        container.innerHTML = `
            <div class="booking-success">
                <div class="success-icon">
                    <i class="fas fa-check"></i>
                </div>
                <h2>Booking Confirmed!</h2>
                <p>Your reservation at <strong>${hotelName}</strong> has been confirmed.</p>
                <div class="booking-reference">${bookingReference}</div>
                <p style="color: var(--color-gray-500); margin-top: var(--space-2);">
                    Please save this reference number for your records.
                </p>
                <div class="success-actions">
                    <a href="/my-bookings.html" class="btn btn-primary">
                        <i class="fas fa-list"></i> View My Bookings
                    </a>
                    <a href="/hotels.html" class="btn btn-secondary">
                        <i class="fas fa-search"></i> Browse More Hotels
                    </a>
                </div>
            </div>
        `;
    },

    // =====================================================
    // PREMIUM ENHANCEMENTS - Error Recovery
    // =====================================================

    /**
     * Enhanced error state with retry
     */
    showErrorWithRetry(container, message, retryCallback) {
        container.innerHTML = `
            <div class="error-state">
                <div class="empty-state-icon" style="background: var(--color-error-light); color: var(--color-error);">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 class="empty-state-title">Something went wrong</h3>
                <p class="empty-state-text">${message}</p>
                <button class="btn btn-primary error-retry-btn">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
        
        const retryBtn = container.querySelector('.error-retry-btn');
        retryBtn.addEventListener('click', () => {
            this.setButtonLoading(retryBtn, true);
            retryCallback();
        });
    }
};

// =====================================================
// GLOBAL EVENT HANDLERS
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    // Navbar scroll effect
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }
    
    // Mobile menu toggle
    const navbarToggle = document.getElementById('navbarToggle');
    const navbarMenu = document.getElementById('navbarMenu');
    
    if (navbarToggle && navbarMenu) {
        navbarToggle.addEventListener('click', () => {
            navbarMenu.classList.toggle('active');
        });
    }
    
    // Password visibility toggle
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const input = toggle.previousElementSibling;
            const icon = toggle.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
    
    // Clear form errors on input with success feedback
    document.querySelectorAll('.form-input').forEach(input => {
        input.addEventListener('input', () => {
            input.classList.remove('error');
            input.classList.remove('error-shake');
            const errorEl = input.parentElement.querySelector('.form-error');
            if (errorEl) errorEl.textContent = '';
        });
        
        // Add focus enhancement
        input.addEventListener('focus', () => {
            const label = input.parentElement.querySelector('.form-label');
            if (label) label.classList.add('focused');
        });
        
        input.addEventListener('blur', () => {
            const label = input.parentElement.querySelector('.form-label');
            if (label) label.classList.remove('focused');
        });
    });

    // Add ripple effect to all primary buttons
    document.querySelectorAll('.btn-primary, .btn-secondary').forEach(btn => {
        UI.addRippleEffect(btn);
    });

    // Setup scroll reveal for sections
    UI.setupScrollReveal();

    // Setup lazy loading for images
    UI.setupLazyImages();

    // Add page content entrance animation
    const pageContent = document.querySelector('.page-content, main');
    if (pageContent) {
        pageContent.classList.add('fade-in');
    }
});
