/**
 * Price Calendar Module
 * Displays hotel room pricing by date with responsive layouts
 * Mobile: Vertical scroll list
 * Tablet: Week grid view
 * Desktop: Full month calendar
 * Phase 2: Smart Discovery & Responsive Interaction
 */
window.PriceCalendar = (function() {
    'use strict';

    // Configuration
    const CONFIG = {
        apiEndpoint: '/api/search/price-calendar',
        mobileBreakpoint: 768,
        tabletBreakpoint: 1024,
        defaultDays: 30,
        monthNames: ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'],
        dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        dayNamesShort: ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    };

    // State
    let state = {
        hotelId: null,
        startDate: null,
        endDate: null,
        priceData: null,
        selectedDate: null,
        currentMonth: null,
        isLoading: false,
        viewMode: 'month' // 'list', 'week', 'month'
    };

    // DOM Elements
    let elements = {
        container: null,
        header: null,
        body: null,
        legend: null
    };

    // ==================== INITIALIZATION ====================

    function init(containerSelector, hotelId, options = {}) {
        elements.container = document.querySelector(containerSelector);
        if (!elements.container) {
            console.warn('PriceCalendar: Container not found');
            return;
        }

        state.hotelId = hotelId;
        state.startDate = options.startDate || new Date();
        state.endDate = options.endDate || addDays(state.startDate, CONFIG.defaultDays);
        state.currentMonth = new Date(state.startDate);
        state.selectedDate = options.selectedDate || null;

        determineViewMode();
        createCalendarStructure();
        attachEventListeners();
        fetchPriceData();

        // Handle resize
        window.addEventListener('resize', debounce(() => {
            const oldMode = state.viewMode;
            determineViewMode();
            if (oldMode !== state.viewMode) {
                render();
            }
        }, 250));

        console.log('PriceCalendar initialized for hotel:', hotelId);
    }

    function determineViewMode() {
        const width = window.innerWidth;
        if (width < CONFIG.mobileBreakpoint) {
            state.viewMode = 'list';
        } else if (width < CONFIG.tabletBreakpoint) {
            state.viewMode = 'week';
        } else {
            state.viewMode = 'month';
        }
    }

    // ==================== UI CREATION ====================

    function createCalendarStructure() {
        elements.container.classList.add('price-calendar');
        elements.container.innerHTML = `
            <div class="price-calendar__header">
                <div class="price-calendar__nav">
                    <button class="price-calendar__nav-btn" data-action="prev" aria-label="Previous">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <h3 class="price-calendar__title"></h3>
                    <button class="price-calendar__nav-btn" data-action="next" aria-label="Next">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="price-calendar__summary">
                    <div class="price-calendar__stat">
                        <span class="label">Lowest</span>
                        <span class="value lowest" data-lowest>--</span>
                    </div>
                    <div class="price-calendar__stat">
                        <span class="label">Average</span>
                        <span class="value" data-average>--</span>
                    </div>
                    <div class="price-calendar__stat">
                        <span class="label">Highest</span>
                        <span class="value highest" data-highest>--</span>
                    </div>
                </div>
            </div>
            <div class="price-calendar__body">
                <div class="price-calendar__loading">
                    <div class="skeleton-grid">
                        ${Array(7).fill('<div class="skeleton-cell"></div>').join('')}
                    </div>
                </div>
                <div class="price-calendar__weekdays"></div>
                <div class="price-calendar__grid"></div>
                <div class="price-calendar__list"></div>
            </div>
            <div class="price-calendar__legend">
                <div class="legend-item">
                    <span class="legend-dot low"></span>
                    <span>Low price</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot medium"></span>
                    <span>Average</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot high"></span>
                    <span>High price</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot unavailable"></span>
                    <span>Unavailable</span>
                </div>
            </div>
        `;

        elements.header = elements.container.querySelector('.price-calendar__header');
        elements.body = elements.container.querySelector('.price-calendar__body');
        elements.legend = elements.container.querySelector('.price-calendar__legend');
    }

    // ==================== EVENT LISTENERS ====================

    function attachEventListeners() {
        // Navigation buttons
        elements.container.addEventListener('click', (e) => {
            const navBtn = e.target.closest('.price-calendar__nav-btn');
            if (navBtn) {
                const action = navBtn.dataset.action;
                if (action === 'prev') navigatePrev();
                else if (action === 'next') navigateNext();
            }

            // Date selection
            const dayCell = e.target.closest('.price-calendar__day:not(.unavailable):not(.empty)');
            if (dayCell && dayCell.dataset.date) {
                selectDate(dayCell.dataset.date);
            }
        });

        // Touch swipe for mobile
        let touchStartX = 0;
        let touchEndX = 0;

        elements.body.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        elements.body.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });

        function handleSwipe() {
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) navigateNext();
                else navigatePrev();
            }
        }
    }

    // ==================== API CALLS ====================

    async function fetchPriceData() {
        state.isLoading = true;
        showLoading();

        try {
            const startStr = formatDateISO(state.startDate);
            const endStr = formatDateISO(state.endDate);
            
            const response = await fetch(
                `${window.API_BASE_URL || ''}${CONFIG.apiEndpoint}/${state.hotelId}?startDate=${startStr}&endDate=${endStr}`,
                {
                    headers: { 'Accept': 'application/json' }
                }
            );

            if (!response.ok) throw new Error('Failed to fetch price data');

            state.priceData = await response.json();
            state.isLoading = false;
            render();
            updateSummary();
        } catch (error) {
            console.error('PriceCalendar: Error fetching prices', error);
            state.isLoading = false;
            showError();
        }
    }

    // ==================== RENDERING ====================

    function render() {
        if (!state.priceData) return;

        hideLoading();
        updateTitle();

        switch (state.viewMode) {
            case 'list':
                renderListView();
                break;
            case 'week':
                renderWeekView();
                break;
            case 'month':
            default:
                renderMonthView();
                break;
        }
    }

    function renderMonthView() {
        elements.container.classList.remove('view-list', 'view-week');
        elements.container.classList.add('view-month');

        // Render weekday headers
        const weekdaysHtml = CONFIG.dayNames.map(d => 
            `<div class="price-calendar__weekday">${d}</div>`
        ).join('');
        elements.body.querySelector('.price-calendar__weekdays').innerHTML = weekdaysHtml;
        elements.body.querySelector('.price-calendar__weekdays').style.display = 'grid';

        // Get days for current month
        const year = state.currentMonth.getFullYear();
        const month = state.currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startPadding = firstDay.getDay();

        let gridHtml = '';

        // Empty cells for padding
        for (let i = 0; i < startPadding; i++) {
            gridHtml += '<div class="price-calendar__day empty"></div>';
        }

        // Days of the month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(year, month, day);
            const priceInfo = getPriceForDate(date);
            gridHtml += createDayCell(date, priceInfo);
        }

        elements.body.querySelector('.price-calendar__grid').innerHTML = gridHtml;
        elements.body.querySelector('.price-calendar__grid').style.display = 'grid';
        elements.body.querySelector('.price-calendar__list').style.display = 'none';
    }

    function renderWeekView() {
        elements.container.classList.remove('view-list', 'view-month');
        elements.container.classList.add('view-week');

        // Show 2 weeks at a time
        const weekStart = getWeekStart(state.currentMonth);
        const days = [];
        
        for (let i = 0; i < 14; i++) {
            const date = addDays(weekStart, i);
            const priceInfo = getPriceForDate(date);
            days.push({ date, priceInfo });
        }

        // Weekday headers
        const weekdaysHtml = CONFIG.dayNames.map(d => 
            `<div class="price-calendar__weekday">${d}</div>`
        ).join('');
        elements.body.querySelector('.price-calendar__weekdays').innerHTML = weekdaysHtml;
        elements.body.querySelector('.price-calendar__weekdays').style.display = 'grid';

        // Grid
        let gridHtml = days.map(({ date, priceInfo }) => 
            createDayCell(date, priceInfo, 'week')
        ).join('');

        elements.body.querySelector('.price-calendar__grid').innerHTML = gridHtml;
        elements.body.querySelector('.price-calendar__grid').style.display = 'grid';
        elements.body.querySelector('.price-calendar__list').style.display = 'none';
    }

    function renderListView() {
        elements.container.classList.remove('view-month', 'view-week');
        elements.container.classList.add('view-list');

        elements.body.querySelector('.price-calendar__weekdays').style.display = 'none';
        elements.body.querySelector('.price-calendar__grid').style.display = 'none';

        // Show next 14 days as scrollable list
        const listStart = state.currentMonth;
        const days = [];
        
        for (let i = 0; i < 14; i++) {
            const date = addDays(listStart, i);
            const priceInfo = getPriceForDate(date);
            days.push({ date, priceInfo });
        }

        const listHtml = days.map(({ date, priceInfo }) => {
            const isSelected = state.selectedDate && 
                               formatDateISO(date) === formatDateISO(state.selectedDate);
            const tier = priceInfo?.priceTier || 'unavailable';
            const available = priceInfo?.available !== false;

            return `
                <div class="price-calendar__list-item ${tier} ${!available ? 'unavailable' : ''} ${isSelected ? 'selected' : ''}"
                     data-date="${formatDateISO(date)}">
                    <div class="list-item__date">
                        <span class="day-name">${CONFIG.dayNames[date.getDay()]}</span>
                        <span class="day-num">${date.getDate()}</span>
                        <span class="month">${CONFIG.monthNames[date.getMonth()].slice(0, 3)}</span>
                    </div>
                    <div class="list-item__info">
                        ${available ? `
                            <span class="price">₹${formatPrice(priceInfo.price)}</span>
                            <span class="rooms">${priceInfo.availableRooms} room${priceInfo.availableRooms !== 1 ? 's' : ''} left</span>
                        ` : `
                            <span class="unavailable-text">Sold out</span>
                        `}
                    </div>
                    <div class="list-item__indicator ${tier}"></div>
                </div>
            `;
        }).join('');

        elements.body.querySelector('.price-calendar__list').innerHTML = listHtml;
        elements.body.querySelector('.price-calendar__list').style.display = 'flex';
    }

    function createDayCell(date, priceInfo, mode = 'month') {
        const isToday = isDateToday(date);
        const isSelected = state.selectedDate && 
                           formatDateISO(date) === formatDateISO(state.selectedDate);
        const isPast = date < new Date().setHours(0, 0, 0, 0);
        const tier = priceInfo?.priceTier || 'unavailable';
        const available = priceInfo?.available !== false;
        const isWeekend = priceInfo?.isWeekend || date.getDay() === 0 || date.getDay() === 6;

        const classes = [
            'price-calendar__day',
            tier,
            isToday ? 'today' : '',
            isSelected ? 'selected' : '',
            isPast ? 'past' : '',
            !available ? 'unavailable' : '',
            isWeekend ? 'weekend' : ''
        ].filter(Boolean).join(' ');

        if (mode === 'week') {
            return `
                <div class="${classes}" data-date="${formatDateISO(date)}">
                    <span class="day-number">${date.getDate()}</span>
                    ${available ? `
                        <span class="day-price">₹${formatPrice(priceInfo.price)}</span>
                    ` : `
                        <span class="day-price soldout">--</span>
                    `}
                </div>
            `;
        }

        return `
            <div class="${classes}" data-date="${formatDateISO(date)}">
                <span class="day-number">${date.getDate()}</span>
                ${available && priceInfo ? `
                    <span class="day-price">₹${formatPriceShort(priceInfo.price)}</span>
                ` : ''}
            </div>
        `;
    }

    // ==================== NAVIGATION ====================

    function navigatePrev() {
        if (state.viewMode === 'month') {
            state.currentMonth = new Date(
                state.currentMonth.getFullYear(),
                state.currentMonth.getMonth() - 1,
                1
            );
        } else {
            // Go back 1 or 2 weeks
            const days = state.viewMode === 'week' ? 14 : 7;
            state.currentMonth = addDays(state.currentMonth, -days);
        }
        render();
    }

    function navigateNext() {
        if (state.viewMode === 'month') {
            state.currentMonth = new Date(
                state.currentMonth.getFullYear(),
                state.currentMonth.getMonth() + 1,
                1
            );
        } else {
            const days = state.viewMode === 'week' ? 14 : 7;
            state.currentMonth = addDays(state.currentMonth, days);
        }
        render();
    }

    function selectDate(dateStr) {
        state.selectedDate = new Date(dateStr);
        render();

        // Dispatch event for parent components
        const event = new CustomEvent('price-calendar:select', {
            detail: {
                date: state.selectedDate,
                priceInfo: getPriceForDate(state.selectedDate)
            }
        });
        elements.container.dispatchEvent(event);
    }

    // ==================== HELPERS ====================

    function getPriceForDate(date) {
        if (!state.priceData?.prices) return null;
        
        const dateStr = formatDateISO(date);
        return state.priceData.prices.find(p => p.date === dateStr);
    }

    function updateTitle() {
        const titleEl = elements.container.querySelector('.price-calendar__title');
        
        if (state.viewMode === 'month') {
            titleEl.textContent = `${CONFIG.monthNames[state.currentMonth.getMonth()]} ${state.currentMonth.getFullYear()}`;
        } else {
            const endDate = addDays(state.currentMonth, state.viewMode === 'week' ? 13 : 6);
            titleEl.textContent = `${formatDateShort(state.currentMonth)} - ${formatDateShort(endDate)}`;
        }
    }

    function updateSummary() {
        if (!state.priceData) return;

        const lowestEl = elements.container.querySelector('[data-lowest]');
        const avgEl = elements.container.querySelector('[data-average]');
        const highestEl = elements.container.querySelector('[data-highest]');

        if (state.priceData.lowestPrice) {
            lowestEl.textContent = `₹${formatPrice(state.priceData.lowestPrice)}`;
        }
        if (state.priceData.averagePrice) {
            avgEl.textContent = `₹${formatPrice(state.priceData.averagePrice)}`;
        }
        if (state.priceData.highestPrice) {
            highestEl.textContent = `₹${formatPrice(state.priceData.highestPrice)}`;
        }
    }

    function showLoading() {
        elements.body.querySelector('.price-calendar__loading').style.display = 'block';
        elements.body.querySelector('.price-calendar__grid').style.display = 'none';
        elements.body.querySelector('.price-calendar__list').style.display = 'none';
    }

    function hideLoading() {
        elements.body.querySelector('.price-calendar__loading').style.display = 'none';
    }

    function showError() {
        elements.body.innerHTML = `
            <div class="price-calendar__error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Unable to load prices</p>
                <button onclick="window.PriceCalendar.refresh()">Try Again</button>
            </div>
        `;
    }

    // ==================== UTILITIES ====================

    function addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    function getWeekStart(date) {
        const result = new Date(date);
        const day = result.getDay();
        result.setDate(result.getDate() - day);
        return result;
    }

    function formatDateISO(date) {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }

    function formatDateShort(date) {
        return `${CONFIG.monthNames[date.getMonth()].slice(0, 3)} ${date.getDate()}`;
    }

    function formatPrice(price) {
        return new Intl.NumberFormat('en-IN').format(price);
    }

    function formatPriceShort(price) {
        if (price >= 1000) {
            return (price / 1000).toFixed(price % 1000 === 0 ? 0 : 1) + 'k';
        }
        return price.toString();
    }

    function isDateToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    function debounce(fn, ms) {
        let timer;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), ms);
        };
    }

    // ==================== PUBLIC API ====================

    return {
        init,
        refresh: fetchPriceData,
        navigatePrev,
        navigateNext,
        selectDate,
        getSelectedDate: () => state.selectedDate,
        getPriceData: () => state.priceData
    };
})();
