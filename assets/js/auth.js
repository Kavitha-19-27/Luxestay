/**
 * Authentication Service
 * Handles user authentication state and token management
 */

const Auth = {
    /**
     * Get stored JWT token
     */
    getToken() {
        return localStorage.getItem(CONFIG.TOKEN_KEY);
    },
    
    /**
     * Get stored user data
     */
    getUser() {
        const userData = localStorage.getItem(CONFIG.USER_KEY);
        return userData ? JSON.parse(userData) : null;
    },
    
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;
        
        // Check if token is expired
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiry = payload.exp * 1000; // Convert to milliseconds
            return Date.now() < expiry;
        } catch {
            return false;
        }
    },
    
    /**
     * Check if user is admin
     */
    isAdmin() {
        const user = this.getUser();
        return user && user.role === 'ADMIN';
    },
    
    /**
     * Check if user is hotel owner
     */
    isHotelOwner() {
        const user = this.getUser();
        return user && user.role === 'HOTEL_OWNER';
    },
    
    /**
     * Check if user is a regular user (can make bookings)
     */
    isUser() {
        const user = this.getUser();
        return user && user.role === 'USER';
    },
    
    /**
     * Get hotel ID for hotel owner
     */
    getHotelId() {
        const user = this.getUser();
        return user ? user.hotelId : null;
    },
    
    /**
     * Check if user must change password
     */
    mustChangePassword() {
        const user = this.getUser();
        return user && user.mustChangePassword === true;
    },
    
    /**
     * Check if user has management access (admin or hotel owner)
     */
    hasManagementAccess() {
        return this.isAdmin() || this.isHotelOwner();
    },
    
    /**
     * Store auth data after login/signup
     */
    setAuth(authData) {
        // Backend returns 'accessToken', not 'token'
        const token = authData.accessToken || authData.token;
        localStorage.setItem(CONFIG.TOKEN_KEY, token);
        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(authData.user));
    },
    
    /**
     * Clear auth data (logout)
     */
    logout() {
        localStorage.removeItem(CONFIG.TOKEN_KEY);
        localStorage.removeItem(CONFIG.USER_KEY);
    },
    
    /**
     * Handle signup
     */
    async signup(userData) {
        const response = await API.auth.signup(userData);
        if (response.success && response.data) {
            this.setAuth(response.data);
        }
        return response;
    },
    
    /**
     * Handle login
     */
    async login(credentials) {
        const response = await API.auth.login(credentials);
        if (response.success && response.data) {
            this.setAuth(response.data);
        }
        return response;
    },
    
    /**
     * Refresh user data from server
     */
    async refreshUser() {
        if (!this.isAuthenticated()) return null;
        
        try {
            const response = await API.auth.getCurrentUser();
            if (response.success && response.data) {
                const currentAuth = {
                    token: this.getToken(),
                    user: response.data
                };
                this.setAuth(currentAuth);
                return response.data;
            }
        } catch (error) {
            console.error('Failed to refresh user:', error);
            this.logout();
        }
        return null;
    },
    
    /**
     * Get user initials for avatar
     */
    getUserInitials() {
        const user = this.getUser();
        if (!user) return '?';
        
        const firstInitial = user.firstName ? user.firstName.charAt(0) : '';
        const lastInitial = user.lastName ? user.lastName.charAt(0) : '';
        return (firstInitial + lastInitial).toUpperCase() || '?';
    },
    
    /**
     * Get user display name
     */
    getUserDisplayName() {
        const user = this.getUser();
        if (!user) return 'Guest';
        return user.firstName || user.email.split('@')[0];
    },
    
    /**
     * Require authentication for protected pages
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            const currentPath = window.location.pathname;
            window.location.href = `login.html?redirect=${encodeURIComponent(currentPath)}`;
            return false;
        }
        return true;
    },
    
    /**
     * Render user menu in navbar
     */
    renderUserMenu() {
        const navActions = document.getElementById('navActions');
        if (!navActions) return;
        
        if (this.isAuthenticated()) {
            let dashboardLink = '';
            if (this.isAdmin()) {
                dashboardLink = `
                    <div class="menu-divider"></div>
                    <a href="admin/dashboard.html">
                        <i class="fas fa-tachometer-alt"></i>
                        Admin Dashboard
                    </a>
                `;
            } else if (this.isHotelOwner()) {
                dashboardLink = `
                    <div class="menu-divider"></div>
                    <a href="owner/dashboard.html">
                        <i class="fas fa-hotel"></i>
                        Hotel Dashboard
                    </a>
                `;
            }
            
            navActions.innerHTML = `
                <div class="user-menu" id="userMenu">
                    <button class="user-menu-trigger" aria-expanded="false">
                        <span class="user-avatar">${this.getUserInitials()}</span>
                        <span class="user-name">${this.getUserDisplayName()}</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="user-menu-dropdown">
                        <a href="my-bookings.html">
                            <i class="fas fa-calendar-check"></i>
                            My Bookings
                        </a>
                        <a href="profile.html">
                            <i class="fas fa-user"></i>
                            My Profile
                        </a>
                        ${dashboardLink}
                        <div class="menu-divider"></div>
                        <button type="button" onclick="Auth.handleLogout()">
                            <i class="fas fa-sign-out-alt"></i>
                            Logout
                        </button>
                    </div>
                </div>
            `;
            
            // User menu toggle
            const userMenu = document.getElementById('userMenu');
            const userMenuTrigger = userMenu.querySelector('.user-menu-trigger');
            
            userMenuTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                userMenu.classList.toggle('active');
                userMenuTrigger.setAttribute('aria-expanded', userMenu.classList.contains('active'));
            });
            
            // Close on outside click
            document.addEventListener('click', () => {
                userMenu.classList.remove('active');
                userMenuTrigger.setAttribute('aria-expanded', 'false');
            });
        } else {
            navActions.innerHTML = `
                <a href="login.html" class="btn btn-ghost">Login</a>
                <a href="signup.html" class="btn btn-primary">Sign Up</a>
            `;
        }
    },
    
    /**
     * Handle logout
     */
    handleLogout() {
        this.logout();
        UI.toast('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    }
};

/**
 * Initialize auth UI on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    const navAuth = document.getElementById('navAuth');
    const navActions = document.getElementById('navActions');
    
    // Handle navAuth (for pages using navAuth id)
    if (navAuth) {
        if (Auth.isAuthenticated()) {
            const user = Auth.getUser();
            let dashboardLink = '';
            if (Auth.isAdmin()) {
                dashboardLink = `
                    <div class="menu-divider"></div>
                    <a href="admin/dashboard.html">
                        <i class="fas fa-tachometer-alt"></i>
                        Admin Dashboard
                    </a>
                `;
            } else if (Auth.isHotelOwner()) {
                dashboardLink = `
                    <div class="menu-divider"></div>
                    <a href="owner/dashboard.html">
                        <i class="fas fa-hotel"></i>
                        Hotel Dashboard
                    </a>
                `;
            }
            
            navAuth.innerHTML = `
                <div class="user-menu" id="userMenu">
                    <button class="user-menu-trigger" aria-expanded="false">
                        <span class="user-avatar">${Auth.getUserInitials()}</span>
                        <span class="user-name">${Auth.getUserDisplayName()}</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="user-menu-dropdown">
                        <a href="my-bookings.html">
                            <i class="fas fa-calendar-check"></i>
                            My Bookings
                        </a>
                        <a href="loyalty.html">
                            <i class="fas fa-crown"></i>
                            Rewards
                        </a>
                        <a href="profile.html">
                            <i class="fas fa-user"></i>
                            My Profile
                        </a>
                        ${dashboardLink}
                        <div class="menu-divider"></div>
                        <button id="logoutBtn" type="button">
                            <i class="fas fa-sign-out-alt"></i>
                            Logout
                        </button>
                    </div>
                </div>
            `;
            
            setupUserMenuEvents();
        } else {
            navAuth.innerHTML = `
                <a href="login.html" class="btn btn-ghost">Login</a>
                <a href="signup.html" class="btn btn-primary">Sign Up</a>
            `;
        }
    }
    
    // Handle navActions (for pages using navActions id)
    if (navActions && !navAuth) {
        Auth.renderUserMenu();
    }
});

/**
 * Setup user menu dropdown events
 */
function setupUserMenuEvents() {
    const userMenu = document.getElementById('userMenu');
    if (!userMenu) return;
    
    const userMenuTrigger = userMenu.querySelector('.user-menu-trigger');
    
    userMenuTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        userMenu.classList.toggle('active');
        userMenuTrigger.setAttribute('aria-expanded', userMenu.classList.contains('active'));
    });
    
    // Close on outside click
    document.addEventListener('click', () => {
        userMenu.classList.remove('active');
        userMenuTrigger.setAttribute('aria-expanded', 'false');
    });
    
    // Logout handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            Auth.logout();
            UI.toast('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);
        });
    }
}

