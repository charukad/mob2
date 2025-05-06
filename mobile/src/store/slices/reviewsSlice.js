import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../api/axios';

// Async thunks
export const fetchReviews = createAsyncThunk(
  'reviews/fetchReviews',
  async ({ entityId, entityType }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/reviews/${entityType}/${entityId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch reviews'
      );
    }
  }
);

export const fetchMyReviews = createAsyncThunk(
  'reviews/fetchMyReviews',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/reviews/my-reviews');
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch your reviews'
      );
    }
  }
);

export const createReview = createAsyncThunk(
  'reviews/createReview',
  async (reviewData, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `/api/reviews/${reviewData.entityType}/${reviewData.entityId}`, 
        reviewData
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create review'
      );
    }
  }
);

export const updateReview = createAsyncThunk(
  'reviews/updateReview',
  async ({ reviewId, reviewData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/reviews/${reviewId}`, reviewData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update review'
      );
    }
  }
);

export const deleteReview = createAsyncThunk(
  'reviews/deleteReview',
  async (reviewId, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/reviews/${reviewId}`);
      return reviewId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete review'
      );
    }
  }
);

export const markReviewAsHelpful = createAsyncThunk(
  'reviews/markReviewAsHelpful',
  async (reviewId, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/reviews/${reviewId}/helpful`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to mark review as helpful'
      );
    }
  }
);

export const reportReview = createAsyncThunk(
  'reviews/reportReview',
  async (reviewId, { rejectWithValue }) => {
    try {
      await axios.post(`/api/reviews/${reviewId}/report`);
      return reviewId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to report review'
      );
    }
  }
);

export const replyToReview = createAsyncThunk(
  'reviews/replyToReview',
  async ({ reviewId, reply }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`/api/reviews/${reviewId}/reply`, { reply });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to reply to review'
      );
    }
  }
);

// Define initial state
const initialState = {
  reviews: [],
  myReviews: [],
  summary: null,
  loading: false,
  error: null,
  submitting: false,
  submitError: null
};

// Create reviews slice
const reviewsSlice = createSlice({
  name: 'reviews',
  initialState,
  reducers: {
    clearReviewsError: (state) => {
      state.error = null;
      state.submitError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch reviews for an entity
      .addCase(fetchReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.reviews = action.payload.reviews;
        state.summary = action.payload.summary;
        state.loading = false;
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch user's own reviews
      .addCase(fetchMyReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyReviews.fulfilled, (state, action) => {
        state.myReviews = action.payload.reviews;
        state.loading = false;
      })
      .addCase(fetchMyReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create review
      .addCase(createReview.pending, (state) => {
        state.submitting = true;
        state.submitError = null;
      })
      .addCase(createReview.fulfilled, (state, action) => {
        // Add the new review to the list
        state.reviews.unshift(action.payload.review);
        state.summary = action.payload.summary;
        
        // Also add to my reviews if available
        if (state.myReviews) {
          state.myReviews.unshift(action.payload.review);
        }
        
        state.submitting = false;
      })
      .addCase(createReview.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.payload;
      })
      
      // Update review
      .addCase(updateReview.pending, (state) => {
        state.submitting = true;
        state.submitError = null;
      })
      .addCase(updateReview.fulfilled, (state, action) => {
        // Update in reviews list
        const reviewIndex = state.reviews.findIndex(
          review => review.id === action.payload.review.id
        );
        
        if (reviewIndex !== -1) {
          state.reviews[reviewIndex] = action.payload.review;
        }
        
        // Update in my reviews list
        const myReviewIndex = state.myReviews?.findIndex(
          review => review.id === action.payload.review.id
        );
        
        if (myReviewIndex !== -1) {
          state.myReviews[myReviewIndex] = action.payload.review;
        }
        
        // Update summary if provided
        if (action.payload.summary) {
          state.summary = action.payload.summary;
        }
        
        state.submitting = false;
      })
      .addCase(updateReview.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.payload;
      })
      
      // Delete review
      .addCase(deleteReview.pending, (state) => {
        state.submitting = true;
        state.submitError = null;
      })
      .addCase(deleteReview.fulfilled, (state, action) => {
        // Remove from reviews list
        state.reviews = state.reviews.filter(
          review => review.id !== action.payload
        );
        
        // Remove from my reviews list
        if (state.myReviews) {
          state.myReviews = state.myReviews.filter(
            review => review.id !== action.payload
          );
        }
        
        state.submitting = false;
      })
      .addCase(deleteReview.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.payload;
      })
      
      // Mark review as helpful
      .addCase(markReviewAsHelpful.fulfilled, (state, action) => {
        // Update in reviews list
        const reviewIndex = state.reviews.findIndex(
          review => review.id === action.payload.reviewId
        );
        
        if (reviewIndex !== -1) {
          state.reviews[reviewIndex].helpfulCount = action.payload.helpfulCount;
          state.reviews[reviewIndex].foundHelpful = action.payload.foundHelpful;
        }
        
        // Update in my reviews list
        const myReviewIndex = state.myReviews?.findIndex(
          review => review.id === action.payload.reviewId
        );
        
        if (myReviewIndex !== -1) {
          state.myReviews[myReviewIndex].helpfulCount = action.payload.helpfulCount;
          state.myReviews[myReviewIndex].foundHelpful = action.payload.foundHelpful;
        }
      })
      
      // Reply to review
      .addCase(replyToReview.fulfilled, (state, action) => {
        // Update in reviews list
        const reviewIndex = state.reviews.findIndex(
          review => review.id === action.payload.reviewId
        );
        
        if (reviewIndex !== -1) {
          state.reviews[reviewIndex].response = action.payload.response;
        }
        
        // Update in my reviews list
        const myReviewIndex = state.myReviews?.findIndex(
          review => review.id === action.payload.reviewId
        );
        
        if (myReviewIndex !== -1) {
          state.myReviews[myReviewIndex].response = action.payload.response;
        }
      });
  }
});

export const { clearReviewsError } = reviewsSlice.actions;
export default reviewsSlice.reducer;