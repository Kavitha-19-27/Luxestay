/**
 * Owner Reviews Management Page JavaScript
 */

let allReviews = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    if (!requireOwnerAuth()) return;
    
    initSidebar();
    initFilters();
    loadReviewStats();
    loadReviews();
});

/**
 * Require owner authentication
 */
function requireOwnerAuth() {
    if (!Auth.isAuthenticated()) {
        window.location.href = '../login.html?redirect=' + encodeURIComponent(window.location.href);
        return false;
    }
    
    if (!Auth.isHotelOwner()) {
        window.location.href = '../index.html';
        return false;
    }
    
    // Update UI
    const user = Auth.getUser();
    const displayName = user?.firstName || user?.name || 'Owner';
    document.getElementById('userName').textContent = displayName;
    document.getElementById('userAvatar').textContent = displayName[0].toUpperCase();
    
    // Load hotel name
    loadHotelInfo();
    
    return true;
}

/**
 * Load hotel info
 */
async function loadHotelInfo() {
    try {
        const response = await API.owner.getMyHotel();
        if (response.success && response.data) {
            document.getElementById('hotelName').textContent = response.data.name || 'My Hotel';
        }
    } catch (error) {
        console.error('Error loading hotel info:', error);
    }
}

/**
 * Initialize sidebar
 */
function initSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const logoutBtn = document.getElementById('logoutBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    
    sidebarToggle?.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
    
    logoutBtn?.addEventListener('click', () => {
        Auth.logout();
        window.location.href = '../index.html';
    });
    
    refreshBtn?.addEventListener('click', () => {
        loadReviewStats();
        loadReviews();
        UI.toast('Refreshing...', 'info');
    });
}

/**
 * Initialize filters
 */
function initFilters() {
    const filterBtns = document.querySelectorAll('.filter-tab');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            filterReviews();
        });
    });
}

/**
 * Load review stats
 */
async function loadReviewStats() {
    try {
        const response = await API.owner.getReviewsPendingReply();
        if (response.success && response.data) {
            document.getElementById('pendingReply').textContent = response.data.length || 0;
        }
        
        // We'll update the other stats when we load all reviews
    } catch (error) {
        console.error('Error loading review stats:', error);
    }
}

/**
 * Load reviews
 */
