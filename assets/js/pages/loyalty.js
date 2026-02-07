/**
 * LuxeStay Rewards - Loyalty Page JavaScript
 * Handles all loyalty dashboard functionality
 */

// API Base URL - initialized after DOM loaded to ensure CONFIG is available
let LOYALTY_API;

// State
let currentUser = null;
let loyaltyDashboard = null;
let currentTab = 'badges';
let currentBadgeFilter = 'all';

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', async () => {
    LOYALTY_API = `${CONFIG.API_BASE_URL}/loyalty`;
    
    // Update nav auth state for this page's nav structure
    updateNavAuthState();
    
    initTabs();
    await checkAuthAndLoad();
});

/**
 * Update navigation auth state for loyalty page's specific nav structure
 */
function updateNavAuthState() {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileLink = document.getElementById('profileLink');
    const userName = document.getElementById('userName');
    
    if (Auth && Auth.isAuthenticated()) {
        const user = Auth.getUser();
        
        // Hide login/signup, show profile/logout
        if (loginBtn) loginBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        if (logoutBtn) {
            logoutBtn.style.display = 'inline-flex';
            logoutBtn.addEventListener('click', () => {
                Auth.logout();
                window.location.href = 'index.html';
            });
        }
        if (profileLink) {
            profileLink.style.display = 'inline-flex';
            if (userName && user) {
                userName.textContent = user.firstName || user.email?.split('@')[0] || 'Profile';
            }
        }
    } else {
        // Show login/signup, hide profile/logout
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (signupBtn) signupBtn.style.display = 'inline-flex';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (profileLink) profileLink.style.display = 'none';
    }
}

async function checkAuthAndLoad() {
    // Use the Auth object from auth.js which properly checks token validity
    if (Auth && Auth.isAuthenticated()) {
        currentUser = Auth.getUser();
        if (currentUser) {
            showDashboard();
            // Load dashboard separately - errors here shouldn't redirect to login
            loadLoyaltyDashboard().catch(error => {
                console.error('Dashboard load error:', error);
            });
        } else {
            // Token exists but no user data - try to fetch
            try {
                currentUser = await fetchCurrentUser();
                if (currentUser) {
                    showDashboard();
                    loadLoyaltyDashboard().catch(error => {
                        console.error('Dashboard load error:', error);
                    });
                } else {
                    showLoginPrompt();
                }
            } catch (error) {
                console.error('Failed to fetch user:', error);
                showLoginPrompt();
            }
        }
    } else {
        showLoginPrompt();
    }
}

