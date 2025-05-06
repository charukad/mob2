import AsyncStorage from '@react-native-async-storage/async-storage';
import { subscribeToNetworkChanges, getNetworkState, setBypassNetworkChecks } from '../utils/networkUtils';

class OfflineService {
  constructor() {
    this.isOnline = false;
    this.listeners = [];
    this.pendingActions = [];
    this.unsubscribe = null;
    this.initialized = false;
    this.bypassChecks = false;
  }

  /**
   * Initialize the offline service
   */
  async init() {
    if (this.initialized) return;
    
    // Check if we should bypass network checks (for local development)
    try {
      const bypassSetting = await AsyncStorage.getItem('bypassNetworkChecks');
      this.bypassChecks = bypassSetting === 'true';
      
      if (this.bypassChecks) {
        this.isOnline = true;
        console.log('[OfflineService] Network checks bypassed, assuming online');
      }
    } catch (error) {
      console.error('[OfflineService] Error checking bypass setting:', error);
    }
    
    // If not bypassing, check network state
    if (!this.bypassChecks) {
      this.isOnline = await getNetworkState(true);
    }
    
    // Subscribe to network changes
    this.unsubscribe = subscribeToNetworkChanges(this.handleNetworkChange);
    
    // Load pending actions
    await this.loadPendingActions();
    
    this.initialized = true;
    console.log(`[OfflineService] Initialized. Online: ${this.isOnline}`);
  }

  /**
   * Handle network state changes
   * @param {boolean} isConnected - Whether we are connected to the internet
   */
  handleNetworkChange = (isConnected) => {
    // If bypassing checks, always stay online
    if (this.bypassChecks) {
      if (!this.isOnline) {
        this.isOnline = true;
        this.notifyListeners(true);
      }
      return;
    }
    
    const previousState = this.isOnline;
    this.isOnline = isConnected;
    
    // If we came back online, process pending actions
    if (!previousState && isConnected) {
      console.log('[OfflineService] Network connection restored');
      this.processPendingActions();
    }
    
    // If we went offline, notify listeners
    if (previousState && !isConnected) {
      console.log('[OfflineService] Network connection lost');
    }
    
    // Always notify listeners of network state change
    this.notifyListeners(isConnected);
  };

  /**
   * Set bypass mode for network checks
   * @param {boolean} bypass Whether to bypass checks
   */
  setBypassMode(bypass) {
    this.bypassChecks = bypass;
    
    // Update the global setting
    setBypassNetworkChecks(bypass);
    
    // If enabling bypass, set us to online
    if (bypass && !this.isOnline) {
      this.isOnline = true;
      this.notifyListeners(true);
      
      // Process any pending actions
      this.processPendingActions();
    }
    
    return bypass;
  }

  /**
   * Process actions that were queued while offline
   */
  async processPendingActions() {
    if (this.pendingActions.length === 0) return;
    
    console.log(`[OfflineService] Processing ${this.pendingActions.length} pending actions`);
    
    const actionsToProcess = [...this.pendingActions];
    this.pendingActions = [];
    
    // Save the empty pending actions list
    await this.savePendingActions();
    
    // Process each action
    for (const action of actionsToProcess) {
      try {
        // Execute the action
        console.log(`[OfflineService] Processing action: ${action.type}`);
        
        // Here you'd implement action processing logic based on your app's needs
        // For example, if it's an API call, you'd make the call now that we're online
      } catch (error) {
        console.error(`[OfflineService] Error processing action: ${action.type}`, error);
        
        // If critical, add back to pending actions
        if (action.critical) {
          this.queueAction(action);
        }
      }
    }
  }

  /**
   * Queue an action to be performed when back online
   * @param {Object} action - The action to queue
   */
  async queueAction(action) {
    this.pendingActions.push({
      ...action,
      timestamp: Date.now()
    });
    
    await this.savePendingActions();
  }

  /**
   * Save pending actions to AsyncStorage
   */
  async savePendingActions() {
    try {
      await AsyncStorage.setItem('pendingActions', JSON.stringify(this.pendingActions));
    } catch (error) {
      console.error('[OfflineService] Error saving pending actions', error);
    }
  }

  /**
   * Load pending actions from AsyncStorage
   */
  async loadPendingActions() {
    try {
      const actionsString = await AsyncStorage.getItem('pendingActions');
      if (actionsString) {
        this.pendingActions = JSON.parse(actionsString);
      }
    } catch (error) {
      console.error('[OfflineService] Error loading pending actions', error);
      this.pendingActions = [];
    }
  }

  /**
   * Subscribe to network state changes
   * @param {Function} listener - Callback for network state changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.push(listener);
    
    // Immediately notify with current state
    listener(this.isOnline);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of network state change
   * @param {boolean} isOnline - Current network state
   */
  notifyListeners(isOnline) {
    this.listeners.forEach(listener => {
      try {
        listener(isOnline);
      } catch (error) {
        console.error('[OfflineService] Error notifying listener', error);
      }
    });
  }

  /**
   * Check if we're currently online
   * @returns {boolean} Whether we're online
   */
  isNetworkAvailable() {
    return this.isOnline;
  }

  /**
   * Force a network connectivity check
   * @returns {Promise<boolean>} Updated network state
   */
  async checkConnectivity() {
    this.isOnline = await getNetworkState(true);
    return this.isOnline;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners = [];
    this.initialized = false;
  }
}

// Create and export a singleton instance
const offlineService = new OfflineService();
export default offlineService; 