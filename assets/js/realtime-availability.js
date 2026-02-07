/**
 * Real-Time Availability Module
 * WebSocket client for live room availability updates
 * 
 * FEATURES:
 * - Connects via SockJS with STOMP protocol
 * - Graceful fallback on connection loss
 * - Auto-reconnect with exponential backoff
 * - Updates UI in real-time when bookings change
 * 
 * USAGE:
 * RealTimeAvailability.init();
 * RealTimeAvailability.subscribeToHotel(hotelId, callback);
 * RealTimeAvailability.checkAvailability(hotelId, checkIn, checkOut);
 */

const RealTimeAvailability = (function() {
    'use strict';
    
    // Configuration
    const CONFIG = {
        wsEndpoint: '/ws',
        reconnectDelay: 1000,
        maxReconnectDelay: 30000,
        reconnectDecay: 1.5,
        heartbeatInterval: 25000
    };
    
    // State
    let stompClient = null;
    let connected = false;
    let reconnectAttempts = 0;
    let subscriptions = new Map();
    let pendingSubscriptions = [];
    let connectionCallbacks = [];
    
    // ==================== INITIALIZATION ====================
    
    function init() {
        if (typeof SockJS === 'undefined' || typeof Stomp === 'undefined') {
            console.warn('RealTimeAvailability: SockJS or STOMP not loaded. Loading dynamically...');
            loadDependencies().then(connect);
            return;
        }
        connect();
    }
    
    function loadDependencies() {
        return new Promise((resolve, reject) => {
            // Load SockJS
            const sockScript = document.createElement('script');
            sockScript.src = 'https://cdn.jsdelivr.net/npm/sockjs-client@1/dist/sockjs.min.js';
            sockScript.onload = () => {
                // Load STOMP
                const stompScript = document.createElement('script');
                stompScript.src = 'https://cdn.jsdelivr.net/npm/@stomp/stompjs@7/bundles/stomp.umd.min.js';
                stompScript.onload = resolve;
                stompScript.onerror = reject;
                document.head.appendChild(stompScript);
            };
            sockScript.onerror = reject;
            document.head.appendChild(sockScript);
        });
    }
    
    // ==================== CONNECTION MANAGEMENT ====================
    
    function connect() {
        try {
            const socket = new SockJS(CONFIG.wsEndpoint);
            stompClient = Stomp.over(socket);
            
            // Disable debug logging in production
            stompClient.debug = () => {};
            
            stompClient.connect(
                {},
                onConnected,
                onError
            );
        } catch (error) {
            console.error('RealTimeAvailability: Connection error', error);
            scheduleReconnect();
        }
    }
    
    function onConnected(frame) {
        console.log('RealTimeAvailability: Connected');
        connected = true;
        reconnectAttempts = 0;
        
        // Process pending subscriptions
        pendingSubscriptions.forEach(sub => {
            subscribeInternal(sub.destination, sub.callback);
        });
        pendingSubscriptions = [];
        
        // Notify connection callbacks
        connectionCallbacks.forEach(cb => cb(true));
        
        // Dispatch custom event
        document.dispatchEvent(new CustomEvent('realtime:connected'));
    }
    
    function onError(error) {
        console.error('RealTimeAvailability: Connection error', error);
        connected = false;
        
        // Notify connection callbacks
        connectionCallbacks.forEach(cb => cb(false));
        
        // Dispatch custom event
        document.dispatchEvent(new CustomEvent('realtime:disconnected'));
        
        scheduleReconnect();
    }
    
    function scheduleReconnect() {
        const delay = Math.min(
            CONFIG.reconnectDelay * Math.pow(CONFIG.reconnectDecay, reconnectAttempts),
            CONFIG.maxReconnectDelay
        );
        
        console.log(`RealTimeAvailability: Reconnecting in ${delay}ms...`);
        reconnectAttempts++;
        
        setTimeout(connect, delay);
    }
    
    function disconnect() {
        if (stompClient) {
            stompClient.disconnect();
            stompClient = null;
            connected = false;
        }
    }
    
    // ==================== SUBSCRIPTIONS ====================
    
    function subscribeToHotel(hotelId, callback) {
        const destination = `/topic/availability/hotel/${hotelId}`;
        return subscribe(destination, callback);
    }
    
    function subscribeToRoom(roomId, callback) {
        const destination = `/topic/availability/room/${roomId}`;
        return subscribe(destination, callback);
    }
    
    function subscribeToUserNotifications(callback) {
        const destination = '/user/queue/bookings';
        return subscribe(destination, callback);
    }
    
    function subscribe(destination, callback) {
        if (connected && stompClient) {
            return subscribeInternal(destination, callback);
        } else {
            // Queue for when connected
            const id = 'pending-' + Date.now();
            pendingSubscriptions.push({ destination, callback });
            return { id, unsubscribe: () => {
                pendingSubscriptions = pendingSubscriptions.filter(
                    s => s.destination !== destination
                );
            }};
        }
    }
    
    function subscribeInternal(destination, callback) {
        const subscription = stompClient.subscribe(destination, (message) => {
            try {
                const data = JSON.parse(message.body);
                callback(data);
            } catch (e) {
                console.error('RealTimeAvailability: Error parsing message', e);
            }
        });
        
        subscriptions.set(destination, subscription);
        console.log('RealTimeAvailability: Subscribed to', destination);
        
        return {
            id: subscription.id,
            unsubscribe: () => {
                subscription.unsubscribe();
                subscriptions.delete(destination);
            }
        };
    }
    
    function unsubscribeAll() {
        subscriptions.forEach((sub, dest) => {
            sub.unsubscribe();
        });
        subscriptions.clear();
    }
    
    // ==================== AVAILABILITY CHECKS ====================
    
    function checkAvailability(hotelId, checkIn, checkOut) {
        if (!connected || !stompClient) {
            console.warn('RealTimeAvailability: Not connected, using fallback');
            return checkAvailabilityFallback(hotelId, checkIn, checkOut);
        }
        
        stompClient.send(`/app/availability/check/${hotelId}`, {}, JSON.stringify({
            checkIn: checkIn,
            checkOut: checkOut
        }));
    }
    
    /**
     * Fallback to REST API when WebSocket is unavailable
     */
    async function checkAvailabilityFallback(hotelId, checkIn, checkOut) {
        try {
            const response = await fetch(
                `/api/hotels/${hotelId}/availability?checkIn=${checkIn}&checkOut=${checkOut}`
            );
            
            if (response.ok) {
                const data = await response.json();
                // Dispatch as if it came from WebSocket
                document.dispatchEvent(new CustomEvent('realtime:availability', {
                    detail: { hotelId, ...data.data }
                }));
                return data.data;
            }
        } catch (error) {
            console.error('RealTimeAvailability: Fallback failed', error);
        }
        return null;
    }
    
    // ==================== UI HELPERS ====================
    
    /**
     * Show connection status indicator
     */
    function showConnectionStatus(container) {
        if (!container) return;
        
        const indicator = document.createElement('div');
        indicator.className = 'realtime-indicator';
        indicator.innerHTML = `
            <span class="realtime-dot"></span>
            <span class="realtime-text">Live</span>
        `;
        container.appendChild(indicator);
        
        // Update on connection state changes
        document.addEventListener('realtime:connected', () => {
            indicator.classList.remove('offline');
            indicator.classList.add('online');
            indicator.querySelector('.realtime-text').textContent = 'Live';
        });
        
        document.addEventListener('realtime:disconnected', () => {
            indicator.classList.remove('online');
            indicator.classList.add('offline');
            indicator.querySelector('.realtime-text').textContent = 'Offline';
        });
        
        // Set initial state
        if (connected) {
            indicator.classList.add('online');
        } else {
            indicator.classList.add('offline');
            indicator.querySelector('.realtime-text').textContent = 'Connecting...';
        }
    }
    
    /**
     * Update room card availability status
     */
    function updateRoomCard(roomId, available) {
        const card = document.querySelector(`[data-room-id="${roomId}"]`);
        if (!card) return;
        
        const badge = card.querySelector('.availability-badge');
        const button = card.querySelector('.book-btn');
        
        if (available) {
            if (badge) {
                badge.textContent = 'Available';
                badge.classList.remove('unavailable');
                badge.classList.add('available');
            }
            if (button) {
                button.disabled = false;
                button.textContent = 'Book Now';
            }
        } else {
            if (badge) {
                badge.textContent = 'Unavailable';
                badge.classList.remove('available');
                badge.classList.add('unavailable');
            }
            if (button) {
                button.disabled = true;
                button.textContent = 'Not Available';
            }
        }
        
        // Add pulse animation for status change
        card.classList.add('availability-updated');
        setTimeout(() => card.classList.remove('availability-updated'), 1000);
    }
    
    /**
     * Register callback for connection state changes
     */
    function onConnectionChange(callback) {
        connectionCallbacks.push(callback);
    }
    
    // ==================== PUBLIC API ====================
    
    return {
        init,
        disconnect,
        isConnected: () => connected,
        
        // Subscriptions
        subscribeToHotel,
        subscribeToRoom,
        subscribeToUserNotifications,
        subscribe,
        unsubscribeAll,
        
        // Actions
        checkAvailability,
        
        // UI Helpers
        showConnectionStatus,
        updateRoomCard,
        onConnectionChange
    };
})();

// Auto-initialize if DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Don't auto-init on all pages, let specific pages call init()
    });
}
