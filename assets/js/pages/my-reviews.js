/**
 * My Reviews Page - Display user's review history
 */

document.addEventListener('DOMContentLoaded', async function() {
    // Auth check
    if (!Auth.isAuthenticated()) {
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
        return;
    }
    
    // Setup navbar auth
    UI.updateNavAuth?.();
    
    // Load reviews
    await loadMyReviews();
});

/**
 * Load user's reviews from API
 */
async function loadMyReviews() {
    const reviewsList = document.getElementById('reviewsList');
    
    try {
        const response = await API.reviews.getMyReviews();
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to load reviews');
        }
        
        const reviews = response.data || [];
        
        // Update stats
        updateStats(reviews);
        
        // Render reviews
        if (reviews.length === 0) {
            reviewsList.innerHTML = renderEmptyState();
        } else {
            reviewsList.innerHTML = reviews.map(renderReviewCard).join('');
        }
        
    } catch (error) {
        console.error('Error loading reviews:', error);
        reviewsList.innerHTML = `
            <div class="error-state">
                <div class="empty-reviews-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <h3>Failed to load reviews</h3>
                <p>${error.message || 'Please try again later'}</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

/**
 * Update stats cards with review data
 */
function updateStats(reviews) {
    const total = reviews.length;
    const approved = reviews.filter(r => r.status === 'APPROVED').length;
    const pending = reviews.filter(r => r.status === 'PENDING').length;
    const avgRating = total > 0 
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1)
        : '0.0';
    
    document.getElementById('totalReviews').textContent = total;
    document.getElementById('avgRating').textContent = avgRating;
    document.getElementById('approvedCount').textContent = approved;
    document.getElementById('pendingCount').textContent = pending;
}

/**
 * Render a single review card
 */
function renderReviewCard(review) {
    const statusClass = review.status.toLowerCase();
    const statusLabels = {
        'APPROVED': 'Published',
        'PENDING': 'Pending Review',
        'REJECTED': 'Not Published'
    };
    
    const starsHtml = renderStars(review.rating);
    const createdDate = formatDate(review.createdAt);
    
    return `
        <article class="review-card-full">
            <div class="review-card-header">
                <div class="review-hotel-info">
                    <div class="review-hotel-icon">
                        <i class="fas fa-hotel"></i>
                    </div>
                    <div>
                        <h3 class="review-hotel-name">
                            <a href="hotel-detail.html?id=${review.hotelId}">${escapeHtml(review.hotelName)}</a>
                        </h3>
                        <div class="review-stay-dates">
                            <i class="fas fa-calendar-alt"></i>
                            ${review.stayDates || 'Stay dates not available'}
                            ${review.roomName ? ` • ${escapeHtml(review.roomName)}` : ''}
                        </div>
                    </div>
                </div>
                <span class="review-status-badge ${statusClass}">
                    ${statusLabels[review.status] || review.status}
                </span>
            </div>
            
            <div class="review-rating-display">
                <span class="review-rating-stars">${starsHtml}</span>
                <span class="review-rating-value">${review.rating}.0</span>
            </div>
            
            ${review.title ? `<h4 class="review-title">${escapeHtml(review.title)}</h4>` : ''}
            
            <p class="review-comment">${escapeHtml(review.comment)}</p>
            
            ${review.status === 'REJECTED' && review.rejectionReason ? `
                <div class="rejection-reason">
                    <strong><i class="fas fa-info-circle"></i> Reason:</strong>
                    ${escapeHtml(review.rejectionReason)}
                </div>
            ` : ''}
            
            ${review.reply ? renderReply(review.reply) : ''}
            
            <div class="review-footer">
                <div class="review-meta">
                    <span class="review-meta-item">
                        <i class="fas fa-clock"></i>
                        ${createdDate}
                    </span>
                    ${review.isVerifiedStay ? `
                        <span class="review-verified-badge">
                            <i class="fas fa-check-circle"></i>
                            Verified Stay
                        </span>
                    ` : ''}
                    ${review.helpfulCount > 0 ? `
                        <span class="review-meta-item">
                            <i class="fas fa-thumbs-up"></i>
                            ${review.helpfulCount} found helpful
                        </span>
                    ` : ''}
                </div>
                <div>
                    <span class="review-meta-item" style="color: #888;">
                        Ref: ${review.bookingReference || `#${review.bookingId}`}
                    </span>
                </div>
            </div>
        </article>
    `;
}

/**
 * Render hotel owner reply section
 */
function renderReply(reply) {
    return `
        <div class="review-reply-section">
            <div class="review-reply-header">
                <i class="fas fa-reply"></i>
                Response from Hotel
            </div>
            <p class="review-reply-content">${escapeHtml(reply.content || reply.replyText || '')}</p>
        </div>
    `;
}

/**
 * Render star rating
 */
function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

/**
 * Render empty state when no reviews exist
 */
function renderEmptyState() {
    return `
        <div class="empty-reviews">
            <div class="empty-reviews-icon">
                <i class="fas fa-star"></i>
            </div>
            <h3>No Reviews Yet</h3>
            <p>After your stay, you can leave reviews to share your experience with other travelers.</p>
            <a href="my-bookings.html" class="btn btn-primary">
                <i class="fas fa-calendar-alt"></i>
                View My Bookings
            </a>
        </div>
    `;
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return 'Date not available';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return dateString;
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
