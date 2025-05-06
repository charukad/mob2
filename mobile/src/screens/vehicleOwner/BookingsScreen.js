import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Chip, Divider } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { COLORS, spacing } from '../../constants/theme';

const BookingsScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load bookings would be implemented here
  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    // API call would be implemented here
    setLoading(false);
    // For now we'll use empty array
    setBookings([]);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (bookings.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.noDataText}>No bookings yet</Text>
        <Text style={styles.subText}>When you receive bookings, they'll appear here</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            {/* Booking card content would go here */}
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
});

export default BookingsScreen; 