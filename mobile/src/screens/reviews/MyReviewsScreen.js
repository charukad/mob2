import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Appbar, Chip, Text, Searchbar, FAB } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';

import ReviewCard from '../../components/reviews/ReviewCard';
import { fetchMyReviews, deleteReview } from '../../store/slices/reviewsSlice';

const MyReviewsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { myReviews, loading, error } = useSelector(state => state.reviews);
  
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [entityFilter, setEntityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch user's reviews when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      dispatch(fetchMyReviews());
    }, [dispatch])
  );
  
  // Update filtered reviews when reviews or filters change
  React.useEffect(() => {
    if (!myReviews) return;
    
    let filtered = [...myReviews];
    
    // Apply entity type filter
    if (entityFilter !== 'all') {
      filtered = filtered.filter(review => review.entity.type === entityFilter);
    }
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(review => 
        review.text.toLowerCase().includes(query) ||
        review.entity.name.toLowerCase().includes(query)
      );
    }
    
    setFilteredReviews(filtered);
  }, [myReviews, entityFilter, searchQuery]);
  
  // Handle editing a review
  const handleEditReview = (reviewId) => {
    const review = myReviews.find(r => r.id === reviewId);
    if (review) {
      navigation.navigate('WriteReview', {
        reviewId,
        entityId: review.entity.id,
        entityType: review.entity.type,
        entityName: review.entity.name
      });
    }
  };
  
  // Handle deleting a review
  const handleDeleteReview = (reviewId) => {
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          onPress: () => dispatch(deleteReview(reviewId)),
          style: 'destructive'
        }
      ]
    );
  };
  
  // Render entity type filter chips
  const renderFilterChips = () => {
    const entityTypes = [
      { id: 'all', label: 'All' },
      { id: 'guide', label: 'Guides' },
      { id: 'vehicle', label: 'Vehicles' },
      { id: 'location', label: 'Locations' }
    ];
    
    return (
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={entityTypes}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <Chip
              selected={entityFilter === item.id}
              onPress={() => setEntityFilter(item.id)}
              style={[styles.filterChip, entityFilter === item.id && styles.activeChip]}
              textStyle={entityFilter === item.id ? styles.activeChipText : null}
            >
              {item.label}
            </Chip>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsList}
        />
      </View>
    );
  };
  
  // Render search bar
  const renderSearchBar = () => {
    return (
      <Searchbar
        placeholder="Search your reviews"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor="#757575"
      />
    );
  };
  
  // Render empty state
  const renderEmptyState = () => {
    const noReviewsAtAll = !myReviews || myReviews.length === 0;
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>
          {noReviewsAtAll ? 'No Reviews Yet' : 'No Matching Reviews'}
        </Text>
        
        <Text style={styles.emptyText}>
          {noReviewsAtAll 
            ? "You haven't written any reviews yet. Share your experiences to help other travelers!" 
            : "No reviews match your current filters."}
        </Text>
        
        {!noReviewsAtAll && entityFilter !== 'all' && (
          <Chip
            onPress={() => setEntityFilter('all')}
            style={styles.resetChip}
          >
            Show all reviews
          </Chip>
        )}
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="My Reviews" />
      </Appbar.Header>
      
      {renderSearchBar()}
      {renderFilterChips()}
      
      {loading && !myReviews ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredReviews}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <ReviewCard
              review={item}
              showEntityDetails={true}
              onEditPress={handleEditReview}
              onDeletePress={handleDeleteReview}
              style={styles.reviewCard}
            />
          )}
          ListEmptyComponent={renderEmptyState()}
          contentContainerStyle={[
            styles.listContent,
            filteredReviews.length === 0 && styles.emptyListContent
          ]}
          refreshing={loading}
          onRefresh={() => dispatch(fetchMyReviews())}
        />
      )}
      
      <FAB
        style={styles.fab}
        icon="pencil"
        label="Write a Review"
        onPress={() => navigation.navigate('ReviewableEntities')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: '#F44336',
    textAlign: 'center',
  },
  searchBar: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  searchInput: {
    fontSize: 14,
  },
  filterContainer: {
    marginBottom: 8,
  },
  chipsList: {
    paddingHorizontal: 16,
  },
  filterChip: {
    marginRight: 8,
  },
  activeChip: {
    backgroundColor: '#E3F2FD',
  },
  activeChipText: {
    color: '#2196F3',
  },
  listContent: {
    paddingBottom: 80, // Additional padding for FAB
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  reviewCard: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 16,
  },
  resetChip: {
    backgroundColor: '#E3F2FD',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});

export default MyReviewsScreen;