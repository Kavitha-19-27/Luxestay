/**
 * TrustScore Module
 * 
 * Displays deterministic, explainable trust metrics for hotels.
 * Follows the platform's premium, calm UI philosophy.
 * 
 * Features:
 * - Score badge (0-100) with level indicator
 * - Verified stay badge for authentic reviews
 * - Top praises (what guests love)
 * - Top concerns (honest transparency)
 * - Score breakdown (full transparency)
 * 
 * Design Principles:
 * - Calm and reassuring, not aggressive
 * - Explainable - users understand every component
 * - Mobile-first, expand-on-tap for details
 * - No fake urgency or dark patterns
 */

const TrustScore = {
    
    // Cache for trust scores to reduce API calls
    cache: new Map(),
    
    // =====================================================
    // PUBLIC: Load TrustScore for hotel detail page
    // =====================================================
    
    async loadHotelTrustScore(hotelId, container) {
        if (!container) return;
        
        // Show skeleton loading
        container.innerHTML = this.renderSkeleton();
        
        try {
            const trustScore = await this.fetchTrustScore(hotelId);
            container.innerHTML = this.renderTrustScoreCard(trustScore);
            
            // Initialize interactions
            this.initInteractions(container);
            
            // Animate score count-up
            this.animateScore(container, trustScore.score);
            
        } catch (error) {
            console.error('Error loading trust score:', error);
            container.innerHTML = this.renderError();
        }
    },
    
    // =====================================================
    // PUBLIC: Render compact badge for hotel cards
    // =====================================================
    
    async loadTrustBadge(hotelId, container) {
        if (!container) return;
        
        try {
            const summary = await this.fetchTrustScoreSummary(hotelId);
            container.innerHTML = this.renderTrustBadge(summary);
        } catch (error) {
            console.error('Error loading trust badge:', error);
            container.innerHTML = '';
        }
    },
    
    // =====================================================
    // API: Fetch trust score data
    // =====================================================
    
    async fetchTrustScore(hotelId) {
        // Check cache first
        const cacheKey = `full_${hotelId}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        const response = await API.get(`/trust/hotel/${hotelId}`);
        this.cache.set(cacheKey, response);
        return response;
    },
    
    async fetchTrustScoreSummary(hotelId) {
        const cacheKey = `summary_${hotelId}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        const response = await API.get(`/trust/hotel/${hotelId}/summary`);
        this.cache.set(cacheKey, response);
        return response;
    },
    
    // =====================================================
    // RENDER: Full TrustScore card for hotel detail page
    // =====================================================
    
    renderTrustScoreCard(data) {
        const levelClass = this.getLevelClass(data.level);
        const scoreDisplay = data.hasEnoughData ? data.score : '—';
        
        return `
            <div class="trust-score-card ${levelClass}">
                <!-- Main Score Section -->
                <div class="trust-score-header">
                    <div class="trust-score-main">
                        <div class="trust-score-circle">
                            <span class="trust-score-value" data-score="${data.score}">${scoreDisplay}</span>
                            <span class="trust-score-max">/100</span>
                        </div>
                        <div class="trust-score-level">
                            <span class="trust-level-badge ${levelClass}">${data.level}</span>
                            ${data.hasEnoughData ? '' : '<span class="trust-new-badge">New Hotel</span>'}
                        </div>
                    </div>
                    
                    <div class="trust-score-summary">
                        <div class="trust-verified-count">
                            <i class="fas fa-shield-check"></i>
                            <span>${data.verifiedReviewCount} verified reviews</span>
                        </div>
                        ${data.averageRating > 0 ? `
                            <div class="trust-avg-rating">
                                <i class="fas fa-star"></i>
                                <span>${data.averageRating.toFixed(1)} average rating</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Explanation -->
                <p class="trust-explanation">${data.explanation}</p>
                
                ${data.hasEnoughData ? this.renderPraisesAndConcerns(data) : ''}
                
                <!-- Expandable Breakdown -->
                ${data.hasEnoughData ? this.renderBreakdown(data.breakdown) : ''}
            </div>
        `;
    },
    
    renderPraisesAndConcerns(data) {
        if (!data.topPraises?.length && !data.topConcerns?.length) {
            return '';
        }
        
        let html = '<div class="trust-insights">';
        
        // Praises
        if (data.topPraises?.length > 0) {
            html += `
                <div class="trust-praises">
                    <h4 class="trust-insights-title">
                        <i class="fas fa-heart"></i>
                        What Guests Love
                    </h4>
                    <div class="trust-insights-list">
                        ${data.topPraises.map(praise => `
                            <div class="trust-insight-item praise">
                                <i class="fas ${praise.icon}"></i>
                                <div class="trust-insight-content">
                                    <span class="trust-insight-category">${praise.category}</span>
                                    <span class="trust-insight-detail">${praise.description}</span>
                                </div>
                                <span class="trust-mention-count">${praise.mentionCount} mentions</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Concerns (honest transparency)
        if (data.topConcerns?.length > 0) {
            html += `
                <div class="trust-concerns">
                    <h4 class="trust-insights-title">
                        <i class="fas fa-info-circle"></i>
                        Good to Know
                    </h4>
                    <div class="trust-insights-list">
                        ${data.topConcerns.map(concern => `
                            <div class="trust-insight-item concern ${concern.severity}">
                                <i class="fas ${concern.icon}"></i>
                                <div class="trust-insight-content">
                                    <span class="trust-insight-category">${concern.category}</span>
                                    <span class="trust-insight-detail">${concern.description}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    },
    
    renderBreakdown(breakdown) {
        if (!breakdown) return '';
        
        const components = [
            breakdown.reviewVolume,
            breakdown.ratingQuality,
            breakdown.consistency,
            breakdown.recency,
            breakdown.hotelEngagement
        ].filter(Boolean);
        
        return `
            <div class="trust-breakdown">
                <button class="trust-breakdown-toggle" aria-expanded="false">
                    <span>How is this score calculated?</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                
                <div class="trust-breakdown-content" hidden>
                    <p class="trust-breakdown-intro">
                        TrustScore is calculated from verified guest reviews using a transparent formula:
                    </p>
                    
                    <div class="trust-breakdown-components">
                        ${components.map(comp => `
                            <div class="trust-component">
                                <div class="trust-component-header">
                                    <span class="trust-component-name">${comp.name}</span>
                                    <span class="trust-component-score">${comp.points}/${comp.maxPoints}</span>
                                </div>
                                <div class="trust-component-bar">
                                    <div class="trust-component-fill" style="width: ${(comp.points / comp.maxPoints) * 100}%"></div>
                                </div>
                                <p class="trust-component-explanation">${comp.explanation}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },
    
    // =====================================================
    // RENDER: Compact badge for hotel listing cards
    // =====================================================
    
    renderTrustBadge(summary) {
        if (!summary) return '';
        
        const levelClass = this.getLevelClass(summary.level);
        
        // For new hotels, show "New" badge instead of score
        if (!summary.hasEnoughData || summary.verifiedReviewCount === 0) {
            return `
                <div class="trust-badge trust-badge-new" title="New to LuxeStay">
                    <i class="fas fa-sparkles"></i>
                    <span>New</span>
                </div>
            `;
        }
        
        return `
            <div class="trust-badge ${levelClass}" title="TrustScore: ${summary.score}/100 - ${summary.level}">
                <i class="fas fa-shield-check"></i>
                <span class="trust-badge-score">${summary.score}</span>
                <span class="trust-badge-level">${summary.level}</span>
            </div>
        `;
    },
    
    // =====================================================
    // RENDER: Skeleton loading state
    // =====================================================
    
    renderSkeleton() {
        return `
            <div class="trust-score-card skeleton">
                <div class="trust-score-header">
                    <div class="trust-score-main">
                        <div class="skeleton-circle"></div>
                        <div class="skeleton-text"></div>
                    </div>
                </div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
            </div>
        `;
    },
    
    renderError() {
        return `
            <div class="trust-score-card trust-score-error">
                <p class="trust-error-message">
                    <i class="fas fa-info-circle"></i>
                    Trust score temporarily unavailable
                </p>
            </div>
        `;
    },
    
    // =====================================================
    // INTERACTIONS: Toggle breakdown, animations
    // =====================================================
    
    initInteractions(container) {
        const toggle = container.querySelector('.trust-breakdown-toggle');
        const content = container.querySelector('.trust-breakdown-content');
        
        if (toggle && content) {
            toggle.addEventListener('click', () => {
                const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
                toggle.setAttribute('aria-expanded', !isExpanded);
                content.hidden = isExpanded;
                
                // Animate chevron
                const chevron = toggle.querySelector('i');
                if (chevron) {
                    chevron.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
                }
                
                // Animate bars when expanded
                if (!isExpanded) {
                    this.animateBreakdownBars(container);
                }
            });
        }
    },
    
    animateScore(container, targetScore) {
        const scoreEl = container.querySelector('.trust-score-value');
        if (!scoreEl || targetScore === 0) return;
        
        const duration = 1000;
        const startTime = performance.now();
        const startValue = 0;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.round(startValue + (targetScore - startValue) * easeProgress);
            
            scoreEl.textContent = currentValue;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    },
    
    animateBreakdownBars(container) {
        const bars = container.querySelectorAll('.trust-component-fill');
        
        bars.forEach((bar, index) => {
            const targetWidth = bar.style.width;
            bar.style.width = '0%';
            
            setTimeout(() => {
                bar.style.transition = 'width 0.5s ease-out';
                bar.style.width = targetWidth;
            }, index * 100);
        });
    },
    
    // =====================================================
    // HELPERS
    // =====================================================
    
    getLevelClass(level) {
        const levelMap = {
            'Excellent': 'level-excellent',
            'Very Good': 'level-very-good',
            'Good': 'level-good',
            'Fair': 'level-fair',
            'New': 'level-new'
        };
        return levelMap[level] || 'level-new';
    },
    
    // Clear cache (call when reviews are updated)
    clearCache(hotelId = null) {
        if (hotelId) {
            this.cache.delete(`full_${hotelId}`);
            this.cache.delete(`summary_${hotelId}`);
        } else {
            this.cache.clear();
        }
    }
};

// Make globally available
window.TrustScore = TrustScore;
