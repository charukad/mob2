import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as itineraryAPI from '../../api/itineraries';

// Async thunks for itinerary actions
export const fetchItineraries = createAsyncThunk(
  'itineraries/fetchItineraries',
  async (params, { rejectWithValue }) => {
    try {
      const response = await itineraryAPI.getItineraries(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.message || 'Failed to fetch itineraries'
      );
    }
  }
);

export const fetchItineraryById = createAsyncThunk(
  'itineraries/fetchItineraryById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await itineraryAPI.getItineraryById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.message || 'Failed to fetch itinerary details'
      );
    }
  }
);

export const createItinerary = createAsyncThunk(
  'itineraries/createItinerary',
  async (itineraryData, { rejectWithValue, dispatch }) => {
    try {
      console.log('Redux Thunk: Creating itinerary...');
      const response = await itineraryAPI.createItinerary(itineraryData);
      console.log('Redux Thunk: Itinerary created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Redux Thunk: Create itinerary error:', error);
      
      // Create a detailed error object with all available information
      const errorDetail = {
        message: error.message || 'Failed to create itinerary',
        type: error.type || 'unknown',
        status: error.status || null,
        data: error.response || null,
        timestamp: new Date().toISOString(),
      };
      
      console.error('Create itinerary error details:', errorDetail);
      
      return rejectWithValue(errorDetail);
    }
  }
);

export const updateItinerary = createAsyncThunk(
  'itineraries/updateItinerary',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await itineraryAPI.updateItinerary(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.message || 'Failed to update itinerary'
      );
    }
  }
);

export const deleteItinerary = createAsyncThunk(
  'itineraries/deleteItinerary',
  async (id, { rejectWithValue }) => {
    try {
      await itineraryAPI.deleteItinerary(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.message || 'Failed to delete itinerary'
      );
    }
  }
);

export const uploadItineraryCoverImage = createAsyncThunk(
  'itineraries/uploadCoverImage',
  async ({ id, imageUri }, { rejectWithValue }) => {
    try {
      const response = await itineraryAPI.uploadCoverImage(id, imageUri);
      return { id, coverImage: response.data.coverImage };
    } catch (error) {
      return rejectWithValue(
        error.message || 'Failed to upload cover image'
      );
    }
  }
);

export const fetchItineraryItems = createAsyncThunk(
  'itineraries/fetchItineraryItems',
  async ({ itineraryId, params }, { rejectWithValue }) => {
    try {
      const response = await itineraryAPI.getItineraryItems(itineraryId, params);
      return { itineraryId, items: response.data.items };
    } catch (error) {
      return rejectWithValue(
        error.message || 'Failed to fetch itinerary items'
      );
    }
  }
);

export const fetchItineraryItemById = createAsyncThunk(
  'itineraries/fetchItineraryItemById',
  async ({ itineraryId, itemId }, { rejectWithValue }) => {
    try {
      const response = await itineraryAPI.getItineraryItemById(itineraryId, itemId);
      return response.data.item;
    } catch (error) {
      return rejectWithValue(
        error.message || 'Failed to fetch itinerary item'
      );
    }
  }
);

export const createItineraryItem = createAsyncThunk(
  'itineraries/createItineraryItem',
  async ({ itineraryId, itemData }, { rejectWithValue }) => {
    try {
      const response = await itineraryAPI.createItineraryItem(itineraryId, itemData);
      return { itineraryId, item: response.data.item };
    } catch (error) {
      return rejectWithValue(
        error.message || 'Failed to create itinerary item'
      );
    }
  }
);

export const updateItineraryItem = createAsyncThunk(
  'itineraries/updateItineraryItem',
  async ({ itineraryId, itemId, itemData }, { rejectWithValue }) => {
    try {
      const response = await itineraryAPI.updateItineraryItem(itineraryId, itemId, itemData);
      return { itineraryId, item: response.data.item };
    } catch (error) {
      return rejectWithValue(
        error.message || 'Failed to update itinerary item'
      );
    }
  }
);

export const deleteItineraryItem = createAsyncThunk(
  'itineraries/deleteItineraryItem',
  async ({ itineraryId, itemId }, { rejectWithValue }) => {
    try {
      await itineraryAPI.deleteItineraryItem(itineraryId, itemId);
      return { itineraryId, itemId };
    } catch (error) {
      return rejectWithValue(
        error.message || 'Failed to delete itinerary item'
      );
    }
  }
);

