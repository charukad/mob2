import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Avatar, Divider, Badge, IconButton, Menu } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

const ReviewCard = ({
  review,
  showEntityDetails = false,
  onHelpfulPress,
  onReportPress,
  onReplyPress,
  onEditPress,
  onDeletePress,
  style = {}
}) => {
  const [expanded, setExpanded] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Check if review has photos
  const hasPhotos = review.photos && review.photos.length > 0;
  
  // Check if review text is long
  const hasLongText = review.text && review.text.length > 150;
  
  // Format the date
  const formattedDate = format(new Date(review.date), 'MMM d, yyyy');
  
  // Get star rating components
  const renderStars = () => {
    const stars = [];
    
    for (let i = 0; i < 5; i++) {
      const starName = i < Math.floor(review.rating) 
        ? 'star' 
        : (i === Math.floor(review.rating) && review.rating % 1 !== 0) 
          ? 'star-half-full' 
          : 'star-outline';
          
      stars.push(
        <MaterialCommunityIcons 
          key={i} 
          name={starName} 
          size={16} 
          color="#FFC107" 
          style={styles.star}
        />
      );
    }
    
    return stars;
  };
  
  // Handle helpful button press
  const handleHelpfulPress = () => {
    if (onHelpfulPress) {
      onHelpfulPress(review.id);
    }
  };
  
  // Handle report button press
  const handleReportPress = () => {
    if (onReportPress) {
      onReportPress(review.id);
    }
    setMenuVisible(false);
  };
  
  // Handle reply button press
  const handleReplyPress = () => {
    if (onReplyPress) {
      onReplyPress(review.id);
    }
  };
  
  // Handle edit button press
  const handleEditPress = () => {
    if (onEditPress) {
      onEditPress(review.id);
    }
    setMenuVisible(false);
  };
  
  // Handle delete button press
  const handleDeletePress = () => {
    if (onDeletePress) {
      onDeletePress(review.id);
    }
    setMenuVisible(false);
  };
  
  return (
    <Card style={[styles.card, style]}>
      <Card.Content>
        {/* Header section with user info and date */}
        <View style={styles.header}>
          <View style={styles.userContainer}>
            <Avatar.Image 
              source={{ uri: review.user.avatar }} 
              size={40} 
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{review.user.name}</Text>
              <Text style={styles.reviewCount}>
                {review.user.reviewCount} {review.user.reviewCount === 1 ? 'review' : 'reviews'}
              </Text>
            </View>
          </View>
          
          <View style={styles.dateContainer}>
            <Text style={styles.date}>{formattedDate}</Text>
            
            {/* Menu for more options */}
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  size={20}
                  onPress={() => setMenuVisible(true)}
                />
              }
            >
              {review.isOwn && (
                <>
                  <Menu.Item 
                    onPress={handleEditPress} 
                    title="Edit" 
                    icon="pencil" 
                  />
                  <Menu.Item 
                    onPress={handleDeletePress} 
                    title="Delete" 
                    icon="delete" 
                  />
                  <Divider />
                </>
              )}
              
              {!review.isOwn && (
                <Menu.Item 
                  onPress={handleReportPress} 
                  title="Report" 
                  icon="flag" 
                />
              )}
            </Menu>
          </View>
        </View>
        
        {/* Entity details (if showing) */}
        {showEntityDetails && review.entity && (
          <View style={styles.entityContainer}>
            <Text style={styles.entityTitle}>Review for: {review.entity.name}</Text>
            <Text style={styles.entityType}>
              {review.entity.type === 'guide' ? 'Tour Guide' : 
               review.entity.type === 'vehicle' ? 'Vehicle' :
               review.entity.type === 'location' ? 'Location' : 'Service'}
            </Text>
          </View>
        )}
        
        {/* Rating */}
        <View style={styles.ratingContainer}>
          <View style={styles.starsContainer}>
            {renderStars()}
            <Text style={styles.ratingText}>{review.rating.toFixed(1)}</Text>
          </View>
          
          {review.verified && (
            <Badge style={styles.verifiedBadge}>Verified Visit</Badge>
          )}
        </View>
        
        {/* Review Text */}
        <View style={styles.textContainer}>
          <Text 
            style={styles.reviewText}
            numberOfLines={expanded ? undefined : 3}
          >
            {review.text}
          </Text>
          
          {hasLongText && (
            <TouchableOpacity 
              onPress={() => setExpanded(!expanded)}
              style={styles.expandButton}
            >
              <Text style={styles.expandButtonText}>
                {expanded ? 'Show less' : 'Show more'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Detailed Ratings */}
        {review.detailedRatings && (
          <View style={styles.detailedRatingsContainer}>
            {Object.entries(review.detailedRatings).map(([key, value]) => (
              <View key={key} style={styles.detailedRatingItem}>
                <Text style={styles.detailedRatingLabel}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
                <View style={styles.detailedRatingStars}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <MaterialCommunityIcons 
                      key={star} 
                      name={star <= value ? 'star' : 'star-outline'} 
                      size={14} 
                      color="#FFC107" 
                      style={styles.detailedStar}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
        
        {/* Photos section (if any) */}
        {hasPhotos && (
          <View style={styles.photosContainer}>
            <Text style={styles.photosTitle}>Photos</Text>
            <View style={styles.photoGrid}>
              {review.photos.map((photo, index) => (
                <Card.Cover 
                  key={index} 
                  source={{ uri: photo }} 
                  style={styles.photo}
                />
              ))}
            </View>
          </View>
        )}
        
        {/* Actions section */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleHelpfulPress}
          >
            <MaterialCommunityIcons 
              name={review.foundHelpful ? "thumb-up" : "thumb-up-outline"} 
              size={20} 
              color={review.foundHelpful ? "#4CAF50" : "#757575"} 
            />
            <Text style={[
              styles.actionText, 
              review.foundHelpful && { color: "#4CAF50" }
            ]}>
              Helpful ({review.helpfulCount || 0})
            </Text>
          </TouchableOpacity>
          
          {review.canReply && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleReplyPress}
            >
              <MaterialCommunityIcons name="reply" size={20} color="#757575" />
              <Text style={styles.actionText}>Reply</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Reply section if there's a response */}
        {review.response && (
          <View style={styles.responseContainer}>
            <View style={styles.responseHeader}>
              <Text style={styles.responseFrom}>
                Response from {review.entity.name}
              </Text>
              <Text style={styles.responseDate}>
                {format(new Date(review.response.date), 'MMM d, yyyy')}
              </Text>
            </View>
            <Text style={styles.responseText}>{review.response.text}</Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    marginLeft: 12,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  reviewCount: {
    fontSize: 12,
    color: '#757575',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: '#757575',
  },
  entityContainer: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
  },
  entityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  entityType: {
    fontSize: 12,
    color: '#757575',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 2,
  },
  ratingText: {
    marginLeft: 4,
    fontWeight: 'bold',
    fontSize: 16,
  },
  verifiedBadge: {
    backgroundColor: '#4CAF50',
    color: 'white',
  },
  textContainer: {
    marginBottom: 12,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
  },
  expandButton: {
    marginTop: 4,
  },
  expandButtonText: {
    color: '#2196F3',
    fontSize: 14,
  },
  detailedRatingsContainer: {
    marginBottom: 12,
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 4,
  },
  detailedRatingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  detailedRatingLabel: {
    fontSize: 13,
    color: '#757575',
  },
  detailedRatingStars: {
    flexDirection: 'row',
  },
  detailedStar: {
    marginHorizontal: 1,
  },
  photosContainer: {
    marginBottom: 12,
  },
  photosTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  photo: {
    width: '31%',
    aspectRatio: 1,
    marginHorizontal: 4,
    marginBottom: 8,
    borderRadius: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#757575',
  },
  responseContainer: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 4,
    marginTop: 4,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  responseFrom: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  responseDate: {
    fontSize: 12,
    color: '#757575',
  },
  responseText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default ReviewCard;