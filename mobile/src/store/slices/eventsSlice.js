import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import axiosInstance from '../../api/axiosConfig';
import { API_ENDPOINTS } from '../../constants/api';
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

// Async thunks
export const fetchEvents = createAsyncThunk(
  'events/fetchEvents',
  async ({ filter = 'upcoming', categories = [], page = 1, limit = 10, refresh = false }, { rejectWithValue }) => {
    try {
      const params = { filter, page, limit };
      
      if (categories.length > 0) {
        params.categories = categories.join(',');
      }
      
      const response = await axios.get(API_ENDPOINTS.EVENTS, { params });
      return { data: response.data, refresh };
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch events' });
    }
  }
);

export const fetchFeaturedEvents = createAsyncThunk(
  'events/fetchFeaturedEvents',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.EVENTS}/featured`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch featured events' });
    }
  }
);

export const fetchEventById = createAsyncThunk(
  'events/fetchEventById',
  async (eventId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.EVENTS}/${eventId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch event details' });
    }
  }
);

export const fetchEventsByDate = createAsyncThunk(
  'events/fetchEventsByDate',
  async ({ date, categories = [] }, { rejectWithValue }) => {
    try {
      const params = { date };
      
      if (categories.length > 0) {
        params.categories = categories.join(',');
      }
      
      const response = await axios.get(`${API_ENDPOINTS.EVENTS}/date`, { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch events by date' });
    }
  }
);

export const fetchEventDates = createAsyncThunk(
  'events/fetchEventDates',
  async ({ month, year }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.EVENTS}/dates`, {
        params: { month, year }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch event dates' });
    }
  }
);

export const fetchEventCategories = createAsyncThunk(
  'events/fetchEventCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.EVENTS}/categories`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch event categories' });
    }
  }
);

export const saveEvent = createAsyncThunk(
  'events/saveEvent',
  async (eventId, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_ENDPOINTS.EVENTS}/${eventId}/save`);
      return { eventId, saved: response.data.saved };
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to save event' });
    }
  }
);

export const addEventToCalendar = createAsyncThunk(
  'events/addEventToCalendar',
  async (eventId, { getState, rejectWithValue }) => {
    try {
      // Get event from state
      const { currentEvent } = getState().events;
      
      if (!currentEvent) {
        throw new Error('Event not found');
      }
      
      // Request calendar permissions
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Calendar permission not granted');
      }
      
      // Get default calendar
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find(
        cal => cal.allowsModifications && 
        (Platform.OS === 'ios' 
          ? cal.source.name === 'Default'
          : cal.accessLevel === Calendar.CalendarAccessLevel.OWNER)
      );
      
      if (!defaultCalendar) {
        throw new Error('No writable calendar found');
      }
      
      // Prepare event details
      const startDate = new Date(currentEvent.startDate);
      const endDate = currentEvent.endDate 
        ? new Date(currentEvent.endDate) 
        : new Date(startDate);
      
      // If there's a specific time, set it
      if (currentEvent.startTime) {
        const [hours, minutes] = currentEvent.startTime.split(':');
        startDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      }
      
      if (currentEvent.endTime) {
        const [hours, minutes] = currentEvent.endTime.split(':');
        endDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      } else if (currentEvent.startTime) {
        // Default to 1 hour duration if only start time is specified
        endDate.setTime(startDate.getTime() + (60 * 60 * 1000));
      }
      
      // Create calendar event
      const eventDetails = {
        title: currentEvent.title,
        startDate,
        endDate,
        notes: currentEvent.description,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        location: currentEvent.location ? currentEvent.location.name : '',
        alarms: [{ relativeOffset: -60 }], // Reminder 1 hour before
      };
      
      const eventId = await Calendar.createEventAsync(defaultCalendar.id, eventDetails);
      
      return { success: true, eventId };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to add event to calendar');
    }
  }
);

export const fetchCulturalInfo = createAsyncThunk(
  'events/fetchCulturalInfo',
  async ({ category = null, page = 1, limit = 10, refresh = false }, { rejectWithValue }) => {
    try {
      const params = { page, limit };
      
      if (category) {
        params.category = category;
      }
      
      const response = await axios.get(`${API_ENDPOINTS.CULTURAL_INFO}`, { params });
      return { data: response.data, refresh };
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch cultural information' });
    }
  }
);

export const fetchCulturalInfoById = createAsyncThunk(
  'events/fetchCulturalInfoById',
  async (infoId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.CULTURAL_INFO}/${infoId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch cultural information details' });
    }
  }
);

export const fetchCulturalCategories = createAsyncThunk(
  'events/fetchCulturalCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_ENDPOINTS.CULTURAL_INFO}/categories`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch cultural categories' });
    }
  }
);

