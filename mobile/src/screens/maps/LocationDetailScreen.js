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

const { width } = Dimensions.get('window');
const ASPECT_RATIO = 16 / 9;
const IMAGE_HEIGHT = width / ASPECT_RATIO;

const LocationDetailScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const dispatch = useDispatch();
  const { currentLocation, loading, error, nearbyLocations } = useSelector((state) => state.locations);
  const [imageViewVisible, setImageViewVisible] = useState(false);
  const [initialImageIndex, setInitialImageIndex] = useState(0);

  useEffect(() => {
    dispatch(fetchLocationById(id));
  }, [dispatch, id]);

  useEffect(() => {
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading location details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={colors.error} />
        <Text style={styles.errorText}>Error loading location</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  if (!currentLocation) {
    return (
      <View style={styles.errorContainer}>
        <Text>Location not found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  // Prepare image data for image viewer
  const images = currentLocation.images.map(img => ({ uri: img.url }));
  
  // Format opening hours
  const formattedHours = formatOpeningHours(currentLocation.openingHours);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Image Gallery */}
      <ScrollView 
        horizontal 
        pagingEnabled 
        showsHorizontalScrollIndicator={false}
        style={styles.imageGallery}
      >
        {currentLocation.images.map((image, index) => (
          <TouchableOpacity 
            key={index} 
            onPress={() => handleImagePress(index)}
            activeOpacity={0.9}
          >
            <Image 
              source={{ uri: image.url }} 
              style={styles.image} 
              resizeMode="cover"
            />
            {image.caption && (
              <View style={styles.captionContainer}>
                <Text style={styles.caption}>{image.caption}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Location Type and Rating */}
      <View style={styles.headerRow}>
        <Chip icon="tag" mode="outlined" style={styles.typeChip}>
          {capitalizeFirstLetter(currentLocation.type)}
        </Chip>
        
        {currentLocation.averageRating > 0 && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color={colors.accent} />
            <Text style={styles.rating}>
              {currentLocation.averageRating.toFixed(1)}
            </Text>
            <Text style={styles.reviewCount}>
              ({currentLocation.reviewCount} reviews)
            </Text>
          </View>
        )}
      </View>

      {/* Location Name and Address */}
      <Text style={styles.locationName}>{currentLocation.name}</Text>
      <View style={styles.addressRow}>
        <Ionicons name="location" size={18} color={colors.primary} />
        <Text style={styles.address}>
          {currentLocation.address.city}
          {currentLocation.address.state && `, ${currentLocation.address.state}`}, Sri Lanka
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button 
          mode="contained" 
          icon="directions" 
          onPress={openDirections}
          style={styles.directionButton}
        >
          Directions
        </Button>
        <Button 
          mode="outlined" 
          icon="share-variant" 
          style={styles.shareButton}
        >
          Share
        </Button>
      </View>

      <Divider style={styles.divider} />

      {/* Description */}
      <Text style={styles.sectionTitle}>Description</Text>
      <Text style={styles.description}>{currentLocation.description}</Text>

      {/* Opening Hours */}
      <Text style={styles.sectionTitle}>Opening Hours</Text>
      {Array.isArray(formattedHours) ? (
        formattedHours.map((hours, index) => (
          <Text key={index} style={styles.hoursText}>{hours}</Text>
        ))
      ) : (
        <Text style={styles.hoursText}>{formattedHours}</Text>
      )}
      {currentLocation.openingHours && currentLocation.openingHours.notes && (
        <Text style={styles.notesText}>{currentLocation.openingHours.notes}</Text>
      )}

      {/* Entrance Fee */}
      <Text style={styles.sectionTitle}>Entrance Fee</Text>
      <Text style={styles.feeText}>
        {formatEntranceFee(currentLocation.entranceFee)}
      </Text>
      {currentLocation.entranceFee && currentLocation.entranceFee.notes && (
        <Text style={styles.notesText}>{currentLocation.entranceFee.notes}</Text>
      )}

      {/* Best Time to Visit */}
      {currentLocation.bestTimeToVisit && (
        <>
          <Text style={styles.sectionTitle}>Best Time to Visit</Text>
          {currentLocation.bestTimeToVisit.months && currentLocation.bestTimeToVisit.months.length > 0 && (
            <View style={styles.bestTimeRow}>
              <Text style={styles.bestTimeLabel}>Months:</Text>
              <Text style={styles.bestTimeText}>
                {currentLocation.bestTimeToVisit.months.map(capitalizeFirstLetter).join(', ')}
              </Text>
            </View>
          )}
          {currentLocation.bestTimeToVisit.timeOfDay && currentLocation.bestTimeToVisit.timeOfDay.length > 0 && (
            <View style={styles.bestTimeRow}>
              <Text style={styles.bestTimeLabel}>Time of day:</Text>
              <Text style={styles.bestTimeText}>
                {currentLocation.bestTimeToVisit.timeOfDay.map(capitalizeFirstLetter).join(', ')}
              </Text>
            </View>
          )}
          {currentLocation.bestTimeToVisit.notes && (
            <Text style={styles.notesText}>{currentLocation.bestTimeToVisit.notes}</Text>
          )}
        </>
      )}

      {/* Facilities */}
      {currentLocation.facilities && currentLocation.facilities.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Facilities</Text>
          <View style={styles.facilitiesContainer}>
            {currentLocation.facilities.map((facility, index) => (
              <View key={index} style={styles.facilityItem}>
                {getFacilityIcon(facility)}
                <Text style={styles.facilityText}>
                  {formatFacilityName(facility)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Map */}
      <Text style={styles.sectionTitle}>Location</Text>
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: currentLocation.location.coordinates[1],
            longitude: currentLocation.location.coordinates[0],
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          <Marker
            coordinate={{
              latitude: currentLocation.location.coordinates[1],
              longitude: currentLocation.location.coordinates[0],
            }}
          >
            <LocationMarker type={currentLocation.type} size="large" />
          </Marker>
        </MapView>
        <TouchableOpacity 
          style={styles.fullMapButton}
          onPress={() => navigation.navigate('ExploreMap', {
            latitude: currentLocation.location.coordinates[1],
            longitude: currentLocation.location.coordinates[0],
          })}
        >
          <Text style={styles.fullMapText}>View on Full Map</Text>
        </TouchableOpacity>
      </View>

      {/* Nearby Locations */}
      {nearbyLocations.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Nearby Attractions</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.nearbyScrollContainer}
          >
            {nearbyLocations
  .filter(location => location._id !== currentLocation._id)
  .map(location => (
    <TouchableOpacity 
      key={location._id}
      style={styles.nearbyCard}
      onPress={() => {
        navigation.replace('LocationDetail', { id: location._id });
      }}
    >
      <Image 
        source={{ 
          uri: location.images && location.images.length > 0 
            ? location.images[0].url 
            : 'https://via.placeholder.com/100?text=No+Image'
        }} 
        style={styles.nearbyImage} 
      />
      <View style={styles.nearbyInfo}>
        <Text style={styles.nearbyName} numberOfLines={2}>{location.name}</Text>
        <Text style={styles.nearbyDistance}>
          <Ionicons name="location" size={12} color={colors.primary} />
          {' '}{location.address.city}
        </Text>
      </View>
    </TouchableOpacity>
  ))}
</ScrollView>
</>
)}

{/* Contact Information */}
{currentLocation.contactInfo && (
  <>
    <Text style={styles.sectionTitle}>Contact Information</Text>
    {currentLocation.contactInfo.phone && (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => Linking.openURL(`tel:${currentLocation.contactInfo.phone}`)}
      >
        <Ionicons name="call" size={18} color={colors.primary} />
        <Text style={styles.contactText}>{currentLocation.contactInfo.phone}</Text>
      </TouchableOpacity>
    )}
    {currentLocation.contactInfo.email && (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => Linking.openURL(`mailto:${currentLocation.contactInfo.email}`)}
      >
        <Ionicons name="mail" size={18} color={colors.primary} />
        <Text style={styles.contactText}>{currentLocation.contactInfo.email}</Text>
      </TouchableOpacity>
    )}
    {currentLocation.contactInfo.website && (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => Linking.openURL(currentLocation.contactInfo.website)}
      >
        <Ionicons name="globe" size={18} color={colors.primary} />
        <Text style={styles.contactText}>{currentLocation.contactInfo.website}</Text>
      </TouchableOpacity>
    )}
  </>
)}

{/* Historical or Cultural Information */}
{(currentLocation.historicalInfo || currentLocation.culturalSignificance) && (
  <>
    <Text style={styles.sectionTitle}>Historical & Cultural Information</Text>
    {currentLocation.historicalInfo && (
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Historical Background</Text>
        <Text style={styles.infoText}>{currentLocation.historicalInfo}</Text>
      </View>
    )}
    {currentLocation.culturalSignificance && (
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Cultural Significance</Text>
        <Text style={styles.infoText}>{currentLocation.culturalSignificance}</Text>
      </View>
    )}
  </>
)}

{/* Activities */}
{currentLocation.activities && currentLocation.activities.length > 0 && (
  <>
    <Text style={styles.sectionTitle}>Activities</Text>
    <View style={styles.activitiesContainer}>
      {currentLocation.activities.map((activity, index) => (
        <Chip
          key={index}
          style={styles.activityChip}
          textStyle={styles.activityChipText}
        >
          {capitalizeFirstLetter(activity)}
        </Chip>
      ))}
    </View>
  </>
)}

{/* Image Viewer Modal */}
<ImageView
  images={images}
  imageIndex={initialImageIndex}
  visible={imageViewVisible}
  onRequestClose={() => setImageViewVisible(false)}
  swipeToCloseEnabled={true}
  doubleTapToZoomEnabled={true}
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
  rating: {
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  reviewCount: {
    color: colors.textLight,
    fontSize: 12,
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
});

export default LocationDetailScreen;