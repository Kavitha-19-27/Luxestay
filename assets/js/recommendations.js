/**
 * Recommendations Component
 * Displays personalized hotel recommendations with explainable reasons
 * 
 * FEATURES:
 * - Mobile-first responsive cards
 * - Lazy loading for performance
 * - Explainable AI transparency
 * - Skeleton loading states
 * - Horizontal scroll on mobile
 */

const Recommendations = {
    // Configuration
    config: {
        defaultLimit: 8,
        cardsPerRow: {
            mobile: 1,
            tablet: 2,
            desktop: 4
        }
    },
    
    /**
     * Fetch personalized recommendations
     */
    async getPersonalized(limit = this.config.defaultLimit) {
        try {
            const response = await API.request(`/recommendations?limit=${limit}`);
            return response.data || [];
        } catch (error) {
            console.error('Failed to fetch personalized recommendations:', error);
            return [];
        }
    },
    
    /**
     * Fetch popular recommendations (fallback for non-logged-in users)
     */
    async getPopular(limit = this.config.defaultLimit) {
        try {
            const response = await API.request(`/recommendations/popular?limit=${limit}`);
            return response.data || [];
        } catch (error) {
            console.error('Failed to fetch popular recommendations:', error);
            return [];
        }
    },
    
    /**
     * Fetch similar hotels
     */
    async getSimilar(hotelId, limit = 4) {
        try {
            const response = await API.request(`/recommendations/similar/${hotelId}?limit=${limit}`);
            return response.data || [];
        } catch (error) {
            console.error('Failed to fetch similar hotels:', error);
            return [];
        }
    },
    
    /**
     * Fetch destination recommendations
     */
    async getDestination(city, limit = this.config.defaultLimit) {
        try {
            const response = await API.request(`/recommendations/destination/${encodeURIComponent(city)}?limit=${limit}`);
            return response.data || [];
        } catch (error) {
            console.error('Failed to fetch destination recommendations:', error);
            return [];
        }
    },
    
    /**
     * Render recommendation cards
     */
    render(containerId, recommendations, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const {
            showReasons = true,
            useHorizontalScroll = false,
            emptyMessage = 'No recommendations available'
        } = options;
        
        // Empty state
        if (!recommendations || recommendations.length === 0) {
            container.innerHTML = this.renderEmptyState(emptyMessage);
            return;
        }
        
        const containerClass = useHorizontalScroll ? 
            'recommendation-cards recommendation-cards--horizontal' : 
            'recommendation-cards';
        
        container.innerHTML = `
            <div class="${containerClass}">
                ${recommendations.map(rec => this.renderCard(rec, showReasons)).join('')}
            </div>
        `;
        
        // Initialize reason toggles
        this.initReasonToggles(container);
    },
    
    /**
     * Render a single recommendation card
     */
    renderCard(rec, showReasons = true) {
        const matchPercentage = Math.round(rec.score * 100);
        const stars = this.renderStars(rec.starRating || 4);
        const primaryReasonText = this.getReasonText(rec.primaryReason);
        
        return `
            <article class="recommendation-card" data-hotel-id="${rec.hotelId}">
                <a href="hotel-detail.html?id=${rec.hotelId}" aria-label="View ${this.escapeHtml(rec.hotelName)}">
                    <div class="recommendation-card-image">
                        <img src="${rec.imageUrl || 'assets/images/hotel-placeholder.jpg'}" 
                             alt="${this.escapeHtml(rec.hotelName)}"
                             loading="lazy"
                             onerror="this.src='assets/images/hotel-placeholder.jpg'">
                        ${matchPercentage > 0 ? `
                            <div class="recommendation-match-badge" title="Match score based on your preferences">
                                <i class="fas fa-star"></i>
                                ${matchPercentage}% match
                            </div>
                        ` : ''}
                    </div>
                    <div class="recommendation-card-content">
                        <h3 class="recommendation-card-title">${this.escapeHtml(rec.hotelName)}</h3>
                        <div class="recommendation-card-location">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${this.escapeHtml(rec.city || 'Unknown location')}</span>
                        </div>
                        <div class="recommendation-card-rating">
                            <div class="recommendation-card-stars">${stars}</div>
                            ${rec.avgRating ? `
                                <span class="recommendation-card-rating-value">${rec.avgRating.toFixed(1)}</span>
                                <span class="recommendation-card-rating-count">(${rec.reviewCount || 0} reviews)</span>
                            ` : ''}
                        </div>
                        ${rec.startingPrice ? `
                            <div class="recommendation-card-price">
                                <span class="recommendation-card-price-value">$${rec.startingPrice}</span>
                                <span class="recommendation-card-price-label">/ night</span>
                            </div>
                        ` : ''}
                    </div>
                </a>
                ${showReasons && rec.reasonBreakdown ? this.renderReasons(rec, primaryReasonText) : ''}
            </article>
        `;
    },
    
    /**
     * Render the reasons section
     */
    renderReasons(rec, primaryReasonText) {
        const breakdown = rec.reasonBreakdown || [];
        
        return `
            <div class="recommendation-reasons">
                <div class="recommendation-reason">
                    <i class="fas fa-check-circle"></i>
                    <span>${primaryReasonText}</span>
                </div>
                ${breakdown.length > 1 ? `
                    <button class="recommendation-reasons-toggle" aria-expanded="false">
                        <span>Why this recommendation?</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="recommendation-reasons-list" aria-hidden="true">
                        ${breakdown.map(item => `
                            <div class="recommendation-reason-item">
                                <span class="recommendation-reason-label">
                                    <i class="fas ${this.getReasonIcon(item.reason)}"></i>
                                    ${this.getReasonText(item.reason)}
                                </span>
                                <div class="recommendation-reason-bar">
                                    <div class="recommendation-reason-bar-fill" style="width: ${Math.round(item.contribution * 100)}%"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    },
    
    /**
     * Render star icons
     */
    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalf = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
        
        let html = '';
        for (let i = 0; i < fullStars; i++) {
            html += '<i class="fas fa-star"></i>';
        }
        if (hasHalf) {
            html += '<i class="fas fa-star-half-alt"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            html += '<i class="far fa-star"></i>';
        }
        return html;
    },
    
    /**
     * Render skeleton loading state
     */
    renderSkeleton(containerId, count = 4) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const skeletons = Array(count).fill(null).map(() => `
            <article class="recommendation-card recommendation-card--skeleton">
                <div class="recommendation-card-image"></div>
                <div class="recommendation-card-content">
                    <div class="skeleton-text skeleton-text--medium" style="margin-bottom: 8px;"></div>
                    <div class="skeleton-text skeleton-text--short" style="margin-bottom: 8px;"></div>
                    <div class="skeleton-text skeleton-text--short"></div>
                </div>
            </article>
        `).join('');
        
        container.innerHTML = `<div class="recommendation-cards">${skeletons}</div>`;
    },
    
    /**
     * Render empty state
     */
    renderEmptyState(message) {
        return `
            <div class="recommendations-empty">
                <i class="fas fa-search"></i>
                <p class="recommendations-empty-text">${this.escapeHtml(message)}</p>
            </div>
        `;
    },
    
    /**
     * Initialize reason toggle buttons
     */
    initReasonToggles(container) {
        const toggles = container.querySelectorAll('.recommendation-reasons-toggle');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const list = toggle.nextElementSibling;
                const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
                
                toggle.setAttribute('aria-expanded', !isExpanded);
                list.classList.toggle('expanded', !isExpanded);
                list.setAttribute('aria-hidden', isExpanded);
                
                const icon = toggle.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-chevron-down', isExpanded);
                    icon.classList.toggle('fa-chevron-up', !isExpanded);
                }
            });
        });
    },
    
    /**
     * Get human-readable reason text
     */
    getReasonText(reason) {
        const reasonTexts = {
            'CITY_AFFINITY': 'In a city you love',
            'PRICE_MATCH': 'Within your budget',
            'STAR_PREFERENCE': 'Matches your preferred quality',
            'TOP_RATED': 'Highly rated by guests',
            'POPULAR': 'Popular choice',
            'FEATURED': 'Featured hotel',
            'SAME_CITY': 'Same destination',
            'SIMILAR_RATING': 'Similar quality rating',
            'SIMILAR_PRICE': 'Similar price range',
            'TRENDING': 'Trending now',
            'NEW_LISTING': 'New on LuxeStay',
            'HIGHLY_REVIEWED': 'Excellent reviews'
        };
        return reasonTexts[reason] || 'Recommended for you';
    },
    
    /**
     * Get icon for reason type
     */
    getReasonIcon(reason) {
        const icons = {
            'CITY_AFFINITY': 'fa-heart',
            'PRICE_MATCH': 'fa-tag',
            'STAR_PREFERENCE': 'fa-star',
            'TOP_RATED': 'fa-award',
            'POPULAR': 'fa-fire',
            'FEATURED': 'fa-crown',
            'SAME_CITY': 'fa-map-marker-alt',
            'SIMILAR_RATING': 'fa-equals',
            'SIMILAR_PRICE': 'fa-coins',
            'TRENDING': 'fa-chart-line',
            'NEW_LISTING': 'fa-sparkles',
            'HIGHLY_REVIEWED': 'fa-comments'
        };
        return icons[reason] || 'fa-check';
    },
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Initialize recommendations section
     */
    async init(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const {
            type = 'personalized', // personalized, popular, similar, destination
            hotelId = null,
            city = null,
            limit = this.config.defaultLimit,
            showReasons = true,
            useHorizontalScroll = window.innerWidth < 1024
        } = options;
        
        // Show loading skeleton
        this.renderSkeleton(containerId, Math.min(limit, 4));
        
        // Fetch recommendations based on type
        let recommendations = [];
        
        try {
            switch (type) {
                case 'personalized':
                    recommendations = Auth.isLoggedIn() ? 
                        await this.getPersonalized(limit) : 
                        await this.getPopular(limit);
                    break;
                case 'popular':
                    recommendations = await this.getPopular(limit);
                    break;
                case 'similar':
                    if (hotelId) {
                        recommendations = await this.getSimilar(hotelId, limit);
                    }
                    break;
                case 'destination':
                    if (city) {
                        recommendations = await this.getDestination(city, limit);
                    }
                    break;
            }
        } catch (error) {
            console.error('Failed to initialize recommendations:', error);
        }
        
        // Render recommendations
        this.render(containerId, recommendations, {
            showReasons,
            useHorizontalScroll,
            emptyMessage: type === 'personalized' ? 
                'Book your first stay to get personalized recommendations' :
                'No recommendations available'
        });
        
        // Track for analytics
        this.trackImpression(recommendations);
    },
    
    /**
     * Track recommendation impressions for analytics
     */
    trackImpression(recommendations) {
        if (!recommendations || recommendations.length === 0) return;
        
        // Could send to analytics endpoint
        console.debug('Recommendation impressions:', recommendations.map(r => r.hotelId));
    }
};

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Auto-init any containers with data-recommendations attribute
        document.querySelectorAll('[data-recommendations]').forEach(el => {
            const options = JSON.parse(el.dataset.recommendations || '{}');
            Recommendations.init(el.id, options);
        });
    });
}
