import React, { useEffect, useState } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { Card, Divider, ActivityIndicator, Button } from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';

// Import theme
import { COLORS } from '../constants/theme';
import { API_URL, API_ENDPOINTS, API_URL_OPTIONS } from '../constants/api';

// Import screens
import VehicleDetailScreen from '../screens/vehicleOwner/VehicleDetailScreen';

// Create a component for Vehicle Feed with data fetching
const VehicleFeedScreen = ({ navigation }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const [showDebug, setShowDebug] = useState(false);
  
  // Get auth token from Redux state
  const authToken = useSelector((state) => state.auth?.token);

  // Function to fetch all vehicles data
  const fetchVehicles = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    console.log('Starting to fetch vehicles data...');
    const debug = {
      apiUrl: API_URL,
      endpoints: {
        list: API_ENDPOINTS.VEHICLES.LIST,
        search: API_ENDPOINTS.VEHICLES.SEARCH
      },
      attempts: [],
      tokenExists: false
    };
    
    try {
      setError(null);
      
      // Get token from AsyncStorage if not available in Redux
      let token = authToken;
      if (!token) {
        try {
          token = await AsyncStorage.getItem('authToken');
          console.log('Got token from AsyncStorage:', token ? 'Yes' : 'No');
          debug.attempts.push({
            step: 'Getting token from AsyncStorage',
            success: !!token
          });
        } catch (tokenError) {
          console.log('Error getting token from AsyncStorage:', tokenError);
          debug.attempts.push({
            step: 'Getting token from AsyncStorage',
            success: false,
            error: tokenError.message
          });
        }
      } else {
        console.log('Using token from Redux state');
        debug.attempts.push({
          step: 'Getting token from Redux',
          success: true
        });
      }
      
      debug.tokenExists = !!token;
      
      // Try direct API call to search endpoint first (most reliable)
      console.log('Trying direct API call to search endpoint...');
      // Use the platform-specific API URLs from our constants
      const serverUrls = API_URL_OPTIONS;
      
      let vehiclesData = [];
      let fetchSuccess = false;
      
      // Try each server URL for the search endpoint
      for (const serverUrl of serverUrls) {
        try {
          console.log(`Trying search endpoint at ${serverUrl}...`);
          const searchUrl = `${serverUrl}/vehicles/search?limit=50&showUnverified=true`;
          
          debug.attempts.push({
            step: `Direct API call to ${searchUrl}`,
            url: searchUrl
          });
          
          const response = await fetch(searchUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
          }
          
          const responseText = await response.text();
          console.log('Got response:', responseText.substring(0, 100) + '...');
          
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.log('Error parsing JSON:', parseError);
            throw new Error('Invalid JSON response from server');
          }
          
          if (data.status === 'success' && data.data?.vehicles) {
            vehiclesData = data.data.vehicles;
            console.log(`Found ${vehiclesData.length} vehicles from ${serverUrl}`);
            
            debug.attempts.push({
              step: `Got vehicles from ${serverUrl}`,
              success: true,
              count: vehiclesData.length
            });
            
            fetchSuccess = true;
            break;
          }
        } catch (error) {
          console.log(`Error fetching from ${serverUrl}:`, error);
          debug.attempts.push({
            step: `Error with ${serverUrl}`,
            success: false,
            error: error.message
          });
        }
      }
      
      // If direct calls failed, try using axios with the configured API URL
      if (!fetchSuccess) {
        console.log('Direct fetch failed, trying axios...');
        try {
          debug.attempts.push({
            step: 'Trying axios with API_URL',
            url: `${API_URL}${API_ENDPOINTS.VEHICLES.SEARCH}?limit=50&showUnverified=true`
          });
          
          const response = await axios.get(
            `${API_URL}${API_ENDPOINTS.VEHICLES.SEARCH}?limit=50&showUnverified=true`
          );
          
          if (response.data.status === 'success' && response.data.data?.vehicles) {
            vehiclesData = response.data.data.vehicles;
            console.log(`Found ${vehiclesData.length} vehicles from axios call`);
            
            debug.attempts.push({
              step: 'Axios search request',
              success: true,
              vehiclesCount: vehiclesData.length
            });
            
            fetchSuccess = true;
          }
        } catch (axiosError) {
          console.log('Axios error:', axiosError);
          debug.attempts.push({
            step: 'Axios search request',
            success: false,
            error: axiosError.message
          });
        }
      }
      
      // Final fallback - try with token if available
      if (!fetchSuccess && token) {
        console.log('Trying with auth token...');
        try {
          const authConfig = { 
            headers: { 'Authorization': `Bearer ${token}` } 
          };
          
          const response = await axios.get(
            `${API_URL}/vehicles/my-vehicles`, 
            authConfig
          );
          
          if (response.data.status === 'success' && response.data.data?.vehicles) {
            vehiclesData = response.data.data.vehicles;
            console.log(`Found ${vehiclesData.length} vehicles from my-vehicles endpoint`);
            
            debug.attempts.push({
              step: 'My-vehicles authenticated request',
              success: true,
              vehiclesCount: vehiclesData.length
            });
            
            fetchSuccess = true;
          }
        } catch (authError) {
          console.log('Auth request error:', authError);
          debug.attempts.push({
            step: 'My-vehicles authenticated request',
            success: false,
            error: authError.message
          });
        }
      }
      
      if (vehiclesData.length > 0) {
        // Success - we have vehicles!
        console.log(`Successfully fetched ${vehiclesData.length} vehicles`);
        
        // Log some details about the first few vehicles
        if (vehiclesData.length > 0) {
          const firstVehicle = vehiclesData[0];
          console.log('First vehicle details:', {
            id: firstVehicle._id,
            make: firstVehicle.make,
            model: firstVehicle.model,
            isVerified: firstVehicle.isVerified,
            status: firstVehicle.verificationStatus,
            hasPhotos: firstVehicle.photos?.length > 0
          });
        }
      } else {
        console.log('No vehicles found in any API call');
      }
      
      setVehicles(vehiclesData || []);
      
      // Store debug info
      setDebugInfo(debug);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError(err.message || 'Error fetching vehicles');
      // Store debug info in case of error
      setDebugInfo(debug);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = () => {
    fetchVehicles(true);
  };

  // Fetch vehicles when component mounts
  useEffect(() => {
    console.log('VehicleFeedScreen mounted - fetching vehicles...');
    fetchVehicles();
    
    // Set up a refresh interval every 5 minutes
    const refreshInterval = setInterval(() => {
      console.log('Refreshing vehicle data...');
      fetchVehicles();
    }, 300000); // Refresh every 5 minutes
    
    // Clean up the interval on unmount
    return () => clearInterval(refreshInterval);
  }, []);

  // Navigation handler for view details button
  const handleViewDetails = (vehicle) => {
    navigation.navigate('VehicleDetail', { 
      vehicleId: vehicle._id,
      title: `${vehicle.make} ${vehicle.model}`
    });
  };

  // Render each vehicle item
  const renderVehicleItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.cardContent}>
        {item.photos && item.photos.length > 0 ? (
          <Image 
            source={{ uri: item.photos[0] }} 
            style={styles.vehicleImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.vehicleImage, styles.noImagePlaceholder]}>
            <Text style={styles.noImageText}>No Image</Text>
          </View>
        )}
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleTitle}>{item.make} {item.model} ({item.year})</Text>
          <View style={styles.infoRow}>
            <Text style={styles.vehicleType}>{item.type?.toUpperCase() || 'VEHICLE'}</Text>
            <View style={[
              styles.verificationBadge, 
              item.isVerified ? styles.verifiedBadge : styles.unverifiedBadge
            ]}>
              <Text style={styles.verificationText}>
                {item.isVerified ? 'Verified' : (item.verificationStatus || 'Unverified')}
              </Text>
            </View>
          </View>
          <Text style={styles.vehicleDetail}>Registration: {item.registrationNumber || 'N/A'}</Text>
          <Text style={styles.vehicleDetail}>Capacity: {item.capacity?.passengers || 'N/A'} passengers</Text>
          {item.features && item.features.length > 0 && (
            <Text style={styles.vehicleDetail}>
              Features: {item.features.slice(0, 3).join(', ')}{item.features.length > 3 ? '...' : ''}
            </Text>
          )}
          {item.pricePerDay && (
            <Text style={styles.vehiclePrice}>
              Price: ${item.pricePerDay}/day
            </Text>
          )}
          <Text style={[
            styles.vehicleStatus,
            !item.isAvailable && styles.unavailableStatus
          ]}>
            Status: {item.isAvailable ? 'Available' : 'Not Available'}
          </Text>
        </View>
      </View>
      {item.description && (
        <View style={styles.descriptionContainer}>
          <Divider />
          <Text style={styles.descriptionTitle}>Description</Text>
          <Text style={styles.descriptionText}>
            {item.description.length > 120 
              ? `${item.description.substring(0, 120)}...` 
              : item.description}
          </Text>
        </View>
      )}
      <TouchableOpacity 
        style={styles.viewDetailsButton}
        onPress={() => handleViewDetails(item)}
      >
        <Text style={styles.viewDetailsText}>View Details</Text>
      </TouchableOpacity>
    </Card>
  );

  // Debug section to display API call details
  const renderDebugSection = () => {
    if (!showDebug) return null;
    
    return (
      <View style={styles.debugContainer}>
        <Text style={styles.debugTitle}>Debug Information</Text>
        <Text style={styles.debugText}>API URL: {debugInfo.apiUrl}</Text>
        <Text style={styles.debugText}>Token exists: {debugInfo.tokenExists ? 'Yes' : 'No'}</Text>
        
        <Text style={styles.debugSubtitle}>API Attempts:</Text>
        <ScrollView style={styles.debugScroll}>
          {debugInfo.attempts && debugInfo.attempts.map((attempt, index) => (
            <View key={index} style={styles.debugItem}>
              <Text style={styles.debugStep}>{attempt.step}</Text>
              {attempt.success !== undefined && (
                <Text style={[
                  styles.debugResult, 
                  {color: attempt.success ? 'green' : 'red'}
                ]}>
                  {attempt.success ? 'Success' : 'Failed'}
                </Text>
              )}
              {attempt.url && <Text style={styles.debugText}>URL: {attempt.url}</Text>}
              {attempt.status && <Text style={styles.debugText}>Status: {attempt.status}</Text>}
              {attempt.error && <Text style={styles.debugError}>Error: {attempt.error}</Text>}
              {attempt.vehiclesCount !== undefined && (
                <Text style={styles.debugText}>Vehicles: {attempt.vehiclesCount}</Text>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.text, { marginTop: 10 }]}>Loading vehicles...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Error: {error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={fetchVehicles}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        
        <Button 
          mode="text" 
          onPress={() => setShowDebug(!showDebug)} 
          style={{marginTop: 20}}
        >
          {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
        </Button>
        
        {renderDebugSection()}
      </View>
    );
  }

  if (vehicles.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No vehicles found</Text>
        <Text style={styles.subText}>
          There might be an issue with the API or no vehicles have been added yet.
        </Text>
        
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={fetchVehicles}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        
        <Button 
          mode="text" 
          onPress={() => setShowDebug(!showDebug)} 
          style={{marginTop: 20}}
        >
          {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
        </Button>
        
        {renderDebugSection()}
      </View>
    );
  }

  return (
    <View style={styles.scrollContainer}>
      <FlatList
        data={vehicles}
        renderItem={renderVehicleItem}
        keyExtractor={item => item._id || Math.random().toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.vehicleContainer}>
            <Text style={styles.sectionTitle}>Vehicle Feed</Text>
            <Text style={styles.subText}>
              {vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'} available
            </Text>
            
            <Button 
              mode="text" 
              onPress={() => setShowDebug(!showDebug)} 
              compact
            >
              {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
            </Button>
            {renderDebugSection()}
          </View>
        }
      />
    </View>
  );
};

const TopTab = createMaterialTopTabNavigator();
const Stack = createStackNavigator();

// Top tabs navigator with vehicle feed and future feed
const SearchTabs = () => {
  return (
    <TopTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarIndicatorStyle: {
          backgroundColor: COLORS.primary,
        },
        tabBarLabelStyle: {
          fontWeight: 'bold',
          textTransform: 'none',
        },
      }}
    >
      <TopTab.Screen 
        name="VehicleFeed" 
        component={VehicleFeedScreen} 
        options={{ title: 'Vehicle Feed' }}
      />
    </TopTab.Navigator>
  );
};

// Main stack for search navigator
const SearchNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="SearchScreen" 
        component={SearchTabs} 
        options={{ 
          title: 'Search',
          headerTitleAlign: 'center',
        }} 
      />
      <Stack.Screen
        name="VehicleDetail"
        component={VehicleDetailScreen}
        options={({ route }) => ({
          title: route.params?.title || 'Vehicle Details',
          headerTitleAlign: 'center',
        })}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  vehicleContainer: {
    padding: 16,
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.text
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    color: COLORS.primary
  },
  subText: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 10,
  },
  card: {
    marginBottom: 15,
    marginHorizontal: 10,
    elevation: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12
  },
  vehicleImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 10
  },
  noImagePlaceholder: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#757575',
    fontWeight: 'bold',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: COLORS.primary
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  vehicleType: {
    fontSize: 12,
    color: COLORS.gray,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 5,
  },
  vehicleDetail: {
    fontSize: 14,
    marginBottom: 3,
    color: COLORS.text
  },
  vehiclePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 3
  },
  vehicleStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.success
  },
  unavailableStatus: {
    color: COLORS.error
  },
  descriptionContainer: {
    padding: 12,
    paddingTop: 6
  },
  descriptionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginVertical: 4,
    color: COLORS.text
  },
  descriptionText: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 18
  },
  viewDetailsButton: {
    backgroundColor: COLORS.primary,
    padding: 8,
    alignItems: 'center',
    margin: 12,
    marginTop: 0,
    borderRadius: 6
  },
  viewDetailsText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14
  },
  listContainer: {
    paddingVertical: 10,
  },
  error: {
    color: 'red',
    marginBottom: 20,
    textAlign: 'center'
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold'
  },
  debugContainer: {
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 10,
    marginVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  debugSubtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  debugText: {
    fontSize: 12,
    marginBottom: 5,
  },
  debugScroll: {
    maxHeight: 300,
  },
  debugItem: {
    padding: 5,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  debugStep: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  debugResult: {
    fontSize: 12,
  },
  debugError: {
    fontSize: 12,
    color: 'red',
  },
  verificationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedBadge: {
    backgroundColor: COLORS.success,
  },
  unverifiedBadge: {
    backgroundColor: COLORS.error,
  },
  verificationText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default SearchNavigator; 