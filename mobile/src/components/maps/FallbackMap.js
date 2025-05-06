import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../utils/themeUtils';

const FallbackMap = ({ onRetry }) => {
  // Center of Sri Lanka
  const initialRegion = {
    latitude: 7.8731,
    longitude: 80.7718,
    latitudeDelta: 3.0,
    longitudeDelta: 3.0,
  };

  return (
    <View style={styles.container}>
      {/* Use MapView without specifying a provider to use the default native map */}
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsCompass={true}
        loadingEnabled={true}
      />
      
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>Using native maps. Google Maps unavailable.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Ionicons name="refresh" size={20} color="white" />
          <Text style={styles.retryText}>Retry Google Maps</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  messageContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  messageText: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  retryText: {
    color: 'white',
    marginLeft: 5,
  },
});

export default FallbackMap; 