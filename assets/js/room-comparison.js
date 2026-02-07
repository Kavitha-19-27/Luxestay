/**
 * Room Comparison Module
 * Compare multiple rooms side-by-side
 * Mobile: Swipe-based carousel
 * Desktop: Side-by-side table comparison
 * Phase 2: Smart Discovery & Responsive Interaction
 */
window.RoomComparison = (function() {
    'use strict';

    // Configuration
    const CONFIG = {
        apiEndpoint: '/api/hotels',
        maxRooms: 4,
        mobileBreakpoint: 768,
        swipeThreshold: 50
    };

    // State
    let state = {
        hotelId: null,
        roomIds: [],
        checkIn: null,
        checkOut: null,
        comparisonData: null,
        currentIndex: 0,
        isLoading: false,
        viewMode: 'table' // 'carousel' or 'table'
    };

    // DOM Elements
    let elements = {
        container: null,
        header: null,
        body: null,
        carousel: null,
        table: null
    };

    // Touch state
    let touch = {
        startX: 0,
        startY: 0,
        isDragging: false
    };

    // ==================== INITIALIZATION ====================

    function init(containerSelector, options = {}) {
        elements.container = document.querySelector(containerSelector);
        if (!elements.container) {
            console.warn('RoomComparison: Container not found');
            return;
        }

        state.hotelId = options.hotelId;
        state.roomIds = options.roomIds || [];
        state.checkIn = options.checkIn || new Date();
        state.checkOut = options.checkOut || addDays(new Date(), 1);

        determineViewMode();
        createStructure();
        attachEventListeners();

        if (state.roomIds.length > 0) {
            fetchComparisonData();
        }

        // Handle resize
        window.addEventListener('resize', debounce(() => {
            const oldMode = state.viewMode;
            determineViewMode();
            if (oldMode !== state.viewMode && state.comparisonData) {
                render();
            }
        }, 250));

        console.log('RoomComparison initialized');
    }

    function determineViewMode() {
        state.viewMode = window.innerWidth < CONFIG.mobileBreakpoint ? 'carousel' : 'table';
    }

    // ==================== UI CREATION ====================

    function createStructure() {
        elements.container.classList.add('room-comparison');
        elements.container.innerHTML = `
            <div class="room-comparison__header">
                <h3 class="room-comparison__title">Compare Rooms</h3>
                <div class="room-comparison__actions">
                    <span class="room-comparison__count">
                        <span data-count>0</span>/${CONFIG.maxRooms} rooms selected
                    </span>
                    <button class="room-comparison__clear-btn" aria-label="Clear all">
                        <i class="fas fa-times"></i> Clear All
                    </button>
                </div>
            </div>
            <div class="room-comparison__body">
                <div class="room-comparison__loading">
                    <div class="spinner"></div>
                    <p>Loading comparison...</p>
                </div>
                <div class="room-comparison__empty">
                    <i class="fas fa-balance-scale"></i>
                    <p>Select rooms to compare</p>
                    <span>Choose up to ${CONFIG.maxRooms} rooms from the list below</span>
                </div>
                <div class="room-comparison__carousel" role="region" aria-label="Room comparison carousel">
                    <div class="carousel__track"></div>
                    <div class="carousel__dots"></div>
                    <button class="carousel__nav carousel__nav--prev" aria-label="Previous room">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="carousel__nav carousel__nav--next" aria-label="Next room">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="room-comparison__table-wrapper">
                    <table class="room-comparison__table" role="grid">
                        <thead></thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
            <div class="room-comparison__footer">
                <div class="room-comparison__legend">
                    <div class="legend-item best">
                        <i class="fas fa-crown"></i> Best value
                    </div>
                    <div class="legend-item spacious">
                        <i class="fas fa-expand"></i> Most spacious
                    </div>
                </div>
            </div>
        `;

        elements.header = elements.container.querySelector('.room-comparison__header');
        elements.body = elements.container.querySelector('.room-comparison__body');
        elements.carousel = elements.container.querySelector('.room-comparison__carousel');
        elements.table = elements.container.querySelector('.room-comparison__table');
    }

    // ==================== EVENT LISTENERS ====================

    function attachEventListeners() {
        // Clear all button
        const clearBtn = elements.container.querySelector('.room-comparison__clear-btn');
        clearBtn.addEventListener('click', clearAll);

        // Carousel navigation
        const prevBtn = elements.container.querySelector('.carousel__nav--prev');
        const nextBtn = elements.container.querySelector('.carousel__nav--next');
        
        prevBtn.addEventListener('click', () => navigateCarousel(-1));
        nextBtn.addEventListener('click', () => navigateCarousel(1));

        // Touch swipe
        const track = elements.container.querySelector('.carousel__track');
        
        track.addEventListener('touchstart', handleTouchStart, { passive: true });
        track.addEventListener('touchmove', handleTouchMove, { passive: false });
        track.addEventListener('touchend', handleTouchEnd, { passive: true });

        // Dot navigation
        const dotsContainer = elements.container.querySelector('.carousel__dots');
        dotsContainer.addEventListener('click', (e) => {
            const dot = e.target.closest('.carousel__dot');
            if (dot && dot.dataset.index) {
                goToSlide(parseInt(dot.dataset.index));
            }
        });

        // Keyboard navigation
        elements.container.addEventListener('keydown', handleKeyDown);
    }

    function handleTouchStart(e) {
        touch.startX = e.touches[0].clientX;
        touch.startY = e.touches[0].clientY;
        touch.isDragging = true;
    }

    function handleTouchMove(e) {
        if (!touch.isDragging) return;
        
        const deltaX = e.touches[0].clientX - touch.startX;
        const deltaY = e.touches[0].clientY - touch.startY;
        
        // If horizontal swipe is dominant, prevent vertical scroll
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            e.preventDefault();
        }
    }

    function handleTouchEnd(e) {
        if (!touch.isDragging) return;
        touch.isDragging = false;

        const deltaX = e.changedTouches[0].clientX - touch.startX;
        
        if (Math.abs(deltaX) > CONFIG.swipeThreshold) {
            if (deltaX > 0) {
                navigateCarousel(-1);
            } else {
                navigateCarousel(1);
            }
        }
    }

    function handleKeyDown(e) {
        if (state.viewMode !== 'carousel') return;

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                navigateCarousel(-1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                navigateCarousel(1);
                break;
        }
    }

    // ==================== API CALLS ====================

    async function fetchComparisonData() {
        if (!state.hotelId || state.roomIds.length === 0) {
            showEmpty();
            return;
        }

        state.isLoading = true;
        showLoading();

        try {
            const checkInStr = formatDateISO(state.checkIn);
            const checkOutStr = formatDateISO(state.checkOut);
            const roomIdsStr = state.roomIds.join(',');
            
            const response = await fetch(
                `${window.API_BASE_URL || ''}${CONFIG.apiEndpoint}/${state.hotelId}/compare-rooms?roomIds=${roomIdsStr}&checkIn=${checkInStr}&checkOut=${checkOutStr}`,
                {
                    headers: { 'Accept': 'application/json' }
                }
            );

            if (!response.ok) throw new Error('Failed to fetch comparison data');

            state.comparisonData = await response.json();
            state.isLoading = false;
            state.currentIndex = 0;
            
            updateCount();
            render();
        } catch (error) {
            console.error('RoomComparison: Error fetching data', error);
            state.isLoading = false;
            showError();
        }
    }

    // ==================== RENDERING ====================

    function render() {
        if (!state.comparisonData || !state.comparisonData.rooms?.length) {
            showEmpty();
            return;
        }

        hideLoading();
        hideEmpty();

        if (state.viewMode === 'carousel') {
            renderCarousel();
            hideTable();
        } else {
            renderTable();
            hideCarousel();
        }

        elements.container.querySelector('.room-comparison__footer').style.display = 'flex';
    }

    function renderCarousel() {
        const track = elements.container.querySelector('.carousel__track');
        const dotsContainer = elements.container.querySelector('.carousel__dots');
        const rooms = state.comparisonData.rooms;

        // Identify best values
        const bestValue = getBestValue(rooms);
        const mostSpacious = getMostSpacious(rooms);

        // Render slides
        track.innerHTML = rooms.map((room, index) => {
            const badges = [];
            if (room.id === bestValue?.id) badges.push('best-value');
            if (room.id === mostSpacious?.id) badges.push('most-spacious');

            return `
                <div class="carousel__slide ${index === state.currentIndex ? 'active' : ''}"
                     role="tabpanel"
                     aria-label="Room ${index + 1} of ${rooms.length}">
                    ${createRoomCard(room, badges)}
                </div>
            `;
        }).join('');

        // Render dots
        dotsContainer.innerHTML = rooms.map((_, index) => `
            <button class="carousel__dot ${index === state.currentIndex ? 'active' : ''}"
                    data-index="${index}"
                    aria-label="Go to room ${index + 1}"
                    ${index === state.currentIndex ? 'aria-current="true"' : ''}>
            </button>
        `).join('');

        // Update slide position
        updateCarouselPosition();
        
        elements.carousel.style.display = 'block';

        // Add book button handlers
        attachBookHandlers();
    }

    function createRoomCard(room, badges = []) {
        const badgeHtml = badges.map(b => {
            if (b === 'best-value') {
                return '<span class="room-card__badge best"><i class="fas fa-crown"></i> Best Value</span>';
            }
            if (b === 'most-spacious') {
                return '<span class="room-card__badge spacious"><i class="fas fa-expand"></i> Most Spacious</span>';
            }
            return '';
        }).join('');

        return `
            <div class="room-card" data-room-id="${room.id}">
                <div class="room-card__badges">${badgeHtml}</div>
                <div class="room-card__image">
                    <img src="${room.imageUrl || '/assets/images/room-placeholder.jpg'}" 
                         alt="${room.name}"
                         loading="lazy">
                    ${!room.available ? '<div class="room-card__overlay">Unavailable</div>' : ''}
                </div>
                <div class="room-card__content">
                    <h4 class="room-card__name">${room.name}</h4>
                    <p class="room-card__type">${formatRoomType(room.type)}</p>
                    
                    <div class="room-card__features">
                        <div class="feature">
                            <i class="fas fa-user-friends"></i>
                            <span>${room.maxGuests} Guest${room.maxGuests !== 1 ? 's' : ''}</span>
                        </div>
                        ${room.sizeSqMeters ? `
                        <div class="feature">
                            <i class="fas fa-expand-arrows-alt"></i>
                            <span>${room.sizeSqMeters} m²</span>
                        </div>
                        ` : ''}
                        ${room.bedType ? `
                        <div class="feature">
                            <i class="fas fa-bed"></i>
                            <span>${room.bedType}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="room-card__scores">
                        <div class="score">
                            <div class="score-bar">
                                <div class="score-fill" style="width: ${room.valueScore}%"></div>
                            </div>
                            <span class="score-label">Value</span>
                        </div>
                        <div class="score">
                            <div class="score-bar">
                                <div class="score-fill" style="width: ${room.spaceScore}%"></div>
                            </div>
                            <span class="score-label">Space</span>
                        </div>
                        <div class="score">
                            <div class="score-bar">
                                <div class="score-fill" style="width: ${room.amenityScore}%"></div>
                            </div>
                            <span class="score-label">Amenities</span>
                        </div>
                    </div>
                    
                    ${room.amenities?.length ? `
                    <div class="room-card__amenities">
                        ${room.amenities.slice(0, 5).map(a => `<span class="amenity-tag">${a}</span>`).join('')}
                        ${room.amenities.length > 5 ? `<span class="amenity-more">+${room.amenities.length - 5}</span>` : ''}
                    </div>
                    ` : ''}
                </div>
                <div class="room-card__footer">
                    <div class="room-card__price">
                        <span class="price-amount">₹${formatPrice(room.pricePerNight)}</span>
                        <span class="price-label">/night</span>
                    </div>
                    <div class="room-card__total">
                        <span>Total: ₹${formatPrice(room.totalPrice)}</span>
                        <small>for ${state.comparisonData.nights} night${state.comparisonData.nights !== 1 ? 's' : ''}</small>
                    </div>
                    <button class="room-card__book-btn" 
                            data-room-id="${room.id}"
                            ${!room.available ? 'disabled' : ''}>
                        ${room.available ? 'Book Now' : 'Not Available'}
                    </button>
                </div>
            </div>
        `;
    }

    function renderTable() {
        const thead = elements.table.querySelector('thead');
        const tbody = elements.table.querySelector('tbody');
        const rooms = state.comparisonData.rooms;

        // Identify best values
        const bestValue = getBestValue(rooms);
        const mostSpacious = getMostSpacious(rooms);

        // Header row with room names
        thead.innerHTML = `
            <tr>
                <th class="feature-col">Features</th>
                ${rooms.map(room => `
                    <th class="room-col ${room.id === bestValue?.id ? 'best-value' : ''} ${room.id === mostSpacious?.id ? 'most-spacious' : ''}">
                        <div class="room-header">
                            ${room.id === bestValue?.id ? '<span class="badge best"><i class="fas fa-crown"></i></span>' : ''}
                            ${room.id === mostSpacious?.id ? '<span class="badge spacious"><i class="fas fa-expand"></i></span>' : ''}
                            <img src="${room.imageUrl || '/assets/images/room-placeholder.jpg'}" alt="${room.name}">
                            <h4>${room.name}</h4>
                            <span class="room-type">${formatRoomType(room.type)}</span>
                        </div>
                    </th>
                `).join('')}
            </tr>
        `;

        // Feature rows
        const features = [
            { key: 'pricePerNight', label: 'Price/Night', format: v => `₹${formatPrice(v)}` },
            { key: 'totalPrice', label: 'Total Price', format: v => `₹${formatPrice(v)}` },
            { key: 'maxGuests', label: 'Max Guests', format: v => `${v} guest${v !== 1 ? 's' : ''}` },
            { key: 'sizeSqMeters', label: 'Room Size', format: v => v ? `${v} m²` : '-' },
            { key: 'bedType', label: 'Bed Type', format: v => v || '-' },
            { key: 'valueScore', label: 'Value Score', format: v => createScoreBar(v) },
            { key: 'spaceScore', label: 'Space Score', format: v => createScoreBar(v) },
            { key: 'amenityScore', label: 'Amenity Score', format: v => createScoreBar(v) },
            { key: 'amenities', label: 'Amenities', format: v => formatAmenitiesList(v) },
            { key: 'highlights', label: 'Highlights', format: v => formatHighlights(v) }
        ];

        tbody.innerHTML = features.map(feat => `
            <tr>
                <td class="feature-label">${feat.label}</td>
                ${rooms.map(room => {
                    const value = room[feat.key];
                    const isBest = isFeatureBest(rooms, feat.key, value);
                    return `<td class="${isBest ? 'highlight' : ''}">${feat.format(value)}</td>`;
                }).join('')}
            </tr>
        `).join('');

        // Book buttons row
        tbody.innerHTML += `
            <tr class="action-row">
                <td></td>
                ${rooms.map(room => `
                    <td>
                        <button class="table-book-btn" 
                                data-room-id="${room.id}"
                                ${!room.available ? 'disabled' : ''}>
                            ${room.available ? 'Book Now' : 'Unavailable'}
                        </button>
                    </td>
                `).join('')}
            </tr>
        `;

        elements.container.querySelector('.room-comparison__table-wrapper').style.display = 'block';

        // Attach book handlers
        attachBookHandlers();
    }

    function createScoreBar(score) {
        const scoreNum = score || 0;
        let colorClass = 'low';
        if (scoreNum >= 70) colorClass = 'high';
        else if (scoreNum >= 40) colorClass = 'medium';

        return `
            <div class="score-bar-container">
                <div class="score-bar">
                    <div class="score-fill ${colorClass}" style="width: ${scoreNum}%"></div>
                </div>
                <span class="score-value">${scoreNum}</span>
            </div>
        `;
    }

    function formatAmenitiesList(amenities) {
        if (!amenities?.length) return '-';
        return `<div class="amenity-list">${amenities.slice(0, 4).map(a => 
            `<span class="amenity-chip">${a}</span>`
        ).join('')}${amenities.length > 4 ? `<span class="amenity-more">+${amenities.length - 4}</span>` : ''}</div>`;
    }

    function formatHighlights(highlights) {
        if (!highlights?.length) return '-';
        return highlights.map(h => `<span class="highlight-chip">${h}</span>`).join('');
    }

    function isFeatureBest(rooms, key, value) {
        if (key === 'pricePerNight' || key === 'totalPrice') {
            const min = Math.min(...rooms.filter(r => r[key]).map(r => r[key]));
            return value === min;
        }
        if (['sizeSqMeters', 'maxGuests', 'valueScore', 'spaceScore', 'amenityScore'].includes(key)) {
            const max = Math.max(...rooms.filter(r => r[key]).map(r => r[key]));
            return value === max;
        }
        return false;
    }

    // ==================== CAROUSEL NAVIGATION ====================

    function navigateCarousel(direction) {
        const rooms = state.comparisonData?.rooms || [];
        if (rooms.length === 0) return;

        const newIndex = state.currentIndex + direction;
        if (newIndex < 0 || newIndex >= rooms.length) return;

        goToSlide(newIndex);
    }

    function goToSlide(index) {
        state.currentIndex = index;
        updateCarouselPosition();
        updateDots();
    }

    function updateCarouselPosition() {
        const track = elements.container.querySelector('.carousel__track');
        track.style.transform = `translateX(-${state.currentIndex * 100}%)`;
    }

    function updateDots() {
        const dots = elements.container.querySelectorAll('.carousel__dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === state.currentIndex);
            dot.setAttribute('aria-current', i === state.currentIndex ? 'true' : 'false');
        });
    }

    // ==================== PUBLIC METHODS ====================

    function addRoom(roomId) {
        if (state.roomIds.length >= CONFIG.maxRooms) {
            dispatchEvent('room-comparison:max-reached', { max: CONFIG.maxRooms });
            return false;
        }

        if (state.roomIds.includes(roomId)) {
            return false;
        }

        state.roomIds.push(roomId);
        fetchComparisonData();
        dispatchEvent('room-comparison:add', { roomId, count: state.roomIds.length });
        return true;
    }

    function removeRoom(roomId) {
        const index = state.roomIds.indexOf(roomId);
        if (index === -1) return false;

        state.roomIds.splice(index, 1);
        
        if (state.roomIds.length === 0) {
            state.comparisonData = null;
            showEmpty();
        } else {
            fetchComparisonData();
        }
        
        dispatchEvent('room-comparison:remove', { roomId, count: state.roomIds.length });
        return true;
    }

    function clearAll() {
        state.roomIds = [];
        state.comparisonData = null;
        state.currentIndex = 0;
        updateCount();
        showEmpty();
        dispatchEvent('room-comparison:clear');
    }

    function setDates(checkIn, checkOut) {
        state.checkIn = checkIn;
        state.checkOut = checkOut;
        if (state.roomIds.length > 0) {
            fetchComparisonData();
        }
    }

    // ==================== HELPERS ====================

    function updateCount() {
        const countEl = elements.container.querySelector('[data-count]');
        countEl.textContent = state.roomIds.length;
    }

    function showLoading() {
        elements.container.querySelector('.room-comparison__loading').style.display = 'flex';
        elements.container.querySelector('.room-comparison__empty').style.display = 'none';
        hideCarousel();
        hideTable();
    }

    function hideLoading() {
        elements.container.querySelector('.room-comparison__loading').style.display = 'none';
    }

    function showEmpty() {
        elements.container.querySelector('.room-comparison__empty').style.display = 'flex';
        elements.container.querySelector('.room-comparison__loading').style.display = 'none';
        elements.container.querySelector('.room-comparison__footer').style.display = 'none';
        hideCarousel();
        hideTable();
    }

    function hideEmpty() {
        elements.container.querySelector('.room-comparison__empty').style.display = 'none';
    }

    function hideCarousel() {
        elements.carousel.style.display = 'none';
    }

    function hideTable() {
        elements.container.querySelector('.room-comparison__table-wrapper').style.display = 'none';
    }

    function showError() {
        elements.body.innerHTML = `
            <div class="room-comparison__error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Unable to load comparison</p>
                <button onclick="window.RoomComparison.refresh()">Try Again</button>
            </div>
        `;
    }

    function attachBookHandlers() {
        const buttons = elements.container.querySelectorAll('[data-room-id]:not([disabled])');
        buttons.forEach(btn => {
            if (btn.tagName === 'BUTTON') {
                btn.addEventListener('click', () => {
                    const roomId = btn.dataset.roomId;
                    dispatchEvent('room-comparison:book', { 
                        roomId, 
                        hotelId: state.hotelId,
                        checkIn: state.checkIn,
                        checkOut: state.checkOut
                    });
                });
            }
        });
    }

    function getBestValue(rooms) {
        if (!rooms?.length) return null;
        return rooms.reduce((best, room) => 
            (!best || room.valueScore > best.valueScore) ? room : best
        , null);
    }

    function getMostSpacious(rooms) {
        if (!rooms?.length) return null;
        return rooms.reduce((best, room) => 
            (!best || (room.sizeSqMeters || 0) > (best.sizeSqMeters || 0)) ? room : best
        , null);
    }

    function formatRoomType(type) {
        if (!type) return '';
        return type.replace(/_/g, ' ').toLowerCase()
                   .replace(/\b\w/g, c => c.toUpperCase());
    }

    function formatPrice(price) {
        return new Intl.NumberFormat('en-IN').format(price);
    }

    function formatDateISO(date) {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }

    function addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    function debounce(fn, ms) {
        let timer;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), ms);
        };
    }

    function dispatchEvent(name, detail) {
        const event = new CustomEvent(name, { detail });
        elements.container.dispatchEvent(event);
    }

    // ==================== PUBLIC API ====================

    return {
        init,
        addRoom,
        removeRoom,
        clearAll,
        setDates,
        refresh: fetchComparisonData,
        getRoomIds: () => [...state.roomIds],
        getComparisonData: () => state.comparisonData,
        isRoomSelected: (roomId) => state.roomIds.includes(roomId)
    };
})();