async function fetchCurrentUser() {
    const token = Auth.getToken();
    if (!token) return null;
    
    const response = await fetch(`${CONFIG.API_BASE_URL}/users/me`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (response.ok) {
        return await response.json();
    }
    return null;
}

function showLoginPrompt() {
    document.getElementById('loginPrompt').style.display = 'flex';
    document.getElementById('loyaltyDashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginPrompt').style.display = 'none';
    document.getElementById('loyaltyDashboard').style.display = 'block';
}

// ==================== API Calls ====================

async function apiCall(endpoint, method = 'GET', body = null) {
    const token = Auth.getToken();
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${LOYALTY_API}${endpoint}`, options);
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return response.json();
}

async function loadLoyaltyDashboard() {
    try {
        showLoading();
        
        // Fetch dashboard, levels and referrals in parallel
        const [dashboardData, levelsData, referralData] = await Promise.all([
            apiCall('/dashboard'),
            apiCall('/levels').catch(() => []), // Gracefully handle if levels endpoint fails
            apiCall('/referrals').catch(() => null) // Gracefully handle if referrals endpoint fails
        ]);
        
        loyaltyDashboard = dashboardData;
        
        // Add all levels to dashboard
        loyaltyDashboard.allLevels = levelsData || [];
        
        // Add referral stats to dashboard
        loyaltyDashboard.referralStats = referralData || { totalReferrals: 0, completedReferrals: 0, totalXpEarned: 0 };
        if (loyaltyDashboard.profile && referralData?.referralCode) {
            loyaltyDashboard.profile.referralCode = referralData.referralCode;
        }
        
        // Derive earnedBadges from allBadges (backend returns isUnlocked flag)
        if (loyaltyDashboard.allBadges) {
            loyaltyDashboard.earnedBadges = loyaltyDashboard.allBadges.filter(b => b.isUnlocked);
        } else {
            loyaltyDashboard.earnedBadges = [];
        }
        
        // Extract level info from profile (backend nests them in profile)
        if (loyaltyDashboard.profile) {
            loyaltyDashboard.currentLevel = loyaltyDashboard.profile.currentLevel;
            loyaltyDashboard.nextLevel = loyaltyDashboard.profile.nextLevel;
            
            // Map totalXp from currentXp or lifetimeXp
            if (!loyaltyDashboard.profile.totalXp) {
                loyaltyDashboard.profile.totalXp = loyaltyDashboard.profile.currentXp || 
                                                   loyaltyDashboard.profile.lifetimeXp || 0;
            }
            
            // Extract stats from profile.stats
            if (loyaltyDashboard.profile.stats) {
                loyaltyDashboard.stats = loyaltyDashboard.profile.stats;
            }
        }
        
        renderDashboard();
    } catch (error) {
        console.error('Failed to load loyalty dashboard:', error);
        showToast('Failed to load loyalty data', 'error');
    } finally {
        hideLoading();
    }
}

// ==================== Rendering ====================

function renderDashboard() {
    if (!loyaltyDashboard) return;
    
    renderLevelCard();
    renderQuickStats();
    renderBadges();
    renderRewards();
    renderActivity();
    renderReferrals();
    renderLeaderboard();
    renderLevelsOverview();
}

function renderLevelCard() {
    const profile = loyaltyDashboard.profile;
    const level = loyaltyDashboard.currentLevel;
    const nextLevel = loyaltyDashboard.nextLevel;
    
    if (!profile || !level) {
        console.error('Missing profile or level data');
        return;
    }
    
    // Backend uses levelName, normalize to name for consistency
    const levelName = level.levelName || level.name || 'Explorer';
    const nextLevelName = nextLevel ? (nextLevel.levelName || nextLevel.name) : null;
    
    // Level badge color based on tier
    const tierColors = {
        'Explorer': 'linear-gradient(135deg, #CD7F32 0%, #B8860B 100%)',
        'Adventurer': 'linear-gradient(135deg, #C0C0C0 0%, #A0A0A0 100%)',
        'Voyager': 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
        'Elite': 'linear-gradient(135deg, #00CED1 0%, #20B2AA 100%)',
        'Ambassador': 'linear-gradient(135deg, #9400D3 0%, #8B008B 100%)'
    };
    
    const tierIcons = {
        'Explorer': 'fas fa-compass',
        'Adventurer': 'fas fa-hiking',
        'Voyager': 'fas fa-globe-americas',
        'Elite': 'fas fa-gem',
        'Ambassador': 'fas fa-crown'
    };
    
    // Update level badge
    const levelBadge = document.querySelector('.level-badge');
    if (levelBadge) {
        levelBadge.style.background = tierColors[levelName] || tierColors['Explorer'];
        levelBadge.innerHTML = `<i class="${tierIcons[levelName] || 'fas fa-star'}"></i>`;
    }
    
    // Update level name
    const levelNameEl = document.querySelector('.level-name');
    if (levelNameEl) levelNameEl.textContent = levelName;
    
    // Update XP display
    const currentXpEl = document.getElementById('currentXp');
    if (currentXpEl) currentXpEl.textContent = formatNumber(profile.totalXp || 0);
    
    // Update progress bar
    const xpProgressFill = document.getElementById('xpProgressFill');
    const nextLevelText = document.getElementById('nextLevelText');
    const xpProgressText = document.getElementById('xpProgressText');
    
    if (nextLevel) {
        const currentXp = profile.totalXp || 0;
        const levelMinXp = level.minXp || 0;
        const nextMinXp = nextLevel.minXp || 1000;
        const progress = ((currentXp - levelMinXp) / (nextMinXp - levelMinXp)) * 100;
        if (xpProgressFill) xpProgressFill.style.width = `${Math.min(Math.max(progress, 0), 100)}%`;
        if (nextLevelText) nextLevelText.textContent = `Next: ${nextLevelName}`;
        if (xpProgressText) xpProgressText.textContent = `${formatNumber(currentXp)} / ${formatNumber(nextMinXp)} XP`;
    } else {
        if (xpProgressFill) xpProgressFill.style.width = '100%';
        if (nextLevelText) nextLevelText.textContent = 'Maximum level reached!';
        if (xpProgressText) xpProgressText.textContent = `${formatNumber(profile.totalXp || 0)} XP`;
    }
    
    // Update benefits
    const benefitsContainer = document.querySelector('.level-benefits');
    if (benefitsContainer) {
        benefitsContainer.innerHTML = '';
        
        if (level.discountPercentage > 0) {
            benefitsContainer.innerHTML += `
                <span class="benefit-tag">
                    <i class="fas fa-percent"></i>
                    ${level.discountPercentage}% Discount
                </span>
            `;
        }
        
        if (level.earlyAccess) {
            benefitsContainer.innerHTML += `
                <span class="benefit-tag">
                    <i class="fas fa-clock"></i>
                    Early Access
                </span>
            `;
        }
        
        if (level.prioritySupport) {
            benefitsContainer.innerHTML += `
                <span class="benefit-tag">
                    <i class="fas fa-headset"></i>
                    Priority Support
                </span>
            `;
        }
        
        if (level.freeUpgrades) {
            benefitsContainer.innerHTML += `
                <span class="benefit-tag">
                    <i class="fas fa-arrow-up"></i>
                    Free Upgrades
                </span>
            `;
        }
    }
}

function renderQuickStats() {
    // Stats can be in loyaltyDashboard.stats OR in profile.stats
    const profile = loyaltyDashboard.profile || {};
    const stats = loyaltyDashboard.stats || profile.stats || {};
    const badges = loyaltyDashboard.earnedBadges || [];
    
    const statBookings = document.getElementById('statBookings');
    const statNights = document.getElementById('statNights');
    const statBadges = document.getElementById('statBadges');
    const statStreak = document.getElementById('statStreak');
    
    if (statBookings) statBookings.textContent = stats.totalBookings || 0;
    if (statNights) statNights.textContent = stats.totalNights || 0;
    if (statBadges) statBadges.textContent = badges.length;
    if (statStreak) statStreak.textContent = stats.currentStreak || 0;
}

function renderBadges() {
    const earnedBadges = loyaltyDashboard.earnedBadges || [];
    const allBadges = loyaltyDashboard.allBadges || [];
    const earnedIds = new Set(earnedBadges.map(b => b.id));
    
    const badgesGrid = document.getElementById('badgesGrid');
    if (!badgesGrid) return;
    badgesGrid.innerHTML = '';
    
    // Filter badges
    let badgesToShow = allBadges;
    if (currentBadgeFilter === 'unlocked') {
        badgesToShow = earnedBadges;
    } else if (currentBadgeFilter === 'locked') {
        badgesToShow = allBadges.filter(b => !earnedIds.has(b.id));
    }
    
    if (badgesToShow.length === 0) {
        badgesGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px;">
                <i class="fas fa-medal" style="font-size: 3rem; color: var(--gold-accent, #d4a574); margin-bottom: 16px;"></i>
                <p style="color: var(--text-secondary, #a0a0b0);">No badges to display</p>
            </div>
        `;
        return;
    }
    
    badgesToShow.forEach(badge => {
        const isEarned = earnedIds.has(badge.id);
        const earnedBadge = isEarned ? earnedBadges.find(b => b.id === badge.id) : null;
        
        const categoryColors = {
            'BOOKING': 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
            'MILESTONE': 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
            'REVIEW': 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
            'REFERRAL': 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)',
            'LOYALTY': 'linear-gradient(135deg, #d4a574 0%, #c49660 100%)',
            'SPECIAL': 'linear-gradient(135deg, #E91E63 0%, #C2185B 100%)'
        };
        
        badgesGrid.innerHTML += `
            <div class="badge-card ${isEarned ? 'unlocked' : 'locked'}">
                <div class="badge-icon-wrapper" style="background: ${categoryColors[badge.category] || categoryColors['BOOKING']}; color: white;">
                    <i class="${badge.icon || badge.iconClass || 'fas fa-award'}"></i>
                    <span class="badge-rarity rarity-${badge.rarity}">${getRarityIcon(badge.rarity)}</span>
                </div>
                <div class="badge-name">${badge.badgeName || badge.name}</div>
                <div class="badge-description">${badge.description}</div>
                ${badge.xpReward > 0 ? `<div class="badge-xp-reward">+${badge.xpReward} XP</div>` : ''}
                ${!isEarned && badge.progressPercent != null ? `
                    <div class="badge-progress">
                        <div class="badge-progress-bar">
                            <div class="badge-progress-fill" style="width: ${badge.progressPercent}%"></div>
                        </div>
                        <span class="badge-progress-text">${badge.progressText || ''}</span>
                    </div>
                ` : ''}
                ${isEarned && earnedBadge?.earnedAt ? `
                    <div class="badge-unlocked-date">
                        <i class="fas fa-check-circle"></i>
                        Unlocked ${formatDate(earnedBadge.earnedAt)}
                    </div>
                ` : ''}
            </div>
        `;
    });
}

