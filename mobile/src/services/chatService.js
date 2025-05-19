import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, API_ENDPOINTS } from '../constants/api';
import NetInfo from '@react-native-community/netinfo';
import store from '../store';

// Storage keys
const STORAGE_KEYS = {
  CONVERSATIONS: '@chat_conversations',
  MESSAGES_PREFIX: '@chat_messages_',
  UNREAD_COUNT: '@chat_unread_count',
};

class ChatService {
  // Helper function to check if a conversation ID is temporary/local-only
  _isTemporaryConversation(conversationId) {
    if (!conversationId) return false;
    return conversationId.startsWith('temp_') || conversationId.startsWith('temp-');
  }

  // Helper function to check if a message ID is temporary/local-only
  _isTemporaryMessage(messageId) {
    if (!messageId) return false;
    return messageId.startsWith('msg_') || 
           messageId.startsWith('local_') || 
           messageId.startsWith('temp_');
  }

  // Enhanced error logging helper
  _logError(method, error, details = {}) {
    const errorInfo = {
      method,
      message: error?.message || 'Unknown error',
      code: error?.response?.status,
      data: error?.response?.data,
      isAxiosError: error?.isAxiosError || false,
      ...details
    };
    
    console.error(`[ChatService] Error in ${method}:`, JSON.stringify(errorInfo, null, 2));
    
    return errorInfo;
  }

  // Get all conversations for the current user
  async getConversations() {
    try {
      // Try to fetch from API first
      const token = await this._getAuthToken();
      if (token) {
        // Try multiple possible endpoints for fetching conversations
        let apiErrorMessage = '';
        const possibleEndpoints = [
          API_ENDPOINTS.MESSAGES.CONVERSATIONS,
          '/messages/conversations',
          '/api/messages/conversations',
          '/api/conversations',
          '/conversations'
        ];

        for (const endpoint of possibleEndpoints) {
          try {
            console.log(`[ChatService] Trying to fetch conversations from endpoint: ${endpoint}`);
            const response = await axios.get(
              `${API_URL}${endpoint}`,
              {
                headers: { 'Authorization': `Bearer ${token}` }
              }
            );
            
            if (response.data && (response.data.status === 'success' || response.data.conversations)) {
              const conversations = response.data.data?.conversations || response.data.conversations || [];
              console.log(`[ChatService] Successfully fetched ${conversations.length} conversations`);
              // Store locally for offline access
              await this._storeConversations(conversations);
              return conversations;
            }
          } catch (endpointError) {
            console.log(`[ChatService] Endpoint ${endpoint} failed: ${endpointError.message}`);
            apiErrorMessage = endpointError.message;
            // Continue to try next endpoint
          }
        }

        // If we tried all endpoints and none worked
        console.error('All API endpoints failed for fetching conversations:', apiErrorMessage);
      } else {
        console.log('[ChatService] No auth token available, using local storage');
      }
    } catch (error) {
      this._logError('getConversations', error);
      console.log('[ChatService] Falling back to local conversations due to error');
    }
    
    // If API fetch fails or no token, get from local storage
    const localConversations = await this._getStoredConversations();
    console.log(`[ChatService] Using ${localConversations.length} locally stored conversations`);
    return localConversations;
  }

  // Get messages for a specific conversation
  async getMessages(conversationId) {
    try {
      // Check if this is a temporary/local conversation
      const isLocalOnly = this._isTemporaryConversation(conversationId);
      
      if (isLocalOnly) {
        console.log(`[ChatService] Getting messages for local-only conversation: ${conversationId}`);
        // For temp conversations, only retrieve from local storage, don't try API
        return await this._getStoredMessages(conversationId);
      }
      
      // Try to fetch from API first for non-temporary conversations
      try {
        const token = await this._getAuthToken();
        if (!token) {
          throw new Error('No auth token available');
        }
        
        const endpoint = API_ENDPOINTS.MESSAGES.CONVERSATION_MESSAGES(conversationId);
        const url = `${API_URL}${endpoint}`;
        console.log(`[ChatService] Fetching messages from API: ${url}`);
        
        const response = await axios.get(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.data.status === 'success') {
          const messages = response.data.data.messages;
          // Map the server messages to the client model format before storing
          const mappedMessages = this._mapServerMessagesToClientFormat(messages);
          // Store locally for offline access
          await this._storeMessages(conversationId, mappedMessages);
          return mappedMessages;
        } else {
          // Server returned non-success status
          throw new Error(`API returned non-success status: ${response.data.status} - ${response.data.message || 'No error message'}`);
        }
      } catch (apiError) {
        // Format the error details
        this._logError('getMessages.api', apiError, { conversationId });
        
        // Rethrow with specific message for 404 errors on temp conversations
        if (apiError.response?.status === 404 && this._isTemporaryConversation(conversationId)) {
          throw new Error(`Temporary conversation ${conversationId} not found on server (expected)`);
        }
        
        // General error for other cases
        throw new Error(`API Error: ${apiError.message}`);
      }
    } catch (error) {
      this._logError('getMessages', error, { conversationId });
      
      // If error occurs, log and then try to get from local storage as fallback
      console.log(`[ChatService] Falling back to local storage for conversation: ${conversationId}`);
      return await this._getStoredMessages(conversationId);
    }
  }

