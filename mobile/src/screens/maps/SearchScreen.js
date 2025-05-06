import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Text, Searchbar, Chip, ActivityIndicator, Button, Divider } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { searchLocations, clearSearchResults, setCurrentPage } from '../../store/slices/locationsSlice';
import { colors, spacing } from '../../utils/themeUtils';
import LocationMarker from '../../components/maps/LocationMarker';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import getEnvVars from '../../env';

const { googleMapsApiKey } = getEnvVars();

const SearchScreen = ({ route, navigation }) => {
  const dispatch = useDispatch();
  const { searchResults, searchLoading, searchError, pagination } = useSelector((state) => state.locations);
  const [searchQuery, setSearchQuery] = useState(route.params?.query || '');
  const [selectedType, setSelectedType] = useState(null);
  const { types } = useSelector((state) => state.locations);
  
  // Google Places search state
  const [googlePlacesResults, setGooglePlacesResults] = useState([]);
  const [isGoogleSearchActive, setIsGoogleSearchActive] = useState(false);
  const [googleSearchLoading, setGoogleSearchLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [searchMode, setSearchMode] = useState('local'); // 'local' or 'google'
  const googleSearchTimeoutRef = useRef(null);
  
  // Initialize pagination if undefined
  useEffect(() => {
    // Ensure pagination is initialized when component mounts
    if (!pagination) {
      dispatch(setCurrentPage(1));
    }
  }, [dispatch]);
  
  // Get user location for nearby search
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }

      try {
        let location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        console.log('Error getting location:', error);
      }
    })();
  }, []);

  // Initial search from route params
  useEffect(() => {
    if (route.params?.query) {
      handleSearch(route.params.query);
    }
    
    // Clear search results when component unmounts
    return () => {
      dispatch(clearSearchResults());
      if (googleSearchTimeoutRef.current) {
        clearTimeout(googleSearchTimeoutRef.current);
      }
    };
  }, [dispatch, route.params]);

  // Handle local database search
  const handleSearch = (query = searchQuery) => {
    if (query.trim()) {
      // Reset to page 1 for new searches
      dispatch(setCurrentPage(1));
      dispatch(searchLocations({ 
        query,
        page: 1,
        limit: 20,
        type: selectedType
      }));
    }
  };
  
  // Handle Google Places search
  const handleGooglePlacesSearch = async (query = searchQuery) => {
    if (!query.trim()) {
      setGooglePlacesResults([]);
      return;
    }
    
    // Clear any existing timeout
    if (googleSearchTimeoutRef.current) {
      clearTimeout(googleSearchTimeoutRef.current);
    }
    
    // Set a timeout to prevent too many API calls
    googleSearchTimeoutRef.current = setTimeout(async () => {
      try {
        setGoogleSearchLoading(true);
        
        // Use Sri Lanka's approximate center coordinates if user location not available
        const sriLankaCenter = { latitude: 7.8731, longitude: 80.7718 };
        const location = userLocation || sriLankaCenter;
        
        // Get API URL from environment
        const { apiUrl } = getEnvVars();
        
        // Build API URL for our server proxy
        const url = `${apiUrl}/google/places/search`;
        
        // Add query parameters
        const params = new URLSearchParams({
          query: query,
          location: `${location.latitude},${location.longitude}`,
          radius: 50000 // 50km radius
        }).toString();
        
        console.log('Making request to Google Places API proxy:', `${url}?${params}`);
        
        const response = await fetch(`${url}?${params}`);
        const data = await response.json();
        
        if (data.status === 'success' && data.data.places) {
          console.log(`Found ${data.data.places.length} places`);
          setGooglePlacesResults(data.data.places);
        } else {
          console.log('Google Places API error:', data.message);
          // Fall back to mock data for testing if needed
          if (__DEV__) {
            const mockResults = generateMockPlaces(query, location);
            console.log('Using mock results instead');
            setGooglePlacesResults(mockResults);
          } else {
            setGooglePlacesResults([]);
          }
        }
      } catch (error) {
        console.error('Error fetching Google Places data:', error);
        // Fall back to mock data on error in development
        if (__DEV__) {
          const sriLankaCenter = { latitude: 7.8731, longitude: 80.7718 };
          const location = userLocation || sriLankaCenter;
          const mockResults = generateMockPlaces(query, location);
          console.log('Using mock results due to error');
          setGooglePlacesResults(mockResults);
        } else {
          setGooglePlacesResults([]);
        }
      } finally {
        setGoogleSearchLoading(false);
      }
    }, 500);
  };
  
  // Generate mock places for testing in development
  const generateMockPlaces = (query, location) => {
    // Create 5 mock places based on the query
    return Array(5).fill().map((_, i) => ({
      place_id: `mock-${i}-${Date.now()}`,
      name: `${query} Place ${i+1}`,
      geometry: {
        location: {
          lat: location.latitude + (Math.random() - 0.5) * 0.1,
          lng: location.longitude + (Math.random() - 0.5) * 0.1
        }
      },
      formatted_address: `${i+1} ${query} Road, Colombo, Sri Lanka`,
      types: ['tourist_attraction', 'point_of_interest'],
      rating: 3.5 + Math.random() * 1.5,
      photos: [{
        photo_reference: 'mock_photo',
        width: 400,
        height: 300
      }]
    }));
  };
  
  // Handle search input
  const handleSearchInput = (text) => {
    setSearchQuery(text);
    if (searchMode === 'google') {
      handleGooglePlacesSearch(text);
    }
  };
  
  // Toggle search mode
  const toggleSearchMode = (mode) => {
    setSearchMode(mode);
    if (mode === 'google' && searchQuery.trim()) {
      handleGooglePlacesSearch();
    } else if (mode === 'local' && searchQuery.trim()) {
      // Reset pagination when switching to local mode
      dispatch(setCurrentPage(1));
      handleSearch();
    }
  };

  // Filter by type
  const handleTypeSelect = (type) => {
    if (selectedType === type) {
      setSelectedType(null);
    } else {
      setSelectedType(type);
    }
    
    // If we have a search query, search with the new filter
    if (searchQuery.trim() && searchMode === 'local') {
      // Reset pagination to page 1 for new type filter
      dispatch(setCurrentPage(1));
      dispatch(searchLocations({ 
        query: searchQuery,
        page: 1,
        limit: 20,
        type: type === selectedType ? null : type
      }));
    }
  };

  // Load more results
  const handleLoadMore = () => {
    if (pagination && pagination.hasNext && !searchLoading) {
      const nextPage = pagination.currentPage + 1;
      dispatch(setCurrentPage(nextPage));
      dispatch(searchLocations({ 
        query: searchQuery,
        page: nextPage,
        limit: 20,
        type: selectedType
      }));
    }
  };
  
  // Handle Google Place selection
  const handlePlaceSelect = (place) => {
    // Navigate to map view with the selected place
    navigation.navigate('ExploreScreen', {
      selectedPlace: {
        name: place.name,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        placeId: place.place_id,
        address: place.formatted_address,
        photos: place.photos,
        rating: place.rating,
        types: place.types,
      }
    });
  };

  // Render Google Place item
  const renderGooglePlaceItem = ({ item }) => {
    // Get API URL from environment
    const { apiUrl } = getEnvVars();
    
    return (
      <TouchableOpacity
        style={styles.locationItem}
        onPress={() => handlePlaceSelect(item)}
      >
        <Image
          source={{ 
            uri: item.photos && item.photos.length > 0 
              ? `${apiUrl}/google/places/photo?photoreference=${item.photos[0].photo_reference}&maxwidth=100`
              : 'https://via.placeholder.com/100?text=No+Image'
          }}
          style={styles.locationImage}
        />
        <View style={styles.locationInfo}>
          <Text style={styles.locationName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.locationTypeRow}>
            <Ionicons name="location" size={14} color={colors.primary} />
            <Text style={styles.locationType}>
              {item.types && item.types.length > 0 
                ? item.types[0].replace(/_/g, ' ').charAt(0).toUpperCase() + item.types[0].replace(/_/g, ' ').slice(1)
                : 'Place'}
            </Text>
          </View>
          <Text style={styles.locationAddress} numberOfLines={2}>
            {item.formatted_address}
          </Text>
        </View>
        {item.rating > 0 && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color={colors.accent} />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render local location item
  const renderLocationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.locationItem}
      onPress={() => navigation.navigate('LocationDetail', { id: item._id })}
    >
      <Image
        source={{ 
          uri: item.images && item.images.length > 0 
            ? item.images[0].url 
            : 'https://via.placeholder.com/100?text=No+Image'
        }}
        style={styles.locationImage}
      />
      <View style={styles.locationInfo}>
        <Text style={styles.locationName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.locationTypeRow}>
          <LocationMarker type={item.type} size="small" />
          <Text style={styles.locationType}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </Text>
        </View>
        <Text style={styles.locationAddress} numberOfLines={1}>
          <Ionicons name="location" size={12} color={colors.primary} />
          {' '}{item.address.city}, Sri Lanka
        </Text>
        {item.shortDescription && (
          <Text style={styles.locationDescription} numberOfLines={2}>
            {item.shortDescription}
          </Text>
        )}
      </View>
      {item.averageRating > 0 && (
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={12} color={colors.accent} />
          <Text style={styles.ratingText}>{item.averageRating.toFixed(1)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      {searchQuery.trim() ? (
        <>
          <Ionicons name="search" size={64} color={colors.divider} />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>
            Try a different search term or filter
          </Text>
          {searchMode === 'local' && (
            <Button 
              mode="contained" 
              onPress={() => toggleSearchMode('google')}
              style={styles.switchButton}
            >
              Search on Google Maps instead
            </Button>
          )}
        </>
      ) : (
        <>
          <Ionicons name="search" size={64} color={colors.divider} />
          <Text style={styles.emptyTitle}>Search for locations</Text>
          <Text style={styles.emptySubtitle}>
            Enter a location name, type, or feature
          </Text>
        </>
      )}
    </View>
  );

  // Render footer (loading or load more button)
  const renderFooter = () => {
    if ((searchLoading && pagination && pagination.currentPage > 1) || googleSearchLoading) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.footerText}>Loading more...</Text>
        </View>
      );
    }
    
    if (searchMode === 'local' && pagination && pagination.hasNext) {
      return (
        <Button
          mode="text"
          onPress={handleLoadMore}
          style={styles.loadMoreButton}
        >
          Load More
        </Button>
      );
    }
    
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <Searchbar
          placeholder="Search locations..."
          onChangeText={handleSearchInput}
          value={searchQuery}
          onSubmitEditing={() => searchMode === 'google' ? handleGooglePlacesSearch() : handleSearch()}
          style={styles.searchBar}
          autoFocus={!route.params?.query}
        />
      </View>

      {/* Search Mode Toggle */}
      <View style={styles.searchModeContainer}>
        <TouchableOpacity
          style={[
            styles.searchModeButton,
            searchMode === 'local' && styles.activeSearchMode
          ]}
          onPress={() => toggleSearchMode('local')}
        >
          <Text style={[
            styles.searchModeText,
            searchMode === 'local' && styles.activeSearchModeText
          ]}>
            App Database
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.searchModeButton,
            searchMode === 'google' && styles.activeSearchMode
          ]}
          onPress={() => toggleSearchMode('google')}
        >
          <Text style={[
            styles.searchModeText,
            searchMode === 'google' && styles.activeSearchModeText
          ]}>
            Google Places
          </Text>
        </TouchableOpacity>
      </View>

      {/* Type Filters - Only show for local search */}
      {searchMode === 'local' && types && types.length > 0 && (
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {types.map((type) => (
              <Chip
                key={type}
                mode="outlined"
                selected={selectedType === type}
                onPress={() => handleTypeSelect(type)}
                style={[
                  styles.typeChip,
                  selectedType === type && styles.selectedTypeChip
                ]}
                textStyle={[
                  styles.typeChipText,
                  selectedType === type && styles.selectedTypeChipText
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Chip>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Search Results */}
      {searchMode === 'local' ? (
        // Local database search results
        <FlatList
          data={searchResults}
          renderItem={renderLocationItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.resultsContainer}
          ListEmptyComponent={!searchLoading && renderEmptyState()}
          ListFooterComponent={renderFooter()}
          onEndReached={() => pagination && pagination.hasNext && handleLoadMore()}
          onEndReachedThreshold={0.5}
          initialNumToRender={10}
        />
      ) : (
        // Google Places search results
        <>
          {googleSearchLoading && !googlePlacesResults.length ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Searching Google Places...</Text>
            </View>
          ) : (
            <FlatList
              data={googlePlacesResults}
              renderItem={renderGooglePlaceItem}
              keyExtractor={(item) => item.place_id}
              contentContainerStyle={styles.resultsContainer}
              ListEmptyComponent={!googleSearchLoading && renderEmptyState()}
              ListFooterComponent={renderFooter()}
              initialNumToRender={10}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBarContainer: {
    padding: spacing.medium,
    backgroundColor: colors.surface,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  searchBar: {
    elevation: 0,
    backgroundColor: colors.lightGrey,
  },
  searchModeContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  searchModeButton: {
    flex: 1,
    padding: spacing.medium,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeSearchMode: {
    borderBottomColor: colors.primary,
  },
  searchModeText: {
    color: colors.text,
    fontWeight: '500',
  },
  activeSearchModeText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  filtersContainer: {
    padding: spacing.small,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  typeChip: {
    margin: spacing.tiny,
    backgroundColor: 'transparent',
  },
  selectedTypeChip: {
    backgroundColor: colors.primary + '20',
  },
  typeChipText: {
    fontSize: 12,
  },
  selectedTypeChipText: {
    color: colors.primary,
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
  resultsContainer: {
    padding: spacing.medium,
    paddingBottom: spacing.large,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.large,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: spacing.medium,
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.small,
    color: colors.textSecondary,
  },
  locationItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: spacing.medium,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  locationImage: {
    width: 100,
    height: 100,
    backgroundColor: colors.lightGrey,
  },
  locationInfo: {
    flex: 1,
    padding: spacing.medium,
  },
  locationName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  locationTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationType: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  locationAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  locationDescription: {
    fontSize: 12,
    color: colors.text,
    marginTop: 4,
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.ratingBg,
    borderRadius: 4,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.accent,
    marginLeft: 2,
  },
  footerLoader: {
    padding: spacing.medium,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    marginLeft: spacing.small,
    color: colors.textSecondary,
  },
  loadMoreButton: {
    alignSelf: 'center',
    marginVertical: spacing.medium,
  },
  switchButton: {
    marginTop: spacing.large,
  }
});

export default SearchScreen;