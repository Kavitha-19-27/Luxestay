/**
 * Trip Intelligence & Smart Itinerary Generator
 * 
 * Generates and displays intelligent, data-driven trip itineraries
 * based on booking details, hotel location, and nearby attractions.
 */

class ItineraryGenerator {
    constructor() {
        this.currentBookingId = null;
        this.currentItinerary = null;
        this.selectedMood = null;
        this.isLoading = false;
        
        // Mood options for itinerary personalization
        this.moodOptions = [
            { value: 'ROMANTIC_GETAWAY', label: 'Romantic Getaway', icon: 'fa-heart', color: '#e91e63' },
            { value: 'ADVENTURE', label: 'Adventure', icon: 'fa-hiking', color: '#ff5722' },
            { value: 'RELAXATION', label: 'Relaxation', icon: 'fa-spa', color: '#4caf50' },
            { value: 'FAMILY_FUN', label: 'Family Fun', icon: 'fa-users', color: '#2196f3' },
            { value: 'BUSINESS', label: 'Business', icon: 'fa-briefcase', color: '#607d8b' }
        ];
    }

    /**
     * Initialize the itinerary generator for a booking
     */
    async initialize(bookingId) {
        this.currentBookingId = bookingId;
        
        // Check if container exists, if not create it
        if (!document.getElementById('itinerary-section')) {
            console.warn('Itinerary section not found in DOM');
            return;
        }

        this.renderMoodSelector();
    }

    /**
     * Render mood selection UI
     */
    renderMoodSelector() {
        const container = document.getElementById('itinerary-section');
        if (!container) return;

        container.innerHTML = `
            <div class="itinerary-generator">
                <div class="itinerary-header">
                    <div class="itinerary-icon">
                        <i class="fas fa-route"></i>
                    </div>
                    <div class="itinerary-header-content">
                        <h2>Trip Intelligence</h2>
                        <p>Generate a personalized day-by-day itinerary for your stay</p>
                    </div>
                </div>

                <div class="mood-selection">
                    <h3><i class="fas fa-magic"></i> What's your travel mood?</h3>
                    <p class="mood-hint">Select your travel style for personalized recommendations</p>
                    
                    <div class="mood-options">
                        ${this.moodOptions.map(mood => `
                            <button class="mood-option" data-mood="${mood.value}" style="--mood-color: ${mood.color}">
                                <i class="fas ${mood.icon}"></i>
                                <span>${mood.label}</span>
                            </button>
                        `).join('')}
                    </div>

                    <button class="generate-btn" id="generate-itinerary-btn" disabled>
                        <i class="fas fa-wand-magic-sparkles"></i>
                        <span>Generate My Itinerary</span>
                    </button>
                </div>

                <div class="itinerary-content" id="itinerary-content" style="display: none;">
                    <!-- Itinerary will be rendered here -->
                </div>
            </div>
        `;

        this.bindMoodEvents();
    }

