import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../api/axios';

// Async thunks
export const fetchPaymentMethods = createAsyncThunk(
  'payments/fetchPaymentMethods',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/payments/methods');
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch payment methods'
      );
    }
  }
);

export const addPaymentMethod = createAsyncThunk(
  'payments/addPaymentMethod',
  async (paymentMethodData, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/payments/methods', paymentMethodData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to add payment method'
      );
    }
  }
);

export const deletePaymentMethod = createAsyncThunk(
  'payments/deletePaymentMethod',
  async (paymentMethodId, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/payments/methods/${paymentMethodId}`);
      return paymentMethodId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete payment method'
      );
    }
  }
);

export const setDefaultPaymentMethod = createAsyncThunk(
  'payments/setDefaultPaymentMethod',
  async (paymentMethodId, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/payments/methods/${paymentMethodId}/default`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to set default payment method'
      );
    }
  }
);

export const processPayment = createAsyncThunk(
  'payments/processPayment',
  async (paymentData, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/payments/process', paymentData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Payment processing failed'
      );
    }
  }
);

export const fetchTransactions = createAsyncThunk(
  'payments/fetchTransactions',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/payments/transactions', { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch transactions'
      );
    }
  }
);

export const fetchTransactionById = createAsyncThunk(
  'payments/fetchTransactionById',
  async (transactionId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/payments/transactions/${transactionId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch transaction details'
      );
    }
  }
);

// Initial state
const initialState = {
  paymentMethods: [],
  defaultPaymentMethodId: null,
  transactions: [],
  currentTransaction: null,
  loading: false,
  error: null,
  processingPayment: false,
  paymentError: null
};

// Create the slice
const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    clearPaymentError: (state) => {
      state.error = null;
      state.paymentError = null;
    },
    clearCurrentTransaction: (state) => {
      state.currentTransaction = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchPaymentMethods
      .addCase(fetchPaymentMethods.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentMethods.fulfilled, (state, action) => {
        state.paymentMethods = action.payload.paymentMethods;
        state.defaultPaymentMethodId = action.payload.defaultPaymentMethodId;
        state.loading = false;
      })
      .addCase(fetchPaymentMethods.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Handle addPaymentMethod
      .addCase(addPaymentMethod.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addPaymentMethod.fulfilled, (state, action) => {
        state.paymentMethods.push(action.payload);
        state.loading = false;
      })
      .addCase(addPaymentMethod.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Handle deletePaymentMethod
      .addCase(deletePaymentMethod.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePaymentMethod.fulfilled, (state, action) => {
        state.paymentMethods = state.paymentMethods.filter(
          method => method.id !== action.payload
        );
        if (state.defaultPaymentMethodId === action.payload) {
          state.defaultPaymentMethodId = null;
        }
        state.loading = false;
      })
      .addCase(deletePaymentMethod.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Handle setDefaultPaymentMethod
      .addCase(setDefaultPaymentMethod.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(setDefaultPaymentMethod.fulfilled, (state, action) => {
        state.defaultPaymentMethodId = action.payload.defaultPaymentMethodId;
        state.loading = false;
      })
      .addCase(setDefaultPaymentMethod.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Handle processPayment
      .addCase(processPayment.pending, (state) => {
        state.processingPayment = true;
        state.paymentError = null;
      })
      .addCase(processPayment.fulfilled, (state, action) => {
        state.currentTransaction = action.payload;
        state.processingPayment = false;
      })
      .addCase(processPayment.rejected, (state, action) => {
        state.processingPayment = false;
        state.paymentError = action.payload;
      })
      
      // Handle fetchTransactions
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.transactions = action.payload.transactions;
        state.loading = false;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Handle fetchTransactionById
      .addCase(fetchTransactionById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactionById.fulfilled, (state, action) => {
        state.currentTransaction = action.payload;
        state.loading = false;
      })
      .addCase(fetchTransactionById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearPaymentError, clearCurrentTransaction } = paymentsSlice.actions;
export default paymentsSlice.reducer;