/**
 * Journey Canvas - Unified Travel Experience Timeline
 * 
 * A cohesive visual journey that guides users from discovery to memories.
 * Integrates with existing modules without modifying backend APIs.
 * 
 * Phases: DISCOVER → PLAN → BOOK → STAY → REMEMBER
 * 
 * @version 1.0.0
 */

class JourneyCanvas {
    constructor() {
        // State
        this.currentPhase = 'discover';
        this.isMinimized = false;
        this.isInitialized = false;
        
        // Journey Data
        this.journeyData = {
            mood: null,
            selectedHotel: null,
            checkIn: null,
            checkOut: null,
            guests: 2,
            room: null,
            booking: null
        };
        
        // Phase Configuration
        this.phases = [
            { id: 'discover', label: 'Discover', icon: 'fa-compass', color: '#ec4899' },
            { id: 'plan', label: 'Plan', icon: 'fa-calendar-alt', color: '#f59e0b' },
            { id: 'book', label: 'Book', icon: 'fa-check-circle', color: '#10b981' },
            { id: 'stay', label: 'Stay', icon: 'fa-hotel', color: '#3b82f6' },
            { id: 'remember', label: 'Remember', icon: 'fa-heart', color: '#8b5cf6' }
        ];
        
        // Mood Configuration
        this.moods = [
            { id: 'ROMANTIC_GETAWAY', name: 'Romantic', icon: '💕', gradient: 'linear-gradient(135deg, #ff6b6b, #ee5a5a)', color: '#ff6b6b' },
            { id: 'ADVENTURE', name: 'Adventure', icon: '🏔️', gradient: 'linear-gradient(135deg, #4ecdc4, #44a08d)', color: '#4ecdc4' },
            { id: 'RELAXATION', name: 'Relaxation', icon: '🧘', gradient: 'linear-gradient(135deg, #a8e6cf, #7fcdcd)', color: '#7fcdcd' },
            { id: 'FAMILY_FUN', name: 'Family Fun', icon: '👨‍👩‍👧‍👦', gradient: 'linear-gradient(135deg, #ffd93d, #f9c74f)', color: '#ffd93d' },
            { id: 'BUSINESS', name: 'Business', icon: '💼', gradient: 'linear-gradient(135deg, #6c5ce7, #5f4dd0)', color: '#6c5ce7' },
            { id: 'SOLO', name: 'Solo Trip', icon: '✨', gradient: 'linear-gradient(135deg, #ff9a9e, #fad0c4)', color: '#ff9a9e' }
        ];
        
        // Hotels cache
        this.hotelsCache = null;
        this.bookingsCache = null;
        
        // API Base URL - Use CONFIG directly
        this.apiBase = (window.CONFIG && window.CONFIG.API_BASE_URL) 
            ? window.CONFIG.API_BASE_URL 
            : 'https://luxestay-backend-1.onrender.com/api';
        
        // Element references
        this.container = null;
        this.elements = {};
    }
    
    /**
     * Initialize Journey Canvas
     */
    async init(containerId = 'journeyCanvas') {
        // Check if container exists
        let container = document.getElementById(containerId);
        if (!container) {
            // Create container in hero section or after navbar
            const heroSection = document.querySelector('.hero') || document.querySelector('main');
            if (heroSection) {
                container = document.createElement('div');
                container.id = containerId;
                heroSection.insertAdjacentElement('afterend', container);
            } else {
                console.warn('Journey Canvas: No suitable container found');
                return;
            }
        }
        
        this.container = container;
        
        // Load user context
        this.loadUserContext();
        
        // Render the canvas
        this.render();
        
        // Bind events
        this.bindEvents();
        
        // Determine initial phase based on user context
        await this.determineInitialPhase();
        
        this.isInitialized = true;
    }
    
    /**
     * Load user context from localStorage and existing data
     */
    loadUserContext() {
        try {
            const savedJourney = localStorage.getItem('luxestay_journey');
            if (savedJourney) {
                const parsed = JSON.parse(savedJourney);
                this.journeyData = { ...this.journeyData, ...parsed };
            }
        } catch (e) {
            // Ignore parse errors
        }
    }
    
    /**
     * Save journey data to localStorage
     */
    saveJourneyData() {
        try {
            localStorage.setItem('luxestay_journey', JSON.stringify(this.journeyData));
        } catch (e) {
            // Ignore storage errors
        }
    }
    
