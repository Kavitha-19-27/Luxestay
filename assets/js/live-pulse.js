/**
 * Live Pulse Module
 * 
 * Shows real-time hotel activity and social proof:
 * - Booking activity indicators
 * - Popularity badges
 * - Recent activity feed
 * - Availability status
 * 
 * Design Philosophy:
 * - Real data only (no fake urgency)
 * - Calm, not pushy
 * - Builds trust through transparency
 */

const LivePulse = {
    // Cache for pulse data (reduces API calls)
    cache: new Map(),
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    
    // Pulse level configurations
    levels: {
        QUIET: {
            icon: 'fa-circle',
            color: 'gray',
            class: 'pulse-quiet',
            animation: false
        },
        STEADY: {
            icon: 'fa-circle',
            color: 'blue',
            class: 'pulse-steady',
            animation: false
        },
        ACTIVE: {
            icon: 'fa-circle',
            color: 'green',
            class: 'pulse-active',
            animation: true
        },
        POPULAR: {
            icon: 'fa-fire',
            color: 'orange',
            class: 'pulse-popular',
            animation: true
        },
        TRENDING: {
            icon: 'fa-bolt',
            color: 'red',
            class: 'pulse-trending',
            animation: true
        }
    },
    
    /**
     * Load and display pulse badge (compact - for hotel cards)
     */
    async loadPulseBadge(container, hotelId) {
        if (!container || !hotelId) return;
        
        // Show skeleton while loading
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        if (!container) return;
        
        container.innerHTML = this.renderSkeleton('badge');
        
        try {
            const pulse = await this.fetchPulse(hotelId, 'badge');
            if (pulse) {
                container.innerHTML = this.renderPulseBadge(pulse);
            } else {
                container.innerHTML = '';
            }
        } catch (error) {
            console.error('Live Pulse badge error:', error);
            container.innerHTML = '';
        }
    },
    
    /**
     * Load and display full pulse card (detailed - for hotel detail page)
     */
    async loadPulseCard(container, hotelId) {
        if (!container || !hotelId) return;
        
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        if (!container) return;
        
        container.innerHTML = this.renderSkeleton('card');
        
        try {
            const pulse = await this.fetchPulse(hotelId, 'full');
            if (pulse) {
                container.innerHTML = this.renderPulseCard(pulse);
                this.initializeCardInteractions(container);
            } else {
                container.innerHTML = this.renderEmptyState();
            }
        } catch (error) {
            console.error('Live Pulse card error:', error);
            container.innerHTML = this.renderError();
        }
    },
    
    /**
     * Fetch pulse data from API
     */
    async fetchPulse(hotelId, type = 'full') {
        const cacheKey = `${hotelId}-${type}`;
        
        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }
        
        // Fetch from API
        const endpoint = type === 'badge' 
            ? `/api/pulse/hotel/${hotelId}/badge`
            : `/api/pulse/hotel/${hotelId}`;
        
        const response = await API.request(endpoint, { method: 'GET' });
        
        if (response?.success && response.data) {
            // Cache the result
            this.cache.set(cacheKey, {
                data: response.data,
                timestamp: Date.now()
            });
            return response.data;
        }
        
        return null;
    },
    
    /**
     * Render compact pulse badge
     */
    renderPulseBadge(pulse) {
        const level = this.levels[pulse.pulseLevel] || this.levels.QUIET;
        
        // Only show badge for active+ pulse levels
        if (pulse.pulseLevel === 'QUIET') {
            return '';
        }
        
        const bookingText = pulse.recentBookings24h > 0 
            ? `${pulse.recentBookings24h} booked today` 
            : '';
        
        return `
            <div class="live-pulse-badge ${level.class}">
                <span class="pulse-dot ${level.animation ? 'pulse-animated' : ''}">
                    <i class="fas ${level.icon}"></i>
                </span>
                <span class="pulse-label">${pulse.pulseLevelLabel || pulse.pulseLevel}</span>
                ${bookingText ? `<span class="pulse-count">${bookingText}</span>` : ''}
            </div>
        `;
    },
    
    /**
     * Render full pulse card with activity feed
     */
    renderPulseCard(pulse) {
        const level = this.levels[pulse.pulseLevel] || this.levels.QUIET;
        const hasActivity = pulse.recentActivity && pulse.recentActivity.length > 0;
        
        return `
            <div class="live-pulse-card ${level.class}">
                <div class="pulse-header">
                    <div class="pulse-indicator ${level.animation ? 'pulse-animated' : ''}">
                        <i class="fas ${level.icon}"></i>
                    </div>
                    <div class="pulse-title">
                        <h4>Live Pulse</h4>
                        <p class="pulse-level-label">${level.class === 'pulse-quiet' ? 'Low activity' : pulse.pulseLevel?.label || pulse.pulseLevel}</p>
                    </div>
                </div>
                
                <div class="pulse-stats">
                    ${this.renderStatItem('calendar-check', pulse.recentBookings24h || 0, 'booked today')}
                    ${this.renderStatItem('calendar-week', pulse.recentBookings7d || 0, 'this week')}
                    ${pulse.availableRooms !== undefined ? this.renderAvailability(pulse) : ''}
                </div>
                
                ${hasActivity ? `
                    <div class="pulse-activity">
                        <h5>Recent Activity</h5>
                        <div class="activity-feed">
                            ${pulse.recentActivity.slice(0, 3).map(activity => this.renderActivityItem(activity)).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${pulse.isPopular ? `
                    <div class="pulse-popular-reason">
                        <i class="fas fa-info-circle"></i>
                        <span>${pulse.popularReason || 'Popular choice'}</span>
                    </div>
                ` : ''}
                
                <div class="pulse-footer">
                    <span class="pulse-updated">
                        <i class="fas fa-sync-alt"></i>
                        Updated ${this.formatLastUpdated(pulse.lastUpdated)}
                    </span>
                </div>
            </div>
        `;
    },
    
    /**
     * Render stat item
     */
    renderStatItem(icon, value, label) {
        return `
            <div class="pulse-stat">
                <i class="fas fa-${icon}"></i>
                <span class="stat-value">${value}</span>
                <span class="stat-label">${label}</span>
            </div>
        `;
    },
    
    /**
     * Render availability section
     */
    renderAvailability(pulse) {
        const available = pulse.availableRooms;
        const total = pulse.totalRooms;
        const isLimited = available <= total * 0.2 && available > 0;
        const isSoldOut = available === 0;
        
        let statusClass = 'available';
        let statusText = `${available} available`;
        
        if (isSoldOut) {
            statusClass = 'sold-out';
            statusText = 'Fully booked today';
        } else if (isLimited) {
            statusClass = 'limited';
            statusText = `Only ${available} left`;
        }
        
        return `
            <div class="pulse-stat pulse-availability ${statusClass}">
                <i class="fas fa-bed"></i>
                <span class="stat-value">${statusText}</span>
                <span class="stat-label">rooms</span>
            </div>
        `;
    },
    
    /**
     * Render activity item
     */
    renderActivityItem(activity) {
        const icon = activity.type === 'BOOKING' ? 'fa-check-circle' : 'fa-eye';
        
        return `
            <div class="activity-item">
                <span class="activity-icon"><i class="fas ${icon}"></i></span>
                <span class="activity-message">${activity.message}</span>
                <span class="activity-time">${activity.timeAgo}</span>
            </div>
        `;
    },
    
    /**
     * Render skeleton loading state
     */
    renderSkeleton(type) {
        if (type === 'badge') {
            return `
                <div class="live-pulse-badge skeleton">
                    <span class="skeleton-dot"></span>
                    <span class="skeleton-text"></span>
                </div>
            `;
        }
        
        return `
            <div class="live-pulse-card skeleton">
                <div class="pulse-header">
                    <div class="skeleton-circle"></div>
                    <div class="skeleton-text-group">
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line short"></div>
                    </div>
                </div>
                <div class="pulse-stats">
                    <div class="skeleton-stat"></div>
                    <div class="skeleton-stat"></div>
                    <div class="skeleton-stat"></div>
                </div>
            </div>
        `;
    },
    
    /**
     * Render empty state (no data)
     */
    renderEmptyState() {
        return `
            <div class="live-pulse-card pulse-empty">
                <div class="pulse-empty-message">
                    <i class="fas fa-chart-line"></i>
                    <span>Activity data unavailable</span>
                </div>
            </div>
        `;
    },
    
    /**
     * Render error state
     */
    renderError() {
        return `
            <div class="live-pulse-card pulse-error">
                <div class="pulse-error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Unable to load activity data</span>
                </div>
            </div>
        `;
    },
    
    /**
     * Format last updated time
     */
    formatLastUpdated(timestamp) {
        if (!timestamp) return 'just now';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        
        return date.toLocaleDateString();
    },
    
    /**
     * Initialize card interactions
     */
    initializeCardInteractions(container) {
        // Add refresh button handler if present
        const refreshBtn = container.querySelector('.pulse-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                const hotelId = refreshBtn.dataset.hotelId;
                if (hotelId) {
                    // Clear cache and reload
                    this.cache.delete(`${hotelId}-full`);
                    this.loadPulseCard(container, hotelId);
                }
            });
        }
    },
    
    /**
     * Clear cache for a hotel
     */
    clearCache(hotelId) {
        if (hotelId) {
            this.cache.delete(`${hotelId}-badge`);
            this.cache.delete(`${hotelId}-full`);
        } else {
            this.cache.clear();
        }
    }
};

// Export for global use
window.LivePulse = LivePulse;
