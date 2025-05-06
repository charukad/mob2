import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { Avatar, Text, List, Divider, Button, Card, Snackbar, Badge } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/theme';
import { logout, updateProfile, loadUser } from '../../store/slices/authSlice';
import api from '../../api/axios';
import { API_ENDPOINTS } from '../../constants/api';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import store from '../../store/index';

const DEFAULT_AVATAR = require('../../../assets/default-avatar.png');

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user, isLoading } = useSelector((state) => state.auth);
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [networkError, setNetworkError] = useState(false);
  const isMounted = useRef(true);
  const hasFetchedRef = useRef(false);
  
  // Refresh data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const fetchData = async () => {
        try {
          // Try to load user from server
          await dispatch(loadUser()).unwrap();
          
          // Debug: Log the user object from Redux store
          const currentState = store.getState();
          console.log('DEBUG - User from Redux after loadUser:', 
            JSON.stringify({
              guide: currentState.auth.user?.guide || null,
              firstName: currentState.auth.user?.firstName,
              id: currentState.auth.user?._id
            }, null, 2)
          );
          
          // If server load fails, we'll catch it and try to use cached data
        } catch (error) {
          console.log('Failed to load user from server, trying cache:', error);
          
          // Try to get cached guide data
          try {
            const cachedGuideData = await AsyncStorage.getItem('cachedGuideData');
            if (cachedGuideData) {
              const parsedGuideData = JSON.parse(cachedGuideData);
              dispatch(updateProfile({ guide: parsedGuideData }));
            }
          } catch (cacheError) {
            console.log('Failed to load cached guide data:', cacheError);
          }
        }
      };
      
      fetchData();
      
      // Mark as focused - important for image fetching logic
      hasFetchedRef.current = false;
    }, [dispatch])
  );

  // Cleanup effect
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fetch user profile image when component mounts
  const fetchProfileImage = useCallback(async () => {
    // Prevent multiple redundant calls
    if (refreshing || (!loading && hasFetchedRef.current)) return;
    
    try {
      if (isMounted.current) setLoading(true);
      setNetworkError(false);
      
      // Check network connection first
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new Error('No internet connection available');
      }
      
      const response = await api.get(API_ENDPOINTS.PROFILE.GET_IMAGES, {
        timeout: 10000 // 10 second timeout
      });
      
      if (response?.data?.success && response.data.data.length > 0 && isMounted.current) {
        // Find active profile image
        const activeImage = response.data.data.find(img => img.isActive);
        
        if (activeImage && activeImage.imageUrl) {
          console.log('Found active profile image:', activeImage.imageUrl);
          setProfileImage(activeImage);
          
          // Update user avatar if different and not just a timestamp difference
          if (user && (!user.avatar || !user.avatar.includes(activeImage.imageUrl.split('?')[0]))) {
            dispatch(updateProfile({ 
              avatar: `${activeImage.imageUrl}?t=${new Date().getTime()}` 
            }));
          }
        }
        
        // Mark as fetched to prevent redundant calls
        hasFetchedRef.current = true;
      }
    } catch (error) {
      console.error('Error fetching profile images:', error);
      
      let errorMessage = 'Failed to load profile image';
      
      if (error.message.includes('internet connection')) {
        errorMessage = 'No internet connection available. Please check your network settings.';
        if (isMounted.current) setNetworkError(true);
      } else if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
        errorMessage = 'Network error. Please check your connection and try again.';
        if (isMounted.current) setNetworkError(true);
      } else if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        if (status === 401) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error.request) {
        // Request made but no response received
        errorMessage = 'Could not connect to the server. Please try again later.';
        if (isMounted.current) setNetworkError(true);
      }
      
      if (isMounted.current) {
        setSnackbarMessage(errorMessage);
        setSnackbarVisible(true);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [dispatch, user?.id]); // Only depend on user.id, not the entire user object
  
  useEffect(() => {
    // Only fetch if we haven't fetched before or explicitly refreshing
    if (user && (!hasFetchedRef.current || refreshing)) {
      fetchProfileImage();
    }
    // Cleanup on unmount
    return () => {
      hasFetchedRef.current = false;
    };
  }, [user?.id, fetchProfileImage, refreshing]);

  const onRefresh = () => {
    hasFetchedRef.current = false; // Reset the fetch flag when manually refreshing
    setRefreshing(true);
    fetchProfileImage();
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
    } catch (error) {
      console.error('Logout failed:', error);
      setSnackbarMessage('Logout failed. Please try again.');
      setSnackbarVisible(true);
    }
  };

  const handleChangeProfileImage = async () => {
    try {
      // Check network connection first
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        setSnackbarMessage('No internet connection available. Please check your network settings.');
        setSnackbarVisible(true);
        return;
      }
      
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to change your profile picture.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await uploadImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setSnackbarMessage('Failed to pick image. Please try again.');
      setSnackbarVisible(true);
    }
  };

  const uploadImage = async (imageAsset) => {
    if (!isMounted.current) return;
    
    try {
      setUploading(true);

      // Create form data
      const formData = new FormData();
      formData.append('image', {
        uri: imageAsset.uri,
        type: 'image/jpeg',
        name: 'profile-image.jpg',
      });

      // Upload to server using the correct endpoint
      const response = await api.post(API_ENDPOINTS.PROFILE.UPLOAD_IMAGE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout
      });

      // Update local user state with new avatar
      if (response?.data?.success && isMounted.current) {
        // Get the image URL from the response
        let imageUrl = '';
        
        if (response.data.data.profileImage && response.data.data.profileImage.imageUrl) {
          imageUrl = response.data.data.profileImage.imageUrl;
        } else if (response.data.data.imageUrl) {
          imageUrl = response.data.data.imageUrl;
        } else if (response.data.data.user && response.data.data.user.avatar) {
          imageUrl = response.data.data.user.avatar;
        }
        
        console.log('New profile image URL:', imageUrl);
        
        // Force reload by adding timestamp
        const timestampedUrl = `${imageUrl}?t=${new Date().getTime()}`;
        
        // Use the action creator
        dispatch(updateProfile({ avatar: timestampedUrl }));
        
        // Update local state
        if (imageUrl) {
          setProfileImage({
            imageUrl: imageUrl,
            isActive: true
          });
          hasFetchedRef.current = true; // Mark as fetched to prevent redundant calls
        }
        
        // Set success message
        setSnackbarMessage('Profile picture updated successfully');
        setSnackbarVisible(true);
      } else {
        throw new Error(response?.data?.error?.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      if (!isMounted.current) return;
      
      let errorMessage = 'Failed to upload image. Please try again.';
      
      if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.response) {
        // Server responded with an error
        errorMessage = error.response.data?.error?.message || 
                      error.response.data?.message ||
                      error.message;
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Please try again.';
      }
      
      setSnackbarMessage(errorMessage);
      setSnackbarVisible(true);
    } finally {
      if (isMounted.current) {
        setUploading(false);
      }
    }
  };

  if (loading && !refreshing) {
    return <LoadingSpinner message="Loading profile..." />;
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>No user data available</Text>
        <Button mode="contained" onPress={() => dispatch(logout())}>
          Return to Login
        </Button>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Avatar.Image
            size={120}
            source={
              // Use profileImage first if available, then fallback to user.avatar
              profileImage?.imageUrl 
              ? { 
                  uri: `${profileImage.imageUrl}?t=${new Date().getTime()}`,
                  cache: 'reload'
                }
              : user?.avatar 
                ? { 
                    uri: user.avatar.includes('?') ? user.avatar : `${user.avatar}?t=${new Date().getTime()}`,
                    cache: 'reload'
                  } 
                : DEFAULT_AVATAR
            }
            style={styles.avatar}
          />
          
          {/* Display the avatar URL for debugging */}
          {__DEV__ && (
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 4, maxWidth: 250 }}>
              {profileImage?.imageUrl ? profileImage.imageUrl.substring(0, 30) : 
               user?.avatar ? user.avatar.substring(0, 30) : 'No Avatar'}...
            </Text>
          )}
          
          <Button
            mode="contained"
            onPress={handleChangeProfileImage}
            style={styles.changePhotoButton}
            labelStyle={styles.changePhotoLabel}
            icon={({ size, color }) => (
              <MaterialIcons name="camera-alt" size={size} color={color} />
            )}
            loading={uploading}
            disabled={uploading || networkError}
          >
            {uploading ? 'Uploading...' : 'Change Photo'}
          </Button>
        </View>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.role}>
          {user?.role === 'guide' ? 'Professional Tour Guide' : 'Tourist'}
        </Text>
      </View>

      {networkError && (
        <View style={styles.networkErrorContainer}>
          <MaterialIcons name="wifi-off" size={24} color={COLORS.error} />
          <Text style={styles.networkErrorText}>
            Network connection issue. Some features may be unavailable.
          </Text>
          <Button mode="contained" onPress={onRefresh} style={styles.retryButton}>
            Retry
          </Button>
        </View>
      )}

      <View style={styles.section}>
        <List.Section>
          <List.Subheader>Personal Information</List.Subheader>
          <List.Item
            title="Email"
            description={user?.email}
            left={props => <List.Icon {...props} icon="email" />}
          />
          <Divider />
          <List.Item
            title="Phone"
            description={user?.phoneNumber || 'Not specified'}
            left={props => <List.Icon {...props} icon="phone" />}
          />
          {user?.role === 'guide' && (
            <>
              <Divider />
              <List.Item
                title="Location"
                description={user?.guide?.serviceAreas?.join(', ') || 'Not specified'}
                left={props => <List.Icon {...props} icon="map-marker" />}
              />
            </>
          )}
        </List.Section>

        {user?.role === 'guide' && (
          <>
            <List.Section>
              <List.Subheader>Professional Information</List.Subheader>
              <Card style={styles.bioCard}>
                <Card.Content>
                  <Text style={styles.bioTitle}>About Me</Text>
                  <Text style={styles.bioText}>
                    {user?.guide?.bio || 'No bio available. Add a brief description about yourself and your experience as a tour guide.'}
                  </Text>
                </Card.Content>
              </Card>
              <List.Item
                title="Experience"
                description={`${user?.guide?.experience || 0} years`}
                left={props => <List.Icon {...props} icon="briefcase" />}
              />
              <Divider />
              <List.Item
                title="Languages"
                description={user?.guide?.languages?.join(', ') || 'Not specified'}
                left={props => <List.Icon {...props} icon="translate" />}
              />
              <Divider />
              <List.Item
                title="Expertise"
                description={user?.guide?.expertise?.join(', ') || 'Not specified'}
                left={props => <List.Icon {...props} icon="star" />}
              />
            </List.Section>
          </>
        )}

        {user?.role === 'tourist' && (
          <List.Section>
            <List.Subheader>Tourist Information</List.Subheader>
            <Card style={styles.bioCard}>
              <Card.Content>
                <Text style={styles.bioTitle}>Preferences</Text>
                <Text style={styles.bioText}>
                  {user?.tourist?.preferences?.interests?.join(', ') || 
                   'No preferences set. You can add your travel interests and preferences.'}
                </Text>
              </Card.Content>
            </Card>
          </List.Section>
        )}

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('EditProfile')}
            style={styles.editButton}
            disabled={networkError}
          >
            {user?.role === 'guide' ? 'Edit Guide Profile' : 'Edit Profile'}
          </Button>
          <Button
            mode="outlined"
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            Logout
          </Button>
        </View>
      </View>
      
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'Dismiss',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: COLORS.error,
    marginBottom: 20,
    textAlign: 'center',
  },
  networkErrorContainer: {
    backgroundColor: '#FFF3F3',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'column',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  networkErrorText: {
    color: COLORS.textDark,
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.primary,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  changePhotoButton: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  changePhotoLabel: {
    fontSize: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  role: {
    fontSize: 16,
    color: '#fff',
  },
  section: {
    padding: 16,
  },
  bioCard: {
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
  },
  bioTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: COLORS.primary,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  buttonContainer: {
    padding: 20,
    gap: 10,
  },
  editButton: {
    marginBottom: 10,
  },
  logoutButton: {
    borderColor: COLORS.error,
  },
});

export default ProfileScreen; 