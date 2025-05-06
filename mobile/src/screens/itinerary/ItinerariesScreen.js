import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, Text, RefreshControl, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { FAB, Searchbar, Chip, Portal, Dialog, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

// Import components
import ItineraryCard from '../../components/itinerary/ItineraryCard';
import EmptyState from '../../components/common/EmptyState';
import Header from '../../components/common/Header';

// Import theme and redux actions
import { COLORS, SIZES } from '../../constants/theme';
import { fetchItineraries, deleteItinerary } from '../../store/slices/itinerariesSlice';

const ItinerariesScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { itineraries, loading } = useSelector(state => state.itineraries);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [itineraryToDelete, setItineraryToDelete] = useState(null);
  
  // Filter itineraries based on search query and active filter
  const getFilteredItineraries = useCallback(() => {
    // Ensure itineraries is an array
    if (!Array.isArray(itineraries)) {
      return [];
    }
    
    let filtered = [...itineraries];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(itinerary => 
        itinerary.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply status filter
    if (activeFilter !== 'all') {
      const today = new Date();
      
      filtered = filtered.filter(itinerary => {
        const startDate = new Date(itinerary.startDate);
        const endDate = new Date(itinerary.endDate);
        
        switch(activeFilter) {
          case 'planning':
            return today < startDate;
          case 'active':
            return today >= startDate && today <= endDate;
          case 'completed':
            return today > endDate;
          default:
            return true;
        }
      });
    }
    
    return filtered;
  }, [itineraries, searchQuery, activeFilter]);
  
  // Compute filtered itineraries using useMemo
  const filteredItineraries = useMemo(() => getFilteredItineraries(), [getFilteredItineraries]);
  
  // Fetch itineraries when screen is focused
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchItineraries());
    }, [dispatch])
  );
  
  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchItineraries()).then(() => {
      setRefreshing(false);
    });
  }, [dispatch]);
  
  // Handle itinerary actions
  const handleEdit = (itineraryId) => {
    navigation.navigate('EditItinerary', { itineraryId });
  };
  
  const handleShare = (itineraryId) => {
    // Share functionality to be implemented
    console.log('Share itinerary', itineraryId);
  };
  
  const handleDelete = (itineraryId) => {
    setItineraryToDelete(itineraryId);
    setDeleteDialogVisible(true);
  };
  
  const confirmDelete = () => {
    if (itineraryToDelete) {
      dispatch(deleteItinerary(itineraryToDelete));
      setDeleteDialogVisible(false);
      setItineraryToDelete(null);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <Header title="My Itineraries" />
      
      <View style={styles.searchBarContainer}>
        <Searchbar
          placeholder="Search itineraries"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>
      
      <View style={styles.filterContainer}>
        <Chip
          selected={activeFilter === 'all'}
          onPress={() => setActiveFilter('all')}
          style={styles.filterChip}
          selectedColor={COLORS.primary}
        >
          All
        </Chip>
        <Chip
          selected={activeFilter === 'planning'}
          onPress={() => setActiveFilter('planning')}
          style={styles.filterChip}
          selectedColor={COLORS.primary}
        >
          Planning
        </Chip>
        <Chip
          selected={activeFilter === 'active'}
          onPress={() => setActiveFilter('active')}
          style={styles.filterChip}
          selectedColor={COLORS.primary}
        >
          Active
        </Chip>
        <Chip
          selected={activeFilter === 'completed'}
          onPress={() => setActiveFilter('completed')}
          style={styles.filterChip}
          selectedColor={COLORS.primary}
        >
          Completed
        </Chip>
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredItineraries}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <ItineraryCard
              itinerary={item}
              onEdit={handleEdit}
              onShare={handleShare}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="map-search"
              title="No itineraries found"
              message={
                searchQuery || activeFilter !== 'all'
                  ? "Try adjusting your filters"
                  : "Create your first trip itinerary to get started"
              }
              actionLabel={itineraries.length === 0 ? "Create Itinerary" : null}
              onAction={() => navigation.navigate('CreateItinerary')}
            />
          }
        />
      )}
      
      <FAB
        style={styles.fab}
        icon="plus"
        color={COLORS.white}
        onPress={() => navigation.navigate('CreateItinerary')}
      />
      
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Itinerary</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete this itinerary? This action cannot be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={confirmDelete} color={COLORS.error}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    elevation: 2,
    borderRadius: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80, // Extra padding at bottom for FAB
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
  },
});

export default ItinerariesScreen;