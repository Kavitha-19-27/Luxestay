/**
 * LuxeStay AI Travel Concierge Chatbot - Enhanced Version
 * Intelligent chatbot with Tamil Nadu knowledge base and database integration
 */

class LuxeStayChatbot {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.isTyping = false;
        this.hotels = [];
        this.cities = [];
        this.rooms = [];
        this.conversationContext = {
            lastIntent: null,
            searchCriteria: {},
            userName: null,
            lastCity: null
        };
        
        // Knowledge base reference
        this.kb = typeof CHATBOT_KNOWLEDGE !== 'undefined' ? CHATBOT_KNOWLEDGE : null;
        
        this.init();
    }

    async init() {
        this.createChatbotHTML();
        this.cacheElements();
        this.bindEvents();
        await this.loadData();
        this.showWelcomeMessage();
    }

    createChatbotHTML() {
        const chatbotHTML = `
            <div class="chatbot-container" id="chatbot">
                <button class="chatbot-toggle" id="chatbotToggle" aria-label="Open Chat">
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
                                Always here to help
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
    }

    bindEvents() {
        this.toggleBtn.addEventListener('click', () => this.toggle());
        this.minimizeBtn.addEventListener('click', () => this.toggle());
        this.form.addEventListener('submit', (e) => { e.preventDefault(); this.handleUserInput(); });
        this.clearBtn.addEventListener('click', () => this.clearChat());
        this.voiceBtn.addEventListener('click', () => this.startVoiceInput());

        this.messagesContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-reply-btn')) {
                this.handleQuickReply(e.target.dataset.value);
            }
            if (e.target.closest('.chat-hotel-card')) {
                const card = e.target.closest('.chat-hotel-card');
                this.handleHotelClick(card.dataset.hotelId);
            }
        });
    }

    async loadData() {
        // Initialize with empty data
        this.hotels = [];
        this.cities = [];
        
        try {
            // Load all hotels from database
            const hotelsResponse = await fetch(`${CONFIG.API_BASE_URL}/hotels`);
            if (hotelsResponse.ok) {
                const hotelsData = await hotelsResponse.json();
                // Handle API response structure
                const hotelsList = hotelsData.data?.content || hotelsData.data || hotelsData.content || hotelsData;
                if (Array.isArray(hotelsList) && hotelsList.length > 0) {
                    this.hotels = hotelsList;
                    console.log(`Chatbot: Loaded ${this.hotels.length} hotels from database`);
                }
            }

            // Load all cities
            const citiesResponse = await fetch(`${CONFIG.API_BASE_URL}/hotels/cities`);
            if (citiesResponse.ok) {
                const citiesData = await citiesResponse.json();
                // Handle API response structure
                const citiesList = citiesData.data || citiesData;
                if (Array.isArray(citiesList) && citiesList.length > 0) {
                    this.cities = citiesList;
                    console.log(`Chatbot: Loaded ${this.cities.length} cities`);
                }
            }
        } catch (error) {
            console.log('Chatbot: API unavailable, working with limited data');
        }
        
        // No fallback - database is single source of truth
        if (this.hotels.length === 0) {
            console.log('Chatbot: No hotels available from database');
        }
    }
    
    getDefaultCities() {
        // Return cities loaded from API, or empty array
        return this.cities || [];
    }
    
    // No fake fallback hotels - database is single source of truth
    createFallbackHotels() {
        return [];
    }

    // Safe helper to get cities array slice
    getSafeCities(count = 4) {
        if (Array.isArray(this.cities) && this.cities.length > 0) {
            return this.cities.slice(0, count);
        }
        // Return empty if no data available
        return [];
    }

    // Safe helper to get hotels array
    getSafeHotels() {
        if (Array.isArray(this.hotels) && this.hotels.length > 0) {
            return this.hotels;
        }
        // Return empty array if no data available
        return [];
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this.toggleBtn.classList.toggle('active', this.isOpen);
        this.window.classList.toggle('active', this.isOpen);
        if (this.isOpen) {
            this.badge.style.display = 'none';
            this.input.focus();
        }
    }

    showWelcomeMessage() {
        const welcomeHTML = `
            <div class="welcome-message">
                <div class="welcome-emoji">🏨</div>
                <div class="welcome-title">Welcome to LuxeStay!</div>
                <div class="welcome-text">I'm your AI Travel Concierge. Ask me about hotels, destinations, distances, or travel tips!</div>
            </div>
        `;
        const quickReplies = ['Hotels in Chennai', 'Best Tamil Nadu destinations', 'Budget hotels', 'Hill stations'];
        setTimeout(() => {
            this.addBotMessage(welcomeHTML, quickReplies);
            this.showNotificationBadge();
        }, 500);
    }

    showNotificationBadge() {
        if (!this.isOpen) this.badge.style.display = 'flex';
    }

    addBotMessage(content, quickReplies = [], hotelCards = []) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message bot';
        
        let messageHTML = `
            <div class="message-avatar"><i class="fas fa-concierge-bell"></i></div>
            <div class="message-content">
                <div class="message-bubble">${content}</div>
                <div class="message-time">${this.getCurrentTime()}</div>
        `;

        if (hotelCards.length > 0) {
            hotelCards.forEach(hotel => { messageHTML += this.createHotelCardHTML(hotel); });
        }

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
        const imageUrl = hotel.imageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945';
        const price = hotel.pricePerNight || hotel.minPrice || 3999;
        
        return `
            <div class="chat-hotel-card" data-hotel-id="${hotel.id}">
                <img src="${imageUrl}" alt="${hotel.name}" class="chat-hotel-image" 
                     onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945'">
                <div class="chat-hotel-info">
                    <div class="chat-hotel-name">${hotel.name}</div>
                    <div class="chat-hotel-location">
                        <i class="fas fa-map-marker-alt"></i> ${hotel.city || hotel.location}
                    </div>
                    <div class="chat-hotel-meta">
                        <div class="chat-hotel-rating">${stars}</div>
                        <div class="chat-hotel-price">₹${price.toLocaleString()}/night</div>
                    </div>
                </div>
            </div>
        `;
    }

    async handleUserInput() {
        const userInput = this.input.value.trim();
        if (!userInput) return;

        this.input.value = '';
        this.addUserMessage(userInput);
        this.showTypingIndicator();

        // Quick response - reduced delay
        const delay = Math.random() * 300 + 200;
        await new Promise(resolve => setTimeout(resolve, delay));

        this.hideTypingIndicator();
        const response = await this.processMessage(userInput);
        this.addBotMessage(response.message, response.quickReplies || [], response.hotels || []);
    }

    async processMessage(input) {
        const lowerInput = input.toLowerCase().trim();

        // Greeting
        if (this.matchesPattern(lowerInput, ['hi', 'hello', 'hey', 'good morning', 'good evening'])) {
            return this.handleGreeting();
        }

        // Thank you
        if (this.matchesPattern(lowerInput, ['thank', 'thanks'])) {
            return { message: "You're welcome! 😊 Anything else I can help with?", quickReplies: ['Find hotels', 'Travel tips', 'Destinations'] };
        }

        // Distance queries
        if (this.matchesPattern(lowerInput, ['distance', 'how far', 'km from', 'kilometers', 'far is'])) {
            return this.handleDistanceQuery(lowerInput);
        }

        // City/Destination info
        const cityInfo = this.findCityInfo(lowerInput);
        if (cityInfo && (this.matchesPattern(lowerInput, ['about', 'tell me', 'info', 'information', 'details', 'what is', 'describe']))) {
            return this.handleCityInfo(cityInfo);
        }

        // Attractions/Places to visit
        if (this.matchesPattern(lowerInput, ['attractions', 'places to visit', 'things to do', 'tourist', 'sightseeing', 'what to see'])) {
            return this.handleAttractions(lowerInput);
        }

        // Weather/Best time
        if (this.matchesPattern(lowerInput, ['weather', 'climate', 'best time', 'when to visit', 'temperature'])) {
            return this.handleWeatherQuery(lowerInput);
        }

        // Food/Specialities
        if (this.matchesPattern(lowerInput, ['food', 'eat', 'cuisine', 'restaurant', 'specialty', 'speciality', 'must try', 'famous for'])) {
            return this.handleFoodQuery(lowerInput);
        }

        // Price/Cost queries
        if (this.matchesPattern(lowerInput, ['price', 'cost', 'rate', 'how much', 'expensive', 'cheap'])) {
            return this.handlePriceQuery(lowerInput);
        }

        // Hotel count/availability
        if (this.matchesPattern(lowerInput, ['how many hotels', 'number of hotels', 'hotels available', 'total hotels'])) {
            return this.handleHotelCount(lowerInput);
        }

        // Hotel search by city
        const searchCity = this.findCityInInput(lowerInput);
        if (searchCity || this.matchesPattern(lowerInput, ['hotels in', 'stay in', 'book in', 'accommodation'])) {
            return await this.handleHotelSearch(searchCity, lowerInput);
        }

        // Luxury hotels
        if (this.matchesPattern(lowerInput, ['luxury', 'premium', 'best hotel', '5 star', 'five star', 'top rated'])) {
            return await this.handleLuxurySearch(lowerInput);
        }

        // Budget hotels
        if (this.matchesPattern(lowerInput, ['budget', 'cheap', 'affordable', 'low cost', 'economical', 'under'])) {
            return await this.handleBudgetSearch(lowerInput);
        }

        // Beach destinations
        if (this.matchesPattern(lowerInput, ['beach', 'sea', 'ocean', 'coastal'])) {
            return this.handleBeachSearch();
        }

        // Hill stations
        if (this.matchesPattern(lowerInput, ['hill', 'mountain', 'cool', 'ooty', 'kodaikanal', 'yelagiri'])) {
            return this.handleHillStationSearch(lowerInput);
        }

        // Temple/Heritage
        if (this.matchesPattern(lowerInput, ['temple', 'heritage', 'religious', 'pilgrimage', 'spiritual'])) {
            return this.handleTempleSearch();
        }

        // Travel packages
        if (this.matchesPattern(lowerInput, ['package', 'tour', 'itinerary', 'trip plan'])) {
            return this.handlePackages();
        }

        // Tamil Nadu specific
        if (this.matchesPattern(lowerInput, ['tamil nadu', 'tamilnadu', 'tn'])) {
            return this.handleTamilNaduQuery(lowerInput);
        }

        // Honeymoon/Romantic
        if (this.matchesPattern(lowerInput, ['honeymoon', 'romantic', 'couple', 'anniversary'])) {
            return this.handleRomanticQuery();
        }

        // Family
        if (this.matchesPattern(lowerInput, ['family', 'kids', 'children'])) {
            return this.handleFamilyQuery();
        }

        // Booking help
        if (this.matchesPattern(lowerInput, ['book', 'booking', 'reserve', 'reservation'])) {
            return this.handleBookingHelp();
        }

        // All hotels
        if (this.matchesPattern(lowerInput, ['all hotels', 'show hotels', 'list hotels', 'available hotels'])) {
            return this.handleAllHotels();
        }

        // Default - try to find any city match
        const anyCity = this.findCityInInput(lowerInput);
        if (anyCity) {
            return await this.handleHotelSearch(anyCity, lowerInput);
        }

        return this.handleUnknownQuery(input);
    }

    matchesPattern(input, patterns) {
        return patterns.some(pattern => input.includes(pattern));
    }

    // ============ KNOWLEDGE BASE QUERIES ============

    findCityInfo(input) {
        if (!this.kb) return null;
        const tnCities = this.kb.tamilNadu;
        for (const key in tnCities) {
            if (input.includes(key) || input.includes(tnCities[key].name.toLowerCase())) {
                return tnCities[key];
            }
        }
        return null;
    }

    findCityInInput(input) {
        // Check database cities first (with safety check)
        if (Array.isArray(this.cities)) {
            for (const city of this.cities) {
                if (city && input.includes(city.toLowerCase())) {
                    return city;
                }
            }
        }
        
        // Check Tamil Nadu knowledge base
        if (this.kb && this.kb.tamilNadu) {
            for (const key in this.kb.tamilNadu) {
                if (input.includes(key)) {
                    return this.kb.tamilNadu[key].name;
                }
            }
        }

        // Common city aliases
        const aliases = {
            'trichy': 'Trichy', 'tiruchirappalli': 'Trichy',
            'pondy': 'Pondicherry', 'puducherry': 'Pondicherry',
            'bengaluru': 'Bangalore', 'bombay': 'Mumbai',
            'mahabalipuram': 'Mahabalipuram', 'mamalla': 'Mahabalipuram'
        };
        for (const alias in aliases) {
            if (input.includes(alias)) return aliases[alias];
        }

        return null;
    }

    handleGreeting() {
        const hotelCount = this.getSafeHotels().length;
        const cityCount = this.getSafeCities(100).length;
        return {
            message: `Hello! 👋 Welcome to LuxeStay!\n\nI have access to <strong>${hotelCount} hotels</strong> across <strong>${cityCount} cities</strong>. I specialize in Tamil Nadu destinations!\n\nAsk me about:\n• Hotels in any city\n• Distances between cities\n• Attractions & things to do\n• Best time to visit\n• Local food & specialties`,
            quickReplies: ['Hotels in Chennai', 'Tamil Nadu destinations', 'Distance calculator', 'Travel tips']
        };
    }

    handleCityInfo(cityInfo) {
        let msg = `<strong>📍 ${cityInfo.name}</strong>\n`;
        msg += `<em>${cityInfo.type}</em>\n\n`;
        msg += `${cityInfo.description}\n\n`;
        
        if (cityInfo.bestTimeToVisit) {
            msg += `🗓️ <strong>Best Time:</strong> ${cityInfo.bestTimeToVisit}\n`;
        }
        if (cityInfo.weather) {
            msg += `🌡️ <strong>Weather:</strong>\n`;
            msg += `• Summer: ${cityInfo.weather.summer}\n`;
            msg += `• Winter: ${cityInfo.weather.winter}\n`;
        }
        if (cityInfo.altitude) {
            msg += `⛰️ <strong>Altitude:</strong> ${cityInfo.altitude}\n`;
        }

        const quickReplies = [`Hotels in ${cityInfo.name}`, `Attractions in ${cityInfo.name}`];
        if (cityInfo.specialities) quickReplies.push(`Food in ${cityInfo.name}`);

        return { message: msg, quickReplies };
    }

    handleDistanceQuery(input) {
        if (!this.kb) {
            return { message: "I can help with distances! Which two cities do you want to know the distance between?", quickReplies: ['Chennai to Madurai', 'Chennai to Ooty', 'Coimbatore to Ooty'] };
        }

        // Extract city names
        const cities = [];
        for (const key in this.kb.tamilNadu) {
            if (input.includes(key)) cities.push(key);
        }

        // Check for common variations
        const cityMappings = {
            'trichy': 'trichy', 'pondicherry': 'pondicherry', 'pondy': 'pondicherry'
        };
        for (const alias in cityMappings) {
            if (input.includes(alias) && !cities.includes(cityMappings[alias])) {
                cities.push(cityMappings[alias]);
            }
        }

        if (cities.length >= 2) {
            const city1 = cities[0];
            const city2 = cities[1];
            const key1 = `${city1}-${city2}`;
            const key2 = `${city2}-${city1}`;
            
            const distance = this.kb.distances[key1] || this.kb.distances[key2];
            const time = this.kb.travelTimes[key1] || this.kb.travelTimes[key2];

            if (distance) {
                const city1Name = this.kb.tamilNadu[city1]?.name || city1.charAt(0).toUpperCase() + city1.slice(1);
                const city2Name = this.kb.tamilNadu[city2]?.name || city2.charAt(0).toUpperCase() + city2.slice(1);
                
                let msg = `📍 <strong>Distance: ${city1Name} ↔ ${city2Name}</strong>\n\n`;
                msg += `🚗 <strong>${distance} km</strong> by road\n`;
                if (time) msg += `⏱️ <strong>${time}</strong> travel time\n`;
                msg += `\n💡 <em>Pro tip: Book hotels in advance for better rates!</em>`;
                
                return { 
                    message: msg, 
                    quickReplies: [`Hotels in ${city1Name}`, `Hotels in ${city2Name}`, 'More distances'] 
                };
            }
        }

        // Show available distances
        let msg = "📏 <strong>Distance Calculator</strong>\n\nHere are some popular routes:\n\n";
        const popularRoutes = [
            ['Chennai', 'Madurai', 462], ['Chennai', 'Ooty', 560], ['Chennai', 'Pondicherry', 150],
            ['Chennai', 'Mahabalipuram', 60], ['Coimbatore', 'Ooty', 86], ['Madurai', 'Kodaikanal', 120]
        ];
        popularRoutes.forEach(([c1, c2, d]) => {
            msg += `• ${c1} ↔ ${c2}: <strong>${d} km</strong>\n`;
        });
        msg += "\n<em>Ask like: 'Distance from Chennai to Madurai'</em>";

        return { message: msg, quickReplies: ['Chennai to Coimbatore', 'Madurai to Rameswaram', 'Chennai to Kanyakumari'] };
    }

    handleAttractions(input) {
        const cityInfo = this.findCityInfo(input);
        
        if (cityInfo && cityInfo.attractions) {
            let msg = `🎯 <strong>Top Attractions in ${cityInfo.name}</strong>\n\n`;
            cityInfo.attractions.slice(0, 6).forEach((attr, i) => {
                msg += `${i + 1}. ${attr}\n`;
            });
            if (cityInfo.activities) {
                msg += `\n🎿 <strong>Activities:</strong> ${cityInfo.activities.join(', ')}`;
            }
            return { message: msg, quickReplies: [`Hotels in ${cityInfo.name}`, `Weather in ${cityInfo.name}`, 'Other destinations'] };
        }

        // General Tamil Nadu attractions
        if (!this.kb) return { message: "Which city's attractions would you like to know about?", quickReplies: ['Chennai attractions', 'Madurai attractions', 'Ooty attractions'] };

        let msg = "🏛️ <strong>Top Tamil Nadu Attractions</strong>\n\n";
        msg += "🛕 <strong>Temples:</strong>\n";
        this.kb.quickFacts.bestTemples.forEach(t => msg += `• ${t}\n`);
        msg += "\n🏖️ <strong>Beaches:</strong>\n";
        this.kb.quickFacts.bestBeaches.forEach(b => msg += `• ${b}\n`);
        msg += "\n⛰️ <strong>Hill Stations:</strong>\n";
        this.kb.quickFacts.bestHillStations.forEach(h => msg += `• ${h}\n`);

        return { message: msg, quickReplies: ['Temple tour', 'Beach destinations', 'Hill stations'] };
    }

    handleWeatherQuery(input) {
        const cityInfo = this.findCityInfo(input);

        if (cityInfo && cityInfo.weather) {
            let msg = `🌤️ <strong>Weather in ${cityInfo.name}</strong>\n\n`;
            msg += `☀️ Summer: ${cityInfo.weather.summer}\n`;
            msg += `❄️ Winter: ${cityInfo.weather.winter}\n`;
            if (cityInfo.weather.monsoon) msg += `🌧️ Monsoon: ${cityInfo.weather.monsoon}\n`;
            msg += `\n🗓️ <strong>Best Time to Visit:</strong> ${cityInfo.bestTimeToVisit}`;
            return { message: msg, quickReplies: [`Hotels in ${cityInfo.name}`, `Things to do in ${cityInfo.name}`] };
        }

        // General weather info
        let msg = "🌤️ <strong>Best Time to Visit Tamil Nadu</strong>\n\n";
        msg += "🏖️ <strong>Beaches & Plains:</strong> October - March\n";
        msg += "⛰️ <strong>Hill Stations:</strong> April - June\n";
        msg += "🛕 <strong>Temple Towns:</strong> October - February\n";
        msg += "🌧️ <strong>Monsoon:</strong> July - September\n\n";
        msg += "<em>💡 Pro tip: Hill stations are perfect to escape summer heat!</em>";

        return { message: msg, quickReplies: ['Ooty weather', 'Chennai weather', 'Kodaikanal weather'] };
    }

    handleFoodQuery(input) {
        const cityInfo = this.findCityInfo(input);
        const cityKey = cityInfo ? Object.keys(this.kb?.tamilNadu || {}).find(k => this.kb.tamilNadu[k] === cityInfo) : null;

        if (this.kb && cityKey && this.kb.quickFacts.mustTryFood[cityKey]) {
            const foods = this.kb.quickFacts.mustTryFood[cityKey];
            let msg = `🍽️ <strong>Must Try Food in ${cityInfo.name}</strong>\n\n`;
            foods.forEach(food => msg += `• ${food}\n`);
            if (cityInfo.specialities) {
                msg += `\n🎁 <strong>Famous For:</strong>\n`;
                cityInfo.specialities.forEach(s => msg += `• ${s}\n`);
            }
            return { message: msg, quickReplies: [`Hotels in ${cityInfo.name}`, 'Other cities food'] };
        }

        // General Tamil Nadu food
        let msg = "🍽️ <strong>Tamil Nadu Cuisine Highlights</strong>\n\n";
        msg += "☕ <strong>Chennai:</strong> Filter Coffee, Idli-Dosa, Chettinad Chicken\n";
        msg += "🥤 <strong>Madurai:</strong> Jigarthanda (must try!), Kari Dosa\n";
        msg += "🍫 <strong>Ooty:</strong> Homemade Chocolates, Varkey\n";
        msg += "🥐 <strong>Pondicherry:</strong> French Pastries, Seafood\n\n";
        msg += "<em>Don't miss: Chettinad cuisine - India's spiciest!</em>";

        return { message: msg, quickReplies: ['Chennai food', 'Madurai food', 'Find restaurants'] };
    }

    handlePriceQuery(input) {
        const cityInfo = this.findCityInfo(input);

        if (cityInfo && cityInfo.priceRange) {
            let msg = `💰 <strong>Hotel Prices in ${cityInfo.name}</strong>\n\n`;
            msg += `🏠 Budget: ${cityInfo.priceRange.budget}/night\n`;
            msg += `🏨 Mid-Range: ${cityInfo.priceRange.midRange}/night\n`;
            msg += `🏰 Luxury: ${cityInfo.priceRange.luxury}/night\n`;
            return { message: msg, quickReplies: [`Budget hotels in ${cityInfo.name}`, `Luxury hotels in ${cityInfo.name}`] };
        }

        // Get actual price range from database
        const hotels = this.getSafeHotels();
        if (hotels.length > 0) {
            const prices = hotels.map(h => h.pricePerNight || 0).filter(p => p > 0);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

            let msg = `💰 <strong>Hotel Prices at LuxeStay</strong>\n\n`;
            msg += `📉 Starting from: <strong>₹${minPrice.toLocaleString()}</strong>/night\n`;
            msg += `📊 Average: <strong>₹${avgPrice.toLocaleString()}</strong>/night\n`;
            msg += `📈 Luxury: up to <strong>₹${maxPrice.toLocaleString()}</strong>/night\n\n`;
            msg += "💡 <em>Use filters to find hotels in your budget!</em>";

            return { message: msg, quickReplies: ['Budget hotels', 'Luxury hotels', 'Best deals'] };
        }

        return { message: "Our hotels range from ₹1,500 to ₹25,000+ per night. What's your budget?", quickReplies: ['Under ₹3000', '₹3000-₹7000', 'Above ₹7000'] };
    }

    handleHotelCount(input) {
        const city = this.findCityInInput(input);
        const hotels = this.getSafeHotels();
        
        if (city) {
            const cityHotels = hotels.filter(h => 
                h.city && h.city.toLowerCase().includes(city.toLowerCase())
            );
            return {
                message: `🏨 We have <strong>${cityHotels.length} hotels</strong> in ${city}!`,
                quickReplies: [`Show hotels in ${city}`, `Best hotels in ${city}`],
                hotels: cityHotels.slice(0, 2)
            };
        }

        const cityCounts = {};
        hotels.forEach(h => {
            if (h.city) {
                cityCounts[h.city] = (cityCounts[h.city] || 0) + 1;
            }
        });

        let msg = `🏨 <strong>Total Hotels: ${hotels.length}</strong>\n\n`;
        msg += "📍 By City:\n";
        Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).forEach(([city, count]) => {
            msg += `• ${city}: ${count} hotels\n`;
        });

        return { message: msg, quickReplies: this.getSafeCities(4).map(c => `Hotels in ${c}`) };
    }

    async handleHotelSearch(city, input) {
        if (!city) {
            return {
                message: "Which city would you like to find hotels in? 🏨",
                quickReplies: this.getSafeCities(5).map(c => `Hotels in ${c}`)
            };
        }

        this.conversationContext.lastCity = city;
        const hotels = this.getSafeHotels();

        const matchingHotels = hotels.filter(h => 
            h.city && h.city.toLowerCase().includes(city.toLowerCase())
        );

        if (matchingHotels.length > 0) {
            const sorted = matchingHotels.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            let msg = `🏨 Found <strong>${matchingHotels.length} hotels</strong> in ${city}!\n\n`;
            msg += `⭐ Showing top rated options:`;
            
            return {
                message: msg,
                hotels: sorted.slice(0, 3),
                quickReplies: ['Show more', `Budget hotels in ${city}`, 'View on map']
            };
        }

        // City info from knowledge base
        const cityInfo = this.findCityInfo(city.toLowerCase());
        if (cityInfo) {
            return {
                message: `${city} is a beautiful destination! ${cityInfo.description}\n\n🏨 Check our hotels page for availability.`,
                quickReplies: [`About ${city}`, 'All hotels', 'Other cities']
            };
        }

        return {
            message: `I don't have hotels listed in ${city} yet. Would you like to explore these cities instead?`,
            quickReplies: this.getSafeCities(4).map(c => `Hotels in ${c}`)
        };
    }

    async handleLuxurySearch(input) {
        const city = this.findCityInInput(input);
        const hotels = this.getSafeHotels();
        let luxuryHotels = hotels.filter(h => 
            (h.rating && h.rating >= 4.5) || (h.pricePerNight && h.pricePerNight >= 8000)
        );

        if (city) {
            luxuryHotels = luxuryHotels.filter(h => 
                h.city && h.city.toLowerCase().includes(city.toLowerCase())
            );
        }

        luxuryHotels.sort((a, b) => (b.rating || 0) - (a.rating || 0));

        if (luxuryHotels.length > 0) {
            return {
                message: `✨ <strong>Luxury Hotels${city ? ` in ${city}` : ''}</strong>\n\nOur finest properties with world-class amenities:`,
                hotels: luxuryHotels.slice(0, 3),
                quickReplies: ['Show more luxury', 'Mid-range options', 'View amenities']
            };
        }

        return {
            message: "Our luxury collection features 5-star amenities including pools, spas, fine dining, and personalized service.",
            quickReplies: ['All hotels', 'Best rated', 'City search']
        };
    }

    async handleBudgetSearch(input) {
        const city = this.findCityInInput(input);
        
        // Check for specific price in input
        let maxPrice = 5000;
        const priceMatch = input.match(/under\s*₹?\s*(\d+)/i) || input.match(/below\s*₹?\s*(\d+)/i);
        if (priceMatch) maxPrice = parseInt(priceMatch[1]);

        const hotels = this.getSafeHotels();
        let budgetHotels = hotels.filter(h => 
            h.pricePerNight && h.pricePerNight <= maxPrice
        );

        if (city) {
            budgetHotels = budgetHotels.filter(h => 
                h.city && h.city.toLowerCase().includes(city.toLowerCase())
            );
        }

        budgetHotels.sort((a, b) => (a.pricePerNight || 0) - (b.pricePerNight || 0));

        if (budgetHotels.length > 0) {
            return {
                message: `💰 <strong>Budget-Friendly Hotels${city ? ` in ${city}` : ''}</strong>\n\nGreat value under ₹${maxPrice.toLocaleString()}/night:`,
                hotels: budgetHotels.slice(0, 3),
                quickReplies: ['Under ₹3000', 'Under ₹5000', 'Show more']
            };
        }

        return {
            message: `Looking for budget stays? Our affordable options start from ₹1,500/night with all essential amenities.`,
            quickReplies: ['All hotels', 'Chennai budget', 'Ooty budget']
        };
    }

    handleBeachSearch() {
        const beachDestinations = this.kb?.quickFacts?.bestBeaches || [
            'Marina Beach, Chennai', 'Paradise Beach, Pondicherry', 'Mahabalipuram Beach'
        ];

        let msg = "🏖️ <strong>Best Beach Destinations</strong>\n\n";
        beachDestinations.forEach(beach => msg += `• ${beach}\n`);
        msg += "\n🌊 <em>Perfect for: Relaxation, water sports, sunrise/sunset views</em>";

        return {
            message: msg,
            quickReplies: ['Hotels in Pondicherry', 'Hotels in Mahabalipuram', 'Coastal resorts']
        };
    }

    handleHillStationSearch(input) {
        const hillStations = this.kb?.quickFacts?.bestHillStations || ['Ooty', 'Kodaikanal', 'Yelagiri'];
        
        let msg = "⛰️ <strong>Tamil Nadu Hill Stations</strong>\n\n";
        
        if (this.kb) {
            const hillData = [
                { name: 'Ooty', alt: '2,240m', temp: '15-25°C' },
                { name: 'Kodaikanal', alt: '2,133m', temp: '11-20°C' },
                { name: 'Yelagiri', alt: '1,100m', temp: '18-28°C' }
            ];
            hillData.forEach(h => {
                msg += `🏔️ <strong>${h.name}</strong>\n   Altitude: ${h.alt} | Temp: ${h.temp}\n\n`;
            });
        }

        msg += "🌿 <em>Escape the heat with misty mountains & tea gardens!</em>";

        return {
            message: msg,
            quickReplies: ['Hotels in Ooty', 'Hotels in Kodaikanal', 'Distance to Ooty']
        };
    }

    handleTempleSearch() {
        const temples = this.kb?.quickFacts?.bestTemples || [
            'Meenakshi Temple, Madurai', 'Brihadeeswara Temple, Thanjavur'
        ];

        let msg = "🛕 <strong>Famous Tamil Nadu Temples</strong>\n\n";
        temples.forEach(temple => msg += `• ${temple}\n`);
        msg += "\n📿 <em>Tamil Nadu has the richest Dravidian temple architecture!</em>";

        return {
            message: msg,
            quickReplies: ['Hotels in Madurai', 'Hotels in Thanjavur', 'Temple tour package']
        };
    }

    handlePackages() {
        if (!this.kb?.packages) {
            return {
                message: "We offer temple tours, hill station escapes, and coastal heritage packages. Which interests you?",
                quickReplies: ['Temple tour', 'Hill stations', 'Beach trip']
            };
        }

        let msg = "🎫 <strong>Popular Tour Packages</strong>\n\n";
        for (const key in this.kb.packages) {
            const pkg = this.kb.packages[key];
            msg += `📍 <strong>${pkg.name}</strong>\n`;
            msg += `   Duration: ${pkg.duration}\n`;
            msg += `   Cities: ${pkg.cities.slice(0, 3).join(' → ')}\n\n`;
        }

        return { message: msg, quickReplies: ['Temple trail details', 'Hill station package', 'Contact for booking'] };
    }

    handleTamilNaduQuery(input) {
        let msg = "🌴 <strong>Tamil Nadu - Land of Temples</strong>\n\n";
        msg += "Tamil Nadu offers diverse experiences:\n\n";
        msg += "🛕 <strong>Temples:</strong> Madurai, Thanjavur, Rameswaram\n";
        msg += "🏖️ <strong>Beaches:</strong> Chennai, Pondicherry, Mahabalipuram\n";
        msg += "⛰️ <strong>Hills:</strong> Ooty, Kodaikanal, Yelagiri\n";
        msg += "🏛️ <strong>Heritage:</strong> Mahabalipuram, Thanjavur\n\n";
        msg += `📊 We have <strong>${this.getSafeHotels().length} hotels</strong> across ${this.getSafeCities(100).length} cities!`;

        return {
            message: msg,
            quickReplies: ['Best destinations', 'Hotels by city', 'Travel tips']
        };
    }

    handleRomanticQuery() {
        const honeymoonSpots = this.kb?.quickFacts?.bestForHoneymoon || ['Ooty', 'Kodaikanal', 'Pondicherry'];

        let msg = "💕 <strong>Romantic Getaways</strong>\n\n";
        msg += "Perfect for couples:\n\n";
        honeymoonSpots.forEach(spot => msg += `❤️ ${spot}\n`);
        msg += "\n✨ <em>Features: Scenic views, privacy, candlelit dinners, couple spa</em>";

        return {
            message: msg,
            quickReplies: honeymoonSpots.slice(0, 3).map(s => `Hotels in ${s}`)
        };
    }

    handleFamilyQuery() {
        const familySpots = this.kb?.quickFacts?.bestForFamily || ['Chennai', 'Ooty', 'Mahabalipuram'];

        let msg = "👨‍👩‍👧‍👦 <strong>Family-Friendly Destinations</strong>\n\n";
        msg += "Great for families with kids:\n\n";
        familySpots.forEach(spot => msg += `🏠 ${spot}\n`);
        msg += "\n🎢 <em>Features: Kid activities, safe beaches, theme parks</em>";

        return {
            message: msg,
            quickReplies: familySpots.slice(0, 3).map(s => `Hotels in ${s}`)
        };
    }

    handleBookingHelp() {
        return {
            message: "📅 <strong>How to Book</strong>\n\n1️⃣ Search hotels by destination\n2️⃣ Select your dates\n3️⃣ Choose room type\n4️⃣ Complete payment\n\n✅ Instant confirmation\n💳 Secure payments\n❌ Free cancellation (48hrs)",
            quickReplies: ['Find hotels', 'My bookings', 'Contact support']
        };
    }

    handleAllHotels() {
        const hotels = this.getSafeHotels();
        const sorted = [...hotels].sort((a, b) => (b.rating || 0) - (a.rating || 0));

        return {
            message: `🏨 We have <strong>${hotels.length} hotels</strong> available!\n\nHere are our top-rated properties:`,
            hotels: sorted.slice(0, 3),
            quickReplies: ['Filter by city', 'Budget options', 'Luxury hotels']
        };
    }

    handleUnknownQuery(input) {
        return {
            message: `I'm not sure about that, but I can help you with:\n\n🏨 <strong>Hotels</strong> - Find & book hotels\n📍 <strong>Destinations</strong> - Tamil Nadu cities\n📏 <strong>Distances</strong> - City to city\n🌤️ <strong>Weather</strong> - Best time to visit\n🍽️ <strong>Food</strong> - Local specialties\n\nTry asking: "Hotels in Chennai" or "Distance from Chennai to Ooty"`,
            quickReplies: ['Hotels in Chennai', 'Tamil Nadu destinations', 'Help']
        };
    }

    handleQuickReply(value) {
        this.input.value = value;
        this.handleUserInput();
    }

    handleHotelClick(hotelId) {
        if (hotelId) window.location.href = `hotel-detail.html?id=${hotelId}`;
    }

    startVoiceInput() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.addBotMessage("Voice input not supported. Please type your message.");
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-IN';
        recognition.interimResults = false;

        this.voiceBtn.innerHTML = '<i class="fas fa-circle" style="color: red;"></i>';
        recognition.start();

        recognition.onresult = (event) => {
            this.input.value = event.results[0][0].transcript;
            this.handleUserInput();
        };

        recognition.onend = () => {
            this.voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        };

        recognition.onerror = () => {
            this.voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            this.addBotMessage("Couldn't hear you. Please try again or type your message.");
        };
    }

    clearChat() {
        this.messagesContainer.innerHTML = '';
        this.conversationContext = { lastIntent: null, searchCriteria: {}, userName: null, lastCity: null };
        this.showWelcomeMessage();
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }

    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.luxeStayChatbot = new LuxeStayChatbot();
    }, 500);
});
