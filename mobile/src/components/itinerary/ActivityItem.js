import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { COLORS, FONTS } from '../../constants/theme';

// Activity type definitions
const ACTIVITY_TYPES = {
  visit: {
    icon: 'map-marker',
    color: COLORS.primary,
    label: 'Visit'
  },
  food: {
    icon: 'food-fork-drink',
    color: '#FF8C00',
    label: 'Food'
  },
  transport: {
    icon: 'car',
    color: '#4682B4',
    label: 'Transport'
  },
  accommodation: {
    icon: 'bed',
    color: '#8A2BE2',
    label: 'Accommodation'
  },
  activity: {
    icon: 'hiking',
    color: '#32CD32',
    label: 'Activity'
  },
  other: {
    icon: 'dots-horizontal',
    color: '#708090',
    label: 'Other'
  }
};

// Format time from HH:MM format to display format (e.g., "9:30 AM")
const formatTime = (timeString) => {
  if (!timeString) return 'All day';
  
  try {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    
    return format(date, 'h:mm a');
  } catch (error) {
    return timeString;
  }
};

// Calculate duration between two time strings
const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return '';
  
  try {
    const [startHours, startMinutes] = startTime.split(':').map(num => parseInt(num, 10));
    const [endHours, endMinutes] = endTime.split(':').map(num => parseInt(num, 10));
    
    let durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
    if (durationMinutes < 0) durationMinutes += 24 * 60; // Handle overnight activities
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    if (hours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  } catch (error) {
    return '';
  }
};

const ActivityItem = ({ activity, onPress, compact = false }) => {
  const activityType = ACTIVITY_TYPES[activity.type] || ACTIVITY_TYPES.other;
  const duration = calculateDuration(activity.startTime, activity.endTime);
  
  if (compact) {
    return (
      <TouchableOpacity 
        style={styles.compactContainer}
        onPress={() => onPress && onPress(activity)}
      >
        <View style={[styles.typeIndicator, { backgroundColor: activityType.color }]} />
        <View style={styles.compactContent}>
          <Text style={styles.compactTime}>
            {formatTime(activity.startTime)}
            {duration ? ` (${duration})` : ''}
          </Text>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {activity.title}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.gray} />
      </TouchableOpacity>
    );
  }
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onPress && onPress(activity)}
    >
      <View style={styles.timeContainer}>
        <Text style={styles.time}>{formatTime(activity.startTime)}</Text>
        {duration && <Text style={styles.duration}>{duration}</Text>}
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <View style={[styles.typeBox, { backgroundColor: activityType.color }]}>
            <MaterialCommunityIcons name={activityType.icon} size={16} color={COLORS.white} />
            <Text style={styles.typeText}>{activityType.label}</Text>
          </View>
          
          {activity.cost > 0 && (
            <Text style={styles.cost}>
              {activity.cost} {activity.currency || 'USD'}
            </Text>
          )}
        </View>
        
        <Text style={styles.title}>{activity.title}</Text>
        
        {activity.location && (
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color={COLORS.gray} />
            <Text style={styles.location} numberOfLines={1}>
              {activity.location.name}
            </Text>
          </View>
        )}
        
        {activity.description && (
          <Text style={styles.description} numberOfLines={2}>
            {activity.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  timeContainer: {
    width: 60,
    marginRight: 12,
  },
  time: {
    ...FONTS.body4,
    color: COLORS.gray,
  },
  duration: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginTop: 4,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeText: {
    ...FONTS.body4,
    color: COLORS.white,
    marginLeft: 4,
  },
  cost: {
    ...FONTS.body4,
    color: COLORS.gray,
  },
  title: {
    ...FONTS.h4,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  location: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginLeft: 4,
    flex: 1,
  },
  description: {
    ...FONTS.body4,
    color: COLORS.darkGray,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  typeIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
  },
  compactContent: {
    flex: 1,
  },
  compactTime: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginBottom: 4,
  },
  compactTitle: {
    ...FONTS.body3,
  },
});

export default ActivityItem;