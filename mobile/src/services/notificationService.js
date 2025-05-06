import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { store } from '../store';
import { addNotification, setUnreadCount } from '../store/slices/notificationsSlice';
import { addAlert } from '../store/slices/alertsSlice';
import axios from '../api/axios';

// Configure notifications behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }
  
  // Initialize notifications service
  async init() {
    // Check permissions and get token
    await this.registerForPushNotifications();
    
    // Set up notification listeners
    this.setupNotificationListeners();
    
    return true;
  }
  
  // Clean up notification listeners
  cleanup() {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }
  
  // Register for push notifications
  async registerForPushNotifications() {
    // Only proceed for apps with an Expo project ID
    if (!Constants.manifest?.extra?.expoProjectId) {
      console.warn('No Expo project ID found. Push notifications will not work.');
      return;
    }
    
    try {
      // Request permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      // If permission not granted yet, request it
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      // If permission denied, exit
      if (finalStatus !== 'granted') {
        console.log('Permission for notifications was denied');
        return;
      }
      
      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.manifest.extra.expoProjectId,
      });
      
      this.expoPushToken = tokenData.data;
      
      // Register token with backend
      if (this.expoPushToken) {
        await this.registerDeviceWithBackend(this.expoPushToken);
      }
      
      // Configure notifications for Android
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    } catch (error) {
      console.error('Error setting up push notifications:', error);
    }
  }
  
  // Set up notification listeners
  setupNotificationListeners() {
    // Handle notification received while app is running
    this.notificationListener = Notifications.addNotificationReceivedListener(
      this.handleNotification
    );
    
    // Handle user tapping notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse
    );
  }
  
  // Register device token with backend
  async registerDeviceWithBackend(token) {
    try {
      await axios.post('/api/notifications/register-device', {
        token,
        platform: Platform.OS,
      });
      console.log('Device registered for push notifications');
      return true;
    } catch (error) {
      console.error('Failed to register device for push notifications:', error);
      return false;
    }
  }
  
  // Handle received notification
  handleNotification = (notification) => {
    const data = notification.request.content.data;
    
    // Update Redux store based on notification type
    if (data.type === 'alert') {
      store.dispatch(addAlert(data.alert));
    } else {
      store.dispatch(addNotification(data.notification));
    }
  };
  
  // Handle user tapping notification
  handleNotificationResponse = (response) => {
    const data = response.notification.request.content.data;
    
    // Handle navigation based on notification type
    if (data.navigationRoute) {
      // Navigation will need to be handled at the app level
      // This service just prepares the data
      
      // Mark as read if it's a standard notification
      if (data.notification && data.notification.id) {
        this.markNotificationAsRead(data.notification.id);
      }
    }
  };
  
  // Get badge count from backend and update app
  async refreshUnreadCount() {
    try {
      const response = await axios.get('/api/notifications/unread-count');
      store.dispatch(setUnreadCount(response.data.count));
      await this.setBadgeCount(response.data.count);
      return response.data.count;
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      return 0;
    }
  }
  
  // Mark notification as read
  async markNotificationAsRead(notificationId) {
    try {
      await axios.patch(`/api/notifications/${notificationId}/read`);
      return true;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  }
  
  // Set app badge count
  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
      return true;
    } catch (error) {
      console.error('Failed to set badge count:', error);
      return false;
    }
  }
  
  // Clear all notification badges
  async clearBadges() {
    try {
      await Notifications.setBadgeCountAsync(0);
      return true;
    } catch (error) {
      console.error('Failed to clear badges:', error);
      return false;
    }
  }
  
  // Schedule a local notification
  async scheduleLocalNotification(title, body, data = {}, trigger = null) {
    try {
      const notificationContent = {
        title,
        body,
        data,
      };
      
      // Default trigger: show immediately
      const notificationTrigger = trigger || null;
      
      const identifier = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: notificationTrigger,
      });
      
      return identifier;
    } catch (error) {
      console.error('Failed to schedule local notification:', error);
      return null;
    }
  }
  
  // Cancel a specific scheduled notification
  async cancelScheduledNotification(notificationIdentifier) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationIdentifier);
      return true;
    } catch (error) {
      console.error('Failed to cancel scheduled notification:', error);
      return false;
    }
  }
  
  // Cancel all scheduled notifications
  async cancelAllScheduledNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return true;
    } catch (error) {
      console.error('Failed to cancel all scheduled notifications:', error);
      return false;
    }
  }
}

// Create and export singleton instance
const notificationService = new NotificationService();
export default notificationService;