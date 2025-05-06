import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../api/axios';

// Async thunks
export const fetchGuides = createAsyncThunk(
  'guides/fetchGuides',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/guides', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch guides'
      );
    }
  }
);

export const fetchGuideById = createAsyncThunk(
  'guides/fetchGuideById',
  async (guideId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/guides/${guideId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch guide details'
      );
    }
  }
);

// Initial state
const initialState = {
  guides: [],
  currentGuide: null,
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
const guidesSlice = createSlice({
  name: 'guides',
  initialState,
  reducers: {
    clearGuidesError: (state) => {
      state.error = null;
    },
    clearCurrentGuide: (state) => {
      state.currentGuide = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchGuides
      .addCase(fetchGuides.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGuides.fulfilled, (state, action) => {
        state.guides = action.payload.guides;
        state.pagination = action.payload.pagination || state.pagination;
        state.loading = false;
      })
      .addCase(fetchGuides.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Handle fetchGuideById
      .addCase(fetchGuideById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGuideById.fulfilled, (state, action) => {
        state.currentGuide = action.payload;
        state.loading = false;
      })
      .addCase(fetchGuideById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearGuidesError, clearCurrentGuide } = guidesSlice.actions;
export default guidesSlice.reducer;