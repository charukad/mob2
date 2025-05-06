import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../api/axios';

// Async thunks
export const fetchVehicles = createAsyncThunk(
  'vehicles/fetchVehicles',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/vehicles', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch vehicles'
      );
    }
  }
);

export const fetchVehicleById = createAsyncThunk(
  'vehicles/fetchVehicleById',
  async (vehicleId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/vehicles/${vehicleId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch vehicle details'
      );
    }
  }
);

export const addVehicle = createAsyncThunk(
  'vehicles/addVehicle',
  async (vehicleData, { rejectWithValue }) => {
    try {
      console.log('Calling API to add vehicle:', vehicleData);
      
      // Corrected endpoint - Axios will prepend the baseURL (/api)
      const response = await axios.post('/vehicles', vehicleData);
      
      console.log('API response success:', response.data);
      return response.data;
    } catch (error) {
      // Log detailed error information
      console.log('API error details:', error.response?.data || error.message);
      console.log('Error response status:', error.response?.status);
      console.log('Error request:', error.request || 'No request info');
      console.log('Error config:', error.config || 'No config info');
      
      // Try to include as much useful information as possible in the rejection
      const errorInfo = {
        message: error.response?.data?.message || error.message || 'Failed to add vehicle',
        status: error.response?.status,
        data: error.response?.data,
        errors: error.response?.data?.errors || {},
      };
      
      if (error.response?.data?.errors) {
        // If server returned validation errors
        return rejectWithValue({
          ...errorInfo,
          message: error.response.data.message || 'Validation failed',
        });
      }
      
      return rejectWithValue(errorInfo);
    }
  }
);

// Initial state
const initialState = {
  vehicles: [],
  currentVehicle: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  }
};

// Create the slice
const vehiclesSlice = createSlice({
  name: 'vehicles',
  initialState,
  reducers: {
    clearVehiclesError: (state) => {
      state.error = null;
    },
    clearCurrentVehicle: (state) => {
      state.currentVehicle = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchVehicles
      .addCase(fetchVehicles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVehicles.fulfilled, (state, action) => {
        state.vehicles = action.payload.vehicles;
        state.pagination = action.payload.pagination || state.pagination;
        state.loading = false;
      })
      .addCase(fetchVehicles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Handle fetchVehicleById
      .addCase(fetchVehicleById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVehicleById.fulfilled, (state, action) => {
        state.currentVehicle = action.payload;
        state.loading = false;
      })
      .addCase(fetchVehicleById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Handle addVehicle
      .addCase(addVehicle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addVehicle.fulfilled, (state, action) => {
        state.vehicles.push(action.payload);
        state.loading = false;
      })
      .addCase(addVehicle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearVehiclesError, clearCurrentVehicle } = vehiclesSlice.actions;
export default vehiclesSlice.reducer;