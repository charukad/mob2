import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import {
  Appbar,
  Text,
  Divider,
  RadioButton,
  Button,
  Card,
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, isAfter } from 'date-fns';

// Import components
import EmptyState from '../../components/common/EmptyState';

// Import redux actions
import {
  fetchItineraries,
} from '../../store/slices/itinerariesSlice';
import {
  fetchEventById,
} from '../../store/slices/eventsSlice';

// Import theme
import { COLORS, FONTS } from '../../constants/theme';

const ItinerarySelectorScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { eventId } = route.params;
  
  const { itineraries, loading: itinerariesLoading } = useSelector(state => state.itineraries);
  const { currentEvent, loading: eventLoading } = useSelector(state => state.events);
  
  const [selectedItinerary, setSelectedItinerary] = useState(null);
  const [filterUpcoming, setFilterUpcoming] = useState(true);
  
  // Fetch itineraries and event details
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchItineraries());
      dispatch(fetchEventById(eventId));
    }, [dispatch, eventId])
  );
  
  // Filter itineraries based on date (upcoming only by default)
  const getFilteredItineraries = () => {
    if (!itineraries) return [];
    if (!filterUpcoming) return itineraries;
    
    const today = new Date();
    return itineraries.filter(itinerary => {
      const endDate = new Date(itinerary.endDate);
      return isAfter(endDate, today);
    });
  };
  
  // Handle adding event to selected itinerary
  const handleAddToItinerary = async () => {
    if (!selectedItinerary || !currentEvent) {
      Alert.alert('Error', 'Please select an itinerary to add this event.');
      return;
    }
    
    try {
      // In a real app, this would dispatch an action to add the event to the itinerary
      // For now, we'll just show a success message
      
      Alert.alert(
        'Success',
        `Event "${currentEvent.title}" has been added to your itinerary "${selectedItinerary.title}".`,
        [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('ItineraryDetail', { itineraryId: selectedItinerary._id }) 
          }
        ]
      );
    } catch (error) {
      console.error('Error adding event to itinerary:', error);
      Alert.alert('Error', 'Failed to add event to itinerary. Please try again.');
    }
  };
  
  const filteredItineraries = getFilteredItineraries();
  const loading = itinerariesLoading || eventLoading;
  
  // Render itinerary item
  const renderItineraryItem = ({ item }) => {
    const startDate = new Date(item.startDate);
    const endDate = new Date(item.endDate);
    
    return (
      <TouchableOpacity
        style={[
          styles.itineraryItem,
          selectedItinerary?._id === item._id && styles.selectedItineraryItem
        ]}
        onPress={() => setSelectedItinerary(item)}
      >
        <View style={styles.radioContainer}>
          <RadioButton
            value={item._id}
            status={selectedItinerary?._id === item._id ? 'checked' : 'unchecked'}
            onPress={() => setSelectedItinerary(item)}
            color={COLORS.primary}
          />
        </View>
        
        <View style={styles.itineraryInfo}>
          <Text style={styles.itineraryTitle}>{item.title}</Text>
          <Text style={styles.itineraryDate}>
            {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
          </Text>
          
          <View style={styles.itineraryStats}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="calendar-range" size={16} color={COLORS.gray} />
              <Text style={styles.statText}>
                {Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24) + 1)} days
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="map-marker-path" size={16} color={COLORS.gray} />
              <Text style={styles.statText}>
                {item.activitiesCount || 0} activities
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Add to Itinerary" />
      </Appbar.Header>
      
      <View style={styles.content}>
        {/* Event Info */}
        {currentEvent && (
          <Card style={styles.eventCard}>
            <Card.Content>
              <Text style={styles.cardTitle}>
                Adding Event to Itinerary:
              </Text>
              <Text style={styles.eventTitle}>{currentEvent.title}</Text>
              
              <View style={styles.eventInfo}>
                <MaterialCommunityIcons name="calendar" size={16} color={COLORS.primary} />
                <Text style={styles.eventDate}>
                  {format(new Date(currentEvent.startDate), 'MMMM d, yyyy')}
                </Text>
              </View>
              
              {currentEvent.location && (
                <View style={styles.eventInfo}>
                  <MaterialCommunityIcons name="map-marker" size={16} color={COLORS.primary} />
                  <Text style={styles.eventLocation}>{currentEvent.location.name}</Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}
        
        <Divider style={styles.divider} />
        
        {/* Filter Toggle */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterTitle}>Select an Itinerary:</Text>
          
          <TouchableOpacity
            style={styles.filterToggle}
            onPress={() => setFilterUpcoming(!filterUpcoming)}
          >
            <Text style={styles.filterLabel}>
              Show {filterUpcoming ? 'all' : 'only upcoming'} itineraries
            </Text>
            <MaterialCommunityIcons
              name={filterUpcoming ? 'filter' : 'filter-off'}
              size={20}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        </View>
        
        {/* Itineraries List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : filteredItineraries.length > 0 ? (
          <FlatList
            data={filteredItineraries}
            renderItem={renderItineraryItem}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.listContainer}
            ItemSeparatorComponent={() => <Divider />}
          />
        ) : (
          <EmptyState
            icon="calendar-blank"
            title="No itineraries found"
            message={
              filterUpcoming
                ? "You don't have any upcoming itineraries. Try showing all itineraries or create a new one."
                : "You don't have any itineraries yet. Create an itinerary to add this event."
            }
            actionLabel="Create Itinerary"
            onAction={() => navigation.navigate('CreateItinerary')}
          />
        )}
      </View>
      
      {/* Bottom Buttons */}
      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.button}
        >
          Cancel
        </Button>
        
        <Button
          mode="contained"
          onPress={handleAddToItinerary}
          disabled={!selectedItinerary}
          style={[styles.button, styles.primaryButton]}
        >
          Add to Itinerary
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  eventCard: {
    marginBottom: 16,
  },
  cardTitle: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginBottom: 4,
  },
  eventTitle: {
    ...FONTS.h3,
    marginBottom: 8,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  eventDate: {
    ...FONTS.body4,
    color: COLORS.darkGray,
    marginLeft: 8,
  },
  eventLocation: {
    ...FONTS.body4,
    color: COLORS.darkGray,
    marginLeft: 8,
  },
  divider: {
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterTitle: {
    ...FONTS.h3,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    ...FONTS.body4,
    color: COLORS.primary,
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flexGrow: 1,
  },
  itineraryItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.white,
  },
  selectedItineraryItem: {
    backgroundColor: COLORS.lightGray,
  },
  radioContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  itineraryInfo: {
    flex: 1,
  },
  itineraryTitle: {
    ...FONTS.body2Bold,
    marginBottom: 4,
  },
  itineraryDate: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginBottom: 8,
  },
  itineraryStats: {
    flexDirection: 'row',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginLeft: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
});

export default ItinerarySelectorScreen;