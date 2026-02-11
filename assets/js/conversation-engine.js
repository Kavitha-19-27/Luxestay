/**
 * LuxeStay Conversation Engine v2.0
 * Unified intelligence layer for Chatbot and Voice Assistant
 * 
 * Features:
 * - Multi-turn context tracking
 * - Natural language understanding
 * - Action-oriented responses
 * - Shared state between chat & voice
 * - Smart follow-ups and booking flow
 */

class ConversationEngine {
    constructor() {
        // Define states BEFORE loadContext() since createFreshContext() needs it
        // Conversation state machine
        this.states = {
            IDLE: 'idle',
            SEARCHING: 'searching',
            BROWSING_RESULTS: 'browsing_results',
            VIEWING_HOTEL: 'viewing_hotel',
            SELECTING_ROOM: 'selecting_room',
            BOOKING: 'booking',
            CONFIRMATION: 'confirmation'
        };
        
        // Intent categories for smarter routing
        this.intentPatterns = {
            // Greetings
            GREETING: /^(hi|hello|hey|good\s*(morning|afternoon|evening)|namaste|howdy)$/i,
            
            // Hotel Search
            HOTEL_SEARCH: /(hotels?|stay|accommodation|place to stay|lodging)\s*(in|at|near|around)?/i,
            LUXURY_SEARCH: /(luxury|premium|5\s*star|five star|best|top rated|high end|boutique)/i,
            BUDGET_SEARCH: /(budget|cheap|affordable|economical|low cost|under|below|within)\s*₹?\d*/i,
            
            // Specific Actions
            BOOK_NOW: /(book|reserve|confirm|i('ll| will)? (take|book)|let's book|book (this|it|the))/i,
            SHOW_MORE: /(show more|more options|other|another|different|next|alternatives)/i,
            SHOW_DETAILS: /(details?|more about|tell me about|info|information|describe)\s*(this|it|the|first|second|third)?/i,
            COMPARE: /(compare|difference|vs|versus|which is better)/i,
            
            // Context References
            REFERENCE_PREVIOUS: /(this|that|it|the one|first one|second one|last one|previous)/i,
            
            // Location & Distance
            DISTANCE_QUERY: /(how far|distance|km|kilometers|far is|from.*to)/i,
            CITY_INFO: /(about|tell me|what is|describe|info)\s*(chennai|madurai|coimbatore|ooty|kodaikanal|pondicherry|mahabalipuram|trichy|thanjavur|kanyakumari|rameswaram|yelagiri)/i,
            
            // Travel Planning
            ATTRACTIONS: /(attractions?|places? to (visit|see)|things to do|sightseeing|tourist|what to see)/i,
            WEATHER: /(weather|climate|best time|when to visit|temperature|hot|cold|rainy)/i,
            FOOD: /(food|eat|restaurant|cuisine|specialty|must try|famous dish)/i,
            
            // Booking Flow
            SELECT_DATES: /(date|when|check.?in|check.?out|from|to|nights?|days?)/i,
            SELECT_GUESTS: /(guest|people|adults?|kids?|children|family|couple|solo)/i,
            SELECT_ROOM: /(room|suite|deluxe|standard|premium|which room)/i,
            
            // Help & Navigation
            HELP: /(help|what can you|how do i|guide|assist)/i,
            NAVIGATION: /(go to|take me|show|open|navigate)/i,
            
            // Conversation
            THANKS: /(thank|thanks|great|perfect|awesome|wonderful)/i,
            CANCEL: /(cancel|nevermind|forget it|stop|no thanks)/i,
            YES_CONFIRM: /^(yes|yeah|yep|sure|ok|okay|go ahead|confirm|proceed|do it)$/i,
            NO_DECLINE: /^(no|nope|nah|not now|later|maybe later)$/i
        };
        
        // Load context AFTER states and intentPatterns are defined
        this.context = this.loadContext();
        this.hotels = [];
        this.cities = [];
        this.kb = typeof CHATBOT_KNOWLEDGE !== 'undefined' ? CHATBOT_KNOWLEDGE : null;
        
        this.init();
    }
    
    async init() {
        await this.loadData();
    }
    
    /**
     * Load/persist context from sessionStorage
     */
    loadContext() {
        try {
            const saved = sessionStorage.getItem('luxestay_conversation');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Check if context is stale (> 30 minutes)
                if (parsed.timestamp && Date.now() - parsed.timestamp < 30 * 60 * 1000) {
                    return parsed;
                }
            }
        } catch (e) {
            // Console logging removed for production
        }
        
        return this.createFreshContext();
    }
    
    createFreshContext() {
        return {
            sessionId: this.generateId(),
            timestamp: Date.now(),
            state: this.states.IDLE,
            
            // Search criteria
            searchCity: null,
            checkInDate: null,
            checkOutDate: null,
            guests: { adults: 2, children: 0 },
            budget: { min: null, max: null, preference: null }, // preference: 'budget' | 'midrange' | 'luxury'
            
            // Current view/results
            lastResults: [], // Hotels shown
            lastResultType: null, // 'hotels' | 'rooms' | 'bookings'
            selectedHotel: null,
            selectedRoom: null,
            
            // Conversation memory
            lastIntent: null,
            lastQuery: null,
            pendingAction: null, // What we're waiting for user to confirm
            followUpSuggested: null,
            
            // User preferences (learned)
            preferences: {
                preferredCities: [],
                priceRange: null,
                amenities: []
            },
            
            // Conversation history (last 5 turns)
            history: []
        };
    }
    