function getRarityIcon(rarity) {
    const icons = {
        'COMMON': '●',
        'UNCOMMON': '◆',
        'RARE': '★',
        'EPIC': '◈',
        'LEGENDARY': '✦'
    };
    return icons[rarity] || '●';
}

function renderRewards() {
    const rewards = loyaltyDashboard.availableRewards || [];
    const userXp = loyaltyDashboard.profile?.totalXp || 0;
    
    // Update XP balance
    const xpBalanceEl = document.getElementById('rewardsXpBalance');
    if (xpBalanceEl) xpBalanceEl.textContent = `${formatNumber(userXp)} XP Available`;
    
    const rewardsGrid = document.getElementById('rewardsGrid');
    if (!rewardsGrid) return;
    rewardsGrid.innerHTML = '';
    
    if (rewards.length === 0) {
        rewardsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px;">
                <i class="fas fa-gift" style="font-size: 3rem; color: var(--gold-accent, #d4a574); margin-bottom: 16px;"></i>
                <p style="color: var(--text-secondary, #a0a0b0);">No rewards available at the moment</p>
            </div>
        `;
        return;
    }
    
    const rewardIcons = {
        'DISCOUNT': 'fas fa-percent',
        'FREE_NIGHT': 'fas fa-bed',
        'ROOM_UPGRADE': 'fas fa-arrow-up',
        'FREE_BREAKFAST': 'fas fa-coffee',
        'SPA_CREDIT': 'fas fa-spa',
        'LATE_CHECKOUT': 'fas fa-clock',
        'EARLY_CHECKIN': 'fas fa-sign-in-alt',
        'AIRPORT_TRANSFER': 'fas fa-car',
        'EXPERIENCE': 'fas fa-hiking',
        'GIFT_CARD': 'fas fa-gift'
    };
    
    rewards.forEach(reward => {
        const canAfford = reward.canAfford !== undefined ? reward.canAfford : (userXp >= (reward.xpCost || 0));
        const rewardType = reward.rewardType || reward.type || 'DISCOUNT';
        const rewardName = reward.rewardName || reward.name || 'Reward';
        
        rewardsGrid.innerHTML += `
            <div class="reward-card ${canAfford ? '' : 'cannot-afford'}">
                <div class="reward-header">
                    <div class="reward-icon">
                        <i class="${rewardIcons[rewardType] || 'fas fa-gift'}"></i>
                    </div>
                    <div class="reward-info">
                        <h4>${rewardName}</h4>
                        <span class="reward-type">${formatRewardType(rewardType)}</span>
                    </div>
                </div>
                <p class="reward-description">${reward.description || ''}</p>
                <div class="reward-footer">
                    <span class="reward-cost">
                        <i class="fas fa-star"></i>
                        ${formatNumber(reward.xpCost || 0)}
                    </span>
                    <button class="redeem-btn ${canAfford ? 'can-afford' : 'cannot-afford'}" 
                            ${canAfford ? `onclick="redeemReward(${reward.id})"` : 'disabled'}>
                        ${canAfford ? 'Redeem' : 'Need More XP'}
                    </button>
                </div>
            </div>
        `;
    });
    
    // Load active redemptions
    loadActiveRedemptions();
}

async function loadActiveRedemptions() {
    try {
        const redemptions = await apiCall('/redemptions');
        const activeRedemptions = redemptions.filter(r => r.status === 'ACTIVE' || r.status === 'PENDING');
        
        const container = document.getElementById('activeRedemptions');
        if (!container) return;
        
        if (activeRedemptions.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        const list = container.querySelector('.redemptions-list');
        if (!list) return;
        list.innerHTML = '';
        
        activeRedemptions.forEach(redemption => {
            list.innerHTML += `
                <div class="redemption-item">
                    <div class="redemption-info">
                        <strong>${redemption.rewardName}</strong>
                        <span class="redemption-code">${redemption.code || 'Processing...'}</span>
                    </div>
                    <span class="redemption-expiry">
                        ${redemption.expiresAt ? `Expires: ${formatDate(redemption.expiresAt)}` : 'No expiry'}
                    </span>
                </div>
            `;
        });
    } catch (error) {
        console.error('Failed to load redemptions:', error);
    }
}

function renderActivity() {
    const activity = loyaltyDashboard.recentActivity || [];
    const breakdown = loyaltyDashboard.xpBreakdown || {};
    
    // Render XP breakdown - keys match backend XpTransactionType enum
    const breakdownContainer = document.getElementById('xpBreakdown');
    if (breakdownContainer) {
        const bookingXp = (breakdown.BOOKING_COMPLETED || 0) + 
                         (breakdown.BOOKING_VALUE_BONUS || 0) + 
                         (breakdown.STAY_DURATION_BONUS || 0);
        const reviewXp = breakdown.REVIEW_SUBMITTED || 0;
        const referralXp = (breakdown.REFERRAL_SIGNUP || 0) + 
                          (breakdown.REFERRAL_FIRST_BOOKING || 0);
        const bonusXp = (breakdown.WELCOME_BONUS || 0) + 
                       (breakdown.BIRTHDAY_BONUS || 0) + 
                       (breakdown.SEASONAL_PROMOTION || 0) +
                       (breakdown.LEVEL_UP_BONUS || 0) +
                       (breakdown.BADGE_UNLOCKED || 0);
        const streakXp = breakdown.STREAK_BONUS || 0;
        
        breakdownContainer.innerHTML = `
            <div class="breakdown-item">
                <div class="breakdown-value">${formatNumber(bookingXp)}</div>
                <div class="breakdown-label">Bookings</div>
            </div>
            <div class="breakdown-item">
                <div class="breakdown-value">${formatNumber(streakXp)}</div>
                <div class="breakdown-label">Streaks</div>
            </div>
            <div class="breakdown-item">
                <div class="breakdown-value">${formatNumber(reviewXp)}</div>
                <div class="breakdown-label">Reviews</div>
            </div>
            <div class="breakdown-item">
                <div class="breakdown-value">${formatNumber(referralXp)}</div>
                <div class="breakdown-label">Referrals</div>
            </div>
            <div class="breakdown-item">
                <div class="breakdown-value">${formatNumber(bonusXp)}</div>
                <div class="breakdown-label">Bonuses</div>
            </div>
        `;
    }
    
    // Render activity timeline
    const timeline = document.getElementById('activityTimeline');
    if (!timeline) return;
    timeline.innerHTML = '';
    
    if (activity.length === 0) {
        timeline.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px;">
                <i class="fas fa-history" style="font-size: 2rem; color: var(--gold-accent, #d4a574); margin-bottom: 12px;"></i>
                <p style="color: var(--text-secondary, #a0a0b0);">No activity yet. Start earning XP by making bookings!</p>
            </div>
        `;
        return;
    }
    
    const activityIcons = {
        'BOOKING_COMPLETED': 'fas fa-check-circle',
        'BOOKING_VALUE_BONUS': 'fas fa-coins',
        'STAY_DURATION_BONUS': 'fas fa-moon',
        'REVIEW_SUBMITTED': 'fas fa-star',
        'REFERRAL_SIGNUP': 'fas fa-user-plus',
        'REFERRAL_FIRST_BOOKING': 'fas fa-handshake',
        'STREAK_BONUS': 'fas fa-fire',
        'LEVEL_UP_BONUS': 'fas fa-arrow-up',
        'BADGE_UNLOCKED': 'fas fa-medal',
        'WELCOME_BONUS': 'fas fa-gift',
        'XP_REDEMPTION': 'fas fa-exchange-alt',
        'ADMIN_ADJUSTMENT': 'fas fa-cog'
    };
    
    activity.forEach(item => {
        const xpAmount = item.xpAmount || 0;
        const isPositive = xpAmount >= 0;
        const activityType = item.transactionType || item.type || 'BOOKING_COMPLETED';
        const activityTime = item.timestamp || item.createdAt;
        
        timeline.innerHTML += `
            <div class="activity-item">
                <div class="activity-icon ${isPositive ? 'positive' : 'negative'} ${activityType === 'LEVEL_UP_BONUS' ? 'level-up' : ''}">
                    <i class="${activityIcons[activityType] || 'fas fa-star'}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-description">${item.description || 'Activity'}</div>
                    <div class="activity-time">${formatRelativeTime(activityTime)}</div>
                </div>
                <div class="activity-xp ${isPositive ? 'positive' : 'negative'}">
                    ${isPositive ? '+' : ''}${formatNumber(xpAmount)} XP
                </div>
            </div>
        `;
    });
}

