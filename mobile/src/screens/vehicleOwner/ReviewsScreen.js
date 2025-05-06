import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Avatar, Divider, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, spacing } from '../../constants/theme';

const ReviewsScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    // API call would be implemented here
    setLoading(false);
    // For now we'll use empty array
    setReviews([]);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReviews();
  };

  const renderStars = (rating) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <MaterialIcons
            key={star}
            name={star <= rating ? 'star' : 'star-border'}
            size={18}
            color={star <= rating ? COLORS.warning : COLORS.gray}
            style={styles.starIcon}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (reviews.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.noDataText}>No reviews yet</Text>
        <Text style={styles.subText}>When clients leave reviews, they'll appear here</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            {/* Review card content would go here */}
          </Card>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
    borderRadius: 8,
    padding: spacing.sm,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  subText: {
    color: COLORS.textLight,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
  },
  starIcon: {
    marginRight: 2,
  },
});

export default ReviewsScreen; 