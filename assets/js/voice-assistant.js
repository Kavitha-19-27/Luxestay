/**
 * LuxeStay Voice Assistant v2.0
 * 
 * Production-grade voice search and booking assistant
 * Uses Web Speech API for speech recognition and synthesis
 * Integrated with ConversationEngine for smart responses
 * 
 * @version 2.0.0
 */

class LuxeStayVoiceAssistant {
    constructor() {
        // Speech Recognition
        this.recognition = null;
        this.isListening = false;
        this.transcript = '';
        this.interimTranscript = '';
        
        // Speech Synthesis
        this.synthesis = window.speechSynthesis;
        this.voice = null;
        this.isSpeaking = false;
        
        // State
        this.isSupported = false;
        this.isInitialized = false;
        this.engine = null; // ConversationEngine reference
        this.useEngine = true;
        
        this.conversationContext = {
            sessionId: this.generateSessionId(),
            lastCity: null,
            lastHotelId: null,
            lastRoomId: null,
            lastIntent: null,
            conversationState: 'idle'
        };
        
        // Callbacks
        this.onResult = null;
        this.onError = null;
        this.onStateChange = null;
        this.onTranscript = null;
        
        // Configuration
        this.config = {
            language: 'en-IN',
            continuous: false,
            interimResults: true,
            maxAlternatives: 3,
            silenceTimeout: 3000,
            speechRate: 0.95, // Slightly slower for clarity
            speechPitch: 1.0,
            speechVolume: 1.0
        };
        
        // UI Elements
        this.elements = {};
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize the voice assistant
     */
    async init() {
        // Check browser support
        this.checkSupport();
        
        // Initialize speech recognition (if supported)
        if (this.isSupported) {
            this.initRecognition();
            this.initSynthesis();
        }
        
        // Wait for conversation engine
        await this.initEngine();
        
        // Always create UI (even if speech not supported - will show text fallback)
        this.createUI();
        
        // Bind events after UI is created and elements are cached
        this.bindEvents();
        
        // Load preferred voice
        this.loadVoice();
        
        this.isInitialized = true;
    }
    
    /**
     * Initialize conversation engine
     */
    async initEngine() {
        let attempts = 0;
        while (!window.conversationEngine && attempts < 20) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        
        if (window.conversationEngine) {
            this.engine = window.conversationEngine;
            // Engine initialization successful
            this.useEngine = true;
        } else {
            // Console logging removed for production
            this.useEngine = false;
        }
    }
    
    /**
     * Check browser support for speech APIs
     */
    checkSupport() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.isSupported = !!SpeechRecognition && !!window.speechSynthesis;
    }
    
    /**
     * Initialize speech recognition
     */
    initRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            this.isSupported = false;
            return;
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.lang = this.config.language;
        this.recognition.continuous = this.config.continuous;
        this.recognition.interimResults = this.config.interimResults;
        this.recognition.maxAlternatives = this.config.maxAlternatives;
        
