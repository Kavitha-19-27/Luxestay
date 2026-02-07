/**
 * Admin Reviews Moderation Page JavaScript
 */

let allReviews = [];
let currentFilter = 'all';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAdminAuth()) return;
    
    initSidebar();
    initFilters();
    initSearch();
    initKeyboardNav();
    loadReviewStats();
    loadReviews();
});

/**
 * Require admin authentication
 */
function requireAdminAuth() {
    if (!Auth.isAuthenticated()) {
        window.location.href = '../login.html?redirect=' + encodeURIComponent(window.location.href);
        return false;
    }
    
    if (!Auth.isAdmin()) {
        window.location.href = '../index.html';
        return false;
    }
    
    // Update UI
    const user = Auth.getUser();
    const displayName = user?.firstName || user?.name || 'Admin';
    document.getElementById('userName').textContent = displayName;
    document.getElementById('userAvatar').textContent = displayName[0].toUpperCase();
    
    return true;
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
    const filterBtns = document.querySelectorAll('.mod-filter-tab');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            currentFilter = btn.dataset.filter;
            loadReviews();
        });
    });
}

/**
 * Initialize search
 */
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    let debounceTimer;
    
    searchInput?.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            searchQuery = e.target.value.trim();
            filterAndRenderReviews();
        }, 300);
    });
}

/**
 * Load review stats
 */
