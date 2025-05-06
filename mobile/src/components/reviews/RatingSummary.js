import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const RatingSummary = ({
  averageRating = 0,
  reviewCount = 0,
  ratingDistribution = {},
  style = {}
}) => {
  // Generate star components for average rating
  const renderStars = () => {
    const stars = [];
    
    for (let i = 0; i < 5; i++) {
      const starName = i < Math.floor(averageRating) 
        ? 'star' 
        : (i === Math.floor(averageRating) && averageRating % 1 !== 0) 
          ? 'star-half-full' 
          : 'star-outline';
          
      stars.push(
        <MaterialCommunityIcons 
          key={i} 
          name={starName} 
          size={24} 
          color="#FFC107" 
          style={styles.star}
        />
      );
    }
    
    return stars;
  };
  
  // Calculate percentage for distribution bars
  const getPercentageForRating = (rating) => {
    if (!reviewCount || !ratingDistribution[rating]) return 0;
    return (ratingDistribution[rating] / reviewCount) * 100;
  };
  
  // Generate rating distribution bars
  const renderDistribution = () => {
    const bars = [];
    
    for (let i = 5; i >= 1; i--) {
      const percentage = getPercentageForRating(i);
      
      bars.push(
        <View key={i} style={styles.distributionRow}>
          <Text style={styles.ratingLabel}>{i} stars</Text>
          <View style={styles.barContainer}>
            <View 
              style={[
                styles.bar, 
                { width: `${percentage}%` }
              ]}
            />
          </View>
          <Text style={styles.ratingCount}>
            {ratingDistribution[i] || 0}
          </Text>
        </View>
      );
    }
    
    return bars;
  };
  
  // Get text description for the average rating
  const getRatingDescription = () => {
    if (averageRating >= 4.5) return 'Exceptional';
    if (averageRating >= 4) return 'Excellent';
    if (averageRating >= 3.5) return 'Very Good';
    if (averageRating >= 3) return 'Good';
    if (averageRating >= 2) return 'Fair';
    return 'Poor';
  };
  
  return (
    <View style={[styles.container, style]}>
      <View style={styles.summaryContainer}>
        <View style={styles.averageContainer}>
          <Text style={styles.averageRating}>
            {averageRating.toFixed(1)}
          </Text>
          <View style={styles.starsContainer}>
            {renderStars()}
          </View>
          <Text style={styles.ratingDescription}>
            {getRatingDescription()}
          </Text>
          <Text style={styles.totalReviews}>
            {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
          </Text>
        </View>
        
        <View style={styles.distributionContainer}>
          {renderDistribution()}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  summaryContainer: {
    flexDirection: 'row',
  },
  averageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
  },
  averageRating: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#212121',
  },
  starsContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  star: {
    marginHorizontal: 2,
  },
  ratingDescription: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
    color: '#424242',
  },
  totalReviews: {
    marginTop: 4,
    color: '#757575',
  },
  distributionContainer: {
    flex: 1.5,
    justifyContent: 'center',
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  ratingLabel: {
    width: 60,
    fontSize: 14,
    color: '#757575',
  },
  barContainer: {
    flex: 1,
    height: 12,
    backgroundColor: '#EEEEEE',
    borderRadius: 6,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: '#FFC107',
    borderRadius: 6,
  },
  ratingCount: {
    width: 30,
    fontSize: 12,
    color: '#757575',
    textAlign: 'right',
  },
});

export default RatingSummary;