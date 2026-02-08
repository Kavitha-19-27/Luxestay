/**
 * Booking Confidence & Risk Intelligence Module
 * 
 * Provides transparent, data-driven booking assessments to help users
 * make informed decisions. All messaging is positive/neutral - never fear-based.
 * 
 * CONFIDENCE LEVELS:
 * - HIGH (Green): Great conditions for booking
 * - MEDIUM (Amber): Good opportunity with some considerations
 * - LOW (Orange): Limited availability or variable conditions
 * 
 * DESIGN PRINCIPLES:
 * - Confidence ≠ Guarantee (clear disclaimers)
 * - Backend owns scoring logic (frontend only displays)
 * - No artificial urgency or pressure tactics
 * - Transparent methodology disclosure
 */

// ==================== Configuration ====================

const CONFIDENCE_CONFIG = {
    REFRESH_INTERVAL: 60000, // Refresh every 60 seconds
    ANIMATION_DURATION: 300,
    COLORS: {
        HIGH: '#10b981',    // Emerald green
        MEDIUM: '#f59e0b',  // Amber
        LOW: '#ef4444'      // Coral red (not alarming)
    },
    ICONS: {
        HIGH: 'fas fa-check-circle',
        MEDIUM: 'fas fa-info-circle',
        LOW: 'fas fa-exclamation-circle'
    }
};

// ==================== API Functions ====================

/**
 * Fetch booking confidence assessment from API.
 * @param {number} roomId - The room ID to assess
 * @param {string} checkInDate - Check-in date (YYYY-MM-DD)
 * @param {string} checkOutDate - Check-out date (YYYY-MM-DD)
 * @returns {Promise<Object>} Confidence assessment response
 */
async function fetchBookingConfidence(roomId, checkInDate, checkOutDate) {
    try {
        const params = new URLSearchParams({
            roomId: roomId,
            checkInDate: checkInDate,
            checkOutDate: checkOutDate
        });

        // Use CONFIG.API_BASE_URL for proper backend URL
        const baseUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) 
            ? CONFIG.API_BASE_URL 
            : 'https://luxestay-backend-1.onrender.com/api';

        const response = await fetch(`${baseUrl}/bookings/confidence?${params}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });

        if (!response.ok) {
            throw new Error(`Confidence API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to fetch booking confidence:', error);
        return null;
    }
}

/**
 * Get auth token from storage.
 */
function getAuthToken() {
    return localStorage.getItem(CONFIG?.TOKEN_KEY || 'luxestay_token') || '';
}

// ==================== UI Rendering ====================

/**
 * Render the confidence panel in the booking page.
 * @param {Object} confidence - Confidence assessment response
 * @param {HTMLElement} container - Container element to render into
 */
function renderConfidencePanel(confidence, container) {
    if (!confidence || !container) {
        console.warn('Missing confidence data or container');
        return;
    }

    const level = confidence.confidenceLevel;
    const score = confidence.confidenceScore;
    const color = CONFIDENCE_CONFIG.COLORS[level];
    const icon = CONFIDENCE_CONFIG.ICONS[level];

    container.innerHTML = `
        <div class="confidence-panel" data-level="${level}">
            <div class="confidence-header">
                <div class="confidence-badge" style="background: ${color}20; color: ${color}">
                    <i class="${icon}"></i>
                    <span>${level} CONFIDENCE</span>
                </div>
                <div class="confidence-score">
                    <span class="score-value">${score}</span>
                    <span class="score-max">/100</span>
                </div>
            </div>

            <p class="confidence-summary">${escapeHtml(confidence.summary)}</p>

            <div class="confidence-signals">
                ${renderSignalCard('Availability', confidence.availability, 'fas fa-door-open')}
                ${renderSignalCard('Pricing', confidence.pricing, 'fas fa-tag')}
                ${renderSignalCard('Demand', confidence.demand, 'fas fa-chart-line')}
                ${renderSignalCard('Success Rate', confidence.successLikelihood, 'fas fa-check-double')}
            </div>

            ${renderInsights(confidence.insights)}

            <div class="confidence-disclaimer">
                <i class="fas fa-info-circle"></i>
                <p>${escapeHtml(confidence.disclaimer)}</p>
            </div>
        </div>
    `;

    // Add animation
    container.querySelector('.confidence-panel').classList.add('fade-in');
}

/**
 * Render a signal card.
 */
