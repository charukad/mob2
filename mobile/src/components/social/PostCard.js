import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Card, Avatar, IconButton, Menu, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import axios from '../../api/axiosConfig';

import { COLORS, FONTS } from '../../constants/theme';
import { 
  getAvatarUrl, 
  getProfileImageByEmail,
  getProfileImageFromGlobal,
  DEFAULT_AVATAR 
} from '../../utils/profileUtils';
import { API_ENDPOINTS } from '../../constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Debug component for development mode
const DebugAvatarInfo = ({ user, avatarUrl }) => {
  if (!__DEV__) return null;
  
  const sourceText = user?.profileImage 
    ? 'profileImage' 
    : user?.avatar 
      ? 'avatar' 
      : avatarUrl?.includes('ui-avatars.com') 
        ? 'fallback' 
        : 'cached';
  
  return (
    <Text style={{
      position: 'absolute',
      bottom: -12,
      left: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      color: 'white',
      fontSize: 8,
      padding: 2,
      borderRadius: 4,
      zIndex: 999,
    }}>
      {sourceText}
    </Text>
  );
};

// DebugImageInfo component to show actual URL being used (DEV only)
const DebugImageInfo = ({ imageUrl }) => {
  if (!__DEV__) return null;

  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: 2,
    }}>
      <Text style={{
        color: 'white',
        fontSize: 6,
        flexWrap: 'wrap',
      }}>
        {imageUrl && imageUrl.substring(0, 30)}...
      </Text>
    </View>
  );
};

