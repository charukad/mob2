import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Animated, Platform, ScrollView, Text, Modal } from 'react-native';
import { Text as PaperText, Searchbar, Chip, FAB, ActivityIndicator } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { fetchLocations, fetchNearbyLocations, fetchLocationCategories } from '../../store/slices/locationsSlice';
import { colors, spacing } from '../../utils/themeUtils';
import LocationMarker from '../../components/maps/LocationMarker';
import BottomSheet from '../../components/maps/BottomSheet';
import FallbackMap from '../../components/maps/FallbackMap';
import GooglePlaceDetail from '../../components/maps/GooglePlaceDetail';
import MapTest from '../../components/maps/MapTest';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Initial region (Sri Lanka)
const initialRegion = {
  latitude: 7.8731,
  longitude: 80.7718,
  latitudeDelta: 3.0,
  longitudeDelta: 3.0 * ASPECT_RATIO,
};

// Helper function to check if Google Maps is available
const isGoogleMapsAvailable = () => {
  // We want to use Google Maps on all platforms
  return true;
};

const ExploreScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { locations, loading, error, categories, types } = useSelector((state) => state.locations);
  const [region, setRegion] = useState(initialRegion);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapError, setMapError] = useState(false);
  const mapRef = useRef(null);
  const bottomSheetHeight = useRef(new Animated.Value(0)).current;
  
  // Google Places state
  const [selectedGooglePlace, setSelectedGooglePlace] = useState(null);
  const [googlePlaceMarker, setGooglePlaceMarker] = useState(null);
  const [googlePlaceDetailVisible, setGooglePlaceDetailVisible] = useState(false);

  // Request location permission
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status === 'granted') {
        try {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          
          // Get nearby locations
          dispatch(fetchNearbyLocations({
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            radius: 50, // 50km radius
            limit: 20
          }));
        } catch (error) {
          console.error('Error getting current position:', error);
        }
      }
    })();
  }, [dispatch]);

  // Fetch locations and categories
  useEffect(() => {
    dispatch(fetchLocations({ limit: 50 }));
    dispatch(fetchLocationCategories());
  }, [dispatch]);
  
  // Handle Google Place from search screen
  useEffect(() => {
    if (route.params?.selectedPlace) {
      const place = route.params.selectedPlace;
      
      // Set the selected Google Place
      setSelectedGooglePlace(place);
      
      // Create a marker for the place
      setGooglePlaceMarker({
        latitude: place.latitude,
        longitude: place.longitude,
        title: place.name,
        placeId: place.placeId,
      });
      
      // Animate to the place location
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: place.latitude,
          longitude: place.longitude,
          latitudeDelta: LATITUDE_DELTA / 8,
          longitudeDelta: LONGITUDE_DELTA / 8,
        }, 500);
      }
      
      // Show the place details
      setGooglePlaceDetailVisible(true);
    }
  }, [route.params?.selectedPlace]);

  // Handle search
  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigation.navigate('Search', { query: searchQuery.trim() });
    }
  };

  // Filter locations by category
  const handleCategorySelect = (category) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
      dispatch(fetchLocations({ limit: 50 }));
    } else {
      setSelectedCategory(category);
      dispatch(fetchLocations({ category, limit: 50 }));
    }
  };

  // Handle marker press
  const handleMarkerPress = (location) => {
    setSelectedLocation(location);
    setBottomSheetVisible(true);
    
    // Animate to marker location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.location.coordinates[1],
        longitude: location.location.coordinates[0],
        latitudeDelta: LATITUDE_DELTA / 2,
        longitudeDelta: LONGITUDE_DELTA / 2,
      }, 500);
    }
    
    // Animate bottom sheet
    Animated.timing(bottomSheetHeight, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };
  
  // Handle Google Place marker press
  const handleGooglePlaceMarkerPress = () => {
    if (selectedGooglePlace) {
      setGooglePlaceDetailVisible(true);
    }
  };

  // Handle bottom sheet close
  const handleCloseBottomSheet = () => {
    Animated.timing(bottomSheetHeight, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setBottomSheetVisible(false);
      setSelectedLocation(null);
    });
  };
  
  // Handle Google Place detail close
  const handleCloseGooglePlaceDetail = () => {
    setGooglePlaceDetailVisible(false);
  };

  // Go to user location
  const goToUserLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: LATITUDE_DELTA / 4,
        longitudeDelta: LONGITUDE_DELTA / 4,
      }, 500);
    }
  };

  // View location details
  const viewLocationDetails = () => {
    if (selectedLocation) {
      navigation.navigate('LocationDetail', { id: selectedLocation._id });
    }
  };

  // Handle map error
  const handleMapError = (error) => {
    console.error('Map error:', error);
    setMapError(true);
  };

  // Test if Google Maps is working - disabled by default now
  const [showMapTest, setShowMapTest] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Determine which map provider to use
  const mapProvider = isGoogleMapsAvailable() ? PROVIDER_GOOGLE : null;

  useEffect(() => {
    // Track when the MapTest component is closed
    if (!showMapTest && retryCount === 0) {
      // This is the first time the user closed the MapTest
      setRetryCount(1);
    }
  }, [showMapTest]);

  if (showMapTest) {
    return <MapTest onClose={() => setShowMapTest(false)} />;
  }

  return (
    <View style={styles.container}>
      {/* Map View */}
      {!mapError ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={mapProvider}
          initialRegion={initialRegion}
          showsUserLocation={locationPermission}
          showsMyLocationButton={false}
          showsCompass={true}
          onRegionChangeComplete={setRegion}
          loadingEnabled={true}
          loadingIndicatorColor={colors.primary}
          loadingBackgroundColor={colors.background}
          onError={handleMapError}
        >
          {/* App locations markers */}
          {locations.map((location) => (
            <Marker
              key={location._id}
              coordinate={{
                latitude: location.location.coordinates[1],
                longitude: location.location.coordinates[0],
              }}
              onPress={() => handleMarkerPress(location)}
            >
              <LocationMarker type={location.type} />
              <Callout tooltip>
                <View style={styles.callout}>
                  <PaperText style={styles.calloutTitle}>{location.name}</PaperText>
                  <PaperText style={styles.calloutSubtitle}>
                    {location.location && location.location.city ? location.location.city : 'Sri Lanka'}
                  </PaperText>
                </View>
              </Callout>
            </Marker>
          ))}
          
          {/* Google Place marker if available */}
          {googlePlaceMarker && (
            <Marker
              coordinate={{
                latitude: googlePlaceMarker.latitude,
                longitude: googlePlaceMarker.longitude,
              }}
              title={googlePlaceMarker.title}
              pinColor="#4285F4" // Google blue color
              onPress={handleGooglePlaceMarkerPress}
            >
              <View style={styles.googleMarker}>
                <Ionicons name="location" size={30} color="#4285F4" />
                <View style={styles.googleMarkerDot} />
              </View>
              <Callout tooltip>
                <View style={styles.callout}>
                  <PaperText style={styles.calloutTitle}>{googlePlaceMarker.title}</PaperText>
                  <PaperText style={styles.calloutSubtitle}>
                    From Google Maps
                  </PaperText>
                </View>
              </Callout>
            </Marker>
          )}
        </MapView>
      ) : (
        <FallbackMap onRetry={() => setMapError(false)} />
      )}

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <Searchbar
          placeholder="Search locations..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          onSubmitEditing={handleSearch}
          style={styles.searchBar}
          icon="magnify"
          clearIcon="close"
        />
      </View>

      {/* Category Filter */}
      {categories && categories.length > 0 && (
        <View style={styles.categoryContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((category) => (
              <Chip
                key={category._id}
                mode="outlined"
                selected={selectedCategory === category._id}
                onPress={() => handleCategorySelect(category._id)}
                style={styles.categoryChip}
                textStyle={styles.categoryChipText}
              >
                {category.name}
              </Chip>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Location Bottom Sheet */}
      {bottomSheetVisible && selectedLocation && (
        <BottomSheet
          height={bottomSheetHeight}
          location={selectedLocation}
          onClose={handleCloseBottomSheet}
          onViewDetails={viewLocationDetails}
        />
      )}

      {/* Google Place Detail Modal */}
      <Modal
        visible={googlePlaceDetailVisible}
        animationType="slide"
        onRequestClose={handleCloseGooglePlaceDetail}
        transparent={false}
      >
        {selectedGooglePlace && (
          <GooglePlaceDetail
            place={selectedGooglePlace}
            onClose={handleCloseGooglePlaceDetail}
          />
        )}
      </Modal>

      {/* FAB for location */}
      <FAB
        style={styles.locationFab}
        icon="crosshairs-gps"
        onPress={goToUserLocation}
        disabled={!userLocation}
      />

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  searchBarContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.medium,
    zIndex: 1,
  },
  searchBar: {
    elevation: 4,
    borderRadius: 8,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  categoryContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.medium,
    marginBottom: spacing.small,
    zIndex: 1,
  },
  categoryChip: {
    margin: 4,
    backgroundColor: colors.surface,
  },
  categoryChipText: {
    color: colors.text,
  },
  callout: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.small,
    minWidth: 120,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  calloutSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  locationFab: {
    position: 'absolute',
    right: spacing.medium,
    bottom: 100,
    backgroundColor: colors.surface,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 2,
  },
  googleMarker: {
    alignItems: 'center',
  },
  googleMarkerDot: {
    width: 8,
    height: 8,
    backgroundColor: 'white',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#4285F4',
    position: 'absolute',
    bottom: 4,
  }
});

export default ExploreScreen;