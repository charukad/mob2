const axios = require('axios');
const errorResponse = require('../utils/errorResponse');
const { google } = require('googleapis');

// Google Calendar API constants
const GOOGLE_CALENDAR_API_KEY = process.env.GOOGLE_CALENDAR_API_KEY;
const SRI_LANKA_EVENTS_CALENDAR_ID = process.env.SRI_LANKA_EVENTS_CALENDAR_ID || 'primary'; // Calendar ID to fetch events from

// Initialize Google Calendar API
const calendar = google.calendar({
  version: 'v3',
  auth: GOOGLE_CALENDAR_API_KEY
});

// Mock data as fallback - with simplified dates
const mockEvents = [
  {
    _id: "evt008",
    title: "Sigiriya Cultural Festival",
    description: "Cultural performances and exhibitions at the base of the ancient rock fortress of Sigiriya.",
    startDate: "2025-04-22",
    endDate: "2025-04-22",
    location: {
      name: "Sigiriya",
      address: "Sigiriya Archaeological Site, Central Province",
      city: "Sigiriya",
      coordinates: {
        latitude: 7.9570,
        longitude: 80.7603
      }
    },
    categories: ["Cultural", "Historical", "Festival"],
    image: "https://example.com/sigiriya-festival.jpg",
    organizer: "Archaeological Department of Sri Lanka",
    isFeatured: true,
    isFree: false
  },
  {
    _id: "evt007",
    title: "Sri Lanka Art and Craft Exhibition",
    description: "Exhibition showcasing traditional Sri Lankan crafts including batik, masks, puppets, and handloom textiles.",
    startDate: "2025-04-20",
    endDate: "2025-04-25",
    location: {
      name: "National Art Gallery",
      address: "Sir Marcus Fernando Mawatha, Colombo",
      city: "Colombo",
      coordinates: {
        latitude: 6.9156,
        longitude: 79.8636
      }
    },
    categories: ["Art", "Exhibition", "Cultural"],
    image: "https://example.com/sl-art-craft.jpg",
    organizer: "Sri Lanka Crafts Council",
    isFeatured: false,
    isFree: true
  },
  {
    _id: "evt006",
    title: "Sinhala and Tamil New Year Festival",
    description: "Traditional new year festival celebrated by both Sinhalese and Tamil communities with cultural events, games, and feasts.",
    startDate: "2025-04-13",
    endDate: "2025-04-14",
    location: {
      name: "Colombo",
      address: "Independence Square, Colombo",
      city: "Colombo",
      coordinates: {
        latitude: 6.9101,
        longitude: 79.8674
      }
    },
    categories: ["Cultural", "New Year", "Festival"],
    image: "https://example.com/sinhala-tamil-new-year.jpg",
    organizer: "Ministry of Cultural Affairs",
    isFeatured: true,
    isFree: true
  }
];