    saveContext() {
        this.context.timestamp = Date.now();
        sessionStorage.setItem('luxestay_conversation', JSON.stringify(this.context));
    }
    
    /**
     * Load hotels and cities from database
     */
    async loadData() {
        try {
            const baseUrl = this.getApiBaseUrl();
            
            // Load hotels
            const hotelsRes = await fetch(`${baseUrl}/hotels`);
            if (hotelsRes.ok) {
                const data = await hotelsRes.json();
                this.hotels = data.data?.content || data.data || data.content || data || [];
            }
            
            // Load cities
            const citiesRes = await fetch(`${baseUrl}/hotels/cities`);
            if (citiesRes.ok) {
                const data = await citiesRes.json();
                this.cities = data.data || data || [];
            }
            
            // Console logging removed for production
        } catch (e) {
            // Console logging removed for production
        }
    }
    
    /**
     * Main entry point - process user input
     * Returns structured response for UI to render
     */
    async process(input, source = 'chat') {
        const query = input.trim();
        if (!query) return this.createResponse('How can I help you today?', ['Find hotels', 'Travel tips']);
        
        // Add to history
        this.addToHistory('user', query);
        
        // Detect intent
        const intent = this.detectIntent(query);
        this.context.lastIntent = intent;
        this.context.lastQuery = query;
        
        // Extract entities (city, dates, budget, etc.)
        this.extractEntities(query);
        
        // Route to handler based on intent
        let response;
        
        switch (intent) {
            case 'GREETING':
                response = this.handleGreeting();
                break;
            case 'HOTEL_SEARCH':
            case 'LUXURY_SEARCH':
            case 'BUDGET_SEARCH':
                response = await this.handleHotelSearch(query, intent);
                break;
            case 'DISTANCE_QUERY':
                response = this.handleDistanceQuery(query);
                break;
            case 'CITY_INFO':
                response = this.handleCityInfo(query);
                break;
            case 'ATTRACTIONS':
                response = this.handleAttractions(query);
                break;
            case 'WEATHER':
                response = this.handleWeather(query);
                break;
            case 'FOOD':
                response = this.handleFood(query);
                break;
            case 'SHOW_MORE':
                response = await this.handleShowMore();
                break;
            case 'SHOW_DETAILS':
                response = await this.handleShowDetails(query);
                break;
            case 'BOOK_NOW':
                response = await this.handleBookNow(query);
                break;
            case 'SELECT_DATES':
                response = this.handleDateSelection(query);
                break;
            case 'SELECT_GUESTS':
                response = this.handleGuestSelection(query);
                break;
            case 'YES_CONFIRM':
                response = await this.handleConfirmation();
                break;
            case 'NO_DECLINE':
                response = this.handleDecline();
                break;
            case 'THANKS':
                response = this.handleThanks();
                break;
            case 'HELP':
                response = this.handleHelp();
                break;
            case 'CANCEL':
                response = this.handleCancel();
                break;
            default:
                response = await this.handleDefault(query);
        }
        
        // Add to history
        this.addToHistory('assistant', response.message);
        
        // Save context
        this.saveContext();
        
        return response;
    }
    
    /**
     * Detect primary intent from query
     */
    detectIntent(query) {
        const lower = query.toLowerCase();
        
        // Check for pending action confirmations first
        if (this.context.pendingAction) {
            if (this.intentPatterns.YES_CONFIRM.test(lower)) return 'YES_CONFIRM';
            if (this.intentPatterns.NO_DECLINE.test(lower)) return 'NO_DECLINE';
        }
        
        // Check patterns in priority order
        const priorityOrder = [
            'GREETING', 'BOOK_NOW', 'YES_CONFIRM', 'NO_DECLINE',
            'SHOW_MORE', 'SHOW_DETAILS', 'COMPARE',
            'DISTANCE_QUERY', 'CITY_INFO', 'ATTRACTIONS', 'WEATHER', 'FOOD',
            'LUXURY_SEARCH', 'BUDGET_SEARCH', 'HOTEL_SEARCH',
            'SELECT_DATES', 'SELECT_GUESTS', 'SELECT_ROOM',
            'HELP', 'THANKS', 'CANCEL', 'NAVIGATION'
        ];
        
        for (const intent of priorityOrder) {
            if (this.intentPatterns[intent] && this.intentPatterns[intent].test(lower)) {
                return intent;
            }
        }
        
        // Check if it's just a city name
        const city = this.extractCity(query);
        if (city) return 'HOTEL_SEARCH';
        
        return 'UNKNOWN';
    }
    
    /**
     * Extract entities from query
     */
    extractEntities(query) {
        const lower = query.toLowerCase();
        
        // Extract city
        const city = this.extractCity(query);
        if (city) {
            this.context.searchCity = city;
            this.updatePreference('city', city);
        }
        
        // Extract dates
        const dates = this.extractDates(query);
        if (dates.checkIn) this.context.checkInDate = dates.checkIn;
        if (dates.checkOut) this.context.checkOutDate = dates.checkOut;
        
        // Extract budget
        const budget = this.extractBudget(query);
        if (budget) {
            this.context.budget = { ...this.context.budget, ...budget };
        }
        
        // Extract guests
        const guests = this.extractGuests(query);
        if (guests) {
            this.context.guests = { ...this.context.guests, ...guests };
        }
    }
    
