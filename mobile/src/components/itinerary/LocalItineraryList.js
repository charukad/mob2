import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Card, Title, Paragraph, Button, Text, ActivityIndicator, Divider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { colors, spacing } from '../../utils/themeUtils';

const LocalItineraryList = ({ navigation, onRefresh }) => {
  const [localItineraries, setLocalItineraries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLocalItineraries();
  }, [onRefresh]);

  const loadLocalItineraries = async () => {
    try {
      setLoading(true);
      const savedItinerariesJSON = await AsyncStorage.getItem('localItineraries');
      
      if (savedItinerariesJSON) {
        const savedItineraries = JSON.parse(savedItinerariesJSON);
        setLocalItineraries(savedItineraries);
      } else {
        setLocalItineraries([]);
      }
    } catch (error) {
      console.error('Error loading local itineraries:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  const handleViewItinerary = (itinerary) => {
    // Navigate to a local itinerary detail screen or view
    navigation.navigate('LocalItineraryDetail', { itinerary });
  };

  // Handle empty state
  if (!loading && localItineraries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="cloud-off" size={64} color={colors.textSecondary} />
        <Text style={styles.emptyText}>No local itineraries found</Text>
        <Text style={styles.emptySubtext}>
          Itineraries created while offline will appear here
        </Text>
      </View>
    );
  }

  // Handle loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading local itineraries...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Locally Saved Itineraries</Text>
        <Text style={styles.sectionSubtitle}>
          These itineraries are stored on your device and will be synced when online
        </Text>
      </View>
      
      <FlatList
        data={localItineraries}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Card style={styles.card} onPress={() => handleViewItinerary(item)}>
            <Card.Content>
              <Title>{item.title}</Title>
              <Paragraph numberOfLines={2}>{item.description || 'No description'}</Paragraph>
              
              <Divider style={styles.divider} />
              
              <View style={styles.dateRow}>
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>Start Date</Text>
                  <Text style={styles.dateValue}>{formatDate(item.startDate)}</Text>
                </View>
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>End Date</Text>
                  <Text style={styles.dateValue}>{formatDate(item.endDate)}</Text>
                </View>
              </View>
              
              {item.budget > 0 && (
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetLabel}>Budget:</Text>
                  <Text style={styles.budgetValue}>
                    {item.currency} {item.budget.toFixed(2)}
                  </Text>
                </View>
              )}
            </Card.Content>
            <Card.Actions>
              <Button
                mode="contained"
                onPress={() => handleViewItinerary(item)}
                style={styles.viewButton}
              >
                View Details
              </Button>
            </Card.Actions>
          </Card>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.medium,
    backgroundColor: colors.background,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.tiny,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.medium,
  },
  card: {
    marginBottom: spacing.medium,
    elevation: 2,
  },
  divider: {
    marginVertical: spacing.medium,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.small,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.small,
  },
  budgetLabel: {
    fontSize: 14,
    marginRight: spacing.small,
  },
  budgetValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  viewButton: {
    marginLeft: 'auto',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.large,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: spacing.medium,
    color: colors.textSecondary,
  },
  emptySubtext: {
    textAlign: 'center',
    margin: spacing.medium,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.large,
  },
  loadingText: {
    marginTop: spacing.medium,
    color: colors.textSecondary,
  },
});

export default LocalItineraryList; 