    /**
     * Determine initial phase based on user state
     */
    async determineInitialPhase() {
        const token = localStorage.getItem('token');
        
        if (token) {
            // Check for active bookings
            try {
                const bookings = await this.fetchUserBookings();
                if (bookings && bookings.length > 0) {
                    // Check for current/upcoming stay
                    const today = new Date();
                    const activeBooking = bookings.find(b => {
                        const checkIn = new Date(b.checkInDate);
                        const checkOut = new Date(b.checkOutDate);
                        return b.status === 'CONFIRMED' && checkIn <= today && today <= checkOut;
                    });
                    
                    if (activeBooking) {
                        this.journeyData.booking = activeBooking;
                        this.setPhase('stay');
                        return;
                    }
                    
                    // Check for past bookings (memories)
                    const pastBookings = bookings.filter(b => {
                        const checkOut = new Date(b.checkOutDate);
                        return b.status === 'COMPLETED' && checkOut < today;
                    });
                    
                    if (pastBookings.length > 0 && !this.journeyData.mood) {
                        this.bookingsCache = pastBookings;
                    }
                }
            } catch (e) {
                // Continue with discover phase
            }
        }
        
        // Default to discover if no journey data
        if (this.journeyData.selectedHotel && this.journeyData.checkIn) {
            this.setPhase('book');
        } else if (this.journeyData.mood) {
            this.setPhase('discover');
        }
    }
    
    /**
     * Render the Journey Canvas
     */
    render() {
        this.container.innerHTML = `
            <div class="journey-canvas ${this.isMinimized ? 'minimized' : ''}" id="journeyCanvasWidget">
                <div class="journey-canvas-inner">
                    ${this.renderHeader()}
                    ${this.renderTimeline()}
                    <div class="journey-content" id="journeyContent">
                        ${this.renderPhaseContent(this.currentPhase)}
                    </div>
                    ${this.renderActions()}
                </div>
            </div>
        `;
        
        // Cache elements
        this.cacheElements();
    }
    
    /**
     * Render header
     */
    renderHeader() {
        return `
            <div class="journey-header">
                <div class="journey-title">
                    <div class="journey-title-icon">
                        <i class="fas fa-route"></i>
                    </div>
                    <div>
                        <h2>Your Journey</h2>
                        <p>Personalized travel experience</p>
                    </div>
                </div>
                <button class="journey-minimize-btn" id="journeyMinimize" aria-label="Minimize">
                    <i class="fas fa-chevron-up"></i>
                </button>
            </div>
        `;
    }
    