    /**
     * Extract city from query
     */
    extractCity(query) {
        const lower = query.toLowerCase();
        
        // Check loaded cities
        for (const city of this.cities) {
            if (lower.includes(city.toLowerCase())) return city;
        }
        
        // Check knowledge base cities
        if (this.kb?.tamilNadu) {
            for (const key of Object.keys(this.kb.tamilNadu)) {
                if (lower.includes(key)) return this.kb.tamilNadu[key].name;
            }
        }
        
        // Common aliases
        const aliases = {
            'trichy': 'Trichy', 'pondy': 'Pondicherry', 'puducherry': 'Pondicherry',
            'bengaluru': 'Bangalore', 'bombay': 'Mumbai', 'mamalla': 'Mahabalipuram'
        };
        for (const [alias, city] of Object.entries(aliases)) {
            if (lower.includes(alias)) return city;
        }
        
        return null;
    }
    
    /**
     * Extract dates from natural language
     */
    extractDates(query) {
        const lower = query.toLowerCase();
        const today = new Date();
        const result = { checkIn: null, checkOut: null };
        
        // "today" / "tonight"
        if (/today|tonight/.test(lower)) {
            result.checkIn = this.formatDate(today);
            result.checkOut = this.formatDate(this.addDays(today, 1));
        }
        
        // "tomorrow"
        if (/tomorrow/.test(lower)) {
            result.checkIn = this.formatDate(this.addDays(today, 1));
            result.checkOut = this.formatDate(this.addDays(today, 2));
        }
        
        // "this weekend"
        if (/this weekend/.test(lower)) {
            const saturday = this.getNextWeekday(today, 6); // Saturday
            result.checkIn = this.formatDate(saturday);
            result.checkOut = this.formatDate(this.addDays(saturday, 2)); // Sunday night checkout Monday
        }
        
        // "next weekend"
        if (/next weekend/.test(lower)) {
            const nextSaturday = this.addDays(this.getNextWeekday(today, 6), 7);
            result.checkIn = this.formatDate(nextSaturday);
            result.checkOut = this.formatDate(this.addDays(nextSaturday, 2));
        }
        
        // "X nights" / "X days"
        const nightsMatch = lower.match(/(\d+)\s*(nights?|days?)/);
        if (nightsMatch && result.checkIn) {
            const nights = parseInt(nightsMatch[1]);
            result.checkOut = this.formatDate(this.addDays(new Date(result.checkIn), nights));
        }
        
        // Specific date formats: "Dec 25", "25th December", "25/12", etc.
        const datePatterns = [
            /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/, // 25/12 or 25-12-2024
            /(\d{1,2})(?:st|nd|rd|th)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
            /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{1,2})/i
        ];
        
        for (const pattern of datePatterns) {
            const match = lower.match(pattern);
            if (match) {
                const parsed = this.parseSpecificDate(match);
                if (parsed && !result.checkIn) {
                    result.checkIn = parsed;
                } else if (parsed && result.checkIn) {
                    result.checkOut = parsed;
                }
            }
        }
        