/**
 * Require authentication for protected pages
 */
function requireAuth() {
    if (!Auth.isAuthenticated()) {
        // Get just the filename from the path (e.g., "booking.html" from "/booking.html")
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const queryString = window.location.search;
        const redirect = currentPage + queryString;
        window.location.href = `login.html?redirect=${encodeURIComponent(redirect)}`;
        return false;
    }
    return true;
}

/**
 * Require admin role for admin pages
 */
function requireAdmin() {
    if (!Auth.isAuthenticated()) {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const queryString = window.location.search;
        const redirect = currentPage + queryString;
        window.location.href = '../login.html?redirect=' + encodeURIComponent('admin/' + redirect);
        return false;
    }
    
    if (!Auth.isAdmin()) {
        window.location.href = '../index.html';
        UI.toast('Access denied. Admin privileges required.', 'error');
        return false;
    }
    
    return true;
}

/**
 * Require management access (admin or hotel owner) for dashboard pages
 */
function requireManagementAccess() {
    if (!Auth.isAuthenticated()) {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const queryString = window.location.search;
        const redirect = currentPage + queryString;
        window.location.href = '../login.html?redirect=' + encodeURIComponent('admin/' + redirect);
        return false;
    }
    
    if (!Auth.hasManagementAccess()) {
        window.location.href = '../index.html';
        UI.toast('Access denied. Management privileges required.', 'error');
        return false;
    }
    
    return true;
}

/**
 * Require hotel owner role for owner pages
 */
function requireHotelOwner() {
    if (!Auth.isAuthenticated()) {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const queryString = window.location.search;
        const redirect = currentPage + queryString;
        window.location.href = '../login.html?redirect=' + encodeURIComponent('owner/' + redirect);
        return false;
    }
    
    if (!Auth.isHotelOwner()) {
        window.location.href = '../index.html';
        UI.toast('Access denied. Hotel owner privileges required.', 'error');
        return false;
    }
    
    // Check if password change is required
    if (Auth.mustChangePassword()) {
        window.location.href = 'change-password.html';
        UI.toast('Please change your password before continuing.', 'warning');
        return false;
    }
    
    return true;
}