// Helper function to extract categories from Google Calendar event
const extractCategoriesFromEvent = (event) => {
  const categories = [];
  
  // Try to extract from description
  if (event.description) {
    // Look for tags or categories in the description
    const tagMatch = event.description.match(/#(\w+)/g);
    if (tagMatch) {
      tagMatch.forEach(tag => {
        const category = tag.substring(1); // Remove # symbol
        if (!categories.includes(category)) {
          categories.push(category);
        }
      });
    }
    
    // Look for "Category:" or "Categories:" in description
    const categoryMatch = event.description.match(/categories?:\s*([^,.\n]+)/i);
    if (categoryMatch && categoryMatch[1]) {
      const extractedCategories = categoryMatch[1].split(/[,;/]/).map(c => c.trim());
      extractedCategories.forEach(category => {
        if (!categories.includes(category)) {
          categories.push(category);
        }
      });
    }
  }
  
  // Check if we have colorId and map it to categories
  if (event.colorId) {
    // Map Google Calendar color IDs to our categories
    const colorMap = {
      '1': 'Cultural', // Blue
      '2': 'Festival',  // Green
      '3': 'Religious',  // Purple
      '4': 'Sports',  // Red
      '5': 'Educational',  // Yellow
      '6': 'Music',  // Orange
      '7': 'Art',  // Turquoise
      '9': 'Historical',  // Gray
      '10': 'Food',  // Brown
      '11': 'Traditional'  // Red-Orange
    };
    
    if (colorMap[event.colorId] && !categories.includes(colorMap[event.colorId])) {
      categories.push(colorMap[event.colorId]);
    }
  }
  
  // If no categories found, add a default one
  if (categories.length === 0) {
    categories.push('Event');
  }
  
  return categories;
};

// Helper function to extract location data from Google Calendar event
const extractLocationFromEvent = (event) => {
  if (!event.location) {
    return null;
  }
  
  // Default location structure
  const location = {
    name: event.location,
    address: event.location,
    city: 'Sri Lanka',
    coordinates: null
  };
  
  // Try to extract city from location string
  const sriLankanCities = [
    'Colombo', 'Kandy', 'Galle', 'Jaffna', 'Negombo', 'Trincomalee', 
    'Batticaloa', 'Anuradhapura', 'Badulla', 'Ratnapura', 'Matara', 
    'Kurunegala', 'Polonnaruwa', 'Nuwara Eliya', 'Sigiriya', 'Ella'
  ];
  
  sriLankanCities.forEach(city => {
    if (event.location.includes(city)) {
      location.city = city;
    }
  });
  
  // Try to extract coordinates if they exist in the description
  if (event.description) {
    const coordMatch = event.description.match(/coordinates?:?\s*(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/i);
    if (coordMatch && coordMatch.length >= 3) {
      location.coordinates = {
        latitude: parseFloat(coordMatch[1]),
        longitude: parseFloat(coordMatch[2])
      };
    }
  }
  
  return location;
};

// Helper function to transform Google Calendar event to our app's format
const transformGoogleEvent = (event) => {
  const categories = extractCategoriesFromEvent(event);
  const location = extractLocationFromEvent(event);
  
  // Get first attachment as image if it exists
  let image = null;
  if (event.attachments && event.attachments.length > 0) {
    image = event.attachments[0].fileUrl;
  }
  
  // Extract isFree info from description if available
  let isFree = true;
  if (event.description && event.description.toLowerCase().includes('entrance fee')) {
    isFree = false;
  }
  
  // Determine if event is featured based on categories or description
  const isFeatured = event.description && 
                    (event.description.toLowerCase().includes('featured') || 
                     categories.includes('Featured'));
  
  // Create the transformed event object
  return {
    _id: event.id,
    title: event.summary || 'Untitled Event',
    description: event.description || '',
    startDate: event.start.dateTime || event.start.date,
    endDate: event.end.dateTime || event.end.date,
    location: location,
    categories: categories,
    image: image,
    organizer: event.organizer ? event.organizer.displayName : 'Sri Lanka Tourism',
    isFeatured: isFeatured,
    isFree: isFree
  };
};

/**
 * @desc    Get events from Google Calendar
 * @route   GET /api/events
 * @access  Public
 */
exports.getEvents = async (req, res) => {
  try {
    const { filter = 'upcoming', categories = '', page = 1, limit = 10 } = req.query;
    
    // Try to fetch from Google Calendar API
    try {
      // Create time boundaries based on filter
      const now = new Date();
      let timeMin, timeMax;
      
      if (filter === 'upcoming') {
        timeMin = now.toISOString();
      } else if (filter === 'ongoing') {
        timeMin = now.toISOString();
        timeMax = now.toISOString();
      } else if (filter === 'this_month') {
        timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        timeMax = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
      } else if (filter === 'past') {
        timeMax = now.toISOString();
      }
      
      // Prepare options for Google Calendar API
      const options = {
        calendarId: SRI_LANKA_EVENTS_CALENDAR_ID,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: limit * 2 // Fetch more than we need to allow for filtering
      };
      
      if (timeMin) options.timeMin = timeMin;
      if (timeMax) options.timeMax = timeMax;
      
      // Fetch events from Google Calendar
      const response = await calendar.events.list(options);
      
      // Transform the events to our app's format
      let events = response.data.items.map(transformGoogleEvent);
      
      // Apply category filter if provided
      if (categories && categories.length > 0) {
        const categoryArray = categories.split(',');
        events = events.filter(event => 
          event.categories.some(cat => categoryArray.includes(cat))
        );
      }
      
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const paginatedEvents = events.slice(startIndex, startIndex + limit);
      
      return res.status(200).json(paginatedEvents);
    } catch (googleCalendarError) {
      console.error('Error with Google Calendar API, falling back to mock data:', googleCalendarError.message);
      // If Google Calendar API fails, use mock data
      let filteredEvents = [...mockEvents];
      
      // Apply filters to mock data
      if (filter === 'upcoming') {
        const today = new Date();
        filteredEvents = filteredEvents.filter(event => new Date(event.startDate) >= today);
      } else if (filter === 'ongoing') {
        const today = new Date();
        filteredEvents = filteredEvents.filter(event => 
          new Date(event.startDate) <= today && new Date(event.endDate) >= today
        );
      } else if (filter === 'this_month') {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        filteredEvents = filteredEvents.filter(event => 
          new Date(event.startDate) >= firstDayOfMonth && new Date(event.startDate) <= lastDayOfMonth
        );
      } else if (filter === 'past') {
        const today = new Date();
        filteredEvents = filteredEvents.filter(event => new Date(event.endDate) < today);
      }
      
      // Apply category filter if provided
      if (categories && categories.length > 0) {
        const categoryArray = categories.split(',');
        filteredEvents = filteredEvents.filter(event => 
          event.categories.some(cat => categoryArray.includes(cat))
        );
      }
      
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const paginatedEvents = filteredEvents.slice(startIndex, startIndex + limit);
      
      return res.status(200).json(paginatedEvents);
    }
  } catch (error) {
    console.error('Error fetching events:', error.message);
    res.status(500).json(
      errorResponse('Error fetching events', 500)
    );
  }
};

/**
 * @desc    Get featured events
 * @route   GET /api/events/featured
 * @access  Public
 */
exports.getFeaturedEvents = async (req, res) => {
  try {
    // Try to get from Google Calendar
    try {
      // Prepare options for Google Calendar API
      const options = {
        calendarId: SRI_LANKA_EVENTS_CALENDAR_ID,
        singleEvents: true,
        orderBy: 'startTime',
        timeMin: new Date().toISOString(),
        maxResults: 10
      };
      
      // Fetch events from Google Calendar
      const response = await calendar.events.list(options);
      
      // Transform and filter for featured events
      const events = response.data.items
        .map(transformGoogleEvent)
        .filter(event => event.isFeatured);
      
      return res.status(200).json(events);
    } catch (googleCalendarError) {
      console.error('Error with Google Calendar API, falling back to mock data for featured events:', googleCalendarError.message);
      // Fallback to mock featured events
      const featuredEvents = mockEvents.filter(event => event.isFeatured);
      return res.status(200).json(featuredEvents);
    }
  } catch (error) {
    console.error('Error fetching featured events:', error.message);
    res.status(500).json(
      errorResponse('Error fetching featured events', 500)
    );
  }
};

/**
 * @desc    Get event by ID
 * @route   GET /api/events/:id
 * @access  Public
 */
exports.getEventById = async (req, res) => {
  try {
    const eventId = req.params.id;
    
    // Try from Google Calendar
    try {
      // Get event details from Google Calendar
      const response = await calendar.events.get({
        calendarId: SRI_LANKA_EVENTS_CALENDAR_ID,
        eventId: eventId
      });
      
      // Transform to our app's format
      const event = transformGoogleEvent(response.data);
      
      return res.status(200).json(event);
    } catch (googleCalendarError) {
      console.error('Error with Google Calendar API, falling back to mock data for event detail:', googleCalendarError.message);
      // Fallback to mock event
      const mockEvent = mockEvents.find(event => event._id === eventId);
      
      if (!mockEvent) {
        return res.status(404).json(errorResponse('Event not found', 404));
      }
      
      return res.status(200).json(mockEvent);
    }
  } catch (error) {
    console.error('Error fetching event details:', error.message);
    res.status(500).json(
      errorResponse('Error fetching event details', 500)
    );
  }
};

/**
 * @desc    Get event categories
 * @route   GET /api/events/categories
 * @access  Public
 */
exports.getEventCategories = async (req, res) => {
  try {
    // Try from Google Calendar
    try {
      const response = await calendar.calendarList.list();
      
      const categories = response.data.items.map(item => item.summary);
      return res.status(200).json(categories);
    } catch (googleCalendarError) {
      console.error('Error with Google Calendar API, falling back to mock categories:', googleCalendarError.message);
      // Fallback to mock categories
      const categories = [...new Set(mockEvents.flatMap(event => event.categories))];
      return res.status(200).json(categories);
    }
  } catch (error) {
    console.error('Error fetching event categories:', error.message);
    res.status(500).json(
      errorResponse('Error fetching event categories', 500)
    );
  }
};

/**
 * @desc    Get events by date
 * @route   GET /api/events/date
 * @access  Public
 */
exports.getEventsByDate = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json(
        errorResponse('Date parameter is required', 400)
      );
    }
    
    console.log(`Request for events on date: ${date}`);
    
    // Try from Google Calendar
    try {
      const dateObj = new Date(date);
      const nextDay = new Date(dateObj);
      nextDay.setDate(dateObj.getDate() + 1);
      
      const response = await calendar.events.list({
        calendarId: SRI_LANKA_EVENTS_CALENDAR_ID,
        timeMin: dateObj.toISOString(),
        timeMax: nextDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      // Transform the data
      const events = response.data.items.map(event => ({
        _id: event.id,
        title: event.summary,
        description: event.description,
        startDate: event.start.dateTime || event.start.date,
        endDate: event.end.dateTime || event.end.date,
        location: event.location ? {
          name: event.location.summary,
          address: event.location.description,
          city: event.location.city,
          coordinates: event.location.coordinates
        } : null,
        categories: extractCategoriesFromEvent(event),
        image: event.attachments && event.attachments.length > 0 ? event.attachments[0].fileUrl : null,
        organizer: event.organizer ? event.organizer.displayName : 'Sri Lanka Tourism',
        ticketLink: event.htmlLink,
        isFeatured: event.description && (event.description.toLowerCase().includes('featured') || extractCategoriesFromEvent(event).includes('Featured')),
        isFree: event.description && event.description.toLowerCase().includes('entrance fee') ? false : true
      }));
      
      return res.status(200).json(events);
    } catch (googleCalendarError) {
      console.error('Error with Google Calendar API, falling back to mock data for events by date:', googleCalendarError.message);
      // Fallback to mock data
      
      // Convert the requested date to YYYY-MM-DD string format for comparison
      const formattedRequestDate = date.split('T')[0];
      console.log(`Looking for events on formatted date: ${formattedRequestDate}`);
      
      // Loop through all mock events and log their details
      console.log("All mock events: ");
      mockEvents.forEach(event => {
        console.log(`Event: ${event.title}, Start: ${event.startDate}, End: ${event.endDate}`);
      });
      
      // Find events that occur on the requested date
      const mockEventsOnDate = mockEvents.filter(event => {
        // Get start and end dates as YYYY-MM-DD strings
        const eventStartStr = event.startDate.split('T')[0];
        const eventEndStr = event.endDate ? event.endDate.split('T')[0] : eventStartStr;
        
        // Simple string comparison of dates in YYYY-MM-DD format
        const isWithinRange = formattedRequestDate >= eventStartStr && formattedRequestDate <= eventEndStr;
        
        console.log(`Comparing: ${formattedRequestDate} with event ${event.title}: Start ${eventStartStr}, End ${eventEndStr}, Match: ${isWithinRange}`);
        
        return isWithinRange;
      });
      
      console.log(`Found ${mockEventsOnDate.length} events on ${formattedRequestDate}`);
      mockEventsOnDate.forEach(event => {
        console.log(`- ${event.title}`);
      });
      
      return res.status(200).json(mockEventsOnDate);
    }
  } catch (error) {
    console.error('Error fetching events by date:', error.message);
    res.status(500).json(
      errorResponse('Error fetching events by date', 500)
    );
  }
};

/**
 * @desc    Get event dates with events
 * @route   GET /api/events/dates
 * @access  Public
 */
exports.getEventDates = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json(
        errorResponse('Month and year parameters are required', 400)
      );
    }
    
    // Try from Google Calendar
    try {
      // Create date range for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of month
      
      const response = await calendar.events.list({
        calendarId: SRI_LANKA_EVENTS_CALENDAR_ID,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      // Extract just the dates with events
      const datesWithEvents = {};
      
      response.data.items.forEach(event => {
        const eventDate = new Date(event.start.dateTime || event.start.date);
        const dateString = eventDate.toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (!datesWithEvents[dateString]) {
          datesWithEvents[dateString] = {
            count: 1
          };
        } else {
          datesWithEvents[dateString].count += 1;
        }
      });
      
      return res.status(200).json(datesWithEvents);
    } catch (googleCalendarError) {
      console.error('Error with Google Calendar API, falling back to mock data for event dates:', googleCalendarError.message);
      // Fallback to mock data
      const mockDatesWithEvents = {};
      
      mockEvents.forEach(event => {
        // Convert string dates to Date objects if they're not already
        let eventStartDate;
        if (typeof event.startDate === 'string') {
          eventStartDate = new Date(event.startDate);
        } else {
          eventStartDate = new Date(event.startDate);
        }
        
        const eventYear = eventStartDate.getFullYear();
        const eventMonth = eventStartDate.getMonth() + 1;
        
        if (parseInt(year) === eventYear && parseInt(month) === eventMonth) {
          const dateString = event.startDate; // YYYY-MM-DD format
          
          if (!mockDatesWithEvents[dateString]) {
            mockDatesWithEvents[dateString] = {
              count: 1
            };
          } else {
            mockDatesWithEvents[dateString].count += 1;
          }
        }
        
        // If the event spans multiple days, add all dates within the month
        if (event.endDate) {
          let startDate = new Date(event.startDate);
          const endDate = new Date(event.endDate);
          
          // Iterate through all days in the event
          while (startDate <= endDate) {
            const currentYear = startDate.getFullYear();
            const currentMonth = startDate.getMonth() + 1;
            
            // Only add dates within the requested month
            if (parseInt(year) === currentYear && parseInt(month) === currentMonth) {
              const dateString = startDate.toISOString().split('T')[0];
              
              if (!mockDatesWithEvents[dateString]) {
                mockDatesWithEvents[dateString] = {
                  count: 1
                };
              } else {
                mockDatesWithEvents[dateString].count += 1;
              }
            }
            
            // Move to next day
            startDate.setDate(startDate.getDate() + 1);
          }
        }
      });
      
      return res.status(200).json(mockDatesWithEvents);
    }
  } catch (error) {
    console.error('Error fetching event dates:', error.message);
    res.status(500).json(
      errorResponse('Error fetching event dates', 500)
    );
  }
};

