import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Keyboard,
} from 'react-native';
import { IconButton, Divider, Button } from 'react-native-paper';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

// Import theme and utilities
import { COLORS, FONTS } from '../../constants/theme';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

const LocationPicker = ({ onSelectLocation, onClose, initialLocation = null }) => {
  const mapRef = useRef(null);
  const searchInputRef = useRef(null);
  
  const [region, setRegion] = useState({
    latitude: 7.8731, // Center of Sri Lanka
    longitude: 80.7718,
    latitudeDelta: 2.5,
    longitudeDelta: 2.5,
  });
  
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recentLocations, setRecentLocations] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Get user's current location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status === 'granted') {
          setLoading(true);
          const location = await Location.getCurrentPositionAsync({});
          setLoading(false);
          
          const { latitude, longitude } = location.coords;
          setCurrentUserLocation({ latitude, longitude });
          
          // If no initial location, center map on user's location
          if (!initialLocation) {
            setRegion({
              latitude,
              longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            });
          }
        }
      } catch (error) {
        console.error("Error getting current location:", error);
        setLoading(false);
      }
    })();
  }, [initialLocation]);
  
  // Set initial location on map if provided
  useEffect(() => {
    if (initialLocation && initialLocation.coordinates) {
      const { latitude, longitude } = initialLocation.coordinates;
      
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      
      setSelectedLocation(initialLocation);
    }
  }, [initialLocation]);
  
  // Mock function for searching locations (in real app, connect to Google Places API)
  const searchLocations = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    try {
      // In a real app, this would be a call to Google Places API
      // For now, let's simulate a search with mock data
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      
      // Mock search results based on query
      const mockResults = [
        {
          id: '1',
          name: 'Temple of the Tooth Relic',
          address: 'Sri Dalada Veediya, Kandy, Sri Lanka',
          coordinates: {
            latitude: 7.2937,
            longitude: 80.6413,
          },
        },
        {
          id: '2',
          name: 'Sigiriya Rock Fortress',
          address: 'Sigiriya, Sri Lanka',
          coordinates: {
            latitude: 7.9572,
            longitude: 80.7603,
          },
        },
        {
          id: '3',
          name: 'Galle Fort',
          address: 'Galle, Sri Lanka',
          coordinates: {
            latitude: 6.0269,
            longitude: 80.2167,
          },
        },
        {
          id: '4',
          name: 'Yala National Park',
          address: 'Yala, Sri Lanka',
          coordinates: {
            latitude: 6.3724,
            longitude: 81.5160,
          },
        },
        {
          id: '5',
          name: 'Nine Arches Bridge',
          address: 'Ella, Sri Lanka',
          coordinates: {
            latitude: 6.8794,
            longitude: 81.0558,
          },
        },
      ];
      
      // Filter based on query
      const filtered = mockResults.filter(location => 
        location.name.toLowerCase().includes(query.toLowerCase()) ||
        location.address.toLowerCase().includes(query.toLowerCase())
      );
      
      setSearchResults(filtered);
    } catch (error) {
      console.error("Error searching locations:", error);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Debounce search to avoid too many API calls
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      searchLocations(searchQuery);
    }, 500);
    
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);
  
  // Handle region change on map
  const handleRegionChange = (newRegion) => {
    setRegion(newRegion);
  };
  
  // Handle map press to select a location
  const handleMapPress = async (event) => {
    const { coordinate } = event.nativeEvent;
    
    try {
      setLoading(true);
      
      // In a real app, you would use the Google Geocoding API here
      // to get the address information for the selected coordinates
      // For now, we'll create a mock response
      
      const mockGeocodingResult = {
        name: "Selected Location",
        address: `${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}`,
        coordinates: {
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
        },
      };
      
      setSelectedLocation(mockGeocodingResult);
      setLoading(false);
    } catch (error) {
      console.error("Error geocoding location:", error);
      setLoading(false);
    }
  };
  
  // Handle selecting a location from search results
  const handleSelectSearchResult = (location) => {
    setSelectedLocation(location);
    setSearchQuery('');
    Keyboard.dismiss();
    
    // Animate to selected location
    mapRef.current?.animateToRegion({
      latitude: location.coordinates.latitude,
      longitude: location.coordinates.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    
    // Add to recent locations (would be stored in AsyncStorage in a real app)
    const updatedRecents = [location, ...recentLocations.filter(item => item.id !== location.id)].slice(0, 5);
    setRecentLocations(updatedRecents);
  };
  
  // Move to user's current location
  const moveToCurrentLocation = () => {
    if (currentUserLocation) {
      mapRef.current?.animateToRegion({
        ...currentUserLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };
  
  // Render search result item
  const renderSearchResultItem = ({ item }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => handleSelectSearchResult(item)}
    >
      <MaterialCommunityIcons name="map-marker" size={24} color={COLORS.primary} />
      <View style={styles.searchResultTextContainer}>
        <Text style={styles.searchResultTitle}>{item.name}</Text>
        <Text style={styles.searchResultAddress}>{item.address}</Text>
      </View>
    </TouchableOpacity>
  );
  
  // Render recent location item
  const renderRecentLocationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.recentLocationItem}
      onPress={() => handleSelectSearchResult(item)}
    >
      <MaterialCommunityIcons name="history" size={20} color={COLORS.gray} />
      <View style={styles.recentLocationTextContainer}>
        <Text style={styles.recentLocationTitle}>{item.name}</Text>
        <Text style={styles.recentLocationAddress} numberOfLines={1}>{item.address}</Text>
      </View>
    </TouchableOpacity>
  );
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="close"
          size={24}
          onPress={onClose}
        />
        <Text style={styles.headerTitle}>Select Location</Text>
        <View style={{ width: 40 }} />
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color={COLORS.gray} style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search for a location"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Search Results */}
      {searchQuery.length > 0 && (
        <View style={styles.searchResultsContainer}>
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResultItem}
              keyExtractor={item => item.id}
              ItemSeparatorComponent={() => <Divider />}
            />
          ) : (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No locations found</Text>
            </View>
          )}
        </View>
      )}
      
      {/* Map View */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          region={region}
          onRegionChangeComplete={handleRegionChange}
          onPress={handleMapPress}
        >
          {selectedLocation && (
            <Marker
              coordinate={{
                latitude: selectedLocation.coordinates.latitude,
                longitude: selectedLocation.coordinates.longitude,
              }}
              title={selectedLocation.name}
              description={selectedLocation.address}
            />
          )}
        </MapView>
        
        {/* Current Location Button */}
        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={moveToCurrentLocation}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        
        {loading && (
          <View style={styles.mapLoadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        )}
      </View>
      
      {/* Recent Locations */}
      {searchQuery.length === 0 && recentLocations.length > 0 && (
        <View style={styles.recentLocationsContainer}>
          <Text style={styles.recentLocationsTitle}>Recent Locations</Text>
          <FlatList
            data={recentLocations}
            renderItem={renderRecentLocationItem}
            keyExtractor={item => item.id}
            ItemSeparatorComponent={() => <Divider />}
            scrollEnabled={false}
          />
        </View>
      )}
      
      {/* Selected Location */}
      {selectedLocation && (
        <View style={styles.selectedLocationContainer}>
          <View style={styles.selectedLocationInfo}>
            <Text style={styles.selectedLocationName}>{selectedLocation.name}</Text>
            <Text style={styles.selectedLocationAddress}>{selectedLocation.address}</Text>
          </View>
          <Button
            mode="contained"
            onPress={() => onSelectLocation(selectedLocation)}
            style={styles.confirmButton}
          >
            Confirm Location
          </Button>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  headerTitle: {
    ...FONTS.h3,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    ...FONTS.body3,
  },
  searchResultsContainer: {
    maxHeight: height * 0.4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  searchResultTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  searchResultTitle: {
    ...FONTS.body3Bold,
    marginBottom: 4,
  },
  searchResultAddress: {
    ...FONTS.body4,
    color: COLORS.gray,
  },
  loadingContainer: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...FONTS.body3,
    marginLeft: 8,
  },
  noResultsContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noResultsText: {
    ...FONTS.body3,
    color: COLORS.gray,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  currentLocationButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mapLoadingContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recentLocationsContainer: {
    padding: 16,
    maxHeight: height * 0.3,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  recentLocationsTitle: {
    ...FONTS.h4,
    marginBottom: 12,
  },
  recentLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recentLocationTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  recentLocationTitle: {
    ...FONTS.body3,
    marginBottom: 2,
  },
  recentLocationAddress: {
    ...FONTS.body4,
    color: COLORS.gray,
  },
  selectedLocationContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
  },
  selectedLocationInfo: {
    marginBottom: 12,
  },
  selectedLocationName: {
    ...FONTS.h3,
    marginBottom: 4,
  },
  selectedLocationAddress: {
    ...FONTS.body3,
    color: COLORS.gray,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
});

export default LocationPicker;