export const fetchUpcomingEvents = createAsyncThunk(
  'events/fetchUpcomingEvents',
  async ({ startDate, endDate, categories = [] }, { rejectWithValue }) => {
    try {
      const params = { 
        startDate, 
        endDate 
      };
      
      if (categories.length > 0) {
        params.categories = categories.join(',');
      }
      
      // Use the range endpoint which is connected to Google Calendar
      const response = await axios.get(`${API_ENDPOINTS.EVENTS}/upcoming-range`, { params });
      
      // Log the response for debugging
      console.log('Google Calendar Events:', response.data.length);
      
      return response.data;
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      
      // Create mock data for fallback when there are network issues
      const mockEvents = [
        {
          _id: "mock001",
          title: "Sinhala and Tamil New Year Festival",
          description: "Traditional new year celebration with cultural events",
          startDate: "2025-04-13",
          endDate: "2025-04-14",
          location: {
            name: "Colombo",
            address: "Independence Square",
            city: "Colombo",
            coordinates: {
              latitude: 6.9101,
              longitude: 79.8674
            }
          },
          categories: ["Cultural", "Festival"],
          image: "https://example.com/sinhala-tamil-new-year.jpg",
          organizer: "Ministry of Cultural Affairs",
          isFeatured: true,
          isFree: true
        },
        {
          _id: "mock002",
          title: "Kandy Esala Perahera",
          description: "Historical procession featuring dancers and elephants",
          startDate: "2025-08-05",
          endDate: "2025-08-15",
          location: {
            name: "Kandy",
            address: "Temple of the Sacred Tooth Relic",
            city: "Kandy",
            coordinates: {
              latitude: 7.2906,
              longitude: 80.6337
            }
          },
          categories: ["Religious", "Cultural"],
          image: "https://example.com/esala-perahera.jpg",
          organizer: "Temple of the Sacred Tooth Relic",
          isFeatured: true,
          isFree: false
        }
      ];
      
      // Check if it's a network error and return mock data instead of rejecting
      if (error.message === 'Network Error') {
        console.log('Network error detected - using mock data');
        return mockEvents;
      }
      
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch upcoming events' });
    }
  }
);

// Helper function to update event in array
const updateEventInArray = (events, eventId, updateFunc) => {
  return events.map(event => {
    if (event._id === eventId) {
      return updateFunc(event);
    }
    return event;
  });
};

// Initial state
const initialState = {
  events: [],
  featuredEvents: [],
  eventsByDate: [],
  eventDates: [],
  upcomingEvents: [],
  categories: [],
  currentEvent: null,
  culturalInfo: [],
  culturalCategories: [],
  currentCulturalInfo: null,
  loading: false,
  refreshing: false,
  error: null,
  calendarResult: null,
  currentPage: 1,
  hasMore: true,
};

