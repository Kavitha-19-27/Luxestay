/**
 * LuxeStay AI Travel Concierge Chatbot - Production UI Version
 * 
 * ARCHITECTURE: Smart UI Layer with ConversationEngine
 * - Uses ConversationEngine for intelligent responses
 * - Falls back to backend API if engine unavailable
 * - ALL rendering and UX handled here
 * 
 * @version 3.0.0 (Production)
 */

class LuxeStayChatbot {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.isTyping = false;
        this.isBackendAvailable = false;
        this.engine = null;
        this.useEngine = true;
        
        // UI state
        this.conversationContext = {
            sessionId: this.generateSessionId(),
            lastCity: null,
            lastIntent: null
        };
        
        this.init();
    }

    async init() {
        this.createChatbotHTML();
        this.cacheElements();
        this.bindEvents();
        await this.initEngine();
        this.showWelcomeMessage();
    }
    
    async initEngine() {
        // Wait for conversation engine (max 2 seconds)
        let attempts = 0;
        while (!window.conversationEngine && attempts < 20) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        
        if (window.conversationEngine) {
            this.engine = window.conversationEngine;
            // Console logging removed for production
            this.useEngine = true;
        } else {
            // Console logging removed for production
            this.useEngine = false;
            await this.checkBackendHealth();
        }
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Check if backend chatbot service is available
     */
    async checkBackendHealth() {
        try {
            this.isBackendAvailable = await ChatbotAPI.healthCheck();
            // Console logging removed for production
        } catch (error) {
            this.isBackendAvailable = false;
            // Console logging removed for production
        }
    }

    createChatbotHTML() {
        // Check if chatbot already exists
        if (document.getElementById('chatbot')) {
            // UI already exists - no action needed
            return;
        }
        
        const chatbotHTML = `
            <div class="chatbot-overlay" id="chatbotOverlay"></div>
            <div class="chatbot-container" id="chatbot" style="display: block !important; visibility: visible !important;">
                <button class="chatbot-toggle" id="chatbotToggle" aria-label="Open Chat" title="Chat with LuxeStay AI">
                    <i class="fas fa-robot"></i>
                    <i class="fas fa-times"></i>
                    <span class="chatbot-badge" id="chatbotBadge" style="display: none;">1</span>
                </button>

                <div class="chatbot-window" id="chatbotWindow">
                    <div class="chatbot-header">
                        <div class="chatbot-avatar">
                            <i class="fas fa-concierge-bell"></i>
                        </div>
                        <div class="chatbot-info">
                            <div class="chatbot-name">LuxeStay Concierge</div>
                            <div class="chatbot-status">
                                <i class="fas fa-circle"></i>
                                <span id="chatbotStatusText">Always here to help</span>
                            </div>
                        </div>
                        <div class="chatbot-header-actions">
                            <button class="chatbot-header-btn" id="chatbotClear" title="Clear Chat">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                            <button class="chatbot-header-btn" id="chatbotMinimize" title="Minimize">
                                <i class="fas fa-minus"></i>
                            </button>
                        </div>
                    </div>

                    <div class="chatbot-messages" id="chatbotMessages"></div>

                    <div class="chatbot-input">
                        <form class="chatbot-input-form" id="chatbotForm">
                            <div class="chatbot-input-wrapper">
                                <input type="text" class="chatbot-input-field" id="chatbotInput" 
                                       placeholder="Ask about hotels, cities, distances..." autocomplete="off">
                                <div class="chatbot-input-actions">
                                    <button type="button" class="chatbot-action-btn" id="voiceBtn" title="Voice Input">
                                        <i class="fas fa-microphone"></i>
                                    </button>
                                </div>
                            </div>
                            <button type="submit" class="chatbot-send-btn" id="chatbotSend">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', chatbotHTML);
        
        // Ensure visibility on mobile
        setTimeout(() => {
            const container = document.getElementById('chatbot');
            if (container) {
                container.style.display = 'block';
                container.style.visibility = 'visible';
            }
        }, 100);
    }

    cacheElements() {
        this.container = document.getElementById('chatbot');
        this.toggleBtn = document.getElementById('chatbotToggle');
        this.window = document.getElementById('chatbotWindow');
        this.messagesContainer = document.getElementById('chatbotMessages');
        this.form = document.getElementById('chatbotForm');
        this.input = document.getElementById('chatbotInput');
        this.sendBtn = document.getElementById('chatbotSend');
        this.clearBtn = document.getElementById('chatbotClear');
        this.minimizeBtn = document.getElementById('chatbotMinimize');
        this.badge = document.getElementById('chatbotBadge');
        this.voiceBtn = document.getElementById('voiceBtn');
        this.statusText = document.getElementById('chatbotStatusText');
        this.overlay = document.getElementById('chatbotOverlay');
    }

    bindEvents() {
        this.toggleBtn.addEventListener('click', () => this.toggle());
        this.minimizeBtn.addEventListener('click', () => this.toggle());
        this.form.addEventListener('submit', (e) => { e.preventDefault(); this.handleUserInput(); });
        this.clearBtn.addEventListener('click', () => this.clearChat());
        this.voiceBtn.addEventListener('click', () => this.startVoiceInput());

        // Event delegation for dynamic elements
        this.messagesContainer.addEventListener('click', (e) => {
            // Quick reply buttons
            if (e.target.classList.contains('quick-reply-btn')) {
                this.handleQuickReply(e.target.dataset.value);
            }
            // Hotel cards
            if (e.target.closest('.chat-hotel-card')) {
                const card = e.target.closest('.chat-hotel-card');
                this.handleHotelClick(card.dataset.hotelId);
            }
        });
        
        // Close chatbot when overlay is clicked (mobile)
        if (this.overlay) {
            this.overlay.addEventListener('click', () => {
                if (this.isOpen) {
                    this.toggle();
                }
            });
        }
        
        // Mobile optimization: Close other modals when chatbot opens
        this.toggleBtn.addEventListener('click', () => {
            if (window.voiceAssistant && window.voiceAssistant.elements && window.voiceAssistant.elements.modal) {
                const voiceModal = window.voiceAssistant.elements.modal;
                if (voiceModal.classList.contains('active')) {
                    window.voiceAssistant.closeModal();
                }
            }
        });
        
        // Handle window resize - remove scroll lock if resized to desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && document.body.classList.contains('chatbot-open')) {
                document.body.classList.remove('chatbot-open');
            }
        });
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this.toggleBtn.classList.toggle('active', this.isOpen);
        this.window.classList.toggle('active', this.isOpen);
        
        // Handle overlay for mobile
        if (this.overlay) {
            this.overlay.classList.toggle('active', this.isOpen);
        }
        
        // Handle body scroll lock for mobile
        const isMobile = window.innerWidth <= 768;
        
        if (this.isOpen) {
            this.badge.style.display = 'none';
            this.input.focus();
            if (isMobile) {
                document.body.classList.add('chatbot-open');
            }
        } else {
            document.body.classList.remove('chatbot-open');
        }
    }

    async showWelcomeMessage() {
        let response;
        
        // Use engine if available
        if (this.useEngine && this.engine) {
            response = await this.processWithEngine('hello');
        } else {
            response = await this.sendToBackend('hello', 'GREETING');
        }
        
        const welcomeHTML = `
            <div class="welcome-message">
                <div class="welcome-emoji">🏨</div>
                <div class="welcome-title">Welcome to LuxeStay!</div>
                <div class="welcome-text">I'm your AI Travel Concierge. Ask me about hotels, destinations, distances, or travel tips! I understand natural language - just chat like you normally would.</div>
            </div>
        `;
        
        const quickReplies = response.quickReplies || ['Hotels in Chennai', 'Plan a weekend trip', 'Budget hotels', 'Hill stations'];
        
        setTimeout(() => {
            this.addBotMessage(welcomeHTML, quickReplies);
            this.showNotificationBadge();
        }, 500);
    }

    showNotificationBadge() {
        if (!this.isOpen) this.badge.style.display = 'flex';
    }

    // ========== UI RENDERING METHODS ==========

    addBotMessage(content, quickReplies = [], hotelCards = []) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message bot';
        
        let messageHTML = `
            <div class="message-avatar"><i class="fas fa-concierge-bell"></i></div>
            <div class="message-content">
                <div class="message-bubble">${content}</div>
                <div class="message-time">${this.getCurrentTime()}</div>
        `;

        // Render hotel cards if provided
        if (hotelCards.length > 0) {
            hotelCards.forEach(hotel => { messageHTML += this.createHotelCardHTML(hotel); });
        }

        // Render quick replies if provided
        if (quickReplies.length > 0) {
            messageHTML += `<div class="quick-replies">`;
            quickReplies.forEach(reply => {
                messageHTML += `<button class="quick-reply-btn" data-value="${reply}">${reply}</button>`;
            });
            messageHTML += `</div>`;
        }

        messageHTML += `</div>`;
        messageDiv.innerHTML = messageHTML;
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addUserMessage(content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user';
        messageDiv.innerHTML = `
            <div class="message-avatar"><i class="fas fa-user"></i></div>
            <div class="message-content">
                <div class="message-bubble">${this.escapeHTML(content)}</div>
                <div class="message-time">${this.getCurrentTime()}</div>
            </div>
        `;
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message bot';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <div class="message-avatar"><i class="fas fa-concierge-bell"></i></div>
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        this.messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.remove();
    }

    createHotelCardHTML(hotel) {
        const stars = '★'.repeat(Math.floor(hotel.rating || 4));
        const imageUrl = hotel.imageUrl || hotel.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945';
        const price = hotel.pricePerNight || hotel.minPrice || 3999;
        const city = hotel.city || hotel.location || 'Tamil Nadu';
        
        return `
            <div class="chat-hotel-card" data-hotel-id="${hotel.id}">
                <img src="${imageUrl}" alt="${hotel.name}" class="chat-hotel-image" 
                     onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945'">
                <div class="chat-hotel-info">
                    <div class="chat-hotel-name">${hotel.name}</div>
                    <div class="chat-hotel-location">
                        <i class="fas fa-map-marker-alt"></i> ${city}
                    </div>
                    <div class="chat-hotel-meta">
                        <div class="chat-hotel-rating">${stars}</div>
                        <div class="chat-hotel-price">₹${price.toLocaleString()}/night</div>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== MAIN INTERACTION HANDLERS ==========

    async handleUserInput() {
        const userInput = this.input.value.trim();
        if (!userInput) return;

        this.input.value = '';
        this.addUserMessage(userInput);
        this.showTypingIndicator();

        // Quick typing delay for UX
        const delay = Math.random() * 300 + 200;
        await new Promise(resolve => setTimeout(resolve, delay));

        let response;
        
        // Use conversation engine if available
        if (this.useEngine && this.engine) {
            response = await this.processWithEngine(userInput);
        } else {
            // Fallback to backend
            response = await this.sendToBackend(userInput);
        }
        
        this.hideTypingIndicator();
        
        // Render the response
        this.renderBackendResponse(response);
    }
    
    /**
     * Process input using local ConversationEngine
     */
    async processWithEngine(message) {
        try {
            const engineResponse = await this.engine.process(message, 'chat');
            
            // Convert engine response to standard format
            return {
                success: true,
                message: engineResponse.message,
                quickReplies: engineResponse.quickReplies || [],
                intent: engineResponse.context?.state || 'GENERAL',
                data: {
                    hotels: engineResponse.hotels || [],
                    city: engineResponse.context?.city
                },
                meta: engineResponse.meta || {}
            };
        } catch (error) {
            // Error logging removed for production
            return this.sendToBackend(message);
        }
    }

    handleQuickReply(value) {
        this.input.value = value;
        this.handleUserInput();
    }

    handleHotelClick(hotelId) {
        // Navigate to hotel detail page
        window.location.href = `/hotel-detail.html?id=${hotelId}`;
    }

    // ========== BACKEND COMMUNICATION ==========

    /**
     * Send message to backend and get response
     * This is the ONLY place where business logic interaction happens
     */
    async sendToBackend(message, intent = null) {
        try {
            // Detect intent locally for faster UX (lightweight check)
            const detectedIntent = intent || this.detectIntentLocally(message);
            
            // Call backend API
            const response = await ChatbotAPI.query(message, detectedIntent, this.conversationContext);
            
            // Update context from response
            if (response.data?.city) {
                this.conversationContext.lastCity = response.data.city;
            }
            if (response.intent) {
                this.conversationContext.lastIntent = response.intent;
            }
            
            return response;
        } catch (error) {
            // Error logging removed for production
            return this.getOfflineResponse(message);
        }
    }

    /**
     * Lightweight intent detection for faster UX
     * Full processing happens on backend
     */
    detectIntentLocally(message) {
        const lower = message.toLowerCase();
        
        if (lower.match(/hi|hello|hey|good morning|good evening/)) return 'GREETING';
        if (lower.includes('help')) return 'HELP';
        if (lower.includes('luxury') || lower.includes('premium') || lower.includes('5 star')) return 'LUXURY_SEARCH';
        if (lower.includes('cheap') || lower.includes('budget') || lower.includes('affordable')) return 'BUDGET_SEARCH';
        if (lower.includes('hotel') || lower.includes('stay') || lower.includes('room')) return 'HOTEL_SEARCH';
        if (lower.includes('distance') || lower.includes('how far') || lower.includes('km')) return 'DISTANCE_QUERY';
        if (lower.includes('weather') || lower.includes('climate') || lower.includes('best time')) return 'WEATHER_QUERY';
        if (lower.includes('food') || lower.includes('eat') || lower.includes('cuisine')) return 'FOOD_QUERY';
        if (lower.includes('attraction') || lower.includes('places') || lower.includes('things to do')) return 'ATTRACTIONS_QUERY';
        if (lower.includes('package') || lower.includes('tour')) return 'PACKAGE_QUERY';
        if (lower.includes('price') || lower.includes('cost') || lower.includes('₹')) return 'PRICE_QUERY';
        if (lower.includes('about') || lower.includes('tell me about')) return 'CITY_INFO';
        
        return 'GENERAL_QUERY';
    }

    /**
     * Render backend response to UI
     */
    renderBackendResponse(response) {
        if (!response) {
            this.addBotMessage(
                "I apologize, but I'm having trouble processing your request. Please try again.",
                ['Hotels in Chennai', 'Help', 'Browse Hotels']
            );
            return;
        }

        // Get message and quick replies from response
        const message = response.message || "I'm here to help! What would you like to know?";
        const quickReplies = response.quickReplies || [];
        
        // Extract hotel cards if present in data
        const hotels = response.data?.hotels || [];
        
        this.addBotMessage(message, quickReplies, hotels);
    }

    /**
     * Offline response when backend is unavailable
     */
    getOfflineResponse(message) {
        return {
            success: true,
            intent: 'FALLBACK',
            message: `I'm currently experiencing connectivity issues. Please try again in a moment, or <a href="/hotels.html">browse our hotels</a> directly.`,
            data: {},
            quickReplies: ['Browse Hotels', 'Retry'],
            fallback: true
        };
    }

    // ========== UTILITY METHODS ==========

    clearChat() {
        this.messagesContainer.innerHTML = '';
        this.messages = [];
        this.conversationContext = {
            sessionId: this.generateSessionId(),
            lastCity: null,
            lastIntent: null
        };
        ChatbotAPI.clearCache();
        this.showWelcomeMessage();
    }

    startVoiceInput() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.addBotMessage("Voice input is not supported in your browser. Please type your message.", []);
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'en-IN';
        recognition.interimResults = false;
        
        this.voiceBtn.classList.add('listening');
        this.statusText.textContent = 'Listening...';
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.input.value = transcript;
            this.handleUserInput();
        };
        
        recognition.onend = () => {
            this.voiceBtn.classList.remove('listening');
            this.statusText.textContent = 'Always here to help';
        };
        
        recognition.onerror = (event) => {
            // Error logging removed for production
            this.voiceBtn.classList.remove('listening');
            this.statusText.textContent = 'Always here to help';
        };
        
        recognition.start();
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
}

// Initialize chatbot when DOM is ready with fallback
function initializeChatbot() {
    if (typeof ChatbotAPI !== 'undefined') {
        if (!window.luxeStayChatbot) {
            window.luxeStayChatbot = new LuxeStayChatbot();
            // Initialization successful
        }
    } else {
        // ChatbotAPI not loaded, retry in 1 second
        setTimeout(initializeChatbot, 1000);
    }
}

// Try multiple initialization methods for better mobile compatibility
document.addEventListener('DOMContentLoaded', initializeChatbot);
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeChatbot);
} else {
    initializeChatbot();
}

// Fallback initialization after page load
window.addEventListener('load', () => {
    if (!window.luxeStayChatbot) {
        setTimeout(initializeChatbot, 500);
    }
});