/**
 * @desc    Save an event (just returns success)
 * @route   POST /api/events/:id/save
 * @access  Public (would be Private in a real app)
 */
exports.saveEvent = async (req, res) => {
  try {
    // In a real app, this would save to the user's profile
    // For now just return success
    res.status(200).json({
      success: true,
      saved: true
    });
  } catch (error) {
    console.error('Error saving event:', error);
    res.status(500).json(
      errorResponse('Error saving event', 500)
    );
  }
};

/**
 * @desc    Get upcoming events in a date range
 * @route   GET /api/events/range
 * @access  Public
 */
exports.getUpcomingEventsInRange = async (req, res) => {
  try {
    const { startDate, endDate, categories } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json(
        errorResponse('Start date and end date parameters are required', 400)
      );
    }
    
    console.log(`Request for events from ${startDate} to ${endDate}`);
    
    // Try from Google Calendar
    try {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      const response = await calendar.events.list({
        calendarId: SRI_LANKA_EVENTS_CALENDAR_ID,
        timeMin: startDateObj.toISOString(),
        timeMax: endDateObj.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      // Transform the data
      const events = response.data.items.map(event => ({
        _id: event.id,
        title: event.summary,
        description: event.description,
        startDate: event.start.dateTime || event.start.date,
        endDate: event.end.dateTime || event.end.date,
        location: event.location ? {
          name: event.location.summary,
          address: event.location.description,
          city: event.location.city,
          coordinates: event.location.coordinates
        } : null,
        categories: extractCategoriesFromEvent(event),
        image: event.attachments && event.attachments.length > 0 ? event.attachments[0].fileUrl : null,
        organizer: event.organizer ? event.organizer.displayName : 'Sri Lanka Tourism',
        ticketLink: event.htmlLink,
        isFeatured: event.description && (event.description.toLowerCase().includes('featured') || extractCategoriesFromEvent(event).includes('Featured')),
        isFree: event.description && event.description.toLowerCase().includes('entrance fee') ? false : true
      }));
      
      return res.status(200).json(events);
    } catch (googleCalendarError) {
      console.error('Error with Google Calendar API, falling back to mock data for events in range:', googleCalendarError.message);
      
      // Format the dates for comparison
      const startDay = startDate.split('T')[0];
      const endDay = endDate.split('T')[0];
      
      console.log(`Looking for events between ${startDay} and ${endDay}`);
      
      // Filter mock events in date range
      const eventsInRange = mockEvents.filter(event => {
        // Get start and end dates as YYYY-MM-DD strings
        const eventStartStr = event.startDate.split('T')[0];
        const eventEndStr = event.endDate ? event.endDate.split('T')[0] : eventStartStr;
        
        // Check if the event overlaps with the requested date range
        const rangeOverlap = (
          // Event starts during range
          (eventStartStr >= startDay && eventStartStr <= endDay) ||
          // Event ends during range
          (eventEndStr >= startDay && eventEndStr <= endDay) ||
          // Event spans the entire range
          (eventStartStr <= startDay && eventEndStr >= endDay)
        );
        
        // Apply category filter if needed
        let matchesCategory = true;
        if (categories) {
          const categoryList = categories.split(',');
          matchesCategory = event.categories.some(cat => categoryList.includes(cat));
        }
        
        return rangeOverlap && matchesCategory;
      });
      
      console.log(`Found ${eventsInRange.length} events between ${startDay} and ${endDay}`);
      eventsInRange.forEach(event => {
        console.log(`- ${event.title} (${event.startDate} to ${event.endDate})`);
      });
      
      return res.status(200).json(eventsInRange);
    }
  } catch (error) {
    console.error('Error fetching events in range:', error.message);
    res.status(500).json(
      errorResponse('Error fetching events in range', 500)
    );
  }
}; 