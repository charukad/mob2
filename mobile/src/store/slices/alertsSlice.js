import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../api/axios';

// Async thunks
export const fetchAlerts = createAsyncThunk(
  'alerts/fetchAlerts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/alerts');
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch alerts'
      );
    }
  }
);

export const dismissAlert = createAsyncThunk(
  'alerts/dismissAlert',
  async (alertId, { rejectWithValue }) => {
    try {
      await axios.post(`/api/alerts/${alertId}/dismiss`);
      return alertId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to dismiss alert'
      );
    }
  }
);

export const subscribeToAlerts = createAsyncThunk(
  'alerts/subscribeToAlerts',
  async (locationIds, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/alerts/subscribe', { locationIds });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to subscribe to alerts'
      );
    }
  }
);

export const unsubscribeFromAlerts = createAsyncThunk(
  'alerts/unsubscribeFromAlerts',
  async (locationIds, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/alerts/unsubscribe', { locationIds });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to unsubscribe from alerts'
      );
    }
  }
);

// Define the initial state
const initialState = {
  alerts: [],
  loading: false,
  error: null,
  subscriptions: [],
  subscriptionLoading: false,
  subscriptionError: null,
};

// Create the alerts slice
const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    // Add a new alert (used for real-time updates)
    addAlert: (state, action) => {
      state.alerts.unshift(action.payload);
    },
    
    // Update alert (used for real-time updates)
    updateAlert: (state, action) => {
      const index = state.alerts.findIndex(alert => alert.id === action.payload.id);
      if (index !== -1) {
        state.alerts[index] = action.payload;
      }
    },
    
    // Clear error state
    clearError: (state) => {
      state.error = null;
      state.subscriptionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAlerts
      .addCase(fetchAlerts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAlerts.fulfilled, (state, action) => {
        state.alerts = action.payload.alerts;
        state.loading = false;
      })
      .addCase(fetchAlerts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // dismissAlert
      .addCase(dismissAlert.fulfilled, (state, action) => {
        state.alerts = state.alerts.filter(alert => alert.id !== action.payload);
      })
      
      // subscribeToAlerts
      .addCase(subscribeToAlerts.pending, (state) => {
        state.subscriptionLoading = true;
        state.subscriptionError = null;
      })
      .addCase(subscribeToAlerts.fulfilled, (state, action) => {
        state.subscriptions = action.payload.subscriptions;
        state.subscriptionLoading = false;
      })
      .addCase(subscribeToAlerts.rejected, (state, action) => {
        state.subscriptionLoading = false;
        state.subscriptionError = action.payload;
      })
      
      // unsubscribeFromAlerts
      .addCase(unsubscribeFromAlerts.pending, (state) => {
        state.subscriptionLoading = true;
        state.subscriptionError = null;
      })
      .addCase(unsubscribeFromAlerts.fulfilled, (state, action) => {
        state.subscriptions = action.payload.subscriptions;
        state.subscriptionLoading = false;
      })
      .addCase(unsubscribeFromAlerts.rejected, (state, action) => {
        state.subscriptionLoading = false;
        state.subscriptionError = action.payload;
      });
  },
});

// Export actions and reducer
export const { addAlert, updateAlert, clearError } = alertsSlice.actions;
export default alertsSlice.reducer;