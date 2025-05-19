import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions,
  FlatList,
  Alert
} from 'react-native';
import { Card, Divider, Button, Chip } from 'react-native-paper';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { API_URL, API_ENDPOINTS } from '../../constants/api';
import { COLORS } from '../../constants/theme';

const { width } = Dimensions.get('window');

const VehicleDetailScreen = ({ route, navigation }) => {
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  // Get auth token from Redux state
  const authToken = useSelector((state) => state.auth?.token);

  useEffect(() => {
    fetchVehicleDetails();
  }, [vehicleId]);

  const fetchVehicleDetails = async () => {
    try {
      setLoading(true);
      
      // Get token from AsyncStorage if not available in Redux
      let token = authToken;
      if (!token) {
        try {
          token = await AsyncStorage.getItem('authToken');
          console.log('Got token from AsyncStorage:', token ? 'Yes' : 'No');
        } catch (tokenError) {
          console.log('Error getting token from AsyncStorage:', tokenError);
        }
      }
      
      // Create config with auth header if token is available
      const config = token ? { 
        headers: { 'Authorization': `Bearer ${token}` } 
      } : {};
      
      // First try using authenticated request if token is available
      if (token) {
        try {
          const response = await axios.get(
            `${API_URL}${API_ENDPOINTS.VEHICLES.DETAILS(vehicleId)}`, 
            config
          );
          
          if (response.data.status === 'success' && response.data.data) {
            setVehicle(response.data.data.vehicle);
            setLoading(false);
            return;
          }
        } catch (authError) {
          console.log('Auth request error:', authError);
          // Continue to fallback methods
        }
      }
      
      // Fallback - try public endpoint without auth
      try {
        // Try direct API call to search endpoint to find the specific vehicle
        const searchResponse = await axios.get(
          `${API_URL}${API_ENDPOINTS.VEHICLES.SEARCH}?limit=50&showUnverified=true`
        );
        
        if (searchResponse.data.status === 'success' && searchResponse.data.data?.vehicles) {
          const vehicles = searchResponse.data.data.vehicles;
          const foundVehicle = vehicles.find(v => v._id === vehicleId);
          
          if (foundVehicle) {
            setVehicle(foundVehicle);
            setLoading(false);
            return;
          } else {
            throw new Error('Vehicle not found in search results');
          }
        } else {
          throw new Error('Could not retrieve vehicles from search');
        }
      } catch (searchError) {
        console.error('Error searching for vehicle:', searchError);
        throw searchError; // Propagate to outer catch
      }
    } catch (err) {
      console.error('Error fetching vehicle details:', err);
      setError(err.message || 'Error fetching vehicle details');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading vehicle details...</Text>
      </View>
    );
  }

  if (error || !vehicle) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error || 'Vehicle not found'}</Text>
        <Button 
          mode="contained" 
          onPress={fetchVehicleDetails}
          style={styles.retryButton}
        >
          Retry
        </Button>
        <Button 
          mode="outlined" 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Photo Gallery */}
      <View style={styles.photoGalleryContainer}>
        {vehicle.photos && vehicle.photos.length > 0 ? (
          <>
            <Image 
              source={{ uri: vehicle.photos[currentPhotoIndex] }} 
              style={styles.mainPhoto}
              resizeMode="cover"
            />
            <FlatList
              horizontal
              data={vehicle.photos}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item, index }) => (
                <TouchableOpacity 
                  onPress={() => setCurrentPhotoIndex(index)}
                  style={[
                    styles.thumbnailContainer,
                    currentPhotoIndex === index && styles.activeThumbnail
                  ]}
                >
                  <Image 
                    source={{ uri: item }} 
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailList}
            />
          </>
        ) : (
          <View style={styles.noPhotoContainer}>
            <Text style={styles.noPhotoText}>No photos available</Text>
          </View>
        )}
      </View>

      {/* Vehicle Info Card */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.vehicleTitle}>{vehicle.make} {vehicle.model}</Text>
              <Text style={styles.vehicleYear}>{vehicle.year}</Text>
            </View>
            <View style={[
              styles.verificationBadge, 
              vehicle.isVerified ? styles.verifiedBadge : styles.unverifiedBadge
            ]}>
              <Text style={styles.verificationText}>
                {vehicle.isVerified ? 'Verified' : (vehicle.verificationStatus || 'Unverified')}
              </Text>
            </View>
          </View>
          
          <Divider style={styles.divider} />

          {/* Vehicle Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type:</Text>
              <Text style={styles.detailValue}>{vehicle.type || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Registration:</Text>
              <Text style={styles.detailValue}>{vehicle.registrationNumber || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Capacity:</Text>
              <Text style={styles.detailValue}>{vehicle.capacity?.passengers || 'N/A'} passengers</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Fuel Type:</Text>
              <Text style={styles.detailValue}>{vehicle.fuelType || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Transmission:</Text>
              <Text style={styles.detailValue}>{vehicle.transmission || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mileage:</Text>
              <Text style={styles.detailValue}>{vehicle.mileage ? `${vehicle.mileage} km` : 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text style={[
                styles.statusValue,
                vehicle.isAvailable ? styles.availableStatus : styles.unavailableStatus
              ]}>
                {vehicle.isAvailable ? 'Available' : 'Not Available'}
              </Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Pricing */}
          {vehicle.pricePerDay && (
            <>
              <View style={styles.pricingSection}>
                <Text style={styles.sectionTitle}>Pricing</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Per Day:</Text>
                  <Text style={styles.priceValue}>${vehicle.pricePerDay}</Text>
                </View>
                {vehicle.pricePerWeek && (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Per Week:</Text>
                    <Text style={styles.priceValue}>${vehicle.pricePerWeek}</Text>
                  </View>
                )}
                {vehicle.pricePerMonth && (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Per Month:</Text>
                    <Text style={styles.priceValue}>${vehicle.pricePerMonth}</Text>
                  </View>
                )}
              </View>
              <Divider style={styles.divider} />
            </>
          )}

          {/* Features */}
          {vehicle.features && vehicle.features.length > 0 && (
            <>
              <View style={styles.featuresSection}>
                <Text style={styles.sectionTitle}>Features</Text>
                <View style={styles.chipContainer}>
                  {vehicle.features.map((feature, index) => (
                    <Chip 
                      key={index} 
                      style={styles.featureChip}
                      textStyle={styles.featureChipText}
                    >
                      {feature}
                    </Chip>
                  ))}
                </View>
              </View>
              <Divider style={styles.divider} />
            </>
          )}

          {/* Description */}
          {vehicle.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{vehicle.description}</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Book Now Button */}
      <Button 
        mode="contained" 
        style={styles.bookButton}
        labelStyle={styles.bookButtonLabel}
        onPress={() => {
          // Handle booking logic here
          alert('Booking feature coming soon!');
        }}
      >
        Book Now
      </Button>

      {/* Chat with Owner Button */}
      <Button 
        mode="outlined" 
        style={styles.contactButton}
        labelStyle={styles.contactButtonLabel}
        onPress={() => {
          // Check if vehicle has owner information
          if (vehicle.ownerId || vehicle.owner) {
            const ownerId = vehicle.ownerId || vehicle.owner?._id;
            const ownerName = vehicle.ownerName || vehicle.owner?.name || 'Vehicle Owner';
            const ownerAvatar = vehicle.ownerAvatar || vehicle.owner?.avatar;
            
            if (!ownerId) {
              // Owner ID is required for chat functionality
              alert('Cannot identify vehicle owner. Please try again later.');
              return;
            }
            
            // Ensure we have a valid vehicle ID
            const vehicleId = vehicle._id || vehicle.id;
            if (!vehicleId) {
              console.error('[VehicleDetailScreen] No vehicle ID available for chat');
              alert('Cannot start chat: Vehicle information is incomplete.');
              return;
            }
            
            console.log(`[VehicleDetailScreen] Starting chat with VEHICLE OWNER about vehicle: ${vehicleId}`);
            
            // Show full details of what's being passed to help with debugging
            console.log('[VehicleDetailScreen] Chat navigation EXACT params:', {
              participantId: ownerId,
              participantName: ownerName,
              participantAvatar: ownerAvatar,
              vehicleId: vehicleId,
              vehicleName: `${vehicle.make} ${vehicle.model}`
            });
            
            if (!ownerId || !vehicleId) {
              console.error(`[VehicleDetailScreen] CRITICAL ERROR - Missing required data: ownerId=${ownerId}, vehicleId=${vehicleId}`);
              Alert.alert(
                'Error',
                'Missing required vehicle or owner information. Please try again later.',
                [{ text: 'OK' }]
              );
              return;
            }
            
            // Create a new chat or navigate to existing chat
            navigation.navigate('ChatDetail', {
              participantId: ownerId,
              participantName: ownerName,
              participantAvatar: ownerAvatar,
              vehicleId: vehicleId,
              vehicleName: `${vehicle.make} ${vehicle.model}`
            });
          } else {
            // Fallback if owner information is missing
            console.error('[VehicleDetailScreen] Missing owner information for vehicle:', vehicle._id);
            alert('Cannot connect to the owner at this moment. Please try again later.');
          }
        }}
      >
        Chat with Owner
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.gray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginBottom: 20,
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
  },
  retryButton: {
    marginBottom: 10,
  },
  backButton: {
    marginTop: 10,
  },
  photoGalleryContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  mainPhoto: {
    width: '100%',
    height: 250,
  },
  thumbnailList: {
    padding: 10,
  },
  thumbnailContainer: {
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  activeThumbnail: {
    borderColor: COLORS.primary,
  },
  thumbnail: {
    width: 60,
    height: 60,
  },
  noPhotoContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  noPhotoText: {
    fontSize: 16,
    color: COLORS.gray,
  },
  infoCard: {
    margin: 16,
    borderRadius: 10,
    elevation: 2,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleContainer: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  vehicleYear: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: 4,
  },
  verificationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    marginLeft: 10,
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
  divider: {
    marginVertical: 15,
  },
  detailsSection: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.text,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.gray,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    flex: 2,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 2,
  },
  availableStatus: {
    color: COLORS.success,
  },
  unavailableStatus: {
    color: COLORS.error,
  },
  pricingSection: {
    marginBottom: 15,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  featuresSection: {
    marginBottom: 15,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureChip: {
    margin: 4,
    backgroundColor: '#e8f0fe',
  },
  featureChipText: {
    color: COLORS.primary,
  },
  descriptionSection: {
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
  },
  bookButton: {
    margin: 16,
    marginBottom: 8,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
  },
  bookButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  contactButton: {
    margin: 16,
    marginTop: 8,
    paddingVertical: 8,
    borderColor: COLORS.primary,
  },
  contactButtonLabel: {
    fontSize: 16,
    color: COLORS.primary,
  },
});

export default VehicleDetailScreen; 