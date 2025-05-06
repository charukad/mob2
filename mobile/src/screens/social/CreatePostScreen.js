import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Appbar, Button, Text, Chip, Portal, Dialog } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

// Import redux actions
import { createPost } from '../../store/slices/socialSlice';

// Import components and utilities
import { COLORS, FONTS } from '../../constants/theme';
import { getProfileImageFromGlobal } from '../../utils/profileUtils';

const CreatePostScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector(state => state.social);
  const { user } = useSelector(state => state.auth);
  
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [location, setLocation] = useState(null);
  const [currentLocationLoading, setCurrentLocationLoading] = useState(false);
  const [discardDialogVisible, setDiscardDialogVisible] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  
  // Check for initial data (if editing or sharing)
  useEffect(() => {
    if (route.params?.initialContent) {
      setContent(route.params.initialContent);
    }
    
    if (route.params?.initialImages) {
      setImages(route.params.initialImages);
    }
    
    if (route.params?.initialLocation) {
      setLocation(route.params.initialLocation);
    }
  }, [route.params]);
  
  // Request permissions for camera and gallery
  useEffect(() => {
    (async () => {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || galleryStatus !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Please grant camera and photo library permissions to use this feature.'
        );
      }
    })();
  }, []);
  
  // Load avatar from global profile images
  useEffect(() => {
    const loadAvatar = async () => {
      try {
        if (user?.email) {
          const profileImageUrl = await getProfileImageFromGlobal(user.email);
          if (profileImageUrl && profileImageUrl.includes('cloudinary.com')) {
            setAvatarUrl(profileImageUrl);
          }
        }
      } catch (error) {
        console.error('Error loading avatar:', error);
      }
    };
    
    loadAvatar();
  }, [user]);
  
  // Handle image selection
  const handlePickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10 - images.length,
      });
      
      if (!result.canceled) {
        const selectedAssets = result.assets || [];
        if (images.length + selectedAssets.length > 10) {
          Alert.alert('Limit Exceeded', 'You can only add up to 10 images per post.');
          const remainingSlots = 10 - images.length;
          if (remainingSlots > 0) {
            setImages([...images, ...selectedAssets.slice(0, remainingSlots).map(asset => asset.uri)]);
          }
        } else {
          setImages([...images, ...selectedAssets.map(asset => asset.uri)]);
        }
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to select images. Please try again.');
    }
  };
  
  // Handle taking a photo
  const handleTakePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        quality: 0.8,
      });
      
      if (!result.canceled) {
        if (images.length >= 10) {
          Alert.alert('Limit Exceeded', 'You can only add up to 10 images per post.');
        } else {
          const asset = result.assets?.[0];
          if (asset) {
            setImages([...images, asset.uri]);
          }
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };
  
  // Handle removing an image
  const handleRemoveImage = (index) => {
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);
  };
  
  // Handle getting current location
  const handleGetCurrentLocation = async () => {
    try {
      setCurrentLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please grant location permissions to use this feature.'
        );
        setCurrentLocationLoading(false);
        return;
      }
      
      const currentLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = currentLocation.coords;
      
      // Geocode the coordinates to get an address
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      
      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        setLocation({
          name: place.name || `${place.city || place.region}, ${place.country}`,
          address: [
            place.street,
            place.city,
            place.region,
            place.country
          ].filter(Boolean).join(', '),
          coordinates: { latitude, longitude }
        });
      } else {
        setLocation({
          name: 'Current Location',
          address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          coordinates: { latitude, longitude }
        });
      }
      
      setCurrentLocationLoading(false);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your location. Please try again.');
      setCurrentLocationLoading(false);
    }
  };
  
  // Handle selecting a location (navigate to location picker)
  const handleSelectLocation = () => {
    navigation.navigate('LocationPicker', {
      onSelectLocation: (selectedLocation) => {
        setLocation(selectedLocation);
      },
      returnScreen: 'CreatePost',
      initialLocation: location
    });
  };
  
  // Handle removing location
  const handleRemoveLocation = () => {
    setLocation(null);
  };
  
  // Check if form has changes
  const hasChanges = content.trim() !== '' || images.length > 0 || location !== null;
  
  // Handle discard confirmation
  const handleBackPress = () => {
    if (hasChanges) {
      setDiscardDialogVisible(true);
    } else {
      navigation.goBack();
    }
  };
  
  // Handle post creation
  const handleCreatePost = async () => {
    if (!content.trim() && images.length === 0) {
      Alert.alert('Empty Post', 'Please add some content or images to your post.');
      return;
    }
    
    try {
      const postData = new FormData();
      postData.append('content', content.trim());
      
      if (location) {
        // Convert location object to string for FormData
        postData.append('location', JSON.stringify(location));
      }
      
      // Add images to form data
      images.forEach((imageUri, index) => {
        // Get filename from URI
        const uriParts = imageUri.split('/');
        const filename = uriParts[uriParts.length - 1];
        
        // Determine file extension and mime type
        const match = /\.(\w+)$/.exec(filename);
        const fileExt = match ? match[1] : 'jpg';
        const mimeType = fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg' : `image/${fileExt}`;
        
        // Create unique filename to prevent collisions
        const uniqueFilename = `post_image_${Date.now()}_${index}.${fileExt}`;
        
        // Fix URI for iOS (remove file:// prefix)
        const fixedUri = Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri;
        
        console.log(`Adding image #${index} to form data:`, {
          uri: fixedUri,
          name: uniqueFilename,
          type: mimeType
        });
        
        postData.append('images', {
          uri: fixedUri,
          name: uniqueFilename,
          type: mimeType
        });
      });
      
      // Log form data keys for debugging
      const formDataKeys = [];
      for (const pair of postData._parts) {
        formDataKeys.push(pair[0]);
      }
      console.log('Form data keys:', formDataKeys);
      
      // Dispatch create post action
      const response = await dispatch(createPost(postData)).unwrap();
      console.log('Post created successfully:', response);
      
      // Navigate back on success
      navigation.goBack();
    } catch (error) {
      console.error('Error creating post:', error);
      
      let errorMessage = 'Failed to create post. Please try again.';
      if (error?.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    }
  };
  
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={handleBackPress} />
          <Appbar.Content title="Create Post" />
          <Appbar.Action 
            icon="check"
            disabled={loading || (!content.trim() && images.length === 0)}
            onPress={handleCreatePost}
          />
        </Appbar.Header>
        
        <ScrollView style={styles.scrollView}>
          <View style={styles.userInfoContainer}>
            <Image
              source={{ uri: avatarUrl || user?.profileImage || 'https://via.placeholder.com/40' }}
              style={styles.userAvatar}
            />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.name}</Text>
              
              {location && (
                <View style={styles.locationChip}>
                  <MaterialCommunityIcons name="map-marker" size={14} color={COLORS.primary} />
                  <Text style={styles.locationText} numberOfLines={1}>{location.name}</Text>
                  <TouchableOpacity onPress={handleRemoveLocation}>
                    <MaterialCommunityIcons name="close-circle" size={14} color={COLORS.gray} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          
          <TextInput
            style={styles.contentInput}
            placeholder="Share your travel experience..."
            multiline
            value={content}
            onChangeText={setContent}
            autoFocus
          />
          
          {images.length > 0 && (
            <View style={styles.imagesContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {images.map((image, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image source={{ uri: image }} style={styles.image} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
        
        <View style={styles.actionsContainer}>
          <Text style={styles.actionsTitle}>Add to your post</Text>
          
          <View style={styles.actionsButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handlePickImages}
              disabled={images.length >= 10}
            >
              <MaterialCommunityIcons
                name="image-multiple"
                size={24}
                color={images.length >= 10 ? COLORS.gray : COLORS.primary}
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleTakePhoto}
              disabled={images.length >= 10}
            >
              <MaterialCommunityIcons
                name="camera"
                size={24}
                color={images.length >= 10 ? COLORS.gray : COLORS.primary}
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={currentLocationLoading ? null : handleSelectLocation}
            >
              {currentLocationLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <MaterialCommunityIcons name="map-marker" size={24} color={COLORS.primary} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={currentLocationLoading ? null : handleGetCurrentLocation}
            >
              {currentLocationLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <MaterialCommunityIcons name="crosshairs-gps" size={24} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        <Button
          mode="contained"
          onPress={handleCreatePost}
          loading={loading}
          disabled={loading || (!content.trim() && images.length === 0)}
          style={styles.postButton}
        >
          Post
        </Button>
        
        {/* Discard Post Dialog */}
        <Portal>
          <Dialog visible={discardDialogVisible} onDismiss={() => setDiscardDialogVisible(false)}>
            <Dialog.Title>Discard Post?</Dialog.Title>
            <Dialog.Content>
              <Text>You have unsaved changes. Are you sure you want to discard this post?</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setDiscardDialogVisible(false)}>Keep Editing</Button>
              <Button
                onPress={() => {
                  setDiscardDialogVisible(false);
                  navigation.goBack();
                }}
                color={COLORS.error}
              >
                Discard
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    ...FONTS.body3Bold,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  locationText: {
    ...FONTS.body4,
    color: COLORS.primary,
    marginHorizontal: 4,
    maxWidth: 150,
  },
  contentInput: {
    ...FONTS.body2,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  imagesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  imageContainer: {
    marginRight: 12,
    position: 'relative',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 2,
  },
  actionsContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    padding: 16,
  },
  actionsTitle: {
    ...FONTS.body3,
    marginBottom: 12,
  },
  actionsButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  postButton: {
    margin: 16,
    marginTop: 0,
    backgroundColor: COLORS.primary,
  },
});

export default CreatePostScreen;