function renderReferrals() {
    const profile = loyaltyDashboard.profile || {};
    const referralStats = loyaltyDashboard.referralStats || { totalReferrals: 0, successfulReferrals: 0, totalXpEarned: 0 };
    
    // Update referral code display
    const referralCodeEl = document.getElementById('referralCode');
    if (referralCodeEl) {
        if (profile.referralCode) {
            referralCodeEl.textContent = profile.referralCode;
        } else {
            // Generate referral code if not exists
            generateReferralCode();
        }
    }
    
    // Update referral stats
    const totalReferralsEl = document.getElementById('totalReferrals');
    const completedReferralsEl = document.getElementById('completedReferrals');
    const referralXpEarnedEl = document.getElementById('referralXpEarned');
    
    if (totalReferralsEl) totalReferralsEl.textContent = referralStats.totalReferrals || 0;
    if (completedReferralsEl) completedReferralsEl.textContent = referralStats.completedReferrals || 0;
    if (referralXpEarnedEl) referralXpEarnedEl.textContent = formatNumber(referralStats.totalXpEarned || 0);
}

async function generateReferralCode() {
    try {
        const response = await apiCall('/referrals/code', 'POST');
        const referralCodeEl = document.getElementById('referralCode');
        if (referralCodeEl) referralCodeEl.textContent = response.referralCode;
        showToast('Referral code generated!', 'success');
    } catch (error) {
        console.error('Failed to generate referral code:', error);
    }
}

