import { API_ENDPOINTS } from '../../constants/api';
import { setUser, setLoading, setError } from '../../store/slices/authSlice';
import axios from 'axios';

/**
 * Upload profile image to cloudinary through our backend
 */
export const uploadProfileImage = (imageUri) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    
    // Create form data for image upload
    const formData = new FormData();
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image';
    
    formData.append('profileImage', {
      uri: imageUri,
      name: filename,
      type,
    });

    const response = await axios.post(API_ENDPOINTS.UPLOAD_PROFILE_IMAGE, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.status === 200) {
      // Update user in Redux with new profile image
      dispatch(setUser({ profileImage: response.data.profileImage }));
      dispatch(setLoading(false));
      return response.data;
    }
    
    dispatch(setLoading(false));
    return null;
  } catch (error) {
    dispatch(setLoading(false));
    dispatch(setError(error.response?.data?.message || 'Failed to upload image'));
    console.error('Error uploading profile image:', error);
    return null;
  }
};

/**
 * Update tourist profile information
 */
export const updateTouristProfile = (profileData) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    
    const response = await axios.put(API_ENDPOINTS.UPDATE_TOURIST_PROFILE, profileData);
    
    if (response.status === 200) {
      // Update user data in Redux
      dispatch(setUser(response.data.user));
      dispatch(setLoading(false));
      return response.data;
    }
    
    dispatch(setLoading(false));
    return null;
  } catch (error) {
    dispatch(setLoading(false));
    dispatch(setError(error.response?.data?.message || 'Failed to update profile'));
    console.error('Error updating tourist profile:', error);
    throw error;
  }
};

/**
 * Update guide profile information
 */
export const updateGuideProfile = (profileData) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    
    const response = await axios.put(API_ENDPOINTS.UPDATE_GUIDE_PROFILE, profileData);
    
    if (response.status === 200) {
      // Update user data in Redux
      dispatch(setUser(response.data.user));
      dispatch(setLoading(false));
      return response.data;
    }
    
    dispatch(setLoading(false));
    return null;
  } catch (error) {
    dispatch(setLoading(false));
    dispatch(setError(error.response?.data?.message || 'Failed to update profile'));
    console.error('Error updating guide profile:', error);
    throw error;
  }
};

/**
 * Fetch user profile information
 */
export const fetchUserProfile = () => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    
    const response = await axios.get(API_ENDPOINTS.GET_USER_PROFILE);
    
    if (response.status === 200) {
      // Update user data in Redux
      dispatch(setUser(response.data.user));
      dispatch(setLoading(false));
      return response.data;
    }
    
    dispatch(setLoading(false));
    return null;
  } catch (error) {
    dispatch(setLoading(false));
    dispatch(setError(error.response?.data?.message || 'Failed to fetch profile'));
    console.error('Error fetching user profile:', error);
    return null;
  }
}; 