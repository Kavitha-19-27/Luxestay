/**
 * API Service
 * Handles all HTTP requests to the backend API
 */

const API = {
    /**
     * Make a fetch request with proper headers and error handling
     * @param {string} endpoint - API endpoint
     * @param {object} options - Fetch options
     * @returns {Promise} - Response data
     */
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        // Add auth token if available
        const token = Auth.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });
            
            // Handle no content response
            if (response.status === 204) {
                return { success: true };
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                // Handle 401 Unauthorized
                if (response.status === 401) {
                    Auth.logout();
                    // Only redirect if not already on login page
                    if (!window.location.pathname.includes('login.html')) {
                        window.location.href = 'login.html?session=expired';
                    }
                }
                
                throw {
                    status: response.status,
                    message: data.message || 'An error occurred',
                    errors: data.errors
                };
            }
            
            return data;
        } catch (error) {
            // Handle network failures (no internet, server down, etc.)
            if (error instanceof TypeError && error.message === 'Failed to fetch') {
                console.error('Network Error: Unable to connect to server');
                throw {
                    status: 0,
                    message: 'Unable to connect to server. Please check your internet connection.',
                    isNetworkError: true
                };
            }
            console.error('API Error:', error);
            throw error;
        }
    },
    
    /**
     * GET request
     */
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },
    
    /**
     * POST request
     */
    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    /**
     * PUT request
     */
    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    /**
     * DELETE request
     */
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },
    
    // =====================================================
    // AUTH ENDPOINTS
    // =====================================================
    
    auth: {
        signup(userData) {
            return API.post('/auth/signup', userData);
        },
        
        login(credentials) {
            return API.post('/auth/login', credentials);
        },
        
        getCurrentUser() {
            return API.get('/auth/me');
        }
    },
    
    // =====================================================
    // HOTELS ENDPOINTS
    // =====================================================
    
    hotels: {
        getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/hotels${query ? '?' + query : ''}`);
        },
        
        getById(id) {
            return API.get(`/hotels/${id}`);
        },
        
        search(params) {
            const queryParams = new URLSearchParams();

            // Pagination defaults
            queryParams.append('page', params.page !== undefined ? params.page : 0);
            queryParams.append('size', params.size !== undefined ? params.size : 10);

            // Filters
            if (params.search) {
                queryParams.append('q', params.search);
            }
            if (params.minStars && params.minStars !== 'all') {
                queryParams.append('minStars', params.minStars);
            }
            if (params.maxPrice) {
                queryParams.append('maxPrice', params.maxPrice);
            }

            // Sorting
            if (params.sortBy) queryParams.append('sortBy', params.sortBy);
            if (params.sortDir) queryParams.append('sortDir', params.sortDir);
            
            // Use the dedicated search endpoint which supports all filters + pagination
            return API.get(`/hotels/search?${queryParams.toString()}`);
        },
        
        getFeatured() {
            return API.get('/hotels/featured');
        },
        
        getCities() {
            return API.get('/hotels/cities');
        },
        
        getRooms(hotelId) {
            return API.get(`/hotels/${hotelId}/rooms`);
        },
        
        getAvailableRooms(hotelId, checkIn, checkOut) {
            return API.get(`/hotels/${hotelId}/rooms/available?checkIn=${checkIn}&checkOut=${checkOut}`);
        },
        
        compareRooms(hotelId, roomIds, checkIn, checkOut) {
            const roomIdsStr = roomIds.join(',');
            return API.get(`/hotels/${hotelId}/compare-rooms?roomIds=${roomIdsStr}&checkIn=${checkIn}&checkOut=${checkOut}`);
        }
    },
    
    // =====================================================
    // SMART SEARCH ENDPOINTS
    // =====================================================
    
    search: {
        /**
         * Get autocomplete suggestions for a search query
         */
        suggestions(query, limit = 8) {
            return API.get(`/search/suggestions?query=${encodeURIComponent(query)}&limit=${limit}`);
        },
        
        /**
         * Get popular searches for empty state
         */
        popular() {
            return API.get('/search/popular');
        },
        
        /**
         * Get price calendar for a hotel
         */
        priceCalendar(hotelId, startDate, endDate) {
            return API.get(`/search/price-calendar/${hotelId}?startDate=${startDate}&endDate=${endDate}`);
        }
    },
    
    // =====================================================
    // BOOKINGS ENDPOINTS
    // =====================================================
    
    bookings: {
        create(bookingData) {
            return API.post('/bookings', bookingData);
        },
        
        getMyBookings() {
            return API.get('/bookings/me');
        },
        
        getById(id) {
            return API.get(`/bookings/${id}`);
        },
        
        cancel(id) {
            return API.post(`/bookings/${id}/cancel`);
        }
    },
    
    // =====================================================
    // ADMIN ENDPOINTS
    // =====================================================
    
    admin: {
        // Dashboard Stats
        getStats() {
            return API.get('/admin/stats');
        },
        
        // Hotels Management
        getHotels(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/admin/hotels${query ? '?' + query : ''}`);
        },
        
        createHotel(hotelData) {
            return API.post('/admin/hotels', hotelData);
        },
        
        updateHotel(id, hotelData) {
            return API.put(`/admin/hotels/${id}`, hotelData);
        },
        
        deleteHotel(id) {
            return API.delete(`/admin/hotels/${id}`);
        },
        
        // Rooms Management
        getRooms(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/admin/rooms${query ? '?' + query : ''}`);
        },
        
        createRoom(hotelId, roomData) {
            return API.post(`/admin/hotels/${hotelId}/rooms`, roomData);
        },
        
        updateRoom(roomId, roomData) {
            return API.put(`/admin/rooms/${roomId}`, roomData);
        },
        
        deleteRoom(roomId) {
            return API.delete(`/admin/rooms/${roomId}`);
        },
        
        // Bookings Management
        getBookings(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/admin/bookings${query ? '?' + query : ''}`);
        },
        
        updateBookingStatus(id, status) {
            return API.request(`/admin/bookings/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });
        },
        
        // Users Management
        getUsers(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/admin/users${query ? '?' + query : ''}`);
        },
        
        getUserById(id) {
            return API.get(`/admin/users/${id}`);
        },
        
        updateUserRole(id, role, hotelId) {
            return API.request(`/admin/users/${id}/role`, {
                method: 'PATCH',
                body: JSON.stringify({ role, hotelId })
            });
        },
        
        toggleUserStatus(id) {
            return API.request(`/admin/users/${id}/status`, {
                method: 'PATCH'
            });
        },
        
        // Hotel Owner Management
        getHotelOwners() {
            return API.get('/admin/hotel-owners');
        },
        
        createHotelOwner(ownerData) {
            return API.post('/admin/hotel-owners', ownerData);
        },
        
        assignOwnerToHotel(hotelId, userId) {
            return API.post(`/admin/hotels/${hotelId}/assign-owner`, { userId });
        },
        
        resetOwnerPassword(ownerId) {
            return API.request(`/admin/hotel-owners/${ownerId}/reset-password`, {
                method: 'PATCH'
            });
        },
        
        toggleOwnerStatus(ownerId) {
            return API.request(`/admin/hotel-owners/${ownerId}/status`, {
                method: 'PATCH'
            });
        },
        
        // Hotel Approval Workflow
        getPendingApprovals() {
            return API.get('/admin/hotels/pending');
        },
        
        approveHotel(hotelId, approved, message = null) {
            return API.request(`/admin/hotels/${hotelId}/approve`, {
                method: 'POST',
                body: JSON.stringify({ approved, rejectionReason: message })
            });
        },
        
        // Reviews Management
        getReviews(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/admin/reviews${query ? '?' + query : ''}`);
        },
        
        getPendingReviews() {
            return API.get('/admin/reviews/pending');
        },
        
        getFlaggedReviews() {
            return API.get('/admin/reviews/flagged');
        },
        
        getReviewStats() {
            return API.get('/admin/reviews/stats');
        },
        
        updateReviewStatus(reviewId, status, reason = null) {
            return API.request(`/admin/reviews/${reviewId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status, reason })
            });
        },
        
        editReviewContent(reviewId, content, reason) {
            return API.request(`/admin/reviews/${reviewId}/content?content=${encodeURIComponent(content)}&reason=${encodeURIComponent(reason)}`, {
                method: 'PATCH'
            });
        },
        
        deleteReview(reviewId, reason) {
            return API.request(`/admin/reviews/${reviewId}?reason=${encodeURIComponent(reason)}`, {
                method: 'DELETE'
            });
        }
    },
    
    // =====================================================
    // HOTEL OWNER ENDPOINTS
    // =====================================================
    
    owner: {
        // Dashboard
        getDashboard() {
            return API.get('/owner/dashboard');
        },
        
        // Dashboard Stats
        getStats() {
            return API.get('/owner/stats');
        },
        
        // Hotel Management
        getMyHotel() {
            return API.get('/owner/hotel');
        },
        
        updateMyHotel(hotelData) {
            return API.put('/owner/hotel', hotelData);
        },
        
        // Rooms Management
        getRooms() {
            return API.get('/owner/rooms');
        },
        
        createRoom(roomData) {
            return API.post('/owner/rooms', roomData);
        },
        
        updateRoom(roomId, roomData) {
            return API.put(`/owner/rooms/${roomId}`, roomData);
        },
        
        deleteRoom(roomId) {
            return API.delete(`/owner/rooms/${roomId}`);
        },
        
        toggleRoomAvailability(roomId) {
            return API.request(`/owner/rooms/${roomId}/availability`, {
                method: 'PATCH'
            });
        },
        
        // Bookings Management
        getBookings(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/owner/bookings${query ? '?' + query : ''}`);
        },
        
        getTodayCheckIns() {
            return API.get('/owner/bookings/today-checkins');
        },
        
        getTodayCheckOuts() {
            return API.get('/owner/bookings/today-checkouts');
        },
        
        updateBookingStatus(bookingId, status, reason = null) {
            const body = { status };
            if (reason) body.reason = reason;
            return API.request(`/owner/bookings/${bookingId}/status`, {
                method: 'PATCH',
                body: JSON.stringify(body)
            });
        },
        
        // Audit Log
        getAuditLog(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/owner/audit-log${query ? '?' + query : ''}`);
        },
        
        // Reviews Management
        getReviews(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/owner/reviews${query ? '?' + query : ''}`);
        },
        
        getReviewsPendingReply() {
            return API.get('/owner/reviews/pending-reply');
        },
        
        replyToReview(reviewId, replyText) {
            return API.post(`/owner/reviews/${reviewId}/reply`, { replyText });
        },
        
        flagReview(reviewId, reason = '') {
            return API.post(`/owner/reviews/${reviewId}/flag?reason=${encodeURIComponent(reason)}`);
        },
        
        // Password Change
        changePassword(currentPassword, newPassword) {
            return API.post('/owner/change-password', { 
                currentPassword, 
                newPassword 
            });
        }
    },
    
    // =====================================================
    // HOTEL REGISTRATION ENDPOINTS (PUBLIC)
    // =====================================================
    
    hotelRegistration: {
        register(registrationData) {
            return API.post('/register-hotel', registrationData);
        }
    },
    
    // =====================================================
    // REVIEWS ENDPOINTS
    // =====================================================
    
    reviews: {
        // Public endpoints
        getHotelReviews(hotelId) {
            return API.get(`/reviews/hotels/${hotelId}`);
        },
        
        getHotelReviewStats(hotelId) {
            return API.get(`/reviews/hotels/${hotelId}/stats`);
        },
        
        // User endpoints (authenticated)
        create(reviewData) {
            return API.post('/reviews', reviewData);
        },
        
        getMyReviews() {
            return API.get('/reviews/me');
        },
        
        canReview(bookingId) {
            return API.get(`/reviews/can-review/${bookingId}`);
        },
        
        getReviewForBooking(bookingId) {
            return API.get(`/reviews/booking/${bookingId}`);
        },
        
        update(reviewId, reviewData) {
            return API.put(`/reviews/${reviewId}`, reviewData);
        }
    },
    
    // =====================================================
    // USER PROFILE ENDPOINTS
    // =====================================================
    
    updateProfile(userData) {
        return this.put('/users/me', userData);
    },
    
    changePassword(currentPassword, newPassword) {
        return this.post('/users/me/password', { currentPassword, newPassword });
    },
    
    updatePreferences(preferences) {
        return this.put('/users/me/preferences', preferences);
    },

    // =====================================================
    // WISHLIST ENDPOINTS
    // =====================================================
    
    wishlist: {
        /**
         * Get all hotels in user's wishlist
         */
        getAll() {
            return API.get('/wishlist');
        },
        
        /**
         * Add hotel to wishlist
         */
        add(hotelId) {
            return API.post(`/wishlist/${hotelId}`);
        },
        
        /**
         * Remove hotel from wishlist
         */
        remove(hotelId) {
            return API.delete(`/wishlist/${hotelId}`);
        },
        
        /**
         * Toggle hotel in wishlist (add/remove)
         */
        toggle(hotelId) {
            return API.post(`/wishlist/${hotelId}/toggle`);
        },
        
        /**
         * Check if hotel is in wishlist
         */
        check(hotelId) {
            return API.get(`/wishlist/${hotelId}/check`);
        },
        
        /**
         * Get all wishlisted hotel IDs (for bulk checking)
         */
        getIds() {
            return API.get('/wishlist/ids');
        },
        
        /**
         * Get wishlist count
         */
        getCount() {
            return API.get('/wishlist/count');
        }
    }
};