    /**
     * Render timeline
     */
    renderTimeline() {
        const currentIndex = this.phases.findIndex(p => p.id === this.currentPhase);
        const progressWidth = currentIndex > 0 ? ((currentIndex / (this.phases.length - 1)) * 90) : 0;
        
        return `
            <div class="journey-timeline">
                <div class="journey-timeline-progress" style="width: ${progressWidth}%"></div>
                ${this.phases.map((phase, index) => `
                    <div class="journey-phase ${phase.id === this.currentPhase ? 'active' : ''} ${index < currentIndex ? 'completed' : ''}" 
                         data-phase="${phase.id}" 
                         style="--phase-color: ${phase.color}">
                        <div class="journey-phase-dot">
                            <i class="fas ${phase.icon}"></i>
                        </div>
                        <span class="journey-phase-label">${phase.label}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Render phase content
     */
    renderPhaseContent(phase) {
        switch (phase) {
            case 'discover':
                return this.renderDiscoverPhase();
            case 'plan':
                return this.renderPlanPhase();
            case 'book':
                return this.renderBookPhase();
            case 'stay':
                return this.renderStayPhase();
            case 'remember':
                return this.renderRememberPhase();
            default:
                return this.renderDiscoverPhase();
        }
    }
    
    /**
     * Render Discover Phase
     */
    renderDiscoverPhase() {
        return `
            <div class="journey-phase-content active" data-content="discover">
                <div class="journey-content-header">
                    <div class="journey-content-icon discover">
                        <i class="fas fa-compass"></i>
                    </div>
                    <div class="journey-content-title">
                        <h3>What's Your Travel Mood?</h3>
                        <p>Select your vibe and we'll find perfect matches</p>
                    </div>
                </div>
                
                <div class="journey-mood-grid">
                    ${this.moods.map(mood => `
                        <div class="journey-mood-card ${this.journeyData.mood === mood.id ? 'selected' : ''}" 
                             data-mood="${mood.id}"
                             style="--mood-gradient: ${mood.gradient}; --mood-color: ${mood.color}">
                            <div class="journey-mood-icon">${mood.icon}</div>
                            <div class="journey-mood-name">${mood.name}</div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="journey-hotels-grid" id="journeyHotelsGrid">
                    ${this.journeyData.mood ? this.renderLoadingState() : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Render Plan Phase
     */
    renderPlanPhase() {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        return `
            <div class="journey-phase-content active" data-content="plan">
                <div class="journey-content-header">
                    <div class="journey-content-icon plan">
                        <i class="fas fa-calendar-alt"></i>
                    </div>
                    <div class="journey-content-title">
                        <h3>Plan Your Stay</h3>
                        <p>Select dates and see the best time to book</p>
                    </div>
                </div>
                
                <div class="journey-calendar-wrapper">
                    <div class="journey-calendar">
                        <div class="journey-calendar-header">
                            <div class="journey-calendar-month" id="calendarMonth">
                                ${this.getMonthName(currentMonth)} ${currentYear}
                            </div>
                            <div class="journey-calendar-nav">
                                <button id="calendarPrev"><i class="fas fa-chevron-left"></i></button>
                                <button id="calendarNext"><i class="fas fa-chevron-right"></i></button>
                            </div>
                        </div>
                        <div class="journey-calendar-grid" id="calendarGrid">
                            ${this.renderCalendarGrid(currentMonth, currentYear)}
                        </div>
                    </div>
                    
                    <div class="journey-plan-sidebar">
                        <div class="journey-plan-card">
                            <h4><i class="fas fa-cloud-sun"></i> Weather Forecast</h4>
                            <div class="journey-weather-forecast" id="weatherForecast">
                                ${this.renderWeatherForecast()}
                            </div>
                        </div>
                        
                        <div class="journey-plan-card">
                            <h4><i class="fas fa-tag"></i> Price Trend</h4>
                            <div class="journey-price-trend">
                                <p style="color: var(--journey-muted); font-size: 0.875rem;">
                                    <span style="color: #10b981;">●</span> Low prices
                                    <span style="color: #f59e0b; margin-left: 8px;">●</span> Medium
                                    <span style="color: #ef4444; margin-left: 8px;">●</span> High
                                </p>
                            </div>
                        </div>
                        
                        ${this.journeyData.selectedHotel ? `
                        <div class="journey-plan-card">
                            <h4><i class="fas fa-hotel"></i> Selected Hotel</h4>
                            <p style="color: var(--journey-text); font-weight: 500; margin: 0;">
                                ${this.journeyData.selectedHotel.name}
                            </p>
                            <p style="color: var(--journey-muted); font-size: 0.8125rem; margin: 4px 0 0 0;">
                                <i class="fas fa-map-marker-alt" style="color: var(--journey-primary);"></i>
                                ${this.journeyData.selectedHotel.city}
                            </p>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render Book Phase
     */
    renderBookPhase() {
        const hotel = this.journeyData.selectedHotel;
        const checkIn = this.journeyData.checkIn;
        const checkOut = this.journeyData.checkOut;
        
        if (!hotel) {
            return this.renderEmptyState('No hotel selected', 'Go back to discover your perfect stay', 'fa-hotel');
        }
        
        const nights = checkIn && checkOut ? this.calculateNights(checkIn, checkOut) : 1;
        const pricePerNight = hotel.pricePerNight || hotel.minPrice || 5000;
        const subtotal = pricePerNight * nights;
        const taxes = Math.round(subtotal * 0.18);
        const total = subtotal + taxes;
        
        return `
            <div class="journey-phase-content active" data-content="book">
                <div class="journey-content-header">
                    <div class="journey-content-icon book">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="journey-content-title">
                        <h3>Confirm Your Booking</h3>
                        <p>Review details and complete your reservation</p>
                    </div>
                </div>
                
                <div class="journey-booking-layout">
                    <div class="journey-booking-details">
                        <div class="journey-booking-hotel">
                            <img src="${hotel.heroImageUrl || hotel.imageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945'}" 
                                 alt="${hotel.name}"
                                 onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945'">
                            <div class="journey-booking-hotel-info">
                                <h4>${hotel.name}</h4>
                                <p><i class="fas fa-map-marker-alt"></i> ${hotel.city}</p>
                                <p style="color: var(--journey-accent);">${'★'.repeat(Math.floor(hotel.starRating || hotel.rating || 4))}</p>
                            </div>
                        </div>
                        
                        <div class="journey-booking-dates">
                            <div class="journey-date-box">
                                <label>Check In</label>
                                <div class="date">${checkIn ? this.formatDate(checkIn) : 'Select date'}</div>
                            </div>
                            <div class="journey-date-box">
                                <label>Check Out</label>
                                <div class="date">${checkOut ? this.formatDate(checkOut) : 'Select date'}</div>
                            </div>
                        </div>
                        
                        <div class="journey-confidence">
                            <div class="journey-confidence-header">
                                <span class="journey-confidence-label">Booking Confidence</span>
                                <span class="journey-confidence-value">High</span>
                            </div>
                            <div class="journey-confidence-bar">
                                <div class="journey-confidence-fill" style="width: 85%"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="journey-price-summary">
                        <h4 style="color: var(--journey-text); font-size: 1rem; margin: 0 0 1rem 0;">Price Summary</h4>
                        
                        <div class="journey-price-row">
                            <span class="label">₹${pricePerNight.toLocaleString()} × ${nights} night${nights > 1 ? 's' : ''}</span>
                            <span class="value">₹${subtotal.toLocaleString()}</span>
                        </div>
                        <div class="journey-price-row">
                            <span class="label">Taxes & fees (18%)</span>
                            <span class="value">₹${taxes.toLocaleString()}</span>
                        </div>
                        <div class="journey-price-row total">
                            <span class="label">Total</span>
                            <span class="value">₹${total.toLocaleString()}</span>
                        </div>
                        
                        <button class="journey-book-btn" id="journeyBookNow">
                            <i class="fas fa-lock"></i>
                            Book Now
                        </button>
                        
                        <p style="text-align: center; font-size: 0.75rem; color: var(--journey-muted); margin-top: 12px;">
                            <i class="fas fa-shield-alt"></i> Secure booking with instant confirmation
                        </p>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render Stay Phase
     */
    renderStayPhase() {
        const booking = this.journeyData.booking;
        
        if (!booking) {
            return `
                <div class="journey-phase-content active" data-content="stay">
                    <div class="journey-content-header">
                        <div class="journey-content-icon stay">
                            <i class="fas fa-hotel"></i>
                        </div>
                        <div class="journey-content-title">
                            <h3>During Your Stay</h3>
                            <p>Tools and services available during your trip</p>
                        </div>
                    </div>
                    
                    <div class="journey-stay-grid">
                        <div class="journey-stay-card" data-action="itinerary">
                            <div class="journey-stay-icon">
                                <i class="fas fa-route"></i>
                            </div>
                            <h4>Trip Itinerary</h4>
                            <p>AI-generated day plans</p>
                        </div>
                        
                        <div class="journey-stay-card" data-action="concierge">
                            <div class="journey-stay-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                                <i class="fas fa-concierge-bell"></i>
                            </div>
                            <h4>VIP Concierge</h4>
                            <p>24/7 assistance</p>
                        </div>
                        
                        <div class="journey-stay-card" data-action="experiences">
                            <div class="journey-stay-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
                                <i class="fas fa-map-marked-alt"></i>
                            </div>
                            <h4>Local Experiences</h4>
                            <p>Curated activities</p>
                        </div>
                        
                        <div class="journey-stay-card" data-action="dining">
                            <div class="journey-stay-icon" style="background: linear-gradient(135deg, #ec4899, #db2777);">
                                <i class="fas fa-utensils"></i>
                            </div>
                            <h4>Dining</h4>
                            <p>Restaurant reservations</p>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 2rem; padding: 1.5rem; background: var(--journey-card-bg); border-radius: 16px;">
                        <p style="color: var(--journey-muted); margin: 0;">
                            <i class="fas fa-info-circle"></i> 
                            These features activate when you have an active booking
                        </p>
                    </div>
                </div>
            `;
        }
        
        // Active booking view
        return `
            <div class="journey-phase-content active" data-content="stay">
                <div class="journey-content-header">
                    <div class="journey-content-icon stay">
                        <i class="fas fa-hotel"></i>
                    </div>
                    <div class="journey-content-title">
                        <h3>Your Stay at ${booking.hotelName || 'Hotel'}</h3>
                        <p>${this.formatDate(booking.checkInDate)} - ${this.formatDate(booking.checkOutDate)}</p>
                    </div>
                </div>
                
                <div class="journey-stay-grid">
                    <div class="journey-stay-card" data-action="digital-key">
                        <div class="journey-stay-icon">
                            <i class="fas fa-key"></i>
                        </div>
                        <h4>Digital Key</h4>
                        <p>Unlock your room</p>
                    </div>
                    
                    <div class="journey-stay-card" data-action="room-service">
                        <div class="journey-stay-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                            <i class="fas fa-bell"></i>
                        </div>
                        <h4>Room Service</h4>
                        <p>Order to your room</p>
                    </div>
                    
                    <div class="journey-stay-card" data-action="chat-concierge">
                        <div class="journey-stay-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
                            <i class="fas fa-comments"></i>
                        </div>
                        <h4>Chat Concierge</h4>
                        <p>Instant help</p>
                    </div>
                    
                    <div class="journey-stay-card" data-action="checkout">
                        <div class="journey-stay-icon" style="background: linear-gradient(135deg, #ec4899, #db2777);">
                            <i class="fas fa-sign-out-alt"></i>
                        </div>
                        <h4>Express Checkout</h4>
                        <p>Quick & easy</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render Remember Phase
     */
    renderRememberPhase() {
        const pastBookings = this.bookingsCache || [];
        
        if (pastBookings.length === 0) {
            return this.renderEmptyState(
                'No memories yet',
                'Your travel memories will appear here after your stays',
                'fa-camera'
            );
        }
        
        return `
            <div class="journey-phase-content active" data-content="remember">
                <div class="journey-content-header">
                    <div class="journey-content-icon remember">
                        <i class="fas fa-heart"></i>
                    </div>
                    <div class="journey-content-title">
                        <h3>Your Memories</h3>
                        <p>Relive your favorite stays</p>
                    </div>
                </div>
                
                <div class="journey-memories-grid">
                    ${pastBookings.slice(0, 6).map(booking => `
                        <div class="journey-memory-card" data-booking-id="${booking.id}">
                            <img src="${booking.hotelImage || 'https://images.unsplash.com/photo-1566073771259-6a8506099945'}" 
                                 alt="${booking.hotelName}"
                                 onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945'">
                            <div class="journey-memory-overlay">
                                <div class="journey-memory-date">${this.formatDate(booking.checkOutDate)}</div>
                                <div class="journey-memory-title">${booking.hotelName}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="text-align: center; margin-top: 2rem;">
                    <button class="journey-nav-btn primary" onclick="window.location.href='my-bookings.html'">
                        <i class="fas fa-history"></i>
                        View All Bookings
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Render empty state
     */
    renderEmptyState(title, description, icon) {
        return `
            <div class="journey-phase-content active">
                <div class="journey-empty-state">
                    <div class="journey-empty-icon">
                        <i class="fas ${icon}"></i>
                    </div>
                    <h4 class="journey-empty-title">${title}</h4>
                    <p class="journey-empty-desc">${description}</p>
                    <button class="journey-nav-btn primary" id="journeyBackToDiscover">
                        <i class="fas fa-compass"></i>
                        Start Discovering
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Render loading state
     */
    renderLoadingState() {
        return `
            <div class="journey-loading">
                <div class="journey-spinner"></div>
                <span class="journey-loading-text">Finding perfect matches...</span>
            </div>
        `;
    }
    
    /**
     * Render actions (navigation buttons)
     */
    renderActions() {
        const currentIndex = this.phases.findIndex(p => p.id === this.currentPhase);
        const prevPhase = currentIndex > 0 ? this.phases[currentIndex - 1] : null;
        const nextPhase = currentIndex < this.phases.length - 1 ? this.phases[currentIndex + 1] : null;
        
        return `
            <div class="journey-actions">
                ${prevPhase ? `
                    <button class="journey-nav-btn secondary" data-nav="prev">
                        <i class="fas fa-arrow-left"></i>
                        ${prevPhase.label}
                    </button>
                ` : '<div></div>'}
                
                ${nextPhase && this.canProceedToNext() ? `
                    <button class="journey-nav-btn primary" data-nav="next">
                        ${nextPhase.label}
                        <i class="fas fa-arrow-right"></i>
                    </button>
                ` : '<div></div>'}
            </div>
        `;
    }
    
    /**
     * Check if user can proceed to next phase
     */
    canProceedToNext() {
        switch (this.currentPhase) {
            case 'discover':
                return !!this.journeyData.mood && !!this.journeyData.selectedHotel;
            case 'plan':
                return !!this.journeyData.checkIn && !!this.journeyData.checkOut;
            case 'book':
                return !!this.journeyData.booking;
            default:
                return true;
        }
    }
    
    /**
     * Render calendar grid
     */
    renderCalendarGrid(month, year) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        
        let html = days.map(d => `<div class="journey-calendar-day-header">${d}</div>`).join('');
        
        // Empty cells for days before first day of month
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="journey-calendar-day disabled"></div>';
        }
        
        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = this.formatDateISO(date);
            const isToday = date.toDateString() === today.toDateString();
            const isPast = date < today && !isToday;
            const isSelected = dateStr === this.journeyData.checkIn || dateStr === this.journeyData.checkOut;
            const isInRange = this.isDateInRange(dateStr);
            const isStart = dateStr === this.journeyData.checkIn;
            const isEnd = dateStr === this.journeyData.checkOut;
            
            // Random price indicator for demo
            const priceLevel = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)];
            
            let classes = 'journey-calendar-day';
            if (isToday) classes += ' today';
            if (isPast) classes += ' disabled';
            if (isSelected) classes += ' selected';
            if (isInRange) classes += ' in-range';
            if (isStart) classes += ' start-date';
            if (isEnd) classes += ' end-date';
            
            html += `
                <div class="${classes}" data-date="${dateStr}">
                    ${day}
                    ${!isPast ? `<span class="price-indicator ${priceLevel}"></span>` : ''}
                </div>
            `;
        }
        
        return html;
    }
    
    /**
     * Render weather forecast
     */
    renderWeatherForecast() {
        const days = ['Today', 'Tmrw', 'Wed'];
        const icons = ['☀️', '⛅', '🌤️'];
        const temps = ['32°', '30°', '31°'];
        
        return days.map((day, i) => `
            <div class="journey-weather-day">
                <div class="day">${day}</div>
                <div class="icon">${icons[i]}</div>
                <div class="temp">${temps[i]}</div>
            </div>
        `).join('');
    }
    
    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            widget: document.getElementById('journeyCanvasWidget'),
            minimize: document.getElementById('journeyMinimize'),
            content: document.getElementById('journeyContent'),
            hotelsGrid: document.getElementById('journeyHotelsGrid'),
            calendarGrid: document.getElementById('calendarGrid'),
            calendarMonth: document.getElementById('calendarMonth')
        };
    }
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        // Minimize button
        this.container.addEventListener('click', (e) => {
            const minimizeBtn = e.target.closest('#journeyMinimize');
            if (minimizeBtn) {
                this.toggleMinimize();
            }
            
            // Phase navigation
            const phase = e.target.closest('.journey-phase');
            if (phase) {
                const phaseId = phase.dataset.phase;
                this.setPhase(phaseId);
            }
            
            // Mood selection
            const moodCard = e.target.closest('.journey-mood-card');
            if (moodCard) {
                this.selectMood(moodCard.dataset.mood);
            }
            
            // Hotel selection
            const hotelCard = e.target.closest('.journey-hotel-card');
            if (hotelCard) {
                this.selectHotel(hotelCard.dataset.hotelId);
            }
            
            // Calendar date selection
            const calendarDay = e.target.closest('.journey-calendar-day:not(.disabled)');
            if (calendarDay && calendarDay.dataset.date) {
                this.selectDate(calendarDay.dataset.date);
            }
            
            // Calendar navigation
            if (e.target.closest('#calendarPrev')) {
                this.navigateCalendar(-1);
            }
            if (e.target.closest('#calendarNext')) {
                this.navigateCalendar(1);
            }
            
            // Nav buttons
            const navBtn = e.target.closest('.journey-nav-btn[data-nav]');
            if (navBtn) {
                this.navigate(navBtn.dataset.nav);
            }
            
            // Book now button
            if (e.target.closest('#journeyBookNow')) {
                this.proceedToBooking();
            }
            
            // Back to discover
            if (e.target.closest('#journeyBackToDiscover')) {
                this.setPhase('discover');
            }
        });
    }
    
    /**
     * Toggle minimize state
     */
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        const widget = this.elements.widget;
        widget.classList.toggle('minimized', this.isMinimized);
        
        const icon = this.elements.minimize.querySelector('i');
        icon.className = this.isMinimized ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
    }
    
    /**
     * Set current phase
     */
    setPhase(phaseId) {
        this.currentPhase = phaseId;
        this.updateTimeline();
        this.updateContent();
        this.updateActions();
    }
    
    /**
     * Update timeline
     */
    updateTimeline() {
        const timeline = this.container.querySelector('.journey-timeline');
        if (timeline) {
            timeline.outerHTML = this.renderTimeline();
        }
    }
    
    /**
     * Update content
     */
    updateContent() {
        const content = document.getElementById('journeyContent');
        if (content) {
            content.innerHTML = this.renderPhaseContent(this.currentPhase);
            
            // Load hotels if in discover phase with mood selected
            if (this.currentPhase === 'discover' && this.journeyData.mood) {
                this.loadHotelsByMood();
            }
        }
    }
    
    /**
     * Update actions
     */
    updateActions() {
        const actions = this.container.querySelector('.journey-actions');
        if (actions) {
            actions.outerHTML = this.renderActions();
        }
    }
    
    /**
     * Select mood
     */
    async selectMood(moodId) {
        this.journeyData.mood = moodId;
        this.saveJourneyData();
        
        // Update mood cards
        const moodCards = this.container.querySelectorAll('.journey-mood-card');
        moodCards.forEach(card => {
            card.classList.toggle('selected', card.dataset.mood === moodId);
        });
        
        // Load hotels
        await this.loadHotelsByMood();
        this.updateActions();
    }
    
    /**
     * Load hotels by mood
     */
    async loadHotelsByMood() {
        const grid = document.getElementById('journeyHotelsGrid');
        if (!grid) return;
        
        grid.innerHTML = this.renderLoadingState();
        
        try {
            // Fetch hotels from existing API
            const hotels = await this.fetchHotels();
            
            if (hotels && hotels.length > 0) {
                // Filter/sort by mood logic (frontend-only)
                const matchedHotels = this.matchHotelsByMood(hotels, this.journeyData.mood);
                const topHotels = matchedHotels.slice(0, 6);
                
                grid.innerHTML = topHotels.map(hotel => this.renderHotelCard(hotel)).join('');
            } else {
                grid.innerHTML = '<p style="color: var(--journey-muted); text-align: center; padding: 2rem;">No hotels found</p>';
            }
        } catch (error) {
            grid.innerHTML = '<p style="color: var(--journey-muted); text-align: center; padding: 2rem;">Failed to load hotels</p>';
        }
    }
    
    /**
     * Match hotels by mood (frontend logic only)
     */
    matchHotelsByMood(hotels, mood) {
        // Create matching scores based on hotel attributes
        return hotels.map(hotel => {
            let matchScore = 70 + Math.floor(Math.random() * 25); // Base score 70-95
            
            // Boost score based on mood-hotel fit
            const amenities = (hotel.amenities || []).map(a => a.toLowerCase());
            const description = (hotel.description || '').toLowerCase();
            
            switch (mood) {
                case 'ROMANTIC_GETAWAY':
                    if (amenities.some(a => a.includes('spa') || a.includes('pool'))) matchScore += 5;
                    if (hotel.starRating >= 4) matchScore += 3;
                    break;
                case 'ADVENTURE':
                    if (description.includes('adventure') || description.includes('trek')) matchScore += 5;
                    break;
                case 'RELAXATION':
                    if (amenities.some(a => a.includes('spa') || a.includes('massage'))) matchScore += 5;
                    break;
                case 'FAMILY_FUN':
                    if (amenities.some(a => a.includes('pool') || a.includes('kids'))) matchScore += 5;
                    break;
                case 'BUSINESS':
                    if (amenities.some(a => a.includes('wifi') || a.includes('business'))) matchScore += 5;
                    break;
            }
            
            return { ...hotel, matchScore: Math.min(matchScore, 99) };
        }).sort((a, b) => b.matchScore - a.matchScore);
    }
    
    /**
     * Render hotel card
     */
    renderHotelCard(hotel) {
        const stars = '★'.repeat(Math.floor(hotel.starRating || hotel.rating || 4));
        const price = hotel.pricePerNight || hotel.minPrice || 0;
        const imageUrl = hotel.heroImageUrl || hotel.imageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945';
        
        return `
            <div class="journey-hotel-card" data-hotel-id="${hotel.id}">
                <div class="journey-hotel-image">
                    <img src="${imageUrl}" alt="${hotel.name}" 
                         onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945'">
                    <div class="journey-hotel-match">${hotel.matchScore || 90}% Match</div>
                </div>
                <div class="journey-hotel-info">
                    <h4 class="journey-hotel-name">${hotel.name}</h4>
                    <div class="journey-hotel-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${hotel.city}
                    </div>
                    <div class="journey-hotel-meta">
                        <span class="journey-hotel-rating">${stars}</span>
                        <span class="journey-hotel-price">
                            ${price > 0 ? `₹${price.toLocaleString()}` : 'Price on request'}
                            <span>/night</span>
                        </span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Select hotel
     */
    selectHotel(hotelId) {
        const hotels = this.hotelsCache || [];
        const hotel = hotels.find(h => h.id == hotelId);
        
        if (hotel) {
            this.journeyData.selectedHotel = hotel;
            this.saveJourneyData();
            
            // Visual feedback
            const cards = this.container.querySelectorAll('.journey-hotel-card');
            cards.forEach(card => {
                card.style.borderColor = card.dataset.hotelId == hotelId ? 'var(--journey-accent)' : '';
            });
            
            this.updateActions();
            
            // Show toast
            this.showToast(`Selected: ${hotel.name}`);
        }
    }
    
    /**
     * Select date
     */
    selectDate(dateStr) {
        if (!this.journeyData.checkIn || (this.journeyData.checkIn && this.journeyData.checkOut)) {
            // Start new selection
            this.journeyData.checkIn = dateStr;
            this.journeyData.checkOut = null;
        } else {
            // Complete selection
            if (dateStr > this.journeyData.checkIn) {
                this.journeyData.checkOut = dateStr;
            } else {
                // Swap if end date is before start
                this.journeyData.checkOut = this.journeyData.checkIn;
                this.journeyData.checkIn = dateStr;
            }
        }
        
        this.saveJourneyData();
        this.updateCalendarSelection();
        this.updateActions();
    }
    
    /**
     * Update calendar selection visuals
     */
    updateCalendarSelection() {
        const days = this.container.querySelectorAll('.journey-calendar-day[data-date]');
        days.forEach(day => {
            const dateStr = day.dataset.date;
            const isSelected = dateStr === this.journeyData.checkIn || dateStr === this.journeyData.checkOut;
            const isInRange = this.isDateInRange(dateStr);
            const isStart = dateStr === this.journeyData.checkIn;
            const isEnd = dateStr === this.journeyData.checkOut;
            
            day.classList.toggle('selected', isSelected);
            day.classList.toggle('in-range', isInRange);
            day.classList.toggle('start-date', isStart);
            day.classList.toggle('end-date', isEnd);
        });
    }
    
    /**
     * Check if date is in selected range
     */
    isDateInRange(dateStr) {
        if (!this.journeyData.checkIn || !this.journeyData.checkOut) return false;
        return dateStr > this.journeyData.checkIn && dateStr < this.journeyData.checkOut;
    }
    
    /**
     * Navigate calendar
     */
    navigateCalendar(direction) {
        const monthEl = document.getElementById('calendarMonth');
        const gridEl = document.getElementById('calendarGrid');
        if (!monthEl || !gridEl) return;
        
        const currentText = monthEl.textContent;
        const [monthName, year] = currentText.split(' ');
        const monthIndex = this.getMonthIndex(monthName);
        
        let newMonth = monthIndex + direction;
        let newYear = parseInt(year);
        
        if (newMonth < 0) {
            newMonth = 11;
            newYear--;
        } else if (newMonth > 11) {
            newMonth = 0;
            newYear++;
        }
        
        monthEl.textContent = `${this.getMonthName(newMonth)} ${newYear}`;
        gridEl.innerHTML = this.renderCalendarGrid(newMonth, newYear);
    }
    
    /**
     * Navigate between phases
     */
    navigate(direction) {
        const currentIndex = this.phases.findIndex(p => p.id === this.currentPhase);
        const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        
        if (newIndex >= 0 && newIndex < this.phases.length) {
            this.setPhase(this.phases[newIndex].id);
        }
    }
    
    /**
     * Proceed to booking page
     */
    proceedToBooking() {
        const hotel = this.journeyData.selectedHotel;
        if (!hotel) return;
        
        // Redirect to hotel detail page for actual booking
        window.location.href = `hotel-detail.html?id=${hotel.id}`;
    }
    
    // ==================== API Helpers ====================
    
    /**
     * Fetch hotels
     */
    async fetchHotels() {
        if (this.hotelsCache) return this.hotelsCache;
        
        try {
            const url = `${this.apiBase}/hotels?size=100`;
            console.log('Journey Canvas: Fetching hotels from', url);
            
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                this.hotelsCache = data.content || data || [];
                console.log('Journey Canvas: Loaded', this.hotelsCache.length, 'hotels');
                return this.hotelsCache;
            } else {
                console.warn('Journey Canvas: API response not OK:', response.status);
            }
        } catch (e) {
            console.error('Journey Canvas: Fetch error:', e.message);
        }
        return [];
    }
    
    /**
     * Fetch user bookings
     */
    async fetchUserBookings() {
        const token = localStorage.getItem('token');
        if (!token) return [];
        
        try {
            const response = await fetch(`${this.apiBase}/bookings/my-bookings`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            // Ignore
        }
        return [];
    }
    
    // ==================== Utility Methods ====================
    
    getMonthName(index) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
        return months[index];
    }
    
    getMonthIndex(name) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
        return months.indexOf(name);
    }
    
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    
    formatDateISO(date) {
        return date.toISOString().split('T')[0];
    }
    
    calculateNights(checkIn, checkOut) {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }
    
    showToast(message) {
        // Use existing toast system if available
        if (window.UI && window.UI.showToast) {
            window.UI.showToast(message, 'success');
        } else if (window.showToast) {
            window.showToast(message, 'success');
        }
    }
}

// Initialize Journey Canvas when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on a page that should have Journey Canvas
    const isHomePage = window.location.pathname === '/' || 
                       window.location.pathname.endsWith('index.html') ||
                       window.location.pathname === '/index.html';
    
    if (isHomePage) {
        window.journeyCanvas = new JourneyCanvas();
        window.journeyCanvas.init();
    }
});

// Export for use in other modules
window.JourneyCanvas = JourneyCanvas;
