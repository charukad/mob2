import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Image, 
  Dimensions, 
  TouchableOpacity,
  Linking,
  Platform
} from 'react-native';
import { Text, Button, Divider, Chip, ActivityIndicator } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import ImageView from 'react-native-image-viewing';
import { fetchLocationById, fetchNearbyLocations } from '../../store/slices/locationsSlice';
import { colors, spacing } from '../../utils/themeUtils';
import LocationMarker from '../../components/maps/LocationMarker';
import getEnvVars from '../../../env';

const { width } = Dimensions.get('window');
const ASPECT_RATIO = 16 / 9;
const IMAGE_HEIGHT = width / ASPECT_RATIO;

const LocationDetailScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const dispatch = useDispatch();
  const { currentLocation, loading, error, nearbyLocations } = useSelector((state) => state.locations);
  const [imageViewVisible, setImageViewVisible] = useState(false);
  const [initialImageIndex, setInitialImageIndex] = useState(0);
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState(null);
  const [locationData, setLocationData] = useState(null);

  useEffect(() => {
    // Check if ID is a Google Places ID (starts with ChIJ)
    if (id && id.startsWith('ChIJ')) {
      // Fetch directly from our API
      fetchGooglePlaceDetails();
    } else {
      // Use Redux for regular locations
      dispatch(fetchLocationById(id));
    }
  }, [dispatch, id]);

  // Function to fetch Google Place details directly
  const fetchGooglePlaceDetails = async (retryCount = 0) => {
    try {
      setLocalLoading(true);
      setLocalError(null);

      // Get API URL from environment configuration
      const { apiUrl } = getEnvVars();
      
      console.log(`Fetching location details from: ${apiUrl}/locations/${id}`);
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout
      
      const response = await fetch(`${apiUrl}/locations/${id}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      // Check content type to prevent JSON parsing errors
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Received non-JSON response:', text);
        throw new Error('Server returned non-JSON response');
      }
      
      // Safely parse JSON, catching any parsing errors
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('JSON Parse error:', parseError);
        throw new Error('Failed to parse server response. The server may have returned invalid JSON.');
      }

      if (data.status === 'success' && data.data && data.data.location) {
        console.log('Successfully loaded location data');
        setLocationData(data.data.location);
      } else {
        console.error('Invalid data format:', data);
        throw new Error(data.message || 'Invalid location data received');
      }
    } catch (error) {
      console.error('Error fetching Google Place details:', error);
      
      // Handle specific error types
      let errorMessage = 'Failed to load location details';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message.includes('Network request failed')) {
        errorMessage = 'Network connection error. Please check your internet connection.';
      }
      
      setLocalError(errorMessage);
      
      // Implement retry logic for network-related errors (up to 2 retries)
      if (retryCount < 2 && (error.name === 'AbortError' || error.message.includes('Network request failed'))) {
        console.log(`Retrying fetch (attempt ${retryCount + 1})...`);
        setTimeout(() => {
          fetchGooglePlaceDetails(retryCount + 1);
        }, 2000); // Wait 2 seconds before retrying
        return;
      }
    } finally {
      // Only set loading to false if we're not retrying
      setLocalLoading(false);
    }
  };

  useEffect(() => {
    // For normal locations, set the title and fetch nearby locations
    if (currentLocation) {
      // Set screen title
      navigation.setOptions({ 
        title: currentLocation.name,
        headerBackTitle: 'Map'
      });
      
      // Fetch nearby locations
      const [longitude, latitude] = currentLocation.location.coordinates;
      dispatch(fetchNearbyLocations({
        lat: latitude,
        lng: longitude,
        radius: 15, // 15km radius
        limit: 5
      }));
    }
  }, [currentLocation, dispatch, navigation]);

  // For Google Places, set the title
  useEffect(() => {
    if (locationData) {
      navigation.setOptions({
        title: locationData.name,
        headerBackTitle: 'Map'
      });
    }
  }, [locationData, navigation]);

  // Handle image press to open image viewer
  const handleImagePress = (index) => {
    setInitialImageIndex(index);
    setImageViewVisible(true);
  };

  // Format opening hours
  const formatOpeningHours = (openingHours) => {
    if (!openingHours) return 'Not available';
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    let formattedHours = [];
    
    // Group days with the same hours
    let currentGroup = {
      days: [],
      hours: null
    };
    
    days.forEach(day => {
      const dayHours = openingHours[day];
      if (!dayHours) return;
      
      const hoursString = dayHours.isOpen 
        ? `${dayHours.open || '00:00'} - ${dayHours.close || '00:00'}` 
        : 'Closed';
      
      if (currentGroup.hours === null) {
        // First day
        currentGroup.days.push(capitalizeFirstLetter(day));
        currentGroup.hours = hoursString;
      } else if (currentGroup.hours === hoursString) {
        // Same hours as previous day
        currentGroup.days.push(capitalizeFirstLetter(day));
      } else {
        // Different hours
        formattedHours.push(`${formatDayRange(currentGroup.days)}: ${currentGroup.hours}`);
        currentGroup = {
          days: [capitalizeFirstLetter(day)],
          hours: hoursString
        };
      }
    });
    
    // Add the last group
    if (currentGroup.days.length > 0) {
      formattedHours.push(`${formatDayRange(currentGroup.days)}: ${currentGroup.hours}`);
    }
    
    return formattedHours;
  };

  // Format day range (e.g., "Monday - Wednesday" or "Monday, Wednesday")
  const formatDayRange = (days) => {
    if (days.length === 7) return 'Everyday';
    if (days.length === 1) return days[0];
    
    // Check if days are consecutive
    const dayIndices = days.map(day => 
      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(day)
    ).sort((a, b) => a - b);
    
    let isConsecutive = true;
    for (let i = 1; i < dayIndices.length; i++) {
      if (dayIndices[i] !== dayIndices[i-1] + 1) {
        isConsecutive = false;
        break;
      }
    }
    
    if (isConsecutive) {
      return `${days[0]} - ${days[days.length - 1]}`;
    } else {
      return days.join(', ');
    }
  };

  // Helper function to capitalize first letter
  const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  // Format entrance fee
  const formatEntranceFee = (entranceFee) => {
    if (!entranceFee) return 'Not available';
    
    const { localPrice, foreignerPrice, currency, notes } = entranceFee;
    
    let feeString = '';
    
    if (localPrice === 0 && foreignerPrice === 0) {
      return 'Free entry';
    }
    
    if (localPrice !== undefined) {
      feeString += `Local: ${localPrice} ${currency || 'LKR'}`;
    }
    
    if (foreignerPrice !== undefined) {
      if (feeString) feeString += ' | ';
      feeString += `Foreigners: ${foreignerPrice} ${currency || 'LKR'}`;
    }
    
    return feeString;
  };

  // Open Google Maps directions
  const openDirections = () => {
    if (!currentLocation) return;
    
    const [longitude, latitude] = currentLocation.location.coordinates;
    const label = encodeURIComponent(currentLocation.name);
    const url = Platform.select({
      ios: `maps://app?daddr=${latitude},${longitude}&q=${label}`,
      android: `google.navigation:q=${latitude},${longitude}&q=${label}`
    });
    
    Linking.openURL(url).catch(err => 
      console.error('Error opening map directions:', err)
    );
  };

  // This handles both types of loading states
  if (loading || localLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading location details...</Text>
      </View>
    );
  }

  // This handles both types of errors
  if (error || localError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={colors.error} />
        <Text style={styles.errorText}>Error loading location</Text>
        <Text style={styles.errorMessage}>{error || localError}</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  // This handles both types of location data
  const location = locationData || currentLocation;

  if (!location) {
    return (
      <View style={styles.errorContainer}>
        <Text>Location not found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  // Prepare image data for image viewer based on what format we have
  let images = [];
  if (location.images && Array.isArray(location.images)) {
    images = location.images.map(img => ({ uri: img.url }));
  } else if (location.photos && Array.isArray(location.photos)) {
    images = location.photos.map(photo => ({ uri: photo.url }));
  }
  
  // Handle coordinates differently based on data source
  const latitude = location.latitude || (location.location ? location.location.coordinates[1] : null);
  const longitude = location.longitude || (location.location ? location.location.coordinates[0] : null);

  // Format opening hours based on what format we have
  const formattedHours = location.openingHours ? formatOpeningHours(location.openingHours) : 'Not available';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Image Gallery */}
      <ScrollView 
        horizontal 
        pagingEnabled 
        showsHorizontalScrollIndicator={false}
        style={styles.imageGallery}
      >
        {images.length > 0 ? (
          images.map((image, index) => (
            <TouchableOpacity 
              key={index} 
              onPress={() => handleImagePress(index)}
              activeOpacity={0.9}
            >
              <Image 
                source={{ uri: image.uri }} 
                style={styles.image} 
                resizeMode="cover"
              />
              {image.caption && (
                <View style={styles.captionContainer}>
                  <Text style={styles.caption}>{image.caption}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <Image 
            source={{ uri: 'https://via.placeholder.com/400x200?text=No+Image' }} 
            style={styles.image} 
            resizeMode="cover"
          />
        )}
      </ScrollView>

      {/* Location Type and Rating */}
      <View style={styles.headerRow}>
        <Chip icon="tag" mode="outlined" style={styles.typeChip}>
          {location.type ? capitalizeFirstLetter(location.type) : 
           location.category ? capitalizeFirstLetter(location.category) : 'Place'}
        </Chip>
        
        {location.rating > 0 && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color={colors.accent} />
            <Text style={styles.ratingText}>{location.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      {/* Map */}
      {latitude && longitude && (
        <View style={styles.mapContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={{
              latitude,
              longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker
              coordinate={{
                latitude,
                longitude,
              }}
              title={location.name}
            >
              <LocationMarker type={location.type || location.category || 'other'} />
            </Marker>
          </MapView>
        </View>
      )}
      
      {/* Open Directions Button */}
      <Button 
        mode="contained" 
        icon="directions" 
        onPress={() => {
          // Open Google Maps directions
          const label = encodeURIComponent(location.name);
          const url = Platform.select({
            ios: `maps://app?daddr=${latitude},${longitude}&q=${label}`,
            android: `google.navigation:q=${latitude},${longitude}`
          });
          
          Linking.openURL(url).catch(err => 
            console.error('Error opening map directions:', err)
          );
        }}
        style={styles.directionsButton}
      >
        Get Directions
      </Button>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>
          {location.description || 'No description available'}
        </Text>
      </View>

      <Divider style={styles.divider} />

      {/* Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Address</Text>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={20} color={colors.primary} style={styles.infoIcon} />
          <Text style={styles.infoText}>
            {location.address || 'Address not available'}
          </Text>
        </View>
      </View>

      {location.contact || location.website || (location.contactInfo && (location.contactInfo.phone || location.contactInfo.website)) ? (
        <>
          <Divider style={styles.divider} />
          
          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            
            {(location.contact || (location.contactInfo && location.contactInfo.phone)) && (
              <View style={styles.infoRow}>
                <Ionicons name="call" size={20} color={colors.primary} style={styles.infoIcon} />
                <Text 
                  style={[styles.infoText, styles.linkText]}
                  onPress={() => Linking.openURL(`tel:${location.contact || location.contactInfo.phone}`)}
                >
                  {location.contact || location.contactInfo.phone}
                </Text>
              </View>
            )}
            
            {(location.website || (location.contactInfo && location.contactInfo.website)) && (
              <View style={styles.infoRow}>
                <Ionicons name="globe" size={20} color={colors.primary} style={styles.infoIcon} />
                <Text 
                  style={[styles.infoText, styles.linkText]}
                  onPress={() => Linking.openURL(location.website || location.contactInfo.website)}
                  numberOfLines={1}
                >
                  {location.website || location.contactInfo.website}
                </Text>
              </View>
            )}
          </View>
        </>
      ) : null}

      {/* ImageViewer Component */}
      <ImageView
        images={images}
        imageIndex={initialImageIndex}
        visible={imageViewVisible}
        onRequestClose={() => setImageViewVisible(false)}
      />
    </ScrollView>
  );
};

// Helper function to get facility icon
const getFacilityIcon = (facility) => {
  switch (facility) {
    case 'parking':
      return <Ionicons name="car" size={20} color={colors.primary} />;
    case 'restrooms':
      return <FontAwesome5 name="toilet" size={20} color={colors.primary} />;
    case 'food':
      return <Ionicons name="restaurant" size={20} color={colors.primary} />;
    case 'drinkingWater':
      return <Ionicons name="water" size={20} color={colors.primary} />;
    case 'shops':
      return <Ionicons name="cart" size={20} color={colors.primary} />;
    case 'guides':
      return <Ionicons name="people" size={20} color={colors.primary} />;
    case 'firstAid':
      return <FontAwesome5 name="first-aid" size={20} color={colors.primary} />;
    case 'wifi':
      return <Ionicons name="wifi" size={20} color={colors.primary} />;
    default:
      return <Ionicons name="checkmark-circle" size={20} color={colors.primary} />;
  }
};

// Format facility name
const formatFacilityName = (facility) => {
  switch (facility) {
    case 'drinkingWater':
      return 'Drinking Water';
    case 'firstAid':
      return 'First Aid';
    default:
      return facility.charAt(0).toUpperCase() + facility.slice(1);
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textLight,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: spacing.md,
  },
  errorMessage: {
    textAlign: 'center',
    marginVertical: spacing.lg,
    color: colors.textLight,
  },
  imageGallery: {
    height: IMAGE_HEIGHT,
  },
  image: {
    width: width,
    height: IMAGE_HEIGHT,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  caption: {
    color: colors.background,
    fontSize: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  typeChip: {
    backgroundColor: 'transparent',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  locationName: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  address: {
    marginLeft: spacing.xs,
    color: colors.textLight,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  directionButton: {
    flex: 2,
    marginRight: spacing.sm,
  },
  shareButton: {
    flex: 1,
  },
  divider: {
    marginVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  description: {
    paddingHorizontal: spacing.lg,
    lineHeight: 22,
  },
  hoursText: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  notesText: {
    paddingHorizontal: spacing.lg,
    fontStyle: 'italic',
    color: colors.textLight,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  feeText: {
    paddingHorizontal: spacing.lg,
  },
  bestTimeRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  bestTimeLabel: {
    fontWeight: 'bold',
    width: 100,
  },
  bestTimeText: {
    flex: 1,
  },
  facilitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: spacing.md,
  },
  facilityText: {
    marginLeft: spacing.sm,
  },
  mapContainer: {
    marginHorizontal: spacing.lg,
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  fullMapButton: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  fullMapText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  nearbyScrollContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  nearbyCard: {
    width: 150,
    marginRight: spacing.md,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  nearbyImage: {
    width: '100%',
    height: 100,
  },
  nearbyInfo: {
    padding: spacing.sm,
  },
  nearbyName: {
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  nearbyDistance: {
    fontSize: 10,
    color: colors.textLight,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  contactText: {
    marginLeft: spacing.sm,
    color: colors.primary,
  },
  infoSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  infoText: {
    lineHeight: 20,
  },
  activitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
  },
  activityChip: {
    margin: spacing.xs,
    backgroundColor: colors.primaryLight,
  },
  activityChipText: {
    color: colors.background,
  },
  directionsButton: {
    flex: 1,
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: spacing.sm,
  },
  linkText: {
    color: colors.primary,
  },
});

export default LocationDetailScreen;