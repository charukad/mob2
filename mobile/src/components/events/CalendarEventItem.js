import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useNavigation } from '@react-navigation/native';

import { COLORS, FONTS } from '../../constants/theme';

const CalendarEventItem = ({ event, isActive = false }) => {
  const navigation = useNavigation();

  // Format time for display (e.g. "09:00 AM - 05:00 PM")
  const formatEventTime = (startDate, endDate) => {
    if (!startDate) return 'All day';
    
    try {
      // If we have specific time in the startDate
      if (startDate.includes('T')) {
        let startDateTime = parseISO(startDate);
        let formattedTime = format(startDateTime, 'h:mm a');
        
        if (endDate && endDate.includes('T')) {
          let endDateTime = parseISO(endDate);
          formattedTime += ` - ${format(endDateTime, 'h:mm a')}`;
        }
        
        return formattedTime;
      } else {
        // If we only have dates without times
        if (startDate === endDate || !endDate) {
          return 'All day';
        } else {
          let startDay = parseISO(startDate);
          let endDay = parseISO(endDate);
          return `${format(startDay, 'MMM d')} - ${format(endDay, 'MMM d')}`;
        }
      }
    } catch (error) {
      console.error('Error formatting event time:', error);
      return 'All day';
    }
  };

  // Handle navigation to event details
  const handlePress = () => {
    navigation.navigate('EventDetail', { eventId: event._id });
  };
  
  // Format the date for comparison
  const getCurrentISODate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  
  // Check if the event is upcoming, ongoing, or past
  const getEventStatus = () => {
    const today = getCurrentISODate();
    const startDate = event.startDate.split('T')[0];
    const endDate = event.endDate ? event.endDate.split('T')[0] : startDate;
    
    if (startDate > today) {
      return 'upcoming';
    } else if (endDate >= today) {
      return 'ongoing';
    } else {
      return 'past';
    }
  };
  
  // Get color based on event status
  const getStatusColor = () => {
    const status = getEventStatus();
    
    switch (status) {
      case 'upcoming':
        return COLORS.primary;
      case 'ongoing':
        return COLORS.success;
      case 'past':
        return COLORS.gray;
      default:
        return COLORS.primary;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isActive && styles.activeContainer
      ]}
      onPress={handlePress}
    >
      <View style={[
        styles.statusIndicator,
        { backgroundColor: getStatusColor() }
      ]} />
      
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            isActive && styles.activeText
          ]}
          numberOfLines={1}
        >
          {event.title}
        </Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={14}
              color={isActive ? COLORS.white : COLORS.gray}
            />
            <Text
              style={[
                styles.infoText,
                isActive && styles.activeText
              ]}
            >
              {formatEventTime(event.startDate, event.endDate)}
            </Text>
          </View>
          
          {event.location && (
            <View style={styles.infoItem}>
              <MaterialCommunityIcons
                name="map-marker"
                size={14}
                color={isActive ? COLORS.white : COLORS.gray}
              />
              <Text
                style={[
                  styles.infoText,
                  isActive && styles.activeText
                ]}
                numberOfLines={1}
              >
                {event.location.name}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      {event.isFeatured && (
        <MaterialCommunityIcons
          name="star"
          size={16}
          color={isActive ? COLORS.white : COLORS.primary}
          style={styles.featuredIcon}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activeContainer: {
    backgroundColor: COLORS.primary,
  },
  statusIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    ...FONTS.body3Bold,
    marginBottom: 4,
  },
  activeText: {
    color: COLORS.white,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  infoText: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginLeft: 4,
  },
  featuredIcon: {
    alignSelf: 'center',
    marginLeft: 8,
  },
});

export default CalendarEventItem;