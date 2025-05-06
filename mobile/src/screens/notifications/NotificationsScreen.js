import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Appbar, Chip, Button, Divider } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';

import NotificationItem from '../../components/notifications/NotificationItem';
import { 
  fetchNotifications, 
  markAsRead, 
  deleteNotification, 
  markAllAsRead, 
  clearAllNotifications 
} from '../../store/slices/notificationsSlice';

const NotificationsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { notifications, loading, error } = useSelector(state => state.notifications);
  const [activeFilter, setActiveFilter] = useState('all');
  
  useFocusEffect(
    React.useCallback(() => {
      dispatch(fetchNotifications());
    }, [dispatch])
  );
  
  // Filtered notifications based on active filter
  const filteredNotifications = () => {
    if (activeFilter === 'all') {
      return notifications;
    } else if (activeFilter === 'unread') {
      return notifications.filter(notification => !notification.read);
    } else {
      return notifications.filter(notification => notification.type === activeFilter);
    }
  };
  
  // Calculate notification counts for filters
  const getNotificationCount = (filter) => {
    if (filter === 'all') {
      return notifications.length;
    } else if (filter === 'unread') {
      return notifications.filter(notification => !notification.read).length;
    } else {
      return notifications.filter(notification => notification.type === filter).length;
    }
  };
  
  // Handle marking a notification as read
  const handleMarkAsRead = (notificationId) => {
    dispatch(markAsRead(notificationId));
  };
  
  // Handle deleting a notification
  const handleDelete = (notificationId) => {
    dispatch(deleteNotification(notificationId));
  };
  
  // Handle marking all as read
  const handleMarkAllAsRead = () => {
    dispatch(markAllAsRead());
  };
  
  // Handle clearing all notifications
  const handleClearAll = () => {
    dispatch(clearAllNotifications());
  };
  
  // Render filter chips
  const renderFilterChips = () => {
    const filters = [
      { id: 'all', label: 'All' },
      { id: 'unread', label: 'Unread' },
      { id: 'booking', label: 'Bookings' },
      { id: 'message', label: 'Messages' },
      { id: 'system', label: 'System' },
    ];
    
    return (
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <Chip
              style={[
                styles.filterChip,
                activeFilter === item.id && styles.activeFilterChip
              ]}
              textStyle={activeFilter === item.id ? styles.activeFilterText : null}
              selected={activeFilter === item.id}
              onPress={() => setActiveFilter(item.id)}
            >
              {item.label} ({getNotificationCount(item.id)})
            </Chip>
          )}
          contentContainerStyle={styles.chipContainer}
        />
      </View>
    );
  };
  
  // Render action buttons (Mark all as read, Clear all)
  const renderActionButtons = () => {
    // Only show actions if there are notifications
    if (notifications.length === 0) {
      return null;
    }
    
    return (
      <View style={styles.actionContainer}>
        <Button 
          mode="text" 
          onPress={handleMarkAllAsRead}
          disabled={notifications.every(notification => notification.read)}
        >
          Mark all as read
        </Button>
        <Button 
          mode="text" 
          onPress={handleClearAll}
        >
          Clear all
        </Button>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Notifications" />
        <Appbar.Action 
          icon="cog" 
          onPress={() => navigation.navigate('NotificationSettings')}
        />
      </Appbar.Header>
      
      {renderFilterChips()}
      <Divider />
      {renderActionButtons()}
      
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            {error}
          </Text>
          <Button 
            mode="contained" 
            onPress={() => dispatch(fetchNotifications())}
            style={styles.retryButton}
          >
            Retry
          </Button>
        </View>
      ) : filteredNotifications().length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No notifications</Text>
          {activeFilter !== 'all' && (
            <Button 
              mode="text" 
              onPress={() => setActiveFilter('all')}
            >
              View all notifications
            </Button>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredNotifications()}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <NotificationItem
              notification={item}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={styles.listContainer}
          refreshing={loading}
          onRefresh={() => dispatch(fetchNotifications())}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  filterContainer: {
    backgroundColor: 'white',
  },
  chipContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: '#E3F2FD',
  },
  activeFilterText: {
    color: '#2196F3',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  listContainer: {
    paddingBottom: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
  },
});

export default NotificationsScreen;