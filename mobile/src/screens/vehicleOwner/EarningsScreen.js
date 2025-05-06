import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, FlatList } from 'react-native';
import { Text, Card, Divider, ActivityIndicator, Button } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { COLORS, spacing } from '../../constants/theme';

const EarningsScreen = () => {
  const { user } = useSelector((state) => state.auth);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
    // API call would be implemented here
    setLoading(false);
    // For now we'll use mock data
    setEarnings({
      totalEarnings: 0,
      pendingPayouts: 0,
      completedBookings: 0,
      transactions: []
    });
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEarnings();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text style={styles.cardTitle}>Earnings Summary</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>${earnings.totalEarnings.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>${earnings.pendingPayouts.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Pending Payouts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{earnings.completedBookings}</Text>
              <Text style={styles.statLabel}>Completed Bookings</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      
      {earnings.transactions.length === 0 ? (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.subText}>Your vehicle rental transactions will appear here</Text>
          </Card.Content>
        </Card>
      ) : (
        <FlatList
          data={earnings.transactions}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Card style={styles.transactionCard}>
              {/* Transaction card content would go here */}
            </Card>
          )}
        />
      )}
    </ScrollView>
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
  },
  summaryCard: {
    marginBottom: spacing.lg,
    borderRadius: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
    borderRadius: 8,
  },
  transactionCard: {
    marginBottom: spacing.sm,
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subText: {
    color: COLORS.textLight,
    textAlign: 'center',
  },
});

export default EarningsScreen; 