export const calculateRoute = createAsyncThunk(
  'itineraries/calculateRoute',
  async ({ itineraryId, origin, destination, mode }, { rejectWithValue }) => {
    try {
      const response = await itineraryAPI.calculateRoute(itineraryId, origin, destination, mode);
      return response.data.route;
    } catch (error) {
      return rejectWithValue(
        error.message || 'Failed to calculate route'
      );
    }
  }
);

export const fetchDailySummary = createAsyncThunk(
  'itineraries/fetchDailySummary',
  async (itineraryId, { rejectWithValue }) => {
    try {
      const response = await itineraryAPI.getDailySummary(itineraryId);
      return { itineraryId, days: response.data.days };
    } catch (error) {
      return rejectWithValue(
        error.message || 'Failed to fetch daily summary'
      );
    }
  }
);

// Initial state
const initialState = {
  itineraries: [],
  currentItinerary: null,
  itineraryItems: {},
  currentItem: null,
  routeInfo: null,
  dailySummary: {},
  loading: false,
  error: null,
  itemsLoading: false,
  itemsError: null,
  routeLoading: false,
  routeError: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    total: 0,
  },
};

// Itineraries slice
const itinerariesSlice = createSlice({
  name: 'itineraries',
  initialState,
  reducers: {
    clearCurrentItinerary: (state) => {
      state.currentItinerary = null;
    },
    clearItineraryItems: (state) => {
      state.itineraryItems = {};
    },
    clearCurrentItem: (state) => {
      state.currentItem = null;
    },
    clearRouteInfo: (state) => {
      state.routeInfo = null;
    },
    setCurrentPage: (state, action) => {
      state.pagination.currentPage = action.payload;
    },
    clearItineraryErrors: (state) => {
      state.error = null;
      state.itemsError = null;
      state.routeError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch itineraries
      .addCase(fetchItineraries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchItineraries.fulfilled, (state, action) => {
        state.loading = false;
        state.itineraries = action.payload.itineraries;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchItineraries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch itinerary by ID
      .addCase(fetchItineraryById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchItineraryById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentItinerary = action.payload.itinerary;
      })
      .addCase(fetchItineraryById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create itinerary
      .addCase(createItinerary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createItinerary.fulfilled, (state, action) => {
        state.loading = false;
        state.itineraries.unshift(action.payload.itinerary);
        state.currentItinerary = action.payload.itinerary;
      })
      .addCase(createItinerary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update itinerary
      .addCase(updateItinerary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateItinerary.fulfilled, (state, action) => {
        state.loading = false;
        const updatedItinerary = action.payload.itinerary;
        
        // Update in itineraries list if exists
        const index = state.itineraries.findIndex(i => i._id === updatedItinerary._id);
        if (index !== -1) {
          state.itineraries[index] = updatedItinerary;
        }
        
        // Update current itinerary if it's the same
        if (state.currentItinerary && state.currentItinerary._id === updatedItinerary._id) {
          state.currentItinerary = updatedItinerary;
        }
      })
      .addCase(updateItinerary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Delete itinerary
      .addCase(deleteItinerary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteItinerary.fulfilled, (state, action) => {
        state.loading = false;
        state.itineraries = state.itineraries.filter(i => i._id !== action.payload);
        
        if (state.currentItinerary && state.currentItinerary._id === action.payload) {
          state.currentItinerary = null;
        }
      })
      .addCase(deleteItinerary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Upload cover image
      .addCase(uploadItineraryCoverImage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadItineraryCoverImage.fulfilled, (state, action) => {
        state.loading = false;
        
        // Update cover image in itineraries list if exists
        const index = state.itineraries.findIndex(i => i._id === action.payload.id);
        if (index !== -1) {
          state.itineraries[index].coverImage = action.payload.coverImage;
        }
        
        // Update current itinerary if it's the same
        if (state.currentItinerary && state.currentItinerary._id === action.payload.id) {
          state.currentItinerary.coverImage = action.payload.coverImage;
        }
      })
      .addCase(uploadItineraryCoverImage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch itinerary items
      .addCase(fetchItineraryItems.pending, (state) => {
        state.itemsLoading = true;
        state.itemsError = null;
      })
      .addCase(fetchItineraryItems.fulfilled, (state, action) => {
        state.itemsLoading = false;
        state.itineraryItems[action.payload.itineraryId] = action.payload.items;
      })
      .addCase(fetchItineraryItems.rejected, (state, action) => {
        state.itemsLoading = false;
        state.itemsError = action.payload;
      })

      // Fetch itinerary item by ID
      .addCase(fetchItineraryItemById.pending, (state) => {
        state.itemsLoading = true;
        state.itemsError = null;
      })
      .addCase(fetchItineraryItemById.fulfilled, (state, action) => {
        state.itemsLoading = false;
        state.currentItem = action.payload;
      })
      .addCase(fetchItineraryItemById.rejected, (state, action) => {
        state.itemsLoading = false;
        state.itemsError = action.payload;
      })

      // Create itinerary item
      .addCase(createItineraryItem.pending, (state) => {
        state.itemsLoading = true;
        state.itemsError = null;
      })
      .addCase(createItineraryItem.fulfilled, (state, action) => {
        state.itemsLoading = false;
        
        // Add item to items list if it exists
        if (state.itineraryItems[action.payload.itineraryId]) {
          state.itineraryItems[action.payload.itineraryId].push(action.payload.item);
          
          // Sort items by start time
          state.itineraryItems[action.payload.itineraryId].sort((a, b) => {
            return new Date(a.startTime) - new Date(b.startTime);
          });
        }
        
        state.currentItem = action.payload.item;
      })
      .addCase(createItineraryItem.rejected, (state, action) => {
        state.itemsLoading = false;
        state.itemsError = action.payload;
      })

      // Update itinerary item
      .addCase(updateItineraryItem.pending, (state) => {
        state.itemsLoading = true;
        state.itemsError = null;
      })
      .addCase(updateItineraryItem.fulfilled, (state, action) => {
        state.itemsLoading = false;
        
        // Update item in items list if it exists
        if (state.itineraryItems[action.payload.itineraryId]) {
          const index = state.itineraryItems[action.payload.itineraryId].findIndex(
            item => item._id === action.payload.item._id
          );
          
          if (index !== -1) {
            state.itineraryItems[action.payload.itineraryId][index] = action.payload.item;
            
            // Re-sort items by start time
            state.itineraryItems[action.payload.itineraryId].sort((a, b) => {
              return new Date(a.startTime) - new Date(b.startTime);
            });
          }
        }
        
        // Update current item if it's the same
        if (state.currentItem && state.currentItem._id === action.payload.item._id) {
          state.currentItem = action.payload.item;
        }
      })
      .addCase(updateItineraryItem.rejected, (state, action) => {
        state.itemsLoading = false;
        state.itemsError = action.payload;
      })

      // Delete itinerary item
      .addCase(deleteItineraryItem.pending, (state) => {
        state.itemsLoading = true;
        state.itemsError = null;
      })
      .addCase(deleteItineraryItem.fulfilled, (state, action) => {
        state.itemsLoading = false;
        
        // Remove item from items list if it exists
        if (state.itineraryItems[action.payload.itineraryId]) {
          state.itineraryItems[action.payload.itineraryId] = state.itineraryItems[action.payload.itineraryId].filter(
            item => item._id !== action.payload.itemId
          );
        }
        
        // Clear current item if it's the same
        if (state.currentItem && state.currentItem._id === action.payload.itemId) {
          state.currentItem = null;
        }
      })
      .addCase(deleteItineraryItem.rejected, (state, action) => {
        state.itemsLoading = false;
        state.itemsError = action.payload;
      })

      // Calculate route
      .addCase(calculateRoute.pending, (state) => {
        state.routeLoading = true;
        state.routeError = null;
      })
      .addCase(calculateRoute.fulfilled, (state, action) => {
        state.routeLoading = false;
        state.routeInfo = action.payload;
      })
      .addCase(calculateRoute.rejected, (state, action) => {
        state.routeLoading = false;
        state.routeError = action.payload;
      })

      // Fetch daily summary
      .addCase(fetchDailySummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDailySummary.fulfilled, (state, action) => {
        state.loading = false;
        state.dailySummary[action.payload.itineraryId] = action.payload.days;
      })
      .addCase(fetchDailySummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearCurrentItinerary,
  clearItineraryItems,
  clearCurrentItem,
  clearRouteInfo,
  setCurrentPage,
  clearItineraryErrors,
} = itinerariesSlice.actions;

export default itinerariesSlice.reducer;