async function loadReviews() {
    const container = document.getElementById('reviewsList');
    
    // Show skeleton loading
    container.innerHTML = Reviews.renderReviewSkeletons(3);
    
    try {
        const response = await API.owner.getReviews();
        
        if (response.success && response.data) {
            // Handle paginated response - backend returns PagedResponse with content array
            allReviews = response.data.content || response.data || [];
            updateStats();
            filterReviews();
        } else {
            allReviews = [];
            showEmptyState(container);
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Unable to Load Reviews</h3>
                <p>Please try again later.</p>
                <button class="btn btn-primary" onclick="loadReviews()">Try Again</button>
            </div>
        `;
    }
}

/**
 * Update stats from reviews data
 */
function updateStats() {
    const total = allReviews.length;
    const replied = allReviews.filter(r => r.reply).length;
    const pending = total - replied;
    
    // Calculate average rating
    const avgRating = total > 0 
        ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1)
        : '0.0';
    
    document.getElementById('totalReviews').textContent = total;
    document.getElementById('repliedReviews').textContent = replied;
    document.getElementById('pendingReply').textContent = pending;
    document.getElementById('avgRating').textContent = avgRating;
}

/**
 * Filter reviews based on current filter
 */
function filterReviews() {
    const container = document.getElementById('reviewsList');
    let filtered = [];
    
    switch (currentFilter) {
        case 'pending-reply':
            filtered = allReviews.filter(r => !r.reply);
            break;
        case 'replied':
            filtered = allReviews.filter(r => r.reply);
            break;
        default:
            filtered = allReviews;
    }
    
    if (filtered.length === 0) {
        showEmptyState(container);
        return;
    }
    
    container.innerHTML = filtered.map(review => renderOwnerReviewCard(review)).join('');
}

/**
 * Render review card for owner view
 */
function renderOwnerReviewCard(review) {
    const starsHtml = Reviews.renderStars(review.rating);
    const dateStr = Reviews.formatDate(review.createdAt);
    const initials = Reviews.getInitials(review.userName);
    
    const statusBadge = review.status === 'FLAGGED' 
        ? '<span class="review-status-badge flagged"><i class="fas fa-flag"></i> Flagged</span>'
        : review.status === 'PENDING'
        ? '<span class="review-status-badge pending"><i class="fas fa-clock"></i> Pending Approval</span>'
        : '<span class="review-status-badge approved"><i class="fas fa-check"></i> Published</span>';
    
    let replyHtml = '';
    if (review.reply) {
        const replyDate = Reviews.formatDate(review.reply.createdAt);
        replyHtml = `
            <div class="review-reply owner-reply">
                <div class="review-reply-header">
                    <span class="review-reply-label">
                        <i class="fas fa-reply"></i> Your Response
                    </span>
                    <span class="review-reply-date">${replyDate}</span>
                </div>
                <p class="review-reply-text">${review.reply.replyText}</p>
            </div>
        `;
    }
    
    const actionsHtml = review.reply ? '' : `
        <div class="review-actions">
            <button class="btn btn-primary btn-sm" onclick="openReplyModal(${review.id})">
                <i class="fas fa-reply"></i> Reply
            </button>
            ${review.status !== 'FLAGGED' ? `
                <button class="btn btn-ghost btn-sm" onclick="openFlagModal(${review.id})">
                    <i class="fas fa-flag"></i> Flag
                </button>
            ` : ''}
        </div>
    `;
    
    return `
        <div class="review-card moderation-card" data-review-id="${review.id}">
            <div class="review-card-header">
                <div class="review-author">
                    <div class="review-avatar">${initials}</div>
                    <div class="review-author-info">
                        <div class="review-author-name">
                            ${escapeHtml(review.userName)}
                            ${review.isVerifiedStay ? `
                                <span class="verified-badge">
                                    <i class="fas fa-check"></i> Verified Stay
                                </span>
                            ` : ''}
                        </div>
                        <div class="review-stay-info">
                            ${review.roomName ? `${escapeHtml(review.roomName)} • ` : ''}
                            ${review.stayDates || ''}
                        </div>
                    </div>
                </div>
                <div class="review-rating">
                    <div class="review-rating-stars">${starsHtml}</div>
                    <div class="review-date">${dateStr}</div>
                    ${statusBadge}
                </div>
            </div>
            ${review.title ? `<h4 class="review-title">${review.title}</h4>` : ''}
            <p class="review-comment">${review.comment}</p>
            ${replyHtml}
            ${actionsHtml}
        </div>
    `;
}

/**
 * Show empty state
 */
function showEmptyState(container) {
    const messages = {
        'all': { title: 'No Reviews Yet', text: 'Guest reviews will appear here once they start coming in.' },
        'pending-reply': { title: 'All Caught Up!', text: 'You have replied to all reviews. Great job!' },
        'replied': { title: 'No Replies Yet', text: 'Reply to guest reviews to build better relationships.' }
    };
    
    const msg = messages[currentFilter] || messages.all;
    
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-comments"></i>
            <h3>${msg.title}</h3>
            <p>${msg.text}</p>
        </div>
    `;
}

// =====================================================
// REPLY MODAL
// =====================================================

function openReplyModal(reviewId) {
    const review = allReviews.find(r => r.id === reviewId);
    if (!review) return;
    
    document.getElementById('replyReviewId').value = reviewId;
    document.getElementById('replyText').value = '';
    document.getElementById('replyCharCount').textContent = '0 / 1000';
    
    // Show preview of original review
    const preview = document.getElementById('originalReviewPreview');
    preview.innerHTML = `
        <div class="review-preview">
            <div class="review-preview-header">
                <span class="review-preview-name">${escapeHtml(review.userName)}</span>
                <span class="review-preview-rating">${Reviews.renderStars(review.rating)}</span>
            </div>
            ${review.title ? `<strong>${review.title}</strong>` : ''}
            <p>${review.comment}</p>
        </div>
    `;
    
    document.getElementById('replyModal').classList.add('active');
}

function closeReplyModal() {
    document.getElementById('replyModal').classList.remove('active');
}

function updateReplyCharCount() {
    const textarea = document.getElementById('replyText');
    const counter = document.getElementById('replyCharCount');
    const count = textarea.value.length;
    counter.textContent = `${count} / 1000`;
    
    counter.classList.remove('warning', 'error');
    if (count > 900) counter.classList.add('warning');
    if (count >= 1000) counter.classList.add('error');
}

async function handleReplySubmit(event) {
    event.preventDefault();
    
    const reviewId = parseInt(document.getElementById('replyReviewId').value);
    const replyText = document.getElementById('replyText').value.trim();
    const submitBtn = document.getElementById('submitReplyBtn');
    
    if (!replyText || replyText.length < 10) {
        UI.toast('Reply must be at least 10 characters', 'error');
        return;
    }
    
    UI.setButtonLoading(submitBtn, true);
    
    try {
        const response = await API.owner.replyToReview(reviewId, replyText);
        
        if (response.success) {
            UI.toast('Reply posted successfully!', 'success');
            closeReplyModal();
            loadReviews(); // Refresh list
        } else {
            throw new Error(response.message || 'Failed to post reply');
        }
    } catch (error) {
        UI.toast(error.message || 'Failed to post reply', 'error');
    } finally {
        UI.setButtonLoading(submitBtn, false);
    }
}

// =====================================================
// FLAG MODAL
// =====================================================

function openFlagModal(reviewId) {
    document.getElementById('flagReviewId').value = reviewId;
    document.getElementById('flagReason').value = '';
    document.getElementById('flagModal').classList.add('active');
}

function closeFlagModal() {
    document.getElementById('flagModal').classList.remove('active');
}

async function handleFlagSubmit(event) {
    event.preventDefault();
    
    const reviewId = parseInt(document.getElementById('flagReviewId').value);
    const reason = document.getElementById('flagReason').value.trim();
    const submitBtn = document.getElementById('submitFlagBtn');
    
    UI.setButtonLoading(submitBtn, true);
    
    try {
        const response = await API.owner.flagReview(reviewId, reason || undefined);
        
        if (response.success) {
            UI.toast('Review flagged for admin review', 'success');
            closeFlagModal();
            loadReviews(); // Refresh list
        } else {
            throw new Error(response.message || 'Failed to flag review');
        }
    } catch (error) {
        UI.toast(error.message || 'Failed to flag review', 'error');
    } finally {
        UI.setButtonLoading(submitBtn, false);
    }
}

// =====================================================
// HELPERS
// =====================================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
