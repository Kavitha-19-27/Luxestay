/**
 * Wishlist/Favorites Component
 * Handles wishlist state and UI for hotel favorites
 */

const Wishlist = {
    // Cache of wishlisted hotel IDs
    wishlistedIds: new Set(),
    isInitialized: false,
    
    /**
     * Initialize wishlist state from server
     */
    async init() {
        if (this.isInitialized) return;
        
        // Check if user is authenticated
        if (!Auth.currentUser && !Auth.getToken()) {
            this.isInitialized = true;
            return;
        }
        
        try {
            const ids = await API.wishlist.getIds();
            this.wishlistedIds = new Set(ids);
            this.isInitialized = true;
            this.updateAllButtons();
        } catch (error) {
            console.error('Failed to fetch wishlist:', error);
        }
    },
    
    /**
     * Check if hotel is in wishlist
     */
    isWishlisted(hotelId) {
        return this.wishlistedIds.has(hotelId);
    },
    
    /**
     * Toggle hotel wishlist status
     */
    async toggle(hotelId, button = null) {
        // Check authentication
        if (!Auth.currentUser && !Auth.getToken()) {
            UI.showToast('Please log in to save favorites', 'warning');
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
            return false;
        }
        
        const wasWishlisted = this.isWishlisted(hotelId);
        
        // Optimistic UI update
        if (button) {
            this.updateButton(button, !wasWishlisted);
        }
        
        try {
            await API.wishlist.toggle(hotelId);
            
            // Update local state
            if (wasWishlisted) {
                this.wishlistedIds.delete(hotelId);
            } else {
                this.wishlistedIds.add(hotelId);
            }
            
            // Update all buttons for this hotel
            this.updateAllButtonsForHotel(hotelId);
            
            // Show feedback
            UI.showToast(
                wasWishlisted ? 'Removed from favorites' : 'Added to favorites',
                wasWishlisted ? 'info' : 'success'
            );
            
            return !wasWishlisted;
        } catch (error) {
            console.error('Failed to toggle wishlist:', error);
            
            // Revert optimistic update
            if (button) {
                this.updateButton(button, wasWishlisted);
            }
            
            UI.showToast('Failed to update favorites', 'error');
            return wasWishlisted;
        }
    },
    
    /**
     * Create a wishlist button element
     */
    createButton(hotelId, size = 'md') {
        const button = document.createElement('button');
        button.className = `wishlist-btn wishlist-btn-${size}`;
        button.dataset.hotelId = hotelId;
        button.setAttribute('aria-label', 'Add to favorites');
        button.type = 'button';
        
        button.innerHTML = `
            <i class="far fa-heart"></i>
            <i class="fas fa-heart"></i>
        `;
        
        // Update initial state
        if (this.isWishlisted(hotelId)) {
            this.updateButton(button, true);
        }
        
        // Add click handler
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggle(hotelId, button);
        });
        
        return button;
    },
    
    /**
     * Update button visual state
     */
    updateButton(button, isWishlisted) {
        button.classList.toggle('active', isWishlisted);
        button.setAttribute('aria-label', isWishlisted ? 'Remove from favorites' : 'Add to favorites');
        button.setAttribute('aria-pressed', isWishlisted);
    },
    
    /**
     * Update all wishlist buttons on page
     */
    updateAllButtons() {
        document.querySelectorAll('.wishlist-btn[data-hotel-id]').forEach(button => {
            const hotelId = parseInt(button.dataset.hotelId);
            this.updateButton(button, this.isWishlisted(hotelId));
        });
    },
    
    /**
     * Update all buttons for a specific hotel
     */
    updateAllButtonsForHotel(hotelId) {
        document.querySelectorAll(`.wishlist-btn[data-hotel-id="${hotelId}"]`).forEach(button => {
            this.updateButton(button, this.isWishlisted(hotelId));
        });
    },
    
    /**
     * Get wishlist items for display
     */
    async getItems() {
        if (!Auth.currentUser && !Auth.getToken()) {
            return [];
        }
        
        try {
            return await API.wishlist.getAll();
        } catch (error) {
            console.error('Failed to fetch wishlist items:', error);
            return [];
        }
    },
    
    /**
     * Render wishlist on a page (for dedicated wishlist page)
     */
    async renderWishlistPage(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div class="wishlist-loading">
                <div class="spinner"></div>
                <p>Loading your favorites...</p>
            </div>
        `;
        
        const items = await this.getItems();
        
        if (items.length === 0) {
            container.innerHTML = `
                <div class="wishlist-empty">
                    <i class="far fa-heart"></i>
                    <h3>No favorites yet</h3>
                    <p>Start exploring hotels and save your favorites!</p>
                    <a href="hotels.html" class="btn btn-primary">Browse Hotels</a>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="wishlist-grid">
                ${items.map(item => this.renderWishlistCard(item)).join('')}
            </div>
        `;
        
        // Attach event handlers
        container.querySelectorAll('.wishlist-btn').forEach(button => {
            const hotelId = parseInt(button.dataset.hotelId);
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggle(hotelId, button);
            });
        });
    },
    
    /**
     * Render a single wishlist card
     */
    renderWishlistCard(item) {
        const imageUrl = item.hotelImageUrl || 'assets/images/placeholder-hotel.jpg';
        const price = item.minPrice ? `$${item.minPrice}` : 'Contact for price';
        const stars = '★'.repeat(item.starRating || 0) + '☆'.repeat(5 - (item.starRating || 0));
        
        return `
            <div class="wishlist-card" data-hotel-id="${item.hotelId}">
                <a href="hotel-detail.html?id=${item.hotelId}" class="wishlist-card-link">
                    <div class="wishlist-card-image">
                        <img src="${imageUrl}" alt="${item.hotelName}" loading="lazy">
                        ${item.featured ? '<span class="wishlist-badge">Featured</span>' : ''}
                    </div>
                    <div class="wishlist-card-content">
                        <h3 class="wishlist-card-title">${item.hotelName}</h3>
                        <p class="wishlist-card-location">
                            <i class="fas fa-map-marker-alt"></i> ${item.hotelCity || 'Unknown Location'}
                        </p>
                        <div class="wishlist-card-rating">${stars}</div>
                        <div class="wishlist-card-price">
                            <span class="price-label">From</span>
                            <span class="price-value">${price}</span>
                            <span class="price-unit">/ night</span>
                        </div>
                    </div>
                </a>
                <button class="wishlist-btn wishlist-btn-card active" 
                        data-hotel-id="${item.hotelId}"
                        aria-label="Remove from favorites"
                        aria-pressed="true">
                    <i class="far fa-heart"></i>
                    <i class="fas fa-heart"></i>
                </button>
            </div>
        `;
    }
};

// Initialize on DOM ready if Auth is available
document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth to be ready
    if (typeof Auth !== 'undefined') {
        Auth.init().then(() => Wishlist.init());
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Wishlist;
}
