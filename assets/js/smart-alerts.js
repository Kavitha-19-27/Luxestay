/**
 * Smart Alerts Module
 * 
 * Shows helpful, non-spammy alerts:
 * - Price drops on viewed hotels
 * - Availability alerts
 * - Upcoming booking reminders
 * - Wishlist updates
 * 
 * Design Philosophy:
 * - Helpful, not pushy
 * - Real data only
 * - User controls visibility
 * - Calm, premium feel
 */

const SmartAlerts = {
    // Cache and state
    alerts: [],
    viewedHotels: [],
    sessionId: null,
    pollInterval: null,
    isVisible: false,
    
    // Configuration
    config: {
        maxAlerts: 5,
        pollIntervalMs: 5 * 60 * 1000, // Poll every 5 minutes
        storageKey: 'luxestay_viewed_hotels',
        sessionKey: 'luxestay_session_id',
        dismissedKey: 'luxestay_dismissed_alerts'
    },
    
    /**
     * Initialize Smart Alerts
     */
    initialize() {
        this.loadSession();
        this.loadViewedHotels();
        this.createAlertContainer();
        this.loadAlerts();
        
        // Start polling for new alerts
        this.startPolling();
        
        // Console logging removed for production
    },
    
    /**
     * Load or create session ID
     */
    loadSession() {
        this.sessionId = localStorage.getItem(this.config.sessionKey);
        if (!this.sessionId) {
            this.sessionId = this.generateSessionId();
            localStorage.setItem(this.config.sessionKey, this.sessionId);
        }
    },
    
    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    /**
     * Load viewed hotels from storage
     */
    loadViewedHotels() {
        try {
            const stored = localStorage.getItem(this.config.storageKey);
            this.viewedHotels = stored ? JSON.parse(stored) : [];
        } catch (e) {
            this.viewedHotels = [];
        }
    },
    
    /**
     * Track hotel view (call this when user views a hotel)
     */
    trackHotelView(hotelId) {
        if (!hotelId || this.viewedHotels.includes(hotelId)) return;
        
        this.viewedHotels.push(hotelId);
        
        // Keep only last 10 hotels
        if (this.viewedHotels.length > 10) {
            this.viewedHotels = this.viewedHotels.slice(-10);
        }
        
        localStorage.setItem(this.config.storageKey, JSON.stringify(this.viewedHotels));
    },
    
    /**
     * Create alert container in DOM
     */
    createAlertContainer() {
        // Check if container already exists
        if (document.getElementById('smartAlertsContainer')) return;
        
        const container = document.createElement('div');
        container.id = 'smartAlertsContainer';
        container.className = 'smart-alerts-container';
        container.innerHTML = `
            <button class="smart-alerts-toggle" id="smartAlertsToggle" aria-label="View alerts">
                <i class="fas fa-bell"></i>
                <span class="alert-badge" id="alertBadge" style="display: none;">0</span>
            </button>
            <div class="smart-alerts-panel" id="smartAlertsPanel">
                <div class="alerts-header">
                    <h3>Updates</h3>
                    <button class="alerts-close" id="alertsClose" aria-label="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="alerts-content" id="alertsContent">
                    <!-- Alerts will be rendered here -->
                </div>
            </div>
        `;
        
        document.body.appendChild(container);
        
        // Add event listeners
        document.getElementById('smartAlertsToggle').addEventListener('click', () => this.togglePanel());
        document.getElementById('alertsClose').addEventListener('click', () => this.hidePanel());
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            const container = document.getElementById('smartAlertsContainer');
            if (this.isVisible && !container.contains(e.target)) {
                this.hidePanel();
            }
        });
    },
    
    /**
     * Load alerts from API
     */
    async loadAlerts() {
        try {
            const params = new URLSearchParams();
            if (this.viewedHotels.length > 0) {
                this.viewedHotels.forEach(id => params.append('viewedHotelIds', id));
            }
            
            const response = await API.request(`/alerts/session?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'X-Session-Id': this.sessionId
                }
            });
            
            if (response?.success && response.data?.alerts) {
                this.alerts = this.filterDismissedAlerts(response.data.alerts);
                this.updateUI();
            }
        } catch (error) {
            // Error logging removed for production
        }
    },
    
    /**
     * Filter out dismissed alerts
     */
    filterDismissedAlerts(alerts) {
        const dismissed = this.getDismissedAlertIds();
        return alerts.filter(a => !dismissed.includes(a.id?.toString()));
    },
    
    /**
     * Get dismissed alert IDs from storage
     */
    getDismissedAlertIds() {
        try {
            const stored = localStorage.getItem(this.config.dismissedKey);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    },
    
    /**
     * Save dismissed alert ID
     */
    saveDismissedAlert(alertId) {
        const dismissed = this.getDismissedAlertIds();
        if (!dismissed.includes(alertId.toString())) {
            dismissed.push(alertId.toString());
            localStorage.setItem(this.config.dismissedKey, JSON.stringify(dismissed));
        }
    },
    
    /**
     * Update UI with current alerts
     */
    updateUI() {
        const badge = document.getElementById('alertBadge');
        const content = document.getElementById('alertsContent');
        
        if (!badge || !content) return;
        
        // Update badge
        const unreadCount = this.alerts.filter(a => !a.read).length;
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
        
        // Update content
        if (this.alerts.length === 0) {
            content.innerHTML = this.renderEmptyState();
        } else {
            content.innerHTML = this.alerts.map(alert => this.renderAlert(alert)).join('');
            this.attachAlertListeners();
        }
    },
    
    /**
     * Render single alert
     */
    renderAlert(alert) {
        const typeConfig = this.getAlertTypeConfig(alert.type);
        const data = alert.data || {};
        
        return `
            <div class="alert-item ${alert.read ? 'read' : ''} alert-${alert.priority?.toLowerCase() || 'medium'}" 
                 data-alert-id="${alert.id}">
                <div class="alert-icon ${typeConfig.colorClass}">
                    <i class="fas ${typeConfig.icon}"></i>
                </div>
                <div class="alert-content">
                    <h4 class="alert-title">${this.escapeHtml(alert.title)}</h4>
                    <p class="alert-message">${this.escapeHtml(alert.message)}</p>
                    ${data.savings ? `
                        <span class="alert-savings">Save ₹${data.savings.toLocaleString('en-IN')}</span>
                    ` : ''}
                    ${data.actionUrl ? `
                        <a href="${data.actionUrl}" class="alert-action">
                            ${data.actionText || 'View'} <i class="fas fa-arrow-right"></i>
                        </a>
                    ` : ''}
                </div>
                <button class="alert-dismiss" data-dismiss="${alert.id}" aria-label="Dismiss">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    },
    
    /**
     * Get alert type configuration
     */
    getAlertTypeConfig(type) {
        const configs = {
            PRICE_DROP: { icon: 'fa-tag', colorClass: 'alert-green' },
            AVAILABILITY: { icon: 'fa-calendar-check', colorClass: 'alert-blue' },
            WISHLIST: { icon: 'fa-heart', colorClass: 'alert-pink' },
            BOOKING_REMINDER: { icon: 'fa-clock', colorClass: 'alert-orange' },
            LOW_AVAILABILITY: { icon: 'fa-exclamation-circle', colorClass: 'alert-orange' },
            DEAL: { icon: 'fa-percent', colorClass: 'alert-green' }
        };
        return configs[type] || { icon: 'fa-bell', colorClass: 'alert-gray' };
    },
    
    /**
     * Render empty state
     */
    renderEmptyState() {
        return `
            <div class="alerts-empty">
                <i class="fas fa-bell-slash"></i>
                <p>No updates right now</p>
                <span>We'll notify you of price drops and availability changes</span>
            </div>
        `;
    },
    
    /**
     * Attach event listeners to alerts
     */
    attachAlertListeners() {
        // Dismiss buttons
        document.querySelectorAll('.alert-dismiss').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const alertId = btn.dataset.dismiss;
                this.dismissAlert(alertId);
            });
        });
        
        // Alert click (mark as read)
        document.querySelectorAll('.alert-item').forEach(item => {
            item.addEventListener('click', () => {
                const alertId = item.dataset.alertId;
                this.markAsRead(alertId);
            });
        });
    },
    
    /**
     * Dismiss an alert
     */
    dismissAlert(alertId) {
        // Remove from local state
        this.alerts = this.alerts.filter(a => a.id?.toString() !== alertId.toString());
        this.saveDismissedAlert(alertId);
        this.updateUI();
        
        // Notify backend (fire and forget)
        API.request(`/api/alerts/${alertId}/dismiss`, {
            method: 'POST',
            headers: { 'X-Session-Id': this.sessionId }
        }).catch(() => {});
    },
    
    /**
     * Mark alert as read
     */
    markAsRead(alertId) {
        const alert = this.alerts.find(a => a.id?.toString() === alertId.toString());
        if (alert && !alert.read) {
            alert.read = true;
            this.updateUI();
            
            // Notify backend (fire and forget)
            API.request(`/api/alerts/${alertId}/read`, {
                method: 'POST',
                headers: { 'X-Session-Id': this.sessionId }
            }).catch(() => {});
        }
    },
    
    /**
     * Toggle alert panel visibility
     */
    togglePanel() {
        if (this.isVisible) {
            this.hidePanel();
        } else {
            this.showPanel();
        }
    },
    
    /**
     * Show alert panel
     */
    showPanel() {
        const panel = document.getElementById('smartAlertsPanel');
        if (panel) {
            panel.classList.add('visible');
            this.isVisible = true;
        }
    },
    
    /**
     * Hide alert panel
     */
    hidePanel() {
        const panel = document.getElementById('smartAlertsPanel');
        if (panel) {
            panel.classList.remove('visible');
            this.isVisible = false;
        }
    },
    
    /**
     * Start polling for new alerts
     */
    startPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        
        this.pollInterval = setInterval(() => {
            this.loadAlerts();
        }, this.config.pollIntervalMs);
    },
    
    /**
     * Stop polling
     */
    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    },
    
    /**
     * Check availability alerts for specific hotels
     */
    async checkAvailability(hotelIds, checkIn, checkOut) {
        try {
            const params = new URLSearchParams();
            hotelIds.forEach(id => params.append('hotelIds', id));
            params.append('checkIn', checkIn);
            params.append('checkOut', checkOut);
            
            const response = await API.request(`/api/alerts/availability?${params.toString()}`);
            
            if (response?.success && response.data) {
                return response.data;
            }
        } catch (error) {
            // Error logging removed for production
        }
        return [];
    },
    
    /**
     * Check for price drop on a specific hotel
     */
    async checkPriceDrop(hotelId) {
        try {
            const response = await API.request(`/api/alerts/price-drop/${hotelId}`);
            
            if (response?.success && response.data?.hasPriceDrop) {
                return response.data.alert;
            }
        } catch (error) {
            // Error logging removed for production
        }
        return null;
    },
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Export for global use
window.SmartAlerts = SmartAlerts;

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if API is available
    if (typeof API !== 'undefined') {
        SmartAlerts.initialize();
    }
});
