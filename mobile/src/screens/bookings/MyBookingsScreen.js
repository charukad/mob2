import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { 
  Appbar, 
  Text, 
  Card, 
  Chip, 
  Divider, 
  ActivityIndicator, 
  Button, 
  Portal, 
  Dialog,
  Searchbar,
  SegmentedButtons,
  IconButton
} from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

// Import actions from redux store
// We would import these in a real app:
// import { fetchBookings, cancelBooking } from '../../store/slices/bookingsSlice';

// Import components
import EmptyState from '../../components/common/EmptyState';

// Import theme
import { COLORS, spacing } from '../../constants/theme';

const MyBookingsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  
  // In a real app, we would get these from Redux state
  // const { bookings, loading } = useSelector(state => state.bookings);
  
  // Local state
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBookingType, setSelectedBookingType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Fetch bookings when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchBookingsData();
    }, [])
  );

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookingsData();
  };

  // Mock data fetch - In a real app, this would use Redux
  const fetchBookingsData = async () => {
    try {
      // Simulating API call delay
      setTimeout(() => {
        // Mock data for bookings
        const mockBookings = [
          {
            id: '1',
            type: 'guide',
            guideName: 'Rajitha Perera',
            guideImage: 'https://randomuser.me/api/portraits/men/32.jpg',
            location: 'Sigiriya Ancient City',
            startDate: new Date(2023, 10, 15, 9, 0),
            endDate: new Date(2023, 10, 15, 16, 0),
            status: 'confirmed',
            price: 8500,
            currency: 'LKR',
            bookingRef: 'G-SIG-1234',
            participants: 2,
            itineraryId: '123',
            notes: 'Please bring comfortable shoes and water',
          },
          {
            id: '2',
            type: 'vehicle',
            vehicleName: 'Toyota Prius',
            vehicleImage: 'https://via.placeholder.com/150',
            driverName: 'Samantha Silva',
            location: 'Colombo to Kandy',
            startDate: new Date(2023, 10, 17, 8, 0),
            endDate: new Date(2023, 10, 17, 12, 0),
            status: 'confirmed',
            price: 12000,
            currency: 'LKR',
            bookingRef: 'V-COL-5678',
            passengers: 3,
            includesDriver: true,
            itineraryId: '123',
          },
          {
            id: '3',
            type: 'guide',
            guideName: 'Malika Fernando',
            guideImage: 'https://randomuser.me/api/portraits/women/44.jpg',
            location: 'Galle Fort',
            startDate: new Date(2023, 10, 20, 10, 0),
            endDate: new Date(2023, 10, 20, 14, 0),
            status: 'pending',
            price: 6500,
            currency: 'LKR',
            bookingRef: 'G-GAL-9101',
            participants: 4,
            itineraryId: '456',
          },
          {
            id: '4',
            type: 'vehicle',
            vehicleName: 'Tuk Tuk',
            vehicleImage: 'https://via.placeholder.com/150',
            driverName: 'Anura Bandara',
            location: 'Mirissa Beach Area',
            startDate: new Date(2023, 10, 22, 13, 0),
            endDate: new Date(2023, 10, 22, 20, 0),
            status: 'completed',
            price: 3500,
            currency: 'LKR',
            bookingRef: 'V-MIR-1122',
            passengers: 2,
            includesDriver: true,
            itineraryId: '456',
            reviewId: '789'
          },
          {
            id: '5',
            type: 'vehicle',
            vehicleName: 'Suzuki Alto',
            vehicleImage: 'https://via.placeholder.com/150',
            location: 'Unawatuna to Galle',
            startDate: new Date(2023, 9, 10, 9, 0),
            endDate: new Date(2023, 9, 13, 18, 0),
            status: 'cancelled',
            price: 15000,
            currency: 'LKR',
            bookingRef: 'V-UNA-3344',
            passengers: 4,
            includesDriver: false,
            itineraryId: '789',
            cancellationReason: 'Weather conditions',
          },
        ];
        
        setBookings(mockBookings);
        filterBookings(mockBookings, selectedBookingType, searchQuery);
        setLoading(false);
        setRefreshing(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setLoading(false);
      setRefreshing(false);
      Alert.alert('Error', 'Failed to fetch bookings. Please try again.');
    }
  };

  // Filter bookings based on type and search query
  const filterBookings = (bookingsData, type, query) => {
    let filtered = bookingsData;
    
    // Filter by type
    if (type !== 'all') {
      filtered = filtered.filter(booking => booking.type === type);
    }
    
    // Filter by search query
    if (query) {
      const lowerCaseQuery = query.toLowerCase();
      filtered = filtered.filter(booking => 
        (booking.guideName && booking.guideName.toLowerCase().includes(lowerCaseQuery)) ||
        (booking.vehicleName && booking.vehicleName.toLowerCase().includes(lowerCaseQuery)) ||
        (booking.location && booking.location.toLowerCase().includes(lowerCaseQuery)) ||
        (booking.bookingRef && booking.bookingRef.toLowerCase().includes(lowerCaseQuery))
      );
    }
    
    setFilteredBookings(filtered);
  };

  // Handle booking type filter change
  const handleTypeChange = (type) => {
    setSelectedBookingType(type);
    filterBookings(bookings, type, searchQuery);
  };

  // Handle search query change
  const handleSearch = (query) => {
    setSearchQuery(query);
    filterBookings(bookings, selectedBookingType, query);
  };

  // Format date for display
  const formatDate = (date) => {
    return format(date, 'MMM d, yyyy • h:mm a');
  };

  // Handle booking cancellation
  const handleCancelBooking = (booking) => {
    setSelectedBooking(booking);
    setCancelDialogVisible(true);
  };

  // Confirm booking cancellation
  const confirmCancelBooking = async () => {
    try {
      if (!selectedBooking) return;
      
      // In a real app, we would dispatch an action:
      // await dispatch(cancelBooking(selectedBooking.id)).unwrap();
      
      // For now, just update local state
      const updatedBookings = bookings.map(booking => 
        booking.id === selectedBooking.id 
          ? { ...booking, status: 'cancelled', cancellationReason: 'User cancelled' }
          : booking
      );
      
      setBookings(updatedBookings);
      filterBookings(updatedBookings, selectedBookingType, searchQuery);
      
      setCancelDialogVisible(false);
      setSelectedBooking(null);
      
      Alert.alert('Success', 'Booking cancelled successfully');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setCancelDialogVisible(false);
      Alert.alert('Error', 'Failed to cancel booking. Please try again.');
    }
  };

  // Handle navigation to booking details
  const handleViewDetails = (booking) => {
    if (booking.type === 'guide') {
      navigation.navigate('GuideBookingDetail', { bookingId: booking.id });
    } else {
      navigation.navigate('VehicleBookingDetail', { bookingId: booking.id });
    }
  };

  // Handle navigation to write a review
  const handleWriteReview = (booking) => {
    navigation.navigate('WriteReview', { 
      entityType: booking.type,
      entityId: booking.type === 'guide' ? booking.guideId : booking.vehicleId,
      bookingId: booking.id
    });
  };

  // Handle navigation to view a review
  const handleViewReview = (booking) => {
    navigation.navigate('ReviewDetail', { reviewId: booking.reviewId });
  };

  // Get status color for the badge
  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return COLORS.success;
      case 'pending':
        return COLORS.warning;
      case 'completed':
        return COLORS.info;
      case 'cancelled':
        return COLORS.error;
      default:
        return COLORS.gray;
    }
  };

  // Render booking item
  const renderBookingItem = ({ item }) => {
    const isPastBooking = new Date(item.endDate) < new Date();
    const canCancel = ['confirmed', 'pending'].includes(item.status) && !isPastBooking;
    const canReview = item.status === 'completed' && !item.reviewId;
    const hasReview = Boolean(item.reviewId);
    
    return (
      <Card style={styles.bookingCard}>
        <Card.Content>
          <View style={styles.bookingHeader}>
            <View style={styles.bookingType}>
              <MaterialCommunityIcons 
                name={item.type === 'guide' ? 'account-star' : 'car'} 
                size={24} 
                color={COLORS.primary} 
              />
              <Text style={styles.bookingTypeText}>
                {item.type === 'guide' ? 'Guide' : 'Vehicle'}
              </Text>
            </View>
            
            <Chip 
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
              textStyle={{ color: getStatusColor(item.status) }}
            >
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Chip>
          </View>
          
          <Text style={styles.bookingName}>
            {item.type === 'guide' ? item.guideName : item.vehicleName}
            {item.type === 'vehicle' && item.driverName && ` with ${item.driverName}`}
          </Text>
          
          <Text style={styles.bookingLocation}>
            <MaterialCommunityIcons name="map-marker" size={16} color={COLORS.primary} />
            {' '}{item.location}
          </Text>
          
          <View style={styles.bookingDates}>
            <Text style={styles.dateLabel}>Start:</Text>
            <Text style={styles.dateValue}>{formatDate(item.startDate)}</Text>
          </View>
          
          <View style={styles.bookingDates}>
            <Text style={styles.dateLabel}>End:</Text>
            <Text style={styles.dateValue}>{formatDate(item.endDate)}</Text>
          </View>
          
          <View style={styles.bookingDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Booking Reference:</Text>
              <Text style={styles.detailValue}>{item.bookingRef}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>
                {item.type === 'guide' ? 'Participants:' : 'Passengers:'}
              </Text>
              <Text style={styles.detailValue}>
                {item.type === 'guide' ? item.participants : item.passengers}
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Price:</Text>
              <Text style={styles.detailValue}>
                {item.price.toLocaleString()} {item.currency}
              </Text>
            </View>
          </View>
          
          {item.cancellationReason && (
            <View style={styles.cancellationReason}>
              <Text style={styles.cancellationLabel}>Cancellation Reason:</Text>
              <Text style={styles.cancellationText}>{item.cancellationReason}</Text>
            </View>
          )}
        </Card.Content>
        
        <Divider />
        
        <Card.Actions style={styles.cardActions}>
          <Button 
            mode="text" 
            onPress={() => handleViewDetails(item)}
            icon="information-outline"
          >
            Details
          </Button>
          
          {canCancel && (
            <Button 
              mode="text" 
              onPress={() => handleCancelBooking(item)}
              icon="cancel"
              textColor={COLORS.error}
            >
              Cancel
            </Button>
          )}
          
          {canReview && (
            <Button 
              mode="text" 
              onPress={() => handleWriteReview(item)}
              icon="star-outline"
              textColor={COLORS.primary}
            >
              Review
            </Button>
          )}
          
          {hasReview && (
            <Button 
              mode="text" 
              onPress={() => handleViewReview(item)}
              icon="star"
              textColor={COLORS.primary}
            >
              View Review
            </Button>
          )}
        </Card.Actions>
      </Card>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (loading) return null;
    
    return (
      <EmptyState
        icon={selectedBookingType === 'guide' ? 'account-star' : selectedBookingType === 'vehicle' ? 'car' : 'calendar-blank'}
        title="No bookings found"
        message={
          searchQuery
            ? "No bookings match your search criteria"
            : "You don't have any bookings yet. Start by booking a guide or vehicle for your trip."
        }
        actionLabel={searchQuery ? "Clear Search" : "Explore Options"}
        onAction={() => searchQuery ? handleSearch('') : navigation.navigate('ExploreTab')}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="My Bookings" />
        <Appbar.Action 
          icon="calendar-sync" 
          onPress={handleRefresh}
          disabled={loading || refreshing}
        />
      </Appbar.Header>
      
      <View style={styles.filterContainer}>
        <Searchbar
          placeholder="Search bookings..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
          clearButtonMode="while-editing"
          clearIcon={({ size, color }) => (
            <IconButton icon="close" size={size} iconColor={color} onPress={() => handleSearch('')} />
          )}
        />
        
        <SegmentedButtons
          value={selectedBookingType}
          onValueChange={handleTypeChange}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'guide', label: 'Guides' },
            { value: 'vehicle', label: 'Vehicles' }
          ]}
          style={styles.segmentedButtons}
        />
      </View>
      
      <FlatList
        data={filteredBookings}
        renderItem={renderBookingItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.bookingsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={loading && !refreshing ? (
          <ActivityIndicator style={styles.loader} color={COLORS.primary} size="large" />
        ) : null}
      />
      
      {/* Cancellation Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={cancelDialogVisible}
          onDismiss={() => setCancelDialogVisible(false)}
        >
          <Dialog.Title>Cancel Booking</Dialog.Title>
          <Dialog.Content>
            <Text>
              Are you sure you want to cancel this booking? This action cannot be undone.
              {selectedBooking?.type === 'guide' 
                ? "\n\nNote: Cancellation policy may apply based on the guide's terms."
                : "\n\nNote: Cancellation policy may apply based on the vehicle rental terms."}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCancelDialogVisible(false)}>No, Keep It</Button>
            <Button 
              onPress={confirmCancelBooking}
              textColor={COLORS.error}
            >
              Yes, Cancel
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  filterContainer: {
    padding: spacing.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  searchBar: {
    marginBottom: spacing.sm,
    backgroundColor: COLORS.background,
  },
  segmentedButtons: {
    marginTop: spacing.xs,
  },
  bookingsList: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  bookingCard: {
    marginBottom: spacing.md,
    borderRadius: 8,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bookingType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingTypeText: {
    marginLeft: spacing.xs,
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statusChip: {
    height: 28,
  },
  bookingName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  bookingLocation: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: spacing.sm,
  },
  bookingDates: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  dateLabel: {
    width: 50,
    fontWeight: 'bold',
  },
  dateValue: {
    flex: 1,
  },
  bookingDetails: {
    marginTop: spacing.sm,
    backgroundColor: COLORS.backgroundLight,
    padding: spacing.sm,
    borderRadius: 4,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  detailLabel: {
    fontWeight: 'bold',
  },
  detailValue: {
    textAlign: 'right',
  },
  cancellationReason: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: COLORS.error + '10',
    borderRadius: 4,
  },
  cancellationLabel: {
    fontWeight: 'bold',
    color: COLORS.error,
    marginBottom: spacing.xs,
  },
  cancellationText: {
    color: COLORS.error,
  },
  cardActions: {
    justifyContent: 'space-around',
    paddingVertical: spacing.xs,
  },
  loader: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
});

export default MyBookingsScreen;