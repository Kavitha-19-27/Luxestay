/**
 * LuxeStay Chatbot Knowledge Base
 * Comprehensive data about cities, hotels, destinations, distances
 * Special focus on Tamil Nadu
 */

const CHATBOT_KNOWLEDGE = {
    // Tamil Nadu Cities with detailed information
    tamilNadu: {
        chennai: {
            name: "Chennai",
            type: "Metropolitan City",
            description: "Capital city of Tamil Nadu, known as the Gateway to South India",
            population: "7.1 million",
            bestTimeToVisit: "November to February",
            weather: {
                summer: "35-42°C (Hot & Humid)",
                winter: "20-28°C (Pleasant)",
                monsoon: "July-November"
            },
            attractions: [
                "Marina Beach - World's second longest urban beach",
                "Kapaleeshwarar Temple - Ancient Dravidian architecture",
                "Fort St. George - Historic British fort",
                "Government Museum - One of India's oldest museums",
                "VGP Universal Kingdom - Amusement park",
                "Guindy National Park - Urban wildlife sanctuary",
                "San Thome Cathedral - Historic church",
                "Elliot's Beach (Besant Nagar)"
            ],
            neighborhoods: ["T. Nagar", "Adyar", "Anna Nagar", "Velachery", "OMR", "ECR", "Nungambakkam"],
            airports: ["Chennai International Airport (MAA)"],
            specialities: ["Filter Coffee", "Idli-Sambar", "Chettinad Cuisine", "Silk Sarees"],
            hotelAreas: ["OMR (IT Corridor)", "ECR (Beach Road)", "T. Nagar", "Egmore", "Anna Salai"],
            priceRange: { budget: "₹1,500-3,000", midRange: "₹3,000-7,000", luxury: "₹7,000-25,000" }
        },
        madurai: {
            name: "Madurai",
            type: "Temple City",
            description: "One of the oldest continuously inhabited cities, cultural capital of Tamil Nadu",
            population: "1.5 million",
            bestTimeToVisit: "October to March",
            weather: {
                summer: "32-40°C",
                winter: "20-30°C",
                monsoon: "September-November"
            },
            attractions: [
                "Meenakshi Amman Temple - Iconic temple with 14 gopurams",
                "Thirumalai Nayakkar Palace - 17th century palace",
                "Gandhi Memorial Museum",
                "Alagar Kovil - Vishnu temple in hills",
                "Vandiyur Mariamman Teppakulam - Temple tank",
                "Koodal Azhagar Temple"
            ],
            specialities: ["Jigarthanda", "Madurai Malli (Jasmine)", "Banana varieties", "Temple cuisine"],
            priceRange: { budget: "₹1,000-2,500", midRange: "₹2,500-5,000", luxury: "₹5,000-12,000" }
        },
        coimbatore: {
            name: "Coimbatore",
            type: "Industrial City",
            description: "Manchester of South India, gateway to Ooty and hill stations",
            population: "2.1 million",
            bestTimeToVisit: "September to March",
            weather: {
                summer: "28-38°C",
                winter: "18-28°C",
                monsoon: "June-September"
            },
            attractions: [
                "Isha Yoga Center - Dhyanalinga",
                "Marudamalai Temple",
                "VOC Park and Zoo",
                "Brookefields Mall",
                "Siruvani Waterfalls",
                "Kovai Kutralam Falls"
            ],
            nearbyHillStations: ["Ooty (86 km)", "Coonoor (75 km)", "Valparai (100 km)"],
            specialities: ["Coimbatore Wet Grinders", "Textile Industry", "Engineering goods"],
            priceRange: { budget: "₹1,200-2,500", midRange: "₹2,500-5,500", luxury: "₹5,500-15,000" }
        },
        trichy: {
            name: "Tiruchirappalli (Trichy)",
            type: "Historic City",
            description: "Rock Fort city with rich Chola heritage",
            population: "1 million",
            bestTimeToVisit: "October to March",
            attractions: [
                "Rockfort Temple - Iconic rock-cut temple",
                "Sri Ranganathaswamy Temple - Largest functioning Hindu temple",
                "Jambukeswarar Temple",
                "Kallanai Dam - Ancient dam by Karikala Chola",
                "St. Joseph's Church"
            ],
            specialities: ["Trichy Malai Peda", "Wooden toys", "Handloom"],
            priceRange: { budget: "₹1,000-2,000", midRange: "₹2,000-4,500", luxury: "₹4,500-10,000" }
        },
        ooty: {
            name: "Ooty (Udhagamandalam)",
            type: "Hill Station",
            description: "Queen of Hill Stations in the Nilgiri Mountains",
            altitude: "2,240 meters",
            bestTimeToVisit: "April to June, September to November",
            weather: {
                summer: "15-25°C",
                winter: "5-15°C",
                monsoon: "Heavy rainfall July-August"
            },
            attractions: [
                "Ooty Lake - Boating paradise",
                "Botanical Gardens - 55 acres of exotic plants",
                "Nilgiri Mountain Railway - UNESCO World Heritage",
                "Doddabetta Peak - Highest point in Nilgiris",
                "Rose Garden - 20,000+ varieties",
                "Pykara Lake & Falls",
                "Tea Museum",
                "Thread Garden"
            ],
            activities: ["Boating", "Trekking", "Tea estate visits", "Toy train ride"],
            specialities: ["Homemade chocolates", "Eucalyptus oil", "Varkey (cookies)", "Ooty cheese"],
            priceRange: { budget: "₹1,500-3,500", midRange: "₹3,500-8,000", luxury: "₹8,000-25,000" }
        },
        kodaikanal: {
            name: "Kodaikanal",
            type: "Hill Station",
            description: "Princess of Hill Stations with pristine lakes and forests",
            altitude: "2,133 meters",
            bestTimeToVisit: "April to June, September to October",
            weather: {
                summer: "11-20°C",
                winter: "8-17°C"
            },
            attractions: [
                "Kodaikanal Lake - Star-shaped lake",
                "Coaker's Walk - Scenic promenade",
                "Bryant Park - Beautiful garden",
                "Pillar Rocks - Three granite pillars",
                "Silver Cascade Falls",
                "Green Valley View (Suicide Point)",
                "Bear Shola Falls",
                "Pine Forest"
            ],
            activities: ["Cycling around lake", "Horse riding", "Trekking", "Boating"],
            specialities: ["Homemade chocolates", "Eucalyptus products", "Fresh fruits"],
            priceRange: { budget: "₹1,500-3,000", midRange: "₹3,000-7,000", luxury: "₹7,000-20,000" }
        },
        pondicherry: {
            name: "Pondicherry (Puducherry)",
            type: "Union Territory",
            description: "French colonial heritage, spiritual retreat destination",
            bestTimeToVisit: "October to March",
            weather: {
                summer: "30-40°C",
                winter: "22-32°C"
            },
            attractions: [
                "Promenade Beach - French Quarter",
                "Auroville - International township",
                "Sri Aurobindo Ashram",
                "Paradise Beach",
                "French Quarter (White Town)",
                "Matrimandir",
                "Basilica of the Sacred Heart",
                "Pondicherry Museum"
            ],
            activities: ["Scuba diving", "Surfing", "Cycling in French Quarter", "Meditation retreats"],
            specialities: ["French cuisine", "Cafes", "Handicrafts", "Auroville products"],
            priceRange: { budget: "₹1,500-3,000", midRange: "₹3,000-7,000", luxury: "₹7,000-18,000" }
        },
        mahabalipuram: {
            name: "Mahabalipuram",
            type: "Heritage Town",
            description: "UNESCO World Heritage Site with ancient rock-cut temples",
            bestTimeToVisit: "November to February",
            attractions: [
                "Shore Temple - 8th century temple by the sea",
                "Pancha Rathas - Five monolithic chariots",
                "Arjuna's Penance - Giant rock relief",
                "Krishna's Butter Ball - Balancing boulder",
                "Tiger Cave",
                "Crocodile Farm"
            ],
            distanceFromChennai: "60 km",
            activities: ["Beach activities", "Stone carving workshops", "Heritage walks"],
            priceRange: { budget: "₹1,500-3,000", midRange: "₹3,000-8,000", luxury: "₹8,000-20,000" }
        },
        thanjavur: {
            name: "Thanjavur (Tanjore)",
            type: "Temple City",
            description: "Cultural capital of ancient Cholas, UNESCO heritage",
            attractions: [
                "Brihadeeswara Temple - UNESCO World Heritage",
                "Thanjavur Royal Palace",
                "Saraswathi Mahal Library",
                "Art Gallery"
            ],
            specialities: ["Thanjavur paintings", "Thanjavur dolls", "Bronze sculptures"],
            priceRange: { budget: "₹1,000-2,500", midRange: "₹2,500-5,000", luxury: "₹5,000-10,000" }
        },
        kanyakumari: {
            name: "Kanyakumari",
            type: "Coastal Town",
            description: "Southernmost tip of India where three seas meet",
            attractions: [
                "Vivekananda Rock Memorial",
                "Thiruvalluvar Statue",
                "Kanyakumari Temple",
                "Sunrise & Sunset point",
                "Gandhi Memorial",
                "Padmanabhapuram Palace"
            ],
            specialities: ["Sunrise & sunset view", "Shell crafts", "Spices"],
            priceRange: { budget: "₹1,200-2,500", midRange: "₹2,500-5,000", luxury: "₹5,000-12,000" }
        },
        rameswaram: {
            name: "Rameswaram",
            type: "Pilgrimage Town",
            description: "One of the Char Dham pilgrimage sites",
            attractions: [
                "Ramanathaswamy Temple - 22 sacred wells",
                "Pamban Bridge - Engineering marvel",
                "Dhanushkodi - Ghost town",
                "Gandamadana Parvatham",
                "Adam's Bridge viewpoint"
            ],
            specialities: ["Sacred temple visits", "Seashells", "Dried fish"],
            priceRange: { budget: "₹800-2,000", midRange: "₹2,000-4,000", luxury: "₹4,000-8,000" }
        },
        yelagiri: {
            name: "Yelagiri",
            type: "Hill Station",
            description: "Peaceful hill station perfect for weekend getaways",
            altitude: "1,100 meters",
            distanceFromChennai: "228 km",
            attractions: [
                "Yelagiri Lake",
                "Punganoor Lake Park",
                "Swamimalai Hills",
                "Jalagamparai Waterfalls",
                "Velavan Temple"
            ],
            activities: ["Trekking", "Paragliding", "Nature walks"],
            priceRange: { budget: "₹1,200-2,500", midRange: "₹2,500-5,000", luxury: "₹5,000-10,000" }
        }
    },

    // Distances between major Tamil Nadu cities (in km)
    distances: {
        "chennai-madurai": 462,
        "chennai-coimbatore": 505,
        "chennai-trichy": 332,
        "chennai-ooty": 560,
        "chennai-kodaikanal": 528,
        "chennai-pondicherry": 150,
        "chennai-mahabalipuram": 60,
        "chennai-thanjavur": 350,
        "chennai-kanyakumari": 705,
        "chennai-rameswaram": 573,
        "chennai-yelagiri": 228,
        "madurai-coimbatore": 220,
        "madurai-kodaikanal": 120,
        "madurai-rameswaram": 174,
        "madurai-kanyakumari": 242,
        "madurai-thanjavur": 130,
        "coimbatore-ooty": 86,
        "coimbatore-kodaikanal": 170,
        "trichy-thanjavur": 56,
        "trichy-madurai": 130,
        "pondicherry-mahabalipuram": 95,
        "ooty-coonoor": 19,
        "ooty-kodaikanal": 255
    },

    // Travel times (approximate by road)
    travelTimes: {
        "chennai-madurai": "7-8 hours",
        "chennai-coimbatore": "8-9 hours",
        "chennai-trichy": "5-6 hours",
        "chennai-ooty": "10-11 hours",
        "chennai-kodaikanal": "9-10 hours",
        "chennai-pondicherry": "2.5-3 hours",
        "chennai-mahabalipuram": "1-1.5 hours",
        "chennai-kanyakumari": "12-14 hours",
        "madurai-kodaikanal": "2.5-3 hours",
        "coimbatore-ooty": "2.5-3 hours"
    },

    // Hotel categories and what to expect
    hotelCategories: {
        budget: {
            priceRange: "₹1,000 - ₹3,500/night",
            amenities: ["WiFi", "AC", "TV", "Attached bathroom", "Room service"],
            typical: "Clean rooms, basic amenities, good for short stays"
        },
        midRange: {
            priceRange: "₹3,500 - ₹8,000/night",
            amenities: ["WiFi", "AC", "Restaurant", "Room service", "Parking", "Laundry", "Travel desk"],
            typical: "Comfortable rooms, good restaurants, helpful staff"
        },
        luxury: {
            priceRange: "₹8,000 - ₹20,000/night",
            amenities: ["Pool", "Spa", "Gym", "Multiple restaurants", "Bar", "Concierge", "Airport transfer", "Business center"],
            typical: "Premium rooms, world-class dining, personalized service"
        },
        ultraLuxury: {
            priceRange: "₹20,000+/night",
            amenities: ["Private pool", "Butler service", "Helipad", "Private beach/garden", "Celebrity chef restaurants", "Luxury spa"],
            typical: "Palatial suites, bespoke experiences, exclusive locations"
        }
    },

    // Popular travel packages
    packages: {
        "temple-trail": {
            name: "Tamil Nadu Temple Trail",
            duration: "7-8 days",
            cities: ["Chennai", "Mahabalipuram", "Thanjavur", "Trichy", "Madurai", "Rameswaram"],
            highlights: ["Ancient Dravidian temples", "UNESCO heritage sites", "Chola architecture"],
            bestFor: "History & spirituality lovers"
        },
        "hill-station-escape": {
            name: "Hill Station Escape",
            duration: "5-6 days",
            cities: ["Coimbatore", "Ooty", "Coonoor", "Kodaikanal"],
            highlights: ["Cool climate", "Tea gardens", "Scenic beauty", "Nature trails"],
            bestFor: "Nature lovers, families, honeymoons"
        },
        "coastal-heritage": {
            name: "Coastal Heritage Tour",
            duration: "4-5 days",
            cities: ["Chennai", "Mahabalipuram", "Pondicherry"],
            highlights: ["Beaches", "French architecture", "Stone sculptures", "Seafood"],
            bestFor: "Weekend getaways, culture enthusiasts"
        },
        "southern-tip": {
            name: "Southern Tip Adventure",
            duration: "6-7 days",
            cities: ["Madurai", "Rameswaram", "Kanyakumari"],
            highlights: ["Three seas meet", "Pamban bridge", "Historic temples"],
            bestFor: "Pilgrimage, unique experiences"
        }
    },

    // Seasonal recommendations
    seasons: {
        "jan-feb": {
            weather: "Pleasant winter",
            recommended: ["All destinations", "Beach towns", "Temple towns"],
            festivals: ["Pongal (January)", "Float Festival Madurai"]
        },
        "mar-may": {
            weather: "Hot summer",
            recommended: ["Hill stations (Ooty, Kodaikanal, Yelagiri)"],
            avoid: ["Coastal areas", "Temple towns (very hot)"]
        },
        "jun-sep": {
            weather: "Monsoon season",
            recommended: ["Hill stations", "Coimbatore"],
            note: "Heavy rains in ghats, waterfalls at best"
        },
        "oct-dec": {
            weather: "Post-monsoon, pleasant",
            recommended: ["All destinations"],
            festivals: ["Diwali", "Karthigai Deepam", "Chennai Music Season"]
        }
    },

    // Quick facts for responses
    quickFacts: {
        bestBeaches: ["Marina Beach (Chennai)", "Paradise Beach (Pondicherry)", "Mahabalipuram Beach", "Kanyakumari Beach"],
        bestTemples: ["Meenakshi Temple (Madurai)", "Brihadeeswara Temple (Thanjavur)", "Ramanathaswamy Temple (Rameswaram)", "Shore Temple (Mahabalipuram)"],
        bestHillStations: ["Ooty", "Kodaikanal", "Yelagiri", "Coonoor", "Valparai"],
        bestForHoneymoon: ["Ooty", "Kodaikanal", "Pondicherry", "Mahabalipuram"],
        bestForFamily: ["Chennai", "Ooty", "Mahabalipuram", "Yelagiri"],
        bestForSolo: ["Pondicherry", "Kodaikanal", "Chennai"],
        bestForWeekend: ["Pondicherry", "Mahabalipuram", "Yelagiri"],
        mustTryFood: {
            chennai: ["Filter Coffee", "Idli-Dosa", "Chettinad Chicken", "Kothu Parotta"],
            madurai: ["Jigarthanda", "Kari Dosa", "Parotta Salna"],
            coimbatore: ["Annapoorna Sweets", "Kari Dosai"],
            ooty: ["Varkey", "Homemade Chocolates", "Fresh Strawberries"],
            pondicherry: ["French Pastries", "Crepes", "Seafood Platters"]
        }
    },

    // Common queries and responses
    faqs: {
        "best time to visit tamil nadu": "October to March is ideal for most of Tamil Nadu. For hill stations like Ooty & Kodaikanal, April-June (summer) is perfect to escape the heat.",
        "is tamil nadu safe for tourists": "Yes! Tamil Nadu is one of the safest states in India for tourists. People are friendly, and tourist police are available in major destinations.",
        "languages spoken": "Tamil is the primary language. English is widely understood in cities and tourist areas. Hindi is understood in hotels and tourist spots.",
        "currency and payments": "Indian Rupee (INR). UPI, credit/debit cards accepted in most hotels. Carry cash for small towns and local markets.",
        "dress code for temples": "Modest clothing required. Many temples require removing footwear. Some temples don't allow non-Hindus in certain areas."
    }
};

// Export for use in chatbot
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CHATBOT_KNOWLEDGE;
}
