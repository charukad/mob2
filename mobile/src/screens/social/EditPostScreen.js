import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  Alert,
  KeyboardAvoidingView
} from 'react-native';
import {
  Appbar,
  TextInput,
  Button,
  Text,
  Chip,
  ActivityIndicator,
  Divider,
  IconButton,
  Surface
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';

// This would be imported from your social slice when implemented
// import { updatePost, fetchPostById } from '../../store/slices/socialSlice';

const EditPostScreen = ({ route, navigation }) => {
  const { postId } = route.params;
  const dispatch = useDispatch();
  
  // These would come from your Redux state when implemented
  // const { currentPost, loading, error } = useSelector(state => state.social);
  
  // Local state
  const [post, setPost] = useState(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState(null);
  const [images, setImages] = useState([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch post data when component mounts
  useEffect(() => {
    fetchPostData();
  }, [postId]);
  
  // Request camera roll permissions
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
  
  // Fetch post data
  const fetchPostData = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, you would use Redux:
      // await dispatch(fetchPostById(postId));
      
      // Simulating API call with a timeout and mock data
      setTimeout(() => {
        const mockPost = {
          id: postId,
          caption: 'Beautiful sunset at Galle Fort! 🌅 #travel #srilanka',
          location: {
            id: 'loc1',
            name: 'Galle Fort',
            latitude: 6.0269,
            longitude: 80.2167
          },
          images: [
            'https://images.unsplash.com/photo-1580181590158-7a2d0a7b0398',
            'https://images.unsplash.com/photo-1557159557-7a93fb727df3'
          ],
          isPrivate: false,
          tags: ['travel', 'srilanka', 'sunset'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        setPost(mockPost);
        setCaption(mockPost.caption);
        setLocation(mockPost.location);
        setImages(mockPost.images);
        setIsPrivate(mockPost.isPrivate);
        setTags(mockPost.tags);
        
        setLoading(false);
      }, 1000);
    } catch (err) {
      console.error('Error fetching post:', err);
      setError('Failed to load post. Please try again.');
      setLoading(false);
    }
  };
  
  // Handle adding images
  const handleAddImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 5 - images.length
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Add the new images to the existing images
        const newImages = result.assets.map(asset => asset.uri);
        setImages([...images, ...newImages]);
      }
    } catch (err) {
      console.error('Error picking images:', err);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };
  
  // Handle removing an image
  const handleRemoveImage = (indexToRemove) => {
    setImages(images.filter((_, index) => index !== indexToRemove));
  };
  
  // Handle location selection
  const handleSelectLocation = () => {
    navigation.navigate('LocationPicker', {
      onLocationSelected: (selectedLocation) => {
        setLocation(selectedLocation);
      },
      initialLocation: location
    });
  };
  
  // Handle adding a tag
  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '');
    
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };
  
  // Handle removing a tag
  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  // Extract hashtags from caption
  const extractHashtags = (text) => {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    
    if (matches) {
      return matches.map(tag => tag.substring(1));
    }
    
    return [];
  };
  
  // Handle post update
  const handleUpdatePost = async () => {
    try {
      if (!caption.trim()) {
        Alert.alert('Error', 'Please add a caption to your post.');
        return;
      }
      
      if (images.length === 0) {
        Alert.alert('Error', 'Please add at least one image to your post.');
        return;
      }
      
      setSubmitting(true);
      
      // Extract hashtags from caption and combine with manual tags
      const hashtagsFromCaption = extractHashtags(caption);
      const allTags = [...new Set([...tags, ...hashtagsFromCaption])];
      
      const updatedPost = {
        id: postId,
        caption,
        location,
        images,
        isPrivate,
        tags: allTags
      };
      
      // In a real implementation, you would use Redux:
      // await dispatch(updatePost(updatedPost));
      
      // Simulate API call with a timeout
      setTimeout(() => {
        setSubmitting(false);
        navigation.goBack();
      }, 1000);
    } catch (err) {
      console.error('Error updating post:', err);
      setSubmitting(false);
      Alert.alert('Error', 'Failed to update post. Please try again.');
    }
  };
  
  // Render image gallery
  const renderImageGallery = () => {
    return (
      <View style={styles.imagesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.imageGallery}
        >
          {images.map((image, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image source={{ uri: image }} style={styles.image} />
              <IconButton
                icon="close-circle"
                size={20}
                color="#FFFFFF"
                style={styles.removeImageButton}
                onPress={() => handleRemoveImage(index)}
              />
            </View>
          ))}
          
          {images.length < 5 && (
            <TouchableOpacity 
              style={styles.addImageButton}
              onPress={handleAddImages}
            >
              <MaterialCommunityIcons name="camera-plus" size={32} color="#757575" />
              <Text style={styles.addImageText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        
        <Text style={styles.imageCounter}>
          {images.length}/5 photos
        </Text>
      </View>
    );
  };
  
  // Render tags
  const renderTags = () => {
    return (
      <View style={styles.tagsSection}>
        <Text style={styles.sectionLabel}>Tags</Text>
        
        <View style={styles.tagInput}>
          <TextInput
            value={tagInput}
            onChangeText={setTagInput}
            placeholder="Add a tag (e.g. travel)"
            style={styles.tagInputField}
            right={
              <TextInput.Icon 
                icon="plus" 
                onPress={handleAddTag}
                disabled={!tagInput.trim()} 
              />
            }
            onSubmitEditing={handleAddTag}
          />
        </View>
        
        <View style={styles.tagsContainer}>
          {tags.map(tag => (
            <Chip
              key={tag}
              style={styles.tagChip}
              closeIcon="close"
              onClose={() => handleRemoveTag(tag)}
            >
              #{tag}
            </Chip>
          ))}
          
          {tags.length === 0 && (
            <Text style={styles.noTagsText}>
              No tags yet. Add tags to make your post more discoverable.
            </Text>
          )}
        </View>
      </View>
    );
  };
  
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading post...</Text>
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 92 : 0}
    >
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Edit Post" />
        <Appbar.Action 
          icon="check" 
          onPress={handleUpdatePost} 
          disabled={submitting}
        />
      </Appbar.Header>
      
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button 
            mode="contained" 
            onPress={fetchPostData}
            style={styles.retryButton}
          >
            Retry
          </Button>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Image Gallery */}
          {renderImageGallery()}
          
          <Divider style={styles.divider} />
          
          {/* Caption Input */}
          <View style={styles.captionContainer}>
            <Text style={styles.sectionLabel}>Caption</Text>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Write a caption..."
              multiline
              numberOfLines={4}
              style={styles.captionInput}
            />
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Location Selection */}
          <View style={styles.locationSection}>
            <Text style={styles.sectionLabel}>Location</Text>
            
            <TouchableOpacity 
              style={styles.locationButton}
              onPress={handleSelectLocation}
            >
              {location ? (
                <View style={styles.selectedLocation}>
                  <MaterialCommunityIcons name="map-marker" size={20} color="#2196F3" />
                  <Text style={styles.locationText}>{location.name}</Text>
                </View>
              ) : (
                <View style={styles.addLocationContainer}>
                  <MaterialCommunityIcons name="map-marker-plus" size={20} color="#757575" />
                  <Text style={styles.addLocationText}>Add Location</Text>
                </View>
              )}
              
              <MaterialCommunityIcons name="chevron-right" size={20} color="#757575" />
            </TouchableOpacity>
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Tags */}
          {renderTags()}
          
          <Divider style={styles.divider} />
          
          {/* Privacy Settings */}
          <View style={styles.privacySection}>
            <Text style={styles.sectionLabel}>Privacy</Text>
            
            <Surface style={styles.privacyOptionsContainer}>
              <TouchableOpacity
                style={[
                  styles.privacyOption,
                  !isPrivate && styles.selectedPrivacyOption
                ]}
                onPress={() => setIsPrivate(false)}
              >
                <MaterialCommunityIcons 
                  name="earth" 
                  size={24} 
                  color={!isPrivate ? "#2196F3" : "#757575"} 
                />
                <View style={styles.privacyOptionTextContainer}>
                  <Text style={[
                    styles.privacyOptionTitle,
                    !isPrivate && styles.selectedPrivacyOptionText
                  ]}>
                    Public
                  </Text>
                  <Text style={styles.privacyOptionDescription}>
                    Anyone can see this post
                  </Text>
                </View>
              </TouchableOpacity>
              
              <Divider />
              
              <TouchableOpacity
                style={[
                  styles.privacyOption,
                  isPrivate && styles.selectedPrivacyOption
                ]}
                onPress={() => setIsPrivate(true)}
              >
                <MaterialCommunityIcons 
                  name="lock" 
                  size={24} 
                  color={isPrivate ? "#2196F3" : "#757575"} 
                />
                <View style={styles.privacyOptionTextContainer}>
                  <Text style={[
                    styles.privacyOptionTitle,
                    isPrivate && styles.selectedPrivacyOptionText
                  ]}>
                    Private
                  </Text>
                  <Text style={styles.privacyOptionDescription}>
                    Only you can see this post
                  </Text>
                </View>
              </TouchableOpacity>
            </Surface>
          </View>
          
          {/* Update Button for bottom of screen */}
          <Button
            mode="contained"
            onPress={handleUpdatePost}
            loading={submitting}
            disabled={submitting}
            style={styles.updateButton}
          >
            Update Post
          </Button>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 8,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  divider: {
    marginVertical: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  imagesContainer: {
    marginTop: 16,
  },
  imageGallery: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 8,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    margin: 0,
  },
  addImageButton: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  addImageText: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  imageCounter: {
    fontSize: 12,
    color: '#757575',
    marginTop: 8,
    textAlign: 'right',
    paddingHorizontal: 16,
  },
  captionContainer: {
    marginBottom: 16,
  },
  captionInput: {
    marginHorizontal: 16,
    backgroundColor: 'white',
  },
  locationSection: {
    marginBottom: 16,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  selectedLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 16,
    marginLeft: 8,
  },
  addLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addLocationText: {
    fontSize: 16,
    color: '#757575',
    marginLeft: 8,
  },
  tagsSection: {
    marginBottom: 16,
  },
  tagInput: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  tagInputField: {
    backgroundColor: 'white',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  tagChip: {
    margin: 4,
  },
  noTagsText: {
    color: '#757575',
    fontStyle: 'italic',
    padding: 8,
  },
  privacySection: {
    marginBottom: 24,
  },
  privacyOptionsContainer: {
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  selectedPrivacyOption: {
    backgroundColor: '#E3F2FD',
  },
  privacyOptionTextContainer: {
    marginLeft: 16,
  },
  privacyOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedPrivacyOptionText: {
    color: '#2196F3',
  },
  privacyOptionDescription: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  updateButton: {
    marginTop: 8,
    marginHorizontal: 16,
  },
});

export default EditPostScreen;