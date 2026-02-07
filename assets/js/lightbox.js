/**
 * Lightbox Gallery Component
 * Mobile-first responsive photo viewer with touch/swipe support
 * 
 * Usage:
 * const lightbox = new Lightbox(images, startIndex);
 * lightbox.open();
 * 
 * Or use static method:
 * Lightbox.show(images, startIndex);
 */

class Lightbox {
    constructor(images, startIndex = 0) {
        this.images = images || [];
        this.currentIndex = startIndex;
        this.element = null;
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.isAnimating = false;
        
        // Bind methods
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
    }
    
    /**
     * Static method to show lightbox
     */
    static show(images, startIndex = 0) {
        const lightbox = new Lightbox(images, startIndex);
        lightbox.open();
        return lightbox;
    }
    
    /**
     * Open the lightbox
     */
    open() {
        if (this.images.length === 0) return;
        
        this.createElements();
        this.attachEvents();
        this.showImage(this.currentIndex);
        
        // Delay for animation
        requestAnimationFrame(() => {
            this.element.classList.add('active');
            document.body.classList.add('lightbox-open');
        });
    }
    
    /**
     * Close the lightbox
     */
    close() {
        this.element.classList.remove('active');
        document.body.classList.remove('lightbox-open');
        
        // Remove after animation
        setTimeout(() => {
            this.detachEvents();
            this.element.remove();
            this.element = null;
        }, 300);
    }
    
    /**
     * Create lightbox DOM elements
     */
    createElements() {
        const html = `
            <div class="lightbox" role="dialog" aria-modal="true" aria-label="Image gallery">
                <div class="lightbox-header">
                    <span class="lightbox-counter">
                        <span class="current">${this.currentIndex + 1}</span> / ${this.images.length}
                    </span>
                    <button class="lightbox-close" aria-label="Close gallery">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="lightbox-content">
                    <button class="lightbox-nav lightbox-prev" aria-label="Previous image">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    
                    <div class="lightbox-image-container">
                        <div class="lightbox-loader">
                            <div class="spinner"></div>
                        </div>
                        <img class="lightbox-image" src="" alt="" draggable="false">
                    </div>
                    
                    <button class="lightbox-nav lightbox-next" aria-label="Next image">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                
                <div class="lightbox-caption">
                    <p class="lightbox-caption-text"></p>
                </div>
                
                <div class="lightbox-thumbnails">
                    ${this.images.map((img, i) => `
                        <div class="lightbox-thumbnail ${i === this.currentIndex ? 'active' : ''}" 
                             data-index="${i}" 
                             tabindex="0"
                             role="button"
                             aria-label="View image ${i + 1}">
                            <img src="${img.url || img}" alt="${img.alt || `Image ${i + 1}`}" loading="lazy">
                        </div>
                    `).join('')}
                </div>
                
                <div class="lightbox-swipe-hint">
                    <i class="fas fa-hand-point-left"></i> Swipe to navigate
                </div>
            </div>
        `;
        
        const container = document.createElement('div');
        container.innerHTML = html;
        this.element = container.firstElementChild;
        document.body.appendChild(this.element);
        
        // Cache elements
        this.imageEl = this.element.querySelector('.lightbox-image');
        this.loaderEl = this.element.querySelector('.lightbox-loader');
        this.counterEl = this.element.querySelector('.lightbox-counter .current');
        this.captionEl = this.element.querySelector('.lightbox-caption-text');
        this.prevBtn = this.element.querySelector('.lightbox-prev');
        this.nextBtn = this.element.querySelector('.lightbox-next');
        this.contentEl = this.element.querySelector('.lightbox-content');
    }
    
    /**
     * Attach event listeners
     */
    attachEvents() {
        // Close button
        this.element.querySelector('.lightbox-close').addEventListener('click', () => this.close());
        
        // Navigation buttons
        this.prevBtn.addEventListener('click', () => this.prev());
        this.nextBtn.addEventListener('click', () => this.next());
        
        // Thumbnail clicks
        this.element.querySelectorAll('.lightbox-thumbnail').forEach(thumb => {
            thumb.addEventListener('click', () => {
                const index = parseInt(thumb.dataset.index);
                this.showImage(index);
            });
            thumb.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const index = parseInt(thumb.dataset.index);
                    this.showImage(index);
                }
            });
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', this.handleKeydown);
        