// Slice
const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    clearCurrentEvent: (state) => {
      state.currentEvent = null;
    },
    clearCurrentCulturalInfo: (state) => {
      state.currentCulturalInfo = null;
    },
    resetEventsState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch events
      .addCase(fetchEvents.pending, (state, action) => {
        const { refresh } = action.meta.arg;
        state.loading = true;
        state.refreshing = refresh || false;
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        const { data, refresh } = action.payload;
        
        if (refresh) {
          state.events = data;
          state.currentPage = 2; // Next page would be 2
        } else {
          state.events = [...state.events, ...data];
          state.currentPage += 1;
        }
        
        state.hasMore = data.length > 0;
        state.loading = false;
        state.refreshing = false;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = action.payload;
      })
      
      // Fetch featured events
      .addCase(fetchFeaturedEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeaturedEvents.fulfilled, (state, action) => {
        state.featuredEvents = action.payload;
        state.loading = false;
      })
      .addCase(fetchFeaturedEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch event by ID
      .addCase(fetchEventById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEventById.fulfilled, (state, action) => {
        state.currentEvent = action.payload;
        state.loading = false;
      })
      .addCase(fetchEventById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch events by date
      .addCase(fetchEventsByDate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEventsByDate.fulfilled, (state, action) => {
        state.eventsByDate = action.payload;
        state.loading = false;
      })
      .addCase(fetchEventsByDate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch event dates
      .addCase(fetchEventDates.fulfilled, (state, action) => {
        state.eventDates = action.payload;
      })
      
      // Fetch event categories
      .addCase(fetchEventCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
      })
      
      // Save event
      .addCase(saveEvent.fulfilled, (state, action) => {
        const { eventId, saved } = action.payload;
        
        // Update in events array
        state.events = updateEventInArray(state.events, eventId, event => ({
          ...event,
          isSaved: saved
        }));
        
        // Update in featured events array
        state.featuredEvents = updateEventInArray(state.featuredEvents, eventId, event => ({
          ...event,
          isSaved: saved
        }));
        
        // Update in eventsByDate array
        state.eventsByDate = updateEventInArray(state.eventsByDate, eventId, event => ({
          ...event,
          isSaved: saved
        }));
        
        // Update current event if it matches
        if (state.currentEvent && state.currentEvent._id === eventId) {
          state.currentEvent = {
            ...state.currentEvent,
            isSaved: saved
          };
        }
      })
      
      // Add event to calendar
      .addCase(addEventToCalendar.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addEventToCalendar.fulfilled, (state, action) => {
        state.calendarResult = action.payload;
        state.loading = false;
      })
      .addCase(addEventToCalendar.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.calendarResult = { success: false, error: action.payload };
      })
      
      // Fetch cultural info
      .addCase(fetchCulturalInfo.pending, (state, action) => {
        const { refresh } = action.meta.arg;
        state.loading = true;
        state.refreshing = refresh || false;
        state.error = null;
      })
      .addCase(fetchCulturalInfo.fulfilled, (state, action) => {
        const { data, refresh } = action.payload;
        
        if (refresh) {
          state.culturalInfo = data;
        } else {
          state.culturalInfo = [...state.culturalInfo, ...data];
        }
        
        state.loading = false;
        state.refreshing = false;
      })
      .addCase(fetchCulturalInfo.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = action.payload;
      })
      
      // Fetch cultural info by ID
      .addCase(fetchCulturalInfoById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCulturalInfoById.fulfilled, (state, action) => {
        state.currentCulturalInfo = action.payload;
        state.loading = false;
      })
      .addCase(fetchCulturalInfoById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch cultural categories
      .addCase(fetchCulturalCategories.fulfilled, (state, action) => {
        state.culturalCategories = action.payload;
      })
      
      // Fetch upcoming events
      .addCase(fetchUpcomingEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUpcomingEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.upcomingEvents = action.payload;
        
        // Add a property to indicate if these are mock events
        if (action.payload && action.payload.length > 0 && action.payload[0]._id.startsWith('mock')) {
          state.usingMockData = true;
        } else {
          state.usingMockData = false;
        }
      })
      .addCase(fetchUpcomingEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch upcoming events';
        // Don't clear the events array on rejection, so any existing events still show
      });
  },
});

// Export actions and reducer
export const { clearCurrentEvent, clearCurrentCulturalInfo, resetEventsState } = eventsSlice.actions;
export default eventsSlice.reducer;