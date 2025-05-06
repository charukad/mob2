import React from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

// Change this import to use the new utility file
import { colors, spacing } from '../../utils/themeUtils';

const { width } = Dimensions.get('window');
const MAX_HEIGHT = 250;

const BottomSheet = ({ visible, onClose, height, location, onViewDetails }) => {
  // Animation interpolation
  const translateY = height.interpolate({
    inputRange: [0, 1],
    outputRange: [MAX_HEIGHT, 0],
  });

  // If no image is available, use a default image
  const imageUrl = location.images && location.images.length > 0
    ? location.images[0]
    : 'https://via.placeholder.com/300x200?text=No+Image';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity: height,
        },
      ]}
    >
      <View style={styles.handle} />
      
      <IconButton
        icon="close"
        size={24}
        onPress={onClose}
        style={styles.closeButton}
      />
      
      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
          
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {location.category ? location.category.charAt(0).toUpperCase() + location.category.slice(1) : 'Place'}
            </Text>
          </View>
          
          {location.rating > 0 && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color={colors.accent} />
              <Text style={styles.ratingText}>
                {location.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.details}>
          <Text style={styles.title} numberOfLines={2}>{location.name}</Text>
          <Text style={styles.location}>
            <Ionicons name="location" size={14} color={colors.primary} />
            {' '}
            {location.location && location.location.city ? `${location.location.city}, Sri Lanka` : 'Sri Lanka'}
          </Text>
          
          <Text style={styles.description} numberOfLines={2}>
            {location.description ? 
              (location.description.length > 100 ? 
                location.description.substring(0, 100) + '...' : 
                location.description) : 
              'No description available'}
          </Text>
          
          <Button
            mode="contained"
            onPress={onViewDetails}
            style={styles.detailsButton}
          >
            View Details
          </Button>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    height: MAX_HEIGHT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.divider,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 10,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  imageContainer: {
    width: 120,
    marginRight: spacing.md,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  categoryText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: 'bold',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  details: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  location: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: 14,
    marginBottom: spacing.md,
  },
  detailsButton: {
    marginTop: 'auto',
  },
});

export default BottomSheet;