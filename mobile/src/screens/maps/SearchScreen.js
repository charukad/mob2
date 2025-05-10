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
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';

const { googleMapsApiKey } = getEnvVars();

const SearchScreen = ({ route, navigation }) => {
  const dispatch = useDispatch();
  const { searchResults, searchLoading, searchError, pagination } = useSelector((state) => state.locations);
  const [searchQuery, setSearchQuery] = useState(route.params?.query || '');
  const [selectedType, setSelectedType] = useState(null);
  const { types } = useSelector((state) => state.locations);
  
  // Validate Google Maps API key
  const [isGoogleKeyValid, setIsGoogleKeyValid] = useState(true);
  
  useEffect(() => {
    // Check if Google Maps API key is valid (not empty and properly formatted)
    const isValid = googleMapsApiKey && 
                    !googleMapsApiKey.includes('YOUR_GOOGLE_MAPS_API_KEY') && 
                    googleMapsApiKey.length >= 10;
                    
    if (!isValid) {
      console.error('Invalid Google Maps API key:', googleMapsApiKey);
      setIsGoogleKeyValid(false);
    } else {
      console.log('Google Maps API key appears valid:', googleMapsApiKey.substring(0, 5) + '...');
      setIsGoogleKeyValid(true);
    }
  }, [googleMapsApiKey]);
  
  // Google Places search state
  const [googlePlacesResults, setGooglePlacesResults] = useState([]);
  const [googleSearchLoading, setGoogleSearchLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [showMapForGooglePlaces, setShowMapForGooglePlaces] = useState(false);
  const googleSearchTimeoutRef = useRef(null);
  const mapRef = useRef(null);
  
  // Debugging state
  const [showDebug, setShowDebug] = useState(__DEV__); // Only show in development by default
  
  // Predefined category terms for enhanced search
  const categoryTerms = ['adventure', 'cultural', 'historical', 'beach', 'food', 'wildlife'];
  
  // Add a state to store shared results between tabs
  const [sharedSearchResults, setSharedSearchResults] = useState([]);
  
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
  
  // Initialize map with default locations or search results
  useEffect(() => {
    // Center map based on search results
    const timer = setTimeout(() => {
      // Skip if mapRef is not initialized
      if (!mapRef || !mapRef.current) {
        console.log('Map reference not ready yet, skipping map centering');
        return;
      }

      let locationsToShow = sharedSearchResults && sharedSearchResults.length > 0
        ? sharedSearchResults
        : [];
      
      // Center map on the appropriate locations
      if (locationsToShow.length > 0) {
        // Find the average of all coordinates to center the map
        let totalLat = 0;
        let totalLng = 0;
        let validLocations = 0;
        
        locationsToShow.forEach(location => {
          if (location.coordinates && 
              typeof location.coordinates.latitude === 'number' && 
              typeof location.coordinates.longitude === 'number') {
            totalLat += location.coordinates.latitude;
            totalLng += location.coordinates.longitude;
            validLocations++;
          }
        });
        
        if (validLocations > 0 && mapRef.current) {
          try {
            mapRef.current.animateToRegion({
              latitude: totalLat / validLocations,
              longitude: totalLng / validLocations,
              latitudeDelta: 1.0,
              longitudeDelta: 1.0,
            });
            console.log('Map centered successfully on search results');
          } catch (error) {
            console.error('Error animating map region:', error);
          }
        } else if (mapRef.current) {
          // If no valid locations, center on Sri Lanka
          try {
            mapRef.current.animateToRegion({
              latitude: 7.8731, // Sri Lanka center
              longitude: 80.7718,
              latitudeDelta: 3.0,
              longitudeDelta: 3.0,
            });
            console.log('Map centered on Sri Lanka default location');
          } catch (error) {
            console.error('Error animating map to default region:', error);
          }
        }
      }
    }, 1000); // Increased timeout to 1000ms to ensure the map is fully loaded
    
    return () => clearTimeout(timer);
  }, [sharedSearchResults]);

  // Initial search from route params
  useEffect(() => {
    if (route.params?.query) {
      // Always use Google Places search
      handleGooglePlacesSearch(route.params.query);
    }
    
    // Clear search results when component unmounts
    return () => {
      dispatch(clearSearchResults());
      if (googleSearchTimeoutRef.current) {
        clearTimeout(googleSearchTimeoutRef.current);
      }
    };
  }, [route.params]);

  // Handle local database search
  const handleSearch = (query = searchQuery) => {
    if (query.trim()) {
      console.log('Performing local search for:', query);
      
      // Reset to page 1 for new searches
      dispatch(setCurrentPage(1));
      
      // Log the filter type if selected
      if (selectedType) {
        console.log('Filtering by type:', selectedType);
      }
      
      // Search with current parameters
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
      setSharedSearchResults([]); // Clear shared results
      return;
    }
    
    // Validate API key again before making requests
    if (!googleMapsApiKey || googleMapsApiKey.includes('YOUR_GOOGLE_MAPS_API_KEY') || googleMapsApiKey.length < 10) {
      console.error('Invalid Google Maps API key for Places search');
      // Update shared results with empty array to clear loading state
      setGoogleSearchLoading(false);
      setGooglePlacesResults([]);
      setSharedSearchResults([]);
      return; // Don't proceed with the search
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
        
        // Get API URL and Google Maps API key from environment
        const { apiUrl, googleMapsApiKey: mapApiKey } = getEnvVars();
        
        // Validate API key again since we're in an async context
        if (!mapApiKey || mapApiKey.includes('YOUR_GOOGLE_MAPS_API_KEY') || mapApiKey.length < 10) {
          throw new Error('Google Maps API key not configured');
        }
        
        // Build API URL for our server proxy
        const url = `${apiUrl}/google/places/search`;
        
        // Enhance query for category terms by adding "in Sri Lanka"
        let enhancedQuery = query;
        if (categoryTerms.includes(query.toLowerCase())) {
          enhancedQuery = `${query} places in Sri Lanka`;
        }
        
        // Add query parameters
        const params = new URLSearchParams({
          query: enhancedQuery,
          location: `${location.latitude},${location.longitude}`,
          radius: 50000 // 50km radius
        }).toString();
        
        console.log('Making request to Google Places API proxy:', `${url}?${params}`);
        
        // Add timeout to the fetch request to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout (increased from 10)
        
        // Try direct Google Places API as fallback if server proxy fails
        let useDirectApi = false;
        let response;
        
        try {
          response = await fetch(`${url}?${params}`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        } catch (proxyError) {
          console.log('Proxy API failed, trying direct Google API:', proxyError);
          useDirectApi = true;
        }
        
        // If proxy failed or returned error, try direct Google Places API
        if (useDirectApi || (response && !response.ok)) {
          const directUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
          const directParams = new URLSearchParams({
            query: enhancedQuery,
            location: `${location.latitude},${location.longitude}`,
            radius: 50000,
            key: mapApiKey,
            region: 'lk' // Sri Lanka region bias
          }).toString();
          
          console.log('Trying direct Google Places API:', `${directUrl}?${directParams.replace(mapApiKey, 'API_KEY_HIDDEN')}`);
          
          response = await fetch(`${directUrl}?${directParams}`, {
            signal: controller.signal
          });
        }
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('Received non-JSON response:', text);
          throw new Error('Received non-JSON response');
        }
        
        const data = await response.json();
        
        // Handle response format based on whether we used proxy or direct API
        let places = [];
        
        if (useDirectApi) {
          // Direct Google API response format
          if (data.status === 'OK' && data.results) {
            console.log(`Found ${data.results.length} places from direct API`);
            places = data.results;
            setGooglePlacesResults(data.results);
          } else {
            console.log('Google Places API error:', data.status || 'Unknown error');
            throw new Error(`Google API error: ${data.status || 'Unknown error'}`);
          }
        } else {
          // Our server proxy response format
        if (data.status === 'success' && data.data && data.data.places) {
            console.log(`Found ${data.data.places.length} places from proxy`);
            places = data.data.places;
          setGooglePlacesResults(data.data.places);
        } else {
          console.log('Google Places API error:', data.message || 'Unknown error');
            throw new Error(data.message || 'Unknown error');
          }
        }
        
        // Convert Google Places results to a format compatible with map markers
        const formattedPlaces = places.map(place => ({
          _id: place.place_id || `place-${Math.random().toString(36).substr(2, 9)}`,
          name: place.name,
          type: place.types && place.types.length > 0 ? place.types[0].replace(/_/g, ' ') : 'place',
          coordinates: {
            latitude: place.geometry?.location?.lat,
            longitude: place.geometry?.location?.lng
          },
          address: {
            city: extractCity(place.formatted_address || ''),
            province: 'Sri Lanka'
          },
          averageRating: place.rating || 0,
          images: place.photos ? [{ url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${mapApiKey}` }] : []
        }));
        
        // Save the formatted places for the map view
        setSharedSearchResults(formattedPlaces);
        console.log(`Formatted ${formattedPlaces.length} Google Places results for map view`);
        
        // Once we have results, automatically show the map view
        if (formattedPlaces.length > 0) {
          setShowMapForGooglePlaces(true);
          }
        
      } catch (error) {
        console.error('Error fetching Google Places data:', error);
        
        // Handle specific network errors
        let errorMessage = 'Error fetching data';
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out';
        } else if (error.message.includes('Network request failed')) {
          errorMessage = 'Network connection error';
        } else if (error.message.includes('Google Maps API key not configured')) {
          errorMessage = 'Google Maps API key not configured';
        }
        
        console.log(errorMessage);
          setGooglePlacesResults([]);
        setSharedSearchResults([]); // Clear shared results on error
      } finally {
        setGoogleSearchLoading(false);
      }
    }, 500);
  };
  
  // Helper function to extract city from formatted address
  const extractCity = (address) => {
    // Simple extraction logic - can be improved
    const parts = address.split(',');
    if (parts.length > 1) {
      return parts[parts.length - 2].trim();
    }
    return 'Sri Lanka';
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
    // Always use Google Places search
    handleGooglePlacesSearch(text);
  };
  
  // Filter by type - updated for Google search only
  const handleTypeSelect = (type) => {
    if (selectedType === type) {
      setSelectedType(null);
    } else {
      setSelectedType(type);
    }
    
    // If we have a search query, search with the new filter
    if (searchQuery.trim()) {
      // Add type filtering to Google Places search
      handleGooglePlacesSearch(searchQuery);
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
    // Create a place object with the necessary details for display on the map
    const selectedPlace = {
      placeId: place.place_id,
      name: place.name,
      latitude: place.geometry?.location?.lat || 0,
      longitude: place.geometry?.location?.lng || 0,
      // Add other relevant details that might be needed
      address: place.formatted_address,
      rating: place.rating,
      types: place.types,
      photos: place.photos || [],
    };
    
    // Check if we have a place selection callback from the local itinerary
    if (route.params?.onPlaceSelected) {
      // Call the callback with the selected place
      route.params.onPlaceSelected(selectedPlace);
      // Navigate back
      navigation.goBack();
    } else {
      // Normal flow - navigate to the ExploreMap screen
      navigation.navigate('ExploreMap', { selectedPlace });
    }
  };

  // Render Google Place item
  const renderGooglePlaceItem = ({ item }) => {
    // Get API URL from environment
    const { apiUrl, googleMapsApiKey: mapApiKey } = getEnvVars();
    
    // Check if API key is valid before constructing photo URLs
    const isKeyValid = mapApiKey && 
                       !mapApiKey.includes('YOUR_GOOGLE_MAPS_API_KEY') && 
                       mapApiKey.length >= 10;
    
    // Prepare photo URLs - proxy and direct
    let photoUrl = 'https://via.placeholder.com/100?text=No+Image';
    let directPhotoUrl = null;
    
    if (item.photos && item.photos.length > 0) {
      photoUrl = `${apiUrl}/google/places/photo?photoreference=${item.photos[0].photo_reference}&maxwidth=100`;
      
      if (isKeyValid) {
        directPhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?photoreference=${item.photos[0].photo_reference}&maxwidth=100&key=${mapApiKey}`;
      }
    }
    
    return (
      <TouchableOpacity
        style={styles.locationItem}
        onPress={() => handlePlaceSelect(item)}
      >
        <Image
          source={{ 
            uri: photoUrl,
            headers: { 'Accept': 'image/*' },
            cache: 'force-cache'
          }}
          onError={() => {
            console.log('Photo proxy failed, using direct API for place photo');
          }}
          style={styles.locationImage}
          defaultSource={{ uri: directPhotoUrl || 'https://via.placeholder.com/100?text=No+Image' }}
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
  const renderLocationItem = ({ item }) => {
    const handleLocalLocationSelect = () => {
      if (route.params?.onPlaceSelected) {
        // Convert local location to the place format needed for itinerary
        const selectedPlace = {
          placeId: item._id,
          name: item.name,
          latitude: item.coordinates.latitude,
          longitude: item.coordinates.longitude,
          address: `${item.address.street || ''}, ${item.address.city || ''}, ${item.address.province || ''}, Sri Lanka`,
          rating: item.averageRating || 0,
          types: [item.type],
          photos: item.images || [],
        };
        
        // Call the callback with the selected place
        route.params.onPlaceSelected(selectedPlace);
        // Navigate back
        navigation.goBack();
      } else {
        // Normal flow - navigate to location detail
        navigation.navigate('LocationDetail', { id: item._id });
      }
    };
    
    return (
    <TouchableOpacity
      style={styles.locationItem}
        onPress={handleLocalLocationSelect}
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
  };

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
          
          {/* Category suggestions */}
          <View style={styles.categorySuggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Or try one of these categories:</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.suggestionsScroll}
            >
              <Chip
                key="adventure-chip"
                mode="outlined"
                onPress={() => {
                  setSearchQuery('adventure');
                  handleGooglePlacesSearch('adventure');
                }}
                style={styles.suggestionChip}
                icon="hiking"
              >
                Adventure
              </Chip>
              <Chip
                key="cultural-chip"
                mode="outlined"
                onPress={() => {
                  setSearchQuery('cultural');
                  handleGooglePlacesSearch('cultural');
                }}
                style={styles.suggestionChip}
                icon="temple-buddhist"
              >
                Cultural
              </Chip>
              <Chip
                key="historical-chip"
                mode="outlined"
                onPress={() => {
                  setSearchQuery('historical');
                  handleGooglePlacesSearch('historical');
                }}
                style={styles.suggestionChip}
                icon="book-open-page-variant"
              >
                Historical
              </Chip>
              <Chip
                key="beach-chip"
                mode="outlined"
                onPress={() => {
                  setSearchQuery('beach');
                  handleGooglePlacesSearch('beach');
                }}
                style={styles.suggestionChip}
                icon="beach"
              >
                Beach
              </Chip>
              <Chip
                key="food-chip"
                mode="outlined"
                onPress={() => {
                  setSearchQuery('food');
                  handleGooglePlacesSearch('food');
                }}
                style={styles.suggestionChip}
                icon="food"
              >
                Food
              </Chip>
            </ScrollView>
          </View>
        </>
      ) : (
        <>
          <Ionicons name="search" size={64} color={colors.divider} />
          <Text style={styles.emptyTitle}>Search for locations</Text>
          <Text style={styles.emptySubtitle}>
            Enter a location name, type, or feature
          </Text>
          
          {/* Category quick search */}
          <View style={styles.categorySuggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Or explore by category:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
              <Chip
                key="adventure-chip"
                mode="outlined"
                onPress={() => {
                  setSearchQuery('adventure');
                  handleGooglePlacesSearch('adventure');
                }}
                style={styles.suggestionChip}
                icon="hiking"
              >
                Adventure
              </Chip>
              <Chip
                key="cultural-chip"
                mode="outlined"
                onPress={() => {
                  setSearchQuery('cultural');
                  handleGooglePlacesSearch('cultural');
                }}
                style={styles.suggestionChip}
                icon="temple-buddhist"
              >
                Cultural
              </Chip>
              <Chip
                key="historical-chip"
                mode="outlined"
                onPress={() => {
                  setSearchQuery('historical');
                  handleGooglePlacesSearch('historical');
                }}
                style={styles.suggestionChip}
                icon="book-open-page-variant"
              >
                Historical
              </Chip>
              <Chip
                key="beach-chip"
                mode="outlined"
                onPress={() => {
                  setSearchQuery('beach');
                  handleGooglePlacesSearch('beach');
                }}
                style={styles.suggestionChip}
                icon="beach"
              >
                Beach
              </Chip>
              <Chip
                key="food-chip"
                mode="outlined"
                onPress={() => {
                  setSearchQuery('food');
                  handleGooglePlacesSearch('food');
                }}
                style={styles.suggestionChip}
                icon="food"
              >
                Food
              </Chip>
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );

  // Render footer (loading or load more button)
  const renderFooter = () => {
    if (googleSearchLoading) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.footerText}>Loading more...</Text>
        </View>
      );
    }
    
    return null;
  };

  // Add this effect to log search results when they change
  useEffect(() => {
    if (searchResults) {
      console.log(`Received ${searchResults.length} search results`);
      if (searchResults.length > 0) {
        // Log the first result to see its structure
        console.log('First result example:', JSON.stringify(searchResults[0]));
        
        // Check for valid coordinates in results
        const validCoordinates = searchResults.filter(location => 
          location.coordinates && 
          typeof location.coordinates.latitude === 'number' && 
          typeof location.coordinates.longitude === 'number'
        );
        console.log(`Found ${validCoordinates.length} results with valid coordinates out of ${searchResults.length}`);
      }
    }
  }, [searchResults]);

  // Get color based on location type
  const getMarkerColor = (type) => {
    switch (type) {
      case 'beach':
        return '#03A9F4'; // Blue
      case 'mountain':
        return '#795548'; // Brown
      case 'temple':
        return '#9C27B0'; // Purple
      case 'historical':
        return '#FFC107'; // Amber
      case 'museum':
        return '#673AB7'; // Deep Purple
      case 'park':
        return '#4CAF50'; // Green
      case 'wildlife':
        return '#FF9800'; // Orange
      case 'waterfall':
        return '#00BCD4'; // Cyan
      case 'viewpoint':
        return '#3F51B5'; // Indigo
      case 'hotel':
        return '#E91E63'; // Pink
      case 'restaurant':
        return '#F44336'; // Red
      case 'shopping':
        return '#9E9E9E'; // Grey
      case 'entertainment':
        return '#8BC34A'; // Light Green
      default:
        return colors.primary;
    }
  };

  // Generate Sri Lanka tourism locations when no search results are found
  const getSriLankaTourismLocations = () => {
    // Popular tourism locations in Sri Lanka with accurate coordinates
    return [
      {
        _id: 'sigiriya-1',
        name: 'Sigiriya Rock Fortress',
        type: 'historical',
        coordinates: {
          latitude: 7.9570,
          longitude: 80.7603
        },
        address: {
          city: 'Sigiriya',
          province: 'Central Province'
        },
        averageRating: 4.8
      },
      {
        _id: 'kandy-temple-1',
        name: 'Temple of the Tooth Relic',
        type: 'temple',
        coordinates: {
          latitude: 7.2936,
          longitude: 80.6413
        },
        address: {
          city: 'Kandy',
          province: 'Central Province'
        },
        averageRating: 4.7
      },
      {
        _id: 'galle-fort-1',
        name: 'Galle Fort',
        type: 'historical',
        coordinates: {
          latitude: 6.0300,
          longitude: 80.2167
        },
        address: {
          city: 'Galle',
          province: 'Southern Province'
        },
        averageRating: 4.6
      },
      {
        _id: 'yala-1',
        name: 'Yala National Park',
        type: 'wildlife',
        coordinates: {
          latitude: 6.3728,
          longitude: 81.5157
        },
        address: {
          city: 'Yala',
          province: 'Southern Province'
        },
        averageRating: 4.5
      },
      {
        _id: 'pinnawala-1',
        name: 'Pinnawala Elephant Orphanage',
        type: 'wildlife',
        coordinates: {
          latitude: 7.3009,
          longitude: 80.3850
        },
        address: {
          city: 'Pinnawala',
          province: 'Central Province'
        },
        averageRating: 4.3
      },
      {
        _id: 'unawatuna-1',
        name: 'Unawatuna Beach',
        type: 'beach',
        coordinates: {
          latitude: 6.0174,
          longitude: 80.2489
        },
        address: {
          city: 'Unawatuna',
          province: 'Southern Province'
        },
        averageRating: 4.4
      },
      {
        _id: 'anuradhapura-1',
        name: 'Anuradhapura Ancient City',
        type: 'historical',
        coordinates: {
          latitude: 8.3114,
          longitude: 80.4037
        },
        address: {
          city: 'Anuradhapura',
          province: 'North Central Province'
        },
        averageRating: 4.6
      },
      {
        _id: 'horton-plains-1',
        name: 'Horton Plains National Park',
        type: 'wildlife',
        coordinates: {
          latitude: 6.8021,
          longitude: 80.8052
        },
        address: {
          city: 'Nuwara Eliya',
          province: 'Central Province'
        },
        averageRating: 4.5
      },
      {
        _id: 'ella-rock-1',
        name: 'Ella Rock',
        type: 'viewpoint',
        coordinates: {
          latitude: 6.8667,
          longitude: 81.0466
        },
        address: {
          city: 'Ella',
          province: 'Uva Province'
        },
        averageRating: 4.7
      },
      {
        _id: 'adams-peak-1',
        name: 'Adam\'s Peak',
        type: 'mountain',
        coordinates: {
          latitude: 6.8096,
          longitude: 80.4994
        },
        address: {
          city: 'Nuwara Eliya',
          province: 'Central Province'
        },
        averageRating: 4.9
      }
    ];
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <Searchbar
          placeholder="Search locations..."
          onChangeText={handleSearchInput}
          value={searchQuery}
          onSubmitEditing={() => handleGooglePlacesSearch()}
          style={styles.searchBar}
          autoFocus={!route.params?.query}
        />
      </View>

      {/* Type Filters - Show for Google search by default */}
      {types && types.length > 0 && (
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

      {/* Search Results - Always use Google Places results */}
      {googleSearchLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Searching Places...</Text>
        </View>
      ) : (
        <>
          {/* Toggle between map and list view for Google Places results */}
          <View style={styles.googlePlacesViewToggle}>
            <TouchableOpacity
              style={[styles.viewToggleButton, !showMapForGooglePlaces && styles.activeViewToggleButton]}
              onPress={() => setShowMapForGooglePlaces(false)}
            >
              <Ionicons name="list" size={20} color={!showMapForGooglePlaces ? colors.primary : colors.text} />
              <Text style={[styles.viewToggleText, !showMapForGooglePlaces && styles.activeViewToggleText]}>List View</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleButton, showMapForGooglePlaces && styles.activeViewToggleButton]}
              onPress={() => setShowMapForGooglePlaces(true)}
            >
              <Ionicons name="map" size={20} color={showMapForGooglePlaces ? colors.primary : colors.text} />
              <Text style={[styles.viewToggleText, showMapForGooglePlaces && styles.activeViewToggleText]}>Map View</Text>
            </TouchableOpacity>
          </View>
                
          {showMapForGooglePlaces ? (
            // Map view for Google Places results
            <View style={styles.mapContainer}>
              <MapView
                provider={isGoogleKeyValid ? PROVIDER_GOOGLE : null}
                style={styles.map}
                initialRegion={{
                  latitude: 7.8731, // Sri Lanka center
                  longitude: 80.7718,
                  latitudeDelta: 3.0,
                  longitudeDelta: 3.0,
                }}
                ref={mapRef}
                showsUserLocation={true}
                showsMyLocationButton={false}
                showsCompass={true}
                showsScale={true}
              >
                {/* Display the formatted Google Places results on the map */}
                {(sharedSearchResults && sharedSearchResults.length > 0 ? sharedSearchResults : []).map((location, index) => {
                  // Skip locations with invalid coordinates
                  if (!location.coordinates || 
                      typeof location.coordinates.latitude !== 'number' || 
                      typeof location.coordinates.longitude !== 'number') {
                    return null;
                  }
                  
                  // Create a unique key for each marker
                  const markerKey = `google-place-${location._id || index}`;
                  
                  return (
                    <Marker
                      key={markerKey}
                      coordinate={{
                        latitude: location.coordinates.latitude,
                        longitude: location.coordinates.longitude,
                      }}
                      title={location.name}
                      description={location.address.city || ''}
                      onPress={() => {
                        // Handle marker press similar to places list item select
                        const selectedPlace = {
                          placeId: location._id,
                          name: location.name,
                          latitude: location.coordinates.latitude,
                          longitude: location.coordinates.longitude,
                          address: `${location.address.city}, Sri Lanka`,
                          rating: location.averageRating || 0,
                          types: [location.type],
                          photos: location.images || [],
                        };
                        
                        if (route.params?.onPlaceSelected) {
                          route.params.onPlaceSelected(selectedPlace);
                          navigation.goBack();
                        } else {
                          navigation.navigate('ExploreMap', { selectedPlace });
                        }
                      }}
                    >
                      {/* Use a more visible marker */}
                      <View style={[styles.simpleMarker, { borderColor: getMarkerColor(location.type) }]}>
                        <View style={[styles.markerDot, { backgroundColor: getMarkerColor(location.type) }]} />
                      </View>
                      
                      <Callout>
                        <View style={styles.calloutContainer}>
                          <Text style={styles.calloutTitle}>{location.name}</Text>
                          <Text style={styles.calloutSubtitle}>{location.type}</Text>
                          {location.averageRating > 0 && (
                            <View style={styles.calloutRating}>
                              <Ionicons name="star" size={12} color={colors.accent} />
                              <Text style={styles.calloutRatingText}>{location.averageRating.toFixed(1)}</Text>
                            </View>
                          )}
                          <Text style={styles.calloutAction}>Tap for details</Text>
                        </View>
                      </Callout>
                    </Marker>
                  );
                })}
              </MapView>
              
              {/* Map Control Buttons */}
              <View style={styles.mapControls}>
                <TouchableOpacity 
                  style={styles.mapControlButton}
                  onPress={() => {
                    if (userLocation && mapRef && mapRef.current) {
                      try {
                        mapRef.current.animateToRegion({
                          latitude: userLocation.latitude,
                          longitude: userLocation.longitude,
                          latitudeDelta: 0.05,
                          longitudeDelta: 0.05,
                        });
                      } catch (error) {
                        console.error('Error animating to user location in Google mode:', error);
                      }
                    } else {
                      console.log('Cannot navigate to user location: either location is not available or map is not ready');
                    }
                  }}
                >
                  <Ionicons name="locate" size={24} color={colors.primary} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.mapControlButton}
                  onPress={() => {
                    if (!mapRef || !mapRef.current) {
                      console.log('Map reference not ready, cannot center map in Google mode');
                      return;
                    }
                    
                    try {
                      // Center on Google Places search results
                      if (sharedSearchResults && sharedSearchResults.length > 0) {
                        let totalLat = 0;
                        let totalLng = 0;
                        let validLocations = 0;
                        
                        sharedSearchResults.forEach(location => {
                          if (location.coordinates && 
                              typeof location.coordinates.latitude === 'number' && 
                              typeof location.coordinates.longitude === 'number') {
                            totalLat += location.coordinates.latitude;
                            totalLng += location.coordinates.longitude;
                            validLocations++;
                          }
                        });
                        
                        if (validLocations > 0) {
                          mapRef.current.animateToRegion({
                            latitude: totalLat / validLocations,
                            longitude: totalLng / validLocations,
                            latitudeDelta: 0.5,
                            longitudeDelta: 0.5,
                          });
                        } else {
                          // If no valid locations, center on Sri Lanka
                          mapRef.current.animateToRegion({
                            latitude: 7.8731,
                            longitude: 80.7718,
                            latitudeDelta: 3.0,
                            longitudeDelta: 3.0,
                          });
                        }
                      } else {
                        // If no results, center on Sri Lanka
                        mapRef.current.animateToRegion({
                          latitude: 7.8731,
                          longitude: 80.7718,
                          latitudeDelta: 3.0,
                          longitudeDelta: 3.0,
                        });
                      }
                    } catch (error) {
                      console.error('Error centering map on Google results:', error);
                    }
                  }}
                >
                  <Ionicons name="map" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
              
              {/* Footer for Google Places map */}
              <View style={styles.mapFooter}>
                <Text style={styles.resultsCount}>
                  {sharedSearchResults && sharedSearchResults.length > 0 
                    ? `${sharedSearchResults.length} places found` 
                    : 'No places found'}
                </Text>
                <Button 
                  icon="format-list-bulleted" 
                  mode="outlined" 
                  onPress={() => setShowMapForGooglePlaces(false)}
                  style={styles.listViewButton}
                >
                  List View
                </Button>
              </View>
            </View>
          ) : (
            // List view for Google Places results
            <FlatList
              data={googlePlacesResults}
              renderItem={renderGooglePlaceItem}
              keyExtractor={(item, index) => item.place_id?.toString() || `place-${index}-${Date.now()}`}
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
  },
  categorySuggestionsContainer: {
    marginTop: spacing.large,
    width: '100%',
    alignItems: 'center',
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: spacing.medium,
    color: colors.text,
    textAlign: 'center',
  },
  suggestionsScroll: {
    marginTop: spacing.small,
    width: '100%',
    paddingHorizontal: spacing.small,
  },
  suggestionChip: {
    margin: spacing.tiny,
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  calloutContainer: {
    width: 150,
    padding: 10,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2,
  },
  calloutSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  calloutRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  calloutRatingText: {
    fontSize: 12,
    marginLeft: 2,
    color: colors.accent,
  },
  calloutAction: {
    fontSize: 10,
    color: colors.primary,
    marginTop: 3,
    fontStyle: 'italic',
  },
  mapFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: spacing.medium,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  resultsCount: {
    fontWeight: 'bold',
  },
  listViewButton: {
    height: 36,
  },
  mapControls: {
    position: 'absolute',
    top: spacing.medium,
    right: spacing.medium,
  },
  mapControlButton: {
    backgroundColor: colors.surface,
    borderRadius: 30,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    marginBottom: spacing.small,
  },
  debugPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  debugScroll: {
    padding: spacing.medium,
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.medium,
    color: colors.white,
  },
  debugText: {
    fontSize: 14,
    color: colors.white,
    marginBottom: spacing.small,
  },
  debugError: {
    color: colors.error,
    marginBottom: spacing.small,
  },
  debugSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: spacing.medium,
    color: colors.white,
  },
  debugCloseButton: {
    position: 'absolute',
    top: spacing.medium,
    right: spacing.medium,
    backgroundColor: colors.error,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simpleMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  markerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  googlePlacesViewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  viewToggleButton: {
    flex: 1,
    padding: spacing.medium,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeViewToggleButton: {
    borderBottomColor: colors.primary,
  },
  viewToggleText: {
    color: colors.text,
    fontWeight: '500',
  },
  activeViewToggleText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});

export default SearchScreen;