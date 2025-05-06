require('dotenv').config();
const mongoose = require('mongoose');
const Location = require('../src/models/Location');

// Sample locations data
const locationsData = [
  {
    name: 'Sigiriya Rock Fortress',
    description: 'Sigiriya, also known as the Lion Rock, is an ancient rock fortress and palace ruin situated in the central Matale District of Sri Lanka. It is surrounded by the remains of an extensive network of gardens, reservoirs, and other structures. Sigiriya was built by King Kasyapa (477–495 AD) and is a UNESCO World Heritage Site.',
    shortDescription: 'Ancient rock fortress with stunning views and remarkable frescoes',
    type: 'historical',
    category: 'culture',
    tags: ['UNESCO', 'ancient', 'fortress', 'palace', 'archaeological', 'cultural triangle'],
    address: {
      city: 'Dambulla',
      state: 'Central Province',
      country: 'Sri Lanka',
    },
    location: {
      type: 'Point',
      coordinates: [80.7602, 7.9570], // [longitude, latitude]
      elevation: 349, // In meters
    },
    images: [
      {
        url: 'https://example.com/sigiriya1.jpg',
        caption: 'Aerial view of Sigiriya Rock',
        isMain: true,
      },
      {
        url: 'https://example.com/sigiriya2.jpg',
        caption: 'Ancient frescoes',
      },
    ],
    openingHours: {
      monday: { isOpen: true, open: '07:00', close: '17:30' },
      tuesday: { isOpen: true, open: '07:00', close: '17:30' },
      wednesday: { isOpen: true, open: '07:00', close: '17:30' },
      thursday: { isOpen: true, open: '07:00', close: '17:30' },
      friday: { isOpen: true, open: '07:00', close: '17:30' },
      saturday: { isOpen: true, open: '07:00', close: '17:30' },
      sunday: { isOpen: true, open: '07:00', close: '17:30' },
      notes: 'Last entry at 17:00. Closed on public holidays.',
    },
    contactInfo: {
      phone: '+94 66 2286 000',
      email: 'info@sigiriya.lk',
      website: 'http://www.sigiriya.lk',
    },
    entranceFee: {
      localPrice: 50,
      foreignerPrice: 30,
      currency: 'USD',
      notes: 'Children under 6 enter free. Student discounts available with ID.',
    },
    estimatedTimeToVisit: {
      min: 180, // 3 hours
      max: 300, // 5 hours
    },
    bestTimeToVisit: {
      seasons: ['dry'],
      months: ['january', 'february', 'march', 'august', 'september'],
      timeOfDay: ['morning', 'evening'],
      notes: 'Avoid midday heat and monsoon season (April-July).',
    },
    accessibility: {
      wheelchairAccessible: false,
      publicTransportAccess: true,
      roadConditions: 'good',
      notes: 'Climbing the rock requires physical fitness. The site includes many steps.',
    },
    facilities: ['parking', 'restrooms', 'food', 'drinkingWater', 'shops', 'guides'],
    culturalSignificance: 'Sigiriya represents a masterpiece of ancient urban planning, architecture, and hydraulic engineering. The site contains important remnants of 5th century urban culture, architecture, and art.',
    historicalInfo: 'Built by King Kasyapa (477–495 AD) who sought a more secure capital after seizing power from his father. After his death, it was converted to a Buddhist monastery until the 14th century.',
    activities: ['hiking', 'photography', 'guided tours', 'birdwatching'],
    isVerified: true,
    isFeatured: true,
    averageRating: 4.8,
    reviewCount: 1245,
    visitsCount: 5008,
  },
  {
    name: 'Galle Fort',
    description: 'Galle Fort, in the Bay of Galle on the southwest coast of Sri Lanka, was built first in 1588 by the Portuguese, then extensively fortified by the Dutch during the 17th century. It is a historical, archaeological and architectural heritage monument, which even after more than 423 years maintains a polished appearance, due to extensive reconstruction work done by Archaeological Department of Sri Lanka.',
    shortDescription: 'Colonial-era fort with charming streets and ocean views',
    type: 'historical',
    category: 'culture',
    tags: ['UNESCO', 'colonial', 'fort', 'Dutch', 'Portuguese', 'coastal'],
    address: {
      city: 'Galle',
      state: 'Southern Province',
      country: 'Sri Lanka',
    },
    location: {
      type: 'Point',
      coordinates: [80.2170, 6.0300], // [longitude, latitude]
    },
    images: [
      {
        url: 'https://example.com/galle1.jpg',
        caption: 'Aerial view of Galle Fort',
        isMain: true,
      },
      {
        url: 'https://example.com/galle2.jpg',
        caption: 'Colonial architecture',
      },
    ],
    openingHours: {
      monday: { isOpen: true, open: '00:00', close: '00:00' }, // Open 24 hours
      tuesday: { isOpen: true, open: '00:00', close: '00:00' },
      wednesday: { isOpen: true, open: '00:00', close: '00:00' },
      thursday: { isOpen: true, open: '00:00', close: '00:00' },
      friday: { isOpen: true, open: '00:00', close: '00:00' },
      saturday: { isOpen: true, open: '00:00', close: '00:00' },
      sunday: { isOpen: true, open: '00:00', close: '00:00' },
      notes: 'The fort area is always accessible, but individual attractions inside have varying hours.',
    },
    entranceFee: {
      localPrice: 0,
      foreignerPrice: 0,
      currency: 'LKR',
      notes: 'Free to enter the fort area. Museums and attractions inside may have separate entry fees.',
    },
    estimatedTimeToVisit: {
      min: 180, // 3 hours
      max: 480, // 8 hours
    },
    bestTimeToVisit: {
      seasons: ['dry'],
      months: ['january', 'february', 'december'],
      timeOfDay: ['morning', 'evening'],
      notes: 'Early morning or late afternoon for comfortable temperatures and good lighting for photography.',
    },
    accessibility: {
      wheelchairAccessible: true,
      publicTransportAccess: true,
      roadConditions: 'excellent',
      notes: 'The main streets are accessible, but some smaller alleys may be challenging for wheelchairs.',
    },
    facilities: ['parking', 'restrooms', 'food', 'drinkingWater', 'shops', 'guides', 'wifi'],
    culturalSignificance: 'The fort represents the European colonial powers that ruled Sri Lanka over three centuries, and the strategic importance of the island in the Indian Ocean trade routes.',
    historicalInfo: 'Originally built by the Portuguese in the 16th century and then fortified by the Dutch in the 17th century. It remained an important colonial outpost until the British took control in 1796.',
    activities: ['walking tours', 'shopping', 'dining', 'photography', 'museum visits'],
    isVerified: true,
    isFeatured: true,
    averageRating: 4.7,
    reviewCount: 982,
    visitsCount: 4200,
  },
  {
    name: 'Temple of the Sacred Tooth Relic (Sri Dalada Maligawa)',
    description: 'The Temple of the Sacred Tooth Relic is a Buddhist temple in the city of Kandy, Sri Lanka. It is located in the royal palace complex of the former Kingdom of Kandy, which houses the relic of the tooth of the Buddha. Since ancient times, the relic has played an important role in local politics because it is believed that whoever holds the relic holds the governance of the country.',
    shortDescription: 'Temple housing Buddha\'s tooth relic, a significant Buddhist pilgrimage site',
    type: 'temple',
    category: 'culture',
    tags: ['UNESCO', 'Buddhism', 'religious', 'pilgrimage', 'sacred', 'Kandy'],
    address: {
      city: 'Kandy',
      state: 'Central Province',
      country: 'Sri Lanka',
    },
    location: {
      type: 'Point',
      coordinates: [80.6412, 7.2938], // [longitude, latitude]
    },
    images: [
      {
        url: 'https://example.com/tooth-temple1.jpg',
        caption: 'Exterior of the Sacred Tooth Temple',
        isMain: true,
      },
      {
        url: 'https://example.com/tooth-temple2.jpg',
        caption: 'Ritual offerings',
      },
    ],
    openingHours: {
      monday: { isOpen: true, open: '05:30', close: '20:00' },
      tuesday: { isOpen: true, open: '05:30', close: '20:00' },
      wednesday: { isOpen: true, open: '05:30', close: '20:00' },
      thursday: { isOpen: true, open: '05:30', close: '20:00' },
      friday: { isOpen: true, open: '05:30', close: '20:00' },
      saturday: { isOpen: true, open: '05:30', close: '20:00' },
      sunday: { isOpen: true, open: '05:30', close: '20:00' },
      notes: 'Puja (offering) ceremonies at 05:30, 09:30, and 18:30 daily.',
    },
    entranceFee: {
      localPrice: 0,
      foreignerPrice: 1500,
      currency: 'LKR',
      notes: 'Free for Sri Lankans. Cultural triangle ticket also valid.',
    },
    estimatedTimeToVisit: {
      min: 60, // 1 hour
      max: 180, // 3 hours
    },
    bestTimeToVisit: {
      timeOfDay: ['morning'],
      notes: 'Visit during a puja ceremony for the full experience. August is special for the Esala Perahera festival.',
    },
    accessibility: {
      wheelchairAccessible: true,
      publicTransportAccess: true,
      roadConditions: 'good',
    },
    facilities: ['parking', 'restrooms', 'food', 'shops'],
    culturalSignificance: 'One of the most sacred Buddhist sites in Sri Lanka and a major pilgrimage destination. The temple symbolizes the importance of Buddhism in Sri Lankan culture and identity.',
    historicalInfo: 'The temple was built within the royal palace complex during the Kandyan period (1687–1707), but the tooth relic has a much longer history dating back to ancient times.',
    activities: ['worship', 'guided tours', 'cultural experience', 'photography'],
    isVerified: true,
    isFeatured: true,
    averageRating: 4.6,
    reviewCount: 756,
    visitsCount: 3800,
  },
  {
    name: 'Yala National Park',
    description: 'Yala National Park is the most visited and second largest national park in Sri Lanka. The park consists of five blocks, two of which are now open to the public, and adjoining parks. It is situated in the southeast region of the country, and lies in Southern Province and Uva Province. The park covers 979 square kilometres (378 sq mi) and is located about 300 kilometres (190 mi) from Colombo. Yala is famous for its rich biodiversity and high density of leopards.',
    shortDescription: 'Wildlife sanctuary with the highest density of leopards in the world',
    type: 'wildlife',
    category: 'nature',
    tags: ['safari', 'wildlife', 'leopards', 'elephants', 'birds', 'natural'],
    address: {
      city: 'Tissamaharama',
      state: 'Southern Province',
      country: 'Sri Lanka',
    },
    location: {
      type: 'Point',
      coordinates: [81.4215, 6.3733], // [longitude, latitude]
    },
    images: [
      {
        url: 'https://example.com/yala1.jpg',
        caption: 'Sri Lankan leopard at Yala',
        isMain: true,
      },
      {
        url: 'https://example.com/yala2.jpg',
        caption: 'Elephants near a water hole',
      },
    ],
    openingHours: {
      monday: { isOpen: true, open: '06:00', close: '18:00' },
      tuesday: { isOpen: true, open: '06:00', close: '18:00' },
      wednesday: { isOpen: true, open: '06:00', close: '18:00' },
      thursday: { isOpen: true, open: '06:00', close: '18:00' },
      friday: { isOpen: true, open: '06:00', close: '18:00' },
      saturday: { isOpen: true, open: '06:00', close: '18:00' },
      sunday: { isOpen: true, open: '06:00', close: '18:00' },
      notes: 'Safari vehicles typically enter at 06:00 for morning safari or 14:00 for afternoon safari.',
    },
    entranceFee: {
      localPrice: 60,
      foreignerPrice: 15,
      currency: 'USD',
      notes: 'Additional charges for vehicles and service fees. Prices per person per day.',
    },
    estimatedTimeToVisit: {
      min: 180, // 3 hours (half-day safari)
      max: 720, // 12 hours (full-day safari)
    },
    bestTimeToVisit: {
      seasons: ['dry'],
      months: ['february', 'march', 'april', 'july', 'august', 'september'],
      timeOfDay: ['morning', 'evening'],
      notes: 'Best wildlife viewing during the dry season when animals gather around water sources.',
    },
    accessibility: {
      wheelchairAccessible: false,
      publicTransportAccess: false,
      roadConditions: 'rough',
      notes: 'Safari requires 4x4 vehicles. Rough terrain inside the park.',
    },
    facilities: ['restrooms', 'guides'],
    naturalFeatures: 'Diverse landscape including monsoon forests, grasslands, marine wetlands, and sandy beaches. Home to 44 mammal species and 215 bird species.',
    activities: ['safari', 'birdwatching', 'photography', 'camping nearby'],
    isVerified: true,
    isFeatured: true,
    averageRating: 4.5,
    reviewCount: 1100,
    visitsCount: 3500,
  },
  {
    name: 'Mirissa Beach',
    description: 'Mirissa is a small town on the south coast of Sri Lanka, located in the Matara District of the Southern Province. It is approximately 150 kilometers south of Colombo and is situated at an elevation of 4 meters above sea level. The beach and nightlife of Mirissa make it a popular tourist destination. It is also a fishing port and one of the island\'s main whale and dolphin watching locations.',
    shortDescription: 'Crescent-shaped beach known for surfing, whale watching, and relaxed atmosphere',
    type: 'beach',
    category: 'nature',
    tags: ['beach', 'surfing', 'whale watching', 'coastal', 'sunset', 'swimming'],
    address: {
      city: 'Mirissa',
      state: 'Southern Province',
      country: 'Sri Lanka',
    },
    location: {
      type: 'Point',
      coordinates: [80.4718, 5.9434], // [longitude, latitude]
    },
    images: [
      {
        url: 'https://example.com/mirissa1.jpg',
        caption: 'Sunset at Mirissa Beach',
        isMain: true,
      },
      {
        url: 'https://example.com/mirissa2.jpg',
        caption: 'Whale watching tour',
      },
    ],
    openingHours: {
      monday: { isOpen: true, open: '00:00', close: '00:00' }, // Open 24 hours
      tuesday: { isOpen: true, open: '00:00', close: '00:00' },
      wednesday: { isOpen: true, open: '00:00', close: '00:00' },
      thursday: { isOpen: true, open: '00:00', close: '00:00' },
      friday: { isOpen: true, open: '00:00', close: '00:00' },
      saturday: { isOpen: true, open: '00:00', close: '00:00' },
      sunday: { isOpen: true, open: '00:00', close: '00:00' },
      notes: 'Beach is always accessible. Whale watching tours typically operate 06:30-12:00 during season.',
    },
    entranceFee: {
      localPrice: 0,
      foreignerPrice: 0,
      currency: 'LKR',
      notes: 'Free beach access. Whale watching tours cost separately, approximately $25-50 USD per person.',
    },
    estimatedTimeToVisit: {
      min: 180, // 3 hours
      max: 720, // 12 hours or multiple days
    },
    bestTimeToVisit: {
      seasons: ['dry'],
      months: ['november', 'december', 'january', 'february', 'march', 'april'],
      timeOfDay: ['morning', 'evening'],
      notes: 'November to April is the whale watching season. December to March offers the best beach weather.',
    },
    accessibility: {
      wheelchairAccessible: false,
      publicTransportAccess: true,
      roadConditions: 'good',
      notes: 'Sandy beach is difficult for wheelchairs. Whale watching boats are not wheelchair accessible.',
    },
    facilities: ['parking', 'restrooms', 'food', 'drinkingWater', 'shops'],
    naturalFeatures: 'Crescent-shaped sandy beach with clear waters, framed by coconut palms. Offshore waters are home to blue whales, sperm whales, and dolphins.',
    activities: ['swimming', 'surfing', 'whale watching', 'snorkeling', 'beach relaxation', 'dining'],
    isVerified: true,
    isFeatured: true,
    averageRating: 4.6,
    reviewCount: 890,
    visitsCount: 4100,
  }
];

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Seed locations
const seedLocations = async () => {
  try {
    // Clear existing locations
    await Location.deleteMany({});
    console.log('Existing locations deleted');

    // Insert new locations
    const inserted = await Location.insertMany(locationsData);
    console.log(`${inserted.length} locations successfully seeded`);

    // Disconnect from MongoDB
    mongoose.disconnect();
    console.log('MongoDB Disconnected');
  } catch (error) {
    console.error('Error seeding locations:', error);
    process.exit(1);
  }
};

// Run the seed function
seedLocations();