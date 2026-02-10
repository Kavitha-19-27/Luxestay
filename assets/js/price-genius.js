/**
 * Price Genius Module
 * Price comparison insights and deal quality ratings
 * 
 * Features:
 * - Deal rating badges (Excellent, Good, Fair, etc.)
 * - Market comparison visualization
 * - Price trend indicators
 * - Booking timing advice
 * 
 * All data is REAL - calculated from actual market prices
 */

const PriceGenius = (function() {
    'use strict';
    
    const API_BASE = window.API?.BASE_URL || 'https://luxestay-backend-1.onrender.com';
    
    // Deal rating configurations
    const DEAL_CONFIGS = {
        EXCELLENT: {
            label: 'Excellent Deal',
            icon: '🌟',
            class: 'deal-excellent',
            color: '#10B981'
        },
        GOOD: {
            label: 'Good Deal',
            icon: '✓',
            class: 'deal-good',
            color: '#3B82F6'
        },
        FAIR: {
            label: 'Fair Price',
            icon: '○',
            class: 'deal-fair',
            color: '#6B7280'
        },
        AVERAGE: {
            label: 'Market Price',
            icon: '~',
            class: 'deal-average',
            color: '#9CA3AF'
        },
        PREMIUM: {
            label: 'Premium',
            icon: '★',
            class: 'deal-premium',
            color: '#8B5CF6'
        }
    };
    
    // Trend configurations
    const TREND_CONFIGS = {
        INCREASING: {
            icon: '↗',
            label: 'Rising',
            class: 'trend-increasing'
        },
        STABLE: {
            icon: '→',
            label: 'Stable',
            class: 'trend-stable'
        },
        DECREASING: {
            icon: '↘',
            label: 'Falling',
            class: 'trend-decreasing'
        }
    };
    
    // Urgency configurations
    const URGENCY_CONFIGS = {
        BOOK_NOW: {
            label: 'Book Now',
            class: 'urgency-high',
            icon: '🔥'
        },
        BOOK_SOON: {
            label: 'Book Soon',
            class: 'urgency-medium',
            icon: '⏰'
        },
        NO_RUSH: {
            label: 'No Rush',
            class: 'urgency-low',
            icon: '✓'
        },
        WAIT: {
            label: 'Consider Waiting',
            class: 'urgency-wait',
            icon: '⏳'
        }
    };
    
    /**
     * Fetch price insights for a room
     */
    async function getRoomInsights(hotelId, roomId) {
        try {
            const response = await fetch(`${API_BASE}/api/price-genius/hotel/${hotelId}/room/${roomId}`);
            if (!response.ok) {
                console.warn('Could not fetch price insights for room:', roomId);
                return null;
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching room price insights:', error);
            return null;
        }
    }
    
    /**
     * Fetch price insights for a hotel
     */
    async function getHotelInsights(hotelId) {
        try {
            const response = await fetch(`${API_BASE}/api/price-genius/hotel/${hotelId}`);
            if (!response.ok) {
                console.warn('Could not fetch hotel price insights:', hotelId);
                return null;
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching hotel price insights:', error);
            return null;
        }
    }
    
    /**
     * Render a deal badge
     */
    function renderDealBadge(dealRating) {
        if (!dealRating || !DEAL_CONFIGS[dealRating]) {
            return '';
        }
        
        const config = DEAL_CONFIGS[dealRating];
        return `
            <span class="price-genius-badge ${config.class}">
                <span class="badge-icon">${config.icon}</span>
                <span class="badge-label">${config.label}</span>
            </span>
        `;
    }
    
    /**
     * Render a compact deal indicator (for room cards)
     */
    function renderCompactDeal(dealRating, savingsPercent) {
        if (!dealRating || !DEAL_CONFIGS[dealRating]) {
            return '';
        }
        
        const config = DEAL_CONFIGS[dealRating];
        let savingsText = '';
        
        if (savingsPercent && savingsPercent > 0) {
            savingsText = `<span class="savings-percent">Save ${Math.round(savingsPercent)}%</span>`;
        }
        
        return `
            <div class="price-genius-compact ${config.class}">
                <span class="compact-icon">${config.icon}</span>
                <span class="compact-label">${config.label}</span>
                ${savingsText}
            </div>
        `;
    }
    
    /**
     * Render price trend indicator
     */
    function renderTrendIndicator(trend) {
        if (!trend || !TREND_CONFIGS[trend]) {
            return '';
        }
        
        const config = TREND_CONFIGS[trend];
        return `
            <span class="price-trend ${config.class}">
                <span class="trend-icon">${config.icon}</span>
                <span class="trend-label">${config.label}</span>
            </span>
        `;
    }
    
    /**
     * Render booking advice card
     */
    function renderBookingAdvice(advice) {
        if (!advice) {
            return '';
        }
        
        const urgencyConfig = URGENCY_CONFIGS[advice.urgency] || URGENCY_CONFIGS.NO_RUSH;
        
        return `
            <div class="price-genius-advice ${urgencyConfig.class}">
                <div class="advice-header">
                    <span class="advice-icon">${urgencyConfig.icon}</span>
                    <span class="advice-urgency">${urgencyConfig.label}</span>
                </div>
                <div class="advice-content">
                    <p class="advice-recommendation">${advice.recommendation || ''}</p>
                    <p class="advice-reasoning">${advice.reasoning || ''}</p>
                </div>
            </div>
        `;
    }
    
    /**
     * Render market comparison
     */
    function renderMarketComparison(insights) {
        if (!insights || !insights.marketAverage) {
            return '';
        }
        
        const currentPrice = insights.currentPrice || 0;
        const marketAverage = insights.marketAverage || 0;
        const savingsVsMarket = insights.savingsVsMarket || 0;
        
        // Calculate bar widths
        const maxPrice = Math.max(currentPrice, marketAverage) * 1.1;
        const currentWidth = (currentPrice / maxPrice) * 100;
        const marketWidth = (marketAverage / maxPrice) * 100;
        
        const savingsClass = savingsVsMarket > 0 ? 'savings-positive' : (savingsVsMarket < 0 ? 'savings-negative' : '');
        const savingsText = savingsVsMarket > 0 
            ? `You save ₹${savingsVsMarket.toLocaleString('en-IN')}/night` 
            : (savingsVsMarket < 0 ? `₹${Math.abs(savingsVsMarket).toLocaleString('en-IN')} above average` : 'At market average');
        
        return `
            <div class="price-genius-comparison">
                <h4 class="comparison-title">Price Comparison</h4>
                
                <div class="comparison-bars">
                    <div class="comparison-row">
                        <span class="bar-label">This room</span>
                        <div class="bar-container">
                            <div class="bar bar-current" style="width: ${currentWidth}%"></div>
                        </div>
                        <span class="bar-value">₹${currentPrice.toLocaleString('en-IN')}</span>
                    </div>
                    
                    <div class="comparison-row">
                        <span class="bar-label">Area avg</span>
                        <div class="bar-container">
                            <div class="bar bar-market" style="width: ${marketWidth}%"></div>
                        </div>
                        <span class="bar-value">₹${marketAverage.toLocaleString('en-IN')}</span>
                    </div>
                </div>
                
                <p class="comparison-savings ${savingsClass}">${savingsText}</p>
            </div>
        `;
    }
    
    /**
     * Render price insight message
     */
    function renderPriceInsight(insights) {
        if (!insights || !insights.priceInsight) {
            return '';
        }
        
        const config = DEAL_CONFIGS[insights.dealRating] || DEAL_CONFIGS.FAIR;
        
        return `
            <div class="price-genius-insight" style="border-left-color: ${config.color}">
                <p class="insight-text">${insights.priceInsight}</p>
            </div>
        `;
    }
    
    /**
     * Render the full Price Genius widget
     */
    function renderWidget(containerId, insights) {
        const container = document.getElementById(containerId);
        if (!container || !insights) {
            return;
        }
        
        container.innerHTML = `
            <div class="price-genius-widget">
                <div class="widget-header">
                    <h3 class="widget-title">
                        <span class="title-icon">💡</span>
                        Price Insights
                    </h3>
                    ${renderDealBadge(insights.dealRating)}
                </div>
                
                <div class="widget-body">
                    ${renderPriceInsight(insights)}
                    ${renderMarketComparison(insights)}
                    
                    <div class="widget-row">
                        <div class="trend-section">
                            <span class="section-label">Price Trend</span>
                            ${renderTrendIndicator(insights.trend)}
                        </div>
                    </div>
                    
                    ${renderBookingAdvice(insights.bookingAdvice)}
                </div>
            </div>
        `;
    }
    
    /**
     * Initialize Price Genius for a room
     */
    async function initForRoom(containerId, hotelId, roomId) {
        const insights = await getRoomInsights(hotelId, roomId);
        if (insights) {
            renderWidget(containerId, insights);
        }
    }
    
    /**
     * Initialize Price Genius for a hotel
     */
    async function initForHotel(containerId, hotelId) {
        const insights = await getHotelInsights(hotelId);
        if (insights) {
            renderWidget(containerId, insights);
        }
    }
    
    /**
     * Add deal badge to a room card
     */
    async function addBadgeToRoomCard(cardElement, hotelId, roomId) {
        const insights = await getRoomInsights(hotelId, roomId);
        if (!insights || !insights.dealRating) {
            return;
        }
        
        // Find or create badge container
        let badgeContainer = cardElement.querySelector('.price-genius-badge-container');
        if (!badgeContainer) {
            badgeContainer = document.createElement('div');
            badgeContainer.className = 'price-genius-badge-container';
            
            // Insert at top of card
            cardElement.insertBefore(badgeContainer, cardElement.firstChild);
        }
        
        badgeContainer.innerHTML = renderCompactDeal(insights.dealRating, insights.savingsPercent);
    }
    
    /**
     * Add deal badges to all room cards on the page
     */
    async function enhanceRoomCards(hotelId) {
        const roomCards = document.querySelectorAll('[data-room-id]');
        
        for (const card of roomCards) {
            const roomId = card.getAttribute('data-room-id');
            if (roomId) {
                await addBadgeToRoomCard(card, hotelId, roomId);
            }
        }
    }
    
    // Public API
    return {
        getRoomInsights,
        getHotelInsights,
        renderDealBadge,
        renderCompactDeal,
        renderTrendIndicator,
        renderBookingAdvice,
        renderMarketComparison,
        renderWidget,
        initForRoom,
        initForHotel,
        addBadgeToRoomCard,
        enhanceRoomCards,
        DEAL_CONFIGS,
        TREND_CONFIGS,
        URGENCY_CONFIGS
    };
})();

// Export for global access
window.PriceGenius = PriceGenius;