        return result;
    }
    
    parseSpecificDate(match) {
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        let day, month, year = new Date().getFullYear();
        
        if (match[0].includes('/') || match[0].includes('-')) {
            day = parseInt(match[1]);
            month = parseInt(match[2]) - 1;
            if (match[3]) year = match[3].length === 2 ? 2000 + parseInt(match[3]) : parseInt(match[3]);
        } else {
            day = parseInt(match[1]) || parseInt(match[2]);
            const monthStr = (match[2] || match[1]).toLowerCase().slice(0, 3);
            month = months.indexOf(monthStr);
        }
        
        if (day && month >= 0) {
            const date = new Date(year, month, day);
            if (date < new Date()) {
                date.setFullYear(date.getFullYear() + 1); // Assume next year if past
            }
            return this.formatDate(date);
        }
        return null;
    }
    
    /**
     * Extract budget from query
     */
    extractBudget(query) {
        const lower = query.toLowerCase();
        
        // "under ₹5000" / "below 5000" / "within 5k"
        const maxMatch = lower.match(/(?:under|below|within|less than|max(?:imum)?)\s*₹?\s*(\d+)k?/);
        if (maxMatch) {
            let max = parseInt(maxMatch[1]);
            if (maxMatch[1].includes('k') || max < 100) max *= 1000;
            return { max, preference: max <= 3000 ? 'budget' : 'midrange' };
        }
        
        // "above ₹8000" / "over 8000" / "minimum 8k"
        const minMatch = lower.match(/(?:above|over|more than|min(?:imum)?|at least)\s*₹?\s*(\d+)k?/);
        if (minMatch) {
            let min = parseInt(minMatch[1]);
            if (minMatch[1].includes('k') || min < 100) min *= 1000;
            return { min, preference: min >= 8000 ? 'luxury' : 'midrange' };
        }
        
        // Budget keywords
        if (/budget|cheap|affordable|economical/.test(lower)) {
            return { max: 3500, preference: 'budget' };
        }
        if (/luxury|premium|5\s*star|high.?end/.test(lower)) {
            return { min: 8000, preference: 'luxury' };
        }
        if (/mid.?range|moderate|reasonable/.test(lower)) {
            return { min: 3500, max: 8000, preference: 'midrange' };
        }
        
        return null;
    }
    
    /**
     * Extract guest count from query
     */
    extractGuests(query) {
        const lower = query.toLowerCase();
        
        // "2 adults and 1 child"
        const adultMatch = lower.match(/(\d+)\s*adults?/);
        const childMatch = lower.match(/(\d+)\s*(?:children|child|kids?)/);
        
        if (adultMatch || childMatch) {
            return {
                adults: adultMatch ? parseInt(adultMatch[1]) : 2,
                children: childMatch ? parseInt(childMatch[1]) : 0
            };
        }
        
        // "couple" / "family"
        if (/couple|honeymoon|romantic/.test(lower)) {
            return { adults: 2, children: 0 };
        }
        if (/family/.test(lower)) {
            return { adults: 2, children: 2 };
        }
        if (/solo|alone|single/.test(lower)) {
            return { adults: 1, children: 0 };
        }
        
        // "X people" / "X persons"
        const peopleMatch = lower.match(/(\d+)\s*(?:people|persons?|guests?)/);
        if (peopleMatch) {
            return { adults: parseInt(peopleMatch[1]), children: 0 };
        }
        
        return null;
    }
    
    // ============ Intent Handlers ============
    
    handleGreeting() {
        const hotelCount = this.hotels.length;
        const cityCount = this.cities.length;
        const timeGreeting = this.getTimeGreeting();
        
        const user = localStorage.getItem('luxestay_user');
        const userName = user ? JSON.parse(user).firstName : null;
        
        let message = `${timeGreeting}${userName ? `, ${userName}` : ''}! 👋\n\n`;
        message += `I'm your LuxeStay Concierge. I can help you:\n`;
        message += `• Find hotels across ${cityCount} cities\n`;
        message += `• Plan your Tamil Nadu trip\n`;
        message += `• Book rooms with the best prices\n`;
        message += `• Answer travel questions\n\n`;
        message += `What would you like to do?`;
        
        this.context.state = this.states.IDLE;
        
        return this.createResponse(message, [
            'Find hotels in Chennai',
            'Plan a weekend trip',
            'Best hill stations',
            'Help me decide where to go'
        ]);
    }
    
    async handleHotelSearch(query, intent) {
        const city = this.context.searchCity;
        const budget = this.context.budget;
        
        // If no city specified, ask
        if (!city) {
            const popularCities = this.cities.slice(0, 4);
            return this.createResponse(
                `Which city would you like to find hotels in? 🏨\n\nPopular destinations:`,
                popularCities.map(c => `Hotels in ${c}`),
                null,
                { needsCity: true }
            );
        }
        
        // Filter hotels
        let matchingHotels = this.hotels.filter(h => 
            h.city && h.city.toLowerCase().includes(city.toLowerCase())
        );
        
        // Apply budget filter
        if (intent === 'BUDGET_SEARCH' || budget.preference === 'budget') {
            const maxPrice = budget.max || 3500;
            matchingHotels = matchingHotels.filter(h => h.pricePerNight && h.pricePerNight <= maxPrice);
        } else if (intent === 'LUXURY_SEARCH' || budget.preference === 'luxury') {
            const minPrice = budget.min || 8000;
            matchingHotels = matchingHotels.filter(h => h.pricePerNight && h.pricePerNight >= minPrice);
        }
        
        // Sort by rating
        matchingHotels.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        
        // Store results in context
        this.context.lastResults = matchingHotels;
        this.context.lastResultType = 'hotels';
        this.context.state = this.states.BROWSING_RESULTS;
        
        if (matchingHotels.length === 0) {
            const cityInfo = this.getCityInfo(city);
            let message = `No hotels found in ${city}`;
            if (budget.preference) message += ` within your ${budget.preference} budget`;
            message += '.\n\n';
            
            if (cityInfo) {
                message += `${city} is a lovely destination though! ${cityInfo.description}\n\n`;
            }
            message += `Try these alternatives:`;
            
            return this.createResponse(message, [
                'Show all budgets',
                ...this.cities.slice(0, 3).map(c => `Hotels in ${c}`)
            ]);
        }
        
        // Build response
        const budgetLabel = intent === 'BUDGET_SEARCH' ? 'budget-friendly ' : 
                           intent === 'LUXURY_SEARCH' ? 'luxury ' : '';
        
        let message = `🏨 Found **${matchingHotels.length} ${budgetLabel}hotels** in ${city}!\n\n`;
        
        if (this.context.checkInDate) {
            message += `📅 Dates: ${this.formatDisplayDate(this.context.checkInDate)}`;
            if (this.context.checkOutDate) {
                message += ` - ${this.formatDisplayDate(this.context.checkOutDate)}`;
            }
            message += '\n\n';
        }
        
        message += `Here are the top picks:`;
        
        // Smart follow-up based on context
        const followUps = this.generateSmartFollowUps('hotels', matchingHotels, city);
        
        return this.createResponse(message, followUps, matchingHotels.slice(0, 3));
    }
    
    generateSmartFollowUps(resultType, results, city) {
        const suggestions = [];
        
        if (resultType === 'hotels' && results.length > 0) {
            // Primary action
            suggestions.push(`Details of ${results[0].name.substring(0, 20)}`);
            
            // Budget refinement
            if (!this.context.budget.preference) {
                const avgPrice = results.reduce((sum, h) => sum + (h.pricePerNight || 0), 0) / results.length;
                if (avgPrice > 5000) {
                    suggestions.push('Show budget options');
                } else {
                    suggestions.push('Show luxury options');
                }
            }
            
            // Date suggestion
            if (!this.context.checkInDate) {
                suggestions.push('Check for this weekend');
            }
            
            // More options
            if (results.length > 3) {
                suggestions.push('Show more options');
            }
        }
        
        return suggestions;
    }
    
    async handleShowMore() {
        if (!this.context.lastResults || this.context.lastResults.length <= 3) {
            return this.createResponse(
                "I don't have more results to show. Would you like to search for something else?",
                ['Search hotels', 'Popular destinations', 'Help']
            );
        }
        
        const results = this.context.lastResults;
        const shown = 3;
        const remaining = results.slice(shown, shown + 3);
        
        if (remaining.length === 0) {
            return this.createResponse(
                "That's all the options I have. Would you like to refine your search?",
                ['Adjust budget', 'Different city', 'Filter by amenities']
            );
        }
        
        let message = `Here are ${remaining.length} more options:\n`;
        
        return this.createResponse(message, [
            'Show even more',
            'Back to top picks',
            'Help me choose'
        ], remaining);
    }
    
    async handleShowDetails(query) {
        // Try to find which item user is referring to
        const itemIndex = this.parseItemReference(query);
        const results = this.context.lastResults || [];
        
        let hotel = null;
        
        if (itemIndex !== null && results[itemIndex]) {
            hotel = results[itemIndex];
        } else if (this.context.selectedHotel) {
            hotel = this.context.selectedHotel;
        } else if (results.length === 1) {
            hotel = results[0];
        } else if (results.length > 0) {
            hotel = results[0]; // Default to first
        }
        
        if (!hotel) {
            return this.createResponse(
                "Which hotel would you like to know more about? Let me show you some options first.",
                ['Find hotels', 'Popular in Chennai', 'Best rated']
            );
        }
        
        this.context.selectedHotel = hotel;
        this.context.state = this.states.VIEWING_HOTEL;
        
        // Build detailed response
        let message = `🏨 **${hotel.name}**\n`;
        message += `📍 ${hotel.city || 'Tamil Nadu'}, ${hotel.country || 'India'}\n`;
        message += `⭐ ${hotel.starRating || 4}-star • Rating: ${hotel.rating || 4.2}/5\n\n`;
        
        if (hotel.description) {
            message += `${hotel.description.substring(0, 150)}...\n\n`;
        }
        
        message += `💰 Starting from **₹${(hotel.pricePerNight || 3999).toLocaleString()}**/night\n\n`;
        
        if (hotel.amenities && hotel.amenities.length > 0) {
            message += `✨ Amenities: ${hotel.amenities.slice(0, 5).join(', ')}\n`;
        }
        
        // Set up booking flow
        this.context.pendingAction = 'book_hotel';
        this.context.followUpSuggested = 'Would you like to book this hotel?';
        
        message += `\n${this.context.followUpSuggested}`;
        
        return this.createResponse(message, [
            'Yes, book this hotel',
            'Show rooms & prices',
            'View on map',
            'Show more hotels'
        ], [hotel]);
    }
    
    parseItemReference(query) {
        const lower = query.toLowerCase();
        
        if (/first|1st|top|#1/.test(lower)) return 0;
        if (/second|2nd|#2/.test(lower)) return 1;
        if (/third|3rd|#3/.test(lower)) return 2;
        if (/fourth|4th|#4/.test(lower)) return 3;
        if (/last|final|bottom/.test(lower)) return this.context.lastResults?.length - 1 || 0;
        
        // Try to match hotel name
        const results = this.context.lastResults || [];
        for (let i = 0; i < results.length; i++) {
            if (results[i].name && lower.includes(results[i].name.toLowerCase())) {
                return i;
            }
        }
        
        return null;
    }
    
    async handleBookNow(query) {
        const hotel = this.context.selectedHotel || (this.context.lastResults && this.context.lastResults[0]);
        
        if (!hotel) {
            return this.createResponse(
                "I'd be happy to help you book! First, let's find the right hotel. Where would you like to stay?",
                this.cities.slice(0, 4).map(c => `Hotels in ${c}`)
            );
        }
        
        // Check if we have dates
        if (!this.context.checkInDate) {
            this.context.pendingAction = 'get_dates';
            return this.createResponse(
                `Great choice! **${hotel.name}** is wonderful.\n\nWhen would you like to check in? You can say things like:\n• "This weekend"\n• "Tomorrow for 2 nights"\n• "December 25th"`,
                ['This weekend', 'Tomorrow', 'Next week', 'Let me pick dates']
            );
        }
        
        // Ready to proceed
        this.context.state = this.states.BOOKING;
        
        const nights = this.calculateNights(this.context.checkInDate, this.context.checkOutDate);
        const totalPrice = (hotel.pricePerNight || 3999) * nights;
        
        let message = `📋 **Booking Summary**\n\n`;
        message += `🏨 ${hotel.name}\n`;
        message += `📅 ${this.formatDisplayDate(this.context.checkInDate)} - ${this.formatDisplayDate(this.context.checkOutDate)}\n`;
        message += `👥 ${this.context.guests.adults} adults`;
        if (this.context.guests.children > 0) message += `, ${this.context.guests.children} children`;
        message += `\n\n`;
        message += `💰 **Total: ₹${totalPrice.toLocaleString()}** (${nights} nights)\n\n`;
        message += `Ready to proceed to payment?`;
        
        this.context.pendingAction = 'confirm_booking';
        
        return this.createResponse(message, [
            'Yes, proceed to book',
            'Change dates',
            'See other rooms',
            'Cancel'
        ], [hotel], { 
            action: 'PREPARE_BOOKING',
            bookingData: {
                hotelId: hotel.id,
                checkIn: this.context.checkInDate,
                checkOut: this.context.checkOutDate,
                guests: this.context.guests,
                totalPrice
            }
        });
    }
    
    async handleConfirmation() {
        const action = this.context.pendingAction;
        this.context.pendingAction = null;
        
        switch (action) {
            case 'book_hotel':
                return this.handleBookNow('book');
            
            case 'confirm_booking':
                // Navigate to booking page
                const hotel = this.context.selectedHotel;
                if (hotel) {
                    const bookingUrl = `/booking.html?hotelId=${hotel.id}&checkIn=${this.context.checkInDate}&checkOut=${this.context.checkOutDate}`;
                    return this.createResponse(
                        `Excellent! Taking you to complete your booking... 🎉`,
                        [],
                        null,
                        { action: 'NAVIGATE', destination: bookingUrl }
                    );
                }
                break;
            
            case 'get_dates':
                // User confirmed without giving dates, show date picker
                return this.createResponse(
                    "Let me know your dates! When do you want to check in?",
                    ['This weekend', 'Tomorrow', 'Next weekend']
                );
        }
        
        // Generic confirmation
        return this.createResponse(
            "Great! What would you like to do next?",
            ['Find hotels', 'My bookings', 'Help']
        );
    }
    
    handleDecline() {
        this.context.pendingAction = null;
        
        return this.createResponse(
            "No problem! Let me know if you'd like to explore other options.",
            ['Show more hotels', 'Different destination', 'Help me decide']
        );
    }
    
    handleDateSelection(query) {
        const dates = this.extractDates(query);
        
        if (!dates.checkIn) {
            return this.createResponse(
                "I didn't catch the dates. You can say:\n• \"This weekend\"\n• \"December 25 to 28\"\n• \"Tomorrow for 3 nights\"",
                ['This weekend', 'Tomorrow', 'Pick specific dates']
            );
        }
        
        this.context.checkInDate = dates.checkIn;
        if (dates.checkOut) this.context.checkOutDate = dates.checkOut;
        
        const nights = this.calculateNights(this.context.checkInDate, this.context.checkOutDate);
        
        let message = `✅ Got it! ${this.formatDisplayDate(this.context.checkInDate)}`;
        if (this.context.checkOutDate) {
            message += ` - ${this.formatDisplayDate(this.context.checkOutDate)} (${nights} nights)`;
        }
        message += '\n\n';
        
        // Continue booking flow if we have a hotel
        if (this.context.selectedHotel) {
            return this.handleBookNow('continue');
        }
        
        // Otherwise, search for hotels
        if (this.context.searchCity) {
            message += `Let me find available hotels in ${this.context.searchCity}...`;
            return this.handleHotelSearch(query, 'HOTEL_SEARCH');
        }
        
        message += `Where would you like to stay?`;
        return this.createResponse(message, this.cities.slice(0, 4).map(c => `Hotels in ${c}`));
    }
    
    handleGuestSelection(query) {
        const guests = this.extractGuests(query);
        
        if (guests) {
            this.context.guests = guests;
            
            let message = `✅ ${guests.adults} adult${guests.adults > 1 ? 's' : ''}`;
            if (guests.children > 0) {
                message += ` and ${guests.children} child${guests.children > 1 ? 'ren' : ''}`;
            }
            message += ` - perfect!\n\n`;
            
            // Continue with booking or search
            if (this.context.selectedHotel && this.context.checkInDate) {
                return this.handleBookNow('continue');
            }
            
            message += `Now, which city would you like to explore?`;
            return this.createResponse(message, this.cities.slice(0, 4).map(c => `Hotels in ${c}`));
        }
        
        return this.createResponse(
            "How many guests will be staying? For example:\n• \"2 adults and 1 child\"\n• \"Just me\" (solo)\n• \"Family of 4\"",
            ['2 adults', 'Couple', 'Family', 'Solo traveler']
        );
    }
    
    handleDistanceQuery(query) {
        if (!this.kb?.distances) {
            return this.createResponse(
                "I can help with distances between Tamil Nadu cities! For example: \"Distance from Chennai to Ooty\"",
                ['Chennai to Madurai', 'Chennai to Ooty', 'Coimbatore to Ooty']
            );
        }
        
        const cities = [];
        const cityNames = Object.keys(this.kb.tamilNadu || {});
        
        for (const name of cityNames) {
            if (query.toLowerCase().includes(name)) {
                cities.push(name);
            }
        }
        
        // Also check common aliases
        const aliases = { 'trichy': 'trichy', 'pondy': 'pondicherry' };
        for (const [alias, city] of Object.entries(aliases)) {
            if (query.toLowerCase().includes(alias) && !cities.includes(city)) {
                cities.push(city);
            }
        }
        
        if (cities.length >= 2) {
            const key1 = `${cities[0]}-${cities[1]}`;
            const key2 = `${cities[1]}-${cities[0]}`;
            const distance = this.kb.distances[key1] || this.kb.distances[key2];
            const time = this.kb.travelTimes?.[key1] || this.kb.travelTimes?.[key2];
            
            if (distance) {
                const city1 = this.kb.tamilNadu[cities[0]]?.name || cities[0];
                const city2 = this.kb.tamilNadu[cities[1]]?.name || cities[1];
                
                let message = `📍 **${city1} ↔ ${city2}**\n\n`;
                message += `🚗 Distance: **${distance} km** by road\n`;
                if (time) message += `⏱️ Travel time: **${time}**\n`;
                message += `\n💡 Pro tip: Book your hotel in advance for the best rates!`;
                
                return this.createResponse(message, [
                    `Hotels in ${city1}`,
                    `Hotels in ${city2}`,
                    'Other distances'
                ]);
            }
        }
        
        // Show popular distances
        let message = `📏 **Distance Calculator**\n\nPopular routes:\n\n`;
        const routes = [
            ['Chennai', 'Madurai', 462],
            ['Chennai', 'Ooty', 560],
            ['Chennai', 'Pondicherry', 150],
            ['Coimbatore', 'Ooty', 86],
            ['Madurai', 'Kodaikanal', 120]
        ];
        routes.forEach(([c1, c2, d]) => {
            message += `• ${c1} ↔ ${c2}: **${d} km**\n`;
        });
        
        return this.createResponse(message, ['Chennai to Ooty', 'Madurai to Rameswaram', 'All distances']);
    }
    
    handleCityInfo(query) {
        const cityInfo = this.getCityInfoFromQuery(query);
        
        if (!cityInfo) {
            return this.createResponse(
                "Which city would you like to know about?",
                ['About Chennai', 'About Ooty', 'About Pondicherry', 'About Madurai']
            );
        }
        
        let message = `📍 **${cityInfo.name}** - ${cityInfo.type}\n\n`;
        message += `${cityInfo.description}\n\n`;
        
        if (cityInfo.bestTimeToVisit) {
            message += `🗓️ Best time: ${cityInfo.bestTimeToVisit}\n`;
        }
        if (cityInfo.altitude) {
            message += `⛰️ Altitude: ${cityInfo.altitude}\n`;
        }
        
        // Count hotels in this city
        const hotelCount = this.hotels.filter(h => 
            h.city && h.city.toLowerCase().includes(cityInfo.name.toLowerCase())
        ).length;
        
        if (hotelCount > 0) {
            message += `\n🏨 We have **${hotelCount} hotels** in ${cityInfo.name}`;
        }
        
        return this.createResponse(message, [
            `Hotels in ${cityInfo.name}`,
            `Attractions in ${cityInfo.name}`,
            `Weather in ${cityInfo.name}`
        ]);
    }
    
    handleAttractions(query) {
        const cityInfo = this.getCityInfoFromQuery(query);
        
        if (cityInfo && cityInfo.attractions) {
            let message = `🎯 **Top Attractions in ${cityInfo.name}**\n\n`;
            cityInfo.attractions.slice(0, 6).forEach((attr, i) => {
                message += `${i + 1}. ${attr}\n`;
            });
            
            if (cityInfo.activities) {
                message += `\n🎿 Activities: ${cityInfo.activities.join(', ')}`;
            }
            
            return this.createResponse(message, [
                `Hotels in ${cityInfo.name}`,
                `Food in ${cityInfo.name}`,
                'Other destinations'
            ]);
        }
        
        // General attractions
        let message = `🏛️ **Top Tamil Nadu Attractions**\n\n`;
        message += `🛕 **Temples:** Meenakshi (Madurai), Brihadeeswara (Thanjavur)\n`;
        message += `🏖️ **Beaches:** Marina (Chennai), Paradise (Pondicherry)\n`;
        message += `⛰️ **Hills:** Ooty, Kodaikanal, Yelagiri\n`;
        message += `🏛️ **Heritage:** Mahabalipuram, Thanjavur`;
        
        return this.createResponse(message, ['Temple tour', 'Beach destinations', 'Hill stations']);
    }
    
    handleWeather(query) {
        const cityInfo = this.getCityInfoFromQuery(query);
        
        if (cityInfo && cityInfo.weather) {
            let message = `🌤️ **Weather in ${cityInfo.name}**\n\n`;
            message += `☀️ Summer: ${cityInfo.weather.summer}\n`;
            message += `❄️ Winter: ${cityInfo.weather.winter}\n`;
            if (cityInfo.weather.monsoon) {
                message += `🌧️ Monsoon: ${cityInfo.weather.monsoon}\n`;
            }
            message += `\n🗓️ Best time: **${cityInfo.bestTimeToVisit}**`;
            
            return this.createResponse(message, [
                `Hotels in ${cityInfo.name}`,
                `Attractions in ${cityInfo.name}`,
                'Other cities weather'
            ]);
        }
        
        let message = `🌤️ **Best Time to Visit Tamil Nadu**\n\n`;
        message += `🏖️ Beaches & Plains: October - March\n`;
        message += `⛰️ Hill Stations: April - June\n`;
        message += `🛕 Temple Towns: October - February\n`;
        message += `\n💡 Hill stations are perfect to escape summer heat!`;
        
        return this.createResponse(message, ['Ooty weather', 'Chennai weather', 'Kodaikanal weather']);
    }
    
    handleFood(query) {
        const cityInfo = this.getCityInfoFromQuery(query);
        const cityKey = cityInfo ? this.getCityKey(cityInfo.name) : null;
        
        if (this.kb?.quickFacts?.mustTryFood && cityKey && this.kb.quickFacts.mustTryFood[cityKey]) {
            const foods = this.kb.quickFacts.mustTryFood[cityKey];
            let message = `🍽️ **Must Try Food in ${cityInfo.name}**\n\n`;
            foods.forEach(food => message += `• ${food}\n`);
            
            if (cityInfo.specialities) {
                message += `\n🎁 Famous for: ${cityInfo.specialities.slice(0, 3).join(', ')}`;
            }
            
            return this.createResponse(message, [
                `Hotels in ${cityInfo.name}`,
                `Attractions in ${cityInfo.name}`,
                'Other cities food'
            ]);
        }
        
        let message = `🍽️ **Tamil Nadu Cuisine**\n\n`;
        message += `☕ Chennai: Filter Coffee, Idli-Dosa, Chettinad\n`;
        message += `🥤 Madurai: Jigarthanda (must try!)\n`;
        message += `🍫 Ooty: Homemade Chocolates\n`;
        message += `🥐 Pondicherry: French Pastries\n\n`;
        message += `Don't miss: **Chettinad cuisine** - India's spiciest! 🌶️`;
        
        return this.createResponse(message, ['Chennai food', 'Madurai food', 'Find restaurants']);
    }
    
    handleThanks() {
        const responses = [
            "You're welcome! 😊 Anything else I can help with?",
            "Happy to help! Let me know if you need anything else.",
            "My pleasure! Is there anything else you'd like to know?"
        ];
        return this.createResponse(
            responses[Math.floor(Math.random() * responses.length)],
            ['Find hotels', 'Travel tips', 'Help']
        );
    }
    
    handleHelp() {
        let message = `🤝 **How I Can Help**\n\n`;
        message += `🏨 **Find Hotels**\n`;
        message += `"Hotels in Chennai" • "Budget stays in Ooty" • "Luxury resorts"\n\n`;
        message += `📅 **Book Smart**\n`;
        message += `"Book for this weekend" • "2 nights from tomorrow"\n\n`;
        message += `📍 **Travel Planning**\n`;
        message += `"Distance Chennai to Ooty" • "Best time to visit Kodaikanal"\n\n`;
        message += `🍽️ **Local Tips**\n`;
        message += `"Food in Madurai" • "Attractions in Pondicherry"\n\n`;
        message += `Try asking naturally - I understand casual language! 💬`;
        
        return this.createResponse(message, [
            'Find hotels',
            'Plan a trip',
            'Popular destinations'
        ]);
    }
    
    handleCancel() {
        this.context.pendingAction = null;
        this.context.state = this.states.IDLE;
        
        return this.createResponse(
            "No worries! I'm here whenever you need help. 🙂",
            ['Start fresh', 'Find hotels', 'Help']
        );
    }
    
    async handleDefault(query) {
        // Try to find any city reference
        const city = this.extractCity(query);
        if (city) {
            this.context.searchCity = city;
            return await this.handleHotelSearch(query, 'HOTEL_SEARCH');
        }
        
        // Check if it's about previous results
        if (this.context.lastResults && this.context.lastResults.length > 0) {
            const itemIndex = this.parseItemReference(query);
            if (itemIndex !== null) {
                return this.handleShowDetails(query);
            }
        }
        
        // Helpful fallback
        let message = `I'm not sure I understood that. Here's what I can help with:\n\n`;
        message += `🏨 **Hotels:** "Hotels in Chennai"\n`;
        message += `📍 **Destinations:** "About Ooty"\n`;
        message += `📏 **Distances:** "Chennai to Madurai distance"\n`;
        message += `🍽️ **Food & Tips:** "Food in Pondicherry"\n\n`;
        message += `What would you like to explore?`;
        
        return this.createResponse(message, [
            'Hotels in Chennai',
            'Best destinations',
            'Travel tips',
            'Help'
        ]);
    }
    
    // ============ Helpers ============
    
    createResponse(message, quickReplies = [], hotels = null, meta = null) {
        return {
            message,
            quickReplies,
            hotels: hotels || [],
            meta: meta || {},
            timestamp: new Date().toISOString(),
            context: {
                state: this.context.state,
                city: this.context.searchCity,
                dates: {
                    checkIn: this.context.checkInDate,
                    checkOut: this.context.checkOutDate
                }
            }
        };
    }
    
    getCityInfo(cityName) {
        if (!this.kb?.tamilNadu) return null;
        for (const key of Object.keys(this.kb.tamilNadu)) {
            if (this.kb.tamilNadu[key].name.toLowerCase() === cityName.toLowerCase()) {
                return this.kb.tamilNadu[key];
            }
        }
        return null;
    }
    
    getCityInfoFromQuery(query) {
        if (!this.kb?.tamilNadu) return null;
        const lower = query.toLowerCase();
        for (const key of Object.keys(this.kb.tamilNadu)) {
            if (lower.includes(key)) {
                return this.kb.tamilNadu[key];
            }
        }
        return null;
    }
    
    getCityKey(cityName) {
        if (!this.kb?.tamilNadu) return null;
        for (const key of Object.keys(this.kb.tamilNadu)) {
            if (this.kb.tamilNadu[key].name.toLowerCase() === cityName.toLowerCase()) {
                return key;
            }
        }
        return null;
    }
    
    getTimeGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    }
    
    updatePreference(type, value) {
        if (type === 'city') {
            const cities = this.context.preferences.preferredCities;
            if (!cities.includes(value)) {
                cities.unshift(value);
                if (cities.length > 5) cities.pop();
            }
        }
    }
    
    addToHistory(role, content) {
        this.context.history.push({ role, content: content.substring(0, 200), timestamp: Date.now() });
        if (this.context.history.length > 10) {
            this.context.history = this.context.history.slice(-10);
        }
    }
    
    // Date utilities
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    
    formatDisplayDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    
    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
    
    getNextWeekday(date, targetDay) {
        const result = new Date(date);
        const currentDay = result.getDay();
        const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
        result.setDate(result.getDate() + daysUntil);
        return result;
    }
    
    calculateNights(checkIn, checkOut) {
        if (!checkIn || !checkOut) return 1;
        const diff = new Date(checkOut) - new Date(checkIn);
        return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }
    
    getApiBaseUrl() {
        if (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) {
            return CONFIG.API_BASE_URL;
        }
        return 'https://luxestay-backend-1.onrender.com/api';
    }
    
    generateId() {
        return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Public method for voice/chat to check context
    getContext() {
        return { ...this.context };
    }
    
    // Public method to reset context
    reset() {
        this.context = this.createFreshContext();
        this.saveContext();
    }
}

// Create singleton instance
window.conversationEngine = window.conversationEngine || new ConversationEngine();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConversationEngine;
}
