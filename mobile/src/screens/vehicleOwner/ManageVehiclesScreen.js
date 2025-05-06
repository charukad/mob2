import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert, Image } from 'react-native';
import { Text, Card, Button, FAB, ActivityIndicator, IconButton, Divider, Chip } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { COLORS, spacing } from '../../constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { loadUser } from '../../store/slices/authSlice';
import axios from '../../api/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ManageVehiclesScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Protect screen from unauthorized access
  useEffect(() => {
    if (!user || user.role !== 'vehicleOwner') {
      // Navigate back if user is not a vehicle owner
      navigation.goBack();
      Alert.alert('Access Denied', 'This screen is only for vehicle owners');
    }
  }, [user, navigation]);

  // Reload data whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('ManageVehiclesScreen is focused, reloading data...');
      loadVehicles();
      // Also reload the user data to ensure we have the latest user state
      dispatch(loadUser());
    }, [])
  );

  const loadVehicles = async () => {
    try {
      setLoading(true);
      console.log('Loading vehicles...');
      
      if (!user?.email) {
        console.log('No user email available, loading user data first');
        try {
          await dispatch(loadUser());
          // If we still don't have a user email, show error
          if (!user?.email) {
            console.log('Still no user email after reloading user data');
            setLoading(false);
            setVehicles([]);
            return;
          }
        } catch (error) {
          console.log('Error loading user data:', error);
          setLoading(false);
          setVehicles([]);
          return;
        }
      }
      
      // Get auth token for API requests
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.log('No auth token available');
        setLoading(false);
        setVehicles([]);
        return;
      }
      
      // Try the by-email endpoint with various URLs that worked in testing
      const urls = [
        `http://localhost:5008/api/vehicles/by-email/${encodeURIComponent(user.email)}`,
        `http://127.0.0.1:5008/api/vehicles/by-email/${encodeURIComponent(user.email)}`,
        `http://10.0.2.2:5008/api/vehicles/by-email/${encodeURIComponent(user.email)}`
      ];
      
      let success = false;
      
      for (const url of urls) {
        try {
          console.log(`Trying URL: ${url}`);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`Success with ${url}:`, data);
            
            // If vehicles found, display them
            if (data.data?.vehicles && data.data.vehicles.length > 0) {
              console.log(`Found ${data.data.vehicles.length} vehicles`);
              setVehicles(data.data.vehicles);
              setLoading(false);
              success = true;
              return;
            } else {
              console.log('No vehicles found in response');
            }
          } else {
            console.log(`Failed with status ${response.status}`);
          }
        } catch (error) {
          console.log(`Error with ${url}:`, error.message);
        }
      }
      
      // If direct fetch by email failed, try the my-vehicles endpoint
      if (!success) {
        try {
          console.log('Trying fallback to /my-vehicles endpoint');
          const response = await axios.get('/api/vehicles/my-vehicles');
          
          if (response.data?.data?.vehicles) {
            console.log(`Found ${response.data.data.vehicles.length} vehicles with my-vehicles endpoint`);
            setVehicles(response.data.data.vehicles);
            setLoading(false);
            return;
          }
        } catch (error) {
          console.log('Error with my-vehicles fallback:', error.message);
        }
      }
      
      // If still no success, check if user state has vehicles
      if (user?.vehicleOwner?.vehicles && user.vehicleOwner.vehicles.length > 0) {
        console.log(`Using ${user.vehicleOwner.vehicles.length} vehicles from user state`);
        setVehicles(user.vehicleOwner.vehicles);
      } else {
        console.log('No vehicles found after all attempts');
        setVehicles([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      setLoading(false);
    }
  };

  const handleAddVehicle = () => {
    // Navigate to the add vehicle screen
    navigation.navigate('AddVehicle');
  };

  const handleEditVehicle = (vehicleId) => {
    // Navigate to the edit vehicle screen with the vehicle id
    navigation.navigate('EditVehicle', { vehicleId });
  };

  const handleDeleteVehicle = (vehicleId) => {
    Alert.alert(
      'Delete Vehicle',
      'Are you sure you want to delete this vehicle?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              setLoading(true);
              console.log(`Deleting vehicle ${vehicleId}...`);
              const response = await axios.delete(`/api/vehicles/${vehicleId}`);
              console.log('Delete response:', response.data);
              
              if (response.status === 200) {
                // Reload user data and vehicles after successful deletion
                await dispatch(loadUser());
                // Remove from local state too
                setVehicles(prevVehicles => 
                  prevVehicles.filter(v => 
                    (v._id !== vehicleId) && (v.id !== vehicleId)
                  )
                );
                
                loadVehicles();
                Alert.alert('Success', 'Vehicle deleted successfully');
              }
            } catch (error) {
              console.error('Error deleting vehicle:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete vehicle');
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadVehicles();
  };

  const renderVehicleItem = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text style={styles.vehicleTitle}>{item.make} {item.model} ({item.year})</Text>
          <View style={styles.actionButtons}>
            <IconButton
              icon="pencil"
              size={20}
              onPress={() => handleEditVehicle(item._id || item.id)}
            />
            <IconButton
              icon="delete"
              size={20}
              onPress={() => handleDeleteVehicle(item._id || item.id)}
            />
          </View>
        </View>
        <Divider style={styles.divider} />
        <Text style={styles.vehicleText}>
          Registration: {item.registrationNumber || 'N/A'}
        </Text>
        <Text style={styles.vehicleText}>
          Type: {item.type || 'N/A'}
        </Text>
        <Text style={styles.vehicleText}>
          Capacity: {item.capacity?.passengers || 'N/A'} passengers
        </Text>
        
        {/* Add verification status */}
        <View style={styles.verificationContainer}>
          <Text style={styles.vehicleText}>
            Verification Status: 
          </Text>
          <Chip 
            mode="outlined" 
            style={[
              styles.statusChip,
              item.isVerified ? styles.verified : styles.unverified
            ]}
          >
            {item.isVerified ? 'Verified' : item.verificationStatus || 'Unverified'}
          </Chip>
          
          {/* Add submit for verification button if not already verified */}
          {!item.isVerified && item.verificationStatus === 'unsubmitted' && (
            <Button
              mode="outlined"
              compact
              style={styles.submitButton}
              onPress={() => handleSubmitForVerification(item._id || item.id)}
            >
              Submit for Verification
            </Button>
          )}
        </View>
        
        {item.photos && item.photos.length > 0 ? (
          <View style={styles.photoContainer}>
            <Image
              source={{ uri: item.photos[0] }}
              style={styles.vehicleImage}
              resizeMode="cover"
            />
          </View>
        ) : (
          <Text style={styles.noPhotoText}>No photos available</Text>
        )}
      </Card.Content>
    </Card>
  );

  // Add handler for submitting vehicle for verification
  const handleSubmitForVerification = async (vehicleId) => {
    try {
      setLoading(true);
      console.log(`Submitting vehicle ${vehicleId} for verification...`);
      
      const response = await axios.post(`/api/vehicles/${vehicleId}/submit-verification`);
      
      if (response.status === 200) {
        Alert.alert(
          'Success',
          'Your vehicle has been submitted for verification. You will be notified once the process is complete.',
          [{ text: 'OK' }]
        );
        
        // Reload vehicles to update UI
        loadVehicles();
      }
    } catch (error) {
      console.error('Error submitting vehicle for verification:', error);
      
      let errorMessage = 'Failed to submit vehicle for verification';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={vehicles}
        keyExtractor={(item, index) => item._id?.toString() || item.id?.toString() || index.toString()}
        renderItem={renderVehicleItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="directions-car" size={64} color={COLORS.gray} />
            <Text style={styles.emptyText}>No vehicles added yet</Text>
            <Text style={styles.emptySubText}>Add your first vehicle to start offering services</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      <FAB
        style={styles.fab}
        icon="plus"
        label="Add Vehicle"
        color={COLORS.white}
        onPress={handleAddVehicle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: spacing.md,
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  divider: {
    marginVertical: spacing.xs,
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    flex: 1,
  },
  vehicleText: {
    fontSize: 14,
    marginBottom: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubText: {
    color: COLORS.textLight,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
  },
  verificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statusChip: {
    marginLeft: spacing.xs,
  },
  verified: {
    backgroundColor: COLORS.success,
  },
  unverified: {
    backgroundColor: COLORS.error,
  },
  submitButton: {
    marginLeft: spacing.xs,
  },
  photoContainer: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  vehicleImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  noPhotoText: {
    color: COLORS.textLight,
    textAlign: 'center',
  },
});

export default ManageVehiclesScreen; 