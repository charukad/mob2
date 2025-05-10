import React from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, Appbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../utils/themeUtils';
import LocationMarker from '../../components/maps/LocationMarker';

const LocationsList = ({ route, navigation }) => {
  const { searchResults = [], searchQuery = '' } = route.params || {};

  // Handle location selection
  const handleLocationSelect = (location) => {
    if (route.params?.onPlaceSelected) {
      // Convert local location to the place format needed for itinerary
      const selectedPlace = {
        placeId: location._id,
        name: location.name,
        latitude: location.coordinates.latitude,
        longitude: location.coordinates.longitude,
        address: `${location.address.street || ''}, ${location.address.city || ''}, ${location.address.province || ''}, Sri Lanka`,
        rating: location.averageRating || 0,
        types: [location.type],
        photos: location.images || [],
      };
      
      // Call the callback with the selected place
      route.params.onPlaceSelected(selectedPlace);
      // Navigate back
      navigation.goBack();
    } else {
      // Normal flow - navigate to location detail
      navigation.navigate('LocationDetail', { id: location._id });
    }
  };

  // Render location item
  const renderLocationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.locationItem}
      onPress={() => handleLocationSelect(item)}
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
      <Ionicons name="search" size={64} color={colors.divider} />
      <Text style={styles.emptyTitle}>No results found</Text>
      <Text style={styles.emptySubtitle}>
        Try a different search term or filter
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content 
          title={searchQuery ? `Results for "${searchQuery}"` : "Search Results"} 
          subtitle={`${searchResults.length} locations found`}
        />
        <Appbar.Action 
          icon="map" 
          onPress={() => navigation.goBack()} 
          tooltip="Back to Map View"
        />
      </Appbar.Header>

      <FlatList
        data={searchResults}
        renderItem={renderLocationItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.resultsContainer}
        ListEmptyComponent={renderEmptyState()}
        initialNumToRender={10}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
});

export default LocationsList; 