        // Recognition events
        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateState('listening');
            // Console logging removed for production
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            if (this.transcript.trim()) {
                this.processTranscript(this.transcript);
            }
            this.updateState('idle');
            // Console logging removed for production
        };
        
        this.recognition.onresult = (event) => {
            this.handleRecognitionResult(event);
        };
        
        this.recognition.onerror = (event) => {
            this.handleRecognitionError(event);
        };
        
        this.recognition.onspeechend = () => {
            // Auto-stop after speech ends
            setTimeout(() => {
                if (this.isListening) {
                    this.stopListening();
                }
            }, 1000);
        };
    }
    
    /**
     * Initialize speech synthesis
     */
    initSynthesis() {
        if (!this.synthesis) return;
        
        // Load voices when available
        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = () => this.loadVoice();
        }
    }
    
    /**
     * Load preferred voice for TTS
     */
    loadVoice() {
        const voices = this.synthesis.getVoices();
        
        // Prefer Indian English, then British, then US English
        const preferredVoices = [
            'en-IN', 'en-GB', 'en-US', 'en'
        ];
        
        for (const lang of preferredVoices) {
            const voice = voices.find(v => v.lang.startsWith(lang));
            if (voice) {
                this.voice = voice;
                break;
            }
        }
        
        // Fallback to first English voice
        if (!this.voice) {
            this.voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
        }
    }
    
    /**
     * Create voice assistant UI
     */
    createUI() {
        // Check if UI already exists
        if (document.getElementById('voiceAssistantBtn')) {
            // UI already exists - no action needed
            return;
        }
        
        // Create floating voice button
        const voiceButton = document.createElement('div');
        voiceButton.className = 'voice-assistant-btn';
        voiceButton.id = 'voiceAssistantBtn';
        voiceButton.style.display = 'block';
        voiceButton.style.visibility = 'visible';
        voiceButton.innerHTML = `
            <button class="voice-btn" id="voiceTrigger" aria-label="Voice Search" title="Voice Search">
                <i class="fas fa-microphone"></i>
                <span class="voice-pulse"></span>
            </button>
        `;
        
        // Create voice modal/overlay
        const voiceModal = document.createElement('div');
        voiceModal.className = 'voice-modal';
        voiceModal.id = 'voiceModal';
        voiceModal.innerHTML = `
            <div class="voice-modal-backdrop" id="voiceBackdrop"></div>
            <div class="voice-modal-content">
                <div class="voice-modal-header">
                    <div class="voice-header-info">
                        <i class="fas fa-microphone-alt"></i>
                        <span>LuxeStay Voice Assistant</span>
                    </div>
                    <button class="voice-close-btn" id="voiceClose">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="voice-modal-body">
                    <div class="voice-visualizer" id="voiceVisualizer">
                        <div class="voice-wave">
                            <span></span><span></span><span></span><span></span><span></span>
                        </div>
                    </div>
                    
                    <div class="voice-status" id="voiceStatus">
                        <span class="voice-status-text">Tap the microphone to start</span>
                    </div>
                    
                    <div class="voice-transcript" id="voiceTranscript">
                        <div class="transcript-text" id="transcriptText"></div>
                        <div class="interim-text" id="interimText"></div>
                    </div>
                    
                    <div class="voice-response" id="voiceResponse">
                        <div class="response-content" id="responseContent"></div>
                    </div>
                    
                    <div class="voice-suggestions" id="voiceSuggestions">
                        <div class="suggestions-label">TRY SAYING:</div>
                        <div class="suggestions-list" id="suggestionsList">
                            <button class="suggestion-chip" data-command="Hotels in Chennai">
                                <i class="fas fa-search"></i> Hotels in Chennai
                            </button>
                            <button class="suggestion-chip" data-command="Show luxury hotels">
                                <i class="fas fa-star"></i> Luxury hotels
                            </button>
                            <button class="suggestion-chip" data-command="Book a room">
                                <i class="fas fa-calendar-check"></i> Book a room
                            </button>
                            <button class="suggestion-chip" data-command="Help">
                                <i class="fas fa-question-circle"></i> Help
                            </button>
                        </div>
                    </div>
                    
                    <div class="voice-text-fallback" id="voiceTextFallback">
                        <div class="text-fallback-divider"><span>or type your request</span></div>
                        <div class="text-input-wrapper">
                            <input type="text" id="voiceTextInput" placeholder="Type here..." class="voice-text-input">
                            <button type="button" id="voiceTextSubmit" class="voice-text-submit">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="voice-modal-footer">
                    <button class="voice-mic-btn" id="voiceMicBtn">
                        <i class="fas fa-microphone"></i>
                        <span class="mic-label">Tap to speak</span>
                    </button>
                    <button class="voice-stop-btn hidden" id="voiceStopBtn">
                        <i class="fas fa-stop"></i>
                        <span class="stop-label">Stop</span>
                    </button>
                </div>
            </div>
        `;
        
        // Add to DOM with fallback positioning
        document.body.appendChild(voiceButton);
        document.body.appendChild(voiceModal);
        
        // Ensure visibility on mobile
        setTimeout(() => {
            if (voiceButton) {
                voiceButton.style.display = 'block';
                voiceButton.style.visibility = 'visible';
            }
        }, 100);
        
        // Cache elements
        this.elements = {
            button: document.getElementById('voiceAssistantBtn'),
            trigger: document.getElementById('voiceTrigger'),
            modal: document.getElementById('voiceModal'),
            backdrop: document.getElementById('voiceBackdrop'),
            close: document.getElementById('voiceClose'),
            visualizer: document.getElementById('voiceVisualizer'),
            status: document.getElementById('voiceStatus'),
            statusText: document.querySelector('.voice-status-text'),
            transcript: document.getElementById('voiceTranscript'),
            transcriptText: document.getElementById('transcriptText'),
            interimText: document.getElementById('interimText'),
            response: document.getElementById('voiceResponse'),
            responseContent: document.getElementById('responseContent'),
            suggestions: document.getElementById('voiceSuggestions'),
            suggestionsList: document.getElementById('suggestionsList'),
            micBtn: document.getElementById('voiceMicBtn'),
            stopBtn: document.getElementById('voiceStopBtn'),
            textInput: document.getElementById('voiceTextInput'),
            textSubmit: document.getElementById('voiceTextSubmit')
        };
    }
    
    /**
     * Bind UI events
     */
    bindEvents() {
        // Ensure all elements exist before binding
        if (!this.elements || !this.elements.trigger) {
            console.warn('Voice Assistant: UI elements not ready, skipping event binding');
            return;
        }
        
        // Open modal
        this.elements.trigger.addEventListener('click', () => this.openModal());
        
        // Close modal
        this.elements.close.addEventListener('click', () => this.closeModal());
        this.elements.backdrop.addEventListener('click', () => this.closeModal());
        
        // Mic button
        this.elements.micBtn.addEventListener('click', () => {
            if (!this.isSupported) {
                this.showTextFallback();
                return;
            }
            this.toggleListening();
        });
        this.elements.stopBtn.addEventListener('click', () => this.stopListening());
        
        // Suggestions
        this.elements.suggestionsList.addEventListener('click', (e) => {
            const chip = e.target.closest('.suggestion-chip');
            if (chip) {
                const command = chip.dataset.command;
                this.processTranscript(command);
            }
        });
        
        // Text input fallback
        if (this.elements.textInput && this.elements.textSubmit) {
            this.elements.textSubmit.addEventListener('click', () => this.submitTextInput());
            this.elements.textInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.submitTextInput();
                }
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Press V to open voice (when not in input field)
            if (e.key === 'v' && !this.isInputFocused() && !this.isModalOpen()) {
                e.preventDefault();
                this.openModal();
            }
            
            // Escape to close
            if (e.key === 'Escape' && this.isModalOpen()) {
                this.closeModal();
            }
            
            // Space to toggle listening (when modal is open)
            if (e.key === ' ' && this.isModalOpen() && !this.isInputFocused()) {
                e.preventDefault();
                this.toggleListening();
            }
        });
    }
    
    /**
     * Open voice modal
     */
    openModal() {
        // Close chatbot if open to prevent conflicts on mobile
        if (window.luxeStayChatbot && window.luxeStayChatbot.isOpen) {
            window.luxeStayChatbot.toggle();
        }
        
        this.elements.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        document.body.classList.add('modal-open');
        
        // Show message if speech recognition not supported
        if (!this.isSupported) {
            this.elements.statusText.textContent = 'Voice recognition not available - please type your request below';
            this.elements.micBtn.style.display = 'none';
            this.elements.textInput.focus();
        } else {
            // Auto-start listening after short delay (only if supported)
            setTimeout(() => {
                this.startListening();
            }, 500);
        }
    }
    
    /**
     * Close voice modal
     */
    closeModal() {
        this.stopListening();
        this.stopSpeaking();
        this.elements.modal.classList.remove('active');
        document.body.style.overflow = '';
        document.body.classList.remove('modal-open');
        this.resetUI();
    }
    
    /**
     * Check if modal is open
     */
    isModalOpen() {
        return this.elements.modal.classList.contains('active');
    }
    
    /**
     * Check if an input field is focused
     */
    isInputFocused() {
        const activeElement = document.activeElement;
        return activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable
        );
    }
    
    /**
     * Toggle listening state
     */
    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }
    
    /**
     * Submit text input as voice command
     */
    submitTextInput() {
        if (!this.elements.textInput) return;
        
        const text = this.elements.textInput.value.trim();
        if (text) {
            this.elements.transcriptText.textContent = text;
            this.elements.textInput.value = '';
            this.processTranscript(text);
        }
    }
    
    /**
     * Start listening for voice input
     */
    startListening() {
        if (!this.isSupported || this.isListening) return;
        
        // Reset transcript
        this.transcript = '';
        this.interimTranscript = '';
        this.elements.transcriptText.textContent = '';
        this.elements.interimText.textContent = '';
        
        // Stop any ongoing speech
        this.stopSpeaking();
        
        try {
            this.recognition.start();
            this.updateUI('listening');
        } catch (error) {
            // Error logging removed for production
            this.handleRecognitionError({ error: 'start-failed' });
        }
    }
    
    /**
     * Stop listening
     */
    stopListening() {
        if (!this.recognition) return;
        
        try {
            this.recognition.stop();
        } catch (error) {
            // Ignore errors when stopping
        }
        
        this.isListening = false;
        this.updateUI('idle');
    }
    
    /**
     * Handle speech recognition results
     */
    handleRecognitionResult(event) {
        this.interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            
            if (result.isFinal) {
                this.transcript += result[0].transcript + ' ';
                this.elements.transcriptText.textContent = this.transcript.trim();
                this.elements.interimText.textContent = '';
            } else {
                this.interimTranscript += result[0].transcript;
                this.elements.interimText.textContent = this.interimTranscript;
            }
        }
        
        // Callback
        if (this.onTranscript) {
            this.onTranscript(this.transcript, this.interimTranscript);
        }
    }
    
    /**
     * Handle speech recognition errors
     */
    handleRecognitionError(event) {
        // Error logging removed for production
        
        let message = '';
        let shouldShowError = true;
        let shouldResetUI = true;
        
        switch (event.error) {
            case 'not-allowed':
            case 'permission-denied':
                message = 'Microphone access denied. Please allow microphone access in your browser settings.';
                break;
            case 'no-speech':
                // No speech detected - this is common, don't treat as error
                // Just go back to idle, the user can try again
                shouldShowError = false;
                break;
            case 'network':
                message = 'Voice recognition service unavailable. Please use text input or click the suggestions below.';
                break;
            case 'audio-capture':
                message = 'No microphone found. Please connect a microphone.';
                break;
            case 'aborted':
                // User aborted, no message needed
                shouldShowError = false;
                shouldResetUI = false;
                break;
            case 'start-failed':
                message = 'Failed to start voice recognition. Please try again.';
                break;
            default:
                message = 'An error occurred. Please try again.';
        }
        
        this.isListening = false;
        
        if (shouldShowError && message) {
            this.showError(message);
            this.updateUI('error');
        } else if (shouldResetUI) {
            this.updateUI('idle');
        }
        
        // Callback
        if (this.onError) {
            this.onError(event.error, message);
        }
    }
    
    /**
     * Process the final transcript
     */
    async processTranscript(transcript) {
        if (!transcript || !transcript.trim()) return;
        
        this.updateUI('processing');
        this.updateStatus('Processing your request...');
        
        try {
            let response;
            
            // Use conversation engine if available
            if (this.useEngine && this.engine) {
                response = await this.processWithEngine(transcript);
            } else {
                // Fallback to backend API
                response = await this.sendCommand(transcript);
            }
            
            if (response && response.success) {
                this.handleResponse(response);
            } else if (response) {
                this.handleFallbackResponse(response);
            } else {
                // No response received
                this.showError('No response received. Please try again.');
                this.updateUI('error');
            }
            
            // Callback
            if (this.onResult) {
                this.onResult(response);
            }
            
        } catch (error) {
            // Error logging removed for production
            // Show a more helpful error message
            this.handleFallbackResponse({
                success: false,
                fallback: true,
                speechText: "I'm sorry, I couldn't process that request. Please try again or use text search.",
                displayMessage: "I'm sorry, I encountered an error. Please try again or use text search.",
                suggestions: ['Hotels in Chennai', 'Search hotels', 'Help']
            });
        }
    }
    
    /**
     * Process transcript using ConversationEngine
     */
    async processWithEngine(transcript) {
        try {
            const engineResponse = await this.engine.process(transcript, 'voice');
            
            // Convert engine response to voice assistant format
            // Create concise speech text (shorter for voice)
            const speechText = this.createSpeechText(engineResponse);
            
            return {
                success: true,
                message: engineResponse.message,
                displayMessage: engineResponse.message,
                speechText: speechText,
                intent: engineResponse.context?.state || 'GENERAL',
                suggestions: engineResponse.quickReplies || [],
                data: {
                    hotels: engineResponse.hotels || [],
                    city: engineResponse.context?.city
                },
                action: engineResponse.meta?.action || null,
                meta: engineResponse.meta || {}
            };
        } catch (error) {
            // Error logging removed for production
            return this.getFallbackResponse(transcript);
        }
    }
    
    /**
     * Create concise speech text from engine response
     */
    createSpeechText(response) {
        const message = response.message || '';
        const hotels = response.hotels || [];
        
        // Extract just the key information for speech
        // Remove markdown formatting
        let speech = message
            .replace(/\*\*/g, '')
            .replace(/\n+/g, '. ')
            .replace(/•/g, '')
            .trim();
        
        // Shorten if too long for speech
        if (speech.length > 200) {
            const sentences = speech.split('. ');
            speech = sentences.slice(0, 2).join('. ');
        }
        
        // Add hotel info if present
        if (hotels.length > 0) {
            const hotelNames = hotels.slice(0, 2).map(h => h.name).join(' and ');
            if (hotels.length === 1) {
                speech += ` I found ${hotels[0].name}.`;
            } else {
                speech += ` Top options include ${hotelNames}.`;
            }
        }
        
        return speech;
    }
    
    /**
     * Send command to backend
     */
    async sendCommand(transcript) {
        const url = `${this.getApiBaseUrl()}/voice/command`;
        
        // Update context with current page info
        this.updateContextFromPage();
        
        const requestBody = {
            transcript: transcript,
            language: this.config.language,
            confidence: 0.9,
            context: this.conversationContext
        };
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders()
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            // Error logging removed for production
            return this.getFallbackResponse(transcript);
        }
    }
    
    /**
     * Update context based on current page
     */
    updateContextFromPage() {
        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);
        
        // If on hotel-detail page, extract hotel ID
        if (path.includes('hotel-detail')) {
            const hotelId = params.get('id');
            if (hotelId) {
                this.conversationContext.lastHotelId = hotelId;
            }
        }
        
        // If on booking page, extract room and hotel ID
        if (path.includes('booking')) {
            const hotelId = params.get('hotelId');
            const roomId = params.get('roomId');
            if (hotelId) this.conversationContext.lastHotelId = hotelId;
            if (roomId) this.conversationContext.lastRoomId = roomId;
        }
        
        // Store current page for context
        this.conversationContext.currentPage = path;
    }
    
    /**
     * Handle successful response
     */
    handleResponse(response) {
        // Update context
        if (response.data) {
            if (response.data.city) {
                this.conversationContext.lastCity = response.data.city;
            }
            if (response.data.hotelId) {
                this.conversationContext.lastHotelId = response.data.hotelId;
            }
        }
        if (response.intent) {
            this.conversationContext.lastIntent = response.intent;
        }
        if (response.nextState) {
            this.conversationContext.conversationState = response.nextState;
        }
        
        // Display response
        this.showResponse(response);
        
        // Speak response
        if (response.speechText) {
            this.speak(response.speechText);
        }
        
        // Update suggestions
        if (response.suggestions) {
            this.updateSuggestions(response.suggestions);
        }
        
        // Handle action
        this.handleAction(response);
        
        this.updateUI('success');
    }
    
    /**
     * Handle fallback response
     */
    handleFallbackResponse(response) {
        this.showResponse(response);
        
        if (response.speechText) {
            this.speak(response.speechText);
        }
        
        // Handle action even for non-success responses (e.g., REQUEST_LOGIN)
        if (response.action) {
            this.handleAction(response);
        }
        
        this.updateUI('idle');
    }
    
    /**
     * Handle voice action
     */
    handleAction(response) {
        if (!response.action) return;
        
        switch (response.action) {
            case 'NAVIGATE':
                if (response.data && response.data.destination) {
                    const dest = response.data.destination;
                    if (dest === 'back') {
                        window.history.back();
                    } else {
                        setTimeout(() => {
                            window.location.href = dest;
                        }, 1500);
                    }
                }
                break;
                
            case 'DISPLAY_RESULTS':
                // Results are displayed in the response area
                // Optionally navigate to search results
                if (response.data && response.data.searchUrl) {
                    // Show results first, then offer to navigate
                    this.showResultsWithNavOption(response.data);
                }
                break;
                
            case 'COMPLETE_BOOKING':
                // Booking completed, show confirmation
                setTimeout(() => {
                    if (response.data && response.data.reference) {
                        window.location.href = `/my-bookings.html`;
                    }
                }, 3000);
                break;
                
            case 'REQUEST_LOGIN':
                setTimeout(() => {
                    window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
                }, 2000);
                break;
                
            case 'APPLY_FILTER':
                // Apply filter to current page if on hotels page
                if (window.location.pathname.includes('hotels')) {
                    this.applyFilter(response.data);
                }
                break;
                
            case 'SHOW_DETAILS':
                if (response.data && response.data.hotel) {
                    setTimeout(() => {
                        window.location.href = `/hotel-detail.html?id=${response.data.hotel.id}`;
                    }, 2000);
                }
                break;
        }
    }
    
    /**
     * Show response in UI
     */
    showResponse(response) {
        const content = this.elements.responseContent;
        content.innerHTML = '';
        
        // Create response HTML
        const responseHtml = document.createElement('div');
        responseHtml.className = 'voice-response-content';
        
        // Check if this is a booking context
        const isBookingContext = response.action === 'BOOK' || 
            (response.data && response.data.isBookingContext) ||
            (response.message && response.message.toLowerCase().includes('book'));
        
        // Message
        if (response.displayMessage || response.message) {
            const messageEl = document.createElement('div');
            messageEl.className = 'response-message';
            messageEl.innerHTML = response.displayMessage || response.message;
            responseHtml.appendChild(messageEl);
        }
        
        // Hotels
        if (response.data && response.data.hotels && response.data.hotels.length > 0) {
            const hotelsEl = this.createHotelCards(response.data.hotels, isBookingContext);
            responseHtml.appendChild(hotelsEl);
        }
        
        // Rooms
        if (response.data && response.data.rooms && response.data.rooms.length > 0) {
            const roomsEl = this.createRoomCards(response.data.rooms);
            responseHtml.appendChild(roomsEl);
        }
        
        // Bookings
        if (response.data && response.data.bookings && response.data.bookings.length > 0) {
            const bookingsEl = this.createBookingCards(response.data.bookings);
            responseHtml.appendChild(bookingsEl);
        }
        
        // Booking confirmation
        if (response.data && response.data.booking) {
            const bookingEl = this.createBookingConfirmation(response.data.booking);
            responseHtml.appendChild(bookingEl);
        }
        
        // Help commands
        if (response.data && response.data.commands) {
            const helpEl = this.createHelpContent(response.data.commands);
            responseHtml.appendChild(helpEl);
        }
        
        // Clarification options
        if (response.needsClarification && response.clarificationOptions) {
            const clarifyEl = this.createClarificationOptions(response.clarificationOptions);
            responseHtml.appendChild(clarifyEl);
        }
        
        content.appendChild(responseHtml);
        this.elements.response.classList.add('active');
    }
    
    /**
     * Create hotel cards HTML
     */
    createHotelCards(hotels, forBooking = false) {
        const container = document.createElement('div');
        container.className = 'voice-hotel-cards';
        
        hotels.slice(0, 5).forEach(hotel => {
            const card = document.createElement('div');
            card.className = 'voice-hotel-card';
            card.innerHTML = `
                <img src="${hotel.heroImageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'}" 
                     alt="${hotel.name}" class="hotel-card-img">
                <div class="hotel-card-info">
                    <h4>${hotel.name}</h4>
                    <p><i class="fas fa-map-marker-alt"></i> ${hotel.city || ''}, ${hotel.country || 'India'}</p>
                    <div class="hotel-card-rating">
                        ${'⭐'.repeat(hotel.starRating || 3)}
                    </div>
                    ${forBooking ? `<button class="voice-book-hotel-btn" data-hotel-id="${hotel.id}">
                        <i class="fas fa-calendar-check"></i> Book at This Hotel
                    </button>` : ''}
                </div>
            `;
            
            if (forBooking) {
                const bookBtn = card.querySelector('.voice-book-hotel-btn');
                bookBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectHotel(hotel.id);
                });
            } else {
                card.addEventListener('click', () => {
                    window.location.href = `/hotel-detail.html?id=${hotel.id}`;
                });
            }
            
            container.appendChild(card);
        });
        
        return container;
    }
    
    /**
     * Select a hotel for booking
     */
    selectHotel(hotelId) {
        this.conversationContext.lastHotelId = hotelId;
        window.location.href = `/hotel-detail.html?id=${hotelId}`;
    }
    
    /**
     * Create room cards HTML
     */
    createRoomCards(rooms) {
        const container = document.createElement('div');
        container.className = 'voice-room-cards';
        
        rooms.slice(0, 5).forEach(room => {
            const card = document.createElement('div');
            card.className = 'voice-room-card';
            card.innerHTML = `
                <div class="room-card-info">
                    <h4>${room.name || room.roomType}</h4>
                    <p><i class="fas fa-bed"></i> ${room.roomType || 'Standard'} • ${room.capacity || 2} guests</p>
                    <p class="room-price">₹${room.pricePerNight?.toLocaleString() || room.price}/night</p>
                    <button class="voice-book-room-btn" data-room-id="${room.id}">
                        <i class="fas fa-check"></i> Book This Room
                    </button>
                </div>
            `;
            
            // Add click handler for booking
            const bookBtn = card.querySelector('.voice-book-room-btn');
            bookBtn.addEventListener('click', () => {
                this.selectRoom(room.id, room.hotelId);
            });
            
            container.appendChild(card);
        });
        
        return container;
    }
    
    /**
     * Select a room for booking
     */
    selectRoom(roomId, hotelId) {
        this.conversationContext.lastRoomId = roomId;
        if (hotelId) this.conversationContext.lastHotelId = hotelId;
        
        // Navigate to booking page or trigger booking flow
        window.location.href = `/booking.html?roomId=${roomId}${hotelId ? '&hotelId=' + hotelId : ''}`;
    }
    
    /**
     * Create booking cards HTML
     */
    createBookingCards(bookings) {
        const container = document.createElement('div');
        container.className = 'voice-booking-cards';
        
        bookings.slice(0, 3).forEach(booking => {
            const card = document.createElement('div');
            card.className = 'voice-booking-card';
            card.innerHTML = `
                <div class="booking-card-header">
                    <span class="booking-ref">${booking.bookingReference}</span>
                    <span class="booking-status status-${booking.status.toLowerCase()}">${booking.status}</span>
                </div>
                <div class="booking-card-info">
                    <h4>${booking.hotelName}</h4>
                    <p>${booking.roomName}</p>
                    <p><i class="fas fa-calendar"></i> ${booking.checkInDate} - ${booking.checkOutDate}</p>
                </div>
            `;
            container.appendChild(card);
        });
        
        return container;
    }
    
    /**
     * Create booking confirmation HTML
     */
    createBookingConfirmation(booking) {
        const container = document.createElement('div');
        container.className = 'voice-booking-confirmation';
        container.innerHTML = `
            <div class="confirmation-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h3>Booking Confirmed!</h3>
            <p class="confirmation-ref">Reference: <strong>${booking.bookingReference}</strong></p>
        `;
        return container;
    }
    
    /**
     * Create help content HTML
     */
    createHelpContent(commands) {
        const container = document.createElement('div');
        container.className = 'voice-help-content';
        
        commands.forEach(category => {
            const section = document.createElement('div');
            section.className = 'help-section';
            section.innerHTML = `
                <h4>${category.category}</h4>
                <div class="help-examples">
                    ${category.examples.map(ex => `<span class="help-example">"${ex}"</span>`).join('')}
                </div>
            `;
            container.appendChild(section);
        });
        
        return container;
    }
    
    /**
     * Create clarification options
     */
    createClarificationOptions(options) {
        const container = document.createElement('div');
        container.className = 'voice-clarification-options';
        
        options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'clarification-option';
            btn.textContent = option;
            btn.addEventListener('click', () => {
                this.processTranscript(option);
            });
            container.appendChild(btn);
        });
        
        return container;
    }
    
    /**
     * Show results with navigation option
     */
    showResultsWithNavOption(data) {
        if (data.searchUrl && data.hotels && data.hotels.length > 3) {
            const navBtn = document.createElement('button');
            navBtn.className = 'voice-nav-btn';
            navBtn.innerHTML = `<i class="fas fa-external-link-alt"></i> View all ${data.totalCount} hotels`;
            navBtn.addEventListener('click', () => {
                window.location.href = data.searchUrl;
            });
            this.elements.responseContent.appendChild(navBtn);
        }
    }
    
    /**
     * Apply filter to current page
     */
    applyFilter(data) {
        if (typeof window.applyVoiceFilter === 'function') {
            window.applyVoiceFilter(data);
        }
    }
    
    /**
     * Update suggestions list
     */
    updateSuggestions(suggestions) {
        const list = this.elements.suggestionsList;
        list.innerHTML = '';
        
        suggestions.slice(0, 4).forEach(suggestion => {
            const chip = document.createElement('button');
            chip.className = 'suggestion-chip';
            chip.dataset.command = suggestion;
            chip.innerHTML = `<i class="fas fa-comment"></i> ${suggestion}`;
            list.appendChild(chip);
        });
    }
    
    /**
     * Text-to-speech
     */
    speak(text) {
        if (!this.synthesis || !text) return;
        
        // Cancel any ongoing speech
        this.stopSpeaking();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = this.voice;
        utterance.rate = this.config.speechRate;
        utterance.pitch = this.config.speechPitch;
        utterance.volume = this.config.speechVolume;
        
        utterance.onstart = () => {
            this.isSpeaking = true;
        };
        
        utterance.onend = () => {
            this.isSpeaking = false;
        };
        
        utterance.onerror = (event) => {
            // Error logging removed for production
            this.isSpeaking = false;
        };
        
        this.synthesis.speak(utterance);
    }
    
    /**
     * Stop speaking
     */
    stopSpeaking() {
        if (this.synthesis) {
            this.synthesis.cancel();
            this.isSpeaking = false;
        }
    }
    
    /**
     * Update UI state
     */
    updateUI(state) {
        const { modal, visualizer, micBtn, stopBtn } = this.elements;
        
        // Remove all states
        modal.classList.remove('listening', 'processing', 'success', 'error');
        
        switch (state) {
            case 'listening':
                modal.classList.add('listening');
                visualizer.classList.add('active');
                micBtn.classList.add('hidden');
                stopBtn.classList.remove('hidden');
                this.updateStatus('Listening... Speak now');
                break;
                
            case 'processing':
                modal.classList.add('processing');
                visualizer.classList.remove('active');
                micBtn.classList.add('hidden');
                stopBtn.classList.add('hidden');
                this.updateStatus('Processing...');
                break;
                
            case 'success':
                modal.classList.add('success');
                visualizer.classList.remove('active');
                micBtn.classList.remove('hidden');
                stopBtn.classList.add('hidden');
                this.updateStatus('Done! Tap mic to ask another question');
                break;
                
            case 'error':
                modal.classList.add('error');
                visualizer.classList.remove('active');
                micBtn.classList.remove('hidden');
                stopBtn.classList.add('hidden');
                break;
                
            default: // idle
                visualizer.classList.remove('active');
                micBtn.classList.remove('hidden');
                stopBtn.classList.add('hidden');
                this.updateStatus('Ready! Tap the microphone to speak');
                // Hide error response when going back to idle
                if (this.elements.response) {
                    this.elements.response.classList.remove('active');
                }
        }
    }
    
    /**
     * Update status text
     */
    updateStatus(text) {
        if (this.elements.statusText) {
            this.elements.statusText.textContent = text;
        }
    }
    
    /**
     * Update state callback
     */
    updateState(state) {
        if (this.onStateChange) {
            this.onStateChange(state);
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        this.updateStatus(message);
        
        const content = this.elements.responseContent;
        content.innerHTML = `
            <div class="voice-error">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
            </div>
        `;
        this.elements.response.classList.add('active');
    }
    
    /**
     * Reset UI to initial state
     */
    resetUI() {
        this.transcript = '';
        this.interimTranscript = '';
        this.elements.transcriptText.textContent = '';
        this.elements.interimText.textContent = '';
        this.elements.responseContent.innerHTML = '';
        this.elements.response.classList.remove('active');
        this.updateUI('idle');
    }
    
    /**
     * Show text fallback when speech not supported
     */
    showTextFallback() {
        this.elements.textInput.focus();
        if (typeof UI !== 'undefined') {
            UI.toast('Voice recognition is only available on Chrome and Edge browsers. Please use the text input.', 'info', 6000);
        }
    }
    
    /**
     * Get fallback response when API is unavailable
     */
    getFallbackResponse(transcript) {
        return {
            success: false,
            fallback: true,
            speechText: "I'm having trouble connecting. Please try using the search bar or navigate to the hotels page.",
            displayMessage: "Connection error. Please try text search.",
            suggestions: ['Hotels in Chennai', 'Go to hotels', 'Help']
        };
    }
    
    /**
     * Get API base URL
     */
    getApiBaseUrl() {
        if (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) {
            return CONFIG.API_BASE_URL;
        }
        return 'https://luxestay-backend-1.onrender.com/api';
    }
    
    /**
     * Get auth headers
     */
    getAuthHeaders() {
        const token = localStorage.getItem('luxestay_token');
        if (token) {
            return { 'Authorization': `Bearer ${token}` };
        }
        return {};
    }
    
    /**
     * Generate session ID
     */
    generateSessionId() {
        return 'voice_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Change language
     */
    setLanguage(langCode) {
        this.config.language = langCode;
        if (this.recognition) {
            this.recognition.lang = langCode;
        }
        this.loadVoice();
    }
    
    /**
     * Destroy voice assistant
     */
    destroy() {
        this.stopListening();
        this.stopSpeaking();
        
        if (this.elements.button) {
            this.elements.button.remove();
        }
        if (this.elements.modal) {
            this.elements.modal.remove();
        }
        
        this.isInitialized = false;
    }
}

// Enhanced initialization for better mobile support
function initializeVoiceAssistant() {
    if (!window.voiceAssistant) {
        window.voiceAssistant = new LuxeStayVoiceAssistant();
        // Initialization successful
    }
}

// Multiple initialization triggers for mobile compatibility
document.addEventListener('DOMContentLoaded', initializeVoiceAssistant);
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeVoiceAssistant);
} else {
    initializeVoiceAssistant();
}

// Fallback initialization
window.addEventListener('load', () => {
    if (!window.voiceAssistant) {
        setTimeout(initializeVoiceAssistant, 500);
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LuxeStayVoiceAssistant;
}
