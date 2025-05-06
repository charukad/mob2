import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import {
  Appbar,
  Text,
  Card,
  Avatar,
  Chip,
  Searchbar,
  SegmentedButtons,
  ActivityIndicator,
  Divider,
  IconButton
} from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Import components
import EmptyState from '../../components/common/EmptyState';

// Import theme and utilities
import { COLORS, spacing } from '../../constants/theme';
import { format } from 'date-fns';

// In a real app, we would import actions from redux store
// import { fetchReviewableEntities } from '../../store/slices/reviewsSlice';

const ReviewableEntitiesScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entities, setEntities] = useState([]);
  const [filteredEntities, setFilteredEntities] = useState([]);
  const [selectedEntityType, setSelectedEntityType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch reviewable entities when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchReviewableEntities();
    }, [])
  );
  
  // Refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    fetchReviewableEntities();
  };
  
  // Search handler
  const handleSearch = (query) => {
    setSearchQuery(query);
    filterEntities(entities, selectedEntityType, query);
  };
  
  // Filter entities by type and search query
  const filterEntities = (entitiesData, type, query) => {
    let filtered = entitiesData;
    
    // Filter by type
    if (type !== 'all') {
      filtered = filtered.filter(entity => entity.type === type);
    }
    
    // Filter by search query
    if (query) {
      const lowerCaseQuery = query.toLowerCase();
      filtered = filtered.filter(entity => 
        entity.name.toLowerCase().includes(lowerCaseQuery) ||
        (entity.location && entity.location.toLowerCase().includes(lowerCaseQuery))
      );
    }
    
    setFilteredEntities(filtered);
  };
  
  // Handle entity type filter change
  const handleEntityTypeChange = (type) => {
    setSelectedEntityType(type);
    filterEntities(entities, type, searchQuery);
  };
  
  // Mock data fetch - In a real app, this would use Redux
  const fetchReviewableEntities = async () => {
    try {
      setLoading(true);
      
      // Mock API call delay
      setTimeout(() => {
        // Mock data for reviewable entities
        const mockEntities = [
          {
            id: '1',
            type: 'guide',
            name: 'Rajitha Perera',
            image: 'https://randomuser.me/api/portraits/men/32.jpg',
            location: 'Sigiriya Ancient City',
            date: new Date(2023, 10, 15),
            bookingRef: 'G-SIG-1234',
            description: 'Cultural tour guide with expert knowledge on ancient Sri Lankan history'
          },
          {
            id: '2',
            type: 'vehicle',
            name: 'Toyota Prius',
            image: 'https://via.placeholder.com/150',
            driverName: 'Samantha Silva',
            location: 'Colombo to Kandy',
            date: new Date(2023, 10, 17),
            bookingRef: 'V-COL-5678',
            description: 'Comfortable sedan with AC and experienced driver'
          },
          {
            id: '3',
            type: 'location',
            name: 'Galle Fort',
            image: 'https://via.placeholder.com/150',
            location: 'Galle, Southern Province',
            date: new Date(2023, 10, 20),
            description: 'UNESCO World Heritage site with colonial architecture'
          },
          {
            id: '4',
            type: 'guide',
            name: 'Malika Fernando',
            image: 'https://randomuser.me/api/portraits/women/44.jpg',
            location: 'Kandy Temple Tour',
            date: new Date(2023, 10, 22),
            bookingRef: 'G-KAN-9012',
            description: 'Specialized guide focused on religious and cultural sites'
          },
          {
            id: '5',
            type: 'location',
            name: 'Ella Rock',
            image: 'https://via.placeholder.com/150',
            location: 'Ella, Uva Province',
            date: new Date(2023, 10, 25),
            description: 'Famous hiking spot with panoramic mountain views'
          },
        ];
        
        setEntities(mockEntities);
        filterEntities(mockEntities, selectedEntityType, searchQuery);
        setLoading(false);
        setRefreshing(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching reviewable entities:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Navigate to write review screen
  const handleWriteReview = (entity) => {
    navigation.navigate('WriteReview', {
      entityId: entity.id,
      entityType: entity.type,
      entityName: entity.name,
      bookingRef: entity.bookingRef
    });
  };
  
  // Format date for display
  const formatDate = (date) => {
    return format(date, 'MMMM d, yyyy');
  };
  
  // Get icon for entity type
  const getEntityIcon = (type) => {
    switch (type) {
      case 'guide':
        return 'account-star';
      case 'vehicle':
        return 'car';
      case 'location':
        return 'map-marker';
      default:
        return 'star';
    }
  };
  
  // Render entity item
  const renderEntityItem = ({ item }) => {
    return (
      <Card style={styles.entityCard} onPress={() => handleWriteReview(item)}>
        <Card.Content>
          <View style={styles.entityHeader}>
            <Avatar.Image 
              size={60} 
              source={{ uri: item.image }} 
              style={styles.entityImage}
            />
            
            <View style={styles.entityInfo}>
              <Text style={styles.entityName}>{item.name}</Text>
              
              <Chip 
                icon={getEntityIcon(item.type)}
                style={styles.entityTypeChip}
                textStyle={styles.entityTypeText}
              >
                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
              </Chip>
              
              <Text style={styles.entityLocation}>
                <MaterialCommunityIcons name="map-marker" size={14} color={COLORS.primary} />
                {' '}{item.location}
              </Text>
            </View>
          </View>
          
          <Text style={styles.entityDescription} numberOfLines={2}>
            {item.description}
          </Text>
          
          <View style={styles.entityFooter}>
            <Text style={styles.entityDate}>
              Visited: {formatDate(item.date)}
            </Text>
            
            {item.bookingRef && (
              <Text style={styles.bookingRef}>
                Ref: {item.bookingRef}
              </Text>
            )}
          </View>
        </Card.Content>
        
        <Card.Actions style={styles.cardActions}>
          <Button 
            mode="contained"
            onPress={() => handleWriteReview(item)}
            icon="pencil"
            style={styles.reviewButton}
          >
            Write Review
          </Button>
        </Card.Actions>
      </Card>
    );
  };
  
  // Render empty state
  const renderEmptyState = () => {
    if (loading) return null;
    
    return (
      <EmptyState
        icon={selectedEntityType === 'all' ? 'star-outline' : getEntityIcon(selectedEntityType)}
        title="No reviewable items found"
        message={
          searchQuery
            ? "No items match your search criteria"
            : "You don't have any recent experiences to review. Explore more places and services to share your opinion!"
        }
        actionLabel={searchQuery ? "Clear Search" : "Explore Now"}
        onAction={() => searchQuery ? handleSearch('') : navigation.navigate('ExploreTab')}
      />
    );
  };
  
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Write a Review" />
      </Appbar.Header>
      
      <View style={styles.filterContainer}>
        <Searchbar
          placeholder="Search guides, vehicles, places..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
          clearButtonMode="while-editing"
          clearIcon={({ size, color }) => (
            <IconButton icon="close" size={size} iconColor={color} onPress={() => handleSearch('')} />
          )}
        />
        
        <SegmentedButtons
          value={selectedEntityType}
          onValueChange={handleEntityTypeChange}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'guide', label: 'Guides' },
            { value: 'vehicle', label: 'Vehicles' },
            { value: 'location', label: 'Places' }
          ]}
          style={styles.segmentedButtons}
        />
      </View>
      
      <FlatList
        data={filteredEntities}
        renderItem={renderEntityItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.entityList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={
          <Text style={styles.listHeader}>
            Select an experience to review:
          </Text>
        }
        ListFooterComponent={loading && !refreshing ? (
          <ActivityIndicator style={styles.loader} color={COLORS.primary} size="large" />
        ) : filteredEntities.length > 0 ? (
          <Text style={styles.listFooter}>
            Sharing your experiences helps other travelers make better decisions.
          </Text>
        ) : null}
      />
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
    backgroundColor: COLORS.backgroundLight,
  },
  segmentedButtons: {
    marginTop: spacing.xs,
  },
  listHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    padding: spacing.md,
    paddingBottom: spacing.sm,
    color: COLORS.textLight,
  },
  entityList: {
    padding: spacing.sm,
    paddingBottom: spacing.xl,
  },
  entityCard: {
    marginBottom: spacing.md,
    marginHorizontal: spacing.xs,
    borderRadius: 8,
  },
  entityHeader: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  entityImage: {
    marginRight: spacing.md,
  },
  entityInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  entityName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  entityTypeChip: {
    alignSelf: 'flex-start',
    marginBottom: 4,
    backgroundColor: COLORS.primary + '20',
  },
  entityTypeText: {
    color: COLORS.primary,
  },
  entityLocation: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  entityDescription: {
    fontSize: 14,
    marginBottom: spacing.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  entityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  entityDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  bookingRef: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  cardActions: {
    justifyContent: 'flex-end',
    paddingTop: 0,
  },
  reviewButton: {
    backgroundColor: COLORS.primary,
  },
  loader: {
    padding: spacing.xl,
  },
  listFooter: {
    textAlign: 'center',
    padding: spacing.lg,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
});

export default ReviewableEntitiesScreen;