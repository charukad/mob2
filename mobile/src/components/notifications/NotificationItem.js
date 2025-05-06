import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const NotificationItem = ({ 
  notification, 
  onMarkAsRead, 
  onDelete 
}) => {
  const navigation = useNavigation();
  
  // Determine icon based on notification type
  const getNotificationIcon = () => {
    const iconMap = {
      booking: 'calendar-check',
      message: 'message-text',
      review: 'star',
      like: 'heart',
      comment: 'comment-text',
      itinerary: 'map-marker-path',
      system: 'bell',
      payment: 'credit-card',
      guide: 'account-tie',
      vehicle: 'car',
      follow: 'account-plus',
      event: 'calendar-star',
    };
    
    return iconMap[notification.type] || 'bell';
  };
  
  // Get appropriate background color for icon based on notification type
  const getIconBackgroundColor = () => {
    const colorMap = {
      booking: '#2196F3',     // Blue
      message: '#9C27B0',     // Purple
      review: '#FFC107',      // Amber
      like: '#F44336',        // Red
      comment: '#4CAF50',     // Green
      itinerary: '#FF9800',   // Orange
      system: '#607D8B',      // Blue Grey
      payment: '#009688',     // Teal
      guide: '#3F51B5',       // Indigo
      vehicle: '#795548',     // Brown
      follow: '#E91E63',      // Pink
      event: '#8BC34A',       // Light Green
    };
    
    return colorMap[notification.type] || '#607D8B';
  };
  
  const handlePress = () => {
    // Mark as read if not already read
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    
    // Navigate to appropriate screen based on notification data
    if (notification.navigationRoute) {
      navigation.navigate(
        notification.navigationRoute,
        notification.navigationParams || {}
      );
    }
  };
  
  return (
    <TouchableOpacity 
      style={[
        styles.container,
        notification.read ? styles.readContainer : styles.unreadContainer
      ]}
      onPress={handlePress}
    >
      {notification.senderAvatar ? (
        <Avatar.Image 
          source={{ uri: notification.senderAvatar }} 
          size={48} 
          style={styles.avatar}
        />
      ) : (
        <Avatar.Icon 
          icon={getNotificationIcon()} 
          size={48} 
          style={[styles.avatar, { backgroundColor: getIconBackgroundColor() }]} 
        />
      )}
      
      <View style={styles.contentContainer}>
        <Text 
          style={[
            styles.message,
            notification.read ? styles.readText : styles.unreadText
          ]}
        >
          {notification.message}
        </Text>
        
        <Text style={styles.timestamp}>{notification.timestamp}</Text>
      </View>
      
      <View style={styles.actionsContainer}>
        {!notification.read && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onMarkAsRead(notification.id)}
          >
            <MaterialCommunityIcons name="eye" size={20} color="#757575" />
          </TouchableOpacity>
        )}
        
        {onDelete && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onDelete(notification.id)}
          >
            <MaterialCommunityIcons name="delete" size={20} color="#757575" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  unreadContainer: {
    backgroundColor: '#E3F2FD',
  },
  readContainer: {
    backgroundColor: 'white',
  },
  avatar: {
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: 'bold',
  },
  readText: {
    fontWeight: 'normal',
  },
  timestamp: {
    fontSize: 12,
    color: '#757575',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
  },
});

export default NotificationItem;