async function loadReviewStats() {
    try {
        const response = await API.admin.getReviewStats();
        
        if (response.success && response.data) {
            const stats = response.data;
            document.getElementById('pendingCount').textContent = stats.pendingReviews || 0;
            document.getElementById('flaggedCount').textContent = stats.flaggedReviews || 0;
            document.getElementById('approvedCount').textContent = stats.approvedReviews || 0;
            document.getElementById('totalCount').textContent = stats.totalReviews || 0;
            document.getElementById('pendingBadge').textContent = stats.pendingReviews || 0;
            document.getElementById('flaggedBadge').textContent = stats.flaggedReviews || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

/**
 * Load reviews
 */
async function loadReviews() {
    const container = document.getElementById('reviewsList');
    
    // Show skeleton loading
    container.innerHTML = renderSkeletonCards(4);
    
    try {
        let response;
        
        if (currentFilter === 'PENDING') {
            response = await API.admin.getPendingReviews();
            if (response.success && response.data) {
                allReviews = response.data;
            }
        } else if (currentFilter === 'FLAGGED') {
            response = await API.admin.getFlaggedReviews();
            if (response.success && response.data) {
                allReviews = response.data;
            }
        } else {
            // For 'all', 'APPROVED', 'REJECTED' - use paginated endpoint
            const params = {};
            if (currentFilter !== 'all') {
                params.status = currentFilter;
            }
            response = await API.admin.getReviews(params);
            if (response.success && response.data) {
                // Paginated response has content array
                allReviews = response.data.content || [];
            }
        }
        
        if (allReviews && allReviews.length >= 0) {
            filterAndRenderReviews();
        } else {
            allReviews = [];
            showEmptyState(container);
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
        showErrorState(container);
    }
}

/**
 * Render skeleton loading cards
 */
function renderSkeletonCards(count) {
    return Array(count).fill(0).map(() => `
        <div class="mod-skeleton-card">
            <div class="mod-skeleton-header">
                <div style="display: flex; align-items: flex-start;">
                    <div class="mod-skeleton-avatar"></div>
                    <div class="mod-skeleton-lines">
                        <div class="mod-skeleton-line"></div>
                        <div class="mod-skeleton-line"></div>
                    </div>
                </div>
            </div>
            <div class="mod-skeleton-body">
                <div class="mod-skeleton-title"></div>
                <div class="mod-skeleton-text">
                    <div class="mod-skeleton-text-line"></div>
                    <div class="mod-skeleton-text-line"></div>
                    <div class="mod-skeleton-text-line"></div>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Filter and render reviews
 */
function filterAndRenderReviews() {
    const container = document.getElementById('reviewsList');
    let filtered = allReviews;
    
    // Apply search filter
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(r => 
            r.userName?.toLowerCase().includes(query) ||
            r.hotelName?.toLowerCase().includes(query) ||
            r.comment?.toLowerCase().includes(query) ||
            r.title?.toLowerCase().includes(query)
        );
    }
    
    if (filtered.length === 0) {
        showEmptyState(container);
        return;
    }
    
    container.innerHTML = filtered.map(review => renderAdminReviewCard(review)).join('');
    
    // Initialize expand/collapse functionality
    initExpandCollapse();
}

/**
 * Render review card for admin view with enhanced UX
 */
function renderAdminReviewCard(review) {
    const initials = getInitials(review.userName);
    const dateStr = formatRelativeDate(review.createdAt);
    const isLongComment = review.comment && review.comment.length > 200;
    
    // Star rating HTML
    const starsHtml = renderStars(review.rating);
    
    // Status badge HTML
    const statusBadgeHtml = renderStatusBadge(review.status);
    
    // Action buttons based on status
    const actionsHtml = renderActionButtons(review);
    
    // Owner reply section
    const replyHtml = review.reply ? `
        <div class="mod-owner-reply">
            <div class="mod-reply-header">
                <span class="mod-reply-label">
                    <i class="fas fa-reply"></i> Hotel Response
                </span>
                <span class="mod-reply-date">${formatRelativeDate(review.reply.createdAt)}</span>
            </div>
            <p class="mod-reply-text">${escapeHtml(review.reply.replyText)}</p>
        </div>
    ` : '';
    
    return `
        <article class="mod-review-card" data-review-id="${review.id}" data-status="${review.status}" role="article">
            <!-- Header: Author + Meta -->
            <div class="mod-review-header">
                <div class="mod-author-section">
                    <div class="mod-author-avatar" aria-hidden="true">${initials}</div>
                    <div class="mod-author-info">
                        <div class="mod-author-name">
                            ${escapeHtml(review.userName)}
                            ${review.isVerifiedStay ? `
                                <span class="mod-verified-badge">
                                    <i class="fas fa-check-circle"></i> Verified Stay
                                </span>
                            ` : ''}
                        </div>
                        <div class="mod-booking-context">
                            ${review.hotelName ? `<span class="hotel-name">${escapeHtml(review.hotelName)}</span>` : ''}
                            ${review.hotelName && review.roomName ? '<span class="separator">•</span>' : ''}
                            ${review.roomName ? `<span>${escapeHtml(review.roomName)}</span>` : ''}
                            ${(review.hotelName || review.roomName) && review.stayDates ? '<span class="separator">•</span>' : ''}
                            ${review.stayDates ? `<span>${review.stayDates}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="mod-meta-section">
                    <div class="mod-rating-display">
                        <div class="mod-rating-stars">${starsHtml}</div>
                        <span class="mod-rating-number">${review.rating}.0</span>
                    </div>
                    <span class="mod-review-date">${dateStr}</span>
                    ${statusBadgeHtml}
                </div>
            </div>
            
            <!-- Body: Review Content -->
            <div class="mod-review-body">
                ${review.title ? `<h4 class="mod-review-title">${escapeHtml(review.title)}</h4>` : ''}
                <div class="mod-review-content">
                    <p class="mod-review-text${isLongComment ? ' collapsed' : ''}" data-review-id="${review.id}">
                        ${escapeHtml(review.comment)}
                    </p>
                    ${isLongComment ? `
                        <button class="mod-expand-btn" data-review-id="${review.id}" aria-expanded="false">
                            <span>Show more</span>
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    ` : ''}
                </div>
                ${replyHtml}
            </div>
            
            <!-- Footer: Actions -->
            <div class="mod-review-actions">
                ${actionsHtml}
            </div>
        </article>
    `;
}

/**
 * Render star rating
 */
function renderStars(rating) {
    return Array(5).fill(0).map((_, i) => 
        `<i class="${i < rating ? 'fas' : 'far'} fa-star"></i>`
    ).join('');
}

/**
 * Render status badge
 */
function renderStatusBadge(status) {
    const badges = {
        'PENDING': { class: 'status-pending', icon: 'clock', text: 'Pending' },
        'APPROVED': { class: 'status-approved', icon: 'check-circle', text: 'Approved' },
        'REJECTED': { class: 'status-rejected', icon: 'times-circle', text: 'Rejected' },
        'FLAGGED': { class: 'status-flagged', icon: 'flag', text: 'Flagged' }
    };
    
    const badge = badges[status] || badges.PENDING;
    return `
        <span class="mod-status-badge ${badge.class}">
            <i class="fas fa-${badge.icon}"></i>
            <span>${badge.text}</span>
        </span>
    `;
}

/**
 * Render action buttons based on review status
 */
function renderActionButtons(review) {
    let primaryActions = '';
    
    if (review.status === 'PENDING' || review.status === 'FLAGGED') {
        primaryActions = `
            <button class="mod-action-btn btn-approve" onclick="openStatusModal(${review.id}, 'APPROVED')" aria-label="Approve review">
                <i class="fas fa-check"></i>
                <span>Approve</span>
            </button>
            <button class="mod-action-btn btn-reject" onclick="openStatusModal(${review.id}, 'REJECTED')" aria-label="Reject review">
                <i class="fas fa-times"></i>
                <span>Reject</span>
            </button>
        `;
    } else if (review.status === 'APPROVED') {
        primaryActions = `
            <button class="mod-action-btn btn-flag" onclick="openStatusModal(${review.id}, 'FLAGGED')" aria-label="Flag review">
                <i class="fas fa-flag"></i>
                <span>Flag</span>
            </button>
        `;
    } else if (review.status === 'REJECTED') {
        primaryActions = `
            <button class="mod-action-btn btn-restore" onclick="openStatusModal(${review.id}, 'APPROVED')" aria-label="Restore review">
                <i class="fas fa-undo"></i>
                <span>Restore</span>
            </button>
        `;
    }
    
    return `
        <div class="mod-action-group">
            ${primaryActions}
        </div>
        <button class="mod-action-btn btn-delete" onclick="openDeleteModal(${review.id})" aria-label="Delete review permanently">
            <i class="fas fa-trash"></i>
        </button>
    `;
}

/**
 * Initialize expand/collapse functionality for long reviews
 */
function initExpandCollapse() {
    document.querySelectorAll('.mod-expand-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const reviewId = btn.dataset.reviewId;
            const textEl = document.querySelector(`.mod-review-text[data-review-id="${reviewId}"]`);
            const isExpanded = !textEl.classList.contains('collapsed');
            
            if (isExpanded) {
                textEl.classList.add('collapsed');
                btn.innerHTML = '<span>Show more</span><i class="fas fa-chevron-down"></i>';
                btn.classList.remove('expanded');
                btn.setAttribute('aria-expanded', 'false');
            } else {
                textEl.classList.remove('collapsed');
                btn.innerHTML = '<span>Show less</span><i class="fas fa-chevron-up"></i>';
                btn.classList.add('expanded');
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

/**
 * Get initials from name
 */
function getInitials(name) {
    if (!name) return '?';
    return name.split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

/**
 * Format date as relative time
 */
function formatRelativeDate(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) {
            const diffMins = Math.floor(diffMs / (1000 * 60));
            return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
        }
        return diffHours === 1 ? '1 hour ago' : `${diffHours}h ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

/**
 * Show empty state
 */
function showEmptyState(container) {
    const messages = {
        'all': { 
            title: 'No Reviews Yet', 
            text: 'Guest reviews will appear here once they start submitting feedback.',
            icon: 'comments',
            success: false
        },
        'PENDING': { 
            title: 'All Caught Up!', 
            text: 'No reviews are waiting for moderation. Great job keeping things tidy!',
            icon: 'check-circle',
            success: true
        },
        'FLAGGED': { 
            title: 'No Flagged Reviews', 
            text: 'No reviews have been flagged by hotel owners for your attention.',
            icon: 'flag',
            success: false
        },
        'APPROVED': { 
            title: 'No Approved Reviews', 
            text: 'Approved reviews will appear here after you moderate pending submissions.',
            icon: 'check',
            success: false
        },
        'REJECTED': { 
            title: 'No Rejected Reviews', 
            text: 'Reviews that don\'t meet guidelines will appear here when rejected.',
            icon: 'times-circle',
            success: false
        }
    };
    
    const msg = messages[currentFilter] || messages.all;
    
    container.innerHTML = `
        <div class="mod-empty-state${msg.success ? ' success' : ''}">
            <div class="mod-empty-icon">
                <i class="fas fa-${msg.icon}"></i>
            </div>
            <h3>${msg.title}</h3>
            <p>${msg.text}</p>
        </div>
    `;
}

/**
 * Show error state
 */
function showErrorState(container) {
    container.innerHTML = `
        <div class="mod-error-state">
            <div class="mod-empty-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Unable to Load Reviews</h3>
            <p>Something went wrong while fetching reviews. Please check your connection and try again.</p>
            <button class="btn btn-primary" onclick="loadReviews()">
                <i class="fas fa-redo"></i> Try Again
            </button>
        </div>
    `;
}

// =====================================================
// STATUS MODAL
// =====================================================

function openStatusModal(reviewId, action) {
    const review = allReviews.find(r => r.id === reviewId);
    if (!review) return;
    
    document.getElementById('statusReviewId').value = reviewId;
    document.getElementById('statusAction').value = action;
    document.getElementById('statusReason').value = '';
    
    const configs = {
        'APPROVED': {
            title: 'Approve Review',
            icon: 'check-circle',
            iconColor: '#10b981',
            message: 'Are you sure you want to <strong class="text-success">approve</strong> this review? It will become publicly visible on the hotel page.',
            btnClass: 'btn-success',
            btnText: '<i class="fas fa-check"></i> Approve Review'
        },
        'REJECTED': {
            title: 'Reject Review',
            icon: 'times-circle',
            iconColor: '#ef4444',
            message: 'Are you sure you want to <strong class="text-danger">reject</strong> this review? It will not be visible to guests.',
            btnClass: 'btn-danger',
            btnText: '<i class="fas fa-times"></i> Reject Review'
        },
        'FLAGGED': {
            title: 'Flag Review',
            icon: 'flag',
            iconColor: '#f59e0b',
            message: 'Are you sure you want to <strong class="text-warning">flag</strong> this review for further investigation?',
            btnClass: 'btn-warning',
            btnText: '<i class="fas fa-flag"></i> Flag Review'
        }
    };
    
    const config = configs[action];
    
    document.getElementById('statusModalTitle').innerHTML = `
        <i class="fas fa-${config.icon}" style="color: ${config.iconColor}"></i>
        ${config.title}
    `;
    document.getElementById('statusConfirmMessage').innerHTML = `<p>${config.message}</p>`;
    
    const submitBtn = document.getElementById('statusSubmitBtn');
    submitBtn.className = `btn ${config.btnClass}`;
    submitBtn.innerHTML = config.btnText;
    
    // Show reason field for reject/flag, make required for rejection
    const reasonGroup = document.getElementById('reasonGroup');
    const reasonField = document.getElementById('statusReason');
    const reasonLabel = reasonGroup.querySelector('.mod-form-label');
    
    if (action !== 'APPROVED') {
        reasonGroup.style.display = 'block';
        if (action === 'REJECTED') {
            reasonField.required = true;
            reasonLabel.innerHTML = 'Reason <span style="color: #ef4444;">*</span>';
        } else {
            reasonField.required = false;
            reasonLabel.textContent = 'Reason (optional)';
        }
    } else {
        reasonGroup.style.display = 'none';
        reasonField.required = false;
    }
    
    document.getElementById('statusModalBackdrop').classList.add('active');
    document.getElementById('statusModal').classList.add('active');
    
    // Focus first interactive element
    setTimeout(() => submitBtn.focus(), 100);
}

function closeStatusModal() {
    document.getElementById('statusModalBackdrop').classList.remove('active');
    document.getElementById('statusModal').classList.remove('active');
}

async function handleStatusUpdate(event) {
    event.preventDefault();
    
    const reviewId = parseInt(document.getElementById('statusReviewId').value);
    const action = document.getElementById('statusAction').value;
    const reason = document.getElementById('statusReason').value.trim();
    const submitBtn = document.getElementById('statusSubmitBtn');
    
    // Validate reason required for rejections
    if (action === 'REJECTED' && !reason) {
        UI.toast('Rejection reason is required', 'error');
        document.getElementById('statusReason').focus();
        return;
    }
    
    UI.setButtonLoading(submitBtn, true);
    
    try {
        const response = await API.admin.updateReviewStatus(reviewId, action, reason || undefined);
        
        if (response.success) {
            UI.toast(`Review ${action.toLowerCase()} successfully!`, 'success');
            closeStatusModal();
            loadReviewStats();
            loadReviews();
        } else {
            throw new Error(response.message || 'Failed to update review');
        }
    } catch (error) {
        UI.toast(error.message || 'Failed to update review', 'error');
    } finally {
        UI.setButtonLoading(submitBtn, false);
    }
}

// =====================================================
// DELETE MODAL
// =====================================================

function openDeleteModal(reviewId) {
    document.getElementById('deleteReviewId').value = reviewId;
    document.getElementById('deleteReason').value = '';
    document.getElementById('deleteModalBackdrop').classList.add('active');
    document.getElementById('deleteModal').classList.add('active');
    
    // Focus the reason field
    setTimeout(() => document.getElementById('deleteReason').focus(), 100);
}

function closeDeleteModal() {
    document.getElementById('deleteModalBackdrop').classList.remove('active');
    document.getElementById('deleteModal').classList.remove('active');
}

async function handleDeleteReview(event) {
    event.preventDefault();
    
    const reviewId = parseInt(document.getElementById('deleteReviewId').value);
    const reason = document.getElementById('deleteReason').value.trim();
    const submitBtn = document.getElementById('deleteSubmitBtn');
    
    if (!reason) {
        UI.toast('Please provide a reason for deletion', 'error');
        return;
    }
    
    UI.setButtonLoading(submitBtn, true);
    
    try {
        const response = await API.admin.deleteReview(reviewId, reason);
        
        if (response.success) {
            UI.toast('Review deleted successfully', 'success');
            closeDeleteModal();
            loadReviewStats();
            loadReviews();
        } else {
            throw new Error(response.message || 'Failed to delete review');
        }
    } catch (error) {
        UI.toast(error.message || 'Failed to delete review', 'error');
    } finally {
        UI.setButtonLoading(submitBtn, false);
    }
}

// =====================================================
// KEYBOARD NAVIGATION
// =====================================================

function initKeyboardNav() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close any open modal
            if (document.getElementById('statusModal').classList.contains('active')) {
                closeStatusModal();
            }
            if (document.getElementById('deleteModal').classList.contains('active')) {
                closeDeleteModal();
            }
        }
    });
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
