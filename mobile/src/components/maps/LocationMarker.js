import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

// Change this import to use the new utility file
import { colors } from '../../utils/themeUtils';

const LocationMarker = ({ type, size = 'medium' }) => {
  // Size variables
  const sizes = {
    small: {
      container: 24,
      icon: 12,
    },
    medium: {
      container: 32,
      icon: 18,
    },
    large: {
      container: 40,
      icon: 22,
    },
  };
  
  const selectedSize = sizes[size] || sizes.medium;
  
  // Get icon based on location type
  const getIcon = () => {
    switch (type) {
      case 'beach':
        return <FontAwesome5 name="umbrella-beach" size={selectedSize.icon} color={colors.background} />;
      case 'mountain':
        return <FontAwesome5 name="mountain" size={selectedSize.icon} color={colors.background} />;
      case 'temple':
        return <FontAwesome5 name="gopuram" size={selectedSize.icon} color={colors.background} />;
      case 'historical':
        return <FontAwesome5 name="landmark" size={selectedSize.icon} color={colors.background} />;
      case 'museum':
        return <FontAwesome5 name="university" size={selectedSize.icon} color={colors.background} />;
      case 'park':
        return <FontAwesome5 name="tree" size={selectedSize.icon} color={colors.background} />;
      case 'wildlife':
        return <MaterialCommunityIcons name="elephant" size={selectedSize.icon} color={colors.background} />;
      case 'waterfall':
        return <MaterialCommunityIcons name="waterfall" size={selectedSize.icon} color={colors.background} />;
      case 'viewpoint':
        return <MaterialCommunityIcons name="image-filter-hdr" size={selectedSize.icon} color={colors.background} />;
      case 'hotel':
        return <FontAwesome5 name="hotel" size={selectedSize.icon} color={colors.background} />;
      case 'restaurant':
        return <Ionicons name="restaurant" size={selectedSize.icon} color={colors.background} />;
      case 'shopping':
        return <FontAwesome5 name="shopping-bag" size={selectedSize.icon} color={colors.background} />;
      case 'entertainment':
        return <Ionicons name="game-controller" size={selectedSize.icon} color={colors.background} />;
      default:
        return <Ionicons name="location-sharp" size={selectedSize.icon} color={colors.background} />;
    }
  };
  
  // Get color based on location type
  const getColor = () => {
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

  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: getColor(),
        width: selectedSize.container,
        height: selectedSize.container,
        borderRadius: selectedSize.container / 2
      }
    ]}>
      {getIcon()}
      <View style={[
        styles.pointer,
        { borderTopWidth: selectedSize.container / 3 }
      ]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  pointer: {
    position: 'absolute',
    bottom: -10,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopColor: 'currentColor',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});

export default LocationMarker;