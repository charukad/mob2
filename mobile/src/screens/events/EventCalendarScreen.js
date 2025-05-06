import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { 
  Text, 
  Appbar, 
  Chip, 
  ActivityIndicator, 
  Button,
  IconButton,
  Badge,
  Surface,
  Divider
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { addMonths, format, parseISO, isSameDay, startOfMonth, getDay, isToday } from 'date-fns';

// Import redux actions
import { fetchUpcomingEvents } from '../../store/slices/eventsSlice';

// Import theme
import { COLORS, FONTS } from '../../constants/theme';

const EventCalendarScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { upcomingEvents, loading, usingMockData, error } = useSelector(state => state.events);
  
  // State for selected categories and view
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Fetch all upcoming events for next 3 months
  useFocusEffect(
    React.useCallback(() => {
      fetchAllUpcomingEvents();
    }, [dispatch, selectedCategories])
  );
  
  const fetchAllUpcomingEvents = () => {
    const today = new Date();
    const threeMonthsLater = addMonths(today, 3);
    
    const startDate = format(today, 'yyyy-MM-dd');
    const endDate = format(threeMonthsLater, 'yyyy-MM-dd');
    
    dispatch(fetchUpcomingEvents({ 
      startDate, 
      endDate, 
      categories: selectedCategories 
    }));
  };
  
  // Toggle category selection
  const toggleCategory = (category) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(cat => cat !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };
  
  // Filter events based on selected categories
  const getFilteredEvents = () => {
    // Mock data for demonstration if no events are available
    const mockEvents = [
      {
        _id: "mock001",
        title: "Sinhala and Tamil New Year Festival",
        description: "Traditional new year celebration with cultural events",
        startDate: "2025-04-13",
        endDate: "2025-04-14",
        location: {
          name: "Colombo",
          address: "Independence Square",
          city: "Colombo",
          coordinates: {
            latitude: 6.9101,
            longitude: 79.8674
          }
        },
        categories: ["Cultural", "Festival"],
        image: "https://example.com/sinhala-tamil-new-year.jpg",
        organizer: "Ministry of Cultural Affairs",
        isFeatured: true,
        isFree: true
      },
      {
        _id: "mock002",
        title: "Kandy Esala Perahera",
        description: "Historical procession featuring dancers and elephants",
        startDate: "2025-08-05",
        endDate: "2025-08-15",
        location: {
          name: "Kandy",
          address: "Temple of the Sacred Tooth Relic",
          city: "Kandy",
          coordinates: {
            latitude: 7.2906,
            longitude: 80.6337
          }
        },
        categories: ["Religious", "Cultural"],
        image: "https://example.com/esala-perahera.jpg",
        organizer: "Temple of the Sacred Tooth Relic",
        isFeatured: true,
        isFree: false
      }
    ];

    // Use mock data if no real data is available
    const eventsData = (!upcomingEvents || upcomingEvents.length === 0) ? mockEvents : upcomingEvents;
    
    if (selectedCategories.length === 0) return eventsData;
    
    return eventsData.filter(event => {
      if (!event.categories || event.categories.length === 0) return false;
      return event.categories.some(category => selectedCategories.includes(category));
    });
  };
  
  const filteredEvents = getFilteredEvents();
  
  // Get events for selected date
  const getEventsForDate = (date) => {
    return filteredEvents.filter(event => {
      const eventStartDate = parseISO(event.startDate);
      const eventEndDate = event.endDate ? parseISO(event.endDate) : eventStartDate;
      
      // Check if the date falls within the event's date range
      return (date >= eventStartDate && date <= eventEndDate);
    });
  };
  
  // Available categories
  const availableCategories = ['Cultural', 'Festival', 'Religious'];
  
  // Format date string
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };
  
  // Generate calendar days for the month
  const generateCalendarDays = () => {
    const daysInMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    ).getDate();
    
    const firstDayOfMonth = startOfMonth(currentMonth);
    const startingDayOfWeek = getDay(firstDayOfMonth); // 0 = Sunday, 1 = Monday, etc.
    
    const days = [];
    
    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: '', empty: true });
    }
    
    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      const events = getEventsForDate(date);
      days.push({
        day: i,
        date,
        events,
        isToday: isToday(date),
        isSelected: isSameDay(date, selectedDate)
      });
    }
    
    return days;
  };
  
  // Change month
  const changeMonth = (increment) => {
    setCurrentMonth(new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + increment,
      1
    ));
  };
  
  // Event item renderer
  const renderEventItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.eventItem}
      onPress={() => navigation.navigate('EventDetail', { eventId: item._id })}
    >
      <View style={[styles.eventColorBar, { 
        backgroundColor: item.categories.includes('Cultural') ? '#4CAF50' : 
                        item.categories.includes('Religious') ? '#2196F3' : '#FFC107' 
      }]} />
      <View style={styles.eventContent}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <View style={styles.eventMetaRow}>
          <View style={styles.eventMetaItem}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
            <Text style={styles.eventMetaText}>
              {item.startDate === item.endDate 
                ? 'All day' 
                : `${formatDate(item.startDate)}${item.endDate ? ` - ${formatDate(item.endDate)}` : ''}`}
            </Text>
          </View>
          <View style={styles.eventMetaItem}>
            <MaterialCommunityIcons name="map-marker-outline" size={16} color="#666" />
            <Text style={styles.eventMetaText}>{item.location?.city || 'Sri Lanka'}</Text>
          </View>
        </View>
      </View>
      <IconButton
        icon="star-outline"
        size={24}
        color="#4287f5"
        onPress={() => {}}
        style={styles.starButton}
      />
    </TouchableOpacity>
  );
  
  // Render day cell
  const renderDayCell = (dayInfo) => {
    if (dayInfo.empty) {
      return <View style={styles.emptyDay} />;
    }
    
    const hasEvents = dayInfo.events && dayInfo.events.length > 0;
    
    return (
      <TouchableOpacity
        style={[
          styles.dayCell,
          dayInfo.isToday && styles.todayCell,
          dayInfo.isSelected && styles.selectedDayCell
        ]}
        onPress={() => {
          setSelectedDate(dayInfo.date);
        }}
      >
        <Text style={[
          styles.dayText,
          dayInfo.isToday && styles.todayText,
          dayInfo.isSelected && styles.selectedDayText
        ]}>
          {dayInfo.day}
        </Text>
        {hasEvents && (
          <View style={styles.eventIndicator}>
            {dayInfo.events.length > 1 ? (
              <Text style={styles.eventCount}>{dayInfo.events.length}</Text>
            ) : (
              <View style={[
                styles.singleEventDot,
                { backgroundColor: dayInfo.events[0].categories.includes('Cultural') ? '#4CAF50' : 
                                  dayInfo.events[0].categories.includes('Religious') ? '#2196F3' : '#FFC107' }
              ]} />
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  // Render selected day events
  const renderSelectedDateEvents = () => {
    const eventsForSelectedDate = getEventsForDate(selectedDate);
    
    if (eventsForSelectedDate.length === 0) {
      return (
        <View style={styles.noEventsContainer}>
          <MaterialCommunityIcons name="calendar-blank" size={48} color="#AAA" />
          <Text style={styles.noEventsText}>No events on this date</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.selectedDateEventsContainer}>
        <Text style={styles.selectedDateHeader}>
          Events on {format(selectedDate, 'MMMM d, yyyy')}
        </Text>
        <FlatList
          data={eventsForSelectedDate}
          renderItem={renderEventItem}
          keyExtractor={item => item._id}
          scrollEnabled={false}
        />
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Event Calendar" />
        <Appbar.Action icon="refresh" onPress={fetchAllUpcomingEvents} />
      </Appbar.Header>
      
      {/* Google Calendar API indicator */}
      <View style={styles.apiSourceContainer}>
        <MaterialCommunityIcons name="google" size={16} color="#4285F4" />
        <Text style={styles.apiSourceText}>Powered by Google Calendar</Text>
      </View>
      
      {/* Mock data warning if using fallback data */}
      {usingMockData && (
        <View style={styles.mockDataWarning}>
          <MaterialCommunityIcons name="wifi-off" size={16} color="#FFC107" />
          <Text style={styles.mockDataText}>
            Network error - using sample data
          </Text>
        </View>
      )}
      
      {/* View toggle button */}
      <Button
        mode="contained"
        icon={showCalendarView ? "format-list-bulleted" : "calendar"}
        style={styles.viewAllButton}
        onPress={() => setShowCalendarView(!showCalendarView)}
        labelStyle={styles.viewAllButtonLabel}
      >
        {showCalendarView ? "Show List View" : "Show Calendar View"}
      </Button>
      
      <View style={styles.content}>
        <Text style={styles.header}>All Upcoming Events (Next 3 Months)</Text>
        
        {/* Back to Calendar button */}
        <Button
          mode="contained"
          style={styles.backButton}
          labelStyle={styles.buttonLabel}
          onPress={() => navigation.navigate('Calendar')}
        >
          Back to Calendar
        </Button>
        
        {/* Category filters */}
        <View style={styles.categoryFilters}>
          {availableCategories.map((category) => (
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
        </View>
        
        {/* Divider */}
        <View style={styles.divider} />
        
        {/* Error message with retry button */}
        {error && !usingMockData && (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#F44336" />
            <Text style={styles.errorText}>{error}</Text>
            <Button 
              mode="contained" 
              onPress={fetchAllUpcomingEvents} 
              style={styles.retryButton}
            >
              Retry
            </Button>
          </View>
        )}
        
        {/* Loading indicator */}
        {loading && (
          <ActivityIndicator style={styles.loader} color={COLORS.primary} size="large" />
        )}
        
        {/* Calendar View */}
        {!loading && showCalendarView && (
          <ScrollView>
            <Surface style={styles.calendarContainer}>
              {/* Calendar header with month navigation */}
              <View style={styles.calendarHeader}>
                <IconButton 
                  icon="chevron-left" 
                  onPress={() => changeMonth(-1)}
                  size={24}
                />
                <Text style={styles.monthYearText}>
                  {format(currentMonth, 'MMMM yyyy')}
                </Text>
                <IconButton 
                  icon="chevron-right" 
                  onPress={() => changeMonth(1)}
                  size={24}
                />
              </View>
              
              {/* Days of week header */}
              <View style={styles.weekdayHeader}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <Text key={index} style={styles.weekdayText}>{day}</Text>
                ))}
              </View>
              
              {/* Calendar grid */}
              <View style={styles.calendarGrid}>
                {generateCalendarDays().map((dayInfo, index) => (
                  <View key={index} style={styles.dayCellContainer}>
                    {renderDayCell(dayInfo)}
                  </View>
                ))}
              </View>
            </Surface>
            
            {/* Selected date events */}
            {renderSelectedDateEvents()}
          </ScrollView>
        )}
        
        {/* List View */}
        {!loading && !showCalendarView && (
          <FlatList
            data={filteredEvents}
            renderItem={renderEventItem}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.eventList}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="calendar-blank" size={48} color="#AAA" />
                <Text style={styles.emptyText}>No events found</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  apiSourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    backgroundColor: '#f5f5f5',
  },
  apiSourceText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  mockDataWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    backgroundColor: '#FFF8E1',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
  },
  mockDataText: {
    fontSize: 12,
    color: '#FF8F00',
    marginLeft: 6,
    fontWeight: '500',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  viewAllButton: {
    backgroundColor: '#4287f5',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
  },
  viewAllButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#4287f5',
    marginBottom: 16,
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoryFilters: {
    flexDirection: 'row',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#F0E6FF',
    borderRadius: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  eventList: {
    paddingBottom: 16,
  },
  eventItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    overflow: 'hidden',
  },
  eventColorBar: {
    width: 6,
    backgroundColor: COLORS.primary,
  },
  eventContent: {
    flex: 1,
    padding: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  eventMetaText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  starButton: {
    margin: 0,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#D32F2F',
    marginVertical: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: '#4287f5',
  },
  // Calendar styles
  calendarContainer: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  weekdayHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
    color: '#4B5563',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellContainer: {
    width: '14.28%', // 100% / 7 days
    aspectRatio: 1,
    padding: 2,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  emptyDay: {
    flex: 1,
  },
  todayCell: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  selectedDayCell: {
    backgroundColor: '#2563EB',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  todayText: {
    fontWeight: 'bold',
    color: '#2563EB',
  },
  selectedDayText: {
    color: 'white',
    fontWeight: 'bold',
  },
  eventIndicator: {
    marginTop: 4,
    alignItems: 'center',
  },
  singleEventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4287f5',
  },
  eventCount: {
    fontSize: 10,
    color: '#4287f5',
    fontWeight: 'bold',
  },
  selectedDateEventsContainer: {
    marginTop: 16,
  },
  selectedDateHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2563EB',
  },
  noEventsContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noEventsText: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 14,
  },
});

export default EventCalendarScreen; 