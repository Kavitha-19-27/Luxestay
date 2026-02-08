/**
 * LuxeStay Map Module - Production-Ready Hotel Map Search System
 * 
 * ARCHITECTURE:
 * - Single source of truth: map center & bounds
 * - Search resolves to lat/lng, then moves map
 * - Map movement triggers hotel fetch (debounced)
 * - Sidebar list, markers, and map are ALWAYS in sync
 * 
 * DATA FLOW:
 * 1. User action (search/pan/zoom/quick location)
 * 2. Map moves to new location
 * 3. moveend event fires (debounced 350ms)
 * 4. Fetch hotels in bounds from /api/hotels/map/bounds
 * 5. Update markers + sidebar list simultaneously
 * 
 * PERFORMANCE:
 * - Debounce all map movements (350ms)
 * - Cache bounds results in sessionStorage (5 min TTL)
 * - Cache search results in memory
 * - LayerGroup for O(1) marker operations
 * - No DOM recreation loops
 */

(function() {
    'use strict';

    // ==================== CONFIGURATION ====================
    const MAP_CONFIG = {
        API_BASE: (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : 'https://luxestay-backend-1.onrender.com/api',
        
        // Map settings
        INITIAL_CENTER: [20.5937, 78.9629],  // India center - most hotels are here
        INITIAL_ZOOM: 5,
        MIN_ZOOM: 2,
        MAX_ZOOM: 18,
        FLY_DURATION: 1.2,  // Smooth animation duration in seconds
        
        // Debounce delays (ms)
        BOUNDS_FETCH_DELAY: 350,
        SEARCH_INPUT_DELAY: 300,
        SIDEBAR_SCROLL_DELAY: 100,
        
        // Cache settings
        CACHE_TTL: 5 * 60 * 1000,  // 5 minutes
        CACHE_KEY_PREFIX: 'luxestay_map_',
        
        // Tile layer
        TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        TILE_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    };

    // ==================== STATE MANAGEMENT ====================
    // Single source of truth - all state in one object
    const state = {
        map: null,
        markerLayer: null,
        markers: new Map(),  // hotel.id -> marker reference for O(1) lookup
        
        // Hotel data
        visibleHotels: [],   // Hotels currently visible on map (from bounds query)
        searchResults: [],   // Search dropdown results (cached)
        
        // Filters
        starFilter: 'all',
        
        // UI state
        isLoading: false,
        selectedHotelId: null,
        searchDropdownOpen: false,
        
        // Cache
        searchCache: new Map(),  // query -> {results, timestamp}
        boundsCache: null        // Uses sessionStorage
    };

    // ==================== MAP NAVIGATION STATE ====================
    // CRITICAL: Prevents duplicate animations and ensures single source of truth
    const mapState = {
        isAnimating: false,           // Prevents concurrent flyTo() calls
        currentTarget: null,          // { lat, lng, hotelId, zoom } - where we're navigating
        lastBoundsKey: null,          // Prevents duplicate bounds fetches
        programmaticMove: false       // Distinguishes user pan vs our flyTo
    };

    // ==================== DOM REFERENCES ====================
    const dom = {};

    function cacheDOM() {
        dom.mapContainer = document.getElementById('hotelMap');
        dom.loading = document.getElementById('mapLoading');
        dom.hotelCount = document.getElementById('hotelCount');
        
        // Search elements
        dom.searchInput = document.getElementById('mapSearch');
        dom.searchDropdown = document.getElementById('searchDropdown');
        dom.searchClear = document.getElementById('searchClear');
        
        // Filters
        dom.starButtons = document.querySelectorAll('.star-btn');
        dom.locationChips = document.querySelectorAll('.location-chip');
        
        // Sidebar hotel list
        dom.hotelList = document.getElementById('hotelList');
        dom.noResults = document.getElementById('noResults');
    }

    // ==================== INITIALIZATION ====================
    async function init() {
        cacheDOM();
        initMap();
        bindEvents();
        
        // Load initial hotels for India region
        showLoading();
        
        // Set initial bounds key to prevent duplicate fetch on first moveend
        mapState.lastBoundsKey = getBoundsKey();
        
        await fetchHotelsInBounds();
        hideLoading();
    }

    function initMap() {
        // Map is initialized ONCE - never re-create
        if (state.map) return;

        state.map = L.map('hotelMap', {
            center: MAP_CONFIG.INITIAL_CENTER,
            zoom: MAP_CONFIG.INITIAL_ZOOM,
            minZoom: MAP_CONFIG.MIN_ZOOM,
            maxZoom: MAP_CONFIG.MAX_ZOOM,
            zoomControl: true,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            dragging: true,
            // Smooth animations
            zoomAnimation: true,
            fadeAnimation: true,
            markerZoomAnimation: true
        });

        // Add tile layer
        L.tileLayer(MAP_CONFIG.TILE_URL, {
            attribution: MAP_CONFIG.TILE_ATTRIBUTION,
            maxZoom: MAP_CONFIG.MAX_ZOOM
        }).addTo(state.map);

        // Create single LayerGroup for all markers - efficient add/remove
        state.markerLayer = L.layerGroup().addTo(state.map);

        // Position zoom control
        state.map.zoomControl.setPosition('topright');
    }

    // ==================== EVENT BINDING ====================
    function bindEvents() {
        // MAP EVENTS - Single source of truth
        // All map movements trigger hotel fetch via moveend
        state.map.on('moveend', debounce(handleMapMoveEnd, MAP_CONFIG.BOUNDS_FETCH_DELAY));

        // SEARCH EVENTS
        if (dom.searchInput) {
            dom.searchInput.addEventListener('input', debounce(handleSearchInput, MAP_CONFIG.SEARCH_INPUT_DELAY));
            dom.searchInput.addEventListener('focus', handleSearchFocus);
            dom.searchInput.addEventListener('keydown', handleSearchKeydown);
        }
        
        if (dom.searchClear) {
            dom.searchClear.addEventListener('click', handleSearchClear);
        }

        // Close search dropdown on outside click
        document.addEventListener('click', handleDocumentClick);

        // STAR FILTER EVENTS
        dom.starButtons.forEach(btn => {
            btn.addEventListener('click', handleStarFilter);
        });

        // QUICK LOCATION EVENTS
        // These use the SAME logic as search - flyTo triggers moveend which fetches hotels
        dom.locationChips.forEach(chip => {
            chip.addEventListener('click', handleQuickLocation);
        });
    }

    // ==================== MAP EVENT HANDLERS ====================
    async function handleMapMoveEnd() {
        // CRITICAL FIX: This handler must ONLY fetch data, NEVER navigate
        
        // Clear animation lock (flyTo completed)
        mapState.isAnimating = false;
        
        // Check if bounds actually changed (prevent spam)
        const boundsKey = getBoundsKey();
        if (boundsKey === mapState.lastBoundsKey) {
            return; // Same bounds, no need to refetch
        }
        mapState.lastBoundsKey = boundsKey;
        
        // Fetch hotels in new viewport
        await fetchHotelsInBounds();
    }
    
    function getBoundsKey() {
        if (!state.map) return null;
        const bounds = state.map.getBounds();
        // Round to 4 decimals to avoid micro-movement triggers
        return [
            bounds.getSouth().toFixed(4),
            bounds.getNorth().toFixed(4),
            bounds.getWest().toFixed(4),
            bounds.getEast().toFixed(4)
        ].join('_');
    }

    // ==================== SEARCH HANDLERS ====================
    async function handleSearchInput(e) {
        const query = e.target.value.trim();
        
        // Show/hide clear button (immediate feedback)
        if (dom.searchClear) {
            dom.searchClear.style.display = query ? 'block' : 'none';
        }
        
        if (query.length < 2) {
            hideSearchDropdown();
            return;
        }

        // Check cache first (instant results)
        const cached = getSearchCache(query);
        if (cached) {
            displaySearchResults(cached);
            return;
        }

        // Fetch from API
        try {
            const response = await fetch(`${MAP_CONFIG.API_BASE}/hotels/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Search failed');
            
            const data = await response.json();
            // API returns { success: true, data: [...] }
            const hotels = data.data || data || [];
            
            // Filter to only hotels with coordinates (required for map)
            const validHotels = hotels.filter(h => h.latitude && h.longitude);
            
            // Cache results
            setSearchCache(query, validHotels);
            
            displaySearchResults(validHotels);
        } catch (error) {
            console.error('Search error:', error);
            hideSearchDropdown();
        }
    }

    function handleSearchFocus(e) {
        // FIX: Show cached results immediately on focus if query is valid
        const query = dom.searchInput?.value.trim() || '';
        if (query.length >= 2) {
            const cached = getSearchCache(query);
            if (cached && cached.length > 0) {
                displaySearchResults(cached);
            }
        }
    }

    function handleSearchKeydown(e) {
        // FIX: Only handle navigation keys when dropdown is open
        if (!state.searchDropdownOpen) {
            // Allow Escape to clear search even when dropdown is closed
            if (e.key === 'Escape' && dom.searchInput.value) {
                handleSearchClear(e);
            }
            return;
        }
        
        const items = dom.searchDropdown?.querySelectorAll('.search-result-item');
        if (!items || items.length === 0) return;
        
        let activeIndex = -1;
        items.forEach((item, i) => {
            if (item.classList.contains('active')) activeIndex = i;
        });

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                activeIndex = (activeIndex + 1) % items.length;
                break;
            case 'ArrowUp':
                e.preventDefault();
                activeIndex = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
                break;
            case 'Enter':
                e.preventDefault();
                if (activeIndex >= 0) {
                    items[activeIndex].click();
                } else if (items.length === 1) {
                    // If only one result, select it on Enter
                    items[0].click();
                }
                return;
            case 'Escape':
                e.preventDefault();
                hideSearchDropdown();
                // Don't blur - keep focus in input for better UX
                return;
            default:
                // Let other keys pass through for normal typing
                return;
        }

        items.forEach((item, i) => {
            item.classList.toggle('active', i === activeIndex);
        });
    }

    function handleSearchClear(e) {
        // FIX: Prevent event bubbling and properly reset search state
        if (e) e.stopPropagation();
        
        if (dom.searchInput) {
            dom.searchInput.value = '';
            dom.searchClear.style.display = 'none';
            // Return focus to input for better UX
            dom.searchInput.focus();
        }
        hideSearchDropdown();
        
        // Clear selected hotel state
        state.selectedHotelId = null;
        mapState.currentTarget = null;
    }

    function handleDocumentClick(e) {
        // FIX: Close dropdown ONLY if clicking outside entire search container
        // Don't close if clicking search input, dropdown, or clear button
        const searchContainer = e.target.closest('.map-search');
        const searchDropdown = e.target.closest('.search-dropdown');
        
        if (!searchContainer && !searchDropdown && state.searchDropdownOpen) {
            hideSearchDropdown();
        }
    }

    function handleSearchResultClick(hotel) {
        // CRITICAL FIX: Use unified navigation function
        hideSearchDropdown();
        
        if (dom.searchInput) {
            dom.searchInput.value = hotel.name;
            if (dom.searchClear) dom.searchClear.style.display = 'block';
        }

        // Use centralized navigation (same as hotel card clicks)
        navigateToHotel(hotel.latitude, hotel.longitude, hotel.id, 14);
    }

    // ==================== SEARCH UI ====================
    function displaySearchResults(hotels) {
        if (!dom.searchDropdown) return;
        
        if (hotels.length === 0) {
            dom.searchDropdown.innerHTML = `
                <div class="search-no-results">
                    <i class="fas fa-search"></i>
                    <span>No hotels found</span>
                </div>
            `;
            showSearchDropdown();
            return;
        }

        // Group by city for better UX
        const grouped = groupHotelsByCity(hotels);
        
        let html = '';
        for (const [city, cityHotels] of Object.entries(grouped)) {
            // Add city header
            html += `
                <div class="search-city-header">
                    <i class="fas fa-city"></i>
                    <span>${escapeHtml(city)}</span>
                    <span class="search-city-count">${cityHotels.length}</span>
                </div>
            `;
            
            // Add hotels in this city (max 3 per city to keep dropdown manageable)
            cityHotels.slice(0, 3).forEach(hotel => {
                const stars = '★'.repeat(hotel.starRating);
                const price = hotel.minPrice ? `₹${hotel.minPrice.toLocaleString('en-IN')}` : '';
                
                html += `
                    <div class="search-result-item" data-hotel-id="${hotel.id}">
                        <div class="search-result-icon">
                            <i class="fas fa-hotel"></i>
                        </div>
                        <div class="search-result-info">
                            <div class="search-result-name">${escapeHtml(hotel.name)}</div>
                            <div class="search-result-meta">
                                <span class="search-result-stars">${stars}</span>
                                ${price ? `<span class="search-result-price">${price}/night</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });
            
            // If city has more hotels, show "View all in city"
            if (cityHotels.length > 3) {
                const firstHotel = cityHotels[0];
                html += `
                    <div class="search-result-item search-view-all" data-lat="${firstHotel.latitude}" data-lng="${firstHotel.longitude}" data-city="${city}">
                        <div class="search-result-icon">
                            <i class="fas fa-map-marker-alt"></i>
                        </div>
                        <div class="search-result-info">
                            <div class="search-result-name">View all ${cityHotels.length} hotels in ${escapeHtml(city)}</div>
                        </div>
                    </div>
                `;
            }
        }

        dom.searchDropdown.innerHTML = html;
        
        // Bind click events with proper event handling
        dom.searchDropdown.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // FIX: Prevent event bubbling to document click handler
                e.stopPropagation();
                
                const hotelId = item.dataset.hotelId;
                if (hotelId) {
                    // Individual hotel click
                    const hotel = hotels.find(h => h.id === parseInt(hotelId));
                    if (hotel) handleSearchResultClick(hotel);
                } else {
                    // City click
                    const lat = parseFloat(item.dataset.lat);
                    const lng = parseFloat(item.dataset.lng);
                    const city = item.dataset.city;
                    if (dom.searchInput) {
                        dom.searchInput.value = city;
                        if (dom.searchClear) dom.searchClear.style.display = 'block';
                    }
                    hideSearchDropdown();
                    // Use unified navigation for city view
                    navigateToHotel(lat, lng, null, 12);
                }
            });
        });

        showSearchDropdown();
    }

    function groupHotelsByCity(hotels) {
        const grouped = {};
        hotels.forEach(hotel => {
            const city = hotel.city || 'Unknown';
            if (!grouped[city]) grouped[city] = [];
            grouped[city].push(hotel);
        });
        return grouped;
    }

    function showSearchDropdown() {
        if (dom.searchDropdown) {
            dom.searchDropdown.classList.add('active');
            state.searchDropdownOpen = true;
            
            // FIX: Smooth scroll parent container if needed
            // Ensure dropdown is visible in sidebar viewport
            setTimeout(() => {
                const dropdownBottom = dom.searchDropdown.getBoundingClientRect().bottom;
                const sidebarBottom = document.querySelector('.map-sidebar')?.getBoundingClientRect().bottom;
                
                if (sidebarBottom && dropdownBottom > sidebarBottom) {
                    dom.searchDropdown.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 50);
        }
    }

    function hideSearchDropdown() {
        if (dom.searchDropdown) {
            dom.searchDropdown.classList.remove('active');
            state.searchDropdownOpen = false;
            // Clear any active highlights
            dom.searchDropdown.querySelectorAll('.search-result-item.active').forEach(item => {
                item.classList.remove('active');
            });
        }
    }

    // ==================== FILTER HANDLERS ====================
    function handleStarFilter(e) {
        const btn = e.currentTarget;
        const stars = btn.dataset.stars;

        // Update UI
        dom.starButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update state
        state.starFilter = stars;

        // Re-render with filter
        renderHotels();
    }

    // ==================== QUICK LOCATION HANDLER ====================
    function handleQuickLocation(e) {
        const chip = e.currentTarget;
        const lat = parseFloat(chip.dataset.lat);
        const lng = parseFloat(chip.dataset.lng);
        const zoom = parseInt(chip.dataset.zoom) || 12;
        const locationName = chip.textContent.trim();

        // Update search input to show location
        if (dom.searchInput) {
            dom.searchInput.value = locationName;
            if (dom.searchClear) dom.searchClear.style.display = 'block';
        }

        // Use unified navigation (no hotelId for city locations)
        navigateToHotel(lat, lng, null, zoom);
    }

    // ==================== UNIFIED NAVIGATION ====================
    /**
     * CRITICAL FIX: Single navigation function used by ALL triggers
     * Prevents duplicate logic and ensures consistent behavior
     * 
     * @param {number} lat - Target latitude
     * @param {number} lng - Target longitude  
     * @param {number|null} hotelId - Hotel to highlight (null for city/area)
     * @param {number} zoom - Target zoom level
     */
    function navigateToHotel(lat, lng, hotelId, zoom) {
        if (!state.map) return;
        
        // FIX #1: Prevent duplicate navigation to same target
        if (mapState.currentTarget && 
            mapState.currentTarget.lat === lat && 
            mapState.currentTarget.lng === lng &&
            mapState.currentTarget.hotelId === hotelId) {
            // Already there or navigating there
            return;
        }
        
        // FIX #2: Prevent concurrent animations
        if (mapState.isAnimating) {
            console.log('Navigation blocked: animation in progress');
            return;
        }
        
        // Lock navigation state
        mapState.isAnimating = true;
        mapState.programmaticMove = true;
        mapState.currentTarget = { lat, lng, hotelId, zoom };
        
        // Store hotel to highlight AFTER animation completes
        state.selectedHotelId = hotelId;
        
        // Perform smooth navigation
        state.map.flyTo([lat, lng], zoom, {
            duration: MAP_CONFIG.FLY_DURATION,
            easeLinearity: 0.25
        });
        
        // Animation will complete → moveend fires → handleMapMoveEnd() unlocks
    }

    // ==================== DATA FETCHING ====================
    async function fetchHotelsInBounds() {
        if (!state.map) return;

        const bounds = state.map.getBounds();
        const params = {
            south: bounds.getSouth().toFixed(6),
            north: bounds.getNorth().toFixed(6),
            west: bounds.getWest().toFixed(6),
            east: bounds.getEast().toFixed(6)
        };

        // Create cache key
        const cacheKey = `${params.south}_${params.north}_${params.west}_${params.east}`;
        
        // Check cache
        const cached = getBoundsCache(cacheKey);
        if (cached) {
            state.visibleHotels = cached;
            renderHotels();
            return;
        }

        showLoading();

        try {
            const queryString = new URLSearchParams(params).toString();
            const response = await fetch(`${MAP_CONFIG.API_BASE}/hotels/map/bounds?${queryString}`);
            
            if (!response.ok) throw new Error('Failed to fetch hotels');
            
            const data = await response.json();
            // API returns { success: true, data: [...] }
            const hotels = data.data || data || [];
            
            // Filter valid hotels
            state.visibleHotels = hotels.filter(h => h.latitude && h.longitude);
            
            // Cache for performance
            setBoundsCache(cacheKey, state.visibleHotels);
            
            renderHotels();
        } catch (error) {
            console.error('Failed to fetch hotels in bounds:', error);
            // Don't clear existing hotels on error
        } finally {
            hideLoading();
        }
    }

    // ==================== RENDERING ====================
    function renderHotels() {
        // Apply star filter
        let hotels = state.visibleHotels;
        if (state.starFilter !== 'all') {
            const filterRating = parseInt(state.starFilter);
            hotels = hotels.filter(h => h.starRating === filterRating);
        }

        // Update markers and sidebar simultaneously
        renderMarkers(hotels);
        renderSidebarList(hotels);
        updateHotelCount(hotels.length);
    }

    function renderMarkers(hotels) {
        // FIX: Clear markers WITHOUT triggering map movement
        // LayerGroup.clearLayers() is safe and doesn't affect map center
        state.markerLayer.clearLayers();
        state.markers.clear();

        // Add new markers (does NOT move map)
        hotels.forEach(hotel => {
            const marker = createMarker(hotel);
            state.markerLayer.addLayer(marker);
            state.markers.set(hotel.id, marker);
        });

        // Highlight selected hotel if exists
        // This happens AFTER animation completes via moveend
        if (state.selectedHotelId) {
            highlightHotel(state.selectedHotelId);
            
            // Open popup for selected hotel after short delay
            setTimeout(() => {
                const marker = state.markers.get(state.selectedHotelId);
                if (marker && !mapState.isAnimating) {
                    marker.openPopup();
                }
            }, 100);
        }
    }

    function createMarker(hotel) {
        const icon = createMarkerIcon(hotel.starRating);
        
        const marker = L.marker([hotel.latitude, hotel.longitude], {
            icon: icon,
            alt: hotel.name,
            riseOnHover: true  // Marker rises when hovered
        });

        // Store hotel data on marker for reference
        marker.hotelData = hotel;

        // Lazy popup creation for performance
        marker.bindPopup(() => createPopupContent(hotel), {
            maxWidth: 300,
            minWidth: 260,
            className: 'hotel-popup-wrapper',
            autoPanPadding: [50, 50]
        });

        // FIX: Marker click should ONLY highlight, not navigate
        marker.on('click', () => {
            // Just highlight in sidebar - popup opens automatically
            highlightHotel(hotel.id);
            state.selectedHotelId = hotel.id;
        });

        return marker;
    }

    function createMarkerIcon(starRating) {
        // Color based on rating: 3=green, 4=blue, 5=gold
        const colorClass = starRating >= 5 ? 'hotel-marker-5' : 
                          starRating >= 4 ? 'hotel-marker-4' : 'hotel-marker-3';
        
        return L.divIcon({
            className: 'custom-marker',
            html: `
                <div class="hotel-marker ${colorClass}">
                    <span class="hotel-marker-inner">${starRating}</span>
                </div>
            `,
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -36]
        });
    }

    function createPopupContent(hotel) {
        const imageUrl = hotel.heroImageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400';
        const stars = '★'.repeat(hotel.starRating) + '☆'.repeat(5 - hotel.starRating);
        const price = hotel.minPrice ? `₹${hotel.minPrice.toLocaleString('en-IN')}` : 'Check availability';

        return `
            <div class="hotel-popup">
                <img src="${imageUrl}" alt="${escapeHtml(hotel.name)}" class="hotel-popup-image" 
                     onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'">
                <div class="hotel-popup-content">
                    <h3 class="hotel-popup-name">${escapeHtml(hotel.name)}</h3>
                    <p class="hotel-popup-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${escapeHtml(hotel.city)}, ${escapeHtml(hotel.country)}
                    </p>
                    <div class="hotel-popup-rating">
                        <span class="hotel-popup-stars">${stars}</span>
                        <span class="hotel-popup-price">from <strong>${price}</strong>/night</span>
                    </div>
                    <a href="hotel-detail.html?id=${hotel.id}" class="hotel-popup-btn">
                        View Details
                    </a>
                </div>
            </div>
        `;
    }

    function renderSidebarList(hotels) {
        if (!dom.hotelList) return;

        if (hotels.length === 0) {
            dom.hotelList.innerHTML = '';
            if (dom.noResults) dom.noResults.style.display = 'block';
            return;
        }

        if (dom.noResults) dom.noResults.style.display = 'none';

        // Build HTML for all hotels
        const html = hotels.map(hotel => {
            const imageUrl = hotel.heroImageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400';
            const stars = '★'.repeat(hotel.starRating);
            const price = hotel.minPrice ? `₹${hotel.minPrice.toLocaleString('en-IN')}` : '--';

            return `
                <div class="hotel-card" data-hotel-id="${hotel.id}" data-lat="${hotel.latitude}" data-lng="${hotel.longitude}">
                    <div class="hotel-card-image">
                        <img src="${imageUrl}" alt="${escapeHtml(hotel.name)}" loading="lazy"
                             onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'">
                        <span class="hotel-card-rating">${stars}</span>
                    </div>
                    <div class="hotel-card-content">
                        <h4 class="hotel-card-name">${escapeHtml(hotel.name)}</h4>
                        <p class="hotel-card-location">
                            <i class="fas fa-map-marker-alt"></i>
                            ${escapeHtml(hotel.city)}
                        </p>
                        <div class="hotel-card-footer">
                            <span class="hotel-card-price">${price}<small>/night</small></span>
                            <a href="hotel-detail.html?id=${hotel.id}" class="hotel-card-link">
                                View <i class="fas fa-arrow-right"></i>
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        dom.hotelList.innerHTML = html;

        // Bind click events for cards
        dom.hotelList.querySelectorAll('.hotel-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking the View link
                if (e.target.closest('.hotel-card-link')) return;
                
                const lat = parseFloat(card.dataset.lat);
                const lng = parseFloat(card.dataset.lng);
                const hotelId = parseInt(card.dataset.hotelId);
                
                // FIX: Use unified navigation function
                navigateToHotel(lat, lng, hotelId, 16);
            });
        });
    }

    function updateHotelCount(count) {
        if (dom.hotelCount) {
            dom.hotelCount.textContent = `${count} hotel${count !== 1 ? 's' : ''}`;
        }
    }

    // ==================== HIGHLIGHT SYNC ====================
    function highlightHotel(hotelId) {
        // Remove previous highlights
        document.querySelectorAll('.hotel-card.highlighted').forEach(card => {
            card.classList.remove('highlighted');
        });

        // Highlight in sidebar
        const card = document.querySelector(`.hotel-card[data-hotel-id="${hotelId}"]`);
        if (card) {
            card.classList.add('highlighted');
            // Scroll into view smoothly (only if not already visible)
            const listContainer = dom.hotelList;
            if (listContainer) {
                const cardTop = card.offsetTop;
                const cardBottom = cardTop + card.offsetHeight;
                const scrollTop = listContainer.scrollTop;
                const scrollBottom = scrollTop + listContainer.clientHeight;
                
                // Only scroll if card is outside viewport
                if (cardTop < scrollTop || cardBottom > scrollBottom) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }
    }

    // ==================== DEPRECATED: Remove old flyToLocation ====================
    // This function is replaced by navigateToHotel()
    // Kept for backwards compatibility but should not be used
    function flyToLocation(lat, lng, zoom) {
        console.warn('flyToLocation() is deprecated. Use navigateToHotel() instead.');
        navigateToHotel(lat, lng, null, zoom);
    }

    // ==================== CACHING ====================
    function getSearchCache(query) {
        const key = query.toLowerCase();
        const cached = state.searchCache.get(key);
        
        if (cached && Date.now() - cached.timestamp < MAP_CONFIG.CACHE_TTL) {
            return cached.results;
        }
        
        // Clean up expired entry
        if (cached) state.searchCache.delete(key);
        return null;
    }

    function setSearchCache(query, results) {
        const key = query.toLowerCase();
        state.searchCache.set(key, {
            results,
            timestamp: Date.now()
        });
        
        // Limit cache size to prevent memory bloat
        if (state.searchCache.size > 50) {
            const firstKey = state.searchCache.keys().next().value;
            state.searchCache.delete(firstKey);
        }
    }

    function getBoundsCache(key) {
        try {
            const cached = sessionStorage.getItem(MAP_CONFIG.CACHE_KEY_PREFIX + key);
            if (cached) {
                const data = JSON.parse(cached);
                if (Date.now() - data.timestamp < MAP_CONFIG.CACHE_TTL) {
                    return data.hotels;
                }
                // Expired - remove
                sessionStorage.removeItem(MAP_CONFIG.CACHE_KEY_PREFIX + key);
            }
        } catch (e) {
            // sessionStorage might be unavailable
        }
        return null;
    }

    function setBoundsCache(key, hotels) {
        try {
            const data = {
                hotels,
                timestamp: Date.now()
            };
            sessionStorage.setItem(MAP_CONFIG.CACHE_KEY_PREFIX + key, JSON.stringify(data));
            
            // Clean up old entries (simple strategy - limit to 20 entries)
            const keys = Object.keys(sessionStorage).filter(k => k.startsWith(MAP_CONFIG.CACHE_KEY_PREFIX));
            if (keys.length > 20) {
                sessionStorage.removeItem(keys[0]);
            }
        } catch (e) {
            // sessionStorage might be full or unavailable
        }
    }

    // ==================== UTILITIES ====================
    function debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==================== LOADING UI ====================
    function showLoading() {
        state.isLoading = true;
        if (dom.loading) {
            dom.loading.classList.remove('hidden');
        }
    }

    function hideLoading() {
        state.isLoading = false;
        if (dom.loading) {
            dom.loading.classList.add('hidden');
        }
    }

    // ==================== ENTRY POINT ====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
