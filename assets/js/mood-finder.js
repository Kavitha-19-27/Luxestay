/**
 * Mood-Based Hotel Finder
 * Intelligent hotel discovery based on travel mood
 * 
 * All logic runs server-side - frontend only handles UI rendering
 */

const MoodFinder = {
    // State
    isOpen: false,
    currentMood: null,
    moods: [],
    results: [],
    isLoading: false,

    // Mood display configuration
    moodConfig: {
        ROMANTIC_GETAWAY: {
            gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
            icon: 'fa-heart',
            color: '#ff6b6b'
        },
        ADVENTURE: {
            gradient: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
            icon: 'fa-mountain',
            color: '#4ecdc4'
        },
        RELAXATION: {
            gradient: 'linear-gradient(135deg, #a8e6cf 0%, #7fcdcd 100%)',
            icon: 'fa-spa',
            color: '#7fcdcd'
        },
        FAMILY_FUN: {
            gradient: 'linear-gradient(135deg, #ffd93d 0%, #f9c74f 100%)',
            icon: 'fa-users',
            color: '#ffd93d'
        },
        BUSINESS: {
            gradient: 'linear-gradient(135deg, #6c5ce7 0%, #5f4dd0 100%)',
            icon: 'fa-briefcase',
            color: '#6c5ce7'
        }
    },

    /**
     * Initialize the mood finder
     */
    async init() {
        this.createMoodFinderUI();
        this.bindEvents();
        await this.loadMoods();
    },

    /**
     * Create the mood finder UI elements
     */
    createMoodFinderUI() {
        // Create mood finder toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'moodFinderToggle';
        toggleBtn.className = 'mood-finder-toggle';
        toggleBtn.innerHTML = `
            <i class="fas fa-magic"></i>
            <span>Find by Mood</span>
        `;
        
        // Create mood finder panel
        const panel = document.createElement('div');
        panel.id = 'moodFinderPanel';
        panel.className = 'mood-finder-panel';
        panel.innerHTML = `
            <div class="mood-finder-header">
                <div class="mood-finder-title">
                    <i class="fas fa-magic"></i>
                    <h3>Discover Your Perfect Stay</h3>
                </div>
                <p class="mood-finder-subtitle">Tell us your travel mood and we'll find the best matches</p>
                <button class="mood-finder-close" id="moodFinderClose">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="mood-cards-container" id="moodCardsContainer">
                <div class="mood-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Loading moods...</span>
                </div>
            </div>
            
            <div class="mood-results-container" id="moodResultsContainer" style="display: none;">
                <div class="mood-results-header">
                    <button class="mood-back-btn" id="moodBackBtn">
                        <i class="fas fa-arrow-left"></i>
                        <span>Back to Moods</span>
                    </button>
                    <div class="mood-results-title" id="moodResultsTitle"></div>
                </div>
                <div class="mood-results-filters" id="moodResultsFilters">
                    <div class="mood-filter-group">
                        <label>Location</label>
                        <input type="text" id="moodFilterLocation" placeholder="Any location" class="mood-filter-input">
                    </div>
                    <div class="mood-filter-group">
                        <label>Min Stars</label>
                        <select id="moodFilterStars" class="mood-filter-select">
                            <option value="">Any</option>
                            <option value="3">3+ Stars</option>
                            <option value="4">4+ Stars</option>
                            <option value="5">5 Stars</option>
                        </select>
                    </div>
                    <button class="mood-filter-apply" id="moodFilterApply">
                        <i class="fas fa-filter"></i>
                        Apply Filters
                    </button>
                </div>
                <div class="mood-results-list" id="moodResultsList"></div>
            </div>
        `;

        // Add overlay
        const overlay = document.createElement('div');
        overlay.id = 'moodFinderOverlay';
        overlay.className = 'mood-finder-overlay';

        // Insert into page
        const filtersSection = document.querySelector('.filters-section') || 
                              document.querySelector('.hotels-header') ||
                              document.querySelector('main');
        
        if (filtersSection) {
            // Add toggle button near filters
            const filterRow = document.querySelector('.filter-chips') || 
                             document.querySelector('.filter-row') ||
                             filtersSection;
            if (filterRow) {
                filterRow.insertAdjacentElement('afterend', toggleBtn);
            } else {
                filtersSection.insertAdjacentElement('afterbegin', toggleBtn);
            }
        }

        document.body.appendChild(overlay);
        document.body.appendChild(panel);
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Toggle button
        document.getElementById('moodFinderToggle')?.addEventListener('click', () => this.open());
        
        // Close button and overlay
        document.getElementById('moodFinderClose')?.addEventListener('click', () => this.close());
        document.getElementById('moodFinderOverlay')?.addEventListener('click', () => this.close());
        
        // Back button
        document.getElementById('moodBackBtn')?.addEventListener('click', () => this.showMoodSelection());
        
        // Filter apply
        document.getElementById('moodFilterApply')?.addEventListener('click', () => this.applyFilters());
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    },

    /**
     * Load available moods from API
     */
    async loadMoods() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/hotels/mood-finder/moods`);
            if (!response.ok) throw new Error('Failed to load moods');
            
            const data = await response.json();
            this.moods = data.moods || [];
            this.renderMoodCards();
        } catch (error) {
            console.error('Error loading moods:', error);
            this.renderMoodError();
        }
    },

    /**
     * Render mood selection cards
     */
    renderMoodCards() {
        const container = document.getElementById('moodCardsContainer');
        if (!container) return;

        if (this.moods.length === 0) {
            container.innerHTML = `
                <div class="mood-empty">
                    <i class="fas fa-hotel"></i>
                    <p>No moods available at this time</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.moods.map(mood => {
            const config = this.moodConfig[mood.mood] || {};
            return `
                <div class="mood-card" data-mood="${mood.mood}" style="--mood-gradient: ${config.gradient}; --mood-color: ${config.color}">
                    <div class="mood-card-icon">
                        <i class="fas ${config.icon || mood.icon}"></i>
                    </div>
                    <div class="mood-card-content">
                        <h4 class="mood-card-title">${mood.displayName}</h4>
                        <p class="mood-card-description">${mood.description}</p>
                        <div class="mood-card-meta">
                            <span class="mood-hotel-count">
                                <i class="fas fa-hotel"></i>
                                ${mood.matchingHotelsCount} hotels
                            </span>
                            ${mood.topMatchPreview ? `
                                <span class="mood-top-match">
                                    <i class="fas fa-star"></i>
                                    Top: ${mood.topMatchPreview}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    <div class="mood-card-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            `;
        }).join('');

        // Bind click events
        container.querySelectorAll('.mood-card').forEach(card => {
            card.addEventListener('click', () => {
                const mood = card.dataset.mood;
                this.selectMood(mood);
            });
        });
    },

    /**
     * Render error state
     */
    renderMoodError() {
        const container = document.getElementById('moodCardsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="mood-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Unable to load moods</p>
                <button class="mood-retry-btn" onclick="MoodFinder.loadMoods()">
                    <i class="fas fa-redo"></i>
                    Retry
                </button>
            </div>
        `;
    },

    /**
     * Select a mood and search hotels
     */
    async selectMood(mood) {
        this.currentMood = mood;
        await this.searchByMood();
    },

    /**
     * Search hotels by current mood
     */
    async searchByMood() {
        if (!this.currentMood) return;

        const location = document.getElementById('moodFilterLocation')?.value || '';
        const minStars = document.getElementById('moodFilterStars')?.value || '';

        this.showLoading();
        
        try {
            const params = new URLSearchParams({ mood: this.currentMood });
            if (location) params.append('location', location);
            if (minStars) params.append('minStars', minStars);
            params.append('limit', '12');

            const response = await fetch(`${CONFIG.API_BASE_URL}/hotels/mood-finder/search?${params}`);
            if (!response.ok) throw new Error('Search failed');

            const data = await response.json();
            this.results = data.hotels || [];
            this.renderResults(data);
        } catch (error) {
            console.error('Error searching by mood:', error);
            this.renderResultsError();
        }
    },

    /**
     * Show loading state
     */
    showLoading() {
        document.getElementById('moodCardsContainer').style.display = 'none';
        const resultsContainer = document.getElementById('moodResultsContainer');
        resultsContainer.style.display = 'block';
        
        document.getElementById('moodResultsList').innerHTML = `
            <div class="mood-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Finding your perfect hotels...</span>
            </div>
        `;
    },

    /**
     * Render search results
     */
    renderResults(data) {
        const moodInfo = this.moods.find(m => m.mood === this.currentMood);
        const config = this.moodConfig[this.currentMood] || {};

        // Update title
        document.getElementById('moodResultsTitle').innerHTML = `
            <div class="mood-results-mood" style="--mood-color: ${config.color}">
                <i class="fas ${config.icon}"></i>
                <span>${moodInfo?.displayName || this.currentMood}</span>
            </div>
            <span class="mood-results-count">${data.totalMatches} matches found</span>
        `;

        const listContainer = document.getElementById('moodResultsList');

        if (this.results.length === 0) {
            listContainer.innerHTML = `
                <div class="mood-no-results">
                    <i class="fas fa-search"></i>
                    <h4>No matches found</h4>
                    <p>Try adjusting your filters or selecting a different mood</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = this.results.map(hotel => this.renderHotelCard(hotel)).join('');

        // Bind card clicks
        listContainer.querySelectorAll('.mood-hotel-card').forEach(card => {
            card.addEventListener('click', () => {
                window.location.href = `hotel-detail.html?id=${card.dataset.hotelId}`;
            });
        });
    },

    /**
     * Render a hotel result card
     */
    renderHotelCard(hotel) {
        const config = this.moodConfig[this.currentMood] || {};
        const matchLevelClass = hotel.matchLevel?.toLowerCase() || 'good';
        
        const stars = '★'.repeat(hotel.starRating) + '☆'.repeat(5 - hotel.starRating);
        
        // Get top 3 match reasons
        const topReasons = (hotel.matchReasons || []).slice(0, 3);
        
        return `
            <div class="mood-hotel-card" data-hotel-id="${hotel.hotelId}">
                <div class="mood-hotel-image">
                    <img src="${hotel.heroImageUrl || CONFIG.PLACEHOLDER_HOTEL}" 
                         alt="${hotel.hotelName}"
                         onerror="this.src='${CONFIG.PLACEHOLDER_HOTEL}'">
                    <div class="mood-match-badge ${matchLevelClass}" style="--mood-color: ${config.color}">
                        <span class="match-score">${hotel.matchScore}%</span>
                        <span class="match-label">${hotel.matchLevel} Match</span>
                    </div>
                </div>
                <div class="mood-hotel-content">
                    <div class="mood-hotel-header">
                        <h4 class="mood-hotel-name">${hotel.hotelName}</h4>
                        <div class="mood-hotel-rating">${stars}</div>
                    </div>
                    <div class="mood-hotel-location">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${hotel.city}, ${hotel.country}</span>
                    </div>
                    <div class="mood-hotel-reasons">
                        <div class="reasons-title">
                            <i class="fas fa-check-circle"></i>
                            Why it matches:
                        </div>
                        <ul class="reasons-list">
                            ${topReasons.map(reason => `<li>${reason}</li>`).join('')}
                        </ul>
                    </div>
                    ${hotel.relevantAmenities && hotel.relevantAmenities.length > 0 ? `
                        <div class="mood-hotel-amenities">
                            ${hotel.relevantAmenities.slice(0, 4).map(a => 
                                `<span class="amenity-tag">${a}</span>`
                            ).join('')}
                        </div>
                    ` : ''}
                    <div class="mood-hotel-footer">
                        <div class="mood-hotel-price">
                            <span class="price-label">From</span>
                            <span class="price-value">₹${parseFloat(hotel.minPrice).toLocaleString()}</span>
                            <span class="price-unit">/night</span>
                        </div>
                        <button class="mood-view-btn">
                            View Hotel <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render results error
     */
    renderResultsError() {
        document.getElementById('moodResultsList').innerHTML = `
            <div class="mood-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Unable to search hotels</p>
                <button class="mood-retry-btn" onclick="MoodFinder.searchByMood()">
                    <i class="fas fa-redo"></i>
                    Retry
                </button>
            </div>
        `;
    },

    /**
     * Show mood selection view
     */
    showMoodSelection() {
        this.currentMood = null;
        document.getElementById('moodCardsContainer').style.display = 'grid';
        document.getElementById('moodResultsContainer').style.display = 'none';
        
        // Reset filters
        document.getElementById('moodFilterLocation').value = '';
        document.getElementById('moodFilterStars').value = '';
    },

    /**
     * Apply filters and re-search
     */
    applyFilters() {
        if (this.currentMood) {
            this.searchByMood();
        }
    },

    /**
     * Open the mood finder panel
     */
    open() {
        this.isOpen = true;
        document.getElementById('moodFinderPanel')?.classList.add('active');
        document.getElementById('moodFinderOverlay')?.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    /**
     * Close the mood finder panel
     */
    close() {
        this.isOpen = false;
        document.getElementById('moodFinderPanel')?.classList.remove('active');
        document.getElementById('moodFinderOverlay')?.classList.remove('active');
        document.body.style.overflow = '';
        
        // Reset to mood selection
        this.showMoodSelection();
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on hotels page
    if (window.location.pathname.includes('hotels.html') || 
        document.getElementById('hotelsList')) {
        MoodFinder.init();
    }
});
