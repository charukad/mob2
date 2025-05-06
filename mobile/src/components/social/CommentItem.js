import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Menu, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { COLORS, FONTS } from '../../constants/theme';
import { getAvatarUrl, getProfileImageByEmail } from '../../utils/profileUtils';
import ProfileAvatar from '../common/ProfileAvatar';
import axios from '../../api/axiosConfig';
import { API_ENDPOINTS } from '../../constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CommentItem = ({
  comment,
  onLike,
  onReply,
  onDelete,
  isOwner = false,
  postId,
}) => {
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);
  const [userProfileImage, setUserProfileImage] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);
  
  // Direct profile image component
  const [directImageUrl, setDirectImageUrl] = useState(null);
  const [imageError, setImageError] = useState(false);
  
  // Fetch profile image function
  const fetchProfileImage = useCallback(async () => {
    if (!comment || !comment.user || !comment.user.email) return;
    
    // Only fetch if we don't already have a valid profile image that's not a fallback
    if (comment.user.profileImage && 
        !comment.user.profileImage.includes('ui-avatars.com')) {
      setUserProfileImage(comment.user.profileImage);
      setDirectImageUrl(comment.user.profileImage);
      return;
    }
    
    console.log('CommentItem - Fetching profile image for:', comment.user.email);
    setLoadingImage(true);
    
    try {
      // Get auth token
      const token = await AsyncStorage.getItem('authToken');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      // Make direct API call with expanded timeout
      const response = await axios.get(
        API_ENDPOINTS.PROFILE.PROFILE_IMAGE_BY_EMAIL(comment.user.email),
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
        console.log('Found profile image for comment author:', imageUrl);
        setUserProfileImage(imageUrl);
        setDirectImageUrl(imageUrl);
        
        // Store in AsyncStorage for future use
        try {
          await AsyncStorage.setItem(
            `profile_image_${comment.user.email}`, 
            imageUrl
          );
        } catch (storageError) {
          console.log('Error storing profile image in AsyncStorage:', storageError);
        }
      } else {
        // Try loading from AsyncStorage
        try {
          const cachedImage = await AsyncStorage.getItem(`profile_image_${comment.user.email}`);
          if (cachedImage) {
            console.log('Using cached profile image from AsyncStorage');
            setUserProfileImage(cachedImage);
            setDirectImageUrl(cachedImage);
            return;
          }
        } catch (storageError) {
          console.log('Error reading from AsyncStorage:', storageError);
        }
        
        // Fallback to utility function
        const imageUrl = await getProfileImageByEmail(comment.user.email);
        if (imageUrl && !imageUrl.includes('ui-avatars.com')) {
          setUserProfileImage(imageUrl);
          setDirectImageUrl(imageUrl);
        }
      }
    } catch (error) {
      console.log('Error fetching profile image:', error.message);
      
      // Try loading from AsyncStorage as fallback
      try {
        const cachedImage = await AsyncStorage.getItem(`profile_image_${comment.user.email}`);
        if (cachedImage) {
          console.log('Using cached profile image from AsyncStorage after error');
          setUserProfileImage(cachedImage);
          setDirectImageUrl(cachedImage);
        }
      } catch (storageError) {
        console.log('Error reading from AsyncStorage:', storageError);
      }
    } finally {
      setLoadingImage(false);
    }
  }, [comment]);
  
  // Check AsyncStorage on mount
  useEffect(() => {
    const checkAsyncStorage = async () => {
      if (!comment || !comment.user || !comment.user.email) return;
      
      try {
        const cachedImage = await AsyncStorage.getItem(`profile_image_${comment.user.email}`);
        if (cachedImage) {
          console.log('Found cached profile image in AsyncStorage');
          setUserProfileImage(cachedImage);
          setDirectImageUrl(cachedImage);
        } else {
          fetchProfileImage();
        }
      } catch (error) {
        console.log('Error checking AsyncStorage:', error);
        fetchProfileImage();
      }
    };
    
    checkAsyncStorage();
  }, [comment, fetchProfileImage]);
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    
    try {
      const commentDate = new Date(date);
      const now = new Date();
      const diffTime = Math.abs(now - commentDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // Today, show time
        return format(commentDate, 'h:mm a');
      } else if (diffDays === 1) {
        // Yesterday
        return 'Yesterday';
      } else if (diffDays < 7) {
        // This week
        return format(commentDate, 'EEEE');
      } else {
        // Older
        return format(commentDate, 'MMM d, yyyy');
      }
    } catch (error) {
      console.error('Date formatting error:', error);
      return '';
    }
  };

  // Handle profile navigation
  const handleViewProfile = () => {
    if (comment?.user?._id) {
      navigation.navigate('UserProfile', { userId: comment.user._id });
    }
  };

  // Handle menu
  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  if (!comment || !comment.user) {
    return null;
  }

  // Ensure we display the comment owner's name
  const userName = comment.user.name || 
                  (comment.user.firstName && comment.user.lastName ? 
                    `${comment.user.firstName} ${comment.user.lastName}` : 
                    (comment.user.email ? comment.user.email.split('@')[0] : 'Unknown User'));
  
  // Use fetched profile image if available
  const userWithProfileImage = userProfileImage ? {
    ...comment.user,
    profileImage: userProfileImage
  } : comment.user;
  
  // Generate fallback avatar URL if needed
  const getFallbackAvatar = () => {
    const name = userName || 'U';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name.charAt(0))}&background=random&color=fff&size=128`;
  };

  return (
    <TouchableOpacity 
      style={styles.commentContainer}
      activeOpacity={0.7}
    >
      <TouchableOpacity onPress={handleViewProfile}>
        {directImageUrl && !imageError ? (
          <Image 
            source={{ uri: directImageUrl }}
            style={styles.avatarImage}
            onError={() => {
              console.log('Image failed to load, using fallback');
              setImageError(true);
            }}
          />
        ) : (
          <ProfileAvatar 
            user={userWithProfileImage} 
            size={32} 
            forceProfileImageLookup={true} 
          />
        )}
      </TouchableOpacity>
      
      <View style={styles.contentContainer}>
        <TouchableOpacity 
          onPress={handleViewProfile}
          style={styles.commentHeader}
        >
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.commentTime}>{formatDate(comment.createdAt)}</Text>
        </TouchableOpacity>
        
        <View style={styles.commentBubble}>
          <Text style={styles.commentText}>{comment.content}</Text>
        </View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onLike && onLike()}
          >
            <Text style={[
              styles.actionText,
              comment.isLiked && styles.actionTextActive
            ]}>
              {comment.isLiked ? 'Liked' : 'Like'}
            </Text>
            {comment.likesCount > 0 && (
              <Text style={styles.likesCount}>{comment.likesCount}</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onReply && onReply()}
          >
            <Text style={styles.actionText}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {isOwner && (
        <Menu
          visible={menuVisible}
          onDismiss={closeMenu}
          anchor={
            <TouchableOpacity style={styles.menuButton} onPress={openMenu}>
              <MaterialCommunityIcons name="dots-vertical" size={16} color={COLORS.gray} />
            </TouchableOpacity>
          }
        >
          <Menu.Item onPress={() => {
            closeMenu();
            onDelete && onDelete();
          }} title="Delete" />
        </Menu>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  commentContainer: {
    flexDirection: 'row',
    padding: 12,
  },
  contentContainer: {
    flex: 1,
    marginLeft: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    ...FONTS.body4Bold,
    marginRight: 8,
  },
  commentTime: {
    ...FONTS.body5,
    color: COLORS.gray,
  },
  commentBubble: {
    backgroundColor: COLORS.lightGray,
    padding: 12,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    maxWidth: '95%',
  },
  commentText: {
    ...FONTS.body4,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 4,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 4,
  },
  actionText: {
    ...FONTS.body5,
    color: COLORS.gray,
  },
  actionTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  likesCount: {
    ...FONTS.body5,
    color: COLORS.gray,
    marginLeft: 4,
  },
  menuButton: {
    padding: 4,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.lightGray,
  },
});

export default CommentItem;