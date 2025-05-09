// Mock data for locations in Sri Lanka
const mockLocations = [
  {
    id: 'location-1',
    name: 'Sigiriya',
    description: 'Sigiriya or Sinhagiri is an ancient rock fortress located in the northern Matale District near the town of Dambulla in the Central Province, Sri Lanka. The name refers to a site of historical and archaeological significance that is dominated by a massive column of rock around 180 metres (590 ft) high.',
    shortDescription: 'Ancient rock fortress with stunning views and frescoes',
    type: 'historical',
    category: 'culture',
    tags: ['UNESCO', 'history', 'fortress', 'archaeology'],
    address: {
      street: 'Sigiriya',
      city: 'Dambulla',
      state: 'Central Province',
      postalCode: '',
      country: 'Sri Lanka'
    },
    location: {
      type: 'Point',
      coordinates: [80.7603, 7.9572] // [longitude, latitude]
    },
    images: [
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Sigiriya.jpg/1200px-Sigiriya.jpg',
        caption: 'Sigiriya Rock',
        isMain: true
      },
      {
        url: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/17/28/5c/d5/photo0jpg.jpg?w=1200&h=-1&s=1',
        caption: 'Lion\'s Paw Entrance'
      }
    ],
    openingHours: {
      monday: { isOpen: true, open: '07:00', close: '17:30' },
      tuesday: { isOpen: true, open: '07:00', close: '17:30' },
      wednesday: { isOpen: true, open: '07:00', close: '17:30' },
      thursday: { isOpen: true, open: '07:00', close: '17:30' },
      friday: { isOpen: true, open: '07:00', close: '17:30' },
      saturday: { isOpen: true, open: '07:00', close: '17:30' },
      sunday: { isOpen: true, open: '07:00', close: '17:30' },
      notes: 'Last entry at 17:00'
    },
    entranceFee: {
      localPrice: 50,
      foreignerPrice: 30,
      currency: 'USD',
      notes: 'Free for children under 6 years'
    },
    contactInfo: {
      phone: '+94 66 2286 601',
      email: 'info@sigiriya.lk',
      website: 'https://www.sigiriya.lk'
    },
    averageRating: 4.8,
    reviewCount: 1258,
    isVerified: true,
    isFeatured: true
  },
  {
    id: 'location-2',
    name: 'Temple of the Tooth Relic',
    description: 'Sri Dalada Maligawa or the Temple of the Sacred Tooth Relic is a Buddhist temple in the city of Kandy, Sri Lanka. It is located in the royal palace complex of the former Kingdom of Kandy, which houses the relic of the tooth of the Buddha.',
    shortDescription: 'Sacred Buddhist temple housing Buddha\'s tooth relic',
    type: 'temple',
    category: 'culture',
    tags: ['UNESCO', 'Buddhism', 'temple', 'sacred'],
    address: {
      street: 'Sri Dalada Veediya',
      city: 'Kandy',
      state: 'Central Province',
      postalCode: '20000',
      country: 'Sri Lanka'
    },
    location: {
      type: 'Point',
      coordinates: [80.6413, 7.2936] // [longitude, latitude]
    },
    images: [
      {
        url: 'https://www.trawell.in/admin/images/upload/148094949Temple_of_the_Sacred_Tooth_Relic_Main.jpg',
        caption: 'Temple of the Tooth Relic',
        isMain: true
      },
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Sri_Dalada_Maligawa-Kandy.jpg/1200px-Sri_Dalada_Maligawa-Kandy.jpg',
        caption: 'Temple Exterior'
      }
    ],
    openingHours: {
      monday: { isOpen: true, open: '05:30', close: '20:00' },
      tuesday: { isOpen: true, open: '05:30', close: '20:00' },
      wednesday: { isOpen: true, open: '05:30', close: '20:00' },
      thursday: { isOpen: true, open: '05:30', close: '20:00' },
      friday: { isOpen: true, open: '05:30', close: '20:00' },
      saturday: { isOpen: true, open: '05:30', close: '20:00' },
      sunday: { isOpen: true, open: '05:30', close: '20:00' },
      notes: 'Ceremony times: 5:30-6:45, 9:30-11:00, 18:30-20:00'
    },
    entranceFee: {
      localPrice: 0,
      foreignerPrice: 1500,
      currency: 'LKR',
      notes: 'Free for locals, camera charge extra'
    },
    contactInfo: {
      phone: '+94 81 2234 226',
      email: 'info@sridaladamaligawa.lk',
      website: 'https://www.sridaladamaligawa.lk'
    },
    averageRating: 4.7,
    reviewCount: 876,
    isVerified: true,
    isFeatured: true
  },
  {
    id: 'location-3',
    name: 'Galle Fort',
    description: 'Galle Fort, in the Bay of Galle on the southwest coast of Sri Lanka, was built first in 1588 by the Portuguese, then extensively fortified by the Dutch during the 17th century. It is a historical, archaeological and architectural heritage monument.',
    shortDescription: 'Dutch colonial fort with charming streets and ocean views',
    type: 'historical',
    category: 'culture',
    tags: ['UNESCO', 'colonial', 'fort', 'Dutch'],
    address: {
      street: 'Galle Fort',
      city: 'Galle',
      state: 'Southern Province',
      postalCode: '80000',
      country: 'Sri Lanka'
    },
    location: {
      type: 'Point',
      coordinates: [80.2159, 6.0269] // [longitude, latitude]
    },
    images: [
      {
        url: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/15/33/fc/f0/galle-dutch-fort.jpg?w=1200&h=-1&s=1',
        caption: 'Galle Fort Walls',
        isMain: true
      },
      {
        url: 'https://www.srilankatravelandtourism.com/wp-content/uploads/2019/11/Galle-Fort-Sri-Lanka-Galle-Dutch-Fort.jpg',
        caption: 'Streets of Galle Fort'
      }
    ],
    openingHours: {
      monday: { isOpen: true, open: '00:00', close: '24:00' },
      tuesday: { isOpen: true, open: '00:00', close: '24:00' },
      wednesday: { isOpen: true, open: '00:00', close: '24:00' },
      thursday: { isOpen: true, open: '00:00', close: '24:00' },
      friday: { isOpen: true, open: '00:00', close: '24:00' },
      saturday: { isOpen: true, open: '00:00', close: '24:00' },
      sunday: { isOpen: true, open: '00:00', close: '24:00' },
      notes: 'Fort is open 24/7, individual attractions have varying times'
    },
    entranceFee: {
      localPrice: 0,
      foreignerPrice: 0,
      currency: 'LKR',
      notes: 'Free to enter the fort, some museums inside have entry fees'
    },
    contactInfo: {
      phone: '+94 91 2234 088',
      email: 'info@gallefort.lk',
      website: 'https://www.gallefort.lk'
    },
    averageRating: 4.6,
    reviewCount: 1024,
    isVerified: true,
    isFeatured: true
  },
  {
    id: 'location-4',
    name: 'Yala National Park',
    description: 'Yala National Park is the most visited and second largest national park in Sri Lanka. The park is best known for its variety of wild animals. It is important for the conservation of Sri Lankan elephants, Sri Lankan leopards and aquatic birds.',
    shortDescription: 'Wildlife sanctuary known for leopards and elephants',
    type: 'wildlife',
    category: 'nature',
    tags: ['safari', 'wildlife', 'leopards', 'elephants'],
    address: {
      street: 'Yala National Park',
      city: 'Hambantota',
      state: 'Southern Province',
      postalCode: '',
      country: 'Sri Lanka'
    },
    location: {
      type: 'Point',
      coordinates: [81.4288, 6.3698] // [longitude, latitude]
    },
    images: [
      {
        url: 'https://media.tacdn.com/media/attractions-splice-spp-674x446/07/01/ed/78.jpg',
        caption: 'Sri Lankan Leopard at Yala',
        isMain: true
      },
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Elephant_near_Yala_National_Park.jpg/1200px-Elephant_near_Yala_National_Park.jpg',
        caption: 'Elephants at Yala'
      }
    ],
    openingHours: {
      monday: { isOpen: true, open: '06:00', close: '18:00' },
      tuesday: { isOpen: true, open: '06:00', close: '18:00' },
      wednesday: { isOpen: true, open: '06:00', close: '18:00' },
      thursday: { isOpen: true, open: '06:00', close: '18:00' },
      friday: { isOpen: true, open: '06:00', close: '18:00' },
      saturday: { isOpen: true, open: '06:00', close: '18:00' },
      sunday: { isOpen: true, open: '06:00', close: '18:00' },
      notes: 'Best time for wildlife viewing is early morning or late afternoon'
    },
    entranceFee: {
      localPrice: 60,
      foreignerPrice: 15,
      currency: 'USD',
      notes: 'Additional charges for vehicles and guides'
    },
    contactInfo: {
      phone: '+94 47 2220 141',
      email: 'info@yalanationalpark.lk',
      website: 'https://www.yalanationalpark.lk'
    },
    averageRating: 4.5,
    reviewCount: 892,
    isVerified: true,
    isFeatured: true
  },
  {
    id: 'location-5',
    name: 'Nine Arch Bridge',
    description: 'The Nine Arch Bridge in Ella is one of the most iconic bridges in Sri Lanka and is a fine example of colonial-era railway construction. The bridge is located between Ella and Demodara stations and spans 91 meters at a height of 24 meters.',
    shortDescription: 'Iconic colonial railway bridge in the hills of Ella',
    type: 'viewpoint',
    category: 'nature',
    tags: ['railway', 'bridge', 'colonial', 'engineering'],
    address: {
      street: 'Nine Arch Bridge Road',
      city: 'Ella',
      state: 'Uva Province',
      postalCode: '',
      country: 'Sri Lanka'
    },
    location: {
      type: 'Point',
      coordinates: [81.0553, 6.8754] // [longitude, latitude]
    },
    images: [
      {
        url: 'https://media-cdn.tripadvisor.com/media/photo-s/17/df/0d/f6/2019-5-21.jpg',
        caption: 'Nine Arch Bridge with Train',
        isMain: true
      },
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Nine_Arches_Bridge%2C_Ella%2C_Sri_Lanka.jpg/1200px-Nine_Arches_Bridge%2C_Ella%2C_Sri_Lanka.jpg',
        caption: 'View of the Nine Arch Bridge'
      }
    ],
    openingHours: {
      monday: { isOpen: true, open: '00:00', close: '24:00' },
      tuesday: { isOpen: true, open: '00:00', close: '24:00' },
      wednesday: { isOpen: true, open: '00:00', close: '24:00' },
      thursday: { isOpen: true, open: '00:00', close: '24:00' },
      friday: { isOpen: true, open: '00:00', close: '24:00' },
      saturday: { isOpen: true, open: '00:00', close: '24:00' },
      sunday: { isOpen: true, open: '00:00', close: '24:00' },
      notes: 'Check train schedules to see the train crossing the bridge'
    },
    entranceFee: {
      localPrice: 0,
      foreignerPrice: 0,
      currency: 'LKR',
      notes: 'Free to visit'
    },
    contactInfo: {
      phone: '',
      email: '',
      website: ''
    },
    averageRating: 4.4,
    reviewCount: 754,
    isVerified: true,
    isFeatured: false
  }
];

module.exports = mockLocations; 