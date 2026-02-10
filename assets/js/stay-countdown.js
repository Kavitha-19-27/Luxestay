/**
 * Stay Countdown Module
 * Journey progress tracking and milestone visualization
 * 
 * Features:
 * - Visual countdown timer
 * - Journey milestones
 * - Weather preview
 * - Packing suggestions
 * - Excitement building messages
 */

const StayCountdown = (function() {
    'use strict';
    
    const API_BASE = window.API?.BASE_URL || 'https://luxestay-backend-1.onrender.com';
    
    // Phase configurations
    const PHASE_CONFIGS = {
        JUST_BOOKED: {
            color: '#8B5CF6',
            background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)'
        },
        FAR_AWAY: {
            color: '#6366F1',
            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
        },
        WEEKS_AWAY: {
            color: '#3B82F6',
            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
        },
        DAYS_AWAY: {
            color: '#10B981',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
        },
        TOMORROW: {
            color: '#F59E0B',
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
        },
        TODAY: {
            color: '#EF4444',
            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
        },
        IN_PROGRESS: {
            color: '#10B981',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
        },
        COMPLETED: {
            color: '#6B7280',
            background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)'
        }
    };
    
    /**
     * Fetch countdown for a specific booking
     */
    async function getBookingCountdown(bookingId) {
        try {
            const response = await fetch(`${API_BASE}/api/countdown/booking/${bookingId}`);
            if (!response.ok) {
                console.warn('Could not fetch countdown for booking:', bookingId);
                return null;
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching booking countdown:', error);
            return null;
        }
    }
    
    /**
     * Fetch all countdowns for the authenticated user
     */
    async function getMyCountdowns() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('No auth token for countdown fetch');
                return [];
            }
            
            const response = await fetch(`${API_BASE}/api/countdown/my-countdowns`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                console.warn('Could not fetch user countdowns');
                return [];
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching user countdowns:', error);
            return [];
        }
    }
    
    /**
     * Format the countdown display
     */
    function formatCountdown(daysUntilCheckIn) {
        if (daysUntilCheckIn < 0) {
            return 'In Progress';
        } else if (daysUntilCheckIn === 0) {
            return 'Today!';
        } else if (daysUntilCheckIn === 1) {
            return 'Tomorrow!';
        } else if (daysUntilCheckIn < 7) {
            return `${daysUntilCheckIn} days`;
        } else if (daysUntilCheckIn < 30) {
            const weeks = Math.floor(daysUntilCheckIn / 7);
            const days = daysUntilCheckIn % 7;
            return days > 0 ? `${weeks}w ${days}d` : `${weeks} weeks`;
        } else {
            const months = Math.floor(daysUntilCheckIn / 30);
            const days = daysUntilCheckIn % 30;
            return days > 0 ? `${months}mo ${days}d` : `${months} months`;
        }
    }
    
    /**
     * Render the main countdown number
     */
    function renderCountdownNumber(daysUntilCheckIn, phase) {
        const phaseConfig = PHASE_CONFIGS[phase] || PHASE_CONFIGS.WEEKS_AWAY;
        
        let displayValue = daysUntilCheckIn;
        let unit = 'days';
        
        if (daysUntilCheckIn === 0) {
            displayValue = '🎉';
            unit = 'today';
        } else if (daysUntilCheckIn === 1) {
            displayValue = '1';
            unit = 'day';
        } else if (daysUntilCheckIn < 0) {
            displayValue = '✨';
            unit = 'staying';
        }
        
        return `
            <div class="countdown-number" style="background: ${phaseConfig.background}">
                <span class="countdown-value">${displayValue}</span>
                <span class="countdown-unit">${unit}</span>
            </div>
        `;
    }
    
    /**
     * Render milestone progress
     */
    function renderMilestones(milestones, completedCount) {
        if (!milestones || milestones.length === 0) {
            return '';
        }
        
        const progress = (completedCount / milestones.length) * 100;
        
        return `
            <div class="countdown-milestones">
                <div class="milestones-header">
                    <span class="milestones-title">Journey Progress</span>
                    <span class="milestones-progress">${completedCount}/${milestones.length}</span>
                </div>
                
                <div class="milestones-bar">
                    <div class="milestones-bar-fill" style="width: ${progress}%"></div>
                </div>
                
                <div class="milestones-list">
                    ${milestones.map(milestone => `
                        <div class="milestone-item ${milestone.completed ? 'completed' : ''}">
                            <span class="milestone-icon">${milestone.icon}</span>
                            <div class="milestone-info">
                                <span class="milestone-title">${milestone.title}</span>
                                <span class="milestone-desc">${milestone.description}</span>
                            </div>
                            ${milestone.completed ? '<span class="milestone-check">✓</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Render weather preview
     */
    function renderWeatherPreview(weather) {
        if (!weather) {
            return '';
        }
        
        return `
            <div class="countdown-weather">
                <div class="weather-header">
                    <span class="weather-icon">${weather.icon}</span>
                    <span class="weather-condition">${weather.condition}</span>
                </div>
                <div class="weather-temps">
                    <span class="temp-high">${weather.avgHighTemp}°</span>
                    <span class="temp-separator">/</span>
                    <span class="temp-low">${weather.avgLowTemp}°</span>
                </div>
                <p class="weather-recommendation">${weather.recommendation}</p>
            </div>
        `;
    }
    
    /**
     * Render packing suggestions
     */
    function renderPackingSuggestions(suggestions) {
        if (!suggestions || suggestions.length === 0) {
            return '';
        }
        
        // Group by category
        const byCategory = {};
        suggestions.forEach(item => {
            if (!byCategory[item.category]) {
                byCategory[item.category] = [];
            }
            byCategory[item.category].push(item);
        });
        
        return `
            <div class="countdown-packing">
                <h4 class="packing-title">📋 Packing Suggestions</h4>
                ${Object.entries(byCategory).map(([category, items]) => `
                    <div class="packing-category">
                        <span class="category-name">${category}</span>
                        <ul class="packing-list">
                            ${items.map(item => `
                                <li class="packing-item ${item.essential ? 'essential' : ''}">
                                    <span class="item-name">${item.item}</span>
                                    ${item.essential ? '<span class="essential-badge">Essential</span>' : ''}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Render the full countdown widget
     */
    function renderWidget(containerId, countdown) {
        const container = document.getElementById(containerId);
        if (!container || !countdown) {
            return;
        }
        
        const phaseConfig = PHASE_CONFIGS[countdown.phase] || PHASE_CONFIGS.WEEKS_AWAY;
        
        container.innerHTML = `
            <div class="stay-countdown-widget">
                <div class="countdown-header" style="background: ${phaseConfig.background}">
                    <div class="countdown-destination">
                        <h3 class="hotel-name">${countdown.hotelName || 'Your Stay'}</h3>
                        <span class="hotel-city">${countdown.hotelCity || ''}</span>
                    </div>
                    ${renderCountdownNumber(countdown.daysUntilCheckIn, countdown.phase)}
                </div>
                
                <div class="countdown-body">
                    <p class="excitement-message">${countdown.excitementMessage || ''}</p>
                    
                    <div class="countdown-dates">
                        <div class="date-item">
                            <span class="date-label">Check-in</span>
                            <span class="date-value">${formatDate(countdown.checkInDate)}</span>
                        </div>
                        <div class="date-separator">→</div>
                        <div class="date-item">
                            <span class="date-label">Check-out</span>
                            <span class="date-value">${formatDate(countdown.checkOutDate)}</span>
                        </div>
                    </div>
                    
                    ${renderMilestones(countdown.milestones, countdown.completedMilestones)}
                    
                    <div class="countdown-extras">
                        ${renderWeatherPreview(countdown.weatherPreview)}
                        ${renderPackingSuggestions(countdown.packingSuggestions)}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render a compact countdown card (for lists)
     */
    function renderCompactCard(countdown) {
        if (!countdown) return '';
        
        const phaseConfig = PHASE_CONFIGS[countdown.phase] || PHASE_CONFIGS.WEEKS_AWAY;
        
        return `
            <div class="countdown-compact-card">
                <div class="compact-badge" style="background: ${phaseConfig.background}">
                    <span class="compact-days">${countdown.daysUntilCheckIn >= 0 ? countdown.daysUntilCheckIn : '✨'}</span>
                    <span class="compact-unit">${countdown.daysUntilCheckIn === 1 ? 'day' : 'days'}</span>
                </div>
                <div class="compact-info">
                    <h4 class="compact-hotel">${countdown.hotelName}</h4>
                    <p class="compact-dates">${formatDate(countdown.checkInDate)} - ${formatDate(countdown.checkOutDate)}</p>
                </div>
                <a href="my-bookings.html?booking=${countdown.bookingId}" class="compact-link">View →</a>
            </div>
        `;
    }
    
    /**
     * Render a list of countdown cards
     */
    function renderCountdownList(containerId, countdowns) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (!countdowns || countdowns.length === 0) {
            container.innerHTML = `
                <div class="countdown-empty">
                    <span class="empty-icon">🏨</span>
                    <p>No upcoming stays</p>
                    <a href="hotels.html" class="btn btn-primary">Browse Hotels</a>
                </div>
            `;
            return;
        }
        
        container.innerHTML = countdowns.map(c => renderCompactCard(c)).join('');
    }
    
    /**
     * Format date for display
     */
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }
    
    /**
     * Initialize countdown widget for a booking
     */
    async function initForBooking(containerId, bookingId) {
        const countdown = await getBookingCountdown(bookingId);
        if (countdown) {
            renderWidget(containerId, countdown);
        }
    }
    
    /**
     * Initialize countdown list for current user
     */
    async function initForUser(containerId) {
        const countdowns = await getMyCountdowns();
        renderCountdownList(containerId, countdowns);
    }
    
    // Public API
    return {
        getBookingCountdown,
        getMyCountdowns,
        formatCountdown,
        renderWidget,
        renderCompactCard,
        renderCountdownList,
        initForBooking,
        initForUser,
        PHASE_CONFIGS
    };
})();

// Export for global access
window.StayCountdown = StayCountdown;
