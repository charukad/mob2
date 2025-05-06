import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { Text, Appbar, Chip, ActivityIndicator, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, isSameDay, addMonths } from 'date-fns';

// Import components
import CalendarEventItem from '../../components/events/CalendarEventItem';
import EmptyState from '../../components/common/EmptyState';

// Import redux actions
import { fetchEventsByDate, fetchEventDates, fetchUpcomingEvents } from '../../store/slices/eventsSlice';

// Import theme
import { COLORS, FONTS } from '../../constants/theme';

const CalendarScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { eventsByDate, eventDates, loading, error, upcomingEvents } = useSelector(state => state.events);
  
  // Initialize with April 2025 as default
  const defaultDate = '2025-04-22';
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [currentMonthYear, setCurrentMonthYear] = useState({
    month: 4, // April
    year: 2025 
  });
  const [viewingAllEvents, setViewingAllEvents] = useState(false);
  
  // Fetch events for selected date
  useFocusEffect(
    useCallback(() => {
      console.log(`Fetching events for date: ${selectedDate}`);
      dispatch(fetchEventsByDate({ date: selectedDate, categories: selectedCategories }));
      console.log(`Fetching event dates for month: ${currentMonthYear.month}, year: ${currentMonthYear.year}`);
      dispatch(fetchEventDates({ month: currentMonthYear.month, year: currentMonthYear.year }));
    }, [dispatch, selectedDate, selectedCategories, currentMonthYear])
  );
  
  // Debug UI: Log event data
  useEffect(() => {
    console.log("Current eventDates:", eventDates ? Object.keys(eventDates) : "none");
    console.log("Current eventsByDate:", eventsByDate ? eventsByDate.length : "none");
    if (eventsByDate) {
      eventsByDate.forEach(event => {
        console.log(`- Event: ${event.title}, Start: ${event.startDate}, End: ${event.endDate}`);
      });
    }
  }, [eventDates, eventsByDate]);
  
  // Update marked dates when eventDates changes
  useEffect(() => {
    const marked = {};
    
    // Mark today's date
    const today = format(new Date(), 'yyyy-MM-dd');
    marked[today] = { 
      selected: selectedDate === today,
      selectedColor: COLORS.primary,
      marked: eventDates && Object.keys(eventDates).includes(today),
      dotColor: COLORS.primary
    };
    
    // Mark the selected date
    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: COLORS.primary
    };
    
    // Mark dates with events
    if (eventDates) {
      Object.keys(eventDates).forEach(date => {
        marked[date] = {
          ...marked[date],
          selected: selectedDate === date,
          selectedColor: COLORS.primary,
          marked: true,
          dotColor: COLORS.primary
        };
      });
    }
    
    console.log('Marked dates:', Object.keys(marked));
    setMarkedDates(marked);
  }, [eventDates, selectedDate]);
  
  // Handle date selection
  const handleDateSelect = (date) => {
    console.log(`Selected date: ${date.dateString}`);
    setSelectedDate(date.dateString);
    setViewingAllEvents(false); // Reset to date view when a date is selected
  };
  
  // Handle month changes
  const handleMonthChange = (month) => {
    console.log(`Month changed to: ${month.month}, year: ${month.year}`);
    setCurrentMonthYear({
      month: month.month,
      year: month.year
    });
  };
  
  // Handle category selection
  const toggleCategory = (category) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(cat => cat !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };
  
  // Manual refresh function
  const handleManualRefresh = () => {
    console.log("Manual refresh triggered");
    if (viewingAllEvents) {
      fetchAllUpcomingEvents();
    } else {
      dispatch(fetchEventsByDate({ date: selectedDate, categories: selectedCategories }));
      dispatch(fetchEventDates({ month: currentMonthYear.month, year: currentMonthYear.year }));
    }
  };
  
  // Fetch all upcoming events for next 3 months
  const fetchAllUpcomingEvents = () => {
    const today = new Date();
    const threeMonthsLater = addMonths(today, 3);
    
    const startDate = format(today, 'yyyy-MM-dd');
    const endDate = format(threeMonthsLater, 'yyyy-MM-dd');
    
    console.log(`Fetching all upcoming events from ${startDate} to ${endDate}`);
    
    dispatch(fetchUpcomingEvents({ 
      startDate, 
      endDate, 
      categories: selectedCategories 
    }));
    
    setViewingAllEvents(true);
  };
  
  // Format date for display
  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    return format(date, 'EEEE, MMMM d, yyyy');
  };
  
  // Get visible categories from current events
  const getEventCategories = () => {
    const categories = new Set();
    const events = viewingAllEvents ? upcomingEvents : eventsByDate;
    
    if (events) {
      events.forEach(event => {
        if (event.categories && event.categories.length > 0) {
          event.categories.forEach(category => {
            categories.add(category);
          });
        }
      });
    }
    
    return Array.from(categories);
  };
  
  // Filter events by selected categories
  const getFilteredEvents = () => {
    const events = viewingAllEvents ? upcomingEvents : eventsByDate;
    
    if (!events) return [];
    if (selectedCategories.length === 0) return events;
    
    return events.filter(event => {
      if (!event.categories || event.categories.length === 0) return false;
      return event.categories.some(category => selectedCategories.includes(category));
    });
  };
  
  const filteredEvents = getFilteredEvents();
  const visibleCategories = getEventCategories();
  
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.navigate('Events')} />
        <Appbar.Content title="Event Calendar" />
        <Appbar.Action icon="refresh" onPress={handleManualRefresh} />
      </Appbar.Header>
      
      {/* Add View All Events button */}
      <Button
        mode="contained"
        icon="calendar-month"
        style={styles.viewAllButton}
        onPress={() => navigation.navigate('EventCalendar')}
      >
        View All Events
      </Button>
      
      {!viewingAllEvents && (
        <Calendar
          current={selectedDate}
          onDayPress={handleDateSelect}
          onMonthChange={handleMonthChange}
          markedDates={markedDates}
          theme={{
            todayTextColor: COLORS.primary,
            arrowColor: COLORS.primary,
            dotColor: COLORS.primary,
            selectedDayBackgroundColor: COLORS.primary,
          }}
        />
      )}
      
      <View style={styles.selectedDateContainer}>
        {viewingAllEvents ? (
          <Text style={styles.selectedDateText}>All Upcoming Events (Next 3 Months)</Text>
        ) : (
          <Text style={styles.selectedDateText}>{formatDisplayDate(selectedDate)}</Text>
        )}
        
        <View style={styles.actionButtonsContainer}>
          {viewingAllEvents ? (
            <Button 
              mode="contained" 
              onPress={() => setViewingAllEvents(false)} 
              style={styles.viewButton}
            >
              Back to Calendar
            </Button>
          ) : (
            <Button 
              mode="contained" 
              onPress={fetchAllUpcomingEvents} 
              style={styles.viewButton}
              icon="calendar-month"
            >
              View All Upcoming Events
            </Button>
          )}
        </View>
        
        {visibleCategories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryContainer}
          >
            {visibleCategories.map(category => (
              <Chip
                key={category}
                selected={selectedCategories.includes(category)}
                onPress={() => toggleCategory(category)}
                style={styles.categoryChip}
                selectedColor={COLORS.primary}
              >
                {category}
              </Chip>
            ))}
          </ScrollView>
        )}
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error.message || "Failed to load events"}</Text>
          <Button mode="contained" onPress={handleManualRefresh} style={styles.retryButton}>
            Retry
          </Button>
        </View>
      )}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : filteredEvents && filteredEvents.length > 0 ? (
        <FlatList
          data={filteredEvents}
          renderItem={({ item }) => <CalendarEventItem event={item} />}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.eventListContainer}
        />
      ) : (
        <EmptyState
          icon="calendar-blank"
          title={viewingAllEvents ? "No upcoming events found" : "No events on this day"}
          message={
            selectedCategories.length > 0
              ? "Try adjusting your category filters"
              : viewingAllEvents 
                ? "There are no events scheduled for the next 3 months" 
                : "There are no events scheduled for this date"
          }
          actionLabel={selectedCategories.length > 0 ? "Clear Filters" : "Try Another Date"}
          onAction={selectedCategories.length > 0 ? 
            () => setSelectedCategories([]) : 
            () => setSelectedDate('2025-04-13')}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  selectedDateContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  selectedDateText: {
    ...FONTS.h3,
    marginBottom: 8,
  },
  actionButtonsContainer: {
    marginBottom: 12,
  },
  viewButton: {
    backgroundColor: COLORS.primary,
    marginVertical: 8,
  },
  categoryContainer: {
    paddingVertical: 8,
  },
  categoryChip: {
    marginRight: 8,
  },
  eventListContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#ffebee',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  errorText: {
    color: '#c62828',
    marginBottom: 10
  },
  retryButton: {
    backgroundColor: COLORS.primary
  },
  viewAllButton: {
    margin: 16,
    backgroundColor: COLORS.primary,
  },
});

export default CalendarScreen;