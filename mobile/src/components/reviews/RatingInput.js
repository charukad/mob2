import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';

const RatingInput = ({ 
  initialValue = 0, 
  size = 36, 
  color = '#FFC107', 
  maxRating = 5,
  allowHalfRating = true, 
  disabled = false,
  showLabel = true,
  onRatingChange = () => {},
  style = {}
}) => {
  const [rating, setRating] = useState(initialValue);
  const [animations] = useState(() => Array(maxRating).fill(0).map(() => new Animated.Value(1)));
  
  useEffect(() => {
    setRating(initialValue);
  }, [initialValue]);
  
  // Animate star when selected
  const animateStar = (index) => {
    Animated.sequence([
      Animated.timing(animations[index], {
        toValue: 1.5,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(animations[index], {
        toValue: 1,
        duration: 150,
        useNativeDriver: true
      })
    ]).start();
  };
  
  // Handle star press or swipe
  const handleRatingChange = (newRating) => {
    if (disabled) return;
    
    setRating(newRating);
    onRatingChange(newRating);
    
    // Animate stars up to the selected rating
    for (let i = 0; i < Math.ceil(newRating); i++) {
      setTimeout(() => animateStar(i), i * 50);
    }
  };
  
  // Get label text based on rating
  const getRatingLabel = () => {
    if (rating === 0) return 'Tap to rate';
    if (rating <= 1) return 'Poor';
    if (rating <= 2) return 'Fair';
    if (rating <= 3) return 'Good';
    if (rating <= 4) return 'Very Good';
    return 'Excellent';
  };
  
  // Get star icon name based on filled state
  const getStarIcon = (position) => {
    if (rating >= position + 1) {
      return 'star';
    } else if (allowHalfRating && rating >= position + 0.5) {
      return 'star-half-full';
    }
    return 'star-outline';
  };
  
  // Generate star components
  const renderStars = () => {
    const stars = [];
    
    for (let i = 0; i < maxRating; i++) {
      // For half star precision
      const position = i;
      
      stars.push(
        <TouchableOpacity
          key={i}
          activeOpacity={disabled ? 1 : 0.7}
          onPress={() => handleRatingChange(position + 1)}
          // Support half ratings on long press
          onLongPress={() => allowHalfRating && handleRatingChange(position + 0.5)}
          disabled={disabled}
          style={{ padding: size / 10 }}
        >
          <Animated.View
            style={{
              transform: [{ scale: animations[i] }]
            }}
          >
            <MaterialCommunityIcons
              name={getStarIcon(position)}
              size={size}
              color={color}
              style={[
                styles.star,
                disabled && styles.disabledStar
              ]}
            />
          </Animated.View>
        </TouchableOpacity>
      );
    }
    
    return stars;
  };
  
  return (
    <View style={[styles.container, style]}>
      <View style={styles.starsContainer}>
        {renderStars()}
      </View>
      
      {showLabel && (
        <Text style={[
          styles.ratingLabel,
          { fontSize: size / 2.5 },
          disabled && styles.disabledText
        ]}>
          {getRatingLabel()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginHorizontal: 2,
  },
  disabledStar: {
    opacity: 0.6,
  },
  ratingLabel: {
    marginTop: 8,
    color: '#757575',
    fontWeight: '500',
  },
  disabledText: {
    opacity: 0.6,
  }
});

export default RatingInput;