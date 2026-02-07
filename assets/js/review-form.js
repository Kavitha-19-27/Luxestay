/**
 * Mobile-First Review Form Module
 * Touch-friendly star rating and responsive review submission
 * 
 * FEATURES:
 * - Touch-friendly large star rating
 * - Haptic feedback on mobile
 * - Progressive enhancement
 * - Character counter
 * - Form validation
 * - Admin moderation messaging
 */

const ReviewForm = (function() {
    'use strict';
    
    const RATING_LABELS = ['', 'Terrible', 'Poor', 'Average', 'Good', 'Excellent'];
    const MIN_COMMENT_LENGTH = 20;
    const MAX_COMMENT_LENGTH = 2000;
    
    // ==================== INITIALIZATION ====================
    
    function init(container) {
        if (!container) return;
        
        // Initialize star ratings
        container.querySelectorAll('.star-rating-input').forEach(initStarRating);
        
        // Initialize character counters
        container.querySelectorAll('textarea[data-counter]').forEach(initCharCounter);
        
        // Initialize form validation
        container.querySelectorAll('form.review-form').forEach(initFormValidation);
    }
    
    // ==================== STAR RATING ====================
    
    function initStarRating(container) {
        const input = container.querySelector('input[type="hidden"]');
        const starContainer = container.querySelector('.stars-container');
        const label = container.querySelector('.rating-label');
        
        if (!starContainer) {
            // Create star buttons
            renderStars(container, input, label);
        }
        
        // Set initial value if present
        if (input && input.value) {
            updateStars(container, parseInt(input.value));
        }
    }
    
    function renderStars(container, input, label) {
        const starsContainer = document.createElement('div');
        starsContainer.className = 'stars-container';
        starsContainer.setAttribute('role', 'radiogroup');
        starsContainer.setAttribute('aria-label', 'Rating');
        
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('button');
            star.type = 'button';
            star.className = 'star-btn';
            star.setAttribute('data-value', i);
            star.setAttribute('aria-label', `${i} star${i > 1 ? 's' : ''} - ${RATING_LABELS[i]}`);
            star.innerHTML = '<i class="far fa-star"></i>';
            
            // Touch events for mobile
            star.addEventListener('touchstart', handleStarTouch, { passive: true });
            star.addEventListener('touchmove', handleStarSwipe, { passive: true });
            star.addEventListener('touchend', handleStarTouchEnd);
            
            // Click event for desktop
            star.addEventListener('click', (e) => {
                e.preventDefault();
                setRating(container, i, input, label);
            });
            
            // Hover preview for desktop
            star.addEventListener('mouseenter', () => previewRating(container, i, label));
            star.addEventListener('mouseleave', () => restoreRating(container, input, label));
            
            starsContainer.appendChild(star);
        }
        
        // Insert after hidden input
        const inputEl = container.querySelector('input');
        if (inputEl) {
            inputEl.insertAdjacentElement('afterend', starsContainer);
        } else {
            container.insertBefore(starsContainer, container.firstChild);
        }
    }
    
    function setRating(container, value, input, label) {
        if (input) {
            input.value = value;
        }
        updateStars(container, value);
        
        if (label) {
            label.textContent = RATING_LABELS[value];
            label.className = `rating-label rating-${value}`;
        }
        
        // Haptic feedback on mobile
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
        
        // Dispatch change event
        container.dispatchEvent(new CustomEvent('rating:change', { 
            detail: { value, label: RATING_LABELS[value] }
        }));
    }
    
    function updateStars(container, value) {
        const stars = container.querySelectorAll('.star-btn');
        stars.forEach((star, index) => {
            const starValue = index + 1;
            const icon = star.querySelector('i');
            
            if (starValue <= value) {
                star.classList.add('active');
                icon.className = 'fas fa-star';
            } else {
                star.classList.remove('active');
                icon.className = 'far fa-star';
            }
        });
    }
    
    function previewRating(container, value, label) {
        updateStars(container, value);
        if (label) {
            label.textContent = RATING_LABELS[value];
            label.className = `rating-label rating-${value} preview`;
        }
    }
    
    function restoreRating(container, input, label) {
        const currentValue = input ? parseInt(input.value) || 0 : 0;
        updateStars(container, currentValue);
        if (label) {
            label.textContent = currentValue > 0 ? RATING_LABELS[currentValue] : 'Tap to rate';
            label.className = `rating-label rating-${currentValue}`;
            label.classList.remove('preview');
        }
    }
    
    // Touch swipe for star rating
    let touchStartX = 0;
    
    function handleStarTouch(e) {
        touchStartX = e.touches[0].clientX;
    }
    
    function handleStarSwipe(e) {
        const container = e.target.closest('.star-rating-input');
        if (!container) return;
        
        const stars = container.querySelectorAll('.star-btn');
        const touch = e.touches[0];
        
        // Find which star the touch is over
        stars.forEach((star, index) => {
            const rect = star.getBoundingClientRect();
            if (touch.clientX >= rect.left && touch.clientX <= rect.right) {
                previewRating(container, index + 1, container.querySelector('.rating-label'));
            }
        });
    }
    
    function handleStarTouchEnd(e) {
        const container = e.target.closest('.star-rating-input');
        if (!container) return;
        
        const input = container.querySelector('input[type="hidden"]');
        const label = container.querySelector('.rating-label');
        const activeStars = container.querySelectorAll('.star-btn.active').length;
        
        if (activeStars > 0) {
            setRating(container, activeStars, input, label);
        }
    }
    
    // ==================== CHARACTER COUNTER ====================
    
    function initCharCounter(textarea) {
        const maxLength = parseInt(textarea.getAttribute('maxlength')) || MAX_COMMENT_LENGTH;
        const minLength = parseInt(textarea.getAttribute('minlength')) || MIN_COMMENT_LENGTH;
        
        // Create counter element
        const counter = document.createElement('div');
        counter.className = 'char-counter';
        updateCounter(counter, textarea.value.length, minLength, maxLength);
        
        textarea.insertAdjacentElement('afterend', counter);
        
        // Update on input
        textarea.addEventListener('input', () => {
            updateCounter(counter, textarea.value.length, minLength, maxLength);
        });
    }
    
    function updateCounter(counter, current, min, max) {
        counter.textContent = `${current} / ${max}`;
        
        if (current < min) {
            counter.className = 'char-counter warning';
            counter.textContent = `${min - current} more characters needed`;
        } else if (current > max * 0.9) {
            counter.className = 'char-counter danger';
        } else {
            counter.className = 'char-counter';
        }
    }
    
    // ==================== FORM VALIDATION ====================
    
    function initFormValidation(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!validateForm(form)) {
                return;
            }
            
            await submitReview(form);
        });
    }
    
    function validateForm(form) {
        let isValid = true;
        clearErrors(form);
        
        // Validate rating
        const ratingInput = form.querySelector('input[name="rating"]');
        if (!ratingInput || !ratingInput.value || ratingInput.value === '0') {
            showError(form.querySelector('.star-rating-input'), 'Please select a rating');
            isValid = false;
        }
        
        // Validate comment
        const comment = form.querySelector('textarea[name="comment"]');
        if (comment) {
            if (comment.value.length < MIN_COMMENT_LENGTH) {
                showError(comment, `Please write at least ${MIN_COMMENT_LENGTH} characters`);
                isValid = false;
            } else if (comment.value.length > MAX_COMMENT_LENGTH) {
                showError(comment, `Comment must be under ${MAX_COMMENT_LENGTH} characters`);
                isValid = false;
            }
        }
        
        return isValid;
    }
    
    function showError(element, message) {
        if (!element) return;
        
        element.classList.add('has-error');
        
        const error = document.createElement('div');
        error.className = 'field-error';
        error.textContent = message;
        element.insertAdjacentElement('afterend', error);
    }
    
    function clearErrors(form) {
        form.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
        form.querySelectorAll('.field-error').forEach(el => el.remove());
    }
    
    // ==================== FORM SUBMISSION ====================
    
    async function submitReview(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            
            const formData = new FormData(form);
            const data = {
                bookingId: parseInt(formData.get('bookingId')),
                rating: parseInt(formData.get('rating')),
                title: formData.get('title') || null,
                comment: formData.get('comment')
            };
            
            const response = await API.reviews.create(data);
            
            if (response.success) {
                showSuccessMessage(form);
                form.dispatchEvent(new CustomEvent('review:submitted', { detail: response.data }));
            } else {
                showFormError(form, response.message || 'Failed to submit review');
            }
            
        } catch (error) {
            console.error('Review submission error:', error);
            
            if (error.status === 429) {
                showFormError(form, 'Too many reviews submitted. Please try again later.');
            } else {
                showFormError(form, error.message || 'An error occurred. Please try again.');
            }
            
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
    
    function showSuccessMessage(form) {
        const success = document.createElement('div');
        success.className = 'review-success-message';
        success.innerHTML = `
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h3>Thank you for your review!</h3>
            <p>Your review has been submitted and is pending approval. We'll notify you once it's published.</p>
            <p class="moderation-note">
                <i class="fas fa-info-circle"></i>
                Our team reviews all submissions to ensure quality.
            </p>
        `;
        
        form.replaceWith(success);
    }
    
    function showFormError(form, message) {
        const existingError = form.querySelector('.form-error');
        if (existingError) existingError.remove();
        
        const error = document.createElement('div');
        error.className = 'form-error';
        error.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        
        form.insertBefore(error, form.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => error.remove(), 5000);
    }
    
    // ==================== RENDER FORM ====================
    
    function renderForm(container, bookingId, hotelName, roomName) {
        container.innerHTML = `
            <form class="review-form" id="review-form-${bookingId}">
                <input type="hidden" name="bookingId" value="${bookingId}">
                
                <div class="review-form-header">
                    <h3>Share Your Experience</h3>
                    <p class="review-hotel-info">
                        <span class="hotel-name">${hotelName}</span>
                        ${roomName ? `<span class="room-name">${roomName}</span>` : ''}
                    </p>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Overall Rating</label>
                    <div class="star-rating-input" data-rating="0">
                        <input type="hidden" name="rating" value="0" required>
                        <div class="rating-label">Tap to rate</div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="review-title-${bookingId}">
                        Review Title <span class="optional">(optional)</span>
                    </label>
                    <input 
                        type="text" 
                        id="review-title-${bookingId}"
                        name="title" 
                        class="form-input"
                        placeholder="Summarize your stay..."
                        maxlength="200"
                    >
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="review-comment-${bookingId}">
                        Your Review
                    </label>
                    <textarea 
                        id="review-comment-${bookingId}"
                        name="comment" 
                        class="form-textarea"
                        placeholder="What did you like or dislike? Tell other travelers about your experience..."
                        rows="5"
                        minlength="${MIN_COMMENT_LENGTH}"
                        maxlength="${MAX_COMMENT_LENGTH}"
                        data-counter="true"
                        required
                    ></textarea>
                </div>
                
                <div class="form-footer">
                    <p class="moderation-note">
                        <i class="fas fa-shield-alt"></i>
                        All reviews are moderated before publication
                    </p>
                    <button type="submit" class="btn btn-primary btn-lg">
                        Submit Review
                    </button>
                </div>
            </form>
        `;
        
        // Initialize the form
        init(container);
    }
    
    // ==================== PUBLIC API ====================
    
    return {
        init,
        renderForm,
        setRating: (container, value) => {
            const input = container.querySelector('input[type="hidden"]');
            const label = container.querySelector('.rating-label');
            setRating(container, value, input, label);
        }
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReviewForm;
}
