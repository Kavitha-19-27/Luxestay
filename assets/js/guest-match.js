/**
 * Guest Match Module
 * Personalized hotel recommendations
 * 
 * "Guests like you enjoyed..."
 * 
 * Features:
 * - Personalized hotel recommendations
 * - Match score visualization
 * - Preference-based suggestions
 */

const GuestMatch = (function() {
    'use strict';
    
    const API_BASE = window.API?.BASE_URL || 'https://luxestay-backend-1.onrender.com';
    
    // Confidence level configurations
    const CONFIDENCE_CONFIGS = {
        HIGH: {
            label: 'Highly Personalized',
            icon: '🎯',
            class: 'confidence-high'
        },
        MEDIUM: {
            label: 'Personalized',
            icon: '✨',
            class: 'confidence-medium'
        },
        LOW: {
            label: 'Popular Picks',
            icon: '🌟',
            class: 'confidence-low'
        }
    };
    
    /**
     * Fetch personalized recommendations
     */
    async function getRecommendations() {
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            const response = await fetch(`${API_BASE}/api/guest-match/recommendations`, {
                headers
            });
            
            if (!response.ok) {
                return await getPopularRecommendations();
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching recommendations:', error);
            return null;
        }
    }
    
    /**
     * Fetch contextual recommendations
     */
    async function getContextualRecommendations(currentHotelId) {
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            let url = `${API_BASE}/api/guest-match/recommendations/context`;
            if (currentHotelId) {
                url += `?currentHotelId=${currentHotelId}`;
            }
            
            const response = await fetch(url, { headers });
            
            if (!response.ok) {
                return await getPopularRecommendations();
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching contextual recommendations:', error);
            return null;
        }
    }
    
    /**
     * Fetch popular recommendations
     */
    async function getPopularRecommendations() {
        try {
            const response = await fetch(`${API_BASE}/api/guest-match/popular`);
            if (!response.ok) {
                return null;
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching popular recommendations:', error);
            return null;
        }
    }
    
    /**
     * Render match score badge
     */
    function renderMatchScore(score) {
        let scoreClass = 'score-medium';
        if (score >= 85) {
            scoreClass = 'score-high';
        } else if (score >= 70) {
            scoreClass = 'score-good';
        } else if (score < 60) {
            scoreClass = 'score-low';
        }
        
        return `
            <div class="guest-match-score ${scoreClass}">
                <span class="score-value">${score}%</span>
                <span class="score-label">match</span>
            </div>
        `;
    }
    
    /**
     * Render a single hotel recommendation card
     */
    function renderHotelCard(hotel) {
        const matchReasons = hotel.matchReasons && hotel.matchReasons.length > 0
            ? `<p class="match-reasons">${hotel.matchReasons[0]}</p>`
            : '';
        
        const rating = hotel.rating
            ? `<span class="hotel-rating">⭐ ${hotel.rating.toFixed(1)}</span>`
            : '';
        
        const price = hotel.startingPrice
            ? `<span class="hotel-price">From $${hotel.startingPrice}</span>`
            : '';
        
        return `
            <div class="guest-match-card" data-hotel-id="${hotel.hotelId}">
                <div class="card-image">
                    <img src="${hotel.imageUrl || 'https://placehold.co/300x200?text=Hotel'}" 
                         alt="${hotel.name}" 
                         loading="lazy">
                    ${renderMatchScore(hotel.matchScore)}
                </div>
                <div class="card-content">
                    <h4 class="hotel-name">${hotel.name}</h4>
                    <p class="hotel-city">${hotel.city || ''}</p>
                    <div class="hotel-meta">
                        ${rating}
                        ${price}
                    </div>
                    ${matchReasons}
                </div>
                <a href="hotel-detail.html?id=${hotel.hotelId}" class="card-link">
                    View Details →
                </a>
            </div>
        `;
    }
    
    /**
     * Render the recommendations section
     */
    function renderRecommendations(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container || !data) return;
        
        const confidenceConfig = CONFIDENCE_CONFIGS[data.confidence] || CONFIDENCE_CONFIGS.LOW;
        
        // Filter to show only hotels with recommendations
        const hotels = data.recommendedHotels || [];
        
        if (hotels.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = `
            <div class="guest-match-section">
                <div class="section-header">
                    <div class="header-title">
                        <span class="header-icon">${confidenceConfig.icon}</span>
                        <h3>Guests like you enjoyed</h3>
                    </div>
                    <span class="confidence-badge ${confidenceConfig.class}">
                        ${confidenceConfig.label}
                    </span>
                </div>
                
                ${data.guestProfile ? `<p class="guest-profile">${data.guestProfile}</p>` : ''}
                
                ${data.matchFactors && data.matchFactors.length > 0 ? `
                    <div class="match-factors">
                        ${data.matchFactors.map(f => `<span class="factor-tag">${f}</span>`).join('')}
                    </div>
                ` : ''}
                
                <div class="recommendations-grid">
                    ${hotels.map(hotel => renderHotelCard(hotel)).join('')}
                </div>
            </div>
        `;
        
        // Add click handlers
        container.querySelectorAll('.guest-match-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.card-link')) {
                    const hotelId = card.dataset.hotelId;
                    window.location.href = `hotel-detail.html?id=${hotelId}`;
                }
            });
        });
    }
    
    /**
     * Render a compact "You might also like" section
     */
    function renderCompactRecommendations(containerId, data, limit = 3) {
        const container = document.getElementById(containerId);
        if (!container || !data) return;
        
        const hotels = (data.recommendedHotels || []).slice(0, limit);
        
        if (hotels.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = `
            <div class="guest-match-compact">
                <h4 class="compact-title">
                    <span class="title-icon">✨</span>
                    You might also like
                </h4>
                <div class="compact-list">
                    ${hotels.map(hotel => `
                        <a href="hotel-detail.html?id=${hotel.hotelId}" class="compact-item">
                            <img src="${hotel.imageUrl || 'https://placehold.co/60x60?text=Hotel'}" 
                                 alt="${hotel.name}"
                                 class="compact-image">
                            <div class="compact-info">
                                <span class="compact-name">${hotel.name}</span>
                                <span class="compact-match">${hotel.matchScore}% match</span>
                            </div>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Initialize guest match on hotels list page
     */
    async function initOnHotelsPage(containerId) {
        const data = await getRecommendations();
        if (data) {
            renderRecommendations(containerId, data);
        }
    }
    
    /**
     * Initialize guest match on hotel detail page
     */
    async function initOnDetailPage(containerId, currentHotelId) {
        const data = await getContextualRecommendations(currentHotelId);
        if (data) {
            renderCompactRecommendations(containerId, data);
        }
    }
    
    // Public API
    return {
        getRecommendations,
        getContextualRecommendations,
        getPopularRecommendations,
        renderRecommendations,
        renderCompactRecommendations,
        initOnHotelsPage,
        initOnDetailPage,
        CONFIDENCE_CONFIGS
    };
})();

// Export for global access
window.GuestMatch = GuestMatch;
