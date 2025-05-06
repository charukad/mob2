import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Card, IconButton, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { COLORS, FONTS, SIZES } from '../../constants/theme';

// Activity type icons and colors
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

// Format time (e.g., "09:30 AM")
const formatTime = (timeString) => {
  if (!timeString) return '';
  
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12;
  
  return `${formattedHour}:${minutes} ${ampm}`;
};

// Calculate duration in hours and minutes
const formatDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return '';
  
  const [startHours, startMinutes] = startTime.split(':').map(num => parseInt(num, 10));
  const [endHours, endMinutes] = endTime.split(':').map(num => parseInt(num, 10));
  
  let durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
  if (durationMinutes < 0) durationMinutes += 24 * 60; // Handle next day
  
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  
  if (hours === 0) {
    return `${minutes}m`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}m`;
  }
};

const ActivityItem = ({ activity, onPress, onEdit, onDelete }) => {
  const activityType = ACTIVITY_TYPES[activity.type] || ACTIVITY_TYPES.other;
  
  return (
    <Card style={styles.activityCard} onPress={() => onPress && onPress(activity)}>
      <View style={styles.timeContainer}>
        <Text style={styles.time}>{formatTime(activity.startTime)}</Text>
        <View style={styles.durationContainer}>
          <View style={[styles.durationLine, { backgroundColor: activityType.color }]} />
          <Text style={styles.duration}>
            {formatDuration(activity.startTime, activity.endTime)}
          </Text>
        </View>
        <Text style={styles.time}>{formatTime(activity.endTime)}</Text>
      </View>
      
      <View style={styles.activityContent}>
        <View style={[styles.activityIconContainer, { backgroundColor: activityType.color }]}>
          <MaterialCommunityIcons name={activityType.icon} color={COLORS.white} size={20} />
        </View>
        
        <View style={styles.activityDetails}>
          <Text style={styles.activityTitle}>{activity.title}</Text>
          
          {activity.location && (
            <View style={styles.locationContainer}>
              <MaterialCommunityIcons name="map-marker" size={14} color={COLORS.gray} />
              <Text style={styles.locationText} numberOfLines={1}>
                {activity.location.name}
              </Text>
            </View>
          )}
          
          {activity.cost > 0 && (
            <View style={styles.costContainer}>
              <MaterialCommunityIcons name="currency-usd" size={14} color={COLORS.gray} />
              <Text style={styles.costText}>
                {activity.cost} {activity.currency || 'USD'}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.activityActions}>
          <IconButton
            icon="pencil-outline"
            size={20}
            color={COLORS.primary}
            onPress={() => onEdit && onEdit(activity)}
          />
          <IconButton
            icon="delete-outline"
            size={20}
            color={COLORS.error}
            onPress={() => onDelete && onDelete(activity)}
          />
        </View>
      </View>
    </Card>
  );
};

const EmptyTimeSlot = ({ time, onAddActivity }) => {
  return (
    <TouchableOpacity 
      style={styles.emptySlot}
      onPress={() => onAddActivity && onAddActivity(time)}
    >
      <Text style={styles.emptySlotTime}>{formatTime(time)}</Text>
      <View style={styles.emptySlotContent}>
        <MaterialCommunityIcons name="plus-circle" size={24} color={COLORS.primary} />
        <Text style={styles.emptySlotText}>Add activity</Text>
      </View>
    </TouchableOpacity>
  );
};

const DayTimeline = ({ 
  activities, 
  date, 
  onActivityPress, 
  onEditActivity, 
  onDeleteActivity,
  onAddActivity 
}) => {
  // Sort activities by start time
  const sortedActivities = [...activities].sort((a, b) => {
    if (a.startTime < b.startTime) return -1;
    if (a.startTime > b.startTime) return 1;
    return 0;
  });
  
  // Generate time slots (30-minute intervals)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour < 24; hour++) {
      for (let minute of [0, 30]) {
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        slots.push(`${formattedHour}:${formattedMinute}`);
      }
    }
    return slots;
  };
  
  const timeSlots = generateTimeSlots();
  
  // Check if a time slot has an activity
  const getActivityForTimeSlot = (time) => {
    return sortedActivities.find(activity => {
      return activity.startTime <= time && activity.endTime > time;
    });
  };
  
  // Find empty time slots that don't overlap with activities
  const isEmptyTimeSlot = (time) => {
    return !sortedActivities.some(activity => {
      return activity.startTime <= time && activity.endTime > time;
    });
  };
  
  // Render either an activity or an empty slot
  const renderTimeSlot = ({ item: time }) => {
    const activity = getActivityForTimeSlot(time);
    
    // Only render the activity once (at its start time)
    if (activity && activity.startTime === time) {
      return (
        <ActivityItem
          activity={activity}
          onPress={onActivityPress}
          onEdit={onEditActivity}
          onDelete={onDeleteActivity}
        />
      );
    }
    
    // Only render empty slots that don't overlap with activities
    if (isEmptyTimeSlot(time)) {
      return (
        <EmptyTimeSlot
          time={time}
          onAddActivity={onAddActivity}
        />
      );
    }
    
    // If time slot is part of an activity but not the start, return null
    return null;
  };
  
  return (
    <View style={styles.container}>
      <FlatList
        data={timeSlots}
        renderItem={renderTimeSlot}
        keyExtractor={(item) => item}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.timelineContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="calendar-blank" size={48} color={COLORS.lightGray} />
            <Text style={styles.emptyText}>No activities planned for this day</Text>
            <TouchableOpacity 
              style={styles.addFirstButton}
              onPress={() => onAddActivity && onAddActivity('08:00')}
            >
              <Text style={styles.addFirstButtonText}>Add First Activity</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  timelineContainer: {
    paddingVertical: 16,
  },
  activityCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  time: {
    ...FONTS.body4,
    color: COLORS.gray,
  },
  durationContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  durationLine: {
    height: 2,
    width: '100%',
  },
  duration: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginTop: 4,
  },
  activityContent: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityDetails: {
    flex: 1,
  },
  activityTitle: {
    ...FONTS.h4,
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginLeft: 4,
  },
  costContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  costText: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginLeft: 4,
  },
  activityActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptySlot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.lightGray,
  },
  emptySlotTime: {
    ...FONTS.body4,
    color: COLORS.gray,
    width: 80,
  },
  emptySlotContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlotText: {
    ...FONTS.body4,
    color: COLORS.primary,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 40,
  },
  emptyText: {
    ...FONTS.body3,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  addFirstButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  addFirstButtonText: {
    ...FONTS.body4,
    color: COLORS.white,
  },
});

export default DayTimeline;