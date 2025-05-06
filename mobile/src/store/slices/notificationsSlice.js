import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../api/axios';

// Async thunks
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/notifications');
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch notifications'
      );
    }
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`/api/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to mark notification as read'
      );
    }
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (notificationId, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/notifications/${notificationId}`);
      return notificationId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete notification'
      );
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.patch('/api/notifications/read-all');
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to mark all notifications as read'
      );
    }
  }
);

export const clearAllNotifications = createAsyncThunk(
  'notifications/clearAllNotifications',
  async (_, { rejectWithValue }) => {
    try {
      await axios.delete('/api/notifications/clear-all');
      return true;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to clear all notifications'
      );
    }
  }
);

export const fetchNotificationSettings = createAsyncThunk(
  'notifications/fetchNotificationSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/notifications/settings');
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch notification settings'
      );
    }
  }
);

export const updateNotificationSettings = createAsyncThunk(
  'notifications/updateNotificationSettings',
  async (settings, { rejectWithValue }) => {
    try {
      const response = await axios.put('/api/notifications/settings', settings);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update notification settings'
      );
    }
  }
);

export const resetNotificationSettings = createAsyncThunk(
  'notifications/resetNotificationSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/notifications/settings/reset');
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to reset notification settings'
      );
    }
  }
);

// Define the initial state
const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  settings: {
    pushEnabled: true,
    emailEnabled: false,
    quietHoursEnabled: false,
    quietHours: {
      start: '22:00',
      end: '07:00',
    },
    categories: {
      alerts: {
        weather: true,
        safety: true,
        traffic: true,
        health: true,
      },
      social: {
        likes: true,
        comments: true,
        mentions: true,
        follows: true,
      },
      bookings: {
        confirmations: true,
        reminders: true,
        changes: true,
        cancellations: true,
      },
      messages: {
        newMessages: true,
        groupMessages: true,
      },
    },
  },
  settingsLoading: false,
  settingsError: null,
};

// Create the notifications slice
const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Add a new notification (used for real-time updates)
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
      state.unreadCount += 1;
    },
    
    // Update unread count (used when app is opened)
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    
    // Clear error state
    clearError: (state) => {
      state.error = null;
      state.settingsError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchNotifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notifications = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
        state.loading = false;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // markAsRead
      .addCase(markAsRead.fulfilled, (state, action) => {
        const index = state.notifications.findIndex(
          notification => notification.id === action.payload.id
        );
        
        if (index !== -1) {
          state.notifications[index].read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      
      // deleteNotification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const notificationToRemove = state.notifications.find(
          notification => notification.id === action.payload
        );
        
        state.notifications = state.notifications.filter(
          notification => notification.id !== action.payload
        );
        
        if (notificationToRemove && !notificationToRemove.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      
      // markAllAsRead
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map(notification => ({
          ...notification,
          read: true
        }));
        state.unreadCount = 0;
      })
      
      // clearAllNotifications
      .addCase(clearAllNotifications.fulfilled, (state) => {
        state.notifications = [];
        state.unreadCount = 0;
      })
      
      // fetchNotificationSettings
      .addCase(fetchNotificationSettings.pending, (state) => {
        state.settingsLoading = true;
        state.settingsError = null;
      })
      .addCase(fetchNotificationSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
        state.settingsLoading = false;
      })
      .addCase(fetchNotificationSettings.rejected, (state, action) => {
        state.settingsLoading = false;
        state.settingsError = action.payload;
      })
      
      // updateNotificationSettings
      .addCase(updateNotificationSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
      })
      
      // resetNotificationSettings
      .addCase(resetNotificationSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
      });
  },
});

// Export actions and reducer
export const { addNotification, setUnreadCount, clearError } = notificationsSlice.actions;
export default notificationsSlice.reducer;