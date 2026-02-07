/**
 * Smart Search Module
 * Provides autocomplete with mobile modal / desktop dropdown
 * Phase 2: Smart Discovery & Responsive Interaction
 */
window.SmartSearch = (function() {
    'use strict';

    // Configuration
    const CONFIG = {
        debounceMs: 300,
        minQueryLength: 2,
        maxSuggestions: 8,
        apiEndpoint: '/api/search',
        mobileBreakpoint: 768
    };

    // State
    let state = {
        query: '',
        suggestions: null,
        selectedIndex: -1,
        isOpen: false,
        isLoading: false,
        recentSearches: [],
        debounceTimer: null
    };

    // DOM Elements (cached)
    let elements = {
        searchInput: null,
        searchContainer: null,
        dropdown: null,
        modal: null,
        modalInput: null,
        modalResults: null,
        overlay: null
    };

    // ==================== INITIALIZATION ====================

    function init(inputSelector = '#search-input') {
        elements.searchInput = document.querySelector(inputSelector);
        if (!elements.searchInput) {
            console.warn('SmartSearch: Input element not found');
            return;
        }

        elements.searchContainer = elements.searchInput.closest('.search-container') || 
                                   elements.searchInput.parentElement;

        loadRecentSearches();
        createDropdown();
        createMobileModal();
        attachEventListeners();
        
        console.log('SmartSearch initialized');
    }

    // ==================== UI CREATION ====================

    function createDropdown() {
        elements.dropdown = document.createElement('div');
        elements.dropdown.className = 'smart-search-dropdown';
        elements.dropdown.setAttribute('role', 'listbox');
        elements.dropdown.setAttribute('aria-label', 'Search suggestions');
        elements.dropdown.innerHTML = `
            <div class="smart-search-dropdown__loading">
                <div class="skeleton-pulse"></div>
            </div>
            <div class="smart-search-dropdown__content"></div>
            <div class="smart-search-dropdown__empty">
                <i class="fas fa-search"></i>
                <span>No results found</span>
            </div>
        `;
        elements.searchContainer.appendChild(elements.dropdown);
    }

    function createMobileModal() {
        elements.modal = document.createElement('div');
        elements.modal.className = 'smart-search-modal';
        elements.modal.setAttribute('role', 'dialog');
        elements.modal.setAttribute('aria-modal', 'true');
        elements.modal.setAttribute('aria-label', 'Search');
        elements.modal.innerHTML = `
            <div class="smart-search-modal__header">
                <button class="smart-search-modal__close" aria-label="Close search">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <div class="smart-search-modal__input-wrapper">
                    <i class="fas fa-search"></i>
                    <input 
                        type="text" 
                        class="smart-search-modal__input" 
                        placeholder="Search hotels, cities, destinations..."
                        autocomplete="off"
                        spellcheck="false"
                    >
                    <button class="smart-search-modal__clear" aria-label="Clear search">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="smart-search-modal__body">
                <div class="smart-search-modal__loading">
                    <div class="skeleton-item"></div>
                    <div class="skeleton-item"></div>
                    <div class="skeleton-item"></div>
                </div>
                <div class="smart-search-modal__results"></div>
                <div class="smart-search-modal__recent">
                    <h4>Recent Searches</h4>
                    <div class="recent-list"></div>
                </div>
                <div class="smart-search-modal__popular">
                    <h4>Popular Destinations</h4>
                    <div class="popular-list"></div>
                </div>
            </div>
        `;
        document.body.appendChild(elements.modal);

        elements.modalInput = elements.modal.querySelector('.smart-search-modal__input');
        elements.modalResults = elements.modal.querySelector('.smart-search-modal__results');
    }

    // ==================== EVENT LISTENERS ====================

    function attachEventListeners() {
        // Desktop input events
        elements.searchInput.addEventListener('focus', handleInputFocus);
        elements.searchInput.addEventListener('input', handleInputChange);
        elements.searchInput.addEventListener('keydown', handleKeyDown);

        // Click outside to close dropdown
        document.addEventListener('click', handleClickOutside);

        // Mobile modal events
        const closeBtn = elements.modal.querySelector('.smart-search-modal__close');
        const clearBtn = elements.modal.querySelector('.smart-search-modal__clear');
        
        closeBtn.addEventListener('click', closeMobileModal);
        clearBtn.addEventListener('click', () => {
            elements.modalInput.value = '';
            state.query = '';
            showPopularSearches();
        });

        elements.modalInput.addEventListener('input', handleModalInputChange);
        elements.modalInput.addEventListener('keydown', handleKeyDown);

        // Responsive: Open modal on mobile, dropdown on desktop
        elements.searchInput.addEventListener('click', (e) => {
            if (isMobile()) {
                e.preventDefault();
                openMobileModal();
            }
        });

        // Handle window resize
        window.addEventListener('resize', debounce(() => {
            if (!isMobile() && elements.modal.classList.contains('open')) {
                closeMobileModal();
            }
        }, 250));
    }

    // ==================== INPUT HANDLERS ====================

    function handleInputFocus() {
        if (isMobile()) return;
        
        if (state.query.length >= CONFIG.minQueryLength) {
            openDropdown();
        } else {
            fetchPopularSearches();
        }
    }

    function handleInputChange(e) {
        const query = e.target.value.trim();
        state.query = query;

        clearTimeout(state.debounceTimer);

        if (query.length < CONFIG.minQueryLength) {
            if (query.length === 0) {
                fetchPopularSearches();
            } else {
                hideDropdown();
            }
            return;
        }

        state.isLoading = true;
        showLoading();
        openDropdown();

        state.debounceTimer = setTimeout(() => {
            fetchSuggestions(query);
        }, CONFIG.debounceMs);
    }

    function handleModalInputChange(e) {
        const query = e.target.value.trim();
        state.query = query;

        clearTimeout(state.debounceTimer);

        const clearBtn = elements.modal.querySelector('.smart-search-modal__clear');
        clearBtn.style.display = query ? 'flex' : 'none';

        if (query.length < CONFIG.minQueryLength) {
            if (query.length === 0) {
                showPopularSearches();
            }
            return;
        }

        state.isLoading = true;
        showModalLoading();

        state.debounceTimer = setTimeout(() => {
            fetchSuggestions(query, true);
        }, CONFIG.debounceMs);
    }

    function handleKeyDown(e) {
        if (!state.isOpen) return;

        const items = getCurrentItems();
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                state.selectedIndex = Math.min(state.selectedIndex + 1, items.length - 1);
                updateSelection(items);
                break;
            case 'ArrowUp':
                e.preventDefault();
                state.selectedIndex = Math.max(state.selectedIndex - 1, -1);
                updateSelection(items);
                break;
            case 'Enter':
                e.preventDefault();
                if (state.selectedIndex >= 0 && items[state.selectedIndex]) {
                    selectItem(items[state.selectedIndex]);
                } else if (state.query) {
                    performSearch(state.query);
                }
                break;
            case 'Escape':
                e.preventDefault();
                if (isMobile()) {
                    closeMobileModal();
                } else {
                    hideDropdown();
                }
                break;
        }
    }

    function handleClickOutside(e) {
        if (isMobile()) return;
        
        if (!elements.searchContainer.contains(e.target) && 
            !elements.dropdown.contains(e.target)) {
            hideDropdown();
        }
    }

    // ==================== API CALLS ====================

    async function fetchSuggestions(query, isModal = false) {
        try {
            const response = await fetch(
                `${window.API_BASE_URL || ''}${CONFIG.apiEndpoint}/suggestions?query=${encodeURIComponent(query)}&limit=${CONFIG.maxSuggestions}`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) throw new Error('Failed to fetch suggestions');

            const data = await response.json();
            state.suggestions = data;
            state.isLoading = false;

            if (isModal) {
                renderModalSuggestions(data);
            } else {
                renderDropdownSuggestions(data);
            }
        } catch (error) {
            console.error('SmartSearch: Error fetching suggestions', error);
            state.isLoading = false;
            showNoResults(isModal);
        }
    }

    async function fetchPopularSearches() {
        try {
            const response = await fetch(
                `${window.API_BASE_URL || ''}${CONFIG.apiEndpoint}/popular`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) throw new Error('Failed to fetch popular searches');

            const data = await response.json();
            state.suggestions = data;
            renderDropdownSuggestions(data, true);
            openDropdown();
        } catch (error) {
            console.error('SmartSearch: Error fetching popular', error);
        }
    }

    // ==================== RENDERING ====================

    function renderDropdownSuggestions(data, isPopular = false) {
        const content = elements.dropdown.querySelector('.smart-search-dropdown__content');
        content.innerHTML = '';

        const hasResults = data.hotels?.length || data.cities?.length || data.destinations?.length;
        
        elements.dropdown.classList.toggle('no-results', !hasResults);
        elements.dropdown.classList.remove('loading');

        if (!hasResults) return;

        // Hotels section
        if (data.hotels?.length) {
            content.appendChild(createSection('Hotels', data.hotels, 'hotel'));
        }

        // Cities section
        if (data.cities?.length) {
            content.appendChild(createSection('Locations', data.cities, 'city'));
        }

        // Destinations section
        if (data.destinations?.length) {
            content.appendChild(createSection(isPopular ? 'Popular Destinations' : 'Destinations', 
                                              data.destinations, 'destination'));
        }

        state.selectedIndex = -1;
    }

    function createSection(title, items, type) {
        const section = document.createElement('div');
        section.className = 'smart-search-section';
        section.innerHTML = `<div class="smart-search-section__title">${title}</div>`;

        const list = document.createElement('ul');
        list.className = 'smart-search-section__list';

        items.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'smart-search-item';
            li.setAttribute('role', 'option');
            li.dataset.type = type;
            li.dataset.value = JSON.stringify(item);

            li.innerHTML = getItemHTML(item, type);
            li.addEventListener('click', () => selectItem(li));
            li.addEventListener('mouseenter', () => {
                state.selectedIndex = index;
                updateSelection(document.querySelectorAll('.smart-search-item'));
            });

            list.appendChild(li);
        });

        section.appendChild(list);
        return section;
    }

    function getItemHTML(item, type) {
        const icons = {
            hotel: 'fa-hotel',
            city: 'fa-map-marker-alt',
            destination: 'fa-compass'
        };

        switch (type) {
            case 'hotel':
                return `
                    <div class="smart-search-item__icon">
                        <i class="fas ${icons.hotel}"></i>
                    </div>
                    <div class="smart-search-item__content">
                        <span class="smart-search-item__title">${highlightMatch(item.name)}</span>
                        <span class="smart-search-item__subtitle">${item.city}${item.country ? ', ' + item.country : ''}</span>
                    </div>
                    <div class="smart-search-item__meta">
                        ${item.starRating ? `<span class="stars">${'★'.repeat(item.starRating)}</span>` : ''}
                        ${item.minPrice ? `<span class="price">From ₹${formatPrice(item.minPrice)}</span>` : ''}
                    </div>
                `;
            case 'city':
                return `
                    <div class="smart-search-item__icon">
                        <i class="fas ${icons.city}"></i>
                    </div>
                    <div class="smart-search-item__content">
                        <span class="smart-search-item__title">${highlightMatch(item.name)}</span>
                        <span class="smart-search-item__subtitle">${item.country || item.type}</span>
                    </div>
                    <div class="smart-search-item__meta">
                        <span class="count">${item.hotelCount} hotel${item.hotelCount !== 1 ? 's' : ''}</span>
                    </div>
                `;
            case 'destination':
                return `
                    <div class="smart-search-item__icon ${item.type}">
                        <i class="fas ${getDestinationIcon(item.type)}"></i>
                    </div>
                    <div class="smart-search-item__content">
                        <span class="smart-search-item__title">${highlightMatch(item.name)}</span>
                        <span class="smart-search-item__subtitle">${item.description || ''}</span>
                    </div>
                    ${item.hotelCount ? `
                    <div class="smart-search-item__meta">
                        <span class="count">${item.hotelCount} hotels</span>
                    </div>` : ''}
                `;
        }
    }

    function getDestinationIcon(type) {
        const icons = {
            city: 'fa-city',
            beach: 'fa-umbrella-beach',
            mountain: 'fa-mountain',
            heritage: 'fa-landmark'
        };
        return icons[type] || 'fa-compass';
    }

    function renderModalSuggestions(data) {
        hideModalLoading();
        elements.modalResults.innerHTML = '';

        const hasResults = data.hotels?.length || data.cities?.length || data.destinations?.length;
        
        if (!hasResults) {
            elements.modalResults.innerHTML = `
                <div class="smart-search-modal__empty">
                    <i class="fas fa-search"></i>
                    <p>No results found for "${state.query}"</p>
                    <span>Try a different search term</span>
                </div>
            `;
            return;
        }

        // Hotels
        if (data.hotels?.length) {
            const section = createMobileSection('Hotels', data.hotels, 'hotel');
            elements.modalResults.appendChild(section);
        }

        // Cities
        if (data.cities?.length) {
            const section = createMobileSection('Locations', data.cities, 'city');
            elements.modalResults.appendChild(section);
        }

        // Destinations
        if (data.destinations?.length) {
            const section = createMobileSection('Destinations', data.destinations, 'destination');
            elements.modalResults.appendChild(section);
        }

        // Show results, hide popular
        elements.modal.querySelector('.smart-search-modal__popular').style.display = 'none';
        elements.modal.querySelector('.smart-search-modal__recent').style.display = 'none';
    }

    function createMobileSection(title, items, type) {
        const section = document.createElement('div');
        section.className = 'smart-search-modal__section';
        section.innerHTML = `<h5>${title}</h5>`;

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'smart-search-modal__item';
            div.dataset.type = type;
            div.dataset.value = JSON.stringify(item);
            div.innerHTML = getItemHTML(item, type);
            div.addEventListener('click', () => selectItem(div));
            section.appendChild(div);
        });

        return section;
    }

    // ==================== SELECTION & NAVIGATION ====================

    function selectItem(element) {
        const type = element.dataset.type;
        const data = JSON.parse(element.dataset.value);

        // Save to recent searches
        saveRecentSearch(type, data);

        // Navigate based on type
        switch (type) {
            case 'hotel':
                window.location.href = `/hotel-detail.html?id=${data.id}`;
                break;
            case 'city':
            case 'destination':
                performSearch(data.name);
                break;
        }
    }

    function performSearch(query) {
        saveRecentSearch('query', { query });
        
        // Navigate to hotels page with search
        const params = new URLSearchParams({ search: query });
        window.location.href = `/hotels.html?${params.toString()}`;
    }

    function updateSelection(items) {
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === state.selectedIndex);
            if (i === state.selectedIndex) {
                item.scrollIntoView({ block: 'nearest' });
            }
        });
    }

    function getCurrentItems() {
        if (isMobile() && elements.modal.classList.contains('open')) {
            return elements.modalResults.querySelectorAll('.smart-search-modal__item');
        }
        return elements.dropdown.querySelectorAll('.smart-search-item');
    }

    // ==================== MODAL CONTROLS ====================

    function openMobileModal() {
        elements.modal.classList.add('open');
        document.body.style.overflow = 'hidden';
        state.isOpen = true;

        // Focus input after animation
        setTimeout(() => {
            elements.modalInput.focus();
            elements.modalInput.value = state.query || '';
        }, 100);

        // Show recent and popular
        showRecentSearches();
        fetchPopularForModal();
    }

    function closeMobileModal() {
        elements.modal.classList.remove('open');
        document.body.style.overflow = '';
        state.isOpen = false;
        elements.modalInput.blur();
    }

    async function fetchPopularForModal() {
        try {
            const response = await fetch(
                `${window.API_BASE_URL || ''}${CONFIG.apiEndpoint}/popular`
            );
            if (!response.ok) return;

            const data = await response.json();
            const popularList = elements.modal.querySelector('.popular-list');
            popularList.innerHTML = '';

            if (data.destinations?.length) {
                data.destinations.forEach(dest => {
                    const chip = document.createElement('button');
                    chip.className = 'smart-search-chip';
                    chip.innerHTML = `<i class="fas ${getDestinationIcon(dest.type)}"></i> ${dest.name}`;
                    chip.addEventListener('click', () => {
                        elements.modalInput.value = dest.name;
                        handleModalInputChange({ target: elements.modalInput });
                    });
                    popularList.appendChild(chip);
                });
            }
        } catch (error) {
            console.error('SmartSearch: Error fetching popular for modal', error);
        }
    }

    function showPopularSearches() {
        elements.modal.querySelector('.smart-search-modal__results').innerHTML = '';
        elements.modal.querySelector('.smart-search-modal__popular').style.display = 'block';
        elements.modal.querySelector('.smart-search-modal__recent').style.display = 
            state.recentSearches.length ? 'block' : 'none';
    }

    // ==================== DROPDOWN CONTROLS ====================

    function openDropdown() {
        if (isMobile()) return;
        elements.dropdown.classList.add('open');
        state.isOpen = true;
    }

    function hideDropdown() {
        elements.dropdown.classList.remove('open');
        state.isOpen = false;
        state.selectedIndex = -1;
    }

    function showLoading() {
        elements.dropdown.classList.add('loading');
        elements.dropdown.classList.remove('no-results');
    }

    function showModalLoading() {
        elements.modal.querySelector('.smart-search-modal__loading').style.display = 'block';
        elements.modal.querySelector('.smart-search-modal__results').innerHTML = '';
    }

    function hideModalLoading() {
        elements.modal.querySelector('.smart-search-modal__loading').style.display = 'none';
    }

    function showNoResults(isModal = false) {
        if (isModal) {
            elements.modalResults.innerHTML = `
                <div class="smart-search-modal__empty">
                    <i class="fas fa-search"></i>
                    <p>No results found</p>
                </div>
            `;
        } else {
            elements.dropdown.classList.add('no-results');
            elements.dropdown.classList.remove('loading');
        }
    }

    // ==================== RECENT SEARCHES ====================

    function loadRecentSearches() {
        try {
            const stored = localStorage.getItem('luxe_recent_searches');
            state.recentSearches = stored ? JSON.parse(stored) : [];
        } catch (e) {
            state.recentSearches = [];
        }
    }

    function saveRecentSearch(type, data) {
        const entry = { type, data, timestamp: Date.now() };
        
        // Remove duplicates
        state.recentSearches = state.recentSearches.filter(r => {
            if (type === 'hotel') return r.data?.id !== data.id;
            if (type === 'query') return r.data?.query !== data.query;
            return r.data?.name !== data.name;
        });

        // Add to beginning, limit to 5
        state.recentSearches.unshift(entry);
        state.recentSearches = state.recentSearches.slice(0, 5);

        try {
            localStorage.setItem('luxe_recent_searches', JSON.stringify(state.recentSearches));
        } catch (e) {
            console.warn('SmartSearch: Could not save recent searches');
        }
    }

    function showRecentSearches() {
        const recentList = elements.modal.querySelector('.recent-list');
        recentList.innerHTML = '';

        if (!state.recentSearches.length) {
            elements.modal.querySelector('.smart-search-modal__recent').style.display = 'none';
            return;
        }

        elements.modal.querySelector('.smart-search-modal__recent').style.display = 'block';

        state.recentSearches.forEach(recent => {
            const item = document.createElement('button');
            item.className = 'smart-search-recent-item';
            
            let icon = 'fa-clock';
            let text = '';
            
            if (recent.type === 'hotel') {
                icon = 'fa-hotel';
                text = recent.data.name;
            } else if (recent.type === 'query') {
                text = recent.data.query;
            } else {
                icon = 'fa-map-marker-alt';
                text = recent.data.name;
            }

            item.innerHTML = `<i class="fas ${icon}"></i> ${text}`;
            item.addEventListener('click', () => {
                if (recent.type === 'hotel') {
                    window.location.href = `/hotel-detail.html?id=${recent.data.id}`;
                } else {
                    elements.modalInput.value = text;
                    handleModalInputChange({ target: elements.modalInput });
                }
            });
            recentList.appendChild(item);
        });
    }

    // ==================== UTILITIES ====================

    function isMobile() {
        return window.innerWidth < CONFIG.mobileBreakpoint;
    }

    function highlightMatch(text) {
        if (!state.query || state.query.length < CONFIG.minQueryLength) return text;
        
        const regex = new RegExp(`(${escapeRegExp(state.query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function formatPrice(price) {
        return new Intl.NumberFormat('en-IN').format(price);
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
        openMobileModal,
        closeMobileModal,
        performSearch,
        getRecentSearches: () => [...state.recentSearches]
    };
})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize if search input exists
    const searchInput = document.querySelector('#search-input, .hero-search input, [data-smart-search]');
    if (searchInput) {
        searchInput.id = searchInput.id || 'search-input';
        window.SmartSearch.init('#' + searchInput.id);
    }
});
