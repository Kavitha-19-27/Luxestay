/**
 * Memory Lane Module
 * "Remember your stay at..." Past Stay Memories
 * 
 * Week 11 Feature: Nostalgia triggers for completed bookings
 */

window.MemoryLane = (function() {
    'use strict';
    
    // Mood configurations
    const MOOD_STYLES = {
        ANNIVERSARY: { bg: '#FDF2F8', accent: '#EC4899', icon: '💍' },
        ROMANTIC: { bg: '#FEE2E2', accent: '#EF4444', icon: '❤️' },
        FAMILY: { bg: '#FEF3C7', accent: '#F59E0B', icon: '👨‍👩‍👧‍👦' },
        ADVENTURE: { bg: '#ECFDF5', accent: '#10B981', icon: '🏔️' },
        RELAXATION: { bg: '#E0F2FE', accent: '#0EA5E9', icon: '🧘' },
        BUSINESS: { bg: '#F3F4F6', accent: '#6B7280', icon: '💼' },
        CELEBRATION: { bg: '#FAF5FF', accent: '#A855F7', icon: '🎉' },
        SOLO: { bg: '#FFF7ED', accent: '#FB923C', icon: '✨' },
        WEEKEND: { bg: '#FEF9C3', accent: '#FACC15', icon: '🌅' }
    };
    
    /**
     * Initialize on profile page
     */
    async function initOnProfilePage(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Check if user is logged in
        const token = localStorage.getItem('token');
        if (!token) {
            container.innerHTML = '';
            return;
        }
        
        try {
            container.innerHTML = renderLoadingState();
            const response = await fetchMemoryLane(token);
            
            if (response.success && response.data) {
                const { memories, summary, greeting, suggestions } = response.data;
                
                if (memories && memories.length > 0) {
                    container.innerHTML = renderMemoryLane(memories, summary, greeting, suggestions);
                } else {
                    container.innerHTML = renderEmptyState();
                }
            } else {
                container.innerHTML = '';
            }
        } catch (error) {
            console.error('MemoryLane: Error loading memories:', error);
            container.innerHTML = '';
        }
    }
    
    /**
     * Initialize compact view (for my-bookings page sidebar)
     */
    async function initCompactView(containerId, limit = 3) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const token = localStorage.getItem('token');
        if (!token) {
            container.innerHTML = '';
            return;
        }
        
        try {
            const response = await fetchMemoryLane(token);
            
            if (response.success && response.data && response.data.memories && response.data.memories.length > 0) {
                const recentMemories = response.data.memories.slice(0, limit);
                container.innerHTML = renderCompactMemories(recentMemories);
            } else {
                container.innerHTML = '';
            }
        } catch (error) {
            console.error('MemoryLane: Error loading compact view:', error);
            container.innerHTML = '';
        }
    }
    
    /**
     * Fetch memory lane from API
     */
    async function fetchMemoryLane(token) {
        const baseUrl = window.CONFIG?.API_BASE_URL || 'https://luxestay-backend-1.onrender.com';
        const response = await fetch(`${baseUrl}/api/memory-lane`, {
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
            <div class="memory-lane-section">
                <div class="memory-lane-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading your memories...</p>
                </div>
            </div>
        `;
    }
    
    /**
     * Render empty state
     */
    function renderEmptyState() {
        return `
            <div class="memory-lane-section memory-lane-empty">
                <div class="empty-icon">📸</div>
                <h3>No Memories Yet</h3>
                <p>Complete your first stay to start building your travel story!</p>
                <a href="hotels.html" class="btn btn-primary">Explore Hotels</a>
            </div>
        `;
    }
    
    /**
     * Render full memory lane
     */
    function renderMemoryLane(memories, summary, greeting, suggestions) {
        return `
            <div class="memory-lane-section">
                <div class="memory-lane-header">
                    <div class="header-content">
                        <span class="header-icon">📖</span>
                        <div>
                            <h3>Memory Lane</h3>
                            <p class="greeting">${greeting || 'Your journey with us'}</p>
                        </div>
                    </div>
                    ${summary ? renderSummary(summary) : ''}
                </div>
                
                ${suggestions && suggestions.length > 0 ? renderSuggestions(suggestions) : ''}
                
                <div class="memories-grid">
                    ${memories.map(memory => renderMemoryCard(memory)).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Render summary stats
     */
    function renderSummary(summary) {
        return `
            <div class="memory-summary">
                <div class="summary-stat">
                    <span class="stat-value">${summary.totalStays || 0}</span>
                    <span class="stat-label">Stays</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-value">${summary.totalNights || 0}</span>
                    <span class="stat-label">Nights</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-value">${summary.uniqueDestinations || 0}</span>
                    <span class="stat-label">Destinations</span>
                </div>
                ${summary.travelStyle ? `
                    <div class="summary-badge">
                        <i class="fas fa-award"></i>
                        ${summary.travelStyle}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * Render suggestions
     */
    function renderSuggestions(suggestions) {
        return `
            <div class="memory-suggestions">
                ${suggestions.map(s => `<span class="suggestion-chip">${s}</span>`).join('')}
            </div>
        `;
    }
    
    /**
     * Render a single memory card
     */
    function renderMemoryCard(memory) {
        const moodStyle = MOOD_STYLES[memory.mood] || MOOD_STYLES.RELAXATION;
        const nights = memory.nights || 1;
        
        return `
            <div class="memory-card" style="--mood-bg: ${moodStyle.bg}; --mood-accent: ${moodStyle.accent}">
                <div class="memory-image">
                    <img src="${memory.hotelImage || 'assets/images/placeholder-hotel.jpg'}" 
                         alt="${memory.hotelName}"
                         onerror="this.src='assets/images/placeholder-hotel.jpg'">
                    <div class="memory-mood-badge">
                        <span class="mood-icon">${moodStyle.icon}</span>
                    </div>
                    <div class="memory-time-badge">${memory.timeSinceStay || 'Past stay'}</div>
                </div>
                
                <div class="memory-content">
                    <h4 class="memory-title">${memory.memoryTitle || memory.hotelName}</h4>
                    <p class="memory-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${memory.hotelName}, ${memory.hotelCity || ''}
                    </p>
                    
                    <div class="memory-details">
                        <span class="detail-item">
                            <i class="fas fa-calendar"></i>
                            ${formatDate(memory.checkIn)}
                        </span>
                        <span class="detail-item">
                            <i class="fas fa-moon"></i>
                            ${nights} night${nights > 1 ? 's' : ''}
                        </span>
                        ${memory.roomType ? `
                            <span class="detail-item">
                                <i class="fas fa-bed"></i>
                                ${memory.roomType}
                            </span>
                        ` : ''}
                    </div>
                    
                    ${memory.highlights && memory.highlights.length > 0 ? `
                        <div class="memory-highlights">
                            ${memory.highlights.map(h => `<span class="highlight-tag">${h}</span>`).join('')}
                        </div>
                    ` : ''}
                    
                    ${renderUserReview(memory)}
                    
                    ${memory.stayMilestones && memory.stayMilestones.length > 0 ? `
                        <div class="memory-milestones">
                            ${memory.stayMilestones.slice(0, 3).map(m => `
                                <div class="milestone-mini">
                                    <span class="milestone-icon">${m.icon}</span>
                                    <span class="milestone-title">${m.title}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="memory-actions">
                    ${memory.canBookAgain ? `
                        <a href="hotel-detail.html?id=${memory.hotelId}" class="btn btn-primary btn-sm">
                            <i class="fas fa-redo"></i> Book Again
                        </a>
                    ` : ''}
                    ${!memory.hasReview ? `
                        <a href="my-reviews.html?hotel=${memory.hotelId}" class="btn btn-outline btn-sm">
                            <i class="fas fa-star"></i> Leave Review
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Render user review section
     */
    function renderUserReview(memory) {
        if (!memory.hasReview || !memory.userRating) {
            return '';
        }
        
        const stars = Math.round(memory.userRating);
        const starHtml = Array(5).fill(0).map((_, i) => 
            `<i class="fas fa-star${i < stars ? '' : '-o'}"></i>`
        ).join('');
        
        return `
            <div class="memory-review">
                <div class="review-rating">
                    <span class="stars">${starHtml}</span>
                    <span class="rating-value">${memory.userRating.toFixed(1)}</span>
                </div>
                ${memory.userReviewSnippet ? `
                    <p class="review-snippet">"${memory.userReviewSnippet}"</p>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * Render compact memories view
     */
    function renderCompactMemories(memories) {
        return `
            <div class="memory-lane-compact">
                <div class="compact-header">
                    <span class="header-icon">📖</span>
                    <h4>Recent Memories</h4>
                </div>
                <div class="compact-list">
                    ${memories.map(memory => `
                        <a href="hotel-detail.html?id=${memory.hotelId}" class="compact-memory-item">
                            <img src="${memory.hotelImage || 'assets/images/placeholder-hotel.jpg'}" 
                                 alt="${memory.hotelName}"
                                 class="compact-image"
                                 onerror="this.src='assets/images/placeholder-hotel.jpg'">
                            <div class="compact-info">
                                <span class="compact-title">${memory.memoryTitle || memory.hotelName}</span>
                                <span class="compact-time">${memory.timeSinceStay}</span>
                            </div>
                            <span class="compact-mood">${MOOD_STYLES[memory.mood]?.icon || '✨'}</span>
                        </a>
                    `).join('')}
                </div>
                <a href="profile.html#memories" class="view-all-link">
                    View all memories →
                </a>
            </div>
        `;
    }
    
    /**
     * Format date helper
     */
    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    }
    
    // Public API
    return {
        initOnProfilePage,
        initCompactView,
        fetchMemoryLane
    };
})();
