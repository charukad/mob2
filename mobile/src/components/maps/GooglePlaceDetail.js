import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, ScrollView, Linking, TouchableOpacity, Platform, Modal, FlatList } from 'react-native';
import { Text, Button, Card, Divider, Chip, ActivityIndicator, Snackbar, RadioButton } from 'react-native-paper';
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Constants from 'expo-constants';
import { colors, spacing } from '../../utils/themeUtils';
import getEnvVars from '../../../env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, isAfter } from 'date-fns';

const { googleMapsApiKey } = getEnvVars();

const GooglePlaceDetail = ({ place, onClose }) => {
  const [placeDetails, setPlaceDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addingToItinerary, setAddingToItinerary] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // New state for itinerary selection
  const [itineraryModalVisible, setItineraryModalVisible] = useState(false);
  const [userItineraries, setUserItineraries] = useState([]);
  const [selectedItinerary, setSelectedItinerary] = useState(null);
  const [loadingItineraries, setLoadingItineraries] = useState(false);
  
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
  
  // Load user's itineraries
  const loadUserItineraries = async () => {
    try {
      setLoadingItineraries(true);
      
      // First try to get itineraries from AsyncStorage
      const localItinerariesJSON = await AsyncStorage.getItem('localItineraries');
      let itineraries = localItinerariesJSON ? JSON.parse(localItinerariesJSON) : [];
      
      console.log('Found itineraries in storage:', itineraries.length);
      
      // Make sure we have valid itineraries with correct ID format
      if (itineraries.length > 0) {
        // Log the first itinerary for debugging
        console.log('Sample itinerary:', JSON.stringify(itineraries[0]));
      }
      
      // Don't filter by dates as it may be too restrictive
      // Just show all available itineraries
      setUserItineraries(itineraries);
    } catch (error) {
      console.error('Error loading itineraries:', error);
      setSnackbarMessage('Error loading itineraries: ' + error.message);
      setSnackbarVisible(true);
    } finally {
      setLoadingItineraries(false);
    }
  };
  
  // Show itinerary selection modal
  const showItineraryModal = async () => {
    await loadUserItineraries();
    setItineraryModalVisible(true);
  };
  
  // Handle adding place to itinerary
  const handleAddToItinerary = async () => {
    // Show itinerary selection modal
    showItineraryModal();
  };
  
  // Handle confirming itinerary selection
  const handleConfirmItinerarySelection = async () => {
    if (!selectedItinerary) {
      setSnackbarMessage('Please select an itinerary');
      setSnackbarVisible(true);
      return;
    }
    
    try {
      setAddingToItinerary(true);
      
      console.log('Selected itinerary:', JSON.stringify(selectedItinerary));
      
      // Create place object to add
      const details = placeDetails || place;
      const newPlace = {
        id: place.placeId || `place_${Date.now()}`,
        name: details.name,
        address: details.formatted_address || place.address,
        latitude: place.latitude || details.geometry?.location?.lat,
        longitude: place.longitude || details.geometry?.location?.lng,
        rating: details.rating || 0,
        types: details.types || [],
        addedAt: new Date().toISOString(),
        photo: details.photos && details.photos.length > 0 ? details.photos[0].photo_reference : null,
      };
      
      // Get existing itineraries
      const localItinerariesJSON = await AsyncStorage.getItem('localItineraries');
      const itineraries = localItinerariesJSON ? JSON.parse(localItinerariesJSON) : [];
      
      console.log('Looking for itinerary with ID:', selectedItinerary.id);
      console.log('Available itinerary IDs:', itineraries.map(i => i.id));
      
      // Find the selected itinerary - be more flexible with ID matching
      let itineraryIndex = -1;
      
      // Try exact match first
      itineraryIndex = itineraries.findIndex(i => i.id === selectedItinerary.id);
      
      // If not found, try string comparison
      if (itineraryIndex === -1) {
        itineraryIndex = itineraries.findIndex(i => String(i.id) === String(selectedItinerary.id));
      }
      
      // If still not found, try by title as a last resort
      if (itineraryIndex === -1 && selectedItinerary.title) {
        itineraryIndex = itineraries.findIndex(i => i.title === selectedItinerary.title);
      }
      
      if (itineraryIndex === -1) {
        throw new Error('Selected itinerary not found in storage');
      }
      
      console.log('Found itinerary at index:', itineraryIndex);
      
      // Create places array if it doesn't exist
      if (!itineraries[itineraryIndex].places) {
        itineraries[itineraryIndex].places = [];
      }
      
      // Check if place already exists in itinerary
      const placeExists = itineraries[itineraryIndex].places.some(p => p.id === newPlace.id);
      
      if (placeExists) {
        setSnackbarMessage(`This place is already in "${selectedItinerary.title}"`);
        setItineraryModalVisible(false);
        setSnackbarVisible(true);
        return;
      }
      
      // Add place to itinerary
      itineraries[itineraryIndex].places.push(newPlace);
      
      // Save updated itineraries
      await AsyncStorage.setItem('localItineraries', JSON.stringify(itineraries));
      
      console.log('Successfully added place to itinerary');
      
      // Close modal and show success message
      setItineraryModalVisible(false);
      setSnackbarMessage(`Added to "${selectedItinerary.title}" successfully!`);
      setSnackbarVisible(true);
      
      // Reset selection
      setSelectedItinerary(null);
    } catch (error) {
      console.error('Error adding place to itinerary:', error);
      setSnackbarMessage(`Error: ${error.message}`);
      setSnackbarVisible(true);
    } finally {
      setAddingToItinerary(false);
    }
  };
  
  // Safely format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Safely calculate duration between dates
  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 1;
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24) + 1));
    } catch (error) {
      return 1;
    }
  };
  
  // Render itinerary item
  const renderItineraryItem = ({ item }) => {
    // Handle possible date parsing issues
    let startDateStr = 'No date';
    let endDateStr = 'No date';
    let duration = 1;
    
    try {
      startDateStr = item.startDate ? formatDate(item.startDate) : 'No date'; 
      endDateStr = item.endDate ? formatDate(item.endDate) : 'No date';
      duration = calculateDuration(item.startDate, item.endDate);
    } catch (error) {
      console.error('Error formatting dates:', error);
    }
    
    return (
      <TouchableOpacity
        style={[
          styles.itineraryItem,
          selectedItinerary?.id === item.id && styles.selectedItineraryItem
        ]}
        onPress={() => setSelectedItinerary(item)}
      >
        <View style={styles.radioContainer}>
          <RadioButton
            value={item.id}
            status={selectedItinerary?.id === item.id ? 'checked' : 'unchecked'}
            onPress={() => setSelectedItinerary(item)}
            color={colors.primary}
          />
        </View>
        
        <View style={styles.itineraryInfo}>
          <Text style={styles.itineraryTitle}>{item.title || 'Untitled Itinerary'}</Text>
          <Text style={styles.itineraryDate}>
            {startDateStr} - {endDateStr}
          </Text>
          
          <View style={styles.itineraryStats}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="calendar-range" size={16} color={colors.textSecondary} />
              <Text style={styles.statText}>
                {duration} {duration === 1 ? 'day' : 'days'}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="map-marker-path" size={16} color={colors.textSecondary} />
              <Text style={styles.statText}>
                {item.places ? item.places.length : 0} places
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
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
      
      {/* Itinerary Selection Modal */}
      <Modal
        visible={itineraryModalVisible}
        onRequestClose={() => setItineraryModalVisible(false)}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Itinerary</Text>
              <TouchableOpacity 
                style={styles.closeModalButton} 
                onPress={() => setItineraryModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <Divider />
            
            {loadingItineraries ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading your itineraries...</Text>
              </View>
            ) : userItineraries.length > 0 ? (
              <>
                <FlatList
                  data={userItineraries}
                  renderItem={renderItineraryItem}
                  keyExtractor={item => item.id?.toString() || Math.random().toString()}
                  contentContainerStyle={styles.itineraryList}
                  ItemSeparatorComponent={() => <Divider />}
                />
                <Divider />
                <View style={styles.createNewContainer}>
                  <Button 
                    mode="outlined"
                    icon="plus"
                    onPress={() => {
                      setItineraryModalVisible(false);
                      // Save the place temporarily so we can add it later
                      AsyncStorage.setItem('pendingPlace', JSON.stringify({
                        id: place.placeId || `place_${Date.now()}`,
                        name: placeDetails?.name || place.name,
                        address: placeDetails?.formatted_address || place.address,
                        latitude: place.latitude || placeDetails?.geometry?.location?.lat,
                        longitude: place.longitude || placeDetails?.geometry?.location?.lng,
                        rating: placeDetails?.rating || place.rating || 0,
                        types: placeDetails?.types || place.types || [],
                        photo: placeDetails?.photos && placeDetails.photos.length > 0 ? 
                          placeDetails.photos[0].photo_reference : null,
                      }));
                      
                      // Navigate to create itinerary screen
                      setTimeout(() => {
                        onClose();
                        setSnackbarMessage('Creating new itinerary. You can add this place after creation.');
                        setSnackbarVisible(true);
                      }, 300);
                    }}
                  >
                    Create New Itinerary
                  </Button>
                </View>
              </>
            ) : (
              <View style={styles.emptyItineraries}>
                <MaterialCommunityIcons name="calendar-blank" size={64} color={colors.divider} />
                <Text style={styles.emptyTitle}>No itineraries found</Text>
                <Text style={styles.emptySubtitle}>
                  Create a new itinerary to add this place.
                </Text>
                <Button 
                  mode="contained"
                  icon="plus"
                  onPress={() => {
                    setItineraryModalVisible(false);
                    // First save the place temporarily so we can add it later
                    AsyncStorage.setItem('pendingPlace', JSON.stringify({
                      id: place.placeId || `place_${Date.now()}`,
                      name: placeDetails?.name || place.name,
                      address: placeDetails?.formatted_address || place.address,
                      latitude: place.latitude || placeDetails?.geometry?.location?.lat,
                      longitude: place.longitude || placeDetails?.geometry?.location?.lng,
                      rating: placeDetails?.rating || place.rating || 0,
                      types: placeDetails?.types || place.types || [],
                      photo: placeDetails?.photos && placeDetails.photos.length > 0 ? 
                        placeDetails.photos[0].photo_reference : null,
                    }));
                    
                    // Navigate to create itinerary screen
                    setTimeout(() => {
                      // Use the onClose callback to navigate
                      onClose();
                      // We can't navigate directly here, but we'll show instructions
                      setSnackbarMessage('Creating new itinerary. You can add this place after creation.');
                      setSnackbarVisible(true);
                    }, 300);
                  }}
                  style={styles.createButton}
                >
                  Create New Itinerary
                </Button>
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => setItineraryModalVisible(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleConfirmItinerarySelection}
                disabled={!selectedItinerary || addingToItinerary}
                loading={addingToItinerary}
                style={styles.modalButton}
              >
                Add to Itinerary
              </Button>
            </View>
          </View>
        </View>
      </Modal>
      
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
  // Itinerary Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.medium,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeModalButton: {
    padding: 4,
  },
  itineraryList: {
    padding: spacing.small,
  },
  itineraryItem: {
    flexDirection: 'row',
    padding: spacing.medium,
    alignItems: 'center',
  },
  selectedItineraryItem: {
    backgroundColor: colors.primary + '10',
  },
  radioContainer: {
    marginRight: spacing.small,
  },
  itineraryInfo: {
    flex: 1,
  },
  itineraryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itineraryDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  itineraryStats: {
    flexDirection: 'row',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.medium,
  },
  statText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  emptyItineraries: {
    padding: spacing.large,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: spacing.medium,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.small,
    color: colors.textSecondary,
  },
  createNewContainer: {
    padding: spacing.medium,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    alignItems: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing.medium,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  modalButton: {
    marginLeft: spacing.small,
  },
  createButton: {
    marginTop: spacing.medium,
  },
});

export default GooglePlaceDetail; 