const PostCard = ({
  post,
  onLike,
  onComment,
  onShare,
  onSave,
  onDelete,
  isSaved = false,
  isOwner = false,
  navigation: propNavigation,
}) => {
  const navigationFromHook = useNavigation();
  const navigation = propNavigation || navigationFromHook;
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(true);
  const [directImageUrl, setDirectImageUrl] = useState(null);
  const [imageError, setImageError] = useState(false);

  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'Recently';
    
    try {
      const postDate = new Date(date);
      const now = new Date();
      const diffTime = Math.abs(now - postDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // Today, show time
        return format(postDate, 'h:mm a');
      } else if (diffDays === 1) {
        // Yesterday
        return 'Yesterday';
      } else if (diffDays < 7) {
        // This week
        return format(postDate, 'EEEE');
      } else {
        // Older
        return format(postDate, 'MMM d, yyyy');
      }
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Recently';
    }
  };

  // Navigate to post detail screen
  const handleViewPost = () => {
    navigation.navigate('PostDetail', { postId: post._id });
  };

  // Navigate to user profile
  const handleViewProfile = () => {
    if (post?.user?._id) {
      navigation.navigate('UserProfile', { userId: post.user?._id });
    }
  };

  // Navigate to location
  const handleViewLocation = () => {
    if (post?.location?._id) {
      navigation.navigate('LocationDetail', { locationId: post.location?._id });
    }
  };

  // Handle image navigation
  const handleNextImage = () => {
    if (post?.images && post.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % post.images.length);
    }
  };

  const handlePreviousImage = () => {
    if (post?.images && post.images.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? post.images.length - 1 : prev - 1
      );
    }
  };

  // Handle post menu
  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  // Create fallback user object if missing
  const userObject = post.user || { 
    name: 'Anonymous User',
    _id: null,
    email: '',
    profileImage: null
  };
  
  // Fetch profile image function 
  const fetchProfileImage = useCallback(async () => {
    if (!userObject?.email) return;
    
    // Only fetch if we don't already have a valid profile image that's not a fallback
    if (userObject.profileImage && 
        !userObject.profileImage.includes('ui-avatars.com')) {
      setAvatarUrl(userObject.profileImage);
      setDirectImageUrl(userObject.profileImage);
      setIsLoadingAvatar(false);
      return;
    }
    
    console.log('PostCard - Fetching profile image for:', userObject.email);
    setIsLoadingAvatar(true);
    
    try {
      // Get auth token
      const token = await AsyncStorage.getItem('authToken');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      // Make direct API call with expanded timeout
      const response = await axios.get(
        API_ENDPOINTS.PROFILE.PROFILE_IMAGE_BY_EMAIL(userObject.email),
        { 
          headers,
          timeout: 10000 // 10 second timeout
        }
      );
      
      if (response.data && 
          response.data.success && 
          response.data.data && 
          response.data.data.profileImage) {
        
        const imageUrl = response.data.data.profileImage;
        console.log('Found profile image for post owner:', imageUrl);
        setAvatarUrl(imageUrl);
        setDirectImageUrl(imageUrl);
        
        // Store in AsyncStorage for future use
        try {
          await AsyncStorage.setItem(
            `profile_image_${userObject.email}`, 
            imageUrl
          );
        } catch (storageError) {
          console.log('Error storing profile image in AsyncStorage:', storageError);
        }
      } else {
        // Try loading from AsyncStorage
        try {
          const cachedImage = await AsyncStorage.getItem(`profile_image_${userObject.email}`);
          if (cachedImage) {
            console.log('Using cached profile image from AsyncStorage for post owner');
            setAvatarUrl(cachedImage);
            setDirectImageUrl(cachedImage);
            setIsLoadingAvatar(false);
            return;
          }
        } catch (storageError) {
          console.log('Error reading from AsyncStorage:', storageError);
        }
        
        // Fallback to utility function
        const imageUrl = await getProfileImageByEmail(userObject.email);
        if (imageUrl && !imageUrl.includes('ui-avatars.com')) {
          setAvatarUrl(imageUrl);
          setDirectImageUrl(imageUrl);
          
          // Store in AsyncStorage
          try {
            await AsyncStorage.setItem(
              `profile_image_${userObject.email}`, 
              imageUrl
            );
          } catch (storageError) {
            console.log('Error storing profile image in AsyncStorage:', storageError);
          }
        }
      }
    } catch (error) {
      console.log('Error fetching profile image for post owner:', error.message);
      
      // Try loading from AsyncStorage as fallback
      try {
        const cachedImage = await AsyncStorage.getItem(`profile_image_${userObject.email}`);
        if (cachedImage) {
          console.log('Using cached profile image from AsyncStorage after error');
          setAvatarUrl(cachedImage);
          setDirectImageUrl(cachedImage);
        }
      } catch (storageError) {
        console.log('Error reading from AsyncStorage:', storageError);
      }
    } finally {
      setIsLoadingAvatar(false);
    }
  }, [userObject]);
  
  // Check AsyncStorage on mount
  useEffect(() => {
    const checkAsyncStorage = async () => {
      if (!userObject?.email) return;
      
      try {
        const cachedImage = await AsyncStorage.getItem(`profile_image_${userObject.email}`);
        if (cachedImage) {
          console.log('Found cached profile image in AsyncStorage for post owner');
          setAvatarUrl(cachedImage);
          setDirectImageUrl(cachedImage);
          setIsLoadingAvatar(false);
        } else {
          fetchProfileImage();
        }
      } catch (error) {
        console.log('Error checking AsyncStorage:', error);
        fetchProfileImage();
      }
    };
    
    setIsLoadingAvatar(true);
    checkAsyncStorage();
  }, [userObject, fetchProfileImage]);

  // Safely handle missing _id
  const postId = post._id || `temp-${Math.random().toString(36).substr(2, 9)}`;
  
  // Generate fallback avatar URL if needed
  const getFallbackAvatar = () => {
    const name = userObject.name || 'U';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name.charAt(0))}&background=random&color=fff&size=128`;
  };
  
  return (
    <View style={styles.cardContainer}>
      <Card style={styles.card} elevation={2}>
        {/* Card Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={userObject._id ? handleViewProfile : null} 
            style={styles.userInfo}
          >
            <View style={{ position: 'relative' }}>
              {directImageUrl && !imageError ? (
                <Image 
                  source={{ uri: directImageUrl }}
                  style={styles.avatarImage}
                  onError={() => {
                    console.log('Post owner image failed to load, using fallback');
                    setImageError(true);
                  }}
                />
              ) : (
                <Avatar.Image
                  source={{ uri: avatarUrl || getFallbackAvatar() }}
                  size={40}
                  style={{ backgroundColor: isLoadingAvatar ? '#e0e0e0' : 'transparent' }}
                />
              )}
            </View>
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{userObject.name || 'Anonymous User'}</Text>
              <Text style={styles.postTime}>{formatDate(post.createdAt)}</Text>
            </View>
          </TouchableOpacity>
          
          <Menu
            visible={menuVisible}
            onDismiss={closeMenu}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={20}
                onPress={openMenu}
              />
            }
          >
            {isOwner ? (
              <>
                <Menu.Item
                  onPress={() => {
                    closeMenu();
                    navigation.navigate('EditPost', { postId });
                  }}
                  title="Edit Post"
                  icon="pencil"
                />
                <Menu.Item
                  onPress={() => {
                    closeMenu();
                    onDelete && onDelete(postId);
                  }}
                  title="Delete Post"
                  icon="delete"
                />
              </>
            ) : (
              <>
                <Menu.Item
                  onPress={() => {
                    closeMenu();
                    onSave && onSave(postId);
                  }}
                  title={isSaved ? "Unsave Post" : "Save Post"}
                  icon={isSaved ? "bookmark-minus" : "bookmark-plus"}
                />
                <Menu.Item
                  onPress={() => {
                    closeMenu();
                    // Handle reporting post
                  }}
                  title="Report Post"
                  icon="flag"
                />
              </>
            )}
          </Menu>
        </View>

        {/* Location Information */}
        {post.location && (
          <TouchableOpacity 
            onPress={post.location?._id ? handleViewLocation : null} 
            style={styles.locationContainer}
          >
            <MaterialCommunityIcons name="map-marker" size={16} color={COLORS.primary} />
            <Text style={styles.locationText}>{post.location?.name || 'Unknown Location'}</Text>
          </TouchableOpacity>
        )}

        {/* Post Content */}
        <TouchableOpacity activeOpacity={0.9} onPress={handleViewPost}>
          {post.content && (
            <Text
              style={styles.content}
              numberOfLines={5}
            >
              {post.content}
            </Text>
          )}

          {/* Post Images */}
          {post.images && post.images.length > 0 && (
            <View style={styles.imageOuterContainer}>
              <View style={styles.imageContainer}>
                <Image
                  source={{ 
                    uri: post.images[currentImageIndex] || 'https://via.placeholder.com/300x200?text=Image+Not+Available' 
                  }}
                  style={styles.image}
                  resizeMode="cover"
                  defaultSource={require('../../../assets/placeholder-image.jpg')}
                />
                
                {post.images.length > 1 && (
                  <>
                    <TouchableOpacity
                      style={[styles.imageNavButton, styles.imageNavLeft]}
                      onPress={handlePreviousImage}
                    >
                      <MaterialCommunityIcons name="chevron-left" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.imageNavButton, styles.imageNavRight]}
                      onPress={handleNextImage}
                    >
                      <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    
                    <View style={styles.imageIndicators}>
                      {post.images.map((_, index) => (
                        <View
                          key={`indicator-${index}`}
                          style={[
                            styles.imageIndicator,
                            index === currentImageIndex && styles.imageIndicatorActive
                          ]}
                        />
                      ))}
                    </View>
                  </>
                )}
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Interaction Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <MaterialCommunityIcons name="heart" size={14} color={COLORS.gray} />
            <Text style={styles.statText}>{post.likesCount || 0} likes</Text>
          </View>
          
          <View style={styles.stat}>
            <MaterialCommunityIcons name="comment" size={14} color={COLORS.gray} />
            <Text style={styles.statText}>{post.commentsCount || 0} comments</Text>
          </View>
        </View>

        <Divider />

        {/* Interaction Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onLike && onLike(post._id)}
          >
            <MaterialCommunityIcons
              name={post.isLiked ? "heart" : "heart-outline"}
              size={22}
              color={post.isLiked ? COLORS.error : COLORS.gray}
            />
            <Text style={[
              styles.actionText,
              post.isLiked && { color: COLORS.error }
            ]}>
              Like
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onComment && onComment(post._id)}
          >
            <MaterialCommunityIcons name="comment-outline" size={22} color={COLORS.gray} />
            <Text style={styles.actionText}>Comment</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onShare && onShare(post._id)}
          >
            <MaterialCommunityIcons name="share-outline" size={22} color={COLORS.gray} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  card: {
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameContainer: {
    marginLeft: 12,
  },
  userName: {
    ...FONTS.body4Bold,
    color: COLORS.black,
  },
  postTime: {
    ...FONTS.body5,
    color: COLORS.gray,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  locationText: {
    ...FONTS.body5,
    color: COLORS.primary,
    marginLeft: 4,
  },
  content: {
    ...FONTS.body4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    lineHeight: 22,
  },
  imageOuterContainer: {
    width: '100%',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 3 / 2, // Image aspect ratio
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageNavButton: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageNavLeft: {
    left: 8,
  },
  imageNavRight: {
    right: 8,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  imageIndicatorActive: {
    backgroundColor: COLORS.white,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: 6,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    ...FONTS.body5,
    color: COLORS.gray,
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionText: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginLeft: 4,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
  },
});

export default PostCard;