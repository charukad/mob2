import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Appbar, FAB, Chip, Portal, Modal, ActivityIndicator, Button } from 'react-native-paper';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, addDays } from 'date-fns';

// Import components and utilities
import { COLORS, FONTS } from '../../constants/theme';
import { fetchItineraryById, fetchItineraryItems } from '../../store/slices/itinerariesSlice';
import ActivityItem from '../../components/itinerary/ActivityItem';

// Activity type definitions (same as in other files)
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

const { width, height } = Dimensions.get('window');

const ItineraryMapScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const mapRef = useRef(null);
  const { itineraryId } = route.params;
  
  const { currentItinerary, itineraryItems, loading } = useSelector(state => state.itineraries);
  
  const [selectedDay, setSelectedDay] = useState(null); // null means all days
  const [selectedType, setSelectedType] = useState(null); // null means all types
  const [routeVisible, setRouteVisible] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activityModalVisible, setActivityModalVisible] = useState(false);
  const [initialRegion, setInitialRegion] = useState({
    latitude: 7.8731, // Center of Sri Lanka
    longitude: 80.7718,
    latitudeDelta: 2.5,
    longitudeDelta: 2.5,
  });
  
  // Fetch itinerary data when screen loads
  useEffect(() => {
    dispatch(fetchItineraryById(itineraryId));
    dispatch(fetchItineraryItems(itineraryId));
  }, [dispatch, itineraryId]);
  
  // Filter items based on selected day and type
  const getFilteredItems = () => {
    if (!itineraryItems) return [];
    
    let filtered = [...itineraryItems];
    
    // Filter by day
    if (selectedDay !== null) {
      const dayDate = addDays(new Date(currentItinerary.startDate), selectedDay);
      const formattedDate = format(dayDate, 'yyyy-MM-dd');
      
      filtered = filtered.filter(item => {
        const itemDate = item.date?.split('T')[0];
        return itemDate === formattedDate;
      });
    }
    
    // Filter by activity type
    if (selectedType !== null) {
      filtered = filtered.filter(item => item.type === selectedType);
    }
    
    return filtered;
  };
  
  // Get items with location information
  const getItemsWithLocation = () => {
    return getFilteredItems().filter(item => 
      item.location && 
      item.location.coordinates && 
      item.location.coordinates.latitude && 
      item.location.coordinates.longitude
    );
  };
  
  // Fit map to show all markers
  const fitToMarkers = () => {
    const locatedItems = getItemsWithLocation();
    
    if (locatedItems.length === 0) return;
    
    if (locatedItems.length === 1) {
      const item = locatedItems[0];
      mapRef.current?.animateToRegion({
        latitude: item.location.coordinates.latitude,
        longitude: item.location.coordinates.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      return;
    }
    
    mapRef.current?.fitToSuppliedMarkers(
      locatedItems.map(item => item._id),
      {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      }
    );
  };
  
  // Generate route coordinates for polyline
  const getRouteCoordinates = () => {
    const locatedItems = getItemsWithLocation();
    
    // Sort by time if same day, otherwise by date
    const sortedItems = [...locatedItems].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      if (dateA.toDateString() === dateB.toDateString()) {
        // Same day, sort by time
        return a.startTime.localeCompare(b.startTime);
      }
      
      // Different days, sort by date
      return dateA - dateB;
    });
    
    return sortedItems.map(item => ({
      latitude: item.location.coordinates.latitude,
      longitude: item.location.coordinates.longitude,
    }));
  };
  
  // Handle marker press
  const handleMarkerPress = (activity) => {
    setSelectedActivity(activity);
    setActivityModalVisible(true);
  };
  
  // Generate days array for the day filter
  const getDays = () => {
    if (!currentItinerary) return [];
    
    const startDate = new Date(currentItinerary.startDate);
    const endDate = new Date(currentItinerary.endDate);
    const days = [];
    
    let currentDay = new Date(startDate);
    let dayIndex = 0;
    
    while (currentDay <= endDate) {
      days.push({
        index: dayIndex,
        date: new Date(currentDay),
        label: `Day ${dayIndex + 1}: ${format(currentDay, 'MMM d')}`,
      });
      
      currentDay = addDays(currentDay, 1);
      dayIndex++;
    }
    
    return days;
  };
  
  if (!currentItinerary || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }
  
  const days = getDays();
  const filteredItems = getFilteredItems();
  const itemsWithLocation = getItemsWithLocation();
  const routeCoordinates = getRouteCoordinates();
  
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Map View" subtitle={currentItinerary.title} />
        <Appbar.Action 
          icon={routeVisible ? "route" : "route-off"} 
          onPress={() => setRouteVisible(!routeVisible)} 
        />
        <Appbar.Action 
          icon="fit-to-screen" 
          onPress={fitToMarkers} 
        />
      </Appbar.Header>
      
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip
            selected={selectedDay === null}
            onPress={() => setSelectedDay(null)}
            style={styles.filterChip}
            mode="outlined"
          >
            All Days
          </Chip>
          
          {days.map((day) => (
            <Chip
              key={day.index}
              selected={selectedDay === day.index}
              onPress={() => setSelectedDay(day.index)}
              style={styles.filterChip}
              mode="outlined"
            >
              {day.label}
            </Chip>
          ))}
        </ScrollView>
      </View>
      
      <View style={styles.typeFiltersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip
            selected={selectedType === null}
            onPress={() => setSelectedType(null)}
            style={styles.filterChip}
            mode="outlined"
          >
            All Types
          </Chip>
          
          {Object.entries(ACTIVITY_TYPES).map(([type, info]) => (
            <Chip
              key={type}
              selected={selectedType === type}
              onPress={() => setSelectedType(type)}
              style={[styles.filterChip, { borderColor: info.color }]}
              mode="outlined"
              icon={() => (
                <MaterialCommunityIcons
                  name={info.icon}
                  size={16}
                  color={selectedType === type ? COLORS.white : info.color}
                />
              )}
              selectedColor={info.color}
            >
              {info.label}
            </Chip>
          ))}
        </ScrollView>
      </View>
      
      {itemsWithLocation.length === 0 ? (
        <View style={styles.noLocationsContainer}>
          <MaterialCommunityIcons name="map-search" size={64} color={COLORS.lightGray} />
          <Text style={styles.noLocationsText}>
            No activities with location information found
          </Text>
          <Text style={styles.noLocationsSubtext}>
            {filteredItems.length > 0 
              ? "Try adding location details to your activities"
              : "Try adjusting your filters or add activities with locations"}
          </Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          onMapReady={fitToMarkers}
        >
          {itemsWithLocation.map((item) => (
            <Marker
              key={item._id}
              identifier={item._id}
              coordinate={{
                latitude: item.location.coordinates.latitude,
                longitude: item.location.coordinates.longitude,
              }}
              title={item.title}
              description={format(new Date(item.date), 'MMM d') + (item.startTime ? ` • ${item.startTime}` : '')}
              onPress={() => handleMarkerPress(item)}
            >
              <View style={[
                styles.markerContainer,
                { backgroundColor: ACTIVITY_TYPES[item.type]?.color || COLORS.primary }
              ]}>
                <MaterialCommunityIcons
                  name={ACTIVITY_TYPES[item.type]?.icon || 'map-marker'}
                  size={16}
                  color={COLORS.white}
                />
              </View>
            </Marker>
          ))}
          
          {routeVisible && routeCoordinates.length > 1 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={3}
              strokeColor={COLORS.primary}
              lineDashPattern={[1, 2]}
            />
          )}
        </MapView>
      )}
      
      <FAB
        style={styles.fab}
        icon="plus"
        label="Add Activity"
        onPress={() => {
          // Calculate date for selected day or use current itinerary start date
          const date = selectedDay !== null
            ? addDays(new Date(currentItinerary.startDate), selectedDay)
            : new Date(currentItinerary.startDate);
            
          navigation.navigate('AddActivity', {
            itineraryId,
            date: date.toISOString(),
            startTime: '09:00'
          });
        }}
      />
      
      <Portal>
        <Modal
          visible={activityModalVisible}
          onDismiss={() => setActivityModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          {selectedActivity && (
            <View>
              <Text style={styles.modalTitle}>{selectedActivity.title}</Text>
              
              <Text style={styles.modalDate}>
                {format(new Date(selectedActivity.date), 'EEEE, MMMM d, yyyy')}
              </Text>
              
              {selectedActivity.startTime && (
                <View style={styles.modalTimeContainer}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.gray} />
                  <Text style={styles.modalTime}>
                    {selectedActivity.startTime.substring(0, 5)} - {selectedActivity.endTime.substring(0, 5)}
                  </Text>
                </View>
              )}
              
              {selectedActivity.description && (
                <Text style={styles.modalDescription} numberOfLines={3}>
                  {selectedActivity.description}
                </Text>
              )}
              
              <View style={styles.modalButtonsContainer}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setActivityModalVisible(false);
                    navigation.navigate('ActivityDetail', {
                      itineraryId,
                      activityId: selectedActivity._id
                    });
                  }}
                  style={styles.modalButton}
                >
                  View Details
                </Button>
                
                <Button
                  mode="contained"
                  onPress={() => {
                    setActivityModalVisible(false);
                    // Open in external map app
                    if (selectedActivity.location && selectedActivity.location.coordinates) {
                      const { latitude, longitude } = selectedActivity.location.coordinates;
                      const url = Platform.OS === 'ios'
                        ? `maps:0,0?q=${selectedActivity.location.name}@${latitude},${longitude}`
                        : `geo:0,0?q=${latitude},${longitude}(${selectedActivity.location.name})`;
                      
                      Linking.openURL(url).catch(err => 
                        console.error('An error occurred while opening maps:', err)
                      );
                    }
                  }}
                  style={styles.modalButton}
                >
                  Get Directions
                </Button>
              </View>
            </View>
          )}
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  typeFiltersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  filterChip: {
    marginRight: 8,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
  },
  noLocationsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noLocationsText: {
    ...FONTS.h3,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  noLocationsSubtext: {
    ...FONTS.body4,
    textAlign: 'center',
    color: COLORS.gray,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    ...FONTS.h2,
    marginBottom: 8,
  },
  modalDate: {
    ...FONTS.body3,
    marginBottom: 8,
  },
  modalTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTime: {
    ...FONTS.body3,
    marginLeft: 8,
  },
  modalDescription: {
    ...FONTS.body3,
    marginTop: 8,
    marginBottom: 16,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});

export default ItineraryMapScreen;