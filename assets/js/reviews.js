/**
 * Reviews Module
 * Handles all review-related functionality for the hotel booking system
 */

const Reviews = {
    // =====================================================
    // PUBLIC: Load reviews for hotel detail page
    // =====================================================
    
    async loadHotelReviews(hotelId, container) {
        if (!container) return;
        
        // Show skeleton loading
        container.innerHTML = this.renderReviewSkeletons(3);
        
        try {
            const [reviewsResponse, statsResponse] = await Promise.all([
                API.reviews.getHotelReviews(hotelId),
                API.reviews.getHotelReviewStats(hotelId)
            ]);
            
            const reviews = reviewsResponse.data || [];
            const stats = statsResponse.data || null;
            
            container.innerHTML = this.renderReviewSection(reviews, stats);
            
            // Initialize lazy animations
            this.initReviewAnimations(container);
            
        } catch (error) {
            console.error('Error loading reviews:', error);
            container.innerHTML = this.renderReviewsEmpty('Unable to load reviews. Please try again later.');
        }
    },
    
    // =====================================================
    // RENDER: Review section with stats and list
    // =====================================================
    
    renderReviewSection(reviews, stats) {
        let html = '<div class="reviews-section">';
        
        // Header
        html += `
            <div class="reviews-header">
                <h2 class="reviews-title">
                    <i class="fas fa-star"></i>
                    Guest Reviews
                    <span class="reviews-count">(${stats?.totalReviews || 0} reviews)</span>
                </h2>
            </div>
        `;
        
        // Stats card if there are reviews
        if (stats && stats.totalReviews > 0) {
            html += this.renderStatsCard(stats);
        }
        
        // Review list
        if (reviews.length > 0) {
            html += '<div class="reviews-list">';
            reviews.forEach(review => {
                html += this.renderReviewCard(review);
            });
            html += '</div>';
        } else {
            html += this.renderReviewsEmpty('No reviews yet. Be the first to share your experience!');
        }
        
        html += '</div>';
        return html;
    },
    
    // =====================================================
    // RENDER: Stats card with rating distribution
    // =====================================================
    
    renderStatsCard(stats) {
        const avgRating = stats.averageRating?.toFixed(1) || '0.0';
        const fullStars = Math.floor(stats.averageRating || 0);
        const hasHalfStar = (stats.averageRating || 0) % 1 >= 0.5;
        
        let starsHtml = '';
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                starsHtml += '<i class="fas fa-star"></i>';
            } else if (i === fullStars && hasHalfStar) {
                starsHtml += '<i class="fas fa-star-half-alt"></i>';
            } else {
                starsHtml += '<i class="far fa-star"></i>';
            }
        }
        
        const ratings = [
            { stars: 5, count: stats.fiveStarCount || 0, percent: stats.fiveStarPercent || 0 },
            { stars: 4, count: stats.fourStarCount || 0, percent: stats.fourStarPercent || 0 },
            { stars: 3, count: stats.threeStarCount || 0, percent: stats.threeStarPercent || 0 },
            { stars: 2, count: stats.twoStarCount || 0, percent: stats.twoStarPercent || 0 },
            { stars: 1, count: stats.oneStarCount || 0, percent: stats.oneStarPercent || 0 }
        ];
        
        let distributionHtml = '';
        ratings.forEach(r => {
            distributionHtml += `
                <div class="rating-bar-row">
                    <div class="rating-bar-label">
                        ${r.stars} <i class="fas fa-star"></i>
                    </div>
                    <div class="rating-bar-container">
                        <div class="rating-bar-fill" style="width: ${r.percent}%"></div>
                    </div>
                    <div class="rating-bar-count">${r.count}</div>
                </div>
            `;
        });
        
        return `
            <div class="review-stats-card">
                <div class="review-stats-score">
                    <div class="review-stats-number">${avgRating}</div>
                    <div class="review-stats-label">out of 5</div>
                    <div class="review-stats-stars">${starsHtml}</div>
                </div>
                <div class="rating-distribution">
                    ${distributionHtml}
                </div>
            </div>
        `;
    },
    
    // =====================================================
    // RENDER: Individual review card
    // =====================================================
    
    renderReviewCard(review) {
        const initials = this.getInitials(review.userName);
        const starsHtml = this.renderStars(review.rating);
        const dateStr = this.formatDate(review.createdAt);
        
        let replyHtml = '';
        if (review.reply) {
            const replyDate = this.formatDate(review.reply.createdAt);
            replyHtml = `
                <div class="review-reply">
                    <div class="review-reply-header">
                        <span class="review-reply-label">
                            <i class="fas fa-reply"></i> Hotel Response
                        </span>
                        <span class="review-reply-date">${replyDate}</span>
                    </div>
                    <p class="review-reply-text">${review.reply.replyText}</p>
                </div>
            `;
        }
        
        return `
            <div class="review-card">
                <div class="review-card-header">
                    <div class="review-author">
                        <div class="review-avatar">${initials}</div>
                        <div class="review-author-info">
                            <div class="review-author-name">
                                ${this.escapeHtml(review.userName)}
                                ${review.isVerifiedStay ? `
                                    <span class="verified-badge">
                                        <i class="fas fa-check"></i> Verified Stay
                                    </span>
                                ` : ''}
                            </div>
                            <div class="review-stay-info">
                                ${review.roomName ? `${this.escapeHtml(review.roomName)} • ` : ''}
                                ${review.stayDates || ''}
                            </div>
                        </div>
                    </div>
                    <div class="review-rating">
                        <div class="review-rating-stars">${starsHtml}</div>
                        <div class="review-date">${dateStr}</div>
                    </div>
                </div>
                ${review.title ? `<h4 class="review-title">${review.title}</h4>` : ''}
                <p class="review-comment">${review.comment}</p>
                ${replyHtml}
            </div>
        `;
    },
    
    // =====================================================
    // RENDER: Review form (for my-bookings page)
    // =====================================================
    
    renderReviewForm(bookingId, hotelName, reviewId = null) {
        const ratingTexts = ['', 'Terrible', 'Poor', 'Average', 'Good', 'Excellent'];
        const isEditMode = reviewId !== null;
        
        return `
            <div class="review-form-container" id="review-form-${bookingId}" data-review-id="${reviewId || ''}">
                <form onsubmit="Reviews.submitReview(event, ${bookingId}, ${reviewId})">
                    <!-- Star Rating -->
                    <div class="star-rating-input">
                        <label class="star-rating-label">How was your stay?</label>
                        <div class="star-rating-buttons" id="rating-buttons-${bookingId}">
                            ${[1,2,3,4,5].map(i => `
                                <button type="button" class="star-rating-btn" 
                                        data-rating="${i}"
                                        onclick="Reviews.setRating(${bookingId}, ${i})"
                                        onmouseenter="Reviews.hoverRating(${bookingId}, ${i})"
                                        onmouseleave="Reviews.unhoverRating(${bookingId})">
                                    <i class="far fa-star"></i>
                                </button>
                            `).join('')}
                        </div>
                        <span class="star-rating-text" id="rating-text-${bookingId}">Select rating</span>
                        <input type="hidden" name="rating" id="rating-input-${bookingId}" required>
                    </div>
                    
                    <!-- Title -->
                    <div class="form-group">
                        <label for="review-title-${bookingId}">Title (optional)</label>
                        <input type="text" 
                               id="review-title-${bookingId}" 
                               name="title"
                               class="form-input"
                               maxlength="200"
                               placeholder="Summarize your experience in a few words">
                    </div>
                    
                    <!-- Comment -->
                    <div class="form-group textarea-with-counter">
                        <label for="review-comment-${bookingId}">Your Review</label>
                        <textarea id="review-comment-${bookingId}" 
                                  name="comment"
                                  class="form-textarea"
                                  rows="5"
                                  minlength="10"
                                  maxlength="2000"
                                  required
                                  placeholder="Share details about your stay, the rooms, amenities, service, and overall experience..."
                                  oninput="Reviews.updateCharCount(this, ${bookingId})"></textarea>
                        <span class="character-counter" id="char-count-${bookingId}">0 / 2000</span>
                    </div>
                    
                    <!-- Submit Button -->
                    <button type="submit" class="btn btn-primary" id="submit-review-${bookingId}">
                        <i class="fas fa-paper-plane"></i>
                        ${isEditMode ? 'Update Review' : 'Submit Review'}
                    </button>
                    
                    <p class="form-hint">
                        <i class="fas fa-info-circle"></i>
                        ${isEditMode ? 'Your updated review will be re-submitted for approval.' : 'Your review will be visible after admin approval.'}
                    </p>
                </form>
            </div>
        `;
    },
    
    // =====================================================
    // FORM: Star rating interactions
    // =====================================================
    
    selectedRatings: {},
    
    setRating(bookingId, rating) {
        this.selectedRatings[bookingId] = rating;
        const container = document.getElementById(`rating-buttons-${bookingId}`);
        const input = document.getElementById(`rating-input-${bookingId}`);
        const text = document.getElementById(`rating-text-${bookingId}`);
        
        if (!container || !input || !text) return;
        
        input.value = rating;
        const ratingTexts = ['', 'Terrible', 'Poor', 'Average', 'Good', 'Excellent'];
        text.textContent = ratingTexts[rating];
        
        const buttons = container.querySelectorAll('.star-rating-btn');
        buttons.forEach((btn, index) => {
            const star = btn.querySelector('i');
            if (index < rating) {
                btn.classList.add('active');
                star.className = 'fas fa-star';
            } else {
                btn.classList.remove('active');
                star.className = 'far fa-star';
            }
        });
    },
    
    hoverRating(bookingId, rating) {
        const container = document.getElementById(`rating-buttons-${bookingId}`);
        if (!container) return;
        
        const buttons = container.querySelectorAll('.star-rating-btn');
        buttons.forEach((btn, index) => {
            const star = btn.querySelector('i');
            if (index < rating) {
                btn.classList.add('hover');
                star.className = 'fas fa-star';
            }
        });
    },
    
    unhoverRating(bookingId) {
        const container = document.getElementById(`rating-buttons-${bookingId}`);
        if (!container) return;
        
        const currentRating = this.selectedRatings[bookingId] || 0;
        const buttons = container.querySelectorAll('.star-rating-btn');
        buttons.forEach((btn, index) => {
            const star = btn.querySelector('i');
            btn.classList.remove('hover');
            if (index < currentRating) {
                star.className = 'fas fa-star';
            } else {
                star.className = 'far fa-star';
            }
        });
    },
    
    updateCharCount(textarea, bookingId) {
        const counter = document.getElementById(`char-count-${bookingId}`);
        if (!counter) return;
        
        const count = textarea.value.length;
        const max = 2000;
        counter.textContent = `${count} / ${max}`;
        
        counter.classList.remove('warning', 'error');
        if (count > max * 0.9) {
            counter.classList.add('warning');
        }
        if (count >= max) {
            counter.classList.add('error');
        }
    },
    
    // =====================================================
    // FORM: Submit review
    // =====================================================
    
    async submitReview(event, bookingId, reviewId = null) {
        event.preventDefault();
        
        const form = event.target;
        const submitBtn = document.getElementById(`submit-review-${bookingId}`);
        const isEditMode = reviewId !== null;
        
        const rating = parseInt(form.rating.value);
        const title = form.title?.value?.trim() || null;
        const comment = form.comment.value.trim();
        
        // Validation
        if (!rating || rating < 1 || rating > 5) {
            UI.toast('Please select a rating', 'error');
            return;
        }
        
        if (!comment || comment.length < 10) {
            UI.toast('Review must be at least 10 characters', 'error');
            return;
        }
        
        // Show loading
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${isEditMode ? 'Updating...' : 'Submitting...'}`;
        
        try {
            let response;
            if (isEditMode) {
                response = await API.reviews.update(reviewId, {
                    rating,
                    title,
                    comment
                });
            } else {
                response = await API.reviews.create({
                    bookingId,
                    rating,
                    title,
                    comment
                });
            }
            
            UI.toast(response.message || (isEditMode ? 'Review updated successfully!' : 'Review submitted successfully!'), 'success');
            
            // Replace form with success message
            const container = document.getElementById(`review-form-${bookingId}`);
            if (container) {
                container.innerHTML = `
                    <div class="review-submitted-success">
                        <i class="fas fa-check-circle" style="color: var(--success-green); font-size: 2rem;"></i>
                        <h4>${isEditMode ? 'Review Updated!' : 'Thank You for Your Review!'}</h4>
                        <p>${isEditMode ? 'Your review has been updated and is pending re-approval.' : 'Your review has been submitted and is pending approval.'} It will be visible to other guests once approved.</p>
                        <span class="review-status-badge pending">
                            <i class="fas fa-clock"></i> Pending Approval
                        </span>
                    </div>
                `;
            }
            
        } catch (error) {
            UI.toast(error.message || `Failed to ${isEditMode ? 'update' : 'submit'} review`, 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    },
    
    // =====================================================
    // CHECK: Can user review a booking?
    // =====================================================
    
    async canReviewBooking(bookingId) {
        try {
            const response = await API.reviews.canReview(bookingId);
            return response.data?.canReview === true;
        } catch (error) {
            console.error('Error checking review eligibility:', error);
            return false;
        }
    },
    
    // =====================================================
    // HELPERS: Rendering utilities
    // =====================================================
    
    renderStars(rating) {
        let html = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                html += '<i class="fas fa-star"></i>';
            } else {
                html += '<i class="fas fa-star empty"></i>';
            }
        }
        return html;
    },
    
    renderReviewSkeletons(count = 3) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="review-skeleton">
                    <div class="review-skeleton-header">
                        <div class="review-skeleton-avatar"></div>
                        <div class="review-skeleton-info">
                            <div class="review-skeleton-name"></div>
                            <div class="review-skeleton-date"></div>
                        </div>
                    </div>
                    <div class="review-skeleton-content"></div>
                </div>
            `;
        }
        return html;
    },
    
    renderReviewsEmpty(message) {
        return `
            <div class="reviews-empty">
                <div class="reviews-empty-icon">
                    <i class="fas fa-comments"></i>
                </div>
                <h4 class="reviews-empty-title">No Reviews Yet</h4>
                <p class="reviews-empty-text">${message}</p>
            </div>
        `;
    },
    
    getInitials(name) {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    },
    
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    initReviewAnimations(container) {
        // Trigger staggered animations after a short delay
        setTimeout(() => {
            const cards = container.querySelectorAll('.review-card');
            cards.forEach((card, index) => {
                card.style.animationDelay = `${0.1 * (index + 1)}s`;
            });
        }, 100);
    }
};

// Make Reviews available globally
window.Reviews = Reviews;
