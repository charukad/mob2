import React from 'react';
import { View, StyleSheet } from 'react-native';

import LocationPicker from '../../components/itinerary/LocationPicker';

const LocationPickerScreen = ({ navigation, route }) => {
  const { onSelectLocation, initialLocation } = route.params || {};
  
  const handleSelectLocation = (location) => {
    if (onSelectLocation && route.params?.returnScreen) {
      navigation.navigate(route.params.returnScreen, {
        selectedLocation: location,
        ...route.params.additionalParams
      });
    } else {
      navigation.goBack();
    }
  };
  
  return (
    <View style={styles.container}>
      <LocationPicker
        onSelectLocation={handleSelectLocation}
        onClose={() => navigation.goBack()}
        initialLocation={initialLocation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default LocationPickerScreen;