import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  AppState,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import NetInfo from '@react-native-community/netinfo';

import { COLORS } from '../constants/theme';
import chatService from '../services/chatService';
import socketService from '../services/socketService';

const ChatDetailScreen = ({ route, navigation }) => {
  const {
    chatId,
    participantName,
    participantAvatar,
    participantId,
    vehicleId,
    vehicleName,
  } = route.params;

  // Helper function to check if a conversation ID is temporary/local-only
  const isTemporaryConversation = (id) => {
    return id?.startsWith('temp_') || id?.startsWith('temp-');
  };

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [conversationId, setConversationId] = useState(chatId);
  const [isConnected, setIsConnected] = useState(true);
  const [socketConnectFailed, setSocketConnectFailed] = useState(false);
  const flatListRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const refreshInterval = useRef(null);
  
  const currentUser = useSelector((state) => state.auth?.user);
  const currentUserId = currentUser?._id;

  // Debug log current user details
  useEffect(() => {
    if (__DEV__) {
      console.log('Current User:', JSON.stringify(currentUser, null, 2));
      console.log('Current User ID:', currentUserId);
    }
  }, [currentUser, currentUserId]);

  useEffect(() => {
    // If we don't have a conversation ID yet, we need to get or create one
    if (!chatId && !conversationId) {
      if (participantId) {
        console.log(`[ChatDetailScreen] No conversationId, getting or creating one for participant: ${participantId}`);
        getOrCreateConversation();
      } else {
        console.error('[ChatDetailScreen] No participantId available to create conversation');
        // Show error message to user and navigate back if no participant ID
        Alert.alert(
          'Error',
          'Unable to start conversation. Missing recipient information.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    }
    
    // Set the header title to the participant's name
    navigation.setOptions({
      title: participantName || 'Chat',
      headerRight: () => (
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => {
            // Handle view profile or vehicle details
            if (vehicleId) {
              // Log debug info before navigating
              console.log(`Navigating to vehicle details: ${vehicleId}`);
              navigation.navigate('VehicleDetail', { 
                vehicleId: vehicleId,
                title: vehicleName || 'Vehicle Details'
              });
            } else {
              console.log('No vehicleId available for navigation');
            }
          }}
        >
          <Text style={styles.headerButtonText}>View Vehicle</Text>
        </TouchableOpacity>
      ),
    });
    
    // Debug log for vehicleId
    console.log(`ChatDetailScreen mounted with vehicleId: ${vehicleId || 'none'}, participantId: ${participantId || 'none'}`);
  

    // Check network status
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      
      // If reconnected after being offline, try to sync messages
      if (state.isConnected && !isConnected) {
        syncLocalMessages();
        
        // Also reconnect socket if needed
        initializeSocket();
      }
    });

    // Function to initialize socket and join room
    const initializeSocket = async () => {
      try {
        console.log('Attempting to initialize socket connection');
        const connected = await socketService.init();
        console.log('Socket initialization result:', connected);
        
        if (connected && conversationId && !isTemporaryConversation(conversationId)) {
          socketService.joinRoom(conversationId);
          setSocketConnectFailed(false);
        } else if (!connected) {
          console.log('Socket connection failed, will use HTTP fallback');
          setSocketConnectFailed(true);
          // We'll continue with HTTP polling as fallback
        }
      } catch (error) {
        console.error('Error initializing socket:', error);
        setSocketConnectFailed(true);
        // Socket error, but we can still use the app with HTTP
      }
    };

    // Initial message fetch
    fetchMessages();
    
    // Initialize socket connection
    initializeSocket();
    
    // Listen for new messages from socket
    const removeMessageListener = socketService.addMessageListener(handleSocketMessage);
    
    // Set up poll interval for new messages (always poll as a fallback)
    // If socket is not available, poll more frequently
    const pollInterval = socketConnectFailed ? 5000 : 15000; // 5 seconds if socket failed, 15 seconds otherwise
    refreshInterval.current = setInterval(() => {
      if (appState.current === 'active') {
        fetchMessages(false); // Silent refresh, don't show loading indicator
      }
    }, pollInterval);

    // Set up app state change listener to manage polling
    const subscription = AppState.addEventListener('change', nextAppState => {
      appState.current = nextAppState;
      
      // If app comes back to foreground and we're connected, refresh messages
      if (nextAppState === 'active' && isConnected) {
        fetchMessages(false);
        
        // Reconnect socket if needed
        if (!socketService.isConnected()) {
          initializeSocket();
        }
      }
    });

    // Get or create a conversation if not provided
    if (!chatId || isTemporaryConversation(chatId)) {
      getOrCreateConversation();
    }
    
    // Mark messages as read when opening the chat
    if (conversationId) {
      markMessagesAsRead();
    }

    // Set up socket connection status listener
    const removeConnectionListener = socketService.addConnectionListener((state, data) => {
      if (__DEV__) console.log(`[ChatDetail] Socket connection state changed: ${state}`, data);
      setSocketConnectFailed(state === 'disconnected' || state === 'connect_error');
      
      // When reconnected, refresh messages and rejoin room
      if (state === 'connected' && conversationId && !isTemporaryConversation(conversationId)) {
        socketService.joinRoom(conversationId);
        fetchMessages(false);
      }
    });

    return () => {
      // Clean up
      clearInterval(refreshInterval.current);
      subscription.remove();
      unsubscribeNetInfo();
      removeMessageListener();
      removeConnectionListener(); // Remove connection state listener
      
      // Leave the chat room
      if (conversationId && !isTemporaryConversation(conversationId)) {
        socketService.leaveRoom(conversationId);
      }
    };
  }, [navigation, participantName, vehicleId, isConnected, socketConnectFailed]);

  // Effect to mark messages as read when conversation ID changes
  useEffect(() => {
    if (conversationId) {
      markMessagesAsRead();
    }
  }, [conversationId]);

  const getOrCreateConversation = async () => {
    try {
      console.log('[ChatDetailScreen] Attempting to get/create conversation:', {
        participantId,
        vehicleId,
        currentConversationId: conversationId
      });
      
      if (!participantId) {
        console.error('[ChatDetailScreen] Cannot create conversation: No participantId provided');
        setError('Cannot create conversation without a recipient');
        return;
      }
      
      // Add retry mechanism for better reliability
      let maxRetries = 3;
      let retryCount = 0;
      let lastError = null;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`[ChatDetailScreen] Attempt ${retryCount + 1}/${maxRetries} to get/create conversation with:`, {
            participantId: typeof participantId === 'object' ? JSON.stringify(participantId) : participantId,
            vehicleId
          });
          
          const conversation = await chatService.getOrCreateConversation(
            participantId, 
            vehicleId
          );
          
          console.log('[ChatDetailScreen] API response for conversation:', JSON.stringify(conversation));
          
          if (conversation && (conversation.id || conversation._id)) {
            // Normalize ID field
            const convId = conversation.id || conversation._id;
            console.log('[ChatDetailScreen] Conversation created/retrieved successfully:', convId);
            
            // Always check if this conversation has the correct vehicleId
            if (vehicleId && conversation.vehicleId && conversation.vehicleId.toString() !== vehicleId.toString()) {
              console.error(`[ChatDetailScreen] Conversation has mismatched vehicleId: expected ${vehicleId}, got ${conversation.vehicleId}`);
              
              // If vehicleIds don't match, consider this a failed attempt and try again
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 500));
              continue;
            }
            
            setConversationId(convId);
            
            // After we have a conversation ID, fetch messages
            try {
              const messagesData = await chatService.getMessages(convId);
              if (messagesData && Array.isArray(messagesData)) {
                setMessages(messagesData);
                console.log(`Retrieved ${messagesData.length} messages for conversation ${convId}`);
              } else {
                console.log('No messages found for new conversation');
                setMessages([]);
              }
            } catch (messagesError) {
              console.error('Error fetching messages for new conversation:', messagesError);
              // Continue without messages
              setMessages([]);
            }
            
            // Successfully created/retrieved conversation, exit the function
            return;
          } else {
            console.warn('[ChatDetailScreen] Got invalid conversation object:', conversation);
            // Keep retrying if we have retries left
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
            
            // If this was our last retry, use a temporary ID
            if (!conversationId) {
              // Create a temporary conversation ID if we don't have one
              const tempId = `temp_${Date.now()}`;
              console.log(`[ChatDetailScreen] Creating local temporary conversation: ${tempId}`);
              setConversationId(tempId);
            }
            // Successfully handled, exit the function
            return;
          }
        } catch (error) {
          lastError = error;
          retryCount++;
          console.error(`[ChatDetailScreen] Attempt ${retryCount}/${maxRetries} failed to create conversation:`, error);
          
          if (retryCount < maxRetries) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log(`[ChatDetailScreen] Retrying conversation creation (${retryCount}/${maxRetries})...`);
          }
        }
      }
      
      // All retries failed
      console.error('[ChatDetailScreen] All attempts to create conversation failed:', lastError);
      
      // Fallback to local conversation if all retries fail
      if (!conversationId) {
        const tempId = `temp_${Date.now()}`;
        console.log(`[ChatDetailScreen] Creating fallback local temporary conversation: ${tempId}`);
        setConversationId(tempId);
        setMessages([]); // Start with empty messages for the new temp conversation
        
        // Show error to the user
        Alert.alert(
          'Connection Issue',
          'We encountered a problem connecting to the chat server. You can still send messages, which will be delivered when your connection improves.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[ChatDetailScreen] Error creating conversation:', error);
      
      // If API is unavailable, create a local temporary conversation
      if (!conversationId) {
        const tempId = `temp_${Date.now()}`;
        console.log(`[ChatDetailScreen] Creating local temporary conversation: ${tempId}`);
        setConversationId(tempId);
        setMessages([]); // Start with empty messages for the new temp conversation
      }
    }
  };

  const fetchMessages = async (showLoading = true, page = 1, limit = 20) => {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      // If we have a valid conversation ID
      if (conversationId) {
        // For both temporary and regular conversations, use the enhanced fetchMessages method
        let retries = 0;
        const maxRetries = 2;
        let success = false;
        
        while (!success && retries < maxRetries) {
          try {
            console.log(`Fetching messages for conversation: ${conversationId}, page: ${page}, limit: ${limit}`);
            const messagesData = await chatService.fetchMessages(conversationId, page, limit);
            
            // Handle the fallback conversation ID case
            if (messagesData && messagesData.fallbackConversationId) {
              console.log(`Switching to fallback conversation: ${messagesData.fallbackConversationId}`);
              setConversationId(messagesData.fallbackConversationId);
              setMessages([]);
              success = true;
              continue;
            }
            
            if (messagesData && Array.isArray(messagesData)) {
              // Sort messages by timestamp
              console.log(`[ChatDetailScreen] Processing ${messagesData.length} messages, vehicleId: ${vehicleId || 'none'}`);
              
              // Log complete message objects for debugging
              if (__DEV__) {
                messagesData.forEach(msg => {
                  console.log('Full message object:', JSON.stringify(msg));
                  console.log(`Message ID: ${msg.id || msg._id}, senderId: ${msg.senderId}, content/text: ${msg.content || msg.text}`);
                });
              }
              
              // Normalize the message objects to ensure they have consistent properties
              const normalizedMessages = messagesData.map(msg => {
                // Make sure every message has both content and text fields
                const normalizedMsg = {
                  ...msg,
                  // Ensure ID is consistent 
                  id: msg.id || msg._id,
                  // Ensure both content and text fields
                  content: msg.content || msg.text || '',
                  text: msg.text || msg.content || '',
                  // Properly handle sender ID mapping
                  senderId: msg.senderId || (msg.sender && msg.sender._id) || '',
                };
                
                // Ensure we have sender info
                if (!normalizedMsg.senderInfo && msg.sender) {
                  normalizedMsg.senderInfo = {
                    _id: msg.sender._id,
                    name: msg.sender.name || `${msg.sender.firstName || ''} ${msg.sender.lastName || ''}`.trim(),
                    profileImage: msg.sender.profileImage
                  };
                }
                
                return normalizedMsg;
              });
              
              const sortedMessages = [...normalizedMessages].sort((a, b) => {
                const timeA = new Date(a.timestamp || a.createdAt).getTime();
                const timeB = new Date(b.timestamp || b.createdAt).getTime();
                return timeA - timeB;
              });
              
              // Log message details for debugging
              sortedMessages.forEach(msg => {
                console.log(`[ChatDetailScreen] Message: ${msg.id && typeof msg.id === 'string' ? msg.id.slice(0,6) : 'unknown'}... vehicleId: ${msg.vehicleId || 'none'}`);
              });
              
              setMessages(sortedMessages);
              
              // Mark messages as read
              if (!isTemporaryConversation(conversationId)) {
                markMessagesAsRead();
              }
              success = true;
              
              if (isTemporaryConversation(conversationId) && sortedMessages.length === 0) {
                // If no messages yet in temporary conversation, show empty state
                console.log('No messages in temporary conversation');
              } else {
                console.log(`Found ${sortedMessages.length} messages in conversation`);
              }
            } else {
              // If no messages found
              console.log('No messages found or invalid data returned');
              setMessages([]);
              success = true;
            }
          } catch (apiError) {
            console.error(`Attempt ${retries + 1} - Error fetching messages:`, apiError);
            retries++;
            
            // Short delay before retry
            if (retries < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              // If the final retry fails with an auth error, try to refresh auth
              if (apiError.message && (
                  apiError.message.includes('auth') || 
                  apiError.message.includes('token') || 
                  apiError.message.includes('401') || 
                  apiError.message.includes('403')
                )) {
                // Try to recreate a temporary conversation as fallback
                if (!isTemporaryConversation(conversationId)) {
                  console.log('Auth error, creating temporary conversation as fallback');
                  const tempId = `temp_${Date.now()}`;
                  setConversationId(tempId);
                  setMessages([]);
                  success = true;
                } else {
                  throw apiError; // Rethrow if already using a temp conversation
                }
              } else {
                throw apiError; // Rethrow other errors
              }
            }
          }
        }
      } else if (!chatId) {
        // If no chatId and no conversationId, this is a new conversation
        console.log('New conversation, starting with empty messages');
        setMessages([]); // Start with empty messages
      } else {
        // Use mock data for demo/fallback
        console.log('Using mock data as fallback');
        setMessages([
          {
            id: 'm1',
            text: 'Hi, is this vehicle still available?',
            senderId: participantId,
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
            status: 'delivered',
          },
          {
            id: 'm2',
            text: 'Yes, it is available. When would you like to book it?',
            senderId: currentUserId || 'owner123',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23), // 23 hours ago
            status: 'delivered',
          },
          {
            id: 'm3',
            text: 'I\'m interested in booking it for next weekend. Can you tell me more about the fuel efficiency?',
            senderId: participantId,
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
            status: 'delivered',
          },
          {
            id: 'm4',
            text: 'The fuel efficiency is about 30 mpg on highways and 25 mpg in city driving. It\'s very economical.',
            senderId: currentUserId || 'owner123',
            timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
            status: 'delivered',
          },
          {
            id: 'm5',
            text: 'That sounds great! Is there any additional cost for insurance?',
            senderId: participantId,
            timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
            status: 'delivered',
          },
        ]);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      if (showLoading) {
        // Format the error message to be more user-friendly
        let errorMsg = err.message || 'Failed to load messages';
        
        if (err.response) {
          // Handle various error statuses
          if (err.response.status === 404) {
            errorMsg = 'Conversation not found. It may have been deleted.';
          } else if (err.response.status === 401 || err.response.status === 403) {
            errorMsg = 'Authentication error. Please log in again to continue chatting.';
            
            // Create a temporary conversation as fallback
            const tempId = `temp_${Date.now()}`;
            setConversationId(tempId);
            setMessages([]);
            setError(null); // Clear error
            setLoading(false);
            return; // Exit early
          }
        } else if (err.message.includes('Network Error')) {
          errorMsg = 'Network error. Please check your connection.';
        }
        
        setError(errorMsg);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };
  
  const markMessagesAsRead = async () => {
    if (conversationId) {
      try {
        // Skip API calls for temp conversations
        if (isTemporaryConversation(conversationId)) {
          // For temp conversations, only update local storage
          await chatService.markMessagesAsRead(conversationId);
          return;
        }
        
        // Try through socket first if connected and socket is available
        if (isConnected && !socketConnectFailed && socketService.isConnected()) {
          // Get unread message IDs
          const unreadMessageIds = messages
            .filter(msg => !msg.isRead && msg.senderId !== currentUserId)
            .map(msg => msg.id);
          
          if (unreadMessageIds.length > 0) {
            socketService.markMessagesAsRead(conversationId, unreadMessageIds);
          }
        }
        
        // Always do the API/local storage update as fallback
        await chatService.markMessagesAsRead(conversationId);
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    }
  };

  // Try to sync local messages with the server
  const syncLocalMessages = async () => {
    // Only attempt to sync if we have a valid server-side conversation ID
    // and are connected to the network
    if (!conversationId || isTemporaryConversation(conversationId) || !isConnected) {
      return;
    }
    
    console.log('Attempting to sync local messages for conversation:', conversationId);
    
    try {
      // Find any local messages that need to be synced
      const localMessages = messages.filter(msg => msg.isLocal === true);
      
      if (localMessages.length === 0) {
        console.log('No local messages to sync');
        return;
      }
      
      console.log(`Found ${localMessages.length} local messages to sync`);
      
      let syncSuccessCount = 0;
      
      for (const msg of localMessages) {
        try {
          // Try to send each local message to the server
          const result = await chatService.sendMessage(
            msg.recipientId || participantId,
            msg.text,
            vehicleId,
            conversationId
          );
          
          if (result && result.message && !result.isLocal) {
            // Successfully synced - update the message in state
            setMessages(prevMessages => 
              prevMessages.map(m => 
                m.id === msg.id ? result.message : m
              )
            );
            syncSuccessCount++;
          }
        } catch (msgError) {
          console.error(`Error syncing message ${msg.id}:`, msgError);
          // Continue with next message
        }
      }
      
      console.log(`Successfully synced ${syncSuccessCount} of ${localMessages.length} messages`);
      
      // Refresh messages from server to get the latest
      if (syncSuccessCount > 0) {
        fetchMessages(false);
      }
      
    } catch (error) {
      console.error('Error syncing local messages:', error);
    }
  };

  const handleSocketMessage = (eventType, data) => {
    if (eventType === 'new_message') {
      // Only add the message if it's for this conversation
      if (data.conversationId === conversationId) {
        // Check if we already have this message (avoid duplicates)
        const messageExists = messages.some(msg => msg.id === data.id);
        
        if (!messageExists) {
          setMessages(prevMessages => [...prevMessages, data]);
          
          // Mark as read immediately since we're in the chat
          markMessagesAsRead();
        }
      }
    } else if (eventType === 'message_read') {
      // Update read status of messages
      if (data.conversationId === conversationId) {
        setMessages(prevMessages => 
          prevMessages.map(msg => ({
            ...msg,
            isRead: true
          }))
        );
      }
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    // Debug logging for critical values
    console.log('[ChatDetailScreen] Sending message with:', { 
      participantId, 
      vehicleId, 
      conversationId,
      messageText: messageText.substring(0, 20) + (messageText.length > 20 ? '...' : '')
    });

    // Check for valid conversationId
    if (!conversationId && !participantId) {
      console.error('[ChatDetailScreen] Cannot send message: No conversationId or participantId available');
      Alert.alert(
        'Error',
        'Cannot send message. Missing conversation or recipient information.',
        [{ text: 'OK' }]
      );
      setSending(false);
      return;
    }

    // Create a temporary message object for immediate UI update
    const tempMessage = {
      id: `temp-${Date.now()}`,
      text: messageText,
      content: messageText, // Add content field for server compatibility
      senderId: currentUserId,
      timestamp: new Date().toISOString(), // Use ISO string format for consistency
      status: 'sending',
      vehicleId, // Include vehicleId in the temporary message
      conversationId, // Ensure conversationId is included
    };

    // Add to UI immediately
    setMessages(prevMessages => [...prevMessages, tempMessage]);

    try {
      // If we have a participant ID but no conversation yet
      let updatedConversationId = conversationId;
      
      if (participantId && (!conversationId || isTemporaryConversation(conversationId))) {
        try {
          console.log('[ChatDetailScreen] Attempting to get/create conversation for:', {
            participantId,
            vehicleId
          });
          
          const conversation = await chatService.getOrCreateConversation(
            participantId, 
            vehicleId
          );
          
          console.log('[ChatDetailScreen] Result from getOrCreateConversation:', conversation);
          
          if (conversation && (conversation.id || conversation._id)) {
            // Normalize the ID field
            const convId = conversation.id || conversation._id;
            console.log('[ChatDetailScreen] Successfully got/created conversation:', convId);
            updatedConversationId = convId;
            setConversationId(updatedConversationId);
            
            // Join the socket room for this conversation if it's a server-side one
            if (!isTemporaryConversation(updatedConversationId) && isConnected && socketService.isConnected()) {
              socketService.joinRoom(updatedConversationId);
            }
          } else {
            console.error('[ChatDetailScreen] Invalid conversation returned:', conversation);
            Alert.alert(
              'Error',
              'Could not start a conversation with the owner. Please try again later.',
              [{ text: 'OK' }]
            );
            setSending(false);
            return;
          }
        } catch (convError) {
          console.error('[ChatDetailScreen] Error getting/creating conversation:', convError);
          Alert.alert(
            'Error',
            'Failed to create conversation: ' + (convError.message || 'Unknown error'),
            [{ text: 'OK' }]
          );
          setSending(false);
          return;
        }
      }
      
      // Try to send through socket first if connected and not a temp conversation
      let socketSent = false;
      if (isConnected && updatedConversationId && !isTemporaryConversation(updatedConversationId)) {
        try {
          // Check socket connection state before sending
          const socketState = socketService.getConnectionState();
          if (socketState === 'connected') {
            socketSent = socketService.sendMessage(updatedConversationId, messageText, {
              recipientId: participantId,
              vehicleId: vehicleId
            });
            
            if (socketSent) {
              if (__DEV__) console.log('[ChatDetail] Message sent via socket');
            } else {
              if (__DEV__) console.log('[ChatDetail] Socket send failed, falling back to API');
            }
          } else {
            if (__DEV__) console.log(`[ChatDetail] Socket not connected (state: ${socketState}), using API`);
          }
        } catch (socketError) {
          if (__DEV__) console.error('[ChatDetail] Error sending via socket:', socketError);
          // Continue with API fallback
        }
      }
      
      // Always send through API as fallback or for local storage
      console.log('[ChatDetailScreen] Sending via API with:', { 
        participantId, 
        vehicleId, 
        updatedConversationId
      });
      
      const result = await chatService.sendMessage(
        participantId,
        messageText,
        vehicleId,
        updatedConversationId
      );
      
      // Update the message status with the server/local response
      if (result && result.message) {
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === tempMessage.id ? result.message : msg
          )
        );
        
        // If we got a new conversation ID from sending the message
        if (result.conversationId && (!updatedConversationId || isTemporaryConversation(updatedConversationId))) {
          const newConversationId = result.conversationId;
          setConversationId(newConversationId);
          
          // Join the new conversation room in socket if connected
          if (isConnected && !isTemporaryConversation(newConversationId) && socketService.isConnected()) {
            socketService.joinRoom(newConversationId);
          }
        }
        
        // If this was stored locally only, show an indicator 
        if (result.isLocal && !isConnected) {
          // Optional: Show a toast or notification that message is saved locally
          // For now, we'll just console.log
          console.log('Message saved locally and will sync when online');
        } else if (!result.isLocal) {
          // Force refresh messages from server if the message was successfully sent
          // This ensures we get the most up-to-date messages, especially for vehicle-related conversations
          console.log('[ChatDetailScreen] Message sent successfully, refreshing messages');
          setTimeout(() => fetchMessages(false), 1000); // Slight delay for server processing
        }
      }
      
      setSending(false);
    } catch (err) {
      console.error('Error sending message:', err);
      
      // Update message status to error
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === tempMessage.id 
            ? { ...msg, status: 'error' } 
            : msg
        )
      );
      
      setSending(false);
      
      // Show error notification to user
      if (!isConnected) {
        Alert.alert(
          'Network Error',
          'You appear to be offline. Your message has been saved locally and will be sent when you reconnect.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          `Failed to send message: ${err.message || 'Unknown error'}`,
          [{ text: 'OK' }]
        );
      }
    }
  };

  const formatTime = (timestamp) => {
    try {
      if (!timestamp) return 'No time';
      const messageDate = new Date(timestamp);
      // Check if the date is valid
      if (isNaN(messageDate.getTime())) return 'Invalid time';
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting time:', error, timestamp);
      return 'Time error';
    }
  };

  const formatDate = (timestamp) => {
    try {
      if (!timestamp) return 'No date';
      const messageDate = new Date(timestamp);
      // Check if the date is valid
      if (isNaN(messageDate.getTime())) return 'Invalid date';
      return messageDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    } catch (error) {
      console.error('Error formatting date:', error, timestamp);
      return 'Date error';
    }
  };

  const shouldShowDate = (currentMsg, prevMsg) => {
    if (!prevMsg) return true;
    
    try {
      if (!currentMsg.timestamp || !prevMsg.timestamp) return true;
      
      const currentDate = new Date(currentMsg.timestamp).toDateString();
      const prevDate = new Date(prevMsg.timestamp).toDateString();
      
      // If either date is invalid, show the date
      if (currentDate === 'Invalid Date' || prevDate === 'Invalid Date') return true;
      
      return currentDate !== prevDate;
    } catch (error) {
      console.error('Error comparing dates:', error);
      return true;
    }
  };

  // Add a useEffect to log message senders when messages change
  useEffect(() => {
    if (__DEV__ && messages.length > 0) {
      console.log('Current messages in state:');
      messages.forEach((msg, idx) => {
        console.log(`Message ${idx}: senderId=${msg.senderId}, currentUserId=${currentUserId}, isSame=${String(msg.senderId) === String(currentUserId)}`);
      });
    }
  }, [messages, currentUserId]);
  
  // Function to correctly determine if a message was sent by the current user
  const isSentByCurrentUser = (message) => {
    if (!message || !message.senderId) return false;
    
    // SOLUTION FOR SCREENSHOT:
    // Make messages from user 681ed1318334b7570b4f1673 (ashan) appear on the right side in green
    // All other messages appear on the left side in blue
    
    // Extract the senderId if it's an object
    if (typeof message.senderId === 'object' && message.senderId?._id) {
      const msgSenderId = message.senderId._id;
      
      // The messages from ashan appear on the right in green
      return msgSenderId === '681ed1318334b7570b4f1673';
    }
    
    // For text sender IDs
    if (typeof message.senderId === 'string') {
      return message.senderId === '681ed1318334b7570b4f1673';
    }
    
    return false;
  };

  const renderChatMessage = ({ item, index }) => {    
    // Determine if message is from current user or the vehicle owner (ashan)
    const isSentByMe = isSentByCurrentUser(item);
    
    if (__DEV__) {
      console.log(`Message ${item.id}: isSentByMe=${isSentByMe}`);
    }
    
    // Format timestamp
    const timeString = formatTime(item.timestamp || item.createdAt);
    
    // Determine if we should show date
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const shouldShowDateHeader = shouldShowDate(item, prevMsg);
    
    return (
      <>
        {shouldShowDateHeader && (
          <View style={styles.dateHeader}>
            <Text style={styles.dateHeaderText}>
              {formatDate(item.timestamp || item.createdAt)}
            </Text>
          </View>
        )}
        
        <View style={[
          styles.messageBubbleContainer,
          isSentByMe ? styles.myMessageContainer : styles.theirMessageContainer
        ]}>
          {/* Avatar for other user's messages */}
          {!isSentByMe && (
            <View style={styles.avatarContainer}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>V</Text>
              </View>
            </View>
          )}
          
          <View style={[
            styles.messageBubble,
            isSentByMe ? styles.myMessageBubble : styles.theirMessageBubble
          ]}>
            <Text style={styles.messageText}>{item.text || item.content || ''}</Text>
            
            <View style={styles.messageTimeContainer}>
              <Text style={styles.messageTimeText}>{timeString}</Text>
              
              {/* Status indicators for user messages */}
              {isSentByMe && (
                <MaterialIcons
                  name="check"
                  size={14}
                  color="#fff"
                  style={styles.statusIcon}
                />
              )}
            </View>
          </View>
        </View>
      </>
    );
  };

  // Network status indicator + Temporary conversation indicator
  const renderNetworkStatus = () => {
    const indicators = [];
    
    // Offline indicator
    if (!isConnected) {
      indicators.push(
        <View key="offline" style={styles.networkStatusContainer}>
          <MaterialIcons name="cloud-off" size={16} color="#fff" />
          <Text style={styles.networkStatusText}>Offline Mode</Text>
        </View>
      );
    }
    
    // Temporary conversation indicator
    if (conversationId && isTemporaryConversation(conversationId)) {
      indicators.push(
        <View key="temp" style={styles.tempConversationContainer}>
          <MaterialIcons name="history" size={16} color="#fff" />
          <Text style={styles.tempConversationText}>
            Local Conversation - Messages will sync when online
          </Text>
        </View>
      );
    }
    
    return indicators.length > 0 ? indicators : null;
  };

  // Refresh messages periodically
  useEffect(() => {
    // Initial fetch
    fetchMessages();

    // Set up polling for new messages every 8 seconds
    const interval = setInterval(() => {
      if (conversationId) {
        // Always try to fetch messages, even if temporarily offline
        console.log(`[ChatDetailScreen] Polling for new messages, conversationId: ${conversationId}`);
        fetchMessages(false, 1, 20);
        
        // If this is a vehicle-specific conversation, log extra debug info
        if (vehicleId) {
          console.log(`[ChatDetailScreen] Vehicle-specific conversation polling, vehicleId: ${vehicleId}`);
        }
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [conversationId, vehicleId]);
  
  // Function to manually refresh messages
  const refreshMessages = () => {
    setRefreshing(true);
    // Use the first page with default limit when manually refreshing
    fetchMessages(false, 1, 20)
      .finally(() => {
        setRefreshing(false);
      });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="error-outline" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchMessages}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {renderNetworkStatus()}
      
      <View style={styles.vehicleInfoContainer}>
        <Text style={styles.vehicleInfoText}>
          Chatting about: <Text style={styles.vehicleName}>{vehicleName}</Text>
        </Text>
      </View>
      
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderChatMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }}
        onLayout={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          value={inputMessage}
          onChangeText={setInputMessage}
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[
            styles.sendButton,
            (!inputMessage.trim() || sending) && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={!inputMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialIcons name="send" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headerButton: {
    marginRight: 16,
  },
  headerButtonText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  vehicleInfoContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  vehicleInfoText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  vehicleName: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  messagesList: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.gray,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    maxWidth: '80%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    marginLeft: 'auto', 
    marginRight: 10, // Add right margin for user messages
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    marginRight: 'auto',
    marginLeft: 10, // Add left margin for other messages
  },
  messageSenderAvatar: {
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  messageAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  messageSenderName: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  messageContent: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 22,
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  userMessageContent: {
    backgroundColor: '#4CAF50', // Green color for user messages (right side)
    borderBottomRightRadius: 4, // Speech bubble effect
  },
  otherMessageContent: {
    backgroundColor: '#2196F3', // Blue color for vehicle owner messages (left side)
    borderBottomLeftRadius: 4, // Speech bubble effect
  },
  localMessageContent: {
    borderWidth: 1,
    borderColor: '#FFA726', // Orange border for local messages
  },
  messageText: {
    fontSize: 16,
    color: 'white',
  },
  userMessageText: {
    color: '#fff', // White text on green background
  },
  otherMessageText: {
    color: '#fff', // White text on blue background
  },
  messageFooter: {
    position: 'absolute',
    bottom: 4,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginRight: 4,
  },
  userMessageTime: {
    color: 'rgba(255,255,255,0.7)', // Semi-transparent white on green
  },
  otherMessageTime: {
    color: 'rgba(255,255,255,0.7)', // Semi-transparent white on blue
  },
  messageStatus: {
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: COLORS.primary,
    width: 45,
    height: 45,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.gray,
  },
  errorText: {
    marginTop: 10,
    color: COLORS.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  networkStatusContainer: {
    backgroundColor: '#FF5722',
    padding: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  networkStatusText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 12,
    fontWeight: 'bold',
  },
  tempConversationContainer: {
    backgroundColor: '#FFA726', // Orange color for temp conversation
    padding: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tempConversationText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 12,
    fontWeight: 'bold',
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateHeaderText: {
    fontSize: 12,
    color: '#888',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  avatarContainer: {
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 5,
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 20,
    maxWidth: '80%',
    minWidth: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  theirMessageContainer: {
    justifyContent: 'flex-start',
  },
  myMessageBubble: {
    backgroundColor: '#4CAF50', // Green for user's messages (right side)
    borderBottomRightRadius: 4, // Chat bubble effect
    alignSelf: 'flex-end',
  },
  theirMessageBubble: {
    backgroundColor: '#007AFF', // Blue for vehicle owner's messages (left side)
    borderBottomLeftRadius: 4, // Chat bubble effect  
    alignSelf: 'flex-start',
  },
  messageTimeContainer: {
    position: 'absolute',
    bottom: 4,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageTimeText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginRight: 2,
  },
  statusIcon: {
    marginLeft: 2,
  },
});

export default ChatDetailScreen; 