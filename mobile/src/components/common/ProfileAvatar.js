import React, { useEffect, useState } from 'react';
import { Avatar } from 'react-native-paper';
import { getAvatarUrl, getProfileImageFromGlobal, getProfileImageByEmail } from '../../utils/profileUtils';
import { API_ENDPOINTS } from '../../constants/api';
import axios from '../../api/axiosConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * ProfileAvatar - A component for displaying user avatars with proper fallbacks
 * 
 * @param {Object} user - The user object
 * @param {number} size - Size of the avatar (default: 40)
 * @param {Object} style - Additional style for the avatar
 * @param {boolean} forceProfileImageLookup - Force lookup in ProfileImage model by email
 */
const ProfileAvatar = ({ user, size = 40, style = {}, forceProfileImageLookup = false }) => {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAvatar = async () => {
      if (!user) return;
      
      // Debug log to see what user data we have
      console.log('ProfileAvatar - User data:', 
        JSON.stringify({
          id: user._id,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profileImage: user.profileImage,
          avatar: user.avatar
        }, null, 2)
      );
      
      try {
        // First check AsyncStorage (fastest)
        if (user.email) {
          try {
            const cachedImage = await AsyncStorage.getItem(`profile_image_${user.email}`);
            if (cachedImage) {
              console.log('Using cached profile image from AsyncStorage for:', user.email);
              setAvatarUrl(cachedImage);
              setIsLoading(false);
              return;
            }
          } catch (storageError) {
            console.log('Error reading from AsyncStorage:', storageError);
          }
        }
        
        // If user already has a non-fallback profile image, use it immediately
        if (user.profileImage && !user.profileImage.includes('ui-avatars.com')) {
          console.log('Using existing profile image:', user.profileImage);
          
          // Cache it for future use
          if (user.email) {
            try {
              await AsyncStorage.setItem(`profile_image_${user.email}`, user.profileImage);
            } catch (storageError) {
              console.log('Error storing in AsyncStorage:', storageError);
            }
          }
          
          setAvatarUrl(user.profileImage);
          setIsLoading(false);
          return;
        }
        
        // If user has an email, try to directly fetch from the profile images endpoint
        if (user.email) {
          try {
            // Get auth token from AsyncStorage
            const token = await AsyncStorage.getItem('authToken');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            
            console.log('Directly fetching profile image for email:', user.email);
            const response = await axios.get(
              API_ENDPOINTS.PROFILE.PROFILE_IMAGE_BY_EMAIL(user.email),
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
              console.log('Successfully fetched profile image:', imageUrl);
              
              // Cache in AsyncStorage
              try {
                await AsyncStorage.setItem(`profile_image_${user.email}`, imageUrl);
              } catch (storageError) {
                console.log('Error storing in AsyncStorage:', storageError);
              }
              
              setAvatarUrl(imageUrl);
              setIsLoading(false);
              return;
            }
          } catch (directFetchError) {
            console.log('Direct fetch error:', directFetchError.message);
            // Continue to next approach
          }
          
          // If direct fetch failed, try the utility function
          if (forceProfileImageLookup) {
            try {
              console.log('Looking up profile image by email using utility:', user.email);
              const profileImageUrl = await getProfileImageByEmail(user.email);
              
              // If found and not a fallback, use it
              if (profileImageUrl && !profileImageUrl.includes('ui-avatars.com')) {
                console.log('Found profile image by email lookup:', profileImageUrl);
                
                // Cache in AsyncStorage
                try {
                  await AsyncStorage.setItem(`profile_image_${user.email}`, profileImageUrl);
                } catch (storageError) {
                  console.log('Error storing in AsyncStorage:', storageError);
                }
                
                setAvatarUrl(profileImageUrl);
                setIsLoading(false);
                return;
              }
            } catch (emailError) {
              console.log('Error in utility lookup:', emailError.message);
            }
          }
        }
        
        // Try to get avatar from global cache if user has email
        if (user.email) {
          try {
            const globalCacheUrl = await getProfileImageFromGlobal(user.email);
            if (globalCacheUrl && !globalCacheUrl.includes('ui-avatars.com')) {
              console.log('Using global cache URL:', globalCacheUrl);
              
              // Cache in AsyncStorage
              try {
                await AsyncStorage.setItem(`profile_image_${user.email}`, globalCacheUrl);
              } catch (storageError) {
                console.log('Error storing in AsyncStorage:', storageError);
              }
              
              setAvatarUrl(globalCacheUrl);
              setIsLoading(false);
              return;
            }
          } catch (globalCacheError) {
            console.log('Error in global cache lookup:', globalCacheError.message);
          }
        }
        
        // Fallback to standard avatar URL
        const fallbackUrl = getAvatarUrl(user);
        console.log('Using fallback URL:', fallbackUrl);
        setAvatarUrl(fallbackUrl);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading avatar in ProfileAvatar:', error);
        
        // Generate fallback URL
        let name = '';
        if (user.name) {
          name = user.name;
        } else if (user.firstName || user.lastName) {
          name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        } else if (user.email) {
          name = user.email.split('@')[0];
        } else {
          name = 'U';
        }
        
        const generatedUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
        console.log('Generated fallback URL:', generatedUrl);
        setAvatarUrl(generatedUrl);
        setIsLoading(false);
      }
    };
    
    setIsLoading(true);
    loadAvatar();
  }, [user, forceProfileImageLookup]);

  // Direct source attribution with multiple fallbacks
  const avatarSource = { 
    uri: avatarUrl || 
         user?.profileImage || 
         user?.avatar || 
         `https://ui-avatars.com/api/?name=${encodeURIComponent((user?.name || user?.firstName || 'U'))}&background=random&color=fff`
  };

  // Debug log the final URL being used
  console.log(`ProfileAvatar - Final URL for ${user?.name || user?.firstName || 'Unknown'}:`, avatarSource.uri);

  return (
    <Avatar.Image
      source={avatarSource}
      size={size}
      style={{ backgroundColor: isLoading ? '#e0e0e0' : 'transparent', ...style }}
    />
  );
};

export default ProfileAvatar; 