function renderLeaderboard() {
    // Backend returns leaderboard as an object with topUsers array
    const leaderboardData = loyaltyDashboard.leaderboard || {};
    const leaderboard = leaderboardData.topUsers || [];
    
    // Update user's rank from leaderboard data
    const userRankEl = document.getElementById('userRank');
    if (userRankEl && leaderboardData.rank) {
        userRankEl.textContent = `#${leaderboardData.rank}`;
    }
    
    const list = document.getElementById('leaderboardList');
    if (!list) return;
    list.innerHTML = '';
    
    if (leaderboard.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px;">
                <i class="fas fa-trophy" style="font-size: 2rem; color: var(--gold-accent, #d4a574); margin-bottom: 12px;"></i>
                <p style="color: var(--text-secondary, #a0a0b0);">Leaderboard coming soon!</p>
            </div>
        `;
        return;
    }
    
    leaderboard.forEach((entry, index) => {
        const rank = entry.rank || (index + 1);
        const isTopThree = rank <= 3;
        
        list.innerHTML += `
            <div class="leaderboard-entry ${isTopThree ? 'top-3' : ''}">
                <div class="leader-rank ${getRankClass(rank)}">${rank}</div>
                <div class="leader-info">
                    <div class="leader-name">${entry.userName || 'Anonymous'}</div>
                    <div class="leader-level">
                        <i class="fas fa-crown"></i>
                        ${entry.levelName || 'Explorer'}
                    </div>
                </div>
                <div class="leader-stats">
                    <span class="leader-xp">${formatNumber(entry.xp || 0)} XP</span>
                    <span class="leader-badges">
                        <i class="fas fa-medal"></i> ${entry.badgeCount || 0}
                    </span>
                </div>
            </div>
        `;
    });
}

function getRankClass(rank) {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    return 'other';
}

function renderLevelsOverview() {
    const levels = loyaltyDashboard.allLevels || [];
    const currentLevel = loyaltyDashboard.currentLevel;
    const currentLevelName = currentLevel?.levelName || currentLevel?.name;
    const userXp = loyaltyDashboard.profile?.totalXp || 0;
    
    const track = document.getElementById('levelsTrack');
    if (!track) return;
    track.innerHTML = '';
    
    // If no levels data, show a placeholder
    if (levels.length === 0) {
        track.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px;">
                <i class="fas fa-layer-group" style="font-size: 2rem; color: var(--gold-accent, #d4a574); margin-bottom: 12px;"></i>
                <p style="color: var(--text-secondary, #a0a0b0);">Level progression loading...</p>
            </div>
        `;
        return;
    }
    
    const tierColors = {
        'Explorer': 'linear-gradient(135deg, #CD7F32 0%, #B8860B 100%)',
        'Adventurer': 'linear-gradient(135deg, #C0C0C0 0%, #A0A0A0 100%)',
        'Voyager': 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
        'Elite': 'linear-gradient(135deg, #00CED1 0%, #20B2AA 100%)',
        'Ambassador': 'linear-gradient(135deg, #9400D3 0%, #8B008B 100%)'
    };
    
    const tierIcons = {
        'Explorer': 'fas fa-compass',
        'Adventurer': 'fas fa-hiking',
        'Voyager': 'fas fa-globe-americas',
        'Elite': 'fas fa-gem',
        'Ambassador': 'fas fa-crown'
    };
    
    levels.forEach(level => {
        const levelName = level.levelName || level.name || 'Unknown';
        const levelMinXp = level.minXp || 0;
        
        const isCompleted = userXp >= levelMinXp && levelName !== currentLevelName;
        const isCurrent = levelName === currentLevelName;
        const isLocked = userXp < levelMinXp;
        
        let status = 'locked';
        if (isCompleted) status = 'completed';
        if (isCurrent) status = 'current';
        
        track.innerHTML += `
            <div class="level-milestone ${status}">
                <div class="milestone-icon" style="background: ${tierColors[levelName] || tierColors['Explorer']}; color: white;">
                    <i class="${tierIcons[levelName] || 'fas fa-star'}"></i>
                </div>
                <div class="milestone-name">${levelName}</div>
                <div class="milestone-xp">${formatNumber(levelMinXp)} XP</div>
            </div>
        `;
    });
}

