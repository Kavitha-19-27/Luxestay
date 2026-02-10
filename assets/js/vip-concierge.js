/**
 * VIP Concierge Module
 * Premium support and elevated service experience
 * 
 * Week 12 Feature: VIP guest experience management
 */

window.VIPConcierge = (function() {
    'use strict';
    
    // Tier styles
    const TIER_STYLES = {
        STANDARD: { color: '#6B7280', bg: '#F3F4F6', icon: '🌟' },
        SILVER: { color: '#71717A', bg: '#F4F4F5', icon: '🥈' },
        GOLD: { color: '#D97706', bg: '#FEF3C7', icon: '🥇' },
        PLATINUM: { color: '#7C3AED', bg: '#EDE9FE', icon: '💎' },
        DIAMOND: { color: '#0EA5E9', bg: '#E0F2FE', icon: '👑' }
    };
    
    /**
     * Initialize on profile page
     */
    async function initOnProfilePage(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const token = localStorage.getItem('token');
        if (!token) {
            container.innerHTML = '';
            return;
        }
        
        try {
            container.innerHTML = renderLoadingState();
            const response = await fetchVIPStatus(token);
            
            if (response.success && response.data) {
                container.innerHTML = renderVIPStatus(response.data);
            } else {
                container.innerHTML = '';
            }
        } catch (error) {
            console.error('VIPConcierge: Error loading status:', error);
            container.innerHTML = '';
        }
    }
    
    /**
     * Initialize compact badge (for navbar or sidebar)
     */
    async function initCompactBadge(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const token = localStorage.getItem('token');
        if (!token) {
            container.innerHTML = '';
            return;
        }
        
        try {
            const response = await fetchVIPStatus(token);
            
            if (response.success && response.data && response.data.tier !== 'STANDARD') {
                container.innerHTML = renderCompactBadge(response.data);
            } else {
                container.innerHTML = '';
            }
        } catch (error) {
            console.error('VIPConcierge: Error loading badge:', error);
            container.innerHTML = '';
        }
    }
    
    /**
     * Fetch VIP status from API
     */
    async function fetchVIPStatus(token) {
        const baseUrl = window.CONFIG?.API_BASE_URL || 'https://luxestay-backend-1.onrender.com';
        const response = await fetch(`${baseUrl}/api/vip/status`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return await response.json();
    }
    
    /**
     * Fetch tier progress from API
     */
    async function fetchTierProgress(token) {
        const baseUrl = window.CONFIG?.API_BASE_URL || 'https://luxestay-backend-1.onrender.com';
        const response = await fetch(`${baseUrl}/api/vip/progress`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return await response.json();
    }
    
    /**
     * Render loading state
     */
    function renderLoadingState() {
        return `
            <div class="vip-concierge-section">
                <div class="vip-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading VIP status...</p>
                </div>
            </div>
        `;
    }
    
    /**
     * Render full VIP status
     */
    function renderVIPStatus(status) {
        const tier = status.tier || 'STANDARD';
        const style = TIER_STYLES[tier] || TIER_STYLES.STANDARD;
        
        return `
            <div class="vip-concierge-section" style="--tier-color: ${style.color}; --tier-bg: ${style.bg}">
                <div class="vip-header">
                    <div class="tier-badge tier-${tier.toLowerCase()}">
                        <span class="tier-icon">${style.icon}</span>
                        <div class="tier-info">
                            <span class="tier-name">${getTierDisplayName(tier)} Status</span>
                            <span class="tier-desc">${getTierDescription(tier)}</span>
                        </div>
                    </div>
                    
                    ${status.personalGreeting ? `
                        <p class="vip-greeting">${status.personalGreeting}</p>
                    ` : ''}
                </div>
                
                <div class="vip-stats">
                    <div class="stat-item">
                        <span class="stat-value">${status.totalBookings || 0}</span>
                        <span class="stat-label">Stays</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${status.totalNights || 0}</span>
                        <span class="stat-label">Nights</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${formatPoints(status.loyaltyPoints || 0)}</span>
                        <span class="stat-label">Points</span>
                    </div>
                </div>
                
                ${renderBenefits(status.activeBenefits)}
                
                ${renderServices(status.availableServices)}
                
                ${status.conciergeContact ? renderConciergeContact(status.conciergeContact) : ''}
                
                ${renderTierProgressSection(status)}
            </div>
        `;
    }
    
    /**
     * Render benefits section
     */
    function renderBenefits(benefits) {
        if (!benefits || benefits.length === 0) return '';
        
        const unlockedBenefits = benefits.filter(b => b.unlocked);
        const lockedBenefits = benefits.filter(b => !b.unlocked);
        
        return `
            <div class="vip-benefits">
                <h4 class="section-title">
                    <i class="fas fa-gift"></i>
                    Your Benefits
                </h4>
                
                ${unlockedBenefits.length > 0 ? `
                    <div class="benefits-grid">
                        ${unlockedBenefits.map(benefit => `
                            <div class="benefit-card unlocked">
                                <span class="benefit-icon">${benefit.icon}</span>
                                <div class="benefit-content">
                                    <span class="benefit-title">${benefit.title}</span>
                                    <span class="benefit-desc">${benefit.description}</span>
                                </div>
                                <span class="benefit-status">
                                    <i class="fas fa-check-circle"></i>
                                </span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                ${lockedBenefits.length > 0 ? `
                    <div class="locked-benefits">
                        <h5>Unlock with higher tiers</h5>
                        <div class="benefits-grid locked">
                            ${lockedBenefits.slice(0, 3).map(benefit => `
                                <div class="benefit-card locked">
                                    <span class="benefit-icon">${benefit.icon}</span>
                                    <div class="benefit-content">
                                        <span class="benefit-title">${benefit.title}</span>
                                        <span class="benefit-tier">${getTierDisplayName(benefit.requiredTier)}+</span>
                                    </div>
                                    <span class="benefit-status">
                                        <i class="fas fa-lock"></i>
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * Render services section
     */
    function renderServices(services) {
        if (!services || services.length === 0) return '';
        
        return `
            <div class="vip-services">
                <h4 class="section-title">
                    <i class="fas fa-concierge-bell"></i>
                    Concierge Services
                </h4>
                <div class="services-grid">
                    ${services.map(service => `
                        <div class="service-card ${service.available ? '' : 'unavailable'}">
                            <span class="service-icon">${service.icon}</span>
                            <div class="service-content">
                                <span class="service-name">${service.name}</span>
                                <span class="service-desc">${service.description}</span>
                            </div>
                            ${service.available && service.actionText ? `
                                <button class="service-action" data-action="${service.actionUrl || '#'}">
                                    ${service.actionText}
                                </button>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Render concierge contact
     */
    function renderConciergeContact(contact) {
        return `
            <div class="vip-contact">
                <h4 class="section-title">
                    <i class="fas fa-headset"></i>
                    Your Concierge
                </h4>
                <div class="contact-card">
                    <div class="contact-avatar">
                        <i class="fas fa-user-tie"></i>
                    </div>
                    <div class="contact-info">
                        <span class="contact-name">${contact.name}</span>
                        <span class="contact-title">${contact.title}</span>
                        <span class="contact-availability">
                            <i class="fas fa-clock"></i>
                            ${contact.availability}
                        </span>
                        <span class="contact-response">
                            <i class="fas fa-bolt"></i>
                            Response: ${contact.responseTime}
                        </span>
                    </div>
                    <div class="contact-actions">
                        ${contact.email ? `
                            <a href="mailto:${contact.email}" class="contact-btn">
                                <i class="fas fa-envelope"></i>
                                Email
                            </a>
                        ` : ''}
                        ${contact.phone ? `
                            <a href="tel:${contact.phone}" class="contact-btn primary">
                                <i class="fas fa-phone"></i>
                                Call
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render tier progress section
     */
    function renderTierProgressSection(status) {
        const tier = status.tier || 'STANDARD';
        
        // Don't show progress for Diamond (max tier)
        if (tier === 'DIAMOND') {
            return `
                <div class="vip-achievement">
                    <div class="achievement-badge">
                        <span class="badge-icon">👑</span>
                        <span class="badge-text">Diamond Elite</span>
                    </div>
                    <p class="achievement-message">You've reached our highest tier! Enjoy exclusive benefits and our gratitude for being an exceptional guest.</p>
                </div>
            `;
        }
        
        const nextTier = getNextTier(tier);
        const nextStyle = TIER_STYLES[nextTier] || TIER_STYLES.GOLD;
        
        // Calculate approximate progress
        const tierThresholds = {
            STANDARD: { bookings: 0, nights: 0 },
            SILVER: { bookings: 3, nights: 7 },
            GOLD: { bookings: 7, nights: 20 },
            PLATINUM: { bookings: 15, nights: 50 },
            DIAMOND: { bookings: 30, nights: 100 }
        };
        
        const currentThreshold = tierThresholds[tier] || { bookings: 0, nights: 0 };
        const nextThreshold = tierThresholds[nextTier] || { bookings: 3, nights: 7 };
        
        const bookingProgress = Math.min(100, ((status.totalBookings - currentThreshold.bookings) / 
            (nextThreshold.bookings - currentThreshold.bookings)) * 100);
        const nightProgress = Math.min(100, ((status.totalNights - currentThreshold.nights) / 
            (nextThreshold.nights - currentThreshold.nights)) * 100);
        const avgProgress = Math.round((bookingProgress + nightProgress) / 2);
        
        return `
            <div class="vip-progress">
                <h4 class="section-title">
                    <i class="fas fa-chart-line"></i>
                    Path to ${getTierDisplayName(nextTier)}
                </h4>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${avgProgress}%"></div>
                    </div>
                    <div class="progress-labels">
                        <span class="current-tier">${TIER_STYLES[tier]?.icon || '🌟'} ${getTierDisplayName(tier)}</span>
                        <span class="progress-percent">${avgProgress}%</span>
                        <span class="next-tier">${nextStyle.icon} ${getTierDisplayName(nextTier)}</span>
                    </div>
                </div>
                <div class="progress-requirements">
                    <div class="requirement ${status.totalBookings >= nextThreshold.bookings ? 'met' : ''}">
                        <i class="fas ${status.totalBookings >= nextThreshold.bookings ? 'fa-check-circle' : 'fa-circle'}"></i>
                        <span>${status.totalBookings}/${nextThreshold.bookings} bookings</span>
                    </div>
                    <div class="requirement ${status.totalNights >= nextThreshold.nights ? 'met' : ''}">
                        <i class="fas ${status.totalNights >= nextThreshold.nights ? 'fa-check-circle' : 'fa-circle'}"></i>
                        <span>${status.totalNights}/${nextThreshold.nights} nights</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render compact badge for navbar
     */
    function renderCompactBadge(status) {
        const tier = status.tier || 'STANDARD';
        const style = TIER_STYLES[tier] || TIER_STYLES.STANDARD;
        
        return `
            <a href="profile.html#vip" class="vip-compact-badge tier-${tier.toLowerCase()}" title="${getTierDisplayName(tier)} Member">
                <span class="badge-icon">${style.icon}</span>
                <span class="badge-tier">${getTierDisplayName(tier)}</span>
            </a>
        `;
    }
    
    /**
     * Helper: Get tier display name
     */
    function getTierDisplayName(tier) {
        const names = {
            STANDARD: 'Standard',
            SILVER: 'Silver',
            GOLD: 'Gold',
            PLATINUM: 'Platinum',
            DIAMOND: 'Diamond'
        };
        return names[tier] || tier;
    }
    
    /**
     * Helper: Get tier description
     */
    function getTierDescription(tier) {
        const descriptions = {
            STANDARD: 'Starting your journey',
            SILVER: 'Valued guest',
            GOLD: 'Preferred guest',
            PLATINUM: 'Elite traveler',
            DIAMOND: 'Legendary status'
        };
        return descriptions[tier] || '';
    }
    
    /**
     * Helper: Get next tier
     */
    function getNextTier(tier) {
        const tiers = ['STANDARD', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
        const index = tiers.indexOf(tier);
        return index < tiers.length - 1 ? tiers[index + 1] : null;
    }
    
    /**
     * Helper: Format points
     */
    function formatPoints(points) {
        if (points >= 10000) {
            return (points / 1000).toFixed(1) + 'k';
        }
        return points.toLocaleString();
    }
    
    // Public API
    return {
        initOnProfilePage,
        initCompactBadge,
        fetchVIPStatus,
        fetchTierProgress
    };
})();
