import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
  Linking,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  FlatList,  // Add this import
} from 'react-native';
import {
  Appbar,
  Text,
  Divider,
  Portal,
  Dialog,
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

// Import from the utility file instead of directly from theme
import { colors, COLORS, FONTS } from '../../utils/themeUtils';

// Fixed import path
import { fetchItineraryItemById, deleteItineraryItem } from '../../store/slices/itinerariesSlice';

// Activity type definitions
const ACTIVITY_TYPES = {
  visit: {
    icon: 'map-marker',
    color: colors.primary,
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

const screenWidth = Dimensions.get('window').width;

// Format time function
const formatTime = (timeString) => {
  if (!timeString) return 'All day';
  
  try {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10) || 0);
    date.setMinutes(parseInt(minutes, 10) || 0);
    
    return format(date, 'h:mm a');
  } catch (error) {
    console.warn('Error formatting time:', error);
    return timeString;
  }
};

// Calculate duration function
const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return '';
  
  try {
    const [startHours, startMinutes] = startTime.split(':').map(num => parseInt(num, 10) || 0);
    const [endHours, endMinutes] = endTime.split(':').map(num => parseInt(num, 10) || 0);
    
    let durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
    if (durationMinutes < 0) durationMinutes += 24 * 60; // Handle overnight activities
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    if (hours === 0) {
      return `${minutes} minutes`;
    } else if (minutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minutes`;
    }
  } catch (error) {
    console.warn('Error calculating duration:', error);
    return '';
  }
};

const ActivityDetailScreen = ({ navigation, route }) => {
  // Extract params safely
  const params = route?.params || {};
  const { itineraryId, activityId } = params;
  
  const dispatch = useDispatch();
  
  // Use safe selector with fallback for state
  const itinerariesState = useSelector(state => state?.itineraries) || {};
  const { currentItineraryItem, loading } = itinerariesState;
  
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [carouselActiveIndex, setCarouselActiveIndex] = useState(0);
  const [error, setError] = useState(null);
  const flatListRef = useRef(null);
  
  // Fetch activity details safely
  useEffect(() => {
    if (!itineraryId || !activityId) {
      setError('Missing required information');
      return;
    }
    
    try {
      dispatch(fetchItineraryItemById({ itineraryId, itemId: activityId }))
        .catch(err => {
          console.error('Error fetching activity:', err);
          setError('Failed to load activity details');
        });
    } catch (err) {
      console.error('Error in dispatch:', err);
      setError('An unexpected error occurred');
    }
  }, [dispatch, itineraryId, activityId]);
  
  // Show error state
  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.goBack()}
          style={{ marginTop: 20 }}
        >
          Go Back
        </Button>
      </SafeAreaView>
    );
  }
  
  // Show loading state
  if (loading || !currentItineraryItem) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16 }}>Loading activity details...</Text>
      </View>
    );
  }
  
  // Get activity data safely
  const activity = currentItineraryItem || {};
  const activityType = ACTIVITY_TYPES[activity?.type] || ACTIVITY_TYPES.other;
  const duration = calculateDuration(activity?.startTime, activity?.endTime);
  
  // Safe handling for directions
  const handleGetDirections = () => {
    if (!activity?.location?.coordinates) return;
    
    try {
      const { latitude, longitude } = activity.location.coordinates;
      const locationName = encodeURIComponent(activity.location.name || 'Location');
      
      const url = Platform.OS === 'ios'
        ? `maps:0,0?q=${locationName}@${latitude},${longitude}`
        : `geo:0,0?q=${latitude},${longitude}(${locationName})`;
      
      Linking.openURL(url).catch(err => console.error('Error opening maps:', err));
    } catch (err) {
      console.error('Error preparing maps URL:', err);
    }
  };
  
  // Delete handling
  const handleDeleteActivity = () => {
    setDeleteDialogVisible(true);
  };
  
  const confirmDelete = () => {
    try {
      dispatch(deleteItineraryItem({ itineraryId, itemId: activityId }))
        .unwrap()
        .then(() => {
          setDeleteDialogVisible(false);
          navigation.goBack();
        })
        .catch(err => {
          console.error('Error deleting activity:', err);
          setDeleteDialogVisible(false);
        });
    } catch (err) {
      console.error('Error in delete dispatch:', err);
      setDeleteDialogVisible(false);
    }
  };
  
  // Custom FlatList-based carousel
  const renderImage = ({ item }) => {
    return (
      <Image
        source={{ uri: item }}
        style={styles.carouselImage}
        resizeMode="cover"
      />
    );
  };

  // Handle changing images
  const handleViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCarouselActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;
  
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="" />
        <Appbar.Action icon="pencil" onPress={() => navigation.navigate('EditActivity', { itineraryId, activityId })} />
        <Appbar.Action icon="delete" onPress={handleDeleteActivity} />
      </Appbar.Header>
      
      <ScrollView style={styles.scrollView}>
        {/* Photos Carousel */}
        {activity?.photos && Array.isArray(activity.photos) && activity.photos.length > 0 ? (
          <View style={styles.carouselContainer}>
            <FlatList
              ref={flatListRef}
              data={activity.photos}
              renderItem={renderImage}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onViewableItemsChanged={handleViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              keyExtractor={(_, index) => index.toString()}
            />
            
            {activity.photos.length > 1 && (
              <View style={styles.paginationContainer}>
                {activity.photos.map((_, index) => (
                  <TouchableOpacity 
                    key={index.toString()}
                    onPress={() => {
                      setCarouselActiveIndex(index);
                      flatListRef.current?.scrollToIndex({
                        index,
                        animated: true
                      });
                    }}
                  >
                    <View
                      style={[
                        styles.paginationDot,
                        index === carouselActiveIndex && styles.paginationDotActive
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.defaultImageContainer}>
            <View style={[styles.activityIconCircle, { backgroundColor: activityType?.color }]}>
              <MaterialCommunityIcons name={activityType?.icon || 'dots-horizontal'} size={48} color="#FFFFFF" />
            </View>
          </View>
        )}
        
        {/* Activity Content */}
        <View style={styles.contentContainer}>
          {/* Type Badge */}
          <View style={styles.typeBadgeContainer}>
            <View style={[styles.typeBadge, { backgroundColor: activityType?.color }]}>
              <MaterialCommunityIcons name={activityType?.icon || 'dots-horizontal'} size={16} color="#FFFFFF" />
              <Text style={styles.typeBadgeText}>{activityType?.label || 'Activity'}</Text>
            </View>
          </View>
          
          {/* Title and Time */}
          <Text style={styles.title}>{activity?.title || 'Untitled Activity'}</Text>
          
          <View style={styles.timeContainer}>
            <MaterialCommunityIcons name="clock-outline" size={18} color="#757575" />
            <Text style={styles.timeText}>
              {formatTime(activity?.startTime)} - {formatTime(activity?.endTime)}
            </Text>
            {duration && (
              <Text style={styles.durationText}>({duration})</Text>
            )}
          </View>
          
          {/* Date */}
          {activity?.date && (
            <View style={styles.dateContainer}>
              <MaterialCommunityIcons name="calendar" size={18} color="#757575" />
              <Text style={styles.dateText}>
                {format(new Date(activity.date), 'EEEE, MMMM d, yyyy')}
              </Text>
            </View>
          )}
          
          <Divider style={styles.divider} />
          
          {/* Description */}
          {activity?.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{activity.description}</Text>
            </View>
          )}
          
          {/* Location */}
          {activity?.location && (
            <View style={styles.locationContainer}>
              <Text style={styles.sectionTitle}>Location</Text>
              
              <View style={styles.locationCard}>
                <Text style={styles.locationName}>{activity.location.name || 'Unknown Location'}</Text>
                {activity.location.address && (
                  <Text style={styles.locationAddress}>{activity.location.address}</Text>
                )}
                
                {activity.location.coordinates && (
                  <TouchableOpacity
                    style={styles.directionsButton}
                    onPress={handleGetDirections}
                  >
                    <MaterialCommunityIcons name="directions" size={18} color="#FFFFFF" />
                    <Text style={styles.directionsText}>Get Directions</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          
          {/* Cost */}
          {(activity?.cost > 0 || activity?.cost === 0) && (
            <View style={styles.costContainer}>
              <Text style={styles.sectionTitle}>Cost</Text>
              <View style={styles.costContent}>
                <MaterialCommunityIcons name="currency-usd" size={24} color={colors.primary} />
                <Text style={styles.costText}>
                  {activity.cost} {activity?.currency || 'USD'}
                </Text>
              </View>
            </View>
          )}
          
          {/* Notes */}
          {activity?.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <View style={styles.notesCard}>
                <Text style={styles.notes}>{activity.notes}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Activity</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete "{activity?.title || 'this activity'}"? This action cannot be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={confirmDelete} color={colors.error}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

// Define styles with correctly imported colors
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.error,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  carouselContainer: {
    height: 250,
  },
  carouselImage: {
    width: screenWidth,
    height: 250,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
  },
  defaultImageContainer: {
    height: 200,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  contentContainer: {
    padding: 16,
  },
  typeBadgeContainer: {
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    marginLeft: 8,
  },
  durationText: {
    color: '#757575',
    marginLeft: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    marginLeft: 8,
  },
  divider: {
    marginBottom: 16,
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    lineHeight: 24,
  },
  locationContainer: {
    marginBottom: 16,
  },
  locationCard: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  locationName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  locationAddress: {
    color: '#757575',
    marginBottom: 12,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  directionsText: {
    color: '#FFFFFF',
    marginLeft: 8,
  },
  costContainer: {
    marginBottom: 16,
  },
  costContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  costText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 8,
  },
  notesContainer: {
    marginBottom: 24,
  },
  notesCard: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  notes: {
    lineHeight: 24,
  },
});

export default ActivityDetailScreen;