// ==================== Actions ====================

async function redeemReward(rewardId) {
    try {
        showLoading();
        const result = await apiCall('/rewards/redeem', 'POST', { rewardId });
        
        showToast(`Reward redeemed! Your code: ${result.redemptionCode}`, 'success');
        
        // Reload dashboard to update XP and redemptions
        await loadLoyaltyDashboard();
    } catch (error) {
        console.error('Failed to redeem reward:', error);
        showToast(error.message || 'Failed to redeem reward', 'error');
    } finally {
        hideLoading();
    }
}

function copyReferralCode() {
    const code = document.getElementById('referralCode').textContent;
    
    if (navigator.clipboard && code) {
        navigator.clipboard.writeText(code).then(() => {
            showToast('Referral code copied!', 'success');
        }).catch(() => {
            fallbackCopy(code);
        });
    } else {
        fallbackCopy(code);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Referral code copied!', 'success');
}

function shareReferralCode() {
    const code = document.getElementById('referralCode').textContent;
    const shareText = `Join LuxeStay and get bonus XP! Use my referral code: ${code}`;
    const shareUrl = `${window.location.origin}/signup.html?ref=${code}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Join LuxeStay Rewards',
            text: shareText,
            url: shareUrl
        }).catch(console.error);
    } else {
        copyReferralCode();
        showToast('Share link copied to clipboard!', 'success');
    }
}

// ==================== Tabs ====================

function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tab) {
    currentTab = tab;
    
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tab}`);
    });
}