function renderSignalCard(title, signal, icon) {
    if (!signal) return '';

    const scoreClass = getScoreClass(signal.signalScore);

    return `
        <div class="signal-card">
            <div class="signal-header">
                <i class="${icon}"></i>
                <span class="signal-title">${title}</span>
            </div>
            <div class="signal-body">
                <span class="signal-status ${scoreClass}">${escapeHtml(signal.status)}</span>
                <div class="signal-bar">
                    <div class="signal-bar-fill ${scoreClass}" style="width: ${signal.signalScore}%"></div>
                </div>
            </div>
            <p class="signal-explanation">${escapeHtml(signal.explanation)}</p>
        </div>
    `;
}

/**
 * Render insights list.
 */
function renderInsights(insights) {
    if (!insights || insights.length === 0) return '';

    const insightItems = insights.map(insight => `
        <div class="insight-item insight-${insight.type}">
            <i class="${insight.icon || 'fas fa-lightbulb'}"></i>
            <div class="insight-content">
                <span class="insight-title">${escapeHtml(insight.title)}</span>
                <span class="insight-message">${escapeHtml(insight.message)}</span>
            </div>
        </div>
    `).join('');

    return `
        <div class="confidence-insights">
            <h4><i class="fas fa-lightbulb"></i> Insights</h4>
            ${insightItems}
        </div>
    `;
}

/**
 * Get CSS class based on score.
 */
function getScoreClass(score) {
    if (score >= 70) return 'score-high';
    if (score >= 40) return 'score-medium';
    return 'score-low';
}

/**
 * Escape HTML to prevent XSS.
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== Compact Widget ====================

/**
 * Render a compact confidence indicator for listing pages.
 * @param {Object} confidence - Confidence assessment
 * @returns {string} HTML string for compact widget
 */
function renderConfidenceWidget(confidence) {
    if (!confidence) return '';

    const level = confidence.confidenceLevel;
    const color = CONFIDENCE_CONFIG.COLORS[level];
    const label = confidence.confidenceLevel === 'HIGH' ? 'Great availability' :
                  confidence.confidenceLevel === 'MEDIUM' ? 'Good availability' :
                  'Limited availability';

    return `
        <div class="confidence-widget" style="color: ${color}" 
             title="${escapeHtml(confidence.summary)}">
            <i class="${CONFIDENCE_CONFIG.ICONS[level]}"></i>
            <span>${label}</span>
        </div>
    `;
}

// ==================== Integration Functions ====================

/**
 * Initialize confidence display on booking page.
 * Call this when dates are selected.
 */
async function initializeBookingConfidence(roomId, checkInDate, checkOutDate) {
    const container = document.getElementById('booking-confidence-panel');
    if (!container) {
        console.warn('Confidence panel container not found');
        return;
    }

    // Show loading state
    container.innerHTML = `
        <div class="confidence-loading">
            <div class="loading-spinner"></div>
            <p>Analyzing booking conditions...</p>
        </div>
    `;

    try {
        const confidence = await fetchBookingConfidence(roomId, checkInDate, checkOutDate);
        
        if (confidence) {
            renderConfidencePanel(confidence, container);
        } else {
            container.innerHTML = `
                <div class="confidence-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Unable to load booking insights. Please proceed with your booking.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error initializing confidence:', error);
        container.innerHTML = '';
    }
}

/**
 * Update confidence when dates change.
 */
function onDatesChanged(roomId, checkInDate, checkOutDate) {
    // Debounce the API call
    clearTimeout(window.confidenceDebounceTimer);
    window.confidenceDebounceTimer = setTimeout(() => {
        initializeBookingConfidence(roomId, checkInDate, checkOutDate);
    }, 500);
}

/**
 * Set up auto-refresh for confidence data.
 */
function setupConfidenceAutoRefresh(roomId, checkInDate, checkOutDate) {
    // Clear any existing interval
    if (window.confidenceRefreshInterval) {
        clearInterval(window.confidenceRefreshInterval);
    }

    // Set up new refresh interval
    window.confidenceRefreshInterval = setInterval(() => {
        initializeBookingConfidence(roomId, checkInDate, checkOutDate);
    }, CONFIDENCE_CONFIG.REFRESH_INTERVAL);
}

/**
 * Clean up when leaving the page.
 */
function cleanupConfidence() {
    if (window.confidenceRefreshInterval) {
        clearInterval(window.confidenceRefreshInterval);
    }
    if (window.confidenceDebounceTimer) {
        clearTimeout(window.confidenceDebounceTimer);
    }
}

// ==================== Event Listeners ====================

// Clean up on page unload
window.addEventListener('beforeunload', cleanupConfidence);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchBookingConfidence,
        renderConfidencePanel,
        renderConfidenceWidget,
        initializeBookingConfidence,
        onDatesChanged,
        setupConfidenceAutoRefresh,
        cleanupConfidence
    };
}
