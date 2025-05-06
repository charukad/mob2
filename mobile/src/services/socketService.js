import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/api';
import store from '../store';
import NetInfo from '@react-native-community/netinfo';
import { ENV, logger } from '../utils/debugUtils';

/**
 * SocketService - Manages WebSocket connections for real-time communication
 * Handles user authentication, room management, message sending, and error recovery
 */
class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = ENV.services.socket.reconnectAttempts;
    this.reconnectInterval = ENV.services.socket.reconnectDelay;
    this.messageListeners = [];
    this.rooms = new Set();
    this.connectionListeners = new Set(); // Track connection state listeners
    this.connectionState = 'disconnected'; // disconnected, connecting, connected, reconnecting
    this.connectionPromise = null; // To avoid multiple connection attempts
    
    // Enable/disable logging based on environment config
    this.enableLogging = ENV.services.socket.logEvents;
  }

  /**
   * Initialize socket connection with authentication
   * @param {boolean} forceReconnect - Force a new connection even if already connected
   * @returns {Promise<boolean>} - Connection success status
   */
  async init(forceReconnect = false) {
    // Return existing connection if already connected
    if (this.socket && this.connected && !forceReconnect) {
      logger.log('[SocketService] Already connected, skipping initialization');
      return Promise.resolve(true);
    }

    // If already trying to connect, return the existing promise
    if (this.connectionPromise && this.connectionState === 'connecting') {
      logger.log('[SocketService] Connection already in progress, returning existing promise');
      return this.connectionPromise;
    }

    // Set connection state and create new promise
    this.connectionState = 'connecting';
    this.connectionPromise = this._initializeSocketConnection();
    
    // Update connection state based on result
    this.connectionPromise.then(success => {
      this.connectionState = success ? 'connected' : 'disconnected';
      this.connectionPromise = null;
      return success;
    }).catch(error => {
      this.connectionState = 'disconnected';
      this.connectionPromise = null;
      logger.error('[SocketService] Connection promise rejected:', error);
      return false;
    });

    return this.connectionPromise;
  }

  /**
   * Create and initialize the socket connection
   * @private
   * @returns {Promise<boolean>} - Connection success status
   */
  async _initializeSocketConnection() {
    try {
      // Check network connectivity first
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        if (__DEV__) console.log('[SocketService] No network connection available');
        return false;
      }

      // Get auth token
      const token = await this._getAuthToken();
      if (!token) {
        if (__DEV__) console.log('[SocketService] Connection failed: No auth token available');
        return false;
      }

      if (__DEV__) console.log('[SocketService] Initializing connection with token');
      
      // Clear any existing socket connection
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }
      
      // Format base URL correctly (remove /api suffix for socket connection)
      const socketUrl = this._formatSocketUrl(API_URL);
      if (__DEV__) console.log('[SocketService] Using socket URL:', socketUrl);
      
      // Initialize socket connection with optimized options
      this.socket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'], // Try websocket first, fall back to polling
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 15000,
        forceNew: true,
        path: '/socket.io',
        query: { token }, // Some server implementations expect token in query
      });

      // Set up event listeners with proper binding
      this._setupSocketEventListeners();
      
      // Wait for connection to establish or time out
      return await this._waitForConnection();
    } catch (error) {
      if (__DEV__) console.error('[SocketService] Initialization error:', error);
      this.connectionState = 'disconnected';
      return false;
    }
  }

  /**
   * Format the API URL to a valid socket.io connection URL
   * @private
   * @param {string} url - The API URL 
   * @returns {string} - Formatted socket URL
   */
  _formatSocketUrl(url) {
    if (!url) return null;
    
    // Make sure URL doesn't have trailing slash
    let baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    
    // Remove the /api suffix if present
    if (baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.slice(0, -4);
    }
    
    return baseUrl;
  }

  /**
   * Set up all socket event listeners
   * @private
   */
  _setupSocketEventListeners() {
    this.socket.on('connect', this._handleConnect);
    this.socket.on('disconnect', this._handleDisconnect);
    this.socket.on('error', this._handleError);
    this.socket.on('reconnect_attempt', this._handleReconnectAttempt);
    this.socket.on('reconnect_failed', this._handleReconnectFailed);
    this.socket.on('connect_error', this._handleConnectError);
    
    // Message-related events
    this.socket.on('new_message', data => this._broadcastToListeners('new_message', data));
    this.socket.on('message_read', data => this._broadcastToListeners('message_read', data));
    this.socket.on('typing', data => this._broadcastToListeners('typing', data));
    
    // Automatically rejoin rooms on reconnect
    this.socket.on('connect', this._rejoinRooms);
  }

  /**
   * Wait for connection to establish or time out
   * @private
   * @returns {Promise<boolean>} - Connection success status
   */
  _waitForConnection() {
    return new Promise((resolve) => {
      // Create a timeout to avoid hanging forever
      const connectionTimeout = setTimeout(() => {
        if (!this.connected) {
          if (__DEV__) console.log('[SocketService] Connection timed out');
          resolve(false);
        }
      }, 5000);
      
      // Resolve immediately if connection established
      this.socket.once('connect', () => {
        clearTimeout(connectionTimeout);
        resolve(true);
      });
      
      // Also handle connection errors
      this.socket.once('connect_error', (error) => {
        if (__DEV__) console.error('[SocketService] Connection error during wait:', error);
        clearTimeout(connectionTimeout);
        resolve(false);
      });
    });
  }

  /**
   * Get authentication token from storage
   * @private
   * @returns {Promise<string|null>} - Auth token or null
   */
  async _getAuthToken() {
    try {
      // Try primary token location
      let token = await AsyncStorage.getItem('authToken');
      
      // Try alternate storage locations if needed
      if (!token) {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          try {
            const parsed = JSON.parse(userData);
            token = parsed?.token || null;
          } catch (e) {
            if (__DEV__) console.error('[SocketService] Error parsing userData:', e);
          }
        }
      }
      
      return token;
    } catch (error) {
      if (__DEV__) console.error('[SocketService] Error getting auth token:', error);
      return null;
    }
  }

  /* Socket Event Handlers */

  _handleConnect = () => {
    if (__DEV__) console.log('[SocketService] Connected successfully');
    this.connected = true;
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;
    
    // Notify connection listeners
    this._notifyConnectionListeners('connected');
  };

  _handleDisconnect = (reason) => {
    if (__DEV__) console.log('[SocketService] Disconnected, reason:', reason);
    this.connected = false;
    this.connectionState = 'disconnected';
    
    // Notify connection listeners
    this._notifyConnectionListeners('disconnected', { reason });
  };

  _handleError = (error) => {
    if (__DEV__) console.error('[SocketService] Socket error:', error);
    
    // Notify connection listeners about error
    this._notifyConnectionListeners('error', { error });
  };

  _handleReconnectAttempt = (attempt) => {
    if (__DEV__) console.log(`[SocketService] Reconnection attempt ${attempt}/${this.maxReconnectAttempts}`);
    this.reconnectAttempts = attempt;
    this.connectionState = 'reconnecting';
    
    // Notify connection listeners
    this._notifyConnectionListeners('reconnecting', { attempt, max: this.maxReconnectAttempts });
  };

  _handleReconnectFailed = () => {
    if (__DEV__) console.log('[SocketService] Reconnection failed after maximum attempts');
    this.connectionState = 'disconnected';
    
    // Notify connection listeners
    this._notifyConnectionListeners('reconnect_failed');
  };

  _handleConnectError = (error) => {
    if (__DEV__) console.error('[SocketService] Connection error:', error?.message || 'Unknown error');
    
    // Provide detailed error information for debugging
    if (error?.message) {
      if (error.message.includes('Invalid namespace')) {
        if (__DEV__) {
          console.error('[SocketService] Invalid namespace error. Check server Socket.IO configuration:');
          console.log('- Verify API_URL is correct');
          console.log('- Check server Socket.IO namespace configuration');
          console.log('- Ensure socket.io path matches between client and server');
        }
      } else if (error.message.includes('xhr poll error')) {
        if (__DEV__) console.error('[SocketService] XHR Poll Error - Unable to reach server');
      } else if (error.message.includes('timeout')) {
        if (__DEV__) console.error('[SocketService] Connection timeout');
      }
    }
    
    // Try polling transport if websocket fails
    if (this.reconnectAttempts >= this.maxReconnectAttempts && this.socket) {
      if (__DEV__) console.log('[SocketService] Switching to polling transport after failed websocket attempts');
      this.socket.io.opts.transports = ['polling'];
    }
    
    // Notify connection listeners
    this._notifyConnectionListeners('connect_error', { error });
  };

  /**
   * Rejoin all active rooms after reconnection
   * @private
   */
  _rejoinRooms = () => {
    if (this.rooms.size > 0) {
      if (__DEV__) console.log(`[SocketService] Rejoining ${this.rooms.size} active rooms`);
      
      this.rooms.forEach(roomId => {
        if (roomId) {
          this.socket.emit('join_room', { conversationId: roomId });
          if (__DEV__) console.log(`[SocketService] Rejoined room: ${roomId}`);
        }
      });
    }
  };

  /**
   * Broadcast event to all registered listeners
   * @private
   * @param {string} eventType - The event type
   * @param {Object} data - The event data
   */
  _broadcastToListeners = (eventType, data) => {
    if (!eventType || !data) return;
    
    this.messageListeners.forEach(listener => {
      try {
        listener(eventType, data);
      } catch (error) {
        if (__DEV__) console.error('[SocketService] Error in message listener:', error);
      }
    });
  };

  /**
   * Notify all connection state listeners
   * @private
   * @param {string} state - Connection state
   * @param {Object} data - Additional state data
   */
  _notifyConnectionListeners(state, data = {}) {
    this.connectionListeners.forEach(listener => {
      try {
        listener(state, data);
      } catch (error) {
        if (__DEV__) console.error('[SocketService] Error in connection listener:', error);
      }
    });
  }

  /* Public API Methods */

  /**
   * Add a listener for message events
   * @param {Function} callback - Callback function for message events
   * @returns {Function} - Cleanup function to remove the listener
   */
  addMessageListener = (callback) => {
    if (typeof callback !== 'function') {
      if (__DEV__) console.error('[SocketService] Invalid message listener, must be a function');
      return () => {};
    }
    
    this.messageListeners.push(callback);
    return () => {
      this.messageListeners = this.messageListeners.filter(listener => listener !== callback);
    };
  };

  /**
   * Add connection state change listener
   * @param {Function} callback - Callback for connection state changes
   * @returns {Function} - Cleanup function to remove the listener
   */
  addConnectionListener = (callback) => {
    if (typeof callback !== 'function') {
      if (__DEV__) console.error('[SocketService] Invalid connection listener, must be a function');
      return () => {};
    }
    
    this.connectionListeners.add(callback);
    // Immediately notify with current state
    callback(this.connectionState, {});
    
    return () => {
      this.connectionListeners.delete(callback);
    };
  };

  /**
   * Join a conversation room
   * @param {string} conversationId - ID of the conversation to join
   * @returns {boolean} - Success status
   */
  joinRoom = (conversationId) => {
    if (!conversationId) {
      if (__DEV__) console.error('[SocketService] Cannot join room: Missing conversation ID');
      return false;
    }
    
    if (!this.socket || !this.connected) {
      if (__DEV__) console.log(`[SocketService] Cannot join room ${conversationId}: Socket not connected`);
      this.rooms.add(conversationId); // Store to join when connected
      return false;
    }

    this.socket.emit('join_room', { conversationId });
    this.rooms.add(conversationId);
    if (__DEV__) console.log(`[SocketService] Joined room: ${conversationId}`);
    return true;
  };

  /**
   * Leave a conversation room
   * @param {string} conversationId - ID of the conversation to leave
   * @returns {boolean} - Success status
   */
  leaveRoom = (conversationId) => {
    if (!conversationId) return false;
    
    this.rooms.delete(conversationId);
    
    if (!this.socket || !this.connected) {
      return false;
    }

    this.socket.emit('leave_room', { conversationId });
    if (__DEV__) console.log(`[SocketService] Left room: ${conversationId}`);
    return true;
  };

  /**
   * Send a message to a conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} message - Message text
   * @param {Object} metadata - Optional metadata
   * @returns {boolean} - Success status
   */
  sendMessage = (conversationId, message, metadata = {}) => {
    if (!conversationId || !message) {
      if (__DEV__) console.error('[SocketService] Cannot send message: Missing required parameters');
      return false;
    }
    
    if (!this.socket || !this.connected) {
      if (__DEV__) console.log('[SocketService] Cannot send message: Socket not connected');
      return false;
    }

    // Get user info from redux state
    const currentUser = store.getState()?.auth?.user;
    if (!currentUser || !currentUser._id) {
      if (__DEV__) console.log('[SocketService] Cannot send message: User not authenticated');
      return false;
    }

    // Send the message
    this.socket.emit('send_message', {
      conversationId,
      content: message,
      senderId: currentUser._id,
      timestamp: new Date().toISOString(),
      metadata
    });

    if (__DEV__) console.log(`[SocketService] Message sent to room: ${conversationId}`);
    return true;
  };

  /**
   * Mark messages as read
   * @param {string} conversationId - Conversation ID
   * @param {Array<string>} messageIds - IDs of messages to mark as read
   * @returns {boolean} - Success status
   */
  markAsRead = (conversationId, messageIds) => {
    if (!conversationId || !messageIds || !messageIds.length) {
      return false;
    }

    if (!this.socket || !this.connected) {
      return false;
    }

    this.socket.emit('mark_read', {
      conversationId,
      messageIds
    });

    return true;
  };
  
  /**
   * Send typing indicator
   * @param {string} conversationId - Conversation ID
   * @param {boolean} isTyping - Whether user is typing
   * @returns {boolean} - Success status
   */
  sendTypingStatus = (conversationId, isTyping = true) => {
    if (!conversationId) return false;
    
    if (!this.socket || !this.connected) {
      return false;
    }
    
    const currentUser = store.getState()?.auth?.user;
    if (!currentUser || !currentUser._id) {
      return false;
    }
    
    this.socket.emit('typing', {
      conversationId,
      userId: currentUser._id,
      isTyping
    });
    
    return true;
  };

  /**
   * Disconnect the socket
   */
  disconnect = () => {
    if (this.socket) {
      this.rooms.clear();
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.connectionState = 'disconnected';
      this._notifyConnectionListeners('disconnected', { reason: 'manual_disconnect' });
    }
  };

  /**
   * Check if socket is connected
   * @returns {boolean} - Connection status
   */
  isConnected = () => {
    return this.connected;
  };

  /**
   * Get current connection state
   * @returns {string} - Connection state: 'disconnected', 'connecting', 'connected', 'reconnecting'
   */
  getConnectionState = () => {
    return this.connectionState;
  };

  /* Backward compatibility aliases */
  
  joinChat = (conversationId) => {
    return this.joinRoom(conversationId);
  };

  leaveChat = (conversationId) => {
    return this.leaveRoom(conversationId);
  };

  markMessagesAsRead = (conversationId, messageIds) => {
    if (!messageIds || !Array.isArray(messageIds)) {
      if (__DEV__) console.warn('[SocketService] markMessagesAsRead called without message IDs, this method requires message IDs');
      return false;
    }
    return this.markAsRead(conversationId, messageIds);
  };
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;