import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Divider, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, spacing } from '../../constants/theme';

const EarningsScreen = ({ navigation }) => {
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState('month');

  // Mock data for earnings
  const earnings = [
    {
      id: '1',
      touristName: 'John Doe',
      date: '2023-05-10',
      amount: 75,
      tourType: 'City Tour',
      status: 'paid',
    },
    {
      id: '2',
      touristName: 'Jane Smith',
      date: '2023-05-05',
      amount: 120,
      tourType: 'Mountain Trek',
      status: 'paid',
    },
    {
      id: '3',
      touristName: 'Robert Johnson',
      date: '2023-04-28',
      amount: 90,
      tourType: 'Beach Tour',
      status: 'pending',
    },
  ];

  const totalEarnings = earnings.reduce((sum, earning) => sum + earning.amount, 0);
  const pendingEarnings = earnings
    .filter(earning => earning.status === 'pending')
    .reduce((sum, earning) => sum + earning.amount, 0);
  const completedEarnings = earnings
    .filter(earning => earning.status === 'paid')
    .reduce((sum, earning) => sum + earning.amount, 0);

  const renderEarningCard = (earning) => (
    <Card key={earning.id} style={styles.earningCard}>
      <Card.Content>
        <View style={styles.earningHeader}>
          <View>
            <Text style={styles.touristName}>{earning.touristName}</Text>
            <Text style={styles.tourDate}>{earning.date}</Text>
          </View>
          <View style={styles.amountContainer}>
            <Text style={styles.amount}>${earning.amount}</Text>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: earning.status === 'paid' ? COLORS.success : COLORS.warning }
            ]}>
              <Text style={styles.statusText}>
                {earning.status === 'paid' ? 'Paid' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.tourInfo}>
          <MaterialCommunityIcons name="map-marker" size={16} color={COLORS.textLight} />
          <Text style={styles.tourType}>{earning.tourType}</Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Earnings</Text>
      </View>
      
      <View style={styles.timeRangeContainer}>
        <TouchableOpacity 
          style={[styles.timeRangeButton, timeRange === 'week' && styles.activeTimeRangeButton]} 
          onPress={() => setTimeRange('week')}
        >
          <Text style={[styles.timeRangeText, timeRange === 'week' && styles.activeTimeRangeText]}>
            Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.timeRangeButton, timeRange === 'month' && styles.activeTimeRangeButton]} 
          onPress={() => setTimeRange('month')}
        >
          <Text style={[styles.timeRangeText, timeRange === 'month' && styles.activeTimeRangeText]}>
            Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.timeRangeButton, timeRange === 'year' && styles.activeTimeRangeButton]} 
          onPress={() => setTimeRange('year')}
        >
          <Text style={[styles.timeRangeText, timeRange === 'year' && styles.activeTimeRangeText]}>
            Year
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.summaryContainer}>
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryTitle}>Total Earnings</Text>
            <Text style={styles.summaryAmount}>${totalEarnings}</Text>
          </Card.Content>
        </Card>
        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, styles.halfCard]}>
            <Card.Content>
              <Text style={styles.summaryTitle}>Completed</Text>
              <Text style={[styles.summaryAmount, { color: COLORS.success }]}>
                ${completedEarnings}
              </Text>
            </Card.Content>
          </Card>
          <Card style={[styles.summaryCard, styles.halfCard]}>
            <Card.Content>
              <Text style={styles.summaryTitle}>Pending</Text>
              <Text style={[styles.summaryAmount, { color: COLORS.warning }]}>
                ${pendingEarnings}
              </Text>
            </Card.Content>
          </Card>
        </View>
      </View>
      
      <View style={styles.transactionsHeader}>
        <Text style={styles.transactionsTitle}>Recent Transactions</Text>
        <Button 
          mode="text" 
          onPress={() => navigation.navigate('GuideEarnings', { screen: 'TransactionHistory' })}
        >
          View All
        </Button>
      </View>
      
      <ScrollView style={styles.transactionsList}>
        {earnings.length > 0 ? (
          earnings.map(renderEarningCard)
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="cash-remove" size={60} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No earnings found</Text>
          </View>
        )}
      </ScrollView>
      
      <View style={styles.withdrawContainer}>
        <Button 
          mode="contained" 
          style={styles.withdrawButton}
          onPress={() => navigation.navigate('GuideEarnings', { screen: 'Withdraw' })}
        >
          Withdraw Earnings
        </Button>
      </View>
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
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: COLORS.surface,
    elevation: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  activeTimeRangeButton: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  timeRangeText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  activeTimeRangeText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  summaryContainer: {
    padding: spacing.md,
  },
  summaryCard: {
    elevation: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  halfCard: {
    width: '48%',
  },
  summaryTitle: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: spacing.xs,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  transactionsList: {
    flex: 1,
    padding: spacing.md,
  },
  earningCard: {
    marginBottom: spacing.md,
    elevation: 4,
  },
  earningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginTop: spacing.xs,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.background,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: spacing.sm,
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
  withdrawContainer: {
    padding: spacing.md,
    backgroundColor: COLORS.surface,
    elevation: 4,
  },
  withdrawButton: {
    paddingVertical: spacing.sm,
  },
});

export default EarningsScreen; 