        // Touch events for swipe
        this.contentEl.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        this.contentEl.addEventListener('touchmove', this.handleTouchMove, { passive: true });
        this.contentEl.addEventListener('touchend', this.handleTouchEnd);
        
        // Click on backdrop to close
        this.element.addEventListener('click', (e) => {
            if (e.target === this.element || e.target.classList.contains('lightbox-content')) {
                this.close();
            }
        });
    }
    
    /**
     * Detach event listeners
     */
    detachEvents() {
        document.removeEventListener('keydown', this.handleKeydown);
    }
    
    /**
     * Show image at index
     */
    showImage(index) {
        if (this.isAnimating || index < 0 || index >= this.images.length) return;
        
        this.isAnimating = true;
        this.currentIndex = index;
        
        const image = this.images[index];
        const url = image.url || image;
        const alt = image.alt || `Image ${index + 1}`;
        
        // Show loader, hide image
        this.loaderEl.style.display = 'block';
        this.imageEl.classList.remove('loaded');
        
        // Load new image
        const img = new Image();
        img.onload = () => {
            this.imageEl.src = url;
            this.imageEl.alt = alt;
            this.loaderEl.style.display = 'none';
            
            requestAnimationFrame(() => {
                this.imageEl.classList.add('loaded');
                this.isAnimating = false;
            });
        };
        img.onerror = () => {
            this.loaderEl.style.display = 'none';
            this.imageEl.src = '';
            this.imageEl.alt = 'Failed to load image';
            this.isAnimating = false;
        };
        img.src = url;
        
        // Update counter
        this.counterEl.textContent = index + 1;
        
        // Update caption
        this.captionEl.textContent = alt;
        
        // Update thumbnails
        this.element.querySelectorAll('.lightbox-thumbnail').forEach((thumb, i) => {
            thumb.classList.toggle('active', i === index);
        });
        
        // Scroll thumbnail into view
        const activeThumbnail = this.element.querySelector(`.lightbox-thumbnail[data-index="${index}"]`);
        if (activeThumbnail) {
            activeThumbnail.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
        
        // Update nav button states
        this.prevBtn.classList.toggle('disabled', index === 0);
        this.nextBtn.classList.toggle('disabled', index === this.images.length - 1);
    }
    
    /**
     * Show previous image
     */
    prev() {
        if (this.currentIndex > 0) {
            this.showImage(this.currentIndex - 1);
        }
    }
    
    /**
     * Show next image
     */
    next() {
        if (this.currentIndex < this.images.length - 1) {
            this.showImage(this.currentIndex + 1);
        }
    }
    
    /**
     * Handle keyboard events
     */
    handleKeydown(e) {
        switch (e.key) {
            case 'Escape':
                this.close();
                break;
            case 'ArrowLeft':
                this.prev();
                break;
            case 'ArrowRight':
                this.next();
                break;
            case 'Home':
                this.showImage(0);
                break;
            case 'End':
                this.showImage(this.images.length - 1);
                break;
        }
    }
    
    /**
     * Handle touch start
     */
    handleTouchStart(e) {
        this.touchStartX = e.changedTouches[0].screenX;
    }
    
    /**
     * Handle touch move
     */
    handleTouchMove(e) {
        this.touchEndX = e.changedTouches[0].screenX;
    }
    
    /**
     * Handle touch end - detect swipe
     */
    handleTouchEnd() {
        const swipeThreshold = 50;
        const diff = this.touchStartX - this.touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe left -> next
                this.next();
            } else {
                // Swipe right -> prev
                this.prev();
            }
        }
        
        this.touchStartX = 0;
        this.touchEndX = 0;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Lightbox;
}
