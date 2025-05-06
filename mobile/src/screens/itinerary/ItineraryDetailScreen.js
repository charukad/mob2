import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Appbar, FAB, Portal, Dialog, Button, Divider, Chip, Menu } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, differenceInDays, addDays } from 'date-fns';

// Import components
import DayTimeline from '../../components/itinerary/DayTimeline';
import { COLORS, FONTS, SIZES } from '../../constants/theme';

// Import redux actions
import { 
  fetchItineraryById, 
  fetchItineraryItems,
  deleteItinerary,
  fetchDailySummary
} from '../../store/slices/itinerariesSlice';

const screenWidth = Dimensions.get('window').width;

const ItineraryDetailScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { itineraryId } = route.params;
  
  const { 
    currentItinerary, 
    itineraryItems, 
    dailySummary,
    loading 
  } = useSelector(state => state.itineraries);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDay, setSelectedDay] = useState(0); // 0-based index for days
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Fetch itinerary data when screen is focused
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchItineraryById(itineraryId));
      dispatch(fetchItineraryItems(itineraryId));
    }, [dispatch, itineraryId])
  );
  
  // When current itinerary changes, fetch daily summary
  useEffect(() => {
    if (currentItinerary && selectedDay >= 0) {
      const dayDate = addDays(new Date(currentItinerary.startDate), selectedDay);
      dispatch(fetchDailySummary({ itineraryId, date: dayDate.toISOString() }));
    }
  }, [dispatch, itineraryId, currentItinerary, selectedDay]);
  
  if (!currentItinerary || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }
  
  // Calculate trip duration in days
  const startDate = new Date(currentItinerary.startDate);
  const endDate = new Date(currentItinerary.endDate);
  const durationDays = differenceInDays(endDate, startDate) + 1;
  
  // Get items for the selected day
  const getItemsForDay = (dayIndex) => {
    if (!itineraryItems) return [];
    
    const dayDate = addDays(new Date(currentItinerary.startDate), dayIndex);
    const formattedDate = format(dayDate, 'yyyy-MM-dd');
    
    return itineraryItems.filter(item => {
      const itemDate = item.date?.split('T')[0];
      return itemDate === formattedDate;
    });
  };
  
  // Handle adding a new activity
  const handleAddActivity = (time) => {
    const dayDate = addDays(new Date(currentItinerary.startDate), selectedDay);
    navigation.navigate('AddActivity', {
      itineraryId,
      date: dayDate.toISOString(),
      startTime: time
    });
  };
  
  // Handle editing an activity
  const handleEditActivity = (activity) => {
    navigation.navigate('EditActivity', {
      itineraryId,
      activityId: activity._id
    });
  };
  
  // Handle deleting an activity
  const handleDeleteActivity = (activity) => {
    // To be implemented with a confirmation dialog
  };
  
  // Handle viewing an activity
  const handleViewActivity = (activity) => {
    navigation.navigate('ActivityDetail', {
      itineraryId,
      activityId: activity._id
    });
  };
  
  // Generate days array for the horizontal day selector
  const days = Array.from({ length: durationDays }, (_, index) => {
    const day = addDays(startDate, index);
    return {
      index,
      date: day,
      dayOfWeek: format(day, 'E'),
      dayOfMonth: format(day, 'd'),
      month: format(day, 'MMM'),
      formattedDate: format(day, 'yyyy-MM-dd')
    };
  });
  
  // Handle delete confirmation
  const confirmDelete = () => {
    dispatch(deleteItinerary(itineraryId))
      .unwrap()
      .then(() => {
        setDeleteDialogVisible(false);
        navigation.navigate('Itineraries');
      });
  };
  
  // Render the overview tab
  const renderOverviewTab = () => {
    return (
      <ScrollView style={styles.tabContent}>
        {/* Trip Overview */}
        <View style={styles.overviewSection}>
          <Text style={styles.sectionTitle}>Trip Overview</Text>
          <Text style={styles.description}>{currentItinerary.description || 'No description provided.'}</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="calendar-range" size={24} color={COLORS.primary} />
              <Text style={styles.statValue}>{durationDays}</Text>
              <Text style={styles.statLabel}>Days</Text>
            </View>
            
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="map-marker-path" size={24} color={COLORS.primary} />
              <Text style={styles.statValue}>{itineraryItems?.length || 0}</Text>
              <Text style={styles.statLabel}>Activities</Text>
            </View>
            
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="currency-usd" size={24} color={COLORS.primary} />
              <Text style={styles.statValue}>
                {currentItinerary.budget ? `${currentItinerary.budget} ${currentItinerary.currency || 'USD'}` : 'N/A'}
              </Text>
              <Text style={styles.statLabel}>Budget</Text>
            </View>
          </View>
        </View>
        
        <Divider style={styles.divider} />
        
        {/* Daily Summary */}
        <View style={styles.overviewSection}>
          <Text style={styles.sectionTitle}>Daily Schedule</Text>
          
          {days.map((day, index) => (
            <TouchableOpacity 
              key={day.formattedDate}
              style={styles.daySummaryCard}
              onPress={() => {
                setSelectedDay(index);
                setActiveTab('dayByDay');
              }}
            >
              <View style={styles.daySummaryHeader}>
                <View>
                  <Text style={styles.daySummaryTitle}>
                    Day {index + 1}: {format(day.date, 'EEEE, MMMM d')}
                  </Text>
                  <Text style={styles.daySummaryCount}>
                    {getItemsForDay(index).length} activities
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.gray} />
              </View>
              
              {getItemsForDay(index).length > 0 ? (
                <View style={styles.daySummaryActivities}>
                  {getItemsForDay(index).slice(0, 2).map((item, idx) => (
                    <View key={idx} style={styles.daySummaryActivity}>
                      <Text style={styles.daySummaryTime}>
                        {item.startTime ? format(new Date(`2000-01-01T${item.startTime}`), 'h:mm a') : 'All day'}
                      </Text>
                      <Text style={styles.daySummaryActivityTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                    </View>
                  ))}
                  
                  {getItemsForDay(index).length > 2 && (
                    <Text style={styles.moreDayActivities}>
                      +{getItemsForDay(index).length - 2} more activities
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.noActivities}>No activities planned</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  };
  
  // Render the day-by-day tab
  const renderDayByDayTab = () => {
    const selectedDayItems = getItemsForDay(selectedDay);
    const selectedDayDate = days[selectedDay].date;
    
    return (
      <View style={styles.dayByDayContainer}>
        {/* Horizontal day selector */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.daySelector}
        >
          {days.map((day, index) => (
            <TouchableOpacity
              key={day.formattedDate}
              style={[
                styles.dayItem,
                selectedDay === index && styles.selectedDayItem
              ]}
              onPress={() => setSelectedDay(index)}
            >
              <Text style={[
                styles.dayOfWeek,
                selectedDay === index && styles.selectedDayText
              ]}>
                {day.dayOfWeek}
              </Text>
              <Text style={[
                styles.dayOfMonth,
                selectedDay === index && styles.selectedDayText
              ]}>
                {day.dayOfMonth}
              </Text>
              <Text style={[
                styles.month,
                selectedDay === index && styles.selectedDayText
              ]}>
                {day.month}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <Divider />
        
        {/* Selected day header */}
        <View style={styles.selectedDayHeader}>
          <Text style={styles.selectedDayTitle}>
            Day {selectedDay + 1}: {format(selectedDayDate, 'EEEE, MMMM d')}
          </Text>
          
          {dailySummary && (
            <View style={styles.dailySummaryChips}>
              {dailySummary.weather && (
                <Chip 
                  icon="weather-partly-cloudy" 
                  style={styles.summaryChip}
                >
                  {dailySummary.weather}
                </Chip>
              )}
              
              {dailySummary.totalDistance > 0 && (
                <Chip 
                  icon="map-marker-distance" 
                  style={styles.summaryChip}
                >
                  {dailySummary.totalDistance.toFixed(1)} km
                </Chip>
              )}
              
              {dailySummary.totalCost > 0 && (
                <Chip 
                  icon="currency-usd" 
                  style={styles.summaryChip}
                >
                  {dailySummary.totalCost.toFixed(2)} {currentItinerary.currency || 'USD'}
                </Chip>
              )}
            </View>
          )}
        </View>
        
        {/* Day timeline */}
        <DayTimeline
          activities={selectedDayItems}
          date={selectedDayDate}
          onActivityPress={handleViewActivity}
          onEditActivity={handleEditActivity}
          onDeleteActivity={handleDeleteActivity}
          onAddActivity={handleAddActivity}
        />
      </View>
    );
  };
  
  // Render the map tab
  const renderMapTab = () => {
    return (
      <View style={styles.mapContainer}>
        <Text style={styles.comingSoonText}>Map view coming soon!</Text>
      </View>
    );
  };
  
  // Render the active tab
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'dayByDay':
        return renderDayByDayTab();
      case 'map':
        return renderMapTab();
      default:
        return renderOverviewTab();
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Header with cover image */}
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color={COLORS.white} />
        <Appbar.Content title="" color={COLORS.white} />
        <Appbar.Action 
          icon="dots-vertical" 
          color={COLORS.white} 
          onPress={() => setMenuVisible(true)} 
        />
        
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={{ x: screenWidth - 40, y: 40 }}
        >
          <Menu.Item 
            icon="pencil" 
            onPress={() => {
              setMenuVisible(false);
              navigation.navigate('EditItinerary', { itineraryId });
            }} 
            title="Edit Itinerary" 
          />
          <Menu.Item 
            icon="share-variant" 
            onPress={() => {
              setMenuVisible(false);
              // Share functionality to be implemented
            }} 
            title="Share" 
          />
          <Menu.Item 
            icon="delete" 
            onPress={() => {
              setMenuVisible(false);
              setDeleteDialogVisible(true);
            }} 
            title="Delete" 
            titleStyle={{ color: COLORS.error }}
          />
        </Menu>
      </Appbar.Header>
      
      <ImageBackground
        source={{ uri: currentItinerary.coverImage || 'https://res.cloudinary.com/demo/image/upload/placeholder_travel.jpg' }}
        style={styles.coverImage}
      >
        <View style={styles.headerOverlay}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{currentItinerary.title}</Text>
            <Text style={styles.dateRange}>
              {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')} • {durationDays} days
            </Text>
          </View>
        </View>
      </ImageBackground>
      
      {/* Tab navigation */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <MaterialCommunityIcons
            name="information-outline"
            size={24}
            color={activeTab === 'overview' ? COLORS.primary : COLORS.gray}
          />
          <Text style={[
            styles.tabText,
            activeTab === 'overview' && styles.activeTabText
          ]}>
            Overview
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dayByDay' && styles.activeTab]}
          onPress={() => setActiveTab('dayByDay')}
        >
          <MaterialCommunityIcons
            name="calendar-timeline"
            size={24}
            color={activeTab === 'dayByDay' ? COLORS.primary : COLORS.gray}
          />
          <Text style={[
            styles.tabText,
            activeTab === 'dayByDay' && styles.activeTabText
          ]}>
            Day by Day
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'map' && styles.activeTab]}
          onPress={() => setActiveTab('map')}
        >
          <MaterialCommunityIcons
            name="map"
            size={24}
            color={activeTab === 'map' ? COLORS.primary : COLORS.gray}
          />
          <Text style={[
            styles.tabText,
            activeTab === 'map' && styles.activeTabText
          ]}>
            Map
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Tab content */}
      {renderActiveTab()}
      
      {/* FAB for adding activities */}
      {activeTab === 'dayByDay' && (
        <FAB
          style={styles.fab}
          icon="plus"
          label="Add Activity"
          onPress={() => handleAddActivity('12:00')}
          color={COLORS.white}
        />
      )}
      
      {/* Delete confirmation dialog */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Itinerary</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete "{currentItinerary.title}"? This action cannot be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={confirmDelete} color={COLORS.error}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
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
  appbar: {
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    elevation: 0,
  },
  coverImage: {
    height: 200,
    width: '100%',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  headerContent: {
    padding: 16,
  },
  title: {
    ...FONTS.h1,
    color: COLORS.white,
    marginBottom: 8,
  },
  dateRange: {
    ...FONTS.body3,
    color: COLORS.white,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginLeft: 4,
  },
  activeTabText: {
    color: COLORS.primary,
    ...FONTS.body4Bold,
  },
  tabContent: {
    flex: 1,
  },
  overviewSection: {
    padding: 16,
  },
  sectionTitle: {
    ...FONTS.h2,
    marginBottom: 16,
  },
  description: {
    ...FONTS.body3,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...FONTS.h3,
    marginTop: 4,
  },
  statLabel: {
    ...FONTS.body4,
    color: COLORS.gray,
  },
  divider: {
    marginVertical: 16,
  },
  daySummaryCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
  },
  daySummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  daySummaryTitle: {
    ...FONTS.h4,
  },
  daySummaryCount: {
    ...FONTS.body4,
    color: COLORS.gray,
  },
  daySummaryActivities: {
    marginTop: 8,
  },
  daySummaryActivity: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  daySummaryTime: {
    ...FONTS.body4,
    width: 80,
    color: COLORS.gray,
  },
  daySummaryActivityTitle: {
    ...FONTS.body4,
    flex: 1,
  },
  moreDayActivities: {
    ...FONTS.body4,
    color: COLORS.primary,
    marginTop: 4,
  },
  noActivities: {
    ...FONTS.body4,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  dayByDayContainer: {
    flex: 1,
  },
  daySelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: 8,
  },
  dayItem: {
    width: 60,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 8,
  },
  selectedDayItem: {
    backgroundColor: COLORS.primary,
  },
  dayOfWeek: {
    ...FONTS.body4,
    color: COLORS.gray,
  },
  dayOfMonth: {
    ...FONTS.h3,
    marginVertical: 2,
  },
  month: {
    ...FONTS.body4,
    color: COLORS.gray,
  },
  selectedDayText: {
    color: COLORS.white,
  },
  selectedDayHeader: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  selectedDayTitle: {
    ...FONTS.h3,
    marginBottom: 8,
  },
  dailySummaryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  summaryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  mapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonText: {
    ...FONTS.h3,
    color: COLORS.gray,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
  },
});

export default ItineraryDetailScreen;