  // Map server message format to client format
  _mapServerMessagesToClientFormat(messages) {
    return messages.map(msg => {
      return {
        ...msg,
        // Map 'content' to 'text' for client compatibility
        text: msg.content || msg.text || 'No message content',
        // Ensure we have both formats
        content: msg.content || msg.text || 'No message content',
        // Ensure all messages have a timestamp
        timestamp: msg.createdAt || msg.timestamp || new Date().toISOString(),
        // Default status if not provided
        status: msg.status || 'delivered'
      };
    });
  }

  // Map client message format to server format
  _mapClientMessageToServerFormat(message) {
    return {
      ...message,
      // Ensure content is set for server
      content: message.text || message.content || '',
      // Keep text for client-side compatibility
      text: message.text || message.content || ''
    };
  }

  // Get current user info from AsyncStorage
  async _getCurrentUserInfo() {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (!userJson) {
        console.log('[ChatService] No user data found in AsyncStorage');
        return null;
      }
      
      const user = JSON.parse(userJson);
      console.log(`[ChatService] Retrieved user info from AsyncStorage for ${user.email || 'unknown'}`);
      
      // Get profile image from user data if available
      const profileImage = user.profileImage || 
                          user.avatar || 
                          (user.profile?.image ? user.profile.image : null);
      
      // Construct user info object with essential properties
      return {
        _id: user._id,
        id: user._id, // Include both formats for compatibility
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        role: user.role,
        profileImage,
        firstName: user.firstName,
        lastName: user.lastName
      };
    } catch (error) {
      console.error('[ChatService] Error getting user info:', error);
      // Return minimal object in case of error
      return { name: 'Current User' };
    }
  }

  // Send a new message
  async sendMessage(recipientId, text, vehicleId = null, conversationId = null) {
    try {
      console.log(`[ChatService] Sending message to ${recipientId}, vehicleId: ${vehicleId || 'none'}, conversationId: ${conversationId || 'new'}`);
      
      // If we have a temporary conversation ID, handle locally
      if (conversationId && this._isTemporaryConversation(conversationId)) {
        console.log(`[ChatService] Sending message to temporary conversation: ${conversationId}`);
        // Create a local message with complete sender details
        const currentUserId = await this._getCurrentUserId();
        const userInfo = await this._getCurrentUserInfo();
        
        const tempMessage = {
          id: `msg_${Date.now()}`,
          text, // For client
          content: text, // For server compatibility
          senderId: currentUserId,
          senderInfo: {
            _id: currentUserId,
            name: userInfo?.name || 'Current User',
            avatar: userInfo?.profileImage || null
          },
          recipientId,
          recipientInfo: await this._getRecipientInfo(recipientId),
          timestamp: new Date().toISOString(),
          conversationId,
          vehicleId, // Always include vehicleId when provided
          status: 'sent',
          isLocal: true
        };
        
        // Add to local storage
        await this._addMessageToStorage(conversationId, tempMessage);
        
        return { message: tempMessage, conversationId };
      }
      
      // Try to send via API
      try {
        console.log(`[ChatService] Sending message via API, conversationId: ${conversationId || 'new'}, vehicleId: ${vehicleId || 'none'}`);
        const token = await this._getAuthToken();
        if (!token) {
          throw new Error('Authentication required - No auth token available');
        }
        
        // Get current user info to send with the message
        const currentUserInfo = await this._getCurrentUserInfo();
        
        // Create payload with both content and text fields
        const payload = {
          recipientId,
          text, // Keep for any client-side handling
          content: text, // This is what the server expects
          metadata: {
            senderInfo: currentUserInfo,
            recipientInfo: await this._getRecipientInfo(recipientId),
            timestamp: new Date().toISOString(),
            vehicleId: vehicleId // Include vehicleId in metadata as well for better tracking
          },
          // ALWAYS include vehicleId if provided (critical fix)
          ...(vehicleId && { vehicleId: vehicleId.toString() }),
          // Only include conversationId if it's a valid server-side ID
          ...(conversationId && !this._isTemporaryConversation(conversationId) && { conversationId })
        };
        
        const endpoint = API_ENDPOINTS.MESSAGES.SEND;
        const url = `${API_URL}${endpoint}`;
        console.log(`[ChatService] Sending message to API: ${url}`, JSON.stringify(payload, null, 2));
        
        let success = false;
        let successResponse = null;
        
        // Try the primary endpoint first
        try {
          const response = await axios.post(
            url,
            payload,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );
          
          if (response.data.status === 'success') {
            success = true;
            successResponse = response;
          } else {
            console.log(`[ChatService] Primary endpoint returned non-success:`, response.data);
          }
        } catch (primaryError) {
          console.error(`[ChatService] Primary message endpoint ${endpoint} failed:`, primaryError.message);
          
          // Try fallback endpoints if primary fails
          const fallbackEndpoints = [
            '/messages/send',
            '/messages',
            '/conversations/send'
          ];
          
          for (const fallbackEndpoint of fallbackEndpoints) {
            if (success) break;
            
            try {
              console.log(`[ChatService] Trying fallback endpoint: ${fallbackEndpoint}`);
              const fallbackResponse = await axios.post(
                `${API_URL}${fallbackEndpoint}`,
                payload,
                {
                  headers: { 'Authorization': `Bearer ${token}` }
                }
              );
              
              if (fallbackResponse.data && 
                 (fallbackResponse.data.status === 'success' || 
                  fallbackResponse.data.message || 
                  fallbackResponse.data.data?.message)) {
                success = true;
                successResponse = fallbackResponse;
                console.log(`[ChatService] Successfully sent message via fallback endpoint: ${fallbackEndpoint}`);
                break;
              }
            } catch (fallbackError) {
              console.log(`[ChatService] Fallback endpoint ${fallbackEndpoint} also failed:`, fallbackError.message);
              // Continue to the next fallback
            }
          }
          
          if (!success) {
            throw primaryError; // Re-throw the original error if all fallbacks fail
          }
        }
        
        if (success && successResponse) {
          const response = successResponse;
          const serverMessage = response.data.data?.message || response.data.message;
          const responseConversationId = response.data.data?.conversationId || response.data.conversationId;
          
          // Verify we have at least a message or can create one
          if (!serverMessage && !text) {
            throw new Error('No message data returned from server and no original text available');
          }
          
          // If no server message, create one from our original data
          const messageToMap = serverMessage || {
            id: `local_${Date.now()}`,
            content: text,
            senderId: payload.senderId || await this._getCurrentUserId(),
            conversationId: responseConversationId || conversationId,
            vehicleId: vehicleId,
            timestamp: new Date().toISOString()
          };
          
          // Map the server message to client format
          const clientMessage = this._mapServerMessagesToClientFormat([messageToMap])[0];
          
          // Use the conversation ID from the response if available, otherwise use the one we had
          const finalConversationId = responseConversationId || conversationId;
          
          console.log(`[ChatService] Message sent successfully, conversation ID: ${finalConversationId}`);
          
          // Update local storage with the new message
          if (finalConversationId) {
            await this._addMessageToStorage(finalConversationId, clientMessage);
          }
          
          return { message: clientMessage, conversationId: finalConversationId };
        } else {
          // Server returned non-success status and all fallbacks failed
          throw new Error(`Failed to send message: No successful response from any endpoint`);
        }
      } catch (apiError) {
        // Format the error details and rethrow to be caught by outer try-catch
        this._logError('sendMessage.api', apiError, { 
          recipientId, 
          conversationId,
          vehicleId,
          messageLength: text?.length
        });
        
        throw new Error(`Failed to send message: ${apiError.message}`);
      }
    } catch (error) {
      this._logError('sendMessage', error, { 
        recipientId, 
        conversationId,
        vehicleId 
      });
      
      // Create and store a local message as fallback
      console.log(`[ChatService] Creating local fallback message due to error: ${error.message}`);
      const localConversationId = conversationId || `temp_${Date.now()}`;
      
      // Get current user info
      const currentUserId = await this._getCurrentUserId();
      const userInfo = await this._getCurrentUserInfo();
      
      const localMessage = {
        id: `local_${Date.now()}`,
        text,
        content: text, // For server compatibility
        senderId: currentUserId,
        senderInfo: {
          _id: currentUserId,
          name: userInfo?.name || 'Current User',
          avatar: userInfo?.profileImage || null
        },
        recipientId,
        recipientInfo: await this._getRecipientInfo(recipientId),
        timestamp: new Date().toISOString(),
        vehicleId,
        conversationId: localConversationId,
        status: 'sent',
        isLocal: true
      };
      
      try {
        // Store locally
        await this._addMessageToStorage(localConversationId, localMessage);
        
        // If this is a new conversation, create and store it
        if (!conversationId) {
          const tempConversation = {
            id: localConversationId,
            participantId: recipientId,
            vehicleId,
            lastMessage: text,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isTemporary: true
          };
          
          const conversations = await this._getStoredConversations();
          conversations.push(tempConversation);
          await this._storeConversations(conversations);
          console.log(`[ChatService] Created new temporary conversation: ${localConversationId}`);
        }
        
        return { 
          message: localMessage, 
          conversationId: localConversationId,
          isLocal: true
        };
      } catch (storageError) {
        // If even local storage fails, log and rethrow
        this._logError('sendMessage.localStorageFallback', storageError);
        throw new Error(`Failed to save message even locally: ${storageError.message}`);
      }
    }
  }

  // Helper to get the API URL with some fallbacks
  async _getApiUrlWithFallbacks() {
    const baseApiUrl = API_URL;
    console.log(`[ChatService] Using base API URL: ${baseApiUrl}`);
    
    // The default is to use the base API URL
    return baseApiUrl;
  }

  // Get or create a conversation with a user
  async getOrCreateConversation(recipientId, vehicleId = null) {
    try {
      // Validate input parameters
      if (!recipientId) {
        throw new Error('RecipientId is required to create a conversation');
      }
      
      // Debug logging for diagnosis
      console.log(`[ChatService] getOrCreateConversation called with recipientId=${recipientId}, vehicleId=${vehicleId || 'none'}`);
      
      // Check if we have a locally stored conversation
      let stored = await this._getStoredConversations();
      
      // Extract the recipient ID if it's an object for comparison
      const recipientIdValue = typeof recipientId === 'object' && recipientId?._id 
        ? recipientId._id 
        : recipientId;
      
      console.log(`[ChatService] Searching for existing conversation with recipientId: ${recipientIdValue}, vehicleId: ${vehicleId || 'none'}`);
      
      // Convert vehicleId to string for consistent comparison if it exists
      const vehicleIdStr = vehicleId ? vehicleId.toString() : null;
      
      // Find conversation by comparing participant IDs carefully - handle both object and string IDs
      let conversation = stored.find(c => {
        // First check if vehicleId matches exactly when provided
        const vehicleMatches = vehicleIdStr 
          ? (c.vehicleId && c.vehicleId.toString() === vehicleIdStr)
          : (vehicleId === null && (c.vehicleId === null || c.vehicleId === undefined));
          
        if (!vehicleMatches) return false;
        
        // If participantId is an object, compare using _id
        if (typeof c.participantId === 'object' && c.participantId?._id) {
          return c.participantId._id.toString() === recipientIdValue.toString();
        }
        // If participantId is a string, compare directly with extracted ID
        return c.participantId && c.participantId.toString() === recipientIdValue.toString();
      });
      
      // If found a temporary conversation, just return it
      if (conversation && this._isTemporaryConversation(conversation.id)) {
        console.log(`[ChatService] Using existing temporary conversation: ${conversation.id}`);
        return conversation;
      }
      
      // If online, try to get or create via API
      const isConnected = NetInfo && (await NetInfo.fetch()).isConnected;
      if (isConnected) {
        console.log(`[ChatService] Network is connected, attempting API calls`);
        let apiSuccess = false;
        
        try {
          const token = await this._getAuthToken();
          if (!token) {
            console.log(`[ChatService] No auth token available, skipping API calls`);
            throw new Error('Authentication required - No auth token available');
          }
          
          // Prepare request payload - ALWAYS include vehicleId if provided
          const payload = { 
            recipientId: recipientIdValue,
            ...(vehicleId && { vehicleId: vehicleId.toString() })
          };
          
          console.log(`[ChatService] API payload for conversation: ${JSON.stringify(payload)}`);
          
          // Try the primary endpoint for creating/getting conversations
          try {
            const endpoint = API_ENDPOINTS.MESSAGES.CONVERSATIONS_CREATE;
            const url = `${API_URL}${endpoint}`;
            console.log(`[ChatService] Attempting to create conversation at: ${url} with payload:`, payload);
            
            const response = await axios.post(
              url,
              payload,
              {
                headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            // Check for valid response format
            if (response.data && (response.data.status === 'success') && response.data.data && response.data.data.conversation) {
              apiSuccess = true;
              conversation = response.data.data.conversation;
              console.log(`[ChatService] Successfully created conversation via API: ${conversation._id || conversation.id}`);
              
              // Ensure id is properly set (normalize the field name)
              conversation.id = conversation._id || conversation.id;
              
              // Double-check that vehicleId is properly set in the conversation
              if (vehicleId && (!conversation.vehicleId || conversation.vehicleId.toString() !== vehicleId.toString())) {
                console.log(`[ChatService] Adding vehicleId ${vehicleId} to returned conversation`);
                conversation.vehicleId = vehicleId;
              }
              
              // Update local storage
              await this._updateStoredConversation(conversation);
              return conversation;
            } else {
              console.log(`[ChatService] API returned unexpected data format:`, response.data);
              throw new Error(`API returned unexpected data format: ${JSON.stringify(response.data)}`);
            }
          } catch (error) {
            console.error(`[ChatService] Error creating conversation:`, error.message);
            
            // Try an alternate endpoint as fallback if first one failed
            try {
              const fallbackEndpoint = '/conversations';
              const fallbackUrl = `${API_URL}${fallbackEndpoint}`;
              console.log(`[ChatService] Trying fallback endpoint: ${fallbackUrl}`);
              
              const response = await axios.post(
                fallbackUrl,
                payload,
                {
                  headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
              
              if (response.data && response.data.data && response.data.data.conversation) {
                apiSuccess = true;
                conversation = response.data.data.conversation;
                console.log(`[ChatService] Successfully created conversation via fallback API: ${conversation._id || conversation.id}`);
                
                // Ensure id is properly set (normalize the field name)
                conversation.id = conversation._id || conversation.id;
                
                // Double-check that vehicleId is properly set
                if (vehicleId && (!conversation.vehicleId || conversation.vehicleId.toString() !== vehicleId.toString())) {
                  conversation.vehicleId = vehicleId;
                }
                
                // Update local storage
                await this._updateStoredConversation(conversation);
                return conversation;
              }
            } catch (fallbackError) {
              console.error(`[ChatService] Fallback endpoint also failed:`, fallbackError.message);
              throw error; // Throw the original error
            }
          }
        } catch (apiError) {
          this._logError('getOrCreateConversation.api', apiError, { 
            recipientId, 
            vehicleId 
          });
          console.log(`[ChatService] API call attempt failed: ${apiError.message}`);
          // Continue to local conversation logic
        }
      } else {
        console.log(`[ChatService] Network is not connected, skipping API calls`);
      }
      
      // If we don't have a conversation yet, create a temporary one
      if (!conversation) {
        // If we reach here, we need to create a local temporary conversation
        console.log(`[ChatService] No existing conversation found, creating temporary one for recipient ${recipientIdValue}`);
        const tempId = `temp_${Date.now()}`;
        const newTempConversation = {
          id: tempId,
          _id: tempId, // Include both formats for compatibility
          // Store both full object (to keep user details) and just the ID (for lookups)
          participants: [recipientId, "current_user"],
          participantId: recipientId,
          recipientId: recipientIdValue,
          // Always include vehicleId if provided
          vehicleId: vehicleId,
          lastMessage: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isTemporary: true
        };
        
        try {
          // Store in local storage
          stored.push(newTempConversation);
          await this._storeConversations(stored);
          console.log(`[ChatService] Successfully created temporary conversation: ${tempId} with vehicleId: ${vehicleId || 'none'}`);
          return newTempConversation;
        } catch (storageError) {
          this._logError('getOrCreateConversation.localStorage', storageError, { 
            recipientId,
            tempId,
            vehicleId
          });
          throw new Error(`Failed to store temporary conversation: ${storageError.message}`);
        }
      }
      
      // If we reach here, we found a non-temporary conversation
      return conversation;
    } catch (error) {
      this._logError('getOrCreateConversation', error, { recipientId, vehicleId });
      throw error; // Re-throw to let caller handle
    }
  }

  // Mark messages as read for a conversation
  async markMessagesAsRead(conversationId) {
    try {
      console.log(`[ChatService] Marking messages as read for: ${conversationId}`);
      
      // Don't send API request for temporary conversations
      if (this._isTemporaryConversation(conversationId)) {
        console.log(`[ChatService] Skipping mark as read for temporary conversation`);
        return true;
      }
      
      // Check if we're online and can call the API
      if (NetInfo && (await NetInfo.fetch()).isConnected) {
        try {
          const token = await this._getAuthToken();
          if (!token) {
            throw new Error('Authentication required to mark messages as read');
          }
          
          // Use the correct endpoint for marking messages as read
          const url = `${API_URL}${API_ENDPOINTS.MESSAGES.CONVERSATION_MESSAGES(conversationId)}/read`;
          console.log(`[ChatService] Marking as read via API: ${url}`);
          
          const response = await axios.post(url, {}, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.data.status === 'success') {
            console.log(`[ChatService] Messages marked as read via API`);
            
            // Update the messages locally as well
            await this._markLocalMessagesAsRead(conversationId);
            await this._updateConversationReadStatus(conversationId);
            
            return true;
          } else {
            throw new Error(`API returned non-success status: ${response.data.message || 'No error details'}`);
          }
        } catch (apiError) {
          this._logError('markMessagesAsRead.api', apiError, { conversationId });
          console.log(`[ChatService] Failed to mark messages as read via API, updating locally only`);
        }
      }
      
      // If we're offline or API call failed, at least update locally
      await this._markLocalMessagesAsRead(conversationId);
      await this._updateConversationReadStatus(conversationId);
      
      return true;
    } catch (error) {
      this._logError('markMessagesAsRead', error, { conversationId });
      // Don't throw, just return false to indicate failure
      return false;
    }
  }
  
  // Update read status for a conversation
  async _updateConversationReadStatus(conversationId) {
    try {
      const allConversations = await this._getStoredConversations();
      const updatedConversations = allConversations.map(conv => {
        if (conv.id === conversationId) {
          return { ...conv, unreadCount: 0, hasUnread: false };
        }
        return conv;
      });
      
      await this._storeConversations(updatedConversations);
    } catch (error) {
      this._logError('_updateConversationReadStatus', error, { conversationId });
    }
  }
  
  // Mark local messages as read
  async _markLocalMessagesAsRead(conversationId) {
    try {
      const messages = await this._getStoredMessages(conversationId);
      const currentUserId = await this._getCurrentUserId();
      
      const updatedMessages = messages.map(msg => {
        // Only mark messages from the other user as read
        if (msg.senderId !== currentUserId && !msg.isRead) {
          return { ...msg, isRead: true };
        }
        return msg;
      });
      
      await this._storeMessages(conversationId, updatedMessages);
    } catch (error) {
      this._logError('_markLocalMessagesAsRead', error, { conversationId });
      throw error;
    }
  }

  // Get unread message count
  async getUnreadCount() {
    try {
      // Try to fetch from API first
      const token = await this._getAuthToken();
      if (token) {
        const response = await axios.get(
          `${API_URL}${API_ENDPOINTS.MESSAGES.UNREAD_COUNT}`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        
        if (response.data.status === 'success') {
          const count = response.data.data.count;
          // Store locally
          await AsyncStorage.setItem(STORAGE_KEYS.UNREAD_COUNT, String(count));
          return count;
        }
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
      // Calculate from local storage instead
      return await this._recalculateUnreadCount();
    }
    
    // If API fetch fails, try to get from local storage
    const storedCount = await AsyncStorage.getItem(STORAGE_KEYS.UNREAD_COUNT);
    return storedCount ? parseInt(storedCount, 10) : 0;
  }

  // Recalculate unread count from local messages
  async _recalculateUnreadCount() {
    try {
      const conversations = await this._getStoredConversations();
      const currentUserId = await this._getCurrentUserId();
      
      let totalUnread = 0;
      
      for (const conversation of conversations) {
        const messages = await this._getStoredMessages(conversation.id);
        const unreadCount = messages.filter(
          msg => !msg.isRead && msg.senderId !== currentUserId
        ).length;
        
        totalUnread += unreadCount;
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.UNREAD_COUNT, String(totalUnread));
      return totalUnread;
    } catch (error) {
      console.error('Error calculating unread count:', error);
      return 0;
    }
  }

  // Add a message to a conversation locally
  async _addMessageToStorage(conversationId, message) {
    if (!conversationId) {
      console.error('Cannot add message without conversationId');
      return;
    }
    
    // Ensure message has properly formatted timestamp
    const sanitizedMessage = {
      ...message,
      // Convert Date objects to ISO strings for consistency
      timestamp: message.timestamp instanceof Date 
                ? message.timestamp.toISOString() 
                : (message.timestamp || new Date().toISOString())
    };
    
    // Get existing messages
    const messages = await this._getStoredMessages(conversationId);
    
    // Avoid duplicates
    const isDuplicate = messages.some(msg => msg.id === sanitizedMessage.id);
    if (!isDuplicate) {
      // Add new message
      messages.push(sanitizedMessage);
      
      // Store updated messages
      await this._storeMessages(conversationId, messages);
    }
    
    // Update conversation last message
    const conversations = await this._getStoredConversations();
    let found = false;
    
    const updatedConversations = conversations.map(conv => {
      if (conv.id === conversationId) {
        found = true;
        return {
          ...conv,
          lastMessage: sanitizedMessage.text,
          updatedAt: sanitizedMessage.timestamp
        };
      }
      return conv;
    });
    
    // If conversation not found, create it
    if (!found && this._isTemporaryConversation(conversationId)) {
      updatedConversations.push({
        id: conversationId,
        lastMessage: sanitizedMessage.text,
        participantId: sanitizedMessage.recipientId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isTemporary: true
      });
    }
    
    await this._storeConversations(updatedConversations);
  }

  // Get the current user ID with better error handling and logging
  async _getCurrentUserId() {
    try {
      const userString = await AsyncStorage.getItem('user');
      console.log(`[ChatService] Got user from AsyncStorage: ${userString ? 'Yes' : 'No'}`);
      
      if (userString) {
        const user = JSON.parse(userString);
        if (user && user._id) {
          console.log(`[ChatService] Using user ID: ${user._id}`);
          return user._id;
        } else {
          console.error('[ChatService] User object found but no _id property', user);
        }
      } else {
        // Try alternate storage key if 'user' doesn't exist
        const tokenData = await AsyncStorage.getItem('userData');
        if (tokenData) {
          const userData = JSON.parse(tokenData);
          if (userData && userData.user && userData.user._id) {
            console.log(`[ChatService] Found user ID in userData: ${userData.user._id}`);
            return userData.user._id;
          }
        }
      }
      
      // If we get here, we need to check if we're logged in but missing user data
      const token = await this._getAuthToken();
      if (token) {
        try {
          // Try to get user profile with the token - use correct endpoint from API_ENDPOINTS
          const response = await axios.get(
            `${API_URL}${API_ENDPOINTS.AUTH.ME}`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );
          
          if (response.data && response.data.data && response.data.data.user) {
            const user = response.data.data.user;
            // Save the user data for future use
            await AsyncStorage.setItem('user', JSON.stringify(user));
            console.log(`[ChatService] Retrieved and saved user ID: ${user._id}`);
            return user._id;
          }
        } catch (apiError) {
          console.error('[ChatService] API error getting user profile:', apiError.message);
          
          // Try alternate endpoint if first one fails
          try {
            console.log('[ChatService] Trying alternate profile endpoint');
            const altResponse = await axios.get(
              `${API_URL}${API_ENDPOINTS.USERS.PROFILE}`,
              {
                headers: { 'Authorization': `Bearer ${token}` }
              }
            );
            
            if (altResponse.data && altResponse.data.data && altResponse.data.data.user) {
              const user = altResponse.data.data.user;
              await AsyncStorage.setItem('user', JSON.stringify(user));
              console.log(`[ChatService] Retrieved and saved user ID from profile: ${user._id}`);
              return user._id;
            }
          } catch (altError) {
            console.log('[ChatService] Alternate profile endpoint also failed:', altError.message);
          }
          
          // Create a temporary default user since we have a token but couldn't get the profile
          console.log('[ChatService] Creating fallback default user');
          const defaultUser = {
            _id: 'currentuser_' + Date.now(),
            name: 'Current User',
            email: 'user@example.com',
            createdAt: new Date().toISOString()
          };
          
          try {
            // Save this default user for consistency
            await AsyncStorage.setItem('user', JSON.stringify(defaultUser));
            console.log(`[ChatService] Created and saved default user with ID: ${defaultUser._id}`);
            return defaultUser._id;
          } catch (storageError) {
            console.error('[ChatService] Error saving default user:', storageError);
          }
        }
      }
      
      console.error('[ChatService] No user ID found in storage');
      
      // Return a default temporary user ID as last resort
      // This ensures we always have a non-null value to work with
      const tempUserId = 'temp_user_' + Date.now();
      console.log(`[ChatService] Creating temporary user ID: ${tempUserId}`);
      return tempUserId;
    } catch (e) {
      console.error('[ChatService] Error getting current user ID:', e);
      
      // Even if everything fails, return a usable ID rather than null
      const emergencyUserId = 'emergency_user_' + Date.now();
      console.log(`[ChatService] Using emergency user ID: ${emergencyUserId}`);
      return emergencyUserId;
    }
  }

  // Get auth token with better logging and validation
  async _getAuthToken() {
    try {
      // Try the primary token storage location
      let token = await AsyncStorage.getItem('authToken');
      console.log(`[ChatService] Got token from AsyncStorage: ${token ? 'Yes' : 'No'}`);
      
      if (!token) {
        // Try alternate storage locations used by different auth systems
        const tokenData = await AsyncStorage.getItem('userData');
        if (tokenData) {
          const userData = JSON.parse(tokenData);
          if (userData && userData.token) {
            token = userData.token;
            console.log('[ChatService] Found token in userData');
          }
        }
        
        // Another common token location
        if (!token) {
          const authData = await AsyncStorage.getItem('auth');
          if (authData) {
            const parsedAuthData = JSON.parse(authData);
            if (parsedAuthData && parsedAuthData.token) {
              token = parsedAuthData.token;
              console.log('[ChatService] Found token in auth storage');
            }
          }
        }
      }
      
      if (!token) {
        console.error('[ChatService] No auth token found in any storage location');
        return null;
      }
      
      // Verify the token format (simple check)
      if (token.length < 20) {
        console.warn('[ChatService] Token appears to be invalid (too short)');
      }
      
      return token;
    } catch (e) {
      console.error('[ChatService] Error getting auth token:', e);
      return null;
    }
  }

  // Store conversations in AsyncStorage
  async _storeConversations(conversations) {
    await AsyncStorage.setItem(
      STORAGE_KEYS.CONVERSATIONS,
      JSON.stringify(conversations)
    );
  }

  // Get stored conversations from AsyncStorage
  async _getStoredConversations() {
    const storedConversations = await AsyncStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    return storedConversations ? JSON.parse(storedConversations) : [];
  }

  // Store messages for a conversation in AsyncStorage
  async _storeMessages(conversationId, messages) {
    await AsyncStorage.setItem(
      `${STORAGE_KEYS.MESSAGES_PREFIX}${conversationId}`,
      JSON.stringify(messages)
    );
  }

  // Get stored messages for a conversation from AsyncStorage
  async _getStoredMessages(conversationId) {
    if (!conversationId) {
      console.warn('[ChatService] Attempted to get messages without a conversationId');
      return [];
    }
    
    try {
      const storedMessages = await AsyncStorage.getItem(
        `${STORAGE_KEYS.MESSAGES_PREFIX}${conversationId}`
      );
      
      if (!storedMessages) {
        return [];
      }
      
      const parsedMessages = JSON.parse(storedMessages);
      
      // Validate and sanitize messages, ensuring text field is set
      return parsedMessages.map(msg => {
        // Ensure message has all required fields
        return {
          id: msg.id || `local_${Date.now()}${Math.random().toString(36).substring(2, 8)}`,
          // Map content to text and vice versa to ensure compatibility
          text: msg.text || msg.content || 'No message content',
          content: msg.content || msg.text || 'No message content',
          senderId: msg.senderId || 'unknown',
          timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
          status: msg.status || 'sent',
          ...msg
        };
      });
    } catch (error) {
      console.error(`[ChatService] Error getting stored messages for ${conversationId}:`, error);
      return [];
    }
  }

  // Update stored conversation in local storage
  async _updateStoredConversation(conversation) {
    const storedConversations = await this._getStoredConversations();
    const updatedConversations = storedConversations.map(c =>
      c.id === conversation.id ? conversation : c
    );
    await this._storeConversations(updatedConversations);
  }

  // Fetch messages for a conversation
  async fetchMessages(conversationId, page = 1, limit = 20) {
    try {
      console.log(`[ChatService] Fetching messages for conversation: ${conversationId}, page: ${page}, limit: ${limit}`);
      
      // Verify access to this conversation
      const hasAccess = await this._verifyConversationAccess(conversationId);
      if (!hasAccess) {
        console.error(`[ChatService] Access denied: User is not authorized to view messages for conversation ${conversationId}`);
         
        // Check if we created a fallback conversation ID
        if (this.fallbackTemporaryConversationId) {
          console.log(`[ChatService] Using fallback temporary conversation: ${this.fallbackTemporaryConversationId}`);
          
          // Let the consumer know we're using a different conversation ID
          return {
            messages: [],
            fallbackConversationId: this.fallbackTemporaryConversationId
          };
        }
        
        return [];
      }
      
      // Fetch messages from API or local storage
      const messages = await this.getMessages(conversationId);
      
      // Ensure all messages have both text and content fields set
      const normalizedMessages = messages.map(msg => ({
        ...msg,
        text: msg.text || msg.content || 'No message content',
        content: msg.content || msg.text || 'No message content'
      }));
      
      return normalizedMessages;
    } catch (error) {
      this._logError('fetchMessages', error, { conversationId, page, limit });
      throw error;
    }
  }

  // Verify conversation access
  async _verifyConversationAccess(conversationId) {
    // Implementation of _verifyConversationAccess method
    // This is a placeholder and should be implemented based on your specific requirements
    return true; // Placeholder return, actual implementation needed
  }
  
  // Get recipient info (for displaying in the message)
  async _getRecipientInfo(recipientId) {
    // Basic implementation - this could be enhanced to fetch more details if needed
    return {
      _id: recipientId,
      id: recipientId // Include both formats for compatibility
    };
  }
}

export default new ChatService();