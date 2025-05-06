import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl 
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Searchbar, Chip, Button, Card, Avatar, Badge, Divider } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

// Import components (these would need to be created as well)
import BookingItem from '../../components/bookings/BookingItem';
import EmptyState from '../../components/common/EmptyState';
import FilterModal from '../../components/common/FilterModal';

// You would need to create this slice in your Redux store
// import { fetchGuideBookings } from '../../store/slices/bookingsSlice';

const GuideBookingsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  // This would come from your Redux store
  // const { bookings, loading, error } = useSelector(state => state.bookings);
  // const { user } = useSelector(state => state.auth);
  
  // Simulated data for development
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState([
    {
      id: '1',
      touristName: 'John Smith',
      touristAvatar: 'https://randomuser.me/api/portraits/men/1.jpg',
      date: '2025-04-20',
      status: 'confirmed',
      location: 'Sigiriya Rock Fortress',
      packageName: 'Historical Day Tour',
      price: 75.00,
      people: 2,
      time: '08:00 AM - 05:00 PM',
    },
    {
      id: '2',
      touristName: 'Emily Johnson',
      touristAvatar: 'https://randomuser.me/api/portraits/women/2.jpg',
      date: '2025-04-25',
      status: 'pending',
      location: 'Galle Fort',
      packageName: 'Coastal Heritage Tour',
      price: 60.00,
      people: 4,
      time: '09:00 AM - 04:00 PM',
    },
    {
      id: '3',
      touristName: 'David Wilson',
      touristAvatar: 'https://randomuser.me/api/portraits/men/3.jpg',
      date: '2025-05-10',
      status: 'completed',
      location: 'Kandy Temple of the Tooth',
      packageName: 'Cultural Experience',
      price: 85.00,
      people: 2,
      time: '10:00 AM - 06:00 PM',
    }
  ]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  
  // Filter options for bookings
  const filterOptions = [
    { label: 'All Bookings', value: 'all' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Pending', value: 'pending' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' }
  ];

  // This would fetch actual booking data from your API
  useEffect(() => {
    // In a real implementation, you would call your Redux action
    // dispatch(fetchGuideBookings(user.id));
    
    // Simulating data loading
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);
  
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // dispatch(fetchGuideBookings(user.id))
    //   .finally(() => setRefreshing(false));
    
    // Simulating refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
  };
  
  const filteredBookings = bookings.filter(booking => {
    // Apply status filter
    if (selectedFilter !== 'all' && booking.status !== selectedFilter) {
      return false;
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        booking.touristName.toLowerCase().includes(query) ||
        booking.location.toLowerCase().includes(query) ||
        booking.packageName.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const renderItem = ({ item }) => (
    <BookingItem
      booking={item}
      onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
    />
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'completed': return '#2196F3';
      case 'cancelled': return '#F44336';
      default: return '#757575';
    }
  };

  // Fallback implementation if BookingItem component isn't created yet
  const renderItemFallback = ({ item }) => (
    <Card style={styles.card} onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.touristInfo}>
            <Avatar.Image size={40} source={{ uri: item.touristAvatar }} />
            <View style={styles.nameContainer}>
              <Text style={styles.touristName}>{item.touristName}</Text>
              <Text style={styles.packageName}>{item.packageName}</Text>
            </View>
          </View>
          <Badge 
            style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
          >
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Badge>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.detailRow}>
          <MaterialIcons name="location-on" size={16} color="#666" />
          <Text style={styles.detailText}>{item.location}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <MaterialIcons name="calendar-today" size={16} color="#666" />
          <Text style={styles.detailText}>{item.date}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <MaterialIcons name="access-time" size={16} color="#666" />
          <Text style={styles.detailText}>{item.time}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <MaterialIcons name="people" size={16} color="#666" />
          <Text style={styles.detailText}>{item.people} people</Text>
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Total:</Text>
          <Text style={styles.price}>${item.price.toFixed(2)}</Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search bookings..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchbar}
        />
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <MaterialCommunityIcons name="filter-variant" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.chipContainer}>
        <ScrollableChipGroup
          options={filterOptions}
          selectedValue={selectedFilter}
          onSelect={setSelectedFilter}
        />
      </View>
      
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
        </View>
      ) : filteredBookings.length > 0 ? (
        <FlatList
          data={filteredBookings}
          renderItem={renderItemFallback} // Use the fallback renderer until BookingItem is implemented
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <EmptyState
          icon="calendar-check"
          title="No bookings found"
          message={searchQuery ? "Try adjusting your search or filter" : "You don't have any bookings yet"}
        />
      )}
      
      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        options={filterOptions}
        selectedValue={selectedFilter}
        onSelect={setSelectedFilter}
        onClose={() => setFilterModalVisible(false)}
      />
    </View>
  );
};

// This component would display horizontal scrollable chips
const ScrollableChipGroup = ({ options, selectedValue, onSelect }) => {
  return (
    <FlatList
      horizontal
      data={options}
      renderItem={({ item }) => (
        <Chip
          style={[
            styles.chip,
            selectedValue === item.value && styles.selectedChip
          ]}
          textStyle={[
            styles.chipText,
            selectedValue === item.value && styles.selectedChipText
          ]}
          onPress={() => onSelect(item.value)}
        >
          {item.label}
        </Chip>
      )}
      keyExtractor={item => item.value}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipScrollContainer}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  searchbar: {
    flex: 1,
    elevation: 0,
    backgroundColor: '#f0f0f0',
  },
  filterButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    width: 48,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  chipContainer: {
    backgroundColor: '#fff',
    paddingBottom: 12,
  },
  chipScrollContainer: {
    paddingHorizontal: 16,
  },
  chip: {
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  selectedChip: {
    backgroundColor: '#e0f2ff',
  },
  chipText: {
    color: '#666',
  },
  selectedChipText: {
    color: '#0066CC',
  },
  listContainer: {
    padding: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 12,
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  touristInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameContainer: {
    marginLeft: 12,
  },
  touristName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  packageName: {
    color: '#666',
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 8,
  },
  divider: {
    marginVertical: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  detailText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC',
  },
});

export default GuideBookingsScreen;