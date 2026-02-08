/**
 * LuxeStay Chatbot API Client
 * 
 * This module handles ALL communication with the backend chatbot service.
 * Frontend should ONLY use this API - no business logic in UI code.
 * 
 * @module ChatbotAPI
 * @version 1.0.0
 */

const ChatbotAPI = {
    // Base URL for API - uses CONFIG if available, otherwise production URL
    get BASE_URL() {
        if (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) {
            return CONFIG.API_BASE_URL + '/chatbot';
        }
        return 'https://luxestay-backend-1.onrender.com/api/chatbot';
    },
    
    // Cache for frequently used data
    _cache: {
        cities: null,
        suggestions: null,
        cacheTime: null,
        CACHE_TTL: 5 * 60 * 1000 // 5 minutes
    },
    
    /**
     * Main query endpoint - sends user message to backend
     * @param {string} message - User's message
     * @param {string} intent - Detected intent (optional, backend will detect if not provided)
     * @param {Object} context - Session context
     * @returns {Promise<Object>} ChatbotResponse
     */
    async query(message, intent = null, context = null) {
        try {
            const response = await fetch(`${this.BASE_URL}/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this._getAuthHeaders()
                },
                body: JSON.stringify({
                    message: message,
                    intent: intent || 'GENERAL_QUERY',
                    context: context || {
                        sessionId: this._getSessionId(),
                        lastCity: sessionStorage.getItem('chatbot_lastCity') || null,
                        lastIntent: sessionStorage.getItem('chatbot_lastIntent') || null
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Update context from response
            if (data.data?.city) {
                sessionStorage.setItem('chatbot_lastCity', data.data.city);
            }
            if (data.intent) {
                sessionStorage.setItem('chatbot_lastIntent', data.intent);
            }
            
            return data;
        } catch (error) {
            console.error('ChatbotAPI.query error:', error);
            return this._getFallbackResponse(message);
        }
    },
    
    /**
     * Search hotels by criteria
     * @param {string} city - City to search
     * @param {string} type - 'general', 'luxury', or 'budget'
     * @returns {Promise<Object>} Search results
     */
    async searchHotels(city, type = 'general') {
        try {
            const response = await fetch(`${this.BASE_URL}/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this._getAuthHeaders()
                },
                body: JSON.stringify({ city, type })
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('ChatbotAPI.searchHotels error:', error);
            return this._getFallbackResponse(`hotels in ${city}`);
        }
    },
    
    /**
     * Get distance between two cities
     * @param {string} from - Origin city
     * @param {string} to - Destination city
     * @returns {Promise<Object>} Distance info
     */
    async getDistance(from, to) {
        try {
            const response = await fetch(
                `${this.BASE_URL}/distance?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
                {
                    headers: this._getAuthHeaders()
                }
            );
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('ChatbotAPI.getDistance error:', error);
            return { success: false, message: 'Unable to calculate distance' };
        }
    },
    
    /**
     * Get city information
     * @param {string} cityName - City name
     * @returns {Promise<Object>} City info
     */
    async getCityInfo(cityName) {
        try {
            const response = await fetch(
                `${this.BASE_URL}/city/${encodeURIComponent(cityName)}`,
                {
                    headers: this._getAuthHeaders()
                }
            );
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('ChatbotAPI.getCityInfo error:', error);
            return { success: false, message: 'Unable to get city info' };
        }
    },
    
    /**
     * Get all available cities (cached)
     * @returns {Promise<Array>} List of cities
     */
    async getCities() {
        // Check cache
        if (this._cache.cities && this._isCacheValid()) {
            return this._cache.cities;
        }
        
        try {
            const response = await fetch(`${this.BASE_URL}/cities`, {
                headers: this._getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Cache the result
            this._cache.cities = data.cities || [];
            this._cache.cacheTime = Date.now();
            
            return this._cache.cities;
        } catch (error) {
            console.error('ChatbotAPI.getCities error:', error);
            return ['Chennai', 'Madurai', 'Ooty', 'Kodaikanal', 'Pondicherry']; // Fallback
        }
    },
    
    /**
     * Get quick reply suggestions (cached)
     * @returns {Promise<Array>} List of suggestions
     */
    async getSuggestions() {
        // Check cache
        if (this._cache.suggestions && this._isCacheValid()) {
            return this._cache.suggestions;
        }
        
        try {
            const response = await fetch(`${this.BASE_URL}/suggestions`, {
                headers: this._getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Cache the result
            this._cache.suggestions = data.suggestions || [];
            this._cache.cacheTime = Date.now();
            
            return this._cache.suggestions;
        } catch (error) {
            console.error('ChatbotAPI.getSuggestions error:', error);
            return ['Hotels in Chennai', 'Help', 'Travel packages']; // Fallback
        }
    },
    
    /**
     * Get travel packages
     * @param {string} city - Optional city filter
     * @returns {Promise<Object>} Packages list
     */
    async getPackages(city = null) {
        try {
            let url = `${this.BASE_URL}/packages`;
            if (city) {
                url += `?city=${encodeURIComponent(city)}`;
            }
            
            const response = await fetch(url, {
                headers: this._getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('ChatbotAPI.getPackages error:', error);
            return { success: false, packages: [] };
        }
    },
    
    /**
     * Detect intent from message (lightweight check)
     * @param {string} message - User message
     * @returns {Promise<Object>} Detected intent and confidence
     */
    async detectIntent(message) {
        try {
            const response = await fetch(`${this.BASE_URL}/detect-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this._getAuthHeaders()
                },
                body: JSON.stringify({ message })
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('ChatbotAPI.detectIntent error:', error);
            return { intent: 'GENERAL_QUERY', confidence: 0.5 };
        }
    },
    
    /**
     * Health check - verify backend is available
     * @returns {Promise<boolean>} True if healthy
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.BASE_URL}/health`);
            return response.ok;
        } catch (error) {
            console.error('ChatbotAPI.healthCheck failed:', error);
            return false;
        }
    },
    
    // ========== PRIVATE METHODS ==========
    
    /**
     * Get session ID (create if not exists)
     */
    _getSessionId() {
        let sessionId = sessionStorage.getItem('chatbot_sessionId');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('chatbot_sessionId', sessionId);
        }
        return sessionId;
    },
    
    /**
     * Get auth headers if user is logged in
     */
    _getAuthHeaders() {
        const token = localStorage.getItem(CONFIG?.TOKEN_KEY || 'luxestay_token');
        if (token) {
            return { 'Authorization': `Bearer ${token}` };
        }
        return {};
    },
    
    /**
     * Check if cache is still valid
     */
    _isCacheValid() {
        return this._cache.cacheTime && 
               (Date.now() - this._cache.cacheTime) < this._cache.CACHE_TTL;
    },
    
    /**
     * Clear all caches
     */
    clearCache() {
        this._cache.cities = null;
        this._cache.suggestions = null;
        this._cache.cacheTime = null;
    },
    
    /**
     * Get fallback response when backend is unavailable
     */
    _getFallbackResponse(message) {
        return {
            success: true,
            intent: 'FALLBACK',
            message: `I'm currently experiencing connectivity issues. Please try again in a moment, or browse our <a href="/hotels.html">hotels</a> directly.`,
            data: {},
            quickReplies: ['Browse Hotels', 'Retry'],
            fallback: true,
            staticContent: true
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatbotAPI;
}
