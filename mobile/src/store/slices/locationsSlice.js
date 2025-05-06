import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as locationAPI from '../../api/locations';

// Async thunks for location actions
export const fetchLocations = createAsyncThunk(
  'locations/fetchLocations',
  async (params, { rejectWithValue }) => {
    try {
      const response = await locationAPI.getLocations(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.message || 'Failed to fetch locations'
      );
    }
  }
);

export const fetchFeaturedLocations = createAsyncThunk(
  'locations/fetchFeaturedLocations',
  async (limit, { rejectWithValue }) => {
    try {
      const response = await locationAPI.getFeaturedLocations(limit);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.message || 'Failed to fetch featured locations'
      );
    }
  }
);

export const fetchLocationById = createAsyncThunk(
  'locations/fetchLocationById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await locationAPI.getLocationById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.message || 'Failed to fetch location details'
      );
    }
  }
);

export const searchLocations = createAsyncThunk(
  'locations/searchLocations',
  async ({ query, page, limit }, { rejectWithValue }) => {
    try {
      const response = await locationAPI.searchLocations(query, page, limit);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.message || 'Failed to search locations'
      );
    }
  }
);

export const fetchNearbyLocations = createAsyncThunk(
  'locations/fetchNearbyLocations',
  async ({ lat, lng, radius, limit }, { rejectWithValue }) => {
    try {
      const response = await locationAPI.getNearbyLocations(lat, lng, radius, limit);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.message || 'Failed to fetch nearby locations'
      );
    }
  }
);

export const fetchLocationCategories = createAsyncThunk(
  'locations/fetchLocationCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await locationAPI.getLocationCategories();
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.message || 'Failed to fetch location categories'
      );
    }
  }
);

// Initial state
const initialState = {
  locations: [],
  featuredLocations: [],
  currentLocation: null,
  nearbyLocations: [],
  searchResults: [],
  categories: [],
  types: [],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    total: 0,
    hasNext: false,
    hasPrev: false
  },
  loading: false,
  error: null,
  searchLoading: false,
  searchError: null,
  nearbyLoading: false,
  nearbyError: null,
  categoriesLoading: false,
  categoriesError: null,
};

// Locations slice
const locationsSlice = createSlice({
  name: 'locations',
  initialState,
  reducers: {
    clearCurrentLocation: (state) => {
      state.currentLocation = null;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
    clearNearbyLocations: (state) => {
      state.nearbyLocations = [];
    },
    setCurrentPage: (state, action) => {
      if (!state.pagination) {
        state.pagination = {
          currentPage: action.payload,
          totalPages: 1,
          total: 0,
          hasNext: false,
          hasPrev: false
        };
      } else {
        state.pagination.currentPage = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch locations
      .addCase(fetchLocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.locations = action.payload.locations;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch featured locations
      .addCase(fetchFeaturedLocations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeaturedLocations.fulfilled, (state, action) => {
        state.loading = false;
        state.featuredLocations = action.payload.locations;
      })
      .addCase(fetchFeaturedLocations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch location by ID
      .addCase(fetchLocationById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLocationById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentLocation = action.payload.location;
      })
      .addCase(fetchLocationById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Search locations
      .addCase(searchLocations.pending, (state) => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(searchLocations.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload.locations;
        state.pagination = action.payload.pagination || {
          currentPage: 1,
          totalPages: 1,
          total: 0,
          hasNext: false,
          hasPrev: false
        };
      })
      .addCase(searchLocations.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.payload;
      })

      // Fetch nearby locations
      .addCase(fetchNearbyLocations.pending, (state) => {
        state.nearbyLoading = true;
        state.nearbyError = null;
      })
      .addCase(fetchNearbyLocations.fulfilled, (state, action) => {
        state.nearbyLoading = false;
        state.nearbyLocations = action.payload.locations;
      })
      .addCase(fetchNearbyLocations.rejected, (state, action) => {
        state.nearbyLoading = false;
        state.nearbyError = action.payload;
      })

      // Fetch location categories
      .addCase(fetchLocationCategories.pending, (state) => {
        state.categoriesLoading = true;
        state.categoriesError = null;
      })
      .addCase(fetchLocationCategories.fulfilled, (state, action) => {
        state.categoriesLoading = false;
        state.categories = action.payload.categories;
        state.types = action.payload.types;
      })
      .addCase(fetchLocationCategories.rejected, (state, action) => {
        state.categoriesLoading = false;
        state.categoriesError = action.payload;
      });
  },
});

export const { 
  clearCurrentLocation, 
  clearSearchResults, 
  clearNearbyLocations, 
  setCurrentPage 
} = locationsSlice.actions;

export default locationsSlice.reducer;