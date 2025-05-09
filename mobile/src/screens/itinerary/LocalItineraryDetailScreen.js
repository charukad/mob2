import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Image, Alert, Platform, Linking } from 'react-native';
import { Text, Button, Divider, Card, Title, Paragraph, FAB, ActivityIndicator } from 'react-native-paper';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Header from '../../components/common/Header';
import { colors, spacing } from '../../utils/themeUtils';

const LocalItineraryDetailScreen = ({ route, navigation }) => {
  const { itinerary } = route.params;
  const [loading, setLoading] = useState(false);
  
  // Format dates for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Delete this local itinerary
  const handleDeleteItinerary = async () => {
    Alert.alert(
      'Delete Itinerary',
      'Are you sure you want to delete this itinerary? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Get all local itineraries
              const savedItinerariesJSON = await AsyncStorage.getItem('localItineraries');
              if (!savedItinerariesJSON) {
                throw new Error('No local itineraries found');
              }
              
              const savedItineraries = JSON.parse(savedItinerariesJSON);
              
              // Filter out the current itinerary
              const updatedItineraries = savedItineraries.filter(item => item.id !== itinerary.id);
              
              // Save updated list back to AsyncStorage
              await AsyncStorage.setItem('localItineraries', JSON.stringify(updatedItineraries));
              
              // Navigate back
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting itinerary:', error);
              Alert.alert('Error', 'Failed to delete itinerary: ' + error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  
  // Add a place to this itinerary
  const handleAddPlace = () => {
    navigation.navigate('SearchScreen', {
      onPlaceSelected: (place) => handleSavePlaceToItinerary(place),
    });
  };
  
  // Save a place to this itinerary
  const handleSavePlaceToItinerary = async (place) => {
    try {
      setLoading(true);
      
      // Get current local itineraries
      const savedItinerariesJSON = await AsyncStorage.getItem('localItineraries');
      if (!savedItinerariesJSON) {
        throw new Error('No local itineraries found');
      }
      
      const savedItineraries = JSON.parse(savedItinerariesJSON);
      
      // Find the current itinerary
      const itineraryIndex = savedItineraries.findIndex(item => item.id === itinerary.id);
      
      if (itineraryIndex === -1) {
        throw new Error('Itinerary not found');
      }
      
      // Create a copy of the itinerary
      const updatedItinerary = { ...savedItineraries[itineraryIndex] };
      
      // Initialize places array if it doesn't exist
      if (!updatedItinerary.places) {
        updatedItinerary.places = [];
      }
      
      // Add place to the itinerary
      updatedItinerary.places.push({
        id: Date.now().toString(),
        placeId: place.placeId,
        name: place.name,
        address: place.address || place.formatted_address,
        latitude: place.latitude || place.geometry?.location?.lat,
        longitude: place.longitude || place.geometry?.location?.lng,
        photos: place.photos || [],
        addedAt: new Date().toISOString()
      });
      
      // Update the itinerary in the array
      savedItineraries[itineraryIndex] = updatedItinerary;
      
      // Save updated list back to AsyncStorage
      await AsyncStorage.setItem('localItineraries', JSON.stringify(savedItineraries));
      
      // Update route params with new itinerary data
      navigation.setParams({ itinerary: updatedItinerary });
      
      Alert.alert('Success', 'Place added to itinerary successfully!');
    } catch (error) {
      console.error('Error adding place to itinerary:', error);
      Alert.alert('Error', 'Failed to add place: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Header
        title="Itinerary Details"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />
      
      <ScrollView style={styles.scrollContainer}>
        {/* Cover image or placeholder */}
        {itinerary.coverImage ? (
          <Image source={{ uri: itinerary.coverImage }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <MaterialIcons name="photo" size={64} color={colors.divider} />
            <Text style={styles.placeholderText}>No cover image</Text>
          </View>
        )}
        
        {/* Itinerary details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.title}>{itinerary.title}</Text>
          
          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar" size={16} color={colors.primary} />
              <Text style={styles.metaText}>
                {formatDate(itinerary.startDate)} - {formatDate(itinerary.endDate)}
              </Text>
            </View>
            
            {itinerary.budget > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="cash-outline" size={16} color={colors.primary} />
                <Text style={styles.metaText}>
                  Budget: {itinerary.currency} {itinerary.budget.toFixed(2)}
                </Text>
              </View>
            )}
            
            <View style={styles.metaItem}>
              <Ionicons 
                name={itinerary.isPublic ? "globe" : "lock-closed"} 
                size={16} 
                color={colors.primary} 
              />
              <Text style={styles.metaText}>
                {itinerary.isPublic ? 'Public' : 'Private'} itinerary
              </Text>
            </View>
          </View>
          
          {itinerary.description && (
            <Card style={styles.card}>
              <Card.Content>
                <Title>Description</Title>
                <Paragraph>{itinerary.description}</Paragraph>
              </Card.Content>
            </Card>
          )}
          
          <Divider style={styles.divider} />
          
          {/* Places section */}
          <View style={styles.placesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Places</Text>
              <Button 
                mode="contained" 
                icon="plus" 
                onPress={handleAddPlace}
                style={styles.addButton}
              >
                Add Place
              </Button>
            </View>
            
            {(!itinerary.places || itinerary.places.length === 0) ? (
              <View style={styles.emptyPlacesContainer}>
                <MaterialIcons name="place" size={48} color={colors.divider} />
                <Text style={styles.emptyPlacesText}>No places added yet</Text>
                <Text style={styles.emptyPlacesSubtext}>
                  Add places to your itinerary by clicking the button above
                </Text>
              </View>
            ) : (
              <View style={styles.placesList}>
                {itinerary.places.map((place, index) => (
                  <Card key={place.id || index} style={styles.placeCard}>
                    <Card.Content>
                      <Title>{place.name}</Title>
                      <Paragraph>{place.address}</Paragraph>
                      <View style={styles.placeActions}>
                        <Button
                          icon="map-marker"
                          mode="outlined"
                          onPress={() => {
                            const url = Platform.select({
                              ios: `maps:0,0?q=${place.name}@${place.latitude},${place.longitude}`,
                              android: `geo:0,0?q=${place.latitude},${place.longitude}(${place.name})`,
                            });
                            Linking.openURL(url);
                          }}
                        >
                          View on Map
                        </Button>
                      </View>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      
      {/* Delete button */}
      <FAB
        style={styles.fab}
        icon="delete"
        color="#fff"
        onPress={handleDeleteItinerary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.medium,
    color: colors.textSecondary,
  },
  coverImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: colors.lightGrey,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: spacing.small,
    color: colors.textSecondary,
  },
  detailsContainer: {
    padding: spacing.medium,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.medium,
  },
  metaContainer: {
    marginBottom: spacing.medium,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.small,
  },
  metaText: {
    marginLeft: spacing.small,
    fontSize: 14,
    color: colors.textSecondary,
  },
  card: {
    marginBottom: spacing.medium,
  },
  divider: {
    marginVertical: spacing.medium,
  },
  placesSection: {
    marginTop: spacing.medium,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.medium,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    borderRadius: 20,
  },
  emptyPlacesContainer: {
    padding: spacing.large,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  emptyPlacesText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: spacing.medium,
    color: colors.textSecondary,
  },
  emptyPlacesSubtext: {
    textAlign: 'center',
    marginTop: spacing.small,
    color: colors.textSecondary,
  },
  placesList: {
    marginTop: spacing.small,
  },
  placeCard: {
    marginBottom: spacing.medium,
  },
  placeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.medium,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: colors.error,
  },
});

export default LocalItineraryDetailScreen; 