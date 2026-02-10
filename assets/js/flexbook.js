/**
 * FlexBook Module
 * 
 * Displays clear, visual cancellation policy information.
 * No hidden rules. No fine print. Just honest transparency.
 * 
 * Features:
 * - Policy badge (Flexible/Moderate/Strict)
 * - Visual timeline showing refund deadlines
 * - Calculated refund amounts
 * - Human-readable deadlines
 * 
 * Design Principles:
 * - Calm and reassuring, not scary
 * - Visual clarity over text density
 * - Mobile-first, tap-to-expand
 * - Helps users make confident decisions
 */

const FlexBook = {
    
    // Cache for policy data
    cache: new Map(),
    
    // =====================================================
    // PUBLIC: Load policy badge for room cards
    // =====================================================
    
    async loadPolicyBadge(roomId, container) {
        if (!container) return;
        
        try {
            const policy = await this.fetchRoomPolicy(roomId);
            container.innerHTML = this.renderPolicyBadge(policy);
        } catch (error) {
            console.error('Error loading policy badge:', error);
            container.innerHTML = '';
        }
    },
    
    // =====================================================
    // PUBLIC: Load full policy card for booking page
    // =====================================================
    
    async loadPolicyCard(roomId, checkIn, checkOut, container) {
        if (!container) return;
        
        // Show skeleton while loading
        container.innerHTML = this.renderSkeleton();
        
        try {
            const policy = await this.fetchPolicyForDates(roomId, checkIn, checkOut);
            container.innerHTML = this.renderPolicyCard(policy);
            this.initInteractions(container);
        } catch (error) {
            console.error('Error loading policy card:', error);
            container.innerHTML = this.renderError();
        }
    },
    
    // =====================================================
    // PUBLIC: Load policy for existing booking
    // =====================================================
    
    async loadBookingPolicy(bookingId, container) {
        if (!container) return;
        
        container.innerHTML = this.renderSkeleton();
        
        try {
            const policy = await this.fetchBookingPolicy(bookingId);
            container.innerHTML = this.renderBookingPolicyCard(policy);
            this.initInteractions(container);
        } catch (error) {
            console.error('Error loading booking policy:', error);
            container.innerHTML = this.renderError();
        }
    },
    
    // =====================================================
    // API: Fetch policy data
    // =====================================================
    
    async fetchRoomPolicy(roomId) {
        const cacheKey = `room_${roomId}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        const response = await API.get(`/policies/room/${roomId}`);
        this.cache.set(cacheKey, response);
        return response;
    },
    
    async fetchPolicyForDates(roomId, checkIn, checkOut) {
        // Don't cache date-specific calculations
        const response = await API.get(
            `/policies/room/${roomId}/calculate?checkIn=${checkIn}&checkOut=${checkOut}`
        );
        return response;
    },
    
    async fetchBookingPolicy(bookingId) {
        const response = await API.get(`/policies/booking/${bookingId}`);
        return response;
    },
    
    async fetchRefundCalculation(bookingId) {
        const response = await API.get(`/policies/booking/${bookingId}/refund`);
        return response;
    },
    
    // =====================================================
    // RENDER: Policy Badge (compact for room cards)
    // =====================================================
    
    renderPolicyBadge(policy) {
        if (!policy) return '';
        
        const colorClass = this.getColorClass(policy.colorTheme);
        
        return `
            <div class="flexbook-badge ${colorClass}" title="${policy.summary}">
                <i class="fas ${policy.icon}"></i>
                <span class="flexbook-badge-text">${policy.policyName}</span>
            </div>
        `;
    },
    
    // =====================================================
    // RENDER: Full Policy Card (for booking page)
    // =====================================================
    
    renderPolicyCard(policy) {
        if (!policy) return '';
        
        const colorClass = this.getColorClass(policy.colorTheme);
        const hasDeadline = policy.freeCancellationDeadlineDate && policy.freeCancellationAvailable;
        
        return `
            <div class="flexbook-card ${colorClass}">
                <div class="flexbook-header">
                    <div class="flexbook-title-row">
                        <div class="flexbook-icon">
                            <i class="fas ${policy.icon}"></i>
                        </div>
                        <div class="flexbook-title">
                            <h4>${policy.policyName} Cancellation</h4>
                            <p class="flexbook-summary">${policy.summary}</p>
                        </div>
                    </div>
                    
                    ${hasDeadline ? this.renderDeadlineAlert(policy) : ''}
                </div>
                
                ${policy.timeline ? this.renderTimeline(policy.timeline) : ''}
                
                <div class="flexbook-details">
                    <button class="flexbook-details-toggle" aria-expanded="false">
                        <span>View full policy details</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    
                    <div class="flexbook-details-content" hidden>
                        <p class="flexbook-full-description">${policy.fullDescription}</p>
                        <p class="flexbook-refund-timeline">
                            <i class="fas fa-clock"></i>
                            ${policy.refundTimeline}
                        </p>
                    </div>
                </div>
            </div>
        `;
    },
    
    renderDeadlineAlert(policy) {
        const urgencyClass = policy.daysUntilDeadline <= 1 ? 'urgent' : 
                            policy.daysUntilDeadline <= 3 ? 'soon' : 'calm';
        
        return `
            <div class="flexbook-deadline ${urgencyClass}">
                <i class="fas fa-shield-check"></i>
                <div class="flexbook-deadline-content">
                    <span class="flexbook-deadline-label">Free cancellation until</span>
                    <span class="flexbook-deadline-date">${policy.freeCancellationDeadline}</span>
                </div>
            </div>
        `;
    },
    
    renderTimeline(timeline) {
        if (!timeline || timeline.length === 0) return '';
        
        return `
            <div class="flexbook-timeline">
                <div class="flexbook-timeline-track">
                    ${timeline.map((milestone, index) => `
                        <div class="flexbook-milestone ${milestone.status} ${milestone.isDeadline ? 'deadline' : ''}"
                             style="left: ${this.calculateMilestonePosition(index, timeline.length)}%">
                            <div class="flexbook-milestone-dot"></div>
                            <div class="flexbook-milestone-content">
                                <span class="flexbook-milestone-label">${milestone.label}</span>
                                <span class="flexbook-milestone-desc">${milestone.description}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },
    
    calculateMilestonePosition(index, total) {
        // Distribute milestones evenly along the track
        if (total <= 1) return 50;
        return (index / (total - 1)) * 100;
    },
    
    // =====================================================
    // RENDER: Booking Policy Card (for my-bookings page)
    // =====================================================
    
    renderBookingPolicyCard(policy) {
        if (!policy) return '';
        
        const colorClass = this.getColorClass(policy.colorTheme);
        const canRefund = policy.freeCancellationAvailable;
        
        let refundSection = '';
        if (policy.refundAmountIfCancelledNow !== null && policy.refundAmountIfCancelledNow !== undefined) {
            const refundFormatted = UI.formatCurrency(policy.refundAmountIfCancelledNow);
            refundSection = `
                <div class="flexbook-refund-preview">
                    <span class="flexbook-refund-label">If cancelled now:</span>
                    <span class="flexbook-refund-amount ${policy.refundPercentage === 100 ? 'full' : 'partial'}">
                        ${policy.refundPercentage}% refund (${refundFormatted})
                    </span>
                </div>
            `;
        }
        
        return `
            <div class="flexbook-card flexbook-card-booking ${colorClass}">
                <div class="flexbook-header">
                    <div class="flexbook-title-row">
                        <div class="flexbook-icon">
                            <i class="fas ${policy.icon}"></i>
                        </div>
                        <div class="flexbook-title">
                            <h4>${policy.policyName} Cancellation</h4>
                            ${canRefund ? 
                                `<p class="flexbook-status flexbook-status-ok">
                                    <i class="fas fa-check-circle"></i>
                                    Free cancellation available
                                </p>` :
                                `<p class="flexbook-status flexbook-status-expired">
                                    <i class="fas fa-info-circle"></i>
                                    Free cancellation period ended
                                </p>`
                            }
                        </div>
                    </div>
                </div>
                
                ${refundSection}
                
                <div class="flexbook-details">
                    <button class="flexbook-details-toggle" aria-expanded="false">
                        <span>View policy details</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    
                    <div class="flexbook-details-content" hidden>
                        <p class="flexbook-full-description">${policy.fullDescription}</p>
                        <p class="flexbook-refund-timeline">
                            <i class="fas fa-clock"></i>
                            ${policy.refundTimeline}
                        </p>
                    </div>
                </div>
            </div>
        `;
    },
    
    // =====================================================
    // RENDER: Skeleton & Error states
    // =====================================================
    
    renderSkeleton() {
        return `
            <div class="flexbook-card skeleton">
                <div class="flexbook-header">
                    <div class="skeleton-icon"></div>
                    <div class="skeleton-text-group">
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line short"></div>
                    </div>
                </div>
            </div>
        `;
    },
    
    renderError() {
        return `
            <div class="flexbook-card flexbook-error">
                <p class="flexbook-error-message">
                    <i class="fas fa-info-circle"></i>
                    Policy details temporarily unavailable
                </p>
            </div>
        `;
    },
    
    // =====================================================
    // INTERACTIONS
    // =====================================================
    
    initInteractions(container) {
        const toggle = container.querySelector('.flexbook-details-toggle');
        const content = container.querySelector('.flexbook-details-content');
        
        if (toggle && content) {
            toggle.addEventListener('click', () => {
                const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
                toggle.setAttribute('aria-expanded', !isExpanded);
                content.hidden = isExpanded;
                
                const chevron = toggle.querySelector('i');
                if (chevron) {
                    chevron.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
                }
            });
        }
    },
    
    // =====================================================
    // HELPERS
    // =====================================================
    
    getColorClass(colorTheme) {
        const themeMap = {
            'green': 'flexbook-green',
            'blue': 'flexbook-blue',
            'orange': 'flexbook-orange'
        };
        return themeMap[colorTheme] || 'flexbook-blue';
    },
    
    clearCache(roomId = null) {
        if (roomId) {
            this.cache.delete(`room_${roomId}`);
        } else {
            this.cache.clear();
        }
    }
};

// Make globally available
window.FlexBook = FlexBook;
