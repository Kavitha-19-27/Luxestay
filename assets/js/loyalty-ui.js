/**
 * Loyalty Program UI Module
 * Responsive tier badges and progress indicators
 * 
 * FEATURES:
 * - Mobile-friendly progress bars
 * - Animated tier badges
 * - XP transaction history
 * - Rewards display
 * 
 * NOTE: All calculations done server-side, 
 * this is display-only (no client-side reward logic)
 */

const LoyaltyUI = (function() {
    'use strict';
    
    // Tier configurations (visual only, calculations are server-side)
    const TIER_CONFIG = {
        BRONZE: { color: '#CD7F32', icon: 'medal', gradient: 'linear-gradient(135deg, #CD7F32, #A0522D)' },
        SILVER: { color: '#C0C0C0', icon: 'medal', gradient: 'linear-gradient(135deg, #C0C0C0, #A8A8A8)' },
        GOLD: { color: '#FFD700', icon: 'crown', gradient: 'linear-gradient(135deg, #FFD700, #FFA500)' },
        PLATINUM: { color: '#E5E4E2', icon: 'gem', gradient: 'linear-gradient(135deg, #E5E4E2, #B4B4B4)' },
        DIAMOND: { color: '#B9F2FF', icon: 'gem', gradient: 'linear-gradient(135deg, #B9F2FF, #7DF9FF)' }
    };
    
    // ==================== INITIALIZATION ====================
    
    function init(container, loyaltyData) {
        if (!container || !loyaltyData) return;
        
        container.innerHTML = renderDashboard(loyaltyData);
        
        // Initialize animations after render
        requestAnimationFrame(() => {
            initProgressAnimations(container);
            initBadgeAnimations(container);
        });
    }
    
    // ==================== MAIN DASHBOARD RENDER ====================
    
    function renderDashboard(data) {
        const profile = data.profile;
        const tierConfig = TIER_CONFIG[profile.currentLevel.name] || TIER_CONFIG.BRONZE;
        
        return `
            <div class="loyalty-dashboard">
                <!-- Tier Header -->
                <div class="loyalty-header" style="background: ${tierConfig.gradient}">
                    <div class="tier-badge-large">
                        <i class="fas fa-${tierConfig.icon}"></i>
                    </div>
                    <div class="tier-info">
                        <span class="tier-label">Current Tier</span>
                        <h2 class="tier-name">${profile.currentLevel.displayName}</h2>
                        <span class="member-since">Member since ${formatDate(profile.memberSince)}</span>
                    </div>
                </div>
                
                <!-- XP Progress -->
                <div class="loyalty-xp-section">
                    ${renderXpProgress(profile, data.profile.nextLevel)}
                </div>
                
                <!-- Quick Stats -->
                <div class="loyalty-stats-grid">
                    ${renderStatCard('Lifetime XP', profile.lifetimeXp.toLocaleString(), 'star', 'purple')}
                    ${renderStatCard('Total Stays', profile.totalBookings, 'bed', 'blue')}
                    ${renderStatCard('Nights Stayed', profile.totalNights, 'moon', 'indigo')}
                    ${renderStatCard('Reviews', profile.totalReviews, 'comment', 'green')}
                </div>
                
                <!-- Badges Section -->
                ${data.allBadges ? renderBadgesSection(data.allBadges) : ''}
                
                <!-- Recent Activity -->
                ${data.recentActivity ? renderActivitySection(data.recentActivity) : ''}
                
                <!-- Available Rewards -->
                ${data.availableRewards ? renderRewardsSection(data.availableRewards, profile.currentXp) : ''}
            </div>
        `;
    }
    
    // ==================== XP PROGRESS ====================
    
    function renderXpProgress(profile, nextLevel) {
        const currentXp = profile.currentXp;
        const xpToNext = nextLevel ? profile.xpToNextLevel : 0;
        const progress = nextLevel ? profile.progressToNextLevel : 100;
        const nextTierConfig = nextLevel ? (TIER_CONFIG[nextLevel.name] || TIER_CONFIG.SILVER) : null;
        
        return `
            <div class="xp-progress-card">
                <div class="xp-header">
                    <div class="xp-current">
                        <span class="xp-value">${currentXp.toLocaleString()}</span>
                        <span class="xp-label">Available XP</span>
                    </div>
                    ${nextLevel ? `
                        <div class="xp-next">
                            <span class="xp-needed">${xpToNext.toLocaleString()} XP</span>
                            <span class="xp-label">to ${nextLevel.displayName}</span>
                        </div>
                    ` : `
                        <div class="xp-max">
                            <i class="fas fa-crown"></i>
                            <span>Max Level!</span>
                        </div>
                    `}
                </div>
                
                <div class="xp-progress-bar">
                    <div class="xp-progress-fill" 
                         data-progress="${progress}"
                         style="width: 0%; ${nextTierConfig ? `background: ${nextTierConfig.gradient}` : ''}">
                    </div>
                </div>
                
                <div class="xp-progress-labels">
                    <span>${profile.currentLevel.displayName}</span>
                    ${nextLevel ? `<span>${nextLevel.displayName}</span>` : ''}
                </div>
            </div>
        `;
    }
    
    // ==================== STAT CARDS ====================
    
    function renderStatCard(label, value, icon, color) {
        return `
            <div class="loyalty-stat-card stat-${color}">
                <div class="stat-icon">
                    <i class="fas fa-${icon}"></i>
                </div>
                <div class="stat-content">
                    <span class="stat-value">${value}</span>
                    <span class="stat-label">${label}</span>
                </div>
            </div>
        `;
    }
    
    // ==================== BADGES SECTION ====================
    
    function renderBadgesSection(badges) {
        const unlockedBadges = badges.filter(b => b.isUnlocked);
        const lockedBadges = badges.filter(b => !b.isUnlocked);
        
        return `
            <div class="loyalty-section">
                <h3 class="section-title">
                    <i class="fas fa-award"></i>
                    Your Badges
                    <span class="badge-count">${unlockedBadges.length}/${badges.length}</span>
                </h3>
                
                <div class="badges-grid">
                    ${unlockedBadges.map(badge => renderBadge(badge, true)).join('')}
                    ${lockedBadges.slice(0, 3).map(badge => renderBadge(badge, false)).join('')}
                </div>
                
                ${lockedBadges.length > 3 ? `
                    <button class="btn-see-more" onclick="LoyaltyUI.showAllBadges()">
                        View all ${badges.length} badges
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    function renderBadge(badge, unlocked) {
        return `
            <div class="badge-item ${unlocked ? 'unlocked' : 'locked'}" 
                 data-badge-id="${badge.id}">
                <div class="badge-icon" style="${unlocked && badge.color ? `background: ${badge.color}` : ''}">
                    <i class="fas fa-${badge.icon || 'trophy'}"></i>
                    ${!unlocked ? '<div class="badge-lock"><i class="fas fa-lock"></i></div>' : ''}
                </div>
                <div class="badge-info">
                    <span class="badge-name">${badge.name}</span>
                    <span class="badge-desc">${unlocked ? formatDate(badge.unlockedAt) : badge.description}</span>
                </div>
                ${!unlocked && badge.progress !== undefined ? `
                    <div class="badge-progress">
                        <div class="badge-progress-bar">
                            <div class="badge-progress-fill" style="width: ${badge.progress}%"></div>
                        </div>
                        <span class="badge-progress-text">${badge.progressText || `${badge.progress}%`}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // ==================== ACTIVITY SECTION ====================
    
    function renderActivitySection(activities) {
        if (!activities || activities.length === 0) return '';
        
        return `
            <div class="loyalty-section">
                <h3 class="section-title">
                    <i class="fas fa-history"></i>
                    Recent Activity
                </h3>
                
                <div class="activity-list">
                    ${activities.map(renderActivityItem).join('')}
                </div>
            </div>
        `;
    }
    
    function renderActivityItem(activity) {
        const isPositive = activity.xpAmount > 0;
        const typeIcons = {
            BOOKING: 'bed',
            REVIEW: 'star',
            REFERRAL: 'user-plus',
            WELCOME_BONUS: 'gift',
            STREAK_BONUS: 'fire',
            REDEMPTION: 'gift'
        };
        
        return `
            <div class="activity-item">
                <div class="activity-icon ${isPositive ? 'positive' : 'negative'}">
                    <i class="fas fa-${typeIcons[activity.type] || 'coins'}"></i>
                </div>
                <div class="activity-content">
                    <span class="activity-desc">${activity.description}</span>
                    <span class="activity-date">${formatRelativeTime(activity.createdAt)}</span>
                </div>
                <div class="activity-xp ${isPositive ? 'positive' : 'negative'}">
                    ${isPositive ? '+' : ''}${activity.xpAmount.toLocaleString()} XP
                </div>
            </div>
        `;
    }
    
    // ==================== REWARDS SECTION ====================
    
    function renderRewardsSection(rewards, currentXp) {
        if (!rewards || rewards.length === 0) return '';
        
        return `
            <div class="loyalty-section">
                <h3 class="section-title">
                    <i class="fas fa-gift"></i>
                    Available Rewards
                </h3>
                
                <div class="rewards-grid">
                    ${rewards.slice(0, 4).map(r => renderRewardCard(r, currentXp)).join('')}
                </div>
            </div>
        `;
    }
    
    function renderRewardCard(reward, currentXp) {
        const canRedeem = currentXp >= reward.xpCost && reward.canRedeem;
        
        return `
            <div class="reward-card ${canRedeem ? 'available' : 'locked'}">
                <div class="reward-image">
                    <i class="fas fa-${reward.icon || 'gift'}"></i>
                </div>
                <div class="reward-content">
                    <h4 class="reward-name">${reward.name}</h4>
                    <p class="reward-desc">${reward.description}</p>
                    <div class="reward-footer">
                        <span class="reward-cost">
                            <i class="fas fa-star"></i>
                            ${reward.xpCost.toLocaleString()} XP
                        </span>
                        <button class="btn-redeem" 
                                ${!canRedeem ? 'disabled' : ''}
                                onclick="LoyaltyUI.redeemReward(${reward.id})">
                            ${canRedeem ? 'Redeem' : 'Not enough XP'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // ==================== TIER BADGE COMPONENT ====================
    
    function renderTierBadge(tier, size = 'medium') {
        const config = TIER_CONFIG[tier] || TIER_CONFIG.BRONZE;
        
        return `
            <div class="tier-badge tier-badge-${size}" style="background: ${config.gradient}">
                <i class="fas fa-${config.icon}"></i>
                <span>${tier}</span>
            </div>
        `;
    }
    
    // ==================== ANIMATIONS ====================
    
    function initProgressAnimations(container) {
        const progressBars = container.querySelectorAll('[data-progress]');
        
        progressBars.forEach(bar => {
            const progress = bar.getAttribute('data-progress');
            setTimeout(() => {
                bar.style.width = `${progress}%`;
            }, 100);
        });
    }
    
    function initBadgeAnimations(container) {
        const badges = container.querySelectorAll('.badge-item.unlocked');
        
        badges.forEach((badge, index) => {
            badge.style.animationDelay = `${index * 0.1}s`;
            badge.classList.add('animate-in');
        });
    }
    
    // ==================== HELPERS ====================
    
    function formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    
    function formatRelativeTime(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return formatDate(dateStr);
    }
    
    // ==================== PUBLIC API ====================
    
    return {
        init,
        renderTierBadge,
        renderXpProgress,
        renderBadge,
        
        showAllBadges: function() {
            // Dispatch event for modal/page handling
            document.dispatchEvent(new CustomEvent('loyalty:showBadges'));
        },
        
        redeemReward: async function(rewardId) {
            try {
                const response = await API.loyalty.redeemReward(rewardId);
                if (response.success) {
                    document.dispatchEvent(new CustomEvent('loyalty:rewardRedeemed', { 
                        detail: response.data 
                    }));
                }
            } catch (error) {
                console.error('Reward redemption failed:', error);
            }
        }
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoyaltyUI;
}
