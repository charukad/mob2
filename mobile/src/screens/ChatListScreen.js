import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Divider, Searchbar } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useIsFocused } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS } from '../constants/theme';
import chatService from '../services/chatService';
import socketService from '../services/socketService';

const ChatListScreen = ({ navigation }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const currentUser = useSelector((state) => state.auth?.user);
  const isFocused = useIsFocused();

  useEffect(() => {
    // Initialize socket connection when screen is focused
    if (isFocused) {
      socketService.init();
      fetchChats();
    }
    
    // Set up message listener for new messages
    const removeMessageListener = socketService.addMessageListener((eventType, data) => {
      if (eventType === 'new_message' || eventType === 'message_read') {
        // Refresh chat list when a new message arrives or messages are read
        if (isFocused) {
          fetchChats(false); // Silent refresh
        }
      }
    });
    
    // Set up network monitoring
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      
      // If we regain connection, refresh chats
      if (state.isConnected && !isConnected && isFocused) {
        fetchChats();
      }
    });
    
    return () => {
      removeMessageListener();
      unsubscribeNetInfo();
    };
  }, [isFocused, isConnected]);

  const fetchChats = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      // Get conversations from our service
      let conversations = await chatService.getConversations();
      
      // Debug log
      console.log(`Fetched initial ${conversations.length} conversations`);
      conversations.forEach(conv => {
        console.log(`Conversation: ${conv.id || conv._id}, Vehicle: ${conv.vehicleId || 'none'}`);
      });
      
      // If conversations is empty, try to read directly from AsyncStorage as a fallback
      if (conversations.length === 0) {
        try {
          const jsonValue = await AsyncStorage.getItem('@chat_conversations');
          if (jsonValue) {
            conversations = JSON.parse(jsonValue);
            console.log(`Read ${conversations.length} conversations from AsyncStorage directly`);
          }
        } catch (err) {
          console.error('Error reading conversations directly from AsyncStorage:', err);
        }
      }
      
      if (conversations && conversations.length > 0) {
        console.log(`Processing ${conversations.length} conversations`);
        
        // Process conversations to ensure lastMessage is a string and not an object
        conversations = conversations.map(conv => {
          // Handle if lastMessage is an object instead of a string
          if (conv.lastMessage && typeof conv.lastMessage === 'object') {
            return {
              ...conv,
              lastMessage: conv.lastMessage.content || "New message"
            };
          }
          return conv;
        });
        
        // The conversations should now already include participant info and Cloudinary images
        // We'll just add the unread counts
        const enhancedConversations = await Promise.all(conversations.map(async (conversation) => {
          try {
            // If the conversation already has unreadCount, use it
            if (conversation.unreadCount !== undefined) {
              return conversation;
            }
            
            // Otherwise calculate it from messages
            const messages = await chatService.getMessages(conversation.id || conversation._id);
            const unreadCount = messages.filter(
              msg => !msg.isRead && msg.senderId !== currentUser?._id
            ).length;
            
            // Add debug info about messages
            console.log(`Found ${messages.length} messages for conversation ${conversation.id || conversation._id}, ${unreadCount} unread`);
            
            // For vehicle-specific conversations, ensure the vehicleId is set
            if (conversation.vehicleId) {
              console.log(`Conversation ${conversation.id || conversation._id} has vehicleId: ${conversation.vehicleId}`);
            }
            
            return {
              ...conversation,
              unreadCount
            };
          } catch (err) {
            console.error(`Error processing conversation ${conversation.id || conversation._id}:`, err);
            // Return the conversation without unread count if there was an error
            return {
              ...conversation,
              unreadCount: 0
            };
          }
        }));
        
        // Sort by timestamp (newest first)
        enhancedConversations.sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.lastMessageDate || 0);
          const dateB = new Date(b.updatedAt || b.lastMessageDate || 0);
          return dateB - dateA;
        });
        
        setChats(enhancedConversations);
      } else {
        console.log('No conversations found');
        setChats([]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching chats:', err);
      
      // Set a user-friendly error message
      const errorMessage = err.isNetworkError 
        ? 'Unable to connect to the server. Please check your internet connection.'
        : (err.message || 'Failed to load conversations');
      
      setError(errorMessage);
      setLoading(false);
      
      // Only use mock data in development
      if (__DEV__) {
        console.log('Using mock data for development');
        setChats([
          {
            id: '1',
            participant: {
              _id: 'user123',
              name: 'John Smith',
              cloudinaryImage: 'https://randomuser.me/api/portraits/men/32.jpg',
              role: 'vehicleOwner',
              displayRole: 'Vehicle Owner'
            },
            lastMessage: 'Hi, is this vehicle still available?',
            updatedAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
            unreadCount: 2,
            vehicleId: { 
              _id: 'vehicle1',
              make: 'Toyota',
              model: 'Camry'
            },
            vehicleName: 'Toyota Camry',
          },
          {
            id: '2',
            participant: {
              _id: 'user456',
              name: 'Emily Johnson',
              cloudinaryImage: 'https://randomuser.me/api/portraits/women/44.jpg',
              role: 'guide',
              displayRole: 'Guide'
            },
            lastMessage: 'What is the fuel efficiency?',
            updatedAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
            unreadCount: 0,
            vehicleId: {
              _id: 'vehicle2',
              make: 'Honda',
              model: 'CR-V'
            },
            vehicleName: 'Honda CR-V',
          },
        ]);
      }
    }
  };

  const handleChatPress = (chat) => {
    navigation.navigate('ChatDetail', {
      chatId: chat.id,
      participantName: chat.participantName,
      participantAvatar: chat.participantAvatar,
      participantId: chat.participantId,
      vehicleId: chat.vehicleId,
      vehicleName: chat.vehicleName,
    });
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const messageDate = new Date(timestamp);
    
    // If same day, show time
    if (messageDate.toDateString() === now.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If within the last week, show day name
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
    if (now - messageDate < ONE_WEEK) {
      return messageDate.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Otherwise show date
    return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Process raw conversations from the API into a simplified format for the UI
  const processChats = (conversations) => {
    return conversations.map(conv => {
      // Get the participant info (the other person in the conversation)
      const participant = conv.participant || {};
      
      // Use cloudinaryImage if available, otherwise fallback to regular profileImage
      const avatarUrl = participant.cloudinaryImage || participant.profileImage || null;
      
      // Format the name with role if available
      let participantName = participant.name || (
        `${participant.firstName || ''} ${participant.lastName || ''}`.trim() || 'User'
      );
      
      // Add role label for vehicle owners
      const roleLabel = participant.displayRole || participant.role;
      const showRoleLabel = roleLabel === 'Vehicle Owner' || roleLabel === 'Guide';
      
      // Handle lastMessage if it's an object rather than a string
      let lastMessageText = 'Start a conversation...';
      if (conv.lastMessage) {
        if (typeof conv.lastMessage === 'object') {
          lastMessageText = conv.lastMessage.content || 'New message';
        } else if (typeof conv.lastMessage === 'string') {
          lastMessageText = conv.lastMessage;
        }
      }
      
      return {
        id: conv.id || conv._id,
        participantId: participant._id || participant.id || conv.participantId,
        participantName,
        participantRole: roleLabel,
        showRoleLabel,
        participantAvatar: avatarUrl,
        lastMessage: lastMessageText,
        timestamp: new Date(conv.updatedAt || conv.lastMessageDate || Date.now()),
        unreadCount: conv.unreadCount || 0,
        vehicleId: conv.vehicleId?._id || conv.vehicleId,
        vehicleName: conv.vehicleName || (
          conv.vehicleId?.make && conv.vehicleId?.model
            ? `${conv.vehicleId.make} ${conv.vehicleId.model}`
            : (conv.vehicleId?.title || 'Vehicle')
        ),
        isTemporary: conv.isTemporary || false,
      };
    });
  };

  // Process the raw conversations and filter based on search
  const processedChats = processChats(chats);
  
  const filteredChats = processedChats.filter(chat => 
    chat.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.vehicleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.participantRole && chat.participantRole.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderChatItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.chatItem} 
      onPress={() => handleChatPress(item)}
    >
      <View style={styles.avatarContainer}>
        {item.participantAvatar ? (
          <Image 
            source={{ uri: item.participantAvatar }} 
            style={styles.avatar} 
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {item.participantName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {item.unreadCount > 0 && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{item.unreadCount}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <View style={styles.nameContainer}>
            <Text style={styles.participantName}>{item.participantName}</Text>
            {item.showRoleLabel && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{item.participantRole}</Text>
              </View>
            )}
          </View>
          <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
        </View>
        
        <Text style={styles.vehicleName}>
          {item.vehicleName}
          {item.isTemporary && (
            <Text style={styles.offlineBadge}> (offline)</Text>
          )}
        </Text>
        
        <Text 
          style={[
            styles.lastMessage,
            item.unreadCount > 0 && styles.unreadMessage
          ]}
          numberOfLines={1}
        >
          {item.lastMessage}
        </Text>
      </View>
      
      {item.isTemporary && (
        <MaterialIcons 
          name="cloud-off" 
          size={16} 
          color={COLORS.warning}
          style={styles.offlineIcon}
        />
      )}
    </TouchableOpacity>
  );

  // Network status indicator
  const renderNetworkStatus = () => {
    if (isConnected) return null;
    
    return (
      <View style={styles.networkStatusContainer}>
        <MaterialIcons name="cloud-off" size={16} color="#fff" />
        <Text style={styles.networkStatusText}>Offline Mode</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="error-outline" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchChats}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (chats.length === 0) {
    return (
      <View style={styles.container}>
        {renderNetworkStatus()}
        <View style={styles.centerContainer}>
          <MaterialIcons name="chat-bubble-outline" size={48} color={COLORS.gray} />
          <Text style={styles.noChatsText}>No chats yet</Text>
          <Text style={styles.noChatsSubtext}>
            Your conversations with vehicle owners will appear here
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderNetworkStatus()}
      <Searchbar
        placeholder="Search chats"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor={COLORS.gray}
      />
      
      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={() => <Divider />}
        contentContainerStyle={styles.chatList}
        onRefresh={fetchChats}
        refreshing={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  searchBar: {
    margin: 10,
    borderRadius: 10,
    elevation: 2,
  },
  searchInput: {
    fontSize: 14,
  },
  chatList: {
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Align to top for multi-line name container
    marginBottom: 4,
  },
  nameContainer: {
    flexDirection: 'column',
    flex: 1,
    marginRight: 8,
  },
  participantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  roleBadge: {
    backgroundColor: '#F0F8FF', // Light blue background
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start', // To contain width to content
    marginBottom: 2,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  roleText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2, // Align with name when role badge is present
  },
  vehicleName: {
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: 4,
  },
  offlineBadge: {
    color: COLORS.warning,
    fontStyle: 'italic',
  },
  offlineIcon: {
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.gray,
  },
  unreadMessage: {
    fontWeight: 'bold',
    color: COLORS.text,
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
  noChatsText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  noChatsSubtext: {
    marginTop: 5,
    textAlign: 'center',
    color: COLORS.gray,
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
});

export default ChatListScreen; 