function filterBadges(filter) {
    currentBadgeFilter = filter;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    renderBadges();
}

// ==================== Utilities ====================

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
}

function formatRewardType(type) {
    const types = {
        'DISCOUNT': 'Discount',
        'FREE_NIGHT': 'Free Night',
        'ROOM_UPGRADE': 'Room Upgrade',
        'FREE_BREAKFAST': 'Free Breakfast',
        'SPA_CREDIT': 'Spa Credit',
        'LATE_CHECKOUT': 'Late Checkout',
        'EARLY_CHECKIN': 'Early Check-in',
        'AIRPORT_TRANSFER': 'Airport Transfer',
        'EXPERIENCE': 'Experience',
        'GIFT_CARD': 'Gift Card'
    };
    return types[type] || type;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return formatDate(dateString);
}

function showLoading() {
    // Add loading state if needed
    document.body.classList.add('loading');
}

function hideLoading() {
    document.body.classList.remove('loading');
}

function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    
    // Create container if it doesn't exist
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Add toast styles dynamically
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    .toast-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    
    .toast {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 24px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s ease;
    }
    
    .toast.show {
        transform: translateX(0);
        opacity: 1;
    }
    
    .toast-success { border-left: 4px solid #4caf50; }
    .toast-success i { color: #4caf50; }
    
    .toast-error { border-left: 4px solid #f44336; }
    .toast-error i { color: #f44336; }
    
    .toast-info { border-left: 4px solid #2196f3; }
    .toast-info i { color: #2196f3; }
`;
document.head.appendChild(toastStyles);

// Expose functions to global scope for onclick handlers
window.redeemReward = redeemReward;
window.copyReferralCode = copyReferralCode;
window.shareReferralCode = shareReferralCode;
window.filterBadges = filterBadges;
