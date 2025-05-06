import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../api/axios';

// Async thunks
export const fetchBookings = createAsyncThunk(
  'bookings/fetchBookings',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/bookings', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch bookings'
      );
    }
  }
);

export const fetchBookingById = createAsyncThunk(
  'bookings/fetchBookingById',
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/bookings/${bookingId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch booking details'
      );
    }
  }
);

export const createBooking = createAsyncThunk(
  'bookings/createBooking',
  async (bookingData, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/bookings', bookingData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create booking'
      );
    }
  }
);

export const updateBooking = createAsyncThunk(
  'bookings/updateBooking',
  async ({ bookingId, bookingData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/bookings/${bookingId}`, bookingData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update booking'
      );
    }
  }
);

export const cancelBooking = createAsyncThunk(
  'bookings/cancelBooking',
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/bookings/${bookingId}/cancel`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to cancel booking'
      );
    }
  }
);

// Initial state
const initialState = {
  bookings: [],
  currentBooking: null,
  loading: false,
  error: null,
  submitting: false,
  submitError: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  }
};

// Create the slice
const bookingsSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    clearBookingsError: (state) => {
      state.error = null;
      state.submitError = null;
    },
    clearCurrentBooking: (state) => {
      state.currentBooking = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchBookings
      .addCase(fetchBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.bookings = action.payload.bookings;
        state.pagination = action.payload.pagination || state.pagination;
        state.loading = false;
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Handle fetchBookingById
      .addCase(fetchBookingById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookingById.fulfilled, (state, action) => {
        state.currentBooking = action.payload;
        state.loading = false;
      })
      .addCase(fetchBookingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Handle createBooking
      .addCase(createBooking.pending, (state) => {
        state.submitting = true;
        state.submitError = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.bookings.unshift(action.payload);
        state.currentBooking = action.payload;
        state.submitting = false;
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.payload;
      })
      
      // Handle updateBooking
      .addCase(updateBooking.pending, (state) => {
        state.submitting = true;
        state.submitError = null;
      })
      .addCase(updateBooking.fulfilled, (state, action) => {
        const index = state.bookings.findIndex(
          booking => booking.id === action.payload.id
        );
        
        if (index !== -1) {
          state.bookings[index] = action.payload;
        }
        
        state.currentBooking = action.payload;
        state.submitting = false;
      })
      .addCase(updateBooking.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.payload;
      })
      
      // Handle cancelBooking
      .addCase(cancelBooking.pending, (state) => {
        state.submitting = true;
        state.submitError = null;
      })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        const index = state.bookings.findIndex(
          booking => booking.id === action.payload.id
        );
        
        if (index !== -1) {
          state.bookings[index] = action.payload;
        }
        
        if (state.currentBooking && state.currentBooking.id === action.payload.id) {
          state.currentBooking = action.payload;
        }
        
        state.submitting = false;
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.payload;
      })
  }
});

export const { clearBookingsError, clearCurrentBooking } = bookingsSlice.actions;
export default bookingsSlice.reducer;