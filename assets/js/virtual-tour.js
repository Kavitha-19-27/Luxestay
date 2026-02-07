/**
 * Virtual Tour Component
 * 360° panoramic viewer with gyroscope support and lazy loading
 * 
 * FEATURES:
 * - Mobile gyroscope navigation
 * - Desktop mouse/touch navigation
 * - Lazy loading of scenes
 * - Hotspot navigation
 * - Fullscreen support
 * - Fallback for unsupported devices
 * 
 * Uses Pannellum-compatible data format
 */

const VirtualTour = {
    // State
    currentTour: null,
    currentScene: null,
    viewer: null,
    gyroscopeEnabled: false,
    isFullscreen: false,
    
    // Configuration
    config: {
        autoLoad: true,
        autoRotate: 0, // degrees per second, 0 = disabled
        showControls: true,
        hfov: 100, // initial horizontal field of view
        minHfov: 50,
        maxHfov: 120,
        friction: 0.15,
        gyroscopeSupported: false,
        lowEndDevice: false
    },
    
    /**
     * Initialize tour viewer
     */
    async init(containerId, tourId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Virtual tour container not found');
            return;
        }
        
        // Merge options
        Object.assign(this.config, options);
        
        // Detect device capabilities
        await this.detectCapabilities();
        
        // Show loading state
        this.showLoading();
        
        try {
            // Fetch tour data
            const tourData = await this.fetchTour(tourId);
            if (!tourData) {
                this.showFallback('Tour not available');
                return;
            }
            
            this.currentTour = tourData;
            
            // Check if device can render 360
            if (this.config.lowEndDevice && !options.forceFull) {
                this.showFallback('Your device may have limited performance. View gallery instead?', true);
                return;
            }
            
            // Initialize the viewer
            this.initViewer();
            
        } catch (error) {
            console.error('Failed to initialize virtual tour:', error);
            this.showFallback('Failed to load tour');
        }
    },
    
    /**
     * Fetch tour data from API
     */
    async fetchTour(tourId) {
        try {
            const response = await API.request(`/tours/view/${tourId}`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch tour:', error);
            return null;
        }
    },
    
    /**
     * Fetch single scene (lazy loading)
     */
    async fetchScene(tourId, sceneId) {
        try {
            const response = await API.request(`/tours/${tourId}/scenes/${sceneId}`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch scene:', error);
            return null;
        }
    },
    
    /**
     * Check if hotel has virtual tour
     */
    async checkAvailability(hotelId) {
        try {
            const response = await API.request(`/tours/check/${hotelId}`);
            return response.data?.hasTour || false;
        } catch (error) {
            return false;
        }
    },
    
    /**
     * Detect device capabilities
     */
    async detectCapabilities() {
        // Check for gyroscope
        if (window.DeviceOrientationEvent) {
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                // iOS 13+
                this.config.gyroscopeSupported = true;
            } else {
                // Other devices
                this.config.gyroscopeSupported = true;
            }
        }
        
        // Detect low-end device (rough heuristic)
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                // Check for known low-end GPUs
                const lowEndIndicators = ['Mali-4', 'Adreno (TM) 3', 'PowerVR SGX'];
                this.config.lowEndDevice = lowEndIndicators.some(i => renderer.includes(i));
            }
        }
        
        // Check memory (if available)
        if (navigator.deviceMemory && navigator.deviceMemory < 2) {
            this.config.lowEndDevice = true;
        }
    },
    
    /**
     * Initialize the 360 viewer
     */
    initViewer() {
        const scenes = this.currentTour.scenes || [];
        const startScene = scenes.find(s => s.isStartScene) || scenes[0];
        
        if (!startScene) {
            this.showFallback('No scenes available');
            return;
        }
        
        // Create viewer HTML
        this.container.innerHTML = this.createViewerHTML();
        
        // Get viewer element
        this.viewerElement = this.container.querySelector('.virtual-tour-panorama');
        
        // Initialize Pannellum or custom viewer
        this.initPanorama(startScene);
        
        // Set up controls
        this.initControls();
        
        // Load scene thumbnails
        this.renderSceneThumbnails(scenes);
    },
    
    /**
     * Create viewer HTML structure
     */
    createViewerHTML() {
        return `
            <div class="virtual-tour-viewer" role="application" aria-label="360 degree virtual tour">
                <div class="virtual-tour-panorama" id="tour-panorama"></div>
                
                <div class="virtual-tour-header">
                    <div>
                        <div class="virtual-tour-title">${this.escapeHtml(this.currentTour.name)}</div>
                        <div class="virtual-tour-scene-name" id="current-scene-name"></div>
                    </div>
                    <div class="virtual-tour-gyro-indicator" id="gyro-indicator" style="display: none;">
                        <i class="fas fa-mobile-alt"></i>
                        <span>Gyroscope</span>
                    </div>
                </div>
                
                <div class="virtual-tour-side-controls">
                    <div class="virtual-tour-zoom">
                        <button class="virtual-tour-zoom-btn" id="zoom-in" aria-label="Zoom in">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="virtual-tour-zoom-btn" id="zoom-out" aria-label="Zoom out">
                            <i class="fas fa-minus"></i>
                        </button>
                    </div>
                </div>
                
                <div class="virtual-tour-scenes" id="scene-thumbnails" role="tablist" aria-label="Tour scenes"></div>
                
                <div class="virtual-tour-controls">
                    ${this.config.gyroscopeSupported ? `
                        <button class="virtual-tour-control-btn" id="gyro-toggle" aria-label="Toggle gyroscope">
                            <i class="fas fa-compass"></i>
                        </button>
                    ` : ''}
                    <button class="virtual-tour-control-btn" id="fullscreen-toggle" aria-label="Toggle fullscreen">
                        <i class="fas fa-expand"></i>
                    </button>
                    <button class="virtual-tour-control-btn" id="autorotate-toggle" aria-label="Toggle auto-rotate">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
                
                <div class="virtual-tour-info-panel" id="info-panel" role="dialog" aria-hidden="true">
                    <button class="virtual-tour-info-panel-close" aria-label="Close info panel">
                        <i class="fas fa-times"></i>
                    </button>
                    <h3 id="info-panel-title"></h3>
                    <p id="info-panel-content"></p>
                </div>
            </div>
        `;
    },
    
    /**
     * Initialize panorama viewer
     */
    initPanorama(scene) {
        this.currentScene = scene;
        
        // Update scene name
        const sceneNameEl = document.getElementById('current-scene-name');
        if (sceneNameEl) {
            sceneNameEl.textContent = scene.name;
        }
        
        // Check if Pannellum is available
        if (typeof pannellum !== 'undefined') {
            this.initPannellum(scene);
        } else {
            // Fallback to custom implementation
            this.initCustomViewer(scene);
        }
    },
    
    /**
     * Initialize with Pannellum library
     */
    initPannellum(scene) {
        if (this.viewer) {
            this.viewer.destroy();
        }
        
        this.viewer = pannellum.viewer('tour-panorama', {
            type: scene.sceneType === 'VIDEO_360' ? 'video' : 'equirectangular',
            panorama: scene.mediaUrl,
            autoLoad: this.config.autoLoad,
            autoRotate: this.config.autoRotate,
            compass: false,
            hfov: scene.initialHfov || this.config.hfov,
            pitch: scene.initialPitch || 0,
            yaw: scene.initialYaw || 0,
            minHfov: this.config.minHfov,
            maxHfov: this.config.maxHfov,
            friction: this.config.friction,
            mouseZoom: true,
            keyboardZoom: true,
            hotSpots: this.convertHotspots(scene.hotspots || [])
        });
        
        // Listen for scene loaded
        this.viewer.on('load', () => {
            this.hideLoading();
        });
    },
    
    /**
     * Custom viewer fallback (basic implementation)
     */
    initCustomViewer(scene) {
        const panoramaEl = document.getElementById('tour-panorama');
        if (!panoramaEl) return;
        
        // Create image-based viewer for basic support
        panoramaEl.innerHTML = `
            <div class="custom-panorama" style="
                width: 100%;
                height: 100%;
                background-image: url('${scene.mediaUrl}');
                background-size: cover;
                background-position: center;
                cursor: grab;
            "></div>
        `;
        
        // Add basic drag support
        const pano = panoramaEl.querySelector('.custom-panorama');
        let isDragging = false;
        let startX = 0;
        let currentPos = 50;
        
        pano.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            pano.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const delta = (e.clientX - startX) * 0.1;
            currentPos = Math.max(0, Math.min(100, currentPos - delta));
            pano.style.backgroundPositionX = currentPos + '%';
            startX = e.clientX;
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            pano.style.cursor = 'grab';
        });
        
        // Render hotspots manually
        this.renderCustomHotspots(scene.hotspots || [], panoramaEl);
        
        this.hideLoading();
    },
    
    /**
     * Convert hotspots to Pannellum format
     */
    convertHotspots(hotspots) {
        return hotspots.map(h => ({
            pitch: h.pitch,
            yaw: h.yaw,
            type: h.hotspotType === 'SCENE' ? 'scene' : 'info',
            text: h.text,
            sceneId: h.targetSceneId?.toString(),
            cssClass: h.cssClass || '',
            clickHandlerArgs: { hotspot: h },
            clickHandlerFunc: (args) => this.handleHotspotClick(args.hotspot)
        }));
    },
    
    /**
     * Render hotspots for custom viewer
     */
    renderCustomHotspots(hotspots, container) {
        const hotspotsContainer = document.createElement('div');
        hotspotsContainer.className = 'virtual-tour-hotspots';
        hotspotsContainer.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none;';
        
        hotspots.forEach(h => {
            // Convert pitch/yaw to x/y (simplified)
            const x = 50 + (h.yaw / 180) * 50;
            const y = 50 - (h.pitch / 90) * 50;
            
            const hotspotEl = document.createElement('div');
            hotspotEl.className = `virtual-tour-hotspot virtual-tour-hotspot--${h.hotspotType.toLowerCase()}`;
            hotspotEl.style.cssText = `left: ${x}%; top: ${y}%; pointer-events: auto;`;
            hotspotEl.innerHTML = `
                <div class="virtual-tour-hotspot-icon">
                    <i class="fas ${this.getHotspotIcon(h.hotspotType)}"></i>
                </div>
                <div class="virtual-tour-hotspot-label">${this.escapeHtml(h.text)}</div>
            `;
            hotspotEl.addEventListener('click', () => this.handleHotspotClick(h));
            hotspotsContainer.appendChild(hotspotEl);
        });
        
        container.appendChild(hotspotsContainer);
    },
    
    /**
     * Get icon for hotspot type
     */
    getHotspotIcon(type) {
        const icons = {
            'SCENE': 'fa-arrow-right',
            'INFO': 'fa-info',
            'LINK': 'fa-external-link-alt'
        };
        return icons[type] || 'fa-circle';
    },
    
    /**
     * Handle hotspot click
     */
    async handleHotspotClick(hotspot) {
        switch (hotspot.hotspotType) {
            case 'SCENE':
                if (hotspot.targetSceneId) {
                    await this.loadScene(hotspot.targetSceneId);
                }
                break;
            case 'INFO':
                this.showInfoPanel(hotspot.text, hotspot.description || '');
                break;
            case 'LINK':
                if (hotspot.url) {
                    window.open(hotspot.url, '_blank');
                }
                break;
        }
    },
    
    /**
     * Load a scene (with lazy loading)
     */
    async loadScene(sceneId) {
        // Check if scene is already loaded in tour data
        let scene = this.currentTour.scenes?.find(s => s.id === sceneId);
        
        if (!scene) {
            // Lazy load the scene
            this.showLoading();
            scene = await this.fetchScene(this.currentTour.id, sceneId);
            if (!scene) {
                this.hideLoading();
                console.error('Failed to load scene');
                return;
            }
        }
        
        this.initPanorama(scene);
        this.updateActiveThumbnail(sceneId);
    },
    
    /**
     * Render scene thumbnails
     */
    renderSceneThumbnails(scenes) {
        const container = document.getElementById('scene-thumbnails');
        if (!container || scenes.length <= 1) {
            container?.remove();
            return;
        }
        
        container.innerHTML = scenes.map(scene => `
            <button class="virtual-tour-scene-thumb ${scene.id === this.currentScene?.id ? 'active' : ''}"
                    data-scene-id="${scene.id}"
                    role="tab"
                    aria-selected="${scene.id === this.currentScene?.id}"
                    aria-label="Go to ${this.escapeHtml(scene.name)}">
                <img src="${scene.thumbnailUrl || scene.previewUrl || scene.mediaUrl}" 
                     alt="${this.escapeHtml(scene.name)}"
                     loading="lazy">
                <span class="virtual-tour-scene-thumb-label">${this.escapeHtml(scene.name)}</span>
            </button>
        `).join('');
        
        // Add click handlers
        container.querySelectorAll('.virtual-tour-scene-thumb').forEach(thumb => {
            thumb.addEventListener('click', () => {
                const sceneId = parseInt(thumb.dataset.sceneId);
                this.loadScene(sceneId);
            });
        });
    },
    
    /**
     * Update active thumbnail
     */
    updateActiveThumbnail(sceneId) {
        const container = document.getElementById('scene-thumbnails');
        if (!container) return;
        
        container.querySelectorAll('.virtual-tour-scene-thumb').forEach(thumb => {
            const isActive = parseInt(thumb.dataset.sceneId) === sceneId;
            thumb.classList.toggle('active', isActive);
            thumb.setAttribute('aria-selected', isActive);
        });
    },
    
    /**
     * Initialize controls
     */
    initControls() {
        // Gyroscope toggle
        const gyroToggle = document.getElementById('gyro-toggle');
        if (gyroToggle) {
            gyroToggle.addEventListener('click', () => this.toggleGyroscope());
        }
        
        // Fullscreen toggle
        const fullscreenToggle = document.getElementById('fullscreen-toggle');
        if (fullscreenToggle) {
            fullscreenToggle.addEventListener('click', () => this.toggleFullscreen());
        }
        
        // Auto-rotate toggle
        const autoRotateToggle = document.getElementById('autorotate-toggle');
        if (autoRotateToggle) {
            autoRotateToggle.addEventListener('click', () => this.toggleAutoRotate());
        }
        
        // Zoom controls
        const zoomIn = document.getElementById('zoom-in');
        const zoomOut = document.getElementById('zoom-out');
        if (zoomIn) zoomIn.addEventListener('click', () => this.zoom(-10));
        if (zoomOut) zoomOut.addEventListener('click', () => this.zoom(10));
        
        // Info panel close
        const infoPanelClose = this.container.querySelector('.virtual-tour-info-panel-close');
        if (infoPanelClose) {
            infoPanelClose.addEventListener('click', () => this.hideInfoPanel());
        }
        
        // Keyboard navigation
        this.container.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Fullscreen change listener
        document.addEventListener('fullscreenchange', () => this.onFullscreenChange());
    },
    
    /**
     * Toggle gyroscope control
     */
    async toggleGyroscope() {
        const indicator = document.getElementById('gyro-indicator');
        const toggle = document.getElementById('gyro-toggle');
        
        if (!this.gyroscopeEnabled) {
            // Request permission on iOS
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                try {
                    const permission = await DeviceOrientationEvent.requestPermission();
                    if (permission !== 'granted') {
                        UI.showToast('Gyroscope permission denied', 'error');
                        return;
                    }
                } catch (error) {
                    console.error('Gyroscope permission error:', error);
                    return;
                }
            }
            
            // Enable gyroscope
            this.gyroscopeEnabled = true;
            window.addEventListener('deviceorientation', this.handleDeviceOrientation.bind(this));
            
            if (indicator) {
                indicator.style.display = 'flex';
                indicator.classList.remove('inactive');
            }
            if (toggle) toggle.classList.add('active');
            
        } else {
            // Disable gyroscope
            this.gyroscopeEnabled = false;
            window.removeEventListener('deviceorientation', this.handleDeviceOrientation.bind(this));
            
            if (indicator) indicator.classList.add('inactive');
            if (toggle) toggle.classList.remove('active');
        }
    },
    
    /**
     * Handle device orientation for gyroscope
     */
    handleDeviceOrientation(event) {
        if (!this.viewer || !this.gyroscopeEnabled) return;
        
        const { alpha, beta, gamma } = event;
        
        // Convert device orientation to panorama view
        // This is a simplified implementation
        if (typeof this.viewer.setYaw === 'function') {
            this.viewer.setYaw(gamma || 0, false);
        }
        if (typeof this.viewer.setPitch === 'function') {
            this.viewer.setPitch(Math.max(-85, Math.min(85, (beta || 0) - 45)), false);
        }
    },
    
    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        const toggle = document.getElementById('fullscreen-toggle');
        
        if (!this.isFullscreen) {
            if (this.container.requestFullscreen) {
                this.container.requestFullscreen();
            } else if (this.container.webkitRequestFullscreen) {
                this.container.webkitRequestFullscreen();
            }
            this.container.classList.add('fullscreen');
            this.isFullscreen = true;
            if (toggle) toggle.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
            this.container.classList.remove('fullscreen');
            this.isFullscreen = false;
            if (toggle) toggle.innerHTML = '<i class="fas fa-expand"></i>';
        }
    },
    
    /**
     * Handle fullscreen change
     */
    onFullscreenChange() {
        const toggle = document.getElementById('fullscreen-toggle');
        this.isFullscreen = !!document.fullscreenElement;
        this.container.classList.toggle('fullscreen', this.isFullscreen);
        if (toggle) {
            toggle.innerHTML = this.isFullscreen ? 
                '<i class="fas fa-compress"></i>' : 
                '<i class="fas fa-expand"></i>';
        }
    },
    
    /**
     * Toggle auto-rotate
     */
    toggleAutoRotate() {
        const toggle = document.getElementById('autorotate-toggle');
        
        if (this.viewer && typeof this.viewer.isAutoRotating === 'function') {
            if (this.viewer.isAutoRotating()) {
                this.viewer.stopAutoRotate();
                if (toggle) toggle.classList.remove('active');
            } else {
                this.viewer.startAutoRotate(2);
                if (toggle) toggle.classList.add('active');
            }
        }
    },
    
    /**
     * Zoom in/out
     */
    zoom(delta) {
        if (this.viewer && typeof this.viewer.getHfov === 'function') {
            const currentHfov = this.viewer.getHfov();
            const newHfov = Math.max(this.config.minHfov, Math.min(this.config.maxHfov, currentHfov + delta));
            this.viewer.setHfov(newHfov, 300);
        }
    },
    
    /**
     * Handle keyboard navigation
     */
    handleKeyboard(e) {
        switch (e.key) {
            case 'ArrowLeft':
                if (this.viewer) this.viewer.setYaw(this.viewer.getYaw() - 10);
                break;
            case 'ArrowRight':
                if (this.viewer) this.viewer.setYaw(this.viewer.getYaw() + 10);
                break;
            case 'ArrowUp':
                if (this.viewer) this.viewer.setPitch(Math.min(85, this.viewer.getPitch() + 10));
                break;
            case 'ArrowDown':
                if (this.viewer) this.viewer.setPitch(Math.max(-85, this.viewer.getPitch() - 10));
                break;
            case '+':
            case '=':
                this.zoom(-10);
                break;
            case '-':
                this.zoom(10);
                break;
            case 'f':
            case 'F':
                this.toggleFullscreen();
                break;
            case 'Escape':
                this.hideInfoPanel();
                if (this.isFullscreen) this.toggleFullscreen();
                break;
        }
    },
    
    /**
     * Show info panel
     */
    showInfoPanel(title, content) {
        const panel = document.getElementById('info-panel');
        const titleEl = document.getElementById('info-panel-title');
        const contentEl = document.getElementById('info-panel-content');
        
        if (panel && titleEl && contentEl) {
            titleEl.textContent = title;
            contentEl.textContent = content || '';
            panel.classList.add('visible');
            panel.setAttribute('aria-hidden', 'false');
        }
    },
    
    /**
     * Hide info panel
     */
    hideInfoPanel() {
        const panel = document.getElementById('info-panel');
        if (panel) {
            panel.classList.remove('visible');
            panel.setAttribute('aria-hidden', 'true');
        }
    },
    
    /**
     * Show loading state
     */
    showLoading() {
        // Remove existing loading
        this.hideLoading();
        
        const loading = document.createElement('div');
        loading.className = 'virtual-tour-loading';
        loading.id = 'tour-loading';
        loading.innerHTML = `
            <div class="virtual-tour-loading-spinner"></div>
            <div class="virtual-tour-loading-text">Loading virtual tour...</div>
        `;
        this.container.appendChild(loading);
    },
    
    /**
     * Hide loading state
     */
    hideLoading() {
        const loading = document.getElementById('tour-loading');
        if (loading) loading.remove();
    },
    
    /**
     * Show fallback for unsupported devices
     */
    showFallback(message, showGallery = false) {
        this.hideLoading();
        
        const scenes = this.currentTour?.scenes || [];
        const galleryHtml = showGallery && scenes.length > 0 ? `
            <div class="virtual-tour-fallback-gallery">
                ${scenes.slice(0, 5).map(s => `
                    <div class="virtual-tour-fallback-image">
                        <img src="${s.thumbnailUrl || s.previewUrl || s.mediaUrl}" 
                             alt="${this.escapeHtml(s.name)}"
                             loading="lazy">
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-primary" onclick="VirtualTour.initViewer()" style="margin-top: 16px;">
                Try anyway
            </button>
        ` : '';
        
        this.container.innerHTML = `
            <div class="virtual-tour-fallback">
                <i class="fas fa-vr-cardboard virtual-tour-fallback-icon"></i>
                <p class="virtual-tour-fallback-text">${this.escapeHtml(message)}</p>
                ${galleryHtml}
            </div>
        `;
    },
    
    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Destroy viewer
     */
    destroy() {
        if (this.viewer && typeof this.viewer.destroy === 'function') {
            this.viewer.destroy();
        }
        this.viewer = null;
        this.currentTour = null;
        this.currentScene = null;
        this.gyroscopeEnabled = false;
        
        window.removeEventListener('deviceorientation', this.handleDeviceOrientation);
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VirtualTour;
}
