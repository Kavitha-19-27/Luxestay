/**
 * Application Configuration
 * Central configuration for the LuxeStay application
 */

// Detect environment based on hostname
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname.includes('192.168.');

const CONFIG = {
    // API Configuration - automatically switches based on environment
    // Production URL points to Render backend
    API_BASE_URL: isLocalhost 
        ? 'http://localhost:8080/api' 
        : 'https://luxestay-backend-l.onrender.com/api',
    
    // Environment flag
    IS_PRODUCTION: !isLocalhost,
    
    // JWT Token Storage Key
    TOKEN_KEY: 'luxestay_token',
    USER_KEY: 'luxestay_user',
    
    // Default values
    DEFAULT_CURRENCY: 'INR',
    DEFAULT_CURRENCY_SYMBOL: '₹',
    
    // Pagination
    DEFAULT_PAGE_SIZE: 9,
    
    // Regions for filtering
    REGIONS: {
        'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Ooty', 'Kodaikanal', 'Pondicherry', 'Trichy', 'Kanyakumari', 'Mahabalipuram', 'Rameswaram', 'Thanjavur', 'Coonoor'],
        'International': ['New York', 'Miami', 'Chicago', 'Los Angeles', 'Las Vegas', 'Paris', 'London', 'Tokyo', 'Dubai', 'Sydney', 'Barcelona', 'Singapore', 'Rome', 'Maldives']
    },
    
    // Image placeholders
    PLACEHOLDER_HOTEL: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    PLACEHOLDER_ROOM: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
    PLACEHOLDER_USER: 'https://ui-avatars.com/api/?background=C9A962&color=fff',
    
    // Hotel images by name (fallback images)
    HOTEL_IMAGES: {
        'Aurora Grand Hotel': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        'Harbor View Suites': 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
        'Summit Alpine Lodge': 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
        'Seaside Paradise Resort': 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
        'Metropolitan Central Hotel': 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
        'Coastal Breeze Inn': 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800'
    },
    
    // Room images by type
    ROOM_IMAGES: {
        'STANDARD': 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
        'DELUXE': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
        'SUITE': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
        'FAMILY': 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800',
        'PRESIDENTIAL': 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800'
    },
    
    // City images
    CITY_IMAGES: {
        // Tamil Nadu Cities
        'Chennai': 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=600',
        'Coimbatore': 'https://images.unsplash.com/photo-1590077428593-a55bb07c4665?w=600',
        'Madurai': 'https://images.unsplash.com/photo-1548013146-72479768bada?w=600',
        'Ooty': 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600',
        'Kodaikanal': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600',
        'Pondicherry': 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=600',
        'Trichy': 'https://images.unsplash.com/photo-1590077428593-a55bb07c4665?w=600',
        'Kanyakumari': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600',
        'Mahabalipuram': 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600',
        'Rameswaram': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600',
        'Thanjavur': 'https://images.unsplash.com/photo-1590077428593-a55bb07c4665?w=600',
        'Coonoor': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600',
        
        // USA Cities
        'New York': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600',
        'Miami': 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=600',
        'Miami Beach': 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=600',
        'Chicago': 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=600',
        'San Diego': 'https://images.unsplash.com/photo-1538970272646-f61fabb3a8a2?w=600',
        'Los Angeles': 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=600',
        'Las Vegas': 'https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?w=600',
        'Aspen': 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600',
        'Sedona': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600',
        'Denver': 'https://images.unsplash.com/photo-1619856699906-09e1f58c98b1?w=600',
        'United States': 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=600',
        
        // Europe Cities
        'Paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600',
        'London': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600',
        'Rome': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600',
        'Barcelona': 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600',
        
        // Asia Cities
        'Tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600',
        'Singapore': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600',
        'Dubai': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600',
        
        // Australia/Oceania
        'Sydney': 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600',
        
        // Maldives
        'Maldives': 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=600',
        'Malé': 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=600',
        
        // India General
        'India': 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600'
    },
    
    // Amenity Icons
    AMENITY_ICONS: {
        'WiFi': 'fa-wifi',
        'Free WiFi': 'fa-wifi',
        'Pool': 'fa-swimming-pool',
        'Swimming Pool': 'fa-swimming-pool',
        'Infinity Pool': 'fa-swimming-pool',
        'Spa': 'fa-spa',
        'Spa & Wellness': 'fa-spa',
        'Gym': 'fa-dumbbell',
        'Fitness Center': 'fa-dumbbell',
        'Restaurant': 'fa-utensils',
        'Fine Dining': 'fa-utensils',
        'Bar': 'fa-glass-martini-alt',
        'Rooftop Bar': 'fa-glass-martini-alt',
        'Lounge': 'fa-couch',
        'Parking': 'fa-parking',
        'Valet Parking': 'fa-parking',
        'Room Service': 'fa-concierge-bell',
        '24/7 Room Service': 'fa-concierge-bell',
        'Concierge': 'fa-concierge-bell',
        'Concierge Service': 'fa-concierge-bell',
        'Business Center': 'fa-briefcase',
        'Conference Rooms': 'fa-users',
        'Meeting Rooms': 'fa-users',
        'Laundry': 'fa-tshirt',
        'Airport Shuttle': 'fa-shuttle-van',
        'Ski Access': 'fa-skiing',
        'Ski-in/Ski-out': 'fa-skiing',
        'Fireplace': 'fa-fire',
        'Hot Tub': 'fa-hot-tub',
        'Beach Access': 'fa-umbrella-beach',
        'Private Beach': 'fa-umbrella-beach',
        'Water Sports': 'fa-water',
        'Snorkeling': 'fa-water',
        'Scuba Diving': 'fa-water',
        'Pet Friendly': 'fa-paw',
        'Kids Club': 'fa-child',
        'Garden': 'fa-leaf',
        'Terrace': 'fa-mountain',
        'Ocean View': 'fa-water',
        'City View': 'fa-city',
        'Mountain View': 'fa-mountain',
        'Balcony': 'fa-door-open',
        'Kitchen': 'fa-blender',
        'Kitchenette': 'fa-blender',
        'Air Conditioning': 'fa-snowflake',
        'Heating': 'fa-temperature-high',
        'TV': 'fa-tv',
        'Flat-screen TV': 'fa-tv',
        'Safe': 'fa-lock',
        'Mini Bar': 'fa-glass-whiskey',
        'Coffee Maker': 'fa-coffee',
        'Hair Dryer': 'fa-wind',
        'Iron': 'fa-tshirt',
        'Desk': 'fa-desktop',
        'Work Desk': 'fa-desktop'
    },
    
    // Status Labels
    BOOKING_STATUS: {
        'PENDING': { label: 'Pending', class: 'badge-warning' },
        'CONFIRMED': { label: 'Confirmed', class: 'badge-success' },
        'CHECKED_IN': { label: 'Checked In', class: 'badge-info' },
        'CHECKED_OUT': { label: 'Completed', class: 'badge-success' },
        'CANCELLED': { label: 'Cancelled', class: 'badge-error' },
        'COMPLETED': { label: 'Completed', class: 'badge-info' },
        'NO_SHOW': { label: 'No Show', class: 'badge-error' }
    },
    
    // Room Types
    ROOM_TYPES: {
        'STANDARD': 'Standard Room',
        'DELUXE': 'Deluxe Room',
        'SUITE': 'Suite',
        'FAMILY': 'Family Room',
        'PRESIDENTIAL': 'Presidential Suite'
    }
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);

// Production-safe debug logging
// Wraps console methods and only outputs in development
const Debug = {
    log: (...args) => !CONFIG.IS_PRODUCTION && console.log('[LuxeStay]', ...args),
    warn: (...args) => !CONFIG.IS_PRODUCTION && console.warn('[LuxeStay]', ...args),
    error: (...args) => console.error('[LuxeStay Error]', ...args), // Always log errors
    info: (...args) => !CONFIG.IS_PRODUCTION && console.info('[LuxeStay]', ...args)
};

// Make Debug globally available
window.Debug = Debug;