    /**
     * Bind event listeners for mood selection
     */
    bindMoodEvents() {
        const moodOptions = document.querySelectorAll('.mood-option');
        const generateBtn = document.getElementById('generate-itinerary-btn');

        moodOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove active from all
                moodOptions.forEach(o => o.classList.remove('active'));
                // Add active to clicked
                option.classList.add('active');
                this.selectedMood = option.dataset.mood;
                generateBtn.disabled = false;
            });
        });

        generateBtn.addEventListener('click', () => {
            this.generateItinerary();
        });
    }

    /**
     * Generate itinerary from API
     */
    async generateItinerary() {
        if (!this.currentBookingId) {
            console.error('No booking ID set');
            return;
        }

        const generateBtn = document.getElementById('generate-itinerary-btn');
        const contentDiv = document.getElementById('itinerary-content');
        
        // Show loading state
        this.isLoading = true;
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Generating...</span>';
        contentDiv.style.display = 'block';
        contentDiv.innerHTML = this.renderLoadingState();

        try {
            const moodParam = this.selectedMood ? `?mood=${this.selectedMood}` : '';
            const response = await API.get(`/bookings/${this.currentBookingId}/itinerary${moodParam}`);
            
            this.currentItinerary = response;
            this.renderItinerary(response);
            
            // Update button
            generateBtn.innerHTML = '<i class="fas fa-sync-alt"></i> <span>Regenerate</span>';
            generateBtn.disabled = false;

        } catch (error) {
            console.error('Failed to generate itinerary:', error);
            contentDiv.innerHTML = this.renderErrorState(error.message);
            generateBtn.innerHTML = '<i class="fas fa-redo"></i> <span>Try Again</span>';
            generateBtn.disabled = false;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Render loading state
     */
    renderLoadingState() {
        return `
            <div class="itinerary-loading">
                <div class="loading-animation">
                    <div class="loading-icon">
                        <i class="fas fa-map-marked-alt"></i>
                    </div>
                    <div class="loading-dots">
                        <span></span><span></span><span></span>
                    </div>
                </div>
                <h3>Crafting Your Perfect Itinerary</h3>
                <p>Analyzing nearby attractions, travel times, and your preferences...</p>
            </div>
        `;
    }

    /**
     * Render error state
     */
    renderErrorState(message) {
        return `
            <div class="itinerary-error">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Unable to Generate Itinerary</h3>
                <p>${message || 'Something went wrong. Please try again.'}</p>
            </div>
        `;
    }

    /**
     * Render the complete itinerary
     */
    renderItinerary(data) {
        const contentDiv = document.getElementById('itinerary-content');
        
        contentDiv.innerHTML = `
            <div class="itinerary-display">
                ${this.renderTripContext(data.tripContext)}
                ${this.renderSummary(data.summary)}
                ${this.renderDayPlans(data.dayPlans)}
                ${this.renderTips(data.tips)}
                ${this.renderActions()}
            </div>
        `;

        // Add animation to day cards
        this.animateDayCards();
    }

    /**
     * Render trip context header
     */
    renderTripContext(context) {
        const moodInfo = this.moodOptions.find(m => m.value === context.travelMood);
        
        return `
            <div class="trip-context">
                <div class="context-header">
                    <div class="hotel-info">
                        <h3><i class="fas fa-hotel"></i> ${context.hotelName}</h3>
                        <p class="address"><i class="fas fa-map-marker-alt"></i> ${context.city}, ${context.country}</p>
                    </div>
                    ${moodInfo ? `
                        <div class="mood-badge" style="background: ${moodInfo.color}">
                            <i class="fas ${moodInfo.icon}"></i>
                            <span>${moodInfo.label}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="trip-dates">
                    <div class="date-item">
                        <i class="fas fa-calendar-check"></i>
                        <div>
                            <span class="label">Check-in</span>
                            <span class="value">${this.formatDate(context.checkInDate)}</span>
                            <span class="time">${context.checkInTime}</span>
                        </div>
                    </div>
                    <div class="date-divider">
                        <i class="fas fa-moon"></i>
                        <span>${context.totalNights} ${context.totalNights === 1 ? 'Night' : 'Nights'}</span>
                    </div>
                    <div class="date-item">
                        <i class="fas fa-calendar-times"></i>
                        <div>
                            <span class="label">Check-out</span>
                            <span class="value">${this.formatDate(context.checkOutDate)}</span>
                            <span class="time">${context.checkOutTime}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render itinerary summary
     */
    renderSummary(summary) {
        if (!summary) {
            return '';
        }

        return `
            <div class="itinerary-summary">
                <h3><i class="fas fa-chart-pie"></i> Trip Overview</h3>
                <div class="summary-stats">
                    <div class="stat-item">
                        <div class="stat-value">${summary.totalActivities}</div>
                        <div class="stat-label">Activities</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${summary.uniqueCategories}</div>
                        <div class="stat-label">Categories</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${summary.totalDistanceKm} km</div>
                        <div class="stat-label">Total Distance</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${summary.averageRating} <i class="fas fa-star"></i></div>
                        <div class="stat-label">Avg Rating</div>
                    </div>
                    <div class="stat-item mood-match ${(summary.overallMoodMatch || 'personalized').toLowerCase().replace(' ', '-')}">
                        <div class="stat-value">${summary.overallMoodMatch || 'Personalized'}</div>
                        <div class="stat-label">Mood Match</div>
                    </div>
                </div>
                
                ${this.renderCategoryBreakdown(summary.categoryBreakdown)}
            </div>
        `;
    }

    /**
     * Render category breakdown
     */
    renderCategoryBreakdown(breakdown) {
        if (!breakdown || Object.keys(breakdown).length === 0) return '';

        const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
        const total = entries.reduce((sum, [_, count]) => sum + count, 0);

        return `
            <div class="category-breakdown">
                <h4>Activity Types</h4>
                <div class="category-bars">
                    ${entries.map(([category, count]) => `
                        <div class="category-bar">
                            <span class="category-name">${category}</span>
                            <div class="bar-container">
                                <div class="bar" style="width: ${(count / total) * 100}%"></div>
                            </div>
                            <span class="category-count">${count}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render all day plans
     */
    renderDayPlans(dayPlans) {
        if (!dayPlans || dayPlans.length === 0) {
            return '<div class="no-plans"><i class="fas fa-calendar-check"></i> Your itinerary is being prepared...</div>';
        }

        return `
            <div class="day-plans">
                <h3><i class="fas fa-calendar-alt"></i> Your Day-by-Day Itinerary</h3>
                ${dayPlans.map(day => this.renderDayCard(day)).join('')}
            </div>
        `;
    }

    /**
     * Render a single day card
     */
    renderDayCard(day) {
        return `
            <div class="day-card" data-day="${day.dayNumber}">
                <div class="day-header">
                    <div class="day-info">
                        <span class="day-label">${day.dayLabel}</span>
                        <span class="day-date">${this.formatDate(day.date)}</span>
                    </div>
                    <div class="day-theme">
                        <i class="fas fa-compass"></i>
                        <span>${day.theme}</span>
                    </div>
                </div>

                <div class="day-timeline">
                    ${day.activities.map(activity => this.renderActivity(activity)).join('')}
                    
                    ${day.hotelTime ? this.renderHotelTime(day.hotelTime) : ''}
                </div>

                ${this.renderDaySummary(day.daySummary)}
            </div>
        `;
    }

    /**
     * Render a single activity
     */
    renderActivity(activity) {
        const slotIcon = {
            'MORNING': 'fa-sun',
            'AFTERNOON': 'fa-cloud-sun',
            'EVENING': 'fa-moon'
        };
        
        // Check if this is a hotel-centric activity (no attractionId)
        const isHotelActivity = !activity.attractionId;
        const activityClass = isHotelActivity ? 'activity-item hotel-activity' : 'activity-item';

        return `
            <div class="${activityClass}">
                <div class="activity-timeline-marker">
                    <i class="fas ${slotIcon[activity.timeSlot]}"></i>
                </div>
                
                <div class="activity-card ${isHotelActivity ? 'hotel-centric' : ''}">
                    <div class="activity-header">
                        <div class="activity-time">
                            <i class="fas fa-clock"></i>
                            <span>${activity.suggestedTime}</span>
                        </div>
                        <div class="activity-category">
                            <i class="fas ${this.getCategoryIcon(activity.category)}"></i>
                            <span>${activity.categoryDisplay}</span>
                        </div>
                    </div>

                    <div class="activity-content">
                        ${activity.imageUrl ? `
                            <div class="activity-image">
                                <img src="${activity.imageUrl}" alt="${activity.name}" loading="lazy">
                            </div>
                        ` : isHotelActivity ? `
                            <div class="activity-icon-placeholder">
                                <i class="fas ${this.getCategoryIcon(activity.category)}"></i>
                            </div>
                        ` : ''}
                        
                        <div class="activity-details">
                            <h4>${activity.name}</h4>
                            <p class="description">${activity.description}</p>
                            
                            <div class="activity-meta">
                                <span class="rating">
                                    <i class="fas fa-star"></i> ${activity.rating}
                                </span>
                                <span class="duration">
                                    <i class="fas fa-hourglass-half"></i> ${activity.durationMinutes} min
                                </span>
                                <span class="distance">
                                    <i class="fas ${activity.distanceFromHotel === 0 ? 'fa-hotel' : 'fa-car'}"></i> ${activity.distanceDisplay}
                                </span>
                                <span class="price">
                                    ${activity.priceLevelDisplay}
                                </span>
                            </div>

                            ${activity.openingHours ? `
                                <div class="opening-hours">
                                    <i class="fas fa-door-open"></i> ${activity.openingHours}
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <div class="activity-recommendation">
                        <i class="fas fa-lightbulb"></i>
                        <span>${activity.whyRecommended}</span>
                    </div>

                    <div class="activity-travel">
                        <i class="fas ${activity.distanceFromHotel === 0 ? 'fa-check-circle' : 'fa-route'}"></i>
                        <span>${activity.distanceFromHotel === 0 ? 'At your hotel - no travel needed' : activity.travelTimeDisplay + ' from hotel'}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render hotel time suggestion
     */
    renderHotelTime(hotelTime) {
        return `
            <div class="activity-item hotel-time">
                <div class="activity-timeline-marker hotel">
                    <i class="fas fa-hotel"></i>
                </div>
                
                <div class="hotel-time-card">
                    <div class="hotel-time-header">
                        <span class="label">${hotelTime.label}</span>
                        <span class="time">${hotelTime.suggestedTime}</span>
                    </div>
                    <p class="suggestion">${hotelTime.suggestion}</p>
                    ${hotelTime.relevantAmenities && hotelTime.relevantAmenities.length > 0 ? `
                        <div class="amenities">
                            ${hotelTime.relevantAmenities.map(a => `<span class="amenity-tag">${a}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render day summary
     */
    renderDaySummary(summary) {
        if (!summary) return '';

        return `
            <div class="day-summary">
                <span><i class="fas fa-walking"></i> ${summary.totalActivities} activities</span>
                <span><i class="fas fa-clock"></i> ~${Math.round(summary.totalDurationMinutes / 60)}h active</span>
                <span><i class="fas fa-road"></i> ${summary.totalDistanceKm} km</span>
                <span class="intensity ${summary.intensityLevel.toLowerCase()}">
                    <i class="fas fa-tachometer-alt"></i> ${summary.intensityLevel}
                </span>
            </div>
        `;
    }

    /**
     * Render travel tips
     */
    renderTips(tips) {
        if (!tips || tips.length === 0) return '';

        return `
            <div class="travel-tips">
                <h3><i class="fas fa-lightbulb"></i> Travel Tips</h3>
                <ul>
                    ${tips.map(tip => `<li><i class="fas fa-check-circle"></i> ${tip}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    /**
     * Render action buttons
     */
    renderActions() {
        return `
            <div class="itinerary-actions">
                <button class="action-btn print" onclick="itineraryGenerator.printItinerary()">
                    <i class="fas fa-print"></i> Print
                </button>
                <button class="action-btn share" onclick="itineraryGenerator.shareItinerary()">
                    <i class="fas fa-share-alt"></i> Share
                </button>
                <button class="action-btn download" onclick="itineraryGenerator.downloadItinerary()">
                    <i class="fas fa-download"></i> Download PDF
                </button>
            </div>
        `;
    }

    /**
     * Helper: Format date
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Helper: Get category icon
     */
    getCategoryIcon(category) {
        const icons = {
            'LANDMARK': 'fa-landmark',
            'RESTAURANT': 'fa-utensils',
            'ACTIVITY': 'fa-hiking',
            'NATURE': 'fa-tree',
            'CULTURAL': 'fa-museum',
            'SHOPPING': 'fa-shopping-bag',
            'ENTERTAINMENT': 'fa-theater-masks',
            'WELLNESS': 'fa-spa',
            'BEACH': 'fa-umbrella-beach',
            'TEMPLE': 'fa-place-of-worship'
        };
        return icons[category] || 'fa-map-pin';
    }

    /**
     * Animate day cards on render
     */
    animateDayCards() {
        const cards = document.querySelectorAll('.day-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 150);
        });
    }

    /**
     * Print itinerary
     */
    printItinerary() {
        window.print();
    }

    /**
     * Share itinerary
     */
    async shareItinerary() {
        if (!this.currentItinerary) return;

        const shareData = {
            title: `Trip Itinerary - ${this.currentItinerary.tripContext.city}`,
            text: `Check out my ${this.currentItinerary.tripContext.totalNights}-night trip itinerary to ${this.currentItinerary.tripContext.city}!`,
            url: window.location.href
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Share cancelled');
            }
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
            this.showToast('Link copied to clipboard!');
        }
    }

    /**
     * Download itinerary as PDF (simplified version)
     */
    downloadItinerary() {
        if (!this.currentItinerary) return;
        
        // Create a printable version and trigger print
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Trip Itinerary - ${this.currentItinerary.tripContext.city}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
                    h1 { color: #1a1a2e; border-bottom: 2px solid #ffc107; padding-bottom: 10px; }
                    h2 { color: #16213e; margin-top: 30px; }
                    .day { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
                    .day-header { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 10px; }
                    .activity { margin: 15px 0; padding: 10px; background: #f9f9f9; border-radius: 5px; }
                    .activity h4 { margin: 0 0 5px 0; color: #333; }
                    .activity p { margin: 5px 0; color: #666; font-size: 14px; }
                    .meta { display: flex; gap: 15px; color: #888; font-size: 12px; }
                </style>
            </head>
            <body>
                <h1>🗺️ Trip Itinerary: ${this.currentItinerary.tripContext.city}</h1>
                <p><strong>Hotel:</strong> ${this.currentItinerary.tripContext.hotelName}</p>
                <p><strong>Dates:</strong> ${this.formatDate(this.currentItinerary.tripContext.checkInDate)} - ${this.formatDate(this.currentItinerary.tripContext.checkOutDate)}</p>
                <p><strong>Duration:</strong> ${this.currentItinerary.tripContext.totalNights} nights</p>
                
                ${this.currentItinerary.dayPlans.map(day => `
                    <div class="day">
                        <div class="day-header">
                            <strong>${day.dayLabel}</strong>
                            <span>${this.formatDate(day.date)}</span>
                        </div>
                        <em>${day.theme}</em>
                        
                        ${day.activities.map(act => `
                            <div class="activity">
                                <h4>${act.name}</h4>
                                <p>${act.description}</p>
                                <div class="meta">
                                    <span>⏰ ${act.suggestedTime}</span>
                                    <span>⭐ ${act.rating}</span>
                                    <span>🚗 ${act.distanceDisplay}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
                
                <h2>💡 Travel Tips</h2>
                <ul>
                    ${this.currentItinerary.tips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
                
                <p style="margin-top: 40px; color: #888; text-align: center;">Generated by LuxeStay Trip Intelligence</p>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }

    /**
     * Show toast notification
     */
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'itinerary-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Global instance
const itineraryGenerator = new ItineraryGenerator();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ItineraryGenerator, itineraryGenerator };
}
