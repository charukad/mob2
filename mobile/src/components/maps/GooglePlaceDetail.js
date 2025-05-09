import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, ScrollView, Linking, TouchableOpacity, Platform } from 'react-native';
import { Text, Button, Card, Divider, Chip, ActivityIndicator, Snackbar } from 'react-native-paper';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Constants from 'expo-constants';
import { colors, spacing } from '../../utils/themeUtils';
import getEnvVars from '../../../env';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { googleMapsApiKey } = getEnvVars();

const GooglePlaceDetail = ({ place, onClose }) => {
  const [placeDetails, setPlaceDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addingToItinerary, setAddingToItinerary] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  useEffect(() => {
    fetchPlaceDetails();
  }, []);
  
  // Fetch additional place details from Google Places API
  const fetchPlaceDetails = async () => {
    try {
      setLoading(true);
      
      if (!googleMapsApiKey) {
        throw new Error('Google Maps API key not found in environment variables');
      }
      
      // Use direct Google Places API as the primary method
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.placeId}&fields=name,rating,formatted_phone_number,formatted_address,geometry,opening_hours,photos,price_level,website,reviews,types,business_status&key=${googleMapsApiKey}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout
      
      console.log('Fetching place details from Google API directly');
      
      try {
        const response = await fetch(url, {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Google API error: ${response.status}`);
        }
        
      const data = await response.json();
      
      if (data.status === 'OK' && data.result) {
        setPlaceDetails(data.result);
      } else {
          // If direct API fails, create a basic place details object from the place prop
          const basicDetails = {
            name: place.name,
            formatted_address: place.address || 'Address not available',
            geometry: {
              location: {
                lat: place.latitude,
                lng: place.longitude
              }
            },
            rating: place.rating || 0,
            types: place.types || ['point_of_interest'],
            photos: place.photos || []
          };
          
          setPlaceDetails(basicDetails);
          console.log('Using basic place details as fallback');
        }
      } catch (error) {
        console.error('Error fetching from direct API:', error.message);
        // Use basic details as fallback
        const basicDetails = {
          name: place.name,
          formatted_address: place.address || 'Address not available',
          geometry: {
            location: {
              lat: place.latitude,
              lng: place.longitude
            }
          },
          rating: place.rating || 0,
          types: place.types || ['point_of_interest'],
          photos: place.photos || []
        };
        
        setPlaceDetails(basicDetails);
        console.log('Using basic place details as fallback');
      }
    } catch (err) {
      console.error('Error fetching place details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Open Google Maps for directions
  const openDirections = () => {
    const { latitude, longitude } = place;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${place.placeId}`;
    Linking.openURL(url);
  };
  
  // Open website
  const openWebsite = (url) => {
    if (url) {
      Linking.openURL(url);
    }
  };
  
  // Make a phone call
  const makePhoneCall = (phoneNumber) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };
  
  // Handle adding place to itinerary
  const handleAddToItinerary = async () => {
    try {
      setAddingToItinerary(true);
      
      // Get existing saved places or initialize empty array
      const savedPlacesJSON = await AsyncStorage.getItem('savedPlaces');
      const savedPlaces = savedPlacesJSON ? JSON.parse(savedPlacesJSON) : [];
      
      // Create new place item
      const details = placeDetails || place;
      const newPlace = {
        id: place.placeId,
        name: details.name,
        address: details.formatted_address || place.address,
        latitude: place.latitude || details.geometry?.location?.lat,
        longitude: place.longitude || details.geometry?.location?.lng,
        rating: details.rating || 0,
        types: details.types || [],
        addedAt: new Date().toISOString(),
        notes: `Place types: ${(details.types || []).join(', ')}`
      };
      
      // Check if place is already saved
      const alreadySaved = savedPlaces.some(p => p.id === newPlace.id);
      
      if (alreadySaved) {
        setSnackbarMessage('This place is already in your itinerary');
      } else {
        // Add to saved places
        savedPlaces.push(newPlace);
        
        // Save back to AsyncStorage
        await AsyncStorage.setItem('savedPlaces', JSON.stringify(savedPlaces));
        
        setSnackbarMessage('Added to itinerary successfully!');
      }
    } catch (error) {
      console.error('Error saving place:', error);
      setSnackbarMessage(`Error: ${error.message}`);
    } finally {
      setAddingToItinerary(false);
      setSnackbarVisible(true);
    }
  };
  
  // Render placeholder
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading place details...</Text>
      </View>
    );
  }
  
  // Render error
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color={colors.error} />
        <Text style={styles.errorTitle}>Failed to load details</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Button mode="contained" onPress={fetchPlaceDetails} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }
  
  // Render place details
  const details = placeDetails || place;
  const photos = details.photos || [];
  
  return (
    <ScrollView style={styles.container}>
      {/* Place photos */}
      {photos.length > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.photoScrollView}
        >
          {photos.slice(0, 5).map((photo, index) => {
            const directPhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${googleMapsApiKey}`;
            
            return (
            <Image
              key={index}
              source={{
                  uri: directPhotoUrl,
                  headers: { 'Accept': 'image/*' },
                  cache: 'force-cache'
              }}
              style={styles.photo}
            />
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.photoPlaceholder}>
          <MaterialIcons name="photo" size={64} color={colors.divider} />
          <Text style={styles.photoPlaceholderText}>No photos available</Text>
        </View>
      )}
      
      {/* Place name and rating */}
      <View style={styles.headerContainer}>
        <Text style={styles.placeName}>{details.name}</Text>
        {details.rating && (
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>{details.rating.toFixed(1)}</Text>
            <Ionicons name="star" size={16} color="#FFD700" />
            {details.user_ratings_total && (
              <Text style={styles.ratingCount}>({details.user_ratings_total})</Text>
            )}
          </View>
        )}
        
        {/* Place types */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typesContainer}>
          {details.types && details.types.map((type, index) => (
            <Chip key={index} style={styles.typeChip}>
              {type.replace(/_/g, ' ')}
            </Chip>
          ))}
        </ScrollView>
      </View>
      
      <Divider />
      
      {/* Address and contact */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color={colors.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>{details.formatted_address}</Text>
          </View>
          
          {details.formatted_phone_number && (
            <TouchableOpacity 
              style={styles.infoRow} 
              onPress={() => makePhoneCall(details.formatted_phone_number)}
            >
              <Ionicons name="call" size={20} color={colors.primary} style={styles.infoIcon} />
              <Text style={styles.infoText}>{details.formatted_phone_number}</Text>
            </TouchableOpacity>
          )}
          
          {details.website && (
            <TouchableOpacity 
              style={styles.infoRow} 
              onPress={() => openWebsite(details.website)}
            >
              <Ionicons name="globe" size={20} color={colors.primary} style={styles.infoIcon} />
              <Text style={[styles.infoText, styles.websiteText]} numberOfLines={1}>
                {details.website.replace(/^https?:\/\//, '')}
              </Text>
            </TouchableOpacity>
          )}
          
          {/* Opening hours */}
          {details.opening_hours && (
            <View style={styles.openingHoursContainer}>
              <View style={styles.openingHoursHeader}>
                <Ionicons name="time" size={20} color={colors.primary} style={styles.infoIcon} />
                <Text style={styles.openingHoursTitle}>Opening Hours</Text>
                {details.opening_hours.open_now !== undefined && (
                  <Chip 
                    style={[
                      styles.openStatusChip, 
                      details.opening_hours.open_now ? styles.openChip : styles.closedChip
                    ]}
                  >
                    {details.opening_hours.open_now ? 'Open Now' : 'Closed'}
                  </Chip>
                )}
              </View>
              
              {details.opening_hours.weekday_text && (
                <View style={styles.hoursContainer}>
                  {details.opening_hours.weekday_text.map((day, index) => {
                    const [dayName, hours] = day.split(': ');
                    return (
                      <View key={index} style={styles.hourRow}>
                        <Text style={styles.dayName}>{dayName}</Text>
                        <Text style={styles.hourText}>{hours}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </Card.Content>
      </Card>
      
      {/* Map */}
      <Card style={styles.mapCard}>
        <Card.Content>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: place.latitude,
              longitude: place.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            {Platform.OS === 'ios' ? (
              <Marker
                coordinate={{
                  latitude: place.latitude,
                  longitude: place.longitude,
                }}
                title={details.name}
              />
            ) : (
              <Marker
                coordinate={{
                  latitude: place.latitude,
                  longitude: place.longitude,
                }}
                title={details.name}
              />
            )}
          </MapView>
          
          <Button 
            mode="contained" 
            icon="directions" 
            onPress={openDirections}
            style={styles.directionsButton}
          >
            Get Directions
          </Button>
        </Card.Content>
      </Card>
      
      {/* Reviews */}
      {details.reviews && details.reviews.length > 0 && (
        <Card style={styles.reviewsCard}>
          <Card.Title title="Reviews" />
          <Card.Content>
            {details.reviews.slice(0, 3).map((review, index) => (
              <View key={index} style={styles.reviewContainer}>
                {index > 0 && <Divider style={styles.reviewDivider} />}
                <View style={styles.reviewHeader}>
                  <Image 
                    source={{ uri: review.profile_photo_url }} 
                    style={styles.reviewerPhoto} 
                  />
                  <View style={styles.reviewerInfo}>
                    <Text style={styles.reviewerName}>{review.author_name}</Text>
                    <View style={styles.reviewRating}>
                      {[...Array(5)].map((_, i) => (
                        <Ionicons
                          key={i}
                          name={i < review.rating ? "star" : "star-outline"}
                          size={14}
                          color="#FFD700"
                          style={styles.starIcon}
                        />
                      ))}
                      <Text style={styles.reviewDate}>
                        {new Date(review.time * 1000).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.reviewText}>{review.text}</Text>
              </View>
            ))}
            
            {details.reviews.length > 3 && (
              <Button 
                mode="text" 
                onPress={() => Linking.openURL(`https://search.google.com/local/reviews?placeid=${place.placeId}`)}
                style={styles.moreReviewsButton}
              >
                See all {details.reviews.length} reviews
              </Button>
            )}
          </Card.Content>
        </Card>
      )}
      
      {/* Buttons */}
      <View style={styles.buttonsContainer}>
        <Button
          mode="outlined"
          icon="close"
          onPress={onClose}
          style={styles.closeButton}
        >
          Close
        </Button>
        <Button
          mode="contained"
          icon="map-marker-plus"
          onPress={handleAddToItinerary}
          loading={addingToItinerary}
          disabled={addingToItinerary}
          style={styles.addButton}
        >
          Add to Itinerary
        </Button>
      </View>
      
      {/* Snackbar for notifications */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'Dismiss',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.large,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: spacing.medium,
    color: colors.error,
  },
  errorMessage: {
    textAlign: 'center',
    margin: spacing.medium,
    color: colors.textSecondary,
  },
  retryButton: {
    marginTop: spacing.medium,
  },
  photoScrollView: {
    height: 200,
  },
  photo: {
    width: 400,
    height: 200,
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.lightGrey,
  },
  photoPlaceholderText: {
    marginTop: spacing.small,
    color: colors.textSecondary,
  },
  headerContainer: {
    padding: spacing.medium,
  },
  placeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.small,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.small,
  },
  ratingText: {
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 4,
  },
  ratingCount: {
    color: colors.textSecondary,
    marginLeft: 4,
    fontSize: 14,
  },
  typesContainer: {
    flexDirection: 'row',
    marginVertical: spacing.small,
  },
  typeChip: {
    marginRight: spacing.small,
    backgroundColor: colors.surface,
  },
  infoCard: {
    margin: spacing.medium,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.medium,
  },
  infoIcon: {
    marginRight: spacing.medium,
  },
  infoText: {
    flex: 1,
    fontSize: 16,
  },
  websiteText: {
    color: colors.primary,
  },
  openingHoursContainer: {
    marginTop: spacing.small,
  },
  openingHoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.small,
  },
  openingHoursTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  openStatusChip: {
    height: 24,
  },
  openChip: {
    backgroundColor: '#4CAF50',
  },
  closedChip: {
    backgroundColor: '#F44336',
  },
  hoursContainer: {
    marginLeft: spacing.large,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.tiny,
  },
  dayName: {
    width: 100,
    fontWeight: '500',
  },
  hourText: {
    flex: 1,
  },
  mapCard: {
    margin: spacing.medium,
    elevation: 2,
  },
  map: {
    height: 200,
    marginBottom: spacing.medium,
    borderRadius: 8,
  },
  directionsButton: {
    marginTop: spacing.small,
  },
  reviewsCard: {
    margin: spacing.medium,
    elevation: 2,
  },
  reviewContainer: {
    marginBottom: spacing.medium,
  },
  reviewDivider: {
    marginVertical: spacing.medium,
  },
  reviewHeader: {
    flexDirection: 'row',
    marginBottom: spacing.small,
  },
  reviewerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.small,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontWeight: 'bold',
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginRight: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.small,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
  },
  moreReviewsButton: {
    alignSelf: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.medium,
    marginBottom: spacing.large,
  },
  closeButton: {
    flex: 1,
    marginRight: spacing.small,
  },
  addButton: {
    flex: 2,
  },
});

export default GooglePlaceDetail; 