import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Appbar, Chip, Text, Searchbar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';

import ReviewCard from '../../components/reviews/ReviewCard';
import RatingSummary from '../../components/reviews/RatingSummary';
import { fetchReviews, markReviewAsHelpful, reportReview } from '../../store/slices/reviewsSlice';

const ReviewsListScreen = ({ navigation, route }) => {
  const { entityId, entityType, entityName } = route.params;
  const dispatch = useDispatch();
  
  const { reviews, summary, loading, error } = useSelector(state => state.reviews);
  
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch reviews when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      dispatch(fetchReviews({ entityId, entityType }));
    }, [dispatch, entityId, entityType])
  );
  
  // Update filtered reviews when reviews or filters change
  useEffect(() => {
    if (!reviews) return;
    
    let filtered = [...reviews];
    
    // Apply rating filter
    if (activeFilter !== 'all') {
      const rating = parseInt(activeFilter, 10);
      filtered = filtered.filter(review => Math.floor(review.rating) === rating);
    }
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(review => 
        review.text.toLowerCase().includes(query) ||
        review.user.name.toLowerCase().includes(query)
      );
    }
    
    setFilteredReviews(filtered);
  }, [reviews, activeFilter, searchQuery]);
  
  // Handle helpful button press
  const handleHelpfulPress = (reviewId) => {
    dispatch(markReviewAsHelpful(reviewId));
  };
  
  // Handle report button press
  const handleReportPress = (reviewId) => {
    dispatch(reportReview(reviewId));
  };
  
  // Handle reply button press (for business owners)
  const handleReplyPress = (reviewId) => {
    // Navigate to reply screen
    navigation.navigate('WriteReviewReply', {
      reviewId,
      entityId,
      entityType
    });
  };
  
  // Handle writing a new review
  const handleWriteReview = () => {
    navigation.navigate('WriteReview', {
      entityId,
      entityType,
      entityName
    });
  };
  
  // Handle editing own review
  const handleEditReview = (reviewId) => {
    navigation.navigate('WriteReview', {
      reviewId,
      entityId,
      entityType,
      entityName
    });
  };
  
  // Handle deleting own review
  const handleDeleteReview = (reviewId) => {
    // Show confirmation dialog and delete review
    // This would typically use Alert.alert or a custom confirmation modal
  };
  
  // Render filter chips
  const renderFilterChips = () => {
    return (
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={['all', '5', '4', '3', '2', '1']}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <Chip
              selected={activeFilter === item}
              onPress={() => setActiveFilter(item)}
              style={[styles.filterChip, activeFilter === item && styles.activeChip]}
              textStyle={activeFilter === item ? styles.activeChipText : null}
            >
              {item === 'all' ? 'All Ratings' : `${item} Stars`}
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
        placeholder="Search reviews"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor="#757575"
      />
    );
  };
  
  // Render summary section
  const renderSummary = () => {
    if (!summary) return null;
    
    return (
      <RatingSummary
        averageRating={summary.averageRating}
        reviewCount={summary.totalReviews}
        ratingDistribution={summary.distribution}
        style={styles.summary}
      />
    );
  };
  
  // Render empty state
  const renderEmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No reviews match your filters</Text>
        {activeFilter !== 'all' && (
          <Chip
            onPress={() => setActiveFilter('all')}
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
        <Appbar.Content title="Reviews" subtitle={entityName} />
        <Appbar.Action icon="pencil" onPress={handleWriteReview} />
      </Appbar.Header>
      
      {loading && !reviews ? (
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
              onHelpfulPress={handleHelpfulPress}
              onReportPress={handleReportPress}
              onReplyPress={handleReplyPress}
              onEditPress={handleEditReview}
              onDeletePress={handleDeleteReview}
              style={styles.reviewCard}
            />
          )}
          ListHeaderComponent={
            <>
              {renderSummary()}
              {renderSearchBar()}
              {renderFilterChips()}
            </>
          }
          ListEmptyComponent={renderEmptyState()}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={() => dispatch(fetchReviews({ entityId, entityType }))}
        />
      )}
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
  summary: {
    margin: 16,
  },
  searchBar: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
  },
  searchInput: {
    fontSize: 14,
  },
  filterContainer: {
    marginVertical: 8,
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
    paddingBottom: 16,
  },
  reviewCard: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 16,
  },
  resetChip: {
    backgroundColor: '#E3F2FD',
  },
});

export default ReviewsListScreen;