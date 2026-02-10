/**
 * Profile Page JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
    // Require authentication
    if (!Auth.requireAuth()) {
        return;
    }
    
    initProfilePage();
});

function initProfilePage() {
    // Initialize auth UI
    Auth.renderUserMenu();
    
    // Load user data
    loadUserProfile();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize Memory Lane
    if (window.MemoryLane) {
        window.MemoryLane.initOnProfilePage('memoryLaneContainer');
    }
    
    // Initialize VIP Concierge
    if (window.VIPConcierge) {
        window.VIPConcierge.initOnProfilePage('vipConciergeContainer');
    }
}

function loadUserProfile() {
    const user = Auth.getUser();
    
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Set profile card
    const initials = Auth.getUserInitials();
    document.getElementById('profileAvatar').textContent = initials;
    document.getElementById('profileName').textContent = `${user.firstName} ${user.lastName}`;
    document.getElementById('profileEmail').textContent = user.email;
    
    // Set form fields
    document.getElementById('firstName').value = user.firstName || '';
    document.getElementById('lastName').value = user.lastName || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('phone').value = user.phone || '';
    document.getElementById('address').value = user.address || '';
    document.getElementById('city').value = user.city || '';
    document.getElementById('country').value = user.country || '';
    
    // Set stats
    const createdYear = user.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear();
    document.getElementById('memberSince').textContent = createdYear;
    
    // Update badge based on bookings
    updateMemberBadge(user.bookingsCount || 0);
}

function updateMemberBadge(bookingsCount) {
    const badge = document.getElementById('profileBadge');
    let level, icon;
    
    if (bookingsCount >= 20) {
        level = 'Platinum Member';
        icon = 'fas fa-gem';
    } else if (bookingsCount >= 10) {
        level = 'Gold Member';
        icon = 'fas fa-crown';
    } else if (bookingsCount >= 5) {
        level = 'Silver Member';
        icon = 'fas fa-medal';
    } else {
        level = 'Member';
        icon = 'fas fa-user';
    }
    
    badge.innerHTML = `<i class="${icon}"></i><span>${level}</span>`;
}

function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.profile-nav-link[data-tab]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(link.dataset.tab);
        });
    });
    
    // Edit personal info
    const editBtn = document.getElementById('editPersonalBtn');
    const cancelBtn = document.getElementById('cancelPersonalBtn');
    const personalForm = document.getElementById('personalForm');
    const personalActions = document.getElementById('personalActions');
    
    editBtn.addEventListener('click', () => {
        toggleEditMode(true);
    });
    
    cancelBtn.addEventListener('click', () => {
        toggleEditMode(false);
        loadUserProfile(); // Reset form
    });
    
    personalForm.addEventListener('submit', handlePersonalFormSubmit);
    
    // Password form
    document.getElementById('passwordForm').addEventListener('submit', handlePasswordFormSubmit);
    
    // Preferences form
    document.getElementById('preferencesForm').addEventListener('submit', handlePreferencesFormSubmit);
    
    // Password toggles
    document.querySelectorAll('.password-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            const icon = btn.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });
    
    // Mobile menu
    document.getElementById('navbarToggle')?.addEventListener('click', () => {
        document.getElementById('navbarMenu')?.classList.toggle('active');
    });
}

function switchTab(tabName) {
    // Update nav links
    document.querySelectorAll('.profile-nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.getElementById(`${tabName}Tab`)?.classList.add('active');
}

function toggleEditMode(editing) {
    const form = document.getElementById('personalForm');
    const inputs = form.querySelectorAll('.form-input');
    const actions = document.getElementById('personalActions');
    const editBtn = document.getElementById('editPersonalBtn');
    
    inputs.forEach(input => {
        if (input.id !== 'email') { // Email typically can't be changed
            input.disabled = !editing;
        }
    });
    
    actions.classList.toggle('hidden', !editing);
    editBtn.classList.toggle('hidden', editing);
}

async function handlePersonalFormSubmit(e) {
    e.preventDefault();
    
    const userData = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        country: document.getElementById('country').value
    };
    
    try {
        await API.updateProfile(userData);
        
        // Update local storage
        const user = Auth.getUser();
        Object.assign(user, userData);
        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
        
        UI.toast('Profile updated successfully', 'success');
        toggleEditMode(false);
        loadUserProfile();
    } catch (error) {
        console.error('Failed to update profile:', error);
        UI.toast('Failed to update profile. Please try again.', 'error');
    }
}

async function handlePasswordFormSubmit(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    
    // Validation
    if (newPassword !== confirmPassword) {
        UI.toast('New passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        UI.toast('Password must be at least 8 characters', 'error');
        return;
    }
    
    try {
        await API.changePassword(currentPassword, newPassword);
        UI.toast('Password updated successfully', 'success');
        e.target.reset();
    } catch (error) {
        console.error('Failed to change password:', error);
        UI.toast('Failed to change password. Please check your current password.', 'error');
    }
}

async function handlePreferencesFormSubmit(e) {
    e.preventDefault();
    
    const preferences = {
        currency: document.getElementById('currency').value,
        language: document.getElementById('language').value,
        notifications: {
            bookingConfirmations: document.querySelector('[name="bookingConfirmations"]')?.checked ?? true,
            specialOffers: document.querySelector('[name="specialOffers"]')?.checked ?? true,
            newsletter: document.querySelector('[name="newsletter"]')?.checked ?? false
        }
    };
    
    try {
        await API.updatePreferences(preferences);
        UI.toast('Preferences saved successfully', 'success');
    } catch (error) {
        console.error('Failed to save preferences:', error);
        UI.toast('Failed to save preferences. Please try again.', 'error');
    }
}

/**
 * Load rewards/XP data for the sidebar card
 */
