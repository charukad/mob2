import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import {
  Searchbar,
  Chip,
  Button,
  Text,
  ActivityIndicator,
  FAB,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Import components
import EventCard from '../../components/events/EventCard';
import Header from '../../components/common/Header';
import EmptyState from '../../components/common/EmptyState';

// Import redux actions
import {
  fetchEvents,
  fetchFeaturedEvents,
  fetchEventCategories,
} from '../../store/slices/eventsSlice';

// Import theme
import { COLORS } from '../../constants/theme';

const EventsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const {
    events,
    featuredEvents,
    categories,
    loading,
    refreshing,
  } = useSelector(state => state.events);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('upcoming');
  const [selectedCategories, setSelectedCategories] = useState([]);
  
  // Fetch events when screen is focused
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchEvents({ filter: activeFilter, categories: selectedCategories }));
      dispatch(fetchFeaturedEvents());
      dispatch(fetchEventCategories());
    }, [dispatch, activeFilter, selectedCategories])
  );
  
  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    dispatch(fetchEvents({ filter: activeFilter, categories: selectedCategories, refresh: true }));
    dispatch(fetchFeaturedEvents());
  }, [dispatch, activeFilter, selectedCategories]);
  
  // Handle filter change
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };
  
  // Handle category selection
  const toggleCategory = (category) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(cat => cat !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };
  
  // Reset filters
  const resetFilters = () => {
    setSelectedCategories([]);
    setActiveFilter('upcoming');
  };
  
  // Navigate to calendar view
  const navigateToCalendar = () => {
    navigation.navigate('Calendar');
  };
  
  // Render featured events section
  const renderFeaturedEvents = () => {
    if (featuredEvents.length === 0) return null;
    
    return (
      <View style={styles.featuredContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Events</Text>
          <MaterialCommunityIcons name="star" size={18} color={COLORS.primary} />
        </View>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredScrollContent}
        >
          {featuredEvents.map(event => (
            <EventCard key={event._id} event={event} compact />
          ))}
        </ScrollView>
      </View>
    );
  };
  
  // Render category filters
  const renderCategoryFilters = () => {
    if (categories.length === 0) return null;
    
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryContainer}
      >
        {categories.map(category => (
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
    );
  };
  
  return (
    <View style={styles.container}>
      <Header title="Events & Festivals" />
      
      {/* Search and Calendar Button */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search events"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        
        <TouchableOpacity
          style={styles.calendarButton}
          onPress={navigateToCalendar}
        >
          <MaterialCommunityIcons name="calendar-month" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      
      {/* Event Filters */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip
            selected={activeFilter === 'upcoming'}
            onPress={() => handleFilterChange('upcoming')}
            style={styles.filterChip}
          >
            Upcoming
          </Chip>
          <Chip
            selected={activeFilter === 'ongoing'}
            onPress={() => handleFilterChange('ongoing')}
            style={styles.filterChip}
          >
            Ongoing
          </Chip>
          <Chip
            selected={activeFilter === 'this_month'}
            onPress={() => handleFilterChange('this_month')}
            style={styles.filterChip}
          >
            This Month
          </Chip>
          <Chip
            selected={activeFilter === 'past'}
            onPress={() => handleFilterChange('past')}
            style={styles.filterChip}
          >
            Past Events
          </Chip>
        </ScrollView>
        
        {(selectedCategories.length > 0 || activeFilter !== 'upcoming') && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetFilters}
          >
            <MaterialCommunityIcons name="filter-remove" size={20} color={COLORS.error} />
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Category Filters */}
      {renderCategoryFilters()}
      
      {/* Events List */}
      <FlatList
        data={events}
        renderItem={({ item }) => <EventCard event={item} />}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={renderFeaturedEvents}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <EmptyState
              icon="calendar-remove"
              title="No events found"
              message={
                selectedCategories.length > 0
                  ? "Try adjusting your category filters"
                  : "No events match your current filters"
              }
              actionLabel="Reset Filters"
              onAction={resetFilters}
            />
          )
        }
        ListFooterComponent={
          loading && events.length > 0 ? (
            <ActivityIndicator
              color={COLORS.primary}
              size="large"
              style={styles.loadingFooter}
            />
          ) : null
        }
      />
      
      {/* FAB for cultural information */}
      <FAB
        style={styles.fab}
        icon="information"
        label="Cultural Info"
        onPress={() => navigation.navigate('CulturalInfo')}
        color={COLORS.white}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flex: 1,
    elevation: 2,
    borderRadius: 8,
  },
  calendarButton: {
    marginLeft: 8,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  filterChip: {
    marginRight: 8,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  resetText: {
    color: COLORS.error,
    marginLeft: 4,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  categoryChip: {
    marginRight: 8,
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 80, // Extra padding for FAB
  },
  featuredContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  featuredScrollContent: {
    paddingRight: 16,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  loadingFooter: {
    paddingVertical: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
  },
});

export default EventsScreen;