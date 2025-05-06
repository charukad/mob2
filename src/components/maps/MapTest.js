import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Platform, NativeModules } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import getEnvVars from '../../../env';

const { googleMapsApiKey } = getEnvVars();

// Check if Google Maps is available
const isGoogleMapsAvailable = () => {
  if (Platform.OS === 'android') return true;
  
  // On iOS, we need to check if the native module is available
  try {
    return !!NativeModules.AIRGoogleMapManager;
  } catch (e) {
    return false;
  }
};

const MapTest = ({ onClose }) => {
  const [mapError, setMapError] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [key, setKey] = useState(Date.now());
  const retryCount = useRef(0);
  
  // Center of Sri Lanka
  const initialRegion = {
    latitude: 7.8731,
    longitude: 80.7718,
    latitudeDelta: 1.5,
    longitudeDelta: 1.5,
  };

  // Set a timeout to reload the map if it doesn't load correctly
  useEffect(() => {
    let timeout;
    if (!mapLoaded && !mapError && retryCount.current < 3) {
      timeout = setTimeout(() => {
        console.log('Map load timeout reached, reloading component');
        retryCount.current += 1;
        setKey(Date.now());
      }, 3000);
    }
    
    return () => clearTimeout(timeout);
  }, [mapLoaded, mapError]);

  const handleMapError = (error) => {
    console.error('Map error:', error);
    setMapError('Failed to load map. Trying again...');
    
    // Wait a moment and then retry
    setTimeout(() => {
      setMapError(null);
      setKey(Date.now());
    }, 1000);
  };

  const handleMapReady = () => {
    setMapLoaded(true);
    console.log('Map loaded successfully!');
  };

  // Special flag to avoid the native Google Maps error
  // This ensures we only use Google Maps provider when it's actually available
  const mapProvider = isGoogleMapsAvailable() ? PROVIDER_GOOGLE : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Google Maps Test</Text>
      
      <View style={styles.mapContainer}>
        {!mapLoaded && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>
              {mapError ? mapError : 'Loading map...'}
            </Text>
          </View>
        )}
        
        <MapView
          key={key}
          style={styles.map}
          // Use Google Maps only if available
          provider={mapProvider}
          initialRegion={initialRegion}
          onMapReady={handleMapReady}
          onError={handleMapError}
          showsUserLocation={true}
          showsMyLocationButton={true}
          toolbarEnabled={true}
          loadingEnabled={true}
          loadingIndicatorColor="#2196F3"
        />
      </View>
      
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
      
      <Text style={styles.note}>
        Map Provider: {mapProvider ? 'Google Maps' : 'Default (Apple Maps)'}
        {mapProvider && ` (API Key: ${googleMapsApiKey ? googleMapsApiKey.substring(0, 6) + '...' : 'Not set'})`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 16,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
    padding: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  note: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    textAlign: 'center',
  }
});

export default MapTest; 