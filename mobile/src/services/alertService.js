import axios from '../api/axios';
import notificationService from './notificationService';
import weatherService from './weatherService';
import { store } from '../store';
import { addAlert, updateAlert } from '../store/slices/alertsSlice';

class AlertService {
  constructor() {
    this.pollingInterval = null;
    this.pollingEnabled = false;
    this.pollingFrequency = 5 * 60 * 1000; // 5 minutes
  }
  
  // Initialize alert service
  init() {
    // Start polling for alerts
    this.startPolling();
    return true;
  }
  
  // Clean up polling on app close
  cleanup() {
    this.stopPolling();
  }
  
  // Start polling for alerts
  startPolling() {
    if (this.pollingInterval) {
      return;
    }
    
    this.pollingEnabled = true;
    
    // Perform initial check
    this.checkForAlerts();
    
    // Set up polling interval
    this.pollingInterval = setInterval(() => {
      if (this.pollingEnabled) {
        this.checkForAlerts();
      }
    }, this.pollingFrequency);
  }
  
  // Stop polling for alerts
  stopPolling() {
    this.pollingEnabled = false;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
  
  // Check for all types of alerts
  async checkForAlerts() {
    try {
      // Check weather alerts
      await this.checkWeatherAlerts();
      
      // Check travel advisories
      await this.checkTravelAdvisories();
      
      // Check traffic alerts
      await this.checkTrafficAlerts();
      
      // Check health advisories
      await this.checkHealthAdvisories();
      
      return true;
    } catch (error) {
      console.error('Error checking for alerts:', error);
      return false;
    }
  }
  
  // Check for weather alerts
  async checkWeatherAlerts() {
    try {
      // Get the user's current location or itinerary locations
      const locations = await this.getRelevantLocations();
      
      // Skip if no locations
      if (!locations || locations.length === 0) {
        return [];
      }
      
      // Use weather service to check for alerts
      const weatherAlerts = await weatherService.getWeatherAlerts(locations);
      
      // Process and add each alert to the store
      weatherAlerts.forEach(alert => {
        store.dispatch(addAlert({
          ...alert,
          type: 'weather',
          timestamp: new Date().toISOString()
        }));
      });
      
      return weatherAlerts;
    } catch (error) {
      console.error('Error checking weather alerts:', error);
      return [];
    }
  }
  
  // Check for travel advisories
  async checkTravelAdvisories() {
    try {
      const response = await axios.get('/api/alerts/travel-advisories');
      
      response.data.advisories.forEach(advisory => {
        store.dispatch(addAlert({
          ...advisory,
          type: 'safety',
          timestamp: new Date().toISOString()
        }));
      });
      
      return response.data.advisories;
    } catch (error) {
      console.error('Error checking travel advisories:', error);
      return [];
    }
  }
  
  // Check for traffic alerts
  async checkTrafficAlerts() {
    try {
      // Get current itinerary route if any
      const routes = await this.getCurrentRoutes();
      
      if (!routes || routes.length === 0) {
        return [];
      }
      
      const response = await axios.post('/api/alerts/traffic', { routes });
      
      response.data.trafficAlerts.forEach(alert => {
        store.dispatch(addAlert({
          ...alert,
          type: 'traffic',
          timestamp: new Date().toISOString()
        }));
      });
      
      return response.data.trafficAlerts;
    } catch (error) {
      console.error('Error checking traffic alerts:', error);
      return [];
    }
  }
  
  // Check for health advisories
  async checkHealthAdvisories() {
    try {
      const response = await axios.get('/api/alerts/health');
      
      response.data.healthAdvisories.forEach(advisory => {
        store.dispatch(addAlert({
          ...advisory,
          type: 'health',
          timestamp: new Date().toISOString()
        }));
      });
      
      return response.data.healthAdvisories;
    } catch (error) {
      console.error('Error checking health advisories:', error);
      return [];
    }
  }
  
  // Get user's current location and/or planned itinerary locations
  async getRelevantLocations() {
    try {
      const response = await axios.get('/api/alerts/relevant-locations');
      return response.data.locations;
    } catch (error) {
      console.error('Error fetching relevant locations:', error);
      return [];
    }
  }
  
  // Get current routes from active itineraries
  async getCurrentRoutes() {
    try {
      const response = await axios.get('/api/alerts/current-routes');
      return response.data.routes;
    } catch (error) {
      console.error('Error fetching current routes:', error);
      return [];
    }
  }
  
  // Dismiss an alert
  async dismissAlert(alertId) {
    try {
      await axios.post(`/api/alerts/${alertId}/dismiss`);
      return true;
    } catch (error) {
      console.error('Error dismissing alert:', error);
      return false;
    }
  }
  
  // Subscribe to location-based alerts
  async subscribeToLocation(locationId) {
    try {
      const response = await axios.post('/api/alerts/subscribe', {
        locationIds: [locationId]
      });
      
      return response.data;
    } catch (error) {
      console.error('Error subscribing to location alerts:', error);
      throw error;
    }
  }
  
  // Unsubscribe from location-based alerts
  async unsubscribeFromLocation(locationId) {
    try {
      const response = await axios.post('/api/alerts/unsubscribe', {
        locationIds: [locationId]
      });
      
      return response.data;
    } catch (error) {
      console.error('Error unsubscribing from location alerts:', error);
      throw error;
    }
  }
  
  // Get active alert subscriptions
  async getSubscriptions() {
    try {
      const response = await axios.get('/api/alerts/subscriptions');
      return response.data.subscriptions;
    } catch (error) {
      console.error('Error fetching alert subscriptions:', error);
      return [];
    }
  }
  
  // Create a local notification for a critical alert
  async notifyUserOfCriticalAlert(alert) {
    try {
      // Create notification data
      const notificationData = {
        type: 'alert',
        alert: alert,
        navigationRoute: 'Alerts',
      };
      
      // Schedule the local notification
      await notificationService.scheduleLocalNotification(
        alert.title,
        alert.description,
        notificationData
      );
      
      return true;
    } catch (error) {
      console.error('Error creating alert notification:', error);
      return false;
    }
  }
}

// Create and export singleton instance
const alertService = new AlertService();
export default alertService;