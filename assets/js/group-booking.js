/**
 * Group Booking Component
 * Real-time coordinated multi-room booking
 * 
 * FEATURES:
 * - WebSocket real-time updates
 * - Mobile-first coordination flow
 * - Clear ownership model
 * - Participant synchronization
 */

const GroupBooking = {
    // State
    currentGroup: null,
    currentUserId: null,
    stompClient: null,
    isConnected: false,
    
    // Configuration
    config: {
        wsEndpoint: '/ws',
        reconnectDelay: 3000,
        maxReconnectAttempts: 5
    },
    
    reconnectAttempts: 0,
    
    // ==================== API METHODS ====================
    
    /**
     * Create a new group booking
     */
    async createGroup(data) {
        try {
            const response = await API.request('/group-bookings', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            this.currentGroup = response.data;
            return response.data;
        } catch (error) {
            console.error('Failed to create group:', error);
            throw error;
        }
    },
    
    /**
     * Join a group by code
     */
    async joinGroup(groupCode) {
        try {
            const response = await API.request(`/group-bookings/join/${groupCode}`, {
                method: 'POST'
            });
            this.currentGroup = response.data;
            return response.data;
        } catch (error) {
            console.error('Failed to join group:', error);
            throw error;
        }
    },
    
    /**
     * Get group by ID
     */
    async getGroup(groupId) {
        try {
            const response = await API.request(`/group-bookings/${groupId}`);
            this.currentGroup = response.data;
            return response.data;
        } catch (error) {
            console.error('Failed to get group:', error);
            throw error;
        }
    },
    
    /**
     * Get group by code
     */
    async getGroupByCode(groupCode) {
        try {
            const response = await API.request(`/group-bookings/code/${groupCode}`);
            this.currentGroup = response.data;
            return response.data;
        } catch (error) {
            console.error('Failed to get group:', error);
            throw error;
        }
    },
    
    /**
     * Get user's groups
     */
    async getMyGroups() {
        try {
            const response = await API.request('/group-bookings/my-groups');
            return response.data || [];
        } catch (error) {
            console.error('Failed to get my groups:', error);
            return [];
        }
    },
    
    /**
     * Select a room
     */
    async selectRoom(groupId, roomId, numGuests = 1) {
        try {
            const response = await API.request(`/group-bookings/${groupId}/select-room`, {
                method: 'POST',
                body: JSON.stringify({ roomId, numGuests })
            });
            this.currentGroup = response.data;
            return response.data;
        } catch (error) {
            console.error('Failed to select room:', error);
            throw error;
        }
    },
    
    /**
     * Lock group (organizer only)
     */
    async lockGroup(groupId) {
        try {
            const response = await API.request(`/group-bookings/${groupId}/lock`, {
                method: 'POST'
            });
            this.currentGroup = response.data;
            return response.data;
        } catch (error) {
            console.error('Failed to lock group:', error);
            throw error;
        }
    },
    
    /**
     * Confirm group (organizer only)
     */
    async confirmGroup(groupId) {
        try {
            const response = await API.request(`/group-bookings/${groupId}/confirm`, {
                method: 'POST'
            });
            this.currentGroup = response.data;
            return response.data;
        } catch (error) {
            console.error('Failed to confirm group:', error);
            throw error;
        }
    },
    
    /**
     * Cancel group (organizer only)
     */
    async cancelGroup(groupId, reason = null) {
        try {
            const response = await API.request(`/group-bookings/${groupId}/cancel`, {
                method: 'POST',
                body: JSON.stringify({ reason })
            });
            this.currentGroup = response.data;
            return response.data;
        } catch (error) {
            console.error('Failed to cancel group:', error);
            throw error;
        }
    },
    
    /**
     * Leave group
     */
    async leaveGroup(groupId) {
        try {
            await API.request(`/group-bookings/${groupId}/leave`, {
                method: 'POST'
            });
            this.currentGroup = null;
            return true;
        } catch (error) {
            console.error('Failed to leave group:', error);
            throw error;
        }
    },
    
    // ==================== WEBSOCKET ====================
    
    /**
     * Connect to WebSocket for real-time updates
     */
    connectWebSocket(groupCode) {
        if (typeof SockJS === 'undefined' || typeof Stomp === 'undefined') {
            console.warn('SockJS/Stomp not loaded, real-time updates disabled');
            return;
        }
        
        const wsUrl = `${CONFIG.API_BASE_URL}${this.config.wsEndpoint}`;
        const socket = new SockJS(wsUrl);
        this.stompClient = Stomp.over(socket);
        
        // Disable debug logging
        this.stompClient.debug = null;
        
        this.stompClient.connect({}, 
            () => this.onWebSocketConnected(groupCode),
            (error) => this.onWebSocketError(error)
        );
    },
    
    /**
     * Handle WebSocket connection
     */
    onWebSocketConnected(groupCode) {
        console.log('WebSocket connected for group:', groupCode);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Subscribe to group updates
        this.stompClient.subscribe(`/topic/group/${groupCode}`, (message) => {
            const event = JSON.parse(message.body);
            this.handleGroupUpdate(event);
        });
    },
    
    /**
     * Handle WebSocket error
     */
    onWebSocketError(error) {
        console.error('WebSocket error:', error);
        this.isConnected = false;
        
        // Attempt reconnect
        if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
                if (this.currentGroup) {
                    this.connectWebSocket(this.currentGroup.groupCode);
                }
            }, this.config.reconnectDelay);
        }
    },
    
    /**
     * Handle group update event
     */
    handleGroupUpdate(event) {
        console.log('Group update:', event);
        
        // Show update toast
        this.showUpdateToast(event.message);
        
        // Refresh group data
        if (this.currentGroup) {
            this.getGroup(this.currentGroup.id).then(group => {
                this.renderGroup(group);
            });
        }
        
        // Emit custom event
        window.dispatchEvent(new CustomEvent('groupBookingUpdate', { detail: event }));
    },
    
    /**
     * Disconnect WebSocket
     */
    disconnectWebSocket() {
        if (this.stompClient) {
            this.stompClient.disconnect();
            this.stompClient = null;
            this.isConnected = false;
        }
    },
    
    // ==================== UI RENDERING ====================
    
    /**
     * Initialize group booking UI
     */
    async init(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        
        const { groupId, groupCode, hotelId, mode = 'view' } = options;
        
        // Get current user
        const user = Auth.getUser();
        this.currentUserId = user?.id;
        
        if (groupCode) {
            // Load group by code
            await this.loadGroupByCode(groupCode);
        } else if (groupId) {
            // Load group by ID
            await this.loadGroup(groupId);
        } else if (mode === 'create' && hotelId) {
            // Show create form
            this.renderCreateForm(hotelId);
        } else {
            // Show my groups
            this.renderMyGroups();
        }
    },
    
    /**
     * Load and display group
     */
    async loadGroup(groupId) {
        this.showLoading();
        
        try {
            const group = await this.getGroup(groupId);
            this.renderGroup(group);
            this.connectWebSocket(group.groupCode);
        } catch (error) {
            this.showError('Failed to load group');
        }
    },
    
    /**
     * Load group by code
     */
    async loadGroupByCode(groupCode) {
        this.showLoading();
        
        try {
            const group = await this.getGroupByCode(groupCode);
            this.renderGroup(group);
            this.connectWebSocket(group.groupCode);
        } catch (error) {
            this.showError('Group not found');
        }
    },
    
    /**
     * Render group view
     */
    renderGroup(group) {
        const isOrganizer = group.organizerId === this.currentUserId;
        const currentParticipant = group.participants?.find(p => p.userId === this.currentUserId);
        
        this.container.innerHTML = `
            <!-- Share Card -->
            <div class="group-share-card">
                <div class="group-share-title">Share this code with your group</div>
                <div class="group-share-code" id="group-code">${group.groupCode}</div>
                <div class="group-share-actions">
                    <button class="group-share-btn" onclick="GroupBooking.copyCode()">
                        <i class="fas fa-copy"></i>
                        Copy Code
                    </button>
                    <button class="group-share-btn" onclick="GroupBooking.shareLink()">
                        <i class="fas fa-share"></i>
                        Share Link
                    </button>
                </div>
            </div>
            
            <!-- Status Bar -->
            <div class="group-status-bar">
                <div class="group-status-info">
                    <span class="group-status-badge group-status-badge--${group.status.toLowerCase()}">
                        <i class="fas ${this.getStatusIcon(group.status)}"></i>
                        ${this.formatStatus(group.status)}
                    </span>
                    <span>${group.participants?.length || 0} / ${group.maxParticipants} participants</span>
                </div>
                ${group.joinDeadline ? `
                    <div class="group-status-countdown">
                        <i class="fas fa-clock"></i>
                        <span>Join by ${this.formatDate(group.joinDeadline)}</span>
                    </div>
                ` : ''}
            </div>
            
            <!-- Booking Details -->
            <div class="group-booking-details" style="margin-bottom: var(--spacing-lg);">
                <h3 style="margin-bottom: var(--spacing-sm);">${this.escapeHtml(group.name)}</h3>
                <p style="color: var(--text-secondary); font-size: 0.875rem;">
                    <i class="fas fa-hotel" style="color: var(--gold-primary); margin-right: var(--spacing-xs);"></i>
                    ${this.escapeHtml(group.hotelName)}
                </p>
                <p style="color: var(--text-secondary); font-size: 0.875rem;">
                    <i class="fas fa-calendar" style="color: var(--gold-primary); margin-right: var(--spacing-xs);"></i>
                    ${this.formatDate(group.checkInDate)} - ${this.formatDate(group.checkOutDate)}
                </p>
            </div>
            
            <!-- Participants -->
            <div class="group-participants">
                <div class="group-participants-header">
                    <h3 class="group-participants-title">Participants</h3>
                    <span class="group-participants-count">${group.participants?.length || 0} people</span>
                </div>
                <div class="group-participants-list" id="participants-list">
                    ${this.renderParticipants(group.participants || [])}
                </div>
            </div>
            
            <!-- Room Selection (if current user needs to select) -->
            ${currentParticipant && currentParticipant.status === 'PENDING' && group.status === 'OPEN' ? `
                <div class="group-room-selection" id="room-selection">
                    <h3 class="group-room-selection-title">Select Your Room</h3>
                    <div class="group-rooms-grid" id="rooms-grid">
                        <!-- Rooms loaded separately -->
                    </div>
                </div>
            ` : ''}
            
            <!-- Price Summary -->
            ${group.totalPrice ? `
                <div class="group-price-summary">
                    <h3 class="group-price-summary-title">Total Summary</h3>
                    <div class="group-price-row group-price-row--total">
                        <span>Group Total</span>
                        <span class="group-price-value">₹${group.totalPrice.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            ` : ''}
            
            <!-- Actions -->
            <div class="group-actions">
                ${this.renderActions(group, isOrganizer, currentParticipant)}
            </div>
        `;
        
        // Load available rooms if needed
        if (currentParticipant && currentParticipant.status === 'PENDING' && group.status === 'OPEN') {
            this.loadAvailableRooms(group.hotelId, group.checkInDate, group.checkOutDate);
        }
    },
    
    /**
     * Render participants list
     */
    renderParticipants(participants) {
        if (!participants || participants.length === 0) {
            return '<p class="group-empty">No participants yet</p>';
        }
        
        return participants.map(p => `
            <div class="group-participant-card ${p.isOrganizer ? 'group-participant-card--organizer' : ''} ${p.userId === this.currentUserId ? 'group-participant-card--current' : ''}">
                <div class="group-participant-avatar">
                    ${p.userAvatar ? `<img src="${p.userAvatar}" alt="">` : this.getInitials(p.userName)}
                </div>
                <div class="group-participant-info">
                    <div class="group-participant-name">
                        ${this.escapeHtml(p.userName)}
                        ${p.isOrganizer ? '<span class="organizer-badge">Organizer</span>' : ''}
                    </div>
                    ${p.roomName ? `
                        <div class="group-participant-room">
                            <i class="fas fa-bed"></i>
                            ${this.escapeHtml(p.roomName)} (${p.numGuests} guest${p.numGuests > 1 ? 's' : ''})
                        </div>
                    ` : ''}
                </div>
                <span class="group-participant-status group-participant-status--${p.status.toLowerCase().replace('_', '-')}">
                    <i class="fas ${this.getParticipantStatusIcon(p.status)}"></i>
                    ${this.formatParticipantStatus(p.status)}
                </span>
            </div>
        `).join('');
    },
    
    /**
     * Render action buttons
     */
    renderActions(group, isOrganizer, currentParticipant) {
        const actions = [];
        
        if (group.status === 'OPEN') {
            if (isOrganizer) {
                actions.push(`
                    <button class="btn btn-secondary" onclick="GroupBooking.handleLock(${group.id})">
                        <i class="fas fa-lock"></i> Lock Group
                    </button>
                `);
            }
            
            if (currentParticipant && !currentParticipant.isOrganizer) {
                actions.push(`
                    <button class="btn btn-danger" onclick="GroupBooking.handleLeave(${group.id})">
                        <i class="fas fa-sign-out-alt"></i> Leave Group
                    </button>
                `);
            }
        }
        
        if (group.status === 'LOCKED' && isOrganizer) {
            actions.push(`
                <button class="btn btn-primary" onclick="GroupBooking.handleConfirm(${group.id})">
                    <i class="fas fa-check"></i> Confirm All Bookings
                </button>
            `);
            actions.push(`
                <button class="btn btn-danger" onclick="GroupBooking.handleCancel(${group.id})">
                    <i class="fas fa-times"></i> Cancel Group
                </button>
            `);
        }
        
        return actions.join('');
    },
    
    /**
     * Render create form
     */
    renderCreateForm(hotelId) {
        this.container.innerHTML = `
            <div class="group-booking-create">
                <h2 class="group-booking-create-title">
                    <i class="fas fa-users"></i>
                    Create Group Booking
                </h2>
                <form class="group-booking-form" id="create-group-form">
                    <div class="form-group">
                        <label for="group-name">Group Name</label>
                        <input type="text" id="group-name" class="form-control" 
                               placeholder="e.g., Smith Family Vacation" required>
                    </div>
                    
                    <div class="group-booking-form-row">
                        <div class="form-group">
                            <label for="check-in">Check-in Date</label>
                            <input type="date" id="check-in" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="check-out">Check-out Date</label>
                            <input type="date" id="check-out" class="form-control" required>
                        </div>
                    </div>
                    
                    <div class="group-booking-form-row">
                        <div class="form-group">
                            <label for="max-participants">Max Participants</label>
                            <input type="number" id="max-participants" class="form-control" 
                                   min="2" max="20" value="10">
                        </div>
                        <div class="form-group">
                            <label for="join-deadline">Join Deadline (Optional)</label>
                            <input type="date" id="join-deadline" class="form-control">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="notes">Notes (Optional)</label>
                        <textarea id="notes" class="form-control" rows="3"
                                  placeholder="Any special requests or information for your group"></textarea>
                    </div>
                    
                    <input type="hidden" id="hotel-id" value="${hotelId}">
                    
                    <button type="submit" class="btn btn-primary btn-block">
                        <i class="fas fa-plus"></i> Create Group
                    </button>
                </form>
            </div>
        `;
        
        // Set min date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('check-in').min = today;
        document.getElementById('check-out').min = today;
        document.getElementById('join-deadline').min = today;
        
        // Form submission
        document.getElementById('create-group-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleCreate();
        });
    },
    
    /**
     * Render my groups list
     */
    async renderMyGroups() {
        this.showLoading();
        
        const groups = await this.getMyGroups();
        
        if (groups.length === 0) {
            this.container.innerHTML = `
                <div class="group-empty">
                    <i class="fas fa-users"></i>
                    <p>You don't have any group bookings yet.</p>
                    <button class="btn btn-primary" onclick="window.location.href='hotels.html'">
                        Browse Hotels
                    </button>
                </div>
            `;
            return;
        }
        
        this.container.innerHTML = `
            <h2 style="margin-bottom: var(--spacing-lg);">My Group Bookings</h2>
            <div class="group-participants-list">
                ${groups.map(g => `
                    <div class="group-participant-card" style="cursor: pointer;" 
                         onclick="GroupBooking.loadGroup(${g.id})">
                        <div class="group-participant-info">
                            <div class="group-participant-name">${this.escapeHtml(g.name)}</div>
                            <div class="group-participant-room">
                                <i class="fas fa-hotel"></i>
                                ${this.escapeHtml(g.hotelName)}
                            </div>
                            <div class="group-participant-room">
                                <i class="fas fa-calendar"></i>
                                ${this.formatDate(g.checkInDate)} - ${this.formatDate(g.checkOutDate)}
                            </div>
                        </div>
                        <span class="group-participant-status group-participant-status--${g.status.toLowerCase()}">
                            ${this.formatStatus(g.status)}
                        </span>
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    /**
     * Load available rooms
     */
    async loadAvailableRooms(hotelId, checkIn, checkOut) {
        const grid = document.getElementById('rooms-grid');
        if (!grid) return;
        
        try {
            const response = await API.request(`/rooms/hotel/${hotelId}/available?checkIn=${checkIn}&checkOut=${checkOut}`);
            const rooms = response.data || [];
            
            // Get rooms already taken by participants
            const takenRoomIds = (this.currentGroup?.participants || [])
                .filter(p => p.roomId)
                .map(p => p.roomId);
            
            grid.innerHTML = rooms.map(room => {
                const isTaken = takenRoomIds.includes(room.id);
                const takenBy = isTaken ? 
                    this.currentGroup.participants.find(p => p.roomId === room.id)?.userName : null;
                
                return `
                    <div class="group-room-card ${isTaken ? 'group-room-card--taken' : ''}"
                         data-room-id="${room.id}"
                         ${!isTaken ? `onclick="GroupBooking.handleRoomSelect(${room.id})"` : ''}>
                        <div class="group-room-header">
                            <span class="group-room-name">${this.escapeHtml(room.name)}</span>
                            <span class="group-room-price">₹${room.price?.toLocaleString('en-IN')}/night</span>
                        </div>
                        <div class="group-room-details">
                            <span><i class="fas fa-user"></i> ${room.capacity} guests</span>
                            <span><i class="fas fa-bed"></i> ${room.bedType || 'Standard'}</span>
                        </div>
                        ${isTaken ? `
                            <div class="group-room-taken-by">
                                Taken by ${this.escapeHtml(takenBy)}
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            grid.innerHTML = '<p style="color: var(--error-color);">Failed to load rooms</p>';
        }
    },
    
    // ==================== EVENT HANDLERS ====================
    
    /**
     * Handle group creation
     */
    async handleCreate() {
        const data = {
            name: document.getElementById('group-name').value,
            hotelId: parseInt(document.getElementById('hotel-id').value),
            checkInDate: document.getElementById('check-in').value,
            checkOutDate: document.getElementById('check-out').value,
            maxParticipants: parseInt(document.getElementById('max-participants').value) || 10,
            joinDeadline: document.getElementById('join-deadline').value || null,
            notes: document.getElementById('notes').value || null
        };
        
        try {
            const group = await this.createGroup(data);
            UI.showToast('Group created successfully!', 'success');
            this.renderGroup(group);
            this.connectWebSocket(group.groupCode);
        } catch (error) {
            UI.showToast(error.message || 'Failed to create group', 'error');
        }
    },
    
    /**
     * Handle room selection
     */
    async handleRoomSelect(roomId) {
        if (!this.currentGroup) return;
        
        // Show guest count prompt
        const numGuests = prompt('How many guests?', '1');
        if (!numGuests) return;
        
        try {
            await this.selectRoom(this.currentGroup.id, roomId, parseInt(numGuests));
            UI.showToast('Room selected!', 'success');
            this.renderGroup(this.currentGroup);
        } catch (error) {
            UI.showToast(error.message || 'Failed to select room', 'error');
        }
    },
    
    /**
     * Handle lock group
     */
    async handleLock(groupId) {
        if (!confirm('Lock this group? No new participants can join.')) return;
        
        try {
            await this.lockGroup(groupId);
            UI.showToast('Group locked', 'success');
            this.renderGroup(this.currentGroup);
        } catch (error) {
            UI.showToast(error.message || 'Failed to lock group', 'error');
        }
    },
    
    /**
     * Handle confirm group
     */
    async handleConfirm(groupId) {
        if (!confirm('Confirm all bookings? This will finalize the reservations.')) return;
        
        try {
            await this.confirmGroup(groupId);
            UI.showToast('Group bookings confirmed!', 'success');
            this.renderGroup(this.currentGroup);
        } catch (error) {
            UI.showToast(error.message || 'Failed to confirm group', 'error');
        }
    },
    
    /**
     * Handle cancel group
     */
    async handleCancel(groupId) {
        const reason = prompt('Reason for cancellation (optional):');
        if (reason === null) return; // User clicked cancel
        
        try {
            await this.cancelGroup(groupId, reason || null);
            UI.showToast('Group cancelled', 'info');
            this.renderGroup(this.currentGroup);
        } catch (error) {
            UI.showToast(error.message || 'Failed to cancel group', 'error');
        }
    },
    
    /**
     * Handle leave group
     */
    async handleLeave(groupId) {
        if (!confirm('Leave this group booking?')) return;
        
        try {
            await this.leaveGroup(groupId);
            UI.showToast('You left the group', 'info');
            window.location.href = 'my-bookings.html';
        } catch (error) {
            UI.showToast(error.message || 'Failed to leave group', 'error');
        }
    },
    
    // ==================== SHARE FUNCTIONS ====================
    
    /**
     * Copy group code to clipboard
     */
    copyCode() {
        const code = document.getElementById('group-code')?.textContent;
        if (code) {
            navigator.clipboard.writeText(code);
            UI.showToast('Code copied!', 'success');
        }
    },
    
    /**
     * Share group link
     */
    shareLink() {
        const code = this.currentGroup?.groupCode;
        if (!code) return;
        
        const url = `${window.location.origin}/group-booking.html?code=${code}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Join our group booking',
                text: `Join our hotel group booking! Code: ${code}`,
                url: url
            });
        } else {
            navigator.clipboard.writeText(url);
            UI.showToast('Link copied!', 'success');
        }
    },
    
    // ==================== HELPERS ====================
    
    showLoading() {
        this.container.innerHTML = `
            <div style="text-align: center; padding: var(--spacing-xl); color: var(--text-secondary);">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i>
                <p style="margin-top: var(--spacing-md);">Loading...</p>
            </div>
        `;
    },
    
    showError(message) {
        this.container.innerHTML = `
            <div class="group-empty">
                <i class="fas fa-exclamation-circle" style="color: var(--error-color);"></i>
                <p>${this.escapeHtml(message)}</p>
            </div>
        `;
    },
    
    showUpdateToast(message) {
        const toast = document.createElement('div');
        toast.className = 'group-update-toast';
        toast.innerHTML = `<i class="fas fa-bell"></i> ${this.escapeHtml(message)}`;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 5000);
    },
    
    getStatusIcon(status) {
        const icons = {
            'OPEN': 'fa-door-open',
            'LOCKED': 'fa-lock',
            'CONFIRMED': 'fa-check-circle',
            'CANCELLED': 'fa-times-circle',
            'COMPLETED': 'fa-flag-checkered'
        };
        return icons[status] || 'fa-circle';
    },
    
    formatStatus(status) {
        const labels = {
            'OPEN': 'Open',
            'LOCKED': 'Locked',
            'CONFIRMED': 'Confirmed',
            'CANCELLED': 'Cancelled',
            'COMPLETED': 'Completed'
        };
        return labels[status] || status;
    },
    
    getParticipantStatusIcon(status) {
        const icons = {
            'PENDING': 'fa-hourglass-half',
            'ROOM_SELECTED': 'fa-bed',
            'CONFIRMED': 'fa-check',
            'CANCELLED': 'fa-times'
        };
        return icons[status] || 'fa-circle';
    },
    
    formatParticipantStatus(status) {
        const labels = {
            'PENDING': 'Selecting room',
            'ROOM_SELECTED': 'Room selected',
            'CONFIRMED': 'Confirmed',
            'CANCELLED': 'Cancelled'
        };
        return labels[status] || status;
    },
    
    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    },
    
    getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    },
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GroupBooking;
}
