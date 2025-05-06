import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView
} from 'react-native';
import {
  Appbar,
  TextInput,
  Button,
  Text,
  Divider,
  Chip,
  Switch,
  HelperText
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';

import RatingInput from '../../components/reviews/RatingInput';
import { createReview, updateReview } from '../../store/slices/reviewsSlice';

const WriteReviewScreen = ({ navigation, route }) => {
  const { entityId, entityType, entityName, reviewId } = route.params || {};
  const dispatch = useDispatch();
  
  // Get existing review if editing
  const existingReview = useSelector(state => 
    reviewId ? state.reviews.reviews.find(r => r.id === reviewId) : null
  );
  
  const { loading } = useSelector(state => state.reviews);
  
  // State for the review form
  const [overallRating, setOverallRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [photos, setPhotos] = useState([]);
  const [anonymous, setAnonymous] = useState(false);
  const [detailedRatings, setDetailedRatings] = useState({});
  const [errors, setErrors] = useState({});
  
  // Get criteria based on entity type
  const getCriteriaForEntityType = () => {
    switch (entityType) {
      case 'guide':
        return {
          knowledge: 'Knowledge',
          communication: 'Communication',
          friendliness: 'Friendliness',
          value: 'Value for Money'
        };
      case 'vehicle':
        return {
          comfort: 'Comfort',
          cleanliness: 'Cleanliness',
          driverSkill: 'Driver Skill',
          value: 'Value for Money'
        };
      case 'location':
        return {
          beauty: 'Beauty',
          accessibility: 'Accessibility',
          facilities: 'Facilities',
          value: 'Value for Money'
        };
      default:
        return {};
    }
  };
  
  // Set up detailed rating criteria based on entity type
  useEffect(() => {
    const criteria = getCriteriaForEntityType();
    
    // Initialize detailed ratings
    const initialRatings = {};
    Object.keys(criteria).forEach(key => {
      initialRatings[key] = 0;
    });
    
    setDetailedRatings(initialRatings);
  }, [entityType]);
  
  // Load existing review data if editing
  useEffect(() => {
    if (existingReview) {
      setOverallRating(existingReview.rating);
      setReviewText(existingReview.text);
      setPhotos(existingReview.photos || []);
      setAnonymous(existingReview.anonymous || false);
      
      if (existingReview.detailedRatings) {
        setDetailedRatings(existingReview.detailedRatings);
      }
    }
  }, [existingReview]);
  
  // Request permission for camera roll
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Sorry, we need camera roll permissions to upload photos!'
          );
        }
      }
    })();
  }, []);
  
  // Validate the form
  const validateForm = () => {
    const validationErrors = {};
    
    if (overallRating === 0) {
      validationErrors.overallRating = 'Please provide an overall rating';
    }
    
    if (!reviewText.trim()) {
      validationErrors.reviewText = 'Please provide review text';
    } else if (reviewText.trim().length < 5) {
      validationErrors.reviewText = 'Review text is too short';
    }
    
    // Check if all detailed ratings are provided
    Object.keys(detailedRatings).forEach(key => {
      if (detailedRatings[key] === 0) {
        validationErrors.detailedRatings = 'Please rate all criteria';
      }
    });
    
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };
  
  // Handle overall rating change
  const handleRatingChange = (rating) => {
    setOverallRating(rating);
    if (errors.overallRating) {
      setErrors(prev => ({ ...prev, overallRating: undefined }));
    }
  };
  
  // Handle detailed rating change
  const handleDetailedRatingChange = (criterion, rating) => {
    setDetailedRatings(prev => ({
      ...prev,
      [criterion]: rating
    }));
    
    if (errors.detailedRatings) {
      setErrors(prev => ({ ...prev, detailedRatings: undefined }));
    }
  };
  
  // Handle text input change
  const handleTextChange = (text) => {
    setReviewText(text);
    if (errors.reviewText && text.trim().length >= 5) {
      setErrors(prev => ({ ...prev, reviewText: undefined }));
    }
  };
  
  // Handle photo selection
  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Add the new photo to the existing photos
        setPhotos([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };
  
  // Remove a photo
  const removePhoto = (index) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };
  
  // Submit the review
  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }
    
    const reviewData = {
      entityId,
      entityType,
      rating: overallRating,
      text: reviewText,
      photos,
      anonymous,
      detailedRatings
    };
    
    if (reviewId) {
      // Update existing review
      dispatch(updateReview({ reviewId, reviewData })).then(action => {
        if (!action.error) {
          navigation.goBack();
        }
      });
    } else {
      // Create new review
      dispatch(createReview(reviewData)).then(action => {
        if (!action.error) {
          navigation.goBack();
        }
      });
    }
  };
  
  // Render criteria ratings
  const renderDetailedRatings = () => {
    const criteria = getCriteriaForEntityType();
    
    return Object.entries(criteria).map(([key, label]) => (
      <View key={key} style={styles.criterionContainer}>
        <Text style={styles.criterionLabel}>{label}</Text>
        <RatingInput
          initialValue={detailedRatings[key] || 0}
          size={32}
          showLabel={false}
          onRatingChange={(rating) => handleDetailedRatingChange(key, rating)}
          style={styles.criterionRating}
        />
      </View>
    ));
  };
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={reviewId ? 'Edit Review' : 'Write a Review'} />
      </Appbar.Header>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Entity info section */}
        <View style={styles.entityContainer}>
          <Text style={styles.entityTitle}>
            {entityName}
          </Text>
          <Chip 
            icon={
              entityType === 'guide' ? 'account-tie' :
              entityType === 'vehicle' ? 'car' :
              entityType === 'location' ? 'map-marker' : 'information'
            }
            style={styles.entityTypeChip}
          >
            {entityType === 'guide' ? 'Tour Guide' :
             entityType === 'vehicle' ? 'Vehicle' :
             entityType === 'location' ? 'Location' : 'Service'}
          </Chip>
        </View>
        
        <Divider style={styles.divider} />
        
        {/* Overall rating section */}
        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>Overall Rating</Text>
          <RatingInput
            initialValue={overallRating}
            onRatingChange={handleRatingChange}
            size={48}
            style={styles.overallRating}
          />
          {errors.overallRating && (
            <HelperText type="error" visible={true}>
              {errors.overallRating}
            </HelperText>
          )}
        </View>
        
        <Divider style={styles.divider} />
        
        {/* Detailed ratings section */}
        {Object.keys(detailedRatings).length > 0 && (
          <>
            <View style={styles.detailedRatingSection}>
              <Text style={styles.sectionTitle}>Rate Specific Aspects</Text>
              {renderDetailedRatings()}
              {errors.detailedRatings && (
                <HelperText type="error" visible={true}>
                  {errors.detailedRatings}
                </HelperText>
              )}
            </View>
            
            <Divider style={styles.divider} />
          </>
        )}
        
        {/* Review text section */}
        <View style={styles.textSection}>
          <Text style={styles.sectionTitle}>Your Review</Text>
          <TextInput
            mode="outlined"
            multiline
            numberOfLines={5}
            placeholder="Share your experience! What did you like? What could be improved?"
            value={reviewText}
            onChangeText={handleTextChange}
            style={styles.textInput}
          />
          {errors.reviewText && (
            <HelperText type="error" visible={true}>
              {errors.reviewText}
            </HelperText>
          )}
        </View>
        
        {/* Photo upload section */}
        <View style={styles.photoSection}>
          <Text style={styles.sectionTitle}>Add Photos</Text>
          <Text style={styles.photoDescription}>
            Share your experience with photos (optional)
          </Text>
          
          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photo }} style={styles.photoThumbnail} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => removePhoto(index)}
                >
                  <MaterialCommunityIcons name="close-circle" size={24} color="white" />
                </TouchableOpacity>
              </View>
            ))}
            
            {photos.length < 5 && (
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={pickImage}
              >
                <MaterialCommunityIcons name="camera-plus" size={32} color="#757575" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Options section */}
        <View style={styles.optionsSection}>
          <View style={styles.switchContainer}>
            <Text>Post anonymously</Text>
            <Switch
              value={anonymous}
              onValueChange={setAnonymous}
            />
          </View>
          <Text style={styles.anonymousDescription}>
            Your review will be posted without your name and profile photo
          </Text>
        </View>
        
        {/* Submit button */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={loading}
          style={styles.submitButton}
          loading={loading}
        >
          {reviewId ? 'Update Review' : 'Submit Review'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  entityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  entityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  entityTypeChip: {
    backgroundColor: '#E0E0E0',
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  ratingSection: {
    alignItems: 'center',
  },
  overallRating: {
    marginTop: 8,
  },
  detailedRatingSection: {
    marginBottom: 8,
  },
  criterionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  criterionLabel: {
    fontSize: 14,
    flex: 1,
  },
  criterionRating: {
    flex: 2,
  },
  textSection: {
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: 'white',
  },
  photoSection: {
    marginBottom: 16,
  },
  photoDescription: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  photoContainer: {
    width: 100,
    height: 100,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    margin: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  optionsSection: {
    marginBottom: 24,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  anonymousDescription: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  submitButton: {
    marginTop: 16,
    padding: 4,
  },
});

export default WriteReviewScreen;