async function loadRewardsData() {
    const token = Auth.getToken();
    if (!token) return;
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/loyalty/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.log('Loyalty profile not available');
            return;
        }
        
        const data = await response.json();
        updateRewardsCard(data);
    } catch (error) {
        console.log('Could not load rewards data:', error);
    }
}

/**
 * Update the rewards card in the sidebar
 */
function updateRewardsCard(data) {
    const xpEl = document.getElementById('rewardsXp');
    const levelEl = document.getElementById('rewardsLevel');
    const levelBadge = document.getElementById('levelBadgeMini');
    const progressEl = document.getElementById('rewardsProgress');
    const progressText = document.getElementById('rewardsProgressText');
    
    if (!data) return;
    
    // Get XP - try different property names
    const xp = data.currentXp || data.lifetimeXp || data.totalXp || 0;
    
    // Get level info
    const level = data.currentLevel || {};
    const levelName = level.levelName || level.name || 'Explorer';
    const nextLevel = data.nextLevel || {};
    
    // Format XP with K suffix for thousands
    const formattedXp = xp >= 1000 ? (xp / 1000).toFixed(1) + 'K' : xp;
    
    // Update elements
    if (xpEl) xpEl.textContent = formattedXp;
    if (levelEl) levelEl.textContent = levelName;
    
    // Update level badge icon and color
    if (levelBadge) {
        const tierIcons = {
            'Explorer': 'fas fa-compass',
            'Adventurer': 'fas fa-hiking',
            'Voyager': 'fas fa-globe-americas',
            'Elite': 'fas fa-gem',
            'Ambassador': 'fas fa-crown'
        };
        
        levelBadge.innerHTML = `<i class="${tierIcons[levelName] || 'fas fa-star'}"></i>`;
        levelBadge.className = 'level-badge-mini ' + levelName.toLowerCase();
    }
    
    // Calculate and update progress
    if (progressEl && nextLevel.minXp && level.minXp !== undefined) {
        const currentXp = xp;
        const levelMinXp = level.minXp || 0;
        const nextMinXp = nextLevel.minXp;
        const progress = ((currentXp - levelMinXp) / (nextMinXp - levelMinXp)) * 100;
        progressEl.style.width = `${Math.min(Math.max(progress, 0), 100)}%`;
    } else if (progressEl) {
        progressEl.style.width = '100%';
    }
    
    // Update progress text
    if (progressText && nextLevel.levelName) {
        progressText.textContent = `${nextLevel.minXp - xp} XP to ${nextLevel.levelName}`;
    } else if (progressText) {
        progressText.textContent = 'View Rewards →';
    }
}
