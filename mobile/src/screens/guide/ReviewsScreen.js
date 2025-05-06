import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Avatar, Rating, Divider, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, spacing } from '../../constants/theme';

const ReviewsScreen = ({ navigation }) => {
  const theme = useTheme();
  const [activeFilter, setActiveFilter] = useState('all');

  // Mock data for reviews
  const reviews = [
    {
      id: '1',
      touristName: 'John Doe',
      touristImage: null,
      rating: 5,
      date: '2023-05-10',
      comment: 'Amazing tour! The guide was very knowledgeable and made the experience unforgettable.',
      tourType: 'City Tour',
    },
    {
      id: '2',
      touristName: 'Jane Smith',
      touristImage: null,
      rating: 4,
      date: '2023-05-05',
      comment: 'Great experience overall. The guide was friendly and informative.',
      tourType: 'Mountain Trek',
    },
    {
      id: '3',
      touristName: 'Robert Johnson',
      touristImage: null,
      rating: 3,
      date: '2023-04-28',
      comment: 'The tour was good but could have been better organized.',
      tourType: 'Beach Tour',
    },
  ];

  const filteredReviews = activeFilter === 'all' 
    ? reviews 
    : reviews.filter(review => {
        if (activeFilter === 'positive') return review.rating >= 4;
        if (activeFilter === 'negative') return review.rating <= 2;
        return review.rating === 3;
      });

  const renderReviewCard = (review) => (
    <Card key={review.id} style={styles.reviewCard}>
      <Card.Content>
        <View style={styles.reviewHeader}>
          <View style={styles.touristInfo}>
            <Avatar.Text 
              size={40} 
              label={review.touristName.split(' ').map(n => n[0]).join('')} 
              backgroundColor={theme.colors.primary}
            />
            <View style={styles.touristDetails}>
              <Text style={styles.touristName}>{review.touristName}</Text>
              <Text style={styles.tourDate}>{review.date}</Text>
            </View>
          </View>
          <View style={styles.ratingContainer}>
            <Rating value={review.rating} size={20} />
          </View>
        </View>
        
        <Divider style={styles.divider} />
        
        <Text style={styles.comment}>{review.comment}</Text>
        
        <View style={styles.tourInfo}>
          <MaterialCommunityIcons name="map-marker" size={16} color={COLORS.textLight} />
          <Text style={styles.tourType}>{review.tourType}</Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Reviews</Text>
      </View>
      
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity 
            style={[styles.filterButton, activeFilter === 'all' && styles.activeFilterButton]} 
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterText, activeFilter === 'all' && styles.activeFilterText]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, activeFilter === 'positive' && styles.activeFilterButton]} 
            onPress={() => setActiveFilter('positive')}
          >
            <Text style={[styles.filterText, activeFilter === 'positive' && styles.activeFilterText]}>
              Positive
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, activeFilter === 'neutral' && styles.activeFilterButton]} 
            onPress={() => setActiveFilter('neutral')}
          >
            <Text style={[styles.filterText, activeFilter === 'neutral' && styles.activeFilterText]}>
              Neutral
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, activeFilter === 'negative' && styles.activeFilterButton]} 
            onPress={() => setActiveFilter('negative')}
          >
            <Text style={[styles.filterText, activeFilter === 'negative' && styles.activeFilterText]}>
              Negative
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>4.5</Text>
          <Text style={styles.statLabel}>Average Rating</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{reviews.length}</Text>
          <Text style={styles.statLabel}>Total Reviews</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>85%</Text>
          <Text style={styles.statLabel}>Positive</Text>
        </View>
      </View>
      
      <ScrollView style={styles.reviewsList}>
        {filteredReviews.length > 0 ? (
          filteredReviews.map(renderReviewCard)
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="star-off" size={60} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No reviews found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: COLORS.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.background,
  },
  filterContainer: {
    padding: spacing.md,
    backgroundColor: COLORS.surface,
    elevation: 4,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  activeFilterButton: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.text,
  },
  activeFilterText: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: COLORS.surface,
    marginBottom: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.divider,
  },
  reviewsList: {
    flex: 1,
    padding: spacing.md,
  },
  reviewCard: {
    marginBottom: spacing.md,
    elevation: 4,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  touristInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  touristDetails: {
    marginLeft: spacing.sm,
  },
  touristName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  tourDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    marginVertical: spacing.sm,
  },
  comment: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  tourInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tourType: {
    marginLeft: spacing.xs,
    fontSize: 12,
    color: COLORS.textLight,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.textLight,
    marginTop: spacing.md,
  },
});

export default ReviewsScreen; 