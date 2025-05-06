import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { COLORS, spacing } from '../../constants/theme';

const DashboardScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useSelector((state) => state.auth);

  const dashboardItems = [
    {
      title: 'My Bookings',
      icon: 'calendar-check',
      screen: 'GuideBookings',
      color: COLORS.primary,
    },
    {
      title: 'Reviews',
      icon: 'star',
      screen: 'GuideReviews',
      color: COLORS.accent,
    },
    {
      title: 'Earnings',
      icon: 'cash',
      screen: 'GuideEarnings',
      color: COLORS.success,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.nameText}>{user?.firstName || 'Guide'}</Text>
      </View>

      <View style={styles.statsContainer}>
        <Card style={styles.statsCard}>
          <Card.Content>
            <Text style={styles.statsTitle}>Today's Bookings</Text>
            <Text style={styles.statsValue}>5</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statsCard}>
          <Card.Content>
            <Text style={styles.statsTitle}>Rating</Text>
            <Text style={styles.statsValue}>4.8</Text>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.actionsContainer}>
        {dashboardItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.actionButton}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
              <MaterialCommunityIcons name={item.icon} size={24} color={COLORS.background} />
            </View>
            <Text style={styles.actionText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Card style={styles.upcomingCard}>
        <Card.Title title="Upcoming Tours" />
        <Card.Content>
          <Text style={styles.noToursText}>No upcoming tours scheduled</Text>
        </Card.Content>
      </Card>
    </ScrollView>
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
  welcomeText: {
    fontSize: 16,
    color: COLORS.background,
    opacity: 0.8,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.background,
    marginTop: spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    marginTop: -spacing.lg,
  },
  statsCard: {
    flex: 1,
    margin: spacing.xs,
    elevation: 4,
  },
  statsTitle: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: spacing.xs,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
  },
  actionButton: {
    width: '30%',
    alignItems: 'center',
    margin: spacing.sm,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionText: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
  },
  upcomingCard: {
    margin: spacing.md,
    elevation: 4,
  },
  noToursText: {
    textAlign: 'center',
    color: COLORS.textLight,
    padding: spacing.md,
  },
});

export default DashboardScreen; 